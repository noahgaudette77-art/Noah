// Motivation mechanics, all derived from data the app already stores. Pure functions, tested.
import { DAYS, EXERCISES, HABITS, META } from '../data/program';
import type { BodyEntry, ExerciseLog, HabitDay, SessionLog, SetLog } from '../data/types';
import { LEAN_MASS, avg7, weightAtBodyFat } from './body';
import { addDays, diffDays, fmtShort } from './dates';
import { programDay, weekDates } from './schedule';
import { volume } from './progression';

const DAYS_PER_MONTH = 30.44;
export const PROGRAM_DAYS = 365;

/** Day 1 is the start date; 0 before it. */
export function dayNumber(today: string): number {
  const d = diffDays(today, META.startDate);
  return d < 0 ? 0 : Math.min(PROGRAM_DAYS, d + 1);
}

const isTrainingDay = (date: string) => programDay(date).plan.kind !== 'rest';

/** A scheduled day counts as done when a session for that day's plan has logged work. */
export function dayDone(sessions: SessionLog[], date: string): boolean {
  const key = programDay(date).plan.key;
  return sessions.some((s) => s.date === date && s.dayKey === key && (s.exercises.some((e) => e.sets.some((x) => x.done)) || s.cardioDone.length > 0));
}

/**
 * Consecutive scheduled training days completed, counting back from today. Rest days neither add nor
 * break it. Today only counts once it is done; an unfinished today never breaks the streak.
 */
export function streak(sessions: SessionLog[], today: string): { current: number; longest: number } {
  if (diffDays(today, META.startDate) < 0) return { current: 0, longest: 0 };
  let current = 0;
  let counting = true;
  for (let d = today; diffDays(d, META.startDate) >= 0; d = addDays(d, -1)) {
    if (!isTrainingDay(d)) continue;
    const done = dayDone(sessions, d);
    if (d === today && !done) continue;
    if (done && counting) current++;
    else if (!done) counting = false;
    if (!counting) break;
  }
  let longest = 0, run = 0;
  for (let d = META.startDate; diffDays(today, d) >= 0; d = addDays(d, 1)) {
    if (!isTrainingDay(d)) continue;
    if (dayDone(sessions, d)) { run++; longest = Math.max(longest, run); } else if (d !== today) run = 0;
  }
  return { current, longest: Math.max(longest, current) };
}

export interface WeekRings {
  lift: { done: number; goal: number };
  conditioning: { done: number; goal: number };
  habits: { done: number; goal: number };
}

/** Rings for the program week containing `date`. */
export function weekRings(sessions: SessionLog[], habits: Record<string, HabitDay>, date: string): WeekRings {
  const dates = weekDates(date);
  let lift = 0, cond = 0, h = 0;
  for (const d of dates) {
    const kind = programDay(d).plan.kind;
    if (kind === 'strength' && dayDone(sessions, d)) lift++;
    if (kind === 'conditioning' && dayDone(sessions, d)) cond++;
    h += HABITS.filter((x) => habits[d]?.[x.id]).length;
  }
  return {
    lift: { done: lift, goal: DAYS.filter((x) => x.kind === 'strength').length },
    conditioning: { done: cond, goal: DAYS.filter((x) => x.kind === 'conditioning').length },
    habits: { done: h, goal: 7 * HABITS.length },
  };
}

/**
 * Consistency score 0-100 over the last 28 days (or since the start): 70% training days done vs
 * scheduled, 30% habit checks. Days still ahead never count against you; null before day one.
 */
export function consistency(sessions: SessionLog[], habits: Record<string, HabitDay>, today: string): number | null {
  if (diffDays(today, META.startDate) < 0) return null;
  let scheduled = 0, done = 0, hDone = 0, hDays = 0;
  for (let i = 0; i < 28; i++) {
    const d = addDays(today, -i);
    if (diffDays(d, META.startDate) < 0) break;
    const isToday = i === 0;
    if (isTrainingDay(d)) {
      const ok = dayDone(sessions, d);
      if (!isToday || ok) { scheduled++; if (ok) done++; }
    }
    const checks = HABITS.filter((x) => habits[d]?.[x.id]).length;
    if (!isToday || checks > 0) { hDays++; hDone += checks; }
  }
  if (scheduled === 0 && hDays === 0) return null;
  const s = scheduled ? done / scheduled : 1;
  const h = hDays ? hDone / (hDays * HABITS.length) : 0;
  return Math.round(100 * (0.7 * s + 0.3 * h));
}

// ---------------------------------------------------------------- milestones

export interface Milestone {
  bf: number;
  month: number;
  date: string;
  weight: number;
  reached: boolean;
}

/** Best current estimate of scale weight: 7-day average, else the latest weigh-in, else the start weight. */
export function currentWeight(body: BodyEntry[], today: string): number {
  const a = avg7(body, today);
  if (a != null) return a;
  const last = [...body].filter((b) => b.weight != null && diffDays(today, b.date) >= 0).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
  return last?.weight ?? META.start.weightLb;
}

/** Body fat implied by a weight if lean mass is held (the program's assumption). */
export const bodyFatAt = (weight: number) => Math.max(0, (1 - LEAN_MASS / weight) * 100);

export function milestones(body: BodyEntry[], today: string) {
  const w = currentWeight(body, today);
  const bf = bodyFatAt(w);
  const list: Milestone[] = META.projection
    .filter((p) => p.month > 0 && p.month <= 9)
    .map((p) => {
      const weight = weightAtBodyFat(p.bf);
      return { bf: p.bf, month: p.month, date: addDays(META.startDate, Math.round(p.month * DAYS_PER_MONTH)), weight, reached: w <= weight + 0.05 };
    });
  const next = list.find((m) => !m.reached) ?? null;
  const fatNow = w - LEAN_MASS;
  const fatToNext = next ? Math.max(0, fatNow - (next.weight - LEAN_MASS)) : 0;
  const total = META.start.weightLb - weightAtBodyFat(12);
  const progress = Math.max(0, Math.min(1, (META.start.weightLb - w) / total));
  return { weight: w, bf, list, next, fatToNext, progress, start: { bf: META.start.bodyFat, weight: META.start.weightLb } };
}

/** Target physique stage 0..3: one step per checkpoint reached at 22%, 19% and 15.5%. */
export function physiqueStage(body: BodyEntry[], today: string): number {
  const { list } = milestones(body, today);
  return list.filter((m) => m.bf >= 15.5 && m.reached).length;
}

// ---------------------------------------------------------------- personal records

/** Estimated one-rep max (Epley). Bodyweight sets compare on reps. */
export const e1rm = (s: SetLog) => (s.weight > 0 ? s.weight * (1 + s.reps / 30) : s.reps);

export interface PR {
  exerciseId: string;
  set: SetLog;
  previous: SetLog;
}

/** Best previous working set of an exercise across finished sessions (excluding one session). */
export function bestSet(sessions: SessionLog[], exerciseId: string, excludeId?: string): SetLog | null {
  let best: SetLog | null = null;
  for (const s of sessions) {
    if (s.id === excludeId) continue;
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const x of e.sets) if (x.done && !x.drop && (!best || e1rm(x) > e1rm(best))) best = x;
    }
  }
  return best;
}

/** A completed set is a PR when it beats the previous best estimate; first-ever sessions never count. */
export function prFor(sessions: SessionLog[], exerciseId: string, set: SetLog, excludeId?: string): PR | null {
  if (!set.done || set.drop) return null;
  const prev = bestSet(sessions, exerciseId, excludeId);
  if (!prev) return null;
  return e1rm(set) > e1rm(prev) + 1e-9 ? { exerciseId, set, previous: prev } : null;
}

export function sessionPRs(sessions: SessionLog[], session: SessionLog): PR[] {
  const out: PR[] = [];
  for (const e of session.exercises) {
    const best = [...e.sets].filter((s) => s.done && !s.drop).sort((a, b) => e1rm(b) - e1rm(a))[0];
    if (!best) continue;
    const pr = prFor(sessions, e.exerciseId, best, session.id);
    if (pr) out.push(pr);
  }
  return out;
}

// ---------------------------------------------------------------- weekly review

export interface WeeklyReview {
  weekStart: string;
  sessionsDone: number;
  sessionsPlanned: number;
  volume: number;
  volumeLast: number;
  weightChange: number | null;
  focus: string;
}

const weekVolume = (sessions: SessionLog[], dates: string[]) =>
  sessions.filter((s) => dates.includes(s.date)).reduce((a, s) => a + s.exercises.reduce((b, e) => b + volume(e), 0), 0);

function topSet(log: ExerciseLog) {
  const sets = log.sets.filter((s) => s.done && !s.drop);
  if (!sets.length) return null;
  return { weight: Math.max(...sets.map((s) => s.weight)), reps: sets.reduce((a, s) => a + s.reps, 0) };
}

/** The review for the program week ending on (or containing) `date`, with one specific focus for next week. */
export function weeklyReview(sessions: SessionLog[], body: BodyEntry[], habits: Record<string, HabitDay>, date: string): WeeklyReview {
  const dates = weekDates(date);
  const prev = dates.map((d) => addDays(d, -7));
  const planned = dates.filter((d) => isTrainingDay(d) && diffDays(d, META.startDate) >= 0);
  const done = planned.filter((d) => dayDone(sessions, d));
  const missed = planned.filter((d) => diffDays(date, d) >= 0 && !dayDone(sessions, d));
  const end = dates[6];
  const a = avg7(body, end);
  const b = avg7(body, addDays(end, -7));
  const weightChange = a != null && b != null ? +(a - b).toFixed(1) : null;

  let focus = '';
  if (missed.length) {
    const names = [...new Set(missed.map((d) => programDay(d).plan.title))];
    focus = `You missed ${names.join(' and ')}. Keep the same days next week; if a morning slips, do the session that evening rather than skipping it.`;
  }
  if (!focus) {
    // a lift that has not moved (same top weight, no more total reps) across its last two logs
    const byEx = new Map<string, { date: string; log: ExerciseLog }[]>();
    for (const s of [...sessions].sort((x, y) => (x.date < y.date ? 1 : -1))) {
      for (const e of s.exercises) if (e.sets.some((x) => x.done)) byEx.set(e.exerciseId, [...(byEx.get(e.exerciseId) ?? []), { date: s.date, log: e }]);
    }
    for (const [id, logs] of byEx) {
      if (logs.length < 3 || diffDays(date, logs[0].date) > 7) continue;
      const [t0, t1, t2] = logs.slice(0, 3).map((l) => topSet(l.log));
      if (t0 && t1 && t2 && t0.weight === t1.weight && t1.weight === t2.weight && t0.reps <= t2.reps && t0.weight > 0) {
        focus = `${EXERCISES[id].name} has stayed at ${t0.weight} lb for three sessions. Add one rep per set before adding load, and keep the 3 s lowering.`;
        break;
      }
    }
  }
  if (!focus) {
    const protein = dates.filter((d) => habits[d]?.protein).length;
    const steps = dates.filter((d) => habits[d]?.steps).length;
    if (protein < 5) focus = `Protein was logged on ${protein} of 7 days. Hit 170 g every day next week: about 40 g at each of four meals.`;
    else if (steps < 5) focus = `Steps hit 8,000 on ${steps} of 7 days. Add a 15 minute walk after lunch on rest and bike days.`;
  }
  if (!focus && weightChange != null && diffDays(date, META.startDate) >= 21 && weightChange > -0.3) {
    focus = `The 7-day average moved ${weightChange >= 0 ? '+' : ''}${weightChange} lb. Weigh every morning and keep calories at 2,300 to 2,500, every day including weekends.`;
  }
  if (!focus) focus = 'Everything is on track. Take the +5 lb jumps the app suggests and keep stopping 1 to 2 reps short.';
  return {
    weekStart: dates[0], sessionsDone: done.length, sessionsPlanned: planned.length,
    volume: weekVolume(sessions, dates), volumeLast: weekVolume(sessions, prev), weightChange, focus,
  };
}

export const fmtMilestoneDate = (iso: string) => fmtShort(iso);
