# Visual upgrade: progress log

A checkpoint file so this work can resume cleanly if a session is cut off.
Rules for the whole job: **visuals only** (question bank, answer checking, scoring,
boss HP, progression and timing are untouched), and the game is never left
half-edited: each checkpoint builds, passes the regression test and is committed.

## How to check a build

```bash
npm run arcade            # rebuild arcade/index.html
npm run arcade:regress    # play 81 scripted right/wrong answers and compare every
                          # HP, heart, score, nest egg, shield, wave, question and
                          # frame number against the pre-upgrade build
```

`arcade/backup/index.before-visual-upgrade.html` is the game exactly as it was
before this work (open it in a browser to compare). `regression-baseline.json`
next to it is the trace that build produces.

## Checkpoints

| # | Checkpoint | Status |
|---|---|---|
| 0 | Backup, regression test, "before" screenshots | done |
| 1 | The car | done |
| 2 | The bosses (a different cyborg for each of the 12) | done |
| 3 | World and events (traffic, Event Director, biomes, feedback) | done |
| 4 | Post-FX toggles, Reduced effects, quality tiers, performance | done |

## Done so far

- Checkpoint 0: backup copy saved; `scripts/arcade-regression.js` written and
  verified repeatable (two runs of the same build give identical traces; the final
  boss goes 200 > 180 on the first right answer).

- Checkpoint 1 (car): new module `src/js/21b-racercar.js`. Chamfered, bolted armor
  in layers; bull bar, winch, headlights; hood scoop and vents; armored pillars and
  roof; seven-slat louvred rear window; working roof light bar (amber chase under
  1 Hz per lamp); ducktail wing with mint lip; segmented tail lamps that brighten
  under braking; tubular rear guard; twin exhausts that glow after a boost with heat
  haze behind them (a new `GFX.heatAt` in the final pass); five-spoke pale rims,
  treaded tyres, brake discs that glow, calipers; mint under-glow; headlight shafts;
  tyre spray; contact shadow on the road. The body rides on springs (heave, roll in
  lane changes, squat under boost, dive under braking) over wheels that stay on the
  road and spin. Regression: identical. Software-render fps test (no GPU, phone
  size): 94 fps in the worst second.

- Checkpoint 2 (bosses): new module `src/js/22b-cyborg.js`. One armor kit (chamfered
  plates, bolts, pistons, cables, servo elbows, vents, panel-line shader, glow
  channels) builds twelve different cyborgs from the table `CYBORGS`: a salesman in a
  plated suit with a briefcase, a horned brute, a hooded one-eyed wraith with a vault
  in its chest, a many-eyed scribe with quill arms, a slab golem, a boiler with its
  gauge in the red, a crowned skeleton with an hourglass heart, a judge in robe and
  wig with a gavel, a masked puppeteer, a toll booth on tracks, a half-bone half-steel
  phantom with a cleaver, and the hulking Examinator. `CyborgRig.update` drives idle
  (breathing, head scan, servo twitches), the attack wind-up, hit recoil, three
  damage stages (plates crack, then are shot off and fall, baring circuitry; an arm
  fails at half health), rage (aura, steam, faster pulse), the entrance (drops in
  dark and folded, lands, powers up, eyes ignite) and defeat. A soft shadow sits
  under it on the mirror floor. It only reads the fight (HP, charge, state).
  Regression: identical.

- Checkpoint 3 (world): `src/js/09b-director.js` is the Event Director (an event
  every 3 to 8 s from a shuffled bag; slower and quiet-only while a question is up).
  `src/js/21c-racerworld.js` adds traffic (sedan, truck, bus, bike, hover car, patrol
  cruiser, rival racer as instanced meshes: our way on the right service lane,
  oncoming on the left, hover lanes overhead; lane changes with indicators, brake
  lights, a breakdown on hazards, parting on a right answer, soft shadows), five
  biomes by career year (downtown 25-31, tunnel, coast, desert, tunnel, mountain,
  tunnel, downtown at night) swapped behind a fog bank, each with its own scenery
  and palette, and 17 events: meteors, fireworks, lightning, explosion, ufo, blimp,
  helicopter, drones, lasers, birds, maglev, near-miss, rival, chase, breakdown,
  squall, steam-burst. The road shader gained service lanes and rain rings.
  A 60 s capture fired 16 events of 9 kinds and showed 6 vehicle kinds.
  Regression: identical.
- Checkpoint 4 (code): Setup has Quality (Auto/Low/Med/High), Reduced effects and
  eleven effect switches (`GFX.applySettings`, `GFX.opt`, `GFX.calm`). Flashes are
  rate-limited to three a second and every periodic flicker is under 3 Hz. A wrong
  answer glitches the picture (`GFX.glitch`); a boss hit pulses the arena's lights.

- Checkpoint 4 (measured): the car's fine detail (bolts, treads, fittings) and
  unused traffic slots are skipped on the weakest quality levels (LOD), after the
  first measurement showed the new car cost a third of the frame there. City
  events were moved into the visible air above the street. Final numbers on the
  no-GPU software test at 390x844 with the auto scaler, worst second: racer 91 fps,
  boss 94, blaster 109, hub 111. With High forced on that software renderer:
  racer 11 fps, boss 17 (no GPU; not a phone measurement). 60 s captures: 17 events
  of 10 kinds (coast), 17 of 9 kinds (downtown), 6 vehicle kinds. Full walkthrough:
  no console errors. Regression: identical.

## Next

- Nothing open. Ideas not done: a toll plaza and sign gantries across the main
  road (they would compete with the question gates), ambient events in the boss
  arena and Risk Blaster (the arena reacts to hits instead), real-phone fps.

## Known issues

- High quality has only been measured on a software renderer (no GPU here).


# Arcade upgrade (second pass): progress log

Scope: title, hub, Risk Blaster, Final Exam, Memory Bank, Strategy Guide, shared
audio. Nest Egg Run and Boss Rush were done in the pass above. Same rules: look,
sound and feel only; never half-edited; a checkpoint commit after each screen.

`arcade/backup/index.before-arcade-upgrade.html` is the game before this pass.
`npm run arcade:regress` now also plays Memory Bank (card grades and boxes) and a
50-question Final Exam (and fails if any hint shows before submit), and compares a
hash of every saved item and of all saved progress; the baseline is still the
build from before any visual work (153 answers in 8 games).

| # | Checkpoint | Status |
|---|---|---|
| A0 | Backup, extended regression test, before shots | done |
| A1 | Title screen | next |
| A2 | Arcade hub | todo |
| A3 | Risk Blaster | todo |
| A4 | Final Exam, Memory Bank, Strategy Guide | todo |
| A5 | Shared audio, measurements, report | todo |
