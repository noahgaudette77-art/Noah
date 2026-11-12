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
| **Risk Blaster** | Rail shooter. Answers fly down a neon tunnel as targets; shoot the right one before it reaches your shields. Waves of 10 get faster; streaks multiply your score. | Fast recall under time pressure |
| **Nest Egg Run** | Lane racer through a 40-year career, one gate per year from age 25 to 65. Steer into the right answer's lane to compound your savings; three crashes force early retirement. Five-answer streaks buy an insurance policy that pays out on your next crash. Retiring with $1,000,000 takes about 95% accuracy. | Sustained accuracy |
| **Boss Rush** | One boss per chapter, plus a final boss across the whole book. Bosses only take hard questions; answer before their attack charges. Clear with all three hearts for three stars. | The hardest, most exam-like questions |
| **Memory Bank** | Flashcards for every key term, rule and number, with self-grading (missed / got it / easy) and a swap button to see definitions first. | Definitions and numbers |
| **Final Exam** | Mock exam of 20, 50 or 100 questions weighted by chapter size, 90 seconds a question or untimed, no feedback until you submit. Pass mark 60%. | Exam readiness |
| **Strategy Guide** | Condensed notes, learning objectives and tips for every chapter, a search across every note and card, and a list of places where the book contradicts itself. | Reading before you play |

Every wrong answer shows the explanation and the book page, and the results screen
lists all of them again.

## The world

- **HD neon graphics.** Every scene renders in high dynamic range, so neon can burn
  brighter than white: multi-level bloom, filmic tone mapping, colour grading, sun
  rays, and live reflections on wet floors and roads. Each cabinet has its own
  world: a synthwave horizon on the title screen, a nebula tunnel of crystal
  targets in Risk Blaster, a rain-soaked clockwork city in Nest Egg Run (towers
  with lit windows, brass pipes and turning gears over the street, steam, and
  neon signs that spell the course's own terms, driven in an armored rally car
  from a grey dawn at 25 to neon night at 65), a searchlit arena with a mirror
  floor in Boss Rush, whose final boss is a towering black-armored cyborg with
  burning red eyes, a gold bank-vault door
  that opens a little more with every card you bank in Memory Bank, and a trophy
  on a plinth in a moonlit hall for the Final Exam. Setup → Graphics switches
  between HD (sharp, anti-aliased), Retro and Chunky (pixel art).
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
- **More to look at.** A ringed planet hangs beyond the Risk Blaster tunnel,
  shooting stars cross the night skies, club lasers sweep the back of the arcade,
  and each new question arrives with a sweep of light as its answers deal in.
- **FEVER.** A run of right answers in Risk Blaster, Nest Egg Run or Boss Rush heats
  the cabinet up: HEATING UP at 3 in a row, ON FIRE at 6, UNSTOPPABLE at 10. Each
  level has its own colour, fanfare, crowd cheer and shower of sparks, rays of light
  pulse around the screen edge, and a streak counter sits in the HUD. Fast answers
  earn a QUICK DRAW or LIGHTNING callout. A miss shatters the streak.
- **Touch the world.** Tap a target in the Risk Blaster tunnel to shoot it. Drag a
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
- **The arcade floor.** A room of lit cabinets with live screens, a polished tile
  floor that reflects them, and neon on the ceiling. The lights clunk on the first
  time you walk in each session. The walls carry the INR Arcade sign, a Hall of
  Fame board with your best scores and rank, and a poster for every boss that fills
  with the stars you earn. The view leans toward your finger or mouse.
- **Nest Egg Run's sky** follows your career: dawn at 25, bright day, golden hour,
  then dusk and stars at 65.
- **Sound and feel.** Music adds layers as your streak grows; the floor hums with a
  crowd and distant cabinets; the racer has an engine. Big hits freeze the frame
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
```

Sources live in `src/` (`style.css`, `body.html`, and `js/*.js`, concatenated in
filename order). Keyboard: 1–4 or A–D to answer, T/F for true/false, Enter for next,
Esc to pause, arrow keys to steer and browse.

Three.js r128 is MIT licensed (`vendor/three.LICENSE`). Press Start 2P and VT323 are
SIL Open Font License fonts served by Google Fonts.
