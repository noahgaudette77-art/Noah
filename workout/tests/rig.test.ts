import { describe, expect, it } from 'vitest';
import { DAYS, EXERCISES } from '../src/data/program';
import { DEMOS } from '../src/rig/demos';
import { LIMITS } from '../src/rig/skeleton';
import { metrics, solve } from '../src/rig/solve';
import { buildTimeline, poseAt } from '../src/rig/timeline';
import type { Effector } from '../src/rig/types';
import { dist } from '../src/rig/vec';

const mode = (e: Effector) => ('p' in e ? 'p' : 'dir' in e ? 'dir' : 'upper' in e ? 'upper' : 'attach');

describe('every exercise has a demo', () => {
  it('program exercises map to demos with valid keyframes', () => {
    for (const d of DAYS) for (const s of d.slots) {
      expect(EXERCISES[s.exerciseId], s.exerciseId).toBeTruthy();
      const demo = DEMOS[s.exerciseId];
      expect(demo, s.exerciseId).toBeTruthy();
      for (const k of demo.keyframes) expect(demo.poses[k], `${s.exerciseId}.${k}`).toBeTruthy();
      expect(Object.keys(demo.poses).length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(demo.poses).length).toBeLessThanOrEqual(4);
    }
  });
  it('hinge and lunge moves carry a prominent neutral-spine cue', () => {
    for (const id of ['bulgarian', 'singleLegRdl', 'stepUp', 'hipThrust', 'oneArmRow', 'rdl', 'reverseLunge', 'gobletSquat']) {
      expect(EXERCISES[id].cues.some((c) => c.priority && /neutral spine/i.test(c.text)), id).toBe(true);
    }
  });
  it('each exercise has 3-4 cues and a common mistake', () => {
    for (const ex of Object.values(EXERCISES)) {
      expect(ex.cues.length).toBeGreaterThanOrEqual(3);
      expect(ex.cues.length).toBeLessThanOrEqual(4);
      expect(ex.mistake.length).toBeGreaterThan(10);
    }
  });
});

describe.each(Object.values(DEMOS).map((d) => [d.id, d] as const))('demo %s', (_id, demo) => {
  const tl = buildTimeline(demo);
  const total = demo.procedural ? demo.procedural.period : tl.total;
  const frames = Array.from({ length: 60 }, (_, i) => poseAt(demo, tl, (i / 60) * total).pose);

  it('limb drive modes match across keyframes (so interpolation is smooth)', () => {
    const poses = Object.values(demo.poses);
    for (const side of ['r', 'l'] as const) {
      expect(new Set(poses.map((p) => mode(p.arms[side]))).size).toBeLessThanOrEqual(1);
      expect(new Set(poses.map((p) => mode(p.legs[side]))).size).toBeLessThanOrEqual(1);
    }
  });

  it('form checks pass at the keyframes', () => {
    for (const c of demo.checks) {
      const p = demo.poses[c.pose];
      const v = metrics(solve(p), p)[c.metric];
      expect(v, `${c.pose}.${c.metric}: ${c.note}`).toBeTypeOf('number');
      if (c.min !== undefined) expect(v, `${c.pose}.${c.metric}: ${c.note}`).toBeGreaterThanOrEqual(c.min);
      if (c.max !== undefined) expect(v, `${c.pose}.${c.metric}: ${c.note}`).toBeLessThanOrEqual(c.max);
    }
  });

  it('every IK target is reached and nothing goes through the floor, across the loop', () => {
    for (const f of frames) {
      const m = metrics(solve(f), f);
      expect(m.maxError).toBeLessThan(0.6);
      expect(m.minY).toBeGreaterThan(-1.2);
      for (const k of ['kneeR', 'kneeL'] as const) expect(m[k]).toBeGreaterThanOrEqual(LIMITS.knee[0]);
      for (const k of ['elbowR', 'elbowL'] as const) expect(m[k]).toBeGreaterThanOrEqual(LIMITS.elbow[0]);
    }
  });

  it('planted hands and feet do not slide', () => {
    for (const pl of demo.planted ?? []) {
      const pick = (f: (typeof frames)[number]) => {
        const s = solve(f);
        return pl.joint === 'ankleR' ? s.leg.r.end : pl.joint === 'ankleL' ? s.leg.l.end : pl.joint === 'handR' ? s.arm.r.end : s.arm.l.end;
      };
      const ref = pick(frames[0]);
      for (const f of frames) expect(dist(pick(f), ref)).toBeLessThan(pl.tol ?? 0.5);
    }
  });

  it('timeline uses the 3 s lowering tempo', () => {
    if (demo.procedural) return;
    const down = tl.phases.filter((p) => p.role === 'down').reduce((a, p) => a + p.seconds, 0);
    expect(down).toBeCloseTo(3, 5);
    expect(tl.phases.some((p) => p.label.includes('3s'))).toBe(true);
  });
});

import { liven } from '../src/rig/timeline';
describe('alive layer', () => {
  it('breathing and weight shift never break a pose', () => {
    for (const demo of Object.values(DEMOS)) {
      const tl = buildTimeline(demo);
      const total = demo.procedural ? demo.procedural.period : tl.total;
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * total * 3.7;
        const { pose } = liven(demo, poseAt(demo, tl, t).pose, t);
        const m = metrics(solve(pose), pose);
        expect(m.maxError, demo.id).toBeLessThan(0.6);
        expect(m.minY, demo.id).toBeGreaterThan(-1.2);
      }
    }
  });
});
