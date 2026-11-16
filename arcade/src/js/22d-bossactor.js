// A Boss Rush boss as a loaded model: rigid armour on a motion-captured skeleton, played by one actor.
//
// The model (see ASSETS.md): one root over an armature of bones; under each bone that owns armour, a node part_<Bone>
// with that bone's mesh. Its clips are motion capture at natural speed, in place. Nothing is skinned, so a part can be
// torn off its bone and thrown, and a bone can be turned after the clips have been applied.
//
// The actor does not play clips: it poses the skeleton. Every clip is an action that never runs on its own; each
// frame the actor says where in each clip the pose is taken from and how much of it counts (idle underneath, an
// attack scrubbed by the charge bar or swung on the rule's frame, a reaction played through over them), and the
// mixer blends them. So a wind-up can follow the charge, a strike can land on the frame a rule fires, and a hit can
// cut in at any moment. All of it is look: the game tells the actor what happened (22f-bossstage.js).
//
//   actor.root                    the node the stage places and scales (its origin is on the floor between the feet)
//   actor.update(d, o)            d: the show clock's step; o: { rage, glow } (see the stage)
//   actor.at(name, out)           a place on it, in the world: head, chest, hips, handL, handR, footL, footR, weapon
//   actor.enter(), .landed        the entrance: the last of the "enter" clip, dropped in from above
//   actor.wind(clip, k)           the attack's wind-up pose, k 0..1 (scrubbed by the charge)
//   actor.swing(clip, u)          the strike itself, u 0..1 (1: the blow is at its end)
//   actor.recover()               after a strike, or when a wind-up is broken off
//   actor.react(name, o)          play a clip through over everything: hurt, stagger, rage, death, win ...
//   actor.tear(bone, vel)         throw the armour of a bone (and of the bones below it) clear; returns the scrap
//   actor.limp(side, k)           an arm hangs
//
// The clips' key moments, found once by sampling them (seconds into each; the same captures on every boss):
const BOSS_CLIP = {
  attackA: { from: 0.9, top: 1.9, hit: 2.2, hold: 3.0, end: 3.7 }, // an overhead smash with both arms: raised by 1.9, down by 2.2, held, up again
  attackB: { from: 1.25, top: 2.05, hit: 2.58, hold: 3.6, end: 4.9 }, // an arm thrust at the lens: cocked by 2.05, out by 2.58, held, back
  enter: { from: 1.82, land: 2.27, end: 3.5 }, // a jump down: in the air until 2.27, a deep landing, risen by 3.5
  death: { fall: 1.25, down: 1.78, end: 3.0 }, // staggers, goes over backward from 1.25, flat on its back at 1.78
};
class BossActor {
  constructor(game, model, row) {
    const g = (this.g = game), P = (this.P = model.parts), J = model.info.joints || {};
    this.model = model; this.row = row;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // (lean, recoil and height above the floor, in the model's own units)
    this.root.add(this.body);
    this.body.add(model.scene);
    this.mats = tuneModel(model, { env: row.env === undefined ? 2.2 : row.env, glow: 0 });
    this.glow = row.glow === undefined ? 2.3 : row.glow;
    this.power = 0; // its lights: 0 dark, 1 on
    this.joint = { head: P[J.head || "Head"], chest: P[J.chest || "Spine02"], hips: P[J.hips || "Hip"], handL: P[J.handL || "L_Hand"], handR: P[J.handR || "R_Hand"], footL: P[J.footL || "L_Foot"], footR: P[J.footR || "R_Foot"] };
    // (a model whose feet are part of its shins has no foot bones: its ankles are then taken as the far ends of its
    // shin bones, a shin being about as long as a thigh)
    for (const sd of ["L", "R"]) if (!this.joint["foot" + sd]) { const calf = P[sd + "_Calf"], o = new THREE.Object3D(); o.position.set(0, calf ? calf.position.length() : 0, 0); (calf || this.joint.hips).add(o); this.joint["foot" + sd] = o; }
    for (const n of ["head", "chest", "handL", "handR"]) if (!this.joint[n]) this.joint[n] = this.joint.hips;
    // ---- the clips, as poses to blend
    this.mixer = new THREE.AnimationMixer(model.scene);
    this.act = {}; this.dur = {}; this.w = {};
    for (const c of model.animations) { const a = this.mixer.clipAction(c); a.play(); a.paused = true; a.setEffectiveWeight(0); this.act[c.name] = a; this.dur[c.name] = c.duration; this.w[c.name] = 0; }
    this.idleT = rand(0, 4); this.idleRate = 1;
    this.atk = { clip: null, t: 0, w: 0, to: 0, rec: false }; // the attack layer
    this.play = null; // a clip being played through over the rest: { name, t, end, rate, w, out, hold }
    // ---- where each clip stands: its feet are not always on the model's floor (a wide stance floats, the entrance
    // lands a storey down), so each clip is measured once and set on the floor
    this.ground = {}; this.cx = {}; this.cz = {}; // (and where its hips are: each clip is set over the middle of the floor too)
    const v = (this._v = new THREE.Vector3()), feet = () => Math.min(this.joint.footL.getWorldPosition(v).y, this.joint.footR.getWorldPosition(v).y);
    const poseAt = (name, t) => { for (const n in this.act) this.act[n].setEffectiveWeight(n === name ? 1 : 0); this.act[name].time = t; this.mixer.update(0); model.scene.updateMatrixWorld(true); };
    model.scene.updateMatrixWorld(true);
    let base = 0;
    if (this.act.idle) { poseAt("idle", 0); base = feet(); }
    for (const n in this.act) { poseAt(n, n === "enter" ? this.dur[n] - 0.05 : 0); this.ground[n] = feet() - base; this.joint.hips.getWorldPosition(v); this.cx[n] = v.x; this.cz[n] = v.z; }
    this.size = model.info.size || [0.6, 1, 0.3];
    // ---- the weapon's far end, in its hand's frame (a projectile leaves from there, a beam is drawn from there)
    const hp = P["part_" + (J.handR || "R_Hand")], hm = hp && (hp.isMesh ? hp : hp.children.find((c) => c.isMesh));
    this.tip = new THREE.Vector3();
    if (hm && this.act.idle) {
      poseAt("idle", 0);
      if (!hm.geometry.boundingBox) hm.geometry.computeBoundingBox();
      const c = hm.geometry.boundingBox.getCenter(new THREE.Vector3());
      this.joint.handR.worldToLocal(hm.localToWorld(c));
      this.tip.copy(c).multiplyScalar(row.tip === undefined ? 1.7 : row.tip); // (through the part's middle and out the far side)
    }
    for (const n in this.act) this.act[n].setEffectiveWeight(0);
    // ---- what moves on top of the clips
    this.look = new THREE.Vector2(); this.lookQ = new THREE.Quaternion(); this._e = new THREE.Euler(); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._d = new THREE.Vector3(); this._y = new THREE.Vector3(0, 1, 0);
    this.ovr = new Map();
    this.arm = { L: 0, R: 0 }; this.armTo = { L: 0, R: 0 }; // how limp each arm hangs
    this.kick = 0; this.kickV = 0; // a recoil along z, sprung
    this.lean = 0; this.drop = 0; this.yaw = 0;
    this.scraps = []; this.torn = {};
    this.t = 0; this.landed = false; this.dead = false;
    this.reactT = 0;
  }
  has(name) { return !!this.act[name]; }
  // A bone that is turned after the clips have been applied. (The mixer writes a bone only when its value has
  // changed: while the show stands still, the bone would be turned again and again. So what the mixer last wrote is
  // kept, and the bone is set back to it before it is turned.)
  base(bone) {
    let o = this.ovr.get(bone);
    if (!o) { o = { base: bone.quaternion.clone(), out: bone.quaternion.clone() }; this.ovr.set(bone, o); }
    else if (!bone.quaternion.equals(o.out)) o.base.copy(bone.quaternion);
    bone.quaternion.copy(o.base);
    return o;
  }
  // Every part still on the skeleton becomes a piece of its own, thrown outward from a point (the last blast).
  shatter(centre, speed) {
    const list = [], out = [], S = this.root.scale.x;
    this.model.scene.traverse((n) => { if (/^part_/.test(n.name) && !n.userData.torn) list.push(n); });
    this.root.updateMatrixWorld(true);
    for (const n of list) {
      const grp = new THREE.Group();
      n.getWorldPosition(grp.position);
      this.g.scene.add(grp);
      grp.updateMatrixWorld(true);
      n.userData.torn = true;
      grp.attach(n);
      const v = grp.position.clone().sub(centre); v.y = Math.abs(v.y) + 0.4; v.normalize().multiplyScalar(speed * rand(0.6, 1.2)); v.y += rand(3, 7);
      const sc = { grp, v, w: new THREE.Vector3(rand(-8, 8), rand(-6, 6), rand(-8, 8)), t: 0, life: rand(1.5, 2.2), r: 0.05 * S, rest: false };
      this.scraps.push(sc); out.push(sc);
    }
    return out;
  }
  // ---- places on it
  at(name, out) {
    if (name === "weapon") { this.joint.handR.updateWorldMatrix(true, false); return this.joint.handR.localToWorld(out.copy(this.tip)); }
    const j = this.joint[name] || this.P[name] || this.joint.chest;
    return j.getWorldPosition(out);
  }
  // ---- the attack layer
  wind(clip, k) { const a = this.atk, C = BOSS_CLIP[clip]; if (!this.act[clip] || this.dead) return; a.clip = clip; a.rec = false; a.t = lerp(C.from, C.top, k); a.to = smoothstep(0, 0.22, k); }
  swing(clip, u, from) { const a = this.atk, C = BOSS_CLIP[clip]; if (!this.act[clip] || this.dead) return; a.clip = clip; a.rec = false; a.t = lerp(from === undefined ? C.top : from, C.hit, u * u * (3 - 2 * u) * 0.35 + u * 0.65); a.to = 1; if (u > 0.25) a.w = Math.max(a.w, Math.min(1, u * 2.2)); }
  recover() { this.atk.rec = true; }
  get windT() { return this.atk.clip ? this.atk.t : 0; }
  // ---- a clip played through over everything else. o: { from, to, rate, in, out, hold }
  react(name, o = {}) {
    if (!this.act[name]) return 0;
    const end = o.to === undefined ? this.dur[name] - 0.02 : o.to, t = o.from || 0;
    this.play = { name, t, end, rate: o.rate || 1, w: this.play && this.play.name === name ? this.play.w : 0, in: o.in === undefined ? 0.08 : o.in, out: o.out === undefined ? 0.3 : o.out, hold: !!o.hold };
    return (end - t) / this.play.rate;
  }
  enter() { this.landed = false; this.entering = true; const C = BOSS_CLIP.enter; this.react("enter", { from: C.from, to: C.end, rate: 0.74, in: 0.001, out: 0.4 }); this.play.w = 1; this.drop = 1; }
  // ---- breakage
  // The armour of a bone, and of every bone below it, comes off as one piece and is thrown: vel in world units a second.
  tear(bone, vel, o = {}) {
    const b = this.P[bone];
    if (!b || this.torn[bone]) return null;
    const list = [];
    b.traverse((n) => { if (/^part_/.test(n.name) && !n.userData.torn) list.push(n); });
    if (!list.length) return null;
    this.root.updateMatrixWorld(true);
    const grp = new THREE.Group();
    b.getWorldPosition(grp.position);
    this.g.scene.add(grp);
    grp.updateMatrixWorld(true);
    list.forEach((n) => { n.userData.torn = true; grp.attach(n); });
    this.torn[bone] = true;
    const S = this.root.scale.x, sc = { grp, bone, v: vel.clone(), w: new THREE.Vector3(rand(-7, 7), rand(-5, 5), rand(-7, 7)), t: 0, life: o.life || 2.6, r: (o.r || 0.06) * S, rest: false };
    this.scraps.push(sc);
    return sc;
  }
  limp(side, k = 1) { this.armTo[side] = k; }
  update(d, o = {}) {
    const g = this.g, act = this.act, w = this.w, pl = this.play, a = this.atk;
    this.t += d;
    // ---- which clips count, and where in each
    for (const n in w) w[n] = 0;
    let p = 0;
    if (pl) {
      pl.t = Math.min(pl.end, pl.t + d * pl.rate);
      const left = (pl.end - pl.t) / pl.rate;
      pl.w = Math.min(1, pl.w + d / Math.max(1e-3, pl.in));
      p = pl.hold ? pl.w : Math.min(pl.w, left / Math.max(1e-3, pl.out));
      act[pl.name].time = pl.t;
      w[pl.name] = p;
      if (pl.name === "enter") {
        const C = BOSS_CLIP.enter;
        if (!this.landed && pl.t >= C.land) { this.landed = true; this.justLanded = true; }
        const u = clamp((pl.t - C.from) / (C.land - C.from), 0, 1);
        this.drop = 1 - u * u; // (it comes down faster and faster)
      }
      if (!pl.hold && pl.t >= pl.end) { this.play = null; this.entering = false; }
    }
    if (a.clip) {
      if (a.rec === "drop") { a.to = 0; if (a.w < 0.02) { a.clip = null; a.w = 0; } }
      else if (a.rec) { // after the blow: on through the clip, twice as fast, and out
        const C = BOSS_CLIP[a.clip];
        a.t = Math.min(C.end, a.t + d * (a.t < C.hold ? 2.4 : 1.6));
        a.to = a.t < C.hold ? 1 : 1 - smoothstep(C.hold, C.end, a.t);
        if (a.t >= C.end) { a.clip = null; a.w = 0; }
      }
      if (a.clip) { a.w += (a.to - a.w) * Math.min(1, d * (a.to > a.w ? 16 : 7)); act[a.clip].time = a.t; w[a.clip] += a.w * (1 - p); }
    }
    const idle = Math.max(0, 1 - p - (a.clip ? a.w * (1 - p) : 0));
    if (act.idle) { this.idleT = (this.idleT + d * this.idleRate * (o.rage ? 1.7 : 1)) % (this.dur.idle - 0.05); act.idle.time = this.idleT; w.idle = Math.max(idle, 0.0001); }
    let ground = 0, sum = 0, cx = 0, cz = 0;
    for (const n in w) { act[n].setEffectiveWeight(w[n]); ground += w[n] * (this.ground[n] || 0); cx += w[n] * (this.cx[n] || 0); cz += w[n] * (this.cz[n] || 0); sum += w[n]; }
    this.mixer.update(0);
    // ---- on top of the clips: the head follows the lens a little, an arm hangs, the body recoils
    const head = this.joint.head, lk = this.look, rage = o.rage || 0;
    if (head && !this.dead) {
      const tx = clamp(Pointer.x * 0.3 + Math.sin(this.t * 0.31) * 0.1 + (g.camBase ? g.camBase.x * 0.05 : 0), -0.5, 0.5) * (1 - p * 0.6), ty = Math.sin(this.t * 0.23) * 0.05 - 0.04 * rage;
      lk.x += (tx - lk.x) * Math.min(1, d * 3); lk.y += (ty - lk.y) * Math.min(1, d * 3);
      const o2 = this.base(head);
      head.quaternion.multiply(this.lookQ.setFromEuler(this._e.set(lk.y, lk.x, 0, "YXZ")));
      o2.out.copy(head.quaternion);
    }
    for (const sd of ["L", "R"]) {
      this.arm[sd] += (this.armTo[sd] - this.arm[sd]) * Math.min(1, d * 5);
      const k = this.arm[sd], up = this.P[sd + "_Upperarm"], fore = this.P[sd + "_Forearm"];
      if (k < 0.01 || !up) continue;
      // straight down from the shoulder, swinging a little: the bone's own +Y (its length) to that direction, in its parent's frame
      up.parent.updateWorldMatrix(true, false);
      up.parent.getWorldQuaternion(this._q2).invert();
      const sw = Math.sin(this.t * 2.1 + (sd === "L" ? 0 : 1.3)) * 0.07 + this.kick * 0.5;
      this._d.set((sd === "L" ? 1 : -1) * 0.14, -1, 0.1 + sw).normalize().applyQuaternion(this._q2);
      const ou = this.base(up);
      up.quaternion.slerp(this._q.setFromUnitVectors(this._y, this._d), k);
      ou.out.copy(up.quaternion);
      if (fore) { const of = this.base(fore); fore.quaternion.slerp(this._q.setFromEuler(this._e.set(0.12 + sw * 0.6, 0, 0, "XYZ")), k); of.out.copy(fore.quaternion); }
    }
    // a blow knocks it back and it springs forward again; an attack leans it in
    this.kickV += (-this.kick * 120 - this.kickV * 13) * d;
    this.kick += this.kickV * d;
    this.body.position.set(sum > 0 ? -cx / sum : 0, (sum > 0 ? -ground / sum : 0) + this.drop * (this.row.dropH || 1.5), (sum > 0 ? -cz / sum : 0) - this.kick * 0.22 + this.lean * 0.1);
    this.body.rotation.set(-this.kick * 0.12 + this.lean * 0.06, this.yaw, 0);
    // ---- its lights: off until it powers up, breathing, hotter as it winds up, flickering as it dies
    const br = 0.86 + 0.14 * Math.sin(this.t * (rage ? 3.2 : 1.7)), gl = this.glow * this.power * (br + (o.glow || 0)) * (o.flick === undefined ? 1 : o.flick);
    for (const m of this.mats) if (m.emissiveMap) m.emissiveIntensity = gl;
    // ---- what has been torn off: thrown, falling, turning, coming to rest on the floor, and gone
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const sc = this.scraps[i], gp = sc.grp;
      sc.t += d;
      if (!sc.rest) {
        sc.v.y -= 20 * d;
        gp.position.addScaledVector(sc.v, d);
        gp.rotation.x += sc.w.x * d; gp.rotation.y += sc.w.y * d; gp.rotation.z += sc.w.z * d;
        if (gp.position.y < sc.r && sc.v.y < 0) { gp.position.y = sc.r; sc.hit = (sc.hit || 0) + 1; sc.bounced = true; if (Math.abs(sc.v.y) < 2.2) { sc.rest = true; } else { sc.v.y *= -0.34; sc.v.x *= 0.6; sc.v.z *= 0.6; sc.w.multiplyScalar(0.5); } }
      }
      const k = 1 - smoothstep(sc.life - 0.35, sc.life, sc.t);
      if (k < 1) gp.scale.setScalar(Math.max(0.001, k));
      if (sc.t >= sc.life) { gp.visible = false; this.scraps.splice(i, 1); } // (it stays in the scene, unseen, and is released with it)
    }
  }
  // a wind-up broken off: back to its stance without the blow
  cancel() { const a = this.atk; if (a.clip && !a.rec) { a.rec = "drop"; a.to = 0; } }
  dispose() { this.mixer.stopAllAction(); }
}
