/** KNOWLEDGE BASE · HISTORY ENGINE */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse } from "../../core/router.js";
import { profile } from "../../core/store.js";
import {
  panel,
  pageHead,
  badge,
  chip,
  sectionHead,
  callout,
  meter,
  empty,
} from "../components/kit.js";
import { explainPanel } from "../components/explain.js";
import { openNode, openConcept } from "../components/drawer.js";
import { CONCEPTS, DOMAINS, concept as findConcept, conceptLinks, byDomain } from "../../content/concepts.js";
import { LESSONS, lesson as findLesson, lessonForWeek, lessonsForConcept } from "../../content/lessons.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { tracksForConcept } from "../../content/curriculum.js";
import { masteryLevel, XP, domainScore } from "../../domain/learning.js";
import { forceGraph } from "../charts/graph.js";
import { weekStart } from "../../core/format.js";

/* ========================= CONCEPTS ========================= */

export function knowledgeView() {
  const root = h("div.view-inner");
  const { segments } = parse();
  const conceptId = segments[1];

  if (conceptId) { renderConcept(root, conceptId); return root; }
  renderIndex(root);
  return root;
}

function renderIndex(root) {
  let domain = "all";
  let query = "";

  const render = () => {
    const mastery = profile.at("learning.mastery", {});
    const pool = CONCEPTS
      .filter((concept) => domain === "all" || concept.domain === domain)
      .filter((concept) => !query || `${concept.term} ${concept.tags?.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.term.localeCompare(b.term));

    const scores = DOMAINS.map((entry) => ({ ...entry, ...domainScore(mastery, entry.id) }))
      .filter((entry) => entry.total > 0);

    mount(root,
      pageHead("Knowledge base",
        `${CONCEPTS.length} concepts, each explained at four depths. The explanations are genuinely different arguments rather than the same sentence at four lengths — the expert level is the disagreement professionals are still having.`),

      h("div.grid.g-main", null,
        h("div.stack", null,
          h("div.row-s.wrap", null,
            h("input.input", {
              type: "search", placeholder: "Filter concepts…", style: { maxWidth: "260px" },
              value: query, oninput: (event) => { query = event.target.value; render(); },
            }),
            chip("All", { pressed: domain === "all", onclick: () => { domain = "all"; render(); } }),
            ...DOMAINS.filter((entry) => byDomain(entry.id).length).map((entry) =>
              chip(entry.label, { pressed: domain === entry.id, onclick: () => { domain = entry.id; render(); } }))),

          panel({
            flush: true,
            body: pool.length ? h("div.rows", null, ...pool.map((concept) => {
              const level = masteryLevel(mastery[concept.id]);
              return h("button.rowitem", { onclick: () => go(`/knowledge/${concept.id}`) },
                h("span.grow", null,
                  h("div.row-s.wrap", null,
                    h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, concept.term),
                    badge(concept.domain),
                    concept.node && badge("in world model", "cyan")),
                  h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, concept.levels.beginner)),
                h("div", { style: { width: "60px" } },
                  h("div.eyebrow", { style: { textAlign: "right", marginBottom: "2px" } },
                    level > 0 ? `${Math.round(level * 100)}%` : "new"),
                  meter(level, { tone: level > 0.6 ? "up" : level > 0.3 ? "" : "" , height: 3 })),
                icon("chevron", 12));
            })) : empty({ title: "Nothing matches", body: "Try a different filter." }),
          })),

        h("div.stack", null,
          panel({
            title: "Your coverage",
            flush: true,
            body: h("div.panel__body.stack-s", null, ...scores.map((entry) => h("div", null,
              h("div.spread", { style: { fontSize: "var(--t-small)", marginBottom: "2px" } },
                h("span", entry.label),
                h("span.mono.dim", `${entry.score} · ${entry.covered}/${entry.total}`)),
              meter(entry.score, { max: 100, height: 4, tone: entry.score > 60 ? "up" : entry.score > 25 ? "" : "down" })))),
          }),

          panel({
            title: "Concept map",
            sub: "how the ideas connect",
            flush: true,
            body: h("div", null,
              conceptGraph(),
              h("div.panel__body", null,
                h("p.dim", { style: { fontSize: "var(--t-small)" } },
                  "Concepts linked by their stated relations. Understanding is knowing which ideas constrain which — not holding more of them separately."))),
          }))
      )
    );
  };

  render();
}

function conceptGraph() {
  const links = conceptLinks();
  const ids = new Set(links.flatMap((link) => [link.a, link.b]));
  const nodes = [...ids].map((id) => {
    const concept = findConcept(id);
    return { id, label: concept.term, kind: concept.domain === "economics" ? "macro" : concept.domain === "markets" ? "market" : "tech" };
  });
  return forceGraph({
    nodes,
    edges: links.map((link) => ({ from: link.a, to: link.b, sign: 1, strength: 0.5, confidence: "moderate" })),
    height: 320,
    onSelect: (node) => node && openConcept(node.id),
  });
}

function renderConcept(root, conceptId) {
  const concept = findConcept(conceptId);
  if (!concept) {
    mount(root, pageHead("Concept not found"),
      empty({ title: "No such concept", body: "It may have been renamed.",
        action: h("button.btn", { type: "button", onclick: () => go("/knowledge") }, "Back to the knowledge base") }));
    return;
  }

  const learning = profile.at("learning", {});
  profile.merge("learning", { xp: (learning.xp || 0) + XP.conceptViewed });

  const relatedNode = concept.node ? findNode(concept.node) : null;
  const lessons = lessonsForConcept(concept.id);

  mount(root,
    h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/knowledge"), style: { marginBottom: "var(--s4)" } },
      "← Knowledge base"),
    pageHead(concept.term, null,
      [h("button.btn", { type: "button", onclick: () => go(`/learn?start=quiz&concept=${concept.id}`) },
        icon("spark", 12), "Test me on this")]),

    h("div.grid.g-main", null,
      h("div.stack", null, explainPanel(concept.id, { compact: false })),

      h("div.stack", null,
        relatedNode ? panel({
          title: "In the world model",
          body: h("div.stack-s", null,
            h("p.dim", { style: { fontSize: "var(--t-small)" } }, relatedNode.blurb),
            h("button.btn.btn--block", { type: "button", onclick: () => openNode(relatedNode.id) },
              icon("graph", 12), `Trace ${relatedNode.label}`)),
        }) : null,

        lessons.length ? panel({
          title: "Historical cases",
          flush: true,
          body: h("div.rows", null, ...lessons.map((lesson) =>
            h("button.rowitem", { onclick: () => go(`/history/${lesson.id}`) },
              h("span.grow", null,
                h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, lesson.title),
                h("div.rowitem__meta", lesson.era)),
              icon("chevron", 12)))),
        }) : null,

        (() => {
          const tracks = tracksForConcept(concept.id);
          return tracks.length ? panel({
            title: "Part of",
            flush: true,
            body: h("div.rows", null, ...tracks.map((entry) =>
              h("button.rowitem", { onclick: () => go(`/curriculum/${entry.id}`) },
                h("span.grow", null,
                  h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.title),
                  h("div.rowitem__meta.clamp-2", { style: { marginTop: "2px" } }, entry.why)),
                icon("chevron", 12)))),
          }) : null;
        })(),

        panel({
          title: "Nearby concepts",
          body: h("div.row-s.wrap", null, ...(concept.related || []).map((id) => {
            const target = findConcept(id);
            return target ? chip(target.term, { onclick: () => go(`/knowledge/${id}`) }) : null;
          }).filter(Boolean)),
        }))
    )
  );
}

/* ========================= HISTORY ========================= */

export function historyView() {
  const root = h("div.view-inner");
  const { segments } = parse();
  if (segments[1]) { renderLesson(root, segments[1]); return root; }

  const { lesson: thisWeek, cycle } = lessonForWeek(weekStart());
  const read = new Set(profile.at("learning.lessonsRead", []));

  mount(root,
    pageHead("History engine",
      "One thing you should know, each Monday. The last section of every lesson connects it to something happening now — that connection is the reason the rest of it is here."),

    panel({
      title: "This week",
      sub: cycle > 0 ? "a revisit — the corpus has cycled" : null,
      body: h("button.row-top", {
        style: { width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer" },
        onclick: () => go(`/history/${thisWeek.id}`),
      },
        h("div.grow.stack-s", null,
          h("div.row-s.wrap", null, badge(thisWeek.domain, "accent"), badge(thisWeek.era), badge(`${thisWeek.minutes} min`),
            read.has(thisWeek.id) && badge("read", "up")),
          h("h3", { style: { fontSize: "var(--t-h3)", fontWeight: 620, letterSpacing: "-0.02em" } }, thisWeek.title),
          h("p.read", { style: { color: "var(--ink-2)" } }, thisWeek.hook)),
        icon("chevron", 16)),
    }),

    h("div", { style: { marginTop: "var(--s7)" } },
      sectionHead("The full corpus", `${LESSONS.length} lessons, one surfaced each week in a fixed rotation`),
      panel({
        flush: true,
        body: h("div.rows", null, ...LESSONS.map((lesson) => h("button.rowitem", {
          onclick: () => go(`/history/${lesson.id}`),
        },
          h("span.grow", null,
            h("div.row-s.wrap", { style: { marginBottom: "2px" } },
              badge(lesson.domain), badge(lesson.era),
              read.has(lesson.id) && badge("read", "up"),
              lesson.id === thisWeek.id && badge("this week", "accent")),
            h("div.rowitem__title", lesson.title),
            h("div.rowitem__body.clamp-2", { style: { marginTop: "var(--s1)" } }, lesson.hook)),
          icon("chevron", 12)))),
      }))
  );

  return root;
}

function renderLesson(root, lessonId) {
  const lesson = findLesson(lessonId);
  if (!lesson) {
    mount(root, empty({ title: "Lesson not found",
      action: h("button.btn", { type: "button", onclick: () => go("/history") }, "Back") }));
    return;
  }

  const learning = profile.at("learning", {});
  const alreadyRead = (learning.lessonsRead || []).includes(lesson.id);

  const markRead = () => {
    if (alreadyRead) { go("/learn?start=quiz"); return; }
    profile.merge("learning", {
      lessonsRead: [...(learning.lessonsRead || []), lesson.id],
      xp: (learning.xp || 0) + XP.lessonRead,
    });
    import("../components/kit.js").then((kit) => kit.toast(`+${XP.lessonRead} XP — lesson complete`));
    go("/learn?start=quiz");
  };

  const section = (heading, body) => h("section", null,
    h("h4", { style: { fontSize: "var(--t-micro)", fontWeight: 650, letterSpacing: "var(--tracking-caps)",
      textTransform: "uppercase", color: "var(--ink-3)", marginTop: "var(--s7)", marginBottom: "var(--s3)" } }, heading),
    body);

  mount(root,
    h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/history"), style: { marginBottom: "var(--s4)" } },
      "← History engine"),

    h("div.grid.g-main", null,
      h("article.view-inner--read", { style: { padding: 0 } },
        h("div.row-s.wrap", { style: { marginBottom: "var(--s4)" } },
          badge(lesson.domain, "accent"), badge(lesson.era), badge(`${lesson.minutes} min read`),
          alreadyRead && badge("read", "up")),
        h("h1", { style: { fontSize: "var(--t-h1)", fontWeight: 640, letterSpacing: "-0.028em", lineHeight: 1.12 } }, lesson.title),
        h("p.read", { style: { marginTop: "var(--s5)", color: "var(--ink)", fontStyle: "italic",
          borderLeft: "2px solid var(--accent-line)", paddingLeft: "var(--s5)" } }, lesson.hook),

        h("div.prose", { style: { marginTop: "var(--s7)" } },
          section("What happened", h("p", lesson.sections.whatHappened)),
          section("Why it happened", h("p", lesson.sections.whyItHappened)),
          section("Who mattered", h("p", lesson.sections.whoMattered)),
          section("What changed", h("p", lesson.sections.whatChanged)),
          section("Why it matters today", h("p", lesson.sections.whyItMattersToday)),
          section("What to take from it",
            h("ol", null, ...lesson.sections.lessons.map((item) => h("li", item)))),
          section("The connection to now",
            h("div.callout.callout--ai", null,
              h("div.callout__label", "Connection"),
              h("p", { style: { marginTop: "var(--s2)" } }, lesson.sections.connection)))),

        h("div.row-s", { style: { marginTop: "var(--s8)" } },
          h("button.btn.btn--primary", { type: "button", onclick: markRead },
            icon("check", 12), alreadyRead ? "Quiz me" : `Mark read · +${XP.lessonRead} XP`),
          h("button.btn", { type: "button", onclick: () => go("/history") }, "All lessons"))),

      h("div.stack", null,
        lesson.sources?.length ? panel({
          title: "Sources",
          flush: true,
          body: h("div.rows", null, ...lesson.sources.map((source) =>
            h("a.rowitem", { href: source.url, target: "_blank", rel: "noopener noreferrer" },
              h("span.grow", null,
                h("div.row-s", null, h("span", { class: `tier tier--${source.tier}` }, `T${source.tier}`),
                  h("span", { style: { fontSize: "var(--t-body)" } }, source.label))),
              icon("external", 12)))),
          foot: "Dates, names and sequences here are checkable against these. Where an interpretation is contested the text says so rather than picking a side.",
        }) : null,

        lesson.concepts?.length ? panel({
          title: "Concepts in play",
          body: h("div.row-s.wrap", null, ...lesson.concepts.map((id) => {
            const concept = findConcept(id);
            return concept ? chip(concept.term, { onclick: () => openConcept(id) }) : null;
          }).filter(Boolean)),
        }) : null,

        lesson.nodes?.length ? panel({
          title: "Where it touches the model",
          body: h("div.row-s.wrap", null, ...lesson.nodes.map((id) => {
            const node = findNode(id);
            return node ? chip(node.label, { onclick: () => openNode(id) }) : null;
          }).filter(Boolean)),
        }) : null)
    )
  );
}
