import { Injectable } from '@angular/core';

import type { Lang } from './i18n/language.service';

/**
 * Google Fonts serves unicode-range subsets, and the browser only downloads a
 * subset when text that needs it is first rendered. So the Latin files of
 * Cormorant Garamond / Tajawal would start downloading the moment English text
 * appears, and the late arrival reflows the page. Likewise for the Arabic
 * files when switching back. This service asks for them ahead of time.
 *
 * [CSS font shorthand, sample text]. The sample text selects the subset: it must
 * contain a character from the unicode-range we want.
 * Keep the weights in sync with the <link> in index.html.
 */
const FACES: Record<Lang, ReadonlyArray<readonly [string, string]>> = {
  en: [
    ['500 1em "Cormorant Garamond"', 'Aa'],
    ['600 1em "Cormorant Garamond"', 'Aa'],
    ['700 1em "Cormorant Garamond"', 'Aa'],
    ['300 1em Tajawal', 'Aa'],
    ['400 1em Tajawal', 'Aa'],
    ['500 1em Tajawal', 'Aa'],
    ['700 1em Tajawal', 'Aa'],
  ],
  ar: [
    ['400 1em "El Messiri"', 'ع'],
    ['500 1em "El Messiri"', 'ع'],
    ['600 1em "El Messiri"', 'ع'],
    ['700 1em "El Messiri"', 'ع'],
    ['300 1em Tajawal', 'ع'],
    ['400 1em Tajawal', 'ع'],
    ['500 1em Tajawal', 'ع'],
    ['700 1em Tajawal', 'ع'],
  ],
};

@Injectable({ providedIn: 'root' })
export class FontLoaderService {
  private readonly loads = new Map<Lang, Promise<void>>();

  /** Starts downloading a language's font files (once) and resolves when they are ready. Never rejects. */
  load(lang: Lang): Promise<void> {
    let p = this.loads.get(lang);
    if (!p) {
      const fonts =
        typeof document !== 'undefined' ? document.fonts : undefined;
      p = fonts
        ? Promise.all(
            FACES[lang].map(([face, text]) =>
              fonts.load(face, text).catch(() => []),
            ),
          ).then(() => undefined)
        : Promise.resolve();
      this.loads.set(lang, p);
    }
    return p;
  }

  /**
   * Resolves when the language's fonts are ready OR after `maxMs`, whichever
   * comes first. A slow network can never hold the page hostage.
   */
  ready(lang: Lang, maxMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, maxMs);
      this.load(lang).then(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Fetches both languages' fonts once the page has loaded and the browser is idle,
   * so a later language switch finds them in the cache. Call once, outside the zone.
   */
  warmUp(): void {
    const run = () => {
      this.load('en');
      this.load('ar');
    };
    const whenIdle = () => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(run, { timeout: 4000 });
      } else {
        setTimeout(run, 2000);
      }
    };
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });
  }
}
