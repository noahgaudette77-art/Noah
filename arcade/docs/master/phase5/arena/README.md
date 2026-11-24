# Boss Rush's arena: the crowd moves, the deck rages (Phase 5, 2026-11-24)

From the rebuild list (`MASTER_PLAN.md`, Phase 5): **keep (Phase 2 rebuilt it); improve in place**: "the crowd is lit
cards that never move; the deck's reflection keeps the calm neon when the boss rages". The bosses, the wizard, the
Proctor and the interface are untouched.

## What changed

| commit | change |
|---|---|
| `0ccfb1f` | **The crowd sways and cheers.** One card drawn instanced for all of it (352 under the storm sky; one draw, as before), each moved in the vertex shader. Waiting, it sways from the hips and shifts its weight at its own pace, and now and then pumps its arms (restless, quicker, as the boss rages). A blow on the boss runs a **cheer** out from behind it along the stands: each hops at its own beat, stretched going up, arms up and pumping. The boss's strike runs a **stir** through them: down, squashed, away to one side, some hands thrown up. The crowd's picture holds each of its eight figures twice, standing and cheering (fists up, hands clapped overhead, a phone held up high, a light stick swung across, a sign waved), head and body in place so the two swap cleanly; the standing ones are pixel for pixel as they were. The card runs on down past its feet into the stand, so a hop never shows the cut. Each one's beat is a hash of its place, not the randomness; the crowd's clock is the show's (a hit-stop holds it). Reduced effects: a quarter of the sway, a third of a cheer, arms held up, no pumping. |
| `dd39ba6` | **The staged fight tells the crowd its moments** (look only): a flinch as the boss lands, a roar back as it roars, a cheer for each of the wizard's blows (more for a heavy one), a recoil as it rages and as each strike is let go, the stands wild at its death, a recoil at its last word. The built-in fight (from disk) cheers its own blows and flinches at the boss's. |
| `3b0378f` | **The deck gives the rage back.** The arena's capture is taken calm (at the start and at the boss's power-up). Now, as the boss rages, what the deck gives back of it turns toward the neon's own rage red, each pixel's brightness kept, by as much as the neon itself (0.6 of the rage). The steel (pillars, stand panels, banners) reflects the same capture and turns with it, and a stroke of lightning lifts what the deck gives back for that moment. One mix a pixel; no second capture; no draw added. The shared floor (`08-fx.js`, `makeNeonFloor`) takes an optional `probe.tint` for it, behind a define: every other screen's floor compiles to exactly what it did. |
| `df338df`, `60d7e81` | `tools/scenarios/arena.js`: the evidence below (PARTS=rage: the fight raging, the deck, and the deck at the same moment with its tint held at naught; PARTS=crowd: the stands held close, waiting, cheering, stirring). |

## Measured

Draws and triangles at one fixed moment in both builds (the capture's virtual clock: Boss Rush 1, the first
question, the deck's capture taken; counted as `cost-report.js` counts them, three frames each):

| tier | draws before → after | triangles before → after | lights |
|---|---|---|---|
| PHONE | 73 → 73 | 111,329 → 111,329 | 5 → 5 |
| MAC | 91 → 91 | 133,544 → 133,544 | 5 → 5 |

`cost-report.js --only boss --stub --settle 8`: phone 65 draws / 111,329 triangles before and 67 / 111,333 after;
Mac 93 / 132,944 before and 90 / 130,430 after; 5 lights throughout. These are different moments, not a cost: under
this machine's load both phone runs of the before timed out waiting for the question ("not all of its pieces
arrived"). Textures: 219.1 → 219.8 MB on the phone, 474 → 474.7 MB on the Mac (the crowd's picture at twice its
width); geometry buffers 4.4 → 4.3 MB. Script time a frame is lost in the machine's load (1.1 to 4.2 ms on the phone
from run to run, of either build); what was added is a few uniforms set a frame.

## Checks

- The rules' regression: **IDENTICAL** (153 answers in 8 games, no console errors), on the first build and again on
  the final one.
- The screen sequence: **ALL 13 STEPS OK**, no errors, on the first build and again on the final one.
- `arcade/content/` and `scripts/` untouched; no hit-stop added (`24c-examboss.js` untouched).
- Shaders: the crowd's, the deck's and the steel's are in the scene from the build, so `GFX.warm` compiles them behind
  the cover; the crowd's picture is made at the build and goes to the graphics chip with the warm. No new lights.
- **The stills draw other questions than the before** (and the boss stands at another moment of its idle): not a
  rule. three.js draws four random numbers for the id of every object it makes, and the arena is built after the
  capture's "boss-ask" reseed. The old crowd made two geometries a card (704), the new one makes one. Counted between
  that reseed and the question: 6,445 draws before, 3,649 after. Model decoding, timed by real time, also varies run
  to run on this loaded machine: two runs of the same build placed the crowd differently. The regression plays the
  rules on a stream of their own: IDENTICAL.

## The pictures

- `crowd-idle.jpg`, `crowd-cheer.jpg`, `crowd-stir.jpg`: the stands held close (phone), before above, after below:
  waiting (0 to 0.9 s), a right answer (its blow lands at 0.3 s), a wrong one (the boss strikes). Before, the cards
  stand still through all three. Each build draws its own crowd (see above).
- `deck-rage-phone.jpg`: the deck under the stands while the boss rages, zoomed, the same moment of one run with the
  tint held at naught (as before) and on. On a phone the capture is all the deck gives back: its violet and blue turn
  red.
- `deck-rage-mac.jpg`: the same on a Mac, where the tier also draws the floor's live mirror (it already shows the red
  neon; the capture is 0.45 of what the deck gives back), so the change is smaller.
- `stills-phone.jpg`, `stills-mac.jpg`, `stills-mac-rage.jpg`: the game's own framing, before and after (the first
  question; raging, the lens drawn back as a strike winds up).
- `motion-*-before.jpg`, `motion-*-after.jpg`: `tools/scenarios/motion.js` (BOSS=1: idle, attack, hit) at the game's
  framing. During a hit the lens closes on the boss and the sheet comes up, so the crowd is seen best close up.

## Not done, and why

- **A second capture at the rage's thresholds**: the tint does it in one mix a pixel. A capture is six more drawings
  of the arena (a frame's stall, or a face a frame).
- **The searchlights' sweep in the deck**: the capture holds them where they stood when it was taken. Their colour
  follows the rage, their sweep does not (only a planar mirror, drawing the scene again every frame, would show it;
  the Mac's mirror, where the tier draws it, does).
- The front row's dark heads near the lens are as they were (barely in the picture on either device).
