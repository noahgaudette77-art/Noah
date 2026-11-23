# INR Arcade: the master overhaul (long-running, phased, resumable)

Started 2026-11-23 at commit `ee413e3` (the overhaul's base: every diff check is against it).

## How to resume (read this first after any pause or context reset)

1. Read **Now** (just below), then the phase it names, then `git log --oneline -15`.
2. `node arcade/tools/harness.js --quick` (from `/home/user/Noah`) shows whether the build is sound: rules IDENTICAL,
   content and scripts untouched, every screen's cost inside its budget.
3. Carry on from **Next steps**. Update this file as work lands (status, decisions, measurements); commit it with the
   work; push after every phase, with a hand-over note at the bottom.

## Now

- **Phase:** 0, baseline and audit.
- **Doing:** the plan (this file), the harness (`tools/harness.js`), the baseline run, the ranked audit.
- **Next steps:** finish the harness; run it to make the baseline (`docs/master/baseline/`); review every screen and
  rank the weak spots below; commit, push, report; then Phase 1.

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
| fal.ai | $18.859 | $11.31 | $0 | $11.31 |
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

## Phases (in order; each passes its gate before the next starts)

### Phase 0: baseline and audit (in progress)
- [ ] the plan and the budget (this file)
- [ ] `tools/harness.js`: the rules' regression (from disk and served), the screen sequence, the content and scripts
      diff against `ee413e3`; stills of every screen on the phone and the Mac compared with the baseline; overlapping
      text; each screen's cost against its budget and against the baseline; a report (markdown and JSON); its exit code
- [ ] the baseline run (`docs/master/baseline/`): every screen on both tiers
- [ ] the ranked audit: the weakest visuals, animations, feel, audio and performance costs, every screen
- **Gate:** baseline report committed, harness working.

### Phase 1: performance foundation
Fixed timestep with interpolated rendering (to decide, with evidence: the rules run on each frame's own step today and
the regression is played at 60 Hz; the look was made rate-independent in the animation pass), object pooling, shader
pre-warming, asset preloading, draw-call reduction (merging, instancing), compression and LODs, baked lighting instead
of real lights, half-resolution post effects, visibility-based updates, Low Power Mode.
- **Gate:** every screen inside its budget on the phone and Mac tiers, with numbers.

### Phase 2: image quality
Art bible (`ART_BIBLE.md`) and its fal.ai reference sheet first; MSAA or SMAA everywhere (no FXAA: the governor's last
step still uses it); PBR materials and HDRIs from Poly Haven and ambientCG (CC0) where generated textures are smudgy;
the pmndrs `postprocessing` library weighed against the current pipeline (merged effect pass, selective bloom, MSAA
kept); texture and UV cleanup; one coherent synthwave look; skies and environments; weak assets brought up (key assets
made with Tripo and Rodin and the better kept; only what is clearly below the bar).
- **Gate:** no blur, no stretched textures, no overlapping text; budgets kept.

### Phase 3: animation and characters
Follow-up of the animation pass (2026-11-23): what it left (feet in wide shots, the other games' characters), rigs and
skinning re-audited, clip sets, state machine, the twelve principles, procedural life, boss personalities.
- **Gate:** no snapping, no T-pose, no sliding; budgets kept; capture sequences for each main character and two bosses.

### Phase 4: game feel
Input at once with a small buffer; hit-stop; capped, reducible shake; recoil; impacts; telegraphs; answer feedback;
finishers; camera damping and look-ahead; trails and speed cues by tier; Risk Blaster, Nest Egg Run, Boss Rush; the
wizard's casts, wand and cape tight to the sound.
- **Gate:** each game reviewed with a capture sequence; budgets kept; the logic diff clean.

### Phase 5: environments and detail
The title hall's cells as a real prison, each arena, the vault, Memory Bank and the rest: instancing, baked glow, sprite
fog, cheap animated details; the Mac denser, the phone lean.
- **Gate:** every screen consistent; budgets kept.

### Phase 6: audio
Loudness matched across screens, no hiss or static, varied effects, tight sync, fitting music, the volume controls;
ElevenLabs within budget.
- **Gate:** the sound test page passes; no clicks or cuts.

### Phase 7: desktop polish for the Mac
Landscape layouts, keys, hover, Retina and display changes, resizing without leaks, Safari and Chrome, long sessions.
- **Gate:** a 30-minute soak on the Mac tier with no slowdown or memory growth.

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

## Tried and reverted

(none yet)

## Measurements (current; the baseline first)

(the baseline run fills this)

## Hand-over notes

(one per phase, newest last)
