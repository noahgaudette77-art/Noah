# Phase 4 (hub, title, menus, Memory Bank, Final Exam, Strategy Guide): running note

Branch: the worktree of `claude/quirky-ride-9frte0` (5d42917, then the lead's trophy stand merged). Order of work:
A hub, B title, C icons and portraits, D Final Exam, E Memory Bank, F Strategy Guide.

## Done
- Sets (`tools/manifest.js`): hub (cabinet, six toppers, cup, medal, coin, stand, `hub-hall`, UI strips; its sound in
  `hubsound`, never waited for), title, memory (`vault-gold`, deck, coin), exam (`exam-moon`, podium), guide
  (`guide-archive`, tome). `Assets`: `loadImage`/`ui()`, `prefetch()`, one load per file at a time.
- A: six cabinets from `prop-cabinet` (`11c-hubgen.js`): live screen, lit marquee, neon moulding and painted stripes
  in the game's colour, a line of light at the foot, a turntable with the game's topper; the one in focus lifts and
  spins up (and spins hard when chosen), lit by a lamp of its own. A trophy stand (lead's `prop-stand`) as a seventh
  stop: 16 trophies as cups, medals and coins, lit and turning when earned. The hall's panorama as the models'
  light and reflection and a sheen on the tiles. Sound: recorded clicks, coin and select, the hall's hum loop,
  WELCOME / SELECT YOUR GAME on the first visit, the game's name when chosen. Boss posters use the portraits.
- B: the two dusks behind the city (fade in on arrival, slow cross-fade), haze in their colour, the title's music
  and INSERT COIN on the first tap; the hall's set is asked for while the title is up.
- C: icons drawn from the models (`05c-genicons.js`) for every star, coin, life, shield, streak, medal and trophy,
  boss busts from the portrait strip wherever a boss is drawn; the results' reward moment (pictures only).
- D: `exam-moon` in the windows and on the examiner's armour, the lectern, the exam's music. The Proctor model was
  not put in (the two hit-stops of the present examiner are frame-exact: not safe in this phase).
- E: the vault's metals mirror `vault-gold`, the generated coin flies and piles, the deck at the door's foot, music.
- F: the archive panorama as light and backdrop, the tome on show over the desk with its own lamp.
- Tests: regression from disk and over HTTP IDENTICAL; sequence 13/13 (after A).

## Next
- Captures (`tools/scenarios/menus.js`) and their README; the final sequence test.

## Asked of the lead
- A three-tier trophy stand: delivered as `prop-stand` (b5ae3d6), merged.
