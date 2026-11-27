# Tempo

A mobile-first, offline-capable workout app for a 12-month dumbbell fat-loss and muscle program
(start Mon 2026-11-30). Every exercise has a looping animated demo of one original character,
rendered live from a rigged skeleton, next to its sets. Visual direction and rationale: `DESIGN.md`.

Highlights: immersive workout mode (swipe between exercises, 3-2-1 countdown, tempo ring that paces each
rep, full-screen rest with the number to beat, PR moment, session summary card as PNG), streaks, weekly
rings, Day X of 365, consistency score, a 24% to 12% milestone path, four target-physique builds and a
Sunday review.

Vite + React + TypeScript + Tailwind + Framer Motion + Recharts. Static build, installable PWA,
data in `localStorage` with JSON export/import.

## Install on your phone

The built app is committed in the repo's `/docs` folder and served by GitHub Pages:
**https://noahgaudette77-art.github.io/Noah/**

1. One-time: on GitHub, open the repo, then **Settings > Pages**. Under *Build and deployment*, set
   Source to **Deploy from a branch**, pick the branch that holds `/docs`, choose folder **/docs** and Save.
2. Open the address on your phone. iPhone (Safari): **Share > Add to Home Screen**. Android (Chrome):
   **menu > Install app**.
3. Open it once while online; after that it works offline.

To publish a new version: `cd workout && npm run deploy:pages`, then commit and push `docs/`.

## Run

```bash
cd workout
npm install
npm run dev          # http://localhost:5173
npm test             # program logic, motivation and rig form checks (145 tests)
npm run build        # type-check + production build into dist/
npm run preview      # serve dist/ on :4318
```

Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, S3). Paths are relative
(`base: './'`) and routing is hash-based, so it works from a sub-folder with no server rewrites.

### QA scripts (need a build first; use the pre-installed Playwright + Chromium)

| Command | Output |
|---|---|
| `npm run contact-sheet` | `shots/contact-sheet.png`: 3 frames of every demo with measured joint angles and PASS/FAIL form checks. `node scripts/contact-sheet.mjs rdl,bulgarian out.png` renders a subset. |
| `npm run screenshots` | every screen at 390x844 and 1440x900 into `shots/` (seeds 2 weeks of sample data) |
| `npm run a11y` | axe-core WCAG 2.1 AA audit of each screen + keyboard walk |
| `npm run poses` | prints joint angles for every keyframe in the terminal |
| `OUT=shots/x npm run screenshots` | write a screenshot round to another folder (used for before/after) |

## Layout

```
src/data/program.ts     THE PROGRAM: exercises, cues, schedule, cardio, habits, projection
src/data/types.ts       types for the program and logged data
src/logic/              schedule, progression engine, time estimates, body math, storage,
                        motivation (streak, rings, consistency, milestones, PRs, weekly review)
src/rig/                the character rig
  skeleton.ts           body proportions (cm) and joint limits
  solve.ts              trunk FK, 2-bone IK/FK for limbs, joint-angle metrics
  timeline.ts           keyframe interpolation and tempo-driven phases
  render.ts             orthographic camera, depth-sorted SVG primitives, character + equipment
  demos.ts              keyframe poses for every exercise (+ form checks)
  DemoPlayer.tsx        loop, phase label, play/pause, 0.5x, replay, reduced-motion fallback
src/workout/            countdown, tempo ring, rest screen, PR moment, cardio timers
src/screens/            Today, Workout, Summary, ExerciseDetail, Week, History, Body (Progress), Settings
```

## How the demos work

The character is a 3D skeleton (named joints: neck, lumbar/thoracic spine, shoulders, elbows,
wrists, hips, knees, ankles) drawn as SVG. Each frame it is posed, projected with an orthographic
camera at the exercise's angle (side, 3/4 or front) and painted back to front.

A keyframe `Pose` sets the pelvis position, trunk pitch, spine flexion and neck, and drives each
limb in one of four ways:

- `{ p }`: IK to a world point (planted feet and hands never slide)
- `{ dir, reach }`: IK to a point relative to the shoulder/hip (interpolates along an arc: raises, flies)
- `{ upper, flex, bend }`: plain FK by joint angle (curls, triceps extensions)
- `{ attach: 'pelvis' | 'chest', off }`: hands fixed to the body (goblet, hip-thrust dumbbell)

Phases have roles (`down`, `up`, `top`, `bottom`), so the loop follows the tempo: 3 s lowering by
default, 4 s and a 2 s pause when progression moves to those stages.

## How to add an exercise

1. **Program** (`src/data/program.ts`): add an entry to `EXERCISES` (name, muscles, 3–4 cues, one
   common mistake, harder variation, load type, starting weight). Hinge/lunge moves get a cue with
   `priority: true` that starts with "Neutral spine". Then add a slot to a day in `DAYS`
   (sets, rep range, rest, optional `superset` letter or `dropSetOnLast`).
2. **Demo** (`src/rig/demos.ts`): write a function returning a `DemoSpec` with the same `id`:
   camera yaw, props (`bench` with `back` angle, `mat`, ...), `hold` (`pair`, `right`, `twoHand`,
   `none`), 2–4 named poses, the phases, `keyframes` for the reduced-motion view, `checks` (e.g.
   `{ pose: 'bottom', metric: 'kneeR', min: 80, max: 100, note: 'Front knee about 90 degrees' }`)
   and `planted` joints. Add it to the `DEMOS` list at the bottom.
3. Run `npm run poses` to tune angles, then `npm test`. The tests check your form checks, that IK
   targets are reachable, that nothing sinks into the floor and that planted joints stay put across
   the loop.
4. `npm run build && npm run contact-sheet` and look at the frames.

Available metrics: `trunk`, `spine`, `lumbar`, `neck`, `pelvisY`, `neckBaseY`, and per side
(`R`/`L`): `knee`, `elbow`, `hip`, `shoulder`, `thigh`, `shin`, `handY`, `kneeY`, `hipBelowKnee`,
plus `flareR`.

## Program logic

- **Progression**: when every working set reaches the top of the rep range with 1+ reps in reserve,
  the next session adds 5 lb (per hand). At 50 lb (or for bodyweight moves) it walks the ladder:
  4 s lowering, then a 2 s pause at the stretch, then one extra set, then the harder variation.
  An exercise on two days (lateral raise) progresses separately per day because its rep ranges differ.
- **Time estimate**: reps × tempo + setup + rest + transitions. With 3 s lowering the lifting part
  is ~34–50 min, so strength days run about 54–70 min including the 20 min walk.
- **Body**: 7-day average vs a projection that holds lean mass at ~171 lb (225 lb × 76%): 22% at
  month 1, 19% at 3, 15.5% at 5, 12% at 9. After day 28, if the 7-day average is down less than
  2 lb versus four weeks earlier, the rule card says to cut ~150 kcal or add ~2,000 steps.

## Assets

- `public/art/*.webp`: lighting plates generated with fal.ai (FLUX 1.1 Pro), no people.
- `public/media/haze.*`: the Today hero loop, fal.ai Kling image-to-video from `art/stage.webp`,
  encoded as a seamless 10 s ping-pong (webm + mp4) with a poster.
- `public/sfx/*.mp3`: UI sounds (set logged, rest over, tempo ticks, 3-2-1, PR) from the ElevenLabs
  sound-effects API. Tempo ticks and the countdown follow the "Tempo ticks" setting, off by default.
- Icons: Phosphor (bold weight). The character, stage and equipment are hand-built SVG.
