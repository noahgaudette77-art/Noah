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
- **Phase:** the Mac's richer tier (the owner's order of 2026-11-25, below), IN PROGRESS. Phases 0, 1, 5, 3, 2, 4, 6,
  7 and the performance re-check are done (the re-check's gate 2026-11-25: `docs/master/recheck/gate-report.md`).
- **Done in the Mac's tier so far:** the budget (2,000 MB a screen on the Mac); the title hall's bosses, the wizard and
  thirteen skies in sharper pictures fetched only at the MAC tier (`<name>-hd`, `Assets.file`, `Assets.skyFile`); more
  sparks, embers and chunks in fights, twice Risk Blaster's far rocks, Boss Rush's stands fuller, the floor reflection at
  0.8 (`GFX.rich`, `GFX.richRandom`: from a randomness of their own).
- **Next steps:** every screen measured on the Mac with all of it; then the gate: the harness, the 30-minute soak with
  other programs loading the machine (`tools/load.js`), WebKit on the Mac, the census on the final build (for the
  re-check too), an independent review; the report; then Phase 8.
- Work in progress is built to `index.phase3.html` (gitignored; `scratchpad/master/tools/sidebuild3.sh`) so a
  measurement reading `index.html` is never disturbed; `index.phase5.html` (gitignored) is the Phase 5 build, kept for
  before/after scans.

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

### Phase 2: image quality (done 2026-11-24: a first pass 2026-11-23/24, its polish after Phase 3)
- **First pass, closed by the new order (2026-11-24):** everything it shipped stays, all live: no FXAA on any tier; the
  art bible; the interface's faults; the title hall's floor, glass, steel, skylights and windows, its end on a Mac, the
  cracked glass; Memory Bank's room and its Mac layout; Boss Rush's arena; the Final Exam's hall and Proctor; Nest Egg
  Run's street; the guide's shelves; the Mac's text collisions and Risk Blaster's band seams; the hub's lasers. Checked
  by the harness (`phase2`, `phase2-final`), an independent review (two live faults it found fixed at once: `ca21db2`;
  its rendering findings: `ff37119`, `1a0d853`, `1cc89d2`), the stall census and WebKit: `docs/master/phase2/`.
- **When it resumes (after Phase 3):** polish only, on what Phases 5 and 3 leave final: light, materials and colour on
  the rebuilt environments and new assets; the results bar and the small icons (from the review); a second independent
  review; its gate as written below.
- **Also when it resumes** (found in Phase 5's review): some fifty shader lines in about twenty files ask GLSL's
  smoothstep for a falling edge (edge0 above edge1: `smoothstep(0.3, 0.0, x)`), which the specification leaves
  undefined; every GPU met so far computes the usual curve (the iPhone and the Mac show them right), so it is a
  safety sweep, not a visible fault: each written `1.0 - smoothstep(edge1, edge0, x)`, one file a commit, the shaders
  compiled on every screen after (the two Phase 5 touched were done in `286910a`; the page's own JavaScript
  `smoothstep` takes either direction by design). Counted 2026-11-24: 48 lines in 16 files with literal edges (more may have computed
  edges): `node arcade/tools/smoothstep-sweep.js` lists them.
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

### Phase 3: animation and characters (done 2026-11-24)
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
- **Progress (2026-11-24):**
  - [x] The before strips on the Phase 5 build (`scratchpad/phase3/before/`: the golem and the Proctor in Boss Rush, the
        exam's Proctor, Risk Blaster, Nest Egg Run, the crowd, the title) and `motion-hz --pops`.
  - [x] A snap scan for every game (`tools/scenarios/pops.js`): each game played with right and wrong answers, every
        frame on the capture clock (not drawn), the world place of every joint of every character (skinned bones, the
        demon's and the exam Proctor's joints, the fighter, the car's rig and wheels); a snap is a move over 2% of the
        character's size in one frame and at least 4 times the frames round it, both in the world and as the lens sees it
        (a character carried by the lens, or a lens that shakes, is not one); and how far a planted foot slides.
  - [x] Fixed (each found by the scan, each a commit): the wizard's cast took the idle's share of its stance in two
        frames (`31ab448`: the clips over a stance take their weight from all of it) and its arm's 70 cm came in four
        (`ef097a1`: 0.15 s); a boss's strike after an early wrong answer forced its clip from 0.12 to 0.70 of the pose in
        one frame (`d4e5316`: a ramp across the blow); the Proctor's hanging arm (`19850a2`, above). Boss Rush with the
        golem: the wizard's snaps 8 → 0, the boss's 2 → 1 (a 2% one in its rage); with the Proctor: 8 → 1 and 6 → 0;
        `motion-hz --pops`: the wizard's hand's worst move 13.9 cm at 27.9 times its neighbours → 7.6 cm at 1.3.
  - Kept, as meant (the scan flags them; for Phase 4 to weigh as feel): Risk Blaster's demon knocked back 2.4 units in
        the hit's frame and held by the hit-stop; the fighter's recoil; Nest Egg Run's surge at a right gate (its curve,
        `sin(pi * sqrt(x))`, starts at full speed: 39% of the lunge in its first frame, then the hit-stop); the title's
        caged bosses' twitch (a jolt shaken at 30 Hz, the frame rate's limit: it may read as a strobe more than a
        shudder); the exam's Proctor's armour popping off at a pass. The title's far bosses on a Mac move ten times a
        second (an animation saving): the scan finds no snap in them on either tier.
  - [x] The bosses' planted feet (`7a4a420`, and the review's fixes `089df5f`, `094cc05`): a foot lock, two-bone leg IK
        on the clips' bookkeeping. Planted-foot slide, % of the height a second: the golem 12.4/13.4 → 3.4/3.2, the
        Proctor 7.4/11.7 → 2.1/1.8, the Perilmonger 14.1/13.9 → 4.2/3.4 (the wizard's feet are carried with the lens it is
        placed against: not a slide on screen).
  - [x] The gate (passed: `docs/master/phase3/gate-report.md`): the harness `phase3` on `ea8e7ca` without fault (rules
        IDENTICAL, 13/13, no overlaps, every budget kept); an independent review (seven findings, each fixed: the foot
        lock's re-plant, knee side, standing height and costs; the scan's coverage of a boss's knees and elbows, its floor,
        its lens); two more faults the better scan found (the release's first frame, a knee swinging round in a rage),
        fixed; the final build `f10b3c2` (rules IDENTICAL, 13/13; live). What the scan still flags: the impacts the game
        means (into its hit-stops) and a few at its threshold.

### Phase 4: game feel (done 2026-11-25)
Input at once with a small buffer; hit-stop; capped, reducible shake; recoil; impacts; telegraphs; answer feedback;
finishers; camera damping and look-ahead; trails and speed cues by tier; Risk Blaster, Nest Egg Run, Boss Rush; the
wizard's casts, wand and cape tight to the sound.
- Carried here from Phase 2: Risk Blaster on a Mac, while an explanation is up, lifts the picture so the fighter shows
  over the sheet and the demon's head goes under the question panel (the audit's #15, its camera half): on a wide
  window the lens could stand back a little instead of the whole picture riding up.
- Carried from Phase 3's snap scan (impacts it flags that are meant; weigh them as feel): the demon's knockback in the
  hit's frame, the fighter's recoil, Nest Egg Run's surge (39% of its lunge in its first frame), the title's caged
  bosses' 30 Hz twitch (a shudder of 10-15 Hz may read better than a strobe).
- **Gate:** each game reviewed with a capture sequence; budgets kept; the logic diff clean.

### Phase 5: environments and new assets (NOW, from 2026-11-24, by the owner's new order)
The title hall's cells as a real prison, each arena, the vault, Memory Bank and the rest: instancing, baked glow, sprite
fog, cheap animated details; the Mac denser, the phone lean. With the owner's new order it also carries the new assets
(key assets made with Tripo and Rodin, the better kept, only what is clearly below the bar; pre-rendered skies where
they save the GPU). **First its rebuild list**: every environment and asset judged keep, improve in place, or rebuild;
nothing on the rebuild list is polished before it is rebuilt.

**The rebuild list (2026-11-24)**, from the stills of `phase2-final` (every screen on both devices, after Phase 2's
first pass), the audit's 25 items (`docs/master/visual-audit.md`) and the review of Phase 2. Most environments were
rebuilt by Phase 2's first pass already (the owner's order came after it), so most are a keep; what stays below the
bar is one character told three ways, and details.

| What | Verdict | Why (the evidence) | Phase 5's work |
|---|---|---|---|
| **The Proctor** (the final boss: Boss Rush's last fight `boss-all`, the title's cell 12 `boss-all-t`, the hub's Boss Rush topper `mini-proctor`, the exam hall's statue `statue-all`, its portrait in `bosses.webp`; the Final Exam's own boss `assets/boss`) | **rebuild** | the audit's #11: three designs of one named character (a black-chrome figure with a red visor and a pencil in Boss Rush and its cell, a silver-white horned figure in the portrait and the statue, a violet mech in the exam). The exam's is the model the owner supplied (2026-11-12, 32 parts): it becomes the one design | the owner's mech, with the exam's mortarboard, everywhere: rigged for Boss Rush's fight with its twelve clips (`idle`, `idle2`, `enter`, `attackA`, `attackB`, `rage`, `hurt`, `hurtS`, `hurtG`, `stagger`, `win`, `death`), first by retargeting the clips it has in code (free), Tripo's rig and retarget if that falls short (about 145 credits); the cell's, the topper's and the statue's copies and the portrait drawn from it; the old files kept in git, so it can be put back |
| Risk Blaster's rocks | **rebuild** (the far ones) | the audit's #25: the far rocks are built-in low-poly lumps on the hull's material, flat grey against the painted nebula; the near ones are the two generated rocks, lit dark | the far rocks from the generated rocks (a light copy of each, instanced), every rock lit by its region's key and rim like the ship; no spend |
| Risk Blaster's answer drones | improve in place | the C drone's box side-pods (#25); the rest a keep (colour-keyed hexes) | pods shaped like the other drones' parts |
| Risk Blaster's sky (Mac) | improve in place | on a Mac's wide window the right half of the first region is bare black with stars; the ringed planet sits behind the B drone (#25) | the nebula and the planet placed for the Mac's wider view too (the phone's framing kept) |
| The title hall | keep; improve in place | Phase 2 rebuilt its floor, glass, steel, skylights and windows; on a Mac the cells' close-ups show bare dark walls round the cell, and the end's left edge is a dark arch panorama (review) | the prison denser on the Mac: cell-block numbers, conduits, rails, vents, warning lamps, cheap animated details (steam, a patrolling light), instanced; the phone lean as it is |
| The hub | keep (the audit's reference scene); improve in place | the cabinets' lower bodies are black voids under lit tops (#22); one club laser reads as a hairline from ceiling to floor (review) | kick plates, coin doors and side art lit on the cabinets; a soft halo on the lasers |
| Boss Rush's arena | keep (Phase 2 rebuilt it); improve in place | the crowd is lit cards that never move; the deck's reflection keeps the calm neon when the boss rages (review) | the crowd's cards sway and cheer (one instanced draw, a vertex shader); the reflection tinted with the rage |
| Memory Bank | keep (Phase 2); improve in place | the gold bars at the vault door are blocky (#13) | bevelled bars, the coins' trays |
| Nest Egg Run's street | keep (Phase 2: facades, shoulders, far end) | | nothing |
| The Final Exam's hall | keep (Phase 2: marble, columns, the Proctor lit) | | nothing (the Proctor above) |
| The Strategy Guide's archive | keep (Phase 2: its shelves) | | nothing |
| The menus (select, results, stats, setup) | keep | interface, not environment: the results bar and the small icons are Phase 7's | nothing |
| The skies | keep | every world's sky is already a pre-rendered panorama (Blockade, `assets/sky/`); Risk Blaster's nebula is drawn once into a texture | nothing |
| The wizard | keep the model (Phase 3 animates it; Phase 2 later its cloth) | made 2026-11-23 at Tripo's detailed settings, 32K triangles, eight clips; its "plastic toy" look (#17) is the matte cloth and no normal map, chosen for the phone's cost | nothing here |
| The other characters and props (the eleven bosses, the demon, the ship, the car, the rivals, traffic, the vault door, the cabinets, the statues of bosses 1-11) | keep | the audit keeps them; Phase 3 looks at their motion | nothing |

Budget for Phase 5: Tripo at most 145 credits (the Proctor's rig and clips, only if the free retarget falls short);
fal.ai and Blockade nothing planned; within the caps either way.

**Progress (2026-11-24):**
- [x] The Proctor as one design (`bdb43c7`): the free retarget did not fall short (contact sheets of all twelve clips,
      strips in the arena), so no provider was called and the owner's model was not sent anywhere. Boss Rush's last
      fight, the title's twelfth cell, the hub's topper, the exam hall's statue and the portrait: all the owner's
      machine, in the exam's own skin, cap, reactor and eyes (`src/js/24f-proctor.js`). The rules IDENTICAL; the
      exam's own four skin programs byte-identical before and after (`tools/scenarios/shader-dump.js`). The old files
      (`boss-all`, `boss-all-t`, `mini-proctor`, `statue-all`) deleted when the page was built again (in git at `e388e21`).
- [x] Risk Blaster (`aafdd1f`, `bb15556`, `eb0147c`): the far rocks light copies of the generated ones; the C drone's
      nacelles; a wide window's own sky centres for the nebula and the orbit (the Mac's nebula now fills the band side
      to side; the belt kept its own: centred, its sun hid behind the demon). Before and after: `docs/master/phase5/`.
- [x] Built and live (`345c580`): the rules IDENTICAL; the screen sequence ALL 13 STEPS OK (a first run was cut short
      by this machine's memory limit, a browser killed while four agents captured: run again, clean); the served site
      checked (the page, the rig, the far rocks and the portrait served; the old Proctor's files gone). NB the served
      site's root is the arcade folder: https://noah-2ci.pages.dev/ is the game, its files under /assets/.
- [x] In place, four at once (agents in worktrees, each merged after its own check; built and live at `42bbcd9`, the
      rules IDENTICAL and the sequence 13/13 on the quiet machine): the title hall on a Mac dressed as a prison block
      (conduits, rails, block plates, junction boxes, vents with steam, security doors, warning signs that turn red with
      a cell's alarm, three patrolling searchlights, red beacons: one draw added, the phone unchanged) and its end on a
      wide window (the left edge, the tip's plate, the dock's shade); the hub's cabinet bases lit (front sheet, kick
      plate, lit coin door, side art) and its lasers one mesh with a halo (phone draws 41 -> 35, Mac 97 -> 85); Boss
      Rush's crowd swaying, cheering a blow and flinching at a strike (one instanced draw, as before) and its deck
      giving back the rage (one mix a pixel); Memory Bank's gold cast as stamped bullion in pyramids, the coins on
      velvet trays (+2 draws). Notes and before/after in `docs/master/phase5/{title,hub,arena,memory}/`.
- [x] The gate (passed 2026-11-24, `docs/master/phase5/gate-report.md`): the harness `phase5` on `42bbcd9` (no fault);
      an independent review, its eight findings fixed a commit each and built (`6b73e45`, live); the rules IDENTICAL from
      disk and served, the sequence 13/13; the stall census of every game on `6b73e45` (no shader made in play anywhere;
      uploads, garbage and page changes as in Phase 1 or less but the title's garbage, 10 KB a frame); every screen in
      WebKit (no overlaps, the same pictures as Chromium's); the two noisy timings measured again on the quiet machine
      (Boss Rush's phone 0.73 ms; the exam's 0.87, of which its own work is 0.05: files still read when it was measured).
- Found after the gate by Phase 3's snap scan, and fixed in Phase 3 (`19850a2`): the Proctor's hanging arm (its hand
  torn, and both in its last stand) swung up instead of down, its bones running along their own axes (Phase 5 put the
  owner's machine on its own joints); the eleven other bosses unchanged.
- Learned (two agents found it): three.js r128 draws four Math.random numbers for the id of every object, geometry,
  material and texture it makes; adding objects while a scene is built shifts the seeded stream a capture uses (its
  questions and its deal change between builds; the rules are untouched, the regression IDENTICAL). New builders that
  make many objects run on a stream of their own (`dressOwnRandom`, Memory Bank's); a capture's question can differ
  between two builds for this reason alone.
- For the performance re-check: Memory Bank's generated coins are 2,500 triangles each (20 at the start, about 130K
  triangles at the end of a deck: inside the budget; a light copy, as the far rocks', would remove most of it).

- Carried from Phase 2's gate review: the room captures are taken once (and again at a boss's power-up), so Boss Rush's
  rage (its neon turning red) and its moving searchlights and lightning are not in the deck's reflection: tint the
  reflection with the rage, or capture again at its thresholds; the hub's club lasers could take a soft halo (one
  reads as a bright line from the ceiling to the floor).
- Carried here from Phase 2's audit list: Risk Blaster's asteroids (the near ones are the generated rocks, lit dark; the
  far ones built-in low-poly lumps on the hull material: flat grey against the painted nebula; #25), the C drone's box
  side-pods and the ringed planet behind the B drone (#25); the hub's cabinets' black lower bodies (they read as a void
  under the lit tops; the hub is otherwise a keep); the title's end: the left edge's dark arch panorama and the fact
  card's empty lower third (#10's notes).
- **Gate:** every screen consistent; budgets kept; before/after stills of every change at the same moments; the
  Proctor's strips in Boss Rush (`tools/scenarios/motion.js`) and the exam (`exam-motion.js`); the logic diff clean.

### Phase 6: audio (done 2026-11-25)
Loudness matched across screens, no hiss or static, varied effects, tight sync, fitting music, the volume controls;
ElevenLabs within budget.
- **Gate:** the sound test page passes; no clicks or cuts.
- Done (`docs/master/phase6/`): the audit found the mix, the levels, the hiss and the variety right and the faults at
  the sounds' edges; fixed a commit each, in how the page plays the recordings (no file re-encoded, nothing spent):
  the loops' joins made when a sprite is decoded (`Sound.LOOP_JOIN`; the alarm keeps its length for the red frame's
  pulse), the music played pass after pass (`Sound._pass`), every take's envelope (`Sound._release`), the windows of
  fourteen announcer lines and Starfall's takes (`audio.json`; the builder makes the same cuts: `STARTS`), the music's
  exact loop points, the sound faded out behind a hidden page, resumed from Safari's "interrupted".
- For the devices (Phase 8): the iPhone's return from another app or a call; the engines, flames, hum and alarm steady;
  the title's music coming round; the three takes that end on their height (the README's list), by ear.

### Phase 7: desktop polish for the Mac (done 2026-11-25)
Landscape layouts, keys, hover, Retina and display changes, resizing without leaks, Safari and Chrome, long sessions.
The audit, the changes and the gate: `docs/master/phase7/` (`audit.md`, `README.md`, `gate-report.md`).
- Done: the menus spread over a wide window (results, stats, Setup, stage select, the guide); icons at 20 px (Nest Egg
  Run's lives from 400 px wide); a button the keyboard moved to takes Enter and Space, on what is on top and in play;
  the arrows over a screen's cards and switches (Safari's Tab skips buttons); P pauses the exam; the exam's grid opens
  on its question; every button answers a hover. Tools: `scenarios/keys.js`, `scenarios/resize.js`,
  `scenarios/soak.js`, `LAYOUT=1` in `scenarios/polish.js`.
- The carried items: the results bar (the Mac: the two columns put the run in view; the phone: its list ends in the
  designed fade above the bar, kept); the icons (done); the car's glare in WebKit (gone: Phase 5's car is gold in both
  engines, at both sizes); the 384 px portrait strip for 3x phones (left for Phase 8's look on the device: only the
  briefing's 84 px face is drawn up 1.3 times; the busts' render settings are not recorded).
- To check on a real Safari (seen once in this machine's WebKit, not again in three runs, never in Chromium): a short
  white streak across Risk Blaster's demon. This machine's WebKit draws no `backdrop-filter` (a real Safari does).
- **Gate:** a 30-minute soak on the Mac tier with no slowdown or memory growth. **Met** (`gate-report.md`): the soak
  found four things held after a visit and the title hall's old scene held by a shader hook, all let go; then from
  round 2 to round 3 the graphics chip the same (textures +0, geometries +0), the page's elements and timers the same,
  a frame's cost the same; six rounds (48.6 minutes of play) held the heap within 28 to 30 MB with no trend.

### The performance re-check (after Phase 7, before Phase 8: the owner's new order; done 2026-11-25)
Every screen measured again on both tiers against Phase 1's budgets and the baseline, the census (stalls, garbage, page
changes), memory over cycles, the governor in both engines; whatever a later phase cost put right before Phase 8.
- **From Phase 7's soak: what a closed screen's parked materials still hold.** `GFX.park` keeps a closing scene's
  materials for their shaders; a material's `onBeforeCompile` hook made inside a function holds that function's whole
  scope, and with it whatever the scope holds. The reactor's hook held the title hall's old scene (25 MB: fixed,
  `24c-examboss.js`, Phase 7). Left, one old scene per kind until it comes round again (bounded, about 9 MB in all:
  `tools/heapparked.js` on a snapshot of `soak.js` with `SNAP=1`): Boss Rush's crowd hook (`makeCrowd`: holds
  the scene `s`, 3.1 MB) and a hook in a BossGame method that holds `this` (2.8 MB); Risk Blaster's hook over `made`
  (2.2 MB); Memory Bank's spun gold (`surfaceDetail`'s `prev`, the hook made in `build3D`, 1.1 MB). Each hook a function
  of its own (or taking only what it needs), as `bossHousingCool`. And for the phone's memory: the raw files kept after
  decoding (`Assets.bufs`, 64 MB on the Mac) and the decoded sound (`Sound.sprites`, 93 MB): whether the raw copies are
  needed once decoded.
- **First (from Phase 6's gate): Risk Blaster's phone draws stand at the budget's edge.** The harness measured 101
  against 100 (`docs/master/runs/phase6-costs`); measured again as it measures (8 s of play), 100, 97 and 97 on Phase 6's
  build and 100, 79 and 100 on Phase 4's (the same drawing code): the traffic in view at the moment measured. Bring the
  far traffic's draws down on a phone (its ships instanced, or fewer far ones at once), then measure at several moments.
- Nest Egg Run's phone draws vary with the seeded traffic between runs (85, 90, 91 in the last three: the cars and the
  props in view at the measured moment): inside the 100, but the closest screen to it; measure it at several moments.
- From Phase 5's gate: the Proctor in the title's cell and on the hub's topper is 9 draws and 7 programs (its cap's and
  its reactor's materials could share one: about 4 draws); Memory Bank's generated coins (2,500 triangles each, about
  130K at a deck's end: a light copy, as Risk Blaster's far rocks', would remove most of it); the title's garbage, 10 KB
  a frame (its update 5.8 KB; the cells' lamps make a list a frame); the census's play of Memory Bank turns no card (as
  in Phase 1's): to be made to turn and grade them, so the deck's own moments are counted.

### The Mac's richer tier (the owner, 2026-11-25: after the re-check, before Phase 8; NOW)
The owner's order, as given: "Raise the Mac tier's graphics memory budget from 900 MB to about 2 GB (up to 3 GB only if
every test stays clean). The MacBook has 16 GB of unified memory, but it is shared with Safari, other apps and the OS, so
keep headroom. Spend the extra on higher-resolution key textures, denser props and richer effects on the Mac tier only.
Keep the phone tier at its current budget. Keep a steady 60 FPS, re-run the 30-minute soak test with other apps open, and
confirm no memory growth or slowdown. Study logic and content stay untouched."
- The budget: the Mac's graphics memory 2,000 MB a screen (`tools/harness.js`), its draws and triangles as they were
  (160, 500K: smoothness first); the phone's all as they were.
- What spends it: where the Mac's picture is held back by memory today, ranked by what it shows per MB and what it costs
  a frame (`docs/master/mactier/`). Only at the MAC tier (a computer the governor or Setup holds lower keeps today's).
- **Gate:** the harness inside the new budgets; the 30-minute soak with other programs loading the machine (here they
  are stand-ins: memory and processor hogs and a second browser; on the MacBook, the owner's own apps), no memory growth
  and no slowdown; WebKit's stills and costs on the Mac; an independent review.

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

- **Sound: fixed in how the page plays the recordings, not in the files (Phase 6, 2026-11-25).** The loops' joins are
  made in the decoded recording, the music's seams by passes that overlap 30 ms, the takes' ends by an envelope: every
  file stays as it was. Rebuilding the sprites with the joins made in them was weighed: the core set cannot be rebuilt
  on this machine (the title's soft coin's raw takes are not here) and every re-encode loses a generation; and the
  sound test page shares the page's rules (its own copy of them, checked by `tools/sound-test-check.js`). The windows
  moved in `audio.json` (the announcer, Starfall) are cut the same way by the builder.

- **Keys on a Mac: a button the keyboard moved to takes Enter and Space; the arrows move over a screen's cards (Phase
  7, 2026-11-25).** A screen's own Enter (PLAY in the hall, PLAY AGAIN, the exam's next question, turning a card) ran
  even with the focus on another button (`tools/scenarios/keys.js`: Tab to STATS and Enter played the cabinet). The
  browser now clicks a button the focus was moved to by Tab or an arrow (`UI.init`: `keyFocus`); with the focus where a
  click or the game put it (the explanation's NEXT, PLAY AGAIN on results), the screen's keys are as they were, so a
  player who answers with the mouse and goes on with Enter loses nothing. Safari's Tab skips buttons unless its settings
  say otherwise, so the arrows are how a keyboard reaches a stage on a Mac (`UI.arrowNav`: the nearest card in the
  arrow's direction, the first arrow to what the screen lights). Where the arrows already mean something in a game
  (lanes, grades, questions) they keep it; on results Up and Down still scroll.

## Tried and reverted

- **The arrows aimed by geometry alone (Phase 7, 2026-11-25; replaced the same hour).** First by distance with what lay
  aside weighed three times (it skipped the sound test's single button going down Setup), then by the nearest row
  first (it jumped between Setup's two columns, whose rows stand at different heights). Now Left and Right go in reading
  order, Up and Down to the nearest row (Setup: row by row in reading order).
- **The sound suspended behind a hidden page (Phase 6, 2026-11-25; replaced the same day).** It stopped the drone, but
  the timers behind the page went on playing at its frozen clock (the hall's blips, typed letters: all at once when it
  came back) and a hide and a show close together raced the suspend and the resume. The master is faded instead.
- **The alarm's join by a 10 ms crossfade (Phase 6; replaced the same day).** Its loop came out 2.24 s and its beat
  drifted from the red frame's 1.125 s pulse. Its seam is faded out and in over 4 ms instead, its length kept.

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

**The performance re-check** (2026-11-25; `docs/master/recheck/README.md`): the draws and triangles counted at many
moments of play (`tools/scenarios/draws.js`), not one, on the page with the re-check's changes. Least / median / most:

| | draws | triangles |
|---|---|---|
| phone, Risk Blaster | 46 / 95 / 118 | 166K / 247K / 294K (with the phone's lighter ships and rocks; 438K at most before) |
| phone, Nest Egg Run | 59 / 92 / 105 | 103K / 180K / 216K |
| phone, Boss Rush | 45 / 70 / 79 | 64K / 112K / 140K |
| phone, Memory Bank | 55 / 57 / 57 | 106K / 146K / 195K |
| phone, the exam | 50 / 72 / 75 | 57K / 57K / 154K |
| Mac, Nest Egg Run | 102 / 148 / 169 | 204K / 374K / 502K |
| Mac, Risk Blaster | 63 / 111 / 131 | 180K / 354K / 476K |
| Mac, Boss Rush | 54 / 124 / 133 | 61K / 181K / 244K |
| Mac, the exam | 70 / 92 / 94 | 57K / 57K / 154K |

What a phone keeps outside the graphics chip by the end of a round of every screen (`tools/scenarios/kept.js`): 17 skies
decoded (124 MB, kept so a game opens at once), 7 sprites of sounds decoded (97 MB), the playing track (27 MB), the
models' and music's raw files (40.5 MB; 57.1 before the re-check let the others go).

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

**Phase 2, first pass (2026-11-23/24).** Closed by the owner's new order (0, 1, 5, 3, 2, ...): everything it shipped
stays and is live (`docs/master/phase2/`); its gate's census and WebKit check were completed on Phase 5's build, which
carries all of it (clean). Its polishing resumes after Phase 3, on what Phases 5 and 3 leave final, with the smoothstep
safety sweep found in Phase 5's review. Spend: $0.36 on fal.ai (the art bible's sheet, two skylights).

**Phase 5 (2026-11-24).** The rebuild list first (most environments a keep: Phase 2 had rebuilt them), then the work:
the Proctor as one design everywhere (the owner's machine, its clips carried onto its joints in code: no provider called,
the model sent nowhere), Risk Blaster's far rocks, drones and Mac sky, the title hall dressed as a prison block on a Mac,
the hub's cabinets and lasers, Boss Rush's crowd and deck, Memory Bank's bullion. The gate passed
(`docs/master/phase5/gate-report.md`): the harness without fault, an independent review's eight findings fixed, the
census and WebKit clean, every budget kept, the rules IDENTICAL. One fault it missed was found after it by Phase 3's
snap scan and fixed there: the Proctor's hanging arm. Spend: none (Tripo 0 credits, fal.ai $0). Live at `6b73e45`.
Tools added: none for the game; the gate's runs are in `docs/master/runs/phase5*` (not in the repository).

**Phase 3 (2026-11-24).** Strips of every main character before any change (`scratchpad/phase3/before/`, the same
moments in any build), then a scan written to see what strips cannot, what happens between two frames
(`tools/scenarios/pops.js`: every joint of every character, every frame, each game played; snaps, and planted feet
sliding). It found the wizard's cast snapping in two ways, a boss's strike snapping after an early wrong answer, the
Proctor's hanging arm swinging up (a Phase 5 slip: its bones run along their own axes), and every boss's planted feet
sliding: all fixed, a commit each, with a foot lock (two-bone leg IK) for the feet. An independent review found seven
faults in the foot lock and the scan, all fixed; the scan, improved, found two more in the foot lock, fixed. What the
scan still flags are the impacts the game means (each into its hit-stop) and a few at its threshold: Phase 4 weighs the
impacts as feel. Live at `f10b3c2`. Spend: none. Tools added: `pops.js`. Side files: `index.phase3.html` (work in
progress), `index.phase5.html` (the Phase 5 build, for before/after scans), both gitignored.

**Phase 2, resumed (2026-11-24).** The smoothstep safety sweep first (pixel-neutral), then an art review of every
screen's stills on both devices (14 findings) and its findings fixed: the smaller ones directly, a commit each; the title
hall, Boss Rush's arena and Risk Blaster each as a package in its own worktree (three agents in parallel), read and
cherry-picked here (their built pages left out: the page is built once from everything merged). The gate
(`docs/master/phase2/polish/gate-report.md`): the harness without fault (`docs/master/runs/phase2-polish`), every budget
kept (Boss Rush's crowd picture +1.3 MB; no draw, light or texture added elsewhere), the rules IDENTICAL; an independent
review of the code and the stills: nothing broke a screen; its eight code findings fixed or recorded (the cells'
brushing that rippled, their grime on short faces, a key light that would flare with a rattle, two equal smoothstep
edges, a fragile face grouping, an array a frame). Measuring notes: the racer's, the exam's and Boss Rush's stills vary
between capture runs when the machine is loaded (compare pictures; the phone's and the title's repeat to the pixel when
it is idle); the title's end on a Mac can be caught mid-fade (its logo fades on the page's real clock). Left for the
owner (art calls): Risk Blaster's deep space to the upper right on a Mac; Nest Egg Run's gold shops reading tan; the
title cells' glass tinted by its world's pair (a design change). Carried to Phase 7: icons of 20 px or more, a
384 px portrait strip, the results bar. Spend: none. Tools added: `hues.py`, `scenarios/arena-look.js`,
`scenarios/title-look.js`. Side file: `index.phase2b.html` (the page before this pass, `cd141b1`; gitignored).

**Phase 4 (2026-11-25).** The audit first (`docs/master/phase4/audit.md`): every game answers a tap in the frame it
lands and loses none to a transition; the faults were in how things move. Fixed, a commit each: the camera's shake
(white noise a frame, a buzz twice as fast at 120 Hz, drawn from the game's random stream) a smooth value noise in
time; Risk Blaster's explanation on a Mac standing the lens back instead of lifting the demon under the question panel;
the title's twitch from 21-28 Hz to 10-12 Hz; Nest Egg Run's surge without its first-frame pop; the egg's easing by
time. An independent review found seven more (a resize mid-explanation, the red aura's edge inside the screen, a dead
lean, the shake's noise at its zero crossings and lattice points, a zoom blur, an easing by frame, a shadowed name):
all fixed. The gate (`docs/master/phase4/gate-report.md`): no fault, every budget kept, the rules IDENTICAL. A machine
restart lost one harness run's costs: measured again on the final build. Spend: none. Tools: `scratchpad/phase4/
shake-trace.js` (the camera's place a frame through a shake; scratch). Live at `479fb52`.

**Phase 6 (2026-11-25).** The audit first (`docs/master/phase6/audit.md`), measured from the files as the page plays
them: the mix, the levels, the hiss and the variety were right; the faults were at the sounds' edges. Fixed, a commit
each, all in how the page plays the recordings (no file re-encoded): the looping effects' joins (made in the decoded
recording; the alarm keeps its length for the red frame's pulse), the music's seams (exact loop points, then pass after
pass with a 30 ms overlap), every take's envelope (in over 2 ms; let go where the generator cut it off, never before its
loudest moment), fourteen announcer lines started at their words and Starfall's takes at their crash (`audio.json`; the
builder makes the same cuts), Starfall played with its column of light, the sound back after an iPhone's interruption,
a hidden page faded out, Setup's effects OFF quieting the hall. New tools: `tools/audio-check.js` (every loop, take and
track through the page's own sound code in an offline context at 48 kHz: 34 failures on the build before, none after)
and `tools/sound-test-check.js` (the sound test page, button by button; it caught this phase breaking the page's music
for an hour). An independent review found eight more (timers' sounds bunched behind a suspended page, a suspend and
resume race, the alarm's drift, releases eating four takes' peaks, the hand edits a rebuild would undo, the check's
gaps, a Firefox copy): all fixed or answered (`docs/master/phase6/gate-report.md`). Spend: none. For the devices: the
README's list (the iPhone's return from another app, the loops, the title's music coming round, three takes by ear).

**Phase 7 (2026-11-25).** The audit first (`docs/master/phase7/audit.md`): the layouts held at seven window sizes and
resizing or moving between displays leaked nothing; the faults were in how the menus used a wide window, the icons
under 20 px, the keyboard (Enter on a button reached with Tab did the screen's Enter; on a Mac a keyboard could not reach
a stage) and four kinds of button with no hover. Fixed, a commit each: the menus in columns on a wide window, icons at
20 px, a focused button's Enter and Space, the arrows over a screen's cards and switches, the exam's grid opening on its
question, P pausing the exam, a hover on every button. An independent review found five more (Enter under a client's
briefing clicked the stage behind it, Nest Egg Run's top row at 375-393 px, the arrows holding the page past the last
button, a key held through a browser's shortcut, the exam's grid scrolled on a phone): all fixed. The gate's soak found
what a visit left behind (Risk Blaster's drones' glass and the brood's shapes, Boss Rush's sparks' texture, every skinned
model's bones) and the title hall's old scene held by the reactor's shader hook (25 MB a visit): all let go; then no
growth and no slowdown (`docs/master/phase7/gate-report.md`). The harness: no fault (`docs/master/runs/phase7-final`), every budget kept (the phone's most: 88 draws, 244K
triangles, 371 MB; the Mac's: 142, 318K, 795). Spend: none. Tools: `scenarios/keys.js`,
`scenarios/resize.js`, `scenarios/soak.js`, `scenarios/leaks.js`, `heapdiff.js`, `heapwho.js`, `heapowners.js`,
`heapparked.js`, `LAYOUT=1` in `scenarios/polish.js`, `window.__timers` in `capture.js`. The page live since `687ef68`.
For the devices: the README's list (Safari with the keyboard alone, Tab and Enter in Chrome, the hover, a wide window,
two displays, the streak to look for on Risk Blaster's demon, half an hour with the FPS counter, the iPhone's icons).
Left for the re-check: what the parked materials still hold (about 9 MB), the raw files kept after decoding.

**The performance re-check (2026-11-25).** The items the phases had left first: what a closed screen's parked materials
held (9.4 MB of arrays, every shader hook made inside a function with a scene in its scope: each now a function of its
own; 0.01 MB after), the raw files kept after decoding (17 MB on a phone let go; the skies kept decoded, so a game opens
at once), the Proctor's reactor in one draw (five fewer), Risk Blaster's phone triangles (lighter copies of its ships and
near rocks for a phone: its busiest frame 438K to 294K). Then the one-moment measure checked against many
(`tools/scenarios/draws.js`): the medians inside the budgets; Risk Blaster's phone draws at its busiest 118-119 and Nest
Egg Run's Mac draws 169 recorded to watch on the devices (each fix a character's rig). The governor passes in both
engines; memory level over cycles; the harness without fault (`recheck-final`); an independent review found no
regression, its notes answered (`deef476`). The census left for the final build. Spend: none. Live at `e041f16`. Tools:
`scenarios/draws.js`, `scenarios/kept.js`, `tools/gen/phone-lod.mjs`, `shader-dump.js STAGE=`.
