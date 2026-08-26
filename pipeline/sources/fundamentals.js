/**
 * SEC XBRL company facts — reported fundamentals.
 *
 * Everything here is a figure a company filed with the regulator. Nothing is an
 * estimate, a consensus number or a valuation, because none of those are
 * available without a paid feed. That limitation is carried through to the
 * interface: the screen can tell you how a business performs and cannot tell you
 * whether its shares are attractively priced.
 *
 * Fundamentals move quarterly, so this runs weekly rather than daily. Fetching
 * four megabytes per company every morning to re-read a number that changes four
 * times a year is not a reasonable use of someone else's servers.
 */

import { getJson, hasContact } from "../lib/http.js";
import { emptyResult } from "../lib/schema.js";
import { TRACKED } from "./sec.js";

const TICKER_MAP = "https://www.sec.gov/files/company_tickers.json";
const FACTS = (cik) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`;
const SUBMISSIONS = (cik) => `https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`;

/**
 * Tag fallbacks matter twice over. Filers move between concepts as accounting
 * standards change, so a single tag silently truncates a company's history at
 * the year it switched. And foreign private issuers file 20-F under IFRS, so a
 * US-GAAP-only extractor returns nothing at all for them — which looks like a
 * missing company rather than a missing taxonomy. Order is most-specific first.
 */
const METRICS = {
  revenue: {
    label: "Revenue", kind: "duration",
    tags: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax",
           "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet",
           "SalesRevenueGoodsNet"],
    ifrs: ["Revenue", "RevenueFromContractsWithCustomers"],
  },
  grossProfit: { label: "Gross profit", kind: "duration", tags: ["GrossProfit"], ifrs: ["GrossProfit"] },
  operatingIncome: {
    label: "Operating income", kind: "duration",
    tags: ["OperatingIncomeLoss"], ifrs: ["ProfitLossFromOperatingActivities"],
  },
  netIncome: {
    label: "Net income", kind: "duration",
    tags: ["NetIncomeLoss", "ProfitLoss"], ifrs: ["ProfitLoss"],
  },
  rnd: {
    label: "Research and development", kind: "duration",
    tags: ["ResearchAndDevelopmentExpense"], ifrs: ["ResearchAndDevelopmentExpense"],
  },
  operatingCashFlow: {
    label: "Operating cash flow", kind: "duration",
    tags: ["NetCashProvidedByUsedInOperatingActivities",
           "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
    ifrs: ["CashFlowsFromUsedInOperatingActivities"],
  },
  capex: {
    label: "Capital expenditure", kind: "duration",
    tags: ["PaymentsToAcquirePropertyPlantAndEquipment",
           "PaymentsToAcquireProductiveAssets",
           "PaymentsToAcquireOtherPropertyPlantAndEquipment"],
    ifrs: ["PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"],
  },
  assets: { label: "Total assets", kind: "instant", tags: ["Assets"], ifrs: ["Assets"] },
  liabilities: { label: "Total liabilities", kind: "instant", tags: ["Liabilities"], ifrs: ["Liabilities"] },
  equity: {
    label: "Shareholders' equity", kind: "instant",
    tags: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
    ifrs: ["Equity", "EquityAttributableToOwnersOfParent"],
  },
  cash: {
    label: "Cash and equivalents", kind: "instant",
    tags: ["CashAndCashEquivalentsAtCarryingValue",
           "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
    ifrs: ["CashAndCashEquivalents"],
  },
  debtLongTerm: {
    label: "Long-term debt", kind: "instant",
    tags: ["LongTermDebtNoncurrent", "LongTermDebt"], ifrs: ["NoncurrentPortionOfNoncurrentBorrowings", "Borrowings"],
  },
  debtCurrent: {
    label: "Current debt", kind: "instant",
    tags: ["LongTermDebtCurrent", "ShortTermBorrowings"], ifrs: ["CurrentPortionOfLongtermBorrowings"],
  },
  shares: {
    label: "Shares outstanding", kind: "instant", unit: "shares",
    tags: ["CommonStockSharesOutstanding", "CommonStockSharesIssued", "WeightedAverageNumberOfDilutedSharesOutstanding"],
    ifrs: ["NumberOfSharesOutstanding"],
  },
};

export default {
  id: "fundamentals", label: "SEC fundamentals", sourceId: "sec-edgar", tier: 1,

  async run({ maxCompanies = 30 } = {}) {
    const result = emptyResult();
    const notes = [];

    if (!hasContact) {
      return {
        ...result, skipped: true,
        notes: ["Skipped: SEC's access policy requires a contact address in the User-Agent. " +
                "Set INTEL_CONTACT to an email address and re-run."],
      };
    }

    const map = await getJson(TICKER_MAP);
    if (!map.ok) return { ...result, notes: [`ticker map: ${map.error}`] };

    const cikByTicker = new Map();
    for (const entry of Object.values(map.json || {})) {
      if (entry?.ticker) cikByTicker.set(entry.ticker.toUpperCase(), entry);
    }

    const companies = [];
    for (const ticker of Object.keys(TRACKED).slice(0, maxCompanies)) {
      const entry = cikByTicker.get(ticker);
      if (!entry) { notes.push(`${ticker}: not in EDGAR's ticker map`); continue; }

      const [facts, submission] = await Promise.all([
        getJson(FACTS(entry.cik_str)),
        getJson(SUBMISSIONS(entry.cik_str)),
      ]);

      if (!facts.ok) { notes.push(`${ticker}: facts ${facts.error}`); continue; }

      const extracted = extractMetrics(facts.json);

      /**
       * A ticker can resolve to a registrant with no reported history — most
       * often after a reorganisation, where a new holding company inherits the
       * ticker while the operating history stays under the predecessor CIK. That
       * is worth saying out loud: the alternative is a company row that is
       * mysteriously blank.
       */
      const hasFundamentals = Boolean(extracted.annual.revenue?.length);
      if (!hasFundamentals) {
        notes.push(`${ticker} resolves to CIK ${entry.cik_str} (${facts.json.entityName || entry.title}), `
          + "which has filed no revenue under any known tag — likely a holding entity whose operating "
          + "history sits under a predecessor CIK.");
      }

      // Only revenue needs a quarterly history, and only enough of one for a
      // trailing-twelve-month figure. Shipping the rest doubles the payload for
      // numbers no surface reads.
      const quarterly = extracted.quarterly.revenue
        ? { revenue: extracted.quarterly.revenue.slice(-9) }
        : {};

      companies.push({
        ticker,
        cik: String(entry.cik_str),
        name: facts.json.entityName || entry.title,
        node: TRACKED[ticker],
        sic: submission.ok ? submission.json.sicDescription || null : null,
        exchange: submission.ok ? submission.json.exchanges?.[0] || null : null,
        fiscalYearEnd: submission.ok ? submission.json.fiscalYearEnd || null : null,
        hasFundamentals,
        annual: extracted.annual,
        quarterly,
        derived: derive(extracted.annual, extracted.quarterly),
        asOf: extracted.asOf,
        currency: extracted.currency,
        taxonomy: extracted.taxonomy,
        tagsUsed: extracted.tagsUsed,
      });
    }

    return { ...result, companies, notes };
  },
};

/* --- extraction ---------------------------------------------------------- */

export function extractMetrics(payload) {
  const gaap = payload?.facts?.["us-gaap"] || {};
  const ifrs = payload?.facts?.["ifrs-full"] || {};
  const dei = payload?.facts?.dei || {};
  const annual = {}, quarterly = {}, tagsUsed = {};
  const taxonomy = Object.keys(ifrs).length && !Object.keys(gaap).length ? "ifrs-full" : "us-gaap";
  let asOf = null;

  /**
   * A company must be read in one currency. Foreign filers publish the same fact
   * in their reporting currency and in USD, with very different coverage — TSM
   * files a long TWD history and a short USD one. Mixing them silently produces
   * margins and growth rates that are simply wrong, so the dominant currency is
   * chosen once and every monetary metric is locked to it.
   */
  const currency = dominantCurrency(gaap, ifrs);

  for (const [key, spec] of Object.entries(METRICS)) {
    const candidates = [
      ...spec.tags.map((tag) => [gaap, tag, "us-gaap"]),
      ...(spec.ifrs || []).map((tag) => [ifrs, tag, "ifrs-full"]),
    ];
    const wantUnit = spec.unit === "shares" ? "shares" : currency;
    let chosen = null;
    for (const [source, tag, from] of candidates) {
      const concept = source[tag]
        || (tag === "CommonStockSharesOutstanding" ? dei.EntityCommonStockSharesOutstanding : null);
      if (!concept?.units) continue;
      const unitKey = concept.units[wantUnit] ? wantUnit
        : chosen ? null                                   // never merge across units
        : Object.keys(concept.units).find((u) => u === "USD" || u === "shares")
          || Object.keys(concept.units)[0];
      if (!unitKey) continue;
      if (chosen && unitKey !== chosen.unit) continue;
      const points = concept.units[unitKey] || [];
      if (!points.length) continue;
      chosen = chosen ? { ...chosen, points: [...chosen.points, ...points] } : { tag, points, unit: unitKey };
      const label = from === "ifrs-full" ? `ifrs:${tag}` : tag;
      tagsUsed[key] = tagsUsed[key] ? `${tagsUsed[key]}, ${label}` : label;
    }
    if (!chosen) continue;

    annual[key] = periods(chosen.points, spec.kind, "FY");
    quarterly[key] = periods(chosen.points, spec.kind, "Q");

    const latest = annual[key].at(-1)?.end || quarterly[key].at(-1)?.end;
    if (latest && (!asOf || latest > asOf)) asOf = latest;
  }

  return { annual, quarterly, asOf, tagsUsed, taxonomy, currency };
}

/** The monetary unit the filer actually reports most of its history in. */
function dominantCurrency(gaap, ifrs) {
  const counts = new Map();
  for (const source of [gaap, ifrs]) {
    for (const concept of Object.values(source)) {
      for (const [unit, points] of Object.entries(concept.units || {})) {
        if (unit === "shares" || unit.includes("/")) continue;
        counts.set(unit, (counts.get(unit) || 0) + points.length);
      }
    }
  }
  if (!counts.size) return "USD";
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Reduce raw XBRL points to one clean value per period.
 *
 * Three things have to be handled or the numbers are wrong: duration facts must
 * be filtered to the right length (a 10-K carries quarterly and annual figures
 * under the same tag), the same period is restated across filings so the most
 * recently filed value wins, and companies re-report prior years, which is why
 * dedupe is by period end rather than by fiscal year label.
 */
export function periods(points, kind, want) {
  const wanted = points.filter((point) => {
    if (!point.end || !Number.isFinite(point.val)) return false;
    if (kind === "instant") {
      return want === "FY" ? point.form === "10-K" || point.form === "20-F" : true;
    }
    if (!point.start) return false;
    const days = (Date.parse(point.end) - Date.parse(point.start)) / 86_400_000;
    return want === "FY" ? days > 300 && days < 400 : days > 60 && days < 120;
  });

  const byEnd = new Map();
  for (const point of wanted) {
    const existing = byEnd.get(point.end);
    if (!existing || (point.filed || "") > (existing.filed || "")) byEnd.set(point.end, point);
  }

  return [...byEnd.values()]
    .sort((a, b) => (a.end < b.end ? -1 : 1))
    .slice(-14)
    .map((point) => ({
      // Deliberately narrow. `fy` is the fiscal year of the *filing*, not of the
      // period, so it mislabels restated years and nothing should read it; and
      // `start` is implied by the period length the filter already enforced.
      end: point.end,
      form: point.form,
      filed: point.filed || null,
      v: point.val,
    }));
}

/* --- derived, computed only from reported figures ------------------------ */

function derive(annual, quarterly) {
  const at = (series, back = 0) => series?.[series.length - 1 - back]?.v ?? null;
  const ratio = (numerator, denominator) =>
    Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
      ? Number((numerator / denominator).toFixed(4)) : null;

  const revenue = at(annual.revenue);
  const revenuePrior = at(annual.revenue, 1);
  const revenue3y = at(annual.revenue, 3);

  const ocf = at(annual.operatingCashFlow);
  const capex = at(annual.capex);
  const freeCashFlow = Number.isFinite(ocf) && Number.isFinite(capex) ? ocf - Math.abs(capex) : null;

  const cash = at(annual.cash) ?? 0;
  const debt = (at(annual.debtLongTerm) ?? 0) + (at(annual.debtCurrent) ?? 0);

  const ttmRevenue = sumLast(quarterly.revenue, 4);
  const ttmRevenuePrior = sumLast(quarterly.revenue, 4, 4);

  return {
    revenue,
    revenueGrowth: ratio(revenue - revenuePrior, revenuePrior),
    revenueCagr3y: revenue3y > 0 && revenue > 0
      ? Number((Math.pow(revenue / revenue3y, 1 / 3) - 1).toFixed(4)) : null,
    ttmRevenue,
    ttmRevenueGrowth: ratio(ttmRevenue - ttmRevenuePrior, ttmRevenuePrior),
    grossMargin: ratio(at(annual.grossProfit), revenue),
    operatingMargin: ratio(at(annual.operatingIncome), revenue),
    netMargin: ratio(at(annual.netIncome), revenue),
    freeCashFlow,
    fcfMargin: ratio(freeCashFlow, revenue),
    fcfConversion: ratio(freeCashFlow, at(annual.netIncome)),
    returnOnEquity: ratio(at(annual.netIncome), at(annual.equity)),
    returnOnAssets: ratio(at(annual.netIncome), at(annual.assets)),
    rndIntensity: ratio(at(annual.rnd), revenue),
    capexIntensity: Number.isFinite(capex) ? ratio(Math.abs(capex), revenue) : null,
    netCash: cash - debt,
    netCashToAssets: ratio(cash - debt, at(annual.assets)),
    equityRatio: ratio(at(annual.equity), at(annual.assets)),
    sharesChange3y: (() => {
      const now = at(annual.shares), then = at(annual.shares, 3);
      return ratio(now - then, then);
    })(),
    years: annual.revenue?.length || 0,
    latestPeriod: annual.revenue?.at(-1)?.end || null,
  };
}

function sumLast(series, count, offset = 0) {
  if (!series?.length) return null;
  const slice = series.slice(Math.max(0, series.length - count - offset), series.length - offset);
  if (slice.length < count) return null;
  return slice.reduce((total, point) => total + point.v, 0);
}
