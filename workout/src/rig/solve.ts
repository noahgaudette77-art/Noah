// Forward kinematics for the trunk, 2-bone IK / FK for the limbs, and joint-angle readouts.
import { BODY } from './skeleton';
import type { Effector, LegEffector, Pose, Side } from './types';
import {
  type M3, type V3, DEG, add, angleAt, angleBetween, apply, compose, cross, dist, dot, len, mul, norm, rotY, rx, ry, rz, sub,
} from './vec';

export interface Limb {
  root: V3;
  mid: V3; // elbow / knee
  end: V3; // grip / ankle
  wrist?: V3;
  error: number; // distance between solved end and target (cm)
}

export interface Foot {
  ankle: V3;
  heel: V3;
  ball: V3;
  toe: V3;
  top: V3;
  dir: V3;
  up: V3;
}

export interface Solved {
  pelvis: V3;
  waist: V3;
  neckBase: V3;
  head: V3;
  chin: V3;
  frames: { pelvis: M3; lumbar: M3; thorax: M3; head: M3 };
  arm: Record<Side, Limb>;
  leg: Record<Side, Limb>;
  foot: Record<Side, Foot>;
  db: { center: V3; axis: V3 }[];
}

const SIDE: Record<Side, number> = { r: 1, l: -1 };

function twoBone(root: V3, target: V3, l1: number, l2: number, pole: V3): { mid: V3; end: V3; error: number } {
  const d0 = dist(root, target);
  const d = Math.min(Math.max(d0, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.001);
  const dir = d0 > 1e-6 ? norm(sub(target, root)) : [0, -1, 0] as V3;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let p = sub(pole, mul(dir, dot(pole, dir)));
  if (len(p) < 1e-6) p = Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  p = norm(p);
  const mid = add(add(root, mul(dir, a)), mul(p, h));
  const end = add(mid, mul(norm(sub(add(root, mul(dir, d)), mid)), l2));
  return { mid, end, error: dist(end, target) };
}

function fkLimb(root: V3, upper: V3, flex: number, bend: V3, l1: number, l2: number) {
  const u = norm(upper);
  let b = sub(bend, mul(u, dot(bend, u)));
  b = len(b) < 1e-6 ? [1, 0, 0] : norm(b);
  const mid = add(root, mul(u, l1));
  const fd = add(mul(u, Math.cos(flex * DEG)), mul(b, Math.sin(flex * DEG)));
  return { mid, end: add(mid, mul(fd, l2)), error: 0 };
}

function solveLimb(
  eff: Effector,
  root: V3,
  l1: number,
  l2: number,
  defPole: V3,
  attach: { pelvis: [V3, M3]; chest: [V3, M3] },
) {
  if ('upper' in eff) return fkLimb(root, eff.upper, eff.flex, eff.bend, l1, l2);
  let target: V3;
  if ('p' in eff) target = eff.p;
  else if ('dir' in eff) target = add(root, mul(norm(eff.dir), eff.reach * (l1 + l2)));
  else {
    const [o, m] = attach[eff.attach];
    target = add(o, apply(m, eff.off));
  }
  return twoBone(root, target, l1, l2, eff.pole ?? defPole);
}

function solveFoot(ankle: V3, leg: LegEffector, side: Side, yaw: number): Foot {
  const p = (leg.foot ?? 0) * DEG;
  const toe = (leg.toeOut ?? 0) * -SIDE[side] + yaw;
  const dir = rotY([Math.cos(p), Math.sin(p), 0], toe);
  const up = rotY([-Math.sin(p), Math.cos(p), 0], toe);
  const at = (f: number, u: number) => add(ankle, add(mul(dir, f), mul(up, u)));
  return { ankle, dir, up, heel: at(-6, -BODY.ankleH + 1.5), ball: at(13, -BODY.ankleH), toe: at(19, -BODY.ankleH + 2.5), top: at(6, 1.5) };
}

export function solve(pose: Pose): Solved {
  const yaw = pose.yaw ?? 0;
  const fp = compose(compose(ry(yaw), rz(-pose.pitch)), rx(pose.roll ?? 0));
  const fl = compose(fp, rz(-(pose.lumbar ?? 0)));
  const ft = compose(fl, rz(-(pose.thoracic ?? 0)));
  const fh = compose(ft, rz(-(pose.neck ?? 0)));
  const P = pose.pelvis;
  const waist = add(P, apply(fl, [0, BODY.lumbar, 0]));
  const neckBase = add(waist, apply(ft, [0, BODY.thoracic, 0]));
  const head = add(neckBase, apply(fh, [1.5, BODY.neck + BODY.headR * 0.95, 0]));
  const chin = add(neckBase, apply(fh, [6.5, BODY.neck + 1.5, 0]));
  const attach = { pelvis: [P, fp] as [V3, M3], chest: [waist, ft] as [V3, M3] };

  const arm = {} as Record<Side, Limb>;
  const leg = {} as Record<Side, Limb>;
  const foot = {} as Record<Side, Foot>;
  for (const s of ['r', 'l'] as Side[]) {
    const k = SIDE[s];
    const sh = add(neckBase, apply(ft, [0, -BODY.shoulderDrop, k * BODY.shoulderW]));
    const a = solveLimb(pose.arms[s], sh, BODY.upperArm, BODY.grip, apply(ft, [-0.4, -1, k * 0.7]), attach);
    const wrist = add(a.mid, mul(norm(sub(a.end, a.mid)), BODY.forearm));
    arm[s] = { root: sh, mid: a.mid, end: a.end, wrist, error: a.error };

    const hip = add(P, apply(fp, [0, 0, k * BODY.hipW]));
    const le = pose.legs[s];
    const kneePole = rotY([1, 0, 0.12 * k], yaw - (le.toeOut ?? 0) * k);
    const l = solveLimb(le, hip, BODY.thigh, BODY.shin, kneePole, attach);
    leg[s] = { root: hip, mid: l.mid, end: l.end, error: l.error };
    foot[s] = solveFoot(l.end, le, s, yaw);
  }

  const db: Solved['db'] = [];
  const axisFor = (s: Side) => norm(pose.dbAxis?.[s] ?? [0, 0, 1]);
  if (pose.twoHand) {
    const mid = mul(add(arm.r.end, arm.l.end), 0.5);
    const axis = pose.twoHand.axis === 'forearm'
      ? norm(add(sub(arm.r.mid, arm.r.end), sub(arm.l.mid, arm.l.end)))
      : norm(pose.twoHand.axis);
    db.push({ center: add(mid, mul(axis, pose.twoHand.offset)), axis });
  } else {
    db.push({ center: arm.r.end, axis: axisFor('r') }, { center: arm.l.end, axis: axisFor('l') });
  }

  return { pelvis: P, waist, neckBase, head, chin, frames: { pelvis: fp, lumbar: fl, thorax: ft, head: fh }, arm, leg, foot, db };
}

// ---------- measurements used by tests, the contact sheet and the form checks ----------

export interface Metrics {
  [k: string]: number;
}

export function metrics(s: Solved, pose: Pose): Metrics {
  const trunk = sub(s.neckBase, s.pelvis);
  const thoraxDown = mul(s.frames.thorax[1], -1);
  const out: Metrics = {
    trunk: angleBetween(trunk, [0, 1, 0]), // 0 = upright, 90 = horizontal
    spine: (pose.lumbar ?? 0) + (pose.thoracic ?? 0),
    lumbar: pose.lumbar ?? 0,
    neck: pose.neck ?? 0,
    pelvisY: s.pelvis[1],
    neckBaseY: s.neckBase[1],
    maxError: 0,
  };
  for (const side of ['r', 'l'] as Side[]) {
    const S = side.toUpperCase();
    out['knee' + S] = angleAt(s.leg[side].root, s.leg[side].mid, s.leg[side].end);
    out['elbow' + S] = angleAt(s.arm[side].root, s.arm[side].mid, s.arm[side].end);
    out['hip' + S] = angleAt(s.neckBase, s.leg[side].root, s.leg[side].mid);
    out['shoulder' + S] = angleBetween(sub(s.arm[side].mid, s.arm[side].root), thoraxDown);
    // thigh angle from horizontal (0 = parallel to floor)
    const th = sub(s.leg[side].mid, s.leg[side].root);
    out['thigh' + S] = Math.abs(Math.asin(Math.max(-1, Math.min(1, th[1] / len(th)))) / DEG);
    // shin angle from vertical
    out['shin' + S] = angleBetween(sub(s.leg[side].mid, s.leg[side].end), [0, 1, 0]);
    out['ankleY' + S] = s.leg[side].end[1];
    out['handY' + S] = s.arm[side].end[1];
    out['kneeY' + S] = s.leg[side].mid[1];
    out['hipBelowKnee' + S] = s.leg[side].mid[1] - s.leg[side].root[1];
    out['soleY' + S] = Math.min(s.foot[side].heel[1], s.foot[side].ball[1], s.foot[side].toe[1]);
    out.maxError = Math.max(out.maxError, s.arm[side].error, s.leg[side].error);
  }
  // knee travel past toes (+ = knee ahead of toes), right leg
  out.kneeOverToeR = s.leg.r.mid[0] - s.foot.r.toe[0];
  out.kneeOverToeL = s.leg.l.mid[0] - s.foot.l.toe[0];
  // elbow flare: angle of upper arm away from the trunk plane (for presses)
  const lateral = s.frames.thorax[2];
  out.flareR = 90 - angleBetween(sub(s.arm.r.mid, s.arm.r.root), lateral);
  out.minY = Math.min(
    ...(['r', 'l'] as Side[]).flatMap((k) => [s.foot[k].heel[1], s.foot[k].ball[1], s.foot[k].toe[1], s.arm[k].end[1] - 4, s.leg[k].mid[1] - 6]),
    s.head[1] - BODY.headR,
  );
  return out;
}

export { cross };
