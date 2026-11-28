import { DAYS, META, dayForWeekday } from '../data/program';
import type { DayPlan } from '../data/types';
import { addDays, diffDays, weekday } from './dates';

export interface ProgramDay {
  date: string;
  plan: DayPlan;
  /** 1-based week of the program; 0 before the start date */
  week: number;
  /** days until the program starts (0 once started) */
  daysUntilStart: number;
  started: boolean;
  finished: boolean;
}

export function programDay(date: string): ProgramDay {
  const offset = diffDays(date, META.startDate);
  const started = offset >= 0;
  const week = started ? Math.floor(offset / 7) + 1 : 0;
  return {
    date,
    plan: dayForWeekday(weekday(date)),
    week,
    daysUntilStart: started ? 0 : -offset,
    started,
    finished: week > META.weeks,
  };
}

/** The session the Today screen should feature. Before the start date we preview day one. */
export function featuredDay(today: string): ProgramDay {
  const pd = programDay(today);
  if (!pd.started) return { ...programDay(META.startDate), daysUntilStart: pd.daysUntilStart, started: false };
  return pd;
}

/** Monday-first dates for the program week containing `date` (or week 1 before the start). */
export function weekDates(date: string): string[] {
  const base = diffDays(date, META.startDate) < 0 ? META.startDate : date;
  const wd = weekday(base);
  const monday = addDays(base, wd === 0 ? -6 : 1 - wd);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export const strengthDays = () => DAYS.filter((d) => d.kind === 'strength');
