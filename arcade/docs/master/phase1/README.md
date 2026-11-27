# Phase 1: performance foundation (2026-11-23)

The gate: every screen inside its budget on the phone and Mac tiers, with numbers. **Passed** (`gate-report.md`: the
harness at commit `96cc40f`, no fault: the rules IDENTICAL from disk and served, the screen sequence ALL 13 STEPS OK,
the content and scripts untouched since `ee413e3`, every screen inside its tier's draws, triangles, lights and memory).

## What changed in the game

| commit | change | measured |
|---|---|---|
| `8f3859f` | Shaders built ahead of a piece's first draw (`GFX.prepare`): the title hall asks for an arriving boss's, prop's or cabinet's programs in a scene of their own and shows it once the driver says they are built (`KHR_parallel_shader_compile`, which WebKit has) | WebKit: the glide's six programs all made in `prepare`, none at a draw (before: in the frame each boss appeared) |
| `a0ed99d` | Risk Blaster readies the crack a bolt leaves across a drone with its other pieces | programs made mid-fight: 1 → 0 |

## What was measured and left (with the reasons: `MASTER_PLAN.md`, Decisions)

| census | tool | result |
|---|---|---|
| shaders and pictures made in play | `tools/scenarios/hitches.js` | every game now 0 shaders and 0 pictures after it opens (beyond the skinned characters' bone tables, 1-16 KB a frame) |
| garbage a frame (Chromium, warm) | `hitches.js` | 4-61 KB a frame: a sweep every few seconds of about a millisecond; not a stutter |
| page changes a frame | `hitches.js` | 0-1.4 (speech bubbles, score floaters, a timer bar) |
| memory round after round | `tools/scenarios/cycles.js` (`cycles.json`) | 67-68 textures, 46-47 geometries, 274-275 programs at the end of rounds 2 and 3: nothing piles up |
| where the phone's memory goes | `cost-report.js --textures` | Risk Blaster 371 MB: its own drawn textures 185, targets and buffers about 110, readied for later 27, left from before 32 |
| the Mac hub's 8.5 ms | `cost-report.js --stub --settle 15 --cpu` | a measurement of one slow software frame while files arrived; the hub's own update is 1.09 ms (phone) and 1.27 ms (Mac) over 175 frames |
| the governor | `tools/governor-test.js` | ALL OK in Chromium and WebKit |

## Notes on the gate's "to look at" list

- The stills changed run to run on 31 of 42 pictures, by up to 0.25 RMSE: the capture's randomness depended on how long
  the files took to arrive (different questions, different scenery). Since `13f3007` every screen starts its randomness
  afresh: stills are the same run after run, and the baseline's are re-taken that way from its own build.
- Script time: the figures here are two or three frames each (this machine takes seconds a frame at full size) and
  swung by half from run to run. Since `836b099` the harness measures it with the drawing left out over many frames,
  against a baseline measured the same way (`docs/master/baseline/script-*.json`).
- Nest Egg Run's triangles (+13%): the traffic on the road at the moment measured, which is random.

## Stills

`stills/` (Phase 1's build, `3b1728e`) and `../baseline/stills/` (the baseline's build, `89cfb56`) were both taken again
with the capture as it stands at `922a37f` (the randomness started afresh per screen, per game and before its first
question; idle callbacks on the virtual clock; the sound's randomness its own), so the two sets compare picture for
picture: the racer, Boss Rush, Memory Bank, the exam, the hub and the menus within 0.037 RMSE of each other; the title
hall 0.04-0.10 (its bosses now arrive two frames later, their shaders built first); Risk Blaster 0.05-0.08 (its
first question still varies run to run).
