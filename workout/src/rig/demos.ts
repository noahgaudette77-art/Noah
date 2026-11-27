// Exercise demos: 2-4 keyframe poses per exercise on the shared rig, plus tempo phases and
// form checks that the test suite and contact sheet verify. Units: centimetres, character
// faces +x, right side (+z) is nearest the camera in side view.
import { BODY } from './skeleton';
import { BENCH, BIKE, TREAD, benchFrame, treadY } from './render';
import type { DemoSpec, Effector, LegEffector, Phase, Pose, Prop, Side } from './types';
import { type V3, DEG, add, mul } from './vec';

const A = BODY.ankleH;
type K = 1 | -1;
const both = (fn: (k: K, s: Side) => Effector): Record<Side, Effector> => ({ r: fn(1, 'r'), l: fn(-1, 'l') });
const bothLegs = (fn: (k: K, s: Side) => LegEffector): Record<Side, LegEffector> => ({ r: fn(1, 'r'), l: fn(-1, 'l') });
const floorFoot = (x: number, z: number, toeOut = 0): LegEffector => ({ p: [x, A, z], foot: 0, toeOut });
const hang = (k: K, fwd = 0.04, out = 0.08, reach = 0.99): Effector => ({ dir: [fwd, -1, k * out], reach });
const pitchOf = (d: V3) => Math.atan2(d[0], d[1]) / DEG;
const X: V3 = [1, 0, 0];
const Z: V3 = [0, 0, 1];

// standard phase patterns
const LOWER_FIRST = (bottom: string, top: string, up = 'Press', down = 'Lower'): Phase[] => [
  { to: bottom, role: 'down', verb: down },
  { to: top, role: 'up', verb: up },
  { to: top, role: 'top', verb: 'Reset' },
];
const LIFT_FIRST = (top: string, bottom: string, up: string, hold = 'Squeeze', down = 'Lower'): Phase[] => [
  { to: top, role: 'up', verb: up },
  { to: top, role: 'top', verb: hold },
  { to: bottom, role: 'down', verb: down },
];

const NEUTRAL = (pose: string): DemoSpec['checks'] => [
  { pose, metric: 'spine', min: -1, max: 1, note: 'Neutral spine: no lumbar or thoracic flexion' },
];

// ---------- benches ----------
const pad = (b: Extract<Prop, { kind: 'bench' }>) => {
  const F = benchFrame(b);
  return { ...F, at: (s: number, n: number): V3 => add(add(F.hinge, mul(F.along, s)), mul(F.normal, n)), pitch: pitchOf(F.along) };
};
const shoulderOf = (pelvis: V3, pitch: number, k: K): V3 => {
  const d: V3 = [Math.sin(pitch * DEG), Math.cos(pitch * DEG), 0];
  return add(add(pelvis, mul(d, BODY.lumbar + BODY.thoracic - BODY.shoulderDrop)), [0, 0, k * BODY.shoulderW]);
};

// ========== UPPER A ==========
const incline30: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: 0, back: 30 };
const inclinePress = (): DemoSpec => {
  const P = pad(incline30);
  const pelvis = P.at(8, 11.5);
  const base = { pelvis, pitch: P.pitch, neck: -4, legs: bothLegs((k) => floorFoot(38, k * 25, 8)) };
  const top: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [4, 63, -k * 2.5]), pole: [0.4, -1, k * 0.7] }; }) };
  const bottom: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [11, 19, k * 22]), pole: [0.4, -1, k * 0.7] }; }) };
  return {
    id: 'inclinePress', camera: { yaw: 32, pitch: 10 }, props: [incline30], hold: 'pair',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 58, max: 62, note: 'Bench and torso at 30 degrees' },
      { pose: 'top', metric: 'elbowR', min: 150, max: 175, note: 'Near lockout at the top, not hyperextended' },
      { pose: 'bottom', metric: 'elbowR', min: 55, max: 95, note: 'Deep but controlled bottom position' },
      { pose: 'bottom', metric: 'flareR', min: 25, max: 65, note: 'Elbows 45-60 degrees from the torso, not flared to 90' },
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const csBench: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: 0, back: 40, facing: 'toward' };
const chestSupported = (): { P: ReturnType<typeof pad>; pelvis: V3; legs: Pose['legs'] } => {
  const P = pad(csBench);
  return { P, pelvis: P.at(4, 12), legs: bothLegs((k) => ({ p: [-82, 16.5, k * 17], foot: -38, toeOut: 8, pole: [0.5, -1, k * 0.2] })) };
};
const chestSupportedRow = (): DemoSpec => {
  const { P, pelvis, legs } = chestSupported();
  const base = { pelvis, pitch: P.pitch, neck: 8, legs, dbAxis: { r: X, l: X } };
  const bottom: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [0, -64.2, k * 2]), pole: [-0.3, 0.2, k] }; }) };
  const top: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [-30, -16, k * 5]), pole: [-0.6, 1, k * 0.3] }; }) };
  return {
    id: 'chestSupportedRow', camera: { yaw: 14, pitch: 10 }, props: [csBench], hold: 'pair',
    poses: { bottom, top }, start: 'bottom', phases: LIFT_FIRST('top', 'bottom', 'Row'), keyframes: ['bottom', 'top'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 48, max: 52, note: 'Chest on a 40 degree pad' },
      { pose: 'bottom', metric: 'elbowR', min: 160, max: 181, note: 'Full stretch, arms long' },
      { pose: 'top', metric: 'elbowR', min: 60, max: 110, note: 'Elbows driven back to the hips' },
      ...NEUTRAL('top'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const flat: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: 0, back: 0 };
const lyingFlat = (feetX = 64) => {
  const P = pad(flat);
  const pelvis = P.at(-22, 11.5);
  return { P, pelvis, legs: bothLegs((k) => ({ ...floorFoot(feetX, k * 24, 6), pole: [0.3, 1, k * 0.4] })) };
};
const pullover = (): DemoSpec => {
  const { P, pelvis, legs } = lyingFlat(62);
  const base = { pelvis, pitch: P.pitch, legs, twoHand: { axis: 'forearm' as const, offset: 11 } };
  const top: Pose = { ...base, arms: both((k) => ({ dir: [0.12, 1, -k * 0.22], reach: 0.965, pole: [1, 0, k * 0.6] })) };
  const bottom: Pose = { ...base, arms: both((k) => ({ dir: [-1, -0.08, -k * 0.2], reach: 0.965, pole: [0, 1, k * 0.6] })) };
  return {
    id: 'pullover', camera: { yaw: 18, pitch: 10 }, props: [flat], hold: 'twoHand',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top', 'Pull over'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'top', metric: 'elbowR', min: 140, max: 170, note: 'Soft fixed elbow bend' },
      { pose: 'bottom', metric: 'elbowR', min: 140, max: 170, note: 'Same elbow bend at the stretch' },
      { pose: 'bottom', metric: 'shoulderR', min: 150, max: 185, note: 'Arms in line with the torso at the stretch' },
      ...NEUTRAL('bottom'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const inclineFly = (): DemoSpec => {
  const P = pad(incline30);
  const pelvis = P.at(8, 11.5);
  const base = { pelvis, pitch: P.pitch, neck: -4, legs: bothLegs((k) => floorFoot(38, k * 25, 8)), dbAxis: { r: P.along, l: P.along } };
  const top: Pose = { ...base, arms: both((k) => ({ dir: [0.18, 1, -k * 0.2], reach: 0.962, pole: [0.2, -0.3, k] })) };
  const bottom: Pose = { ...base, arms: both((k) => ({ dir: [0.3, -0.12, k], reach: 0.958, pole: [0.2, -1, k * 0.2] })) };
  return {
    id: 'inclineFly', camera: { yaw: 62, pitch: 14 }, props: [incline30], hold: 'pair',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top', 'Hug'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 58, max: 62, note: 'Bench at 30 degrees' },
      { pose: 'bottom', metric: 'elbowR', min: 135, max: 168, note: 'Slight elbow bend kept in the stretch' },
      { pose: 'top', metric: 'elbowR', min: 135, max: 168, note: 'Same bend at the top' },
      { pose: 'bottom', metric: 'handYR', min: 62, max: 86, note: 'Dumbbells at chest level, not below' },
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const standing = (y = 97.5): Pick<Pose, 'pelvis' | 'legs'> => ({ pelvis: [0, y, 0], legs: bothLegs((k) => floorFoot(2, k * 13, 6)) });
const lateralRaise = (): DemoSpec => {
  const base = { ...standing(), pitch: 5, dbAxis: { r: X, l: X } };
  const bottom: Pose = { ...base, arms: both((k) => ({ dir: [0.12, -1, k * 0.2], reach: 0.95, pole: [-0.4, 0.2, k] })) };
  const top: Pose = { ...base, arms: both((k) => ({ dir: [0.2, -0.2, k], reach: 0.962, pole: [-0.2, 1, k * 0.4] })) };
  return {
    id: 'lateralRaise', camera: { yaw: 68, pitch: 6 }, props: [], hold: 'pair',
    poses: { bottom, top }, start: 'bottom',
    phases: [
      { to: 'top', role: 'up', verb: 'Raise' },
      { to: 'top', role: 'fixed', dur: 0.4, verb: 'Hold' },
      { to: 'bottom', role: 'down', verb: 'Lower' },
    ],
    keyframes: ['bottom', 'top'],
    checks: [
      { pose: 'top', metric: 'shoulderR', min: 78, max: 98, note: 'Raise to shoulder height, no higher' },
      { pose: 'top', metric: 'elbowR', min: 145, max: 175, note: 'Soft elbows' },
      ...NEUTRAL('top'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const inclineReverseFly = (): DemoSpec => {
  const { P, pelvis, legs } = chestSupported();
  const base = { pelvis, pitch: P.pitch, neck: 8, legs, dbAxis: { r: X, l: X } };
  const bottom: Pose = { ...base, arms: both((k) => ({ dir: [0.05, -1, k * 0.12], reach: 0.975, pole: [0, 0.3, k] })) };
  const top: Pose = { ...base, arms: both((k) => ({ dir: [0.12, 0.05, k], reach: 0.962, pole: [-0.5, 1, 0] })) };
  return {
    id: 'inclineReverseFly', camera: { yaw: 58, pitch: 16 }, props: [csBench], hold: 'pair',
    poses: { bottom, top }, start: 'bottom', phases: LIFT_FIRST('top', 'bottom', 'Sweep', 'Hold'), keyframes: ['bottom', 'top'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 48, max: 52, note: 'Chest on a 40 degree pad' },
      { pose: 'top', metric: 'elbowR', min: 140, max: 175, note: 'Slight bend, not a row' },
      ...NEUTRAL('top'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

// ========== LOWER A ==========
const behind: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: -80, back: 0 };
const bulgarian = (): DemoSpec => {
  const rear: LegEffector = { p: [-50, BENCH.top + 4.5, -11], foot: -165, pole: [0.3, -1, 0] };
  const front: LegEffector = { p: [30, A, 11], foot: 0, toeOut: 4 };
  const arms = both((k) => hang(k, 0.05, 0.1));
  const top: Pose = { pelvis: [12, 95.5, 0], pitch: 8, arms, legs: { r: front, l: rear } };
  const bottom: Pose = { pelvis: [-7.5, 58.5, 0], pitch: 18, arms, legs: { r: front, l: rear } };
  return {
    id: 'bulgarian', camera: { yaw: 16, pitch: 8 }, props: [behind], hold: 'pair',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top', 'Drive'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'bottom', metric: 'kneeR', min: 80, max: 100, note: 'Front knee about 90 degrees' },
      { pose: 'bottom', metric: 'thighR', min: 0, max: 15, note: 'Front thigh about parallel' },
      { pose: 'bottom', metric: 'shinR', min: 0, max: 20, note: 'Front shin near vertical' },
      { pose: 'top', metric: 'kneeR', min: 155, max: 178, note: 'Stand almost tall at the top' },
      { pose: 'bottom', metric: 'trunk', min: 8, max: 25, note: 'Slight forward lean, spine neutral' },
      ...NEUTRAL('bottom'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const singleLegRdl = (): DemoSpec => {
  const stand: LegEffector = { p: [0, A, 10], foot: 0, toeOut: 4 };
  const top: Pose = {
    pelvis: [0, 97.5, 0], pitch: 3, arms: both((k) => hang(k, 0.12, 0.05)),
    legs: { r: stand, l: { p: [-16, 11, -10], foot: -22, pole: [1, 0, 0] } },
  };
  const hip: V3 = [-14, 96.5, -BODY.hipW];
  const backDir: V3 = [-Math.sin(78 * DEG), -Math.cos(78 * DEG), 0];
  const bottom: Pose = {
    pelvis: [-14, 96.5, 0], pitch: 78, neck: 4, arms: both((k) => hang(k, -0.14, 0.04)),
    legs: { r: stand, l: { p: add(add(hip, mul(backDir, 89)), [0, 0, -0.5]), foot: -100, pole: [0, -1, 0] } },
  };
  return {
    id: 'singleLegRdl', camera: { yaw: 16, pitch: 8 }, props: [], hold: 'pair',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top', 'Drive', 'Hinge'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'bottom', metric: 'kneeR', min: 150, max: 172, note: 'Soft, unchanged standing knee' },
      { pose: 'bottom', metric: 'trunk', min: 65, max: 85, note: 'Torso close to parallel' },
      { pose: 'bottom', metric: 'hipL', min: 160, max: 185, note: 'Back leg in line with the torso' },
      ...NEUTRAL('bottom'),
    ],
    planted: [{ joint: 'ankleR' }],
  };
};

const stepBench: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: 40, yaw: 90, back: 0 };
const stepUp = (): DemoSpec => {
  const onBench: LegEffector = { p: [38, BENCH.top + A, 10], foot: 0 };
  const arms = both((k) => hang(k, 0.05, 0.1));
  const low: Pose = { pelvis: [4, 97, 0], pitch: 18, arms, legs: { r: onBench, l: floorFoot(0, -10) } };
  const mid: Pose = { pelvis: [24, 118, 0], pitch: 12, arms, legs: { r: onBench, l: { p: [12, 30, -10], foot: -32, pole: [1, 0, 0] } } };
  const top: Pose = { pelvis: [37, BENCH.top + A + 90, 0], pitch: 3, arms, legs: { r: onBench, l: { p: [30, BENCH.top + A + 4, -10], foot: -4, pole: [1, 0, 0] } } };
  const mid2: Pose = { pelvis: [22, 114, 0], pitch: 12, arms, legs: { r: onBench, l: { p: [10, 24, -10], foot: -14, pole: [1, 0, 0] } } };
  return {
    id: 'stepUp', camera: { yaw: 14, pitch: 8 }, props: [stepBench], hold: 'pair',
    poses: { low, mid, top, mid2 }, start: 'low',
    phases: [
      { to: 'mid', role: 'up', share: 0.5, verb: 'Drive', ease: 'in' },
      { to: 'top', role: 'up', share: 0.5, verb: 'Drive', ease: 'out' },
      { to: 'top', role: 'fixed', dur: 0.5, verb: 'Stand tall' },
      { to: 'mid2', role: 'down', share: 0.5, verb: 'Lower', ease: 'in' },
      { to: 'low', role: 'down', share: 0.5, verb: 'Lower', ease: 'out' },
    ],
    keyframes: ['low', 'top'],
    checks: [
      { pose: 'low', metric: 'kneeR', min: 75, max: 105, note: 'Deep start on the working leg' },
      { pose: 'top', metric: 'kneeR', min: 160, max: 181, note: 'Stand tall on the bench' },
      { pose: 'low', metric: 'trunk', min: 10, max: 25, note: 'Slight forward lean from the hips' },
      ...NEUTRAL('low'),
    ],
    planted: [{ joint: 'ankleR' }],
  };
};

const thrustBench: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: -BENCH.width, yaw: 90, back: 0 };
const hipThrust = (): DemoSpec => {
  const contact: V3 = [0, BENCH.top, 0];
  const atPitch = (pitch: number): V3 => {
    const d: V3 = [Math.sin(pitch * DEG), Math.cos(pitch * DEG), 0];
    const fwd: V3 = [Math.cos(pitch * DEG), -Math.sin(pitch * DEG), 0];
    const center = add(contact, mul(fwd, 11));
    return add(center, mul(d, -36));
  };
  const legs = bothLegs((k) => ({ p: [78, A, k * 16], foot: 0, toeOut: 6, pole: [1, 0.4, k * 0.2] }));
  const arms = both((k) => ({ attach: 'pelvis' as const, off: [13, -2, k * 15] as V3, pole: [0, 0.2, k] as V3 }));
  const base = { legs, arms, twoHand: { axis: Z, offset: 0 } };
  const top: Pose = { ...base, pelvis: atPitch(-90), pitch: -90, neck: 26 };
  const bottom: Pose = { ...base, pelvis: atPitch(-58), pitch: -58, neck: 12 };
  return {
    id: 'hipThrust', camera: { yaw: 12, pitch: 8 }, props: [thrustBench], hold: 'twoHand',
    poses: { top, bottom }, start: 'bottom', phases: LIFT_FIRST('top', 'bottom', 'Drive'), keyframes: ['bottom', 'top'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 84, max: 96, note: 'Torso parallel to the floor at the top' },
      { pose: 'top', metric: 'kneeR', min: 80, max: 100, note: 'Knees about 90 degrees at lockout' },
      { pose: 'top', metric: 'shinR', min: 0, max: 12, note: 'Shins vertical at the top' },
      { pose: 'top', metric: 'hipR', min: 165, max: 190, note: 'Hips fully extended, no arch' },
      ...NEUTRAL('top'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const mat: Prop = { kind: 'mat', x0: -82, x1: 70 };
const weightedCrunch = (): DemoSpec => {
  const legs = bothLegs((k) => ({ p: [50, A, k * 12], foot: 0, pole: [0, 1, k * 0.15] }));
  const arms = both((k) => ({ attach: 'chest' as const, off: [17, 22, k * 7] as V3, pole: [0, -0.2, k] as V3 }));
  const base = { pelvis: [0, 11, 0] as V3, pitch: -90, legs, arms, twoHand: { axis: Z, offset: 0 } };
  const down: Pose = { ...base, neck: 12 };
  const up: Pose = { ...base, thoracic: 30, lumbar: 6, neck: 20 };
  return {
    id: 'weightedCrunch', camera: { yaw: 16, pitch: 9 }, props: [mat], hold: 'twoHand',
    poses: { down, up }, start: 'down', phases: LIFT_FIRST('up', 'down', 'Curl up'), keyframes: ['down', 'up'],
    checks: [
      { pose: 'up', metric: 'lumbar', min: 0, max: 10, note: 'Lower back stays on the floor' },
      { pose: 'up', metric: 'spine', min: 25, max: 45, note: 'Ribs curl toward the pelvis' },
      { pose: 'up', metric: 'neck', min: 10, max: 25, note: 'Fist of space under the chin, no yanking' },
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

// ========== UPPER B ==========
const upright: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: 0, back: 82 };
const seatedPress = (): DemoSpec => {
  const P = pad(upright);
  const pelvis = P.at(7, 11);
  const base = { pelvis, pitch: P.pitch, legs: bothLegs((k) => floorFoot(52, k * 26, 14)) };
  const bottom: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [6, 24, k * 28.5]), pole: [0.3, -1, k * 0.8] }; }) };
  const top: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [3, 63, k * 0.5]), pole: [0.3, -1, k * 0.8] }; }) };
  return {
    id: 'seatedPress', camera: { yaw: 52, pitch: 8 }, props: [upright], hold: 'pair',
    poses: { bottom, top }, start: 'top', phases: LOWER_FIRST('bottom', 'top'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 5, max: 12, note: 'Back on a near-upright pad' },
      { pose: 'top', metric: 'elbowR', min: 150, max: 178, note: 'Press to just short of lockout' },
      { pose: 'bottom', metric: 'elbowR', min: 60, max: 100, note: 'Dumbbells at ear level' },
      ...NEUTRAL('top'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const oneArmRow = (): DemoSpec => {
  const pelvis: V3 = [-20, 95, 6];
  const pitch = 72;
  const sh = (k: K): V3 => add(shoulderOf([pelvis[0], pelvis[1], 0], pitch, k), [0, 0, pelvis[2]]);
  const legs: Pose['legs'] = {
    r: { p: [-28, A, 34], foot: 0, toeOut: 10 },
    l: { p: [-62, BENCH.top + 6.5, pelvis[2] - BODY.hipW], foot: 180, pole: [0.2, -1, 0] },
  };
  const support: Effector = { p: [26, BENCH.top + 3.5, -10], pole: [-1, 0, -0.3] };
  const base = { pelvis, pitch, neck: 6, legs, dbAxis: { r: X } };
  const bottom: Pose = { ...base, arms: { r: { p: add(sh(1), [0.5, -64.3, 0.5]), pole: [-0.5, 0.3, 1] }, l: support } };
  const top: Pose = { ...base, arms: { r: { p: add(sh(1), [-20, -33, 6]), pole: [-0.6, 1, 0.3] }, l: support } };
  return {
    id: 'oneArmRow', camera: { yaw: 8, pitch: 12 }, props: [flat], hold: 'right',
    poses: { bottom, top }, start: 'bottom', phases: LIFT_FIRST('top', 'bottom', 'Row'), keyframes: ['bottom', 'top'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 65, max: 82, note: 'Torso close to parallel' },
      { pose: 'top', metric: 'elbowR', min: 60, max: 105, note: 'Elbow drives to the back pocket' },
      { pose: 'bottom', metric: 'elbowR', min: 160, max: 181, note: 'Full stretch at the bottom' },
      { pose: 'top', metric: 'elbowL', min: 140, max: 181, note: 'Support arm long' },
      ...NEUTRAL('top'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }, { joint: 'handL' }],
  };
};

const curlBench: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: 0, back: 55 };
const inclineCurl = (): DemoSpec => {
  const P = pad(curlBench);
  const pelvis = P.at(7, 11);
  const base = { pelvis, pitch: P.pitch, neck: -6, legs: bothLegs((k) => floorFoot(50, k * 20, 8)) };
  const upper = (k: K): V3 => [-0.06, -1, k * 0.09];
  const bottom: Pose = { ...base, arms: both((k) => ({ upper: upper(k), flex: 6, bend: X })) };
  const top: Pose = { ...base, arms: both((k) => ({ upper: upper(k), flex: 132, bend: X })) };
  return {
    id: 'inclineCurl', camera: { yaw: 16, pitch: 8 }, props: [curlBench], hold: 'pair',
    poses: { bottom, top }, start: 'bottom',
    phases: [
      { to: 'top', role: 'up', verb: 'Curl' },
      { to: 'top', role: 'fixed', dur: 0.5, verb: 'Squeeze' },
      { to: 'bottom', role: 'down', verb: 'Lower' },
    ],
    keyframes: ['bottom', 'top'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 33, max: 37, note: 'Bench at about 55 degrees' },
      { pose: 'bottom', metric: 'elbowR', min: 165, max: 181, note: 'Full extension at the bottom' },
      { pose: 'top', metric: 'elbowR', min: 40, max: 60, note: 'Full curl, elbows still' },
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const seatEnd: Extract<Prop, { kind: 'bench' }> = { kind: 'bench', x: -28, back: 0 };
const overheadExtension = (): DemoSpec => {
  const base = { pelvis: [4, BENCH.top + 8.5, 0] as V3, pitch: 0, neck: 2, legs: bothLegs((k) => floorFoot(44, k * 21, 10)), twoHand: { axis: 'forearm' as const, offset: 11 } };
  const upper = (k: K): V3 => [0.1, 1, -k * 0.38];
  const top: Pose = { ...base, arms: both((k) => ({ upper: upper(k), flex: 14, bend: [-1, 0, 0] })) };
  const bottom: Pose = { ...base, arms: both((k) => ({ upper: upper(k), flex: 124, bend: [-1, 0, 0] })) };
  return {
    id: 'overheadExtension', camera: { yaw: 22, pitch: 6 }, props: [seatEnd], hold: 'twoHand',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top', 'Extend'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'bottom', metric: 'elbowR', min: 45, max: 70, note: 'Deep stretch behind the head' },
      { pose: 'top', metric: 'elbowR', min: 160, max: 181, note: 'Full extension' },
      { pose: 'bottom', metric: 'shoulderR', min: 150, max: 181, note: 'Elbows stay pointing up' },
      ...NEUTRAL('bottom'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const flatPress = (): DemoSpec => {
  const { P, pelvis, legs } = lyingFlat(66);
  const base = { pelvis, pitch: P.pitch, legs };
  const top: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [2, 63.5, -k * 2.5]), pole: [0.5, -1, k * 0.7] }; }) };
  const bottom: Pose = { ...base, arms: both((k) => { const s = shoulderOf(pelvis, P.pitch, k); return { p: add(s, [11, 19, k * 22]), pole: [0.5, -1, k * 0.7] }; }) };
  return {
    id: 'flatPress', camera: { yaw: 30, pitch: 12 }, props: [flat], hold: 'pair',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'top', metric: 'trunk', min: 88, max: 92, note: 'Flat bench' },
      { pose: 'top', metric: 'elbowR', min: 150, max: 178, note: 'Near lockout' },
      { pose: 'bottom', metric: 'elbowR', min: 55, max: 95, note: 'Dumbbells level with the chest' },
      { pose: 'bottom', metric: 'flareR', min: 25, max: 65, note: 'Elbows 45-60 degrees, not flared' },
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

// ========== LOWER B ==========
const rdl = (): DemoSpec => {
  const legs = bothLegs((k) => floorFoot(0, k * 12, 5));
  const top: Pose = { pelvis: [0, 98.5, 0], pitch: 0, legs, arms: both((k) => hang(k, 0.27, -0.1)) };
  const bottom: Pose = { pelvis: [-17, 95, 0], pitch: 72, neck: 4, legs, arms: both((k) => hang(k, -0.08, -0.1)) };
  return {
    id: 'rdl', camera: { yaw: 16, pitch: 8 }, props: [], hold: 'pair',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top', 'Drive', 'Hinge'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'bottom', metric: 'kneeR', min: 150, max: 172, note: 'Soft knees, not a squat' },
      { pose: 'bottom', metric: 'trunk', min: 60, max: 85, note: 'Hips pushed back, torso inclined' },
      { pose: 'bottom', metric: 'handYR', min: 35, max: 56, note: 'Dumbbells just below the knees' },
      { pose: 'top', metric: 'hipR', min: 170, max: 185, note: 'Stand tall at the top' },
      ...NEUTRAL('bottom'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const reverseLunge = (): DemoSpec => {
  const front: LegEffector = { p: [0, A, 11], foot: 0, toeOut: 4 };
  const arms = both((k) => hang(k, 0.04, 0.12));
  const top: Pose = { pelvis: [0, 97.5, 0], pitch: 3, arms, legs: { r: front, l: floorFoot(0, -11, 4) } };
  const bottom: Pose = { pelvis: [-39, 56.5, 0], pitch: 8, arms, legs: { r: front, l: { p: [-85, 19, -11], foot: -60, pole: [0.2, -1, 0] } } };
  return {
    id: 'reverseLunge', camera: { yaw: 16, pitch: 8 }, props: [], hold: 'pair',
    poses: { top, bottom }, start: 'top',
    phases: [
      { to: 'bottom', role: 'down', verb: 'Step back, lower' },
      { to: 'top', role: 'up', verb: 'Drive' },
      { to: 'top', role: 'top', verb: 'Reset' },
    ],
    keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'bottom', metric: 'kneeR', min: 80, max: 100, note: 'Front knee about 90 degrees' },
      { pose: 'bottom', metric: 'kneeL', min: 75, max: 105, note: 'Back knee about 90 degrees' },
      { pose: 'bottom', metric: 'kneeYL', min: 4, max: 20, note: 'Back knee hovers just off the floor' },
      { pose: 'bottom', metric: 'trunk', min: 0, max: 15, note: 'Torso tall' },
      ...NEUTRAL('bottom'),
    ],
    planted: [{ joint: 'ankleR' }],
  };
};

const gobletSquat = (): DemoSpec => {
  const legs = bothLegs((k) => ({ ...floorFoot(3, k * 17, 16), pole: [1, 0, k * 0.4] }));
  const arms = both((k) => ({ attach: 'chest' as const, off: [16, 21, k * 5] as V3, pole: [0.2, -1, k * 0.6] as V3 }));
  const base = { legs, arms, twoHand: { axis: [0, -1, 0] as V3, offset: 10 } };
  const top: Pose = { ...base, pelvis: [0, 98.5, 0], pitch: 4 };
  const bottom: Pose = { ...base, pelvis: [-17, 45.5, 0], pitch: 36, neck: -8 };
  return {
    id: 'gobletSquat', camera: { yaw: 26, pitch: 8 }, props: [], hold: 'twoHand',
    poses: { top, bottom }, start: 'top', phases: LOWER_FIRST('bottom', 'top', 'Stand'), keyframes: ['top', 'bottom'],
    checks: [
      { pose: 'bottom', metric: 'hipBelowKneeR', min: -2, max: 20, note: 'Thighs at least parallel' },
      { pose: 'bottom', metric: 'trunk', min: 25, max: 45, note: 'Chest proud, moderate lean' },
      { pose: 'top', metric: 'kneeR', min: 165, max: 181, note: 'Stand tall' },
      ...NEUTRAL('bottom'),
    ],
    planted: [{ joint: 'ankleR' }, { joint: 'ankleL' }],
  };
};

const reverseCrunch = (): DemoSpec => {
  const arms = both((k) => ({ p: [17, 3.5, k * 28] as V3, pole: [0, 1, k * 0.5] as V3 }));
  const down: Pose = {
    pelvis: [0, 11, 0], pitch: -90, neck: 10, arms,
    legs: bothLegs((k) => ({ upper: [0, 1, k * 0.04], flex: 90, bend: X, foot: 38 })),
  };
  const up: Pose = {
    pelvis: [-2.4, 20.5, 0], pitch: -130, lumbar: 12, thoracic: 28, neck: 10, arms,
    legs: bothLegs((k) => ({ upper: [-0.55, 0.83, k * 0.04], flex: 90, bend: [0.83, 0.55, 0], foot: 66 })),
  };
  return {
    id: 'reverseCrunch', camera: { yaw: 16, pitch: 10 }, props: [mat], hold: 'none',
    poses: { down, up }, start: 'down', phases: LIFT_FIRST('up', 'down', 'Curl hips'), keyframes: ['down', 'up'],
    checks: [
      { pose: 'up', metric: 'pelvisY', min: 16, max: 30, note: 'Hips curl off the floor' },
      { pose: 'up', metric: 'neckBaseY', min: 9, max: 14, note: 'Upper back stays down' },
      { pose: 'down', metric: 'kneeR', min: 85, max: 95, note: 'Knees at 90 degrees' },
    ],
  };
};

// ========== CARDIO ==========
const treadmillWalk = (): DemoSpec => {
  const grade = 15;
  const deckA = Math.atan(grade / 100) / DEG;
  const period = 1.05;
  const STANCE = 0.62;
  const R = 33.5;
  const legAt = (phi: number, k: K): LegEffector => {
    let x: number, lift = 0, foot: number;
    if (phi < STANCE) {
      const s = phi / STANCE;
      x = R - 2 * R * s;
      foot = deckA + (s < 0.12 ? 12 * (1 - s / 0.12) : 0) - (s > 0.8 ? 26 * ((s - 0.8) / 0.2) : 0);
      lift = s > 0.8 ? 7 * ((s - 0.8) / 0.2) : 0;
    } else {
      const s = (phi - STANCE) / (1 - STANCE);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * s);
      x = -R + 2 * R * e;
      lift = 7 * (1 - s) + 9 * Math.sin(Math.PI * s);
      foot = deckA - 26 + 38 * s;
    }
    return { p: [x - 4, treadY(x - 4, grade) + A + lift, k * 11], foot, pole: [1, 0, k * 0.1] };
  };
  return {
    id: 'treadmill', camera: { yaw: 18, pitch: 8 }, props: [{ kind: 'treadmill', grade }], hold: 'none',
    poses: {}, start: '', phases: [], keyframes: ['', ''], checks: [],
    procedural: {
      period, label: '15% · 3.0 mph',
      at: (u) => {
        const ph = 2 * Math.PI * u;
        const swing = (k: K) => 20 * Math.sin(ph + (k === 1 ? Math.PI : 0));
        return {
          pelvis: [-6, treadY(-6, grade) + A + 85.2 + 1.4 * Math.cos(2 * ph), 0],
          pitch: 7, yaw: 3 * Math.sin(ph), neck: -4,
          arms: both((k) => ({ upper: [Math.sin(swing(k) * DEG), -Math.cos(swing(k) * DEG), k * 0.1], flex: 45 + 12 * Math.max(0, Math.sin(swing(k) * DEG)), bend: X })),
          legs: { r: legAt(u, 1), l: legAt((u + 0.5) % 1, -1) },
          extra: { belt: u * 108 },
        };
      },
    },
  };
};

const bike = (): DemoSpec => ({
  id: 'bike', camera: { yaw: 18, pitch: 8 }, props: [{ kind: 'bike' }], hold: 'none',
  poses: {}, start: '', phases: [], keyframes: ['', ''], checks: [],
  procedural: {
    period: 0.8, label: 'Pedal · 30/90 s',
    at: (u) => {
      const th = Math.PI / 2 - 2 * Math.PI * u;
      const foot = (a: number, k: K): LegEffector => {
        const p = -12 + 10 * Math.sin(a);
        const pr = p * DEG;
        const dir: V3 = [Math.cos(pr), Math.sin(pr), 0];
        const up: V3 = [-Math.sin(pr), Math.cos(pr), 0];
        const pedal: V3 = [BIKE.crank[0] + BIKE.crankR * Math.cos(a), BIKE.crank[1] + BIKE.crankR * Math.sin(a), k * 12];
        return { p: add(add(pedal, mul(dir, -13)), mul(up, A)), foot: p, pole: [1, 0.2, k * 0.12] };
      };
      return {
        pelvis: [BIKE.saddle[0] + 1, BIKE.saddle[1] + 10, 0], pitch: 28, neck: -14,
        arms: both((k) => ({ p: add(BIKE.bars, [0, 2, k * 21]), pole: [-0.2, -1, k * 0.6] })),
        legs: { r: foot(th, 1), l: foot(th + Math.PI, -1) },
        extra: { crank: th },
      };
    },
  },
});

export const DEMOS: Record<string, DemoSpec> = Object.fromEntries(
  [
    inclinePress(), chestSupportedRow(), pullover(), inclineFly(), lateralRaise(), inclineReverseFly(),
    bulgarian(), singleLegRdl(), stepUp(), hipThrust(), weightedCrunch(),
    seatedPress(), oneArmRow(), inclineCurl(), overheadExtension(), flatPress(),
    rdl(), reverseLunge(), gobletSquat(), reverseCrunch(),
    treadmillWalk(), bike(),
  ].map((d) => [d.id, d]),
);

export const CARDIO_DEMO: Record<string, string> = { treadmill: 'treadmill', bike: 'bike' };
export { TREAD };
