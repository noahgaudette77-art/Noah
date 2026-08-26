/** AI RADAR · FUTURE MAP */

import { h, mount, icon } from "../../core/dom.js";
import { go } from "../../core/router.js";
import { load, dataOf } from "../../data/store.js";
import { panel, pageHead, badge, chip, cite, callout } from "../components/kit.js";
import { pipelineEmpty } from "../components/states.js";
import { openNode, openConcept } from "../components/drawer.js";
import { TECHNOLOGIES, STAGES, FUTURE_MAP, byStage } from "../../content/technologies.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { concept as findConcept } from "../../content/concepts.js";

export function radarView() {
  const root = h("div.view-inner");
  let stage = "all";
  load("research").then(render);

  function render() {
    const research = dataOf("research");
    const pool = stage === "all" ? TECHNOLOGIES : byStage(stage);

    mount(root,
      pageHead("AI radar",
        "What is happening now that most people will understand in one to three years. Every entry states what would validate the thesis and what would kill it — an entry with no falsifier is an opinion, not a signal."),

      h("div.row-s.wrap", { style: { marginBottom: "var(--s5)" } },
        chip(`All ${TECHNOLOGIES.length}`, { pressed: stage === "all", onclick: () => { stage = "all"; render(); } }),
        ...STAGES.map((entry) => chip(`${entry.label} ${byStage(entry.id).length}`, {
          pressed: stage === entry.id, title: entry.note,
          onclick: () => { stage = entry.id; render(); } }))),

      h("div.grid.g-main", null,
        h("div.stack", null, ...pool.map(technologyCard)),

        h("div.stack", null,
          panel({
            title: "Maturity ladder",
            flush: true,
            body: h("div.rows", null, ...STAGES.map((entry) => h("button.rowitem", {
              onclick: () => { stage = entry.id; render(); },
            },
              h("span.grow", null,
                h("div.row-s", null,
                  h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.label),
                  badge(String(byStage(entry.id).length))),
                h("div.rowitem__meta", { style: { marginTop: "2px" } }, entry.note)),
              icon("chevron", 12)))),
          }),

          research?.papers?.length
            ? panel({
                title: "Research feed",
                sub: `${research.papers.length} recent preprints`,
                flush: true,
                body: h("div.rows", null, ...research.papers.slice(0, 12).map((paper) =>
                  h("a.rowitem", { href: paper.url, target: "_blank", rel: "noopener noreferrer" },
                    h("span.grow", null,
                      h("div.rowitem__title.clamp-2", { style: { fontSize: "var(--t-body)" } }, paper.title),
                      h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
                        cite("arxiv", { at: paper.publishedAt }),
                        ...(paper.categories || []).slice(0, 2).map((category) => badge(category)))),
                    icon("external", 12)))),
                foot: h("span", null, h("b", "Preprints are not peer reviewed. "),
                  "Presence here is evidence that a claim was made, which is not the same as evidence that it holds."),
              })
            : panel({ title: "Research feed", body: pipelineEmpty("research") }))
      )
    );
  }

  return root;
}

function technologyCard(entry) {
  const stageMeta = STAGES.find((s) => s.id === entry.stage);
  const target = entry.node ? findNode(entry.node) : null;

  return panel({
    title: entry.name,
    sub: entry.domain,
    actions: badge(stageMeta.label, entry.stage === "now" ? "up" : entry.stage === "developing" ? "cyan"
      : entry.stage === "watchlist" ? "" : "warn"),
    body: h("div.stack-s", null,
      h("p.prose", { style: { fontSize: "var(--t-body)" } }, entry.what),

      h("div", null,
        h("div.callout__label", { style: { marginBottom: "var(--s1)" } }, "Why it matters"),
        h("p", { style: { fontSize: "var(--t-body)", color: "var(--ink-2)" } }, entry.why)),

      h("div.grid.g2", { style: { gap: "var(--s4)", marginTop: "var(--s3)" } },
        h("div.callout.callout--fact", null,
          h("div.callout__label", "Would validate it"),
          h("p", { style: { marginTop: "var(--s1)" } }, entry.validate)),
        h("div.callout.callout--warn", null,
          h("div.callout__label", "Would invalidate it"),
          h("p", { style: { marginTop: "var(--s1)" } }, entry.invalidate))),

      h("div", { style: { marginTop: "var(--s3)" } },
        h("div.callout__label", { style: { marginBottom: "var(--s1)" } }, "Economics"),
        h("p", { style: { fontSize: "var(--t-small)", color: "var(--ink-2)" } }, entry.economics)),

      h("details", { style: { marginTop: "var(--s3)" } },
        h("summary", { style: { fontSize: "var(--t-tiny)", color: "var(--ink-3)", cursor: "pointer" } },
          "Barriers, players and applications"),
        h("div.stack-s", { style: { marginTop: "var(--s3)" } },
          detailRow("Barriers", entry.barriers),
          detailRow("Who is involved", entry.players),
          detailRow("Applications", entry.applications))),

      h("div.row-s.wrap", { style: { marginTop: "var(--s4)" } },
        target && chip(`Trace ${target.label}`, { onclick: () => openNode(target.id) }),
        ...(entry.concepts || []).map((id) => {
          const concept = findConcept(id);
          return concept ? chip(concept.term, { onclick: () => openConcept(id) }) : null;
        }).filter(Boolean),
        target && chip("Simulate", { onclick: () => go(`/simulator?shock=${target.id}`) }))),
  });
}

const detailRow = (label, items) => h("div", null,
  h("div.eyebrow", { style: { marginBottom: "var(--s1)" } }, label),
  h("div.row-s.wrap", null, ...(items || []).map((item) => h("span.chip", item))));

/* ========================= FUTURE MAP ========================= */

export function futureView() {
  const root = h("div.view-inner");

  mount(root,
    pageHead("Future map",
      "Structural trends on a decade horizon. Everything past the first column is a forecast and is labelled as one — including the field that says what would make the map wrong."),

    h("div.stack", null, ...FUTURE_MAP.map(trendPanel)),

    callout("How to read this",
      "The last row of each trend — \"what would change this\" — is the most useful part. A map with no invalidating condition cannot go stale, which means it was never saying anything.")
  );

  return root;
}

function trendPanel(trend) {
  const horizons = [
    { id: "now", label: "Now", body: trend.now, forecast: false },
    { id: "near", label: "Next 1–2 years", body: trend.near, forecast: true },
    { id: "mid", label: "3–5 years", body: trend.mid, forecast: true },
    { id: "long", label: "Beyond", body: trend.long, forecast: true },
  ];

  return panel({
    title: trend.label,
    actions: h("div.row-s", null, ...trend.nodes.map((nodeId) => {
      const target = findNode(nodeId);
      return target ? h("button.chip", { type: "button", onclick: () => openNode(nodeId) }, target.label) : null;
    }).filter(Boolean)),
    flush: true,
    body: h("div", null,
      h("div.rows", null, ...horizons.map((horizon) => h("div.rowitem", null,
        h("span", { style: { width: "104px", flex: "none" } },
          h("div.eyebrow", horizon.label),
          horizon.forecast && badge("forecast", "warn")),
        h("span.grow.rowitem__body", { style: { fontSize: "var(--t-body)" } }, horizon.body)))),
      h("div.panel__body", { style: { borderTop: "1px solid var(--line)", background: "var(--bg-sink)" } },
        h("div.callout__label", { style: { marginBottom: "var(--s1)" } }, "What would change this"),
        h("p", { style: { fontSize: "var(--t-body)", color: "var(--ink-2)" } }, trend.changes))),
  });
}
