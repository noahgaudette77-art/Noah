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

## Checkpoints

| # | Checkpoint | Status |
|---|---|---|
| K0 | Back up; Phase 0 audit of every screen | done |
| K1 | Rendering: one maximum mode, full pixel density, multisampling, depth passes, bloom, grade | done |
| K2 | Title screen | done |
| K3 | Arcade hub | done |
| K4 | Risk Blaster | in progress |
| K5 | Nest Egg Run and Boss Rush | |
| K6 | Final Exam, Memory Bank, Strategy Guide | |
| K7 | Interface design system | |
| K8 | Originality audit, final checks, report | |

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
