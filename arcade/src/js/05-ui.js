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
    document.addEventListener("keydown", (e) => {
      Sound.init();
      if (e.target && e.target.tagName === "INPUT" && e.key !== "Escape") return;
      if (this.modal) { if (this.modal.key) this.modal.key(e); return; }
      if (this.cur && this.cur.key) this.cur.key(e);
    });
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
  banner(text, color = COLORS.yellow, sub = "") {
    Sound.say(text);
    const b = this.el(`<div class="banner" style="--c:${color}">${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ""}</div>`);
    this.root.appendChild(b);
    setTimeout(() => b.remove(), 1400);
  },
  floater(text, x, y, color = COLORS.yellow) {
    const f = this.el(`<div class="floater" style="--c:${color};left:${x}px;top:${y}px">${esc(text)}</div>`);
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
  confirm({ title, text = "", yes = "YES", no = "CANCEL", color = COLORS.magenta, onYes, onNo }) {
    const el = this.el(`<div class="modal"><div class="dialog" style="--c:${color}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ""}
      <button class="btn" data-act="yes" style="--c:${color}">${esc(yes)}</button>
      <button class="btn ghost" data-act="no">${esc(no)}</button></div></div>`);
    this.openModal({
      el,
      on: (a) => { this.closeModal(); if (a === "yes") onYes && onYes(); else onNo && onNo(); },
      key: (e) => {
        if (e.key === "Escape") { this.closeModal(); onNo && onNo(); }
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
  UI.toast(on ? "SOUND OFF" : "SOUND ON");
  return !on;
}

// The question panel + answer buttons + explanation sheet shared by the games.
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
      <div class="verdict">${esc(title)}</div>
      ${ok ? "" : `<div class="answer"><b>ANSWER ${r.labels[r.correct]} ·</b> ${esc(r.correctText)}</div>`}
      <div class="explain selectable">${esc(q.explain)}</div>
      <div class="row" style="justify-content:space-between;align-items:center">
        <span class="ref">BOOK P. ${esc(q.page || "")} · ${esc(q.topic || "")}</span>
        <button class="btn small" data-act="next" style="--c:${c}">${esc(nextLabel)} ${icon("play")}</button>
      </div>
      ${auto ? `<div class="autobar"><i></i></div>` : ""}</div>`);
    this.el.appendChild(el);
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
    if (f) f();
  }
  clearSheet() {
    clearTimeout(this._autoT);
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

function pauseMenu(game) {
  const el = UI.el(`<div class="modal"><div class="dialog" style="--c:${COLORS.cyan}" role="dialog" aria-modal="true" aria-label="Paused">
    <h2>PAUSED</h2>
    <button class="btn" data-act="resume" style="--c:${COLORS.lime}">${icon("play")} RESUME</button>
    <button class="btn ghost" data-act="restart">RESTART</button>
    <button class="btn ghost" data-act="quit">QUIT TO ARCADE</button></div></div>`);
  UI.openModal({
    el,
    on: (a) => {
      UI.closeModal();
      if (a === "resume") game.resume();
      if (a === "restart") game.restart();
      if (a === "quit") game.quit();
    },
    key: (e) => { if (e.key === "Escape" || e.key === "p" || e.key === "P") { UI.closeModal(); game.resume(); } },
    mounted: () => $("[data-act=resume]", el).focus(),
  });
}

// Three taps on the title show or hide the frame-rate readout (frames a second, the slowest frame, triangles, draw
// calls, the quality level, the size of the picture) for this visit. Nothing is saved: the switch in Settings is.
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
