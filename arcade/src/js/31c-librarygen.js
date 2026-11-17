// The Strategy Guide's generated light and prop, served (opened from disk the archive is exactly as it was):
//   the generated archive (guide-archive: a vaulted library of lamp-lit shelves and stained glass) stands round the
//   nave as its backdrop, seen above the shelves and in the vault overhead, and is the light the book is lit by;
//   the great book (prop-tome: chrome corners on violet boards) is on show over the reading desk, turning slowly in
//   the lamp's light, with a warm glow under it.
// (the book: an open tome on a chrome stand, under the rose window and above the reading desk's lamp, its pages
// tipped toward the lens; it sways a little instead of turning its back)
const LIB_GEN = { TOME: { s: 1.35, y: 4.95, z: -23.6, rx: 0.5, swing: 0.28 }, SKY: { gain: 1.15, lift: 1.1, rot: 1.6 } };
function libraryGen(lib) {
  if (!Assets.on || !lib.has3D) return null;
  const sky = Assets.sky("guide-archive"), tome = Assets.model("prop-tome");
  if (!(sky && sky.map) && !tome) return null;
  const s = lib.scene, G = { t: 0 };
  if (sky && sky.map) {
    G.dome = makePanoSky(sky, LIB_GEN.SKY);
    s.add(G.dome);
    applySkyEnv(s, sky);
  }
  if (tome) {
    const T = LIB_GEN.TOME;
    tuneModel(tome, { env: 1.6, glow: 2.2 });
    G.tome = new THREE.Group();
    tome.scene.scale.setScalar(T.s);
    tome.scene.rotation.x = T.rx;
    G.tome.add(tome.scene);
    G.tome.position.set(0, T.y, T.z);
    s.add(G.tome);
    G.light = new THREE.PointLight(0xffe2b8, 3.2, 10, 1.6); // (a warm lamp in front of it and above: its cover, gold corners and page edges read)
    G.light.position.set(-0.8, T.y + 2.2, T.z + 3.4);
    s.add(G.light);
    G.glow = glowSprite(neon(0xffc27a, 1), 3.4, 0.32);
    G.glow.position.set(0, T.y + 0.5, T.z - 0.4);
    G.glow.layers.set(1);
    s.add(G.glow);
  }
  return G;
}
function libraryGenUpdate(lib, dt, lt) {
  const G = lib.gen;
  if (!G) return;
  if (G.dome) G.dome.userData.follow(lib.camera);
  if (G.tome) {
    G.tome.rotation.y = Math.sin(lt * 0.3) * LIB_GEN.TOME.swing;
    G.tome.position.y = LIB_GEN.TOME.y + Math.sin(lt * 0.7) * 0.06;
  }
}
