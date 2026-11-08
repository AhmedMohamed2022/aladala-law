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

/**
 * Text direction. Structurally identical to `Dir` in LanguageService, but
 * declared here so this file stays pure (no Angular imports).
 */
export type PoseDir = 'rtl' | 'ltr';

/**
 * +1 in RTL, -1 in LTR. Multiplies every physical X offset, so the whole
 * composition mirrors with the reading direction.
 */
function inlineSign(dir: PoseDir): 1 | -1 {
  return dir === 'rtl' ? 1 : -1;
}

/**
 * Where the scale rests in the hero, based on the current viewport.
 * Desktop: opposite the text. RTL text sits on the right, so the scale is on
 * the left. LTR text sits on the left, so the scale is on the right.
 */
export function heroPose(dir: PoseDir = 'rtl'): HeroPose {
  const s = inlineSign(dir);
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
    // Desktop: scale opposite the text (RTL: left, LTR: right)
    return {
      ...base,
      posX: -s * halfW * 0.46,
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

export function sectionPoses(dir: PoseDir = 'rtl'): SectionPoses {
  const s = inlineSign(dir);
  const hero = heroPose(dir);
  const pose = (o: Partial<HeroPose>): HeroPose => ({ ...hero, ...o });

  if (window.innerWidth > 900) {
    const sideX = (camZ: number) => halfWidthAt(camZ) * 0.46;
    const sideScale = (camZ: number) =>
      Math.min(0.85, (halfWidthAt(camZ) * 0.45) / MODEL_HALF_WIDTH);

    return {
      hero,
      // The text column is at the inline-start (RTL: right, LTR: left) and the
      // empty spacer column is opposite it, so the scale takes that side
      // (RTL: right, LTR: left).
      about: pose({
        camZ: 8.5,
        camY: 0.9,
        posX: s * sideX(8.5),
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
      // The pillars take the opposite side to the about text, so the scale
      // crosses over (RTL: left, LTR: right)
      why: pose({
        camZ: 8.5,
        camY: 0.4,
        posX: -s * sideX(8.5),
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
