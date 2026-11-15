// Risk Blaster's enemy when its model arrived (Assets.model("demon"); without it 20h's demon flies, as before): a
// ram-horned overlord in black chrome, wings of armour blades, a reactor core burning magenta in its chest. The
// model is eleven rigid parts (body, head, tail, two wings, and each arm as shoulder, elbow, hand); every move is
// posed here from smooth curves. Look and sound only. The game still asks, times, checks and scores:
//   a wave starts            it flies up out of the distance, throws its wings wide and roars
//   while the clock runs     it comes closer
//   a right answer           the fighter's fire lands on its core: it is thrown back, and is a little more broken
//   a wrong answer, or none  it winds up (the warning) and strikes
//   the last three questions it rages
//   the wave is cleared      it dies
// Everything here runs on the show clock (VFX.dt): a hit-stop holds it still, and the rules never wait for it.
const LORD = {
  width: 1.0, height: 0.98, // the model: one unit across the wings
  RIDE: { core: "body", thrusters: "body", mouth: "head", eyes: "head", clawL: "handL", clawR: "handR", wingTipL: "wingL", wingTipR: "wingR", tailTip: "tail" },
  TREE: { head: "body", wingL: "body", wingR: "body", shoulderL: "body", shoulderR: "body", tail: "body" }, // (everything hangs from its torso; the arms are chains already)
  // The wounds a wave's hits open in it, in order: a place on the model at rest and how wide (its own units).
  // Armour is eaten away there to a burning edge; what is behind shows through.
  WOUNDS: [
    [0.072, 0.105, 0.16, 0.034], // the plate over its left breast
    [-0.33, 0.1, -0.05, 0.075], // a hole through its right wing
    [-0.135, 0.275, 0.07, 0.046], // the curl of its right horn
    [-0.07, 0.02, 0.15, 0.034], // the plate under its right breast
    [0.31, 0.24, -0.05, 0.085], // a hole through its left wing
    [0.175, 0.125, 0.06, 0.042], // its left shoulder
  ],
};

const lordUniforms = () => Object.assign(blasterSkinUniforms(), {
  uLdWound: { value: LORD.WOUNDS.map(() => new THREE.Vector4(0, 0, 0, 0)) }, uLdCoreK: { value: 0 }, uLdEyeK: { value: 0 }, uLdSweep: { value: 9 }, uLdCrack: { value: 0 },
  uLdCrackCol: { value: new THREE.Color(2.6, 0.5, 0.7) }, uLdClaw: { value: new THREE.Color(0, 0, 0) }, uLdMouth: { value: new THREE.Color(0, 0, 0) },
  uDmRage: { value: 0 }, // (how red its mood is: the built-in fighter's back takes its colour from this)
});
const LORD_GLSL = {
  key: "lord",
  pars: "uniform vec4 uLdWound[6]; uniform float uLdCoreK; uniform float uLdEyeK; uniform float uLdSweep; uniform float uLdCrack; uniform vec3 uLdCrackCol; uniform vec3 uLdClaw; uniform vec3 uLdMouth;",
  // its wounds: armour eaten away from each (a ragged edge, from a noise), burning where it ends, scorched round that
  cut: `float ldW = 9.0;
        for (int i = 0; i < 6; i++) { if (uLdWound[i].w > 0.0) ldW = min(ldW, length(vRest - uLdWound[i].xyz) / uLdWound[i].w); }
        float ldN = skN(vRest * 46.0) * 0.6 + skN(vRest * 110.0) * 0.4, ldCut = ldW + (ldN - 0.5) * 0.6;
        if (ldCut < 0.8) discard;
        float ldEdge = 1.0 - smoothstep(0.8, 1.04, ldCut), ldScorch = 1.0 - smoothstep(0.95, 2.0, ldCut);`,
  albedo: "diffuseColor.rgb *= 1.0 - 0.8 * ldScorch;",
  emissive: `totalEmissiveRadiance *= 1.0 - smoothstep(uLdSweep - 0.08, uLdSweep, vRest.y); // its lights come on from the bottom up as it arrives
        vec3 ldC = vRest - vec3(0.0, 0.065, 0.17), ldE = (vRest - vec3(0.0, 0.262, 0.16)) * vec3(1.0, 2.0, 1.0);
        totalEmissiveRadiance *= 1.0 + uLdCoreK * exp(-dot(ldC, ldC) * 520.0) + uLdEyeK * exp(-dot(ldE, ldE) * 800.0); // its core and its eyes burn brighter than its strips
        float ldV = abs(skN(vRest * 31.0) - 0.5) * 2.0; // cracks: thin veins that spread from patch to patch as it is hurt
        totalEmissiveRadiance += uLdCrackCol * ((1.0 - smoothstep(0.0, 0.06, ldV)) * smoothstep(1.0 - uLdCrack, 1.3 - uLdCrack, skN(vRest * 6.5 + 3.1)) * step(0.001, uLdCrack));
        totalEmissiveRadiance += vec3(5.5, 1.7, 0.5) * ldEdge * (0.55 + 0.45 * ldN) + vec3(1.0, 0.16, 0.3) * ldScorch * 0.2;
        vec3 ldH = vec3(abs(vRest.x) - 0.285, vRest.y + 0.19, vRest.z - 0.13), ldM = vRest - vec3(0.0, 0.195, 0.15);
        totalEmissiveRadiance += uLdClaw * exp(-dot(ldH, ldH) * 95.0) * (0.25 + 0.75 * skF) + uLdMouth * exp(-dot(ldM, ldM) * 900.0); // energy in its claws, light in its mouth`,
};

class BlasterOverlord {
  constructor(game, model) {
    const g = (this.g = game);
    const M = (this.model = rigModel(model, { ride: LORD.RIDE, tree: LORD.TREE }));
    blasterBakeRest(M);
    const J = (this.J = M.parts), A = (this.A = M.anchors);
    //   root: where it is · tilt: thrown back by a hit, leaning into a strike · pose: its size · then its joints
    const root = (this.root = new THREE.Group()), tilt = (this.tilt = new THREE.Group()), pose = (this.pose = new THREE.Group());
    pose.add(M.scene);
    tilt.add(pose);
    root.add(tilt);
    root.visible = false; // (it arrives when the game starts)
    g.scene.add(root);
    this.names = Object.keys(M.mesh).filter((n) => J[n]);
    for (const n of this.names) { const j = J[n]; j.userData.home = { parent: j.parent, p: j.position.clone(), q: j.quaternion.clone() }; } // (where each part belongs, for when it is whole again)

    // ---- its chrome
    tuneModel(M, { glow: 2.2, metal: 0.93, rough: 1.0, normal: 0.9 });
    this.U = lordUniforms();
    this.mat = blasterSkin(M.mesh.body.material, this.U, LORD_GLSL);
    this.mat.color.setScalar(1.3); // (black chrome mirrors little: a shade lighter, and its plates show what stands round it)
    g.chrome(this.mat, 1.7);
    // a part that has come away burns up on its own: it wears a copy of the skin with its own heat and its own dissolve
    this.scrapU = [0, 1, 2, 3].map(() => Object.assign({}, this.U, { uSkGone: { value: 0 }, uSkHot: { value: new THREE.Color(0, 0, 0) }, uSkGlow: { value: new THREE.Color(1, 1, 1) } }));
    this.scrapMat = this.scrapU.map((U) => g.chrome(blasterSkin(this.mat.clone(), U, LORD_GLSL), 1.7));
    this.scrap = []; // parts in flight: { j, mesh, v, w, t, slot }

    // ---- light with no surface: its core, its eyes and mouth, the energy in its claws, a breath of light behind it
    const spr = (host, color, size, order = 3) => { const s = glowSprite(color, size, 0); s.renderOrder = order; host.add(s); return s; };
    this.coreGlow = spr(A.core, new THREE.Color(2.4, 0.25, 1.4), 0.3);
    this.eyeGlow = spr(A.eyes, new THREE.Color(2.6, 0.2, 1.2), 0.12);
    this.eyeDots = [-0.031, 0.031].map((x) => { const s = spr(A.eyes, new THREE.Color(3.0, 0.5, 1.6), 0.03, 4); s.position.set(x, 0.002, 0.004); return s; }); // a point of light in each eye: they are seen from the far end of a wave
    this.keyLight = new THREE.PointLight(0xdfe6ff, 0, 30, 1.5); // a lamp of its own, above and before it on the key's side: it is lit wherever it flies
    g.scene.add(this.keyLight);
    this.maw = spr(A.mouth, new THREE.Color(2.6, 0.5, 1.2), 0.16);
    this.claws = [spr(A.clawL, new THREE.Color(1.3, 0.35, 2.6), 0.2), spr(A.clawR, new THREE.Color(1.3, 0.35, 2.6), 0.2)];
    this.glow = glowSprite(new THREE.Color(0.35, 0.3, 0.9), 2.4, 0); // (cold light behind it: its dark wings and horns stand against it)
    this.glow.position.set(0, 0.05, -0.3);
    this.glow.renderOrder = 2;
    pose.add(this.glow);
    this.coreLight = new THREE.PointLight(0xff3ad4, 0, 14, 2); // its core lights its own chest and arms, and the fighter when it comes close
    g.scene.add(this.coreLight);
    // the aura of its rage: the edges of the view glow red
    this.auraU = { uColor: { value: new THREE.Color(1.0, 0.08, 0.2) }, uK: { value: 0 } };
    this.aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.auraU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uColor; uniform float uK; varying vec2 vUv; void main(){ vec2 d = abs(vUv - 0.5) * 2.0; float e = smoothstep(0.56, 1.0, max(d.x, d.y)) * 0.8 + 0.3 * smoothstep(0.8, 1.3, length(d)); gl_FragColor = vec4(uColor * (e * e * uK), 1.0); }",
    }));
    this.aura.renderOrder = 55;
    this.aura.frustumCulled = false;
    this.aura.visible = false;
    g.scene.add(this.aura);

    this.S = this.fitS = 6; this.yK = this.fitY = 0.04; // its size and how high it rides (see fit)
    this.alive = false; this.inT = 1; this.adv = 0; this.kick = 0; this.kickTo = 0; this.twist = 1; this.hits = 0; this.look = 0; this.nod = 0; this.stagger = 0;
    this.att = null; this.atkN = 0; // the strike under way: { time, kind, ... }
    this.dieT = -1; this.pending = false; this.blown = false;
    this.finale = false; this.finaleDone = false;
    this.rageOn = false; this.rageT = 9; this.gloatT = -1; this.beatN = 0;
    this.flap = 0; this.rage = 0; this.pow = 0; this.flick = 1; this.dim = 1; this.flickT = 0; this.emberT = 0; this.sparkT = 3; this.heat = 0; this.roared = false; this.seed = 7741; this.wounds = 0; this.lost = {};
    this.flash = 0; this.flashCol = new THREE.Color(1, 1, 1);
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._d = new THREE.Vector3(); this._c = new THREE.Color(); this._c2 = new THREE.Color();
  }
  lcg() { return (this.seed = (this.seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // Its size and height, from the room there is: at its closest its wings fill the band from side to side; when a
  // question starts it is two thirds of that.
  fit(band) {
    this.fitS = clamp(Math.min((band.h * 0.98) / LORD.height, (band.w * 0.9) / LORD.width), 1.5, 14);
    this.fitY = (band.h * 0.15) / DEMON_NEAR;
    if (!this.root.visible) { this.S = this.fitS; this.yK = this.fitY; }
  }
  // ---- where things are on it, in the world (each fills `out` and returns it) --------------------------------
  anchor(name, out) { return this.A[name].getWorldPosition(out); }
  aimPoint(out) { return this.A.core.getWorldPosition(out); } // its core: where the fighter's fire lands
  claw(i, out) { return this.A[i ? "clawR" : "clawL"].getWorldPosition(out); } // (0: its left, on the player's right)
  mouth(out) { return this.A.mouth.getWorldPosition(out); }
  eyes(out) { return this.A.eyes.getWorldPosition(out); }
  wingTip(i, out) { return this.A[i ? "wingTipR" : "wingTipL"].getWorldPosition(out); }
  tailTip(out) { return this.A.tailTip.getWorldPosition(out); }
  // a point on the model at rest (its own units), where it is now in the world
  at(p, out) { this.pose.updateWorldMatrix(true, false); return this.pose.localToWorld(out.set(p[0], p[1], p[2])); }

  // A wave starts: the next demon flies up out of the distance. (If the last one is still breaking up, it waits for that.)
  arrive() {
    if (this.dieT >= 0) { this.pending = true; return; }
    const U = this.U;
    this.alive = true; this.att = null; this.hits = 0; this.adv = 0; this.kick = this.kickTo = 0; this.rage = 0; this.pow = 0; this.roared = false; this.pending = false; this.blown = false; this.stagger = 0;
    this.finale = false; this.rageOn = false; this.rageT = 9; this.wounds = 0; this.lost = {};
    this.inT = REDUCED_MOTION ? 1 : 0;
    U.uSkGone.value = 0; U.uSkHot.value.setRGB(0, 0, 0); U.uLdCrack.value = 0;
    U.uLdWound.value.forEach((w) => w.set(0, 0, 0, 0));
    // whole again: every part back on its joint, in its own skin
    for (const s of this.scrap) s.done = true;
    this.scrap.length = 0;
    for (const n of this.names) { const j = this.J[n], h = j.userData.home; h.parent.add(j); j.position.copy(h.p); j.quaternion.copy(h.q); j.scale.setScalar(1); j.visible = true; if (this.model.mesh[n]) this.model.mesh[n].material = this.mat; }
    this.root.visible = true;
  }
  // A right answer: the fighter's fire lands on its core. Its edges flash in the answer's colour, it is thrown
  // back, and it is a little more broken: a wound opens, and by and by parts of it come away.
  hit(color) {
    if (!this.alive) return;
    const g = this.g, p = this.aimPoint(this._a);
    this.flash = 1;
    this.flashCol.set(color).lerp(this._c.setRGB(1, 1, 1), 0.25);
    this.kickTo = 1;
    this.twist = -this.twist;
    this.hits++;
    this.att = this.att && this.att.time < 0.45 ? null : this.att; // (struck while it was still winding up: the blow breaks its strike)
    if (this.hits % 3 === 0) this.stagger = 1; // every third blow staggers it
    if (g.show) g.show.demonHit(this, p, color); else { g.blastAt(p, color, 0.42); Sound.sfx("demonhit"); }
    this.damage();
  }
  // What a wave's hits do to it, in order: wounds open (2nd, 3rd, 5th, 6th, 7th, 9th hit), its tail is shot away
  // (4th), a wing is torn off (8th).
  damage() {
    const h = this.hits, g = this.g;
    const open = { 2: 0, 3: 1, 5: 2, 6: 3, 7: 4, 9: 5 }[h];
    if (open !== undefined) {
      const W = LORD.WOUNDS[open], u = this.U.uLdWound.value[open];
      u.set(W[0], W[1], W[2], 0.001);
      u.grow = W[3];
      this.wounds = Math.max(this.wounds, open + 1);
      if (g.show) g.show.demonWound(this, this.at(W, this._b)); else Sound.sfx("demonshed");
    }
    if (h === 4) this.shed("tail");
    if (h === 8) this.shed(this.twist > 0 ? "wingL" : "wingR");
  }
  // A part comes away: it is cut loose from its joint, thrown clear, and burns up as it falls behind.
  shed(name, v) {
    const j = this.J[name], g = this.g;
    if (!j || this.lost[name] || !j.visible) return null;
    const slot = this.scrap.length % this.scrapMat.length, U = this.scrapU[slot], p = j.getWorldPosition(new THREE.Vector3());
    this.lost[name] = true;
    g.scene.attach(j); // (it keeps its place, size and turn in the world)
    j.traverse((o) => { if (o.isMesh) o.material = this.scrapMat[slot]; });
    U.uSkGone.value = 0; U.uSkHot.value.setRGB(2.4, 0.7, 0.3); U.uSkGlow.value.setRGB(1, 1, 1);
    const out = this._d.copy(p).sub(this.root.position);
    out.z = 0;
    if (out.lengthSq() < 0.01) out.set(0, -1, 0);
    out.normalize();
    const s = { j, slot, t: 0, life: 1.9, v: v ? v.clone() : new THREE.Vector3(out.x * rand(3, 5), out.y * rand(2, 4) + 1.2, rand(3, 6)), w: new THREE.Vector3(rand(-3, 3), rand(-3, 3), rand(-4, 4)), done: false };
    this.scrap.push(s);
    if (g.show) g.show.demonShed(this, p, name);
    return s;
  }
  // A wrong answer, or none in time: it winds up, then strikes. (The show stages the strike: 20l.)
  attack() {
    if (this.att) return;
    if (!this.alive) { this.g.jet.shieldLost(); if (this.g.show) this.g.show.playerHit(null, 0); return; } // (between demons: the shield still shows the hit)
    this.att = { time: 0, kind: this.atkN++ % 3, fired: 0, hit: false, ring: false };
    if (this.g.show) this.g.show.demonAttack(this, this.att); else Sound.sfx("demoncharge");
  }
  // The wave is cleared: it dies. (The show stages its death: 20l. Once in a run, at the wave that takes the player
  // past their best score, it is a bigger one. Read from the saved scores; nothing is written.)
  destroy() {
    if (!this.alive) return;
    const g = this.g;
    this.alive = false;
    this.att = null;
    this.dieT = 0;
    this.blown = false;
    this.finale = !this.finaleDone && typeof Store !== "undefined" && g.score > Store.best("blaster");
    if (this.finale) this.finaleDone = true;
    if (g.show) g.show.demonDeath(this); else Sound.sfx(this.finale ? "demonroarlong" : "demonroar");
  }
  // the blast that ends it: every part still on it is thrown clear
  blow() {
    const g = this.g, p = this.aimPoint(new THREE.Vector3());
    this.blown = true;
    this.flash = 1; this.flashCol.setRGB(1, 0.9, 0.95);
    for (const n of this.names) if (n !== "body" && !this.lost[n]) this.shed(n);
    this.U.uSkHot.value.setRGB(2.6, 0.8, 0.5);
    if (g.show) g.show.demonBlast(this, p);
    else { g.blastAt(p, g.waveCol.getHex(), 1); Sound.sfx("demonboom"); }
  }
  // advance: how much of the question's time has gone (0 to 1), or null between questions
  update(dt, advance) {
    const g = this.g, d = VFX.dt, t = VFX.t, U = this.U, J = this.J, quiet = REDUCED_MOTION || GFX.calm, ship = g.ship.position, sin = Math.sin, cos = Math.cos;
    this.S += (this.fitS - this.S) * Math.min(1, d * 3);
    this.yK += (this.fitY - this.yK) * Math.min(1, d * 3);
    const S = this.S, k6 = S / 6;
    // parts that have come away: they tumble off, fall behind, and burn up
    for (let i = this.scrap.length - 1; i >= 0; i--) {
      const s = this.scrap[i], Us = this.scrapU[s.slot];
      s.t += d;
      const u = s.t / s.life;
      s.j.position.addScaledVector(s.v, d);
      s.v.multiplyScalar(Math.pow(0.5, d)); s.v.y -= 1.6 * d;
      s.j.rotation.x += s.w.x * d; s.j.rotation.y += s.w.y * d; s.j.rotation.z += s.w.z * d;
      Us.uSkGone.value = clamp((u - 0.2) / 0.8, 0, 1);
      Us.uSkHot.value.multiplyScalar(Math.pow(0.12, d));
      Us.uSkGlow.value.multiplyScalar(Math.pow(0.05, d));
      if (u >= 1 || s.done) { s.j.visible = false; this.scrap.splice(i, 1); }
    }
    this.aura.visible = false;
    if (!this.root.visible) { this.coreLight.intensity = this.keyLight.intensity = 0; return; }

    // ---- how it is: arriving, raging, hurt, striking, winning, dying (each a smooth weight, 0 to 1)
    const A = this.att;
    if (A) A.time += d;
    const dying = this.dieT >= 0;
    if (dying) this.dieT += d;
    if (this.inT < 1) this.inT = Math.min(1, this.inT + d / 2.0);
    const inK = Math.pow(1 - this.inT, 3), flare = smoothstep(0.6, 0.78, this.inT) * (1 - smoothstep(0.86, 1, this.inT)); // (its wings thrown wide as it arrives)
    // rage: the wave's last three questions. As it begins it throws its wings wide and roars, once.
    const rageNow = this.alive && g.inWave >= WAVE_LEN - 3;
    if (rageNow && !this.rageOn) { this.rageT = 0; if (g.show) g.show.demonRage(this); else Sound.sfx("demonrage"); }
    this.rageOn = rageNow;
    this.rageT += d;
    this.rage += ((rageNow ? 1 : 0) - this.rage) * Math.min(1, d * 1.5);
    const rage = this.rage, hurt = clamp((this.hits - 1) / 7, 0, 1), onset = smoothstep(0, 0.25, this.rageT) * (1 - smoothstep(0.55, 1.3, this.rageT));
    // the run is over: it has won, and roars over the wreck with its wings spread
    if (g.state === "over" && this.alive && this.gloatT < 0) { this.gloatT = 0; Sound.sfx("demonroarlong"); }
    if (this.gloatT >= 0) this.gloatT += d;
    const gloat = this.gloatT >= 0 ? smoothstep(0, 0.35, this.gloatT) * (1 - smoothstep(1.7, 2.6, this.gloatT)) : 0;
    const tele = A ? smoothstep(0, 0.36, A.time) * (1 - smoothstep(0.46, 0.58, A.time)) : 0; // winding up: the warning
    const strike = A ? smoothstep(0.46, 0.58, A.time) * (1 - smoothstep(0.85, 1.4, A.time)) : 0;
    const kind = A ? A.kind : -1;
    this.kickTo *= Math.pow(0.03, d);
    this.kick += (this.kickTo - this.kick) * Math.min(1, d * 22);
    this.stagger = Math.max(0, this.stagger - d / 0.9);
    const stg = sin(Math.min(1, this.stagger * 1.3) * Math.PI) * 0.8; // staggered: it sags and reels, then gathers itself
    // dying: it sags and reels; in its last stand it rears back and roars instead
    const stag = dying ? smoothstep(0, 0.25, this.dieT) : 0, kick = this.kick, roar = dying && this.finale && !this.blown ? stag : 0, sag = Math.max(stag - roar, stg);
    const raise = Math.min(1.2, (kind === 0 ? tele : 0.35 * tele) + 0.8 * roar + 0.7 * gloat + 0.5 * onset + 0.7 * flare); // (arms up and out, claws open)
    // wings: a slow beat, faster in a rage and as it flies in. Each down-beat is heard, quietly.
    this.flap += d * (2.6 + 3.2 * rage + 7 * Math.min(1, inK * 4) + 2.5 * tele + 3 * gloat) * (quiet ? 0.6 : 1);
    const ph = this.flap, beat = Math.pow(0.5 + 0.5 * sin(t * (5.4 + 3 * rage)), 6), beatN = Math.floor((ph - 1.5708) / 6.2832);
    if (beatN !== this.beatN) { this.beatN = beatN; if (this.inT > 0.25 && !dying) Sound.sfx("demonflap", clamp(this.root.position.x * 0.1, -0.6, 0.6)); }
    // ---- where it is: as far ahead as the time left says, further when a hit has thrown it back, flying up when it is new
    if (advance !== null) this.adv += (advance - this.adv) * Math.min(1, d * 5);
    else if (!A) this.adv += (0 - this.adv) * Math.min(1, d * 1.1);
    const lunge = strike * (kind === 1 ? 6.5 : 1.6) * (REDUCED_MOTION ? 0.3 : 1) - tele * (kind === 1 ? 2.2 : 0.6);
    const z = -lerp(DEMON_FAR, DEMON_NEAR, this.adv) - kick * (REDUCED_MOTION ? 3 : 7) - inK * 130 + lunge - stag * 2.5 + gloat * 3;
    const bob = quiet ? 0 : -sin(ph + 0.4) * 0.014 * S * (1 + 0.5 * rage);
    const lost = (this.lost.wingL ? 1 : 0) - (this.lost.wingR ? 1 : 0); // (a wing gone: it lists toward the side that still flies)
    this.root.position.set((quiet ? 0 : sin(t * 0.45) * 0.06 * S) - lost * 0.04 * S, this.yK * -z + bob + (quiet ? 0 : sin(t * 0.8) * 0.012 * S) + tele * 0.04 * S - sag * 0.08 * S + roar * 0.05 * S + inK * 14, z);
    this.pose.scale.setScalar(S);
    const dv = this._d.subVectors(ship, this.root.position), toShip = Math.atan2(dv.x, dv.z), down = Math.atan2(-dv.y, Math.hypot(dv.x, dv.z));
    // the whole of it: leaning over the player; back as it rears and when it is hit; down into its strike
    this.tilt.rotation.set(0.08 + down * 0.3 - 0.26 * tele + 0.4 * strike * (kind === 1 ? 1 : 0.5) - 0.45 * kick - 0.3 * sag - 0.3 * roar - 0.2 * gloat + 0.5 * Math.min(1, inK * 3) - 0.22 * flare, toShip * 0.5 + this.twist * 0.2 * kick,
      (quiet ? 0 : sin(t * 0.7) * 0.035) + this.twist * 0.16 * kick + lost * 0.14 + (dying ? sin(this.dieT * 13) * 0.07 * (1 - smoothstep(0.5, 0.8, this.dieT)) : 0) + stg * 0.12 * sin(t * 9) + (rage > 0.5 ? 0.012 * sin(t * 9.1) * sin(t * 1.7) : 0));
    // ---- its joints. Angles from smooth curves; what is further out follows a little later.
    const breath = sin(t * 1.9), sway = quiet ? 0.4 : 1, amp = (quiet ? 0.5 : 1) * (1 + 0.35 * rage) * (1 - 0.7 * stag);
    // wings: raised (up), swept forward to shield or strike (fwd), and beating: the tips trail the roots
    const up = 0.34 * tele * (kind === 2 ? 1.3 : 1) - 0.5 * strike + 0.42 * flare - 0.5 * sag + 0.5 * roar - 0.22 * kick + 0.38 * onset + 0.45 * gloat - 0.5 * Math.min(1, inK * 3);
    const fwd = 0.5 * kick - 0.22 * tele + 0.5 * strike * (kind === 1 ? 1 : 0.4) + 0.25 * sag - 0.2 * roar + 0.6 * Math.min(1, inK * 3);
    const wing = (sd) => sd * (0.02 + up + amp * 0.11 * sin(ph) + 0.015 * sin(t * 0.6 + sd));
    if (J.wingL) J.wingL.rotation.set(amp * 0.03 * sin(ph - 0.6), -fwd - amp * 0.09 * cos(ph), wing(1));
    if (J.wingR) J.wingR.rotation.set(amp * 0.03 * sin(ph - 0.6), fwd + amp * 0.09 * cos(ph), wing(-1));
    // body and tail: breathing, and a sway that runs down it
    J.body.rotation.set(0.03 * breath + 0.02 * sin(ph + 1.2) * amp, quiet ? 0 : sin(t * 0.5) * 0.05, 0);
    J.body.scale.setScalar(1 + 0.012 * breath);
    if (J.tail) J.tail.rotation.set(0.1 * sin(t * 0.9 + 0.2) * sway - 0.2 * raise + 0.35 * strike + 0.45 * kick + 0.3 * sag, 0.12 * sin(t * 0.7) * sway, 0.16 * sin(t * 0.9 - 0.9) * sway);
    // head: it watches the player (the pointer turns it a little); thrown back by a hit and by its roars; it lolls as it dies
    this.look += ((quiet ? 0 : 0.14 * sin(t * 0.6) + clamp(Pointer.x, -1, 1) * 0.3) * (1 - strike) - this.look) * Math.min(1, d * 7);
    this.nod += ((0.2 - clamp(Pointer.y, -1, 1) * 0.1) - 0.38 * tele * (kind === 2 ? 1.5 : 0.6) + 0.3 * strike - 0.5 * kick - 0.4 * roar - 0.32 * gloat - 0.3 * onset - 0.4 * flare - this.nod) * Math.min(1, d * 9);
    if (J.head) J.head.rotation.set(this.nod + (rage > 0.5 && !quiet ? 0.03 * sin(t * 7.3) * sin(t * 1.3) : 0) + 0.35 * sag * sin((dying ? this.dieT : t) * 3 + 1), this.look + 0.3 * sag * sin((dying ? this.dieT : t) * 4), 0.05 * sin(t * 0.8) * sway + this.twist * 0.22 * kick + 0.25 * sag);
    // arms: hanging, swaying, the hands flexing; raised and spread as it rears or roars; swept in and down as it strikes; thrown wide by a hit
    const arm = (sd, sh, el, ha) => {
      const o = sd * 1.3, swipe = kind === 1 ? 1 : 0.4;
      if (sh) sh.rotation.set(0.04 * sin(t * 0.9 + o) * sway - 0.25 * raise + 0.3 * strike * swipe - 0.3 * kick, 0, sd * (0.03 * sin(t * 0.7 + o) * sway + 0.42 * raise - 0.3 * strike * swipe + 0.4 * kick - 0.12 * sag + 0.05 * breath));
      if (el) el.rotation.set(0.05 * sin(t * 1.1 + o + 0.6) * sway - 0.4 * raise + 0.5 * strike * swipe - 0.25 * kick + 0.2 * sag, 0, sd * (0.3 * raise - 0.35 * strike * swipe + 0.25 * kick));
      if (ha) ha.rotation.set(-0.06 + 0.08 * sin(t * 1.3 + o + 1.2) * sway - 0.75 * raise - 0.2 * tele + 0.45 * strike * swipe + 0.25 * sag + 0.1 * rage * sin(t * 3.1 + o), 0, sd * (0.04 * sin(t * 1.7 + o) * sway + 0.25 * raise - 0.5 * strike * swipe));
    };
    arm(1, J.shoulderL, J.elbowL, J.handL);
    arm(-1, J.shoulderR, J.elbowR, J.handR);

    // ---- its light
    const lit = this.inT > 0.55 && !dying;
    this.pow += ((lit ? 1 : 0) - this.pow) * Math.min(1, d * (dying ? 6 : 2.5));
    U.uLdSweep.value = this.inT < 1 ? -0.55 + smoothstep(0.55, 1, this.inT) * 1.2 : 9;
    if ((this.hits >= 6 || dying) && !quiet) { if ((this.flickT -= d) <= 0) { this.flickT = 0.4; this.flick = this.lcg() < 0.5 ? 0.45 : 1; } } else this.flick = 1; // (a change at most 2.5 times a second)
    this.dim += (this.flick - this.dim) * Math.min(1, d * 12);
    const rg = (U.uDmRage.value = Math.max(rage, 0.6 * tele + 0.8 * strike, gloat, roar)), pw = (this.pow * (0.85 + 0.25 * rage + 0.3 * tele + 0.25 * strike + 0.5 * onset + 0.6 * gloat) + (dying && !this.blown ? 0.9 + 0.6 * roar : 0)) * this.dim;
    U.uSkGlow.value.setRGB(lerp(1, 1.5, rg), lerp(1, 0.3, rg), lerp(1, 0.24, rg)).multiplyScalar(pw); // its neon: magenta, crimson in a rage
    U.uLdCoreK.value = 0.5 + 1.6 * beat + 0.9 * (this.wounds >= 4 ? 1 : 0) + 1.2 * (kind === 3 ? tele : 0);
    U.uLdEyeK.value = 0.8 + 1.4 * tele + 1.0 * strike + 0.8 * rage + onset + gloat;
    this.flash = Math.max(0, this.flash - d * 5);
    U.uSkHit.value.copy(this.flashCol).multiplyScalar(this.flash * 1.6); // (a rim of the answer's colour along its edges: it is seen taking the hit, not whited out)
    U.uLdCrack.value += ((dying ? 1 : hurt * 0.6) - U.uLdCrack.value) * Math.min(1, d * 3);
    U.uLdCrackCol.value.setRGB(2.6, 0.5, 0.7).multiplyScalar(0.6 + 0.6 * beat);
    U.uLdWound.value.forEach((w) => { if (w.w > 0 && w.grow) w.w = Math.min(w.grow, w.w + d * w.grow * 5); }); // a wound opens in a fifth of a second
    const pano = g.pano, rimK = 0.95 + 0.25 * rage + 0.35 * tele + 0.3 * gloat + 0.3 * roar;
    if (pano) { U.uSkRimA.value.copy(pano.rimA.color).multiplyScalar(rimK); U.uSkRimB.value.copy(pano.rimB.color).multiplyScalar(rimK); } else { U.uSkRimA.value.setRGB(1.2, 0.25, 1.0).multiplyScalar(rimK); U.uSkRimB.value.setRGB(0.2, 0.9, 1.4).multiplyScalar(rimK); }
    const charge = Math.max(kind === 0 ? tele : 0.25 * tele, strike * (kind === 0 ? 0.7 : 0.25), 0.3 * rage, 0.8 * roar, 0.7 * gloat);
    U.uLdClaw.value.setRGB(1.3, 0.3, 2.4).lerp(this._c2.setRGB(2.4, 0.2, 0.4), rg).multiplyScalar(charge * 2.4);
    const open = Math.min(1, (kind === 2 ? 1.2 * tele + strike : 0.3 * tele) + 0.5 * kick + 0.8 * flare + 0.9 * roar + 0.7 * onset + 0.8 * gloat); // (its mouth: light in it when it roars)
    U.uLdMouth.value.setRGB(2.6, 0.5, 1.1).multiplyScalar(open * 2.2 * this.pow);
    this._c.setRGB(2.4, 0.25, 1.4).lerp(this._c2.setRGB(3.0, 0.25, 0.4), rg); // the core's colour: magenta, crimson in a rage
    this.coreGlow.material.color.copy(this._c);
    this.coreGlow.material.opacity = Math.min(1, pw * (0.16 + 0.22 * beat + 0.25 * (this.wounds >= 4 ? 1 : 0) + 0.2 * rage));
    this.coreGlow.scale.setScalar(0.2 + 0.06 * beat + 0.1 * (this.wounds >= 4 ? 1 : 0));
    this.eyeGlow.material.opacity = Math.min(1, pw * (0.2 + 0.5 * tele + 0.4 * strike + 0.3 * rage + 0.5 * onset + 0.5 * gloat));
    this.eyeGlow.scale.setScalar(0.1 + 0.06 * Math.min(1, tele + strike + rage));
    this.eyeDots.forEach((s) => { s.material.opacity = Math.min(1, pw * 0.9); s.scale.setScalar(0.028 + 0.012 * Math.min(1, tele + strike + rage)); });
    this.keyLight.position.copy(this.root.position).add(this._a.set(-0.75 * S, 0.8 * S, 1.5 * S));
    this.keyLight.intensity = 2.4 * (0.4 + 0.6 * this.pow);
    this.keyLight.distance = 4.5 * S;
    if (pano && pano.key) this.keyLight.color.copy(pano.key.color);
    this.maw.material.opacity = Math.min(1, open * 0.9 * this.pow);
    this.maw.scale.setScalar(0.1 + 0.12 * open);
    this.claws.forEach((s, i) => { s.material.opacity = Math.min(1, charge * 0.9); s.scale.setScalar(0.1 + 0.16 * charge * (1 + 0.12 * sin(t * 9 + i * 2))); s.visible = !this.lost[i ? "handR" : "handL"]; });
    this.glow.material.opacity = this.pow * (0.2 + 0.06 * tele + 0.1 * gloat) + 0.14 * roar;
    this.glow.material.color.setRGB(0.35, 0.3, 0.9).lerp(this._c2.setRGB(0.5, 0.12, 0.5), rg); // (it stays cold: in a rage its red neon stands against it)
    this.aimPoint(this.coreLight.position);
    this.coreLight.position.z += 0.12 * S;
    this.coreLight.color.copy(this._c).multiplyScalar(0.4);
    this.coreLight.intensity = pw * (1.2 + 1.6 * beat + 1.2 * rage + 2.5 * this.flash);
    this.coreLight.distance = 2.6 * S;
    this.heat = Math.max(0.25 * rage, tele, strike * 0.8, dying ? 0.9 : 0, gloat);
    // the aura: the edges of the view glow red. It breathes slowly in a rage, swells as the rage begins, and fills the
    // view for its last stand and when it has won. (Not with Reduced effects.)
    const au = quiet ? 0 : rage * (0.2 + 0.07 * sin(t * 2.6)) + 0.16 * tele + 0.4 * onset + 0.8 * gloat + 0.95 * roar;
    if (au > 0.01) {
      const cam = g.camera, b = g.bandSize(6);
      this.aura.visible = true;
      this.aura.position.copy(cam.position).add(this._a.set(0, 0, -6).applyQuaternion(cam.quaternion));
      this.aura.quaternion.copy(cam.quaternion);
      this.aura.scale.set(b.w * 1.3, b.h * 1.3, 1); // (its brightest part lies just outside the band)
      this.auraU.uK.value = au;
    }
    this.root.updateMatrixWorld(true);

    // ---- the strike, when the show does not stage it: one blow on the shield as it lands
    if (A) {
      if (!g.show && !A.hit && A.time > 0.78) { A.hit = true; g.jet.shieldLost(); Sound.sfx(kind === 2 ? "demonroar" : "demonrelease"); }
      if (A.time > 1.5) this.att = null;
    }
    // arriving: it spreads its wings and roars, once
    if (!this.roared && this.inT > 0.68 && this.inT < 1) {
      this.roared = true;
      if (g.show) g.show.demonRoar(this); else { Sound.sfx("demonroar"); if (!quiet) g.shockwave(this.mouth(this._a).clone(), new THREE.Color(1.3, 0.25, 1.0), 4.2 * k6, 0.8); }
    }
    // ---- what comes off it: embers, and sparks from its wounds
    if (this.inT > 0.5 && !this.blown) {
      if ((this.emberT -= d) <= 0) {
        this.emberT = (quiet ? 0.5 : 0.22) / (1 + 2.6 * rage + 2 * roar);
        g.bursts.burst(this.at([rand(-0.3, 0.3), rand(-0.1, 0.35), rand(-0.1, 0.15)], this._a), rage > 0.5 || this.lcg() < 0.5 ? 0xff3a5a : 0xd04fff, { n: 1, speed: 0.6 * k6, size: 0.1 * k6, life: 1.5, gravity: 1.6 });
      }
      if (this.wounds > 0 && !quiet && (this.sparkT -= d) <= 0) {
        this.sparkT = rand(1.2, 2.6) / (1 + hurt);
        const W = LORD.WOUNDS[Math.floor(this.lcg() * this.wounds)];
        if (g.show) g.show.demonLeak(this, this.at(W, this._a)); else g.bursts.burst(this.at(W, this._a), 0xff7a4a, { n: 12, speed: 4 * k6, size: 0.13 * k6, life: 0.45 });
      }
    }
    // ---- dying: it reels (or, in its last stand, roars), then the blast throws every part of it clear and it burns up
    if (dying) {
      const blowAt = this.finale ? 1.5 : 1.15;
      if (!this.blown && this.dieT > blowAt) this.blow();
      if (this.blown) {
        const b = this.dieT - blowAt;
        U.uSkGone.value = clamp(b / 1.2, 0, 1); // (its torso burns away where it stood)
        U.uSkHot.value.multiplyScalar(Math.pow(0.1, d));
        [this.coreGlow, this.eyeGlow, this.maw, this.glow].concat(this.claws, this.eyeDots).forEach((s) => { s.material.opacity = 0; });
        this.keyLight.intensity = 0;
        this.coreLight.intensity *= Math.max(0, 1 - b);
      }
      if (this.dieT > blowAt + 1.9 && !this.scrap.length) { this.dieT = -1; this.root.visible = false; if (this.pending) this.arrive(); }
    }
  }
  // (after the fighter has had its say) the air shimmers round it when it rears, strikes, rages or burns
  late() { if (this.root.visible && this.heat > 0.3) GFX.heatAt(this.g.camera, this.aimPoint(this._a), 0.5 * this.S, this.heat); }
  dispose() {
    const mats = [this.mat].concat(this.scrapMat);
    blasterDropMaps(mats);
    mats.concat([this.aura.material, this.coreGlow.material, this.eyeGlow.material, this.maw.material, this.glow.material], this.claws.map((s) => s.material), this.eyeDots.map((s) => s.material)).forEach((m) => m.dispose());
    this.aura.geometry.dispose();
    this.g.scene.remove(this.aura);
    // (parts that were in flight when the scene closed are in the scene itself and go with it)
  }
}
