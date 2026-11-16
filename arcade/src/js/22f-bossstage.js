// Boss Rush's fight, staged (when the boss's model has loaded: with the built-in cyborg the game shows what it always
// showed). The rules decide what happens and when (22-boss.js: pick, timeout, playerHit, bossAttack, after, victory,
// defeat); this file decides what is seen and heard of it, with the shared effects kit (CombatFX), on the show clock:
//   the entrance         it drops in from above the picture and lands with weight (a ring of dust, the floor shakes),
//                        then powers up: its lights come on, it roars, its name is called
//   the charge           the boss's attack bar fills while the question is read: its wind-up pose follows the bar, the
//                        lens draws back, what it gathers glows; in the last quarter a marker of the strike's own
//                        shape stands on the player's side of the picture and a hum rises
//   the strike           on the frame the rule fires, the blow is at its end; one of five kinds leaves it (a volley,
//                        a ground slam, a wave, a swept beam, seekers), each with its own flight and landing, in the
//                        boss's colour. It has landed before the explanation sheet comes up (the sheet is a rule)
//   the strike lands     now the heart is seen to go: a red flash, the colours split, a shake by how much is left,
//                        the HUD cracks, the heart breaks; one heart left: a red frame that beats, and the alarm
//   a right answer       three bolts from the answer's side spark off its armour; on the rule's frame a lance lands
//                        on its body: a white heart, sparks in the answer's colour, a thin ring, a hit-stop; it recoils
//   a wrong answer       one bolt dies on its armour in a dull red fizzle, and its strike comes
//   damage               as its HP falls: a hole burnt in its chest, armour torn off its arm and thrown, the arm hangs,
//                        the stumps leak sparks and smoke; under 35% it rages
//   death                slow motion, it goes over backward as blasts run along its body and parts fly; the last
//                        blast as it hits the floor; stars and coins to the score
// Nothing here is read by a rule. A heart lost is shown when the blow lands (a moment after the rule took it), so the
// game's HUD asks this file how many are still owed (owed) before it draws its hearts.
const BOSS_ATK = {
  MARK: ["lock", "bang", "ring", "arc", "seek"], // each kind's marker
  CLIP: ["attackB", "attackA", "attackB", "attackA", "attackB"], // and the clip it is played with: a thrust, or an overhead smash
  FLY: [0.13, 0.12, 0.16, 0.11, 0.2], // how long it takes to reach the player once it is let go (show seconds)
  SMOKE: 0x2c2244, WRECK: 0x241c38, // smoke and wreckage stay in the palette
};
class BossStage {
  constructor(game, actor) {
    const g = (this.g = game), s = g.scene, row = (this.row = g.row);
    g.show = new TweenSet(); // show-only timing: nothing in it is a rule
    this.kit = g.kit = new CombatFX(g, { unit: 1, ground: 0, sparks: 420, chunks: 96, firePuffs: 120, smokePuffs: 120, lights: 3 });
    this.a = actor;
    this.S = row.size;
    actor.root.scale.setScalar(this.S);
    this.col = new THREE.Color(g.cfg.color); this.hex = this.col.getHex();
    const hsl = this.col.getHSL({ h: 0, s: 0, l: 0 });
    this.beamCol = hsl.h < 0.04 || hsl.h > 0.94 ? 0xff1030 : this.hex; // (a lit neon red goes pink: a red boss's beam is a deep red at low gain)
    this.debts = []; // hearts the rules have taken that have not been seen to go yet
    this.low = 0; this.lowT = 0; this.leaks = []; this.tears = row.tear.map(([at, bone]) => ({ at, bone, done: false }));
    this.wide = 1; this.wideTo = 1; this.dist = 16; this.punch = 0; this.camLow = 0;
    this.tele = null; this.strike = null; this.shot = null; this.kindN = 0; this.dying = null; this.phase = "wait";
    this.hum = false; this.alarm = false; this.rageOn = false; this.flick = 1; this.windK = 0;
    // what it gathers as it winds up: a glow where the attack will leave it
    this.orb = glowSprite(neon(this.hex, 2.2), 0.1, 1);
    this.orb.visible = false; this.orb.renderOrder = 7;
    s.add(this.orb);
    // its seekers: a hot head each, a ribbon behind it
    this.seekers = [0, 1, 2, 3].map(() => {
      const sp = glowSprite(neon(this.hex, 2.6), 0.5, 1), tail = new Trail({ length: 16, width: 0.12, color: this.hex, intensity: 1.9, up: new THREE.Vector3(0, 0, 1) });
      sp.visible = tail.mesh.visible = false; sp.renderOrder = 9; tail.mesh.renderOrder = 8;
      s.add(sp, tail.mesh);
      return { sp, tail, t: -1, dur: 1, out: 0, acc: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), p: new THREE.Vector3(), hit: null };
    });
    // the arena's lamps, set for armour that mirrors the sky: two rims in its colour, a cold edge, a key, a fill
    const L = g.lamps;
    if (L) {
      L.rimB.color.copy(this.col).lerp(new THREE.Color(0xffffff), 0.2);
      this.rim0 = [L.rimA.intensity * 1.25, 3.4]; // (their full strength: they come up as it powers up)
      L.edge.color.set(0xcfeaff); L.edge.intensity = 1.5;
      L.key.intensity = 1.9;
      L.fill.intensity = 1.5; L.fill.distance = 60;
      L.under.intensity *= 1.3;
    }
    if (g.pillarMat) g.pillarMat.color.multiplyScalar(0.5); // (the pillars stand back: beside armour that mirrors the sky they were the brightest things in the picture)
    // everything that used to throw a burst of square dots throws sparks while the fight is staged
    g.bursts.burst = (pos, color, o = {}) => this.kit.sparks(pos, color, { n: Math.min(40, Math.ceil((o.n || 60) * 0.5)), speed: (o.speed || 10) * 1.1, life: (o.life || 1.1) * 0.7, len: (o.size || 0.3) * 2.4, w: (o.size || 0.3) * 0.3, gravity: 3 });
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._u = new THREE.Vector3(); this._n = new THREE.Vector3();
  }
  get owed() { return this.debts.length; }
  // ---- places ---------------------------------------------------------------------------------------------------
  // a place in the picture: x, y from -1 to 1 across and up the band, `dist` from the lens
  lens(x, y, dist, out) {
    const g = this.g, cam = g.camera, t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), hb = (g.band ? g.band.h : GFX.h) / GFX.h;
    return (out || new THREE.Vector3()).set(x * dist * t * (GFX.w / GFX.h), y * dist * t * hb, -dist).applyQuaternion(cam.quaternion).add(cam.position);
  }
  // where the player's shot leaves: under the foot of the picture, on the side its answer's letter is on
  muzzle(slot, out) {
    const el = $$(".answers .ans .k", this.g.el)[slot], r = el && el.getBoundingClientRect();
    return this.lens(r ? (((r.left + r.width / 2) / GFX.w) * 2 - 1) * 0.92 : -0.8, -1.1, 3.4, out);
  }
  // where the boss's attack leaves it
  src(out) { const p = this.a.at(this.row.src, out); if (this.row.src === "chest") p.z += 0.13 * this.S; return p; }
  screen(p) { const v = this._n.copy(p).project(this.g.camera); return { x: (v.x * 0.5 + 0.5) * GFX.w, y: (0.5 - v.y * 0.5) * GFX.h }; }
  pan(p) { return clamp(p.x / 6, -1, 1) * 0.6; }
  outline(el) { if (el && el.classList.contains("floater")) el.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000, 0 0 6px #000"; }
  // where a figure of damage stands: over its head, inside the picture
  floatAt() {
    const g = this.g, p = this.screen(this._v.set(0, this.S * 1.03, 0)), top = g.band ? g.band.top + 34 : 60;
    return { x: clamp(p.x, 60, GFX.w - 60), y: Math.max(top, p.y - 10) };
  }

  // The boss speaks (the rule's own speech bubble, at the head of the picture): the lens tips up for as long as it is
  // there, so its face stands under its words, not behind them.
  talk(ms) { this.roomT = Math.max(this.roomT || 0, ms / 1000 + 0.2); }
  // ---- sound that runs on ---------------------------------------------------------------------------------------
  loops(on) {
    if (on) {
      if (this.low === 1) this.alarmOn();
      if (this.tele && this.tele.hum) this.hum = Sound.loop("boss-charge", "charge_hum", { vol: 0.3, rate: 1, fade: 0.08 });
    } else { Sound.stopLoop("boss-alarm", 0.1); Sound.stopLoop("boss-charge", 0.05); this.alarm = this.hum = false; }
  }
  alarmOn() { this.alarm = Sound.loop("boss-alarm", "alarm", { vol: 0.3 }); }
  pause() { this.loops(false); Sound.hush(); }
  resume() { if (this.g.state !== "over") this.loops(true); }

  // ---- the entrance (the rule: start) ---------------------------------------------------------------------------
  enter() {
    const g = this.g, a = this.a;
    this.phase = "enter";
    a.root.visible = false; a.power = 0;
    this.wide = this.wideTo = 1;
    g.show.wait(0.3, () => { if (g.unmounted) return; a.root.visible = true; a.enter(); Sound.sfx("whoosh", 0, { vol: 0.6 }); });
  }
  landing() {
    const g = this.g, kit = this.kit, a = this.a, S = this.S, k = S / 7.4, quiet = REDUCED_MOTION || GFX.calm, p = new THREE.Vector3(0, 0.07, 0.4);
    if (a.play && a.play.name === "enter") a.play.rate = 1.2; // (down hard; up again briskly)
    Sound.sfx("boss_land", 0, { vol: 1 });
    kit.wave(p, null, this.hex, { flat: true, dur: 0.6, s0: 1.2 * k, s1: 11 * k, w: 0.09 });
    kit.wave(p, null, 0xffffff, { flat: true, dur: 0.45, s0: 0.8 * k, s1: 7 * k, w: 0.05, delay: 0.04, k: 0.8 });
    for (let i = 0; i < (quiet ? 4 : 9); i++) { // a ring of dust thrown out along the floor
      const an = (i / 9) * Math.PI * 2 + rand(0.3), v = new THREE.Vector3(Math.cos(an), 0.12, Math.sin(an)).multiplyScalar(rand(4.5, 7) * k);
      kit.smoke(this._v.set(Math.cos(an) * 1.3 * k, 0.35, Math.sin(an) * 1.3 * k + 0.4), { size: rand(1.2, 1.7) * k, life: rand(0.7, 1.0), vel: v, rise: 0.25, a: 0.5, cold: true, color: BOSS_ATK.SMOKE, drag: 0.08 });
    }
    kit.sparks(p, this.hex, { n: quiet ? 8 : 22, speed: 9 * k, dir: this._v.set(0, 0.5, 0.6).normalize(), spread: 1.6, life: 0.5, len: 0.7 * k, w: 0.06 * k, gravity: 12 });
    kit.debris(p, { n: quiet ? 5 : 12, size: 0.55 * k, speed: 8 * k, color: BOSS_ATK.WRECK, hot: this.hex, life: 1.0, radius: 1.2 * k });
    kit.scorch(p, { size: 7 * k, life: 9, a: 0.6 });
    kit.light(this._v.set(0, 1.2, 1.5), this.hex, 5, 0.3, 26);
    g.shake(0.4); GFX.bloomPulse(0.5); GFX.ripple(g.camera, p, 0.8, 0.5);
    Haptics.buzz(80);
    if (g.arena) g.arena.strike(1);
    g.cheer = 1;
    g.show.wait(0.38, () => this.powerUp());
  }
  powerUp() {
    const g = this.g, a = this.a;
    if (g.unmounted) return;
    Sound.sfx("boss_power", 0, { vol: 0.9 });
    g.show.add(0.6, (k, raw) => { a.power = raw < 0.2 ? raw * 2.2 : raw < 0.32 ? 0.12 : raw; }, () => { a.power = 1; }, Ease.linear); // (a flicker, a dip, and on)
    g.show.wait(0.5, () => {
      if (g.unmounted) return;
      const h = a.at("head", new THREE.Vector3());
      Sound.sfx(this.row.roar || "roar_" + this.row.key, 0, { vol: 1 });
      this.kit.wave(h, null, this.hex, { dur: 0.7, s0: 0.5, s1: 6.5, w: 0.04 });
      this.kit.wave(h, null, this.hex, { dur: 0.7, s0: 0.5, s1: 5, w: 0.04, delay: 0.14 });
      g.shake(0.12);
      if (g.arena) g.arena.strike(0.8);
      this.phase = "fight";
      if (g.bossKey === "all") Sound.say("FINAL BOSS"); // (the important line first: the name waits its turn)
      g.show.wait(0.45, () => { if (!g.unmounted && g.state !== "over") Sound.say(g.cfg.name); });
    });
  }

  // ---- a question is up (the rule: nextQuestion): which strike it will wind up -------------------------------
  ask() {
    const kinds = this.row.atk, kind = kinds[this.kindN++ % kinds.length];
    this.endTele();
    this.tele = { kind, clip: (this.row.clip && this.row.clip[kind]) || BOSS_ATK.CLIP[kind], mark: [], servo: false, hum: false, acc: 0, line: null };
  }
  endTele() {
    const t = this.tele;
    if (!t) return;
    t.mark.forEach((m) => { m.t = Math.min(m.t, 0.08); });
    if (t.line) { t.line.stop(); t.line = null; }
    if (this.hum) { Sound.stopLoop("boss-charge", 0.06); this.hum = false; }
    t.hum = false;
  }
  marks(t, dur) {
    const kit = this.kit, kind = t.kind, k = this.S / 7.4;
    if (t.mark.length) return;
    const at = (v) => this.lens(0, -0.7, 5.2, v); // (at the foot of the picture: the player's side)
    t.mark.push(kit.mark(BOSS_ATK.MARK[kind], at(this._v), this.hex, { size: kind === 3 ? 1.5 : kind === 1 ? 0.9 : 1.05, dur, follow: at, spin: kind === 3 || kind === 1 ? 0 : kind === 4 ? 2.4 : 1.6 }));
    if (kind === 1) t.mark.push(kit.mark("ring", this._v.set(0, 0.08, 2.4 * k), this.hex, { size: 6.5 * k, dur, flat: true })); // (and on the floor, where the blow will fall)
    Sound.sfx(kind === 0 || kind === 4 ? "lock_on" : "warning", 0, { vol: 0.6, rate: [1, 0.92, 0.85, 1.2, 1.1][kind] });
  }
  // the wind-up follows the charge bar (f: how full it is)
  telegraph(f, d) {
    const g = this.g, t = this.tele, a = this.a, kit = this.kit, k = this.S / 7.4, quiet = REDUCED_MOTION || GFX.calm;
    if (!t) return;
    const wind = smoothstep(0.45, 1, f);
    this.windK = wind;
    if (wind > 0) a.wind(t.clip, wind);
    if (f >= 0.45 && !t.servo) { t.servo = true; Sound.sfx("boss_servo", 0, { vol: 0.7 }); }
    if (f >= 0.72) {
      this.marks(t, (1 - f) * g.T + 0.5);
      if (!t.hum) { t.hum = true; this.hum = Sound.loop("boss-charge", "charge_hum", { vol: 0.25, rate: 0.9, fade: 0.1 }); Sound.sfx("charge_up", 0, { vol: 0.6 }); }
      if (this.hum) Sound.loopSet("boss-charge", { rate: 0.9 + 1.0 * (f - 0.72) / 0.28, vol: 0.25 + 0.4 * (f - 0.72) / 0.28 });
      if (t.kind === 3) { // a thin line of sight from its weapon to where the sweep will start
        const from = this.src(this._v), to = this.sweepAt(1, 0, this._w);
        if (!t.line) t.line = kit.beam(from, to, this.beamCol, { dur: 0, width: 0.07, k: 0.9, grow: 0.25 }); else t.line.set(from, to);
      }
    }
    // what it gathers is drawn in to where it gathers
    if (wind > 0.15 && (t.acc += d) > 0.05 && !quiet) {
      t.acc = 0;
      const src = this.src(this._v), off = this._w.set(rand(-1, 1), rand(-1, 1), rand(-0.3, 0.9)).normalize().multiplyScalar(1.5 * k);
      kit.sparks(this._u.copy(src).add(off), this.hex, { n: 1, speed: (1.5 * k) / 0.26, dir: off.clone().multiplyScalar(-1).normalize(), spread: 0.06, life: 0.26, len: 0.5 * k, w: 0.05 * k, drag: 1 });
    }
  }

  // ---- the player fires (the rule: pick) ------------------------------------------------------------------------
  // right: whether the answer is the right one (look only: the rule has checked it itself)
  fire(slot, right) {
    this.shot = { slot, right, col: SLOT_COLORS[slot] || COLORS.cyan, n: 0, time: 0 };
  }
  volley(sh) {
    const kit = this.kit, a = this.a, S = this.S, n = sh.n, from = this.muzzle(sh.slot, new THREE.Vector3());
    const to = a.at(n === 1 ? "head" : n === 2 ? "hips" : "chest", new THREE.Vector3()).add(this._v.set(rand(-0.05, 0.05) * S, rand(-0.02, 0.05) * S, 0.11 * S)), dir = this._w.subVectors(to, from).normalize();
    kit.muzzle(from, dir, sh.col, 0.34);
    kit.bolt(from, to, sh.col, { dur: sh.right ? 0.1 : 0.085, width: 0.2, len: 4.2, onHit: (p) => this.shotLands(sh, n, p) });
    kit.shells(from, this._v.set(-0.6, 0.5, 0.4).normalize(), 0xbfe8ff);
    Sound.sfx("laser_fire", -0.4, { vol: 0.75, rate: 1 + n * 0.07 });
  }
  shotLands(sh, n, p) {
    const kit = this.kit, a = this.a, toLens = this._w.subVectors(this.g.camera.position, p).normalize();
    if (sh.right) { // each bolt sparks off its armour: the lance that follows is the blow itself
      kit.hull(p, sh.col, { size: 0.8, dir: toLens });
      a.kickV += 1.2;
      Sound.sfx("impact_metal", this.pan(p), { vol: 0.45, rate: 1.1 + n * 0.1 });
    } else { // it does not bite: a dull red fizzle on its armour, and the boss does not so much as flinch
      kit.fizzle(p.addScaledVector(toLens, 0.3), { size: 1.5, dir: toLens });
      Sound.sfx("impact_reject", this.pan(p), { vol: 0.9, rate: 0.9 });
    }
  }

  // ---- a right answer lands (the rule: playerHit's land) --------------------------------------------------------
  // o: { slot, col, now: the fraction of its HP left, enraged: this blow has enraged it, dead: this blow has finished it }
  bossHit(dmg, o) {
    const g = this.g, kit = this.kit, a = this.a, S = this.S, col = o.col;
    const tearing = this.tears.some((t) => !t.done && o.now <= t.at), big = dmg >= 20 || o.dead || o.enraged || tearing;
    const p = a.at(big ? "head" : "chest", new THREE.Vector3()), from = this.muzzle(o.slot, new THREE.Vector3());
    p.z += (big ? 0.07 : 0.12) * S; p.y -= big ? 0.02 * S : 0;
    this.foil();
    if (this.shot) this.shot.n = 9; // (its bolts are spent)
    // the lance: from the answer's side to where it lands, held for a few frames
    kit.beam(from, p, col, { dur: 0.15, width: 0.2, grow: 0.03, k: 2.0 });
    // a white heart, sparks in the answer's colour, a thin ring, the picture's glow swelling, a small shake, a hit-stop
    kit.impact(p, col, { size: big ? 1.0 : 0.78, ring: false, shake: false, dir: this._v.set(0, 0.25, 1).normalize() }); // (a small hot heart: the body is never hidden behind it)
    kit.wave(p, null, col, { dur: 0.42, s0: 0.5, s1: big ? 7.5 : 5.5, w: 0.06 });
    kit.debris(p, { n: big ? 9 : 4, size: 0.5, speed: 9, color: BOSS_ATK.WRECK, hot: col, dir: this._v.set(0, 0.3, 1).normalize(), spread: 1.2, life: 0.9 });
    GFX.ripple(g.camera, p, big ? 0.8 : 0.5, 0.4);
    g.shake(big ? 0.16 : 0.09);
    VFX.hitStop(big ? 3 : 2);
    g.hitLine = (g.hitLine || new THREE.Color()).copy(neon(col, 1.5)); g.hitTint = 1; // (the floor's lines run in the answer's colour for a moment)
    g.cheer = 1;
    a.kickV += big ? 9 : 5;
    if (!o.dead) a.react(big ? "stagger" : "hurt", { rate: big ? 1.3 : 1.55, in: 0.05, out: 0.32 });
    this.wideTo = 0; this.punch = big ? 1 : 0.6;
    Sound.sfx(big ? "impact_big" : "impact_good", 0, { vol: 0.9 });
    Sound.sfx(big ? "boss_stagger" : "boss_hurt", 0, { vol: 0.8, delay: 0.05 });
    this.damage(o.now, o.dead);
    if (o.enraged) g.show.wait(0.45, () => this.enrage());
    if (o.dead) this.critical();
  }
  // its wind-up is broken by the blow
  foil() {
    const t = this.tele;
    if (t && this.windK > 0.3) { const p = this.src(this._v); this.kit.sparks(p, this.hex, { n: 10, speed: 6, life: 0.4, gravity: 4 }); }
    this.endTele();
    this.a.cancel();
    this.windK = 0;
  }
  // ---- damage that lasts ----------------------------------------------------------------------------------------
  damage(hpF, dead) {
    let n = 0;
    for (const t of this.tears) if (!t.done && hpF <= t.at) { t.done = true; const go = () => (t.bone === "wound" ? this.wound() : this.breakOff(t.bone, true)); if (n++ && !dead) this.g.show.wait(0.12 * n, go); else go(); }
  }
  leak(at, o) { if (!(REDUCED_MOTION || GFX.calm)) this.leaks.push(this.kit.trailer(at, o)); }
  // a hole burnt in its chest: sparks where the plate goes, and from now on it leaks
  wound() {
    const kit = this.kit, a = this.a, S = this.S, off = new THREE.Vector3(rand(-0.06, 0.06), rand(-0.02, 0.05), 0.1), at = (v) => (a.root.visible && !this.blown ? a.joint.chest.localToWorld(v.copy(off)) : null), p = at(new THREE.Vector3());
    if (!p) return;
    kit.flash(p, 0xffffff, 0.15, 0.6, 0.08, 1, 1.5);
    kit.sparks(p, this.hex, { n: 14, speed: 9, life: 0.4, len: 0.7, w: 0.05 });
    kit.debris(p, { n: 6, size: 0.45, speed: 7, color: BOSS_ATK.WRECK, hot: this.hex, life: 0.8 });
    Sound.sfx("boss_break", this.pan(p), { vol: 0.7, delay: 0.04 });
    this.leak(at, { smoke: 0.35, fire: 0, sparks: 0.8, rate: 6, size: 0.05 * S, vel: new THREE.Vector3(0, 0.6, 0.5), life: 0.6, color: this.hex, a: 0.3 });
  }
  // armour torn off a bone and thrown clear on the frame of the blow, turning, sparks trailing from it; a small blast
  // where it was torn off, three frames on; the stump leaks from now on
  breakOff(bone, leak, quietly) { // (quietly: as a link of its death's chain, whose own blast it is thrown by)
    const g = this.g, kit = this.kit, a = this.a, S = this.S, b = a.P[bone];
    if (!b) return null;
    const sd = /^R_/.test(bone) ? -1 : /^L_/.test(bone) ? 1 : rand(-1, 1) < 0 ? -1 : 1, p = b.getWorldPosition(new THREE.Vector3());
    const sc = a.tear(bone, new THREE.Vector3(sd * rand(4, 7), rand(6, 9), rand(1.5, 4.5)));
    if (!sc) return null;
    kit.sparks(p, 0xffffff, { n: 8, speed: 9, life: 0.3, len: 0.7, w: 0.05, k: 1.7 });
    if (!quietly) {
      Sound.sfx("boss_break", this.pan(p), { vol: 0.85 });
      g.show.wait(0.05, () => { if (g.unmounted) return; kit.explosion(p, { size: 0.42, color: this.hex, shake: false, smoke: false, ground: false, debrisLife: 0.6 }); g.shake(0.1); Sound.sfx("explosion_small", this.pan(p), { vol: 0.8 }); });
    }
    const tr = kit.trailer((v) => (sc.rest || sc.t > sc.life - 0.4 ? null : v.copy(sc.grp.position)), { smoke: 0.25, fire: 0, sparks: 1, rate: 36, size: 0.3, life: 0.35, color: this.hex, a: 0.3 });
    g.show.wait(sc.life, () => { tr.on = false; });
    if (/^[LR]_/.test(bone) && /arm|Hand/.test(bone) && this.row.limp === bone[0]) a.limp(bone[0], 1);
    if (leak) this.leak((v) => (a.root.visible && !this.blown ? b.getWorldPosition(v) : null), { smoke: 0.45, fire: 0.35, sparks: 0.7, rate: 9, size: 0.055 * S, vel: new THREE.Vector3(0, 0.7, 0.6), life: 0.6, a: 0.35, color: this.hex });
    return sc;
  }
  // under 35%: it rages (the rule's banner and the announcer's line come with it)
  enrage() {
    const g = this.g, a = this.a, quiet = REDUCED_MOTION || GFX.calm, h = a.at("head", new THREE.Vector3());
    if (g.unmounted || g.hp <= 0) return;
    this.rageOn = true;
    a.react("rage", { rate: 1.5, in: 0.12, out: 0.4 });
    Sound.sfx(this.row.roar || "roar_" + this.row.key, 0, { vol: 1, rate: 0.9 });
    this.kit.wave(h, null, 0xff2a40, { dur: 0.6, s0: 0.6, s1: 7, w: 0.04 });
    this.kit.sparks(h, 0xff3a5a, { n: quiet ? 8 : 24, speed: 7, life: 0.9, gravity: 1.5 });
    if (!quiet) g.shake(0.12);
    if (g.arena) g.arena.strike(1);
  }

  // ---- the boss strikes (the rule: bossAttack, then its hit 0.12 s on) -------------------------------------------
  attack(slow) {
    const g = this.g, t = this.tele || { kind: this.row.atk[0], clip: BOSS_ATK.CLIP[this.row.atk[0]], mark: [], acc: 0 }, C = BOSS_CLIP[t.clip];
    this.tele = t;
    this.debts.push({ t: 0 });
    this.marks(t, 0.6);
    if (t.line) { t.line.stop(); t.line = null; }
    if (this.hum) { Sound.stopLoop("boss-charge", 0.05); this.hum = false; }
    if (!t.hum) Sound.sfx("charge_up", 0, { vol: 0.7, rate: 1.3 }); // (a wrong answer before it had wound up: a short breath of charge, and the blow)
    // the blow is at its end on the frame the rule fires: from wherever its wind-up has reached (or, with none, from
    // a third of a second short of the blow), through to its end in the rule's own 0.12 s
    this.strike = { kind: t.kind, clip: t.clip, age: 0, from: this.windK > 0.5 ? this.a.windT : C.hit - 0.38, go: false, released: false, landed: false, u: 0, n: 0, acc: 0, beam: null, sd: Math.random() < 0.5 ? -1 : 1, slow };
    this.wideTo = 1;
    void g;
  }
  // the rule has fired: the blow is let go this frame
  strikeNow() { if (this.strike) this.strike.go = true; else this.playerHit(null); }
  endAttack() {
    const s = this.strike;
    this.endTele();
    if (s && s.beam) s.beam.stop();
    this.strike = null;
  }
  // where a beam points as it sweeps across the foot of the picture (u: 0 to 1)
  sweepAt(sd, u, out) { return this.lens(sd * lerp(-1.25, 1.25, u), -0.78 + 0.12 * Math.sin(u * Math.PI), 3.4, out); }
  release(s) {
    const g = this.g, kit = this.kit, a = this.a, S = this.S, k = S / 7.4, quiet = REDUCED_MOTION || GFX.calm, src = this.src(new THREE.Vector3());
    s.released = true;
    if (this.tele) this.tele.mark.forEach((m) => { m.t = Math.min(m.t, 0.1); });
    VFX.slowMo(0.45, 0.12, 0.03);
    kit.flash(src, this.hex, 0.25 * k, 0.9 * k, 0.09, 0.8, 1.4);
    kit.light(src, this.hex, 6, 0.2, 22);
    if (s.kind === 1) { // the ground slam: where the blow falls, the floor breaks and a shock runs out to the lens
      const f0 = (s.f0 = new THREE.Vector3(src.x * 0.5, 0.07, Math.max(src.z, 0.9 * k) + 0.5 * k));
      Sound.sfx("slam", 0, { vol: 1 });
      kit.wave(f0, null, this.hex, { flat: true, dur: 0.5, s0: 0.8 * k, s1: 12 * k, w: 0.1 });
      kit.wave(f0, null, 0xffffff, { flat: true, dur: 0.4, s0: 0.6 * k, s1: 8 * k, w: 0.05, delay: 0.03, k: 0.8 });
      kit.sparks(f0, this.hex, { n: quiet ? 8 : 20, speed: 11 * k, dir: this._v.set(0, 0.7, 0.5).normalize(), spread: 1.5, life: 0.5, len: 0.8 * k, w: 0.06 * k, gravity: 14 });
      kit.sparks(f0, 0xffffff, { n: 8, speed: 16 * k, dir: this._v.set(0, 0.6, 0.6).normalize(), spread: 1.3, life: 0.3, len: 1.1 * k, w: 0.05 * k, k: 1.8, gravity: 10 });
      kit.debris(f0, { n: quiet ? 5 : 12, size: 0.6 * k, speed: 9 * k, color: BOSS_ATK.WRECK, hot: this.hex, life: 1.0, radius: 0.8 * k });
      for (let i = 0; i < (quiet ? 2 : 5); i++) kit.smoke(this._v.set(rand(-1.4, 1.4) * k, 0.3, rand(-0.4, 0.8) * k).add(f0), { size: rand(1.0, 1.5) * k, life: 0.8, vel: this._w.set(rand(-3, 3), 0.4, rand(0, 3)), rise: 0.3, a: 0.45, cold: true, color: BOSS_ATK.SMOKE });
      kit.scorch(f0, { size: 5.5 * k, life: 7, a: 0.6 });
      g.shake(0.3); GFX.bloomPulse(0.35);
    } else if (s.kind === 2) { // the wave: three thin rings of force from where it gathered, out over the player and past
      const to = this.lens(0, -0.15, 1.2), bw = 2.4 * Math.tan(THREE.MathUtils.degToRad(g.camera.fov / 2)) * (GFX.w / GFX.h);
      Sound.sfx("wave_fire", 0, { vol: 1 });
      for (let j = 0; j < 3; j++) kit.wave(src, to, this.hex, { dur: BOSS_ATK.FLY[2] + 0.1, s0: 0.7 * k, s1: bw * (1.5 - j * 0.22), delay: j * 0.045, w: 0.075 });
      kit.sparks(src, this.hex, { n: quiet ? 6 : 18, speed: 16 * k, dir: this._w.subVectors(to, src).normalize(), spread: 0.45, life: 0.3, len: 0.9 * k, w: 0.06 * k });
      g.shake(0.1);
    } else if (s.kind === 3) { // the beam: a white core in a wide halo, swept across the foot of the picture
      Sound.sfx("beam_fire", 0, { vol: 1 });
      s.beam = kit.beam(src, this.sweepAt(s.sd, 0, this._w), this.beamCol, { dur: 0, width: 1.15, k: 1.5, grow: 0.04 });
    } else if (s.kind === 4) { // seekers: each swings out wide on its own side and comes in on the player
      Sound.sfx("missile_fire", -0.4, { vol: 0.9 }); Sound.sfx("missile_fire", 0.4, { vol: 0.9, delay: 0.05, rate: 1.08 });
      this.seekers.forEach((ms, j) => this.launch(ms, j, s));
    }
  }
  launch(ms, j, s) {
    const a = this.a, S = this.S, sd = j % 2 ? -1 : 1, hi = j >> 1;
    a.at(j % 2 ? "handL" : this.row.src === "chest" ? "handR" : this.row.src, ms.a);
    this.lens(sd * (0.3 + hi * 0.42), -1.12, 2.6, ms.c);
    ms.b.copy(ms.a).lerp(ms.c, 0.45).add(this._v.set(sd * (3.2 + hi * 1.6), 2.4 - hi * 2.6, 1.2));
    ms.t = -hi * 0.045 - j * 0.012 - 1e-4; ms.dur = BOSS_ATK.FLY[4]; ms.s = s; ms.j = j;
    ms.sp.visible = false; ms.tail.pts = []; ms.tail.width = 0.014 * S; ms.tail.mesh.visible = false; ms.out = 0; ms.acc = 0;
  }
  runStrike(dt, d) {
    const s = this.strike, a = this.a, kit = this.kit, k = this.S / 7.4, quiet = REDUCED_MOTION || GFX.calm;
    if (!s) return;
    s.age += dt; // (the rule's own clock: its hit fires 0.12 s after bossAttack)
    if (!s.released) {
      a.swing(s.clip, s.go ? 1 : Math.min(0.94, s.age / 0.12), s.from);
      if (!s.go) return;
      this.release(s);
    }
    s.u += d;
    const u = s.u, FLY = BOSS_ATK.FLY[s.kind];
    if (s.kind === 0) { // a volley: five bolts, one after another, each to its own place under the foot of the picture
      while (s.n < (quiet ? 2 : 5) && u >= s.n * 0.036) {
        const n = s.n++, from = this.src(new THREE.Vector3()), to = this.lens(n ? [0, -0.7, 0.75, -0.35, 0.4][n] + rand(-0.08, 0.08) : rand(-0.12, 0.12), -1.14, 2.7), dir = this._w.subVectors(to, from).normalize();
        kit.muzzle(from, dir, this.hex, 0.5 * k);
        kit.bolt(from, to, this.hex, { dur: FLY, width: 0.15 * k, len: 2.6 * k, light: n === 0, onHit: (p) => { if (n === 0) this.land(s, from); else this.pop(p); } }); // (slight where it leaves: it grows as it comes at the lens)
        Sound.sfx("volley_fire", this.pan(from), { vol: 0.75, rate: 1 + n * 0.04 });
        a.kickV -= 1.5;
      }
    } else if (s.kind === 1) { // the shock runs along the floor from where the blow fell to the lens: the floor jumps as it passes
      const cam = this.g.camera.position, to = this._w.set(cam.x, 0.07, cam.z - 2.5), q = Math.min(1, u / FLY);
      if ((s.acc += d) > 0.018 && q < 1) {
        s.acc = 0;
        const p = this._v.lerpVectors(s.f0, to, q).clone(); p.x += rand(-0.5, 0.5);
        kit.sparks(p, this.hex, { n: 3, speed: 7 * k, dir: this._u.set(0, 1, 0.3).normalize(), spread: 0.6, life: 0.3, len: 0.6 * k, w: 0.06 * k, gravity: 12 });
        kit.debris(p, { n: 1, size: 0.4 * k, speed: 5 * k, color: BOSS_ATK.WRECK, hot: this.hex, life: 0.6, dir: this._u.set(0, 1, 0.2), spread: 0.5 });
        kit.flash(p, this.hex, 0.3 * k, 1.1 * k, 0.1, 0.7, 1.4);
      }
      if (!s.landed && u >= FLY) this.land(s, s.f0);
    } else if (s.kind === 2) {
      if (!s.landed && u >= FLY) this.land(s, this.src(this._v));
    } else if (s.kind === 3) { // the beam sweeps, scorching what it crosses, and bites as it passes the middle
      const su = clamp(u / 0.22, 0, 1), from = this.src(new THREE.Vector3()), end = this.sweepAt(s.sd, su, new THREE.Vector3());
      if (s.beam) { if (u < 0.25) s.beam.set(from, end); else { s.beam.stop(); s.beam = null; } }
      if (u < 0.24 && (s.acc += d) > 0.02) {
        s.acc = 0;
        kit.sparks(end, 0xffffff, { n: 2, speed: 2, life: 0.3, gravity: 2, len: 0.16, w: 0.018, k: 1.7, stretch: 0.02 });
        kit.sparks(this._v.lerpVectors(from, end, rand(0.2, 0.9)), this.beamCol, { n: 1, speed: 3, life: 0.25, len: 0.4, w: 0.05 });
        kit.light(end, this.beamCol, 5, 0.05, 8);
      }
      if (!s.landed && su >= 0.5) this.land(s, from);
    }
    // a strike must be seen to land before the sheet comes up: whatever is still on its way lands now
    if (!s.landed && s.age > 0.12 + 0.3) this.land(s, null);
    if (s.landed && u > FLY + 0.35) { this.strike = null; if (s.beam) s.beam.stop(); }
  }
  // a bolt of the volley that is not the first: a small burst where it leaves the picture
  pop(p) {
    this.kit.flash(p, this.hex, 0.06, 0.26, 0.08, 0.9, 1.4);
    this.kit.sparks(p, 0xffffff, { n: 5, speed: 2.6, dir: this._u.set(0, 1, -0.4).normalize(), spread: 0.9, life: 0.22, len: 0.16, w: 0.016, k: 1.8, stretch: 0.02 });
    Sound.sfx("impact_hull", this.pan(p), { vol: 0.5 });
  }
  land(s, from) {
    if (s.landed) return;
    s.landed = true;
    this.a.recover();
    this.playerHit(s, from);
  }

  // ---- the player is hit: the heart that the rules took is seen to go --------------------------------------------
  playerHit(s, from) {
    const g = this.g, kit = this.kit, quiet = REDUCED_MOTION || GFX.calm, kind = s ? s.kind : -1;
    if (this.debts.length) this.debts.shift();
    const left = g.hearts + this.debts.length, hard = clamp((3 - left) / 3, 0.34, 1);
    // the HUD: the heart that went breaks, the bar flickers and cracks, the hearts blink
    g.lives(left, 3, "heart", COLORS.red);
    HudFX.lifeLost(g.el);
    HudFX.hurt(g.el, hard);
    HudFX.blink(g.el, 750);
    // the picture: a red flash at its edges, the colours split for three frames, a shake by how much is left
    GFX.hitFlash("hit");
    GFX.glitch(0.2 + 0.25 * hard, 0.06);
    GFX.pulse(1.8 + 2.2 * hard, 0);
    g.shake(0.12 + 0.12 * hard);
    g.show.wait(0.05, () => { GFX.ab = Math.min(GFX.ab, 0.7); GFX.punch = Math.min(GFX.punch, 0.002); });
    VFX.hitStop(2);
    Haptics.buzz([60, 40, 90]);
    // where it lands: at the foot of the picture, on the player's side
    const at = this.lens(0, -0.9, 3.2);
    // (small: a unit here is a third of the picture's width. A short burst of sparks up from the foot of the picture.)
    kit.sparks(at, 0xffffff, { n: quiet ? 5 : 10, speed: 3.2, dir: this._u.set(0, 1, -0.5).normalize(), spread: 1.3, life: 0.26, len: 0.2, w: 0.018, k: 1.8, stretch: 0.02 });
    kit.sparks(at, 0xff3050, { n: quiet ? 4 : 9, speed: 2.2, dir: this._u.set(0, 1, -0.3).normalize(), spread: 1.5, life: 0.4, len: 0.16, w: 0.022, gravity: 3, k: 1.5, stretch: 0.02 });
    if (kind === 1) { g.shake(0.3); for (let i = 0; i < (quiet ? 1 : 3); i++) kit.smoke(this.lens(rand(-0.8, 0.8), -1.05, 3.4), { size: 0.32, life: 0.6, vel: this._w.set(rand(-0.3, 0.3), 0.8, 0), a: 0.4, cold: true, color: BOSS_ATK.SMOKE }); } // the floor's jolt arrives: dust thrown up along the foot of the picture
    else if (kind === 2) { GFX.ripple(g.camera, at, 1, 0.5); for (let j = 0; j < 2; j++) kit.wave(this.lens(0, -0.5, 3), null, 0xffffff, { dur: 0.3, s0: 0.3, s1: 2.6 + j * 0.7, delay: j * 0.08, w: 0.04, k: 0.8 }); }
    else if (kind === 3) { // the beam: a line burnt across the foot of the picture, molten drips falling from it
      const b0 = this.sweepAt(s.sd, 0.08), b1 = this.sweepAt(s.sd, 0.92);
      kit.gash(b0, b1, 0xffb070, 0.5, 0.045, 1.5);
      for (let j = 0; j < 3; j++) g.show.wait(j * 0.08, () => { if (!g.unmounted) kit.sparks(this._v.lerpVectors(b0, b1, rand(0.1, 0.9)), 0xffa050, { n: 4, speed: 0.6, life: 0.5, len: 0.12, w: 0.02, gravity: 2.5, k: 1.6, stretch: 0.02 }); });
    } else if (kind < 0) kit.flash(at, 0xff3050, 0.12, 0.5, 0.12, 0.8, 1.3);
    Sound.sfx("player_hit", from ? this.pan(from) * 0.5 : 0);
    Sound.sfx("heart_lost", 0, { delay: 0.09, vol: 0.9 });
    if (left === 1) Sound.say("CRITICAL");
    this.setLow(left <= 0 ? 2 : left === 1 ? 1 : 0);
  }
  // one heart left: a red frame that beats and the alarm; none: the frame holds
  setLow(on) {
    const g = this.g;
    if (on === this.low) return;
    this.low = on;
    GFX.setDanger(on === 2 ? 1 : on ? 0.72 : 0);
    HudFX.low(g.el, !!on);
    if (on === 1) { this.alarmOn(); this.lowT = 0; } else { Sound.stopLoop("boss-alarm", 0.3); this.alarm = false; }
  }

  // ---- it is finished (the rule: the last right answer; then victory) --------------------------------------------
  // done for: it stands there swaying, arms hanging, lights failing, small blasts along it, until the sheet is closed
  critical() {
    const a = this.a;
    this.setLow(0);
    a.react("stagger", { rate: 0.85, in: 0.06, out: 0.5 });
    a.limp("L", 1); a.limp("R", 0.85); a.lean = 1.6; a.idleRate = 0.45;
    this.dying = { t: 0.5, n: 0 };
    this.wideTo = 0.35;
  }
  chain(i, tearIt) {
    const g = this.g, kit = this.kit, a = this.a, names = ["handL", "chest", "handR", "hips", "head", "footL", "footR"];
    if (g.unmounted) return;
    const p = a.at(names[i % names.length], new THREE.Vector3());
    p.z += 0.06 * this.S;
    if (tearIt) { let any = false; for (const bone of [this.row.last[i * 2], this.row.last[i * 2 + 1]]) if (bone && this.breakOff(bone, false, true)) any = true; if (any) Sound.sfx("boss_break", this.pan(p), { vol: 0.85 }); } // (each blast of its death throws two parts of it clear)
    if (REDUCED_MOTION || GFX.calm) { kit.sparks(p, this.hex, { n: 12, speed: 9, life: 0.5, len: 0.7 }); kit.debris(p, { n: 4, size: 0.6, speed: 8, color: BOSS_ATK.WRECK, life: 0.7 }); }
    else kit.explosion(p, { size: 0.55 + 0.05 * i, color: i % 2 ? 0xff4a9a : this.hex, shake: false, ring: i % 2 === 0, smoke: false, ground: false, debrisLife: 0.6 });
    g.shake(0.08 + 0.015 * i);
    Sound.sfx("explosion_small", this.pan(p), { rate: 0.95 + i * 0.05, vol: 0.9 });
  }
  // banner: the rule's own "BOSS DEFEATED!" banner, shown when the last blast has gone
  death(banner) {
    const g = this.g, a = this.a, big = g.bossKey === "all", rate = big ? 1.0 : 1.3, T = BOSS_CLIP.death.down / rate, n = big ? 4 : 3; // (the blasts of the chain come a third of a second apart, never faster)
    this.endAttack(); this.setLow(0);
    this.dying = null; this.phase = "death";
    VFX.slowMo(0.3, 0.3, 0.1);
    Sound.sfx("slowmo_in", 0, { vol: 0.5 });
    Sound.sfx("boss_death", 0, { vol: 0.95 });
    a.dead = true; a.lean = 0; a.limp("L", 0); a.limp("R", 0);
    a.react("death", { rate, in: 0.14, hold: true });
    this.wideTo = 0.5; this.camLow = 0.7;
    for (let i = 0; i < n; i++) g.show.wait(0.1 + (i * (T - 0.3)) / n, () => this.chain(i, true));
    g.show.wait(T, () => this.lastBlast(banner));
  }
  lastBlast(banner) {
    const g = this.g, kit = this.kit, a = this.a, big = g.bossKey === "all", quiet = REDUCED_MOTION || GFX.calm;
    if (g.unmounted) return;
    const p = a.at("hips", new THREE.Vector3());
    p.y = Math.max(p.y, 0.7);
    this.leaks.forEach((t) => { t.on = false; }); this.leaks.length = 0;
    this.blown = true;
    a.shatter(p, 13).forEach((sc, i) => { if (i % 3 === 0 && !quiet) { const tr = kit.trailer((v) => (sc.rest || sc.t > sc.life - 0.3 ? null : v.copy(sc.grp.position)), { smoke: 0.3, fire: 0, sparks: 1, rate: 30, size: 0.3, life: 0.3, color: this.hex, a: 0.3 }); g.show.wait(sc.life, () => { tr.on = false; }); } });
    kit.explosion(p, { size: big ? 1.9 : 1.5, color: this.hex, shake: false, debrisLife: 0.8 });
    kit.sparks(p, 0xffffff, { n: quiet ? 8 : 16, speed: 30, life: 0.5, len: 2.0, w: 0.07, k: 1.9, gravity: 6 }); // (long white streaks thrown clear: the blast's size is in these, its rings and its wreckage)
    kit.debris(p, { n: quiet ? 6 : 16, size: 0.8, speed: 15, color: BOSS_ATK.WRECK, hot: this.hex, life: 1.0 });
    kit.wave(p, null, 0xffffff, { dur: 0.5, s0: 0.8, s1: 10, w: 0.035, k: 0.9 });
    kit.wave(p, null, this.hex, { dur: 0.6, s0: 0.8, s1: 13, delay: 0.08, w: 0.035 });
    kit.wave(this._v.set(p.x, 0.07, p.z), null, this.hex, { flat: true, dur: 0.7, s0: 1, s1: 16, w: 0.1 });
    if (big) g.show.wait(0.16, () => { if (g.unmounted) return; kit.explosion(this._v.copy(p).add(this._w.set(rand(-1, 1), 0.6, 0.8)), { size: 1.2, color: 0xff4a9a, ring: false }); kit.wave(p, null, 0xffffff, { dur: 0.6, s0: 1, s1: 16, w: 0.03, k: 0.8 }); Sound.sfx("explosion_big", 0, { vol: 0.9 }); });
    GFX.ripple(g.camera, p, 1, 0.6);
    VFX.hitStop(3);
    GFX.pulse(2.5, 0);
    g.shake(0.24);
    if (g.arena) g.arena.strike(1);
    g.cheer = 1;
    Sound.sfx("explosion_huge", 0, { vol: 1 });
    Sound.sfx("debris", 0, { delay: 0.3, vol: 0.8 });
    // the reward: stars and coins fly from the blast, round the question, to the score
    const from = this.screen(p);
    g.show.wait(0.06, () => {
      if (g.unmounted) return;
      HudFX.reward(g.el, from, "[data-score]", { n: 8, kind: "star", color: COLORS.yellow, clear: ".qpanel", dur: 400, gap: 12 });
      HudFX.reward(g.el, from, "[data-score]", { n: 5, kind: "coin", color: COLORS.gold, clear: ".qpanel", dur: 430, gap: 12 });
      Sound.sfx("reward", 0, { vol: 0.9 });
    });
    g.show.wait(0.12, () => {
      if (g.unmounted || !banner) return;
      if (!big) return banner();
      Sound.say("FINAL BOSS DESTROYED"); // (the final boss has its own line: the banner is shown without the usual one)
      const say = Sound.say; Sound.say = () => 0; try { banner(); } finally { Sound.say = say; }
    });
    g.show.wait(0.5, () => { if (!g.unmounted) Sound.sfx("win"); });
  }
  // ---- the player is out of hearts (the rule: defeat): the boss has the last word --------------------------------
  defeat() {
    const g = this.g, a = this.a, h = a.at("head", new THREE.Vector3());
    this.endAttack(); this.setLow(2);
    this.phase = "won";
    a.react(a.has("win") ? "win" : "rage", { rate: a.has("win") ? 1.5 : 1.15, in: 0.18, out: 0.5 });
    Sound.sfx(this.row.roar || "roar_" + this.row.key, 0, { vol: 1, rate: 0.85 });
    this.kit.wave(h, null, this.hex, { dur: 0.7, s0: 0.5, s1: 7, w: 0.04 });
    if (g.arena) g.arena.strike(1);
    this.wideTo = 0.15; this.camLow = -0.6;
    g.show.wait(0.4, () => { if (!g.unmounted) Sound.say("GAME OVER"); });
  }

  update(dt) {
    const g = this.g, d = VFX.dt, a = this.a, kit = this.kit, S = this.S, k = S / 7.4, quiet = REDUCED_MOTION || GFX.calm;
    g.show.update(d);
    const f = g.state === "ask" ? clamp(g.charge / g.T, 0, 1) : 0, rage = g.enraged && g.hp > 0 ? 1 : 0;
    // ---- the telegraph, the strike, the player's burst
    if (g.state === "ask" && this.tele && !this.strike) this.telegraph(f, d);
    this.runStrike(dt, d);
    const sh = this.shot;
    if (sh) { sh.time += d; while (sh.n < (sh.right ? (quiet ? 1 : 3) : 1) && sh.time >= sh.n * 0.075) { this.volley(sh); sh.n++; } if (sh.time > 0.6) this.shot = null; }
    // ---- seekers in flight
    for (const ms of this.seekers) {
      if (ms.t === -1) { if (ms.out > 0) { ms.out -= d; if (d > 0) ms.tail.push(ms.p); if (ms.out <= 0) ms.tail.mesh.visible = false; } continue; }
      ms.t = ms.t < 0 ? Math.min(0, ms.t + d) : ms.t + d;
      if (ms.t < 0) continue;
      const u = Math.min(1, ms.t / ms.dur), v = 1 - u;
      ms.p.set(v * v * ms.a.x + 2 * v * u * ms.b.x + u * u * ms.c.x, v * v * ms.a.y + 2 * v * u * ms.b.y + u * u * ms.c.y, v * v * ms.a.z + 2 * v * u * ms.b.z + u * u * ms.c.z);
      ms.sp.visible = true; ms.sp.position.copy(ms.p); ms.sp.scale.setScalar(0.55 * k * (0.9 + 0.1 * Math.sin(VFX.t * 40)));
      if (d > 0) { ms.tail.mesh.visible = true; ms.tail.push(ms.p); }
      if ((ms.acc += d) > 0.03) { ms.acc = 0; kit.sparks(ms.p, this.hex, { n: 1, speed: 1.6, life: 0.3, len: 0.35 * k, w: 0.045 * k }); }
      if (u >= 1) { // each lands at its own place at the foot of the picture, a few frames after the last: a small shaped blast
        ms.t = -1; ms.sp.visible = false; ms.out = 0.2;
        kit.explosion(ms.p, { size: 0.16, color: this.hex, ring: false, shake: false, debris: false, smoke: false, ground: false });
        kit.wave(ms.p, null, this.hex, { dur: 0.22, s0: 0.06, s1: 0.5, w: 0.02, k: 0.85 });
        Sound.sfx("missile_hit", this.pan(ms.p), { vol: 0.8 });
        if (ms.s) this.land(ms.s, ms.a);
      }
    }
    // ---- a heart owed is always seen to go: if no strike lands for it, it goes on its own
    for (let i = this.debts.length - 1; i >= 0; i--) if ((this.debts[i].t += d) > 1.2) { this.debts.splice(i, 1); this.debts.unshift({ t: 0 }); this.playerHit(null); break; }
    // ---- the entrance: the frame its feet touch
    if (a.justLanded) { a.justLanded = false; this.landing(); }
    // ---- done for: small blasts along it until the sheet is closed (under two a second)
    if (this.dying && g.state !== "over" && (this.dying.t -= d) <= 0) { this.dying.t = rand(0.6, 0.85); this.chain(this.dying.n++ % 5, false); }
    this.flick = this.dying ? 0.45 + 0.55 * Math.abs(Math.sin(VFX.t * 9) * Math.sin(VFX.t * 2.3)) : 1;
    // ---- the boss itself
    a.root.position.set(rage && !quiet && this.phase === "fight" ? rand(-1, 1) * 0.03 * (g.rageK || 0) : 0, 0, 0);
    this.windEase = (this.windEase || 0) + ((g.state === "ask" ? this.windK : this.strike && !this.strike.landed ? 1 : 0) - (this.windEase || 0)) * Math.min(1, d * 8);
    a.lean = this.dying ? 1.6 : this.windEase * 0.8;
    a.update(d, { rage, glow: this.windEase * 0.7 + (rage ? 0.25 : 0), flick: this.flick });
    // what it gathers glows where the attack will leave it
    const ok = this.windEase > 0.03 && a.root.visible && !this.blown;
    this.orb.visible = ok;
    if (ok) { this.src(this.orb.position); this.orb.scale.setScalar((0.3 + 1.0 * this.windEase + (this.windEase > 0.8 ? 0.12 * Math.sin(VFX.t * 16) : 0)) * k); this.orb.material.opacity = 0.55 * this.windEase; }
    // ---- its lamps: the rims come up as it powers up; the lens light sits where it gathers
    const L = g.lamps;
    if (L && this.rim0) { L.rimA.intensity = this.rim0[0] * (0.25 + 0.75 * a.power); L.rimB.intensity = this.rim0[1] * (0.25 + 0.75 * a.power); }
    this.src(g.eyeLight.position); g.eyeLight.position.z += 0.4;
    g.eyeLight.intensity = a.power * (0.6 + 3.2 * this.windEase);
    // ---- its shadow on the floor: under its hips, wider as it comes down
    if (g.contact) {
      const hp = a.at("hips", this._v), h = clamp((hp.y - 0.5 * S) / S, 0, 2), cs = S * 1.15 * (1 + 0.5 * h), op = a.root.visible && !this.blown ? 0.9 / (1 + h * 2.5) : 0;
      g.contact.scale.set(cs, cs, 1); g.contact.position.x = hp.x; g.contact.position.z = hp.z; g.contact.material.opacity = op;
      g.contactCore.scale.set(cs * 0.5, cs * 0.36, 1); g.contactCore.position.x = hp.x; g.contactCore.position.z = hp.z; g.contactCore.material.opacity = op;
    }
    // ---- hit a moment ago: the hearts blink (under three times a second) while the player cannot be hit again
    const bl = !!(g.el && g.el.dataset.blink);
    if (bl || this.blinkOn) { const box = $("[data-lives]", g.el); if (box) box.style.opacity = bl && !quiet ? (0.6 + 0.4 * Math.cos(VFX.t * 2.6 * Math.PI * 2)).toFixed(2) : ""; this.blinkOn = bl; }
    // ---- one heart left: the alarm (as a pip when there is no recording)
    if (this.low === 1 && !this.alarm && g.state !== "over" && (this.lowT -= d) <= 0) { this.lowT = 1.125; Sound.sfx("alarm", 0, { vol: 0.6 }); }
    if (rage && g.state !== "over" && Sound.intensity < 2) Sound.setIntensity(2);
    this.frame(d, f);
    kit.update(d);
  }
  // ---- the lens: close on the boss (head to knees) while the question is read; drawn back, and higher, as it winds
  // up, strikes, lands and dies, so the floor and what crosses it are seen
  frame(d, f) {
    const g = this.g, S = this.S, row = this.row, t = Math.tan(THREE.MathUtils.degToRad(g.camera.fov / 2)), bh = (g.band ? g.band.h : GFX.h) / GFX.h, quiet = REDUCED_MOTION || GFX.calm;
    if (g.state === "ask" && !this.strike) this.wideTo = this.phase === "enter" ? 1 : 0.9 * smoothstep(0.5, 0.82, f);
    else if (g.state === "intro") this.wideTo = this.phase === "fight" ? 0.3 : 1;
    this.wide += (this.wideTo - this.wide) * Math.min(1, d * (this.wideTo > this.wide ? 3.4 : 2.4));
    this.punch = Math.max(0, this.punch - d * 4.5);
    const k = this.wide * this.wide * (3 - 2 * this.wide), wd = row.wide || this.a.size[0] + 0.14;
    this.overK = (this.overK || 0) + ((g.state === "over" ? 1 : 0) - (this.overK || 0)) * Math.min(1, d * 3);
    // close: as near as holds `show` of its height in the band, and its width across it. (When the fight is over the
    // question and the answers have gone and the whole screen is the picture: the band counts for more.)
    const near = Math.max((S * row.show) / 0.94 / (2 * t * bh * (1 + 0.75 * this.overK)), (S * wd) / 0.94 / (2 * t * (GFX.w / GFX.h)));
    const to = near * lerp(1, 1.36, k) * (1 - 0.035 * Math.sin(Math.min(1, this.punch) * Math.PI));
    this.dist += (to - this.dist) * Math.min(1, d * 5);
    const Hb = 2 * this.dist * t * bh, low = this.camLow;
    this.roomT = Math.max(0, (this.roomT || 0) - d);
    this.room = (this.room || 0) + ((this.roomT > 0 ? 1 : 0) - (this.room || 0)) * Math.min(1, d * 6);
    const lookNear = Math.max(S * 1.05 - Hb / 2, Hb * 0.36) + this.room * 0.15 * Hb * (1 - this.overK), look = lerp(lookNear, S * (0.47 - 0.14 * Math.max(0, low)), k), cy = lerp(1.35 + 0.7 * Math.min(0, low), 3.4 + 0.8 * Math.max(0, low), k);
    const sway = quiet ? 0.2 : 1;
    g.camZ = this.dist;
    g.camBase.set((Math.sin(g.t * 0.23) * 0.6 + Pointer.x * 0.6) * sway, cy + (Math.sin(g.t * 0.37) * 0.1 - Pointer.y * 0.2) * sway, this.dist);
    // (the fight is over: the boss stands lower in the screen, its head under its last words, the storm above it and the floor below)
    const lk = lerp(look, S * (1.03 - 0.1 * Math.max(0, low)) - (Hb / 2 - (75 / GFX.h) * 2 * this.dist * t), this.overK);
    this.lookY = (this.lookY === undefined ? lk : this.lookY + (lk - this.lookY) * Math.min(1, d * 5));
    g.lookAt.set(0, this.lookY, 0);
    const post = g.scene.userData.post;
    if (post && post.dof) post.dof.focus = this.dist;
  }
  dispose() {
    this.loops(false);
    GFX.setDanger(0);
    HudFX.low(this.g.el, false);
    this.kit.dispose();
    this.a.dispose();
    this.seekers.forEach((m) => { m.sp.material.dispose(); m.tail.mesh.geometry.dispose(); m.tail.mesh.material.dispose(); });
    this.orb.material.dispose();
  }
}
