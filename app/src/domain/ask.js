/**
 * ASK — a deterministic query interface over the platform's own knowledge.
 *
 * There is no language model here and nothing is generated. A question is
 * matched to an intent, entities are resolved against the corpora, and the
 * answer is assembled from authored content and the engines that already exist:
 * the world model, the concept corpus, the lessons, the debates, the
 * fundamentals, the current stream.
 *
 * The consequence is a system that cannot hallucinate and also cannot bluff. If
 * nothing matches, it says so and shows what it can actually answer — which is
 * more useful than a confident paragraph about something it does not know.
 */

import { CONCEPTS, LEVELS } from "../content/concepts.js";
import { LESSONS, lessonsForNode, lessonsForConcept } from "../content/lessons.js";
import { debatesForNode, debatesForConcept } from "../content/debates.js";
import { NODES, node as findNode, findPaths, search as searchNodes } from "./worldmodel.js";
import { propagate, salience } from "./propagate.js";
import { underappreciated, alreadyPriced, seedsFromClusters } from "./contrarian.js";
import { exposedCompanies } from "./company.js";
import { knowledgeGaps } from "./learning.js";
import { allProgress } from "./curriculum.js";

/* --- Intent patterns ----------------------------------------------------- */

const INTENTS = [
  { id: "connect", weight: 6,
    patterns: [
      /(?:how|what) (?:does|do) (.+?) (?:affect|impact|influence|relate to|connect to) (.+)/i,
      /connect (.+?) (?:to|and|with) (.+)/i,
      /(?:what|how) (?:does|do) (.+?) have to do with (.+)/i,
      /link between (.+?) and (.+)/i,
      /from (.+?) to (.+)/i,
      /(.+?)\s*(?:→|->)\s*(.+)/i,
    ],
    arity: 2 },

  { id: "simulate", weight: 5,
    patterns: [
      /what (?:happens|would happen) if (.+)/i,
      /what if (.+)/i,
      /simulate (.+)/i,
      /(?:consequences|effects|implications) of (.+)/i,
      /and then what (?:for|about) (.+)/i,
    ] },

  { id: "exposed", weight: 5,
    patterns: [
      /who(?:'s| is)? (?:exposed|affected)(?: to| by)? (.+)/i,
      /which companies (?:are affected by|benefit from|are exposed to|would suffer from) (.+)/i,
      /(?:winners|losers) (?:from|of) (.+)/i,
      /who (?:benefits|gains|wins|loses|suffers)(?: from| if)? (.+)/i,
    ] },

  { id: "history", weight: 4,
    patterns: [
      /what happened last time (?:with )?(.+)/i,
      /(?:historical|history) (?:precedent|parallel|example)s? (?:for|of) (.+)/i,
      /has (.+?) happened before/i,
      /connect (.+?) to history/i,
    ] },

  { id: "challenge", weight: 4,
    patterns: [
      /challenge (?:my |the )?(?:thinking|thesis|view|assumption)s? (?:about|on) (.+)/i,
      /(?:strongest )?argument against (.+)/i,
      /what if (?:the )?consensus (?:on|about) (.+?) is wrong/i,
      /(?:the )?(?:bear|other) case (?:for|on) (.+)/i,
      /(?:what|who) disagrees about (.+)/i,
    ] },

  { id: "explain", weight: 3,
    patterns: [
      /(?:explain|teach me(?: about)?|what(?:'s| is| are)|define|tell me about) (.+)/i,
      /how (?:does|do) (.+?) work/i,
      /(?:i don't understand|help me understand) (.+)/i,
    ] },

  { id: "matters", weight: 3,
    patterns: [
      /why (?:does|do|is|are) (.+?) (?:matter|important|significant)/i,
      /so what(?: about)? (.+)/i,
      /why (?:should i care about|care about) (.+)/i,
    ] },

  { id: "missing", weight: 8,
    patterns: [
      /what am i missing/i,
      /what(?:'s| is) (?:everyone|the market|most people) missing/i,
      /what(?:'s| is) underappreciated/i,
      /what should i be watching/i,
    ], arity: 0 },

  { id: "learn", weight: 8,
    patterns: [
      /what should i learn(?: next)?/i,
      /where should i start/i,
      /what(?:'s| is) my weakest (?:area|subject)/i,
      /what do i not know/i,
    ], arity: 0 },

  { id: "now", weight: 8,
    patterns: [
      /what(?:'s| is| has) happen(?:ed|ing)(?: this week| today| now| lately)?/i,
      /what(?:'s| is) important(?: right now| today| this week)?/i,
      /brief me/i,
      /catch me up/i,
      /what do i need to know/i,
    ], arity: 0 },
];

/* --- Entity resolution --------------------------------------------------- */

/**
 * How people actually refer to these things. Without this the router fails on
 * "the Fed" and "stocks", which is most of how anyone would phrase a question.
 */
const ALIASES = {
  fed: "policy_rate", "the fed": "policy_rate", "federal reserve": "policy_rate",
  fomc: "policy_rate", rates: "policy_rate", "interest rates": "policy_rate",
  "rate cuts": "policy_rate", "rate hikes": "policy_rate",
  boc: "boc_rate", "bank of canada": "boc_rate", ecb: "ecb_rate",
  stocks: "sp500", equities: "sp500", "the market": "sp500", "stock market": "sp500",
  "s&p": "sp500", spx: "sp500", nasdaq: "nasdaq",
  bonds: "ust10y", "the curve": "yield_curve", "yield curve": "yield_curve",
  treasuries: "ust10y", "10 year": "ust10y", "10-year": "ust10y",
  ai: "ai_capability", "artificial intelligence": "ai_capability",
  "ai buildout": "ai_capex", "ai build-out": "ai_capex", "ai spending": "ai_capex",
  "ai capex": "ai_capex", "data centres": "data_center_buildout", "data centers": "data_center_buildout",
  chips: "semis", semiconductors: "semis", gpus: "accelerators", gpu: "accelerators",
  power: "power_demand", electricity: "power_demand", "the grid": "grid_capacity",
  grid: "grid_capacity", nuclear: "nuclear_power",
  "credit event": "financial_instability", "a credit event": "financial_instability",
  crisis: "financial_instability", "financial crisis": "financial_instability",
  crash: "volatility", recession: "gdp", "a recession": "gdp",
  inflation: "headline_inflation", cpi: "headline_inflation",
  jobs: "unemployment", employment: "unemployment", "the labour market": "unemployment",
  "the labor market": "unemployment", housing: "housing_activity", mortgages: "mortgage_rate",
  dollar: "usd", "the dollar": "usd", oil: "oil", crude: "oil", gas: "natgas",
  "natural gas": "natgas", gold: "gold", copper: "copper",
  tariffs: "tariffs", "trade war": "tariffs", china: "china_growth",
  taiwan: "taiwan_risk", war: "geopolitical_risk", automation: "labor_automation",
  robots: "robotics", banks: "banks", "the banks": "banks",
};

const DIRECTION_WORDS = new RegExp(
  "\\b(rises?|rise|rising|risen|falls?|fall|falling|fallen|goes? up|goes? down|" +
  "doubles?|halves?|spikes?|collapses?|crashes?|surges?|drops?|jumps?|plunges?|" +
  "cuts?|cutting|hikes?|hiking|raises?|raising|tightens?|tightening|eases?|easing|" +
  "accelerates?|decelerates?|slows?|weakens?|strengthens?|tighten|loosen|" +
  "higher|lower|stronger|weaker|bigger|smaller|more|less|sharply|materially)\\b", "g");

const DOWN_WORDS =
  /\b(falls?|fall|falling|fallen|down|drops?|collapses?|crashes?|halves?|plunges?|cuts?|cutting|eases?|easing|slows?|weakens?|decelerates?|loosen|lower|weaker|smaller|less)\b/i;

/** Last resort: overlap between the question's words and a node or concept's text. */
function tokenMatch(text) {
  const tokens = text.split(/\s+/).filter((word) => word.length > 3);
  if (!tokens.length) return null;
  let best = null;
  const consider = (kind, ref, haystack, base) => {
    const hits = tokens.filter((token) => haystack.includes(token)).length;
    if (!hits) return;
    const score = base + hits * 8 + (hits / tokens.length) * 10;
    if (!best || score > best.score) best = { kind, ref, score };
  };
  for (const node of NODES) consider("node", node, `${node.label} ${node.blurb}`.toLowerCase(), 12);
  for (const concept of CONCEPTS) {
    consider("concept", concept, `${concept.term} ${(concept.tags || []).join(" ")} ${concept.levels.beginner}`.toLowerCase(), 10);
  }
  return best;
}

function resolveEntity(text, { companies = [] } = {}) {
  const query = text.trim().replace(/[?.!]+$/, "").replace(/^(the|a|an)\s+/i, "").trim();
  if (!query) return null;
  const lower = query.toLowerCase();

  // Direction words are part of the phrasing, not the entity.
  const stripped = lower
    .replace(DIRECTION_WORDS, "")
    .replace(/\s+/g, " ").trim();

  const direction = DOWN_WORDS.test(lower) ? -1 : 1;

  const aliasKey = ALIASES[stripped] || ALIASES[lower];
  if (aliasKey && findNode(aliasKey)) {
    return { kind: "node", ref: findNode(aliasKey), score: 110, direction, query };
  }

  const candidates = [];

  for (const node of NODES) {
    const label = node.label.toLowerCase();
    if (label === stripped || label === lower) candidates.push({ kind: "node", ref: node, score: 100 });
    else if (stripped && (label.includes(stripped) || stripped.includes(label))) {
      candidates.push({ kind: "node", ref: node, score: 60 + Math.min(label.length, 20) * 0.4 });
    }
  }

  // A trailing plural is the single most common way a query misses its concept.
  const singular = stripped.replace(/(\w{4,})s\b/g, "$1");

  for (const concept of CONCEPTS) {
    const term = concept.term.toLowerCase();
    const id = concept.id.replace(/-/g, " ");
    if (term === stripped || term === lower || id === stripped || id === singular) {
      candidates.push({ kind: "concept", ref: concept, score: 100 });
    } else if (stripped && (term.includes(stripped) || stripped.includes(term))) {
      candidates.push({ kind: "concept", ref: concept, score: 58 });
    } else if (singular !== stripped && (term.includes(singular) || id.includes(singular))) {
      candidates.push({ kind: "concept", ref: concept, score: 54 });
    }
  }

  for (const company of companies) {
    if (company.ticker.toLowerCase() === stripped) candidates.push({ kind: "company", ref: company, score: 105 });
    else if (stripped.length > 3 && company.name.toLowerCase().includes(stripped)) {
      candidates.push({ kind: "company", ref: company, score: 70 });
    }
  }

  for (const lesson of LESSONS) {
    if (stripped.length > 4 && lesson.title.toLowerCase().includes(stripped)) {
      candidates.push({ kind: "lesson", ref: lesson, score: 50 });
    }
  }

  if (!candidates.length) {
    const fuzzy = searchNodes(stripped || lower, 1);
    if (fuzzy.length) candidates.push({ kind: "node", ref: fuzzy[0], score: 30 });
  }
  if (!candidates.length) {
    const loose = tokenMatch(stripped || lower);
    if (loose) candidates.push(loose);
  }

  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) return null;

  return { ...candidates[0], direction, query };
}

/** The node a resolved entity actually points at, whatever kind it is. */
function nodeFor(entity) {
  if (!entity) return null;
  if (entity.kind === "node") return entity.ref;
  if (entity.kind === "concept") return entity.ref.node ? findNode(entity.ref.node) : null;
  if (entity.kind === "company") return entity.ref.node ? findNode(entity.ref.node) : null;
  if (entity.kind === "lesson") return (entity.ref.nodes || []).map(findNode).find(Boolean) || null;
  return null;
}

/* --- The router ---------------------------------------------------------- */

/**
 * @param {string} question
 * @param {{companies, clusters, learning}} context
 * @returns {{intent, blocks, followUps, unresolved}}
 */
export function ask(question, context = {}) {
  const text = (question || "").trim();
  if (!text) return empty();

  let matched = null;
  for (const intent of [...INTENTS].sort((a, b) => b.weight - a.weight)) {
    for (const pattern of intent.patterns) {
      const hit = pattern.exec(text);
      if (!hit) continue;
      matched = { intent, args: hit.slice(1).filter(Boolean) };
      break;
    }
    if (matched) break;
  }

  // No pattern: treat it as a lookup, which is what a bare noun usually means.
  if (!matched) matched = { intent: INTENTS.find((i) => i.id === "explain"), args: [text] };

  switch (matched.intent.id) {
    case "connect": return answerConnect(matched.args, context, text);
    case "simulate": return answerSimulate(matched.args[0], context, text);
    case "exposed": return answerExposed(matched.args[0], context, text);
    case "history": return answerHistory(matched.args[0], context, text);
    case "challenge": return answerChallenge(matched.args[0], context, text);
    case "matters": return answerMatters(matched.args[0], context, text);
    case "missing": return answerMissing(context, text);
    case "learn": return answerLearn(context, text);
    case "now": return answerNow(context, text);
    default: return answerExplain(matched.args[0], context, text);
  }
}

const empty = () => ({ intent: null, blocks: [], followUps: [], unresolved: true });

function unresolved(term, context, question) {
  return {
    intent: "unresolved", question, unresolved: true,
    blocks: [{
      type: "nothing",
      term,
      note: "Nothing in the corpus matches that. This interface answers from the world model, the concept corpus, the historical lessons, the debates, the covered companies and the current intelligence stream — and says so rather than guessing.",
    }],
    followUps: suggestions(context),
  };
}

function suggestions(context) {
  const seeds = seedsFromClusters(context.clusters || [], 2);
  const seedLabel = seeds.length ? findNode(seeds[0])?.label : "the Fed policy rate";
  return [
    `What happens if ${seedLabel || "Crude Oil"} rises?`,
    "How does AI capital expenditure affect copper?",
    "Explain the yield curve",
    "What am I missing?",
    "What should I learn next?",
    "Challenge my thinking about the AI build-out",
  ];
}

/* --- Answers -------------------------------------------------------------- */

function answerExplain(term, context, question) {
  const entity = resolveEntity(term, context);
  if (!entity) return unresolved(term, context, question);

  const blocks = [];
  const target = nodeFor(entity);

  if (entity.kind === "concept") {
    blocks.push({ type: "concept", concept: entity.ref, levels: LEVELS });
  } else if (entity.kind === "company") {
    blocks.push({ type: "company", company: entity.ref });
  } else if (entity.kind === "lesson") {
    blocks.push({ type: "lesson", lesson: entity.ref });
  }

  if (target) {
    blocks.push({ type: "node", node: target });
    const concepts = CONCEPTS.filter((c) => c.node === target.id);
    if (concepts.length && entity.kind !== "concept") {
      blocks.push({ type: "concepts", concepts, note: `Ideas you need to read ${target.label} properly.` });
    }
  }

  return {
    intent: "explain", question, entity,
    blocks,
    followUps: [
      target && `What happens if ${target.label} rises?`,
      target && `Who is exposed to ${target.label}?`,
      `Why does ${entity.ref.term || entity.ref.label || entity.ref.name} matter?`,
      target && `What happened last time with ${target.label}?`,
    ].filter(Boolean),
  };
}

function answerMatters(term, context, question) {
  const entity = resolveEntity(term, context);
  if (!entity) return unresolved(term, context, question);
  const target = nodeFor(entity);

  const blocks = [];
  if (entity.kind === "concept") {
    blocks.push({ type: "concept", concept: entity.ref, levels: LEVELS, startAt: "intermediate" });
  }
  if (target) {
    const result = propagate([{ id: target.id, magnitude: 1 }], { maxDepth: 3 });
    const effects = [...result.effects].sort((a, b) => salience(b) - salience(a)).slice(0, 8);
    blocks.push({
      type: "effects", seed: target, effects,
      note: `It matters because it reaches ${result.effects.length} other variables in the model. These are the channels, ranked by how much they matter and discounted for distance and evidence.`,
    });
  }
  if (!blocks.length) return unresolved(term, context, question);

  return {
    intent: "matters", question, entity, blocks,
    followUps: [
      target && `What happens if ${target.label} falls?`,
      target && `What am I missing about ${target.label}?`,
      `Explain ${term}`,
    ].filter(Boolean),
  };
}

function answerSimulate(term, context, question) {
  const entity = resolveEntity(term, context);
  const target = nodeFor(entity);
  if (!target) return unresolved(term, context, question);

  const magnitude = entity.direction;
  const result = propagate([{ id: target.id, magnitude }], { maxDepth: 4 });

  return {
    intent: "simulate", question, entity,
    blocks: [
      { type: "simulation", seed: target, magnitude, result },
      { type: "assumptions", assumptions: result.assumptions },
    ],
    followUps: [
      `Who is exposed to ${target.label}?`,
      `What am I missing about ${target.label}?`,
      `What happened last time with ${target.label}?`,
    ],
    action: { label: "Open in the simulator", route: `/simulator?shock=${target.id}&mag=${magnitude}` },
  };
}

function answerConnect(args, context, question) {
  const from = resolveEntity(args[0], context);
  const to = resolveEntity(args[1], context);
  const fromNode = nodeFor(from), toNode = nodeFor(to);
  if (!fromNode || !toNode) return unresolved(args.join(" → "), context, question);
  if (fromNode.id === toNode.id) return unresolved(args[0], context, question);

  const paths = findPaths(fromNode.id, toNode.id, { maxDepth: 7, limit: 4 });
  const reverse = paths.length ? [] : findPaths(toNode.id, fromNode.id, { maxDepth: 7, limit: 1 });

  return {
    intent: "connect", question,
    blocks: [{ type: "paths", from: fromNode, to: toNode, paths, reverse }],
    followUps: [
      `What happens if ${fromNode.label} rises?`,
      `Explain ${toNode.label}`,
    ],
    action: paths.length ? { label: "Open in the world model", route: `/graph?focus=${fromNode.id}` } : null,
  };
}

function answerExposed(term, context, question) {
  const entity = resolveEntity(term, context);
  const target = nodeFor(entity);
  if (!target) return unresolved(term, context, question);

  const companies = context.companies || [];
  const exposed = exposedCompanies(target.id, companies.filter((c) => c.hasFundamentals),
    { magnitude: entity.direction });

  return {
    intent: "exposed", question, entity,
    blocks: exposed.length
      ? [{ type: "exposure", seed: target, direction: entity.direction, exposed: exposed.slice(0, 10),
           note: `Coverage is limited to the ${companies.length} companies attached to a node in the model. This is exposure through the model, not a screen of every affected business — and it carries no price, so it is not a view on the shares.` }]
      : [{ type: "nothing", term: target.label,
           note: companies.length
             ? "No covered company sits downstream of that in the model."
             : "No company fundamentals have been fetched yet — run the pipeline with --fundamentals." }],
    followUps: [`What happens if ${target.label} rises?`, `Explain ${target.label}`],
  };
}

function answerHistory(term, context, question) {
  const entity = resolveEntity(term, context);
  const target = nodeFor(entity);
  const conceptId = entity?.kind === "concept" ? entity.ref.id : null;

  const lessons = [
    ...(target ? lessonsForNode(target.id) : []),
    ...(conceptId ? lessonsForConcept(conceptId) : []),
  ].filter((lesson, index, all) => all.findIndex((l) => l.id === lesson.id) === index);

  if (!lessons.length) return unresolved(term, context, question);

  return {
    intent: "history", question, entity,
    blocks: [{ type: "lessons", lessons, seed: target,
      note: "Precedent, not prediction. Each lesson ends with what connects it to now — which is the reason it is in the corpus." }],
    followUps: [target && `What happens if ${target.label} rises?`, `Explain ${term}`].filter(Boolean),
  };
}

function answerChallenge(term, context, question) {
  const entity = resolveEntity(term, context);
  const target = nodeFor(entity);
  const conceptId = entity?.kind === "concept" ? entity.ref.id : null;

  const debates = [
    ...(target ? debatesForNode(target.id) : []),
    ...(conceptId ? debatesForConcept(conceptId) : []),
  ].filter((entry, index, all) => all.findIndex((d) => d.id === entry.id) === index);

  const blocks = [];
  if (debates.length) blocks.push({ type: "debates", debates });

  if (target) {
    const contested = propagate([{ id: target.id, magnitude: 1 }], { maxDepth: 4 })
      .effects.filter((effect) => effect.contested).slice(0, 6);
    if (contested.length) {
      blocks.push({ type: "contested", seed: target, effects: contested,
        note: "Where independent chains through the model disagree about the sign. That is the most honest kind of \"nobody knows\", and where an argument is worth having." });
    }
  }

  if (!blocks.length) return unresolved(term, context, question);

  return {
    intent: "challenge", question, entity, blocks,
    followUps: ["What am I missing?", target && `What happened last time with ${target.label}?`].filter(Boolean),
  };
}

function answerMissing(context, question) {
  const seeds = seedsFromClusters(context.clusters || [], 3);
  if (!seeds.length) {
    return {
      intent: "missing", question,
      blocks: [{ type: "nothing", term: "the current stream",
        note: "This answer derives from what the week's developments actually touched. Run the pipeline and it fills in." }],
      followUps: suggestions(context),
    };
  }

  return {
    intent: "missing", question,
    blocks: [
      { type: "priced", effects: alreadyPriced(seeds, { limit: 5 }), seeds: seeds.map(findNode),
        note: "First-order effects of this week's material — obvious, and therefore consensus." },
      { type: "underappreciated", effects: underappreciated(seeds, { limit: 7 }),
        note: "Well-evidenced consequences that arrive through several steps over a long horizon, and are therefore less watched. A heuristic, not a law." },
    ],
    followUps: ["What should I learn next?", "Brief me"],
    action: { label: "Open the contrarian view", route: "/debates" },
  };
}

function answerLearn(context, question) {
  const learning = context.learning || {};
  const gaps = knowledgeGaps(learning, 5);
  const tracks = allProgress(learning).slice(0, 3);

  return {
    intent: "learn", question,
    blocks: [
      { type: "next-steps", tracks,
        note: "Ordered paths. Most of these ideas only make sense once another is in place, so sequence beats picking the weakest thing." },
      { type: "gaps", gaps: gaps.next, domains: gaps.domains,
        note: "Your weakest areas, ranked by how weak, how central and how overdue." },
    ],
    followUps: ["What am I missing?", "Explain the yield curve"],
    action: { label: "Open the curriculum", route: "/curriculum" },
  };
}

function answerNow(context, question) {
  const clusters = (context.clusters || []).slice(0, 6);
  if (!clusters.length) {
    return {
      intent: "now", question,
      blocks: [{ type: "nothing", term: "the intelligence stream",
        note: "The pipeline has not produced a stream yet. Everything else — the model, the corpus, the lessons — works without it." }],
      followUps: suggestions(context),
    };
  }

  const seeds = seedsFromClusters(clusters, 2);
  return {
    intent: "now", question,
    blocks: [
      { type: "stream", clusters,
        note: "Ranked by source tier, recency, corroboration and how far the subject propagates in the model." },
      seeds.length && { type: "effects", seed: findNode(seeds[0]),
        effects: [...propagate([{ id: seeds[0], magnitude: 1 }], { maxDepth: 3 }).effects]
          .sort((a, b) => salience(b) - salience(a)).slice(0, 6),
        note: `What follows, in the model, if ${findNode(seeds[0])?.label} moves.` },
    ].filter(Boolean),
    followUps: ["What am I missing?", "What should I learn next?"],
    action: { label: "Open the daily brief", route: "/daily" },
  };
}

export const EXAMPLE_QUESTIONS = [
  { text: "What happens if oil rises?", intent: "Simulation" },
  { text: "How does AI capital expenditure affect copper?", intent: "Connect two variables" },
  { text: "Explain the yield curve", intent: "Concept, four depths" },
  { text: "Why does the term premium matter?", intent: "Consequences" },
  { text: "Who is exposed to electricity demand?", intent: "Companies" },
  { text: "What happened last time with a credit event?", intent: "Historical precedent" },
  { text: "Challenge my thinking about the AI build-out", intent: "The case against" },
  { text: "What am I missing?", intent: "Underappreciated effects" },
  { text: "What should I learn next?", intent: "Curriculum" },
  { text: "Brief me", intent: "This week" },
];
