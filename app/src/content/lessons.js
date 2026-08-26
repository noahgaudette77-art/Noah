/** The lesson corpus, indexed. One is surfaced each Monday, in rotation. */
import { LESSONS_A } from "./lessons-a.js";
import { LESSONS_B } from "./lessons-b.js";

export const LESSONS = [...LESSONS_A, ...LESSONS_B];
export const LESSON_BY_ID = new Map(LESSONS.map((lesson) => [lesson.id, lesson]));
export const lesson = (id) => LESSON_BY_ID.get(id) || null;

/**
 * Deterministic weekly rotation: the same Monday always yields the same lesson,
 * on every device, with no server. Once the archive is longer than the corpus
 * it repeats — which is a feature for retention, and is labelled as a revisit.
 */
export function lessonForWeek(weekStartIso) {
  const weeks = Math.floor(Date.parse(`${weekStartIso}T00:00:00Z`) / 6.048e8);
  const index = ((weeks % LESSONS.length) + LESSONS.length) % LESSONS.length;
  return { lesson: LESSONS[index], cycle: Math.floor(weeks / LESSONS.length) };
}

export const lessonsForConcept = (conceptId) =>
  LESSONS.filter((l) => (l.concepts || []).includes(conceptId));

export const lessonsForNode = (nodeId) =>
  LESSONS.filter((l) => (l.nodes || []).includes(nodeId));
