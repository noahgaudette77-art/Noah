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
    osc.connect(g).connect(bus);
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
    src.connect(f).connect(g).connect(bus || this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  },

  sfx(name) {
    if (!this.ctx || !Store.settings.sfx) return;
    const T = (f, d, o) => this.tone(f, d, o);
    switch (name) {
      case "coin": T(988, 0.07, { vol: 0.2 }); T(1319, 0.32, { delay: 0.07, vol: 0.2 }); break;
      case "blip": T(660, 0.05, { vol: 0.12 }); break;
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
    }
  },

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
      if (s % 4 === 2) this.noise(0.04, { vol: 0.12, freq: 7000, type: "highpass", at, bus: this.musicBus });
      if (s % 8 === 0) this._tone(this.musicBus, 120, 0.14, { type: "sine", slide: -80, vol: 0.55, at });
      if (s % 8 === 4 && this.trackName !== "calm") this.noise(0.12, { vol: 0.22, freq: 1800, type: "bandpass", at, bus: this.musicBus });
      this.nextTime += stepDur;
      this.step++;
    }
  },
};
