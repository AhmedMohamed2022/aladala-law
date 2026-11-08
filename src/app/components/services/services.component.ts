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
  selector: 'app-services',
  standalone: true,
  templateUrl: './services.component.html',
  styleUrl: './services.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLElement>;

  readonly icons: string[][] = [
    ['M4 21V7l8-4 8 4v14', 'M9 21v-6h6v6', 'M9 10h1', 'M14 10h1'],
    [
      'm14 13-8.5 8.5a2.1 2.1 0 0 1-3-3L11 10',
      'm16 16 6-6',
      'm8 8 6-6',
      'm9 7 8 8',
      'm21 11-8-8',
    ],
    ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
    [
      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
      'M14 3v5h5',
      'M9 13h6',
      'M9 17h4',
    ],
  ];

  private ctx?: gsap.Context;
  private destroyed = false;
  private cleanups: Array<() => void> = [];

  constructor(
    private scroll: ScrollService,
    private zone: NgZone,
    readonly i18n: LanguageService,
  ) {}

  ngAfterViewInit(): void {
    if (this.scroll.reducedMotion) return; // content is visible by default

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

        // ---- Cards: staggered entrance (on the wrappers) ----
        gsap.fromTo(
          q('.card-wrap'),
          { y: 70, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            stagger: 0.14,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: { trigger: q('.cards')[0], start: 'top 82%' },
          },
        );

        // ---- Hover: spotlight + tilt (mouse devices only) ----
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          this.setupHover(q('.card') as HTMLElement[]);
        }
      }, root);

      // Fonts change section height, so recalculate trigger positions once
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      fontsReady.then(() => {
        if (!this.destroyed) ScrollTrigger.refresh();
      });
    });
  }

  private setupHover(cards: HTMLElement[]): void {
    const MAX_TILT = 7; // degrees

    cards.forEach((card) => {
      gsap.set(card, { transformPerspective: 900 });

      const rotX = gsap.quickTo(card, 'rotationX', {
        duration: 0.6,
        ease: 'power3.out',
      });
      const rotY = gsap.quickTo(card, 'rotationY', {
        duration: 0.6,
        ease: 'power3.out',
      });

      const onMove = (e: PointerEvent): void => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width; // 0..1
        const py = (e.clientY - r.top) / r.height; // 0..1

        // Spotlight position (read by CSS)
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);

        rotY((px - 0.5) * MAX_TILT * 2);
        rotX((0.5 - py) * MAX_TILT * 2);
      };

      const onLeave = (): void => {
        rotX(0);
        rotY(0);
      };

      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);

      this.cleanups.push(() => {
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.ctx?.revert(); // kills tweens, quickTo and ScrollTriggers of this component
  }
}
