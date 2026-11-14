// What makes the arcade floor a place: six cabinets that differ in more than paint,
// and a room with things going on in it. Original designs throughout.

// ---- the six cabinets' own parts (added into the hub's merged batches) -------------
// o: { K, B, at, onPanel, g, col, zf }  (see HubScene.makeCabinet)
function hubCabinetStyle(id, o) {
  const { K, B, at, onPanel, g, col } = o;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const GLOSS = { aux: [0.25, 0.24] }, METAL = { aux: [1, 0.2] }, DARK = 0x0c0816, CHROME = 0xd2d0e4;
  const lit = (key, make, m, s, color, opt = GLOSS, k = 1) => B.lit.add(K.get(key, make), m.scale(V(s[0], s[1], s[2])), color, Object.assign({ k }, opt));
  const glow = (key, make, m, s, color, k = 2) => B.glow.add(K.get(key, make), m.scale(V(s[0], s[1], s[2])), color, { k, g });
  const cyl = () => new THREE.CylinderGeometry(1, 1, 1, 12), cone = () => new THREE.CylinderGeometry(0, 1, 1, 10), tor = () => new THREE.TorusGeometry(1, 0.13, 6, 20), ball = () => new THREE.SphereGeometry(1, 10, 8);
  const box = (w, h, d, m, color, opt = GLOSS, k = 1) => K.box(B.lit, w, h, d, m, color, Object.assign({ k }, opt));
  const gbox = (w, h, d, m, color, k = 2) => K.box(B.glow, w, h, d, m, color, { k, g });
  const H = Math.PI / 2;
  if (id === "blaster") {
    // a gunship of a cabinet: swept fins, rocket pods by the marquee, a radar dish, twin sticks
    [-1, 1].forEach((sx) => {
      box(0.62, 0.06, 1.0, at(sx * 1.36, 2.35, -0.05, 0, sx * -0.35, sx * 0.42), col, GLOSS, 0.4);
      gbox(0.64, 0.02, 0.05, at(sx * 1.37, 2.4, 0.46, 0, sx * -0.35, sx * 0.42), col, 2.2);
      lit("cyl", cyl, at(sx * 1.27, 3.58, 0.2, H), [0.13, 0.8, 0.13], DARK, METAL);
      lit("cone", cone, at(sx * 1.27, 3.58, 0.72, H), [0.13, 0.26, 0.13], 0xff2346, GLOSS);
      glow("cyl", cyl, at(sx * 1.27, 3.58, -0.22, H), [0.09, 0.04, 0.09], 0xff9b3d, 2.6);
      box(0.05, 0.3, 0.3, at(sx * 1.27, 3.3, 0.1), DARK);
    });
    lit("cyl", cyl, at(0.55, 4.18, -0.05), [0.06, 0.3, 0.06], CHROME, METAL);
    lit("cone", cone, at(0.55, 4.42, 0.02, 2.4), [0.36, 0.2, 0.36], CHROME, METAL);
    lit("cyl", cyl, at(-0.62, 4.45, -0.1), [0.016, 0.86, 0.016], CHROME, METAL);
    glow("ball", ball, at(-0.62, 4.9, -0.1), [0.05, 0.05, 0.05], 0xff2346, 3);
    lit("cyl", cyl, onPanel(0.82, 0.5, 0.22), [0.022, 0.22, 0.022], CHROME, METAL);
    lit("ball", ball, onPanel(0.82, 0.5, 0.46), [0.06, 0.09, 0.06], DARK);
    glow("ball", ball, onPanel(0.82, 0.5, 0.56), [0.03, 0.03, 0.03], 0xff2346, 3);
  } else if (id === "racer") {
    // a driving cabinet: steering wheel, shifter, a wing over the marquee, a light bar, tyres at its feet
    // (the wheel sits low and forward of the glass, so it never covers the attract screen)
    lit("tor", tor, at(-0.12, 1.58, 1.0, -0.95), [0.22, 0.22, 0.22], DARK, { aux: [0.1, 0.5] });
    [0, 2.1, 4.2].forEach((r) => box(0.4, 0.04, 0.03, at(-0.12, 1.58, 1.0, -0.95, 0, r), 0x3a3550, { aux: [0.3, 0.55] }));
    glow("cyl", cyl, at(-0.12, 1.58, 1.01, H - 0.95), [0.05, 0.03, 0.05], col, 1.6);
    lit("cyl", cyl, at(-0.12, 1.5, 0.9, H - 0.95), [0.035, 0.26, 0.035], 0x3a3550, { aux: [0.3, 0.55] });
    lit("cyl", cyl, onPanel(0.78, 0.5, 0.2), [0.02, 0.2, 0.02], CHROME, METAL);
    lit("ball", ball, onPanel(0.78, 0.5, 0.42), [0.06, 0.06, 0.06], DARK);
    box(2.5, 0.05, 0.42, at(0, 4.42, 0.05, -0.12), col, GLOSS, 0.4);
    [-1, 1].forEach((sx) => {
      box(0.05, 0.42, 0.3, at(sx * 0.8, 4.2, 0.02), DARK);
      box(0.04, 0.3, 0.5, at(sx * 1.25, 4.4, 0.05), DARK);
      gbox(0.02, 0.04, 0.5, at(sx * 1.275, 4.5, 0.05), col, 2.2);
      lit("cyl", cyl, at(sx * 1.2, 0.46, 0.25, 0, 0, H), [0.46, 0.34, 0.46], 0x08080b, { aux: [0, 0.9] });
      lit("cyl", cyl, at(sx * 1.385, 0.46, 0.25, 0, 0, H), [0.26, 0.03, 0.26], CHROME, METAL);
    });
    [-0.45, -0.15, 0.15, 0.45].forEach((x) => { box(0.24, 0.13, 0.16, at(x, 4.02, 0.5), DARK); gbox(0.18, 0.08, 0.02, at(x, 4.02, 0.59), 0xfff0d2, 2.8); });
    for (let i = 0; i < 8; i++) gbox(0.12, 0.05, 0.012, at(-0.84 + i * 0.24, 1.16, 0.66), i % 2 ? 0xffffff : 0x111111, 1.2);
  } else if (id === "boss") {
    // a war machine: horns, spiked shoulders, a row of teeth, a red eye, one big slam button
    [-1, 1].forEach((sx) => {
      lit("cone", cone, at(sx * 0.8, 4.5, -0.05, 0, 0, sx * -0.5), [0.17, 1.0, 0.17], 0xcdb8b0, { aux: [0.05, 0.7] });
      box(0.36, 1.0, 1.05, at(sx * 1.34, 3.25, -0.05, 0, 0, sx * -0.22), 0x14151b, { aux: [0.85, 0.4] });
      gbox(0.02, 0.9, 0.05, at(sx * 1.53, 3.2, 0.5, 0, 0, sx * -0.22), col, 2.2);
      [3.75, 3.35, 2.95].forEach((y) => lit("cone", cone, at(sx * 1.62, y, 0.1, 0, 0, sx * -H), [0.09, 0.34, 0.09], CHROME, METAL));
    });
    for (let i = 0; i < 7; i++) lit("cone", cone, at(-0.72 + i * 0.24, 3.13, 0.5, Math.PI), [0.07, 0.2, 0.07], 0xcdb8b0, { aux: [0.05, 0.7] });
    gbox(1.1, 0.07, 0.02, at(0, 4.1, 0.55), 0xff2418, 3);
    lit("cyl", cyl, onPanel(0.62, 0.5, 0.06), [0.2, 0.06, 0.2], DARK, METAL);
    glow("cyl", cyl, onPanel(0.62, 0.5, 0.14), [0.16, 0.08, 0.16], 0xff2418, 2.4);
  } else if (id === "memory") {
    // a strongbox: a vault wheel on the door, a combination dial, coin stacks, gold trim
    const GOLD = 0xd9a441;
    lit("cyl", cyl, at(0, 0.62, o.zf + 0.035, H), [0.46, 0.05, 0.46], 0x2a2c33, METAL);
    lit("tor", tor, at(0, 0.62, o.zf + 0.1), [0.3, 0.3, 0.3], GOLD, METAL);
    [0, 0.785, 1.57, 2.356].forEach((r) => box(0.6, 0.05, 0.04, at(0, 0.62, o.zf + 0.1, 0, 0, r), GOLD, METAL));
    lit("cyl", cyl, at(0, 0.62, o.zf + 0.12, H), [0.08, 0.08, 0.08], CHROME, METAL);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; lit("cyl", cyl, at(Math.cos(a) * 0.4, 0.62 + Math.sin(a) * 0.4, o.zf + 0.065, H), [0.03, 0.03, 0.03], CHROME, METAL); }
    lit("cyl", cyl, onPanel(0.62, 0.5, 0.06), [0.17, 0.06, 0.17], 0x2a2c33, METAL);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; K.box(B.glow, 0.012, 0.012, 0.05, onPanel(0.62 + Math.cos(a) * 0.13, 0.5, 0.1).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0)), col, { k: 1.8, g }); }
    [[-0.62, 5], [-0.3, 8], [0.05, 4], [0.4, 7], [0.7, 3]].forEach(([x, n]) => { for (let i = 0; i < n; i++) lit("cyl", cyl, at(x + (i % 2) * 0.012, 4.09 + i * 0.058, 0.12), [0.15, 0.05, 0.15], i % 3 ? GOLD : 0xf2c766, METAL); });
    [-1, 1].forEach((sx) => { box(0.06, 0.8, 0.06, at(sx * 1.0, 3.57, 0.56), GOLD, METAL); for (let i = 0; i < 4; i++) box(0.012, 0.3, 0.5, at(sx * 1.108, 1.9 + i * 0.4, 0.1), GOLD, METAL, 0.7); });
  } else if (id === "exam") {
    // an examination desk: a clock over it, laurels, an answer sheet and a pencil
    lit("cyl", cyl, at(0, 4.56, 0.2, H), [0.44, 0.1, 0.44], 0x1a1724, METAL);
    lit("cyl", cyl, at(0, 4.56, 0.26, H), [0.38, 0.02, 0.38], 0xf2efe6, { aux: [0, 0.6] });
    glow("tor", tor, at(0, 4.56, 0.26), [0.41, 0.41, 0.2], col, 2.2);
    box(0.03, 0.26, 0.02, at(0.0, 4.66, 0.29, 0, 0, -0.5), DARK); box(0.03, 0.18, 0.02, at(0.06, 4.58, 0.29, 0, 0, -1.9), DARK);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(0.02, 0.05, 0.01, at(Math.sin(a) * 0.33, 4.56 + Math.cos(a) * 0.33, 0.275, 0, 0, -a), DARK); }
    box(0.1, 0.5, 0.1, at(0, 4.14, 0.15), 0x1a1724, METAL);
    [-1, 1].forEach((sx) => { for (let i = 0; i < 6; i++) { const a = 0.5 + i * 0.36; lit("ball", ball, at(sx * (0.3 + Math.sin(a) * 0.62), 4.14 + (1 - Math.cos(a)) * 0.5, 0.2, 0, 0, sx * -(a + 0.5)), [0.05, 0.16, 0.03], 0xd9a441, METAL); } });
    K.quad(B.lit, 0.62, 0.42, onPanel(0.5, 0.52, 0.004).multiply(new THREE.Matrix4().makeRotationX(-H)), 0xf2efe6, { aux: [0, 0.7] });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) K.box(B.glow, 0.05, 0.004, 0.05, onPanel(0.3 + c * 0.13, 0.34 + r * 0.12, 0.01), (r + c) % 3 === 0 ? 0x111111 : col, { k: (r + c) % 3 === 0 ? 0.2 : 1.6, g });
    lit("cyl", cyl, onPanel(-0.05, 0.7, 0.04).multiply(new THREE.Matrix4().makeRotationZ(1.2)), [0.03, 0.56, 0.03], 0xffd23d, GLOSS);
  } else if (id === "guide") {
    // a library kiosk: books stacked on top, an open book on the desk, a reading lamp
    [[0.1, 4.12, 0.95, 0.16, 0.66, 0x35efff, 0.1], [-0.05, 4.28, 0.85, 0.15, 0.6, 0xff3ad4, -0.12], [0.08, 4.43, 0.9, 0.14, 0.62, 0xffd23d, 0.2], [-0.02, 4.57, 0.7, 0.13, 0.52, 0x86ff5e, -0.05]]
      .forEach(([x, y, w, h, d, c, r]) => { box(w, h, d, at(x, y, 0.05, 0, r), c, GLOSS, 0.5); box(w - 0.04, h - 0.04, 0.02, at(x + Math.sin(r) * d * 0.5, y, 0.05 + Math.cos(r) * d * 0.5, 0, r), 0xf2efe6, { aux: [0, 0.8] }); });
    [[-0.78, 0xff9b3d, 0.14], [-0.6, 0xa65fff, 0.1], [-0.94, 0xff4769, 0.18]].forEach(([x, c, w]) => box(w, 0.62, 0.46, at(x, 4.38, 0.02, 0, 0, x < -0.8 ? 0.1 : 0), c, GLOSS, 0.5));
    [-1, 1].forEach((sx) => { K.quad(B.lit, 0.34, 0.44, onPanel(0.42 + sx * 0.175, 0.5, 0.03).multiply(new THREE.Matrix4().makeRotationX(-H)).multiply(new THREE.Matrix4().makeRotationY(sx * 0.22)), 0xf2efe6, { aux: [0, 0.8] }); for (let i = 0; i < 5; i++) K.box(B.glow, 0.24, 0.004, 0.016, onPanel(0.42 + sx * 0.175, 0.34 + i * 0.08, 0.045), col, { k: 1.2, g }); });
    lit("cyl", cyl, at(0.98, 3.2, 0.55, 0.5), [0.02, 1.3, 0.02], CHROME, METAL);
    lit("cyl", cyl, at(0.98, 3.86, 1.05, 1.9), [0.02, 0.5, 0.02], CHROME, METAL);
    lit("cone", cone, at(0.98, 3.7, 1.3, 0.3), [0.17, 0.2, 0.17], col, GLOSS, 0.5);
    glow("ball", ball, at(0.98, 3.62, 1.33), [0.07, 0.07, 0.07], 0xfff0c8, 3);
    [-1, 1].forEach((sx) => { box(0.012, 0.7, 0.08, at(sx * 1.11, 2.4, 0.3), 0xff4769, GLOSS, 0.7); box(0.012, 0.5, 0.08, at(sx * 1.11, 2.5, 0.05), 0x35efff, GLOSS, 0.7); });
  }
}
// A small original emblem beside each cabinet's name on its marquee (canvas 2D).
function hubEmblem(x, id, cx, cy, s, color) {
  x.save();
  x.translate(cx, cy);
  x.strokeStyle = color; x.fillStyle = color; x.lineWidth = Math.max(1.5, s * 0.09); x.lineJoin = "round";
  const poly = (pts, fill) => { x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px * s, py * s) : x.moveTo(px * s, py * s))); x.closePath(); fill ? x.fill() : x.stroke(); };
  if (id === "blaster") { poly([[0, -1], [0.28, -0.1], [1, 0.7], [0.3, 0.5], [0.2, 0.9], [-0.2, 0.9], [-0.3, 0.5], [-1, 0.7], [-0.28, -0.1]], true); }
  else if (id === "racer") { poly([[-1, 0.5], [-0.8, -0.1], [-0.3, -0.2], [0, -0.6], [0.6, -0.6], [0.8, -0.1], [1, 0], [1, 0.5]], true); x.fillStyle = "#07021a"; [-0.55, 0.55].forEach((px) => { x.beginPath(); x.arc(px * s, 0.5 * s, 0.28 * s, 0, 7); x.fill(); }); }
  else if (id === "boss") { poly([[-0.8, -0.8], [0.8, -0.8], [0.9, 0.1], [0.5, 0.9], [-0.5, 0.9], [-0.9, 0.1]], true); x.fillStyle = "#ff2418"; [-0.38, 0.38].forEach((px) => x.fillRect((px - 0.2) * s, -0.3 * s, 0.4 * s, 0.2 * s)); x.fillStyle = "#07021a"; x.fillRect(-0.4 * s, 0.4 * s, 0.8 * s, 0.14 * s); }
  else if (id === "memory") { x.beginPath(); x.arc(0, 0, 0.9 * s, 0, 7); x.stroke(); for (let i = 0; i < 4; i++) { x.rotate(Math.PI / 4); x.beginPath(); x.moveTo(-0.9 * s, 0); x.lineTo(0.9 * s, 0); x.stroke(); } x.beginPath(); x.arc(0, 0, 0.26 * s, 0, 7); x.fill(); }
  else if (id === "exam") { poly([[-0.55, -0.9], [0.55, -0.9], [0.5, 0], [0.2, 0.35], [0.2, 0.7], [0.5, 0.9], [-0.5, 0.9], [-0.2, 0.7], [-0.2, 0.35], [-0.5, 0]], true); }
  else { poly([[-1, -0.6], [-0.1, -0.4], [-0.1, 0.8], [-1, 0.6]], false); poly([[1, -0.6], [0.1, -0.4], [0.1, 0.8], [1, 0.6]], false); for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-0.8 * s, (-0.25 + i * 0.3) * s); x.lineTo(-0.28 * s, (-0.12 + i * 0.3) * s); x.moveTo(0.8 * s, (-0.25 + i * 0.3) * s); x.lineTo(0.28 * s, (-0.12 + i * 0.3) * s); x.stroke(); } }
  x.restore();
}

// ---- the room's life --------------------------------------------------------------
class HubExtras {
  constructor(hub) {
    const g = (this.hub = hub), s = hub.scene;
    this.t = 0;
    this.lastSel = hub.sel;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 12);
    const all = [];
    const dark = new THREE.MeshBasicMaterial({ vertexColors: true });
    // lamps on numbered channels, like the car's: one mesh for every blinking thing in the room
    this.ch = new Float32Array(16).fill(1);
    this.lampMat = new THREE.ShaderMaterial({ uniforms: { uL: { value: this.ch } },
      vertexShader: "attribute vec3 aCol; attribute float aCh; uniform float uL[16]; varying vec3 vCol; void main(){ vCol = aCol * uL[int(aCh + 0.5)]; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol, 1.0); }" });
    const st = new RacerBatch(), L = new RacerBatch(["aCh"]);
    // a frame of reference standing on the floor at (angle, radius), facing the room's centre
    const frame = (ang, r) => new THREE.Matrix4().makeTranslation(Math.sin(ang) * r, 0, -Math.cos(ang) * r).multiply(new THREE.Matrix4().makeRotationY(-ang));
    const put = (F, x, y, z, sx, sy, sz, c, k = 1, rx = 0, ry = 0, rz = 0) => st.add(BOX, F.clone().multiply(racerM(x, y, z, sx, sy, sz, rx, ry, rz)), c, k);
    const rod = (F, x, y, z, r, h, c, k = 1, rx = 0, rz = 0) => st.add(CYL, F.clone().multiply(racerM(x, y, z, r, h, r, rx, 0, rz)), c, k);
    const lamp = (F, ch, x, y, z, sx, sy, sz, c, k = 2) => L.add(BOX, F.clone().multiply(racerM(x, y, z, sx, sy, sz)), c, k, { aCh: ch });
    const gap = (i, side = 1) => hub.cabAngle(i) + side * 0.178; // beside cabinet i, in view when it is selected
    const R = 13.3, CASE = 0x16122a, EDGE = 0x2a2350;

    // -- a jukebox with a dancing equaliser (beside cabinet 0)
    { const F = frame(gap(0), R);
      put(F, 0, 1.0, 0, 1.3, 2.0, 0.8, CASE); put(F, 0, 2.25, 0, 1.3, 0.5, 0.8, 0x3a1450);
      rod(F, 0, 2.5, 0, 0.65, 0.8, 0x3a1450, 1, Math.PI / 2);
      lamp(F, 0, 0, 2.5, 0.42, 1.1, 0.06, 0.04, 0xff3ad4, 2.2); [-0.6, 0.6].forEach((x) => lamp(F, 0, x, 1.3, 0.42, 0.05, 2.0, 0.04, 0x35efff, 2));
      for (let i = 0; i < 7; i++) lamp(F, 1 + (i % 4), -0.42 + i * 0.14, 1.5, 0.42, 0.1, 0.5, 0.03, [0x86ff5e, 0xffe14f, 0xff9b3d, 0xff3ad4][i % 4], 2.2);
      put(F, 0, 0.75, 0.42, 0.9, 0.5, 0.04, 0x241a40); for (let i = 0; i < 6; i++) put(F, -0.36 + i * 0.145, 0.75, 0.45, 0.1, 0.4, 0.02, [0xff4769, 0x35efff, 0xffe14f][i % 3], 0.5); }
    // -- a claw machine (beside cabinet 1): the claw itself is a mover, built below
    { const F = (this.clawF = frame(gap(1), R));
      put(F, 0, 0.6, 0, 1.5, 1.2, 1.3, 0x4a1450); put(F, 0, 2.95, 0, 1.6, 0.34, 1.4, 0x4a1450);
      [[-0.72, -0.62], [0.72, -0.62], [-0.72, 0.62], [0.72, 0.62]].forEach(([x, z]) => put(F, x, 2.0, z, 0.07, 1.6, 0.07, EDGE));
      put(F, 0, 1.28, 0, 1.4, 0.16, 1.2, 0x241a40);
      for (let i = 0; i < 14; i++) st.add(BOX, F.clone().multiply(racerM(-0.5 + (i % 5) * 0.25 + (i % 2) * 0.05, 1.42 + Math.floor(i / 5) * 0.14, -0.3 + ((i * 7) % 5) * 0.16, 0.2, 0.2, 0.2, i, i * 2, i * 3)), [0xff4769, 0x35efff, 0xffe14f, 0x86ff5e, 0xff9b3d, 0xa65fff][i % 6], 0.75);
      lamp(F, 5, 0, 3.0, 0.72, 1.3, 0.16, 0.03, 0xffe14f, 2.4); lamp(F, 0, 0, 2.76, 0, 1.3, 0.04, 1.1, 0xf2f6ff, 1.4);
      put(F, 0.45, 1.22, 0.68, 0.34, 0.1, 0.16, 0x16122a); rod(F, 0.45, 1.36, 0.68, 0.02, 0.2, 0xd2d0e4); lamp(F, 6, 0.3, 1.3, 0.7, 0.07, 0.04, 0.07, 0xff2346, 2.6); }
    // -- a dance machine: a screen of bars and four arrow pads that light in turn (beside cabinet 2)
    { const F = frame(gap(2), R);
      put(F, 0, 1.5, -0.3, 1.5, 3.0, 0.5, CASE); put(F, 0, 0.09, 0.7, 1.7, 0.18, 1.5, 0x241a40);
      for (let i = 0; i < 9; i++) lamp(F, 1 + (i % 4), -0.52 + i * 0.13, 2.1, -0.04, 0.09, 0.9, 0.03, [0x35efff, 0xff3ad4, 0xffe14f, 0x86ff5e][i % 4], 2);
      [[-0.42, 0.42, 7], [0.42, 0.42, 8], [-0.42, 1.05, 9], [0.42, 1.05, 10]].forEach(([x, z, ch], i) => { lamp(F, ch, x, 0.19, z, 0.56, 0.02, 0.5, [0xff3ad4, 0x35efff, 0x86ff5e, 0xffe14f][i], 2.2); });
      [-0.78, 0.78].forEach((x) => { rod(F, x, 0.8, 1.4, 0.03, 1.4, 0xd2d0e4); }); rod(F, 0, 1.5, 1.4, 0.03, 1.6, 0xd2d0e4, 1, 0, Math.PI / 2);
      lamp(F, 0, 0, 3.05, -0.04, 1.4, 0.07, 0.03, 0xff3ad4, 2.4); }
    // -- a ticket printer (beside cabinet 3): its strip is a mover
    { const F = (this.tickF = frame(gap(3), R));
      put(F, 0, 0.75, 0, 0.9, 1.5, 0.7, 0x123a4a); put(F, 0, 1.56, 0, 1.0, 0.14, 0.8, 0x1a5468);
      put(F, 0, 1.12, 0.36, 0.6, 0.06, 0.04, 0x05060a);
      for (let i = 0; i < 5; i++) lamp(F, 11, -0.24 + i * 0.12, 1.36, 0.36, 0.08, 0.12, 0.02, 0xff9b3d, 2.2);
      rod(F, 0, 1.72, 0, 0.09, 0.18, 0x241a40); lamp(F, 12, 0, 1.86, 0, 0.14, 0.1, 0.14, 0xffe14f, 2.6); }
    // -- hoops: a backboard, a ring, a ball that keeps going in (beside cabinet 4)
    { const F = (this.hoopF = frame(gap(4), R));
      put(F, 0, 0.5, 0.3, 1.5, 1.0, 1.9, 0x4a2a14); put(F, 0, 2.6, -0.6, 1.3, 1.0, 0.08, 0xf2efe6, 0.5);
      lamp(F, 0, 0, 2.5, -0.55, 0.5, 0.36, 0.02, 0xff4769, 1.6);
      const ring = new THREE.TorusGeometry(0.24, 0.025, 5, 16); st.add(ring, F.clone().multiply(racerM(0, 2.3, -0.3, 1, 1, 1, Math.PI / 2)), 0xff9b3d, 1.2); ring.dispose();
      [-0.72, 0.72].forEach((x) => { put(F, x, 1.9, 0.2, 0.05, 1.9, 0.05, EDGE); put(F, x, 2.85, -0.2, 0.05, 0.05, 0.9, EDGE); });
      for (let i = 0; i < 4; i++) lamp(F, 1 + i, -0.45 + i * 0.3, 3.2, -0.58, 0.24, 0.16, 0.03, 0xffe14f, 2.2); }
    // -- a drinks machine and a floor grate that breathes steam (beside cabinet 5, on its left)
    { const F = frame(gap(5, -1), R);
      put(F, 0, 1.15, 0, 1.2, 2.3, 0.8, 0x10283c); lamp(F, 13, 0, 1.45, 0.41, 0.9, 1.3, 0.03, 0x9fe8ff, 0.9);
      for (let i = 0; i < 12; i++) put(F, -0.3 + (i % 4) * 0.2, 1.0 + Math.floor(i / 4) * 0.42, 0.43, 0.13, 0.3, 0.03, [0xff4769, 0x86ff5e, 0xffe14f, 0x35efff][i % 4], 0.6);
      put(F, 0, 0.3, 0.42, 0.7, 0.24, 0.03, 0x05060a); lamp(F, 6, 0.48, 1.0, 0.42, 0.08, 0.3, 0.03, 0x86ff5e, 2.2);
      this.steamAt = new THREE.Vector3(0.95, 0.1, 0.6).applyMatrix4(F); put(F, 0.95, 0.03, 0.6, 0.7, 0.04, 0.5, 0x05060a); }
    const stMesh = new THREE.Mesh(st.build("color"), dark), lMesh = new THREE.Mesh(L.build(), this.lampMat);
    s.add(stMesh, lMesh);
    all.push(stMesh, lMesh);

    // -- movers ------------------------------------------------------------------
    const basic = (b) => { const m = new THREE.Mesh(b.build("color"), dark); s.add(m); all.push(m); return m; };
    // ceiling fans
    { const b = new RacerBatch();
      b.add(CYL, racerM(0, 0.45, 0, 0.03, 0.9, 0.03), 0x2a2350); b.add(CYL, racerM(0, 0, 0, 0.16, 0.14, 0.16), 0x3a3260);
      for (let i = 0; i < 4; i++) b.add(BOX, racerM(Math.cos(i * 1.5708) * 0.9, -0.02, Math.sin(i * 1.5708) * 0.9, 1.5, 0.03, 0.3, 0.12, -i * 1.5708), 0x231d44);
      b.add(CYL, racerM(0, -0.12, 0, 0.1, 0.06, 0.1), 0xfff0c8, 1.8);
      const ge = b.build("color");
      this.fans = [-1.0, -0.36, 0.3, 0.95].map((a, i) => { const m = new THREE.Mesh(ge, dark); m.position.set(Math.sin(a) * 13.2, 7.4, -Math.cos(a) * 13.2); m.userData.sp = 2.2 + i * 0.5; s.add(m); all.push(m); return m; }); }
    // the claw: a carriage that tracks across, drops, closes, lifts
    { const b = new RacerBatch();
      b.add(BOX, racerM(0, 0, 0, 0.3, 0.1, 0.3), 0xd2d0e4, 0.6); b.add(CYL, racerM(0, -0.28, 0, 0.012, 0.5, 0.012), 0xd2d0e4, 0.6);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.add(BOX, racerM(Math.cos(a) * 0.09, -0.62, Math.sin(a) * 0.09, 0.03, 0.22, 0.03, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5), 0xd2d0e4, 0.7); }
      this.claw = basic(b); }
    // the ticket strip
    { const b = new RacerBatch();
      for (let i = 0; i < 6; i++) { b.add(BOX, racerM(0, -0.09 - i * 0.18, 0, 0.5, 0.17, 0.008), i % 2 ? 0xffe14f : 0xffb13a, 1.0); }
      this.tickets = basic(b); }
    // the basketball
    { const ge = new THREE.IcosahedronGeometry(0.17, 1), b = new RacerBatch(); b.add(ge, null, 0xff7a2a, 0.9); ge.dispose(); this.ball = basic(b); }
    // a cleaning robot that works its way along the floor
    { const b = new RacerBatch();
      b.add(CYL, racerM(0, 0.36, 0, 0.5, 0.5, 0.5), 0x2a3140); b.add(CYL, racerM(0, 0.68, 0, 0.42, 0.14, 0.42), 0x3a4458);
      b.add(CYL, racerM(0, 1.0, 0, 0.04, 0.6, 0.04), 0xd2d0e4, 0.6); b.add(BOX, racerM(0, 1.34, 0, 0.16, 0.12, 0.16), 0xffa53d, 2.6);
      b.add(BOX, racerM(0.44, 0.34, 0, 0.06, 0.1, 0.6), 0x35efff, 2.4); b.add(BOX, racerM(0.2, 0.74, 0.18, 0.1, 0.08, 0.1), 0x86ff5e, 2.4); b.add(BOX, racerM(0.2, 0.74, -0.18, 0.1, 0.08, 0.1), 0x86ff5e, 2.4);
      [-0.36, 0.36].forEach((z) => b.add(CYL, racerM(0.34, 0.06, z, 0.2, 0.05, 0.2), 0x9aa3ab, 0.5));
      this.robot = basic(b); }
    // people walking by in silhouette: one instanced mesh, legs and arms swinging in the shader
    { const b = new RacerBatch(["aSw", "aPv"]);
      const part = (geo, m, c, k, sw = 0, pv = 0) => b.add(geo, m, c, k, { aSw: sw, aPv: pv });
      const SIL = 0x06050c;
      [-1, 1].forEach((sd) => { part(BOX, racerM(0, 0.44, sd * 0.1, 0.17, 0.88, 0.17), SIL, 1, sd, 0.88); part(BOX, racerM(0, 1.17, sd * 0.27, 0.1, 0.56, 0.1), SIL, 1, -sd * 0.7, 1.45); });
      part(BOX, racerM(0, 1.2, 0, 0.26, 0.66, 0.42), SIL, 1); part(BOX, racerM(0, 1.56, 0, 0.1, 0.1, 0.12), SIL, 1);
      const head = new THREE.IcosahedronGeometry(0.135, 1); part(head, racerM(0.01, 1.7, 0), SIL, 1); head.dispose();
      part(BOX, racerM(0, 1.72, 0, 0.05, 0.1, 0.3), 0x35efff, 2.2); // headphones catch the light
      const ge = b.build();
      const N = 5, ph = new Float32Array(N);
      for (let i = 0; i < N; i++) ph[i] = i * 1.7;
      ge.setAttribute("aPhase", new THREE.InstancedBufferAttribute(ph, 1));
      this.walkMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } },
        vertexShader: `attribute vec3 aCol; attribute float aSw; attribute float aPv; attribute float aPhase; uniform float uTime; varying vec3 vCol;
          void main(){ vCol = aCol; vec3 p = position; float s = sin(uTime * 5.2 + aPhase);
            p.x += aSw * s * (aPv - p.y) * 0.5; p.y += abs(s) * 0.03;
            #ifdef USE_INSTANCING
              gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(p, 1.0);
            #else
              gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            #endif
          }`,
        fragmentShader: "varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol, 1.0); }" });
      this.walkers = new THREE.InstancedMesh(ge, this.walkMat, N);
      this.walkers.frustumCulled = false;
      this.walkers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.walk = Array.from({ length: N }, (_, i) => ({ a: -1.5 + i * 0.7, dir: i % 2 ? 1 : -1, sp: 0.045 + (i % 3) * 0.012, r: 12.3 + (i % 3) * 0.75, h: 0.92 + (i % 4) * 0.05 }));
      s.add(this.walkers); all.push(this.walkers); }
    // steam from the grate
    { const N = 26, seed = new Float32Array(N), pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { seed[i] = (i + Math.random()) / N; pos[i * 3] = this.steamAt.x; pos[i * 3 + 1] = this.steamAt.y; pos[i * 3 + 2] = this.steamAt.z; }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.BufferAttribute(pos, 3)); ge.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      this.steam = new THREE.Points(ge, new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uH: { value: 800 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: "attribute float aSeed; uniform float uTime; uniform float uH; varying float vA; void main(){ float r1 = fract(aSeed * 91.7), r2 = fract(aSeed * 37.3); float life = fract(aSeed * 7.31 + uTime * (0.22 + r1 * 0.2)); vec3 p = position + vec3((r1 - 0.5) * (0.3 + life * 1.2), life * (2.2 + r2 * 1.6), (r2 - 0.5) * (0.3 + life)); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uH * (0.2 + 0.9 * life) * (0.5 + r1) / max(0.1, -mv.z); vA = (1.0 - life) * smoothstep(0.0, 0.1, life); }",
        fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = max(0.0, 1.0 - d); gl_FragColor = vec4(vec3(0.5, 0.56, 0.75) * (vA * a * a * 0.22), 1.0); }" }));
      this.steam.frustumCulled = false;
      s.add(this.steam); all.push(this.steam); }
    // a band of high windows right round the room: the city at night, lit windows, traffic in the air
    { const pos = [], uv = [], A0 = -2.7, A1 = 2.7, n = 54;
      for (let i = 0; i < n; i++) { const a0 = A0 + ((A1 - A0) * i) / n, a1 = A0 + ((A1 - A0) * (i + 1)) / n;
        const P = (a, y, v) => { pos.push(Math.sin(a) * 18.9, y, -Math.cos(a) * 18.9); uv.push(a, v); };
        P(a0, 7.75, 0); P(a1, 7.75, 0); P(a1, 9.25, 1); P(a0, 7.75, 0); P(a1, 9.25, 1); P(a0, 9.25, 1); }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      this.windows = new THREE.Mesh(ge, new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform float uTime; varying vec2 vUv;
          float h1(float n){ return fract(sin(n * 127.1) * 43758.5453); }
          float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          void main(){
            float a = vUv.x, y = vUv.y;
            vec3 col = mix(vec3(0.34, 0.06, 0.36), vec3(0.03, 0.02, 0.12), y);
            col += vec3(1.0) * step(0.9975, h2(floor(vec2(a * 60.0, y * 14.0)))) * step(0.5, y);
            for (int L = 0; L < 2; L++) {                      // two depths of skyline
              float fl = float(L), cx = a * (15.0 + fl * 11.0) + fl * 3.3, id = floor(cx), fx = fract(cx);
              float hh = (0.2 + 0.55 * h1(id + fl * 71.0)) * (1.0 - fl * 0.35);
              float b = step(y, hh) * step(0.05, fx) * step(fx, 0.95);
              vec2 wc = vec2(fx * 4.0, y * 26.0);
              float lit = step(0.6, h2(floor(wc) + id * 13.0 + fl)) * step(0.3, fract(wc.x)) * step(0.35, fract(wc.y));
              vec3 bc = vec3(0.03, 0.02, 0.08) * (1.0 + fl) + mix(vec3(1.0, 0.72, 0.36), vec3(0.4, 0.9, 1.0), h1(id)) * lit * (0.55 + 0.25 * sin(uTime * 0.6 + id * 3.0));
              col = mix(col, bc, b);
            }
            for (int T = 0; T < 3; T++) {                      // lanes of traffic in the air
              float ft = float(T), dir = mod(ft, 2.0) * 2.0 - 1.0, ly = 0.5 + ft * 0.15;
              float lx = fract(a * 4.0 + dir * uTime * (0.05 + ft * 0.02) + ft * 0.37) * 5.0, c = fract(lx);
              float d = smoothstep(0.1, 0.0, abs(c - 0.5)) * smoothstep(0.035, 0.0, abs(y - ly)) * step(0.3, h1(floor(lx) + ft * 9.0));
              col += mix(vec3(1.6, 0.15, 0.25), vec3(1.6, 1.5, 1.2), step(0.5, dir * (c - 0.5) + 0.5)) * d;
            }
            float m = step(0.955, fract(a * 3.2)) + step(y, 0.05) + step(0.95, y);    // mullions and rails
            col = mix(col, vec3(0.05, 0.03, 0.1), clamp(m, 0.0, 1.0));
            gl_FragColor = vec4(col * 1.25, 1.0);
          }` }));
      this.windows.frustumCulled = false;
      s.add(this.windows); all.push(this.windows); }
    // -- a flare for the cabinet that powers up, and sparks
    this.flare = glowSprite(0xffffff, 1, 0);
    this.flare.visible = false; this.flare.renderOrder = 6;
    s.add(this.flare);
    this.bursts = new Bursts(s);
    this.surge = 0;
    // none of this is mirrored in the floor, and the lite quality levels leave it out
    all.forEach((m) => m.layers.set(1));
    hub.decor(...all);
    BOX.dispose(); CYL.dispose();
  }
  // Selecting a cabinet wakes it: a flare off its marquee, sparks, a rising tone.
  powerUp(i) {
    const hub = this.hub, a = hub.cabAngle(i), col = CABINETS[i].color;
    Sound.sfx("powerup", clamp(Math.sin(a - hub.angle) * 2, -0.8, 0.8));
    this.surge = 1; this.surgeI = i;
    this.flare.position.set(Math.sin(a) * (HUB_R - 0.6), 3.6, -Math.cos(a) * (HUB_R - 0.6));
    this.flare.material.color.set(col).multiplyScalar(1.8);
    this.flare.visible = true;
    if (!(REDUCED_MOTION || GFX.calm)) {
      this.bursts.burst(this.flare.position.clone(), col, { n: 26, speed: 4.5, size: 0.14, life: 0.7, gravity: -3 });
      this.bursts.burst(this.flare.position.clone(), 0xffffff, { n: 10, speed: 2.5, size: 0.1, life: 0.5, gravity: -2 });
    }
  }
  place(m, F, x, y, z) { m.position.set(x, y, z).applyMatrix4(F); m.quaternion.setFromRotationMatrix(F); }
  update(dt) {
    const hub = this.hub, t = (this.t += dt), ch = this.ch;
    if (hub.sel !== this.lastSel) { this.lastSel = hub.sel; if (!hub.introRunning) this.powerUp(hub.sel); }
    // the surge: flare fades, the cabinet's screen runs bright for a moment
    this.surge = Math.max(0, this.surge - dt * 1.7);
    this.flare.visible = this.surge > 0.01;
    if (this.flare.visible) { this.flare.scale.setScalar(2.2 + (1 - this.surge) * 4.5); this.flare.material.opacity = this.surge * this.surge * 0.85; }
    const c = hub.cabs[this.surgeI === undefined ? hub.sel : this.surgeI];
    if (c && c.mat) c.mat.uniforms.uGain.value += this.surge * 0.7;
    this.bursts.update(dt);
    // lamps: everything under 3 Hz
    ch[0] = 1;
    for (let i = 0; i < 4; i++) ch[1 + i] = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.3 + i * 0.37) + i * 1.9)); // equaliser bars
    ch[5] = 0.7 + 0.3 * Math.sin(t * 2.1);
    ch[6] = Math.sin(t * 4.2) > 0 ? 1 : 0.25;
    const step = Math.floor(t * 1.6) % 4;
    for (let i = 0; i < 4; i++) ch[7 + i] = i === step ? 1.3 : 0.16; // the dance pads light in turn
    ch[11] = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.2)); ch[12] = 0.5 + 0.5 * Math.sin(t * 5.0); ch[13] = 0.85 + 0.15 * Math.sin(t * 0.8);
    this.fans.forEach((f) => { f.rotation.y += dt * f.userData.sp; });
    // the claw: across, down, up, back (an 8 second cycle)
    { const k = (t % 8) / 8, x = Math.sin(k * Math.PI * 2) * 0.42, drop = smoothstep(0.3, 0.42, k) * (1 - smoothstep(0.5, 0.62, k));
      this.place(this.claw, this.clawF, x, 2.72 - drop * 0.62, Math.cos(k * Math.PI * 2) * 0.22); }
    // tickets feed out, then tear off
    { const k = (t % 5) / 5, out = smoothstep(0, 0.7, k);
      this.place(this.tickets, this.tickF, 0, 1.12, 0.39 + out * 0.02); this.tickets.scale.set(1, 0.15 + out * 0.85, 1); }
    // the ball arcs up and through the ring
    { const k = (t % 2.6) / 2.6, u = Math.min(1, k / 0.62);
      const y = u < 1 ? 1.2 + u * 3.3 - u * u * 2.2 : 2.3 - (k - 0.62) * 4.2, z = u < 1 ? 1.1 - u * 1.4 : -0.3;
      this.place(this.ball, this.hoopF, Math.sin(Math.floor(t / 2.6) * 2.4) * 0.12, Math.max(1.16, y), z); this.ball.rotation.x = t * 4; }
    // the robot sweeps to and fro along the row
    { const a = Math.sin(t * 0.11) * 1.25, dir = Math.cos(t * 0.11) >= 0 ? 1 : -1, r = 11.6;
      this.robot.position.set(Math.sin(a) * r, 0, -Math.cos(a) * r); this.robot.rotation.y = -a + (dir > 0 ? 0 : Math.PI); }
    // people stroll past, turn at the ends of the room
    this.walk.forEach((w, i) => {
      w.a += w.dir * w.sp * dt;
      if (Math.abs(w.a) > 1.75) { w.dir *= -1; w.a = clamp(w.a, -1.75, 1.75); }
      this._e.set(0, -w.a + (w.dir > 0 ? 0 : Math.PI), 0);
      this.walkers.setMatrixAt(i, this._m.compose(this._p.set(Math.sin(w.a) * w.r, 0, -Math.cos(w.a) * w.r), this._q.setFromEuler(this._e), this._s.set(w.h, w.h, w.h)));
    });
    this.walkers.instanceMatrix.needsUpdate = true;
    this.walkMat.uniforms.uTime.value = t;
    this.steam.material.uniforms.uTime.value = t;
    this.steam.material.uniforms.uH.value = GFX.h * GFX.scenePR();
    this.windows.material.uniforms.uTime.value = t;
  }
}
