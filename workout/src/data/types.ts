// Core program types. Everything the app knows about the plan is typed here
// and instantiated in program.ts.

export type DayKey = 'upperA' | 'lowerA' | 'bike' | 'upperB' | 'lowerB' | 'easy' | 'off';
export type DayKind = 'strength' | 'conditioning' | 'recovery' | 'rest';
export type HeroArt = 'upper' | 'lower' | 'cardio' | 'recovery' | 'rest';

export interface Tempo {
  /** seconds lowering (eccentric) */
  down: number;
  /** pause at the stretch / bottom */
  bottom: number;
  /** seconds lifting (concentric) */
  up: number;
  /** pause at the top / squeeze */
  top: number;
}

export interface Cue {
  text: string;
  /** neutral-spine and other safety cues are rendered prominently */
  priority?: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  short: string;
  /** primary then secondary muscles */
  muscles: { primary: string[]; secondary: string[] };
  cues: Cue[];
  mistake: string;
  /** used once the 50 lb ceiling has been reached and other levers are used up */
  harderVariation: string;
  /** dumbbell = weight is per hand; single = one dumbbell; bodyweight = no load */
  load: 'pair' | 'single' | 'bodyweight';
  perSide: boolean;
  /** starting suggestion in lb (per hand for pairs) */
  startWeight: number;
  /** camera note shown in the demo caption */
  view: string;
}

export interface ExerciseSlot {
  exerciseId: string;
  sets: number;
  reps: [number, number];
  rest: number;
  tempo: Tempo;
  /** exercises sharing a group letter are performed as a superset */
  superset?: string;
  dropSetOnLast?: boolean;
}

export interface CardioBlock {
  id: string;
  name: string;
  kind: 'incline-walk' | 'bike-intervals' | 'easy';
  minutes: number;
  /** min and max minutes for flexible blocks */
  range?: [number, number];
  details: string[];
  intervals?: { rounds: number; hard: number; easy: number };
  demo: 'treadmill' | 'bike';
}

export interface DayPlan {
  key: DayKey;
  weekday: number; // 0 = Sun ... 6 = Sat
  title: string;
  subtitle: string;
  kind: DayKind;
  art: HeroArt;
  slots: ExerciseSlot[];
  cardio: CardioBlock[];
  sauna?: number;
  notes: string[];
}

export interface Habit {
  id: 'kcal' | 'protein' | 'steps' | 'sleep';
  label: string;
  target: string;
  detail: string;
}

export interface ProgramMeta {
  name: string;
  startDate: string; // ISO date, a Monday
  weeks: number;
  maxDumbbell: number;
  increment: number;
  start: { weightLb: number; bodyFat: number; heightIn: number };
  /** body-fat projection: month -> percent */
  projection: { month: number; bf: number }[];
  incline: { gradePct: number; mph: number };
  sessionMinutes: number;
}

// ---------- logged data ----------

export interface SetLog {
  weight: number;
  reps: number;
  rir: number; // reps in reserve
  done: boolean;
  drop?: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  /** progression stage that applied during this session */
  stage: ProgressionStage;
}

export interface SessionLog {
  id: string;
  date: string; // ISO date
  dayKey: DayKey;
  startedAt: number;
  finishedAt?: number;
  exercises: ExerciseLog[];
  cardioDone: string[];
  notes?: string;
  /** index of the block the athlete is on (workout mode) */
  cursor?: number;
}

export type ProgressionStage = 'load' | 'tempo4' | 'pause2' | 'extraSet' | 'variation';

export interface BodyEntry {
  date: string;
  weight?: number;
  waist?: number;
}

export type HabitDay = Partial<Record<Habit['id'], boolean>>;
