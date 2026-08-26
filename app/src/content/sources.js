/**
 * SOURCE REGISTRY
 *
 * Tier is about proximity to the fact, not about quality of writing.
 *
 *   1  Primary — the entity that created the fact publishes it. A central bank
 *      rate decision, a statistical agency release, a company's own filing.
 *   2  High-quality financial journalism with editorial standards and corrections.
 *   3  Specialist and industry publications with domain expertise.
 *   4  Analysis and commentary. Argument, not observation. Always labelled.
 *   5  Social and forum content. Useful only for discovering that a discussion
 *      exists. Never treated as evidence of anything.
 *
 * `access` records how the pipeline actually reads a source. Anything marked
 * `keyless` is fetched directly with no credentials; `key` requires the user to
 * supply one and is inert until they do; `manual` is not automated at all and is
 * listed so that a claim traced to it is honestly attributed.
 */

const s = (id, name, tier, access, url, note, extra = {}) =>
  ({ id, name, tier, access, url, note, ...extra });

export const SOURCES = [
  /* --- Tier 1: primary, machine-readable, no credentials ---------------- */
  s("fed-press", "Federal Reserve — Press Releases", 1, "keyless",
    "https://www.federalreserve.gov/feeds/press_all.xml",
    "FOMC statements, regulatory actions and speeches, published by the Fed itself.",
    { region: "us", topics: ["monetary", "banking"], format: "rss" }),
  s("fed-h15", "Federal Reserve — Selected Interest Rates (H.15)", 1, "keyless",
    "https://www.federalreserve.gov/releases/h15/",
    "The official daily record of US benchmark interest rates.",
    { region: "us", topics: ["rates"], format: "html" }),
  s("ecb-press", "European Central Bank — Press", 1, "keyless",
    "https://www.ecb.europa.eu/rss/press.html",
    "ECB decisions, statements and publications.",
    { region: "europe", topics: ["monetary"], format: "rss" }),
  s("ecb-data", "ECB Data Portal", 1, "keyless",
    "https://data-api.ecb.europa.eu/",
    "Euro-area exchange rates, yields and monetary aggregates as structured data.",
    { region: "europe", topics: ["rates", "fx"], format: "json" }),
  s("boc-valet", "Bank of Canada — Valet API", 1, "keyless",
    "https://www.bankofcanada.ca/valet/docs",
    "Canadian policy rates, bond yields and exchange rates, no key required.",
    { region: "canada", topics: ["rates", "fx"], format: "json" }),
  s("boc-press", "Bank of Canada — Press", 1, "keyless",
    "https://www.bankofcanada.ca/valet/",
    "Rate decisions and Monetary Policy Reports.",
    { region: "canada", topics: ["monetary"], format: "rss" }),
  s("sec-edgar", "SEC EDGAR", 1, "keyless",
    "https://www.sec.gov/edgar/sec-api-documentation",
    "Company filings and XBRL company facts. The primary record for US corporate financials.",
    { region: "us", topics: ["companies", "filings"], format: "json",
      requirement: "Requires a declared User-Agent identifying the requester." }),
  s("worldbank", "World Bank — Open Data", 1, "keyless",
    "https://api.worldbank.org/v2/",
    "Long-run cross-country indicators: GDP, population, trade, energy.",
    { region: "global", topics: ["growth", "development"], format: "json" }),
  s("imf", "International Monetary Fund", 1, "keyless",
    "https://www.imf.org/en/Data",
    "World Economic Outlook, Article IV reviews, financial stability reporting.",
    { region: "global", topics: ["growth", "stability"], format: "mixed" }),
  s("treasury-fiscal", "US Treasury — Fiscal Data", 1, "keyless",
    "https://fiscaldata.treasury.gov/api-documentation/",
    "Debt outstanding, issuance and average interest rates on federal debt.",
    { region: "us", topics: ["fiscal", "rates"], format: "json" }),
  s("bls", "US Bureau of Labor Statistics", 1, "key",
    "https://www.bls.gov/developers/",
    "CPI, payrolls, JOLTS, productivity. A free registered key raises the request limit substantially.",
    { region: "us", topics: ["inflation", "labour"], format: "json" }),
  s("bea", "US Bureau of Economic Analysis", 1, "key",
    "https://apps.bea.gov/api/signup/",
    "GDP, personal income, PCE inflation. Free key required.",
    { region: "us", topics: ["growth", "inflation"], format: "json" }),
  s("fred", "FRED — St. Louis Fed", 1, "keyless",
    "https://fred.stlouisfed.org/",
    "The most convenient aggregator of US and international series, and the source of the equity, volatility, commodity and credit data here. Its graph endpoint serves any series as CSV with no key.",
    { region: "us", topics: ["all"], format: "csv",
      requirement: "FRED redistributes third-party data — S&P Dow Jones Indices, Nasdaq, CBOE, ICE, the IMF, Freddie Mac — each with its own copyright. Every series is shown with its rights holder and links back to its FRED page." }),
  s("federalregister", "Federal Register", 1, "keyless",
    "https://www.federalregister.gov/developers/documentation/api/v1",
    "The official daily journal of the US government: executive orders, proclamations, presidential memoranda and agency rules, as filed. This is the document the reporting is reporting on.",
    { region: "us", topics: ["policy", "trade", "sanctions", "energy"], format: "json",
      requirement: "US government work, in the public domain. The API asks only that automated callers identify themselves and stay within a reasonable request rate." }),
  s("statcan", "Statistics Canada", 1, "keyless",
    "https://www.statcan.gc.ca/en/developers",
    "Canadian CPI, labour force survey, GDP by industry.",
    { region: "canada", topics: ["inflation", "labour", "growth"], format: "json" }),
  s("eia", "US Energy Information Administration", 1, "key",
    "https://www.eia.gov/opendata/",
    "Oil, gas, electricity generation and capacity data. Free key required.",
    { region: "us", topics: ["energy"], format: "json" }),
  s("arxiv", "arXiv", 1, "keyless",
    "https://info.arxiv.org/help/api/index.html",
    "Preprints in machine learning, physics and quantitative finance. Not peer reviewed — treat as a claim, not a result.",
    { region: "global", topics: ["ai", "science"], format: "atom" }),
  s("oecd", "OECD", 1, "keyless",
    "https://data.oecd.org/",
    "Comparable cross-country statistics and policy analysis.",
    { region: "global", topics: ["growth", "policy"], format: "json" }),
  s("bis", "Bank for International Settlements", 1, "keyless",
    "https://www.bis.org/statistics/",
    "Cross-border banking, global liquidity, credit-to-GDP gaps. The best view of offshore dollar credit.",
    { region: "global", topics: ["banking", "stability"], format: "mixed" }),

  /* --- Tier 2: high-quality financial journalism ------------------------ */
  s("reuters", "Reuters", 2, "manual", "https://www.reuters.com/",
    "Wire service with a published corrections policy and a trust principles charter.",
    { topics: ["markets", "business", "geopolitics"] }),
  s("bloomberg", "Bloomberg", 2, "manual", "https://www.bloomberg.com/",
    "Market and corporate reporting. Largely paywalled.", { topics: ["markets", "business"] }),
  s("ft", "Financial Times", 2, "manual", "https://www.ft.com/",
    "Markets and policy coverage with strong European depth. Paywalled.", { topics: ["markets", "policy"] }),
  s("wsj", "The Wall Street Journal", 2, "manual", "https://www.wsj.com/",
    "US business and markets. Paywalled.", { topics: ["business", "markets"] }),
  s("economist", "The Economist", 2, "manual", "https://www.economist.com/",
    "Analysis with an explicit editorial position — which it states, and which should be read as a prior.",
    { topics: ["global", "policy"] }),

  /* --- Tier 3: specialist ------------------------------------------------ */
  s("semianalysis", "Specialist semiconductor and compute analysis", 3, "manual",
    "https://www.semianalysis.com/",
    "Deep supply chain reporting. Independent of vendors but not of the industry.",
    { topics: ["semis", "ai"] }),
  s("utility-dive", "Trade press — energy and utilities", 3, "manual",
    "https://www.utilitydive.com/",
    "Interconnection queues, rate cases, capacity markets — detail the general press does not carry.",
    { topics: ["energy", "grid"] }),
  s("ieee", "IEEE Spectrum", 3, "keyless", "https://spectrum.ieee.org/",
    "Engineering-literate technology coverage.", { topics: ["technology"] }),

  /* --- Tier 4: analysis and commentary ---------------------------------- */
  s("sellside", "Sell-side research", 4, "manual", null,
    "Argument, not observation. Read for the model and the disclosed assumptions, never for the conclusion — the author has a position.",
    { topics: ["markets"] }),
  s("thinktank", "Think tank and policy institutes", 4, "manual", null,
    "Frequently rigorous and always positioned. Check funding before weighting the conclusion.",
    { topics: ["policy", "geopolitics"] }),

  /* --- Tier 5: discovery only -------------------------------------------- */
  s("social", "Social platforms and forums", 5, "manual", null,
    "Used only to notice that something is being discussed. Never evidence that it is true. Any claim found here must be traced to a tier 1–3 source before it is repeated.",
    { topics: ["discovery"] }),
];

export const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));
export const source = (id) => SOURCE_BY_ID.get(id) || null;

export const TIERS = [
  { tier: 1, label: "Primary", note: "The entity that created the fact publishes it." },
  { tier: 2, label: "Financial press", note: "Editorial standards and published corrections." },
  { tier: 3, label: "Specialist", note: "Domain expertise, narrower scope." },
  { tier: 4, label: "Analysis", note: "Argument. The author has a position." },
  { tier: 5, label: "Discovery", note: "Signals a conversation exists. Not evidence." },
];

export const tierMeta = (tier) => TIERS.find((t) => t.tier === tier) || TIERS[4];

export const byTier = (tier) => SOURCES.filter((s) => s.tier === tier);
export const keylessSources = () => SOURCES.filter((s) => s.access === "keyless");
export const keyedSources = () => SOURCES.filter((s) => s.access === "key");

/** How much weight a claim carries before any corroboration is considered. */
export function baseCredibility(tier) {
  return { 1: 0.95, 2: 0.78, 3: 0.66, 4: 0.42, 5: 0.12 }[tier] ?? 0.3;
}
