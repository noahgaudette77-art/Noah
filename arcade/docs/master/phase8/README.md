# Phase 8: the final verification (2026-11-26)

The last phase of the master overhaul: no new feature, the finished game checked end to end on its final build, fixed
where it fell short, and its record made. The owner started it ("You may start phase 8") with a fault seen on the
iPhone, and then asked for the rest without more questions: "just get it done please max graphics possible best
immersion, no more questions. Good FPS".

## 8a and 8b: the title hall's stutter, and the best picture a device holds

`title-stutter.md`: the iPhone's readout in the glide (under 55 FPS, many hitches, FIXED (SETUP)); a fixed tier now eases
its drawing size; no frosted glass over the live picture on a phone at any tier; a title-hall boss's skin merged in
smaller steps; a Graphics setting fixed before today goes back to AUTO once (a synced copy too); a phone's AUTO climbing
to MAC was built and taken out on the independent review's word (it could never climb on a 60 Hz screen, and was loose
where it could).

## 8c: the final build checked

| check | Chromium | WebKit |
|---|---|---|
| the rules from disk and served, the 13-step sequence, content and scripts since `ee413e3` | IDENTICAL, IDENTICAL, ALL 13 OK, untouched | (the same build's) |
| every screen's still on a phone (21) and a Mac (21): text over text | none | none |
| every screen's costs inside its tier's budget (below) | no fault | no fault |
| the governor (`tools/governor-test.js`: 63 checks) | all passed | all passed |
| a lost graphics context (`tools/scenarios/context-loss.js`: 93 checks, earlier today) | all passed | all passed |

The stills differ from Phase 0's baseline on every screen (the overhaul's work: `docs/master/runs/final-*/report.md`
lists each), none with text over text. The harness's runs: `docs/master/runs/final-chromium`, `final-webkit`,
`final-logic`.

**The census on the final build** (`tools/scenarios/hitches.js`, a phone's page, every frame drawn):
- the Final Exam: no shader made and **no picture sent in play** (Phase 7's census had one: the lens's dust, a 512 px
  picture the glow pass first drew mid-exam when a hit's glow ran strong; it now goes to the graphics chip with the
  pipeline's own shaders, behind the curtain: `04b-pipeline.js`, `compileAll`); 8.7 KB of garbage a frame.
- Boss Rush: no shader made in play; the pictures sent in play are its skeletons' bone pictures (16 KB each, every
  frame, as three.js draws a skinned model); 51.5 KB of garbage a frame (54.5 before; CombatFX's own update makes the
  most of it, about 31 KB: two of its vectors are now kept, not made a frame, and the rest is left for a later look:
  each such frame's garbage is swept in a moment of a millisecond or two on a phone, every second or two).

## The performance table

Every screen at the moment the harness measures it (`tools/cost-report.js`), Chromium (WebKit's draw count beside it
where it differs): what a frame draws, on a phone's PHONE tier at 2x and a Mac's MAC tier at Retina size.

| screen | phone: draws, triangles, graphics MB | Mac: draws, triangles, graphics MB |
|---|---|---|
| the title hall (mid-glide) | 33, 146K, 324 | 64, 307K, 1,105 |
| the title hall (its end) | 34, 168K, 324 | 56, 185K, 1,105 |
| the arcade floor | 36, 86K, 221 | 84 (85), 307K, 570 |
| Risk Blaster | 100 (98), 198K, 363 | 115 (116), 294K, 1,171 |
| Nest Egg Run | 84 (86), 142K, 309 | 147 (142), 282K, 1,460 |
| Boss Rush | 65, 111K, 262 | 84 (85), 125K, 710 |
| Memory Bank | 55, 106K, 122 | 68, 106K, 486 |
| the Final Exam | 73, 57K, 153 | 92, 57K, 602 |
| the Strategy Guide | 49, 32K, 103 | 63, 32K, 551 |
| **budget** | **100, 350K, 450** | **160, 500K, 2,000** |

Every screen inside its budget; Risk Blaster's phone draws at its edge at this moment (the re-check measured 118 to 119
at its busiest: a moment to watch on the device). Frame times here are software's and are not given: how many frames a
second a device draws is the device's to say (the FPS counter: `#fps`).

## The gallery and the films

- `sheet-phone.jpg`, `sheet-mac.jpg`: the ten key screens on the final build, laid out as Phase 0's baseline sheets.
- `before-after-phone.jpg`, `before-after-mac.jpg`: Phase 0's sheet above, the final one below.
- `films/film-title.mp4` (5.1 MB) and `films/film-fight.mp4` (2.6 MB): a Mac's window, 1280 x 720, 30 frames a second,
  12 s each: the title hall's glide and a Boss Rush fight (a right answer, the boss's strike on a wrong one, its
  explanation); `films/film-title-phone.mp4` (4.6 MB): the glide on a phone's screen, 780 x 1688. Drawn frame by frame
  on the capture tool's clock (`tools/scenarios/film.js`): the picture as the page draws it, not its speed on a device.

## The independent review (Phase 8's changes)

An independent review (opus) read 8a, 8b and the census fixes. What it found, and what was done:

1. **The climb to MAC could never happen on a 60 Hz screen** (a frame's time is the gap between refreshes), and the
   Setup text and the notes promised it: taken out, text and notes corrected.
2. **Where it could climb, a tablet took the computer's tier** (4x smoothing, the floor mirror, the Mac's extras and its
   sharper files) and dropping back left them: gone with it.
3. **It left too loosely** (a MAC with late frames held, the heat's easing taking over): gone with it.
4. **The once-to-AUTO could be undone by a newer synced copy** (in claude.ai only): now done for every copy as it is
   merged (`mergeStates`), and tested.
5. **The glide tool's phone mode was set back to AUTO by the once**: it writes the mark with its setting.
6. **A fixed tier held at 30 by Low Power Mode stepped to its smallest size for nothing**: a fixed tier now leaves its
   size alone while frames are held at exactly 30, and tested.
7. **Choosing the tier in Setup did not start the governor's clock afresh**: it does.
8. **A boss part of more than 6,000 corners is still one frame's work** (the steps are between parts): left; noted.
9. **The tests proved less than they said** (the climb's 10 ms frames): the climb's cases went with it; the others
   stand.

Checked and found sound: CombatFX's kept vectors (nothing keeps them), the skin's smaller steps (the merged bosses the
same number for number), the fixed tier's sizes through Setup, density changes and the readout, the lite page on phones,
the once on the device itself.

## The spend and the tokens

- **The master overhaul's spend, from its start (`ee413e3`, 2026-11-23) to the end: $0.36** (fal.ai: 12 Seedream
  pictures, the art bible's ten and the title hall's two skylights). Tripo, ElevenLabs: nothing. Blockade Labs: 13
  finished requests fetched again at full size for the Mac's sharper skies, at no charge. `tools/gen/ledger.jsonl` has
  every call; `ASSETS.md` the log.
- **Tokens**: this session's own count is not visible from inside it (the account's usage page has it). The sub-agents
  report theirs: the independent reviews of the last two pieces of work, about 270,000 and 370,000 tokens each.

## For the owner's devices

- **iPhone (Safari)**: Graphics is AUTO again on the first visit (once). The title hall's glide with `#fps`: the first
  line's FPS and HITCHES. Each game for a minute. Leave a fight for another app and come back.
- **MacBook (Safari and Chrome)**: the FPS counter in the title hall and each game; Activity Monitor through half an hour
  of play; Setup's MEDIUM and back.
- For the most the phone can draw: Setup's MAC (its drawing size eases to keep frames smooth); AUTO is the smoother
  choice.
