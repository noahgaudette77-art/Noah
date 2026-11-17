// The arcade hall with its generated models, when they arrived (the page served over HTTP and the hall's set in
// hand: see showHub). Opened from disk, the hall builds its own six cabinets exactly as before.
//
// One cabinet model (prop-cabinet: gloss black, chrome trim, a stick and buttons, a coin door) stands for all six
// games, and is told apart by what is put on it: the game's own attract screen behind its glass, its name lit on the
// marquee, a neon moulding along both side panels and painted stripes in the game's colour, a line of light at its
// foot, and on its roof, on a lit turntable, a small copy of what the game is about (the starfighter, the war rig,
// the Proctor, a deck of study cards in its holder, the examiner's lectern, the great book). The cabinet in front
// comes alive: its turntable lifts and spins up and its ring burns brighter (the hall's lamp, pool and rim lights
// already follow it). At the end of the row, a stand shows the sixteen trophies as real objects: a cup, a medal or a
// coin for each, lit and turning when earned, dark until then.
// The hall's panorama (hub-hall: made-up marquee lettering, so it is never shown) is what the gloss black, the
// chrome and the floor reflect, and the light the models are lit by.
const HUBGEN = {
  S: 4.15, // the cabinet's height in the hall (each model is one unit tall)
  SX: 1.2, // and a little wider than the model: about as wide as the hall's own cabinets
  // places on the cabinet model, in its own frame (+y up, +z toward the player), measured from its geometry
  SCREEN: { y: 0.68, z: -0.012, tilt: 0.29, w: 0.244, h: 0.22 }, // the glass runs from 0.56 to 0.80 high and leans back
  MARQ: { y: 0.911, z: 0.072, tilt: 0.21, w: 0.37, h: 0.112 },
  ROOF: { y: 0.995, z: -0.085 },
  PANEL: { y: 0.505, z: 0.19, tilt: -0.5, w: 0.34, d: 0.085 },
  EDGE: [[0.02, 0.16], [0.35, 0.162], [0.4, 0.222], [0.47, 0.231], [0.5, 0.22], [0.53, 0.115], [0.56, 0.088], [0.8, 0.006], [0.83, 0.03], [0.86, 0.085], [0.89, 0.084], [0.97, 0.066]], // the side panel's front edge, [y, z]
  HALF: 0.199, // half the model's width
  // what turns on each roof: the model, its size, how high it rides over the turntable, a pitch, a turn to start from
  TOPPERS: {
    blaster: { name: "mini-starfighter", s: 1.9, y: 0.42, rx: -0.14, ry: 0.6, bob: 0.07 },
    racer: { name: "mini-warrig", s: 1.75, y: 0, ry: 0.7 },
    boss: { name: "mini-proctor", s: 1.28, y: 0, ry: 0.3 },
    // (these three sway to and fro instead of turning round, their faces to the lens: the cards, the open book on
    // the lectern and the open book on its stand, each tipped a little toward the camera)
    memory: { name: "prop-deck", s: 0.76, y: 0, ry: 0, swing: 0.75 },
    exam: { name: "prop-podium", s: 1.05, y: 0, ry: 0, rx: 0.3, swing: 0.6 },
    guide: { name: "prop-tome", s: 0.82, y: 0, ry: 0, rx: 0.34, swing: 0.6 },
  },
  // the trophy stand: where it stands in the hall (angle, radius), and how the sixteen trophies are shown on it
  STAND: { r: HUB_R + 0.25, w: 2.4 },
  TREADS: [[0.429, 0.69], [0.702, 0.13], [0.94, -0.5]], // the stand model's three steps, front to back: [height of the tread, its depth centre]
  CUPS: TROPHY_SHELF.trophy, MEDALS: TROPHY_SHELF.medal, COINS: TROPHY_SHELF.coin, // (see 09-trophies.js)
};

// The trophy stand's card on the hall's screen, as a cabinet's is (see showHub).
function hubStandStop() {
  const got = Trophies.count(), next = TROPHIES.find((t) => !Trophies.has(t.id));
  return { id: "stand", name: "TROPHY STAND", tag: `${got} of ${TROPHIES.length} earned`, color: COLORS.gold,
    desc: "Cups for the great feats, medals for the hard ones, a coin for every milestone." + (next ? ` Next: ${next.name}. ${next.how}.` : " Every one of them is yours.") };
}

// The models the hall needs, taken from Assets (null when the cabinet is not in hand: the hall then builds its own).
function hubGenTake() {
  if (!Assets.on || !window.THREE) return null;
  const cab = Assets.model("prop-cabinet");
  if (!cab) return null;
  const g = { cab, sky: Assets.sky("hub-hall"), skyB: Assets.sky("hub-hall-b"), tops: {}, cup: Assets.model("prop-trophy"), medal: Assets.model("prop-medal"), coin: Assets.model("prop-coin"), stand: Assets.model("prop-stand"), vault: Assets.model("prop-vault") };
  for (const id in HUBGEN.TOPPERS) g.tops[id] = Assets.model(HUBGEN.TOPPERS[id].name);
  return g;
}

// A model's materials as the hall's own: they mirror the hall, burn their neon, and take the rim light of the
// cabinet in front (as the hall's painted surfaces do: see hubLitMaterial).
function hubGenSkin(model, o = {}) {
  const ms = tuneModel(model, { env: o.env === undefined ? 1 : o.env, glow: o.glow === undefined ? 1.8 : o.glow });
  ms.forEach((m) => {
    if (o.rough !== undefined) m.roughness = o.rough;
    if (o.envMap) m.envMap = o.envMap; // (the trophy stand mirrors the second hall)
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, HUB_RIM);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uHubHero; uniform vec3 uHubRim;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          { vec3 hubD = -vViewPosition - uHubHero;
            float hubF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0) * smoothstep(-0.1, 0.65, dot(normal, normalize(vec3(-0.8, 0.42, -0.42))));
            totalEmissiveRadiance += uHubRim * hubF * exp(-dot(hubD, hubD) * 0.1); }
          ${o.key ? `totalEmissiveRadiance += diffuseColor.rgb * ${o.key.toFixed(2)} * max(dot(normal, normalize(vec3(-0.35, 0.7, 0.62))), 0.0); // (a key light of its own, high and to the left of the lens: it reads against the dark hall)` : ""}`);
    };
    m.customProgramCacheKey = () => "hub-gen-" + (o.key || 0);
    m.needsUpdate = true;
  });
  return ms;
}
// A dark copy of a model's materials: a trophy not yet earned stands in the stand as a shadow of itself.
function hubGenDim(model) {
  const dim = new Map();
  model.scene.traverse((n) => {
    if (!n.isMesh) return;
    const m = n.material;
    if (!dim.has(m)) {
      const d = m.clone();
      d.color = new THREE.Color(0.16, 0.13, 0.24);
      d.emissive = new THREE.Color(0, 0, 0);
      d.emissiveMap = null;
      d.envMapIntensity = 0.35;
      d.roughness = Math.max(0.45, m.roughness);
      dim.set(m, d);
    }
    n.material = dim.get(m);
  });
}

class HubGen {
  constructor(hub, gen) {
    this.hub = hub;
    this.gen = gen;
    this.tops = [];
    this.cabTop = []; // the height of each cabinet's topper, for the camera's framing
    this.t = 0;
    this.items = [];
    hubGenSkin(gen.cab, { env: 1.1, glow: 1.5 });
    for (const id in gen.tops) if (gen.tops[id]) hubGenSkin(gen.tops[id], { env: 1.5, glow: 2, key: 0.9 });
  }
  // a cabinet's frame in the hall (x across, y up, z toward the room's centre), in world units
  frame(i) {
    const a = this.hub.cabAngle(i);
    return hubM(Math.sin(a) * HUB_R, 0, -Math.cos(a) * HUB_R, 0, -a);
  }
  // Cabinet i: the model itself, and its neon, marquee and turntable added to the hall's batches. Returns where its
  // screen goes and the plane over its control panel.
  cabinet(cab, i, B, K, g, col) {
    const H = HUBGEN, S = H.S, SXS = S * H.SX, base = this.frame(i);
    const at = (x, y, z, rx = 0, ry = 0, rz = 0) => base.clone().multiply(hubM(x, y, z, rx, ry, rz));
    // the model (each cabinet a copy that shares the first one's geometry and materials)
    const tpl = this.gen.cab.scene, body = i === CABINETS.length - 1 ? tpl : tpl.clone(); // (the model itself goes last: until then it is the untouched template)
    body.position.set(0, 0, 0);
    body.quaternion.identity();
    body.scale.set(SXS, S, S);
    body.updateMatrix();
    body.applyMatrix4(base);
    this.hub.scene.add(body);
    // a neon moulding along each side panel's front edge, just behind the chrome
    const E = H.EDGE.map(([y, z]) => [z * S, y * S]);
    for (let k = 0; k < E.length - 1; k++) {
      const f = hubFace(E[k], E[k + 1], 0.5, -0.05);
      [-1, 1].forEach((sx) => K.box(B.glow, 0.035, f.len + 0.03, 0.034, at(sx * (H.HALF * SXS + 0.012), f.y, f.z, f.rx), col, { k: 2.2, g }));
    }
    // painted stripes in the game's colour across each side panel (gloss, lit by the room: livery, not neon)
    const a0 = [-0.2 * S, 0.17 * S], a1 = [0.13 * S, 0.45 * S];
    [[-0.13, 0.15, col, 0.85], [0.03, 0.06, 0xf4efff, 0.75], [0.13, 0.05, col, 0.85]].forEach(([o, w, c, kk]) => {
      const f = hubFace(a0, a1, 0.5, o);
      [-1, 1].forEach((sx) => K.box(B.lit, 0.006, f.len, w, at(sx * (H.HALF * SXS + 0.004), f.y, f.z, f.rx), c, { k: kk, aux: [0.25, 0.24] }));
    });
    // a line of light at its foot
    K.box(B.glow, H.HALF * SXS * 1.9, 0.028, 0.028, at(0, 0.045, 0.165 * S + 0.03), col, { k: 1.7, g });
    // the marquee: the game's name, lit, in the model's dark lightbox
    const M = H.MARQ, mz = M.z * S + 0.02;
    K.quad(B.marq, M.w * SXS, M.h * S, at(0, M.y * S, mz, -M.tilt), 0xffffff, { k: 1.05, g, uv: hubUV(4, i * 170 + 8, 504, 154) });
    // the turntable on its roof: a chrome disc and a ring of light in the game's colour
    const R = H.ROOF, ry = R.y * S, rz = R.z * S;
    B.lit.add(K.get("ttDisc", () => new THREE.CylinderGeometry(0.44, 0.5, 0.1, 32)), at(0, ry + 0.05, rz), 0xd2d0e4, { aux: [1, 0.18] });
    B.lit.add(K.get("ttTop", () => new THREE.CylinderGeometry(0.4, 0.4, 0.012, 32)), at(0, ry + 0.106, rz), 0x0c0816, { aux: [0.3, 0.2] });
    B.glow.add(K.get("ttRing", () => new THREE.TorusGeometry(0.47, 0.022, 5, 40)), at(0, ry + 0.07, rz, Math.PI / 2), col, { k: 2.6, g });
    // what turns on it
    const T = H.TOPPERS[cab.id], m = this.gen.tops[cab.id];
    let topH = 0.6;
    if (T && m) {
      const pivot = new THREE.Group(), obj = m.scene;
      obj.scale.setScalar(T.s);
      obj.rotation.x = T.rx || 0;
      pivot.add(obj);
      pivot.position.set(0, ry + 0.112 + (T.y || 0), rz).applyMatrix4(base);
      pivot.rotation.y = -this.hub.cabAngle(i) + (T.ry || 0);
      this.hub.scene.add(pivot);
      const box = new THREE.Box3().setFromObject(obj);
      topH = (T.y || 0) + (box.max.y - box.min.y);
      this.tops[i] = { pivot, y0: pivot.position.y, spin: T.ry || 0, base: pivot.rotation.y, swing: T.swing || 0, lift: 0, bob: T.bob || 0, ph: i * 1.3 };
    }
    this.cabTop[i] = ry + 0.112 + topH + 0.12;
    // where its screen goes, and the plane over its control panel (the screen's light falls there)
    const C = H.SCREEN, P = H.PANEL;
    return {
      screenM: at(0, C.y * S, C.z * S, -C.tilt), sw: C.w * SXS, sh: C.h * S,
      panelM: at(0, P.y * S + 0.03, P.z * S, P.tilt - Math.PI / 2).multiply(new THREE.Matrix4().makeScale(P.w * SXS, P.d * S * 1.6, 1)),
      screenY: C.y * S,
    };
  }
  // The trophy stand at the end of the row, and the sixteen trophies on it.
  stand(B, K) {
    const H = HUBGEN, gen = this.gen;
    if (!gen.cup && !gen.medal && !gen.coin) return;
    const St = Object.assign({}, H.STAND, { ang: this.hub.cabAngle(CABINETS.length) }); // (a seventh stop along the row, past the last cabinet)
    const F = hubM(Math.sin(St.ang) * St.r, 0, -Math.cos(St.ang) * St.r, 0, -St.ang);
    const at = (x, y, z, rx = 0, ry = 0, rz = 0) => F.clone().multiply(hubM(x, y, z, rx, ry, rz));
    // three steps; each is [height of its top, its depth centre]
    let tiers;
    if (gen.stand) {
      // (the model is 2.3 wide, 1 tall and 2 deep: its treads are made shallower here, its risers a little taller)
      const m = gen.stand, k = St.w / 2.3, sy = k * 1.1, sz = k * 0.72;
      hubGenSkin(m, { env: 1.1, glow: 1.9, envMap: gen.skyB && gen.skyB.env });
      m.scene.scale.set(k, sy, sz);
      m.scene.applyMatrix4(F);
      this.hub.scene.add(m.scene);
      tiers = H.TREADS.map(([y, z]) => [y * sy, z * sz]);
    } else {
      // (until the stand model is in hand: three plain gloss steps with a chrome lip and a line of light)
      tiers = [[0.34, 0.42], [0.68, 0], [1.02, -0.42]];
      tiers.forEach(([y, z], k) => {
        K.box(B.lit, St.w - k * 0.3, y, 0.42, at(0, y / 2, z), 0x0c0816, { aux: [0.3, 0.2] });
        K.box(B.lit, St.w - k * 0.3 + 0.02, 0.03, 0.03, at(0, y - 0.01, z + 0.215), 0xd2d0e4, { aux: [1, 0.18] });
        K.box(B.glow, St.w - k * 0.3, 0.02, 0.012, at(0, y - 0.06, z + 0.216), k % 2 ? 0x35efff : 0xff3ad4, { k: 2, g: HUB_G.tube });
      });
    }
    // what sits on each step: cups on the top one, medals in the middle, coins on edge at the front
    const row = (model, ids, tier, s, spread, env = 1.3) => {
      if (!model) return;
      hubGenSkin(model, { env, glow: 2.8, key: 1.1, envMap: gen.skyB && gen.skyB.env }); // (earned: bright, lit from the front, its star and rings burning; the dark copies below stay silhouettes)
      const dim = { scene: model.scene.clone(true) };
      hubGenDim(dim);
      ids.forEach((id, k) => {
        const x = (k - (ids.length - 1) / 2) * spread, [y, z] = tiers[tier];
        const lit = model.scene.clone(), dark = dim.scene.clone();
        [lit, dark].forEach((o) => {
          o.scale.setScalar(s);
          o.position.set(x, y, z).applyMatrix4(F);
          o.rotation.y = -St.ang;
          o.layers.set(1);
          o.traverse((n) => n.layers.set(1));
          this.hub.scene.add(o);
        });
        const pool = makeLightPool({ color: 0xffe2a8, radius: s * 0.9, intensity: 0.7 });
        pool.position.set(x, y + 0.012, z).applyMatrix4(F);
        pool.layers.set(1);
        this.hub.scene.add(pool);
        this.items.push({ id, lit, dark, pool, ry: -St.ang, ph: k * 0.9 + tier });
      });
    };
    row(gen.cup, H.CUPS, 2, 0.64, 0.7, 3.0); // (chrome cups: they need the hall in them to read)
    row(gen.medal, H.MEDALS, 1, 0.48, 0.44);
    row(gen.coin, H.COINS, 0, 0.27, 0.27);
    this.refresh();
  }
  // A round vault door in its frame (prop-vault), standing in the bay beside Memory Bank's cabinet where the hall's own
  // ticket printer stood (that was simple boxes: it is not built in the generated hall).
  vaultProp() {
    const m = this.gen.vault;
    if (!m) return;
    const a = this.hub.cabAngle(CABINETS.findIndex((c) => c.id === "memory")) + 0.208, R = 13.3, s = 2.9;
    hubGenSkin(m, { env: 1.3, glow: 2.2, key: 0.6 });
    m.scene.scale.setScalar(s);
    m.scene.position.set(Math.sin(a) * R, 0, -Math.cos(a) * R);
    m.scene.rotation.y = -a;
    this.hub.scene.add(m.scene);
  }
  // Where the little lamp on what stands in front goes (the hall's desk lamp, which a generated cabinet has no use
  // for): over and in front of the topper, or over the middle of the trophy stand.
  lampFor(i, out) {
    const a = this.hub.cabAngle(i), fx = -Math.sin(a), fz = Math.cos(a);
    const tp = this.tops[i];
    if (tp) return out.set(tp.pivot.position.x + fx * 1.15, tp.pivot.position.y + 1.0, tp.pivot.position.z + fz * 1.15);
    if (i === CABINETS.length && this.items.length) { const r = HUBGEN.STAND.r - 1.4; return out.set(Math.sin(a) * r, 2.5, -Math.cos(a) * r); }
    return null;
  }
  // which trophies are lit (on arrival, and whenever the player comes back to the hall)
  refresh() {
    this.items.forEach((it) => {
      const on = Trophies.has(it.id);
      it.lit.visible = on;
      it.dark.visible = !on;
      it.pool.visible = on;
    });
  }
  update(dt) {
    const hub = this.hub, t = (this.t += dt), calm = REDUCED_MOTION || GFX.calm;
    this.tops.forEach((tp, i) => {
      if (!tp) return;
      const c = hub.cabs[i], f = c ? c.focus : 0;
      // the one in front lifts and spins up; the others turn slowly where they stand
      const spin = (calm ? 0.12 : 0.3) + f * (calm ? 0.3 : 1.25) + (c && c.chosen ? (calm ? 0.6 : 4) * c.chosen : 0);
      tp.spin += spin * dt * (tp.swing ? 0.55 : 1);
      tp.lift += ((calm ? 0.08 : 0.24) * f - tp.lift) * Math.min(1, dt * 4);
      tp.pivot.rotation.y = tp.swing ? tp.base + Math.sin(tp.spin) * tp.swing : tp.spin;
      tp.pivot.position.y = tp.y0 + tp.lift + (calm ? 0 : tp.bob * Math.sin(t * 1.6 + tp.ph));
    });
    this.items.forEach((it) => {
      if (!it.lit.visible) return;
      it.lit.rotation.y = it.ry + (calm ? 0 : Math.sin(t * 0.5 + it.ph) * 0.6);
      it.pool.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.3 + it.ph);
    });
  }
}
