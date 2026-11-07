import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ScrollService } from '../../core/scroll.service';

interface Stat {
  value: number;
  suffix: string;
  label: string;
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
    { value: 15, suffix: '+', label: 'سنة من الخبرة' },
    { value: 500, suffix: '+', label: 'قضية ناجحة' },
    { value: 98, suffix: '%', label: 'رضا العملاء' },
  ];

  /** Arabic-Indic digits: ١٢٣ */
  private readonly nf = new Intl.NumberFormat('ar-EG');

  /** Initial text rendered by the template (final value, so it is correct without animation) */
  format(n: number): string {
    return this.nf.format(n);
  }

  private ctx?: gsap.Context;
  private destroyed = false;

  constructor(
    private scroll: ScrollService,
    private zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
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

        q('.num').forEach((el) => {
          const target = Number((el as HTMLElement).dataset['value']);
          const counter = { v: 0 };
          el.textContent = this.nf.format(0);

          tl.to(
            counter,
            {
              v: target,
              duration: 2.2,
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent = this.nf.format(Math.round(counter.v));
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
