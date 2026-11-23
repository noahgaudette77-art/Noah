// Risk Blaster's enemy when its model arrived (Assets.model("demon"); without it 20h's demon flies, as before): a
// ram-horned overlord in black chrome, wings of armour blades, a reactor core burning magenta in its chest. The
// model is eleven rigid parts (body, head, tail, two wings, and each arm as shoulder, elbow, hand); every move is
// posed here from smooth curves. Look and sound only. The game still asks, times, checks and scores:
//   a wave starts            it flies up out of the distance, throws its wings wide and roars
//   while the clock runs     it comes closer; as the last half second runs out it is already winding up
//   a right answer           the fighter's fire lands on its core: it is thrown back, and is a little more broken
//   a wrong answer, or none  it winds up (the warning) and strikes: five strikes in turn, each wound up its own way
//   the last three questions it rages
//   the wave is cleared      it dies: a chain of blasts takes it apart, then the last one
// The blows, the bolts and the blasts themselves are staged by 20l-blasterstage.js (g.stage) from what happens here.
// Everything runs on the show clock (VFX.dt): a hit-stop holds it still, and the rules never wait for it.
const LORD = {
  width: 1.0, height: 0.98, // the model: one unit across the wings
  RIDE: { core: "body", thrusters: "body", mouth: "head", eyes: "head", clawL: "handL", clawR: "handR", wingTipL: "wingL", wingTipR: "wingR", tailTip: "tail" },
  TREE: { head: "body", wingL: "body", wingR: "body", shoulderL: "body", shoulderR: "body", tail: "body" }, // (everything hangs from its torso; the arms are chains already)
  // The strikes, in the order it uses them, and when each lets go (seconds after it starts to wind up).
  //   volley    both claws raised at the player: a burst of plasma bolts from each in turn
  //   swipe     it draws back, one arm cocked high, then lunges and rakes its claws across the fighter
  //   wave      wings wide, head thrown back: it roars a ring of force down the way
  //   beam      arms drawn in round its core, which burns white: a beam swept across the fighter
  //   missiles  wings raised high: seekers leave its wing tips and curve in
  ATTACKS: ["volley", "swipe", "wave", "beam", "missiles"], GO: 0.3,
  // how long each strike is in flight once it is let go (seconds, on the show clock). A wrong answer's strike has
  // landed before the explanation sheet comes up; a strike wound up as the clock runs down (from PRE seconds left)
  // is let go that long before it runs out, and lands as it does.
  PRE: 0.62, FLY: [0.2, 0.1, 0.26, 0.15, 0.25],
  BREAK: ["handL", "hornR", "wingR", "handR", "tail", "hornL", "wingL"], // the order it comes apart in when it is done for
  TAIL: -0.5, // its tail is carried back a little, clear of the fighter's nose when it has come close
};

const lordUniforms = () => Object.assign(blasterSkinUniforms(), {
  uLdWound: { value: [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector4(0, 0, 0, 0)) }, uLdCoreP: { value: new THREE.Vector3() }, uLdCoreS: { value: new THREE.Vector3(1.7, 0.42, 1) }, uLdEyeP: { value: new THREE.Vector3() }, uLdMouthP: { value: new THREE.Vector3() }, uLdClawP: { value: new THREE.Vector3() }, uLdTipP: { value: new THREE.Vector3() }, uLdCoreK: { value: 0 }, uLdEyeK: { value: 0 }, uLdSweep: { value: 9 }, uLdCrack: { value: 0 },
  uLdCrackCol: { value: new THREE.Color(2.6, 0.5, 0.7) }, uLdClaw: { value: new THREE.Color(0, 0, 0) }, uLdMouth: { value: new THREE.Color(0, 0, 0) }, uLdTip: { value: new THREE.Color(0, 0, 0) },
  uDmRage: { value: 0 }, // (how red its mood is: the built-in fighter's back takes its colour from this)
});
const LORD_GLSL = {
  key: "lord",
  pars: "uniform vec4 uLdWound[6]; uniform float uLdCoreK; uniform float uLdEyeK; uniform float uLdSweep; uniform float uLdCrack; uniform vec3 uLdCrackCol; uniform vec3 uLdClaw; uniform vec3 uLdMouth; uniform vec3 uLdTip; uniform vec3 uLdCoreP; uniform vec3 uLdCoreS; uniform vec3 uLdEyeP; uniform vec3 uLdMouthP; uniform vec3 uLdClawP; uniform vec3 uLdTipP;",
  // its wounds: armour eaten away from each (a ragged edge, from a noise), burning where it ends, scorched round that
  cut: `float ldW = 9.0;
        for (int i = 0; i < 6; i++) { if (uLdWound[i].w > 0.0) ldW = min(ldW, length(vRest - uLdWound[i].xyz) / uLdWound[i].w); }
        float ldN = skN(vRest * 46.0) * 0.6 + skN(vRest * 110.0) * 0.4, ldCut = ldW + (ldN - 0.5) * 0.6;
        if (ldCut < 0.8) discard;
        float ldEdge = 1.0 - smoothstep(0.8, 1.04, ldCut), ldScorch = 1.0 - smoothstep(0.95, 2.0, ldCut);`,
  albedo: "diffuseColor.rgb *= 1.0 - 0.8 * ldScorch;",
  emissive: `vec3 ldC = (vRest - uLdCoreP) * uLdCoreS, ldE = (vRest - uLdEyeP) * vec3(1.0, 2.0, 1.0); // (its core is a rift down its chest: taller than it is wide)
        float ldCore = exp(-dot(ldC, ldC) * 520.0), ldEye = exp(-dot(ldE, ldE) * 800.0);
        totalEmissiveRadiance *= max(1.0 - smoothstep(uLdSweep - 0.08, uLdSweep, vRest.y), min(1.0, ldCore + ldEye)); // its lights come on from the bottom up as it arrives; its core and its eyes burn from the first frame
        totalEmissiveRadiance *= 1.0 + uLdCoreK * ldCore + uLdEyeK * ldEye; // and brighter than its strips
        float ldV = abs(skN(vRest * 31.0) - 0.5) * 2.0; // cracks: thin veins that spread from patch to patch as it is hurt
        totalEmissiveRadiance += uLdCrackCol * ((1.0 - smoothstep(0.0, 0.06, ldV)) * smoothstep(1.0 - uLdCrack, 1.3 - uLdCrack, skN(vRest * 6.5 + 3.1)) * step(0.001, uLdCrack));
        totalEmissiveRadiance += vec3(5.5, 1.7, 0.5) * ldEdge * (0.55 + 0.45 * ldN) + vec3(1.0, 0.16, 0.3) * ldScorch * 0.2;
        vec3 ldA = vec3(abs(vRest.x), vRest.y, vRest.z), ldH = ldA - uLdClawP, ldM = vRest - uLdMouthP, ldT = (ldA - uLdTipP) * vec3(1.0, 0.6, 1.0);
        totalEmissiveRadiance += uLdClaw * exp(-dot(ldH * vec3(1.0, 0.7, 1.0), ldH * vec3(1.0, 0.7, 1.0)) * 300.0) * (0.2 + 0.8 * skF) + uLdMouth * exp(-dot(ldM, ldM) * 1500.0) + uLdTip * exp(-dot(ldT, ldT) * 60.0) * (0.2 + 0.8 * skF); // energy in its claws, light in its mouth, a charge along its wing blades`,
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
    this.U.uSkSpec.value = 1.5;
    this.U.uSkBurn.value.setRGB(5, 0.9, 2.6); // (where it is eaten away it burns magenta: its own colour, not a fire's)
    // where its lights and its wounds are, from the model's own anchors and pivots (so they follow the model that arrived)
    const AN = M.info.anchors || {}, piv = (n) => ((M.info.parts || {})[n] || {}).pivot || [0, 0, 0], an = (n) => AN[n] || [0, 0, 0], mix3 = (p, q, k, o = [0, 0, 0]) => [p[0] + (q[0] - p[0]) * k + o[0], p[1] + (q[1] - p[1]) * k + o[1], p[2] + (q[2] - p[2]) * k + o[2]];
    const core = an("core");
    this.home = {};
    Object.keys(J).forEach((n) => { this.home[n] = piv(n); });
    this.U.uLdCoreP.value.fromArray(core); this.U.uLdEyeP.value.fromArray(an("eyes")); this.U.uLdMouthP.value.fromArray(an("mouth"));
    this.U.uLdClawP.value.fromArray(mix3(piv("handL"), an("clawL"), 0.6)); this.U.uLdTipP.value.fromArray(mix3(piv("wingL"), an("wingTipL"), 0.85));
    // The wounds a wave's hits open in it, in order: a place on the model at rest and how wide (its own units).
    // Armour is eaten away there to a burning edge; what is behind shows through.
    this.wounds3 = [
      [core[0] + 0.075, core[1] + 0.03, core[2] - 0.03, 0.036], // the plate over its left breast
      mix3(piv("wingR"), an("wingTipR"), 0.5, [0, -0.05, 0]).concat(0.07), // a hole through its right wing
      [core[0] - 0.07, core[1] - 0.06, core[2] - 0.03, 0.034], // the plate under its right breast
      mix3(piv("wingL"), an("wingTipL"), 0.42, [0, -0.04, 0]).concat(0.08), // a hole through its left wing
      [piv("shoulderL")[0] + 0.06, piv("shoulderL")[1] + 0.01, piv("shoulderL")[2] + 0.02, 0.042], // its left shoulder
      [core[0] + 0.02, core[1] - 0.15, core[2] - 0.04, 0.036], // its belly
    ];
    this.mat = blasterSkin(M.mesh.body.material, this.U, LORD_GLSL);
    this.mat.color.setScalar(1.3); // (black chrome mirrors little: a shade lighter, and its plates show what stands round it)
    g.chrome(this.mat, 1.7);
    // a part that has come away burns up on its own: it wears a copy of the skin with its own heat and its own dissolve
    this.scrapN = 0;
    this.scrapU = [0, 1, 2, 3, 4, 5, 6, 7].map(() => Object.assign({}, this.U, { uSkGone: { value: 0 }, uSkHot: { value: new THREE.Color(0, 0, 0) }, uSkGlow: { value: new THREE.Color(1, 1, 1) } }));
    this.scrapMat = this.scrapU.map((U) => g.chrome(blasterSkin(this.mat.clone(), U, LORD_GLSL), 1.7));
    this.scrap = []; // parts in flight: { j, v, w, t, slot }

    // ---- light with no surface: its core, its eyes and mouth, the energy in its claws and wing tips, a breath of light behind it
    const spr = (host, color, size, order = 3) => { const s = glowSprite(color, size, 0); s.renderOrder = order; host.add(s); return s; };
    this.coreGlow = spr(A.core, new THREE.Color(2.4, 0.25, 1.4), 0.3);
    this.eyeGlow = spr(A.eyes, new THREE.Color(2.6, 0.2, 1.2), 0.12);
    this.eyeDots = [-0.031, 0.031].map((x) => { const s = spr(A.eyes, new THREE.Color(3.0, 0.5, 1.6), 0.03, 4); s.position.set(x, 0.002, 0.004); return s; }); // a point of light in each eye: they are seen from the far end of a wave
    this.maw = spr(A.mouth, new THREE.Color(2.6, 0.5, 1.2), 0.16);
    this.claws = [spr(A.clawL, new THREE.Color(1.3, 0.35, 2.6), 0.2), spr(A.clawR, new THREE.Color(1.3, 0.35, 2.6), 0.2)];
    this.tips = [spr(A.wingTipL, new THREE.Color(2.6, 1.3, 0.3), 0.16), spr(A.wingTipR, new THREE.Color(2.6, 1.3, 0.3), 0.16)];
    this.glow = glowSprite(new THREE.Color(0.35, 0.3, 0.9), 2.4, 0); // (cold light behind it: its dark wings and horns stand against it)
    this.glow.position.set(0, 0.05, -0.3);
    this.glow.renderOrder = 2;
    pose.add(this.glow);
    this.coreLight = new THREE.PointLight(0xff3ad4, 0, 14, 2); // its core lights its own chest and arms, and the fighter when it comes close
    this.keyLight = new THREE.SpotLight(0xdfe6ff, 0, 30, 0.5, 0.7, 1.5); // a lamp of its own, above and before it on the key's side, aimed at it alone: it is lit wherever it flies, and the fighter under it is not
    g.scene.add(this.coreLight, this.keyLight, this.keyLight.target);
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
    this.att = null; this.atkN = 0; // the strike under way: { time, kind, go, pre }
    this.recoil = [0, 0]; // each arm's kick as its claw lets a bolt go (the stage sets these)
    this.dieT = -1; this.pending = false; this.blown = false; this.chain = 0;
    this.finale = false; this.finaleDone = false;
    this.rageOn = false; this.rageT = 9; this.gloatT = -1; this.beatN = 0;
    this.flap = 0; this.rage = 0; this.pow = 0; this.flick = 1; this.dim = 1; this.flickT = 0; this.emberT = 0; this.sparkT = 3; this.heat = 0; this.roared = false; this.seed = 7741; this.wounds = 0; this.lost = {};
    this.flash = 0; this.flashCol = new THREE.Color(1, 1, 1);
    this.crit = false; this.critK = 0; this.critT = 0; this.critN = 0; this.blowAt = 0.5; // the wave's last blow has landed: it hangs there breaking up until the wave is closed (look only)
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._d = new THREE.Vector3(); this._c = new THREE.Color(); this._c2 = new THREE.Color();
  }
  lcg() { return (this.seed = (this.seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // Its size and height, from the room there is: at its closest its wings fill the band from side to side; when a
  // question starts it is two thirds of that.
  fit(band) {
    this.fitS = clamp(Math.min((band.h * 0.98) / LORD.height, (band.w * 0.9) / LORD.width), 1.5, 14);
    this.fitY = (band.h * 0.17) / DEMON_NEAR;
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

  // where a part that was shot away used to hang
  stump(name, out) { return this.at(this.home[name] || [0, 0, 0], out); }
  // a place along a wing, toward its tip (j: 0 to 3, two to a wing; a wing shot away: its shoulder)
  wingBlade(j, out) {
    const sd = j % 2 ? "R" : "L", w = this.J["wing" + sd];
    if (this.lost["wing" + sd] || !w) return this.J["shoulder" + sd].getWorldPosition(out);
    return w.getWorldPosition(out).lerp(this.A["wingTip" + sd].getWorldPosition(this._b), 0.55 + (j >> 1) * 0.3);
  }
  // A wave starts: the next demon flies up out of the distance. (If the last one is still breaking up, it waits for that.)
  arrive() {
    if (this.dieT >= 0) { this.pending = true; return; }
    const U = this.U;
    this.alive = true; this.att = null; this.hits = 0; this.adv = 0; this.kick = this.kickTo = 0; this.rage = 0; this.pow = 0.6; this.roared = false; this.pending = false; this.blown = false; this.stagger = 0; this.chain = 0;
    this.finale = false; this.rageOn = false; this.rageT = 9; this.wounds = 0; this.lost = {}; this.crit = false; this.critK = 0;
    this.inT = REDUCED_MOTION ? 1 : 0;
    U.uSkGone.value = 0; U.uSkHot.value.setRGB(0, 0, 0); U.uLdCrack.value = 0;
    U.uLdWound.value.forEach((w) => w.set(0, 0, 0, 0));
    // whole again: every part back on its joint, in its own skin
    this.scrap.length = 0;
    for (const n of this.names) { const j = this.J[n], h = j.userData.home; h.parent.add(j); j.position.copy(h.p); j.quaternion.copy(h.q); j.scale.setScalar(1); j.visible = true; if (this.model.mesh[n]) this.model.mesh[n].material = this.mat; }
    this.root.visible = true;
    if (this.g.stage) this.g.stage.demonArrive(this);
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
    if (this.att && (!this.att.go || (this.att.early && !this.att.counted))) { this.att = null; if (g.stage) g.stage.demonFoiled(this); } // (struck as it wound up for the clock running out, or just as it let go: the blow breaks its strike)
    if (g.inWave >= WAVE_LEN - 1) { this.critT = 0; this.critN = 0; }
    if (this.hits % 3 === 0) this.stagger = 1; // every third blow staggers it
    if (g.inWave >= WAVE_LEN - 1) { this.crit = true; this.stagger = 1; } // the wave's last question, answered right: this blow is the one it does not get up from
    if (g.stage) g.stage.demonHit(this, p, color, this.stagger > 0); else { g.blastAt(p, color, 0.42); Sound.sfx("demonhit"); }
    this.damage();
  }
  // What a wave's hits do to it, in order: wounds open (2nd, 3rd, 5th, 6th, 7th, 9th hit), its tail is shot away
  // (4th), a wing is torn off (8th).
  damage() {
    const h = this.hits, g = this.g, J = this.J;
    const open = { 2: 0, 5: 1, 6: 2, 7: 3, 9: 4 }[h];
    if (open !== undefined) {
      const W = this.wounds3[open], u = this.U.uLdWound.value[open];
      u.set(W[0], W[1], W[2], 0.001);
      u.grow = W[3];
      this.wounds = Math.max(this.wounds, open + 1);
      if (g.stage) g.stage.demonWound(this, open); else Sound.sfx("demonshed");
    }
    const part = { 3: this.twist > 0 ? "hornL" : "hornR", 4: "tail", 6: this.lost.hornL ? "hornR" : "hornL", 8: this.twist > 0 ? "wingL" : "wingR" }[h];
    if (part && J[part]) this.shed(part);
  }
  // A part comes away: it is cut loose from its joint, thrown clear, and burns up as it falls behind.
  // quiet: no blast of its own (the death's chain stages those).
  shed(name, quiet) {
    const j = this.J[name], g = this.g;
    if (!j || this.lost[name] || !j.visible) return null;
    const slot = this.scrapN++ % this.scrapMat.length, U = this.scrapU[slot], p = j.getWorldPosition(new THREE.Vector3());
    this.lost[name] = true;
    g.scene.attach(j); // (it keeps its place, size and turn in the world)
    j.traverse((o) => { if (o.isMesh) o.material = this.scrapMat[slot]; });
    U.uSkGone.value = 0; U.uSkHot.value.setRGB(2.4, 0.5, 1.0); U.uSkGlow.value.setRGB(1, 1, 1);
    const out = this._d.copy(p).sub(this.root.position);
    out.z = 0;
    if (out.lengthSq() < 0.01) out.set(0, -1, 0);
    out.normalize();
    // thrown clear on the frame of the blow, spinning: its tail down and toward the lens, a horn up and out, a wing
    // or a hand out to its own side
    const sgn = () => (Math.random() < 0.5 ? -1 : 1), tail = name === "tail";
    const v = tail ? new THREE.Vector3(sgn() * rand(5, 7), -2.5, 6) : name.startsWith("horn") ? new THREE.Vector3(out.x * 5 + rand(-1, 1), 5, 6) : new THREE.Vector3(out.x * rand(4, 6), out.y * rand(2, 4) + 1.2, rand(3, 6));
    const s = { j, name, slot, t: 0, life: quiet ? 0.8 : 0.6, v, w: new THREE.Vector3(sgn() * rand(4, 7), sgn() * rand(2, 5), sgn() * rand(11, 15)) }; // (it always spins)
    this.scrap.push(s);
    if (g.stage && !quiet) g.stage.demonShed(this, p, name, s);
    return s;
  }
  // A wrong answer, or none in time: it winds up, then strikes. If the clock ran out, it has been winding up for the
  // last half second already (see update) and now lets go.
  attack() {
    const g = this.g;
    if (this.att && !this.att.go) { this.att.go = true; this.atkN++; return; }
    if (this.att && this.att.early && !this.att.counted) { this.att.counted = true; this.atkN++; return; } // (let go already as the clock ran down: this is the shield it was for)
    if (this.att) return;
    if (!this.alive) { g.jet.shieldLost(); if (g.stage) g.stage.playerHit(null, -1); return; } // (between demons: the shield still shows the hit)
    this.att = { time: 0, kind: this.atkN++ % LORD.ATTACKS.length, go: true, pre: false };
    if (g.stage) g.stage.demonAttack(this, this.att); else Sound.sfx("demoncharge");
  }
  // The wave is cleared: it dies. (Once in a run, at the wave that takes the player past their best score, it makes
  // a last stand of it first. Read from the saved scores; nothing is written.)
  destroy() {
    if (!this.alive) return;
    const g = this.g;
    this.alive = false;
    this.att = null;
    this.dieT = 0;
    this.blown = false; this.chain = 0;
    this.finale = !this.finaleDone && typeof Store !== "undefined" && g.score > Store.best("blaster");
    if (this.finale) this.finaleDone = true;
    // what is still on it comes away in a quick chain (a claw, a horn, a wing ...), then the blast takes the rest: all
    // of it over well before the next question comes up
    this.order = LORD.BREAK.filter((n) => this.J[n] && !this.lost[n]);
    this.blowAt = Math.max(0.32, 0.22 + this.order.length * 0.07);
    if (g.stage) g.stage.demonDeath(this); else Sound.sfx(this.finale ? "demonroarlong" : "demonroar");
  }
  // the blast that ends it: every part still on it is thrown clear, and its torso burns away where it stood
  blow() {
    const g = this.g, p = this.aimPoint(new THREE.Vector3());
    this.blown = true;
    this.flash = 1; this.flashCol.setRGB(1, 0.9, 0.95);
    for (const n of this.names) if (n !== "body" && !this.lost[n]) this.shed(n, true);
    this.U.uSkHot.value.setRGB(2.6, 0.5, 1.3);
    if (g.stage) g.stage.demonBlast(this, p); else { g.blastAt(p, g.waveCol.getHex(), 1); Sound.sfx("demonboom"); }
  }
  // advance: how much of the question's time has gone (0 to 1), or null between questions
  update(dt, advance) {
    const g = this.g, d = VFX.dt, t = VFX.t, U = this.U, J = this.J, quiet = REDUCED_MOTION || GFX.calm, ship = g.ship.position, sin = Math.sin, cos = Math.cos;
    this.S = Motion.damp(this.S, this.fitS, 3, d);
    this.yK = Motion.damp(this.yK, this.fitY, 3, d);
    const S = this.S, k6 = S / 6;
    // parts that have come away: they tumble off, fall behind, and burn up
    for (let i = this.scrap.length - 1; i >= 0; i--) {
      const s = this.scrap[i], Us = this.scrapU[s.slot];
      s.t += d;
      const u = s.t / s.life;
      s.j.position.addScaledVector(s.v, d);
      s.v.multiplyScalar(Math.pow(0.5, d)); s.v.y -= 1.6 * d;
      s.j.rotation.x += s.w.x * d; s.j.rotation.y += s.w.y * d; s.j.rotation.z += s.w.z * d;
      Us.uSkGone.value = clamp((u - 0.5) / 0.5, 0, 1);
      Us.uSkHot.value.multiplyScalar(Math.pow(0.12, d));
      Us.uSkGlow.value.multiplyScalar(Math.pow(0.05, d));
      if (u >= 1) { s.j.visible = false; this.scrap.splice(i, 1); }
    }
    this.aura.visible = false;
    if (!this.root.visible) { this.coreLight.intensity = this.keyLight.intensity = 0; return; }

    // ---- how it is: arriving, raging, hurt, winding up, striking, winning, dying (each a smooth weight, 0 to 1)
    const dying = this.dieT >= 0;
    if (dying) this.dieT += d;
    if (this.inT < 1) this.inT = Math.min(1, this.inT + d / 2.0);
    // As the clock runs out it starts to wind up, half a second early: if the time does run out, its strike is let go
    // at once (attack); if an answer lands first, the wind-up is broken (hit) or becomes the strike (a wrong answer).
    if (this.alive && !this.att && this.inT >= 1 && g.state === "ask" && g.tLeft > 0 && g.tLeft < LORD.PRE) {
      this.att = { time: 0, kind: this.atkN % LORD.ATTACKS.length, go: false, pre: true };
      if (g.stage) g.stage.demonAttack(this, this.att);
    }
    const A = this.att;
    // Wound up for the clock running out, it lets go a moment early, so that its strike reaches the fighter as the
    // clock does run out (the stage lands it once the rule has taken the shield). If the answer comes first and is
    // right, the strike is broken (hit).
    if (A && A.pre && !A.go && g.stage && g.state === "ask" && g.tLeft > 0 && g.tLeft < LORD.FLY[A.kind] - 0.03 && A.time >= LORD.GO - 0.05) { A.go = A.early = true; A.time = LORD.GO; }
    if (A) A.time = A.go ? A.time + d : Math.min(LORD.GO - 0.04, A.time + d); // (wound up and held until it is let go)
    const inK = Math.pow(1 - this.inT, 3), flare = smoothstep(0.6, 0.78, this.inT) * (1 - smoothstep(0.86, 1, this.inT)); // (its wings thrown wide as it arrives)
    // rage: the wave's last three questions. As it begins it throws its wings wide and roars, once.
    const rageNow = this.alive && g.inWave >= WAVE_LEN - 3;
    if (rageNow && !this.rageOn) { this.rageT = 0; if (g.stage) g.stage.demonRage(this); else Sound.sfx("demonrage"); }
    this.rageOn = rageNow;
    this.rageT += d;
    this.rage = Motion.damp(this.rage, rageNow ? 1 : 0, 1.5, d);
    const rage = this.rage, hurt = clamp((this.hits - 1) / 7, 0, 1), onset = smoothstep(0, 0.25, this.rageT) * (1 - smoothstep(0.55, 1.3, this.rageT));
    // the run is over: it has won, and roars over the wreck with its wings spread
    if (g.state === "over" && this.alive && this.gloatT < 0 && (this.overT = (this.overT || 0) + d) > (g.stage ? 0.75 : 0)) { this.gloatT = 0; if (g.stage) g.stage.demonGloat(this); else Sound.sfx("demonroarlong"); }
    if (this.gloatT >= 0) this.gloatT += d;
    const gloat = this.gloatT >= 0 ? smoothstep(0, 0.35, this.gloatT) * (1 - smoothstep(1.7, 2.6, this.gloatT)) : 0;
    // a strike: tele is the wind-up (the warning), strike what follows the moment it lets go; one of each per kind
    const kind = A ? A.kind : -1, GO = LORD.GO;
    const tele = A ? smoothstep(0, GO - 0.12, A.time) * (1 - smoothstep(GO - 0.02, GO + 0.1, A.time)) : 0;
    const strike = A ? smoothstep(GO - 0.02, GO + 0.1, A.time) * (1 - smoothstep(GO + 0.24, GO + 0.7, A.time)) : 0;
    const tV = kind === 0 ? tele : 0, tS = kind === 1 ? tele : 0, tW = kind === 2 ? tele : 0, tB = kind === 3 ? tele : 0, tM = kind === 4 ? tele : 0;
    const sV = kind === 0 ? strike : 0, sS = kind === 1 ? strike : 0, sW = kind === 2 ? strike : 0, sB = kind === 3 ? strike : 0, sM = kind === 4 ? strike : 0;
    this.kickTo *= Math.pow(0.03, d);
    this.kick = Motion.damp(this.kick, this.kickTo, 27.4, d);
    this.stagger = Math.max(0, this.stagger - d / 1.0);
    const stg = sin(Math.min(1, this.stagger * 1.25) * Math.PI) * 0.8; // staggered: it sags and reels, then gathers itself
    // dying: it sags and reels; in its last stand it rears back and roars first
    this.critK = Motion.damp(this.critK, this.crit && this.alive ? 1 : 0, 2.5, d);
    const crit = this.critK;
    const blowAt = this.blowAt, stag = dying ? smoothstep(0, 0.2, this.dieT) : 0, kick = this.kick, roar = dying && this.finale ? stag * (1 - smoothstep(blowAt * 0.45, blowAt * 0.75, this.dieT)) : 0, sag = Math.max(stag - roar, stg, 0.55 * crit);
    const over = dying && !this.blown ? smoothstep(0.1, blowAt, this.dieT) : 0; // its core running away, toward the blast
    const raise = Math.min(1.2, tV + 0.75 * sV + 0.8 * roar + 0.7 * gloat + 0.5 * onset + 0.7 * flare); // (arms up and out, claws open at the player)
    // wings: a slow beat, faster in a rage and as it flies in. Each down-beat is heard, quietly.
    this.flap += d * (2.6 + 3.2 * rage + 7 * Math.min(1, inK * 4) + 2.2 * tele + 3 * gloat) * (quiet ? 0.6 : 1);
    const ph = this.flap, beat = Math.pow(0.5 + 0.5 * sin(t * (5.4 + 3 * rage + 9 * over)), 6), beatN = Math.floor((ph - 1.5708) / 6.2832);
    if (beatN !== this.beatN) { this.beatN = beatN; if (this.inT > 0.25 && !dying && g.state !== "over") Sound.sfx("demonflap", clamp(this.root.position.x * 0.1, -0.6, 0.6), { vol: 0.5 }); } // (not once the run is over: it is seen to gloat, and after its roar nothing more is heard)
    // ---- where it is: as far ahead as the time left says, further when a hit has thrown it back, flying up when it is new
    if (dying) this.adv = Motion.damp(this.adv, 0.9, 2.6, d); // (dying, it falls in toward the fighter: its end is seen close)
    else if (advance !== null) this.adv = Motion.damp(this.adv, advance, 5, d);
    else if (!A) this.adv = Motion.damp(this.adv, this.crit ? 0.45 : 0, 1.1, d);
    const lunge = (sS * 3.2 + sW * 1.4 + sB * 0.9 + sV * 0.5 - tS * 2.4 - (tele - tS) * 0.5) * (REDUCED_MOTION ? 0.3 : 1);
    const z = -lerp(DEMON_FAR, DEMON_NEAR, this.adv) - kick * (REDUCED_MOTION ? 3 : 7) - inK * 130 + lunge - stag * 0.6 + gloat * 3;
    const bob = quiet ? 0 : -sin(ph + 0.4) * 0.014 * S * (1 + 0.5 * rage);
    const lost = (this.lost.wingL ? 1 : 0) - (this.lost.wingR ? 1 : 0); // (a wing gone: it lists toward the side that still flies)
    this.root.position.set((quiet ? 0 : sin(t * 0.45) * 0.06 * S) - lost * 0.04 * S, this.yK * -z + bob + (quiet ? 0 : sin(t * 0.8) * 0.012 * S) + (tS * 0.07 + tW * 0.03 + tM * 0.02 - sS * 0.09) * S - sag * 0.08 * S + roar * 0.05 * S - inK * 9, z);
    this.pose.scale.setScalar(S);
    const dv = this._d.subVectors(ship, this.root.position), toShip = Math.atan2(dv.x, dv.z), down = Math.atan2(-dv.y, Math.hypot(dv.x, dv.z));
    // the whole of it: leaning over the player; back as it rears and when it is hit; down into its strike
    this.tilt.rotation.set(
      0.08 + down * 0.3 - 0.1 * tV - 0.34 * tS - 0.3 * tW - 0.14 * tB + 0.14 * tM + 0.12 * sV + 0.55 * sS + 0.36 * sW + 0.18 * sB - 0.06 * sM - 0.45 * kick - 0.3 * sag - 0.3 * roar - 0.2 * gloat + 0.5 * Math.min(1, inK * 3) - 0.22 * flare,
      toShip * 0.5 + this.twist * 0.2 * kick + (sS - tS) * this.twist * 0.25,
      (quiet ? 0 : sin(t * 0.7) * 0.035) + this.twist * 0.16 * kick + lost * 0.14 + (dying ? sin(this.dieT * 13) * 0.08 * (1 - 0.6 * smoothstep(0.5, blowAt, this.dieT)) : 0) + stg * 0.12 * sin(t * 9) + crit * 0.07 * sin(t * 3.1) + (rage > 0.5 ? 0.012 * sin(t * 9.1) * sin(t * 1.7) : 0) - tS * this.twist * 0.18 + sS * this.twist * 0.3);
    // ---- its joints. Angles from smooth curves; what is further out follows a little later.
    const breath = sin(t * 1.9), sway = quiet ? 0.4 : 1, amp = (quiet ? 0.5 : 1) * (1 + 0.35 * rage) * (1 - 0.7 * stag) * (1 - 0.6 * tele);
    // wings: raised (up), swept forward to shield or strike (fwd), and beating
    const up = 0.26 * tV + 0.22 * tS + 0.58 * tW - 0.12 * tB + 0.78 * tM - 0.1 * sV - 0.5 * sS - 0.32 * sW + 0.1 * sB - 0.7 * sM + 0.42 * flare - 0.5 * sag + 0.5 * roar - 0.22 * kick + 0.38 * onset + 0.45 * gloat - 0.5 * Math.min(1, inK * 3);
    const fwd = -0.1 * tV + 0.5 * tS - 0.3 * tW + 0.42 * tB - 0.25 * tM + 0.65 * sS + 0.55 * sW - 0.25 * sB + 0.6 * sM + 0.5 * kick + 0.25 * sag - 0.2 * roar + 0.6 * Math.min(1, inK * 3);
    const wing = (sd) => sd * (0.02 + up + amp * 0.11 * sin(ph) + 0.015 * sin(t * 0.6 + sd));
    if (J.wingL) J.wingL.rotation.set(amp * 0.03 * sin(ph - 0.6), -fwd - amp * 0.09 * cos(ph), wing(1));
    if (J.wingR) J.wingR.rotation.set(amp * 0.03 * sin(ph - 0.6), fwd + amp * 0.09 * cos(ph), wing(-1));
    // body and tail: breathing, and a sway that runs down it
    J.body.rotation.set(0.03 * breath + 0.02 * sin(ph + 1.2) * amp, (quiet ? 0 : sin(t * 0.5) * 0.05) + (sS - tS) * this.twist * 0.2, 0);
    J.body.scale.setScalar(1 + 0.012 * breath + 0.03 * tW);
    // (Phase 5: as it comes close it carries its tail further back and a little aside, so the tail never crosses the
    // fighter's canopy below it)
    const tailNear = smoothstep(0.35, 0.9, this.adv);
    if (J.tail) J.tail.rotation.set(LORD.TAIL - 0.75 * tailNear + 0.1 * sin(t * 0.9 + 0.2) * sway - 0.2 * raise + 0.35 * strike * (1 - 0.6 * tailNear) + 0.45 * kick + 0.3 * sag, 0.12 * sin(t * 0.7) * sway, 0.16 * sin(t * 0.9 - 0.9) * sway + 0.3 * tailNear);
    // head: it watches the player (the pointer turns it a little); thrown back by a hit and by its roars; it lolls as it dies
    this.look = Motion.damp(this.look, (quiet ? 0 : 0.14 * sin(t * 0.6) + clamp(Pointer.x, -1, 1) * 0.3) * (1 - strike), 7.4, d);
    this.nod = Motion.damp(this.nod, (0.2 - clamp(Pointer.y, -1, 1) * 0.1) - 0.14 * tV - 0.1 * tS - 0.62 * tW + 0.14 * tB + 0.26 * tM + 0.36 * sS + 0.5 * sW + 0.1 * sB - 0.5 * kick - 0.4 * roar - 0.32 * gloat - 0.3 * onset - 0.4 * flare, 9.8, d);
    if (J.head) J.head.rotation.set(this.nod + (rage > 0.5 && !quiet ? 0.03 * sin(t * 7.3) * sin(t * 1.3) : 0) + 0.35 * sag * sin((dying ? this.dieT : t) * 3 + 1), this.look + 0.3 * sag * sin((dying ? this.dieT : t) * 4), 0.05 * sin(t * 0.8) * sway + this.twist * 0.22 * kick + 0.25 * sag);
    // arms: hanging, swaying, the hands flexing; each strike has its own carriage; thrown wide by a hit
    this.recoil[0] *= Math.pow(0.002, d); this.recoil[1] *= Math.pow(0.002, d);
    const arm = (sd, i, sh, el, ha) => {
      const o = sd * 1.3, hi = sd * this.twist > 0 ? 1 : 0.2, rc = this.recoil[i]; // (hi: the arm that swipes)
      if (sh) sh.rotation.set(0.04 * sin(t * 0.9 + o) * sway - 0.25 * raise + 0.4 * tS * hi - 0.9 * sS * hi + 0.2 * tW - 0.3 * sW - 0.2 * tB + 0.3 * tM - 0.3 * kick + 0.25 * rc, 0,
        sd * (0.03 * sin(t * 0.7 + o) * sway + 0.42 * raise + 0.8 * tS * hi - 0.5 * sS * hi + 0.3 * tW - 0.38 * tB + 0.55 * sB - 0.1 * tM + 0.4 * kick - 0.12 * sag + 0.05 * breath));
      if (el) el.rotation.set(0.05 * sin(t * 1.1 + o + 0.6) * sway - 0.4 * raise - 0.45 * tS * hi + 0.7 * sS * hi - 0.5 * tB + 0.2 * sB + 0.2 * tM - 0.25 * kick + 0.2 * sag + 0.2 * rc, 0, sd * (0.3 * raise + 0.3 * tS * hi - 0.4 * sS * hi - 0.5 * tB + 0.4 * sB + 0.25 * kick));
      if (ha) ha.rotation.set(-0.06 + 0.08 * sin(t * 1.3 + o + 1.2) * sway - 0.75 * raise - 0.3 * tS * hi + 0.6 * sS * hi - 0.55 * tB - 0.2 * sB + 0.3 * tM + 0.25 * sag + 0.1 * rage * sin(t * 3.1 + o) + 0.3 * rc, 0, sd * (0.04 * sin(t * 1.7 + o) * sway + 0.25 * raise - 0.5 * sS * hi - 0.5 * tB + 0.3 * sB));
    };
    arm(1, 0, J.shoulderL, J.elbowL, J.handL);
    arm(-1, 1, J.shoulderR, J.elbowR, J.handR);

    // ---- its light
    const lit = this.inT > 0.55 && !dying;
    this.pow = Motion.damp(this.pow, lit ? 1 : dying ? 0 : 0.6, dying ? 6 : 2.5, d); // (its core, its eyes and its rims burn from the first frame of its fly-in: it is never a dark shape on dark space)
    U.uLdSweep.value = this.inT < 1 ? -0.55 + smoothstep(0.55, 1, this.inT) * 1.2 : 9;
    if ((this.hits >= 6 || dying || this.crit) && !quiet) { if ((this.flickT -= d) <= 0) { this.flickT = 0.4; this.flick = this.lcg() < 0.5 ? 0.45 : 1; } } else this.flick = 1; // (a change at most 2.5 times a second)
    this.dim = Motion.damp(this.dim, this.flick, 13.4, d);
    const rg = (U.uDmRage.value = Math.max(rage, 0.5 * tele + 0.7 * strike, gloat, roar)), pw = (this.pow * (0.85 + 0.25 * rage + 0.3 * tele + 0.25 * strike + 0.5 * onset + 0.6 * gloat) + (dying && !this.blown ? 0.7 + 0.5 * roar + 0.4 * over : 0)) * this.dim;
    U.uSkGlow.value.setRGB(lerp(1, 1.5, rg), lerp(1, 0.3, rg), lerp(1, 0.24, rg)).multiplyScalar(pw); // its neon: magenta, crimson in a rage
    U.uLdCoreK.value = 0.5 + 1.6 * beat + 0.9 * (this.wounds >= 4 ? 1 : 0) + 3.0 * tB + 2.0 * sB + 2.5 * over + 1.2 * crit;
    U.uLdEyeK.value = 0.8 + 1.4 * tele + 1.0 * strike + 0.8 * rage + onset + gloat;
    this.flash = Math.max(0, this.flash - d * 6.5);
    U.uSkHit.value.copy(this.flashCol).multiplyScalar(this.flash * 0.45); // (a rim of the answer's colour along its edges: it is seen taking the hit, not whited out)
    U.uLdCrack.value = Motion.damp(U.uLdCrack.value, dying ? 0.9 : Math.max(hurt * 0.6, 0.8 * crit), 3, d);
    U.uLdCrackCol.value.setRGB(2.6, 0.5, 0.7).multiplyScalar(0.5 + 0.5 * beat + 0.7 * over); // (thin bright veins: it is still seen as what it is, breaking)
    U.uLdWound.value.forEach((w) => { if (w.w > 0 && w.grow) w.w = Math.min(w.grow, w.w + d * w.grow * 5); }); // a wound opens in a fifth of a second
    const pano = g.pano, rimK = 0.95 + 0.25 * rage + 0.35 * tele + 0.3 * gloat + 0.3 * roar;
    if (pano) { U.uSkRimA.value.copy(pano.rimA.color).multiplyScalar(rimK); U.uSkRimB.value.copy(pano.rimB.color).multiplyScalar(rimK); } else { U.uSkRimA.value.setRGB(1.2, 0.25, 1.0).multiplyScalar(rimK); U.uSkRimB.value.setRGB(0.2, 0.9, 1.4).multiplyScalar(rimK); }
    U.uSkKick.value.setRGB(0.5, 0.86, 1.15).multiplyScalar(1.5 * (0.35 + 0.65 * this.pow) * (1 - 0.35 * rage)); // (a cold kicker from above and behind: wings, horns and shoulders are drawn in cyan-white against the sky)
    // what it is gathering, and where: violet plasma in its claws, light in its mouth, its core, amber along its wing blades
    const cClaw = Math.max(tV, 0.7 * sV, 0.3 * rage, 0.8 * roar, 0.7 * gloat, 0.6 * tS), cTip = Math.max(tM, 0.5 * sM);
    U.uLdClaw.value.setRGB(1.3, 0.3, 2.4).lerp(this._c2.setRGB(2.4, 0.2, 0.4), Math.max(rage, tS)).multiplyScalar(cClaw * 2.4);
    U.uLdTip.value.setRGB(2.6, 1.2, 0.25).multiplyScalar(cTip * 2.2);
    const open = Math.min(1, 1.2 * tW + sW + 0.5 * kick + 0.8 * flare + 0.9 * roar + 0.7 * onset + 0.8 * gloat); // (its mouth: light in it when it roars)
    U.uLdMouth.value.setRGB(2.6, 0.5, 1.1).multiplyScalar(open * 1.5 * this.pow);
    this._c.setRGB(2.4, 0.25, 1.4).lerp(this._c2.setRGB(3.0, 0.25, 0.4), rg).lerp(this._c2.setRGB(3.0, 2.6, 2.4), Math.max(0.7 * tB, 0.8 * over)); // the core's colour: magenta, crimson in a rage, white as it charges or runs away
    this.coreGlow.material.color.copy(this._c);
    this.coreGlow.material.opacity = Math.min(1, pw * (0.16 + 0.22 * beat + 0.25 * (this.wounds >= 4 ? 1 : 0) + 0.2 * rage + 0.6 * tB + 0.35 * over));
    { const cs = 0.2 + 0.06 * beat + 0.1 * (this.wounds >= 4 ? 1 : 0) + 0.1 * tB + 0.1 * over; this.coreGlow.scale.set(cs * 0.55, cs * 1.5, 1); } // (the glow of a rift: taller than it is wide)
    this.eyeGlow.material.opacity = Math.min(1, pw * (0.2 + 0.5 * tele + 0.4 * strike + 0.3 * rage + 0.5 * onset + 0.5 * gloat));
    this.eyeGlow.scale.setScalar(0.1 + 0.06 * Math.min(1, tele + strike + rage));
    this.eyeDots.forEach((s) => { s.material.opacity = Math.min(1, pw * 0.9); s.scale.setScalar(0.028 + 0.012 * Math.min(1, tele + strike + rage)); });
    this.maw.material.opacity = Math.min(1, open * 0.9 * this.pow);
    this.maw.scale.setScalar(0.05 + 0.06 * open);
    this.claws.forEach((s, i) => { s.material.opacity = Math.min(1, cClaw * 0.9); s.scale.setScalar(0.05 + 0.08 * cClaw * (1 + 0.12 * sin(t * 9 + i * 2))); s.visible = !this.lost[i ? "handR" : "handL"]; });
    this.tips.forEach((s, i) => { s.material.opacity = Math.min(1, cTip); s.scale.setScalar(0.05 + 0.08 * cTip); s.visible = !this.lost[i ? "wingR" : "wingL"]; });
    this.glow.material.opacity = this.pow * (0.2 + 0.06 * tele + 0.1 * gloat) + 0.14 * roar;
    this.glow.material.color.setRGB(0.35, 0.3, 0.9).lerp(this._c2.setRGB(0.5, 0.12, 0.5), rg); // (it stays cold: in a rage its red neon stands against it)
    this.aimPoint(this.coreLight.position);
    this.coreLight.position.z += 0.12 * S;
    this.coreLight.color.copy(this._c).multiplyScalar(0.4);
    this.coreLight.intensity = pw * (1.2 + 1.6 * beat + 1.2 * rage + 0.8 * this.flash + 3 * tB + 1.5 * over);
    this.coreLight.distance = 2.6 * S;
    this.keyLight.position.copy(this.root.position).add(this._a.set(-0.75 * S, 0.8 * S, 1.5 * S));
    this.aimPoint(this.keyLight.target.position);
    this.keyLight.intensity = this.blown ? 0 : 2.4 * (0.4 + 0.6 * this.pow);
    this.keyLight.distance = 4.5 * S;
    if (pano && pano.key) this.keyLight.color.copy(pano.key.color);
    this.heat = Math.max(0.25 * rage, tele, strike * 0.8, dying ? 0.45 : 0, gloat);
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

    // ---- the strike is over when its carriage is; without the stage, one blow on the shield as it lands
    if (A) {
      if (!g.stage && A.go && !A.hit && A.time > GO + 0.28) { A.hit = true; g.jet.shieldLost(); Sound.sfx(kind === 2 ? "demonroar" : "demonrelease"); }
      if (A.time > GO + 1.0) this.att = null;
    }
    // arriving: it spreads its wings and roars, once
    if (!this.roared && this.inT > 0.68 && this.inT < 1) {
      this.roared = true;
      if (g.stage) g.stage.demonRoar(this); else { Sound.sfx("demonroar"); if (!quiet) g.shockwave(this.mouth(this._a).clone(), new THREE.Color(1.3, 0.25, 1.0), 4.2 * k6, 0.8); }
    }
    // ---- what comes off it: embers, and sparks from its wounds
    if (this.inT > 0.5 && !this.blown) {
      if ((this.emberT -= d) <= 0) {
        this.emberT = (quiet ? 0.5 : 0.22) / (1 + 2.6 * rage + 2 * roar + 3 * over);
        const ec = rage > 0.5 || this.lcg() < 0.5 ? 0xff3a5a : 0xd04fff, ep = this.at([rand(-0.3, 0.3), rand(-0.1, 0.35), rand(-0.1, 0.15)], this._a);
        if (g.kit) g.kit.embers(ep, ec, { n: 1, radius: 0.1, life: 1.6, speed: 0.7 * k6, rise: 1.0 }); else g.bursts.burst(ep, ec, { n: 1, speed: 0.6 * k6, size: 0.1 * k6, life: 1.5, gravity: 1.6 });
      }
      if (this.wounds > 0 && !quiet && (this.sparkT -= d) <= 0) {
        this.sparkT = rand(1.2, 2.6) / (1 + hurt + 3 * crit);
        const W = this.wounds3[Math.floor(this.lcg() * this.wounds)];
        if (g.stage) g.stage.demonLeak(this, this.at(W, this._a)); else g.bursts.burst(this.at(W, this._a), 0xff7a4a, { n: 12, speed: 4 * k6, size: 0.13 * k6, life: 0.45 });
      }
    }
    // ---- done for (the wave's last blow has landed, its explanation is up): it comes apart a piece at a time
    if (this.crit && this.alive && g.stage && g.state === "explain" && (this.critT += d) > 0.6 + this.critN * 0.45) {
      const name = LORD.BREAK.find((n) => J[n] && !this.lost[n]);
      this.critN++;
      const sc = name && this.shed(name, true);
      if (sc) g.stage.demonChain(this, sc.j.getWorldPosition(this._a), this.critN);
    }
    // ---- dying: it reels (or, in its last stand, roars first), a chain of blasts takes it apart, then the last one
    // throws what is left of it clear and its torso burns away where it stood
    if (dying) {
      while (!this.blown && this.chain < this.order.length && this.dieT > 0.12 + this.chain * 0.07) {
        const s = this.shed(this.order[this.chain], true);
        if (s && g.stage) g.stage.demonChain(this, s.j.getWorldPosition(this._a), this.chain);
        this.chain++;
      }
      if (!this.blown && this.dieT > blowAt) this.blow();
      if (this.blown) {
        const b = this.dieT - blowAt;
        U.uSkGone.value = clamp(b / 0.75, 0, 1); // (gone well before the next question)
        U.uSkHot.value.multiplyScalar(Math.pow(0.1, d));
        [this.coreGlow, this.eyeGlow, this.maw, this.glow].concat(this.claws, this.eyeDots, this.tips).forEach((s) => { s.material.opacity = 0; });
        this.coreLight.intensity *= Math.max(0, 1 - b);
      }
      if (this.dieT > blowAt + 0.9 && !this.scrap.length) { this.dieT = -1; this.root.visible = false; if (this.pending) this.arrive(); }
    }
  }
  // (after the fighter has had its say) the air shimmers round it when it rears, strikes, rages or burns
  late() { if (this.root.visible && this.heat > 0.3) GFX.heatAt(this.g.camera, this.aimPoint(this._a), 0.5 * this.S, this.heat); }
  dispose() {
    const mats = [this.mat].concat(this.scrapMat);
    blasterDropMaps(mats);
    mats.concat([this.aura.material, this.coreGlow.material, this.eyeGlow.material, this.maw.material, this.glow.material], this.claws.map((s) => s.material), this.eyeDots.map((s) => s.material), this.tips.map((s) => s.material)).forEach((m) => m.dispose());
    this.aura.geometry.dispose();
    this.g.scene.remove(this.aura);
    // (parts that were in flight when the scene closed are in the scene itself and go with it)
  }
}
