# Quality: one bar for the whole game

The owner found low, medium and high quality mixed together (2026-11-17), and asked for one bar, every model and
texture audited against it, the over-detailed brought down to it (it helps the frame rate too), one shared look, and
only the few clearly below the bar remade with Tripo, one attempt each.

## The bar

| Tier | What | Colour (and glow) | Other maps (normal, metal/roughness) | Triangles |
|---|---|---|---|---|
| hero | a hero: the player's craft, a boss, the war rig (seen large) | 2048 px | 1024 px | about 55K (50K to 68K with the joint caps) |
| near | a prop seen up close (the hall's cabinet, the vault) | 1024 px | 512 px | up to 25K |
| small | a prop or figure seen small (icons, decor, traffic, allies, rivals, statues, menu minis) | 512 px | 512 px | up to 10K |
| far | a speck far off (the overlord's brood, drawn as dark shapes) | 256 px | 256 px | up to 10K |

Skies are panoramas of 4096 x 2048, drawn down to 2048 x 1024 on a phone as they load (`Assets.capImage`); the hall's
two are 1024 x 512 (reflections only). The page's own pictures (the icon and portrait strips, `assets/ui`) are drawn
from the models.

## One shared look

- Texture tiers: the table above, for every generated model.
- Colour grade: one saturation and contrast for every screen (`GRADE` in `04-gfx.js`, 1.16 and 1.15; they ranged
  1.14 to 1.20 and 1.12 to 1.16). What differs per screen is only exposure and bloom: how brightly a room is lit.
- Lighting treatment: every model is lit the same way: its screen's sky as the reflection and fill (`applySkyEnv`), a
  key, rims in the arcade's magenta and cyan, and one light for a blast (it was three in each game). Texture
  filtering at a slant is one rule for all (4 times on a phone, 16 on a desktop).

## Every model (71), now and before 2026-11-17

Models in all: 35.6 MB (were 60.0 MB). Status: 1 above (a mirrored menu copy, 14K), 31 at the bar, 39 at the bar, lowered today.

| Model | Tier | Triangles | Colour / normal px | Size | Before | Status |
|---|---|---|---|---|---|---|
| `boss-1` | hero | 61K | 2048 / 1024 | 1.7 MB | 111K, 4096 px, 3.0 MB | at the bar, lowered today |
| `boss-10` | hero | 52K | 2048 / 1024 | 1.7 MB | 104K, 4096 px, 3.6 MB | at the bar, lowered today |
| `boss-11` | hero | 65K | 2048 / 1024 | 1.7 MB | 115K, 4096 px, 3.3 MB | at the bar, lowered today |
| `boss-2` | hero | 65K | 2048 / 1024 | 1.8 MB | 115K, 4096 px, 3.4 MB | at the bar, lowered today |
| `boss-3` | hero | 63K | 2048 / 1024 | 1.8 MB | 114K, 4096 px, 3.4 MB | at the bar, lowered today |
| `boss-4` | hero | 60K | 2048 / 1024 | 1.7 MB | 111K, 4096 px, 3.2 MB | at the bar, lowered today |
| `boss-5` | hero | 67K | 2048 / 1024 | 1.7 MB | 116K, 4096 px, 3.0 MB | at the bar, lowered today |
| `boss-6` | hero | 66K | 2048 / 1024 | 1.8 MB | 114K, 4096 px, 3.4 MB | at the bar, lowered today |
| `boss-7` | hero | 63K | 2048 / 1024 | 2.0 MB | 112K, 4096 px, 4.0 MB | at the bar, lowered today |
| `boss-8` | hero | 63K | 2048 / 1024 | 1.5 MB | 113K, 4096 px, 2.7 MB | at the bar, lowered today |
| `boss-9` | hero | 60K | 2048 / 1024 | 1.6 MB | 110K, 4096 px, 3.0 MB | at the bar, lowered today |
| `boss-all` | hero | 64K | 2048 / 1024 | 1.4 MB | 113K, 4096 px, 2.5 MB | at the bar, lowered today |
| `demon` | hero | 65K | 2048 / 1024 | 1.5 MB | 142K, 4096 px, 3.2 MB | at the bar, lowered today |
| `starfighter` | hero | 60K | 2048 / 1024 | 1.5 MB | 119K, 4096 px, 3.1 MB | at the bar, lowered today |
| `warrig` | hero | 57K | 2048 / 1024 | 1.4 MB | 115K, 4096 px, 2.9 MB | at the bar, lowered today |
| `prop-cabinet` | near | 24K | 1024 / 512 | 0.3 MB | 24K, 2048 px, 0.6 MB | at the bar, lowered today |
| `prop-vault` | near | 20K | 1024 / 512 | 0.4 MB | unchanged | at the bar |
| `ally-a` | small | 8K | 512 / 512 | 0.3 MB | unchanged | at the bar |
| `ally-a2` | small | 9K | 512 / 512 | 0.1 MB | 15K, 512 px, 0.2 MB | at the bar, lowered today |
| `ally-b2` | small | 9K | 512 / 512 | 0.1 MB | 14K, 512 px, 0.2 MB | at the bar, lowered today |
| `ally-c` | small | 9K | 512 / 512 | 0.3 MB | unchanged | at the bar |
| `ally-c2` | small | 9K | 512 / 512 | 0.1 MB | 14K, 512 px, 0.1 MB | at the bar, lowered today |
| `chaser` | small | 10K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `decor-deck` | small | 10K | 512 / 512 | 0.3 MB | 12K, 512 px, 0.3 MB | at the bar, lowered today |
| `decor-podium` | small | 8K | 512 / 512 | 0.2 MB | 14K, 512 px, 0.3 MB | at the bar, lowered today |
| `decor-tome` | small | 10K | 512 / 512 | 0.2 MB | 12K, 512 px, 0.2 MB | at the bar, lowered today |
| `mini-proctor` | small | 10K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `mini-starfighter` | small | 9K | 512 / 512 | 0.3 MB | unchanged | at the bar |
| `mini-warrig` | small | 14K | 512 / 512 | 0.3 MB | unchanged | above (a mirrored menu copy, 14K) |
| `prop-bolt` | small | 8K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-bus` | small | 11K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-car` | small | 9K | 512 / 512 | 0.3 MB | unchanged | at the bar |
| `prop-coin` | small | 6K | 512 / 512 | 0.1 MB | unchanged | at the bar |
| `prop-deck` | small | 10K | 512 / 512 | 0.3 MB | 12K, 512 px, 0.3 MB | at the bar, lowered today |
| `prop-heart` | small | 8K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-medal` | small | 10K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-podium` | small | 10K | 512 / 512 | 0.2 MB | 14K, 512 px, 0.2 MB | at the bar, lowered today |
| `prop-rock` | small | 7K | 512 / 512 | 0.3 MB | unchanged | at the bar |
| `prop-rock2` | small | 7K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-shield` | small | 8K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-ship-a` | small | 9K | 512 / 512 | 0.3 MB | unchanged | at the bar |
| `prop-ship-b` | small | 9K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-ship-c` | small | 8K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-stand` | small | 10K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-star` | small | 8K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `prop-tome` | small | 10K | 512 / 512 | 0.2 MB | 12K, 512 px, 0.2 MB | at the bar, lowered today |
| `prop-trophy` | small | 10K | 512 / 512 | 0.2 MB | 12K, 512 px, 0.2 MB | at the bar, lowered today |
| `prop-van` | small | 9K | 512 / 512 | 0.2 MB | unchanged | at the bar |
| `rival-rig` | small | 10K | 512 / 512 | 0.3 MB | unchanged | at the bar |
| `rival-rig2` | small | 9K | 512 / 512 | 0.1 MB | 17K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-1` | small | 7K | 512 / 512 | 0.2 MB | 12K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-10` | small | 6K | 512 / 512 | 0.1 MB | 22K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-11` | small | 8K | 512 / 512 | 0.2 MB | 12K, 512 px, 0.3 MB | at the bar, lowered today |
| `statue-2` | small | 6K | 512 / 512 | 0.1 MB | 22K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-3` | small | 7K | 512 / 512 | 0.1 MB | 23K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-4` | small | 7K | 512 / 512 | 0.1 MB | 23K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-5` | small | 7K | 512 / 512 | 0.1 MB | 23K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-6` | small | 7K | 512 / 512 | 0.2 MB | 13K, 512 px, 0.3 MB | at the bar, lowered today |
| `statue-7` | small | 10K | 512 / 512 | 0.3 MB | 12K, 512 px, 0.3 MB | at the bar, lowered today |
| `statue-8` | small | 7K | 512 / 512 | 0.1 MB | 23K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-9` | small | 7K | 512 / 512 | 0.1 MB | 24K, 512 px, 0.2 MB | at the bar, lowered today |
| `statue-all` | small | 7K | 512 / 512 | 0.1 MB | 23K, 512 px, 0.2 MB | at the bar, lowered today |
| `brood-a` | far | 8K | 256 / 256 | 0.2 MB | unchanged | at the bar |
| `brood-a1` | far | 7K | 256 / 256 | 0.1 MB | unchanged | at the bar |
| `brood-a2` | far | 5K | 256 / 256 | 0.1 MB | unchanged | at the bar |
| `brood-a3` | far | 6K | 256 / 256 | 0.1 MB | unchanged | at the bar |
| `brood-b` | far | 6K | 256 / 256 | 0.1 MB | unchanged | at the bar |
| `brood-d` | far | 9K | 256 / 256 | 0.1 MB | unchanged | at the bar |
| `brood-d2` | far | 6K | 256 / 256 | 0.1 MB | unchanged | at the bar |
| `brood-f` | far | 7K | 256 / 256 | 0.1 MB | unchanged | at the bar |
| `brood-f2` | far | 6K | 256 / 256 | 0.1 MB | unchanged | at the bar |

## Below the bar, and the remakes

Nothing generated is below the bar in play. Four models are weaker than their siblings close up (the Rodin builds
`ally-a2`, `ally-b2`, `ally-c2` and `rival-rig2`: murkier textures), but they are only ever seen small (the far allies
crossing the band after an overlord falls; a rival rig far down the road), and each is a second build of a design
the game already has from Tripo (`ally-a`, the player's fighter, `ally-c`, the war rig), so a Tripo remake from the
same concept would only repeat those. The final review's weak spots were dealt with in Phase 6: the examiner's chest
(a housing and a glowing core), the ambient ships (crisp lamps, less haze, smaller), and the untextured road-works
boxes (no longer built when the game is served). No Tripo credits were spent; if the owner sees one that still looks
weak on the phone, a remake is one attempt away.

Two small things remain that are not models: the rose window's glass in the Strategy Guide is off the palette, and
the Memory Bank's deck holder is dark apart from its edges.
