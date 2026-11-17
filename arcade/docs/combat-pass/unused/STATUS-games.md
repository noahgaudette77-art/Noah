# Unused assets: the three games and the music variants (running note)

Worktree `/home/user/Noah/.claude/worktrees/agent-a117753e054ddaf8b`, branch `worktree-agent-a117753e054ddaf8b` (from `claude/quirky-ride-9frte0` at 7117645).

Rules added mid-task by the coordinator (performance first): no new lights or shadows; one material per model kind, geometry shared
(instanced where it can be); every background addition behind `GFX.extras` (true by default, defined in `08e-propfx.js`, checked
wherever they are added or updated); at most 2 allies and 3 brood on screen; short-lived props disposed; `04-gfx.js` and
`04b-pipeline.js` not touched; the music mechanism kept simple.

| Item | State | Commit |
|---|---|---|
| 4. Music variants (Sound, Assets) | done: Sound.take(), play(name, again), Assets.wants(); checked served (alternates, one file per visit) | see git log |
| Shared 3D props kit (`08e-propfx.js`) | todo | |
| 1. Risk Blaster: sounds, announcer | todo | |
| 1. Risk Blaster: shield, bolt, star | todo | |
| 1. Risk Blaster: allies | todo | |
| 1. Risk Blaster: brood | todo | |
| 2. Nest Egg Run: shield, heart, bolt, star | todo | |
| 2. Nest Egg Run: rivals, chaser | todo | |
| 3. Boss Rush: heart, star, coin, bolt | todo | |
| 3. Boss Rush: the boss's last word | todo | |
| Captures, full tests | todo | |
