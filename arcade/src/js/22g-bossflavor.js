// Each boss's own projectile, trail and impact, on top of the five kinds of strike the stage stages (22f): the kinds,
// their markers and their timing stay the stage's; what flies and what it leaves behind is the boss's own.
//   volley  PRODUCT PUSHER: contract cards with a cyan edge · PROBATE TOLLGATE: toll tickets and coins · THE PROCTOR:
//           exam papers and pencils
//   slam    PERILMONGER: molten cracks run from its fists · GROUP GOLEM: filing drawers and papers thrown up ·
//           LORD INTESTATE: the gavel's crack, as on a judge's block, and rings of sound
//   wave    SOLVENCY SPECTER: coins and keys poured out of its vault · INFLATION TITAN: a wave of scalding steam
//   seekers LONGEVITY LICH: bolts of sand · UNDUE INFLUENCER: strings of light that hold each bolt
//   beam    THE FINE PRINT: a beam of tiny glowing script · PATRIMONY PHANTOM: a cleaving arc, half bone-white, half violet
// Everything here is look: the stage calls it at the strike's release, in its flight and at its landing.
const BOSS_FX = {
  1: { cards: ["contract"] },
  10: { cards: ["ticket", "coin"], pop: "coins" },
  all: { cards: ["exam", "pencil"], pop: "papers", slam: "graphite" },
  2: { slam: "molten" },
  5: { slam: "drawers" },
  8: { slam: "gavel" },
  3: { wave: "vault" },
  6: { wave: "steam" },
  7: { seek: "sand" },
  9: { seek: "strings" },
  4: { beam: "script" },
  11: { beam: "cleave" },
};
// The pictures they are made of, drawn once (small: they are seen for a fraction of a second, and small on the screen).
const BOSS_ART = {
  // a contract: a white sheet, lines of print and a neon edge in the boss's colour
  contract(x, c) { x.canvas.width = 64; x.canvas.height = 88; x.fillStyle = c; x.fillRect(0, 0, 64, 88); x.fillStyle = "#f6fbff"; x.fillRect(7, 7, 50, 74); x.fillStyle = c; for (let i = 0; i < 5; i++) x.fillRect(14, 18 + i * 12, i === 4 ? 20 : 36, 4); },
  // a toll ticket: amber card, a dark stub cut off by a line of perforations, a barcode
  ticket(x) { x.canvas.width = 80; x.canvas.height = 44; x.fillStyle = "#ffb43a"; x.fillRect(0, 0, 80, 44); x.fillStyle = "#3a1a08"; x.fillRect(0, 0, 18, 44); x.fillStyle = "#ffe7a8"; for (let i = 0; i < 6; i++) x.fillRect(20, 3 + i * 7, 3, 3); x.fillStyle = "#2a1004"; for (let i = 0; i < 16; i++) x.fillRect(30 + i * 3, 9, i % 3 ? 1 : 2, 22); x.fillRect(30, 34, 36, 3); },
  // a coin: a gold disc, its rim and a stamped square in the middle
  coin(x) { x.canvas.width = x.canvas.height = 48; const g = x.createRadialGradient(18, 16, 4, 24, 24, 24); g.addColorStop(0, "#fff3b0"); g.addColorStop(0.6, "#ffc93a"); g.addColorStop(1, "#b07410"); x.fillStyle = g; x.beginPath(); x.arc(24, 24, 22, 0, 7); x.fill(); x.strokeStyle = "#8a5408"; x.lineWidth = 3; x.beginPath(); x.arc(24, 24, 16, 0, 7); x.stroke(); x.fillStyle = "#8a5408"; x.fillRect(19, 19, 10, 10); },
  // an exam paper: white, ruled, a red mark in a circle at the top
  exam(x) { x.canvas.width = 64; x.canvas.height = 88; x.fillStyle = "#f8f6ff"; x.fillRect(0, 0, 64, 88); x.fillStyle = "#9aa3c8"; for (let i = 0; i < 6; i++) x.fillRect(8, 30 + i * 9, i === 5 ? 26 : 48, 2); x.strokeStyle = "#ff2338"; x.lineWidth = 4; x.beginPath(); x.arc(46, 15, 10, 0, 7); x.stroke(); x.beginPath(); x.moveTo(40, 15); x.lineTo(45, 20); x.lineTo(53, 9); x.stroke(); },
  // a pencil: red body, bare wood and a dark point
  pencil(x) { x.canvas.width = 96; x.canvas.height = 16; x.fillStyle = "#e81b2e"; x.fillRect(10, 2, 66, 12); x.fillStyle = "#ff5a68"; x.fillRect(10, 2, 66, 4); x.fillStyle = "#f0c890"; x.beginPath(); x.moveTo(76, 2); x.lineTo(92, 8); x.lineTo(76, 14); x.fill(); x.fillStyle = "#1a1020"; x.beginPath(); x.moveTo(88, 6.4); x.lineTo(95, 8); x.lineTo(88, 9.6); x.fill(); x.fillStyle = "#c8c8d8"; x.fillRect(2, 2, 8, 12); x.fillStyle = "#ff9fb0"; x.fillRect(0, 3, 3, 10); },
  // a filing drawer: a steel front in the boss's colour, a label holder and a pull
  drawer(x, c) { x.canvas.width = 72; x.canvas.height = 44; x.fillStyle = "#2c2440"; x.fillRect(0, 0, 72, 44); x.fillStyle = c; x.fillRect(3, 3, 66, 38); x.fillStyle = "#1a1428"; x.fillRect(24, 10, 24, 8); x.fillStyle = "#f2eeff"; x.fillRect(26, 12, 20, 4); x.fillStyle = "#1a1428"; x.fillRect(22, 26, 28, 6); x.fillStyle = "#d8d0f0"; x.fillRect(24, 27, 24, 2); },
  // a sheet of paper: white and ruled
  sheet(x) { x.canvas.width = 48; x.canvas.height = 64; x.fillStyle = "#f4f2ff"; x.fillRect(0, 0, 48, 64); x.fillStyle = "#a8acd0"; for (let i = 0; i < 6; i++) x.fillRect(6, 10 + i * 8, i % 2 ? 30 : 36, 2); },
  // a key: a gold bow, a shank and its bit
  key(x) { x.canvas.width = 64; x.canvas.height = 24; x.strokeStyle = "#ffd25a"; x.lineWidth = 4; x.beginPath(); x.arc(12, 12, 8, 0, 7); x.stroke(); x.fillStyle = "#ffd25a"; x.fillRect(20, 10, 40, 4); x.fillRect(48, 14, 4, 7); x.fillRect(56, 14, 4, 5); },
  // tiny script: a line of glowing marks, too small to read
  glyph(x) { x.canvas.width = 64; x.canvas.height = 16; x.strokeStyle = "#ffffff"; x.lineWidth = 2; for (let i = 0; i < 9; i++) { const x0 = 3 + i * 6.8, h = 3 + Math.random() * 6; x.beginPath(); x.moveTo(x0, 8 + h / 2); x.lineTo(x0 + 1.5 + Math.random() * 2, 8 - h / 2); if (Math.random() < 0.6) x.lineTo(x0 + 4, 8 + Math.random() * 4 - 1); x.stroke(); } },
};
class BossFlavor {
  constructor(stage) {
    const g = (this.g = stage.g), s = g.scene;
    this.st = stage; this.key = stage.row.key; this.fx = BOSS_FX[this.key] || {};
    this.tex = {};
    const hex = "#" + stage.col.getHexString();
    const need = new Set([].concat(this.fx.cards || ["contract"], { coins: ["coin"], papers: ["sheet"] }[this.fx.pop] || [], { drawers: ["drawer", "sheet"], graphite: ["sheet"] }[this.fx.slam] || [], { vault: ["coin", "key"] }[this.fx.wave] || [], this.fx.beam === "script" ? ["glyph"] : []));
    for (const n of need) { const c = document.createElement("canvas"), x = c.getContext("2d"); BOSS_ART[n](x, hex); const t = new THREE.CanvasTexture(c); t.userData = { aspect: c.width / c.height }; this.tex[n] = t; }
    // thrown pictures: each a quad that faces the lens, flies, falls, turns and fades
    const geo = (this.geo = new THREE.PlaneGeometry(1, 1));
    this.toks = Array.from({ length: 36 }, () => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.visible = false; m.renderOrder = 9; s.add(m); return { m, live: false, t: 0, life: 1, v: new THREE.Vector3(), g: 0, drag: 0, spin: 0, turn: 0, size: 1, glow: 1 }; });
    this.strings = []; // the Influencer's strings: { beam, ms }
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
  }
  // the picture a volley's n-th card is
  card(n) { const l = this.fx.cards || ["contract"]; return this.tex[l[n % l.length]] || this.tex.contract; }
  // throw a picture: at pos, with vel (world units a second); o: { size, life, g, drag, spin, glow, depth }
  toss(name, pos, vel, o = {}) {
    const tx = this.tex[name];
    if (!tx) return null;
    const k = this.toks.find((q) => !q.live) || this.toks[0];
    k.live = true; k.t = 0; k.life = o.life || 0.9; k.g = o.g === undefined ? 9 : o.g; k.drag = o.drag || 0; k.spin = rand(6.28); k.turn = (o.spin === undefined ? 9 : o.spin) * (Math.random() < 0.5 ? -1 : 1); k.size = o.size || 1; k.glow = o.glow || 1.25;
    k.m.material.map = tx; k.m.material.needsUpdate = true; k.m.material.depthTest = !!o.depth; k.aspect = tx.userData.aspect || 1;
    k.m.position.copy(pos); k.v.copy(vel); k.m.visible = true;
    return k;
  }
  // ---- at the strike's release (s: the stage's strike; src: where it leaves the boss; f0: where a slam falls)
  release(s, src, f0) {
    const st = this.st, kit = st.kit, k = st.S / 7.4, quiet = REDUCED_MOTION || GFX.calm, fx = this.fx, cam = this.g.camera.position;
    if (s.kind === 1 && f0) {
      if (fx.slam === "molten") { // cracks of molten rock run out from its fists, glowing; embers rise from them
        const crack = (to, life) => { kit.gash(this._v.copy(f0).setY(0.09), to, 0xff5a10, life, 0.16 * k, 2); kit.gash(this._v.copy(f0).setY(0.1), to.setY(0.1), 0xffe0a0, life * 0.8, 0.05 * k, 2.2); }; // (glowing rock, its white-hot core)
        for (let i = 0; i < (quiet ? 3 : 7); i++) { const an = (i / 7) * Math.PI * 2 + rand(-0.3, 0.3), l = rand(2.4, 4.6) * k; crack(this._w.set(f0.x + Math.cos(an) * l, 0.09, f0.z + Math.sin(an) * l), rand(1.2, 1.7)); }
        crack(this._w.set(cam.x * 0.4 + f0.x * 0.6, 0.09, cam.z - 3), 1.6); // (and one toward the player)
        kit.sparks(f0, 0xff8a2a, { n: quiet ? 10 : 30, speed: 7 * k, dir: this._v.set(0, 1, 0.1).normalize(), spread: 0.8, life: 0.9, len: 0.5 * k, w: 0.06 * k, gravity: 3, k: 1.8 });
        kit.flash(f0, 0xff5a10, 0.6 * k, 2.6 * k, 0.16, 0.9, 1.6);
      } else if (fx.slam === "drawers") { // its filing drawers fly out of it, and the papers in them
        for (let i = 0; i < (quiet ? 2 : 5); i++) this.toss("drawer", this._v.copy(f0).add(this._w.set(rand(-1, 1) * k, rand(0.6, 1.4) * k, rand(-0.3, 0.6) * k)), this._w.set(rand(-6, 6) * k, rand(7, 11) * k, rand(2, 6) * k), { size: rand(0.9, 1.3) * k, life: 1.1, g: 22 * k, spin: 7, glow: 1 });
        for (let i = 0; i < (quiet ? 4 : 12); i++) this.toss("sheet", this._v.copy(f0).add(this._w.set(rand(-1.4, 1.4) * k, rand(0.5, 2) * k, rand(-0.5, 1) * k)), this._w.set(rand(-5, 5) * k, rand(4, 9) * k, rand(1, 6) * k), { size: rand(0.45, 0.65) * k, life: rand(1.2, 1.6), g: 5 * k, drag: 1.4, spin: 5, glow: 1.15 });
      } else if (fx.slam === "gavel") { // the crack of the gavel on its block: a hard white split in the floor, and rings of sound in the air
        for (const sd of [-1, 1]) kit.gash(this._v.copy(f0).setY(0.09), this._w.set(f0.x + sd * rand(1.6, 2.6) * k, 0.09, f0.z + rand(-0.6, 0.6) * k), 0xffffff, 0.9, 0.05 * k, 2.2);
        kit.flash(this._v.copy(f0).setY(0.5 * k), 0xffffff, 0.3 * k, 1.8 * k, 0.07, 1, 2.2);
        for (let j = 0; j < 4; j++) kit.wave(this._v.copy(f0).setY(0.9 * k), null, j % 2 ? 0xffffff : st.hex, { dur: 0.5, s0: 0.6 * k, s1: (5 + j * 2.4) * k, delay: j * 0.09, w: 0.035, k: 0.9 });
      } else if (fx.slam === "graphite") { // the pencil's point breaks on the floor: grey graphite and torn exam papers
        for (let i = 0; i < (quiet ? 2 : 5); i++) { const an = rand(6.28), l = rand(1.6, 3) * k; kit.gash(this._v.copy(f0).setY(0.09), this._w.set(f0.x + Math.cos(an) * l, 0.09, f0.z + Math.sin(an) * l), 0x9aa0c0, 1.2, 0.05 * k, 1.4); }
        for (let i = 0; i < (quiet ? 3 : 8); i++) this.toss("sheet", this._v.copy(f0).add(this._w.set(rand(-1, 1) * k, rand(0.5, 1.5) * k, 0)), this._w.set(rand(-5, 5) * k, rand(4, 8) * k, rand(1, 5) * k), { size: rand(0.45, 0.6) * k, life: 1.3, g: 5 * k, drag: 1.4, spin: 5 });
      }
    } else if (s.kind === 2) {
      if (fx.wave === "vault") { // its vault pours out: coins and keys, thrown at the lens with the wave
        for (let i = 0; i < (quiet ? 5 : 14); i++) { const key = i % 4 === 3; this.toss(key ? "key" : "coin", this._v.copy(src).add(this._w.set(rand(-0.4, 0.4) * k, rand(-0.3, 0.3) * k, 0.2 * k)), this.toward(src, rand(-0.9, 0.9), rand(-0.6, 0.5), rand(40, 52)), { size: (key ? 0.75 : 0.42) * k * rand(0.85, 1.15), life: 0.55, g: 2, spin: key ? 7 : 12, glow: 1.4 }); } // (fast enough to reach the player)
      } else if (fx.wave === "steam") { // scalding steam: big hot puffs rolled at the lens
        for (let i = 0; i < (quiet ? 3 : 8); i++) kit.smoke(this._v.copy(src).add(this._w.set(rand(-0.5, 0.5) * k, rand(-0.4, 0.4) * k, 0.3 * k)), { size: rand(1.4, 2.2) * k, life: rand(0.55, 0.7), vel: this.toward(src, rand(-0.5, 0.5), rand(-0.4, 0.3), rand(28, 36)), rise: 0.2, a: 0.55, cold: true, color: 0xc8c0e0, drag: 0.2 });
      }
    } else if (s.kind === 3 && fx.beam === "cleave") { // its other half: a bone-white edge sweeps a beat behind the violet one
      s.beam2 = kit.beam(src, st.sweepAt(s.sd, 0, this._w), 0xf4efe6, { dur: 0, width: 0.32, k: 1.1, grow: 0.04 });
    } else if (s.kind === 4 && fx.seek === "strings") { // the strings: from its hands to each bolt it throws
      this.strings = st.seekers.map((ms, j) => ({ ms, j, beam: null }));
    }
  }
  // a velocity from p at the lens (dx, dy across and up the band at the lens), speed in boss heights a second
  toward(p, dx, dy, speed) { const st = this.st, to = st.lens(dx, dy, 2.2, this._w); return to.sub(p).normalize().multiplyScalar(speed * (st.S / 7.4)); }
  // ---- while the strike flies (u: show seconds since its release)
  fly(s, u, d) {
    const st = this.st, kit = st.kit, k = st.S / 7.4, fx = this.fx;
    if (s.kind === 3 && fx.beam === "script" && u < 0.24 && (s.acc2 = (s.acc2 || 0) + d) > 0.015) { // the line of script runs out along the beam
      s.acc2 = 0;
      const from = st.src(this._v), end = st.sweepAt(s.sd, clamp(u / 0.22, 0, 1), this._w), dir = end.clone().sub(from);
      this.toss("glyph", from.clone().addScaledVector(dir, rand(0, 0.3)), dir.normalize().multiplyScalar(rand(14, 20) * k), { size: rand(0.5, 0.8) * k, life: 0.4, g: 0, spin: 0.6, glow: 2.2 });
    }
    if (s.kind === 3 && s.beam2) { // the bone-white edge follows the violet one, a beat behind
      const su = clamp((u - 0.03) / 0.22, 0, 1), from = st.src(this._v);
      if (u < 0.28) s.beam2.set(from.add(this._w.set(0, 0.1 * k, 0)), st.sweepAt(s.sd, su, this._w)); else { s.beam2.stop(); s.beam2 = null; }
    }
  }
  // ---- seekers as they fly (their heads and trails are coloured by the stage: sand for the Lich), the strings that hold them
  seekFly(ms, d) {
    const st = this.st, kit = st.kit, k = st.S / 7.4, fx = this.fx;
    if (fx.seek === "sand" && (ms.sand = (ms.sand || 0) + d) > 0.02) { ms.sand = 0; kit.sparks(ms.p, 0xf2d48a, { n: 2, speed: 1.2, dir: this._v.set(0, -1, 0), spread: 0.8, life: 0.45, len: 0.12 * k, w: 0.035 * k, gravity: 9, k: 1.4 }); } // grains of sand fall from each bolt
    if (fx.seek === "strings") { const sg = this.strings.find((q) => q.ms === ms); if (sg) { const hand = st.a.at(ms.j % 2 ? "handL" : "handR", this._v); if (!sg.beam) sg.beam = kit.beam(hand, ms.p, st.hex, { dur: 0, width: 0.035, k: 1.6, grow: 0 }); else sg.beam.set(hand, ms.p); } }
  }
  seekLand(ms) {
    const st = this.st, kit = st.kit, k = st.S / 7.4, fx = this.fx;
    if (fx.seek === "sand") { kit.sparks(ms.p, 0xf2d48a, { n: 16, speed: 4, life: 0.6, len: 0.14, w: 0.03, gravity: 8, k: 1.5 }); kit.smoke(ms.p, { size: 0.5, life: 0.5, a: 0.4, cold: true, color: 0xb8a878, rise: 0.1 }); }
    if (fx.seek === "strings") { const sg = this.strings.find((q) => q.ms === ms); if (sg && sg.beam) { sg.beam.stop(); sg.beam = null; } kit.sparks(ms.p, 0xffffff, { n: 8, speed: 3, life: 0.3, len: 0.2, w: 0.02, k: 1.8 }); }
    void k;
  }
  // ---- one bolt of a volley lands at the foot of the picture
  pop(p) {
    const st = this.st, k = 0.3, fx = this.fx;
    if (fx.pop === "coins") for (let i = 0; i < 3; i++) this.toss("coin", p, this._v.set(rand(-1.2, 1.2), rand(1.2, 2.4), rand(-0.5, 0.5)), { size: 0.16 * rand(0.8, 1.2), life: 0.5, g: 9, spin: 14, glow: 1.5 });
    else if (fx.pop === "papers") for (let i = 0; i < 2; i++) this.toss("sheet", p, this._v.set(rand(-1, 1), rand(0.8, 1.6), rand(-0.4, 0.4)), { size: 0.2, life: 0.6, g: 2, drag: 1.5, spin: 6 });
    void st; void k;
  }
  update(d) {
    const cam = this.g.camera;
    for (const k of this.toks) {
      if (!k.live) continue;
      k.t += d;
      if (k.t >= k.life) { k.live = false; k.m.visible = false; continue; }
      k.v.y -= k.g * d;
      if (k.drag) k.v.multiplyScalar(Math.max(0, 1 - k.drag * d));
      k.m.position.addScaledVector(k.v, d);
      k.spin += k.turn * d;
      k.m.quaternion.copy(cam.quaternion); k.m.rotateZ(k.spin); k.m.rotateX(0.6 * Math.sin(k.spin * 0.7));
      k.m.scale.set(k.size * Math.sqrt(k.aspect), k.size / Math.sqrt(k.aspect), 1);
      k.m.material.color.setScalar(k.glow);
      k.m.material.opacity = 1 - smoothstep(k.life * 0.7, k.life, k.t);
    }
  }
  // the strike is over: nothing of it is left hanging
  end(s) {
    if (s && s.beam2) { s.beam2.stop(); s.beam2 = null; }
    for (const sg of this.strings) if (sg.beam) { sg.beam.stop(); sg.beam = null; }
  }
  dispose() {
    this.toks.forEach((k) => k.m.material.dispose());
    this.geo.dispose();
    for (const n in this.tex) this.tex[n].dispose();
  }
}
