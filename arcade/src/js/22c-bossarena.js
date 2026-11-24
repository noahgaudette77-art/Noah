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
// (no UVs): up a pillar, across a panel; its plates and tiles in each face's own frame (below). What it reflects is
// the arena itself, drawn once (BossGame.probeTaken; until then, env). tint (a Vector4, Phase 5): what it reflects
// turned toward the colour in xyz by w, each pixel's brightness kept (the capture is the arena calm: as the boss rages,
// the steel gives back red neon, as the deck does: BossGame.probeTint).
// (Phase 2's polish, 2026-11-24: an art review found the pillars and the stands' faces still read as untextured boxes,
// each face one flat violet tone with neon strips on it. Each face now has a frame of its own (aFace: arenaFaceFrames)
// and the steel is worked in it: a pillar's sides in plates up it, their seams grooves whose lips catch the light, the
// octagon's corners and each piece's top and bottom bevelled and worn bright; a stand's face in tiles, two across a bay
// and three up, the same; each plate its own shade, the paint mottled, grime gathered at the foot of each and streaked
// down its face; and the neon's light on the steel beside it (pair: the arena's two colours, red as the boss rages:
// userData.uSpillRage), from a pillar's strips and the rings under its collars, a tier's rail and the line under it, and
// the footlights along the foot of the stands. No new draw, no texture: what is worked out a pixel, in the one draw.)
function arenaSteelMaterial(env, tint, pair) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 1, envMap: env || null, envMapIntensity: 1 });
  m.extensions = { derivatives: true };
  m.userData.tBrush = { value: cellFlatTexture() };
  m.userData.uEnvTint = { value: tint || new THREE.Vector4(1, 1, 1, 0) };
  m.userData.uSpillA = { value: new THREE.Color(pair ? pair.a : 0) };
  m.userData.uSpillB = { value: new THREE.Color(pair ? pair.b : 0) };
  m.userData.uSpillRage = { value: 0 };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tBrush = m.userData.tBrush;
    sh.uniforms.uEnvTint = m.userData.uEnvTint;
    sh.uniforms.uSpillA = m.userData.uSpillA; sh.uniforms.uSpillB = m.userData.uSpillB; sh.uniforms.uSpillRage = m.userData.uSpillRage;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aMetal; attribute float aRough; attribute float aKind; attribute vec4 aFace; varying vec3 vSurf; varying vec3 vWP; varying vec3 vWN; varying vec4 vFace;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n  vSurf = vec3(aMetal, aRough, aKind); vFace = aFace;")
      .replace("#include <project_vertex>", "#include <project_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vSurf; varying vec3 vWP; varying vec3 vWN; varying vec4 vFace; uniform sampler2D tBrush; uniform vec4 uEnvTint; uniform vec3 uSpillA; uniform vec3 uSpillB; uniform float uSpillRage;
        float aHash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
        float aNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(aHash(i), aHash(i + vec2(1.0, 0.0)), f.x), mix(aHash(i + vec2(0.0, 1.0)), aHash(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace("#include <lights_fragment_maps>", `#include <lights_fragment_maps>
        #if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
          radiance = mix(radiance, uEnvTint.xyz * max(max(radiance.r, radiance.g), radiance.b), uEnvTint.w);
          #if defined( RE_IndirectDiffuse ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
            iblIrradiance = mix(iblIrradiance, uEnvTint.xyz * max(max(iblIrradiance.r, iblIrradiance.g), iblIrradiance.b), uEnvTint.w);
          #endif
        #endif`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        vec3 sN = normalize(vWN), sT = normalize(vec3(-sN.z, 0.0, sN.x) + vec3(1e-4, 0.0, 0.0)), sU = cross(sT, sN);
        float sAlong = dot(vWP, sT), sFlat = step(0.6, abs(sN.y));
        float kPanel = step(0.5, vSurf.z) * (1.0 - step(1.5, vSurf.z)), kCloth = step(1.5, vSurf.z), kSteel = 1.0 - kPanel - kCloth;
        vec2 sUv = mix(mix(vec2(vWP.y, sAlong), vec2(sAlong, vWP.y), kPanel), vWP.xz, sFlat); // (the streaks run along the texture's x)
        vec3 brush = texture2D(tBrush, sUv * vec2(0.35, 1.4)).rgb;
        float runs = texture2D(tBrush, vec2(vWP.y * 0.07, sAlong * 0.9)).b; // (the same streaks stood on end: what runs down a face)
        // its face's frame: fT across it and fS up it from its middle, fW and fH half its width and height (none on a
        // face that looks up or down, nor on cloth)
        float fT = vFace.x, fS = vFace.z, fW = max(vFace.y, 1e-3), fH = max(vFace.w, 1e-3), onF = step(0.01, vFace.y) * (1.0 - kCloth);
        // its plates: a pillar's sides in bands 1.5 m tall up it (their seams meet its collars), a stand's face in tiles,
        // two across a bay and three up. dE: how far the plate's nearest side and its nearest top or bottom are; px: a
        // pixel, in metres (the derivatives taken here, before any branch)
        float cols = max(1.0, floor(fW / 0.62 + 0.5));
        vec2 q = vec2((fT / fW + 1.0) * 0.5 * cols, mix((vWP.y - 0.62) / 1.5, (fS / fH + 1.0) * 1.5, kPanel));
        vec2 qi = floor(q), qf = q - qi, tile = vec2(2.0 * fW / cols, mix(1.5, fH * 2.0 / 3.0, kPanel));
        vec2 dE = min(qf, 1.0 - qf) * tile, px = fwidth(q) * tile + 1e-4;
        float sw = fwidth(q.y * 6.0) + 1e-4;
        vec3 aBend = vec3(0.0), aGlow = vec3(0.0), tintF = vec3(1.0);
        float seam = 0.0, wear = 0.0, grime = 0.0, streak = 0.0, slot = 0.0, shade = 1.0;
        if (onF > 0.5) { // (only a face worked: each kind of surface in a run of its own pixels, so each pays for its own)
          vec3 fC = vWP - sT * fT - sU * fS; // (its middle: the same over all of it)
          float tall = max(kPanel, kSteel * step(2.0, fH)); // (grooved: the stands' tiles, and a pillar's shaft between its plates)
          float gY = tall * (1.0 - smoothstep(0.012, 0.012 + px.y, dE.y)), gX = kPanel * (1.0 - smoothstep(0.012, 0.012 + px.x, dE.x));
          seam = max(gX, gY);
          float lipY = tall * (1.0 - smoothstep(0.012, 0.055 + px.y, dE.y)) * (1.0 - gY), lipX = kPanel * (1.0 - smoothstep(0.012, 0.055 + px.x, dE.x)) * (1.0 - gX);
          // a pillar's corners and each of its pieces' tops and bottoms bevelled (a shaft's are under its collars)
          float bvX = kSteel * (1.0 - smoothstep(0.0, 0.035 + px.x, fW - abs(fT))), bvY = kSteel * (1.0 - tall) * (1.0 - smoothstep(0.0, 0.03 + px.y, fH - abs(fS)));
          // (the surface turns over its edges and into its seams: the light catches the lips; and each plate is pressed a
          // little full, so what it reflects sweeps across it instead of one flat tone)
          vec2 bow = (qf - 0.5) * 2.0 * mix(vec2(0.24, 0.12), vec2(0.2, 0.2), kPanel);
          aBend = (sT * (sign(fT) * bvX + sign(qf.x - 0.5) * lipX) + sU * (sign(fS) * bvY + sign(qf.y - 0.5) * lipY)) * 0.7 + sT * bow.x + sU * bow.y;
          wear = max(bvX, bvY) + 0.6 * max(lipX, lipY);
          // each plate its own shade, the paint and the metal mottled, grime gathered at the foot of each (a pillar's from
          // the deck up, a tier's along its foot) and streaked down its face
          float mot = aNoise(vec2(sAlong, vWP.y) * 1.25 + 3.7), plate = aHash(fC.xz * 1.37 + fC.y * 0.73 + qi * vec2(3.1, 5.7));
          grime = 1.0 - smoothstep(0.05, mix(1.6, 1.0, kPanel), mix(vWP.y, fS + fH, kPanel) + 0.5 * (mot - 0.5));
          streak = smoothstep(0.5, 0.78, runs) * 0.8;
          tintF = mix(vec3(1.07, 0.95, 0.98), vec3(0.93, 1.0, 1.08), mot);
          vec3 cA = mix(uSpillA, vec3(1.0, 0.14, 0.24) * max(max(uSpillA.r, uSpillA.g), uSpillA.b), uSpillRage);
          vec3 cB = mix(uSpillB, vec3(1.0, 0.14, 0.24) * max(max(uSpillB.r, uSpillB.g), uSpillB.b), uSpillRage);
          float yy = vWP.y;
          if (kPanel > 0.5) {
            // a stand's tiles: one in five a vent (its slats dark, their lips lit), one in seven a small light let into it
            float pick = aHash(fC.xz * 0.71 + qi * vec2(7.3, 1.9) + 4.1);
            vec2 inset = dE - vec2(0.14, 0.12);
            float slats = fract(qf.y * 6.0);
            float vent = step(0.0, min(inset.x, inset.y)) * step(0.8, pick) * (1.0 - smoothstep(0.35, 0.6, sw)); // (gone where its slats are finer than a pixel)
            slot = vent * (1.0 - smoothstep(0.45, 0.45 + sw, slats));
            aBend += sU * vent * (smoothstep(0.45, 0.6, slats) - 0.5) * 0.8;
            float lamp = step(pick, 0.14) * step(0.3, dE.x) * (1.0 - smoothstep(0.0, 0.025 + px.y, abs(qf.y * tile.y - 0.2)));
            // the light on it: its tier's rail along its top (the lead colour) and the line under it (the second); the
            // footlights along the foot of the stands
            float top = fH - fS, fl = step(25.5, length(vWP.xz)) * exp(-max(yy, 0.0) * 2.4);
            aGlow = cA * 0.16 * exp(-top * 2.6) + cB * (0.13 * exp(-abs(top - 0.38) * 10.0) + 0.12 * fl) + mix(cA, cB, step(0.07, pick)) * lamp * 0.7;
          } else if (fH > 3.0 && fW < 0.3) {
            // a pillar's shaft: the light of its lines up its face toward the ring (the lead colour) and up each face
            // beside it (the second), of the rings under its collars and round its foot
            float toward = dot(sN.xz, -normalize(fC.xz + vec2(1e-4)));
            float sec = smoothstep(0.95, 1.1, yy) * (1.0 - smoothstep(3.32, 3.47, yy)) + smoothstep(3.79, 3.94, yy) * (1.0 - smoothstep(6.32, 6.47, yy)) + smoothstep(6.79, 6.94, yy) * (1.0 - smoothstep(9.2, 9.35, yy));
            float pA = sec * step(0.92, toward) * exp(-abs(abs(fT) - 0.17) * 26.0), pB = sec * step(0.55, toward) * (1.0 - step(0.92, toward)) * exp(-abs(fT) * 26.0);
            aGlow = cA * (0.3 * pA + 0.22 * exp(-abs(yy - 0.86) * 7.0)) + cB * (0.26 * pB + 0.22 * (exp(-abs(yy - 3.45) * 7.0) + exp(-abs(yy - 6.45) * 7.0)));
          }
          shade = mix(0.76, 1.24, plate) * mix(0.8, 1.2, mot) * (1.0 - 0.55 * grime) * (1.0 - 0.45 * streak) * (1.0 + 1.1 * wear) * (1.0 - 0.8 * slot);
        }
        float fold = 0.82 + 0.18 * sin(sAlong * 21.0 + vWP.y * 1.3);
        diffuseColor.rgb *= mix(0.9 + 0.2 * brush.b, fold, kCloth) * shade * (1.0 - 0.75 * seam) * tintF;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = clamp(vSurf.y * mix(mix(0.72, 1.32, brush.b), 1.0, kCloth) * (1.0 - 0.45 * wear) + 0.35 * max(seam, slot) + 0.3 * grime + 0.2 * streak, 0.04, 1.0);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n  metalnessFactor = vSurf.x * (1.0 - 0.6 * seam) * (1.0 - 0.35 * grime);")
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n  normal = normalize(normal + mat3(viewMatrix) * aBend);")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += aGlow;");
  };
  m.customProgramCacheKey = () => "arena-steel-3";
  return m;
}
// Each face of the arena's steel in a frame of its own (arenaSteelMaterial reads it, attribute aFace): where each
// corner is across its face and up it from the face's middle, and half the face's width and height (t, w, s, h; all
// naught on a face that looks up or down). A face is a run of triangles one after another that look the same way (a
// box's side is two, a shaft's side two, a banner three); across is level, up is up the face. Made once, with the
// arena: its geometry as RacerBatch built it (one triangle after another, each corner its triangle's normal).
function arenaFaceFrames(g) {
  const P = g.attributes.position.array, N = g.attributes.normal.array, nt = P.length / 9, F = new Float32Array((P.length / 3) * 4);
  for (let i = 0; i < nt; ) {
    const o = i * 9, nx = N[o], ny = N[o + 1], nz = N[o + 2];
    let j = i + 1;
    while (j < nt && Math.abs(N[j * 9] - nx) + Math.abs(N[j * 9 + 1] - ny) + Math.abs(N[j * 9 + 2] - nz) < 1e-3) j++;
    if (Math.abs(ny) < 0.6) {
      const l = Math.hypot(nx, nz) || 1, tx = -nz / l, tz = nx / l, ux = -tz * ny, uy = tz * nx - tx * nz, uz = tx * ny; // (across: level; up: across x normal)
      const A = (v) => P[v * 3] * tx + P[v * 3 + 2] * tz, B = (v) => P[v * 3] * ux + P[v * 3 + 1] * uy + P[v * 3 + 2] * uz;
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (let v = i * 3; v < j * 3; v++) { const a = A(v), b = B(v); a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
      for (let v = i * 3; v < j * 3; v++) { F[v * 4] = A(v) - (a0 + a1) / 2; F[v * 4 + 1] = (a1 - a0) / 2; F[v * 4 + 2] = B(v) - (b0 + b1) / 2; F[v * 4 + 3] = (b1 - b0) / 2; }
    }
    i = j;
  }
  g.setAttribute("aFace", new THREE.Float32BufferAttribute(F, 4));
  return g;
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
// The crowd's figures (lit figures, where they were black cut-outs): people in a strip, one picture a card, made once
// for the page (a DataTexture: each channel is read for itself). Red: which way a part of a figure faces, across it (0
// its left, 1 its right, a half straight out: its outline blurred and its slope taken, so a head, a body and an arm are
// round; Phase 2's polish, where red was how much light it took, and the review found flat cards: the shader lights
// each figure from the side its lamps are on and from above, BossGame.makeCrowd); green: its rim, along its top and
// upper sides, where the light behind it catches its edge; blue: what glows of its own (a light stick, a phone, a badge,
// a sign's lit face); alpha: the figure. Heads and shoulders, arms up, a cap, a pair close together, a hood, a light
// stick, a bun; five signs, each board its own (lit letters and marks: GO!, a heart, a star, ZAP, 1UP); filming with a
// phone, a scarf held up, a beanie, a band of lights round the head. Each is there twice (Phase 5): as it stands (cells 0
// to N-1), and cheering (N on: fists up, hands clapped over its head, its phone held up high, the pair's outer arms up,
// its light stick swung across, its sign waved, its scarf stretched higher), its head and body where they were, so the
// crowd's shader can show either in its place. Side by side, not one row over the other: a figure's smaller copies
// never take in the feet of the one above it.
let _crowdTex = null;
const BOSS_CROWD_N = 16;
// which figure each of the crowd is, from one draw of the randomness as it always was: the people three times as often
// as each sign (about one in eight holds a sign, as before)
const BOSS_CROWD_PICK = [0, 1, 2, 3, 4, 5, 6, 12, 13, 14, 15].flatMap((k) => [k, k, k]).concat([7, 8, 9, 10, 11]);
function bossCrowdTexture() {
  if (_crowdTex) return _crowdTex;
  const W = 128, N = BOSS_CROWD_N, WN = W * N * 2, cv = document.createElement("canvas"), ac = document.createElement("canvas"), dc = document.createElement("canvas");
  cv.width = ac.width = dc.width = WN; cv.height = ac.height = dc.height = W;
  const x = cv.getContext("2d"), y = ac.getContext("2d"), z = dc.getContext("2d"); // (z: a sign's board, flat: it faces straight out)
  x.fillStyle = x.strokeStyle = y.fillStyle = y.strokeStyle = z.fillStyle = "#fff";
  const head = (c, hx, hy, r) => { c.beginPath(); c.arc(hx, hy, r, 0, Math.PI * 2); c.fill(); };
  const body = (c, bx, w, top) => { c.beginPath(); c.moveTo(bx - w, W); c.quadraticCurveTo(bx - w, top + 4, bx - w * 0.55, top); c.lineTo(bx + w * 0.55, top); c.quadraticCurveTo(bx + w, top + 4, bx + w, W); c.closePath(); c.fill(); };
  const limb = (c, ax, ay, bx, by, wd) => { c.lineWidth = wd; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); };
  const speck = (px, py, w = 7, h = 7) => y.fillRect(px - w / 2, py - h / 2, w, h); // (a badge, a phone's light: glows of its own)
  // the boards' faces: lit letters (a pixel font, three by five, each of its pixels four by four) and marks
  const FONT = { G: "111100101101111", O: "111101101101111", "!": "010010010000010", Z: "111001010100111", A: "010101111101101", P: "110101110100100", U: "101101101101111", 1: "010110010010111" };
  const word = (c, w) => { let gx = -(w.length * 16 - 4) / 2; for (const ch of w) { const b = FONT[ch]; for (let r = 0; r < 15; r++) if (b[r] === "1") c.fillRect(gx + (r % 3) * 4, -10 + Math.floor(r / 3) * 4, 4, 4); gx += 16; } };
  const heart = (c) => { c.beginPath(); c.moveTo(0, 10); c.bezierCurveTo(-17, -1, -11, -15, 0, -6); c.bezierCurveTo(11, -15, 17, -1, 0, 10); c.fill(); };
  const star = (c) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 5.5 : 12.5; c[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r + 1); } c.closePath(); c.fill(); };
  const FACES = ["GO!", heart, star, "ZAP", "1UP"];
  const sign = (cx, cy, turn, face) => { // (its board, its face lit a little, its border and its letters lit, and where it is: turned about its middle)
    const lit = () => { y.globalAlpha = 0.07; y.fillRect(-40, -13, 80, 26); y.globalAlpha = 1; y.lineWidth = 4; y.strokeRect(-40, -13, 80, 26); if (typeof face === "string") word(y, face); else face(y); };
    for (const [c, f] of [[x, () => x.fillRect(-42, -15, 84, 30)], [y, lit], [z, () => z.fillRect(-44, -17, 88, 34)]]) { c.save(); c.translate(cx, cy); c.rotate(turn); f(); c.restore(); }
  };
  for (let f = 0; f < 2; f++) for (let k = 0; k < N; k++) {
    const cx = (f * N + k) * W + W / 2, up = f === 1;
    if (k === 3) { // a pair (the one on the left with a badge)
      body(x, cx - 21, 22, 70); head(x, cx - 21, 50, 15); body(x, cx + 22, 20, 74); head(x, cx + 22, 55, 14); speck(cx - 27, 92, 6, 6);
      if (up) { limb(x, cx - 36, 80, cx - 48, 30, 9); limb(x, cx + 36, 84, cx + 47, 34, 9); } // (each throws its outer arm up)
      continue;
    }
    body(x, cx, k === 6 ? 30 : 34, 66); head(x, cx, 44, k === 6 ? 16 : 18); x.fillRect(cx - 7, 52, 14, 16);
    if (k === 0) { speck(cx - 13, 86); if (up) { limb(x, cx - 26, 74, cx - 40, 24, 11); limb(x, cx + 26, 74, cx + 40, 24, 11); } } // a badge (both fists up)
    if (k === 1) { if (up) { for (const s of [-1, 1]) { limb(x, cx + s * 26, 74, cx + s * 36, 38, 10); limb(x, cx + s * 36, 38, cx + s * 6, 6, 9); } speck(cx, 7, 8, 6); } else { limb(x, cx - 26, 74, cx - 38, 22, 11); limb(x, cx + 26, 74, cx + 36, 18, 11); speck(cx - 37, 24, 7, 5); speck(cx + 35, 20, 7, 5); } } // both arms up, bands lit at its wrists (clapping over its head, elbows out)
    if (k === 2) { // a cap; a phone lit at the chest (held up high to film it)
      x.beginPath(); x.ellipse(cx, 32, 22, 9, 0, Math.PI, 0); x.fill(); x.fillRect(cx - 4, 30, 32, 5);
      if (up) { limb(x, cx - 26, 74, cx - 36, 24, 11); x.fillRect(cx - 43, 3, 14, 20); y.fillRect(cx - 41, 5, 10, 16); } else y.fillRect(cx - 12, 82, 11, 15);
    }
    if (k === 4) { x.beginPath(); x.moveTo(cx - 23, 54); x.quadraticCurveTo(cx - 22, 20, cx + 3, 13); x.quadraticCurveTo(cx + 23, 22, cx + 23, 54); x.closePath(); x.fill(); speck(cx + 12, 88); if (up) { limb(x, cx - 24, 74, cx - 35, 27, 11); limb(x, cx + 24, 74, cx + 35, 27, 11); } } // a hood, a badge (fists up)
    if (k === 5) { // one arm up, a light stick in it (swung across, the other arm up too)
      if (up) { limb(x, cx + 26, 74, cx + 16, 26, 11); limb(x, cx + 14, 28, cx - 4, 5, 5); limb(y, cx + 10, 22, cx - 4, 5, 5); limb(x, cx - 26, 74, cx - 38, 30, 11); }
      else { limb(x, cx + 26, 74, cx + 34, 28, 11); limb(x, cx + 34, 30, cx + 41, 3, 5); limb(y, cx + 35, 24, cx + 41, 3, 5); }
    }
    if (k === 6) { head(x, cx + 3, 23, 9); y.fillRect(cx + 5, 84, 9, 13); if (up) { limb(x, cx - 23, 76, cx - 35, 28, 10); limb(x, cx + 23, 76, cx + 35, 28, 10); } } // a bun, a phone lit at the chest (both arms up)
    if (k >= 7 && k <= 11) { // a sign held up, its face lit (waved: tipped, and over to one side)
      if (up) { limb(x, cx - 26, 74, cx - 28, 32, 10); limb(x, cx + 26, 74, cx + 32, 40, 10); sign(cx + 4, 21, 0.14, FACES[k - 7]); }
      else { limb(x, cx - 26, 74, cx - 31, 34, 10); limb(x, cx + 26, 74, cx + 31, 34, 10); sign(cx, 21, 0, FACES[k - 7]); }
    }
    if (k === 12) { // filming: a phone held up in both hands, its torch lit (held up high in one)
      if (up) { limb(x, cx + 26, 74, cx + 33, 22, 11); x.fillRect(cx + 25, 2, 15, 22); speck(cx + 32, 8, 6, 6); }
      else { limb(x, cx - 26, 74, cx - 9, 50, 11); limb(x, cx + 26, 74, cx + 9, 50, 11); x.fillRect(cx - 9, 30, 18, 24); speck(cx + 4, 35, 6, 6); }
    }
    if (k === 13) { // a scarf held up between its hands, its stripes lit (stretched higher)
      const sy = up ? 12 : 26, sx = up ? 40 : 34;
      limb(x, cx - 26, 74, cx - sx, sy + 6, 10); limb(x, cx + 26, 74, cx + sx, sy + 6, 10);
      x.fillRect(cx - sx - 2, sy - 5, sx * 2 + 4, 11); for (let i = 0; i < 4; i++) y.fillRect(cx - sx + 4 + i * (sx / 2), sy - 3, sx / 4, 7);
    }
    if (k === 14) { // a beanie, a badge (one fist up)
      x.beginPath(); x.arc(cx, 40, 19, Math.PI, 0); x.fill(); head(x, cx, 19, 6); speck(cx + 12, 86);
      if (up) limb(x, cx + 26, 74, cx + 38, 20, 11);
    }
    if (k === 15) { y.fillRect(cx - 17, 35, 34, 5); if (up) { limb(x, cx - 26, 74, cx - 44, 30, 11); limb(x, cx + 26, 74, cx + 44, 30, 11); } } // a band of lights round its head (both arms up, wide)
  }
  const M = x.getImageData(0, 0, WN, W).data, G = y.getImageData(0, 0, WN, W).data, D = z.getImageData(0, 0, WN, W).data, out = new Uint8Array(WN * W * 4);
  const al = (i, j) => (i < 0 || j < 0 || i >= WN || j >= W ? 0 : M[(j * WN + i) * 4 + 3]);
  // which way each part faces across it: the outline blurred along each row (nine wide), its slope taken
  const R = 4, Bl = new Float32Array(WN * W);
  for (let j = 0; j < W; j++) { let acc = 0; for (let i = -R; i < WN + R; i++) { acc += al(i + R, j) - al(i - R - 1, j); if (i >= 0 && i < WN) Bl[j * WN + i] = acc / (255 * (2 * R + 1)); } }
  const bl = (i, j) => (i < 0 || i >= WN ? 0 : Bl[j * WN + i]);
  for (let j = 0; j < W; j++) for (let i = 0; i < WN; i++) {
    const a = al(i, j), o = ((W - 1 - j) * WN + i) * 4; // (rows from the bottom: a DataTexture is not turned over)
    out[o] = 128; // (straight out where it is not: so its smaller copies lean no way at its edge)
    if (!a) continue;
    const up = 1 - j / W, top = Math.max(0, a - al(i, j - 3)) / 255, side = Math.max(0, a - Math.min(al(i - 2, j), al(i + 2, j))) / 255;
    const nx = D[(j * WN + i) * 4 + 3] > 127 ? 0 : clamp((bl(i - 3, j) - bl(i + 3, j)) * 1.7, -1, 1); // (a sign's board is flat)
    out[o] = Math.round(127.5 + 127.5 * nx);
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
    this.flash = 0; // (a stroke now, as strong as it is seen: the deck's reflection takes it too, BossGame.update)
  }
  // a stroke of lightning now (the boss lands, rages, dies)
  strike(k = 1) { this.boltK = Math.max(this.boltK, k); this.boltT = rand(3.5, 7.5); this.storm.position.x = rand(-9, 9); }
  update(d) {
    const g = this.g, quiet = REDUCED_MOTION || GFX.calm, rk = g.rageK || 0;
    this.dome.userData.follow(g.camera);
    if ((this.boltT -= d) <= 0) this.strike(rand(0.55, 1));
    this.boltK *= Math.pow(0.012, d); // (gone in half a second)
    const b = (this.flash = this.boltK * (quiet ? 0.25 : 1));
    this.tint.copy(this.tint0).lerp(this.tintRage, rk * 0.55);
    this.dome.userData.set({ gain: this.gain * (1 + 0.85 * b + 0.12 * rk), tint: this.tint });
    this.storm.intensity = 1.6 * b;
  }
  dispose() { this.dome.material.dispose(); this.dome.geometry.dispose(); }
}
