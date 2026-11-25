# Phase 4: game feel (2026-11-25)

Run sixth, by the owner's order of 2026-11-24 (0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8). The plan
(`MASTER_PLAN.md`, Phase 4): input at once, shake capped and reducible, impacts, telegraphs, answer feedback, the camera;
the carried items (the Mac's Risk Blaster explanation over the demon; the impacts Phase 3's snap scan flags as meant).

**The audit: `audit.md`.** Every game answers a tap in the frame it lands and loses none to a transition, and every
impact already has its sound, flash, floater, haptic, sparks and hit-stop; the faults were in how things move.
**The gate: see `gate-report.md`.** **Spend: nothing.**

## What changed in the game

| commit | change | measured |
|---|---|---|
| `3044dad`, `3a6fd48` | **The camera's shake a smooth noise in time** (value noise at 18 Hz, x and y their own, pushed toward its edges), not a fresh random offset every frame: a buzz, twice as fast at 120 Hz as at 60, drawn from the game's own random stream. The same at any frame rate, slowed in a hit-stop, on no random stream; its amounts, decay, caps and calm scale as they were | as far off on average (0.75 of the amount against 0.76), never further; its jump a frame a third of the old one's (Boss Rush, phone, a wrong answer: 0.018 against 0.061) |
| `489a2aa` | **Risk Blaster's explanation on a Mac** stands the lens back (the picture drawn smaller about the band's top, to 72% at most) before it lifts: lifted whole, the demon's head went under the question panel (Phase 2's audit #15, the art review's #9) | the whole demon between the question and the sheet, the fighter above it; a phone as it was. `blaster-explanation-mac-before-after.jpg` |
| `19b0902` | **The title's caged bosses' twitch** at 10 to 12 Hz, not 21 to 28 (the frame rate's limit: a strobe, not a shudder; Phase 3's snap scan) | |
| `bc7a612` | **Nest Egg Run's surge** at a right gate out over its first fifth on an ease-out: 39% of its lunge came in its first frame (Phase 3's snap scan) | 22% in the first frame at 60 Hz, 40% by the second; its height at 0.21 s as before; back on a cosine that settles |
| `3590644` | **Nest Egg Run's lean and its sun's easing by time**, not by frame (the lean was half as much at 120 Hz) | the same at 60 Hz |

## Weighed and kept

The hit-stops (each on a blow the game means; none added, the owner's rule; the exam's two lines untouched); Risk
Blaster's demon knocked back in the frame the fire lands and the fighter's recoil (impacts that should land at once);
Nest Egg Run's camera, which follows the car (the car's ease is its damping); Boss Rush's and Risk Blaster's staged
cameras (Phase 3 measured them); the wizard's bolts, whose sounds leave with them (Phase 6 times the sound).

## What to test on the devices

- **iPhone (120 Hz) and Mac:** answer wrong in Boss Rush and Risk Blaster: the picture should sway with the blow, not
  buzz; with Setup's calm on, a third as much. Nest Egg Run: a right gate's surge should punch forward without a jump;
  the car's lean on a lane change the same on both.
- **Mac:** Risk Blaster, a wrong answer: the explanation comes up and the demon stays whole between the question and the
  sheet.
- **Title:** a caged boss's twitch reads as a shudder.
