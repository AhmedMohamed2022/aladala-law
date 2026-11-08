import type { Dictionary } from './dictionary';

export const EN: Dictionary = {
  meta: {
    title: 'Al Adala Law Firm | We Build Trust. We Defend Rights.',
    description:
      'Al Adala Law Firm delivers strategic legal counsel to businesses and individuals, with proven experience and complete confidentiality.',
  },

  lang: {
    toggleLabel: 'عربي',
    // Contains the visible label "عربي" (WCAG 2.5.3 Label in Name)
    toggleAria: 'Switch to Arabic (عربي)',
    announce: 'Language switched to English',
  },

  brand: {
    name: 'Al Adala',
    tagline: 'Law & Advisory',
    fullName: 'Al Adala Law Firm',
  },

  nav: {
    about: 'About',
    services: 'Services',
    why: 'Why Us',
    contact: 'Contact',
    cta: 'Book a Consultation',
  },

  hero: {
    eyebrow: 'Law Firm & Legal Counsel',
    headline: { line1: 'We Build Trust.', line2: 'We Defend Rights.' },
    lead: 'Strategic legal counsel for businesses and individuals, backed by proven experience, absolute discretion and a close understanding of every case. We protect your interests at every stage.',
    ctaPrimary: 'Book a Consultation',
    ctaSecondary: 'Explore Our Services',
    scrollCue: 'Scroll',
  },

  about: {
    eyebrow: 'About the Firm',
    title: {
      before: 'A Legal Partner You Can ',
      accent: 'Trust',
      after: 'for Over Fifteen Years',
    },
    paragraphs: [
      'We believe the law is more than statutes. It is a duty we owe to people. Our team pairs deep experience with close attention to the detail of every case, delivering representation that protects your interests and gives you peace of mind when it matters most.',
      'From corporate agreements to complex disputes, we act with complete transparency and discretion, and every decision begins with what you are trying to achieve.',
    ],
    stats: {
      years: 'Years of Experience',
      cases: 'Successful Cases',
      satisfaction: 'Client Satisfaction',
    },
  },

  services: {
    eyebrow: 'Our Practice Areas',
    title: {
      before: 'Integrated ',
      accent: 'Legal Solutions',
      after: 'for Every Need',
    },
    lead: 'Our specialist team covers the areas of law that matter most, and we shape a tailored strategy around the nature and goals of every case.',
    items: [
      {
        title: 'Commercial & Corporate Law',
        text: 'Company formation, commercial contracts, mergers and acquisitions, with sound counsel at every stage of your business’s growth.',
      },
      {
        title: 'Litigation & Dispute Resolution',
        text: 'Formidable representation before courts and arbitral tribunals, with considered strategies to protect your rights and secure the best possible outcome.',
      },
      {
        title: 'Real Estate & Property',
        text: 'Review of sales, leases and development transactions, with title verification that safeguards your property investments.',
      },
      {
        title: 'Contracts & Legal Advisory',
        text: 'Precise drafting and review of contracts, and clear, practical advice that lets you decide with confidence.',
      },
    ],
  },

  why: {
    eyebrow: 'Why Choose Us',
    title: {
      before: 'Four Pillars That ',
      accent: 'Make the Difference',
      after: '',
    },
    pillars: [
      {
        title: 'Proven Professional Experience',
        text: 'A team of specialist lawyers with a distinguished record in commercial and civil matters, combining legal scholarship with hard-won courtroom experience.',
      },
      {
        title: 'Client-Centered Solutions',
        text: 'We listen first, then design the legal plan that fits your goals and circumstances, keeping you informed at every stage without the complexity.',
      },
      {
        title: 'Absolute Confidentiality',
        text: 'Your privacy comes first. We hold every detail, document and conversation to the highest standard of professional confidentiality.',
      },
      {
        title: 'Strategic Representation',
        text: 'We examine every case from every angle and build a considered strategy that protects your interests today and in the long run.',
      },
    ],
  },

  contact: {
    eyebrow: 'Get Started',
    title: {
      before: 'Your Case Deserves a ',
      accent: 'Team That Believes in It',
      after: '',
    },
    lead: 'Book your first consultation today and speak with a specialist lawyer who listens closely and sets out the clearest path to protecting your rights.',
    cta: 'Book Your Consultation',
    labels: { call: 'Call Us', email: 'Email Us', hours: 'Office Hours' },
    hours: 'Saturday – Thursday, 9 AM – 6 PM',
  },

  footer: {
    rights: 'Al Adala Law Firm. All rights reserved.',
    note: 'We are committed to protecting your privacy. Any information you provide will be handled in accordance with our privacy policy.',
  },

  aria: {
    mainNav: 'Main navigation',
    menu: 'Menu',
    mobileNav: 'Mobile menu',
    footerNav: 'Footer links',
    backToTop: 'Back to top',
  },
};
