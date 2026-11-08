import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ScrollService } from '../../core/scroll.service';
import { LanguageService } from '../../core/i18n/language.service';

interface Stat {
  /** Key into the dictionary: i18n.t().about.stats[key] */
  key: 'years' | 'cases' | 'satisfaction';
  value: number;
  suffix: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLElement>;

  // Demo figures. Replace with real ones.
  readonly stats: Stat[] = [
    { key: 'years', value: 15, suffix: '+' },
    { key: 'cases', value: 500, suffix: '+' },
    { key: 'satisfaction', value: 98, suffix: '%' },
  ];

  /**
   * The number each counter currently shows (final value, or the in-progress value).
   * The counters' text is owned by this component, not by an Angular binding:
   * GSAP replaces the text node, which would silently break a binding.
   */
  private shown: number[];
  private viewReady = false;

  private ctx?: gsap.Context;
  private destroyed = false;

  constructor(
    private scroll: ScrollService,
    private zone: NgZone,
    readonly i18n: LanguageService,
  ) {
    // Motion on: counters start at 0 and count up. Reduced motion: final values.
    this.shown = this.stats.map((s) =>
      this.scroll.reducedMotion ? s.value : 0,
    );

    // Language switch: re-render the counters with the new digits, keeping their current value
    effect(() => {
      this.i18n.lang(); // dependency
      if (this.viewReady) this.renderCounters();
    });
  }

  private counterEls(): HTMLElement[] {
    return Array.from(
      this.rootRef.nativeElement.querySelectorAll<HTMLElement>('.num'),
    );
  }

  private renderCounters(): void {
    this.counterEls().forEach((el, i) => {
      el.textContent = this.i18n.n(this.shown[i]);
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCounters();

    if (this.scroll.reducedMotion) return; // static content, final values already shown

    this.zone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger); // safe to call repeatedly

      this.ctx = gsap.context(() => {
        const root = this.rootRef.nativeElement;
        const q = gsap.utils.selector(root);

        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          scrollTrigger: {
            trigger: q('.content')[0],
            start: 'top 72%',
            toggleActions: 'play none none none', // plays once
          },
        });

        // 1) Staggered text
        tl.fromTo(
          q('.text-item'),
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.14,
            clearProps: 'transform',
          },
        );

        // 2) Gold divider draws itself
        tl.fromTo(
          q('.rule'),
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: 'power2.inOut' },
          '-=0.5',
        );

        // 3) Stats fade up, then the numbers count
        tl.fromTo(
          q('.stat'),
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.12,
            clearProps: 'transform',
          },
          '-=0.7',
        );

        this.counterEls().forEach((el, i) => {
          const counter = { v: 0 };

          tl.to(
            counter,
            {
              v: this.stats[i].value,
              duration: 2.2,
              ease: 'power2.out',
              onUpdate: () => {
                this.shown[i] = Math.round(counter.v);
                // i18n.n() reads the CURRENT language, so a switch mid-count just continues
                el.textContent = this.i18n.n(this.shown[i]);
              },
            },
            '<0.1', // all counters start together
          );
        });
      }, this.rootRef.nativeElement);

      // Fonts change section heights, so recalculate trigger positions once
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      fontsReady.then(() => {
        if (!this.destroyed) ScrollTrigger.refresh();
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.ctx?.revert(); // kills this component's timeline + ScrollTriggers
  }
}
