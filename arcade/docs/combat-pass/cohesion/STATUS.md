# Phase 5, the cohesion pass: running status

Worktree branch `worktree-agent-adc026bf8de11a541`, made from `claude/quirky-ride-9frte0` at ecb38c3.
Brief: A traffic, ships and rocks into their games; B one look; C one sound; D load and size; E the calm path; F two
leftovers if time allows. Commit after each step.

## Done

- **A** (commit 0a51826): Nest Egg Run's sedans, trucks and buses are `prop-car`, `prop-van`, `prop-bus` (instanced,
  one geometry and material per model, lacquer per copy, neon strips per copy, working lamps as trims). Risk Blaster's
  freighters (`prop-ship-a`), cruisers and fighters (`prop-ship-b`), drones and shuttles (`prop-ship-c`) and the near
  rocks (`prop-rock`, `prop-rock2`). Tankers, hulks, the whale and the far rocks stay built-in. Shared edit:
  `modelGeometry()` added to `08d-panosky.js`. Regressions blaster and racer IDENTICAL both ways; sequence 13/13.
- **B**: reference Risk Blaster (and the title). Measured every screen's 3D picture (`tools/look-stats.py`): black level
  equal everywhere (0.001 to 0.006); the hall was the darkest screen with the least glow (median 0.035, bloom 0.33,
  threshold 1.38); the exam the least saturated grade (1.06) under the heaviest vignette (1.45); Memory Bank the
  hottest exposure (1.2); the Guide the lightest vignette (0.6). Each brought in where its screen sets its grade:
  hall exposure 1.22, bloom 0.55, threshold 1.16, saturation 1.18, vignette 0.95; Memory Bank exposure 1.12, split 0.2;
  exam exposure 0.97, saturation 1.14, vignette 1.25 (+ its dread), split 0.2; Guide vignette 0.9, saturation 1.2. No
  shared-file edit. Regressions memory and exam IDENTICAL; sequence 13/13.

## Next

- C: sound levels by measurement (`tools/audio-levels.py`).
- D: sizes; the hall's toppers and icon props at 512 px maps; GPU memory when leaving the hall for a game.
- E: the calm path, one still per game and the hall.

## Measurements

### B, the look of each screen's 3D picture (luminance 0..1; sat: mean saturation of the lit pixels)

| screen | black before | after | median before | after | 98th pct before | after | sat before | after |
|---|---|---|---|---|---|---|---|---|
| Risk Blaster | 0.003 | 0.003 | 0.087 | 0.087 | 0.847 | 0.847 | 0.730 | 0.730 |
| Nest Egg Run | 0.004 | 0.004 | 0.091 | 0.091 | 0.898 | 0.898 | 0.559 | 0.559 |
| Boss Rush | 0.001 | 0.001 | 0.065 | 0.065 | 0.838 | 0.838 | 0.719 | 0.719 |
| title | 0.006 | 0.006 | 0.174 | 0.174 | 0.815 | 0.815 | 0.588 | 0.588 |
| hall | 0.001 | 0.001 | 0.035 | 0.048 | 0.756 | 0.801 | 0.601 | 0.598 |
| Memory Bank | 0.005 | 0.004 | 0.104 | 0.089 | 0.807 | 0.799 | 0.646 | 0.659 |
| Final Exam | 0.004 | 0.004 | 0.161 | 0.136 | 0.816 | 0.812 | 0.581 | 0.622 |
| Strategy Guide | 0.004 | 0.004 | 0.072 | 0.070 | 0.788 | 0.787 | 0.596 | 0.591 |
