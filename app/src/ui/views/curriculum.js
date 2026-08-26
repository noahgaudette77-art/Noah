/** CURRICULUM — ordered paths, and the subjects worth learning before they matter. */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse } from "../../core/router.js";
import { profile } from "../../core/store.js";
import { panel, pageHead, badge, chip, callout, meter, stat, empty } from "../components/kit.js";
import { openConcept, openNode } from "../components/drawer.js";
import { allProgress, trackProgress, aheadOfTheCurve } from "../../domain/curriculum.js";
import { lesson as findLesson } from "../../content/lessons.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { plural } from "../../core/format.js";

export function curriculumView() {
  const root = h("div.view-inner");
  const { segments } = parse();
  if (segments[1]) { renderTrack(root, segments[1]); return root; }
  renderIndex(root);
  return root;
}

function renderIndex(root) {
  const learning = profile.at("learning", {});
  const tracks = allProgress(learning);
  const ahead = aheadOfTheCurve(learning, 6);
  const started = tracks.filter((entry) => entry.ratio > 0);

  mount(root,
    pageHead("Curriculum",
      "Ordered paths rather than a ranked list of weaknesses. Most of these ideas only make sense once another one is in place — you cannot usefully think about the yield curve before you can think about a bond yield."),

    h("div.grid.g-main", null,
      h("div.stack", null,
        panel({
          title: started.length ? "Continue" : "Where to start",
          sub: started.length ? "unfinished tracks first" : "seven tracks, in any order",
          flush: true,
          body: h("div.rows", null, ...tracks.map((entry) => h("button.rowitem", {
            onclick: () => go(`/curriculum/${entry.track.id}`),
          },
            h("span.rowitem__rank", null, icon(entry.track.icon, 14)),
            h("span.grow", null,
              h("div.row-s.wrap", null,
                h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.track.title),
                entry.ratio === 1 && badge("complete", "up"),
                entry.ratio > 0 && entry.ratio < 1 && badge("in progress", "accent")),
              h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, entry.track.why),
              entry.next && h("div.rowitem__meta", { style: { marginTop: "var(--s2)" } },
                `Next: ${entry.next.kind === "lesson" ? findLesson(entry.next.id)?.title || entry.next.label : entry.next.label} — ${entry.next.why.toLowerCase()}`)),
            h("div", { style: { width: "72px" } },
              h("div.eyebrow", { style: { textAlign: "right", marginBottom: "2px" } },
                `${entry.done}/${entry.total}`),
              meter(entry.ratio, { max: 1, height: 3, tone: entry.ratio === 1 ? "up" : "" })),
            icon("chevron", 12)))),
          foot: "Progress counts mastery, not pages opened — a concept only completes a stage once you have answered on it correctly, more than once, over time.",
        })),

      h("div.stack", null,
        panel({
          title: "Ahead of the curve",
          sub: "niche now, possibly not later",
          flush: true,
          body: h("div", null,
            h("div.panel__body", { style: { paddingBottom: "var(--s3)" } },
              h("p.dim", { style: { fontSize: "var(--t-small)" } },
                "Ranked by how early the subject is and how little of the underlying you already have. Early means the evidence is thin — which is exactly why understanding it costs little now and a great deal later.")),
            h("div.rows", null, ...ahead.map((entry) => h("div.rowitem", null,
              h("span.grow", null,
                h("div.row-s.wrap", null,
                  h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.technology.name),
                  badge(entry.technology.stage,
                    entry.technology.stage === "experimental" ? "warn"
                      : entry.technology.stage === "early" ? "cyan" : "")),
                h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, entry.technology.why),
                h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
                  ...entry.concepts.map((concept) =>
                    chip(concept.term, { onclick: () => openConcept(concept.id) })),
                  entry.technology.node && findNode(entry.technology.node) &&
                    chip(findNode(entry.technology.node).label, {
                      onclick: () => openNode(entry.technology.node) })))))),
            h("div.panel__body", { style: { borderTop: "1px solid var(--line)" } },
              h("button.btn.btn--sm.btn--block", { type: "button", onclick: () => go("/radar") },
                icon("cpu", 11), "Full technology radar"))),
        }),

        panel({
          title: "How this differs from knowledge gaps",
          body: h("div.stack-s", null,
            h("p.dim", { style: { fontSize: "var(--t-small)" } },
              "The gap ranker on the Learn page answers ", h("b", "what am I weakest at"),
              ". This answers ", h("b", "what should I learn in what order"),
              ". They disagree often, and when they do, order usually wins — studying a concept whose prerequisites you lack is how people conclude they are bad at economics."),
            h("button.btn.btn--sm.btn--block", { type: "button", onclick: () => go("/learn") },
              "Knowledge gaps", icon("chevron", 11))),
        }))
    )
  );
}

function renderTrack(root, trackId) {
  const learning = profile.at("learning", {});
  const entry = trackProgress(trackId, learning);

  if (!entry) {
    mount(root, empty({ title: "No such track",
      action: h("button.btn", { type: "button", onclick: () => go("/curriculum") }, "All tracks") }));
    return;
  }

  mount(root,
    h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/curriculum"),
      style: { marginBottom: "var(--s4)" } }, "← Curriculum"),

    pageHead(entry.track.title, entry.track.why,
      [entry.next && h("button.btn.btn--primary", {
        type: "button",
        onclick: () => entry.next.kind === "lesson"
          ? go(`/history/${entry.next.id}`)
          : go(`/knowledge/${entry.next.id}`),
      }, icon("spark", 12), `Next: ${entry.next.kind === "lesson"
        ? findLesson(entry.next.id)?.title.slice(0, 30) || entry.next.label
        : entry.next.label}`)]),

    panel({
      body: h("div.stack-s", null,
        h("div.spread", null,
          stat({ label: "Progress", value: `${entry.done}`, unit: `/ ${entry.total}`, large: true,
            note: `${plural(entry.stages.length, "stage")}` }),
          h("div", { style: { minWidth: "40%" } },
            h("div.eyebrow", { style: { marginBottom: "var(--s2)" } }, "Currently at"),
            h("div", { style: { fontSize: "var(--t-body)", color: "var(--ink)" } },
              entry.currentStage?.label || "—"))),
        meter(entry.ratio, { max: 1, tone: entry.ratio === 1 ? "up" : "" })),
    }),

    h("div.stack", { style: { marginTop: "var(--s6)" } },
      ...entry.stages.map((stage, index) => panel({
        title: `${index + 1}. ${stage.label}`,
        sub: `${stage.done}/${stage.total}`,
        actions: stage.finished ? badge("complete", "up")
          : stage === entry.currentStage ? badge("current", "accent") : null,
        flush: true,
        body: h("div", null,
          h("div.panel__body", { style: { paddingBottom: "var(--s3)" } },
            h("div.callout__label", { style: { marginBottom: "var(--s1)" } }, "You should be able to"),
            h("p", { style: { fontSize: "var(--t-body)", color: "var(--ink-2)" } }, stage.goal)),
          h("div.rows", null,
            ...stage.concepts.map((item) => h("button.rowitem", {
              onclick: () => go(`/knowledge/${item.concept.id}`),
            },
              h("span.rowitem__rank", null,
                item.level >= 0.55 ? h("span.up", null, icon("check", 12))
                  : h("span.faint", null, icon("brain", 12))),
              h("span.grow", null,
                h("div.row-s.wrap", null,
                  h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, item.concept.term),
                  item.due && badge("due", "warn")),
                h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, item.concept.levels.beginner)),
              h("div", { style: { width: "48px" } },
                h("div.eyebrow", { style: { textAlign: "right", marginBottom: "2px" } },
                  item.level > 0 ? `${Math.round(item.level * 100)}%` : "new"),
                meter(item.level, { max: 1, height: 3, tone: item.level >= 0.55 ? "up" : "" })),
              icon("chevron", 12))),
            ...stage.lessons.map((lessonId) => {
              const lesson = findLesson(lessonId);
              if (!lesson) return null;
              const read = (learning.lessonsRead || []).includes(lessonId);
              return h("button.rowitem", { onclick: () => go(`/history/${lessonId}`) },
                h("span.rowitem__rank", null,
                  read ? h("span.up", null, icon("check", 12)) : h("span.faint", null, icon("book", 12))),
                h("span.grow", null,
                  h("div.row-s.wrap", null,
                    h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, lesson.title),
                    badge(lesson.era)),
                  h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, lesson.hook)),
                icon("chevron", 12));
            }).filter(Boolean))),
      }))),

    h("div", { style: { marginTop: "var(--s6)" } },
      callout("Why order matters",
        "Each stage assumes the one before it. Skipping ahead is the most common reason people conclude a subject is beyond them, when the actual problem is a missing prerequisite two steps back."))
  );
}
