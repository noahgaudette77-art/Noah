// Our exercise ids -> MuscleWiki exercise ids. Only our own mapping lives here: names, steps and video
// URLs are fetched at runtime through the token Worker (MuscleWiki terms: no hosting of their media,
// metadata cached no longer than 30 days). See ASSETS.md §A for how each match was chosen.
import type { Cue } from './types';

export type Match = 'exact' | 'close';

export interface MwDemo {
  mwId: number;
  /** MuscleWiki's own exercise name, shown under the video (refreshed from the API at runtime) */
  mwName: string;
  match: Match;
  /**
   * For close variants: form cues rewritten to describe the video that is actually shown,
   * replacing the program's original wording wherever the video is on screen.
   */
  cues?: Cue[];
  mistake?: string;
}

export const MW: Record<string, MwDemo> = {
  inclinePress: { mwId: 398, mwName: 'Dumbbell Incline Bench Press', match: 'exact' },
  chestSupportedRow: { mwId: 435, mwName: 'Dumbbell Laying Incline Row', match: 'exact' },
  pullover: { mwId: 413, mwName: 'Dumbbell Pullover', match: 'exact' },
  inclineFly: { mwId: 399, mwName: 'Dumbbell Incline Chest Fly', match: 'exact' },
  lateralRaise: { mwId: 20, mwName: 'Dumbbell Lateral Raise', match: 'exact' },
  inclineReverseFly: { mwId: 407, mwName: 'Dumbbell Laying Reverse Fly', match: 'exact' },
  bulgarian: { mwId: 317, mwName: 'Dumbbell Bulgarian Split Squat', match: 'exact' },
  singleLegRdl: {
    mwId: 462, mwName: 'Dumbbell Single Leg Stiff Leg Deadlift', match: 'close',
    cues: [
      { text: 'A dumbbell in each hand at your sides. Weight on one leg; the other foot rests lightly just behind you for balance.' },
      { text: 'Soft bend in the standing knee that does not change.' },
      { text: 'Push the hips back and lower the dumbbells down the front of the standing leg for 3 s, back flat, until the hamstring stretches.' },
      { text: 'Drive the hips forward to stand tall in 1 s. All reps on one leg, then switch.' },
      { text: 'Neutral spine: ribs down, back flat from tailbone to head. Hinge at the hips, never round the lower back.', priority: true },
    ],
    mistake: 'Squatting down with a bent knee or rounding the back to reach the floor; the stretch should be in the hamstring.',
  },
  stepUp: { mwId: 1193, mwName: 'Dumbbell Step Up', match: 'exact' },
  hipThrust: { mwId: 286, mwName: 'Dumbbell Hip Thrust', match: 'exact' },
  weightedCrunch: { mwId: 563, mwName: 'Dumbbell Crunch', match: 'exact' },
  seatedPress: { mwId: 45, mwName: 'Dumbbell Seated Overhead Press', match: 'exact' },
  oneArmRow: {
    mwId: 456, mwName: 'Dumbbell Single Arm Row', match: 'close',
    cues: [
      { text: 'Free hand on the bench, both feet on the floor in a wide staggered stance, the working-side leg back.' },
      { text: 'Hinge forward until your torso is well inclined toward the floor, back flat, dumbbell hanging straight down.' },
      { text: 'Row the dumbbell toward your hip in 1 s, elbow close to your side; squeeze the shoulder blade back.' },
      { text: 'Lower for 3 s to a full stretch. All reps on one arm, then switch.' },
      { text: 'Neutral spine: ribs down, back flat from tailbone to head. Hinge at the hips, never round the lower back.', priority: true },
    ],
    mistake: 'Twisting the torso open to heave the weight up instead of pulling with the back.',
  },
  inclineCurl: { mwId: 1530, mwName: 'Dumbbell Incline Curl', match: 'exact' },
  overheadExtension: { mwId: 16, mwName: 'Dumbbell Seated Overhead Tricep Extension', match: 'exact' },
  flatPress: { mwId: 377, mwName: 'Dumbbell Bench Press', match: 'exact' },
  rdl: { mwId: 291, mwName: 'Dumbbell Romanian Deadlift', match: 'exact' },
  reverseLunge: { mwId: 414, mwName: 'Dumbbell Reverse Lunge', match: 'exact' },
  gobletSquat: { mwId: 11, mwName: 'Dumbbell Goblet Squat', match: 'exact' },
  reverseCrunch: {
    mwId: 1533, mwName: 'Laying Bent Leg Raise', match: 'close',
    cues: [
      { text: 'Lie on your back, arms flat on the floor out to the sides, knees bent.' },
      { text: 'Bring the knees up toward the chest and curl the hips just off the floor; no swinging.' },
      { text: 'Squeeze 1 s at the top.' },
      { text: 'Lower for 3 s until the feet nearly touch the floor, then go again.' },
    ],
    mistake: 'Swinging the legs instead of curling the pelvis up.',
  },
};

/** Form cues to show beside an exercise: the variant's wording when its video is the one on screen. */
export function cuesFor(id: string, base: { cues: Cue[]; mistake: string }, showingVideo: boolean) {
  const v = MW[id];
  if (showingVideo && v?.cues) return { cues: v.cues, mistake: v.mistake ?? base.mistake };
  return { cues: base.cues, mistake: base.mistake };
}
