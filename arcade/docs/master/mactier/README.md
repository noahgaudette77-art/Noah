# The Mac's richer tier (2026-11-25)

The owner's order, as given: "Raise the Mac tier's graphics memory budget from 900 MB to about 2 GB (up to 3 GB only if
every test stays clean). The MacBook has 16 GB of unified memory, but it is shared with Safari, other apps and the OS, so
keep headroom. Spend the extra on higher-resolution key textures, denser props and richer effects on the Mac tier only.
Keep the phone tier at its current budget. Keep a steady 60 FPS, re-run the 30-minute soak test with other apps open, and
confirm no memory growth or slowdown. Study logic and content stay untouched."

Everything here is drawn only on a computer at the MAC tier (`GFX.rich`: the tier the page picks for a Mac, and Setup's
HIGH). A Mac the governor holds a step lower, a phone, and Setup's lower settings draw what they drew before. This
machine draws in software: its times compare builds with each other, never with a device.

## The budget

`tools/harness.js`: the Mac's graphics memory 2,000 MB a screen (it was 900); its draw calls and triangles as they were
(160, 500K: smoothness first). The phone's budgets all as they were (100 draws, 350K triangles, 450 MB).

## Where the Mac's picture was held back (the audit)

Ranked by what it shows for its memory and what it costs a frame:

1. **The skies.** Every game sky is a 4096 x 2048 panorama, drawn down from Blockade's own 8192 x 4096. How many of its
   texels fall on a Mac's screen pixel (2940 x 1660), from each dome's own mapping (`tools/scenarios/sky-texels.js`; the
   median over the frame, 1 is one texel a pixel, below 1 the picture is drawn up):

   | screen | the game's sky (4096) | the sharper copy (8192) | kept |
   |---|---|---|---|
   | the exam (the moon) | 0.31 (drawn up 3.2 times) | 0.62 | yes |
   | the guide (the archive) | 0.38 (2.6 times) | 0.76 | yes |
   | Risk Blaster | 0.64 (1.6 times) | 1.28, filtered through its smaller copies | yes |
   | Nest Egg Run | 0.65 (1.5 times) | 1.30, filtered through its smaller copies | yes |
   | Boss Rush (its window) | 1.14 (about one texel a pixel) | 2.28, drawn down without smaller copies | **no** |

   In Boss Rush the game's sky is already as sharp as the screen; an 8K one would be drawn down without its smaller
   copies (the dome has none: makePanoSky), sharper in a still and shimmering as the lens sways. Its three were fetched
   and removed (`7145867`).
2. **The title hall's bosses** wore half the pictures Boss Rush's bosses wear (1024 px colour and glow, 512 px surface;
   Boss Rush's 2048 and 1024). Measured on the bosses' triangles as the glide passes (`tools/scenarios/model-texels.js`): with the sharper
   maps, mid-glide, 68 to 74% of their pixels see 0.5 to 1 texel a pixel (with the hall's own maps, 0.25 to 0.5: drawn up
   2 to 4 times). Kept.
3. **The wizard** wears a 2048 px colour map drawn down from a 4096 px source. Measured where Boss Rush draws it, at its
   questions: with the 4096 map 95% of its pixels see 2 texels a pixel or more (82% 2 to 4), so a 4096 map is drawn
   down through its smaller copies; the 2048 map's own detail is what shows. Its copy was made and removed (`7145867`).
4. **The fights' effects** were counted for a phone: sparks, embers and chunks the same on a Mac.
5. **Risk Blaster's far rocks** (96) and **Boss Rush's stands** (the crowd) were sized for a phone's budget.
6. **The floor's reflection** was drawn at 0.6 of the picture on a Mac (soft on a large screen). Tried at 0.8 and put
   back: it costs frame time, not memory (`fd99e7f`).

Weighed and not taken: the heroes' own pictures (the fighter, the demon, the war rig, Boss Rush's bosses) are at their
sources' size already (each part's source picture is 1024 px; the game's 2048 maps are those parts packed together):
sharper ones would mean generating them again. Shadows and more lights: they cost frame time, not memory. Compressed
textures (KTX2): Phase 1's decision stands.

## What was done

| commit | change | Mac only by |
|---|---|---|
| `655f8e3` | the budget: 2,000 MB a screen on the Mac | the harness's Mac budget |
| `7dbcd9e` | **a sharper copy fetched in a model's or a sky's place** (`<name>-hd`: `Assets.file`, `Assets.skyFile`): the hall's eleven bosses in Boss Rush's own pictures (`tools/gen/mac-hd.mjs`), skies at 8192 x 4096 (`tools/gen/sky-hd.js`: Blockade's finished requests fetched again, no generation, no spend) | a computer at the MAC tier fetches them; a phone never does |
| `4eb24bc` | **richer effects:** half as many sparks, embers and chunks again in every fight (CombatFX); **denser props:** twice Risk Blaster's far rocks (192, one draw as before); the floor's reflection at 0.8 of the picture | `GFX.rich`; the extras from a randomness of their own (`GFX.richRandom`), so what a game draws by its seed is the same |
| `6984068` | **Boss Rush's stands two fifths fuller** (528 people, between the others; cards of the one instanced crowd, no draw more) | `GFX.rich`, `GFX.richRandom` |
| `7145867` | Boss Rush's three sharper skies and the wizard's sharper copy removed, as measured above (the files gone: 174 files, 113.7 MB in all) | |
| `481b0fc` | **a sharper sky on the graphics chip only while a screen draws it or keeps it in waiting** (`Assets.restSkies` at each change of screen; `GFX.warm` sends a sharper sky only to a screen that draws it): a round of the games had kept every one there; each is let go of the chip once its reflection is made | only a sharper sky (a phone has none) |
| `0ced03a` | **Nest Egg Run readies every sky whole behind the cover.** Found by drawing every frame of a run: at each of its four changes of landscape the next sky was sent to the graphics chip again and its smaller copies made, mid-run (an 8K picture on a Mac, 2048 on a phone: a stall where the road runs into a landscape). Now nothing is sent in a whole run, on either page; Risk Blaster's regions were readied so already (checked the same way) | every tier (a fault on every tier; a phone holds 11 MB more of skies at a run's start) |
| `c004d32`, `18be933` | the soak measures memory: the graphics chip's (`tools/glmem.js`, from `cost-report.js`, its counts unchanged) and the browser's own (every process, Linux's Pss; the page's own process apart), and each game at the end of its play | tools |
| `fd99e7f` | **the floor's reflection back to 0.6** of the picture: measured in software, the 0.8 of `4eb24bc` cost 5 to 7% more of a frame in the hall and Boss Rush and 11% in Nest Egg Run, the one change here that costs frame time and not memory; with no MacBook to measure on, smoothness first | the MAC tier's setting |
| `22e725f`, `e5ae59e`, `356792f`, `955e71a` | the independent review's findings (`gate-report.md`): Risk Blaster's extra rocks and CombatFX's extra chunks off the seeded randomness, in slots of their own; Nest Egg Run's old sky let go a frame later (an 8K one was sent again mid-run at year 16); the sharper skies follow the tier (a Mac held lower draws the game's own); a sharper sky that comes late on a slow connection not made ready in play | as each says |

## The numbers

Every screen at the Mac's size (1470 x 830 at pixel ratio 2: 2940 x 1660 drawn), the page before this tier and the
finished one, measured one after the other on a quiet machine (`tools/cost-report.js --device mac`; the title and the
guide from the harness's run, `docs/master/runs/mactier-final`). Frame times are this machine's software drawing: they
compare the two pages, never a device; one moment of a game varies with what is in view (some 8% either way).

| screen | graphics memory, MB | draw calls | triangles | pixels drawn a frame (millions) | a frame drawn here |
|---|---|---|---|---|---|
| the title hall | 690 → **1,131** | 64 → 64 | 307K → 307K | 37.6 → 37.6 | (5% less: costs2) |
| the hall | 576 → **576** | 85 → 85 | 318K → 318K | 39.3 → 39.3 | -4% |
| Risk Blaster | 795 → **1,179** | 117 → 98 | 249K → 299K | 42.5 → 42.5 | +14% |
| Nest Egg Run | 793 → **1,476** | 148 → 138 | 361K → 314K | 44.5 → 44.5 | -3% |
| Boss Rush | 714 → **714** | 84 → 83 | 125K → 125K | 39.3 → 39.3 | 0% |
| Memory Bank | 487 → **487** | 68 → 68 | 106K → 106K | 37.6 → 37.6 | +3% |
| the exam | 520 → **606** | 92 → 93 | 57K → 57K | 37.6 → 37.6 | -8% |
| the guide | 467 → **552** | 63 → 63 | 32K → 32K | 37.9 → 37.9 | (5% less: costs2) |

Every screen inside the Mac's budget (2,000 MB, 160 draws, 500K triangles); the most, Nest Egg Run's 1,476 MB at the
start of a run (its five sharper skies with their smaller copies, let go one by one as the road runs on), and in the
soak, with what the hall keeps, 1,757 MB. The pixels a frame draws are the same on every screen. Risk Blaster's draws and
triangles follow the traffic in view; its far field, twice as dense, is some 50K triangles of it (one draw, as before).

On a phone's page every screen is as it was (`docs/master/runs/mactier-final`: the same draws, triangles and pixels),
but Nest Egg Run's memory, 315 → 325 MB (its five skies readied with their smaller copies from the start: no picture
sent in the middle of a run any more), inside the phone's 450.

## The soak with other programs on the machine

The 30-minute soak (on the page with the review's fixes), with 6 GB of memory held, a busy core and a second browser drawing beside it
(`gate-report.md`; `soak/`): from round 2 to round 3 the JavaScript heap +2.1 MB at most, the textures, geometries,
elements and timers +0, the graphics chip's memory +1 MB at most (825 MB in the hall), a frame's update 0.47 then
0.41 ms. **No growth and no slowdown.** The most on the graphics chip: 1,757 MB, in Nest Egg Run. Six rounds side by side
with the page before this tier: the browser's own memory swings with the sharper pictures (by some 500 MB) and does not
climb.

## Pictures

- `guide-archive-before-after.jpg`: the guide's archive on a Mac, the game's sky (above) and the sharper copy (below),
  at the screen's own pixels: the spines, the shelves' edges and the lamp drawn, not smeared.
- `boss-crowd-before-after.jpg`: Boss Rush's stands, before (above) and after (below): two fifths more people.
