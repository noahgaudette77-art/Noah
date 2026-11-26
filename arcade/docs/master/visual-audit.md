# INR Arcade: visual audit of the baseline stills

Scope: `docs/master/runs/baseline/stills/{phone,mac}/*.jpg` (21 stills each, phone 440 x 956, Mac 1470 x 830).
Method: every still viewed at full size; detail regions cropped and enlarged with ImageMagick (crops in
the reviewer's scratch folder (not kept), index at the end).
A few findings were checked against the source (`src/js/31b-library.js`, `src/js/24c-examboss.js`, `src/js/10d-titlehall.js`, `src/style.css`).
Nothing in the repository was modified.

Caveat: the stills are 1x, software-rendered. General softness, thin-line stair-stepping and the CRT/vignette darkening
are partly the capture. I mark something as an asset problem only where it is clearly the asset (flat untextured
surfaces, wrong content, wrong layout, a texture that reads as a smear at any resolution). Where 2x would change a
finding, the entry says so.

Coordinates are page pixels in the still (x from left, y from top).
Fix categories: **TEX** texture/material swap (CC0 PBR), **LIGHT** lighting change, **ENV** environment detail,
**MODEL** model regeneration, **CAM** composition/camera, **UI** UI/CSS. Effort: S (hours), M (a day or two), L (several days).

---

## 1. Is lighting/materials still the weakest axis?

**Yes for environments, no for hero models.** Compared with the earlier reviews, the hero assets are now
detailed and properly lit: the void demon, the ship, the racer car, the Product Pusher, the Inflation Titan, the vault door,
the hub's cabinets and floor. The weak axis has narrowed to **the environment surfaces around them**, which are still
flat-shaded, untextured, wireframe, or crushed to black:

| Screen | Lit/material state of the environment |
|---|---|
| Title hall (01-04d) | **Weak.** Floor is a black plane with a thin cyan grid (25-40% of the frame); walls flat dark navy; cell glass is flat tinted plastic; cell caps, brackets and base tops are untextured grey/violet boxes. |
| Hub (05) | **Strong.** Glossy floor with real neon reflections; the one scene that reads as "lit". Only the cabinet lower halves are crushed. |
| Blaster (07-08) | **Good.** Painted nebula plus lit models. Asteroids are flat grey lumps. |
| Racer (09) | **Weak at the sides.** Near facades are untextured boxes with flat emissive window rectangles; road shoulders are black. |
| Boss Rush (10) | **Weakest 3D scene.** Crowd is unlit black cut-outs, stands flat blue, pillars untextured boxes, floor empty. |
| Memory Bank (11-12) | **Weak.** Door is superb, but the wall of boxes is flat dark navy and the floor is a green wireframe grid. |
| Final Exam (13) | **Weak.** The boss is under-lit; columns are low-poly flat violet; the whole scene is one hue. |
| Strategy Guide (14) | **Mixed.** Near shelves are rich, but the middle-distance shelves fall back to a flat pale-beige tone that reads as empty. |

So the next lighting/material phase should target **floors, walls, glass, crowd, pillars, facades, shelves and columns**.
The hero models no longer need that work.

---

## 2. Ranked: the 25 weakest items (most damaging first)

| # | Screen | Device | Problem | Fix | Effort |
|---|---|---|---|---|---|
| 1 | 10 Boss Rush | both | Arena is placeholder-grade: crowd = rows of unlit black cut-out silhouettes on flat blue stand walls; pillars = untextured magenta/teal boxes with a flat banner; floor dark and empty with thin cyan lines | MODEL (lit instanced low-poly crowd) + TEX (stone/metal pillars, concrete stands) + LIGHT | L |
| 2 | 01-02 Title glide | both | Floor is a black void with a thin cyan grid filling 25-40% of the frame (phone: bottom 35-40%); no deck material, no reflection of the coloured cells; walls flat unlit navy | TEX (CC0 metal deck plates, low roughness for neon reflection) + LIGHT | M |
| 3 | 01-04d Title cells | both | Containment glass is flat tinted plastic (no Fresnel, no reflection, boss fully tinted); caps, brackets and base tops are untextured grey/lavender boxes, prominent in every close-up | TEX (glass with env reflection/Fresnel; painted/brushed steel with edge wear) | M |
| 4 | 13 Final Exam | both | Proctor is too dark: navy/black plates, near-black face with two eye dots, low contrast in an all-violet hall; blocky static along plate edges; the mortarboard is a primitive slab | LIGHT (key + face/chest rim) + TEX + MODEL (mortarboard) | M |
| 5 | 14 Strategy Guide | both | Middle-distance shelves read empty: the shader's far "many books" tone is pale beige, brighter than the real books; phone shows no books at all (looks like prison bars) | TEX (fallback = mean of the spines, or mipmapped spine texture) | S/M |
| 6 | 09 Racer | Mac (phone less) | Near buildings (about 40% of the Mac frame) are untextured boxes with flat magenta/teal window rectangles; road shoulders crushed black | TEX (CC0 facade) + ENV (sills, AC units, signage) + LIGHT (lamp pools on wet asphalt) | M |
| 7 | 08 Blaster explanation | Mac | Explanation sheet is laid over the 2x2 answer tray; the cards peek out cut mid-word ("Salaries p", "A fixed sh", "ften not") and look broken, after every answer | UI | S |
| 8 | 11-12 Memory Bank | Mac | The 3D vault is squeezed into a 305 px letterbox strip; about 60% of the window is empty green-black; the box wall ends at x≈95/1375 in black void | CAM + ENV | M |
| 9 | 16 Results | both | Bottom button bar covers content: FLAWLESS badge cut in half (phone), MASTERY panel half hidden (Mac), "READ STAGE 4 NOTES" hidden under CHANGE STAGE (phone); stray teal glow band at x 0-305 (Mac) | UI | S |
| 10 | 03 Title end | Mac | Logo and INSERT COIN sit over the vault door (the glide's destination); only a dim slice of the door shows | CAM / UI | S |
| 11 | 04d / 06 / 13 | both | Proctor has three designs: black-chrome humanoid with red visor and pencil (cell); bulky violet mech with core and fists (exam); silver-white horned figure (select thumbnail) | MODEL / asset consistency | M |
| 12 | 13 Final Exam | Mac (phone) | Colonnade = low-poly octagonal flat violet columns on a flat violet backdrop; fists are dark blobs under the answer tray (Mac); shoulders cut off (phone) | TEX (CC0 marble) + CAM | M |
| 13 | 11-12 Memory Bank | both | Vault room: wall of boxes flat dark navy, floor a green polar wireframe grid (shimmer-prone), gold bars and trays at the door are mushy lumps | TEX (brushed steel boxes, polished dark floor with reflection) + MODEL | S/M |
| 14 | 06, 14-18 menus | both | Frosted-glass sheet (`backdrop-filter: blur(18px)`) over the live hub turns it into a lattice of murky violet-grey smudges above a thin magenta grid: reads as a dirty smear | UI (dedicated crisp backdrop, or a darker tint) | S |
| 15 | 07-08 Blaster | Mac | Ruler-straight scrim seams across the nebula at y≈172 and y≈660; ship thrusters cut by the tray; demon hidden behind the question panel during the explanation | UI (gradient scrims) + CAM | S |
| 16 | 06, 16, 17 | both | Tiny pre-rendered 3D icons (stars, medals, coins, torch, trophy) are brown smudges at 10-16 px; unearned stars are invisible | UI (flat pixel icon set; re-render award art at 2-3x) | S/M |
| 17 | 10 Boss Rush | both | Wizard is a smooth plastic toy (cape with no folds or fabric, plain cone hat) next to a chrome boss; cut off at the waist on phone | MODEL + CAM | M |
| 18 | 01-02 Title glide | phone | Cells only ≈100 px tall and cut at both edges; bottom 35-40% empty floor; the top third is ceiling | CAM | S/M |
| 19 | 01-02 Title glide | both | World-2 skylight shows a non-sky panorama crop (gold arc, streaks) that reads as a smear; nebula side windows at full saturation outshine the cells; corridor-end laser fence is a clipped pink-white blob | TEX + LIGHT | S |
| 20 | 04-04d close-ups | both | Mac: HUD "MASTERY 0%" printed over the cell's name plate (04b-04d); name plate cut off (04); "TAP TO ENTER" on hazard stripes (phone, Mac) | UI / CAM | S |
| 21 | 04c-04d cells | both | White scribbles drawn over the Proctor in its cell; BREACH ALERT shown only by a small red label (no red light, no rim, no beacon) | ENV + LIGHT | S |
| 22 | 05 Hub | both | Single-pixel laser lines (vertical at x≈517 through the frame, diagonal top right) read as glitches; cabinet lower halves flat black; GAME ON neon hidden behind the ship topper | LIGHT/FX + CAM | S |
| 23 | 09 Racer | both | Floating rings plus an unexplained outlined circle glyph clutter the vanishing point right behind the TRUE/FALSE pods | CAM / ENV | S |
| 24 | 06, 14, 15, 17 | Mac | Text collisions: boss names and bars hit the card edges (select); "PAGE 1•3" under the corner tab (guide chapter); "CARDS 0%" jammed (guide); 4-up trophy cards wrap to 3-4 lines (stats) | UI | S |
| 25 | 07 Blaster | both | Asteroids are flat-shaded grey low-poly lumps; C drone has box side-pods; ringed planet hidden behind the B drone | TEX/MODEL + CAM | S |

---

## 3. Per screen

### 01 Title hall, glide early

**Mac**
- **Floor** (y 600-830, full width): a black plane with a thin cyan grid and yellow hazard dashes, about 25% of the frame. It has no deck material and does not reflect the cyan/violet/yellow/pink cells. Thin single lines will shimmer in motion. *Why:* the first thing every session shows is a large black void. **TEX** (CC0 metal deck plates; low roughness so the cells and lasers reflect) + **LIGHT**. **M**. (crop `m01-floor.png`)
- **Side windows** (x 40-290 and 1110-1330, y 150-590): a flat nebula picture at full saturation. They are as bright as the cells, so they pull the eye off the bosses and flatten the depth; slightly soft at this range. **LIGHT/CAM** (dim to about 50%, add a glass sheen or parallax). **S**. (`m01-wallpanel.png`)
- **Corridor end** (x 600-800, y 480-560): the laser fence is a clipped pink-white blob of soft dots, over-bloomed. **LIGHT/FX** (crisp beams, lower bloom threshold there). **S**. (`m01-corridorend.png`)
- **Cell glass**: flat tinted cyan/pink plastic. The boss inside is fully tinted; there is no Fresnel edge and no highlight or reflection. **TEX** (physical glass with env reflection). **M**. (`m01-cellL.png`)
- "TAP TO ENTER" (y 777) is thin grey text on the black floor: low contrast. **UI**. **S**.

**Phone**
- The cells are small (≈100 px tall, y 450-620) and cut at both edges. The bottom 35% (y 640-956) is an empty black floor grid with "TAP TO ENTER" floating in it, and the top third is ceiling. **CAM** (lower and tilt the lens on portrait, or narrow the aisle so the cells fill the width). **S/M**.

**Keep:** symmetric vanishing-point composition, colour-coded cells, hazard stripes, ring lamps, ceiling skylights, cyan neon edge lines.

### 02 Title hall, glide middle

**Both**
- **World-2 ceiling skylight** (Mac x 540-940, y 175-290; phone y 230-340): it shows a crop of a non-sky panorama (the vault's gold arc, grey streaks, and orange blotches in the next panel). From below it reads as an abstract smear. On phone it is the dominant element of the top third. **TEX** (sky-like crops only, e.g. clouds/nebula, or a lit ribbed ceiling). **S**. (The code comment at `10d-titlehall.js:26` lists "the vault's gold" as that world's skylight.)
- **Corridor end** again over-bloomed (x 620-870, y 510-545). The tiny figure under a cone light at the vanishing point is unreadable. **LIGHT**. **S**.

**Mac**
- Side wall picture panels (x 0-130, y 200-420; x 1330-1470, y 100-600) are violet clouds and pink "sand" with smeared edges, reading as soft posters. **TEX**. **S**.

**Phone**
- The bottom 35-40% (y 620-956) is empty floor again.

**Keep:** the near cells (Group Golem, Inflation Titan) with amber glass and gold bosses that read, the CONTAINED / BREACH ALERT base screens, the angled name plates.

### 03 Title end (vault and logo)

**Mac**
- The **logo** (x 330-1110, y 115-370) and **INSERT COIN** sit right over the vault door; only a dim slice shows (x 620-850, y 380-520). The glide's climax is buried. **CAM/UI** (frame the vault lower and smaller on landscape, or put the logo higher/smaller so the door shows whole). **S**.
- Near cell structure (clamps, brackets, cap disc) is flat grey untextured boxes, a primitive look at close range. **TEX**. **S/M**. (`m03-proctorcell.png`)
- White chalk-like scribbles on the back wall of the Proctor's red cell (x 1100-1230, y 280-450) read as random noise over the boss. **ENV**. **S**.
- The left edge (x 0-80, y 150-450) is a dark muddy arch panorama. The lower half beside the fact card is mostly black. **LIGHT**. **S**.
- The fact card's lower third is empty (text ends at y 740, the box at y 785). **UI**. **S**.
- The overlap checker's "INR / INR" and "ARCADE / ARCADE" are the logo's glow copy: a false positive.

**Phone**
- Works well: the vault is centred under the logo and flanked by two arcade cabinets, with INSERT COIN and the fact card below. The pedestal steps are plain boxes with magenta lines (minor).

**Keep:** the logo treatment (cyan-white INR, pink-to-orange ARCADE), the flanking cabinets, and the whole phone composition.

### 04 Cell close-up (Product Pusher)

**Both**
- The **base top** (Mac x 550-915, y 640-700; phone y 740-800 across the full width) is a flat pale lavender-grey plane with a cyan edge: untextured, reading as plastic. **TEX** (tread plate or painted steel with AO). **S**. (`m04-base.png`)
- The glass is flat tint, and the posts and brackets are untextured boxes (same item as 01). **M**.
- The **name plate is cut off** at the top edge ("PUSHER" at Mac x 840-890, y 10-30), so the close-up never names its boss. **CAM**. **S**.
- "TAP TO ENTER" sits on the hazard-striped base (Mac x 665-800, y 770-785). **UI**. **S**.

**Mac**
- The nebula window fills the left 35% (x 190-560, y 10-610) at full saturation, competing with the boss. **LIGHT**. **S**.

**Keep:** the boss in the tube (chrome, cyan light, briefcase), the CELL 01-L / CONTAINED screen, and the phone framing (it fills the screen).

### 04b Cell defeated

**Mac**
- The HUD's **"MASTERY 0%" is printed over the cell's "PRODUCT PUSHER" plate** (x 660-800, y 12-30): text over text. It is systematic on all Mac close-ups (04b, 04c, 04d). **UI/CAM** (hide the attract HUD's centre item during close-ups, or frame the plate lower). **S**. (`m04b-hudoverlap.png`)
- The left 30% (x 0-400, y 0-650) is a flat, unlit dark-navy wall. **LIGHT/ENV**. **S/M**.

**Phone**
- "TAP TO ENTER" (y 883) sits on the big diagonal yellow/black hazard stripes (y 780-956), so it is hard to read. **UI** (backing plate). **S**. (`p04b-bottom.png`)

**Keep:** the DEFEATED ✓ screen, the teal glass state change, and the boss reading clearly against the nebula behind the cell.

### 04c Cell alarm (Inflation Titan)

**Both**
- **The alarm state barely reads.** The only cue is a small red BREACH ALERT label on the base screen (Mac x 665-795, y 660-690). The glass stays amber, and there is no red beacon or strobe, no red rim on the boss, and no change in the room. In a still it looks like a normal cell. **LIGHT**. **S**.
- The cap (Mac x 625-850, y 95-200; phone y 110-230) is a flat violet box with a dark disc. **TEX**. **S**.

**Mac**
- "MASTERY 0%" is over "INFLATION TITAN" again.
- The left wall picture (x 220-355, y 215-495) is a dark, smudgy interior. The right 25% (x 1080-1470) is a crushed flat wall. **TEX/LIGHT**. **S**.

**Keep:** the Inflation Titan (gold chrome, gauge face) filling the phone frame, the best boss read in the title, and the storm/pink-sea window.

### 04d Cell: the Proctor

**Both**
- White scribble lines (chalk or arcs) are drawn over the Proctor's head and chest (Mac x 680-800, y 200-400; phone y 230-470), hiding the boss in its own close-up. **ENV/FX**. **S**.
- **Identity:** this Proctor (a black-chrome humanoid with a red visor, a coat and a red pencil) is not the Final Exam's Proctor (a navy/violet mech with a chest core, giant fists and a slab mortarboard), and neither matches the chapter-select thumbnail (a silver-white horned figure on dark red, apparently the raw model; `m06-proctorthumb.png`). **MODEL**/asset consistency. **M**.

**Mac**
- "MASTERY 0%" is over "THE PROCTOR". The left 40% (x 0-440, y 0-560) is a near-black wall; the arcade cabinet at x 40-180 is a nice touch.

**Keep:** the moon-over-clouds window and the lit cap.

### 05 Arcade hub

**Mac**
- Single-pixel laser beams: a vertical cyan-white line at **x≈517** runs from ceiling to floor (plus its reflection) and splits the left third across the REDLINE RALLY cabinet; a white diagonal crosses the top right (x 1050-1250, y 0-300). In a still they read as glitches, and in motion as shimmer. **LIGHT/FX** (soft volumetric cones, or remove). **S**. (`m05-lines.png`)
- The Boss Rush topper (dark hooded figure, x 1220-1310, y 120-200) is a black blob on the dark ceiling. **LIGHT** (rim). **S**.

**Both**
- The lower halves of the playable cabinets (Mac x 670-810, 905-1045 and 1170-1355; y 380-530) are flat black, with no side art and no material, only neon edges. **LIGHT + TEX** (fill/rim; laminate with side-art decals). **S/M**.
- The "GAME ON" neon (Mac x 770-860, y 180-195; phone x 270-360, y 275-290) is half hidden behind the Risk Blaster ship topper, and the INR neon (top right) is cut by the Boss Rush topper. **CAM**. **S**.

**Phone**
- The music button wraps alone onto a second row under the rank badge (x 15-55, y 112-148), which looks like a layout accident. **UI**. **S**.

**Keep (reference scene):** the glossy floor with real neon reflections, the named back-row cabinets with lit screens, the galaxy carpet, the Hall of Fame board, the jukebox, the toppers, and the phone framing. **This is the target look for the other environments.**

### 06 Chapter select

**Mac**
- Boss names and progress-segment bars run into the cards' right border with no padding: "SOLVENCY SPECTER" (card 3), "UNDUE INFLUENCER" (card 9), "PROBATE TOLLGATE" (card 10). **UI**. **S**. (`m06-card3.png`, `m06-card9-10.png`)
- The page margins (x 0-300, 1170-1470) are the shared blurred backdrop (see 16).

**Both**
- Star ratings are ≈10 px 3D-rendered sprites, and the unearned stars are dark-on-dark and nearly invisible (cards 6-10). **UI** (flat pixel stars; outlined empties). **S**. (`p06-stars.png`)
- Most boss thumbnails are grey metal on near-black, with little colour separation (exceptions: Perilmonger red, Inflation Titan gold, Longevity Lich green). **TEX/asset** (re-render with a world-coloured plate or rim). **S**.
- The FINAL BOSS thumbnail is a different Proctor (see 04d).

**Keep:** the world colour coding (cyan, gold, magenta, green) in headers and frames, the card hierarchy, and the phone stacking.

### 07 Risk Blaster

**Mac**
- **Hard scrim seams:** the HUD backdrop band ends in a ruler-straight edge at y≈172 across the full width, and the answer-tray band starts at y≈660. The nebula and starfield jump in brightness along both lines. **UI** (long gradient scrims). **S**. (`m07-botband.png`)
- The ship's thrusters (x 640-830, y 600-660), its best glow, are cut by the tray. **CAM** (raise the ship about 40 px on landscape). **S**.
- The ringed planet (x 1150-1300, y 310-375) is half hidden behind the B drone and has a flat cartoon texture. **CAM**. **S**.
- The C drone's side pods are flat purple boxes (x 110-140 and 250-275, y 445-490). **MODEL**. **S**.

**Both**
- Asteroids are flat-shaded grey low-poly lumps (Mac x 385-420 / y 480-515, x 400-430 / y 335-355, x 970-1000 / y 415-435, x 580-600 / y 185-215): a placeholder look against the painted nebula. **TEX** (CC0 rock) or **MODEL**. **S**.

**Phone**
- The thruster glow is clipped by the answer list (y≈675). Otherwise this is the best gameplay layout in the game.

**Keep:** the void demon (wings, horns, skull, cyan-lit armour), the ship, the nebula, and the hex answer drones colour-keyed to the answer cards. (`m07-demon.png`, `m07-ship.png`)

### 08 Risk Blaster, explanation sheet

**Mac**
- **The sheet (760 px, centred) is laid over the 2x2 answer tray instead of replacing it.** The answer cards peek out on both sides, cut mid-word: "Salaries p / agency sys", "A fixed sh / commission", "ften not" with a green check, "ne". It looks broken, and it happens after every answer. **UI** (hide the tray while the sheet shows, or make the sheet span the tray). **S**. (`m08-leftcards.png`; the overlap checker flags it.)
- At this moment the demon's upper body is behind the question panel; only claws and tail show (y 175-300). **CAM**. **S**. (`m08-demoncut.png`)

**Phone**
- Good: the sheet fully covers the answer list (the overlap checker's phone hits are text under an opaque sheet, invisible), and the ship and demon read above it.

### 09 Nest Egg Run (racer)

**Mac**
- **Near buildings** (x 0-420 and 1050-1470, y 180-600, about 40% of the frame) are untextured boxes: dark navy walls, with magenta (left) or teal (right) panes as flat emissive rectangles, and no frames, sills, AC units or wear. **TEX** (CC0 facade: concrete or metal panels with a window emissive map) + **ENV**. **M**. (`m09-leftbldg.png`)
- The lower corners (road shoulders x 1050-1470 and its mirror on the left, y 600-830) are crushed to black, with only a faint kerb line. **LIGHT** (street-lamp pools, wet-asphalt reflections like the hub floor). **S/M**. (`m09-rightroad.png`)

**Both**
- **Vanishing-point clutter:** floating rings (cyan, magenta, yellow) around the signs and a big outlined circle with a slanted ellipse and a gold dot in the sky centre. Their meaning is unclear, and they sit right behind the TRUE/FALSE pods. **CAM/ENV** (fewer, smaller, or tied to signs). **S**. (`m09-skyline.png`)

**Keep:** the car (gold egg in an armoured buggy; `m09-car.png`), the skyline with course-acronym neon (TFSA, RRSP, LIRA, GPP, RRIF), the sun at the vanishing point, the cyan/magenta road edges, and the phone framing.

### 10 Boss Rush

**Both**
- **The crowd** is rows of unlit black cut-out silhouettes on flat blue stand walls, with no shading, no colour and no variation in light. **MODEL** (instanced lit low-poly figures with a few colour variants, or a textured crowd card with rim light) + **TEX** (concrete/metal stands). **L**. (`m10-crowd.png`)
- **Pillars** are flat-shaded untextured boxes with magenta/teal faces and a flat banner with a diamond. **TEX** (stone or brushed metal, trim, emissive inlays). **S/M**. (`m10-pillarleft.png`)
- **The wizard** (back view, lower left) has a smooth plastic orange/red cape with no folds or fabric, and a plain cone hat: a matte toy beside the chrome boss. It is cut off at the waist by the answers on phone. **MODEL** + **CAM**. **M**. (`m10-wizard.png`)

**Mac**
- The floor (x 1170-1470 and the left mirror, y 660-830) is dark blue with thin cyan lines and nearly empty. **TEX/LIGHT**. **S**. (`m10-floorright.png`)

**Keep:** the Product Pusher (chrome, cyan tie light), the storm sky with lightning, the cyan searchlight shafts, and the phone framing of the boss.

### 11-12 Memory Bank (front and back)

**Mac**
- **Composition:** the 3D vault is a 1436 x 305 letterbox strip; below it about 60% of the window is flat green-black, with the card in the middle and x 0-450 / 1020-1470 (y 360-750) empty. **CAM/UI** (let the vault fill the window behind a floating card, as on the blaster). **M**.
- The safe-deposit wall ends at x≈95 and x≈1375, with black void beyond and the floor grid running on. **ENV/CAM**. **S**. (`m11-leftedge.png`)

**Both**
- **Page background** is green-black srgb(3,9,7), while select/menus are violet-black srgb(9,3,31) and results srgb(22,17,40). It is the only non-violet page. **UI**. **S**.
- The wall of boxes is dark navy and flat: no brushed-steel response, and no handles catching light. **TEX**. **S/M**.
- The floor is a black plane with thin green polar-grid lines: a wireframe look, shimmer-prone. **TEX** (polished dark stone or metal with reflection, as in the hub). **S/M**. (`m11-base.png`)
- The gold bars, cash trays and card stack at the door's base are small low-detail lumps; the dark red trays read as mush. **MODEL**. **S**.

**Keep:** the vault door (bronze rings, gold gears, rivets, glowing core; `m11-door.png`), the flashcard panel (gold frame, rivets, cyan border), and the answer buttons.

### 13 Final Exam (the Proctor)

**Both**
- **The boss is under-lit.** Its plates are navy/black and its face is nearly black with two violet eye dots. It has low contrast against the violet hall and a muddled silhouette. **LIGHT** (a cool key on the face and chest; brighter rim). **S/M**.
- **The mortarboard** is a primitive slab (flat navy top, brown edges, gold button) that reads as pasted on. **MODEL**. **S**. (`m13-head.png`)
- The armour plates show blocky static (stair-stepped dark rectangles and speckles along plate edges), probably the procedural panel-line overlay (`neonTile` in `24c-examboss.js`) over a coarse 2048 grayscale albedo. Partly the 1x capture, but it will shimmer at 2x. **TEX**. **M**. (`p13-scene.png`)
- **One hue:** boss, columns, backdrop and circle are all violet, so the boss does not separate from its hall. **LIGHT** (warm gold accents from the circle or lamps). **S**.

**Mac**
- **The colonnade** is low-poly octagonal flat-violet columns on a flat violet backdrop with faint vertical lines. **TEX** (CC0 marble) + **ENV**. **M**. (`m13-leftcol.png`)
- The giant fists (x 130-300 and 1200-1350, y 650-830) are dark blobs half under the answer tray. **CAM**. **S**. (`m13-fist` in `m10sky-m13fist.png`)

**Phone**
- The shoulders and fists are cut off at both edges, so the boss reads as a dark mass. **CAM**. **S**.

**Keep:** the zodiac magic circle, the arched windows with clouds, the answer cards, and the PREV/flag/NEXT bar.

### 14 Strategy Guide (the Archive)

**Both**
- **The shelves read empty.** In the middle distance they show pale pink-beige panels between dark violet uprights (`p14-leftshelf.png`, `m14-midshelf.png`). In `31b-library.js` (`libraryShelfMaterial`), once a spine is thinner than a pixel the books are replaced by a flat tone, `vec3(0.2, 0.165, 0.19)`, multiplied by the warm lamp light. That tone is **brighter and paler than the average of the real books**, so the far bays look like lit, empty back panels. On phone no books are visible at all, and the archive looks like a prison corridor. At 2x the detail holds to about twice the distance, but the fallback is still wrong. **TEX** (make the fallback the mean of the spines, darker and more saturated with per-row hue, which is S; or use a mipmapped spine texture, M). **S/M**.
- Floating sheets and the dark square at the top left of the rose window read as mush. **MODEL**. **S**.

**Mac**
- The page is a centred 860 px column with empty margins (x 0-300 / 1170-1470), and BACK plus the title sit at x 16-270, disconnected from the column (same on 15, 17, 18). **UI**. **S**.
- The cards show "32 CARDS 0%" with the percentage jammed against CARDS, and the grey thumbnails are low contrast. **UI**. **S**. (`m14-card3.png`)

**Keep:** the rose window, the lanterns, the colourful near shelves on Mac (`m14-books.png`), and the glowing open books.

### 15 Guide chapter

**Mac**
- "PAGE 1•3" collides with the folded-corner triangle on the section header. **UI**. **S**. (`m15-pagecorner.png`)

**Both**
- The title banner's library picture is murky and low contrast. **TEX** (re-render brighter). **S**. (`m15-banner.png`)

**Keep:** the clean hierarchy, the cyan primary button, and the client-file card with its pixel avatar.

### 16 Results

**Phone**
- The "NO MISSES · FLAWLESS" badge is cut in half by the bottom button bar, and a "READ STAGE 4 NOTES" button is hidden under CHANGE STAGE (overlap checker). **UI** (pad the scroll area by the bar's height; fade under the bar). **S**. (`p16-bottom.png`)

**Mac**
- The MASTERY panel is half hidden under the button bar. A dark-teal glow band runs from x=0 to the PLAY AGAIN button (y 760-815). **UI**. **S**. (`m16-bottom.png`, `m16-bottomleft.png`)

**Both**
- The award icons (3 stars on crystal bases, 5 stacked coins, a medal, a dark trophy) are small, soft pre-rendered sprites; the trophy is dark grey and muddy. **TEX/asset** (re-render at 2-3x, brighter). **S**. (`m16-icons.png`)
- **The backdrop** is the frosted-glass sheet (`style.css`: `.screen[style*="background:rgba(9,3,32"]`, `backdrop-filter: blur(18px)`) over the live hub. It turns the hub's lights into a regular lattice of violet-grey smudges (contrast-stretched in `bandcheck.png`, left half) above a thin magenta grid, and reads as a dirty smear. The same backdrop is used on 06, 14, 15, 17 and 18. **UI** (a dedicated crisp synthwave backdrop rendered once, or a darker, more opaque tint). **S**. (It also costs fill rate over a live canvas, which matters for the 60 FPS goal.)

**Keep:** the STAGE CLEAR title, the sunburst portrait frame, and the tile layout.

### 17 Stats

**Both**
- The 16 px pre-rendered 3D icons (medal, coin, torch, trophy) are illegible brown smudges; the flat "mastery" shield reads far better. **UI** (one flat pixel icon set). **S/M**.

**Mac**
- The 4-up trophy cards are too narrow: descriptions wrap to 3-4 lines ("20 right / answers in a / row"), icons and text sit at inconsistent heights, and the lock icon crowds the text. **UI** (3-up, or wider cards). **S**.

### 18 Setup

- Clean on both. On Mac, the SETUP title sits far left of the centred column, and the backdrop is as in 16.

---

## 4. Cross-screen consistency

- **Two levels of finish.** The hero models are detailed and lit (demon, ship, car, Product Pusher, Inflation Titan, vault door), while the environments around them are flat-shaded, untextured, wireframe or crushed. The hub's glossy reflective floor is the one environment that matches the heroes; it should be the reference for the title floor, racer shoulders, arena floor and vault floor.
- **Palette.** Violet-black is the base everywhere except Memory Bank (green-black page, green floor grid) and the Boss arena (royal-blue stands under a navy sky). The Final Exam collapses to a single violet, so the boss is lost. The answer colours (cyan A, magenta B, yellow C, orange D) and the world colours are consistent across every mode; keep them.
- **Floor languages differ by screen:** black with a cyan grid (title), glossy tiles (hub), a green polar wireframe (vault), a magenta grid (menus), blue lines (arena). They should converge on one reflective, materialled floor tinted per world.
- **Character identity.** The Proctor has three designs (cell, exam, select thumbnail). The wizard's matte toy style does not belong with the chrome bosses.
- **Mac vs phone.** The phone compositions are better on almost every screen (title end, blaster, racer, hub, memory). On the Mac, game screens leave hard scrim seams and cut the heroes at the tray, Memory Bank wastes 60% of the window, and the menu screens are a centred 860 px column with empty margins and a header pinned far left.

---

## 5. Crop index

All under the reviewer's scratch folder (not kept):

| Crop | Shows |
|---|---|
| `m01-floor.png` | Empty title floor |
| `m01-wallpanel.png` | Nebula side window |
| `m01-corridorend.png` | Over-bloomed laser fence |
| `m01-cellL.png` | Flat cell glass |
| `m02-ceiling.png`, `m02-rightwall.png` | Smeared skylight and wall posters |
| `m03-proctorcell.png` | Scribbles; untextured brackets |
| `m03-leftedge.png`, `m03-vault.png` | Title end edges and vault |
| `m04-base.png` | Flat lavender base top |
| `m04-boss.png`, `p04-top.png` | Cell close-up details |
| `m04b-hudoverlap.png` | HUD over the name plate |
| `p04b-top.png`, `p04b-bottom.png` | TAP TO ENTER on hazard stripes |
| `m04d-proctor.png`, `m04d-cabinet.png` | Proctor's cell and arcade cabinet |
| `m05-lines.png` | Laser lines in the hub |
| `m05-center.png`, `m05-bgcabs.png`, `m05-floorleft.png`, `m05-topright.png`, `p05-scene.png`, `p05-top.png` | Hub details |
| `m06-card3.png`, `m06-card9-10.png` | Edge clipping on cards |
| `p06-stars.png` | Invisible empty stars |
| `m06-finalboss.png`, `m06-proctorthumb.png` | Third Proctor design |
| `m07-topband.png`, `m07-botband.png` | Scrim seams |
| `m07-demon.png`, `m07-ship.png` | Strong models (keep) |
| `m08-leftcards.png` | Sheet over truncated cards |
| `m08-demoncut.png` | Demon behind the question panel |
| `m09-leftbldg.png` | Flat facades |
| `m09-skyline.png` | Vanishing-point clutter |
| `m09-car.png` | Strong (keep) |
| `m09-rightroad.png` | Crushed shoulder |
| `m10-crowd.png`, `m10-pillarleft.png`, `m10-wizard.png`, `m10-floorright.png`, `p10-scene.png` | Boss arena |
| `m10sky-m13fist.png` | Arena sky; exam fist under the tray |
| `m11-leftedge.png` | Wall ends in void |
| `m11-base.png` | Wireframe floor, mushy props |
| `m11-door.png` | Strong (keep) |
| `m13-head.png`, `p13-scene.png` | Dark Proctor, slab mortarboard, blocky static |
| `m13-leftcol.png` | Flat colonnade |
| `p14-leftshelf.png`, `m14-midshelf.png` | Empty-looking shelves |
| `m14-books.png` | Near shelves, good |
| `m14-center.png`, `p14-archive.png`, `m14-card3.png` | Archive and guide card details |
| `m15-pagecorner.png`, `m15-banner.png` | Guide chapter collision and banner |
| `m16-icons.png`, `m16-leftbg.png`, `m16-bottom.png`, `m16-bottomleft.png`, `p16-bottom.png` | Results |
| `bandcheck.png` | Contrast-stretched menu backdrop and exam backdrop |
