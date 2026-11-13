// Course content (built from arcade/content/*.json) and the arcade's own lore.
const DATA = window.INR_DATA || { chapters: [] };

const SECTIONS = [
  { n: 1, title: "Basics of Insurance", chapters: [1, 2, 3, 4, 5], color: COLORS.cyan },
  { n: 2, title: "Retirement Planning and Management", chapters: [6, 7], color: COLORS.yellow },
  { n: 3, title: "Basics of Estate Planning", chapters: [8, 9, 10], color: COLORS.magenta },
  { n: 4, title: "Introduction to Family Law", chapters: [11], color: COLORS.lime },
];
const CHAPTER_TITLES = {
  1: "Introduction: Risk and Insurance in Financial Planning",
  2: "The Concept of Risk",
  3: "The Insurance Industry",
  4: "Insurance as a Contract",
  5: "Group Insurance and Government Programs",
  6: "Retirement Planning",
  7: "Retirement Management",
  8: "Intestacy or Dying Without a Will",
  9: "Wills and Powers of Attorney",
  10: "Probate and Forms of Property Ownership/Transfer",
  11: "Family Law",
};

// Every chapter exists in the arcade even if its content file is missing.
const CHAPTERS = [];
for (let n = 1; n <= 11; n++) {
  const src = DATA.chapters.find((c) => c.n === n);
  const ch = Object.assign({ n, title: CHAPTER_TITLES[n], objectives: [], guide: [], tips: [], flashcards: [], questions: [] }, src || {});
  ch.section = SECTIONS.find((s) => s.chapters.includes(n));
  ch.color = ch.section.color;
  ch.questions.forEach((q) => (q.ch = n));
  ch.flashcards.forEach((f) => (f.ch = n));
  ch.qids = ch.questions.map((q) => q.id);
  ch.fids = ch.flashcards.map((f) => f.id);
  CHAPTERS.push(ch);
}
const CH = (n) => CHAPTERS[n - 1];
const Q_BY_ID = new Map();
const F_BY_ID = new Map();
CHAPTERS.forEach((c) => {
  c.questions.forEach((q) => Q_BY_ID.set(q.id, q));
  c.flashcards.forEach((f) => F_BY_ID.set(f.id, f));
});
const ALL_QIDS = CHAPTERS.flatMap((c) => c.qids);
const ALL_FIDS = CHAPTERS.flatMap((c) => c.fids);
const ALL_TIPS = CHAPTERS.flatMap((c) => c.tips.map((t) => ({ t, ch: c.n })));

// One boss per chapter, plus the final boss for the all-chapters run.
const BOSSES = {
  1: { name: "PRODUCT PUSHER", line: "Why plan when you can just BUY?", color: COLORS.cyan, shape: "box", hp: 90 },
  2: { name: "PERIL PRIME", line: "Hazards feed me. Perils ARE me.", color: COLORS.red, shape: "ico", hp: 100 },
  3: { name: "SOLVENCY SPECTER", line: "Your insurer's capital is... evaporating.", color: COLORS.violet, shape: "octa", hp: 100 },
  4: { name: "THE FINE PRINT", line: "Read the contract? Nobody reads the contract.", color: COLORS.yellow, shape: "dodeca", hp: 110 },
  5: { name: "GROUP GOLEM", line: "Your benefits end when your job does.", color: COLORS.orange, shape: "box", hp: 100 },
  6: { name: "INFLATION TITAN", line: "I eat three percent of your savings a year.", color: COLORS.gold, shape: "knot", hp: 120 },
  7: { name: "LONGEVITY LICH", line: "You will outlive your money. I will see to it.", color: COLORS.lime, shape: "ico", hp: 110 },
  8: { name: "LORD INTESTATE", line: "No will? Then the law decides. I AM the law.", color: COLORS.magenta, shape: "octa", hp: 100 },
  9: { name: "UNDUE INFLUENCER", line: "Sign here. Trust me. Sign HERE.", color: COLORS.cyan, shape: "dodeca", hp: 120 },
  10: { name: "PROBATRON", line: "Every estate pays my toll.", color: COLORS.orange, shape: "knot", hp: 110 },
  11: { name: "PATRIMONY PHANTOM", line: "Half of everything. Partition is coming.", color: COLORS.violet, shape: "ico", hp: 100 },
  all: { name: "THE EXAMINATOR", line: "Eleven chapters. One of me. No partial credit.", color: COLORS.red, shape: "cyborg", hp: 200 },
};

const CABINETS = [
  { id: "blaster", name: "RISK BLASTER", tag: "Rail shooter", color: COLORS.cyan,
    desc: "A void demon closes in while the clock runs. Shoot the drone that carries the right answer to strike it; a wrong one and it strikes you. Streaks multiply your score.", unit: "pts" },
  { id: "racer", name: "NEST EGG RUN", tag: "Neon lane racer", color: COLORS.yellow,
    desc: "A 40-year career, one gate per year. Steer into the lane with the right answer to compound your savings. Retire at 65 with $1,000,000.", unit: "$" },
  { id: "boss", name: "BOSS RUSH", tag: "Chapter boss fights", color: COLORS.magenta,
    desc: "Each chapter has a boss that only falls to hard questions. Answer fast to hit harder. Clear it with all three hearts for three stars.", unit: "pts" },
  { id: "memory", name: "MEMORY BANK", tag: "Spaced-repetition flashcards", color: COLORS.lime,
    desc: "Flip key terms, rules and numbers. Missed cards come back sooner, known cards later, until every one is banked.", unit: "cards" },
  { id: "exam", name: "FINAL EXAM", tag: "Mock exam · 60% to pass", color: COLORS.violet,
    desc: "The final boss: a timed mixed exam across all 11 chapters, with no hints until you submit. Score 60% and it falls.", unit: "%" },
  { id: "guide", name: "STRATEGY GUIDE", tag: "Chapter notes", color: COLORS.orange,
    desc: "Condensed notes, learning objectives and exam tips for every chapter, plus a search across every term in the book.", unit: "" },
];
const CAB = (id) => CABINETS.find((c) => c.id === id);

// A play selection: which chapters a run draws from.
function makeSelection(key) {
  if (key === "all") return { key, label: "ALL STAGES", chapters: CHAPTERS.map((c) => c.n) };
  if (key === "weak") return { key, label: "WEAK SPOTS", chapters: CHAPTERS.map((c) => c.n), weak: true };
  const n = +key;
  return { key: String(n), label: "STAGE " + n, chapters: [n] };
}
function weakIds(ids) {
  return ids.filter((id) => {
    const it = Store.item(id);
    return it && (it[0] === 1 || (it[1] >= 2 && it[2] / it[1] < 0.6));
  });
}
function selectionQids(sel) {
  const ids = sel.chapters.flatMap((n) => CH(n).qids);
  return sel.weak ? weakIds(ids) : ids;
}
function selectionFids(sel) {
  const ids = sel.chapters.flatMap((n) => CH(n).fids);
  return sel.weak ? weakIds(ids) : ids;
}

// Picks the next question for a run: spaced-repetition priority, never a repeat
// from the last few turns, optionally preferring hard questions (bosses).
class QuestionPicker {
  constructor(ids, { preferHard = false } = {}) {
    this.ids = ids.slice();
    this.recent = [];
    this.preferHard = preferHard;
    this.keep = Math.min(12, Math.max(0, Math.floor(this.ids.length * 0.6)));
  }
  next() {
    if (!this.ids.length) return null;
    const now = nowMin();
    const recent = new Set(this.recent);
    let best = null, bestP = -Infinity;
    for (const id of this.ids) {
      let p = Store.priority(id, now, recent);
      if (this.preferHard) p += (Q_BY_ID.get(id).difficulty || 1) * 9;
      if (p > bestP) { bestP = p; best = id; }
    }
    this.recent.push(best);
    if (this.recent.length > this.keep) this.recent.shift();
    return Q_BY_ID.get(best);
  }
}

// A question as shown on screen: option order is shuffled (true/false stays put).
class Round {
  constructor(q) {
    this.q = q;
    this.tf = q.type === "tf";
    this.order = this.tf ? [0, 1] : shuffle(q.options.map((_, i) => i));
    this.correct = this.order.indexOf(q.answer);
    this.labels = this.tf ? ["T", "F"] : SLOT_KEYS.slice(0, this.order.length);
  }
  text(i) { return this.q.options[this.order[i]]; }
  get n() { return this.order.length; }
  get correctText() { return this.text(this.correct); }
  get chars() { return this.q.q.length + this.q.options.join("").length; }
}

// Seconds allowed for a question, from its reading load and the pace setting.
function readTime(round, mult = 1) {
  const pace = { relaxed: 1.6, normal: 1, turbo: 0.7 }[Store.settings.pace] || 1;
  return clamp(10 + round.chars / 15, 14, 52) * pace * mult;
}
