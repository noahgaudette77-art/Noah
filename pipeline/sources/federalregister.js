/**
 * Federal Register — US policy as primary documents.
 *
 * The platform had no political source. The obvious fix is a news aggregator,
 * and it is the wrong one: an aggregator gives you someone's characterisation
 * of a policy, dated to when they wrote about it. The Federal Register is the
 * official daily journal of the US government — the executive order itself, the
 * proclamation that sets a tariff rate, the rule that adds a company to the
 * Entity List. It is the document the reporting is reporting on.
 *
 * Public domain, no key, documented API.
 *
 * SELECTION RULE, stated because it is a judgement and should be auditable.
 * The Register publishes several thousand documents a quarter, almost all of
 * them routine. Three queries, each with a reason:
 *
 *   1. Every presidential document. Executive orders, proclamations, memoranda
 *      and determinations are few and inherently consequential — no filter is
 *      needed or wanted.
 *
 *   2. Final rules flagged *significant* from agencies whose actions transmit
 *      into the world model. Significance is the government's own flag under
 *      E.O. 12866, meaning the rule went through OIRA review for economic
 *      effect. Using their flag rather than inventing a relevance score keeps
 *      the selection checkable by anyone.
 *
 *   3. Every rule from OFAC and the Bureau of Industry and Security, without
 *      the significance filter, because those two agencies exist to do exactly
 *      what the model's sanctions and export-control nodes describe, and their
 *      rules are frequently not flagged significant despite mattering a lot.
 *
 * Deliberately excluded: notices. OFAC alone files dozens of near-identically
 * titled "Notice of OFAC Sanctions Action" documents a quarter. They are the
 * designations themselves and they matter, but as a feed they are repetitive
 * and carry no abstract, so they would swamp the stream while telling a reader
 * little. The rules that establish the programmes are kept instead.
 */

import { getJson } from "../lib/http.js";
import { story, emptyResult } from "../lib/schema.js";

const API = "https://www.federalregister.gov/api/v1/documents.json";
const FIELDS = ["title", "publication_date", "html_url", "type", "abstract", "agencies"];

/** How far back to look. Presidential documents are sparse; rules are not. */
const WINDOW_DAYS = 120;

/** Agencies whose rulemaking enters the causal model. */
const MODEL_AGENCIES = [
  "treasury-department",
  "commerce-department",
  "trade-representative-office-of-united-states",
  "energy-department",
  "state-department",
  "federal-reserve-system",
  "federal-energy-regulatory-commission",
  "nuclear-regulatory-commission",
  "environmental-protection-agency",
  "international-trade-administration",
  "u-s-customs-and-border-protection",
  "defense-department",
];

/** Sanctions and export controls: the whole remit, so no significance filter. */
const INSTRUMENT_AGENCIES = ["foreign-assets-control-office", "industry-and-security-bureau"];

/**
 * Presidential document types are not exposed as a field, so the instrument is
 * read off the title, which the Register writes to a fixed form. Anything that
 * matches nothing stays a generic "Presidential document" rather than a guess.
 */
const PRESIDENTIAL_FORM = [
  [/^executive order/i, "Executive order"],
  [/^proclamation/i, "Proclamation"],
  [/^(presidential )?memorandum/i, "Memorandum"],
  [/^(presidential )?determination/i, "Determination"],
  [/^(notice of )?continuation of/i, "Continuation of emergency"],
  [/^notice of/i, "Notice"],
];

const since = (days) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

function url({ types, agencies = [], significantOnly = false, perPage }) {
  const q = new URLSearchParams({ per_page: String(perPage), order: "newest" });
  for (const field of FIELDS) q.append("fields[]", field);
  for (const type of types) q.append("conditions[type][]", type);
  for (const agency of agencies) q.append("conditions[agencies][]", agency);
  if (significantOnly) q.append("conditions[significant]", "1");
  q.append("conditions[publication_date][gte]", since(WINDOW_DAYS));
  return `${API}?${q}`;
}

/**
 * The Register publishes on a date but carries no time. Treating a date as
 * midnight UTC would put every document at the start of the day in one timezone
 * and the previous evening in another; noon avoids a spurious day of drift in
 * the freshness display.
 */
const publishedAt = (date) => `${date}T12:00:00.000Z`;

const agencyNames = (agencies) =>
  [...new Set((agencies || []).map((a) => a?.name).filter(Boolean))];

function instrumentOf(document, kind) {
  if (kind !== "presidential") return "Final rule";
  return PRESIDENTIAL_FORM.find(([pattern]) => pattern.test(document.title))?.[1]
    || "Presidential document";
}

function toStory(document, kind) {
  const agencies = agencyNames(document.agencies);
  return story({
    title: document.title,
    url: document.html_url,
    publishedAt: publishedAt(document.publication_date),
    // The agency's own abstract, or nothing. Synthesising a summary from the
    // issuing agency's name reads as content but adds no information, and it
    // poisons entity linking: "Social Security Administration" and "Homeland
    // Security Department" both match a lexicon looking for security.
    summary: (document.abstract || "").trim(),
    sourceId: "federalregister",
    tier: 1,
    kind: kind === "presidential" ? "decision" : "rule",
    region: "us",
    topics: ["policy"],
    entities: agencies,
    documentForm: instrumentOf(document, kind),
  });
}

export default {
  id: "federalregister", label: "Federal Register", sourceId: "federalregister", tier: 1,

  async run() {
    const result = emptyResult();
    const notes = [];
    const seen = new Set();

    const queries = [
      { label: "presidential documents", kind: "presidential",
        types: ["PRESDOCU"], perPage: 60 },
      { label: "significant rules", kind: "rule",
        types: ["RULE"], agencies: MODEL_AGENCIES, significantOnly: true, perPage: 40 },
      { label: "sanctions and export-control rules", kind: "rule",
        types: ["RULE"], agencies: INSTRUMENT_AGENCIES, perPage: 30 },
    ];

    for (const query of queries) {
      const response = await getJson(url(query));
      if (!response.ok) {
        notes.push(`${query.label}: ${response.error}`);
        continue;
      }

      for (const document of response.json?.results || []) {
        if (!document?.title || !document?.html_url || !document?.publication_date) continue;
        // A document can satisfy more than one query; the first classification wins.
        const key = document.document_number || document.html_url;
        if (seen.has(key)) continue;
        seen.add(key);
        result.stories.push(toStory(document, query.kind));
      }
    }

    if (!result.stories.length && !notes.length) {
      notes.push(`no qualifying documents published in the last ${WINDOW_DAYS} days`);
    }

    return { ...result, notes };
  },
};
