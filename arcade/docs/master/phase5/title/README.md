# The title hall, Phase 5: the prison denser on a Mac (2026-11-24)

From Phase 5's rebuild list: the title hall is a keep, improved in place. What Phase 2 rebuilt (floor, glass, steel,
skylights, windows) and the cells and their bosses (the Proctor just rebuilt) are untouched. What was wrong: on a Mac
the cells' close-ups showed bare dark walls round each cell; at the glide's end the left edge was a dark arch
panorama, the lower half beside the tip was black, and a short tip left its plate's lower third empty.

## What changed

**The walls, on a computer only** (`src/js/10f-titledress.js`; built when `Assets.phone` is false):
- two conduits along both walls above the windows, on brackets; a guard rail along each window's glass;
- in each of the 24 bays between a window and a pillar: the block's plate (its letter A-F on its colour, CELL BLOCK,
  its game), a junction box with its lamps and conduits, a vent grille (one a block breathes steam) and a caged
  warning lamp; or, one bay a block, a security door (hazard frame, barred lit window, keypad) under its warning
  screen (MAXIMUM SECURITY; CONTAINMENT BREACH, red and blinking, while a cell of the block is in alarm);
- a door each side at the hall's door (INTAKE, 12 HELD · 0 ESCAPED) and at the vault (VAULT ACCESS, SECURITY
  CHECKPOINT); hazard paint round every pillar's foot; the block ahead named under each beam (not the last: the logo);
- the moving light: three searchlights in ball turrets under the beams, each patrolling the floor of the block ahead
  (a beam in the haze, a pool of light wandering over the deck); red beacons turning on the pillars either side of a
  block in alarm (the audit's "a red alert with no red light").

How it stays cheap: what stands still goes into the cells' own batches (their steel, lights, plates and screens), so
it adds no draw and no shader; the signs are rows under the cells' rows in their picture (1024 x 2560 on a Mac, was
1024 x 1536). The moving light is one draw whose shader finds where each light points from the time alone (nothing
sent from the script a frame), left out of the floor's reflection, not drawn at SAFE and below; with Reduced effects
the searchlights slow and the beacons hold still. No `Math.random`: variety from a hash of the place, and the dressing
is built on a random stream of its own (three.js draws four numbers for every id; without it the seeded stream moved
and a Mac's title showed another tip). Its pieces go straight into the batches' arrays: the dressing builds in 50 ms
at best on this loaded machine (282 ms through `KitBatch.add`). The wall vents' steam rides the cells' steam draw.
A phone builds none of it.

**The end, on a wide window** (`10d-titlehall.js`, `10-title.js`, `style.css`):
- the exam's left window, the end's left edge, looks through its arch (clouds, the gilt underside), not at its
  dark stone column;
- the tip's plate keeps its height (INSERT COIN never moves) and its heading; its words stand in the middle of the
  room under the heading;
- the dock's shade is a feathered column under the dock, not a band the window's width: the end cells' plinths, their
  screens and the floor's light show beside the card (the hall's title only; the avenue from disk and the phone keep
  their band).

## Costs

The same count as `tools/cost-report.js` (one frame through `GFX.render`, every render call's draws, the scene's own
triangles; the tier fixed as Setup fixes it), taken by a capture scenario on the virtual clock with every piece of the
hall in, the same way for both builds: `cost-report.js` itself timed out loading the page on this machine while other
agents captured (its one finished run, the phone before the change, read 33 draws and 146K triangles at the glide and
34 and 157K at the end, some pieces not yet in; the Mac's before below matches the baseline's 63 and 293K).

| tier | pose | draws before → after | triangles before → after | lights |
|---|---|---|---|---|
| MAC | glide (u 0.35) | 63 → 64 | 292,968 → 306,736 | 4 → 4 |
| MAC | end | 55 → 56 | 171,006 → 184,774 | 4 → 4 |
| PHONE | glide (u 0.35) | 31 → 31 | 109,600 → 109,600 | 4 → 4 |
| PHONE | end | 33 → 33 | 139,078 → 139,078 | 4 → 4 |

Budgets: Mac 160 draws, 500K triangles, 6 lights; phone 100, 350K, 5. The dressing is +13.7K triangles on a Mac
(steel 10.6K, lights 1.7K, the moving light 1.3K, signs 88) and one draw.

## Checks (on a build of `b528014`, the last code commit)

- Rules' regression (`scripts/arcade-regression.js --compare arcade/backup/regression-baseline.json`): IDENTICAL
  (153 answers in 8 games).
- Screen sequence (`scripts/arcade-sequence.js`): ALL 13 STEPS OK, no errors.
- The title's seeded stream: the tip chosen at the title is the same as before the change, on the Mac and the phone.
- The phone's stills: the same pictures (what differs run to run is a boss's idle phase and a stray arc, as before).

## Left as it was, and why

- The phone: lean as it was (the owner's order); its picture of the exam's left window changes only in the glide's
  last seconds, where it is barely in view.
- The end wall beside the vault frame: plain, so the vault (what the glide comes for) reads; on a Mac it lies under
  the logo.
- The cells, the bosses, the floor, the glass, the steel, the skylights: done, untouched.

## The pictures

- `mac-glide-before-after.jpg`: the glide early and half way (the polish scenario's 01, 02).
- `mac-end-before-after.jpg`: the glide's end (03), and the end with the shortest tip set as the title sets one.
- `mac-cells-before-after-1.jpg`, `-2.jpg`: the four cell close-ups (04, 04b, 04c, 04d).
- `phone-before-after.jpg`: the phone's seven stills, before (top) and after (below).
