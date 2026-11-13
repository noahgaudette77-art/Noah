// Risk Blaster's enemies: the player's own space frog, one for each answer. The model
// is a sculpt of 1.9 million triangles; scripts/convert-model.js cuts it down to 7,000
// (and 1,200 for weak quality levels) and bakes its texture onto the vertices.
// Look and sound only. A frog is what an answer's target looks like: the game still
// decides where targets are, which one was picked, and what that scores.
//   right answer: the frog that was shot whites out and comes apart into light
//   wrong answer: the shot glances off it, and it swings its cannon round and fires back
//   too slow:     the frog with the right answer does the firing

const FROG_S = 3.3; // game units per model unit (the frog is about one unit tall)
// Where things are on the model, in its own units (it faces +x, and carries its cannon across its body).
const FROG = {
  muzzle: [0.41, -0.17, -0.28], // the mouth of the cannon
  aim: [0.66, 0.03, -0.75], // the way the barrel points
  neck: [-0.1, 0.27, -0.04], // what the head turns about
  jets: [[-0.38, -0.05, 0.005], [-0.38, -0.05, -0.135]], // under the backpack
};
const FROG_FACE = -Math.PI / 2; // turned this far, it faces the camera
const FROG_BARREL = Math.atan2(0.75, 0.66); // and its barrel then points this far round to the side

const FrogModel = {
  _geo: null,
  ok() { return !!(window.THREE && window.INR_ASSETS && window.INR_ASSETS.frog); },
  // the frog, and a lighter one for the weakest quality levels (parts 0 and 1 of the file)
  geometry() {
    if (this._geo) return this._geo;
    const make = (p) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(p.pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(p.nor, 3));
      g.setAttribute("color", new THREE.BufferAttribute(p.col, 3));
      g.setIndex(new THREE.BufferAttribute(p.ix, 1));
      g.computeBoundingSphere();
      return g;
    };
    const parts = inrModelParts(window.INR_ASSETS.frog.mesh);
    return (this._geo = { full: make(parts[0]), low: make(parts[1] || parts[0]) });
  },
  preload() { if (this.ok()) { try { this.geometry(); } catch (e) { /* the game falls back to its crystal targets */ } } },
};

// A frog's material: its own colours, lit like the fighter (a soft fill, a rim of its
// answer's colour). The vertex shader gives the sculpt a little life (it breathes, its
// head turns, its cannon kicks); the fragment shader whites it out when it is hit,
// dissolves it, and makes the right answer glow after a miss.
function frogSkin(env, U) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.05, roughness: 0.62, envMap: env, envMapIntensity: 0.55 });
  const v3 = (a) => `vec3(${a.map((x) => x.toFixed(4)).join(", ")})`, len = Math.hypot(...FROG.aim), aim = FROG.aim.map((x) => x / len);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uFrogT; uniform float uFrogLook; uniform float uFrogKick; varying vec3 vFrogP;
        const vec3 FROG_NECK = ${v3(FROG.neck)}; const vec3 FROG_MUZZLE = ${v3(FROG.muzzle)}; const vec3 FROG_AIM = ${v3(aim)};`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        float frogHead = smoothstep(0.24, 0.34, position.y) * uFrogLook, frogC = cos(frogHead), frogS = sin(frogHead);
        objectNormal = vec3(frogC * objectNormal.x + frogS * objectNormal.z, objectNormal.y, -frogS * objectNormal.x + frogC * objectNormal.z);`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vFrogP = position;
        // it breathes: belly and chest swell
        transformed.xz *= 1.0 + 0.02 * sin(uFrogT * 2.1) * smoothstep(-0.32, -0.1, position.y) * (1.0 - smoothstep(0.12, 0.3, position.y));
        // its head turns about its neck
        vec3 frogH = transformed - FROG_NECK;
        transformed = FROG_NECK + vec3(frogC * frogH.x + frogS * frogH.z, frogH.y, -frogS * frogH.x + frogC * frogH.z);
        // its cannon (and the hands on it) kicks back along the barrel
        vec3 frogG = position - FROG_MUZZLE; float frogA = dot(frogG, FROG_AIM);
        transformed -= FROG_AIM * (0.04 * uFrogKick * (1.0 - smoothstep(0.07, 0.12, length(frogG - frogA * FROG_AIM))) * step(-0.62, frogA));`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vFrogP; uniform vec3 uFrogRim; uniform float uFrogHit; uniform float uFrogGone; uniform float uFrogHot;
        float frogH1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float frogN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(frogH1(i), frogH1(i + vec3(1.0, 0.0, 0.0)), f.x), mix(frogH1(i + vec3(0.0, 1.0, 0.0)), frogH1(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                     mix(mix(frogH1(i + vec3(0.0, 0.0, 1.0)), frogH1(i + vec3(1.0, 0.0, 1.0)), f.x), mix(frogH1(i + vec3(0.0, 1.0, 1.0)), frogH1(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float frogCut = 1.0;
        if (uFrogGone > 0.0) { // coming apart: eaten away from a noise, the edge of each hole burning in its colour
          frogCut = frogN(vFrogP * 13.0) * 0.7 + frogN(vFrogP * 31.0) * 0.3 - uFrogGone * 1.08;
          if (frogCut < 0.0) discard;
        }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float frogNV = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.3, 0.29, 0.36);
        totalEmissiveRadiance += uFrogRim * pow(1.0 - frogNV, 4.0);
        totalEmissiveRadiance += vec3(1.5, 1.42, 1.25) * uFrogHit;
        totalEmissiveRadiance += vec3(0.2, 1.2, 0.32) * uFrogHot * (0.14 + 0.86 * pow(1.0 - frogNV, 2.0));
        if (uFrogGone > 0.0) totalEmissiveRadiance += uFrogRim * (7.0 * (1.0 - smoothstep(0.0, 0.1, frogCut)));`);
  };
  m.customProgramCacheKey = () => "blaster-frog";
  return m;
}

class BlasterFrogs {
  constructor(game) {
    const g = (this.g = game), geo = (this.geo = FrogModel.geometry());
    // one material for each answer slot: a frog's state (hit, gone, hot, its head, its cannon's kick) is its slot's uniforms
    this.U = SLOT_COLORS.map((hex, i) => ({
      uFrogT: { value: i * 1.7 }, uFrogLook: { value: 0 }, uFrogKick: { value: 0 }, uFrogRim: { value: neon(hex, 0.55) },
      uFrogHit: { value: 0 }, uFrogGone: { value: 0 }, uFrogHot: { value: 0 },
    }));
    this.mats = this.U.map((u) => frogSkin(g.shipEnv || g.env, u));
    // and its plain version for the weakest quality levels: the frog's own colours, unlit (so it reads in the dark tunnel)
    this.lowMats = this.mats.map((m) => (m.userData.twin = new THREE.MeshBasicMaterial({ vertexColors: true })));
    // the jets under its backpack: two short flames (shared) and a glow of its answer's colour
    const fl = new THREE.CylinderGeometry(0.004, 0.03, 0.2, 8, 3, true);
    fl.translate(0, -0.1, 0);
    this.flameGeo = fl;
    this.flameMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "uniform float uTime; varying float vT; void main(){ vT = -position.y / 0.2; vec3 p = position; p.xz *= 1.0 + 0.25 * vT * sin(uTime * 17.0 + position.y * 40.0); p.y *= 1.0 + 0.18 * sin(uTime * 11.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
      fragmentShader: "varying float vT; void main(){ gl_FragColor = vec4(mix(vec3(2.6, 2.4, 2.2), vec3(0.35, 1.2, 2.4), smoothstep(0.0, 0.35, vT)) * pow(1.0 - vT, 1.3) * 0.6, 1.0); }",
    });
    this.glowMats = SLOT_COLORS.map((hex) => new THREE.SpriteMaterial({ map: glowTexture(), color: neon(hex, 1.5), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    // what a cannon fires: six bolts that take turns down the line, a glow at its mouth. (They come
    // almost straight at the camera, so each is a ball of light, not a beam seen end-on.)
    this.bolts = Array.from({ length: 6 }, () => { const b = glowSprite(neon(0xffa23a, 3.0), 0.5, 1); b.visible = false; b.renderOrder = 6; g.scene.add(b); return { mesh: b, t: -1, from: new THREE.Vector3(), to: new THREE.Vector3() }; });
    this.flash = glowSprite(neon(0xffb357, 2.6), 0.3, 0);
    this.flash.visible = false;
    this.att = null; // the attack under way: { t (the target), time, fired, hit }
    this.out = []; // frogs coming apart: { t, time }
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._d = new THREE.Vector3();
  }
  // One answer's frog, for the target the game is building. Nothing here draws from Math.random.
  spawn(i) {
    const g = this.g, mat = this.mats[i], u = this.U[i], cheap = GFX.ok && GFX.Q[GFX.qi].cheap;
    u.uFrogHit.value = u.uFrogGone.value = u.uFrogHot.value = u.uFrogKick.value = 0;
    const frame = new THREE.Group(), aim = new THREE.Group(), pose = new THREE.Group();
    const body = [this.geo.full, this.geo.low].map((geo) => {
      const m = new THREE.Mesh(geo, mat);
      // (weak quality levels are already on the plain twin of every metal: a new mesh must join them)
      if (cheap) { m.userData.fullMat = mat; m.material = GFX.twinOf(mat); }
      return m;
    });
    body[1].visible = false;
    const jets = FROG.jets.map((p) => { const f = new THREE.Mesh(this.flameGeo, this.flameMat); f.position.set(p[0], p[1], p[2]); f.rotation.z = -0.35; f.renderOrder = 5; return f; });
    const glow = new THREE.Sprite(this.glowMats[i]);
    glow.position.set(FROG.jets[0][0] - 0.02, FROG.jets[0][1] - 0.05, (FROG.jets[0][2] + FROG.jets[1][2]) / 2);
    glow.scale.setScalar(0.26);
    pose.add(body[0], body[1], jets[0], jets[1], glow);
    pose.scale.setScalar(FROG_S);
    pose.rotation.y = FROG_FACE;
    aim.add(pose);
    frame.add(aim);
    frame.userData.frog = { i, aim, pose, body, yaw: 0, pitch: 0, k: 0 };
    return frame;
  }
  // one of everything a frog is drawn with, for the scene's warm-up: its shaders are built while the game loads
  warm() {
    const grp = new THREE.Group();
    this.mats.forEach((m, i) => grp.add(new THREE.Mesh(this.geo.low, m), new THREE.Sprite(this.glowMats[i])));
    grp.add(new THREE.Mesh(this.flameGeo, this.flameMat));
    grp.position.z = -40;
    return grp;
  }
  frog(t) { return t && t.userData.frame && t.userData.frame.userData.frog; }
  // where a frog's cannon ends, in the world
  muzzle(f, out) { f.pose.updateWorldMatrix(true, false); return f.pose.localToWorld(out.set(FROG.muzzle[0], FROG.muzzle[1], FROG.muzzle[2])); }
  // A right answer: the frog that was shot whites out and comes apart into light.
  blast(t) {
    const f = this.frog(t);
    if (!f) return;
    this.U[f.i].uFrogHit.value = 1;
    this.out.push({ t, time: 0, s0: t.scale.x });
    Sound.sfx("frogout", clamp(t.position.x / 4, -1, 1));
  }
  // A wrong answer (or none in time): this frog shrugs the shot off, swings its cannon onto the ship and fires.
  attack(t) {
    const g = this.g, f = this.frog(t);
    if (!f || !t.visible) { g.jet.shieldLost(); return; }
    this.att = { t, time: 0, fired: 0, hit: false };
    this.U[f.i].uFrogHit.value = 0.7;
    g.shockwave(t.position.clone(), neon(COLORS.red, 2), 2.6 * t.scale.x, 0.35); // the shot glancing off
    Sound.sfx("frogfire", clamp(t.position.x / 4, -1, 1));
    if (this.flash.parent !== f.pose) f.pose.add(this.flash);
    this.flash.position.set(FROG.muzzle[0], FROG.muzzle[1], FROG.muzzle[2]).addScaledVector(this._d.set(FROG.aim[0], FROG.aim[1], FROG.aim[2]), 0.04);
  }
  // the targets are cleared: nothing of the last question's frogs is left on screen
  clear() {
    this.att = null;
    this.out.length = 0;
    this.bolts.forEach((b) => { b.t = -1; b.mesh.visible = false; });
    this.flash.visible = false;
    if (this.flash.parent) this.flash.parent.remove(this.flash);
  }
  update(dt) {
    const g = this.g, t = g.t, cheap = GFX.ok && GFX.Q[GFX.qi].cheap, quiet = REDUCED_MOTION || GFX.calm, ship = g.ship.position;
    this.flameMat.uniforms.uTime.value = t;
    const A = this.att;
    g.targets.forEach((tg) => {
      const f = this.frog(tg);
      if (!f) return;
      const u = this.U[f.i], attacking = A && A.t === tg;
      f.body[0].visible = !cheap;
      f.body[1].visible = cheap;
      u.uFrogT.value += dt;
      u.uFrogHit.value = Math.max(0, u.uFrogHit.value - dt * 4);
      u.uFrogKick.value *= Math.pow(0.0005, dt);
      u.uFrogHot.value += ((tg.userData.hot ? 0.75 + 0.25 * Math.sin(t * 5) : 0) - u.uFrogHot.value) * Math.min(1, dt * 8);
      if (cheap) { const h = u.uFrogHot.value, w = 1.05 + u.uFrogHit.value * 1.6; this.lowMats[f.i].color.setRGB(w - 0.3 * h, w + 0.7 * h, w - 0.25 * h); } // (the plain version: whiter when hit, greener when it was the right one)
      // it watches the ship: its body half-turned that way, its head the rest. To fire, it brings the barrel all the way round.
      const d = this._d.subVectors(ship, tg.position), toShip = Math.atan2(d.x, d.z), down = Math.atan2(-d.y, Math.hypot(d.x, d.z));
      f.k += ((attacking ? smoothstep(0, 0.16, A.time) * (1 - smoothstep(0.78, 1.1, A.time)) : 0) - f.k) * Math.min(1, dt * 14);
      const yaw = lerp(toShip * 0.5, toShip - FROG_BARREL, f.k), pitch = down * f.k;
      f.yaw += (yaw - f.yaw) * Math.min(1, dt * 10);
      f.pitch += (pitch - f.pitch) * Math.min(1, dt * 10);
      f.pose.rotation.y = FROG_FACE + f.yaw;
      f.aim.rotation.x = f.pitch;
      u.uFrogLook.value = (quiet ? 0 : 0.14 * Math.sin(t * 0.8 + f.i * 1.9)) + (toShip * 0.5 - f.yaw) * 0.6 * (1 - f.k);
    });
    // a frog coming apart: flung back a little, eaten away, gone
    for (let i = this.out.length - 1; i >= 0; i--) {
      const o = this.out[i], f = this.frog(o.t);
      o.time += dt;
      const k = Math.min(1, o.time / 0.42);
      if (f) {
        this.U[f.i].uFrogGone.value = k;
        f.pose.rotation.z = k * 0.5 * (f.i % 2 ? 1 : -1);
        f.pose.position.z = -k * 1.2;
        f.body.forEach((m) => { if (m.material !== this.mats[f.i]) m.visible = m.visible && k < 0.35; }); // (the plain version can't dissolve: it just goes)
      }
      o.t.scale.setScalar(o.s0 * (1 + k * 0.25));
      if (k >= 1) { o.t.visible = false; this.out.splice(i, 1); }
    }
    // an attack: a croak, six shots, each bolt running down the line to the ship
    if (A) {
      const f = this.frog(A.t), u = this.U[f.i];
      A.time += dt;
      while (A.fired < 6 && A.time >= 0.2 + A.fired * 0.075) {
        const b = this.bolts[A.fired++];
        b.t = 0;
        this.muzzle(f, b.from);
        b.to.copy(ship).add(this._a.set(rand(-0.7, 0.7), rand(-0.1, 0.5), rand(-0.6, 0.9)).multiplyScalar(g.shipScale));
        u.uFrogKick.value = 1;
      }
      // the glow at its mouth: one swell over the burst, no flicker
      const glow = smoothstep(0.14, 0.24, A.time) * (1 - smoothstep(0.62, 0.8, A.time));
      this.flash.visible = glow > 0.01;
      this.flash.material.opacity = glow;
      this.flash.scale.setScalar(0.22 + 0.1 * glow);
      if (A.time > 1.15) { this.att = null; this.flash.visible = false; }
    }
    this.bolts.forEach((b) => {
      if (b.t < 0) return;
      b.t += dt / 0.24;
      if (b.t >= 1) {
        b.t = -1;
        b.mesh.visible = false;
        g.bursts.burst(b.to, COLORS.orange, { n: quiet ? 5 : 10, speed: 3.2 * g.shipScale, size: 0.14 * g.shipScale, life: 0.35 });
        if (A && !A.hit) { A.hit = true; g.jet.shieldLost(); } // the first one home flares the ship's shield
        return;
      }
      b.mesh.position.lerpVectors(b.from, b.to, b.t);
      b.mesh.scale.setScalar((0.5 + 0.5 * b.t) * (0.45 + 0.55 * g.shipScale));
      b.mesh.visible = true;
    });
  }
  dispose() {
    this.clear();
    this.mats.concat(this.lowMats, this.glowMats, [this.flameMat, this.flash.material]).forEach((m) => m.dispose());
    this.bolts.forEach((b) => { this.g.scene.remove(b.mesh); b.mesh.material.dispose(); });
    this.flameGeo.dispose();
  }
}

if (typeof requestIdleCallback === "function") requestIdleCallback(() => FrogModel.preload(), { timeout: 6000 });
else setTimeout(() => FrogModel.preload(), 3000);
