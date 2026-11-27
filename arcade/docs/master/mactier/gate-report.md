# The Mac's richer tier's gate (2026-11-25)

What the owner's order asks of it: the Mac's graphics memory to about 2 GB (to 3 GB only if every test stays clean), the
phone's budget kept, a steady 60 FPS, the 30-minute soak again with other apps open, no memory growth or slowdown, the
study logic and content untouched. With it, as every phase: the harness, an independent review. This machine draws in
software: its times compare builds with each other, never with a device.

## The study logic and content

`node arcade/tools/harness.js --only logic --name mactier-logic` on the finished page: the rules' regression IDENTICAL
from disk and served, the content and the scripts untouched since `ee413e3`, the screen sequence ALL 13 STEPS OK.

And the seeded randomness the captures draw from (`tools/scenarios/seeded-probe.js`: each game opened from the same seed and played six
answers, right and wrong, with the Mac's extras on and off): the same next number and the same six questions in Risk
Blaster, Boss Rush and Nest Egg Run. Before the review's fix, Risk Blaster's extras changed its questions from the third
on (the probe caught it on that build: the fix is checked by a test that failed before it).

## Every screen on both tiers (the harness)

- **The rules and the content** (`docs/master/runs/mactier-logic`, on the finished page): the rules' regression IDENTICAL
  from disk and served, the content and the scripts untouched since `ee413e3`, the screen sequence ALL 13 STEPS OK.
- **The stills** (`docs/master/runs/mactier-final-stills`: 21 a tier, the Mac's at 1470 x 830): no text over text on
  either tier. (Taken with the floor's reflection still at 0.8 of the picture: the finished page draws it at 0.6 again,
  as before this tier.)
- **The costs** (`docs/master/runs/mactier-final`, both tiers, the harness's own budgets): **no fault**, every screen
  inside its budget. A first run of the harness beside the two censuses timed out waiting for the title's pieces on a
  machine running three software browsers ("not all of its pieces arrived"): run again alone, the title whole. Its Mac
  measures took the reflection at 0.8; the screens that draw one (the hall, Nest Egg Run, Boss Rush) measured again on
  the finished page, beside the page before this tier, one after the other: `README.md`, The numbers.
- **The phone**: every screen as before (the same draws, triangles, pixels and memory), but Nest Egg Run's memory,
  315 → 325 MB, inside 450.

## The soak: 30 minutes of play with other programs on the machine

`tools/scenarios/soak.js` on the page with the review's fixes (`GLMEM=1`; 30 minutes of game time in 3 rounds, 1470 x
830 at pixel ratio 2, 374 answers given; its floor's reflection still at 0.8, put back to 0.6 after: a smaller target and
a cheaper frame), with other programs loading the machine the whole time (`tools/load.js`): 6 GB of memory
held and touched every few seconds, one of the four cores 60% busy, and a second browser drawing a WebGL scene without
pause. (`soak/soak.md` and `soak/soak.json`; the first soak, on the page before the review's fixes, `soak-first/`,
found the same.)

From round 2 to round 3, at the same moments: the JavaScript heap at most +2.1 MB; the textures and geometries on the
graphics chip +0, its programs -9; the page's elements +0, its timers +0; **the graphics chip's memory at most +1 MB**
(825 MB in the hall in both rounds). A frame's update, the median of the moments, 0.47 then 0.41 ms; drawn here (in
software) 9.3 then 9.0 s. **No growth and no slowdown.**

The most held: the graphics chip 1,757 MB in Nest Egg Run (its five sharper skies, at the end of a run), inside the
2,000 MB budget; the title hall 1,388 MB on its second visit. The browser's own processes in all (Chromium here: its
graphics process draws in software, so it holds the chip's pictures in ordinary memory, as a Mac's unified memory does):
2.9 to 4.4 GB. That total swung by up to 601 MB from round 2 to round 3 (its graphics process by 72): the six rounds
below tell a swing from a climb.

## Six rounds, the page before the Mac's tier and with it, side by side

To tell a growth from a swing, both pages played six rounds of the soak's plan at once (`GLMEM=1 MINUTES=12 ROUNDS=6`,
1470 x 830 drawn, 735 x 415 at pixel ratio 2), the browser's memory taken at each round's end:

| round's end | before: graphics MB | before: the page's process MB | with the Mac's tier: graphics MB | with it: the page's process MB |
|---|---|---|---|---|
| 1 | 734 | 1,126 | 525 | 1,565 |
| 2 | 734 | 1,178 | 525 | 1,712 |
| 3 | 734 | 1,026 | 525 | 1,207 |
| 4 | 735 | 1,179 | 525 | 1,717 |
| 5 | 735 | 1,041 | 526 | 1,734 |
| 6 | 735 | 1,195 | 526 | 1,314 |

The graphics chip's share level in both (the Mac's tier holds less in the hall than before: its sharper skies leave the
chip with their screens). The page's process swings by some 500 MB with the Mac's tier (by some 170 before) and does not
climb: the sixth round's end is under the second's. The JavaScript heap, the page's textures, geometries, programs,
elements and timers are level in both. The graphics process (here a software one, holding the chip's pictures in
memory) creeps some 10 MB a round in both pages alike: this machine's software drawing, not the game.

What the extra is, by the browser's own accounts (Chromium's memory-infra dump, `tools/scenarios/browser-memory.js`: the
page's process in the hall after two visits each to Risk Blaster and Nest Egg Run):

| the page's process, MB | before | with the Mac's tier |
|---|---|---|
| shared memory, and the graphics client's (the buffers a picture goes to the graphics process through: shared, counted once here) | 108 | 459 |
| malloc (among it the decoded copies of pictures the page keeps) | 493 | 823 |
| PartitionAlloc (arrays, Blink) | 330 | 338 |
| canvas, V8, Blink's heap, the rest | 158 | 158 |

The sharper skies are sent to the graphics chip again each time a screen opens with them (128 to 171 MB each), and the
browser keeps the buffers it sent them through for the next, and the decoded pictures: its own working memory, which it
reuses and lets go of (the swing above), not the game's objects. On the owner's MacBook, Safari's numbers are its own;
what holds is the shape: level from round to round.

## WebKit (Safari's engine) on the Mac

`WEBKIT_BROWSERS_PATH=... node arcade/tools/harness.js --engine webkit --only stills,costs --name mactier-webkit` on the
finished page: **no fault.** The stills, 21 a tier, no text over text on either; the sharper skies drawn (the guide's
archive, the exam's moon). Every screen inside its budget, and the same memory as in Chromium, screen by screen (the Mac:
the title 1,131 MB, the hall 576, Risk Blaster 1,179, Nest Egg Run 1,476, Boss Rush 714, Memory Bank 487, the exam 606,
the guide 552; the phone's as in Chromium, Nest Egg Run 325); draws at most 146 (Nest Egg Run, of 160), triangles at most
318K (of 500K).

## The census (stalls, garbage, page changes) on the finished page

`tools/scenarios/hitches.js` on the page with the review's fixes (the reflection still at 0.8: what is made and sent in
play does not depend on its size), every frame drawn, each game played with right and wrong answers:
on a phone's page (`--phone`, 220 x 478) and on a Mac's (480 x 270: the MAC tier, its sharper skies and its extras), in
two halves (`census-phone/`, `census-mac/`: a first run was stopped at the session's two-hour limit after the title,
the hall, Risk Blaster and Nest Egg Run; Boss Rush, Memory Bank and the exam were run again). Against Phase 5's census:

| screen | shaders made in play (phone / Mac) | pictures sent in play: phone | pictures sent in play: Mac |
|---|---|---|---|
| the title | 10 / 10, every one through `GFX.prepare` as the hall's pieces arrive [10] | its bosses' pictures as each arrives, one a frame (22 at 1024 px, 30 at 512: 130 MB [the same]) and their bone tables | **its bosses' sharper pictures as each arrives, one a frame: 22 at 2048 px, 22 at 1024 (440 MB)**, and their bone tables |
| the hall | 0 / 0 [0] | the attract screen, a 320 x 240 canvas [the same] | the same |
| Risk Blaster | 0 / 0 [0] | 0 [0] | **0** |
| Nest Egg Run | 0 / 0 [0] | 0 [0] | **0** |
| Boss Rush | 0 / 0 [0] | the wizard's bone table, 16 KB a frame [the same] | the same |
| Memory Bank | 0 / 0 [0] | 0 [0] | 0 |
| the exam | 0 / 0 [0] | one 512 x 512 canvas late in play (1 MB) [0: for Phase 8] | 0 |

**No shader is made in play anywhere, and no sharper sky or extra is sent to the chip in play.** The one cost the Mac's
tier adds in a moment of play is the title hall's: each arriving boss's pictures are sent one a frame as before, at four
times the size (a 2048 px picture, 16 MB, in a frame): for the device check (below). The census plays each game for at
most 1500 frames (on a loaded machine, at most 25 minutes, so some 800 to 1100): Nest Egg Run's changes of landscape,
from frame 1110 on, are covered by the run drawn frame by frame above (`tools/scenarios/play-uploads.js`: a whole run, its
four changes, nothing sent, on the finished page); Risk Blaster's regions the same way (fourteen changes, nothing sent). Garbage a frame much as before
(Boss Rush on a phone's page 54.5 KB [38.7 in Phase 5; 49 in Phase 1]: the phone's page draws nothing new in this tier;
for Phase 8).

## The independent review

One reviewer read the Mac's tier's code (`git diff deef476..` over `arcade/src` and `arcade/tools`) without running the
game (the soak was running), with small checks of its own. Its findings, the most severe first, and what was done:

| # | finding | done |
|---|---|---|
| 1 | **Nest Egg Run sent an 8K sky to the chip again mid-run** at the one change of landscape without a tunnel (year 16): the traffic is handed the frame's sky before the change finishes, and the old picture was let go in the same frame | `356792f`: the old picture goes a frame later |
| 2 | **Risk Blaster's extra far rocks drew from the seeded randomness**: their seeds, and in sparse regions more of the first 96 woken and reset from it | `22e725f`: seeds from their own randomness, slots of their own past the first 96; the probe above |
| 3 | Frame-time risks on the Air: the reflection at 0.8 (78% more pixels in that pass, in Boss Rush, Nest Egg Run and the hall), the title's sharper bosses sent one picture a frame (four times the bytes), a sharper sky arriving late on a slow connection made ready in play | the late sky not made ready in play (`955e71a`); the reflection measured (1.37 million pixels a frame more; 5 to 7% more of a frame in the hall and Boss Rush, 11% in Nest Egg Run, in software) and put back to 0.6 (`fd99e7f`); the title's bosses kept (their pictures sent one a frame as the hall fills, 16 MB in a frame for the largest), named for the device check |
| 4 | **The sharper skies stuck for the session**: a Mac held a step lower (the governor, Setup) kept sending them; the other copy's bytes fetched ahead were never let go | `955e71a`: the next screen loads the tier's own (checked: HIGH, MEDIUM, HIGH again); the other copy's bytes let go |
| 5 | CombatFX: a burst's seeded chunks were taken from the larger pool, so how many it drew from the seeded randomness could differ; a burst of one doubled | `e5ae59e`: the seeded chunks from the pool any computer has, the extras from the rest; the halves carried over |
| 6 | Tools: the "in play" moment is one sample at a game's end, not its peak; a moment not measured counted as growth | `18be933`: named for what it is; a missing measure no growth. The peak of a game's memory is the harness's measure at its first question |
| 7 | Comments wrong after the removals and the fixes | put right with the fixes |

Found fine: phones and the lower tiers draw what they drew before (the paths, the pools, the rocks, the crowd, the
reflection); every sharper sky is drawn through a dome's uniforms or held in a game's skies in waiting; a sky never goes
black (a texture let go is sent again at its next draw); the extras from their own randomness, which is put back even if
the code throws; the asset makers' outputs; the tools' memory counts (`glmem.js` the same code, byte for byte).

## Verdict

**The Mac's richer tier passes its gate.** The Mac's graphics memory is spent where it shows: ten skies at 8192 x 4096
(the exam's and the guide's drawn up 3.2 and 2.6 times before, Risk Blaster's and Nest Egg Run's 1.5), the title hall's
bosses in Boss Rush's own pictures, half as many sparks, embers and chunks again, twice Risk Blaster's far rocks, Boss
Rush's stands two fifths fuller; what would not show was measured and left out (Boss Rush's sharper skies, the wizard's
4096 map), and what cost frame time rather than memory was put back (the floor's reflection). Every screen inside the
Mac's 2,000 MB (the most 1,476 MB at a run's start, 1,757 MB in the soak with what the hall keeps), its draws and
triangles inside 160 and 500K; the phone's screens as before (Nest Egg Run 325 of 450 MB). The rules IDENTICAL, the
content untouched, the seeded questions and scenery the same with the extras on and off. The 30-minute soak with other
programs on the machine: no growth and no slowdown. No shader made and no sharper picture sent in play. WebKit the same.
The independent review's seven findings answered.

Left for the devices, the arbiter this machine cannot be: the MacBook's FPS counter through the title's glide (its
bosses' sharper pictures arrive during it, one a frame, 16 MB the largest), Risk Blaster (its frame here 14% dearer at one
moment, its far field twice as dense), Nest Egg Run and Boss Rush; Safari's memory in Activity Monitor over half an hour
with the usual apps open. If the glide drops frames on the MacBook, the hall's sharper bosses come out (one commit: the
`-hd` files); if Risk Blaster does, its far rocks go back to 96.
