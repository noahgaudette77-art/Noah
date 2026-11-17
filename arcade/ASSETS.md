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
| Game model | `tools/gen/process-model.mjs` + `tools/gen/assets/<name>.json` | orientation (+Y up, +Z forward), scale, origin; parts as nodes with pivots; simplification (meshopt, borders locked); base colour (4K for the hero models), metal/roughness and normal maps (2K) as WebP; surface rules by part (`paint`: roughness, metalness, glow or colour for the texels of named parts, optionally only where the base colour is in a range); a glow map from the base colour's neon, cleaned with a median; anchor points for effects; quantised, meshopt-compressed `.glb` |
| Elevation views | `tools/gen/views.js` | a picked concept redrawn flat from the front, the side, behind and above (Nano Banana Pro, edit), for multi-view image-to-3D |
| Rigged model | `tools/gen/process-rigged.mjs` + `tools/gen/assets/boss-<n>.json` | a Tripo-rigged model with retargeted clips turned into rigid armour parts on its skeleton (see below); clips renamed, still tracks dropped, resampled; `render.js --anim` draws a contact sheet of the clips |
| Skies | `tools/gen/skies.js`, `sky-build.js` | Blockade Labs Model 3 panoramas (8K), checked for seams and stretching, packed at 4096x2048 WebP |
| Sound | `tools/gen/sounds.js`, `audio-build.js` | ElevenLabs effects (several takes each), loops, announcer lines, music; trimmed, levelled and packed into sprites |
| Manifest | `tools/manifest.js` | writes `src/js/03a-files.js`: the files, the cues in each sprite, the music, what each screen needs |

## Models (`assets/models/`)

| File | Used for | Source | Settings | Result | Cost |
|---|---|---|---|---|---|
| `starfighter.glb` | Risk Blaster: the player's fighter | Tripo `image-to-model`, model `v3.1-20260211`, from concept `starfighter-b-sd-0` (Seedream 5.5; prompt `starfighter-b` in `concepts.js`); parts from Tripo `mesh/segment` v2 | `geometry_quality: detailed`, `texture_quality: detailed`, `texture_version: v3.5-20260815`, PBR, 300K faces | 119K triangles in 13 parts (hull, canopy, 2 wings, 2 cannons, 5 engines, 2 fins), 11 anchors, 4K base colour, 2K metal/roughness, normal and glow maps, 3.3 MB. Surfaces by part: mirror-glass canopy, heat-tinted nozzles, gunmetal cannons | 60 + 40 Tripo credits (model, segmentation); concept $0.06 |
| `demon.glb` | Risk Blaster: the wave's enemy (second version) | Tripo `image-to-model` `v3.1-20260211` from concept `demon-d-nb-0` (Nano Banana Pro; prompt `demon-d`); parts from Tripo `mesh/segment` v2 (`balanced`), the two horns lifted out of a second split (`detailed`) | as above | 142K triangles in 13 parts (body, head, 2 horns, tail, 2 wings, 2 shoulders, 2 elbows, 2 hands), 9 anchors, 4K base colour, 2K maps, 3.4 MB. Surfaces by part: matte ridged horns, chrome armour with cyan seam lights, softly glowing wing membranes, a glowing rift in the chest | 60 + 40 + 40 Tripo credits; concept $0.15 |
| `warrig.glb` | Nest Egg Run: the vehicle (second version: an armoured hauler carrying the nest egg) | Tripo `multiview-to-model`, model `v3.1-20260211`, from four elevations (front, left, back, right) of concept `warrig-b-sd-1` (Seedream 5.5, prompt `warrig-b`); the elevations drawn by Nano Banana Pro (edit) with `tools/gen/views.js`; parts from Tripo `mesh/segment` v2; the plane of symmetry found and one half reflected by `process-model.mjs` (`mirror`) | `geometry_quality: detailed`, `texture_quality: detailed`, `texture_version: v3.5-20260815`, PBR, 300K faces | 115K triangles in 8 parts (body, egg, 4 wheels, 2 exhaust stacks), 9 anchors, exactly symmetrical about its centreline, 4K base colour, 2K maps, 3.0 MB. Checked in flat top, side, front and rear views (`docs/combat-pass/racer/warrig-check-flat.jpg`) | 60 + 40 + 40 Tripo credits (model, two segmentations); concept and four views $0.76 |
| `boss-1.glb` | Boss Rush: Product Pusher (second version) | Tripo `image-to-model` `v3.1-20260211` from concept `boss01c-pusher-sd-0` (two candidates made, one picked); Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces, base colour kept at 4096 px | 100K triangles as rigid parts on 16 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger, defeat, win; 3.0 MB. Slick chrome hair, a faceplate with cyan eye slits and a grin line, a suit, a cyan tie, a briefcase. | 60 + 60 + 25 + 40 + 100 Tripo credits (two candidates, rig, segmentation, 10 clips); concepts $0.12 (one draft rejected) |
| `boss-2.glb` | Boss Rush: Perilmonger | Tripo `image-to-model` `v3.1-20260211` from concept `boss02-perilmonger-sd-0`; Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 15 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 3.4 MB. | 60 + 25 + 40 + 80 Tripo credits (model, rig, segmentation, 8 clips); concept $0.06 |
| `boss-3.glb` | Boss Rush: Solvency Specter | Tripo `image-to-model` `v3.1-20260211` from concept `boss03-specter-sd-0`; Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 16 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 3.4 MB. | 60 + 25 + 40 + 80 Tripo credits (model, rig, segmentation, 8 clips); concept $0.06 |
| `boss-4.glb` | Boss Rush: The Fine Print | Tripo `image-to-model` `v3.1-20260211` from concept `boss04-fineprint-sd-1`; Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 14 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 3.2 MB. | 60 + 25 + 40 + 80 Tripo credits (model, rig, segmentation, 8 clips); concept $0.06 |
| `boss-5.glb` | Boss Rush: Group Golem | Tripo `image-to-model` `v3.1-20260211` from concept `boss05-golem-sd-1`; Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 14 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 3.0 MB. Base colour darkened to gunmetal. | 60 + 25 + 40 + 80 Tripo credits (model, rig, segmentation, 8 clips); concept $0.06 |
| `boss-6.glb` | Boss Rush: Inflation Titan (second version) | Tripo `image-to-model` `v3.1-20260211` from concept `boss06b-titan-sd-0` (two candidates made, one picked); Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 15 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 3.4 MB. A headless boiler: a brass valve handwheel on a pipe for a head, the gauge in the red, two smokestacks; the boiler is one rigid piece on the lower spine. | 60 + 60 + 25 + 40 + 80 Tripo credits (two candidates, rig, segmentation, 8 clips); concepts $0.06 |
| `boss-7.glb` | Boss Rush: Longevity Lich (second version) | Tripo `image-to-model` `v3.1-20260211` from concept `boss07b-lich-sd-1` (two candidates made, one picked); Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces, base colour kept at 4096 px | 100K triangles as rigid parts on 16 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 4.0 MB. A clockwork lich: a porcelain mask under a crown of clock hands, an hourglass case for a chest that glows mint, a teal and gold robe over brass legs, skeletal brass hands. | 60 + 60 + 25 + 40 + 80 Tripo credits (two candidates, rig, segmentation, 8 clips); concept $0.06 |
| `boss-8.glb` | Boss Rush: Lord Intestate | Tripo `image-to-model` `v3.1-20260211` from concept `boss08-intestate-sd-1`; Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 15 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 2.7 MB. | 60 + 25 + 40 + 80 Tripo credits (model, rig, segmentation, 8 clips); concept $0.06 |
| `boss-9.glb` | Boss Rush: Undue Influencer | Tripo `image-to-model` `v3.1-20260211` from concept `boss09-influencer-sd-0`; Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 17 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 3.0 MB. The two control bars are pinned to its forearms. | 60 + 25 + 40 + 80 Tripo credits (model, rig, segmentation, 8 clips); concept $0.06 |
| `boss-10.glb` | Boss Rush: Probate Tollgate | Tripo `image-to-model` `v3.1-20260211` from concept `boss10-tollgate-sd-0`; parts from Tripo `mesh/segment` v2 | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 104K triangles in 7 parts with pivots (body, 2 tracks, claw arm, barrier arm), 7 anchors, no skeleton (it is not a biped: the game animates it), body darkened to gunmetal, 3.6 MB. | 60 + 40 Tripo credits (model, segmentation); concept $0.06 |
| `boss-11.glb` | Boss Rush: Patrimony Phantom (second version) | Tripo `image-to-model` `v3.1-20260211` from concept `boss11b-phantom-sd-1` (two candidates made, one picked); Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 18 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 3.3 MB. A deep hood with violet eye slits over the whole head, a bone-white skeleton left half and a dark steel right half, a violet-edged cleaver; the cloak hangs from the chest. | 60 + 60 + 25 + 40 + 80 Tripo credits (two candidates, rig, segmentation, 8 clips); concepts $0.06 |
| `boss-all.glb` | Boss Rush: The Proctor | Tripo `image-to-model` `v3.1-20260211` from concept `boss12-proctor-sd-0`; Tripo `animations/rig` (`v1.0-20240301`, biped) and `animations/retarget` (presets); parts from Tripo `mesh/segment` v2, bound to bones by `process-rigged.mjs` | `geometry_quality: detailed`, `texture_quality: detailed`, PBR, 300K faces | 100K triangles as rigid parts on 16 bones of a 41-joint skeleton, clips: attackB, death, idle, enter, attackA, rage, hurt, stagger; 2.5 MB. | 60 + 25 + 40 + 80 Tripo credits (model, rig, segmentation, 8 clips); concept $0.06 |
| `prop-cabinet.glb` | Hub: the arcade cabinet (one model for all six games; its screen and marquee are blank for the game's own picture and name) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-cabinet-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 24K triangles, one mesh, 0.6 MB | 30 Tripo credits; concept $0.03 |
| `prop-trophy.glb` | Rewards: a chrome cup with neon rings | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-trophy-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 12K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-medal.glb` | Rewards: a gold star medal on a ribbon | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-medal-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 10K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-vault.glb` | Memory Bank: a round vault door in its frame | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-vault-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 20K triangles, one mesh, 0.8 MB | 30 Tripo credits; concept $0.03 |
| `prop-deck.glb` | Memory Bank: white-faced study cards with neon magenta edges in a chrome holder (second version) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-deck-b-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces; the card faces glow softly (paint rule) | 12K triangles, one mesh, 0.6 MB | 30 Tripo credits; concept $0.04 (the first version, black cards, 30 + $0.03, replaced after Phase 4's review) |
| `prop-podium.glb` | Final Exam: an examiner's lectern with an open glowing book and a brass bell (second version) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-podium-b-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces; the pages glow, the bell is brass | 14K triangles, one mesh, 0.5 MB | 30 Tripo credits; concept $0.04 (the first version, 30 + $0.03, replaced after Phase 4's review) |
| `prop-tome.glb` | Strategy Guide: an open tome with a violet cover, gold corners and a magenta ribbon on a chrome stand (second version) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-tome-b-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces; the pages glow, the gold is metal | 12K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.04 (the first version, a closed black book, 30 + $0.03, replaced after Phase 4's review) |
| `prop-stand.glb` | Hub: a wide three-step trophy stand (trophies, medals and coins are placed on its steps by code) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-stand-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 10K triangles, one mesh, 0.3 MB; 2.3 wide, 1 tall, 2.0 deep (its steps are deep) | 30 Tripo credits; concept $0.04 |
| `prop-coin.glb` | Icons: a gold token with an egg on its face | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-coin-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 6K triangles, one mesh, 0.3 MB | 30 Tripo credits; concept $0.03 |
| `prop-star.glb` | Icons: a gold star | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-star-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 8K triangles, one mesh, 0.5 MB | 30 Tripo credits; concept $0.03 |
| `prop-heart.glb` | Icons: a crystal heart (lives) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-heart-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 8K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-shield.glb` | Icons: a shield | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-shield-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 8K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-bolt.glb` | Icons: a lightning bolt (streaks) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-bolt-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 8K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-car.glb` | Nest Egg Run traffic: a compact car (mirrored to exact symmetry) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-car-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 9K triangles, one mesh, 0.3 MB | 30 Tripo credits; concept $0.03 |
| `prop-van.glb` | Nest Egg Run traffic: a box van (mirrored) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-van-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 9K triangles, one mesh, 0.3 MB | 30 Tripo credits; concept $0.03 |
| `prop-bus.glb` | Nest Egg Run traffic: a transit bus (mirrored) | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-bus-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 11K triangles, one mesh, 0.3 MB | 30 Tripo credits; concept $0.03 |
| `prop-rock.glb` | Risk Blaster: an asteroid with violet crystals | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-rock-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 7K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-rock2.glb` | Risk Blaster: an asteroid shard with cyan ore | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-rock2-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 7K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-ship-a.glb` | Risk Blaster traffic: a freighter with cargo pods | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-ship-a-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 9K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-ship-b.glb` | Risk Blaster traffic: a blade-shaped cruiser | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-ship-b-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 9K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `prop-ship-c.glb` | Risk Blaster traffic: a tug drone | Tripo `image-to-model` `v3.1-20260211` at its standard settings, from concept `prop-ship-c-sd-0` (Seedream 5.5), one attempt | standard geometry and texture, PBR, 60K faces | 8K triangles, one mesh, 0.4 MB | 30 Tripo credits; concept $0.03 |
| `mini-starfighter.glb` | Menus and Risk Blaster's cabinet topper: a small copy of the starfighter | the starfighter's source model, simplified by `process-model.mjs` | 512 px maps | 9K triangles, one mesh, 0.4 MB | none |
| `mini-warrig.glb` | Menus and Nest Egg Run's cabinet topper: a small copy of the rig | the rig's source model, simplified by `process-model.mjs` | 512 px maps | 14K triangles, one mesh, 0.5 MB | none |
| `mini-proctor.glb` | Menus and Boss Rush's cabinet topper: a small, still copy of the Proctor | the Proctor's source model, simplified by `process-model.mjs` | 512 px maps | 10K triangles, one mesh, 0.3 MB | none |

Each model has a `<name>.json` beside it (parts, pivots, anchors, triangle count) written by the processing tool.

The eleven biped bosses are built a third way (`tools/gen/process-rigged.mjs`). Tripo's auto-rig binds one soft skin
to a skeleton, and on these machines that stretched plates, cases and robes like rubber. So the skeleton and its
retargeted motion-capture clips are kept and the soft skin is thrown away: every part of the segmented model goes,
whole, to the bone that owns it (a briefcase to the hand); a limb that came as one part is cut where its bones meet;
a robe or cloak is cut into bands (hood on the head, mantle on the chest, skirt on the hips); every cut end is closed
with a dark dome that reads as a joint. The result needs no skinning at run time and any part can be torn off.
The first rig test (Tripo rig v3.0, 25 credits, and five clips on it, 50 credits) was not used: rig v1.0 has the
larger library of clips.

Two bosses were remade on 2026-11-16, after the look-and-fix pass checked every boss for lookalikes: the first
Inflation Titan (`tools/gen/assets/boss-6-v1.json`) had a small domed head with two round lights that read as a
diving helmet with portholes, and the first Patrimony Phantom (`boss-11-v1.json`) a bare chrome skull with glowing
eyes over a metal ribcage that could read as a famous film robot's endoskeleton. New prompts (`boss06b-titan`,
`boss11b-phantom` in `concepts.js`) follow the game's own descriptions ("a valve wheel for a head"; "half plate,
half bone", hooded). The first versions' cost stays in the spend log.

Two more were remade after Boss Rush's one review (2026-11-16): the first Product Pusher (`boss-1-v1.json`) had a
smooth chrome face in dark glasses that read as a famous film cyborg, and the first Longevity Lich (`boss-7-v1.json`)
looked too much like the other undead bosses. The new Pusher (`boss01c-pusher`; a first redraw, `boss01b`, had a round
chrome helmet with a dark visor too close to a famous music duo's helmets and was not built) has slick chrome hair and
a faceplate with eye slits and a grin; the new Lich (`boss07b-lich`) is a clockwork lich with an hourglass for a chest.
The Lich's robe matched its part split poorly, so the build tool gained two rules (`limbRadius`, `armRadius` in
`process-rigged.mjs`): robe pieces that the split had put on a leg or an arm, farther from that limb's line than the
limb itself reaches, go to the trunk bone at their height, so the robe no longer flies off with a raised arm.

The war rig was made twice too. The first (`tools/gen/assets/warrig-v1.json`, a six-wheeler from Rodin) did not meet
the owner's rules (one straight centreline, a symmetrical body, four wheels at the corners, no real car's grille or
lights) and neither did any other first-round candidate (coupes and pickups with real-car faces). The second round
was nine concepts from three new prompts (`warrig-a/b/c`), then Tripo multi-view, Tripo single-image and Rodin
multi-view candidates of the picked design, and one Tripo candidate of a second design.

The demon was made twice. The first (`tools/gen/assets/demon-v1.json`, concept `demon-c-sd-0`) was replaced after the
first independent review: its round chest core was too close to a known film armour, its face did not read and its
wings were noisy. The second round was nine concept images (three new prompts, `demon-d/e/f`), three Tripo and two
Rodin candidates; the pick is above. The first demon's cost stays in the spend log.

## Skies (`assets/sky/`)

Blockade Labs Skybox AI, Model 3 (8K equirectangular, 1 credit each), packed at 4096x2048 WebP. Each has a
`<name>.json` with its Blockade id, style, seed and prompt.

| File | Used for | Style | Checked |
|---|---|---|---|
| `blaster-deep-1.webp` | Risk Blaster: the main sky (magenta and cyan nebula, open space in every direction) | M3 Advanced (artistic) | seam, zenith and nadir clean |
| `blaster-deep-4.webp` | Risk Blaster: the ominous regions (crimson nebula on a dense star field) | M3 Advanced (photo/render) | seam runs through the red nebula without a join |
| `blaster-deep-5.webp` | Risk Blaster: the wormhole gate region (cyan and magenta vortices) | M3 Advanced (artistic) | seam clean |
| `racer-dawn.webp` | Nest Egg Run: age 25 (rose and teal dawn, stars above) | M3 Sky Dome | seam clean; a bright spot on the horizon (turned behind the game's own sun) |
| `racer-day.webp` | Nest Egg Run: the middle years (turquoise day, hot-pink cirrus) | M3 Sky Dome | seam clean, no sun disc |
| `racer-sunset.webp` | Nest Egg Run: golden hour (a great orange and pink lenticular cloud over a yellow horizon) | M3 Sky Dome | seam clean |
| `racer-sunset-b.webp` | Nest Egg Run: dusk (purple clouds rimmed in orange, painted mountain ranges, a sun disc on the horizon) | M3 Digital Painting | seam runs through a mountain without a join |
| `racer-night.webp` | Nest Egg Run: age 65 (stars and a violet milky way over a cyan and magenta horizon glow) | M3 Sky Dome | seam clean |
| `hub-hall.webp`, `hub-hall-b.webp` | Hub: two arcade halls, for reflections and light only (they carry made-up marquee lettering, so they are never shown as a backdrop) | M3 Concept Render; M3 Advanced (artistic) | seams clean |
| `title-dusk.webp`, `title-dusk-b.webp` | Title: a red and blue dusk over a mirror-flat plain; a painted dusk over mountains | M3 Sky Dome; M3 Digital Painting | seams clean |
| `exam-moon.webp` | Final Exam: a full moon in storm cloud over a paved court and a golden arch | M3 Advanced (artistic) | seam clean |
| `vault-gold.webp` | Memory Bank: the inside of a gold and steel vault | M3 Concept Render | seam clean |
| `guide-archive.webp` | Strategy Guide: a vaulted library with lamps and stained glass | M3 Concept Render | seam clean |
| `boss-storm.webp` | Boss Rush: the arena's sky (a violet storm vortex with magenta lightning) | M3 Advanced (artistic) | upper half only is used; the join is turned behind the camera |
| `boss-storm-b.webp` | Boss Rush: the industrial bosses' sky (dark teal storm over a far refinery, an orange fire pillar on the horizon) | M3 (style 146) | seam runs through the fire pillar without a join |
| `boss-void.webp` | Boss Rush: the undead bosses' and the Proctor's sky (a black spiral storm with violet lightning over red lava light and far spires) | M3 Scifi Concept Art | seam clean |

Rejected and deleted (2026-11-15; they were never committed and no code loads them): `blaster-nebula`,
`blaster-nebula-b`, `blaster-belt`, `blaster-graveyard`, `blaster-gate` (the first prompts came back as alien
landscapes with ground, ships and structures: not open space), `blaster-deep-2` (a band of different texture down
the seam), `blaster-deep-3` (a visible join through its bright star). Their seven credits stay in the spend log.
A second day sky (`racer-day-b`) had a visible join and was not kept. Skies for the other modes are generated and
are added to this table as each mode's phase picks them.

## Sprites drawn from the models (`assets/ui/`)

`tools/gen/render.js --sprites` draws each model alone on a clear ground into one strip, for the page's own (DOM)
interface. `icons.webp`: coin, star, heart, shield, bolt, medal, trophy (160 px cells, 27 KB). `bosses.webp`: a
head-and-shoulders portrait of each of the twelve bosses (192 px cells, 86 KB). A `.json` beside each gives the order.

## Sound (`assets/audio/`)

ElevenLabs. Effects: `eleven_text_to_sound_v2`, `prompt_influence` 0.45, a fixed duration per effect, 3 to 6 takes
each (the game plays the takes of a sound in turn, each at the volume that makes it as loud as the middle take). Loops: the same model with `loop: true`. Announcer: voice
"Harry" (`SOYHLrjzK2X1ezoPC6cr`), model `eleven_v3`, with a touch of echo and compression added in the build.
`audio.json` lists every cue's place in its sprite. Music is cut to a loop of whole four-bar phrases at the take's own measured tempo (all
ten tracks came within 0.06 BPM of what was asked), starting where the levels at both ends of the loop match.

| File | Holds | Size |
|---|---|---|
| `sfx-core.mp3` | hits (right, big, reject, hull, shield, metal), blasts (small, big, huge), debris, charge-ups, warning, lock-on, slow-motion, player hit, life lost, shield down, reward, right/wrong stings, menu sounds, coin, power-up, fanfare, game-over jingle, crowd; loops: alarm, charge hum | 1.7 MB, 125 s |
| `sfx-combat.mp3` | laser, heavy laser, plasma bolt, spent cell, beam, missile launch and hit, volley, energy wave, ground slam, boss roar, hurt, stagger, armour breaking, death, warp; loop: starfighter engine | 1.1 MB, 82 s |
| `sfx-racer.mp3` | crash, glass, skid, near miss, boost, gate pass; loops: engine, boost flames | 0.5 MB, 34 s |
| `sfx-hub.mp3` | loop: the arcade hall's ambience | 0.1 MB, 9 s |
| `voice.mp3` | 72 announcer lines ("Wave one" to "Wave ten", "Game over", "Stage clear", "Boss incoming", every boss's name, every game's name, "Welcome to the arcade", streak names, milestones ...) | 1.3 MB, 107 s |
| `music-blaster.mp3` | Risk Blaster's track: ElevenLabs `music_v2_5`, prompt `blaster` in `sounds.js` (driving 1980s synthwave, 64 s asked for), take 0 of 2, cut to a loop from 0.7 s to 59.9 s (the loop points are in `audio.json`) | 1.2 MB, 60 s |
| `music-racer.mp3` | Nest Egg Run's track: ElevenLabs `music_v2_5`, prompt `racer` in `sounds.js` (outrun synthwave, 118 BPM), take 0 of 2, cut to a loop from 0.7 s to 48.1 s | 0.9 MB, 48 s |
| `sfx-bosses.mp3` | Boss Rush: each boss's own roar (`roar_1` .. `roar_11`, `roar_all`, 3 takes each), a giant machine landing, a limb servo, powering up | 1.4 MB, 98 s |
| `music-boss.mp3` | Boss Rush's track: ElevenLabs `music_v2_5`, prompt `boss` (dark aggressive synthwave, 140 BPM), take 0 of 2, a loop from 0.7 s to 57.5 s | 1.1 MB, 58 s |
| `music-finalboss.mp3` | The Proctor's track: prompt `finalboss` (epic dark synthwave, 150 BPM), take 0 of 2, a loop from 0.7 s to 63.1 s | 1.2 MB, 63 s |
| `music-title.mp3`, `music-hub.mp3` | The title's theme (100 BPM) and the arcade hall's laid-back track (92 BPM): prompts `title`, `hub`, take 0 of 2 each | 1.0 MB each, about 50 s |
| `music-exam.mp3`, `music-memory.mp3`, `music-calm.mp3` | Final Exam (tense, solemn, 96 BPM), Memory Bank (mellow, 84 BPM), Strategy Guide (calm, 80 BPM): prompts `exam`, `memory` (take 1 of 2), `calm` (take 0 of 2) | about 1.0 MB each, about 50 s |

## Spend log

As of 2026-11-17 01:10 UTC (Phase 3 closed; Phase 4 in its fix round: a trophy stand made on request, and the deck, lectern and book remade brighter after its review). Balances are read live from
each provider; failed calls are not charged by any of the four. Every paid call is a line of
`tools/gen/ledger.jsonl`.

| Provider | Start | Spent | Left | On what |
|---|---|---|---|---|
| Tripo | 4,465 credits, plus a 5,000-credit top-up on 2026-11-16 (9,465 in all) | 5,520 | 3,945 (checked live) | 34 image-to-3D at the highest settings (60 each), 24 at the standard settings (30 each: menu props, traffic, rocks, ships), 1 multi-view-to-3D (60), 1 text-to-3D (50), 24 segmentations (40 each), 16 auto rigs (25 each), 32 retarget requests (129 clips at 10 each), 17 rig checks (free); the four boss remakes cost 1,080 (Titan and Phantom 530, Pusher 285, Lich 265) |
| fal.ai | $49.90 | $28.01 | $21.89 | 25 Rodin Gen-2.5 runs, 94 Seedream 5.5 concept images, 19 Nano Banana Pro concept images, 4 Nano Banana Pro edits (elevation views) |
| ElevenLabs | 131,000 credits | about 25,750 | about 105,250 | 495 sound effects and loops (11 credits a second), 80 announcer lines, 19 music runs (about 880 credits each); the provider's own counter lags by some minutes |
| Blockade Labs | plan credits | 26 | not reported by the API | 26 skies (Model 3, 1 credit each) |

The bosses cost more Tripo credits than first projected (about 1,700 against about 1,000 to 1,450): building them as
rigid parts needs a part segmentation of each (40), and each got eight clips (80), not six. Tripo was then down to 145
credits; the owner topped it up by 5,000 on 2026-11-16 and asked that Tripo be used for the menu props and for
remaking any boss or asset that looks weak in a review, rather than falling back to Rodin or procedural shapes.

One mistake is in the fal.ai figure: on 2026-11-15 a syntax check of `concepts.js` ran the generator by accident and
redrew six existing concept prompts before it was stopped ($0.84). The duplicates were not used. The check is now
done with `node --check`, which does not run the script.
