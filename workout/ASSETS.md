# Tempo "IRON ROOM, 1974" — asset plan

Status: **for review. Nothing paid has been generated yet.** Spend so far: $0.00 (free test calls
only, see `COSTS.md`). Approve, cut or change rows here and I will generate exactly what is approved.

Rules applied to every row: build-time only (scripts in `workout/tools/`, outputs in
`workout/public/assets/` with `manifest.json`, committed); keys read from the environment and never
written to code, bundle, logs or git; idempotent (an asset that exists is skipped); at most 3 takes
per paid asset; every paid call logged in `COSTS.md`; no text or logos inside generated media; no real
person's likeness.

---

## 0. Keys, network and connectivity (done, free)

Environment variable names found (values not read or printed): `FAL_KEY`, `MUSCLEWIKI_API_KEY`,
`BLOCKADE_API_KEY`, `TRIPO_API_KEY`, `ELEVENLABS_API_KEY`. The environment's network access is
**unrestricted** and it stores **no network secrets**, so no key is injected by the proxy; all five are
plain environment variables. No domain needs allowing.

| Service | Test call (free) | Result | Credits / quota left |
|---|---|---|---|
| fal.ai | `GET rest.alpha.fal.ai/billing/user_balance` | **works** | **$15.32** — below your $20 cap, so the real ceiling is $15.32. This plan needs ≈ $2.30 expected, $6.75 worst case |
| MuscleWiki | `GET /health`, `POST /media/token` | **works** (token minting works, so the key is TESTING tier or higher) | not exposed by the API. TESTING = 1,000 calls/month, GROWTH = 30,000. I used **41 calls** for the test and the mapping below |
| Blockade Labs | `GET /api/v1/skybox/styles` | **works**, 86 styles | not exposed by the API; check the Blockade dashboard. This plan uses 5 generations (≤ 15 with retakes) |
| Tripo3D | `GET /v2/openapi/user/balance` | **works** | **3,210 credits** (0 frozen). This plan ≈ 120 expected, ≤ 360 worst case (+≈ 65 for the optional athlete) |
| ElevenLabs | `GET /v1/user/subscription` | **works**, Creator tier | **78,190 of 131,000** credits left this cycle. This plan ≈ 1,700 expected, ≤ 5,000 worst case |
| Poly Haven | `GET api.polyhaven.com/assets` | **works**, no key | free, CC0 |

---

## A. Exercise demos — MuscleWiki (top priority)

### What their terms require (read in full, last updated 8 Oct 2026) and what it changes

1. **No downloading, storing or re-hosting videos or thumbnails** (§2.1–2.2). Videos can only be
   streamed at runtime from `api.musclewiki.com`. So Stage A is the one runtime API use, as you
   anticipated. Nothing from MuscleWiki goes into git except *our* mapping (our exercise id → their
   numeric id).
2. **The key must never reach the client.** Their supported pattern for a browser `<video>` is a
   **short-lived media token** (15 min, `/stream/` paths only) minted by *our* backend. The app is
   static on GitHub Pages, which cannot hold a secret, so we need one tiny backend endpoint
   (≈ 40 lines): `GET /mw/token` → `{ token, expires_in }`, plus `GET /mw/exercise/:id` (name, steps,
   video URLs; edge-cached ≤ 30 days as their §3 allows). CORS locked to the app's origin and rate
   limited. **This needs a decision from you — see "Decisions needed" at the end.**
3. **Video Range requests each count as one API call.** A 6-exercise session with both angles is
   roughly 15–30 calls; ≈ 300–600 a month at 5 sessions a week. Fits TESTING only just; I will measure
   the real count per playback on iPhone Safari and report it.
4. **Branding must stay intact**: no cropping, no overlay or re-encode that hides the MuscleWiki mark.
   So the masking tape sits on the paper mount *outside* the video frame, the vintage grade is a light
   CSS filter (not an overlay over the mark), and the tempo ring sits beside the video, not on it.
5. **Required legal line**, verbatim, in the app's Terms/Privacy (Settings → Credits & legal):
   "Exercise data and videos provided by MuscleWiki.com". Plus an encouraged credit link to
   musclewiki.com.
6. **Offline**: videos may not be cached for offline use, so the service worker never caches
   `/stream/`. The offline state shows the form cues print and "Demo needs a connection".

### Mapping (dumbbell/bench only; nothing silently swapped for barbell or machine)

All candidates have front and side videos (male and female). I'll use the male videos by default
(your program's athlete), with the angle toggle.

| # | Your exercise | MuscleWiki name | ID | Match |
|---|---|---|---|---|
| 1 | Incline DB press | Dumbbell Incline Bench Press | 398 | **exact** |
| 2 | Chest-supported DB row | Dumbbell Laying Incline Row (chest on a 30–45° incline bench) | 435 | **exact** |
| 3 | DB pullover | Dumbbell Pullover | 413 | **exact** |
| 4 | Incline DB fly | Dumbbell Incline Chest Fly | 399 | **exact** |
| 5 | DB lateral raise | Dumbbell Lateral Raise | 20 | **exact** |
| 6 | Incline reverse fly | Dumbbell Laying Reverse Fly (prone on a 15–30° incline bench) | 407 | **exact** |
| 7 | Bulgarian split squat | Dumbbell Bulgarian Split Squat | 317 | **exact** |
| 8 | Single-leg DB RDL | Dumbbell Single Leg Stiff Leg Deadlift (two DBs, soft standing knee) | 462 | **close variant** — named "stiff leg" but the cues match your RDL; alt: 461 Single Leg Single Arm Deadlift (one DB) |
| 9 | DB step-up | Dumbbell Step Up | 1193 | **exact** |
| 10 | DB hip thrust | Dumbbell Hip Thrust | 286 | **exact** |
| 11 | Floor crunch with DB | Dumbbell Crunch (DB held over the collarbone, knees bent) | 563 | **exact** |
| 12 | Seated DB shoulder press | Dumbbell Seated Overhead Press | 45 | **exact** |
| 13 | One-arm DB row | Dumbbell Single Arm Row (hand on bench, feet on floor) | 456 | **close variant** — your cue is knee *and* hand on the bench; no knee-on-bench version exists (457 "Row Knee" is elbow-on-own-knee, not a bench row) |
| 14 | Incline DB curl | Dumbbell Incline Curl | 1530 | **exact** |
| 15 | Overhead DB triceps extension | Dumbbell Seated Overhead Tricep Extension (your cue says seated) | 16 | **exact** |
| 16 | Flat DB press | Dumbbell Bench Press | 377 | **exact** |
| 17 | DB RDL | Dumbbell Romanian Deadlift | 291 | **exact** |
| 18 | Reverse lunge (with DBs) | Dumbbell Reverse Lunge | 414 | **exact** |
| 19 | Goblet squat | Dumbbell Goblet Squat | 11 | **exact** |
| 20 | Lying reverse crunch | Laying Bent Leg Raise (lying, knees to chest) | 1533 | **close variant** — 882 "Reverse Crunch" has the right name but starts seated in a V, which is not your lying version. I will watch both before locking this one |

### Build pieces (no paid generation)

| Piece | Where |
|---|---|
| `src/data/musclewiki.ts` — the mapping above (our data only) | repo |
| `tools/mw-check.mjs` — verifies each mapped id still exists (metadata only, ~20 calls) | build time |
| `server/mw-token/` — the token + metadata endpoint (Cloudflare Worker by default), key as a secret of that service | deployed by you or with a token you give me |
| `VideoPrint` component: muted loop, front/side, play/pause, 0.5×, Clean toggle, name, loading / error / offline states; replaces the SVG mannequin everywhere | app |

---

## B. The room — Blockade Labs skyboxes + Poly Haven

### Skyboxes

Style: **M3 Photoreal (id 67)** — the most photographic of the 86 styles ("photographic realism, high
fidelity"). Fallback if it looks too clean: M3 Cinematic Realism (id 102, darker filmic grade).
Prompt limit is 600 characters, so each zone line is ≤ 330 characters before your suffix.

Suffix (yours, verbatim): `1970s underground iron gym, shot on 35mm film, heavy grain, faded warm
tones, halation around lamps, exposed brick, raw concrete, rusted steel, rubber floor, black pendant
lamps with warm tungsten glow, dust in the air, no people, no text, no signage`

Negative text (all zones): `people, person, figure, text, letters, words, numbers, signage, logo,
poster, watermark, modern machines, treadmill, screens, mirror selfie, cartoon, painting, oversaturated,
blurry`

| Asset | Zone prompt (followed by the suffix) | Output → shipped sizes | Cost | Used in |
|---|---|---|---|---|
| `sky-entrance` | `Entrance of a long basement gym at the foot of worn concrete stairs, a row of black pendant lamps hanging low into the distance, heavy steel door, chalk-stained concrete pillars, deep shadow between warm pools of light,` | 6144×3072 → WebP 4096×2048 (desktop), 2048×1024 (phone, ≈ 250 KB), 32 px placeholder | 1 gen (≤ 3) | Today, cold open, History |
| `sky-bench` | `Bench and dumbbell area, two worn leather weight benches, a long steel rack of rusted cast-iron hex dumbbells along a brick wall, an old squat stand, a chalk bucket, scuffed black rubber floor tiles,` | same | 1 gen (≤ 3) | Workout, Exercise detail |
| `sky-mesh` | `A tall rusted steel mesh wall panel bolted to raw concrete, rows of steel hooks holding kettlebells and coiled rope, old pipes along the ceiling, brick wall beside it, a low amber strip light along the base of the wall,` | same | 1 gen (≤ 3) | Progress |
| `sky-lane` | `A long faded red running lane painted on the concrete floor with white cross lines, an old tractor tire beside it, a thick climbing rope hanging from a steel ceiling beam, raw concrete pillars,` | same | 1 gen (≤ 3) | Week |
| `sky-ceiling` | `Looking up at a low concrete ceiling with a honeycomb of warm hexagonal light fixtures glowing amber, steel beams and old ducts between them, brick walls fading into shadow below,` | same | 1 gen (≤ 3) | Rest, Session complete |

Process: `tools/gen-skybox.mjs` (POST `/api/v1/skybox`, poll, download, `sharp` → WebP sizes), I show
you all five side by side before any retake.

### Poly Haven (CC0, free) — 1k maps, JPG → WebP

| Asset id | Maps | Used for |
|---|---|---|
| `rusty_metal_02` | diffuse, normal, roughness | milestone plate edges, plate surfaces, 3D fallback material |
| `rust_coarse_01` | diffuse | distress/edge-wear masks |
| `red_brick_03` | diffuse, normal | brick wall behind the posters (Progress), cold-open wall |
| `concrete_wall_003` | diffuse | Settings/plate backgrounds (very low opacity) |
| `rubber_tiles` | diffuse, normal | tab bar rubber strip, floor under props |
| `concrete_floor_worn_001` | diffuse | Week lane ground, scrims |
| `rusty_metal_grid` | diffuse, normal, alpha | mesh wall on Progress (3D plane the plates hang on) |
| `weathered_brown_planks` | diffuse | ledger clipboard backing, plyo box |
| HDRI `industrial_pipe_and_valve_01` (1k .hdr) | — | PBR lighting for the GLB props (warm industrial lamps). Backup: `machine_shop_02` |
| Paper | **none suitable on Poly Haven** (only plaster) → **procedural**: canvas noise + fibres + creases + foxing spots, generated once at build time to `paper-cream.webp` (1024²) | prints, ledger, punch card, posters' paper |

`CREDITS.md` will list every Poly Haven asset with its author and the CC0 licence.

---

## C. Hero, posters, props — fal.ai + Tripo3D

### The character (original, fictional)

"The Lifter": a man in his early 30s, short 1970s-cut dark brown hair, light stubble, square jaw,
dark eyes, an everyday athletic build. Not modelled on, and not to resemble, any real person.

### Images (fal.ai) — model **Nano Banana Pro** (`fal-ai/nano-banana-pro` and `/edit`, $0.15/image): best
at holding one face across edits. Cheaper fallback for retakes: `fal-ai/nano-banana/edit` ($0.04).

| Asset | Exact prompt | Size → shipped | Est. cost | Used in |
|---|---|---|---|---|
| `lifter-ref` (text-to-image) | `A 1970s gym poster illustration of an original fictional man in his early 30s, short 1970s-cut dark brown hair, light stubble, square jaw, athletic build, standing in a relaxed three-quarter pose, shown from head to mid-thigh, plain dark training shorts, no shirt. Halftone duotone print in rust orange and black ink on aged cream paper, coarse visible halftone dots, slight ink misregistration, paper fibres and soft creases, dramatic hard side light from the left with deep shadow on the right, plain paper background with wide margins. No text, no letters, no numbers, no logos, no border, no watermark. Not a real person, not a celebrity.` | 2:3, 2K → reference only (not shipped) | $0.15 (≤ $0.45) | identity reference for everything below |
| `poster-24` (edit of ref) | `Same man as the reference image: keep his exact face, hair, skin tone, age and identity, same pose, framing, side light and the same halftone duotone print style in rust orange and black on aged cream paper. Change only his physique to about 24% body fat: solid and broad, soft midsection with no visible abs, thick waist, rounded chest and shoulders. Natural and believable. No text, no letters, no numbers, no logos.` | 2:3 → WebP/AVIF 900×1350 (≈ 150 KB) | $0.15 (≤ $0.45) | Progress wall (start poster, unlocked) |
| `poster-19` | same, physique line: `about 19% body fat: a visibly leaner waist, a faint outline of the upper abs, more shape in the shoulders and arms.` | same | $0.15 (≤ $0.45) | Progress (milestone Mar 1) |
| `poster-15` | same: `about 15% body fat: lean and athletic, upper abs and obliques visible, defined shoulders and arms, faint veins on the forearms.` | same | $0.15 (≤ $0.45) | Progress (milestone May 1) |
| `poster-12` | same: `about 12% body fat: lean and muscular, a clear six-pack, defined chest and shoulders, athletic and natural, not a bodybuilder, not extreme.` | same | $0.15 (≤ $0.45) | Progress (goal Aug 31) |
| `still-hero` (edit of ref) | `A cinematic 16mm film still of the same man as the reference image (same face, hair and build, about 20% body fat), photographed for real, in a dim 1970s underground gym with exposed brick and a black pendant lamp casting a warm tungsten light cone. He claps chalk from his hands and a cloud of chalk dust hangs in the light. Medium shot from the side, shallow depth of field, heavy film grain, faded warm tones, halation around the lamp. Vertical 9:16. No text, no signage, no logos.` | 9:16, 2K → video first frame + poster still (WebP) | $0.15 (≤ $0.45) | Today hero |
| `still-rest` | same opening, action: `He sits on the end of a worn leather bench between sets, forearms on his knees, head slightly down, breathing, a towel over one shoulder, dust motes drifting in the lamp light behind him.` | same | $0.15 (≤ $0.45) | Rest screen |
| `still-complete` | same opening, action: `He sets a rusted hex dumbbell back on a steel rack and exhales, chalk on his hands, a slight satisfied smile, warm lamp light from above.` | same | $0.15 (≤ $0.45) | Session complete |

Locked posters (painted-over silhouette, torn paper) are made in the app from the poster images with
masks, so they cost nothing extra.

### Video loops (fal.ai image-to-video)

Model: **Kling 2.5 Turbo Pro** (`fal-ai/kling-video/v2.5-turbo/pro/image-to-video`, **$0.07/s → $0.35
per 5 s**). Veo 3.1 Fast is $0.15/s ($0.75 per clip), so Kling first; Veo only if Kling's take is poor
and you approve.

| Asset | Exact prompt (start frame = the still above) | Output → shipped | Est. cost | Used in |
|---|---|---|---|---|
| `loop-hero` | `16mm film look, flickering warm tungsten lamp, dust motes drifting in the light cone, slow push-in. The man claps chalk from his hands once and rubs them together, chalk dust swirling in the light. Subtle natural motion, steady camera, no cuts.` negative: `text, watermark, logo, morphing face, extra fingers, distortion, fast motion, camera shake` | 5 s 1080p → crossfaded seamless loop, H.264 MP4 + VP9 WebM 720×1280, < 2 MB | $0.35 (≤ $1.05) | Today |
| `loop-rest` | `16mm film look, flickering warm tungsten lamp, dust motes drifting, slow push-in. The man breathes slowly, shoulders rising and falling, otherwise still. Steady camera, no cuts.` | same | $0.35 (≤ $1.05) | Rest |
| `loop-complete` | `16mm film look, flickering warm tungsten lamp, dust motes drifting, slow push-in. The man lets go of the dumbbell on the rack and exhales, then looks up into the light. Steady camera, no cuts.` | same | $0.35 (≤ $1.05) | Session complete |

After each first take I'll show you frame stills before spending on any second take.

### 3D props (Tripo3D, text-to-model, PBR, aged materials)

| Asset | Exact prompt | Output → shipped | Est. credits | Used in |
|---|---|---|---|---|
| `prop-dumbbell` | `A rusted cast-iron hexagonal dumbbell from a 1970s gym, chipped black paint over orange-brown rust, worn knurled steel handle polished by hands, realistic proportions, single object, no text, no logo` | GLB → meshopt + 1k WebP textures, < 1 MB | ≈ 40 (≤ 120) | floating dumbbell on Rest |
| `prop-plate` | `An old cast-iron weight plate, round with a raised outer rim and a centre hole, worn black enamel with rust showing through, smooth faces, no lettering, no numbers, single object` | same | ≈ 40 (≤ 120) | milestone plates on the mesh wall (Progress); the number is HTML over it |
| `prop-kettlebell` | `A vintage cast-iron kettlebell, rough sand-cast surface, rust patina with worn black paint, smooth handle polished by use, single object, no text, no logo` | same | ≈ 40 (≤ 120) | Progress shelf, Week empty state |
| *optional* `lifter-3d` | image-to-model from `still-hero` + auto-rig + idle animation | GLB < 1 MB | ≈ 65 | Today hero, **only if it looks believable**; otherwise dropped |

Rendered in three.js lit by the Poly Haven HDRI. Earned plates are lit by a warm spot, upcoming ones are
dim with a cold rim.

---

## D. Sound — ElevenLabs

### Effects (`POST /v1/sound-generation`, model `eleven_text_to_sound_v2`)

| Asset | Exact prompt | Duration | Est. credits | Used in |
|---|---|---|---|---|
| `sfx-plate-drop` | `A heavy cast-iron weight plate dropped flat onto a thick rubber gym floor in an empty brick basement, deep thud with a short metallic ring, short natural room reverb` | 2.0 s | ≈ 80 | PR, session complete, milestone |
| `sfx-stopwatch-tick` | `A single crisp tick of an old analog mechanical stopwatch, close up, dry` | 0.5 s | ≈ 20 | tempo lowering ticks |
| `sfx-flap` | `A single mechanical split-flap display flip, one plastic flap clacking over, close up, dry` | 0.5 s | ≈ 20 | rest countdown |
| `sfx-stamp` | `A rubber stamp pressed hard onto paper on a wooden desk, firm muffled thud, close up` | 0.8 s | ≈ 30 | set complete, milestone |
| `sfx-chalk-clap` | `Two hands clapping chalk off once, a soft dry powdery clap with a puff of dust, in a brick room` | 1.0 s | ≈ 40 | streak, cold open |
| `sfx-lamp-hum` | `An old tungsten lamp switching on with a click, then a low electrical hum and a faint intermittent buzz` | 3.0 s | ≈ 120 | cold open, lamp flicker |
| `amb-room-tone` (loop) | `Room tone of an empty underground brick gym at night: a low ventilation hum, a distant pipe tick, faint lamp buzz, no voices, no music, seamless loop` (with `loop: true`) | 30 s (the API maximum; your 30–60 s range is met at 30 s) | ≈ 1,200 | ambient bed |

I'll measure the real credit cost from the subscription counter after the first call and correct these.

### Voice cues — one coach voice from the voice library (no clones of real celebrities)

Shortlist (all from the public library, deep and gravelly, calm). Previews are free; listen and pick:

| Voice | ID | Notes | Preview |
|---|---|---|---|
| **Joseph Ortman – Deep & Raspy** (my pick) | `TTyZrDYo6LQowrH8mixJ` | "deep, gruff, raspy, weathered, calm, confident" | [mp3](https://storage.googleapis.com/eleven-public-prod/database/workspace/84bfa28459634f8fb30ca6e5a8643fd4/voices/TTyZrDYo6LQowrH8mixJ/dQG8Y3fvH8eI4jsaLQBJ.mp3) |
| Atlas – Deep, Gravelly Narrator | `3YzGaTGef0x5PLEK9yGq` | documentary, measured | [mp3](https://storage.googleapis.com/eleven-public-prod/database/workspace/6d0695d80340403b9bd9a971d45fc0b2/voices/3YzGaTGef0x5PLEK9yGq/P0f7KBR5gxNKTAeJ8HFA.mp3) |
| Chuck Miller – Deep, Raspy, American | `HIGUfNOdjuWQwwapnTRW` | warmer, older | [mp3](https://storage.googleapis.com/eleven-public-prod/database/user/QLeoIFNQuWZCsHPkmGfqE1ZH3NA2/voices/HIGUfNOdjuWQwwapnTRW/KmCIshV3FvIyhIDQPsUp.mp3) |

Clips (`eleven_multilingual_v2`, stability 0.6, style 0.1; each a separate file so they can be timed to
the tempo ring): `Three.` `Two.` `One.` `Lower.` `Hold.` `Press.` `Last rep.` `Rest.` `Set complete.`
`Next exercise.` — 10 clips, ≈ 70 characters, ≈ 200 credits with two takes. Uses 1 of 30 voice slots.

All audio shipped as AAC `.m4a` + `.mp3` fallback, loudness-normalised, ≈ 250 KB total plus ≈ 350 KB
for the room tone.

---

## E. Free, made in the repo

| Asset | How |
|---|---|
| Fonts: Big Shoulders Stencil Display, Special Elite (plus the existing Big Shoulders Display, Instrument Sans) | `@fontsource` packages, SIL OFL 1.1, latin subset, self-hosted |
| Film grain tile 256² | generated noise WebP |
| Paper, creases, foxing | procedural (see B) |
| Masking tape, Dymo label, punch card, chalk strokes, stamps, dial face | SVG in code |
| Scratches / edge wear masks | from `rust_coarse_01` thresholds |

---

## Budget summary

| Service | Expected | Worst case (3 takes everywhere) | Cap / balance |
|---|---|---|---|
| fal.ai | **≈ $2.30** (1 ref + 4 posters + 3 stills + 3 loops) | $6.75 | your cap $20, balance **$15.32** |
| Blockade | 5 generations | 15 | plan's included credits |
| Tripo3D | ≈ 120 credits | ≈ 425 (with optional athlete) | 3,210 |
| ElevenLabs | ≈ 1,700 credits | ≈ 5,000 | 78,190 |
| MuscleWiki | ≈ 20 build calls + runtime streaming | — | plan quota (1,000/month on TESTING) |
| Poly Haven | free | free | — |

---

## Decisions needed before I build

1. **MuscleWiki token endpoint.** GitHub Pages can't keep a secret, and their terms forbid shipping the
   key or hosting the videos. Options: (a) **Cloudflare Worker** (free tier) — I write it and the deploy
   script; you either run one `wrangler deploy` command or give me a Cloudflare API token as a network
   secret so I can deploy it; (b) Vercel or Netlify function, same idea; (c) no backend: I build the
   video print fully, and it shows the cues print with "Demo unavailable" until an endpoint exists.
2. **Offline fallback.** Their terms forbid caching videos offline. Should offline show only the cues
   print (my default), or keep the old SVG mannequin as an offline-only fallback?
3. **Voice**: Joseph Ortman (my pick), Atlas or Chuck Miller?
4. **Optional athlete 3D** (≈ 65 Tripo credits): try it, or skip?
5. **MuscleWiki plan**: do you know your tier? If it is TESTING (1,000 calls/month), real use may run
   close to the limit; GROWTH ($39.99/month, 30,000) removes the worry. I'll measure calls per playback
   either way.
