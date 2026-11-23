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
// How each boss moves (the animation pass, 2026-11-23: every boss played the same captured clips the same way and
// moved like a machine). The clips stay; each boss plays them with a body of its own, and lives between them:
//   tempo   its idle's pace (1: as captured; it drifts a little, never quite the same twice); rage: that pace raging (x)
//   breath  [breaths a second, depth in radians]: the chest rises and the shoulders with it
//   sway    [radians, a second's worth]: the body's slow drift and turn, its weight shifting
//   float   [its own heights, bobs a second]: it hovers, its legs hanging      bob: a bounce in its stance (heights)
//   hunch   its spine bent forward (radians): a predator's crouch, a brute's stoop (its head kept up)
//   gaze    [how quick its head turns (Hz), seconds between glances]; look: how far it turns to the wizard (0..1)
//   twitch  [seconds between tics, radians]: the head cocks, a shoulder jerks
//   mass    [Hz, damping] of its give: how it takes a blow and recovers (heavy: slow and sure; light: quick, wobbling)
//   hitK    how far a blow moves it; coil: how deep its wind-up gathers (it rears back before the blow)
//   tremble [radians, Hz]: the strain of a wind-up held at its top; lunge: how far it throws itself into a strike
//   squash  its give at a blow (its own heights); hold: how long it holds a blow at its end (x)
//   death   how it goes down: topple (the captured fall, landing hard), sink (it floats down), spasm (it jerks as it
//           falls), power (its power failing: the fall in stutters), crumple (folding forward as it goes)
//   servo   its idle moves in pulses, as a machine's joints do (0..1)
const BOSS_MOVE_BASE = { tempo: 1, rage: 1.4, breath: [0.25, 0.02], sway: [0.02, 0.2], float: null, bob: 0, hunch: 0, gaze: [1.4, 2.4], look: 0.7, twitch: null, mass: [1.8, 0.45], hitK: 1, coil: 1, tremble: [0.004, 12], lunge: 1, squash: 0.03, hold: 1, death: "topple", servo: 0 };
const BOSS_MOVE = {
  1: { tempo: 1.08, breath: [0.3, 0.018], sway: [0.032, 0.32], bob: 0.005, gaze: [2.2, 1.6], look: 0.8, mass: [2.4, 0.36], coil: 0.8, lunge: 0.9, squash: 0.02, hold: 0.85 }, // PRODUCT PUSHER: a salesman's easy swagger, quick to smile, quick to recover
  2: { tempo: 0.78, rage: 1.3, breath: [0.19, 0.042], sway: [0.02, 0.14], hunch: 0.1, gaze: [0.9, 3.2], mass: [1.25, 0.5], hitK: 0.65, coil: 1.35, tremble: [0.006, 9], lunge: 1.25, squash: 0.05, hold: 1.4 }, // PERILMONGER: a brute, heaving, stooped, its blows thrown from far back
  3: { tempo: 0.8, breath: [0.16, 0.015], sway: [0.05, 0.11], float: [0.045, 0.22], hunch: 0.04, gaze: [0.8, 2.6], mass: [0.9, 0.24], hitK: 1.35, coil: 0.9, tremble: [0.003, 6], lunge: 0.7, squash: 0.012, death: "sink" }, // SOLVENCY SPECTER: it floats and drifts; a blow sends it swaying away
  4: { tempo: 1.12, rage: 1.5, breath: [0.42, 0.014], sway: [0.018, 0.4], gaze: [4.5, 0.9], look: 0.8, twitch: [1.3, 0.12], mass: [3.2, 0.3], hitK: 1.15, coil: 0.7, tremble: [0.007, 18], lunge: 0.8, squash: 0.02, hold: 0.7, death: "spasm", servo: 0.45 }, // THE FINE PRINT: fussy and twitchy, its head snapping from thing to thing
  5: { tempo: 0.7, rage: 1.25, breath: [0.17, 0.03], sway: [0.022, 0.12], hunch: 0.06, gaze: [0.8, 3.6], mass: [1.1, 0.55], hitK: 0.55, coil: 1.4, tremble: [0.005, 8], lunge: 1.0, squash: 0.06, hold: 1.5 }, // GROUP GOLEM: slow, enormous, every move a weight that lands
  6: { tempo: 0.86, breath: [0.5, 0.02], sway: [0.012, 0.2], gaze: [2.6, 2.2], mass: [2.6, 0.6], hitK: 0.75, coil: 1.1, tremble: [0.006, 24], lunge: 0.8, squash: 0.04, hold: 1.2, death: "power", servo: 0.8 }, // INFLATION TITAN: a boiler on legs: piston breaths, servo joints, a machine's shudder
  7: { tempo: 0.72, rage: 1.3, breath: [0.14, 0.012], sway: [0.035, 0.09], float: [0.035, 0.17], gaze: [0.7, 3.4], mass: [1.0, 0.3], hitK: 1.1, tremble: [0.003, 5], lunge: 0.6, squash: 0.012, hold: 1.1, death: "sink" }, // LONGEVITY LICH: regal, slow, floating; it barely deigns to move
  8: { tempo: 0.78, rage: 1.3, breath: [0.18, 0.02], sway: [0.014, 0.1], hunch: -0.03, gaze: [1.0, 3.0], mass: [1.5, 0.55], hitK: 0.7, coil: 1.2, tremble: [0.004, 10], lunge: 0.9, squash: 0.04, hold: 1.4 }, // LORD INTESTATE: a judge, upright and stately; its gavel comes down with all its weight
  9: { tempo: 1.06, rage: 1.45, breath: [0.3, 0.018], sway: [0.04, 0.3], gaze: [3.4, 1.2], look: 0.8, twitch: [1.8, 0.1], mass: [2.6, 0.28], hitK: 1.2, coil: 0.8, tremble: [0.005, 14], lunge: 0.9, squash: 0.025, hold: 0.8, death: "spasm" }, // UNDUE INFLUENCER: a showman and a puppet both: big sways, sudden jerks as if on strings
  11: { tempo: 0.85, rage: 1.5, breath: [0.22, 0.016], sway: [0.045, 0.16], hunch: 0.16, gaze: [2.4, 2.0], look: 0.85, mass: [2.0, 0.35], coil: 1.2, tremble: [0.003, 7], lunge: 1.5, squash: 0.02, hold: 0.8, death: "crumple" }, // PATRIMONY PHANTOM: a predator: low, weaving, its eyes never off its prey, then it lunges
  all: { tempo: 0.9, breath: [0.2, 0.018], sway: [0.012, 0.15], gaze: [1.7, 2.4], mass: [1.8, 0.6], hitK: 0.8, tremble: [0.004, 12], squash: 0.03, hold: 1.2 }, // THE PROCTOR: imposing and controlled: few moves, each exact
};
// The highest point of a model (or of one part of it) as it stands posed now, from its own surface (a box round turned
// parts would say more). out: where it is, the middle of what lies within `band` of the top (a pipe's mouth, not one
// point of its rim). low: the lowest point instead.
function bossPeak(node, out, band = 0.012, low = false) {
  const s = low ? -1 : 1;
  let m = -1e9, n = 0;
  node.updateMatrixWorld(true);
  const each = (fn) => node.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position, A = p.array, e = o.matrixWorld.elements;
    const q = p.normalized ? 1 / (A instanceof Int16Array ? 32767 : A instanceof Uint16Array ? 65535 : A instanceof Int8Array ? 127 : A instanceof Uint8Array ? 255 : 1) : 1; // (a quantized model's positions are whole numbers, scaled when drawn)
    for (let i = 0; i < p.count; i += 3) { const x = p.getX(i) * q, y = p.getY(i) * q, z = p.getZ(i) * q; fn(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]); }
  });
  each((x, y) => { if (s * y > m) m = s * y; });
  if (out) { out.set(0, 0, 0); each((x, y, z) => { if (s * y >= m - band) { out.x += x; out.y += y; out.z += z; n++; } }); out.multiplyScalar(1 / Math.max(1, n)); }
  return s * m;
}
const bossTop = (node) => bossPeak(node);
// A group set on a part of a model at a place in the world, level with the world, at the model's own size.
function bossPin(part, grp, at) {
  part.add(grp);
  grp.position.copy(part.worldToLocal(at.clone()));
  grp.quaternion.copy(part.getWorldQuaternion(new THREE.Quaternion()).invert());
  const ws = part.getWorldScale(new THREE.Vector3());
  grp.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
  return grp;
}
// What a boss's model is dressed with for what it is (its row's `dress`). Each takes the actor (standing in its idle,
// unscaled) and returns { update(d, o), vent(), dispose() }.
const BOSS_DRESS = {
  // INFLATION TITAN, a boiler: its light comes from its gauge (the model's own) and from its two smokestacks, hot at
  // their mouths, which let off steam (more as it charges; a jet from each as its blast goes)
  stacks(a) {
    const P = a.P, made = [], v = new THREE.Vector3(), quiet = () => REDUCED_MOTION || GFX.calm, pin = bossPin;
    // the mouths of its stacks (the tops of the parts on its collarbones): hot inside
    const pipes = [];
    for (const sd of ["L", "R"]) {
      const c = P["part_" + sd + "_Clavicle"];
      if (!c) continue;
      bossPeak(c, v, 0.04); // (the middle of its mouth: a stack that leans back has its highest point at the far edge of its rim)
      const at = pin(c, new THREE.Group(), v), glow = glowSprite(0xffffff, 0.06, 0);
      glow.position.y = 0.01; // (the hot breath at its mouth: inside, the pipe's own walls would hide it from the lens below)
      at.add(glow); made.push(glow.material);
      pipes.push({ at, glow, acc: rand(0, 0.3), sd: sd === "L" ? 1 : -1 });
    }
    const hot = new THREE.Color(1, 0.42, 0.07), STEAM = 0x8c84aa;
    const puff = (pp, k) => {
      const S = a.root.scale.x, u = S / 7.4;
      pp.at.getWorldPosition(v);
      a.g.kit.smoke(v, { size: (0.5 + 0.3 * k) * u, life: rand(0.9, 1.3), vel: new THREE.Vector3(pp.sd * rand(0.1, 0.5), rand(1.4, 2.2) + 5 * k, rand(-0.2, 0.3)).multiplyScalar(u), rise: 0.7, a: 0.28 + 0.12 * k, cold: true, color: STEAM, drag: 0.7 });
    };
    return {
      update(d, o) {
        const ch = o.charge || 0, lit = a.power * (o.flick === undefined ? 1 : o.flick);
        for (const pp of pipes) {
          pp.glow.material.color.copy(hot).multiplyScalar(1.6 + 0.8 * ch);
          pp.glow.material.opacity = (0.85 + 0.15 * ch) * lit;
          if (!a.g.kit || a.dead || lit < 0.5 || d <= 0) continue;
          if ((pp.acc -= d) <= 0) { pp.acc = (ch > 0.3 ? 0.07 : 0.26) * rand(0.7, 1.3) * (quiet() ? 2.5 : 1); puff(pp, 0); }
        }
      },
      vent() { if (a.g.kit && !a.dead) for (const pp of pipes) for (let i = 0; i < (quiet() ? 2 : 5); i++) puff(pp, rand(0.6, 1)); },
      dispose() { made.forEach((m) => m.dispose()); },
    };
  },
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
    // ---- how high it reaches at the top of each attack's wind-up, over the floor, in its own heights (the lens keeps
    // all of it in the picture while it winds up: what it raises over its head too)
    this.reach = {};
    for (const n of ["attackA", "attackB"]) if (this.act[n]) { poseAt(n, BOSS_CLIP[n].top); this.reach[n] = bossTop(model.scene) - this.ground[n]; }
    // ---- where its overhead blow comes down, in its own frame: under its weapon's head (the lowest point of what its
    // right hand holds), or between its fists (a slam's mark on the floor and its landing stand there)
    if (this.act.attackA) {
      poseAt("attackA", BOSS_CLIP.attackA.hit);
      const lo = (bone) => { const p = bone && P["part_" + bone.name]; if (!p) return null; const q = new THREE.Vector3(); bossPeak(p, q, 0.01, true); return model.scene.worldToLocal(q); };
      const r = lo(this.joint.handR), l = lo(this.joint.handL);
      if (r || l) this.slamPt = { weapon: r || l, fists: r && l ? r.clone().add(l).multiplyScalar(0.5) : r || l };
    }
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
    // ---- dressed for what it is (its row's dress), standing in its idle
    if (this.act.idle) poseAt("idle", 0);
    this.dress = row.dress && BOSS_DRESS[row.dress] ? BOSS_DRESS[row.dress](this) : null;
    for (const n in this.act) this.act[n].setEffectiveWeight(0);
    // ---- what moves on top of the clips
    this._e = new THREE.Euler(); this._q = new THREE.Quaternion(); this._q2 = new THREE.Quaternion(); this._d = new THREE.Vector3(); this._y = new THREE.Vector3(0, 1, 0);
    this.ovr = new Map();
    this.arm = { L: 0, R: 0 }; this.armTo = { L: 0, R: 0 }; // how limp each arm hangs
    this.kick = 0; this.kickV = 0; // a recoil along z, sprung
    this.lean = 0; this.drop = 0; this.yaw = 0;
    this.scraps = []; this.torn = {};
    this.t = 0; this.landed = false; this.dead = false;
    this.reactT = 0;
    this.moves(model, row);
  }
  // ---- its own way of moving (BOSS_MOVE), made once: the bones it lives through, each one's own axes (the model's
  // across, up and forward, as they lie in that bone at the start of its idle: a bone is then turned about its own
  // axes, whatever its roll), its springs, and its blows' reactions as layers over whatever it is doing
  moves(model, row) {
    const P = this.P, M = (this.M = Object.assign({}, BOSS_MOVE_BASE, BOSS_MOVE[row.key] || {}));
    this.seed = Math.floor(Motion.hash(String(row.key).split("").reduce((s, c) => s * 31 + c.charCodeAt(0), 7)) * 997) + 1;
    const B = (this.B = { waist: P.Waist || P.Spine, sp1: P.Spine01, sp2: P.Spine02, neck: P.NeckTwist01 || P.Neck, head: P.Head, thL: P.L_Thigh, thR: P.R_Thigh, caL: P.L_Calf, caR: P.R_Calf });
    if (this.act.idle) { for (const n in this.act) this.act[n].setEffectiveWeight(n === "idle" ? 1 : 0); this.act.idle.time = 0; this.mixer.update(0); }
    model.scene.updateMatrixWorld(true);
    const T = (this.turns = new Motion.Turns(model.scene)), v = new THREE.Vector3(), v2 = new THREE.Vector3();
    Object.values(B).forEach((b) => T.add(b));
    // its shoulders (which side each is on: a shoulder rises by turning about the forward axis, outward end up)
    this.clav = [];
    for (const sd of ["L", "R"]) {
      const c = P[sd + "_Clavicle"], up = P[sd + "_Upperarm"];
      if (!c || !up) continue;
      T.add(c);
      const x = model.scene.worldToLocal(up.getWorldPosition(v)).x - model.scene.worldToLocal(c.getWorldPosition(v2)).x;
      this.clav.push({ bone: c, side: x >= 0 ? 1 : -1 });
    }
    for (const n in this.act) this.act[n].setEffectiveWeight(0);
    // its springs: the whole body's recoil and lean, its spine's give (pitch, turn, tip), its head's snap and tics, its
    // squash and bounce, its gaze
    const [mf, mz] = M.mass, Sp = Motion.Spring;
    this.S = {
      kick: new Sp(mf, mz), lean: new Sp(mf * 1.15, Math.min(0.9, mz + 0.15)),
      pitch: new Sp(mf * 1.6, mz), yaw: new Sp(mf * 1.5, mz), roll: new Sp(mf * 1.7, mz),
      head: new Sp(mf * 2.2, Math.max(0.25, mz - 0.1)), headR: new Sp(5.5, 0.32), clav: new Sp(6, 0.35),
      sq: new Sp(mf * 2.4, 0.32), bounce: new Sp(mf * 1.8, 0.4), grow: new Sp(1.3, 0.45),
      lookY: new Sp(M.gaze[0], 0.92), lookX: new Sp(M.gaze[0], 0.92),
    };
    this.rageK = 0; this.swell = 1; this.floatK = 0; this.windK = 0; this.coil = 0;
    this.nHit = 0; this.nStrike = 0; this.nGl = 0; this.nTw = 0; this.glanceT = 1; this.twT = M.twitch ? M.twitch[0] : 0;
    this.gl = new THREE.Vector2(); this.invQ = new THREE.Quaternion(); this._lk = new THREE.Vector3(); this._lk2 = new THREE.Vector3();
    // its blows taken (hurt, stagger) as layers over whatever it is doing: the clip's own motion from its first moment,
    // the upper body only (its feet stay where they stand: no sliding), added to an attack, a wind-up, an idle
    this.addAct = {}; this.adds = {};
    for (const name of ["hurt", "stagger", "hurtS", "hurtG"]) { const a = this.act[name], add = a && Motion.overlay(this.mixer, a.getClip(), B.waist); if (add) this.addAct[name] = add; }
    // (a second idle of its own kind, where it has one: the judge's folded arms, the salesman's swagger; it moves
    // between the two now and then, over a couple of seconds)
    this.mix = this.act.idle2 ? 1 : 0; this.mixTo = this.mix; this.mixT = 9; this.nMix = 0; this.idle2T = rand(0, 4);
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
  // Every part still on the skeleton becomes a piece of its own (the last blast). A big one (a cape, a robe, a torso)
  // burns away where it lies, sinking and shrinking (thrown up, it stood in the air like the boss again); the rest are
  // thrown down and out from a point, on low arcs. (burn: the stage sets them alight.)
  shatter(centre, speed) {
    const list = [], out = [], S = this.root.scale.x, box = new THREE.Box3(), sz = new THREE.Vector3();
    this.model.scene.traverse((n) => { if (/^part_/.test(n.name) && !n.userData.torn && !(n.parent && /^part_/.test(n.parent.name))) list.push(n); }); // (a part's own pieces go with it)
    this.root.updateMatrixWorld(true);
    for (const n of list) {
      const big = box.setFromObject(n).getSize(sz).length() / S > 0.45;
      const grp = new THREE.Group();
      n.getWorldPosition(grp.position);
      this.g.scene.add(grp);
      grp.updateMatrixWorld(true);
      n.traverse((q) => { q.userData.torn = true; });
      grp.attach(n);
      const v = grp.position.clone().sub(centre); v.y = 0;
      if (v.lengthSq() < 1e-4) v.set(rand(-1, 1), 0, rand(-1, 1));
      v.normalize().multiplyScalar(speed * (big ? 0.1 : rand(0.6, 1.1)));
      v.y = big ? rand(-1.2, 0.4) : rand(0.8, 2.6);
      const sc = { grp, v, w: big ? new THREE.Vector3(rand(-0.8, 0.8), rand(-0.8, 0.8), rand(-0.8, 0.8)) : new THREE.Vector3(rand(-8, 8), rand(-6, 6), rand(-8, 8)), t: 0, life: big ? rand(0.5, 0.7) : rand(1.3, 1.9), r: 0.05 * S, rest: false, burn: big };
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
  // (the wind-up gathers: past half way it rears back and coils, held at the top it strains; the strike throws it
  // forward, each strike a little its own; the blow's moment is held a beat, longer for a heavy boss)
  wind(clip, k) { const a = this.atk, C = BOSS_CLIP[clip]; if (!this.act[clip] || this.dead) return; if (!a.clip || a.rec) { a.hitFx = false; a.vary = 1; a.swung = false; } a.clip = clip; a.rec = false; a.t = lerp(C.from, C.top, k); a.to = smoothstep(0, 0.22, k); this.windK = k; }
  swing(clip, u, from) {
    const a = this.atk, C = BOSS_CLIP[clip];
    if (!this.act[clip] || this.dead) return;
    if (!a.swung) { a.swung = true; a.hitFx = false; const n = ++this.nStrike; a.vary = Motion.vary(this.seed, n, 0.86, 1.16); this.S.lean.hit(0.55 * this.M.lunge * Motion.vary(this.seed, n + 31, 0.8, 1.2) * (0.6 + 0.4 * this.coil)); this.S.sq.hit(-0.4 * this.M.squash); } // (released: thrown forward, stretched)
    a.clip = clip; a.rec = false; a.t = lerp(from === undefined ? C.top : from, C.hit, u * u * (3 - 2 * u) * 0.35 + u * 0.65); a.to = 1; if (u > 0.25) a.w = Math.max(a.w, Math.min(1, u * 2.2));
    this.windK = 0;
  }
  recover() { this.atk.rec = true; this.atk.swung = false; this.windK = 0; }
  get windT() { return this.atk.clip ? this.atk.t : 0; }
  // ---- a blow it takes (the stage, as a right answer lands): from where it came, where it struck, a heavy one or not.
  // Its spine gives to it (back, turned and tipped away from the side it came from), its head snaps back from a heavy
  // one; each blow a little its own (how hard, how far off straight). The stage's own recoil and reaction clip go on.
  hit(from, at, big) {
    if (this.dead || !from || !at) return;
    const M = this.M, S = this.S, n = ++this.nHit, sd = this.seed, dir = this._d.subVectors(at, from).normalize().applyQuaternion(this.invQ);
    const k = M.hitK * (big ? 1.5 : 1) * Motion.vary(sd, n, 0.75, 1.25), jit = Motion.vary(sd, n + 11, -0.35, 0.35);
    S.pitch.hit(-0.1 * k * Math.max(0.35, -dir.z));
    S.yaw.hit(0.16 * k * (dir.x + jit));
    S.roll.hit(-0.08 * k * (dir.x * 0.8 + jit * 0.7));
    S.head.hit(-(big ? 0.24 : 0.09) * Motion.vary(sd, n + 13, 0.75, 1.25));
    S.sq.hit(0.6 * M.squash * k);
  }
  // ---- it rages (the stage, under 35%): it rears up and swells as it roars; from then on it moves faster, lower,
  // straining, its breath heaving
  enrage() {
    if (this.dead) return;
    const S = this.S;
    S.sq.hit(-0.05); S.lean.hit(-0.45); S.head.hit(-0.3); S.bounce.hit(0.02); S.grow.hit(0.045);
  }
  // ---- a clip played through over everything else. o: { from, to, rate, in, out, hold }
  // (a blow's reaction, hurt or stagger, is a layer over whatever it is doing instead: see moves)
  react(name, o = {}) {
    if (name === "hurt") { const kinds = ["hurt", "hurtG", "hurtS"].filter((k) => this.addAct[k]), n = this.nHit + 1; name = kinds[Math.floor(Motion.vary(this.seed, n + 51, 0, kinds.length - 1e-6))] || name; } // (a blow to the body, the gut, the side: one of the three, its own each time)
    const add = this.addAct[name];
    if (add && !o.whole) {
      const r0 = this.adds[name], t = o.from || 0, end = o.to === undefined ? this.dur[name] - 0.02 : o.to;
      this.adds[name] = { act: add, t, end, rate: (o.rate || 1) * Motion.vary(this.seed, this.nHit + 41, 0.9, 1.12), w: r0 ? r0.w : 0, in: o.in === undefined ? 0.08 : o.in, out: o.out === undefined ? 0.3 : o.out, k: Math.min(1, (o.k === undefined ? 1 : o.k) * 1.35) * (0.75 + 0.25 * this.M.hitK) };
      return (end - t) / this.adds[name].rate;
    }
    if (!this.act[name]) return 0;
    const end = o.to === undefined ? this.dur[name] - 0.02 : o.to, t = o.from || 0;
    this.play = { name, t, end, rate: o.rate || 1, w: this.play && this.play.name === name ? this.play.w : 0, in: o.in === undefined ? 0.08 : o.in, out: o.out === undefined ? 0.3 : o.out, hold: !!o.hold, k: o.k === undefined ? 1 : o.k }; // (k: how much of it counts at most: a recoil blended with its stance)
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
    const act = this.act, w = this.w, pl = this.play, a = this.atk, M = this.M, rage = o.rage || 0;
    this.t += d;
    if (this.dead) this.deadT = (this.deadT || 0) + d;
    this.rageK = Motion.damp(this.rageK, rage ? 1 : 0, 1.5, d);
    this.model.scene.getWorldQuaternion(this.invQ).invert(); // (its own frame, for directions in the world: as last drawn)
    // ---- which clips count, and where in each (every change of weight eased in and out: no clip cuts in or out)
    for (const n in w) w[n] = 0;
    let p = 0;
    if (pl) {
      if (pl.name === "death") this.fall(pl, d); else pl.t = Math.min(pl.end, pl.t + d * pl.rate);
      const left = (pl.end - pl.t) / pl.rate;
      pl.w = Math.min(1, pl.w + d / Math.max(1e-3, pl.in));
      p = Math.min(pl.k, Motion.ease.smooth(pl.hold ? pl.w : Math.min(pl.w, clamp(left / Math.max(1e-3, pl.out), 0, 1))));
      act[pl.name].time = pl.t;
      w[pl.name] = p;
      if (pl.name === "enter") {
        const C = BOSS_CLIP.enter;
        if (!this.landed && pl.t >= C.land) { this.landed = true; this.justLanded = true; this.S.sq.hit(1.4 * M.squash); this.S.bounce.hit(-0.4 * M.squash); } // (it lands, and gives under its own weight)
        const u = clamp((pl.t - C.from) / (C.land - C.from), 0, 1);
        this.drop = 1 - u * u; // (it comes down faster and faster)
      }
      if (!pl.hold && pl.t >= pl.end) { this.play = null; this.entering = false; }
    }
    if (a.clip) {
      const C = BOSS_CLIP[a.clip];
      if (a.rec === "drop") { a.to = 0; if (a.w < 0.02) { a.clip = null; a.w = 0; } }
      else if (a.rec) { // after the blow: held a beat at its end (a heavy boss longer; each strike its own), on through the clip and out
        const hv = M.hold * (a.vary || 1);
        a.t = Math.min(C.end, a.t + d * (a.t < C.hold ? 2.4 / hv : 1.6 / Math.sqrt(hv)));
        a.to = a.t < C.hold ? 1 : 1 - smoothstep(C.hold, C.end, a.t);
        if (a.t >= C.end) { a.clip = null; a.w = 0; }
      }
      // the blow's moment: it gives under it, and dips on its feet
      if (a.clip && !a.hitFx && a.t >= C.hit - 0.01) { a.hitFx = true; this.S.sq.hit(M.squash * (a.vary || 1)); this.S.bounce.hit(-0.3 * M.squash); }
      if (a.clip) { a.w = Motion.dampTo(a.w, a.toW === undefined ? a.to : a.toW, a.to, a.to > a.w ? 16 : 7, d); a.toW = a.to; act[a.clip].time = a.t; w[a.clip] += a.w * (1 - p); }
    }
    const idle = Math.max(0, 1 - p - (a.clip ? a.w * (1 - p) : 0));
    if (act.idle) {
      // its own pace: slow or quick as its kind moves, in a machine's pulses, quicker raging, drifting a little
      const pace = M.tempo * lerp(1, M.rage, this.rageK) * (1 + 0.08 * Motion.noise(this.t * 0.13, this.seed + 5)) * (M.servo ? lerp(1, (this.t * 1.15 + this.seed * 0.1) % 1 < 0.45 ? 0.3 : 1.57, M.servo) : 1);
      this.idleT = (this.idleT + d * this.idleRate * pace) % (this.dur.idle - 0.05);
      act.idle.time = this.idleT;
      if (act.idle2) {
        if ((this.mixT -= d) <= 0) { const n = ++this.nMix; this.mixTo = this.mixTo > 0.5 ? 0 : 1; this.mixT = (this.mixTo ? 11 : 5) * Motion.vary(this.seed, n + 200, 0.7, 1.4); }
        this.mix = Motion.damp(this.mix, this.mixTo, 1.1, d);
        this.idle2T = (this.idle2T + d * this.idleRate * pace) % (this.dur.idle2 - 0.05);
        act.idle2.time = this.idle2T; w.idle2 = idle * this.mix;
      }
      w.idle = Math.max(idle * (1 - this.mix), 0.0001);
    }
    let ground = 0, sum = 0, cx = 0, cz = 0;
    for (const n in w) { act[n].setEffectiveWeight(w[n]); ground += w[n] * (this.ground[n] || 0); cx += w[n] * (this.cx[n] || 0); cz += w[n] * (this.cz[n] || 0); sum += w[n]; }
    // the blows it takes: layers over all of it, eased in and out
    for (const name in this.adds) {
      const r = this.adds[name];
      r.t = Math.min(r.end, r.t + d * r.rate);
      r.w = Math.min(1, r.w + d / Math.max(1e-3, r.in));
      r.act.time = r.t;
      r.act.setEffectiveWeight(this.dead ? 0 : r.k * Motion.ease.smooth(Math.min(r.w, clamp((r.end - r.t) / r.rate / Math.max(1e-3, r.out), 0, 1))));
      if (r.t >= r.end) { r.act.setEffectiveWeight(0); delete this.adds[name]; }
    }
    this.mixer.update(0);
    // ---- on top of the clips: its own life (breath, sway, gaze, tics, the blows' give), and an arm that hangs
    this.life(d, o, p);
    for (const sd of ["L", "R"]) {
      this.arm[sd] = Motion.damp(this.arm[sd], this.armTo[sd], 5, d);
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
    // ---- the body: a blow knocks it back and it springs forward again, as heavily as it is built (the stage adds to
    // kickV, as it did to the old spring's speed: here it is a push, sized to the old recoil's depth); an attack leans it
    // in, its wind-up rears it back first, its strike throws it forward and it settles; it floats, sways and strains
    if (this.kickV) { this.S.kick.hit(this.kickV * 0.0457 * M.hitK); this.kickV = 0; }
    const S = this.S, kick = (this.kick = S.kick.step(d, 0)), lean = S.lean.step(d, this.lean - 0.55 * this.coil), sq = S.sq.step(d, 0.02 * this.coil), bo = S.bounce.step(d, 0);
    this.body.position.set((sum > 0 ? -cx / sum : 0) + this.swX, (sum > 0 ? -ground / sum : 0) + this.drop * (this.row.dropH || 1.5) + this.flY + this.bobY + bo - 0.012 * this.coil, (sum > 0 ? -cz / sum : 0) - kick * 0.22 + lean * 0.1);
    this.body.rotation.set(-kick * 0.12 + lean * 0.06 + this.flT + this.trX, this.yaw + this.swY + this.trY + this.spin, this.swR + this.trZ);
    const sc = this.swell + S.grow.step(d, 0);
    this.body.scale.set(sc * (1 + 0.5 * sq), sc * (1 - sq), sc * (1 + 0.5 * sq));
    // ---- its lights: off until it powers up, breathing, hotter as it winds up, flickering as it dies
    const br = 0.86 + 0.14 * Math.sin(this.t * (rage ? 3.2 : 1.7)), gl = this.glow * this.power * (br + (o.glow || 0)) * (o.flick === undefined ? 1 : o.flick);
    for (const m of this.mats) if (m.emissiveMap) m.emissiveIntensity = gl;
    if (this.dress) this.dress.update(d, o);
    // ---- what has been torn off: thrown, falling, turning, coming to rest on the floor, and gone (each flight exact for
    // its time step: the same arc at any frame rate)
    for (let i = this.scraps.length - 1; i >= 0; i--) {
      const sc = this.scraps[i], gp = sc.grp;
      sc.t += d;
      if (!sc.rest) {
        gp.position.addScaledVector(sc.v, d); gp.position.y -= 10 * d * d;
        sc.v.y -= 20 * d;
        gp.rotation.x += sc.w.x * d; gp.rotation.y += sc.w.y * d; gp.rotation.z += sc.w.z * d;
        if (gp.position.y < sc.r && sc.v.y < 0) { gp.position.y = sc.r; sc.hit = (sc.hit || 0) + 1; sc.bounced = true; if (Math.abs(sc.v.y) < 2.2) { sc.rest = true; } else { sc.v.y *= -0.34; sc.v.x *= 0.6; sc.v.z *= 0.6; sc.w.multiplyScalar(0.5); } }
      }
      const k = 1 - smoothstep(sc.life - 0.35, sc.life, sc.t);
      if (k < 1) gp.scale.setScalar(Math.max(0.001, k));
      if (sc.t >= sc.life) { gp.visible = false; this.scraps.splice(i, 1); } // (it stays in the scene, unseen, and is released with it)
    }
  }
  // ---- its own life over the clips (BOSS_MOVE): every turn added up for each bone, then each bone turned once about its
  // own axes (on what the mixer wrote this frame: see base). Less of it while it performs (an attack, a reaction).
  life(d, o, p) {
    const M = this.M, S = this.S, B = this.B, t = this.t, sd = this.seed, rk = this.rageK, dead = this.dead, a = this.atk;
    const busy = Math.max(p, a.clip ? a.w : 0), calm = 1 - 0.65 * busy, alive = dead ? 0 : 1;
    // its breath: the chest rises and falls, the shoulders with it (a machine's in strokes, as a piston's); deeper and
    // quicker raging
    const br = M.breath;
    this.brPh = (this.brPh || sd) + d * Math.PI * 2 * br[0] * (1 + 0.6 * rk); // (its own phase: a quicker breath goes on from where it is)
    let b = Math.sin(this.brPh);
    if (M.servo) b = Math.tanh(b * 3 * M.servo) / Math.tanh(3 * M.servo);
    const bd = br[1] * (1 + 0.5 * rk) * alive * (1 - 0.5 * busy);
    this.addRot(B.sp2, -0.6 * bd * b, 0, 0); this.addRot(B.sp1, -0.3 * bd * b, 0, 0);
    for (const c of this.clav) this.addRot(c.bone, 0, 0, c.side * bd * 0.8 * (b + 1));
    // its stoop or crouch (lower raging), its head kept up
    const hu = (M.hunch + 0.05 * rk) * alive;
    this.addRot(B.sp1, 0.5 * hu, 0, 0); this.addRot(B.sp2, 0.5 * hu, 0, 0); this.addRot(B.neck, -0.35 * hu, 0, 0); this.addRot(B.head, -0.4 * hu, 0, 0);
    // its sway: the body drifts, turns and shifts its weight, the spine leaning against it (the head stays level)
    const sa = M.sway[0] * (1 + 0.45 * rk) * calm * alive, sw = (this.swPh = (this.swPh || 0) + d * M.sway[1] * (1 + 0.4 * rk));
    this.swY = sa * Motion.noise(sw, sd); this.swR = 0.55 * sa * Motion.noise(sw * 0.8, sd + 1); this.swX = 0.22 * sa * Motion.noise(sw * 0.6, sd + 2);
    this.addRot(B.sp2, 0, 0, -0.5 * this.swR); this.addRot(B.neck, 0, 0, -0.3 * this.swR);
    // its gaze: on the wizard (o.look) or the lens, its head (and a little of its chest) turned to it at its own pace;
    // now and then a glance off and back; less while it performs
    let yawT = 0, pitT = 0;
    const head = B.head || B.sp2;
    if (head && !dead) {
      const hp = head.getWorldPosition(this._lk), dir = this._lk2.subVectors(o.look || this.g.camera.position, hp).applyQuaternion(this.invQ);
      yawT = clamp(Math.atan2(dir.x, dir.z), -0.8, 0.8); pitT = clamp(Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -0.5, 0.35);
    }
    if ((this.glanceT -= d) <= 0) {
      const n = ++this.nGl, off = Motion.vary(sd, n + 77, 0, 1) < 0.4;
      this.glanceT = M.gaze[1] * Motion.vary(sd, n, 0.5, 1.5) * (off ? 0.4 : 1);
      this.gl.set(off ? Motion.vary(sd, n + 5, -0.4, 0.4) : 0, off ? Motion.vary(sd, n + 9, -0.15, 0.08) : 0);
    }
    const amt = M.look * (1 + 0.15 * rk) * (1 - 0.6 * busy) * alive;
    const ly = S.lookY.step(d, (yawT + this.gl.x) * amt), lp = S.lookX.step(d, (-pitT - this.gl.y) * amt);
    // its tics: the head cocks, a shoulder jerks
    if (M.twitch && !dead && (this.twT -= d) <= 0) {
      const n = ++this.nTw, s = Motion.vary(sd, n + 3, 0, 1) < 0.5 ? -1 : 1, amp = M.twitch[1] * Motion.vary(sd, n + 4, 0.6, 1.25);
      this.twT = M.twitch[0] * Motion.vary(sd, n, 0.45, 1.6);
      if (Motion.vary(sd, n + 6, 0, 1) < 0.65 || !this.clav.length) S.headR.hit(s * amp); else S.clav.hit(amp);
    }
    // the springs: the spine's give to a blow (back, turned, tipped: spread down its length), the head's snap and tics
    const sp = S.pitch.step(d, 0), sy = S.yaw.step(d, 0), sr = S.roll.step(d, 0), hd = S.head.step(d, 0), hr = S.headR.step(d, 0), cl = S.clav.step(d, 0);
    this.addRot(B.waist, 0.3 * sp, 0.3 * sy, 0.3 * sr); this.addRot(B.sp1, 0.3 * sp, 0.3 * sy, 0.3 * sr); this.addRot(B.sp2, 0.4 * sp, 0.4 * sy + 0.15 * ly, 0.4 * sr);
    if (B.head) { this.addRot(B.neck, 0.35 * lp + 0.4 * hd, 0.35 * ly, 0.3 * hr); this.addRot(B.head, 0.65 * lp + 0.6 * hd, 0.5 * ly + 0.3 * hr, 0.7 * hr); }
    else this.addRot(B.sp2, 0.3 * lp + 0.3 * hd, 0.35 * ly, 0.3 * hr); // (no head of its own: its body turns to look)
    if (this.clav.length) { const c = this.clav[this.nTw % this.clav.length]; this.addRot(c.bone, 0, 0, c.side * cl); }
    // floating: it hovers and bobs, tipping with the bob, its legs hanging and swinging behind it; it rises from its
    // landing to its height, and sinks as it dies
    const fl = M.float, fk = (this.floatK = Motion.damp(this.floatK, fl && !dead && this.landed ? 1 : 0, dead ? 0.9 : 1.6, d));
    this.flY = 0; this.flT = 0;
    if (fl) {
      const ph = Math.PI * 2 * fl[1] * t + sd, dg = fk * (1 - 0.5 * busy), sw = 0.06 * dg * Math.sin(ph - 1.1);
      this.flY = fl[0] * fk * (0.7 + 0.3 * Math.sin(ph)); this.flT = 0.03 * fk * Math.cos(ph - 0.6);
      this.addRot(B.thL, -0.08 * dg + sw, 0, 0); this.addRot(B.thR, -0.05 * dg + 0.8 * sw, 0, 0); this.addRot(B.caL, 0.22 * dg, 0, 0); this.addRot(B.caR, 0.18 * dg, 0, 0);
    }
    // a swagger's bounce
    this.bobY = M.bob ? M.bob * Math.abs(Math.sin(Math.PI * 2 * 0.95 * t + sd)) * calm * alive : 0;
    // the wind-up: past half way it rears back and coils; held at its top it strains (a shudder: smooth, never a
    // jitter); raging, it seethes
    const coilTo = M.coil * smoothstep(0.5, 1, this.windK) * alive;
    this.coil = Motion.dampTo(this.coil, this.coilTo === undefined ? coilTo : this.coilTo, coilTo, 10, d); this.coilTo = coilTo;
    const tr = M.tremble, tk = tr[0] * (smoothstep(0.8, 1, this.windK) + 0.25 * rk) * alive;
    this.trX = tk * Motion.noise(t * tr[1], sd + 7); this.trY = tk * Motion.noise(t * tr[1] * 1.1, sd + 8); this.trZ = 0.7 * tk * Motion.noise(t * tr[1] * 0.9, sd + 9);
    this.swell = Motion.damp(this.swell, 1 + 0.015 * rk * alive, 2.5, d);
    // its fall, its own way: folding forward, jerking, its power failing (its head drooping), or turning as it sinks
    this.spin = 0;
    if (dead) {
      const k = smoothstep(0, 1.3, this.deadT || 0), e = 1 - k;
      if (M.death === "crumple") { this.addRot(B.sp1, 0.22 * k, 0, 0); this.addRot(B.sp2, 0.18 * k, 0, 0); this.addRot(B.head, 0.35 * k, 0, 0); }
      else if (M.death === "spasm") { const j = 0.16 * e * k * 4; this.addRot(B.sp2, j * Motion.noise(t * 9, sd + 30), j * Motion.noise(t * 8, sd + 31), 0); this.addRot(B.head, j * Motion.noise(t * 11, sd + 32), 0, j * Motion.noise(t * 10, sd + 33)); }
      else if (M.death === "power") { this.addRot(B.sp2, 0.25 * k, 0, 0); const j = 0.012 * e; this.trX += j * Motion.noise(t * 24, sd + 34); this.trZ += j * Motion.noise(t * 22, sd + 35); }
      else if (M.death === "sink") this.spin = 0.5 * Motion.ease.inOut(k);
    }
    // ---- the bones, each turned once: what the mixer wrote, then all of the above about the bone's own axes
    this.turns.apply();
  }
  addRot(bone, x, y, z) { this.turns.turn(bone, x, y, z); }
  // its fall: the death clip played to the moment it lies flat on time (the stage's last blast waits for that moment),
  // its own way there: floating down (slow, then all at once), in its power's stutters, jerking; flat, it lands hard
  fall(pl, d) {
    const C = BOSS_CLIP.death, M = this.M;
    pl.e = (pl.e === undefined ? pl.t : pl.e) + d * pl.rate;
    const e = Math.min(pl.end, pl.e), u = clamp(e / C.down, 0, 1);
    let t = e;
    if (e < C.down) {
      if (M.death === "sink") t = C.down * Math.pow(u, 1.5);
      else if (M.death === "power") { const s = 0.15, f = e / s, i = Math.floor(f); t = Math.min(e, s * (i + smoothstep(0.5, 1, f - i))); }
      else if (M.death === "spasm") t = Math.max(0, e + 0.06 * (1 - u) * Motion.noise(e * 11, this.seed + 21));
    }
    if (!pl.downFx && e >= C.down) { pl.downFx = true; this.S.bounce.hit(M.death === "sink" ? 0.008 : M.hitK < 0.8 ? 0.035 : 0.022); this.S.sq.hit(1.5 * M.squash); }
    pl.t = Math.min(pl.end, t);
  }
  // a wind-up broken off: back to its stance without the blow
  cancel() { const a = this.atk; if (a.clip && !a.rec) { a.rec = "drop"; a.to = 0; } a.swung = false; this.windK = 0; }
  // its blast goes: what its dress lets off (the Titan's pipes vent)
  vent() { if (this.dress) this.dress.vent(); }
  dispose() { this.mixer.stopAllAction(); if (this.dress) this.dress.dispose(); }
}
