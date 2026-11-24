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
  "boss-storm-b": { u: 0.895, v: 0.5, zoom: 2.3, min: 0.5, gain: 1.5, lift: 1.3, fog: 0x0c0b22, bolt: 0xbfe8ff }, // (its fog the shared violet-black, cooled toward its storm: it was a teal-black)
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
//   dress  what its model is dressed with (22d, BOSS_DRESS: the Titan's smokestacks, hot and venting steam)
//   slam   where its ground slam lands: "weapon" (under the head of what its right hand holds); else between its fists
const BOSS_BASE = { atk: [0], src: "weapon", size: 7.4, show: 0.82, env: 2.6, glow: 2.3, tear: [[0.78, "wound"], [0.56, "L_Hand"], [0.34, "L_Forearm"]], limp: "L", last: ["L_Upperarm", "R_Hand", "R_Forearm", "L_Calf", "Head", "R_Upperarm", "R_Calf"] };
const BOSS_ROW = {
  1: { sky: "boss-storm", atk: [0], tip: 1 }, // PRODUCT PUSHER: contracts flung from the middle of its briefcase
  2: { sky: "boss-storm", atk: [1] }, // PERILMONGER: its huge fists down on the floor
  3: { sky: "boss-storm", atk: [2], src: "chest" }, // SOLVENCY SPECTER: a wave of energy out of the empty vault in its chest (under the violet storm: the three undead-looking bosses each have their own sky)
  4: { sky: "boss-storm", atk: [3], clip: { 3: "attackB" } }, // THE FINE PRINT: a line of light drawn by its quill and swept across (thrust at the lens: in the overhead smash it bends over and its flat hat hides it)
  5: { sky: "boss-storm-b", atk: [1], env: 2.8 }, // GROUP GOLEM: both fists down on the floor
  6: { sky: "boss-storm-b", atk: [2], src: "chest", dress: "stacks" }, // INFLATION TITAN: a blast of steam from its boiler (its light from its gauge and its smokestacks)
  7: { sky: "boss-storm-b", atk: [4], src: "handR" }, // LONGEVITY LICH: seeking bolts of sand from its hands (under the teal storm, tinted mint)
  8: { sky: "boss-void", atk: [1], slam: "weapon" }, // LORD INTESTATE: its gavel down on the floor
  9: { sky: "boss-storm", atk: [4], src: "handR" }, // UNDUE INFLUENCER: strings of light that find the player
  10: { sky: "boss-storm-b", atk: [0, 1], srcs: { 0: "chest", 1: "weapon" }, env: 2.8, size: 6.8, tear: [[0.78, "wound"], [0.56, "forearmL"], [0.34, "shoulderL"]], last: ["forearmR", "forearmL", "shoulderR", "shoulderL"] }, // PROBATE TOLLGATE: a volley from the booth, then the barrier's slam
  11: { sky: "boss-void", atk: [3], clip: { 3: "attackB" } }, // PATRIMONY PHANTOM: a cleaving arc from its cleaver (thrust at the lens: in the overhead smash it bends over and its cloak hides it)
  all: { sky: "boss-void", atk: [0, 1, 2, 3, 4], srcs: { 2: "chest", 4: "handR" }, clip: { 3: "attackB" }, slam: "weapon", size: 6.9 }, // THE PROCTOR: all five, in turn (its sweep thrust at the lens: in the overhead smash its arms and cap hide it; its slam lands under its right fist). Phase 5: the owner's machine, as in the exam, on the old Proctor's clips (24f-proctor.js); a little smaller than the rest: it stands at its full height, its cap clear of the picture's top
};
const bossRow = (key) => Object.assign({ key: String(key) }, BOSS_BASE, BOSS_ROW[key] || BOSS_ROW[1]);

// ---- the arena's surfaces and its own light (the master overhaul, Phase 2, 2026-11-23) ------------------------------
// The audit's weakest picture: black cut-out crowds on flat royal-blue stands, pillars that were untextured boxes, a
// floor dark and empty, and everything in the boss's own colour (the cyan boss stood on a cyan arena). Now: a polished
// deck that gives the arena back (BossGame.build3D), steel pillars with neon inlays and stands of painted panels, one
// lit material for both (arenaSteelMaterial), their neon in one draw (arenaGlowMaterial), lit figures in the crowd
// (bossCrowdTexture), all on the shared violet-black.
//
// The arena's own neon is the art bible's pair for Boss Rush, violet and cyan, never the boss's own colour: where its
// colour is one of the two, magenta (the arcade's own signs) stands in. a: the arena's lead (its rails, its pillars'
// inlays, its mist); b: the second (its lamps, the lines in its deck, its footlights, its searchlights). The boss keeps
// its colour for what is its own: its banners, the circle and the light under it, its lamps, the sky leaning toward
// it, its fans' glow sticks.
function bossArenaPair(hex) {
  const hsl = (c) => new THREE.Color(c).getHSL({ h: 0, s: 0, l: 0 }), b = hsl(hex);
  const near = (c) => { const d = Math.abs(b.h - hsl(c).h); return b.s > 0.25 && Math.min(d, 1 - d) < 0.06; };
  return { a: new THREE.Color(near(COLORS.violet) ? COLORS.magenta : COLORS.violet), b: new THREE.Color(near(COLORS.cyan) ? COLORS.magenta : COLORS.cyan) };
}
// The arena's steel, its stands' painted panels and its banners' cloth: one lit material, a draw for all of them. Each
// corner says what it is (aMetal, aRough; aKind 0 brushed steel, 1 a painted panel, 2 cloth). The brushing's streaks
// and the roughness they leave come from a CC0 material (ambientCG Metal009: assets/ui/mat-steel.webp, the normal's x
// and y in red and green, roughness in blue; a level plate until it arrives), laid along each face by where it is
// (no UVs): up a pillar, across a panel; a panel has a seam every 1.2 m up it and 1.9 m along it. What it reflects is
// the arena itself, drawn once (BossGame.probeTaken; until then, env).
function arenaSteelMaterial(env) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 1, envMap: env || null, envMapIntensity: 1 });
  m.extensions = { derivatives: true };
  m.userData.tBrush = { value: cellFlatTexture() };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tBrush = m.userData.tBrush;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aMetal; attribute float aRough; attribute float aKind; varying vec3 vSurf; varying vec3 vWP; varying vec3 vWN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vSurf = vec3(aMetal, aRough, aKind);")
      .replace("#include <project_vertex>", "#include <project_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSurf; varying vec3 vWP; varying vec3 vWN; uniform sampler2D tBrush;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 sN = normalize(vWN), sT = normalize(vec3(-sN.z, 0.0, sN.x) + vec3(1e-4, 0.0, 0.0));
        float sAlong = dot(vWP, sT), sFlat = step(0.6, abs(sN.y));
        float kPanel = step(0.5, vSurf.z) * (1.0 - step(1.5, vSurf.z)), kCloth = step(1.5, vSurf.z);
        vec2 sUv = mix(mix(vec2(vWP.y, sAlong), vec2(sAlong, vWP.y), kPanel), vWP.xz, sFlat); // (the streaks run along the texture's x)
        vec3 brush = texture2D(tBrush, sUv * vec2(0.35, 1.4)).rgb;
        vec2 sq = vec2(vWP.y / 1.2, sAlong / 1.9), sw = fwidth(sq) * 1.5 + 1e-4, sd = abs(fract(sq + 0.5) - 0.5);
        float seam = kPanel * (1.0 - sFlat) * max(1.0 - smoothstep(0.018, 0.018 + sw.x, sd.x), 1.0 - smoothstep(0.01, 0.01 + sw.y, sd.y));
        float fold = 0.82 + 0.18 * sin(sAlong * 21.0 + vWP.y * 1.3);
        diffuseColor.rgb *= mix(0.9 + 0.2 * brush.b, fold, kCloth) * (1.0 - 0.7 * seam);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = clamp(vSurf.y * mix(mix(0.72, 1.32, brush.b), 1.0, kCloth) + 0.35 * seam, 0.04, 1.0);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n  metalnessFactor = vSurf.x * (1.0 - 0.6 * seam);");
  };
  m.customProgramCacheKey = () => "arena-steel-1";
  return m;
}
// The arena's neon, unlit and in one draw: its pillars' inlays and lamps, the rails along its stands, the lights at
// their feet, its banners' marks. Each strip's colour is in its corners (aCol, over 1 where it blooms). Raging, the
// arena's own neon (aRole 1, its lamps 2) bleeds toward red with the rest of the arena; the boss's own marks (aRole 0)
// keep theirs. uSurge: the lamps flare as a blow rolls out through the arena (the built-in cyborg's hits: 22b).
function arenaGlowMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uRage: { value: 0 }, uSurge: { value: 0 }, uRageCol: { value: new THREE.Color(1, 0.14, 0.24) } }),
    vertexShader: "attribute vec3 aCol; attribute float aRole; varying vec3 vCol; varying float vRole; varying float vDepth; void main(){ vCol = aCol; vRole = aRole; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS} uniform float uRage; uniform float uSurge; uniform vec3 uRageCol; varying vec3 vCol; varying float vRole; varying float vDepth;
      void main(){ vec3 c = mix(vCol, uRageCol * max(max(vCol.r, vCol.g), vCol.b), uRage * step(0.5, vRole)) * (1.0 + uSurge * step(1.5, vRole));
        gl_FragColor = vec4(mix(c, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0); }`,
  });
}
// One pillar of the ring, its steel (st: a RacerBatch with aMetal, aRough, aKind) and its neon (gl: with aRole), at
// `at` (local +z faces the middle of the ring): a plinth, an octagonal shaft with two collars, a flared capital and its
// lamp; two lines of the arena's lead colour up the face toward the ring, one of its second up each face beside it, a
// ring of light under each collar and round its foot; the boss's banner on the ring's side, cloth that the light falls
// on, its marks in the boss's colour.
function bossPillar(st, gl, at, A, B, hex) {
  const M = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) => at.clone().multiply(racerM(x, y, z, sx, sy, sz, 0, ry, 0));
  const box = new THREE.BoxGeometry(1, 1, 1), oct = (r0, r1, h, open) => new THREE.CylinderGeometry(r0, r1, h, 8, 1, !!open).rotateY(Math.PI / 8);
  const S = { aMetal: 0.88, aRough: 0.34, aKind: 0 }, Sd = { aMetal: 0.8, aRough: 0.46, aKind: 0 }, cloth = { aMetal: 0, aRough: 0.82, aKind: 2 };
  const steel = 0x1e1b26, dark = 0x121019, R = 0.62, ap = R * Math.cos(Math.PI / 8); // (dark gunmetal, a violet cast; the shaft's apothem: where a face is)
  st.add(box, M(0, 0.3, 0, 2.1, 0.6, 2.1), dark, 1, Sd); // the plinth
  st.add(box, M(0, 0.72, 0, 1.55, 0.24, 1.55), steel, 1, S);
  st.add(oct(R, R, 8.5, true), M(0, 0.84 + 4.25, 0), steel, 1, S); // the shaft
  for (const y of [3.62, 6.62]) st.add(oct(0.84, 0.84, 0.3), M(0, y, 0), dark, 1, Sd); // its collars
  st.add(oct(0.98, 0.66, 0.56), M(0, 9.62, 0), steel, 1, S); // the capital, flared
  st.add(box, M(0, 10.0, 0, 1.75, 0.2, 1.75), dark, 1, Sd);
  const a = { aRole: 1 }, own = { aRole: 0 };
  for (const [y0, y1] of [[1.02, 3.4], [3.86, 6.4], [6.86, 9.28]]) {
    for (const sx of [-0.17, 0.17]) gl.add(box, M(sx, (y0 + y1) / 2, ap + 0.012, 0.05, y1 - y0, 0.03), A, 2.1, a); // two lines up the face toward the ring
    for (const sd of [-1, 1]) gl.add(box, M(sd * Math.sin(Math.PI / 4) * (ap + 0.012), (y0 + y1) / 2, Math.cos(Math.PI / 4) * (ap + 0.012), 0.05, y1 - y0, 0.03, sd * Math.PI / 4), B, 1.7, a); // one up each face beside it
  }
  for (const y of [3.45, 6.45]) gl.add(oct(0.855, 0.855, 0.04, true), M(0, y, 0), B, 1.6, a); // a ring of light under each collar
  gl.add(oct(0.8, 0.8, 0.045, true), M(0, 0.86, 0), A, 1.5, a); // and round its foot
  gl.add(new THREE.OctahedronGeometry(0.3, 0), M(0, 10.42, 0), B, 2.4, { aRole: 2 }); // its lamp (the searchlight's foot)
  // the banner: a swallow tail of cloth in the boss's colour (the light falls on it: both its faces), its rod, its marks
  const pen = new THREE.ShapeGeometry(new THREE.Shape([[-0.42, 0], [0.42, 0], [0.42, -2.9], [0, -2.45], [-0.42, -2.9]].map(([x, y]) => new THREE.Vector2(x, y))));
  const cl = new THREE.Color(hex).multiplyScalar(0.04).lerp(new THREE.Color(0.016, 0.006, 0.026), 0.3); // (dyed dark: the lamps on it are strong)
  st.add(pen, M(0, 8.3, 0.9), cl, 1, cloth);
  st.add(pen, M(0, 8.3, 0.894, 1, 1, 1, Math.PI), cl, 1, cloth);
  st.add(box, M(0, 8.34, 0.9, 1.0, 0.07, 0.07), dark, 1, Sd);
  for (const y of [7.72, 7.5]) gl.add(box, M(0, y, 0.912, 0.62, 0.07, 0.01), hex, 1.5, own);
  gl.add(box, M(0, 6.72, 0.912, 0.24, 0.24, 0.01, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 4)), hex, 1.7, own);
  box.dispose(); pen.dispose();
}
// The crowd's figures (lit figures, where they were black cut-outs): eight people in a strip, one picture a card, made
// once for the page (a DataTexture: each channel is read for itself). Red: how much of the arena's light a part of a
// figure takes (lit from above: heads and shoulders most); green: its rim, along its top and upper sides, where the
// light behind it catches its edge; blue: what glows of its own (a light stick, a phone held up, a sign's lit border);
// alpha: the figure. Heads and shoulders, arms up, a cap, a pair close together, a hood, a light stick, a bun, a sign.
let _crowdTex = null;
const BOSS_CROWD_N = 8;
function bossCrowdTexture() {
  if (_crowdTex) return _crowdTex;
  const W = 128, N = BOSS_CROWD_N, WN = W * N, cv = document.createElement("canvas"), ac = document.createElement("canvas");
  cv.width = ac.width = WN; cv.height = ac.height = W;
  const x = cv.getContext("2d"), y = ac.getContext("2d");
  x.fillStyle = x.strokeStyle = y.fillStyle = y.strokeStyle = "#fff";
  const head = (c, hx, hy, r) => { c.beginPath(); c.arc(hx, hy, r, 0, Math.PI * 2); c.fill(); };
  const body = (c, bx, w, top) => { c.beginPath(); c.moveTo(bx - w, W); c.quadraticCurveTo(bx - w, top + 4, bx - w * 0.55, top); c.lineTo(bx + w * 0.55, top); c.quadraticCurveTo(bx + w, top + 4, bx + w, W); c.closePath(); c.fill(); };
  const limb = (c, ax, ay, bx, by, wd) => { c.lineWidth = wd; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); };
  for (let k = 0; k < N; k++) {
    const cx = k * W + W / 2;
    if (k === 3) { body(x, cx - 21, 22, 70); head(x, cx - 21, 50, 15); body(x, cx + 22, 20, 74); head(x, cx + 22, 55, 14); continue; } // a pair
    body(x, cx, k === 6 ? 30 : 34, 66); head(x, cx, 44, k === 6 ? 16 : 18); x.fillRect(cx - 7, 52, 14, 16);
    if (k === 1) { limb(x, cx - 26, 74, cx - 38, 22, 11); limb(x, cx + 26, 74, cx + 36, 18, 11); } // both arms up
    if (k === 2) { x.beginPath(); x.ellipse(cx, 32, 22, 9, 0, Math.PI, 0); x.fill(); x.fillRect(cx - 4, 30, 32, 5); y.fillRect(cx - 12, 82, 11, 15); } // a cap; a phone lit at the chest
    if (k === 4) { x.beginPath(); x.moveTo(cx - 23, 54); x.quadraticCurveTo(cx - 22, 20, cx + 3, 13); x.quadraticCurveTo(cx + 23, 22, cx + 23, 54); x.closePath(); x.fill(); } // a hood
    if (k === 5) { limb(x, cx + 26, 74, cx + 34, 28, 11); limb(x, cx + 34, 30, cx + 41, 3, 5); limb(y, cx + 35, 24, cx + 41, 3, 5); } // one arm up, a light stick in it
    if (k === 6) head(x, cx + 3, 23, 9); // a bun
    if (k === 7) { limb(x, cx - 26, 74, cx - 31, 34, 10); limb(x, cx + 26, 74, cx + 31, 34, 10); x.fillRect(cx - 42, 6, 84, 30); y.lineWidth = 4; y.strokeRect(cx - 40, 8, 80, 26); } // a sign held up, its border lit
  }
  const M = x.getImageData(0, 0, WN, W).data, G = y.getImageData(0, 0, WN, W).data, out = new Uint8Array(WN * W * 4);
  const al = (i, j) => (i < 0 || j < 0 || i >= WN || j >= W ? 0 : M[(j * WN + i) * 4 + 3]);
  for (let j = 0; j < W; j++) for (let i = 0; i < WN; i++) {
    const a = al(i, j);
    if (!a) continue;
    const up = 1 - j / W, top = Math.max(0, a - al(i, j - 3)) / 255, side = Math.max(0, a - Math.min(al(i - 2, j), al(i + 2, j))) / 255, o = ((W - 1 - j) * WN + i) * 4; // (rows from the bottom: a DataTexture is not turned over)
    out[o] = Math.round(255 * (j < 38 && (i % W) > 20 && (i % W) < 108 && Math.floor(i / W) === 7 ? 0.12 : clamp(0.3 + 0.75 * up, 0, 1))); // (a sign's board is dark: only its border is lit)
    out[o + 1] = Math.round(255 * clamp(Math.max(top, side * 0.55) * (0.45 + 0.65 * up), 0, 1));
    out[o + 2] = G[(j * WN + i) * 4 + 3];
    out[o + 3] = a;
  }
  const t = new THREE.DataTexture(out, WN, W, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  t.dispose = () => {}; // (shared: every fight's crowd)
  return (_crowdTex = t);
}

class BossArena {
  constructor(game, sky, row) {
    const g = (this.g = game), s = g.scene, col = new THREE.Color(g.cfg.color), K = (this.K = BOSS_SKY[row.sky] || BOSS_SKY["boss-storm"]);
    // the sky leans toward the boss's colour; a boss whose colour is the arena's own (cyan, violet: see bossArenaPair)
    // has the arena's stand-in instead, magenta: it does not stand against its own colour
    const P = g.pair, own = P && (P.a.getHex() === new THREE.Color(COLORS.magenta).getHex() || P.b.getHex() === new THREE.Color(COLORS.magenta).getHex());
    this.tint0 = new THREE.Color(0xffffff).lerp(own ? new THREE.Color(COLORS.magenta) : col, 0.26);
    this.tintRage = new THREE.Color(1.15, 0.5, 0.52);
    this.tint = this.tint0.clone();
    this.dome = makePanoSky(sky, { gain: K.gain, lift: K.lift, tint: this.tint, window: { u: K.u, v: K.v, at: 4.6, zoom: K.zoom, min: K.min } });
    this.dome.userData.arena = true; // (in the deck's reflection: BossGame.probeStep)
    s.add(this.dome);
    applySkyEnv(s, sky); // (what a loaded model's chrome mirrors; the arena's own surfaces keep the reflection map they were built with)
    // the old painted sky and its ridge stand down (the game still writes the sky's colours as it rages: harmless)
    g.sky.visible = false;
    if (g.ridge) g.ridge.visible = false;
    g.fogBase.set(K.fog).lerp(P ? P.a : col, 0.05); // (toward the arena's own light, not the boss's: the shared violet-black)
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
