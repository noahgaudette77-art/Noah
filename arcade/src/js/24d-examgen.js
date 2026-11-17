// The Final Exam's generated sky and prop, served (opened from disk the hall is exactly as it was):
//   the night beyond the windows is the moonlit panorama (exam-moon: a full moon in storm cloud over a paved court and
//   a golden arch), shown through a long lens so the moon stands in the high windows beside the examiner's head;
//   the examiner's armour mirrors that night instead of the dark it was given, so it is lit by the moon;
//   the examiner's lectern (prop-podium: a book and a bell on it) stands before it, its top at the foot of the frame,
//   lit by the same night and the hall's lamps.
// Look only: nothing here knows a question, an answer or a clock.
const EXAM_GEN = {
  // (the moon's place in the picture, put in the arch to the left of the examiner, low: it shows in the arches as the
  // camera draws back for the ending; the picture's blue day-lit cloud is darkened to a night under it)
  SKY: { u: 0.752, v: 0.655, at: 6, zoom: 0.85, min: 0.43 }, TINT: 0x5a68b8, GAIN: 0.5,
  PODIUM: { s: 4.7, z: BOSS_S * 0.62, ry: 0, rx: 0.24 }, // (leaned a little toward the lens, so the open book on it shows from below)
};
function examGen(game) {
  if (!Assets.on || !game.has3D) return null;
  const sky = Assets.sky("exam-moon"), podium = Assets.model("prop-podium");
  if (!(sky && sky.map) && !podium) return null;
  const s = game.scene, G = { sky: sky && sky.map ? sky : null };
  if (G.sky) {
    G.dome = makePanoSky(G.sky, { gain: EXAM_GEN.GAIN, lift: 2.2, tint: EXAM_GEN.TINT, window: EXAM_GEN.SKY });
    s.add(G.dome);
    if (game.night) game.night.visible = false;
    applySkyEnv(s, G.sky); // (what a model in the hall mirrors and is lit by)
  }
  if (podium) {
    const P = EXAM_GEN.PODIUM;
    tuneModel(podium, { env: 2, glow: 1.8 });
    podium.scene.scale.setScalar(P.s);
    podium.scene.position.set(0, BOSS_DAIS, P.z);
    podium.scene.rotation.y = P.ry;
    podium.scene.rotation.x = P.rx;
    s.add(podium.scene);
    G.podium = podium;
    G.sink = 0;
  }
  return G;
}
// Each frame: the sky stays round the lens, and when the ending begins (the examiner falls, or makes its last stand)
// the lectern sinks into the dais, so the camera that draws back for the ending sees the examiner, not the lectern.
function examGenUpdate(game, dt) {
  const G = game.gen;
  if (!G) return;
  if (G.dome) G.dome.userData.follow(game.camera);
  if (G.podium) {
    const B = game.boss, end = !!(B && (B.mode === "die" || B.mode === "rage"));
    G.sink = clamp(G.sink + (end ? dt / 0.8 : -dt / 0.8), 0, 1);
    const k = G.sink * G.sink * (3 - 2 * G.sink);
    G.podium.scene.position.y = BOSS_DAIS - k * EXAM_GEN.PODIUM.s * 1.05;
    G.podium.scene.visible = k < 0.999;
  }
}
