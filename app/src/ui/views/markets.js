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
import { num, compact, date as fmtDate, plural, freshness } from "../../core/format.js";
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
        "Equities, volatility, commodities, credit, yields and currencies, taken from the institutions that publish them or redistribute them under licence. Levels are shown with what they mean, not only what they are.",
        [rangeChips]),

      h("div.row-s.wrap", { style: { marginBottom: "var(--s5)" } },
        badge(`as of ${fmtDate(asOf)}`, freshness(asOf, 20).state === "fresh" ? "up" : "warn"),
        badge("end of day, not real time", "warn"),
        cite("fred"), cite("treasury-fiscal"), cite("boc-valet"), cite("ecb-data")),

      headlineStrip(byId),

      h("div.grid.g-main", { style: { marginTop: "var(--s5)" } },
        h("div.stack", null,
          equitiesPanel(byId, range),
          commoditiesPanel(byId, range),
          termStructure(markets),
          curveSection(markets, byId, range),
          yieldSection(byId, range),
        ),
        h("div.stack", null,
          curvePanel(curve, range),
          riskPanel(byId, range),
          realRatePanel(byId, range),
          fxPanel(byId, range),
          seriesTable(markets.series),
        )
      ),

      h("div", { style: { marginTop: "var(--s7)" } },
        attributionPanel(markets.series))
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

/** The six numbers worth seeing before anything else. */
function headlineStrip(byId) {
  const picks = [
    ["sp500", 0], ["nasdaq", 0], ["vix", 2],
    ["wti", 2], ["ust10y", 2], ["hy_oas", 2],
  ];
  const cells = picks.map(([id, digits]) => {
    const entry = byId.get(id);
    if (!entry || entry.latest === null) return null;
    const pctChange = percentChange(entry);
    return h("div.stat", { style: { padding: "var(--s4) var(--panel-pad)",
      borderRight: "1px solid var(--line-faint)", borderBottom: "1px solid var(--line-faint)" } },
      h("span.stat__label.truncate", { title: entry.label }, entry.label),
      h("span.stat__value", num(entry.latest, digits)),
      h("span", { class: `stat__delta ${pctChange > 0 ? "up" : pctChange < 0 ? "down" : "dim"}` },
        pctChange === null ? "—" : `${pctChange > 0 ? "+" : ""}${num(pctChange, 2)}%`),
      h("span.stat__note", fmtDate(entry.asOf, { month: "short", day: "numeric" })));
  }).filter(Boolean);

  return cells.length ? panel({ flush: true, body: h("div.statgrid", null, ...cells) }) : null;
}

const percentChange = (entry) => {
  const points = entry.observations;
  if (!points || points.length < 2) return null;
  const prior = points[points.length - 2].v;
  return prior ? ((points.at(-1).v - prior) / Math.abs(prior)) * 100 : null;
};

function equitiesPanel(byId, range) {
  const picks = ["sp500", "nasdaq", "djia"].map((id) => byId.get(id)).filter(Boolean);
  if (!picks.length) return null;

  // Indices sit at very different levels, so absolute lines are unreadable
  // together. Rebasing to 100 at the start of the window compares them.
  const series = picks.map((entry, index) => {
    const points = clip(entry.observations, range.days);
    const base = points[0]?.v || 1;
    return {
      id: entry.id, label: entry.label, colour: SERIES_COLOURS[index],
      points: points.map((point) => ({ d: point.d, v: (point.v / base) * 100 })),
    };
  });

  return panel({
    title: "Equity indices",
    sub: `${range.label} · rebased to 100`,
    actions: badge("via FRED", "cyan"),
    body: h("div.stack-s", null,
      lineChart({ series, height: 220, format: (v) => num(v, 0), ariaLabel: "Equity indices" }),
      h("div.row-s.wrap", null, ...picks.map((entry) =>
        h("span.chip", null, entry.label, " ", h("b.mono", num(entry.latest, 0)))))),
    foot: "Rebased because the levels are not comparable and the shapes are. Index values are end-of-day.",
  });
}

function commoditiesPanel(byId, range) {
  const oil = byId.get("wti");
  const gas = byId.get("henry_hub");
  const copper = byId.get("copper");
  if (!oil && !gas && !copper) return null;

  return panel({
    title: "Commodities",
    flush: true,
    body: h("div", null, ...[oil, gas, copper].filter(Boolean).map((entry) =>
      h("div.panel__body", { style: { borderBottom: "1px solid var(--line-faint)" } },
        h("div.spread", { style: { marginBottom: "var(--s2)" } },
          h("div", null,
            h("div", { style: { fontSize: "var(--t-body)", fontWeight: 550 } }, entry.label),
            h("div.rowitem__meta", entry.unit)),
          h("div", { style: { textAlign: "right" } },
            h("div.mono", { style: { fontSize: "var(--t-h4)" } },
              num(entry.latest, entry.id === "copper" ? 0 : 2)),
            (() => { const change = percentChange(entry); return h("div.mono", {
              class: change > 0 ? "up" : change < 0 ? "down" : "dim", style: { fontSize: "var(--t-tiny)" } },
              change === null ? "—" : `${change > 0 ? "+" : ""}${num(change, 2)}%`); })())),
        lineChart({ series: [{ id: entry.id, label: entry.label, points: clip(entry.observations, range.days) }],
          height: 92, showAxis: false, format: (v) => num(v, entry.id === "copper" ? 0 : 2) }),
        entry.nodeId && h("button.btn.btn--sm.btn--ghost", { type: "button", style: { marginTop: "var(--s2)" },
          onclick: () => openNode(entry.nodeId) }, "Trace it", icon("chevron", 11))))),
  });
}

function riskPanel(byId, range) {
  const vix = byId.get("vix");
  const hy = byId.get("hy_oas");
  const ig = byId.get("ig_oas");
  const nfci = byId.get("nfci");
  if (!vix && !hy) return null;

  const spreads = [hy, ig].filter(Boolean).map((entry, index) => ({
    id: entry.id, label: entry.label, colour: SERIES_COLOURS[index + 1],
    points: clip(entry.observations, range.days),
  }));

  return panel({
    title: "Risk",
    sub: "volatility, credit and financial conditions",
    body: h("div.stack-s", null,
      vix && h("div", null,
        h("div.spread", { style: { marginBottom: "var(--s2)" } },
          h("span.eyebrow", "VIX"),
          h("span.mono", { style: { fontSize: "var(--t-h4)" } }, num(vix.latest, 2))),
        lineChart({ series: [{ id: "vix", label: "VIX", points: clip(vix.observations, range.days) }],
          height: 86, showAxis: false, format: (v) => num(v, 0) })),
      spreads.length ? h("div", null,
        h("div.eyebrow", { style: { marginBottom: "var(--s2)" } }, "Credit spreads, percentage points"),
        lineChart({ series: spreads, height: 100, format: (v) => num(v, 1) })) : null,
      nfci && h("div.spread", { style: { paddingTop: "var(--s3)", borderTop: "1px solid var(--line-faint)" } },
        h("div", null,
          h("div", { style: { fontSize: "var(--t-body)" } }, "Financial conditions"),
          h("div.rowitem__meta", nfci.latest > 0 ? "tighter than average" : "looser than average")),
        h("span.mono", { class: nfci.latest > 0 ? "down" : "up", style: { fontSize: "var(--t-h4)" } },
          num(nfci.latest, 2)))),
    foot: "Spreads widen well before defaults rise. A calm VIX with widening spreads is the combination worth noticing.",
  });
}

function realRatePanel(byId, range) {
  const real = byId.get("real_10y");
  const breakeven = byId.get("breakeven_10y");
  const mortgage = byId.get("mortgage30");
  if (!real) return null;

  return panel({
    title: "Real rates and expectations",
    body: h("div.stack-s", null,
      lineChart({
        series: [
          { id: "real", label: "10y real yield", points: clip(real.observations, range.days), colour: SERIES_COLOURS[0] },
          breakeven && { id: "be", label: "10y breakeven", points: clip(breakeven.observations, range.days), colour: SERIES_COLOURS[2] },
        ].filter(Boolean),
        height: 150, format: (v) => `${num(v, 2)}%`,
      }),
      mortgage && h("div.spread", { style: { paddingTop: "var(--s3)", borderTop: "1px solid var(--line-faint)" } },
        h("span", { style: { fontSize: "var(--t-body)" } }, "30-year mortgage"),
        h("span.mono", { style: { fontSize: "var(--t-h4)" } }, `${num(mortgage.latest, 2)}%`)),
      h("button.btn.btn--sm.btn--block", { type: "button", onclick: () => openConcept("real-vs-nominal") },
        icon("brain", 11), "Explain real vs nominal")),
    foot: "The real yield is what governs investment decisions. The breakeven is what the market prices for inflation — contaminated by liquidity and risk premia, and still the best available read.",
  });
}

/**
 * Attribution is a condition of using this data, not a footnote. FRED
 * redistributes third-party series and each carries its own copyright.
 */
function attributionPanel(allSeries) {
  const holders = new Map();
  for (const entry of allSeries) {
    if (!entry.copyright) continue;
    if (!holders.has(entry.copyright)) holders.set(entry.copyright, []);
    holders.get(entry.copyright).push(entry);
  }
  const publicDomain = allSeries.filter((entry) => entry.sourceId === "fred" && !entry.copyright);

  return panel({
    title: "Attribution",
    sub: "a condition of use, not a footnote",
    flush: true,
    body: h("div.rows", null,
      ...[...holders.entries()].map(([holder, entries]) => h("div.rowitem", null,
        h("span.grow", null,
          h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, holder),
          h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
            ...entries.map((entry) => entry.url
              ? h("a.chip", { href: entry.url, target: "_blank", rel: "noopener noreferrer" }, entry.label)
              : h("span.chip", entry.label)))))),
      publicDomain.length ? h("div.rowitem", null,
        h("span.grow", null,
          h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, "US government agencies — public domain"),
          h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
            ...publicDomain.map((entry) => entry.url
              ? h("a.chip", { href: entry.url, target: "_blank", rel: "noopener noreferrer" }, entry.label)
              : h("span.chip", entry.label))))) : null),
    foot: h("span", null,
      "Retrieved from ", h("a", { href: "https://fred.stlouisfed.org/", target: "_blank", rel: "noopener noreferrer" },
        "FRED, Federal Reserve Bank of St. Louis"),
      ". Every series links back to its own FRED page, where the licence and revision history live."),
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
        h("th", "Series"), h("th", "Group"), h("th", "Trend"),
        h("th.r", "Latest"), h("th.r", "As of"))),
      h("tbody", null, ...[...series]
        .sort((a, b) => (a.group || "zz").localeCompare(b.group || "zz") || a.label.localeCompare(b.label))
        .map((entry) => h("tr", null,
          h("td", null,
            entry.url
              ? h("a", { href: entry.url, target: "_blank", rel: "noopener noreferrer",
                  class: "truncate", style: { maxWidth: "24ch", display: "block" } }, entry.label)
              : h("div.truncate", { style: { maxWidth: "24ch" } }, entry.label),
            h("div.row-s", null,
              entry.nodeId && h("button", {
                type: "button", style: { fontSize: "var(--t-micro)", color: "var(--cyan)" },
                onclick: () => openNode(entry.nodeId),
              }, "in world model"),
              entry.copyright && h("span.faint", { style: { fontSize: "var(--t-micro)" },
                title: `© ${entry.copyright}` }, `© ${entry.copyright.split(" ")[0]}`))),
          h("td.dim", { style: { fontSize: "var(--t-tiny)" } }, entry.group || "—"),
          h("td", { style: { width: "92px" } }, sparkline(entry.observations.slice(-50))),
          h("td.r", num(entry.latest, entry.unit === "%" || entry.unit === "pp" ? 2 : entry.unit === "index" ? 2 : 4)),
          h("td.r.dim", { style: { fontSize: "var(--t-tiny)" } }, fmtDate(entry.asOf, { month: "short", day: "numeric" }))
        ))))),
  });
}

/* ========================= ECONOMY ========================= */

export function economyView() {
  const root = h("div.view-inner.view-inner--wide");
  Promise.all([load("indicators"), load("markets"), load("stories")]).then(render);

  function render() {
    const indicators = dataOf("indicators");
    if (statusOf("indicators").status === STATUS.LOADING) { mount(root, loadingRows(8)); return; }
    if (!indicators?.series?.length) {
      mount(root, pageHead("Economy", "The slow variables."),
        panel({ body: pipelineEmpty("indicators") }));
      return;
    }

    const { params } = parse();
    const range = RANGES.find((entry) => entry.id === params.get("range")) || RANGES[4];
    const byId = new Map(indicators.series.map((entry) => [entry.id, entry]));
    const asOf = indicators.series.map((s) => s.asOf).filter(Boolean).sort().pop();

    mount(root,
      pageHead("Economy",
        "Inflation, labour and activity as the statistical agencies publish them. These series are revised, released with a lag, and worth reading as trends rather than prints.",
        [h("div.row-s", null, ...RANGES.map((entry) =>
          chip(entry.label, { pressed: entry.id === range.id,
            onclick: () => { setParam("range", entry.id); render(); } })))]),

      h("div.row-s.wrap", { style: { marginBottom: "var(--s5)" } },
        badge(`latest observation ${fmtDate(asOf)}`, "cyan"),
        badge("revised and lagged", "warn"),
        cite("fred"), cite("worldbank")),

      macroHeadline(byId),

      h("div.grid.g-main", { style: { marginTop: "var(--s5)" } },
        h("div.stack", null,
          inflationPanel(byId, range),
          labourPanel(byId, range),
          activityPanel(byId, range),
        ),
        h("div.stack", null,
          modelVariablesPanel(indicators),
          structuralPanel(indicators),
          policyStreamPanel(),
        )
      )
    );
  }

  return root;
}

function macroHeadline(byId) {
  const cells = [
    ["core_cpi", "Core CPI", "yoy", 2, "%"],
    ["unemployment", "Unemployment", "level", 1, "%"],
    ["fed_funds", "Fed funds", "level", 2, "%"],
    ["job_openings", "Job openings", "level", 0, "k"],
  ].map(([id, label, mode, digits, unit]) => {
    const entry = byId.get(id);
    if (!entry) return null;
    const points = mode === "yoy" ? entry.yoy : entry.observations;
    if (!points?.length) return null;
    const latest = points.at(-1);
    const prior = points.length > 1 ? points[points.length - 2].v : null;
    const change = prior === null ? null : latest.v - prior;
    return h("div.stat", { style: { padding: "var(--s4) var(--panel-pad)",
      borderRight: "1px solid var(--line-faint)", borderBottom: "1px solid var(--line-faint)" } },
      h("span.stat__label", mode === "yoy" ? `${label} · year over year` : label),
      h("span.stat__value", num(latest.v, digits), h("span.dim", { style: { fontSize: "0.6em" } }, unit)),
      h("span", { class: `stat__delta ${change > 0 ? "up" : change < 0 ? "down" : "dim"}` },
        change === null ? "—" : `${change > 0 ? "+" : ""}${num(change, digits)} vs prior`),
      h("span.stat__note", fmtDate(latest.d, { month: "short", year: "numeric" })));
  }).filter(Boolean);

  return cells.length ? panel({ flush: true, body: h("div.statgrid", null, ...cells) }) : null;
}

function inflationPanel(byId, range) {
  const series = [
    ["cpi", "Headline CPI"], ["core_cpi", "Core CPI"], ["core_pce", "Core PCE"],
  ].map(([id, label], index) => {
    const entry = byId.get(id);
    if (!entry?.yoy?.length) return null;
    return { id, label, colour: SERIES_COLOURS[index], points: clip(entry.yoy, range.days) };
  }).filter(Boolean);

  if (!series.length) return null;

  return panel({
    title: "Inflation",
    sub: `${range.label} · year over year`,
    body: h("div.stack-s", null,
      lineChart({ series, height: 220, format: (v) => `${num(v, 1)}%`,
        reference: { value: 2, label: "2% target" },
        ariaLabel: "Inflation, year over year" }),
      h("p.dim", { style: { fontSize: "var(--t-small)" } },
        "The line at 2% is the Federal Reserve's target, which is specified on core PCE rather than on CPI. ",
        "Core is used because it forecasts headline better than headline does — not because food and fuel do not matter."),
      h("button.btn.btn--sm.btn--block", { type: "button", onclick: () => openConcept("core-inflation") },
        icon("brain", 11), "Explain core inflation")),
    foot: "Index levels converted to a twelve-month rate, which is how anyone actually reads them.",
  });
}

function labourPanel(byId, range) {
  const unemployment = byId.get("unemployment");
  const openings = byId.get("job_openings");
  const payrolls = byId.get("payrolls");
  if (!unemployment) return null;

  // Payrolls is a level; the monthly change is the number anyone quotes.
  const payrollChange = payrolls?.observations?.length > 1
    ? payrolls.observations.slice(1).map((point, index) => ({
        d: point.d, v: point.v - payrolls.observations[index].v,
      }))
    : [];

  return panel({
    title: "Labour",
    sub: range.label,
    body: h("div.stack-s", null,
      lineChart({
        series: [
          { id: "u", label: "Unemployment rate", points: clip(unemployment.observations, range.days), colour: SERIES_COLOURS[0] },
        ],
        height: 150, format: (v) => `${num(v, 1)}%`, ariaLabel: "Unemployment rate",
      }),
      payrollChange.length ? h("div", null,
        h("div.eyebrow", { style: { marginBottom: "var(--s2)" } }, "Monthly payroll change, thousands"),
        lineChart({ series: [{ id: "p", label: "Payroll change", points: clip(payrollChange, range.days) }],
          height: 110, showZero: true, format: (v) => num(v, 0) })) : null,
      openings ? h("div.spread", { style: { paddingTop: "var(--s3)", borderTop: "1px solid var(--line-faint)" } },
        h("div", null,
          h("div", { style: { fontSize: "var(--t-body)" } }, "Job openings"),
          h("div.rowitem__meta", "falling openings without rising unemployment is the benign path")),
        h("span.mono", { style: { fontSize: "var(--t-h4)" } }, compact(openings.latest * 1000))) : null,
      h("button.btn.btn--sm.btn--block", { type: "button", onclick: () => openConcept("beveridge-curve") },
        icon("brain", 11), "Explain the Beveridge curve")),
  });
}

function activityPanel(byId, range) {
  const gdp = byId.get("real_gdp");
  const industrial = byId.get("industrial_production");
  const housing = byId.get("housing_starts");
  const sentiment = byId.get("consumer_sentiment");
  if (!gdp && !industrial) return null;

  const gdpGrowth = gdp?.observations?.length > 4
    ? gdp.observations.slice(4).map((point, index) => ({
        d: point.d,
        v: ((point.v - gdp.observations[index].v) / gdp.observations[index].v) * 100,
      }))
    : [];

  return panel({
    title: "Activity",
    sub: range.label,
    body: h("div.stack-s", null,
      gdpGrowth.length ? h("div", null,
        h("div.eyebrow", { style: { marginBottom: "var(--s2)" } }, "Real GDP, year over year"),
        lineChart({ series: [{ id: "gdp", label: "Real GDP", points: clip(gdpGrowth, range.days) }],
          height: 130, showZero: true, format: (v) => `${num(v, 1)}%` })) : null,
      industrial ? h("div", null,
        h("div.eyebrow", { style: { marginBottom: "var(--s2)" } }, "Industrial production, index"),
        lineChart({ series: [{ id: "ip", label: "Industrial production", points: clip(industrial.observations, range.days) }],
          height: 110, format: (v) => num(v, 0) })) : null,
      h("div.statgrid", { style: { border: 0 } },
        housing && stat({ label: "Housing starts", value: compact(housing.latest * 1000),
          note: fmtDate(housing.asOf, { month: "short", year: "numeric" }) }),
        sentiment && stat({ label: "Consumer sentiment", value: num(sentiment.latest, 1),
          note: "weak predictor of spending, strong predictor of politics" }))),
    foot: "GDP is quarterly and heavily revised; industrial production is monthly and turns earlier.",
  });
}

/**
 * Derived from the data rather than hand-listed: the panel claims to name what the
 * model tracks, so a hard-coded list quietly becomes a false claim the moment the
 * pipeline gains or loses a series.
 */
function modelVariablesPanel(indicators) {
  const macroNodes = [...new Set((indicators?.series || []).map((entry) => entry.nodeId))]
    .filter((nodeId) => nodeId && findNode(nodeId))
    .sort((a, b) => findNode(a).group.localeCompare(findNode(b).group)
      || findNode(a).label.localeCompare(findNode(b).label));
  if (!macroNodes.length) return null;

  return panel({
    title: `Macro variables tracked (${macroNodes.length})`,
    sub: "each one a node in the causal model",
    flush: true,
    body: h("div.rows", null, ...macroNodes.map((nodeId) => {
      const target = findNode(nodeId);
      if (!target) return null;
      const concepts = conceptsForNode(nodeId);
      return h("button.rowitem", { onclick: () => openNode(nodeId) },
        h("span.grow", null,
          h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, target.label),
          h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, target.blurb),
          concepts.length ? h("div.row-s", { style: { marginTop: "var(--s2)" } },
            badge(`${concepts.length} concept${concepts.length === 1 ? "" : "s"}`, "cyan")) : null),
        icon("chevron", 12));
    }).filter(Boolean)),
  });
}

function structuralPanel(indicators) {
  const structural = indicators.series.filter((entry) => entry.id.startsWith("wb_"));
  if (!structural.length) return null;

  return panel({
    title: "Structural",
    sub: "World Bank · annual",
    flush: true,
    body: h("div", null, ...structural.map((entry) => h("div.panel__body", {
      style: { borderBottom: "1px solid var(--line-faint)" },
    },
      h("div.spread", { style: { marginBottom: "var(--s3)" } },
        h("div", null,
          h("div", { style: { fontSize: "var(--t-body)", fontWeight: 550 } }, entry.label),
          h("div.rowitem__meta", entry.unit)),
        h("div", { style: { textAlign: "right" } },
          h("div.mono", { style: { fontSize: "var(--t-h4)" } }, num(entry.latest, 2)),
          h("div.rowitem__meta", fmtDate(entry.asOf, { year: "numeric" })))),
      lineChart({ series: [{ id: entry.id, label: entry.label, points: entry.observations }],
        height: 90, showAxis: false, format: (v) => num(v, 1) }),
      entry.nodeId && h("button.btn.btn--sm.btn--ghost", { type: "button", style: { marginTop: "var(--s2)" },
        onclick: () => openNode(entry.nodeId) }, "Where this propagates", icon("chevron", 11))))),
    foot: "Annual, revised, and typically a year or more behind the present. That lag is a property of the series, not a defect of the pipeline.",
  });
}

function policyStreamPanel() {
  const stories = dataOf("stories");
  const relevant = (stories?.clusters || [])
    .filter((cluster) => cluster.topics?.some((topic) => ["monetary", "economy"].includes(topic)))
    .slice(0, 6);

  return panel({
    title: "Policy in the stream",
    flush: true,
    body: relevant.length
      ? h("div.rows", null, ...relevant.map((cluster) =>
          h("button.rowitem", { onclick: () => openStory(cluster) },
            h("span.grow", null,
              h("div.rowitem__title.clamp-2", { style: { fontSize: "var(--t-body)" } }, cluster.lead.title),
              h("div.row-s", { style: { marginTop: "var(--s2)" } },
                cite(cluster.lead.sourceId, { at: cluster.lead.publishedAt }))),
            icon("chevron", 12))))
      : h("div.panel__body", null, h("span.dim", "Nothing policy-related in the current stream.")),
  });
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
