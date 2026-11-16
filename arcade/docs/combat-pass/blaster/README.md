# Risk Blaster: the combat, captured

Made by `arcade/tools/scenarios/blaster-combat.js` (pictures) and `arcade/tools/scenarios/blaster-sound.js`
(`sound-cues.md`), with the page served over HTTP so the models, the panoramas and the recorded sound load:

```bash
node arcade/tools/capture.js arcade/tools/scenarios/blaster-combat.js --out arcade/docs/combat-pass/blaster --dpr 2
node arcade/tools/capture.js arcade/tools/scenarios/blaster-sound.js  --out arcade/docs/combat-pass/blaster --dpr 1
```

`PARTS=idle,beauty,death` (and so on) keeps only some of the pictures. Frames are 1/60 s on the capture's virtual
clock; "f" below is frames after the answer is picked. A strip reads left to right, top to bottom. Unless it says
otherwise a picture shows the band only: the strip of screen between the question and the answers, which is all the
3D view is ever seen through. Every picture is of the build these files were committed with.

| File | What it shows | Tiles |
|---|---|---|
| `01-idle-nebula.jpg` | the idle scene in the nebula (panorama `blaster-deep-1`) | still |
| `02-idle-crimson.jpg` | the idle scene in the asteroid belt (`blaster-deep-4`): the same models under a crimson key | still |
| `03-idle-gate.jpg` | the idle scene at the gate (`blaster-deep-5`): under a blue key | still |
| `04-ship-entrance.jpg` | the fighter flies in from behind the lens as the game starts; the first demon is coming up far ahead, its rift and eyes lit. Whole screen: the question is not up yet | 12, 7 frames apart, from 10 frames after the start |
| `05-demon-entrance.jpg` | the next wave's demon flies up out of the distance (lit from its first frame), its lights come on, it throws its wings wide and roars | 18, 7 frames apart, from the frame it starts to fly in |
| `06-firing.jpg` | three volleys from both cannons: bolts, muzzle flashes that light the hull, spent cells, recoil; each pair cracks the drone's housing; the beams that hold on it | 12, 1 frame apart, from f2 |
| `07-right-hit.jpg` | a right answer: the drone shatters, the lance goes into the demon's rift (a slit of light, a thin ring), it is thrown back, the fighter surges; the score popup stands above the burst | 12, 2 frames apart, from f15 (the rule checks the answer at f13) |
| `07b-hit-stop.jpg` | the same blow, every frame: the demon holds one pose for the hit-stop while the burst and the shake run | 12, 1 frame apart, from f12 |
| `08-wrong-hit.jpg` | a wrong answer: each pair of bolts dies on the drone in a dull red fizzle and its ring goes red; then it locks out. The demon is already winding up | 12, 2 frames apart, from f2 |
| `09-attack-volley.jpg` | the plasma volley: reticle marker, orbs with a white-cyan heart and a dark rim, each popping on the shell | 24, 2 frames apart, from f4 |
| `10-attack-swipe.jpg` | the claw swipe: warning marker, the lunge, three gashes cut across the shell | 24, 2 frames apart, from f4 |
| `11-attack-wave.jpg` | the roared wave: toothed-ring marker, three thin rings of force, the shell ripples and the fighter is pushed back | 24, 2 frames apart, from f4 |
| `12-attack-beam.jpg` | the swept beam: sweep-arc marker and a line of sight, the beam's body crossing the fighter, a burnt line with drips | 24, 2 frames apart, from f4 |
| `13-attack-missiles.jpg` | the seekers: chevron marker, four ribbons of fire, staggered small blasts on the shell | 24, 2 frames apart, from f4 |
| `14-taking-damage.jpg` | the claws land: the HUD cracks and the lost shield breaks, the band's edge flashes red, the shell flares cyan three times with the hull's own colours inside it; the four letters are untouched. From the top of the screen to the foot of the band | 12, 2 frames apart, from f22 |
| `15-low-health.jpg` | one shield left: the red frame swelling once with each tone of the alarm, flames over the hurt engine's cowl, a ribbon of flame and dark smoke trailing from it | 12, 6 frames apart |
| `16-armour-breakage.jpg` | the wave's fourth hit: the tail is thrown off on the frame of the blow, spinning, sparks trailing, and burns up | 12, 3 frames apart, from f12 (the blow is at f13) |
| `16b-battered.jpg` | the demon after eight hits: horns, tail and one wing gone, wounds burning | still |
| `17a-demon-critical.jpg` | the wave's last blow has landed and its explanation is up: the demon comes apart a piece at a time | 12, 10 frames apart, from the frame the sheet comes up |
| `17-demon-death.jpg` | the wave is closed: the fighter's last burst, a beat of slow motion, the last blast, stars and coins going round the question to the score, the warp, and the next question coming up on a clear picture. From the top of the screen to the foot of the band | 24, 4 frames apart, from 2 frames after the wave is closed |
| `18-question-full.jpg` | a question, whole screen | still |
| `19-explanation-full.jpg` | an explanation sheet, whole screen | still |
| `20-beauty.jpg` | one clean still: the demon come close, the fighter under it | still |
| `21-game-over.jpg` | the last shield has gone: the fighter blows up and comes apart into its parts, a tank goes, the demon spreads its wings over the wreck | 12, 5 frames apart, from 2 frames after the explanation is closed |
| `sound-cues.md` | which sound is called on which frame, beside what is shown on that frame, for the same moments | text |
| `review-r1.md` | the first independent review these captures answer | text |

In the capture, what the page animates on the real clock (the stars and coins that fly to the score, the HUD's
cracks) is stepped with the frames, so `14` and `17` show them in flight; in the game they run in real time.
