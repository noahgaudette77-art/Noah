#!/usr/bin/env node
/**
 * The orchestrator.
 *
 * Sources → dedupe → entity link → cluster → rank → write JSON snapshots that
 * the static client reads. Designed to run anywhere: a laptop, a cron job, or a
 * GitHub Action that commits the output. No database, no server, no keys.
 *
 *   node pipeline/run.js            full run
 *   node pipeline/run.js --brief    also write this week's Monday brief
 *   node pipeline/run.js --only=fed limit to named adapters
 *
 * A source that fails is recorded in the manifest and the run continues. The
 * client reads the manifest and tells the reader exactly what is missing, which
 * is the entire reason the manifest exists.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fed from "./sources/fed.js";
import ecb from "./sources/ecb.js";
import boc from "./sources/boc.js";
import treasury from "./sources/treasury.js";
import sec from "./sources/sec.js";
import arxiv from "./sources/arxiv.js";
import worldbank from "./sources/worldbank.js";
import fundamentals from "./sources/fundamentals.js";
import { dedupe } from "./stages/dedupe.js";
import { linkAll } from "./stages/entities.js";
import { cluster } from "./stages/cluster.js";
import { rank, explainScore } from "./stages/score.js";
import { buildBrief } from "./brief.js";
import { TRACKED } from "./sources/sec.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data");

const ADAPTERS = [fed, ecb, boc, treasury, sec, arxiv, worldbank];

/**
 * Fundamentals change four times a year, so fetching them daily would be four
 * megabytes per company of pointless traffic. They refresh weekly, or on demand.
 */
const WEEKLY_ADAPTERS = [fundamentals];

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

async function main() {
  const startedAt = Date.now();
  const only = option("only")?.split(",").map((s) => s.trim()).filter(Boolean);
  const wantWeekly = flag("fundamentals") || flag("brief") || isMonday();
  const pool = wantWeekly ? [...ADAPTERS, ...WEEKLY_ADAPTERS] : ADAPTERS;
  const adapters = only ? [...ADAPTERS, ...WEEKLY_ADAPTERS].filter((a) => only.includes(a.id)) : pool;

  console.log(`intel: running ${adapters.length} source${adapters.length === 1 ? "" : "s"}`);

  const runs = [];
  for (const adapter of adapters) {
    const began = Date.now();
    try {
      const result = await adapter.run();
      runs.push({
        id: adapter.id, label: adapter.label, sourceId: adapter.sourceId,
        ok: true, ms: Date.now() - began,
        counts: {
          stories: result.stories?.length || 0,
          series: result.series?.length || 0,
          filings: result.filings?.length || 0,
          research: result.research?.length || 0,
        },
        skipped: Boolean(result.skipped),
        notes: result.notes || [],
        result,
      });
      const mark = result.skipped ? "–" : "✓";
      console.log(`  ${mark} ${adapter.label.padEnd(24)} ${result.skipped ? "skipped" : summarise(result)} (${Date.now() - began}ms)`);
      if (result.notes?.length) result.notes.forEach((n) => console.log(`      note: ${n}`));
    } catch (error) {
      runs.push({
        id: adapter.id, label: adapter.label, sourceId: adapter.sourceId,
        ok: false, ms: Date.now() - began, error: String(error.message || error),
        counts: {}, notes: [],
      });
      console.log(`  ✗ ${adapter.label.padEnd(24)} ${error.message}`);
    }
  }

  const ok = runs.filter((run) => run.ok);
  const stories = ok.flatMap((run) => run.result.stories || []);
  const series = ok.flatMap((run) => run.result.series || []);
  const filings = ok.flatMap((run) => run.result.filings || []);
  const research = ok.flatMap((run) => run.result.research || []);
  const curve = ok.map((run) => run.result.curve).find(Boolean) || null;
  const companies = ok.flatMap((run) => run.result.companies || []);

  const deduped = dedupe(stories);
  const linked = linkAll(deduped.items, { tracked: TRACKED });
  const clusters = rank(cluster(linked));

  const generatedAt = new Date().toISOString();
  const partial = Boolean(only);
  await mkdir(path.join(OUT, "briefs"), { recursive: true });

  // On a partial run, carry forward whatever the skipped sources wrote last time.
  const priorMarkets = partial ? await readExisting("markets.json") : null;
  const priorIndicators = partial ? await readExisting("indicators.json") : null;
  const priorFilings = partial ? await readExisting("filings.json") : null;
  const priorResearch = partial ? await readExisting("research.json") : null;
  const priorStories = partial ? await readExisting("stories.json") : null;
  const priorFundamentals = await readExisting("fundamentals.json");
  const priorManifest = partial ? await readExisting("manifest.json") : null;
  if (partial) console.log("  (partial run — carrying forward snapshots from sources that did not run)");

  const publicClusters = clusters.map((entry) => ({
    id: entry.id, rank: entry.rank, score: entry.score, components: entry.components,
    isDecision: Boolean(entry.isDecision), whyRanked: explainScore(entry),
    size: entry.size, sources: entry.sources, topics: entry.topics, regions: entry.regions,
    nodes: entry.nodes, publishedAt: entry.publishedAt,
    lead: strip(entry.lead),
    items: entry.items.map(strip),
  }));

  const mergedClusters = partial
    ? mergeById(publicClusters, priorStories?.clusters || [])
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }))
    : publicClusters;

  await write("stories.json", {
    generatedAt,
    partial,
    counts: {
      raw: stories.length, deduped: deduped.items.length,
      removed: deduped.removed, clusters: mergedClusters.length,
    },
    clusters: mergedClusters,
  });

  const marketSeries = series.filter((entry) =>
    ["ust", "curve", "usdcad", "eurusd", "boc", "cangov", "avg"].some((prefix) => entry.id.startsWith(prefix)));

  await write("markets.json", {
    generatedAt,
    partial,
    note: "End-of-day official series from the issuing institutions. Not a real-time quote feed.",
    curve: curve || priorMarkets?.curve || null,
    series: mergeById(marketSeries, priorMarkets?.series || []),
  });

  await write("indicators.json", {
    generatedAt,
    partial,
    series: mergeById(series.filter((entry) => entry.id.startsWith("wb_")), priorIndicators?.series || []),
  });

  // Carried forward on any run that did not fetch them, weekly cadence or not.
  const mergedCompanies = companies.length
    ? mergeById(companies, priorFundamentals?.companies || [], "ticker")
    : priorFundamentals?.companies || [];
  if (mergedCompanies.length) {
    await write("fundamentals.json", {
      generatedAt: companies.length ? generatedAt : priorFundamentals?.generatedAt || generatedAt,
      refreshedAt: companies.length ? generatedAt : priorFundamentals?.refreshedAt || null,
      note: "Figures as filed with the SEC. No valuation, no estimates, no consensus — none of those "
          + "are available without a paid feed, so the screen ranks how a business performs and cannot "
          + "say whether its shares are attractively priced.",
      companies: mergedCompanies,
    });
  }

  await write("research.json", {
    generatedAt, partial,
    papers: mergeById(research, priorResearch?.papers || []).slice(0, 60),
  });
  await write("filings.json", {
    generatedAt, partial,
    tracked: Object.keys(TRACKED).length ? TRACKED : priorFilings?.tracked || {},
    filings: mergeById(filings, priorFilings?.filings || []).slice(0, 120),
  });

  const week = weekStart(new Date());
  if (flag("brief") || isMonday()) {
    const brief = buildBrief({
      weekStart: week,
      clusters: partial ? mergedClusters : clusters,
      series: mergeById(series, priorMarkets?.series || []),
      research: mergeById(research, priorResearch?.papers || []),
      filings: mergeById(filings, priorFilings?.filings || []),
      generatedAt,
    });
    await write(path.join("briefs", `${week}.json`), brief);
    await updateBriefIndex(week, brief);
    console.log(`  → wrote brief for week of ${week}`);
  }

  /**
   * A partial run must not erase the record of what the sources it skipped
   * reported last time. The status bar reads this as current coverage, so
   * dropping a gap would quietly turn "one source is failing" into "everything
   * is fine" — the exact failure mode the manifest exists to prevent.
   */
  const ranIds = new Set(runs.map((run) => run.id));
  const carried = (priorManifest?.sources || [])
    .filter((entry) => !ranIds.has(entry.id))
    .map((entry) => ({ ...entry, carriedFrom: priorManifest.generatedAt }));

  const manifest = {
    generatedAt,
    partial,
    durationMs: Date.now() - startedAt,
    node: process.version,
    sources: [...runs.map(({ result, ...rest }) => rest), ...carried],
    totals: {
      stories: stories.length, clusters: clusters.length,
      series: series.length, filings: filings.length, research: research.length,
      companies: mergedCompanies.length,
    },
    /** Everything the run could not obtain, named. The client shows this. */
    gaps: [...runs, ...carried]
      .filter((run) => !run.ok || run.skipped || run.notes?.length)
      .map((run) => ({
        source: run.label, sourceId: run.sourceId,
        skipped: Boolean(run.skipped), error: run.error || null,
        notes: run.notes || [], carriedFrom: run.carriedFrom || null,
      })),
  };
  await write("manifest.json", manifest);

  console.log(`\nintel: ${clusters.length} clusters from ${stories.length} items in ${Math.round((Date.now() - startedAt) / 1000)}s`);
  if (manifest.gaps.length) console.log(`intel: ${manifest.gaps.length} source(s) reported gaps — recorded in manifest.json`);
}

function strip(item) {
  const { _tokens, ...rest } = item;
  return rest;
}

function summarise(result) {
  const parts = [];
  if (result.stories?.length) parts.push(`${result.stories.length} stories`);
  if (result.series?.length) parts.push(`${result.series.length} series`);
  if (result.filings?.length) parts.push(`${result.filings.length} filings`);
  if (result.research?.length) parts.push(`${result.research.length} papers`);
  if (result.companies?.length) parts.push(`${result.companies.length} companies`);
  return parts.join(", ") || "nothing";
}

async function write(name, payload) {
  const file = path.join(OUT, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(payload, null, 1)}\n`, "utf8");
}

async function readExisting(name) {
  const file = path.join(OUT, name);
  if (!existsSync(file)) return null;
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; }
}

/**
 * A partial run (--only) must not delete what the sources it skipped produced
 * last time. Merge by identity, preferring what this run just fetched.
 */
function mergeById(fresh, previous, key = "id") {
  if (!previous?.length) return fresh;
  const seen = new Set(fresh.map((entry) => entry[key]));
  return [...fresh, ...previous.filter((entry) => !seen.has(entry[key]))];
}

async function updateBriefIndex(week, brief) {
  const file = path.join(OUT, "briefs", "index.json");
  let index = { generatedAt: null, briefs: [] };
  if (existsSync(file)) {
    try { index = JSON.parse(await readFile(file, "utf8")); } catch { /* rebuild */ }
  }
  index.briefs = [
    { weekStart: week, generatedAt: brief.generatedAt, headline: brief.headline,
      top: brief.bigPicture.slice(0, 3).map((item) => item.title),
      lesson: brief.lesson.title },
    ...(index.briefs || []).filter((entry) => entry.weekStart !== week),
  ].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  index.generatedAt = brief.generatedAt;
  await write(path.join("briefs", "index.json"), index);
}

function weekStart(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const isMonday = () => new Date().getUTCDay() === 1;

main().catch((error) => {
  console.error("intel: fatal", error);
  process.exit(1);
});
