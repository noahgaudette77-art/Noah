import { EXERCISES } from '../data/program';
import type { DayPlan, ExerciseSlot } from '../data/types';

const SETUP = 12; // seconds to unrack, settle, breathe
const TRANSITION = 60; // between exercises
const WARMUP = 180;

const midReps = (s: ExerciseSlot) => (s.reps[0] + s.reps[1]) / 2;
const repSeconds = (s: ExerciseSlot) => s.tempo.down + s.tempo.bottom + s.tempo.up + s.tempo.top;
const setSeconds = (s: ExerciseSlot) => {
  const sides = EXERCISES[s.exerciseId].perSide ? 2 : 1;
  return midReps(s) * repSeconds(s) * sides + SETUP * sides;
};

export interface Estimate {
  liftMin: number;
  cardioMin: number;
  totalMin: number;
  sets: number;
}

/** Estimated minutes for a day: lifting (work + rest + transitions) plus cardio blocks. */
export function estimateDay(day: DayPlan, setsOverride?: Record<string, number>): Estimate {
  let sec = day.slots.length ? WARMUP : 0;
  let sets = 0;
  const seen = new Set<string>();
  for (const slot of day.slots) {
    if (slot.superset) {
      if (seen.has(slot.superset)) continue;
      seen.add(slot.superset);
      const group = day.slots.filter((x) => x.superset === slot.superset);
      const rounds = Math.max(...group.map((g) => setsOverride?.[g.exerciseId] ?? g.sets));
      const work = group.reduce((a, g) => a + setSeconds(g), 0) + 10 * (group.length - 1);
      sec += rounds * work + (rounds - 1) * slot.rest + TRANSITION;
      sets += rounds * group.length;
      continue;
    }
    const n = (setsOverride?.[slot.exerciseId] ?? slot.sets) + (slot.dropSetOnLast ? 1 : 0);
    sec += n * setSeconds(slot) + (n - 1) * slot.rest + TRANSITION;
    sets += n;
  }
  const liftMin = Math.round(sec / 60);
  const cardioMin = day.cardio.reduce((a, c) => a + c.minutes, 0);
  return { liftMin, cardioMin, totalMin: liftMin + cardioMin, sets };
}
