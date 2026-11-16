# Boss Rush (Phase 3): the captures

Made by `arcade/tools/scenarios/boss-fight.js`, served over HTTP so the bosses' models, the storm skies and the
recordings load, at 390 x 844 and two device pixels to the CSS pixel:

```bash
node arcade/tools/capture.js arcade/tools/scenarios/boss-fight.js --out arcade/docs/combat-pass/boss --dpr 2           # boss 1, the full set
BOSS=5 node arcade/tools/capture.js arcade/tools/scenarios/boss-fight.js --out arcade/docs/combat-pass/boss --dpr 2    # one other boss, three files
```

The page runs on a virtual clock, 60 frames to the second, so every strip is repeatable frame for frame. A strip is
read left to right, then down. "Every n" is the spacing of its tiles in frames (8 frames: 0.13 s). Strips are cut to
the band of the screen the 3D picture shows in (between the question and the answers) unless they say "whole
screen". The scenario sets state in the page to reach a moment quickly (how full the attack bar is, how much HP and
how many hearts are left): test only.

The sound of the same moments, frame by frame, is in `sound-cues.md` (`arcade/tools/scenarios/boss-sound.js`). Where
the work stands, and what was looked at and fixed boss by boss, is in `STATUS.md`.

## Boss 1, PRODUCT PUSHER: the full set

| File | What it shows | Tiles |
|---|---|---|
| `01-entrance.jpg` | It drops in from above the picture and lands with weight (a ring of dust, the floor shakes, lightning), powers up (its lights flicker on), roars and is named | 12, every 8, whole screen |
| `02-idle.jpg` | Its idle under the violet storm: chrome that mirrors the sky, the rims in its colour, its head following the lens | still |
| `11-question-full.jpg` | A question up: the HUD, the question, the boss in the band, the answers | still, whole screen |
| `03-telegraph-strike.jpg` | The wind-up following the attack bar (the briefcase drawn back, what it gathers glowing, the marker on the player's side), then the strike on the rule's frame: contracts flung from the briefcase, each landing at the foot of the picture, the heart seen to go | 6 every 15, then 18 every 2 |
| `04-right-hit.jpg` | A right answer: three bolts from the answer's side spark off its armour, the lance lands (a small white heart, sparks in the answer's colour, a thin ring, a hit-stop), it recoils | 18, every 3 |
| `05-wrong-strike.jpg` | A wrong answer: the one bolt dies on its armour in a dull red fizzle, then its strike comes and lands | 18, every 2 |
| `05b-wrong-full.jpg` | Just after: the hearts row (the heart broken), the HUD cracked, the red flash at the edges | still, whole screen |
| `12-explanation-full.jpg` | The explanation sheet up over the foot of the screen, the boss above it | still, whole screen |
| `06-last-heart.jpg` | One heart left: the red frame that beats (with the alarm) | 6, every 12, whole screen |
| `07-damage-states.jpg` | Damage that lasts, at 82%, 60% and 38% of its HP: a hole burnt in its chest; its hand torn off and thrown, the arm hanging; its forearm gone, the stumps leaking sparks and smoke | 3 x 4, every 4, 6, 6 |
| `08-rage.jpg` | Under 35% it rages: the faster, angrier idle, the sky leaning red | 12, every 9 |
| `09a-finishing-blow.jpg` | The finishing blow: done for, it sways, its lights failing, small blasts along it | 6, every 8 |
| `09-death.jpg` | Its death: slow motion, it goes over backward as blasts run along it and parts fly, the last blast as it hits the floor, stars and coins to the score | 18, every 8, whole screen |
| `10-player-defeat.jpg` | The player's last heart goes: the boss has the last word (its win clip) and GAME OVER | 12, every 12, whole screen |

## Every other boss: three files each

| File | What it shows | Tiles |
|---|---|---|
| `NN-name-idle.jpg` | Its idle in the band, under its sky | still |
| `NN-name-fight.jpg` | Its entrance (it lands), its attack with the telegraph (the wind-up as the bar fills, its marker), the strike and its landing, then taking a right answer's hit | 4 every 20 (the part of the screen it lands in), 3 every 30, 9 every 3, 4 every 8 |
| `NN-name-death.jpg` | The finishing blow, then its death: the fall, the chain of blasts, parts thrown, the last blast | 3 every 12, then 12 every 12 |

| NN-name | Boss | Sky | The attack its fight strip shows |
|---|---|---|---|
| `02-perilmonger` | PERILMONGER | violet storm | a ground slam with its fists (`attackA`) |
| `03-specter` | SOLVENCY SPECTER | void | a wave of energy out of the vault in its chest (`attackB`) |
| `04-fineprint` | THE FINE PRINT | violet storm | a beam swept across the foot of the picture, drawn from its quill (thrust: `attackB`) |
| `05-golem` | GROUP GOLEM | teal industrial storm | a ground slam with both fists (`attackA`) |
| `06-titan` | INFLATION TITAN | teal industrial storm | a wave from its gauge, its pipes venting steam (`attackB`) |
| `07-lich` | LONGEVITY LICH | void | seekers that swing out and come in on the player (`attackB`) |
| `08-intestate` | LORD INTESTATE | void | a ground slam with its gavel (`attackA`) |
| `09-influencer` | UNDUE INFLUENCER | violet storm | seekers on strings of light (`attackB`) |
| `10-tollgate` | PROBATE TOLLGATE | teal industrial storm | a volley of tickets from the booth, its signal turning red (it slams its barrier on alternate questions) |
| `11-phantom` | PATRIMONY PHANTOM | void | a beam swept from its cleaver (thrust: `attackB`) |
| `12-proctor` | THE PROCTOR | void | a volley of exam cards from its pencil (it uses all five kinds in turn) |
