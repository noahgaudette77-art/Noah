import { EXERCISES } from '../data/program';
import type { ExerciseLog, ExerciseSlot, SetLog } from '../data/types';
import { diffDays } from '../logic/dates';
import type { Block } from '../logic/session';

export type StrengthBlock = Extract<Block, { kind: 'single' | 'superset' }>;

/** The next set to do in a block: supersets go round by round (A1, A2, A1, A2...). */
export function nextSet(_block: StrengthBlock, logs: ExerciseLog[]): { i: number; s: number } | null {
  const rounds = Math.max(...logs.map((l) => l.sets.length));
  for (let r = 0; r < rounds; r++) for (let i = 0; i < logs.length; i++) if (logs[i].sets[r] && !logs[i].sets[r].done) return { i, s: r };
  return null;
}

/** First undone set of one exercise. */
export const firstOpen = (log: ExerciseLog) => log.sets.findIndex((x) => !x.done);

/** "Last week 40 lb × 10. Get 11." — the number to beat for this set. */
export function beatLine(slot: ExerciseSlot, prev: { date: string; log: ExerciseLog } | undefined, setIdx: number, current: SetLog, today: string): string {
  const ex = EXERCISES[slot.exerciseId];
  const [lo, hi] = slot.reps;
  if (current.drop) return `Drop set: ${current.weight} lb straight after the last set. Go to 1 to 2 reps short.`;
  if (!prev) return `First time. Pick a weight that leaves 1 to 2 reps at ${hi}.`;
  const p = prev.log.sets.filter((x) => x.done && !x.drop)[setIdx] ?? prev.log.sets.filter((x) => x.done && !x.drop).slice(-1)[0];
  if (!p) return `First logged set. Aim for ${lo} to ${hi}.`;
  const gap = diffDays(today, prev.date);
  const when = gap >= 5 && gap <= 9 ? 'Last week' : 'Last time';
  const was = ex.load === 'bodyweight' ? `${p.reps} reps` : `${p.weight} lb × ${p.reps}`;
  if (ex.load !== 'bodyweight' && current.weight > p.weight) return `${when} ${was}. Today ${current.weight} lb: get ${lo} or more.`;
  if (ex.load !== 'bodyweight' && current.weight < p.weight) return `${when} ${was}. Today ${current.weight} lb: own every rep.`;
  if (p.reps >= hi) return `${when} ${was}. Match ${hi} with a clean 3 s lowering.`;
  return `${when} ${was}. Get ${p.reps + 1}.`;
}

export const tempoText = (t: { down: number; bottom: number; up: number; top: number }) =>
  `${t.down} s down${t.bottom ? `, ${t.bottom} s pause` : ''}, ${t.up} s up${t.top ? `, ${t.top} s squeeze` : ''}`;
