# Phase 4 (hub, title, menus, Memory Bank, Final Exam, Strategy Guide): status

Branch: the worktree of `claude/quirky-ride-9frte0` (5d42917, then the lead's trophy stand merged). Done, A to F.

## What was built
- Sets (`tools/manifest.js`): hub (cabinet, six toppers, cup, medal, coin, stand, `hub-hall`, UI strips; its sound in
  `hubsound`, never waited for), title, memory (`vault-gold`, deck, coin), exam (`exam-moon`, podium), guide
  (`guide-archive`, tome). `Assets`: `loadImage`/`ui()`, `prefetch()`, one load per file at a time.
- A, hub (`11c-hubgen.js`): six cabinets from `prop-cabinet` with the game's live screen, lit marquee, neon moulding,
  painted stripes, a line of light at the foot and its topper on a lit turntable; the one in focus lifts, spins up
  and has a lamp of its own, and spins hard when chosen. A trophy stand (`prop-stand`) as a seventh stop: the 16
  trophies as cups, medals and coins, lit and turning when earned. The hall's panorama as the models' light and
  reflection and a sheen on the tiles. Recorded clicks, coin and select, the hall's hum, WELCOME / SELECT YOUR GAME
  on the first visit, the game's name when chosen. Boss posters use the portraits.
- B, title: the two dusks behind the city (fade in on arrival, slow cross-fade), haze in their colour, the title's
  music and INSERT COIN on the first tap; the hall's set is asked for while the title is up.
- C: icons drawn from the models (`05c-genicons.js`) for stars, coins, lives, shields, streaks, medals, trophies (menus,
  HUD lives, reward bits); boss busts from the portrait strip wherever a boss is drawn; the results' reward moment
  (coins, medal, cup, new trophies, one by one with sound; pictures only, so the results text is unchanged).
- D: `exam-moon` in the windows and on the examiner's armour, the lectern (it sinks into the dais for the ending),
  the exam's music, EXAM PASSED / NOT YET.
- E: the vault's metals mirror `vault-gold`, the generated coin flies and piles, the deck at the door's foot (it
  lifts as each card is dealt), the music, DECK CLEARED.
- F: the archive panorama as light and backdrop, the tome on show over the desk with its own lamp.
- Captures: 22 JPGs in this folder, listed in `README.md` (`tools/scenarios/menus.js`, `PART=` for one part).

## The review's fix round (2026-11-17)
- RANK UP! comes after the last reward has landed, on its own plate over the tiles, inside the screen.
- Memory Bank: the banked card is seen going up into the vault and the next dealt off the deck (pictures over the
  page, moved by the scene's clock; the rule's timer is unchanged); THE VAULT stands on a plate.
- The lead's remade deck, lectern and tome: retuned as toppers (swaying to face the lens, a key light each); the deck
  at the vault's foot; the lectern leaned toward the lens in the exam hall; the open tome lit under the rose window.
- Chapter select uses the 3D busts (the strips are asked for first; a bust drawn before its strip arrived is redrawn);
  earned stars are gold; tiles show model icons at 24 px or none; the results' emblem is a model icon.
- Earned trophies bright and lit, locked ones dark; the stand mirrors `hub-hall-b`, whose sheen takes over the floor
  toward it; `prop-vault` stands beside Memory Bank (the boxy cleaning robot and the printer are not built there).
- Final Exam: the chest's hollow is smooth gunmetal (a material change in code, served only; both hit-stops are
  untouched); the moon low in the left arch, the sky darkened to night; the pass burst's star and flash capped.

## Tests (after the fix round)
Regression from disk IDENTICAL; over HTTP with every asset loaded IDENTICAL; sequence 13 of 13, no errors.

## Still weak
- The Proctor model is not in the Final Exam: its present examiner has two frame-exact hit-stops, so a swap was not
  safe in this phase. The moon shows only in the ending (the examiner fills the band during the questions).
- The archive panorama barely shows round the closed nave; the guide's chapter-opening strip is subtle.
- Memory Bank's coin is small in flight.
- The hall's set is now about 6 MB of models and skies (each file under 0.8 MB), over the ~4 MB guide; its textures
  stay in GPU memory while games run (the hall is kept).
- Nobody has heard the sound; the reduced-effects paths were not captured.

## Asked of the lead
- A three-tier trophy stand: delivered as `prop-stand` (b5ae3d6), merged. Remade deck, podium and tome (1048b77), merged.
