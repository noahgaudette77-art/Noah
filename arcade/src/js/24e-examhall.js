// The Final Exam's gallery of the fallen, served (opened from disk the hall is exactly as it was):
//   the eleven chapter bosses and the Proctor as statues (statue-1 .. statue-11, statue-all: the other builds of each
//   boss's own design), smaller than the examiner, on plinths in two tiers behind its dais. One cast bronze for all
//   twelve, lit by the moon (the panorama's reflection) and the hall's own lamps; their own maps are not used (where a
//   build was simplified they are patchy). The twelve and their plinths are one mesh: one draw.
//   On the hall's centre line, at the foot of the gallery, the examiner's first desk (decor-podium, the darker
//   lectern), lit by the same night.
// While the questions are up the camera is under the examiner's chin, and none of this may stand behind the question,
// the answers or the timer: it waits in the dark, not drawn. When the ending begins (the examiner falls, or makes its
// last stand) and the camera draws back, the light comes up on it. Look only, on the show clock: nothing here knows a
// question, an answer or a clock. GFX.extras === false (slow frames) leaves all of it out.
const EXAM_HALL = {
  // model, x, z (on the floor), height, plinth height. As the lens sees them the tiers interleave: each statue of the
  // back tier stands between two of the front, a step higher. The widest builds take the back tier, where there is room.
  STATUES: [
    ["statue-7", -3.0, -8.06, 3.1, 0.42], ["statue-1", 3.0, -8.06, 3.1, 0.42],
    ["statue-6", -5.58, -6.55, 3.1, 0.42], ["statue-3", 5.58, -6.55, 3.1, 0.42],
    ["statue-8", -7.5, -4.2, 3.1, 0.42], ["statue-11", 7.5, -4.2, 3.1, 0.42],
    ["statue-all", -1.8, -12.67, 3.5, 1.3], ["statue-9", 1.8, -12.67, 3.4, 1.3],
    ["statue-4", -5.2, -11.7, 3.4, 1.3], ["statue-2", 5.2, -11.7, 3.4, 1.3],
    ["statue-5", -8.1, -9.9, 3.2, 1.3], ["statue-10", 8.1, -9.9, 3.4, 1.3],
  ],
  FACE: [0, 16], // each turned to this point of the floor: the front of the hall, where the lens stands
  BRONZE: 0x5c4634, ROUGH: 0.28, ENV: 1.7, // (a dark bronze, not so warm that the moon's blue and the hall's violet cannot show in it)
  PLINTH: [0.15, 0.13, 0.2], GOLD: [1.5, 1.3, 0.95], // (times the bronze: the plinths' black and their gold bands, as the dais's)
  DESK: { x: 0, z: -7.5, s: 2.9 }, // (on the centre line: on a phone it is seen between the examiner's feet, and once it has fallen)
  FADE: 1.6, // seconds for the light to come up on them
};
function examHall(game) {
  if (!Assets.on || !game.has3D) return null;
  const H = EXAM_HALL, got = H.STATUES.map((s) => Assets.model(s[0])), desk = Assets.model("decor-podium");
  if (GFX.extras === false) { got.concat([desk]).forEach((m) => m && disposeTree(m.scene)); return null; }
  const G = { k: 0, shown: -1, mesh: null, desk: null }, s = game.scene;
  const env = (game.gen && game.gen.sky && game.gen.sky.env) || (game.bossEnvRT && game.bossEnvRT.texture) || null;
  const paint = (geo, f) => {
    const p = geo.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const v = f(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = v[0]; c[i * 3 + 1] = v[1]; c[i * 3 + 2] = v[2]; }
    geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return geo;
  };
  const geos = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), at = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), white = [1, 1, 1];
  H.STATUES.forEach(([, x, z, h, ph], i) => {
    const model = got[i];
    if (!model) return;
    m.compose(at.set(x, ph, z), q.setFromAxisAngle(up, Math.atan2(H.FACE[0] - x, H.FACE[1] - z)), sc.setScalar(h));
    const g = modelGeometry(model, m);
    disposeTree(model.scene); // (its geometry is copied; its maps are never sent to the graphics chip)
    if (!g) return;
    geos.push(paint(g.geo, () => white));
    // its plinth, sized to the figure: black, a gold band at its foot and under the figure, as the dais is
    const r = clamp(0.45 * Math.max(g.box.max.x - g.box.min.x, g.box.max.z - g.box.min.z) + 0.15, 0.85, 1.55);
    const lathe = examLathe([[r + 0.1, 0], [r + 0.1, 0.07, true], [r, 0.13, true], [r * 0.9, 0.19, true], [r * 0.9, ph - 0.17, true], [r, ph - 0.11, true], [r + 0.05, ph - 0.05, true], [r + 0.05, ph, true], [0, ph]], 24);
    paint(lathe, (lx, ly, lz) => (ly < 0.075 || (ly > ph - 0.115 && Math.hypot(lx, lz) > r - 0.01) ? H.GOLD : H.PLINTH));
    geos.push(lathe.translate(x, 0, z));
  });
  if (geos.length) {
    const mat = new THREE.MeshStandardMaterial({ color: 0, metalness: 1, roughness: H.ROUGH, vertexColors: true, envMap: env, envMapIntensity: H.ENV });
    surfaceDetail(mat, { scale: 2.2, height: 0.0014, grain: 1, scratch: 0.5, smudge: 0.6 }); // (cast, not turned: a grain, a few scratches)
    G.mesh = new THREE.Mesh(mergeIndexed(geos, ["position", "normal", "color"]), mat);
    G.mesh.visible = false;
    G.mat = mat;
    G.bronze = new THREE.Color(H.BRONZE);
    s.add(G.mesh);
  }
  if (desk) {
    const D = H.DESK;
    G.deskMats = tuneModel(desk, { env: 2, glow: 1.6 }).map((mm) => ({ m: mm, c: mm.color.clone(), e: mm.emissiveIntensity }));
    desk.scene.scale.setScalar(D.s);
    desk.scene.position.set(D.x, 0, D.z);
    desk.scene.rotation.y = Math.atan2(H.FACE[0] - D.x, H.FACE[1] - D.z);
    desk.scene.visible = false;
    s.add(desk.scene);
    G.desk = desk;
  }
  return G.mesh || G.desk ? G : null;
}
// Each frame (show clock): from the moment the ending begins, the light comes up on the gallery and the desk.
function examHallUpdate(game, dt) {
  const G = game.hall;
  if (!G) return;
  const B = game.boss;
  if (B && (B.mode === "die" || B.mode === "rage")) G.k = Math.min(1, G.k + dt / EXAM_HALL.FADE);
  const on = G.k > 0 && GFX.extras !== false, k = G.k * G.k * (3 - 2 * G.k);
  if (G.mesh) G.mesh.visible = on;
  if (G.desk) G.desk.scene.visible = on;
  if (!on || k === G.shown) return;
  G.shown = k;
  if (G.mesh) G.mat.color.copy(G.bronze).multiplyScalar(k);
  if (G.desk) for (const d of G.deskMats) { d.m.color.copy(d.c).multiplyScalar(k); d.m.emissiveIntensity = d.e * k; }
}
