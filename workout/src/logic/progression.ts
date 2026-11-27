import { META } from '../data/program';
import type { Exercise, ExerciseLog, ExerciseSlot, ProgressionStage, SessionLog, SetLog, Tempo } from '../data/types';

export const STAGE_ORDER: ProgressionStage[] = ['load', 'tempo4', 'pause2', 'extraSet', 'variation'];

export const STAGE_LABEL: Record<ProgressionStage, string> = {
  load: 'Add load',
  tempo4: 'Slower lowering (4 s)',
  pause2: '2 s pause at the stretch',
  extraSet: 'One extra set',
  variation: 'Harder variation',
};

export interface Recommendation {
  stage: ProgressionStage;
  weight: number;
  sets: number;
  tempo: Tempo;
  /** headline, e.g. "+5 lb next time" */
  headline: string;
  detail: string;
  kind: 'start' | 'increase' | 'hold' | 'advance' | 'variation';
  /** prefill values per set */
  prefill: SetLog[];
}

export interface History {
  date: string;
  log: ExerciseLog;
}

/** Every logged instance of an exercise, newest first. */
export function exerciseHistory(sessions: SessionLog[], exerciseId: string): History[] {
  const out: History[] = [];
  for (const s of [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.startedAt - a.startedAt))) {
    const log = s.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.done));
    if (log) out.push({ date: s.date, log });
  }
  return out;
}

const working = (log: ExerciseLog) => log.sets.filter((s) => s.done && !s.drop);

/** All working sets reached the top of the range while leaving 1+ reps in reserve. */
export function hitTopOfRange(log: ExerciseLog, slot: ExerciseSlot, expectedSets: number): boolean {
  const sets = working(log);
  if (sets.length < expectedSets) return false;
  return sets.every((s) => s.reps >= slot.reps[1] && s.rir >= 1);
}

export function tempoForStage(base: Tempo, stage: ProgressionStage): Tempo {
  const idx = STAGE_ORDER.indexOf(stage);
  return {
    ...base,
    down: idx >= 1 ? Math.max(base.down, 4) : base.down,
    bottom: idx >= 2 ? Math.max(base.bottom, 2) : base.bottom,
  };
}
export const setsForStage = (slot: ExerciseSlot, stage: ProgressionStage) =>
  slot.sets + (STAGE_ORDER.indexOf(stage) >= 3 ? 1 : 0);

function nextStage(stage: ProgressionStage): ProgressionStage {
  const i = STAGE_ORDER.indexOf(stage);
  return STAGE_ORDER[Math.min(i + 1, STAGE_ORDER.length - 1)];
}

function buildPrefill(n: number, weight: number, reps: number, last?: SetLog[]): SetLog[] {
  return Array.from({ length: n }, (_, i) => ({
    weight,
    reps: last?.[i]?.reps ?? last?.[last.length - 1]?.reps ?? reps,
    rir: 2,
    done: false,
  }));
}

/**
 * Decide what to do next time for one exercise slot, given its history.
 * Rules: all sets at the top of the range with 1-2 RIR -> +5 lb. At the 50 lb ceiling
 * (or for bodyweight moves) walk the ladder: 4 s tempo, 2 s pause, extra set, harder variation.
 */
export function recommend(ex: Exercise, slot: ExerciseSlot, history: History[]): Recommendation {
  const max = META.maxDumbbell;
  const inc = META.increment;
  const [lo, hi] = slot.reps;
  const last = history[0];

  if (!last) {
    const stage: ProgressionStage = 'load';
    return {
      stage, weight: ex.startWeight, sets: slot.sets, tempo: slot.tempo, kind: 'start',
      headline: ex.load === 'bodyweight' ? 'First session' : `Start around ${ex.startWeight} lb`,
      detail: ex.load === 'bodyweight'
        ? `Aim for ${hi} controlled reps with 1 to 2 in reserve.`
        : 'Pick a weight that leaves 1 to 2 reps in reserve at the top of the range. Adjust after set one.',
      prefill: buildPrefill(slot.sets, ex.startWeight, lo),
    };
  }

  const lastSets = working(last.log);
  const lastWeight = Math.max(0, ...lastSets.map((s) => s.weight));
  const stage = last.log.stage ?? 'load';
  const expected = setsForStage(slot, stage);
  const top = hitTopOfRange(last.log, slot, expected);
  const atCap = ex.load === 'bodyweight' || lastWeight + inc > max;

  if (top && !atCap) {
    const w = lastWeight + inc;
    return {
      stage: 'load', weight: w, sets: slot.sets, tempo: slot.tempo, kind: 'increase',
      headline: `+${inc} lb next time`,
      detail: `Every set hit ${hi} reps with reps in reserve. Go to ${w} lb${lo === hi ? ` and aim for ${hi} again.` : ` and build back up from ${lo}.`}`,
      prefill: buildPrefill(slot.sets, w, lo),
    };
  }

  if (top && atCap) {
    const ns = stage === 'variation' ? 'variation' : nextStage(stage);
    const sets = setsForStage(slot, ns);
    const tempo = tempoForStage(slot.tempo, ns);
    const isVar = ns === 'variation';
    return {
      stage: ns, weight: lastWeight, sets, tempo, kind: isVar ? 'variation' : 'advance',
      headline: isVar ? 'Switch to the harder variation' : STAGE_LABEL[ns],
      detail: isVar
        ? `${ex.harderVariation}. Restart at ${lo} reps.`
        : ex.load === 'bodyweight'
          ? `Top of the range reached. Next lever: ${STAGE_LABEL[ns].toLowerCase()}.`
          : `You are at the ${max} lb ceiling. Next lever: ${STAGE_LABEL[ns].toLowerCase()}.`,
      prefill: buildPrefill(sets, lastWeight, ns === 'variation' ? lo : lo, undefined),
    };
  }

  const missed = lastSets.some((s) => s.reps < lo);
  const tempo = tempoForStage(slot.tempo, stage);
  const sets = setsForStage(slot, stage);
  return {
    stage, weight: lastWeight, sets, tempo, kind: 'hold',
    headline: missed ? `Hold at ${lastWeight} lb` : `Beat last time at ${lastWeight} lb`,
    detail: missed
      ? `Some sets fell below ${lo} reps. Keep the weight; if it happens again next time, drop ${inc} lb.`
      : `Add a rep to any set you can until all ${sets} sets reach ${hi}.`,
    prefill: buildPrefill(sets, lastWeight, lo, lastSets),
  };
}

export function volume(log: ExerciseLog): number {
  return log.sets.filter((s) => s.done).reduce((a, s) => a + s.weight * s.reps, 0);
}
