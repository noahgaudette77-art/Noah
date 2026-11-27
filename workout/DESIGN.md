# Tempo — Design Direction v2: "Night Session"

Status: **proposal, awaiting approval.** No code has changed yet.

Before screenshots (current build, 390×844 and 1280×800): `docs/design/before-mobile.jpg`,
`docs/design/before-desktop.jpg`. The full set is in `shots/before/`.

---

## A. Ten reasons the current screens feel dull

1. **It is a dark Tailwind template.** Every surface is the same flat near-black (`#111214` cards on
   `#0A0A0B`) with a 1px white/6% border and a 22px radius. There is no light source, no depth and no
   layering. Cards read as cut-out rectangles, not objects.
2. **The accent is everywhere, so it means nothing.** Lime is used for the Start button, every set's
   check button (4–5 per screen), habit checks, rings, the "Lower 3s" pill, the active tab bar, superset
   borders, the timer ring and the Finish button. On the workout screen there are six lime blocks and
   none of them is clearly the next thing to do.
3. **The type has no voice.** Archivo at 62% width is a utility face squeezed narrow. Next to it, mono
   eyebrows ("WEEK 3 OF 52 · MONDAY") and mono data labels add a "developer dashboard" tone. Numbers
   (40 lb, 8 reps, 1:29) are 20–24px: data, not a scoreboard.
4. **The character is a crash-test dummy.** Flat grey capsules, one outline weight, no shading, no
   anatomy and no clothing beyond two flat colors. The dumbbells and bench are dark grey shapes on a dark
   grey box. In the gym at arm's length it reads as a diagram, not a coach.
5. **The demo sits in a box, not a place.** A grey radial gradient and a floor line. No wall, floor
   texture, spotlight or shadow, so the athlete floats in nothing.
6. **Motion is mechanical.** Keyframes interpolate with a plain sine ease and stop dead. No breathing,
   no weight shift, no settle at the top, no idle between reps. The character looks switched off at rest.
7. **Workout mode is a form, not a session.** It is a scrolling page: header, chip strip, demo, title,
   four chips, a recommendation card, then four identical steppers. You fill it in; it doesn't pace you.
   No countdown, no tempo cue beyond a small pill, and rest is a small bottom card over the form.
8. **Nothing rewards you.** Completing a set gives a 300ms check stroke. A PR gets nothing. The session
   ends in a bottom sheet with "0 min / 1 set / 0.3k lb". There is no sense of a streak, of a week coming
   together, or of getting closer to the goal.
9. **The 12-month story is invisible.** The program's whole point (24% to 12% by month 9) lives in a
   small Body chart and a four-row table. The Today screen never says "day 15 of 365" or how far the
   next checkpoint is.
10. **Hierarchy is flat and the copy is form-speak.** Every screen leads with the same eyebrow +
    display title + chip row pattern. Labels such as "Target 8–12 reps", "Estimate: 45 min lifting at
    3 s lowering + …" and "Mark incline walk complete" are accurate but read like a spreadsheet, not a
    coach. The hero plates are murky green photos that fight the lime accent.

---

## B. Direction: "Night Session"

Training at 5 a.m. in a dark gym with one work light on. The screens are the gym after hours: deep
carbon black, a warm key light from above-left, a cool steel rim light from behind, haze in the air,
film grain on everything. One molten-orange accent is the "on" light: the one thing to do next.

Why not lime: Whoop, Fitness+ and every "dark + acid green" template own that look already, and it is
the current build's look. Molten orange reads as heat, effort and morning light, and it separates
cleanly from the cool rim light.

### Color tokens

| Token | Value | Use |
|---|---|---|
| `--void` | `#070708` | page base |
| `--carbon` | `#0F0F11` | lowest card |
| `--graphite` | `#18181B` | raised card face |
| `--slate` | `#232327` | controls, inputs |
| `--steel` | `#3A3A40` | hairlines, inactive rings |
| `--chalk` | `#F3EFE8` | primary text (warm white, 17.6:1 on void) |
| `--ash` | `#B8B3AA` | secondary text (9.7:1) |
| `--smoke` | `#8C877F` | tertiary text, captions (5.6:1 on void, 5.0:1 on graphite, AA) |
| `--ember` | `#FF5B1F` | **the** accent: primary action, live tempo, PR (6.5:1 on void, 5.7:1 on graphite) |
| `--ember-hi` | `#FF8A4C` | accent highlight / gradient end |
| `--ember-ink` | `#170700` | text on ember (6.3:1) |
| `--key` | `rgba(255,120,60,.16)` | warm key-light glow |
| `--rim` | `rgba(110,160,255,.14)` | cool rim-light glow, rim strokes |
| `--good` | `#86D9A8` | status only (on track), always with icon + label |
| `--caution` | `#FFC85A` | status only (adjust), always with icon + label |

Rule: **ember appears once per screen at full strength.** Everywhere else, state uses chalk/ash/steel
(done sets go chalk, not accent).

### Type pairing (self-hosted, `@fontsource-variable`)

- **Big Shoulders Display**, 800–900: a condensed, athletic face drawn from Chicago gym and
  stadium signage. Used for session names (96–160px), huge numerals (reps, weight, timers at
  80–200px) and section heads. Tabular figures for anything that counts.
- **Instrument Sans**, 400–600: a clean, slightly narrow grotesk for body text, buttons and labels.
  Small caps-style labels are Instrument Sans 600 at 12px with +0.12em tracking. **Mono is
  removed** entirely.
- Scale (px): 12 / 14 / 16 / 20 / 28 / 40 / 64 / 96 / 144. Line height 1.45 body, 0.86 display.

### Texture and lighting

- **Film grain**: a 160px SVG `feTurbulence` noise tile at 5% opacity over the whole app, stepped at 8 fps
  (static under reduced motion).
- **Glows**: each screen has two blurred radial lights, warm key top-left (`--key`) and cool rim
  bottom-right (`--rim`), behind content. Hero areas get a soft spotlight cone and haze.
- **Depth, not borders**: cards are lit objects. Graphite-to-carbon vertical gradient, a 1px inner top
  highlight (rim), a large soft drop shadow (`0 24px 48px -24px #000`), no visible outline. Three
  elevation levels: base, raised (cards), floating (sheets and the rest screen).
- **Vignette** on full-screen modes so the eye goes to the center.

### Character and stage

- **Shading**: every limb segment gets a lit gradient across its width (key side warm-light, far side
  shadow), a thin cool rim stroke on the side away from the key light, and soft occlusion where limbs
  overlap the torso.
- **Anatomy**: highlight shapes for deltoids, pecs, lats, quads and calves inside the silhouette;
  forearm and calf taper; a defined jaw and neck.
- **Clothing**: compression tank in graphite with an ember piping line, training shorts with a waistband,
  trainers with an ember sole. Headband removed (it read as a toy).
- **Equipment**: hex dumbbells in gunmetal with a specular stripe and knurled chrome handle; bench with
  stitched leather pad and a top sheen; matte frame with a bevel highlight.
- **Stage**: rubber-tile floor with a soft reflection, a dark wall with vertical slat panels falling off
  into shadow, an overhead work light (cone + haze), and a contact shadow under the athlete.
- **Motion**: concentric moves ease out with a 4–6% overshoot and settle; lowering stays linear and
  controlled (it is the 3 s tempo). Breathing (thorax and shoulders ±1.5%, 4 s cycle), a small weight
  shift between reps and an idle bob during holds. Joint limits and planted-foot checks still apply.
- **Target physique**: four builds (shoulder width, chest depth, waist, arm and leg girth, ab definition)
  tied to the projection checkpoints: Stage 1 start (24%), Stage 2 at 22%, Stage 3 at 19%, Stage 4 at
  15.5% and below. Shown as "Target physique · Stage 2 of 4". It advances when your logged 7-day average
  reaches the checkpoint weight.

### Motion language: "Tempo-led"

The app moves on the same clock as the lifts.
- UI springs: stiff and short (stiffness 420, damping 36). Things land; they don't wobble.
- Page changes: a depth push (outgoing scales to 0.97 and dims; incoming rises 12px).
- Numerals roll (odometer) when they change. Rings sweep with a slight overshoot.
- **One signature moment per session**: the PR screen, a slow ember light sweep across the number.
  No confetti, no particles.
- `prefers-reduced-motion`: no grain movement, no breathing, no rolls; demos show start and end poses;
  transitions are 120ms fades.

### Screens

- **Today**: full-bleed hero. A lit gym stage with the character in the first exercise's start pose
  and breathing. "UPPER A" at 140px, with "Day 15 of 365", the streak, and lift/walk/sets overlaid on
  the floor. One ember button: Start. Below it: this week's rings, the next milestone ("9.5 lb of fat
  to 19%"), the session list with lit thumbnails, and habits.
- **Workout (immersive)**: full screen, one exercise per page, swipe sideways between exercises.
  - Big demo on top; set N of 4 and weight × reps as 120px numerals, editable with large ± targets.
  - **Start set** runs a 3-2-1 countdown, then a tempo ring paces each rep ("DOWN 3, 2, 1, UP"). Haptic
    pulse at each phase change and optional soft audio ticks (off by default).
  - **Done** is the one ember action.
- **Rest**: full screen. A huge ring and countdown, a small looping preview of what's next, and the
  number to beat ("Last week 45 lb × 10. Get 11."), plus ±15 s and skip.
- **PR moment**: full screen for 2.5 s, auto-dismisses, and appears once per exercise per session.
- **Session complete**: volume, time, sets and PRs as big numerals, streak and week ring updates, plus
  "Save summary card" (a 1080×1350 PNG drawn on canvas, shared via the share sheet or downloaded).
- **Progress (Body)**: a milestone journey path from 24% to 12% with dated checkpoints and weights,
  "you are here", next milestone and distance. Under it: the weight chart restyled in the new palette,
  the rule card and logging.
- **Week**: three rings (lifting 4/4, conditioning 2/2, habits %), Day X of 365, consistency score.
  On Sundays the **weekly review card**: sessions done, volume vs last week, weight trend, one specific
  focus for next week, derived from the data (e.g. "Bulgarian split squat stalled at 25 lb for two weeks.
  Add one rep per set before adding load.").

### Motivation mechanics (all derived from existing logged data)

- **Streak**: consecutive scheduled training days completed (rest days don't break it; a missed
  training day does). The longest streak is kept.
- **Weekly rings**: lifting sessions (of 4), conditioning (of 2), habits (% of 28 checks).
- **Day X of 365** from the start date.
- **Consistency score** (0–100): last 28 days, 70% sessions done vs scheduled + 30% habits.
- **Milestones**: fat mass from the 7-day average and the lean-mass assumption; the next checkpoint
  and lb of fat to it.

### Copy tone

Direct, calm, specific, numbers first. Never cheer or tell anyone to "crush it". No emoji.
- "Start Upper A" becomes **"Start · 6 exercises · 65 min"**
- "Beat last time at 40 lb" becomes **"Last week 40 lb × 10. Get 11."**
- "19 sets are not ticked" becomes **"19 sets not logged. They won't count toward progression."**
- PR: **"New best. Incline press 45 lb × 12. Up from 40 × 12."**

### Pro polish

8-pt spacing scale (4 / 8 / 16 / 24 / 32 / 48 / 64). Tokens in one CSS file and the Tailwind config.
**Phosphor icons** (bold weight, duotone for state) replace the hand-drawn set for consistency.
Skeleton states for the chart and history; designed empty states with one clear action. 60 fps
target: one rAF loop per visible demo, and shading gradients reuse fixed ids instead of being rebuilt
each frame. AA contrast verified with axe. Safe-area insets on every edge-fixed element.

### API assets

- **fal.ai (FLUX)**: re-shoot the five hero plates in this lighting (warm key, cool rim, haze, empty gym,
  no people) and make one wide gym-wall texture for the Today stage. **fal.ai video**: one 4 s looping
  haze/dust-in-light clip behind the Today hero, compressed to about 400 KB webm/mp4 with a poster
  frame (poster only under reduced motion or Save-Data).
- **ElevenLabs sound effects**: soft low/high tempo ticks, 3-2-1 blips and a short, low PR tone.
  All off by default except set-complete, which follows the existing Sounds toggle.
- The character, stage and equipment stay hand-built SVG so form stays checkable.

### Quality loop

After building: screenshot every screen at 390×844 and 1280×800, critique each as a harsh art
director (hierarchy, depth, contrast, spacing, motion, "would I pay for this"), fix, re-shoot, and run
at least two rounds. Re-render the contact sheet and re-verify every pose; tests, axe and the build must
stay green.
