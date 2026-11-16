# Boss Rush (Phase 3): the captures

Made by `arcade/tools/scenarios/boss-fight.js`, served over HTTP so the bosses' models, the storm skies and the
recordings load, at 390 x 844 and two device pixels to the CSS pixel:

```bash
node arcade/tools/capture.js arcade/tools/scenarios/boss-fight.js --out arcade/docs/combat-pass/boss --dpr 2           # boss 1, the full set
BOSS=5 node arcade/tools/capture.js arcade/tools/scenarios/boss-fight.js --out arcade/docs/combat-pass/boss --dpr 2    # one other boss, three files
```

Run them one boss at a time: two or three dpr-2 captures side by side overload the machine and the browser's
screenshots time out.

The page runs on a virtual clock, 60 frames to the second, so every strip is repeatable frame for frame. The page's
own animations (the HUD's cracks, the explanation sheet coming in, the stars and coins flying to the score, the
screen's power-on) are stepped with the frames, so a strip shows what a player sees at that moment. A strip is read
left to right, then down. "Every n" is the spacing of its tiles in frames (8 frames: 0.13 s). Strips are cut to the
band of the screen the 3D picture shows in (between the question and the answers) unless they say "whole screen".
The scenario sets state in the page to reach a moment quickly (how full the attack bar is, how much HP and how many
hearts are left): test only.

The sound of the same moments, frame by frame, is in `sound-cues.md` (`arcade/tools/scenarios/boss-sound.js`). Where
the work stands, and what was looked at and fixed boss by boss, is in `STATUS.md`.

## Boss 1, PRODUCT PUSHER (remade after the review: a chrome faceplate with cyan eye slits): the full set

| File | What it shows | Tiles |
|---|---|---|
| `01-entrance.jpg` | After the screen's power-on: it drops in from above the picture and lands with weight (a ring of dust, the floor shakes, lightning), powers up (its lights flicker on), roars and is named | 12, every 7, whole screen |
| `02-idle.jpg` | Its idle under the violet storm: chrome that mirrors the sky, the rims in its colour, its head following the lens | still |
| `11-question-full.jpg` | A question up: the HUD, the question, the boss in the band, the answers | still, whole screen |
| `03-telegraph-strike.jpg` | The wind-up following the attack bar (the briefcase drawn back, what it gathers glowing, the marker on the player's side), then the strike on the rule's frame: contract cards with a cyan edge flung from the briefcase, each landing inside the foot of the picture, a flash where the first meets the player, the heart seen to go | 6 every 15, then 18 every 2 |
| `04-right-hit.jpg` | A right answer: three bolts from the answer's side spark off its armour, the lance lands (a small white heart, sparks in the answer's colour, a thin ring, a hit-stop), it recoils (shallowly: it stays above the front row) | 18, every 3 |
| `05-wrong-strike.jpg` | A wrong answer: the one bolt dies on its armour in a dull red fizzle, then its strike comes and lands; its words as a caption along the top of the band | 18, every 2 |
| `05b-wrong-full.jpg` | Just after, the sheet in: the hearts row (the heart broken), the HUD cracked | still, whole screen |
| `12-explanation-full.jpg` | The explanation sheet up over the foot of the screen, the whole boss above it (its words are hidden while the sheet is up) | still, whole screen |
| `06-last-heart.jpg` | One heart left: a saturated red frame round the picture beating about once a second (with the alarm) | 6, every 12, whole screen |
| `07-damage-states.jpg` | Damage that lasts, at 82%, 60% and 38% of its HP: a hole burnt in its chest; its hand torn off and thrown, the arm hanging; its forearm gone; the wound and the stumps glow at their edges and smoke | 3 x 4, every 4, 6, 6 |
| `08-rage.jpg` | Under 35% it rages: the faster, angrier idle, its rims burning red, steam off its shoulders, a shake, the sky leaning red | 12, every 9 |
| `09a-finishing-blow.jpg` | The finishing blow: done for, it sways, its lights failing, small blasts along it | 6, every 8 |
| `09-death.jpg` | Its death: slow motion, it goes over backward as blasts run along it and parts fly (thrown down and out; its torso burns where it falls), the last blast as it hits the floor, stars and coins to beside the score as it counts up, BOSS DEFEATED! held until the results | 18, every 8, whole screen |
| `10-player-defeat.jpg` | The player's last heart goes: the boss has the last word (its win clip), GAME OVER, then DEFEATED, held until the results | 12, every 12, whole screen |

## Every other boss: three files each

| File | What it shows | Tiles |
|---|---|---|
| `NN-name-idle.jpg` | Its idle in the band, under its sky | still |
| `NN-name-fight.jpg` | Its entrance (it lands), its attack with the telegraph (the wind-up as the bar fills, its marker), the strike, its own projectile and its landing at the player, then taking a right answer's hit | 4 every 14 (the part of the screen it lands in), 3 every 30, 9 every 3, 4 every 8 |
| `NN-name-death.jpg` | The finishing blow, then its death: the fall, the chain of blasts, parts thrown down and out (a cape, a robe or a torso burns where it falls), the last blast, BOSS DEFEATED! | 3 every 12, then 12 every 12 |

| NN-name | Boss | Sky | The attack its fight strip shows: its own projectile, trail and impact |
|---|---|---|---|
| `02-perilmonger` | PERILMONGER | violet storm | a ground slam with its fists: molten cracks run from them, the shock runs along the floor to the player (`attackA`) |
| `03-specter` | SOLVENCY SPECTER | violet storm | a wave out of the vault in its chest, coins and keys poured at the player, the wave growing until it fills the picture (`attackB`) |
| `04-fineprint` | THE FINE PRINT | violet storm | a beam of tiny glowing script swept across the foot of the picture, drawn from its quill (thrust: `attackB`) |
| `05-golem` | GROUP GOLEM | teal industrial storm | a ground slam with both fists, throwing up filing drawers and papers (`attackA`) |
| `06-titan` | INFLATION TITAN (remade: a headless boiler, a valve handwheel for a head) | teal industrial storm | a wave of scalding steam from its gauge, its smokestacks venting (`attackB`) |
| `07-lich` | LONGEVITY LICH (remade after the review: a clockwork lich) | teal industrial storm, tinted mint | seekers of sand that swing out and come in on the player (`attackB`) |
| `08-intestate` | LORD INTESTATE | void | a ground slam with its gavel: a crack like a judge's block, rings of sound (`attackA`) |
| `09-influencer` | UNDUE INFLUENCER | violet storm | seekers on strings of light from its hands (`attackB`) |
| `10-tollgate` | PROBATE TOLLGATE | teal industrial storm | a volley of toll tickets and coins from the booth, its signal turning red (it slams its barrier on alternate questions) |
| `11-phantom` | PATRIMONY PHANTOM (remade: a deep hood over the whole head) | void | a cleaving arc from its cleaver, half bone-white, half violet (thrust: `attackB`) |
| `12-proctor` | THE PROCTOR | void | a volley of exam papers and pencils (it uses all five kinds in turn; its slam breaks graphite and tears papers) |
