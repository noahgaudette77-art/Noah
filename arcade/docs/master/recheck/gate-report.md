# The performance re-check's gate (2026-11-25)

What the plan asks of it (`MASTER_PLAN.md`): every screen measured again on both tiers against Phase 1's budgets and the
baseline; the census (stalls, garbage, page changes); memory over cycles; the governor in both engines; whatever a later
phase cost, put right before Phase 8. With it, as every phase: the harness, the content and the scripts untouched, and
an independent review of the code. This machine draws in software: its times compare builds, never a device's.

## Every screen on both tiers (the harness, `docs/master/runs/recheck-final`)

`node arcade/tools/harness.js --name recheck-final` on the page with the re-check's changes (`e041f16`): **no fault.**
The rules' regression IDENTICAL from disk and served; the content and the scripts untouched since `ee413e3`; the screen
sequence ALL 13 STEPS OK; the stills, 21 a tier, no text over text on either. Every screen inside its budget at the
moment measured; against Phase 7's run (`phase7-final`), the same moments:

| | phone draws | phone triangles | phone MB | Mac draws | Mac triangles | Mac MB |
|---|---|---|---|---|---|---|
| the title (glide / end) | 33 / 34 | 146K / 168K | 349 | 64 / 56 | 307K / 185K | 690 |
| the hall | 36 | 86K | 227 | 84 | 307K | 576 |
| Risk Blaster | 88 to 90 | **244K to 197K** | 370 | 97 to 114 | 255K to 267K | 795 |
| Nest Egg Run | 74 to 92 | 132K to 154K | 315 | 142 to 143 | 306K | 793 |
| Boss Rush | 65 | 111K | 267 | 84 to 83 | 125K | 714 |
| Memory Bank | 55 | 106K | 123 | 68 | 106K | 487 |
| the exam | **79 to 74** | 57K | 157 | **98 to 93** | 57K | 520 |
| the guide | 49 | 32K | 104 | 63 | 32K | 467 |

(The exam five draws fewer on both: the Proctor's reactor. Risk Blaster's phone triangles: the lighter copies. Risk
Blaster's and Nest Egg Run's draws at one moment follow the traffic in view: `README.md` (c) counts them at many.)

## Many moments, not one (`tools/scenarios/draws.js`)

`README.md` (c): the medians inside the budgets on both tiers; at its busiest Risk Blaster asks a phone for 118-119
draws (the budget "near 100") and Nest Egg Run a Mac for 169 (160) and 502K triangles (500K). Risk Blaster's phone
triangles at its busiest, 438K before the phone's lighter copies, 294K after (350K).

## The census (stalls, garbage, page changes: `tools/scenarios/hitches.js`)

Left for the final build, where it is run once (`tools/scenarios/hitches.js` on a phone's page: the re-check's changes
to what a phone draws are the lighter copies alone, and the Mac's richer tier changes nothing a phone draws). Its first
screen, the title, run on the re-check's page before it was stopped to leave the machine to the Mac's measurements:
1500 frames of the glide, the 10 shaders made all the arriving bosses' own, readied off screen ("not in the scene",
`GFX.prepare`), as Phase 1 made them; 10.4 KB of garbage a frame; no page changes.

## Memory over cycles (`tools/scenarios/cycles.js`, and the soak)

`tools/scenarios/cycles.js` on a phone's page, every screen three times over: after the first round (which takes in what
is kept: the files, every shader once), the graphics chip holds 68 textures and 44 geometries at the end of rounds 2 and
3, the page 217 elements: nothing piles up. The soak's snapshots (`README.md` (a)): the parked materials keep 0.01 MB
of a closed screen, the heap at a round's end 23.0 MB (27.2 before).

## The governor, in both engines (`tools/governor-test.js`)

56 checks, all passing, in Chromium and in WebKit.

## The independent review

One reviewer read the re-check's code (`git diff d6a4e91..` over `arcade/src`, `tools/gen/phone-lod.mjs`,
`tools/manifest.js`) without running the game (the harness was measuring), and checked what it could with numbers:
every phone copy's vertices against the full model's (positions within 6e-5, normals the same, picture coordinates the
same), the merged reactor rebuilt both ways with the page's own three.js (all 624 corners within 7e-9 of the six meshes').
**It found no regression.** Its notes, the most severe first, and what was done:

| # | finding | done |
|---|---|---|
| 1 | **Medium, for the seeded captures only.** three.js draws an id for each mesh and shape it makes, four numbers from the randomness each: the merged reactor makes 16 fewer draws as the exam is built, and a phone's lighter copies 20 more as Risk Blaster is, so in the capture tool's seeded runs what is drawn after them comes out otherwise (on a phone, Risk Blaster's questions too). The rules (their own stream) and the exam's questions (drawn before) are not touched | `deef476`: a phone's copies made in a randomness of their own (`ownRandom`, as the Proctor's dress is), so a phone's seeded runs are as they were; the exam's change noted where it is made, as Phase 5 noted the crowd's |
| 2 | **Latent.** `phone-lod.mjs` turned the normals by the node's matrix, right only for a scale the same on every axis (these five nodes' are: 0.499) | `deef476`: by the inverse transpose; the five files made again are the same to the byte |
| 3 | **Cosmetic.** A phone's running lights are placed from the lighter copy: the first ship's fin tip is 0.017 lower in it, its tail lamp a hundredth of the ship's length lower | left: under a pixel at a phone's size |
| note | The reflections' dispose hooks: `makeEnvMap`'s held only the target already; the gain is in the two regions' reflections (`20i`, `21d`), whose builders' other closures had held their little scenes | recorded |

Found fine: every moved shader line the same text (whitespace aside), the same uniforms and cache keys, created at the
same point (the randomness's order); no closure left in those functions stored on anything that lives on; every
`onBeforeCompile` now made in a function of its own; a raw file let go only after a decode succeeds, nothing asking for
one again (and if anything did, it would be fetched again, not fail); the merged reactor's geometry, its disposal, the
hit-stop lines byte-identical; the copies fitted as the full models, in their material with the attributes its shader
reads, a Mac never fetching or using them, the escort's and the far rocks' kits as before; the file list changed only
by the five files.

## Verdict

**The re-check passes.** What the later phases cost and the phases had left for it is put right or weighed and
recorded: the parked materials' 9.4 MB let go, the raw files' 17 MB on a phone let go, the Proctor five draws lighter,
Risk Blaster's phone triangles at their busiest inside the budget (438K to 294K), the governor passing in both engines,
memory level over cycles, the harness without fault. Recorded to watch on the devices (the arbiter this machine cannot
be): Risk Blaster's phone draws at its busiest moments (118-119; its median 94-95 inside the budget) and Nest Egg Run's on
a Mac (169 and 502K triangles; its median 148 and 374K). Next, by the owner's order of 2026-11-25: the Mac's richer tier,
then Phase 8.
