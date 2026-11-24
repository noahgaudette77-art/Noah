# The hub (Phase 5: improve in place)

From the rebuild list: "keep (the audit's reference scene); improve in place: the cabinets' lower bodies are black voids
under lit tops (the audit's #22); one club laser reads as a hairline from ceiling to floor (review). Work: kick plates,
coin doors and side art lit on the cabinets; a soft halo on the lasers." The floor, the toppers (the Boss Rush topper
was just rebuilt), the Hall of Fame board and the interface are untouched.

## What changed

**The lasers** (`fb8140f`, `src/js/11-hub.js`: `hubLasers`). The eight beams were eight meshes, thin open cylinders
aimed every frame on the main thread. Now they are one mesh: each beam a flat ribbon turned to face the lens, swept in
its vertex shader exactly as before (the same points in the ring above the cabinets, the same swing and reach, on the
scene's clock). Across the ribbon: the beam's hot core as it was drawn (a cylinder of light seen side on, the same
crawl along it, never under three pixels across) and round it a soft halo, the haze the beam lights (a tight glow and
a wider faint skirt), thinning out where it meets the floor. One draw where there were up to eight (in the floor's
mirror too); nothing a frame but its fade.

**The cabinets' lower bodies** (`460f2ca`, `src/js/11c-hubgen.js`, the art in `hubArtAtlas`). The generated cabinet
(`prop-cabinet`) is gloss black metal below its control panel: it mirrors the dark hall and takes no light. Measured
from the model (orthographic depth renders of the GLB: its front sheet between the side panels' chrome edges, its coin
door standing proud of it, the flat of each lower side panel), each cabinet now has:
- a printed front sheet in the game's two colours (bands rising from the outer foot either side of the coin door, the
  game's emblem in a ringed disc above them, a frame in its colour); the model's own coin door stands in front of it;
- a brushed-steel kick plate (a rolled top edge, a screw at each end), tinted a little by its colour;
- the coin door lit: the coin entries' inserts orange-red with their slots dark, the returns a softer amber, on the
  cabinet's light group (they power on and brighten in front with it);
- side art on both lower side panels (a sweep of its colour up from the front foot, speed lines, its emblem), the
  panel's own black at its top and back, so the stripes painted above cross it and it has no edge of its own there.

The sheet, the plate and the side art are printed (new regions of the hall's art atlas, drawn once a session, from
hashes, never `Math.random`), so the hall's own lights show them; bare chrome there mirrored the black floor and read
as black. The lamps are in the hall's neon batch. Everything is in the hall's existing batches: no draw, light, texture
or shader of its own, about 80 triangles a cabinet. Opened from disk the hall builds its own cabinets, which have
their kick plate, lit coin door and printed front already: unchanged (only the lasers differ there).

## Stills (the same moment, `tools/scenarios/polish.js`, PART=hub)

- `before-phone.jpg`, `after-phone.jpg` (440 x 956, 1x); `before-mac.jpg`, `after-mac.jpg` (1470 x 830, 1x).
- `sheet-phone.jpg`, `sheet-mac.jpg`: before and after side by side, with the cabinets and lasers enlarged.
- `details.jpg`: close views (the lens moved for the picture only): the lower body of Risk Blaster's cabinet from the
  front and from its left side, before and after.

The cabinet screens' attract demos and the lasers' sweep can stand at a slightly different moment from run to run (the
hall is built when its files arrive, in real time): compare the cabinets, not the demos.

## Costs (`tools/cost-report.js --only hub --stub --settle 8`, phone and `--device mac`)

| tier | build | draws | triangles | lights (point/spot/dir) | textures MB | script ms (max) |
|---|---|---|---|---|---|---|
| PHONE (880 x 1912) | before (`bdb43c7`) | 41 | 85,742 | 4 (3/0/1) | 180.5 | 3.71 (199) |
| PHONE | after | **35** | 86,054 | 4 (3/0/1) | 196.6 | 1.61 (18) |
| MAC (2940 x 1660) | before | 97 | 317,446 | 4 (3/0/1) | 337.2 | 2.51 (19) |
| MAC | after | **85** | 318,054 | 4 (3/0/1) | 337.2 | 3.83 (87) |

Draws went down (the lasers: one draw where up to eight were drawn, in the main view and in the floor's mirror);
triangles up by about 300 on the phone and 600 on the Mac (the new pieces, about 80 a cabinet, drawn again in the
mirror, less the cylinders'); lights and render targets unchanged, programs unchanged (79 on the phone); no texture
added (the art is in the hall's existing atlas). All well inside the budgets (phone 100 / 350K / 5; Mac 160 / 500K /
6). The phone's textures differ only in what the title hall left behind (its render targets and two canvases, by
timing: `--textures`); the hub's own, 123.8 MB, are the same before and after, and the Mac's 337.2 MB match.

The script times were measured while several other agents' captures ran (load 30-45 on 4 cores, memory short): they
are noise here, in both directions (a second phone run of each build read 1.13 ms before, 3.26 after). By
construction the frame's work went down: the eight beams' aiming on the main thread (eight quaternions and matrices a
frame) is gone, and the scene has seven objects fewer for FX.sync to walk; nothing was added a frame but the lasers'
fade. To be measured again on a quiet machine (the performance re-check).

## Checks

- The rules' regression: IDENTICAL to the baseline (153 answers in 8 games), on this build.
- The screen sequence: ALL 13 STEPS OK, no errors.
- Opened from disk (the hall's own cabinets, no models): no errors; its lasers take the halo too.
- No `Math.random` added while building (the art's brush marks come from a hash of the row); the lasers' shader is in
  the scene from the start, so `GFX.warm` compiles it with the rest; no texture uploaded in play.

## Not done, and why

- The model's own material is unchanged (making it less metallic would light the lower body but change the whole
  cabinet, the marquee's lightbox and the bezel included). No light was added (the screen's budget).
- The side art is seen as a narrow strip in the hall's usual views (the lens stands near the middle of the ring, so
  every cabinet is seen nearly face on); it shows as the view swings and leans, and stays dark where unlit.
- The coin door's lower (cash) door stays the model's black: a lit price plate there would be too small to read.
- The lasers are not fogged (as before).
