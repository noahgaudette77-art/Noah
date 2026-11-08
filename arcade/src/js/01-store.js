// Progress, scores and settings. Saved to localStorage (batched, see save()); when the page
// runs as a claude.ai artifact with the `db` capability, also synced to the
// viewer's private data/users/<id>/progress document so it follows them across devices.
const STORE_KEY = "inr-arcade-v1";
const GAMES = ["blaster", "racer", "boss", "memory", "exam"];

const freshState = () => ({
  v: 1,
  items: {}, // id -> [box, seen, correct, lastSeenMinute]
  scores: { blaster: [], racer: [], boss: [], memory: [], exam: [] },
  boss: {}, // chapter -> best stars
  read: {}, // chapter -> 1 once its notes were opened
  met: {}, // chapter -> 1 once its client briefing was shown
  stats: { answered: 0, correct: 0, bestStreak: 0, cards: 0, games: 0, exams: 0, bestExam: 0 },
  settings: { sfx: true, music: true, crt: true, pixel: "hd", pace: "normal", explain: "smart", initials: "AAA", gfx2: true, fps: false },
  updated: 0,
});

function mergeStates(a, b) {
  const out = freshState();
  const ia = (a && a.items) || {}, ib = (b && b.items) || {};
  for (const id of new Set([...Object.keys(ia), ...Object.keys(ib)])) {
    const x = ia[id], y = ib[id];
    out.items[id] = !x ? y : !y ? x : y[3] > x[3] || (y[3] === x[3] && y[1] > x[1]) ? y : x;
  }
  for (const g of GAMES) {
    const seen = new Set();
    out.scores[g] = [...((a && a.scores && a.scores[g]) || []), ...((b && b.scores && b.scores[g]) || [])]
      .filter((r) => {
        const k = r.n + "|" + r.s + "|" + r.t;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .sort((p, q) => q.s - p.s)
      .slice(0, 10);
  }
  for (const src of [a, b]) {
    if (!src) continue;
    for (const [ch, s] of Object.entries(src.boss || {})) out.boss[ch] = Math.max(out.boss[ch] || 0, s);
    for (const ch of Object.keys(src.read || {})) out.read[ch] = 1;
    for (const ch of Object.keys(src.met || {})) out.met[ch] = 1;
    for (const [k, v] of Object.entries(src.stats || {})) if (typeof v === "number") out.stats[k] = Math.max(out.stats[k] || 0, v);
  }
  const newer = (b && b.updated) > (a && a.updated) ? b : a;
  out.settings = Object.assign(freshState().settings, (a && a.settings) || {}, (newer && newer.settings) || {});
  out.updated = Math.max((a && a.updated) || 0, (b && b.updated) || 0);
  return out;
}

// Spaced repetition (Leitner boxes).
// box 0 = new, 1 = missed / learning, 2..5 = answered right that many spaced times.
// Moving up from box b needs at least GAP_MIN[b] minutes since the item was last seen,
// so cramming the same card twice in a row does not count as mastering it.
const GAP_MIN = [0, 0, 5, 360, 2880, 10080];
const LEVEL_PTS = [0, 0, 1, 2, 3, 3]; // mastery points by box (max 3)

const Store = {
  state: freshState(),
  remote: null,
  _timer: 0,
  _writing: false,
  _again: false,
  listeners: [],

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) this.state = mergeStates(freshState(), JSON.parse(raw));
    } catch (e) { /* private mode or blocked storage: play without saving */ }
    // The HD renderer replaced the old pixel modes: move the old default onto it once.
    const st = this.state.settings;
    if (!st.gfx2) { if (st.pixel === "retro" || st.pixel === "sharp") st.pixel = "hd"; st.gfx2 = true; }
  },
  get settings() { return this.state.settings; },
  // Writing the whole state takes a few milliseconds on a phone, and saves come
  // right as an answer lands, when the hit effects need every frame. So saves are
  // batched: written in the browser's next idle moment (within ~2 s), and at once
  // when the page is hidden or closed (see flush()).
  save() {
    this.state.updated = Date.now();
    this._dirty = true;
    if (!this._saveT) {
      const run = () => { this._saveT = 0; this.flush(); };
      this._saveT = window.requestIdleCallback ? requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 1200);
      this._idle = !!window.requestIdleCallback;
    }
    this.scheduleRemote();
  },
  flush() {
    if (this._saveT) {
      if (this._idle) cancelIdleCallback(this._saveT); else clearTimeout(this._saveT);
      this._saveT = 0;
    }
    if (!this._dirty) return;
    this._dirty = false;
    this._json = JSON.stringify(this.state);
    this._jsonAt = this.state.updated;
    try { localStorage.setItem(STORE_KEY, this._json); } catch (e) { /* ignore */ }
  },
  onChange(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((f) => f !== fn); };
  },

  // --- spaced repetition --------------------------------------------------
  item(id) { return this.state.items[id]; },
  box(id) { const it = this.state.items[id]; return it ? it[0] : 0; },
  record(id, correct) {
    const it = (this.state.items[id] || [0, 0, 0, 0]).slice();
    const now = nowMin();
    const elapsed = now - it[3];
    if (correct) {
      if (it[0] < 2) it[0] = 2;
      else if (it[0] < 5 && elapsed >= GAP_MIN[it[0]]) it[0]++;
      it[2]++;
    } else {
      it[0] = 1;
    }
    it[1]++;
    it[3] = now;
    this.state.items[id] = it;
    if (!id.includes("-f")) {
      this.state.stats.answered++;
      if (correct) this.state.stats.correct++;
    } else {
      this.state.stats.cards++;
    }
  },
  // "I already know this" from the flashcards: jump to box 3 without waiting.
  markEasy(id) {
    const it = (this.state.items[id] || [0, 0, 0, 0]).slice();
    it[0] = Math.max(it[0], 3);
    it[1]++; it[2]++; it[3] = nowMin();
    this.state.items[id] = it;
    this.state.stats.cards++;
  },
  // Higher = ask sooner. `recent` holds ids shown in the last few turns.
  priority(id, now, recent) {
    if (recent && recent.has(id)) return -1000 + Math.random();
    const it = this.state.items[id];
    if (!it) return 60 + Math.random() * 20;
    const [box, , , last] = it;
    const el = now - last;
    if (box <= 1) return el >= 1 ? 100 + Math.random() * 10 : 8 + Math.random();
    if (el >= GAP_MIN[box]) return 82 - box * 8 + Math.random() * 10;
    return 22 - box * 3 + Math.random() * 8 + Math.min(8, (el / Math.max(1, GAP_MIN[box])) * 8);
  },
  masteryOf(ids) {
    if (!ids.length) return 0;
    let s = 0;
    for (const id of ids) s += LEVEL_PTS[this.box(id)];
    return s / (ids.length * 3);
  },
  countMastered(ids) { return ids.filter((id) => this.box(id) >= 4).length; },
  countSeen(ids) { return ids.filter((id) => this.state.items[id]).length; },

  // --- scores ----------------------------------------------------------------
  qualifies(game, score) {
    const list = this.state.scores[game] || [];
    return score > 0 && (list.length < 10 || score > list[list.length - 1].s);
  },
  addScore(game, entry) {
    const list = (this.state.scores[game] = this.state.scores[game] || []);
    const rec = Object.assign({ t: Date.now() }, entry);
    list.push(rec);
    list.sort((a, b) => b.s - a.s);
    list.length = Math.min(list.length, 10);
    this.save();
    return list.indexOf(rec);
  },
  best(game) { const l = this.state.scores[game]; return l && l.length ? l[0].s : 0; },

  reset() {
    const settings = this.state.settings;
    this.state = freshState();
    this.state.settings = settings;
    this.save();
  },

  // --- artifact sync (optional) ------------------------------------------------
  async connectRemote() {
    const c = window.claude;
    if (!c || typeof c.use !== "function") return;
    try {
      const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      const ref = db.doc("data/users/" + uid + "/progress");
      const snap = await Promise.race([ref.get(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 10000))]);
      const before = JSON.stringify(this.state.items).length;
      if (snap && snap.exists) {
        const remote = snap.data();
        if (remote && remote.state) this.state = mergeStates(this.state, JSON.parse(remote.state));
        try { localStorage.setItem(STORE_KEY, JSON.stringify(this.state)); } catch (e) { /* ignore */ }
      }
      this.remote = { ref };
      this.listeners.forEach((fn) => fn("sync"));
      if (!snap || !snap.exists || JSON.stringify(this.state.items).length !== before) this.scheduleRemote(500);
      UI.toast("PROGRESS SYNCED TO YOUR ACCOUNT");
    } catch (e) {
      this.remote = null; // stay local-only for this visit
    }
  },
  scheduleRemote(ms = 4000) {
    if (!this.remote) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flushRemote(), ms);
  },
  async flushRemote() {
    if (!this.remote) return;
    if (this._writing) { this._again = true; return; }
    this._writing = true;
    try {
      this.flush(); // serializes only if something changed since the last local save
      const json = this._json && this._jsonAt === this.state.updated ? this._json : JSON.stringify(this.state);
      await this.remote.ref.set({ state: json, updated: this.state.updated });
    } catch (e) {
      const code = e && e.code;
      if (code === "unavailable") this._again = true;
      else this.remote = null; // not allowed to write here (view-only, revoked…): keep local
    }
    this._writing = false;
    if (this._again) { this._again = false; this.scheduleRemote(6000); }
  },
};
