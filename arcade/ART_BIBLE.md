# INR Arcade: the art bible

The look every screen keeps, and the test every new or remade asset passes (the master overhaul, Phase 2, 2026-11-23).
Generate from it (the prompts at the end); check against it (the checklist); the reference sheet
(`docs/art/reference-sheet.jpg`, made by `tools/gen/artbible.js`: the hall, a cell, the floor, the arena, the vault,
the exam hall, the street, the interface; each picture and its prompt in `docs/art/reference.json`) shows it. The
reference pictures are targets for light, material and colour, not assets of the game: what the game shows is made to
this look, not copied from them.

## 1. The world in one line

A neon arcade at night where the course's hard ideas are bosses in a containment hall: synthwave, chrome and glass, lit
by its own signs, deep violet-black around everything, every surface catching the neon.

## 2. Colour

**Grounds** (what everything sits on): void `#090320`, deep `#140a38`, line `#3d2c80`. Never pure black, never grey:
a shadow is a deep violet. **Ink:** `#f4efff` (text, the brightest whites), dim `#bdb4ee`.

**Neons, each with one job:**
| colour | hex | its job |
|---|---|---|
| cyan | `#35efff` | answer A; the player's side (the wizard's spells, the ship, the car's lights); "go" |
| magenta | `#ff3ad4` | answer B; the arcade's own signs; the bosses' threat glow |
| yellow | `#ffe14f` | answer C; warnings, hazard stripes, the timer |
| orange | `#ff8a2a` | answer D; fire, explosions |
| lime | `#4dffa6` | right (only after an answer is marked: never on an answer before) |
| red | `#ff4769` | wrong, damage, danger, an alarm |
| violet | `#a65fff` | the hall's ambient neon; mastery |
| gold | `#ffc93d` | money, rewards, the vault, trophies |

**Each world's pair** (its cell, its skylight, its game's arena): Risk Blaster cyan + violet; Nest Egg Run orange +
magenta; Boss Rush violet + cyan; Memory Bank gold + orange; Strategy Guide warm amber + lime; Final Exam ice blue
`#8fb4ff` + violet. A world's ground is still the violet-black: the pair is its light, not its floor.

**Rules:** at most two neons lead a frame, the world's pair; the answer colours appear only where answers are; a
boss never stands on its own colour (the cyan boss on a cyan arena is the mistake to avoid); saturation lives in light
and emission, surfaces stay darker and less saturated than the light that falls on them.

## 3. Light

- **The signs light the world.** Practical neons (tubes, screens, lamps, windows) are the light sources, each one with
  a light where the budget allows (3-5 drawn a screen: `scene.userData.lightBudget`) and a glow (emissive above 1.0 in
  the HDR picture: only what is brighter than white blooms).
- **Every hero has a key and a rim.** The key from the front-above in the world's warm or cool; the rim from behind in
  the world's second colour, so the silhouette reads against the dark. A boss's face and chest are never darker than
  the background behind them.
- **Floors reflect.** The hub is the reference: a polished dark floor that carries the neon's reflections. Every
  screen's floor is that floor in its world's tint (a mirror on the Mac tier, the environment's reflection and a
  painted sheen on the phone); never a flat black plane, never a bare wireframe grid.
- **Fog and haze separate the planes**: near, middle and far each a step lighter and cooler.
- **No crushed blacks** on what the player looks at: the darkest thing in a lit area is deep violet.

## 4. Materials (physical, then stylised)

| surface | how it is made | roughness / metal |
|---|---|---|
| floors (hall, arenas, vault) | CC0 PBR deck plate, polished concrete or stone (Poly Haven, ambientCG), darkened to the ground colour, tiled | 0.15-0.35 / 0.6-1.0 |
| walls and panels | CC0 painted metal or panelling with a normal map; inset light strips | 0.4-0.6 / 0.3-0.8 |
| structure (cell caps, brackets, posts, pillars) | CC0 brushed or painted steel, tread plate; never an untextured box | 0.3-0.5 / 0.8-1.0 |
| glass (cells, cabinets, the vault's windows) | thin, tinted, Fresnel edge, the environment reflected, the boss behind it seen clearly | 0.02-0.08 / 0 |
| bosses | chrome and enamel plates with emissive seams (as made); lit by key and rim | as made |
| the wizard | cloth with sheen and folds, a hat with a brim and a crease: storybook, but not plastic | 0.6-0.8 / 0 |
| crowds and background figures | lit low-poly figures with a rim and a few emissive accents; never black cut-outs | 0.6 / 0 |

Textures: a hero's maps at 2048, a prop's at 1024, a tiling material's at 1024 (repeated), mipmapped, anisotropy 4-8;
no stretched UVs (texels within 1:1.5 square); nothing larger than it is ever seen on the phone.

## 5. Type and interface

- HTML over the canvas, always (crisp at every density). Display: Press Start 2P; body: VT323.
- Panels: deep-violet glass (`--panel`) with a 1-2 px neon border in the context's colour; text at least 12 px on the
  phone, icons at least 20 px (drawn at 2-3x).
- The interface never covers the focal character or the thing the camera came for (the vault at the title's end, the
  boss's name plate, the ship's engines); a bar over scrolling content carries its own backdrop.
- Contrast: text against its backing at 4.5:1 or more.

## 6. Composition, by device

- **Phone (portrait):** the 3D picture lives in the band between the question and the answers; the hero fills that
  band's middle third; nothing important in the top or bottom 10% of the band.
- **Mac (landscape):** use the width: the 3D picture spans the window, the interface sits in columns or along an edge,
  not in a narrow phone column with empty sides; the camera frames wider, not just the phone's picture cropped.

## 7. Motion (from the animation pass)

Weight before speed: anticipation, a held strike, follow-through; procedural life between moves (breath, sway, gaze);
each boss its own tempo; the same motion at 60, 90 and 120 Hz (`07b-motion.js`). Reduced effects removes shake,
tremble and flicker, never information.

## 8. Effects

Bloom only on emission; trails and sparks in the effect's own colour; impacts read in one frame (a flash, a ring, a
puff) and are gone in under half a second; the screen never washes out (a flash lifts, it does not whiten the frame).

## 9. Checklist for any new or remade asset

1. Its colours are from section 2, in their jobs; a world's asset in its world's pair.
2. It reads as its material under the screen's lights (section 4); no untextured box, no flat plastic glass.
3. Its silhouette reads against the dark at phone size (the band's height) with its rim light.
4. Its textures are no larger than needed (section 4) and its triangles inside the screen's budget.
5. Seen beside the reference sheet and the screens next to it, it belongs.

## 10. Generating

- **fal.ai images** (concepts, reference, panels, posters): "synthwave neon arcade at night, deep violet-black ambient,
  chrome and glass, lit by neon signs in <world pair>, polished reflective floor, cinematic, high detail, no text";
  avoid: text, watermarks, daylight, grey, pastel.
- **Tripo / Rodin models** (only what is clearly below the bar): the concept image first, then both services from it,
  the better kept (choice logged in `ASSETS.md`); PBR textures at 2048, under 30K triangles for a prop, 60K for a hero.
- **Materials**: Poly Haven and ambientCG first (CC0, physical); generated textures only for what neither has (signs,
  screens, posters).
