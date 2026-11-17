# Phase 5, the cohesion pass: running status

Worktree branch `worktree-agent-adc026bf8de11a541`, made from `claude/quirky-ride-9frte0` at ecb38c3.
Brief: A traffic, ships and rocks into their games; B one look; C one sound; D load and size; E the calm path; F two
leftovers if time allows. Commit after each step.

## Done

- **A** (commit 0a51826): Nest Egg Run's sedans, trucks and buses are `prop-car`, `prop-van`, `prop-bus` (instanced,
  one geometry and material per model, lacquer per copy, neon strips per copy, working lamps as trims). Risk Blaster's
  freighters (`prop-ship-a`), cruisers and fighters (`prop-ship-b`), drones and shuttles (`prop-ship-c`) and the near
  rocks (`prop-rock`, `prop-rock2`). Tankers, hulks, the whale and the far rocks stay built-in. Shared edit:
  `modelGeometry()` added to `08d-panosky.js`. Regressions blaster and racer IDENTICAL both ways; sequence 13/13.
- **B**: reference Risk Blaster (and the title). Measured every screen's 3D picture (`tools/look-stats.py`): black level
  equal everywhere (0.001 to 0.006); the hall was the darkest screen with the least glow (median 0.035, bloom 0.33,
  threshold 1.38); the exam the least saturated grade (1.06) under the heaviest vignette (1.45); Memory Bank the
  hottest exposure (1.2); the Guide the lightest vignette (0.6). Each brought in where its screen sets its grade:
  hall exposure 1.22, bloom 0.55, threshold 1.16, saturation 1.18, vignette 0.95; Memory Bank exposure 1.12, split 0.2;
  exam exposure 0.97, saturation 1.14, vignette 1.25 (+ its dread), split 0.2; Guide vignette 0.9, saturation 1.2. No
  shared-file edit. Regressions memory and exam IDENTICAL; sequence 13/13.

- **C**: measured in EBU R128 loudness with `python3 arcade/tools/audio-levels.py --mix` (added: music integrated over
  its loop; effects and announcer lines by their loudest 400 ms; every level taken through the cue's volume, the mix
  table and its bus; then each screen's worst moment through a model of the limiter). Fixed with `Sound.MIX` in
  `02-sound.js` (shared-file edit: a table, applied where sprites and tracks are loaded): per-track gains (Memory Bank
  +4.3 dB, Risk Blaster -0.8, the exam -0.6, the rest within 0.5 dB), per-set gains (Nest Egg Run's effects -1.7 dB,
  Boss Rush's roars -1.9 dB). No file re-encoded. The one bad file, the "Boss Rush!" line cut off at 0.21 s at its
  source, was retaken by the lead (merged at 6064d6c): it now measures -8.8, inside the announcer's range.

- **D**: the hall's set 6.93 MB -> 3.55 MB: its six toppers and the cup, medal, coin and stand re-processed with 512 px
  maps (the vault 512 px with a 1024 px colour map; the cabinet, seen large, kept); its two panoramas, used only for
  light and the floor's softest reflection (sampled 3.5 levels down), made 1024 x 512 (0.75 -> 0.08 MB each). Checked
  in the hall: no visible change. A session (title, hall, every game and room, the Guide) fetches 59 files, 41.8 MB,
  none of them twice. A game's files now start on their way at its stage select (and the boss of a Boss Rush stage at
  its briefing): `Assets.prefetch(set, extra)` (03b-assets.js), called in `showSelect`, `showExamSetup` (12-select.js)
  and `startGame` (19-quizgame.js); nothing waits for them there. GPU memory: the hall is still kept while you play
  (coming back is instant), but now lets its textures and buffers go from the chip while away (`GFX.rest`, called by
  `Scenes.set`, 04-gfx.js; sent back by the warm-up behind the change of screen): about 182 MB of textures held under a
  game before, 7.7 MB now (its render targets and programs). And `disposeTree` (04-gfx.js) now lets a model's glow,
  relief and finish maps go with its scene, not only its colour map: Boss Rush's boss left about 60 MB on the chip at
  every visit; the renderer's count no longer grows visit by visit. Full regression IDENTICAL from disk and over
  HTTP; sequence 13/13.

- **E**: the calm path captured with Setup > Reduced effects on and the browser asking for reduced motion (the capture
  tool takes `--reduced` now, so the page's REDUCED_MOTION is on too): each game with a question up and the hall. All
  finished, every text readable, nothing missing. Flashes counted on a right and on a wrong answer in each game
  (`tools/scenarios/cohesion-calm.js`: the band in a 4 x 4 grid, sampled 20 times a second for a second and a half; a
  flash is a pair of opposite changes of 0.1 or more in a cell's relative luminance, the darker under 0.8, as WCAG
  counts them): the most in any second, in any cell: Risk Blaster 0 and 0, Nest Egg Run 0 and 2, Boss Rush 1 and 1.
  Nothing over three; nothing needed fixing.
- **F**: Risk Blaster: as the demon comes close it carries its tail further back and a little aside, so it no longer
  crosses the fighter's canopy (20k-blasteroverlord.js, the tail's pose only). Nest Egg Run: the tunnel's way out shows,
  through its mouth, the very sky the dome will show beyond it and the road running on under it (dark, its lanes and
  neon edges lit, into the haze), where it was a flat pale board of the sky's colour (21c-racerworld.js).

- **Final** (on the last build): full regression from disk IDENTICAL, full regression over HTTP with every asset loaded
  IDENTICAL, sequence 13 of 13, no console errors in any capture. Captures 01 to 17 and their list in `README.md`.

## The review's fix round

1. Open space: the generated ships and rocks are lit as objects (the region's rims at 0.85, a cool rim from above and
   behind, a fill of the region's light eased toward a cool grey, brighter albedo and mirror); the rocks' crystals and
   veins glow (3.6), each near rock has a stone of its own (warm, slate, basalt, pale) and more varied size and spin;
   the built-in far rocks are eased from the region's maroon toward a neutral stone and kept small; the belt's sky is
   brighter (gain 0.72 -> 0.9).
2. The tunnel's way out: the glare grows over the 0.7 s before the mouth and clears over 0.9 s after it (it masks
   the change of scene: no one-step jump), at most 0.62 of the next sky's haze colour, not white. It now lies over the
   mouth too: it had been sorted under the mouth's group (three.js orders by group first), so the way out showed as a
   sharp picture in a pale frame. Through the mouth the road runs on with its rails and lamp posts under the next sky.
   The strip's frame means, 0.15 s apart: 43, 48, 50, 47, 54, 79, 103, 114, 120, 118, 108, 97 of 255 (the review
   measured 59 -> 119 in one step); the largest step is 24.
3. The lane badges: a car that comes under one on the screen while a gate is up slips away (0.25 s) and comes back
   when clear (look only; the badges are unchanged).
4. The fighters' trails are short and cyan-white; every generated ship carries running lights (magenta to port, cyan
   to starboard, white aft, blinking under once a second).
5. Nest Egg Run's city: its windows are a picture made in code (`windowGridTexture`, 08-fx.js), drawn with its
   smaller copies, so far walls show their windows' average light instead of noise; the skyline uses it too.
6. Boss Rush's crowd: lit cut-out figures (heads and shoulders, arms up, a cap, a pair) in place of boxes and stick
   arms, rimmed in the house colour, still bobbing and jumping at a blow.
- Minor: the Guide's rows show the bosses' 3D busts; the examiner's chest mask reaches the whole hollow; the tail bar's
  corner markers glow dim amber, never black; every strip's frame spacing is in the README.
- Phones: a texture cap (Assets.phone, 03b-assets.js): on a phone no model or sky picture larger than 2048 px reaches
  the graphics chip (`#phone` in the address, or the capture tool's `--phone`, forces it for tests). Measured with
  `gpu-mem.js --phone`: Risk Blaster 435 -> 235 MB of textures, Boss Rush 204 -> 116 MB; desktop and disk unchanged.
  (A first version failed every model on a phone: r128's textures have no userData. Caught by the phone check, fixed.)
  The five space props and three traffic props re-processed at 512 px (3.0 -> 1.9 MB). Every screen's set measured
  (README).
- Measured after the round: open space (07) mean brightness 11.6 -> 16.2 of 255, mid-fight (09) 42.7 -> 53.5.
- Captures made again, one at a time: 02, 04 to 09, 13, 17 and a new 18 (the crowd).
- **Final, after the round** (on the last build): full regression from disk IDENTICAL, over HTTP with every asset
  loaded IDENTICAL and no console errors, sequence 13 of 13.

## Measurements

### B, the look of each screen's 3D picture (luminance 0..1; sat: mean saturation of the lit pixels)

| screen | black before | after | median before | after | 98th pct before | after | sat before | after |
|---|---|---|---|---|---|---|---|---|
| Risk Blaster | 0.003 | 0.003 | 0.087 | 0.087 | 0.847 | 0.847 | 0.730 | 0.730 |
| Nest Egg Run | 0.004 | 0.004 | 0.091 | 0.091 | 0.898 | 0.898 | 0.559 | 0.559 |
| Boss Rush | 0.001 | 0.001 | 0.065 | 0.065 | 0.838 | 0.838 | 0.719 | 0.719 |
| title | 0.006 | 0.006 | 0.174 | 0.174 | 0.815 | 0.815 | 0.588 | 0.588 |
| hall | 0.001 | 0.001 | 0.035 | 0.048 | 0.756 | 0.801 | 0.601 | 0.598 |
| Memory Bank | 0.005 | 0.004 | 0.104 | 0.089 | 0.807 | 0.799 | 0.646 | 0.659 |
| Final Exam | 0.004 | 0.004 | 0.161 | 0.136 | 0.816 | 0.812 | 0.581 | 0.622 |
| Strategy Guide | 0.004 | 0.004 | 0.072 | 0.070 | 0.788 | 0.787 | 0.596 | 0.591 |

### C, the mix (LUFS at the mix, before the master gain and the limiter; music on the calm bus, +2.3 dB at a full streak)

| layer | before | after |
|---|---|---|
| music, each track's integrated loudness | -20.7 (Risk Blaster) to -25.8 (Memory Bank): 5.1 dB apart | -21.4 to -21.5 for all nine |
| effects, each set's main events (75th percentile of its cues' loudest 400 ms) | core -14.7, combat -15.5, Nest Egg Run -12.8, Boss Rush's roars -12.7: +6.0 to +8.8 dB over the music | -14.7, -15.5, -14.5, -14.7: +6.0 to +7.0 dB over the music |
| announcer, its lines' loudest 400 ms | median -9.6, "Boss Rush!" -20.4 (cut off) | median -9.5 (-12.6 to -7.3), "Boss Rush!" -8.8: about 12 dB over the music, 5 over the effects |
| worst moment on a screen (its loudest blast, the loudest line and its music ducked to 0.4 under the line, all peaks in phase) | +1.1 dBFS into the limiter, -1.5 dBFS out | +1.0 to +1.6 dBFS into the limiter, -1.5 to -1.6 dBFS out: nothing clips |

### D, what a phone downloads

The page: `index.html` 6.28 MB, 3.06 MB with gzip (2.74 MB with brotli). Of it: the built-in fallback models and
pictures for a page opened from disk 3.30 MB (2.17 MB gzipped), the code 2.01 MB (0.62), the course 0.81 MB (0.22),
the style 0.16 MB. (three.js r128 comes from the CDN.) Each screen's set (`03a-files.js`; sound is shared and fetched
once a session):

| set | before | after | of which models, skies, pictures (what the screen waits for) |
|---|---|---|---|
| title | 4.50 MB | 4.50 MB | 0.65 MB (the title waits for nothing) |
| hall | 6.93 MB | **3.55 MB** | 3.55 MB (fetched while the title is up) |
| hall's sound | 4.05 MB | 4.05 MB | never waited for |
| Memory Bank | 5.55 MB | 5.11 MB | 1.09 MB |
| Final Exam | 6.10 MB | 5.91 MB | 0.93 MB |
| Strategy Guide | 3.76 MB | 3.56 MB | 0.95 MB |
| Risk Blaster | 13.79 MB | 15.72 MB | 10.70 MB (+1.9 MB: the five generated ships and rocks) |
| Nest Egg Run | 8.57 MB | 9.43 MB | 5.27 MB (+0.9 MB: the car, the van, the bus) |
| Boss Rush | 9.00 MB + its boss (2.6 to 4.2 MB) | same | 1.51 MB + the boss |

A whole session, title to Guide through every game: 41.8 MB in 59 fetches, nothing fetched twice
(`tools/scenarios/loads.js`). Textures on the graphics chip (`tools/scenarios/gpu-mem.js`, estimated with their smaller
copies): the hall 182 MB while it is up; under a game it held all of it before, 7.7 MB now. Risk Blaster's own is
about 435 MB (its three 4K skies and the 2K maps of the fighter and the demon), Boss Rush about 204 MB.
