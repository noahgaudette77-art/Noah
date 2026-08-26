/** MARKETS · ECONOMY · INTELLIGENCE STREAM */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse, setParam } from "../../core/router.js";
import { load, dataOf, statusOf, STATUS } from "../../data/store.js";
import {
  panel,
  pageHead,
  badge,
  cite,
  chip,
  stat,
  callout,
  empty,
  meter,
} from "../components/kit.js";
import { pipelineEmpty, loadingRows } from "../components/states.js";
import { lineChart, sparkline, SERIES_COLOURS } from "../charts/line.js";
import { curveChart } from "../charts/curve.js";
import { openStory, openNode, openConcept } from "../components/drawer.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { num, date as fmtDate, plural, freshness } from "../../core/format.js";
import { conceptsForNode } from "../../content/concepts.js";

const RANGES = [
  { id: "1m", label: "1M", days: 31 },
  { id: "3m", label: "3M", days: 92 },
  { id: "6m", label: "6M", days: 183 },
  { id: "1y", label: "1Y", days: 366 },
  { id: "all", label: "All", days: Infinity },
];

function clip(observations, days) {
  if (!observations?.length || days === Infinity) return observations || [];
  const cutoff = Date.now() - days * 86_400_000;
  const kept = observations.filter((point) => Date.parse(point.d) >= cutoff);
  return kept.length > 1 ? kept : observations.slice(-2);
}

export function marketsView() {
  const root = h("div.view-inner.view-inner--wide");
  load("markets").then(render);

  function render() {
    const markets = dataOf("markets");
    if (statusOf("markets").status === STATUS.LOADING) { mount(root, loadingRows(8)); return; }
    if (!markets?.series?.length) {
      mount(root, pageHead("Markets", "Official end-of-day series."), panel({ body: pipelineEmpty("markets") }));
      return;
    }

    const { params } = parse();
    const range = RANGES.find((entry) => entry.id === params.get("range")) || RANGES[2];
    const byId = new Map(markets.series.map((entry) => [entry.id, entry]));
    const curve = byId.get("curve_2s10s");
    const asOf = markets.series.map((s) => s.asOf).filter(Boolean).sort().pop();

    const rangeChips = h("div.row-s", null, ...RANGES.map((entry) =>
      chip(entry.label, { pressed: entry.id === range.id, onclick: () => { setParam("range", entry.id); render(); } })));

    mount(root,
      pageHead("Markets",
        "Yields, the curve and currencies, taken directly from the institutions that publish them. Levels are shown with what they mean, not only what they are.",
        [rangeChips]),

      h("div.row-s.wrap", { style: { marginBottom: "var(--s5)" } },
        badge(`as of ${fmtDate(asOf)}`, freshness(asOf, 20).state === "fresh" ? "up" : "warn"),
        badge("end of day, not real time", "warn"),
        cite("treasury-fiscal"), cite("boc-valet"), cite("ecb-data")),

      h("div.grid.g-main", null,
        h("div.stack", null,
          termStructure(markets),
          curveSection(markets, byId, range),
          yieldSection(byId, range),
        ),
        h("div.stack", null,
          curvePanel(curve, range),
          fxPanel(byId, range),
          seriesTable(markets.series),
        )
      ),

      h("div", { style: { marginTop: "var(--s7)" } },
        callout("What is not here",
          h("span", null,
            "Equity index levels, commodity prices and volatility are absent because no source that publishes them without credentials permits automated access. ",
            "The data layer has a slot for them; it stays empty rather than being filled with an unreliable scrape. ",
            h("a", { href: "#/sources" }, "See the source register"),
            " for what would need configuring."),
          "warn"))
    );
  }

  return root;
}

/**
 * The term structure: yields plotted against maturity rather than time. The
 * shape is the information — a chart of the level tells you far less.
 */
function termStructure(markets) {
  if (!markets?.curve?.points?.length) return null;
  const points = markets.curve.points;
  const short = points.find((p) => p.tenor === "2y")?.yield;
  const long = points.find((p) => p.tenor === "10y")?.yield;
  const shape = short === undefined || long === undefined ? null
    : long - short < -0.05 ? { label: "inverted", tone: "down",
        note: "Short yields above long. The market is pricing lower policy rates ahead." }
    : long - short < 0.5 ? { label: "flat", tone: "warn",
        note: "Little compensation for duration. The market expects the policy path to go roughly nowhere in real terms." }
    : { label: "positively sloped", tone: "up", note: "The normal state." };

  return panel({
    title: "Term structure",
    sub: `every tenor, as of ${fmtDate(markets.curve.asOf)}`,
    actions: shape && badge(shape.label, shape.tone),
    body: h("div.stack-s", null,
      curveChart({ points, height: 210, label: "US Treasury term structure" }),
      shape && h("p.dim", { style: { fontSize: "var(--t-small)" } }, shape.note)),
    foot: h("span", null,
      "Maturity is on a log scale, because the shape that matters lives at the short end. ",
      h("button", { type: "button", style: { color: "var(--cyan)" }, onclick: () => openConcept("term-premium") },
        "What term premium is")),
  });
}

function curveSection(markets, byId, range) {
  const tenors = ["ust3m", "ust2y", "ust10y", "ust30y"];
  const series = tenors.map((id, index) => {
    const entry = byId.get(id);
    return entry && { id, label: entry.label, points: clip(entry.observations, range.days), colour: SERIES_COLOURS[index] };
  }).filter(Boolean);

  return panel({
    title: "US Treasury yields",
    sub: `${range.label} · par yield curve rates`,
    actions: badge("tier 1 primary", "up"),
    body: lineChart({ series, height: 240, format: (v) => `${num(v, 2)}%`, ariaLabel: "US Treasury yields" }),
    foot: h("span", null, "Published daily by the US Treasury. ",
      h("button", { type: "button", style: { color: "var(--cyan)" }, onclick: () => openConcept("bond-yields") },
        "What a yield actually is")),
  });
}

function yieldSection(byId, range) {
  const canada = ["cangov2y", "cangov10y", "boc_policy_rate"].map((id, index) => {
    const entry = byId.get(id);
    return entry && { id, label: entry.label, points: clip(entry.observations, range.days), colour: SERIES_COLOURS[index + 1] };
  }).filter(Boolean);

  if (!canada.length) return null;

  return panel({
    title: "Canada",
    sub: `${range.label} · policy rate and benchmark yields`,
    body: lineChart({ series: canada, height: 200, format: (v) => `${num(v, 2)}%`, ariaLabel: "Canadian rates" }),
    foot: h("span", null, "Bank of Canada Valet API. Canadian mortgages reset every few years, so policy reaches households far faster here than in the United States."),
  });
}

function curvePanel(curveSeries, range) {
  if (!curveSeries) return null;
  const latest = curveSeries.latest;
  const inverted = latest < 0;

  return panel({
    title: "Yield curve (10y − 2y)",
    actions: badge(inverted ? "inverted" : latest < 0.5 ? "flat" : "positive", inverted ? "down" : latest < 0.5 ? "warn" : "up"),
    body: h("div.stack-s", null,
      stat({
        label: "Current spread", value: num(latest, 2), unit: "pp", large: true,
        delta: curveSeries.change !== null ? `${curveSeries.change > 0 ? "+" : ""}${num(curveSeries.change, 3)}` : null,
        note: `as of ${fmtDate(curveSeries.asOf)}`,
      }),
      lineChart({
        series: [{ id: "curve", label: "10y − 2y", points: clip(curveSeries.observations, range.days) }],
        height: 130, showZero: true, format: (v) => num(v, 2),
      }),
      h("p.dim", { style: { fontSize: "var(--t-small)" } },
        inverted
          ? "Inverted: the market prices lower policy rates ahead. Inversion has preceded most post-war US recessions, with lags from months to over two years — it is not a timing signal."
          : "Positively sloped is the normal state. The information is in the change, not the level."),
      h("button.btn.btn--sm.btn--block", { type: "button", onclick: () => openConcept("yield-curve") },
        icon("brain", 11), "Explain the yield curve")),
  });
}

function fxPanel(byId, range) {
  const pairs = [["usdcad", "USD/CAD"], ["eurusd", "EUR/USD"]]
    .map(([id]) => byId.get(id)).filter(Boolean);
  if (!pairs.length) return null;

  return panel({
    title: "Currencies",
    flush: true,
    body: h("div", null, ...pairs.map((entry) => h("div.panel__body", { style: { borderBottom: "1px solid var(--line-faint)" } },
      h("div.spread", { style: { marginBottom: "var(--s2)" } },
        h("div", null,
          h("div", { style: { fontSize: "var(--t-body)", fontWeight: 550 } }, entry.label),
          h("div.rowitem__meta", entry.unit)),
        h("div", { style: { textAlign: "right" } },
          h("div.mono", { style: { fontSize: "var(--t-h4)" } }, num(entry.latest, 4)),
          h("div.mono", { class: entry.change > 0 ? "up" : entry.change < 0 ? "down" : "dim", style: { fontSize: "var(--t-tiny)" } },
            entry.change === null ? "—" : `${entry.change > 0 ? "+" : ""}${num(entry.change, 4)}`))),
      lineChart({ series: [{ id: entry.id, label: entry.label, points: clip(entry.observations, range.days) }],
        height: 88, showAxis: false, format: (v) => num(v, 4) })
    ))),
  });
}

function seriesTable(series) {
  return panel({
    title: "All series",
    sub: `${series.length}`,
    flush: true,
    body: h("div.tbl-wrap", null, h("table.tbl.tbl--zebra", null,
      h("thead", null, h("tr", null,
        h("th", "Series"), h("th", "Trend"), h("th.r", "Latest"), h("th.r", "As of"))),
      h("tbody", null, ...series.map((entry) => h("tr", null,
        h("td", null,
          h("div.truncate", { style: { maxWidth: "22ch" } }, entry.label),
          entry.nodeId && h("button", {
            type: "button", style: { fontSize: "var(--t-micro)", color: "var(--cyan)" },
            onclick: () => openNode(entry.nodeId),
          }, "in world model")),
        h("td", { style: { width: "92px" } }, sparkline(entry.observations.slice(-50))),
        h("td.r", num(entry.latest, entry.unit === "%" || entry.unit === "pp" ? 2 : 4)),
        h("td.r.dim", { style: { fontSize: "var(--t-tiny)" } }, fmtDate(entry.asOf, { month: "short", day: "numeric" }))
      ))))),
  });
}

/* ========================= ECONOMY ========================= */

export function economyView() {
  const root = h("div.view-inner");
  Promise.all([load("indicators"), load("markets"), load("stories")]).then(render);

  function render() {
    const indicators = dataOf("indicators");
    const markets = dataOf("markets");
    const stories = dataOf("stories");

    const macroNodes = ["policy_rate", "core_inflation", "unemployment", "gdp", "productivity", "aging"];

    mount(root,
      pageHead("Economy",
        "The slow variables. Structural series move over years and are revised for longer — which is exactly why a monthly print tells you little about them."),

      h("div.grid.g-main", null,
        h("div.stack", null,
          indicators?.series?.length
            ? panel({
                title: "Structural indicators",
                sub: "World Bank · annual",
                flush: true,
                body: h("div", null, ...indicators.series.map((entry) => h("div.panel__body", {
                  style: { borderBottom: "1px solid var(--line-faint)" },
                },
                  h("div.spread", { style: { marginBottom: "var(--s3)" } },
                    h("div", null,
                      h("div", { style: { fontSize: "var(--t-base)", fontWeight: 550 } }, entry.label),
                      h("div.rowitem__meta", `${entry.unit} · ${plural(entry.count, "observation")}`)),
                    h("div", { style: { textAlign: "right" } },
                      h("div.mono", { style: { fontSize: "var(--t-h4)" } }, num(entry.latest, 2)),
                      h("div.rowitem__meta", fmtDate(entry.asOf, { year: "numeric" })))),
                  lineChart({ series: [{ id: entry.id, label: entry.label, points: entry.observations }],
                    height: 120, format: (v) => num(v, 1) }),
                  entry.nodeId && h("button.btn.btn--sm.btn--ghost", {
                    type: "button", style: { marginTop: "var(--s3)" },
                    onclick: () => openNode(entry.nodeId),
                  }, "Where this propagates", icon("chevron", 11))
                ))),
                foot: h("span", null, "Annual data, revised, and typically a year or more behind the present. That lag is a property of the series, not a defect of the pipeline."),
              })
            : panel({ title: "Structural indicators", body: pipelineEmpty("indicators") }),
        ),

        h("div.stack", null,
          panel({
            title: "The macro variables the model tracks",
            flush: true,
            body: h("div.rows", null, ...macroNodes.map((nodeId) => {
              const target = findNode(nodeId);
              if (!target) return null;
              const concepts = conceptsForNode(nodeId);
              return h("button.rowitem", { onclick: () => openNode(nodeId) },
                h("span.grow", null,
                  h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, target.label),
                  h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, target.blurb),
                  concepts.length && h("div.row-s", { style: { marginTop: "var(--s2)" } },
                    badge(`${concepts.length} concept${concepts.length === 1 ? "" : "s"}`, "cyan"))),
                icon("chevron", 12));
            }).filter(Boolean)),
          }),

          panel({
            title: "Policy in the stream",
            flush: true,
            body: (() => {
              const relevant = (stories?.clusters || [])
                .filter((cluster) => cluster.topics?.some((topic) => ["monetary", "economy"].includes(topic)))
                .slice(0, 6);
              return relevant.length
                ? h("div.rows", null, ...relevant.map((cluster) =>
                    h("button.rowitem", { onclick: () => openStory(cluster) },
                      h("span.grow", null,
                        h("div.rowitem__title.clamp-2", { style: { fontSize: "var(--t-body)" } }, cluster.lead.title),
                        h("div.row-s", { style: { marginTop: "var(--s2)" } },
                          cite(cluster.lead.sourceId, { at: cluster.lead.publishedAt }))),
                      icon("chevron", 12))))
                : h("div.panel__body", null, h("span.dim", "Nothing policy-related in the current stream."));
            })(),
          }),
        )
      )
    );
  }

  return root;
}

/* ========================= STREAM ========================= */

export function streamView() {
  const root = h("div.view-inner");
  let filter = "all";
  load("stories").then(render);

  function render() {
    const stories = dataOf("stories");
    if (statusOf("stories").status === STATUS.LOADING) { mount(root, loadingRows(10)); return; }
    if (!stories?.clusters?.length) {
      mount(root, pageHead("Intelligence stream", "Everything, ranked."), panel({ body: pipelineEmpty("stories") }));
      return;
    }

    const clusters = stories.clusters;
    const topics = [...new Set(clusters.flatMap((cluster) => cluster.topics || []))].sort();
    const filtered = filter === "all" ? clusters
      : filter === "decisions" ? clusters.filter((cluster) => cluster.isDecision)
      : clusters.filter((cluster) => cluster.topics?.includes(filter));

    mount(root,
      pageHead("Intelligence stream",
        `${clusters.length} clusters from ${stories.counts.raw} raw items — ${stories.counts.removed} duplicates removed. Ranked by an explainable score, not by recency.`),

      h("div.row-s.wrap", { style: { marginBottom: "var(--s5)" } },
        chip(`All ${clusters.length}`, { pressed: filter === "all", onclick: () => { filter = "all"; render(); } }),
        chip(`Decisions ${clusters.filter((c) => c.isDecision).length}`, {
          pressed: filter === "decisions", onclick: () => { filter = "decisions"; render(); } }),
        ...topics.map((topic) => chip(topic, { pressed: filter === topic, onclick: () => { filter = topic; render(); } }))),

      panel({
        flush: true,
        body: filtered.length ? h("div.rows", null, ...filtered.map((cluster) => streamRow(cluster)))
          : h("div.panel__body", null, h("span.dim", "No items match this filter.")),
        foot: h("span", null,
          "Score components: source tier, recency, corroboration across independent sources, modelled reach, document kind and entity specificity. Hover any score to see its breakdown."),
      })
    );
  }

  return root;
}

function streamRow(cluster) {
  const componentRows = Object.entries(cluster.components || {})
    .map(([key, value]) => `${key} ${Math.round(value * 100)}`).join(" · ");

  return h("button.rowitem", { onclick: () => openStory(cluster) },
    h("span.rowitem__rank", `#${cluster.rank}`),
    h("span.grow", null,
      h("div.row-s.wrap", { style: { marginBottom: "2px" } },
        cluster.isDecision && badge("decision", "accent"),
        ...(cluster.nodes || []).slice(0, 3).map((entry) =>
          badge(findNode(entry.nodeId)?.label || entry.nodeId)),
        ...(cluster.topics || []).slice(0, 2).map((topic) => badge(topic, "cyan"))),
      h("div.rowitem__title.clamp-2", cluster.lead.title),
      cluster.lead.summary && h("div.rowitem__body.clamp-2", { style: { marginTop: "var(--s1)" } }, cluster.lead.summary),
      h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
        cite(cluster.lead.sourceId, { url: cluster.lead.url, at: cluster.lead.publishedAt }),
        cluster.size > 1 && badge(`${cluster.size} items`),
        cluster.sources.length > 1 && badge(`${cluster.sources.length} sources`, "up"))),
    h("div", { style: { width: "62px", textAlign: "right" }, title: componentRows },
      h("div.mono", { style: { fontSize: "var(--t-base)" } }, num(cluster.score * 100, 0)),
      meter(cluster.score, { max: 1, height: 3 })));
}
