# Performance on a phone

The owner played on an iPhone 17 Pro Max and found every screen laggy, menus included. A shared cause was looked for
first. `tools/perf-report.js` measures each screen in a phone's window (440 x 956 page pixels at 3 device pixels each,
touch). This machine draws in software, so its frame rates mean nothing: what is compared is the work per frame, the
million pixels shaded across every render pass (the scene with its multisampling, the reflections, every
post-processing pass), the draw calls, the triangles and the lights. Real frame rates come from the phone: Setup > FPS
counter (it also shows the graphics tier and the lights).

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

Render passes per frame fell from 23-31 to 15-24 at MEDIUM. Still heavy, for the per-game steps: 2 to 3 million
triangles on the hub, Risk Blaster, Nest Egg Run and Memory Bank, and 8 to 12 lights on the games and the exam.
