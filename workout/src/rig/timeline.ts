// Keyframe interpolation and tempo-driven timelines.
import type { Tempo } from '../data/types';
import type { DemoSpec, Ease, Effector, LegEffector, Phase, Pose, Side } from './types';
import { type V3, lerp, lerpN, norm, slerpDir } from './vec';

const ease = (e: Ease | undefined, t: number) => {
  switch (e) {
    case 'linear': return t;
    case 'out': return 1 - (1 - t) * (1 - t);
    case 'in': return t * t;
    default: return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }
};

const lerpOpt = (a: V3 | undefined, b: V3 | undefined, t: number) => (a && b ? norm(lerp(a, b, t)) : (t < 0.5 ? a : b));

function lerpEff(a: Effector, b: Effector, t: number): Effector {
  if ('p' in a && 'p' in b) return { p: lerp(a.p, b.p, t), pole: lerpOpt(a.pole, b.pole, t) };
  if ('dir' in a && 'dir' in b) return { dir: slerpDir(a.dir, b.dir, t), reach: lerpN(a.reach, b.reach, t), pole: lerpOpt(a.pole, b.pole, t) };
  if ('upper' in a && 'upper' in b) return { upper: slerpDir(a.upper, b.upper, t), flex: lerpN(a.flex, b.flex, t), bend: slerpDir(a.bend, b.bend, t) };
  if ('attach' in a && 'attach' in b && a.attach === b.attach) return { attach: a.attach, off: lerp(a.off, b.off, t), pole: lerpOpt(a.pole, b.pole, t) };
  return t < 0.5 ? a : b;
}

function lerpLeg(a: LegEffector, b: LegEffector, t: number): LegEffector {
  return { ...lerpEff(a, b, t), foot: lerpN(a.foot ?? 0, b.foot ?? 0, t), toeOut: lerpN(a.toeOut ?? 0, b.toeOut ?? 0, t) };
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const sides: Side[] = ['r', 'l'];
  const arms = {} as Pose['arms'];
  const legs = {} as Pose['legs'];
  for (const s of sides) {
    arms[s] = lerpEff(a.arms[s], b.arms[s], t);
    legs[s] = lerpLeg(a.legs[s], b.legs[s], t);
  }
  const n = (x?: number, y?: number) => lerpN(x ?? 0, y ?? 0, t);
  let dbAxis: Pose['dbAxis'];
  if (a.dbAxis || b.dbAxis) {
    dbAxis = {};
    for (const s of sides) {
      const x = a.dbAxis?.[s] ?? [0, 0, 1];
      const y = b.dbAxis?.[s] ?? [0, 0, 1];
      dbAxis[s] = slerpDir(x, y, t);
    }
  }
  let twoHand = a.twoHand;
  if (a.twoHand && b.twoHand && a.twoHand.axis !== 'forearm' && b.twoHand.axis !== 'forearm') {
    twoHand = { axis: slerpDir(a.twoHand.axis, b.twoHand.axis, t), offset: lerpN(a.twoHand.offset, b.twoHand.offset, t) };
  }
  return {
    pelvis: lerp(a.pelvis, b.pelvis, t),
    pitch: lerpN(a.pitch, b.pitch, t),
    yaw: n(a.yaw, b.yaw),
    roll: n(a.roll, b.roll),
    lumbar: n(a.lumbar, b.lumbar),
    thoracic: n(a.thoracic, b.thoracic),
    neck: n(a.neck, b.neck),
    arms,
    legs,
    dbAxis,
    twoHand,
    extra: a.extra,
  };
}

export interface TimedPhase extends Phase {
  from: string;
  start: number;
  seconds: number;
  label: string;
}

const MIN_HOLD = 0.35;

/** Resolve phase durations from a tempo (defaults to the program's 3 s lowering). */
export function buildTimeline(demo: DemoSpec, tempo?: Tempo): { phases: TimedPhase[]; total: number } {
  const t = tempo ?? { down: 3, up: 1, top: 0, bottom: 0 };
  const out: TimedPhase[] = [];
  let clock = 0;
  let from = demo.start;
  for (const ph of demo.phases) {
    const roleSec = ph.role === 'fixed' ? ph.dur ?? 1 : t[ph.role];
    let seconds = ph.role === 'fixed' ? roleSec : roleSec * (ph.share ?? 1);
    let label = ph.verb;
    const fullRole = ph.role === 'fixed' ? roleSec : roleSec;
    if (seconds < MIN_HOLD) seconds = ph.role === 'top' || ph.role === 'bottom' ? MIN_HOLD : Math.max(seconds, 0.4);
    if (fullRole >= 0.6) label = `${ph.verb} ${Number.isInteger(fullRole) ? fullRole : fullRole.toFixed(1)}s`;
    out.push({ ...ph, from, start: clock, seconds, label });
    clock += seconds;
    from = ph.to;
  }
  return { phases: out, total: clock };
}

export interface Frame {
  pose: Pose;
  phase: TimedPhase | null;
  phaseProgress: number;
  label: string;
}

export function poseAt(demo: DemoSpec, timeline: ReturnType<typeof buildTimeline>, time: number): Frame {
  if (demo.procedural) {
    const u = ((time % demo.procedural.period) + demo.procedural.period) % demo.procedural.period / demo.procedural.period;
    return { pose: demo.procedural.at(u), phase: null, phaseProgress: u, label: demo.procedural.label };
  }
  const { phases, total } = timeline;
  const tt = ((time % total) + total) % total;
  let ph = phases[phases.length - 1];
  for (const p of phases) if (tt >= p.start && tt < p.start + p.seconds) { ph = p; break; }
  const u = Math.min(1, Math.max(0, (tt - ph.start) / ph.seconds));
  const a = demo.poses[ph.from];
  const b = demo.poses[ph.to];
  return { pose: a === b ? a : lerpPose(a, b, ease(ph.ease, u)), phase: ph, phaseProgress: u, label: ph.label };
}

/** Times for the 3 contact-sheet frames: start pose, middle of the lowering, end of the lowering. */
export function sampleTimes(demo: DemoSpec, timeline: ReturnType<typeof buildTimeline>): number[] {
  if (demo.procedural) return [0, demo.procedural.period / 3, (2 * demo.procedural.period) / 3];
  const downs = timeline.phases.filter((p) => p.role === 'down');
  const main = downs.length ? downs : [timeline.phases.reduce((a, b) => (b.seconds > a.seconds ? b : a))];
  const first = main[0];
  const last = main[main.length - 1];
  const s = first.start;
  const e = last.start + last.seconds;
  return [s, (s + e) / 2, e - 0.001];
}
