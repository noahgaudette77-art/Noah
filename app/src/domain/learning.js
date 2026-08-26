/**
 * The learning engine: mastery, spaced repetition, scoring, progression.
 *
 * Design principle: the score has to be hard to game, or it is worthless as
 * feedback. Points come from demonstrated recall over time and from reasoning
 * questions, not from opening pages. Mastery decays if it is not revisited,
 * because that is what actually happens to knowledge.
 */

import { CONCEPTS, CONCEPT_BY_ID, DOMAINS } from "../content/concepts.js";

/* --- Progression --------------------------------------------------------- */

/** Cumulative XP required to reach a level. Superlinear, so late levels earn. */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(90 * Math.pow(level - 1, 1.62));
}

export function levelFromXp(xp) {
  let level = 1;
  while (level < 60 && xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  return {
    level,
    rank: rankFor(level),
    xp,
    into: xp - floor,
    span: Math.max(1, ceiling - floor),
    progress: Math.min(1, (xp - floor) / Math.max(1, ceiling - floor)),
    nextAt: ceiling,
  };
}

/** Deliberately sober titles. This is professional development, not a game show. */
const RANKS = [
  [1, "Observer"],
  [3, "Analyst I"],
  [6, "Analyst II"],
  [10, "Market Analyst"],
  [14, "Macro Analyst"],
  [18, "Senior Analyst"],
  [22, "Strategist"],
  [25, "Economic Strategist"],
  [30, "Portfolio Strategist"],
  [35, "Chief Strategist"],
  [40, "Global Macro"],
  [45, "Principal"],
  [50, "Global Intelligence"],
  [55, "Distinguished"],
];

export function rankFor(level) {
  let name = RANKS[0][1];
  for (const [threshold, title] of RANKS) if (level >= threshold) name = title;
  return name;
}

export const XP = {
  briefRead: 8,
  lessonRead: 45,
  conceptViewed: 4,          // small: looking is not learning
  conceptExplained: 6,       // reading a deeper level than your default
  answerCorrect: 14,
  answerCorrectHard: 26,
  answerWrong: 3,            // a wrong answer you learn from still counts for something
  scenarioRun: 10,
  challengeCompleted: 30,
  quizPerfect: 60,
  streakDay: 5,
};

/* --- Mastery and spaced repetition -------------------------------------- */

const DAY = 86_400_000;

export function emptyMastery() {
  return { seen: 0, correct: 0, wrong: 0, ease: 2.3, interval: 0, due: 0, last: 0, streak: 0 };
}

/**
 * A simplified SM-2. Interval growth is capped at 120 days: this material is
 * about a changing world, so "learned forever" is not an available state.
 */
export function reviewConcept(record, correct, { hard = false } = {}) {
  const next = { ...emptyMastery(), ...record };
  next.seen += 1;
  next.last = Date.now();

  if (correct) {
    next.correct += 1;
    next.streak += 1;
    next.ease = clamp(next.ease + (hard ? 0.12 : 0.05), 1.3, 2.8);
    next.interval = next.interval === 0 ? 1 : next.interval === 1 ? 4 :
      Math.min(120, Math.round(next.interval * next.ease));
  } else {
    next.wrong += 1;
    next.streak = 0;
    next.ease = clamp(next.ease - 0.22, 1.3, 2.8);
    next.interval = 1;
  }
  next.due = next.last + next.interval * DAY;
  return next;
}

/**
 * Mastery 0–1. Accuracy is the base; recency decays it; a single correct answer
 * cannot produce high mastery because `seen` gates the ceiling.
 */
export function masteryLevel(record) {
  if (!record || !record.seen) return 0;
  const accuracy = record.correct / record.seen;
  const exposure = 1 - Math.exp(-record.seen / 3.2);     // saturates around 6–8 reviews
  const daysSince = (Date.now() - (record.last || 0)) / DAY;
  const halfLife = Math.max(7, record.interval || 7);
  const retention = Math.pow(0.5, daysSince / (halfLife * 2.2));
  return clamp(accuracy * exposure * (0.55 + 0.45 * retention), 0, 1);
}

export function isDue(record) {
  if (!record || !record.seen) return false;
  return Date.now() >= (record.due || 0);
}

/* --- Scores -------------------------------------------------------------- */

/**
 * Domain score 0–100. Coverage matters as much as depth: knowing three things
 * perfectly out of twenty is not knowing the domain.
 */
export function domainScore(masteryMap, domainId) {
  const concepts = CONCEPTS.filter((c) => c.domain === domainId);
  if (!concepts.length) return { score: 0, covered: 0, total: 0, depth: 0 };
  let sum = 0, covered = 0;
  for (const concept of concepts) {
    const level = masteryLevel(masteryMap[concept.id]);
    sum += level;
    if (level > 0.15) covered += 1;
  }
  const depth = sum / concepts.length;
  const coverage = covered / concepts.length;
  return {
    score: Math.round(100 * (0.62 * depth + 0.38 * coverage)),
    covered, total: concepts.length,
    depth: Math.round(depth * 100),
  };
}

/**
 * The headline Global Knowledge Score, 0–100.
 * Four components, so no single behaviour can move it much on its own:
 *   depth        average mastery across everything touched
 *   breadth      how many domains are genuinely represented
 *   retention    whether mastery survives between reviews
 *   reasoning    scenario and chain questions, which test transfer, not recall
 */
export function globalScore(learning) {
  const mastery = learning?.mastery || {};
  const domains = DOMAINS.map((d) => ({ ...d, ...domainScore(mastery, d.id) }))
    .filter((d) => d.total > 0);

  const depth = mean(domains.map((d) => d.score)) / 100;
  const represented = domains.filter((d) => d.score >= 20).length;
  const breadth = domains.length ? represented / domains.length : 0;

  const records = Object.values(mastery).filter((r) => r.seen > 0);
  const retention = records.length
    ? mean(records.map((r) => (r.interval >= 4 ? 1 : r.interval / 4)))
    : 0;

  const reasoning = clamp((learning?.reasoning?.correct || 0) /
    Math.max(6, learning?.reasoning?.seen || 6), 0, 1);

  const score = Math.round(100 * (0.4 * depth + 0.22 * breadth + 0.16 * retention + 0.22 * reasoning));
  return {
    score, domains,
    components: {
      depth: Math.round(depth * 100),
      breadth: Math.round(breadth * 100),
      retention: Math.round(retention * 100),
      reasoning: Math.round(reasoning * 100),
    },
    conceptsTouched: records.length,
    conceptsTotal: CONCEPTS.length,
  };
}

/**
 * Knowledge gaps: what to study next, and why. Ranked by a combination of how
 * weak the area is, how central the concept is, and whether it is overdue.
 */
export function knowledgeGaps(learning, limit = 6) {
  const mastery = learning?.mastery || {};
  const domains = DOMAINS.map((d) => ({ ...d, ...domainScore(mastery, d.id) }))
    .filter((d) => d.total > 0)
    .sort((a, b) => a.score - b.score);

  const weakestDomains = domains.slice(0, 3).map((d) => d.id);

  const candidates = CONCEPTS.map((concept) => {
    const record = mastery[concept.id];
    const level = masteryLevel(record);
    const centrality = (concept.related || []).length;
    const overdue = isDue(record) ? 1 : 0;
    const untouched = !record || !record.seen;
    const priority =
      (1 - level) * 1.0 +
      (weakestDomains.includes(concept.domain) ? 0.55 : 0) +
      Math.min(centrality, 6) * 0.06 +
      overdue * 0.5 +
      (untouched ? 0.2 : 0);
    return {
      concept, level, priority, overdue: Boolean(overdue), untouched,
      reason: untouched
        ? "Not yet studied"
        : overdue
          ? "Due for review — retention decays without it"
          : level < 0.35
            ? "Answered inconsistently"
            : "Reinforces a weak area",
    };
  })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);

  return { domains, weakestDomains, next: candidates };
}

/** Concepts scheduled for review today. */
export function dueForReview(learning, limit = 12) {
  const mastery = learning?.mastery || {};
  return Object.entries(mastery)
    .filter(([id, record]) => CONCEPT_BY_ID.has(id) && isDue(record))
    .sort((a, b) => (a[1].due || 0) - (b[1].due || 0))
    .slice(0, limit)
    .map(([id, record]) => ({ concept: CONCEPT_BY_ID.get(id), record, level: masteryLevel(record) }));
}

/* --- Streaks and badges --------------------------------------------------- */

export function recordActivity(learning) {
  const today = new Date().toISOString().slice(0, 10);
  const days = [...(learning.days || [])];
  if (days[days.length - 1] === today) return { ...learning, lastActive: Date.now() };

  const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
  const streak = days[days.length - 1] === yesterday ? (learning.streak || 0) + 1 : 1;
  days.push(today);

  return {
    ...learning,
    days: days.slice(-400),
    streak,
    bestStreak: Math.max(streak, learning.bestStreak || 0),
    lastActive: Date.now(),
    xp: (learning.xp || 0) + XP.streakDay,
  };
}

export const BADGES = [
  { id: "first-week", label: "First Week", test: (l) => (l.streak || 0) >= 7,
    note: "Seven consecutive days." },
  { id: "month", label: "Thirty Days", test: (l) => (l.bestStreak || 0) >= 30,
    note: "A month without a gap." },
  { id: "historian", label: "Historian", test: (l) => (l.lessonsRead || []).length >= 5,
    note: "Five historical briefs completed." },
  { id: "full-archive", label: "Archivist", test: (l) => (l.lessonsRead || []).length >= 14,
    note: "Every lesson in the corpus." },
  { id: "chain-thinker", label: "Chain Thinker", test: (l) => (l.reasoning?.correct || 0) >= 20,
    note: "Twenty scenario questions answered correctly." },
  { id: "breadth", label: "Generalist",
    test: (l) => globalScore(l).components.breadth >= 70,
    note: "Meaningful coverage across most domains." },
  { id: "depth", label: "Specialist",
    test: (l) => globalScore(l).domains.some((d) => d.score >= 75),
    note: "A domain score above 75." },
  { id: "century", label: "Century", test: (l) => Object.keys(l.mastery || {}).length >= 40,
    note: "Forty concepts under active review." },
];

export function earnedBadges(learning) {
  return BADGES.filter((badge) => {
    try { return badge.test(learning); } catch { return false; }
  });
}

/* --- helpers ------------------------------------------------------------- */
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
