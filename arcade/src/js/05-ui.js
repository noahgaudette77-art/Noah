// HTML overlay: one screen at a time, plus an optional modal. Buttons declare
// what they do with data-act; the current screen (or modal) handles it.
const UI = {
  root: null,
  cur: null,
  modal: null,
  init() {
    this.root = $("#ui");
    const ownerOf = (t) => (this.modal && this.modal.el.contains(t) ? this.modal : this.cur && this.cur.el.contains(t) ? this.cur : null);
    // In-game choices (answers, the flashcard, grading) fire the moment a finger
    // touches, not when it lifts, so answering feels instant. The click that follows
    // the same touch is then ignored, wherever it lands.
    const FAST = { ans: 1, flip: 1, again: 1, good: 1, easy: 1 };
    let fast = null;
    // A focus ring is the keyboard's. It shows once a key has been used and goes again when a finger or the mouse
    // takes over (a button the game focuses for you, RESUME or PLAY AGAIN, wore a ring nobody had asked for).
    const root = document.documentElement;
    document.addEventListener("pointerdown", () => { if (root.dataset.input !== "pointer") root.dataset.input = "pointer"; }, true);
    document.addEventListener("keydown", (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey && root.dataset.input !== "keys") root.dataset.input = "keys"; }, true);
    document.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      const t = e.target.closest("[data-act]");
      if (!t || t.disabled || !FAST[t.dataset.act]) return;
      const owner = ownerOf(t);
      if (!owner || !owner.on) return;
      fast = { at: performance.now(), x: e.clientX, y: e.clientY };
      owner.on(t.dataset.act, t, e);
    });
    document.addEventListener("click", (e) => {
      Sound.init();
      if (fast && e.detail > 0 && performance.now() - fast.at < 900 && Math.hypot(e.clientX - fast.x, e.clientY - fast.y) < 40) { fast = null; return; }
      fast = null;
      const t = e.target.closest("[data-act]");
      if (!t || t.disabled) return;
      const owner = ownerOf(t);
      if (owner && owner.on) owner.on(t.dataset.act, t, e);
    });
    // Enter or Space on a button the keyboard moved to (Tab, or an arrow over a grid of cards) is that button's: the
    // browser clicks it, and the screen's own Enter (PLAY in the hall, PLAY AGAIN, the exam's next question, turning a
    // card) is left out. With the focus where a click or the game itself put it, the screen's keys work as before.
    // (Phase 7: Tab to STATS in the hall and Enter played the cabinet; to the exam's flag, and Enter went on instead.)
    let navKey = false, keyFocus = null;
    // (Option-Tab is how Safari tabs to buttons; an arrow with a modifier is a browser's shortcut, which may leave the
    // page and never bring its keyup back: so the window's blur ends it too)
    document.addEventListener("keydown", (e) => { navKey = e.key === "Tab" || (e.key.startsWith("Arrow") && !e.metaKey && !e.ctrlKey && !e.altKey); }, true);
    document.addEventListener("keyup", () => { navKey = false; }, true);
    window.addEventListener("blur", () => { navKey = false; });
    document.addEventListener("focusin", (e) => { keyFocus = navKey ? e.target : null; });
    document.addEventListener("pointerdown", () => { keyFocus = null; }, true);
    // ... and only on what is on top and in play: not a button under a client's briefing or a menu (a briefing takes
    // no focus, so the stage that opened it keeps it: Enter there is the briefing's), not a panel put out of reach (the
    // exam's while its ending plays). (Phase 7's review: Enter under a first briefing started the stage again.)
    const keyButton = () => {
      const b = keyFocus, top = this.modal || this.cur;
      if (!b || b !== document.activeElement || b.disabled || !b.matches("button, a[href]") || !top || !top.el.contains(b)) return null;
      const cs = getComputedStyle(b);
      return cs.pointerEvents === "none" || cs.visibility === "hidden" ? null : b;
    };
    // (no key does anything while the graphics context is lost (GFX.contextLost) but the notice's RELOAD, once it is
    // offered: Tab reaches it, and Enter or Space on it starts the page again; a focused button's Space clicks on its
    // key's release)
    const reload = (e) => { const b = $("#gl-lost [data-act=reload]"); return b && !b.hidden && e.target === b ? b : null; };
    document.addEventListener("keyup", (e) => { if (typeof GFX !== "undefined" && GFX.lost && !reload(e)) { e.preventDefault(); e.stopPropagation(); } }, true);
    document.addEventListener("keydown", (e) => {
      if (typeof GFX !== "undefined" && GFX.lost) {
        if (reload(e) && (e.key === "Enter" || e.key === " ")) return;
        e.preventDefault();
        const b = $("#gl-lost [data-act=reload]");
        if (e.key === "Tab" && b && !b.hidden) b.focus();
        return;
      }
      Sound.init();
      if (e.target && e.target.tagName === "INPUT" && e.key !== "Escape") return;
      if ((e.key === "Enter" || e.key === " ") && keyButton()) return; // (the browser clicks it)
      const was = document.activeElement;
      this._nav = false;
      if (this.modal) { if (this.modal.key) this.modal.key(e); }
      else if (this.cur && this.cur.key) this.cur.key(e);
      // An arrow the screen took as its own (the hall's cabinets, a lane, a grade, a question: it says so with
      // preventDefault) lets go of the button the keyboard had moved to, so Enter is the screen's again: the ring
      // would otherwise stay on STATS while the cabinets turn. (Not the arrows over a screen's cards: see arrowNav.)
      if (e.key.startsWith("Arrow") && e.defaultPrevented && !this._nav && keyFocus && keyFocus === was && document.activeElement === was) { keyFocus = null; was.blur(); }
    });
  },
  // The graphics context lost (GFX.contextLost) and back: a notice over everything, which takes the pointer too. Lost
  // for long (the browser may not give it back), it offers to start the page again (progress is kept: Store).
  glLost(on) {
    let el = $("#gl-lost");
    clearTimeout(this._glLostT);
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
      el = this.el('<div id="gl-lost" role="alertdialog" aria-live="assertive" aria-label="Restoring graphics"><span>RESTORING GRAPHICS</span><button class="btn" data-act="reload" hidden>RELOAD</button></div>');
      el.addEventListener("click", (e) => { if (e.target && e.target.dataset.act === "reload") location.reload(); });
      document.body.appendChild(el);
    }
    this._glLostT = setTimeout(() => { const b = $("#gl-lost [data-act=reload]"); if (b) b.hidden = false; }, 10000);
  },
  show(ctrl) {
    if (this.cur) {
      if (this.cur.destroy) this.cur.destroy();
      this.cur.el.remove();
    }
    this.closeModal();
    this.cur = ctrl;
    this.root.appendChild(ctrl.el);
    if (ctrl.mounted) ctrl.mounted();
    const f = ctrl.el.querySelector("[autofocus]");
    if (f) f.focus({ preventScroll: true });
  },
  // The arrows over a screen's cards or buttons (stage select, the guide's chapters, Setup, a menu, the exam's grid of
  // questions). Left and Right go to the one before or after in reading order (the order the cards and switches are
  // read in, and Tab's); Up and Down to the nearest above or below, the nearest row first; with rows (Setup's
  // .setting), to the row before or after, at the control in it nearest across. The first arrow, none of them focused,
  // goes to the one the screen lights, or the first. Then Enter or Space is that one's (see init). Safari's Tab skips
  // buttons unless its settings say otherwise (Option-Tab), so on a Mac the arrows are how a keyboard reaches a stage.
  // (Phase 7.) across: only Left and Right (Up and Down still scroll the page: a results screen's list). Nothing that
  // way: the key is left to the page (it scrolls past the last row to what is under it). Returns true when it took it.
  arrowNav(e, root, sel, first, across, rows) {
    const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (!d || (across && d[1]) || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return false;
    const items = [...root.querySelectorAll(sel)].filter((b) => !b.disabled && b.getClientRects().length);
    if (!items.length) return false;
    this._nav = true; // (the screen's arrows move its focus: see init)
    const at = items.indexOf(document.activeElement), mid = (b) => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r]; };
    let to = null;
    if (at < 0) to = (first && items.find((b) => b.matches(first))) || items[0];
    else if (d[0]) to = items[at + d[0]] || null;
    else {
      const [ax, ay, a] = mid(items[at]);
      if (rows) { // the row before or after that has any of them, at the one in it nearest across
        const own = items[at].closest(rows), list = [...root.querySelectorAll(rows)].filter((r) => r !== own && items.some((b) => r.contains(b)));
        const all = [...root.querySelectorAll(rows)], k = all.indexOf(own);
        const next = list.filter((r) => (all.indexOf(r) - k) * d[1] > 0).sort((p, q) => (all.indexOf(p) - all.indexOf(q)) * d[1])[0];
        if (next) to = items.filter((b) => next.contains(b)).sort((p, q) => Math.abs(mid(p)[0] - ax) - Math.abs(mid(q)[0] - ax))[0];
      } else {
        let best = Infinity;
        for (const b of items) {
          const [bx, by, r] = mid(b), along = (by - ay) * d[1], gap = Math.max(0, Math.abs(bx - ax) - (a.width + r.width) / 2);
          if (b === items[at] || along < 8) continue;
          if (3 * along + gap < best) { best = 3 * along + gap; to = b; } // (the nearest row first, and in it the one straight on)
        }
      }
    }
    if (!to) return false;
    e.preventDefault();
    to.focus({ preventScroll: true });
    to.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  },
  el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  },
  toast(msg, ms = 2400) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove("show"), ms);
  },
  flash(kind) {
    if (kind === "hit" && GFX.ok) GFX.glitch(1, 0.4); // a wrong answer tears the picture
    if (GFX.ok && GFX.hitFlash(kind)) return; // drawn by the renderer (see GFX.hitFlash)
    const f = $("#flash");
    f.className = "";
    void f.offsetWidth;
    f.className = kind;
    // Clear it once played, so no full-screen layer stays behind the game.
    clearTimeout(this._flashT);
    this._flashT = setTimeout(() => { if (f.className === kind) f.className = ""; }, 700);
  },
  // Set text only when it changes: any write re-lays-out and repaints the HUD.
  text(el, s) {
    s = String(s);
    if (el && el.textContent !== s) el.textContent = s;
  },
  // Fill an in-game bar (.meter.slide) by sliding it: a compositor-only change.
  meter(el, frac) {
    if (el) el.style.transform = `translateX(${((clamp(frac, 0, 1) - 1) * 100).toFixed(1)}%)`;
  },
  // Black the screen, then run fn once that black frame is showing, then power the
  // CRT back on. Building a scene (and, the first time, compiling its shaders)
  // blocks for a moment on a phone: behind black it reads as the set switching
  // channels, instead of the tap seeming to do nothing.
  cover(fn) {
    if (this.covering) return; // a second tap while the screen is already switching
    this.covering = true;
    $("#flash").className = "cover";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { fn(); } finally { this.covering = false; this.flash("crt-on"); }
    }));
  },
  // The loading line: shown over a black screen while a game's asset files arrive (see Assets.with).
  loading(on, frac) {
    const f = $("#flash");
    let l = $("#loading");
    if (!on) { if (l) l.remove(); return; }
    f.className = "cover";
    if (!l) { l = this.el('<div id="loading" role="status"><span>LOADING</span><div class="lbar"><i></i></div></div>'); document.body.appendChild(l); }
    $("i", l).style.transform = `scaleX(${clamp(frac || 0, 0.03, 1).toFixed(3)})`;
  },
  banner(text, color = COLORS.yellow, sub = "", cls = "") {
    Sound.say(text);
    const b = this.el(`<div class="banner${cls ? " " + cls : ""}" style="--c:${color}">${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ""}</div>`);
    this.root.appendChild(b);
    setTimeout(() => b.remove(), cls.indexOf("plated") >= 0 ? 2200 : 1400); // (a plated banner, RANK UP!, stands a little longer: see style.css)
  },
  floater(text, x, y, color = COLORS.yellow, big = false) {
    const f = this.el(`<div class="floater${big ? " big" : ""}" style="--c:${color};left:${x}px;top:${y}px">${esc(text)}</div>`);
    this.root.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  },
  openModal(ctrl) {
    this.closeModal();
    this.modal = ctrl;
    document.body.appendChild(ctrl.el);
    if (ctrl.mounted) ctrl.mounted();
  },
  closeModal() {
    if (!this.modal) return;
    const m = this.modal;
    this.modal = null;
    m.el.remove();
    if (m.destroy) m.destroy();
  },
  // careful: the answer that changes nothing is the filled button and the other is an outline (for a yes
  // that cannot be undone, such as submitting an exam with questions still blank).
  confirm({ title, text = "", yes = "YES", no = "CANCEL", color = COLORS.magenta, careful = false, onYes, onNo }) {
    const el = this.el(`<div class="modal"><div class="dialog" style="--c:${color}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ""}
      <button class="btn${careful ? " ghost" : ""}" data-act="yes" style="--c:${color}">${esc(yes)}</button>
      <button class="btn${careful ? "" : " ghost"}" data-act="no"${careful ? ` style="--c:${COLORS.cyan}"` : ""}>${esc(no)}</button></div></div>`);
    this.openModal({
      el,
      on: (a) => { this.closeModal(); if (a === "yes") onYes && onYes(); else onNo && onNo(); },
      key: (e) => {
        if (e.key === "Escape") { this.closeModal(); onNo && onNo(); }
        else this.arrowNav(e, el, ".btn");
      },
      mounted: () => $("[data-act=no]", el).focus(),
    });
  },
};

// Reusable topbar markup.
function topbar(title, { back = "BACK", right = "" } = {}) {
  return `<header class="topbar"><button class="iconbtn" data-act="back" aria-label="Back">${icon("left")} ${esc(back)}</button>
    <h1 class="grow">${esc(title)}</h1>${right}</header>`;
}
function soundBtn() {
  const on = Store.settings.sfx || Store.settings.music;
  return `<button class="iconbtn" data-act="mute" aria-label="${on ? "Mute sound" : "Turn sound on"}">${icon(on ? "note" : "mute")}</button>`;
}
function toggleMute() {
  const on = Store.settings.sfx || Store.settings.music;
  Store.settings.sfx = !on;
  Store.settings.music = !on;
  Store.save();
  Sound.refreshMusic();
  if (on) Sound.stopLoops(); // (an engine or an alarm that was running goes quiet with everything else)
  UI.toast(on ? "SOUND OFF" : "SOUND ON");
  return !on;
}

// The question panel + answer buttons + explanation sheet shared by the games.
// A minus sign set in the display face comes from a fallback font and sits on the baseline, where it reads as an
// underscore: it is lifted to the middle of the figures it belongs to (the text itself is unchanged).
const minusUp = (html) => html.replace(/−/g, '<span class="minus">−</span>');
class QuizPanel {
  constructor(screenEl) {
    this.el = screenEl;
    this.qEl = $(".qpanel", screenEl);
    this.aEl = $(".answers", screenEl);
    this.round = null;
    this.sheet = null;
    this._next = null;
    this._autoT = 0;
  }
  show(round, meta) {
    this.round = round;
    if (this.el && !this.sheet) this.el.classList.remove("sheet-up"); // (a new question's answers are never left standing back)
    const q = round.q;
    const diff = ["", "EASY", "MEDIUM", "HARD"][q.difficulty] || "";
    this.qEl.classList.toggle("long", q.q.length > 190);
    this.qEl.innerHTML = `<div class="qmeta"><span>${esc(meta || "STAGE " + q.ch + " · " + q.topic)}</span><span class="diff">${diff}</span></div>
      <div class="qtext selectable">${esc(q.q)}</div>`;
    this.qEl.classList.remove("fresh");
    void this.qEl.offsetWidth; // restart the sweep
    this.qEl.classList.add("fresh");
    const longest = Math.max(...round.order.map((_, i) => round.text(i).length));
    this.aEl.className = "answers" + (round.tf ? " tf" : "") + (longest > 64 ? " long" : "");
    this.aEl.innerHTML = round.order
      .map((_, i) => `<button class="ans" data-act="ans" data-i="${i}" style="--c:${SLOT_COLORS[i]}"><span class="k">${round.labels[i]}</span><span class="tx">${esc(round.text(i))}</span></button>`)
      .join("");
  }
  keyIndex(e) {
    if (!this.round || e.metaKey || e.ctrlKey || e.altKey) return -1;
    const k = e.key.toLowerCase();
    if (this.round.tf) {
      if (k === "t" || k === "1" || k === "a") return 0;
      if (k === "f" || k === "2" || k === "b") return 1;
      return -1;
    }
    let i = "1234".indexOf(k);
    if (i < 0) i = "abcd".indexOf(k);
    return i >= 0 && i < this.round.n ? i : -1;
  }
  select(i) { $$(".ans", this.aEl).forEach((b, j) => b.classList.toggle("sel", j === i)); }
  lock() { this.aEl.classList.add("locked"); }
  reveal(picked) {
    $$(".ans", this.aEl).forEach((b, j) => {
      b.classList.remove("sel");
      if (j === this.round.correct) b.classList.add("good");
      else if (j === picked) b.classList.add("bad");
      else b.classList.add("dim");
    });
    this.lock();
  }
  btnCenter(i) {
    const b = $$(".ans", this.aEl)[i];
    if (!b) return { x: GFX.w / 2, y: GFX.h / 2 };
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top };
  }
  feedback({ ok, title, color, auto = 0, onNext, nextLabel = "NEXT" }) {
    this.clearSheet();
    const r = this.round, q = r.q;
    const c = color || (ok ? COLORS.lime : COLORS.red);
    const el = UI.el(`<div class="sheet" style="--c:${c}" role="dialog" aria-label="Explanation">
      <div class="verdict">${/^[^!]{2,12}! ./.test(title) ? `<span class="v1">${esc(title.slice(0, title.indexOf("! ") + 1))}</span> <span class="v2">${minusUp(esc(title.slice(title.indexOf("! ") + 2)))}</span>` : minusUp(esc(title))}</div>
      ${ok ? "" : `<div class="answer"><b>ANSWER ${r.labels[r.correct]} ·</b> ${esc(r.correctText)}</div>`}
      <div class="explain selectable">${esc(q.explain)}</div>
      <div class="sheet-foot">
        <span class="ref">BOOK P. ${esc(q.page || "")} · ${esc(q.topic || "")}</span>
        <button class="btn" data-act="next" style="--c:${c}">${esc(nextLabel)} ${icon("play")}</button>
      </div>
      ${auto ? `<div class="autobar"><i></i></div>` : ""}</div>`);
    this.el.appendChild(el);
    this.el.classList.add("sheet-up"); // (the answers stand back behind it: see style.css, .sheet-up)
    this.sheet = el;
    this._next = onNext;
    if (auto) {
      const bar = $(".autobar i", el);
      if (bar.animate) bar.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: auto, easing: "linear", fill: "forwards" });
      this._autoT = setTimeout(() => this.next(), auto);
      el.addEventListener("pointerdown", () => this.holdAuto(), { once: true });
    }
    setTimeout(() => { const b = el.querySelector("[data-act=next]"); if (b && document.contains(b)) b.focus({ preventScroll: true }); }, 60);
  }
  holdAuto() {
    clearTimeout(this._autoT);
    if (this.sheet) { const ab = $(".autobar", this.sheet); if (ab) ab.remove(); }
  }
  next() {
    clearTimeout(this._autoT);
    const f = this._next;
    this._next = null;
    if (this.sheet) { this.sheet.remove(); this.sheet = null; }
    if (this.el) this.el.classList.remove("sheet-up"); // (the answers come back with the sheet gone: they stood back only while it was up)
    if (f) f();
  }
  clearSheet() {
    clearTimeout(this._autoT);
    if (this.el) this.el.classList.remove("sheet-up");
    if (this.sheet) this.sheet.remove();
    this.sheet = null;
    this._next = null;
  }
}

// Shared run bookkeeping for the quiz games.
function masterySnapshot(sel) {
  const out = {};
  sel.chapters.forEach((n) => { const c = CH(n); out[n] = Store.masteryOf(c.qids.concat(c.fids)); });
  return out;
}

class RunStats {
  constructor(sel) {
    this.sel = sel;
    this.answered = 0;
    this.correct = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.missed = [];
    this.start = masterySnapshot(sel);
    this.t0 = Date.now();
    this.xp0 = xpTotal();
  }
  // quick: for the action games, how much of the clock was left (0..1).
  record(round, picked, quick) {
    const ok = picked === round.correct;
    Store.record(round.q.id, ok);
    this.answered++;
    if (ok) {
      this.correct++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      Store.state.stats.bestStreak = Math.max(Store.state.stats.bestStreak, this.streak);
    } else {
      this.streak = 0;
      this.missed.push({ id: round.q.id, picked: picked >= 0 ? round.text(picked) : null });
    }
    Store.save();
    if (this.hype) Hype.answer(ok, this.streak, quick);
    Trophies.check();
    return ok;
  }
}

// each game's keys, shown in its pause menu on a computer (a mouse and a keyboard: .keys, style.css; a phone has none)
const GAME_KEYS = {
  blaster: "1-4 OR A-D ANSWER · ENTER NEXT · P OR ESC PAUSE",
  boss: "1-4 OR A-D ANSWER · ENTER NEXT · P OR ESC PAUSE",
  racer: "\u2190 \u2192 LANE · ENTER, SPACE OR \u2191 BOOST · 1-4 OR A-D ANSWER · P OR ESC PAUSE",
  memory: "SPACE OR F FLIP · 1 AGAIN · 2 GOOD · 3 EASY · P OR ESC PAUSE",
  exam: "1-4 OR A-D ANSWER · \u2190 \u2192 QUESTION · ENTER NEXT · P OR ESC PAUSE",
};
function pauseMenu(game) {
  const keys = GAME_KEYS[game.gameId];
  const el = UI.el(`<div class="modal"><div class="dialog" style="--c:${COLORS.cyan}" role="dialog" aria-modal="true" aria-label="Paused">
    <h2>PAUSED</h2>
    <button class="btn" data-act="resume" style="--c:${COLORS.lime}">${icon("play")} RESUME</button>
    <button class="btn ghost" data-act="restart">RESTART</button>
    <button class="btn ghost" data-act="mute">${icon(Store.settings.sfx || Store.settings.music ? "note" : "mute")} <span>${Store.settings.sfx || Store.settings.music ? "SOUND ON" : "SOUND OFF"}</span></button>
    <button class="btn ghost" data-act="quit">QUIT TO ARCADE</button>${keys ? `<p class="keys">KEYS · ${keys}</p>` : ""}</div></div>`);
  UI.openModal({
    el,
    on: (a, t) => {
      if (a === "mute") { const now = toggleMute(); t.innerHTML = `${icon(now ? "note" : "mute")} <span>${now ? "SOUND ON" : "SOUND OFF"}</span>`; return; } // (the menu stays up: sound is a switch, not a way out)
      UI.closeModal();
      if (a === "resume") game.resume();
      if (a === "restart") game.restart();
      if (a === "quit") game.quit();
    },
    key: (e) => { if (e.key === "Escape" || e.key === "p" || e.key === "P") { UI.closeModal(); game.resume(); } else UI.arrowNav(e, el, ".btn"); },
    mounted: () => $("[data-act=resume]", el).focus(),
  });
}

// Three taps on the title show or hide the frame-rate readout (frames a second, the slowest frame, triangles, draw
// calls, the size of the picture) for this visit. Nothing is saved: the switch in Settings is.
const Perf = {
  taps: [],
  tap() {
    const now = performance.now();
    this.taps = this.taps.filter((t) => now - t < 1000); // (three taps inside a second)
    this.taps.push(now);
    if (this.taps.length < 3) return;
    this.taps = [];
    const el = $("#fps");
    el.hidden = !el.hidden;
    Sound.sfx("blip");
  },
};
