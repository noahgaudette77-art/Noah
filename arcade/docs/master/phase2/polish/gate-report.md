# Phase 2, resumed: the gate (2026-11-24)

The gate as written: no blur, no stretched textures, no overlapping text; budgets kept; stills before and after at the
same moments; the rules IDENTICAL; an independent review. **Passed.**

## The harness (`tools/harness.js --name phase2-polish`, on the built page `37ee64a`)

- **Logic:** content and scripts untouched since `ee413e3`; the rules' regression IDENTICAL from disk and served (no
  console errors); the screen sequence ALL 13 STEPS OK.
- **Stills:** 21 a device, phone and Mac (`docs/master/runs/phase2-polish/stills/`); **no text overlaps** on either. The
  changes against the Phase 0 baseline are this pass's and the earlier phases'.
- **Costs:** **no fault** on either tier (every screen inside its budget). Against Phase 3's gate run (`ea8e7ca`, the
  same tool):

| screen | phone: draws, triangles | phone: textures, buffers MB | Mac: draws, triangles | Mac: textures, buffers MB |
|---|---|---|---|---|
| title (glide / end) | 33 / 34, 146K / 168K: as before | 284.7, 23.8 → 23.9 | 64 / 56, 307K / 185K: as before | 440, 25.9 → 26.1 |
| hub | 36, 86K: as before | 180.5, 5.9 | 84 → 85 (a laser's moment) | 337.2, 5.9 |
| Risk Blaster | 90 → 91, 270K → 303K * | 306.5, 7.9 | 114 → 99 * | 545.8, 7.9 |
| Nest Egg Run | 71 → 88 * | 246.7, 16.2 → 16.1 | 147 → 131 * | 533.7, 16.1 → 15.9 |
| Boss Rush | 65, 111K: as before | 219.8 → 221.1, 4.3 → 4.4 | 84, 125K: as before | 474.7 → 476.0, 4.3 → 4.4 |
| Memory Bank, exam, guide | as before | as before | as before | as before |

\* Risk Blaster's and Nest Egg Run's draws and triangles follow the traffic at the moment measured (the same build gives
95 to 100 phone draws over seven runs): nothing in this pass adds a draw, a light or a texture there. Script time a
frame is within the machine's noise on every screen (0.16 to 1.2 ms phone, 0.3 to 1.07 ms Mac).

- **Phone drawing cost of the new shading:** see "The phone's drawing cost" below.
- **The final build** (`16ff715`, with the review's fixes; live, the served page the same to the byte): the logic again
  (`docs/master/runs/phase2-polish-fixes`): content and scripts untouched, the rules IDENTICAL from disk and served, the
  sequence ALL 13 STEPS OK, no fault; the title's stills on both devices with the fixes, no errors.

## The independent review

An independent reviewer read the pass's code (`d419b59..HEAD`) and compared every still before and after, not told
what to find. Nothing it found breaks or blanks a screen; every new shader path rendered in the stills. Its findings
and what was done:

| # | finding | done |
|---|---|---|
| 1 | The title cells' brushing tilted the steel up to some ten degrees (the map's step times 175): the junction boxes rippled like water, the near bars read as rust, and it would shimmer where a texel is about a pixel | a quarter of it, faded out below a texel (`7f2b6fc`); checked on both devices: the boxes smooth brushed steel, the bars clean |
| 2 | The cells' grime was a fixed 0.22 m band, so every face shorter than that was grimed over its whole height (the plinths' hazard bands, the bright rings, lips, bolts) | the band a third of the face's height, none under some 0.3 m (`86dd7c4`); the hazard stripes clean, the cap's ring bright again |
| 3 | The caged boss's new key light flared with its cell's rattle (up to 2.2 times): its whole lit front would flash toward white | the key holds steady through a rattle; only the rim flares, as before (`4b9b888`) |
| 4 | The hall's steel could ask smoothstep for two equal edges (fwidth naught on a level face) | floored at 1e-4 (`b473ad9`) |
| 5 | The new steel shading's cost on a phone's graphics chip unmeasured | measured: below |
| 6 | Boss Rush's crowd picture doubled (1.4 to 2.7 MB) and stays resident (by design: made once for the page) | kept: +1.3 MB, inside the budget |
| 7 | Fragile: Boss Rush's face frames would join two pieces side by side facing one way; a cylinder's end found by its middle's uv; the deck's 1024 texels written in | the first fixed (`0278bcf`); the others noted in their code |
| 8 | The library's reading grade made a new array a frame | written in place (`8af3bd5`) |
| stills 3 | The Mac's title end with its logo at a fifth of its strength | the capture's timing (a CSS fade on the real clock under load): taken again, the logo, the coin button and the tip are whole, on the live build and with the fixes |
| stills 4 | On a Mac, Risk Blaster's upper right is deep space behind the B and D drones while the nebula sits left and centre | left as it is (the drones stand clear on it); for the owner: an art call |
| stills 5 | Nest Egg Run's gold shops read tan on a Mac | left (the pair is right: cyan 31% to 6%, orange 4% to 21% in the reviewer's own count) |
| stills 6 | Boss Rush's cyan edge light shows no rim that reads on the Product Pusher | left: it edges a violet-and-cyan arena's boss; on the cyan bosses' arenas the pair is violet and magenta |
| stills 7, 8 | The title deck's middle distance keeps some orange and violet blotches; the Group Golem's head and the Proctor's reactor hollow are borderline against their glass | carried (the Golem's chest now level with its glass: 68 against 62 to 81, was 52 against 74 to 93) |

What it checked and found sound: the content and the scripts untouched; `GFX.hitStop` 18 times before and after, the
exam's two lines unchanged; no rule, question, answer, score or boss health code touched; the game's randomness drawn
exactly as before (the crowd one draw a person, the crack and the wall dressing on their own seeded streams); every
name used in a shader present in three.js r128's chunks; no derivative or mipmapped look-up inside a branch that varies;
every division and normalize guarded; every literal smoothstep ascending; every changed shader with its own program key;
nothing new left undisposed but the crowd's picture; the page from disk unchanged in look (the new terms neutral on
their stand-ins); the vignette exactly as before where no screen asks for a colour; the CSS valid in Safari and Chrome,
the phone's results bar unchanged, the portraits sized by CSS everywhere.

## The phone's drawing cost

(Measured with the machine otherwise idle, `cost-report.js --device phone --only title,boss`, the build before this pass
(`cd141b1`) and the build with the review's fixes, two runs each, alternating: the frame's drawing time in this
machine's software renderer, which runs every shader on the processor, so a costlier pixel shows; compare only.)

| screen | before this pass (`cd141b1`) | after, with the review's fixes | |
|---|---|---|---|
| the title's glide | 1,110 and 1,054 ms | 1,120 and 1,012 ms | the same |
| the title's end | 1,361 and 1,286 ms | 1,387 and 1,224 ms | the same |
| Boss Rush | 837 and 833 ms | 1,027 and 921 ms | see below |

The whole frame wanders with the moment caught (Boss Rush's fight is not the same frame in two runs), so Boss Rush was
measured part by part as well (`--parts`: the frame drawn again without each piece): **the arena's steel 50.4 to
58.7 ms, the crowd 14.9 to 19.4 ms**, some 13 ms of a frame of about 1,000 in this renderer, near 1%, and that pair's
whole frames 1,067 and 953 ms. On the title the cells' new shading costs nothing measurable. **No phone cut needed.**
The phone's own frame time is for the device check (`MASTER_PLAN.md`, Phase 8; the on-device overlay).
