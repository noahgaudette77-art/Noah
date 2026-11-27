import { describe, expect, it } from 'vitest';
import { META } from '../src/data/program';
import type { SessionLog } from '../src/data/types';
import { addDays } from '../src/logic/dates';
import {
  bestSet, bodyFatAt, consistency, dayDone, dayNumber, e1rm, milestones, physiqueStage, prFor, sessionPRs, streak, weekRings, weeklyReview,
} from '../src/logic/motivation';

const S = META.startDate; // Mon 2026-11-30
const keyFor = ['off', 'upperA', 'lowerA', 'bike', 'upperB', 'lowerB', 'easy'] as const;
const dow = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay();
function sess(date: string, sets: [string, number, number][] = [['inclinePress', 40, 10]], id?: string): SessionLog {
  const k = keyFor[dow(date)];
  return {
    id: id ?? `${date}-${k}`, date, dayKey: k as SessionLog['dayKey'], startedAt: Date.parse(date), finishedAt: Date.parse(date) + 3e6,
    exercises: sets.map(([e, w, r]) => ({ exerciseId: e, stage: 'load', sets: [{ weight: w, reps: r, rir: 2, done: true }] })),
    cardioDone: k === 'bike' || k === 'easy' ? ['x'] : [],
  };
}
const days = (n: number, skip: number[] = []) => Array.from({ length: n }, (_, i) => addDays(S, i)).filter((d, i) => !skip.includes(i) && dow(d) !== 0).map((d) => sess(d));

describe('day number', () => {
  it('counts from 1 on the start date', () => {
    expect(dayNumber(addDays(S, -3))).toBe(0);
    expect(dayNumber(S)).toBe(1);
    expect(dayNumber(addDays(S, 14))).toBe(15);
    expect(dayNumber(addDays(S, 900))).toBe(365);
  });
});

describe('streak', () => {
  it('counts training days, skips rest days, and an unfinished today does not break it', () => {
    const s = days(14); // two full weeks, Sundays are rest
    expect(streak(s, addDays(S, 13)).current).toBe(12);
    expect(streak(s, addDays(S, 14)).current).toBe(12); // Monday of week 3, not done yet
  });
  it('a missed training day resets the current streak but keeps the longest', () => {
    const s = days(14, [9]); // miss Wednesday of week 2
    const r = streak(s, addDays(S, 13));
    expect(r.current).toBe(3);
    expect(r.longest).toBe(8);
  });
  it('is zero before the start', () => expect(streak([], addDays(S, -2)).current).toBe(0));
});

describe('rings and consistency', () => {
  it('fills weekly rings from logged days and habits', () => {
    const s = days(7);
    const habits = { [S]: { kcal: true, protein: true }, [addDays(S, 1)]: { steps: true } };
    const r = weekRings(s, habits, addDays(S, 3));
    expect(r.lift).toEqual({ done: 4, goal: 4 });
    expect(r.conditioning).toEqual({ done: 2, goal: 2 });
    expect(r.habits).toEqual({ done: 3, goal: 28 });
  });
  it('scores 100 for a perfect fortnight and lower with misses', () => {
    const full = { ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [addDays(S, i), { kcal: true, protein: true, steps: true, sleep: true }])) };
    expect(consistency(days(14), full, addDays(S, 13))).toBe(100);
    expect(consistency(days(14, [2, 3, 9]), full, addDays(S, 13))!).toBeLessThan(90);
    expect(consistency([], {}, addDays(S, -1))).toBeNull();
  });
  it('detects a done day only for that day\'s plan', () => {
    expect(dayDone([sess(S)], S)).toBe(true);
    expect(dayDone([{ ...sess(S), dayKey: 'lowerA' }], S)).toBe(false);
  });
});

describe('milestones', () => {
  it('starts at 24% with the 22% checkpoint next', () => {
    const m = milestones([], S);
    expect(bodyFatAt(225)).toBeCloseTo(24, 5);
    expect(m.next!.bf).toBe(22);
    expect(m.fatToNext).toBeCloseTo(225 - 219.23, 1);
    expect(m.list.map((x) => x.bf)).toEqual([22, 19, 15.5, 12]);
    expect(physiqueStage([], S)).toBe(0);
  });
  it('advances the physique stage at each checkpoint', () => {
    const at = (w: number) => Array.from({ length: 7 }, (_, i) => ({ date: addDays(S, 60 + i), weight: w }));
    expect(physiqueStage(at(219), addDays(S, 66))).toBe(1);
    expect(physiqueStage(at(211), addDays(S, 66))).toBe(2);
    expect(physiqueStage(at(200), addDays(S, 66))).toBe(3);
    expect(milestones(at(211), addDays(S, 66)).next!.bf).toBe(15.5);
  });
});

describe('personal records', () => {
  const hist = [sess(S, [['inclinePress', 40, 12]]), sess(addDays(S, 7), [['inclinePress', 45, 10]])];
  it('uses estimated 1RM to compare', () => {
    expect(e1rm({ weight: 40, reps: 12, rir: 2, done: true })).toBeCloseTo(56);
    expect(bestSet(hist, 'inclinePress')!.weight).toBe(45);
  });
  it('flags a heavier or higher-rep best, never a first session or a drop set', () => {
    expect(prFor(hist, 'inclinePress', { weight: 45, reps: 11, rir: 2, done: true })).not.toBeNull();
    expect(prFor(hist, 'inclinePress', { weight: 45, reps: 10, rir: 2, done: true })).toBeNull();
    expect(prFor(hist, 'pullover', { weight: 30, reps: 15, rir: 2, done: true })).toBeNull();
    expect(prFor(hist, 'inclinePress', { weight: 50, reps: 12, rir: 2, done: true, drop: true })).toBeNull();
    const today = sess(addDays(S, 14), [['inclinePress', 50, 8]], 'now');
    expect(sessionPRs([...hist, today], today)).toHaveLength(1);
  });
});

describe('weekly review', () => {
  it('names missed sessions first', () => {
    const r = weeklyReview(days(7, [1]), [], {}, addDays(S, 6));
    expect(r.sessionsDone).toBe(5);
    expect(r.focus).toMatch(/missed Lower A/);
  });
  it('flags a stalled lift with a specific action', () => {
    const s = [0, 7, 14].map((o) => sess(addDays(S, o), [['bulgarian', 25, 10]]));
    const r = weeklyReview(s, [], {}, addDays(S, 14));
    expect(r.focus).toMatch(/Bulgarian Split Squat has stayed at 25 lb/);
  });
  it('compares volume to last week', () => {
    const s = [sess(S, [['inclinePress', 40, 10]]), sess(addDays(S, 7), [['inclinePress', 45, 10]])];
    const r = weeklyReview(s, [], {}, addDays(S, 13));
    expect(r.volume).toBe(450);
    expect(r.volumeLast).toBe(400);
  });
});
