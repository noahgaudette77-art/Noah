# How a mode is reviewed

Every mode is scored by a reviewer who did not build it and is given only this page and a folder of captures.
A mode is done when every axis is at 4.5 or more, or when the builder has run out of real options and says so.

## What the reviewer is given

- A folder of captures made by `tools/capture.js` on the virtual clock (60 frames a second, repeatable).
  - `*.png` / `*.jpg`: single stills at phone size (390 x 844 CSS pixels, 2x).
  - `*.strip.jpg`: a frame sequence, read left to right, top to bottom. The file name or the list beside it says how
    many frames apart the tiles are (for example "every 3" is 20 tiles a second). Stills hide motion problems, so the
    strips are the main evidence for anything that moves.
- This page. Nothing else: not the code, not the builder's notes, not earlier scores.

## The look that was asked for

Retro 1980s/90s synthwave arcade: neon magenta, cyan and violet, glossy wet reflections, chrome, bloom, scanlines.
One coherent world across every mode. Every design is original: nothing may resemble a known character, robot, ship,
vehicle, logo or brand. The game is a study game: a question and four answers are on screen during play, and they
must stay readable through every effect.

## The seven axes (1 to 5, half points allowed)

| Axis | What it measures | 3 | 4 | 4.5 | 5 |
|---|---|---|---|---|---|
| Detail | model and texture resolution, silhouette interest, small parts, no blobs or smears | reads as a placeholder up close | good, a few soft or empty areas | holds up at full size everywhere that matters | could be a hero shot on a store page |
| Lighting | key, fill and rim; the sky lighting the objects; glow that lights its surroundings; contrast | flat or blown out | clear but generic | objects sit in the scene's light, glows light their neighbours | cinematic in every frame |
| Materials | metal, glass, paint, emissive panels; reflections of the sky; roughness variety | plastic or uniform | believable, some uniform areas | chrome reflects, glass glints, emissive reads as light | every surface is distinct and right |
| Depth | layers from near to far, parallax, fog or haze, subject separated from background | flat collage | layered, subject sometimes merges | subject always separates, clear near/mid/far | deep, with atmosphere |
| Motion | (from strips) anticipation, impact, follow-through, timing, weight; nothing pops, stutters or flickers faster than 3 times a second | things teleport or just blink | moves, but stiff or samey | every action has wind-up, hit and settle; hits feel heavy | you can feel it without sound |
| Cohesion | one world: palette, line weight, level of detail, effects and HUD all match | parts from different games | mostly matched, one or two outsiders | everything belongs together | a single authored style |
| Legibility | question, answers, HUD and what is happening are readable at every moment, including mid-effect; right and wrong can be told apart without reading | text or the action is lost for a moment in most effects | readable, one or two bad frames | always readable; effects never cover text | readable in a glance, always |

## What the reviewer writes

1. A table: the seven scores, one line of evidence each (file, tile number).
2. The requirement checklist for the mode (given with the request): each item `met`, `weak` or `missing`, with the
   file that shows it.
3. Defects, most damaging first, at most twelve. Each one: where it shows (file, tile), what is wrong, what would
   fix it. Concrete only: "the left wing tip clips through pod B in tile 4", not "improve polish".
4. Originality: anything that resembles a known character, robot, ship, vehicle or logo.
5. One line: the lowest score and what would raise it.

The reviewer does not soften scores to be kind and does not raise them because a previous round was lower. A 4.5 means
a commercial arcade game would ship it as it is.
