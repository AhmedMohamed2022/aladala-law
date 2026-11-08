import {
  AfterViewInit,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ScrollService } from './core/scroll.service';
import { SceneStateService } from './core/scene-state.service';
import { FontLoaderService } from './core/font-loader.service';
import { LanguageService } from './core/i18n/language.service';
import { LanguageTransitionService } from './core/i18n/language-transition.service';
import { HeroPose, SectionPoses, heroPose, sectionPoses } from './three/poses';

import { ThreeSceneComponent } from './components/three-scene/three-scene.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { AboutComponent } from './components/about/about.component';
import { ServicesComponent } from './components/services/services.component';
import { WhyChooseUsComponent } from './components/why-choose-us/why-choose-us.component';
import { ContactComponent } from './components/contact/contact.component';
import { FooterComponent } from './components/footer/footer.component';

/**
 * initial:  first build, after the hero intro
 * resize:   the viewport width changed
 * language: the language (and so the text, the layout and the mirrored poses) changed
 */
type BuildMode = 'initial' | 'resize' | 'language';

/** Page blocks that can hold the reader's place, top to bottom. */
const ANCHORS = ['#hero', '#about', '#services', '#why', '#contact', 'footer'];

/** "Where the reader is": a block, and how far down it (0..1). Survives a change of text length. */
interface ScrollAnchor {
  selector: string;
  fraction: number;
  atBottom: boolean;
}

/** One scrubbed pose transition: the trigger plus the poses it moves between. */
interface PoseStep {
  st: ScrollTrigger;
  from: HeroPose;
  to: HeroPose;
}

const POSE_EASE = 'power2.inOut';
const GLIDE_SECONDS = 0.9;

/** Linear blend of two poses (t is the already-eased progress). */
function lerpPose(a: HeroPose, b: HeroPose, t: number): HeroPose {
  const out = { ...a };
  (Object.keys(a) as Array<keyof HeroPose>).forEach((k) => {
    out[k] = a[k] + (b[k] - a[k]) * t;
  });
  return out;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ThreeSceneComponent,
    NavbarComponent,
    HeroComponent,
    AboutComponent,
    ServicesComponent,
    WhyChooseUsComponent,
    ContactComponent,
    FooterComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private ctx?: gsap.Context;
  private destroyed = false;
  private introFinished = false;
  private resizeTimer?: number;
  private fontsTimer?: number;
  private lastWidth = 0;

  /** The scroll triggers behind the current build, kept so the rig can be set straight from them. */
  private poseSteps: PoseStep[] = []; // scrubbed: hero->about, about->services, ... (in order)
  private scrubbed: ScrollTrigger[] = []; // every scrubbed trigger (the steps + the hero text fade)
  private zones: Array<{ st: ScrollTrigger; pose: HeroPose }> = []; // reduced motion
  private progressTrigger?: ScrollTrigger;

  private anchor: ScrollAnchor | null = null;
  private glide?: gsap.core.Tween;
  private unsubscribe: Array<() => void> = [];

  constructor(
    private scroll: ScrollService,
    private state: SceneStateService,
    private zone: NgZone,
    private i18n: LanguageService,
    private transition: LanguageTransitionService,
    private fonts: FontLoaderService,
  ) {}

  ngOnInit(): void {
    this.scroll.init(); // Lenis + ScrollTrigger sync (Step 2)
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger);

      // Language switch: remember the reader's place (before), rebuild and put them back (after)
      this.unsubscribe.push(
        this.transition.onBeforeSwap(this.captureAnchor),
        this.transition.onSwapped(this.onLanguageSwapped),
      );

      // Fetch the other language's font files while the browser is idle
      this.fonts.warmUp();
      // A font that arrives late reflows the page: re-measure the triggers
      document.fonts?.addEventListener('loadingdone', this.onFontsLoaded);

      // Wait until the hero intro is finished, so the two never fight over the rig
      this.state.introDone.then(() => {
        if (this.destroyed) return;
        this.build('initial');
        this.introFinished = true;
        window.addEventListener('resize', this.onResize, { passive: true });
      });
    });
  }

  // ------------------------------------------------------------------
  /** (Re)builds every scroll-linked animation that drives the 3D scale. */
  private build(mode: BuildMode): void {
    const rig = this.state.rig;
    const poses = sectionPoses(this.i18n.dir());
    const shownX = rig.posX + rig.posXShift; // where the scale is drawn right now
    this.lastWidth = window.innerWidth;

    // Clean slate: remove old triggers
    this.ctx?.revert();
    this.poseSteps = [];
    this.scrubbed = [];
    this.zones = [];

    // First build: start from the hero pose; if the visitor already scrolled
    // during the intro, the scrub smoothing carries the scale from there.
    if (mode === 'initial') Object.assign(rig, poses.hero);

    this.ctx = gsap.context(() => {
      // Overall progress, available to anything that wants it
      this.progressTrigger = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => (this.state.scroll.progress = self.progress),
      });

      if (this.scroll.reducedMotion) {
        this.buildStatic(poses);
      } else {
        this.buildScrubbed(poses);
      }
    });

    // Re-measures every trigger: this build's AND the components' reveal triggers
    ScrollTrigger.refresh();

    if (mode !== 'initial') {
      // A rebuild must not replay the journey from the hero, nor teleport the
      // scale: put the rig exactly where the NEW timeline has it at this scroll
      // position, then glide the drawn position over from where it was.
      this.syncRigToScroll(poses);
      this.glideFrom(shownX);
    }
  }

  // ------------------------------------------------------------------
  /** Full experience: the 3D scale is scrubbed to the scroll position. */
  private buildScrubbed(p: SectionPoses): void {
    const rig = this.state.rig;

    // Hero text fades and lifts away as you scroll
    const heroFade = gsap.fromTo(
      '[data-hero-content]',
      { opacity: 1, y: 0 },
      {
        opacity: 0,
        y: -70,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom 30%',
          scrub: true,
        },
      },
    );
    if (heroFade.scrollTrigger) this.scrubbed.push(heroFade.scrollTrigger);

    // One scrubbed transition per section change.
    // Explicit from/to poses keep jumps (navbar clicks) deterministic.
    const steps: Array<{
      from: HeroPose;
      to: HeroPose;
      trigger: string;
      start: string;
      end: string;
    }> = [
      {
        from: p.hero,
        to: p.about,
        trigger: '#about',
        start: 'top bottom',
        end: 'top 30%',
      },
      {
        from: p.about,
        to: p.services,
        trigger: '#services',
        start: 'top bottom',
        end: 'top 30%',
      },
      {
        from: p.services,
        to: p.why,
        trigger: '#why',
        start: 'top bottom',
        end: 'top 30%',
      },
      {
        from: p.why,
        to: p.contact,
        trigger: '#contact',
        start: 'top bottom',
        end: 'top 40%',
      },
    ];

    steps.forEach((s) => {
      const tween = gsap.fromTo(
        rig,
        { ...s.from },
        {
          ...s.to,
          ease: POSE_EASE,
          immediateRender: false,
          scrollTrigger: {
            trigger: s.trigger,
            start: s.start,
            end: s.end,
            scrub: 1, // 1 second of smoothing behind the scrollbar
          },
        },
      );
      if (tween.scrollTrigger) {
        this.poseSteps.push({
          st: tween.scrollTrigger,
          from: s.from,
          to: s.to,
        });
        this.scrubbed.push(tween.scrollTrigger);
      }
    });
  }

  /** Reduced motion: no animation, the scale simply takes each section's pose. */
  private buildStatic(p: SectionPoses): void {
    const rig = this.state.rig;
    const zones: Array<[string, HeroPose]> = [
      ['#hero', p.hero],
      ['#about', p.about],
      ['#services', p.services],
      ['#why', p.why],
      ['#contact', p.contact],
    ];

    zones.forEach(([selector, pose]) => {
      const st = ScrollTrigger.create({
        trigger: selector,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) Object.assign(rig, pose);
        },
      });
      this.zones.push({ st, pose });
    });
  }

  // ------------------------------------------------------------------
  /**
   * Sets the rig to what the current timeline produces at the current scroll
   * position, immediately.
   *
   * Why this is needed: a freshly built scrubbed tween starts at progress 0 and
   * smooths toward the scroll progress (scrub: 1). Left alone, the scale would
   * sweep through the poses; resetting to the hero pose would be worse.
   *
   * The pose is computed here (lerp + the same ease), not read back from the
   * tweens: GSAP skips a render when an animation is already at the requested
   * progress, so "set progress, then trust the tween" is not reliable.
   * Each step defines all ten rig values, so the LAST step that has started
   * decides the whole pose; before the first step it is the hero pose.
   */
  private syncRigToScroll(poses: SectionPoses): void {
    const rig = this.state.rig;

    if (this.scroll.reducedMotion) {
      // The latest zone whose start we have passed (also right when the
      // page's end sits above a zone's active window)
      const y = this.scroll.getScroll();
      let pose: HeroPose = poses.hero;
      this.zones.forEach((z) => {
        if (y >= z.st.start) pose = z.pose;
      });
      Object.assign(rig, pose);
      return;
    }

    // Park every scrub tween at the current scroll progress, so scrolling
    // continues from here instead of smoothing in from 0.
    this.scrubbed.forEach((st) => {
      const isPoseStep = this.poseSteps.some((s) => s.st === st);
      if (isPoseStep && st.progress === 0) return; // see note below
      // getTween() returns 0, not undefined, when there is no smoothing (scrub: true)
      const smoothing = st.getTween();
      if (smoothing) smoothing.progress(1);
      st.animation?.progress(st.progress);
    });
    // (Rendering a pose step at progress 0 would write ITS from-pose over the
    // rig, and the last step's from-pose is the "why" pose. So unstarted steps
    // are left alone.)

    // The tweens above may have written the rig; the computed pose wins.
    const ease = gsap.parseEase(POSE_EASE);
    let pose: HeroPose = poses.hero;
    this.poseSteps.forEach(({ st, from, to }) => {
      if (st.progress > 0) pose = lerpPose(from, to, ease(st.progress));
    });
    Object.assign(rig, pose);

    if (this.progressTrigger) {
      this.state.scroll.progress = this.progressTrigger.progress;
    }
  }

  /**
   * The scale has to move to the mirrored side. posX already holds the new
   * value (it follows the timeline), so we draw it from where it WAS using
   * posXShift, which eases to 0. Scrolling keeps moving posX underneath and
   * the two never fight, so the glide needs no "kill on scroll".
   */
  private glideFrom(shownX: number): void {
    const rig = this.state.rig;
    this.glide?.kill();
    this.glide = undefined;

    const delta = shownX - rig.posX;
    if (this.scroll.reducedMotion || Math.abs(delta) < 0.01) {
      rig.posXShift = 0;
      return;
    }

    rig.posXShift = delta;
    this.glide = gsap.to(rig, {
      posXShift: 0,
      duration: GLIDE_SECONDS,
      ease: 'power3.inOut',
      onComplete: () => (this.glide = undefined),
    });
  }

  // ------------------------------------------------------------------
  // Language switch
  // ------------------------------------------------------------------

  /** Fade midpoint, old layout: remember which block is in view and how far down it. */
  private captureAnchor = (): void => {
    const y = this.scroll.getScroll();
    const max = document.documentElement.scrollHeight - window.innerHeight;

    let chosen: { selector: string; top: number; height: number } | null = null;
    for (const selector of ANCHORS) {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      if (!chosen || top <= y + 1) {
        chosen = { selector, top, height: r.height };
      }
    }

    this.anchor = chosen
      ? {
          selector: chosen.selector,
          fraction: Math.min(
            1,
            Math.max(0, (y - chosen.top) / Math.max(chosen.height, 1)),
          ),
          atBottom: max > 0 && y >= max - 2,
        }
      : null;
  };

  /** After the swap: put the reader back at the same place in the (re-laid-out) page. */
  private restoreAnchor(): void {
    const a = this.anchor;
    this.anchor = null;
    if (!a) return;

    let y: number;
    const el = document.querySelector<HTMLElement>(a.selector);
    if (a.atBottom || !el) {
      // At the very end: stay at the very end (clamped to the new page height)
      y = a.atBottom
        ? document.documentElement.scrollHeight
        : this.scroll.getScroll();
    } else {
      const r = el.getBoundingClientRect();
      y = r.top + window.scrollY + a.fraction * r.height;
    }
    this.scroll.scrollToImmediate(y);
  }

  /** Language and DOM have changed, content still invisible. */
  private onLanguageSwapped = (): void => {
    if (this.destroyed) return;

    // Text lengths changed the section heights: keep the reader in the same place
    this.restoreAnchor();

    if (this.introFinished) {
      this.build('language');
    } else {
      // The hero intro still owns rotY / scale / camZ / glow. Only slide the
      // scale to its new side now; build() runs after the intro, reads the
      // current direction, and so agrees with this pose.
      this.retargetDuringIntro();
    }
  };

  private retargetDuringIntro(): void {
    const rig = this.state.rig;
    // posX is still 0 until the intro has placed the scale. It will then read
    // the new direction itself, so there is nothing to retarget.
    if (rig.posX === 0) return;

    const shownX = rig.posX + rig.posXShift;
    rig.posX = heroPose(this.i18n.dir()).posX;
    this.glideFrom(shownX);
  }

  /** A web font arrived after the text was laid out: re-measure (debounced). */
  private onFontsLoaded = (): void => {
    window.clearTimeout(this.fontsTimer);
    this.fontsTimer = window.setTimeout(() => {
      if (!this.destroyed && this.introFinished) ScrollTrigger.refresh();
    }, 150);
  };

  // ------------------------------------------------------------------
  // Rebuild poses when the width changes (ignores mobile toolbar height changes)
  private onResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      if (!this.destroyed && window.innerWidth !== this.lastWidth) {
        this.build('resize');
      }
    }, 250);
  };

  ngOnDestroy(): void {
    this.destroyed = true;
    window.clearTimeout(this.resizeTimer);
    window.clearTimeout(this.fontsTimer);
    window.removeEventListener('resize', this.onResize);
    document.fonts?.removeEventListener('loadingdone', this.onFontsLoaded);
    this.unsubscribe.forEach((fn) => fn());
    this.unsubscribe = [];
    this.glide?.kill();
    this.ctx?.revert();
  }
}
