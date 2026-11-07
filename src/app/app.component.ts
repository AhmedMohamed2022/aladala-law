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
import { HeroPose, SectionPoses, sectionPoses } from './three/poses';

import { ThreeSceneComponent } from './components/three-scene/three-scene.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { AboutComponent } from './components/about/about.component';
import { ServicesComponent } from './components/services/services.component';
import { WhyChooseUsComponent } from './components/why-choose-us/why-choose-us.component';
import { ContactComponent } from './components/contact/contact.component';
import { FooterComponent } from './components/footer/footer.component';

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
  private resizeTimer?: number;
  private lastWidth = 0;

  constructor(
    private scroll: ScrollService,
    private state: SceneStateService,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.scroll.init(); // Lenis + ScrollTrigger sync (Step 2)
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      gsap.registerPlugin(ScrollTrigger);

      // Wait until the hero intro is finished, so the two never fight over the rig
      this.state.introDone.then(() => {
        if (this.destroyed) return;
        this.build();
        window.addEventListener('resize', this.onResize, { passive: true });
      });
    });
  }

  // ------------------------------------------------------------------
  /** (Re)builds every scroll-linked animation that drives the 3D scale. */
  private build(): void {
    const rig = this.state.rig;
    const poses = sectionPoses();
    this.lastWidth = window.innerWidth;

    // Clean slate: remove old triggers and start from the hero pose
    this.ctx?.revert();
    Object.assign(rig, poses.hero);

    this.ctx = gsap.context(() => {
      // Overall progress, available to anything that wants it
      ScrollTrigger.create({
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

    ScrollTrigger.refresh();
  }

  // ------------------------------------------------------------------
  /** Full experience: the 3D scale is scrubbed to the scroll position. */
  private buildScrubbed(p: SectionPoses): void {
    const rig = this.state.rig;

    // Hero text fades and lifts away as you scroll
    gsap.fromTo(
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
      gsap.fromTo(
        rig,
        { ...s.from },
        {
          ...s.to,
          ease: 'power2.inOut',
          immediateRender: false,
          scrollTrigger: {
            trigger: s.trigger,
            start: s.start,
            end: s.end,
            scrub: 1, // 1 second of smoothing behind the scrollbar
          },
        },
      );
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
      ScrollTrigger.create({
        trigger: selector,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (self.isActive) Object.assign(rig, pose);
        },
      });
    });
  }

  // ------------------------------------------------------------------
  // Rebuild poses when the width changes (ignores mobile toolbar height changes)
  private onResize = (): void => {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      if (!this.destroyed && window.innerWidth !== this.lastWidth) this.build();
    }, 250);
  };

  ngOnDestroy(): void {
    this.destroyed = true;
    window.clearTimeout(this.resizeTimer);
    window.removeEventListener('resize', this.onResize);
    this.ctx?.revert();
  }
}
