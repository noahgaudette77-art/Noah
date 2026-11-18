# Cohesion pass: review r1

Tiles count left to right, top row first.

## Scores

| Axis | Score | Evidence |
|---|---|---|
| Detail | 3.5 | Hero models hold up (09; 10 t4); the new rocks are untextured blobs (07); the Boss Rush crowd is blockout (13). |
| Lighting | 3.5 | Traffic takes the sunset rim and the neon (04, 05); open space averages 10/255 (07); the tunnel exit blows out (17 t9). |
| Materials | 4 | Chrome and wet road reflect the neon (15, 05); the rocks are one matte maroon (07); the car's paint looks like foil (04). |
| Depth | 3.5 | The race's layers are clear (05, 12); ships and rocks sink into black (07). |
| Motion | 3.5 | The near miss passes cleanly (06 t5-12); brightness doubles in one step at the tunnel exit (17 t8-9). |
| Cohesion | 3.5 | Plates and type match everywhere (02). Outsiders: the Guide's pixel-art faces (02 t10), the blockout crowd (13), the near-black red region (07). |
| Legibility | 4 | Text always on dark plates (11-13), drones clear (09); the badges hide the traffic in lanes A and D (04, 06). |

## Checklist

1. One look: **weak**. The three game screens are pixel-identical in 01 and 02; only four quiet screens changed, and only slightly (03). The outsiders above remain.
2. Clear subject, nothing blown out or muddy: **weak**. 02 is fine, but 07 and 08 are muddy and 17 t9 is blown out.
3. Traffic: **weak**. Real 3D, varied, lit by the sky and the neon and reflected in the wet road (04-06, 17); no real make. But A and D cover the bus and van (04-06), and only rears are shown.
4. Ships and asteroids: **weak**. Real 3D, tinted by the region, and never over the drones or text (09, 15, 16). But they are near-black in 07, the rocks look like placeholders, and the fighter wing reads as fire.
5. Calm path: **met**. 11-14 look finished and readable. There is no calm-path strip, so flashing can't be checked.
6. Sizes and levels: **weak**. Levels met: music within 0.1 dB, effects within 1 dB, the announcer 12 dB over music, no clipping. The hall (3.55 MB) and the page (3.06 MB gzipped) are under 4 MB. But the other menu screens aren't measured, a first visit to the hall costs about 6.6 MB, and Risk Blaster grew to 15.72 MB.
7. Text readable: **met**. Questions, answers and HUD sit on plates or dark gradients (11-13); badges and drones are opaque (04, 09).
8. No lookalikes: **met**.

## Major defects

1. **Open space is muddy (07; 08, all tiles).** The mean is 10/255 (the other game captures average 37-72) and 89% of pixels are below 20; the freighter and tug are silhouettes. Fix: light ships and rocks with the nebula's red key and a cool rim, and raise the region's ambient toward 09.
2. **The tunnel exit flashes and pops (17 t7-12).** The mouth shows only a painted sky over an empty pale band. Tile 9 is a full-screen pink-white wash (mean 59 to 119 in one step) that the world fades in from. Fix: draw the bridge and road beyond the mouth, and ramp exposure and fog over at least half a second.
3. **The badges hide the traffic (04, 05; 06, all tiles).** A and D sit on the bus and van and cover a third to a half of each, hiding what is in those lanes. Fix: keep vehicles nearer than the gantry, or raise the badges above roof height.
4. **The asteroids look like placeholders (07, lower right and left edge).** Smooth, untextured low-poly blobs in one maroon, with no rim light or specular. Fix: a rock texture with surface detail, a rim light from the nebula, and varied tone and size.
5. **The fighter wing reads as enemy fire (07 upper right; 08 t3-6).** Black hulls trail long magenta streaks, the colour of answer B and the demon. Fix: light the hulls, add running lights, and shorten and recolour the trails.
6. **Nest Egg Run's buildings show static (04 skyline; 05, 06 the end of the street; 17 t12).** Flat boxes of blue-white noise with no windows; at night a slab of noise sits at the vanishing point. Fix: a window-grid texture, lit at night, that holds up at a distance.
7. **Boss Rush's crowd is blockout geometry (13; 02 t3).** Untextured boxes with polyhedron heads and stick arms stand beside a detailed chrome boss. Fix: a textured crowd, or silhouette cards lit from behind.

## Minor notes

- The car's tail bar ends in two black square blocks (04, 05, the left car).
- The Guide shows pixel-art faces for the same chapters that Select Stage shows as 3D bosses (02 t10, t6).
- The Final Exam proctor is the only warm, copper-lit subject, and its chest is a mottled smear (02 t9).
- The racer's top HUD sits on a gradient, not a plate, and ring signs show through behind "$1M" (12).
- Announcer lines span 5.3 dB, wider than music or effects.
- Strips 06, 08 and 17 don't state their frame spacing, and `STATUS.md` is cited but not in the folder.

## Originality

No lookalikes. The car is a generic 1980s glass-hatch wedge with a plain full-width tail bar. No grille, badge or distinctive lamp is visible, though no vehicle's front is ever shown. The van, bus, freighter and tug resemble no known design, and the demon is a generic horned, bat-winged serpent.
