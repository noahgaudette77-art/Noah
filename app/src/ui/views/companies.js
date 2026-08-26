/** COMPANIES — a fundamental screen and a per-company research frame. */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse, setParam } from "../../core/router.js";
import { profile as userProfile } from "../../core/store.js";
import { load, dataOf, statusOf, STATUS } from "../../data/store.js";
import { panel, pageHead, badge, chip, cite, callout, sectionHead, meter, stat, empty, confidence, direction, lag, toast } from "../components/kit.js";
import { pipelineEmpty, loadingRows } from "../components/states.js";
import { openNode } from "../components/drawer.js";
import { lineChart, sparkline, SERIES_COLOURS } from "../charts/line.js";
import { barRows } from "../charts/curve.js";
import {
  fundamentalProfile, categoriesFor, ALL_CATEGORIES, UNAVAILABLE_CATEGORIES,
  researchFrame, timeline, SCORE_FACTORS,
} from "../../domain/company.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { num, compact, pct, date as fmtDate, ago, plural } from "../../core/format.js";

const COLUMNS = [
  { id: "score", label: "Profile", align: "r", get: (row) => row.profile.score,
    render: (row) => h("span.row-s", { style: { justifyContent: "flex-end" } },
      h("span.mono", String(row.profile.score)),
      h("span", { style: { width: "34px" } }, meter(row.profile.score, { max: 100, height: 3 }))) },
  { id: "revenue", label: "Revenue", align: "r", get: (row) => row.company.derived.revenue,
    render: (row) => h("span.mono", null, compact(row.company.derived.revenue),
      h("span.faint", { style: { fontSize: "var(--t-micro)", marginLeft: "3px" } }, row.company.currency)) },
  { id: "growth", label: "3y CAGR", align: "r", get: (row) => row.company.derived.revenueCagr3y,
    render: (row) => signed(row.company.derived.revenueCagr3y) },
  { id: "yoy", label: "Latest yr", align: "r", get: (row) => row.company.derived.revenueGrowth,
    render: (row) => signed(row.company.derived.revenueGrowth) },
  { id: "opmargin", label: "Op margin", align: "r", get: (row) => row.company.derived.operatingMargin,
    render: (row) => plain(row.company.derived.operatingMargin) },
  { id: "fcf", label: "FCF margin", align: "r", get: (row) => row.company.derived.fcfMargin,
    render: (row) => plain(row.company.derived.fcfMargin) },
  { id: "roe", label: "ROE", align: "r", get: (row) => row.company.derived.returnOnEquity,
    render: (row) => plain(row.company.derived.returnOnEquity) },
  { id: "netcash", label: "Net cash", align: "r", get: (row) => row.company.derived.netCashToAssets,
    render: (row) => signed(row.company.derived.netCashToAssets) },
];

const signed = (value) => Number.isFinite(value)
  ? h("span.mono", { class: value > 0 ? "up" : value < 0 ? "down" : "dim" },
      `${value > 0 ? "+" : ""}${num(value * 100, 1)}%`)
  : h("span.faint", "—");

const plain = (value) => Number.isFinite(value)
  ? h("span.mono", `${num(value * 100, 1)}%`)
  : h("span.faint", "—");

/* ========================= SCREEN ========================= */

export function companiesView() {
  const root = h("div.view-inner.view-inner--wide");
  const { segments } = parse();
  if (segments[1]) { renderCompany(root, segments[1].toUpperCase()); return root; }

  Promise.all([load("fundamentals"), load("filings")]).then(() => renderScreen(root));
  return root;
}

function renderScreen(root) {
  const data = dataOf("fundamentals");
  if (statusOf("fundamentals").status === STATUS.LOADING) { mount(root, loadingRows(8)); return; }
  if (!data?.companies?.length) {
    mount(root, pageHead("Companies", "Reported fundamentals for the companies that sit on a node in the world model."),
      panel({ body: pipelineEmpty("fundamentals") }));
    return;
  }

  const { params } = parse();
  let sort = params.get("sort") || "score";
  let filter = params.get("cat") || "all";

  const render = () => {
    const universe = data.companies;
    const covered = universe.filter((company) => company.hasFundamentals);
    const excluded = universe.filter((company) => !company.hasFundamentals);

    let rows = covered.map((company) => ({
      company,
      profile: fundamentalProfile(company, universe),
      categories: categoriesFor(company),
    }));

    if (filter !== "all") rows = rows.filter((row) => row.categories.some((c) => c.id === filter));

    const column = COLUMNS.find((c) => c.id === sort) || COLUMNS[0];
    rows.sort((a, b) => {
      const av = column.get(a), bv = column.get(b);
      if (!Number.isFinite(av)) return 1;
      if (!Number.isFinite(bv)) return -1;
      return bv - av;
    });

    mount(root,
      pageHead("Companies",
        `${covered.length} companies, each attached to the world-model variable its economics actually depend on. Every figure is as filed with the SEC.`,
        [h("button.btn", { type: "button", onclick: () => go("/watchlist") }, icon("bookmark", 12), "Watchlist")]),

      h("div.callout.callout--warn", { style: { marginBottom: "var(--s5)" } },
        h("div.callout__label", "What this screen cannot tell you"),
        h("p", { style: { marginTop: "var(--s1)" } },
          h("b", "There is no price here, and therefore no valuation. "),
          "A high profile score means a business performs well against these peers on reported figures. It says nothing whatever about whether the shares are attractively priced — which is usually the question. Categories that would need a price (",
          UNAVAILABLE_CATEGORIES.map((c) => c.label).join(", "),
          ") are not offered rather than approximated.")),

      h("div.row-s.wrap", { style: { marginBottom: "var(--s5)" } },
        chip(`All ${covered.length}`, { pressed: filter === "all",
          onclick: () => { filter = "all"; setParam("cat", null); render(); } }),
        ...ALL_CATEGORIES.map((category) => {
          const count = covered.filter((company) => categoriesFor(company).some((c) => c.id === category.id)).length;
          return count ? chip(`${category.label} ${count}`, {
            pressed: filter === category.id, title: category.note,
            onclick: () => { filter = category.id; setParam("cat", category.id); render(); },
          }) : null;
        }).filter(Boolean)),

      panel({
        flush: true,
        body: h("div.tbl-wrap", null, h("table.tbl.tbl--zebra", null,
          h("thead", null, h("tr", null,
            h("th", "Company"),
            h("th", "Model variable"),
            ...COLUMNS.map((col) => h("th", {
              class: col.align === "r" ? "r" : "",
              style: { cursor: "pointer", color: col.id === sort ? "var(--accent)" : null },
              onclick: () => { sort = col.id; setParam("sort", col.id); render(); },
            }, col.label, col.id === sort ? " ▾" : "")),
            h("th", "Trend"))),
          h("tbody", null, ...rows.map((row) => {
            const target = row.company.node ? findNode(row.company.node) : null;
            const series = (row.company.annual.revenue || []).map((point) => ({ d: point.end, v: point.v }));
            return h("tr", { "data-clickable": "", onclick: () => go(`/companies/${row.company.ticker}`) },
              h("td", null,
                h("div.row-s", null,
                  h("span.mono", { style: { fontWeight: 650 } }, row.company.ticker),
                  h("span.dim.truncate", { style: { maxWidth: "20ch", fontSize: "var(--t-tiny)" } }, row.company.name)),
                row.categories.length ? h("div.row-s.wrap", { style: { marginTop: "2px" } },
                  ...row.categories.slice(0, 2).map((category) =>
                    h("span.badge", { title: category.note }, category.label))) : null),
              h("td", null, target
                ? h("button", { type: "button", style: { color: "var(--cyan)", fontSize: "var(--t-tiny)" },
                    onclick: (event) => { event.stopPropagation(); openNode(target.id); } }, target.label)
                : h("span.faint", "—")),
              ...COLUMNS.map((col) => h("td", { class: col.align === "r" ? "r" : "" }, col.render(row))),
              h("td", { style: { width: "92px" } }, sparkline(series)));
          })))),
        foot: h("span", null,
          `Profile is a rank within these ${covered.length} companies across growth, profitability, cash generation, returns, balance sheet and consistency — weighted, and containing no valuation. `,
          h("b", "It is a rank, not a rating.")),
      }),

      excluded.length ? h("div", { style: { marginTop: "var(--s6)" } },
        callout("Not covered",
          h("span", null,
            excluded.map((company) => company.ticker).join(", "),
            excluded.length === 1 ? " resolves" : " resolve",
            " to a registrant with no reported revenue under any known tag — typically a holding entity created in a reorganisation, whose operating history remains under a predecessor CIK. Rather than show a blank row, it is excluded and named here."))) : null,

      h("div", { style: { marginTop: "var(--s7)" } },
        sectionHead("How the profile is built", "Six factors, each a percentile rank within the covered universe"),
        panel({
          flush: true,
          body: h("div.rows", null, ...SCORE_FACTORS.map((factor) => h("div.rowitem", null,
            h("span.grow", null,
              h("div.row-s", null,
                h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, factor.label),
                badge(`${Math.round(factor.weight * 100)}%`)),
              h("div.rowitem__body", { style: { marginTop: "2px" } }, factor.note))))),
        })),

      h("div", { style: { marginTop: "var(--s5)" } },
        h("div.row-s.wrap", null,
          cite("sec-edgar"),
          data.refreshedAt && badge(`fundamentals refreshed ${ago(data.refreshedAt)}`, "cyan"),
          badge("weekly cadence", "cyan")))
    );
  };

  render();
}

/* ========================= COMPANY ========================= */

function renderCompany(root, ticker) {
  Promise.all([load("fundamentals"), load("filings"), load("stories")]).then(() => {
    const data = dataOf("fundamentals");
    const company = data?.companies?.find((entry) => entry.ticker === ticker);

    if (!company) {
      mount(root, pageHead(ticker),
        empty({ title: "Not covered",
          body: "This company is not in the tracked set. Coverage is limited to companies that sit on a node in the world model.",
          action: h("button.btn", { type: "button", onclick: () => go("/companies") }, "All companies") }));
      return;
    }

    const universe = data.companies;
    const scoreProfile = fundamentalProfile(company, universe);
    const categories = categoriesFor(company);
    const frame = researchFrame(company);
    const events = timeline(company, dataOf("filings")?.filings || []);
    const watchlist = userProfile.at("watchlist", []);
    const onWatchlist = watchlist.some((entry) => entry.ticker === ticker);
    const d = company.derived;

    // The currency belongs on the label, not inside the number: a long value plus
    // a suffix wraps the stat onto two lines and breaks the grid's rhythm.
    const money = (value) => value === null || value === undefined ? "—" : compact(value);
    const inCurrency = (label) => `${label} · ${company.currency}`;

    mount(root,
      h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/companies"),
        style: { marginBottom: "var(--s4)" } }, "← Companies"),

      pageHead(company.name,
        [company.ticker, company.sic, company.exchange, company.taxonomy === "ifrs-full" ? "reports under IFRS" : null]
          .filter(Boolean).join(" · "),
        [
          h("button.btn", {
            type: "button",
            onclick: () => {
              if (onWatchlist) {
                userProfile.set({ watchlist: watchlist.filter((entry) => entry.ticker !== ticker) });
                toast(`${ticker} removed from watchlist`);
              } else {
                userProfile.set({ watchlist: [...watchlist, { ticker, name: company.name, addedAt: Date.now() }] });
                toast(`${ticker} added to watchlist`);
              }
              renderCompany(root, ticker);
            },
          }, icon("bookmark", 12), onWatchlist ? "On watchlist" : "Add to watchlist"),
          frame && h("button.btn", { type: "button", onclick: () => go(`/simulator?shock=${frame.node.id}`) },
            icon("flask", 12), "Shock its variable"),
        ]),

      company.hasFundamentals ? h("div.grid.g-main", null,
        h("div.stack", null,
          fundamentalsPanel(company, money, inCurrency),
          revenuePanel(company),
          marginPanel(company),
          frame ? framePanel(frame, company) : null,
          timelinePanel(events, company),
        ),
        h("div.stack", null,
          profilePanel(scoreProfile, categories, company),
          balancePanel(company, money, d, inCurrency),
          frame ? monitorPanel(frame) : null,
          provenancePanel(company),
        )
      ) : panel({
        body: empty({
          icon: "alert", title: "No reported fundamentals",
          body: `${ticker} resolves to CIK ${company.cik} (${company.name}), which has filed no revenue under any tag the extractor knows. This is usually a holding entity created in a reorganisation, whose operating history remains under a predecessor CIK.`,
        }),
      })
    );
  });
}

function fundamentalsPanel(company, money, inCurrency) {
  const d = company.derived;
  return panel({
    title: "As reported",
    sub: `latest full year ended ${fmtDate(d.latestPeriod)}`,
    flush: true,
    body: h("div.statgrid", null,
      stat({ label: inCurrency("Revenue"), value: money(d.revenue), large: true,
        delta: Number.isFinite(d.revenueGrowth) ? `${d.revenueGrowth > 0 ? "+" : ""}${num(d.revenueGrowth * 100, 1)}% yr` : null }),
      stat({ label: "3-year CAGR", value: Number.isFinite(d.revenueCagr3y) ? `${num(d.revenueCagr3y * 100, 1)}%` : "—" }),
      stat({ label: "Operating margin", value: Number.isFinite(d.operatingMargin) ? `${num(d.operatingMargin * 100, 1)}%` : "—" }),
      stat({ label: inCurrency("Free cash flow"), value: money(d.freeCashFlow),
        note: Number.isFinite(d.fcfMargin) ? `${num(d.fcfMargin * 100, 1)}% of revenue` : null }),
      stat({ label: "Return on equity", value: Number.isFinite(d.returnOnEquity) ? `${num(d.returnOnEquity * 100, 1)}%` : "—" }),
      stat({ label: inCurrency("Net cash"), value: money(d.netCash),
        note: d.netCash < 0 ? "net debt" : "net cash" })),
    foot: h("span", null,
      "Figures as filed. ", h("b", "No price, so no valuation"),
      " — the question of whether this is expensive is not one this platform can answer."),
  });
}

function revenuePanel(company) {
  const revenue = (company.annual.revenue || []).map((point) => ({ d: point.end, v: point.v / 1e9 }));
  const income = (company.annual.netIncome || []).map((point) => ({ d: point.end, v: point.v / 1e9 }));
  if (revenue.length < 2) return null;

  return panel({
    title: "Revenue and net income",
    sub: `${plural(revenue.length, "reported year")} · billions of ${company.currency}`,
    body: lineChart({
      series: [
        { id: "revenue", label: "Revenue", points: revenue, colour: SERIES_COLOURS[0] },
        income.length > 1 && { id: "income", label: "Net income", points: income, colour: SERIES_COLOURS[1] },
      ].filter(Boolean),
      height: 210, showZero: true, format: (v) => `${num(v, 0)}B`,
      ariaLabel: `${company.ticker} revenue and net income`,
    }),
    foot: "Restated figures win: where a period was reported more than once, the most recently filed value is used.",
  });
}

function marginPanel(company) {
  const revenue = company.annual.revenue || [];
  const byEnd = (series) => new Map((series || []).map((point) => [point.end, point.v]));
  const gross = byEnd(company.annual.grossProfit);
  const operating = byEnd(company.annual.operatingIncome);
  const net = byEnd(company.annual.netIncome);

  const build = (map) => revenue
    .filter((point) => map.has(point.end) && point.v)
    .map((point) => ({ d: point.end, v: (map.get(point.end) / point.v) * 100 }));

  const series = [
    { id: "gross", label: "Gross", points: build(gross), colour: SERIES_COLOURS[0] },
    { id: "operating", label: "Operating", points: build(operating), colour: SERIES_COLOURS[1] },
    { id: "net", label: "Net", points: build(net), colour: SERIES_COLOURS[2] },
  ].filter((entry) => entry.points.length > 1);

  if (!series.length) return null;

  return panel({
    title: "Margins",
    sub: "share of revenue",
    body: lineChart({ series, height: 180, format: (v) => `${num(v, 0)}%`, ariaLabel: "Margin history" }),
    foot: "Margin direction over several years says more than any single year's level, and is comparable within an industry rather than across them.",
  });
}

function profilePanel(scoreProfile, categories, company) {
  return panel({
    title: "Fundamental profile",
    sub: `rank within ${scoreProfile.peers} covered companies`,
    body: h("div.stack-s", null,
      stat({ label: "Profile score", value: String(scoreProfile.score), large: true,
        note: `${scoreProfile.covered} of ${scoreProfile.total} factors computable` }),
      meter(scoreProfile.score, { max: 100, tone: scoreProfile.score >= 66 ? "up" : scoreProfile.score >= 33 ? "" : "down" }),
      h("hr.rule", { style: { margin: "var(--s4) 0" } }),
      barRows(scoreProfile.factors.filter((factor) => factor.rank !== null).map((factor) => ({
        label: factor.label,
        value: Math.round(factor.rank * 100),
        colour: "var(--cyan)",
      })), { max: 100, format: (v) => `${v}` }),
      categories.length ? h("div", { style: { marginTop: "var(--s4)" } },
        h("div.eyebrow", { style: { marginBottom: "var(--s2)" } }, "Characteristics"),
        h("div.row-s.wrap", null, ...categories.map((category) =>
          h("span.chip", { title: category.note }, category.label)))) : null),
    foot: h("span", null,
      h("b", "Not available: "),
      scoreProfile.missing.join(" ")),
  });
}

function balancePanel(company, money, d, inCurrency) {
  return panel({
    title: "Balance sheet and capital",
    sub: `amounts in ${company.currency}`,
    flush: true,
    body: h("div.rows", null,
      ...[
        ["Total assets", money(lastOf(company.annual.assets))],
        ["Shareholders' equity", money(lastOf(company.annual.equity))],
        ["Cash and equivalents", money(lastOf(company.annual.cash))],
        ["Debt", money((lastOf(company.annual.debtLongTerm) || 0) + (lastOf(company.annual.debtCurrent) || 0))],
        ["Free cash flow", money(d.freeCashFlow)],
        ["Equity / assets", Number.isFinite(d.equityRatio) ? `${num(d.equityRatio * 100, 0)}%` : "—"],
        ["Capex / revenue", Number.isFinite(d.capexIntensity) ? `${num(d.capexIntensity * 100, 1)}%` : "—"],
        ["R&D / revenue", Number.isFinite(d.rndIntensity) ? `${num(d.rndIntensity * 100, 1)}%` : "—"],
        ["Share count vs 3y ago", Number.isFinite(d.sharesChange3y)
          ? `${d.sharesChange3y > 0 ? "+" : ""}${num(d.sharesChange3y * 100, 1)}%` : "—"],
      ].map(([label, value]) => h("div.rowitem", { style: { padding: "var(--s2) var(--panel-pad)" } },
        h("span.grow", { style: { fontSize: "var(--t-body)" } }, label),
        h("span.mono", { style: { fontSize: "var(--t-body)" } }, value)))),
  });
}

const lastOf = (series) => series?.length ? series[series.length - 1].v : null;

function framePanel(frame, company) {
  return panel({
    title: "Research frame",
    sub: `via ${frame.node.label}`,
    body: h("div.stack", null,
      h("p.dim", { style: { fontSize: "var(--t-small)" } },
        "Not a thesis. The model supplies what drives and what pressures this company's variable, each with its mechanism; the filings above supply the figures. The argument is yours to make — which is the only honest division of labour when the platform cannot see a price."),

      h("div", null,
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "What would have to go right"),
        h("div.stack-xs", null, ...frame.drivers.map((edge) => h("div.callout.callout--fact", null,
          h("div.row-s.wrap", { style: { marginBottom: "var(--s1)" } },
            badge(`${edge.order}°`),
            h("button", { type: "button", style: { color: "var(--ink)", fontWeight: 600 },
              onclick: () => openNode(edge.from) }, findNode(edge.from)?.label || edge.from),
            edge.via && h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, `via ${findNode(edge.via)?.label}`),
            confidence(edge.confidence), lag(edge.lag)),
          h("p", edge.why))))),

      frame.pressures.length ? h("div", null,
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "What works against it"),
        h("div.stack-xs", null, ...frame.pressures.map((edge) => h("div.callout.callout--warn", null,
          h("div.row-s.wrap", { style: { marginBottom: "var(--s1)" } },
            h("button", { type: "button", style: { color: "var(--ink)", fontWeight: 600 },
              onclick: () => openNode(edge.from) }, findNode(edge.from)?.label || edge.from),
            confidence(edge.confidence), lag(edge.lag)),
          h("p", edge.why))))) : null,

      frame.risks.length ? h("div", null,
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "Modelled risks that reach it"),
        h("div.stack-xs", null, ...frame.risks.map(({ node: risk, effect }) =>
          h("div.row-s.wrap", { style: { fontSize: "var(--t-small)" } },
            h("button.chip", { type: "button", onclick: () => openNode(risk.id) }, risk.label),
            direction(effect.direction, "sector"),
            badge(`${effect.order}°`),
            confidence(effect.confidence),
            h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, risk.blurb))))) : null,

      frame.downstream.length ? h("div", null,
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, `What ${frame.node.label} in turn moves`),
        h("div.row-s.wrap", null, ...frame.downstream.map((effect) =>
          chip(effect.node.label, { onclick: () => openNode(effect.id) })))) : null),
    foot: "Every line above is an edge in the world model with a stated mechanism and confidence, not an opinion about this company.",
  });
}

function monitorPanel(frame) {
  return panel({
    title: "What to watch each quarter",
    flush: true,
    body: h("div.rows", null, ...frame.monitor.map((item) => h("div.rowitem", null,
      h("span.grow", null,
        h("div.row-s", null,
          h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, item.label),
          item.value !== null && item.value !== undefined && h("span.mono.dim", { style: { fontSize: "var(--t-tiny)" } },
            item.format === "pct" ? `${num(item.value * 100, 1)}%`
              : item.format === "x" ? `${num(item.value, 2)}×` : "")),
        h("div.rowitem__body", { style: { marginTop: "2px" } }, item.why))))),
  });
}

function timelinePanel(events, company) {
  if (!events.length) return null;
  return panel({
    title: "Timeline",
    sub: `reported years and filings · amounts in ${company.currency}`,
    flush: true,
    body: h("div.rows", null, ...events.slice(0, 22).map((event) => {
      if (event.kind === "year") {
        return h("div.rowitem", null,
          h("span.rowitem__rank", { style: { width: "58px", textAlign: "left" } },
            h("span.mono", event.label)),
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.mono", { style: { fontSize: "var(--t-body)" } }, compact(event.revenue)),
              Number.isFinite(event.growth) && signed(event.growth),
              Number.isFinite(event.operatingMargin) &&
                h("span.dim", { style: { fontSize: "var(--t-tiny)" } },
                  `${num(event.operatingMargin * 100, 1)}% operating margin`)),
            h("div.rowitem__meta", `year ended ${fmtDate(event.date)} · filed ${fmtDate(event.filed)} on ${event.form}`)));
      }
      return h("a.rowitem", { href: event.url, target: "_blank", rel: "noopener noreferrer" },
        h("span.rowitem__rank", { style: { width: "58px", textAlign: "left" } }, badge(event.label, "accent")),
        h("span.grow", null,
          h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } },
            event.description || `${event.label} filing`),
          h("div.rowitem__meta", fmtDate(event.date))),
        icon("external", 12));
    })),
  });
}

function provenancePanel(company) {
  return panel({
    title: "Provenance",
    body: h("div.stack-s", null,
      h("div.row-s.wrap", null, cite("sec-edgar", { url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}` })),
      h("div.stack-xs", { style: { fontSize: "var(--t-tiny)", color: "var(--ink-3)" } },
        h("div", null, h("b", "CIK "), company.cik),
        h("div", null, h("b", "Taxonomy "), company.taxonomy),
        h("div", null, h("b", "Reporting currency "), company.currency),
        company.fiscalYearEnd && h("div", null, h("b", "Fiscal year end "), company.fiscalYearEnd)),
      h("details", null,
        h("summary", { style: { fontSize: "var(--t-tiny)", color: "var(--ink-3)", cursor: "pointer" } },
          "XBRL tags used"),
        h("div.stack-xs", { style: { marginTop: "var(--s2)" } },
          ...Object.entries(company.tagsUsed || {}).map(([metric, tags]) =>
            h("div", { style: { fontSize: "var(--t-micro)", fontFamily: "var(--font-mono)", color: "var(--ink-3)" } },
              h("span", { style: { color: "var(--ink-2)" } }, `${metric}: `), tags))))),
    foot: "Tags are listed because they matter: filers move between concepts as standards change, and a single-tag extractor would silently truncate a company's history at the year it switched.",
  });
}
