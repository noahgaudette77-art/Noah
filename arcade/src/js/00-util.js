// Small helpers shared by every module.
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
// GLSL-style smoothstep; the edges may run either way.
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nowMin = () => Math.floor(Date.now() / 60000);
const money = (n) => "$" + Math.round(n).toLocaleString("en-CA");
const pad = (n, w = 2) => String(n).padStart(w, "0");
const fmtScore = (n) => String(Math.round(n)).padStart(6, "0");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
// Mastery as a percent; one decimal below 10% so early progress is visible.
const mpct = (x) => { const v = x * 100; return v > 0 && v < 9.95 ? v.toFixed(1) : String(Math.round(v)); };
const REDUCED_MOTION = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const Ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// Per-scene tween/timer list. update(dt) drives them; clear() drops them.
class TweenSet {
  constructor() { this.list = []; }
  add(dur, fn, done, ease = Ease.outCubic) {
    const t = { e: 0, dur: Math.max(0.0001, dur), fn, done, ease };
    this.list.push(t);
    return t;
  }
  wait(dur, done) { return this.add(dur, null, done); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      if (!t) continue;
      t.e += dt;
      const k = Math.min(1, t.e / t.dur);
      if (t.fn) t.fn(t.ease(k), k);
      if (k >= 1) {
        this.list.splice(this.list.indexOf(t), 1);
        if (t.done) t.done();
      }
    }
  }
  clear() { this.list.length = 0; }
}

// Pixel-art icons drawn from tiny bitmaps, so every glyph matches the arcade look.
const PIXELS = {
  heart: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  shield: ["XXXXXXX", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  star: ["...X...", "...X...", "XXXXXXX", ".XXXXX.", "..XXX..", ".XX.XX.", "X.....X"],
  left: ["...X", "..XX", ".XXX", "XXXX", ".XXX", "..XX", "...X"],
  right: ["X...", "XX..", "XXX.", "XXXX", "XXX.", "XX..", "X..."],
  play: ["X....", "XXX..", "XXXXX", "XXX..", "X...."],
  pause: ["XX.XX", "XX.XX", "XX.XX", "XX.XX", "XX.XX"],
  note: ["..XXX", "..X.X", "..X.X", "..X..", "XXX..", "XXX.."],
  mute: ["X...X", ".X.X.", "..X..", ".X.X.", "X...X"],
  close: ["X...X", ".X.X.", "..X..", ".X.X.", "X...X"],
  check: ["....X", "...XX", "X.XX.", "XXX..", ".X..."],
  flag: ["XXXX.", "XXXXX", "XXXX.", "X....", "X....", "X...."],
  grid: ["XX.XX", "XX.XX", ".....", "XX.XX", "XX.XX"],
  up: ["..X..", ".XXX.", "XXXXX"],
  down: ["XXXXX", ".XXX.", "..X.."],
  coin: [".XXX.", "XX.XX", "XX.XX", "XX.XX", ".XXX."],
  full: ["XX.XX", "X...X", ".....", "X...X", "XX.XX"],
  book: ["XXX.XXX", "X.XXX.X", "X.XXX.X", "X.XXX.X", "XXXXXXX"],
  lock: ["..XXX..", ".X...X.", ".X...X.", "XXXXXXX", "XXX.XXX", "XXX.XXX", "XXXXXXX"],
  // one emblem per trophy (t_ + its id): a token, a flame, a bolt, a gear, a crested helmet, rank chevrons,
  // two cards, a sword, a sight, a crown, a gem, a rocket, a full purse, a ticked box, a rosette
  t_first: ["..XXXXX..", ".XX...XX.", "XX..X..XX", "XX.XXX.XX", "XX..X..XX", "XX..X..XX", "XX.XXX.XX", ".XX...XX.", "..XXXXX.."],
  t_streak5: ["....X....", "...XX....", "...XXX...", "..XXXX.X.", ".XXXXXXX.", ".XX.XXXXX", "XXX..XXXX", ".XX...XX.", "..XXXXX.."],
  t_streak10: [".....XXX.", "....XXX..", "...XXX...", "..XXXXXX.", ".XXXXXX..", "....XXX..", "...XXX...", "..XX.....", ".X......."],
  t_streak20: ["...X.X...", ".X.XXX.X.", "..XXXXX..", "XXX...XXX", ".XX...XX.", "XXX...XXX", "..XXXXX..", ".X.XXX.X.", "...X.X..."],
  t_ans100: ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "..XXXXX..", ".XXXXXXX.", ".XX...XX.", ".XX.X.XX.", ".XX...XX.", "..XX.XX.."],
  t_ans500: ["....X....", "...XXX...", "..XX.XX..", ".XX...XX.", "XX..X..XX", "...XXX...", "..XX.XX..", ".XX...XX.", "XX.....XX"],
  t_cards50: ["..XXXXXX.", "..X....X.", "XXXXXX.X.", "X....X.X.", "X.XX.X.X.", "X.XX.XXX.", "X....X...", "X....X...", "XXXXXX..."],
  t_boss1: [".......XX", "......XXX", ".....XXX.", "....XXX..", "X..XXX...", "XXXXX....", ".XXX.....", "XX.XX....", "X...X...."],
  t_boss6: ["....X....", "..XXXXX..", ".X..X..X.", ".X.....X.", "XXX.X.XXX", ".X.....X.", ".X..X..X.", "..XXXXX..", "....X...."],
  t_boss12: [".........", "X...X...X", "X...X...X", "XX.XXX.XX", "XXXXXXXXX", "XXXXXXXXX", "XX.X.X.XX", "XXXXXXXXX", "........."],
  t_flawless: ["..XXXXX..", ".XX.X.XX.", "XXXXXXXXX", ".XX.X.XX.", "..XX.XX..", "..XX.XX..", "...XXX...", "...XXX...", "....X...."],
  t_wave5: ["....X....", "...XXX...", "...XXX...", "..XX.XX..", "..XX.XX..", "..XXXXX..", ".XXXXXXX.", ".X.XXX.X.", "...X.X..."],
  t_million: ["...XXX...", "...XXX...", "..XXXXX..", ".XXX.XXX.", "XXX.X.XXX", "XXXX.XXXX", "XXX.X.XXX", "XXXX.XXXX", ".XXXXXXX."],
  t_exam60: ["XXXXXXXXX", "X.......X", "X......XX", "X.....XXX", "XX...XX.X", "XXX.XX..X", "X.XXX...X", "X..X....X", "XXXXXXXXX"],
  t_exam90: ["..XXXXX..", ".XX...XX.", ".X..X..X.", ".X.XXX.X.", ".X..X..X.", ".XX...XX.", "..XXXXX..", "..XX.XX..", ".XX...XX."],
  t_reader: ["XXXX.XXXX", "X..XXX..X", "X.X.X.X.X", "X..XXX..X", "X.X.X.X.X", "X..XXX..X", "XXXXXXXXX", "...XXX...", "........."],
};
function icon(name, color = "currentColor") {
  const rows = PIXELS[name];
  if (!rows) return "";
  const w = rows[0].length, h = rows.length;
  let r = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) if (row[x] === "X") r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" fill="${color}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const starsHTML = (n, max = 3) =>
  `<span class="stars" aria-label="${n} of ${max} stars">${Array.from({ length: max }, (_, i) => icon("star", i < n ? "#ffe14f" : "#7868cc")).join("")}</span>`;

const COLORS = {
  cyan: "#35efff", magenta: "#ff3ad4", yellow: "#ffe14f", lime: "#86ff5e",
  orange: "#ff9b3d", red: "#ff4769", violet: "#a65fff", gold: "#ffc93d", ink: "#f4efff",
};
// Answer slots share a colour in 3D and in the HUD: A cyan, B magenta, C yellow, D lime.
const SLOT_COLORS = [COLORS.cyan, COLORS.magenta, COLORS.yellow, COLORS.lime];
const SLOT_KEYS = ["A", "B", "C", "D"];
