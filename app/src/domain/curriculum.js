/**
 * Curriculum progress and sequencing.
 *
 * A track is complete stage by stage, in order, because later stages assume the
 * earlier ones. Progress is measured in mastery rather than in pages opened —
 * the same standard the rest of the learning system uses.
 */

import { TRACKS, track as findTrack } from "../content/curriculum.js";
import { concept as findConcept } from "../content/concepts.js";
import { masteryLevel, isDue } from "./learning.js";
import { TECHNOLOGIES } from "../content/technologies.js";

const MASTERED = 0.55;

export function trackProgress(trackId, learning) {
  const entry = findTrack(trackId);
  if (!entry) return null;
  const mastery = learning?.mastery || {};
  const read = new Set(learning?.lessonsRead || []);

  const stages = entry.stages.map((stage) => {
    const concepts = stage.concepts.map((id) => ({
      concept: findConcept(id),
      level: masteryLevel(mastery[id]),
      due: isDue(mastery[id]),
    })).filter((item) => item.concept);

    const done = concepts.filter((item) => item.level >= MASTERED).length;
    const lessonsDone = stage.lessons.filter((id) => read.has(id)).length;
    const total = concepts.length + stage.lessons.length;
    const complete = done + lessonsDone;

    return {
      ...stage, concepts,
      done: complete, total,
      ratio: total ? complete / total : 0,
      finished: total > 0 && complete === total,
    };
  });

  const totals = stages.reduce((acc, stage) => ({
    done: acc.done + stage.done, total: acc.total + stage.total,
  }), { done: 0, total: 0 });

  const current = stages.find((stage) => !stage.finished) || stages[stages.length - 1];

  return {
    track: entry, stages,
    done: totals.done, total: totals.total,
    ratio: totals.total ? totals.done / totals.total : 0,
    currentStage: current,
    /** The single next thing, so the reader is never asked to choose. */
    next: nextStep(current),
  };
}

function nextStep(stage) {
  if (!stage) return null;
  const weakest = [...stage.concepts]
    .filter((item) => item.level < MASTERED)
    .sort((a, b) => (a.due === b.due ? a.level - b.level : a.due ? -1 : 1))[0];
  if (weakest) {
    return {
      kind: "concept", id: weakest.concept.id, label: weakest.concept.term,
      why: weakest.due ? "Due for review" : weakest.level > 0 ? "Answered inconsistently" : "Not yet studied",
    };
  }
  const lesson = stage.lessons[0];
  return lesson ? { kind: "lesson", id: lesson, label: lesson, why: "Historical case for this stage" } : null;
}

export function allProgress(learning) {
  return TRACKS.map((entry) => trackProgress(entry.id, learning))
    .sort((a, b) => {
      // Started but unfinished first — finishing something beats starting another.
      const aActive = a.ratio > 0 && a.ratio < 1;
      const bActive = b.ratio > 0 && b.ratio < 1;
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.ratio - a.ratio;
    });
}

/**
 * AHEAD OF THE CURVE — subjects that are currently niche and may not stay that
 * way. Built from the technology radar's earlier stages, because those are the
 * entries where the evidence is thin and the option value of understanding them
 * early is highest.
 */
export function aheadOfTheCurve(learning, limit = 6) {
  const mastery = learning?.mastery || {};
  const weight = { experimental: 1, early: 0.85, watchlist: 0.7, developing: 0.45, now: 0.1 };

  return TECHNOLOGIES
    .map((entry) => {
      const concepts = (entry.concepts || []).map((id) => findConcept(id)).filter(Boolean);
      const known = concepts.length
        ? concepts.reduce((sum, concept) => sum + masteryLevel(mastery[concept.id]), 0) / concepts.length
        : 0;
      return {
        technology: entry,
        concepts,
        known,
        /** Early, and you do not yet have the ideas needed to judge it. */
        priority: (weight[entry.stage] ?? 0.4) * (1 - known * 0.7),
      };
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

export { TRACKS };
