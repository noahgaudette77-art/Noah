# The performance re-check (2026-11-25)

Run after Phase 7 and before Phase 8, by the owner's order of 2026-11-24 (0, 1, 5, 3, 2, 4, 6, 7, a performance
re-check, 8). The plan (`MASTER_PLAN.md`, the performance re-check): every screen measured again on both tiers against
Phase 1's budgets and the baseline; the census (stalls, garbage, page changes); memory over cycles; the governor in both
engines; whatever a later phase cost, put right before Phase 8. With it, the items the phases left for it: what a closed
screen's parked materials still hold (Phase 7's soak), the raw files kept after decoding, Risk Blaster's and Nest Egg
Run's phone draws at the budget's edge, the Proctor's draws, Memory Bank's coins, the title's garbage.

This machine draws in software: what it measures is draws, triangles, memory, behaviour, and one build's cost against
another, never a device's frame rate.

## Where it started

The page built at the end of Phase 7 (`687ef68`), measured by the harness (`docs/master/runs/phase7-final`):

| tier | screen | draws | triangles | lights | memory MB |
|---|---|---|---|---|---|
| phone | the title (glide) | 33 | 146K | 4 | 347 |
| phone | the title (end) | 34 | 168K | 4 | 347 |
| phone | the hall | 36 | 86K | 4 | 227 |
| phone | Risk Blaster | 88 | 244K | 5 | 371 |
| phone | Nest Egg Run | 74 | 132K | 5 | 315 |
| phone | Boss Rush | 65 | 111K | 5 | 267 |
| phone | Memory Bank | 55 | 106K | 4 | 123 |
| phone | the exam | 79 | 57K | 5 | 157 |
| phone | the guide | 49 | 32K | 3 | 104 |
| Mac | the title (glide) | 64 | 307K | 4 | 691 |
| Mac | the title (end) | 56 | 185K | 4 | 691 |
| Mac | the hall | 85 | 318K | 4 | 576 |
| Mac | Risk Blaster | 97 | 255K | 5 | 795 |
| Mac | Nest Egg Run | 142 | 306K | 5 | 793 |
| Mac | Boss Rush | 84 | 125K | 5 | 714 |
| Mac | Memory Bank | 68 | 106K | 4 | 487 |
| Mac | the exam | 98 | 57K | 5 | 520 |
| Mac | the guide | 63 | 32K | 3 | 467 |

Every screen inside its budget at that one moment (phone: 100 draws, 350K triangles, 5 lights, 450 MB; Mac: 160, 500K,
6, 900 MB). The items the phases had left for the re-check came first; then the measure at one moment was itself
checked against many (c).

## What changed in the game

| commit | change | measured |
|---|---|---|
| `a7eab8b`, `e9a99d1` | **What a closed screen's parked materials held, let go**: eight shader hooks (and two reflections' dispose hooks) made in functions of their own, each holding only what its shader needs (a) | kept by the parked materials alone: 9.42 MB of arrays, then 0.01 MB; the heap at a round's end 27.2 MB, then 23.0; every program on six screens, served and from disk, the same text |
| `9d16d26` | **A file's raw bytes let go once decoded and kept** (a sprite of sounds, a sky, a page picture) (b) | a phone's round of every screen: 57.1 MB of raw files held, then 40.5; no file fetched twice; every take and loop passes `audio-check.js` |
| `bf8c237` | **The Proctor's reactor in one draw** (six meshes of one material) (c) | five draws fewer a pass wherever a Proctor stands; the stills the same |
| `a74b4b7` | **A phone's lighter copies of Risk Blaster's passing ships and near rocks** (c) | a phone's busiest frame 438K triangles, then 294K (the budget 350K); a Mac unchanged |
| `e041f16` | the page built | rules IDENTICAL from disk and served, content and scripts untouched |

## (a) What a closed screen's parked materials still held

`GFX.park` keeps a closing screen's materials until the next screen of its kind is warmed, for their shaders (a phone
compiling them again froze the screen for a second or more). A material keeps its hooks (`onBeforeCompile`,
`customProgramCacheKey`), and a hook made inside a function keeps that function's whole scope: in V8 every closure made
in one call shares one scope object, holding every variable any of them uses. Phase 7 found the title hall's whole old
scene held that way (25 MB a visit) and moved that hook out. `tools/heapparked.js` on the 12-minute snapshot run after
it (`soak.js SNAP=1`, round 3) measured what the parked materials alone still kept, by the scope that holds it:

| the screen whose materials are parked | the hook's scope (its variables) | what it led to | MB of arrays |
|---|---|---|---|
| Boss Rush | `makeCrowd` (s, P, U, aFig, aRim, folk, hazeTex) | the arena's scene, `s` | 3.08 |
| Boss Rush | the wizard's constructor (this, F, R, has, C, tex) | the wizard, its fight, the arena | 2.80 |
| Risk Blaster | `genKit` (made) | a generated ship's geometry as made | 2.23 |
| Memory Bank | `surfaceDetail` (prev, prevKey, U) | the spun gold's hook made in `build3D`, and so the game | 1.06 |
| Nest Egg Run | a region's reflection (r, sky, sc, basic, rt) | the scene drawn into it, `sc` | 0.10 |
| Risk Blaster | a region's reflection (sc, rt) | the scene drawn into it, `sc` | 0.10 |
| | | **all** | **9.42** |

Bounded (one old scene a kind, until that screen comes round again and lets the parked ones go), but on a phone some
9 MB of arrays and the objects round them for nothing. Each hook is now made in a function of its own that takes only
what the shader needs (`bossCrowdMaterial`, `wizardLook`, `spaceShipFar` and `spaceRockFar`, `memorySpunGold`, and
`ownTarget` for a reflection's dispose); so are the two made in constructors that the snapshot did not single out but
that hold their constructor's scope the same way (`fighterGlassLook`, `racerGlassLook`). The shaders are the same text
(every moved line checked; every program on six screens dumped from both builds, served and from disk, and
compared: 458 served and 178 from disk, the same text whitespace aside, the moved ones among them).

The same snapshot run on the build with the hooks moved (`a7eab8b`): **0.21 MB** kept by the parked materials alone,
from 9.42, all of it the two reflections' scenes (fixed next, `e9a99d1`); the heap at the same moments of round 3 about
3 MB lower (24.0-24.1 MB after Boss Rush, Memory Bank and the exam, against 27.1-27.2), its arrays outside that count.
With the reflections fixed too (a 6-minute snapshot run on the build with both): **0.01 MB** (one racer's object), and
the heap at a round's end 23.0 MB (27.2 before, in the 12-minute run).

## (b) The phone's memory outside the graphics chip

`tools/scenarios/kept.js` (new) on a phone's page (`#phone`: its skies drawn down to 2048 x 1024): every screen in turn,
and what is held after each (MB):

| after | raw files kept | of them: sound, sky, page pictures | skies decoded | sound effects decoded | music decoded |
|---|---|---|---|---|---|
| the title | 20.4 | 3.6, 0.6, 0.8 | 1 (8) | 0 | 26.3 |
| the hall | 20.4 | 3.6, 0.6, 0.8 | 3 (12) | 48.4 | 27.2 |
| Risk Blaster | 31.7 | 4.9, 3.0, 0.8 | 6 (36) | 65.1 | 29.4 |
| Nest Egg Run | 39.0 | 5.6, 4.5, 0.8 | 11 (76) | 73.6 | 28.3 |
| Boss Rush | 48.0 | 7.5, 6.0, 0.9 | 14 (100) | 97.1 | 30.2 |
| Memory Bank | 50.0 | 7.5, 6.7, 0.9 | 15 (108) | 97.1 | 28.6 |
| the exam | 53.9 | 7.5, 7.4, 1.0 | 16 (116) | 97.1 | 25.8 |
| the guide | 56.0 | 7.5, 8.1, 1.0 | 17 (124) | 97.1 | 28.0 |
| Risk Blaster again, then the hall | 57.1 | 7.5, 8.1, 1.0 | 17 (124) | 97.1 | 27.2 |

What grows stops when every screen has been seen (the last two rows: nothing new). The raw files kept are of three
kinds. A model's are read again by every visit (each scene parses its own copy: 28 MB). Music's are read again on a
track's next visit (only the playing track is kept decoded, about 27 MB: Phase 6). A sound sprite's, a sky's and a page
picture's are never read again: what is made of them is kept for the session. Those **16.6 MB** are now let go once
decoded (`Assets.release`; the hall's fetching ahead skips them). The rest was weighed and kept:

- **The skies decoded, 124 MB at the end** (17 skies, each a 2048 x 1024 canvas on a phone). Letting a screen's skies go
  when it closes would hold a phone near 40 MB, but every return to a game would decode its skies again behind the
  loading line (the racer has five, each a 4096 x 2048 picture to decode and draw down). A game that opens at once
  comes before memory the owner's phone has to spare: kept. (Ready if a device shows memory trouble: an `Assets.kept` sky let go when no screen in sight wants
  it, its file fetched again.)
- **The sound effects decoded, 97 MB** (7 sprites, played at any moment by any screen) and **the music playing**
  (27 MB): what the game plays.
- **The page pictures decoded** (37 MB): images, which a browser may let go of and decode again on its own.

KEPT_AFTER

## (c) The draws and triangles at many moments, not one

The harness measures each screen at one moment. `tools/scenarios/draws.js` (new) plays each game as the soak does (one
answer in four wrong, the explanation read, Memory Bank's cards turned and graded, the exam answered, played again at
its end) and counts a whole frame (every pass) about every second, on the tier fixed as Setup fixes it; at the busiest
frame it lists what drew it, and what it drew beyond a middling frame. The page with the re-check's changes:

| phone (PHONE tier; budget near 100 draws, 350K triangles) | draws: least / median / most | triangles: least / median / most |
|---|---|---|
| Risk Blaster | 46 / 95 / 118 (another run 52 / 94 / 119) | 174K / 339K / 438K before the phone's copies; **166K / 247K / 294K after** |
| Nest Egg Run | 59 / 92 / 105 (another run 54 / 87 / 103) | 103K / 180K / 216K |
| Boss Rush | 45 / 70 / 79 | 64K / 112K / 140K |
| Memory Bank | 55 / 57 / 57 | 106K / 146K / 195K |
| the exam | 50 / 72 / 75 | 57K / 57K / 154K |

| Mac (MAC tier; budget 160 draws, 500K triangles) | draws: least / median / most | triangles: least / median / most |
|---|---|---|
| Nest Egg Run | 102 / 148 / 169 | 204K / 374K / 502K |
| Risk Blaster | 63 / 111 / 131 | 180K / 354K / 476K |
| Boss Rush | 54 / 124 / 133 | 61K / 181K / 244K |
| the exam | 70 / 92 / 94 | 57K / 57K / 154K |

The one-moment measure had Risk Blaster's phone at 88 draws and 244K triangles; at its busiest it asks for a third more
of each. Put right:

- **Risk Blaster's triangles on a phone** (`a74b4b7`): a passing ship was 8,000-9,000 triangles and a near rock 7,000,
  a few dozen pixels across on a phone's screen. A phone now draws copies at two fifths of that (meshoptimizer's
  simplifier, `tools/gen/phone-lod.mjs`, the picture's seams kept) in the full models' own material and picture; a Mac
  draws the full ones and never fetches the copies. Each beside its full model at 150 and 60 px: the same at 60, the
  outline and the detail kept at 150. The escort, which flies close, keeps its full models. Busiest frame: 438K to 294K.
- **The Proctor's reactor** (`bf8c237`): its rim, the vent's four slats and the core's collar were six meshes of one
  material; one now, five draws lighter a pass wherever a Proctor stands (the exam, the title's cell, the hub's topper).
  The exam's still and the cell's the same as before (a spark's place aside); the hub's to the pixel.

Weighed and left (each to watch on the device with Setup > FPS counter, the arbiter this machine cannot be):

- **Risk Blaster's phone draws at its busiest, 118-119** (the median 94-95, inside the budget). A typical frame
  (`drawlist.js`, every draw named): the four answer drones 8 draws each (crystal, its outline, glass, rim, halo, lamps,
  airframe, the dark plate; 32 with four up), the overlord 14 (thirteen parts and its lights), the fighter 12 (body,
  wings, cannons, five engines, canopy, flame), the passing ships 8, the rocks 4, the post-processing 12. The busiest
  frames add a blast's spheres, sparks and debris, one or two draws each. Fewer draws would mean making each character
  one skinned mesh: but the fighter's wings flap and its engines turn, the overlord's horns, tail and wings are shot
  away and burn up on their own, the drones crack and light up one by one. Each a rework of how a character moves and
  breaks, at the end of the overhaul, for a measure the median keeps.
- **Nest Egg Run on a Mac at its busiest, 169 draws and 502K triangles** (the median 148 and 374K). The wet road's
  reflection draws 45 of a frame's 125 scene draws again (the war rig's eight parts among them: its wheels turn, its
  exhaust stacks shudder and one falls in a wreck, so they are not one mesh). Taking things out of the reflection
  would take them out of the road's picture.
- **Memory Bank's coins**: at a deck's end 195K triangles on a phone, inside the budget: no light copy needed.

## The governor, in both engines

`tools/governor-test.js`: 56 checks, all passing, in Chromium and in WebKit (the phone's ladder, the Mac's, a 30 Hz hold,
moving between a 2x and a 1x display, resizing twenty times without a leak).

## Tools (new)

- `tools/scenarios/draws.js`: the draws and triangles a frame asks for at many moments of play (every pass), the least,
  the median and the most, and what drew the most.
- `tools/scenarios/kept.js`: what a session keeps in memory outside the graphics chip, screen by screen (the files' raw
  bytes, the skies decoded, the sounds decoded, the page pictures).
- `tools/scenarios/shader-dump.js`: `STAGE=` (a game's other stage).
