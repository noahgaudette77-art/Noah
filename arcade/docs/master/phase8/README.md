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

## 8e: a device's own cap at any rate (the owner's iPhone at 24 FPS in Low Power Mode)

The owner's next screenshot, the arcade floor with `#fps` after the once-to-AUTO: **24 FPS, 41.7 ms a frame, the worst
42 ms**, the main thread 6.9 ms a frame; **LIGHTEST at 1.06x, two lights, step 11 of 11**, "SLOW FRAMES (24 FPS)"; the
battery icon yellow (Low Power Mode). iOS held the page at a steady 24 frames a second. The governor knew a device's cap
only at 30 (31 to 36 ms a frame), so it took 24 for a load and went down to its last step: the softest picture, at
the same 24 frames a second.

What was done (`04-gfx.js`: `screenProbed`, `perfTick`, `capHold`, `realCut`, `heldRate`, `govLabel`):

| change | what it does |
|---|---|
| a cap at any rate | frames held at one rate (a tenth of them either side within a tenth of the middle one) slower than the mark are a cap or a load: blank frames at the start held at 45 a second or fewer (22 to 70 ms) are the device's cap from the start; in play, a rate held through a real cut (a tier down and 60% of the pixels or fewer; on a fixed tier 60% of the pixels) is the cap too, as it was for 30 alone. A lower cap found under a hold (30, then 24) is found the same way |
| held at the sharpest step that holds it | until now a phone held at 30 went to SAFE; now the picture goes back to the step where the rate was first held (PHONE at 2x on the phone), climbs from a lower one as frames hold, and steps down only if frames run later than the cap's own frame |
| the readout | `HELD AT 24 FPS · LOW POWER MODE?` (a computer: `... OR A 24 HZ SCREEN?`; the main thread's time when that fills the frame) |
| let go | when frames run faster than the cap's (the mode switched off); a step down is still tried after a minute, then two, four and eight, in case it was a load after all |
| Setup's fixed tiers | held the same way (until now: left at their size at exactly 30 only); a Setup choice keeps the hold, which is the device's |
| the start's probe | blank frames timed for up to 0.9 s (0.6 before: fourteen frames at 24 a second take 0.58 s) |
| Setup's text | "... and in Low Power Mode, where the device caps the frame rate, keeps the picture sharp" |

**The governor's test: 75 checks (63 before), all passing in Chromium and WebKit.** New: the owner's case at 24 (down
until a real cut still holds 24, then back to PHONE 2x, `HELD AT 24 FPS · LOW POWER MODE?`, held while it lasts, let go
at 60), 24 from the start, a 50 Hz screen's blank frames (no cap), a cap lowered from 30 to 24, a Setup choice in a hold,
a fixed tier at 30 and at 24 from the start. The cases at 30 now expect the hold at 2x, not SAFE. "Slow" and "fixed" are
fed uneven frames (32 to 48 ms): frames at one rate that no cut changes are a cap now.

What it trades: a load that holds one frame rate through a real cut (a tier down and 44% fewer pixels) is taken for a
cap, and the picture kept sharp at that rate where a deeper cut might run faster. A cut that deep leaves little of a
graphics load in place, so what survives it is mostly the main thread's, which no smaller picture helps (the readout
names it then); the test step finds a load just over a frame. Probed at the start, a steady rate of blank frames is a
cap: the page draws nothing then.

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
  line's FPS and HITCHES. Each game for a minute. Leave a fight for another app and come back. In Low Power Mode (8e):
  the third line `HELD AT 24 FPS · LOW POWER MODE?` and the second `PHONE · 2.00X`; with it off, 60 FPS and `AUTO`.
- **MacBook (Safari and Chrome)**: the FPS counter in the title hall and each game; Activity Monitor through half an hour
  of play; Setup's MEDIUM and back.
- For the most the phone can draw: Setup's MAC (its drawing size eases to keep frames smooth); AUTO is the smoother
  choice.
