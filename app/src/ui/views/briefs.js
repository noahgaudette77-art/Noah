/** DAILY BRIEF · WEEKLY BRIEF · ARCHIVE */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse } from "../../core/router.js";
import { profile } from "../../core/store.js";
import { load, dataOf, statusOf, STATUS } from "../../data/store.js";
import {
  panel,
  pageHead,
  badge,
  cite,
  confidence,
  direction,
  lag,
  chip,
  sectionHead,
  callout,
  empty,
  meter,
} from "../components/kit.js";
import { pipelineEmpty, loadingRows } from "../components/states.js";
import { openStory, openNode } from "../components/drawer.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { ago, date as fmtDate, num, weekStart, weekLabel, plural } from "../../core/format.js";
import { lesson as findLesson } from "../../content/lessons.js";
import { XP } from "../../domain/learning.js";

/* ========================= DAILY ========================= */

export function dailyBrief() {
  const root = h("div.view-inner");
  Promise.all([load("stories"), load("markets"), load("research"), load("filings")]).then(render);

  function render() {
    const stories = dataOf("stories");
    const markets = dataOf("markets");
    const research = dataOf("research");
    const filings = dataOf("filings");
    const clusters = stories?.clusters || [];

    const sections = [
      { id: "markets", label: "Markets", items: marketLines(markets) },
      { id: "economy", label: "Economy & policy", items: filterStories(clusters, ["monetary", "economy"]) },
      { id: "business", label: "Corporate", items: filingLines(filings) },
      { id: "geo", label: "Policy & geopolitics", items: filterStories(clusters, ["policy", "banking"]) },
      { id: "tech", label: "Technology & AI", items: researchLines(research) },
    ];

    mount(root,
      pageHead("Five-minute brief",
        `${fmtDate(new Date())}. The smallest number of things that changed and are worth your attention.`,
        [h("button.btn", { type: "button", onclick: () => go("/weekly") }, icon("calendar", 12), "Weekly brief")]),

      statusOf("stories").status === STATUS.LOADING ? loadingRows(6) :
      !clusters.length && !markets ? pipelineEmpty("stories") :

      h("div.stack", null,
        ...sections.map((section, index) => panel({
          title: `${index + 1}. ${section.label}`,
          sub: section.items.length ? null : "nothing material",
          flush: true,
          body: section.items.length
            ? h("div.rows", null, ...section.items)
            : h("div.panel__body", null,
                h("span.dim", { style: { fontSize: "var(--t-small)" } },
                  "Nothing in this section met the threshold today. An empty section is a true statement about a quiet day.")),
        })),

        panel({
          title: "6. What changed since yesterday",
          body: changeSummary(clusters),
        }),

        panel({
          title: "7. What to watch next",
          flush: true,
          body: watchList(clusters),
        }),

        h("div.row-s", null,
          h("button.btn.btn--primary", {
            type: "button",
            onclick: () => {
              const learning = profile.at("learning", {});
              profile.merge("learning", { xp: (learning.xp || 0) + XP.briefRead });
              go("/learn?start=quiz");
            },
          }, icon("check", 12), "Mark read and quiz me"),
          h("button.btn", { type: "button", onclick: () => go("/stream") }, "Full stream", icon("chevron", 11)))
      )
    );
  }

  return root;
}

function filterStories(clusters, topics) {
  return clusters
    .filter((cluster) => cluster.topics?.some((topic) => topics.includes(topic)))
    .slice(0, 4)
    .map((cluster) => h("button.rowitem", { onclick: () => openStory(cluster) },
      h("span.grow", null,
        h("div.rowitem__title.clamp-2", cluster.lead.title),
        h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
          cite(cluster.lead.sourceId, { url: cluster.lead.url, at: cluster.lead.publishedAt }),
          ...cluster.nodes.slice(0, 2).map((entry) => badge(findNode(entry.nodeId)?.label || entry.nodeId)))),
      icon("chevron", 12)));
}

function marketLines(markets) {
  if (!markets?.series?.length) return [];
  const byId = new Map(markets.series.map((entry) => [entry.id, entry]));
  return ["curve_2s10s", "ust10y", "usdcad", "eurusd"]
    .map((id) => byId.get(id))
    .filter((entry) => entry && entry.latest !== null)
    .map((entry) => h("div.rowitem", null,
      h("span.grow", null,
        h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.label),
        h("div.row-s", { style: { marginTop: "var(--s1)" } },
          cite(entry.sourceId), h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, `as of ${fmtDate(entry.asOf)}`))),
      h("span.mono", { style: { fontSize: "var(--t-lead)" } }, num(entry.latest, entry.unit === "%" || entry.unit === "pp" ? 2 : 4)),
      h("span.mono", { class: entry.change > 0 ? "up" : entry.change < 0 ? "down" : "dim", style: { minWidth: "62px", textAlign: "right" } },
        entry.change === null ? "—" : `${entry.change > 0 ? "+" : ""}${num(entry.change, 3)}`)));
}

function filingLines(filings) {
  if (!filings?.filings?.length) return [];
  return filings.filings.slice(0, 5).map((entry) => h("a.rowitem", {
    href: entry.url, target: "_blank", rel: "noopener noreferrer",
  },
    h("span.grow", null,
      h("div.row-s", null, badge(entry.form, "accent"), h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.company)),
      h("div.row-s", { style: { marginTop: "var(--s1)" } },
        cite("sec-edgar", { at: entry.filedAt }),
        entry.description && h("span.faint.truncate", { style: { fontSize: "var(--t-tiny)", maxWidth: "34ch" } }, entry.description))),
    icon("external", 12)));
}

function researchLines(research) {
  if (!research?.papers?.length) return [];
  return research.papers.slice(0, 4).map((paper) => h("a.rowitem", {
    href: paper.url, target: "_blank", rel: "noopener noreferrer",
  },
    h("span.grow", null,
      h("div.rowitem__title.clamp-2", { style: { fontSize: "var(--t-body)" } }, paper.title),
      h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
        cite("arxiv", { at: paper.publishedAt }),
        badge("preprint · not peer reviewed", "warn"))),
    icon("external", 12)));
}

function changeSummary(clusters) {
  const seen = profile.at("seen", {});
  const fresh = clusters.filter((cluster) => !seen[cluster.id]);
  const decisions = clusters.filter((cluster) => cluster.isDecision);

  return h("div.stack-s", null,
    h("p.prose", { style: { fontSize: "var(--t-body)" } },
      fresh.length
        ? `${plural(fresh.length, "development")} you have not opened, ${decisions.length} of which ${decisions.length === 1 ? "is" : "are"} an actual policy decision rather than commentary on one.`
        : "You have opened everything currently in the stream."),
    clusters.length ? h("div.row-s.wrap", null,
      ...topNodes(clusters).map(([nodeId, count]) =>
        chip(`${findNode(nodeId)?.label || nodeId} · ${count}`, { onclick: () => openNode(nodeId) }))) : null,
    h("p.faint", { style: { fontSize: "var(--t-tiny)" } },
      "Counted against what you have opened in this browser. Nothing about your reading leaves this device."));
}

function topNodes(clusters) {
  const counts = new Map();
  for (const cluster of clusters) {
    for (const entry of cluster.nodes || []) {
      counts.set(entry.nodeId, (counts.get(entry.nodeId) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function watchList(clusters) {
  const nodes = topNodes(clusters).slice(0, 5);
  if (!nodes.length) {
    return h("div.panel__body", null, h("span.dim", "Nothing tracked yet."));
  }
  return h("div.rows", null, ...nodes.map(([nodeId]) => {
    const target = findNode(nodeId);
    if (!target) return null;
    return h("button.rowitem", { onclick: () => openNode(nodeId) },
      h("span.grow", null,
        h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, target.label),
        h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, target.blurb),
        target.proxies?.length && h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
          ...target.proxies.slice(0, 3).map((code) => h("span.chip.mono", code)))),
      icon("chevron", 12));
  }).filter(Boolean));
}

/* ========================= WEEKLY ========================= */

export function weeklyBrief() {
  const root = h("div.view-inner");
  const { params } = parse();
  const requested = params.get("week");

  load("briefs").then(() => {
    const index = dataOf("briefs");
    const week = requested || index?.briefs?.[0]?.weekStart || weekStart();
    loadBrief(week).then((brief) => render(brief, week, index));
  });

  async function loadBrief(week) {
    try {
      const url = new URL(`../../../../data/briefs/${week}.json`, import.meta.url).href;
      const response = await fetch(url);
      return response.ok ? await response.json() : null;
    } catch { return null; }
  }

  function render(brief, week, index) {
    if (!brief) {
      mount(root,
        pageHead("Weekly intelligence brief", "Generated every Monday from the week's material."),
        panel({ title: `Week of ${week}`, body: pipelineEmpty("briefs") }));
      return;
    }

    const lesson = findLesson(brief.lesson?.id);

    mount(root,
      pageHead(`Weekly intelligence brief`,
        `${weekLabel(brief.weekStart)} · generated ${ago(brief.generatedAt)} from ${brief.headline.count} clustered developments across ${brief.headline.sources} sources.`,
        [
          index?.briefs?.length > 1 && h("select.select", {
            style: { width: "auto" },
            onchange: (event) => go(`/weekly?week=${event.target.value}`),
          }, ...index.briefs.map((entry) => h("option", { value: entry.weekStart, selected: entry.weekStart === brief.weekStart },
            weekLabel(entry.weekStart)))),
          h("button.btn", { type: "button", onclick: () => go("/archive") }, icon("archive", 12), "Archive"),
        ]),

      h("div.stack", null,
        section("The ten things you need to know",
          "Ranked by source tier, recency, corroboration and modelled reach. Every ranking is explained.",
          h("div.rows", null, ...brief.bigPicture.map((item) => bigPictureRow(item)))),

        brief.connectTheDots?.length ? section("Connect the dots",
          "Pairs of this week's subjects that share a causal route through the world model.",
          h("div.stack", null, ...brief.connectTheDots.map(connectionCard))) : null,

        brief.marketNote?.length ? section("Markets",
          "Official end-of-day series, with what the level means rather than only what it is.",
          h("div.rows", null, ...brief.marketNote.map(marketReadingRow))) : null,

        brief.watchNext?.length ? section("What to watch next",
          "Where the model says the consequences of this week's developments should show up first.",
          h("div.rows", null, ...brief.watchNext.map(watchRow))) : null,

        brief.risks?.length ? section("Global risk radar",
          "Ranked by how far each risk propagates in the model. No probabilities are attached, because none would be defensible.",
          h("div.rows", null, ...brief.risks.map(riskRow))) : null,

        lesson ? section("One thing you should know",
          brief.lesson.revisit ? "A revisit — the corpus has cycled." : "This week's historical brief.",
          h("button.rowitem", { onclick: () => go(`/history/${lesson.id}`) },
            h("span.grow", null,
              h("div.rowitem__title", { style: { fontSize: "var(--t-h4)" } }, lesson.title),
              h("div.rowitem__meta", { style: { marginBottom: "var(--s2)" } }, `${lesson.era} · ${lesson.minutes} min`),
              h("div.rowitem__body", lesson.hook)),
            icon("chevron", 14))) : null,

        section("Test yourself",
          `Ten questions seeded on this week — ${brief.quiz.composition.authored} written against common misconceptions, ${brief.quiz.composition.generated} generated from the world model.`,
          h("button.btn.btn--primary", { type: "button", onclick: () => go(`/learn?start=quiz&seed=${encodeURIComponent(brief.quiz.seed)}`) },
            icon("spark", 12), "Start the weekly quiz")),

        brief.research?.length ? section("Research radar",
          "Recent preprints. Presence here is evidence a claim was made, not that it holds.",
          h("div.rows", null, ...brief.research.map((paper) => h("a.rowitem", {
            href: paper.url, target: "_blank", rel: "noopener noreferrer",
          },
            h("span.grow", null,
              h("div.rowitem__title.clamp-2", { style: { fontSize: "var(--t-body)" } }, paper.title),
              h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
                cite("arxiv", { at: paper.publishedAt }),
                ...(paper.categories || []).slice(0, 3).map((category) => badge(category)))),
            icon("external", 12))))) : null,

        callout("Coverage", brief.coverage.note)
      )
    );
  }

  return root;
}

const section = (title, sub, body) => h("section", null, sectionHead(title, sub), panel({ flush: true, body }));

function bigPictureRow(item) {
  return h("div.rowitem", null,
    h("span.rowitem__rank", `${item.rank}`),
    h("div.grow.stack-s", null,
      h("div", null,
        h("div.row-s.wrap", { style: { marginBottom: "var(--s2)" } },
          item.isDecision && badge("policy decision", "accent"),
          ...item.nodes.slice(0, 3).map((entry) =>
            h("button.chip", { type: "button", onclick: () => openNode(entry.id) }, entry.label))),
        h("a", { href: item.url, target: "_blank", rel: "noopener noreferrer",
          class: "rowitem__title", style: { display: "block", color: "var(--ink)" } }, item.title),
        h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
          ...item.sources.map((sourceId) => cite(sourceId)),
          h("span.faint", { style: { fontSize: "var(--t-tiny)" } },
            `${plural(item.itemCount, "item")} · ${ago(item.publishedAt)}`))),

      h("div.callout", null,
        h("div.callout__label", "Why it ranks here"),
        item.whyRanked),

      item.sharedWith
        ? h("p.dim", { style: { fontSize: "var(--t-small)" } },
            `Transmission is the same as item #${item.sharedWith} — it acts on the same variable, so the chain is not repeated here.`)
        : item.transmission?.length
          ? h("div", null,
              h("div.callout__label", { style: { marginBottom: "var(--s2)" } },
                `What follows, if ${item.projectedFrom?.label} moves`),
              h("div.stack-xs", null, ...item.transmission.map((effect) =>
                h("div.row-s.wrap", { style: { fontSize: "var(--t-small)" } },
                  h("span.badge", `${effect.order}°`),
                  h("button", {
                    type: "button", style: { color: "var(--ink)", fontWeight: 550 },
                    onclick: () => openNode(effect.id),
                  }, effect.label),
                  direction(effect.direction),
                  confidence(effect.confidence),
                  lag(effect.lagMonths),
                  effect.contested && badge("contested", "warn")))))
          : null,

      item.others?.length ? h("details", null,
        h("summary", { style: { fontSize: "var(--t-tiny)", color: "var(--ink-3)", cursor: "pointer" } },
          `${plural(item.others.length, "related item")}`),
        h("div.stack-xs", { style: { marginTop: "var(--s2)" } }, ...item.others.map((other) =>
          h("a", { href: other.url, target: "_blank", rel: "noopener noreferrer",
            style: { fontSize: "var(--t-small)" } }, other.title)))) : null
    )
  );
}

function connectionCard(connection) {
  return h("div.rowitem", null,
    h("div.grow.stack-s", null,
      h("div.row-s.wrap", null,
        h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } },
          `${connection.fromLabel} → ${connection.toLabel}`),
        badge(`${connection.hops} hops`),
        confidence(connection.confidence),
        badge(connection.sign > 0 ? "same direction" : "inverse", connection.sign > 0 ? "up" : "down")),
      h("div.mono.dim", { style: { fontSize: "var(--t-tiny)", lineHeight: 1.5 } }, connection.chain),
      h("div.stack-xs", null, ...connection.steps.map((step, index) =>
        h("div", { style: { fontSize: "var(--t-small)", color: "var(--ink-2)" } },
          h("b", { style: { color: "var(--ink)" } }, `${index + 1}. ${step.from} → ${step.to}. `), step.why)))));
}

function marketReadingRow(entry) {
  return h("div.rowitem", null,
    h("span.grow", null,
      h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.label),
      h("div.rowitem__body", { style: { marginTop: "2px" } }, entry.reading),
      h("div.row-s", { style: { marginTop: "var(--s2)" } },
        cite(entry.sourceId), h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, `as of ${fmtDate(entry.asOf)}`))),
    h("div", { style: { textAlign: "right" } },
      h("div.mono", { style: { fontSize: "var(--t-h4)" } }, num(entry.value, 2)),
      h("div.mono", { class: entry.change > 0 ? "up" : entry.change < 0 ? "down" : "dim", style: { fontSize: "var(--t-tiny)" } },
        entry.change === null ? "—" : `${entry.change > 0 ? "+" : ""}${num(entry.change, 3)} ${entry.changeLabel}`)));
}

function watchRow(entry) {
  return h("button.rowitem", { onclick: () => openNode(entry.node) },
    h("span.grow", null,
      h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.label),
      h("div.rowitem__meta", { style: { marginBottom: "var(--s2)" } }, `because: ${entry.because}`),
      h("div.row-s.wrap", null, ...entry.watch.map((item) =>
        h("span.chip", null, item.label, " ", direction(item.direction))))),
    icon("chevron", 12));
}

function riskRow(risk) {
  return h("button.rowitem", { onclick: () => openNode(risk.id) },
    h("span.grow", null,
      h("div.row-s.wrap", null,
        h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, risk.label),
        risk.inFocus && badge("in this week's material", "accent")),
      h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, risk.blurb),
      h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
        ...risk.channels.map((channel) => h("span.chip", null, channel.label, " ", direction(channel.direction))))),
    h("div", { style: { width: "56px" } },
      h("div.eyebrow", { style: { textAlign: "right", marginBottom: "2px" } }, "reach"),
      meter(risk.reach, { max: 4, tone: "down" })));
}

/* ========================= ARCHIVE ========================= */

export function archiveView() {
  const root = h("div.view-inner");
  load("briefs").then(render);

  function render() {
    const index = dataOf("briefs");
    const briefs = index?.briefs || [];

    mount(root,
      pageHead("Intelligence archive",
        "Every Monday brief, kept permanently. Over time this becomes a record of what was thought at the time — which is the only way to check whether it was right."),

      briefs.length ? h("div.stack", null,
        panel({
          flush: true,
          body: h("div.rows", null, ...briefs.map((entry) => h("button.rowitem", {
            onclick: () => go(`/weekly?week=${entry.weekStart}`),
          },
            h("span.grow", null,
              h("div.rowitem__title", weekLabel(entry.weekStart)),
              h("div.rowitem__meta", { style: { marginBottom: "var(--s2)" } },
                `${entry.headline.count} developments · ${entry.headline.decisions} policy decisions · generated ${ago(entry.generatedAt)}`),
              h("div.stack-xs", null, ...(entry.top || []).map((title) =>
                h("div", { style: { fontSize: "var(--t-small)", color: "var(--ink-2)" } }, `· ${title}`))),
              entry.lesson && h("div.row-s", { style: { marginTop: "var(--s2)" } },
                badge("lesson", "cyan"), h("span.dim", { style: { fontSize: "var(--t-tiny)" } }, entry.lesson))),
            icon("chevron", 12)))),
        }),
        callout("Why this matters",
          "A forecast you cannot go back and check is not a forecast, it is a mood. The archive exists so that January's view of the year can be compared against what happened — see the forecast scorecard for the formal version."),
      ) : panel({ body: pipelineEmpty("briefs") })
    );
  }

  return root;
}
