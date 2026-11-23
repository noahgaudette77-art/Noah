// PROBATE TOLLGATE: a toll booth on tank tracks with a striped barrier arm and a claw. It is not a biped and has no
// skeleton or clips: its model comes as split parts with hinges (body, two tracks, a shoulder and a forearm each
// side: the claw on its left, the barrier on its right) and it is animated here, by code, as Risk Blaster's demon is.
// It answers the stage exactly as the rigged bosses' actor does (22d-bossactor.js): the same calls, the same places.
//   it rolls in on its tracks and brakes hard; it rocks on its tracks and its eye follows the player; its claw snaps;
//   attackA: the barrier arm rises with the charge and SLAMS down on the rule's frame; attackB: it rears back and
//   fires from its booth; a blow rocks it back on its tracks; it dies tipping over backward, tracks in the air.
class BossTollgate {
  constructor(game, model, row) {
    const g = (this.g = game);
    this.model = model; this.row = row;
    rigModel(model, { tree: { forearmL: "shoulderL", forearmR: "shoulderR", shoulderL: "body", shoulderR: "body" }, ride: { eye: "body", top: "body", console: "body", clawL: "forearmL", barrierTip: "forearmR" } });
    const P = (this.P = model.parts), A = model.anchors;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // (the whole machine on its suspension: it rocks, yaws and tips about its tracks)
    this.root.add(this.body);
    this.body.add(model.scene);
    this.mats = tuneModel(model, { env: row.env === undefined ? 2.2 : row.env, glow: 0 });
    this.glow = row.glow === undefined ? 2.3 : row.glow;
    this.power = 0;
    this.joint = { head: A.eye, chest: A.console, hips: P.body, handL: A.clawL, handR: A.barrierTip, footL: A.trackL, footR: A.trackR };
    this.signal = this.makeSignal(A.eye, row.env === undefined ? 2.2 : row.env, game.cfg.color);
    this.size = model.info.size || [1, 1, 0.66];
    // what it is doing: the barrier's lift (0 at rest, 1 raised over its head), its swing, the booth's rear and lurch
    this.lift = 0; this.liftTo = 0; this.slam = 0; this.rear = 0; this.rearTo = 0; this.lurch = 0;
    this.atkClip = null; this.swinging = false; this.sw0 = 0; this.rec = false;
    this.kick = 0; this.kickV = 0; this.lean = 0; this.idleRate = 1; this.wob = 0; this.wobT = 0;
    this.rageT = 0; this.deathT = -1; this.deathRate = 1; this.dead = false;
    this.rollT = -1; this.landed = false; this.justLanded = false; this.dustT = 0; this.play = null;
    this.snapT = 2; this.snap = 0; this.look = 0;
    // (the animation pass: a machine's way of moving: its arms on servos that overshoot and settle, its booth's sway on
    // its suspension sprung, its eye turned to the wizard, a blow's push from where it came; smooth at any frame rate)
    this.S = { kick: new Motion.Spring(1.9, 0.5), yaw: new Motion.Spring(2.2, 0.35), roll: new Motion.Spring(2.6, 0.3), lift: new Motion.Spring(2.6, 0.55), rear: new Motion.Spring(3, 0.5), look: new Motion.Spring(1.6, 0.75) };
    this.nHit = 0; this.seed = 1010; this.invQ = new THREE.Quaternion(); this._w = new THREE.Vector3(); this._d = new THREE.Vector3();
    this.scraps = []; this.torn = {};
    this.t = rand(0, 5);
    this._v = new THREE.Vector3(); this._x = new THREE.Vector3(1, 0, 0);
    this.rest = {}; for (const n of ["shoulderL", "shoulderR", "forearmL", "forearmR", "body", "trackL", "trackR"]) if (P[n]) this.rest[n] = P[n].rotation.clone();
    // how high it reaches, in its own heights: its booth, and its barrier raised over it (the lens keeps all of it in
    // the picture while it winds up)
    const sR = P.shoulderR, fR = P.forearmR;
    this.reach = { attackB: bossTop(model.scene) };
    if (sR && fR) { sR.rotation.x = this.rest.shoulderR.x - 2.15; fR.rotation.x = this.rest.forearmR.x - 0.35; this.reach.attackA = bossTop(model.scene); sR.rotation.copy(this.rest.shoulderR); fR.rotation.copy(this.rest.forearmR); }
  }
  // The round lamp in the booth's window is its lane signal, not an eye: a housing over it, a lens of small lamps that
  // burns amber and turns red as the boss charges, a hood over the lens with a neon edge, two guard bars across it.
  // (In the model's own units, set on the lamp's place: the housing covers the lamp the model was made with.)
  makeSignal(at, env, hex) {
    const grp = new THREE.Group(), R = 0.088, r = 0.064, z0 = -0.011; // (the lamp's place stands just in front of the booth's face; the lamp reaches about 0.066 from its middle)
    const metal = new THREE.MeshStandardMaterial({ color: 0x17131f, metalness: 0.85, roughness: 0.34, envMapIntensity: env, side: THREE.DoubleSide });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.014, 40).rotateX(Math.PI / 2), metal);
    plate.position.z = z0 + 0.007;
    // the lens: rows of small lamps, as a lane signal has
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    x.fillStyle = "#2a1406"; x.fillRect(0, 0, 64, 64);
    x.fillStyle = "#ffffff";
    for (let j = -4; j <= 4; j++) for (let i = -5; i <= 5; i++) { const px = 32 + i * 6.6 + (j & 1 ? 3.3 : 0), py = 32 + j * 5.8; if (Math.hypot(px - 32, py - 32) < 27.5) { x.beginPath(); x.arc(px, py, 2.4, 0, 7); x.fill(); } }
    this.lensTex = new THREE.CanvasTexture(c);
    this.lensMat = new THREE.MeshBasicMaterial({ map: this.lensTex, color: 0x000000 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(r, 36), this.lensMat);
    lens.position.z = z0 + 0.016;
    // the hood: a shell over the top and sides of the lens, standing out from the housing, its front edge lit
    const hl = 0.075, hr = r * 1.18, arc = Math.PI * 1.3, a0 = Math.PI - arc / 2;
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(hr, hr, hl, 30, 1, true, a0, arc).rotateX(Math.PI / 2), metal);
    hood.position.z = z0 + 0.014 + hl / 2;
    this.rimMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.rimCol = new THREE.Color(hex);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(hr, 0.0045, 6, 30, arc).rotateZ(a0 - Math.PI / 2), this.rimMat); // (the same arc as the hood's, over the top)
    rim.position.z = z0 + 0.014 + hl;
    // two guard bars across the lens
    const bars = [-0.3, 0.3].map((f) => { const b = new THREE.Mesh(new THREE.BoxGeometry(r * 2.15, 0.011, 0.012), metal); b.position.set(0, f * r, z0 + 0.024); return b; });
    // a soft halo in front of it (it blooms as a lamp does)
    this.halo = glowSprite(0xffffff, 0.3, 0);
    this.halo.position.z = z0 + 0.03;
    grp.add(plate, lens, hood, rim, ...bars, this.halo);
    at.add(grp);
    this.sigMetal = metal;
    this.sigCol = new THREE.Color(); this.sigAmber = new THREE.Color(1, 0.52, 0.07); this.sigRed = new THREE.Color(1, 0.05, 0.025);
    return grp;
  }
  has(name) { return name === "rage" || name === "death" || name === "hurt" || name === "stagger"; }
  at(name, out) {
    const j = name === "weapon" ? this.joint.handR : this.joint[name] || this.P[name] || this.joint.chest;
    return j.getWorldPosition(out);
  }
  // ---- the attack: attackA is the barrier's slam, attackB the booth's volley
  wind(clip, k) { if (this.dead) return; this.atkClip = clip; this.rec = false; this.swinging = false; if (clip === "attackA") this.liftTo = k; else this.rearTo = k; }
  swing(clip, u) {
    if (this.dead) return;
    if (!this.swinging) { this.swinging = true; this.sw0 = clip === "attackA" ? this.lift : this.rear; this.atkClip = clip; this.rec = false; }
    if (clip === "attackA") { // up (the rest of the way, fast), then down hard
      const top = Math.max(this.sw0, 0.75);
      if (u < 0.4) { this.lift = this.liftTo = lerp(this.sw0, top, u / 0.4); this.slam = 0; }
      else { const q = (u - 0.4) / 0.6; this.lift = this.liftTo = top; this.slam = q * q; }
    } else { this.rear = this.rearTo = lerp(this.sw0, 1, Math.min(1, u * 2.5)) * (1 - u * u); this.lurch = u * u; }
  }
  recover() { this.rec = true; this.swinging = false; }
  cancel() { this.rec = true; this.swinging = false; }
  // a blow it takes (the stage, as a right answer lands): rocked back on its suspension and turned away from where it came
  hit(from, at, big) {
    if (this.dead || !from || !at) return;
    const n = ++this.nHit, dir = this._d.subVectors(at, from).normalize().applyQuaternion(this.invQ), k = (big ? 1.5 : 1) * Motion.vary(this.seed, n, 0.75, 1.25);
    this.S.yaw.hit(0.1 * k * (dir.x + Motion.vary(this.seed, n + 3, -0.3, 0.3))); this.S.roll.hit(-0.04 * k * dir.x);
  }
  enrage() { if (!this.dead) { this.S.roll.hit(0.05); this.S.kick.hit(-0.08); } }
  get windT() { return 0; }
  // ---- reactions (the stage asks for them by the rigged bosses' clip names)
  react(name, o = {}) {
    if (name === "hurt") { this.wob = 0.5; this.wobT = 0; return 0.8; }
    if (name === "stagger") { this.wob = 1; this.wobT = 0; return 1.3; }
    if (name === "rage" || name === "win") { this.rageT = 2.3; return 2.3; }
    if (name === "death") { this.deathT = 0; this.deathRate = o.rate || 1; return BOSS_CLIP.death.end / this.deathRate; }
    return 0;
  }
  // it rolls in from the back of the arena and brakes hard
  enter() { this.rollT = 0; this.landed = false; }
  limp() { /* its arms are hinged, not hung: nothing to do */ }
  // a part comes off at its hinge (with what hangs from it) and is thrown
  tear(bone, vel, o = {}) {
    const b = this.P[bone];
    if (!b || this.torn[bone] || b.userData.torn) return null;
    this.root.updateMatrixWorld(true);
    const grp = new THREE.Group();
    b.getWorldPosition(grp.position);
    this.g.scene.add(grp);
    grp.updateMatrixWorld(true);
    b.traverse((n) => { n.userData.torn = true; });
    grp.attach(b);
    this.torn[bone] = true;
    const S = this.root.scale.x, sc = { grp, bone, v: vel.clone(), w: new THREE.Vector3(rand(-6, 6), rand(-4, 4), rand(-6, 6)), t: 0, life: o.life || 2.6, r: (o.r || 0.08) * S, rest: false };
    this.scraps.push(sc);
    return sc;
  }
  shatter(centre, speed) {
    const out = [];
    for (const n of ["forearmL", "forearmR", "shoulderL", "shoulderR", "trackL", "trackR", "body"]) {
      const b = this.P[n], big = n === "body"; // (the booth burns where it falls; thrown up, it stood in the air like the boss again)
      if (!b || b.userData.torn) continue;
      b.getWorldPosition(this._v);
      const v = this._v.clone().sub(centre); v.y = 0;
      if (v.lengthSq() < 1e-4) v.set(rand(-1, 1), 0, rand(-1, 1));
      v.normalize().multiplyScalar(speed * (big ? 0.1 : rand(0.6, 1.1))); v.y = big ? rand(-1, 0.4) : rand(0.8, 2.6);
      const sc = this.tear(n, v, { life: big ? rand(0.55, 0.7) : rand(1.3, 1.9) });
      if (sc) { sc.burn = big; if (big) sc.w.multiplyScalar(0.12); out.push(sc); }
    }
    return out;
  }
  update(d, o = {}) {
    const g = this.g, P = this.P, R = this.rest, rage = o.rage || 0, S = this.root.scale.x, quiet = REDUCED_MOTION || GFX.calm;
    this.t += d * this.idleRate * (rage ? 1.7 : 1);
    const t = this.t;
    // ---- the entrance: in from the back on its tracks, a hard stop that pitches it onto its nose, and down
    let roll = 0, brake = 0;
    if (this.rollT >= 0) {
      this.rollT += d;
      const u = Math.min(1, this.rollT / 0.72);
      roll = -17 * (1 - u) * (1 - u);
      if (u < 1 && (this.dustT -= d) <= 0 && g.kit && !quiet) { this.dustT = 0.05; for (const n of ["trackL", "trackR"]) g.kit.smoke(this.at(n === "trackL" ? "footL" : "footR", this._v).setY(0.3), { size: 0.9, life: 0.6, a: 0.4, cold: true, color: BOSS_ATK.SMOKE, vel: new THREE.Vector3(0, 0.6, -2), rise: 0.3 }); }
      const b = clamp((this.rollT - 0.6) / 0.24, 0, 1);
      brake = Math.sin(b * Math.PI) * 0.2;
      if (!this.landed && this.rollT >= 0.84) { this.landed = true; this.justLanded = true; }
      if (this.rollT > 1.1) this.rollT = -1;
    }
    // ---- the barrier and the booth
    if (this.rec) { this.liftTo = 0; this.rearTo = 0; this.slam = Math.max(0, this.slam - d * 2.2); this.lurch = Math.max(0, this.lurch - d * 3); if (this.slam <= 0 && this.lift < 0.02 && this.rear < 0.02) { this.rec = false; this.atkClip = null; } }
    // (on servos: the barrier and the booth go where they are sent and overshoot a little, then settle; a swing is driven
    // by the strike itself, and the servo follows on from where it left them)
    if (!this.swinging) { this.lift = this.S.lift.step(d, this.liftTo); this.rear = this.S.rear.step(d, this.rearTo); } else { this.S.lift.set(this.lift); this.S.rear.set(this.rear); }
    // ---- a blow rocks it back on its tracks; a heavy one sets it wobbling (the stage adds to kickV: a push, sized to the
    // old recoil's depth)
    this.model.scene.getWorldQuaternion(this.invQ).invert();
    if (this.kickV) { this.S.kick.hit(this.kickV * 0.048); this.kickV = 0; }
    this.kick = this.S.kick.step(d, 0);
    this.wobT += d; this.wob = Math.max(0, this.wob - d * 0.9);
    const wob = this.wob * Math.sin(this.wobT * 13) * 0.12;
    this.rageT = Math.max(0, this.rageT - d);
    const fury = Math.min(1, this.rageT * 2), shake = (fury * 0.03 + (rage ? 0.008 : 0)) * (quiet ? 0.2 : 1);
    // ---- its death: it shudders, then goes over backward about the back of its tracks
    let tip = 0;
    if (this.deathT >= 0) {
      this.deathT += d * this.deathRate;
      const C = BOSS_CLIP.death, q = clamp((this.deathT - C.fall * 0.7) / (C.down - C.fall * 0.7), 0, 1);
      tip = q * q * 1.5 + Math.sin(Math.min(1, this.deathT / (C.fall * 0.7)) * Math.PI * 3) * 0.07 * (1 - q);
    }
    // its eye follows the wizard (o.look; else the lens): the whole booth turns a little toward it, on its servo
    let lookTo = 0;
    if (!this.dead) { const e = this.joint.head.getWorldPosition(this._w), dir = this._d.subVectors(o.look || g.camera.position, e).applyQuaternion(this.invQ); lookTo = clamp(Math.atan2(dir.x, dir.z) * 0.6 + Math.sin(t * 0.31) * 0.06, -0.4, 0.4); }
    this.look = this.S.look.step(d, lookTo);
    const pitch = -this.kick * 0.1 - this.rear * 0.16 + this.lurch * 0.2 + brake + this.slam * 0.12 + this.lean * 0.05 + Math.sin(t * 0.9) * 0.014 + wob - tip;
    const B = this.body, zp = pitch >= 0 ? 0.185 : -0.3, vt = t * 15; // (it tips about the back of its tracks, and noses down about their front; its shudder smooth, never a new random place each frame)
    B.rotation.set(pitch, this.look + this.S.yaw.step(d, 0) + Motion.noise(vt, 71) * shake, Math.sin(t * 0.7) * 0.012 + wob * 0.5 + this.S.roll.step(d, 0) + Motion.noise(vt, 72) * shake);
    this._v.set(0, 0, zp).applyAxisAngle(this._x, pitch);
    B.position.set(0, Math.sin(t * 1.7) * 0.005 + 0.012 * this.lift - this._v.y, roll / S + zp - this._v.z - this.kick * 0.12);
    // ---- its arms: the barrier rises with the charge and comes down; the claw reaches, and snaps
    const sR = P.shoulderR, sL = P.shoulderL, fR = P.forearmR, fL = P.forearmL, flop = Math.min(1, tip * 1.2);
    if (sR && !sR.userData.torn) sR.rotation.x = R.shoulderR.x - 2.15 * this.lift + (2.15 * this.lift + 0.25) * this.slam + Math.sin(t * 0.8 + 1) * 0.03 - fury * (0.9 + 0.25 * Math.sin(t * 14)) - flop * 0.9;
    if (fR && !fR.userData.torn) fR.rotation.x = R.forearmR.x - 0.35 * this.lift * (1 - this.slam) + fury * 0.2 * Math.sin(t * 17);
    if ((this.snapT -= d) <= 0) { this.snapT = rand(1.6, 3.6) / (rage ? 2 : 1); this.snap = 1; }
    this.snap = Math.max(0, this.snap - d * 3.2);
    const bite = Math.abs(Math.sin(this.snap * Math.PI * 2)) * 0.32; // (two quick snaps)
    if (sL && !sL.userData.torn) sL.rotation.x = R.shoulderL.x - 0.5 * this.rear - 0.25 * this.lift + Math.sin(t * 1.1) * 0.06 - fury * (1.1 + 0.25 * Math.sin(t * 15 + 1)) - flop * 0.9 - this.kick * 0.25;
    if (fL && !fL.userData.torn) { fL.rotation.x = R.forearmL.x - bite - 0.3 * this.rear + fury * 0.3 * Math.sin(t * 19); fL.rotation.z = R.forearmL.z + bite * 0.5; }
    // ---- its lights
    const br = 0.86 + 0.14 * Math.sin(t * (rage ? 3.2 : 1.7)), gl = this.glow * this.power * (br + (o.glow || 0)) * (o.flick === undefined ? 1 : o.flick);
    for (const m of this.mats) if (m.emissiveMap) m.emissiveIntensity = gl;
    // its signal: amber, turning red as it charges (a deep red at a low gain: a lit neon red goes pink), dark until it
    // powers up, failing as it dies
    const q = smoothstep(0.1, 0.8, o.charge || 0), lit = this.power * (o.flick === undefined ? 1 : o.flick);
    this.sigCol.copy(this.sigAmber).lerp(this.sigRed, q);
    this.lensMat.color.copy(this.sigCol).multiplyScalar(lerp(2.1, 1.3, q) * lit);
    this.rimMat.color.copy(this.rimCol).multiplyScalar(1.5 * lit);
    this.halo.material.color.copy(this.sigCol);
    this.halo.material.opacity = (0.3 + 0.2 * q) * lit;
    // ---- what has come off it
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const sc = this.scraps[i], gp = sc.grp;
      sc.t += d;
      if (!sc.rest) {
        gp.position.addScaledVector(sc.v, d); gp.position.y -= 10 * d * d; // (exact for its time step)
        sc.v.y -= 20 * d;
        gp.rotation.x += sc.w.x * d; gp.rotation.y += sc.w.y * d; gp.rotation.z += sc.w.z * d;
        if (gp.position.y < sc.r && sc.v.y < 0) { gp.position.y = sc.r; if (Math.abs(sc.v.y) < 2.2) sc.rest = true; else { sc.v.y *= -0.34; sc.v.x *= 0.6; sc.v.z *= 0.6; sc.w.multiplyScalar(0.5); } }
      }
      const k = 1 - smoothstep(sc.life - 0.35, sc.life, sc.t);
      if (k < 1) gp.scale.setScalar(Math.max(0.001, k));
      if (sc.t >= sc.life) { gp.visible = false; this.scraps.splice(i, 1); }
    }
  }
  dispose() { // (its parts are released with the scene; what was made here for its signal is released here)
    this.signal.traverse((n) => { if (n.geometry) n.geometry.dispose(); });
    [this.lensMat, this.rimMat, this.sigMetal, this.halo.material].forEach((m) => m.dispose());
    this.lensTex.dispose();
  }
}
