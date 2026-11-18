// The title, served (the owner, 2026-11-17): a containment hall. The player walks into a dark vault gallery where the
// bosses of the arcade stand captured in glowing stasis pods, two to each of its six worlds. Each pair stands in its
// world's light (its lamp, its glass, the strips on its pillars) before two windows onto that world's own sky: Risk
// Blaster's nebula, Nest Egg Run's dusk, Boss Rush's storm, Memory Bank's vault, Strategy Guide's archive and, last,
// by the vault, Final Exam's moonlit hall. At the end of the hall stand the vault door, two arcade cabinets and the
// trophy stand. A slow glide down the aisle ends on the logo and INSERT COIN (a tap hurries it there); INSERT COIN
// rushes the vault and opens onto the arcade floor. The bosses breathe in their idle and turn their heads after the
// lens; now and then one rattles its pod: a short fit, its lights flare, its glass and lamp flicker, a growl far off.
// Everything generated comes in as it arrives: the hall is built at once and each boss steps into its pod (the pod
// flares) when its file has come; one piece at a time, each over a few frames (see takeArrivals). Opened from disk, with nothing generated, the title is the old avenue (10-title.js).
// Budget (stated in perf-report.js): one key light and three point lights drawn (LightPool picks the three strongest
// of the worlds' seven lamps, each as bright as it is near the lens); no shadows, no floor mirror; the pods, their
// glass, struts and floor glows instanced (four draws for all twelve); each boss one skinned mesh per material (its
// thirty parts made one: two draws); under 60 draws in all, under 300K triangles. Far cells are drawn with less: past
// 22 m a boss drops its joint caps and moves ten times a second, not every frame; past 50 m, or out of the picture,
// it is not drawn or moved at all (its pod's glow stands for it in the haze); past 64 m, or out of the picture, a pod's
// base and cap are left out of their draw; the end of the hall is not drawn until the haze gives it up (62 m). At LOW
// (GFX.extras off) bosses past 34 m are not drawn, only those within 22 m move, and none rattles. Reduced effects: no
// glide (a still view of the end of the hall, the logo up at once), no rattles or flicker, the heads still, the idles
// slowed.
const HALL_WORLDS = [
  // win: the world's sky (assets/ui, a small copy of its panorama); at: the place in it [u, v] that each window shows,
  // the left wall's and the right's (the nebula's two clouds; the dusk's low sun and its high clouds; the storm's
  // lightning and its white squall; the vault's gold and its wheel; the archive's shelves and its stained glass; the
  // exam hall's arch and its moon); col, col2: its two colours; its two bosses (the chapters in order down the hall,
  // the Proctor last, by the vault); sky: the place its skylight shows (the nebula; the dusk's great arc of cloud; the
  // storm's lightning; the vault's gold-rimmed ceiling; the archive's lit arches; the exam hall's moon)
  { id: "blaster", win: "win-blaster", sky: [0.15, 0.7], at: [[0.15, 0.5], [0.8, 0.52]], col: 0x35efff, col2: 0xa65fff, bosses: ["boss-1-t", "boss-2-t"], roar: ["roar_1", "roar_2"] },
  { id: "racer", win: "win-racer", sky: [0.3, 0.72], at: [[0.3, 0.55], [0.94, 0.62]], col: 0xff8a3d, col2: 0xff3ad4, bosses: ["boss-3-t", "boss-4-t"], roar: ["roar_3", "roar_4"] },
  { id: "boss", win: "win-boss", sky: [0.66, 0.75], at: [[0.66, 0.6], [0.37, 0.55]], col: 0xa66bff, col2: 0x35efff, bosses: ["boss-5-t", "boss-6-t"], roar: ["roar_5", "roar_6"] },
  { id: "memory", win: "win-memory", sky: [0.6, 0.85], at: [[0.83, 0.47], [0.6, 0.5]], col: 0xffc04a, col2: 0xff8a3d, bosses: ["boss-7-t", "boss-8-t"], roar: ["roar_7", "roar_8"] },
  { id: "guide", win: "win-guide", sky: [0.5, 0.85], at: [[0.5, 0.47], [0.93, 0.5]], col: 0xffb86a, col2: 0x4dffa6, bosses: ["boss-9-t", "boss-10-t"], roar: ["roar_9", "roar_10"] },
  { id: "exam", win: "win-exam", sky: [0.72, 0.66], at: [[0.45, 0.55], [0.72, 0.58]], col: 0x8fb4ff, col2: 0xa66bff, bosses: ["boss-11-t", "boss-all-t"], roar: ["roar_11", "roar_all"] },
];
// the hall in metres: the first world's middle (z0) and the step between worlds, the pods' distance from the aisle's
// middle, the walls, the end wall, the pod (glass radius, height), the most a boss may stand in one, how far each
// boss turns from the aisle toward the door, and the distances at which a far cell is drawn with less (see the top)
const HALL = { z0: -6, step: 12, podX: 4.4, wallX: 7.8, endZ: -78, podR: 1.15, podH: 5.0, bossH: 3.0, bossW: 2.2, turn: 0.5, near: 22, far: 50 };

// A boss built as rigid parts on a moving skeleton (process-rigged: a mesh a part, each hung on its bone) made one
// skinned mesh per material: every corner of a part rides its bone with full weight. The bones and the clips are
// untouched, and the boss draws in two calls, not thirty. A step a material (it yields between them, so the work is
// spread over frames). Returns { meshes, head, headK } or null (nothing to merge).
function* hallSkinSteps(model) {
  const root = model.scene;
  root.updateMatrixWorld(true);
  const prims = [];
  root.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) prims.push(o); });
  if (!prims.length) return null;
  const boneOf = (o) => { let p = o.parent; while (p && /^part_/.test(p.name)) p = p.parent; return p || root; };
  const bones = [], bi = new Map(), byMat = new Map();
  for (const m of prims) {
    const b = boneOf(m);
    if (!bi.has(b)) { bi.set(b, bones.length); bones.push(b); }
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat).push(m);
  }
  const unit = (a) => { const r = a.array; return !a.normalized ? 1 : r instanceof Int8Array ? 1 / 127 : r instanceof Uint8Array ? 1 / 255 : r instanceof Int16Array ? 1 / 32767 : r instanceof Uint16Array ? 1 / 65535 : 1; };
  const v = new THREE.Vector3(), N = new THREE.Matrix3(), made = [];
  for (const [mat, list] of byMat) {
    let nv = 0, ni = 0;
    for (const m of list) { const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), si = new Uint16Array(nv * 4), sw = new Float32Array(nv * 4), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let o = 0, oi = 0;
    for (const m of list) {
      const g = m.geometry, P = g.attributes.position, NO = g.attributes.normal, UV = g.attributes.uv, n = P.count, b = bi.get(boneOf(m));
      N.getNormalMatrix(m.matrixWorld);
      let k = unit(P);
      for (let i = 0; i < n; i++) { v.set(P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k).applyMatrix4(m.matrixWorld); const j = (o + i) * 3; pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z; si[(o + i) * 4] = b; sw[(o + i) * 4] = 1; }
      if (NO) { k = unit(NO); for (let i = 0; i < n; i++) { v.set(NO.getX(i) * k, NO.getY(i) * k, NO.getZ(i) * k).applyMatrix3(N).normalize(); const j = (o + i) * 3; nor[j] = v.x; nor[j + 1] = v.y; nor[j + 2] = v.z; } }
      if (UV) { k = unit(UV); for (let i = 0; i < n; i++) { uv[(o + i) * 2] = UV.getX(i) * k; uv[(o + i) * 2 + 1] = UV.getY(i) * k; } }
      if (g.index) { const I = g.index; for (let i = 0; i < I.count; i++) idx[oi + i] = I.getX(i) + o; oi += I.count; } else { for (let i = 0; i < n; i++) idx[oi + i] = i + o; oi += n; }
      o += n;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    geo.boundingSphere.radius *= 1.6; // (an arm flung out in a rattle reaches past the rest pose)
    mat.skinning = true;
    made.push({ geo, mat, caps: /_2$/.test(list[0].name) });
    yield;
  }
  // the parts go (their own geometry with them), then the part nodes they hung from; the skinned meshes ride the
  // model's root, bound as it stands now
  for (const m of prims) { m.geometry.dispose(); if (m.parent) m.parent.remove(m); }
  const empty = [];
  root.traverse((o) => { if (/^part_/.test(o.name) && !o.children.length) empty.push(o); });
  for (const o of empty) if (o.parent) o.parent.remove(o);
  const skeleton = new THREE.Skeleton(bones);
  const meshes = made.map(({ geo, mat, caps }) => { const s = new THREE.SkinnedMesh(geo, mat); s.name = caps ? "hall-caps" : "hall-skin"; root.add(s); s.bind(skeleton, new THREE.Matrix4()); return s; });
  // the bone its head turns on: the head, or (a model built without one, the Inflation Titan) the top of its spine,
  // turning half as far
  const find = (n) => { let f = null; root.traverse((o) => { if (!f && o.name === n) f = o; }); return f; };
  let head = find("Head"), headK = 1;
  if (!head) { head = find("NeckTwist") || find("Neck") || find("Spine02"); headK = 0.5; }
  return { meshes, head, headK };
}

// A model's geometry and pictures let go of (the graphics chip's copies and the decoded pictures themselves) and its
// materials left bare: the title hall's models are not drawn again (the title takes fresh copies when it comes back).
// Decoded, the hall's pictures are some 150 MB; the closing scene's materials, kept a while for their shaders
// (GFX.park), would otherwise hold them for the rest of the visit.
function hallRelease(model) {
  const seen = new Set();
  model.scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      for (const k of DISPOSE_MAPS) {
        const t = m[k];
        if (!t || !t.isTexture) continue;
        t.dispose();
        if (t.image && typeof t.image.close === "function") { try { t.image.close(); } catch (e) { /* already closed */ } }
        m[k] = null;
      }
    }
  });
}

class HallScene extends Scene3D {
  constructor() {
    super({ fov: 58, far: 300, fog: [0x07021c, 12, 66], bg: 0x05010f });
    this.cells = [];
    this.lamps = [];
    this.calm = REDUCED_MOTION || GFX.calm;
    // the glide is the first title of a visit; coming back to the title (from the arcade floor) opens at its end
    const still = this.calm || HallScene.glided;
    HallScene.glided = true;
    this.state = still ? "rest" : "glide"; // glide (from the door), rest (at the end), back and fwd (a slow pull back and in again, after a long rest)
    this.gt = 0; // seconds into the glide (at its own pace; a tap hurries it)
    this.mult = 1;
    this.u = still ? 1 : 0; // where the lens is on its path (0 the door, 1 the end)
    this.rest = 0;
    this.arrived = still;
    this.rattleIn = 6;
    this.push = 0;
    this.power = 0.35; // the hall's lamps: dim until its painted vault (and the light it gives) has come, then up
    this.leaving = false;
    this.taken = []; // (the generated models it has taken: let go of when it closes)
    this.job = null; // (the piece coming in, a step a frame)
    if (!this.has3D) return;
    // The shared pictures the old title made as the page started (the glow, the city's lit windows, the billboards'
    // atlas) are made here too, at the same moment. Each new picture draws an identity from the random numbers; made
    // later, by the first game that needs one, it would draw them in the middle of that game's own dealing, and the
    // seeded regression would deal differently with this title than with the old one. Nothing else depends on it.
    glowTexture(); windowGridTexture(); adTexture();
    const s = this.scene;
    // a stand-in reflection (black) until the painted vault has come: every lit surface's shaders are made with a
    // reflection from the start, so its coming changes no shader (making them all again at once, as the vault arrived,
    // was the glide's one long frame)
    // (made from a black panorama in the same encoding as the painted one, as Assets.loadSky makes its reflection: a
    // reflection made another way is kept in another encoding, and its shaders differ)
    if (GFX.ok) {
      try {
        const black = new THREE.DataTexture(new Uint8Array(8 * 4 * 4), 8, 4, THREE.RGBAFormat);
        black.encoding = THREE.sRGBEncoding; black.mapping = THREE.EquirectangularReflectionMapping; black.needsUpdate = true;
        this.envRT = GFX.pmrem().fromEquirectangular(black);
        black.dispose();
        s.environment = this.envRT.texture;
      } catch (e) { this.envRT = null; }
    }
    s.userData.lightBudget = { dir: 1, point: 3 }; // (see LightPool: the key, and the three strongest of the worlds' seven lamps)
    s.userData.post = { exposure: 1.16, bloom: 0.75, threshold: 1.05, saturation: GRADE.saturation, contrast: GRADE.contrast, vignette: 1.12, split: 0.15,
      ao: 0.75, shadow: 0, dirt: 0.25, mblur: 0.45, sharpen: 0.3, fringe: 0.15 };
    this.key = new THREE.DirectionalLight(0xc6ccff, 0.5);
    this.key.position.set(-3, 14, 8);
    this.key.userData.keep = true;
    s.add(this.key, this.key.target, new THREE.AmbientLight(0x2a1a55, 0.3));
    this.buildRoom();
    this.buildWorlds();
    this.buildEnd();
    this.makePath();
    this.place();
  }
  onResize() { if (this.has3D && this.cells.length) { this.makePath(); this.place(); } }
  // ---- the room: floor, walls, pillars, beams, a ribbed ceiling, window frames and their strips, a ring lamp over
  // each world, the end wall: three draws
  buildRoom() {
    const s = this.scene, box = new THREE.BoxGeometry(1, 1, 1), W = HALL.wallX, Z1 = 9, Z2 = HALL.endZ, len = Z1 - Z2, zc = (Z1 + Z2) / 2, H = 8.8;
    this.floor = makeNeonFloor({ size: 240, cell: 3, line: 0x35efff, lineK: 0.5, base: 0x040110, glow: 0.3, gridAlpha: 0.5, pulse: this.calm ? 0 : 0.35, ripple: 0, streak: 0 });
    s.add(this.floor);
    const metal = new RacerBatch(), glow = new RacerBatch();
    for (const sd of [-1, 1]) {
      metal.add(box, racerM(sd * (W + 0.15), H / 2, zc, 0.3, H, len), 0x0c0820); // the long walls
      glow.add(box, racerM(sd * (W - 0.06), H - 0.08, zc, 0.04, 0.04, len), 0x35efff, 0.7); // a cove of light where they meet the ceiling
      glow.add(box, racerM(sd * (W - 0.02), 0.1, zc, 0.04, 0.05, len), 0x35efff, 1.3); // a skirting strip
      glow.add(box, racerM(sd * (W - 0.02), 7.05, zc, 0.04, 0.05, len), 0xff3ad4, 1.2); // and a cornice strip
      glow.add(box, racerM(sd * 1.7, 0.012, (Z1 + Z2 + 9) / 2, 0.05, 0.01, len - 9), 0x35efff, 0.55); // the aisle's two lines, to the vault
    }
    for (let i = 0; i <= HALL_WORLDS.length; i++) {
      const z = HALL.z0 + HALL.step / 2 - i * HALL.step, a = HALL_WORLDS[Math.max(0, i - 1)], b = HALL_WORLDS[Math.min(HALL_WORLDS.length - 1, i)];
      for (const sd of [-1, 1]) {
        // a pillar between two worlds, its two faces to the aisle lit in each world's colour
        metal.add(box, racerM(sd * (W - 0.5), H / 2, z, 1.0, H, 1.0), 0x161029);
        glow.add(box, racerM(sd * (W - 1.02), 3.5, z + 0.38, 0.04, 6.4, 0.05), a.col, 2.0);
        glow.add(box, racerM(sd * (W - 1.02), 3.5, z - 0.38, 0.04, 6.4, 0.05), b.col, 2.0);
      }
      metal.add(box, racerM(0, (8.0 + H) / 2, z, 2 * W, H - 8.0, 0.8), 0x120c26); // a beam across the aisle
      glow.add(box, racerM(0, 7.97, z, 2 * W - 2.2, 0.04, 0.08), 0xb98cff, 1.0);
      // and between this beam and the next, three slim ribs under the ceiling (across its skylight)
      if (i < HALL_WORLDS.length) for (let r = 1; r <= 3; r++) metal.add(box, racerM(0, H - 0.1, z - r * 3, 2 * W, 0.2, 0.22), 0x110b24);
    }
    metal.add(box, racerM(0, H + 0.1, zc, 2 * W + 0.6, 0.2, len), 0x0a0618); // the ceiling
    // a ring lamp over the aisle in each world's colour, hung from the ceiling (the light it gives is the world's lamp)
    const ring = new THREE.TorusGeometry(0.75, 0.045, 6, 40).rotateX(Math.PI / 2);
    HALL_WORLDS.forEach((Wd, wi) => {
      const z = HALL.z0 - wi * HALL.step;
      glow.add(ring, racerM(0, 5.75, z), Wd.col, 2.6);
      for (const [dx, dz, sx, sz] of [[0, 4.62, 8.7, 0.05], [0, -4.62, 8.7, 0.05], [4.32, 0, 0.05, 9.3], [-4.32, 0, 0.05, 9.3]]) glow.add(box, racerM(dx, H - 0.06, z + dz, sx, 0.04, sz), Wd.col, 1.3); // (its skylight's frame)
      glow.add(ring, racerM(0, 5.75, z, 0.62, 1, 0.62), Wd.col2, 1.6);
      for (const a of [0, 2.09, 4.19]) metal.add(box, racerM(Math.sin(a) * 0.7, (5.75 + H) / 2, z + Math.cos(a) * 0.7, 0.03, H - 5.75, 0.03), 0x2a2440); // (its three hangers)
    });
    ring.dispose();
    // each window's frame, and a thin line of its world's light round it
    HALL_WORLDS.forEach((Wd, wi) => {
      const z = HALL.z0 - wi * HALL.step, x = W - 0.06, w = 4.4, h = 5.2, y = 3.5;
      for (const sd of [-1, 1]) {
        for (const [dy, dz, sy, sz] of [[h / 2 + 0.12, 0, 0.24, w + 0.48], [-h / 2 - 0.12, 0, 0.24, w + 0.48], [0, w / 2 + 0.12, h, 0.24], [0, -w / 2 - 0.12, h, 0.24]]) metal.add(box, racerM(sd * x, y + dy, z + dz, 0.18, sy, sz), 0x1a1430);
        for (const [dy, dz, sy, sz] of [[h / 2 + 0.01, 0, 0.03, w], [-h / 2 - 0.01, 0, 0.03, w], [0, w / 2 + 0.01, h, 0.03], [0, -w / 2 - 0.01, h, 0.03]]) glow.add(box, racerM(sd * (x - 0.1), y + dy, z + dz, 0.02, sy, sz), Wd.col, 1.5);
      }
    });
    // the end wall, the vault door's frame in gold
    const Z = HALL.endZ;
    metal.add(box, racerM(0, H / 2, Z - 0.15, 2 * W + 0.6, H, 0.3), 0x0c0820);
    metal.add(box, racerM(0, 6.85, Z + 0.35, 8.2, 0.7, 0.7), 0x161029);
    glow.add(box, racerM(0, 6.47, Z + 0.72, 7.6, 0.05, 0.05), 0xffc04a, 2.0);
    for (const sd of [-1, 1]) { metal.add(box, racerM(sd * 3.75, 3.35, Z + 0.35, 0.7, 6.7, 0.7), 0x161029); glow.add(box, racerM(sd * 3.38, 3.35, Z + 0.72, 0.05, 6.2, 0.05), 0xffc04a, 1.8); }
    this.metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.42 });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    s.add(new THREE.Mesh(metal.build("color"), this.metalMat), new THREE.Mesh(glow.build("color"), this.glowMat));
    box.dispose();
  }
  // ---- each world: two pods (instanced down the hall), a window onto its sky behind each, its lamp
  buildWorlds() {
    const s = this.scene, n = HALL_WORLDS.length * 2;
    // the glass of all twelve pods in one draw: a clear tube of stasis light, each in its world's colour, each with its own flicker
    const gGeo = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true);
    this.gCol = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.gFlick = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.gFlick.setUsage(THREE.DynamicDrawUsage);
    gGeo.setAttribute("aCol", this.gCol);
    gGeo.setAttribute("aFlick", this.gFlick);
    this.glassU = Object.assign(fogUniforms(), { uK: { value: 1 }, uT: { value: 0 } });
    this.glass = new THREE.InstancedMesh(gGeo, new THREE.ShaderMaterial({
      uniforms: this.glassU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aFlick; varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vCol; varying float vFlick; varying float vDepth;
        void main(){
          #ifdef USE_INSTANCING
          mat4 m = modelMatrix * instanceMatrix;
          #else
          mat4 m = modelMatrix;
          #endif
          vec4 w = m * vec4(position, 1.0);
          vN = normalize(mat3(m) * normal); vV = cameraPosition - w.xyz; vY = position.y + 0.5; vCol = aCol; vFlick = aFlick;
          vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      // (clear glass: a rim of its world's light where it turns from the lens, a column of light rising from its base,
      // a slow band climbing it; a flicker when its boss stirs; fading into the hall's haze far off)
      fragmentShader: `${GLSL_FOG_PARS} uniform float uK; uniform float uT; varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vCol; varying float vFlick; varying float vDepth;
        void main(){
          float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
          float rim = pow(f, 2.6) * 0.75;
          float col = 0.025 + 0.16 * pow(1.0 - vY, 3.2) + 0.1 * pow(vY, 9.0);
          float band = (1.0 - smoothstep(0.0, 0.06, abs(fract(vY * 0.7 - uT * 0.045) - 0.5))) * 0.05;
          float haze = 1.0 - 0.8 * smoothstep(uFogNear, uFogFar * 1.25, vDepth);
          gl_FragColor = vec4(vCol * (rim + col + band) * uK * (1.0 + vFlick) * haze, 1.0);
        }`,
    }), n);
    this.glass.frustumCulled = false; // (an instanced mesh is culled by its first copy's bounds: the twelve span the hall)
    this.glass.renderOrder = 4;
    // the chrome struts round each pod (four a pod: one draw), and a pool of each world's light on the floor (one draw)
    this.struts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8, 1), new THREE.MeshStandardMaterial({ color: 0x9aa3b8, metalness: 1, roughness: 0.25, envMapIntensity: 1.6 }), n * 4);
    this.struts.frustumCulled = false;
    const pGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.pCol = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    pGeo.setAttribute("aCol", this.pCol);
    this.poolU = Object.assign(fogUniforms(), { uK: { value: 1 } });
    this.pools = new THREE.InstancedMesh(pGeo, new THREE.ShaderMaterial({
      uniforms: this.poolU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; varying vec2 vUv; varying vec3 vCol; varying float vDepth;
        void main(){
          #ifdef USE_INSTANCING
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          #else
          vec4 w = modelMatrix * vec4(position, 1.0);
          #endif
          vUv = uv; vCol = aCol; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `${GLSL_FOG_PARS} uniform float uK; varying vec2 vUv; varying vec3 vCol; varying float vDepth;
        void main(){ float r = length(vUv - 0.5) * 2.0; float g = pow(max(0.0, 1.0 - r), 2.2); gl_FragColor = vec4(vCol * g * 0.5 * uK * (1.0 - smoothstep(uFogNear, uFogFar, vDepth)), 1.0); }`,
    }), n);
    this.pools.frustumCulled = false;
    s.add(this.glass, this.struts, this.pools);
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    HALL_WORLDS.forEach((W, wi) => {
      const z = HALL.z0 - wi * HALL.step;
      // the world's lamp, high over the aisle between its pods (drawn when it is among the three strongest)
      const lamp = new THREE.PointLight(W.col, 0, 18, 2);
      lamp.position.set(0, 5.4, z);
      s.add(lamp);
      this.lamps.push({ l: lamp, z, k: 2.4, flick: 0 });
      this.windows(W, z, new THREE.Color(W.col));
      W.bosses.forEach((name, j) => {
        const sd = j === 0 ? -1 : 1, x = sd * HALL.podX, i = this.cells.length;
        // where its boss stands and faces: the aisle, turned a little toward the door the lens comes in by
        const anchor = new THREE.Group();
        anchor.position.set(x, 0, z);
        anchor.rotation.y = -sd * (Math.PI / 2 - HALL.turn);
        s.add(anchor);
        c.set(W.col).toArray(this.gCol.array, i * 3);
        c.set(W.col).lerp(new THREE.Color(W.col2), 0.25).toArray(this.pCol.array, i * 3);
        this.pools.setMatrixAt(i, M.compose(p.set(x, 0.02, z), q.identity(), sc.set(6.4, 1, 6.4)));
        this.cells.push({ world: W, wi, name, sd, x, z, i, anchor, boss: null, mixer: null, head: null, acts: {}, yaw: 0, accum: 0, flick: 0, glowK: 1, mats: null, caps: [] });
      });
    });
    this.pools.instanceMatrix.needsUpdate = true;
    this.podFrame(0.82, 4.25); // (the glass and struts stand on a guess at the pod's base and cap until its model has come)
  }
  // the glass and the struts of every pod, between the top of its base and the foot of its cap
  podFrame(y0, y1) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), R = HALL.podR;
    for (const c of this.cells) {
      this.glass.setMatrixAt(c.i, M.compose(p.set(c.x, (y0 + y1) / 2, c.z), q.identity(), sc.set(R, y1 - y0 + 0.1, R)));
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + (k * Math.PI) / 2 + c.anchor.rotation.y;
        this.struts.setMatrixAt(c.i * 4 + k, M.compose(p.set(c.x + Math.sin(a) * R * 1.03, (y0 + y1) / 2, c.z + Math.cos(a) * R * 1.03), q.identity(), sc.set(1, y1 - y0 + 0.1, 1)));
      }
    }
    this.glass.instanceMatrix.needsUpdate = this.struts.instanceMatrix.needsUpdate = true;
    this.baseTop = y0;
  }
  // a world's windows onto its sky, one draw: two in the walls behind its pods and a skylight over its aisle (on a
  // phone held upright the walls are seen edge on; the ceiling is in sight all down the glide). Each shows its own
  // place in the world's panorama (a window about 95 degrees of it across, the skylight about 110), which shifts a
  // little as the lens passes, as a far land does through a window; thin bars cross the windows, the ceiling's ribs
  // the skylight. Dark until its picture has come; in the hall's haze far off.
  windows(W, z, col) {
    const pos = [], nrm = [], sid = [], up = [], uv = [], at = [], span = [];
    const pane = (c, S, T, N, w, h, A, sp) => {
      for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
        pos.push(c[0] + S[0] * a * w + T[0] * b * h, c[1] + S[1] * a * w + T[1] * b * h, c[2] + S[2] * a * w + T[2] * b * h);
        nrm.push(...N); sid.push(...S); up.push(...T); uv.push(a + 0.5, b + 0.5); at.push(A[0], A[1]); span.push(...sp);
      }
    };
    // (each pane: its middle, its right and its up as one facing it sees them, its normal toward the one facing it)
    for (const sd of [-1, 1]) pane([sd * (HALL.wallX - 0.12), 3.5, z], [0, 0, sd < 0 ? -1 : 1], [0, 1, 0], [-sd, 0, 0], 4.4, 5.2, W.at[sd < 0 ? 0 : 1], [0.26, 0.5, 0]);
    pane([0, 8.76, z], [1, 0, 0], [0, 0, -1], [0, -1, 0], 8.6, 9.2, W.sky, [0.3, 0.36, 1]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aN", new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute("aS", new THREE.Float32BufferAttribute(sid, 3));
    geo.setAttribute("aT", new THREE.Float32BufferAttribute(up, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute("aAt", new THREE.Float32BufferAttribute(at, 2));
    geo.setAttribute("aSpan", new THREE.Float32BufferAttribute(span, 3));
    geo.computeBoundingSphere();
    const mat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), { tSky: { value: null }, uOn: { value: 0 }, uTint: { value: col }, uK: { value: 1 } }),
      side: THREE.DoubleSide,
      vertexShader: `attribute vec3 aN; attribute vec3 aS; attribute vec3 aT; attribute vec2 aAt; attribute vec3 aSpan; varying vec3 vW; varying vec3 vN; varying vec3 vS; varying vec3 vT; varying vec2 vUv; varying vec2 vAt; varying vec3 vSpan; varying float vDepth;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = aN; vS = aS; vT = aT; vUv = uv; vAt = aAt; vSpan = aSpan; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `${GLSL_FOG_PARS} uniform sampler2D tSky; uniform float uOn; uniform vec3 uTint; uniform float uK; varying vec3 vW; varying vec3 vN; varying vec3 vS; varying vec3 vT; varying vec2 vUv; varying vec2 vAt; varying vec3 vSpan; varying float vDepth;
        void main(){
          vec3 d = normalize(vW - cameraPosition);
          vec2 par = clamp(vec2(dot(d, vS), dot(d, vT)) / max(-dot(d, vN), 0.08), -2.5, 2.5) * vec2(0.035, 0.04); // (the depth: the far land shifts as the lens passes)
          vec2 uv = vAt + (vUv - 0.5) * vSpan.xy + par;
          vec3 c = texture2D(tSky, vec2(uv.x, clamp(uv.y, 0.02, 0.98))).rgb;
          c = c * c * (c * 0.305 + 0.695);
          vec3 col = mix(uTint * 0.03, c * mix(1.0, 1.45, vSpan.z) * uK, uOn); // (a window; a skylight a little brighter)
          float bars = (1.0 - vSpan.z) * max(smoothstep(0.004, 0.012, abs(fract(vUv.x * 3.0) - 0.5) - 0.484), 1.0 - smoothstep(0.003, 0.01, abs(vUv.y - 0.62) - 0.003)); // (a window's three panes across and its transom)
          col *= 1.0 - 0.8 * bars;
          col += uTint * 0.06 * (1.0 - vSpan.z) * (1.0 - smoothstep(0.0, 0.35, abs(vUv.x - vUv.y * 0.6 - 0.2))); // (a sheen across a window's glass)
          col *= 1.0 - 0.35 * vSpan.z * (1.0 - smoothstep(0.0, 0.08, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)))); // (a skylight darkens toward its frame)
          gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        }`,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
    W._win = mat; // (its picture is put in when it has come: see takeArrivals)
  }
  // ---- the end of the hall: a warm lamp over it (the vault door, the cabinets and the trophy stand come as they arrive)
  buildEnd() {
    this.endGroup = new THREE.Group(); // (the vault door, the cabinets, the stand and its cup, the shaft of light: not drawn while the haze hides them)
    this.scene.add(this.endGroup);
    const lamp = new THREE.PointLight(0xffc77a, 0, 20, 2), Z = HALL.endZ;
    lamp.position.set(0, 6.2, Z + 9);
    this.scene.add(lamp);
    this.endLamp = { l: lamp, z: Z + 9, k: 3.0, flick: 0, end: true, boost: 0 };
    this.lamps.push(this.endLamp);
    // a shaft of warm light from high over the trophy stand onto its cup (one additive draw, not a light)
    this.shaftU = Object.assign(fogUniforms(), { uCol: { value: new THREE.Color(0xffc77a) }, uK: { value: 0 } });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1.15, 6.4, 32, 1, true), new THREE.ShaderMaterial({
      uniforms: this.shaftU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vY = position.y / 6.4 + 0.5; vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "uniform vec3 uCol; uniform float uK; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 1.6) * pow(1.0 - vY, 1.3) * smoothstep(0.0, 0.1, vY) * 0.2; gl_FragColor = vec4(uCol * a * uK, 1.0); }",
    }));
    shaft.position.set(0, 1.0 + 3.2, Z + 7 - 0.57);
    shaft.renderOrder = 5;
    this.endGroup.add(shaft);
  }
  // ---- the lens's path: from the door down the aisle to where the end of the hall fills the picture. How far back
  // it stops depends on the screen's shape: on a phone held upright (a narrow picture) it stops further back, so the
  // last two pods still stand at the picture's edges either side of the vault; on a wide screen it stops short of
  // them, so they stand either side of the logo.
  makePath() {
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect, last = HALL.z0 - (HALL_WORLDS.length - 1) * HALL.step;
    const endZ = last + clamp(3.9 / Math.max(0.05, tanH), 7, 17), pts = [], N = 6; // (on a wide screen 7 m short of the last pods: they and their windows stand either side of the logo)
    for (let i = 0; i <= N; i++) pts.push(new THREE.Vector3(i === 0 || i === N ? 0 : (i % 2 ? 0.5 : -0.5), 1.85 + 0.4 * (i / N), 7 + (endZ - 7) * (i / N)));
    this.path = new THREE.CatmullRomCurve3(pts);
    this.endLook = new THREE.Vector3(0, 3.0, HALL.endZ + 2);
    this.GLIDE = 34; // seconds, door to end, at the glide's own pace
  }
  // where the lens is and where it looks: on its path at u; turning to the pods it passes (one side, then the other),
  // then up to the vault at the end; with a slow sway once there
  place() {
    const u = clamp(this.u, 0, 1), t = this.t, mv = this.calm ? 0.2 : 1, p = this.path.getPointAt(u);
    this.camBase.copy(p);
    const atEnd = smoothstep(0.8, 1, u);
    if (this.state !== "glide") { this.camBase.x += Math.sin(t * 0.12) * 0.45 * mv; this.camBase.y += Math.sin(t * 0.2) * 0.06 * mv; }
    this.camBase.z -= this.push * (this.calm ? 2 : 9); // (reduced effects: a short step, not a rush)
    const ahead = this.path.getPointAt(Math.min(1, u + 0.1)), si = (HALL.z0 + 7 - p.z) / HALL.step, i = Math.floor(si), f = si - i;
    const side = i % 2 ? -1 : 1, sweep = i >= 0 && i < HALL_WORLDS.length ? (Math.sin(f * Math.PI) * side * 3.0 * mv) / Math.max(1, this.mult * 0.5) : 0;
    this.lookAt.set(ahead.x + sweep, 3.3, ahead.z - 6);
    this.lookAt.lerp(this.endLook, atEnd);
    this.lookAt.x += Math.sin(t * 0.12 + 1) * 0.3 * mv * atEnd + Pointer.x * 1.0;
    this.lookAt.y -= Pointer.y * 0.4;
    this.placeCamera();
  }
  // ---- the generated pieces come in one at a time, each over a few frames, one step a frame: a boss's skin made a
  // material at a time, each of its pictures sent to the graphics chip in a frame of its own, then it alone drawn once
  // off-screen (its shaders made ready), then it steps into its pod. No frame of the glide carries more than one step.
  // (The hall's painted vault changes how every lit surface is shaded: for it the whole hall is drawn once.)
  takeArrivals() {
    if (!Assets.on || this.leaving || this.job) return;
    let piece = null;
    if (!this.sky) { const sky = Assets.sky("title-hall"); if (sky && sky.map) piece = this.skyPiece(sky); }
    if (!piece && !this.podMesh) { const m = this.take("prop-pod"); if (m) piece = this.podPiece(m); }
    if (!piece) for (const W of HALL_WORLDS) if (!W._win.uniforms.tSky.value) { const img = Assets.ui(W.win); if (img) { piece = this.windowPiece(W, img); break; } }
    // (the vault door, the cabinets, the stand and its cup are the arcade floor's models too: the floor's own copies are
    // made ready when it asks for its set, once the glide has arrived: see showTitle)
    if (!piece && !this.vault) { const m = this.take("prop-vault"); if (m) piece = this.propPiece("vault", m, 6.0, 0, 0.05, HALL.endZ + 1.2, { env: 1.6, glow: 1.6 }); }
    if (!piece && !this.cabs) { const m = this.take("prop-cabinet"); if (m) piece = this.cabPiece(m); }
    if (!piece && !this.stand) { const m = this.take("prop-stand"); if (m) piece = this.propPiece("stand", m, 1.13, 0, 0, HALL.endZ + 7, { env: 1.6, glow: 1.4 }); }
    if (!piece && !this.cup && this.stand) { const m = this.take("prop-trophy"); if (m) piece = this.propPiece("cup", m, 0.95, 0, 1.06, HALL.endZ + 7 - 0.57, { env: 3.2, glow: 2.4 }); }
    if (!piece) for (const c of this.cells) if (!c.boss && !c.coming) { const m = this.take(c.name); if (m) { c.coming = true; piece = this.bossPiece(c, m); break; } }
    this.job = piece;
  }
  // a model taken from the loaded files (let go of when the hall closes: see dispose)
  take(name) { const m = Assets.model(name); if (m) this.taken.push(m); return m; }
  // each of a model's pictures sent to the graphics chip, one a frame
  *upload(m) {
    const r = GFX.ok && GFX.renderer, seen = new Set(), maps = [];
    if (!r || !r.initTexture) return;
    m.scene.traverse((o) => { if (o.isMesh) for (const mt of Array.isArray(o.material) ? o.material : [o.material]) for (const k of DISPOSE_MAPS) { const t = mt && mt[k]; if (t && !seen.has(t)) { seen.add(t); maps.push(t); } } });
    for (const t of maps) { try { r.initTexture(t); } catch (e) { /* sent the first time it is drawn instead */ } yield; }
  }
  // a new piece drawn once off-screen and alone (its shaders made, anything left of it sent), under the hall's own
  // lights, so that the lens meeting it costs nothing
  warmNew(objs) {
    if (!GFX.ok || !GFX._warmRT) return;
    const r = GFX.renderer, s = this.scene, keep = new Set(objs), off = [], on = [];
    for (const c of s.children) if (!c.isLight && !keep.has(c) && c.visible) { off.push(c); c.visible = false; }
    for (const o of objs) o.traverse((x) => { on.push(x, x.visible, x.frustumCulled); x.visible = true; x.frustumCulled = false; });
    const mask = this.camera.layers.mask;
    this.camera.layers.mask = ~(1 << LIGHT_LAYER); // (as GFX.warm draws: every layer but the hidden lights')
    try { r.setRenderTarget(GFX._warmRT); r.render(s, this.camera); } catch (e) { /* best effort */ }
    r.setRenderTarget(null);
    this.camera.layers.mask = mask;
    for (const c of off) c.visible = true;
    for (let i = 0; i < on.length; i += 3) { on[i].visible = on[i + 1]; on[i].frustumCulled = on[i + 2]; }
  }
  // the hall's painted vault: its light and reflections only (the hall is closed: the painting itself is never seen).
  // It takes the stand-in's place: the same kind of reflection, so no shader is made again.
  *skyPiece(sky) {
    applySkyEnv(this.scene, sky);
    this.sky = sky;
    if (this.envRT) { this.envRT.dispose(); this.envRT = null; }
    yield;
  }
  // a world's picture, for its windows, its skylight and a cabinet's screen
  *windowPiece(W, img) {
    const t = new THREE.Texture(img);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true; // (it wraps round: a view across the panorama's join shows no seam)
    (this.texs || (this.texs = [])).push(t);
    try { if (GFX.ok && GFX.renderer.initTexture) GFX.renderer.initTexture(t); } catch (e) { /* sent the first time it is drawn instead */ }
    yield;
    W._win.uniforms.tSky.value = t; W._win.uniforms.uOn.value = 1;
  }
  // a prop of the end of the hall: its height in metres, where it stands
  *propPiece(key, m, h, x, y, z, tune) {
    tuneModel(m, tune);
    const o = m.scene;
    o.scale.setScalar(h);
    o.position.set(x, y, z);
    yield* this.upload(m);
    this.endGroup.add(o);
    this.warmNew([this.endGroup]);
    this[key] = o;
  }
  *cabPiece(m) {
    const objs = this.cabinets(m);
    if (!objs) return;
    yield;
    yield* this.upload(m);
    for (const o of objs) this.endGroup.add(o);
    this.warmNew([this.endGroup]);
    this.cabs = objs[0];
  }
  *podPiece(m) {
    const frame = this.podBuild(m);
    if (!frame) return;
    yield;
    yield* this.upload(m);
    this.scene.add(this.podMesh);
    this.warmNew([this.podMesh]);
    const was = this.baseTop;
    this.podFrame(frame[0], frame[1]); // (the glass and struts between its base and cap)
    for (const c of this.cells) if (c.boss) c.boss.position.y += this.baseTop - was; // (a boss already in stands on the base as it really is)
  }
  // the two cabinets either side of the vault, one model drawn twice in one call; on each screen, a world's sky
  cabinets(m) {
    const made = modelGeometry(m);
    if (!made) return null;
    tuneModel(m, { env: 1.4, glow: 1.8 });
    made.geo.deleteAttribute("aRest");
    const cabs = new THREE.InstancedMesh(made.geo, made.mat, 2), objs = [cabs];
    cabs.frustumCulled = false;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(2.6 * 1.15, 2.6, 2.6), Z = HALL.endZ, up = new THREE.Vector3(0, 1, 0);
    this.cabAt = [-1, 1].map((sd, i) => { const at = { x: sd * 4.15, z: Z + 4.2, ry: -sd * 0.5 }; cabs.setMatrixAt(i, M.compose(new THREE.Vector3(at.x, 0, at.z), q.setFromAxisAngle(up, at.ry), S)); return at; });
    // their screens (HUBGEN.SCREEN: where the glass is on the model), each showing a world through its glass
    const SC = HUBGEN.SCREEN;
    this.screens = [];
    this.cabAt.forEach((at, i) => {
      const W = HALL_WORLDS[i ? 1 : 0], mat = new THREE.ShaderMaterial({
        uniforms: { tSky: W._win.uniforms.tSky, uOn: W._win.uniforms.uOn, uAt: { value: new THREE.Vector2(W.at[0][0], W.at[0][1]) }, uT: { value: 0 } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform sampler2D tSky; uniform float uOn; uniform vec2 uAt; uniform float uT; varying vec2 vUv;
          void main(){
            vec3 c = texture2D(tSky, vec2(uAt.x - 0.12 + vUv.x * 0.24 + uT * 0.004, uAt.y - 0.1 + vUv.y * 0.2)).rgb;
            c = c * c * (c * 0.305 + 0.695) * 1.6;
            float scan = 0.82 + 0.18 * sin(vUv.y * 180.0);
            float edge = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.94, 1.0, vUv.x)) * smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y));
            gl_FragColor = vec4(mix(vec3(0.02, 0.04, 0.08), c, uOn) * scan * edge, 1.0);
          }`,
      });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(SC.w * S.x * 0.98, SC.h * S.y * 0.98), mat), g = new THREE.Group();
      g.position.set(at.x, 0, at.z);
      g.rotation.y = at.ry;
      scr.position.set(0, SC.y * S.y, SC.z * S.z + 0.012);
      scr.rotation.x = -SC.tilt;
      g.add(scr);
      objs.push(g);
      this.screens.push(mat);
    });
    return objs;
  }
  // the pod's own base and cap from its model (one geometry, drawn twelve times in one call); its middle, the glass
  // and struts, is the hall's own. The model is set to the pod's glass radius and its cap lifted to the pod's height,
  // so a tall pod keeps its base and cap's own proportions.
  podBuild(m) {
    const made = modelGeometry(m);
    if (!made) return null;
    const g = made.geo, P = g.attributes.position, I = g.index, bb = made.box, h = bb.max.y - bb.min.y, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const lo = 0.25, hi = 0.78; // (the model's base and cap, as a fraction of its height: its middle is the glass and struts)
    const cy = (t) => (P.getY(I.getX(t)) + P.getY(I.getX(t + 1)) + P.getY(I.getX(t + 2))) / 3;
    let rMid = 0;
    for (let t = 0; t < I.count; t += 3) { const y = (cy(t) - bb.min.y) / h; if (y > 0.3 && y < 0.7) for (let j = 0; j < 3; j++) { const k = I.getX(t + j); rMid = Math.max(rMid, Math.hypot(P.getX(k) - cx, P.getZ(k) - cz)); } }
    const s = HALL.podR / Math.max(0.05 * h, rMid || 0.33 * h), lift = HALL.podH - h * s; // (metres a model unit; how far the cap is raised)
    const NO = g.attributes.normal, UV = g.attributes.uv, pos = [], nor = [], uv = [];
    for (let t = 0; t < I.count; t += 3) {
      const y = (cy(t) - bb.min.y) / h;
      if (y >= lo && y <= hi) continue;
      for (let j = 0; j < 3; j++) {
        const k = I.getX(t + j);
        pos.push((P.getX(k) - cx) * s, (P.getY(k) - bb.min.y) * s + (y > hi ? lift : 0), (P.getZ(k) - cz) * s);
        nor.push(NO.getX(k), NO.getY(k), NO.getZ(k));
        if (UV) uv.push(UV.getX(k), UV.getY(k));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    if (uv.length) geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    g.dispose();
    tuneModel(m, { env: 1.5, glow: 2.0 });
    this.podMesh = new THREE.InstancedMesh(geo, made.mat, this.cells.length);
    this.podMesh.frustumCulled = false;
    const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    for (const c of this.cells) c.podM = new THREE.Matrix4().compose(c.anchor.position, q.setFromAxisAngle(up, c.anchor.rotation.y), one);
    this.podSeen = "";
    return [lo * h * s, hi * h * s + lift];
  }
  // a boss into its pod: made one skinned mesh, sized to stand in the glass, its idle started from its own moment;
  // the pod flares as it comes in. (The Probate Tollgate has no skeleton: its hinged parts sway by code.)
  *bossPiece(c, m) {
    const root = m.scene;
    let skin = null;
    if (m.animations && m.animations.length) { try { skin = yield* hallSkinSteps(m); } catch (e) { skin = null; } }
    else { rigModel(m, { tree: { forearmL: "shoulderL", forearmR: "shoulderR", shoulderL: "body", shoulderR: "body" } }); c.rig = m.parts; c.rest = {}; for (const n of ["body", "shoulderL", "shoulderR", "forearmL", "forearmR"]) if (m.parts[n]) c.rest[n] = m.parts[n].rotation.clone(); }
    yield;
    c.mats = tuneModel(m, { env: 1.8, glow: 1.1 });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
    const k = Math.min(HALL.bossH / Math.max(1e-3, size.y), HALL.bossW / Math.max(1e-3, size.x, size.z));
    root.scale.setScalar(k);
    root.position.set((-(box.min.x + box.max.x) / 2) * k, this.baseTop - box.min.y * k, (-(box.min.z + box.max.z) / 2) * k);
    yield* this.upload(m);
    if (skin) { c.head = skin.head; c.headK = skin.headK; c.caps = skin.meshes.filter((x) => x.name === "hall-caps"); if (c.head) c.headRest = c.head.quaternion.clone(); }
    const clips = m.animations || [];
    if (clips.length) {
      c.mixer = new THREE.AnimationMixer(root);
      for (const clip of clips) c.acts[clip.name] = c.mixer.clipAction(clip);
      c.idle = c.acts.idle || c.mixer.clipAction(clips[0]);
      c.idle.play();
      c.idle.time = Math.random() * c.idle.getClip().duration;
      c.idle.timeScale = (this.calm ? 0.55 : 0.85) + Math.random() * 0.2;
      c.headAnim = !!c.head && clips.some((cl) => cl.tracks.some((t) => t.name === c.head.name + ".quaternion"));
      c.mixer.update(0);
    }
    c.phase = Math.random() * 10;
    c.anchor.add(root);
    c.boss = root;
    this.warmNew([c.anchor]);
    c.ready = true;
    c.flick = 1.6; // (its pod flares: the boss is in)
  }
  // a tap during the glide: it hurries to the end (the logo and INSERT COIN arrive with it)
  // (fast enough to cover what is left of it in about two seconds, set at the tap: the glide eases in to its end)
  hurry() {
    if (this.state === "glide") { this.hurrying = true; this.hurryRate = Math.max(this.hurryRate || 1, (this.GLIDE - this.gt) / 1.9); }
    else if (this.state === "back" || this.state === "fwd") { if (this.state === "back") { this.state = "fwd"; this.bt = 22 - this.bt; } this.hurrying = true; }
  }
  // INSERT COIN: the lens rushes the vault, the pods and the vault's lamp surge
  boost() {
    this.leaving = true;
    this.tw.add(0.95, (k) => { this.push = k * k; this.glassU.uK.value = 1 + k * 1.6; this.endLamp.boost = k; }, null, Ease.inCubic);
    GFX.pulse(2, 0.2);
  }
  update(dt) {
    super.update(dt);
    if (!this.has3D) return;
    this.shown = true;
    // the generated pieces: one step of the one coming in, each frame; a look for the next every fifth of a second
    if (!this.leaving) {
      if (this.job) { try { if (this.job.next().done) this.job = null; } catch (e) { this.job = null; } }
      else if (Assets.on && (this.pollT = (this.pollT || 0) - dt) <= 0) { this.pollT = 0.2; this.takeArrivals(); }
    }
    this.power += ((this.sky ? 1 : 0.35) - this.power) * Math.min(1, dt * 1.2); // (the hall powers up when its painted vault has come)
    // the glide from the door, at its own pace (or hurried); the rest at its end; after a long rest a slow pull back
    // and in again
    const ease = (x) => x * x * x * (x * (x * 6 - 15) + 10);
    if (this.pose !== undefined) this.u = this.pose; // (held at a place on the path: tools/perf-report.js measures the hall so)
    else if (this.state === "glide") {
      this.mult += ((this.hurrying ? this.hurryRate : 1) - this.mult) * Math.min(1, dt * 4);
      this.gt = Math.min(this.GLIDE, this.gt + dt * this.mult);
      this.u = ease(this.gt / this.GLIDE);
      if (this.gt >= this.GLIDE) { this.state = "rest"; this.rest = 0; this.hurrying = false; this.mult = 1; }
    } else if (this.state === "rest") {
      this.rest += dt;
      if (this.rest > 45 && !this.calm && !this.leaving) { this.state = "back"; this.bt = 0; }
    } else {
      this.bt += dt * (this.hurrying ? 10 : 1);
      const k = ease(Math.min(1, this.bt / 22));
      this.u = this.state === "back" ? 1 - 0.62 * k : 0.38 + 0.62 * k;
      if (this.bt >= 22) { if (this.state === "back") { this.state = "fwd"; this.bt = 0; } else { this.state = "rest"; this.rest = 0; this.hurrying = false; } }
    }
    if (this.u >= 0.999 && !this.arrived) { this.arrived = true; if (this.onArrive) this.onArrive(); }
    this.place();
    // the lamps: each as bright as it is near what the lens is looking at (the three strongest are the ones drawn)
    const cam = this.camera.position, cz = cam.z;
    for (const L of this.lamps) {
      L.flick = Math.max(0, L.flick - dt * 2.5);
      const near = L.end ? smoothstep(-30, -58, cz) : clamp(1.35 - Math.abs(L.z - (cz - 8)) / 20, 0.06, 1);
      L.l.intensity = L.k * this.power * near * (1 + (L.boost || 0) * 1.5) * (1 + (this.calm ? 0 : L.flick * (Math.sin(this.t * 41) > 0 ? 0.8 : -0.55)));
    }
    this.glassU.uT.value = this.t;
    if (!this.leaving) this.glassU.uK.value = 0.45 + 0.55 * this.power;
    if (this.screens) for (const m of this.screens) m.uniforms.uT.value = this.t;
    if (this.cup) this.cup.rotation.y += dt * 0.35 * (this.calm ? 0.4 : 1);
    this.shaftU.uK.value = this.power * (1 + this.endLamp.boost * 1.5);
    // the bosses: drawn and moved as near as they are; their glass flickers when they stir
    const extras = GFX.extras !== false, far = extras ? HALL.far : 34, f = this._fr || (this._fr = new THREE.Frustum()), mm = this._mm || (this._mm = new THREE.Matrix4()), sph = this._sp || (this._sp = new THREE.Sphere());
    mm.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    f.setFromProjectionMatrix(mm);
    let flicked = false;
    for (const c of this.cells) {
      const fl = this.calm ? 0 : c.flick * (Math.sin(this.t * 33 + c.x * 3) > 0 ? 1.1 : -0.45);
      c.flick = Math.max(0, c.flick - dt * 1.6);
      if (Math.abs(this.gFlick.array[c.i] - fl) > 1e-3) { this.gFlick.array[c.i] = fl; flicked = true; }
      if (!c.boss || !c.ready) continue;
      const d = Math.hypot(c.x - cam.x, c.z - cam.z);
      sph.center.set(c.x, 2.2, c.z); sph.radius = 2.6;
      const show = d < far && f.intersectsSphere(sph);
      c.boss.visible = show;
      if (!show) continue;
      const near = d < HALL.near;
      for (const x of c.caps) x.visible = near; // (past 22 m the joint caps are not drawn)
      // its lights: dim in stasis, flaring as it stirs
      const glow = 1.1 + 1.6 * Math.min(1, c.flick);
      if (c.mats && Math.abs(glow - c.glowK) > 0.02) { c.glowK = glow; for (const m of c.mats) if (m.emissiveMap) m.emissiveIntensity = glow; }
      if (!near && !extras) continue; // (at LOW a far boss holds its pose)
      c.accum += dt;
      if (!near && c.accum < 0.1) continue;
      const step = c.accum;
      c.accum = 0;
      if (c.mixer) {
        c.mixer.update(step);
        // the head turns to follow the lens, a little (at most about 35 degrees each way), over what the idle does
        if (c.head && near && !this.calm) {
          if (!c.headAnim && c.headRest) c.head.quaternion.copy(c.headRest);
          const v = this._v || (this._v = new THREE.Vector3()), q = this._q || (this._q = new THREE.Quaternion()), axis = this._ax || (this._ax = new THREE.Vector3());
          c.boss.getWorldPosition(v);
          let want = Math.atan2(cam.x - v.x, cam.z - v.z) - c.anchor.rotation.y;
          want = Math.atan2(Math.sin(want), Math.cos(want));
          c.yaw += (clamp(want, -0.6, 0.6) * (c.headK || 1) - c.yaw) * Math.min(1, step * 2.2);
          c.head.parent.getWorldQuaternion(q).invert();
          axis.set(0, 1, 0).applyQuaternion(q).normalize();
          c.head.quaternion.premultiply(q.setFromAxisAngle(axis, c.yaw));
        }
      } else if (c.rig) this.sway(c, this.t);
    }
    if (flicked) this.gFlick.needsUpdate = true;
    // the pods' bases and caps: only those near enough and in the picture go into their draw
    if (this.podMesh) {
      let seen = "", k = 0;
      for (const c of this.cells) { sph.center.set(c.x, 2.5, c.z); sph.radius = 3.2; c.podIn = Math.hypot(c.x - cam.x, c.z - cam.z) < 64 && f.intersectsSphere(sph); seen += c.podIn ? "1" : "0"; }
      if (seen !== this.podSeen) { this.podSeen = seen; for (const c of this.cells) if (c.podIn) this.podMesh.setMatrixAt(k++, c.podM); this.podMesh.count = k; this.podMesh.instanceMatrix.needsUpdate = true; }
    }
    // the end of the hall: drawn once the haze gives it up
    this.endGroup.visible = cam.z - HALL.endZ < 62;
    // now and then a boss near the lens rattles its pod (not at LOW, not with reduced effects)
    if (extras && !this.calm && !this.leaving && (this.rattleIn -= dt) <= 0) {
      this.rattleIn = 7 + Math.random() * 7;
      const near = this.cells.filter((c) => c.boss && c.boss.visible && Math.hypot(c.x - cam.x, c.z - cam.z) < HALL.near + 4);
      if (near.length) this.rattle(near[Math.floor(Math.random() * near.length)]);
    }
    FX.sync(this.scene, this.t);
  }
  // the Probate Tollgate in stasis: it rocks a little on its tracks, its arms sway; in a rattle it jolts and its
  // barrier lifts
  sway(c, t) {
    const P = c.rig, R = c.rest, k = this.calm ? 0.4 : 1, j = Math.min(1, c.flick), ph = c.phase + t;
    if (P.body) { P.body.rotation.x = R.body.x + Math.sin(ph * 0.9) * 0.025 * k - j * 0.08; P.body.rotation.z = R.body.z + Math.sin(ph * 0.6) * 0.02 * k; }
    if (P.shoulderL) P.shoulderL.rotation.x = R.shoulderL.x + Math.sin(ph * 0.7) * 0.08 * k;
    if (P.shoulderR) P.shoulderR.rotation.x = R.shoulderR.x + Math.sin(ph * 0.7 + 1.3) * 0.08 * k - j * 1.2;
    if (P.forearmL) P.forearmL.rotation.x = R.forearmL.x + Math.sin(ph * 1.1) * 0.1 * k;
    if (P.forearmR) P.forearmR.rotation.x = R.forearmR.x + Math.sin(ph * 1.1 + 0.6) * 0.1 * k - j * 0.3;
  }
  rattle(c) {
    if (c.mixer && c.idle) {
      const names = ["rage", "hurt", "stagger"].filter((n) => c.acts[n]);
      const a = names.length && c.acts[names[Math.floor(Math.random() * names.length)]];
      if (a && !c.fit) {
        c.fit = a;
        a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = 0.9;
        a.play(); c.idle.crossFadeTo(a, 0.3, false);
        const back = (e) => { if (e.action !== a) return; c.mixer.removeEventListener("finished", back); c.fit = null; c.idle.enabled = true; c.idle.play(); a.crossFadeTo(c.idle, 0.5, false); };
        c.mixer.addEventListener("finished", back);
      }
    }
    c.flick = 1.4;
    const L = this.lamps[c.wi];
    if (L) L.flick = 1;
    // its growl, far off: low, quiet, from its side of the hall, muffled by the distance (a low-pass)
    const r = c.world.roar[c.sd < 0 ? 0 : 1];
    if (Sound.bank && Sound.bank[r]) Sound.sfx(r, c.sd * 0.55, { vol: 0.3, lp: 1100, rate: 0.92, vary: 0.5 }); // (about 9 dB under the music: heard, far off, on a phone's speaker too)
  }
  dispose() {
    if (this.envRT) { this.envRT.dispose(); this.envRT = null; }
    for (const t of this.texs || []) t.dispose();
    for (const m of this.taken || []) hallRelease(m); // (before the scene's own dispose: see hallRelease)
    super.dispose();
  }
}
