// THE PROGRAM. One typed file: meta, exercise library, weekly schedule, cardio, habits.
// Demo animations for each exercise live in src/rig/demos.ts, keyed by exercise id.
import type { CardioBlock, DayPlan, Exercise, Habit, ProgramMeta, Tempo } from './types';

export const META: ProgramMeta = {
  name: 'Tempo',
  startDate: '2026-11-30',
  weeks: 52,
  maxDumbbell: 50,
  increment: 5,
  start: { weightLb: 225, bodyFat: 24, heightIn: 71 },
  projection: [
    { month: 0, bf: 24 },
    { month: 1, bf: 22 },
    { month: 3, bf: 19 },
    { month: 5, bf: 15.5 },
    { month: 9, bf: 12 },
    { month: 12, bf: 12 },
  ],
  incline: { gradePct: 15, mph: 3 },
  sessionMinutes: 45,
};

/** 3 s lowering on every lift, 1 s up, no pauses unless progression adds them */
export const BASE_TEMPO: Tempo = { down: 3, bottom: 0, up: 1, top: 0 };
const SQUEEZE: Tempo = { down: 3, bottom: 0, up: 1, top: 1 };

const NEUTRAL_SPINE = { text: 'Neutral spine: ribs down, back flat from tailbone to head. Hinge at the hips, never round the lower back.', priority: true };

export const EXERCISES: Record<string, Exercise> = {
  inclinePress: {
    id: 'inclinePress', name: 'Incline Dumbbell Press', short: 'Incline Press',
    muscles: { primary: ['Upper chest'], secondary: ['Front delts', 'Triceps'] },
    cues: [
      { text: 'Bench at 30 degrees. Shoulder blades pinched and pressed into the pad.' },
      { text: 'Lower for 3 s until the dumbbells are level with your upper chest.' },
      { text: 'Elbows about 45 to 60 degrees from your sides, forearms vertical.' },
      { text: 'Press up and slightly in; stop just short of locking out.' },
    ],
    mistake: 'Flaring the elbows to 90 degrees and bouncing at the bottom, which loads the shoulder joint instead of the chest.',
    harderVariation: 'Incline press with a 3 s pause at the chest and 1.5 reps',
    load: 'pair', perSide: false, startWeight: 35, view: '3/4 view',
  },
  chestSupportedRow: {
    id: 'chestSupportedRow', name: 'Chest-Supported Dumbbell Row', short: 'Chest-Supported Row',
    muscles: { primary: ['Lats', 'Mid back'], secondary: ['Rear delts', 'Biceps'] },
    cues: [
      { text: 'Bench at 40 degrees, chest on the pad, chin just over the top.' },
      { text: 'Start with arms long and shoulder blades spread.' },
      { text: 'Drive elbows back toward your hips, squeeze 1 s.' },
      { text: 'Lower for 3 s to a full stretch; keep your chest glued to the pad.' },
    ],
    mistake: 'Lifting the chest off the pad to heave the weight, which turns it into a back-extension cheat.',
    harderVariation: 'Chest-supported row with a 2 s squeeze and 1.5 reps',
    load: 'pair', perSide: false, startWeight: 35, view: 'Side view',
  },
  pullover: {
    id: 'pullover', name: 'Dumbbell Pullover', short: 'Pullover',
    muscles: { primary: ['Lats', 'Chest'], secondary: ['Serratus', 'Long head triceps'] },
    cues: [
      { text: 'Lie along a flat bench, feet planted. Hold one dumbbell under the top plate with both hands.' },
      { text: 'Keep a soft, fixed bend in the elbows the whole set.' },
      { text: 'Lower behind your head for 3 s until your arms line up with your torso.' },
      { text: 'Ribs stay down: do not let your lower back arch to get more range.' },
    ],
    mistake: 'Bending and straightening the elbows, which turns it into a triceps extension.',
    harderVariation: 'Pullover with a 2 s pause at the stretch, hips slightly lowered',
    load: 'single', perSide: false, startWeight: 30, view: 'Side view',
  },
  inclineFly: {
    id: 'inclineFly', name: 'Incline Dumbbell Fly', short: 'Incline Fly',
    muscles: { primary: ['Upper chest'], secondary: ['Front delts'] },
    cues: [
      { text: 'Bench at 30 degrees, palms facing each other over your chest.' },
      { text: 'Lock a slight bend in the elbows and keep it.' },
      { text: 'Open wide for 3 s until you feel a chest stretch, dumbbells at chest level.' },
      { text: 'Hug a big tree to bring them back together.' },
    ],
    mistake: 'Lowering too deep with straight arms, which strains the front of the shoulder.',
    harderVariation: 'Fly with a 2 s pause in the stretch, then 1.5 reps',
    load: 'pair', perSide: false, startWeight: 20, view: 'Front 3/4 view',
  },
  lateralRaise: {
    id: 'lateralRaise', name: 'Dumbbell Lateral Raise', short: 'Lateral Raise',
    muscles: { primary: ['Side delts'], secondary: ['Upper traps'] },
    cues: [
      { text: 'Stand tall, slight forward lean, soft elbows.' },
      { text: 'Raise out to the sides, leading with the elbows, to shoulder height.' },
      { text: 'Keep the dumbbells level, pinkies not higher than thumbs.' },
      { text: 'Lower for 3 s, do not let them crash into your thighs.' },
    ],
    mistake: 'Shrugging and swinging the torso to get the weight up.',
    harderVariation: 'Lean-away single-arm raise holding the bench upright',
    load: 'pair', perSide: false, startWeight: 15, view: 'Front 3/4 view',
  },
  inclineReverseFly: {
    id: 'inclineReverseFly', name: 'Incline Reverse Fly', short: 'Reverse Fly',
    muscles: { primary: ['Rear delts'], secondary: ['Mid traps', 'Rhomboids'] },
    cues: [
      { text: 'Chest on a 40 degree incline, arms hanging, palms facing in.' },
      { text: 'Slight elbow bend, sweep the arms out wide like wings.' },
      { text: 'Stop at shoulder height; do not shrug.' },
      { text: 'Lower for 3 s with control.' },
    ],
    mistake: 'Turning it into a row by bending the elbows and pulling back.',
    harderVariation: 'Reverse fly with a 2 s hold at the top',
    load: 'pair', perSide: false, startWeight: 10, view: 'Front 3/4 view',
  },
  bulgarian: {
    id: 'bulgarian', name: 'Bulgarian Split Squat', short: 'Bulgarian Split Squat',
    muscles: { primary: ['Quads', 'Glutes'], secondary: ['Adductors', 'Hamstrings'] },
    cues: [
      NEUTRAL_SPINE,
      { text: 'Rear foot laces-down on the bench, front foot far enough forward that the shin stays near vertical.' },
      { text: 'Lower for 3 s straight down until the front thigh is about parallel.' },
      { text: 'Drive through the whole front foot; the rear leg is only for balance.' },
    ],
    mistake: 'Front foot too close to the bench, so the heel lifts and the knee shoots far past the toes.',
    harderVariation: 'Front-foot-elevated Bulgarian split squat (front foot on a plate)',
    load: 'pair', perSide: true, startWeight: 25, view: 'Side view',
  },
  singleLegRdl: {
    id: 'singleLegRdl', name: 'Single-Leg Dumbbell RDL', short: 'Single-Leg RDL',
    muscles: { primary: ['Hamstrings', 'Glutes'], secondary: ['Lower back', 'Adductors'] },
    cues: [
      NEUTRAL_SPINE,
      { text: 'Soft bend in the standing knee that does not change.' },
      { text: 'Push the hips back for 3 s; the back leg rises in line with your torso.' },
      { text: 'Keep the hips square to the floor and the dumbbells close to the standing leg.' },
    ],
    mistake: 'Rounding the back and opening the hip to the side to reach lower.',
    harderVariation: 'Deficit single-leg RDL standing on a plate with a 2 s pause',
    load: 'pair', perSide: true, startWeight: 30, view: 'Side view',
  },
  stepUp: {
    id: 'stepUp', name: 'Dumbbell Step-Up', short: 'Step-Up',
    muscles: { primary: ['Quads', 'Glutes'], secondary: ['Calves'] },
    cues: [
      NEUTRAL_SPINE,
      { text: 'Whole foot on the bench, slight forward lean from the hips.' },
      { text: 'Drive up through the top foot; do not push off the floor foot.' },
      { text: 'Stand tall at the top, then lower for 3 s under control.' },
    ],
    mistake: 'Bouncing off the floor foot so the working leg barely does anything.',
    harderVariation: 'Step-up with a 2 s pause at the bottom and no floor-foot push',
    load: 'pair', perSide: true, startWeight: 25, view: 'Side view',
  },
  hipThrust: {
    id: 'hipThrust', name: 'Dumbbell Hip Thrust', short: 'Hip Thrust',
    muscles: { primary: ['Glutes'], secondary: ['Hamstrings', 'Adductors'] },
    cues: [
      { text: 'Neutral spine: chin tucked, ribs down. The movement comes from the hips, not an arching lower back.', priority: true },
      { text: 'Upper back on the bench edge just below the shoulder blades, dumbbell on the hip crease.' },
      { text: 'Feet so the shins are vertical at the top.' },
      { text: 'Drive up until the torso is parallel to the floor, squeeze 1 s, lower for 3 s.' },
    ],
    mistake: 'Arching the lower back at the top instead of finishing with the glutes.',
    harderVariation: 'Single-leg hip thrust with the dumbbell',
    load: 'single', perSide: false, startWeight: 50, view: 'Side view',
  },
  weightedCrunch: {
    id: 'weightedCrunch', name: 'Floor Crunch with Dumbbell', short: 'Weighted Crunch',
    muscles: { primary: ['Abs'], secondary: ['Obliques'] },
    cues: [
      { text: 'Knees bent, feet flat, dumbbell held on the upper chest.' },
      { text: 'Curl the ribs toward the pelvis; the lower back stays on the floor.' },
      { text: 'Squeeze 1 s at the top, exhale hard.' },
      { text: 'Lower for 3 s, keep a fist of space under the chin.' },
    ],
    mistake: 'Yanking the head forward and sitting all the way up with the hip flexors.',
    harderVariation: 'Crunch with the dumbbell held at arm’s length above the chest',
    load: 'single', perSide: false, startWeight: 20, view: 'Side view',
  },
  seatedPress: {
    id: 'seatedPress', name: 'Seated Dumbbell Shoulder Press', short: 'Seated Press',
    muscles: { primary: ['Front and side delts'], secondary: ['Triceps', 'Upper chest'] },
    cues: [
      { text: 'Bench nearly upright, back and head on the pad, feet wide.' },
      { text: 'Start with dumbbells just above the shoulders, elbows slightly in front of the body.' },
      { text: 'Press up and slightly in; do not clash the dumbbells.' },
      { text: 'Lower for 3 s back to ear level.' },
    ],
    mistake: 'Arching the lower back off the pad to turn it into an incline press.',
    harderVariation: 'Seated press with a 2 s pause at the bottom and 1.5 reps',
    load: 'pair', perSide: false, startWeight: 30, view: 'Front 3/4 view',
  },
  oneArmRow: {
    id: 'oneArmRow', name: 'One-Arm Dumbbell Row', short: 'One-Arm Row',
    muscles: { primary: ['Lats', 'Mid back'], secondary: ['Rear delts', 'Biceps'] },
    cues: [
      NEUTRAL_SPINE,
      { text: 'Knee and hand on the bench, torso close to parallel with the floor.' },
      { text: 'Pull the elbow toward your back pocket, squeeze 1 s.' },
      { text: 'Lower for 3 s to a full stretch without twisting the torso.' },
    ],
    mistake: 'Rotating the torso open to yank the weight up.',
    harderVariation: 'Seal-style one-arm row with a 2 s squeeze (chest on incline)',
    load: 'single', perSide: true, startWeight: 45, view: 'Side view',
  },
  inclineCurl: {
    id: 'inclineCurl', name: 'Incline Dumbbell Curl', short: 'Incline Curl',
    muscles: { primary: ['Biceps (long head)'], secondary: ['Brachialis', 'Forearms'] },
    cues: [
      { text: 'Bench at about 55 degrees, arms hanging straight down behind your torso.' },
      { text: 'Keep the upper arm still; only the forearm moves.' },
      { text: 'Curl with palms up, squeeze at the top.' },
      { text: 'Lower for 3 s to full arm extension.' },
    ],
    mistake: 'Swinging the elbows forward to finish the rep.',
    harderVariation: 'Incline curl with a 2 s squeeze and 1.5 reps',
    load: 'pair', perSide: false, startWeight: 20, view: 'Side view',
  },
  overheadExtension: {
    id: 'overheadExtension', name: 'Overhead Dumbbell Triceps Extension', short: 'Overhead Extension',
    muscles: { primary: ['Triceps (long head)'], secondary: [] },
    cues: [
      { text: 'Sit tall at the end of the bench, brace, ribs down.' },
      { text: 'Hold one dumbbell overhead in both hands, elbows pointing up and narrow.' },
      { text: 'Lower behind your head for 3 s to a deep stretch.' },
      { text: 'Extend without letting the elbows flare.' },
    ],
    mistake: 'Elbows drifting wide and the lower back arching.',
    harderVariation: 'Overhead extension with a 2 s pause at the stretch',
    load: 'single', perSide: false, startWeight: 35, view: 'Side view',
  },
  flatPress: {
    id: 'flatPress', name: 'Flat Dumbbell Press', short: 'Flat Press',
    muscles: { primary: ['Chest'], secondary: ['Front delts', 'Triceps'] },
    cues: [
      { text: 'Shoulder blades back and down, feet planted.' },
      { text: 'Lower for 3 s until the dumbbells are level with your mid chest.' },
      { text: 'Elbows about 45 to 60 degrees from your sides.' },
      { text: 'Last set: drop about 30 percent and go again to 1 to 2 reps short of failure.' },
    ],
    mistake: 'Letting the shoulders roll forward off the bench at the top.',
    harderVariation: 'Flat press with a 2 s pause and a 1.5-rep drop set',
    load: 'pair', perSide: false, startWeight: 40, view: '3/4 view',
  },
  rdl: {
    id: 'rdl', name: 'Dumbbell Romanian Deadlift', short: 'DB RDL',
    muscles: { primary: ['Hamstrings', 'Glutes'], secondary: ['Lower back', 'Lats (grip and position)'] },
    cues: [
      NEUTRAL_SPINE,
      { text: 'Soft knees that stay soft. Push the hips straight back.' },
      { text: 'Dumbbells slide down the front of the thighs, staying close.' },
      { text: 'Lower for 3 s to just below the knees or until the hamstrings stop you, then drive the hips forward.' },
    ],
    mistake: 'Squatting the weight down with bent knees, or rounding the back to reach the floor.',
    harderVariation: 'Deficit RDL standing on plates with a 2 s pause below the knee',
    load: 'pair', perSide: false, startWeight: 45, view: 'Side view',
  },
  reverseLunge: {
    id: 'reverseLunge', name: 'Dumbbell Reverse Lunge', short: 'Reverse Lunge',
    muscles: { primary: ['Quads', 'Glutes'], secondary: ['Adductors', 'Hamstrings'] },
    cues: [
      NEUTRAL_SPINE,
      { text: 'Step back long enough that both knees reach about 90 degrees.' },
      { text: 'Lower for 3 s until the back knee hovers just off the floor.' },
      { text: 'Drive through the front heel to stand, then switch or repeat.' },
    ],
    mistake: 'Short step so the front heel lifts and the knee takes all the load.',
    harderVariation: 'Deficit reverse lunge from a plate',
    load: 'pair', perSide: true, startWeight: 30, view: 'Side view',
  },
  gobletSquat: {
    id: 'gobletSquat', name: 'Goblet Squat', short: 'Goblet Squat',
    muscles: { primary: ['Quads', 'Glutes'], secondary: ['Adductors', 'Upper back'] },
    cues: [
      { text: 'Neutral spine: chest proud, back flat, no tucking under at the bottom.', priority: true },
      { text: 'Hold the dumbbell vertically against your chest, elbows down.' },
      { text: 'Feet shoulder-width, toes slightly out; knees track over the toes.' },
      { text: 'Lower for 3 s to at least thighs parallel, then stand.' },
    ],
    mistake: 'Knees caving in and the heels lifting.',
    harderVariation: 'Goblet squat with a 3 s pause at the bottom (1.5 reps)',
    load: 'single', perSide: false, startWeight: 50, view: '3/4 view',
  },
  reverseCrunch: {
    id: 'reverseCrunch', name: 'Lying Reverse Crunch', short: 'Reverse Crunch',
    muscles: { primary: ['Lower abs'], secondary: ['Hip flexors', 'Obliques'] },
    cues: [
      { text: 'Lie flat, arms on the floor, hips and knees at 90 degrees.' },
      { text: 'Curl the pelvis up off the floor, knees toward the chest.' },
      { text: 'Squeeze 1 s, no swinging.' },
      { text: 'Lower the hips for 3 s until the tailbone just touches.' },
    ],
    mistake: 'Swinging the legs instead of curling the pelvis.',
    harderVariation: 'Reverse crunch on the bench, holding the bench behind your head',
    load: 'bodyweight', perSide: false, startWeight: 0, view: 'Side view',
  },
};

const INCLINE_WALK: CardioBlock = {
  id: 'inclineWalk', name: 'Incline Walk', kind: 'incline-walk', minutes: 20, demo: 'treadmill',
  details: ['15% incline, 3.0 mph', 'Hands off the rails, tall posture', 'Nasal breathing pace'],
};

export const CARDIO: Record<string, CardioBlock> = {
  inclineWalk: INCLINE_WALK,
  bikeIntervals: {
    id: 'bikeIntervals', name: 'Bike Intervals', kind: 'bike-intervals', minutes: 25, demo: 'bike',
    intervals: { rounds: 10, hard: 30, easy: 90 },
    details: ['3 min easy warm-up', '10 rounds: 30 s hard, 90 s easy', '2 min cool-down'],
  },
  easyCardio: {
    id: 'easyCardio', name: 'Easy Walk or Bike', kind: 'easy', minutes: 50, range: [40, 60], demo: 'treadmill',
    details: ['40 to 60 min, conversational pace', 'Incline walk or easy bike', 'Counts toward daily steps'],
  },
};

const s = (exerciseId: string, sets: number, reps: [number, number], rest: number, extra: Partial<import('./types').ExerciseSlot> = {}) => ({
  exerciseId, sets, reps, rest, tempo: BASE_TEMPO, ...extra,
});

export const DAYS: DayPlan[] = [
  {
    key: 'upperA', weekday: 1, title: 'Upper A', subtitle: 'Chest, back, shoulders', kind: 'strength', art: 'upper',
    slots: [
      s('inclinePress', 4, [8, 12], 90),
      s('chestSupportedRow', 4, [10, 12], 90, { tempo: SQUEEZE }),
      s('pullover', 3, [12, 15], 60),
      s('inclineFly', 3, [12, 15], 60),
      s('lateralRaise', 3, [15, 15], 60, { superset: 'A' }),
      s('inclineReverseFly', 3, [15, 15], 60, { superset: 'A' }),
    ],
    cardio: [INCLINE_WALK],
    notes: ['Stop every set 1 to 2 reps short of failure.'],
  },
  {
    key: 'lowerA', weekday: 2, title: 'Lower A', subtitle: 'Single-leg strength, glutes, abs', kind: 'strength', art: 'lower',
    slots: [
      s('bulgarian', 4, [8, 12], 90),
      s('singleLegRdl', 3, [10, 12], 75),
      s('stepUp', 3, [10, 10], 75),
      s('hipThrust', 3, [12, 15], 75, { tempo: SQUEEZE }),
      s('weightedCrunch', 3, [12, 15], 45, { tempo: SQUEEZE }),
    ],
    cardio: [INCLINE_WALK],
    notes: ['Reps are per leg on single-leg moves. Do all reps on one side, then switch.'],
  },
  {
    key: 'bike', weekday: 3, title: 'Conditioning', subtitle: 'Bike intervals and sauna', kind: 'conditioning', art: 'cardio',
    slots: [], cardio: [CARDIO.bikeIntervals], sauna: 20,
    notes: ['Hard = about 8 to 9 out of 10 effort. Easy = genuinely easy.', 'Hydrate well before the sauna.'],
  },
  {
    key: 'upperB', weekday: 4, title: 'Upper B', subtitle: 'Shoulders, back, arms, chest', kind: 'strength', art: 'upper',
    slots: [
      s('seatedPress', 4, [8, 12], 90),
      s('oneArmRow', 4, [8, 12], 75, { tempo: SQUEEZE }),
      s('inclineCurl', 3, [10, 15], 60, { superset: 'B' }),
      s('overheadExtension', 3, [10, 15], 60, { superset: 'B' }),
      s('lateralRaise', 3, [15, 20], 45),
      s('flatPress', 3, [10, 15], 75, { dropSetOnLast: true }),
    ],
    cardio: [INCLINE_WALK],
    notes: ['Reps are per arm on the one-arm row.'],
  },
  {
    key: 'lowerB', weekday: 5, title: 'Lower B', subtitle: 'Hinge, lunge, squat, abs', kind: 'strength', art: 'lower',
    slots: [
      s('rdl', 4, [8, 10], 90),
      s('reverseLunge', 3, [10, 10], 75),
      s('gobletSquat', 3, [15, 15], 75),
      s('reverseCrunch', 3, [15, 15], 45, { tempo: SQUEEZE }),
    ],
    cardio: [INCLINE_WALK],
    notes: ['Reps are per leg on reverse lunges.'],
  },
  {
    key: 'easy', weekday: 6, title: 'Easy Cardio', subtitle: '40 to 60 min walk or bike', kind: 'conditioning', art: 'cardio',
    slots: [], cardio: [CARDIO.easyCardio],
    notes: ['Keep it easy enough to hold a conversation.'],
  },
  {
    key: 'off', weekday: 0, title: 'Rest Day', subtitle: 'Off and sauna', kind: 'rest', art: 'recovery',
    slots: [], cardio: [], sauna: 20,
    notes: ['Walk to hit your steps. Prep food for the week.'],
  },
];

export const HABITS: Habit[] = [
  { id: 'kcal', label: 'Calories', target: '2,300 to 2,500 kcal', detail: 'Same range every day' },
  { id: 'protein', label: 'Protein', target: '170 to 200 g', detail: 'About 40 g per meal' },
  { id: 'steps', label: 'Steps', target: '8,000 to 10,000', detail: 'Walks count, incline walks too' },
  { id: 'sleep', label: 'Sleep', target: '7 to 8 hours', detail: 'Lights out on time for 5 a.m. starts' },
];

export const dayByKey = (key: string) => DAYS.find((d) => d.key === key)!;
export const dayForWeekday = (weekday: number) => DAYS.find((d) => d.weekday === weekday)!;
