/**
 * EXPLAIN — one concept at four depths.
 *
 * The reader's default depth is a stored preference, and reading past it awards
 * a little XP: the point of the control is to pull people upward, not to let
 * them stay comfortable.
 */

import { h, mount, icon } from "../../core/dom.js";
import { LEVELS, concept as findConcept } from "../../content/concepts.js";
import { profile } from "../../core/store.js";
import { XP, masteryLevel } from "../../domain/learning.js";
import { badge, callout, chip, meter, panel } from "./kit.js";
import { lessonsForConcept } from "../../content/lessons.js";
import { go } from "../../core/router.js";

export function explainPanel(conceptId, { compact = false, initialLevel = null } = {}) {
  const concept = typeof conceptId === "string" ? findConcept(conceptId) : conceptId;
  if (!concept) return h("div.dim", "Concept not found.");

  const preferred = initialLevel || profile.at("settings.level", "intermediate");
  let level = preferred;
  const body = h("div");

  const award = (next) => {
    const order = LEVELS.map((l) => l.id);
    if (order.indexOf(next) > order.indexOf(preferred)) {
      const learning = profile.at("learning", {});
      profile.merge("learning", { xp: (learning.xp || 0) + XP.conceptExplained });
    }
  };

  const render = () => {
    const record = profile.at("learning.mastery", {})[concept.id];
    const mastery = masteryLevel(record);
    mount(body,
      h("div.row-s.wrap", { style: { marginBottom: "var(--s4)" } },
        ...LEVELS.map((entry) => chip(entry.label, {
          pressed: entry.id === level,
          title: entry.note,
          onclick: () => { award(entry.id); level = entry.id; render(); },
        }))
      ),
      h("p.prose", { style: { fontSize: "var(--t-base)" } }, concept.levels[level]),

      concept.misconception && h("div", { style: { marginTop: "var(--s5)" } },
        callout("The common error", concept.misconception, "warn")),

      concept.history && h("div", { style: { marginTop: "var(--s4)" } },
        callout("Historical reference", concept.history)),

      !compact && concept.watch?.length && h("div", { style: { marginTop: "var(--s5)" } },
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "What to watch"),
        h("div.row-s.wrap", null, ...concept.watch.map((item) => chip(item)))
      ),

      !compact && concept.related?.length && h("div", { style: { marginTop: "var(--s5)" } },
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "Connects to"),
        h("div.row-s.wrap", null, ...concept.related.map((id) => {
          const target = findConcept(id);
          return target ? chip(target.term, { onclick: () => go(`/knowledge/${id}`) }) : null;
        }).filter(Boolean))
      ),

      !compact && (() => {
        const lessons = lessonsForConcept(concept.id);
        return lessons.length ? h("div", { style: { marginTop: "var(--s5)" } },
          h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "Where this shows up in history"),
          h("div.stack-xs", null, ...lessons.map((lesson) =>
            h("button.rowitem", { style: { padding: "var(--s2) 0", border: 0 },
              onclick: () => go(`/history/${lesson.id}`) },
              h("span.grow", null,
                h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, lesson.title),
                h("div.rowitem__meta", lesson.era)),
              icon("chevron", 12)
            )))
        ) : null;
      })(),

      record?.seen ? h("div", { style: { marginTop: "var(--s6)" } },
        h("div.spread", { style: { marginBottom: "var(--s2)" } },
          h("span.eyebrow", "Your mastery"),
          h("span.mono.dim", { style: { fontSize: "var(--t-tiny)" } },
            `${Math.round(mastery * 100)}% · ${record.correct}/${record.seen} correct`)),
        meter(mastery, { tone: mastery > 0.6 ? "up" : mastery > 0.3 ? "" : "down" })
      ) : null
    );
  };

  render();

  return panel({
    title: concept.term,
    sub: concept.domain,
    actions: badge(LEVELS.find((l) => l.id === level)?.label || "", "cyan"),
    body,
  });
}

/** Inline trigger: a small button that opens the concept in the detail drawer. */
export function explainLink(conceptId, label = null) {
  const concept = findConcept(conceptId);
  if (!concept) return null;
  return h("button.btn.btn--sm.btn--ghost", {
    type: "button", title: `Explain: ${concept.term}`,
    onclick: (event) => {
      event.stopPropagation();
      import("./drawer.js").then((module) => module.openConcept(conceptId));
    },
  }, icon("brain", 12), label || "Explain");
}
