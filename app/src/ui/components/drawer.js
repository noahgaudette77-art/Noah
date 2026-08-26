/** The detail drawer: concepts, world-model nodes and stories, without leaving the view. */

import { h, mount, icon } from "../../core/dom.js";
import { badge, cite, confidence, direction, lag, panel } from "./kit.js";
import { explainPanel } from "./explain.js";
import { node as findNode, inEdges } from "../../domain/worldmodel.js";
import { propagate } from "../../domain/propagate.js";
import { conceptsForNode, concept as findConcept } from "../../content/concepts.js";
import { lessonsForNode } from "../../content/lessons.js";
import { go } from "../../core/router.js";
import { ago, date as fmtDate, num } from "../../core/format.js";
import { dataOf, loadAll } from "../../data/store.js";
import { sparkline } from "../charts/line.js";

let current = null;

function close() {
  if (!current) return;
  current.scrim.remove();
  current.drawer.remove();
  document.removeEventListener("keydown", current.onKey);
  current.restore?.focus?.();
  current = null;
}

function open(title, subtitle, bodyNodes, { actions = null, key = null } = {}) {
  close();
  const restore = document.activeElement;
  const scrim = h("div.scrim", { onclick: close });
  const body = h("div.drawer__body", { tabindex: "-1" });
  mount(body, bodyNodes);

  const drawer = h("aside.drawer", { role: "dialog", "aria-modal": "true", "aria-label": title },
    h("header.drawer__head", null,
      h("div.grow", null,
        h("div.eyebrow", subtitle),
        h("h3", { style: { fontSize: "var(--t-h4)", fontWeight: 620, letterSpacing: "-0.015em" } }, title)),
      actions,
      h("button.iconbtn", { type: "button", "aria-label": "Close", onclick: close }, icon("close", 13))
    ),
    body
  );

  const onKey = (event) => {
    if (event.key === "Escape") { event.stopPropagation(); close(); return; }
    if (event.key !== "Tab") return;
    const focusable = drawer.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  document.addEventListener("keydown", onKey);
  document.body.append(scrim, drawer);
  body.focus();
  current = { scrim, drawer, onKey, restore, key };
}

export function openConcept(conceptId) {
  const concept = findConcept(conceptId);
  if (!concept) return;
  open(concept.term, "Concept", [
    explainPanel(conceptId),
    h("div", { style: { marginTop: "var(--s5)" } },
      h("button.btn.btn--block", { type: "button", onclick: () => { close(); go(`/knowledge/${conceptId}`); } },
        "Open in knowledge base", icon("chevron", 12)))
  ]);
}

/**
 * Live readings for a node, where the pipeline actually tracks it.
 *
 * The datasets are loaded lazily: only `markets` is fetched at boot, so opening a
 * macro node would otherwise show nothing until the economy view had been visited.
 * Rendered into a slot so the drawer can open immediately and fill in when the
 * fetch settles — and skipped entirely if the reader has moved on by then.
 */
function trackingSlot(nodeId, proxies) {
  const slot = h("div");

  const render = () => {
    const tracked = [
      ...(dataOf("markets")?.series || []),
      ...(dataOf("indicators")?.series || []),
    ].filter((entry) => entry.nodeId === nodeId);

    mount(slot,
      tracked.length ? h("div", { style: { marginBottom: "var(--s5)" } }, panel({
        title: "Currently",
        sub: "as the pipeline last read it",
        flush: true,
        body: h("div.rows", null, ...tracked.map((entry) => {
          const yoy = entry.yoy?.length ? entry.yoy : null;
          const points = yoy || entry.observations || [];
          const latest = yoy ? yoy.at(-1).v : entry.latest;
          const asOf = yoy ? yoy.at(-1).d : entry.asOf;
          return h("div.rowitem", null,
            h("span.grow", null,
              h("div", { style: { fontSize: "var(--t-body)" } },
                entry.label, yoy ? h("span.dim", " · year over year") : null),
              h("div.row-s", { style: { marginTop: "var(--s1)" } },
                cite(entry.sourceId, { url: entry.url }),
                h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, fmtDate(asOf)))),
            h("span", { style: { width: "86px" } }, sparkline(points.slice(-40))),
            h("span.mono", { style: { fontSize: "var(--t-lead)", minWidth: "72px", textAlign: "right" } },
              Number.isFinite(latest) ? num(latest, entry.unit === "index" ? 0 : 2) : "—",
              yoy ? "%" : ""));
        })),
      })) : null,

      proxies?.length ? h("div", { style: { marginBottom: "var(--s5)" } },
        h("div.eyebrow", { style: { marginBottom: "var(--s2)" } },
          tracked.length ? "Also worth following" : "Follow it with"),
        h("div.row-s.wrap", null, ...proxies.map((code) => h("span.chip.mono", code)))) : null,
    );
  };

  render();
  loadAll(["markets", "indicators"]).then(() => {
    if (current?.key === `node:${nodeId}`) render();
  });

  return slot;
}

export function openNode(nodeId) {
  const target = findNode(nodeId);
  if (!target) return;

  const downstream = propagate([{ id: nodeId, magnitude: 1 }], { maxDepth: 3 });
  const drivers = inEdges(nodeId);
  const concepts = conceptsForNode(nodeId);
  const lessons = lessonsForNode(nodeId);

  open(target.label, `${target.kind} · ${target.group}`, [
    h("p.prose", { style: { marginBottom: "var(--s5)" } }, target.blurb),

    trackingSlot(nodeId, target.proxies),

    panel({
      title: `What moves it (${drivers.length})`,
      flush: true,
      body: drivers.length ? h("div.rows", null, ...drivers.slice(0, 8).map((edge) =>
        h("button.rowitem", { onclick: () => openNode(edge.from) },
          h("span.grow", null,
            h("div.row-s", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, findNode(edge.from)?.label),
              badge(edge.sign > 0 ? "same direction" : "inverse", edge.sign > 0 ? "up" : "down")),
            h("div.rowitem__body", { style: { marginTop: "2px" } }, edge.why),
            h("div.row-s", { style: { marginTop: "var(--s2)" } },
              confidence(edge.confidence), lag(edge.lag))),
          icon("chevron", 12))
      )) : h("div.panel__body", null, h("span.dim", "Nothing upstream in the model — this is a source variable.")),
    }),

    h("div", { style: { marginTop: "var(--s5)" } }, panel({
      title: `What it moves (${downstream.effects.length})`,
      sub: "modelled transmission, not a forecast",
      flush: true,
      body: downstream.effects.length ? h("div.rows", null, ...downstream.effects.slice(0, 10).map((effect) =>
        h("button.rowitem", { onclick: () => openNode(effect.id) },
          h("span.rowitem__rank", `${effect.order}°`),
          h("span.grow", null,
            h("div.row-s", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
              direction(effect.direction, effect.node.kind),
              effect.contested && badge("contested", "warn")),
            h("div.row-s", { style: { marginTop: "var(--s1)" } },
              confidence(effect.confidence), lag(effect.lagMonths),
              h("span.faint", { style: { fontSize: "var(--t-tiny)" } },
                `${effect.pathCount} path${effect.pathCount === 1 ? "" : "s"}`))),
          icon("chevron", 12))
      )) : h("div.panel__body", null, h("span.dim", "Terminal node — nothing downstream in the model.")),
    })),

    concepts.length ? h("div", { style: { marginTop: "var(--s5)" } }, panel({
      title: "Understand it",
      flush: true,
      body: h("div.rows", null, ...concepts.map((concept) =>
        h("button.rowitem", { onclick: () => openConcept(concept.id) },
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, concept.term),
            h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, concept.levels.beginner)),
          icon("chevron", 12)))),
    })) : null,

    lessons.length ? h("div", { style: { marginTop: "var(--s5)" } }, panel({
      title: "Historical precedent",
      flush: true,
      body: h("div.rows", null, ...lessons.map((lesson) =>
        h("button.rowitem", { onclick: () => { close(); go(`/history/${lesson.id}`); } },
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, lesson.title),
            h("div.rowitem__meta", lesson.era)),
          icon("chevron", 12)))),
    })) : null,

    h("div.row-s", { style: { marginTop: "var(--s6)" } },
      h("button.btn.grow", { type: "button", onclick: () => { close(); go(`/simulator?shock=${nodeId}`); } },
        icon("flask", 12), "Run a shock"),
      h("button.btn.grow", { type: "button", onclick: () => { close(); go(`/graph?focus=${nodeId}`); } },
        icon("graph", 12), "See in graph")),
  ], { key: `node:${nodeId}` });
}

export function openStory(cluster) {
  const lead = cluster.lead || cluster;
  open(lead.title, cluster.isDecision ? "Policy decision" : "Development", [
    h("div.row-s.wrap", { style: { marginBottom: "var(--s4)" } },
      cite(lead.sourceId, { url: lead.url, at: lead.publishedAt }),
      cluster.score !== undefined && badge(`rank #${cluster.rank}`, "accent")),

    lead.summary && h("p.prose", { style: { marginBottom: "var(--s5)" } }, lead.summary),

    cluster.whyRanked && h("div", { style: { marginBottom: "var(--s5)" } },
      h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "Why it ranks here"),
      h("div.callout", cluster.whyRanked)),

    cluster.nodes?.length ? h("div", { style: { marginBottom: "var(--s5)" } },
      h("div.eyebrow", { style: { marginBottom: "var(--s2)" } }, "Touches"),
      h("div.row-s.wrap", null, ...cluster.nodes.map((entry) => {
        const target = findNode(entry.nodeId || entry.id);
        return target ? h("button.chip", { type: "button", onclick: () => openNode(target.id) }, target.label) : null;
      }).filter(Boolean))) : null,

    cluster.items?.length > 1 ? panel({
      title: `Related items (${cluster.items.length - 1})`, flush: true,
      body: h("div.rows", null, ...cluster.items.slice(1).map((item) =>
        h("a.rowitem", { href: item.url, target: "_blank", rel: "noopener noreferrer" },
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, item.title),
            h("div.row-s", { style: { marginTop: "var(--s1)" } },
              cite(item.sourceId), h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, ago(item.publishedAt)))),
          icon("external", 12)))),
    }) : null,

    h("a.btn.btn--primary.btn--block", { href: lead.url, target: "_blank", rel: "noopener noreferrer",
      style: { marginTop: "var(--s6)" } }, "Read the primary source", icon("external", 12)),
  ]);
}

export { close as closeDrawer, open as openDrawer };
