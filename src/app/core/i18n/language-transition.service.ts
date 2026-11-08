import { ApplicationRef, Injectable, NgZone, signal } from '@angular/core';
import { gsap } from 'gsap';

import { ScrollService } from '../scroll.service';
import { Lang, LanguageService } from './language.service';

/** Everything marked with this attribute fades out and back in during a switch. */
const FADE_SELECTOR = '[data-lang-fade]';
const FADE_OUT = 0.18; // seconds
const FADE_IN = 0.34;

/**
 * Orchestrates a language switch:  fade out -> swap language -> fade in.
 * The text and layout change while the content is invisible, so nothing jumps.
 *
 * Only the DOM text layer fades. The WebGL canvas is not marked, so the 3D scale
 * stays visible the whole time.
 */
@Injectable({ providedIn: 'root' })
export class LanguageTransitionService {
  /** Text for the screen-reader live region (rendered once, in the navbar). */
  readonly announcement = signal('');

  private tween?: gsap.core.Tween;
  private run = 0; // id of the latest request: older callbacks bail out
  private target?: Lang; // language the in-flight transition is heading to
  private readonly swappedHooks = new Set<() => void>();

  constructor(
    private i18n: LanguageService,
    private scroll: ScrollService,
    private zone: NgZone,
    private appRef: ApplicationRef,
  ) {}

  /**
   * Runs right after the language and the DOM have changed, while the content
   * is still invisible. Returns an unsubscribe function.
   * (Step 7 uses this to rebuild the scroll timeline.)
   */
  onSwapped(fn: () => void): () => void {
    this.swappedHooks.add(fn);
    return () => this.swappedHooks.delete(fn);
  }

  /** Switch to the other language. Safe to call repeatedly: the latest click wins. */
  toggle(): void {
    const current = this.target ?? this.i18n.lang();
    this.switchTo(current === 'ar' ? 'en' : 'ar');
  }

  switchTo(lang: Lang): void {
    if (!this.tween && lang === this.i18n.lang()) return;

    const id = ++this.run;
    this.target = lang;

    // Reduced motion: no fade, just swap
    if (this.scroll.reducedMotion) {
      this.swap(lang);
      this.target = undefined;
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.tween?.kill();
      const els = Array.from(
        document.querySelectorAll<HTMLElement>(FADE_SELECTOR),
      );

      this.tween = gsap.to(els, {
        opacity: 0,
        duration: FADE_OUT,
        ease: 'power1.out',
        overwrite: true,
        onComplete: () => {
          if (id !== this.run) return; // a newer click took over
          this.swap(lang);

          // One frame so the browser has laid out the new text before revealing it
          requestAnimationFrame(() => {
            if (id !== this.run) return;
            this.tween = gsap.to(els, {
              opacity: 1,
              duration: FADE_IN,
              ease: 'power1.inOut',
              clearProps: 'opacity',
              onComplete: () => {
                if (id !== this.run) return;
                this.tween = undefined;
                this.target = undefined;
              },
            });
          });
        },
      });
    });
  }

  private swap(lang: Lang): void {
    this.zone.run(() => {
      this.i18n.setLang(lang);
      this.announcement.set(this.i18n.t().lang.announce);
      this.appRef.tick(); // render the new text now, so the hooks below see the final DOM
    });
    this.swappedHooks.forEach((fn) => fn());
  }
}
