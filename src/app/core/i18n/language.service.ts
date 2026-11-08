import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import type { Dictionary } from './dictionary';
import { AR } from './ar';
import { EN } from './en';

export type Lang = 'ar' | 'en';
export type Dir = 'rtl' | 'ltr';

const DEFAULT_LANG: Lang = 'ar';
/** Keep in sync with the inline pre-paint script in index.html. */
const STORAGE_KEY = 'aladala.lang';

const DICTIONARIES: Record<Lang, Dictionary> = { ar: AR, en: EN };

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  private readonly _lang = signal<Lang>(this.readStored());

  /** Current language. */
  readonly lang = this._lang.asReadonly();

  /** Text direction that goes with the current language. */
  readonly dir = computed<Dir>(() => (this._lang() === 'ar' ? 'rtl' : 'ltr'));

  readonly isRtl = computed(() => this._lang() === 'ar');

  /**
   * The active dictionary, fully typed. Use it in templates as `i18n.t().hero.eyebrow`.
   * A typo is a compile error, and OnPush components update automatically
   * because the template reads a signal.
   */
  readonly t = computed<Dictionary>(() => DICTIONARIES[this._lang()]);

  /** ar: Arabic-Indic digits (١٢٣), en: Western digits (123). */
  private readonly numberFormats: Record<Lang, Intl.NumberFormat> = {
    ar: new Intl.NumberFormat('ar-EG-u-nu-arab'),
    en: new Intl.NumberFormat('en-US'),
  };
  /** Same, zero-padded to two digits (٠١ / 01). Used for list numbering. */
  private readonly padFormats: Record<Lang, Intl.NumberFormat> = {
    ar: new Intl.NumberFormat('ar-EG-u-nu-arab', { minimumIntegerDigits: 2 }),
    en: new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2 }),
  };
  private static readonly ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

  constructor() {
    // Runs when the service is first created (see provideAppInitializer in
    // app.config.ts), so <html lang/dir>, title and meta are right before
    // the first component renders.
    this.applyToDocument(this._lang());

    if (isDevMode()) {
      // Dev helper: __lang.setLang('en') in the browser console
      (window as unknown as { __lang?: LanguageService }).__lang = this;
    }
  }

  setLang(lang: Lang): void {
    if (lang === this._lang()) return;
    this._lang.set(lang);
    // Applied synchronously, so the DOM direction is already correct when
    // anything reacting to the change (e.g. the scroll timeline) reads it.
    this.applyToDocument(lang);
    this.persist(lang);
  }

  toggle(): void {
    this.setLang(this._lang() === 'ar' ? 'en' : 'ar');
  }

  /** Formats a number with the digits of the current language. Safe to call outside Angular. */
  n(value: number): string {
    return this.numberFormats[this._lang()].format(value);
  }
  /** Two-digit list number in the current language: 1 -> ٠١ or 01. */
  pad2(value: number): string {
    return this.padFormats[this._lang()].format(value);
  }
  /** Converts Western digits inside a ready-made string ("9 AM" -> "٩ AM" in Arabic). */
  digits(text: string): string {
    if (this._lang() !== 'ar') return text;
    return text.replace(/\d/g, (d) => LanguageService.ARABIC_INDIC[Number(d)]);
  }

  // ------------------------------------------------------------------
  private applyToDocument(lang: Lang): void {
    const html = this.doc.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const dict = DICTIONARIES[lang];
    this.title.setTitle(dict.meta.title);
    this.meta.updateTag({
      name: 'description',
      content: dict.meta.description,
    });
  }

  private readStored(): Lang {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'ar' || v === 'en' ? v : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG; // storage blocked (private mode, etc.)
    }
  }

  private persist(lang: Lang): void {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore: the language still works for this session */
    }
  }
}
