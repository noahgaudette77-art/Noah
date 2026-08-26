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
  // "security" alone matched Social Security and Homeland Security; "military"
  // matched a commission on military spouses. Aggregate risk needs phrases that
  // are about conflict, not words that appear in the names of agencies.
  geopolitical_risk: ["armed conflict", "national security", "military action",
    "military escalation", "geopolitical", "national emergency", "hostilities"],
  defense_spending: ["defense budget", "defence budget", "procurement", "military spending"],
  robotics: ["robot", "robotics", "autonomous system"],
  cybersecurity: ["cyber", "ransomware", "vulnerability", "breach"],
  labor_automation: ["automation", "displacement", "workforce"],
  housing_activity: ["housing", "mortgage", "home sales", "residential construction"],
  copper: ["copper"],
  // "Gold standard" is an idiom far more often than it is a monetary regime, and
  // it turned a childhood-vaccine rule into a commodity story.
  gold: ["gold price", "gold futures", "spot gold", "gold reserves", "bullion"],
  productivity: ["productivity", "output per hour"],
  credit_spreads: ["credit spread", "high yield", "investment grade", "corporate bond"],
  // Bare "fiscal" and "budget" matched "Fiscal Year 2026" on a fee schedule.
  fiscal_deficit: ["budget deficit", "federal deficit", "fiscal deficit", "deficit spending",
    "federal debt", "national debt", "debt ceiling", "fiscal policy", "government shutdown"],
  regulation_ai: ["ai act", "ai regulation", "model governance", "ai safety"],

  // Named theatres and policy instruments. Deliberately narrow: "china" alone
  // appears in routine trade notices that have nothing to do with Taiwan, and a
  // wrong link here corrupts every chain downstream of it.
  taiwan_risk: ["taiwan", "taiwan strait", "cross-strait"],
  russia_ukraine: ["ukraine", "russian federation", "russia sanctions"],
  middle_east_risk: ["middle east", "red sea", "strait of hormuz", "persian gulf"],
  trade_fragmentation: ["trade agreement", "supply chain resilience", "friendshoring",
    "reshoring", "trade fragmentation", "decoupling"],
  election_risk: ["election", "electoral", "ballot", "campaign finance"],
  immigration: ["immigration", "visa", "asylum", "border security"],
  energy_transition: ["clean energy", "renewable energy", "emissions standard",
    "energy transition", "decarbonisation", "decarbonization"],
  energy_sector: ["drilling", "oil and gas lease", "offshore lease", "energy production"],
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

/**
 * A title says what a document is about; a body may mention anything. A federal
 * rule on endangered species carries the phrase "national security" because the
 * statute requires the agency to weigh it, and a veterans-hiring rule mentions
 * inflation because a threshold is indexed to it. Neither is about those things.
 *
 * So a match in the title links the node outright, and a match only in the body
 * has to occur more than once to count — repetition is the cheapest available
 * evidence that a subject is the subject rather than an aside.
 */
const BODY_MENTIONS_REQUIRED = 2;

const countMatches = (pattern, text) => {
  const global = new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`);
  return (text.match(global) || []).length;
};

export function linkEntities(story, { tracked = {} } = {}) {
  const title = story.title || "";
  const body = story.summary || "";
  const nodes = [];

  for (const { nodeId, patterns } of COMPILED) {
    let titleHits = 0;
    let bodyMentions = 0;
    for (const pattern of patterns) {
      if (pattern.test(title)) titleHits += 1;
      bodyMentions += countMatches(pattern, body);
    }
    if (!titleHits && bodyMentions < BODY_MENTIONS_REQUIRED) continue;
    // Title evidence outranks body evidence when ordering the links.
    nodes.push({ nodeId, hits: titleHits * 3 + Math.min(bodyMentions, 6) });
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
