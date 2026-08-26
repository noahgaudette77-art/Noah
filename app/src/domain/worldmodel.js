/**
 * The world model: an indexed, queryable causal graph.
 *
 * This module owns structure only — adjacency, lookup, neighbourhoods, paths.
 * Simulation lives in propagate.js so that the graph can be explored without
 * anything being asserted about the future.
 */

import { NODES, NODE_BY_ID, GROUPS, KIND_LABEL } from "../content/world-nodes.js";
import { EDGES } from "../content/world-edges.js";

const out = new Map();
const inn = new Map();

for (const node of NODES) { out.set(node.id, []); inn.set(node.id, []); }
for (const edge of EDGES) {
  out.get(edge.from)?.push(edge);
  inn.get(edge.to)?.push(edge);
}

export { NODES, GROUPS, KIND_LABEL, EDGES };
export const node = (id) => NODE_BY_ID.get(id) || null;
export const label = (id) => node(id)?.label || id;
export const outEdges = (id) => out.get(id) || [];
export const inEdges = (id) => inn.get(id) || [];
export const degree = (id) => outEdges(id).length + inEdges(id).length;

export const stats = {
  nodes: NODES.length,
  edges: EDGES.length,
  groups: GROUPS.length,
  byConfidence: EDGES.reduce((acc, edge) => {
    acc[edge.confidence] = (acc[edge.confidence] || 0) + 1;
    return acc;
  }, {}),
};

/** The nodes with the most connections — the load-bearing parts of the model. */
export function hubs(limit = 12) {
  return NODES
    .map((n) => ({ node: n, degree: degree(n.id) }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, limit);
}

/** One hop in both directions, for the graph view and node drawers. */
export function neighbourhood(id, depth = 1) {
  const seen = new Map([[id, 0]]);
  let frontier = [id];
  for (let d = 1; d <= depth; d++) {
    const next = [];
    for (const current of frontier) {
      for (const edge of [...outEdges(current), ...inEdges(current)]) {
        const other = edge.from === current ? edge.to : edge.from;
        if (!seen.has(other)) { seen.set(other, d); next.push(other); }
      }
    }
    frontier = next;
  }
  const ids = new Set(seen.keys());
  return {
    nodes: [...seen].map(([nodeId, d]) => ({ ...node(nodeId), depth: d })),
    edges: EDGES.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
  };
}

/**
 * Every simple directed path from → to, shortest first. This is the engine
 * behind "connect the dots": the answer to "what does A have to do with B" is
 * the set of routes between them, not a single number.
 */
export function findPaths(fromId, toId, { maxDepth = 7, limit = 6 } = {}) {
  if (!node(fromId) || !node(toId) || fromId === toId) return [];
  const results = [];

  const walk = (current, trail, visited) => {
    if (results.length >= limit * 4 || trail.length > maxDepth) return;
    for (const edge of outEdges(current)) {
      if (visited.has(edge.to)) continue;
      const nextTrail = [...trail, edge];
      if (edge.to === toId) { results.push(nextTrail); continue; }
      visited.add(edge.to);
      walk(edge.to, nextTrail, visited);
      visited.delete(edge.to);
    }
  };

  walk(fromId, [], new Set([fromId]));

  return results
    .map((path) => ({
      edges: path,
      length: path.length,
      sign: path.reduce((acc, edge) => acc * edge.sign, 1),
      strength: path.reduce((acc, edge) => acc * edge.strength, 1),
      lag: path.reduce((acc, edge) => acc + edge.lag, 0),
      confidence: weakest(path.map((edge) => edge.confidence)),
    }))
    .sort((a, b) => b.strength - a.strength || a.length - b.length)
    .slice(0, limit);
}

const CONFIDENCE_RANK = { high: 3, moderate: 2, low: 1 };
export const CONFIDENCE_SCORE = CONFIDENCE_RANK;

export function weakest(levels) {
  let worst = "high";
  for (const level of levels) {
    if (CONFIDENCE_RANK[level] < CONFIDENCE_RANK[worst]) worst = level;
  }
  return worst;
}

/** Text form of a path, for reports and the command palette. */
export function pathText(path, { arrow = " → " } = {}) {
  if (!path.edges.length) return "";
  const chain = [label(path.edges[0].from), ...path.edges.map((edge) => label(edge.to))];
  return chain.join(arrow);
}

/** Free-text lookup across labels, ids and blurbs. */
export function search(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return NODES
    .map((n) => {
      const label = n.label.toLowerCase();
      let score = 0;
      if (label === q) score = 100;
      else if (label.startsWith(q)) score = 70;
      else if (label.includes(q)) score = 50;
      else if (n.id.includes(q.replace(/\s+/g, "_"))) score = 40;
      else if (n.blurb.toLowerCase().includes(q)) score = 18;
      if (score) score += Math.min(degree(n.id), 12) * 0.4;
      return { node: n, score };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((hit) => hit.node);
}
