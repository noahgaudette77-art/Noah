/**
 * FRED — the Federal Reserve Bank of St. Louis.
 *
 * FRED's graph endpoint serves any series as CSV without a key. That single
 * fact closes the largest gap this project had: equity indices, volatility,
 * commodities, credit spreads, real yields, breakevens and the full core macro
 * set, all from one tier-1 aggregator.
 *
 * Attribution is not optional here and is handled per series rather than in
 * aggregate. FRED redistributes third-party data — S&P Dow Jones Indices,
 * Nasdaq, CBOE, ICE, the IMF, Freddie Mac — and each of those carries its own
 * copyright. Every series below records its rights holder, the interface shows
 * it, and each links back to its FRED page. Series sourced from US government
 * agencies are public domain and marked as such.
 */

import { get } from "../lib/http.js";
import { series, emptyResult } from "../lib/schema.js";

const CSV = (id) => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
export const seriesPage = (id) => `https://fred.stlouisfed.org/series/${id}`;

const PUBLIC_DOMAIN = null;   // US government work — no third-party rights holder

/**
 * `market` series go to markets.json and are read as prices; `macro` series go
 * to indicators.json and are read as economic observations. The distinction is
 * about how often they move and how they should be read, not about importance.
 */
const SERIES = [
  /* --- Equities ---------------------------------------------------------- */
  { fred: "SP500", id: "sp500", label: "S&P 500", unit: "index", node: "sp500",
    kind: "market", group: "Equities", copyright: "S&P Dow Jones Indices LLC",
    note: "Large-cap US equities, now heavily weighted toward a handful of technology franchises." },
  { fred: "NASDAQCOM", id: "nasdaq", label: "Nasdaq Composite", unit: "index", node: "nasdaq",
    kind: "market", group: "Equities", copyright: "Nasdaq OMX Group",
    note: "Long-duration growth equity — the most sensitive major index to real rates." },
  { fred: "DJIA", id: "djia", label: "Dow Jones Industrial Average", unit: "index",
    kind: "market", group: "Equities", copyright: "S&P Dow Jones Indices LLC",
    note: "Price-weighted and only thirty names, which makes it a poor index and a famous one." },

  /* --- Volatility and credit --------------------------------------------- */
  { fred: "VIXCLS", id: "vix", label: "VIX", unit: "index", node: "volatility",
    kind: "market", group: "Risk", copyright: "Chicago Board Options Exchange",
    note: "The price of insurance against equity moves. Rises with uncertainty and with leverage unwinds." },
  { fred: "BAMLH0A0HYM2", id: "hy_oas", label: "High-yield credit spread", unit: "pp", node: "credit_spreads",
    kind: "market", group: "Risk", copyright: "ICE Data Indices LLC",
    note: "Option-adjusted spread over Treasuries. The cleanest continuously-priced read on perceived corporate risk." },
  { fred: "BAMLC0A0CM", id: "ig_oas", label: "Investment-grade credit spread", unit: "pp",
    kind: "market", group: "Risk", copyright: "ICE Data Indices LLC",
    note: "The same measure for the investment-grade universe, where the marginal borrower is far larger." },

  /* --- Commodities -------------------------------------------------------- */
  { fred: "DCOILWTICO", id: "wti", label: "Crude oil (WTI)", unit: "USD/bbl", node: "oil",
    kind: "market", group: "Commodities", copyright: PUBLIC_DOMAIN,
    note: "The single most macro-consequential price: an input to nearly everything, and a transfer between producers and consumers." },
  { fred: "DHHNGSP", id: "henry_hub", label: "Natural gas (Henry Hub)", unit: "USD/MMBtu", node: "natgas",
    kind: "market", group: "Commodities", copyright: PUBLIC_DOMAIN,
    note: "Regional rather than global — pipelines and LNG terminals set the price." },
  { fred: "PCOPPUSDM", id: "copper", label: "Copper", unit: "USD/tonne", node: "copper",
    kind: "market", group: "Commodities", copyright: "International Monetary Fund",
    note: "The metal of electrification. Monthly, because the IMF publishes it monthly." },
  { fred: "PNGASEUUSDM", id: "ttf_gas", label: "European natural gas", unit: "USD/MMBtu",
    kind: "market", group: "Commodities", copyright: "International Monetary Fund",
    note: "Europe's marginal energy cost, and the reason its terms of trade moved so violently after 2022." },

  /* --- Rates and currency -------------------------------------------------- */
  { fred: "DFII10", id: "real_10y", label: "10-year real yield (TIPS)", unit: "%", node: "real_rate",
    kind: "market", group: "Rates", copyright: PUBLIC_DOMAIN,
    note: "The number that actually governs investment decisions, and the discount rate for every long-duration asset." },
  { fred: "T10YIE", id: "breakeven_10y", label: "10-year breakeven inflation", unit: "%",
    node: "inflation_expectations", kind: "market", group: "Rates", copyright: PUBLIC_DOMAIN,
    note: "What the bond market prices for average inflation over a decade — contaminated by liquidity and risk premia." },
  { fred: "T5YIE", id: "breakeven_5y", label: "5-year breakeven inflation", unit: "%",
    kind: "market", group: "Rates", copyright: PUBLIC_DOMAIN,
    note: "The nearer-term half of the same measure." },
  { fred: "MORTGAGE30US", id: "mortgage30", label: "30-year mortgage rate", unit: "%",
    node: "mortgage_rate", kind: "market", group: "Rates", copyright: "Freddie Mac",
    note: "Priced off the 10-year plus a spread that widens when mortgage-backed securities are hard to hedge." },
  { fred: "DTWEXBGS", id: "dollar_index", label: "Trade-weighted dollar", unit: "index", node: "usd",
    kind: "market", group: "Currency", copyright: PUBLIC_DOMAIN,
    note: "A global financial condition rather than a price — dollar strength tightens conditions for every dollar borrower." },
  { fred: "NFCI", id: "nfci", label: "Financial conditions index", unit: "index",
    node: "financial_conditions", kind: "market", group: "Risk",
    copyright: "Federal Reserve Bank of Chicago",
    note: "Positive is tighter than average, negative looser. Aggregates rates, spreads, equity and leverage." },

  /* --- Macro --------------------------------------------------------------- */
  { fred: "FEDFUNDS", id: "fed_funds", label: "Federal funds rate", unit: "%", node: "policy_rate",
    kind: "macro", group: "Monetary", copyright: PUBLIC_DOMAIN,
    note: "The effective overnight rate — the anchor for the whole US curve." },
  { fred: "CPIAUCSL", id: "cpi", label: "Consumer price index", unit: "index 1982-84=100",
    node: "headline_inflation", kind: "macro", group: "Prices", copyright: PUBLIC_DOMAIN,
    note: "The full consumer basket. Shown as a year-over-year rate, which is how anyone reads it.", yoy: true },
  { fred: "CPILFESL", id: "core_cpi", label: "Core CPI", unit: "index 1982-84=100",
    node: "core_inflation", kind: "macro", group: "Prices", copyright: PUBLIC_DOMAIN,
    note: "Headline less food and energy — used because it forecasts headline better than headline does.", yoy: true },
  { fred: "PCEPILFE", id: "core_pce", label: "Core PCE price index", unit: "index 2017=100",
    kind: "macro", group: "Prices", copyright: PUBLIC_DOMAIN,
    note: "The Federal Reserve's preferred measure, and the one its 2% target refers to.", yoy: true },
  { fred: "UNRATE", id: "unemployment", label: "Unemployment rate", unit: "%", node: "unemployment",
    kind: "macro", group: "Labour", copyright: PUBLIC_DOMAIN,
    note: "Lagging, politically decisive, and blind to whether a rise came from layoffs or from labour supply." },
  { fred: "PAYEMS", id: "payrolls", label: "Nonfarm payrolls", unit: "thousands", node: "payrolls",
    kind: "macro", group: "Labour", copyright: PUBLIC_DOMAIN,
    note: "Timely, noisy and revised. Read the trend, not the print." },
  { fred: "JTSJOL", id: "job_openings", label: "Job openings", unit: "thousands", node: "job_openings",
    kind: "macro", group: "Labour", copyright: PUBLIC_DOMAIN,
    note: "Falling openings without rising unemployment is the benign cooling path." },
  { fred: "GDPC1", id: "real_gdp", label: "Real GDP", unit: "bn chained 2017 USD", node: "gdp",
    kind: "macro", group: "Activity", copyright: PUBLIC_DOMAIN,
    note: "Quarterly, heavily revised, and still the reference series." },
  { fred: "INDPRO", id: "industrial_production", label: "Industrial production", unit: "index 2017=100",
    node: "manufacturing", kind: "macro", group: "Activity", copyright: PUBLIC_DOMAIN,
    note: "A small share of employment and an outsized share of the cycle's amplitude." },
  { fred: "HOUST", id: "housing_starts", label: "Housing starts", unit: "thousands, annualised",
    node: "housing_activity", kind: "macro", group: "Activity", copyright: PUBLIC_DOMAIN,
    note: "The most rate-sensitive sector in the economy, and therefore the first to turn." },
  { fred: "UMCSENT", id: "consumer_sentiment", label: "Consumer sentiment", unit: "index 1966=100",
    node: "consumer_confidence", kind: "macro", group: "Activity", copyright: PUBLIC_DOMAIN,
    note: "A weak predictor of spending and a strong predictor of politics." },
  { fred: "WM2NS", id: "m2", label: "Money supply (M2)", unit: "bn USD",
    kind: "macro", group: "Monetary", copyright: PUBLIC_DOMAIN,
    note: "Watched closely in 2021 and much less since. Its relationship to inflation is regime-dependent." },
];

export const FRED_SERIES = SERIES;

export default {
  id: "fred", label: "FRED (St. Louis Fed)", sourceId: "fred", tier: 1,

  async run({ only = null } = {}) {
    const result = emptyResult();
    const notes = [];
    const wanted = only ? SERIES.filter((entry) => only.includes(entry.id)) : SERIES;

    for (const spec of wanted) {
      const response = await get(CSV(spec.fred), { accept: "text/csv, text/plain" });
      if (!response.ok) { notes.push(`${spec.fred}: ${response.error}`); continue; }

      const observations = parseCsv(response.body);
      if (!observations.length) { notes.push(`${spec.fred}: no usable observations`); continue; }

      result.series.push({
        ...series({
          id: spec.id, label: spec.label, unit: spec.unit,
          sourceId: "fred", nodeId: spec.node || null,
          observations: thin(observations),
          note: spec.note,
        }),
        fredId: spec.fred,
        kind: spec.kind,
        group: spec.group,
        copyright: spec.copyright || null,
        url: seriesPage(spec.fred),
        /** Year-over-year is how an index-level price series is actually read. */
        yoy: spec.yoy ? yearOverYear(observations) : null,
      });
    }

    return { ...result, notes };
  },
};

/**
 * Full daily resolution for the recent window, weekly before that.
 *
 * A decade of daily observations is around 80KB per series and the older half
 * of it is invisible at chart scale — the "All" range is a few hundred pixels
 * wide. Thinning keeps every point a reader can actually distinguish and drops
 * the ones they cannot, which is a three-fold size reduction for no visible
 * difference.
 */
function thin(observations, { recent = 300, keepEvery = 10, maxTotal = 800 } = {}) {
  if (observations.length <= recent) return observations;

  /**
   * Only daily series are thinned. Sampling a monthly series every tenth point
   * silently turns a month-over-month change into a ten-month change, and any
   * consumer computing a difference from the stored series would be wrong
   * without any way of noticing. Monthly and quarterly series are small enough
   * to ship whole.
   */
  const cadenceDays = medianGap(observations);
  if (cadenceDays > 20) return observations;
  const head = observations.slice(0, -recent);
  const tail = observations.slice(-recent);
  const sampled = head.filter((_, index) => index % keepEvery === 0);
  const combined = [...sampled, ...tail];
  return combined.length <= maxTotal ? combined : combined.slice(-maxTotal);
}

/** Typical spacing between observations, in days. */
function medianGap(observations) {
  const gaps = [];
  for (let i = 1; i < observations.length; i++) {
    gaps.push((Date.parse(observations[i].d) - Date.parse(observations[i - 1].d)) / 86_400_000);
  }
  if (!gaps.length) return 1;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/**
 * FRED keeps the row for a missing observation and leaves the value field
 * empty — a market holiday in a daily series, or a month not yet published.
 *
 * The trap is that `Number("")` is `0`, and zero is finite, so a naive numeric
 * filter admits every holiday as a price of zero. That is not a subtle error:
 * it puts a vertical spike through every chart and silently corrupts any
 * average taken over the series. Empty and "." are both rejected before any
 * coercion happens, which is also why a legitimately zero value — the Chicago
 * Fed's conditions index crosses zero by construction — still survives.
 */
function parseCsv(body) {
  const lines = String(body).trim().split(/\r?\n/);
  const observations = [];
  for (let i = 1; i < lines.length; i++) {
    const comma = lines[i].indexOf(",");
    if (comma < 0) continue;
    const date = lines[i].slice(0, comma).trim();
    const raw = lines[i].slice(comma + 1).trim();
    if (!date || raw === "" || raw === ".") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    // Trim float noise: FRED serves IMF commodity prices to 15 significant
    // figures, none of which are meaningful.
    observations.push({ d: date, v: Number(value.toPrecision(9)) });
  }
  return observations;
}

/** Twelve-month change, for the index-level series nobody reads as a level. */
function yearOverYear(observations) {
  const byDate = new Map(observations.map((point) => [point.d, point.v]));
  const out = [];
  for (const point of observations) {
    const [year, month, day] = point.d.split("-");
    const priorKey = `${Number(year) - 1}-${month}-${day}`;
    const prior = byDate.get(priorKey);
    if (!Number.isFinite(prior) || prior === 0) continue;
    out.push({ d: point.d, v: Number((((point.v - prior) / prior) * 100).toFixed(2)) });
  }
  return out.slice(-400);
}
