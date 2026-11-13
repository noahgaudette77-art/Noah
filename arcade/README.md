# INR Arcade

A retro 3D arcade for mastering the CSI course **Insurance and Retirement – Quebec**
(2020 edition, 11 chapters in 4 sections). Every game draws from one question bank
written from the course text, and every answer you give feeds a spaced-repetition
model that tracks how well you know each chapter.

Open `arcade/index.html` in a browser. It is one self-contained file: Three.js and
the two pixel fonts load from public CDNs, with a vendored copy of Three.js as an
offline fallback.

## The cabinets

| Cabinet | What it is | What it trains |
|---|---|---|
| **Risk Blaster** | Rail shooter. A winged void demon comes at you through open deep space while the clock runs. Tap the right answer and your fighter opens fire on it; tap a wrong one, or run out of time, and it fires on you. Waves of 10 get faster; streaks multiply your score. | Fast recall under time pressure |
| **Nest Egg Run** | Lane racer through a 40-year career, one gate per year from age 25 to 65. Steer into the right answer's lane to compound your savings; three crashes force early retirement. Five-answer streaks buy an insurance policy that pays out on your next crash. Retiring with $1,000,000 takes about 95% accuracy. | Sustained accuracy |
| **Boss Rush** | One boss per chapter, plus a final boss across the whole book. Bosses only take hard questions; answer before their attack charges. Clear with all three hearts for three stars. | The hardest, most exam-like questions |
| **Memory Bank** | Flashcards for every key term, rule and number, with self-grading (missed / got it / easy) and a swap button to see definitions first. | Definitions and numbers |
| **Final Exam** | Mock exam of 20, 50 or 100 questions weighted by chapter size, 90 seconds a question or untimed, no feedback until you submit. Pass mark 60%. The final boss stands over it: pass and it is destroyed. | Exam readiness |
| **Strategy Guide** | Condensed notes, learning objectives and tips for every chapter, a search across every note and card, and a list of places where the book contradicts itself. | Reading before you play |

Every wrong answer shows the explanation and the book page, and the results screen
lists all of them again.

## The world

- **HD neon graphics.** Every scene renders in high dynamic range, so neon can burn
  brighter than white: multi-level bloom, filmic tone mapping, colour grading, sun
  rays, and live reflections on wet floors and roads. Each cabinet has its own
  world: a living synthwave city on the title screen, open deep space full of
  traffic, with a winged void demon in it, in Risk Blaster, a road through five landscapes in Nest Egg Run (it
  starts in a rain-soaked clockwork city of lit windows, brass pipes, turning
  gears and neon signs that spell the course's own terms), a searchlit arena
  with a mirror floor in Boss Rush, where every boss is a different
  black-armored cyborg with burning red eyes, a gold bank-vault door
  that opens a little more with every card you bank in Memory Bank, the final
  boss on its dais in a moonlit hall for the Final Exam, and a vaulted archive
  behind the Strategy Guide. Setup → Graphics switches between HD (sharp,
  anti-aliased), Retro and Chunky (pixel art).
- **The title.** A city that never sits still: megatowers with rolling ads and
  flickering blade signs, a suspension bridge across the sun, traffic as rivers of
  light, searchlights, hover cars. Every three to six seconds something happens (a
  maglev on the bridge, a patrol chase, a blimp, fireworks, a helicopter, drones,
  a meteor shower, distant lightning). The logo has depth, glow and a glint that
  crosses it every seven seconds.
- **Risk Blaster.** You fly the player's own space fighter (a supplied model of
  166 parts, converted by `scripts/convert-model.js`) in the arcade's neon: dark
  gunmetal shaded by its old paint, panel lines and dents, anodised magenta and
  cyan panels edged with light, cyan seams and small lights, a two-colour rim.
  Under its glass canopy sits a pilot in front of a
  head-up display. It comes in from behind the camera when the game starts. Two
  main engines burn with shock diamonds and heat haze, and their bay glows; the
  four small thrusters in the wing pods flare when it rolls. The nose cannons and
  the wing cannons take turns, and their flash lights the hull. It banks with your
  finger, kicks back when it fires, and rolls and surges through the warp between
  waves behind a bow wave of light. A hexagon-lattice shield flares when you lose
  one; down to the last, an engine sputters and trails smoke; lose that and it
  breaks up into some 250 pieces of itself in a ball of fire. (The three weakest
  quality levels draw a lighter version of it, a fifth of the triangles.) After a
  right answer it surges ahead on a burst of thrust; when a shield goes it is
  knocked aside. A seven-pip combo meter fills and warms, and the engines burn
  longer and bluer with it.
- **Open space.** There is no tunnel. The ship flies into a sky of nebulae that
  never ends and never repeats, past stars at three depths, a star with its lens
  flare, a ringed gas giant, galaxies, passing clouds and chunky tumbling rocks.
  A wave travels through two of six regions, each with its own colours and its
  own landmark: nebula, asteroid belt, planet orbit, a station zone (a wheel
  station with a lane of blinking markers), a ship graveyard (broken hulls
  turning over), a wormhole gate. Sky, fog and light blend from one to the next.
  Traffic is always on its way somewhere: freighters hung with containers,
  tankers, capital cruisers with lit flanks, flights of fighters, patrol drones,
  shuttles, each with windows, running lights and an engine trail. Every 3 to 6
  seconds something happens: a squadron crosses, a cruiser slides past, a convoy,
  a dogfight with laser fire, a ship blowing up far off, a comet, a meteor
  shower, a cluster of rocks, a wormhole opening, a space whale, an ion storm, a
  solar flare, ships jumping to warp, a derelict drifting by. While a question is
  up it happens less often; with Reduced effects, half as often and nothing that
  flashes. A right answer parts the traffic and sets off fireworks; a wrong one
  throws sparks and arcs across the shield. Everything keeps clear of the way
  ahead, and the picture is dimmed behind the enemy, so what must be read stays
  clear. (Only the band between the question and the answers shows the 3D view,
  so the scenery is composed in the frame round the enemy.)
- **The demon.** Each wave has one enemy: the player's own void demon (a supplied
  model of 106 loose parts with no skeleton, converted by
  `scripts/convert-model.js` from 10.4 MB to 0.8 MB), a horned, skull-faced torso
  on four wings. The game gathers its parts into 21 joints (head, jaw, shoulders,
  arms, forearms, hands, claws, wings in three pieces a side, waist and tail) and
  poses them from smooth curves. It wears obsidian and gunmetal instead of its
  muddy baked texture: panel lines, wear and bright worn edges, veins of magenta
  and violet light, crimson eyes, a violet third eye, glowing fangs, a core that
  beats, horns and wing spikes that glow toward their tips, studs that are small
  lights, wing blades eaten ragged with burning edges, a magenta and cyan rim.
  Embers rise from it, dark mist trails off its wings, energy crackles in its
  claws. It hovers on slow wing beats (the outer wing follows the inner), breathes,
  sways its tail and watches you. A wave starts: it flies up out of the distance,
  throws its wings wide and roars as its lights come on from below. While a
  question's clock runs it comes closer. Answer right and your fire lands on its
  core: it whites out and is thrown back, and by and by it cracks, sheds armour
  (studs first, the plates over its core last), smokes and sparks. Answer wrong,
  or run out of time, and it rears up with its claws charged (the warning), then
  strikes: bolts from both claws, a lunge and a swipe, or a roar and a blast, in
  turn. In a wave's last three questions it rages: faster wings, red light, an
  aura round the view. Clear the wave and it staggers, breaks up into its 106
  parts and burns away. (The weakest quality levels draw a 3,900-triangle version
  in a plain material. If the demon's model is missing or damaged, the space frog
  it replaced stands in: a trooper in a yellow suit with a rotary cannon.)
- **The final boss.** A skull-faced armoured mech (the player's own model, converted
  by `scripts/convert-model.js` into 32 rigid parts on a 19-joint skeleton) stands
  over the Final Exam, seen from under its chin so it fills the screen: dark, worn
  armour whose scratches, pits and dents stay sharp close up, a pale skull, two
  burning eyes with a streak of glare across them, an ember beating in its chest.
  It starts on its knees in the dark; its eyes light, it roars and rises. Through
  the exam it breathes and watches: its head follows your finger (or the phone's
  tilt), and every sixteen seconds it does something slow and unfriendly (leans in
  with a low growl, cocks its head, flexes a claw). The further along the exam is
  (questions answered or time used, never which answers are right), the closer it
  hunches, the redder the light under it and the darker the hall. It makes the same
  small movement whichever answer is chosen, so the exam still gives no hint until
  you submit. Submit with 60% or more and it dies: joints blow out one after another
  in sparks and fire, a pauldron and a pylon are torn off, an arm goes limp, it
  drops to its knees, its reactor runs away until light pours out of the armour,
  and it blows apart into a couple of hundred fragments of its own armour that arc,
  spin, land and skid, with a fireball, smoke, a wave of dust, streamers of burning
  debris, two secondary blasts, a scorch on the dais, and its skull thrown clear to
  roll to a stop in front of the wreck. Below 60% it roars, winds up, brings a fist
  down at the camera and glares from close up until the results. A boss bar over
  the ending shows what your answers took off it. SKIP (or Enter) goes straight to
  the results; Reduced effects plays it without shake or flash, and a device set to
  reduce motion gets a still version. On a phone the exam is drawn at up to twice
  the screen's point size (the other scenes use one and a half) when the phone
  keeps its frame rate there.
- **The vault's machinery.** Memory Bank's door has meshing gear trains round the
  dial, an arc of lamps over it (one per card in the deck), coin stacks by the
  bullion. Bank a card and it flies up into the coin slot, the gears spin on and
  the lock goes home; miss one and it drops back toward the deck while the dark
  lamps wash red.
- **The archive.** The Strategy Guide opens on a vaulted aisle of bookshelves on
  two tiers, hanging lamps, holo-books open on lecterns, loose pages adrift and a
  rose window, seen through one framed window above the list. What you read sits
  on solid ground, and the scene all but stops while a chapter is open.
- **The car.** Nest Egg Run's armored rally coupe is built in layers of chamfered,
  bolted gunmetal plate with mint trim that glows: a bull bar and winch, hood
  scoop, armored pillars, a louvred rear window, a ducktail wing, a tubular rear
  guard, five-spoke rims with brake discs, knobbly tyres. The roof light bar
  works, the tail lamps brighten under braking, the exhausts glow after a boost
  with heat haze behind them, and the headlights throw shafts through the rain.
  The body rides on springs: it heaves over joints in the road, rolls in a lane
  change, squats under boost and dives under braking, while spray flies off the
  tyres.
- **Twelve cyborgs.** Each boss is its own machine, built from one armor kit: a
  salesman in a plated suit with a briefcase, a horned brute, a hooded one-eyed
  wraith with an empty vault in its chest, a many-eyed scribe with quill arms, a
  slab golem, a boiler with its gauge in the red, a crowned skeleton with an
  hourglass heart, a judge in robe and wig with a gavel, a masked puppeteer, a
  toll booth on tracks, a half-bone half-steel phantom with a cleaver, and the
  hulking Examinator. They drop in dark and folded, land, and power up; breathe,
  look about and twitch; wind up as their attack charges; recoil when hit. As
  their HP falls the armor cracks, plates are shot off to bare the circuitry
  underneath, an arm fails, and below 35% they rage. A hit pulses the whole arena.
- **A world that moves.** Nest Egg Run's road runs through downtown, a tunnel, a
  coast causeway (palms, a cable-stayed bridge over a sea that mirrors it, a
  diner, a lighthouse and a big wheel far off), desert (mesas, a rock arch, cacti,
  a gas station), a mountain pass (cliffs, pines, an avalanche gallery, a cable
  car) and back downtown at night; each change happens inside a bank of fog.
  Traffic runs both ways on service lanes beside the road and in hover lanes
  overhead: sedans, trucks, buses, bikes, hover cars, each in its own colour,
  changing lanes with indicators, braking, now and then broken down on hazard
  lights. An Event Director makes something happen every 3 to 8 seconds: a train
  crossing a viaduct, a helicopter with a searchlight, delivery drones, a patrol
  chase, a rival racer, a near miss, fireworks, lasers, meteors, a UFO, a blimp
  with an ad, a distant explosion, lightning, a squall, birds, steam. While a
  question is on screen it slows down and holds the big ones for the gap between
  questions. A right answer sets off fireworks and parts the traffic; a wrong one
  tears the picture for a moment.
- **Your call on effects.** Setup → Quality picks Auto (adapts to hold your
  screen's frame rate), Low, Med or High (every effect at full resolution).
  Setup → Effects switches each one off on its own: bloom, scanlines, colour
  fringe, vignette, motion blur, film grain, light beams, wet reflections,
  shadows, heat haze, lens streaks. Setup → Reduced effects cuts shake, flashes,
  zoom and motion and thins out the background events. Nothing in the game
  flashes more than three times a second.
- **CRT glass.** Curved screen, scanlines, an RGB phosphor mask, vignette, and
  colour fringing and flashes when something hits, inside a bezel. Turn it off
  under Setup → CRT glass.
- **Smooth at your screen's refresh rate.** Before drawing anything, the game
  measures how fast your screen refreshes (60, 90, 120 Hz...), then adjusts its
  quality as you play to hit every frame: it lowers resolution, then reflections
  and decorative details (dust, light shafts, trails). On very weak hardware it
  also draws metal surfaces more simply and makes the question and answer panels
  solid, so the browser needn't blend them over the 3D. It steps back up when a
  scene is lighter, and each kind of scene remembers what suits it. A steady
  30 fps cap (such as iOS Low Power Mode) is left alone, since lowering quality
  can't help it. iPhones run web pages at 60 fps unless Safari's "Prefer Page
  Rendering Updates near 60fps" feature flag is turned off, and apps' built-in
  browsers may stay at 60.
- **No hitches.** Every shader a scene needs is built while it loads, behind a
  black CRT channel-switch that appears the moment you tap, and effects come from
  reusable pools, so the first explosion or beam never stalls a frame. Replaying a
  game reuses its shaders, and the arcade floor stays built while you play, so
  both are instant. Big hits slow time for a beat instead of freezing it.
  Progress saves happen between frames. Each scene's quality level is remembered
  on the device, so a new session starts where it should. The on-screen panels
  stay still while the 3D moves: timers and health bars slide, text is rewritten
  only when it changes, and buttons don't fade, so the page never has to be
  redrawn mid-animation.
- **Instant input.** Answers, flashcard flips and grades register the moment your
  finger touches the screen, not when it lifts.
- **Lens and impact effects.** On capable devices every light draws a soft
  horizontal streak, like an anamorphic film lens, and a low sun throws flare
  ghosts across the frame. Explosions send a shockwave that bends the picture as
  it spreads, hits punch the view toward you for a moment, and speed (Risk
  Blaster's warp, flooring it in Nest Egg Run) streaks the picture outward.
- **More to look at.** Shooting stars cross the night skies, club lasers sweep the back of the arcade,
  and each new question arrives with a sweep of light as its answers deal in.
- **FEVER.** A run of right answers in Risk Blaster, Nest Egg Run or Boss Rush heats
  the cabinet up: HEATING UP at 3 in a row, ON FIRE at 6, UNSTOPPABLE at 10. Each
  level has its own colour, fanfare, crowd cheer and shower of sparks, rays of light
  pulse around the screen edge, and a streak counter sits in the HUD. Fast answers
  earn a QUICK DRAW or LIGHTNING callout. A miss shatters the streak.
- **Touch the world.** Drag a
  flipped flashcard right to bank it, left to send it back, up for easy; it follows
  your finger and a stamp shows what letting go will do. Swipe across the arcade
  floor to walk between cabinets. Tilt your phone to look around the 3D scenes
  (Setup → Tilt to look; iPhones ask for motion access when you switch it on).
- **Trophies.** Sixteen goals (streaks, bosses, a million-dollar retirement, exam
  marks, reading every stage's notes) unlock with a fanfare as you play and are
  listed under STATS.
- **Sound with depth.** Effects ring out in a hall reverb and sit left or right in
  stereo where things happen, and an announcer calls out streaks, waves and
  trophies (Setup → Announcer; it uses your device's speech voice).
- **FPS counter.** Setup → FPS counter shows the frame rate, the rate it aims for
  (your screen's refresh rate, up to 120) and the current quality level (1-8).
- **Clients.** Every stage has a client from that chapter's opening scenario in the
  book (Alfred, Sean, Jasmine, Gitano, Angelo, Manfred, Maureen, Maria). The first
  time you play a stage they brief you, with a pixel portrait and typed-out
  dialogue; beat that stage's boss and they thank you with the chapter's key
  takeaway. Replay any briefing from the stage's notes.
- **Talking bosses.** Bosses introduce themselves, taunt your misses, groan when hit
  and get enraged below 35% HP.
- **The arcade floor.** Six cabinets, each its own machine on the same body (fins
  and rocket pods, a steering wheel and wing, horns and teeth, a vault wheel and
  coins, a clock and laurels, books and a reading lamp), each playing a live demo
  of its game and powering up when you select it. Around them: a jukebox, a claw
  machine with a moving claw, dance pads, a ticket printer, hoops, a drinks
  machine, ceiling fans, a cleaning robot, people walking by, steam, and windows
  on the city. A polished tile floor reflects it all. The camera pulls back as it
  travels between cabinets. The lights clunk on the first
  time you walk in each session. The walls carry the INR Arcade sign, a Hall of
  Fame board with your best scores and rank, and a poster for every boss that fills
  with the stars you earn. The view leans toward your finger or mouse.
- **Nest Egg Run's sky** follows your career: dawn at 25, bright day, golden hour,
  then dusk and stars at 65.
- **Sound and feel.** Music adds layers as your streak grows; the floor hums with a
  crowd and distant cabinets; the racer and the fighter have engines; cabinets
  power up, locks go home, pages turn, shields crackle. One button on the arcade
  floor mutes everything. Big hits freeze the frame
  for a beat, throw a shockwave and vibrate (on Android).
- **Rank.** XP from everything you do moves you from Trainee to Arcade Legend.

## How mastery works

Each question and flashcard sits in a Leitner box. A right answer moves it up a box,
a wrong one sends it back to the start. Moving up needs time between answers
(5 minutes, then 6 hours, then 2 days), so an item only counts as mastered after
three spaced right answers. The games pick what to ask next: items you just missed
first, then new ones, then those due for review.

Progress is saved in the browser (`localStorage`). When the page runs as a claude.ai
artifact it also syncs to the viewer's private storage, so it follows them between
devices.

## Content

`content/chNN.json` holds each chapter's questions, flashcards, notes and tips
(chapter 6 was written in two halves, `ch06a` and `ch06b`, merged at build time).
`content/errata.json` lists inconsistencies in the course text, shown in the guide.
`content/story.json` holds the client briefings and boss dialogue.

The questions are original study material written from the course text. None of the
book's own self-test questions are copied; their concepts are covered with new
wording and new scenarios. Every item cites its page so you can check it against
the book.

## Editing

```bash
npm run arcade:check   # validate every content file (schema, balance, page coverage)
npm run arcade         # rebuild arcade/index.html from src/ and content/
npm run arcade:regress # prove a visual change left the rules alone (needs Playwright)
```

`arcade:regress` plays Boss Rush, Nest Egg Run, Risk Blaster, Memory Bank and a
50-question Final Exam with a fixed script of right answers, wrong answers and
timeouts on a virtual clock, and compares every HP, heart, score, nest egg, shield,
card grade, exam mark, saved item and frame number with the trace saved in
`backup/` from before the visual upgrades. It also fails if the Final Exam shows
any hint before submit, and it plays the exam's ending in full (holding its clock
through it, so the saved results must match to the byte). `PROGRESS.md` logs the
upgrades' checkpoints.

Four models the player supplied live in `arcade/assets/`: the Final Exam's boss
(`boss/`), Risk Blaster's fighter (`fighter/`), its demon (`demon/`) and the frog
that stands in for the demon (`frog/`), each a `<name>.bin` and an `albedo.jpg`
(the demon's is `albedo.webp`). The build inlines them into the page. To replace
one, run `node scripts/convert-model.js <model.glb> <boss|fighter|demon|frog>` (needs
ImageMagick) and rebuild. The frog is a dense, meshopt-compressed sculpt:
converting it also needs the `meshoptimizer` package, which is not a dependency of
this repo (see the script's header). `src/js/24c-examboss.js` maps the boss's
numbered parts to joints; `src/js/20d-blasterfighter.js` lists where the fighter's
engines, guns and lights are; `src/js/20h-blasterdemon.js` has the demon's joints, pivots and what each
part is made of; `src/js/20e-blasterfrog.js` where the frog's cannon points. Without a fighter model in the build Risk Blaster flies its built-in jet;
without the demon's model the frog is the enemy; without either every answer is a target to shoot, a crystal form in a
holo-drone (tap one, or its answer), and a carrier ship is the wave's enemy. If a
model is damaged and will not decode, the game falls back the same way (the exam
shows its old procedural centrepiece in place of the boss).

Sources live in `src/` (`style.css`, `body.html`, and `js/*.js`, concatenated in
filename order). Keyboard: 1–4 or A–D to answer, T/F for true/false, Enter for next,
Esc to pause, arrow keys to steer and browse.

Three.js r128 is MIT licensed (`vendor/three.LICENSE`). Press Start 2P and VT323 are
SIL Open Font License fonts served by Google Fonts.
