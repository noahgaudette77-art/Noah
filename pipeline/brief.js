/**
 * The Monday brief.
 *
 * Everything here is derived: the ranking comes from the scorer, the chains come
 * from the world model, the lesson comes from the rotation, the quiz comes from
 * the generator. Nothing is written by a language model, and nothing is invented.
 *
 * Where a section has no material — because the pipeline found nothing that
 * qualifies — the section says so. An empty "What most people are missing" is a
 * true statement about a quiet week; a fabricated one is a lie every week.
 */

import { propagate, salience, orderName } from "../app/src/domain/propagate.js";
import { node, label, findPaths, pathText, hubs } from "../app/src/domain/worldmodel.js";
import { lessonForWeek } from "../app/src/content/lessons.js";
import { generateQuiz } from "../app/src/domain/quiz.js";
import { explainScore } from "./stages/score.js";

export function buildBrief({ weekStart, clusters, series, research, filings, generatedAt }) {
  const top = clusters.slice(0, 10);

  return {
    weekStart,
    generatedAt,
    version: 1,
    headline: {
      count: clusters.length,
      decisions: clusters.filter((c) => c.isDecision).length,
      sources: [...new Set(clusters.flatMap((c) => c.sources))].length,
    },
    bigPicture: (() => {
      // Each item projects through the most specific node it has not already been
      // covered by, so ten stories about rates do not produce ten identical chains.
      const claimed = new Map();   // nodeId → the rank that already projected it
      return top.map((cluster, index) => bigPictureItem(cluster, index + 1, claimed));
    })(),
    connectTheDots: connectTheDots(top),
    marketNote: marketNote(series),
    watchNext: watchNext(top, series),
    risks: riskRadar(top),
    lesson: (() => {
      const { lesson, cycle } = lessonForWeek(weekStart);
      return { id: lesson.id, title: lesson.title, era: lesson.era, hook: lesson.hook, revisit: cycle > 0 };
    })(),
    quiz: (() => {
      const quiz = generateQuiz({ seed: `brief:${weekStart}`, count: 10 });
      return { seed: quiz.seed, count: quiz.questions.length, composition: quiz.composition };
    })(),
    research: (research || []).slice(0, 8).map((paper) => ({
      id: paper.id, title: paper.title, url: paper.url, publishedAt: paper.publishedAt,
      categories: paper.categories,
    })),
    filings: (filings || []).slice(0, 12),
    coverage: {
      note: "Generated from the sources that answered during this run. Gaps are recorded in the run manifest rather than filled in.",
    },
  };
}

function bigPictureItem(cluster, rank, claimed = new Map()) {
  const fresh = cluster.nodes.find((entry) => !claimed.has(entry.nodeId));
  const primaryNode = (fresh || cluster.nodes[0])?.nodeId;

  // If every node this story touches was already projected by a higher-ranked
  // item, point at that item instead of repeating an identical chain. Four
  // copies of the same transmission is noise dressed as analysis.
  const sharedWith = fresh ? null : (primaryNode ? claimed.get(primaryNode) ?? null : null);
  if (primaryNode && fresh) claimed.set(primaryNode, rank);

  const effects = (primaryNode && !sharedWith)
    ? [...propagate([{ id: primaryNode, magnitude: 1 }], { maxDepth: 3 }).effects]
        .sort((a, b) => salience(b) - salience(a)).slice(0, 6)
    : [];

  return {
    rank,
    id: cluster.id,
    title: cluster.lead.title,
    url: cluster.lead.url,
    publishedAt: cluster.publishedAt,
    sources: cluster.sources,
    sourceCount: cluster.sources.length,
    itemCount: cluster.size,
    score: cluster.score,
    components: cluster.components,
    whyRanked: explainScore(cluster),
    isDecision: Boolean(cluster.isDecision),
    nodes: cluster.nodes.map((entry) => ({ id: entry.nodeId, label: label(entry.nodeId) })),
    projectedFrom: primaryNode ? { id: primaryNode, label: label(primaryNode) } : null,
    /** Set when a higher-ranked item already projected the same node. */
    sharedWith,
    /**
     * "What could happen next" is the world model's answer, not a forecast:
     * these are the channels through which this variable historically transmits.
     */
    transmission: effects.map((effect) => ({
      id: effect.id,
      label: effect.node.label,
      order: effect.order,
      orderName: orderName(effect.order),
      direction: effect.direction,
      lagMonths: effect.lagMonths,
      confidence: effect.confidence,
      contested: effect.contested,
      via: effect.paths[0]?.edges.map((edge) => ({ from: label(edge.from), to: label(edge.to), why: edge.why })) || [],
    })),
    others: cluster.items.slice(1, 5).map((item) => ({ title: item.title, url: item.url, sourceId: item.sourceId })),
  };
}

/**
 * Connect the dots: find pairs among this week's subjects that share a causal
 * route, and show it. Only real paths through the model qualify.
 */
function connectTheDots(clusters) {
  const nodeIds = [...new Set(clusters.flatMap((cluster) => cluster.nodes.map((n) => n.nodeId)))];
  const connections = [];

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = 0; j < nodeIds.length; j++) {
      if (i === j) continue;
      const paths = findPaths(nodeIds[i], nodeIds[j], { maxDepth: 5, limit: 1 });
      if (!paths.length) continue;
      const path = paths[0];
      if (path.length < 2) continue;                  // one hop is not a connection worth drawing
      connections.push({
        from: nodeIds[i], to: nodeIds[j],
        fromLabel: label(nodeIds[i]), toLabel: label(nodeIds[j]),
        chain: pathText(path),
        hops: path.length,
        strength: Number(path.strength.toFixed(4)),
        sign: path.sign,
        confidence: path.confidence,
        steps: path.edges.map((edge) => ({ from: label(edge.from), to: label(edge.to), why: edge.why, sign: edge.sign })),
      });
    }
  }

  // One chain per destination, and never two chains that share both endpoints.
  const seen = new Set();
  return connections
    .sort((a, b) => b.strength - a.strength || a.hops - b.hops)
    .filter((connection) => {
      if (seen.has(connection.to)) return false;
      seen.add(connection.to);
      return true;
    })
    .slice(0, 4);
}

function marketNote(series) {
  const byId = new Map((series || []).map((s) => [s.id, s]));
  const curve = byId.get("curve_2s10s");
  const notes = [];

  if (curve?.observations?.length > 5) {
    const latest = curve.observations[curve.observations.length - 1];
    const monthAgo = curve.observations[Math.max(0, curve.observations.length - 22)];
    notes.push({
      id: "curve",
      label: "Yield curve (10y − 2y)",
      value: latest.v, unit: "pp", asOf: latest.d,
      change: Number((latest.v - monthAgo.v).toFixed(3)),
      changeLabel: "vs ~1 month ago",
      reading: latest.v < 0
        ? "Inverted. Historically this has preceded recessions with long and variable lags — it is not a timing signal."
        : latest.v < 0.5
          ? "Flat. The market is pricing a policy path close to unchanged in real terms."
          : "Positively sloped, the normal state.",
      sourceId: curve.sourceId,
    });
  }

  for (const [id, reading] of [
    ["ust10y", "The global discount rate. Where it goes, long-duration valuations follow."],
    ["usdcad", "Rate differentials and oil in one price."],
    ["eurusd", "Largely a rate-differential and energy-terms-of-trade story."],
    ["boc_policy_rate", "The Bank of Canada's target for the overnight rate."],
  ]) {
    const entry = byId.get(id);
    if (!entry?.latest) continue;
    notes.push({
      id, label: entry.label, value: entry.latest, unit: entry.unit,
      asOf: entry.asOf, change: entry.change, changeLabel: "vs previous observation",
      reading, sourceId: entry.sourceId,
    });
  }

  return notes;
}

function watchNext(clusters, series) {
  const items = [];
  const seen = new Set();

  for (const cluster of clusters.slice(0, 6)) {
    for (const entry of cluster.nodes.slice(0, 2)) {
      if (seen.has(entry.nodeId)) continue;
      seen.add(entry.nodeId);
      const target = node(entry.nodeId);
      if (!target) continue;
      const downstream = propagate([{ id: entry.nodeId, magnitude: 1 }], { maxDepth: 2 })
        .effects.filter((effect) => effect.confidence === "high").slice(0, 3);
      if (!downstream.length) continue;
      items.push({
        node: entry.nodeId,
        label: target.label,
        because: cluster.lead.title,
        watch: downstream.map((effect) => ({
          label: effect.node.label,
          direction: effect.direction,
          lagMonths: effect.lagMonths,
        })),
        proxies: target.proxies || [],
      });
    }
  }

  return items.slice(0, 6);
}

/**
 * Risk radar. Only risks the week's material actually touched, ranked by how far
 * they propagate. No probability is attached, because none is defensible.
 */
function riskRadar(clusters) {
  const touched = new Set(clusters.flatMap((cluster) => cluster.nodes.map((n) => n.nodeId)));
  const riskNodes = hubs(60)
    .map((entry) => entry.node)
    .filter((candidate) => candidate.kind === "risk");

  return riskNodes.map((risk) => {
    const spread = propagate([{ id: risk.id, magnitude: 1 }], { maxDepth: 3 });
    const inFocus = spread.effects.some((effect) => touched.has(effect.id)) || touched.has(risk.id);
    return {
      id: risk.id, label: risk.label, blurb: risk.blurb,
      inFocus,
      reach: Number(spread.effects.reduce((sum, effect) => sum + effect.magnitude, 0).toFixed(2)),
      channels: spread.effects.slice(0, 4).map((effect) => ({
        label: effect.node.label, direction: effect.direction, confidence: effect.confidence,
      })),
      note: "No probability is attached. The model ranks reach, not likelihood.",
    };
  })
    .sort((a, b) => (b.inFocus - a.inFocus) || (b.reach - a.reach))
    .slice(0, 6);
}
