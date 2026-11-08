/**
 * The shape every language file must satisfy.
 * TypeScript fails the build if ar.ts or en.ts misses a key (or has a wrong
 * number of items in a list), so the two languages can never drift apart.
 *
 * Rules for writing copy:
 *  - Numerals inside sentences (opening hours) are written with Western digits.
 *    LanguageService.digits() converts them to Arabic-Indic at render time.
 *  - Shared facts (stat values, phone, email, section ids, SVG icons) stay in the
 *    components, not here, so a number can never differ between languages.
 */

/** A heading with one gold word or phrase: `before` + [gold `accent`] + (new line) `after`. */
export interface AccentTitle {
  /** Text before the gold part. Keep the trailing space. */
  before: string;
  /** The gold part. */
  accent: string;
  /** Optional second line (rendered after a <br>). Empty string = none. */
  after: string;
}

export interface CardCopy {
  title: string;
  text: string;
}

/** Exactly four items. Forgetting one is a compile error. */
type Four<T> = [T, T, T, T];

export interface Dictionary {
  meta: { title: string; description: string };

  lang: {
    /** Short label on the toggle button. It names the language you will SWITCH TO. */
    toggleLabel: string;
    /** Full accessible name of the toggle button. */
    toggleAria: string;
    /** Read out by screen readers after a switch (written in the NEW language). */
    announce: string;
  };

  brand: { name: string; tagline: string; fullName: string };

  nav: {
    about: string;
    services: string;
    why: string;
    contact: string;
    cta: string;
  };

  hero: {
    eyebrow: string;
    headline: { line1: string; line2: string };
    lead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    scrollCue: string;
  };

  about: {
    eyebrow: string;
    title: AccentTitle;
    paragraphs: [string, string];
    stats: { years: string; cases: string; satisfaction: string };
  };

  services: {
    eyebrow: string;
    title: AccentTitle;
    lead: string;
    items: Four<CardCopy>;
  };

  why: {
    eyebrow: string;
    title: AccentTitle;
    pillars: Four<CardCopy>;
  };

  contact: {
    eyebrow: string;
    title: AccentTitle;
    lead: string;
    cta: string;
    labels: { call: string; email: string; hours: string };
    hours: string;
  };

  footer: {
    /** Rendered as "© {year} {rights}" */
    rights: string;
    note: string;
  };

  aria: {
    mainNav: string;
    menu: string;
    mobileNav: string;
    footerNav: string;
    backToTop: string;
  };
}
