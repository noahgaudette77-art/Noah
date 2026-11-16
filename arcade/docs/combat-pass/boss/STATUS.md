# Boss Rush (Phase 3): where the work stands

A running note, kept current so the work can be picked up if it is interrupted. The brief is the owner's Phase 3
plan (`arcade/PROGRESS.md`, "Order of work"); the contract is `arcade/docs/combat-pass/README.md`.

## Files

- `src/js/22c-bossarena.js`: `BOSS_SKY`, `BOSS_ROW` (the table: one row per boss), `BossArena` (the storm sky as
  backdrop, environment light and lightning).
- `src/js/22-boss.js`: the game. `this.pano` (a sky has loaded), `this.gen.model` (the boss's model has loaded).
  From disk both are false and everything is as it was.
- `src/js/08d-panosky.js` (shared): `makePanoSky(sky, { window })`, a long-lens view of one part of a panorama. A
  sky made without `window` gets the same shader text as before.

## Steps

| Step | What | State |
|---|---|---|
| 1 | Sky and light, present bosses still in it | done (first pass; tuned again with the models in step 2) |
| 2 | The actor on boss 1 | next |
| 3 | The attack stage, hits, damage, death | |
| 4 | Sound and the cue log | |
| 5 | The other eleven bosses (5, 10, 4, 2, 6, 3, 9, 7, 8, 11, all) | |

## Tests at the last commit

`node scripts/arcade-regression.js --compare arcade/backup/regression-baseline.json --only boss`: IDENTICAL, no
console errors. `node arcade/tools/regress-http.js --only boss`: IDENTICAL, no console errors.
