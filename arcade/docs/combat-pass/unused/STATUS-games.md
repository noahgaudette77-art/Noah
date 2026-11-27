# Unused assets: the three games and the music variants (running note)

Worktree `/home/user/Noah/.claude/worktrees/agent-a117753e054ddaf8b`, branch `worktree-agent-a117753e054ddaf8b` (from `claude/quirky-ride-9frte0` at 7117645).

Rules added mid-task by the coordinator (performance first): no new lights or shadows; one material per model kind, geometry shared
(instanced where it can be); every background addition behind `GFX.extras` (true by default, defined in `08e-propfx.js`, checked
wherever they are added or updated); at most 2 allies and 3 brood on screen; short-lived props pooled with the scene (made once,
hidden when done, freed with the scene, nothing made when an event fires); `04-gfx.js` and `04b-pipeline.js` not touched; the
music mechanism kept simple; the announcer sparse (FINAL WAVE only for the wave that reaches the wormhole gate, in place of its
number; BOSS INCOMING once a run). After c90972b/7c522a3 the Risk Blaster files belong to the lead: fixes there are reported, not made.

| Item | State |
|---|---|
| 4. Music variants (Sound.take, play(name, again), Assets.wants) | done; checked served (alternates, one file per visit) |
| Shared props kit (`08e-propfx.js`), QuizGame.iconFX/propTier/mirror, Hype hook | done |
| 1. Risk Blaster: laser_heavy, shell, FINAL WAVE, BOSS INCOMING, shield, bolt, stars, allies, brood | done; captures 01-04, 05, 17c, 22, 23 |
| 2. Nest Egg Run: shield, heart, bolt, stars; rival rigs and chaser repainted | done; captures 09, 14, 16, 19, 19b, 20, 21, 22 |
| 3. Boss Rush: heart, bolt, stars and coins; the boss's own "game over" | done; captures 13, 14, 15 |
| Regressions both ways (full), sequence | IDENTICAL both ways, no console errors; ALL 13 STEPS OK |

Open, for the lead (Risk Blaster files): the allies' entrance offsets put them outside a portrait phone's view (suggested
offsets sent); the brood read pale at their size (halve their rim). Captures after the first Blaster ones were taken at
--dpr 1: the machine was saturated by the performance runs and dpr 2 frames passed the 30 s screenshot limit.

Fixed on the way: the props field was first called `props`, Nest Egg Run's own roadside mesh (an error a frame, from disk too)
until renamed `iconFX`; the Blaster's props took no sky reflection (now via pano.mirror); the racer's shield and heart stood
behind the lane badges (now low at the rig's flank); Boss Rush's reward fell below the picture (now thrown from over the boss).
