import { describe, expect, it } from 'vitest';
import { DAYS, EXERCISES, META, dayByKey } from '../src/data/program';
import type { ExerciseLog, SessionLog } from '../src/data/types';
import { avg7, projectedBodyFat, projectedWeight, ruleCheck } from '../src/logic/body';
import { addDays } from '../src/logic/dates';
import { estimateDay } from '../src/logic/estimate';
import { exerciseHistory, recommend } from '../src/logic/progression';
import { featuredDay, programDay, weekDates } from '../src/logic/schedule';
import { mergeStates, parseState, emptyState } from '../src/logic/storage';

const slotOf = (day: string, id: string) => dayByKey(day).slots.find((s) => s.exerciseId === id)!;
const log = (id: string, weight: number, reps: number[], rir = 2, stage: ExerciseLog['stage'] = 'load'): ExerciseLog => ({
  exerciseId: id, stage, sets: reps.map((r) => ({ weight, reps: r, rir, done: true })),
});
const hist = (l: ExerciseLog, date = '2026-12-01') => [{ date, log: l }];

describe('schedule', () => {
  it('maps weekdays to the plan', () => {
    expect(programDay('2026-11-30').plan.key).toBe('upperA');
    expect(programDay('2026-12-01').plan.key).toBe('lowerA');
    expect(programDay('2026-12-02').plan.key).toBe('bike');
    expect(programDay('2026-12-03').plan.key).toBe('upperB');
    expect(programDay('2026-12-04').plan.key).toBe('lowerB');
    expect(programDay('2026-12-05').plan.key).toBe('easy');
    expect(programDay('2026-12-06').plan.key).toBe('off');
  });
  it('counts weeks and the pre-start countdown', () => {
    expect(programDay('2026-11-30').week).toBe(1);
    expect(programDay('2026-12-07').week).toBe(2);
    const pre = featuredDay('2026-11-27');
    expect(pre.daysUntilStart).toBe(3);
    expect(pre.plan.key).toBe('upperA');
    expect(programDay(addDays(META.startDate, 52 * 7)).finished).toBe(true);
  });
  it('builds Monday-first weeks', () => {
    expect(weekDates('2026-12-03')[0]).toBe('2026-11-30');
    expect(weekDates('2026-11-27')[0]).toBe('2026-11-30');
  });
});

describe('progression', () => {
  const press = EXERCISES.inclinePress;
  const slot = slotOf('upperA', 'inclinePress');
  it('starts from the suggested weight', () => {
    expect(recommend(press, slot, []).weight).toBe(press.startWeight);
  });
  it('adds 5 lb when every set hits the top with 1-2 RIR', () => {
    const r = recommend(press, slot, hist(log('inclinePress', 35, [12, 12, 12, 12], 2)));
    expect(r.kind).toBe('increase');
    expect(r.weight).toBe(40);
    expect(r.prefill[0].reps).toBe(8);
  });
  it('holds when a set misses the top or was taken to failure', () => {
    expect(recommend(press, slot, hist(log('inclinePress', 35, [12, 12, 11, 10]))).kind).toBe('hold');
    expect(recommend(press, slot, hist(log('inclinePress', 35, [12, 12, 12, 12], 0))).kind).toBe('hold');
  });
  it('walks the ladder at the 50 lb cap: tempo, pause, extra set, variation', () => {
    const r1 = recommend(press, slot, hist(log('inclinePress', 50, [12, 12, 12, 12])));
    expect(r1.stage).toBe('tempo4');
    expect(r1.tempo.down).toBe(4);
    const r2 = recommend(press, slot, hist(log('inclinePress', 50, [12, 12, 12, 12], 2, 'tempo4')));
    expect(r2.stage).toBe('pause2');
    expect(r2.tempo.bottom).toBe(2);
    const r3 = recommend(press, slot, hist(log('inclinePress', 50, [12, 12, 12, 12], 2, 'pause2')));
    expect(r3.stage).toBe('extraSet');
    expect(r3.sets).toBe(5);
    const r4 = recommend(press, slot, hist(log('inclinePress', 50, [12, 12, 12, 12, 12], 2, 'extraSet')));
    expect(r4.stage).toBe('variation');
    expect(r4.detail).toContain(press.harderVariation);
  });
  it('extra-set stage needs all 5 sets before advancing', () => {
    const r = recommend(press, slot, hist(log('inclinePress', 50, [12, 12, 12, 12], 2, 'extraSet')));
    expect(r.kind).toBe('hold');
  });
  it('bodyweight moves use the ladder directly', () => {
    const rc = EXERCISES.reverseCrunch;
    const r = recommend(rc, slotOf('lowerB', 'reverseCrunch'), hist(log('reverseCrunch', 0, [15, 15, 15])));
    expect(r.stage).toBe('tempo4');
  });
  it('reads history newest first', () => {
    const s = (date: string, w: number): SessionLog => ({ id: date, date, dayKey: 'upperA', startedAt: Date.parse(date), exercises: [log('inclinePress', w, [8])], cardioDone: [] });
    expect(exerciseHistory([s('2026-11-30', 30), s('2026-12-07', 35)], 'inclinePress')[0].log.sets[0].weight).toBe(35);
  });
});

describe('estimates', () => {
  it('reports lifting and cardio minutes for each strength day', () => {
    for (const d of DAYS.filter((x) => x.kind === 'strength')) {
      const e = estimateDay(d);
      expect(e.liftMin).toBeGreaterThan(20);
      expect(e.cardioMin).toBe(20);
    }
  });
});

describe('body', () => {
  it('projects the planned body-fat checkpoints', () => {
    expect(projectedBodyFat(0)).toBeCloseTo(24);
    expect(projectedBodyFat(30.44)).toBeCloseTo(22);
    expect(projectedBodyFat(30.44 * 9)).toBeCloseTo(12);
    expect(projectedWeight(0)).toBeCloseTo(225, 0);
    expect(projectedWeight(30.44 * 9)).toBeCloseTo(194.3, 0);
  });
  it('computes a 7-day average', () => {
    const e = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: addDays('2026-12-01', i), weight: 220 - i }));
    expect(avg7(e, '2026-12-07')).toBeCloseTo(217);
    expect(avg7(e.slice(0, 2), '2026-12-07')).toBeNull();
  });
  it('flags a stall after month one', () => {
    const flat = Array.from({ length: 40 }, (_, i) => ({ date: addDays(META.startDate, i), weight: 224 }));
    expect(ruleCheck(flat, addDays(META.startDate, 10)).state).toBe('early');
    expect(ruleCheck(flat, addDays(META.startDate, 35)).state).toBe('adjust');
    const down = Array.from({ length: 40 }, (_, i) => ({ date: addDays(META.startDate, i), weight: 225 - i * 0.15 }));
    expect(ruleCheck(down, addDays(META.startDate, 35)).state).toBe('on-track');
  });
});

describe('storage', () => {
  it('round-trips and rejects junk', () => {
    const s = emptyState();
    s.body.push({ date: '2026-12-01', weight: 224 });
    expect(parseState(JSON.parse(JSON.stringify(s))).body[0].weight).toBe(224);
    expect(() => parseState('nope')).toThrow();
    expect(() => parseState({ version: 99 })).toThrow();
  });
  it('merges by id and date', () => {
    const a = emptyState(); a.body = [{ date: '2026-12-01', weight: 224 }];
    const b = emptyState(); b.body = [{ date: '2026-12-01', waist: 40 }, { date: '2026-12-02', weight: 223 }];
    const m = mergeStates(a, b);
    expect(m.body).toHaveLength(2);
    expect(m.body[0]).toMatchObject({ weight: 224, waist: 40 });
  });
});
