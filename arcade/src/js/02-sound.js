// Chiptune sound: every effect and the music are synthesised with WebAudio,
// so there are no audio files. Audio starts only after the first tap.
const Sound = {
  ctx: null,
  master: null,
  sfxBus: null,
  musicBus: null,
  noiseBuf: null,
  track: null,
  step: 0,
  nextTime: 0,
  timer: 0,

  init() {
    if (this.ctx) return this.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(c.destination);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = 0.55;
    this.sfxBus.connect(this.master);
    // the arcade hall: every effect also feeds a short reverb (the music stays dry)
    try {
      const n = Math.floor(c.sampleRate * 1.1), ir = c.createBuffer(2, n, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.8);
      }
      const verb = c.createConvolver(), send = c.createGain();
      verb.buffer = ir;
      send.gain.value = 0.2;
      this.sfxBus.connect(send).connect(verb).connect(this.master);
    } catch (e) { /* no convolver: effects stay dry */ }
    this.musicBus = c.createGain();
    this.musicBus.gain.value = 0.22;
    this.musicBus.connect(this.master);
    const len = c.sampleRate * 1;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.resume();
  },
  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  },

  tone(freq, dur, o = {}) {
    if (!this.ctx || !Store.settings.sfx) return;
    this._tone(this.sfxBus, freq, dur, o);
  },
  _tone(bus, freq, dur, { type = "square", vol = 0.25, slide = 0, delay = 0, attack = 0.004, at } = {}) {
    const c = this.ctx;
    const t0 = (at || c.currentTime) + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.panned(bus));
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },
  noise(dur, { vol = 0.3, delay = 0, freq = 1200, q = 0.8, type = "lowpass", at, bus } = {}) {
    if (!this.ctx) return;
    if (!bus && !Store.settings.sfx) return;
    const c = this.ctx;
    const t0 = (at || c.currentTime) + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(bus || this.panned(this.sfxBus));
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  },

  // Where the effect being played sits between the speakers (-1 left .. 1 right).
  pan: 0,
  panned(bus) {
    if (!this.pan || bus !== this.sfxBus || !this.ctx.createStereoPanner) return bus;
    const p = this.ctx.createStereoPanner();
    p.pan.value = clamp(this.pan, -1, 1);
    p.connect(bus);
    return p;
  },
  // The announcer: the browser's own speech voice, pitched down, for the big moments.
  say(text) {
    if (!Store.settings.sfx || !Store.settings.voice || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    try {
      const u = new SpeechSynthesisUtterance(String(text).replace(/[!·]/g, " ").toLowerCase());
      u.lang = "en-US";
      u.rate = 1.05;
      u.pitch = 0.5;
      u.volume = 0.9;
      if (speechSynthesis.speaking) speechSynthesis.cancel(); // the newest call-out wins
      speechSynthesis.speak(u);
    } catch (e) { /* speech isn't allowed here */ }
  },
  sfx(name, pan = 0) {
    if (!this.ctx || !Store.settings.sfx) return;
    this.pan = pan;
    try { this._sfx(name); } finally { this.pan = 0; }
  },
  _sfx(name) {
    const T = (f, d, o) => this.tone(f, d, o);
    switch (name) {
      case "coin": T(988, 0.07, { vol: 0.2 }); T(1319, 0.32, { delay: 0.07, vol: 0.2 }); break;
      case "blip": T(660, 0.05, { vol: 0.12 }); break;
      case "powerup": T(196, 0.42, { slide: 600, vol: 0.09, type: "sawtooth" }); [659, 880, 1319].forEach((f, i) => T(f, 0.09, { delay: 0.16 + i * 0.06, vol: 0.11 })); break; // a cabinet waking up
      case "lock": this.noise(0.08, { vol: 0.35, freq: 1800 }); T(140, 0.16, { delay: 0.03, vol: 0.2, type: "square" }); T(96, 0.22, { delay: 0.1, vol: 0.22, type: "square" }); break; // a vault bolt going home
      case "page": this.noise(0.12, { vol: 0.12, freq: 3200 }); break;
      case "whoosh": this.noise(0.7, { vol: 0.1, freq: 900, type: "bandpass", q: 0.7 }); T(170, 0.6, { slide: -90, vol: 0.04, type: "sawtooth" }); break;
      case "shield": T(520, 0.3, { slide: -380, vol: 0.12, type: "square" }); this.noise(0.25, { vol: 0.16, freq: 2600, type: "bandpass", q: 2 }); break;
      case "combo": T(660, 0.07, { vol: 0.07 }); T(990, 0.09, { delay: 0.05, vol: 0.07 }); break; // a page turning
      case "move": T(440, 0.04, { vol: 0.1, type: "triangle" }); break;
      case "select": T(523, 0.06, { vol: 0.16 }); T(784, 0.1, { delay: 0.06, vol: 0.16 }); break;
      case "back": T(392, 0.06, { vol: 0.14 }); T(262, 0.1, { delay: 0.06, vol: 0.14 }); break;
      case "laser": T(1400, 0.18, { slide: -1150, vol: 0.18, type: "sawtooth" }); break;
      case "shot": T(300, 0.25, { slide: 900, vol: 0.16, type: "square" }); break;
      case "boom": this.noise(0.45, { vol: 0.5, freq: 900 }); T(120, 0.4, { slide: -80, vol: 0.3, type: "triangle" }); break;
      case "bigboom": this.noise(1.1, { vol: 0.6, freq: 700 }); T(90, 1.0, { slide: -60, vol: 0.35, type: "triangle" }); break;
      case "correct": [523, 659, 784, 1047].forEach((f, i) => T(f, 0.1, { delay: i * 0.06, vol: 0.16 })); break;
      case "wrong": T(220, 0.18, { vol: 0.2, type: "sawtooth" }); T(155, 0.3, { delay: 0.16, vol: 0.2, type: "sawtooth" }); break;
      case "hit": this.noise(0.3, { vol: 0.45, freq: 400 }); T(110, 0.3, { slide: -60, vol: 0.3, type: "square" }); break;
      case "charge": T(200, 0.6, { slide: 600, vol: 0.08, type: "sawtooth" }); break;
      case "levelup": [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T(f, 0.12, { delay: i * 0.08, vol: 0.16 })); break;
      case "gameover": [392, 330, 262, 196].forEach((f, i) => T(f, 0.28, { delay: i * 0.22, vol: 0.2, type: "triangle" })); break;
      case "win": [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => T(f, 0.16, { delay: i * 0.11, vol: 0.18 })); break;
      case "flip": this.noise(0.12, { vol: 0.25, freq: 3000, type: "bandpass", q: 1.2 }); break;
      case "deposit": T(1568, 0.06, { vol: 0.12 }); T(2093, 0.18, { delay: 0.05, vol: 0.12 }); break;
      case "tick": T(1800, 0.02, { vol: 0.06 }); break;
      case "swoosh": this.noise(0.35, { vol: 0.3, freq: 1800, type: "bandpass", q: 0.6 }); break;
      case "clunk": T(70, 0.22, { slide: -35, vol: 0.45, type: "sine" }); this.noise(0.06, { vol: 0.35, freq: 2500, type: "bandpass", q: 2 }); break;
      case "buzz": T(118, 0.28, { vol: 0.07, type: "sawtooth" }); T(236, 0.2, { vol: 0.03, type: "square", delay: 0.02 }); break;
      case "crton": T(1800, 0.25, { slide: 6000, vol: 0.05, type: "sine" }); T(60, 0.3, { slide: -20, vol: 0.3, type: "sine", delay: 0.05 }); break;
      case "rankup": [392, 523, 659, 784, 1047, 1319].forEach((f, i) => T(f, 0.16, { delay: i * 0.09, vol: 0.17 })); T(1568, 0.6, { delay: 0.56, vol: 0.12, type: "triangle" }); break;
      case "warp": T(200, 1.1, { slide: 2400, vol: 0.12, type: "sawtooth" }); this.noise(1.0, { vol: 0.2, freq: 1200, type: "bandpass", q: 0.5 }); break;
      // FEVER: a riser into a fanfare, with the crowd behind it (bigger each level)
      case "fever1": case "fever2": case "fever3": {
        const n = +name.slice(5), root = [392, 440, 523][n - 1];
        T(root / 2, 0.34, { slide: root * 1.5, vol: 0.1, type: "sawtooth" });
        [1, 1.26, 1.5, 2, 2.52].slice(0, 2 + n).forEach((m, i) => T(root * m, 0.14, { delay: 0.3 + i * 0.07, vol: 0.17 }));
        T(root * 2, 0.5, { delay: 0.3 + (2 + n) * 0.07, vol: 0.13, type: "triangle" });
        this.cheer(0.5 + n * 0.25, 0.3);
        break;
      }
      case "trophy": [659, 784, 988, 1319].forEach((f, i) => T(f, 0.12, { delay: i * 0.08, vol: 0.16 })); T(1976, 0.5, { delay: 0.34, vol: 0.1, type: "triangle" }); this.cheer(0.7, 0.25); break;
      case "zip": T(900, 0.09, { slide: 1500, vol: 0.1, type: "triangle" }); T(1800, 0.08, { delay: 0.07, vol: 0.08 }); break;
      case "shatter":
        [0, 0.05, 0.11, 0.18].forEach((d, i) => this.noise(0.16, { vol: 0.3 - i * 0.05, freq: 5200 - i * 700, type: "highpass", delay: d }));
        T(1400, 0.4, { slide: -1150, vol: 0.1, type: "triangle" });
        break;
    }
  },

  // A crowd's cheer: band-passed noise that swells and rises, like "aaah".
  cheer(dur = 0.8, delay = 0) {
    if (!this.ctx || !Store.settings.sfx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    [[700, 0.2], [1150, 0.14], [2600, 0.07]].forEach(([freq, vol]) => {
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 1.6;
      f.frequency.setValueAtTime(freq * 0.8, t0);
      f.frequency.linearRampToValueAtTime(freq * 1.25, t0 + dur * 0.5);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(this.sfxBus);
      src.start(t0, Math.random() * 0.4);
      src.stop(t0 + dur + 0.05);
    });
  },

  // Dialogue "voices": a short blip per letter, pitched per character.
  voice(pitch = 440) {
    if (!this.ctx || !Store.settings.sfx) return;
    this._tone(this.sfxBus, pitch * (0.92 + Math.random() * 0.16), 0.045, { type: "square", vol: 0.06 });
  },

  // Arcade-floor ambience: a low crowd murmur plus distant cabinets beeping.
  ambience(on) {
    if (!this.ctx) return;
    if (on && !this._amb && Store.settings.sfx) {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 420;
      f.Q.value = 0.7;
      const g = c.createGain();
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.05, c.currentTime, 1.2);
      src.connect(f).connect(g).connect(this.sfxBus);
      src.start();
      const blip = () => {
        if (!this._amb) return;
        const at = c.currentTime;
        const pan = c.createStereoPanner ? c.createStereoPanner() : null;
        const o = c.createOscillator();
        const og = c.createGain();
        o.type = Math.random() < 0.5 ? "square" : "triangle";
        const base = pick([330, 392, 440, 523, 587, 659, 784, 880]);
        o.frequency.setValueAtTime(base, at);
        if (Math.random() < 0.5) o.frequency.setValueAtTime(base * 1.5, at + 0.07);
        og.gain.setValueAtTime(0.0001, at);
        og.gain.exponentialRampToValueAtTime(0.018, at + 0.01);
        og.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
        o.connect(og);
        if (pan) { pan.pan.value = rand(-0.9, 0.9); og.connect(pan).connect(this.sfxBus); } else og.connect(this.sfxBus);
        o.start(at);
        o.stop(at + 0.2);
        this._amb.t = setTimeout(blip, rand(500, 2200));
      };
      this._amb = { src, g, t: setTimeout(blip, 600) };
    } else if (!on && this._amb) {
      const a = this._amb;
      this._amb = null;
      clearTimeout(a.t);
      try { a.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2); a.src.stop(this.ctx.currentTime + 0.8); } catch (e) { /* already stopped */ }
    }
  },

  // A synth engine for the racer; rev() follows the speed.
  engine(on) {
    if (!this.ctx) return;
    if (on && !this._eng && Store.settings.sfx) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 420;
      const g = c.createGain();
      g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.05, c.currentTime, 0.4);
      const o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = "sawtooth";
      o2.type = "square";
      o1.frequency.value = 52;
      o2.frequency.value = 104.6;
      o1.connect(f);
      o2.connect(f);
      f.connect(g).connect(this.sfxBus);
      o1.start();
      o2.start();
      this._eng = { o1, o2, g, f };
    } else if (!on && this._eng) {
      const e = this._eng;
      this._eng = null;
      try { e.g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15); e.o1.stop(this.ctx.currentTime + 0.6); e.o2.stop(this.ctx.currentTime + 0.6); } catch (err) { /* stopped */ }
    }
  },
  rev(x) {
    if (!this._eng) return;
    const t = this.ctx.currentTime;
    this._eng.o1.frequency.setTargetAtTime(44 + x * 46, t, 0.15);
    this._eng.o2.frequency.setTargetAtTime(89 + x * 93, t, 0.15);
    this._eng.f.frequency.setTargetAtTime(300 + x * 500, t, 0.2);
  },

  // Music builds with your streak: 0 calm, 1 hats, 2 lead, 3 everything.
  intensity: 0,
  setIntensity(n) { this.intensity = clamp(n, 0, 3); },
  intensityFor(streak) { return streak >= 8 ? 3 : streak >= 5 ? 2 : streak >= 2 ? 1 : 0; },

  // --- music: a tiny step sequencer ----------------------------------------
  TRACKS: {
    title: { bpm: 100, prog: [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]], arp: [0, 1, 2, 3, 2, 1, 2, 3], lead: [76, 0, 0, 74, 0, 72, 0, 0, 72, 0, 74, 0, 76, 0, 79, 0] },
    hub: { bpm: 92, prog: [[38, 50, 53, 57], [43, 50, 55, 59], [36, 48, 52, 55], [41, 48, 53, 57]], arp: [0, 2, 1, 3, 2, 1, 3, 2], lead: null },
    game: { bpm: 128, prog: [[45, 57, 60, 64], [45, 57, 60, 64], [41, 53, 57, 60], [43, 55, 59, 62]], arp: [0, 1, 2, 3, 1, 2, 3, 2], lead: null },
    boss: { bpm: 140, prog: [[40, 52, 55, 59], [40, 52, 55, 59], [41, 53, 56, 60], [38, 50, 53, 57]], arp: [0, 3, 2, 3, 1, 3, 2, 3], lead: null },
    calm: { bpm: 80, prog: [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62]], arp: [0, 1, 2, 3, 2, 1, 2, 1], lead: null },
  },
  play(name) {
    if (this.trackName === name && this.timer) return;
    this.trackName = name;
    this.stopMusic();
    if (!this.ctx || !Store.settings.music || !this.TRACKS[name]) return;
    this.track = this.TRACKS[name];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._schedule(), 30);
  },
  stopMusic() {
    clearInterval(this.timer);
    this.timer = 0;
  },
  refreshMusic() {
    const n = this.trackName;
    this.trackName = null;
    if (Store.settings.music && n) this.play(n);
    else this.stopMusic();
  },
  _schedule() {
    const c = this.ctx;
    if (!c || !this.track) return;
    const tr = this.track;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < c.currentTime + 0.12) {
      const s = this.step % 16;
      const bar = Math.floor(this.step / 16) % tr.prog.length;
      const chord = tr.prog[bar];
      const at = this.nextTime;
      const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
      if (s % 4 === 0) this._tone(this.musicBus, hz(chord[0] - 12), stepDur * 3.2, { type: "triangle", vol: 0.5, at });
      if (s % 2 === 0) this._tone(this.musicBus, hz(chord[tr.arp[(s / 2) % tr.arp.length]] + 12), stepDur * 1.6, { type: "square", vol: 0.09, at });
      if (tr.lead && tr.lead[s] && bar % 2 === 1) this._tone(this.musicBus, hz(tr.lead[s]), stepDur * 1.8, { type: "square", vol: 0.07, at });
      const lvl = this.intensity;
      if (s % 4 === 2 || (lvl >= 1 && s % 2 === 1)) this.noise(0.04, { vol: lvl >= 1 ? 0.15 : 0.12, freq: 7000, type: "highpass", at, bus: this.musicBus });
      if (lvl >= 2 && s % 4 === 0) this._tone(this.musicBus, hz(chord[(s / 4 + bar) % 4] + 24), stepDur * 3.5, { type: "square", vol: 0.06, at });
      if (lvl >= 3 && s % 2 === 1) this._tone(this.musicBus, hz(chord[tr.arp[((s - 1) / 2) % tr.arp.length]] + 24), stepDur * 0.9, { type: "triangle", vol: 0.08, at });
      if (s % 8 === 0) this._tone(this.musicBus, 120, 0.14, { type: "sine", slide: -80, vol: 0.55, at });
      if (s % 8 === 4 && this.trackName !== "calm") this.noise(0.12, { vol: 0.22, freq: 1800, type: "bandpass", at, bus: this.musicBus });
      this.nextTime += stepDur;
      this.step++;
    }
  },
};
