# The animation pass (2026-11-23)

Strips of the same moments before the pass (`b6ee1eb`) and after it, on the capture tool's virtual clock (every frame
exactly 1/60 s), every asset loaded (Chromium; this machine draws in software). The phone: an iPhone 17 Pro Max held
upright (440 x 956 page pixels, drawn at 2x for the strips, its safe areas), the 3D band between the question and the
answers. Made with `tools/scenarios/motion.js` (`BOSS=5`, `BOSS=3`). Each picture: before on top, after below, read left
to right, top to bottom.

| file | what |
|---|---|
| `05-golem-1-idle.jpg` | Group Golem and the wizard idling with a question up, 1.6 s (a frame every 0.1 s): before, both held still; after, the Golem breathes, sways and turns its head down to the wizard (slow: the heaviest of the twelve), the wizard breathes and looks up at it |
| `05-golem-2-attack.jpg` | a wrong answer, 1.2 s from it (a frame every 0.05 s): the Golem's ground slam (after: thrown forward into it, giving at the blow, held a beat), the wizard's ward; after, the wizard flinches over its cast instead of cutting to a hurt clip |
| `05-golem-3-hit.jpg` | a right answer, 1.2 s: the wizard's cast (after: thrown into it, the wand whipping) and the lance; the Golem's reaction (after: a layer over its stance, turned away from the wizard's side, one of three kinds) |
| `05-golem-4-death.jpg` | the last right answer: the Golem's fall (after: landing hard, a bounce) |
| `05-golem-5-defeat.jpg` | the wizard's last heart: the wizard sinks (after: slumping, its head dropping); the Golem's victory (after: a new clip; before, a roar) |
| `03-specter-*.jpg` | the same five for the Solvency Specter (after: hovering, its legs hanging, drifting; pushed further by a blow; sinking as it falls, turning) |

What each change does, its cost a frame on the phone and the Mac, and the frame-rate test: `PROGRESS.md`, "The
animation pass".
