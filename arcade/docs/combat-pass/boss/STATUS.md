# Boss Rush (Phase 3): where the work stands

A running note, kept current so the work can be picked up if it is interrupted. The brief is the owner's Phase 3
plan (`arcade/PROGRESS.md`, "Order of work"); the contract is `arcade/docs/combat-pass/README.md`.

## Files

- `src/js/22c-bossarena.js`: `BOSS_SKY`, `BOSS_BASE` and `BOSS_ROW` (the table: one row per boss), `BossArena` (the
  storm sky as backdrop, environment light and lightning).
- `src/js/22d-bossactor.js`: `BOSS_CLIP` (the clips' key moments), `BossActor` (any rigged boss: poses the skeleton
  from its clips; parts torn off; a limp arm; the head following the lens).
- `src/js/22e-bosstollgate.js`: `BossTollgate` (boss 10, split parts animated by code; the same calls as the actor).
- `src/js/22f-bossstage.js`: `BOSS_ATK`, `BossStage` (everything seen and heard of the fight, on the show clock).
- `src/js/22g-bossflavor.js`: `BOSS_FX`, `BOSS_ART`, `BossFlavor` (each boss's own projectile, trail and impact).
- `src/js/22-boss.js`: the game. `this.pano` (a sky has loaded), `this.stage` (the boss's model has loaded: the
  fight is staged). From disk both are off and everything is as it was (`cyborgFrame`, `cyborgCamera`).
- Shared files touched: `08d-panosky.js` (`makePanoSky(sky, { window })`: a long-lens view of one part of a
  panorama; a sky made without it gets the same shader text as before), `08c-combatfx.js` (`wave`, `streak`,
  `gash`: thin rings and lines of light, built the first time one is asked for), `02-sound.js` (`finalboss` as a
  track name; the synth plays the boss tune for it).
- `tools/scenarios/boss-fight.js` (`BOSS=<key>`, `PARTS=...`), `tools/scenarios/boss-sound.js` (the cue log).

## Steps

| Step | What | State |
|---|---|---|
| 1 | Sky and light | done |
| 2 | The actor on boss 1 | done |
| 3 | The attack stage, hits, damage, death | done (five kinds; boss 1 looked at in strips) |
| 4 | Sound and the cue log | done (the log is written by `boss-sound.js`; run it again at the end) |
| 5a | All twelve bosses load and play with the table's defaults | done: each driven once (entrance, a right answer, a strike by timeout, a wrong answer, the finishing blow, the death) with no console errors |
| 5b | Look-and-fix, one boss per commit: 5, 10, 4, 2, 6, 3, 9, 7, 8, 11, all | done |
| 6 | Final captures (`docs/combat-pass/boss/*.jpg` and its README), the cue log, full regression both ways, the sequence test | done before the review; done again after the review's fix round (below) |
| R1 | The review's one fix round (`review/boss-r1/review.md`, the lead's rulings) | done: see below |

## The review's fix round (r1)

Major defects, by the review's numbers:

1. The boss's words hid it. They are now a caption of one or two lines along the top edge of the band on a dark
   plate, the boss's name first (the rule's own bubble restyled and placed by the stage: `caption`, `capStyle`),
   hidden while the explanation sheet is up and from the moment a death or a defeat starts; a line left from the
   last answer is taken down when the next question comes (the stale "Nooo!"). Same words: only where and when.
2. Win and loss went unshown. BOSS DEFEATED! (with its stars), GAME OVER, then DEFEATED under it, stand on a plate
   on the top layer until the results replace the screen at the rule's own frame (`showResult`): the game's words,
   the game's timers (DEFEATED on its 1.2 s mark, the results on theirs). Every boss's fall now takes the same
   time, so its last blast leaves BOSS DEFEATED! up for 1.6 s; the Proctor's death is bigger, not longer. (The old
   banner was a CSS animation that faded after 1.4 s.) DEFEATED stands low in the screen, clear of the boss's face.
3. Strikes stopped short. A slam's shock (a deep band of its colour behind a white-hot edge: seen along the floor a
   thin ring all but vanishes; sparks thrown up all along its front; three blades of light) runs along the floor
   to the foot of the picture, where its ring and a jolt land; a wave comes on at the player in rings
   that grow until they fill the band; the volley's first card, the seekers and the beam end in a flash at the
   player; then the player's hit as before. The kit's pool of ten rings is no longer used up by one strike (that
   was why fronts vanished half way). The HUD's crack was there all along: the capture scenario now steps the
   page's CSS animations with the frames, so strips show the cracks, the sheet coming in and the power-on as a
   player sees them (05b is taken once the sheet is in).
4. Attacks repeated. Each boss has its own projectile, trail and impact (`22g-bossflavor.js`, `BOSS_FX`): contract
   cards with a cyan edge (Pusher); toll tickets and coins (Tollgate); exam papers and pencils, graphite and torn
   papers in its slam (Proctor); molten cracks with white-hot cores (Perilmonger); filing drawers and papers thrown
   up (Golem); the gavel's white crack and rings of sound (Intestate); coins and keys poured from the vault
   (Specter); scalding steam in many small puffs (Titan); sand bolts dropping grains (Lich); strings of light from
   the hands to each bolt (Influencer); tiny glowing script running out along the beam (Fine Print); a cleaving arc
   with a bone-white edge behind the violet one (Phantom). Markers stay per kind.
5. The last heart could not be seen. A saturated red frame round the band (never over the question, the answers or
   the sheet) beats about once a second with the alarm; steady with no heart left, or with reduced effects; it
   fades once the fight is over. The shared `GFX.setDanger` vignette stays as it was.
6, 7. Lookalikes: the lead remade the Pusher and the Lich (merged at 2d8a0be); looked at, framing and glow right
   (cyan, mint), rows unchanged. The three undead-looking bosses each have their own sky: the Specter the violet
   storm, the Lich the teal storm tinted mint, the Phantom the red void.
8. Lasting damage could not be read. The recoil is shallower (a reaction can now be blended with the stance: the
   actor's `react(..., { k })`), so the boss stays above the front row; the hole in its chest and its stumps glow
   at their edges (smouldering rings) and smoke more; raging, its rims and kicker burn red, steam rises off its
   shoulders and it shakes harder.
9. Debris stood up like a boss. In the last blast a big part (a cape, a robe, a torso, the Tollgate's booth)
   burns away where it lies, sinking and shrinking under tongues of fire and smoke; the rest are thrown down and
   out on low arcs.
10. Blocky sky: looked at full size (the entrance's upward view at dpr 2): smooth. The blocks were the strips'
   downscaling. Not changed.

Minor, done: the stale line (1); the floor's warning eases off over a few frames instead of snapping (staged
only); stars and coins fly to just beside the score, which counts up as they land (a value already decided); the
front row of the crowd lit enough to read as heads. Skipped, as ruled: the same drop for every entrance, one death
template, the Phantom's and Intestate's dark faces.

## Lookalikes, for the lead

- PRODUCT PUSHER (1) and LONGEVITY LICH (7): remade by the lead after the review (merged at 2d8a0be): a faceplate
  with cyan eye slits and a grin line under slick chrome hair; a clockwork lich with a porcelain mask, a crown of
  clock hands and an hourglass chest. Looked at: no lookalike.
- PROBATE TOLLGATE (10): its one round lamp read as an eye: now a lane signal (housing, a lens of small lamps,
  amber turning red as it charges, hood, guard bars). Resolved in code.
- INFLATION TITAN (6): resolved by the lead's remake (merged at bfbabca). The old domed head with two round amber
  lights read as a diving helmet with portholes; the new Titan is a headless boiler with a brass valve handwheel on
  a short pipe for a head. Looked at (idle, fight): no lookalike. Its row keeps only the smokestacks' dress (hot
  mouths, steam, a jet as its wave goes); the old head's darkening and the handwheel made in code are gone.
- PATRIMONY PHANTOM (11): resolved by the lead's remake (merged at bfbabca). The old bare chrome skull with glowing
  eyes could be read as a famous film robot's endoskeleton; the new Phantom wears a deep hood over the whole head,
  two violet eye slits in its shadow, half bone-white and half dark steel. Looked at (idle, fight): no lookalike;
  the skull's shading made in code is gone.
- SOLVENCY SPECTER (3): mild. A hooded chrome mask: a common type, kept its own by the brow eye and the vault.
- The others (2, 4, 5, 8, 9, all): no resemblance found.

## Looked at so far

- Boss 1 (PRODUCT PUSHER): entrance, idle, telegraph and strike (cards from the briefcase), right hit, wrong
  answer, last heart, damage states, death, the player's defeat. Good.
- Boss 5 (GOLEM): its rebuilt slam seen again: it lands on the floor (fists down, a fountain of sparks, blades of
  light running at the lens). Fixed: through the wind-up of an overhead blow (`attackA`: a slam or a sweep) the
  lens stood back and looked down at the floor and the head and raised fists left the top of the picture; it now
  stands farther back and looks higher while such a blow is wound up (see boss 2: now measured per boss).
- Boss 10 (TOLLGATE): fight (the volley and the barrier's slam) and death seen: good (it rolls in, the barrier
  comes down on the floor, it tips over backward, its tracks fly in the last blast). Lookalike fixed: its one round
  lamp in the booth's window, over the ticket slot, read as an eye over a mouth. It is now a lane signal (22e,
  `makeSignal`): a housing over the old lamp, a lens of small amber lamps that turns a deep red as the barrier is
  raised or the volley charged (the stage passes the charge to the actor), a hood with a lit edge over it and two
  guard bars across it.
- Boss 4 (FINE PRINT): idle good (the flat hat, the paper clauses, the quill-nib hands; no lookalike). Fixed: in
  the overhead smash it bent over until its flat hat faced the lens and hid it through the whole beam: its beam is
  now wound up and fired with the thrust (`clip: { 3: "attackB" }`), the quill pointed at the lens. The beam washed
  the picture yellow: its far end was 3.4 from the lens, where its width and the glow at its end were taller than
  the band. It is now drawn 4.5 out, 0.7 wide, at a gain that is lower for a bright colour (`beamK`): a white-cored
  line drawn from the nib across the foot of the picture.
- Boss 2 (PERILMONGER): idle good (horned brute, the furnace grille glowing in its chest, hazard stripes: a generic
  horned brute, no lookalike); its slam lands on the floor. Fixed: its fists rise higher than the Golem's and its
  head still left the picture in the wind-up. The wind-up's framing is now measured, not guessed: the actor finds
  once how high each boss reaches at the top of each attack's wind-up (`reach`, from the vertices of its posed
  model; the Tollgate's with its barrier raised), and the lens stands back and looks high enough to hold that (a
  slam's band a little higher: its fists come up toward the lens). Checked on all twelve with a measuring scenario
  (the top of each boss 1 to 35 px inside the band at the height of its wind-up).
- Boss 6 (TITAN), remade since (see Lookalikes: the head dressing below was for the old model and is gone; the
  stacks' glow and steam stay). The old model: a boiler with its gauge in the red and brass pipes; its wave reads.
  Lookalike fixed as far as could be without a new model: its small domed head carried two round amber lights over a lit grille, on a hulking
  body: a diving helmet with porthole lights. Its dress (22d, `BOSS_DRESS.boiler`, the row's `dress`): the head's
  lights go out (they are painted into its colour as well as lit: the head's material is darkened and its own light
  burns at 3%), a bronze handwheel (a ring with a cross) stands on the dome facing the lens, so it reads as a valve
  cap; its light comes from the gauge (the brightest thing on it) and from its two pipes, hot at their mouths, which
  let off steam (more as it charges, a jet from each as its wave goes: the stage asks the actor to `vent`).
  For the lead: a thin bright ring round its neck (part of the body's own material, which cannot be dimmed alone)
  still reads as a collar under the dome. If the dome on a collar still reads as a diving helmet, a remake of the
  head (a valve bonnet, or a smokestack) is the fix.
- Boss 3 (SPECTER): idle, wind-up and wave seen: good, nothing to fix (the whole of it held through the wind-up,
  the violet rings out of the vault in its chest, the hit). Lookalike: mild. A hood over a chrome mask is a common
  type (it is in the family of a well-known masked comic-book villain's hooded mask); its third eye on the brow,
  the fanged slits and the empty vault in its chest keep it its own.
- Boss 9 (INFLUENCER): a tall masked puppeteer in a long coat with marionette crosses on strings of light; its
  seekers fly; no lookalike. Fixed (for every boss): its three-line words covered its head as it took a hit. The
  room the lens makes for the boss's words was a guess from the line's length, and was kept for a guessed time,
  against the band as it was when the words began. Now the bubble's full height is measured when it opens (the
  whole line set in it for an instant), and every frame while it is on the page the lens raises the boss just
  enough to bring its head under it, against the band as it is then (the band moves when the next question comes;
  a bubble that has ended up lower than the head reaches, over its chest or over a sheet, asks for no room). The
  game passes the line's words to the stage for this (`taunt`: look only).
- Boss 7 (LICH): idle, wind-up, seekers and hit seen: good, nothing to fix (a crowned chrome skeleton in a dark
  cloak, its hourglass heart glowing mint; its seekers swing out wide and come in). Lookalike: mild. A crowned
  undead king in a cloak is a fantasy type (games have well-known ones); the hourglass heart and the chrome keep
  it its own.
- Boss 8 (INTESTATE): a judge in robe and curled wig with a great gavel (a type, no lookalike); its wind-up holds
  the gavel raised over it. Fixed (for every slam): the blow did not land where it was seen. The gavel's head came
  down on the floor at the lens's left while the sparks, rings and blades started between its feet and the floor
  marker stood at the middle (a slam's landing was put halfway between its middle and its right hand: right for
  two fists, not for one weapon). The actor now finds once, in its own clip at the blow, the lowest point of what
  its right hand holds and the point between its two fists (`slamPt`); the floor marker and the landing stand
  there (the row's `slam: "weapon"` for a one-handed weapon; else between the fists: the Golem, the Perilmonger).
- Boss 11 (PHANTOM), remade since (see Lookalikes: the skull shading below was for the old model and is gone; the
  beam with the thrust and the bubble fix stay). The old model: half bone, half steel in a cloak, a cleaver in its
  right hand; its wind-up holds it. Fixed: in
  the overhead smash it bent over until its hood and cloak faced the lens and hid it through the whole beam: its
  beam is wound up and fired with the thrust (`clip: { 3: "attackB" }`), the cleaver pointed at the lens. Fixed (for
  every boss): its words still covered its face when the band had moved since they began; the lens now asks room
  only when the bubble's top is above the foot of the boss's head (where its head stands in the band is worked out
  for the close framing, with no room made). LOOKALIKE, for the lead: its steel half has a bare chrome skull with
  two glowing eyes over a metal ribcage, which can be read as a famous film robot's endoskeleton. Done without a new
  model: the skull is shaded dark (its colour and its mirror dimmed: a reaper's skull in shadow, not polished
  chrome) and its eyes burn in its own violet (`dress: "shade"`). A hood made in code was tried and could not be
  fitted (its head is turned in its stance, the model's own hood hangs down its back). Recommended remake: the
  hood modelled up over the skull, as its brief describes ("hooded cloak").
- THE PROCTOR (all): a hulking examiner in a mortarboard with a red tassel, a heavy coat and a giant red pencil (its
  own design, no lookalike); its volley of exam cards leaves the pencil; its wind-ups hold all of it. Seen: idle,
  the volley, the slam, the sweep. Fixed: its sweep, in the overhead smash, bent it over until its cap and coat
  faced the lens and the beam ran half hidden along the floor: it is fired with the thrust (`clip: { 3: "attackB" }`).
  Its slam lands under its pencil (`slam: "weapon"`: the marker and the landing agree). Its wave and seekers use the
  thrust and the places the Specter, the Titan, the Lich and the Influencer were seen with, and were not captured
  on their own. Its death is seen in the final captures.

## Tests at the last commit

`node scripts/arcade-regression.js --compare arcade/backup/regression-baseline.json`: IDENTICAL (153 answers in 8
games), no console errors. `node arcade/tools/regress-http.js`: IDENTICAL (153 answers in 8 games), no console
errors. `node scripts/arcade-sequence.js`: all 13 steps OK, no errors. The page's scripts parse.
