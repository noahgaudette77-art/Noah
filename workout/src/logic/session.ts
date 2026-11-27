import { DAYS, EXERCISES, dayByKey } from '../data/program';
import type { CardioBlock, DayKey, DayPlan, ExerciseLog, ExerciseSlot, SessionLog, SetLog } from '../data/types';
import { type Recommendation, exerciseHistory, recommend } from './progression';
import { getState, setState } from './store';

export type Block =
  | { kind: 'single'; slots: [ExerciseSlot] }
  | { kind: 'superset'; group: string; slots: ExerciseSlot[] }
  | { kind: 'cardio'; cardio: CardioBlock };

export function blocksFor(day: DayPlan): Block[] {
  const out: Block[] = [];
  const seen = new Set<string>();
  for (const s of day.slots) {
    if (s.superset) {
      if (seen.has(s.superset)) continue;
      seen.add(s.superset);
      out.push({ kind: 'superset', group: s.superset, slots: day.slots.filter((x) => x.superset === s.superset) });
    } else out.push({ kind: 'single', slots: [s] });
  }
  day.cardio.forEach((c) => out.push({ kind: 'cardio', cardio: c }));
  return out;
}

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** History for a slot. An exercise programmed on several days (lateral raise) progresses per day, since rep ranges differ. */
export function slotHistory(slot: ExerciseSlot, excludeSessionId?: string) {
  const days = DAYS.filter((d) => d.slots.some((s) => s.exerciseId === slot.exerciseId));
  const owner = days.find((d) => d.slots.includes(slot));
  const sessions = getState().sessions.filter((s) => s.id !== excludeSessionId && (days.length < 2 || !owner || s.dayKey === owner.key));
  return exerciseHistory(sessions, slot.exerciseId);
}

export function recommendationFor(slot: ExerciseSlot, excludeSessionId?: string): Recommendation {
  return recommend(EXERCISES[slot.exerciseId], slot, slotHistory(slot, excludeSessionId));
}

export function buildExerciseLog(slot: ExerciseSlot): ExerciseLog {
  const rec = recommendationFor(slot);
  const sets: SetLog[] = rec.prefill.map((s) => ({ ...s }));
  if (slot.dropSetOnLast && sets.length) {
    const last = sets[sets.length - 1];
    sets.push({ weight: roundTo5(last.weight * 0.7), reps: last.reps, rir: 1, done: false, drop: true });
  }
  return { exerciseId: slot.exerciseId, sets, stage: rec.stage };
}

export function startSession(dayKey: DayKey, date: string) {
  const day = dayByKey(dayKey);
  const session: SessionLog = {
    id: `${date}-${dayKey}-${Date.now().toString(36)}`,
    date, dayKey, startedAt: Date.now(), cursor: 0,
    exercises: day.slots.map(buildExerciseLog),
    cardioDone: [],
  };
  setState((s) => ({ ...s, active: session }));
}

export function patchActive(fn: (a: SessionLog) => SessionLog) {
  setState((s) => (s.active ? { ...s, active: fn(s.active) } : s));
}

export function updateSet(exerciseId: string, idx: number, patch: Partial<SetLog>) {
  patchActive((a) => ({
    ...a,
    exercises: a.exercises.map((e) => (e.exerciseId !== exerciseId ? e : { ...e, sets: e.sets.map((x, i) => (i === idx ? { ...x, ...patch } : x)) })),
  }));
}

/** When a set's weight changes, carry it to the following not-yet-done sets of that exercise. */
export function updateWeight(exerciseId: string, idx: number, weight: number) {
  patchActive((a) => ({
    ...a,
    exercises: a.exercises.map((e) => (e.exerciseId !== exerciseId ? e : {
      ...e, sets: e.sets.map((x, i) => (i === idx || (i > idx && !x.done && !x.drop) ? { ...x, weight } : x)),
    })),
  }));
}

export function toggleCardio(id: string) {
  patchActive((a) => ({ ...a, cardioDone: a.cardioDone.includes(id) ? a.cardioDone.filter((x) => x !== id) : [...a.cardioDone, id] }));
}

export function setCursor(cursor: number) {
  patchActive((a) => ({ ...a, cursor }));
}

export function finishSession(): SessionLog | null {
  const a = getState().active;
  if (!a) return null;
  const done = { ...a, finishedAt: Date.now() };
  const any = done.exercises.some((e) => e.sets.some((x) => x.done)) || done.cardioDone.length > 0;
  setState((s) => ({ ...s, active: null, sessions: any ? [...s.sessions, done] : s.sessions }));
  return any ? done : null;
}

export function discardSession() {
  setState((s) => ({ ...s, active: null }));
}

export function logStandalone(dayKey: DayKey, date: string, cardioId: string) {
  setState((s) => {
    const existing = s.sessions.find((x) => x.date === date && x.dayKey === dayKey);
    if (existing) {
      return { ...s, sessions: s.sessions.map((x) => (x === existing ? { ...x, cardioDone: x.cardioDone.includes(cardioId) ? x.cardioDone.filter((c) => c !== cardioId) : [...x.cardioDone, cardioId] } : x)) };
    }
    return { ...s, sessions: [...s.sessions, { id: `${date}-${dayKey}`, date, dayKey, startedAt: Date.now(), finishedAt: Date.now(), exercises: [], cardioDone: [cardioId] }] };
  });
}

export const setsDone = (a: SessionLog) => a.exercises.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
export const setsTotal = (a: SessionLog) => a.exercises.reduce((n, e) => n + e.sets.length, 0);
