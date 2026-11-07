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

import { ScrollService } from '../../core/scroll.service';
import { SceneStateService } from '../../core/scene-state.service';
import { heroPose } from '../../three/poses';

@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLElement>;

  private ctx?: gsap.Context;
  private destroyed = false;

  constructor(
    private scroll: ScrollService,
    private state: SceneStateService,
    private zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      // Wait for web fonts so text doesn't reflow during the animation
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      Promise.race([
        fontsReady,
        new Promise((resolve) => setTimeout(resolve, 1500)), // never wait forever
      ]).then(() => {
        if (!this.destroyed) this.playEntrance();
      });
    });
  }

  private playEntrance(): void {
    const rig = this.state.rig;
    const pose = heroPose();

    // Reduced motion: place the scale and show everything, no animation
    if (this.scroll.reducedMotion) {
      Object.assign(rig, pose);
      this.state.markIntroDone();
      return;
    }

    this.ctx = gsap.context(() => {
      const q = gsap.utils.selector(this.rootRef.nativeElement);

      // The scale starts off-pose and settles into the hero position
      gsap.set(rig, { posX: pose.posX, posY: pose.posY, posZ: pose.posZ });

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => this.state.markIntroDone(),
      });

      // ---- 3D: the scale spins in, grows, and lights up ----
      tl.fromTo(
        rig,
        { rotY: -2.6, scale: pose.scale * 0.55, camZ: pose.camZ + 3, glow: 0 },
        {
          rotY: pose.rotY,
          scale: pose.scale,
          camZ: pose.camZ,
          glow: pose.glow,
          duration: 2.6,
          ease: 'power4.out',
        },
        0,
      );

      // ---- Text: eyebrow, headline lines (masked), paragraph, CTAs ----
      tl.fromTo(
        q('.eyebrow'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, clearProps: 'transform' },
        0.5,
      );

      tl.fromTo(
        q('.line-inner'),
        { yPercent: 115, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.3,
          stagger: 0.18,
          clearProps: 'transform',
        },
        0.65,
      );

      tl.fromTo(
        q('.lead'),
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, clearProps: 'transform' },
        1.25,
      );

      tl.fromTo(
        q('.actions .btn'),
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.12,
          clearProps: 'transform',
        },
        1.45,
      );

      tl.fromTo(
        q('.scroll-cue'),
        { opacity: 0 },
        { opacity: 1, duration: 1, clearProps: 'opacity' },
        2.0,
      );
    }, this.rootRef.nativeElement);
  }

  goTo(event: Event, target: string): void {
    event.preventDefault();
    this.scroll.scrollTo(target);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.ctx?.revert(); // kills the timeline and restores inline styles
  }
}
