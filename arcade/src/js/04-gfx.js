// The WebGL layer: one renderer drawn at a low internal resolution and scaled up
// with nearest-neighbour filtering, which gives the chunky early-90s polygon look.
const GFX = {
  renderer: null,
  ok: false,
  w: window.innerWidth,
  h: window.innerHeight,
  init() {
    if (window.THREE) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: $("#gl"), antialias: false, powerPreference: "high-performance" });
        this.renderer.setClearColor(0x090320, 1);
        this.ok = true;
      } catch (e) {
        this.ok = false;
      }
    }
    if (!this.ok) document.body.classList.add("no-gl");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },
  pixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    const mode = Store.settings.pixel;
    if (mode === "sharp") return Math.min(dpr, 2);
    const target = mode === "chunky" ? 380 : 680; // pixels across the longest side
    return clamp(target / Math.max(this.w, this.h), 0.12, dpr);
  },
  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    if (this.ok) {
      this.renderer.setPixelRatio(this.pixelRatio());
      this.renderer.setSize(this.w, this.h, false);
    }
    Scenes.resize();
  },
};

const Scenes = {
  cur: null,
  set(s) {
    const old = this.cur;
    this.cur = s;
    if (old && old !== s) old.dispose();
    if (s) s.resize(GFX.w, GFX.h);
    return s;
  },
  resize() { if (this.cur) this.cur.resize(GFX.w, GFX.h); },
  frame(dt) {
    const s = this.cur;
    if (!s) return;
    s.update(dt);
    if (GFX.ok && s.scene && s.camera) GFX.renderer.render(s.scene, s.camera);
  },
};

// Base for every 3D scene. Works without WebGL too (update still runs, nothing draws).
class Scene3D {
  constructor({ fov = 60, near = 0.1, far = 500, bg = 0x090320, fog = null } = {}) {
    this.tw = new TweenSet();
    this.t = 0;
    this.shakeAmt = 0;
    this.band = null;
    this.has3D = !!window.THREE;
    if (!this.has3D) return;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bg);
    if (fog) this.scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
    this.camera = new THREE.PerspectiveCamera(fov, GFX.w / GFX.h, near, far);
    this.camBase = new THREE.Vector3();
    this.lookAt = new THREE.Vector3(0, 0, -10);
  }
  resize(w, h) {
    if (!this.camera) return;
    this.camera.aspect = w / h;
    if (this.band) {
      const yc = (this.band.top + this.band.bottom) / 2;
      this.camera.setViewOffset(w, h, 0, h / 2 - yc, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(w, h);
  }
  // Centre the 3D action in the strip of screen between the HUD panels.
  setBand(el) {
    if (!el) { this.band = null; return this.resize(GFX.w, GFX.h); }
    const r = el.getBoundingClientRect();
    this.band = { top: r.top, bottom: r.bottom, h: Math.max(1, r.height) };
    this.resize(GFX.w, GFX.h);
  }
  // World-space size of the visible band at a given distance from the camera.
  bandSize(dist) {
    const H = GFX.h, W = GFX.w;
    const worldH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const perPx = worldH / H;
    const bh = (this.band ? this.band.h : H) * perPx;
    return { w: W * perPx, h: bh };
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, REDUCED_MOTION ? a * 0.3 : a); }
  placeCamera() {
    if (!this.camera) return;
    this.camera.position.copy(this.camBase);
    if (this.shakeAmt > 0.001) {
      this.camera.position.x += rand(-1, 1) * this.shakeAmt;
      this.camera.position.y += rand(-1, 1) * this.shakeAmt;
    }
    this.camera.lookAt(this.lookAt);
  }
  update(dt) {
    this.t += dt;
    this.tw.update(dt);
    this.shakeAmt *= Math.pow(0.02, dt);
  }
  dispose() {
    this.tw.clear();
    if (this.scene) disposeTree(this.scene);
  }
}

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.map && m.map !== _glowTex) m.map.dispose();
        m.dispose();
      });
    }
  });
}

// ---- shared props --------------------------------------------------------------
function makeGrid({ size = 240, step = 5, color = 0xff3ad4, y = 0 } = {}) {
  const pts = [];
  const half = size / 2;
  for (let x = -half; x <= half + 0.001; x += step) pts.push(x, 0, -half, x, 0, half);
  for (let z = -half; z <= half + 0.001; z += step) pts.push(-half, 0, z, half, 0, z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color }));
  grid.position.y = y;
  grid.userData.step = step;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), new THREE.MeshBasicMaterial({ color: 0x0b0326 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y - 0.02;
  const grp = new THREE.Group();
  grp.add(floor, grid);
  grp.userData.grid = grid;
  return grp;
}
function scrollGrid(grp, dist) {
  const g = grp.userData.grid;
  g.position.z = dist % g.userData.step;
}

function sunTexture(top = "#ffe14f", mid = "#ff9b3d", bot = "#ff3ad4") {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, bot);
  x.fillStyle = g;
  x.beginPath();
  x.arc(128, 128, 124, 0, Math.PI * 2);
  x.fill();
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 8; i++) x.fillRect(0, 138 + i * 15, 256, 2 + i * 1.4);
  return new THREE.CanvasTexture(c);
}
function makeSun(radius = 40, colors = []) {
  const grp = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: sunTexture(...colors), transparent: true, fog: false, depthWrite: false })
  );
  const glow = glowSprite(colors[2] || "#ff3ad4", radius * 3.6, 0.55);
  grp.add(glow, sun);
  return grp;
}

let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}
function glowSprite(color, scale = 2, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  s.scale.set(scale, scale, 1);
  return s;
}

function makeStars(n = 500, r = 300, { color = 0xffffff, size = 1.6, lowest = -0.05 } = {}) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2;
    const y = rand(lowest, 1);
    const s = Math.sqrt(1 - y * y);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * y;
    pos[i * 3 + 2] = r * s * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, fog: false }));
}

function makeMountains({ width = 460, z = -190, color = 0xa65fff, fill = 0x10052c, height = 34, n = 46 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = -width / 2 + (width * i) / n;
    const edge = Math.abs(x) / (width / 2);
    const peak = i % 2 ? rand(0.55, 1) : rand(0.12, 0.45);
    pts.push([x, peak * height * (0.35 + 0.65 * edge)]);
  }
  const pos = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    pos.push(x0, 0, 0, x1, 0, 0, x1, y1, 0, x0, 0, 0, x1, y1, 0, x0, y0, 0);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const fillMesh = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: fill, fog: false, side: THREE.DoubleSide }));
  const lp = [];
  pts.forEach(([x, y]) => lp.push(x, y, 0.2));
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const ridge = new THREE.Line(lg, new THREE.LineBasicMaterial({ color, fog: false }));
  const wp = [];
  const dx = width / n;
  for (let i = 1; i < n; i++) {
    const [x, y] = pts[i];
    if (y > height * 0.3) wp.push(x, y, 0.1, x - dx * 0.8, y * 0.35, 0.1, x, y, 0.1, x + dx * 0.6, y * 0.25, 0.1);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3));
  const wire = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45, fog: false }));
  const grp = new THREE.Group();
  grp.add(fillMesh, wire, ridge);
  grp.position.z = z;
  return grp;
}

function textCanvas(text, { w = 256, h = 64, size = 26, color = "#ffffff", bg = null, glow = null, font = "Press Start 2P", align = "center", lh = 1.35 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.font = `${size}px "${font}", "Courier New", monospace`;
  x.textAlign = align;
  x.textBaseline = "middle";
  if (glow) { x.shadowColor = glow; x.shadowBlur = Math.max(4, size * 0.45); }
  x.fillStyle = color;
  const lines = String(text).split("\n");
  lines.forEach((ln, i) => x.fillText(ln, align === "center" ? w / 2 : 10, h / 2 + (i - (lines.length - 1) / 2) * size * lh));
  return c;
}
function textTexture(text, opts) {
  const t = new THREE.CanvasTexture(textCanvas(text, opts));
  t.magFilter = THREE.NearestFilter;
  return t;
}
function labelSprite(text, color, scale = 1.4) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: textTexture(text, { w: 64, h: 64, size: 34, glow: color }), transparent: true, depthTest: false, fog: false })
  );
  s.scale.set(scale, scale, 1);
  s.renderOrder = 10;
  return s;
}

// A low-poly solid with neon edges. Needs lights for the Phong fill.
function neonSolid(geo, color, { fill = 0x120733, glow = 0.18, edgeColor } = {}) {
  const grp = new THREE.Group();
  const c = new THREE.Color(color);
  const mat = new THREE.MeshPhongMaterial({ color: fill, emissive: c.clone().multiplyScalar(glow), flatShading: true, shininess: 50, specular: 0x666666 });
  const mesh = new THREE.Mesh(geo, mat);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: edgeColor || color }));
  grp.add(mesh, edges);
  grp.userData.mat = mat;
  grp.userData.edgeMat = edges.material;
  grp.userData.color = c;
  return grp;
}

function addLights(scene, { ambient = 0x6a5aa8, ai = 0.7, key = 0xffffff, ki = 0.9, dir = [3, 6, 4] } = {}) {
  scene.add(new THREE.AmbientLight(ambient, ai));
  const d = new THREE.DirectionalLight(key, ki);
  d.position.set(...dir);
  scene.add(d);
  return d;
}

function beamMesh(from, to, color, radius = 0.07) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 6, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// Particle bursts for explosions, coins and confetti.
class Bursts {
  constructor(scene) { this.scene = scene; this.list = []; }
  burst(pos, color, { n = 60, speed = 10, size = 0.3, life = 1.1, gravity = -5, spread = 1 } = {}) {
    if (!this.scene) return;
    const p = new Float32Array(n * 3), v = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z;
      const th = rand(Math.PI * 2), ph = Math.acos(rand(-1, 1)), s = rand(0.25, 1) * speed;
      v[i * 3] = Math.sin(ph) * Math.cos(th) * s * spread;
      v[i * 3 + 1] = Math.cos(ph) * s;
      v[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * s * spread;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.scene.add(pts);
    this.list.push({ pts, v, n, life, age: 0, gravity });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.age += dt;
      const a = b.pts.geometry.attributes.position.array;
      const drag = Math.pow(0.4, dt);
      for (let j = 0; j < b.n; j++) {
        a[j * 3] += b.v[j * 3] * dt;
        a[j * 3 + 1] += b.v[j * 3 + 1] * dt;
        a[j * 3 + 2] += b.v[j * 3 + 2] * dt;
        b.v[j * 3] *= drag;
        b.v[j * 3 + 2] *= drag;
        b.v[j * 3 + 1] = b.v[j * 3 + 1] * drag + b.gravity * dt;
      }
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.age / b.life);
      if (b.age >= b.life) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        this.list.splice(i, 1);
      }
    }
  }
}

function carpetTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#0d0626";
  x.fillRect(0, 0, 256, 256);
  const cols = ["#35efff", "#ff3ad4", "#ffe14f", "#86ff5e", "#a65fff"];
  x.lineWidth = 3;
  for (let i = 0; i < 60; i++) {
    const col = pick(cols);
    x.strokeStyle = col;
    x.fillStyle = col;
    const px = rand(16, 240), py = rand(16, 240);
    const k = randInt(0, 3);
    x.beginPath();
    if (k === 0) { x.arc(px, py, rand(3, 7), 0, Math.PI * 2); x.stroke(); }
    else if (k === 1) { x.moveTo(px, py); x.lineTo(px + rand(-12, 12), py + rand(8, 14)); x.lineTo(px + rand(-12, 12), py - rand(4, 10)); x.closePath(); x.stroke(); }
    else if (k === 2) { x.moveTo(px - 12, py); x.lineTo(px - 6, py - 6); x.lineTo(px, py); x.lineTo(px + 6, py - 6); x.lineTo(px + 12, py); x.stroke(); }
    else x.fillRect(px, py, 4, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}
