// Dialogue: client briefings and boss speech, typed out letter by letter with a
// voice blip, next to a pixel-art portrait drawn on the fly.
const STORY = DATA.story || { clients: {}, bosses: {} };
const client = (n) => STORY.clients[String(n)] || null;
const bossLines = (key) => STORY.bosses[String(key)] || null;

const SKIN = { light: "#f6d7c3", fair: "#eabd9d", tan: "#c99668", brown: "#9a6a43", dark: "#5e3d26" };
const HAIR = { black: "#1b1420", brown: "#5a3720", auburn: "#9c4321", blond: "#e3c069", grey: "#9b9aa5", white: "#e9e8ee" };
const SHIRT = { cyan: COLORS.cyan, magenta: COLORS.magenta, yellow: COLORS.yellow, lime: COLORS.lime, orange: COLORS.orange, violet: COLORS.violet };

// A 24×24 pixel portrait from a short description (see content/story.json).
function drawPortrait(canvas, look = {}) {
  canvas.width = canvas.height = 24;
  const x = canvas.getContext("2d");
  const px = (c, a, b, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const skin = SKIN[look.skin] || SKIN.fair;
  const hair = HAIR[look.hair] || HAIR.brown;
  const shirt = SHIRT[look.shirt] || COLORS.cyan;
  px("#1a0d45", 0, 0, 24, 24);
  for (let i = 0; i < 24; i += 2) px("rgba(255,255,255,0.03)", 0, i, 24, 1);
  // shoulders, collar, neck
  px(shirt, 3, 19, 18, 5);
  px("rgba(0,0,0,0.25)", 3, 19, 18, 1);
  px(skin, 10, 15, 4, 4);
  px("rgba(0,0,0,0.18)", 10, 15, 4, 1);
  px("#ffffff", 9, 19, 2, 2);
  px("#ffffff", 13, 19, 2, 2);
  // long hair behind the head
  if (look.style === "long") { px(hair, 5, 6, 3, 12); px(hair, 16, 6, 3, 12); }
  // head
  px(skin, 7, 5, 10, 11);
  px(skin, 8, 4, 8, 1);
  px(skin, 8, 16, 8, 1);
  px(skin, 6, 9, 1, 3);
  px(skin, 17, 9, 1, 3);
  // hair on top
  if (look.style !== "bald") {
    px(hair, 7, 3, 10, 3);
    px(hair, 8, 2, 8, 1);
    px(hair, 7, 6, 1, 3);
    px(hair, 16, 6, 1, 3);
  } else {
    px(hair, 6, 7, 1, 3);
    px(hair, 17, 7, 1, 3);
  }
  if (look.style === "curly") for (let i = 6; i < 18; i += 2) { px(hair, i, 1, 1, 2); px(hair, i + 1, 2, 1, 2); }
  if (look.style === "bun") px(hair, 10, 0, 4, 3);
  if (look.style === "ponytail") px(hair, 17, 6, 2, 9);
  // eyes and brows
  px(hair === HAIR.white ? "#b9b8c2" : hair, 8, 8, 3, 1);
  px(hair === HAIR.white ? "#b9b8c2" : hair, 13, 8, 3, 1);
  px("#ffffff", 9, 10, 2, 1);
  px("#ffffff", 13, 10, 2, 1);
  px("#1b1420", 10, 10, 1, 1);
  px("#1b1420", 13, 10, 1, 1);
  if (look.glasses) {
    x.strokeStyle = "#20152e";
    x.lineWidth = 1;
    x.strokeRect(8.5, 9.5, 3, 2);
    x.strokeRect(12.5, 9.5, 3, 2);
    px("#20152e", 11, 10, 2, 1);
  }
  // nose, mouth, cheeks
  px("rgba(0,0,0,0.15)", 11, 11, 2, 2);
  px("#a8434f", 10, 14, 4, 1);
  if ((look.age || 0) >= 60) { px("rgba(0,0,0,0.12)", 8, 12, 1, 2); px("rgba(0,0,0,0.12)", 15, 12, 1, 2); }
  if (look.beard) { px(hair, 7, 12, 10, 4); px(hair, 9, 16, 6, 1); px("#a8434f", 10, 14, 4, 1); px(skin, 10, 13, 4, 1); }
  return canvas;
}

// Boss busts, 24×24: one for each of the twelve, drawn from its cyborg (the head it wears, what it carries).
// Letters are colours: K armour, S steel, B bone, C the boss's own colour, c that colour dimmed, W white,
// D near-black, G gold, w a pale veil. Each row is [colour, x, y, width, height].
const BUSTS = {
  // PRODUCT PUSHER: a salesman in plate, slick hair, a fixed grin
  1: [["K", 2, 19, 20, 5], ["S", 8, 19, 2, 5], ["S", 14, 19, 2, 5], ["C", 11, 19, 2, 5], ["W", 10, 19, 1, 1], ["W", 13, 19, 1, 1], ["S", 10, 16, 4, 3],
    ["S", 7, 5, 10, 11], ["S", 8, 16, 8, 1], ["K", 6, 3, 12, 3], ["K", 6, 6, 1, 3], ["K", 17, 6, 1, 3], ["K", 7, 8, 10, 2], ["C", 8, 8, 3, 2], ["C", 13, 8, 3, 2],
    ["W", 8, 12, 8, 3], ["D", 8, 13, 8, 1], ["D", 10, 12, 1, 3], ["D", 13, 12, 1, 3]],
  // PERILMONGER: horns, slanted eyes, a jaw of spikes
  2: [["K", 1, 19, 22, 5], ["B", 2, 17, 2, 2], ["B", 1, 15, 1, 2], ["B", 20, 17, 2, 2], ["B", 22, 15, 1, 2], ["C", 10, 21, 4, 1], ["C", 9, 22, 2, 1], ["C", 13, 22, 2, 1],
    ["K", 7, 6, 10, 11], ["S", 7, 6, 10, 2], ["K", 9, 17, 6, 2], ["B", 5, 5, 2, 3], ["B", 4, 2, 2, 4], ["B", 5, 1, 1, 1], ["B", 17, 5, 2, 3], ["B", 18, 2, 2, 4], ["B", 18, 1, 1, 1],
    ["C", 8, 10, 3, 1], ["C", 9, 11, 2, 1], ["C", 13, 10, 3, 1], ["C", 13, 11, 2, 1], ["D", 9, 14, 6, 1], ["B", 9, 15, 1, 2], ["B", 11, 15, 1, 2], ["B", 13, 15, 1, 2]],
  // SOLVENCY SPECTER: a hood, nothing in it but one eye; an empty vault in the chest
  3: [["c", 11, 1, 2, 1], ["c", 10, 2, 4, 1], ["c", 9, 3, 6, 1], ["c", 8, 4, 8, 2], ["c", 7, 6, 10, 10], ["c", 5, 10, 14, 8], ["c", 3, 17, 18, 7],
    ["0", 5, 22, 1, 2], ["0", 9, 23, 1, 1], ["0", 14, 22, 1, 2], ["0", 18, 23, 1, 1], ["D", 9, 7, 6, 8], ["W", 10, 9, 4, 3], ["C", 11, 9, 2, 3], ["D", 11, 10, 2, 1],
    ["S", 10, 18, 4, 4], ["D", 11, 19, 2, 2]],
  // THE FINE PRINT: a hunched scribe, one small eye and a loupe, clauses down its front
  4: [["K", 4, 12, 16, 2], ["K", 2, 14, 20, 10], ["K", 7, 4, 10, 9], ["S", 7, 4, 10, 1], ["D", 8, 6, 8, 6], ["W", 9, 8, 2, 2], ["D", 10, 9, 1, 1],
    ["C", 13, 6, 5, 1], ["C", 13, 11, 5, 1], ["C", 12, 7, 1, 4], ["C", 18, 7, 1, 4], ["c", 13, 7, 5, 4], ["D", 15, 8, 2, 2], ["C", 19, 11, 1, 1], ["C", 20, 12, 1, 2],
    ["w", 5, 16, 14, 1], ["w", 5, 18, 10, 1], ["C", 5, 20, 5, 1], ["w", 11, 20, 7, 1], ["w", 5, 22, 12, 1]],
  // GROUP GOLEM: a small dome sunk between two slabs
  5: [["S", 0, 9, 7, 15], ["S", 17, 9, 7, 15], ["w", 0, 9, 7, 1], ["w", 17, 9, 7, 1], ["D", 2, 12, 1, 1], ["D", 4, 12, 1, 1], ["D", 19, 12, 1, 1], ["D", 21, 12, 1, 1],
    ["C", 0, 15, 7, 1], ["C", 17, 15, 7, 1], ["K", 7, 15, 10, 9], ["S", 9, 9, 6, 6], ["S", 10, 8, 4, 1], ["D", 9, 11, 6, 2], ["C", 10, 11, 4, 1],
    ["C", 11, 18, 2, 2], ["W", 11, 18, 1, 1], ["S", 7, 22, 10, 1]],
  // INFLATION TITAN: a boiler; a valve wheel for a head, a gauge in the red, stacks venting
  6: [["K", 4, 16, 16, 8], ["S", 4, 17, 16, 1], ["S", 4, 22, 16, 1], ["W", 10, 18, 4, 4], ["D", 11, 19, 2, 2], ["R", 12, 18, 1, 2], ["K", 2, 10, 3, 6], ["K", 19, 10, 3, 6],
    ["w", 2, 7, 2, 2], ["w", 4, 5, 2, 2], ["w", 20, 7, 2, 2], ["w", 18, 5, 2, 2], ["S", 11, 13, 2, 3],
    ["C", 9, 2, 6, 1], ["C", 9, 12, 6, 1], ["C", 7, 4, 1, 7], ["C", 16, 4, 1, 7], ["C", 8, 3, 1, 1], ["C", 15, 3, 1, 1], ["C", 8, 11, 1, 1], ["C", 15, 11, 1, 1],
    ["C", 11, 3, 2, 9], ["C", 8, 6, 8, 2], ["S", 10, 5, 4, 4], ["D", 11, 6, 2, 2]],
  // LONGEVITY LICH: a crowned skull over bare ribs
  7: [["B", 11, 17, 2, 7], ["B", 6, 19, 12, 1], ["B", 7, 21, 10, 1], ["B", 8, 23, 8, 1], ["B", 3, 18, 3, 3], ["B", 18, 18, 3, 3],
    ["B", 7, 6, 10, 8], ["B", 8, 5, 8, 1], ["B", 8, 14, 8, 2], ["D", 8, 9, 3, 3], ["D", 13, 9, 3, 3], ["C", 9, 10, 1, 1], ["C", 14, 10, 1, 1], ["D", 11, 12, 2, 2],
    ["D", 9, 15, 1, 1], ["D", 11, 15, 1, 1], ["D", 13, 15, 1, 1], ["D", 15, 15, 1, 1], ["G", 7, 4, 10, 2], ["G", 7, 2, 2, 2], ["G", 11, 1, 2, 3], ["G", 15, 2, 2, 2], ["C", 11, 4, 2, 1]],
  // LORD INTESTATE: a judge's wig, a stern plate face, bands at the throat
  8: [["K", 2, 18, 20, 6], ["W", 10, 18, 4, 3], ["W", 11, 21, 2, 2], ["S", 8, 6, 8, 10], ["S", 9, 16, 6, 2], ["K", 8, 8, 8, 1], ["C", 9, 9, 2, 1], ["C", 13, 9, 2, 1],
    ["D", 10, 13, 4, 1], ["D", 9, 14, 1, 1], ["D", 14, 14, 1, 1], ["B", 7, 2, 10, 3], ["B", 6, 3, 12, 3], ["B", 4, 5, 4, 13], ["B", 16, 5, 4, 13],
    ["k", 4, 8, 4, 1], ["k", 4, 11, 4, 1], ["k", 4, 14, 4, 1], ["k", 16, 8, 4, 1], ["k", 16, 11, 4, 1], ["k", 16, 14, 4, 1], ["k", 11, 2, 1, 4]],
  // UNDUE INFLUENCER: a smooth mask with a painted smile, strings rising off it
  9: [["w", 1, 0, 1, 13], ["w", 4, 0, 1, 9], ["w", 19, 0, 1, 7], ["w", 22, 0, 1, 12], ["K", 3, 19, 18, 5], ["S", 9, 19, 1, 5], ["S", 14, 19, 1, 5], ["C", 15, 20, 2, 1], ["K", 10, 16, 4, 3],
    ["B", 8, 4, 8, 1], ["B", 7, 5, 10, 10], ["B", 8, 15, 8, 1], ["B", 9, 16, 6, 1], ["k", 12, 4, 5, 12], ["D", 8, 9, 3, 1], ["D", 13, 9, 3, 1], ["C", 9, 9, 1, 1], ["C", 14, 9, 1, 1],
    ["D", 9, 13, 6, 1], ["D", 8, 12, 1, 1], ["D", 15, 12, 1, 1], ["C", 8, 11, 1, 1], ["C", 15, 11, 1, 1]],
  // PROBATE TOLLGATE: a toll booth; a signal for a head, a barrier across the chest, a gun on each shoulder
  10: [["K", 4, 16, 16, 8], ["C", 4, 18, 3, 2], ["D", 7, 18, 3, 2], ["C", 10, 18, 3, 2], ["D", 13, 18, 3, 2], ["C", 16, 18, 4, 2], ["D", 10, 21, 4, 1], ["S", 11, 13, 2, 3],
    ["S", 1, 13, 3, 5], ["D", 1, 13, 3, 1], ["S", 20, 13, 3, 5], ["D", 20, 13, 3, 1], ["K", 8, 0, 8, 13], ["S", 8, 0, 8, 1], ["S", 8, 12, 8, 1],
    ["r", 10, 1, 4, 3], ["C", 10, 5, 4, 3], ["W", 11, 6, 2, 1], ["l", 10, 9, 4, 3]],
  // PATRIMONY PHANTOM: split down the middle, half plate and half bone
  11: [["S", 1, 17, 10, 7], ["C", 1, 17, 10, 1], ["B", 14, 19, 8, 2], ["B", 16, 21, 3, 3], ["K", 6, 5, 6, 12], ["S", 6, 5, 6, 1], ["C", 8, 9, 2, 2], ["K", 7, 17, 5, 1],
    ["B", 13, 5, 5, 10], ["B", 13, 15, 4, 2], ["D", 13, 9, 3, 3], ["C", 14, 10, 1, 1], ["D", 14, 16, 1, 1], ["D", 16, 16, 1, 1], ["C", 12, 3, 1, 21]],
  // THE PROCTOR: an examiner's cap and tassel, a monocle on its chain, slab shoulders
  all: [["K", 0, 17, 24, 7], ["S", 0, 15, 6, 4], ["S", 18, 15, 6, 4], ["C", 0, 19, 6, 1], ["C", 18, 19, 6, 1], ["C", 11, 20, 2, 2], ["W", 11, 20, 1, 1],
    ["K", 7, 6, 10, 10], ["S", 8, 14, 8, 2], ["S", 4, 3, 16, 2], ["w", 4, 3, 16, 1], ["K", 7, 5, 10, 1], ["G", 19, 4, 1, 5], ["G", 18, 9, 3, 2],
    ["C", 9, 9, 2, 2], ["c", 13, 9, 4, 3], ["C", 14, 10, 2, 1], ["G", 13, 8, 4, 1], ["G", 13, 12, 4, 1], ["G", 12, 9, 1, 3], ["G", 17, 9, 1, 3], ["G", 17, 13, 1, 1], ["G", 18, 14, 1, 2],
    ["D", 9, 13, 6, 1]],
};
function drawBossBust(canvas, key, color) {
  canvas.width = canvas.height = 24;
  const x = canvas.getContext("2d");
  const pal = { K: "#1b1730", S: "#69708c", B: "#e2dac6", C: color, W: "#ffffff", D: "#07040f", G: "#ffc93d", R: "#ff4769", "0": "#0c0326" };
  const veil = { c: [color, 0.42], w: ["#ffffff", 0.3], k: ["#000000", 0.2], r: ["#ff4769", 0.4], l: ["#86ff5e", 0.4] };
  x.fillStyle = "#0c0326";
  x.fillRect(0, 0, 24, 24);
  x.globalAlpha = 0.16; // its own light behind it
  x.fillStyle = color;
  x.fillRect(3, 2, 18, 20);
  x.fillRect(6, 0, 12, 24);
  x.globalAlpha = 1;
  for (const [k, a, b, w, h] of BUSTS[key]) {
    if (veil[k]) { x.globalAlpha = veil[k][1]; x.fillStyle = veil[k][0]; }
    else { x.globalAlpha = 1; x.fillStyle = pal[k]; }
    x.fillRect(a, b, w, h);
  }
  x.globalAlpha = 1;
  x.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 24; i += 2) x.fillRect(0, i, 24, 1);
  return canvas;
}

// A boss portrait: its own bust when the boss is known (by its key), else a plain horned block in its colour.
function drawBossPortrait(canvas, color, key) {
  if (key !== undefined && key !== null && BUSTS[key]) return drawBossBust(canvas, key, color);
  canvas.width = canvas.height = 24;
  const x = canvas.getContext("2d");
  x.fillStyle = "#0c0326";
  x.fillRect(0, 0, 24, 24);
  x.fillStyle = color;
  x.fillRect(5, 6, 14, 14);
  x.fillRect(4, 8, 16, 10);
  x.fillRect(5, 2, 2, 5);
  x.fillRect(17, 2, 2, 5);
  x.fillStyle = "#ffffff";
  x.fillRect(7, 10, 10, 6);
  x.fillStyle = "#ff4769";
  x.fillRect(10, 10, 4, 6);
  x.fillStyle = "#000000";
  x.fillRect(11, 10, 2, 6);
  x.fillRect(8, 18, 8, 1);
  return canvas;
}

const Dialog = {
  // Show lines one by one; tap or press a key to advance. Calls onDone at the end.
  open({ lines, name, look, boss, color = COLORS.cyan, voice = 520, onDone, skipLabel = "SKIP" }) {
    if (!lines || !lines.length) { if (onDone) onDone(); return; }
    const el = UI.el(`<div class="dlg-wrap" data-act="advance" role="dialog" aria-modal="true" aria-label="${esc(name || "Dialogue")}">
      <div class="dlg" style="--c:${color}">
        <canvas class="dlg-face" aria-hidden="true"></canvas>
        <div class="dlg-body">
          <div class="dlg-name">${esc(name || "")}</div>
          <div class="dlg-text selectable" aria-live="polite"></div>
          <div class="dlg-foot"><span class="next">TAP TO CONTINUE ${icon("play")}</span><button data-act="skip">${esc(skipLabel)}</button></div>
        </div>
      </div></div>`);
    const face = $(".dlg-face", el);
    if (boss) drawBossPortrait(face, color, boss === true ? null : boss);
    else drawPortrait(face, look);
    const text = $(".dlg-text", el);
    const next = $(".next", el);
    let i = 0, shown = 0, timer = 0, typing = false;
    const type = () => {
      const line = lines[i];
      shown = 0;
      typing = true;
      next.style.visibility = "hidden";
      clearInterval(timer);
      timer = setInterval(() => {
        shown = Math.min(line.length, shown + 1);
        text.textContent = line.slice(0, shown);
        if (shown % 2 === 0 && line[shown - 1] && line[shown - 1] !== " ") Sound.voice(voice);
        if (shown >= line.length) { clearInterval(timer); typing = false; next.style.visibility = "visible"; }
      }, REDUCED_MOTION ? 4 : 24);
    };
    const finish = () => {
      clearInterval(timer);
      UI.closeModal();
      if (onDone) onDone();
    };
    const advance = () => {
      if (typing) {
        clearInterval(timer);
        typing = false;
        text.textContent = lines[i];
        next.style.visibility = "visible";
        return;
      }
      i++;
      if (i >= lines.length) return finish();
      Sound.sfx("blip");
      type();
    };
    UI.openModal({
      el,
      on: (a) => { if (a === "skip") finish(); else advance(); },
      key: (e) => {
        if (e.key === "Escape") { e.preventDefault(); finish(); }
        else if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); advance(); }
      },
      destroy: () => clearInterval(timer),
    });
    type();
  },

  // A short speech bubble that types itself out inside a game screen and fades.
  say(host, text, { top = 80, color = COLORS.magenta, voice = 160, name = "", ms = 2200 } = {}) {
    if (!host || !text) return;
    const old = host.querySelector(".bubble");
    if (old) old.remove();
    const b = UI.el(`<div class="bubble" style="--c:${color};top:${Math.round(top)}px">${name ? `<b>${esc(name)}</b>` : ""}<span></span></div>`);
    host.appendChild(b);
    const span = b.querySelector("span");
    // Never over the explanation: if a sheet is up, or comes up while this is on screen (a short phone has no
    // room for both in the 3D strip), the bubble sits just above the sheet instead.
    const clear = () => {
      const sh = host.querySelector(".sheet");
      if (!sh || !b.isConnected) return;
      const lim = sh.offsetTop - 10 - b.offsetHeight;
      if (b.offsetTop > lim) b.style.top = Math.max(4, lim) + "px";
    };
    let n = 0;
    const t = setInterval(() => {
      n++;
      clear();
      span.textContent = text.slice(0, n);
      if (n % 2 === 0 && text[n - 1] !== " ") Sound.voice(voice);
      if (n >= text.length) clearInterval(t);
    }, REDUCED_MOTION ? 2 : 20);
    [120, 320, 700, 1200].forEach((d) => setTimeout(clear, d + text.length * 20)); // (and once the last line has been typed)
    setTimeout(() => { clearInterval(t); b.remove(); }, ms + text.length * 20);
  },
};

function clientVoice(c) {
  const look = c.look || {};
  let v = 520 - (c.age || 40) * 2.6;
  if (["long", "bun", "ponytail", "curly"].includes(look.style)) v += 90;
  if (look.beard) v -= 40;
  return clamp(v, 220, 620);
}

// Show a stage's client briefing the first time that stage is played.
function withBriefing(sel, go) {
  const n = sel.chapters.length === 1 ? sel.chapters[0] : null;
  const c = n && client(n);
  if (!c || Store.state.met[n]) return go();
  Store.state.met[n] = 1;
  Store.save();
  briefing(n, go);
}
function briefing(n, done) {
  const c = client(n);
  if (!c) { if (done) done(); return; }
  Sound.sfx("crton");
  Dialog.open({
    lines: c.lines.concat(c.mission ? [c.mission] : []),
    name: `${c.name.toUpperCase()}${c.age ? ", " + c.age : ""} · STAGE ${n} CLIENT`,
    look: Object.assign({ age: c.age }, c.look),
    color: CH(n).color,
    voice: clientVoice(c),
    skipLabel: "SKIP BRIEFING",
    onDone: done,
  });
}
