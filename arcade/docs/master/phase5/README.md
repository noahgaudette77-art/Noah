# Phase 5: environments and new assets (2026-11-24)

Run third, by the owner's order of 2026-11-24 (0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8): every environment
and asset judged keep, improve in place, or rebuild before anything was polished, and nothing on the rebuild list
polished before it was rebuilt. The list, with the evidence for each verdict, is in `MASTER_PLAN.md` (Phase 5): most
environments had been rebuilt by Phase 2's first pass already, so most were a keep; what stayed below the bar was one
character told three ways, Risk Blaster's far rocks, and details.

The gate: every screen consistent; budgets kept; before and after stills at the same moments; the rules untouched.
**See `gate-report.md`** (the harness on the finished build, an independent review and its fixes, the stall census,
every screen in WebKit).

**Spend: nothing.** No provider was called in this phase (Tripo 0 credits of the 145 allowed, fal.ai $0). The owner's
model was not sent anywhere: the Proctor's clips were carried over to it in code.

## What changed in the game

| commit | change | measured |
|---|---|---|
| `bdb43c7`, `345c580` | **The Proctor as one design** (the rebuild list's first item; the audit's #11: three designs of one named character). The machine the owner supplied for the Final Exam is now the Proctor in Boss Rush's last fight, the title hall's twelfth cell, the hub's Boss Rush topper, the exam hall's statue and the menus' portrait, in the exam's own skin, cap, reactor and eyes (`src/js/24f-proctor.js`). Its twelve Boss Rush clips are the old Proctor's, carried over to the machine's own joints by `tools/gen/proctor-rig.mjs` (no provider). The exam's own skin programs byte-identical before and after. Picture: `proctor/proctor-before-after.jpg` | the rig file 0.4 MB (the old Proctor's 1.6 MB); the four old files gone with the build of `345c580` (in git before it); in its title cell 9 draws where the old figure was 2 |
| `aafdd1f`, `bb15556`, `eb0147c`, `447be47` | **Risk Blaster**: the far rocks light copies of the two generated rocks (about 200 triangles each, in the near rocks' own material: they were built-in grey lumps); the C drone's box pods become nacelles; on a Mac's wide window the nebula fills the band (its own centre in the panorama, `atW`) and the giant planet stands in the clear between the demon and the drones (`planetW`; at the phone's place a Mac had it under a drone). The phone's picture as it was. Pictures: `blaster/` | phone draws 90 → 89 |
| `edd526a`, `d845fe3`, `b528014`, `fc35d3f` | **The title hall on a Mac** dressed as a maximum-security block: conduits, rails, block plates, junction boxes, vents with steam, security doors, warning screens that turn red with a cell's alarm, three patrolling searchlights, red beacons; its end on a wide window (the left edge, the tip's plate, the dock's shade). The phone builds none of it. Notes and pictures: `title/` | the dressing one draw on a Mac; the phone builds none of it |
| `fb8140f`, `460f2ca` | **The hub**: the club lasers one mesh with a soft halo (one had read as a hairline); the cabinets' black lower bodies lit (a printed front sheet, a steel kick plate, the coin door lit, side art). Notes and pictures: `hub/` | phone draws 41 → 36, Mac 88 → 84 |
| `0ccfb1f`, `dd39ba6`, `3b0378f` | **Boss Rush's arena**: the crowd sways, cheers a blow and flinches at a strike (one instanced draw, as before; on the show's clock); the deck and the steel give back the boss's rage. Notes and pictures: `arena/` | no draw added |
| `00fb5df`, `a690b65`, `2ed9d1e` | **Memory Bank's gold** cast as stamped bullion, stacked as bullion is, the coins on velvet trays (the audit's #13: "mushy lumps"). Notes and pictures: `memory/` | phone draws 53 → 55 |
| `ee502d2`..`447be47` | **The review's fixes** (eight findings, each a small commit): see `gate-report.md` | |

## What to test on the devices

- **iPhone:** Boss Rush to its last fight (the Proctor: the exam's machine, its seams and eyes lighting as it rages);
  the title hall's twelfth cell; the hub's Boss Rush topper; the Final Exam's ending (the statue). Risk Blaster's
  belt (the far rocks: crystal and ore, not grey lumps). Boss Rush's crowd cheering a blow. Memory Bank's door (the
  bullion, the trays).
- **Mac (Safari and Chrome):** the title hall's walls (the dressing, the searchlights, a block's alarm turning its
  signs red), and the glide's end; Risk Blaster's first region (the nebula side to side, the planet clear of the
  drones); the hub's cabinets and lasers; Boss Rush's deck going red with the rage.
