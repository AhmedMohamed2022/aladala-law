import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

@Injectable({ providedIn: 'root' })
export class ScrollService implements OnDestroy {
  private lenis: Lenis | null = null;
  private tickerFn: ((time: number) => void) | null = null;
  private started = false;

  readonly reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private zone: NgZone) {
    // Register once, globally
    gsap.registerPlugin(ScrollTrigger);
  }

  /** Call once from AppComponent. Safe to call more than once. */
  init(): void {
    if (this.started) return;
    this.started = true;

    // Tells the CSS (.js-motion .reveal) that GSAP will handle reveals
    if (!this.reducedMotion) {
      document.documentElement.classList.add('js-motion');
    }

    // Keep all animation work outside Angular's change detection
    this.zone.runOutsideAngular(() => {
      if (this.reducedMotion) return; // native scroll only

      this.lenis = new Lenis({
        lerp: 0.1,
        smoothWheel: true,
      });

      // 1) Lenis tells ScrollTrigger whenever scroll changes
      this.lenis.on('scroll', ScrollTrigger.update);

      // 2) GSAP's ticker drives Lenis (one shared requestAnimationFrame loop)
      this.tickerFn = (time: number) => this.lenis?.raf(time * 1000);
      gsap.ticker.add(this.tickerFn);
      gsap.ticker.lagSmoothing(0);
    });
  }

  /** Smooth scroll to a CSS selector (e.g. '#services'). Used by navbar and CTAs. */
  scrollTo(target: string, offset = -70): void {
    const el = document.querySelector(target) as HTMLElement | null;
    if (!el) return;

    if (this.lenis) {
      this.lenis.scrollTo(el, { offset, duration: 1.4 });
    } else {
      el.scrollIntoView({ behavior: this.reducedMotion ? 'auto' : 'smooth' });
    }
  }

  /** Pause scrolling (e.g. while the mobile menu is open). */
  stop(): void {
    this.lenis?.stop();
    if (!this.lenis) document.body.style.overflow = 'hidden';
  }

  start(): void {
    this.lenis?.start();
    if (!this.lenis) document.body.style.overflow = '';
  }

  ngOnDestroy(): void {
    if (this.tickerFn) gsap.ticker.remove(this.tickerFn);
    this.lenis?.destroy();
    this.lenis = null;
    ScrollTrigger.getAll().forEach((t) => t.kill());
    document.documentElement.classList.remove('js-motion');
    this.started = false;
  }
}
