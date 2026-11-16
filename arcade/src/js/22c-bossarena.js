// Boss Rush under a real sky, and the table that says how each boss is shown.
//
// When the page is served and the arena's panoramas have loaded, the arena stands under one of three storm skies (the
// one that suits the boss), tinted toward the boss's colour: the sky is the backdrop above the stands, the light every
// glossy surface mirrors and the colour of the mist. Opened from disk nothing here runs and the arena is what it
// always was.
//
// Only a narrow strip of sky shows above the stands (the picture is the band between the question and the answers),
// so each panorama is seen through a long lens: one part of it, large, behind the boss (BOSS_SKY: which part). Only
// the upper half of a panorama is sky; nothing below its own horizon is ever shown.
const BOSS_SKY = {
  // u, v: the place in the picture that stands behind the boss, at the top of the stands (v counted upward);
  // zoom: how many times it is magnified; min: the lowest v that may show; fog: the colour the stands fall back into
  "boss-storm": { u: 0.725, v: 0.5, zoom: 2.9, min: 0.492, gain: 0.82, lift: 1.5, fog: 0x120828, bolt: 0xe6a8ff },
  "boss-storm-b": { u: 0.895, v: 0.5, zoom: 2.3, min: 0.5, gain: 1.5, lift: 1.3, fog: 0x08151a, bolt: 0xbfe8ff },
  "boss-void": { u: 0.79, v: 0.43, zoom: 3.1, min: 0.415, gain: 0.95, lift: 1.5, fog: 0x0c0516, bolt: 0xd8a0ff },
};
// One row per boss. sky: which panorama. Everything else about how a boss is shown (its size in the picture, its
// attack, what is torn off it and when) is added to these rows by the files that use it (22d, 22f).
const BOSS_ROW = {
  1: { sky: "boss-storm" }, 2: { sky: "boss-storm" }, 3: { sky: "boss-void" }, 4: { sky: "boss-storm" },
  5: { sky: "boss-storm-b" }, 6: { sky: "boss-storm-b" }, 7: { sky: "boss-void" }, 8: { sky: "boss-void" },
  9: { sky: "boss-storm" }, 10: { sky: "boss-storm-b" }, 11: { sky: "boss-void" }, all: { sky: "boss-void" },
};
const bossRow = (key) => BOSS_ROW[key] || BOSS_ROW[1];

class BossArena {
  constructor(game, sky, row) {
    const g = (this.g = game), s = g.scene, col = new THREE.Color(g.cfg.color), K = (this.K = BOSS_SKY[row.sky] || BOSS_SKY["boss-storm"]);
    this.tint0 = new THREE.Color(0xffffff).lerp(col, 0.26); // the sky leans toward the boss's colour
    this.tintRage = new THREE.Color(1.15, 0.5, 0.52);
    this.tint = this.tint0.clone();
    this.dome = makePanoSky(sky, { gain: K.gain, lift: K.lift, tint: this.tint, window: { u: K.u, v: K.v, at: 4.6, zoom: K.zoom, min: K.min } });
    s.add(this.dome);
    applySkyEnv(s, sky); // (what a loaded model's chrome mirrors; the arena's own surfaces keep the reflection map they were built with)
    // the old painted sky and its ridge stand down (the game still writes the sky's colours as it rages: harmless)
    g.sky.visible = false;
    if (g.ridge) g.ridge.visible = false;
    g.fogBase.set(K.fog).lerp(col, 0.05);
    s.fog.color.copy(g.fogBase);
    s.background.set(K.fog);
    // darker and more ominous: thinner mist, dimmer searchlights, the stands only edged by the arena's light
    g.haze.forEach((m) => { m.userData.k *= 0.5; if (m.userData.far) m.material.color.multiplyScalar(0.4); });
    g.beamMat.uniforms.uI.value = 0.2;
    g.ambient.intensity *= 0.8;
    const post = s.userData.post;
    post.ssaa = 2; // drawn at twice the size and brought down: chrome edges and seams of light are smooth lines
    post.vignette = 1.3;
    post.dof.sky = 0.2; // (the storm stays readable behind the boss)
    // lightning: a single pulse of the sky and of a light behind the boss, a few seconds apart (never a flicker)
    this.storm = new THREE.DirectionalLight(K.bolt, 0);
    this.storm.position.set(-5, 11, -14);
    s.add(this.storm);
    this.boltK = 0; this.boltT = rand(1.5, 3); this.gain = K.gain;
  }
  // a stroke of lightning now (the boss lands, rages, dies)
  strike(k = 1) { this.boltK = Math.max(this.boltK, k); this.boltT = rand(3.5, 7.5); this.storm.position.x = rand(-9, 9); }
  update(d) {
    const g = this.g, quiet = REDUCED_MOTION || GFX.calm, rk = g.rageK || 0;
    this.dome.userData.follow(g.camera);
    if ((this.boltT -= d) <= 0) this.strike(rand(0.55, 1));
    this.boltK *= Math.pow(0.012, d); // (gone in half a second)
    const b = this.boltK * (quiet ? 0.25 : 1);
    this.tint.copy(this.tint0).lerp(this.tintRage, rk * 0.55);
    this.dome.userData.set({ gain: this.gain * (1 + 0.85 * b + 0.12 * rk), tint: this.tint });
    this.storm.intensity = 1.6 * b;
  }
  dispose() { this.dome.material.dispose(); this.dome.geometry.dispose(); }
}
