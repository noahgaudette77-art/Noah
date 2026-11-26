# Phase 7: the Mac, the audit (2026-11-25)

What the plan names for this phase (`MASTER_PLAN.md`, Phase 7): landscape layouts, keys, hover, Retina and display
changes, resizing without leaks, Safari and Chrome, long sessions; the carried items (the results screen's bar, the
icons under 20 px, the car's glare in WebKit). Each was checked on the build before this phase's fixes (Phase 6's, with
only the tools new). This machine draws in software: what it measures is layout, memory, behaviour and one build's
cost against another, never a device's frame rate.

## How it was checked (tools, all in `tools/`)

| what | how | |
|---|---|---|
| Layout at a window's size | `scenarios/polish.js` with `LAYOUT=1` (new): every screen's 21 stills at a size, and on each: text overlapping text, anything cut off at the window's edge, a page that scrolls sideways, a tap target under 24 px, an icon under 20 px (named by the button it sits in) | seven sizes: 1024 x 640, 1280 x 720, 1470 x 560, 1470 x 830 (a MacBook Air's window), 1920 x 1080, 2560 x 1440, 900 x 1000 |
| Resizing and moving between displays | `scenarios/resize.js` (new): on eight screens, the window through twelve sizes (800 x 600 to 2560 x 1440) with its pixel ratio switched between 2 (Retina) and 1 (an external display), then twice the ratio alone (a window dragged to another display of the same size); one round to warm up, two measured. Held before and after: textures, geometries and programs on the graphics chip, the page's elements, the JavaScript heap (exact, after a collection). After every change: does the drawing follow (canvas = window x ratio, its shape, filling the window)? `CONTROL=1`: the same frames with no resizing | |
| Keys | `scenarios/keys.js` (new): the game walked with the keyboard alone (title, hall, stage select, a client's briefing, a game, its pause menu, back to the hall); each game's own keys; results, the guide (its search box), stats, Setup, the exam's grid and its careful question; the focus ring wherever the keyboard moves the focus | |
| Hover | the same tool: on 17 screens, one of every kind of clickable thing hovered with the mouse, its look before and on the hover compared (colour, background, border, shadow, filter, transform), and its pointer | |
| Safari against Chrome | `polish.js` in Playwright's WebKit (Safari's engine) at 1470 x 830 and pixel ratio 2, the 21 stills beside Chromium's, the same layout checks | |
| Long sessions | `scenarios/soak.js` (new, the gate): half an hour of play on the Mac tier, round after round (`gate-report.md`) | |

## What was found

1. **The layouts held at every size.** At all seven sizes, on every screen: no text over text, nothing cut off, no
   sideways scroll, no tap target under 24 px. The only fault, at every size: icons under the art bible's 20 px (the
   icon-only buttons, pause, sound, full screen and the hall's arrows, 16; the HUD's lives 16-18; a stage's stars
   15-16; Setup's row icons 16; a world's mark 14; a trophy's lock 12). Carried from Phase 2's gate.
2. **The menus were a phone's column in a wide window.** Results, stats, Setup, stage select and the guide's front
   page kept their one narrow column on a Mac: on 1470 x 830 a typical results screen ran 180 px under its pinned bar
   (its tiles below the fold on 1470 x 560), stats was 1911 px of one column, Setup 1850, and a world of five stages
   took two rows. (Shown before and after in this folder: `results-`, `stats-`, `setup-`, `select-`, `guide-` at
   1470 x 830 and 1470 x 560.) This is the carried "results bar covers its content" on the Mac.
3. **Resizing leaks nothing, and the drawing follows.** On the hall, Risk Blaster, Nest Egg Run, Boss Rush, Memory
   Bank, the exam and the guide: after two rounds of 14 changes, the same textures, geometries, programs and page
   elements to the one, the heap within 0.1 MB (`resize.json` in the run; heap a round 15.4, 15.4 MB in the hall;
   19.8, 19.7 in Risk Blaster; 22.4, 22.4 in Nest Egg Run). The canvas followed every change of size and of pixel ratio
   alone (the game reads the ratio every frame; a ratio change fires no resize event), at full scale. The title grew
   (48 textures, 14 geometries, 3 programs, 0.7 MB) and grew as much with no resizing at all (the control: 48, 13, 7,
   1.1 MB): the title hall loading its cells as the camera glides, not the resizing. Whether that stops is the soak's
   to show.
4. **Keys: Enter on a button reached with Tab did the screen's Enter instead.** 78 checks, 6 failed: Tab to STATS in
   the hall and Enter played the cabinet; to CHANGE STAGE on a results screen and it played again; to the exam's flag
   and it went on to the next question (Space flagged); to Memory Bank's pause button and it turned the card. Every
   other key did what the screen's keys say (title Enter and Space; the hall's arrows and Escape; answers by number
   and letter; the racer's lanes and boost; Memory Bank's turn and grades; the exam's arrows; pause with Escape or P;
   the briefing's Enter and Escape; the guide's search and its Escape; the careful question's Escape answering no;
   the focus ring wherever the keyboard put the focus).
5. **On a Mac a keyboard could not reach a stage.** Safari's Tab skips buttons unless its settings say otherwise
   (Option-Tab reaches them), and the arrows did nothing on stage select (or on the guide's chapters, Setup, the
   exam's grid, a menu): a player with the keyboard alone came to stage select and stopped. In Chrome, Tab took three
   presses to the first stage and fourteen to the eleventh. The exam's question grid meant to open with the current
   question focused, and focused nothing (it found the legend's HERE swatch first).
6. **Hover: four kinds of button gave no sign.** Of 59 kinds of clickable thing on 17 screens, Memory Bank's grades
   (MISSED, GOT IT, EASY) and FLIP CARD (their own filter hid the buttons' hover), the exam's question numbers (none),
   and an effect switched on in Setup (a click turns it off) did not answer the mouse. Every other button, card,
   chip, tile and switch did, with a pointing hand.
7. **WebKit against Chromium.** The same layout in both, no fault in either. Three differences, none Safari's to fix:
   - this machine's WebKit draws no `backdrop-filter`: the screen behind a menu shows sharp where Chromium blurs it
     (the computed styles are the same in both; a real Safari draws it);
   - once, in Risk Blaster, a short white streak across the demon's waist (the lens streak drawn through a very bright
     point): not again in three targeted WebKit runs at both pixel ratios, nor ever in Chromium, and the demon's
     charged claws look the same in both engines. To look for on a real Safari;
   - the car's white glare in Nest Egg Run, carried since 2026-11-22, is gone: the car (rebuilt in Phase 5) is gold in
     WebKit as in Chromium, at the Mac's size and the phone's.
8. **The phone's results page** ends, at the top of its scroll, in the fade the art bible asks of a list above
   whatever is pinned under it ("NO MISSES. FLAWLESS." fading into the bar's edge, the rest a scroll away): kept as
   designed. On the Mac the two columns (2) put it in view.

## Weighed and left

- **The whole interface scaled up on a 2560 x 1440 window** (it stays at its own size: on a large display the menus
  now spread into columns, capped at 1360 px, and the game's panels keep their reading size; a browser's zoom scales
  everything for whoever wants it larger).
- **Glyphs inside labelled buttons at 20 px** (PLAY AGAIN's arrow, NEXT's, BACK's): the label speaks for the button, and
  a 20 px glyph would stand twice the height of its 11 px words. They keep 12-16 px; so does a lost life's shrunken
  heart (its faded state).
- **A NaN guard in the bloom's bright pass** against the WebKit streak: the pass already caps each tap at 24, the streak
  could not be made again to test a guard against, and every frame of every screen goes through that pass.
