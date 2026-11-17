# Phase 6: the last fix round (running note)

Brief: the lead's rulings on the final review (r1). One commit per fix; regressions after each.

| # | Ruling | State |
|---|---|---|
| 1 | Boss Rush: damage popups in their own lane, caption held where they would meet; "LIGHTNING!" not clipped | done |
| 2 | Risk Blaster low health: beating red frame round the band, smoke and flame on the visible hull; Nest Egg Run's last-life frame stronger | done (racer capture with the racer batch) |
| 3 | Final Exam examiner: a hard-edged chest core over the smear, cool key and magenta rim (hitStop calls untouched) | to do |
| 4 | Risk Blaster's ambient ships read as ships (lights as points, less tint and bloom, further into the haze) | to do |
| 5 | RANK UP! on an opaque bordered plate, a dark scrim over the tiles | to do |
| 6 | Exam passed: question UI and NEXT cleared before the banner and SKIP; toast held until the cinematic ends | to do |
| - | Cheap ones: crash bloom cap, wash-outs capped, bonus line inside the screen, cracks off the text, lane D props, Memory Bank blob | to do |
| T | The lead's remade car and bus (cbf7de1) merged; traffic retuned | done |

## Notes

- **Traffic (T).** Merged cbf7de1 (fast-forward). The manifest (`src/js/03a-files.js`) re-made for the two new file
  sizes. The car is a compact city car now: its length 4.5 -> 3.6 (1.92 wide, 1.64 tall, under the rig's size); its
  own room in its lane, shadow and badge box (`RACER_GEN_DIM`); its red tail bar raised onto the model's own light bar
  (0.47 -> 0.58 of its height); the lamps at the corners of a rounded nose or tail are placed on the skin there, and
  a narrow nose's lamps go out toward its corners. Checked by numbers (each lamp stands on its body) and by eye.
  The bus kept its length (8.4); its lamps sit on it. `cohesion-traffic.js`: the paced car stands nearer (taller now,
  it hid under badge A, as the game means it to). Re-captured cohesion 04, 05, 06. Racer skies and near miss: with
  the racer fixes below. Regression racer IDENTICAL from disk and served.
- **Ruling 1 (Boss Rush figures).** `22f-bossstage.js`: `figure()` puts the rule's own "-N HP" floater (in bossHit,
  the frame it is made) beside the point the lance lands on, away from the lance, under room for a two-line caption
  and above the answers; the shared hype's call-outs (LIGHTNING!, QUICK DRAW!, STREAK LOST) go one row under it, at
  13 px, outlined (`callouts()`, from fire() and attack()). They hold still, then lift 14 px as they fade, on the show
  clock (0.9 s). `capMeets()`: the caption is hidden while a figure stands where it would meet it (only on a very short
  band). Checked by numbers and a still: caption 271-292, figure 334-356, call-out 384-397, answers from 532.
  Re-captured boss 04-right-hit, 12-proctor-death. Regression boss IDENTICAL both ways.
- **Ruling 2 (low health).** Both games drew their frame inside the picture, where the post's vignette blacked it out.
  New shared `BandEdge` (end of `08c-combatfx.js`): Boss Rush's frame (inset 46+34 beat px, edge 12+20 beat px, alpha
  0.42+0.5 beat, rgb 255,18,46) drawn in screen space over the finished picture through a new hook in `GFX.render`
  (`scene.userData.edge`, called just before the overlay), so the answers' letters (Risk Blaster) and the lane badges
  (Nest Egg Run) drawn in the overlay stand over it untouched. Beat: each game's own alarm clock, as before. The old
  in-picture frame keeps only the flash as a shield or life goes. Risk Blaster: `hurt()` finds a breach on the hull's
  back beside the canopy (raycast once onto the model's skin; from disk, or without the model, the old engine point);
  the flame ribbon, fire, sparks and smoke stay on the skin and stream back toward the lens. Re-captured blaster
  15-low-health. Regression blaster, racer IDENTICAL both ways.
