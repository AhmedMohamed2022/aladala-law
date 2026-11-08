import {
  ApplicationRef,
  Injectable,
  NgZone,
  OnDestroy,
  signal,
} from '@angular/core';
import { gsap } from 'gsap';

import { ScrollService } from '../scroll.service';
import { Lang, LanguageService } from './language.service';
import { FontLoaderService } from '../font-loader.service';

/** Everything marked with this attribute fades out and back in during a switch. */
const FADE_SELECTOR = '[data-lang-fade]';
const FADE_OUT = 0.18; // seconds
const FADE_IN = 0.34;
/** Longest we wait (from the click) for the new language's fonts before swapping anyway. */
const FONT_WAIT_MS = 600;

/**
 * Orchestrates a language switch:
 *
 *   click -> fade out (fonts download in parallel) -> [before-swap hooks]
 *         -> swap language -> [swapped hooks] -> next frame -> fade in
 *
 * The text and layout change while the content is invisible, so nothing jumps.
 * Fonts are awaited BEFORE the swap, so the new text is laid out with its real
 * font and the hooks measure the final layout.
 *
 * Only the DOM text layer fades. The WebGL canvas is not marked, so the 3D scale
 * stays visible the whole time.
 */
@Injectable({ providedIn: 'root' })
export class LanguageTransitionService implements OnDestroy {
  /** Text for the screen-reader live region (rendered once, in the navbar). */
  readonly announcement = signal('');

  private tween?: gsap.core.Tween;
  private run = 0; // id of the latest request: older callbacks bail out
  private target?: Lang; // language the in-flight transition is heading to
  private readonly beforeHooks = new Set<() => void>();
  private readonly swappedHooks = new Set<() => void>();

  constructor(
    private i18n: LanguageService,
    private scroll: ScrollService,
    private fonts: FontLoaderService,
    private zone: NgZone,
    private appRef: ApplicationRef,
  ) {}

  /**
   * Runs once per real language change, right BEFORE the swap: the content is
   * invisible and still in the old language/layout. Use it to measure
   * (e.g. which section is in view). Returns an unsubscribe function.
   */
  onBeforeSwap(fn: () => void): () => void {
    this.beforeHooks.add(fn);
    return () => this.beforeHooks.delete(fn);
  }

  /**
   * Runs right AFTER the language and the DOM have changed, while the content
   * is still invisible. Returns an unsubscribe function.
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
    // Nothing to do, unless a transition is in flight (then this click reverses it)
    if (this.target === undefined && lang === this.i18n.lang()) return;

    const id = ++this.run;
    this.target = lang;

    // Everything below runs outside Angular's zone; only swap() re-enters it
    this.zone.runOutsideAngular(() => {
      this.tween?.kill();

      // Start fetching the new language's font files now, in parallel with the fade-out
      const fontsReady = this.fonts.ready(lang, FONT_WAIT_MS);

      // Reduced motion: no fade, just swap (still after the fonts, which are normally already cached)
      if (this.scroll.reducedMotion) {
        fontsReady.then(() => {
          if (id !== this.run) return;
          this.commit(lang);
          this.target = undefined;
        });
        return;
      }

      const els = Array.from(
        document.querySelectorAll<HTMLElement>(FADE_SELECTOR),
      );

      this.tween = gsap.to(els, {
        opacity: 0,
        duration: FADE_OUT,
        ease: 'power1.out',
        overwrite: true,
        onComplete: () => {
          fontsReady.then(() => {
            if (id !== this.run) return; // a newer click took over
            this.commit(lang);

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
          });
        },
      });
    });
  }

  /** Swaps the language, unless it already is that language (a click reversed an unfinished switch). */
  private commit(lang: Lang): void {
    if (lang === this.i18n.lang()) return;
    this.zone.runOutsideAngular(() => this.beforeHooks.forEach((fn) => fn()));
    this.swap(lang);
  }

  private swap(lang: Lang): void {
    this.zone.run(() => {
      this.i18n.setLang(lang);
      this.announcement.set(this.i18n.t().lang.announce);
      this.appRef.tick(); // render the new text now, so the hooks below see the final DOM
    });
    // Hooks drive GSAP / ScrollTrigger, so keep them out of the zone
    this.zone.runOutsideAngular(() => this.swappedHooks.forEach((fn) => fn()));
  }

  ngOnDestroy(): void {
    this.run++; // invalidates every pending callback
    this.tween?.kill();
    this.beforeHooks.clear();
    this.swappedHooks.clear();
  }
}
