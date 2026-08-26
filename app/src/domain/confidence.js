/**
 * Confidence and corroboration.
 *
 * A claim's confidence is a function of where it came from and how many
 * independent places said it — not of how fluent the sentence is. The rules are
 * deliberately conservative and always shown to the reader alongside the claim.
 */

import { source, baseCredibility, tierMeta } from "../content/sources.js";

export const LEVELS = {
  high: { id: "high", label: "High confidence", bars: 3,
    note: "Primary sourcing, or multiple independent reliable sources in agreement." },
  moderate: { id: "moderate", label: "Moderate confidence", bars: 2,
    note: "Reasonable evidence with meaningful uncertainty, or a single reliable source." },
  low: { id: "low", label: "Low confidence", bars: 1,
    note: "Limited evidence, contested, or explicitly speculative." },
  insufficient: { id: "insufficient", label: "Insufficient evidence", bars: 0,
    note: "Not enough reliable material to support a claim. Stated rather than filled in." },
};

/**
 * @param {Array<{sourceId?: string, tier?: number}>} citations
 * @param {{contested?: boolean, speculative?: boolean}} flags
 */
export function assess(citations = [], flags = {}) {
  if (!citations.length) return { ...LEVELS.insufficient, score: 0, independent: 0 };

  const tiers = citations.map((c) => c.tier ?? source(c.sourceId)?.tier ?? 4);
  const best = Math.min(...tiers);
  const independent = new Set(citations.map((c) => c.sourceId || c.url || c.label)).size;

  let score = baseCredibility(best);
  if (independent >= 3) score += 0.12;
  else if (independent === 2) score += 0.06;
  if (flags.contested) score -= 0.22;
  if (flags.speculative) score -= 0.3;
  score = Math.max(0, Math.min(1, score));

  const level =
    score >= 0.78 ? LEVELS.high :
    score >= 0.5 ? LEVELS.moderate :
    score >= 0.22 ? LEVELS.low : LEVELS.insufficient;

  return { ...level, score: Number(score.toFixed(2)), independent, bestTier: best, tier: tierMeta(best) };
}

/**
 * Where sources disagree, the disagreement is the finding. This never picks a
 * winner silently — it returns both positions and the reason one is weighted
 * more heavily, and leaves the reader to decide.
 */
export function disagreement(positions) {
  const ranked = [...positions].sort((a, b) => {
    const at = a.tier ?? source(a.sourceId)?.tier ?? 4;
    const bt = b.tier ?? source(b.sourceId)?.tier ?? 4;
    return at - bt;
  });
  const tiers = ranked.map((p) => p.tier ?? source(p.sourceId)?.tier ?? 4);
  const decisive = tiers[0] < tiers[1];
  return {
    positions: ranked,
    weightedToward: decisive ? ranked[0] : null,
    reason: decisive
      ? `${tierMeta(tiers[0]).label} sourcing outranks ${tierMeta(tiers[1]).label}.`
      : "Both positions carry comparable sourcing weight. The disagreement is unresolved.",
    unresolved: !decisive,
  };
}

/** Fact / interpretation / scenario / uncertainty — the geopolitics separation. */
export const CLAIM_KINDS = [
  { id: "fact", label: "Fact", note: "Observable and attributable to a source.", tone: "fact" },
  { id: "interpretation", label: "Interpretation", note: "What analysts infer from the facts.", tone: "" },
  { id: "scenario", label: "Scenario", note: "A possible path, not a prediction.", tone: "speculation" },
  { id: "uncertainty", label: "Unknown", note: "Explicitly not established.", tone: "warn" },
];

export const claimKind = (id) => CLAIM_KINDS.find((k) => k.id === id) || CLAIM_KINDS[1];
