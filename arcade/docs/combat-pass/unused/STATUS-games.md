# Unused assets: the three games and the music variants (running note)

Worktree `/home/user/Noah/.claude/worktrees/agent-a117753e054ddaf8b`, branch `worktree-agent-a117753e054ddaf8b` (from `claude/quirky-ride-9frte0` at 7117645).

Rules added mid-task by the coordinator (performance first): no new lights or shadows; one material per model kind, geometry shared
(instanced where it can be); every background addition behind `GFX.extras` (true by default, defined in `08e-propfx.js`, checked
wherever they are added or updated); at most 2 allies and 3 brood on screen; short-lived props pooled with the scene (made once,
hidden when done, freed with the scene, nothing made when an event fires); `04-gfx.js` and `04b-pipeline.js` not touched; the
music mechanism kept simple; the announcer sparse (FINAL WAVE only for the wave that reaches the wormhole gate, in place of its
number; BOSS INCOMING once a run).

| Item | State |
|---|---|
| 4. Music variants (Sound.take, play(name, again), Assets.wants) | done, committed; checked served (alternates, one file per visit) |
| Shared 3D props kit (`08e-propfx.js`), QuizGame.iconFX/propTier, Hype hook | done, committed |
| 1. Risk Blaster: laser_heavy, shell, FINAL WAVE, BOSS INCOMING | done, committed |
| 1. Risk Blaster: shield, bolt, star props; allies; brood (`20m-blasterescort.js`) | done, committed; capture running |
| 2. Nest Egg Run: shield (insured), heart (crash), bolt (tier), stars (milestone, retirement) | done, committed |
| 2. Nest Egg Run: rival-rig, rival-rig2 (rival event, in turn), chaser (chase event, on the road), violet/silver repaint | done, committed |
| 3. Boss Rush: heart (heart lost), stars + coins (death), bolt (tier) | done, committed |
| 3. Boss Rush: the boss's own "game over" (Sound.sayAs; 1-4 adam, 5-8 brian, 9-11 and the Proctor charlie) | done, committed |
| Regressions from disk (blaster, racer, boss) | IDENTICAL; served blaster IDENTICAL; served smoke test of all three clean |
| Captures (blaster, racer, boss), full regression both ways, sequence | todo |

Fixed on the way: the props field was first called `props`, which is Nest Egg Run's own roadside mesh: the racer then called
`update` on a mesh every frame (an error a frame, from disk too) until it was renamed `iconFX` (commit 7c522a3).
