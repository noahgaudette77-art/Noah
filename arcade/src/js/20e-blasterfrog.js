// Risk Blaster's enemy: the player's own space frog. One big one, down the tunnel ahead
// of the fighter. The model is a sculpt of 1.9 million triangles; scripts/convert-model.js
// cuts it down to 20,000 (and 3,000 for weak quality levels) with its own texture.
// Look and sound only. The game still asks, times, checks and scores; the frog shows it:
//   while the clock runs it comes closer
//   right answer: the fighter opens fire and the frog is hit and knocked back
//   wrong answer, or none in time: the frog swings its cannon round and fires
//   wave cleared: it comes apart into light, and the next wave's frog flies up

// Where things are on the model, in its own units (about one unit tall; it faces +x and
// carries its cannon across its body).
const FROG = {
  height: 0.98, width: 0.8,
  muzzle: [0.365, -0.181, -0.315], // the mouth of the cannon
  aim: [0.542, -0.033, -0.84], // the way the barrel points
  neck: [-0.1, 0.27, -0.04], // what the head turns about
  eyes: [[0.004, 0.43, -0.119], [0.004, 0.43, 0.027]],
  jets: [[-0.38, -0.05, 0.005], [-0.38, -0.05, -0.135]], // under the backpack
  chest: [0.2, 0.02, -0.03], // where the fighter's fire lands
  pack: [-0.37, 0.14, -0.06], // where it smokes from once it has taken a few hits
};
const FROG_FACE = -Math.PI / 2; // turned this far, it faces the camera
const FROG_BARREL = Math.atan2(0.84, 0.542); // and its barrel then points this far round to the side
const FROG_FAR = 22, FROG_NEAR = 14; // how far down the tunnel it waits, and how close it has come when the time is up

const FrogModel = {
  _geo: null, _tex: null,
  ok() { return !!(window.THREE && window.INR_ASSETS && window.INR_ASSETS.frog); },
  // the frog, and a lighter one for the weakest quality levels (parts 0 and 1 of the file)
  geometry() {
    if (this._geo) return this._geo;
    const make = (p) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(p.pos, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(p.nor, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(p.uv, 2));
      g.setIndex(new THREE.BufferAttribute(p.ix, 1));
      g.computeBoundingSphere();
      return g;
    };
    const parts = inrModelParts(window.INR_ASSETS.frog.mesh);
    return (this._geo = { full: make(parts[0]), low: make(parts[1] || parts[0]) });
  },
  texture() { return this._tex || (this._tex = inrModelTexture(window.INR_ASSETS.frog.albedo)); },
  // decode ahead of time, so opening the game never waits on it
  preload() { if (this.ok()) { try { this.geometry(); this.texture(); } catch (e) { /* the game falls back to its crystal targets */ } } },
};

// The frog's material. The model has one colour texture and nothing else, so the rest is
// read out of it: copper and leather (redder than they are green) take a sheen, its own
// skin (greener than it is red) is wet, the suit is cloth; what is brighter stands a
// little proud. The vertex shader gives the sculpt some life (it breathes, its throat
// works, its head turns, its cannon kicks); the fragment shader lights its edges in the
// wave's colour, whites it out when it is hit, scorches it, and eats it away when it dies.
function frogSkin(env, U) {
  const m = new THREE.MeshStandardMaterial({ map: FrogModel.texture(), metalness: 1, roughness: 1, envMap: env, envMapIntensity: 0.7 });
  const v3 = (a) => `vec3(${a.map((x) => x.toFixed(4)).join(", ")})`, len = Math.hypot(...FROG.aim), aim = FROG.aim.map((x) => x / len);
  m.extensions = { derivatives: true };
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
        transformed.xz *= 1.0 + 0.018 * sin(uFrogT * 2.1) * smoothstep(-0.32, -0.1, position.y) * (1.0 - smoothstep(0.12, 0.3, position.y));
        // its throat works, as a frog's does
        transformed += normal * (0.011 * (0.5 + 0.5 * sin(uFrogT * 3.3)) * smoothstep(0.0, 0.05, position.x) * smoothstep(0.3, 0.325, position.y) * (1.0 - smoothstep(0.345, 0.375, position.y)));
        // its head turns about its neck
        vec3 frogH = transformed - FROG_NECK;
        transformed = FROG_NECK + vec3(frogC * frogH.x + frogS * frogH.z, frogH.y, -frogS * frogH.x + frogC * frogH.z);
        // its cannon (and the hands on it) kicks back along the barrel
        vec3 frogG = position - FROG_MUZZLE; float frogA = dot(frogG, FROG_AIM);
        transformed -= FROG_AIM * (0.045 * uFrogKick * (1.0 - smoothstep(0.1, 0.16, length(frogG - frogA * FROG_AIM))) * step(-0.62, frogA));`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vFrogP; uniform vec3 uFrogRim; uniform float uFrogHit; uniform float uFrogGone; uniform float uFrogSoot;
        float frogH1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float frogN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(frogH1(i), frogH1(i + vec3(1.0, 0.0, 0.0)), f.x), mix(frogH1(i + vec3(0.0, 1.0, 0.0)), frogH1(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                     mix(mix(frogH1(i + vec3(0.0, 0.0, 1.0)), frogH1(i + vec3(1.0, 0.0, 1.0)), f.x), mix(frogH1(i + vec3(0.0, 1.0, 1.0)), frogH1(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
        // a height's slope across the pixel tilts the normal (no tangents needed)
        vec3 frogBump(vec3 pos, vec3 nrm, vec2 dH){
          vec3 sx = dFdx(pos), sy = dFdy(pos), r1 = cross(sy, nrm), r2 = cross(nrm, sx);
          float det = dot(sx, r1);
          return normalize(abs(det) * nrm - sign(det) * (dH.x * r1 + dH.y * r2));
        }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 frogAlb = texelColor.rgb;
        float frogL = dot(frogAlb, vec3(0.3, 0.59, 0.11));
        float frogCopper = smoothstep(1.35, 1.75, frogAlb.r / (frogAlb.g + 0.02)) * smoothstep(0.015, 0.08, frogL);
        float frogWet = smoothstep(1.02, 1.2, frogAlb.g / (frogAlb.r + 0.02));
        float frogCut = 1.0;
        if (uFrogGone > 0.0) { // dying: eaten away from a noise, the edge of every hole burning
          frogCut = frogN(vFrogP * 11.0) * 0.7 + frogN(vFrogP * 27.0) * 0.3 - uFrogGone * 1.08;
          if (frogCut < 0.0) discard;
        }
        // scorched where the fighter's fire has been landing
        if (uFrogSoot > 0.0) diffuseColor.rgb *= 1.0 - uFrogSoot * 0.8 * smoothstep(0.4, 0.68, frogN(vFrogP * 6.0) * 0.65 + frogN(vFrogP * 17.0) * 0.35);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(0.8, 0.42, frogCopper), 0.34, frogWet);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = 0.55 * frogCopper;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        vec2 frogD = vec2(dFdx(sqrt(frogL)), dFdy(sqrt(frogL)));
        frogD *= smoothstep(0.012, 0.06, length(frogD));
        normal = frogBump(-vViewPosition, normal, clamp(frogD, -0.7, 0.7) * vec2(length(dFdx(vViewPosition)), length(dFdy(vViewPosition))));`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float frogNV = clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0);
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.2, 0.19, 0.25);
        totalEmissiveRadiance += uFrogRim * pow(1.0 - frogNV, 3.5);
        totalEmissiveRadiance += vec3(1.05, 1.0, 0.9) * uFrogHit;
        if (uFrogGone > 0.0) totalEmissiveRadiance += vec3(6.0, 2.6, 0.7) * (1.0 - smoothstep(0.0, 0.09, frogCut));`);
  };
  m.customProgramCacheKey = () => "blaster-frog";
  return m;
}

class BlasterFrog {
  constructor(game) {
    const g = (this.g = game), geo = FrogModel.geometry();
    this.U = {
      uFrogT: { value: 0 }, uFrogLook: { value: 0 }, uFrogKick: { value: 0 }, uFrogRim: { value: new THREE.Color(0, 0, 0) },
      uFrogHit: { value: 0 }, uFrogGone: { value: 0 }, uFrogSoot: { value: 0 },
    };
    this.mat = frogSkin(g.shipEnv || g.env, this.U);
    // (its plain version for the weakest quality levels: its own texture, unlit, so it reads in the dark tunnel)
    this.lowMat = this.mat.userData.twin = new THREE.MeshBasicMaterial({ map: FrogModel.texture() });
    //   root: where it is · tilt: leaning back from a hit, down onto its target, rolling as it hovers · pose: its size and which way it faces
    const root = (this.root = new THREE.Group()), tilt = (this.tilt = new THREE.Group()), pose = (this.pose = new THREE.Group());
    this.body = [new THREE.Mesh(geo.full, this.mat), new THREE.Mesh(geo.low, this.mat)];
    this.body[1].visible = false;
    // the jets under its backpack: two short flames and a glow
    const fl = new THREE.CylinderGeometry(0.004, 0.03, 0.2, 8, 3, true);
    fl.translate(0, -0.1, 0);
    this.flameMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "uniform float uTime; varying float vT; void main(){ vT = -position.y / 0.2; vec3 p = position; p.xz *= 1.0 + 0.25 * vT * sin(uTime * 17.0 + position.y * 40.0); p.y *= 1.0 + 0.18 * sin(uTime * 11.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
      fragmentShader: "varying float vT; void main(){ gl_FragColor = vec4(mix(vec3(2.6, 2.4, 2.2), vec3(0.35, 1.2, 2.4), smoothstep(0.0, 0.35, vT)) * pow(1.0 - vT, 1.3) * 0.6, 1.0); }",
    });
    const jets = FROG.jets.map((p) => { const f = new THREE.Mesh(fl, this.flameMat); f.position.set(p[0], p[1], p[2]); f.rotation.z = -0.35; f.renderOrder = 5; return f; });
    this.jetGlow = glowSprite(neon(0x6fd0ff, 1.5), 0.26, 0.8);
    this.jetGlow.position.set(FROG.jets[0][0] - 0.02, FROG.jets[0][1] - 0.05, (FROG.jets[0][2] + FROG.jets[1][2]) / 2);
    // its eyes: a glint in each that flares when it turns its cannon on you (they ride the head as it turns)
    this.head = new THREE.Group();
    this.head.position.set(FROG.neck[0], FROG.neck[1], FROG.neck[2]);
    this.eyes = FROG.eyes.map((p) => { const s = glowSprite(new THREE.Color(2.6, 0.75, 0.12), 0.06, 0); s.position.set(p[0] - FROG.neck[0], p[1] - FROG.neck[1], p[2] - FROG.neck[2]); this.head.add(s); return s; });
    // the glow at the cannon's mouth while it fires
    this.flash = glowSprite(neon(0xffb357, 2.6), 0.3, 0);
    this.flash.position.set(FROG.muzzle[0], FROG.muzzle[1], FROG.muzzle[2]).addScaledVector(new THREE.Vector3(FROG.aim[0], FROG.aim[1], FROG.aim[2]), 0.03);
    this.flash.visible = false;
    pose.add(this.body[0], this.body[1], jets[0], jets[1], this.jetGlow, this.head, this.flash);
    pose.rotation.y = FROG_FACE;
    tilt.add(pose);
    root.add(tilt);
    root.visible = false; // (it arrives when the game starts)
    g.scene.add(root);
    // what the cannon fires: six bolts that take turns down the line. (They come almost straight at
    // the camera, so each is a ball of light, not a beam seen end-on.)
    this.bolts = Array.from({ length: 6 }, () => { const b = glowSprite(neon(0xffa23a, 3.0), 0.5, 1); b.visible = false; b.renderOrder = 6; g.scene.add(b); return { mesh: b, t: -1, from: new THREE.Vector3(), to: new THREE.Vector3() }; });
    this.puffs = new ExamPuffs(g.scene, 28); // smoke off its back once it is hurt, fire when it goes
    this.S = this.fitS = 6; this.yK = this.fitY = 0.04; // its size and how high it rides (see fit)
    this.alive = false; this.inT = 1; this.adv = 0; this.kick = 0; this.twist = 1; this.hits = 0; this.aimK = 0; this.look = 0;
    this.att = null; // the attack under way: { time, fired, hit }
    this.goneT = -1; // seconds since it was destroyed
    this.smokeT = 0;
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._d = new THREE.Vector3();
  }
  // its size and height, from the room there is: at its closest it fills most of the band between the question and the answers
  // (the band changes with every question's length: it eases to its new size, as the ship does)
  fit(band) {
    this.fitS = clamp(Math.min((band.h * 0.8) / FROG.height, (band.w * 0.8) / FROG.width), 1.5, 9);
    this.fitY = (band.h * 0.07) / FROG_NEAR;
    if (!this.root.visible) { this.S = this.fitS; this.yK = this.fitY; }
  }
  // a new wave's frog flies up the tunnel
  arrive() {
    const U = this.U;
    this.alive = true; this.goneT = -1; this.att = null; this.hits = 0; this.adv = 0; this.kick = 0; this.aimK = 0;
    this.inT = REDUCED_MOTION ? 1 : 0;
    U.uFrogGone.value = U.uFrogSoot.value = U.uFrogHit.value = U.uFrogKick.value = 0;
    this.root.visible = true;
  }
  // a point on it, in the world
  at(p, out) { this.pose.updateWorldMatrix(true, false); return this.pose.localToWorld(out.set(p[0], p[1], p[2])); }
  // where the fighter's fire should land
  aimPoint(out) { return this.at(FROG.chest, out); }
  // A right answer: the fighter's fire lands. It whites out, yelps and is knocked back down the tunnel.
  hit(color) {
    if (!this.alive) return;
    this.g.blastAt(this.aimPoint(this._a), color, 0.42);
    this.U.uFrogHit.value = 1;
    this.kick = 1;
    this.twist = -this.twist;
    this.hits++;
    Sound.sfx("froghit");
  }
  // A wrong answer, or none in time: it swings its cannon onto the ship and fires.
  attack() {
    if (this.att) return;
    if (!this.alive) { this.g.jet.shieldLost(); return; } // (between frogs: the shield still shows the hit)
    this.att = { time: 0, fired: 0, hit: false };
    Sound.sfx("frogfire");
  }
  // The wave is cleared: it comes apart into light in a blast of the wave's colour.
  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.att = null;
    this.goneT = 0;
    this.flash.visible = false;
    const g = this.g, p = this.aimPoint(new THREE.Vector3()), col = g.waveCol.clone(), k = this.S / 6, v = this._d;
    this.U.uFrogHit.value = 1;
    g.bursts.burst(p, col.getHex(), { n: 90, speed: 13 * k, size: 0.36 * k, life: 1.2 });
    g.bursts.burst(p, 0xffffff, { n: 24, speed: 6 * k, size: 0.28 * k, life: 0.7 });
    g.shockwave(p.clone(), col.clone().multiplyScalar(2.2), 15 * k, 0.8);
    g.shards.burst(p, col.getHex(), 22, 1.4 * k, 18 * k);
    g.boom(p, col.getHex(), 7 * k);
    if (!GFX.calm) this.puffs.emit(2, p, v.set(0, 0, 0), 1.2 * k, 3.4 * k, 0.22); // (Reduced effects: no flash)
    for (let i = 0; i < 5; i++) this.puffs.emit(0, this._b.set(p.x + rand(-1.4, 1.4) * k, p.y + rand(-1.4, 1.6) * k, p.z + rand(-0.6, 0.6) * k), v.set(rand(-2, 2), rand(-0.5, 2), rand(1, 4)), 0.9 * k, (2.1 + rand(0.8)) * k, 0.9 + rand(0.4), 0.6);
    for (let i = 0; i < 3; i++) this.puffs.emit(1, this._b.set(p.x + rand(-1.2, 1.2) * k, p.y + rand(-1, 1.4) * k, p.z), v.set(rand(-1.5, 1.5), rand(0, 1.5), rand(2, 5)), 1.6 * k, (3.6 + rand(1.4)) * k, 1.5 + rand(0.5), 0.5);
    Sound.sfx("frogout");
  }
  // advance: how much of the question's time has gone (0 to 1), or null between questions
  update(dt, advance) {
    const g = this.g, t = g.t, U = this.U, cheap = GFX.ok && GFX.Q[GFX.qi].cheap, quiet = REDUCED_MOTION || GFX.calm, ship = g.ship.position;
    this.S += (this.fitS - this.S) * Math.min(1, dt * 3);
    this.yK += (this.fitY - this.yK) * Math.min(1, dt * 3);
    const S = this.S;
    this.flameMat.uniforms.uTime.value = t;
    this.puffs.update(dt, g.camera, t);
    this.puffs.mat.uniforms.uDetail.value = cheap ? 0 : 1;
    // bolts on their way (they outlive whatever the frog does next)
    this.bolts.forEach((b) => {
      if (b.t < 0) return;
      b.t += dt / 0.24;
      if (b.t >= 1) {
        b.t = -1;
        b.mesh.visible = false;
        g.bursts.burst(b.to, COLORS.orange, { n: quiet ? 5 : 10, speed: 3.2 * g.shipScale, size: 0.14 * g.shipScale, life: 0.35 });
        if (this.att && !this.att.hit) { this.att.hit = true; g.jet.shieldLost(); } // the first one home flares the ship's shield
        return;
      }
      b.mesh.position.lerpVectors(b.from, b.to, b.t);
      b.mesh.scale.setScalar((0.55 + 0.45 * b.t) * (0.5 + 0.09 * S));
      b.mesh.visible = true;
    });
    if (!this.root.visible) return;
    if (this.goneT >= 0) { // destroyed: eaten away, then gone
      this.goneT += dt;
      const k = Math.min(1, this.goneT / 0.8);
      U.uFrogGone.value = k;
      U.uFrogHit.value = Math.max(0, 1 - this.goneT * 3.5);
      if (k >= 1 || (cheap && k > 0.3)) this.root.visible = false; // (the plain version can't dissolve: it just goes)
      return;
    }
    U.uFrogT.value += dt;
    U.uFrogHit.value = Math.max(0, U.uFrogHit.value - dt * 5.5);
    U.uFrogKick.value *= Math.pow(0.0005, dt);
    U.uFrogSoot.value += (Math.min(1, this.hits / 8) * 0.85 - U.uFrogSoot.value) * Math.min(1, dt * 3);
    U.uFrogRim.value.copy(g.waveCol).multiplyScalar(0.6);
    this.body[0].visible = !cheap;
    this.body[1].visible = cheap;
    if (cheap) this.lowMat.color.setScalar((1.05 + U.uFrogHit.value * 1.6) * (1 - 0.35 * U.uFrogSoot.value)); // (the plain version: whiter when hit, darker as it is scorched)
    // where it is: as far down the tunnel as the time left says, further when a hit has just knocked it back, and flying up when it is new
    const A = this.att;
    if (advance !== null) this.adv += (advance - this.adv) * Math.min(1, dt * 5);
    else if (!A) this.adv += (0 - this.adv) * Math.min(1, dt * 1.1); // (between questions it backs off, once it has finished firing)
    this.kick *= Math.pow(0.03, dt);
    if (this.inT < 1) this.inT = Math.min(1, this.inT + dt / 1.5);
    const inK = Math.pow(1 - this.inT, 3), z = -lerp(FROG_FAR, FROG_NEAR, this.adv) - this.kick * (REDUCED_MOTION ? 3 : 9) - inK * 110;
    this.root.position.set(quiet ? 0 : Math.sin(t * 0.45) * 0.06 * S, this.yK * -z + (quiet ? 0 : Math.sin(t * 1.3) * 0.02 * S), z);
    this.pose.scale.setScalar(S);
    // It faces the ship. To fire, it turns until the barrel it carries across its body points down the line, and keeps its eyes on you.
    const d = this._d.subVectors(ship, this.root.position), toShip = Math.atan2(d.x, d.z), down = Math.atan2(-d.y, Math.hypot(d.x, d.z));
    if (A) A.time += dt;
    this.aimK += ((A ? smoothstep(0, 0.16, A.time) * (1 - smoothstep(0.85, 1.15, A.time)) : 0) - this.aimK) * Math.min(1, dt * 14);
    const k = this.aimK;
    this.pose.rotation.y = FROG_FACE + lerp(toShip, toShip - FROG_BARREL, k);
    this.tilt.rotation.set(lerp(-0.42 * this.kick, down, k), 0, quiet ? 0 : Math.sin(t * 0.9) * 0.035 + this.twist * 0.22 * this.kick);
    this.look += ((quiet ? 0 : 0.14 * Math.sin(t * 0.7) + clamp(Pointer.x, -1, 1) * 0.22) * (1 - k) + FROG_BARREL * 0.9 * k - this.look) * Math.min(1, dt * 9);
    U.uFrogLook.value = this.look;
    this.head.rotation.y = this.look;
    this.eyes.forEach((s) => { s.material.opacity = 0.12 + 0.88 * k; s.scale.setScalar(0.05 + 0.05 * k); });
    // the attack: a croak, six shots, each bolt running down the line to the ship
    if (A) {
      while (A.fired < 6 && A.time >= 0.2 + A.fired * 0.075) {
        const b = this.bolts[A.fired++];
        b.t = 0;
        this.at(FROG.muzzle, b.from);
        b.to.copy(ship).add(this._a.set(rand(-0.7, 0.7), rand(-0.1, 0.5), rand(-0.6, 0.9)).multiplyScalar(g.shipScale));
        U.uFrogKick.value = 1;
      }
      // the glow at its mouth: one swell over the burst, no flicker
      const glow = smoothstep(0.14, 0.24, A.time) * (1 - smoothstep(0.62, 0.8, A.time));
      this.flash.visible = glow > 0.01;
      this.flash.material.opacity = glow;
      this.flash.scale.setScalar(0.22 + 0.1 * glow);
      if (A.time > 1.2) { this.att = null; this.flash.visible = false; }
    }
    // hurt: smoke off its backpack, more of it with every hit
    if (this.hits >= 2 && !quiet && (this.smokeT -= dt) <= 0) {
      this.smokeT = Math.max(0.12, 0.42 - this.hits * 0.035);
      this.puffs.emit(1, this.at(FROG.pack, this._a), this._b.set(rand(-0.3, 0.3), rand(0.4, 1.1), rand(1.5, 3.5)), 0.1 * S, 0.3 * S, 0.8, 0.5, 0.5);
    }
  }
  dispose() {
    [this.mat, this.lowMat, this.flameMat, this.flash.material, this.jetGlow.material].concat(this.eyes.map((s) => s.material), this.bolts.map((b) => b.mesh.material)).forEach((m) => m.dispose());
    this.bolts.forEach((b) => this.g.scene.remove(b.mesh));
  }
}

if (typeof requestIdleCallback === "function") requestIdleCallback(() => FrogModel.preload(), { timeout: 6000 });
else setTimeout(() => FrogModel.preload(), 3000);
