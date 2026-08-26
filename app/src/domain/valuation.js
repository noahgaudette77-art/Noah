/**
 * VALUATION — multiples, and a hard refusal to compute one that would be wrong.
 *
 * This is the layer that was missing for as long as the platform had no price.
 * It exists now, and its most important behaviour is not the arithmetic: it is
 * knowing when the arithmetic would silently produce a plausible, wrong number.
 *
 * Two ways that happens, both of which cost real money to believe:
 *
 *   CURRENCY. A filing is in the currency the issuer reports in; a quote is in
 *   the currency the shares trade in. ASML files in EUR and trades in USD, TSM
 *   files in TWD and trades in USD. Dividing a USD market capitalisation by TWD
 *   earnings produces a P/E roughly thirty times too low. So a multiple is only
 *   computed when the two currencies match, or when a rate from a tier-1 source
 *   is available to convert them. This platform carries EUR/USD from the ECB and
 *   USD/CAD from the Bank of Canada; it carries no TWD rate, so TSM gets a price
 *   and no multiple, with the reason stated.
 *
 *   DEPOSITARY RECEIPTS. An ADR represents a fixed number of ordinary shares —
 *   five, for TSM. The share count in a 20-F is ordinary shares. Multiplying an
 *   ADR price by it overstates market capitalisation five-fold. So the market
 *   cap for a receipt is only ever taken from the provider, which knows the
 *   ratio; it is never computed here.
 *
 * Everything in this file is arithmetic on reported figures and a quoted price.
 * There are no estimates, no forward multiples and no target prices, because
 * every one of those would require a consensus feed this platform does not have.
 */

/* --- Currency ------------------------------------------------------------ */

/**
 * Rates come from the series the pipeline already fetches, so a conversion is
 * always traceable to a central bank rather than a hard-coded constant.
 *
 * @param {Array} series  markets series (ECB eurusd, BoC usdcad)
 * @returns {(from: string, to: string) => {rate: number, via: string}|null}
 */
export function converter(series = []) {
  const latest = (id) => {
    const entry = series.find((s) => s.id === id);
    return Number.isFinite(entry?.latest) ? { value: entry.latest, label: entry.label } : null;
  };

  const eurusd = latest("eurusd");   // USD per EUR
  const usdcad = latest("usdcad");   // CAD per USD

  return (from, to) => {
    if (!from || !to) return null;
    if (from === to) return { rate: 1, via: null };
    if (from === "EUR" && to === "USD" && eurusd) return { rate: eurusd.value, via: eurusd.label };
    if (from === "USD" && to === "EUR" && eurusd) return { rate: 1 / eurusd.value, via: eurusd.label };
    if (from === "USD" && to === "CAD" && usdcad) return { rate: usdcad.value, via: usdcad.label };
    if (from === "CAD" && to === "USD" && usdcad) return { rate: 1 / usdcad.value, via: usdcad.label };
    return null;
  };
}

/* --- The multiples ------------------------------------------------------- */

/**
 * Each field in `annual` is a series of periods, ascending. The last one is the
 * most recently ended year — and where a period was restated, the extractor has
 * already kept the most recently filed value for it.
 */
const latestOf = (company, field) => {
  const periods = company?.annual?.[field];
  const point = Array.isArray(periods) ? periods[periods.length - 1] : periods;
  return Number.isFinite(point?.v) ? point.v : null;
};

const ratio = (numerator, denominator) =>
  Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : null;

/**
 * @param {object} company    a fundamentals entry
 * @param {object} quote      a prices entry for the same ticker
 * @param {function} convert  from `converter()`
 * @returns {object|null} null when there is no quote at all
 */
export function valuationOf(company, quote, convert = () => null) {
  if (!quote || !company?.hasFundamentals) return null;

  const filingCurrency = company.currency || null;
  const priceCurrency = quote.currency || null;
  const d = company.derived || {};

  const base = {
    ticker: company.ticker,
    price: quote.price,
    previousClose: quote.previousClose ?? null,
    changePct: quote.changePct ?? null,
    currency: priceCurrency,
    asOf: quote.asOf,
    sourceId: quote.sourceId,
    providerLabel: quote.providerLabel,
    filingCurrency,
    multiples: null,
    marketCap: null,
    withheld: null,
  };

  /**
   * Market capitalisation. For a depositary receipt only the provider's figure
   * will do; computing one from the filed ordinary-share count is the five-fold
   * error described at the top of this file.
   */
  const filedShares = latestOf(company, "shares");
  const marketCap = Number.isFinite(quote.marketCap)
    ? { value: quote.marketCap, currency: priceCurrency, basis: "provider" }
    : (!quote.isDepositaryReceipt && Number.isFinite(filedShares)
        ? { value: quote.price * filedShares, currency: priceCurrency, basis: "price × shares as filed" }
        : null);

  if (!marketCap) {
    return {
      ...base,
      withheld: quote.isDepositaryReceipt
        ? "This is a depositary receipt. Each one represents a fixed number of ordinary shares, and that "
          + "ratio is not in any filing read here — so a market capitalisation computed from the filed "
          + "share count would be wrong by exactly that ratio. The provider did not supply one either."
        : "No share count in the filings and none from the provider, so there is no market capitalisation "
          + "and therefore no multiple.",
    };
  }

  // Convert the filed figures into the currency the shares trade in.
  const fx = convert(filingCurrency, priceCurrency);
  if (!fx) {
    return {
      ...base,
      marketCap,
      withheld: `Figures are filed in ${filingCurrency || "an unstated currency"} and the shares trade in `
        + `${priceCurrency}. This platform has no ${filingCurrency}/${priceCurrency} rate from a primary `
        + "source, and converting at a guessed rate would produce a multiple that looks fine and is wrong. "
        + "The price and market capitalisation stand; the multiples do not.",
    };
  }

  const toPriceCurrency = (value) => (Number.isFinite(value) ? value * fx.rate : null);

  const revenue = toPriceCurrency(d.ttmRevenue ?? d.revenue);
  const netIncome = toPriceCurrency(latestOf(company, "netIncome"));
  const freeCashFlow = toPriceCurrency(d.freeCashFlow);
  const equity = toPriceCurrency(latestOf(company, "equity"));
  const netCash = toPriceCurrency(d.netCash);

  // Enterprise value adds net debt back; a net-cash company's EV is below its cap.
  const enterpriseValue = Number.isFinite(netCash) ? marketCap.value - netCash : null;

  return {
    ...base,
    marketCap,
    enterpriseValue: Number.isFinite(enterpriseValue)
      ? { value: enterpriseValue, currency: priceCurrency } : null,
    fx: fx.rate === 1 ? null : { rate: fx.rate, via: fx.via, from: filingCurrency, to: priceCurrency },
    multiples: {
      priceToEarnings: ratio(marketCap.value, netIncome),
      priceToSales: ratio(marketCap.value, revenue),
      priceToFreeCashFlow: ratio(marketCap.value, freeCashFlow),
      priceToBook: ratio(marketCap.value, equity),
      evToSales: ratio(enterpriseValue, revenue),
      evToFreeCashFlow: ratio(enterpriseValue, freeCashFlow),
      freeCashFlowYield: ratio(freeCashFlow, marketCap.value),
      earningsYield: ratio(netIncome, marketCap.value),
    },
    /** Which reported period the multiples are actually built on. */
    basis: {
      revenue: d.ttmRevenue ? "trailing twelve months" : "latest full year",
      earnings: "latest full year",
      period: d.latestPeriod || company.asOf || null,
    },
  };
}

/** Every valuation the current data supports, keyed by ticker. */
export function valuationsFor(companies = [], prices = [], series = []) {
  const convert = converter(series);
  const byTicker = new Map(prices.map((quote) => [quote.ticker, quote]));
  const out = new Map();
  for (const company of companies) {
    const valuation = valuationOf(company, byTicker.get(company.ticker), convert);
    if (valuation) out.set(company.ticker, valuation);
  }
  return out;
}

/* --- Ranking, and what it is not ---------------------------------------- */

/**
 * The multiples worth ranking on, cheapest-first where a low number is cheap.
 * FCF yield inverts, because a high yield is the cheap end.
 */
export const MULTIPLE_FACTORS = [
  { id: "pe", label: "P/E", get: (v) => v.multiples?.priceToEarnings, cheapIsLow: true,
    note: "Market capitalisation over the last full year's net income, as filed." },
  { id: "ps", label: "P/S", get: (v) => v.multiples?.priceToSales, cheapIsLow: true,
    note: "Over trailing twelve-month revenue where the quarterly filings support it." },
  { id: "pfcf", label: "P/FCF", get: (v) => v.multiples?.priceToFreeCashFlow, cheapIsLow: true,
    note: "Operating cash flow less capital expenditure. Harder to flatter than earnings." },
  { id: "evfcf", label: "EV/FCF", get: (v) => v.multiples?.evToFreeCashFlow, cheapIsLow: true,
    note: "Adjusts for the balance sheet, which matters most where net cash is large." },
  { id: "fcfy", label: "FCF yield", get: (v) => v.multiples?.freeCashFlowYield, cheapIsLow: false,
    note: "The inverse of P/FCF, which is the form that compares to a bond yield." },
];

/**
 * A percentile rank of how a company's multiples sit against these peers — the
 * same construction as the fundamental profile, and the same caveat, only more
 * so: a low multiple is not an opportunity. It is a question about why, and the
 * usual answer is that the market has priced something the filings do not show.
 */
export function valuationRank(valuation, universe) {
  const values = MULTIPLE_FACTORS.map((factor) => {
    const value = factor.get(valuation);
    if (!Number.isFinite(value) || value <= 0) return { ...factor, value, rank: null };

    const peers = universe
      .map(factor.get)
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    if (peers.length < 4) return { ...factor, value, rank: null };

    const below = peers.filter((v) => v < value).length;
    const pct = below / (peers.length - 1 || 1);
    // 100 = the cheap end of this peer set, whichever direction that is.
    return { ...factor, value, rank: Math.round(100 * (factor.cheapIsLow ? 1 - pct : pct)) };
  });

  const scored = values.filter((entry) => entry.rank !== null);
  return {
    factors: values,
    covered: scored.length,
    score: scored.length
      ? Math.round(scored.reduce((sum, entry) => sum + entry.rank, 0) / scored.length)
      : null,
  };
}

/**
 * The categories that needed a price. They are offered only when a valuation
 * actually exists, and each says what it does and does not claim — "cheap
 * against these peers" is a fact about a ratio, not a view about the shares.
 */
export const PRICED_CATEGORIES = [
  {
    id: "cheap-vs-peers", label: "Cheap against peers",
    note: "In the cheapest third of the covered set on the multiples that could be computed. "
        + "That is a statement about a ratio, not a recommendation — the market usually has a reason.",
    test: (rank) => Number.isFinite(rank?.score) && rank.score >= 67,
  },
  {
    id: "expensive-vs-peers", label: "Expensive against peers",
    note: "In the most expensive third. Frequently the correct price for a better business.",
    test: (rank) => Number.isFinite(rank?.score) && rank.score <= 33,
  },
  {
    id: "quality-at-a-discount", label: "Strong figures, low multiple",
    note: "Ranks well on reported performance and cheaply on multiples. The pair is what makes it "
        + "interesting; it is still a question rather than an answer.",
    test: (rank, profile) => Number.isFinite(rank?.score) && Number.isFinite(profile?.score)
      && rank.score >= 60 && profile.score >= 70,
  },
  {
    id: "priced-for-growth", label: "Priced for growth",
    note: "An expensive multiple on strong reported growth — the market is paying for what happens next, "
        + "so the risk sits in the forecast rather than the figures.",
    test: (rank, profile, company) => Number.isFinite(rank?.score) && rank.score <= 40
      && (company?.derived?.revenueCagr3y ?? 0) > 0.2,
  },
];

export const pricedCategoriesFor = (rank, profile, company) =>
  PRICED_CATEGORIES.filter((category) => category.test(rank, profile, company));

/**
 * What a valuation still does not tell you. Shown wherever multiples are, for
 * the same reason the no-price notice was shown when there were none: the
 * absence of a caveat reads as a claim of completeness.
 */
export const VALUATION_LIMITS = [
  "A multiple is a ratio, not a judgement. Cheap against peers usually means the market has priced "
  + "something these figures do not show, and finding out what is the actual work.",
  "Every figure here is backward-looking. There are no estimates and no consensus, so nothing here "
  + "reflects what the company is expected to earn — which is what a price mostly represents.",
  "Peer sets are this platform's 27 companies, chosen because they sit on a node in the world model. "
  + "That is not an industry classification and the comparison is only as good as the grouping.",
];
