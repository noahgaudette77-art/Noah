// Risk Blaster's combat, staged (when the overlord's model arrived: with the built-in demon the game shows what it
// always showed). The rules decide what happens and when (20-blaster.js: pick, resolve, timeout, after); this file
// decides what is seen and heard of it, with the shared effects kit (CombatFX), on the show clock:
//   the fighter fires        three volleys from both cannons in a seventh of a second: bolts, muzzle flashes that light
//                            the hull, spent cells, recoil, hot barrels
//   a right answer           the bolts hold as two beams on the answer's drone; at the rule's moment the drone bursts
//                            and a lance goes through it into the demon's core: sparks, a ring, the glow of the whole
//                            picture, a hit-stop
//   a wrong answer           each bolt dies on the drone in a dull red fizzle; the drone locks out
//   the demon strikes        a telegraph (wind-up, a marker on the fighter, a charging sound, a beat of slow motion as
//                            it lets go), then one of five strikes, each its own colour, flight and impact
//   the strike lands         now the shield is seen to go: flash, colour split, shake by how much is left, sparks,
//                            shards, the HUD cracks and the lost shield breaks, the ship blinks
//   one shield left          a red vignette that beats, an alarm, smoke and fire trailing from the hurt engine
//   the demon dies           slow motion, a chain of blasts as it comes apart, the last one, and stars to the score
// Nothing here is read by a rule. A shield lost is shown when the blow lands (a moment after the rule took it), so
// the game's HUD asks this file how many are still owed (owed) before it draws its lives.
class BlasterStage {
  constructor(game) {
    const g = (this.g = game), s = g.scene;
    g.show = new TweenSet(); // show-only timing: nothing in it is a rule
    this.kit = g.kit = new CombatFX(g, { unit: 1, ground: null, sparks: 380, chunks: 84, firePuffs: 120, smokePuffs: 120, lights: 3 });
    this.shot = null; // the burst being fired
    this.atk = null; // the demon's strike being staged
    this.debts = []; // shields the rules have taken that have not been seen to go yet
    this.low = 0; this.lowT = 0; this.lowK = 0; this.alarmAt = 0; this.trail = null; this.misses = 0; this.leaks = []; this.warpAt = -1; // (low: 1 with one shield left, 2 with none)
    this.aimQ = new THREE.Quaternion(); this.idleQ = new THREE.Quaternion(); this.aimT = 0;
    this.engine = false; this.alarm = false; this.charge = false; // (which of its running sounds are recordings that are playing)
    // the wave of force its roar throws: rings that travel from its mouth to the fighter
    const wg = new THREE.PlaneGeometry(2, 2);
    this.waves = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(wg, new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uK: { value: 0 }, uT: { value: 0 } },
        transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `${GLSL_NOISE}
          uniform vec3 uColor; uniform float uK; uniform float uT; varying vec2 vP;
          void main(){
            float r = length(vP), a = atan(vP.y, vP.x);
            float front = smoothstep(0.7, 0.93, r) * (1.0 - smoothstep(0.93, 1.0, r)); // the front of the wave: a bright band at its rim
            float rays = 0.5 + 0.5 * vnoise(vec3(a * 6.0, r * 5.0 - uT * 8.0, 1.7));    // torn into streaks that run outward
            float skin = smoothstep(0.2, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, r)) * 0.2; // a thin skin of force inside it
            gl_FragColor = vec4((uColor * (front * (0.55 + 0.9 * rays) + skin * rays) + vec3(1.0) * front * front * 0.6) * uK, 1.0);
          }`,
      }));
      m.visible = false; m.renderOrder = 6; m.frustumCulled = false;
      s.add(m);
      return { m, t: -1, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), s0: 1, s1: 1, live: false };
    });
    // its seekers: a hot head each, with a trail of fire and smoke the kit lays behind it
    this.missiles = [0, 1, 2, 3].map(() => {
      const sp = glowSprite(new THREE.Color(3, 1.6, 0.5), 0.5, 1), tail = new Trail({ length: 18, width: 0.1, color: 0xff9a2a, intensity: 2.4, up: new THREE.Vector3(0, 0, 1) }); // (the ribbon lies across the line of sight)
      sp.visible = tail.mesh.visible = false; sp.renderOrder = 9; tail.mesh.renderOrder = 8;
      s.add(sp, tail.mesh);
      return { sp, tail, t: -1, dur: 1, out: 0, acc: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), p: new THREE.Vector3(), first: false };
    });
    // one shield left: the edges of the band close in, dark red, and swell with each tone of the alarm (it lies over
    // the picture's edges only: the answers' drones stand inside it)
    this.frameU = { uK: { value: 0 } };
    this.frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.frameU, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, // (premultiplied: it darkens what it lies over and adds its own red)
      vertexShader: "varying vec2 vP; void main(){ vP = (uv - 0.5) * 3.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", // (the quad is half as large again as the band: vP is 1 at the band's edge)
      fragmentShader: `uniform float uK; varying vec2 vP;
        void main(){
          vec2 d = abs(vP);
          float ex = smoothstep(0.76, 1.02, d.x), ey = smoothstep(0.7, 1.02, d.y), e = 1.0 - (1.0 - ex) * (1.0 - ey);
          e = e * e * (1.0 - smoothstep(1.0, 1.45, max(d.x, d.y)));
          gl_FragColor = vec4(vec3(0.9, 0.03, 0.07) * (e * uK * 0.7), e * uK * 0.5);
        }`,
    }));
    this.frame.renderOrder = 54; this.frame.frustumCulled = false; this.frame.visible = false;
    s.add(this.frame);
    // Everything that used to throw a burst of soft round dots here (the streak's confetti, a far blast, a derelict
    // shorting) throws sparks instead while the fight is staged: darts with a point, a tail and a hot heart.
    g.bursts.burst = (pos, color, o = {}) => {
      const n = o.n || 60, size = o.size || 0.3, life = o.life || 1.1;
      if (n <= 2) return this.kit.embers(pos, color, { n, radius: size, life, speed: (o.speed || 10) * 0.6 });
      this.kit.sparks(pos, color, { n: Math.min(46, Math.ceil(n * 0.55)), speed: (o.speed || 10) * 1.15, life: life * 0.7, len: size * 2.6, w: size * 0.3, gravity: o.gravity === undefined ? 2.5 : -o.gravity * 0.5, drag: 0.35 });
    };
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._u = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 1, 0); this._e = new THREE.Euler();
  }
  // ---- where things are (the starfighter and the built-in fighter both answer) -----------------------------
  shipPos(out) { const j = this.g.jet; return j.centre ? j.centre(out) : out.copy(this.g.ship.position); }
  muzzle(i, out) { const j = this.g.jet; return j.muzzle ? j.muzzle(i, out) : j.rig.localToWorld(out.copy(j.muzzles[i % j.muzzles.length])); }
  exhaust(i, out) { const j = this.g.jet; return j.exhaust ? j.exhaust(i, out) : j.rig.localToWorld(out.copy(j.nozzles[i % j.nozzles.length])); }
  // a place in the world, as a place on the screen (pixels)
  screen(p) { const v = this._u.copy(p).project(this.g.camera); return { x: (v.x * 0.5 + 0.5) * GFX.w, y: (0.5 - v.y * 0.5) * GFX.h }; }
  pan(p) { return clamp(p.x / 4, -1, 1) * 0.7; }
  // how many shields the HUD should still show beyond what the rules hold (a blow on its way)
  get owed() { return this.debts.length; }

  // ---- sound that runs on: the engines, the alarm ------------------------------------------------------------
  start() { this.loops(true); }
  loops(on) {
    const g = this.g;
    if (on) {
      this.engine = Sound.loop("blaster-engine", "engine_ship", { vol: 0.3, rate: 0.9, fade: 0.6 });
      if (!this.engine) Sound.engine(true); // (no recording: the synth's hum, as before)
      if (this.low === 1) this.alarmOn();
      if (this.atk && !this.atk.released) this.charge = Sound.loop("blaster-charge", "charge_hum", { vol: 0.5, rate: 1.2, fade: 0.08 }); // (paused in the middle of a wind-up: its charge is heard again)
    } else {
      Sound.stopLoop("blaster-engine", 0.2); Sound.stopLoop("blaster-alarm", 0.1); Sound.stopLoop("blaster-charge", 0.05);
      Sound.engine(false);
      this.engine = this.alarm = this.charge = false;
    }
  }
  alarmOn() { this.alarm = Sound.loop("blaster-alarm", "alarm", { vol: 0.34 }); this.alarmAt = Sound.ctx ? Sound.ctx.currentTime : 0; } // (alarmAt: when its first tone began. The red frame swells with each one.)
  pause() { this.loops(false); Sound.hush(); } // (nothing keeps sounding behind the menu: the loops, and whatever was still ringing)
  resume() { if (this.g.state !== "over") this.loops(true); }

  // ---- the fighter fires (the rule: pick) --------------------------------------------------------------------
  // right: whether the answer is the right one (look only: the rule checks it itself, 0.22 s on)
  fire(i, right) {
    const g = this.g, t = g.targets[i];
    if (!t) return;
    const at = t.position.clone(), p = g.ship.position;
    // it turns toward its target, most of the way (its bolts do the rest), quickly but never in a snap
    this.aimQ.setFromRotationMatrix(this._m.lookAt(p, at, this._up));
    this.aimQ.slerp(this._q.set(0, 0, 0, 1), 0.38);
    this.aimT = 0.62;
    if (this.shot && this.shot.beams) this.shot.beams.forEach((b) => b.stop());
    this.shot = { i, right, col: SLOT_COLORS[i], at, n: 0, time: 0, beams: null, until: 1e9, side: at.x < 0 ? -1 : 1 };
  }
  volley(sh) {
    const g = this.g, kit = this.kit, k = g.shipScale, n = sh.n;
    for (let gun = 0; gun < 2; gun++) {
      const from = this.muzzle(gun, new THREE.Vector3()), to = sh.at.clone().add(this._v.set((gun ? 0.12 : -0.12) * (1 + n), rand(-0.08, 0.08), 0)), dir = this._w.subVectors(to, from).normalize();
      kit.muzzle(from, dir, sh.col, 0.4 * k);
      kit.bolt(from, to, sh.col, { dur: 0.085, width: 0.2 * k, len: 3.6 * k, onHit: (hit) => this.boltLands(sh, gun, n, hit) });
      kit.shells(from, this._v.set(gun ? 1 : -1, 0.5, 0.6).normalize());
      if (g.jet.fire) g.jet.fire(sh.col, true, g.jet.model ? gun : undefined);
    }
    Sound.sfx("laser_fire", sh.side * 0.5, { vol: 0.8, rate: 1 + n * 0.06 });
  }
  boltLands(sh, gun, n, p) {
    const kit = this.kit, k = this.g.shipScale;
    if (sh.right) {
      kit.flash(p, sh.col, 0.3 * k, 1.0 * k, 0.1, 0.8);
      kit.sparks(p, sh.col, { n: 5, speed: 6 * k, life: 0.22, len: 0.5 * k, w: 0.05 * k });
      if (gun === 0) Sound.sfx("impact_metal", sh.side * 0.5, { vol: 0.4, rate: 1.1 + n * 0.1 }); // (each pair is heard to land on the drone's shell)
      if (!sh.beams) sh.beams = [0, 1].map((q) => kit.beam(this.muzzle(q, this._v), sh.at, sh.col, { dur: 0, width: 0.13 * k, grow: 0.03, k: 2.2 })); // the two beams that hold on the drone until the answer lands
    } else if (gun === 0) { // it does not bite: each pair dies on the drone in a dull red fizzle
      kit.fizzle(p, { size: 0.5 * k + 0.12 * n });
      Sound.sfx("impact_reject", sh.side * 0.5, { vol: 0.5, rate: 1.1 - n * 0.08 });
    }
  }
  // ---- a right answer lands (the rule: resolve) --------------------------------------------------------------
  right(i) {
    const g = this.g, kit = this.kit, t = g.targets[i], col = SLOT_COLORS[i], e = g.enemy;
    if (this.shot) this.shot.until = this.shot.time; // (the cannons' beams let go as the lance goes in)
    if (!t) return;
    const p = t.position.clone(), s0 = t.scale.x;
    // the drone was a link in the demon's shield: it bursts ...
    const ds = clamp(s0 / 0.4, 0.8, 1.5); // (a small hot heart, sparks, a ring, its shell in pieces: no ball of light where it stood)
    kit.flash(p, 0xffffff, 0.2 * ds, 0.8 * ds, 0.09, 1, 3);
    kit.flash(p, col, 0.4 * ds, 1.25 * ds, 0.16, 0.6, 2.2);
    kit.sparks(p, col, { n: 18, speed: 9 * ds, spread: 1.4, life: 0.4, len: 0.55 * ds, w: 0.05 * ds });
    kit.sparks(p, 0xffffff, { n: 6, speed: 13 * ds, life: 0.2, len: 0.7 * ds, w: 0.04 * ds, k: 2.2 });
    kit.embers(p, col, { n: 6, radius: 0.3 * ds, life: 0.9 });
    kit.ring(p, col, { size: 2.6 * ds, dur: 0.36 });
    kit.light(p, col, 2, 0.18, 8);
    kit.debris(p, { n: 7, size: 0.42 * ds, speed: 7, color: 0x8a93a8, life: 0.9, gravity: 0 });
    g.show.wait(0.05, () => { GFX.ab = Math.min(GFX.ab, 0.6); }); // (the colours split for three frames, no longer: the picture is sharp while the blow is read)
    t.userData.gone = true;
    g.show.add(0.13, (q) => t.scale.setScalar(s0 * (1 + 0.5 * q)), () => { t.visible = false; });
    // ... and the shot goes on through it into the demon's core
    if (e && e.alive) kit.beam(p, e.aimPoint(this._v), col, { dur: 0.17, width: 0.3 * (e.S / 6), grow: 0.03, k: 2.8 });
    Sound.sfx("impact_good", g.panAt || 0);
    HudFX.reward(g.el, this.screen(p), "[data-score]", { n: 4, kind: "spark", color: col });
  }
  // ---- a wrong answer lands (the rule: resolve), or none in time (timeout): a shield is owed ------------------
  wrong(i) {
    const g = this.g, t = g.targets[i];
    this.owe();
    if (!t) return;
    this.kit.fizzle(t.position, { size: 1.15 * clamp(t.scale.x / 0.4, 0.8, 1.5) });
    t.userData.rejected = true; // (it locks out: its lamps go a dull red and it shrinks back. See the game's update.)
    Sound.sfx("impact_reject", g.panAt || 0, { vol: 0.9, rate: 0.85 });
  }
  timeout() { this.owe(); }
  owe() { this.debts.push({ t: 0 }); this.misses++; }

  // ---- the demon winds up and strikes -----------------------------------------------------------------------
  // (att: the overlord's own record of the strike: its kind, how far in it is, whether it has been let go)
  demonAttack(e, att) {
    const g = this.g, kit = this.kit, k = g.shipScale, kind = att.kind, ship = (v) => this.shipPos(v);
    this.endAttack();
    const a = (this.atk = { e, att, kind, marks: [], released: false, n: 0, hit: false, acc: 0, beam: null, sd: e.twist > 0 ? 1 : -1, sweep: 0 });
    const COL = [0xc850ff, 0xff2a3c, 0xa070ff, 0xff1a30, 0xffa030][kind];
    a.col = COL;
    if (kind === 0) a.marks.push(kit.mark("lock", ship(this._v), COL, { size: 1.9 * k, dur: 1.2, follow: ship }));
    else if (kind === 1) a.marks.push(kit.mark("bang", ship(this._v), COL, { size: 1.5 * k, dur: 1.2, follow: (v) => ship(v).add(this._w.set(0, 1.25 * k, 0)) }));
    else if (kind === 2) a.marks.push(kit.mark("ring", ship(this._v), COL, { size: 2.3 * k, dur: 1.2, follow: ship }));
    else if (kind === 3) { // a thin line of sight from its core, laid where the beam will start its sweep
      a.marks.push(kit.mark("lock", ship(this._v), COL, { size: 1.8 * k, dur: 1.2, follow: ship }));
      a.beam = kit.beam(e.aimPoint(this._v), this.sweepAt(a, 0, this._w), COL, { dur: 0, width: 0.07, k: 0.9, grow: 0.25 });
    } else for (let j = 0; j < 2; j++) a.marks.push(kit.mark("lock", ship(this._v), COL, { size: (1.5 + j * 0.7) * k, dur: 1.2, spin: j ? -2.4 : 2.4, follow: ship }));
    // heard for exactly as long as it winds up: a hum that rises (runAttack) and is cut as the strike is let go;
    // over it, the first breath of the charge. (Without the recordings: the synth's charge, once.)
    this.charge = Sound.loop("blaster-charge", "charge_hum", { vol: 0.3, rate: 0.9, fade: 0.06 });
    Sound.sfx(this.charge ? "charge_up" : kind === 2 || kind === 3 ? "charge_long" : "charge_up", 0, { vol: this.charge ? 0.6 : 0.8, rate: [1, 0.92, 0.8, 1.25, 1.1][kind] });
    if (kind === 1) Sound.sfx("warning", 0, { vol: 0.6 });
    if (kind === 0 || kind === 4) [0.05, 0.2, 0.35].forEach((dl) => Sound.sfx("lock_on", 0, { vol: 0.55, delay: dl, rate: 1 + dl }));
  }
  // where the beam points as it sweeps across the fighter (u: 0 to 1)
  sweepAt(a, u, out) { const k = this.g.shipScale; return this.shipPos(out).add(this._u.set(a.sd * lerp(-2.6, 2.6, u) * k, 0.1 * k, 0)); }
  endAttack() {
    const a = this.atk;
    if (!a) return;
    a.marks.forEach((m) => { m.t = Math.min(m.t, 0.05); });
    if (a.beam) a.beam.stop();
    this.atk = null;
    if (this.charge) { Sound.stopLoop("blaster-charge", 0.06); this.charge = false; }
  }
  // its wind-up was broken by the fighter's shot (it had begun as the clock ran out, and the answer was right)
  demonFoiled(e) {
    const a = this.atk;
    if (a) [0, 1].forEach((i) => this.kit.sparks(e.claw(i, this._v), a.col, { n: 8, speed: 5, life: 0.4, gravity: 3 }));
    this.endAttack();
  }
  runAttack(d) {
    const a = this.atk;
    if (!a) return;
    const g = this.g, kit = this.kit, e = a.e, A = a.att, GO = LORD.GO, k = g.shipScale, k6 = e.S / 6, quiet = REDUCED_MOTION || GFX.calm;
    if (e.att !== A) { this.endAttack(); return; } // (over, or broken off)
    const T = A.time;
    if (T < GO) { // winding up: what it gathers is drawn in to where it gathers
      a.acc += d;
      if (a.acc > 0.045 && !quiet) {
        a.acc = 0;
        const src = a.kind === 0 ? e.claw(Math.random() < 0.5 ? 0 : 1, this._v) : a.kind === 2 ? e.mouth(this._v) : a.kind === 3 ? e.aimPoint(this._v) : a.kind === 4 ? e.wingTip(Math.random() < 0.5 ? 0 : 1, this._v) : e.claw(a.sd > 0 ? 0 : 1, this._v);
        const off = this._w.set(rand(-1, 1), rand(-1, 1), rand(-0.4, 0.8)).normalize().multiplyScalar(1.3 * k6);
        kit.sparks(this._u.copy(src).add(off), a.col, { n: 1, speed: 1.3 * k6 / 0.24, dir: off.clone().multiplyScalar(-1).normalize(), spread: 0.08, life: 0.24, len: 0.5 * k6, w: 0.05 * k6, drag: 1 });
      }
      if (a.beam) a.beam.set(e.aimPoint(this._v), this.sweepAt(a, 0, this._w));
      if (this.charge) Sound.loopSet("blaster-charge", { rate: 0.9 + 0.9 * (T / GO), vol: 0.3 + 0.4 * (T / GO) });
      return;
    }
    const u = T - GO;
    if (!a.released) { // it lets go: the markers close, and the moment is held
      a.released = true;
      if (this.charge) { Sound.stopLoop("blaster-charge", 0.05); this.charge = false; }
      a.marks.forEach((m) => { m.t = Math.min(m.t, 0.08); });
      VFX.slowMo(0.3, 0.25, 0.08);
      if (a.kind === 1) Sound.sfx("whoosh", 0, { vol: 0.8 });
      if (a.kind === 2) { Sound.sfx("boss_roar", 0, { vol: 0.9, rate: 1.1 }); Sound.sfx("wave_fire", 0, { delay: 0.04 }); const m = e.mouth(new THREE.Vector3()), to = this.shipPos(new THREE.Vector3()); a.reach = 0.42 * (m.distanceTo(to) / (m.distanceTo(to) + 3.2)); to.z += 3.2; for (let j = 0; j < 3; j++) this.wave(m, to, 0.42, 0.9 * k6, (4.4 - j * 0.5) * k, j * 0.075, a.col); kit.flash(m, a.col, 0.3 * k6, 1.1 * k6, 0.14, 0.9, 2.4); kit.sparks(m, a.col, { n: quiet ? 6 : 18, speed: 15 * k6, dir: this._w.subVectors(to, m).normalize(), spread: 0.4, life: 0.32, len: 0.9 * k6, w: 0.06 * k6 }); } // (the rings run on past the fighter, toward the lens: reach is when the first one is on it)
      if (a.kind === 3) { Sound.sfx("beam_fire"); if (a.beam) a.beam.stop(); a.beam = kit.beam(e.aimPoint(this._v), this.sweepAt(a, 0, this._w), 0xff1030, { dur: 0, width: 0.44 * k, k: 1.7, grow: 0.06 }); }
      if (a.kind === 4) { Sound.sfx("missile_fire", -0.4); Sound.sfx("missile_fire", 0.4, { delay: 0.09, rate: 1.08 }); this.missiles.forEach((ms, j) => this.launch(ms, e, j, a)); }
    }
    if (a.kind === 0) { // a burst of plasma bolts, one claw then the other
      while (a.n < (quiet ? 2 : 5) && u >= a.n * 0.06) {
        const i = a.n % 2, n = a.n++, from = e.claw(i, new THREE.Vector3()), to = this.shipPos(new THREE.Vector3()).add(this._v.set(rand(-0.9, 0.9), rand(-0.1, 0.5), rand(-0.6, 0.6)).multiplyScalar(k * (n ? 1 : 0.2)));
        kit.flash(from, a.col, 0.14 * k6, 0.55 * k6, 0.1, 0.9); // (its claw already burns: a flick of light as each bolt leaves it)
        kit.sparks(from, a.col, { n: 4, speed: 8 * k6, dir: this._w.subVectors(to, from).normalize(), spread: 0.4, life: 0.16, len: 0.5 * k6, w: 0.05 * k6 });
        kit.bolt(from, to, a.col, { dur: 0.2, width: 0.13 * k6, len: 3.6, k: 2.8, light: n < 2, onHit: (p) => { if (n === 0) this.strikeLands(a, from); else { kit.flash(p, a.col, 0.2 * k, 0.75 * k, 0.1, 0.75); kit.sparks(p, a.col, { n: 9, speed: 7 * k, life: 0.3, len: 0.5 * k, w: 0.05 * k }); Sound.sfx("impact_shield", this.pan(p), { vol: 0.45 }); } } });
        e.recoil[i] = 1;
        Sound.sfx("plasma_fire", i ? -0.5 : 0.5, { vol: 0.7, rate: 1 + n * 0.03 });
      }
    } else if (a.kind === 1) { // the lunge: three claws raked across the fighter
      if (a.n === 0 && u >= 0.07) {
        a.n = 1;
        const c = this.shipPos(new THREE.Vector3());
        for (let j = -1; j <= 1; j++) this.streak(c.clone().add(this._v.set(a.sd * 2.5 * k, (1.45 + j * 0.4) * k, 0.2)), c.clone().add(this._w.set(-a.sd * 2.3 * k, (-1.0 + j * 0.4) * k, 0.5)), a.col, 0.1, 0.34 * k);
        kit.light(c, a.col, 3, 0.2, 9);
        a.from = c.clone().add(this._v.set(a.sd * 2.5 * k, 1.4 * k, 0));
      }
      if (a.n === 1 && u >= 0.12) { // the claws go through
        a.n = 2;
        this.strikeLands(a, a.from);
        Sound.sfx("slam", 0, { vol: 0.9 });
      }
    } else if (a.kind === 2) { // the ring of force arrives
      if (!a.hit && u >= (a.reach || 0.32)) { this.strikeLands(a, e.mouth(this._v)); kit.sparks(this.shipPos(this._v), a.col, { n: 14, speed: 9 * k, life: 0.4, len: 0.6 * k }); }
    } else if (a.kind === 3) { // the beam sweeps across the fighter, and bites as it crosses
      const su = clamp(u / 0.42, 0, 1), end = this.sweepAt(a, su, new THREE.Vector3());
      if (a.beam) { if (u < 0.46) a.beam.set(e.aimPoint(this._v), end); else { a.beam.stop(); a.beam = null; } }
      if (u < 0.44 && (a.acc += d) > 0.03) { a.acc = 0; kit.sparks(end, 0xff5a3a, { n: 2, speed: 6, life: 0.3, gravity: 0, len: 0.4, w: 0.05 }); }
      if (!a.hit && su >= 0.5) { this.strikeLands(a, e.aimPoint(this._v)); kit.hull(end, 0xff3a3a, { size: 1.2 * k, gravity: 0 }); }
    }
  }
  // a streak of light drawn fast from one place to another: a point, a tail thinning to nothing, no ball of light
  // at its head (a claw raked across the fighter)
  streak(from, to, col, dur, w, k = 1.8) {
    const d = this.kit._dart(), v = this._u.subVectors(to, from), len = v.length();
    d.p.copy(from); d.v.copy(v).multiplyScalar(1 / dur); d.life = d.t = dur * 1.6; d.w = w; d.len = len * 0.75; d.stretch = 0; d.g = 0; d.drag = 1; d.fade = 1.5; d.col = fxRGB(col, k); d.bolt = null;
  }
  // a ring of force that travels (the roar)
  wave(from, to, dur, s0, s1, delay, col) {
    const w = this.waves.find((x) => !x.live) || this.waves[0];
    w.from.copy(from); w.to.copy(to); w.dur = dur; w.t = -1e-4 - delay; w.s0 = s0; w.s1 = s1; w.live = true;
    w.m.material.uniforms.uColor.value.copy(neon(col, 2.2));
  }
  // a seeker leaves a wing tip, swings wide and comes in on the fighter
  launch(ms, e, j, a) {
    const g = this.g, k = g.shipScale, sd = j % 2 ? -1 : 1;
    e.at(e.lost[j % 2 ? "wingR" : "wingL"] ? [-sd * 0.14, 0.16, -0.02] : [sd * (0.4 - (j >> 1) * 0.1), 0.02 + (j >> 1) * 0.16, 0.0], ms.a); // (from the outer blades of its wings; a wing shot away: from its shoulder)
    this.shipPos(ms.c).add(this._v.set(rand(-0.7, 0.7), rand(-0.1, 0.4), rand(-0.4, 0.6)).multiplyScalar(k));
    ms.b.copy(ms.a).lerp(ms.c, 0.5).add(this._v.set(sd * (2.6 + (j >> 1) * 1.3), 0.9 - (j >> 1) * 1.9, 1.5)); // (it swings out to its own side, high or low)
    ms.t = -(j >> 1) * 0.08 - 1e-4; ms.dur = 0.5; ms.first = j === 0; ms.atk = a;
    ms.sp.visible = false;
    ms.tail.pts = []; ms.tail.width = 0.085 * k; ms.tail.mesh.visible = false; ms.out = 0; ms.acc = 0;
  }
  // the strike reaches the fighter: now the shield is seen to go
  strikeLands(a, from) {
    if (a.hit) return;
    a.hit = true;
    this.playerHit(from, a.kind);
  }
  // ---- the fighter is hit: the shield that the rules took is seen to go --------------------------------------
  playerHit(from, kind) {
    const g = this.g, kit = this.kit, k = g.shipScale, p = this.shipPos(new THREE.Vector3()), quiet = REDUCED_MOTION || GFX.calm;
    if (this.debts.length) this.debts.shift();
    const left = g.shields + this.debts.length, hard = clamp((3 - left) / 3, 0.34, 1), sd = from ? (from.x < p.x ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
    if (g.jet.shieldLost) g.jet.shieldLost({ x: -sd });
    // the HUD: the shield that went breaks, the bar flickers and cracks, the ship cannot be hit again for a moment
    g.lives(left, 3);
    HudFX.lifeLost(g.el);
    HudFX.hurt(g.el, hard);
    HudFX.blink(g.el, 900);
    // the picture: a red flash at its edges, the colours split, a shake by how much is left
    // (all of it hard and short: the tear, the colour split and the shake are let go after four frames, so the answers'
    // drones are never unreadable for longer than that)
    GFX.hitFlash("hit");
    GFX.glitch(0.3 + 0.4 * hard, 0.08);
    GFX.pulse(2.2 + 2.8 * hard, 0);
    g.shake(0.14 + 0.24 * hard);
    g.show.wait(0.05, () => { GFX.ab = Math.min(GFX.ab, 0.9); GFX.punch = Math.min(GFX.punch, 0.002); g.shakeAmt = Math.min(g.shakeAmt, 0.04 + 0.04 * hard); });
    VFX.hitStop(2);
    Haptics.buzz([60, 40, 90]);
    // the ship: sparks off the hull where it landed, shards of the shield, smoke
    const at = p.clone().add(this._v.set(sd * 0.7 * k, 0.35 * k, -0.2 * k));
    kit.hull(at, kind === 3 || kind === 1 ? 0xff4a4a : kind === 4 ? 0xffa030 : 0xd060ff, { size: 0.62 * k, gravity: 0 });
    kit.debris(at, { n: quiet ? 4 : 9, size: 0.3 * k, speed: 7 * k, color: 0x1c7a90, hot: 0x8feaff, gravity: 0, life: 1.0 });
    if (!quiet) for (let i = 0; i < 2; i++) kit.smoke(at.clone().add(this._v.set(rand(-0.5, 0.5), rand(0, 0.4), rand(-0.3, 0.3)).multiplyScalar(k)), { size: 0.5 * k, life: 0.8, a: 0.42, cold: true, vel: this._w.set(0, 0.4, 3) });
    Sound.sfx("player_hit", sd * 0.3);
    Sound.sfx("shield_down", 0, { delay: 0.09, vol: 0.9 });
    if (left === 2) Sound.say("SHIELD DOWN"); else if (left === 1) Sound.say("LAST SHIELD"); else if (left <= 0) Sound.say("CRITICAL");
    this.setLow(left <= 0 ? 2 : left === 1 ? 1 : 0);
  }
  // ---- one shield left -------------------------------------------------------------------------------------
  // on: 0 (or false) no; 1 (or true) one shield left: the red frame beats, the alarm sounds, the hurt engine trails
  // smoke and fire; 2 none left: the frame holds, the alarm has gone quiet with everything else, the fire is worse
  setLow(on) {
    const g = this.g;
    on = on === true ? 1 : on || 0;
    if (on === this.low) return;
    this.low = on;
    GFX.setDanger(on === 2 ? 1 : on ? 0.72 : 0);
    HudFX.low(g.el, !!on);
    if (this.trail) { this.trail.on = false; this.trail = null; }
    if (on === 1) { this.alarmOn(); this.lowT = 0; } else { Sound.stopLoop("blaster-alarm", 0.3); this.alarm = false; }
    if (on && !(REDUCED_MOTION || GFX.calm)) this.trail = this.kit.trailer((v) => this.exhaust(1, v), { smoke: 0.7, fire: on === 2 ? 0.9 : 0.55, sparks: 0.5, rate: on === 2 ? 26 : 18, size: 0.34 * g.shipScale, vel: new THREE.Vector3(0, 0.3, 2.2), life: 0.6, a: 0.4 });
  }

  // ---- the demon is hurt ---------------------------------------------------------------------------------------
  demonArrive(e) { this.leaks.forEach((t) => { t.on = false; }); this.leaks.length = 0; }
  // the lance lands on its core (the rule: resolve, a right answer)
  demonHit(e, p, color, staggered) {
    const g = this.g, kit = this.kit, k6 = e.S / 6;
    // (a small hot heart and a wide ring: the blow is bright where it lands, and the demon is seen taking it)
    kit.flash(p, 0xffffff, 0.3 * k6, 1.0 * k6, 0.1, 1, 3);
    kit.flash(p, color, 0.6 * k6, 1.9 * k6, 0.26, 0.8, 2.2);
    kit.sparks(p, color, { n: 26, speed: 13 * k6, spread: 1.4, life: 0.45, len: 0.9 * k6, w: 0.07 * k6 });
    kit.sparks(p, 0xffffff, { n: 10, speed: 18 * k6, life: 0.22, len: 1.1 * k6, w: 0.05 * k6, k: 2.2 });
    kit.embers(p, color, { n: 8, radius: 0.5 * k6, life: 1.1 });
    kit.ring(p, color, { size: 6.5 * k6, dur: 0.45 });
    kit.light(p, color, 1.6 * k6, 0.22, 14 * k6);
    GFX.bloomPulse(0.4);
    g.shake(0.13 * k6);
    kit.debris(p, { n: staggered ? 9 : 4, size: 0.5 * k6, speed: 8 * k6, color: 0x2a2836, dir: this._v.set(0, 0.2, 1), spread: 1.2, gravity: 0 });
    VFX.hitStop(3);
    Sound.sfx("impact_big", 0, { vol: 0.85 });
    Sound.sfx(staggered ? "boss_stagger" : "boss_hurt", 0, { vol: 0.75, delay: 0.05 });
  }
  // a wound opens in its armour: a small blast where the plate goes, and from now on that place leaks
  demonWound(e, i) {
    const kit = this.kit, k6 = e.S / 6, W = LORD.WOUNDS[i], p = e.at(W, new THREE.Vector3());
    kit.flash(p, 0xffffff, 0.14 * k6, 0.5 * k6, 0.08, 1, 2.6);
    kit.flash(p, 0xff5a8a, 0.3 * k6, 0.9 * k6, 0.14, 0.6, 2);
    kit.sparks(p, 0xffb8a0, { n: 14, speed: 9 * k6, life: 0.4, len: 0.6 * k6, w: 0.05 * k6 });
    kit.debris(p, { n: 6, size: 0.42 * k6, speed: 7 * k6, color: 0x2a2836, gravity: 0 });
    Sound.sfx("boss_break", this.pan(p), { vol: 0.7, delay: 0.04 });
    if (!(REDUCED_MOTION || GFX.calm)) this.leaks.push(kit.trailer((v) => (e.root.visible && !e.blown ? e.at(W, v) : null), { smoke: 0.3, fire: 0.12, sparks: 0.8, rate: 7, size: 0.26 * k6, vel: new THREE.Vector3(0, 0.5, 0.8), life: 0.55, color: 0xff6a8a, a: 0.3 })); // (sparks and a thread of smoke: it is seen through them)
  }
  // a part of it is shot away (its tail, a wing)
  demonShed(e, p, name) {
    const g = this.g, kit = this.kit, k6 = e.S / 6, at = p.clone();
    // (a beat after the blow that did it, and small enough that the demon is still seen behind it)
    g.show.wait(0.08, () => {
      if (g.unmounted) return;
      kit.flash(at, 0xffffff, 0.2 * k6, 0.75 * k6, 0.09, 1, 2.6);
      kit.flash(at, 0xff4a7a, 0.4 * k6, 1.3 * k6, 0.18, 0.6, 2);
      kit.sparks(at, 0xffd8a8, { n: 22, speed: 12 * k6, life: 0.45, len: 0.8 * k6, w: 0.06 * k6, k: 2.4 });
      kit.sparks(at, 0xff4a7a, { n: 12, speed: 7 * k6, life: 0.7, len: 0.5 * k6, w: 0.06 * k6 });
      for (let i = 0; i < 3; i++) kit.fire(this._v.set(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.2, 0.2)).multiplyScalar(k6).add(at), { size: 0.5 * k6, life: 0.3, vel: this._w.set(rand(-1.5, 1.5), rand(-1, 1.5), rand(-1, 1)) });
      kit.ring(at, 0xff4a7a, { size: 3.5 * k6, dur: 0.45 });
      kit.light(at, 0xff4a7a, 2.5 * k6, 0.2, 12 * k6);
      g.shake(0.2);
      kit.debris(at, { n: 10, size: 0.6 * k6, speed: 9 * k6, color: 0x2a2836, gravity: 0 });
      Sound.sfx("explosion_small", this.pan(at));
      Sound.sfx("boss_break", this.pan(at), { vol: 0.8, delay: 0.06 });
    });
    // the stump burns: sparks, a lick of fire, a thread of smoke
    const stump = name === "tail" ? [0, -0.09, 0.05] : [name === "wingL" ? 0.06 : -0.06, 0.1, -0.03];
    if (!(REDUCED_MOTION || GFX.calm)) this.leaks.push(kit.trailer((v) => (e.root.visible && !e.blown ? e.at(stump, v) : null), { smoke: 0.45, fire: 0.4, sparks: 0.7, rate: 10, size: 0.34 * k6, vel: new THREE.Vector3(0, 0.5, 1.0), life: 0.6, a: 0.35 }));
  }
  // something shorts in one of its wounds
  demonLeak(e, p) { this.kit.sparks(p, 0xff7a4a, { n: 10, speed: 5 * (e.S / 6), life: 0.45, len: 0.5, gravity: 2 }); }
  // it arrives: wings wide, and roars
  demonRoar(e) {
    const m = e.mouth(new THREE.Vector3());
    Sound.sfx("boss_roar", 0, { vol: 0.9 });
    if (!(REDUCED_MOTION || GFX.calm)) { this.kit.ring(m, 0xd050ff, { size: 5 * (e.S / 6), dur: 0.8 }); this.g.shake(0.14); }
  }
  // the wave's last three questions: it rages
  demonRage(e) {
    const g = this.g, quiet = REDUCED_MOTION || GFX.calm;
    Sound.sfx("boss_roar", 0, { vol: 0.9, rate: 0.9 });
    Sound.sfx("warning", 0, { vol: 0.7, delay: 0.25 });
    Sound.say("WARNING");
    this.kit.ring(e.aimPoint(this._v), 0xff2a40, { size: 9 * (e.S / 6), dur: 0.7 });
    this.kit.sparks(e.aimPoint(this._v), 0xff3a5a, { n: quiet ? 8 : 26, speed: 6, life: 0.9, gravity: 1.2 });
    if (!quiet) g.shake(0.2);
  }
  demonGloat(e) { Sound.sfx("boss_roar", 0, { vol: 0.9, rate: 0.8 }); }
  // ---- the demon dies (the rule: after, the wave's last question) -------------------------------------------
  // The fighter's last burst goes into its core, and that is what ends it: the moment slows as the first bolts land,
  // then the chain of blasts runs faster and faster to the last one.
  demonDeath(e) {
    const g = this.g, kit = this.kit, k = g.shipScale, k6 = e.S / 6, col = 0xffe2a0, quiet = REDUCED_MOTION || GFX.calm;
    this.endAttack();
    this.aimQ.setFromRotationMatrix(this._m.lookAt(g.ship.position, e.aimPoint(this._v), this._up)).slerp(this._q.set(0, 0, 0, 1), 0.45);
    this.aimT = 0.5;
    for (let n = 0; n < 3; n++) g.show.wait(n * 0.055, () => {
      if (g.unmounted) return;
      for (let gun = 0; gun < 2; gun++) {
        const from = this.muzzle(gun, new THREE.Vector3()), to = e.aimPoint(new THREE.Vector3()).add(this._v.set((gun ? 0.1 : -0.1) * (1 + n), rand(-0.1, 0.1), 0.25 * k6)), dir = this._w.subVectors(to, from).normalize();
        kit.muzzle(from, dir, col, 0.4 * k);
        kit.shells(from, this._v.set(gun ? 1 : -1, 0.5, 0.6).normalize());
        kit.bolt(from, to, col, { dur: 0.09, width: 0.2 * k, len: 3.6 * k, onHit: (p) => {
          kit.flash(p, 0xffffff, 0.25 * k6, 0.9 * k6, 0.09, 1, 2.6);
          kit.sparks(p, col, { n: quiet ? 5 : 12, speed: 11 * k6, life: 0.35, len: 0.8 * k6, w: 0.06 * k6 });
          if (gun === 0) Sound.sfx("impact_big", 0, { vol: 0.6, rate: 1.05 + n * 0.08 });
          if (n === 0 && gun === 0) { VFX.slowMo(0.3, 0.45, 0.25); Sound.sfx("slowmo_in", 0, { vol: 0.5 }); Sound.sfx("boss_death", 0, { vol: 0.9 }); e.flash = 0.6; e.flashCol.setRGB(1, 0.9, 0.7); }
        } });
        if (g.jet.fire) g.jet.fire(col, true, g.jet.model ? gun : undefined);
      }
      Sound.sfx("laser_fire", 0, { vol: 0.8, rate: 1 + n * 0.06 });
    });
  }
  // one of the chain of blasts that take it apart (a part has just come away at p)
  demonChain(e, p, i) {
    const g = this.g, kit = this.kit, k6 = e.S / 6;
    if (REDUCED_MOTION || GFX.calm) { kit.sparks(p, 0xffd8a8, { n: 14, speed: 10 * k6, life: 0.5, len: 0.7 * k6 }); kit.debris(p, { n: 5, size: 0.6 * k6, speed: 8 * k6, color: 0x2a2836, gravity: 0 }); } // (with Reduced effects: sparks and wreckage, no run of flashes)
    else kit.explosion(p, { size: 0.5 * k6, color: i % 2 ? 0xff7a2a : g.waveCol.getHex(), shake: false, smoke: i % 2 === 0 });
    g.shake(0.14 + 0.03 * i);
    Sound.sfx("explosion_small", this.pan(p), { rate: 0.95 + i * 0.06 });
  }
  // the last blast
  demonBlast(e, p) {
    const g = this.g, kit = this.kit, k6 = e.S / 6, col = g.waveCol.getHex(), quiet = REDUCED_MOTION || GFX.calm;
    this.leaks.forEach((t) => { t.on = false; }); this.leaks.length = 0;
    kit.explosion(p, { size: 1.3 * k6, color: col, shake: false });
    kit.sparks(p, 0xffffff, { n: quiet ? 12 : 40, speed: 30 * k6, life: 0.6, len: 1.8 * k6, w: 0.07 * k6, k: 2.6 }); // (long white streaks thrown clear: the blast's size is in these, its ring and its debris)
    kit.ring(p, 0xffffff, { size: 15 * k6, dur: 0.85 });
    g.show.wait(0.1, () => { if (!g.unmounted) kit.ring(p, col, { size: 22 * k6, dur: 1.1 }); }); // (a second, wider and slower, in the wave's colour)
    GFX.ripple(g.camera, p, 1, 0.7); // the picture itself bends as the shock passes
    GFX.bloomPulse(0.9);
    Sound.setIntensity(3);
    kit.debris(p, { n: quiet ? 10 : 26, size: 0.95 * k6, speed: 15 * k6, color: 0x2a2836, gravity: 0, life: 1.6 });
    kit.embers(p, 0xff5a8a, { n: 16, radius: 2.2 * k6, life: 2.4, speed: 3 });
    VFX.hitStop(3);
    GFX.pulse(4, 0.1);
    g.shake(0.5);
    Sound.sfx("explosion_huge");
    Sound.sfx("debris", 0, { delay: 0.35, vol: 0.8 });
    // the reward: stars and coins fly from the blast to the score
    const from = this.screen(p), perfect = this.misses === 0, high = e.finale;
    g.show.wait(0.2, () => {
      if (g.unmounted) return;
      HudFX.reward(g.el, from, "[data-score]", { n: 12, kind: "star", color: COLORS.yellow });
      HudFX.reward(g.el, from, "[data-score]", { n: 7, kind: "coin", color: COLORS.gold });
      Sound.sfx("reward", 0, { vol: 0.9 });
    });
    if (high || perfect) g.show.wait(1.1, () => { if (!g.unmounted && g.state !== "over") Sound.say(high ? "NEW HIGH SCORE" : "PERFECT"); });
    this.misses = 0;
  }
  // ---- between waves: the warp, held back until the demon has gone up (look only) -----------------------------
  // region: the part of space the next wave starts in (it comes up with the warp)
  waveEnd(region) { const e = this.g.enemy; this.region = region; this.warpAt = e && e.dieT >= 0 ? (e.finale ? 1.07 : 0.87) : 0.02; }
  // ---- the run ends: the last shield has gone, and the ship with it ---------------------------------------------
  over() {
    const g = this.g, kit = this.kit, k = g.shipScale, p = this.shipPos(new THREE.Vector3());
    this.debts.length = 0;
    g.lives(g.shields, 3);
    this.endAttack();
    this.setLow(0);
    this.loops(false);
    kit.explosion(p, { size: 1.5 * k, color: 0xff8a2a });
    kit.debris(p, { n: 14, size: 0.5 * k, speed: 9 * k, color: 0x23232e, gravity: 0, life: 1.5 });
    Sound.sfx("explosion_big");
    g.show.wait(0.42, () => { if (g.unmounted) return; const q = p.clone().add(this._v.set(rand(-0.8, 0.8) * k, 0.2 * k, 0.6 * k)); kit.explosion(q, { size: 0.9 * k, color: 0x6fd0ff, ring: false }); Sound.sfx("explosion_small", 0, { rate: 0.9 }); }); // a tank goes, a moment after the rest
  }

  update(dt, sp, w) {
    const g = this.g, d = VFX.dt, kit = this.kit, ship = g.ship, k = g.shipScale;
    kit.drift.set(0, 0, Math.min(sp * 0.3, 3.5)); // (what is left behind falls behind: slowly enough that a blast stays where it was struck)
    // ---- the fighter's aim: toward its target for a moment after it fires, back to its hover otherwise
    this.aimT = Math.max(0, this.aimT - d);
    this.idleQ.setFromEuler(this._e.set(Math.sin(VFX.t) * 0.05, 0, Math.sin(VFX.t * 0.9) * 0.12));
    if (g.state !== "over") ship.quaternion.slerp(this.aimT > 0 ? this.aimQ : this.idleQ, 1 - Math.exp(-d * (this.aimT > 0 ? 26 : 7)));
    // ---- the burst: three volleys, then the beams hold until the answer has landed
    const sh = this.shot;
    if (sh) {
      sh.time += d;
      while (sh.n < (REDUCED_MOTION || GFX.calm ? 1 : 3) && sh.time >= sh.n * 0.065) { this.volley(sh); sh.n++; } // (with Reduced effects: one volley, not three in a row)
      if (sh.beams) sh.beams.forEach((b, q) => b.set(this.muzzle(q, this._v), sh.at));
      if (sh.time > sh.until || sh.time > 0.9) { if (sh.beams) sh.beams.forEach((b) => b.stop()); this.shot = null; }
    }
    this.runAttack(d);
    // ---- the roar's rings and the seekers in flight
    for (const wv of this.waves) {
      if (!wv.live) continue;
      wv.t = wv.t < 0 ? Math.min(0, wv.t + d) : wv.t + d;
      if (wv.t < 0) { wv.m.visible = false; continue; }
      const u = Math.min(1, wv.t / wv.dur);
      wv.m.visible = u < 1;
      if (u >= 1) { wv.live = false; wv.t = -1; continue; }
      wv.m.position.lerpVectors(wv.from, wv.to, u);
      wv.m.quaternion.copy(g.camera.quaternion);
      wv.m.scale.setScalar(lerp(wv.s0, wv.s1, Math.pow(u, 0.8)));
      wv.m.material.uniforms.uK.value = Math.min(1, u * 8) * (1 - smoothstep(0.9, 1, u));
      wv.m.material.uniforms.uT.value = VFX.t;
    }
    for (const ms of this.missiles) {
      if (ms.t === -1) continue;
      ms.t = ms.t < 0 ? Math.min(0, ms.t + d) : ms.t + d;
      if (ms.t < 0) continue;
      const u = Math.min(1, ms.t / ms.dur), v = 1 - u;
      ms.p.set(v * v * ms.a.x + 2 * v * u * ms.b.x + u * u * ms.c.x, v * v * ms.a.y + 2 * v * u * ms.b.y + u * u * ms.c.y, v * v * ms.a.z + 2 * v * u * ms.b.z + u * u * ms.c.z);
      ms.sp.visible = true;
      ms.sp.position.copy(ms.p);
      ms.sp.scale.setScalar(0.34 * k * (0.9 + 0.1 * Math.sin(VFX.t * 40)));
      if (d > 0) { ms.tail.mesh.visible = true; ms.tail.push(ms.p); } // a ribbon of fire behind it, and sparks shed along the way
      if ((ms.acc += d) > 0.035) { ms.acc = 0; kit.sparks(ms.p, 0xffc070, { n: 1, speed: 1.6, life: 0.3, len: 0.3 * k, w: 0.04 * k, gravity: 0 }); }
      if (u >= 1) {
        ms.t = -1; ms.sp.visible = false; ms.out = 0.3;
        kit.explosion(ms.p, { size: 0.3 * k, color: 0xffa030, ring: false, shake: false, debris: false, smoke: false });
        Sound.sfx("missile_hit", this.pan(ms.p), { vol: 0.8 });
        if (ms.atk && !ms.atk.hit) this.strikeLands(ms.atk, ms.a);
      }
    }
    for (const ms of this.missiles) if (ms.t === -1 && ms.out > 0) { ms.out -= d; if (d > 0) ms.tail.push(ms.p); if (ms.out <= 0) ms.tail.mesh.visible = false; } // (its ribbon runs in to where it struck, and is gone)
    // ---- a shield owed is always seen to go: if no strike lands for it, it goes on its own
    for (let i = this.debts.length - 1; i >= 0; i--) if ((this.debts[i].t += d) > 1.7) { this.debts.splice(i, 1); this.debts.unshift({ t: 0 }); this.playerHit(null, -1); break; }
    // ---- the warp between waves, when the demon's blast has passed
    if (this.warpAt >= 0 && (this.warpAt -= d) < 0) {
      this.warpAt = -1;
      g.warp = g.warpDur = 1.0;
      if (this.region !== undefined) g.space.setRegion(this.region, 1.8);
      if (g.jet.warp) g.jet.warp();
      if (g.jet.shieldUp) g.jet.shieldUp();
      Sound.sfx("warp", 0, { vol: 0.8 });
      this.setLow(g.shields + this.debts.length === 1 ? 1 : 0);
    }
    // ---- one shield left: the red frame round the band. It swells with each tone of the alarm (two to its loop),
    // or stands still with Reduced effects; with no shield left it holds.
    this.lowK += ((this.low && g.state !== "over" ? 1 : 0) - this.lowK) * Math.min(1, d * 5);
    if (this.lowK > 0.01) {
      const cam = g.camera, b = g.bandSize(6), calm = REDUCED_MOTION || GFX.calm;
      const ph = (this.alarm && Sound.ctx ? Sound.ctx.currentTime - this.alarmAt : VFX.t) / 1.125;
      const beat = calm || this.low === 2 ? 0.7 : 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
      this.frame.visible = true;
      this.frame.position.copy(cam.position).add(this._v.set(0, 0, -6).applyQuaternion(cam.quaternion));
      this.frame.quaternion.copy(cam.quaternion);
      this.frame.scale.set(b.w * 1.5, b.h * 1.5, 1);
      this.frameU.uK.value = this.lowK * (0.42 + 0.58 * beat);
    } else this.frame.visible = false;
    // ---- sound that follows the game: the engines with the streak and the warp; without a recording, the alarm as a pip
    const heat = g.jet.heat || 0;
    const sput = this.low ? 0.93 + 0.05 * Math.sin(VFX.t * 9) * Math.sin(VFX.t * 2.3) : 1; // (an engine is hurt: the note sags and wavers)
    if (this.engine) Sound.loopSet("blaster-engine", { rate: (0.85 + heat * 0.3 + w * 0.5) * sput, vol: 0.26 + heat * 0.1 + w * 0.22 }); else Sound.rev((0.5 + heat * 0.45 + w * 0.5) * sput);
    if (this.low === 1 && !this.alarm && (this.lowT -= d) <= 0) { this.lowT = 1.125; Sound.sfx("alarm", 0, { vol: 0.6 }); }
    if (this.low && g.state === "over") this.setLow(0);
    // the music holds its upper layers through the wave's last three questions (its rage), whatever the streak
    if (g.enemy.rageOn && g.state !== "over" && Sound.intensity < 2) Sound.setIntensity(2);
  }
  dispose() {
    this.loops(false);
    this.frame.material.dispose(); this.frame.geometry.dispose();
    GFX.setDanger(0);
    HudFX.low(this.g.el, false);
    this.kit.dispose();
    this.waves.forEach((w) => { w.m.material.dispose(); });
    this.waves[0].m.geometry.dispose();
    this.missiles.forEach((m) => { m.sp.material.dispose(); m.tail.mesh.geometry.dispose(); m.tail.mesh.material.dispose(); });
  }
}
