// MEMORY BANK — spaced-repetition flashcards. Flip, grade yourself, and every
// card you know is deposited into the vault. Missed cards come back this session.
const DECK_SIZE = 20;

// ---- the vault ---------------------------------------------------------------------
// The floor is y = 0. A round gold vault door stands on it facing the camera, centred
// at (0, MEMORY_DOOR_Y, 0): a combination-dial ring that frames the flashcard, a coin
// slot at twelve o'clock, chrome bolts across a glowing seam, a steel frame and a wall
// of safe-deposit boxes. The camera dollies so the dial ring sits just outside the card.
const MEMORY_DOOR_Y = 8.7;
const MEMORY_EYE_Y = MEMORY_DOOR_Y + 0.1; // the camera looks a little below the door's centre: the floor and the gold on it are in the window too
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
    if (major && (i <= 20 || i >= 80)) x.fillText(String(i), px, 88);
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

// The wall around the vault: rows of safe-deposit boxes, each door brushed steel with a
// brass plate and keyhole. Plates light up gold as the deck is banked (uLit), and the
// glow from the vault's seam spills across the nearest doors.
// (the master overhaul, Phase 2, 2026-11-23: the doors were a flat dark navy. Now each is a sheet of brushed steel
// (ambientCG Metal009, CC0: assets/ui/mat-steel.webp, its normal's x and y in red and green, its roughness in blue;
// a level sheet until it arrives) whose face turns to its edges in a bevel, lit as metal is: the vault's glow from
// the door's rim (gold), the cove strip along the top of the wall (warm white, from above: every door's upper rim
// catches it) and the floor's gold thrown back up (orange: the lower rims), each as a broad sheen and a sharp
// highlight; what the steel mirrors is the room in front of it, dark violet, lighter toward the cove and the floor.
// A kick plate with a strip of orange light runs along the foot of the wall. One draw, one look-up a pixel.)
function memoryWallMaterial(brush) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), {
      uTime: { value: 0 }, uLit: { value: 0 }, uGlow: { value: 0.3 },
      uDoor: { value: new THREE.Vector3(0, MEMORY_DOOR_Y, 12.1) },
      uGold: { value: neon(0xffb444, 1.35) }, uLed: { value: neon(0xff8a2a, 2.2) },
      uCove: { value: neon(0xffc93d, 2.5) }, uKick: { value: neon(0xff8a2a, 1.4) },
      tBrush: { value: brush },
    }),
    extensions: { derivatives: true },
    vertexShader: `varying vec3 vWorld; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_NOISE} ${GLSL_FOG_PARS}
      uniform float uTime; uniform float uLit; uniform float uGlow; uniform vec3 uDoor; uniform vec3 uGold; uniform vec3 uLed;
      uniform vec3 uCove; uniform vec3 uKick; uniform sampler2D tBrush;
      varying vec3 vWorld; varying float vDepth;
      // a light's two lobes on brushed steel: a broad sheen and a sharp highlight
      float sheen(vec3 N, vec3 L, vec3 V, float rough){
        float nh = max(dot(N, normalize(L + V)), 0.0), sh = 2.0 / max(rough * rough * rough * rough, 1e-3);
        return 0.3 * pow(nh, 7.0) + pow(nh, sh) * (sh + 2.0) * 0.012;
      }
      void main(){
        const float KICK = 0.62, COVE = 24.02; // (the kick plate's top, and the cove between two rows of doors: 18 rows up)
        vec2 cs = vec2(2.1, 1.3);
        vec2 q = (vWorld.xy - vec2(0.0, KICK)) / cs;
        vec2 id = floor(q); vec2 f = fract(q);
        float px = max(max(fwidth(vWorld.x), fwidth(vWorld.y)), 1e-4); // (world units a pixel)
        vec2 d = min(f, 1.0 - f) * cs;
        float seam = smoothstep(0.03 - px * 0.5, 0.03 + px * 0.5, min(d.x, d.y)); // (the gap between two doors)
        float h = hash13(vec3(id, 3.0)), hb = hash13(vec3(floor(id / vec2(6.0, 5.0)), 5.0));
        float kick = 1.0 - smoothstep(KICK - px, KICK + px, vWorld.y);
        // the sheet: streaks along x, each door cut from its own part of it (the sheet's relief and the spread of its
        // roughness are a few hundredths: stretched here so the brushing shows); relief finer than a pixel is not drawn
        vec3 bm = texture2D(tBrush, vWorld.xy * vec2(0.05, 0.22) + vec2(h * 3.7, h * 5.3)).rgb;
        float fine = 1.0 - smoothstep(0.03, 0.1, px), streak = clamp(0.5 + (bm.b - 0.47) * 8.0, 0.0, 1.0);
        // the bevel: the face turns toward each edge over its last few centimetres
        vec2 rim = sign(f - 0.5) * (1.0 - smoothstep(0.03, 0.12 + px, d)) * (1.0 - kick);
        vec3 N = normalize(vec3(rim * 0.95 + (bm.rg - 0.5) * 16.0 * fine, 1.0));
        vec3 V = normalize(cameraPosition - vWorld);
        float rough = clamp(mix(0.22, 0.48, streak) + 0.2 * (1.0 - fine), 0.12, 0.75);
        vec3 F0 = vec3(0.6, 0.6, 0.62) * (0.8 + 0.3 * h) * (0.86 + 0.28 * hb) * mix(0.9, 1.07, streak * fine + 0.5 * (1.0 - fine));
        // the number plate (brass) and the keyhole
        vec2 c = (f - vec2(0.5, 0.6)) * cs;
        float plate = (1.0 - smoothstep(-px, px, max(abs(c.x) - 0.27, abs(c.y) - 0.09))) * (1.0 - kick);
        float key = (1.0 - smoothstep(-px, px, length((f - vec2(0.5, 0.3)) * cs) - 0.05)) * (1.0 - kick);
        F0 = mix(F0, vec3(0.86, 0.6, 0.26), plate);
        F0 = mix(F0, vec3(0.2, 0.19, 0.22), kick); // (the kick plate: darker, rubbed by boots)
        rough = mix(rough, 0.34, plate);
        float nv = max(dot(N, V), 0.0);
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0) * 0.6;
        // the vault's glow: from the door's rim, nearest this door
        vec2 dv = vWorld.xy - uDoor.xy; float r = length(dv);
        vec3 G = vec3(uDoor.xy + dv / max(r, 1e-3) * (uDoor.z - 1.0), 2.6) - vWorld;
        float eg = uGlow * 3.4 * exp(-max(r - uDoor.z, 0.0) * 0.11);
        vec3 Lg = normalize(G);
        // the cove: a strip of warm light along the top of the wall, grazing down it (the doors' upper rims mirror it)
        float ec = mix(0.1, 0.3 + 1.2 * exp(-max(COVE - vWorld.y, 0.0) * 0.2), step(vWorld.y, COVE)) * mix(0.75, 1.15, f.y); // (each door lighter toward its top)
        vec3 Lc = normalize(vec3(0.0, 0.96, 0.28));
        // the floor's gold thrown back up onto the lowest rows (their lower rims)
        float eb = (0.08 + 0.8 * uGlow) * exp(-vWorld.y * 0.18) * (0.3 + 0.7 * exp(-max(r - uDoor.z, 0.0) * 0.05));
        vec3 Lb = normalize(vec3(0.0, -0.94, 0.34));
        vec3 col = F * (vec3(1.0, 0.64, 0.27) * eg * (sheen(N, Lg, V, rough) + 0.16 * max(dot(N, Lg), 0.0))
                      + vec3(1.0, 0.88, 0.7) * ec * (sheen(N, Lc, V, rough) + 0.06 * max(dot(N, Lc), 0.0))
                      + vec3(1.0, 0.48, 0.14) * eb * (sheen(N, Lb, V, rough) + 0.06 * max(dot(N, Lb), 0.0)));
        // what the steel mirrors: the room in front of it (dark violet; a cooler grey up toward the ceiling, the floor's
        // warmth down toward it), the brushing's streaks in it
        vec3 R = reflect(-V, N);
        float w = 0.25 + rough;
        col += F * mix(0.86, 1.1, streak * fine + 0.5 * (1.0 - fine)) * (vec3(0.045, 0.038, 0.07) + vec3(0.19, 0.185, 0.21) * smoothstep(0.2 - w * 0.3, 0.8 + w * 0.2, R.y)
          + vec3(0.3, 0.15, 0.06) * smoothstep(0.15 - w * 0.3, 0.7 + w * 0.2, -R.y) * (0.4 + uGlow));
        col *= 1.0 - 0.88 * key;
        col *= mix(0.12, 1.0, max(seam, kick));
        float lit = step(h, uLit);
        col += uGold * plate * seam * lit * (0.8 + 0.2 * sin(uTime * 1.7 + h * 40.0));
        float ledOn = step(0.94, hash13(vec3(id, 11.0))) * step(0.45, fract(uTime * 0.21 + h * 7.0)) * (1.0 - kick);
        float led = 1.0 - smoothstep(0.0, px * 1.5, length((f - vec2(0.88, 0.8)) * cs) - 0.035);
        col += uLed * led * ledOn;
        // the strips themselves: the cove (gold) and the kick plate's top (orange)
        col += uCove * (1.0 - smoothstep(0.06, 0.06 + px * 1.5, abs(vWorld.y - COVE)));
        col += uKick * (1.0 - smoothstep(0.035, 0.035 + px * 1.5, abs(vWorld.y - KICK)));
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

// The handle at the heart of the door: a domed hub, four stout spokes, a rim with a ball grip where each spoke meets it.
function memoryWheelGeometry() {
  const parts = [memoryLathe([[1.02, 0.6], [1.02, 0.85], [0.9, 1.02, true], [0.62, 1.15, true], [0.3, 1.21, true], [0, 1.23]], 40)];
  parts.push(new THREE.TorusGeometry(4.3, 0.21, 10, 56).translate(0, 0, 0.95)); // the rim the hands turn
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2, c = Math.cos(a), s = Math.sin(a);
    const spoke = new THREE.CylinderGeometry(0.24, 0.27, 3.4, 12).rotateZ(a - Math.PI / 2).translate(c * 2.6, s * 2.6, 0.95);
    const grip = new THREE.SphereGeometry(0.4, 16, 12).translate(c * 4.3, s * 4.3, 0.95);
    parts.push(spoke, grip);
  }
  return memoryMerge(parts);
}

// A gold ingot as cast: a trapezoid, its top drawn in, every edge bevelled, so a highlight runs along each edge in
// the light and each face takes its own part of the room's reflection (the master overhaul, Phase 2, 2026-11-23: a
// box with its faces painted lighter and darker read as a lump of brown). Flat faces, 44 triangles; the bars' own
// tones (instance colours) need a colour per corner, all white.
function memoryIngotGeometry() {
  const W0 = 0.975, D0 = 0.48, W1 = 0.82, D1 = 0.336, H = 0.56, C = 0.055;
  // an octagon: a rectangle (half-sizes w, d) at height y, its corners cut by k
  const ring = (w, d, y, k) => [[w - k, d], [w, d - k], [w, -(d - k)], [w - k, -d], [-(w - k), -d], [-w, -(d - k)], [-w, d - k], [-(w - k), d]].map(([x, z]) => new THREE.Vector3(x, y, z));
  const t = (H - C) / H, r0 = ring(W0, D0, 0, C * 1.4), r1 = ring(W0 + (W1 - W0) * t, D0 + (D1 - D0) * t, H - C, C * 1.4), r2 = ring(W1 - C, D1 - C, H, C);
  const mid = new THREE.Vector3(0, H / 2, 0), pos = [], ab = new THREE.Vector3(), ac = new THREE.Vector3(), cen = new THREE.Vector3();
  const tri = (a, b, c) => { // (wound so its face looks away from the bar's middle: the bar is convex)
    ab.subVectors(b, a); ac.subVectors(c, a); cen.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(mid);
    const out = ab.cross(ac).dot(cen) > 0;
    for (const v of out ? [a, b, c] : [a, c, b]) pos.push(v.x, v.y, v.z);
  };
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    tri(r0[i], r0[j], r1[j]); tri(r0[i], r1[j], r1[i]); // a side
    tri(r1[i], r1[j], r2[j]); tri(r1[i], r2[j], r2[i]); // its bevel
  }
  for (let i = 1; i < 7; i++) { tri(r0[0], r0[i], r0[i + 1]); tri(r2[0], r2[i], r2[i + 1]); } // the foot and the top
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(pos.length).fill(1), 3));
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
    super(sel, "memory", { fov: 60, fog: [0x0a0424, 30, 95], bg: 0x090320 }); // (the arcade's violet-black: it was the one green-black screen)
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
    this.mountUI(`<section class="screen scr-game scr-memory">
      <div class="hud">
        <div class="score"><small>${esc(sel.label)}</small><span data-pos>CARD 1/${this.total}</span></div>
        <div class="grow"></div>
        <span class="tag" style="--c:${COLORS.gold}" data-dep>BANKED 0</span>
        <button class="iconbtn" data-act="reverse" aria-pressed="false" title="Swap sides: show the definition first">SWAP</button>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="vault-window" aria-hidden="true"><span>THE VAULT</span></div>
      <div class="card-stage below"><div class="card3d" data-card data-act="flip" role="button" tabindex="0" aria-label="Flip card"></div><div class="stamp" data-stamp hidden></div></div>
      <div class="grade" data-grade></div>
    </section>`);
    this.bindSwipe();
  }
  build3D() {
    const s = this.scene;
    const Y = MEMORY_DOOR_Y;
    // (the room's ground is the arcade's violet-black and its light the vault's pair, gold and orange: the master
    // overhaul, Phase 2, 2026-11-23; it was green-black, with green strips either side)
    this.envRT = memoryEnvMap({
      top: 0x090320, horizon: 0x5a3a10, bottom: 0x05021a, glow: 0.55,
      panels: [
        { color: 0xfff0d0, k: 1.25, w: 44, h: 3.2, pos: [0, 6, 29] }, // a light strip behind the camera: a broad arc on the gold
        { color: 0xffc46a, k: 0.35, w: 30, h: 3, pos: [0, -6, 29] }, // warm bounce off the floor
        { color: 0xff8a2a, k: 0.5, w: 5, h: 30, pos: [-30, 6, 12] },
        { color: 0xff8a2a, k: 0.5, w: 5, h: 30, pos: [30, 6, 12] },
        { color: 0xfff6e2, k: 4, w: 4, h: 2.5, pos: [-15, 24, 6] },
        { color: 0xfff6e2, k: 4, w: 4, h: 2.5, pos: [17, 21, 10] },
      ],
    });
    this.gen = memoryGen(this); // (served: the vault's gold mirrors a gold vault, the coins and the deck are models: 23c-memorygen.js)
    const env = (this.gen && this.gen.env) || (this.envRT ? this.envRT.texture : null);
    // (every metal in the vault has a grain, hair scratches and smudges: reflections break up over them)
    const gold = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0xeaab3e, metalness: 1, roughness: 0.22, envMap: env, envMapIntensity: 1.3 }), { scale: 1.5, height: 0.0014, scratch: 1.3 });
    // the bars' gold: cast gold, polished, a mirror of the vault round it; each bevelled face takes its own part of that
    // and of the lamps, so a stack reads as solids (vertex colours: each bar's own tone, see cast)
    const barGold = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0xf4b847, vertexColors: true, metalness: 1, roughness: 0.21, envMap: env, envMapIntensity: 1.65, emissive: 0x281603 }), { scale: 1.5, height: 0.0012, scratch: 1.1 });
    // the door's own gold is spun: fine rings turned into it, which throw the lamp back in a bright wedge toward it
    // and a fainter one opposite, and it stands in shade toward its foot (a flat disc of mirror gold was one flat colour)
    const spun = new THREE.MeshStandardMaterial({ color: 0xeaab3e, metalness: 1, roughness: 0.24, envMap: env, envMapIntensity: 1.25 });
    spun.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vSpunP; varying vec3 vSpunN;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvSpunP = position; vSpunN = normal;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vSpunP; varying vec3 vSpunN;")
        .replace("#include <color_fragment>", `#include <color_fragment>
          float spunR = length(vSpunP.xy), spunFace = smoothstep(0.8, 0.98, abs(vSpunN.z));
          float spunFine = 1.0 - smoothstep(0.25, 0.8, fwidth(spunR * 3.4));
          diffuseColor.rgb *= mix(0.62, 1.1, smoothstep(-8.5, 8.5, vSpunP.y)) * (1.0 + 0.07 * sin(spunR * 21.4) * spunFine * spunFace);`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          { vec2 spunD = vSpunP.xy / max(spunR, 1e-3); float spunW = dot(spunD, vec2(-0.5, 0.866));
            float wedge = pow(max(spunW, 0.0), 20.0) + 0.3 * pow(max(-spunW, 0.0), 20.0);
            totalEmissiveRadiance += vec3(1.0, 0.76, 0.34) * wedge * spunFace * 0.55 * smoothstep(2.4, 5.6, spunR); }`);
    };
    spun.customProgramCacheKey = () => "memory-spun-gold";
    const doorGold = surfaceDetail(spun, { scale: 1.5, height: 0.0014, scratch: 1.3 });
    const brass = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0xd9a944, metalness: 1, roughness: 0.4, envMap: env, envMapIntensity: 0.95, emissive: 0x241603 }), { scale: 1.6, height: 0.0014, scratch: 1.2 });
    const nickel = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0x9fb2cf, metalness: 0.75, roughness: 0.42, envMap: env, envMapIntensity: 0.6, emissive: 0x0b1220 }), { scale: 1.6, height: 0.0014, scratch: 1.2 });
    const steel = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0x3b4549, metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.15 }), { scale: 1.2, height: 0.002, scratch: 1.5, smudge: 0.5 });
    const chrome = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0xdfe5ea, metalness: 1, roughness: 0.12, envMap: env, envMapIntensity: 1.6 }), { scale: 2, height: 0.0006, grain: 0.5, scratch: 1.6, smudge: 0.5 });

    s.add(new THREE.AmbientLight(0x2a1c4a, 0.6)); // (the room's shade a deep violet)
    const key = new THREE.DirectionalLight(0xfff0d8, 0.4);
    key.position.set(-10, 22, 9); // steep, so flat faces never flare straight back at the camera
    s.add(key);
    // two cool lights from behind and to the sides: every bar, coin and gear tooth gets an edge of mint against the gold
    [[-13, 7, -0.6], [13, 5, -0.6]].forEach(([x, y, z]) => { const rim = new THREE.DirectionalLight(0xffe9c8, 0.36); rim.position.set(x, y, z); s.add(rim); });
    const lowFill = new THREE.PointLight(0xffb866, 0.6, 46, 1.3); // warm light low in front: the bars' and coins' faces toward the lens
    lowFill.position.set(0, 2.4, 15);
    s.add(lowFill);
    this.vaultLight = new THREE.PointLight(0xffc46a, 0.35, 22, 1.5); // warm light from the seam
    this.vaultLight.position.set(0, Y + 3, 7);
    s.add(this.vaultLight);

    // the wall of deposit boxes and the vault's glow on it (wide and tall enough to fill any window round the vault:
    // on a Mac the room spans the window, and it ended in a black void either side)
    this.brush = cellFlatTexture(); // (a level sheet until mat-steel arrives: see update)
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(300, 64), memoryWallMaterial(this.brush));
    this.wall.position.set(0, 32, -1.25);
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
    door.add(new THREE.Mesh(memoryLathe([[8.5, -1.1], [8.5, 0.44], [8.4, 0.56], [8.02, 0.56], [7.95, 0.49], [7.95, 0.3], [5.32, 0.3], [5.32, 0.42], [5.2, 0.52], [2.2, 0.52], [2.2, 0.66], [0, 0.66]]), doorGold));
    // the middle of the door is a dark plate: the lock's movement turns on it (its gears are in 23b-memoryworks.js)
    const works = new THREE.Mesh(new THREE.RingGeometry(2.22, 5.19, 96, 1), surfaceDetail(new THREE.MeshStandardMaterial({ color: 0x1b1612, metalness: 0.85, roughness: 0.62, envMap: env, envMapIntensity: 0.45 }), { scale: 1.2, height: 0.002, scratch: 1.2, smudge: 0.5 }));
    works.position.z = 0.53;
    door.add(works);
    // the seam between door and frame, lit from inside the vault
    this.seamMat = new THREE.MeshBasicMaterial({ color: neon(0xffd38a, 1.5) });
    this.seamBase = new THREE.Color(0xffd38a);
    const seam = new THREE.Mesh(new THREE.RingGeometry(8.54, 8.9, 128), this.seamMat);
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
    this._v = new THREE.Vector3();
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
      if (outer && Math.abs(a - Math.PI / 2) < 1.0) rivets.setMatrixAt(k, this._m.makeScale(0, 0, 0)); // (the deck lamps stand in this arc)
      else rivets.setMatrixAt(k, this._m.compose(this._p, this._q.identity(), this._s));
    }
    [guides, rivets].forEach((m) => { m.frustumCulled = false; m.layers.set(1); door.add(m); });
    // the coin slot at twelve o'clock
    const slot = new THREE.Group();
    slot.position.set(0, MEMORY_SLOT_R, 0.3);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, 0.3), gold); // a brass escutcheon, the slot cut in a dark inlay
    plate.position.z = 0.15;
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.46, 0.04), steel);
    inlay.position.z = 0.31;
    slot.add(inlay);
    this.slitMat = new THREE.MeshBasicMaterial({ color: neon(0xffd27a, 2) });
    this.slitBase = new THREE.Color(0xffd27a);
    this.slitMiss = new THREE.Color(4, 0.3, 0.25);
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.2), this.slitMat);
    slit.position.z = 0.335;
    slot.add(plate, slit);
    door.add(slot);
    this.slotWorld = new THREE.Vector3(0, Y + MEMORY_SLOT_R, 0.62);
    // light rays leaking from the seam
    this.shafts = new THREE.Mesh(new THREE.RingGeometry(8.5, 19, 240, 1), memoryShaftMaterial());
    this.shafts.position.z = 1.35;
    this.shafts.renderOrder = 6;
    this.shafts.layers.set(1);
    door.add(this.shafts);

    // polished dark floor: a steel deck that gives the vault back (the master overhaul, Phase 2, 2026-11-23: it was a
    // green polar grid on black, a wireframe that shimmered, and on a phone it reflected nothing). The room is drawn
    // once into a cube from in front of the door (roomProbe: a face a frame, a few frames in) and the deck gives it
    // back where each reflected ray meets the room's box (the wall of boxes and the door lie on its back face, so the
    // door's gold and its seam stand in the floor under it), blurred by the deck's roughness; its plates and wear from
    // a CC0 deck plate (Poly Haven's metal_plate_02: assets/ui/mat-deck.webp, a level plate until it arrives). The
    // same on every tier: one look-up a pixel, no second drawing of the scene (the Mac's floor mirror drew the vault
    // again every frame).
    this.probe = roomProbe(new THREE.Vector3(0, 4.2, 11), { size: Assets.phone ? 128 : 256 });
    this.plates = cellFlatTexture();
    this.floorProbeK = 1.35;
    this.floor = makeNeonFloor({
      size: 260, cell: 2.6, line: 0xffb444, lineK: 0.3, base: 0x060312, glow: 0, gridAlpha: 0, ripple: 0, streak: 0,
      probe: { map: this.probe.map, min: new THREE.Vector3(-80, 0, -1.25), max: new THREE.Vector3(80, 46, 70), at: this.probe.at, k: this.floorProbeK, rough: 0.15 },
      plates: { map: this.plates, size: 10, k: 0.25 },
    });
    s.add(this.floor);
    // a threshold under the door, and the shade the door and its frame lay on the floor in front of it
    const sill = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.5, 2.0), steel);
    sill.position.set(0, 0.25, 0.7);
    const sillLip = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.08, 0.12), gold);
    sillLip.position.set(0, 0.5, 1.66);
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ float a = (1.0 - smoothstep(0.25, 1.0, abs(vUv.x - 0.5) * 2.0)) * smoothstep(0.0, 1.0, vUv.y); gl_FragColor = vec4(0.0, 0.0, 0.0, 0.78 * a * a); }",
    }));
    shade.rotation.x = -Math.PI / 2;
    shade.position.set(0, 0.035, 5.7);
    shade.renderOrder = 3;
    shade.layers.set(1);
    s.add(sill, sillLip, shade);
    const pool = makeLightPool({ color: 0xffb84d, radius: 11, intensity: 0.12 });
    pool.position.set(0, 0.02, 1.5);
    pool.layers.set(1);
    s.add(pool);
    const lieOnFloor = [this.floor, shade, pool]; // (what lies on the floor is not in its reflection: see the probe)

    // gold: a heap of bars in each lower corner of the window (as it stood when you came in), and in the middle, on
    // a plinth at the door's foot, the bars this session has banked: one for every card, laid end-on in a pyramid
    const ingot = memoryIngotGeometry(), S = 1.3, SB = 1.6, tone = new THREE.Color();
    const cast = (m, i, k = 1) => m.setColorAt(i, tone.setScalar(rand(0.86, 1.06) * k)); // no two bars poured quite alike
    this.stacks = [-1, 1].map((sd) => {
      const st = new THREE.InstancedMesh(ingot, barGold, 6);
      let n = 0;
      for (let L = 0; L < 3; L++) for (let i = 0; i < 3 - L; i++) {
        st.setMatrixAt(n, this._m.compose(this._p.set((i - (2 - L) / 2) * 2.04 * S, L * 0.57 * S, 0), this._q.setFromAxisAngle(THREE.Object3D.DefaultUp, rand(-0.05, 0.05)), this._v.set(S, S, S)));
        cast(st, n++, 0.86); // (the heaps in the corners are dressing: they sit a little darker than the bars you bank)
      }
      st.instanceColor.needsUpdate = true;
      st.frustumCulled = false;
      st.rotation.y = -sd * 0.3;
      const cone = makeLightCone({ color: 0xffe2a8, top: 0.25, bottom: 2.8, height: 20, intensity: 0.04 }); // (a shaft you can see, not a haze over the gold)
      cone.position.set(0, 20, 0);
      cone.layers.set(1);
      const glow = makeLightPool({ color: 0xffd27a, radius: 5.2, intensity: 0.035 });
      glow.layers.set(1);
      lieOnFloor.push(glow);
      const g = new THREE.Group();
      g.add(st, cone, glow);
      s.add(g);
      g.userData.side = sd;
      g.userData.bars = st;
      return g;
    });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.34, 4.0), steel);
    plinth.position.set(0, 0.17, 6.3);
    const plinthLip = new THREE.Group();
    [[0, 8.26, 10.8, 0.14], [0, 4.34, 10.8, 0.14], [-5.33, 6.3, 0.14, 4.0], [5.33, 6.3, 0.14, 4.0]].forEach(([x, z, w, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), gold); m.position.set(x, 0.35, z); plinthLip.add(m); });
    // the plinth's front edge is a line of the bank's own light: where your gold goes is the lit place in the vault (in
    // the vault's second colour, orange: it was lime, a third neon in a gold room)
    const plinthGlow = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: neon(0xff8a2a, 2.2) }));
    plinthGlow.position.set(0, 0.2, 8.34);
    s.add(plinth, plinthLip, plinthGlow);
    this.bank = new THREE.InstancedMesh(ingot, barGold, DECK_SIZE);
    this.bankRest = [];
    [6, 5, 4, 3, 2].forEach((w, L) => { for (let i = 0; i < w; i++) this.bankRest.push({ p: new THREE.Vector3((i - (w - 1) / 2) * 1.6, 0.34 + L * 0.9, 6.3), q: new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DefaultUp, Math.PI / 2 + rand(-0.04, 0.04)) }); });
    this.bankScale = new THREE.Vector3(SB, SB, SB);
    for (let i = 0; i < DECK_SIZE; i++) { const r = this.bankRest[Math.min(i, this.bankRest.length - 1)]; this.bank.setMatrixAt(i, this._m.compose(r.p, r.q, this.bankScale)); cast(this.bank, i); }
    this.bank.instanceColor.needsUpdate = true;
    this.bank.count = 0;
    this.bank.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bank.frustumCulled = false;
    s.add(this.bank);
    const bankGlow = makeLightPool({ color: 0xffd27a, radius: 7.5, intensity: 0.16 });
    bankGlow.position.set(0, 0.37, 6.6);
    bankGlow.layers.set(1);
    s.add(bankGlow);
    lieOnFloor.push(bankGlow);

    this.motes = makeMotes({ count: 80, box: [40, 18, 18], center: [0, 9, 6], color: 0xffe2a8, size: 0.13, k: 1.1 });
    this.motes.layers.set(1);
    s.add(this.motes);
    this.sparks = new MemorySparks(260);
    s.add(this.sparks.points);
    this.glintT = 0.5;
    // the floor's reflection leaves out the floor and what lies on it, and what moves through the air (it is drawn
    // once: the dust and the sparks would hang in it)
    this.probe.hide = lieOnFloor.concat([this.motes, this.sparks.points]);
    this.probeIn = 3; // (drawn a few frames in, once the screen's lights are made: see update)

    this.coinTex = memoryCoinTexture();
    this.coinGeo = memoryCoinGeometry();
    this.coinMat = new THREE.MeshStandardMaterial({ color: 0xffc85c, metalness: 1, roughness: 0.2, envMap: env, envMapIntensity: 1.8, emissive: 0x4f2e00, bumpMap: this.coinTex, bumpScale: 0.02 });
    if (this.gen && this.gen.coin) { // the generated token in place of the turned one, flying and in the piles
      this.coinTex.dispose(); this.coinGeo.dispose(); this.coinMat.dispose();
      this.coinTex = null; this.coinGeo = this.gen.coin.geo; this.coinMat = this.gen.coin.mat;
    }
    this.warmExtra = [new THREE.Mesh(this.coinGeo, this.coinMat)]; // drawn once off-screen at start (GFX.warm)
    // the coins lying in the piles by the bullion: the same gold, lifted (lying flat they mirror the middle of the
    // vault's ceiling, its darkest part, and read as brown lumps: the master overhaul, Phase 2, 2026-11-23)
    const pile = this.coinMat.clone();
    pile.envMapIntensity = this.coinMat.envMapIntensity * 1.4;
    pile.emissive = new THREE.Color(0x3c2405);

    this.works = new MemoryWorks(this, { gold, steel, chrome, brass, nickel, pile }); // the lock's movement, deck lamps, coin piles (23b-memoryworks.js)
    this.open = 0; // eased share of the deck banked: drives bolts, glow and lit boxes
    this.flash = 0; // a deposit's flash, decaying
    this.slotFlash = 0;
    this.dist = 22;
    s.userData.lightBudget = { dir: 2, point: 2 }; // (the lights this screen draws: the key and a rim; the warm fill and the vault's seam. See LightPool in 04-gfx.js)
    s.userData.post = { exposure: 1.12, bloom: 0.6, threshold: 1.18, saturation: GRADE.saturation, contrast: GRADE.contrast, vignette: 1.05, split: 0.2, // (Phase 5: the gold vault under the neon world's light: its shadows lean violet, its gold less hot)
      ao: 0.85, shadow: 0.6, shadowLen: 0.1, sun: [0.2, 1, 0.6], dirt: 0.18, sharpen: 0.45, fringe: 0.2 };
    this.camBase.set(0, MEMORY_EYE_Y, this.dist);
    this.lookAt.set(0, MEMORY_EYE_Y, 0);
  }
  // Dolly back until the whole door, the lamps over it and the gold at its foot stand in the window above the
  // card (the door used to sit behind the card, where only slivers of it showed).
  onResize(w, h) {
    if (!this.camera || !this.door) return;
    const card = this.el && $(".card3d", this.el), win = this.el && $(".vault-window", this.el);
    this.cardW = card ? card.offsetWidth : Math.min(w - 32, 560);
    this.cardH = card ? card.offsetHeight : 360;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const bh = Math.max(60, win ? win.offsetHeight : h * 0.34), bw = win ? win.offsetWidth : w - 32;
    // tall enough for the lamps' arc and the floor, wide enough for the door's frame
    this.dist = clamp(Math.max((12.9 * h) / (tanH * bh), (12.6 * h) / (tanH * bw)), 26, 170);
    this.scene.fog.near = this.dist + 8;
    this.scene.fog.far = this.dist + 73;
    // the gold stands either side of the door's foot, as far out as the window shows
    const half = (this.dist * tanH * bw) / h;
    this.stacks.forEach((g) => { g.position.set(g.userData.side * clamp(half - 5.0, 7.4, 13.4), 0, 3.0); });
  }
  placeBolts() {
    for (let k = 0; k < MEMORY_BOLTS; k++) {
      const a = this.boltAng[k], r = lerp(8.62, 7.3, this.boltK[k]);
      this._p.set(Math.cos(a) * r, Math.sin(a) * r, 0.86);
      this._q.setFromAxisAngle(this._z, a - Math.PI / 2);
      this.bolts.setMatrixAt(k, this._m.compose(this._p, this._q, this._s));
    }
    this.bolts.instanceMatrix.needsUpdate = true;
  }
  start() {
    Sound.play("memory"); // (its own recording when served; else the calm tune, as before)
    if (!this.total) {
      UI.toast("NO CARDS HERE YET");
      return this.quit();
    }
    this.state = "front";
    this.render();
    requestAnimationFrame(() => { if (!this.unmounted) this.setBand($(".vault-window", this.el)); });
  }
  get card() { return F_BY_ID.get(this.queue[0]); }
  render() {
    const f = this.card;
    if (!f) return this.finish();
    this.flipped = false;
    if (this.gen) { this.gen.dealK = 1; memoryGenFly(this, "deal"); } // (the deck gives up a card, seen flying into place: look only)
    const card = $("[data-card]", this.el);
    // Snap back to the front without animating, or the next card's answer flashes by. The fly-away of the card
    // before it is cut off first: it has a frame or two left to run, turned to its answer side.
    if (card.getAnimations) card.getAnimations().forEach((a) => a.cancel());
    card.style.transition = "none";
    card.classList.remove("flipped");
    void card.offsetWidth;
    card.style.transition = "";
    const front = this.reverse ? f.back : f.front;
    const back = this.reverse ? f.front : f.back;
    const box = Store.box(f.id);
    const status = ["NEW", "MISSED LAST TIME", "LEARNING", "REVIEW", "BANKED", "BANKED"][box];
    const touch = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
    card.innerHTML = `<div class="face front" style="--c:${CH(f.ch).color}">
        <div class="ftop"><span class="ftopic">${esc(f.topic)}</span><span class="fchip">${status}</span></div>
        <div class="fmain selectable${front.length <= 44 ? " short" : ""}">${esc(front)}</div>
        <div class="fhint">${touch ? "TAP TO FLIP" : "CLICK OR PRESS SPACE TO FLIP"}</div>
      </div>
      <div class="face back">
        <div class="ftop"><span>${esc(this.reverse ? "TERM" : "ANSWER")}</span><span>BOOK P. ${esc(f.page)}</span></div>
        <div class="fmain selectable">${esc(back)}</div>
        <div class="fhint">${touch ? (this.done < 3 ? "<span class=\"lead\">OR SWIPE:</span> <span>LEFT MISSED ·</span> <span>RIGHT GOT IT ·</span> <span>UP EASY</span>" : "") : "<span>1 MISSED ·</span> <span>2 GOT IT ·</span> <span>3 EASY</span>"}</div>
      </div>`;
    $("[data-grade]", this.el).innerHTML = `<button class="btn" data-act="flip" style="--c:${COLORS.cyan};grid-column:1/-1">FLIP CARD</button>`;
    UI.text($("[data-pos]", this.el), `CARD ${Math.min(this.done + 1, this.total)}/${this.total}`);
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
      this.pulse("[data-dep]", "bank");
    }
    Store.save();
    Trophies.check();
    this.state = "next";
    const card = $("[data-card]", this.el);
    // say what just happened, where the card was (the coin and the vault's answer follow in the scene)
    const cr = card.getBoundingClientRect();
    UI.floater(kind === "again" ? "BACK IN THE DECK" : "BANKED", cr.left + cr.width / 2 - (kind === "again" ? 96 : 36), cr.top + cr.height * (kind === "again" ? 0.72 : 0.16), kind === "again" ? COLORS.red : COLORS.yellow);
    memoryGenFly(this, kind === "again" ? "again" : "bank"); // (served: the card seen going into the vault, or back onto the deck: look only)
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
      c.scale.setScalar(lerp(lerp(1, 2.6, smoothstep(0.1, 0.5, e)), 1, smoothstep(0.82, 1, e)));
      if (e < 0.96) this.sparks.emit(c.position.x + rand(-0.3, 0.3), c.position.y + rand(-0.3, 0.3), c.position.z - 0.1, rand(-0.4, 0.4), rand(-0.6, 0.2), 0, rand(0.4, 0.7), rand(0.2, 0.4), trail, -1.5);
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
  // Up from the card below the window, out to one side, over the door and down into the slot. Waypoints are
  // placed in screen space.
  coinPath(side) {
    const D = this.dist, H = GFX.h, Y = MEMORY_DOOR_Y;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    // a point dx, dy pixels from the band centre, d units in front of the camera
    const at = (dx, dy, d) => { const k = (2 * d * tanH) / H; return new THREE.Vector3(dx * k, MEMORY_EYE_Y - dy * k, D - d); };
    const bh = this.band ? this.band.h : 300, out = Math.min(GFX.w * 0.3, 130);
    const slot = this.slotWorld;
    return new THREE.CatmullRomCurve3([
      at(side * 14, bh / 2 + 34, D * 0.16), // from under the window's sill, close to the lens
      at(side * out, bh * 0.2, D * 0.42),
      at(side * out * 0.7, -bh * 0.36, D * 0.76),
      new THREE.Vector3(side * 0.8, slot.y + 1.0, slot.z + 1.8),
      slot.clone(),
    ], false, "centripetal");
  }
  // One more bar on the pile in the middle, at the door's foot: dropped from above its place, with a ring of sparks.
  addBar() {
    const st = this.bank;
    if (!st || st.count >= this.bankRest.length) return;
    const i = st.count++, r = this.bankRest[i], p = new THREE.Vector3();
    const put = (lift) => { st.setMatrixAt(i, this._m.compose(p.copy(r.p).setY(r.p.y + lift), r.q, this.bankScale)); st.instanceMatrix.needsUpdate = true; };
    if (REDUCED_MOTION) return put(0);
    put(3.6);
    this.tw.add(0.46, (k) => put(3.6 * (1 - k)), () => {
      put(0);
      const hot = neon(0xfff3d6, 3), gold = neon(0xffc35a, 2.4);
      for (let n = 0; n < 12; n++) this.sparks.emit(r.p.x + rand(-0.8, 0.8), r.p.y + 0.7, r.p.z + 1.7, rand(-2.4, 2.4), rand(1.5, 4.5), rand(0, 1.5), rand(0.4, 0.75), rand(0.2, 0.42), n % 3 ? gold : hot, -7);
      this.sparks.emit(r.p.x, r.p.y + 0.6, r.p.z + 1.8, 0, 0, 0, 0.3, 2.6, hot); // one bright glint where it lands
    }, Ease.outBounce || ((k) => k * k));
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
    this.works.banked(); // the lock goes home: the movement spins on, the card's lamp lights
    this.addBar();
    this.pulse(".vault-window", "bank");
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
  // One pulse of a class on an element of the screen (the window's frame, the BANKED counter).
  pulse(sel, cls) {
    const el = this.el && $(sel, this.el);
    if (!el) return;
    el.classList.remove("bank", "miss");
    void el.offsetWidth;
    el.classList.add(cls);
  }
  // A miss: the dial jerks back like a wrong combination and the slot dims red.
  wrongCombo() {
    if (!this.has3D) return;
    const base = this.dialA;
    this.tw.add(0.7, (e, raw) => { this.dialA = base + 0.1 * Math.sin(raw * Math.PI * 4) * (1 - raw); }, () => { this.dialA = base; }, Ease.linear);
    this.slotFlash = -1;
    this.works.missed(); // the movement jerks back, the unlit lamps turn red
    this.pulse(".vault-window", "miss");
    this.shake(0.22 * (this.dist / 22));
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
    this.flash *= Math.pow(0.0006, dt); // (a deposit's flash is over in four tenths of a second)
    this.slotFlash *= Math.pow(0.02, dt);
    // the dial: a slow drift plus the spins of each deposit
    this.dialA -= dt * 0.03;
    this.dial.rotation.z = this.dialA;
    this.wheel.rotation.z = -this.open * Math.PI * 0.5;
    this.placeBolts();
    // the vault glows brighter the more of the deck is banked
    const g = 1 + 0.45 * this.open + 1.3 * this.flash + 0.06 * Math.sin(t * 2.1);
    this.seamMat.color.copy(this.seamBase).multiplyScalar(0.92 * g);
    this.halo.material.opacity = 0.06 + 0.07 * this.open + 0.14 * this.flash;
    this.shafts.material.uniforms.uI.value = 0.05 + 0.1 * this.open + 0.22 * this.flash;
    this.wall.material.uniforms.uGlow.value = 0.22 + 0.12 * this.open + 0.2 * this.flash;
    this.wall.material.uniforms.uLit.value = this.open * 0.55;
    // the floor's reflection is drawn once, so the vault's glow in it follows the vault's own (banked, a deposit's flash)
    this.floor.material.uniforms.uProbe.value.x = this.floorProbeK * (0.9 + 0.22 * this.open + 0.5 * this.flash);
    const sf = this.slotFlash;
    this.slitMat.color.copy(this.slitBase).multiplyScalar(1.6 + 0.3 * Math.sin(t * 3) + 7 * Math.max(0, sf));
    if (sf < 0) this.slitMat.color.lerp(this.slitMiss, -sf);
    this.vaultLight.intensity = 0.6 + 0.4 * this.open + 0.6 * this.flash;
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
        if (this.bank.count && Math.random() < 0.5) this.sparks.emit(rand(-4.2, 4.2) * Math.min(1, this.bank.count / 6), rand(0.7, 1.4), 8.1, 0, 0, 0, 0.45, rand(0.5, 0.9), hot);
        else this.sparks.emit(st.position.x + rand(-3, 3), rand(0.5, 2.0), st.position.z + rand(0.2, 0.9), 0, 0, 0, 0.45, rand(0.45, 0.8), hot);
      }
    }
    { const k = this.dist / 22;
      this.camBase.set(Pointer.x * 0.7 * k, MEMORY_EYE_Y + (0.12 * Math.sin(t * 0.45) - Pointer.y * 0.35) * k, this.dist); }
    this.lookAt.set(0, MEMORY_EYE_Y, 0);
    this.placeCamera();
    this.motes.userData.drift(t);
    this.works.update(dt, t);
    this.sparks.update(dt, this.camera);
    memoryGenUpdate(this, dt);
    FX.sync(this.scene, t);
    this.takeSurfaces();
  }
  // The floor's reflection (a face of the room's cube a frame, a few frames in: the screen's lights are made at its
  // first drawing) and the two CC0 pictures as they arrive (the deck's plates, the boxes' brushed steel). Once the
  // steel has come, the room is drawn into the cube once more, so the floor gives back brushed doors.
  takeSurfaces() {
    if (this.plates && !this.platesIn) { const img = Assets.ui("mat-deck"); if (img) { this.plates.image = img; this.plates.needsUpdate = true; this.platesIn = true; } }
    if (this.brush && !this.brushIn) { const img = Assets.ui("mat-steel"); if (img) { this.brush.image = img; this.brush.needsUpdate = true; this.brushIn = true; if (this.probe && this.probe.made) this.probe.capture(); } }
    if (!this.probe) return;
    if (this.probeIn > 0 && --this.probeIn === 0) this.probe.capture();
    this.probe.step(this.scene, this.camera.layers.mask);
  }
  // the floor's reflection drawn whole at once (for a test's stills: the capture tool draws only the frames it keeps,
  // so a face a frame would never be drawn there; the game itself draws every frame. See HallScene.probeNow)
  probeNow() {
    if (!this.probe) return;
    this.takeSurfaces();
    this.probeIn = 0;
    this.probe.capture();
    while (this.probe.left) this.probe.step(this.scene, this.camera.layers.mask);
  }
  // Free what the scene graph walk misses: the env target, the textures that are not
  // a material's `map`, instance buffers, and the coin parts (shared, maybe not in the scene).
  dispose() {
    if (this.envRT) this.envRT.dispose();
    if (this.probe) this.probe.dispose();
    if (this.plates) this.plates.dispose(); // (not a material's map: the walk below misses them)
    if (this.brush) this.brush.dispose();
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
