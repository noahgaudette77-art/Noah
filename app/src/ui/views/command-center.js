/**
 * COMMAND CENTRE — the answer to "what do I need to know?" in one screen.
 *
 * Three questions, in order: what changed since you were last here, what the
 * model says follows from it, and what you should learn today. Everything below
 * the fold is secondary.
 */

import { h, mount, icon } from "../../core/dom.js";
import { go } from "../../core/router.js";
import { profile } from "../../core/store.js";
import { load, dataOf, statusOf, STATUS } from "../../data/store.js";
import {
  panel,
  pageHead,
  stat,
  badge,
  cite,
  confidence,
  direction,
  lag,
  chip,
  meter,
} from "../components/kit.js";
import { openStory, openNode } from "../components/drawer.js";
import { sparkline } from "../charts/line.js";
import { num, date as fmtDate, weekStart, plural } from "../../core/format.js";
import { propagate, salience } from "../../domain/propagate.js";
import { node as findNode, stats as modelStats } from "../../domain/worldmodel.js";
import { lessonForWeek } from "../../content/lessons.js";
import { knowledgeGaps, globalScore, dueForReview, levelFromXp } from "../../domain/learning.js";
import { pipelineEmpty } from "../components/states.js";

export function commandCenter() {
  const root = h("div.view-inner");
  load("stories").then(render);
  load("markets").then(render);
  load("manifest").then(render);

  function render() {
    const stories = dataOf("stories");
    const markets = dataOf("markets");
    const learning = profile.at("learning", {});
    const lastVisit = profile.at("lastVisit", null);
    const clusters = stories?.clusters || [];
    const seen = profile.at("seen", {});

    const unseen = clusters.filter((cluster) =>
      !seen[cluster.id] && cluster.score >= 0.45).slice(0, 8);

    mount(root,
      pageHead(
        greeting(),
        clusters.length
          ? `${plural(clusters.length, "development")} in the stream. ${unseen.length
              ? `${unseen.length} materially new since you were last here.`
              : "Nothing new since your last visit."}`
          : "The pipeline has not produced an intelligence stream yet.",
        [
          h("button.btn", { type: "button", onclick: () => go("/daily") }, icon("pulse", 12), "Daily brief"),
          h("button.btn.btn--primary", { type: "button", onclick: () => go("/weekly") }, icon("calendar", 12), "Weekly brief"),
        ]
      ),

      h("div.grid.g-main", null,
        h("div.stack", null,
          topSignals(clusters, unseen, seen),
          transmissionPanel(clusters),
        ),
        h("div.stack", null,
          marketStrip(markets),
          learningPanel(learning),
          modelPanel(),
        )
      )
    );
  }

  return root;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Overnight";
  if (hour < 12) return "This morning";
  if (hour < 18) return "This afternoon";
  return "This evening";
}

function topSignals(clusters, unseen, seen) {
  if (!clusters.length) {
    return panel({
      title: "Today's intelligence",
      body: statusOf("stories").status === STATUS.LOADING
        ? h("div.stack-s", null, h("div.skel"), h("div.skel", { style: { width: "80%" } }), h("div.skel", { style: { width: "62%" } }))
        : pipelineEmpty("stories"),
    });
  }

  const shown = (unseen.length ? unseen : clusters.slice(0, 8));

  return panel({
    title: unseen.length ? "New since your last visit" : "Today's intelligence",
    sub: unseen.length ? `${unseen.length} of ${clusters.length}` : `top ${shown.length} of ${clusters.length}`,
    actions: h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/stream") }, "All", icon("chevron", 11)),
    flush: true,
    body: h("div.rows", null, ...shown.map((cluster) => h("button.rowitem", {
      onclick: () => {
        profile.merge("seen", { [cluster.id]: Date.now() });
        openStory(cluster);
      },
    },
      h("span.rowitem__rank", `#${cluster.rank}`),
      h("span.grow", null,
        h("div.row-s.wrap", { style: { marginBottom: "2px" } },
          cluster.isDecision && badge("decision", "accent"),
          !seen[cluster.id] && badge("new", "cyan"),
          ...cluster.nodes.slice(0, 2).map((entry) =>
            h("span.badge", findNode(entry.nodeId)?.label || entry.nodeId))),
        h("div.rowitem__title.clamp-2", cluster.lead.title),
        h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
          cite(cluster.lead.sourceId, { url: cluster.lead.url, at: cluster.lead.publishedAt }),
          h("span.faint", { style: { fontSize: "var(--t-tiny)" } },
            `importance ${num(cluster.score * 100, 0)}`))),
      icon("chevron", 12)
    ))),
    foot: h("span", null,
      "Ranked by source tier, recency, corroboration and how far the subject propagates in the world model. ",
      h("a", { href: "#/sources" }, "How ranking works")),
  });
}

/**
 * The signature move: take the top development and show what the model says
 * follows from it. Not a forecast — a map of the channels.
 */
function transmissionPanel(clusters) {
  const withNodes = clusters.find((cluster) => cluster.nodes?.length);
  if (!withNodes) return null;

  const seedId = withNodes.nodes[0].nodeId;
  const seed = findNode(seedId);
  if (!seed) return null;

  const result = propagate([{ id: seedId, magnitude: 1 }], { maxDepth: 3 });
  const effects = [...result.effects].sort((a, b) => salience(b) - salience(a)).slice(0, 9);

  return panel({
    title: "And then what?",
    sub: `if ${seed.label} moves higher`,
    actions: h("button.btn.btn--sm", { type: "button", onclick: () => go(`/simulator?shock=${seedId}`) },
      icon("flask", 11), "Open in simulator"),
    flush: true,
    body: h("div", null,
      h("div.panel__body", { style: { paddingBottom: "var(--s3)" } },
        h("p.dim", { style: { fontSize: "var(--t-small)" } },
          `Because "${withNodes.lead.title}" touches ${seed.label}, the model traces these channels. `,
          h("b", "These are transmission routes, not predictions"),
          " — ordered by how much they matter, discounted for distance and evidence quality.")),
      h("div.rows", null, ...effects.map((effect) => h("button.rowitem", {
        onclick: () => openNode(effect.id),
      },
        h("span.rowitem__rank", `${effect.order}°`),
        h("span.grow", null,
          h("div.row-s.wrap", null,
            h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
            direction(effect.direction, effect.node.kind),
            effect.contested && badge("contested", "warn")),
          h("div.row-s.wrap", { style: { marginTop: "var(--s1)" } },
            confidence(effect.confidence),
            lag(effect.lagMonths),
            h("span.faint", { style: { fontSize: "var(--t-tiny)" } },
              effect.paths[0]?.edges.map((edge) => findNode(edge.to)?.label).join(" → ")))),
        h("div", { style: { width: "54px" } }, meter(effect.magnitude, { max: effects[0].magnitude }))
      )))),
    foot: h("span", null, `${result.effects.length} modelled consequences · damping ${result.config.damping} per hop · assumptions listed in the simulator`),
  });
}

function marketStrip(markets) {
  if (!markets?.series?.length) {
    return panel({ title: "Markets", body: pipelineEmpty("markets") });
  }

  const byId = new Map(markets.series.map((entry) => [entry.id, entry]));
  const picks = ["ust10y", "curve_2s10s", "ust2y", "usdcad", "eurusd", "boc_policy_rate"]
    .map((id) => byId.get(id)).filter(Boolean);

  return panel({
    title: "Markets",
    sub: markets.series[0]?.asOf ? `as of ${fmtDate(markets.series.find((s) => s.asOf)?.asOf)}` : null,
    actions: h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/markets") }, "More", icon("chevron", 11)),
    flush: true,
    body: h("table.tbl", null,
      h("tbody", null, ...picks.map((entry) => {
        const tail = entry.observations.slice(-40);
        const change = entry.change ?? 0;
        return h("tr", { "data-clickable": "", onclick: () => go("/markets") },
          h("td", null,
            h("div.truncate", { style: { fontSize: "var(--t-body)", maxWidth: "17ch" }, title: entry.label }, entry.label),
            h("div.rowitem__meta.truncate", { style: { maxWidth: "17ch" } }, entry.unit)),
          h("td", { style: { width: "88px" } }, sparkline(tail)),
          h("td.r", null, h("b", num(entry.latest, entry.unit === "%" || entry.unit === "pp" ? 2 : 4))),
          h("td.r", { class: change > 0 ? "up" : change < 0 ? "down" : "dim", style: { width: "72px" } },
            change === 0 ? "—" : `${change > 0 ? "+" : ""}${num(change, entry.unit === "%" ? 2 : 4)}`)
        );
      }))),
    foot: h("span", null, "End-of-day official series. ", h("b", "Not a real-time quote feed.")),
  });
}

function learningPanel(learning) {
  const score = globalScore(learning);
  const level = levelFromXp(learning.xp || 0);
  const gaps = knowledgeGaps(learning, 3);
  const due = dueForReview(learning, 5);
  const { lesson } = lessonForWeek(weekStart());

  return panel({
    title: "Your standing",
    sub: level.rank,
    flush: true,
    body: h("div", null,
      h("div.panel__body", null,
        h("div.spread", { style: { marginBottom: "var(--s3)" } },
          stat({ label: "Global knowledge score", value: String(score.score), large: true,
                 note: `${score.conceptsTouched} of ${score.conceptsTotal} concepts touched` }),
          h("div.stack-xs", { style: { minWidth: "128px" } },
            ...["depth", "breadth", "retention", "reasoning"].map((key) => h("div", null,
              h("div.spread", { style: { fontSize: "var(--t-micro)" } },
                h("span.dim", key), h("span.mono.dim", `${score.components[key]}`)),
              meter(score.components[key], { max: 100, height: 3 })))))),

      h("div.rows", null,
        due.length ? h("button.rowitem", { onclick: () => go("/learn?start=review") },
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } },
              `${plural(due.length, "concept")} due for review`),
            h("div.rowitem__meta", "Retention decays without it")),
          icon("chevron", 12)) : null,

        h("button.rowitem", { onclick: () => go("/learn?start=quiz") },
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, "Take this week's quiz"),
            h("div.rowitem__meta", "Ten questions, half generated from the world model")),
          icon("chevron", 12)),

        h("button.rowitem", { onclick: () => go(`/history/${lesson.id}`) },
          h("span.grow", null,
            h("div.eyebrow", { style: { marginBottom: "2px" } }, "One thing you should know"),
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, lesson.title),
            h("div.rowitem__meta", lesson.era)),
          icon("chevron", 12)),

        ...gaps.next.slice(0, 2).map((gap) => h("button.rowitem", {
          onclick: () => go(`/knowledge/${gap.concept.id}`),
        },
          h("span.grow", null,
            h("div.eyebrow", { style: { marginBottom: "2px" } }, "Knowledge gap"),
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, gap.concept.term),
            h("div.rowitem__meta", gap.reason)),
          icon("chevron", 12)))),
    ),
  });
}

function modelPanel() {
  return panel({
    title: "World model",
    sub: `${modelStats.nodes} nodes · ${modelStats.edges} links`,
    body: h("div.stack-s", null,
      h("p.dim", { style: { fontSize: "var(--t-small)" } },
        "Every ranking, chain and simulation in this application resolves against one authored causal graph. Its edges are analytical judgements with stated confidence, not measured coefficients."),
      h("div.row-s.wrap", null,
        chip(`${modelStats.byConfidence.high || 0} high confidence`),
        chip(`${modelStats.byConfidence.moderate || 0} moderate`),
        chip(`${modelStats.byConfidence.low || 0} low`)),
      h("div.row-s", null,
        h("button.btn.btn--sm.grow", { type: "button", onclick: () => go("/graph") }, icon("graph", 11), "Explore"),
        h("button.btn.btn--sm.grow", { type: "button", onclick: () => go("/simulator") }, icon("flask", 11), "Simulate"))),
  });
}
