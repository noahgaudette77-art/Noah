# Phase 3's gate (2026-11-24)

The gate (`MASTER_PLAN.md`): no snapping, no T-pose, no sliding; budgets kept; capture sequences for each main character
and two bosses; the logic diff clean. In order: the page built with the phase's five fixes (`ea8e7ca`) and the harness
on it; an independent review of the code; its findings fixed, and two more faults the better scan then found, the page
built again (`f10b3c2`, live) and its logic checked again; the snap scan on the Phase 5 build and on the final one;
motion-hz; the record.

**Passed:** no fault in the harness; the rules IDENTICAL from disk and served on both builds; every snap the scan finds
in the final build either an impact the game means (held by its hit-stop, as at Phase 5) or at the scan's threshold;
the bosses' planted feet sliding a quarter to a third of what they did; every budget kept.

## The harness (`node arcade/tools/harness.js --name phase3`, on ea8e7ca)

- **Logic:** the content and the scripts untouched since `ee413e3`; the rules IDENTICAL from disk and served (153
  answers in 8 games); the screen sequence ALL 13 STEPS OK.
- **Stills:** 21 on the phone and 21 on the Mac, every one compared with the baseline's (17 and 18 changed, as at
  Phase 5's gate: Phases 2 and 5); **no text overlapping**.
- **Costs** (Phase 5's gate run → Phase 3; budgets: phone 100 draws, 350K triangles, 5 lights; Mac 160, 500K, 6):

| screen | phone draws | phone triangles | Mac draws | Mac triangles |
|---|---|---|---|---|
| title, the glide | 33 → 33 | 146K → 146K | 64 → 64 | 307K → 307K |
| title, the end | 34 → 34 | 168K → 168K | 56 → 56 | 185K → 185K |
| hub | 36 → 36 | 86K → 86K | 84 → 84 | 307K → 307K |
| Risk Blaster | 89 → 90 | 271K → 270K | 116 → 114 | 276K → 331K |
| Nest Egg Run | 91 → 71 | 161K → 141K | 144 → 147 | 300K → 285K |
| **Boss Rush** | 65 → **65** | 111K → **111K** | 84 → **84** | 125K → **125K** |
| Memory Bank | 55 → 55 | 106K → 106K | 68 → 68 | 106K → 106K |
| Final Exam | 77 → 79 | 57K → 57K | 97 → 97 | 57K → 57K |
| Strategy Guide | 49 → 49 | 32K → 32K | 63 → 63 | 32K → 32K |

  Every screen inside its budget on both tiers; lights at most 5. Phase 3 changed Boss Rush's code alone, and Boss
  Rush's draws and triangles are the same to the triangle; the other screens' moves are the seeded scene at the
  measured moment (Risk Blaster's far belt, Nest Egg Run's traffic: 85, 90, 91 and now 71 draws in the last four runs),
  their code untouched. The script time a frame (drawing left out, about 180 frames; this machine, compare only): at
  most 1.02 ms on any screen on either tier; Boss Rush 0.89 ms on the phone and 1.0 on the Mac (Phase 5's quiet
  re-check: 0.73 and 1.12), the foot lock's own share too small to show among the functions sampled (under 0.02 ms).

- **The final build** (`f10b3c2`, with the review's fixes): `harness.js --only logic --name phase3-final`: the content
  and the scripts untouched since `ee413e3`; the rules IDENTICAL from disk and served; the sequence ALL 13 STEPS OK. The
  exam's two hit-stop lines unchanged and no hit-stop added (the same four calls as at `ee413e3`). Its pictures are
  the same as `ea8e7ca`'s but for the bosses' legs in motion (a foot lock). Boss Rush measured on it (`cost-report.js
  --stub --settle 8`): the phone 65 draws, 111K triangles, 0.98 ms of script a frame; the Mac 85, 127K, 0.85 ms (within
  a draw and 2K triangles of `ea8e7ca`'s run: what is in the air at the measured moment); inside every budget.

## The review and its fixes

An independent review (a fresh agent; the code of the five commits and the scan) found nothing that touches a rule, a
score or a timer, and no crash, no NaN, no turn that adds up frame to frame. Its findings, each fixed:

| # | finding | severity | fix |
|---|---|---|---|
| 1 | The foot lock: a foot that came down again while still being let go jumped to its new place in one frame | medium | `089df5f`: held where it is drawn |
| 2 | The scan followed 7 points of a boss (its model is rigid parts on an armature, not a skin): its knees and elbows, which the foot lock and the hanging arm turn, unchecked | medium (tool) | `d52e340`: every joint of the armature |
| 3 | A leg standing nearly straight could bend its knee backward | low-medium | `089df5f`: a 2% lean to the side it bends to standing (learned per leg) decides |
| 4 | The scan judged a planted foot against the run's lowest frame | low (tool) | `d52e340`: against the lowest within half a second either side |
| 5 | Not drawn, the lens's matrix kept last frame's turn (the scan's view from the lens a frame late) | low (tool) | `d52e340` |
| 6 | A foot's standing height took in the body's own dips; a touch was placed on a frame | low | `089df5f`: the dips left out; held where it crossed, let go from where it crossed |
| 7 | Each position read walked up its parents again; a list made a frame | low (cost) | `089df5f` |

With knees and elbows followed, the scan then found two faults of the foot lock itself, both fixed (`094cc05`): letting a
foot go by an easing that starts at its fastest moved a knee 4% of the golem's height in a frame (now eased over 0.3 s);
and the knee's side, read from the line to where the foot is held, put the rearing Perilmonger's knee on the far side as
its hip moved over the foot, and the knee swung round, 32 cm in each of two frames (now read from the clip's own line
from hip to foot; 2 to 10 cm a frame there). And a soft reach: near its full length a leg straightens toward it, never
to it, in a frame.

## Snaps and sliding feet, before and after (`tools/scenarios/pops.js`, the final version of the scan on both builds)

Boss Rush with three bosses (the game Phase 3 changed), 1,500 frames each, right and wrong answers; the Phase 5 build
(`6b73e45`) → the final one (`f10b3c2`). A snap: over 2% of the character's size in one frame and at least four times
the frames round it, in the world and from the lens alike. Planted feet: % of the character's height a second while a
foot stands (left / right).

| fight | the wizard's snaps | the boss's snaps | the boss's planted feet |
|---|---|---|---|
| the golem (5) | 8 → 1 | 2 → 1 | 12.4 / 13.4 → **3.4 / 3.2** |
| the Proctor (12) | 8 → 2 | 11 → 5 | 7.4 / 11.7 → **2.1 / 1.8** |
| the Perilmonger (2) | 9 → 0 | 4 → 2 | 14.1 / 13.9 → **4.2 / 3.4** |

What is left: the bosses' snaps are the frames the wizard's heavy lance lands (the hit's springs and stagger in that
frame, then the hit-stop holds it: an impact the game means, there at Phase 5) and the golem's rage onset (2.3%, as at
Phase 5); the wizard's are at the threshold (2-3% of its height: a heavy cast's start; one a frame of its off hand's fast
swing four times the frames round it, which themselves move 15%). The wizard's own feet are carried with the lens it is
placed against (its "slide" is the lens's, not seen on screen).

The other games (their code untouched by Phase 3; the final scan on the final build): Risk Blaster's demon and fighter
and Nest Egg Run's car show their impacts (the demon knocked back in the hit's frame, the fighter's recoil, the car's
surge at a right gate, each into its hit-stop), the title's caged bosses their twitch (a jolt every 4 to 12 s), the
exam's Proctor its armour popping off at a pass: all meant, all carried to Phase 4 to weigh as feel.

## motion-hz (`tools/motion-hz.js --pops`: the golem and the wizard, each rate against 240 Hz)

| build | 30 Hz largest / mean | 60 Hz | 90 Hz | 120 Hz | the wizard's hand's worst frame at 60 Hz |
|---|---|---|---|---|---|
| Phase 5 (`6b73e45`) | 17.3 / 0.554 cm | 9.5 / 0.325 | 3.4 / 0.094 | 3.1 / 0.086 | 13.9 cm, 27.9 times its neighbours |
| Phase 3 (`f10b3c2`) | 17.3 / 0.661 cm | 7.7 / 0.348 | 3.5 / 0.125 | 2.1 / 0.093 | 7.6 cm, 1.3 times |

The largest gap at 60 and 120 Hz is smaller (the wizard's wand no longer depends on the rate); the means are a little
higher, the foot lock's: where a foot comes down and is let go falls between frames (each placed where it crosses: the
boss's foot 6.2 cm from 240 Hz at 60, from 2.6 without a lock). The boss's largest one-frame moves are its strike and
its rage, as at Phase 5 (2 to 2.5 times their neighbours: fast, not snapped).
