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
// The table: one row per boss, read by the actor (22d, 22e) and the stage (22f). What a row may say:
//   sky    which panorama stands over the arena
//   atk    its attack: the kinds it uses in turn. 0 a volley of projectiles, 1 a ground slam, 2 a wave of energy,
//          3 a swept beam, 4 seekers that lock on (each has its own marker, flight and landing: see the stage)
//   clip   which clip each kind is played with, when it is not the usual one (BOSS_ATK.clip)
//   src    where the attack leaves it: "weapon" (the far end of what its right hand holds), "chest", "handR", "head"
//          (srcs: the same, for each kind of a boss that has more than one)
//   size   how tall it stands in the arena (world units); show: how much of that height the picture holds when the
//          lens is close (0.82: head to knees); wide: how wide it is, in its own heights (for fitting the picture)
//   env, glow   how strongly its armour mirrors the sky, how brightly its light strips burn
//   tear   what is torn off it as its HP falls: [fraction of HP left, bone] (a bone's armour takes the armour of
//          the bones below it along; "wound": a hole burnt in its chest). limp: the arm that hangs once it is hurt
//   last   the parts that go one by one in its death, before the last blast takes the rest
//   tip    how far past the middle of its right hand's part the weapon's end lies (1.7: the far end of a case)
//   dress  what it is dressed with where its model alone could be read as something it is not (22d, BOSS_DRESS)
//   slam   where its ground slam lands: "weapon" (under the head of what its right hand holds); else between its fists
const BOSS_BASE = { atk: [0], src: "weapon", size: 7.4, show: 0.82, env: 2.6, glow: 2.3, tear: [[0.78, "wound"], [0.56, "L_Hand"], [0.34, "L_Forearm"]], limp: "L", last: ["L_Upperarm", "R_Hand", "R_Forearm", "L_Calf", "Head", "R_Upperarm", "R_Calf"] };
const BOSS_ROW = {
  1: { sky: "boss-storm", atk: [0], tip: 1 }, // PRODUCT PUSHER: contracts flung from the middle of its briefcase
  2: { sky: "boss-storm", atk: [1] }, // PERILMONGER: its huge fists down on the floor
  3: { sky: "boss-void", atk: [2], src: "chest" }, // SOLVENCY SPECTER: a wave of energy out of the empty vault in its chest
  4: { sky: "boss-storm", atk: [3], clip: { 3: "attackB" } }, // THE FINE PRINT: a line of light drawn by its quill and swept across (thrust at the lens: in the overhead smash it bends over and its flat hat hides it)
  5: { sky: "boss-storm-b", atk: [1], env: 2.8 }, // GROUP GOLEM: both fists down on the floor
  6: { sky: "boss-storm-b", atk: [2], src: "chest", dress: "boiler" }, // INFLATION TITAN: a blast of steam from its boiler (its head a valve cap, its light from its gauge and its pipes)
  7: { sky: "boss-void", atk: [4], src: "handR" }, // LONGEVITY LICH: seeking bolts of sand from its hands
  8: { sky: "boss-void", atk: [1], slam: "weapon" }, // LORD INTESTATE: its gavel down on the floor
  9: { sky: "boss-storm", atk: [4], src: "handR" }, // UNDUE INFLUENCER: strings of light that find the player
  10: { sky: "boss-storm-b", atk: [0, 1], srcs: { 0: "chest", 1: "weapon" }, env: 2.8, size: 6.8, tear: [[0.78, "wound"], [0.56, "forearmL"], [0.34, "shoulderL"]], last: ["forearmR", "forearmL", "shoulderR", "shoulderL"] }, // PROBATE TOLLGATE: a volley from the booth, then the barrier's slam
  11: { sky: "boss-void", atk: [3], clip: { 3: "attackB" }, dress: "shade" }, // PATRIMONY PHANTOM: a cleaving arc from its cleaver (thrust at the lens: in the overhead smash it bends over and its cloak hides it)
  all: { sky: "boss-void", atk: [0, 1, 2, 3, 4], srcs: { 2: "chest", 4: "handR" } }, // THE PROCTOR: all five, in turn
};
const bossRow = (key) => Object.assign({ key: String(key) }, BOSS_BASE, BOSS_ROW[key] || BOSS_ROW[1]);

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
