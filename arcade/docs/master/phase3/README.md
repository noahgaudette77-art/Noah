# Phase 3: animation and characters (2026-11-24)

Run fourth, by the owner's order of 2026-11-24 (0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8), on what Phase 5
left final. The plan (`MASTER_PLAN.md`, Phase 3): strips of every main character before any change, read for snapping,
T-poses, sliding feet, stiffness, robot timing and gaze; the worst fixed first, nothing that costs a phone's frame.

**The gate: see `gate-report.md`.** **Spend: nothing** (no provider called).

## How the faults were found

The strips (`scratchpad/phase3/before/`, the same moments in any build) showed the characters' poses but not what
happens between two frames, so a scan was written for it: **`tools/scenarios/pops.js`** plays each game with right and
wrong answers on the capture tool's clock and follows every joint of every character, every frame (the bosses and the
wizard in Boss Rush, the title's twelve caged bosses, Risk Blaster's demon and fighter, Nest Egg Run's car, the Final
Exam's Proctor). A snap is a move in one frame over 2% of the character's size and at least four times the moves of the
frames round it, seen both in the world and from the lens (a character the lens carries, or a lens that shakes, is not
one). It also measures how far a planted foot slides. `tools/motion-hz.js --pops` does the same for one boss and the
wizard at 30, 60, 90 and 120 Hz against 240.

## What changed in the game

| commit | change | measured |
|---|---|---|
| `31ab448` | **The wizard's cast** took its weight from the idle first: a cast that came while the wand was half raised dropped the idle's share in two frames | its hand's worst move in one frame (motion-hz): 13.9 cm at 27.9 times the frames round it → 7.4 cm at 3.9 |
| `ef097a1` | **The wizard's cast** brought its arm out in 0.09 s: in the fight a quick answer finds the wand half raised, and the arm's 70 cm came in four frames | over 0.15 s, nine frames: motion-hz's worst hand move 7.6 cm at 1.3 times the frames round it; the scan finds no snap in the wizard (8 → 0 with the golem; 8 → 1 with the Proctor, a 4 cm one). `cast-before-after.jpg` |
| `d4e5316` | **A boss's strike** after an early wrong answer (its wind-up barely begun) forced its clip from 0.12 to 0.70 of the pose in one frame: the hand's 1.7 m in a frame | its weight now comes in across the blow, still landing on the rule's frame: no strike jump left. `strike-before-after.jpg` |
| `19850a2` | **The Proctor's hanging arm** (its hand torn, and both arms in its last stand) swung up instead of down and flipped frame to frame: its bones run along their own axes (Phase 5 put the owner's machine on its own joints), not +Y as the captured rigs' do | the arms hang; the boss's snaps with the Proctor 6 → 0; the other eleven bosses unchanged. `proctor-arms-before-after.jpg` |
| `7a4a420` | **A boss's feet on the floor stay where they stand**: the clips (three quarters of it) and the body moved over them slid the planted feet 5-26% of the boss's height a second, seen when a strike widens the lens. A planted foot is held where it came down and the leg bent to it (two bones, the knee in the leg's own plane) | planted-foot slide over a whole fight: the golem 153% of its height → 21%, the Proctor 166% → 19%, the Perilmonger 58% → 8%; no snap added; script time within this machine's noise |

## Kept as they are (meant), for Phase 4 to weigh as feel

The scan flags these, but each is an impact meant to land at once: Risk Blaster's demon knocked back in the frame the
fire lands and held there by the hit-stop; the fighter's recoil; Nest Egg Run's surge at a right gate (its curve,
`sin(pi * sqrt(x))`, starts at full speed: 39% of the lunge in its first frame, then the hit-stop); the title's caged
bosses' twitch (a jolt shaken at 30 Hz, the frame rate's limit: it may read as a strobe more than a shudder); the
exam's Proctor's armour popping off at a pass. The title's far bosses on a Mac move ten times a second (an animation
saving): the scan finds no snap in them on either tier. Boss Rush's crowd changes figure between two drawings (arms down,
arms up), as a crowd of cut-outs does.

## What to test on the devices

- **iPhone and Mac:** Boss Rush: answer fast, right and wrong, and watch the wizard's wand arm (a thrust, no jump) and
  the boss's strike after a wrong answer given early (the blow comes in; no frame where it jumps); watch the boss's feet
  as a strike widens the picture (they stay planted); the Proctor's last fight: when its hand is torn off the arm hangs,
  and on the last right answer both arms hang as it sways.
