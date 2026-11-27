import { META } from '../data/program';
import type { BodyEntry } from '../data/types';
import { addDays, diffDays } from './dates';

export const LEAN_MASS = META.start.weightLb * (1 - META.start.bodyFat / 100); // ~171 lb
const DAYS_PER_MONTH = 30.44;

/** Projected body-fat % at a given program day, linear between the plan's checkpoints. */
export function projectedBodyFat(day: number): number {
  const m = Math.max(0, day) / DAYS_PER_MONTH;
  const pts = META.projection;
  if (m >= pts[pts.length - 1].month) return pts[pts.length - 1].bf;
  for (let i = 1; i < pts.length; i++) {
    if (m <= pts[i].month) {
      const a = pts[i - 1];
      const b = pts[i];
      return a.bf + ((m - a.month) / (b.month - a.month)) * (b.bf - a.bf);
    }
  }
  return pts[0].bf;
}

/** Scale weight at a body-fat % assuming lean mass is held (the program's goal). */
export const weightAtBodyFat = (bf: number) => LEAN_MASS / (1 - bf / 100);
export const projectedWeight = (day: number) => weightAtBodyFat(projectedBodyFat(day));

/** 7-day trailing average of weight ending on `date` (needs at least 3 weigh-ins in the window). */
export function avg7(entries: BodyEntry[], date: string): number | null {
  const vals = entries.filter((e) => e.weight != null && diffDays(date, e.date) >= 0 && diffDays(date, e.date) < 7).map((e) => e.weight!);
  if (vals.length < 3) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export interface ChartPoint {
  date: string;
  day: number;
  weight?: number;
  avg?: number;
  projected: number;
}

export function chartSeries(entries: BodyEntry[], from: string, to: string): ChartPoint[] {
  const out: ChartPoint[] = [];
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const n = diffDays(to, from);
  for (let i = 0; i <= n; i++) {
    const date = addDays(from, i);
    const day = diffDays(date, META.startDate);
    const e = byDate.get(date);
    out.push({ date, day, weight: e?.weight, avg: avg7(entries, date) ?? undefined, projected: +projectedWeight(day).toFixed(1) });
  }
  return out;
}

export type RuleState =
  | { state: 'early'; daysLeft: number }
  | { state: 'no-data' }
  | { state: 'on-track'; drop: number }
  | { state: 'adjust'; drop: number };

/**
 * After month one: compare this week's 7-day average with the 7-day average four weeks
 * earlier (or the starting weight). Less than 2 lb down -> cut ~150 kcal or add steps.
 */
export function ruleCheck(entries: BodyEntry[], today: string): RuleState {
  const day = diffDays(today, META.startDate);
  if (day < 28) return { state: 'early', daysLeft: 28 - Math.max(0, day) };
  const now = avg7(entries, today);
  if (now == null) return { state: 'no-data' };
  const then = avg7(entries, addDays(today, -28)) ?? META.start.weightLb;
  const drop = +(then - now).toFixed(1);
  return drop < 2 ? { state: 'adjust', drop } : { state: 'on-track', drop };
}
