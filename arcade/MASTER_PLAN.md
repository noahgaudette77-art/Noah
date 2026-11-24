# INR Arcade: the master overhaul (long-running, phased, resumable)

Started 2026-11-23 at commit `ee413e3` (the overhaul's base: every diff check is against it).

## How to resume (read this first after any pause or context reset)

1. Read **Now** (just below), then the phase it names, then `git log --oneline -15`.
2. `node arcade/tools/harness.js --quick` (from `/home/user/Noah`) shows whether the build is sound: rules IDENTICAL,
   content and scripts untouched, every screen's cost inside its budget.
3. Carry on from **Next steps**. Update this file as work lands (status, decisions, measurements); commit it with the
   work; push after every phase, with a hand-over note at the bottom.

## Now

- **The owner changed the order of the phases (2026-11-24):** 0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8; and
  nothing in an environment or asset that will be rebuilt is polished before it is (see The order, below).
- **Phase:** 5, environments and new assets. Phases 0 and 1 are done; Phase 2's first pass is closed (its work stays,
  checked: `docs/master/phase2/`); its polishing resumes after Phase 3.
- **Doing:** the first pass's last checks (the harness `phase2-final`: logic and stills of every screen clean on both
  devices; its costs, the stall census of every game and every screen in WebKit to come), then its record in
  `docs/master/phase2/` and a short report to the owner.
- **Next steps (Phase 5):** 1) the rebuild list: every screen's environment and its assets judged keep, improve in
  place, or rebuild (new geometry, new generated models, pre-rendered skies), with the evidence (the stills of
  `phase2-final`, the audits, the review); nothing on it polished before it is rebuilt; 2) the budget for new assets
  (Tripo 1,926 credits and fal.ai $10.95 within the caps; cheaper settings first; only what is clearly below the bar);
  3) the work, screen by screen, each with its before/after and its costs on both tiers; 4) the gate (every screen
  consistent; budgets kept), a report.

## The order, in short (the owner, 2026-11-23)

Take the whole game to the best version reachable, over many hours or days: graphics, animation, game feel, audio,
performance. Devices: iPhone 17 Pro Max (portrait, touch) and MacBook Air (Apple silicon, landscape, mouse and keyboard,
Safari and Chrome). Goals in order: 1) steady, smooth FPS, no stutter; 2) a sharp, blur-free image; 3) fluid, weighty,
non-robotic movement and fighting; 4) beautiful, consistent, detailed visuals on every screen; 5) great audio;
6) everything the study content does stays exactly as it is.

**Absolute rules:** never change study logic, questions, answers, scoring, boss health rules, or anything in
`arcade/content/` or `scripts/` (a diff check at the end of every phase); never remove a feature or rearrange screen
flow; never make the repo public; keep the served link working at every checkpoint; smoothness beats detail (a change
that drops a tier below a steady 60 FPS, or the device's cap, is simplified or reverted, never shipped); every change a
small commit; never leave the branch broken; if a phase makes things worse, revert it and say so.

**Spend:** never more than 60% of a provider's remaining balance in all; cheaper settings first; regenerate only what is
clearly below the bar; every spend in `ASSETS.md`; no top-ups.

**Reporting:** after each phase a short message (what improved, with numbers and pictures; what was reverted; spend so
far; what to test on the iPhone and the Mac); keep going without waiting unless a decision cannot be undone.

**The order of the phases, changed by the owner (2026-11-24), verbatim:** "PHASE ORDER OVERRIDE: run the phases in this
order: 0 (baseline, audit, art bible), 1 (performance foundation: budgets, pipeline, tiers only), 5 (environments and new
assets), 3 (animation and characters), 2 (image quality polish), 4 (game feel), 6 (audio), 7 (Mac polish), then a final
performance re-check, then 8 (final verification). Do not polish anything in an environment or asset that is scheduled
to be rebuilt later."

So: **0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8.** Phase 2 had gone first (before the override) and is closed as
a first pass (below): what it did stays; its polishing resumes after Phase 3, on environments and assets that are then
final. Phase 5 begins with its rebuild list: what will be rebuilt is not polished meanwhile.

## What this machine can and cannot measure

- It draws in software (SwiftShader in Chromium, WebKit's own software path): a frame here takes 100 ms to several
  seconds. Its frame times compare one build with another; they are never a device's. "A steady 60 FPS" is judged by
  (a) each screen's budget on each tier (draw calls, triangles, lights, pixels shaded, textures and render targets held,
  the main thread's own script time), set from what the devices sustain; (b) the governor's tests (it steps a tier down
  within seconds when frames run late); (c) the owner's FPS counter on the devices (Setup > FPS counter): every phase
  report says what to look at.
- The rules' regression plays 153 answers in 8 games frame by frame on a virtual clock: IDENTICAL means no rule moved.
- Tools here: Playwright (Chromium and WebKit, `WEBKIT_BROWSERS_PATH` in the scratchpad), glTF-Transform (core,
  extensions, functions, meshoptimizer), ImageMagick, ffmpeg, Python 3. Blender: not installed (4.0.2 via apt when
  needed). KTX2 encoders (toktx, basisu): not installed, and GitHub's release downloads are blocked here (an npm or
  WASM encoder to be found when KTX2 is taken up). Spector.js: its counts come from `cost-report.js`'s own WebGL
  counters and `renderer.info`. Network: Poly Haven's API and ambientCG's reachable; npm reachable.
- Providers: Tripo, fal.ai (Rodin, image models), ElevenLabs, Blockade. No Meshy key: key assets are compared Tripo
  against Rodin.

## Budget (balances read live 2026-11-23; the cap is 60% of each)

| provider | balance at the start | cap (60%) | spent in the overhaul | left within the cap |
|---|---|---|---|---|
| Tripo | 3,210 credits | 1,926 credits | 0 | 1,926 |
| fal.ai | $18.859 | $11.31 | $0.36 (the art bible's sheet $0.30, two skylights $0.06) | $10.95 |
| ElevenLabs | 78,267 credits left (52,733 of 131,000 used) | 46,960 credits | 0 | 46,960 |
| Blockade | plan credits (no balance in its API) | at most 6 skies | 0 | 6 skies |

What the caps allow, roughly: Tripo, about 6-8 key models with their rig and clips (a rigged boss is about 205-345
credits: model 60, segmentation 40, rig 25, clips 10 each), so a boss is remade only if clearly below the bar; fal.ai,
about 9 Rodin models at $1.20, or 300+ reference images at $0.03; ElevenLabs, about 4,000 seconds of effects or 2-3
music pieces.

## Shared standards (the harness checks what it can)

- **Tiers:** PHONE, MAC, SAFE (and the governor's last step), Setup > Graphics: AUTO. The governor: drawing size first,
  then effects, then lights; thermal-aware on long Mac sessions; iOS Low Power Mode met with SAFE.
- **Budgets** (per screen; `tools/harness.js`): phone near 100 draw calls or fewer; textures and render targets held
  in check (a phone screen under 400 MB in all, no reload from memory pressure); lights 3-5; WebGL, never WebGPU.
- **Sharpness:** MSAA (or SMAA), no FXAA, no unverified TAA; text and UI as HTML over the canvas; the right pixel
  ratio and anisotropy; nothing stretched or soft.
- **Evidence:** stills of every screen at the same moments before and after, and each screen's draw calls,
  triangles, memory and frame cost on each tier (`docs/master/`).

## Phases (each passes its gate before the next starts; run in the owner's order of 2026-11-24: 0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8)

### Phase 0: baseline and audit (done 2026-11-23)
- [x] the plan and the budget (this file)
- [x] `tools/harness.js`: the rules' regression (from disk and served), the screen sequence, the content and scripts
      diff against `ee413e3`; stills of every screen on the phone and the Mac compared with the baseline; overlapping
      text; each screen's cost against its budget and against the baseline; a report (markdown and JSON); its exit code
- [x] the baseline run (`docs/master/baseline/`): every screen on both tiers
- [x] the ranked audit: the weakest visuals, animations, feel, audio and performance costs, every screen
- **Gate:** baseline report committed, harness working. **Passed** (no fault; see Measurements).

### Phase 1: performance foundation
Fixed timestep with interpolated rendering (to decide, with evidence: the rules run on each frame's own step today and
the regression is played at 60 Hz; the look was made rate-independent in the animation pass), object pooling, shader
pre-warming, asset preloading, draw-call reduction (merging, instancing), compression and LODs, baked lighting instead
of real lights, half-resolution post effects, visibility-based updates, Low Power Mode.
- **Gate:** every screen inside its budget on the phone and Mac tiers, with numbers. **Passed** 2026-11-23
  (`docs/master/phase1/`: no fault; what changed, what was measured and left, and why).
- Done: the census tools (`hitches.js`, `texmem.js`, `cycles.js`, `cost-report.js --cpu --textures --stub --settle`);
  shaders built ahead in the title hall (`GFX.prepare`, `8f3859f`); Risk Blaster's crack readied (`a0ed99d`); stills the
  same run after run (`13f3007`); script time measured over many frames (`836b099`). Already in place before the
  overhaul and checked: pre-warming (`GFX.warm`), preloading (`Assets.prefetch`), light budgets (`LightPool`), the
  tiers and the governor (thermal-aware, Low Power Mode), half-size post effects, rigid bosses merged to skinned meshes.
  Decided against, with evidence: a fixed timestep for the whole game, KTX2 now, rewriting for garbage.

### Phase 2: image quality (first pass done 2026-11-23/24 ahead of the owner's new order; polishing resumes after Phase 3)
- **First pass, closed by the new order (2026-11-24):** everything it shipped stays, all live: no FXAA on any tier; the
  art bible; the interface's faults; the title hall's floor, glass, steel, skylights and windows, its end on a Mac, the
  cracked glass; Memory Bank's room and its Mac layout; Boss Rush's arena; the Final Exam's hall and Proctor; Nest Egg
  Run's street; the guide's shelves; the Mac's text collisions and Risk Blaster's band seams; the hub's lasers. Checked
  by the harness (`phase2`, `phase2-final`), an independent review (two live faults it found fixed at once: `ca21db2`;
  its rendering findings: `ff37119`, `1a0d853`, `1cc89d2`), the stall census and WebKit: `docs/master/phase2/`.
- **When it resumes (after Phase 3):** polish only, on what Phases 5 and 3 leave final: light, materials and colour on
  the rebuilt environments and new assets; the results bar and the small icons (from the review); a second independent
  review; its gate as written below.
Art bible (`ART_BIBLE.md`) and its fal.ai reference sheet first (`tools/gen/artbible.js run`, about $0.24); MSAA
everywhere (no FXAA: the governor's last step gets 2x multisampling; prepared in a stash, built after Phase 1's gate);
PBR materials from ambientCG and Poly Haven (CC0) where surfaces are flat or smudgy (candidates found: MetalPlates015A/
017A sci-fi deck plates, DiamondPlate008 tread plate, Metal009-012 brushed steel, Marble012/016/021); texture and UV
cleanup; one coherent synthwave look; skies and environments; weak assets brought up (key assets made with Tripo and
Rodin and the better kept; only what is clearly below the bar). The order, from the audit:
1. no FXAA on any tier (S); 2. the art bible and the reference sheet (S);
3. the interface's faults: the results bar over its content, Risk Blaster's sheet over the answer cards (Mac), MASTERY
   over the cells' name plates (Mac), TAP TO ENTER on hazard stripes, the menus' murky frosted backdrop, text touching
   card edges (Mac), the tiny 10-16 px icons (S each);
4. the title hall's floor (a deck that reflects), its cells' glass (Fresnel and reflection), caps, brackets and base
   tops (steel, tread plate) (M);
5. Memory Bank's wall and floor, Boss Rush's floor and pillars, the exam's columns, the racer's facades (M each);
6. the colours: Memory Bank's green-black and the arena's royal blue brought to the shared violet-black; no boss on its
   own colour; the skylight that shows no sky; the side windows' glare (S-M).
- **Gate:** no blur, no stretched textures, no overlapping text; budgets kept; stills before and after at the same
  moments (deterministic since `13f3007`).

### Phase 3: animation and characters
Follow-up of the animation pass (2026-11-23): what it left (feet in wide shots, the other games' characters), rigs and
skinning re-audited, clip sets, state machine, the twelve principles, procedural life, boss personalities.
- **Gate:** no snapping, no T-pose, no sliding; budgets kept; capture sequences for each main character and two bosses.
- **The plan (written while Phase 2's agents worked):**
  1. *Strips first, before any change*, on the capture tool's virtual clock (every frame 1/60 s), the same moments in
     any build: Boss Rush (`tools/scenarios/motion.js`, two bosses and the wizard: idle, strike, cast, fall, defeat;
     wide shots for the feet: an entrance and a fall), Risk Blaster (`blaster-combat.js`: the ship's and the demon's
     entrances, firing, a hit, the demon's strikes from telegraph to landing, its death), Nest Egg Run (`racer-run.js`:
     a lane change, a gate, a crash, a boost: the rig's lean, pitch, suspension, wheels), the Final Exam (a strip
     scenario to write: the Proctor waking, a right and a wrong answer, its fall), the title hall (`title-hall.js`: the
     caged bosses' idles, a cell's alarm), the hub, the crowd (after the arena agent's work).
  2. *Read every strip for* snapping (a pose or a position jumping between frames: `tools/motion-hz.js --pops`
     finds the largest one-frame moves against their neighbours), T-poses or bind poses showing (a clip not yet
     loaded), sliding feet (a foot moving while planted, in the wide shots), stiffness (parts that never move against
     each other), robot timing (constant speeds, no anticipation or follow-through), and characters that never look at
     what they react to.
  3. *Fix the worst first*, by the owner's order (smoothness first: nothing that costs a phone's frame): the motion
     core (`07b-motion.js`: damp, Spring, Follow, noise, ease) for everything procedural; crossfades for clip changes;
     layers (`overlay`) for reactions; feet planted in the wide shots (lock a planted foot's world position over its
     clip's contact frames; the fights frame the feet out otherwise).
  4. *The gate's evidence*: before/after strips for each main character and two bosses in `docs/master/phase3/`,
     `motion-hz.js` before and after (60, 90 and 120 Hz alike), each screen's cost (script ms with drawing left out, the
     builds alternated on a quiet machine), the logic diff clean.

### Phase 4: game feel
Input at once with a small buffer; hit-stop; capped, reducible shake; recoil; impacts; telegraphs; answer feedback;
finishers; camera damping and look-ahead; trails and speed cues by tier; Risk Blaster, Nest Egg Run, Boss Rush; the
wizard's casts, wand and cape tight to the sound.
- Carried here from Phase 2: Risk Blaster on a Mac, while an explanation is up, lifts the picture so the fighter shows
  over the sheet and the demon's head goes under the question panel (the audit's #15, its camera half): on a wide
  window the lens could stand back a little instead of the whole picture riding up.
- **Gate:** each game reviewed with a capture sequence; budgets kept; the logic diff clean.

### Phase 5: environments and new assets (NOW, from 2026-11-24, by the owner's new order)
The title hall's cells as a real prison, each arena, the vault, Memory Bank and the rest: instancing, baked glow, sprite
fog, cheap animated details; the Mac denser, the phone lean. With the owner's new order it also carries the new assets
(key assets made with Tripo and Rodin, the better kept, only what is clearly below the bar; pre-rendered skies where
they save the GPU). **First its rebuild list**: every environment and asset judged keep, improve in place, or rebuild;
nothing on the rebuild list is polished before it is rebuilt.
- Carried from Phase 2's gate review: the room captures are taken once (and again at a boss's power-up), so Boss Rush's
  rage (its neon turning red) and its moving searchlights and lightning are not in the deck's reflection: tint the
  reflection with the rage, or capture again at its thresholds; the hub's club lasers could take a soft halo (one
  reads as a bright line from the ceiling to the floor).
- Carried here from Phase 2's audit list: Risk Blaster's asteroids (the near ones are the generated rocks, lit dark; the
  far ones built-in low-poly lumps on the hull material: flat grey against the painted nebula; #25), the C drone's box
  side-pods and the ringed planet behind the B drone (#25); the hub's cabinets' black lower bodies (they read as a void
  under the lit tops; the hub is otherwise a keep); the title's end: the left edge's dark arch panorama and the fact
  card's empty lower third (#10's notes).
- **Gate:** every screen consistent; budgets kept.

### Phase 6: audio
Loudness matched across screens, no hiss or static, varied effects, tight sync, fitting music, the volume controls;
ElevenLabs within budget.
- **Gate:** the sound test page passes; no clicks or cuts.

### Phase 7: desktop polish for the Mac
Landscape layouts, keys, hover, Retina and display changes, resizing without leaks, Safari and Chrome, long sessions.
- Carried from Phase 2's gate review: the results screen's button bar still covers the end of its content when the page
  is scrolled to the top (the phone's FLAWLESS line, the Mac's mastery panel), and the menus' small icons are still
  under the art bible's 20 px (stars 15-16 px, the stat emblems about 16): both to the Mac's and the phone's layout
  work here.
- To check on a real Safari (seen in this machine's WebKit, which draws in software): Nest Egg Run's car draws pale, as
  if lit by a white glare, in WebKit here, before the overhaul (2026-11-22) as after Phase 2; Chromium draws it gold.
- **Gate:** a 30-minute soak on the Mac tier with no slowdown or memory growth.

### The performance re-check (after Phase 7, before Phase 8: the owner's new order)
Every screen measured again on both tiers against Phase 1's budgets and the baseline, the census (stalls, garbage, page
changes), memory over cycles, the governor in both engines; whatever a later phase cost put right before Phase 8.

### Phase 8: final verification
The whole harness; every screen and game on both tiers in WebKit and Chromium; the content diff; fixes; the final
gallery, a short film of the title hall and one fight, a performance table, the final spend and a token estimate;
pushed; the served link checked.

## Decisions (with the evidence for each)

- **Fixed timestep with interpolated drawing: not adopted for the whole game (Phase 0, 2026-11-23).** The rules run on
  each frame's own step (`99-main.js`: the step is the frame's time from the browser's frame clock, at most 50 ms), and
  the regression plays them at 60 Hz and must come out IDENTICAL; both devices show 60 frames a second (iOS Safari
  holds a page to 60, the MacBook Air's panel is 60 Hz), so a fixed 1/60 step would be the same step there. What a
  fixed step buys, motion that does not depend on the frame rate, was bought where it shows in the animation pass:
  measured against 240 Hz, the boss and the wizard move within 0.33 cm (mean) at 60 Hz and 0.09 cm at 90 and 120 Hz
  (`tools/motion-hz.js`). Interpolated drawing would need the previous and the current place of every moving thing in
  eight games kept and blended, a rewrite of every game's update with the rules inside it, for no change at 60 Hz.
  Kept instead: the frame clock's own timestamps (no jitter from the script's own timing), the 50 ms cap (a stall
  never throws a thing across the screen), the exact easing and springs of the motion core, and the governor, which
  keeps frames on time.
- **The post-processing stays the game's own pipeline (`04b-pipeline.js`); pmndrs `postprocessing` was weighed
  (Phase 0).** Version 6.25 is the last that runs on this three.js (r128: `>= 0.107 < 0.139`). The game's pipeline is
  already what that library would give: one scene pass into a multisampled HDR target (MSAA kept: 4x on the Mac, 2x
  on the phone), bloom from a soft-threshold bright pass on that HDR picture (so only what is brighter than white
  glows: the emissive signs, lamps and effects, not the lit surfaces) down a mip chain at half size and less, and
  every per-pixel effect (exposure, ACES, the grade, the CRT glass) merged into one final pass; on the phone a frame
  is 9 passes. Swapping it would bring nothing a frame does not already have and would lose the tiers' fine control.
  What the library would add that is wanted: SMAA, for a device whose multisampling fails its check (see Phase 2).

- **KTX2/Basis textures: not now (Phase 1, 2026-11-23).** The phone's largest screen holds 371 MB in all, and what is
  left from earlier screens is about 32 MB; round after round of every screen nothing piles up (`cycles.js`). The
  bulk is each screen's own hero pictures (two 2048 maps a model). UASTC would keep the detail at a quarter of the
  graphics memory but triple each picture's download (a slower first load on a phone's network); ETC1S would keep the
  download and soften the detail the owner asked to keep. With memory inside the line, the trade is not taken; the
  tools to see it again are `cost-report.js --textures` and `texmem.js`.
- **Per-frame garbage: measured, not rewritten (Phase 1).** Once the code is warm: the title hall 4-8 KB a frame, the
  hub 5, Risk Blaster and Nest Egg Run about 61 (effects, traffic and the drones' updates). At 61 KB a frame the
  collector sweeps every few seconds for about a millisecond: not a stutter. (Chromium boxes fractional numbers that
  Safari stores in place, so Safari makes less.) The page's own elements change 0-0.8 times a frame (a bar's style).
- **Shaders built ahead in the hall, not a longer opening (Phase 1).** The title's bosses arrive while the lens
  glides (the opening is not held back for them); each piece's programs are now asked for before it is hung and it
  is shown once Safari's driver says they are built (`GFX.prepare`; `KHR_parallel_shader_compile`, present in WebKit
  here, absent in this machine's Chromium, present in Chrome on a graphics chip).

- **Reflections from a room probe, not a second drawing (Phase 2, 2026-11-23).** A floor that gives the room back is
  the art bible's first rule for "lit" (the hub's mirror was the one screen called lit). A planar mirror draws the
  whole scene again every frame (the phone tiers left it off for that). Instead each room is drawn once into a small
  cube (128 px a face on a phone, 256 on a Mac, a face a frame, again when the room is complete), and the floor looks
  it up where its reflected ray meets the room's box (box projection: the cells' colours lie under the cells), blurred
  by the plates' roughness; glass and steel use the same capture. One texture look-up a pixel, no extra draws:
  measured on the title, draws and triangles unchanged, textures +11 MB on the phone.

## Tried and reverted

(none yet)

## The audit (Phase 0, 2026-11-23): the weakest first, by the owner's order of goals

Sources: the baseline run (`docs/master/baseline/`: stills, costs, report), the Phase 1 census tools
(`tools/scenarios/hitches.js`, `texmem.js`, `cycles.js`), `tools/audio-levels.py`, and an independent reviewer's look at
all 42 stills (full notes, with places in each picture: `docs/master/visual-audit.md`).

**1. Smoothness (performance).** Every screen is inside the phone's budget (draws, triangles, lights): see
Measurements. What is left to win:
1. **Graphics memory on the phone.** Risk Blaster holds about 371 MB in all (306 MB of textures), the title hall 346
   (284), Nest Egg Run 314 (245), Boss Rush 254 (209). Under the 400 MB line, but with little room for the moment a
   new screen's pictures arrive before the old one's go. Find the largest pictures (`texmem.js`) and shrink what is
   bigger than it is ever shown.
2. **Stalls in play.** Risk Blaster still makes one shader in mid-fight (a MeshBasicMaterial not in its scene); the
   other games to be counted (`hitches.js`).
3. **Garbage a frame.** Risk Blaster leaves about 78 KB a frame in Chromium before its code is warm (CombatFX's and
   the game's own update first); to be counted warm in every game, and the clear per-frame allocations removed (they
   cost Safari too).
4. **The main thread a frame** (this machine, script only): Memory Bank 4.4 ms (8.5 at worst), Risk Blaster 4.05, Boss
   Rush 3.75, the guide 3.42 (8.4 at worst), the exam 3.4. Inside a 16.7 ms frame; the worst moments to be found.
5. **Draw calls:** the Final Exam draws 83 a frame on the phone, the most of any screen (budget 100).
6. **Memory over a long session:** round after round of every screen (`cycles.js`), nothing should pile up.

**2. Sharpness.** MSAA on every tier but the governor's last step, which draws with FXAA (one cheap pass, soft) at
exactly the moment a struggling phone needs it least: give it 2x multisampling (Phase 2). The menus' icons (stars,
medals, coins, trophies) are drawn 10-16 px and read as smudges (Phase 2).

**3. Movement.** The animation pass made the bosses and the wizard; still stiff: Boss Rush's crowd (flat cut-outs that
never move), the Final Exam's Proctor (dark, hard to read), the other games' characters to be looked at in motion
(Phase 3).

**4. Looks** (the reviewer's ranking, worst first; the full 25 in `docs/master/visual-audit.md`):
1. Boss Rush's arena: the crowd is unlit black cut-outs on flat blue stands, the pillars untextured boxes, the floor empty.
2. The title hall's floor: a black void with a thin cyan grid filling 25-40% of the frame, reflecting nothing; flat walls.
3. The title hall's cells: the glass reads as flat tinted plastic; caps, brackets and base tops are untextured boxes.
4. The Final Exam: the Proctor too dark and lost in an all-violet hall; its mortarboard a plain slab.
5. The Strategy Guide: the shelves in the middle distance fall back to a flat beige that reads as empty.
6. Nest Egg Run (the Mac above all): the near buildings are untextured boxes; the road's edges pure black.
7. Risk Blaster's explanation sheet (Mac): laid over the answer cards, which show cut off mid-word.
8. Memory Bank (Mac): the vault squeezed into a 305 px strip; 60% of the window empty.
9. Results: the button bar covers the FLAWLESS badge, half the mastery panel and the "read the notes" button.
10. The title's end (Mac): the logo and INSERT COIN cover the vault door, where the glide was going.
11. The Proctor has three different designs (its cell, the exam, the chapter-select picture).
12-25: the exam's flat columns; Memory Bank's flat wall and wireframe floor; the menus' murky frosted backdrop; Risk
Blaster's hard band edges (Mac); the menus' tiny icons; the wizard's matte "toy" look beside the chrome bosses; the
title's small cells on the phone; a smeared skylight; MASTERY printed over a name plate; scribbles over the Proctor and
a red alert with no red light; the hub's hairline lasers and black cabinet bases; clutter at the racer's far end; text
touching card edges on the Mac; flat grey asteroids.
Across screens: every screen draws its floor its own way; Memory Bank (green-black) and the Boss Rush arena (royal
blue) leave the violet-black the rest share; the Mac's layouts are weaker than the phone's on nearly every screen.
Keep: the hub, the demon and the ship, the vault door, the bosses in their cells, the phone's layouts of the title's
end, Risk Blaster and the hub.

**5. Sound** (`tools/audio-levels.py --mix`): the music is matched (every track -29.5 to -27.2 LUFS at the mix); the
effects' loudest moments sit at a median of -22 to -25 dB and the announcer's at -9.6, so the voice stands well forward;
two cues reach full scale before the limiter (impact_good, impact_big); some cues' takes differ by up to 3.7 dB
(reward, ui_click); the hub has one effect of its own. Nothing clips at the limiter (the loudest moment on any screen
comes out at -1.8 dBFS).

## Measurements (current; the baseline first)

**Baseline** (`docs/master/baseline/`, commit `89cfb56`, Chromium, every asset in; the rules IDENTICAL from disk and
served, the screen sequence ALL 13 STEPS OK, content and scripts untouched; no fault). Memory = textures + render
targets + geometry buffers held on the graphics chip. Script = the main thread's own time a frame, this machine
(software drawing: compare builds, not devices). Every screen at its tier's full drawing size.

Phone (PHONE tier, 880 x 1912, 2x multisampling, 9 passes, 6.2 Mpx shaded a frame on every screen):

| screen | draws | triangles | lights | memory MB (textures) | script ms (worst) |
|---|---|---|---|---|---|
| title hall (glide / end) | 33 / 35 | 146K / 185K | 4 | 346 (284) | 2.0 / 1.7 |
| hub | 44 | 100K | 4 | 229 (183) | 2.47 (3.7) |
| Risk Blaster | 49 | 154K | 5 | 371 (306) | 4.05 (5.5) |
| Nest Egg Run | 58 | 100K | 5 | 315 (245) | 2.55 (2.7) |
| Boss Rush | 57 | 91K | 5 | 254 (209) | 3.75 (4.7) |
| Memory Bank | 53 | 98K | 4 | 115 (74) | 4.4 (8.5) |
| Final Exam | 83 | 37K | 5 | 150 (104) | 3.4 (4.1) |
| Strategy Guide | 49 | 32K | 3 | 104 (65) | 3.42 (8.4) |

Mac (MAC tier, 2940 x 1660, 4x multisampling, 22-24 passes, 37.6-39.6 Mpx shaded a frame):

| screen | draws | triangles | lights | memory MB (textures) | script ms |
|---|---|---|---|---|---|
| title hall (glide / end) | 63 / 48 | 293K / 185K | 4 | 679 (432) | 2.0 / 2.5 |
| hub | 87 | 313K | 4 | 577 (340) | 8.5 |
| Risk Blaster | 66 | 160K | 5 | 795 (546) | 3.2 |
| Nest Egg Run | 91 | 184K | 5 | 794 (532) | 3.5 |
| Boss Rush | 61 | 50K | 5 | 698 (462) | 4.2 |
| Memory Bank | 90 | 183K | 4 | 496 (262) | 4.4 |
| Final Exam | 88 | 32K | 5 | 510 (279) | 2.9 |
| Strategy Guide | 63 | 32K | 3 | 467 (242) | 1.8 |

Inside every budget (phone: 100 draws, 350K triangles, 5 lights, 450 MB; Mac: 160, 500K, 6, 900 MB). The heaviest:
Risk Blaster's memory on both (371 MB on the phone, 795 on the Mac), the Mac's render targets (223-244 MB: the 4x
multisampled HDR scene at 2940 x 1660 and its passes), the Mac hub's script time (8.5 ms against 2.5 on the phone, and
3-4 ms on the other Mac screens that also draw a floor mirror: the cause to be found in Phase 1), and the Final
Exam's draws on the phone.

**Phase 1 census** (2026-11-23; `hitches.js`, `texmem.js`, `cycles.js`, `cost-report.js --textures --stub --cpu`):
- *Memory round after round* (`cycles.js`, every screen three times): after the first round the chip holds 67-68
  textures, 46-47 geometries and 274-275 programs at the end of every round, and the page 217 elements: nothing piles
  up (the first round ends higher, 150 textures, with what it was still taking in).
- *Where the phone's memory goes* (Risk Blaster, 371 MB): the textures its scenes draw, 185 MB (four 2048 pictures for
  the demon and the fighter, 85 MB; two 2048 canvases, 43 MB); render-target textures about 53 MB (the
  post-processing's, the reflections') and 56 MB of multisampled and depth buffers; textures readied for later in the
  fight (its other skies) 27 MB; textures from before the fight that it does not draw, 32 MB (sky canvases made at the
  start and in the hall). What earlier screens leave behind is small; the bulk is the screen's own hero pictures.
- *The Mac hub's 8.5 ms* was the measurement: one software frame of several seconds, measured while the hall still
  took in its files. With the drawing left out and the files in (`--stub --settle 15`), over 175 frames, the hub's own
  update is 1.09 ms a frame on the phone and 1.27 ms on the Mac.
- *The title hall* (1500 frames of its glide): 3 shaders made while it glides (each boss kind as it arrives, drawn
  once off-screen by `warmNew`), its bosses' pictures sent one a frame as they arrive (56 in all, 128 MB) by design;
  the other uploads each frame are the skinned bosses' bone tables (1 KB each, about 5 a frame); garbage 4-8 KB a
  frame; no page changes.
- *The hub* (1500 frames): no shader made; the cabinet's attract-mode screen (a 320 x 240 canvas) sent about every
  other frame; garbage 5 KB a frame; no page changes.
- *The games* (900-1500 frames each, played with right and wrong answers): Risk Blaster made one shader mid-fight, the
  crack a bolt leaves across a drone (now readied with the rest: none); Nest Egg Run, Boss Rush, Memory Bank and the
  Final Exam made none and sent no pictures in play beyond the skinned characters' bone tables (the wizard's, 16 KB a
  frame). Garbage once warm: Boss Rush 49 KB a frame, Risk Blaster and Nest Egg Run 61, the exam 10, Memory Bank 4
  (CombatFX's update, the traffic and the drones' first). The page's elements change 0-1.4 times a frame (speech
  bubbles, score floaters, a timer bar).
- *Garbage is not a cause of stutter here:* at 4-61 KB a frame the collector sweeps every few seconds for about a
  millisecond; Chromium boxes fractional numbers Safari stores in place, so Safari makes less.

## Hand-over notes

**Phase 0 (2026-11-23).** The plan, the harness (`tools/harness.js`: run it from the repository's root; about 55
minutes in full, `--quick` about 15), the baseline (`docs/master/baseline/`, from commit `89cfb56`), the ranked audit
(above) with the reviewer's notes (`docs/master/visual-audit.md`) and contact sheets (`docs/master/baseline-sheet-*.jpg`).
Census tools for Phase 1 written and tried once (`hitches.js` on Risk Blaster: one shader made mid-fight, 78 KB of
garbage a frame before the code was warm). The overlap check was made to skip text under a sheet or a bar and a glow's
copy of its own words after the baseline was taken: the baseline's list holds those (a later run lists fewer, never a
false new one). Nothing in the game changed. Spend: none.

**Phase 1 (2026-11-23).** The census found two kinds of stall left and both are fixed (the title hall's arriving bosses'
shaders, now built ahead on the driver's threads where Safari has them; Risk Blaster's crack, now readied); memory holds
steady round after round; garbage and page changes are small; the Mac hub's 8.5 ms was the measurement. The gate run
(`docs/master/phase1/gate-report.md`) has no fault. Two measuring faults found on the way and fixed in the tools: the
stills shifted run to run (now seeded per screen) and the script time was two or three frames (now many, drawing left
out). Spend: none in Phase 1 ($0.30 on the art bible's sheet, Phase 2's first step, taken while the gate ran). The
stray empty folder `/master/census/title-webkit` in this machine's root (a shell slip) is not in the repository.
