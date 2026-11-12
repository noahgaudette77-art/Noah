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
| 3 | World and events (traffic, Event Director, biomes, feedback) | next (code written, not yet wired in) |
| 4 | Post-FX toggles, Reduced effects, quality tiers, performance | todo |

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

## Next

- Checkpoint 3: `src/js/09b-director.js` (Event Director) and
  `src/js/21c-racerworld.js` (traffic, five biomes, 18 events) are written but not
  yet called from `21-racer.js`. To wire in: create `this.world = new RacerWorld(this)`
  after `makeCar()` in `build3D`, call `this.world.update(dt, sp, step, sky)` at the
  end of `updateLook`, add `GFX.glitch`, the side lanes and rain ripples (`uRain`)
  to the road shader, and use `this.world.cityFog` for the skyline's fog.

## Known issues

- None yet.
