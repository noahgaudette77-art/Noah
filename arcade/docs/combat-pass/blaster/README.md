# Risk Blaster: the combat, captured

Made by `arcade/tools/scenarios/blaster-combat.js` (pictures) and `arcade/tools/scenarios/blaster-sound.js`
(`sound-cues.md`), with the page served over HTTP so the models, the panoramas and the recorded sound load:

```bash
node arcade/tools/capture.js arcade/tools/scenarios/blaster-combat.js --out arcade/docs/combat-pass/blaster --dpr 2
node arcade/tools/capture.js arcade/tools/scenarios/blaster-sound.js  --out arcade/docs/combat-pass/blaster --dpr 1
```

`PARTS=idle,beauty,death` (and so on) keeps only some of the pictures. Frames are 1/60 s on the capture's virtual
clock. A strip reads left to right, top to bottom. Unless it says otherwise a picture shows the band only: the
strip of screen between the question and the answers, which is all the 3D view is ever seen through.

| File | What it shows | Tiles |
|---|---|---|
| `01-idle-nebula.jpg` | the idle scene in the nebula (panorama `blaster-deep-1`) | still |
| `02-idle-crimson.jpg` | the idle scene in the asteroid belt (`blaster-deep-4`) | still |
| `03-idle-gate.jpg` | the idle scene at the gate (`blaster-deep-5`) | still |
| `04-ship-entrance.jpg` | the fighter flies in from behind the lens as the game starts; the first demon is coming up far ahead. Whole screen: the question is not up yet | 12, 7 frames apart, from 10 frames after the start |
| `05-demon-entrance.jpg` | the next wave's demon flies up out of the distance, its lights come on, it throws its wings wide and roars | 18, 7 frames apart, from the frame it starts to fly in |
| `06-firing.jpg` | three volleys from both cannons: bolts, muzzle flashes, spent cells, recoil; the beams that hold on the drone | 12, 1 frame apart, from 2 frames after the answer is picked |
| `07-right-hit.jpg` | a right answer: the drone bursts, the lance goes into the demon's core, it is thrown back, the fighter surges | 12, 2 frames apart, from 15 frames after the answer is picked (the rule checks it at 13) |
| `08-wrong-hit.jpg` | a wrong answer: each pair of bolts dies on the drone in a dull red fizzle, the drone locks out; the demon is already winding up | 12, 2 frames apart, from 2 frames after the answer is picked |
| `09-attack-volley.jpg` | the plasma volley: telegraph, release, landing, the shield going | 24, 3 frames apart, from 26 frames after the wrong answer |
| `10-attack-swipe.jpg` | the claw swipe, the same way | 24, 3 frames apart, from 10 frames after the wrong answer |
| `11-attack-wave.jpg` | the roared wave of force | 24, 3 frames apart, from 10 frames after |
| `12-attack-beam.jpg` | the swept beam | 24, 3 frames apart, from 10 frames after |
| `13-attack-missiles.jpg` | the seekers | 24, 3 frames apart, from 10 frames after |
| `14-taking-damage.jpg` | the swipe landing: flash, colour split, shake, sparks off the hull, the shield's lattice, the answers' letters still readable | 12, 2 frames apart, from 36 frames after the strike starts |
| `15-low-health.jpg` | one shield left: the red frame swelling with the alarm, the hurt engine burning | 12, 6 frames apart |
| `16-armour-breakage.jpg` | the wave's fourth hit shoots the demon's tail away; wounds from the second and third are open | 12, 3 frames apart, from 12 frames after the answer is picked |
| `16b-battered.jpg` | the demon after eight hits: tail and one wing gone, wounds burning | still |
| `17a-demon-critical.jpg` | the wave's last blow has landed: it hangs there breaking up until the wave is closed | still |
| `17-demon-death.jpg` | the death: the fighter's last burst, slow motion, the chain of blasts, the last blast, stars and coins going round the question to the score, the warp. From the top of the screen to the foot of the band. (The demon's last stand, which a first run always sees: other waves reach the last blast 12 frames sooner.) | 24, 5 frames apart, from 2 frames after the wave is closed |
| `18-question-full.jpg` | a question, whole screen | still |
| `19-explanation-full.jpg` | an explanation sheet, whole screen | still |
| `20-beauty.jpg` | one clean still: the demon come close, the fighter under it | still |
| `sound-cues.md` | which sound is called on which frame, beside what is shown on that frame, for the same moments | text |

In the capture the stars and coins that fly to the score (page animations, which run on the real clock) are stepped
with the frames, so `17-demon-death.jpg` shows them in flight; in the game they fly in real time.
