/**
 * Company analysis, computed only from reported figures and the world model.
 *
 * The hard constraint: there is no price. Without one there is no P/E, no EV, no
 * market capitalisation and therefore no valuation — so this can describe how a
 * business performs and cannot say whether its shares are attractively priced.
 * Every surface repeats that, because a screen that looks like a stock screen
 * and silently omits valuation is the most misleading thing this project could
 * ship.
 *
 * What it can do honestly: rank businesses against each other on growth,
 * profitability, cash generation, returns and balance sheet strength, all from
 * filed figures; and attach each one to the node in the world model whose
 * transmission actually drives it.
 */

import { node as findNode, inEdges } from "./worldmodel.js";
import { propagate, salience } from "./propagate.js";

/* --- Percentile scoring -------------------------------------------------- */

const FACTORS = [
  { id: "growth", label: "Growth", weight: 0.24,
    get: (c) => c.derived.revenueCagr3y ?? c.derived.revenueGrowth,
    note: "Three-year revenue CAGR as reported, falling back to the latest year." },
  { id: "profitability", label: "Profitability", weight: 0.2,
    get: (c) => c.derived.operatingMargin,
    note: "Operating margin. Compares poorly across industries and well within one." },
  { id: "cash", label: "Cash generation", weight: 0.22,
    get: (c) => c.derived.fcfMargin,
    note: "Free cash flow as a share of revenue — operating cash flow less capital expenditure." },
  { id: "returns", label: "Return on equity", weight: 0.16,
    get: (c) => c.derived.returnOnEquity,
    note: "Flattered by leverage, which is why the balance sheet factor sits alongside it." },
  { id: "balance", label: "Balance sheet", weight: 0.1,
    get: (c) => c.derived.netCashToAssets,
    note: "Net cash less total debt, as a share of assets." },
  { id: "consistency", label: "Consistency", weight: 0.08,
    get: (c) => consistency(c),
    note: "Share of reported years in which revenue grew." },
];

export const SCORE_FACTORS = FACTORS;

function consistency(company) {
  const series = company.annual?.revenue || [];
  if (series.length < 3) return null;
  let grew = 0, total = 0;
  for (let i = 1; i < series.length; i++) {
    total++;
    if (series[i].v > series[i - 1].v) grew++;
  }
  return total ? grew / total : null;
}

/** Rank within the covered universe. A percentile is meaningless without one. */
function percentile(values, value) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length || !Number.isFinite(value)) return null;
  let below = 0;
  for (const entry of clean) if (entry < value) below++;
  return clean.length === 1 ? 0.5 : below / (clean.length - 1);
}

/**
 * @returns {{score, factors, covered, missing}} score is 0–100 within this
 *          universe only — it is a rank, not a rating, and it says nothing about
 *          price.
 */
export function fundamentalProfile(company, universe) {
  const peers = universe.filter((entry) => entry.hasFundamentals);
  const factors = FACTORS.map((factor) => {
    const value = factor.get(company);
    const rank = percentile(peers.map(factor.get), value);
    return { ...factor, value, rank };
  });

  const scored = factors.filter((factor) => factor.rank !== null);
  const weight = scored.reduce((sum, factor) => sum + factor.weight, 0);
  const score = weight
    ? Math.round(100 * scored.reduce((sum, factor) => sum + factor.rank * factor.weight, 0) / weight)
    : null;

  return {
    score,
    factors,
    covered: scored.length,
    total: FACTORS.length,
    peers: peers.length,
    /** Stated on every surface that shows the score. */
    missing: [
      "Valuation — no price, so no multiple, no yield, no market capitalisation.",
      "Estimates and consensus — not available without a paid feed.",
      "Management quality, governance and insider activity.",
      "Competitive position, which no reported figure captures.",
    ],
  };
}

/* --- Categories, each one checkable against the figures ------------------ */

const CATEGORIES = [
  {
    id: "compounder", label: "Potential compounder",
    note: "Grows, converts to cash, and does not need debt to do it.",
    test: (d) => (d.revenueCagr3y ?? 0) >= 0.08 && (d.operatingMargin ?? 0) >= 0.15
      && (d.fcfMargin ?? 0) >= 0.1 && (d.netCashToAssets ?? -1) > -0.1,
  },
  {
    id: "high-growth", label: "High growth",
    note: "Three-year revenue CAGR above 25%.",
    test: (d) => (d.revenueCagr3y ?? 0) >= 0.25,
  },
  {
    id: "cash-generative", label: "Cash generative",
    note: "Free cash flow above a fifth of revenue.",
    test: (d) => (d.fcfMargin ?? 0) >= 0.2,
  },
  {
    id: "capital-intensive", label: "Capital intensive",
    note: "Capital expenditure above a tenth of revenue — a long cycle, and operating leverage in both directions.",
    test: (d) => (d.capexIntensity ?? 0) >= 0.1,
  },
  {
    id: "research-heavy", label: "Research heavy",
    note: "R&D above 12% of revenue. Understates book value, because intangible investment is expensed.",
    test: (d) => (d.rndIntensity ?? 0) >= 0.12,
  },
  {
    id: "levered", label: "Levered",
    note: "Net debt rather than net cash. Fine until refinancing is not.",
    test: (d) => (d.netCashToAssets ?? 0) < -0.05,
  },
  {
    id: "buying-back", label: "Shrinking the share count",
    note: "Fewer shares than three years ago.",
    test: (d) => (d.sharesChange3y ?? 0) < -0.02,
  },
  {
    id: "diluting", label: "Issuing shares",
    note: "More shares than three years ago — per-share growth lags reported growth.",
    test: (d) => (d.sharesChange3y ?? 0) > 0.05,
  },
  {
    id: "decelerating", label: "Decelerating",
    note: "Latest year grew more slowly than the three-year average.",
    test: (d) => Number.isFinite(d.revenueGrowth) && Number.isFinite(d.revenueCagr3y)
      && d.revenueGrowth < d.revenueCagr3y - 0.05,
  },
];

export const ALL_CATEGORIES = CATEGORIES;

/** Categories that would need a price and are therefore not offered. */
export const UNAVAILABLE_CATEGORIES = [
  { label: "Undervalued", why: "Requires a multiple, which requires a price." },
  { label: "Contrarian", why: "Requires knowing what the market already thinks — that is a price." },
  { label: "High risk / high potential", why: "The upside half of that judgement is a valuation claim." },
];

export const categoriesFor = (company) =>
  company.hasFundamentals ? CATEGORIES.filter((category) => category.test(company.derived)) : [];

/* --- The research frame -------------------------------------------------- */

/**
 * Not a thesis — a frame. The model supplies what drives the company's node and
 * what pressures it, each with its mechanism; the filings supply the figures. The
 * argument is left to the reader, which is the only honest division of labour
 * when the platform cannot see a price.
 */
export function researchFrame(company) {
  const target = company.node ? findNode(company.node) : null;
  if (!target) return null;

  const inbound = inEdges(target.id);
  const direct = inbound.filter((edge) => edge.sign > 0).sort((a, b) => b.strength - a.strength);
  const pressures = inbound.filter((edge) => edge.sign < 0)
    .sort((a, b) => b.strength - a.strength).slice(0, 6);

  /**
   * One hop upstream is frequently a single node — the accelerator business is
   * driven by compute demand and not much else, directly. What actually varies
   * is what drives *that*, so the frame walks a second hop and labels the order.
   */
  const seen = new Set([target.id, ...direct.map((edge) => edge.from)]);
  const secondOrder = [];
  for (const edge of direct) {
    for (const upstream of inEdges(edge.from)) {
      if (seen.has(upstream.from)) continue;
      seen.add(upstream.from);
      secondOrder.push({ ...upstream, via: edge.from, order: 2,
        strength: upstream.strength * edge.strength });
    }
  }
  const drivers = [
    ...direct.map((edge) => ({ ...edge, order: 1, via: null })),
    ...secondOrder.sort((a, b) => b.strength - a.strength).slice(0, 5),
  ].slice(0, 8);

  // Which modelled risks actually reach this company's node, and how hard.
  const risks = [];
  for (const candidate of ["geopolitical_risk", "taiwan_risk", "financial_instability",
                           "trade_fragmentation", "export_controls", "election_risk",
                           "middle_east_risk", "sanctions", "regulation_ai"]) {
    if (!findNode(candidate)) continue;
    const spread = propagate([{ id: candidate, magnitude: 1 }], { maxDepth: 4 });
    const hit = spread.effects.find((effect) => effect.id === target.id);
    if (hit) risks.push({ node: findNode(candidate), effect: hit });
  }
  risks.sort((a, b) => salience(b.effect) - salience(a.effect));

  const downstream = propagate([{ id: target.id, magnitude: 1 }], { maxDepth: 2 }).effects.slice(0, 5);

  return {
    node: target,
    drivers, pressures,
    risks: risks.slice(0, 5),
    downstream,
    monitor: buildMonitorList(company, target),
  };
}

function buildMonitorList(company, target) {
  const items = [];
  const d = company.derived || {};

  if (Number.isFinite(d.operatingMargin)) {
    items.push({
      label: "Operating margin",
      why: "The first place a demand slowdown or a cost shock shows up, ahead of revenue.",
      value: d.operatingMargin, format: "pct",
    });
  }
  if (Number.isFinite(d.fcfConversion)) {
    items.push({
      label: "Cash conversion",
      why: "Free cash flow against net income. A widening gap is the standard earnings-quality warning.",
      value: d.fcfConversion, format: "x",
    });
  }
  if (Number.isFinite(d.capexIntensity)) {
    items.push({
      label: "Capex intensity",
      why: "Rising capex into a cyclical peak is how capital gets destroyed. Falling capex into a trough is how it gets made.",
      value: d.capexIntensity, format: "pct",
    });
  }
  if (Number.isFinite(d.sharesChange3y)) {
    items.push({
      label: "Share count",
      why: "Growth per share is what an owner receives. Dilution silently takes a share of it.",
      value: d.sharesChange3y, format: "pct",
    });
  }
  for (const proxy of (target.proxies || []).slice(0, 3)) {
    items.push({ label: proxy, why: `Upstream indicator for ${target.label}.`, value: null, format: "series" });
  }
  return items;
}

/* --- Timeline ------------------------------------------------------------ */

/** Reported fiscal years plus filings — a record of events, not a narrative. */
export function timeline(company, filings = []) {
  const years = (company.annual?.revenue || []).map((point, index, all) => {
    const prior = all[index - 1];
    const growth = prior && prior.v ? (point.v - prior.v) / prior.v : null;
    const margin = matchPeriod(company.annual?.operatingIncome, point.end);
    return {
      kind: "year",
      date: point.end,
      // XBRL's `fy` is the fiscal year of the filing that carried the fact, not
      // of the period itself, so it mislabels restated prior years. The period
      // end is unambiguous.
      label: `FY${point.end.slice(0, 4)}`,
      revenue: point.v,
      growth,
      operatingMargin: margin !== null && point.v ? margin / point.v : null,
      form: point.form,
      filed: point.filed,
    };
  });

  const events = filings
    .filter((filing) => filing.ticker === company.ticker)
    .map((filing) => ({
      kind: "filing",
      date: filing.filedAt,
      label: filing.form,
      description: filing.description || "",
      url: filing.url,
    }));

  return [...years, ...events].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function matchPeriod(series, end) {
  const hit = (series || []).find((point) => point.end === end);
  return hit ? hit.v : null;
}

/* --- Macro → company ----------------------------------------------------- */

/** Given a macro shock, which covered companies sit downstream of it, and how. */
export function exposedCompanies(shockId, companies, { magnitude = 1 } = {}) {
  const spread = propagate([{ id: shockId, magnitude }], { maxDepth: 4 });
  const byNode = new Map(spread.effects.map((effect) => [effect.id, effect]));

  return companies
    .map((company) => {
      const effect = byNode.get(company.node);
      if (!effect) return null;
      return { company, effect };
    })
    .filter(Boolean)
    .sort((a, b) => salience(b.effect) - salience(a.effect));
}

export { findNode };
