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
| G3 | Frog | ON HOLD at the user's request (they are making a new boss; the frog is untouched) |
| G4 | Final verification, docs, PR, artifact, report | folded into the ninth pass's last step |

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

# Risk Blaster in open space (ninth pass): progress log

The request: only Risk Blaster's surroundings. Replace the polygon tunnel with a
wide-open deep-space world full of life; keep the fighter, the models and all quiz
logic as they are. `arcade/backup/index.before-open-space.html` is the game before it.

One thing found on the way: in the game only the band between the question and the
answers shows the 3D view (about 30 by 27 degrees round the way ahead), and the enemy
fills its middle. So the scenery is composed in the frame round the enemy, and things
pass behind it from one side of the frame to the other.

## Checkpoints

| # | Checkpoint | Status |
|---|---|---|
| H1 | Tunnel removed; sky, stars at three depths, star and flare, ringed giant, galaxies, clouds, rocks, station, wrecks, gate; six regions blended | done |
| H2 | Traffic: six ship designs, instanced, with windows, engines, lights, trails; parting on a right answer | done |
| H3 | Event Director: 16 kinds of ambient event, every 3 to 6 s | done |
| H4 | Verify (shots against before, 60 s event capture, fps, regression), docs, PR, artifact, report | done |

## Done so far

- H1 (`20f-blasterspace.js`, new; `20-blaster.js`; `20c-blasterworld.js`):
  - Gone: the hex rings, the honeycomb wall, the ribs, pylons, conduits, laser chords
    and wall blocks (`makeTunnel`, `BlasterCorridor`). The old fog (22 to 135 units)
    is now 120 to 1500 and the camera sees 2400 units.
  - Sky: one nebula texture baked on the graphics card at load (tiling noise: billows,
    filaments, hue and lanes, star dust), drawn as two layers that each grow as the
    ship flies into them; one fades in as the other fades out, so the flight never
    ends and never repeats. Coloured by the region (three colours and a bright heart).
    Darker round the way ahead, where the enemy and the answers are.
  - Stars at three depths: 620 far ones that stand still and twinkle slowly, 340 that
    drift, 180 specks of dust that stream past (plus the 240 line streaks the game had).
  - A star with a glow in the sky and five ghosts in the lens; three galaxies; a ringed
    gas giant with bands, a storm, an atmosphere that glows past its limb, rings seen
    nearly edge-on with the planet's shadow across them, a moon.
  - Wisps of nebula that pass the ship (14 soft clouds filled with the nebula's billows).
  - Rocks: 16 detailed ones (320 faces, noise and craters, flat faces) and 96 lighter
    ones, as many as the region has, tumbling past and shrinking away as they pass.
  - Region pieces: a station (spindle, turning wheel, solar wings, mast, a lane of
    blinking markers), nine wrecks, a wormhole gate (a whirl held by three arms). The
    station and the gate come slowly nearer while their region lasts.
  - Regions: nebula, asteroid belt, planet orbit, station zone, ship graveyard,
    wormhole gate. A wave travels through two: the second comes up after its fifth
    question (a 7 s blend), the next wave's with the warp (2.4 s). Sky colours, fog,
    the scene's two lights, star, giant, clouds and rocks all blend.
  - A soft dark halo behind the enemy (or the answers' targets).
  - One material for everything solid (`spaceHullMaterial`): the star's light, ambient,
    a rim, the light of a blast, hull panels, rows of lit windows, engines, lamps that
    blink at 0.67 Hz each in its own time.
  - Checks: regression IDENTICAL (153 answers in 8 games); no console errors.
- H2 (`20g-blastertraffic.js`, new):
  - Six designs, each one geometry drawn many times: freighter (a spine hung with
    containers, a lit bridge, twin engines), tanker (three spheres on a truss, one
    engine bell), capital cruiser (a 120-unit wedge, stepped decks, a tower, flanks
    of windows, six engines), fighter (a dart with forward-swept wings), patrol
    drone (a core in a ring, three antennae, an eye), shuttle (a pale cabin with a
    row of windows). Plus a derelict hulk and a space whale for the events.
  - Paths: overtaking close on one side, coming the other way, slowly overtaken at
    mid distance, crossing far ahead (behind the enemy, from one side of the frame
    to the other). Each ship faces the way it goes, rolls a little, has an engine
    trail. The region sets how many of each there are.
  - Only the copies in use are drawn (the lowest free place is taken first).
  - A right answer: everything within 320 units moves aside and comes back.
- H3 (`20g-blastertraffic.js`): the Event Director fires every 3 to 6 s (0.8 of that
  rate while a question or its explanation is up; 0.4, and nothing that flashes,
  with Reduced effects). Sixteen ambient kinds: squadron, capital cruiser with
  escorts, convoy, patrol, shuttle lane, dogfight (a shot every 0.45 s), explosion
  (one flash, a ring, debris), comet, meteor shower, rock cluster, wormhole opening
  (three fighters come out), space whale, ion storm (three pulses at 1.5 a second),
  solar flare, warp jump, derelict. Fireworks are fired by right answers only.
- Answer feel: right: the fighter's burst of thrust (eighth pass), the traffic
  parts, three bursts of fireworks round the frame. Wrong: the picture's glitch
  and the shield's flare (both already there), plus sparks off the hull and
  forked arcs across the shield.
- H4, the checks:
  - No tunnel rings or wall code remains (`makeTunnel`, `BlasterCorridor` deleted).
  - Six regions; 16 ambient event kinds; in a 60 s capture with a question on
    screen 12 events fired, 12 different kinds; up to 29 ships at once.
  - Regression IDENTICAL (153 answers in 8 games, every saved byte). Full
    walkthrough: no console errors, no horizontal overflow. Without the frog model
    the answers' targets and the carrier work in open space.
  - Software renderer, 390 by 844, Risk Blaster, average / worst second, old and
    new alternately: 123 / 104 and 119 / 103 with the tunnel, 120 / 98 and
    118 / 95 in open space (the page's own frames: 114 / 98 and 111 / 95). Locked
    at the top quality level the two builds cost the same (15 / 14 against 15 / 14).
  - Reduced effects for 40 s: 3 events, none flashing, half the traffic.
  - Scores against the tunnel (honest, after two rounds of tuning): openness 4.5,
    depth 4, detail 4, cohesion 4.

Known and not done: not measured on a real iPhone; no new sounds (a whoosh and a
boom are reused, only between questions). With the frog as the enemy there are no
per-answer targets to halo: the halo is behind the enemy. The hub's Risk Blaster
cabinet keeps its old attract demo. No megastructure beyond the station and the
gate (the whale was built instead). The frog itself is untouched.

# The void demon (tenth pass): progress log

The request: the new demon model replaces the frog wherever the frog appeared; make it
look and move as well as it can; rig it from its loose parts; keep the old boss as a
fallback; get its file well under 3 MB. `arcade/backup/index.before-demon.html` is the
game before it.

## What the file is

`void_demon_3d_model.glb` (10.45 MB, not in the repo): 106 separate parts
(`tripo_part_0` to `105`), 25,589 vertices, 20,645 triangles, one material, one
8192 px JPEG of 9.4 MB (a muddy stone brown cut into thousands of tiny charts), no
skeleton, no animation. One unit across the wings, 0.73 tall, facing +z. It is a torso
with no legs: a skull with two horns and a third-eye gem, a lower jaw that is one part
with the neck, shoulder plates, a chest plate over a core, a waist that tapers to a
point (its tail), two arms with clawed hands, and on each side a bony wing arm, a wing
blade under it and a lower pair of blades. 19 of the parts are small studs.

## Checkpoints

| # | Checkpoint | Status |
|---|---|---|
| I0 | Back up; inspect; convert (texture to 2048 px WebP); inline | done |
| I1 | Rig, materials, lights, particles, framing, entrance | done |
| I2 | Animations hooked to the game's events | done |
| I3 | Verify, docs, PR, artifact, report | done |

## Done

- I0: `scripts/convert-model.js` and the build know `demon`: `demon.bin` 485 KB
  (the 106 parts, quantised as the other models are) and `albedo.webp` 315 KB at
  2048 px: 0.8 MB in all, from 10.45 MB. The page is 6.6 MB.
- I1 (`20h-blasterdemon.js`, new; two lines in `20-blaster.js`):
  - Placement: Risk Blaster's enemy in every wave, in the frog's place and on the
    frog's clock (22 units ahead when a question starts, 14 when its time is up).
    Sized so that at its closest it fills the band from top to bottom and its
    wingtips run past the sides (the frog was fitted inside the band). It is not in
    Boss Rush: its twelve bosses talk, each for its chapter, and stay as they are.
  - Rig: the parts are merged at load into 21 joints with pivots (body, waist, tail,
    head, jaw, two shoulder plates, arm, forearm, hand and claws a side, wing arm,
    wing blade and lower wing a side). Each vertex keeps where it was at rest, its
    part's middle, what it is made of, how far along its part it is, and when it is
    shed.
  - Materials (the baked texture is only read as light and shade): gunmetal armour
    and obsidian skull, horns, blades and claws, with relief from the texture and
    the shared detail tile, worn bright edges, an environment map.
  - Light: crimson eyes (light in the sockets and two sprites), a violet third eye,
    fangs and a mouth that glow as the jaw opens, a core with a heart of light that
    beats, horn and wing-spike tips, veins and small lights in the armour, 19 studs
    each on its own beat, a magenta and cyan rim, a breath of violet glow behind it.
    Its lights come on from below as it arrives.
  - Particles and air: embers rising, dark mist off the wingtips, sparks and smoke
    from its wounds, arcs between its claws (one every 0.4 s at most), heat haze
    when it rears, strikes, rages or burns.
  - Wing blades eaten ragged toward their outer and lower edges, the edges burning.
- I2, the animations (all posed from smooth curves; what is further out follows later):
  1. idle hover: breathing, a bob on the wing beat, a sway
  2. wing beats with follow-through (wing arm, then blade, then lower wing)
  3. tail sway (waist, then tail)
  4. head tracking (it watches the player; the pointer turns it)
  5. entrance at a wave's start: fly-in, wings thrown wide, a roar, lights on
  6. the warning: it rears up, arms raised, claws charged, jaw opening
  7. strike one: bolts from both claws
  8. strike two: a lunge and a claw swipe
  9. strike three: a roar (jaw wide, a ring of force) and a blast from its mouth
  10. hit reaction: a flash, thrown back over a few frames, wings folding in
  11. damage states: cracks, armour shed in order (studs first, the plates over the
      core last), the core laid bare, lights stuttering (2.5 changes a second at most)
  12. rage in a wave's last three questions: faster wings, red light, an aura
  13. defeat: stagger, then every part thrown outward and burned away in a blast
  Hooks: wave start, right answer, wrong answer, time up, wave cleared; the wave's
  progress and its right answers stand for its HP.
- Weak quality levels: a 3,900-triangle version (vertices merged by cell) in a plain
  material; no shedding or break-up there. Reduced effects: slower wings, no aura,
  ring, mist or arcs; fewer embers. Reduced motion: no fly-in.
- Fallback: with no demon model, or a damaged one, the frog is the enemy; with
  neither, the answers' targets. Tested each way.
- I3, the checks: regression IDENTICAL (153 answers in 8 games, every saved byte);
  full walkthrough with no console errors and no horizontal overflow; every demon
  event run with Reduced effects on. Software renderer, 390 by 844, Risk Blaster,
  average / worst second, frog build and demon build alternately: 97 / 85 and
  93 / 87 with the frog, 86 / 80 and 103 / 87 with the demon (before its light
  version existed the page's own rate was 52). Locked at the top quality level:
  13 with the frog, 11 with the demon.
- Scores (honest, after two rounds of tuning): detail 4, polish 4, smoothness 4
  (judged from stills and from the curves, not from video), cohesion 4.

Known and not done: not measured on a real iPhone; no new sounds (the boss's cues
are reused). It was not put in Boss Rush. Risk Blaster has no last wave, so there is
no separate final-boss form: it is every wave's boss, and rages at each wave's end.
The frog's files stay in the page as the stand-in (about 1.4 MB of it). No KTX2 (it
would need a transcoder in the page). No cast shadows in open space: its undersides
and inner faces are shaded darker instead.

# The demon, finished (eleventh pass): progress log

The request: finish what the tenth pass left: the demon's own sounds, depth without
cast shadows, a weak-device version that still sheds and breaks up, a bigger rage and
a finale, remove the frog, Boss Rush only if cheap, and a frame-rate readout the
player can read on a phone. `arcade/backup/index.before-demon-finish.html` is the game
before it.

## Checkpoints

| # | Checkpoint | Status |
|---|---|---|
| J0 | Back up; remove the frog | done |
| J1 | Depth without shadows; weak-device shedding and break-up; bigger rage and finale | done |
| J2 | The demon's sounds | done |
| J3 | Frame-rate readout, throttled test, docs, PR, artifact, report | done |

## Done

- J0: the frog's model files (`arcade/assets/frog/`), its source (`20e-blasterfrog.js`)
  and its three sound cues are deleted; nothing in `arcade/src` or `scripts` names it
  any more (the enemy's place in the game is `this.enemy`). The converter keeps its
  path for dense sculpts, with no model using it. Fallback: the demon; its light
  version on weak quality levels; the answers' targets if its model is missing or
  will not decode (tested both ways). The page went from 6,604 KB to 5,186 KB.
  Regression IDENTICAL.
- J1 (`20h-blasterdemon.js`):
  - Depth with no shadow to cast: how closed-in every vertex is by the rest of the
    model is worked out when it loads (the model is marked into a 58 by 44 by 28 grid;
    nine rays go out round each vertex's normal) and darkens crevices; everything
    that faces down is darker, and it darkens toward its tail. That shading dims what
    it reflects, not its own light. Rim lights are stronger, with a cold one from
    above and behind. The core's light spills on its chest, jaw and arms, the eyes'
    on its brow and cheeks, the third eye's on its crest. What is furthest back
    (its wings) sinks into the haze of the region's colour.
  - The light version (weak quality levels): the same crevice and underside shading
    from the same numbers; cracks drawn as thin lines of light; bits of armour fly
    off it on every hit from the third; when it is destroyed its 21 joints fly apart
    as chunks, turning and shrinking away, in the same blast as the full version.
  - Rage (a wave's last three questions) starts with a moment of its own: wings
    thrown wide, jaw open, a sting, a burst of embers, the aura swelling. Then
    faster wings than before, arcs down its wings, more embers, a stronger aura.
  - Finale: once in a run, at the wave that takes the player past their saved best
    score (read only), its defeat is a last stand: it rears back and roars for 1.15 s
    with the aura full, then two blasts 0.46 s apart (never faster), its parts thrown
    1.7 times as far and its joints with them, a longer burn. Every defeat also grows
    a little with the wave number (up to 30%).
  - Game over: it has won, and roars over the wreck with its wings spread and the
    aura up.
- J2 (`02-sound.js`): eleven cues of its own, all made in the page: a layered roar and
  a long one, a wing beat on every down-stroke (about one a second, very quiet), the
  strike charging and let go, a hit on its armour, the rage sting, plates coming away,
  the break-up, the blast and the finale's double blast. They go through the same bus
  as every other effect, so the sound switch silences them (checked: no audio nodes
  are made when it is off). Levels were then measured (below) and the wing beat
  raised by 6 dB, as it sat too far under everything else to be heard.
- J3:
  - The readout (`99-main.js`, `04-gfx.js`, `05-ui.js`, `10-title.js`): Setup's FPS
    counter has a second line: the slowest frame of the last half second (ms), the
    scene's triangles and draw calls, and the size it is drawn at. Three taps on the
    title's logo inside a second turn it on or off for the visit; nothing is saved
    (Setup's own switch still is, and still shows the saved choice). `#fps` at the
    end of the address does the same. The logo starts nothing, so the taps cannot
    start a game.
  - Boss Rush: not done. The demon is built on Risk Blaster's own scene (its fighter
    and shields, its clock, its wave counter, the band the view is fitted to, the
    open-space effects), and Boss Rush stages its bosses its own way (HP, an attack
    charge, dialogue). A thirteenth boss would also need questions of its own, a place
    in the stage list and in saved progress, which this pass may not touch.

## Measured

- **Page:** 6,604 KB with the frog, 5,202 KB now (1.4 MB less).
- **Frame rate** (software rendering with no GPU, 390 by 844, the build before this
  pass and this one run alternately; average / worst second on screen): 86 / 72 and
  88 / 81 before, 83 / 71 and 89 / 78 after. The same, within the run-to-run spread.
- **Slowed-down phone emulation** (phone-sized touch page, the page's main thread
  slowed 4 and 6 times with the browser's CPU throttle). Two things were measured:
  - *Whole frames on this machine* (lightest quality level, which is where software
    rendering puts it; page frames a second, average / worst second): 81 / 71 at full
    speed, 54 / 45 and 58 / 46 at 4 times slower (51 / 42 before this pass), 39 / 31 at
    6 times slower. These are pessimistic: each frame waits for the software
    rasteriser, and the throttle stretches that wait as well.
  - *The game's own work in a frame* (script and issuing the draw calls, not the
    drawing; median / 95th percentile / 99th, ms; a 60 fps frame has 16.7):

    | Quality | full speed | 4 times slower | 6 times slower |
    |---|---|---|---|
    | Top (full demon, 58k triangles, 100 draw calls) | 2.2 / 5.1 / 8.1 | 9.0 / 17.2 / 27.1 | 11.7 / 24.3 / 44.5 |
    | Lightest (light demon, 20k triangles, 60 draw calls) | 0.7 / 1.2 / 2.5 | 3.2 / 6.4 / 9.5 | 4.9 / 9.7 / 13.6 |

    Of the top level's 9 ms at 4 times slower: the demon's animation 0.35 ms, the
    space scenery 0.8 ms, issuing the draw calls and post-processing 7.1 ms. So a
    processor 4 times slower than this one would hold 60 at the lighter levels and
    miss about one frame in twenty at the top one, where the quality ladder steps
    down by itself. What a phone's graphics chip does with it cannot be measured
    here: that is what the readout is for.
- **Sound levels** (each cue rendered offline through the game's own effects bus,
  reverb and master gain; peak, then the loudest 0.3 s, dB below full scale):

  | Cue | Peak | Loudest 0.3 s |
  |---|---|---|
  | The game's right, wrong, laser, shield, level-up cues | -22 to -25 | -35 to -44 |
  | The game's `boom` / `hit` | -17.4 / -18.8 | -33.8 / -32.3 |
  | Boss Rush's roar / smash / blast (already in the game) | -13.6 / -13.5 / -10.6 | -27.6 / -27.9 / -21.7 |
  | Demon: hit / plates coming away / break-up | -19.5 / -31.2 / -28.6 | -35.3 / -49.5 / -43.0 |
  | Demon: charge / release | -25.4 / -18.4 | -40.2 / -34.7 |
  | Demon: roar / long roar / rage sting | -16.5 / -16.3 / -17.3 | -27.8 / -25.5 / -30.8 |
  | Demon: blast / finale | -13.3 / -14.6 | -25.8 / -23.5 |
  | Demon: wing beat (after the raise) | -34.0 | -48.8 |

  Everything that can sound at once, started together: a right answer -10.8 without
  the demon's cues and -9.5 with them; a wave cleared -10.3; the finale -12.0; the
  run ending -15.7. The loudest moment the game already had (Boss Rush's blast with
  a hit) is -9.6. Nothing comes near clipping, and no demon cue is louder than the
  loudest cue the game already had.

## Final checks

- `npm run arcade:regress`: IDENTICAL to the original build (153 answers in 8 games).
- Full walkthrough on a phone-sized page (35 captures: title, hub, every game,
  results, guide, search, stats, Setup): no console errors, no horizontal overflow.
- Every demon event (entrance, three strikes, hits, damage, rage and its onset, the
  finale, the roar when the run ends, defeat) at the top and the lightest quality
  level: no console errors.
- The strikes, a hit, the rage's onset, the finale, the run's end and the light
  version's hits and break-up again with Reduced effects on: no console errors; no
  aura, no sway, slower wings; the finale's two blasts stay 0.46 s apart.
- Fallback: demon model missing, and damaged: no enemy, four answer targets, no errors.
- The readout, with real touch taps: hidden at first; three taps show it; it stays
  on in a game and in Setup (nothing wider than the page); three more hide it; two
  taps, a pause and a third do nothing; the saved setting is unchanged.
- Sound switch off: no audio nodes are made by any demon cue.

## Choices to flag

- **The finale's moment.** Risk Blaster never ends by itself, so there is no last
  wave. The finale plays once in a run, at the wave whose clearing takes the score
  past the saved best (read, never written); on a first run that is the first wave.
  And when the run ends (the highest wave reached), the demon has won, so it roars
  over the wreck instead of blowing up. Every defeat also grows with the wave number.
- **The rage's onset** comes as a question appears, so it has no ring and no shake.
- **The triple-tap is for the visit only.** Setup's switch is the lasting one.
- **Sounds** were measured, not heard: no speaker here.
- **Older backups** in `arcade/backup/` still hold the frog, as they are snapshots.
- **The converter** keeps its path for dense sculpts; no model uses it now.

## Not done

- Boss Rush bonus boss (above).
- Not verified on a real iPhone: read the numbers off the readout there.


# The ultimate polish pass (twelfth pass): progress log

The request: a full art-direction and rendering overhaul, screen by screen. Visual
quality is the only priority; frame rate is not one. One mode: maximum (no quality
tiers, no auto-scaling, no weak-device versions). Off limits: the question bank,
answer checking, scoring, timers, spaced repetition, progression, saved progress,
sync and all question and card text; text stays legible; the Final Exam gives no hint
before submit. Everything original. `arcade/backup/index.before-ultimate-polish.html`
is the game before it.

## How to resume

Work goes checkpoint by checkpoint (table below). Each checkpoint is one commit on
`claude/sleepy-fermat-21jujj` with the game building and the regression test
IDENTICAL. To pick up: read the table, take the first row that is not `done`, and
use the audit list under it as the to-do list for that screen.

The regression reads the final boss's old name as its new one (`RENAMED` at the
top of the comparison in `scripts/arcade-regression.js`): the name was changed on
purpose in the originality audit, and that results line is the only text that
differs from the baseline.

## Checkpoints

| # | Checkpoint | Status |
|---|---|---|
| K0 | Back up; Phase 0 audit of every screen | done |
| K1 | Rendering: one maximum mode, full pixel density, multisampling, depth passes, bloom, grade | done |
| K2 | Title screen | done |
| K3 | Arcade hub | done |
| K4 | Risk Blaster | done |
| K5 | Nest Egg Run and Boss Rush | done (two reviews) |
| K6 | Final Exam, Memory Bank, Strategy Guide | done (reviewed) |
| K7 | Interface design system | done (reviewed) |
| K8 | Originality audit, final checks, report | done |

## Phase 0 audit

Every screen was captured at the old top quality level, 90 states in all (title at
four moments; the hub at each of its six cabinets and mid-dolly; Risk Blaster's
entrance, question, fire, hit, approach, warning, strike, explanation, rage, defeat
and game over; Nest Egg Run at four moments and three later biomes; ten bosses and a
fight; the vault's card front, flip, back, banked and missed; the exam's ending; the
guide's list, chapter and search; stats, Setup, pause, results). Weaknesses, most
damaging first within each group; each is ticked off below as it is fixed.

**Everywhere**

- G1. The 3D picture is soft beside the page's text: drawn at 1.5 times the page's
  pixels at most, not multisampled, with a colour fringe that is always on and
  smears thin lines and signs.
- G2. Bloom lays a haze over the mid tones; the wide glow is blocky.
- G3. No depth cues: nothing shades a crevice, nothing casts a contact shadow,
  nothing is out of focus. Objects float.
- G4. Quality tiers, auto-scaling, plain twin materials and hidden decoration.
- G5. Text inside the scenes (signs, marquees) is drawn small and stretched.
- G6. Flat, untextured surfaces: solid colours with no relief, wear or roughness
  (hub cabinets, bosses, the title's city most of all).
- G7. One palette everywhere: magenta and violet from subject to background, so
  subjects do not separate (Risk Blaster most of all).
- G8. Camera moves have no blur; screens change with plain fades.

**Title**

- T1. The city is a thin strip in the middle third; the top is empty haze and the
  bottom a dark floor.
- T2. Buildings are plain boxes with dot windows: no signs, no variety, no layers.
- T3. The sky is empty but for a few dashes; blimps, trains and helicopters are
  rarely in frame; no clouds; the rain does not read.
- T4. The sun is blown out to a white blob and its reflection is a smear.
- T5. The logo's depth is flat; INR touches ARCADE; the lines above and below it
  are fringed, and the lower one collides with the bridge.
- T6. INSERT COIN sits on the skyline with little contrast.

**Arcade hub**

- H1. Cabinets are flat plastic with a glowing outline round every edge: no side
  art in view, no wear, plain control decks.
- H2. Marquee text is soft; the attract screens are coarse.
- H3. The room behind is washed out and hard to read; the floor's reflections
  smear; the arrival frame is nearly black.
- H4. Nothing grounds the cabinets: no shadows under them; the ceiling is empty.

**Risk Blaster**

- B1. Demon, fighter and nebula are all magenta and violet and merge.
- B2. The answers have no targets in the scene (the brief asks for clear
  holo-drone targets).
- B3. A hit whites the whole demon out to a flat silhouette.
- B4. The nebula is blotchy close up; stars are sparse; the planet is small.
- B5. Explosions are soft blobs with little structure.
- B6. A light version of the demon and plain twins exist for weak devices.

**Nest Egg Run**

- R1. The base picture is fringed; the crash frame tears it apart.
- R2. The car is dark and blocky, with little paint or metal to catch light.
- R3. The road is flat; buildings are boxes with dot windows.
- R4. The middle distance is sparse; traffic is thin in most frames.

**Boss Rush**

- X1. Bosses are flat-shaded block figures: no panel detail, bevels or trim.
- X2. The arena is one ring, a grid and two beams, with nothing behind it.
- X3. Flat light; no shadow on the floor.
- X4. The entrance starts on a nearly black frame.

**Final Exam**

- E1. The mech's chrome skull and red eyes read as a film robot everyone knows.
- E2. The hall round it is dark and empty.

**Memory Bank**

- M1. The card is a flat rectangle of the page laid over the vault: it does not
  flip in 3D, and it hides the scene.
- M2. The vault's gears and coins are soft and lit flat gold.
- M3. Banking a card and missing one barely show.

**Strategy Guide**

- S1. The library is a small banner; everything else is a flat list.
- S2. The banner's shelves are sparse.

**Interface**

- U1. Panels are flat fills with a two-pixel border: no depth, no glass.
- U2. Buttons are flat blocks with little response.
- U3. Stats and Setup are long flat lists on a plain ground.
- U4. HUD bars and badges are plain.
- U5. Results are flat.
- U6. Screens change without choreography.

## Done so far

Method for each screen: implement; capture six or more moments at twice the page's
pixel density (`tools/atlas.js` in the session scratchpad steps scenes in virtual
time, so slow software frames do not matter); score it; hand the captures to a
reviewing sub-agent that has seen nothing else; fix what it lists; regression;
commit. The reviewer's scores are of the pass it saw; "after" is my own scoring of
the fixed screen on the same rubric (detail, lighting, materials, depth, motion,
cohesion, legibility).

- **K1, rendering** (`04-gfx.js`, new `04b-pipeline.js`). G1 to G5 and G8.
  - One mode. The eight quality levels, the frame-rate watcher, remembered levels,
    plain twin materials and the Retro and Chunky looks are gone; Setup loses
    Quality and Graphics. The scene is drawn at the screen's own pixels (its full
    device pixel ratio, limited only by the largest texture the chip allows).
  - The scene target is multisampled (4 samples on a phone, 8 where the density is
    lower) with a 24-bit depth texture. A start-up check draws a quad at a known
    depth and reads it back through the resolve: if a browser cannot do it, the
    target is made without multisampling and FXAA carries on alone.
  - From depth: ambient occlusion (20 taps, radius a fraction of each pixel's own
    distance, depth-aware blur) and contact shadows (a 16-step march toward the
    scene's key light); depth of field (56-tap disc at half size, laid back by each
    pixel's circle of confusion; scenes set focus, ranges and whether the sky
    blurs); camera motion blur from the previous frame's view (a 1/40 s shutter
    whatever the frame rate). Light sources are left out of the shade.
  - Bloom is a 13-tap bright pass, six downsamples and a tent upsample chain; a
    dusty lens catches the widest glow; rays have 64 steps; ghosts gain two rings.
  - The colour fringe is the lens's own now: none in the middle, growing toward the
    corners, plus the pulse of a hit. Sharpening is on everywhere. Grain is finer
    and strongest in the mid tones. Scanlines keep to three CSS pixels.
  - Text drawn inside scenes is three times finer; every texture is filtered at the
    chip's maximum anisotropy.
  - `surfaceDetail()` (08-fx.js): one tiling texture (grain, hair scratches,
    smudges) laid on any physically-based material without UVs, as relief in the
    normal and variation in roughness, at two scales. G6 for those materials.
  - Setup gains switches for depth of field and ambient shade; the readout shows
    the multisampling in use instead of a quality level.
- **K2, title** (`10-title.js`, `10b-titlecity.js`, new `10c-titlelife.js`, CSS).
  T1 to T6. Reviewer (first pass): detail 3, lighting 2.5, materials 2.5, depth 3,
  motion 2.5, cohesion 3, legibility 3.5. After: 4.5, 4, 4, 4.5, 4.5, 4.5, 5.
  - `cityFacadeMaterial()` (08-fx.js): every dark box of a tower becomes glass and
    steel with floors of windows (busy floors and dark ones, rooms brighter toward
    their ceilings, piers, sashes), sky mirrored cyan to the left and magenta to
    the right, the low sun glancing off the panes, lightning as a cold glint;
    where windows would be smaller than a pixel they melt into an even glow.
  - Six megatowers frame the view as a canyon with blade signs hung over the
    street. Lamp posts slide past with the street; three strings of lanterns cross
    it. Traffic is comets of light along four sky lanes and on the wet street.
  - Always there: two twin-hulled sky-ferries flying down the avenue, a helicopter
    working its searchlight in front of the sun and another crossing overhead, a
    ribbon of sixty drones, 2,400 rain streaks with rings where they land, a storm
    cloud that lights from within and throws forked bolts behind the mountains
    (at most a double pulse, 0.42 s apart).
  - The camera sways, pushes in and eases back, and rolls a hair.
  - Layout: kicker and logo at the top; coin prompt, its caption, the tip (fixed
    height) and the stats line in a dock on a scrim at the foot; the sun, bridge
    and city between them are clear. The logo's glint is a narrow feathered band.
  - Reviewer's resemblance notes: an ad blimp over a rainy sign canyon recalls a
    well-known film (the blimps are now sky-ferries with cabin windows and no
    screens); a sign carried a real association's acronym (replaced by a product
    name from the course).
- **K3, hub** (`11-hub.js`, CSS). H1 to H4. Reviewer (first pass): detail 2.5,
  lighting 2.5, materials 2, depth 2.5, motion 2, cohesion 3, legibility 3.
  After: 4.5, 4, 4, 4.5, 4, 4.5, 5.
  - Clearer room: less haze, bloom from 0.95 to 0.7 with a higher threshold, a
    gentle focus pull on the cabinet in front (signs behind stay readable).
  - Six silhouettes: each cabinet has its own width and height, buttons and button
    rings in its own two colours, and a rim light in its second colour.
  - Printed art, lit like the cabinet: a control-panel overlay each (speed stripes,
    a compass under the stick, a ring and a legend for every button, emblems), a
    front panel each (bands of its two colours, its emblem either side of the
    door), a coin-door plate. The coin door is two slots to one side, a return
    flap and a lock (it used to read as a face).
  - Grain, hair scratches and smudges on every painted, plastic and chrome surface.
  - Screens: the room's neon caught in the glass; richer attract loops for Risk
    Blaster (a horned shape, four lettered drones, the ship firing), Boss Rush (a
    fight with charge, strike, answer, hearts) and Memory Bank (six cards turning,
    coins dropping).
  - The camera stands back so the whole cabinet and the floor are in view, and
    arcs wider between cabinets; the card and mission bar wait for the room to
    power on; the card's top edge no longer moves between games.
- **K4, Risk Blaster** (`20-blaster.js`, `20d`, `20f`, `20h`, `03-data.js` blurb,
  CSS). B1 to B6. Reviewer (first pass): detail 3, lighting 2.5, materials 2,
  depth 2.5, motion 2.5, cohesion 3, legibility 3. After: 4.5, 4.5, 4, 4.5, 4.5,
  4.5, 5.
  - The four answers are holo-drones again, flying escort in front of the demon
    and well inside the frame: a dark plate with a large outlined white letter
    that does not bloom, the answer's colour in the ring and thrusters. The ship
    always fires at the drone you chose. Right: the drone relays the shot into
    the demon and bursts. Wrong: it bursts red and the demon strikes back. Out
    of time: the drones power down. (Scoring, timing and the answer check are
    untouched; the regression is identical.)
  - Explosions are layered: a flash, a fireball, smoke that lingers, bolts of
    debris, on top of the sparks and the shock ring.
  - Space: nebula baked at 2048, 3,700 stars with sharper cores, a cold backlight
    behind the demon so its outline reads against the dark, the nebula region
    recoloured blue so the purple demon stands off it.
  - Fighter: sits lower so it never covers a drone, picks up a rim of the scene's
    key colour, and its shield dome shows only on impact (it used to draw a
    faint bubble all the time).
  - Demon: a touch smaller and higher so the drones have their own band; rim
    light stronger; the hit flash is weighted to the silhouette; the weak-device
    version is no longer built.
  - Focus follows the demon; the fighter is always sharp. Speed streaks are
    fainter. Bolts are thinner and brighter.
  - Interface fixes found in this pass: ligatures off in the question font (an
    "fi" pair was fusing), a larger and brighter hint line, a balanced verdict
    line on the results sheet, the trophy toast drops below the HUD, a lighter
    backdrop behind dialogs.
  - Reviewer's resemblance notes: a rear-chase camera behind a fighter is common
    to the genre (no shared designs); a horned dark demon is a broad archetype
    (the model is the owner's own file). No direct lifts found.
- **K5 to K7, second pass (before the reviewers)**. Found from my own captures:
  - Shared: surface relief (grain, scratches) now fades out where it would be finer
    than a pixel, so far-off armour, gold and gears no longer sparkle; the broad
    relief stays. `08-fx.js`.
  - Nest Egg Run: traffic is about three times as thick (up to 8 a side on the
    service lanes, 11 in the hover lanes), spawns only into a clear slot, holds a
    gap behind a slower vehicle with its brake lights on and pulls out to pass.
    The midday sky is a deep teal instead of grey, the sun keeps its colour, the
    coast's horizon is warmer, the far city is no longer blurred to blobs. The
    streak pill docks in the corner of the 3D strip (the HUD had no room for it).
  - Boss Rush: the amphitheatre has people in it (two rows a tier, about 1,300,
    lit by the arena's lights, bobbing, jumping when a blow lands, some with
    their arms up), glow sticks above them, aisle lights down each tier. Armour
    relief is a soft hammered plate instead of glitter. The final boss has a new
    head (see the originality notes): an examiner's square cap with a lit tassel,
    a monocle on a chain, a row of answer bubbles for a mouth.
  - Final Exam: a halo of runes turns slowly behind the boss (marks made up
    stroke by stroke, a ring of ticks turning the other way, a faint disc of
    light); it writes depth so the lens keeps it in focus; it goes out with the
    boss. A chosen answer is filled with its own slot colour (it was only a
    slightly thicker outline), which says nothing about right or wrong.
  - Memory Bank: card faces have a fine banknote-style pattern and a lit top.
  - Interface: a boot splash (logo, sweep bar) is on screen from the first paint
    until the title is up; stage numbers are bevelled keys; Setup's two-line
    effect names no longer overlap and every two-way switch sits to the right of
    its label.
  - Capture tool: clicks go through the DOM (Playwright's click waits for two
    steady frames, which at several seconds a frame timed out and silently
    skipped the exam's answers).
- **K5, Nest Egg Run and Boss Rush** (`21-racer.js`, `21b`, `21c`, `22-boss.js`,
  `22b`, `03-data.js` names, `08-fx.js`, `04b`, CSS). R1 to R4, X1 to X4.
  Reviewer (first pass): detail 3, lighting 2.5, materials 2, depth 3, motion 3,
  cohesion 3, legibility 3.5. Its seven points and what was done:
  1. Bosses merged into the stands; spotlights lit nothing; the crowd read as
     confetti. Now each boss is edged from behind in its own colour (and that
     colour paled), lit from below in front in its colour, and stands in a pool
     of its light with its shadow in the middle; the key is stronger; the stands
     are darker and duller; glow sticks are half as many, smaller and dimmer; the
     final boss is lit 30% harder.
  2. Striped sun and neon lanes were stock synthwave. The sun of this road is
     now a golden egg (fuller below its middle, a sheen, speckles, no stripes)
     that grows with the nest egg.
  3. Bloom swallowed the bosses' feet and the first answer cropped them. Floor
     glow is lower; the boss is a little smaller and stands higher in the strip
     with floor under it.
  4. The coast was grey-beige haze. It has its own colour script: a deep
     sea-blue sky over a coral horizon, clearer air.
  5. The car was a matte black box whose louvred rear read as a film car. The
     shell is champagne-gold lacquer under the gunmetal armour; the louvres are
     gone (open glass, a spine fin, two rails); the tail lamps are one blade with
     an upright at each end.
  6. Lanes and answers were not linked. Each lane has its letter on the road
     ahead of the car in the answer's colour; signs are drawn at three times the
     resolution.
  7. Fringe at rest smeared edges; labels were faint; boost and crash looked
     alike. The lens's own fringe is a trace (default 0.25, was 0.8); question
     labels are brighter; a crash tears the picture in bands and goes red with no
     radial streak; a boost streaks without smearing.
  - Originality (reviewer's list and my call): the film-car rear, the final
    boss's name and skull, and the scribe's cluster of red eyes are redesigned
    (the final boss is THE PROCTOR; the scribe has one eye and a jeweller's
    loupe; one boss line that echoed a film catchphrase is reworded). Kept, as
    conventions no one owns: hearts for lives, four answer colours, block-built
    robots, a neon road.
- **K5, second review** (a fresh reviewer, after the fixes above): detail 2.5,
  lighting 2.5, materials 2, depth 2.5, motion 3, cohesion 2.5, legibility 3.5.
  (Stricter than the first; several of its points came from the contact sheet
  itself: four of the six boss cells showed the same boss, and thin cyan and
  magenta trim reads as colour misregistration when a frame is shrunk to a
  sixth of its size. At full size the frame is clean.) Its points and outcomes:
  1. One boss repeated, limbs lost in the dark, a blown-out white chest with no
     print on it. The Fine Print's chest is now a page: a heading, seventeen
     lines of print that shrink down the page, three clauses lit in its colour,
     two folds, a turned corner, a signature line, a wax seal with ribbons, on
     paper dark enough not to clip. (The sheet for the next look shows four
     different bosses.)
  2. Colour split at rest: none in the full-size frame; no change beyond the
     lens fringe already lowered.
  3. Lane letters small and grey. Each lane's tag is now a tile in the answer's
     colour with a dark letter, like the answer's badge, larger and further up
     the road.
  4. Car: roof burned out, jammed against the answers. The roof is gunmetal
     again; the camera is higher and further back and aims lower, so there is
     road under the car's tail.
  5. Egg a flat pale ellipse; mustard skies; sparse props. The egg is shaded as
     a shell (lit from upper left, shade lower right, a bright rim, a sheen,
     speckles of two sizes) at lower intensity so the gold holds; the desert
     sky runs violet to amber and the mountain's indigo to lilac; the desert has
     2.4 times the cacti, twice the rocks and 70 pieces of scrub, the pass 2.5
     times the pines and three times the rocks.
  6. Arena: crowd on flat bands, hairline ring. The stands fall back into haze
     (fog 24 to 86, was 26 to 120); the floor ring is drawn at three times the
     resolution with heavier lines, larger and brighter.
  7. Interface: the boss's charge bar is labelled BOSS ATTACK; the verdict
     headline's glow is tight so its letters stay clean; the hint line is a
     size larger.
  - Resemblances it named: a single red lens (the scribe's loupe now glows in
    the boss's own colour, with a dark pupil, not a red eye). Car from behind on
    a neon road under a low sun, and block-built robots, are the genre and the
    house style; kept.
- **K7, interface** (`style.css`, `00-util.js` icons, `09-trophies.js`, `05-ui.js`
  confirm, `32-stats.js`, `30-results.js`, `body.html` splash). U1 to U6.
  Reviewer: detail 2.5, lighting 2.5, materials 2, depth 2.5, motion 2.5,
  cohesion 3, legibility 3. Its seven points and what was done:
  1. Panels were flat fills. Every tile, panel, stage row, review item, search
     hit, trophy row, mastery row, rank chip and Setup row is one lit-glass
     panel (a bright top edge, a violet glow, a soft drop, blur of what is
     behind); Setup's rows are panels instead of text between dashed rules.
  2. Colour had no roles. A stat's value is white unless its colour means
     something (green: mastery or a good rate; yellow: a reward; red: a poor
     rate); accuracy is coded the same way on Stats and on results; dialogs
     share one violet frame and only the title takes the context's colour.
     Submitting an exam with blanks is an amber dialog whose filled button is
     KEEP WORKING (SUBMIT is an outline); with nothing blank it is green as
     before. Same two buttons, same actions.
  3. Small type. The secondary colour is brighter everywhere (#bdb4ee); stage
     and tile labels are a step larger; the Stats note is in the reading face;
     locked trophies are not dimmed: they carry a lock.
  4. Switches. A selected OFF is plainly off (grey, no glow); effect chips are
     tinted keys with a lamp that lights when on.
  5. Numerals. A hard drop shadow only; values are larger (long sums of money
     keep the smaller size so they stay in their tile).
  6. Results. Stars are 38 px and arrive one after another; no orphan words
     (balanced wrapping); the rank bar has weight.
  7. Trophies and focus. Each of the 16 trophies has its own pixel emblem (a
     token, a flame, a bolt, a gear, a crested helmet, chevrons, cards, a sword,
     a sight, a crown, a gem, a rocket, a purse, a ticked box, a rosette, a
     book), also on the unlock toast; the focus ring is a solid white outline.
  - Earlier in this checkpoint: the boot splash, bevelled stage numbers, the
    neutral filled style for a chosen answer, faint scanlines on the panels'
    ground (with CRT glass on), a labelled boss charge bar, a one-line hint.
  - Resemblances: none named.
- **K6, Final Exam, Memory Bank, Strategy Guide** (`24-exam.js`, `24c`,
  `23-memory.js`, `31-guide.js`, `31b`, CSS). E1, E2, M1 to M3, S1, S2.
  Reviewer: detail 3, lighting 3, materials 2.5, depth 3, motion 2.5, cohesion 3,
  legibility 3. Its seven points and what was done:
  1. The end of the pass cinematic was its emptiest frame, with a large flat
     orange shard. Wreckage is shaded inside and out; its heat is veins of glow
     that die down to embers instead of a flat fill.
  2. Memory Bank: the card hides the door's hub; banking barely shows in a
     still. Kept by design: the dial ring is built to frame the card, and what
     is read comes first. Banking is a coin that flies for most of a second,
     sparks, a shock ring, the dial spinning and bolts sliding back (none of it
     in a frame taken a third of a second in); a BANKED / BACK IN THE DECK label
     now marks the moment where the card was.
  3. A chosen exam answer filled with its slot colour, and a green or pink fill
     can read as a verdict. Every chosen answer now has ONE neutral fill (pale
     violet glass, a white ring); the slot colour stays on the badge and border.
  4. Results were a bare form. The odd last tile takes the full row; chapter
     fractions are larger; the scene behind shows through more at the top.
  5. Micro labels. HUD tags, card captions and stage lines are a size larger
     and lighter; long labels break evenly. The book's own page numbers
     ("4•30") are card data and are left as they are.
  6. Exam boss: helmet clipped, halo cropped to two arcs. Lower key and
     exposure; the halo is sized to fit inside the window on a phone.
  7. Guide: the rose window read as a loading spinner; search left room for two
     results; four filled buttons competed. The window is filled panes (a gold
     hub, eight inner and sixteen outer panes, thin leads); while there are
     search results the archive folds to a strip; a chapter has one filled
     button (BLASTER) and three outlines.
  - Resemblances it named, and my call:
    - The exam mech's crest and twin ear antennae, with red and blue light, read
      as a famous film robot; its skull as another. The model is the owner's
      own file. Done here: it is lit in violet and gold (no red and blue), its
      heat and its death glow are amber, its eyes violet-white. Not done: its
      head shape cannot be changed without remodelling the file; flagged in the
      report as the owner's call.
    - The rune ring: several marks read as real letters. Marks are now arcs and
      dots only.
    - A vault with gears echoes a game series whose vault door is itself a
      giant gear. Ours is a round combination-dial door with clockwork on it,
      which the brief asks for by name (gears, locks, coins, light panels);
      kept.

## Phase 0 audit list: outcomes

| Item | Outcome |
|---|---|
| G1 soft 3D picture | Fixed: the scene is drawn at the screen's own pixels, multisampled; text canvases at three times their size with full anisotropy; the lens fringe is a trace in the corners. |
| G2 bloom haze | Fixed: 13-tap bright pass, seven-level chain, tent upsample, a higher threshold per scene. |
| G3 no depth cues | Fixed: ambient occlusion, contact shadows, depth of field, contact-shadow discs under the bosses. |
| G4 tiers and auto-scaling | Fixed: one mode. Two files still hold unused weak-device code (the fighter's and the exam mech's plain twins); nothing calls it. |
| G5 small in-scene text | Fixed: supersampled text canvases; lane signs and the floor ring redrawn at three times the size. |
| G6 flat surfaces | Fixed: relief, scratches and smudges on every PBR surface (fading out below a pixel), facade and hull materials on the title, printed art on the cabinets. |
| G7 one palette | Fixed: a colour script per scene (blue space behind the purple demon, each boss lit in its own colour, the exam in violet and gold, a sea-blue coast, a violet-to-amber desert, an indigo pass). |
| G8 plain motion | Fixed: camera motion blur, arrivals and dialogs that rise and pop in, stars that arrive in turn, a boot splash. |
| T1 to T6 title | Fixed (K2). |
| H1 to H4 hub | Fixed (K3). |
| B1 to B6 Risk Blaster | Fixed (K4). |
| R1 fringe, crash tearing | Fixed: fringe is a trace; a crash tears in bands for half a second with an eased colour split and no radial smear. |
| R2 dark blocky car | Fixed: champagne-gold shell, open rear glass with a spine fin, one light blade, a rim light from the sun's side. |
| R3 flat road and boxes | Fixed: the wet road mirrors the scene; lane tiles in the answers' colours; the clockwork city keeps its detail in the distance. |
| R4 thin traffic | Fixed: about three times the traffic, with spacing, following and passing; denser plants and rocks in the desert and the pass. |
| X1 flat-shaded bosses | Fixed: armour relief, rim of their own colour, panel seams; the scribe carries a page of print. |
| X2 bare arena | Fixed: four tiers of stands with about 1,300 spectators, glow sticks, aisle lights, haze. |
| X3 flat light, no shadow | Fixed: key, two rims and an under-light in the boss's colour, a pool of light and a contact shadow. |
| X4 black entrance frame | Justified: the first half second is the screen's power-on wipe, the same on every game. |
| E1 film-robot look of the exam mech | Partly fixed: eyes violet-white, light violet and gold, heat amber. Its head shape is the owner's model and is unchanged (flagged). |
| E2 dark empty hall | Fixed in part: a halo of runes behind the boss that fits the window; the hall itself stays dark on purpose (the earlier brief asked for a boss that fills the frame). |
| M1 flat card over the vault | Justified and improved: the card is the page's own (so its text stays sharp and selectable) and flips in 3D; it now has a patterned face and a lit top. The dial ring is built to frame it. |
| M2 soft, flat gold | Fixed: relief and scratches on gold, steel and chrome, with no sparkle. |
| M3 banking and missing barely show | Fixed: the existing coin, sparks, dial and bolts, plus a label where the card was. |
| S1 library is a banner | Justified and improved: reading comes first, so the archive stays in one window; more of it shows round the list, and it folds away while searching. |
| S2 sparse shelves | Fixed earlier in the pass (K6 first pass: denser shelves, holo-books, pages) and the rose window is filled panes. |
| U1 flat panels | Fixed: one lit-glass panel everywhere. |
| U2 flat buttons | Fixed: lit faces, glow, press, sheen; one filled button per group. |
| U3 long flat lists | Fixed: panels per row, role colours, trophy emblems. |
| U4 plain HUD bars and badges | Fixed: lit bars with a bright leading edge, labelled boss charge, a docking streak pill. |
| U5 flat results | Fixed: large stars arriving in turn, balanced text, full-width last tile. |
| U6 no choreography | Fixed: arrivals, dialogs, the boot splash. |

## Originality audit (K8)

Every resemblance a reviewer named, or that I found, and what was done.

| Where | What it resembled | Outcome |
|---|---|---|
| Title: ad blimps over a rainy sign canyon | a well-known film's city | Redesigned: twin-hulled sky-ferries with cabin windows, no screens |
| Title and racer signs: "CLHIA" | a real association's acronym | Replaced by a product name from the course |
| Nest Egg Run: striped sun | the stock synthwave sun | Redesigned: a golden egg that grows with the nest egg |
| Nest Egg Run: the car's louvred rear, boxy silver-black body | a famous film car | Redesigned: gold shell, open rear glass, spine fin, one light blade |
| Boss Rush: the final boss (a skull, red eyes, the name THE EXAMINATOR) | a famous film cyborg | Redesigned and renamed: THE PROCTOR, an examiner's square cap, a monocle, answer bubbles for a mouth |
| Boss Rush: the scribe's cluster of red lenses, then its single red lens | film machines | Redesigned: one small eye and a loupe lit in the boss's own colour |
| Boss Rush: "I AM the law" | a comic character's catchphrase | Reworded |
| Final Exam: the mech's red eyes; red and blue light on it | film robots | Eyes violet-white; light violet and gold; heat amber |
| Final Exam: the mech's head (crest, two ear antennae, a skull face) | film robots | Not changed: the model is the owner's own file and its shape cannot be altered here. Flagged in the report |
| Final Exam: rune marks that read as letters | real scripts | Redrawn as arcs and dots |
| Risk Blaster: a rear view of a fighter | the genre's usual camera | Kept: no shared designs |
| Risk Blaster: the demon | a broad archetype | Kept: the owner's own model |
| Memory Bank: a vault with gears | a game series' gear-shaped door | Kept: a round dial door with clockwork, as the brief asks |
| Everywhere: hearts for lives, four answer colours, block-built robots, a neon road, three-star ratings | conventions of the form | Kept |
| Boss names PERIL PRIME and PROBATRON | common suffixes | Kept; listed here for the owner to judge |

## Final scores (K8)

Two sets of numbers, and they are not the same thing.

**Independent reviewers, first look** (sub-agents that had not seen the work, told
to be strict: "5 means shippable in a top-tier commercial game"). Each review was
followed by a fix pass; only Nest Egg Run and Boss Rush were looked at a second
time, and that second reviewer scored no higher than the first.

| Screens | Detail | Lighting | Materials | Depth | Motion | Cohesion | Legibility |
|---|---|---|---|---|---|---|---|
| Title | 3 | 2.5 | 2.5 | 3 | 2.5 | 3 | 3.5 |
| Hub | 2.5 | 2.5 | 2 | 2.5 | 2 | 3 | 3 |
| Risk Blaster | 3 | 2.5 | 2 | 2.5 | 2.5 | 3 | 3 |
| Nest Egg Run and Boss Rush (first) | 3 | 2.5 | 2 | 3 | 3 | 3 | 3.5 |
| Nest Egg Run and Boss Rush (second) | 2.5 | 2.5 | 2 | 2.5 | 3 | 2.5 | 3.5 |
| Final Exam, Memory Bank, Strategy Guide | 3 | 3 | 2.5 | 3 | 2.5 | 3 | 3 |
| Interface | 2.5 | 2.5 | 2 | 2.5 | 2.5 | 3 | 3 |

**My own scores for the final build** (after every fix pass; not re-scored by a
reviewer):

| Screen | Detail | Lighting | Materials | Depth | Motion | Cohesion | Legibility |
|---|---|---|---|---|---|---|---|
| Title | 4.5 | 4 | 4 | 4.5 | 4.5 | 4.5 | 5 |
| Hub | 4.5 | 4 | 4 | 4.5 | 4 | 4.5 | 5 |
| Risk Blaster | 4.5 | 4.5 | 4 | 4.5 | 4.5 | 4.5 | 5 |
| Nest Egg Run | 4.5 | 4 | 4 | 4.5 | 4.5 | 4.5 | 4.5 |
| Boss Rush | 4 | 4.5 | 4 | 4 | 4 | 4.5 | 5 |
| Final Exam | 4.5 | 4.5 | 4.5 | 4.5 | 4 | 4.5 | 5 |
| Memory Bank | 4 | 4 | 4 | 4 | 4 | 4.5 | 5 |
| Strategy Guide | 4 | 4 | 4 | 3.5 | 4 | 4.5 | 5 |
| Interface | 4.5 | 4.5 | 4.5 | 4.5 | 4 | 4.5 | 4.5 |

The brief's bar is 4.5 on every axis of every screen. By my own scoring that bar
is met on about half the cells and missed by half a point on most of the rest;
no independent reviewer has scored any screen at 4.5. What holds each back:

- Materials (4 almost everywhere): the house style is flat-shaded, block-built
  geometry with procedural relief. Reviewers read it as "voxel"; it is the
  arcade's look, and changing it means remodelling everything.
- Boss Rush detail and depth: twelve bosses share one armour kit and one stance;
  only two were restyled in this pass.
- Memory Bank and Strategy Guide depth: both are reading screens, and the card
  and the list sit in front of the scene on purpose.
- Motion (4 in places): judged from stills by the reviewers; I could not watch
  the game at speed here either (software rendering runs at seconds a frame at
  full density), so motion was checked by stepping time, not by eye.

## Not done, and why (K8)

- **The exam mech's head shape.** A reviewer says its crest and two ear
  antennae, with its skull face, read as well-known film robots. Its light and
  colours were changed; its shape is the owner's supplied model and was not
  altered. Options for the owner: supply a different model, or ask for the
  antennae to be trimmed in the converter (possible, about an hour's work, and
  it changes their model).
- **A second independent review of every screen.** Done only for Nest Egg Run
  and Boss Rush. Each review costs about 100,000 tokens, and the standing
  instruction is to finish inside the usage limit.
- **Up to eight passes per screen.** Each screen had two to four (a first pass,
  one or two of my own, and one after its review).
- **Frame rate on a real device.** Not measured. One mode at full pixel density
  is heavy: on the software renderer here it is seconds a frame. On a recent
  phone it may run at 20 to 30 frames a second, or lower; Setup's effect
  switches (depth of field, ambient shade, bloom) are the lever. The game clock
  slows below 20 frames a second, as it always has (the time step is capped at
  1/20 s), so questions never time out early.
- **Kept against the letter of the brief, on purpose:** Reduced effects,
  `prefers-reduced-motion`, the cap of three flashes a second and the per-effect
  switches (accessibility, and a way out if a device struggles); capability
  fallbacks where a browser cannot do something (no multisampling or depth
  texture; a missing or damaged model).
- **Unused weak-device code** remains in `20d-blasterfighter.js` and
  `24c-examboss.js` (plain twin materials). Nothing calls it; removing it is a
  clean-up with no visible effect.
- **Sounds** were not touched in this pass.

## Before and after

Contact sheets (before on top, after below) are in `arcade/docs/polish-pass/`:
title, hub, Risk Blaster, Nest Egg Run, Boss Rush, Final Exam, Memory Bank with
the Strategy Guide, and the interface. The before frames are the build in
`arcade/backup/index.before-ultimate-polish.html`.

## Second round on the four lowest screens

After the close-out the owner asked for the work to go on. The four screens with
my lowest scores each had another pass:

- **Strategy Guide (pass 4).** Depth was 3.5. Light now pours down the nave from
  the rose window (god rays); the lens holds the lecterns (depth of field); two
  brass lanterns and six pages hang close to the lens and go by out of focus,
  so the view has a near, a middle and a far; 32 pages drift down the nave
  (was 22); the window on the list is taller (32% of the screen's height).
- **Memory Bank (pass 4).** The gold read as flat yellow under a haze. The
  spotlights' shafts and pools over the bars are less than half as bright, the
  gold is a little short of pure metal so each face of a bar shades differently,
  two mint rim lights from behind edge every bar, coin and gear tooth, and the
  grade is firmer (less bloom, more contrast).
- **Boss Rush (pass 5).** Two curtains of mist in the boss's colour drift past
  each other between the fight and the stands (brighter for a moment when a
  blow lands); footlights ring the floor at the foot of the stands; the armour
  is more polished (it shows the arena's lamps) with a stronger rim of its own
  colour.
- **Hub (pass 4).** The lamp over the cabinet in front throws a shaft you can
  see, in the cabinet's colour, with dust turning in it and a pool of light on
  the floor; all three follow the selection and come up with its power.

### Second independent look (after the second round)

A fresh reviewer, told that the pixel font and block-built figures are the house
style and to judge execution within it. Scores are detail, lighting, materials,
depth, motion, cohesion, legibility:

| Screen | Scores | Average | First look |
|---|---|---|---|
| Hub | 4, 3.5, 3, 3.5, 3, 4, 4 | 3.6 | 2.5 |
| Boss Rush | 3.5, 3, 2.5, 3, 3, 3.5, 4 | 3.2 | 2.6 to 2.9 |
| Memory Bank | 3, 2.5, 2.5, 2.5, 2.5, 3, 3.5 | 2.8 | 2.9 (with the exam and guide) |
| Strategy Guide | 3, 2.5, 2.5, 3, 2.5, 3.5, 4 | 3.0 | 2.9 (with the exam and vault) |
| Final Exam | 3.5, 3, 3, 3, 3, 3.5, 4 | 3.3 | 2.9 (with the vault and guide) |

Up by about half a point to a point where a comparison exists, and still well
short of 4.5. Its eight points and what was done (pass 5 or 6 for each screen):

1. Memory Bank: the card read as a pasted web panel and banking left the vault
   unchanged. The card is a brass-framed plate with a rivet in each corner and a
   cast shadow, with a larger term; the coin piles by the bullion start two
   coins high and gain a coin for every card banked; the deck lamps are brighter.
2. Boss Rush: one hue flooded boss, stands and floor. The far mist is deep
   indigo, the near mist fainter, and one of the two back lights is the boss
   colour's complement, so the figure stands off the room.
3. Boss Rush: speckle on the armour, a brown crowd, diamonds adrift. The rim
   follows the plate's true shape (not its grain) and the grain is finer;
   spectators are fewer, larger and in brighter clothes; the pillars are lighter
   and their caps are smaller lamps.
4. Strategy Guide: the archive was murky with no focal point. A reading desk in
   the middle of the nave carries a great ledger of gold light under its own
   lamp; exposure is up; pages are fewer and none crosses the middle near the
   lens; the lens holds the desk.
5. Boss Rush hit: a white veil over the frame, unreadable faded answers. The
   burst is smaller and at 60% strength; an answer you did not pick stays at
   70% (was 45%), in every game.
6. Final Exam: the chosen answer read as a hover; the robot's lower half sank
   into black; the halo barely showed. A chosen answer is a pale solid plate
   with dark text; a low fill light lifts its chest and arms; the halo's marks
   and ticks are about 40% brighter.
7. Small type: the charge bar's label sits at the far end with an outline; the
   guide's count line never breaks between a number and its noun; card hints
   are in the reading face, larger, on one line.
8. Hub: neighbours near-black. The room's fill is about 30% brighter. Signs cut
   off by the frame edge are left as they are (the camera moves; they are
   whole at other moments).

- Found by my own check at 360 by 640 (a small phone): the boss's speech bubble
  covered the title of the explanation sheet after a wrong answer. The bubble
  now sits just above the sheet whenever one is up.
- Resemblances it named, both mild: the exam robot's pale skull face in purple
  armour (a cartoon villain), and the vault's cog-ringed door (a game series).
  The skull is the owner's model; the purple is mine and replaced red and blue,
  which another reviewer tied to a film robot. Any strong colour on a
  skull-faced robot will recall something; flagged for the owner.

### Second independent look at the other four screens

A fresh reviewer (same brief, had not seen the work) looked at the title, Risk
Blaster, Nest Egg Run and the interface. Scores, in the order detail, lighting,
materials, depth, motion, cohesion, legibility:

| Screen | Scores | Average |
|---|---|---|
| Title | 3.5, 3.5, 3, 3.5, 2.5, 4, 3.5 | 3.4 |
| Risk Blaster | 3.5, 3, 3, 2.5, 3.5, 3.5, 3.5 | 3.2 |
| Nest Egg Run | 3.5, 3.5, 3, 4, 3, 3, 3 | 3.3 |
| Interface | 2.5, 2, 2.5, 2, 2, 4, 3.5 | 2.6 |

Its eight points and what was done:

1. Nest Egg Run: the lane letters were tiny tiles lying flat. Each lane now has
   the answer's own badge standing in it (the disc from the answer's button,
   a lozenge for TRUE and FALSE), on a stem of light over a strip of its colour;
   the lane taken stands taller and brighter. Risk Blaster's drones carry the
   same badge, so an answer looks the same wherever it is shown.
2. Hero car: the roof and rear deck burned out to white bars (a low sun mirrored
   off them into the chase camera) and the tail sat in a pink haze. Plates that
   face up have a satin finish and no clearcoat; the tail lamps and their trails
   are about a third dimmer; a rim of sky light on every edge turned from the
   camera gives the car its outline.
3. Interface: lists with no pictures, results with no art and the way on below
   the fold. Stage rows carry a portrait (the stage's client, or in Boss Rush a
   pixel bust of that boss: twelve, one drawn for each); each world sits under a
   banner with its emblem; results open with a medal (the boss fought, or the
   game's emblem) over slow rays; PLAY AGAIN, CHANGE STAGE and ARCADE are pinned
   to the foot of the screen.
4. Title: an empty road between skyline and button, a weak lightning frame, a
   logo from edge to edge. Cars, a bus and trucks now run the kerb lanes close
   to the camera, mirrored in the wet road; a strike lifts the picture twice as
   far and its light hangs for half a second on sky, towers, traffic and logo;
   the logo is about 13% smaller, with air either side.
5. Risk Blaster feedback: right was shown only by green, which is also the
   fourth answer's colour. A tick is pinned to the right answer's badge and a
   cross to the wrong one's, in every game (after the answer only; the Final
   Exam shows neither before submit, as before).
6. Risk Blaster: dark wings sank into the nebula; little depth; small fighter.
   An eclipse (a thin limb of cold light with a corona) sits behind the demon,
   its rim lights are about a third stronger, rocks tumble past in every region,
   and the fighter is about 15% larger.
7. Nest Egg Run HUD and city: clutter behind the figures, two unlabelled bars,
   the egg buried by gear trains and reading as a grey moon. The HUD of every
   game sits on a shade; the bars are labelled GOAL (to $1M) and TIME; the dawn
   egg is higher, deeper gold and haloed; the great wheels hang over the kerbs,
   so the middle of the street is open to the egg.
8. Type and controls: joined letter pairs, invisible empty stars, an unfilled
   OFF, ragged effect chips. Ligatures are off on every element (the font
   shorthand had switched them back on wherever an element set its own font);
   an unearned star is a dim violet star; a switched-off switch is filled
   violet; the effects are a two-column list, one line each.

- A class-name clash found on the way: the new world banners used a class the
  rank-up banner already owned and vanished under the list; renamed.
- Resemblances it named: the chase toward a low sun is the genre's lineage,
  "not a copy"; the title is the stock synthwave poster (the brief asks for a
  synthwave city); the client portrait "may read as" a blocky game character
  (it is a plain 24 by 24 pixel face with hair, glasses and a collar; left as
  it is and flagged). Demon, fighter and drones: none.

### A fault found on the way, and a new test

While capturing Risk Blaster and then Nest Egg Run on one page, the second game
never left its intro. Cause: Risk Blaster's teardown called a `dispose` method
that its blast-smoke system did not have. The error stopped the scene change
half way, so whatever was started next after a game of Risk Blaster (another
game, or PLAY AGAIN) could hang at its intro. It came in with the Risk Blaster
polish pass (commit 9f88559) and was in every build since, including artifact
version 25. The method now exists; the scene tears down cleanly.

Why the regression test did not catch it: it opens a fresh page for every play,
so no scene is ever torn down. There is now a second test that does exactly
that:

    node scripts/arcade-sequence.js

It starts thirteen things in a row on one page (Risk Blaster, Nest Egg Run,
Boss Rush, Memory Bank, Final Exam, Risk Blaster twice more, the hub, Nest Egg
Run, the title, Boss Rush, the Strategy Guide, Memory Bank), each while the one
before is still up, and fails if any step does not reach its playing state or
anything throws. On the last committed build it fails at the second step; on
this build all thirteen pass. Run it with the regression test after every
change from now on.

The regression's comparison of the results screen now leaves out the button
labels at its end: the buttons were moved (three pinned to the foot of the
screen, the notes link left in the list), which changes the order their labels
are read in and nothing else. Its verdict line says so. Everything before the
buttons must still match the baseline exactly.

Also in this round, after the eight points:

- Stats opens on a rank card: a medal with your level on it, the rank's name,
  XP and how far to the next rank.
- Nest Egg Run downtown: the street is a slot between towers, so the egg could
  never be seen whole there. Downtown (and in the tunnel) it is drawn small
  enough to stand in the gap at the end of the road; in open country it is the
  size of the sky, as before.
- Risk Blaster's eclipse was first built at four times the demon's size (the
  model is one unit across, not four), which only fogged the picture; it now
  runs just outside the wing tips.

## Round M: renames, dead code out, a fresh review of every screen

The owner's instructions for this round: raise every screen to 4.5, lowest
first; a separate reviewer for every screen; rename PERIL PRIME and PROBATRON
and anything else that sounds like a franchise; delete the unused weak-device
code; re-run the regression; update this file and the pull request.

Checkpoint log (newest last):

- M1 names. PERIL PRIME is now PERILMONGER and PROBATRON is now PROBATE
  TOLLGATE (data, dialogue, comments). The final boss's own lines still said
  THE EXAMINATOR although it was renamed THE PROCTOR two rounds ago: fixed.
  Four lines of boss dialogue echoed well-known film and television lines and
  were reworded ("Kneel before", "does not compute", "live long and", "good,
  good"). The streak levels were HEATING UP, ON FIRE and UNSTOPPABLE (the first
  two are a basketball arcade game's announcer); they are now COMPOUNDING, BULL
  RUN and BLUE CHIP, and the ten-in-a-row trophy takes the last name. The line
  after a coin goes in was PLAYER 1 READY (a novel and film title backwards);
  it is GET READY!. The sixteen made-up titles on the hub's background
  cabinets were replaced with ones a web search found no game for (several of
  the old ones were real games: Voidrunner, Star Fury's ships, Turbo, Hyper
  Ball in a monster-catching series). A separate agent searched every name in
  the game; its table is under "Name audit" below.
- M2 dead code. The quality ladder went two rounds ago but its branches stayed:
  plain "twin" materials and light meshes for weak devices, `cheap` and `lite`
  switches that were always off, layers that existed so weak levels could drop
  decoration. All of it is gone: from the three model files (fighter, exam
  boss, demon: a simplified hull, three unlit materials, the code that built
  and swapped them), the shared model helper, the graphics core (twinOf,
  cheapen, setQ, the ladder's notes, the decor layers), every scene's `cheap`
  and `lite` branches, the weak-device HUD styles, and forty-seven decor tags.
  What the one mode draws is unchanged. Reduced effects, the system
  reduced-motion setting, the three-flashes-a-second cap and the Setup switches
  are untouched. The saved settings object still carries three old keys
  (`pixel`, `gfx2`, `quality`) that nothing reads: left alone, because saved
  progress and sync must not change shape. Build: 21 KB smaller.
- M3 reviews, first three screens (lowest first). Each reviewer was a fresh
  agent that had not seen the work, given a contact sheet and full-size frames
  and a stated scale (5 ship as is, 4.5 one or two nits, 4 good with visible
  weaknesses, 3 competent but plain). Scores in the order detail, lighting,
  materials, depth, motion, cohesion, legibility:

  | Screen | Scores | Average |
  |---|---|---|
  | Strategy Guide | 3.5, 3.5, 3, 3.5, 3.5, 3.5, 4 | 3.5 |
  | Memory Bank | 3.5, 3, 3, 3.5, 3, 3.5, 4 | 3.4 |
  | Boss Rush | 4, 3.5, 3.5, 4, 3, 4, 4 | 3.7 |

  Each listed twelve weaknesses. What was done:

  **Memory Bank** (pass 6). The reviewer's first point: "not a vault": only
  slivers of the door showed above and below the card. The vault now stands
  whole in a window over the card (door, handwheel, bolts, the lamps' arc, the
  gold at its foot); the card keeps its full height first and the window takes
  the rest. One lamp per card runs over the door, countable unlit, bright when
  banked, red for a moment on a miss. Every card banked drops a gold bar onto
  the heap as its coin goes into the slot. Dial numerals only on the upper arc
  (below, they hung upside down). Floor mirror quieter, no smeared highlights.
  Bars are larger with a tone for each face. Card header is one line (the
  topic) with the card's state on a chip; hints say what a phone can do; the
  swipe hint shows for the first three cards only; grade buttons are 54 px
  tall; the thin progress bar is gone (lamps and BANKED say it). The gear
  trains run in straight lines like a clock's, not round the door (two
  reviewers said a door ringed with gear teeth leans toward a game series).
  Found on the way: on a 360-pixel-wide phone the back of a card was wider
  than the card (a one-line hint forced it) and the answer's text was cut off
  at the right. Fixed; checked at 360 and 320 wide.

  **Boss Rush** (pass 6). The attack bar is a labelled row, taller, ramping
  yellow to red; in its last quarter the bar and the question's frame pulse
  slowly. The wind-up is a pose: arms higher and wider, chest in, the boss
  grows and leans toward the lens, the floor's ring runs hot. An attack is a
  lunge at the lens. A lost heart flares and breaks. ENRAGED is a tag on the
  name plate with the bar edged red. A hit lights the boss, not the strip. The
  defeat is seen coming apart, with debris still falling when the banner comes.
  The entrance banner sits low on its own band and reads STAND BY, <name>
  ENTERS (it was WARNING, BOSS APPROACHING, a shoot-'em-up's line); the boss
  drops from just above the strip, not from behind the HUD. More fill light on
  black plate, less key and floor light on pale parts, a bigger contact
  shadow, the boss a little smaller in the strip. The crowd is a third darker.
  PRODUCT PUSHER wears a slate-blue suit with lit lapels and carries a tan
  case half as big again. THE PROCTOR's cap has gold edges and a gold tassel.
  The speech bubble is a dark plate in the boss's colour. The explanation's
  verdict has its first word on its own line, larger; the page reference
  reads; NEXT is a full-width button; the focus ring is the arcade's yellow.
  Answers wrap without orphans and sit on a shade; the screen's foot has 14 px
  of margin.

  **Strategy Guide** (pass 6). The archive shows only in its window; the rest
  is solid ground (it glowed through the list and drifted under the text).
  The window has a bezel, a glint and a tab for its label. The rose window is
  jewel glass in dark leads (a gold eye, eight leaves, an amber band, sixteen
  round-headed lights) in a rim of cut stone; the near lanterns are amber
  flames in cages; the shafts of light are fainter. Chapter rows carry the
  clients' portraits and each world its banner, as on the stage lists. A
  chapter's page opens on a short eyebrow, three chips of figures, one filled
  action and two outlined; headings are larger than their text, in capitals,
  over a rule; the term that opens a line stands out; a numbered run sits one
  item to a line (same words, same order). While searching the window folds
  away entirely. Small type is larger. Not done: the book's own page notation
  ("6•3") stays as the book prints it.

### Name audit (round M)

A separate agent ran one or two web searches on every name in the game (a web
screen, not a trademark search) and judged the design ideas from general
knowledge. No name came back as a real conflict.

| Names | Verdict | Note and outcome |
|---|---|---|
| PRODUCT PUSHER, PERILMONGER, SOLVENCY SPECTER, GROUP GOLEM, LONGEVITY LICH, LORD INTESTATE, PROBATE TOLLGATE, PATRIMONY PHANTOM | clear | kept |
| INFLATION TITAN | clear | "titan" is a common word; kept |
| THE FINE PRINT, UNDUE INFLUENCER | minor | everyday phrases used as titles elsewhere; kept |
| THE PROCTOR | minor | an obscure comic villain and an ordinary job title; kept, flagged (the agent's alternative: THE INVIGILATOR) |
| NEST EGG RUN, STRATEGY GUIDE, INR ARCADE | clear | kept |
| RISK BLASTER | minor | no game of that name, but "<subject> Blaster" is how an old edutainment series named its games; kept because it is the owner's working name, flagged (alternative: RISK INTERCEPT) |
| BOSS RUSH, MEMORY BANK, FINAL EXAM | minor | generic terms; kept |
| Background cabinets: COMET CLASH, ASTRO MINER, GALE WING, NEON DRIFT, LASER GRID, PIXEL QUEST, SKY ACE, ROOFTOP DASH, NOVA RAID, ROBO BRAWL, DRAKE DUEL, SKYLIGHT SPRINT | minor | exact or near titles of small real games, or echoes | replaced with COMET SKIRMISH, REGOLITH RUSH, GALE GLIDER, NEON HAIRPIN, LASER LATTICE, PIXEL PILGRIM, STRATO ACE, SKYLIGHT SLALOM, NOVA SORTIE, TIN TUSSLE, WYVERN DUEL (each searched: no match) |
| Background cabinets: REDLINE RALLY, LANTERN MAZE, RIFT SKIPPER, BUMPER BLITZ, STACKWORKS | clear | kept |
| COMPOUNDING, FIRST COIN, HONOURS | clear | kept |
| BULL RUN, BLUE CHIP, QUICK DRAW, LIGHTNING, FEVER, HOT HAND, THE MACHINE, CENTURION, VETERAN, GIANT SLAYER, BOSS HUNTER, LAST ONE STANDING, DEEP SPACE, CARD SHARK, FLAWLESS, MILLIONAIRE, BOOKWORM | minor | everyday words that are also titles of something; none confusable as a label; kept |

Design ideas, the agent's verdicts and what was done:

- Golden egg as the sun of a synthwave road: the road is the genre's trope, the
  egg is original. Kept.
- Round vault door ringed with gear teeth: leans toward one game series. The
  gear trains now run in straight lines inside the door; its rim is bolts and
  rivets. No number on the door, no blue and yellow.
- A ring of light behind a winged demon: mostly generic; an eclipse behind a
  winged demon echoes a manga. It is a thin clean ring with a soft backlight,
  no dark disc; the notes no longer call it an eclipse.
- Hexagonal drones with lettered discs: generic. The answer shapes are discs
  and rectangles, not pointed lozenge bars, and the four colours are not a
  quiz app's colour-and-shape set.
- A black-armoured robot in a square academic cap with a monocle: generic and
  original; the helmet is nothing like a film villain's.
- A toll booth on tracks, a crowned skeleton with an hourglass, a hooded
  one-eyed wraith with a vault in its chest: generic or original. Kept.
- Supplied models (the exam mech, the fighter, the demon) are the owner's own
  files; their shapes are not mine to vouch for. Flagged as before.

### Round M, continued: every screen reviewed again, and what each review led to (checkpoint)

Each review below is a fresh agent that had never seen the project, given a
contact sheet and full-size frames of one screen, the house style to judge
within, a description of what moves, and this scale: 5 ship as is in a top
commercial game, 4.5 one or two nits, 4 good with visible weaknesses, 3
competent but plain ("be strict and do not round up"). Scores are in the order
detail, lighting, materials, depth, motion, cohesion, legibility. Every
review's full text is kept with the working files; its points and what was
done are summarised here.

**What the numbers show.** No screen has reached 4.5 from an independent
reviewer. Averages in this round run from 3.4 to 4.1 and do not climb with
the work: a new reviewer, shown a screen whose last reviewer's points had
been fixed, found a new list and scored it about the same or lower (Strategy
Guide 4.0 then 3.6; Arcade Hub 3.9 then 3.5 then 3.8; Memory Bank 3.9 then
3.6; Title 4.1 then 3.9). The scores measure a reviewer's severity as much
as the screen. The lists were useful every time; the averages are reported
as they came.

| Screen | Passes used | Independent reviews this round (average of seven) | Last review |
|---|---|---|---|
| Strategy Guide | 8 of 8 | 3.5, 3.4, 3.9, 4.0, 3.6 | 3.5, 3.5, 3, 3.5, 3.5, 4, 4 |
| Memory Bank | 8 of 8 | 3.4, 3.7, 3.9, 3.6 | 4, 3.5, 4, 3.5, 3.5, 3.5, 3.5 |
| Boss Rush | 7 | 3.7, 3.7, 3.6 | 3.5, 3.5, 3, 3.5, 3.5, 4, 4 |
| Title | 6 | 4.1, 3.9 | 4, 3.5, 3.5, 4, 4, 4, 4 |
| Arcade Hub | 6 | 3.9, 3.5, 3.8 | 4, 3.5, 3, 4, 4, 4, 4 |
| Nest Egg Run | 6 | 3.9, 3.7 | 3.5, 4, 3.5, 4, 3.5, 3.5, 4 |
| Interface | 7 | 3.6, 3.4 | 3.5, 3.5, 3, 3.5, 3, 4, 3.5 |
| Risk Blaster | 7 | 3.5, 3.5 | 3.5, 3.5, 3, 3.5, 3.5, 3.5, 4 |
| Final Exam | 7 | 3.7, 3.4 | 3.5, 3, 3, 3.5, 3.5, 3.5, 4 |

**Strategy Guide** (passes 7 and 8, then the last review's points). The
archive is a hall again, not a strip: tall shelves with lamp pools, a
gallery, lecterns with lit pages, a desk with a ledger under a shaded lamp,
two near lanterns, loose pages, and at the far end a rose window whose
colours fall down the hall as five shafts and lie on the floor. A chapter
opens under a banner that shows the rose in a two-tone print; three figures
and a ten-cell meter; notes set as pages (ruled, a turned corner) with
numbered runs one to a line. Search results lie on solid ground. The window
no longer animates its height (a redraw fault showed the hall through the
results once). Stage rows carry the ten-cell meter. Client portraits have
moods (smile, worry, frown), spectacles you can see through, earrings.
Not done from the last review: light from the rose and the lamps that tints
the shelves and the ledger (the shelves are lit by their own shader's pools,
not by the window), a rebuilt desk lamp and lanterns, less on a chapter's
first screen before the notes start, the terminal font's wide apostrophe.

**Memory Bank** (passes 7 and 8, then the last review's points). The door is
spun gold with a handwheel, a steel gear and four brass gears that mesh and
turn; an arc of lamps, one per card (violet unlit, green banked, gold in
hand, red on a miss for that one lamp); ingots stack on a lit plinth, one per
card banked; the corner heaps sit darker. The window pulses on its own frame
(green held for a beat on a deposit, red on a miss). The whole arc of lamps
now stands under the title strip. A fault found on the way: two fully opaque
page layers meeting round the window made the browser stop drawing the 3D
view inside it (see "Faults found" below). Not done from the last review:
magenta and cyan light in the vault, contact shadows under the earned bars,
bevelled gears, thickness and a sheen on the card as it flips.

**Boss Rush** (pass 7). Motes behind the boss, a white edge light from
behind, a stronger contact shadow, a darker and less saturated crowd, the
charge glow at the chest; the boss is fitted to the strip from its own
measured size; on defeat it comes apart (head, arms, forearms, hips and base
drift and turn) instead of shrinking; the verdict's tick or cross sits at the
right end of the answer; the attack bar hides during the finale. The capture
tool was the larger fault here: see "Faults found".

**Title.** The sun carries its gold higher and sits behind a tighter halo;
the skylines' windows are quieter; street traffic is darker with a cool rim;
each blade sign lights the wall beside it; the helicopter crosses the avenue
above the bridge instead of hanging in the middle; lightning strikes in the
side sky with a thin core; fewer drones in the ribbon; ferries have dark
hulls and stern engines; the wordmark stands on a feathered shade; a tip has
its heading on its own line and the plate holds the longest tip, so INSERT
COIN never moves.

**Arcade Hub** (passes 5 and 6). The card is one height for all six cabinets
(four lines of copy; the longest description steps its type down half a
pixel at a time until it fits; every word kept), with the dots in the stat's
row, each in its cabinet's colour. Each cabinet is framed for its own
height, so horns, clock and dish stand clear of the mission banner and the
floor shows in front. The cabinet is seen from a little to one side, so its
painted side panel shows. The room behind it is dimmer, hazier and further
out of focus; props beside the cabinets are lit by the room instead of
glowing flat, and stand half-way to the next cabinet. The pink wall tubes
run behind the marquees, not along the cabinets' top edges. The big sign is
cyan INR, pink ARCADE (Boss Rush's horns stood on a sign of their own pink).
Marquees have a field deep enough for their lettering in any colour. The
Strategy Guide's reading lamp lights its desk. Coins are gold, not mirrors.
New attract demos for the Final Exam (a pencil filling a bubble sheet under a
draining clock; no marks) and the Strategy Guide (an open book, a marker, a
page turn). The cleaning robot works the tiles in front of the cabinets and
is mirrored in them; the ceiling fans throw turning shadows on the wall. A
move between cabinets no longer smears the picture. The wall machines'
attract screens are bars and lines, not random squares (a reviewer saw
shapes from other games in the squares). After the third review: the dots
under the card are outlines in each cabinet's true colour with the current
one filled, and the reading lamps' beams are thinner.

**Nest Egg Run** (pass 6). A right answer is a clean reward: the car stays
sharp inside the speed streak (the pipeline now keeps an ellipse round a
scene's subject out of the streak and the colour split), the burst is the
lane's colour, the gain pops large over the car; the colours part on a crash
only. Badges are not mirrored in the wet road (a puddle showed one lane's
and not another's, which could pass for a hint). Gears are thick wheels with
a dark face, windows between the spokes, bright flanks and a lit ring; the
great wheels hang lower, inside the picture. Lane tiles are the lane's colour
at about 60% with a bright rim and a dark letter; lane dashes stop under the
two wide TRUE/FALSE tiles. The car's glass shows the street's lamps sliding
over it and holds the sky. A crash throws a fan of sparks and lays two skid
marks; while an explanation is up the picture rides higher so the car stays
in view above it. Walls have storeys with ledges, piers, glazing bars,
blinds and windows of many brightnesses; shopfronts have mullions. The HUD
row fits with two insurance shields in it. A loss's minus sign stands at the
middle of its figures. After the second review: the boost no longer splits
the colours (a crash does), and the picture is lifted by at most two fifths
of the strip while an explanation is up.

**Interface** (pass 7). One lit row on each stage list (the stage to play
next); a locked card is muted violet with a lock; stat tiles are sunken
read-outs with the figure on the bottom line, three to a row on results;
effect switches are quiet chips with a lamp; one secondary button skin
everywhere; boss pictures lifted off black on a plate; lists fade above a
pinned bar; the rank on results is a gold-edged strip with a thick bar and
the XP gained; the exam's grid fills answered cells, has a key and a line
above SUBMIT; a larger wordmark, a segmented bar and a floor grid on the
loading screen; a white focus ring; secondary text a step lighter. A chosen
answer is a solid violet plate in a white ring, the same for every slot (two
reviewers called the pale plate the brightest, least on-palette thing on the
screen). After the second review: stage rows, mastery rows and profile cards
show progress as ten cells, the exam grid's key is larger with a gold ring
for "here", captions are a step lighter, and the loading bar has a track.

**Risk Blaster** (pass 7). The demon is four fifths the size and a little
into the haze, lit by a cool key from the upper left; each drone stands in a
ring of its answer's colour; the pale hoop behind the demon is gone; small
lights on all three supplied models are a trace, not a glitter; the fighter
is steel with violet-blue and cyan light (magenta is the demon's); space is
darker with a tighter bloom; the demon breaks up as dark armour with burning
edges inside a tight white ring; the fighter rides clear of the first
answer; the scene fades into the answers; streak pips are larger; answers
break evenly.

**Final Exam** (pass 7). The ending is regraded: the armour stays dark and
its cracks and core burn (the whole figure used to glow one flat orange),
smoke is dark, the colours part less. The hall behind the boss has violet
light on its columns, stronger uplights and mist on the floor. The skull is
aged ivory with gloss and dark sockets. A stronger rim on fists and
shoulders. The bar under the HUD is the clock's yellow. Answers are a size
larger on a scrim; the flag button is a full touch target.

**Across screens.** Answer D is orange, not lime (two reviewers said a green
answer reads as "correct" before it is). The speed streak and the colour
split leave a scene's subject sharp. Shock rings are thin strokes.

### Faults found this round

- **A window onto the 3D view went blank** (Memory Bank). Two fully opaque
  CSS rectangles meeting round a transparent window made Chrome's compositor
  treat the canvas behind as covered and stop drawing it. The grounds are now
  99.6% opaque. Found by bisecting scene parts, then files, then CSS rules.
- **A possible one-frame glimpse of the next card's answer** (Memory Bank):
  the card's flip animation could still be running when the next card was
  dealt. The card's animations are cancelled first.
- **The capture tool smeared and missed moments.** Stills were taken after
  jumping the game half a second ahead, so the camera's motion blur saw a
  half-second move and smeared the frame: three reviews' "full-frame smear"
  was this, not what a player sees. Stills are now drawn from a held scene.
  The boss capture ran in real time, where software rendering is so slow
  that a charge never filled: its "attack" and "hit" frames showed nothing.
  It now steps the game inside the page until the moment arrives.
- **A lane's badge reflected in a puddle** beside the car, and only that
  lane's: it could pass for a hint. Badges are no longer mirrored.

### Where this checkpoint stands

- Regression on this build: identical to the baseline, no console errors,
  50 exam questions with no hint before submit; the 13-step walkthrough
  passes.
- Strategy Guide and Memory Bank have used all eight passes. Seven screens
  have passes left (Boss Rush 1, Title 2, Arcade Hub 2, Nest Egg Run 2,
  Interface 1, Risk Blaster 1, Final Exam 1); they come next, each from its
  last review's list, and are recorded in the section after this one.

## Round N: the passes that were left

Seven screens had passes left after the checkpoint above. They are used here, lowest score first, each from its last
review's list, each followed by a fresh independent review and by the small fixes that review asked for. Scores are
in the order detail, lighting, materials, depth, motion, cohesion, legibility.

### Interface, pass 8 (its last)

The kit is three materials (it was one violet slab doing every job). A **plate** is a row you press or read (stages,
settings, trophies, mastery rows, review items, the client's card): moulded, two corners cut, a lit band along its top,
a dark lip along its foot; the one lit row on a page throws its colour. A **read-out** shows a figure (stat tiles,
score boards, switch housings, the tag in the top bar): black glass in a bezel, a glint across one corner, an emblem in
front of its label, the figure lit from inside. A **key** is every button: a cap on a lip of its own colour in a dark
socket; the way forward lights the bar it stands on.

Also: a focus ring shows only once a key has been used (a button the game focuses for you no longer wears one on a
phone); the head of each menu page has the loading screen's horizon under it; stage pictures a size larger and bosses
larger still, the boss list tinted from the top; dialogs have a title half as big again and a bracket at each corner,
QUIT in a warning tint; results: a larger medal on long and short rays, tiles arriving one after another; the exam's
front page has the proctor's emblem beside the brief, your best against the pass line, the eleven chapters' shares of
the paper as a strip, the proctor large and dim above START, and START on the bar at the foot in the green of every
other way forward; the loading screen has stars and its wordmark stands clear above the horizon.

**A fault found and fixed.** The exam's front page showed only the middle of its introduction: the hub card's
four-line box (hub pass 5) applied to every element of that class, and this page's brief is one. The first and last
lines were cut off. The rule now applies inside the hub card only.

Third independent review: **3.5, 3, 3.5, 3.5, 3.5, 4, 4 (3.6)**, up from 3.4. Its points, and what was done after
(closing fixes): a lit floor and horizon behind every menu page; the tube's scanlines on plates and read-outs, read-outs
a hair off black; a star not yet earned is hollow; trophies sit in sockets edged with the hue of what they are for;
setup rows carry a glyph and share a height; what is chosen on the exam's pages is cyan like every other switch; the
sheen crosses a button under its label; the proctor above START is crisp pixels behind scanlines. Not done: new faces
for stage rows (the course's case studies keep one client for several chapters, so the face stays; the mood now shows
beside it), a score that counts up (the test harness reads the results page's text as it appears).

### Final Exam, pass 8 (its last)

Relit: a key from the upper left lights its planes on that side, its rim light is gold along the far edges only, a
soft shade stands between the figure and the hall's haze, the bloom takes less. Its light and shade are read from a
softer copy of the model's painting (the grain in it showed as static). The burn of the pass ending starts at the
reactor and spreads, wide and white-hot near it, thin and red further out; a fail lights its seams hot violet, not
gold. The endings are shot low and wide so the figure towers; the lens holds what the shot is of. The blast has a shape
(a white core, sixteen streaks, a fireball a third the size, firelight in a pool not across the hall); a fist, a
shoulder plate, a pylon and a foot are thrown clear whole and lie in the wreck in the boss's own gunmetal and panel
lines (the fragments had a woven pattern nothing else wears). The scene fades into the answers; the clock's bar is a
bar; the ending's bars are indigo glass and SKIP sits in the lower one.

**Its head.** Two reviewers, independently, said the helmet (a crest between two ear antennae) with the stacks behind
the shoulders recalls a film robot. The model is the owner's file and is untouched, but in the game the antennae end at
the helmet's own line and it wears the proctor's square cap with a gold tassel, as its small self does in Boss Rush.
The next reviewer named no single likeness ("no direct lift"). This is a change to how a supplied model is shown:
flagged for the owner.

Third independent review: **3.5, 3.5, 3, 3.5, 3.5, 3.5, 4 (3.5)**, up from 3.4. Answer leak: none visible. Closing
fixes after it: what the armour mirrors is cool (the warm room built for the old gold monument turned black plate to
brass); half the wear in its shade; the cap is felt and is knocked back at the first failure so the face shows through
the kneel; the reactor is an ember you can see from the first failure; the rune ring's bands and marks are heavier; the
shade behind it is the figure's size so the columns show; the fail ends at floor level under its chin; embers keep a
pool of light on the wreck. Not done: stencil marks on the armour, a larger fist in the punch, a heap that fills half
the picture.

### Risk Blaster, pass 8 (its last)

The fighter is gunmetal violet with a thin two-colour rim and takes the demon's colour as a key light (red in a
rage); its mirror of the sky is turned down and its painting is read from a softer copy, so the speckle is gone. The
drones sit in the corners, clear of the wings, each lamp in its answer's colour. A shot is two thin beams in the
answer's colour; a drone's burst by the demon is small and gone in a few frames, so the demon is seen taking the hit.
The shield is cyan at rest and ripples red where it is struck. While an explanation is up the picture rides higher, so
the fighter stays in view above it. The sky's nebula and clouds are turned down; the ring behind the demon is a thin
line.

Third independent review: **3.5, 3, 3, 3, 3.5, 3.5, 3.5 (3.3)**, below the 3.5 of the one before it: a new reader,
and a harder one on the firing and wind-up frames. (Its two "defeat" frames are the demon's destruction, which the
capture tool forces in the middle of a question: the drones and live answers still on screen in them are not what a
player sees, since the wave's last question has been answered by then. Its point that the blast covers the fighter
for a moment stands, and is not fixed.) Closing fixes after it: a disc of light inside the ring, so the demon is a
dark shape on lighter ground, and the ring swells over its shoulders and has three slow breaks in it; the shot has a
white heart in a sheath of the answer's colour and is as bright seen from behind as from the side (shaded by the
angle of its surface it was a pale hair), and the shot through the drone is the same width, so it reads fighter to
drone to demon; the wind-up no longer melts the demon into a bright smear; a dark plate behind each drone, so the
planet, the nebula and the wings do not tangle with it, and its badge is as bright as the button it stands for; the
bar of light beside drone C, which read as a stray letter I, is three lamps; after a miss the right drone's ring and
lamps go lime; the shield's lattice lights where it is struck and stays faint elsewhere, with a hot point at the
blow; rocks are dark indigo; the band fades under the question as it does over the answers. Not done: a second ring
and spread wings for the rage (its pose is the model's own rig), drones blown away at the end, star streaks that
converge behind the demon.

### Boss Rush, pass 8 (its last)

A right answer's bolt leaves from the badge of the answer that was tapped, in that answer's colour, and lands as a
star; the boss's blow is red whatever the boss's colour, with three slashes across the whole screen. Sparks are hard
square pixels. The arena has swallow-tail pennants, banded pillars and a front row of heads between the lens and the
ring. THE PROCTOR wears a monocle and a larger cap; the scribe's loupe is larger.

Fourth independent review: **3.5, 3, 3, 3.5, 3.5, 4, 4 (3.5)**; the one before was 3.6. Closing fixes after it,
which follow its "one lighting-hierarchy pass": the stands fall back (each tier darker than the one below, lilac
heads in place of tan, rails and glow sticks dim, the mist in front of them thinner); less ambient light, a harder
edge of the boss's own colour from behind, a brighter pool on the floor and a darker shadow right under its feet; a
hit is a flat star in the answer's colour with a dark keyline and a small white heart, and the ring is that colour
too (it bloomed to white); its blow is a blade in three hard bands (white, red, dark red) from the eye to the lens,
hottest at the eye (two soft tubes made a pink wedge of fog, brightest at the floor); the front row keeps to the
bottom edge of the strip whatever the strip's height, so only heads crest it, each with a hairline of the arena's
light, and it sinks out of the picture when the fight ends; a falling boss keeps its colours after a three-frame
flash (it went chalk white) and the lens closes on it; the orbiting gems are cut stones that take the light; the
scribe is more hunched with a bigger head and a glint on its glass; THE PROCTOR's cap is a violet board tilted to
show its top; what the armour mirrors from above is lilac and lower (a plate that faced it blew out to white); the
salesman's case is bronze hide with a warm clasp; the question's topic is in the reading face (in every mode); the
attack bar fills in segments like the health bar. Not done: the salesman's case held forward at chest height (the
case hangs from his hand along his forearm, so raising it pointed it at the lens end-on: he keeps his pose, with a
larger hand and case); the right answer's badge keeping its own colour (green is "right" everywhere in the arcade).

### Nest Egg Run, passes 7 and 8 (its last)

**Pass 7.** The answer badges hang from one bar across the road (a truss on two pods with clamps and hangers), in
the wet road's mirror; under each badge its lane's colour lies on the road as a wash of light, not a lettered tile.
The boost is hard speed lines and a short pulse, not a smear; a crash tears the picture for a moment. Lorries have
roofs, rear doors and a livery band; the car's paint is wetter (clearcoat, more of the street in it); the egg is lit
from inside with a bright edge. In the HUD the labels are larger, STREAK is a tab on the question panel, and a chosen
answer has a thin double border in place of a fat white ring.

Third independent review: **3.5, 3.5, 3, 4, 3.5, 3.5, 4 (3.6)**; the one before was 3.7.

**Pass 8, from that review.** The wet road mirrors what is lit right up to the car (it was a mirror only far off,
where the angle is shallow: signs, lamps and tail-lights now lie in it near the car; the dark sky does not). Each
lane's colour runs from its badge to the car's nose, brightest in the lane taken. The lane dividers are pale lilac
(magenta dashes and cyan edges were answers B and A in every lane). The badges are a fifth larger, each on a dark
board. Blacks hold: less bloom, a higher threshold, a touch more contrast. The desert's arch is an arch (its stones
were set end-on and stood round the sun like rays). A poster's ground is lit indigo, not black. The question's topic
line is in the reading face, so it wraps less.

Fourth independent review: **3.5, 3.5, 3, 3.5, 3.5, 3.5, 4 (3.5)**. Closing fixes after it: the board behind a
badge is the badge's own size, a thin dark ring (wider, each ran into the next), and the badge is a lit sign that
blooms a hair; the light lanes C and D throw on the road is greener and redder than their badges (after the grade
the two were one amber wedge); the roof's amber markers are lower; the HUD's labels are a size up and the rate's
glow is halved. **A fault found:** every billboard on a post was a blank black board, in every district: its poster
was set behind the face of its own frame. It hangs on the front now. Not done: a reframed crash with the whole car
above the panel (the panel's height is the explanation's length), puddles broken by roughness, ships and water for
the harbour, strata on the tunnel's cliff, square sparks (the same particles are the steam, which must stay soft).

### Title, passes 7 and 8 (its last)

**Pass 7.** The helicopters are built of boxes like everything else in the street (one had a smooth hull); one holds
station under the wordmark, working its light. INSERT COIN is the one yellow button on the page. Lamp pools on the
road, heavier bridge stays that stop short of the sun, searchlights with shape, and the lightning lifts the picture a
little, not into a wash.

Third independent review: **4, 3.5, 3.5, 4, 4, 4, 4 (3.9)**, the same as the one before.

**Pass 8, from that review.** The sun's bands show above the bridge (they began below its middle, behind the city: what
showed was a plain disc). The bolt strikes in the open sky between the towers, in front of the sun, four pixels wide
and forked (it struck behind the towers, a hair wide, and its forks were never drawn). The street has a middle and
edges: pale dashes between its lanes that slide past with the lamps, a line of cyan along each kerb, and a grid at 60%.
Sky traffic keeps to two far lanes in its lanes' own colours (red streaks overhead read as embers and ran behind the
wordmark); the helicopter that crosses does it under the wordmark; blade signs hang on the further towers only (the
nearest stood behind the wordmark, cut by its letters). Signs light the walls they hang on. The wordmark has a dark
keyline round every letter and ARCADE starts pale cyan. Far windows are their average light, not a sparkle of crosses,
and the picture is sharpened less. The tip's panel is cut at the corners like the plates on every other page; the
prompt stands clear of the button's lip; the totals are a quiet line.

Fourth independent review: **4, 3.5, 3.5, 4, 4, 4, 4 (3.9)**, the same again. Closing fixes after it: the towers'
blade signs light the wall beside them; a lamp's pool on the road is wider and stronger; one helicopter works a
cyan light and the other a pink one (warm white, they were grey columns); lightning lifts the sky and the roofs and
barely the picture (it flattened everything to lavender); INSERT COIN has a wider halo and its light lies on the
shade under it. Not done: shopfronts at street level, a train on the bridge, raised kerbs, a beacon at the vanishing
point, violet lorries.

### Arcade Hub, passes 7 and 8 (its last)

**Pass 7.** What stands on each cabinet is larger and clearer (a dish with a lit rim, a wing with a line of light,
horns with burning tips, a clock, laurels); a cool light from behind gives it a lit top and an edge; the tube has an
edge shadow and a glare; the wall's signs are turned down; the card's ground is indigo.

Fourth independent review: **4, 3.5, 3, 4, 4, 4, 4 (3.8)**, the same as the one before. It also said, at low
confidence, that the small robot on the floor (a dome on a drum) read as a well-known film droid.

**Pass 8, from that review.** The floor robot is redesigned: a sled with hazard bars, a mast, and a small tube
monitor for a face with one wide eye; nothing round is left on it but its brushes. The cabinet in front is sharp
from its topper to its base and the hall behind goes soft sooner; less bloom; the room and its signs fall back
further; the vignette is eased so the neighbours' marquees show at the edges. Toppers are lit less than the marquee
under them (the clock's dial is lilac, not paper white). PRESS START on a cabinet's screen has a full plate under it.
The guide's record shows its figure as the value, like every other card; the mission strip's glow is turned down.

Fifth independent review: **4, 3.5, 3, 4, 4, 4, 4 (3.8)**, the same again; it named no likeness. Closing fixes
after it: less bloom still; the lamp over the cabinet in front is the brightest light in the hall (the cabinet read
as an outline); the room falls back a little more; the wash a cabinet throws on the floor is tighter (yellow and
orange at full strength over violet went olive); the clock is a dark dial with lit hands and ticks. Not done: a
different marquee backdrop and lower panel for each cabinet, glass on the tubes, the wall's bands lifted above the
toppers, the neighbours shown a fifth of the way in.

### The last look: every screen once more, on the final build

When every screen had used its eight passes, all nine were captured again from the final build and each was given
to one more fresh reviewer, with the same brief and the same scale as before (5 ship as is in a top commercial
game, 4.5 one or two nits, 4 good with visible weaknesses, 3 competent but plain; "be strict and do not round up").
These are the scores this work ends on. The frames are from commit 6b31543 (the vault, the guide and Risk Blaster
from d2afb48, which differs from it only in the racer, the title and the hub). Two small fixes followed these
reviews and are noted under the table; nothing else changed after them.

| Screen | Passes used | Independent averages on the way (rounds M and N) | Final review: detail, lighting, materials, depth, motion, cohesion, legibility | Final average |
|---|---|---|---|---|
| Title | 8 of 8 | 4.1, 3.9, 3.9, 3.9 | 4, 3.5, 3.5, 4, 4, 4, 4 | 3.9 |
| Arcade Hub | 8 of 8 | 3.9, 3.5, 3.8, 3.8, 3.8 | 4, 3.5, 3.5, 4, 4, 4, 4 | 3.9 |
| Risk Blaster | 8 of 8 | 3.5, 3.5, 3.3 | 4, 3.5, 3.5, 4, 4, 4, 4 | 3.9 |
| Nest Egg Run | 8 of 8 | 3.9, 3.7, 3.6, 3.5 | 4, 3.5, 3.5, 4, 4, 4, 4.5 | 3.9 |
| Memory Bank | 8 of 8 | 3.4, 3.7, 3.9, 3.6 | 4, 3.5, 3.5, 3.5, 3.5, 4, 4 | 3.7 |
| Strategy Guide | 8 of 8 | 3.5, 3.4, 3.9, 4.0, 3.6 | 3.5, 3.5, 3, 3.5, 3.5, 4, 4 | 3.6 |
| Interface | 8 of 8 | 3.6, 3.4, 3.6 | 3.5, 3.5, 3.5, 3.5, 3.5, 4, 3.5 | 3.6 |
| Final Exam | 8 of 8 | 3.7, 3.4, 3.5 | 3.5, 3, 3, 3.5, 3.5, 3.5, 4 | 3.4 |
| Boss Rush | 8 of 8 | 3.7, 3.7, 3.6, 3.5 | 3.5, 3, 2.5, 3.5, 3.5, 3.5, 3.5 | 3.3 |

**The target was 4.5 on every screen. It is not met on any.** The final averages run from 3.3 to 3.9. One axis on
one screen reached 4.5 (legibility, Nest Egg Run); the lowest single score is 2.5 (materials, Boss Rush). Over
rounds M and N the nine screens had 44 independent reviews. The averages do not climb with the work: each new
reviewer, shown a screen on which the last one's points had been fixed, found a new list and scored it within about
half a point of where it began. Lighting and materials are the lowest axes on every screen at the end, and every
final review's "biggest change" is a relighting or re-materialling of the whole scene, which is more than a fix
pass. The nine final reviews are in `docs/polish-pass/final-reviews.md` as written, and what they still ask for
is summarised below under "Not done".

- **Risk Blaster was reviewed twice at the end.** My captions on the first sheet called its two end frames the
  player's fighter breaking up; they are the demon's destruction. That review scored 4, 3.5, 3.5, 3.5, 4, 4, 3.5
  (3.7) and two of its points followed from the wrong caption. The one in the table had the captions right.
- **Two fixes after the last look.** Nest Egg Run's reviewer saw the pause button 6 px past the margin: pass 7 had
  made the nest egg's label and the rate a size larger, and with two shields and three hearts showing the top row no
  longer fitted (24 px over at 360 wide). They are back at the sizes the row was fitted with, the icons close up on
  narrow phones, and the row was measured at 390, 360 and 320 wide; the other games' rows were measured too and
  fit. The Interface's reviewer saw the lit floor's horizon, a bright 2 px line behind every menu page, run through
  the caption under the stats tiles: it is a glow now. Both were mine, from this round.
- **The exam.** Its last reviewer found no direct tell before submit ("the chosen plate is plain violet, with no
  tick, cross, score, streak or boss bar") and named one risk: the boss goes from dark to lit seconds after the first
  tap. Checked in the code: it wakes when the exam starts, not at an answer; it gives the same small start at every
  pick, right or wrong; its glow follows how far along the exam is, never which answers were right.

### Faults found in round N

- **The exam's front page showed only the middle of its introduction.** The hub card's four-line box (hub pass 5)
  applied to every element of that class, and the brief on this page is one. Scoped to the hub card.
- **Every billboard on a post in Nest Egg Run was a blank black board.** Its poster was set behind the face of its
  own frame, in every district. It hangs on the front now.
- **The title's lightning was never seen as a bolt.** It struck behind the towers at the edges of the picture, a
  hair wide, and the test that gave it forks compared its width with a number it never reached. It strikes in the
  open sky now, four pixels wide, forked.
- **The desert's arch of rock was not an arch.** Its stones were turned end-on to the curve and stood round the sun
  like rays.
- **Nest Egg Run's top row overflowed** with two shields showing, and **a line ran through the stats caption** (both
  above; both introduced and both fixed in this round).
- **A build that would not start, caught before it was committed.** A comment added after a statement in the
  middle of a line swallowed the rest of the line; each source file still passed its own syntax check. The page's
  inline scripts are now parsed after every build as well.
- **Capture tools.** The exam's pass run could begin before the first question existed and record a fail; it waits
  for the question now. Two of the capture chains were lost when the shell that started them returned; the final set
  was shot again.

### Resemblance: what this round's reviewers named, and what was done

Every reviewer was asked to name anything that looked like a specific existing game, film, brand, logo or
character. None named a copy. What they did name:

| Named | Where | Outcome |
|---|---|---|
| A film robot's helmet (crest between two ear antennae, stacks behind the shoulders), by two reviewers independently | The exam's boss (the owner's model) | Changed in how it is shown: the antennae end at the helmet's line and it wears the proctor's square cap. The model file is untouched. Later reviewers: "no direct lift". **Flagged for the owner**, since it alters a supplied model's look |
| "Reads R2-D2", at low confidence | The hub's floor robot (a dome on a drum) | Redesigned: a sled, a mast and a tube monitor for a face. The next two reviewers named nothing for it |
| Mystery Science Theater 3000's front-row silhouettes | Boss Rush's front row | Changed: only the tops of heads crest the bottom edge now, each with a hairline of the arena's light |
| TRON (circuit lines on black armour); Clash Royale's P.E.K.K.A (dark hulk with a magenta glow); LEGO and Minecraft block figures | THE PROCTOR in Boss Rush; all bosses | Kept. "Faint, not actionable" in the reviewer's words; block-built figures are the arcade's form |
| Bender (Futurama), faintly | Product Pusher's visor-and-grille face | Kept: a visor and a grille on a robot. Noted by two reviewers, both "faintly" |
| A hockey mask (Friday the 13th), faintly | The masks on the Boss Rush cabinet's kick panel | Kept: they are theatre masks at a few pixels |
| Bumblebee's Camaro, faintly ("low risk"); earlier, a DeLorean's tail bar | Nest Egg Run's car | Kept: a gold-shelled rally car under gunmetal armour with a roof lamp bar and a mint emblem; the last reviewer called it "a generic 1980s wedge; no real marque" |
| "Drifts toward the Decepticon insignia" (mild) | The demon's head seen front-on (the owner's model) | Kept as supplied. **Flagged for the owner** |
| Bumblebee under the warm light; the Terminator's chrome skull; Warhammer 40,000 Terminator armour | The exam's boss (the owner's model) | Kept as supplied: "generic, not copied; the mortarboard keeps it its own". **Flagged for the owner** with the row above |
| OutRun, Blood Dragon and Kung Fury key art, Kavinsky's cover, Blade Runner, Cloudpunk; "the red wedge car recalls OutRun" | Title; Nest Egg Run | Kept: the banded sun, the grid, rain and blade signs are the genre, and every reviewer who named them said so. Nest Egg Run's sun is an egg |
| Star Fox and Space Harrier (the view from behind the ship); Guitar Hero (a row of coloured discs over coloured lanes) | Risk Blaster; Nest Egg Run | Kept: conventions of the form |
| Trinity College's Long Room; a prize wheel or a dartboard | The Strategy Guide's hall and rose window | Kept: "real-world archetypes, nobody's property" |

### Not done, and why (round N)

Each screen's section above lists what its last pass left. What the final reviews still ask for, by size:

- **A relight of each 3D scene** (Boss Rush, the exam, the hub, the title, the guide's hall): darker grounds behind
  the subject, a hard rim in one colour, bloom on emissives only, light that lands as pools and spill. Parts of this
  were done in every pass; no reviewer has yet called a scene lit. It is the largest single thing left.
- **Materials**: stepped speculars on the bosses' plate and gold, glass on the hub's tubes, a truss with bevelled
  housings for Nest Egg Run's gate, wet breakup on the road, cut faces on a broken boss.
- **New geometry**: an end wall for the guide's hall, shopfronts and a train for the title, ships and water for the
  harbour, a body change for each enraged boss, different faces for the stage rows, a second silhouette for the
  demon's rage (its pose is the model's own rig).
- **Things that cannot change**: a score that counts up on the results page (the test harness reads that page's
  text as it appears), the right answer's badge keeping its own colour (green is "right" everywhere in the arcade),
  the crash framed whole above its panel (the panel's height is the explanation's length), the exam boss's armour
  (it is the owner's model).
- **Not verified on a real phone.** Every frame is from a software renderer at twice a phone's density. Frame rate
  on a device is unknown; the per-effect switches in Setup are the lever if it is low.

### Where it ends

- Final build: regression identical to the baseline (153 answers in 8 games, every saved byte), no console errors,
  50 exam questions with no hint before submit, and the 13-step walkthrough passes.
- All nine screens have used eight passes. Each was reviewed by fresh agents four to six times in rounds M and N,
  44 reviews in all, the last of them on the final build.
- `docs/polish-pass/` holds the before-and-after sheets, rebuilt from the final build.

## Round P: one fix round on four areas, then stop

The owner read the last reviews and asked for one more fix round on the areas that scored under 4.5, in this order:
Boss Rush, the road, Risk Blaster, the hub; then the tests, one more independent review of those areas on fresh
frames, and a stop ("do not start a third round"). Nothing in the question bank, the answer checking, scoring,
timers, spaced repetition, progression, saved progress or any text was touched. Look only.

**A note on the second item.** The instruction labels it "Nest Egg Run (road)", but its three points (a full-width
magenta grid fighting the wet road, lamps and signs that light nothing, one khaki lattice of tower windows) are the
title screen's last review, word for word; Nest Egg Run's road has no grid on its carriageway. They were applied to
the title, and the parts that carry over (lamp light on the wet road, the sun lying down the road, windows lit in
clusters) were applied to Nest Egg Run as well. Both screens were reviewed.

### Boss Rush

- **Bloom.** The scene's bloom starts higher (threshold 1.5, 1.1 before; a short knee) and is tight: the pipeline
  has two new per-scene settings, `knee` and `bloomTight`, and with `bloomTight: 1` the wide levels of the bloom
  give up most of their share, so the halo round a lamp is about half as wide. Strength down to 0.55 (0.78 before).
- **Paper and heads are matte off-white.** Paper and bone lose a third of their paleness (they were rough and
  unmirrored already) and the plate mirrors the arena a little less; plate and paper are held under white where
  they are drawn (a soft knee above 0.6), so only the lamps (eyes, lenses, cracks) and the star of a blow reach
  pure white. No part of a head or a page is emissive.
- **The entrance.** A boss landed bowed so far that the blank top of its skull faced the player: the "blank grey
  slab". It now lands crouched with its head up. The scribe's flat cap is a ledger's board (a raised panel, a spine,
  ruled lines, a stud at each corner) and not a plain plate.
- **The attack.** A tapered wedge from the lens to the bottom edge of the band, drawn in screen space: a white
  heart, a red rim, a thin dark edge. First a flash at the lens; the wedge shoots out in under a tenth of a second,
  holds, narrows and is gone in half a second. (The blow lands when it always did.)
- **The hit.** Every star has a white heart and a dark indigo outline, and the boss is a dark silhouette for that
  moment (about a seventh of a second, fading over a fifth): a cyan star on the cyan boss is the player's blow, not
  the boss's glow.
- **Beyond the list** (from the same review): plate is lacquer and not one matt plastic (a cool rim from above and
  behind, one hard stepped highlight from the key lamp; paper takes none); the floor's lines idle at half strength
  and run to full as the attack bar fills; a blow runs through them in the answer's colour for a quarter of a second.

### The road, the lamps, the windows (title; carried to Nest Egg Run)

- **Road.** `makeNeonFloor` has three new options. `road`: inside the kerbs the grid steps back to a fifth of itself
  (pavements, kerbs and dashes as before) and every light above the road lies in it as a long vertical streak (nine
  taps, shifted a little from pixel to pixel so a streak is a streak and not nine copies). `sun`: the striped sun
  lies down the road as a column of lens-shaped bars, rose under the skyline and gold at the player's feet, each bar
  its own width and a little off the line, drifting slowly.
- **Lamps and signs.** Lamp tubes are over half as bright again. Each lamp has four patches of light, all in one
  instanced mesh: its pool, a hot core under the tube, a streak down the wet road toward the camera (far ones fade
  out), a halo round the tube. Blade and wall signs are brighter, each blade has a halo in the wet air, and the
  light they throw on the wall beside them is nearly doubled.
- **Windows** (`cityFacadeMaterial`). Lit in clusters five bays wide and four floors high: four clusters in ten are
  dark, the rest are busy to different degrees, and each has its own light, amber, cyan or magenta (deeper hues,
  and no room so dim that its amber goes khaki). Panes are twice the size on the eight storeys nearest the road and
  half as wide again on walls that run along the avenue, where a fine lattice was all shimmer.
- **Searchlights** are round beams (24 sides; eight flat sides read as flat strips).
- **Nest Egg Run.** Under each street lamp a hot core, and the lamp's image drawn out down the wet road toward the
  camera. The egg sun lies down the far road as bars of its own light, beyond the answer lanes only (the lanes by
  the car stay clean for the answers' colours) and in proportion to how wet the district is. The city's windows are
  lit in clusters, four in ten dark, each cluster amber, cyan or magenta. Lane paint is worn where water runs and
  gone under a puddle. The roof light bar no longer burns a hole in the roof.

### Risk Blaster

- **The shot.** Round the demon the wing pods fire every time: two thin beams (a third thinner, a hard white
  heart in a sheath of the answer's colour) that meet on the answer's drone and hold until the answer lands. A right
  answer sends one lance on from the drone into the demon's core: widest where it leaves the drone, a needle where
  it goes in, and it ends there (the old through-shot was a fat bar that ran on past both). Sparks are darts in the
  answer's colour, each with a point and a tail (they were white bars). The lance and the darts are a new shape in
  the effects pool (`SpaceFX.dart`, `SpaceFX.lance`: two crossed blades shaped where they are drawn).
- **The demon keeps its shape.** The flash where a drone bursts is smaller and shorter, there is less fire, the
  blast's light on the demon is a quarter of what it was, and the demon takes the hit as a rim of the answer's
  colour along its edges (it was a pale sheet over the whole body: "a ghost").
- **Stations.** Each drone stands on a disc of dark glass that writes depth and is drawn before the demon's ring of
  light, and the drones hold station 6.2 in front of the demon (2.6 before): wing tips and ring pass behind them.
  The letter is half as big again and sits on the line of sight through the station's middle (out in the corners
  of the view, a letter set straight in front of its drone stood off-centre in it). The ringed planets of three
  regions left the stations' corners for the edge of the view, between the two rows of stations.

### Arcade Hub

- **Air and floor.** Half the fog (it starts at 15 and is full at 80; 13 and 46 before) and half the haze in the
  lamp's shaft. The light under each cabinet is a tight pool with a hot core (the floor's shader; the hero's own
  pool has a radius of 2.0, 3.4 before, and a core). The joints between the tiles stay dark inside the light, and the
  floor's mirror is nearly as sharp as the thing it mirrors (its smear and ripple cut to under half).
- **The cabinet in front.** Its screen's colour lies on its control panel, brightest under the glass and gone by
  the lip, wavering by a tenth about once a second (steady with Reduced motion). Every tube has one curved
  highlight across its upper corner. One cool rim light, from behind and above and to one side, drawn in the lit
  material so that it falls only on the cabinet in front.
- **Final Exam.** Its trim is lavender and brighter. While it is in front the hall behind it darkens and cools
  toward teal (fog, wall rings, wall glows, ceiling, room light; the machines and signs along the wall turn down
  further), and warms back as the camera moves on.

### Tests (round P)

On the round's build (commit `18b1466`), run once before it was committed and again at the end of the round: the
regression is identical to the baseline (153 answers in 8 games, every saved byte), there are no console errors,
the exam shows 50 questions with no hint before submit, and the 13-step sequence passes. Every scene that changed
was also loaded on its own to catch a shader that would not compile, and the page's inline scripts were parsed after
every build.

### The review, and where the round stopped

Fresh frames of all five areas were captured from that build. Two independent reviews (fresh agents, the same
brief and scale as before) had come back when the owner closed the round: no further reviews, no new fixes. So
two areas have new scores and three do not. In the order detail, lighting, materials, depth, motion, cohesion,
legibility:

| Area | Before this round | After this round |
|---|---|---|
| Title | 4, 3.5, 3.5, 4, 4, 4, 4 (3.9) | 4, 3.5, 3.5, 4, 3.5, 4, 4 (3.8) |
| Arcade Hub | 4, 3.5, 3.5, 4, 4, 4, 4 (3.9) | 4, 3.5, 3.5, 3.5, 4, 4, 4 (3.8) |
| Risk Blaster | 4, 3.5, 3.5, 4, 4, 4, 4 (3.9) | not reviewed again |
| Nest Egg Run | 4, 3.5, 3.5, 4, 4, 4, 4.5 (3.9) | not reviewed again |
| Boss Rush | 3.5, 3, 2.5, 3.5, 3.5, 3.5, 3.5 (3.3) | not reviewed again |

**The round's aim, 4 or more on lighting and materials, was not reached on either area that was scored.** Both
stayed at 3.5 and 3.5, and each lost half a point on another axis (the title on motion, the hub on depth), as a
new reviewer's list has done in every round. The other four screens (Memory Bank 3.7, Strategy Guide 3.6,
Interface 3.6, Final Exam 3.4) were not part of this round and keep their last scores. Both reviews are kept
verbatim in `docs/polish-pass/round-p-reviews.md`, with a sheet of the final frames for each of the five areas
beside them (`round-p-*.jpg`).

What the two reviewers said of the things this round set out to fix:

- **Title.** The road was not named as a fault any more, except for one new one (below). But "emissives light
  nothing" is still the first point: the lamps read as "blurry orbs without pavement pools", the signs throw "no
  spill on walls", headlights throw no cones in the rain. The windows are still "uniform LED-matrix".
- **Hub.** The fog and the floor's mirror were not named any more. The cabinet in front still "reads as a glowing
  sticker" (fat bloomed trim, a side panel blown to a white sliver, dark faces unshaded); the pools under the
  cabinets are "flat, oversaturated glow puddles" with no contact shadow; for the Final Exam, "the teal hall does
  not read".

### Known weak spots (what is left, as of this build)

Two faults, found by this round's reviews and left as they are (the round was closed before they could be looked
into):

- **Title: the sun's bars on the road drift off the sun.** When the camera sways, the column of bars sits up to
  about 100 px to one side of the sun. It is anchored to the middle of the road; it should lie on the line from
  the camera to the sun's image.
- **Hub: a bright smear at control-panel height** crosses the right edge of the cabinet in front in three frames
  (2, 4, 6). The cause was not established: the new panel light, or the bloom of what stands behind. Something
  like it was in the last review's frame 6 too.

The rest, by area:

- **Title** (reviewed): lamps, signs and headlights still do not light the street enough to read as light; the
  helicopters and hover cars crowd the wordmark and the towers; no shopfronts or doors at street level; the
  planes of the city do not separate (heavy vignette, no haze between them); the bridge's deck cuts the sun at its
  middle; lightning is a fat, even tube and its flash a flat lift; lorries and hover cars are off-palette boxes;
  the rain is thin; the sign glyphs are soft; the button and tip panel are plain.
- **Arcade Hub** (reviewed): the cabinet in front is drawn by its neon and not by light on its surfaces; the hall
  behind it is one even blur and the neighbours are dark slivers; the Final Exam cabinet is still the weakest of
  the six; no contact shadows; the toppers (horns, spoiler) are pale matt shapes; the hall's sign never reads;
  marquee sub-lines are about 5 px; the light beams are hard-edged strips; passers-by are black cut-outs; the empty
  rank bar is dark on dark.
- **Boss Rush** (not reviewed; from the frames): the plates still read closer to khaki than to gold under the
  arena's yellow light; the arena is one kit re-tinted per boss, and the cyan boss still stands on a cyan arena;
  an enraged boss is a change of the arena's colour and not of the boss; the break-up of a beaten boss is dark
  pieces on a dark crowd.
- **Risk Blaster** (not reviewed; from the frames): the lance is soft where it leaves the drone and the flash at
  the demon's chest is still large; the hull's and the armour's fine grain is unchanged; the strike, the rage and
  the demon's destruction are as they were (the last review's points on each stand).
- **Nest Egg Run** (not reviewed; from the frames): this round's changes are small here (a streak and a hot core
  under each lamp, the far sun on the road, clustered windows); the gate's badges, the boost and the crash are as
  they were, and the last review's points on each stand.
- **Everything**: no reviewer has yet called a scene lit; lighting and materials are the lowest axes on every
  screen. Not verified on a real phone: every frame is from a software renderer at twice a phone's density.

### Where it ends (round P)

- The fix round is one commit (`18b1466`); the record, the two reviews and the five sheets are the commit after it.
- The pull request's description and the published artifact still describe the build before this round: the
  owner asked for the work to stop with the push.

# Generated assets and combat effects (thirteenth pass): progress log

The request: replace weak procedural visuals and audio with real generated assets (a starfighter and a flying
demon boss for Risk Blaster, an armoured war rig for Nest Egg Run, new bosses for Boss Rush, a sky for every
mode, a full sound design), integrate them at the highest quality, and give Risk Blaster, Boss Rush and Nest
Egg Run a full combat and impact effects pass (weapons, telegraphs, attack types, hit reactions, low-health
state, boss reactions and deaths, crashes, boost, layered explosions, synced audio, hit-stop). Providers:
Tripo, fal.ai (Hyper3D Rodin V2.5 and image models), ElevenLabs, Blockade Labs; free CC0 sources first for
textures and props. Study logic, questions, answers, scoring and content never change. Only `arcade/` is touched.

## How to resume

- Branch `claude/quirky-ride-9frte0`. Keys come from the environment (`TRIPO_API_KEY`, `FAL_KEY`,
  `ELEVENLABS_API_KEY`, `BLOCKADE_API_KEY`); they are never printed or written anywhere, and `.env` is ignored.
- `tools/gen/` is the generation toolkit: `lib.js` (the four providers, one ledger line per paid call in
  `ledger.jsonl`), `concepts.js` (reference images), `candidates.js` (the same concept through Tripo and Rodin),
  `tripo-post.js` (segmentation, completion, rig, retarget, texture), `render.js` (turnaround sheets of any
  `.glb`). Raw candidates live in the session's scratch directory (`GEN_OUT`), not in the repo; only picks are kept.
- `ASSETS.md` lists every kept asset and the spend per provider.
- The rules of the games run on the scene's own clock, and the regression test compares every frame number with
  the baseline. So nothing in this pass may change when a rule fires: all new motion (hit-stop, slow motion,
  telegraphs, deaths) runs on a separate show clock that the rules never read.
- The regression (`npm run arcade:regress`) opens the page from `file://`, where the page does not fetch its
  asset files at all (a browser refuses them there) and plays with what is built in. `tools/regress-http.js`
  runs the same test with the page served over HTTP and every asset loaded: both must be IDENTICAL.

## Order of work (the owner's instruction, to be followed exactly)

Phases run strictly one after another: a phase is not started until the one before it is committed and pushed. If a
balance runs low, what is left goes to the war rig, the Boss Rush bosses, then sound.

**How a phase is closed (the owner's change of 2026-11-15).** No score target and no repeated review rounds. Each
phase gets at most one independent review, at its end, by one reviewer; what it finds that matters (anything
broken, ugly, confusing, or too close to a famous character) is fixed, minor polish is left, and the phase is done
when it works, looks good and consistent, its tests pass and no major defect is left. Then commit, push, next
phase. Asset quality, animation, lighting and combat effects matter as before; only the reviewing is lighter.
Before Phase 3 the owner gets a short projected spend for fal and Tripo, per boss.

| Phase | What | Status |
|---|---|---|
| 0 | Setup: keys tested, asset folders, glTF loader with compression, audio manager (mixing, ducking, mute, autoplay rules), sky loader that drives environment light and reflections, `ASSETS.md` with the spend log, `.env` ignored, regression green, commit | done |
| 1 | **Risk Blaster**, the vertical slice that sets the standard: (1) deep-space sky for sky and lighting, (2) starfighter and demon integrated, (3) animation, (4) combat and impact effects, (5) sound, (6) frame sequences, independent review, fixes, commit and push | done (see "Phase 1" below) |
| 2 | Nest Egg Run: sunset sky, war rig (one straight centreline, a symmetrical body, four wheels at the corners, no real car's grille or lights: checked in flat top and side views before use), vehicle animation, crash and near-miss effects, engine and crash sound, music, one review | done (see "Phase 2" below) |
| 3 | Boss Rush: each of the 12 bosses in order of how weak it looks now (model, entrance, tells, hit reactions, death), darker sky, boss sounds and music, commit after each, one review | done (see "Phase 3" below) |
| 4 | Hub, Title and the other modes: skies, ambient and menu sound, announcer; real 3D models and props for the hub, the title, the menus, Memory Bank, Final Exam and Strategy Guide (a cabinet or portal for each game, trophies and medals, a vault or card deck, an exam gate or podium, a guide book or terminal, small icon models for buttons and rewards): small, cheap Tripo models, one attempt each (regenerated only if clearly broken), shared across screens, light enough for a phone (Tripo was topped up on 2026-11-16: it is also used to remake any boss or asset a review finds weak, rather than falling back to Rodin or procedural shapes) | in progress |
| 5 | Cohesion pass: lighting, grade, bloom and sound levels as one game; full regression; load time and file size | |
| 6 | Final independent reviews, one reviewer at a time, on new captures; fixes that matter; final commit, push, record and one summary with screenshots, spend and balances | |

Work done before this order arrived that belongs to later phases, kept as it is and not taken further until its
phase: concept images and 3D candidates for the war rig and all twelve bosses (all twelve picked from Tripo; one
boss rigged as a test), skies generated for every mode, sound effects and announcer lines generated for every mode,
the war rig processed into `assets/models/warrig.glb` (a six-wheeler: it does not meet the owner's rule and is
remade in Phase 2).

## Phase 0: what is in place

- **Keys.** All four answered a free read-only call (Tripo balance, fal balance, ElevenLabs subscription, Blockade
  styles). `.env` is in `arcade/.gitignore`; no key is printed, logged or written anywhere (`lib.js` masks them).
- **Asset files** live in `arcade/assets/` (`models/`, `sky/`, `audio/`) and are fetched when a screen needs them
  (`src/js/03b-assets.js`). `tools/manifest.js` writes the list (`src/js/03a-files.js`). A page opened from disk
  cannot fetch, so there every game plays with what is built in, exactly as before; the same for any file that is
  missing or fails. A game's set loads behind a loading line before the game is built (`Assets.with` in
  `startGame`), so the game's own clock starts as it always did.
- **Models**: glTF (`vendor/GLTFLoader.js`, three r128's own, built into the page as `00v-gltfloader.js`),
  geometry compressed with meshopt (decoder 1.3 in `00w-meshopt.js`), maps as WebP. `Assets.model(name)` hands a
  scene a fresh copy with its named parts and anchors; `tuneModel` sets reflection and glow strength.
- **Skies**: `Assets.loadSky` makes the panorama a texture and a prefiltered reflection map; `makePanoSky` draws it
  (gain, highlight lift so stars and nebula cores bloom, tint, rotation, cross-fade between two skies) and
  `applySkyEnv` makes it the scene's environment light (`src/js/08d-panosky.js`).
- **Sound** (`src/js/02-sound.js`): a recording plays when its sprite is loaded and the old synth otherwise, so
  nothing is ever silent. Takes of one effect are played in turn with a little variation; loops (`Sound.loop`);
  recorded music with loop points, a filter that opens as the streak grows, and ducking under the announcer and the
  biggest blasts; a limiter on the way out; announcer lines by name (`Sound.say`), falling back to the browser's
  voice. Audio starts only after the first tap. Mute: the arcade floor's button, and now a SOUND switch in every
  game's pause menu; muting also stops any running loop.
- **KTX2** is not used: three r128 ships a KTX2 loader only as a module, and the page is built from classic scripts.
  Maps are 2K WebP instead (a model's four maps are about 1.2 MB to download). Noted as a possible later step.
- **Tests.** `npm run arcade:regress` (from disk, built-in assets) and `node arcade/tools/regress-http.js` (served,
  every asset loaded) both IDENTICAL to the baseline; the sequence test passes.

## A1/A2: what was generated and what was picked

Concepts (fal.ai): every asset drawn as one object on a plain studio ground from one strong prompt (in
`tools/gen/concepts.js`); two takes on Seedream 5.5 for everything, one more on Nano Banana Pro for each hero
design. 54 images.

3D candidates: the picked concept images through Tripo H3.1 (Ultra geometry, HD texture v3.5, PBR, 300K faces)
and Rodin Gen-2.5 Extreme-High (500K triangles, PBR, HD texture, HighPack 4K), each rendered from six views.

- **Starfighter**: three designs (arrowhead, manta wing, twin-nacelle gunship), each on both providers.
  Picked: the manta wing from Tripo (`starfighter-b-sd-0.tripo`): the most original outline, three main engines
  in a row (the view the player has is from behind), wing-tip twin cannons, chrome and black with cyan leading
  edges and magenta engine rings. Rodin's version of the same concept is cleaner but reads as matte primer.
- **Demon**: four designs. Picked: the ram-horned overlord with wings of armour blades from Tripo
  (`demon-c-sd-0.tripo`): rigid blade wings suit split-part animation, a large reactor core gives the player's
  shot a target, and chrome separates it from a dark nebula. Runner-up: the serpent-tailed biomech
  (`demon-a-sd-0.tripo`). Rodin's wings came out as thick slabs on this design.
- **War rig**: three designs (armoured coupe, lifted war truck, six-wheeled rig). Picked: the six-wheeler from
  Rodin (`wartruck-c-sd-0.rodin`): gold body, black armour, cyan and magenta strips, a wing between two fins and
  two exhaust cannons, by far the clearest from behind and above, which is where the game's camera sits. Its
  surface is matte as delivered; it gets lacquer and metal in processing.

## Phase 1: Risk Blaster (done)

**What was built** (code in `src/js/20-blaster.js`, `20i-blastersky.js`, `20j-blasterstarfighter.js`,
`20k-blasteroverlord.js`, `20l-blasterstage.js`; the old fighter, demon and sky stay as the fallback when the page
is opened from disk).

1. Sky and light: three deep-space panoramas, cross-fading by region, each with its own key, rims and backlight;
   the region's sky colours the models and shows in their chrome. The sky is dimmed behind the fight.
2. Models: the starfighter and the demon overlord in place of the built-in ones, through named anchor functions.
3. Animation. Ship: hover, five flickering plumes, banking with wing flex, cannon recoil, fly-in, surge, knock
   aside, break-up. Demon: fly-in and roar, a living idle, five wind-ups, hit reactions and staggers, rage, wounds,
   the tail and a wing shot away, a critical state, death in parts.
4. Combat, all on the show clock (the rules' frames are untouched): volleys with star muzzle flashes, spent cells
   and barrel heat; a lance through the drone into the demon on a right answer, a red fizzle on a wrong one; five
   telegraphed strikes (plasma volley, claw swipe, roared wave, swept beam, seekers), each with its own marker,
   colour and landing, each landing before the explanation sheet rises; the shield seen to go with the blow; HUD
   crack and heart loss; low health (a red frame pulsing with the alarm, the hurt engine burning); a staged death
   (slow motion, a chain of shaped blasts, the last blast, rewards flying round the question to the score) that is
   over before the next question's drones appear; game over.
5. Sound: every cue fired from the same code as its picture (`docs/combat-pass/blaster/sound-cues.md` lists cue and
   frame for every moment); a charge loop cut at release; the alarm in step with the red frame; the engine loop
   following streak and warp; the music loop with its intensity filter. Pause and game over silence the loops.

**The one independent review** (`docs/combat-pass/blaster/review-r1.md`, made under the earlier 4.5 rule) scored
detail 3.5, lighting 3.5, materials 3.5, depth 4.0, motion 4.0, cohesion 4.0, legibility 3.5, with twelve defects.
What was done about them:

- Legibility: additive white is capped, rings are thin and hard-edged, the four drone letter discs are exempt from
  flash, colour split, glitch and shake, score popups sit above the burst with a dark outline.
- The death no longer collides with the next question; "WAVE n" is announced after the last blast.
- Blasts are built from a hot core, a lobed fireball, a ring, streaked sparks and smoke; smoke and debris are in
  the palette.
- The beam is a thick core with a halo and its own sweep-arc marker; the plasma volley is orbs; the fighter keeps
  its hull colours under a cyan shield shell.
- The tail is thrown off on the hit frame; a drone's housing cracks and shatters over several frames.
- A new demon (`assets/models/demon.glb`, second version): the reviewer found the first one's round chest core too
  close to a known film armour, its face unreadable and its wings noisy. The new one has a chrome skull face with
  eye slits, matte ram horns, a glowing rift in the chest and clean violet wing membranes.
- The fighter re-processed: 4K base colour, a mirror-glass canopy, heat-tinted nozzles, gunmetal cannons.
- The shared "correct" colour is a neon mint instead of lime (explanation sheet, NEXT button, hub).
- Mid-ground props are dark hulls with running lights instead of tan boxes.

By the owner's change of process there was no second review; the final captures were checked by hand
(`docs/combat-pass/blaster/`, 24 files with a list in its README).

**Tests on the final build**: regression from disk IDENTICAL (153 answers in 8 games), regression over HTTP with
every asset loaded IDENTICAL, sequence test 13 of 13, no console errors.

**Still weak, plainly**

- Nobody has heard the sound: it was checked by cue log and by measured loudness (`tools/audio-levels.py`) only.
- When the demon is at its closest its tail crosses the fighter's canopy.
- The five strikes land differently but all end in the same shield shell.
- Silhouette edges are not anti-aliased beyond the capture's 2x scale; the rim light makes the steps visible up close.
- The reduced-effects path is coded but was not captured.
- Background traffic and rocks are still the procedural ones, restyled, not generated models.

## Phase 2: Nest Egg Run (done)

**What was built** (code in `src/js/21-racer.js`, `21d-racersky.js`, `21e-racerrig.js`, `21f-racerstage.js`, with
`21b-racercar.js` and `21c-racerworld.js`; the old car and sky stay as the fallback when the page is opened from
disk).

1. Sky and light: five panoramas across the career (dawn at 25, day, golden hour, dusk, stars at 65), cross-fading
   as the landscapes change, as the sky, the scene's light and what the wet road and the lacquer mirror. The game's
   own golden-egg sun stays, now gold to magenta with a halo and a glint.
2. The war rig in place of the car: an armoured hauler carrying the nest egg, remade to the owner's rules (one
   straight centreline, a symmetrical body, four wheels at the corners, no real car's grille or lights; checked in
   flat top, side, front and rear views: `docs/combat-pass/racer/warrig-check-flat.jpg`).
3. Animation: the body on springs (heave, roll in a lane change, squat under boost, dive under braking), wheels
   that spin and steer, stacks that shudder, the egg rocking in its claws, a drive-in at the start, a half-spin on
   locked wheels in a crash, a victory turn at retirement.
4. Impact and feel, on the show clock (the rules' frames are untouched): a right gate (a clean burst in the
   answer's colour, rings on the road, coins to the nest egg, a surge), a wrong gate (the pane breaks red, splinters,
   red sparks, a dark blast, skid marks, tyre smoke), taking damage (flash, colour split, shake, the HUD cracks, the
   life breaks), an insured crash (a shell of mint light takes it), near misses (streaks of air, the rig rocks
   away), boost (a tongue of fire from each stack, heat haze, light on the road), the last life (a red frame in step
   with the alarm, a burning stack with smoke streaming back), early retirement and retirement at 65 each staged.
5. Sound on the frame of its picture (`docs/combat-pass/racer/sound-cues.md`): the engine loop following speed and
   boost, skids, crashes, near misses, boost, gates, the alarm, the announcer, the music loop.

**The one independent review** (`docs/combat-pass/racer/review.md`): reads at a glance, the rig is good and original
and keeps the owner's rules, right and wrong cannot be confused; about 4.0 on every axis, cohesion 3.5; eight major
defects. All eight were fixed in one round:

- A black sky after the tunnel: the tunnel now has arches of light and lamps, its mouth shows the sky beyond, and
  the open road is under a whole sky from its first frame.
- Boost flames that read as flat orange wings: narrow tongues trailing back from each stack, gold heart to red tip.
- The rig going black after a crash and at night: smoke leaves to the side, the blink is a brightening, a warm rim
  holds its shape at night. (The kit's heavy smoke is not thrown on a reject here.)
- Shapeless fire and smoke: the same tongues of fire, dark smoke that streams back, embers.
- Announcer lines colliding: `Sound.say` now speaks one line at a time (a shared change: a late line waits its
  turn, a stale one is dropped).
- A flat beige egg sun: gold to magenta, a halo, a glint.
- Brass gears downtown: dark bodies with rims of neon, the middle of the street open to the egg sun.
- Placeholder traffic: dark gloss bodies with light bars, lit windows and a line of neon.

**Tests on the final build**: regression from disk IDENTICAL, regression over HTTP with every asset loaded
IDENTICAL, sequence test 13 of 13, no console errors.

**Still weak, plainly**

- Traffic is restyled, not remodelled: the cars are still simple shapes beside the rig.
- The tunnel's mouth is a flat pale rectangle of sky colour until the road opens.
- The world's buildings and scenery are one matte material; only the rig, the road and the traffic are glossy.
- Nobody has heard the sound: it was checked by cue log and measured loudness only.
- The skid marks and the wreck's fire are simple; the reduced-effects path was not captured.

## Phase 3: Boss Rush (done)

**What was built** (code in `src/js/22-boss.js`, `22c-bossarena.js`, `22d-bossactor.js`, `22e-bosstollgate.js`,
`22f-bossstage.js`, `22g-bossflavor.js`; the old procedural boss and sky stay as the fallback when the page is opened
from disk).

1. Twelve generated bosses (`assets/models/boss-1` to `boss-11`, `boss-all`), each a Tripo model with a part
   split. Eleven are bipeds rigged by Tripo with eight to ten retargeted motion-capture clips, rebuilt as rigid parts
   on the skeleton (`tools/gen/process-rigged.mjs`: armour does not stretch, a robe hangs in bands, any part can be
   torn off). The Probate Tollgate is a toll booth on tracks, split into hinged parts and animated by code, its round
   lamp made a hooded lane signal so it does not read as an eye.
2. Four bosses were remade for originality: the Inflation Titan and the Patrimony Phantom in the look-and-fix pass,
   the Product Pusher and the Longevity Lich after the review (see "Models" in `ASSETS.md`).
3. Arena: three storm and void panoramas seen through a long lens as the backdrop, the scene's light and what the
   chrome reflects, with lightning; the stands and the gate pillars restyled; one row of settings per boss
   (`BOSS_ROW`: sky, framing, glow, attacks).
4. The fight, on the show clock (the rules' frames are untouched): an entrance; a living idle; five telegraphed
   attack kinds (volley, slam, wave, beam, seekers), each boss with its own projectile, trail and impact (contract
   cards, toll tickets, exam papers, molten cracks, drawers, a gavel ring, coins and keys, steam, sand, strings of
   light, a beam of script, a bone arc); strikes that reach the player (a floor shock to the bottom edge, waves that
   fill the band, a hit flash, the HUD crack); hit reactions, rage, wounds that glow and smoke, parts torn off; a
   staged death in slow motion with burning debris, BOSS DEFEATED! with its stars, coins that count the score up; the
   player's defeat (GAME OVER, DEFEATED) held until the results arrive on the rule's frame; the last heart as a
   saturated red frame beating with the alarm.
5. Sound on the frame of its picture (`docs/combat-pass/boss/sound-cues.md`): each boss's roar and hits, the
   strikes, the alarm, the announcer, the boss music and the Proctor's own track.

**The one independent review** (`docs/combat-pass/boss/review.md`): detail 4, lighting 4, materials 4, depth 4,
motion 3.5, cohesion 4, legibility 3, with ten major defects. What was done about them, in one round:

- The boss's words are a one- or two-line caption on a dark plate at the band's top edge, hidden while the
  explanation sheet is up and from the start of a death or a defeat.
- BOSS DEFEATED!, GAME OVER and DEFEATED stand on the top layer until the results arrive (same words, same timers).
- Strikes reach the player: a slam's shock runs along the floor to the band's bottom edge, a wave grows to fill
  the band, volleys, seekers and beams land in the band with a flash.
- Each boss has its own projectile, trail and impact (`22g-bossflavor.js`); the markers stay per attack kind.
- The last heart: a saturated red frame that beats about once a second with the alarm.
- Lookalikes: the Pusher (a chrome face in dark glasses) and the Lich (a crowned skeleton, like the other undead)
  remade with Tripo; the Specter, the Lich and the Phantom now have three different skies.
- Lasting damage reads: a shallower recoil keeps the boss above the front row, wounds glow at their edges and
  smoke, rage turns the rims red with steam.
- Capes, robes, torsos and the Tollgate's booth burn away where they fall instead of standing upright.
- The "blocky sky" was a downscaled strip: a full-size still is smooth, so it was left.
- Minor ones done: the stale "Nooo!" line, the floor's warning easing off, coins that count the score up, the front
  row lit enough to read as heads. Left as minor: the shared entrance drop and death template.

**Tests on the final build**: regression from disk IDENTICAL (153 answers in 8 games), regression over HTTP with
every asset loaded IDENTICAL, sequence test 13 of 13, no console errors. 47 captures in `docs/combat-pass/boss/`
with a list in its README.

**Still weak, plainly**

- Eleven entrances are the same drop and the deaths follow one template (the review called it minor).
- At band size the Fine Print's script and the Lich's falling sand are subtle, and the Specter's coins read as a
  gold clump before they spread.
- The Phantom's and Lord Intestate's faces are dark at band size.
- The remade Lich's robe can show a tiny sliver for a frame in a few clips.
- Nobody has heard the sound: it was checked by cue log and measured loudness only.
