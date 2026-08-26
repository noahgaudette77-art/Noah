/**
 * Global search across everything the application knows.
 *
 * Not a vector index and not a language model — a scored lexical match over an
 * in-memory corpus of a few thousand short records. It runs in under a
 * millisecond, it is debuggable, and it never returns something that isn't
 * there. Natural-language queries are handled by expanding a small set of
 * domain synonyms, which covers the phrasings that actually occur.
 */

import { CONCEPTS } from "../content/concepts.js";
import { LESSONS } from "../content/lessons.js";
import { DEBATES } from "../content/debates.js";
import { TRACKS } from "../content/curriculum.js";
import { NODES } from "../domain/worldmodel.js";
import { SOURCES } from "../content/sources.js";
import { dataOf } from "../data/store.js";

/** Query expansion: the words people type versus the words the corpus uses. */
const SYNONYMS = {
  fed: ["federal reserve", "policy rate", "fomc"],
  rates: ["interest rate", "policy rate", "yield"],
  recession: ["yield curve", "unemployment", "downturn"],
  ai: ["artificial intelligence", "model capability", "compute"],
  chips: ["semiconductor", "accelerator", "foundry"],
  power: ["electricity", "grid", "generation"],
  energy: ["oil", "natural gas", "electricity"],
  inflation: ["cpi", "prices", "core"],
  crash: ["financial instability", "volatility", "crisis"],
  china: ["china growth", "trade", "export controls"],
  housing: ["home prices", "mortgage", "housing activity"],
  jobs: ["unemployment", "payrolls", "labour"],
  war: ["geopolitical risk", "defence", "conflict"],
  bubble: ["valuation", "capital expenditure", "speculation"],
};

let corpus = null;

function build() {
  const records = [];

  for (const concept of CONCEPTS) {
    records.push({
      kind: "concept", id: concept.id, title: concept.term,
      subtitle: `Concept · ${concept.domain}`,
      route: `/knowledge/${concept.id}`,
      text: `${concept.term} ${concept.domain} ${(concept.tags || []).join(" ")} ${concept.levels.beginner}`,
      weight: 1.05,
    });
  }

  for (const node of NODES) {
    records.push({
      kind: "node", id: node.id, title: node.label,
      subtitle: `World model · ${node.group}`,
      route: `/graph?focus=${node.id}`,
      text: `${node.label} ${node.kind} ${node.group} ${node.blurb} ${(node.proxies || []).join(" ")}`,
      weight: 1,
    });
  }

  for (const lesson of LESSONS) {
    records.push({
      kind: "lesson", id: lesson.id, title: lesson.title,
      subtitle: `History · ${lesson.era}`,
      route: `/history/${lesson.id}`,
      text: `${lesson.title} ${lesson.era} ${lesson.hook} ${lesson.domain}`,
      weight: 1,
    });
  }

  for (const entry of DEBATES) {
    records.push({
      kind: "debate", id: entry.id, title: entry.topic,
      subtitle: `Debate · ${entry.domain}`,
      route: `/debates/${entry.id}`,
      text: `${entry.topic} ${entry.stakes} ${entry.consensus.claim} ${entry.contrarian.claim}`,
      weight: 1,
    });
  }

  for (const entry of TRACKS) {
    records.push({
      kind: "track", id: entry.id, title: entry.title,
      subtitle: `Curriculum · ${entry.stages.length} stages`,
      route: `/curriculum/${entry.id}`,
      text: `${entry.title} ${entry.why} ${entry.stages.map((s) => `${s.label} ${s.goal}`).join(" ")}`,
      weight: 0.95,
    });
  }

  for (const source of SOURCES) {
    records.push({
      kind: "source", id: source.id, title: source.name,
      subtitle: `Source · tier ${source.tier}`,
      route: `/sources#${source.id}`,
      text: `${source.name} ${source.note} ${(source.topics || []).join(" ")}`,
      weight: 0.7,
    });
  }

  return records;
}

/** Companies come from the pipeline, so they are merged in rather than cached. */
function companyRecords() {
  const data = dataOf("fundamentals");
  if (!data?.companies) return [];
  return data.companies.map((company) => ({
    kind: "company", id: company.ticker, title: `${company.ticker} — ${company.name}`,
    subtitle: company.sic ? `Company · ${company.sic}` : "Company",
    route: `/companies/${company.ticker}`,
    text: `${company.ticker} ${company.name} ${company.sic || ""} ${company.node || ""}`,
    weight: 1.05,
  }));
}

/** Story records change with every pipeline run, so they are merged in fresh. */
function storyRecords() {
  const stories = dataOf("stories");
  if (!stories?.clusters) return [];
  return stories.clusters.slice(0, 120).map((cluster) => ({
    kind: "story", id: cluster.id, title: cluster.lead.title,
    subtitle: `Development · ${cluster.sources.join(", ")}`,
    route: `/stream?story=${encodeURIComponent(cluster.id)}`,
    text: `${cluster.lead.title} ${cluster.lead.summary || ""} ${cluster.topics.join(" ")}`,
    weight: 0.95, payload: cluster,
  }));
}

export function invalidate() { corpus = null; }

export function search(query, { limit = 12, kinds = null } = {}) {
  const raw = query.trim().toLowerCase();
  if (raw.length < 2) return [];
  if (!corpus) corpus = build();

  const terms = raw.split(/\s+/).filter(Boolean);
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const synonym of SYNONYMS[term] || []) expanded.add(synonym);
  }

  const pool = [...corpus, ...companyRecords(), ...storyRecords()];
  const results = [];

  for (const record of pool) {
    if (kinds && !kinds.includes(record.kind)) continue;
    const title = record.title.toLowerCase();
    const text = record.text.toLowerCase();
    let score = 0;

    if (title === raw) score += 120;
    else if (title.startsWith(raw)) score += 74;
    else if (title.includes(raw)) score += 52;
    if (text.includes(raw)) score += 14;

    for (const term of expanded) {
      if (title.includes(term)) score += term === raw ? 0 : 16;
      else if (text.includes(term)) score += 5;
    }

    // Every term must appear somewhere, so multi-word queries narrow rather than widen.
    const coverage = terms.filter((term) => text.includes(term) || title.includes(term)).length / terms.length;
    if (coverage < 0.5) continue;
    score *= 0.55 + 0.45 * coverage;

    if (score > 0) results.push({ ...record, score: score * record.weight });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const KIND_ICON = {
  concept: "brain", node: "graph", lesson: "book",
  source: "layers", story: "pulse", command: "command", company: "building", debate: "scale", track: "layers",
};
