/**
 * "What most people are missing" — derived, and honest about the heuristic.
 *
 * The reasoning: markets price first-order effects almost immediately, because
 * they are obvious and everyone sees the same headline. What survives longer as
 * an edge is a consequence that is well-evidenced but arrives through several
 * steps and over a long horizon, because attention does not stretch that far.
 *
 * That is a heuristic, not a law, and the interface says so. It is also
 * falsifiable in the right way: it names specific nodes, so a reader can check
 * whether the chain is actually underappreciated or merely slow.
 */

import { propagate, salience } from "./propagate.js";
import { node as findNode } from "./worldmodel.js";

const CONFIDENCE_WEIGHT = { high: 1, moderate: 0.62, low: 0.25 };

/**
 * @returns {Array} effects scored for how underappreciated they plausibly are:
 *          deep in the chain, slow to arrive, and still well-evidenced.
 */
export function underappreciated(seedIds, { limit = 8, magnitude = 1 } = {}) {
  const seeds = seedIds.filter((id) => findNode(id)).map((id) => ({ id, magnitude }));
  if (!seeds.length) return [];

  const result = propagate(seeds, { maxDepth: 4 });

  return result.effects
    .filter((effect) => effect.order >= 2 && effect.confidence !== "low")
    .map((effect) => {
      const depth = Math.min(effect.order, 4) / 4;                 // further out, less watched
      const horizon = Math.min(effect.lagMonths, 48) / 48;         // slower, less priced
      const evidence = CONFIDENCE_WEIGHT[effect.confidence] ?? 0.3;
      const magnitudeTerm = Math.min(effect.magnitude / 0.4, 1);

      return {
        ...effect,
        neglect: Number((0.34 * depth + 0.3 * horizon + 0.22 * evidence + 0.14 * magnitudeTerm).toFixed(3)),
        because: reason(effect),
      };
    })
    .sort((a, b) => b.neglect - a.neglect)
    .slice(0, limit);
}

function reason(effect) {
  const parts = [];
  parts.push(`${effect.order} steps from the shock`);
  if (effect.lagMonths >= 24) parts.push(`roughly ${Math.round(effect.lagMonths / 12)} years of cumulative lag`);
  else if (effect.lagMonths >= 6) parts.push(`${effect.lagMonths} months of cumulative lag`);
  if (effect.confidence === "high") parts.push("well-evidenced at every link");
  if (effect.pathCount > 1) parts.push(`${effect.pathCount} independent routes reach it`);
  if (effect.contested) parts.push("though independent chains disagree on the sign");
  return parts.join(", ");
}

/**
 * The first-order effects, listed explicitly as the consensus. Naming what is
 * already priced is half the point: an insight is only an insight relative to
 * something, and most "contrarian" claims are first-order effects in costume.
 */
export function alreadyPriced(seedIds, { limit = 6, magnitude = 1 } = {}) {
  const seeds = seedIds.filter((id) => findNode(id)).map((id) => ({ id, magnitude }));
  if (!seeds.length) return [];
  return propagate(seeds, { maxDepth: 2 }).effects
    .filter((effect) => effect.order === 1)
    .sort((a, b) => salience(b) - salience(a))
    .slice(0, limit);
}

/**
 * Where the model itself is least sure. A contested node — one where independent
 * chains push in opposite directions — is the most honest kind of "nobody knows",
 * and it is exactly where an argument is worth having.
 */
export function contestedEffects(seedIds, { magnitude = 1 } = {}) {
  const seeds = seedIds.filter((id) => findNode(id)).map((id) => ({ id, magnitude }));
  if (!seeds.length) return [];
  return propagate(seeds, { maxDepth: 4 }).effects
    .filter((effect) => effect.contested)
    .sort((a, b) => b.magnitude - a.magnitude);
}

/** The seeds a week's material actually touched, ranked by how far they reach. */
export function seedsFromClusters(clusters, limit = 4) {
  const counts = new Map();
  for (const cluster of clusters || []) {
    for (const entry of cluster.nodes || []) {
      const id = entry.nodeId || entry.id;
      counts.set(id, (counts.get(id) || 0) + (cluster.score || 0.5));
    }
  }
  return [...counts.entries()]
    .filter(([id]) => findNode(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}
