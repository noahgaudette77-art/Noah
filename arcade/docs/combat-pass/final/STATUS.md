# Phase 6: the last fix round (running note)

Brief: the lead's rulings on the final review (r1). One commit per fix; regressions after each.

| # | Ruling | State |
|---|---|---|
| 1 | Boss Rush: damage popups in their own lane, caption held where they would meet; "LIGHTNING!" not clipped | in progress |
| 2 | Risk Blaster low health: beating red frame round the band, smoke and flame on the visible hull; Nest Egg Run's last-life frame stronger | to do |
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
