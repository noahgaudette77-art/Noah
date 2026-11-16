# Nest Egg Run: captures for review (Phase 2)

Made by `arcade/tools/scenarios/racer-run.js` on the capture tool's virtual clock (every frame is 1/60 s), with the
page served over HTTP so the five skies, the war rig and the recorded sound are loaded:

```bash
node arcade/tools/capture.js arcade/tools/scenarios/racer-run.js --out arcade/docs/combat-pass/racer --dpr 2
PARTS=right,wrong node arcade/tools/capture.js arcade/tools/scenarios/racer-run.js --out <dir> --dpr 1   # only some parts
node arcade/tools/capture.js arcade/tools/scenarios/racer-sound.js --out arcade/docs/combat-pass/racer --dpr 1   # sound-cues.md
```

A strip is read left to right, top to bottom; "every n" is the number of game frames between two tiles. Strips show
the band between the question and the answers unless they say "whole screen". The scenario sets state in the page
to reach a moment quickly (the year of the career, crashes, a policy in hand, where the gate is) and holds the
road's own random events off, so each strip shows what it is named for. The HUD's own animations (cracks, the
life's shards) run on the real clock and are caught where they happen to be.

| File | What it shows | Tiles |
|---|---|---|
| `01-sky-dawn.jpg` | The drive downtown at 25, under the dawn panorama (rose and teal, dark blue above) | still |
| `02-sky-day.jpg` | The coast causeway under the day panorama (turquoise, hot-pink cirrus) | still |
| `03-sky-golden.jpg` | The desert at golden hour (the orange and pink lenticular cloud) | still |
| `04-sky-dusk.jpg` | The mountain pass at dusk (purple clouds rimmed in orange) | still |
| `05-sky-night.jpg` | Downtown at 65, under the stars and the milky way | still |
| `06-start.jpg` | The start, whole screen: the rig drives in from behind the lens on both stacks and brakes onto its mark; the first question comes up | 12 tiles, every 7 |
| `07-lane-change.jpg` | A lane change across the road: the body rolls, the front wheels steer, the egg rocks and settles | 12 tiles, every 3 |
| `08-right-gate.jpg` | A right gate, from two frames before it: the clean burst in the answer's colour, two thin rings, the ring and pool on the road, coins to the nest egg, the surge; the right lane's badge stays lit | 12 tiles, every 2 |
| `09-wrong-gate-crash.jpg` | A wrong gate and its crash, from two frames before it: the red pane breaks, glass and red sparks, the dark blast, the half-spin on locked wheels, the catch; the right lane's badge lit, the lane taken red | 18 tiles, every 2 |
| `10-taking-damage.jpg` | Taking damage, whole screen down to the foot of the band: the life breaks, the HUD flickers and cracks, the band's edge goes red, the question is untouched | 12 tiles, every 2 |
| `11-near-miss.jpg` | A near miss: a car overtakes close by; streaks of air, the rig rocks away | 12 tiles, every 2 |
| `12-boost.jpg` | A boost: flames from both stacks, the squat, the light on the road, the lens falling back | 12 tiles, every 4 |
| `13-last-life.jpg` | The last life: the red frame that swells with the alarm, the burning stack trailing smoke | 12 tiles, every 6 |
| `14-insured-crash.jpg` | An insured crash: the policy's shell of mint light takes the pane, the rig only shimmies | 12 tiles, every 2 |
| `15-early-retirement.jpg` | Early retirement (the third crash's explanation closed): the rig slews to a stop, the engine blows, a wheel is thrown, it burns | 12 tiles, every 9 |
| `16-retirement-65.jpg` | Retirement at 65: the turn with both stacks alight, gold rings, coins and stars, fireworks, the drive-off toward the egg | 12 tiles, every 9 |
| `17-question-full.jpg` | A question, whole screen | still |
| `18-explanation-full.jpg` | An explanation sheet, whole screen (the picture rides higher so the rig stays in view above it) | still |
| `19-beauty.jpg` | The rig, close, from behind and a little to one side, under the day sky (a test camera: the game's own is the chase view of the other files) | still |
| `sound-cues.md` | Every sound call and the frame it is made on, beside what is shown on that frame (from `racer-sound.js`) | |
| `warrig-check-flat.jpg`, `warrig-check-views.jpg` | The lead's check views of the war rig model (flat elevations; three-quarter views) | |
