# Phase 2, resumed: polish on what Phases 5 and 3 left final (2026-11-24)

Run after Phase 3, by the owner's order of 2026-11-24 (0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8): Phase 2's
first pass (`../README.md`) was closed when that order came, and its polishing resumed here, on the environments and
assets Phase 5 rebuilt and the characters Phase 3 animated. First the smoothstep safety sweep (48 calls in 16 files,
pixel-neutral: `MASTER_PLAN.md`); then an independent art review of every screen's stills on both devices (14 findings,
worst first), and its findings fixed, a small commit each. Three screens' packages were made in parallel, each in its
own worktree (the title hall, Boss Rush's arena, Risk Blaster), read and merged here; the smaller findings were done
directly.

**The gate: see `gate-report.md`.** **Spend: nothing** (no provider called).

## What changed in the game

| commit | change | measured |
|---|---|---|
| `3d64474` | **The hub's toppers** lit by their cabinets' marquees (a rim in the marquee's colour): the ship read as a dark shape on its cabinet | the ship cyan-edged, the rig gold, the Proctor lighter. `hub-toppers-before-after.jpg` |
| `6989df8` | **The guide's chapter banner** violet, not grey: the library behind a chapter's title was graded to a saturation of 0.12 after a violet tint, so the tint was lost | `guide-banner-before-after.jpg` |
| `a3f3ac2` | **The results bar's glow** under its first button on a wide window: on a Mac the row is held to 860 px in the middle and the glow lay left of PLAY AGAIN as a teal band | the band gone; a phone's unchanged. `results-before-after.jpg` |
| `108cde4` | **An earned cup is gold** (the model's cup is chrome: it read as a grey cup beside the gold coins) in the reward row and the BEST EXAM and HIGH SCORE RANK tiles | `results-before-after.jpg` |
| `3b9400b` | **Boss portraits** drawn at their strip's own 192 px (they were drawn at 128 and shown 82 points across: drawn up twice over on a 3x phone) | the same layout (every portrait canvas has a set size) |
| `996ccd1` | **Memory Bank's right-hand deck and coins**: out of the deal deck's lamp the dark pile read as a black blob (28, 5, 12) and the tray's coins brown (71, 31, 10). The pile's backs mirror the vault and its magenta edges glow at rest; the coins lifted and a shade paler. No light added | `memory-before-after.jpg` |
| `1c186eb` | **Nest Egg Run in its world's pair, orange and magenta**: the cyan side of the avenue (its lamps, the light on its facades, its strip, the road's edges, a third of the shops, the neon works) is orange, the road's edges amber, the teal shops gold | cyan 29 to 36% of the lit picture on a Mac to 4 to 6%; orange 3% to 21 to 24%; magenta 9 to 11% to 15 to 17% (`tools/hues.py`, two runs each). `racer-before-after.jpg` |
| `35e28aa` | **The Final Exam's Proctor lit from the front in ice blue** (the key, the face light and the low fill; violet stays behind it): it read violet on violet | its part of the frame 45% blue and 29% violet to 52% and 25%. `exam-before-after.jpg` |
| `8855c1b`, `f593c95` | **Boss Rush's arena steel worked**: each face of the pillars and stands was one flat violet tone. Each face now has its own frame (made once from the arena's geometry): a pillar in plates with seams and worn bevels, its reflection sweeping across each; the stands in tiles, one in five a vent, one in seven a small light; grime, streaks, the neon's light on the steel beside it (red as the boss rages). One draw as before, no texture | phone 65 draws, 111K triangles, 5 lights as before; buffers +0.1 MB. `arena-pillar-before-after.jpg` |
| `e523847` | **Boss Rush's crowd lit as bodies**, not flat cards: lit from above and from its lamps' side, its rim brightest there; sixteen figures for eight (five signs lettered GO!, a heart, a star, ZAP, 1UP; three new people; badges, wristbands and phones lit). Still one instanced draw; its sway, cheer and flinch unchanged; one random draw a figure as before | textures +1.3 MB (the figures' picture 4096 x 128). `arena-crowd-before-after.jpg` |
| `66bba52` | **Boss Rush's cold edge light in cyan** (the world's second colour), lower and stronger, half red as the boss rages; no new light | cyan glints along a boss's contours (the Perilmonger's arena 3.0 to 3.6% cyan) |
| `6299991`, `6c482eb` | **Risk Blaster's sky on a wide window led by violet, not magenta** (magenta is answer B's colour; the Mac's band was half magenta where the phone's is violet): the nebula's point ahead moved (the B drone on dark sky), and the panorama's magenta drawn toward violet on a wide window only (the nebula and the orbit) | Mac band magenta 30.1% to 3.9%, violet 33.2% to 55.2% (the same frame); the phone's stills unchanged to the pixel. `blaster-mac-before-after.jpg` |
| `9239db3` | **Risk Blaster's far rocks lit** from the picture's bright side past some 55 units (they read as hollow rings: a dark hole in a pale rim) | `blaster-far-rocks-before-after.jpg` |
| `9bb1973` | **The brood at the band's edges** (the Overlord's small demons, not ships) as silhouettes with a soft lit edge, not a scatter of lit facets | `blaster-brood-before-after.jpg` |
| `5226259` | **Far traffic fades to its running lights** past 100 units (its hull's light to a quarter by 320; its lamps and ports as they were) | |
| `952136d`, `b081fb7` | **The title cells' steel** chamfered (worn bright, angled out, fading with distance so they never crawl), brushed, grimed at the foot and mottled; each corner's place on its face kept in a byte | phone buffers +0.1 MB. `title-cells-before-after.jpg` |
| `e8cde70` | **The caged bosses lead their cells**: the glass's far side at 0.4 of the near side's light, bright tints (gold, orange, yellow, lime, cyan) brought down, a key from each cell's cap lamp | the Group Golem's chest (luminance) about 16 against its glass's 54 before, 44 to 49 against 43 after |
| `83cd9f3` | **The title hall's deck read at the pixel's size**: its relief finer than a pixel broke the reflection into a crawling speckle far off; the plates' seams stay (an opt-in of the neon floor: other floors untouched) | |
| `c29f2d8` | **The title hall's walls deep violet panels** (seams, the floor's cyan and the cornice's magenta washed up and down them, a violet strip at 3.3 m), the room's steel never black, the vignette toward the art bible's void (#090320, a new post option: black unless a screen asks) | walls about (3, 3, 3) to (20, 3, 57) against the target #140a38. `title-glide-before-after.jpg` |
| `4df60e9` | **The Proctor's cell crack** starts from a lower corner: it ran across the Proctor's face and chest | `title-crack-before-after.jpg` |

Tools added: `tools/hues.py` (a still's lit pixels by family of hue), `tools/scenarios/arena-look.js` and
`tools/scenarios/title-look.js` (close looks at Boss Rush's arena and the title hall, held views on one clock).

## Considered and left

- **Menu backdrops (the review's finding 11):** over the arcade floor the menus' glass is already deep violet; the grey
  the review saw came from the library's monochrome grade behind those stills (the stills' order), fixed with the
  banner.
- **The wizard's rim in cyan:** a stronger, more saturated rim on the wizard changes nothing measurable (the lens sees
  it from behind; its red cloth takes no cyan light); it keeps its cyan trims.
- **The title cells' glass keeps its world's colour** (by design); a tint by the world's pair is a design change left
  for the owner.
- **Carried to Phase 7:** icons of 20 px or more (the stars on chapter select, the tiles' emblems), a 384 px portrait
  strip for 3x phones, the results bar. **Carried to Phase 4:** the Mac's Risk Blaster explanation over the demon (#9).

## Measuring note

The racer's, the exam's and Boss Rush's stills differ from run to run on this machine (the question, the traffic, a
boss's pose), even between two runs of one build: their befores and afters are compared as pictures, and colour shares
over two runs each. The phone's and the title's stills repeat to the pixel.
