# Phase 2: image quality, first pass (2026-11-23 to 24)

**A first pass, closed by the owner's new order (2026-11-24):** the phases now run 0, 1, 5, 3, 2, 4, 6, 7, a
performance re-check, 8, and nothing that will be rebuilt is polished before it is. Phase 2 had gone ahead of that
order; everything it shipped stays (all of it live and checked), and its polishing resumes after Phase 3, on what
Phases 5 and 3 leave final (`MASTER_PLAN.md`, Phase 2).

The gate: no blur, no stretched textures, no overlapping text; budgets kept; stills before and after at the same
moments. **Passed: see `gate-report.md`** (the harness on the finished build, against the baseline; an independent
review; the stall census; every screen in WebKit).

## What changed in the game

| commit | change | measured |
|---|---|---|
| `21c7dbc` | `ART_BIBLE.md` and its reference sheet (`docs/art/`): the look every screen keeps (each neon's job, the worlds' pairs, light, materials, type, motion) | fal.ai Seedream 5.5, 10 pictures, $0.30 |
| `0138cc2` | No FXAA on any tier: the governor's last step (LIGHTEST) keeps 2x multisampling; the FXAA shader is gone | the soft last step is sharp; one pass fewer |
| `f4ce144` | Interface faults: the answers stand back while an explanation is up (the Mac's sheet showed cards cut off either side of it); TAP TO ENTER on a backing of its own; the menus' backdrop darker; the stars larger | |
| `eeedda6` | The title hall's floor, glass and steel: the hall drawn once into a cube (`roomProbe`) and given back by a polished steel deck (box-projected: each cell's colour lies under it), the cells' glass reflecting by Fresnel, the steel brushed, the plinths tread plate (CC0) | phone: draws and triangles as they were, textures +11 MB (358 MB in all) |
| `21d6556` | The title's skylights for its two interior worlds (night skies in their pairs, not crops of interiors that read as smears); the side windows dimmer | fal.ai Seedream, $0.06 |
| `a2c64b8`, `d699efc` | Memory Bank's vault room (a reflective deck, a wall of brushed-steel boxes, bevelled gold, the shared violet-black); on a Mac the room spans the window and the card stands in a column | Mac: draws 90 to 66, triangles 183K to 98K, memory 496 to 487 MB |
| `4353a9f` | The hub's lasers: beams, not one-pixel scratches | |
| `5184d81` | The title's end on a wide window: the logo held to a quarter of the window's height, so the vault door shows whole | |
| `a9964e1` | A cracked cell's glass reads as cracked glass (thin lines, a spider's web, true proportions), not chalk scribbles over the Proctor | |
| `adeaa59` | The Strategy Guide's far shelves read as books: runs of six, sets bound alike; far off each run's average, then all the books' average (measured, not guessed) | the near books drawn as before |
| `8cea8b2` | The Mac's interface: Risk Blaster's fades kept under their panels (they ruled dark lines across the open nebula); stage tiles that never widen past their edge; a page's count clear of its corner; trophies three across | the phone unchanged |
| `e4c9ff6`..`4c3cee6` | Boss Rush's arena: a polished deck from a capture of the arena, octagonal steel pillars with violet and cyan inlays and banners, painted stands, a lit crowd, every boss on the violet-black with the arena's own pair, not its own colour | phone: draws 69 to 65, triangles 108K to 111K, memory 254 to 265 MB |
| `c0e84e5`..`53e5f42` | The Final Exam: the Proctor lit and readable (a key that always keeps its light; the blocky static on its armour gone, three causes found), a real mortarboard (2 draws, was 9), fluted marble columns with neon, a painted wall, a reflective marble floor from a capture (the mirror gone), the framing on both devices | phone: draws 85 to 79, triangles 37K to 57K, memory 150 to 156 MB |
| `c0ee1c2`..`611fa47`, `55b5a76` | Nest Egg Run's street: the far end clean behind the answers; the near facades stained concrete with framed windows, sills, shops, air conditioners; the shoulders lit wet pavement giving back the neon; every shader safe on every GPU | see the gate's costs |
| `aa4b86f`, `ca21db2`, `ff37119`, `1a0d853`, `1cc89d2` | The gate's fixes: Risk Blaster's small glows in one draw each (`GlowBatch`); two live faults the review found (answers left hidden after an explanation; every star shown earned), fixed and pushed at once; the review's rendering findings (shaders safe on every GPU, the room captures' points, the title's filter made ahead, the tread plate's relief on the plinth tops) | Risk Blaster's phone draws 102 → 90 |

The tools: stills the same run after run (`922a37f`; the baseline's and Phase 1's taken again with it, `da08f57`), and
`tools/scenarios/exam-motion.js` written for Phase 3 (`383ee06`).

## Before and after

- `sheet-phone.jpg`, `sheet-mac.jpg`: every screen of the baseline (`89cfb56`) beside the same screen at the end of
  Phase 2, both taken with the same capture (the same moments; Risk Blaster and Nest Egg Run still draw different
  questions run to run, so compare their scenes).
- Each area's own sheet, made where its work was done: `memory-bank-before-after.jpg`, `boss-arena-before-after.jpg`,
  `exam-before-after.jpg`, `racer-before-after.jpg`.

## Spend

fal.ai $0.36 in Phase 2 (the art bible's sheet $0.30, two skylights $0.06); the five CC0 materials (Poly Haven, ambientCG)
cost nothing (`ASSETS.md`, "Materials"). Nothing else was paid for.

## What was left, and where it went

- Phase 5 (environments and new assets, now): the Proctor's three designs (its cell, Boss Rush, the chapter picture: one
  design since `bdb43c7`, the owner's machine); Risk Blaster's asteroids, drones and planet (`aafdd1f`); the hub's
  cabinet bases and lasers; the title end's left edge and fact card; the arena's crowd and its rage in the reflection.
- Phase 3 (characters in motion): the Proctor standing still through much of its fall, the wizard's matte look beside
  the chrome bosses.
- Phase 4 (feel): Risk Blaster on a Mac, while an explanation is up, lifts the picture and the demon's head goes under
  the question.
- Phase 7 (the Mac): the results bar over its content and the small icons; Nest Egg Run's car draws pale in this
  machine's WebKit (before the overhaul as after): to check on a real Safari.
