/**
 * Shock propagation across the world model.
 *
 * The honest framing, which the UI repeats wherever this output appears:
 * this is a structured way to enumerate consequences and rank them by
 * plausibility. It is not a forecast, and the numbers are relative, not
 * quantitative predictions of magnitude.
 *
 * Method
 *   Impact at a node is the sum over every path reaching it of
 *       seed × Π(sign × strength) × damping^(hops − 1)
 *   Damping below 1 encodes something real: each additional link multiplies the
 *   ways the chain can fail. Without it, long speculative chains would outrank
 *   short well-evidenced ones purely by accumulating terms.
 *
 *   Confidence at a node is the weakest link on its strongest path, stepped
 *   down once more for every hop beyond the second.
 */

import { outEdges, node, weakest, CONFIDENCE_SCORE } from "./worldmodel.js";

const DEFAULTS = {
  maxDepth: 4,
  damping: 0.72,
  threshold: 0.012,   // below this a contribution is noise, not signal
  maxPathsPerNode: 3,
};

const STEP_DOWN = { high: "moderate", moderate: "low", low: "low" };

function degrade(level, hops) {
  let current = level;
  for (let i = 2; i < hops; i++) current = STEP_DOWN[current];
  return current;
}

/**
 * @param {Array<{id: string, magnitude: number}>} seeds  magnitude is a relative
 *        move, conventionally −1 … +1 where 1 means "a large move in this node"
 * @returns {{effects: Array, seeds: Array, assumptions: Array, truncated: boolean}}
 */
export function propagate(seeds, options = {}) {
  const config = { ...DEFAULTS, ...options };
  const accumulator = new Map();   // id → { impact, paths[], hops }
  const seedIds = new Set(seeds.map((seed) => seed.id));
  let truncated = false;

  const record = (id, contribution, path, hops, confidence) => {
    if (!accumulator.has(id)) accumulator.set(id, { id, impact: 0, paths: [], minHops: hops });
    const entry = accumulator.get(id);
    entry.impact += contribution;
    entry.minHops = Math.min(entry.minHops, hops);
    entry.paths.push({ edges: path, contribution, hops, confidence });
  };

  for (const seed of seeds) {
    if (!node(seed.id)) continue;
    const magnitude = clamp(seed.magnitude ?? 1, -3, 3);

    const walk = (currentId, carried, path, visited) => {
      const hops = path.length;
      if (hops >= config.maxDepth) { truncated = true; return; }
      for (const edge of outEdges(currentId)) {
        if (visited.has(edge.to)) continue;      // no cycles within one path
        const damped = carried * edge.sign * edge.strength *
          (hops === 0 ? 1 : config.damping);
        if (Math.abs(damped) < config.threshold) continue;
        const nextPath = [...path, edge];
        const confidence = degrade(
          weakest(nextPath.map((e) => e.confidence)),
          nextPath.length
        );
        if (!seedIds.has(edge.to)) record(edge.to, damped, nextPath, nextPath.length, confidence);
        visited.add(edge.to);
        walk(edge.to, damped, nextPath, visited);
        visited.delete(edge.to);
      }
    };

    walk(seed.id, magnitude, [], new Set([seed.id]));
  }

  const effects = [...accumulator.values()]
    .map((entry) => {
      entry.paths.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
      const best = entry.paths[0];
      const lag = best.edges.reduce((sum, edge) => sum + edge.lag, 0);
      return {
        id: entry.id,
        node: node(entry.id),
        impact: round(entry.impact, 4),
        direction: entry.impact > 0 ? 1 : entry.impact < 0 ? -1 : 0,
        magnitude: Math.abs(entry.impact),
        order: entry.minHops,                          // 1st-, 2nd-, 3rd-order
        lagMonths: lag,
        confidence: best.confidence,
        pathCount: entry.paths.length,
        /** Do independent chains agree on the sign, or is the net a cancellation? */
        contested: hasConflict(entry.paths),
        paths: entry.paths.slice(0, config.maxPathsPerNode),
      };
    })
    .filter((effect) => effect.magnitude >= config.threshold)
    .sort((a, b) => b.magnitude - a.magnitude);

  return {
    seeds: seeds.map((seed) => ({ ...seed, node: node(seed.id) })),
    effects,
    byOrder: groupBy(effects, (effect) => effect.order),
    assumptions: assumptionsFor(config, seeds),
    truncated,
    config,
  };
}

function hasConflict(paths) {
  let positive = false, negative = false;
  for (const path of paths) {
    if (path.contribution > 0) positive = true;
    if (path.contribution < 0) negative = true;
  }
  return positive && negative;
}

function assumptionsFor(config, seeds) {
  return [
    {
      label: "Structure is fixed",
      detail:
        "Relationships are held constant. In practice regimes shift, and the ones that matter most shift exactly when they are most consequential.",
    },
    {
      label: "Effects are linear and additive",
      detail:
        "Real transmission is non-linear — a 10% oil move and a 100% oil move are different in kind, not only in degree.",
    },
    {
      label: `Damping ${config.damping} per hop`,
      detail:
        "Each additional link multiplies the ways a chain can break, so contributions are discounted with distance rather than accumulated.",
    },
    {
      label: "No policy reaction is modelled",
      detail:
        "Central banks, governments and firms respond to shocks. Those responses are visible in the graph as separate paths, not as automatic offsets.",
    },
    {
      label: "Nothing here is a forecast",
      detail: `Seeded on ${seeds.map((s) => s.id).join(", ")}. Output ranks plausible consequences; it does not estimate probabilities or magnitudes.`,
    },
  ];
}

/** Score used to sort "what should I actually pay attention to". */
export function salience(effect) {
  const confidenceWeight = { high: 1, moderate: 0.75, low: 0.5 }[effect.confidence] ?? 0.5;
  const immediacy = 1 / (1 + effect.lagMonths / 12);
  const corroboration = Math.min(1 + Math.log2(effect.pathCount) * 0.12, 1.4);
  return effect.magnitude * confidenceWeight * (0.55 + 0.45 * immediacy) * corroboration;
}

export const orderName = (order) =>
  ({ 1: "First order", 2: "Second order", 3: "Third order", 4: "Fourth order" }[order] || `Order ${order}`);

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const round = (value, digits) => Number(value.toFixed(digits));

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}

export { CONFIDENCE_SCORE };
