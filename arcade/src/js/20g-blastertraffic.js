// The life of Risk Blaster's space: ships that are always on their way somewhere, and the
// things that happen out there every few seconds. Six ship designs, each one geometry drawn
// many times over (lit windows, engines, running lights, hull panels: see spaceHullMaterial
// in 20f-blasterspace.js), each with an engine trail. Everything keeps clear of the way
// ahead, where the enemy and the answers are. Look only: nothing here reads or changes
// the score, shields, timer or the questions.

// ---- the six designs. Noses point down -z; a unit is about a metre and a half. ----------
function spaceShipGeos() {
  const box = new THREE.BoxGeometry(1, 1, 1), B = () => new RacerBatch(["aGlow", "aPanel"]);
  const put = (b, geo, m, color, k = 1, v) => { b.add(geo, m, color, k, v); geo.dispose(); };
  const loft = (b, rings, color, v, m) => put(b, cyLoft(rings), m ? m.clone().multiply(BK_ROT) : BK_ROT, color, 1, v);
  const lamp = (b, x, y, z, s, color, k = 2.4, ch = 2) => b.add(box, racerM(x, y, z, s, s, s), color, k, { aGlow: ch, aPanel: 3 });
  const out = {};

  // Freighter: a spine hung with containers, a bridge aft, twin engines.
  let b = B(), P = { aPanel: 1.5 };
  b.add(box, racerM(0, 0, 0, 2.2, 1.7, 23), 0x4a556f, 1, P);
  loft(b, [[11.4, 1.6, 1.2, 0.4], [13.4, 1.0, 0.8, 0.3]], 0x59648a, P); // (its blunt nose)
  b.add(box, racerM(0, 0.2, -12.4, 1.8, 1.2, 2.2), 0x59648a, 1, P);
  const crate = [0xc8641e, 0x1f8fb4, 0x8a93a8, 0xd9b23a, 0x9a4a3a, 0x3d8a6a];
  for (let i = 0; i < 5; i++) [-1, 1].forEach((sd, j) => {
    b.add(box, racerM(sd * 2.35, 0.1, -8.6 + i * 3.7, 2.3, 2.5, 3.3), crate[(i * 2 + j) % 6], 1, { aPanel: 0.42 });
    if ((i + j) % 2) b.add(box, racerM(sd * 2.35, 2.2, -8.6 + i * 3.7, 2.3, 1.7, 3.3), crate[(i + j * 3 + 2) % 6], 1, { aPanel: 0.42 });
  });
  b.add(box, racerM(0, 2.5, 9.6, 4.2, 2.2, 3.4), 0x6a7896, 1, { aGlow: 4, aPanel: 1.5 }); // bridge, windows lit
  b.add(box, racerM(0, 3.9, 10.2, 3.2, 0.5, 2.2), 0x4a556f, 1, P);
  b.add(box, racerM(0, 5.4, 10.6, 0.16, 2.6, 0.16), 0x9aa4c0, 1, P);
  put(b, new THREE.CylinderGeometry(1.1, 1.1, 0.25, 10), racerM(0, 1.9, -11.2, 1, 1, 1, 0.5), 0xb9c4d8, 1, P); // a dish
  [-1, 1].forEach((sd) => {
    put(b, new THREE.CylinderGeometry(1.0, 1.25, 4.2, 8), racerM(sd * 1.7, -0.1, 12.6, 1, 1, 1, Math.PI / 2), 0x39425e, 1, P);
    put(b, new THREE.CylinderGeometry(0.9, 0.9, 0.2, 10), racerM(sd * 1.7, -0.1, 14.75, 1, 1, 1, Math.PI / 2), 0xffa040, 2.6, { aGlow: 1, aPanel: 3 });
    lamp(b, sd * 3.7, 0.2, -10.6, 0.4, sd < 0 ? 0xff3ad4 : 0x35efff);
  });
  lamp(b, 0, 6.8, 10.6, 0.34, 0xff3a2a);
  out.freighter = b.build();

  // Tanker: three spheres on a truss, a small cabin forward, one great engine bell.
  b = B(); P = { aPanel: 2.2 };
  [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([x, y]) => b.add(box, racerM(x, y, 0, 0.3, 0.3, 25), 0x6a7388, 1, P));
  [-8, 0.8, 9.6].forEach((z, i) => {
    put(b, new THREE.IcosahedronGeometry(3.7, 1), racerM(0, 0, z, 1, 1, 1.06), i === 1 ? 0xd9a850 : 0xc9d2e2, 1, { aPanel: 1.4 });
    put(b, new THREE.TorusGeometry(3.75, 0.2, 4, 14), racerM(0, 0, z, 1, 1, 1), 0x4a556f, 1, P);
    for (let k = 0; k < 4; k++) { const a = k * 1.5708 + 0.785; lamp(b, Math.cos(a) * 3.95, Math.sin(a) * 3.95, z, 0.34, 0xffe2a0, 2, 5); }
  });
  loft(b, [[13, 1.5, 1.3, 0.5], [16, 1.9, 1.5, 0.6], [18.6, 0.7, 0.6, 0.2]], 0x8a93a8, { aGlow: 4, aPanel: 2.2 });
  put(b, new THREE.CylinderGeometry(1.3, 2.6, 3.4, 10), racerM(0, 0, 15.2, 1, 1, 1, Math.PI / 2), 0x39425e, 1, P);
  put(b, new THREE.CylinderGeometry(2.3, 2.3, 0.2, 12), racerM(0, 0, 16.95, 1, 1, 1, Math.PI / 2), 0x6fc8ff, 2.6, { aGlow: 1, aPanel: 3 });
  [-1, 1].forEach((sd) => lamp(b, sd * 4.1, 0, -8, 0.4, sd < 0 ? 0xff3ad4 : 0x35efff));
  out.tanker = b.build();

  // Capital cruiser: a long wedge, stepped decks and a tower aft, flanks of windows, a bank of engines.
  b = B(); P = { aPanel: 3.4 };
  loft(b, [[-60, 9, 5, 2], [-44, 13.5, 7.2, 3], [-8, 12, 6.4, 3], [30, 7, 4.4, 2], [59, 1.6, 1.2, 0.5]], 0x39425e, P);
  [-1, 1].forEach((sd) => {
    b.add(box, racerM(sd * 12.6, 0.4, 26, 0.5, 2.6, 46), 0x2f3854, 1, { aGlow: 3, aPanel: 3.4 }); // the flanks, lit from within
    b.add(box, racerM(sd * 8.2, 0.2, -22, 0.5, 2, 30), 0x2f3854, 1, { aGlow: 3, aPanel: 3.4 });
    put(b, blasterSlab([[sd * 12, 30], [sd * 27, 50], [sd * 27, 57], [sd * 12, 56]], 1.1, 0.3), null, 0x343d5e, 1, P); // fins
    lamp(b, sd * 27.2, 0, 53, 0.9, sd < 0 ? 0xff3ad4 : 0x35efff);
    for (let i = 0; i < 4; i++) lamp(b, sd * (12.9 - i * 1.5), 2.2, 34 - i * 22, 0.55, 0xffe2a0, 1.8, 5);
    b.add(box, racerM(sd * 6.5, -5.6, 12, 5, 0.5, 14), 0x35c8ff, 1.5, { aGlow: 5, aPanel: 3 }); // hangar light
  });
  b.add(box, racerM(0, 7.6, 30, 15, 3.4, 30), 0x343d5e, 1, { aGlow: 3, aPanel: 3.4 });
  b.add(box, racerM(0, 10.8, 35, 10, 3.2, 18), 0x3d4b72, 1, { aGlow: 3, aPanel: 3.4 });
  b.add(box, racerM(0, 15.4, 39, 4.4, 6.2, 6), 0x4a5578, 1, { aGlow: 4, aPanel: 1.2 });
  b.add(box, racerM(0, 20.6, 40, 0.3, 4.4, 0.3), 0x9aa4c0, 1, P);
  lamp(b, 0, 23, 40, 0.8, 0xff3a2a);
  for (let i = 0; i < 4; i++) { put(b, new THREE.CylinderGeometry(1.5, 1.8, 1.4, 8), racerM(0, 6.4 - i * 0.5, 6 - i * 13, 1, 1, 1), 0x59648a, 1, P); b.add(box, racerM(0, 7.2 - i * 0.5, 3.8 - i * 13, 0.4, 0.4, 4.4), 0x6a7388, 1, P); } // turrets
  for (let i = 0; i < 6; i++) {
    const x = ((i % 3) - 1) * 6.4, y = i < 3 ? 2.2 : -2.4;
    put(b, new THREE.CylinderGeometry(2.3, 2.7, 4, 10), racerM(x, y, 60.5, 1, 1, 1, Math.PI / 2), 0x2a3350, 1, P);
    put(b, new THREE.CylinderGeometry(2.0, 2.0, 0.2, 12), racerM(x, y, 62.6, 1, 1, 1, Math.PI / 2), 0x7fd0ff, 2.8, { aGlow: 1, aPanel: 3 });
  }
  out.cruiser = b.build();

  // Fighter: a dart with forward-swept wings and canted fins (not the player's ship).
  b = B(); P = { aPanel: 0.8 };
  loft(b, [[-2.0, 0.3, 0.24, 0.1], [-0.6, 0.52, 0.38, 0.16], [0.9, 0.42, 0.32, 0.14], [2.4, 0.07, 0.06, 0.02]], 0x4a5a80, P);
  [-1, 1].forEach((sd) => {
    put(b, blasterSlab([[sd * 0.4, 0.1], [sd * 2.2, -0.6], [sd * 2.2, -1.15], [sd * 0.4, 1.3]], 0.08, 0.02), null, 0x39486a, 1, P);
    b.add(box, racerM(sd * 1.3, 0.06, 0.05, 1.5, 0.03, 0.22, 0, sd * 0.42, 0), 0x35efff, 1.2, { aGlow: 5, aPanel: 3 }); // a stripe of light on each wing
    b.add(box, racerM(sd * 0.5, 0.45, 1.5, 0.06, 0.8, 0.8, 0, 0, -sd * 0.5), 0x39486a, 1, P);
    lamp(b, sd * 2.2, 0, -0.9, 0.14, sd < 0 ? 0xff3ad4 : 0x35efff, 2.6);
  });
  b.add(box, racerM(0, 0.36, -0.5, 0.34, 0.2, 0.9), 0x10131c, 1, P);
  b.add(box, racerM(0, 0, 2.06, 0.5, 0.34, 0.08), 0xff7a9a, 2.8, { aGlow: 1, aPanel: 3 });
  out.fighter = b.build();

  // Patrol drone: a core in a ring, three antennae, one searching eye.
  b = B(); P = { aPanel: 0.7 };
  put(b, new THREE.IcosahedronGeometry(1, 1), null, 0x59648a, 1, P);
  put(b, new THREE.TorusGeometry(1.55, 0.13, 5, 16), racerM(0, 0, 0, 1, 1, 1, Math.PI / 2), 0x8a93a8, 1, P);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.2832 + 0.5, e = new THREE.Vector3(Math.cos(a) * 2.3, -0.9, Math.sin(a) * 2.3 + 0.6);
    racerStrut(b, box, new THREE.Vector3(Math.cos(a) * 0.8, -0.3, Math.sin(a) * 0.8), e, 0.08, 0x6a7388, 1, P);
    lamp(b, e.x, e.y, e.z, 0.2, i ? 0x35efff : 0xff3ad4, 2.6);
  }
  b.add(box, racerM(0, 0.05, -0.98, 0.5, 0.3, 0.12), 0xff5a2a, 2.8, { aGlow: 5, aPanel: 3 });
  b.add(box, racerM(0, 0, 1.0, 0.36, 0.36, 0.1), 0x6fc8ff, 2.4, { aGlow: 1, aPanel: 3 });
  out.drone = b.build();

  // Shuttle: a pale rounded cabin with a row of windows, stub wings, a fin, twin engines.
  b = B(); P = { aPanel: 0.9 };
  loft(b, [[-3.6, 1.2, 0.9, 0.4], [-1, 1.6, 1.25, 0.5], [2.4, 1.4, 1.1, 0.5], [4, 0.5, 0.45, 0.2]], 0xc9d2e2, P);
  [-1, 1].forEach((sd) => {
    b.add(box, racerM(sd * 1.56, 0.35, -0.6, 0.08, 0.5, 4), 0x6a7896, 1, { aGlow: 4, aPanel: 0.9 });
    b.add(box, racerM(sd * 1.6, -0.3, -0.4, 0.06, 0.22, 5.2), 0xff3ad4, 1.3, { aGlow: 5, aPanel: 3 });
    put(b, blasterSlab([[sd * 1.3, 0.2], [sd * 3.1, 1.6], [sd * 3.1, 2.5], [sd * 1.3, 2.6]], 0.14, 0.03), racerM(0, -0.4, 0), 0xa8b2c8, 1, P);
    put(b, new THREE.CylinderGeometry(0.42, 0.5, 1.5, 8), racerM(sd * 0.75, 0, 3.6, 1, 1, 1, Math.PI / 2), 0x4a556f, 1, P);
    put(b, new THREE.CylinderGeometry(0.36, 0.36, 0.1, 8), racerM(sd * 0.75, 0, 4.4, 1, 1, 1, Math.PI / 2), 0xffb060, 2.6, { aGlow: 1, aPanel: 3 });
    lamp(b, sd * 3.1, -0.4, 2.0, 0.16, sd < 0 ? 0xff3ad4 : 0x35efff, 2.6);
  });
  b.add(box, racerM(0, 0.75, -3.0, 1.5, 0.5, 1.3, 0.5), 0x10131c, 1, P); // windscreen
  b.add(box, racerM(0, 1.7, 2.6, 0.1, 1.5, 1.6), 0xa8b2c8, 1, P);
  lamp(b, 0, -1.2, 0, 0.2, 0xffffff, 2.4);
  out.shuttle = b.build();

  // The whale: a great slow swimmer with wide fins and lights along its flanks.
  b = B(); P = { aPanel: 1000 };
  loft(b, [[-42, 0.8, 1, 0.3], [-30, 4, 3.4, 1.4], [-6, 9.5, 7.2, 3], [14, 8.4, 6.6, 2.6], [32, 6.2, 5, 2], [40, 4.2, 3.6, 1.4], [43, 2, 1.8, 0.7]], 0x1c2256, P);
  [-1, 1].forEach((sd) => {
    put(b, blasterSlab([[sd * 8, -8], [sd * 36, 6], [sd * 31, 15], [sd * 8, 9]], 0.9, 0.3), racerM(0, -1, 0), 0x232a6a, 1, P);
    put(b, blasterSlab([[sd * 0.5, 36], [sd * 14, 48], [sd * 3, 43]], 0.5, 0.1), null, 0x232a6a, 1, P);
    for (let i = 0; i < 9; i++) lamp(b, sd * (9.2 - Math.abs(i - 3) * 0.7), 1.5 + (i % 3) * 1.1, -12 + i * 5.5, 0.5 + (i % 2) * 0.25, i % 3 ? 0x35efff : 0xff5fd0, 2.2, 5);
    for (let i = 0; i < 5; i++) lamp(b, sd * (14 + i * 4.4), -0.4, 1 + i * 2.2, 0.45, 0x7ae8ff, 2, 5);
    lamp(b, sd * 5.6, 2.6, -27, 0.7, 0xffe2a0, 2.6, 5); // its eye
  });
  out.whale = b.build();
  box.dispose();
  return out;
}

// Light with no surface: engine trails (a tapering streak behind each ship) and bolts (lasers, meteors, lightning).
function spaceGlowMaterial(trail) {
  return new THREE.ShaderMaterial({
    defines: trail ? { SPACE_TRAIL: 1 } : {},
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\nvC = instanceColor;\n#endif\ngl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; varying vec2 vUv; void main(){ float a = 1.0;\n#ifdef SPACE_TRAIL\na = pow(1.0 - vUv.y, 2.0) * pow(max(0.0, 1.0 - abs(vUv.x - 0.5) * 2.0), 1.5);\n#endif\ngl_FragColor = vec4(vC * a, 1.0); }",
  });
}

const SPACE_TYPES = { // how many of each at most, where its engines are (behind its middle), its trail's colour and width, how big it is drawn
  freighter: [6, 14.6, [2.4, 1.0, 0.35], 2.6, 1.4], tanker: [5, 16.8, [0.45, 1.2, 2.4], 3.4, 1.3], cruiser: [2, 62, [0.5, 1.3, 2.6], 15, 1], fighter: [22, 2.1, [2.4, 0.7, 1.2], 0.55, 1.8],
  drone: [8, 1.0, [0.4, 1.3, 2.2], 0.4, 1.7], shuttle: [8, 4.4, [2.4, 1.4, 0.5], 1.5, 1.5], hulk: [2, 0, null, 0, 1],
};
class SpaceTraffic {
  constructor(space) {
    const g = (this.g = space.g);
    this.space = space;
    const geos = (this.geos = spaceShipGeos());
    geos.hulk = space.wreckMesh.geometry.clone();
    this.types = {};
    let total = 0;
    for (const name in SPACE_TYPES) {
      const [cap, rear, col, tw, size] = SPACE_TYPES[name], mesh = spaceInstanced(geos[name], space.hull, cap);
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < cap; i++) mesh.setMatrixAt(i, zero);
      g.scene.add(mesh);
      this.types[name] = { mesh, cap, rear, col, tw, size, free: Array.from({ length: cap }, (_, i) => cap - 1 - i), base: total };
      total += cap;
    }
    // one streak of engine light per ship
    const tg = new THREE.BufferGeometry();
    tg.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 1, -0.5, 0, 1, 0, -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1], 3));
    tg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1], 2));
    tg.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
    this.trails = new THREE.InstancedMesh(tg, spaceGlowMaterial(true), total);
    this.trails.frustumCulled = false;
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < total; i++) { this.trails.setMatrixAt(i, this._zero); this.trails.setColorAt(i, new THREE.Color(0, 0, 0)); }
    g.scene.add(this.trails);
    g.decorCheap(this.trails);
    this.ships = [];
    this.cool = 0.5; this.sp0 = 26;
    this._p = new THREE.Vector3(); this._h = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._r = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    this._fwd = new THREE.Vector3(0, 0, -1); this._z = new THREE.Vector3(0, 0, 1);
  }
  // A ship sets off. o: { p: [x, y, z], v: [x, y, z] (its own speed through space), s: size, ev: an event's (not counted as traffic),
  // life: seconds, weave: how far it wanders, script(ship, t, dt): an event flies it, tumble: it turns over instead of facing its way }
  spawn(type, o) {
    const T = this.types[type];
    if (!T || !T.free.length) return null;
    T.free.sort((a, b) => b - a); // (the lowest free place is taken first, so the places in use stay together)
    const s = { type, T, slot: T.free.pop(), p: new THREE.Vector3(...o.p), v: new THREE.Vector3(...(o.v || [0, 0, 0])), s: (o.s || 1) * T.size, ev: !!o.ev, life: o.life || 90, weave: o.weave || 0, script: o.script || null, tumble: o.tumble || null,
      t: 0, part: 0, roll: 0, alive: true, ph: Math.random() * 6.283, last: new THREE.Vector3(...o.p), head: new THREE.Vector3(0, 0, -1), sd: o.p[0] < 0 ? -1 : 1 };
    this.ships.push(s);
    return s;
  }
  kill(s) {
    if (!s.alive) return;
    s.alive = false;
    s.T.mesh.setMatrixAt(s.slot, this._zero);
    s.T.mesh.instanceMatrix.needsUpdate = true;
    this.trails.setMatrixAt(s.T.base + s.slot, this._zero);
    s.T.free.push(s.slot);
  }
  count(type) { let n = 0; for (const s of this.ships) if (s.type === type && !s.ev) n++; return n; }
  // a right answer: everything near moves aside for the fighter, and comes back
  part() { if (!REDUCED_MOTION) this.ships.forEach((s) => { if (s.p.z > -320 && !s.script && !s.tumble) s.part = 1; }); }
  // one more ship of the regular traffic, on a path that suits it
  ambient(type) {
    const sp = this.sp0, sd = Math.random() < 0.5 ? -1 : 1, r = Math.random();
    if (type === "fighter") {
      const wing = [[0, 0, 0], [-2.6, 0.5, 3.4], [2.6, 0.5, 3.4]];
      if (r < 0.5) { const x = sd * rand(12, 17), y = rand(-3, 9); wing.forEach((o) => this.spawn(type, { p: [x + o[0], y + o[1], 16 + o[2]], v: [0, 0, -sp * 1.55], life: 40 })); } // they overtake, close by
      else { const z = -rand(130, 230), y = -z * rand(0.15, 0.2), vx = sd * rand(40, 58); wing.forEach((o) => this.spawn(type, { p: [-sd * (-z * 0.3 + 14) + o[0], y + o[1], z + o[2]], v: [vx, rand(-2, 2), -sp], life: 12 })); } // or cross, high
    } else if (type === "shuttle") {
      if (r < 0.5) this.spawn(type, { p: [sd * rand(13, 20), rand(-7, 9), -640], v: [0, 0, sp * 0.5], life: 40 }); // coming the other way
      else this.spawn(type, { p: [sd * rand(13, 19), rand(-6, 8), 14], v: [0, 0, -sp * 1.4], life: 60 });
    } else if (type === "drone") this.spawn(type, { p: [sd * rand(14, 24), rand(-8, 10), -420], v: [0, 0, -sp * 0.2], weave: rand(1.5, 3), s: rand(0.9, 1.4), life: 50 });
    else if (type === "cruiser") { const z = -rand(430, 560), up = Math.random() < 0.7; this.spawn(type, { p: [-sd * (-z * 0.3 + 70), up ? rand(40, 78) : -rand(46, 60), z], v: [sd * rand(10, 14), 0, -sp], life: 80 }); }
    else if (r < 0.55) this.spawn(type, { p: [sd * rand(34, 64), rand(-22, 30), -660], v: [0, 0, -sp * 0.45], life: 80 }); // haulers: slowly overtaken
    else { const z = -rand(280, 460); this.spawn(type, { p: [-sd * (-z * 0.3 + 26), -z * rand(0.1, 0.17) * (Math.random() < 0.7 ? 1 : -1), z], v: [sd * rand(14, 22), 0, -sp], life: 60 }); } // or crossing far ahead
  }
  update(dt, sp, w) {
    const g = this.g, cheap = GFX.ok && GFX.Q[GFX.qi].cheap, tr = this.space.cur.traffic, m = this._m, q = this._q, p = this._p;
    if (w < 0.02) this.sp0 = sp;
    // keep the region's traffic up
    if ((this.cool -= dt) <= 0 && w < 0.05) {
      this.cool = rand(0.5, 1.3);
      const dens = (GFX.calm ? 0.5 : 1) * (cheap ? 0.45 : 1), want = SPACE_SHIPS.filter((n) => this.count(n) < Math.round(tr[n] * dens));
      if (want.length) this.ambient(want[randInt(0, want.length - 1)]);
    }
    const dirty = {}, hi = {};
    for (let i = this.ships.length - 1; i >= 0; i--) {
      const s = this.ships[i];
      s.t += dt;
      if (s.script) s.script(s, s.t, dt);
      else { s.p.x += s.v.x * dt; s.p.y += s.v.y * dt; s.p.z += (s.v.z + sp) * dt; }
      if (!s.alive || s.t > s.life || s.p.z > 30 || s.p.z < -960 || Math.abs(s.p.x) > 460) { this.kill(s); this.ships.splice(i, 1); dirty[s.type] = 1; continue; }
      // where it is drawn: wandering a little, moved aside after a right answer
      p.copy(s.p);
      if (s.weave) { p.x += Math.sin(s.t * 0.9 + s.ph) * s.weave; p.y += Math.cos(s.t * 0.7 + s.ph) * s.weave * 0.6; }
      let roll = Math.sin(s.t * 0.8 + s.ph) * 0.06;
      if (s.part > 0) {
        s.part = Math.max(0, s.part - dt / 2.2);
        const f = Math.sin(Math.PI * (1 - s.part)), len = Math.hypot(s.p.x, s.p.y) || 1, d = (6 + Math.abs(s.p.z) * 0.035) * f;
        p.x += (s.p.x / len) * d; p.y += (s.p.y / len) * d * 0.6;
        roll += -s.sd * 0.55 * f;
      }
      if (s.tumble) q.setFromAxisAngle(s.tumble.ax, s.ph + s.t * s.tumble.w);
      else {
        // it faces the way it is going (through space, not across the screen)
        if (s.script) { this._h.copy(s.p).sub(s.last).multiplyScalar(1 / Math.max(dt, 1e-3)); this._h.z -= sp; s.last.copy(s.p); } else this._h.copy(s.v);
        if (this._h.lengthSq() > 1) { this._h.normalize(); s.head.lerp(this._h, Math.min(1, dt * 6)).normalize(); }
        q.setFromUnitVectors(this._fwd, s.head).multiply(this._r.setFromAxisAngle(this._z, roll));
      }
      const k = s.s * smoothstep(0, 0.7, s.t) * (s.life - s.t < 0.5 ? Math.max(0, (s.life - s.t) / 0.5) : 1);
      s.T.mesh.setMatrixAt(s.slot, m.compose(p, q, this._s.setScalar(k)));
      dirty[s.type] = 1;
      hi[s.type] = Math.max(hi[s.type] || 0, s.slot + 1);
      if (s.T.col) {
        const speed = s.script ? 40 : s.v.length(), len = clamp(speed * 0.32, 3, 30) * (1 + w * 2) * (s.type === "cruiser" ? 2.2 : 1), tw = s.T.tw * k;
        p.add(this._h.set(0, 0, s.T.rear * k).applyQuaternion(q));
        this.trails.setMatrixAt(s.T.base + s.slot, m.compose(p, q, this._s.set(tw, tw, len)));
        this.trails.setColorAt(s.T.base + s.slot, this._c.setRGB(s.T.col[0], s.T.col[1], s.T.col[2]).multiplyScalar(0.55));
      }
    }
    for (const n in dirty) this.types[n].mesh.instanceMatrix.needsUpdate = true;
    for (const n in this.types) { const mesh = this.types[n].mesh; mesh.count = hi[n] || 0; mesh.visible = mesh.count > 0; }
    this.trails.instanceMatrix.needsUpdate = true;
    if (this.trails.instanceColor) this.trails.instanceColor.needsUpdate = true;
  }
  dispose() { this.trails.material.dispose(); }
}

// Bolts and flashes for whatever happens: a pool of each, made once.
class SpaceFX {
  constructor(space) {
    const g = (this.g = space.g);
    this.bolts = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), spaceGlowMaterial(false), 48);
    this.bolts.frustumCulled = false;
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.pool = Array.from({ length: 48 }, (_, i) => { this.bolts.setMatrixAt(i, this._zero); this.bolts.setColorAt(i, new THREE.Color(0, 0, 0)); return { i, life: 0, t: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), len: 1, w: 1, col: new THREE.Color(), q: new THREE.Quaternion() }; });
    g.scene.add(this.bolts);
    this.flashes = Array.from({ length: 6 }, () => { const sp = glowSprite(0xffffff, 1, 0); sp.visible = false; g.scene.add(sp); return { sp, t: 0, dur: 0, a: 0, s0: 1, s1: 1 }; });
    this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._c = new THREE.Color(); this._z = new THREE.Vector3(0, 0, 1); this._d = new THREE.Vector3();
  }
  // a streak of light from p moving at v for life seconds
  bolt(p, v, life, col, len, w) {
    const b = this.pool.find((x) => x.life <= 0);
    if (!b) return;
    b.p.copy(p); b.v.copy(v); b.life = b.t = life; b.len = len; b.w = w; b.col.setRGB(col[0], col[1], col[2]);
    b.q.setFromUnitVectors(this._z, this._d.copy(v).normalize());
  }
  // a still streak between two points (lightning, a laser that lands)
  beam(a, c, life, col, w) {
    const b = this.pool.find((x) => x.life <= 0);
    if (!b) return;
    b.p.copy(a).add(c).multiplyScalar(0.5); b.v.set(0, 0, 0); b.life = b.t = life; b.len = a.distanceTo(c); b.w = w; b.col.setRGB(col[0], col[1], col[2]);
    b.q.setFromUnitVectors(this._z, this._d.copy(c).sub(a).normalize());
  }
  // a glow that swells and fades once (never a flicker): from size s0 to s1 over dur
  flash(p, col, s0, s1, dur, a = 1) {
    const f = this.flashes.find((x) => x.t <= 0) || this.flashes[0];
    f.sp.position.copy(p); f.sp.material.color.setRGB(col[0], col[1], col[2]); f.t = f.dur = dur; f.a = a; f.s0 = s0; f.s1 = s1; f.sp.visible = true;
    return f;
  }
  update(dt, sp) {
    let hi = 0;
    this.pool.forEach((b) => {
      if (b.life <= 0) return;
      hi = b.i + 1;
      b.life -= dt;
      if (b.life <= 0) { this.bolts.setMatrixAt(b.i, this._zero); return; }
      b.p.addScaledVector(b.v, dt); b.p.z += sp * dt;
      this.bolts.setMatrixAt(b.i, this._m.compose(b.p, b.q, this._s.set(b.w, b.w, b.len)));
      this.bolts.setColorAt(b.i, this._c.copy(b.col).multiplyScalar(Math.min(1, (b.life / b.t) * 2.5)));
    });
    this.bolts.count = hi; // (only the bolts in flight are drawn)
    this.bolts.visible = hi > 0;
    this.bolts.instanceMatrix.needsUpdate = true;
    if (this.bolts.instanceColor) this.bolts.instanceColor.needsUpdate = true;
    this.flashes.forEach((f) => {
      if (f.t <= 0) return;
      f.t -= dt;
      const k = 1 - Math.max(0, f.t) / f.dur;
      f.sp.visible = f.t > 0;
      f.sp.position.z += sp * dt;
      f.sp.scale.setScalar(lerp(f.s0, f.s1, k));
      f.sp.material.opacity = Math.sin(Math.PI * k) * f.a;
    });
  }
}

// What happens out there. Every 3 to 6 seconds the director picks something that this region can show
// (slower, and never the flashing ones, with Reduced effects; slower while a question is up).
function spaceEvents(space) {
  const g = space.g, T = space.traffic, FX = (space.fx = new SpaceFX(space)), D = new EventDirector(g, { min: 3, max: 6 });
  const side = () => (Math.random() < 0.5 ? -1 : 1), quiet = () => g.state === "ask" || g.state === "explain", R = Math.PI / 180;
  const frame = (ax, ay, d, out) => (out || new THREE.Vector3()).set(d * Math.tan(ax * R), d * Math.tan(ay * R), -d); // a place in the window: degrees right, degrees up, how far
  const inReg = (...ids) => () => ids.includes(space.cur.id), alive = (run) => run.ships.some((s) => s.alive);
  const v = new THREE.Vector3(), w = new THREE.Vector3();

  // 1. a squadron of fighters crosses in formation
  D.add({ id: "squadron", dur: 10, update: (dt, t, run) => alive(run),
    start: (run) => {
      const sd = side(), z = -rand(120, 200), y = -z * rand(0.15, 0.2), vx = sd * rand(46, 60);
      run.ships = [[0, 0, 0], [-3, 0.6, 4], [3, 0.6, 4], [-6, 1.2, 8], [6, 1.2, 8]].map((o) => T.spawn("fighter", { p: [-sd * (-z * 0.3 + 16) + o[0], y + o[1], z + o[2]], v: [vx, rand(-1.5, 1.5), -T.sp0], ev: true, life: 10 })).filter(Boolean);
      if (run.ships.length && !quiet()) Sound.sfx("whoosh", -sd * 0.7);
      return run.ships.length > 0;
    } });
  // 2. a capital cruiser slides past far ahead, two fighters at its side
  D.add({ id: "capital", dur: 34, can: () => space.cur.id !== "graveyard", update: (dt, t, run) => alive(run),
    start: (run) => {
      const sd = side(), z = -rand(440, 540), y = -z * rand(0.1, 0.15), vx = sd * rand(20, 27), x = -sd * (-z * 0.3 + 72);
      run.ships = [T.spawn("cruiser", { p: [x, y, z], v: [vx, 0, -T.sp0], ev: true, life: 34 }), T.spawn("fighter", { p: [x + sd * 30, y + 16, z + 30], v: [vx, 0, -T.sp0], ev: true, life: 34, s: 1.6 }), T.spawn("fighter", { p: [x + sd * 14, y + 20, z + 44], v: [vx, 0, -T.sp0], ev: true, life: 34, s: 1.6 })].filter(Boolean);
      return run.ships.length > 0;
    } });
  // 3. a convoy: haulers in line, escorts beside them
  D.add({ id: "convoy", dur: 46, can: () => space.cur.id !== "graveyard", update: (dt, t, run) => alive(run),
    start: (run) => {
      const sd = side(), x = sd * rand(36, 52), y = rand(-14, 24);
      run.ships = ["freighter", "tanker", "freighter"].map((n, i) => T.spawn(n, { p: [x, y, -640 - i * 48], v: [0, 0, -T.sp0 * 0.3], ev: true, life: 46 }));
      run.ships.push(T.spawn("fighter", { p: [x - sd * 12, y + 6, -650], v: [0, 0, -T.sp0 * 0.3], ev: true, life: 46, weave: 2 }), T.spawn("fighter", { p: [x - sd * 10, y - 7, -720], v: [0, 0, -T.sp0 * 0.3], ev: true, life: 46, weave: 2 }));
      run.ships = run.ships.filter(Boolean);
      return run.ships.length > 0;
    } });
  // 4. patrol drones sweep by, searching
  D.add({ id: "patrol", dur: 24, update: (dt, t, run) => alive(run),
    start: (run) => {
      const sd = side(), x = sd * rand(13, 18), y = rand(-4, 8);
      run.ships = [0, 1, 2].map((i) => T.spawn("drone", { p: [x + i * sd * 1.5, y + i * 1.2, -380 - i * 16], v: [0, 0, -T.sp0 * 0.1], ev: true, life: 24, weave: 2.4, s: 1.3 })).filter(Boolean);
      return run.ships.length > 0;
    } });
  // 5. shuttles in their lane: two coming, two going, lights blinking
  D.add({ id: "shuttles", dur: 30, can: () => space.cur.id !== "graveyard", update: (dt, t, run) => alive(run),
    start: (run) => {
      const sd = side();
      run.ships = [T.spawn("shuttle", { p: [sd * 15, 5, -640], v: [0, 0, T.sp0 * 0.45], ev: true, life: 30 }), T.spawn("shuttle", { p: [sd * 17, 7, -700], v: [0, 0, T.sp0 * 0.45], ev: true, life: 30 }),
        T.spawn("shuttle", { p: [-sd * 14, -3, 14], v: [0, 0, -T.sp0 * 1.4], ev: true, life: 30 }), T.spawn("shuttle", { p: [-sd * 16, -1, 34], v: [0, 0, -T.sp0 * 1.4], ev: true, life: 30 })].filter(Boolean);
      return run.ships.length > 0;
    } });
  // 6. a dogfight in the distance: one chases the other round, firing (a shot every 0.45 s); they break off
  D.add({ id: "dogfight", dur: 8,
    start: (run) => {
      const sd = side(), c = frame(sd * 10.5, 9, 175), ph = rand(6.283);
      const path = (lag) => (s, t) => { const a = (t - lag) * 1.5 + ph; if (t < 5.4) s.p.set(c.x + Math.cos(a) * 14, c.y + Math.sin(a * 2) * 5, c.z + Math.sin(a) * 16); else { s.script = null; s.v.set(sd * (lag ? 46 : -38), lag ? 12 : -8, -T.sp0 - 30); } };
      run.ships = [T.spawn("fighter", { p: [c.x + 14, c.y, c.z], ev: true, life: 8, script: path(0), s: 1.25 }), T.spawn("fighter", { p: [c.x + 14, c.y, c.z], ev: true, life: 8, script: path(0.5), s: 1.25 })].filter(Boolean);
      run.shot = 0.8;
      return run.ships.length === 2;
    },
    update: (dt, t, run) => {
      const [prey, hunter] = run.ships;
      if (t < 5.2 && t > run.shot && prey.alive && hunter.alive) { run.shot = t + 0.45; FX.bolt(hunter.p, v.copy(prey.p).sub(hunter.p).normalize().multiplyScalar(150), 0.28, [2.8, 0.5, 0.45], 5, 0.24); }
      return alive(run);
    } });
  // 7. far off, a ship blows up: one flash, a ring, debris
  D.add({ id: "explosion", dur: 3, flashy: true, can: () => space.cur.id !== "station",
    start: (run) => { run.sd = side(); run.p = frame(run.sd * rand(9.5, 12), (Math.random() < 0.6 ? 1 : -1) * rand(7, 10), rand(260, 360)); run.ship = T.spawn("freighter", { p: [run.p.x, run.p.y, run.p.z], v: [0, 0, -T.sp0], ev: true, life: 3 }); run.done = false; return !!run.ship; },
    update: (dt, t, run) => {
      if (!run.done && t > 0.7) {
        run.done = true;
        const p = run.ship.p;
        T.kill(run.ship);
        FX.flash(p, [2.6, 1.6, 0.8], 10, 56, 0.9, 0.9);
        g.bursts.burst(p, COLORS.orange, { n: 54, speed: 24, size: 1.7, life: 1.3 });
        g.bursts.burst(p, 0xffffff, { n: 18, speed: 10, size: 1.2, life: 0.7 });
        for (let i = 0; i < 6; i++) FX.bolt(p, v.set(rand(-1, 1), rand(-1, 1), rand(-0.4, 0.4)).normalize().multiplyScalar(rand(30, 60)), 1.2, [2.2, 0.9, 0.3], 3, 0.5);
        if (!quiet()) { g.shockwave(p.clone(), neon(0xffb357, 2), 30, 0.9); Sound.sfx("boom", run.sd * 0.8); }
      }
      return t < 2.8;
    } });
  // 8. a comet crosses high, its tail behind it
  const comet = glowSprite(neon(0xbfe8ff, 2.2), 7, 1), tail = new Trail({ length: 26, width: 1.4, color: 0x9fd8ff, intensity: 1.2 });
  comet.visible = tail.mesh.visible = false;
  g.scene.add(comet, tail.mesh);
  g.decor(tail.mesh);
  D.add({ id: "comet", dur: 6,
    start: (run) => { const sd = side(); run.a = frame(-sd * 15, rand(9, 12.5), 430); run.b = frame(sd * 15, rand(4, 9), 380); tail.pts = []; comet.visible = tail.mesh.visible = true; },
    update: (dt, t, run) => { comet.position.lerpVectors(run.a, run.b, t / 5.4); tail.push(comet.position); return t < 5.4; },
    end: () => { comet.visible = tail.mesh.visible = false; } });
  // 9. a meteor shower through one corner of the sky
  D.add({ id: "meteors", dur: 3.4,
    start: (run) => { run.sd = side(); run.n = 0; },
    update: (dt, t, run) => {
      while (run.n < 9 && t > run.n * 0.28) { run.n++; FX.bolt(frame(run.sd * rand(3, 13), rand(11, 14), rand(200, 280), v), w.set(-run.sd * rand(50, 70), -rand(85, 110), 20), 0.85, [2.2, 1.8, 1.2], rand(9, 15), 0.32); }
      return t < 3.3;
    } });
  // 10. a cluster of rocks tumbles past, close on one side
  const cluster = spaceInstanced(space.rockNear.geometry.clone(), space.rockMat, 8), cq = new THREE.Quaternion(), cm = new THREE.Matrix4(), cs = new THREE.Vector3();
  cluster.visible = false;
  g.scene.add(cluster);
  g.decorCheap(cluster);
  D.add({ id: "asteroids", dur: 18, can: inReg("nebula", "belt", "orbit", "graveyard", "gate"),
    start: (run) => { run.sd = side(); run.x = run.sd * rand(22, 32); run.y = rand(-10, 15); run.z = -620; run.r = Array.from({ length: 8 }, () => ({ o: new THREE.Vector3(rand(-9, 9), rand(-8, 8), rand(-22, 22)), ax: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), w: rand(0.3, 1.1), s: rand(1.2, 3.6) })); cluster.visible = true; },
    update: (dt, t, run) => {
      run.z += space.sp * 1.6 * dt;
      run.r.forEach((r, i) => { const z = run.z + r.o.z, k = smoothstep(-640, -560, z) * (1 - smoothstep(-40, 14, z)); cluster.setMatrixAt(i, cm.compose(v.set(run.x + r.o.x, run.y + r.o.y, z), cq.setFromAxisAngle(r.ax, t * r.w), cs.setScalar(r.s * k))); });
      cluster.instanceMatrix.needsUpdate = true;
      return run.z < 40;
    },
    end: () => { cluster.visible = false; } });
  // 11. a wormhole opens in a corner of the sky; three fighters come out of it; it closes
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1, 40), space.vortexMat());
  hole.visible = false;
  g.scene.add(hole);
  D.add({ id: "wormhole", dur: 5,
    start: (run) => { run.sd = side(); run.p = frame(run.sd * rand(9.5, 11.5), (Math.random() < 0.65 ? 1 : -1) * rand(7.5, 9.5), 300); run.out = false; hole.visible = true; hole.scale.setScalar(0.01); hole.material.uniforms.uColA.value.copy(space.cur.a).multiplyScalar(1.5); hole.material.uniforms.uColB.value.copy(space.cur.c).multiplyScalar(1.3); },
    update: (dt, t, run) => {
      run.p.z += space.sp * 0.2 * dt;
      hole.position.copy(run.p);
      hole.quaternion.copy(g.camera.quaternion);
      hole.scale.setScalar(Math.max(0.01, 17 * smoothstep(0, 0.9, t) * (1 - smoothstep(3.6, 4.5, t))));
      hole.material.uniforms.uTime.value = t * 3;
      hole.material.uniforms.uK.value = 0.9;
      if (!run.out && t > 1.3) { run.out = true; [[0, 0, 0], [-3, 1, -4], [3, 1, -4]].forEach((o) => T.spawn("fighter", { p: [run.p.x + o[0], run.p.y + o[1], run.p.z + o[2]], v: [-run.sd * rand(16, 24), -rand(2, 6), 16 - T.sp0], ev: true, life: 9, s: 1.5 })); }
      return t < 4.6;
    },
    end: () => { hole.visible = false; } });
  // 12. a space whale swims across, far away
  const whale = new THREE.Mesh(T.geos.whale, spaceHullMaterial(space.shared, { swim: true }));
  whale.visible = false;
  whale.frustumCulled = false;
  g.scene.add(whale);
  D.add({ id: "whale", dur: 26, can: inReg("nebula", "belt", "orbit", "gate"),
    start: (run) => { run.sd = side(); run.z = -rand(380, 460); run.y = (Math.random() < 0.7 ? 1 : -0.75) * -run.z * rand(0.13, 0.17); run.x = -run.sd * (-run.z * 0.3 + 70); whale.visible = true; whale.rotation.set(0, run.sd > 0 ? -Math.PI / 2 : Math.PI / 2, 0); },
    update: (dt, t, run) => { run.x += run.sd * 17 * dt; whale.position.set(run.x, run.y + Math.sin(t * 0.5) * 3, run.z); whale.rotation.z = Math.sin(t * 0.45) * 0.06; return Math.abs(run.x) < -run.z * 0.3 + 76; },
    end: () => { whale.visible = false; } });
  // 13. an ion storm: three slow pulses of light in the clouds, a fork of lightning with each (1.5 a second at most)
  D.add({ id: "ionstorm", dur: 2.6, flashy: true, can: inReg("nebula", "orbit", "graveyard", "gate"),
    start: (run) => { run.p = frame(side() * rand(9, 11.5), rand(7.5, 10), 520); run.n = 0; },
    update: (dt, t, run) => {
      if (run.n < 3 && t > 0.2 + run.n * 0.66) {
        run.n++;
        const p = v.copy(run.p).add(w.set(rand(-14, 14), rand(-10, 10), 0));
        FX.flash(p, [0.9, 1.3, 2.4], 50, 80, 0.5, 0.55);
        let a = p.clone().add(w.set(rand(-8, 8), 26, 0));
        for (let i = 0; i < 5; i++) { const c = a.clone().add(w.set(rand(-9, 9), -10.4, 0)); FX.beam(a, c, 0.26, [1.6, 2.0, 2.8], 0.5); a = c; }
      }
      return t < 2.5;
    } });
  // 14. the star flares: it swells and a ring of light spreads from it, slowly
  D.add({ id: "flare", dur: 2.6,
    start: () => { space.sunBoost = 1; FX.flash(v.copy(space.sunDir).multiplyScalar(900).add(g.camera.position), [space.cur.sunCol.r * 1.6, space.cur.sunCol.g * 1.3, space.cur.sunCol.b], 60, 230, 2.4, 0.3); },
    update: (dt, t) => t < 2.5 });
  // 15. far ships jump to warp: each stretches into a line of light and is gone
  D.add({ id: "warpjump", dur: 2.2, can: () => space.cur.id !== "graveyard",
    start: (run) => { run.p = frame(side() * rand(9.5, 12), rand(-8, 9.5), 340); run.n = 0; },
    update: (dt, t, run) => {
      if (run.n < 3 && t > run.n * 0.45) { const p = v.copy(run.p).add(w.set(run.n * 7 - 7, run.n * 3 - 3, run.n * 12)); run.n++; FX.flash(p, [1.0, 2.0, 2.6], 4, 13, 0.36, 0.8); FX.bolt(p, w.set(0, 0, -900), 0.55, [1.1, 2.1, 2.8], 70, 0.4); }
      return t < 2;
    } });
  // 16. a derelict drifts by on one side, turning over, a lamp still blinking, something shorting
  D.add({ id: "derelict", dur: 20, can: inReg("nebula", "belt", "graveyard", "gate", "orbit"),
    start: (run) => { const sd = side(); run.ship = T.spawn("hulk", { p: [sd * rand(34, 46), rand(-10, 22), -640], v: [0, 0, T.sp0 * 0.7], ev: true, life: 20, s: rand(0.55, 0.8), tumble: { ax: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), w: rand(0.12, 0.25) } }); run.spark = rand(4, 7); return !!run.ship; },
    update: (dt, t, run) => {
      if (t > run.spark && run.ship.alive) { run.spark = t + rand(3.2, 5); g.bursts.burst(run.ship.p, COLORS.orange, { n: GFX.calm ? 8 : 16, speed: 8, size: 0.8, life: 0.5 }); }
      return run.ship.alive;
    } });
  // (answer feedback, never picked by itself) fireworks: three bursts round the frame, a third of a second apart
  D.add({ id: "fireworks", dur: 1.4, can: () => false,
    start: (run) => { run.n = 0; run.sd = side(); run.col = [run.arg || COLORS.yellow, g.waveCol, 0xffffff]; },
    update: (dt, t, run) => {
      const N = GFX.calm ? 1 : 3;
      if (run.n < N && t > run.n * 0.36) {
        const i = run.n++, p = frame(run.sd * (i === 1 ? -10.5 : 10.5), i === 2 ? -4 : rand(7, 9.5), rand(52, 66), v);
        g.bursts.burst(p, run.col[i], { n: 60, speed: 13, size: 1.25, life: 1.2 });
        g.bursts.burst(p, 0xffffff, { n: 14, speed: 6, size: 0.8, life: 0.6 });
        FX.flash(p, [1.6, 1.3, 1.0], 2, 15, 0.55, 0.55);
      }
      return t < 1.3;
    } });
  return D;
}
