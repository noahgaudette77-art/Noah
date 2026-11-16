// The Final Exam's generated sky and prop, served (opened from disk the hall is exactly as it was):
//   the night beyond the windows is the moonlit panorama (exam-moon: a full moon in storm cloud over a paved court and
//   a golden arch), shown through a long lens so the moon stands in the high windows beside the examiner's head;
//   the examiner's armour mirrors that night instead of the dark it was given, so it is lit by the moon;
//   the examiner's lectern (prop-podium: a book and a bell on it) stands before it, its top at the foot of the frame,
//   lit by the same night and the hall's lamps.
// Look only: nothing here knows a question, an answer or a clock.
const EXAM_GEN = {
  SKY: { u: 0.728, v: 0.655, at: 15, zoom: 0.85, min: 0.43 }, // (the moon's place in the picture, put straight behind the examiner's head, in its halo)
  PODIUM: { s: 5.2, z: BOSS_S * 0.6, ry: 0 },
};
function examGen(game) {
  if (!Assets.on || !game.has3D) return null;
  const sky = Assets.sky("exam-moon"), podium = Assets.model("prop-podium");
  if (!(sky && sky.map) && !podium) return null;
  const s = game.scene, G = { sky: sky && sky.map ? sky : null };
  if (G.sky) {
    G.dome = makePanoSky(G.sky, { gain: 0.95, lift: 1.4, window: EXAM_GEN.SKY });
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
    s.add(podium.scene);
    G.podium = podium;
  }
  return G;
}
