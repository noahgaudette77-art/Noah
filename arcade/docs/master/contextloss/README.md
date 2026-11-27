# A lost graphics context (2026-11-26)

The owner's order, as given: "Add a graphics-context-loss handler: on loss, pause the game cleanly, and on restore,
rebuild everything the library doesn't restore on its own (including runtime-built reflections and environment maps),
then resume without losing game state. Test it by forcing a context loss in Playwright (WebKit and Chromium) and confirm
the title hall, a boss fight, and the Memory Bank all recover with no black reflections. Study logic stays untouched."

A browser takes a page's graphics context away when the graphics chip or its driver restarts, when the system takes its
memory back from a page in the background (Safari on an iPhone does this to a page left behind another app), or when a
Mac switches graphics chips; it may give it back later. Until now the page did nothing about it: three.js made its own
state again, and every reflection the page had drawn at run time came back black.

## What three.js gives back by itself, and what it cannot

On restore three.js r128 makes its whole state again (`initGLContext`: new properties, programs, textures, buffers), so
every texture is sent again from the picture it keeps (an image, a canvas, a decoded bitmap, data), every shape from its
arrays, every shader made again, every render target made again, empty. What it cannot give back is what the page drew
into targets of its own at run time, and a few settings its new modules start without:

| what | where | brought back by |
|---|---|---|
| every sky's reflection (PMREM from the panorama) | `Assets.loadSky` | `GFX.keepEnv` (`Assets.skyEnv`) |
| the reflections made from a small neon scene | `makeEnvMap` (the hall, Risk Blaster, Boss Rush), `memoryEnvMap`, `examEnvMap` | `GFX.keepEnv` |
| a region's or a landscape's reflection | Risk Blaster's `BlasterSky.envScene`, Nest Egg Run's `RacerSky.envScene` and `RacerEnv` | `GFX.keepEnv` |
| the title hall's black stand-in reflection | `hallBlackEnv` | `GFX.keepEnv` |
| a room's probe (the floor's and the steel's or columns' reflection) | the title hall, Boss Rush, the exam (`roomProbe`) | the screen's `probeNow` (three times over), Boss Rush's `restoreGraphics` |
| Risk Blaster's nebula (drawn once on the chip) | `spaceBakeNebula` | `GFX.onRestore` (`spaceNebulaDraw`) |
| Nest Egg Run's skies' smaller copies (made by hand) | `RacerSky.mips` | `GFX.onRestore` |
| the page's clear colour (three.js's new background state is black and clear) | `GFX.init` | set again |
| every post-processing pass's shader, made ahead (once a visit) | `pipe.compileAll` | made again with the screen's |
| a cached extension object (parallel shader compiling) | `GFX.prepare` | asked for again |

Mirrors and every post-processing target are drawn again every frame: nothing to do. Nothing in the page drops a
picture or a shape's arrays after sending them (an ImageBitmap is closed only when its model is let go).

## How it works

- **Lost** (`GFX.contextLost`, after three.js's own listener): nothing is drawn and nothing moves (`Scenes.frame` runs
  nothing: a game's clocks, its tweens and its timers on the game's own time stand still, a game in its opening moments
  too, which no pause holds; without it, Risk Blaster's first question, asked 1.3 s into a game, would be asked unseen and
  its time run out in the dark); a game in play is also paused by its own `pause()` (its timers and its auto-advance held,
  the PAUSED menu up, its sound hushed, as when the page is hidden); no screen is readied, no shader asked for, no probe
  face drawn (`GFX.warm`, `GFX.prepare`, the probes), the governor counts no frame; a notice ("RESTORING GRAPHICS")
  covers the screen and takes the pointer, and no key does anything; whatever would make something on the graphics chip
  waits (`GFX.whenGL`): a sky that finishes loading, a screen about to be built. After ten seconds the notice offers
  RELOAD (a browser may never give the context back; progress is kept), which Tab reaches and Enter or Space presses.
- **Back** (`GFX.contextRestored`, after three.js has made its state again): the clear colour set again; every kept
  target drawn again into a new one and copied texel for texel into the old (`GFX.keepEnv`, `GFX.copyTarget`), so every
  material and scene that holds it holds it still; the nebula and Nest Egg Run's smaller copies made again; the screen's
  probe drawn again whole, three times over (its steel mirrors the probe and the probe the steel, which came back black;
  Boss Rush's never with a stroke of lightning in it); the screen readied as it was the first time (`GFX.warm(s, true)`:
  every picture it draws, every shader, its own pieces kept aside and its skies in waiting, from the lists it had then,
  not from those of a screen about to be built), with every post-processing pass's shader; the sharper skies it does
  not draw let go again; what waited run; the governor started afresh; the notice gone; the game resumed if this paused
  it (a game the player had paused stays paused). All of it from a randomness of its own (`ownRandom`): what three.js
  makes draws ids from Math.random, and the game's own draws go on as they would have.
- **What a restore leaves behind** (`GFX.guardDeletes`): three.js r128 keeps the listeners of the modules it made before
  a restore on every texture, shape and target it had sent; letting one go after a restore deletes its old object too,
  which both browsers report as an error ("object does not belong to this context": 520 of them in Chromium and 263 in
  WebKit over the test, before the guard; WebKit stops reporting any after a few, which would hide a real one). Each
  object is marked with the context's generation, and a delete of one from an earlier generation is skipped: there is
  nothing left of it to delete.
- **Let go as it was** (`GFX.keepEnv`): a kept target's builder goes with the target (a closed game's materials,
  kept for their shaders by `GFX.park`, hold its reflection's target, and must not keep the game the builder drew from);
  a sky's reflection is owned by its target (`ownTarget`), so a sky retired at a change of tier goes whole, its
  framebuffer with it, and is not made again after a later restore.

The rules are not touched: a lost context is a pause, and the game is the same game after it.

What it costs: a restore makes every kept target again in one go behind the notice, every sky of the visit among them
(each picture sent again and its reflection made: on a Mac at the MAC tier, the sharper skies' 8K pictures too). Nothing
in normal play changes: the builders make the same objects in the same order, `whenGL` runs at once while the context is
there, and the delete guard passes every delete through (one comparison).

## The test

`tools/scenarios/context-loss.js` (Playwright, both engines, each run set against a control: the same moments with the
context kept, the game paused and its screen held for the same frames by hand). The context is taken away with
`WEBGL_lose_context.loseContext()` and given back with `restoreContext()`: the browser drops and makes the context again
as it does after a reset of the graphics chip, as far as the page can see. Then, on each screen:

| screen | kept reflections read back (none black, as before within 1%) | the room's probe (its light against the control's) | the still after against the control's (RMSE; parts darker) | the game |
|---|---|---|---|---|
| the title hall (lost for 11 s) | 1 | 102.0% (Chromium), 100.8% (WebKit); the steel 1.234 / 1.227, as before | 0.0071 / 0.0002; none | (RELOAD hidden, then offered at 10 s, Tab reaches it) |
| Boss Rush, a fight | 5 | 104.8% / 100.0%; the steel 1.109 / 1.111, as before | 0.0002 / 0.0003; none | paused, still, resumed, the same; an answer recorded after |
| the Memory Bank (lost twice) | 6 | 100.0% / 100.0% | 0 / 0.0019; none | paused, still, resumed, the same, twice; a card turned after |
| Risk Blaster | 16 | | 0 / 0.0001; none | as Boss Rush |
| Nest Egg Run | 19 | | 0 / 0; none | as Boss Rush |
| Risk Blaster in its opening moments | | | | nothing asked or run out in the dark; its first question after |
| the Memory Bank opened while lost | 14 | | | waits, built once it is back, readied with its own list, a card turned |

**93 checks in Chromium and 93 in WebKit, all passed** (the controls' 11 and 11 too): no WebGL complaint from either
browser (warnings included) and no error from the page. The runs' logs and pictures: `scratchpad/ctxloss/` (not kept in
the repository; the test makes them again in about 35 minutes for both engines).

How the stills are judged: two runs of a screen are not always the same picture before anything is lost (WebKit's title
hall, its bosses arriving in another order; a light that flickers in Risk Blaster), so the two stills before are set
against each other too, and the restore must add nothing: no 16 px square of the frame darker after (by more than 0.08 of
full brightness and a third of what it was) that was not before, and the difference over the frame no more than before,
give or take 0.015. A black reflection, however small its patch, is caught; the kept targets and the probe are also read
back texel by texel.

**What the test found** (each fixed and run again):
- Boss Rush's probe came back a fifth darker (22% of its light): its arena shows the deck's mirror, drawn only when a
  frame is drawn, and the probe was drawn before any frame. Now a frame is drawn first (`GFX.render` with no time).
- Three.js's leftovers' deletes after a restore (520 complaints in Chromium, 263 in WebKit over one run): `guardDeletes`.

## The independent review

An independent review (opus) read the handler and the test. What it found, and what was done:

1. **A closed Risk Blaster or Nest Egg Run kept alive** (normal play): a kept reflection's builder, held by its target,
   which a closed screen's parked material holds, held the whole game. The builder now goes with the target.
   `tools/scenarios/closed-games.js` counts the live games after each is closed: with the first version 1 of each, and 2
   after Risk Blaster's second play; now 0.
2. **A retired sky's reflection kept for the visit** (a change of tier): it was let go texture only, so the keeping never
   ended (and a later restore would make it again); now its target owns it (`ownTarget`) and it goes whole.
3. **A game lost in its opening moments ran on** (no pause holds a game's opening: its first question would have been
   asked unseen and its time run out in the dark, recorded as a miss): now nothing moves while the context is lost.
4. **RELOAD showed at once** (`.btn`'s own display beat `[hidden]`): hidden until ten seconds, and reached by Tab.
5. Smaller: the post-processing passes' shaders made again with the screen's (they were made once a visit); a screen
   readied from its own lists (a screen about to be built kept its own); the page's clear colour set again; the restore's
   readying inside a guard (a throw would have left the notice up); a probe's cube not sent as a picture (WebKit's
   complaint).
6. The test: its "the game goes on" checked nothing (a clock moved anyway; now the answers recorded), the two stills were
   not alike (now both runs make the same extra capture before the still), whole-frame RMSE missed a small black patch
   (now the darker squares), and it covered less than the handler does (now Risk Blaster, Nest Egg Run, a loss in a
   game's opening moments, a screen opened while lost, two losses in a row, and RELOAD).

Checked and found sound by the review: the order of the listeners (three.js's first), the copy (texel for texel: same
size, format, type and encoding, no filtering or tone), nothing throwing while lost, the pictures and shapes three.js
sends again all still in hand, normal play unchanged (the same objects made in the same order; `whenGL` runs at once),
and every input through the guarded handler.

## Not covered here

- The exam: the same paths as the title hall (two kept reflections, its probe and its columns' copy drawn again three
  times over), not forced in the test.
- A real reset of a graphics chip, and Safari on an iPhone taking a page's context back behind another app: the forced
  loss is what the page sees of them, but only the devices can show them. For the owner: on the iPhone, leave the game
  mid-fight for another app for some minutes and come back (the notice for a moment at most, then the fight, paused as
  it was); on the Mac, the console line below forces one.
- What a restore costs on a device: every kept target made again in one go, behind the notice, every sky of the visit
  among them (on a Mac at the MAC tier, the sharper skies' 8K pictures too). How long that takes is not measured here
  (this machine draws in software, and the test's clock is its own).

To force one by hand (Safari's or Chrome's console):
`const x = document.querySelector('#gl').getContext('webgl2').getExtension('WEBGL_lose_context'); x.loseContext();`
then, after a few seconds, `x.restoreContext();`

