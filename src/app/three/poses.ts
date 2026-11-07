import type { SceneRig } from '../core/scene-state.service';

// Must match the camera in ThreeSceneComponent
const FOV = 35;
const CAM_Z = 9;
const MODEL_HALF_WIDTH = 2.95; // beam half-length + pan radius

export type HeroPose = Pick<
  SceneRig,
  | 'posX'
  | 'posY'
  | 'posZ'
  | 'rotX'
  | 'rotY'
  | 'scale'
  | 'camZ'
  | 'camY'
  | 'camLookX'
  | 'glow'
>;

/** Where the scale rests in the hero, based on the current viewport. */
export function heroPose(): HeroPose {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const halfW = Math.tan((FOV / 2) * (Math.PI / 180)) * CAM_Z * (w / h);

  const base = {
    posZ: 0,
    rotX: 0,
    rotY: 0,
    camZ: CAM_Z,
    camY: 0.6,
    camLookX: 0,
    glow: 1,
  };

  if (w > 900) {
    // Desktop: scale on the left, text on the right (RTL)
    return {
      ...base,
      posX: -halfW * 0.46,
      posY: 0,
      scale: Math.min(0.85, (halfW * 0.45) / MODEL_HALF_WIDTH),
    };
  }

  // Tablet / mobile: scale centered below the text
  return {
    ...base,
    posX: 0,
    posY: -1.2,
    scale: Math.min(0.8, (halfW * 0.9) / MODEL_HALF_WIDTH),
  };
}
// ======================================================================
// Poses for every section, used by the scroll timeline in AppComponent
// ======================================================================

function halfWidthAt(camZ: number): number {
  return (
    Math.tan((FOV / 2) * (Math.PI / 180)) *
    camZ *
    (window.innerWidth / window.innerHeight)
  );
}

export interface SectionPoses {
  hero: HeroPose;
  about: HeroPose;
  services: HeroPose;
  why: HeroPose;
  contact: HeroPose;
}

export function sectionPoses(): SectionPoses {
  const hero = heroPose();
  const pose = (o: Partial<HeroPose>): HeroPose => ({ ...hero, ...o });

  if (window.innerWidth > 900) {
    const sideX = (camZ: number) => halfWidthAt(camZ) * 0.46;
    const sideScale = (camZ: number) =>
      Math.min(0.85, (halfWidthAt(camZ) * 0.45) / MODEL_HALF_WIDTH);

    return {
      hero,
      // Text is on the left in RTL, so the scale takes the right side
      about: pose({
        camZ: 8.5,
        camY: 0.9,
        posX: sideX(8.5),
        posY: 0,
        posZ: 0,
        scale: sideScale(8.5),
        rotY: 1.2,
        rotX: 0.08,
        glow: 1,
      }),
      // Centered, pushed back and dimmed behind the cards
      services: pose({
        camZ: 11,
        camY: 1.4,
        posX: 0,
        posY: 0.3,
        posZ: -3,
        scale: 0.85,
        rotY: 2.4,
        rotX: 0.15,
        glow: 0.3,
      }),
      // Pillars are on the right, so the scale crosses to the left
      why: pose({
        camZ: 8.5,
        camY: 0.4,
        posX: -sideX(8.5),
        posY: 0,
        posZ: 0,
        scale: sideScale(8.5),
        rotY: 4.2,
        rotX: 0.05,
        glow: 1,
      }),
      // Recedes and goes dark under the closing section
      contact: pose({
        camZ: 14,
        camY: 2.2,
        posX: 0,
        posY: 0.6,
        posZ: -4,
        scale: 0.5,
        rotY: 6.0,
        rotX: 0.2,
        glow: 0,
      }),
    };
  }

  // Tablet / mobile: single column, so the scale stays faint behind the text
  const faint = (rotY: number, glow: number) =>
    pose({
      camZ: 10,
      camY: 1,
      posX: 0,
      posY: 0,
      posZ: -1,
      scale: hero.scale,
      rotY,
      rotX: 0.1,
      glow,
    });

  return {
    hero,
    about: faint(1.2, 0.35),
    services: faint(2.4, 0.2),
    why: faint(4.2, 0.35),
    contact: faint(6.0, 0),
  };
}
