# Phase 5's gate (2026-11-24)

The gate: every screen consistent; budgets kept; before and after stills at the same moments; the rules untouched.
In order: the harness on the finished work (`42bbcd9`, the machine quiet), an independent review of the code and the
stills, its eight findings fixed (a commit each), the game built again with them (`6b73e45`) and checked, the stall
census and every screen in WebKit on that build.

## The harness (`node arcade/tools/harness.js --name phase5`, on 42bbcd9)

**No fault.**

- **Logic:** the content and the scripts untouched since `ee413e3`; the rules IDENTICAL from disk and served (153
  answers in 8 games); the screen sequence ALL 13 STEPS OK.
- **Stills:** 21 on the phone and 21 on the Mac, every one compared with the baseline's (17 and 18 changed: Phases 2
  and 5); **no text newly overlaps**. Against Phase 2's final run, the change this phase made, largest first: Risk
  Blaster (the far rocks, the C drone, the Mac's nebula), Boss Rush (the crowd, the deck), the Proctor's cell, the
  title's end and cells, the hub; the menus, the guide and the exam's hall unchanged (under 0.012 RMSE: a different
  tip or question at most).
- **Costs** (Phase 2's final run → Phase 5; budgets: phone 100 draws, 350K triangles, 5 lights; Mac 160, 500K, 6):

| screen | phone draws | phone triangles | Mac draws | Mac triangles |
|---|---|---|---|---|
| title, the glide | 33 → 33 | 146K → 146K | 63 → 64 | 293K → 307K |
| title, the end | 35 → 34 | 185K → 168K | 48 → 56 | 185K → 185K |
| hub | 41 → **36** | 86K → 86K | 88 → **84** | 302K → 307K |
| Risk Blaster | 90 → 89 | 267K → 271K | 113 → 116 | 245K → 276K |
| Nest Egg Run | 85 → 91 | 139K → 161K | 144 → 144 | 303K → 300K |
| Boss Rush | 65 → 65 | 111K → 111K | 84 → 84 | 125K → 125K |
| Memory Bank | 53 → 55 | 98K → 106K | 66 → 68 | 98K → 106K |
| Final Exam | 79 → 77 | 57K → 57K | 97 → 97 | 57K → 57K |
| Strategy Guide | 49 → 49 | 32K → 32K | 63 → 63 | 32K → 32K |

  Every screen inside its budget on both tiers; lights at most 5 on both; textures within 1 MB of Phase 2's, the
  title's 5 to 11 MB lower (the old Proctor's maps gone). What moved, and why:
  - **The title's end on a Mac, 48 → 56:** the Proctor in its cell is now 9 draws (its skin, its skull, the cap's
    pieces, the reactor and the eyes, a material each, merged; the reactor's glow a sprite), where the old figure was
    2 (counted cell by cell: every other boss is 1 or 2); and the dressing's moving light, 1. Phase 5's title agent,
    counting the same pose with every piece of the hall in, had 55 → 56: the 48 of Phase 2's run was taken before the
    hall's last pieces were in.
  - **The hub, 41 → 36 (phone), 88 → 84 (Mac):** the eight laser beams one mesh.
  - **Risk Blaster:** the far rocks' light copies (+4K triangles on the phone, +31K on the Mac, where more of the belt
    is seen) and the C drone's nacelles.
  - **Memory Bank, +2:** the coins' two trays.
  - **Nest Egg Run, 85 → 91 on the phone:** no Phase 5 change there; its draws follow the seeded traffic and props in
    view at the measured moment (85, 90 and 91 in the last three runs). Noted for the performance re-check.
  - The script time a frame (this machine, software drawing: compare only): lower than Phase 2's on every Mac
    screen; on the phone within 0.1 ms of it but on two: Boss Rush 0.98 → 1.25 ms (on the Mac 1.32 → 0.79) and the
    Final Exam 0.55 → 0.97 ms, whose reading took 26 frames, not 180 (the page held up while it ran). Both measured
    again on the quiet machine: below.

## The review and its fixes

An independent review (a fresh agent; the code of every Phase 5 commit and its stills) found eight things, none in
the rules. Each fixed in a commit of its own:

| # | finding | severity | fix |
|---|---|---|---|
| 1 | Risk Blaster's far rocks: a light copy sized for half the rocks could be drawn alone (when the other rock's file did not come) and asked for twice its instances: no far rocks, WebGL errors every frame | medium | `ee502d2`: each copy room for all 96 |
| 2 | Boss Rush's crowd ran on the scene's clock, not the show's: its time uniform sat in uniforms the light sticks' material holds, and `FX.sync` sets every `uTime` each frame (a hit-stop did not hold it, the rage did not quicken it) | medium-low | `9b9ef88`: its own `uCrowdT` |
| 3 | Leaving the title disposed the glow picture every screen shares (the Proctor's reactor lamp is a glow sprite): sent to the graphics chip again on the next screen | low-medium | `c08ca74`: `hallRelease` keeps it, as `disposeTree` and `GFX.rest` do |
| 4 | The rebuild list's Mac-sky row named the giant planet, which had not moved: on a Mac it stood under an answer drone | low | `447be47`: a wide window's own place for it (`planetW`), between the demon and the drones; the phone as it was. `blaster/planet-mac-before-after.jpg` |
| 5 | On a Mac the hulls mirrored the phone's patch of sky, not the band's | low | `d4dbece`: one aim for the band and the reflection |
| 6 | Two smoothsteps asked for a falling edge (undefined in GLSL), one now compiled on three more screens | low | `286910a`; the other fifty-odd, older, noted for Phase 2's resumption |
| 7 | Two notes no longer true; the Proctor's builders drew three.js's ids from the game's stream | low | `b905f86`, `4b91072`: their own stream (`ownRandom`), the notes made true |
| 8 | A list made every frame for the crowd; the title's Proctor lit a frame behind its pose | minor | `60c6637`, `30b24e4` |

## The final build (6b73e45, the review's fixes in)

- **Logic** (`harness.js --only logic --name phase5-fixes`): the content and the scripts untouched since `ee413e3`;
  the rules IDENTICAL from disk and served; the screen sequence ALL 13 STEPS OK. The exam's two hit-stop lines
  unchanged; no hit-stop added anywhere (the same four calls as at `ee413e3`).
- **Served:** https://noah-2ci.pages.dev/ serves this build (checked for code only it has).
- **The planet on a Mac:** six regions, before and after at the same moments (`blaster/planet-mac-before-after.jpg`):
  clear of the drones in the nebula, the belt, the station and the gate; the graveyard's lies past the haze in both;
  the orbit's great planet as it was.

- **Every screen in WebKit** (Safari's engine, this machine's software path; `harness.js --only stills --engine
  webkit --name phase5-webkit`): all 21 screens on the phone and the Mac drawn, **no text overlapping**, no fault;
  side by side with Chromium's (`webkit-phone.jpg`, `webkit-mac.jpg`: each pair Chromium left, WebKit right) the
  same picture on every screen: the hall, its cells and the new Proctor, the hub, the games, the menus. The only
  difference is the type's measure: WebKit's letters run a little wider, so a long answer wraps a word sooner (the
  cards the same size and in the same place; nothing cut, nothing overlapping). This also closes Phase 2's WebKit check: the build
  carries all of Phase 2.

## The stall census (`hitches.js`, every game played on `6b73e45`; Phase 1's census in brackets)

Each screen opened and played 1,340-1,500 frames with every frame drawn (the title's glide and the hub idling; the
games with right and wrong answers): what still stalls a frame on a device.

| screen | shaders made in play | pictures sent in play | garbage a frame | page changes a frame |
|---|---|---|---|---|
| title | 10, all through `GFX.prepare` [3] | its bosses' pictures as each arrives (58 pictures, 130 MB [56, 128 MB]) and their bone tables | 10.1 KB [4-8] | 0 [0] |
| hub | 0 [0] | the attract screen, a 320x240 canvas about every other frame [the same] | 4.7 KB [5] | 0 [0] |
| Risk Blaster | 0 [1, fixed in Phase 1] | 0 | 59.9 KB [61] | 0.62 |
| Nest Egg Run | 0 [0] | 0 | 65.9 KB [61] | 0.83 |
| Boss Rush | 0 [0] | the wizard's bone table, 16 KB a frame [the same] | 38.7 KB [49] | 1.06 [0-1.4] |
| Memory Bank | 0 [0] | 0 | 4.6 KB [4] | 0.02 |
| Final Exam | 0 [0] | 0 | 7.7 KB [10] | 0.97 |

- **No shader is made in play in any game.** The title's 10 come as its pieces arrive, each through `GFX.prepare`
  (drawn once off-screen in a scene of its own before it is shown; on Safari, and on Chrome with a graphics chip, built
  on the driver's own threads): 3 at the start of the hall, as in Phase 1, and 7 at once as the Proctor's cell is seated
  (its sprite, its skin, cap, reactor and eyes: a program each). For the performance re-check: the Proctor's pieces
  could share fewer programs (with its 9 draws, below).
- **Garbage:** as in Phase 1 or less but for the title, 10 KB a frame from 4-8: its update (5.8 KB) and the cells'
  lamps (0.9 KB: a list made a frame). At that rate the collector sweeps every few seconds for about a millisecond; noted
  for the performance re-check.
- **Memory Bank:** as in Phase 1's census, its play turned no card (the census's play of that game deals and waits; its
  deck's turn and grade are not in it). Noted for the performance re-check.

## The two noisy timings, measured again on the quiet machine (`harness.js --only costs --screens exam,boss --name phase5-recheck`)

The page measured is the gate's build (`6b73e45`); the main thread's own time a frame with the drawing left out, over
about 180 frames:

| screen | phone (Phase 2 → the gate's run → quiet) | Mac (the same) |
|---|---|---|
| Boss Rush | 0.98 → 1.25 → **0.73 ms** | 1.32 → 0.79 → 1.12 ms |
| Final Exam | 0.55 → 0.97 (26 frames) → **0.87 ms** (178 frames) | 0.66 → 0.59 → 0.47 ms |

Boss Rush's 1.25 was the busy machine (and its Mac's 0.79 against 1.12 shows how far two runs of the same page drift
here: compare only). The exam's 0.87 is not its own work: sampled by function (`cost-report.js
--cpu`), its update and the Proctor's settle are 0.05 ms a frame; the rest is a model still being read and pictures
decoded when the measure ran (`fetch`, `Blob`, `createObjectURL`, the glTF reader) and the collector after them, a
one-off of the exam's first seconds, not every frame. Draws, triangles and lights the same as the gate's run; every
budget kept.

## Carried forward

- **The performance re-check:** the Proctor's 9 draws in the title cell and on the hub's topper (its cap's and its
  reactor's materials could share one: about 4); Memory Bank's generated coins (2,500 triangles each, about 130K at a
  deck's end: a light copy, as the far rocks', would remove most of it); Nest Egg Run's draws at several moments; the
  title's garbage (10 KB a frame) and the Proctor's 7 programs; the census's play of Memory Bank, to turn and grade cards.
- **Phase 2's resumption:** the smoothstep safety sweep (some fifty shader lines; `MASTER_PLAN.md`).
- **Found after this gate** (Phase 3's snap scan, which plays every game and follows every character's joints frame by
  frame): the Proctor's hanging arm, when its hand is torn and in its last stand, swung up instead of down (its bones run
  along their own axes, not +Y as the captured rigs' do). Fixed in Phase 3 (`19850a2`); the other eleven bosses
  unchanged. It ships with Phase 3's build.
