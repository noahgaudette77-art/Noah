// MEMORY BANK — spaced-repetition flashcards. Flip, grade yourself, and every
// card you know is deposited into the vault. Missed cards come back this session.
const DECK_SIZE = 20;

// ---- the vault ---------------------------------------------------------------------
// The floor is y = 0. A round gold vault door stands on it facing the camera, centred
// at (0, MEMORY_DOOR_Y, 0): a combination-dial ring that frames the flashcard, a coin
// slot at twelve o'clock, chrome bolts across a glowing seam, a steel frame and a wall
// of safe-deposit boxes. The camera dollies so the dial ring sits just outside the card.
const MEMORY_DOOR_Y = 8.7;
const MEMORY_BOLTS = 12;
const MEMORY_DIAL_R = 5.5; // inner edge of the dial ring: the card sits inside it
const MEMORY_SLOT_R = 7.2; // the coin slot, at twelve o'clock

// makeEnvMap, but keeping the PMREM render target: disposing only its texture frees
// nothing in r128, so dispose() releases the whole target.
function memoryEnvMap({ top, horizon, bottom, glow, panels }) {
  if (!GFX.ok) return null;
  const sc = new THREE.Scene();
  sc.add(makeSky({ top, mid: top, horizon, bottom, stars: 0, glow, radius: 60 }));
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ color: neon(p.color, p.k), side: THREE.DoubleSide }));
    m.position.set(p.pos[0], p.pos[1], p.pos[2]);
    m.lookAt(0, 0, 0);
    sc.add(m);
  }
  const rt = GFX.pmrem().fromScene(sc, 0.02, 0.1, 100);
  disposeTree(sc);
  return rt;
}

// A lathe turned about z so it faces the camera. Points are [radius, z] with z toward
// the camera, listed outside-in across the front (that winding faces +z). Corners are
// doubled so steps stay crisp under smooth shading; a third value `true` keeps a point smooth.
function memoryLathe(pts, segs = 96) {
  const v = [];
  pts.forEach(([r, z, smooth], i) => {
    v.push(new THREE.Vector2(r, z));
    if (!smooth && i > 0 && i < pts.length - 1) v.push(new THREE.Vector2(r, z));
  });
  return new THREE.LatheGeometry(v, segs).rotateX(Math.PI / 2);
}

// Graduations for the dial ring, laid out as a strip: x runs round the ring, the top
// row is the outer edge. White marks drive the emissive map, so they glow gold.
function memoryDialTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#000";
  x.fillRect(0, 0, 2048, 128);
  x.fillStyle = "#fff";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = 'bold 30px "Press Start 2P", "Courier New", monospace';
  for (let i = 0; i < 100; i++) {
    const px = (i + 0.5) * 20.48;
    const major = i % 10 === 0, mid = i % 5 === 0;
    const w = major ? 6 : mid ? 4 : 3;
    x.fillRect(px - w / 2, 8, w, major ? 50 : mid ? 38 : 24);
    if (major) x.fillText(String(i), px, 88);
  }
  x.fillRect(0, 0, 2048, 3);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = GFX.ok ? Math.min(8, GFX.renderer.capabilities.getMaxAnisotropy()) : 1;
  return t;
}

// A struck emblem for the coin faces (a bump map): a beaded ring and a star.
function memoryCoinTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#000";
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = "#fff";
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    x.beginPath();
    x.arc(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46, 3.2, 0, Math.PI * 2);
    x.fill();
  }
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 14 : 32;
    x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
  }
  x.closePath();
  x.fill();
  return new THREE.CanvasTexture(c);
}

// The wall around the vault: rows of safe-deposit boxes in dark steel, each with a
// brass plate and keyhole. Plates light up gold as the deck is banked (uLit), and the
// glow from the vault's seam spills across the nearest doors.
function memoryWallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), {
      uTime: { value: 0 }, uLit: { value: 0 }, uGlow: { value: 0.3 },
      uDoor: { value: new THREE.Vector3(0, MEMORY_DOOR_Y, 12.1) },
      uGold: { value: neon(0xffb444, 1.35) }, uLed: { value: neon(0x3dff8e, 1.8) },
    }),
    extensions: { derivatives: true },
    vertexShader: `varying vec3 vWorld; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_NOISE} ${GLSL_FOG_PARS}
      uniform float uTime; uniform float uLit; uniform float uGlow; uniform vec3 uDoor; uniform vec3 uGold; uniform vec3 uLed;
      varying vec3 vWorld; varying float vDepth;
      void main(){
        vec2 cs = vec2(2.1, 1.3);
        vec2 q = vWorld.xy / cs;
        vec2 id = floor(q); vec2 f = fract(q);
        vec2 aa = fwidth(q) * cs;
        float px = max(max(aa.x, aa.y), 1e-4);
        vec2 d = min(f, 1.0 - f) * cs;
        float seam = smoothstep(0.03, 0.03 + px * 1.5, min(d.x, d.y));
        float h = hash13(vec3(id, 3.0));
        vec3 col = vec3(0.05, 0.062, 0.057) * (0.75 + 0.5 * h);
        float top = 1.0 - smoothstep(0.0, 0.1 + px, (1.0 - f.y) * cs.y - 0.03);
        float bot = 1.0 - smoothstep(0.0, 0.1 + px, f.y * cs.y - 0.03);
        col += vec3(0.07, 0.085, 0.075) * top;
        col *= 1.0 - 0.55 * bot;
        vec2 c = (f - vec2(0.5, 0.58)) * cs;
        float plate = 1.0 - smoothstep(-px, px, max(abs(c.x) - 0.27, abs(c.y) - 0.1));
        float key = 1.0 - smoothstep(-px, px, length((f - vec2(0.5, 0.3)) * cs) - 0.055);
        col = mix(col, vec3(0.15, 0.105, 0.04), plate);
        col *= 1.0 - 0.85 * key;
        col *= seam * 0.85 + 0.15;
        float r = length(vWorld.xy - uDoor.xy);
        float spill = exp(-max(r - uDoor.z, 0.0) * 0.2);
        col *= 0.5 + 2.2 * spill * uGlow + 0.3 * smoothstep(36.0, 12.0, vWorld.y);
        float lit = step(h, uLit);
        col += uGold * plate * seam * lit * (0.8 + 0.2 * sin(uTime * 1.7 + h * 40.0));
        float ledOn = step(0.94, hash13(vec3(id, 11.0))) * step(0.45, fract(uTime * 0.21 + h * 7.0));
        float led = 1.0 - smoothstep(0.0, px * 1.5, length((f - vec2(0.88, 0.8)) * cs) - 0.035);
        col += uLed * led * ledOn;
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// Light leaking from the seam: soft rays fanning out over the frame and the wall. The
// rays only vary round the ring, so the noise runs per vertex (cheap on phones).
function memoryShaftMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: neon(0xffcf7a, 1) }, uI: { value: 0.1 }, uTime: { value: 0 }, uR: { value: 8.7 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${GLSL_NOISE}
      uniform float uTime; varying vec2 vP; varying float vRay;
      void main(){
        vP = position.xy;
        vec2 d = normalize(position.xy);
        float n = vnoise(vec3(d * 6.0, uTime * 0.1)) * 0.6 + vnoise(vec3(d * 17.0, uTime * 0.17 + 4.0)) * 0.4;
        vRay = pow(n, 2.6) * 2.4;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; uniform float uR; varying vec2 vP; varying float vRay;
      void main(){
        float r = length(vP);
        float fall = exp(-(r - uR) * 0.38) * smoothstep(uR - 0.3, uR + 0.5, r);
        gl_FragColor = vec4(uColor * (uI * vRay * fall), 1.0);
      }`,
  });
}

// Merge geometries (position + normal) into one, for a single draw call.
const memoryMerge = (geos) => mergeIndexed(geos);

// The handle at the heart of the door: a domed hub and four spokes with ball grips.
function memoryWheelGeometry() {
  const parts = [memoryLathe([[1.35, 0.6], [1.35, 0.85], [1.2, 1.05, true], [0.85, 1.22, true], [0.4, 1.3, true], [0, 1.32]], 40)];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    const spoke = new THREE.CylinderGeometry(0.17, 0.2, 3.1, 12).rotateZ(a - Math.PI / 2).translate(c * 2.75, s * 2.75, 0.95);
    const grip = new THREE.SphereGeometry(0.38, 16, 12).translate(c * 4.35, s * 4.35, 0.95);
    parts.push(spoke, grip);
  }
  return memoryMerge(parts);
}

// A gold ingot: a box with its top drawn in, flat-shaded.
function memoryIngotGeometry() {
  const g = new THREE.BoxGeometry(1.5, 0.42, 0.72).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > 0) { p.setX(i, p.getX(i) * 0.84); p.setZ(i, p.getZ(i) * 0.7); }
  }
  g.translate(0, 0.21, 0);
  g.computeVertexNormals();
  return g;
}

// Pooled sparkles: four-point stars that fly, fall and fade (coin trails, the burst at
// the slot, glints on the gold). One draw call; nothing is created per frame.
class MemorySparks {
  constructor(n = 260) {
    this.n = n;
    this.next = 0;
    this.p = new Float32Array(n * 3);
    this.v = new Float32Array(n * 3);
    this.c = new Float32Array(n * 3);
    this.b = new Float32Array(n * 3);
    this.s = new Float32Array(n);
    this.s0 = new Float32Array(n);
    this.age = new Float32Array(n);
    this.life = new Float32Array(n);
    this.g = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    const attr = (a, k) => new THREE.BufferAttribute(a, k).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", attr(this.p, 3));
    geo.setAttribute("aColor", attr(this.c, 3));
    geo.setAttribute("aSize", attr(this.s, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aColor; attribute float aSize; uniform float uScale; varying vec3 vC;
        void main(){ vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(aSize * uScale / max(-mv.z, 0.1), 256.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC;
        void main(){
          vec2 p = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot(p, p);
          float star = exp(-abs(p.x) * 14.0) * exp(-abs(p.y) * 2.6) + exp(-abs(p.y) * 14.0) * exp(-abs(p.x) * 2.6);
          float a = (exp(-r2 * 9.0) + star * 0.6) * (1.0 - smoothstep(0.6, 1.0, r2));
          gl_FragColor = vec4(vC * a, 1.0);
        }`,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    this.points.layers.set(1);
  }
  emit(x, y, z, vx, vy, vz, life, size, color, gravity = 0) {
    const i = this.next;
    this.next = (i + 1) % this.n;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.b[i * 3] = color.r; this.b[i * 3 + 1] = color.g; this.b[i * 3 + 2] = color.b;
    this.age[i] = 0;
    this.life[i] = life;
    this.s0[i] = size;
    this.g[i] = gravity;
  }
  update(dt, camera) {
    const h = GFX.h * (GFX.ok ? GFX.scenePR() : 1);
    this.mat.uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const drag = Math.pow(0.3, dt);
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.age[i] += dt;
      const k = this.age[i] / this.life[i];
      const j = i * 3;
      if (k >= 1) {
        this.life[i] = 0;
        this.s[i] = 0;
        this.c[j] = this.c[j + 1] = this.c[j + 2] = 0;
        continue;
      }
      this.v[j] *= drag; this.v[j + 2] *= drag;
      this.v[j + 1] = this.v[j + 1] * drag + this.g[i] * dt;
      this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
      const fade = Math.min(1, k * 8) * Math.pow(1 - k, 1.3);
      this.s[i] = this.s0[i] * (0.55 + 0.45 * fade);
      this.c[j] = this.b[j] * fade; this.c[j + 1] = this.b[j + 1] * fade; this.c[j + 2] = this.b[j + 2] * fade;
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = true;
    a.aColor.needsUpdate = true;
    a.aSize.needsUpdate = true;
  }
}

class MemoryGame extends QuizGame {
  constructor(sel) {
    super(sel, "memory", { fov: 60, fog: [0x020a07, 30, 95], bg: 0x020a07 });
    const ids = selectionFids(sel);
    const now = nowMin();
    this.queue = ids
      .map((id) => ({ id, p: Store.priority(id, now, null) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, DECK_SIZE)
      .map((r) => r.id);
    this.total = this.queue.length;
    this.done = 0;
    this.deposits = 0;
    this.again = {};
    this.missed = [];
    this.reverse = false;
    this.flipped = false;
    this.coins = [];
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="score"><small>${esc(sel.label)}</small><span data-pos>CARD 1/${this.total}</span></div>
        <div class="grow"></div>
        <span class="tag" style="--c:${COLORS.gold}" data-dep>BANKED 0</span>
        <button class="iconbtn" data-act="reverse" aria-pressed="false" title="Swap sides: show the definition first">SWAP</button>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <span class="meter slide" style="--c:${COLORS.lime}"><i data-prog></i></span>
      <div class="card-stage"><div class="card3d" data-card data-act="flip" role="button" tabindex="0" aria-label="Flip card"></div><div class="stamp" data-stamp hidden></div></div>
      <div class="grade" data-grade></div>
    </section>`);
    this.bindSwipe();
  }
  build3D() {
    const s = this.scene;
    const Y = MEMORY_DOOR_Y;
    this.envRT = memoryEnvMap({
      top: 0x030a07, horizon: 0x5a3a10, bottom: 0x010302, glow: 0.55,
      panels: [
        { color: 0xfff0d0, k: 1.7, w: 44, h: 1.8, pos: [0, 6, 29] }, // a light strip behind the camera: a bright arc on the gold
        { color: 0xffc46a, k: 0.35, w: 30, h: 3, pos: [0, -6, 29] }, // warm bounce off the floor
        { color: 0x22d47c, k: 1.3, w: 5, h: 30, pos: [-30, 6, 12] },
        { color: 0x22d47c, k: 1.3, w: 5, h: 30, pos: [30, 6, 12] },
        { color: 0xfff6e2, k: 4, w: 4, h: 2.5, pos: [-15, 24, 6] },
        { color: 0xfff6e2, k: 4, w: 4, h: 2.5, pos: [17, 21, 10] },
      ],
    });
    const env = this.envRT ? this.envRT.texture : null;
    // (every metal in the vault has a grain, hair scratches and smudges: reflections break up over them)
    const gold = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0xe2a030, metalness: 0.84, roughness: 0.24, envMap: env, envMapIntensity: 1.0 }), { scale: 1.5, height: 0.0014, scratch: 1.3 }); // (a little short of pure metal, so the lamps shade each face of a bar differently and it reads as a solid)
    const steel = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0x3b4549, metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.15 }), { scale: 1.2, height: 0.002, scratch: 1.5, smudge: 0.5 });
    const chrome = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0xdfe5ea, metalness: 1, roughness: 0.12, envMap: env, envMapIntensity: 1.6 }), { scale: 2, height: 0.0006, grain: 0.5, scratch: 1.6, smudge: 0.5 });

    s.add(new THREE.AmbientLight(0x1d3a2c, 0.6));
    const key = new THREE.DirectionalLight(0xfff0d8, 0.4);
    key.position.set(-10, 22, 9); // steep, so flat faces never flare straight back at the camera
    s.add(key);
    // two cool lights from behind and to the sides: every bar, coin and gear tooth gets an edge of mint against the gold
    [[-13, 7, -0.6], [13, 5, -0.6]].forEach(([x, y, z]) => { const rim = new THREE.DirectionalLight(0x7affd0, 0.55); rim.position.set(x, y, z); s.add(rim); });
    this.vaultLight = new THREE.PointLight(0xffc46a, 0.35, 22, 1.5); // warm light from the seam
    this.vaultLight.position.set(0, Y + 3, 7);
    s.add(this.vaultLight);

    // the wall of deposit boxes and the vault's glow on it (layer 1: the floor only
    // reflects the vault itself, which keeps the mirror pass cheap)
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(110, 50), memoryWallMaterial());
    this.wall.position.set(0, 25, -1.25);
    this.wall.layers.set(1);
    s.add(this.wall);
    this.halo = glowSprite(neon(0xffb84d, 1), 36, 0.2);
    this.halo.position.set(0, Y, -1.05);
    this.halo.layers.set(1);
    s.add(this.halo);

    const door = new THREE.Group();
    door.position.set(0, Y, 0);
    s.add(door);
    this.door = door;
    // steel frame, gold door (rim, a recessed track for the bolts, a raised centre)
    door.add(new THREE.Mesh(memoryLathe([[12.1, -1.25], [11.35, 0.3], [9.6, 0.3], [9.6, 0.6], [9.02, 0.6], [8.94, 0.52], [8.94, -1.25]]), steel));
    door.add(new THREE.Mesh(memoryLathe([[8.5, -1.1], [8.5, 0.44], [8.4, 0.56], [8.02, 0.56], [7.95, 0.49], [7.95, 0.3], [5.32, 0.3], [5.32, 0.42], [5.2, 0.52], [2.2, 0.52], [2.2, 0.66], [0, 0.66]]), gold));
    // the seam between door and frame, lit from inside the vault
    this.seamMat = new THREE.MeshBasicMaterial({ color: neon(0xffd38a, 1.5) });
    this.seamBase = new THREE.Color(0xffd38a);
    const seam = new THREE.Mesh(new THREE.RingGeometry(8.36, 9.1, 128), this.seamMat);
    seam.position.z = -0.35;
    door.add(seam);
    // the combination dial: a dark steel ring with glowing graduations
    this.dialTex = memoryDialTexture();
    const dialGeo = memoryLathe([[6.46, 0.3], [6.46, 0.6], [6.33, 0.76], [5.63, 0.76], [5.5, 0.63], [5.5, 0.3]], 128);
    const uv = dialGeo.attributes.uv, pos = dialGeo.attributes.position;
    for (let k = 0; k < uv.count; k++) {
      const j = k % 10; // profile index; 4 and 5 bound the front face
      const r = Math.hypot(pos.getX(k), pos.getY(k));
      uv.setXY(k, 1.5 - uv.getX(k), j === 4 || j === 5 ? (r - 5.63) / 0.7 : -1); // 0 sits under the slot
    }
    this.dial = new THREE.Mesh(dialGeo, new THREE.MeshStandardMaterial({
      color: 0x262d31, metalness: 0.92, roughness: 0.3, envMap: env, envMapIntensity: 1.2, emissive: neon(0xffcf6e, 1.6), emissiveMap: this.dialTex,
    }));
    door.add(this.dial);
    this.dialA = 0;
    // the handle wheel behind the card (seen as it flips): it turns as the vault unlocks
    this.wheel = new THREE.Mesh(memoryWheelGeometry(), chrome);
    door.add(this.wheel);
    // chrome bolts across the seam; they slide back one by one as the deck is banked
    const boltGeo = new THREE.LatheGeometry([[0, -0.95], [0.26, -0.95], [0.3, -0.9], [0.3, 0.62], [0.285, 0.73], [0.23, 0.83], [0.13, 0.9], [0, 0.925]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
    this.bolts = new THREE.InstancedMesh(boltGeo, chrome, MEMORY_BOLTS);
    this.bolts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bolts.frustumCulled = false;
    door.add(this.bolts);
    this.boltK = new Float32Array(MEMORY_BOLTS);
    this.boltAng = Array.from({ length: MEMORY_BOLTS }, (_, k) => Math.PI / 2 + Math.PI / MEMORY_BOLTS + (k * 2 * Math.PI) / MEMORY_BOLTS);
    const off = (a) => Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)));
    this.boltOrder = this.boltAng.map((a, k) => k).sort((p, q) => off(this.boltAng[p]) - off(this.boltAng[q]) || this.boltAng[p] - this.boltAng[q]);
    this.unlocked = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._z = new THREE.Vector3(0, 0, 1);
    this.placeBolts();
    // bolt guides and rivets (small: layer 1, so the floor reflection stays cheap)
    const guides = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.36, 0.8), gold, MEMORY_BOLTS);
    this.boltAng.forEach((a, k) => {
      this._p.set(Math.cos(a) * 8.21, Math.sin(a) * 8.21, 0.85);
      this._q.setFromAxisAngle(this._z, a - Math.PI / 2);
      guides.setMatrixAt(k, this._m.compose(this._p, this._q, this._s));
    });
    const rivetGeo = new THREE.SphereGeometry(0.15, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2);
    const rivets = new THREE.InstancedMesh(rivetGeo, chrome, 72);
    for (let k = 0; k < 72; k++) {
      const outer = k < 40, a = outer ? (k / 40) * Math.PI * 2 : ((k - 40) / 32) * Math.PI * 2 + 0.05;
      const r = outer ? 10.5 : 9.31;
      this._p.set(Math.cos(a) * r, Math.sin(a) * r, outer ? 0.3 : 0.6);
      rivets.setMatrixAt(k, this._m.compose(this._p, this._q.identity(), this._s));
    }
    [guides, rivets].forEach((m) => { m.frustumCulled = false; m.layers.set(1); door.add(m); });
    this.decor(guides, rivets);
    // the coin slot at twelve o'clock
    const slot = new THREE.Group();
    slot.position.set(0, MEMORY_SLOT_R, 0.3);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.45, 0.3), steel);
    plate.position.z = 0.15;
    this.slitMat = new THREE.MeshBasicMaterial({ color: neon(0xffd27a, 2) });
    this.slitBase = new THREE.Color(0xffd27a);
    this.slitMiss = new THREE.Color(4, 0.3, 0.25);
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.0), this.slitMat);
    slit.position.z = 0.305;
    slot.add(plate, slit);
    door.add(slot);
    this.slotWorld = new THREE.Vector3(0, Y + MEMORY_SLOT_R, 0.62);
    // light rays leaking from the seam
    this.shafts = new THREE.Mesh(new THREE.RingGeometry(8.5, 19, 240, 1), memoryShaftMaterial());
    this.shafts.position.z = 1.35;
    this.shafts.renderOrder = 6;
    this.shafts.layers.set(1);
    door.add(this.shafts);

    // polished dark floor: a polar grid radiating from the vault, and its reflection
    this.mirror = new Mirror(0);
    this.floor = makeNeonFloor({ size: 260, mirror: this.mirror, polar: true, spokes: 40, cell: 2.6, line: 0x1fd17a, lineK: 0.7, base: 0x010504, reflect: 0.72, glow: 0.25, ripple: 0.001, streak: 0.004 });
    s.add(this.floor);
    s.userData.mirrors = [this.mirror];
    const pool = makeLightPool({ color: 0xffb84d, radius: 11, intensity: 0.12 });
    pool.position.set(0, 0.02, 1.5);
    pool.layers.set(1);
    s.add(pool);
    this.decor(pool);

    // stacks of gold bars under spotlights, either side of the door
    const ingot = memoryIngotGeometry();
    this.stacks = [-1, 1].map((sd) => {
      const st = new THREE.InstancedMesh(ingot, gold, 19);
      let n = 0;
      for (let L = 0; L < 4; L++) {
        const across = 4 - L, rows = L < 3 ? 2 : 1;
        for (let i = 0; i < across; i++) {
          for (let r = 0; r < rows; r++) {
            this._p.set((i - (across - 1) / 2) * 1.56, L * 0.43, rows === 1 ? 0 : (r - 0.5) * 0.78);
            this._q.setFromAxisAngle(THREE.Object3D.DefaultUp, rand(-0.04, 0.04));
            st.setMatrixAt(n++, this._m.compose(this._p, this._q, this._s));
          }
        }
      }
      st.frustumCulled = false;
      st.rotation.y = -sd * 0.35;
      const cone = makeLightCone({ color: 0xffe2a8, top: 0.25, bottom: 2.8, height: 20, intensity: 0.04 }); // (a shaft you can see, not a haze over the gold)
      cone.position.set(0, 20, 0);
      cone.layers.set(1);
      const glow = makeLightPool({ color: 0xffd27a, radius: 3.6, intensity: 0.09 });
      glow.layers.set(1);
      const g = new THREE.Group();
      g.add(st, cone, glow);
      s.add(g);
      g.userData.side = sd;
      return g;
    });

    this.motes = makeMotes({ count: 80, box: [40, 18, 18], center: [0, 9, 6], color: 0xffe2a8, size: 0.13, k: 1.1 });
    this.motes.layers.set(1);
    s.add(this.motes);
    this.decor(this.motes, ...this.stacks);
    this.sparks = new MemorySparks(260);
    s.add(this.sparks.points);
    this.glintT = 0.5;

    this.coinTex = memoryCoinTexture();
    this.coinGeo = memoryCoinGeometry();
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xffc85c, metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 1.8, emissive: 0x4f2e00, bumpMap: this.coinTex, bumpScale: 0.02 });
    this.warmExtra = [new THREE.Mesh(this.coinGeo, this.coinMat)]; // drawn once off-screen at start (GFX.warm)

    this.works = new MemoryWorks(this, { gold, steel, chrome }); // gear trains, deck lamps, coin stacks (23b-memoryworks.js)
    this.open = 0; // eased share of the deck banked: drives bolts, glow and lit boxes
    this.flash = 0; // a deposit's flash, decaying
    this.slotFlash = 0;
    this.dist = 22;
    s.userData.post = { exposure: 1.2, bloom: 0.7, threshold: 1.15, saturation: 1.14, contrast: 1.12, vignette: 1.1, ao: 0.85, shadow: 0.6, shadowLen: 0.1, sun: [0.2, 1, 0.6], dirt: 0.4, sharpen: 0.4, fringe: 0.2 };
    this.camBase.set(0, Y, this.dist);
    this.lookAt.set(0, Y, 0);
  }
  // Dolly so the dial ring sits just outside the card; move the gold to where it shows.
  onResize(w, h) {
    if (!this.camera || !this.door) return;
    const card = this.el && $(".card3d", this.el);
    this.cardW = card ? card.offsetWidth : Math.min(w - 32, 560);
    this.cardH = card ? card.offsetHeight : 360;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.dist = clamp((MEMORY_DIAL_R * h) / (2 * tanH * (this.cardH / 2 + 10)), 12, 40);
    // the gold sits where the floor shows: beside the door on wide screens, in front
    // of its foot on tall ones
    const wide = w / h > 1;
    this.stacks.forEach((g) => {
      const sd = g.userData.side;
      if (wide) g.position.set(sd * 14, 0, 1.2);
      else g.position.set(sd * 4.6, 0, 0.8);
    });
  }
  placeBolts() {
    for (let k = 0; k < MEMORY_BOLTS; k++) {
      const a = this.boltAng[k], r = lerp(8.95, 7.5, this.boltK[k]);
      this._p.set(Math.cos(a) * r, Math.sin(a) * r, 0.86);
      this._q.setFromAxisAngle(this._z, a - Math.PI / 2);
      this.bolts.setMatrixAt(k, this._m.compose(this._p, this._q, this._s));
    }
    this.bolts.instanceMatrix.needsUpdate = true;
  }
  start() {
    Sound.play("calm");
    if (!this.total) {
      UI.toast("NO CARDS HERE YET");
      return this.quit();
    }
    this.state = "front";
    this.render();
    requestAnimationFrame(() => { if (!this.unmounted) this.setBand($(".card-stage", this.el)); });
  }
  get card() { return F_BY_ID.get(this.queue[0]); }
  render() {
    const f = this.card;
    if (!f) return this.finish();
    this.flipped = false;
    const card = $("[data-card]", this.el);
    // Snap back to the front without animating, or the next card's answer flashes by.
    card.style.transition = "none";
    card.classList.remove("flipped");
    void card.offsetWidth;
    card.style.transition = "";
    const front = this.reverse ? f.back : f.front;
    const back = this.reverse ? f.front : f.back;
    const box = Store.box(f.id);
    const status = ["NEW", "MISSED LAST TIME", "LEARNING", "REVIEW", "BANKED", "BANKED"][box];
    card.innerHTML = `<div class="face front" style="--c:${CH(f.ch).color}">
        <div class="ftop"><span>STAGE ${f.ch} · ${esc(f.topic)}</span><span>${status}</span></div>
        <div class="fmain selectable">${esc(front)}</div>
        <div class="fhint">TAP CARD OR PRESS SPACE TO FLIP</div>
      </div>
      <div class="face back">
        <div class="ftop"><span>${esc(this.reverse ? "TERM" : "ANSWER")}</span><span>BOOK P. ${esc(f.page)}</span></div>
        <div class="fmain selectable">${esc(back)}</div>
        <div class="fhint">SWIPE: &lt; MISSED · GOT IT &gt; · UP = EASY</div>
      </div>`;
    $("[data-grade]", this.el).innerHTML = `<button class="btn" data-act="flip" style="--c:${COLORS.cyan};grid-column:1/-1">FLIP CARD</button>`;
    UI.text($("[data-pos]", this.el), `CARD ${Math.min(this.done + 1, this.total)}/${this.total}`);
    UI.meter($("[data-prog]", this.el), this.total ? this.done / this.total : 0);
    UI.text($("[data-dep]", this.el), "BANKED " + this.deposits);
    card.style.transform = card.style.transition = "";
    // a long answer scrolls, so there an upward drag belongs to the text
    const fm = $(".face.back .fmain", card);
    card.style.touchAction = fm && fm.scrollHeight > fm.clientHeight + 2 ? "pan-y" : "none";
    this.state = "front";
  }
  // Drag the flipped card: right banks it, left sends it back, up marks it easy.
  // The card follows the finger and a stamp shows what letting go will do.
  bindSwipe() {
    const card = $("[data-card]", this.el), stamp = $("[data-stamp]", this.el);
    let d = null;
    const kindOf = (dx, dy) => (dx > 80 ? "good" : dx < -80 ? "again" : dy < -80 ? "easy" : "");
    const NAMES = { good: ["GOT IT", COLORS.cyan], again: ["MISSED", COLORS.red], easy: ["EASY", COLORS.lime] };
    // the card is turned over (rotateY 180), so its own x axis points left
    const pose = (dx, dy) => `rotateY(180deg) translate3d(${-dx}px, ${dy}px, 0) rotateZ(${-dx * 0.035}deg)`;
    card.addEventListener("pointerdown", (e) => {
      if (this.state !== "back" || this.paused || !e.isPrimary) return;
      d = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, id: e.pointerId };
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      card.style.transition = "none";
    });
    card.addEventListener("pointermove", (e) => {
      if (!d || e.pointerId !== d.id) return;
      d.dx = e.clientX - d.x;
      d.dy = Math.min(0, e.clientY - d.y);
      card.style.transform = pose(d.dx, d.dy);
      const k = kindOf(d.dx, d.dy);
      stamp.hidden = !k;
      if (k) { stamp.textContent = NAMES[k][0]; stamp.style.setProperty("--c", NAMES[k][1]); }
    });
    const end = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const k = e.type === "pointerup" ? kindOf(d.dx, d.dy) : "";
      const from = pose(d.dx, d.dy);
      d = null;
      stamp.hidden = true;
      card.style.transition = "";
      if (k && this.state === "back") this.grade(k, from);
      else card.style.transform = "";
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  }
  flip() {
    if (this.state !== "front" || this.paused) return;
    this.flipped = true;
    Sound.sfx("flip");
    $("[data-card]", this.el).classList.add("flipped");
    $("[data-grade]", this.el).innerHTML = `
      <button class="btn" data-act="again" style="--c:${COLORS.red}">MISSED</button>
      <button class="btn" data-act="good" style="--c:${COLORS.cyan}">GOT IT</button>
      <button class="btn" data-act="easy" style="--c:${COLORS.lime}">EASY</button>`;
    this.state = "back";
  }
  // from: the card's pose when a swipe let go of it, so it flies on from there
  grade(kind, from) {
    if (this.state !== "back" || this.paused) return;
    const id = this.queue.shift();
    if (kind === "again") {
      Store.record(id, false);
      Sound.sfx("wrong");
      if (!this.missed.includes(id)) this.missed.push(id);
      this.again[id] = (this.again[id] || 0) + 1;
      if (this.again[id] <= 2) this.queue.splice(Math.min(this.queue.length, 3), 0, id);
      else this.done++;
      this.wrongCombo();
    } else {
      if (kind === "easy") Store.markEasy(id);
      else Store.record(id, true);
      this.deposits++;
      this.done++;
      Sound.sfx("deposit");
      this.spawnCoin();
    }
    Store.save();
    Trophies.check();
    this.state = "next";
    const card = $("[data-card]", this.el);
    // say what just happened, where the card was (the coin and the vault's answer follow in the scene)
    const cr = card.getBoundingClientRect();
    UI.floater(kind === "again" ? "BACK IN THE DECK" : "BANKED", cr.left + cr.width / 2 - (kind === "again" ? 96 : 36), cr.top + cr.height * (kind === "again" ? 0.72 : 0.16), kind === "again" ? COLORS.red : COLORS.yellow);
    if (card.animate && !REDUCED_MOTION) {
      // Slide the card but fade its faces: opacity on the 3D card itself would flatten
      // it, and the hidden front face would show through mirrored.
      const anim = { duration: 260, easing: "ease-in" };
      // a banked card shrinks away up into the coin slot; a missed one tips and drops back toward the deck
      const to = kind === "again" ? "rotateY(180deg) translateY(115%) rotateZ(-9deg)" : "rotateY(180deg) translateY(-72%) scale(0.08)";
      card.animate([{ transform: from || "rotateY(180deg) translateX(0)" }, { transform: to }], anim);
      if (from) card.style.transform = to; // hold the end pose until the next card is dealt
      // the faces are replaced by the next card, so they can stay faded out
      card.querySelectorAll(".face").forEach((f) => f.animate([{ opacity: 1 }, { opacity: 0 }], Object.assign({ fill: "forwards" }, anim)));
    }
    setTimeout(() => { if (!this.unmounted) this.render(); }, REDUCED_MOTION ? 0 : 240);
  }
  // A coin flies up from below the card, swings past its side (where there is room),
  // tumbling and trailing sparkles, turns edge-on over the vault and drops into the slot.
  spawnCoin() {
    if (!this.has3D) return;
    const c = new THREE.Mesh(this.coinGeo, this.coinMat);
    c.layers.set(1);
    const side = Math.random() < 0.5 ? -1 : 1;
    const path = this.coinPath(side);
    path.getPoint(0, c.position);
    this.scene.add(c);
    this.coins.push(c);
    const spin0 = rand(Math.PI * 2), spins = 3.5 + Math.random() * 1.5;
    const trail = neon(0xffc85c, 2.2), hot = neon(0xfff2d0, 3);
    // time spent on each leg: rise, climb the side, arc over, drop in
    const legs = [0, 0.24, 0.5, 0.82, 1];
    let lastFace = Math.round(spin0 / Math.PI), n = 0;
    this.tw.add(1.3, (e) => {
      let i = 0;
      while (i < 3 && e > legs[i + 1]) i++;
      path.getPoint((i + clamp((e - legs[i]) / (legs[i + 1] - legs[i]), 0, 1)) / 4, c.position);
      const a = spin0 + e * spins * Math.PI * 2;
      const settle = clamp((e - 0.74) / 0.2, 0, 1);
      const edge = Math.round((a - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
      c.rotation.set(0.45 * (1 - e) * Math.sin(e * 9), lerp(a, edge, settle * settle * (3 - 2 * settle)), 0.3 * (1 - e));
      if (e < 0.96 && n++ % 2 === 0) this.sparks.emit(c.position.x + rand(-0.12, 0.12), c.position.y + rand(-0.12, 0.12), c.position.z - 0.1, rand(-0.3, 0.3), rand(-0.5, 0.2), 0, rand(0.3, 0.55), rand(0.1, 0.22), trail, -1.5);
      // a glint whenever a face turns to the camera
      const face = Math.round(a / Math.PI);
      if (face !== lastFace && settle < 0.5) {
        lastFace = face;
        this.sparks.emit(c.position.x, c.position.y, c.position.z + 0.3, 0, 0, 0, 0.2, 1.1, hot);
      }
    }, () => {
      this.scene.remove(c);
      this.coins.splice(this.coins.indexOf(c), 1);
      this.deposit();
    }, (k) => k * (1.35 - 0.35 * k));
  }
  // Up from below the screen, out past the card's side (where the screen has room),
  // over the top and down into the slot. Waypoints are placed in screen space.
  coinPath(side) {
    const D = this.dist, H = GFX.h, Y = MEMORY_DOOR_Y;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const yc = this.band ? (this.band.top + this.band.bottom) / 2 : H / 2;
    // a point dx, dy pixels from the band centre, d units in front of the camera
    const at = (dx, dy, d) => { const k = (2 * d * tanH) / H; return new THREE.Vector3(dx * k, Y - dy * k, D - d); };
    const cw = (this.cardW || 360) / 2, ch = (this.cardH || 360) / 2;
    const out = Math.min(cw + 80, GFX.w / 2 - 34);
    const slot = this.slotWorld;
    return new THREE.CatmullRomCurve3([
      at(side * Math.min(90, GFX.w * 0.2), H - yc + 50, Math.min(8, D * 0.42)),
      at(side * out, ch * 0.35, D * 0.55),
      at(side * (out - 10), -ch - 40, D * 0.72),
      new THREE.Vector3(side * 0.8, slot.y + 1.0, slot.z + 1.8),
      slot.clone(),
    ], false, "centripetal");
  }
  // The coin lands: sparkles out of the slot, the dial spins, the seam flares and, as
  // the share of the deck banked grows, bolts slide back.
  deposit() {
    if (!this.has3D) return;
    const p = this.slotWorld, gold = neon(0xffc35a, 2.6), hot = neon(0xfff3d6, 3.2);
    for (let i = 0; i < 48; i++) {
      const a = rand(Math.PI * 2), sp = rand(1.5, 7.5);
      this.sparks.emit(p.x, p.y, p.z + 0.3, Math.cos(a) * sp, Math.sin(a) * sp * 0.85 + 2.2, rand(0.3, 3.2), rand(0.55, 1.15), rand(0.18, 0.42), i % 3 ? gold : hot, -7);
    }
    this.sparks.emit(p.x, p.y, p.z + 0.5, 0, 0, 0, 0.3, 2.6, hot);
    this.shockwave(p, neon(0xffcf6e, 2.2), 4.2, 0.5);
    this.flash = 1;
    this.slotFlash = 1;
    this.works.banked(); // the lock goes home: gear trains spin on, the card's lamp lights
    const from = this.dialA, to = from - (0.55 + Math.random() * 0.7);
    this.tw.add(0.9, (e) => { this.dialA = lerp(from, to, e); }, null, Ease.outBack);
    const want = this.total ? Math.floor((MEMORY_BOLTS * this.deposits) / this.total) : 0;
    for (let n = 0; this.unlocked < Math.min(MEMORY_BOLTS, want); n++) {
      const k = this.boltOrder[this.unlocked++], delay = n * 0.12;
      this.tw.add(0.5 + delay, (e, raw) => {
        this.boltK[k] = Ease.outBack(clamp((raw * (0.5 + delay) - delay) / 0.5, 0, 1));
      }, null, Ease.linear);
    }
    GFX.pulse(1.2, 0.012);
  }
  // A miss: the dial jerks back like a wrong combination and the slot dims red.
  wrongCombo() {
    if (!this.has3D) return;
    const base = this.dialA;
    this.tw.add(0.7, (e, raw) => { this.dialA = base + 0.1 * Math.sin(raw * Math.PI * 4) * (1 - raw); }, () => { this.dialA = base; }, Ease.linear);
    this.slotFlash = -1;
    this.works.missed(); // gear trains jerk back, the unlit lamps wash red
  }
  on(a, t) {
    if (a === "pause") this.pause();
    else if (a === "flip") this.flip();
    else if (a === "again" || a === "good" || a === "easy") this.grade(a);
    else if (a === "reverse") {
      this.reverse = !this.reverse;
      t.setAttribute("aria-pressed", String(this.reverse));
      t.style.color = this.reverse ? COLORS.lime : "";
      UI.toast(this.reverse ? "DEFINITION FIRST" : "TERM FIRST");
      if (this.state === "front") this.render();
    }
  }
  key(e) {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") { e.preventDefault(); return this.pause(); }
    if (this.state === "front" && (e.key === " " || e.key === "Enter" || e.key === "f" || e.key === "F")) { e.preventDefault(); return this.flip(); }
    if (this.state === "back") {
      if (e.key === "1" || e.key === "ArrowLeft") return this.grade("again");
      if (e.key === "2" || e.key === " " || e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); return this.grade("good"); }
      if (e.key === "3" || e.key === "ArrowRight") return this.grade("easy");
    }
  }
  pause() {
    if (this.paused || this.state === "over" || this.unmounted) return;
    this.paused = true;
    Sound.sfx("blip");
    pauseMenu(this);
  }
  finish() {
    if (this.state === "over") return;
    this.state = "over";
    Sound.sfx("win");
    const ids = selectionFids(this.sel);
    const banked = Store.countMastered(ids);
    showResults({
      game: "memory", sel: this.sel, score: 0,
      run: { answered: this.done, correct: this.deposits, bestStreak: 0, missed: [], start: this.run.start, xp0: this.run.xp0 },
      title: "DECK CLEARED", color: COLORS.lime, headline: this.deposits + " CARDS BANKED",
      sub: `${banked} of ${ids.length} cards in ${this.sel.label} are fully banked`,
      tiles: [{ k: "REMEMBERED", v: pct(this.total - this.missed.length, this.total) + "%", c: COLORS.lime }, { k: "STILL DUE", v: dueCount(ids) }],
      hideRunTiles: true,
      reviewTitle: "CARDS YOU MISSED",
      review: this.missed.map((id) => { const f = F_BY_ID.get(id); return { q: f.front, a: f.back, r: `P. ${f.page} · STAGE ${f.ch} · ${f.topic}` }; }),
    });
  }
  update(dt) {
    super.update(dt);
    if (this.paused || !this.has3D) return;
    const t = this.t;
    const want = this.total ? this.deposits / this.total : 0;
    this.open += (want - this.open) * Math.min(1, dt * 2);
    this.flash *= Math.pow(0.05, dt);
    this.slotFlash *= Math.pow(0.02, dt);
    // the dial: a slow drift plus the spins of each deposit
    this.dialA -= dt * 0.03;
    this.dial.rotation.z = this.dialA;
    this.wheel.rotation.z = -this.open * Math.PI * 0.5;
    this.placeBolts();
    // the vault glows brighter the more of the deck is banked
    const g = 1 + 1.6 * this.open + 2 * this.flash + 0.1 * Math.sin(t * 2.1);
    this.seamMat.color.copy(this.seamBase).multiplyScalar(1.4 * g);
    this.halo.material.opacity = 0.1 + 0.22 * this.open + 0.3 * this.flash;
    this.shafts.material.uniforms.uI.value = 0.1 + 0.32 * this.open + 0.45 * this.flash;
    this.wall.material.uniforms.uGlow.value = 0.22 + 0.35 * this.open + 0.35 * this.flash;
    this.wall.material.uniforms.uLit.value = this.open * 0.55;
    const sf = this.slotFlash;
    this.slitMat.color.copy(this.slitBase).multiplyScalar(1.6 + 0.3 * Math.sin(t * 3) + 7 * Math.max(0, sf));
    if (sf < 0) this.slitMat.color.lerp(this.slitMiss, -sf);
    this.vaultLight.intensity = 0.6 + 0.6 * this.open + 0.8 * this.flash;
    // glints on the gold now and then
    this.glintT -= dt;
    if (this.glintT < 0) {
      this.glintT = rand(0.25, 0.7);
      const hot = neon(0xfff4dc, 2.4);
      if (Math.random() < 0.55) {
        const a = rand(0.15, Math.PI - 0.15), r = rand(7.95, 8.5);
        this.sparks.emit(Math.cos(a) * r, MEMORY_DOOR_Y + Math.sin(a) * r, 0.65, 0, 0, 0, 0.45, rand(0.5, 0.9), hot);
      } else {
        const st = pick(this.stacks);
        this.sparks.emit(st.position.x + rand(-2.4, 2.4), rand(0.4, 1.6), st.position.z + rand(-0.4, 0.4), 0, 0, 0, 0.45, rand(0.45, 0.8), hot);
      }
    }
    this.camBase.set(Pointer.x * 0.7, MEMORY_DOOR_Y + 0.12 * Math.sin(t * 0.45) - Pointer.y * 0.35, this.dist);
    this.lookAt.set(0, MEMORY_DOOR_Y, 0);
    this.placeCamera();
    this.motes.userData.drift(t);
    this.works.update(dt, t);
    this.sparks.update(dt, this.camera);
    FX.sync(this.scene, t);
  }
  // Free what the scene graph walk misses: the env target, the textures that are not
  // a material's `map`, instance buffers, and the coin parts (shared, maybe not in the scene).
  dispose() {
    if (this.envRT) this.envRT.dispose();
    if (this.dialTex) this.dialTex.dispose();
    if (this.coinTex) this.coinTex.dispose();
    if (this.coinGeo) this.coinGeo.dispose();
    if (this.coinMat) this.coinMat.dispose();
    if (this.scene) this.scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    super.dispose();
  }
}

// The coin: a rim on both faces round a struck field, with the emblem mapped flat
// onto each face. Faces point along ±z.
function memoryCoinGeometry() {
  const g = memoryLathe([[0.47, -0.035], [0.47, -0.06], [0.55, -0.06], [0.55, 0.06], [0.47, 0.06], [0.47, 0.035], [0, 0.035]], 28);
  const back = new THREE.CircleGeometry(0.47, 28);
  back.rotateY(Math.PI);
  back.translate(0, 0, -0.035);
  const parts = [g.toNonIndexed(), back.toNonIndexed()];
  const pos = [], nor = [], uv = [];
  parts.forEach((p) => {
    const a = p.attributes.position, n = p.attributes.normal;
    for (let i = 0; i < a.count; i++) {
      pos.push(a.getX(i), a.getY(i), a.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(a.getX(i) / 1.1 + 0.5, a.getY(i) / 1.1 + 0.5);
    }
    p.dispose();
  });
  g.dispose();
  back.dispose();
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return out;
}
