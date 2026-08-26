/**
 * DATA REGISTRY
 *
 * Every dataset the interface can display is declared here with the honest
 * answers to three questions: where does it come from, how long does it stay
 * current, and what should the interface say when it is absent.
 *
 * Nothing in the application invents a value for a missing dataset. A view whose
 * data has not been produced renders an empty state that names the dataset, the
 * command that produces it, and the sources it would come from. That is the
 * whole point: a beautiful screen full of plausible numbers nobody generated is
 * worse than an empty one.
 */

export const DATASETS = {
  manifest: {
    path: "manifest.json",
    label: "Run manifest",
    maxAgeHours: 30,
    produces: "npm run intel",
    describes: "When the pipeline last ran, which sources answered, and what it wrote.",
    sources: [],
  },
  stories: {
    path: "stories.json",
    label: "Intelligence stream",
    maxAgeHours: 24,
    produces: "npm run intel",
    describes: "Deduplicated, clustered and ranked developments from primary institutional feeds.",
    sources: ["fed-press", "ecb-press", "boc-press", "federalregister", "sec-edgar", "arxiv"],
  },
  markets: {
    path: "markets.json",
    label: "Market series",
    maxAgeHours: 20,
    produces: "npm run intel",
    describes: "Daily closes for equity indices, volatility, commodities, credit spreads, real yields and currencies.",
    sources: ["fred", "treasury-fiscal", "boc-valet", "ecb-data"],
    caveat: "End-of-day values. This is not a real-time quote feed and is not intended to be one.",
  },
  indicators: {
    path: "indicators.json",
    label: "Macro indicators",
    maxAgeHours: 24 * 40,
    produces: "npm run intel",
    describes: "Inflation, labour, activity and monetary observations for the macro variables the world model tracks.",
    sources: ["fred", "worldbank", "boc-valet", "ecb-data", "treasury-fiscal"],
  },
  research: {
    path: "research.json",
    label: "Research radar",
    maxAgeHours: 24 * 4,
    produces: "npm run intel",
    describes: "Recent preprints in machine learning and adjacent fields.",
    sources: ["arxiv"],
    caveat: "Preprints are not peer reviewed. Presence here is evidence of a claim, not of a result.",
  },
  filings: {
    path: "filings.json",
    label: "Corporate filings",
    maxAgeHours: 24 * 3,
    produces: "npm run intel",
    describes: "Recent SEC filings for tracked companies.",
    sources: ["sec-edgar"],
  },
  fundamentals: {
    path: "fundamentals.json",
    label: "Company fundamentals",
    maxAgeHours: 24 * 10,
    produces: "npm run intel -- --fundamentals",
    describes: "Revenue, margins, cash flow and balance sheet as filed with the SEC, for the companies that sit on a node in the world model.",
    sources: ["sec-edgar"],
    caveat: "Reported figures only — no estimates and no consensus. Valuation appears here only when a price provider key is configured; without one the screen says it cannot tell you whether shares are cheap.",
  },
  prices: {
    path: "prices.json",
    label: "Share prices",
    maxAgeHours: 24 * 2,
    produces: "INTEL_EQUITY_KEY=... npm run intel",
    describes: "Delayed end-of-day quotes for the tracked companies — the platform's only keyed source.",
    sources: ["finnhub"],
    caveat: "Delayed quotes, not a real-time feed. Absent until a provider key is configured, and the "
          + "companies screen says so rather than approximating a price.",
  },
  calendar: {
    path: "calendar.json",
    label: "Week ahead",
    maxAgeHours: 24 * 8,
    produces: "npm run intel",
    describes: "Scheduled releases, decisions and events for the coming week.",
    sources: ["fed-press", "ecb-press", "boc-press"],
  },
  briefs: {
    path: "briefs/index.json",
    label: "Weekly brief archive",
    maxAgeHours: Infinity,
    produces: "npm run brief",
    describes: "Every Monday brief the pipeline has generated, permanently archived.",
    sources: [],
  },
};

/**
 * Where the JSON lives. Resolved relative to the app document so the same build
 * works at a domain root, in a subdirectory, or opened from disk.
 */
export function dataUrl(key) {
  const dataset = DATASETS[key];
  if (!dataset) throw new Error(`Unknown dataset: ${key}`);
  return new URL(`../../../data/${dataset.path}`, import.meta.url).href;
}

/** Status vocabulary shared by every consumer. */
export const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  ABSENT: "absent",     // pipeline has not produced this yet — expected, not an error
  ERROR: "error",       // present but unreadable — that IS an error
};
