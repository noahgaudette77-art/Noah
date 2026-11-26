# Phase 7's gate (2026-11-25)

The gate (`MASTER_PLAN.md`, Phase 7): **a 30-minute soak on the Mac tier with no slowdown or memory growth.** With
it, as every phase: the harness (the rules' regression IDENTICAL from disk and served, the content and the scripts
untouched, the screen sequence, every screen's stills and costs on both tiers), and an independent review of the
phase's code. This machine draws in software: its times compare one round or one build with another, never a device's.

## The soak

`tools/scenarios/soak.js` (new): half an hour of play on the Mac tier (1470 x 830 at pixel ratio 2), on the virtual
clock, in three rounds of ten minutes each: the title hall, the hall, each game played (questions answered, one in four
wrong, the explanation read, a pause now and then, the game over or the deck's end and its results, played again
while its time lasts), the guide, stats and Setup. At the same moments of each round (back in the hall after each
game, the garbage collected): the JavaScript heap, the textures, geometries and programs on the graphics chip, the
page's elements, the timers waiting; the time a frame takes here, updated alone and drawn (read back, so software
drawing is waited for), and the draw calls and triangles a drawn frame asks for. The first round loads and builds
what is kept for good (the files' cache, every shader once); a leak grows after it: rounds 2 and 3 are compared.

**The first soak found growth** (`soak-1st.md`): from round 2 to round 3, at the same moments, 3 to 4 geometries and
4 textures more on the graphics chip, and the heap about 1 MB more; the page's elements, the timers waiting and the
draws a frame asked for the same; a frame's time within this machine's noise. `tools/scenarios/leaks.js` (new; each screen
visited four times over, every geometry and texture the renderer holds traced to where it was made) found four things
held after a visit: Risk Blaster's drones' dark glass (a geometry and its material, made on first use and out of the
scene by the time it closed), the overlord's brood's shapes (nine taken in turn by three ships; only the three on show
were let go), Boss Rush's sparks' 4 x 4 texture (on a shader's own uniform, which the scenes' teardown does not
reach) and the title's caged bosses' bones (three.js keeps a skeleton's bones in a texture of its own). Fixed:
`13f7abc`, `3ca6272`, `f7fd6b8`, `034d7b3`. After them, every screen visited four times over ends each visit with the
same on the graphics chip and the same live objects in JavaScript (scenes' objects, geometries, materials, textures).

**The second soak** (`soak-2nd.md`): the graphics chip flat from round 2 to round 3 (textures +0, geometries +0,
page elements +0, timers +0, programs -9), no slowdown (a frame 0.22 then 0.18 ms updated, 4.9 then 4.8 s drawn here,
the draws the same), but the JavaScript heap still 1.2 MB more at each moment of round 3. Heap snapshots at each round's
end (`soak.js` with `SNAP=1`, a 12-minute run) compared kind by kind (`tools/heapdiff.js`): 27 MB more of array
buffers' data (geometries' arrays, outside the heap's own count, so the real growth was far more than the 1.2 MB),
and, attributed to its path from the page's roots (`tools/heapowners.js`), all of it on one: `GFX._parked.HallScene`,
the Proctor's reactor's metal, its `onBeforeCompile` hook, the closure's scope (`tools/heapwho.js`: its variables `grp`
and `bossHousing`), the housing's group, up its parents to the whole title hall of the visit before. A closure made in
a function shares that function's scope with every other closure made there: the hook held `grp` because the lathe
helper beside it used it. Fixed: `7ece4ab` (the hook a function of its own). The same 12-minute run again: from round 2 to
round 3 the snapshot's whole size 11.9 MB smaller, the heap at every moment in the hall 0.55 to 0.72 MB lower, the
textures, geometries, page elements and timers the same (`soak-snap.md`; the title's moment varies with how far its
hall has loaded in real time when it is read).

**The final soak, on the finished build** (`soak-final.md`; 30 minutes of play, 1470 x 830 at pixel ratio 2, 374
answers): from round 2 to round 3, at the same moments, textures +0, geometries +0, page elements +0, timers waiting +0,
programs -9; the draws and triangles a drawn frame asks for the same at every moment (85 and 318,096 in the hall); a
frame 0.28 then 0.29 ms updated and 5,015 then 5,019 ms drawn here: **no slowdown**. The heap 1.9 MB higher at the
round's end. To tell a drift from a climb, six rounds (`soak-long.md`; 48.6 minutes of play, pixel ratio 1): the heap
at each round's end 27.2, 29.0, 29.4, 29.8, 28.0, 29.6 MB, up and down within 28 to 30 MB with no trend (the fifth
lower than the second); textures 119 or 120, geometries 85, page elements 156 at every moment of every round; programs
between 270 and 283 (a shader's variants made and let go with the parked materials). **No memory growth.**

| at the hall after... | heap MB, rounds 1 to 6 | textures | geometries | programs |
|---|---|---|---|---|
| Risk Blaster | 22.5, 31.2, 32.4, 32.5, 30.9, 32.9 | 97, then 119 | 85 | 132, then 274-283 |
| the exam | 27.0, 29.1, 29.4, 29.8, 28.0, 29.7 | 117, then 119 | 85 | 270-283 |
| the round's end | 27.2, 29.0, 29.4, 29.8, 28.0, 29.6 | 120 | 85 | 270-283 |

(The first round loads and builds what is kept for good: the files, every shader once, the models' templates.)

## Resizing and moving between displays (`tools/scenarios/resize.js`)

Eight screens, each through two measured rounds of fourteen changes (twelve sizes, 800 x 600 to 2560 x 1440, the pixel
ratio switched between 2 and 1 on the way, then the ratio alone twice), after a round to warm up:

| screen | textures | geometries | programs | page elements | heap a round (MB) | the drawing |
|---|---|---|---|---|---|---|
| the hall | +0 | +0 | +0 | +0 | 15.4, 15.4 | follows every change, at full scale |
| Risk Blaster | +0 | +0 | +0 | +0 | 19.8, 19.7 | follows every change |
| Nest Egg Run | +0 | +0 | +0 | +0 | 22.4, 22.4 | follows every change |
| Boss Rush | +0 | +0 | +0 | +0 | 23.7, 23.7 | follows every change |
| Memory Bank | +0 | +0 | +0 | +0 | 23.3, 23.3 | follows every change |
| the exam | +0 | +0 | +0 | +0 | 24.6, 24.6 | follows every change |
| the guide | +0 | +0 | +0 | +0 | 24.7, 24.8 | follows every change |
| the title | +48 | +14 | +3 | +0 | 14.2, 14.4 | follows every change |

The title grew as much with the window left as it is (`CONTROL=1`: +48, +13, +7, 1.1 MB): the hall loading its cells as
the lens glides, not the resizing (the soak shows where it stops).

## The keys and the hover (`tools/scenarios/keys.js`)

The game walked with the keyboard alone and every screen's keys checked: **104 checks, none failed, in Chromium and in
WebKit** (Safari's engine), on the finished build. Before this phase's fixes, 6 of the first 78 failed (`audit.md`, 4). The
hover: 59 kinds of clickable thing on 17 screens, each answering the mouse with a change of look and a pointing hand,
but a switch's chosen setting (a click leaves it as it is) and a turned card (a click does nothing).

## Layouts

Seven window sizes, 21 stills each (Chromium, the build before the icons): no text over text, nothing cut off, no
sideways scroll, no tap target under 24 px; the one fault the icons under 20 px. After the icons: at 1470 x 830 in
Chromium and in WebKit, and on the phone (440 x 956), the same, and under 20 px only glyphs inside labelled buttons
and a lost life's shrunken heart. Nest Egg Run's top row measured at 375, 390, 393, 402, 430 and 440 px wide with two
shields up: it fits at each.

## The harness

`node arcade/tools/harness.js --name phase7-final` on the finished page (`docs/master/runs/phase7-final/report.md`; it
names `cf1c2aa`, the commit it started on: the page it read is the one committed 20 seconds later as `687ef68`, the same
file to the byte): **no fault**. The rules' regression IDENTICAL from disk (23 s) and served (55 s); the content and the
scripts untouched since `ee413e3`; the screen sequence ALL 13 STEPS OK. The stills, 21 a tier: no text over text on
either (the changes it lists are against Phase 0's baseline: every phase's since). Every screen's cost inside its
budget:

| tier (budget: draws / triangles / memory MB / lights) | most draws | most triangles | most memory MB | most lights |
|---|---|---|---|---|
| phone (100 / 350K / 450 / 5) | 88 (Risk Blaster) | 243,777 (Risk Blaster) | 370.9 (Risk Blaster) | 5 |
| Mac (160 / 500K / 900 / 6) | 142 (Nest Egg Run) | 318,054 (the hall) | 795.1 (Risk Blaster) | 5 |

(Risk Blaster's phone draws, 101 at Phase 6's gate, were 88 at this run's moment: they follow the traffic in view. The
performance re-check counts them at many moments.)

## The independent review

One reviewer read the phase's code (`git diff 91168a6..` over `arcade/src`) without running it (the soak was not to
be disturbed). Its findings, the most severe first, and what was done:

| # | finding | done |
|---|---|---|
| 1 | **High.** Enter or Space under a client's briefing clicked the stage the arrows (or Tab) had moved to: a briefing takes no focus, and the new rule (a button the keyboard moved to takes Enter) ran before the briefing's own keys. The stage started again under the briefing, which was cut short and, its client marked as met, never shown again; PLAY BRIEFING in the guide started over at every Enter; a button of the exam's put out of reach while its ending plays could be clicked by the ending's skip keys | `55cf51a`: Enter and Space are a focused button's only when it is in what is on top (the briefing or menu over a screen) and can be clicked. `tools/scenarios/keys.js` checks it (Enter on the briefing reads on; the stage under it is not started) |
| 2 | **Medium.** Nest Egg Run's top row no longer fitted at 375-393 px: the 20 px rule raised its hearts and, by order, its shields (14 to 20) | measured: the pause button 16, 7 and 4 px past the row at 375, 390 and 393. `e631b55`: the racer's lives at 20 px from 400 px wide, its own 16 and 14 narrower: it fits at all six widths |
| 3 | **Low.** The arrows held the page still past the last button (Setup's HOW IT WORKS out of reach of the keys) | `41ea77b`: with nothing that way, the key is left to the page. Walking Setup showed two more faults in how the arrows aimed (the sound test's single button skipped; a jump between Setup's two columns): the arrows now go across in reading order and down by rows, Setup row by row in reading order |
| 4 | **Low.** A key held as the page lost the window (a browser's shortcut with an arrow) never brought its keyup, and the next focus could count as the keyboard's | `55cf51a`: modified arrows do not count; the window's blur ends it |
| 5 | **Low, on a phone.** The exam's question grid, focused at last on the question you are on, opened a 100-question grid scrolled away from its title | `f07a7e6`: scrolled to it only for the keyboard |
| note | The focus stays on a button through a screen's own arrows (Tab to STATS, turn the cabinets, Enter opens STATS) | `55cf51a`: an arrow the screen takes as its own (it says so with preventDefault: the cabinets, a lane, a grade, a question) lets go of the button |

Found nothing: the study logic and what is saved (the new keys only call actions that were there); a media query that
could catch a phone or an iPad held upright; `:has()` (an old browser keeps the single column); the other HUDs and the
hall's bar at 20 px; the focus when answers are drawn again, when the explanation focuses NEXT, after a click.

## Verdict

**Phase 7 passes its gate.** Half an hour on the Mac tier with no memory growth and no slowdown (and six rounds, 48.6
minutes of play, with the heap level); the harness without fault; the review's findings fixed. Left for the performance
re-check, which comes next: what a closed screen's parked materials still hold (one old scene per kind until it comes
round again, about 9 MB in all), and the raw files kept after decoding. To check on the devices: `README.md`'s list.
