# Risk Blaster: round 1 review

Judged only from the 22 captures and `sound-cues.md`. Tiles are counted left to right, top to bottom, from 1.
"f" is frames after the answer is picked. Every strip was cropped and read at 2x to 5x; the crops are in `crops/`.
Colour and position figures were measured from the captures.

**Result: no axis reaches 4.5. Not done.**

## 1. Scores

| Axis | Score | Evidence |
|---|---|---|
| Detail | 3.5 | The models are good at rest (`20-beauty`: plated torso, ram horns, crisp fighter panels). But the demon's head has no readable face and its wings are noisy with a dotted outline (`20`, head and wings enlarged), and several effects are shapeless blobs (`13-attack-missiles` t21-24, `17-demon-death` t17-19). Worse strip scored: 13. |
| Lighting | 3.5 | Rim lights work, and the core's glow tints the chest plates (`20`). But the sky barely changes the models' colour (fighter hull RGB 121/142/169 in `01`, 120/137/161 under the crimson sky in `02`), and hits blow out: fighter chalk-white in `09-attack-volley` t10-24, whole band white in `11-attack-wave` t17-20. Worse strip scored: 11. |
| Materials | 3.5 | One glossy dark metal covers the demon's horns, armour, wings and tail (`20`). The fighter is one satin metal, and no glass is visible from the game's view (`01`). The emissive core and engine rings do read as light. No sky is recognisable in any reflection. |
| Depth | 4.0 | Near, mid and far are all there (fighter, drones, demon, blurred props, nebula: `16-armour-breakage` t4-12). But subjects merge: the demon is barely visible through `05-demon-entrance` t1-9, and the fighter is near-black on black in `16` t1 and `20`. |
| Motion | 4.0 | The right hit has flash, hold, recoil and settle (`07-right-hit` t1-12), and the swipe lunges with weight (`10-attack-swipe` t9-16). But drones blink out (`07` t6 to t7, `08` t7 to t8), the next question pops in under the death blast (`17` t18 to t19), recoil is about 2 px (`06-firing`), the beam has no weight (`12-attack-beam` t9-14), and all five attacks end in the same dome reaction. |
| Cohesion | 4.0 | Palette and glow language hold across HUD, drones and models (`18-question-full`). Outsiders: the lime-green DIRECT HIT sheet and NEXT button (`19`), flat tan debris and orange-brown smoke (`17` t20-24), low-poly boxy props in the mid-ground (`16` t4-12). |
| Legibility | 3.5 | Question and answer text are never touched, and right against wrong reads without text (`07` against `08`). But drone letters are washed for about 18 frames in `11` t15-20, doubled and pushed out of the band in `14-taking-damage` t6-8, smeared in `12` t15, and the next question's drones arrive under the blast in `17` t19-20. Worse strip scored: 11. |

At phone size the idle scene reads at a glance (`18`). During a hit the centre of the band is a stack of
translucent layers (dome, lattice, lunging demon, bleached fighter) and is hard to parse (`14` t7-12, `10` t14-24).

## 2. Requirements: 10 met, 11 weak, 0 missing

| # | Item | Mark | Shown in |
|---|---|---|---|
| 1 | Starfighter of quality, original | met | `01`, `20`: crisp panel work, original shape. No glass is visible from this view, and a flat dark plate sits under the engines. |
| 2 | Demon boss of quality, original | weak | `20`: strong body and silhouette. The head has two pink smudges for eyes and a jagged jaw, the wings are noisy, and the chest core recalls a known film armour (see Originality). |
| 3 | Sky lights the scene and shows in reflections; distinct skies | weak | `01`, `02`, `03`: three clearly different skies. But the hull is nearly the same pale blue-grey under each (121/142/169, 120/137/161, 108/138/167) and no sky can be recognised in a reflection. |
| 4 | Ship: bob, thruster flicker, banking, entrance | met | `04` entrance; `15` bob of 1.5 px either way, plume flicker of 5 %, bank; `06` turn toward the drone. The bob is barely visible. |
| 5 | Demon: entrance, tells, hit reactions, death | met | `05`, `09` to `13`, `07` t4-9, `17`. |
| 6 | Bolts: white core, coloured glow, tapered trail | met | `06` t5, t9. The head is a soft round ball. |
| 7 | Muzzle flash and a light on the ship | weak | `06` t3, t7: flash and sparks, yes. The wing panel beside the gun brightens by about 8 % (72 to 78), which cannot be seen. |
| 8 | Correct hit: burst, sparks, ring, bloom, shake; beam connects | met | `07` t1-9, `16` t2-8. |
| 9 | Wrong hit distinct and darker | met | `08` t7-12: dark-red ring, salmon sparks that fall, no lance, no shockwave; a sixth of the band wide. |
| 10 | Rapid fire: recoil, spent cells, barrel heat | weak | `06`: the barrel glow is there and lasts (`09` t4-9). Recoil is about 2 px. The cells are a few specks at the left wing tip. |
| 11 | Telegraph before every attack | met | `09` t1-7, `10` t1-7, `11` t1-8, `12` t1-8, `13` t1-8. The slow-motion beat is in the log only. |
| 12 | Distinct attack types, each with its own colour, trail, impact | weak | Swipe, wave and seekers are unmistakable. Volley and beam share a bracket-and-circle marker and thin pink lines (`09` t1-9 against `12` t1-14). All five land with the same flash and dome. |
| 13 | Projectiles readable, never covering text | weak | Plasma bolts are thin pink streaks on a magenta sky (`09` t8-9). The beam is about 3 CSS px wide (`12` t9-14). Wave rings, claw bars and seeker trails cross drone letters or rings (`11` t15-20, `14` t4, `13` t21-22). Question and answer text are never covered. |
| 14 | Player hit reaction | weak | `14` t6-12, `09` t10-24: flash, colour split, shake, small sparks, lattice. No smoke. The "blink" is a white-out of 40 frames or more. HUD cracks and the heart loss are in no capture: every hit strip shows the band only. |
| 15 | Low health | weak | `15`: red frame, yes; alarm, in the log. The "fire" is one fuzzy orange ball in place of the right plume, with no smoke. The frame's pulse is irregular: the red value in the band's corners runs 45, 67, 62, 54, 51, 59, 65, 62, 46, 64, 50, 48 over t1-12, three swells in 72 frames where the log says one per 67.5. |
| 16 | Boss: hit flashes, stagger, breakage, leaks, escalation | weak | `07` t1-9: flash and stagger. `16b`, `17a`: the escalation reads. The break itself is never seen (`16` t1: the tail is already gone). |
| 17 | Cinematic death | met | `17`: slow motion t2-8, chain t9-16, last blast and shock arc t17-18, debris t19-24, coins and stars t21-24. See defects 3 and 4. |
| 18 | Hit-stop | met | `07` t1-3: the demon holds one pose for three tiles while the burst and the shake run. The length cannot be proved at 2-frame spacing; a 1-frame strip from f12 would settle it. |
| 19 | Every effect keeps text and drone letters legible | weak | Text: yes, everywhere. Drone letters: no, in `11` t15-20, `14` t4 and t6-8, `12` t15, `13` t21-22, `17` t19-20. |
| 20 | Layered explosions | weak | `17` t13-24 has flash, orange fire, embers and smoke. The seeker impact (`13` t21-24) and the chain blasts (`17` t9-12) are single soft balls. |
| 21 | Sound synced to the picture | met | `sound-cues.md`: every landing is within 3 frames of its picture (volley f50 = `09` t9-10, swipe f45 = `10` t12-13, wave f58 = `11` t17, beam f50 = `12` t14-15, seekers f68 = `13` t20-21). Gaps: wave and beam have no warning cue besides the charge; "WAVE 2" is announced at f0, 79 frames before the demon dies; game over puts four sounds (jingle, announcer, explosion, roar) on one frame. |

Not captured, so not judged: the fighter blowing up at game over, and the HUD during a hit.

## 3. Defects, most damaging first

1. **The roared wave whites out the band.** `11-attack-wave` t15-20 (18 frames): fat soft white rings fill the
   band. Letter A fades to a pale ghost in t16, t18 and t19, B and C in t18, D in t16; the fighter is white on
   white in t18; the demon's wings vanish. *Fix:* thin hard-edged lilac rings (6 CSS px at most) with a clear
   interior, cap additive brightness below white, and draw the drone letter discs after the post-processing pass.

2. **Flash, colour split, glitch and shake are applied to the drones.** `14-taking-damage` t6: A and B are pushed
   up and cut by the band's top edge, and all four letters are doubled. `14` t7: B is sliced by the glitch.
   `12-attack-beam` t15: B is a red smear. `13-attack-missiles` t21: A is pink on pink. `10-attack-swipe` t13: the
   same. `14` t4: the claw bars cross C and bleach it. *Fix:* put the drone discs on a layer exempt from split,
   tint and shake; clamp the shake so nothing in the band's corners leaves it; draw the discs over the claw bars.

3. **The death collides with the next question.** `17-demon-death` t19 (f92): the next question, four new drones
   and the first answer panel are up while the last blast (f79) still covers the centre. A, C and D are washed in
   t19. Smoke, debris, coins and the warp then play over a live question (t20-24), with coins riding over drone A
   and the question panel's left border (t22-24). *Fix:* bring the chain and the last blast forward about 25
   frames so the flash is over before f90, or hold the question until the warp ends; route the coins clear of
   drone A.

4. **Shapeless white and yellow blobs.** Seeker impact, `13` t21-24: a cream mass on the fighter's dome for 12
   frames. Last blast, `17` t17-19: a white disc over half the band. Chain blasts, `17` t9-12: soft balls. Core
   flash, `07` t2-3: a white disc hides the demon's torso, with "+161" drawn on it (t1); "x5 COMBO" is magenta on
   pink in `16` t2. Neither popup can be read. *Fix:* build each blast from a small hot core (a third of the
   radius), a coloured fireball with lobes, a ring, 8 to 12 sparks and smoke; cap white; give popups a dark
   outline and place them above the burst.

5. **Beam and plasma volley are weak, and alike.** `12` t9-14: the beam is about 2 px wide in the tile (3 CSS px),
   a pointer line that sweeps only from the right gun to the dome. `09` t8-9: the plasma bolts are short thin pink
   streaks on a magenta nebula. Volley, beam and seekers all use a bracket-and-circle marker, in lilac, red and
   amber (`08` t2-12, `12` t1-8, `13` t1-8). *Fix:* a beam with a 12 to 16 px core, a wide halo, scorch sparks
   along its path and light on the hull; plasma as orbs of about 16 px with a white-cyan core and a dark rim; a
   marker of its own for the beam, such as a sweep arc.

6. **The fighter turns chalk-white for 40 frames or more after every hit.** `09` t10-24, `10` t14-24, `14` t7-12:
   hull colour and panel detail are gone under the dome. *Fix:* keep the hull's own colours, show the shield as a
   cyan shell brightest at its edge, and pulse it three times in 45 frames.

7. **The explanation sheet arrives on a timer, not on the hit.** It is up at about f46 whatever the attack:
   `13` t13-14, 22 frames before the seekers land at t21; `11` t13-14, before the wave lands at t17. "SHIELD DOWN"
   is read before the shield goes, and the sheet hides the band's bottom fifth (the fighter's engines, and in low
   health the burning one) through every hit reaction. The two swipe strips disagree: `10` shows it arriving with
   the flash at t13, `14` shows it up in t1-5 before the claw lands at t6. *Fix:* raise it about 20 frames after
   the `player_hit` frame.

8. **Parts vanish instead of breaking.** `16-armour-breakage` t1 (f12, one frame before the blow lands): the
   tail is already gone, and nothing flies off in t2-12, though this is the capture of the tail being shot away.
   `07` t1-6: the right drone stays whole under the lance for 12 frames after `correct`, then is gone between t6
   and t7. `08` t3-6: no fizzle shows on the first two pairs of bolts though `impact_reject` plays; the hex
   housing vanishes between t7 and t8. *Fix:* detach the tail on f13 and throw it spinning for about 30 frames
   with a spark trail; crack the housing on each pair and shatter it over 6 to 8 frames on the verdict frame.

9. **The demon does not hold up close.** `20-beauty`, head: the eyes are two soft pink smudges and the jaw is
   jagged noise. The wing blades carry noisy, smeared texture. Every silhouette edge has a dotted, stair-stepped
   light outline. Below the waist is a cluster of five cylinders. In the lunge (`14` t4-12, `10` t13-24), when it
   is largest, the head is a pink glow with no features. *Fix:* rebuild the head with cut emissive eye slits and
   a jaw that opens for the roar; clean the wing texture; fix the edge pass; design the pelvis.

10. **The sky and the guns light the models too weakly to see.** The hull is nearly the same colour under the
    purple, crimson and blue skies (`01`, `02`, `03`: 121/142/169, 120/137/161, 108/138/167). The muzzle flash raises the wing panel
    beside it by about 8 % (`06` t3, t7). *Fix:* light and reflect both models from the region's panorama
    strongly enough to see (a red key in the belt, blue at the gate); a point light at each muzzle for three
    frames at about three times the present strength, reaching the hull and the target drone.

11. **Subjects merge with the sky.** `05-demon-entrance` t1-9 (63 frames): the demon is a dark shape on dark space
    with no lights until t10. `16` t1, `12` t12-14, `20`: the fighter is near-black and held only by a thin cyan
    rim (left wing RGB 36/53/99 in `20` against 102/120/158 in `01`, same sky); the dark plate under its engines
    reads as a flat quad. *Fix:* light the core and eyes from the first frame of the fly-in and add a rim; give
    the fighter a fill that never lets the hull fall below mid-grey; remove or shape the plate.

12. **Low health does not read as burning.** `15-low-health` t1-12: the "fire" is one fuzzy orange ball where the
    right plume was, with no flame shape and no smoke; the red frame's pulse is irregular (item 15 above).
    *Fix:* a flame ribbon and dark smoke puffs trailing down-screen from the engine; drive the frame from the
    alarm's clock, one swell per tone.

Lesser, outside the twelve: the lime-green sheet, tan debris and orange-brown smoke sit outside the palette (`19`,
`17` t20-24); the spent cells are specks (`06`); in the warp the fighter rolls edge-on inside its bubble and reads
as a blue egg (`17` t24).

## 4. Originality

- **Demon's chest core.** A round glowing disc in a segmented ring bezel, centred in a plated chest (`20`, `01`).
  This is the chest reactor of a well-known film armoured hero in all but colour. Change the form: a vertical
  slit, a caged flame, a cluster of shards.
- Nothing else matches a known design. The demon (ram horns, blade wings, barbed tail) is a general archetype.
  The fighter (delta wing, three engines in a row, twin guns on the wing tips) shares the wing-tip gun idea with
  famous film fighters but not their shape. Drones, HUD and markers are generic.

## 5. Lowest score

3.5, shared by Detail, Lighting, Materials and Legibility. Capping additive white and keeping the drone discs
out of flash, split and shake (defects 1, 2, 4, 6) lifts Legibility and Lighting; Detail and Materials need the
demon's head and wings rebuilt with separate horn, membrane and armour materials (defect 9).
