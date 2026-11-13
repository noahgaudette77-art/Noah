// What Risk Blaster shows when the player's frog model is not in the build: the
// holo-drones that carry the answers, and the carrier that looms far ahead in each
// wave. (The world round them is open space: 20f-blasterspace.js.) Look only: nothing
// here reads or changes the score, shields, timer or the questions.

// ---- holo-drones -----------------------------------------------------------------
// Four airframes, one per answer slot, so a target is known by its shape as well as
// its colour and letter. Each is wide rather than tall (the rows sit close together)
// and holds the glowing answer core in a hexagonal collar.
function blasterDroneGeo(shape, hex) {
  const B = new RacerBatch(), L = new RacerBatch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const put = (b, geo, m, color, k = 1) => { b.add(geo, m, color, k); geo.dispose(); };
  const ring = (i, n) => new THREE.Matrix4().makeRotationZ((i / n) * Math.PI * 2);
  const deg = (d) => new THREE.Matrix4().makeRotationZ((d * Math.PI) / 180);
  // a slab drawn in [x, y] stands up facing the player, bevel forward
  const stand = (pts, t, bevel, z) => { const geo = blasterSlab(pts.map(([x, y]) => [x, -y]), t, bevel); geo.applyMatrix4(racerM(0, 0, z, 1, 1, 1, Math.PI / 2)); return geo; };
  const paint = new THREE.Color(hex).multiplyScalar(0.5).getHex();
  // collar: six armour plates round the core, three carrying the slot's colour, lit bolts at the corners
  for (let i = 0; i < 6; i++) {
    put(B, racerPlate(1.42, 0.2, 0.36, 0.05, true), ring(i, 6).multiply(racerM(0, 1.2, -0.1)), i % 2 ? BK.GUN : BK.PLATE);
    if (i % 2 === 0) B.add(box, ring(i, 6).multiply(racerM(0, 1.2, 0.09, 0.9, 0.11, 0.04)), paint);
    L.add(box, ring(i + 0.5, 6).multiply(racerM(0, 1.39, 0.1, 0.11, 0.11, 0.06)), 0xffffff, 1);
  }
  put(B, new THREE.CylinderGeometry(0.8, 0.6, 0.5, 8), racerM(0, 0, -0.55, 1, 1, 1, Math.PI / 2), BK.GUN); // housing behind the core
  L.add(box, racerM(0, -0.97, 0.1, 0.34, 0.07, 0.05), 0xffffff, 0.8); // sensor slit
  if (shape === 0) {
    // four rotor pods on swept arms
    [28, 152, 208, 332].forEach((a) => {
      B.add(box, deg(a - 90).multiply(racerM(0, 1.62, -0.1, 0.15, 0.62, 0.15)), BK.STEEL);
      put(B, new THREE.CylinderGeometry(0.36, 0.36, 0.4, 10), deg(a - 90).multiply(racerM(0, 2.02, -0.1, 1, 1, 1, Math.PI / 2)), BK.GUN);
      put(L, new THREE.TorusGeometry(0.29, 0.05, 4, 12), deg(a - 90).multiply(racerM(0, 2.02, 0.11)), 0xffffff, 1);
      B.add(box, deg(a - 90).multiply(racerM(0, 2.02, 0.1, 0.5, 0.05, 0.03)), BK.PALE);
    });
  } else if (shape === 1) {
    // a delta: two swept wings and a short dorsal fin
    [-1, 1].forEach((sd) => {
      put(B, stand([[sd * 1.15, 0.42], [sd * 2.35, -0.12], [sd * 2.35, -0.34], [sd * 1.15, -0.5]], 0.16, 0.04, -0.1), null, BK.PLATE);
      put(B, stand([[sd * 1.3, 0.2], [sd * 2.1, -0.1], [sd * 2.1, -0.22], [sd * 1.3, -0.1]], 0.2, 0, -0.1), null, paint);
      L.add(box, racerM(sd * 2.38, -0.23, -0.02, 0.07, 0.26, 0.1), 0xffffff, 1);
    });
    put(B, stand([[-0.3, 1.25], [0.3, 1.25], [0.1, 1.42], [-0.1, 1.42]], 0.14, 0, -0.1), null, BK.STEEL);
  } else if (shape === 2) {
    // twin booms: armoured side pods with light bars, a mast, a dish
    [-1, 1].forEach((sd) => {
      B.add(box, racerM(sd * 1.68, 0, -0.1, 0.8, 0.18, 0.18), BK.STEEL);
      put(B, racerPlate(0.5, 1.5, 0.56, 0.1, true), racerM(sd * 2.18, 0, -0.1), BK.PLATE);
      B.add(box, racerM(sd * 2.18, 0.5, 0.19, 0.4, 0.14, 0.04), paint);
      L.add(box, racerM(sd * 2.18, -0.1, 0.2, 0.08, 0.86, 0.04), 0xffffff, 1);
    });
    B.add(box, racerM(0, 1.5, -0.1, 0.05, 0.38, 0.05), BK.STEEL);
    L.add(box, racerM(0, 1.7, -0.1, 0.1, 0.1, 0.1), 0xffffff, 1.2);
  } else {
    // a saucer: an elliptical ring of nodes round the collar
    put(B, new THREE.TorusGeometry(2.05, 0.11, 5, 22), racerM(0, 0, -0.1, 1, 0.64, 1), BK.GUN);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 2.05, y = Math.sin(a) * 2.05 * 0.64;
      if (i % 2) L.add(box, racerM(x, y, -0.02, 0.2, 0.2, 0.14), 0xffffff, 1);
      else put(B, racerPlate(0.34, 0.34, 0.3, 0.07, true), racerM(x, y, -0.1), paint);
    }
    [0, 180].forEach((a) => B.add(box, deg(a - 90).multiply(racerM(0, 1.72, -0.1, 0.12, 0.5, 0.12)), BK.STEEL));
  }
  box.dispose();
  return { body: B.build("color"), lamps: L.build("color") };
}

// ---- the carrier -----------------------------------------------------------------
// Each wave has a carrier holding station far ahead: the drones
// are its brood. It answers a miss with a bolt at the shield, and when the wave is
// cleared it goes up, and the fighter jumps through the wreck. Three hull forms.
const BK_CARRIER_Y = 6.4; // it holds station above the lanes, so its eye is never mistaken for a target
class BlasterCarrier {
  constructor(game) {
    const g = (this.g = game);
    this.mat = blasterHullMaterial({ fog: 0.45 });
    this.group = new THREE.Group();
    this.group.position.set(0, BK_CARRIER_Y, -128);
    g.scene.add(this.group);
    this.bolt = makeBeam(0xff4d5a, 3.2);
    g.scene.add(this.bolt);
    this.fade = 0; this.hot = 0; this.tok = 0;
    this._v = new THREE.Vector3();
    this.build(1);
  }
  build(wave) {
    if (this.mesh) { this.group.remove(this.mesh); this.mesh.geometry.dispose(); }
    const v = (wave - 1) % 3, H = new RacerBatch(["aGlow"]);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const put = (geo, m, color, glow = 0) => { H.add(geo, m, color, 1, { aGlow: glow }); geo.dispose(); };
    const ring = (i, n) => new THREE.Matrix4().makeRotationZ((i / n) * Math.PI * 2);
    // a slab drawn in [x, y] stands up facing the fighter, bevel forward
    const stand = (pts, t, bevel, z) => { const geo = blasterSlab(pts.map(([x, y]) => [x, -y]), t, bevel); geo.applyMatrix4(racerM(0, 0, z, 1, 1, 1, Math.PI / 2)); return geo; };
    const mir = (pts, sd) => pts.map(([x, y]) => [x * sd, y]);
    const sx = [1, 0.72, 0.9][v], sy = [1, 1.4, 1.1][v];
    // core block, brow and jaw, the reactor eye behind six iris blades
    put(cyLoft([[-2.2, 2.6 * sx, 1.9 * sy, 0.7], [0, 3.1 * sx, 2.3 * sy, 0.9], [1.1, 2.4 * sx, 1.7 * sy, 0.7]]), racerM(0, 0, 0, 1, 1, 1, Math.PI / 2), 0x232a3c);
    put(racerPlate(4.6 * sx, 0.55, 0.7, 0.14, true), racerM(0, 1.72 * sy, 0.95, 1, 1, 1, -0.3), 0x343d5e);
    put(racerPlate(3.3 * sx, 0.45, 0.6, 0.12, true), racerM(0, -1.68 * sy, 0.85, 1, 1, 1, 0.3), 0x2a3350);
    put(new THREE.CircleGeometry(1.25, 18), racerM(0, 0, 1.12), 0x8a8a8a, 1);
    put(new THREE.CircleGeometry(0.5, 12), racerM(0, 0, 1.15), 0x9a9a9a, 2);
    for (let i = 0; i < 6; i++) H.add(box, ring(i, 6).multiply(racerM(0, 1.42, 1.2, 1.3, 0.5, 0.12, 0, 0, 0.36)), 0x10131c, 1, { aGlow: 0 });
    [-1, 1].forEach((sd) => {
      const wing = [
        [[2.4, 1.3], [8.6, 0.5], [8.9, -0.4], [6.5, -1.2], [2.4, -1.4]],
        [[1.9, 1.7], [5.3, 2.7], [5.8, 1.9], [4.3, -1.9], [1.9, -2.3]],
        [[2.2, 1.2], [6.8, 2.3], [7.7, 0.3], [6.7, -2.7], [5.5, -3.5], [5.9, -1.2], [5.0, 0.0], [2.2, -1.0]],
      ][v];
      put(stand(mir(wing, sd), 1.2, v === 2 ? 0 : 0.25, -0.4), null, 0x1c2134);
      const plate = [[[3.0, 0.9], [7.8, 0.3], [7.9, -0.25], [3.0, -1.0]], [[2.4, 1.3], [4.9, 2.0], [4.4, -1.3], [2.4, -1.7]], [[2.7, 0.8], [6.4, 1.7], [6.9, 0.3], [5.4, 0.3], [2.7, -0.6]]][v];
      put(stand(mir(plate, sd), 0.3, 0.08, 0.3), null, 0x343d5e);
      // hangar bay with its strip lights, a row of windows, a wingtip lamp
      const bay = [[3.6, 0.3, 2.4, 0.7], [2.7, 0.2, 1.5, 1.4], [3.2, 0.25, 2.0, 0.6]][v];
      H.add(box, racerM(sd * (bay[0] + bay[2] / 2), bay[1], 0.5, bay[2], bay[3], 0.08), 0x05060a, 1, { aGlow: 0 });
      [-1, 1].forEach((e) => H.add(box, racerM(sd * (bay[0] + bay[2] / 2), bay[1] + e * (bay[3] / 2 + 0.06), 0.52, bay[2], 0.05, 0.05), 0xffffff, 1, { aGlow: 2 }));
      for (let i = 0; i < 7; i++) H.add(box, racerM(sd * (2.9 + i * 0.55) * sx, -1.05 * sy + (v === 1 ? i * 0.1 : 0), 0.5, 0.2, 0.09, 0.05), 0xffffff, 1, { aGlow: 2 });
      const tip = [[8.75, 0.05], [5.55, 2.3], [7.25, 1.3]][v];
      H.add(box, racerM(sd * tip[0], tip[1], 0.3, 0.22, 0.5, 0.22), 0xffffff, 1, { aGlow: 1 });
      // armoured cheeks flanking the eye
      put(blasterSlab(mir([[1.5, 0.5], [2.3, 0.2], [2.3, -0.2], [1.5, -0.5]], sd), 2.6 * sy, 0.1), racerM(0, 0, 1.3), 0x2a3350);
    });
    // masts and a keel
    [[0, 2.3 * sy, 2.6], [-1.3 * sx, 2.1 * sy, 1.5], [1.3 * sx, 2.1 * sy, 1.5]].forEach(([x, y, hgt]) => {
      H.add(box, racerM(x, y + hgt / 2, -0.4, 0.12, hgt, 0.12), 0x343d5e, 1, { aGlow: 0 });
      H.add(box, racerM(x, y + hgt + 0.1, -0.4, 0.2, 0.2, 0.2), 0xffffff, 1, { aGlow: 1 });
    });
    put(stand([[-0.7, -2.2 * sy], [0.7, -2.2 * sy], [0.2, -2.2 * sy - 2.4], [-0.2, -2.2 * sy - 2.4]], 0.5, 0.1, -0.3), null, 0x1c2134);
    if (v === 1) put(stand([[-0.8, 2.9], [0.8, 2.9], [0.25, 6.4], [-0.25, 6.4]], 0.6, 0.12, -0.6), null, 0x232a3c);
    box.dispose();
    this.mesh = new THREE.Mesh(H.build(), this.mat);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
    this.group.visible = true;
    this.fade = 0;
    this.alive = true;
  }
  // a new wave's carrier comes up out of the dark
  arrive(wave) { this.build(wave); }
  // a miss: the carrier puts a bolt into the shield
  volley() {
    if (!this.alive) return;
    const g = this.g, tok = ++this.tok, from = this._v.copy(this.group.position).setZ(this.group.position.z + 1.5).clone(), to = g.ship.position.clone();
    this.hot = 1;
    aimBeam(this.bolt, from, to, 0.14);
    this.bolt.material.uniforms.uFade.value = 1;
    g.tw.add(0.32, (k) => { if (this.tok === tok) this.bolt.material.uniforms.uFade.value = 1 - k; }, () => { if (this.tok === tok) this.bolt.visible = false; });
  }
  // the wave is cleared: it goes up
  destroy() {
    if (!this.alive) return;
    this.alive = false;
    const g = this.g, p = this.group.position.clone(), col = g.waveCol.clone();
    this.hot = 2;
    g.bursts.burst(p, col.getHex(), { n: 120, speed: 30, size: 1.5, life: 1.3 });
    g.bursts.burst(p, 0xffffff, { n: 50, speed: 14, size: 1.1, life: 0.7 });
    g.shockwave(p.clone(), col.clone().multiplyScalar(2.2), 34, 0.8);
    g.shards.burst(p, col.getHex(), 22, 3, 46);
    g.boom(p, col.getHex(), 40);
    g.tw.wait(0.16, () => { if (!this.alive) this.group.visible = false; });
  }
  update(dt) {
    const g = this.g, u = this.mat.uniforms;
    this.fade = Math.min(1, this.fade + dt / 2.4);
    this.hot = Math.max(0, this.hot - dt * 1.6);
    u.uFade.value = this.fade * this.fade;
    u.uHot.value = this.hot + 0.25 * Math.sin(g.t * 2.2); // the eye breathes
    u.uWave.value.copy(g.waveCol);
    u.uFlash.value = g.space.flashK * g.space.flashK * 0.4;
    u.uFlashZ.value = this.group.position.z;
    this.group.position.set(0, BK_CARRIER_Y + Math.sin(g.t * 0.5) * 0.25, -128 - (1 - this.fade) * 30);
    this.group.rotation.z = Math.sin(g.t * 0.3) * 0.03;
  }
}
