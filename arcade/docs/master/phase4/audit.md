# Phase 4: game feel, the audit (2026-11-25)

Read from the code, game by game, what happens between a tap and the first thing seen and heard, and what shakes,
moves and lands after it; and the carried items (Phase 2's Mac explanation, Phase 3's snap scan).

## What is already right

- **A tap is answered at once in every game.** Risk Blaster: the panel marks and locks the answer, the fighter turns and
  fires, the shot's sound plays, all in the frame the tap lands (`BlasterGame.pick`); the verdict 0.22 s later. Nest Egg
  Run: the lane marked, the car on its way (it eases over at 7/s: 12% of the way in the first frame), a sound. Boss Rush:
  the verdict shown, the wizard's burst away (`BossGame.pick`). The Final Exam: the answer marked.
- **No tap is lost to a transition:** each game shows its cards and starts taking answers in one call
  (`nextQuestion`: `quiz.show`, then `state = "ask"`), so there is no window where a card is seen and a tap ignored.
- **Every impact has its layers:** a sound, a flash (`UI.flash`, `GFX.pulse`), a floater, a haptic buzz, sparks and a
  shockwave, the existing hit-stops (`GFX.hitStop`, `VFX.hitStop`), a shake, the crowd's cheer. Not one is silent.
- **Reduced motion and calm** take a shake to 30%, stop the cells' rattles, the boss's hit star and the surge.

## Faults, worst first

| # | fault | where | fix |
|---|---|---|---|
| 1 | **The shake is white noise a frame**: a new random offset every frame, up to the shake's size, so it buzzes rather than shakes, and twice as fast at 120 Hz (the game runs to 120 where the screen does). Its offsets are drawn from the game's own `Math.random` stream | `Scene3D.placeCamera` (04-gfx.js), every game's 30-odd `shake()` calls | a smooth noise in time (value noise at 18 Hz, x and y their own), the same at any frame rate, on no random stream; its size, decay, caps and the calm/reduced-motion scale as they are |
| 2 | **Risk Blaster on a Mac: the explanation lifts the whole picture** up to 40% of the band so the fighter clears the sheet, and the demon's head goes under the question panel (Phase 2's audit #15, the review's #9) | `BlasterGame.update` (20-blaster.js, the lift) | on a wide window the lens stands back instead (the picture drawn smaller about the band's top, to 72%), and only what still does not fit is lifted; a phone as it is |
| 3 | **The title's caged bosses' twitch at 21 to 28 Hz**, at the frame rate's limit: it reads as a strobe, not a shudder (Phase 3's snap scan) | `HallScene.update` (10d-titlehall.js) | the same jolt at 9 to 12 Hz |
| 4 | **Nest Egg Run's surge at a right gate: 39% of its lunge in its first frame** (`sin(pi sqrt x)` is infinitely steep at its start), then the hit-stop: a pop (Phase 3's snap scan) | `RacerRig.update` (21e-racerrig.js) | out fast over its first fifth (an ease-out: 22% in the first frame, 40% by the second), back slowly as before |
| 5 | **Nest Egg Run's egg eases a fixed share a frame** (its size, its narrowing downtown), twice as fast at 120 Hz. (The car's lean by its move a frame, listed here first, turned out dead: the car kits set it to naught each frame; the independent review) | `RacerGame` (21-racer.js) | by the time passed |

## Weighed and kept

- **The hit-stops** (`GFX.hitStop`, `VFX.hitStop`): each lands on a blow the game means (Phase 3's scan); none is added
  (the owner's rule), the exam's two lines untouched.
- **Risk Blaster's demon knocked back in the frame the fire lands, the fighter's recoil:** impacts that should land at
  once, each held by its hit-stop.
- **The camera:** Nest Egg Run's follows the car (the car's own ease is its damping); Boss Rush's and Risk Blaster's are
  staged by their shows (`stage.camera`, `stage.lens`), which Phase 3 measured.
- **Input buffering** beyond the above: nothing to buffer (fault-free by the second point above).

## Gate (as written)

Each game reviewed with a capture sequence; budgets kept; the logic diff clean.
