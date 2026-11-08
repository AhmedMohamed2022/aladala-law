import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

import { SceneStateService } from '../../core/scene-state.service';
import { JusticeScale } from '../../three/justice-scale';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-three-scene',
  standalone: true,
  templateUrl: './three-scene.component.html',
  styleUrl: './three-scene.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  /** true when WebGL is unavailable, which shows the CSS/SVG fallback */
  readonly failed = signal(false);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private justiceScale?: JusticeScale;

  private keyLight?: THREE.DirectionalLight;
  private rimLight?: THREE.PointLight;
  private shadowPlane?: THREE.Mesh;
  private envTexture?: THREE.Texture;
  private pmrem?: THREE.PMREMGenerator;

  private tickFn?: (time: number, deltaTime: number) => void;
  private running = false;

  /** +1 (RTL) / -1 (LTR), eased so a language switch swings the light instead of popping it. */
  private lightSide = 1;

  constructor(
    private zone: NgZone,
    private state: SceneStateService,
    private i18n: LanguageService,
  ) {
    this.lightSide = this.i18n.isRtl() ? 1 : -1;
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.init());
  }

  // ------------------------------------------------------------------
  private init(): void {
    const canvas = this.canvasRef.nativeElement;

    if (!this.webglAvailable()) {
      this.failed.set(true);
      return;
    }

    // ---------- Renderer ----------
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true, // transparent, so the page background shows through
        powerPreference: 'high-performance',
      });
    } catch {
      this.failed.set(true);
      return;
    }

    const renderer = this.renderer;
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ---------- Scene + camera ----------
    this.scene = new THREE.Scene();
    const rig = this.state.rig;

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camera.position.set(0, rig.camY, rig.camZ);

    // ---------- Environment (reflections for the metal) ----------
    this.pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new RoomEnvironment();
    this.envTexture = this.pmrem.fromScene(envScene, 0.04).texture;
    (envScene as unknown as { dispose?: () => void }).dispose?.();
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 1.2; // three r163+

    // ---------- Lights ----------
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    this.keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 6;
    this.keyLight.shadow.camera.bottom = -6;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.radius = 4;
    this.scene.add(this.keyLight, this.keyLight.target);

    // Warm rim light from behind, which gives the gold its edge glow
    this.rimLight = new THREE.PointLight(0xd9b665, 40, 25, 2);
    this.scene.add(this.rimLight);

    // ---------- The scale ----------
    this.justiceScale = new JusticeScale({
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches,
    });
    this.scene.add(this.justiceScale.group);

    // ---------- Shadow catcher (invisible plane that only shows shadows) ----------
    this.shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.ShadowMaterial({ opacity: 0.38 }),
    );
    this.shadowPlane.rotation.x = -Math.PI / 2;
    this.shadowPlane.receiveShadow = true;
    this.scene.add(this.shadowPlane);

    // ---------- Events ----------
    this.state.startPointerTracking();
    window.addEventListener('resize', this.onResize, { passive: true });
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.onResize();

    // ---------- Render loop (shares GSAP's single rAF clock) ----------
    this.tickFn = (time: number, deltaTime: number) =>
      this.frame(time, deltaTime);
    gsap.ticker.add(this.tickFn);
    this.running = true;
  }

  // ------------------------------------------------------------------
  private frame(time: number, deltaMs: number): void {
    if (!this.renderer || !this.scene || !this.camera || !this.justiceScale)
      return;
    // Contact section fully covers the canvas, so skip drawing
    if (this.state.rig.glow < 0.001) return;

    const delta = Math.min(deltaMs / 1000, 0.05); // clamp after tab switches
    const rig = this.state.rig;

    this.justiceScale.update(delta, time, this.state.mouse, rig);

    // Camera follows the rig (animated by ScrollTrigger in Step 11)
    this.camera.position.set(0, rig.camY, rig.camZ);
    this.camera.lookAt(rig.camLookX, 0, 0);

    // Shadow plane and key light follow the scale so shadows stay in frame
    const g = this.justiceScale.group.position;
    const floorY = rig.posY - 2.26 * rig.scale; // bottom of the plinth
    this.shadowPlane!.position.set(g.x, floorY, g.z);

    const sideTarget = this.i18n.isRtl() ? 1 : -1;
    this.lightSide +=
      (sideTarget - this.lightSide) * (1 - Math.exp(-delta * 6));
    const side = this.lightSide;
    this.keyLight!.position.set(g.x + 4 * side, rig.posY + 8, g.z + 5);
    this.keyLight!.target.position.set(g.x, rig.posY, g.z);
    this.keyLight!.intensity = 2.2 * (0.6 + 0.4 * rig.glow);

    this.rimLight!.position.set(g.x - 3 * side, rig.posY + 3, g.z - 4);
    this.rimLight!.intensity = 40 * rig.glow;

    this.renderer.render(this.scene, this.camera);
  }

  // ------------------------------------------------------------------
  private onResize = (): void => {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxDpr = w < 900 ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    this.renderer.setSize(w, h, false); // false = CSS controls the canvas size
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault(); // allows the browser to restore the context
    this.pauseLoop();
  };

  private onContextRestored = (): void => {
    this.resumeLoop();
  };

  private pauseLoop(): void {
    if (this.tickFn && this.running) {
      gsap.ticker.remove(this.tickFn);
      this.running = false;
    }
  }

  private resumeLoop(): void {
    if (this.tickFn && !this.running) {
      gsap.ticker.add(this.tickFn);
      this.running = true;
    }
  }

  private webglAvailable(): boolean {
    try {
      const test = document.createElement('canvas');
      return !!(test.getContext('webgl2') || test.getContext('webgl'));
    } catch {
      return false;
    }
  }

  // ------------------------------------------------------------------
  // Cleanup: loop, listeners, GPU resources
  // ------------------------------------------------------------------
  ngOnDestroy(): void {
    this.pauseLoop();

    window.removeEventListener('resize', this.onResize);
    const canvas = this.canvasRef?.nativeElement;
    canvas?.removeEventListener('webglcontextlost', this.onContextLost);
    canvas?.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.state.stopPointerTracking();

    this.justiceScale?.dispose();

    if (this.shadowPlane) {
      this.shadowPlane.geometry.dispose();
      (this.shadowPlane.material as THREE.Material).dispose();
    }

    this.keyLight?.shadow.map?.dispose();
    this.envTexture?.dispose();
    this.pmrem?.dispose();

    this.scene?.clear();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
