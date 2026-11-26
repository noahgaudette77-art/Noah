# The last unused assets: the rooms (running note)

Worker: the rooms (title, hub, Memory Bank, Final Exam, results, Strategy Guide). Worktree branch made from
`claude/quirky-ride-9frte0` at 7117645.

Standing rules from the coordinator (performance first): no new lights, no shadows; the twelve statues share one
material and are merged; everything added is skippable behind `GFX.extras` (read as `GFX.extras !== false`, so it is
on until the quality system switches it off); 04-gfx.js and 04b-pipeline.js are not touched.

| # | Item | State |
|---|---|---|
| 1 | Final Exam: the twelve statues and decor-podium | done: `24e-examhall.js`; exam regression IDENTICAL both ways; menus 13, 14, 14b |
| 2 | Memory Bank: decor-deck, the pile missed cards go back to | done: `23c-memorygen.js`; memory regression IDENTICAL both ways; menus 11, 12, 12b |
| 3 | Strategy Guide: decor-tome in the archive's background | done: `31b-library.js` (the stand, in the joinery batch), `31c-librarygen.js`; menus 15 |
| 4 | Hub: Boss Rush's cabinet calls "Boss incoming!" (two voices) | done: `11d-hubcall.js`, one line in `11-hub.js`; menus calls.md |
| 5 | Results: the announcer's "CHAPTER COMPLETE" | done: `30-results.js`; menus calls.md |

## Notes
- 1: the ending's camera on a phone sees a narrow slice behind the examiner, so the statues stand in two interleaved
  tiers on plinths in an arc behind the dais (inside the colonnade); the first desk stands on the centre line at the
  foot of the gallery. They are not drawn while the questions are up (on a wide screen they would stand behind the
  question and the answers); the light comes up on them when the ending begins.
- 2: with the decor the bright deck moves from the plinth's middle (where the banked bars rose through it) to its left
  end, and the dark pile stands at its right end; with GFX.extras === false the vault is as it was.
- 3: the shelves are a flat painted wall, so a book on them would float; the tome lies on a third stand like the two
  lecterns, built into the joinery batch (no draw of its own), only when the tome is in hand and the decor is on.
- 4: once per dwell of 3.2 s on Boss Rush's cabinet, then not for 14 s; waits for the announcer (Sound.sayAt) and makes
  the next line wait for it; off while the cabinet is chosen (zooming), with sound or voice off, or from disk.
- 5: only on a single stage won (Boss Rush STAGE CLEAR, Nest Egg Run RETIRED AT 65 or RICH), when the results have no
  line of their own and no RANK UP! follows. Risk Blaster's runs always end at GAME OVER, so it has no won chapter.
- Tests (after the last change): full regression IDENTICAL from disk and served (153 answers in 8 games, no console
  errors); arcade-sequence ALL 13 STEPS OK, no errors.
