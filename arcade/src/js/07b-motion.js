// Motion: the arithmetic of movement that reads as alive and has weight, the same at any frame rate (the animation
// pass, 2026-11-23: the characters moved like machines; stiff poses, hard cuts, constant speeds, no follow-through).
// Look only: nothing here is read by a rule.
//
// Every frame-rate-dependent step the characters used ("x += (to - x) * min(1, d * k)": a little more of the gap closed
// at 60 Hz than at 120, and a spring integrated once a frame) is replaced by one of these:
//   Motion.damp(x, to, k, d)       x eased toward `to`: exactly e^(-k d) of the gap left, whatever d is (any frame rate
//                                  gives the same curve); dampV / dampQ for a vector and a quaternion (in place);
//                                  dampTo(x, from, to, k, d) for a target that moves every frame (from: where it was)
//   Motion.Spring(f, z)            a spring and its damper (f: how fast it swings, in Hz; z: 1 settles without
//                                  overshoot, lower overshoots and wobbles), stepped at a fixed 240 Hz whatever the frame
//                                  rate, its target followed along a straight line between frames. .step(d, to), .kick(v)
//   Motion.Follow(f, z)            a point on a spring: it lags behind a moving point and overshoots it when the point
//                                  stops (the far end of a part that trails: a wand's tip, a cloak, a head on its neck)
//   Motion.noise(t, seed)          smooth noise in -1..1 (no two seeds alike; a value, not a jitter: it never steps)
//   Motion.hash(n)                 a fixed fraction from a whole number: variation that is the same every run and at
//                                  every frame rate (Math.random is drawn by whatever else runs that frame)
//   Motion.ease                    curves with weight: in, out, inOut, back (overshoots), settle (a decaying wobble)
const Motion = {
  STEP: 1 / 240,
  damp(x, to, k, d) { return d > 0 ? to + (x - to) * Math.exp(-k * d) : x; },
  // the same, for a target that moved along a straight line from `from` (where it was last frame) to `to` over the step:
  // exact for that line, so a target that moves every frame (a wind-up, a bar filling) is followed alike at any rate
  dampTo(x, from, to, k, d) { if (!(d > 0)) return x; const s = (to - from) / d, e = Math.exp(-k * d); return to - s / k + (x - from + s / k) * e; },
  // the fraction of the gap to close this step (for slerp and lerp in place)
  k(k, d) { return d > 0 ? 1 - Math.exp(-k * d) : 0; },
  dampV(v, to, k, d) { return v.lerp(to, this.k(k, d)); },
  dampQ(q, to, k, d) { return q.slerp(to, this.k(k, d)); },
  // how much further than v/w a spring at rest goes when kicked with v, inverted (its damping z): so a kick can be sized
  peak(z) { if (z >= 1) return Math.E; const s = Math.sqrt(1 - z * z); return Math.exp((z / s) * Math.atan2(s, z)); },
  hash(n) { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; },
  // a value in a..b that is fixed for (seed, n): a strike's own timing, a hit's own size
  vary(seed, n, a, b) { return a + (b - a) * this.hash(seed * 7919 + n * 104729 + 1); },
  // value noise: a fixed random value at each whole number, joined by a smooth curve (and two octaves of it)
  noise(t, seed = 0) {
    const f = (n) => this.hash(n + seed * 1013) * 2 - 1, i = Math.floor(t), u = t - i, w = u * u * u * (u * (u * 6 - 15) + 10);
    const a = f(i) + (f(i + 1) - f(i)) * w;
    const t2 = t * 2.13 + 17.7, i2 = Math.floor(t2), u2 = t2 - i2, w2 = u2 * u2 * (3 - 2 * u2);
    const b = f(i2 + 5000) + (f(i2 + 5001) - f(i2 + 5000)) * w2;
    return (a * 0.72 + b * 0.28) / 0.86;
  },
  ease: {
    in: (x) => x * x * x,
    out: (x) => 1 - (1 - x) * (1 - x) * (1 - x),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    smooth: (x) => x * x * x * (x * (x * 6 - 15) + 10),
    back: (x, s = 1.4) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2), // (out, past the end and back)
    settle: (x, n = 2.5) => 1 - Math.exp(-5 * x) * Math.cos(n * Math.PI * x), // (out, a wobble that dies)
  },
};
// A spring and its damper on one value. f: how many times a second it swings; z: its damping (1: it settles without
// passing its target; 0.3: it passes it and wobbles back). Stepped at Motion.STEP whatever the frame rate: what is left
// of a frame's time over the last whole step is carried to the next frame, and the value read is the one between the
// last two steps (a 240th of a second behind, at every rate alike). The target moves along a straight line from where it
// was last frame to where it is now, across the steps.
Motion.Spring = class {
  constructor(f = 2, z = 0.5, x = 0) { this.tune(f, z); this.x = this.px = this.out = x; this.v = 0; this.acc = 0; this.to = x; }
  tune(f, z) { const w = (this.w = 2 * Math.PI * f); this.kk = w * w; this.cc = 2 * z * w; this.pk = Motion.peak(z); return this; }
  kick(v) { this.v += v; return this; } // (an impulse: a blow, a lunge)
  hit(amp) { this.v += amp * this.w * this.pk; return this; } // (an impulse that takes it about `amp` from where it rests, at its furthest)
  set(x) { this.x = this.px = this.out = this.to = x; this.v = 0; this.acc = 0; return this; }
  step(d, to = 0) {
    const h = Motion.STEP, from = this.to, a0 = this.acc;
    if (!(d > 0)) return this.out;
    d = Math.min(d, 0.1);
    this.acc += d;
    const n = Math.floor(this.acc / h + 1e-9);
    for (let i = 1; i <= n; i++) {
      const t = from + (to - from) * Math.min(1, (i * h - a0) / d); // (the target along its line, at this step's own moment)
      this.px = this.x;
      this.v += (-this.kk * (this.x - t) - this.cc * this.v) * h;
      this.x += this.v * h;
    }
    this.acc -= n * h;
    this.to = to;
    this.out = this.px + (this.x - this.px) * (this.acc / h);
    return this.out;
  }
};
// A point on a spring: it follows a moving point (to, in any frame), lags behind it and overshoots it when it stops.
// .step(d, to) returns how far it trails (a vector from `to` to the point itself: the far end of what trails).
Motion.Follow = class {
  constructor(f = 3, z = 0.4) { this.tune(f, z); this.p = new THREE.Vector3(); this.pp = new THREE.Vector3(); this.v = new THREE.Vector3(); this.to = new THREE.Vector3(); this.out = new THREE.Vector3(); this.lag = new THREE.Vector3(); this.acc = 0; this.on = false; this._t = new THREE.Vector3(); this._a = new THREE.Vector3(); }
  tune(f, z) { const w = 2 * Math.PI * f; this.kk = w * w; this.cc = 2 * z * w; return this; }
  set(to) { this.p.copy(to); this.pp.copy(to); this.to.copy(to); this.out.copy(to); this.v.set(0, 0, 0); this.lag.set(0, 0, 0); this.acc = 0; this.on = true; return this; }
  kick(v) { this.v.add(v); return this; }
  step(d, to, max = Infinity) {
    if (!this.on) this.set(to);
    if (!(d > 0)) return this.lag;
    const h = Motion.STEP, t = this._t, a = this._a, a0 = this.acc;
    d = Math.min(d, 0.1);
    this.acc += d;
    const n = Math.floor(this.acc / h + 1e-9);
    for (let i = 1; i <= n; i++) {
      t.lerpVectors(this.to, to, Math.min(1, (i * h - a0) / d));
      this.pp.copy(this.p);
      a.subVectors(this.p, t).multiplyScalar(-this.kk).addScaledVector(this.v, -this.cc);
      this.v.addScaledVector(a, h);
      this.p.addScaledVector(this.v, h);
      // (never further than it can reach: held at its reach, its speed outward taken away; at every step, so alike at any rate)
      a.subVectors(this.p, t);
      const l = a.length();
      if (l > max) { a.multiplyScalar(1 / l); this.p.copy(t).addScaledVector(a, max); const out = this.v.dot(a); if (out > 0) this.v.addScaledVector(a, -out); }
    }
    this.acc -= n * h;
    this.to.copy(to);
    this.out.lerpVectors(this.pp, this.p, this.acc / h);
    this.lag.subVectors(this.out, to);
    if (this.lag.length() > max) this.lag.setLength(max);
    return this.lag;
  }
};
// Turns added to a skeleton's bones over what its mixer wrote this frame, each bone turned once about its own axes:
// the frame's across, up and forward as they lie in that bone when it is added (add each bone standing at rest). A
// mixer writes a bone only when its value has changed: a bone it left alone keeps last frame's turn, so each is set
// back to what the mixer last wrote before it is turned again (a still frame does not add the turn twice).
//   const T = new Motion.Turns(model.scene); T.add(bone) ...   each frame: T.turn(bone, x, y, z) ... T.apply()
// (x: about the across axis, positive tips its top forward; y: about up, positive turns forward toward +x; z: about
// forward, positive tips its top toward -x)
Motion.Turns = class {
  constructor(frame) { this.frame = frame; this.list = []; this.by = new Map(); this._q = new THREE.Quaternion(); this._f = new THREE.Quaternion(); }
  add(bone) {
    if (!bone) return null;
    if (this.by.has(bone)) return this.by.get(bone);
    const inv = bone.getWorldQuaternion(this._q).premultiply(this.frame.getWorldQuaternion(this._f).invert()).invert();
    const e = { bone, x: new THREE.Vector3(1, 0, 0).applyQuaternion(inv), y: new THREE.Vector3(0, 1, 0).applyQuaternion(inv), z: new THREE.Vector3(0, 0, 1).applyQuaternion(inv), r: new THREE.Vector3(), base: bone.quaternion.clone(), out: bone.quaternion.clone() };
    this.list.push(e); this.by.set(bone, e);
    return e;
  }
  has(bone) { return !!bone && this.by.has(bone); }
  turn(bone, x, y, z) { const e = bone && this.by.get(bone); if (e) { e.r.x += x; e.r.y += y; e.r.z += z; } }
  apply() {
    const q = this._q;
    for (const e of this.list) {
      const b = e.bone, r = e.r;
      if (!b.quaternion.equals(e.out)) e.base.copy(b.quaternion); else b.quaternion.copy(e.base);
      if (r.x || r.y || r.z) b.quaternion.multiply(q.setFromAxisAngle(e.y, r.y)).multiply(q.setFromAxisAngle(e.x, r.x)).multiply(q.setFromAxisAngle(e.z, r.z));
      e.out.copy(b.quaternion);
      r.set(0, 0, 0);
    }
  }
};
// A clip's reaction as a layer over whatever else plays: its upper body only (the bones under `top`, turning; the
// legs keep their stance: nothing slides), as motion from its own first moment (THREE's additive blending). Returns the
// action, playing, paused, at no weight (the caller sets its time and weight each frame), or null.
Motion.overlay = (mixer, clip, top, name) => {
  if (!clip || !top) return null;
  const keep = new Set();
  top.traverse((n) => keep.add(n.name));
  const c = clip.clone();
  c.name = name || clip.name + "+";
  c.tracks = c.tracks.filter((tr) => /\.quaternion$/.test(tr.name) && keep.has(tr.name.slice(0, -11)));
  if (!c.tracks.length) return null;
  THREE.AnimationUtils.makeClipAdditive(c);
  const a = mixer.clipAction(c);
  a.play(); a.paused = true; a.setEffectiveWeight(0);
  return a;
};
