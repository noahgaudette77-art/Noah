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
// slowed. On a computer (not Assets.phone) the walls between the windows are dressed as a maximum-security block's:
// conduits, guard rails, block plates and signs, junction boxes, vents, doors, warning lamps, patrolling searchlights
// (10f-titledress.js: in the cells' own draws, the moving light one more).
const HALL_WORLDS = [
  // win: the world's sky (assets/ui, a small copy of its panorama); at: the place in it [u, v] that each window shows,
  // the left wall's and the right's (the nebula's two clouds; the dusk's low sun and its high clouds; the storm's
  // lightning and its white squall; the vault's gold and its wheel; the archive's shelves and its stained glass; the
  // exam hall's arch and its moon); col, col2: its two colours; its two bosses (the chapters in order down the hall,
  // the Proctor last, by the vault); sky: the place its skylight shows (the nebula; the dusk's clouds; the storm; the
  // vault's gold; the archive's lit arches; the exam hall's moon), held in the band of the panorama between its horizon
  // and its stretched top (the owner, 2026-11-22: the skylights showed the top's smears, and rows past its edge)
  { id: "blaster", win: "win-blaster", sky: [0.15, 0.65], at: [[0.15, 0.5], [0.8, 0.52]], col: 0x35efff, col2: 0xa65fff, bosses: ["boss-1-t", "boss-2-t"], roar: ["roar_1", "roar_2"] },
  { id: "racer", win: "win-racer", sky: [0.8, 0.66], at: [[0.3, 0.55], [0.94, 0.62]], col: 0xff8a3d, col2: 0xff3ad4, bosses: ["boss-3-t", "boss-4-t"], roar: ["roar_3", "roar_4"] },
  { id: "boss", win: "win-boss", sky: [0.66, 0.66], at: [[0.66, 0.6], [0.37, 0.55]], col: 0xa66bff, col2: 0x35efff, bosses: ["boss-5-t", "boss-6-t"], roar: ["roar_5", "roar_6"] },
  { id: "memory", win: "win-memory", sky: [0.6, 0.68], at: [[0.83, 0.47], [0.6, 0.5]], col: 0xffc04a, col2: 0xff8a3d, bosses: ["boss-7-t", "boss-8-t"], roar: ["roar_7", "roar_8"] },
  { id: "guide", win: "win-guide", sky: [0.5, 0.68], at: [[0.5, 0.47], [0.93, 0.5]], col: 0xffb86a, col2: 0x4dffa6, bosses: ["boss-9-t", "boss-10-t"], roar: ["roar_9", "roar_10"] },
  { id: "exam", win: "win-exam", sky: [0.72, 0.64], at: [[0.36, 0.58], [0.72, 0.58]], col: 0x8fb4ff, col2: 0xa66bff, bosses: ["boss-11-t", "boss-all-t"], roar: ["roar_11", "roar_all"] },
];
// (the master overhaul, Phase 5, 2026-11-24: the exam's left window looks through its arch, at the clouds and the gilt
// underside, not at its right column: at the end of the glide on a wide window that window is the picture's left edge,
// and its stone read as a dark muddy panorama)
// the part of a world's panorama its skylight can show [u0, v0, du, dv] (texture space, v up): its span and its
// parallax each way, a margin, and a skylight's clamp; tools/skylights.py crops its picture to the same
const hallTopRect = (sky) => { const v0 = Math.max(0.3, sky[1] - 0.155); return [sky[0] - 0.19, v0, 0.38, Math.min(0.84, sky[1] + 0.155) - v0]; };
// the hall in metres: the first world's middle (z0) and the step between worlds, the pods' distance from the aisle's
// middle, the walls, the end wall, the pod (glass radius, height), the most a boss may stand in one, how far each
// boss turns from the aisle toward the door, and the distances at which a far cell is drawn with less (see the top)
// The hall's deck (its floor's relief and roughness: makeNeonFloor's plates): a level plate until the CC0 picture
// arrives (assets/ui/mat-deck.webp: x and y of its normal in red and green, its roughness in blue), then that picture,
// tiled, its smaller copies made, as finely filtered as the chip allows (a floor is always seen at a slant).
function hallPlates() {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d");
  x.fillStyle = "rgb(128, 128, 128)"; x.fillRect(0, 0, 1, 1);
  const t = new THREE.Texture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
  t.anisotropy = THREE.Texture.DEFAULT_ANISOTROPY;
  t.needsUpdate = true;
  return t;
}
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
    // (a material that reads each part's own position and normal (the Proctor's skin: 24f-proctor.js) is given them as
    // they were, beside the merged copy)
    const local = !!mat.userData.bossLocal, lp = local ? new Float32Array(nv * 3) : null, ln = local ? new Float32Array(nv * 3) : null;
    let o = 0, oi = 0;
    for (const m of list) {
      const g = m.geometry, P = g.attributes.position, NO = g.attributes.normal, UV = g.attributes.uv, n = P.count, b = bi.get(boneOf(m));
      N.getNormalMatrix(m.matrixWorld);
      let k = unit(P);
      for (let i = 0; i < n; i++) { v.set(P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k); if (local) v.toArray(lp, (o + i) * 3); v.applyMatrix4(m.matrixWorld); const j = (o + i) * 3; pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z; si[(o + i) * 4] = b; sw[(o + i) * 4] = 1; }
      if (NO) { k = unit(NO); for (let i = 0; i < n; i++) { v.set(NO.getX(i) * k, NO.getY(i) * k, NO.getZ(i) * k); if (local) v.toArray(ln, (o + i) * 3); v.applyMatrix3(N).normalize(); const j = (o + i) * 3; nor[j] = v.x; nor[j + 1] = v.y; nor[j + 2] = v.z; } }
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
    if (local) { geo.setAttribute("aBossP", new THREE.BufferAttribute(lp, 3)); geo.setAttribute("aBossN", new THREE.BufferAttribute(ln, 3)); }
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
        if (!t || !t.isTexture || t === _glowTex) continue; // (the shared glow is every screen's: kept, as disposeTree and GFX.rest keep it)
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
    // (the master overhaul, Phase 2, 2026-11-23: the floor is a polished steel deck that gives the hall back, its cells'
    // light and its lamps, on every tier: the hall drawn once into a cube from its middle and looked up where each
    // reflected ray meets its walls (roomProbe); the deck's plates and wear from a CC0 material (Poly Haven's
    // metal_plate_02: its relief and roughness; the colour is the hall's own dark violet). The black floor with a thin
    // grid was the hall's weakest picture: a void filling the bottom of every frame)
    this.probe = roomProbe(new THREE.Vector3(0, 2.2, (Z1 + Z2) / 2), { size: Assets.phone ? 128 : 256 });
    this.plates = hallPlates();
    this.floor = makeNeonFloor({
      size: 240, cell: 3, line: 0x35efff, lineK: 0.5, base: 0x030010, glow: 0.3, gridAlpha: 0.42, pulse: this.calm ? 0 : 0.35, ripple: 0, streak: 0,
      probe: { map: this.probe.map, min: new THREE.Vector3(-W, 0, Z2 - 2), max: new THREE.Vector3(W, H, Z1), at: this.probe.at, k: 1.05, rough: 0.24 },
      plates: { map: this.plates, size: 3.0, k: 0.85 },
    });
    this.floor.name = "floor";
    this.probe.hide = [this.floor];
    this.probe.capture(); // (the room as it stands: again once every piece is in)
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
    // a ring lamp over the aisle in each world's colour, hung from the ceiling (the light it gives is the world's lamp).
    // The rings are drawn apart (one additive draw) and fade out as they rise into the band of the picture under the
    // top row's read-outs (the owner, 2026-11-22: the rings were cut off behind it as the lens passed under them).
    const ring = new THREE.TorusGeometry(0.75, 0.045, 6, 40).rotateX(Math.PI / 2), rings = new RacerBatch();
    HALL_WORLDS.forEach((Wd, wi) => {
      const z = HALL.z0 - wi * HALL.step;
      rings.add(ring, racerM(0, 5.75, z), Wd.col, 2.6);
      for (const [dx, dz, sx, sz] of [[0, 4.62, 8.7, 0.05], [0, -4.62, 8.7, 0.05], [4.32, 0, 0.05, 9.3], [-4.32, 0, 0.05, 9.3]]) glow.add(box, racerM(dx, H - 0.06, z + dz, sx, 0.04, sz), Wd.col, 1.3); // (its skylight's frame)
      rings.add(ring, racerM(0, 5.75, z, 0.62, 1, 0.62), Wd.col2, 1.6);
      for (const a of [0, 2.09, 4.19]) metal.add(box, racerM(Math.sin(a) * 0.7, (5.75 + H) / 2, z + Math.cos(a) * 0.7, 0.03, H - 5.75, 0.03), 0x2a2440); // (its three hangers)
    });
    ring.dispose();
    this.ringU = Object.assign(fogUniforms(), { uTop: { value: 0.72 } });
    this.rings = new THREE.Mesh(rings.build(), new THREE.ShaderMaterial({
      uniforms: this.ringU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      // (the height in the picture from the clip position's y and w, each interpolated as it is: their ratio is exact)
      vertexShader: "attribute vec3 aCol; varying vec3 vCol; varying float vDepth; varying vec2 vYW; void main(){ vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; vYW = gl_Position.yw; }",
      fragmentShader: `${GLSL_FOG_PARS} uniform float uTop; varying vec3 vCol; varying float vDepth; varying vec2 vYW;
        void main(){ float f = 1.0 - smoothstep(uTop - 0.16, uTop, vYW.x / vYW.y);
          gl_FragColor = vec4(vCol * f * (1.0 - smoothstep(uFogNear, uFogFar, vDepth)), 1.0); }`,
    }));
    this.rings.frustumCulled = false;
    this.rings.name = "ring-lamps";
    s.add(this.rings);
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
    const metalMesh = new THREE.Mesh(metal.build("color"), this.metalMat), glowMesh = new THREE.Mesh(glow.build("color"), this.glowMat);
    metalMesh.name = "room-steel"; glowMesh.name = "room-lights"; // (named for tools/cost-report.js)
    s.add(metalMesh, glowMesh);
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
    this.gState = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); // (alarm, cracked, beaten, phase: see 10e-titlecells.js)
    this.gFront = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); // (the way its cell faces, toward the aisle: its crack is there)
    gGeo.setAttribute("aCol", this.gCol);
    gGeo.setAttribute("aFlick", this.gFlick);
    gGeo.setAttribute("aState", this.gState);
    gGeo.setAttribute("aFront", this.gFront);
    this.crackTex = crackTexture();
    // (the master overhaul, Phase 2, 2026-11-23: the glass gives back the hall, its lamps, windows and the cells across
    // the aisle, strongest where it turns from the lens, from the floor's own cube: it read as tinted plastic before)
    const fp = this.floor.material.uniforms;
    this.glassU = Object.assign(fogUniforms(), { uK: { value: 1 }, uT: { value: 0 }, tCrack: { value: this.crackTex }, uCalm: { value: this.calm ? 1 : 0 },
      tProbe: fp.tProbe, uBoxMin: fp.uBoxMin, uBoxMax: fp.uBoxMax, uProbeAt: fp.uProbeAt, uGlassRefl: { value: 0.7 } });
    this.glass = new THREE.InstancedMesh(gGeo, new THREE.ShaderMaterial({
      uniforms: this.glassU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, extensions: { shaderTextureLOD: true },
      vertexShader: `attribute vec3 aCol; attribute float aFlick; attribute vec4 aState; attribute float aFront; varying vec3 vN; varying vec3 vV; varying vec3 vW; varying float vY; varying vec3 vCol; varying float vFlick; varying float vDepth; varying vec4 vState; varying float vFront; varying vec2 vXZ;
        void main(){
          #ifdef USE_INSTANCING
          mat4 m = modelMatrix * instanceMatrix;
          #else
          mat4 m = modelMatrix;
          #endif
          vec4 w = m * vec4(position, 1.0);
          vN = normalize(mat3(m) * normal); vV = cameraPosition - w.xyz; vW = w.xyz; vY = position.y + 0.5; vCol = aCol; vFlick = aFlick; vState = aState; vFront = aFront; vXZ = position.xz;
          vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      // (clear glass: a rim of its boss's light where it turns from the lens, a column of light rising from its base, a
      // slow band climbing it, wisps of energy drifting up it, all breathing with the cell's pulse; a flicker when its
      // boss stirs; in an alarm its light pulses red; a beaten boss's glass is a quieter green; a cracked pane's crack, toward the
      // aisle, catches the light; fading into the hall's haze far off)
      fragmentShader: `${GLSL_FOG_PARS} uniform float uK; uniform float uT; uniform float uCalm; uniform sampler2D tCrack; uniform samplerCube tProbe; uniform vec3 uBoxMin; uniform vec3 uBoxMax; uniform vec3 uProbeAt; uniform float uGlassRefl; varying vec3 vW; varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vCol; varying float vFlick; varying float vDepth; varying vec4 vState; varying float vFront; varying vec2 vXZ;
        void main(){
          float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
          float ang = atan(vXZ.y, vXZ.x), ph = vState.w * 6.2832, t = uT * (1.0 - 0.7 * uCalm);
          float rim = pow(max(f, 0.0), 2.6) * 0.75;
          float col = 0.025 + 0.16 * pow(max(1.0 - vY, 0.0), 3.2) + 0.1 * pow(max(vY, 0.0), 9.0);
          float band = (1.0 - smoothstep(0.0, 0.06, abs(fract(vY * 0.7 - uT * 0.045) - 0.5))) * 0.05;
          float wisp = 0.0;
          if (vDepth < 32.0) wisp = smoothstep(0.5, 1.0, sin(ang * 3.0 + vY * 9.0 - t * 1.1 + ph) * sin(ang * 5.0 - vY * 13.0 + t * 0.7)) * 0.11 * (1.0 - 0.6 * vY) * (1.0 - smoothstep(22.0, 32.0, vDepth)); // (near cells only: far off the haze hides them)
          float pulse = 0.86 + 0.14 * sin(t * 1.3 + ph);
          vec3 c = mix(mix(vCol, vec3(1.0, 0.1, 0.14), vState.x * (1.0 - uCalm) * (0.45 + 0.45 * sin(t * 6.5 + ph))), vec3(0.3, 1.0, 0.55), vState.z * 0.85) * mix(1.0, 0.72, vState.z);
          float crack = 0.0;
          if (vState.y > 0.5) { // (only a cracked pane reads its crack)
            float da = atan(sin(ang - vFront), cos(ang - vFront));
            vec2 cu = vec2(da / 1.1 + 0.5, (vY - 0.5) / 0.6 + 0.5);
            crack = step(0.0, cu.x) * step(cu.x, 1.0) * step(0.0, cu.y) * step(cu.y, 1.0) * texture2D(tCrack, cu).r;
          }
          float haze = 1.0 - 0.8 * smoothstep(uFogNear, uFogFar * 1.25, vDepth);
          // the hall in the glass: the ray off its outer face (front faces only: the far side's inside is seen through
          // it), met with the hall's walls and looked up in the floor's cube, sharp (a polished pane), by Fresnel
          vec3 refl = vec3(0.0);
          if (gl_FrontFacing) {
            vec3 Vd = normalize(-vV), Nn = normalize(vN), R = reflect(Vd, Nn);
            vec3 Rs = mix(vec3(-1.0), vec3(1.0), step(0.0, R)) * max(abs(R), vec3(1e-4)); // (as the floor's: no NaN on an axis)
            vec3 t1 = (uBoxMax - vW) / Rs, t2 = (uBoxMin - vW) / Rs, tf = max(t1, t2);
            float fr = 0.04 + 0.96 * pow(1.0 - clamp(dot(-Vd, Nn), 0.0, 1.0), 5.0);
            refl = textureCubeLodEXT(tProbe, vW + R * max(min(min(tf.x, tf.y), tf.z), 0.0) - uProbeAt, 1.0).rgb * fr * uGlassRefl;
          }
          gl_FragColor = vec4((c * (rim + col + band + wisp) * pulse * (1.0 + vFlick) + mix(vec3(0.9, 0.97, 1.0), c, 0.35) * crack * 0.85 + refl) * uK * haze, 1.0);
        }`,
    }), n);
    this.glass.frustumCulled = false; // (an instanced mesh is culled by its first copy's bounds: the twelve span the hall)
    if (this.probe) this.probe.swap.push(this.glassU.tProbe); // (drawn into the cube with a blank in place of it: a picture cannot be read and written at once, and the glass's light is the cells' colour in the floor)
    this.glass.renderOrder = 4;
    this.glass.name = "cells-glass";
    // a pool of each boss's light on the floor round its cell (one draw)
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
    this.pools.name = "cells-floor-glow";
    s.add(this.glass, this.pools);
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
        anchor.name = "bosses";
        s.add(anchor);
        const turner = new THREE.Group(); // (its boss stands on this: a slow turn, a twitch, over the anchor's facing)
        anchor.add(turner);
        c.set(W.col).toArray(this.gCol.array, i * 3);
        c.set(W.col).lerp(new THREE.Color(W.col2), 0.25).toArray(this.pCol.array, i * 3);
        this.pools.setMatrixAt(i, M.compose(p.set(x, 0.02, z), q.identity(), sc.set(6.4, 1, 6.4)));
        this.cells.push({ world: W, wi, name, sd, x, z, i, anchor, turner, boss: null, mixer: null, head: null, acts: {}, yaw: 0, accum: 0, flick: 0, glowK: 1, mats: null, caps: [], twitch: 0, twitchIn: 3 + i * 0.7 });
      });
    });
    this.pools.instanceMatrix.needsUpdate = true;
    // the cells themselves (10e-titlecells.js): built here at once, in a few draws (the generated pod is not used: its
    // top was jagged); each cell's glass and its pool in its own boss's light, the worse cells' states on its glass
    this.kit = buildCellKit(this);
    if (this.probe && this.kit.patrol) this.probe.hide.push(this.kit.patrol); // (a computer's moving searchlights: not frozen into the floor's reflection)
    // (the steel gives back the hall's capture filtered for its roughness: from the start a filtered copy of the capture
    // not yet drawn (black, as the hall's dark), so the steel's shader is made now, with the hall's, and each capture
    // that arrives changes a picture, not the shader; and the filter's own shader made now: neither mid-glide)
    if (GFX.ok && this.kit.steelMat && this.probe) { try { const pm = GFX.pmrem(); pm.compileCubemapShader(); this.steelEnv = pm.fromCubemap(this.probe.map); this.kit.steelMat.envMap = this.steelEnv.texture; } catch (e) { /* made at the first capture instead */ } }
    this.podMesh = this.kit.steel; // (what the tools wait for: the cells are in)
    this.kit.states.forEach((st, i) => {
      const cl = this.cells[i], ry = cl.anchor.rotation.y;
      st.col.toArray(this.gCol.array, i * 3);
      const lit = st.beaten ? st.col.clone().lerp(new THREE.Color(0x4dffa6), 0.85) : st.col; // (a beaten boss's cell is lit a neutralized green)
      c.copy(lit).multiplyScalar(0.85).toArray(this.pCol.array, i * 3);
      this.gState.array.set([st.alarm ? 1 : 0, st.crack ? 1 : 0, st.beaten ? 1 : 0, st.phase], i * 4);
      this.gFront.array[i] = Math.atan2(Math.cos(ry), Math.sin(ry));
      cl.rimU = { col: { value: lit.clone() }, k: { value: 0 } }; // (its boss's rim and under-light: see cellRim)
      cl.rimPh = st.phase * Math.PI * 2;
      cl.state = st;
    });
    this.podFrame(CELL.baseTop, CELL.capY);
  }
  // the glass of every cell, between the top of its plinth and the foot of its cap
  podFrame(y0, y1) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), R = HALL.podR;
    for (const c of this.cells) this.glass.setMatrixAt(c.i, M.compose(p.set(c.x, (y0 + y1) / 2, c.z), q.identity(), sc.set(R, y1 - y0 + 0.1, R)));
    this.glass.instanceMatrix.needsUpdate = true;
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
    pane([0, 8.76, z], [1, 0, 0], [0, 0, -1], [0, -1, 0], 8.6, 9.2, W.sky, [0.3, 0.22, 1]);
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
      uniforms: Object.assign(fogUniforms(), { tSky: { value: null }, uOn: { value: 0 }, uTint: { value: col }, uK: { value: 1 }, tTop: { value: null }, uTop: { value: new THREE.Vector4().fromArray(hallTopRect(W.sky)) }, uTopOn: { value: 0 } }),
      side: THREE.DoubleSide,
      vertexShader: `attribute vec3 aN; attribute vec3 aS; attribute vec3 aT; attribute vec2 aAt; attribute vec3 aSpan; varying vec3 vW; varying vec3 vN; varying vec3 vS; varying vec3 vT; varying vec2 vUv; varying vec2 vAt; varying vec3 vSpan; varying float vDepth;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = aN; vS = aS; vT = aT; vUv = uv; vAt = aAt; vSpan = aSpan; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `${GLSL_FOG_PARS} uniform sampler2D tSky; uniform float uOn; uniform vec3 uTint; uniform float uK; uniform sampler2D tTop; uniform vec4 uTop; uniform float uTopOn; varying vec3 vW; varying vec3 vN; varying vec3 vS; varying vec3 vT; varying vec2 vUv; varying vec2 vAt; varying vec3 vSpan; varying float vDepth;
        void main(){
          vec3 d = normalize(vW - cameraPosition);
          vec2 par = clamp(vec2(dot(d, vS), dot(d, vT)) / max(-dot(d, vN), 0.08), -2.5, 2.5) * vec2(0.035, 0.04) * mix(1.0, 0.35, vSpan.z); // (the depth: the far land shifts as the lens passes; a skylight, seen edge on, only a little)
          vec2 uv = vAt + (vUv - 0.5) * vSpan.xy + par;
          vec2 su = vec2(uv.x, clamp(uv.y, mix(0.02, 0.3, vSpan.z), mix(0.98, 0.84, vSpan.z)));
          vec3 c = texture2D(tSky, su).rgb;
          if (uTopOn > 0.5) c = mix(c, texture2D(tTop, vec2(fract(su.x - uTop.x) / uTop.z, (su.y - uTop.y) / uTop.w)).rgb, step(0.5, vSpan.z)); // (a skylight: its own sharper picture, once it has come)
          c = c * c * (c * 0.305 + 0.695);
          c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, mix(0.82, 1.0, vSpan.z)); // (a side window a little less saturated: the master overhaul, 2026-11-23)
          vec3 col = mix(uTint * 0.03, c * mix(0.62, 1.45, vSpan.z) * uK, uOn); // (a window dimmer than the cells it stands behind, so the bosses lead the frame (it outshone them); a skylight a little brighter)
          float bars = (1.0 - vSpan.z) * max(smoothstep(0.004, 0.012, abs(fract(vUv.x * 3.0) - 0.5) - 0.484), 1.0 - smoothstep(0.003, 0.01, abs(vUv.y - 0.62) - 0.003)); // (a window's three panes across and its transom)
          col *= 1.0 - 0.8 * bars;
          col += uTint * 0.06 * (1.0 - vSpan.z) * (1.0 - smoothstep(0.0, 0.35, abs(vUv.x - vUv.y * 0.6 - 0.2))); // (a sheen across a window's glass)
          col *= 1.0 - 0.35 * vSpan.z * (1.0 - smoothstep(0.0, 0.08, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)))); // (a skylight darkens toward its frame)
          gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        }`,
    });
    const win = new THREE.Mesh(geo, mat);
    win.name = "windows+skylights";
    this.scene.add(win);
    W._win = mat; // (its picture is put in when it has come: see takeArrivals)
  }
  // ---- the end of the hall: a warm lamp over it (the vault door, the cabinets and the trophy stand come as they arrive)
  buildEnd() {
    this.endGroup = new THREE.Group(); this.endGroup.name = "vault+cabinets+stand"; // (the vault door, the cabinets, the stand and its cup, the shaft of light: not drawn while the haze hides them)
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
      fragmentShader: "uniform vec3 uCol; uniform float uK; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(max(f, 0.0), 1.6) * pow(max(1.0 - vY, 0.0), 1.3) * smoothstep(0.0, 0.1, vY) * 0.2; gl_FragColor = vec4(uCol * a * uK, 1.0); }",
    }));
    shaft.position.set(0, 1.0 + 3.2, Z + 7 - 0.57);
    shaft.renderOrder = 5;
    this.endGroup.add(shaft);
  }
  // ---- the lens's path: from the door down the aisle to where the end of the hall fills the picture. How far back
  // it stops depends on the screen's shape: on a phone held upright (a narrow picture) it stops close enough to the
  // last two cells that they stand just past the picture's edges (the owner, 2026-11-22: half cut off at its edges,
  // they looked awkward), the vault and the cabinets either side of it whole; on a wide screen it stops 7 m short of
  // them, so they stand either side of the logo.
  makePath() {
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect, last = HALL.z0 - (HALL_WORLDS.length - 1) * HALL.step;
    const endZ = last + clamp(2.25 / Math.max(0.05, tanH), 7, 17), pts = [], N = 6; // (the cells' caution rings start 2.36 m from the aisle's middle)
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
    if (!piece) for (const W of HALL_WORLDS) if (!W._win.uniforms.tSky.value) { const img = Assets.ui(W.win); if (img) { piece = this.windowPiece(W, img); break; } }
    // (the vault door, the cabinets, the stand and its cup are the arcade floor's models too: the floor's own copies are
    // made ready when it asks for its set, once the glide has arrived: see showTitle)
    if (!piece && !this.vault) { const m = this.take("prop-vault"); if (m) piece = this.propPiece("vault", m, 6.0, 0, 0.05, HALL.endZ + 1.2, { env: 2.3, glow: 2.3, rim: { col: { value: new THREE.Color(0xffc46a) }, k: { value: 0.5 } } }); } // (more contrast: brighter in its reflections and its lamps, its edges caught in warm light)
    if (!piece && !this.cabs) { const m = this.take("prop-cabinet"); if (m) piece = this.cabPiece(m); }
    if (!piece && !this.stand) { const m = this.take("prop-stand"); if (m) piece = this.propPiece("stand", m, 1.13, 0, 0, HALL.endZ + 7, { env: 1.6, glow: 1.4 }); }
    if (!piece && !this.cup && this.stand) { const m = this.take("prop-trophy"); if (m) piece = this.propPiece("cup", m, 0.95, 0, 1.06, HALL.endZ + 7 - 0.57, { env: 3.2, glow: 2.4 }); }
    if (!piece) for (const c of this.cells) if (!c.boss && !c.coming) { const m = this.take(c.name); if (m) { c.coming = true; piece = this.bossPiece(c, m); break; } }
    if (!piece) for (const W of HALL_WORLDS) if (W._win.uniforms.tSky.value && !W._win.uniforms.tTop.value) { const img = Assets.ui("top-" + W.id); if (img) { piece = this.topPiece(W, img); break; } }
    this.job = piece;
  }
  // a model taken from the loaded files (let go of when the hall closes: see dispose)
  take(name) {
    let m;
    // (the twelfth cell holds the Proctor: the machine the owner supplied, as in the Final Exam, on its skeleton, made
    // ready to be merged as the others are: 24f-proctor.js)
    if (name === "boss-all-t") { m = Assets.model("boss-all-rig"); if (m) m = proctorOk() ? proctorDress(m, null, { local: true }) : null; }
    else m = Assets.model(name);
    if (m) this.taken.push(m);
    return m;
  }
  // each of a model's pictures sent to the graphics chip, one a frame
  *upload(m) {
    const r = GFX.ok && GFX.renderer, seen = new Set(), maps = [];
    if (!r || !r.initTexture) return;
    m.scene.traverse((o) => { if (o.isMesh) for (const mt of Array.isArray(o.material) ? o.material : [o.material]) for (const k of DISPOSE_MAPS) { const t = mt && mt[k]; if (t && !seen.has(t)) { seen.add(t); maps.push(t); } } });
    for (const t of maps) { try { r.initTexture(t); } catch (e) { /* sent the first time it is drawn instead */ } yield; }
  }
  // the floor's reflection drawn whole at once (for a test's stills: the capture tool draws only the frames it keeps,
  // so a face a frame would never be drawn there; the game itself draws every frame)
  probeNow() {
    if (!this.probe) return;
    this.probe.capture();
    while (this.probe.left) this.probe.step(this.scene, this.camera.layers.mask);
    this.probeTaken();
  }
  // a capture whole: the cells' steel takes it too, filtered for its roughness (its own cube, made once a capture)
  probeTaken() {
    const P = this.probe;
    if (!P || P.left || P.done === P.made) return;
    P.done = P.made;
    if (this.kit && this.kit.steelMat && GFX.ok) {
      try {
        const pm = GFX.pmrem().fromCubemap(P.map);
        if (this.steelEnv) this.steelEnv.dispose();
        this.steelEnv = pm; this.kit.steelMat.envMap = pm.texture;
      } catch (e) { /* the steel keeps the hall's dark */ }
    }
  }
  // a new piece's shaders asked for before it is hung in the hall, and the frames waited until the graphics driver has
  // built them (GFX.prepare): the glide never stalls on a boss or a prop arriving (the master overhaul, 2026-11-23)
  *ready(objs) {
    const done = GFX.prepare(this.scene, this.camera, objs);
    while (!done()) yield;
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
    t.encoding = THREE.sRGBEncoding; t.anisotropy = THREE.Texture.DEFAULT_ANISOTROPY; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true; // (it wraps round: a view across the panorama's join shows no seam. Filtered as finely as the device's tier allows: the windows are seen at a slant)
    (this.texs || (this.texs = [])).push(t);
    try { if (GFX.ok && GFX.renderer.initTexture) GFX.renderer.initTexture(t); } catch (e) { /* sent the first time it is drawn instead */ }
    yield;
    W._win.uniforms.tSky.value = t; W._win.uniforms.uOn.value = 1;
  }
  // a world's skylight's own picture (the owner, 2026-11-23: the ceiling panels were soft): the part of its panorama a
  // skylight can show, cropped from the full panorama by tools/skylights.py (hallTopRect), about three times the
  // window picture's detail; seen from below at a slant, filtered as finely as the tier allows
  *topPiece(W, img) {
    const t = new THREE.Texture(img);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = THREE.Texture.DEFAULT_ANISOTROPY; t.needsUpdate = true;
    (this.texs || (this.texs = [])).push(t);
    try { if (GFX.ok && GFX.renderer.initTexture) GFX.renderer.initTexture(t); } catch (e) { /* sent the first time it is drawn instead */ }
    yield;
    W._win.uniforms.tTop.value = t; W._win.uniforms.uTopOn.value = 1;
  }
  // a prop of the end of the hall: its height in metres, where it stands
  *propPiece(key, m, h, x, y, z, tune) {
    const mats = tuneModel(m, tune);
    if (tune.rim) cellRim(mats, tune.rim);
    const o = m.scene;
    o.scale.setScalar(h);
    o.position.set(x, y, z);
    yield* this.upload(m);
    yield* this.ready([o]);
    this.endGroup.add(o);
    this.warmNew([this.endGroup]);
    this[key] = o;
  }
  *cabPiece(m) {
    const objs = this.cabinets(m);
    if (!objs) return;
    yield;
    yield* this.upload(m);
    yield* this.ready(objs);
    for (const o of objs) this.endGroup.add(o);
    this.warmNew([this.endGroup]);
    this.cabs = objs[0];
  }
  // the two cabinets either side of the vault, one model drawn twice in one call; on each screen, a world's sky
  cabinets(m) {
    const made = modelGeometry(m);
    if (!made) return null;
    cellRim(tuneModel(m, { env: 2.0, glow: 2.4 }), { col: { value: new THREE.Color(0x7fe9ff) }, k: { value: 0.45 } }); // (a little brighter than they were, their edges caught in cool light, so they read against the dark wall)
    made.geo.deleteAttribute("aRest");
    const cabs = new THREE.InstancedMesh(made.geo, made.mat, 2), objs = [cabs];
    cabs.frustumCulled = false;
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), S = new THREE.Vector3(2.6 * 1.15, 2.6, 2.6), Z = HALL.endZ, up = new THREE.Vector3(0, 1, 0);
    this.cabAt = [-1, 1].map((sd, i) => { const at = { x: sd * 3.05, z: Z + 4.7, ry: -sd * 0.42 }; cabs.setMatrixAt(i, M.compose(new THREE.Vector3(at.x, 0, at.z), q.setFromAxisAngle(up, at.ry), S)); return at; }); // (in from the walls, beside the vault's frame: whole in the picture at the glide's end)
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
            c = c * c * (c * 0.305 + 0.695) * 2.1;
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
  // a boss into its pod: made one skinned mesh, sized to stand in the glass, its idle started from its own moment;
  // the pod flares as it comes in. (The Probate Tollgate has no skeleton: its hinged parts sway by code.)
  *bossPiece(c, m) {
    const root = m.scene;
    let skin = null;
    if (m.animations && m.animations.length) { try { skin = yield* hallSkinSteps(m); } catch (e) { skin = null; } }
    else { rigModel(m, { tree: { forearmL: "shoulderL", forearmR: "shoulderR", shoulderL: "body", shoulderR: "body" } }); c.rig = m.parts; c.rest = {}; for (const n of ["body", "shoulderL", "shoulderR", "forearmL", "forearmR"]) if (m.parts[n]) c.rest[n] = m.parts[n].rotation.clone(); }
    yield;
    if (m.proctor) { c.mats = m.proctor.mats; c.proctor = m.proctor; } // (the Proctor wears the exam's skin, its rim lit by its cell: see update)
    else {
      c.mats = tuneModel(m, { env: 1.8, glow: 1.1 });
      cellRim(c.mats, c.rimU); // (lit from inside its cell: its rim and its underside in its own colour)
    }
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
      const mv = (typeof BOSS_MOVE !== "undefined" && BOSS_MOVE[c.name.replace(/^boss-|-t$/g, "")]) || {}; // (each boss at its own pace, as it moves in its fight: 22d; a floater hovers in its cell)
      c.idle.timeScale = ((this.calm ? 0.55 : 0.85) + Math.random() * 0.2) * (mv.tempo || 1);
      c.float = mv.float || null;
      c.headAnim = !!c.head && clips.some((cl) => cl.tracks.some((t) => t.name === c.head.name + ".quaternion"));
      c.mixer.update(0);
    }
    c.phase = Math.random() * 10;
    yield* this.ready([root]);
    c.turner.add(root);
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
    // the floor's reflection: a face of the hall's cube a frame, drawn again once every boss and the end are in
    if (this.probe) {
      if (!this.probeFull && this.vault && this.cabs && this.stand && this.cells.every((c) => c.boss && c.ready)) { this.probeFull = true; this.probe.capture(); }
      // (and when a capture is whole, the cells' steel takes it too, filtered for its roughness: steel that gives back
      // the neon reads as steel; with the hall's black surroundings it read as grey boxes. Its own cube, made once a
      // capture: what reads it is never drawn into what it reads)
      this.probe.step(this.scene, this.camera.layers.mask);
      this.probeTaken();
    }
    // the deck's plates, then the cells' tread plate, then their brushed steel (cellSteelMaterial), each as its picture
    // arrives: one picture sent to the graphics chip a frame at most, and one not yet come never holds up the others
    let sent = false;
    if (this.plates && !this.platesIn) { const img = Assets.ui("mat-deck"); if (img) { this.plates.image = img; this.plates.needsUpdate = true; this.platesIn = sent = true; } }
    if (!sent && this.kit && this.kit.steelMat && !this.treadIn) { const a = Assets.ui("mat-tread"), U = this.kit.steelMat.userData; if (a) { U.tTread.value.image = a; U.tTread.value.needsUpdate = true; this.treadIn = sent = true; } }
    if (!sent && this.kit && this.kit.steelMat && !this.brushIn) { const b = Assets.ui("mat-steel"), U = this.kit.steelMat.userData; if (b) { U.tBrush.value.image = b; U.tBrush.value.needsUpdate = true; this.brushIn = sent = true; } }
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
    this.kit.update(this, dt, this.camera.position);
    // (the rings fade under the top row: where its read-outs end, in the picture's height from -1 to 1)
    const top = this._topEl && this._topEl.isConnected ? this._topEl : (this._topEl = document.querySelector(".scr-title .title-top")); // (found again if the title's page was made again)
    if (top && top.isConnected && (this._topT = (this._topT || 0) - dt) <= 0) { this._topT = 0.5; const b = top.getBoundingClientRect().bottom; this.ringU.uTop.value = 1 - (2 * (b + 8)) / Math.max(1, window.innerHeight); }
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
      // its lights: dim in stasis, flaring as it stirs; lit from inside its cell in its own colour, breathing with the
      // cell's pulse (quieter for a beaten boss), flaring as it stirs
      const glow = 1.1 + 1.6 * Math.min(1, c.flick);
      if (c.mats && Math.abs(glow - c.glowK) > 0.02) { c.glowK = glow; for (const m of c.mats) if (m.emissiveMap) m.emissiveIntensity = glow; }
      c.rimU.k.value = (0.62 + 0.38 * this.power) * (0.82 + 0.18 * Math.sin(this.t * 1.3 * (this.calm ? 0.3 : 1) + c.rimPh)) * (c.state.beaten ? 0.65 : 1) * (1 + 1.2 * Math.min(1, c.flick));
      if (c.proctor) { c.proctor.U.uBossRim.value.copy(c.rimU.col.value).multiplyScalar(0.7 * c.rimU.k.value); c.proctor.light(glow / 1.1, 0); } // (the Proctor: its skin's rim in its cell's light, its seams and eyes lit as the others' glow)
      // a slow turn on its feet, and now and then (near the lens) a twitch: a jolt, its cell's light flickering
      if (!this.calm && extras && near && (c.twitchIn -= dt) <= 0) { c.twitchIn = 4 + Math.random() * 8; c.twitch = 1; c.flick = Math.max(c.flick, 0.35); }
      c.twitch = Math.max(0, c.twitch - dt * 3.5);
      c.turner.rotation.y = Math.sin(this.t * 0.15 + c.rimPh) * (this.calm ? 0.04 : 0.13);
      c.turner.rotation.z = c.twitch * Math.sin(c.twitch * 38) * 0.05;
      c.turner.position.x = c.twitch * Math.sin(c.twitch * 51) * 0.04;
      if (c.float) c.turner.position.y = c.float[0] * HALL.bossH * (0.65 + 0.35 * Math.sin(this.t * Math.PI * 2 * c.float[1] * (this.calm ? 0.5 : 1) + c.rimPh)); // (it hovers, bobbing)
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
          let want = Math.atan2(cam.x - v.x, cam.z - v.z) - c.anchor.rotation.y - c.turner.rotation.y;
          want = Math.atan2(Math.sin(want), Math.cos(want));
          c.yaw = Motion.damp(c.yaw, clamp(want, -0.6, 0.6) * (c.headK || 1), 2.2, step);
          c.head.parent.getWorldQuaternion(q).invert();
          axis.set(0, 1, 0).applyQuaternion(q).normalize();
          c.head.quaternion.premultiply(q.setFromAxisAngle(axis, c.yaw));
        }
      } else if (c.rig) this.sway(c, this.t);
    }
    if (flicked) this.gFlick.needsUpdate = true;
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
    if (this.probe) { this.probe.dispose(); this.probe = null; }
    if (this.steelEnv) { this.steelEnv.dispose(); this.steelEnv = null; }
    if (this.plates) { this.plates.dispose(); this.plates = null; }
    if (this.kit && this.kit.steelMat) { const U = this.kit.steelMat.userData; if (U.tTread) U.tTread.value.dispose(); if (U.tBrush) U.tBrush.value.dispose(); }
    // (the cells' pictures let go of, and the materials kept a while for their shaders no longer holding them)
    if (this.kit) { this.kit.atlas.dispose(); this.kit.screens.material.uniforms.tAtlas.value = null; }
    if (this.crackTex) { this.crackTex.dispose(); this.glassU.tCrack.value = null; }
    for (const t of this.texs || []) t.dispose();
    for (const m of this.taken || []) hallRelease(m); // (before the scene's own dispose: see hallRelease)
    super.dispose();
  }
}
