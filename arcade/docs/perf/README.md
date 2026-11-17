# Performance on a phone

The owner played on an iPhone 17 Pro Max and found every screen laggy, menus included. A shared cause was looked for
first. `tools/perf-report.js` measures each screen in a phone's window (440 x 956 page pixels at 3 device pixels each,
touch). This machine draws in software, so its frame rates mean nothing: what is compared is the work per frame, the
million pixels shaded across every render pass (the scene with its multisampling, the reflections, every
post-processing pass), the draw calls, the triangles and the lights. Real frame rates come from the phone: Setup > FPS
counter (it also shows the graphics tier and the lights).

## The checks the owner named, one by one

| Check | What it was | What it is now | Effect |
|---|---|---|---|
| Supersampling for edge smoothing | the three games drew at twice the screen's size: on a 3x phone, 2035 x 4422 (9 million pixels) with 4x multisampling | only at HIGH, only on screens under 1.5x density, within 4 million pixels: never on a phone | the largest single cost: the games' pixels per frame fell from about 70 million to under 15 at HIGH |
| Phone pixel ratio | the phone's own 3x: 1320 x 2868 | at most 2x (880 x 1912); 1.5x at LOW, 1.25x at LOWEST | 3.8 to 1.7 million pixels in every pass of every screen, menus included |
| Dynamic lights | 12 in each game, 6 to 8 in the rooms, most of them dark most of the time but still reckoned by every lit pixel | 9 to 10 in the games (one blast light instead of three, a faint lamp left to the sky's reflection); the rooms unchanged | small on this phone's graphics chip (a few per cent of a frame), but every lit shader is shorter and compiles faster |
| Shadow maps | none (shade is screen-space ambient occlusion and contact shadows) | ambient occlusion only at HIGH | none to remove |
| Glow and post-processing layers | 23 to 31 passes a frame at full density (bloom of seven levels, lens streaks, rays, depth of field, motion blur, ambient occlusion, film grade) | 15 to 20 at MEDIUM, where a phone starts (no ambient occlusion, depth of field, motion blur or lens streaks, six bloom levels); fewer again at LOW and LOWEST; every pass compiled once at start | with the two above: 30 to 72 million pixels a frame down to 8 to 13 |
| (found on the way) Stalls | shaders compiled and pictures sent to the chip the first time a thing appeared in play | all of it done behind the loading curtain | a minute of Risk Blaster: 11 compiles and 16 uploads mid-fight to 0 or 1 |

## Step 1: the shared cause (every screen)

| Change | Why it mattered |
|---|---|
| The drawing size is capped at 2 device pixels per page pixel | a 3x screen was drawn at 1320 x 2868 (3.8 million pixels); at 2x it is 880 x 1912 (1.7 million). The eye cannot tell at arm's length. |
| Supersampling only at HIGH, only on screens under 1.5x density, within 4 million pixels | the three games asked to be drawn twice as large to smooth edges; on a 3x phone that became 2035 x 4422 (9 million pixels) with 4x multisampling |
| Four quality tiers, chosen by the frame rate (Setup > Graphics: AUTO, or a fixed tier) | HIGH draws everything; MEDIUM (where phones start) drops ambient shade, depth of field, motion blur and lens streaks, one bloom level, and halves the multisampling; LOW also drops rays, reflections, sharpening and background extras, draws at 1.5x; LOWEST draws at 1.25x with a shorter bloom |
| Automatic scaling | a tier down when a quarter of frames run later than 18 ms; a careful try back up after 12 s of steady frames (a tier that drops again is tried less often) |
| No frosted glass over the live picture below HIGH (`body.lite`) | a dozen floating panels each blurred what was behind them, again on every frame and at full density; they are a shade more solid instead |
| Shadow maps | none were used (shade is screen-space ambient occlusion, now off from MEDIUM down) |

Million pixels shaded per frame, per screen (before; after at HIGH; after at MEDIUM, the phone's start):

| Screen | Before | HIGH | MEDIUM |
|---|---|---|---|
| Title | 34.9 | 17.8 | 12.8 |
| Hub | 32.4 | 14.4 | 9.9 |
| Risk Blaster | 68.5 | 13.8 | 8.3 |
| Nest Egg Run | 72.3 | 14.5 | 10.0 |
| Boss Rush | 71.8 | 14.4 | 9.9 |
| Memory Bank | 30.5 | 13.6 | 9.9 |
| Final Exam | 31.0 | 13.8 | 9.5 |
| Strategy Guide | 31.3 | 13.9 | 9.6 |

Render passes per frame fell from 23-31 to 15-24 at MEDIUM. (The triangle counts first written here, 2 to 3 million,
were wrong: the report read the renderer's running total across frames. It now counts each frame's own: Risk Blaster
draws about 0.24 million a frame, its reflection passes included.)

## Step 2: Risk Blaster (and the shared warm-up it needed)

On a fast phone the frame's steady work was no longer the worst of it: stalls were. `tools/perf-report.js` now also
counts what goes to the graphics chip besides drawing (texture and buffer uploads, calls that make the page wait,
shader compiles) and the main thread's own time per frame; `tools/scene-census.js` lists a screen's meshes and lights;
`tools/cpu-profile.js` samples the main thread. A minute of Risk Blaster's play compiled 11 shaders and sent 16
pictures to the chip as things first appeared (the first drones, a letter badge, an ally, a marker, a region's sky
and its mirror map): on a phone each is a stall of one frame or several.

| Change | Effect |
|---|---|
| The start-up warm-up (`GFX.warm`) now also readies every model the screen's files brought that it has not placed yet, every sky it may fly into, and pictures a screen swaps in later (`warmTextures`) | everything is compiled and sent behind the curtain |
| Risk Blaster readies its answer drones, all six letter badges and the dark glass round the demon at start (it did so only without the demon); every ally's model; each region's mirror map (it was made, a scene drawn six times, the first time a wave flew into the region) | a minute of play: shader compiles 11 to 1, pictures sent 16 to 0 or 1 |
| Shaders are checked for errors only on test pages (`#debug`) | each check made the page wait for the graphics chip, twice per new shader |
| Phones filter textures 4 times at a slant, not 16 | floors and roads seen low cost up to four times the reads |
| The letter badges are drawn twice their size on screen, not three times | 512 px, not 768: less to draw and send |
| One blast light, not three; the faint top lamp left to its card in the mirror map | lights 12 to 9 (every lit pixel reckons with each light the scene holds, lit or not) |
| The allies fly ahead of and above the fighter | they were outside a portrait phone's frame |

Risk Blaster at MEDIUM, a phone's window, 30 frames (before, after):

| | Before | After |
|---|---|---|
| Million pixels shaded per frame | 8.7 | 8.7 |
| Draw calls (the world's own) | 83 (68) | 83 (68) |
| Triangles | 0.24 million | 0.24 million |
| Lights (point / spot / directional) | 12 (6/1/5) | 9 (4/1/4) |
| Shader compiles in those frames | 24 | 0 |
| Pictures sent to the chip per frame | 341 KB | 0 |
| Waits on the chip per frame | 0.8 | 0 |
| Main thread per frame (this machine), worst frame | 11.3 ms, 543 ms | 2.5 ms, 25 ms |

The lights' own cost is small on this phone's graphics chip (a few per cent of a frame at this size); they were cut
as much for the size of every lit shader (its compile time) as for the frame.

## Step 3: Nest Egg Run

| Change | Effect |
|---|---|
| Everything a gate builds is readied at start: the letters on the road, each answer's badge with its glow and stem, the dark ring behind it, the bar they hang from (only the gantry and its signs were) | the first gate no longer compiles and sends its pictures |
| The warm-up draws every layer a screen keeps (the overlay's and the mirror's), and compiles every post-processing pass once (`pipe.compileAll`) | the road's contact shadows, turned on as the race starts, no longer compile then |
| One blast light, not three | lights 12 to 10 in a race |
| The road's textures filter at a slant as every other texture does (4 times on a phone, 16 on a desktop): they asked for 16 everywhere | the road seen low was the costliest surface to filter |

Nest Egg Run at MEDIUM, a phone's window (before, after):

| | Before | After |
|---|---|---|
| Million pixels shaded per frame | 10 | 10 |
| Draw calls (the world's own) | 115 (97) | 115 (97) |
| Triangles | 0.14 million | 0.13 million |
| Lights in a race | 12 | 10 |
| Shaders compiled in a minute and a half of play | 2 | 0 |
| Pictures sent to the chip per frame | 154 KB | 0 |
| Main thread per frame (this machine, which was busy), worst frame | 3.3 ms, 20 ms | 3.3 ms, 18 ms |

Left as they are: three drawing surfaces made the first time they are used, as the race starts (the road's mirror and
two half-size passes): memory, not a compile, and once.

## Step 4: Boss Rush

| Change | Effect |
|---|---|
| The combat kit's thin rings (waves of force, shocks on the floor) are built with the kit, not the first time one is asked for | the first ring of a fight no longer compiles mid-fight (in all three games) |
| One blast light, not three | the boss's own rig (key, two rims, an edge, a fill, the light from under it, its eyes) is left whole: lights 12 to 10 in a fight |

Boss Rush at MEDIUM, a phone's window: 9.9 million pixels a frame, 19 passes, 81 draw calls; a minute and a half of
play compiles 0 shaders (was 1). Still sent mid-fight: two small pictures (an ember, 64 px; a sign, 64 x 88), too small
to matter.

## Step 5: the menus and the rooms

The title, the hall, Memory Bank, the Final Exam and the Strategy Guide at MEDIUM, a phone's window, 30 frames: none
compiles a shader or sends a picture in play (the hall waits for its models before it is built, so the warm-up holds
them all), and their main thread is 1 to 4 ms a frame on this machine.

| Screen | Million pixels a frame | Passes | Draw calls (world) | Triangles | Lights |
|---|---|---|---|---|---|
| Title | 8.7 | 17 | 129 (114) | 0.06 million | 0 |
| Hall | 9.9 | 19 | 70 (53) | 0.17 million | 6 |
| Memory Bank | 9.9 | 19 | 86 (69) | 0.33 million (the floor's mirror draws the room twice) | 6 |
| Final Exam | 9.5 | 18 | 91 (74) | 0.04 million in the questions | 8 |
| Strategy Guide | 9.6 | 19 | 59 (41) | 0.04 million | 3 |

The heaviest piece was in the Final Exam's ending: twelve bronze statues of the fallen bosses, 12K to 24K triangles
each (232K in all, drawn twice for the floor's reflection), seen small behind the wreck. They were rebuilt at the bar
for a figure seen small, about 7K each (90K in all); the shapes hold (one dark bronze material covers them in the
game). The other figures over that bar were lowered with them: the far lectern (14K to 8K), the three second-build
allies (15K to 9K each) and the second rival rig (17K to 9.5K).
