# Boss Rush (Phase 3): where the work stands

A running note, kept current so the work can be picked up if it is interrupted. The brief is the owner's Phase 3
plan (`arcade/PROGRESS.md`, "Order of work"); the contract is `arcade/docs/combat-pass/README.md`.

## Files

- `src/js/22c-bossarena.js`: `BOSS_SKY`, `BOSS_BASE` and `BOSS_ROW` (the table: one row per boss), `BossArena` (the
  storm sky as backdrop, environment light and lightning).
- `src/js/22d-bossactor.js`: `BOSS_CLIP` (the clips' key moments), `BossActor` (any rigged boss: poses the skeleton
  from its clips; parts torn off; a limp arm; the head following the lens).
- `src/js/22e-bosstollgate.js`: `BossTollgate` (boss 10, split parts animated by code; the same calls as the actor).
- `src/js/22f-bossstage.js`: `BOSS_ATK`, `BossStage` (everything seen and heard of the fight, on the show clock).
- `src/js/22-boss.js`: the game. `this.pano` (a sky has loaded), `this.stage` (the boss's model has loaded: the
  fight is staged). From disk both are off and everything is as it was (`cyborgFrame`, `cyborgCamera`).
- Shared files touched: `08d-panosky.js` (`makePanoSky(sky, { window })`: a long-lens view of one part of a
  panorama; a sky made without it gets the same shader text as before), `08c-combatfx.js` (`wave`, `streak`,
  `gash`: thin rings and lines of light, built the first time one is asked for), `02-sound.js` (`finalboss` as a
  track name; the synth plays the boss tune for it).
- `tools/scenarios/boss-fight.js` (`BOSS=<key>`, `PARTS=...`), `tools/scenarios/boss-sound.js` (the cue log).

## Steps

| Step | What | State |
|---|---|---|
| 1 | Sky and light | done |
| 2 | The actor on boss 1 | done |
| 3 | The attack stage, hits, damage, death | done (five kinds; boss 1 looked at in strips) |
| 4 | Sound and the cue log | done (the log is written by `boss-sound.js`; run it again at the end) |
| 5a | All twelve bosses load and play with the table's defaults | done: each driven once (entrance, a right answer, a strike by timeout, a wrong answer, the finishing blow, the death) with no console errors |
| 5b | Look-and-fix, one boss per commit: 5, 10, 4, 2, 6, 3, 9, 7, 8, 11, all | 5 and 10 done; next: 4 (FINE PRINT) |
| 6 | Final captures (`docs/combat-pass/boss/*.jpg` and its README), the cue log, full regression both ways, the sequence test | |

## Looked at so far

- Boss 1 (PRODUCT PUSHER): entrance, idle, telegraph and strike (cards from the briefcase), right hit, wrong
  answer, last heart, damage states, death, the player's defeat. Good.
- Boss 5 (GOLEM): its rebuilt slam seen again: it lands on the floor (fists down, a fountain of sparks, blades of
  light running at the lens). Fixed: through the wind-up of an overhead blow (`attackA`: a slam or a sweep) the
  lens stood back and looked down at the floor and the head and raised fists left the top of the picture; it now
  stands farther back and looks higher while such a blow is wound up (the stage's `frame`, `up`).
- Boss 10 (TOLLGATE): fight (the volley and the barrier's slam) and death seen: good (it rolls in, the barrier
  comes down on the floor, it tips over backward, its tracks fly in the last blast). Lookalike fixed: its one round
  lamp in the booth's window, over the ticket slot, read as an eye over a mouth. It is now a lane signal (22e,
  `makeSignal`): a housing over the old lamp, a lens of small amber lamps that turns a deep red as the barrier is
  raised or the volley charged (the stage passes the charge to the actor), a hood with a lit edge over it and two
  guard bars across it.

## Tests at the last commit

`node scripts/arcade-regression.js --compare arcade/backup/regression-baseline.json --only boss`: IDENTICAL, no
console errors. `node arcade/tools/regress-http.js --only boss`: IDENTICAL, no console errors.
