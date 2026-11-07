import * as THREE from 'three';
import type { SceneRig } from '../core/scene-state.service';

export interface JusticeScaleOptions {
  /** Disables idle floating and mouse response (prefers-reduced-motion) */
  reducedMotion?: boolean;
}

export class JusticeScale {
  /** Add this to your scene. Its position/rotation/scale are driven by update(). */
  readonly group = new THREE.Group();

  private readonly model = new THREE.Group(); // inner group, used to center the model
  private readonly beam = new THREE.Group(); // pivots around the top of the pillar
  private readonly panLeft = new THREE.Group();
  private readonly panRight = new THREE.Group();

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  private readonly reducedMotion: boolean;

  // Smoothed pointer values
  private mx = 0;
  private my = 0;

  // Dimensions (world units)
  private readonly beamY = 2.0;
  private readonly beamHalf = 2.0;
  private readonly hang = 1.6;
  private readonly panRadius = 0.95;

  constructor(options: JusticeScaleOptions = {}) {
    this.reducedMotion = !!options.reducedMotion;

    const gold = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc9a24d,
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.3,
      }),
    );
    const darkGold = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x8a6a28,
        metalness: 1,
        roughness: 0.4,
        envMapIntensity: 1.0,
      }),
    );
    const plinthMat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0x14181f,
        metalness: 0.6,
        roughness: 0.35,
        envMapIntensity: 0.8,
      }),
    );
    const dishMat = this.track(
      new THREE.MeshStandardMaterial({
        color: 0xc9a24d,
        metalness: 1,
        roughness: 0.2,
        envMapIntensity: 1.3,
        side: THREE.DoubleSide, // lathe dish is a thin surface, so show both sides
      }),
    );

    this.buildBase(gold, darkGold, plinthMat);
    this.buildPillar(gold, darkGold);
    this.buildBeam(gold, darkGold);
    this.buildPan(this.panLeft, -this.beamHalf, gold, dishMat);
    this.buildPan(this.panRight, this.beamHalf, gold, dishMat);

    // Shadows: every mesh casts and receives
    this.model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    this.model.position.y = -0.2; // visually center the model on the group origin
    this.group.add(this.model);
  }

  // ------------------------------------------------------------------
  // Frame update. Called by ThreeSceneComponent on every animation frame.
  // ------------------------------------------------------------------
  update(
    delta: number,
    elapsed: number,
    mouse: { x: number; y: number },
    rig: SceneRig,
  ): void {
    // Frame-rate independent smoothing
    const k = 1 - Math.exp(-delta * 5);
    const calm = this.reducedMotion ? 0 : 1;

    this.mx += (mouse.x * calm - this.mx) * k;
    this.my += (mouse.y * calm - this.my) * k;

    // Idle floating
    const floatY = Math.sin(elapsed * 0.9) * 0.12 * calm;
    const floatRot = Math.sin(elapsed * 0.5) * 0.05 * calm;

    // Position and scale come from the scroll "rig" (animated by GSAP)
    this.group.position.set(rig.posX, rig.posY + floatY, rig.posZ);
    this.group.scale.setScalar(rig.scale);

    // Rotation = scroll rotation + mouse tilt + idle drift
    this.group.rotation.y = rig.rotY + this.mx * 0.45 + floatRot;
    this.group.rotation.x = rig.rotX + this.my * 0.14;

    // The beam sways gently, and leans slightly toward the cursor
    const sway = Math.sin(elapsed * 0.8) * 0.045 * calm + this.mx * 0.03;
    this.beam.rotation.z = sway;

    // Counter-rotate the pans so they always hang level
    this.panLeft.rotation.z = -sway;
    this.panRight.rotation.z = -sway;
  }

  // ------------------------------------------------------------------
  // Cleanup. Free GPU memory.
  // ------------------------------------------------------------------
  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.geometries.length = 0;
    this.materials.length = 0;
    this.group.clear();
  }

  // ==================================================================
  // Model construction
  // ==================================================================

  private buildBase(
    gold: THREE.Material,
    darkGold: THREE.Material,
    plinth: THREE.Material,
  ): void {
    // Dark plinth under the gold base (contrast)
    const plinthGeo = this.track(
      new THREE.CylinderGeometry(1.7, 1.75, 0.16, 64),
    );
    const plinthMesh = new THREE.Mesh(plinthGeo, plinth);
    plinthMesh.position.y = -1.98;
    this.model.add(plinthMesh);

    // Stepped, curved base using a lathe profile
    const profile = [
      [0, 0],
      [1.5, 0],
      [1.5, 0.1],
      [1.35, 0.18],
      [1.35, 0.28],
      [1.0, 0.4],
      [0.6, 0.55],
      [0.32, 0.75],
      [0.22, 0.9],
      [0, 0.9],
    ].map(([x, y]) => new THREE.Vector2(x, y));

    const baseGeo = this.track(new THREE.LatheGeometry(profile, 64));
    const baseMesh = new THREE.Mesh(baseGeo, gold);
    baseMesh.position.y = -1.9;
    this.model.add(baseMesh);

    // Decorative ring on the base
    const ringGeo = this.track(new THREE.TorusGeometry(1.36, 0.035, 12, 96));
    const ring = new THREE.Mesh(ringGeo, darkGold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.9 + 0.23;
    this.model.add(ring);
  }

  private buildPillar(gold: THREE.Material, darkGold: THREE.Material): void {
    const bottom = -1.05;
    const height = this.beamY - bottom;

    const pillarGeo = this.track(
      new THREE.CylinderGeometry(0.1, 0.16, height, 32),
    );
    const pillar = new THREE.Mesh(pillarGeo, gold);
    pillar.position.y = bottom + height / 2;
    this.model.add(pillar);

    // Decorative collars along the pillar
    const collarGeo = this.track(new THREE.TorusGeometry(0.17, 0.045, 12, 48));
    [-0.75, 0.2, 1.5].forEach((y) => {
      const collar = new THREE.Mesh(collarGeo, darkGold);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = y;
      // Slightly thinner toward the top
      const s = 1 - ((y - bottom) / height) * 0.35;
      collar.scale.set(s, s, 1);
      this.model.add(collar);
    });
  }

  private buildBeam(gold: THREE.Material, darkGold: THREE.Material): void {
    this.beam.position.y = this.beamY;
    this.model.add(this.beam);

    // Two tapered halves (thicker at the center, thinner at the ends)
    const halfGeo = this.track(
      new THREE.CylinderGeometry(0.05, 0.1, this.beamHalf, 24),
    );
    const right = new THREE.Mesh(halfGeo, gold);
    right.rotation.z = -Math.PI / 2; // top (thin end) points to +X
    right.position.x = this.beamHalf / 2;
    const left = new THREE.Mesh(halfGeo, gold);
    left.rotation.z = Math.PI / 2; // top (thin end) points to -X
    left.position.x = -this.beamHalf / 2;
    this.beam.add(right, left);

    // Center pivot: sphere plus a flat disc
    const pivotGeo = this.track(new THREE.SphereGeometry(0.2, 32, 24));
    this.beam.add(new THREE.Mesh(pivotGeo, gold));

    const discGeo = this.track(
      new THREE.CylinderGeometry(0.34, 0.34, 0.06, 48),
    );
    const disc = new THREE.Mesh(discGeo, darkGold);
    disc.rotation.x = Math.PI / 2;
    this.beam.add(disc);

    // Finial on top of the pivot
    const finialGeo = this.track(new THREE.SphereGeometry(0.09, 20, 16));
    const finial = new THREE.Mesh(finialGeo, gold);
    finial.position.y = 0.32;
    this.beam.add(finial);

    const spikeGeo = this.track(new THREE.ConeGeometry(0.05, 0.22, 16));
    const spike = new THREE.Mesh(spikeGeo, gold);
    spike.position.y = 0.5;
    this.beam.add(spike);

    // End caps where the pans hang
    const capGeo = this.track(new THREE.SphereGeometry(0.1, 20, 16));
    [-this.beamHalf, this.beamHalf].forEach((x) => {
      const cap = new THREE.Mesh(capGeo, gold);
      cap.position.x = x;
      this.beam.add(cap);
    });
  }

  private buildPan(
    pan: THREE.Group,
    x: number,
    gold: THREE.Material,
    dishMat: THREE.Material,
  ): void {
    // The pan group's origin is the beam end, so rotating it keeps the pan level
    pan.position.x = x;
    this.beam.add(pan);

    const R = this.panRadius;
    const depth = 0.38;

    // Dish: a quarter-circle profile revolved around Y
    const dishProfile: THREE.Vector2[] = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * (Math.PI / 2);
      dishProfile.push(
        new THREE.Vector2(R * Math.cos(t), -depth * Math.sin(t)),
      );
    }
    const dishGeo = this.track(new THREE.LatheGeometry(dishProfile, 64));
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.y = -this.hang;
    pan.add(dish);

    // Rim
    const rimGeo = this.track(new THREE.TorusGeometry(R, 0.035, 12, 64));
    const rim = new THREE.Mesh(rimGeo, gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -this.hang;
    pan.add(rim);

    // Three chains from the beam end to evenly spaced points on the rim
    const top = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const rimPoint = new THREE.Vector3(
        Math.cos(a) * R,
        -this.hang,
        Math.sin(a) * R,
      );
      pan.add(this.makeChain(top, rimPoint, gold));
    }
  }

  /** A thin cylinder stretched between two points. */
  private makeChain(
    a: THREE.Vector3,
    b: THREE.Vector3,
    mat: THREE.Material,
  ): THREE.Mesh {
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();

    const geo = this.track(new THREE.CylinderGeometry(0.014, 0.014, 1, 6));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.scale.y = length;
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return mesh;
  }

  // ------------------------------------------------------------------
  // Tracking helpers so dispose() can free everything
  // ------------------------------------------------------------------
  private track<T extends THREE.BufferGeometry | THREE.Material>(
    resource: T,
  ): T {
    if ((resource as THREE.Material).isMaterial) {
      this.materials.push(resource as THREE.Material);
    } else {
      this.geometries.push(resource as THREE.BufferGeometry);
    }
    return resource;
  }
}
