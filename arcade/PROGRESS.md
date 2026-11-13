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

# The exam boss, reworked (fourth pass): progress log

Request: "the boss is kind of blurry and small and not intimidating and not
immersively scary". Look, staging, behaviour and sound only; the exam's rules, marks,
timers and saved data are untouched.

`arcade/backup/index.before-boss-rework.html` is the game before this pass.

| # | Checkpoint | Status |
|---|---|---|
| C1 | Bigger, sharper, darker, alive (framing, surface detail, lighting, behaviour, sound) | done |
| C2 | Regression, other paths, frame rate, walkthrough, docs | done |

- Why it was small and soft. The whole body was framed in the band between the
  question and the answers, so the face was about 25 px tall; phones drew the scene at
  1.5x; the texture was 1024 px; a bright shaft of light stood in front of it. The
  model's own 4096 px texture was checked at full size: it has no fine detail to give
  (soft gradients), so sharpness had to come from somewhere else.
- Size and framing. Nine units tall (was 6.2); the camera is close and low, under its
  chin, and the shoulders run off both sides of the screen. The head is about ten times
  larger on screen.
- Sharpness. A 512 px tile of scratches, pits, dents and grain (drawn once from a
  fixed seed) is laid on the armour from three sides; its slope bumps the normal, so
  the damage catches the light. Edges of plates are picked out. The texture is 2048 px
  and graded darker. The exam's picture is sharpened in the final pass (`post.sharpen`)
  with no colour fringe and fainter scan lines (`post.crisp`). On a phone the exam can
  draw at 2x instead of 1.5x (`post.pr`): two steps above the top quality level that
  the frame-rate watcher climbs and drops like levels and remembers per scene, so a
  phone that can't hold them is where it was before.
- Light. A cold lamp above, red and blue rims behind, a cold light from under it that
  turns red as the exam goes on; the armour reflects its own dark environment map. The
  skull stays bone-pale, so the eyes (white-hot points, a red halo, a streak of glare,
  their light on the bone done in the shader) are the brightest thing on screen. An
  ember beats in its chest. The vignette closes in with the same measure.
- Behaviour, all on its own clock. It wakes (kneeling in the dark, eyes light at
  0.55 s, it rises, a roar and a shake at 2.35 s), then looms: breathing, the head
  following the pointer or tilt, and a 16 s cycle of lean-in (with a growl), head tilt
  and claw flex. `dread` = the larger of answered/total and time used/time allowed:
  it hunches closer, the light reddens. `notice()` is the same small movement for
  every pick. Nothing reads whether an answer is right.
- Endings. A boss bar over both. Fail (3.6 s): roar, wind-up, a fist brought down at
  the camera (one flash, shake and hit-stop; none of those with Reduced effects), then
  a close glare. Pass: as before, with the hall's floor reflection switched back on.
- Sound: a low drone and breathing while it looms (off on pause and in the ending),
  and cues for the wake, roar, smash and growl. Synthesised; not auditioned by ear here.
- Cost. While the questions are up the floor's reflection pass is skipped (the floor is
  out of sight) and the scene has four point lights (the eye and fire lights were
  folded into the shader and into the light under it).
- C2 results. `npm run arcade:regress`: IDENTICAL to the original build (153 answers in
  8 games, every saved byte), 0 hints before submit, the ending played in full (571
  frames). Skip, reduced motion, Reduced effects, a fail and a replay all reach the
  results with no errors. Full walkthrough: no console errors, no horizontal overflow.
  Software renderer at its lowest level, exam, average / worst second, old and new
  builds back to back, two runs: 107 / 97 and 106 / 101 before, 108 / 104 and 106 / 98
  now. Through the pass ending: 86 / 67 before, 85 / 65 now. Through the fail ending:
  94 / 82. Forced to the top level on the same software renderer (a fill-rate test, not
  a phone): 19 fps before, 14 now at the same 1.5x (the boss now covers most of the
  screen), 9 at 2x, which is why the extra resolution is adaptive.
- The page is 3.4 MB (was 2.7 MB): the larger texture.

Known and not done: not measured on a real iPhone (frame rate at 2x, how the sounds
sit). The hub's Final Exam marquee still carries its trophy emblem.

# The space fighter (fifth pass): progress log

Request: replace Risk Blaster's jet with the supplied space fighter model, as
immersive and as well drawn as it can be, down to the details. Look and sound only;
the game's rules, scores, timers and saved data are untouched.

`arcade/backup/index.before-space-fighter.html` is the game before this pass.

| # | Checkpoint | Status |
|---|---|---|
| D0 | Backup, convert the model, inline it in the build | done |
| D1 | The fighter in the game (materials, cockpit, engines, guns, shield, motion, fly-in, break-up, light version) | done |
| D2 | Regression, walkthrough, frame rate, docs | done |

- D0: a Tripo-generated .glb (166 separate parts, 23,368 vertices, 15,212 triangles,
  one 8192 px colour texture and nothing else: no normal map, no rig, no animation).
  The converter is now `scripts/convert-model.js <model.glb> <boss|fighter>` (it was
  `convert-boss.js`); it writes `arcade/assets/fighter/fighter.bin` (431 KB) and
  `albedo.jpg` (2048 px, 795 KB: the texture is soft, and nothing visible is lost
  below 8192). `build-arcade.js` inlines every model in `arcade/assets/`; the decoder
  both models share is `src/js/08m-model.js`. The page is 5.06 MB (was 3.39 MB). The
  original .glb is not in the repo. Its nose is the pointed orange end and the two
  big barrels are its main engines, so it is turned to fly down the tunnel.
- D1: `src/js/20d-blasterfighter.js`, behind the same interface the old jet had (the
  game still places it, aims it and scores; the old jet is the stand-in if a build
  has no model).
  - Hull: one mesh. Paint and metal are read out of the colour texture (bright or
    saturated is a semi-gloss coat, dark grey is metal), and a change of brightness
    from one pixel to the next tilts the normal, so panel lines and rivets stand
    proud. It has its own reflection map (the tunnel's washed the white paint
    magenta), a soft fill, a rim in the wave's colour, an engine bay that glows,
    and the flash of its guns on the plating round them.
  - It flies tipped back 10 degrees toward the camera: seen level from behind, the
    model shows mostly its dark tail.
  - Cockpit: the canopy is real glass (clear head-on, a mirror at its edges) over a
    pilot (helmet, shoulders, seat) and a head-up display.
  - Engines: a white-hot disc and a flame with shock diamonds in each main nozzle,
    blue ion flames in the four pod thrusters (they flare with a roll), glows, heat
    haze, vapour trails off the wingtips, navigation lights, a beacon on the aerial.
  - Guns: the nose cannons and the wing-pod cannons take turns; the beams start at
    whichever fired.
  - Moments: it flies in from behind the camera at the start (1.6 s, with a whoosh);
    at warp it rolls, surges forward and pushes a bow wave of light; on its last
    shield one engine sputters and trails smoke and something shorts every few
    seconds; destroyed, it breaks into about 250 fragments of itself (the parts,
    the larger ones cut up) thrown, spun and shrunk in the vertex shader, with fire,
    smoke and a second blast.
  - The three weakest quality levels draw a lighter hull (3,032 triangles: the
    larger parts only, vertices merged on a grid 3% of the span wide) without pilot
    or display. Reduced motion: no fly-in, and it simply vanishes when destroyed.
    Reduced effects: no flash puffs, smoke or pointer banking.
- D2: `npm run arcade:regress`: IDENTICAL to the original build (153 answers in 8
  games, every saved byte; the Risk Blaster game in it runs to game over). Full
  walkthrough: no console errors, no horizontal overflow. Software renderer, Risk
  Blaster, average / worst second, old and new builds back to back: at its lowest
  level 121 / 105 with the old jet, 108 / 96 with the fighter (15,000 triangles cost
  the software renderer 3 ms; the lighter hull brings that to under 1); forced to the
  top level 45 / 17 and 50 / 16 (the same within noise).

Known and not done: not measured on a real iPhone. The hub's Risk Blaster cabinet
keeps its generic ship emblem.

# The space frogs (sixth pass): progress log

Request: the fighter should shoot at the supplied space frog instead of at forms, and
on a wrong answer the frog shoots back. Look and sound only: which target is which
answer, picking, timers, shields and scoring are untouched.

`arcade/backup/index.before-space-frogs.html` is the game before this pass.

| # | Checkpoint | Status |
|---|---|---|
| E0 | Backup, convert the model (decode, simplify, bake colours), inline it | done |
| E1 | Frogs as the targets; a frog fires back on a miss | done |
| E2 | Regression, walkthrough, frame rate, docs | done |

- E0: the .glb is one sculpted mesh, compressed with meshopt (gltfpack): 1,013,580
  vertices, 1,930,336 triangles, one 4096 px texture. No phone draws four of those,
  so `scripts/convert-model.js` gained a path for a sculpt: decode, weld by position
  (so UV seams don't hold the simplifier back), simplify to 6,980 triangles (and to
  1,192 for weak quality levels), and bake the texture onto the vertices (every
  original vertex gives its texel and normal to the nearest surviving vertex on its
  side of the surface). `arcade/assets/frog/frog.bin` is 103 KB with no texture.
  Decoding and simplifying use the `meshoptimizer` package (MIT); it is not a
  dependency of the repo: the script loads it from the path in MESHOPTIMIZER or from
  node_modules. The page is 5.21 MB (was 5.06 MB). The original .glb is not in the repo.
- E1: `src/js/20e-blasterfrogs.js`. A frog is what a target looks like; the game's
  target groups, positions, picking and timing are as they were (in a build without
  the model, the crystal forms in holo-drones come back).
  - One material per answer slot (the frog's own colours, a soft fill, a rim and a
    jet glow in the slot's colour). The vertex shader makes the sculpt breathe, turns
    its head about its neck and kicks its cannon back; nothing is rigged.
  - It hovers on two backpack jets, half turned toward the ship, its letter badge at
    its shoulder.
  - Right answer: inside the game's blast, the frog whites out and is eaten away by a
    noise with burning edges (0.42 s).
  - Wrong answer: a red ring where the shot glances off, then the frog swings its
    barrel onto the ship (the barrel points 49 degrees off its facing, so the body
    turns), croaks and fires six bolts 75 ms apart. The bolts come almost straight
    at the camera, so each is a ball of light, not a beam seen end-on. The first one
    home flares the ship's shield; each lands with a few sparks. The glow at the
    muzzle is one swell over the burst, not a flicker. The frog with the right
    answer glows green.
  - Too slow: the other frogs rush past as the targets always did, and the frog with
    the right answer does the firing.
  - The wave's carrier no longer fires on a miss; it still blows up when the wave is
    cleared.
  - Weak quality levels: the 1,192-triangle frog, unlit in its own colours (whiter
    when hit, greener when it was the right one). `GFX.twinOf` now lets a material
    bring its own plain version; the fighter's hull uses that too, for a version
    with the same soft fill. The frogs' shaders are in the scene's warm-up, so the
    first question compiles nothing.
- E2: `npm run arcade:regress`: IDENTICAL to the original build (153 answers in 8
  games, every saved byte). Full walkthrough: no console errors, no horizontal
  overflow. Software renderer, Risk Blaster, average / worst second, builds run
  alternately: at its lowest level 101-120 / 85-105 with the frogs over four runs
  and 101-111 / 85-101 without; forced to the top level 52 / 17 and 46 / 18.

Known and not done: not measured on a real iPhone; the frog's croak and cannon are
synthesised and were not auditioned by ear. Up close the 7,000-triangle frog is
visibly faceted (in play it is 60 to 150 px tall). The hub's Risk Blaster cabinet
keeps its old attract demo of coloured squares.

# One big frog (seventh pass): progress log

Feedback on the four frogs: "It needs to be 1 big turtle, not 4. So it's 1 component
that shoots at me when I'm wrong and I shoot at it when I'm right." (The creature is
the frog model supplied; it is called the frog here.) Look and sound only again: the
questions, the answer check, timers, shields and scoring are untouched.

`arcade/backup/index.before-big-frog.html` is the game before this pass (four frogs).

| # | Checkpoint | Status |
|---|---|---|
| F0 | Backup; convert the frog again with its real texture | done |
| F1 | One big frog as the wave's enemy | done |
| F2 | Regression, walkthrough, frame rate, docs | done |

- F0: one big frog is seen far closer than four small ones, and colours baked onto
  7,000 triangles' vertices would not hold up. The sculpt's texture has only 639
  charts, so the simplifier can keep its texture mapping (meshopt's
  simplifyWithAttributes, seams held together): `scripts/convert-model.js` now writes
  the frog at 19,994 triangles (and 3,232 for weak quality levels) with its own UVs,
  normals averaged from the sculpt round each kept vertex, and `albedo.jpg` at
  2048 px (632 KB; the texture has about 880 texels to the frog's height, and at its
  closest the frog is 450 to 600 px tall). The vertex-colour path is gone.
  `frog.bin` is 415 KB; the page is 6.48 MB (was 5.21 MB).
- F1: `src/js/20e-blasterfrog.js` (was 20e-blasterfrogs.js). With the frog model in
  the build the game makes no per-answer targets and no carrier; without it, both
  come back as they were.
  - Size: fitted to the band between the question and the answers, 80% of its
    height or width at its closest. It waits 22 units down the tunnel and has come
    to 14 when the question's time is up (the same clock that moved the targets),
    so it is always big and gets bigger.
  - Look: its texture; copper and leather, wet skin and cloth told apart by colour;
    relief from the texture's brightness; a rim in the wave's colour. It breathes,
    its throat works, its head follows the pointer or the phone's tilt, its eyes
    carry a glint.
  - Right answer: `pick()` now knows the answer is right before it fires (for the
    look only; `resolve()` checks and scores as before). The fighter fires fatter
    beams at the frog's chest; at resolve the frog whites out, yelps, and is knocked
    back 9 units with a lean and a twist, inside a smaller version of the game's
    blast (fewer sparks, a smaller ring, no white core, so it can be seen). Every
    hit scorches it a little more, and after two it smokes from its backpack.
  - Wrong answer: the fighter does not fire. The frog starts its attack at the
    pick: it turns until the barrel it carries across its body (57 degrees off its
    facing) points at the ship, keeps its head on the player, its eyes flare, it
    croaks and fires six bolts 75 ms apart. The first one home flares the shield.
  - Too slow: the same attack, from its closest.
  - Wave cleared: it is eaten away by a noise with burning edges inside a blast of
    the wave's colour; the next wave's frog flies up from the far dark 1.2 s later.
  - Answers are picked with the A to D buttons or the keyboard. Tapping the tunnel
    picked the nearest target; with one enemy there is nothing to choose there, so
    the hint now reads TAP YOUR ANSWER TO OPEN FIRE.
  - Weak quality levels: the 3,232-triangle frog with its texture unlit. Reduced
    motion: no fly-in, sway or head movement, a shorter recoil. Reduced effects: no
    flash puff, fewer sparks.
- F2: `npm run arcade:regress`: IDENTICAL to the original build (153 answers in 8
  games, every saved byte). Full walkthrough: no console errors, no horizontal
  overflow. Software renderer, Risk Blaster, average / worst second, builds run
  alternately: at its lowest level 120 / 105 and 120 / 103 with the one frog, 121 / 93
  and 112 / 99 with the four; forced to the top level 37 / 15 and 53 / 16 (the frog
  covers far more of the screen there, as the exam boss does; the adaptive ladder
  is what a phone runs).

Known and not done: not measured on a real iPhone; the sounds were not auditioned.
In landscape on a phone the band is about 70 px tall, so the frog is small there.
The hub's Risk Blaster cabinet keeps its old attract demo of coloured squares.

# The three supplied models, neon rebuild (eighth pass): progress log

The request: focus only on the three supplied 3D models; make each look and move as
well as it can in the arcade (premium, cinematic, detailed), in the arcade's neon
style, with a procedural fallback, without touching the rules. The request was cut
off after "DEFINITION OF DONE ... At"; each model is held to: screenshots at several
angles and moments, a before/after comparison, a frame-rate measurement, and the
rules regression identical. There is no `assets/models` folder: the models are in
`arcade/assets/boss`, `arcade/assets/fighter` and `arcade/assets/frog`.

`arcade/backup/index.before-neon-models.html` is the game as it was before this pass.

## Step 1: what each model is

| Model | Role | Parts | Triangles | Skeleton / clips | Texture as supplied | Decision |
|---|---|---|---|---|---|---|
| Mech (`boss`) | Final Exam boss | 32 separate parts | 12,243 | none / none | one 4096 px colour map: rusty tan and bone armour; no metal, roughness or normal maps | override: keep the map only as light and shade |
| Starfighter (`fighter`) | Risk Blaster ship | 166 parts | 15,212 | none / none | one 8192 px colour map: weathered white and orange paint, rust | override: map kept as light and shade and as a mask of where the paint was |
| Frog (`frog`) | Risk Blaster enemy | one sculpt | 1,930,336 (19,994 and 3,232 in the game) | none / none | one 4096 px colour map: painterly yellow suit, brown leather, rust stains | override the suit and cannon; keep its skin |

None has a skeleton or animation, so all three are animated in code (the boss by its
32 parts on a 19-joint rig, the fighter by its parts and as a whole, the frog in its
vertex shader and as a whole).

## Checkpoints

| # | Checkpoint | Status |
|---|---|---|
| G0 | Backup; the shared neon look (detail tile, shader library, plain version for weak levels); lighter textures | done |
| G1 | Mech boss | done |
| G2 | Starfighter | done |
| G3 | Frog | next |
| G4 | Final verification, docs, PR, artifact, report | pending |

## Done so far

- G0, the shared look (`08m-model.js`):
  - `neonArmourTile()`: one 512 px tile drawn from a fixed seed. Red is height
    (dents, scratches, pits, grain), green is panel lines (a groove, or a seam that
    carries light), blue is small lights (their value sets colour and beat) and vent
    slots. It is projected on each model along the dominant axis of its own normal,
    in the part's own space, so it stays put as the part moves.
  - `NEON_GLSL`: gunmetal from the old texture's brightness, grooves, a bump from
    the tile's height, seams whose light runs along them, lamps that pulse each on
    its own beat (the fastest about 0.5 Hz), a two-colour rim (magenta on the left
    of the view, cyan on the right).
  - `neonLowMaterial()`: the same look unlit, for the three weakest quality levels:
    dark metal lit from above, pale bone, the two-colour rim, fog.
  - `inrModelParts()` now refuses a model that is not one or was cut short (it used
    to loop over a garbage length), so a damaged model falls back cleanly.
  - Textures re-encoded smaller since they now only carry light and shade: the boss's
    is greyscale (989 KB to 681 KB), the fighter's is 1024 px (795 KB to 294 KB).
    The page went from 6,479 KB to 5,423 KB.
- G1, the mech boss (`24c-examboss.js`, `24-exam.js`, `24b-examhero.js`):
  - Materials: gunmetal plates (metalness 0.92, roughness from the texture and the
    tile, worn bright edges), panel lines and a bump from the tile, cyan seams and
    small lights, a magenta and cyan rim, a pale chrome skull, the red eyes as
    before. The hall's two rim lights and its reflection panels are magenta and cyan.
  - Reveal: its lights are off until it wakes, then come on from the feet up.
  - Over the exam the seams go from cyan to magenta (by how far along the exam is,
    never by which answers were right).
  - Idle: servo twitches (a joint jerks a few degrees and settles, every 2 to 5 s,
    on its own dice) on top of the breathing, head tracking and gestures it had.
  - Pass ending: the panel lines open into glowing cracks as the plates blow, and
    its lights stutter (a change at most 2.6 times a second, never fully out).
  - Fail ending: seams and lights go red and bright.
  - A soft contact shadow under it on the dais.
  - Weak quality levels: the plain neon version, which follows the hall's light and
    runs red in a rage and hot as it burns.
  - Fallback: with no boss model in the build, or one that will not decode, the hall
    shows its old procedural centrepiece (the crystal Keystone, restored from before
    the boss), which fills with light as questions are answered (right or wrong
    alike). Tested both ways.
  - Checks: regression IDENTICAL (153 answers in 8 games, 0 exam hints); the ending's
    other paths (skip, reduced motion, reduced effects, fail, replay) all end as
    before; software renderer, exam, average / worst second, old and new alternately:
    105 / 99 and 116 / 107 old, 107 / 99 and 104 / 93 new (run-to-run noise is larger
    than the difference).
- G2, the starfighter (`20d-blasterfighter.js`, `20-blaster.js`):
  - Materials: the white and orange paint is gone. Its brightness shades a dark
    gunmetal with panel lines, dents and a bump from the tile; where the paint had a
    colour (read from a blurrier level of the texture, so rust specks do not count)
    the panel is anodised magenta on the port side and cyan on the starboard, with a
    line of light round its edge; cyan seams and small lights; a magenta and cyan
    rim; worn bright edges; a glow from below in the wave's colour. Engine heat, gun
    flash and the break-up are as before.
  - Its lights come on as it arrives, burn brighter with the streak and the thrust,
    dim on its last shield and die with it.
  - Motion added: a hover (a slow bob on two beats, the nose leading it, a yaw that
    trails the bank), a burst of thrust after a clean hit (it surges ahead with long
    flames and wider vapour trails, then settles back), a knock when a shield is
    lost (down and over to one side; the roll's spring carries the wobble), flames a
    little longer in later waves. It already had: banking, the fly-in, recoil, the
    wing waggle, the roll through the warp, shield flare, smoke and sparks on its
    last shield, the break-up.
  - Weak quality levels: the 3,032-triangle version in the plain neon material.
  - Fallback: with no fighter model, or one that will not decode, the built-in
    procedural jet flies (tested both ways).
  - Checks: regression IDENTICAL; software renderer, Risk Blaster, average / worst
    second, old and new alternately: 117 / 105 and 119 / 101 old, 120 / 107 and
    127 / 108 new.
