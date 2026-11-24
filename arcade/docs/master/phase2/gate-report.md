# Phase 2's gate (the first pass, 2026-11-24)

The gate: no blur, no stretched textures, no overlapping text; budgets kept; stills before and after at the same
moments. The harness on the finished build (`f616d68`, `node arcade/tools/harness.js --name phase2`, the machine quiet:
no agents), then what it found fixed, then an independent review.

## The harness (f616d68)

- **Logic:** the content and the scripts untouched since `ee413e3`; the rules IDENTICAL from disk and served; the screen
  sequence ALL 13 STEPS OK.
- **Stills:** 21 on the phone and 21 on the Mac, every one compared with the baseline's (the same capture, the same
  moments): 17 and 18 changed (the work of this phase); **no text newly overlaps**. Side by side in `sheet-phone.jpg`
  and `sheet-mac.jpg`.
- **Costs:** one fault: Risk Blaster on the phone drew 102 a frame, its budget 100.

### The fault, and its fix

The harness now measures each screen with its files given 8 s more and the drawing left out while it waits (`836b099`),
so a screen is measured as it stands once everything has arrived. The baseline's first figures were taken before that:
measured the same way (`docs/master/baseline/script-*.json`, from the baseline's own build), the baseline drew 102 too.
So the fault was there before the overhaul, hidden by the old measure, not made by this phase. Fixed all the same
(`aa4b86f`): the fighter's eight glows and the demon's small lights drawn in one draw each (`GlowBatch`): 88 at the same
moment, the glows the same in stills of both builds.

While checking it, the stall census (`tools/scenarios/hitches.js`) found one shader made mid-fight in Risk Blaster: the
red frame of the last shield (`BandEdge`, drawn in a scene of its own that the screen's warming never saw), made in the
frame the shields first run low. Also there before (the file is untouched since before the overhaul; Phase 1's census
never ran its shields that low). Fixed: its material is warmed with the screen's (`BandEdge.warmPiece`), in Risk Blaster
and Nest Egg Run (the final census below).

## The final run (phase2-final, 1a0d853)

After the review's fixes (below), the harness again on the finished build: **no fault**. The content and the scripts
untouched since `ee413e3`; the rules IDENTICAL from disk and served (153 answers in 8 games); the screen sequence ALL 13
STEPS OK; 21 stills on each device, no text newly overlapping; every screen's costs inside its budget on both tiers
(below). The report: `docs/master/runs/phase2-final/report.md` (not kept in the repository: `runs/` is a working folder).

**Still running when this was written:** the stall census of every game (`hitches.js`) and every screen drawn in WebKit;
their results are added here when they finish.

## Costs at the end of the first pass

The final run (`phase2-final`, on `1a0d853`: the finished build, after the review's fixes), every screen against the
baseline's own build measured the same way (8 s more for its files). This machine draws in software: draws, triangles,
lights and memory are what a device would see. The final run's script times were taken while other captures ran on
the machine, so they are left out: the times quoted are the quiet run's (`f616d68`, the machine idle; the scripts timed
are the same but for the gate's fixes, which add next to nothing a frame), the script's time a frame with the drawing left
out, over about 180 frames; they compare the two builds, they are not a phone's.

**Phone (the PHONE tier, 440 x 956 at 2x)**: budget 100 draws, 350K triangles, 450 MB. Every screen inside it.

| screen | draws | triangles | lights | memory MB | script ms (max), the quiet run |
|---|---|---|---|---|---|
| title@0.35 | 33 → 33 | 146K → 146K | 4 | 323 → 335 | 0.77 (4.7) → 0.64 (1.2) |
| title@1 | 35 → 35 | 185K → 185K | 4 | 323 → 335 | 0.65 (1.4) → 0.59 (2.7) |
| hub | 41 → 41 | 86K → 86K | 4 | 224 → 224 | 0.73 (2.8) → 0.55 (3.1) |
| blaster | 102 → 90 | 266K → 267K | 5 | 363 → 363 | 1.07 (6.6) → 1.14 (5.2) |
| racer | 92 → 85 | 153K → 139K | 5 | 297 → 299 | 1.19 (5.8) → 0.97 (9.6) |
| boss | 69 → 65 | 108K → 111K | 5 | 250 → 260 | 1.09 (10.4) → 0.87 (3.1) |
| memory | 53 → 53 | 98K → 98K | 4 | 114 → 122 | 0.35 (1.3) → 0.45 (4.4) |
| exam | 83 → 79 | 36K → 57K | 5 | 147 → 153 | 0.61 (6.4) → 0.54 (8) |
| guide | 49 → 49 | 32K → 32K | 3 | 103 → 103 | 0.29 (0.5) → 0.28 (0.6) |

**Mac (the MAC tier, 1470 x 830 at 2x)**: budget 160 draws, 500K triangles, 900 MB. Every screen inside it.

| screen | draws | triangles | lights | memory MB | script ms (max), the quiet run |
|---|---|---|---|---|---|
| title@0.35 | 63 → 63 | 293K → 293K | 4 | 655 → 670 | 0.71 (2.1) → 0.79 (1.8) |
| title@1 | 48 → 48 | 185K → 185K | 4 | 655 → 670 | 0.77 (2.5) → 0.63 (2) |
| hub | 89 → 88 | 312K → 302K | 4 | 572 → 572 | 0.7 (2) → 0.69 (3.7) |
| blaster | 130 → 113 | 253K → 245K | 5 | 787 → 787 | 1.02 (5) → 0.89 (4.9) |
| racer | 148 → 144 | 286K → 303K | 5 | 776 → 777 | 0.96 (11) → 1.04 (10.7) |
| boss | 90 → 84 | 114K → 125K | 5 | 694 → 708 | 0.97 (3.2) → 0.8 (3.8) |
| memory | 90 → 66 | 183K → 98K | 4 | 495 → 486 | 0.4 (1) → 0.33 (1.9) |
| exam | 100 → 97 | 37K → 57K | 5 | 507 → 516 | 0.55 (3) → 0.49 (4.3) |
| guide | 63 → 63 | 32K → 32K | 3 | 466 → 466 | 0.27 (1) → 0.28 (0.8) |

## The independent review

An independent reviewer read Phase 2's code and looked at every still, not told what to find. Its findings and what was
done:

| # | finding | done |
|---|---|---|
| 1 | **After the first explanation the answers stayed hidden and could not be pressed** (Risk Blaster, Nest Egg Run, Boss Rush; live since `f4ce144`): the class that makes them stand back while a sheet is up was never taken off when NEXT dismissed it | fixed and pushed at once (`ca21db2`); reproduced on the old build and checked on the new with a probe that clicks as a player does, in all three games |
| 2 | **Every star showed as earned when served** (`f4ce144` changed the unearned star's colour, the key the drawn icons know it by) | fixed and pushed at once (`ca21db2`): the key restored, the unearned star brightened through CSS; checked with 3, 2 and 1 stars saved |
| 3 | `GlowBatch` drew the Overlord's tall core glow as a round point | the core glow stays a sprite (`ff37119`) |
| 4 | points (light sticks, motes, studs) drawn 10-40 times too big into the room captures | every set of points hidden while a face is drawn (`ff37119`) |
| 5 | `pow()` of a possibly negative base (undefined: NaN on some GPUs) in Phase 2's shaders and older ones; a reversed `smoothstep` | 85 made safe in 25 files; the smoothstep written the right way round (`ff37119`) |
| 6 | the title cells' tread plate did not tilt the surface: the plinth tops stayed a flat pale plane | the tread's relief now bends the tops' normals (`ff37119`) |
| 7a | the phone's cell close-up still had the title's end laid over it (a CSS transition on the real clock) | the scenario waits for it to go (`1a0d853`); retaken in the final run |
| 7b | Risk Blaster's and Nest Egg Run's extra pass and draws against the baseline | the baseline measured the same way has them too: not Phase 2's (see Costs) |
| 8 | the results bar still covers content; the small icons under 20 px | carried to Phase 7 (`MASTER_PLAN.md`) |
| 9 | the reflections do not follow Boss Rush's rage or its moving lights | carried to Phase 5 |
| 10 | a capture's sizes were always read as 128 | read from the capture's own size (`ff37119`) |
| 11 | the box projection: a NaN on an axis of naught, and looking back from outside the box; Boss Rush's box short of its deck | made safe; the box to the deck's edge (`ff37119`) |
| 12 | the cameras' bodies (instances) read the steel's pattern at one place | by instance (`ff37119`) |
| 13 | the title's filter shader made at the first capture, mid-glide; its pictures sent together | made ahead with a black filtered copy; one picture a frame (`ff37119`) |
| 14 | Boss Rush's left rim lamp in the boss's own colour lit its stands | the arena's lead colour (`ff37119`) |
| 15 | a hub laser reads as a line | left (a round beam; the hub is a keep): a halo considered in Phase 5 |

What it checked and found sound: the content and the scripts untouched since `ee413e3`, no rule, scoring or question
code in Phase 2's changes; every derivative and mipmapped look-up outside varying branches; no capture reads itself;
everything new freed when its screen closes; every new picture with a plain stand-in from disk; the lightest tier
keeping 2x MSAA.
