/**
 * POLITICS — the four registers, kept apart.
 *
 * The organising discipline of this view is that most political analysis fails
 * by mixing four different kinds of claim into one paragraph, so the reader
 * cannot tell which parts are checkable. Here they never share a container:
 *
 *   FACT           a document exists, on a date, issued by a named body. Comes
 *                  from the Federal Register. Every one links to the original.
 *   STRUCTURAL     durable facts about how the domain works. Authored.
 *   INTERPRETATION what an instrument usually means. Authored, labelled as
 *                  inference, and shown with what it rests on and what would
 *                  falsify it.
 *   SCENARIO       propagated through the world model, so the chain can be
 *                  inspected edge by edge. No probabilities, ever.
 *   UNCERTAINTY    open questions, including the ones the model itself raises
 *                  where its own chains disagree about a sign.
 *
 * What this view will not do: infer from a document what it does not say,
 * attribute intent, or characterise anyone's motives.
 */

import { h, mount, icon } from "../../core/dom.js";
import { load, dataOf } from "../../data/store.js";
import { go, parse } from "../../core/router.js";
import {
  panel, pageHead, badge, sectionHead, empty, cite, confidence, direction, lag,
} from "../components/kit.js";
import { pipelineEmpty } from "../components/states.js";
import { openNode, openStory } from "../components/drawer.js";
import { POLICY_FRAMES, frameFor } from "../../content/policy-frames.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { propagate } from "../../domain/propagate.js";
import { date as fmtDate, plural } from "../../core/format.js";

/** The register labels, defined once so the vocabulary cannot drift. */
const REGISTER = {
  fact: { label: "Fact", tone: "up", gloss: "on the record, with the document" },
  structural: { label: "Structural", tone: "cyan", gloss: "durable, not tied to a news cycle" },
  interpretation: { label: "Interpretation", tone: "warn", gloss: "inference, and falsifiable" },
  scenario: { label: "Scenario", tone: "accent", gloss: "the model's transmission, not a forecast" },
  uncertainty: { label: "Uncertainty", tone: "", gloss: "not known, stated as a question" },
};

const registerTag = (key) => {
  const entry = REGISTER[key];
  return h("span.row-s", { style: { alignItems: "baseline", gap: "var(--s2)" } },
    badge(entry.label, entry.tone),
    h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, entry.gloss));
};

export function politicsView() {
  const root = h("div.view-inner");
  const { segments } = parse();
  load("stories").then(() => {
    if (segments[1]) renderFrame(root, segments[1]);
    else renderIndex(root);
  });
  return root;
}

/** Federal Register documents in the stream, newest first. */
function policyDocuments() {
  const clusters = dataOf("stories")?.clusters || [];
  return clusters
    .filter((cluster) => cluster.lead?.sourceId === "federalregister")
    .sort((a, b) => String(b.lead.publishedAt || "").localeCompare(String(a.lead.publishedAt || "")));
}

const documentsFor = (nodeId, documents) =>
  documents.filter((cluster) => (cluster.nodes || []).some((entry) => (entry.nodeId || entry.id) === nodeId));

/* ============================== INDEX ============================== */

function renderIndex(root) {
  const stories = dataOf("stories");
  const documents = stories ? policyDocuments() : [];

  mount(root,
    pageHead("Politics",
      "US policy read as primary documents. Every claim here is labelled with what kind of claim it is — what is on the record, what is durably true, what is inference, and what is simply not known."),

    disciplineCallout(),

    stories
      ? (documents.length ? recentPanel(documents) : noDocumentsPanel())
      : panel({ title: "On the record", body: pipelineEmpty("stories") }),

    h("div", { style: { marginTop: "var(--s8)" } },
      sectionHead("Policy variables", "Each one framed by register, and connected to the model"),
      h("div.grid.g2", null, ...POLICY_FRAMES.map((frame) => frameCard(frame, documentsFor(frame.nodeId, documents))))),

    h("div", { style: { marginTop: "var(--s8)" } }, coveragePanel()),
  );
}

function disciplineCallout() {
  return h("div", { style: { marginBottom: "var(--s7)" } },
    panel({
      title: "How to read this page",
      sub: "the separation is the method",
      body: h("div.stack-s", null,
        ...Object.keys(REGISTER).map((key) => h("div.row-s", { style: { alignItems: "flex-start" } },
          h("span", { style: { flex: "none", minWidth: "150px" } }, registerTag(key)))),
        h("p.prose", { style: { marginTop: "var(--s4)", fontSize: "var(--t-small)" } },
          "Most political analysis fails by mixing these into one paragraph, so a reader cannot tell which parts are checkable. "
          + "Here they never share a container. Nothing on this page infers from a document what it does not say, and nothing attributes intent.")),
    }));
}

function recentPanel(documents) {
  const shown = documents.slice(0, 8);
  return panel({
    title: "On the record",
    sub: `${plural(documents.length, "document")} from the Federal Register`,
    actions: registerTag("fact"),
    flush: true,
    body: h("div.rows", null, ...shown.map(documentRow)),
    foot: h("span", null,
      "The official daily journal of the US government. These are the instruments themselves — ",
      h("b", "not"), " reporting about them, and not their effects."),
  });
}

function documentRow(cluster) {
  const lead = cluster.lead;
  const nodes = (cluster.nodes || []).map((entry) => findNode(entry.nodeId || entry.id)).filter(Boolean);
  return h("button.rowitem", { type: "button", onclick: () => openStory(cluster) },
    h("span.grow", null,
      h("div.row-s.wrap", { style: { marginBottom: "var(--s1)" } },
        lead.documentForm ? badge(lead.documentForm, "cyan") : null,
        cite(lead.sourceId, { url: lead.url }),
        h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, fmtDate(lead.publishedAt))),
      h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, lead.title),
      lead.entities?.length
        ? h("div.rowitem__meta", { style: { marginTop: "2px" } }, lead.entities.slice(0, 2).join(" · "))
        : null,
      nodes.length ? h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
        ...nodes.slice(0, 3).map((target) => h("span.chip", target.label))) : null),
    icon("chevron", 12));
}

function noDocumentsPanel() {
  return panel({
    title: "On the record",
    body: empty({
      icon: "layers",
      title: "No policy documents in the current stream",
      body: "The Federal Register adapter returned nothing for the current window. Re-run the pipeline with "
        + "`npm run intel` — if it stays empty, the manifest will say why on the Sources page.",
      action: h("button.btn.btn--sm", { type: "button", onclick: () => go("/sources") }, "Open sources"),
    }),
  });
}

function frameCard(frame, documents) {
  const target = findNode(frame.nodeId);
  return panel({
    title: frame.label,
    sub: documents.length
      ? `${plural(documents.length, "document")} in the current window`
      : "no documents in the current window",
    body: h("div.stack-s", null,
      h("p.prose", { style: { fontSize: "var(--t-small)" } }, target?.blurb),
      h("div.row-s.wrap", null, ...frame.instruments.map((instrument) => h("span.chip", instrument))),
      h("button.btn.btn--sm.btn--block", { type: "button", style: { marginTop: "var(--s3)" },
        onclick: () => go(`/politics/${frame.nodeId}`) },
        "Read by register", icon("chevron", 11))),
  });
}

/**
 * The gap, stated where a reader will see it rather than in a footnote. A US
 * policy source is not a politics source, and pretending otherwise would be the
 * exact failure this platform is built to avoid.
 */
function coveragePanel() {
  return panel({
    title: "What this page does not cover",
    sub: "stated because the gap is large",
    body: h("div.stack-s", null,
      h("p.prose",
        "The only political source wired into this platform is the US Federal Register. That gives real, dated, "
        + "primary documents for US executive action and federal rulemaking — and nothing else."),
      h("div.rows", null,
        ...[
          ["Other governments", "No adapter. The EU, UK and Canada all publish comparable official journals with open APIs, and each would be a separate tier-1 source."],
          ["Elections and polling", "No adapter, and this is the hardest to do honestly: aggregating polls well is a research project, and doing it badly produces confident numbers that are worse than none."],
          ["Conflict and diplomacy", "No adapter. Events are reported by news organisations, which are tier 2 at best, and no free feed of them permits automated redistribution."],
          ["Legislation in progress", "No adapter. Congress.gov offers an API, which would cover bills before they become the rules the Register publishes."],
        ].map(([title, detail]) => h("div.rowitem", null,
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, title),
            h("div.rowitem__body", { style: { marginTop: "2px" } }, detail))))),
      h("p.prose", { style: { fontSize: "var(--t-small)" } },
        "Until those exist, this page is what it says it is: US policy instruments, plus a framework for reading them.")),
  });
}

/* ============================== ONE FRAME ============================== */

function renderFrame(root, nodeId) {
  const frame = frameFor(nodeId);
  const target = findNode(nodeId);

  if (!frame || !target) {
    mount(root, pageHead("Not a framed policy variable",
      "This page covers the policy variables the corpus frames. Pick one from the index."),
      h("button.btn", { type: "button", onclick: () => go("/politics") }, "Back to politics"));
    return;
  }

  const documents = documentsFor(nodeId, policyDocuments());
  const result = propagate([{ id: nodeId, magnitude: 1 }], { maxDepth: 3 });
  const contested = result.effects.filter((effect) => effect.contested);

  mount(root,
    h("button.btn.btn--sm.btn--ghost", { type: "button", style: { marginBottom: "var(--s4)" },
      onclick: () => go("/politics") }, icon("chevron", 11), "All policy variables"),

    pageHead(frame.label, target.blurb,
      h("button.btn.btn--sm", { type: "button", onclick: () => openNode(nodeId) },
        icon("graph", 11), "Open in model")),

    factSection(documents),
    structuralSection(frame),
    interpretationSection(frame),
    scenarioSection(nodeId, result),
    uncertaintySection(frame, contested),
  );
}

function factSection(documents) {
  return h("div", { style: { marginBottom: "var(--s7)" } }, panel({
    title: "What is on the record",
    sub: "primary documents, nothing added",
    actions: registerTag("fact"),
    flush: true,
    body: documents.length
      ? h("div.rows", null, ...documents.slice(0, 10).map(documentRow))
      : h("div.panel__body", null, h("span.dim",
          "No document in the current window links to this variable. That is a statement about the window, "
          + "not about the world — the Federal Register adapter looks back 120 days.")),
  }));
}

function structuralSection(frame) {
  return h("div", { style: { marginBottom: "var(--s7)" } }, panel({
    title: "What is durably true",
    sub: "mechanics that hold across administrations",
    actions: registerTag("structural"),
    flush: true,
    body: h("div.rows", null, ...frame.structural.map((claim) =>
      h("div.rowitem", null, h("span.grow", null, h("p.prose", { style: { fontSize: "var(--t-small)" } }, claim))))),
  }));
}

function interpretationSection(frame) {
  return h("div", { style: { marginBottom: "var(--s7)" } }, panel({
    title: "How to read an instrument here",
    sub: "inference, stated as inference",
    actions: registerTag("interpretation"),
    body: h("div.stack-s", null,
      h("p.prose", frame.reading),
      h("div", { style: { marginTop: "var(--s4)" } },
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "This rests on"),
        h("div.callout", frame.restsOn)),
      h("div", { style: { marginTop: "var(--s4)" } },
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "It would be wrong if"),
        h("div.callout", frame.wrongIf))),
    foot: "An interpretation with no falsifier is a preference. The second box is the part that does the work.",
  }));
}

function scenarioSection(nodeId, result) {
  const effects = result.effects.slice(0, 8);
  return h("div", { style: { marginBottom: "var(--s7)" } }, panel({
    title: "Where it transmits",
    sub: "propagated through the world model",
    actions: registerTag("scenario"),
    flush: true,
    body: effects.length
      ? h("div.rows", null, ...effects.map((effect) =>
          h("button.rowitem", { type: "button", onclick: () => openNode(effect.id) },
            h("span.rowitem__rank", `${effect.order}°`),
            h("span.grow", null,
              h("div.row-s.wrap", null,
                h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
                direction(effect.direction, effect.node.kind),
                effect.contested ? badge("contested", "warn") : null),
              h("div.row-s", { style: { marginTop: "var(--s1)" } },
                confidence(effect.confidence), lag(effect.lagMonths),
                h("span.faint", { style: { fontSize: "var(--t-tiny)" } },
                  `${plural(effect.pathCount, "path")}`))),
            icon("chevron", 12))))
      : h("div.panel__body", null, h("span.dim", "Nothing downstream of this variable in the model.")),
    foot: h("span", null,
      "These are channels ranked by plausibility inside one authored model, not probabilities and not a forecast. ",
      h("button.btn.btn--sm.btn--ghost", { type: "button", style: { marginLeft: "var(--s2)" },
        onclick: () => go(`/simulator?shock=${nodeId}`) }, icon("flask", 11), "Run it as a shock")),
  }));
}

function uncertaintySection(frame, contested) {
  return panel({
    title: "What is not known",
    sub: "questions, not hedged claims",
    actions: registerTag("uncertainty"),
    flush: true,
    body: h("div.rows", null,
      ...frame.unknowns.map((question) =>
        h("div.rowitem", null,
          h("span.rowitem__rank", "?"),
          h("span.grow", null, h("p.prose", { style: { fontSize: "var(--t-small)" } }, question)))),

      // The model's own disagreements are a real uncertainty and it can find
      // them itself, so it should say so rather than presenting a clean net.
      ...contested.slice(0, 3).map((effect) =>
        h("button.rowitem", { type: "button", onclick: () => openNode(effect.id) },
          h("span.rowitem__rank", "?"),
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } },
                `The model disagrees with itself about ${effect.node.label}`),
              badge("contested", "warn")),
            h("div.rowitem__body", { style: { marginTop: "2px" } },
              `Independent chains reach it with opposite signs across ${plural(effect.pathCount, "path")}, `
              + "so the net is a cancellation rather than an answer.")),
          icon("chevron", 12)))),
    foot: contested.length
      ? "The last entries are derived: the model found them by disagreeing with itself, and they are shown rather than netted away."
      : "No contested chains downstream of this variable — the model's routes agree on direction.",
  });
}
