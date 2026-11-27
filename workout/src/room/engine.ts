// The room: ONE persistent WebGL canvas behind the UI (DESIGN.md §7). Lazy-loaded after first paint.
// - a sphere showing the current zone's 360° panorama, cross-dissolving between zones;
//   the warm grade, scrim and vignette are in the shader so 3D props drawn after it stay bright;
// - slow yaw drift, drag look-around, gyro parallax; dust motes in the lamp light; rare lamp flicker;
// - "prop views": small scenes (rusted plate, dumbbell, kettlebell) drawn into DOM boxes via scissor,
//   lit by the Poly Haven HDRI.
// Renders at 30 fps while drifting, once when still (set running, battery saver, reduced motion).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { type PropKind, type PropView, onRoom, propViews, roomState } from './state';
import { ZONE_FILES, type ZoneId } from './zones.gen';
import { onGyro } from './gyro';

export interface EngineOpts { canvas: HTMLCanvasElement; phone: boolean; still: () => boolean; clean: () => boolean; onReady?: () => void }

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D map; uniform float opacity; uniform float lamp; uniform vec2 res; uniform float clean;
void main(){
  vec3 c = texture2D(map, vUv).rgb;
  // 1974 grade: warm, slightly faded, lifted blacks
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 0.82);
  c *= vec3(1.08, 0.97, 0.84);
  c = c * 0.86 + 0.025;
  // screen-space scrim: the room reads as space and light behind content (top brighter)
  vec2 s = gl_FragCoord.xy / res;
  float down = 1.0 - s.y;
  float scrim = mix(1.0, 0.16, smoothstep(0.12, 0.8, down));
  float vig = 1.0 - 0.55 * pow(length((s - vec2(0.5, 0.62)) * vec2(1.1, 1.0)), 2.2);
  c *= scrim * vig * mix(lamp, 1.0, clean);
  gl_FragColor = vec4(c, opacity);
}`;

export class Room {
  private r: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam = new THREE.PerspectiveCamera(72, 1, 0.1, 100);
  private spheres: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>[] = [];
  private front = 0;
  private fade = 1;
  private zone: ZoneId | null = null;
  private tex = new Map<string, Promise<THREE.Texture>>();
  private yaw = 0; private pitch = 0; private targetYaw = 0;
  private dragYaw = 0; private gyro = { y: 0, p: 0 };
  private drift = 0;
  private lamp = 1; private flickerAt = 0;
  private dust: THREE.Points;
  private last = 0; private raf = 0; private dirty = true;
  private env: THREE.Texture | null = null;
  private props = new Map<PropKind, Promise<THREE.Object3D>>();
  private propScene = new THREE.Scene();
  private propCam = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
  private keyLight = new THREE.SpotLight(0xffc27a, 0, 8, 0.5, 0.6, 1.2);
  private off: (() => void)[] = [];
  private panel: { scene: THREE.Scene; cam: THREE.OrthographicCamera; mat: THREE.MeshBasicMaterial } | null = null;

  /** A textured wall panel (the steel mesh) drawn behind a section's props. */
  private panelFor() {
    if (this.panel) return this.panel;
    const t = new THREE.TextureLoader().load('assets/ph/rusty_metal_grid_diffuse_1k.webp', () => this.poke());
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.36, 0.3, 0.24), toneMapped: false });
    const scene = new THREE.Scene(); scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.panel = { scene, cam, mat };
    return this.panel;
  }

  constructor(private o: EngineOpts) {
    this.r = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
    this.r.setPixelRatio(Math.min(devicePixelRatio, o.phone ? 1.5 : 1.75));
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.ACESFilmicToneMapping;
    this.r.autoClear = false;
    this.r.setClearColor(0x0d0b09, 1);
    for (let i = 0; i < 2; i++) {
      const g = new THREE.SphereGeometry(10, 64, 32);
      g.scale(-1, 1, 1);
      const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
        uniforms: { map: { value: null }, opacity: { value: 0 }, lamp: { value: 1 }, res: { value: new THREE.Vector2(1, 1) }, clean: { value: 0 } } });
      m.toneMapped = false;
      const s = new THREE.Mesh(g, m);
      s.renderOrder = i;
      this.spheres.push(s);
      this.scene.add(s);
    }
    this.dust = this.makeDust();
    this.scene.add(this.dust);
    this.propCam.position.set(0, 0, 3.2);
    this.propScene.add(new THREE.AmbientLight(0xffe2c0, 0.15));
    this.keyLight.position.set(1.2, 2.2, 2.4);
    this.propScene.add(this.keyLight, this.keyLight.target);
    this.resize();
    const ro = () => { this.resize(); this.poke(); };
    addEventListener('resize', ro);
    this.off.push(() => removeEventListener('resize', ro));
    this.off.push(onRoom(() => { void this.sync(); this.poke(); }));
    this.off.push(onGyro((y, p) => { this.gyro = { y: Math.max(-6, Math.min(6, y * 0.25)), p: Math.max(-3, Math.min(3, p * 0.15)) }; this.poke(); }));
    this.bindDrag();
    const vis = () => { if (!document.hidden) { this.last = 0; this.poke(); } };
    document.addEventListener('visibilitychange', vis);
    this.off.push(() => document.removeEventListener('visibilitychange', vis));
    this.sync();
    this.loop(performance.now());
    void this.loadEnv();
  }

  private makeDust() {
    const n = this.o.phone ? 46 : 80;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 3; pos[i * 3 + 1] = Math.random() * 2.2 - 0.6; pos[i * 3 + 2] = -1.5 - Math.random() * 2.5; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d')!; const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,225,170,0.9)'); gr.addColorStop(1, 'rgba(255,225,170,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    const m = new THREE.PointsMaterial({ size: 0.022, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, toneMapped: false });
    const p = new THREE.Points(g, m);
    p.renderOrder = 5;
    return p;
  }

  private resize() {
    const w = innerWidth, h = innerHeight;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    // portrait phones: a taller vertical FOV keeps enough of the room in view
    this.cam.fov = w < h ? 78 : 62;
    this.cam.updateProjectionMatrix();
    const pr = this.r.getPixelRatio();
    this.spheres.forEach((s) => s.material.uniforms.res.value.set(w * pr, h * pr));
  }

  private loadTex(z: ZoneId): Promise<THREE.Texture> {
    const url = this.o.phone ? ZONE_FILES[z].phone : ZONE_FILES[z].desktop;
    let p = this.tex.get(url);
    if (!p) {
      p = new THREE.TextureLoader().loadAsync(url).then((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; // a background: no mips, a third less memory
        t.anisotropy = 1;
        return t;
      });
      this.tex.set(url, p);
    }
    return p;
  }

  private async sync() {
    const st = roomState();
    const z = st.override?.zone ?? st.zone;
    this.targetYaw = (st.override?.yaw ?? st.yaw) || 0;
    this.o.canvas.style.opacity = z ? '1' : '0';
    if (!z || z === this.zone) return;
    this.zone = z;
    const t = await this.loadTex(z);
    if (this.zone !== z) return;
    // cross-dissolve: the back sphere takes the new zone and fades over the front one
    const back = 1 - this.front;
    this.spheres[back].material.uniforms.map.value = t;
    this.spheres[back].material.uniforms.opacity.value = 0;
    this.spheres[back].renderOrder = 2; this.spheres[this.front].renderOrder = 1;
    this.front = back;
    this.fade = 0;
    this.pitch = z === 'ceiling' ? 58 : z === 'lane' ? -8 : -3;
    this.poke();
    this.o.onReady?.();
  }

  private bindDrag() {
    let sx = 0, sy = 0, base = 0, active = false, decided = false;
    const down = (e: PointerEvent) => {
      if (!roomState().drag || e.pointerType === 'mouse' && e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('button, a, input, select, textarea, label, video, [role=slider], [data-nodrag], .overflow-x-auto, [role=dialog]')) return;
      sx = e.clientX; sy = e.clientY; base = this.dragYaw; active = true; decided = false;
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!decided) { if (Math.abs(dx) + Math.abs(dy) < 10) return; decided = true; if (Math.abs(dy) > Math.abs(dx)) { active = false; return; } }
      this.dragYaw = base - dx * 0.12;
      this.poke();
    };
    const up = () => { active = false; };
    addEventListener('pointerdown', down, { passive: true });
    addEventListener('pointermove', move, { passive: true });
    addEventListener('pointerup', up, { passive: true });
    addEventListener('pointercancel', up, { passive: true });
    this.off.push(() => { removeEventListener('pointerdown', down); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); });
  }

  private async loadEnv() {
    try {
      const hdr = await new HDRLoader().loadAsync('assets/ph/industrial_pipe_and_valve_01_1k.hdr');
      const pm = new THREE.PMREMGenerator(this.r);
      this.env = pm.fromEquirectangular(hdr).texture;
      hdr.dispose(); pm.dispose();
      this.propScene.environment = this.env;
      this.poke();
    } catch { /* props fall back to the lights */ }
  }

  private prop(kind: PropKind): Promise<THREE.Object3D> {
    let p = this.props.get(kind);
    if (!p) {
      const l = new GLTFLoader();
      l.setMeshoptDecoder(MeshoptDecoder);
      p = l.loadAsync(`assets/props/prop-${kind}.glb`).then((g) => {
        const o = g.scene;
        const box = new THREE.Box3().setFromObject(o);
        const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        o.position.sub(c);
        const wrap = new THREE.Group();
        wrap.add(o);
        wrap.scale.setScalar(1.6 / Math.max(size.x, size.y, size.z));
        return wrap;
      });
      this.props.set(kind, p);
    }
    return p;
  }
  private loaded = new Map<PropKind, THREE.Object3D>();

  private loop = (now: number) => {
    cancelAnimationFrame(this.raf);
    if (document.hidden) return;
    const st = roomState();
    const still = this.o.still() || st.still;
    const views = [...propViews().values()];
    const animating = !still || this.fade < 1 || views.length > 0;
    // 30 fps cap: the room moves slowly, so this is smooth and saves half the battery
    if (now - this.last >= 33 || this.dirty) {
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
      this.last = now;
      this.step(dt, still);
      this.draw(views, now / 1000, still);
      this.dirty = false;
    }
    if (animating) this.raf = requestAnimationFrame(this.loop);
    else this.raf = 0;
  };

  /** Wake the loop (after a still frame) */
  poke() { this.dirty = true; if (!this.raf) this.raf = requestAnimationFrame(this.loop); }

  private step(dt: number, still: boolean) {
    if (this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt / (still ? 0.15 : 0.45));
      this.spheres[this.front].material.uniforms.opacity.value = this.fade;
      this.spheres[1 - this.front].material.uniforms.opacity.value = this.fade < 1 ? 1 : 0;
    }
    if (!still) this.drift += dt * 0.6;
    this.yaw += (this.targetYaw - this.yaw) * Math.min(1, dt * 3);
    // lamp flicker: two or three brief dips a minute, never in Clean mode
    if (!still && !this.o.clean()) {
      const t = performance.now();
      if (t > this.flickerAt) { this.flickerAt = t + 15000 + Math.random() * 20000; this.lamp = 0.82; }
      this.lamp += (1 - this.lamp) * Math.min(1, dt * 7);
    } else this.lamp = 1;
    if (!still) {
      const a = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) + dt * 0.018; if (y > 1.6) y = -0.6;
        a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(performance.now() / 4000 + i) * dt * 0.01);
      }
      a.needsUpdate = true;
    }
    this.dust.visible = !this.o.clean() && !still;
    document.documentElement.style.setProperty('--lamp', this.lamp.toFixed(3));
  }

  private draw(views: PropView[], t: number, still: boolean) {
    const r = this.r;
    const w = innerWidth, h = innerHeight;
    const yaw = THREE.MathUtils.degToRad(this.yaw + this.drift + this.dragYaw + this.gyro.y);
    const pitch = THREE.MathUtils.degToRad(this.pitch + this.gyro.p);
    this.cam.rotation.set(0, 0, 0);
    this.cam.rotation.order = 'YXZ';
    this.cam.rotation.y = -yaw; this.cam.rotation.x = pitch;
    this.spheres.forEach((s) => { s.material.uniforms.lamp.value = this.lamp; s.material.uniforms.clean.value = this.o.clean() ? 1 : 0; });
    r.setScissorTest(false);
    r.setViewport(0, 0, w, h);
    r.clear();
    r.render(this.scene, this.cam);
    // wall panels first, then the props hung on them
    views.sort((a, b) => (a.kind === 'meshwall' ? -1 : 0) - (b.kind === 'meshwall' ? -1 : 0));
    for (const v of views) {
      if (v.kind === 'meshwall') {
        const rect = v.el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > h) continue;
        const p = this.panelFor();
        p.mat.map!.repeat.set(rect.width / 220, rect.height / 220);
        const y = h - rect.bottom;
        r.setViewport(rect.left, y, rect.width, rect.height); r.setScissor(rect.left, y, rect.width, rect.height); r.setScissorTest(true);
        if (this.o.clean()) p.mat.color.setRGB(0.14, 0.13, 0.12); else p.mat.color.setRGB(0.36, 0.3, 0.24);
        r.render(p.scene, p.cam);
      }
    }
    // prop views
    for (const v of views) {
      if (v.kind === 'meshwall') continue;
      const rect = v.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > h || rect.width < 4) continue;
      let obj = this.loaded.get(v.kind);
      if (!obj) { void this.prop(v.kind).then((o) => { this.loaded.set(v.kind, o.clone()); this.poke(); }); continue; }
      const y = h - rect.bottom;
      r.setViewport(rect.left, y, rect.width, rect.height);
      r.setScissor(rect.left, y, rect.width, rect.height);
      r.setScissorTest(true);
      r.clearDepth();
      this.propCam.aspect = rect.width / rect.height;
      this.propCam.updateProjectionMatrix();
      this.propScene.add(obj);
      obj.rotation.set(v.kind === 'plate' ? 0.15 : 0.35, (still ? 0.6 : t * v.spin) + v.id, v.kind === 'dumbbell' ? 0.2 : 0);
      if (v.kind === 'dumbbell' && !still) obj.position.y = Math.sin(t * 1.3) * 0.06;
      this.keyLight.intensity = v.lit ? 26 : 2.5;
      this.keyLight.color.set(v.lit ? 0xffc27a : 0x9aa4b0);
      this.propScene.environmentIntensity = v.lit ? 0.9 : 0.18;
      r.render(this.propScene, this.propCam);
      this.propScene.remove(obj);
      obj = undefined;
    }
    r.setScissorTest(false);
  }

  dispose() { cancelAnimationFrame(this.raf); this.off.forEach((f) => f()); this.r.dispose(); }
}
