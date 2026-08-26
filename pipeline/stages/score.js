/**
 * Importance scoring — "does this actually matter?"
 *
 * The interesting component is `consequence`: the world model already knows how
 * far a given variable propagates, so a release touching the policy rate
 * outranks a routine enforcement action for a structural reason rather than
 * because someone weighted a keyword. The pipeline and the interface share the
 * same model, so a ranking can always be explained by pointing at the graph.
 *
 * Every component is returned alongside the total. A score that cannot be
 * decomposed is a black box, and a black box has no business ranking anything.
 */

import { degree, node } from "../../app/src/domain/worldmodel.js";
import { propagate } from "../../app/src/domain/propagate.js";
import { baseCredibility } from "../../app/src/content/sources.js";

const TOPIC_WEIGHT = {
  monetary: 1.0, economy: 0.86, banking: 0.7, policy: 0.6,
  payments: 0.4, commentary: 0.35,
};

/**
 * What kind of document this is. A decision is not a speech about a decision,
 * and without this the newest speech outranks the actual statement.
 */
const KIND_WEIGHT = {
  decision: 1.0, release: 0.82, filing: 0.7, data: 0.7, speech: 0.5, research: 0.55,
};

/** Titles that mark an actual policy action rather than commentary on one. */
const DECISION_PATTERN =
  /\b(fomc statement|maintains the (?:policy|target)|holds? (?:the )?(?:policy|target) rate|raises? (?:the )?(?:policy|target)|lowers? (?:the )?(?:policy|target)|cuts? (?:the )?rate|rate decision|implementation note|maintains policy rate|increases? the target range|decision on the (?:policy|target))\b/i;

const HALF_LIFE_HOURS = 40;
const reachCache = new Map();

/** How much of the world a node touches, measured once and reused. */
function reach(nodeId) {
  if (reachCache.has(nodeId)) return reachCache.get(nodeId);
  let value = 0;
  if (node(nodeId)) {
    const result = propagate([{ id: nodeId, magnitude: 1 }], { maxDepth: 3, threshold: 0.02 });
    const spread = result.effects.reduce((sum, effect) => sum + effect.magnitude, 0);
    value = Math.min(1, (spread / 4) * 0.7 + Math.min(degree(nodeId), 14) / 14 * 0.3);
  }
  reachCache.set(nodeId, value);
  return value;
}

export function scoreCluster(cluster, { now = Date.now() } = {}) {
  const tiers = cluster.items.map((item) => item.tier ?? 4);
  const credibility = baseCredibility(Math.min(...tiers));

  const stamps = cluster.items.map((item) => Date.parse(item.publishedAt || "")).filter(Number.isFinite);
  const newest = stamps.length ? Math.max(...stamps) : now - 7 * 86_400_000;
  const ageHours = Math.max(0, (now - newest) / 3.6e6);
  const recency = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);

  const independent = new Set(cluster.sources).size;
  const corroboration = Math.min(1, 0.45 + 0.2 * (independent - 1) + 0.06 * (cluster.size - 1));

  const consequence = cluster.nodes.length
    ? Math.max(...cluster.nodes.map((entry) => reach(entry.nodeId)))
    : 0.12;

  const topic = Math.max(0.3, ...(cluster.topics.length
    ? cluster.topics.map((name) => TOPIC_WEIGHT[name] ?? 0.5)
    : [0.5]));

  const isDecision = cluster.items.some((item) => DECISION_PATTERN.test(item.title));
  const kind = isDecision
    ? KIND_WEIGHT.decision
    : Math.max(...cluster.items.map((item) => KIND_WEIGHT[item.kind] ?? 0.6));

  const specificity = Math.min(1, cluster.nodes.length / 3);

  const components = {
    credibility: round(credibility),
    recency: round(recency),
    corroboration: round(corroboration),
    consequence: round(consequence),
    topic: round(topic),
    specificity: round(specificity),
    kind: round(kind),
  };

  const score = round(
    0.17 * credibility +
    0.19 * recency +
    0.12 * corroboration +
    0.25 * consequence +
    0.08 * topic +
    0.05 * specificity +
    0.14 * kind
  );

  return { ...cluster, score, components, ageHours: round(ageHours), isDecision };
}

export function rank(clusters, options = {}) {
  return clusters
    .map((cluster) => scoreCluster(cluster, options))
    .sort((a, b) => b.score - a.score)
    .map((cluster, index) => ({ ...cluster, rank: index + 1 }));
}

/** Plain-language justification, so a ranking is never unexplained. */
export function explainScore(cluster) {
  const parts = [];
  const c = cluster.components;
  if (c.credibility >= 0.9) parts.push("primary source");
  else if (c.credibility >= 0.7) parts.push("reliable secondary source");
  if (cluster.isDecision) parts.push("a policy decision rather than commentary");
  parts.push(ageWords(cluster.ageHours));
  if (cluster.sources.length > 1) parts.push(`${cluster.sources.length} independent sources`);
  if (c.consequence >= 0.6) {
    const top = cluster.nodes[0]?.nodeId;
    parts.push(`touches ${node(top)?.label || "a central variable"}, which propagates widely in the model`);
  } else if (c.consequence <= 0.25) {
    parts.push("limited onward transmission");
  }
  return parts.length ? `Ranked on: ${parts.join("; ")}.` : "Ranked on recency and source reliability.";
}

function ageWords(hours) {
  if (hours <= 24) return "published in the last day";
  if (hours <= 72) return "a few days old";
  if (hours <= 24 * 14) return `about ${Math.round(hours / 24)} days old`;
  if (hours <= 24 * 60) return `about ${Math.round(hours / 24 / 7)} weeks old`;
  return `about ${Math.round(hours / 24 / 30.4)} months old`;
}

const round = (value) => Number(value.toFixed(3));
