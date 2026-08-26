/**
 * Clustering: group stories that are about the same development.
 *
 * Agglomerative on a similarity that combines title overlap with shared
 * world-model entities, because two releases about the same subject frequently
 * share no distinctive words at all.
 */

import { tokens, jaccard } from "./dedupe.js";

function similarity(a, b) {
  const lexical = jaccard(a._tokens || tokens(a.title), b._tokens || tokens(b.title));
  const nodesA = new Set((a.nodes || []).map((n) => n.nodeId));
  const nodesB = new Set((b.nodes || []).map((n) => n.nodeId));
  let shared = 0;
  for (const node of nodesA) if (nodesB.has(node)) shared++;
  const entity = nodesA.size && nodesB.size
    ? shared / Math.min(nodesA.size, nodesB.size)
    : 0;
  // Entity agreement alone is far too weak a signal — half the Fed's output
  // touches the policy rate. It corroborates lexical overlap; it never replaces it.
  return 0.72 * lexical + 0.28 * entity;
}

export function cluster(stories, { threshold = 0.52, maxSize = 10 } = {}) {
  const clusters = [];

  for (const story of stories) {
    let best = null, bestScore = 0;
    for (const candidate of clusters) {
      if (candidate.items.length >= maxSize) continue;
      // Average link, not single link: single-link chaining (A~B, B~C, so A~C)
      // silently merges unrelated stories through a bridge item.
      const scores = candidate.items.map((item) => similarity(item, story));
      const score = scores.reduce((sum, value) => sum + value, 0) / scores.length;
      if (score > bestScore) { bestScore = score; best = candidate; }
    }
    if (best && bestScore >= threshold) best.items.push(story);
    else clusters.push({ items: [story] });
  }

  return clusters.map((entry) => {
    const items = entry.items.sort((a, b) => (a.publishedAt || "") < (b.publishedAt || "") ? 1 : -1);
    const lead = items[0];
    const nodeCounts = new Map();
    for (const item of items) {
      for (const node of item.nodes || []) {
        nodeCounts.set(node.nodeId, (nodeCounts.get(node.nodeId) || 0) + node.hits);
      }
    }
    return {
      // Derived from the lead item, not the loop index, so a cluster keeps the
      // same identity across runs and merges cleanly instead of duplicating.
      id: `cl-${lead.id.slice(0, 12)}`,
      lead,
      items,
      size: items.length,
      sources: [...new Set(items.map((item) => item.sourceId))],
      nodes: [...nodeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([nodeId, hits]) => ({ nodeId, hits })),
      topics: [...new Set(items.flatMap((item) => item.topics || []))],
      regions: [...new Set(items.map((item) => item.region))],
      publishedAt: lead.publishedAt,
    };
  });
}
