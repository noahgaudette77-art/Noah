# Nest Egg Run: independent review (racer-r1)

**Verdict.** The mode reads at a glance at phone size: the rig, the lane badges and the gantry are always clear, the
question is never touched, and a right gate cannot be mistaken for a wrong one. The rig is a good, original model
that obeys the owner's rules. Eight defects should be fixed before the phase closes; the worst are a black sky on the
causeway and fire effects that have no shape anywhere they appear.

**Limits of the evidence.** Sound is judged from `sound-cues.md` only. HUD animations run on the real clock, so their
timing cannot be judged. Suspension, wheel spin and heat distortion cannot be confirmed from strips.

Tiles are counted left to right, top to bottom, from 1.

## 1. Scores

| Axis | Score | Evidence |
|---|---|---|
| Detail | 4.0 | The rig holds at full size (`19-beauty`, `17-question-full`); fire is airbrushed puffs (`15` tiles 5-12) and traffic is flat boxes (`19`, `12` tile 5). |
| Lighting | 4.0 | The rig takes each sky's colour (`01` to `05`) and the boost lights the road (`12` tiles 3-12); the rig is near-black in the night ending (`16` tiles 4-5). |
| Materials | 4.0 | Worn paint, emissive strips, glossy egg and wet road (`19`); buildings, gears and traffic are one matte (`01`, `12`). |
| Depth | 4.0 | Near rig, mid gantry, far skyline and sun in haze (`02` to `04`); black void in `13`; the rig merges in `09` tiles 17-18. |
| Motion | 4.0 | The wrong gate holds, swings and catches (`09` tiles 3-9) and the entrance brakes in (`06` tiles 3-8); flames are static wedges (`12`). |
| Cohesion | 3.5 | HUD, neon city and rig share a palette (`17`); the brass gears (`01`, `05`), box traffic (`11`, `19`) and beige sun (`02`) are outsiders. |
| Legibility | 4.0 | The question is untouched through the hit (`10`, all tiles) and badges are always on top (`08`, `09`, `14`); bad frames are `09` tiles 17-18, `08` tile 3 and `10` tile 1. |

## 2. Requirements

1. War rig, quality and rules: **met** (`warrig-check-flat`, `warrig-check-views`, `19`). Straight centreline,
   symmetrical, four corner wheels; light strips and louvres, no grille or lamp cluster. No smears or melted
   geometry found.
2. Five skies that light the scene: **weak**. Day, golden hour and dusk read and tint the rig (`02` to `04`). Dawn
   and night are hidden behind the downtown set (`01`, `05`). There is no sky at all in `13` tiles 11-12.
3. Vehicle animation: **met** for the entrance (`06`) and the lane change (`07` tiles 1-4). The boost squat is too
   small to see (`12`).
4. Crash impacts: **met** (`09`: sparks, shards, skid marks, tilted camera).
5. Near-miss whoosh and speed lines: **met** (`11` tiles 7-9).
6. Boost flames and heat distortion: **weak** (`12`). The flames read as wings; no distortion is visible.
7. Layered explosions: **weak** (`15` tiles 4-12). Flash, streaks, ring and ground light are there; the fire has no
   shape, and smoke and embers barely show.
8. Right and wrong apart at a glance: **met** (`08` against `09`).
9. Hit reaction: **met** (`09`, `10`). The invulnerability blink cannot be identified. The insured crash is its own
   event (`14`).
10. Last life: **weak** (`13`). The red frame and the alarm are there; the burning stack is a pale smudge with no
    trail.
11. Staged endings: **met** (`15`, `16`).
12. Hit-stop: **met** (`09` tiles 3-6: the swing holds, then goes).
13. Text and badges legible through every effect: **met** (`10`, `08`, `09`, `14`).
14. Sound synced: **met** for sync and coverage (`sound-cues.md`). Announcer lines collide (defect 5).

## 3. Major defects

1. **Black sky on the open causeway** (`13` tiles 11-12; the tunnel, tiles 1-10). On leaving the tunnel the bridge,
   lamps and cars are lit, but the sky, the skyline and the egg sun are pure black. Inside the tunnel the top half of
   the band is a black box with two rows of dots. If this is a fade-in, it reads as the sky failing to load. Fix: show
   the sky through the tunnel mouth as a bright portal that grows, never draw an open road without it, and give the
   tunnel walls passing neon strips.
2. **Boost flames read as orange wings** (`12` tiles 2-12; `08` tiles 1-12; `18`). Each stack throws a flat triangle
   sideways, and the pair is wider than the rig. This is on screen before every gate. At the entrance they are two
   large cream ovals (`06` tiles 3-5). Fix: narrow flame tongues that trail straight back toward the lens, white core
   to orange to red tips, flickering; cap the brightness so cores do not clip to cream; add the heat shimmer.
3. **The rig goes black** (`09` tiles 17-18, frames +30 and +32). The cab, nose and egg become a black silhouette on
   a dark street while the rear deck stays lit; it is unclear whether this is smoke or the blink. The night ending has
   the same problem: the rig turns to face the lens and only its neon strips show (`16` tiles 4-6). Fix: tint the
   smoke violet-grey with a lit rim and keep it under about 60% over the rig; blink brighter, not darker; add a warm
   rim light on the rig at night.
4. **Fire and smoke have no shape** (`13`, all tiles; `15` tiles 5-12). The last-life burning stack is a pale orange
   smudge beside the egg with no flame and no smoke trail. The wreck burns as two airbrushed puffs, and the second
   blast is a pink puff (`15` tile 7). Fix: the shaped flame of defect 2, dark smoke trailing back along the road,
   and visible embers.
5. **Announcer lines collide** (`sound-cues.md`). A fifth right answer fires "COMPOUNDING" and "Trophy unlocked" on
   the same frame, with six effects. "BULL RUN" is followed by "$100,000!" 24 frames later. At forced retirement
   "Trophy unlocked" and `levelup` land 44 frames after `gameover` starts. Fix: queue voice lines one at a time, about
   0.8 s apart, and hold trophy lines until the jingle has finished.
6. **The egg sun is flat and beige** (`02`, `03`). The title motif is a cream cut-out with no gradient, glow or
   highlight; it is the least saturated thing in the picture. Fix: a gold to orange to magenta gradient, a bloom
   halo and one specular glint.
7. **Brass gears and pipes downtown** (`01`, `05`, `17`). They sit on the vanishing point, so the egg sun and both
   downtown skies are hidden, and they are the one motif that is not neon. Under colour-split they turn lime green
   (`18`). Fix: clear them from the centre of the street and re-skin them dark with emissive rims.
8. **Traffic is placeholder boxes beside a detailed rig** (`11` tiles 3-6; `12` tiles 4-6; `19`). The near-miss
   vehicle is a cluster of teal blocks, and it is not clear what passed. Fix: the cheapest is dark silhouettes with
   head and tail light bars and a neon edge.

## 4. Minor notes

- `08` tile 3: "LIGHTNING!" sits across the top edge of gantry board B. "+$5,688" shows in one tile only; check on a
  device that it holds.
- `08` tiles 3-4: the right-gate burst is a pale veil that washes the rig; the rings are hairlines at phone size.
- `09` tiles 10-18: the glass shards are flat hot-pink triangles and read as confetti. The `explosion_small` cue at
  +9 has no visible blast (tiles 6-8).
- `14` tiles 11-12: the mint shell swells again 0.3 s after the first; it reads as a flicker.
- `15` tiles 2-4 and `16` tiles 2-4: half-faded lane badges linger over the ending; in `16` tile 2 all four re-light.
- `06` tiles 1-2: the road is a milky beige smear until the rig arrives.
- `18`: strong colour-split is still on when the explanation sheet is up.
- `04`: the orange-rimmed cloud at the left reads as a streak of fire.
- `01`, `17`: the egg's reflections go blotchy red and green; it reads less gold than in `19`.
- `09` tiles 7-18: the skid marks are orange dashes that look like painted chevrons.

## 5. Originality

Nothing is too close. The rig is its own design. Its nearest echoes are a Humvee-style cab in tan (`19`) and the
chunky, glow-wheeled proportions common to arcade car games. The name "war rig" belongs to Mad Max: Fury Road; the
model does not resemble that truck, but the name should stay out of player-facing text. The hover cars (`02`, `04`),
the neon signs and the orbit emblem match nothing known.
