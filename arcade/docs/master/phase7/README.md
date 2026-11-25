# Phase 7: the Mac (2026-11-25)

Run eighth, by the owner's order of 2026-11-24 (0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8). The plan
(`MASTER_PLAN.md`, Phase 7): landscape layouts, keys, hover, Retina and display changes, resizing without leaks, Safari
and Chrome, long sessions; the items carried from Phase 2's gate (the results screen's bar, the icons under 20 px, the
car's glare in WebKit). The gate: a 30-minute soak on the Mac tier with no slowdown or memory growth.

**The audit: `audit.md`.** The layouts held at seven window sizes and resizing leaked nothing; the faults were in
how the menus used a wide window, the small icons, the keyboard (Enter on a button reached with Tab did the screen's
Enter instead; on a Mac a keyboard could not reach a stage at all) and four kinds of button with no hover. **The gate:
`gate-report.md`.** **Spend: nothing** (no provider called).

## What changed in the game

| commit | change | measured |
|---|---|---|
| `283fef2`, `aceb171`, `8f2a077`, `6504a42`, `f0f0432` | **The menus use a wide window** (from 1100 px on a landscape window; a phone, and any narrower or squarer window, as it was): results with the hero (medal, headline, stars, score) in a column beside the run's details, the hero staying in view while a long review scrolls, the pinned bar keeping to the same columns; stats with the rank and its tiles beside the trophies; Setup's rows in two columns; stage select and the guide's front page widening to 1360 px (a world's five stages on one row). Setup's second column was laid out but not drawn in WebKit: its box made a stacking context of its own (`f0f0432`) | at 1470 x 830: a typical results screen whole above its bar (was 180 px under it); stats 1071 px long (was 1911), Setup 1020 (was 1850). Before and after: `results-`, `stats-`, `setup-`, `select-`, `guide-1470x830.jpg` and `-1470x560.jpg` |
| `795509b` | **Icons at the art bible's 20 px**: the icon-only buttons (pause, sound, full screen, the exam's grid and flag, the hall's arrows; were 16), the HUD's lives (16-18), a stage's stars (15-16), Setup's row icons (16), a world's mark (14), a trophy's lock (12). A glyph inside a labelled button keeps its size, and the racer's narrowest phones their smaller lives | every screen at 1470 x 830 and on the phone (440 x 956): no text overlap, nothing cut off or scrolling sideways; under 20 px only glyphs in labelled buttons and a lost life's shrunken heart |
| `5d17a60` | **Enter or Space on a button the keyboard moved to is that button's** (the browser clicks it); with the focus where a click or the game put it, a screen's keys are as they were | `tools/scenarios/keys.js`: 6 of 78 checks failed (Tab to STATS and Enter played the cabinet; CHANGE STAGE played again; the exam's flag went on; Memory Bank's pause turned the card), none after |
| `5be6101` | **The arrows over a screen's cards and buttons** (`UI.arrowNav`): stage select, the guide's chapters, Setup, the exam's question grid, the pause menu, a yes or no; results Left and Right only (Up and Down still scroll its list). The first arrow goes to what the screen lights (the stage to play next, the question you are on, Setup's first setting, PLAY AGAIN). Enter on stage select plays the lit stage, on the exam's setup starts it; a held Enter from the last answer no longer plays again | Safari's Tab skips buttons unless its settings say otherwise: with the keyboard alone a player can now go from the title to a stage and through a game. 101 checks, none failed |
| `9d9b524` | **The exam's question grid opens with the question you are on focused** (it looked for `.here` and found the legend's HERE swatch first) | read |
| `2ab765e` | **P pauses the exam too**, as it pauses the other games: in full screen the browser takes Escape to leave it | read |
| `55cf51a`, `41ea77b`, `f07a7e6`, `e631b55` | **The independent review's findings** (`gate-report.md`): Enter under a client's briefing clicked the stage the arrows had moved to (the briefing cut short and never shown again): Enter and Space are a focused button's only on what is on top and in play; an arrow the screen takes as its own (the cabinets, a lane, a grade, a question) lets go of that button; the arrows go across in reading order and down by rows (Setup down one column and on down the next), and past the last row the page scrolls; the exam's grid scrolls to its question only for the keyboard; Nest Egg Run's hearts and shields at 20 px only from 400 px wide | the keys: 104 checks, none failed (Chromium and WebKit); the racer's top row at 375, 390, 393, 402, 430 and 440 px: fits at each (at 375-393 the pause button had stood 4-16 px past it) |
| `3fcd2f5` | **Every button a mouse can click answers its hover**: Memory Bank's grades and FLIP CARD (their own filter hid the buttons' hover), the exam's question numbers, an effect switched on; Memory Bank's card lifts its glow before it is turned, and shows no hand once turned (a click does nothing then) | 59 kinds of clickable thing on 17 screens: 4 kinds silent before, none after but a switch's chosen setting (a click leaves it as it is) |

Tools (new): `tools/scenarios/keys.js` (the keyboard walk and the hover pass), `tools/scenarios/resize.js` (resizing
and moving between displays, held memory before and after, whether the drawing follows), `tools/scenarios/soak.js`
(the gate), `LAYOUT=1` in `tools/scenarios/polish.js` (layout faults at a window's size); `tools/capture.js` counts
the timers waiting (`window.__timers`).

## Weighed and kept

- **The interface at its own size on a large display** (2560 x 1440): the menus spread into columns, capped at
  1360 px; a browser's zoom scales everything for whoever wants it larger.
- **Glyphs in labelled buttons at 12-16 px**: the label speaks for the button; at 20 px the glyph would stand twice
  the height of its words.
- **The phone's results page ending in a fade above its pinned bar** at the top of its scroll (the rest a scroll
  away): the art bible's rule for a list over something pinned.
- **No guard added to the bloom against the streak seen once in WebKit** (`audit.md`, 7): it could not be made again
  to test one against.

## What to test on the devices

- **Mac, Safari, the keyboard alone:** from the title, Enter; in the hall the arrows and Enter; on stage select an
  arrow lights the stage to play next, the arrows move between stages, Enter plays (or Enter at once plays the lit
  one); in a game the numbers or letters answer, Escape pauses and the arrows move in the pause menu; on results Left
  and Right along the buttons, Enter; in Setup the arrows over the switches, Enter sets one.
- **Mac, Chrome (or Safari with Option-Tab):** Tab to STATS in the hall and press Enter: the stats open (the cabinet
  played before). Tab to the exam's flag and press Enter: the question is flagged.
- **Mac, the mouse:** every button lights as the pointer comes over it (Memory Bank's grades and FLIP CARD, the exam's
  question grid among them).
- **Mac, a wide window:** results, stats, Setup, stage select and the guide spread into columns; narrow the window and
  each goes back to one column.
- **Mac, two displays (if one is at hand):** drag the window from the Retina screen to the other and back, and resize
  it: the picture stays sharp, never stretched or blurred.
- **Mac, Safari, Risk Blaster:** a short white streak across the demon (seen once in this machine's WebKit; never in
  Chrome).
- **Mac, a long session:** half an hour with the FPS counter on (Setup > FPS counter): steady from start to end.
- **iPhone:** the larger icons (the HUD's lives, the pause button, a stage's stars) sit without crowding anything.
