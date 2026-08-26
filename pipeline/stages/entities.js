/**
 * Entity linking: attach each story to the world-model nodes it concerns.
 *
 * Keyword matching against an authored lexicon — deliberately not a model. A
 * wrong link here would silently corrupt every downstream chain, and a
 * deterministic matcher fails visibly and is fixable in one place.
 */

const LEXICON = {
  policy_rate: ["federal funds", "fomc", "policy rate", "target range", "rate decision", "monetary policy"],
  boc_rate: ["bank of canada", "overnight rate"],
  ecb_rate: ["governing council", "deposit facility", "ecb rate"],
  balance_sheet: ["balance sheet", "quantitative tightening", "quantitative easing", "securities holdings"],
  headline_inflation: ["inflation", "consumer price", "cpi", "price index"],
  core_inflation: ["core inflation", "core cpi", "core pce"],
  unemployment: ["unemployment", "jobless", "labor market", "labour market", "payroll"],
  gdp: ["gross domestic product", "gdp", "economic growth"],
  bank_lending: ["lending standards", "loan officer", "credit conditions", "bank credit"],
  banks: ["bank holding", "banking organization", "depository", "capital requirement", "stress test"],
  financial_instability: ["financial stability", "systemic risk", "resolution plan", "enforcement action"],
  ust10y: ["treasury yield", "10-year", "bond yield", "long-term rates"],
  yield_curve: ["yield curve", "inversion", "term structure"],
  usd: ["dollar", "exchange rate", "foreign exchange"],
  usdcad: ["canadian dollar", "usd/cad", "loonie"],
  eurusd: ["euro", "eur/usd"],
  oil: ["crude", "oil price", "petroleum", "opec"],
  natgas: ["natural gas", "lng", "gas price"],
  electricity_price: ["electricity price", "power price", "wholesale power"],
  power_demand: ["electricity demand", "load growth", "power demand", "energy demand"],
  grid_capacity: ["transmission line", "power transmission", "interconnection", "grid capacity", "substation", "transmission capacity"],
  nuclear_power: ["nuclear", "reactor", "uranium fuel"],
  ai_capability: ["language model", "foundation model", "frontier model", "artificial intelligence", "machine learning", "neural network", "transformer"],
  ai_capex: ["ai investment", "capital expenditure", "capex", "data center investment", "data centre investment"],
  accelerators: ["gpu", "accelerator", "ai chip", "tensor"],
  foundry: ["foundry", "wafer", "fabrication", "process node", "nanometer"],
  semicap: ["lithography", "semiconductor equipment", "euv", "deposition", "etch"],
  hbm: ["high-bandwidth memory", "hbm", "dram"],
  semis: ["semiconductor", "chip", "silicon"],
  data_center_buildout: ["data center", "data centre", "hyperscale", "colocation"],
  export_controls: ["export control", "entity list", "licence requirement", "license requirement"],
  tariffs: ["tariff", "duty", "trade barrier", "section 301", "anti-dumping"],
  sanctions: ["sanction", "designated national", "asset freeze"],
  geopolitical_risk: ["conflict", "military", "escalation", "security"],
  defense_spending: ["defense budget", "defence budget", "procurement", "military spending"],
  robotics: ["robot", "robotics", "autonomous system"],
  cybersecurity: ["cyber", "ransomware", "vulnerability", "breach"],
  labor_automation: ["automation", "displacement", "workforce"],
  housing_activity: ["housing", "mortgage", "home sales", "residential construction"],
  copper: ["copper"],
  gold: ["gold"],
  productivity: ["productivity", "output per hour"],
  credit_spreads: ["credit spread", "high yield", "investment grade", "corporate bond"],
  fiscal_deficit: ["deficit", "federal debt", "fiscal", "budget"],
  regulation_ai: ["ai act", "ai regulation", "model governance", "ai safety"],
};

/**
 * Multi-word phrases match without a trailing boundary, so "monetary policy"
 * also catches "monetary policymaker". Single words keep the boundary but allow
 * a plural, so "tariff" catches "tariffs" and not "tariffication".
 */
function compile(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tail = phrase.includes(" ") ? "" : "(?:s|es)?\\b";
  return new RegExp(`\\b${escaped}${tail}`, "i");
}

const COMPILED = Object.entries(LEXICON).map(([nodeId, phrases]) => ({
  nodeId, patterns: phrases.map(compile),
}));

export function linkEntities(story, { tracked = {} } = {}) {
  const haystack = `${story.title} ${story.summary}`;
  const nodes = [];

  for (const { nodeId, patterns } of COMPILED) {
    const hits = patterns.filter((pattern) => pattern.test(haystack)).length;
    if (hits) nodes.push({ nodeId, hits });
  }

  const tickers = [];
  for (const ticker of Object.keys(tracked)) {
    if (new RegExp(`\\b${ticker}\\b`).test(story.title)) tickers.push(ticker);
  }

  nodes.sort((a, b) => b.hits - a.hits);
  return { nodes: nodes.slice(0, 6), tickers };
}

export function linkAll(stories, options = {}) {
  return stories.map((story) => ({ ...story, ...linkEntities(story, options) }));
}
