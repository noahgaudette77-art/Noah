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
| A1 | Title screen | done |
| A2 | Arcade hub | done |
| A3 | Risk Blaster | done |
| A4 | Final Exam, Memory Bank, Strategy Guide | done |
| A5 | Shared audio, measurements, report | done |

- A1 (title): `09c-ambient.js` is the shared sky kit (meteors, fireworks, lightning,
  explosion, UFO, blimp, helicopter, drones, lasers, birds), moved out of the racer
  world so any scene can use it. `10b-titlecity.js` builds the title's city, laid out
  to the screen's shape: megatowers with neon conduits, rolling ads and flickering
  signs, a suspension bridge across the sun, traffic as GPU-animated light in ten
  lanes, searchlights, and its own events (maglev on the bridge, patrol chase,
  hover cars passing overhead). Event Director every 3-6 s: a 60 s capture fired 14
  events of 12 kinds. Grid lines carry running pulses, the sun breathes, haze drifts.
  Logo: extruded depth, glow, a glint every 7 s. Fixed: the tip sits on a plate (grid
  line no longer crosses it); the sync toast drops below the MASTERY row.
- A2 (hub): `11b-hubextras.js`. Each cabinet has its own build on the shared body:
  Risk Blaster (swept fins, rocket pods, radar dish, antenna, twin sticks), Nest Egg
  Run (steering wheel, shifter, rear wing, light bar, tyres, chequer strip), Boss Rush
  (horns, spiked shoulders, teeth, red eye strip, slam button), Memory Bank (vault
  wheel and bolts, dial, coin stacks, gold trim), Final Exam (clock, laurels, answer
  sheet, pencil), Strategy Guide (book stacks, open book, reading lamp, ribbons); a
  drawn emblem each side of every marquee. Room: jukebox with equaliser, claw machine
  with a moving claw, dance pads, ticket printer, hoops, drinks machine and steam
  grate, four ceiling fans, a cleaning robot, five walking silhouettes, and a band of
  windows on the city with air traffic (10 props checked moving). Selecting a cabinet
  powers it up (flare, sparks, screen surge, a sound). The camera pulls back and
  rises while it travels between cabinets (a spring, no overshoot).
  Crisp text: marquee atlas and attract screens are drawn at twice the resolution,
  and the scene's depth buffer is now 24-bit (`04-gfx.js`): the old 16-bit one striped
  every screen and sign a few millimetres off a wall, in every scene, on phones too.
  Software test (auto scaler, worst second): hub 106 fps, racer 85, boss 107, title 62.
  Known: title's worst second is close to 60 on the software test (average 133).
- A3 (Risk Blaster): `20b-blasterjet.js` is the fighter: a twin-engine delta with
  canards and canted fins (layered armour, faceted glass canopy, lit intakes, wing
  strips, fences and missile rails, working ailerons, afterburners with shock
  diamonds and heat haze, wingtip contrails, a hexagon-lattice shield that flares
  when a shield is lost). The game still owns its position and aim; a rig inside
  banks with the pointer, kicks back when the guns fire, waggles after a hit and
  rolls once through the warp. `20c-blasterworld.js`: the answers ride holo-drones
  (four airframes, one per slot, round the old glowing core and letter badge); the
  corridor gains heavy ribs with energy pylons, light conduits, tumbling asteroids,
  laser chords, station blocks beyond the wall, and a director (patrol of escort
  drones, comet, power surge, scan ring, capital ship, buoy; flak between questions
  only); each wave has a carrier holding station above the lanes (three hull forms):
  a miss draws a bolt at the shield, a cleared wave blows it up. Combo: a seven-pip
  meter in the HUD that fills and warms; the engines burn longer and bluer, the
  strips and shield brighten. New cues: whoosh, shield, combo.
  A 60 s capture at level 7/8 fired 9 events of 6 kinds, no errors. Software test at
  the lowest level: same as the build before this checkpoint when run back to back
  (ribs and the idle shield are not drawn at the three weakest levels).
  Note: the software test machine ran about 25% slower from this point on (the A2
  build re-measured at 77 fps worst second in Risk Blaster, 102 an hour earlier), so
  compare numbers within a checkpoint, not across.
- A4 (Final Exam): `24b-examhero.js`. The cup is replaced by the Keystone: a faceted
  crystal spire with runes inside, held in three gold claws on a foot set with eleven
  gems, an armillary of three gold rings each carrying a bead of light, a laurel
  wreath floating over the tip, and a halo of orbiting motes. It fills with light
  from the foot up as questions are ANSWERED (the count only: it is never told which
  were right), more motes join, the gems warm. The hall gains an aurora over the
  night sky, paper lanterns rising past the windows and moonbeams that sway. All
  motion is slow and continuous: no events, no flashes. The regression test still
  finds 0 hint marks before submit.
- A4 (Memory Bank): `23b-memoryworks.js`. Twelve meshing gears round the dial (they
  spin on at each deposit, jerk back on a miss), an arc of deck lamps over the door
  (one per card: banked lit, the next one breathing, the dark ones wash red on a
  miss), lamp panels on the wall, coin stacks by the bullion, a lock sound when the
  coin lands. A banked card now shrinks away up into the coin slot; a missed one tips
  and drops back toward the deck (same 260 ms as before).
- A4 (Strategy Guide): `31b-library.js` is a new scene behind the guide: a vaulted
  aisle of bookshelves on two tiers (spines, gilt bands and glowing holo-books drawn
  in the shader), hanging lamps, four holo-books open on lecterns with text running
  up their pages, a rolling ladder, loose pages adrift, dust, a rose window. The
  index shows it through one framed window above the list; everything that is read
  sits on solid ground. With a chapter open the scene slows to a fifth.
  Software test, lowest level, worst second: memory 73 fps (75-81 before), exam 73
  (79 before), guide 103.
- A5 (shared): the fighter has an engine hum that rises with the combo and the warp
  (it stops on pause and game over). Master mute, the arcade-floor bed, UI blips,
  whooshes and coin sounds were already there; this pass added power-up, lock, page,
  whoosh, shield and combo cues. Two costs found by the final measurements and
  fixed: the title logo's glint repainted the whole glowing logo every frame while
  it crossed (now a slanted window sliding over a fixed white copy of the letters:
  two layers move, nothing repaints), and the hub's six attract screens redraw half
  as often at the three weakest quality levels.
  Final state: regression IDENTICAL (153 answers in 8 games, 0 hint marks before
  submit); walkthrough of every screen on a phone-sized window: no console errors,
  no horizontal overflow.
  Software renderer, phone-sized window, auto scaler (it sits at its lowest level
  here, so these are floors, not phone measurements), average / worst second:
  title 123 / 108, hub 126 / 111, Risk Blaster 95 / 85, Nest Egg Run 85 / 71,
  Boss Rush 118 / 98, Memory Bank 128 / 105, Final Exam 118 / 100, guide 140 / 118.
  The build from before this pass, same machine, same hour: title 176 / 110,
  hub 135 / 105, Risk Blaster 129 / 112, Nest Egg Run 87 / 75, Boss Rush 110 / 95,
  Memory Bank 125 / 107, Final Exam 119 / 105.

## Known issues and what was not done (second pass)

- Not measured on a real iPhone: frame rate, tilt, speech. The numbers above are a
  software renderer, which is far slower than a phone GPU.
- Risk Blaster's ribs and the idle shield bubble are not drawn at the three weakest
  quality levels; the fighter, drones, carrier and conduits always are.
- The Final Exam has no event director on purpose (calm and consistent); its motion
  is continuous only.
- Memory Bank's lamp panels on the wall only show on wide screens.

# The exam boss (third pass): progress log

Request: use the supplied 3D model as the final boss, standing in the Final Exam in
place of the trophy; on a pass it dies (a death animation, then an explosion).

`arcade/backup/index.before-exam-boss.html` is the game before this pass.

| # | Checkpoint | Status |
|---|---|---|
| B0 | Backup, convert the model, inline it in the build | done |
| B1 | The boss in the exam hall (skeleton, materials, idle, staging) | done |
| B2 | The ending: death and explosion on a pass, a last stand on a fail | done |
| B3 | Regression, other paths, frame rate, docs | done |

- B0: the model is a Tripo-generated .glb (32 separate parts, 13,944 vertices, 12,243
  triangles, one 4096 px colour texture, no rig, no animation). `scripts/convert-boss.js`
  turns it into `arcade/assets/boss/boss.bin` (267 KB: 16-bit positions per part, byte
  normals, 16-bit UVs and indices) and `albedo.jpg` (1024 px, 510 KB);
  `scripts/build-arcade.js` inlines both as base64 (`window.INR_ASSETS`), so the page
  is still one file (2.7 MB, was 1.65 MB). The original .glb is not in the repo.
- B1: `24c-examboss.js`. The 32 parts hang on a 19-joint skeleton (hips, chest, head,
  pauldrons, back pylons, arms, forearms, hands, thighs, shins, feet); each frame the
  hips are placed so the feet (or, kneeling, the knees) stay on the dais. Two coals
  burn in the skull's sockets. It replaces the Keystone monument on a wider, lower
  dais; the camera frames it in the band. Idle only while the exam runs: breathing, a
  slow look round, the weight of the arms. Nothing reads the answers.
- B2: after submit only (the mark is already worked out and saved). Pass, 9.4 s:
  struck; five joints blow in turn (sparks, a gout of fire, smoke from then on; the
  right pauldron and the left pylon are torn off and fall as their own bodies); an arm
  goes limp; it drops to its knees; the reactor runs away (the armour glows, light rays
  pour out, the head goes back); the blast (every remaining part is cut into 2-12
  fragments, about 200 in all, each thrown from the reactor with its own spin and the
  moment it meets the dais or the hall floor, all in one draw call; a fireball of
  noise-shaped puffs that burn down to smoke; a smoke column; a ring of dust and a ring
  of light across the floor; two shock rings; nine streamers; three bursts of sparks;
  two secondary blasts; a scorch; the skull thrown clear toward the camera). Fail,
  2.9 s: it squares up, eyes blazing, and stays. Cinema bars, a SKIP button (Enter or
  Escape too), the exam's panels fade out. Reduced effects: no shake, flash or hit-stop
  and half the sparks. Reduced motion: a still version (about 1.7 s).
  Flashes: joint pops are at least 0.5 s apart; the blast is one flash; the two
  secondaries come 0.5 and 1.05 s later.
- B3: `npm run arcade:regress` plays the ending in full (571 frames) and holds its wall
  clock through it; result IDENTICAL to the original build (153 answers in 8 games,
  every saved byte, 0 hints before submit). Skip, reduced motion, reduced effects, fail
  and replay all reach the results with no errors.
  Software renderer, lowest level, exam: 104 fps average, 91 worst second (117-121 /
  101-107 before the boss). Through the death and explosion: 92 average, 62 worst
  second. The boss is drawn one-sided while it idles (two-sided cost 20 fps there) and
  switches to a two-sided twin, compiled with the scene, when the ending starts.

Known and not done: not measured on a real iPhone. Boss Rush's final boss (the
Examinator cyborg) is unchanged: the model was put in the Final Exam, as asked. The
hub's Final Exam marquee still carries its trophy emblem.
