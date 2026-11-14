// TROPHIES: goals that unlock as you play. Each is worked out from saved progress, so
// they agree across synced devices; two need the game that just ended (o).
const TROPHIES = [
  { id: "first", name: "FIRST COIN", how: "Finish your first game", test: (s) => s.stats.games >= 1 },
  { id: "streak5", name: "HOT HAND", how: "5 right answers in a row", test: (s) => s.stats.bestStreak >= 5 },
  { id: "streak10", name: "BLUE CHIP", how: "10 right answers in a row", test: (s) => s.stats.bestStreak >= 10 },
  { id: "streak20", name: "THE MACHINE", how: "20 right answers in a row", test: (s) => s.stats.bestStreak >= 20 },
  { id: "ans100", name: "CENTURION", how: "Answer 100 questions", test: (s) => s.stats.answered >= 100 },
  { id: "ans500", name: "VETERAN", how: "Answer 500 questions", test: (s) => s.stats.answered >= 500 },
  { id: "cards50", name: "CARD SHARK", how: "Review 50 flashcards", test: (s) => s.stats.cards >= 50 },
  { id: "boss1", name: "GIANT SLAYER", how: "Beat a boss", test: (s) => Object.values(s.boss).some((v) => v > 0) },
  { id: "boss6", name: "BOSS HUNTER", how: "Beat 6 bosses", test: (s) => Object.values(s.boss).filter((v) => v > 0).length >= 6 },
  { id: "boss12", name: "LAST ONE STANDING", how: "Beat all 12 bosses", test: (s) => Object.values(s.boss).filter((v) => v > 0).length >= 12 },
  { id: "flawless", name: "FLAWLESS", how: "Earn 3 stars on a boss", test: (s) => Object.values(s.boss).some((v) => v >= 3) },
  { id: "wave5", name: "DEEP SPACE", how: "Reach wave 5 in Risk Blaster", test: (s, o) => !!o && o.game === "blaster" && (o.tiles || []).some((t) => t.k === "WAVE" && t.v >= 5) },
  { id: "million", name: "MILLIONAIRE", how: "Retire with $1,000,000", test: (s, o) => (!!o && o.game === "racer" && o.score >= 1e6) || (s.scores.racer || []).some((r) => r.s >= 1e6) },
  { id: "exam60", name: "PASSED", how: "Pass a mock exam (60%)", test: (s) => (s.stats.bestExam || 0) >= 60 },
  { id: "exam90", name: "HONOURS", how: "Score 90% on a mock exam", test: (s) => (s.stats.bestExam || 0) >= 90 },
  { id: "reader", name: "BOOKWORM", how: "Open the notes of all 11 stages", test: (s) => Object.keys(s.read).length >= 11 },
];

const Trophies = {
  queue: [],
  showing: false,
  has(id) { return !!(Store.state.ach || {})[id]; },
  count() { return TROPHIES.filter((t) => this.has(t.id)).length; },
  // o: the results of the game that just ended, when there is one.
  check(o) {
    const s = Store.state, got = s.ach || (s.ach = {});
    const fresh = [];
    for (const t of TROPHIES) {
      if (got[t.id]) continue;
      let ok = false;
      try { ok = !!t.test(s, o); } catch (e) { ok = false; }
      if (ok) { got[t.id] = Date.now(); fresh.push(t); }
    }
    if (!fresh.length) return;
    Store.save();
    // a first visit with old progress can earn several at once: one card for the lot
    if (fresh.length > 2) this.queue.push({ name: fresh.length + " TROPHIES", how: "See them all under STATS" });
    else this.queue.push(...fresh);
    this.pump();
  },
  pump() {
    if (this.showing || !this.queue.length) return;
    const t = this.queue.shift();
    this.showing = true;
    const el = document.body.appendChild(UI.el(`<div class="trophy" role="status"><span class="ic">${icon(PIXELS["t_" + t.id] ? "t_" + t.id : "star", COLORS.yellow)}</span><span class="tx"><small>TROPHY UNLOCKED</small><b>${esc(t.name)}</b><i>${esc(t.how)}</i></span></div>`));
    Sound.sfx("trophy");
    Sound.say("Trophy unlocked");
    Haptics.buzz([20, 30, 20, 30, 70]);
    setTimeout(() => { el.remove(); this.showing = false; this.pump(); }, 3400);
  },
  // The grid on the STATS screen: earned ones lit, the rest dim with how to earn them.
  html() {
    return `<div class="trophies">${TROPHIES.map((t) => {
      const on = this.has(t.id);
      return `<div class="tr${on ? " on" : ""}"><span class="ic">${icon(PIXELS["t_" + t.id] ? "t_" + t.id : "star", on ? COLORS.yellow : "#8d82c8")}</span><span><b>${esc(t.name)}</b><small>${esc(t.how)}</small></span>${on ? "" : `<span class="lk">${icon("lock", "#8d82c8")}</span>`}</div>`;
    }).join("")}</div>`;
  },
};
