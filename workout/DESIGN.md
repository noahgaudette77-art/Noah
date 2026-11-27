# Tempo — Design Direction v3: "IRON ROOM, 1974"

Status: **plan, awaiting review.** Nothing below is built yet. The previous direction ("Night Session")
is archived at `docs/design/DESIGN-v2-night-session.md`. Every asset this direction needs, with its tool,
exact prompt, size and cost, is in `ASSETS.md`.

The reference photos are mood only. No text, brand, person or poster from them is reproduced.

---

## 1. The idea

The app is an underground iron gym from 1974 that you walk through. Every screen is a zone of the
same room, lit by the same tungsten pendant lamps. Paper things (plans, logbooks, posters, punch
cards) are pinned to brick and steel. The one thing to do next is the thing the lamp is on.

**Function beats fashion.** Texture sits *behind* and *around* content, never under a number you act
on. Weight, reps, timers and the set-complete control are drawn on clean, solid, high-contrast
plates. If a texture ever costs legibility, the texture loses.

### Zone map (one persistent room, five panoramas)

| Zone | Panorama | Screens | Camera |
|---|---|---|---|
| 1. Entrance | pendant lamps over the door, brick, concrete stairs down | **Today**, cold open, History (rotated 140° to the "front desk" corner) | slow yaw drift, slight tilt down |
| 2. Bench & rack | worn benches, hex dumbbell rack, rubber floor | **Workout** (active set), Exercise detail | locked during a set (no drift), drifts between exercises |
| 3. Mesh wall | steel mesh wall with hooks, brick beside it | **Progress** (posters on the brick, milestone plates on the mesh) | drift, gyro parallax |
| 4. Sprint lane | red numbered lane on concrete | **Week** (the lane's numbers echo the day cards) | drift along the lane |
| 5. Ceiling | warm hexagonal light ring overhead | **Rest** (you look up from the bench between sets), Session complete | slow roll + drift |
| — | none, solid soot | **Settings** | no WebGL at all |

Changing screens = turning to another part of the room: a 450 ms cross-dissolve of panoramas with a
2° yaw ease, never a hard cut. In Clean mode or reduced motion it is a 150 ms fade.

---

## 2. Tokens

### Color (CSS custom properties, mirrored in `tailwind.config.js`)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--soot` | `#0D0B09` | page background, behind the panorama | — |
| `--pit` | `#1A1714` | solid plates under numbers and controls | — |
| `--iron` | `#2A2622` | raised plate, inputs, stepper wells | — |
| `--steel` | `#3A342D` | borders, dividers, inactive tracks | — |
| `--concrete` | `#A39C90` | secondary text | 7.2:1 on soot, 6.6:1 on pit |
| `--chalk` | `#F4EFE4` | primary text and numerals | 17.1:1 on soot, 15.6:1 on pit |
| `--amber` | `#FFB54A` | **the one accent**: lamp light, primary action, active state | 11.2:1 on soot |
| `--amber-core` | `#FFD99A` | the hot centre of a lit button / filament | — |
| `--amber-ink` | `#1A0E02` | text on amber | 10.8:1 on amber |
| `--rust` | `#9C4A22` | decoration only (stains, rules, plate edges). Never text on dark. | 3.2:1 |
| `--rust-hi` | `#D9622F` | PR stamp and warnings on dark (large text only) | 5.4:1 on soot |
| `--brick` | `#7A3B2A` | decoration only | — |
| `--cream` | `#EDE3CC` | aged paper: prints, ledger, punch card | — |
| `--ink` | `#1E1A15` | text on paper | 13.6:1 on cream |
| `--ink-faded` | `#5E554A` | secondary text on paper | 5.7:1 on cream |
| `--stamp-red` | `#B5482A` | rubber-stamp ink on paper (large only) | 4.2:1 on cream |

Rules:
- Amber is light, not paint. It appears as glow, filament and lit edges. There is exactly one lit
  primary control per screen.
- Every number you act on is `--chalk` on `--pit`/`--iron`, or `--ink` on `--cream`. Never on a
  texture, a photo or the panorama.
- The panorama is always under a scrim: `linear-gradient(soot 0 → 55%)` behind content, so the
  room reads as space and light, not as a busy picture.

### Type

Self-hosted via `@fontsource` (all SIL OFL 1.1), latin subset, `font-display: swap`, preloaded.

| Role | Face | Sizes (px / line) | Notes |
|---|---|---|---|
| Numerals XXL | Big Shoulders Display 800, tabular | 112/0.9 (weight, reps in a set), 88/0.9 (rest timer) | the scoreboard; always on a solid plate |
| Display | Big Shoulders Display 700–800 | 56/1, 40/1.05, 28/1.1 | screen titles, exercise names |
| Wall lettering | **Big Shoulders Stencil Display** 800 | 72/0.95, 48/1 | painted on the panorama/brick: session name, zone name. Decorative, always paired with a real heading for screen readers |
| Labels | **Special Elite** 400 | 15/1.3, 13/1.3 (minimum 13) | typewritten labels, ledger lines, tape labels. Never for numbers you act on, never under 13 px |
| Body | Instrument Sans Variable 400–600 | 17/1.45, 15/1.45 | cues, explanations, settings. Kept because it is the most legible face at small sizes |

Print effects on Display/Wall sizes ≥ 40 px only: a 1.5 px rust ghost offset down-right
(misregistration) and a paper-grain mask on stencil letters. Both off in Clean mode.

### Space, shape, depth

- 8-pt grid. Screen gutter 16 px. Thumb zone = bottom 40% of the screen at 390×844: the set-complete
  control, steppers and Start live there.
- Corners: steel plates 6 px (machined), paper 2 px (cut), lamp buttons 999 px (round lamp glass).
  No 22 px "app card" radius anywhere.
- Depth comes from light, not shadow stacks: a plate is lit from above (1 px top highlight
  `rgba(255,214,160,.10)`), sits in a 24 px contact shadow, and catches an amber bounce
  `rgba(255,181,74,.06)` when it is near the active lamp.

### Texture layers (all off in Clean mode)

| Layer | How | Where | Budget |
|---|---|---|---|
| Film grain | one 256 px tiling noise WebP, `mix-blend: overlay`, opacity .07, shifted by `steps()` 8 fps | whole screen, *above* the panorama, *below* content plates | 1 composited layer |
| Dust in light cones | 40–80 points in the WebGL scene, additive | panorama only | inside the WebGL draw |
| Paper | procedural cream noise + fibres + fold creases (canvas, generated once, cached as a blob) | prints, ledger, punch card | 1 texture |
| Distress | scratches + edge wear masks (Poly Haven derived), multiplied on prints and plates' edges only | edges, never under numbers | 2 masks |
| Light leak | warm radial burn at a screen corner, slowly breathing | cold open, session complete | 1 gradient |
| Lamp flicker | brief opacity dip .92 on the scene light and the amber glow, 2–3 events / min, never on text | Today, Rest | CSS var driven |

---

## 3. Components

| Component | What it is | Notes |
|---|---|---|
| **Lamp button** | primary action: a round-ended `--pit` plate whose label sits under a lit filament; amber glow halo, hot core | 64 px tall minimum, full-width in the thumb zone. Pressed = the lamp dims and the plate sinks 2 px. Disabled = lamp off, no glow |
| **Plate** | the solid steel surface everything functional sits on | machined edge, rivets at 2 corners as decoration only |
| **Print** | a paper card pinned to the wall: masking-tape corners, slight 0.4–1.2° rotation, paper texture | content prints (plans, next exercise). Rotation is 0 for anything with numbers you edit |
| **Video print** | the MuscleWiki demo mounted on a paper card. Tape sits on the *paper mount, outside the video frame*, so the MuscleWiki mark is never covered (their terms). Front/side toggle, play/pause, 0.5×, Clean toggle. Exercise name from MuscleWiki under it in typewriter | grade = CSS `filter` (+4% sepia, +3% contrast) plus grain *outside* the frame on the mount; the footage itself is never cropped, re-encoded or overlaid |
| **Tempo ring** | kept from v2: 3 s lowering / 1 s lift, now drawn as a chalk circle on a plate next to (not over) the video | voice and tick cues sync to it |
| **Dymo label** | embossed label-tape chip (black tape, raised cream letters) for tags such as "SUPERSET A", "DAY 3" | replaces pill chips |
| **Stamp** | rubber-stamp mark that lands with a thud: "DONE", "PR", "REST DAY" | stamp-red on paper, rust-hi on dark |
| **Split-flap** | mechanical digits for the rest countdown and session clock | each digit flips on change, flip sound optional |
| **Punch card** | Week: 7 columns, one hole punched per completed session | punched hole shows the brick behind it |
| **Chalk tally** | streak: strokes drawn one by one, every fifth crosses the four | SVG stroke-dashoffset, chalk texture mask |
| **Ledger** | History: typewritten rows on ruled aged paper, date in the margin, red rule at the left | rows are real text, selectable, 15 px |
| **Dial** | Weigh-in: analog scale dial, needle sweeps to the number; 7-day average shown as a second, faded needle; the number itself is printed big below in Numerals | dial is decoration; the number is the data |
| **Poster** | Progress: one of four target-physique posters on brick. Locked = painted over (brick-coloured paint with brush edges, silhouette faintly visible) or torn; reaching a milestone peels it open with a stamp + sound | |
| **Milestone plate** | Progress: a 3D cast-iron plate hanging on the mesh wall, slowly turning; earned = lit by the lamp, upcoming = dim | number overlaid in HTML, not baked |
| **Tab bar** | a strip of rubber floor at the bottom with stencilled tab names; the active tab has a lamp pool on it | 56 px + safe area; labels Instrument Sans 11 px semibold for legibility, stencil only for the active one |
| **Back-to-session bar** | a slim lit plate pinned above the tab bar while a session is running | must not overlap content (reserves its height) and must not appear on Today when Today already shows the session card (carry-over fix) |

---

## 4. Signature moments

| Moment | Spec | Reduced motion / Clean |
|---|---|---|
| **Cold open** | once per day, ≤ 2.0 s, tap anywhere to skip. 0–0.4 s black with lamp hum; 0.4–0.9 s the filament glows and flickers twice; 0.9–1.5 s the light cone opens and reveals the Entrance panorama; 1.1–2.0 s "TEMPO" paints on in stencil (mask wipe, 3 strokes) | static title on the room, no flicker, 150 ms fade |
| **Set complete** | the DONE stamp drops (scale 1.18 → 1, 90 ms), 4 px settle, ink spread; thud + haptic (`navigator.vibrate(18)` where supported; iOS Safari has no vibration API, so sound carries it). PR: a second rust-red "PR" stamp at an angle 250 ms later + plate drop | stamp appears without scale |
| **Rest** | Ceiling zone. Split-flap countdown, huge; the next exercise pinned below as a print. Flip sound per second (optional), voice "Three, two, one" in the last 3 s if voice cues are on | digits change without flip |
| **Week** | punch card; completing a session punches the hole (punch slides in, paper chad falls, 400 ms) | hole appears |
| **Streak** | chalk tally drawn stroke by stroke (120 ms per stroke), chalk clap sound on the fifth | drawn at once |
| **History** | typewritten logbook, newest page on top; a new entry types itself once (40 ms/char, capped at 600 ms) | appears at once |
| **Weigh-in** | dial needle sweeps with a damped overshoot (spring, 700 ms) to today's number; the faded 7-day-average needle follows | needle placed |
| **Today** | Entrance zone; the session name is stencilled on the brick (wall lettering) above the Today print; the hero loop (athlete chalking hands) plays in a print on the wall | hero shows its still |
| **Milestone** | poster peels from the corner (600 ms), stamp "REACHED", plate drop sound | poster revealed |

### Motion language

- Things have weight: they **land** (stamp, plate), **hang** (prints settle with a ±1° damped swing on
  enter), **flip** (split-flap), **peel** (paper). Nothing floats, bounces or glows-pulses.
- Durations: micro 120 ms, standard 240 ms, signature 400–900 ms, cold open ≤ 2 s.
- Easing: `cubic-bezier(.2,.9,.25,1)` for landings; springs only for the dial needle and prints.
- The panorama drifts at 0.6°/s and **stops** while a set is running.
- `prefers-reduced-motion`: no drift, no flicker, no cold-open, no swings; fades ≤ 150 ms.
- Battery: iOS Low Power Mode caps `requestAnimationFrame` at 30 fps. A frame governor (as in the
  arcade) detects a sustained 30 fps cap or slow frames and drops to "still room" (rendered once,
  no drift, no dust). There is also a Settings option **Battery saver: Auto / On / Off**.

---

## 5. Sound language (all OFF by default)

The room has one acoustic: an empty brick basement. Every sound is dry at the source with a short
brick-room tail (≈ 0.6 s) baked in, so they sit in the same space. Levels are normalised: room tone
−32 LUFS (a bed you barely notice), effects −20 LUFS, voice −16 LUFS.

| Event | Sound |
|---|---|
| App open / cold open | lamp hum + filament buzz |
| Set complete | rubber-stamp thud on paper |
| PR | stamp + heavy plate dropped on rubber floor |
| Rest countdown | split-flap flip per second (separate toggle), voice "Three, two, one" |
| Tempo | voice "Lower" at the start of the 3 s lowering, "Press" at the lift, "Hold" for programmed pauses; soft stopwatch tick each second of the lowering |
| Last rep | voice "Last rep" when the final rep of the final set starts |
| Rest start / end | voice "Rest" / "Next exercise" |
| Session complete | voice "Set complete" (final set) then plate drop |
| Streak fifth | chalk clap |
| Ambient | seamless room-tone loop, only while the app is foregrounded and sound is on |

Settings: **Sound** (off by default), **Volume** slider, **Voice cues** on/off, **Flip ticks** on/off.
Web Audio with decoded buffers; the audio context is created on the first tap (iOS rule).

---

## 6. Clean mode

Settings → **Clean mode**. Turns off: grain, paper/distress textures, misregistration, light leaks,
flicker, dust, video grade, panorama drift. Keeps: the panorama (static and dimmed to 40%), layout,
fonts, stamps (without texture), all sounds settings. It is the "bright gym at noon" mode and must
pass every contrast check on its own. The default follows `prefers-reduced-motion` + battery state.

---

## 7. Rendering architecture and budgets

- **One persistent WebGL canvas** (three.js, lazy-loaded after first paint) fixed behind the UI. It owns
  a sphere with the current zone's equirectangular panorama, a second sphere for cross-dissolves, a
  dust point cloud, and on Progress/Rest a small props scene (GLB plates / dumbbell) lit by the Poly
  Haven HDRI (PMREM, 1k). Screens swap *scenes*, never canvases.
- First paint is plain HTML + a 32 px blurred panorama placeholder (inline, ~1 KB). three.js and the
  2k panorama load after the app is interactive. Target: interactive < 3 s on Fast 4G.
- Panoramas: 2048×1024 WebP on phones (≈ 250 KB), 4096×2048 on desktop. Gyro parallax: ±6° yaw,
  ±3° pitch; iOS motion permission asked on a user tap (Settings toggle and a one-time chip on Today);
  without permission, drag to look and the slow drift.
- GLB props: meshopt + WebP 1k textures, each < 1 MB, loaded only on Progress/Rest.
- Video loops (hero/rest/complete): H.264 MP4 + VP9 WebM, 5 s, < 2 MB, poster still first, only
  autoplay on Wi-Fi or when "Data saver" is off; `preload="none"` otherwise.
- MuscleWiki demo video: streamed from `api.musclewiki.com` with a short-lived media token from our
  own token endpoint (see ASSETS.md §A). Never cached by the service worker (`NetworkOnly` route).
- Pause all rendering when the tab is hidden; render at device-pixel-ratio ≤ 1.5 for the panorama.
- 60 fps scroll: content scrolls in its own layer; the canvas is not re-rendered by scroll.

---

## 8. Screen notes at 390×844

- **Today**: wall lettering (session name) top third over the panorama; Today print (date, session,
  45 min, exercises list) on a plate; hero loop print; Lamp button "Start" in the thumb zone.
- **Workout**: video print top (16:9 inside a paper mount), tempo ring plate beside/below, then the
  set plate: weight and reps in 112 px numerals with ± steppers 56 px, and the full-width Lamp
  button "Set done" at the bottom. Nothing textured inside the set plate.
- **Rest**: ceiling zone, split-flap timer 88 px, "+30 s" and "Skip" secondary plates, next
  exercise print.
- **Week**: punch card at the top, then day prints on the sprint lane; cards must fit 390 px (carry-over
  fix: no right-edge overflow).
- **Progress**: posters row (horizontal scroll with snap) on brick, weigh-in dial, the chart on a
  graph-paper print (no stray legend, even y-ticks, plan line monotonic), milestone plates on mesh.
- **History**: ledger.
- **Settings**: solid soot, plates; Clean mode, Sound, Volume, Voice cues, Flip ticks, Motion
  (look-around/gyro), Battery saver, Data saver, Credits & legal (includes the required MuscleWiki
  disclosure, Poly Haven CC0 credits, fonts).
