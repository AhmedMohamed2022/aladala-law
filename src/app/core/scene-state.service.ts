import { Injectable, NgZone, OnDestroy, isDevMode } from '@angular/core';

/**
 * The "rig" is what ScrollTrigger animates and Three.js reads.
 * Plain numbers only, so GSAP can tween them directly.
 */
export interface SceneRig {
  posX: number; // scale position (world units)
  /**
   * Added to posX when drawing. Normally 0. After a language switch the scale
   * has to move to the mirrored side: this holds the distance still to cover
   * and eases back to 0, while posX itself already follows the scroll timeline.
   * Keeping it separate means scrolling and the glide never fight over posX.
   */
  posXShift: number;
  posY: number;
  posZ: number;
  rotY: number; // base rotation from scroll (radians)
  rotX: number;
  scale: number;
  camZ: number; // camera distance
  camY: number; // camera height
  camLookX: number; // camera look-at offset
  glow: number; // 0..1 light intensity multiplier
}

@Injectable({ providedIn: 'root' })
export class SceneStateService implements OnDestroy {
  /** Normalized pointer position, range -1..1 (updated on every move) */
  readonly mouse = { x: 0, y: 0 };

  /** Overall page scroll progress, 0..1 (set by ScrollTrigger in Step 11) */
  readonly scroll = { progress: 0 };
  /** Resolves when the hero intro finishes. The scroll timeline waits for it. */
  private resolveIntro!: () => void;
  readonly introDone = new Promise<void>(
    (resolve) => (this.resolveIntro = resolve),
  );

  markIntroDone(): void {
    this.resolveIntro();
  }

  /** Starting values for the hero. Step 11 animates these across sections. */
  readonly rig: SceneRig = {
    posX: 0,
    posXShift: 0,
    posY: 0,
    posZ: 0,
    rotY: 0,
    rotX: 0,
    scale: 1,
    camZ: 9,
    camY: 0.6,
    camLookX: 0,
    glow: 1,
  };

  private listening = false;

  constructor(private zone: NgZone) {
    if (isDevMode()) {
      // Dev helper: __rig in the browser console shows the live 3D pose
      (window as unknown as { __rig?: SceneRig }).__rig = this.rig;
    }
  }

  /** Start tracking the pointer. Called by ThreeSceneComponent. */
  startPointerTracking(): void {
    if (this.listening) return;
    this.listening = true;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('pointermove', this.onPointerMove, {
        passive: true,
      });
    });
  }

  stopPointerTracking(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
    this.listening = false;
  }

  // Arrow function keeps `this` and gives a stable reference for removeEventListener
  private onPointerMove = (e: PointerEvent): void => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  };

  ngOnDestroy(): void {
    this.stopPointerTracking();
  }
}
