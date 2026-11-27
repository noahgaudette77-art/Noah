import type { V3 } from './vec';

export type Side = 'r' | 'l';

/**
 * How a limb is driven in a keyframe.
 *  - p:      IK to a world point (planted hands/feet)
 *  - dir:    IK to a point at `reach` x limb length from the shoulder/hip (arcs when interpolated)
 *  - upper:  forward kinematics: upper-segment world direction, joint flexion and bend direction
 *  - attach: IK to a point fixed in the pelvis or chest frame (moves with the torso)
 */
export type Effector =
  | { p: V3; pole?: V3 }
  | { dir: V3; reach: number; pole?: V3 }
  | { upper: V3; flex: number; bend: V3 }
  | { attach: 'pelvis' | 'chest'; off: V3; pole?: V3 };

export type LegEffector = Effector & {
  /** world pitch of the foot in degrees: 0 = toes forward and level, -90 = toes down */
  foot?: number;
  /** toe-out in degrees */
  toeOut?: number;
};

export interface Pose {
  pelvis: V3;
  /** trunk lean from vertical, degrees. + forward, - backward (-90 = lying on back, head toward -x) */
  pitch: number;
  yaw?: number;
  roll?: number;
  /** spine flexion (+ curls forward) */
  lumbar?: number;
  thoracic?: number;
  /** + chin toward chest */
  neck?: number;
  arms: Record<Side, Effector>;
  legs: Record<Side, LegEffector>;
  /** dumbbell axis per hand (world). Default: lateral (z) */
  dbAxis?: Partial<Record<Side, V3>>;
  /** one dumbbell held in both hands */
  twoHand?: { axis: V3 | 'forearm'; offset: number };
  /** free values for animated props (crank angle, belt offset) */
  extra?: Record<string, number>;
}

export type Prop =
  | { kind: 'bench'; x: number; z?: number; yaw?: number; back: number; facing?: 'away' | 'toward' }
  | { kind: 'mat'; x0: number; x1: number }
  | { kind: 'treadmill'; grade: number }
  | { kind: 'bike' };

export type Hold = 'pair' | 'right' | 'twoHand' | 'none';
export type Role = 'down' | 'up' | 'top' | 'bottom' | 'fixed';
export type Ease = 'sine' | 'linear' | 'out' | 'in' | 'overshoot' | 'controlled';

export interface Phase {
  to: string;
  role: Role;
  verb: string;
  /** fixed seconds (role 'fixed', or a default when no tempo applies) */
  dur?: number;
  /** fraction of the role's tempo seconds, when one role spans several phases */
  share?: number;
  ease?: Ease;
}

export interface Check {
  pose: string;
  metric: string;
  min?: number;
  max?: number;
  note: string;
}

export interface DemoSpec {
  id: string;
  camera: { yaw: number; pitch?: number };
  props: Prop[];
  hold: Hold;
  poses: Record<string, Pose>;
  start: string;
  phases: Phase[];
  /** procedural motion (walk cycle, pedalling): period in seconds and pose generator */
  procedural?: { period: number; label: string; at: (u: number) => Pose };
  /** poses shown in the contact sheet and reduced-motion view */
  keyframes: [string, string];
  checks: Check[];
  /** joints that must stay on the support surface across the whole loop */
  planted?: { joint: 'ankleR' | 'ankleL' | 'handL' | 'handR'; tol?: number }[];
}
