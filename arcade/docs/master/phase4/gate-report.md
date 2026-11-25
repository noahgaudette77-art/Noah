# Phase 4: the gate (2026-11-25)

The gate as written: each game reviewed with a capture sequence; budgets kept; the logic diff clean. Plus, as every
phase: the harness and an independent review.

## Capture sequences

- **The shake, frame by frame** (`scratchpad/phase4/shake-trace.js`: the camera's place every frame through Boss Rush's
  wrong answer on a phone, the shake's peak 0.16): before, the camera stood 0.046 off on average and jumped 0.061 a
  frame (a jump bigger than where it stood: noise); after, 0.031 off and 0.019 a frame (a sway). Over a long run the new
  noise stands as far off on average as the old (0.76 of the amount) and never past it.
- **Risk Blaster's explanation on a Mac** (`polish.js`, `PART=blaster`): before, the demon's head under the question
  panel; after, the whole demon between the question and the sheet, the fighter above it (four answers and two); a
  phone's framing the same (`blaster-explanation-mac-before-after.jpg`).
- **Nest Egg Run's surge** (the curve, every frame at 60 and 120 Hz): 22, 40, 56, 68% of the lunge over its first four
  frames at 60 Hz (was 39% in the first); its height at 0.21 s.
- **The title's twitch:** 10 and 12 Hz (was 21 and 28), the same at any frame rate.

## The harness

- **On the build with the pass (`f0b0596`, `docs/master/runs/phase4`):** content and scripts untouched since `ee413e3`;
  the rules IDENTICAL from disk and served; the sequence ALL 13 STEPS OK; stills on both devices with **no text
  overlaps**. (Its costs were lost when the machine restarted; measured again below.)
- **On the final build, with the review's fixes** (`479fb52`, live; `docs/master/runs/phase4-final`): **no fault**: content
  and scripts untouched, the rules IDENTICAL from disk and served, the sequence ALL 13 STEPS OK; every screen inside its
  budget on both tiers. Against Phase 2's gate (`phase2-polish`): the same draws, triangles, textures and buffers on
  every screen, but Risk Blaster's and Nest Egg Run's, which follow the traffic at the moment measured (phone 91 to 96 and
  88 draws; Mac 99 to 116 and 131 to 147: nothing in this pass draws there), and the hub's laser's moment (85 to 84);
  script time a frame the same or lower everywhere (phone 0.2 to 0.63 ms, Mac 0.2 to 0.76 ms).

## The independent review

An independent reviewer read the pass's code (`574501c..HEAD`), not told what to find. Nothing broke a screen or the
rules. Its findings and what was done:

| # | finding | done |
|---|---|---|
| 1 | A resize mid-explanation (the governor's step among them) set the view back to the band's middle and the lift and standing back were not applied again until the explanation closed (an old fault of the lift; the standing back had it too) | applied again from the band as it stands, in that frame (`9d40b33`) |
| 2 | The red aura and the shield's flash, sized from the band, came inside the screen when the picture stood back (a hard red seam 3% in from each side in a rage) | their size takes the standing back out (`9447e5a`) |
| 3 | The racer's lean by time changed nothing seen: both car kits set the game's bob and lean to naught each frame | the dead lines taken out; the record corrected (`9d00d18`) |
| 4 | The egg's narrowing downtown still eased by the frame | by time (`6fef816`) |
| 5 | The shaped noise was steep without end where it crossed naught, and the two channels rested on their lattice points together (the camera stopping dead 18 times a second) | pushed out by v (1.3 - 0.3 v^2), y half a step after x, no closure a call (`b9f15c8`): at 120 Hz its largest jump a frame 0.57 (0.89), frames that barely move 4% (8%) |
| 6 | The unstaged fallback streaked the standing back as a zoom blur | the blur off for those frames in both paths (`e65a9b9`) |
| 7 | The surge's progress shadowed the road's speed in its block | renamed (`724fe9f`) |

What it checked and found sound: the view offset re-derived against three.js r128 (aspect kept, the band's top held,
the picture scaled about it, the old frustum exactly at full size); the drones' guard matching the projected row at
every scale; a phone's path unchanged; no NaN or division by naught (the band at least 1 high, the lean guarded, a
hit-stop's slowed clock); the shake continuous, uniform, its channels uncorrelated, inside the caps, the calm scale and
decay unchanged; no `Math.random` added and the regression's logic stream untouched; content, scripts and the vendor
library untouched; no hit-stop added, the exam's untouched; nothing new on the page from disk; no allocation a frame
left.

**Spend: nothing.**
