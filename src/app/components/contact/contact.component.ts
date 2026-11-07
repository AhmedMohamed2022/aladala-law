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

@Component({
  selector: 'app-contact',
  standalone: true,
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLElement>;

  // Demo details. Replace with real ones.
  readonly phone = '+20 100 000 0000';
  readonly email = 'info@aladala-law.com';

  private ctx?: gsap.Context;
  private destroyed = false;

  constructor(
    private scroll: ScrollService,
    private zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    if (this.scroll.reducedMotion) return; // final state via CSS, no GSAP

    this.zone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger);
      const root = this.rootRef.nativeElement;

      this.ctx = gsap.context(() => {
        const q = gsap.utils.selector(root);

        // ---- Content entrance ----
        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          scrollTrigger: { trigger: q('.inner')[0], start: 'top 75%' },
        });

        tl.fromTo(
          q('.item'),
          { y: 45, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            stagger: 0.15,
            clearProps: 'transform',
          },
        );

        tl.fromTo(
          q('.ring-wrap'),
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 2, ease: 'power2.out' },
          0,
        );

        // ---- Scroll-linked parallax on the background orbs ----
        gsap.fromTo(
          q('.orbs'),
          { yPercent: -12 },
          {
            yPercent: 12,
            ease: 'none',
            scrollTrigger: {
              trigger: root,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          },
        );
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
    this.ctx?.revert(); // kills tweens and ScrollTriggers of this component
  }
}
