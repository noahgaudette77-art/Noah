# Memory Bank: the gold at the vault door (Phase 5, improve in place)

The rebuild list's verdict for Memory Bank was keep (Phase 2 rebuilt its wall and floor), improve in place: the gold
bars at the door were blocky (the audit's #13: "gold bars and trays at the door are mushy lumps"); the work, bevelled
bars and the coins' trays. Nothing else in the vault changed: the door, the wall, the floor, the cards, the deck holders
and the page are as they were.

## What changed (`src/js/23-memory.js`, `src/js/23b-memoryworks.js`)

- **The bar** (`memoryIngotGeometry`): a cast ingot, 400 triangles, indexed, the old bar's size (so every stack's
  spacing holds). A trapezoid drawn in on every side, every edge rounded with normals that turn through it (the top's
  edges on a wide radius, the foot's on a small one, the upright corners between), so a highlight runs along each edge
  in any light; the broad faces very slightly full (their normals lean out toward their edges), so each face carries a
  sweep of the room's reflection; a panel sunk in the top with a bevelled edge. Phase 2's bar was flat facets with a
  sliver of bevel (44 triangles), and at the door it read as blocks of one orange.
- **The stamp** (`memoryStampTexture`): the assay's marks struck into the panel as relief (a 512 x 128 canvas drawn once,
  a bump map): a border, 999.9, FINE GOLD, a bar number, the arcade's egg in an oval at each end. Not on a phone, where a
  bar is a few dozen pixels long (no texture there, and a cheaper shader).
- **The gold**: polished (roughness 0.21 to 0.15, the hammered grain of `surfaceDetail` turned down to fine scratches),
  still the vault's own reflection (the `vault-gold` panorama served; the light strips from disk) and its lamps.
- **The heaps** in the lower corners: ten bars each, laid side by side and nested a course on a course (4, 3, 2, 1) as
  bullion is stacked, turned so the lens sees their long faces and their ends both, stood a little out so the deck at
  the plinth's end no longer hides their foot. They were six bars end to end in a wall of three, two and one, long
  faces square to the lens. The heaps' glints now fall on the pyramid's stepped face (they fell inside it).
- **The coins' trays** (`MEMORY_TRAY`, `memoryTrayGeometry`, `memoryPropMaterial`): a brass tray rolled at the lip
  round a bed of violet velvet (gold's complement), shaded along the rim, before each heap; one mesh and one draw a tray
  (each vertex carries its metalness, roughness and sheen). The coins stand on it in five neat stacks, the size of a
  coin at the end of its flight (they were half as large again and spilt on the floor); they still rise a coin for
  every card banked, level by level, as before.
- **The plinth's bars** (the ones you bank) are the same new bar, in the same end-on pyramid.

## The rules of the change

- **Draws from Math.random**: none added. The heaps draw twelve each, as the heap of six did (the first six bars take
  their tone and set from them, the four more from a hash); the coins three each, as before. three.js r128 also draws
  four numbers for every new object's uuid, so the pieces added here (the stamp, the trays' geometry, material and
  meshes) are made inside `memoryQuiet`, on a stream of their own. Checked: the vault's `build3D` draws 1300 numbers in
  both builds (a counter round it, opened from disk).
- **Shaders**: one new program (the trays'); on a Mac the bars' program gains the bump map (on a phone it is as it
  was). Both are in the scene when it is built, so `GFX.warm` compiles them and sends the stamp behind the change of
  screen: nothing is compiled or uploaded in play. No light added.
- **From disk**: nothing here needs a file (the built-in coin stands on the trays; the bars and trays are made in code).

## Cost (`tools/cost-report.js --only memory --stub --settle 8`; at the first card, nothing banked)

| tier | draws | triangles | lights (point/spot/dir) | textures MB | render targets MB |
|---|---|---|---|---|---|
| PHONE (880 x 1912) | 53 to **55** | 98,104 to **106,056** | 4 (2/0/2), as was | 80.9, as was | 41.1, as was |
| MAC (2940 x 1660) | 66 to **68** | 98,104 to **106,056** | 4 (2/0/2), as was | 258.4 to 258.8 | 227.2, as was |

Budgets: phone 100 draws, 350K triangles, 5 lights; Mac 160, 500K, 6. The two draws are the trays; the triangles the
twenty heap bars (400 each, where six a heap were 44) and the trays (240 each). The plinth's bars add 400 a card banked
(8,000 at a deck's end, where they added 880). The machine was loaded (a load average near 40 while measuring): its
frame and script times are not comparable with the baseline's and are left out; nothing here runs a frame (the new
pieces are still, and the update is as it was but for the glints' placing).

## Checks

- The rules' regression (`scripts/arcade-regression.js --compare arcade/backup/regression-baseline.json`): IDENTICAL,
  153 answers in 8 games (Memory Bank's 22 among them), on the final build.
- The screen sequence (`scripts/arcade-sequence.js`): ALL 13 STEPS OK, no errors (Memory Bank opened twice, torn down
  once), on the final build.
- Every capture without an error: served (phone and Mac, 1x and 2x) and opened from disk (the built-in coin on the
  trays, the light strips' reflections).
- The geometry checked in Node: the bar closed (every edge shared by two triangles), every triangle wound the way its
  normals face; the tray the same but for its open foot, which stands on the floor.
- Nothing in `arcade/content/` or `scripts/` changed.

## Pictures

- `memory-before-after.jpg`: the Mac's front still and the phone's (`polish.js`, PART=memory, 1x), and the phone's
  vault window at twice the size (`tools/scenarios/memory-gold.js`, GOLD=window, 2x).
- `memory-gold-close.jpg` (`memory-gold.js`, the Mac at 2x): a narrow lens close to the left heap at the game's own
  angle, the same from higher (the stamped tops), the left heap as the game frames it, the plinth with eleven cards
  banked.

`memory-gold.js` holds the title hall still while the vault opens: the hall goes on drawing from Math.random behind the
cover as often as its files (arriving in real time) give it things to move, so the cards dealt shifted run to run
(1076, 1636, 76 and 2092 draws before the deal in four runs). `polish.js` does not, so its before and after show
different cards; nothing in the deal changed.

## Not done, and why

- **A velvet rope on stanchions, a ledger (Mac only, if budget allowed):** left out, though the budget allows them. The
  door's foot is full (two heaps and their trays, the two decks, the plinth and its pyramid). From the lens, a rope at a
  stanchion's height anywhere behind the plinth's front crosses the bars you bank; the only open floor is the
  foreground under the plinth, where it would cover the floor's reflection of the door (Phase 2's) and the stanchions'
  feet fall off the frame. No place for a ledger stand that would not cover the gold or the deck the cards fly from.
- **The two heaps' bars in one draw:** each heap stays one instanced draw (as before). They stand where the window puts
  them (`onResize`), each in its group with its tray, light shaft and pool; one mesh for both would save a single draw.
- **The coin model:** unchanged (the generated token, 2,500 triangles). The stacks start at 20 coins (50K triangles,
  half the screen's) and reach 52 by a deck's end (130K, inside both budgets); a light copy for the stacks, where only
  the top coin's face shows, would take most of that off. A performance item for later, not this one's.
- **The vault door, the wall, the floor, the cards, the deck holders, the page:** untouched, as asked.
