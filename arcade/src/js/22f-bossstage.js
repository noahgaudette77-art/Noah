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
// Whose recorded voice a boss has its last word in when the player is defeated ("game over"): the first four one deep
// voice, the next four another, the last three and the Proctor a third.
const BOSS_LAST_WORD = (key) => (key === "all" || key >= 9 ? "charlie" : key >= 5 ? "brian" : "adam");
const BOSS_ATK = {
  MARK: ["lock", "bang", "ring", "arc", "seek"], // each kind's marker
  CLIP: ["attackB", "attackA", "attackB", "attackA", "attackB"], // and the clip it is played with: a thrust, or an overhead smash
  FLY: [0.13, 0.22, 0.24, 0.11, 0.2], // how long it takes to reach the player once it is let go (show seconds): a slam's shock runs along the floor to the foot of the picture, a wave comes on until it fills it
  SMOKE: 0x2c2244, WRECK: 0x241c38, // smoke and wreckage stay in the palette
  RAGE: new THREE.Color(1, 0.1, 0.16), // the rims of a raging boss
};
// the figures' lane (see BossStage.figure): how far one lifts as it goes, and how long it stands (show seconds; the
// rule's own floater is taken away a second after it was made, on the page clock)
const FIG_LIFT = 14, FIG_LIFE = 0.9;
class BossStage {
  constructor(game, actor) {
    const g = (this.g = game), s = g.scene, row = (this.row = g.row);
    g.show = new TweenSet(); // show-only timing: nothing in it is a rule
    this.kit = g.kit = new CombatFX(g, { unit: 1, ground: 0, sparks: 420, chunks: 96, firePuffs: 120, smokePuffs: 120, lights: 1 }); // (one blast light, as in the other two games: the boss's own rig already lights it from seven sides)
    this.a = actor;
    this.S = row.size;
    actor.root.scale.setScalar(this.S);
    this.col = new THREE.Color(g.cfg.color); this.hex = this.col.getHex();
    const hsl = this.col.getHSL({ h: 0, s: 0, l: 0 });
    this.beamCol = hsl.h < 0.04 || hsl.h > 0.94 ? 0xff1030 : this.hex; // (a lit neon red goes pink: a red boss's beam is a deep red at low gain)
    const bc = new THREE.Color(this.beamCol);
    this.beamK = Math.min(1.5 * clamp(0.5 / (0.2126 * bc.r + 0.7152 * bc.g + 0.0722 * bc.b), 0.55, 1), 1.25 / Math.max(bc.r, bc.g, bc.b)); // (a bright colour's beam burns at a lower gain: it never washes the picture out. Phase 6: nor a saturated one past 1.25 in any channel: the Phantom's violet swept the picture near white)
    this.lensCol = new THREE.Color(this.hex).multiplyScalar(0.8); this.lensBeam = new THREE.Color(this.beamCol).multiplyScalar(0.8); // (the flash where a blow meets the lens, a shade down: it washed the picture out)
    this.debts = []; // hearts the rules have taken that have not been seen to go yet
    this.low = 0; this.lowT = 0; this.leaks = []; this.tears = row.tear.map(([at, bone]) => ({ at, bone, done: false }));
    this.wide = 1; this.wideTo = 1; this.dist = 16; this.punch = 0; this.camLow = 0;
    this.tele = null; this.strike = null; this.shot = null; this.kindN = 0; this.dying = null; this.phase = "wait";
    this.hum = false; this.alarm = false; this.rageOn = false; this.flick = 1; this.windK = 0;
    this.embers = []; // glowing edges round a hole burnt in it and round its stumps: { sp, at, size, t }
    this.figs = []; // the figures standing in their lane (see figure): { el, t, y, h }
    // what it gathers as it winds up: a glow where the attack will leave it
    this.orb = glowSprite(neon(this.hex, 2.2), 0.1, 1);
    this.orb.visible = false; this.orb.renderOrder = 7;
    s.add(this.orb);
    // what flies from it, what it trails and what it leaves where it lands: its own (22g)
    this.fl = new BossFlavor(this);
    // its volley: pictures (contracts, tickets and coins, exam papers and pencils) riding streaks of its colour
    const cg = new THREE.PlaneGeometry(1, 1);
    this.cards = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false })); m.material.color.setScalar(1.35); m.visible = false; m.renderOrder = 9; s.add(m); return { m, bolt: null, spin: 0, turn: 0, aspect: 0.72 }; });
    this.cardGeo = cg;
    // its seekers: a hot head each, a ribbon behind it (the Lich's are sand)
    const seekCol = this.fl.fx.seek === "sand" ? 0xf2d48a : this.hex;
    this.seekers = [0, 1, 2, 3].map(() => {
      const sp = glowSprite(neon(seekCol, 2.6), 0.5, 1), tail = new Trail({ length: 16, width: 0.12, color: seekCol, intensity: 1.9, up: new THREE.Vector3(0, 0, 1) });
      sp.visible = tail.mesh.visible = false; sp.renderOrder = 9; tail.mesh.renderOrder = 8;
      s.add(sp, tail.mesh);
      return { sp, tail, t: -1, dur: 1, out: 0, acc: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), p: new THREE.Vector3(), hit: null };
    });
    // the arena's lamps, set for armour that mirrors the sky: two rims in its colour, a cold edge, a key, a fill
    const L = g.lamps;
    if (L) {
      L.rimB.color.copy(this.col).lerp(new THREE.Color(0xffffff), 0.2);
      this.rim0 = [L.rimA.intensity * 1.7, 4.8]; // (their full strength: they come up as it powers up)
      L.edge.color.set(0xcfeaff); L.edge.intensity = 1.7;
      L.key.intensity = 2.0;
      L.fill.intensity = 2.1; L.fill.distance = 60;
      L.under.intensity *= 1.5;
    }
    // a kicker behind and above it, in its own colour (paled a little): the line of its head and shoulders always holds
    this.kicker = new THREE.DirectionalLight(this.col.clone().lerp(new THREE.Color(0xffffff), 0.3), 0);
    this.kicker.position.set(0, 7, -12);
    s.add(this.kicker);
    if (g.pillarMat) g.pillarMat.color.multiplyScalar(0.5); // (the pillars stand back: beside armour that mirrors the sky they were the brightest things in the picture)
    // the front row of the crowd: dark shapes, but lit enough to read as heads, not black humps
    if (g.frontRow && g.frontRow.children[1]) { g.frontRow.children[1].material.color.setRGB(3.2, 2.6, 3.6); if (g.frontRimMat) g.frontRimMat.color.multiplyScalar(1.7); }
    this.rimBase = [L ? L.rimA.color.clone() : null, L ? L.rimB.color.clone() : null, this.kicker.color.clone()]; // (rage turns them red)
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
  src(out) { const kind = this.strike ? this.strike.kind : this.tele ? this.tele.kind : -1, name = (this.row.srcs && this.row.srcs[kind]) || this.row.src, p = this.a.at(name, out); if (name === "chest") p.z += 0.13 * this.S; return p; }
  screen(p) { const v = this._n.copy(p).project(this.g.camera); return { x: (v.x * 0.5 + 0.5) * GFX.w, y: (0.5 - v.y * 0.5) * GFX.h }; }
  pan(p) { return clamp(p.x / 6, -1, 1) * 0.6; }
  outline(el) { if (el && el.classList.contains("floater")) el.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000, 0 0 6px #000"; }
  // where a figure of damage is made: over its head, inside the picture (bossHit moves it into its lane the same frame)
  floatAt() {
    const g = this.g, p = this.screen(this._v.set(0, this.S * 1.03, 0)), top = g.band ? g.band.top + 34 : 60;
    return { x: clamp(p.x, 60, GFX.w - 60), y: Math.max(top, p.y - 10) };
  }
  // ---- the figures in the picture: a blow's damage, and the call-out of a quick answer or of a streak lost ----------
  // They have a lane of their own (Phase 6: they used to rise across its caption and into the question): beside the
  // point the blow lands on, on the side away from the lance (it comes from the answers' letters, on the left), under
  // the caption plate (room is kept for two lines of it) and above the answers. Row 0 is the damage, beside the point;
  // row 1 is the call-out, under it. Each holds still at full strength, then lifts a little as it fades, on the show
  // clock. Where the picture is too short for them and the caption both, the caption waits until they have gone.
  figure(el, at, row) {
    const g = this.g, b = g.band;
    if (!el || !b || el.dataset.lane) return;
    el.dataset.lane = "1";
    el.style.animation = "none";
    el.style.whiteSpace = "nowrap";
    if (!el.classList.contains("big")) el.style.fontSize = "13px";
    this.outline(el);
    const w = el.offsetWidth, h = el.offsetHeight, big = clamp(GFX.w * 0.056, 18, 24) + 2;
    const cap = Math.max(2.4 * clamp(GFX.w * 0.037, 13, 17) + 12, this.bubble && this.bubble.el.isConnected ? this.bubble.h : 0); // (the caption plate: two lines of it, or the one up if taller)
    const lo = b.top + 3 + cap + 6 + FIG_LIFT + row * (big + 8), hi = b.top + b.h - h - 6;
    let x = at.x + 30;
    if (x + w > GFX.w - 8 && at.x - 30 - w >= 8) x = at.x - 30 - w; // (no room on its right: on its left)
    x = clamp(x, 8, Math.max(8, GFX.w - w - 8));
    const y = Math.round(Math.max(Math.min(row ? at.y + big / 2 + 16 : at.y - h / 2, hi), Math.min(lo, hi)));
    el.style.left = Math.round(x) + "px";
    el.style.top = y + "px";
    this.figs.push({ el, t: 0, y, h });
  }
  // the call-outs the shared hype made as the rule marked the answer (the floaters made then, not yet in a lane)
  callouts() {
    const at = this.screen(this.a.at("chest", this._u));
    UI.root.querySelectorAll(".floater:not(.big):not([data-lane])").forEach((el) => { if (/LIGHTNING|QUICK DRAW|STREAK LOST/.test(el.textContent)) this.figure(el, at, 1); });
  }
  // (each frame: hold, then lift and fade)
  figures(d) {
    for (let i = this.figs.length - 1; i >= 0; i--) {
      const f = this.figs[i];
      f.t += d;
      const k = f.t / FIG_LIFE, u = clamp((k - 0.72) / 0.28, 0, 1);
      if (!f.el.isConnected || k >= 1) { f.el.style.opacity = "0"; this.figs.splice(i, 1); continue; }
      f.el.style.transform = "translateY(" + (-(Math.min(k, 0.72) / 0.72) * 3 - u * (FIG_LIFT - 3)).toFixed(1) + "px)";
      f.el.style.opacity = (1 - u * u).toFixed(2);
    }
  }
  // whether the caption would meet a figure where it stands
  capMeets(b) {
    if (!this.figs.length) return false;
    const top = b.offsetTop, bot = top + Math.max(b.offsetHeight, this.bubble && this.bubble.el === b ? this.bubble.h : 0) + 2;
    return this.figs.some((f) => f.el.isConnected && f.y - FIG_LIFT < bot && f.y + f.h > top);
  }

  // The boss speaks (the rule's own speech bubble, at the head of the picture): the lens tips up for as long as it is
  // there, so its face stands under its words, not behind them.
  // How tall its words stand once all typed is measured on the bubble itself, the whole line set in it for an instant
  // and taken out again (nothing is drawn between). While the bubble is up, the room is worked out every frame against
  // the band as it is then (roomK, of the band's height: see bubbleRoom): the bubble's size is fixed on the screen, the
  // band's height is not (a long question leaves a short band), and the band moves when the next question comes.
  talk(ms, len, text) {
    const g = this.g, b = g.el && g.el.querySelector(".bubble"), sp = b && b.querySelector("span");
    this.roomT = Math.max(this.roomT || 0, ms / 1000 + 0.2);
    this.roomK = clamp(0.1 + 0.042 * Math.ceil((len || 20) / 19), 0.14, 0.3); // (a guess, for when there is no bubble to measure)
    this.capStyle(b);
    if (sp && text) { const was = sp.textContent; sp.textContent = text; this.bubble = { el: b, h: b.offsetHeight }; sp.textContent = was; }
    this.caption();
  }
  // The boss's words (the rule's own bubble, the same words) are a caption along the top edge of the band: one or two
  // lines on a dark plate, the boss's name before them. Hidden while the explanation sheet is up, and from the moment
  // its death or the player's defeat begins. (Only where and when they show is changed.)
  capStyle(b) {
    if (!b || b.dataset.cap) return;
    b.dataset.cap = "1";
    Object.assign(b.style, { width: "calc(100% - 20px)", maxWidth: "560px", padding: "3px 10px 5px", boxSizing: "border-box", fontSize: "clamp(13px, 3.7vw, 17px)", lineHeight: "1.2", overflow: "hidden", background: "rgba(7, 3, 24, 0.9)", borderWidth: "2px", boxShadow: "0 2px 0 #000" }); // (overflow: the pointer under a bubble is cut off)
    const nm = b.querySelector("b");
    if (nm) Object.assign(nm.style, { display: "inline", marginRight: "0.6em", verticalAlign: "0.15em" });
  }
  caption() {
    const g = this.g, b = g.el && g.el.querySelector(".bubble");
    if (!b) return;
    this.capStyle(b);
    if (g.band) b.style.top = Math.round(g.band.top + 3) + "px";
    b.style.visibility = this.phase === "death" || this.phase === "won" || g.el.querySelector(".sheet") || this.capMeets(b) ? "hidden" : "";
  }
  // (head: how far down the band the foot of its head stands, with no room made)
  bubbleRoom(head) {
    const g = this.g, bb = this.bubble;
    if (!bb) return;
    if (!bb.el.isConnected) { this.bubble = null; this.roomT = 0; return; }
    if (!g.band || !(g.band.h > 0)) return;
    const top = bb.el.offsetTop; // (below the foot of its head, it is not over its head: the band has moved up since it was placed, or it sits over an explanation sheet)
    this.roomK = (top - g.band.top) / g.band.h >= head ? 0 : clamp((top + bb.h + 6 - g.band.top) / g.band.h, 0, 0.75);
    this.roomT = Math.max(this.roomT || 0, 0.1);
  }
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
    const kinds = this.row.atk, kind = kinds[this.kindN++ % kinds.length], old = this.g.el && this.g.el.querySelector(".bubble");
    if (old) old.remove(); // (a line left from the last answer does not stay up over the next question)
    this.endTele();
    this.camLow = 0;
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
    if (kind === 1) t.mark.push(kit.mark("ring", this.slamSpot(this._v) || this._v.set(0, 0.08, 2.4 * k), this.hex, { size: 6.5 * k, dur, flat: true })); // (and on the floor, where the blow will fall)
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
    if (t.kind === 1) this.camLow = 0.8 * smoothstep(0.5, 0.85, f);
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
    this.callouts();
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
    const made = UI.root.querySelectorAll(".floater.big:not([data-lane])");
    this.figure(made[made.length - 1], this.screen(p), 0); // (the rule's figure, made this frame)
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
    a.kickV += big ? 5.5 : 3.2; // (a shallow recoil: it never drops behind the heads of the front row)
    if (!o.dead) a.react(big ? "stagger" : "hurt", { rate: big ? 1.3 : 1.55, in: 0.05, out: 0.32, k: big ? 0.5 : 0.62 });
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
    this.leak(at, { smoke: 0.6, fire: 0.2, sparks: 0.8, rate: 7, size: 0.05 * S, vel: new THREE.Vector3(0, 0.6, 0.5), life: 0.7, color: this.hex, a: 0.35 });
    this.ember(at, 0.12 * S);
  }
  // a glowing edge round a hole burnt in it, or round a stump: a ring of embers that smoulders (at: where it is now, or null)
  ember(at, size) {
    if (!this.emberTex) {
      const c = document.createElement("canvas"); c.width = c.height = 64;
      const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 4, 32, 32, 31);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.36, "rgba(255,80,16,0.08)"); gr.addColorStop(0.52, "rgba(255,186,90,1)"); gr.addColorStop(0.68, "rgba(255,72,18,0.85)"); gr.addColorStop(1, "rgba(110,8,0,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      this.emberTex = new THREE.CanvasTexture(c);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.emberTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
    sp.renderOrder = 7; sp.visible = false;
    this.g.scene.add(sp);
    this.embers.push({ sp, at, size, t: rand(6.28) });
  }
  // armour torn off a bone and thrown clear on the frame of the blow, turning, sparks trailing from it; a small blast
  // where it was torn off, three frames on; the stump leaks from now on
  breakOff(bone, leak, quietly) { // (quietly: as a link of its death's chain, whose own blast it is thrown by)
    const g = this.g, kit = this.kit, a = this.a, S = this.S, b = a.P[bone];
    if (!b) return null;
    const sd = /^R_|R$/.test(bone) ? -1 : /^L_|L$/.test(bone) ? 1 : rand(-1, 1) < 0 ? -1 : 1, p = b.getWorldPosition(new THREE.Vector3()); // (its right is the lens's left)
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
    if (leak) {
      const stump = (v) => (a.root.visible && !this.blown ? b.getWorldPosition(v) : null);
      this.leak(stump, { smoke: 0.6, fire: 0.35, sparks: 0.7, rate: 9, size: 0.055 * S, vel: new THREE.Vector3(0, 0.7, 0.6), life: 0.7, a: 0.38, color: this.hex });
      this.ember(stump, 0.1 * S);
    }
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
    this.callouts(); // (a timeout's "STREAK LOST": a wrong answer's went into the lane as it was fired)
    this.debts.push({ t: 0 });
    this.marks(t, 0.6);
    if (t.line) { t.line.stop(); t.line = null; }
    if (this.hum) { Sound.stopLoop("boss-charge", 0.05); this.hum = false; }
    if (!t.hum) Sound.sfx("charge_up", 0, { vol: 0.7, rate: 1.3 }); // (a wrong answer before it had wound up: a short breath of charge, and the blow)
    // the blow is at its end on the frame the rule fires: from wherever its wind-up has reached (or, with none, from
    // a third of a second short of the blow), through to its end in the rule's own 0.12 s
    if (t.kind === 1) this.camLow = 0.8; // (a ground slam is seen from higher: the floor between it and the player shows)
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
    this.fl.end(s);
    this.strike = null;
  }
  // where a slam comes down on the floor: under its weapon's head (the row's slam: "weapon") or between its fists, as
  // its clip puts them at the blow (the actor's slamPt); null for the Tollgate, whose barrier's tip says it
  slamSpot(out) {
    const a = this.a, pt = a.slamPt && a.slamPt[this.row.slam === "weapon" ? "weapon" : "fists"];
    if (!pt) return null;
    a.model.scene.localToWorld(out.copy(pt));
    out.y = 0.07;
    return out;
  }
  // where a beam points as it sweeps across the foot of the picture (u: 0 to 1). (Not too near the lens: the beam's
  // width and the glow at its end are drawn in the world, and nearer they would fill the picture.)
  sweepAt(sd, u, out) { return this.lens(sd * lerp(-1.25, 1.25, u), -0.78 + 0.12 * Math.sin(u * Math.PI), 4.5, out); }
  release(s) {
    const g = this.g, kit = this.kit, a = this.a, S = this.S, k = S / 7.4, quiet = REDUCED_MOTION || GFX.calm, src = this.src(new THREE.Vector3());
    s.released = true;
    if (this.tele) this.tele.mark.forEach((m) => { m.t = Math.min(m.t, 0.1); });
    VFX.slowMo(0.45, 0.12, 0.03);
    kit.flash(src, this.hex, 0.25 * k, 0.9 * k, 0.09, 0.8, 1.4);
    kit.light(src, this.hex, 6, 0.2, 22);
    if (s.kind === 1) { // the ground slam: where the blow falls, the floor breaks and a shock runs out to the lens
      const f0 = (s.f0 = this.slamSpot(new THREE.Vector3()) || new THREE.Vector3(src.x * 0.5, 0.07, Math.max(src.z, 0.9 * k) + 0.5 * k));
      Sound.sfx("slam", 0, { vol: 1 });
      kit.wave(f0, null, this.hex, { flat: true, dur: 0.55, s0: 0.8 * k, s1: 13 * k, w: 0.24 });
      kit.wave(f0, null, 0xffffff, { flat: true, dur: 0.42, s0: 0.6 * k, s1: 9 * k, w: 0.1, delay: 0.03, k: 0.8 }); // (the kit has ten rings: a strike spends few, so none is taken back while it runs)
      // three blades of light run out along the floor from where it fell, to the foot of the picture where the player is
      const foot = (s.foot = this.floorFoot(new THREE.Vector3())), reach = f0.distanceTo(foot);
      for (const an of quiet ? [0] : [-0.24, 0, 0.24]) kit.bolt(this._v.copy(f0).setY(0.16), this._w.set(foot.x + Math.sin(an) * reach, 0.16, foot.z), this.hex, { dur: BOSS_ATK.FLY[1], width: 0.5 * k, len: 9 * k, light: an === 0 });
      kit.sparks(f0, this.hex, { n: quiet ? 10 : 28, speed: 15 * k, dir: this._v.set(0, 1, 0.25).normalize(), spread: 0.9, life: 0.6, len: 1.1 * k, w: 0.07 * k, gravity: 16 }); // a fountain of sparks where it fell
      kit.sparks(f0, 0xffffff, { n: 8, speed: 16 * k, dir: this._v.set(0, 0.6, 0.6).normalize(), spread: 1.3, life: 0.3, len: 1.1 * k, w: 0.05 * k, k: 1.8, gravity: 10 });
      kit.debris(f0, { n: quiet ? 5 : 12, size: 0.6 * k, speed: 9 * k, color: BOSS_ATK.WRECK, hot: this.hex, life: 1.0, radius: 0.8 * k });
      for (let i = 0; i < (quiet ? 3 : 8); i++) { const an = (i / 8) * Math.PI * 2 + rand(0.3); kit.smoke(this._v.set(Math.cos(an) * 1.2 * k, 0.35, Math.sin(an) * 1.2 * k).add(f0), { size: rand(1.1, 1.6) * k, life: rand(0.7, 0.95), vel: this._w.set(Math.cos(an), 0.12, Math.sin(an)).multiplyScalar(rand(4, 6.5) * k), rise: 0.25, a: 0.5, cold: true, color: BOSS_ATK.SMOKE, drag: 0.08 }); } // a ring of dust along the floor
      kit.scorch(f0, { size: 5.5 * k, life: 7, a: 0.6 });
      // the shock runs out across the floor to the foot of the picture, where the player stands: a deep band of its colour
      // behind a white-hot edge (seen along the floor a ring must be deep to show), sparks thrown up all along it (runStrike)
      s.reach = reach;
      kit.wave(f0, null, this.hex, { flat: true, dur: BOSS_ATK.FLY[1] + 0.08, s0: 0.8 * k, s1: 0.98 * reach, w: 1.6, k: 1 });
      kit.wave(f0, null, 0xffffff, { flat: true, dur: BOSS_ATK.FLY[1] + 0.04, s0: 1 * k, s1: 1.05 * reach, w: 0.55, k: 1 });
      g.shake(0.3); GFX.bloomPulse(0.35);
    } else if (s.kind === 2) { // the wave: thin rings of force from where it gathered; it comes on at the player until it fills the picture (runStrike)
      const to = this.lens(0, -0.15, 1.2);
      Sound.sfx("wave_fire", 0, { vol: 1 });
      for (let j = 0; j < 2; j++) kit.wave(src, null, this.hex, { dur: 0.3, s0: 0.7 * k, s1: (3.4 + j) * k, delay: j * 0.05, w: 0.075 });
      if (a.vent) a.vent(); // (and what its dress lets off: the Titan's pipes)
      kit.sparks(src, this.hex, { n: quiet ? 6 : 18, speed: 16 * k, dir: this._w.subVectors(to, src).normalize(), spread: 0.45, life: 0.3, len: 0.9 * k, w: 0.06 * k });
      g.shake(0.1);
    } else if (s.kind === 3) { // the beam: a white core in a wide halo, swept across the foot of the picture
      Sound.sfx("beam_fire", 0, { vol: 1 });
      s.beam = kit.beam(src, this.sweepAt(s.sd, 0, this._w), this.beamCol, { dur: 0, width: 0.7, k: this.beamK, grow: 0.04 });
    } else if (s.kind === 4) { // seekers: each swings out wide on its own side and comes in on the player
      Sound.sfx("missile_fire", -0.4, { vol: 0.9 }); Sound.sfx("missile_fire", 0.4, { vol: 0.9, delay: 0.05, rate: 1.08 });
      this.seekers.forEach((ms, j) => this.launch(ms, j, s));
    }
    this.fl.release(s, src, s.f0 || null); // (and what is its own: 22g)
  }
  // where the floor meets the foot of the picture: a shock along the floor reaches the player there
  floorFoot(out) {
    const cam = this.g.camera.position, p = this.lens(0, -1.04, 1, out), dy = p.y - cam.y;
    if (dy > -1e-3) return out.set(cam.x, 0.07, cam.z - 2.5);
    const q = (0.07 - cam.y) / dy;
    return out.set(cam.x + (p.x - cam.x) * q, 0.07, cam.z + (p.z - cam.z) * q);
  }
  launch(ms, j, s) {
    const a = this.a, S = this.S, sd = j % 2 ? -1 : 1, hi = j >> 1;
    a.at(j % 2 ? "handL" : this.row.src === "chest" ? "handR" : this.row.src, ms.a);
    this.lens(sd * (0.26 + hi * 0.36), -0.8, 2.6, ms.c); // (each lands inside the foot of the picture, where it is seen to hit)
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
        const n = s.n++, from = this.src(new THREE.Vector3()), to = this.lens(n ? [0, -0.7, 0.75, -0.35, 0.4][n] + rand(-0.08, 0.08) : rand(-0.12, 0.12), -0.84, 2.7), dir = this._w.subVectors(to, from).normalize(); // (each lands inside the foot of the picture, where it is seen to hit)
        kit.muzzle(from, dir, this.hex, 0.5 * k);
        // each is one of its own pictures (22g), turning as it flies, on a thin streak of its colour (it grows as it comes at the lens)
        const card = this.cards[n % this.cards.length], tx = this.fl.card(n);
        card.m.material.map = tx; card.m.material.needsUpdate = true; card.aspect = (tx.userData && tx.userData.aspect) || 0.72;
        card.bolt = kit.bolt(from, to, this.hex, { dur: FLY, width: 0.12 * k, len: 2.6 * k, light: n === 0, onHit: (p) => { card.m.visible = false; card.bolt = null; if (n === 0) this.land(s, from); else this.pop(p); } });
        card.spin = rand(6.28); card.turn = rand(-1, 1) < 0 ? -17 : 17;
        Sound.sfx("volley_fire", this.pan(from), { vol: 0.75, rate: 1 + n * 0.04 });
        a.kickV -= 1.5;
      }
    } else if (s.kind === 1) { // the shock runs along the floor from where the blow fell to the foot of the picture, where the player is: the floor jumps all along its front as it passes
      const q = Math.min(1, u / (FLY + 0.04)), r = lerp(1 * k, 1.05 * (s.reach || 1), Math.pow(q, 0.8)); // (where the white edge is: the ring's own growth)
      if ((s.acc += d) > 0.018 && q < 1) {
        s.acc = 0;
        for (let i = 0; i < (quiet ? 1 : 3); i++) {
          const an = i ? rand(-0.6, 0.6) : rand(-0.12, 0.12), p = this._v.set(s.f0.x + Math.sin(an) * r, 0.1, s.f0.z + Math.cos(an) * r);
          kit.sparks(p, this.hex, { n: 3, speed: 7 * k, dir: this._u.set(0, 1, 0.3).normalize(), spread: 0.6, life: 0.3, len: 0.6 * k, w: 0.06 * k, gravity: 12 });
          if (i === 0) { kit.debris(p, { n: 1, size: 0.4 * k, speed: 5 * k, color: BOSS_ATK.WRECK, hot: this.hex, life: 0.6, dir: this._u.set(0, 1, 0.2), spread: 0.5 }); kit.flash(p, this.hex, 0.3 * k, 1.1 * k, 0.1, 0.7, 1.4); }
        }
      }
      if (!s.landed && u >= FLY) this.land(s, s.f0);
    } else if (s.kind === 2) { // the wave comes on at the player, growing as it comes, until it fills the picture
      const q = Math.min(1, u / FLY);
      if ((s.acc += d) > 0.05 && q < 1) {
        s.acc = 0;
        const p = this._v.lerpVectors(this.src(this._u), this.lens(0, -0.1, 2.0, this._w), q * q), r = p.distanceTo(this.g.camera.position) * this.tb() * (0.3 + 1.05 * q);
        kit.wave(p, null, this.hex, { dur: 0.15, s0: r * 0.75, s1: r, w: 0.07, k: 0.9 });
      }
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
    this.fl.fly(s, u, d); // (its own: the Fine Print's script, the Phantom's bone-white edge)
    // a strike must be seen to land before the sheet comes up: whatever is still on its way lands now
    if (!s.landed && s.age > 0.12 + 0.3) this.land(s, null);
    if (s.landed && u > FLY + 0.35) { this.strike = null; if (s.beam) s.beam.stop(); this.fl.end(s); }
  }
  // the band's half-height for each unit away from the lens
  tb() { const g = this.g; return Math.tan(THREE.MathUtils.degToRad(g.camera.fov / 2)) * ((g.band ? g.band.h : GFX.h) / GFX.h); }
  // a bolt of the volley that is not the first: a small burst where it leaves the picture
  pop(p) {
    this.kit.flash(p, this.hex, 0.06, 0.26, 0.08, 0.9, 1.4);
    this.kit.sparks(p, 0xffffff, { n: 5, speed: 2.6, dir: this._u.set(0, 1, -0.4).normalize(), spread: 0.9, life: 0.22, len: 0.16, w: 0.016, k: 1.8, stretch: 0.02 });
    this.fl.pop(p);
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
    const tb = this.tb();
    if (kind === 1) { // the floor's jolt arrives under the player: the shock's ring across the foot of the picture, dust thrown up along it
      g.shake(0.34);
      if (s && s.foot) { kit.wave(s.foot, null, this.hex, { flat: true, dur: 0.3, s0: 2, s1: 9, w: 0.16 }); kit.flash(this.lens(0, -0.86, 3), this.lensCol, 0.08, 0.45, 0.12, 0.85, 1.5); } // (small: near the lens a unit is a third of the picture)
      for (let i = 0; i < (quiet ? 1 : 4); i++) kit.smoke(this.lens(rand(-0.85, 0.85), -1.0, 3.4), { size: 0.36, life: 0.6, vel: this._w.set(rand(-0.3, 0.3), 0.9, 0), a: 0.45, cold: true, color: BOSS_ATK.SMOKE });
    } else if (kind === 2) { // the wave breaks over the player: a ring that fills the picture, and the picture ripples
      GFX.ripple(g.camera, at, 1, 0.5);
      kit.wave(this.lens(0, -0.05, 1.6), null, this.hex, { dur: 0.24, s0: 1.6 * tb * 0.95, s1: 1.6 * tb * 1.6, w: 0.05, k: 0.9 });
      for (let j = 0; j < 2; j++) kit.wave(this.lens(0, -0.3, 3), null, 0xffffff, { dur: 0.3, s0: 3 * tb * 0.4, s1: 3 * tb * (1.1 + j * 0.25), delay: j * 0.08, w: 0.04, k: 0.8 });
    } else if (kind === 3) { // the beam: a hit where it crosses the player, then a line burnt across the foot of the picture, molten drips falling from it
      const b0 = this.sweepAt(s.sd, 0.08), b1 = this.sweepAt(s.sd, 0.92), hit = this.lens(0, -0.74, 2.6);
      kit.flash(hit, this.lensBeam, 0.08, 0.42, 0.12, 0.9, 1.6);
      kit.sparks(hit, 0xffffff, { n: quiet ? 5 : 12, speed: 2.4, spread: 1.4, life: 0.3, len: 0.14, w: 0.016, k: 1.8, gravity: 2, stretch: 0.02 });
      kit.gash(b0, b1, 0xffb070, 0.5, 0.045, 1.5);
      if (this.fl.fx.beam === "cleave") kit.gash(this.sweepAt(s.sd, 0.12).add(this._u.set(0, 0.05, 0)), this.sweepAt(s.sd, 0.88).add(this._u.set(0, 0.05, 0)), this.hex, 0.5, 0.04, 1.5); // (half violet: the arc's second edge)
      for (let j = 0; j < 3; j++) g.show.wait(j * 0.08, () => { if (!g.unmounted) kit.sparks(this._v.lerpVectors(b0, b1, rand(0.1, 0.9)), 0xffa050, { n: 4, speed: 0.6, life: 0.5, len: 0.12, w: 0.02, gravity: 2.5, k: 1.6, stretch: 0.02 }); });
    } else if (kind === 4 || kind === 0) kit.flash(this.lens(0, kind ? -0.7 : -0.8, 2.6), this.lensCol, 0.08, 0.4, 0.12, 0.8, 1.5); // (the seekers, or the volley's first, have struck: a flash where they met the player)
    else if (kind < 0) kit.flash(at, 0xff3050, 0.12, 0.5, 0.12, 0.8, 1.3);
    Sound.sfx("player_hit", from ? this.pan(from) * 0.5 : 0);
    Sound.sfx("heart_lost", 0, { delay: 0.09, vol: 0.9 });
    if (left === 1) Sound.say("CRITICAL");
    // the heart itself comes up low on the player's side of the picture, cracks and shatters (heard as the heart_lost above)
    if (g.iconFX) g.iconFX.shatter("heart", this.lens(-0.52, -0.5, 3.0), { size: 0.42, face: g.camera, turn: 0.3, hold: 0.05, crack: 0.07, onBreak: (q) => kit.sparks(q, 0xff4fd8, { n: quiet ? 5 : 12, speed: 2.6, life: 0.4, len: 0.16, w: 0.02, gravity: 3, k: 1.6, stretch: 0.02 }) });
    this.setLow(left <= 0 ? 2 : left === 1 ? 1 : 0);
  }
  // one heart left: a red frame that beats and the alarm; none: the frame holds
  setLow(on) {
    const g = this.g;
    if (on === this.low) return;
    this.low = on;
    GFX.setDanger(on === 2 ? 1 : on ? 0.72 : 0);
    HudFX.low(g.el, !!on);
    // and a saturated red frame round the picture (the band only: never over the question or the answers), beating
    // about once a second with the alarm (update); with no heart left it holds
    if (on && !this.redFrame && g.el) { const e = (this.redFrame = document.createElement("div")); e.style.cssText = "position:absolute;left:0;right:0;z-index:5;pointer-events:none;"; g.el.appendChild(e); this.redT = 0; }
    if (!on && this.redFrame) { this.redFrame.remove(); this.redFrame = null; }
    if (on === 1) { this.alarmOn(); this.lowT = 0; } else { Sound.stopLoop("boss-alarm", 0.3); this.alarm = false; }
  }

  // ---- it is finished (the rule: the last right answer; then victory) --------------------------------------------
  // done for: it stands there swaying, arms hanging, lights failing, small blasts along it, until the sheet is closed
  critical() {
    const a = this.a;
    this.setLow(0);
    a.react("stagger", { rate: 0.85, in: 0.06, out: 0.5, k: 0.65 });
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
    else { kit.explosion(p, { size: 0.55 + 0.05 * i, color: i % 2 ? 0xff4a9a : this.hex, shake: false, ring: i % 2 === 0, smoke: false, ground: false, debrisLife: 0.6 }); kit.sparks(p, 0xffffff, { n: 8, speed: 17, life: 0.3, len: 1.3, w: 0.05, k: 1.8, gravity: 6 }); } // (long streaks thrown clear: a blast has a shape)
    g.shake(0.08 + 0.015 * i);
    Sound.sfx("explosion_small", this.pan(p), { rate: 0.95 + i * 0.05, vol: 0.9 });
  }
  // banner: the rule's own "BOSS DEFEATED!" banner, shown when the last blast has gone
  // (Every boss's fall takes the same time: its last blast comes early enough that "BOSS DEFEATED!" is up for 1.5 s
  // before the results come at the rule's own frame; the final boss's death is bigger, not longer. The blasts of the
  // chain come a third of a second apart, never faster.)
  death(banner) {
    const g = this.g, a = this.a, rate = 1.3, T = BOSS_CLIP.death.down / rate, n = 3;
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
    a.shatter(p, 13).forEach((sc, i) => {
      if (sc.burn) { // a cape, a robe, a torso burns away where it lies: tongues of fire and smoke over it as it shrinks
        const tr = kit.trailer((v) => (sc.t > sc.life - 0.05 ? null : v.copy(sc.grp.position)), { smoke: quiet ? 0.4 : 0.8, fire: quiet ? 0.5 : 1, sparks: 0.6, rate: quiet ? 12 : 34, size: 0.9, life: 0.55, color: 0xff7a2a, a: 0.45, vel: new THREE.Vector3(0, 2.2, 0) });
        g.show.wait(sc.life, () => { tr.on = false; });
      } else if (i % 3 === 0 && !quiet) { const tr = kit.trailer((v) => (sc.rest || sc.t > sc.life - 0.3 ? null : v.copy(sc.grp.position)), { smoke: 0.3, fire: 0, sparks: 1, rate: 30, size: 0.3, life: 0.3, color: this.hex, a: 0.3 }); g.show.wait(sc.life, () => { tr.on = false; }); }
    });
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
    // the reward: stars and coins fly from the blast, round the question, to just beside the score, which counts up as they land
    const from = this.screen(p);
    g.show.wait(0.06, () => {
      if (g.unmounted) return;
      const sc = $("[data-score]", g.el), r = sc && sc.getBoundingClientRect(), to = r && r.width ? { x: r.left - 12, y: r.top + r.height / 2 } : "[data-score]";
      HudFX.reward(g.el, from, to, { n: 8, kind: "star", color: COLORS.yellow, clear: ".qpanel", dur: 400, gap: 12 });
      HudFX.reward(g.el, from, to, { n: 5, kind: "coin", color: COLORS.gold, clear: ".qpanel", dur: 430, gap: 12 });
      if (sc) this.count = { el: sc, a: parseInt(sc.textContent.replace(/\D/g, ""), 10) || 0, b: g.score, t: -0.42, dur: 0.8 }; // (a value already decided, shown as it arrives)
      if (g.iconFX) { // gold stars and egg coins thrown out of the blast toward the player, with the HUD's own
        const dir = this._u.copy(g.camera.position).sub(p).normalize().add(this._w.set(0, 0.6, 0)).normalize();
        g.iconFX.burst("star", p, { n: 7, size: big ? 0.8 : 0.65, speed: 10, dir, life: 1.0, gravity: 5, gap: 0.03 });
        g.iconFX.burst("coin", p, { n: 6, size: big ? 0.7 : 0.58, speed: 9, dir, life: 1.0, gravity: 6, gap: 0.035 });
      }
      Sound.sfx("reward", 0, { vol: 0.9 });
    });
    g.show.wait(0.05, () => {
      if (g.unmounted || !banner) return;
      if (!big) return banner();
      Sound.say("FINAL BOSS DESTROYED"); // (the final boss has its own line, over its banner; the banner is shown without the usual one)
      this.resultPre = "FINAL BOSS DESTROYED";
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
    // (its last word is its own: "game over" in the boss's recorded voice, in place of the announcer's)
    g.show.wait(0.4, () => { if (g.unmounted) return; Sound.sayAs(BOSS_LAST_WORD(g.bossKey), "GAME OVER"); this.showResult("GAME OVER", COLORS.red, "", { say: false }); });
  }
  // A result the player must read (the rule's own words): a plate on the top layer over the middle of the picture,
  // in at once and held until the next screen comes (it is never taken down: the results replace the whole screen at
  // the rule's frame). o: { say: false (its line is spoken elsewhere), pre: a line above it }
  showResult(title, color, sub, o = {}) {
    const g = this.g;
    if (!g.el) return;
    if (o.say !== false) Sound.say(title);
    const pre = o.pre || this.resultPre;
    let el = this.result;
    if (!el) { el = this.result = document.createElement("div"); g.el.appendChild(el); this.resT = 0; }
    el.style.cssText = "position:absolute;left:0;right:0;z-index:45;pointer-events:none;text-align:center;padding:14px 8px 12px;background:linear-gradient(90deg,rgba(5,2,18,0),rgba(5,2,18,0.9) 15%,rgba(5,2,18,0.9) 85%,rgba(5,2,18,0));" +
      `font:clamp(26px,8.6vw,50px)/1.08 var(--font-display);color:${color};text-shadow:0 0 14px ${color},0 4px 0 #000;opacity:${el.style.opacity || 0};`;
    el.innerHTML = (pre ? `<div style="font-size:0.46em;margin-bottom:10px">${esc(pre)}</div>` : "") + esc(title) + (sub ? `<small style="display:block;font-size:0.34em;color:var(--ink);margin-top:10px;text-shadow:0 2px 0 #000">${esc(sub)}</small>` : "");
  }

  update(dt) {
    const g = this.g, d = VFX.dt, a = this.a, kit = this.kit, S = this.S, k = S / 7.4, quiet = REDUCED_MOTION || GFX.calm;
    g.show.update(d);
    this.figures(d);
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
      this.fl.seekFly(ms, d); // (its own: sand falling from the Lich's, the Influencer's strings)
      if (u >= 1) { // each lands at its own place at the foot of the picture, a few frames after the last: a small shaped blast
        ms.t = -1; ms.sp.visible = false; ms.out = 0.2;
        kit.explosion(ms.p, { size: 0.26, color: this.hex, ring: false, shake: false, debris: false, smoke: false, ground: false });
        kit.wave(ms.p, null, this.hex, { dur: 0.24, s0: 0.08, s1: 0.75, w: 0.02, k: 0.85 });
        this.fl.seekLand(ms);
        Sound.sfx("missile_hit", this.pan(ms.p), { vol: 0.8 });
        if (ms.s) this.land(ms.s, ms.a);
      }
    }
    // ---- the volley's cards ride their streaks, turning
    for (const c of this.cards) {
      const b = c.bolt;
      if (!b || !b.on) { c.m.visible = false; c.bolt = null; continue; }
      const u = Math.min(1, b.t / b.dur);
      c.spin += c.turn * d;
      c.m.visible = true;
      c.m.position.copy(b.p);
      c.m.quaternion.copy(g.camera.quaternion); c.m.rotateZ(c.spin); c.m.rotateX(0.5 * Math.sin(c.spin * 0.7));
      const sz = lerp(1.5, 0.3, u) * k * 0.85, ar = Math.sqrt(c.aspect || 0.72); // (each picture its own shape: a card, a ticket, a coin, a pencil)
      c.m.scale.set(sz * ar, sz / ar, 1);
    }
    // ---- a heart owed is always seen to go: if no strike lands for it, it goes on its own
    for (let i = this.debts.length - 1; i >= 0; i--) if ((this.debts[i].t += d) > 1.2) { this.debts.splice(i, 1); this.debts.unshift({ t: 0 }); this.playerHit(null); break; }
    // ---- the entrance: the frame its feet touch
    if (a.justLanded) { a.justLanded = false; this.landing(); }
    // ---- done for: small blasts along it until the sheet is closed (under two a second)
    if (this.dying && g.state !== "over" && (this.dying.t -= d) <= 0) { this.dying.t = rand(0.6, 0.85); this.chain(this.dying.n++ % 5, false); }
    this.flick = this.dying ? 0.45 + 0.55 * Math.abs(Math.sin(VFX.t * 9) * Math.sin(VFX.t * 2.3)) : 1;
    // ---- the boss itself (raging, it shakes)
    const shk = rage && !quiet && this.phase === "fight" ? 0.055 * (g.rageK || 0) : 0;
    a.root.position.set(rand(-1, 1) * shk, rand(-1, 1) * shk * 0.4, 0);
    this.windEase = (this.windEase || 0) + ((g.state === "ask" ? this.windK : this.strike && !this.strike.landed ? 1 : 0) - (this.windEase || 0)) * Math.min(1, d * 8);
    a.lean = this.dying ? 1.6 : this.windEase * 0.8;
    a.update(d, { rage, glow: this.windEase * 0.7 + (rage ? 0.25 : 0), flick: this.flick, charge: this.windEase });
    // what it gathers glows where the attack will leave it
    const ok = this.windEase > 0.03 && a.root.visible && !this.blown;
    this.orb.visible = ok;
    if (ok) { this.src(this.orb.position); this.orb.scale.setScalar((0.3 + 1.0 * this.windEase + (this.windEase > 0.8 ? 0.12 * Math.sin(VFX.t * 16) : 0)) * k); this.orb.material.opacity = 0.55 * this.windEase; }
    // ---- its lamps: the rims come up as it powers up; the lens light sits where it gathers
    const L = g.lamps;
    if (L && this.rim0) { L.rimA.intensity = this.rim0[0] * (0.25 + 0.75 * a.power); L.rimB.intensity = this.rim0[1] * (0.25 + 0.75 * a.power); }
    this.kicker.intensity = 1.5 * (0.4 + 0.6 * a.power);
    // raging, its rims burn red and steam leaks from its back and shoulders
    this.rageGlow = (this.rageGlow || 0) + ((rage ? 1 : 0) - (this.rageGlow || 0)) * Math.min(1, d * 2.5);
    if (this.rageGlow > 0.002 || this.rageWas) {
      const R = BOSS_ATK.RAGE, rg = this.rageGlow;
      if (L && this.rimBase[0]) { L.rimA.color.copy(this.rimBase[0]).lerp(R, rg * 0.85); L.rimB.color.copy(this.rimBase[1]).lerp(R, rg * 0.85); }
      this.kicker.color.copy(this.rimBase[2]).lerp(R, rg * 0.75);
      this.rageWas = rg > 0.002;
    }
    if (rage && this.phase === "fight" && a.root.visible && !this.blown && (this.steamT = (this.steamT || 0) - d) <= 0) {
      this.steamT = quiet ? 0.4 : 0.09;
      const p = a.at(Math.random() < 0.6 ? "chest" : "head", this._u); p.x += rand(-0.26, 0.26) * S; p.y += 0.08 * S; p.z -= 0.04 * S;
      kit.smoke(p, { size: 1.3 * k, life: 1.0, vel: this._w.set(rand(-0.8, 0.8), 3, rand(-0.4, 0.1)).multiplyScalar(k), rise: 1, a: 0.48, cold: true, color: 0xd8c8f0, drag: 0.5 });
    }
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
    // ---- one heart left: the red frame beats about once a second, with the alarm (steady with none left, or with reduced effects)
    if (this.redFrame && g.band) {
      // (once the fight is over the band is no longer the picture: the frame goes, and the arena's own red vignette stays)
      const e = this.redFrame, beat = this.low === 2 || quiet ? 0.8 : Math.pow(0.5 + 0.5 * Math.cos((this.redT += d) * Math.PI * 2 / 1.125), 2), out = (this.redOut = g.state === "over" ? Math.min(1, (this.redOut || 0) + d / 0.3) : 0);
      e.style.top = g.band.top + "px"; e.style.height = g.band.h + "px";
      e.style.boxShadow = `inset 0 0 ${Math.round(46 + 34 * beat)}px ${Math.round(12 + 20 * beat)}px rgba(255, 18, 46, ${((0.42 + 0.5 * beat) * (1 - out)).toFixed(2)})`;
      if (out >= 1) { e.remove(); this.redFrame = null; }
    }
    // ---- the hole burnt in it and its stumps smoulder at their edges
    for (const e of this.embers) {
      const p = e.at(this._u);
      e.sp.visible = !!p;
      if (!p) continue;
      e.t += d;
      e.sp.position.copy(p);
      e.sp.scale.setScalar(e.size * (0.94 + 0.06 * Math.sin(e.t * 5.1)));
      e.sp.material.opacity = (0.72 + 0.2 * Math.sin(e.t * 3.7) * Math.sin(e.t * 1.3)) * this.flick; // (a slow smoulder: under three beats a second)
    }
    // ---- its words: a caption along the top of the picture; a result plate; the score counting up as the reward lands
    this.caption();
    if (this.result && g.el && g.band) { // (its defeat: low in the screen, over the boss's legs, its head and chest clear as it has the last word; its own death: in the middle of the picture, where it was)
      const e = this.result, q = Math.min(1, (this.resT = (this.resT || 0) + d) / 0.18);
      e.style.opacity = q.toFixed(2);
      e.style.transform = `scale(${(1 + 0.45 * (1 - q) * (1 - q)).toFixed(3)})`;
      e.style.top = Math.round((this.phase === "won" ? g.el.clientHeight * 0.7 : g.band.top + g.band.h * 0.5) - e.offsetHeight / 2) + "px";
    }
    if (this.count && (this.count.t += d) >= 0) { const c = this.count, q = Math.min(1, c.t / c.dur); c.el.textContent = fmtScore(Math.round(lerp(c.a, c.b, q * (2 - q)))); if (q >= 1) this.count = null; }
    this.fl.update(d);
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
    // drawn back: the floor is seen (from higher for a slam). While it winds up a blow all of it stays in the picture,
    // what it raises over its head too (how high it reaches is measured once for each clip: the actor's reach), and
    // for a slam the floor in front of it that the blow will cross
    const low = this.camLow, R = this.phase === "fight" && this.tele && this.a.reach ? this.a.reach[this.tele.clip] || 0 : 0;
    let wideD = near * 1.36, wideY = S * (0.47 - 0.14 * Math.max(0, low));
    if (R > 0) {
      const slam = this.tele.kind === 1, top = R * S * 1.04 + (slam ? 0.08 * S : 0), bot = -S * (slam ? 0.16 : 0.1); // (a slam's fists come up toward the lens: they stand higher in the picture than their height says)
      wideD = Math.max(wideD, (top - bot) / (2 * 0.94 * t * bh));
      const h = wideD * t * bh * 0.94;
      wideY = clamp(wideY, top - h, bot + h);
    }
    const to = lerp(near, wideD, k) * (1 - 0.035 * Math.sin(Math.min(1, this.punch) * Math.PI));
    this.dist += (to - this.dist) * Math.min(1, d * 5);
    const Hb = 2 * this.dist * t * bh;
    // (close: its head under the top of the band; while it talks, under its words: as much higher as they reach down the
    // band, less the sky there already is over its head)
    const lookBase = Math.max(S * 1.05 - Hb / 2, Hb * 0.36), over = lookBase + Hb / 2 - S * 1.01;
    this.bubbleRoom((lookBase + Hb / 2 - this.a.at("head", this._u).y) / Hb);
    this.roomT = Math.max(0, (this.roomT || 0) - d);
    this.room = (this.room || 0) + ((this.roomT > 0 ? 1 : 0) - (this.room || 0)) * Math.min(1, d * 6);
    const lookNear = lookBase + this.room * Math.max(0, (this.roomK || 0.15) * Hb - over) * (1 - this.overK), look = lerp(lookNear, wideY, k), cy = lerp(1.35 + 0.7 * Math.min(0, low), 3.4 + 0.8 * Math.max(0, low), k);
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
    this.cards.forEach((c) => c.m.material.dispose()); this.cardGeo.dispose();
    this.fl.dispose();
    for (const n of ["result", "redFrame"]) if (this[n]) { this[n].remove(); this[n] = null; }
    this.embers.forEach((e) => e.sp.material.dispose());
    if (this.emberTex) this.emberTex.dispose();
  }
}
