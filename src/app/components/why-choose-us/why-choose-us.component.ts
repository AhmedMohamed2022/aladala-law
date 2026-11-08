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
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-why-choose-us',
  standalone: true,
  templateUrl: './why-choose-us.component.html',
  styleUrl: './why-choose-us.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhyChooseUsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLElement>;

  private ctx?: gsap.Context;
  private destroyed = false;

  constructor(
    private scroll: ScrollService,
    private zone: NgZone,
    readonly i18n: LanguageService,
  ) {}

  ngAfterViewInit(): void {
    if (this.scroll.reducedMotion) return; // static final state via CSS

    this.zone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger);
      const root = this.rootRef.nativeElement;

      this.ctx = gsap.context(() => {
        const q = gsap.utils.selector(root);

        // ---- Header text ----
        gsap.fromTo(
          q('.head-item'),
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.14,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: { trigger: q('.head')[0], start: 'top 80%' },
          },
        );

        // ---- The gold line: SCRUBBED to scroll position ----
        gsap.fromTo(
          q('.line-fill'),
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none', // linear, so it matches the scrollbar exactly
            scrollTrigger: {
              trigger: q('.timeline')[0],
              start: 'top 65%',
              end: 'bottom 65%',
              scrub: 0.6,
            },
          },
        );

        // ---- Each pillar: entrance + node lights up when the line reaches it ----
        (q('.item') as HTMLElement[]).forEach((item) => {
          const body = item.querySelector('.item-body');

          gsap.fromTo(
            body,
            { y: 36, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: item,
                start: 'top 70%',
                toggleActions: 'play none none reverse',
                onEnter: () => item.classList.add('active'),
                onLeaveBack: () => item.classList.remove('active'),
              },
            },
          );
        });
      }, root);

      // Fonts change section height, so recalculate trigger positions once
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      fontsReady.then(() => {
        if (!this.destroyed) ScrollTrigger.refresh();
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.ctx?.revert(); // kills tweens and every ScrollTrigger created above
  }
}
