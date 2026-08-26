/**
 * Quiz generation.
 *
 * Two sources. The authored bank tests misconceptions. The generated questions
 * are derived from the world model, which means the supply is effectively
 * unbounded and — critically — every generated question has a correct answer
 * that is checkable against an authored edge rather than invented. Nothing here
 * asks a language model to make up a question and grade its own answer.
 *
 * Generation is seeded, so a given week produces the same quiz on every device.
 */

import { QUESTIONS, questionsForConcept } from "../content/questions.js";
import { CONCEPTS, CONCEPT_BY_ID } from "../content/concepts.js";
import { NODES, node, outEdges, label, EDGES } from "./worldmodel.js";
import { propagate } from "./propagate.js";
import { masteryLevel, isDue } from "./learning.js";

/* --- seeded RNG ---------------------------------------------------------- */
export function rng(seed) {
  let a = typeof seed === "string" ? hash(seed) : seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (next, list) => list[Math.floor(next() * list.length)];

function shuffle(next, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle options while keeping track of where the answer moved. */
function shuffleOptions(next, options, answerIndex) {
  const tagged = options.map((text, index) => ({ text, correct: index === answerIndex }));
  const mixed = shuffle(next, tagged);
  return { options: mixed.map((o) => o.text), answer: mixed.findIndex((o) => o.correct) };
}

/* --- Generated: transmission direction ---------------------------------- */

const SHOCKABLE = NODES.filter((n) => outEdges(n.id).length >= 2 &&
  ["macro", "rate", "inflation", "policy", "commodity", "fx", "market", "tech", "risk", "structural"].includes(n.kind));

function transmissionQuestion(next) {
  const source = pick(next, SHOCKABLE);
  const edges = outEdges(source.id).filter((e) => e.confidence !== "low");
  if (!edges.length) return null;
  const edge = pick(next, edges);
  const target = node(edge.to);
  const rising = next() > 0.35;
  const trueDirection = rising ? edge.sign : -edge.sign;

  const raw = [
    `${target.label} is pushed higher`,
    `${target.label} is pushed lower`,
    "There is no direct transmission between them",
    "The direction depends entirely on the policy response",
  ];
  const answerIndex = trueDirection > 0 ? 0 : 1;
  const mixed = shuffleOptions(next, raw, answerIndex);

  return {
    id: `gen-tx-${source.id}-${edge.to}-${rising ? "u" : "d"}`,
    generated: true, type: "mc", kind: "transmission", difficulty: 2,
    concept: CONCEPTS.find((c) => c.node === source.id)?.id || null,
    nodes: [source.id, edge.to],
    prompt: `${source.label} ${rising ? "rises" : "falls"} materially. Holding everything else constant, what does the primary transmission channel imply for ${target.label}?`,
    options: mixed.options, answer: mixed.answer,
    why: `${edge.why} The relationship is ${edge.sign > 0 ? "same-direction" : "inverse"}, normally visible within about ${edge.lag} month${edge.lag === 1 ? "" : "s"}, and the model rates the evidence for it ${edge.confidence}.`,
  };
}

/* --- Generated: which is most directly affected -------------------------- */

function mostAffectedQuestion(next) {
  const source = pick(next, SHOCKABLE);
  const direct = outEdges(source.id);
  if (direct.length < 1) return null;
  const correct = pick(next, direct);

  const reachable = new Set([source.id]);
  for (const edge of direct) {
    reachable.add(edge.to);
    for (const second of outEdges(edge.to)) reachable.add(second.to);
  }
  const distractors = shuffle(next, NODES.filter((n) => !reachable.has(n.id) && n.kind !== "structural")).slice(0, 3);
  if (distractors.length < 3) return null;

  const raw = [node(correct.to).label, ...distractors.map((d) => d.label)];
  const mixed = shuffleOptions(next, raw, 0);

  return {
    id: `gen-ma-${source.id}-${correct.to}`,
    generated: true, type: "mc", kind: "linkage", difficulty: 2,
    nodes: [source.id, correct.to],
    prompt: `Which of these does a move in ${source.label} affect most directly?`,
    options: mixed.options, answer: mixed.answer,
    why: `${node(correct.to).label}: ${correct.why} The others have no direct or second-hop channel from ${source.label} in the model.`,
  };
}

/* --- Generated: order of effect ------------------------------------------ */

function orderQuestion(next) {
  const source = pick(next, SHOCKABLE);
  const result = propagate([{ id: source.id, magnitude: 1 }], { maxDepth: 4 });
  const first = result.effects.filter((e) => e.order === 1);
  const later = result.effects.filter((e) => e.order >= 3);
  if (first.length < 3 || later.length < 1) return null;

  const correct = pick(next, later);
  const wrong = shuffle(next, first).slice(0, 3);
  const raw = [correct.node.label, ...wrong.map((w) => w.node.label)];
  const mixed = shuffleOptions(next, raw, 0);

  return {
    id: `gen-ord-${source.id}-${correct.id}`,
    generated: true, type: "mc", kind: "order", difficulty: 3,
    nodes: [source.id, correct.id],
    prompt: `${source.label} moves sharply. Which of these is a higher-order consequence — reached only through a chain of intermediate steps — rather than a direct one?`,
    options: mixed.options, answer: mixed.answer,
    why: `${correct.node.label} sits ${correct.order} steps from ${source.label} via: ${chainText(correct.paths[0])}. The other three are directly connected, so they move first and more reliably.`,
  };
}

/* --- Generated: chain ordering ------------------------------------------- */

function chainQuestion(next) {
  const source = pick(next, SHOCKABLE);
  const result = propagate([{ id: source.id, magnitude: 1 }], { maxDepth: 4 });
  const deep = result.effects.filter((e) => e.order >= 3 && e.paths[0]?.edges.length >= 3);
  if (!deep.length) return null;
  const target = pick(next, deep);
  const trueChain = [source.label, ...target.paths[0].edges.map((e) => label(e.to))];

  const scrambles = [];
  for (let attempt = 0; attempt < 12 && scrambles.length < 3; attempt++) {
    const middle = shuffle(next, trueChain.slice(1, -1));
    const candidate = [trueChain[0], ...middle, trueChain[trueChain.length - 1]];
    const text = candidate.join(" → ");
    if (text === trueChain.join(" → ") || scrambles.includes(text)) continue;
    if (isRealChain(candidate)) continue;   // never offer a second correct answer
    scrambles.push(text);
  }
  if (scrambles.length < 3) return null;

  const mixed = shuffleOptions(next, [trueChain.join(" → "), ...scrambles], 0);
  return {
    id: `gen-ch-${source.id}-${target.id}`,
    generated: true, type: "mc", kind: "chain", difficulty: 3,
    nodes: [source.id, target.id],
    prompt: `Which sequence correctly orders the transmission from ${source.label} to ${target.node.label}?`,
    options: mixed.options, answer: mixed.answer,
    why: `Each step is a documented channel: ${target.paths[0].edges.map((e) => `${label(e.from)} → ${label(e.to)} (${e.why.replace(/\.$/, "")})`).join("; ")}.`,
  };
}

/** A scramble is only a valid distractor if it is not itself a real chain. */
const EDGE_KEYS = new Set(EDGES.map((edge) => `${edge.from}>${edge.to}`));
const LABEL_TO_ID = new Map(NODES.map((n) => [n.label, n.id]));

function isRealChain(labels) {
  for (let i = 0; i < labels.length - 1; i++) {
    const from = LABEL_TO_ID.get(labels[i]);
    const to = LABEL_TO_ID.get(labels[i + 1]);
    if (!from || !to || !EDGE_KEYS.has(`${from}>${to}`)) return false;
  }
  return true;
}

const chainText = (path) =>
  path ? [label(path.edges[0].from), ...path.edges.map((e) => label(e.to))].join(" → ") : "";

const GENERATORS = [
  transmissionQuestion, transmissionQuestion,   // weighted: the core skill
  mostAffectedQuestion, orderQuestion, chainQuestion,
];

export function generateOne(seed) {
  const next = rng(seed);
  for (let attempt = 0; attempt < 24; attempt++) {
    const question = pick(next, GENERATORS)(next);
    if (question) return question;
  }
  return null;
}

/* --- Quiz assembly ------------------------------------------------------- */

/**
 * Weight authored questions toward what the reader is weak on or owes a review,
 * so the quiz is a study session rather than a random sample.
 */
function weightedAuthored(next, mastery, count) {
  const scored = QUESTIONS.map((question) => {
    const record = mastery[question.concept];
    const level = masteryLevel(record);
    const due = isDue(record) ? 0.8 : 0;
    const untouched = !record?.seen ? 0.35 : 0;
    return { question, weight: (1 - level) + due + untouched + next() * 0.55 };
  }).sort((a, b) => b.weight - a.weight);

  const chosen = [];
  const usedConcepts = new Set();
  for (const entry of scored) {
    if (chosen.length >= count) break;
    if (usedConcepts.has(entry.question.concept) && chosen.length < count - 2) continue;
    usedConcepts.add(entry.question.concept);
    chosen.push(entry.question);
  }
  return chosen;
}

export function generateQuiz({ seed = String(Date.now()), count = 10, mastery = {} } = {}) {
  const next = rng(seed);
  const authoredCount = Math.max(3, Math.round(count * 0.55));
  const authored = weightedAuthored(next, mastery, authoredCount);

  const generated = [];
  const seen = new Set();
  for (let i = 0; generated.length < count - authored.length && i < 60; i++) {
    const question = generateOne(`${seed}:${i}`);
    if (question && !seen.has(question.id)) { seen.add(question.id); generated.push(question); }
  }

  return {
    seed,
    questions: shuffle(next, [...authored, ...generated]).slice(0, count),
    composition: { authored: authored.length, generated: generated.length },
  };
}

/* --- Free-response challenge --------------------------------------------- */

/**
 * "CHALLENGE ME": the reader writes what they think happens, and their answer is
 * scored against the model's enumerated consequences by matching node labels and
 * a small synonym set. Deliberately generous on wording and strict on coverage —
 * the point is to surface the chains they did not consider, not to mark spelling.
 */
const SYNONYMS = {
  policy_rate: ["fed", "policy rate", "interest rate", "rates", "central bank"],
  headline_inflation: ["inflation", "cpi", "prices"],
  core_inflation: ["core inflation", "core cpi", "core pce"],
  consumer_spending: ["consumer", "spending", "consumption", "demand"],
  unemployment: ["unemployment", "jobs", "layoffs", "labour market", "labor market"],
  sp500: ["s&p", "sp500", "equities", "stocks", "stock market"],
  usd: ["dollar", "usd", "greenback"],
  oil: ["oil", "crude", "wti", "brent"],
  natgas: ["natural gas", "gas", "lng"],
  gold: ["gold", "bullion"],
  credit_spreads: ["credit spreads", "spreads", "credit"],
  ust10y: ["10-year", "ten year", "long yields", "treasury yields", "bond yields"],
  power_demand: ["electricity", "power demand", "load", "energy demand"],
  grid_capacity: ["grid", "transmission", "interconnection"],
  semis: ["semiconductors", "chips", "semis"],
  accelerators: ["gpu", "gpus", "accelerators"],
  data_center_buildout: ["data centre", "data center", "datacentre", "datacenter"],
  utilities: ["utilities", "power companies"],
  airlines: ["airlines", "air travel", "aviation"],
  banks: ["banks", "banking", "lenders"],
  gdp: ["gdp", "growth", "output", "economy"],
  housing_activity: ["housing", "home sales", "construction", "starts"],
  mortgage_rate: ["mortgage", "mortgages"],
  copper: ["copper"],
  volatility: ["volatility", "vix"],
  nuclear_power: ["nuclear", "reactors"],
};

function mentions(text, effectNode) {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9&\s]/g, " ").replace(/\s+/g, " ")} `;
  const needles = [
    effectNode.label.toLowerCase(),
    ...(SYNONYMS[effectNode.id] || []),
  ];
  return needles.some((needle) => haystack.includes(` ${needle} `) || haystack.includes(` ${needle}s `));
}

export function evaluateFreeResponse(text, shockId, { magnitude = 1, top = 12 } = {}) {
  const result = propagate([{ id: shockId, magnitude }], { maxDepth: 4 });
  const considered = result.effects.slice(0, top);

  const found = [], missed = [];
  for (const effect of considered) {
    (mentions(text, effect.node) ? found : missed).push(effect);
  }

  const weightOf = (effect) => effect.magnitude * (effect.order === 1 ? 1 : effect.order === 2 ? 1.3 : 1.6);
  const total = considered.reduce((sum, e) => sum + weightOf(e), 0) || 1;
  const captured = found.reduce((sum, e) => sum + weightOf(e), 0);

  const deepest = found.length ? Math.max(...found.map((e) => e.order)) : 0;
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  return {
    shock: node(shockId),
    score: Math.round(100 * (captured / total)),
    found, missed,
    deepestOrder: deepest,
    wordCount: words,
    notes: buildNotes(found, missed, deepest, words),
    all: considered,
  };
}

function buildNotes(found, missed, deepest, words) {
  const notes = [];
  if (words < 15) {
    notes.push({ tone: "warn", text: "A short answer is hard to assess. Name the specific variables you expect to move and in which direction." });
  }
  if (deepest <= 1 && found.length) {
    notes.push({ tone: "warn", text: "Everything you named is a first-order effect. First-order effects are consensus and usually already priced — the useful work starts one step further out." });
  }
  if (deepest >= 3) {
    notes.push({ tone: "good", text: "You reached a third-order consequence. That is where analysis stops being consensus." });
  }
  const contested = found.filter((e) => e.contested);
  if (contested.length) {
    notes.push({
      tone: "good",
      text: `You named ${contested.map((e) => e.node.label).join(" and ")}, where independent chains push in opposite directions — the net sign is genuinely ambiguous, and saying so is the correct answer.`,
    });
  }
  const bigMiss = missed.filter((e) => e.order <= 2).slice(0, 2);
  if (bigMiss.length) {
    notes.push({
      tone: "warn",
      text: `You did not mention ${bigMiss.map((e) => e.node.label).join(" or ")}, which the model reaches in ${bigMiss[0].order} step${bigMiss[0].order === 1 ? "" : "s"}.`,
    });
  }
  if (!found.length) {
    notes.push({ tone: "warn", text: "No modelled consequence was recognised in your answer. Try naming concrete variables — an index, a rate, a commodity, a sector." });
  }
  return notes;
}

/** A scenario prompt for the challenge, seeded so it is stable for a session. */
export function challengePrompt(seed = String(Date.now())) {
  const next = rng(seed);
  const source = pick(next, SHOCKABLE.filter((n) => outEdges(n.id).length >= 3));
  const rising = next() > 0.4;
  return {
    nodeId: source.id,
    node: source,
    magnitude: rising ? 1 : -1,
    prompt: `${source.label} ${rising ? "rises" : "falls"} sharply and the move persists for two quarters. Work through what follows: which variables move, in which direction, and through what mechanism? Push past the obvious first step.`,
    hint: `${source.blurb}`,
  };
}

export { CONCEPT_BY_ID, questionsForConcept };
