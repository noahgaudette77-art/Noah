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

**Still running when this was written:** the stall census of every game (`hitches.js`) and every screen in WebKit;
their results are added here when they finish, and the Final Exam's script time is measured again on the quiet
machine.

## Carried forward

- **The performance re-check:** the Proctor's 9 draws in the title cell and on the hub's topper (its cap's and its
  reactor's materials could share one: about 4); Memory Bank's generated coins (2,500 triangles each, about 130K at a
  deck's end: a light copy, as the far rocks', would remove most of it); Nest Egg Run's draws at several moments.
- **Phase 2's resumption:** the smoothstep safety sweep (some fifty shader lines; `MASTER_PLAN.md`).
