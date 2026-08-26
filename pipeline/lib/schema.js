/** Normalised shapes every adapter must produce. Enforced, not merely documented. */

import { createHash } from "node:crypto";

export const idFor = (...parts) =>
  createHash("sha1").update(parts.filter(Boolean).join("|")).digest("hex").slice(0, 16);

export function story({ title, url, publishedAt, summary = "", sourceId, tier, kind = "release",
                        region = "global", topics = [], entities = [] }) {
  if (!title || !url || !sourceId) throw new Error("story requires title, url, sourceId");
  return {
    id: idFor(sourceId, url, title),
    title: title.trim(), url, publishedAt: publishedAt || null,
    summary: (summary || "").trim(), sourceId, tier, kind, region,
    topics: [...new Set(topics)], entities,
  };
}

export function series({ id, label, unit, sourceId, observations, note = null, nodeId = null }) {
  const clean = (observations || [])
    .filter((o) => o && o.d && Number.isFinite(Number(o.v)))
    .map((o) => ({ d: String(o.d).slice(0, 10), v: Number(o.v) }))
    .sort((a, b) => (a.d < b.d ? -1 : 1));
  const last = clean[clean.length - 1] || null;
  const previous = clean[clean.length - 2] || null;
  return {
    id, label, unit, sourceId, note, nodeId,
    observations: clean,
    asOf: last?.d || null,
    latest: last?.v ?? null,
    change: last && previous ? Number((last.v - previous.v).toFixed(4)) : null,
    count: clean.length,
  };
}

export function filing({ company, ticker, cik, form, filedAt, url, description = "" }) {
  return {
    id: idFor("sec", cik, form, filedAt, url),
    company, ticker, cik, form, filedAt, url, description,
    sourceId: "sec-edgar", tier: 1,
  };
}

export function paper({ title, url, publishedAt, authors = [], summary = "", categories = [] }) {
  return {
    id: idFor("arxiv", url), title: title.trim(), url, publishedAt,
    authors: authors.slice(0, 6), summary: summary.slice(0, 900),
    categories, sourceId: "arxiv", tier: 1,
  };
}

export const emptyResult = () =>
  ({ stories: [], series: [], filings: [], research: [], events: [] });
