# INR Arcade: assets

Every asset file the game loads from `arcade/assets/`, where it came from, how it was made and what it cost, and a
running spend log per provider. Prompts are kept in full in the generator scripts (`tools/gen/concepts.js`,
`skies.js`, `sounds.js`); every paid call is one line of `tools/gen/ledger.jsonl` (provider, settings, cost, task id).

Generated assets were made for this project with the owner's own provider accounts; their use is governed by each
provider's terms for paid output. Nothing here is taken from an existing game, film or brand, and every design was
checked for lookalikes when it was picked (see `PROGRESS.md`, thirteenth pass). Code libraries: three.js r128 and
its glTF loader (MIT, `vendor/three.LICENSE`), meshoptimizer decoder (MIT, `vendor/meshoptimizer.LICENSE`).

## How the files are made

| Step | Tool | What it does |
|---|---|---|
| Concept image | `tools/gen/concepts.js` | one strong prompt per asset, drawn as a single object on a plain ground (fal.ai: Seedream 5.5, Nano Banana Pro) |
| 3D candidates | `tools/gen/candidates.js` | the same concept through Tripo H3.1 (Ultra geometry, HD texture v3.5, PBR) and Hyper3D Rodin Gen-2.5 Extreme-High (HighPack 4K, HD texture, PBR) |
| Review sheets | `tools/gen/render.js` | every candidate from front, three-quarter, side, rear, rear three-quarter and top |
| Split parts, rig | `tools/gen/tripo-post.js` | Tripo segmentation v2, rig check, auto rig, animation retarget |
| Game model | `tools/gen/process-model.mjs` + `tools/gen/assets/<name>.json` | orientation (+Y up, +Z forward), scale, origin; parts as nodes with pivots; simplification (meshopt, borders locked); 2K base colour, metal/roughness and normal maps as WebP; an emissive map derived from the base colour's neon; anchor nodes for effects; quantised, meshopt-compressed `.glb` |
| Skies | `tools/gen/skies.js`, `sky-build.js` | Blockade Labs Model 3 panoramas (8K), checked for seams and stretching, packed at 4096x2048 WebP |
| Sound | `tools/gen/sounds.js`, `audio-build.js` | ElevenLabs effects (several takes each), loops, announcer lines, music; trimmed, levelled and packed into sprites |
| Manifest | `tools/manifest.js` | writes `src/js/03a-files.js`: the files, the cues in each sprite, the music, what each screen needs |

## Models (`assets/models/`)

| File | Used for | Source | Settings | Result | Cost |
|---|---|---|---|---|---|
| `starfighter.glb` | Risk Blaster: the player's fighter | Tripo `image-to-model`, model `v3.1-20260211`, from concept `starfighter-b-sd-0` (Seedream 5.5; prompt `starfighter-b` in `concepts.js`); parts from Tripo `mesh/segment` v2 | `geometry_quality: detailed`, `texture_quality: detailed`, `texture_version: v3.5-20260815`, PBR, 300K faces | 97K triangles in 13 parts (hull, canopy, 2 wings, 2 cannons, 5 engines, 2 fins), 11 anchors, 2K maps, 2.0 MB | 60 + 40 Tripo credits (model, segmentation); concept $0.06 |
| `demon.glb` | Risk Blaster: the wave's enemy | Tripo `image-to-model` `v3.1-20260211` from concept `demon-c-sd-0` (prompt `demon-c`); parts from Tripo `mesh/segment` v2 | as above | 120K triangles in 11 parts (body, head, tail, 2 wings, 2 shoulders, 2 elbows, 2 hands), 9 anchors, 2K maps, 1.9 MB | 60 + 40 Tripo credits; concept $0.06 |
| `warrig.glb` | Nest Egg Run: the vehicle | Hyper3D Rodin `fal-ai/hyper3d/rodin/v2.5`, tier `Gen-2.5-Extreme-High`, from concept `wartruck-c-sd-0` (prompt `wartruck-c`); parts from Tripo `mesh/segment` v2 of the uploaded mesh | `500K Triangle`, PBR, `hd_texture`, `texture_delight`, HighPack (4K) | 191K triangles in 9 parts (body, 6 wheels, 2 exhausts), 9 anchors, 2K maps, 3.6 MB | $1.20 fal + 40 Tripo credits; concept $0.06 |

Each model has a `<name>.json` beside it (parts, pivots, anchors, triangle count) written by the processing tool.

## Skies (`assets/sky/`)

Blockade Labs Skybox AI, Model 3 (8K equirectangular, 1 credit each), packed at 4096x2048 WebP. Each has a
`<name>.json` with its Blockade id, style, seed and prompt.

| File | Used for | Style | Checked |
|---|---|---|---|
| `blaster-deep-1.webp` | Risk Blaster: the main sky (magenta and cyan nebula, open space in every direction) | M3 Advanced (artistic) | seam, zenith and nadir clean |
| `blaster-deep-4.webp` | Risk Blaster: the ominous regions (crimson nebula on a dense star field) | M3 Advanced (photo/render) | seam runs through the red nebula without a join |
| `blaster-deep-5.webp` | Risk Blaster: the wormhole gate region (cyan and magenta vortices) | M3 Advanced (artistic) | seam clean |

Rejected and deleted (2026-11-15; they were never committed and no code loads them): `blaster-nebula`,
`blaster-nebula-b`, `blaster-belt`, `blaster-graveyard`, `blaster-gate` (the first prompts came back as alien
landscapes with ground, ships and structures: not open space), `blaster-deep-2` (a band of different texture down
the seam), `blaster-deep-3` (a visible join through its bright star). Their seven credits stay in the spend log.
Skies for the other modes are generated and are added to this table as each mode's phase picks them.

## Sound (`assets/audio/`)

ElevenLabs. Effects: `eleven_text_to_sound_v2`, `prompt_influence` 0.45, a fixed duration per effect, 3 to 6 takes
each (the game plays the takes of a sound in turn). Loops: the same model with `loop: true`. Announcer: voice
"Harry" (`SOYHLrjzK2X1ezoPC6cr`), model `eleven_v3`, with a touch of echo and compression added in the build.
`audio.json` lists every cue's place in its sprite.

| File | Holds | Size |
|---|---|---|
| `sfx-core.mp3` | hits (right, big, reject, hull, shield, metal), blasts (small, big, huge), debris, charge-ups, warning, lock-on, slow-motion, player hit, life lost, shield down, reward, right/wrong stings, menu sounds, coin, power-up, fanfare, game-over jingle, crowd; loops: alarm, charge hum | 1.7 MB, 125 s |
| `sfx-combat.mp3` | laser, heavy laser, plasma bolt, spent cell, beam, missile launch and hit, volley, energy wave, ground slam, boss roar, hurt, stagger, armour breaking, death, warp; loop: starfighter engine | 1.1 MB, 82 s |
| `sfx-racer.mp3` | crash, glass, skid, near miss, boost, gate pass; loops: engine, boost flames | 0.5 MB, 34 s |
| `sfx-hub.mp3` | loop: the arcade hall's ambience | 0.1 MB, 9 s |
| `voice.mp3` | 55 announcer lines ("Wave one" to "Wave ten", "Game over", "Stage clear", "Boss incoming", streak names, milestones ...) | 0.8 MB, 70 s |

## Spend log

As of the end of Phase 0 (2026-11-15). Failed calls are not charged by any of the four.

| Provider | Start | Spent | Left | On what |
|---|---|---|---|---|
| Tripo | 4,465 credits | 1,495 | 2,970 | 21 image-to-3D (60 each), 1 text-to-3D (50), 4 segmentations (40 each), 1 auto rig (25), 13 rig checks (free) |
| fal.ai | $49.90 | $19.89 | $30.01 | 22 Rodin Gen-2.5 runs ($16.80: 10 with HighPack at $1.20, 12 at $0.40), 44 Seedream 5.5 concept images, 9 Nano Banana Pro concept images |
| ElevenLabs | 131,000 credits | 10,040 | 120,960 | 448 sound effects and loops (11 credits a second), 57 announcer lines, 3 music runs |
| Blockade Labs | plan credits | 24 | not reported by the API | 24 skies (Model 3, 1 credit each) |
