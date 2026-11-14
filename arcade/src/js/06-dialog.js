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

// A boss portrait: its body colour, one big eye, horns.
function drawBossPortrait(canvas, color) {
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
    if (boss) drawBossPortrait(face, color);
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
