# Nest Egg Run: which sound is called on which frame

Taken from the running game by `arcade/tools/scenarios/racer-sound.js`: every call to `Sound.sfx`, `Sound.loop`, `Sound.stopLoop`, `Sound.say`, `Sound.play`, `Sound.stopMusic`, `Sound.setIntensity` and `Sound.hush` is noted with the frame it was made on, beside what the stage shows on that frame. Frames are 1/60 s; each table counts from the moment named in its heading (frame 0). A cue marked "sounds N frames on" was given a delay and is heard N frames after its row. The loops that follow the game every frame (`Sound.loopSet`: the engine's note with the road's speed, the flame's level) are not listed. A sound and its picture are fired from the same place in the code, so they share a row. The announcer speaks with each banner (`UI.banner` calls `Sound.say`), one line at a time: a line asked for while the one before it is still being spoken waits its turn (its row says how long), and a line that would be more than 2.5 s late is not spoken.

## The start

Frame 0: the game starts. The first question comes up 1.3 s on, as it always did.

| frame | seen | heard |
|---:|---|---|
| -2 |  | `crton` |
| 0 | banner: "AGE 25. GO!"; the game starts: the rig drives in from behind the lens, stacks burning, and brakes onto its mark | music starts: `racer` · loop starts: `engine_car` · `boost` · announcer: "AGE 25. GO!" |
| +2 |  | loop starts: `boost_flame` |
| +53 |  | `skid` |
| +61 |  | loop stops: `boost_flame` |
| +77 | the next question comes up |  |

Loops running at the end of it: `engine_car`.

## A lane is taken, and the boost

Frame 0: a lane is picked. With no second tap the rig floors it by itself a second later (the rule), and reaches the gate 0.7 s after that.

| frame | seen | heard |
|---:|---|---|
| 0 |  | `move` |
| +59 | the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road | `boost` |
| +61 |  | loop starts: `boost_flame` |

Loops running at the end of it: `engine_car`, `boost_flame`.

## A right gate

Frame 0: the gate is reached in the right lane.

| frame | seen | heard |
|---:|---|---|
| 0 | THE GATE IS REACHED (the rule); a right gate: the lane's light bursts over the nose in its colour (white heart, sparks, two thin rings, a ring and a pool on the road), the egg swells, hit-stop; the rig surges ahead on both stacks | `gate_pass` · `impact_good` · `correct` · `deposit` · `boost` (sounds 2 frames on) |
| +6 | coins leave for the nest egg | `reward` |
| +28 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |

Loops running at the end of it: `engine_car`, `boost_flame`.

## A wrong lane: the crash

Frame 0: the gate is reached in a wrong lane. The game's own hit-stop slows its clock for 120 ms here, so the explanation sheet (0.45 s of the game's clock) comes up about 32 frames on: the blow has been seen and heard by then.

| frame | seen | heard |
|---:|---|---|
| -102 |  | `move` |
| -42 | the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road | `boost` |
| -40 |  | loop starts: `boost_flame` |
| 0 | THE GATE IS REACHED (the rule); a wrong lane: the red pane breaks over the nose (glass thrown back, red sparks, the reject cross and dark smoke); the band's edge flashes red, the lens lurches, hit-stop; the rig is knocked: its tail steps out into a half-spin on locked wheels (tyre smoke, skid marks); the life that went breaks in the HUD; the HUD flickers and cracks | `impact_reject` · `crash` · `crash_glass` (sounds 2 frames on) · `player_hit` · `wrong` · `skid` (sounds 4 frames on) · `heart_lost` (sounds 8 frames on) · `debris` (sounds 19 frames on) |
| +9 |  | `explosion_small` |
| +16 |  | loop stops: `boost_flame` |
| +33 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |

Loops running at the end of it: `engine_car`.

## No lane chosen: the bollard

Frame 0: the gate is reached with no lane taken.

| frame | seen | heard |
|---:|---|---|
| 0 | THE GATE IS REACHED (the rule); no lane: it runs onto the bollard (metal, sparks, the reject cross); the band's edge flashes red, the lens lurches, hit-stop; the rig is knocked: its tail steps out into a half-spin on locked wheels (tyre smoke, skid marks); the life that went breaks in the HUD; the HUD flickers and cracks | `impact_reject` · `crash` · `impact_metal` · `player_hit` · `wrong` · `skid` (sounds 4 frames on) · `heart_lost` (sounds 8 frames on) · `debris` (sounds 19 frames on) |
| +9 |  | `explosion_small` |
| +33 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |

Loops running at the end of it: `engine_car`.

## An insured crash: the policy pays

Frame 0: the gate is reached in a wrong lane with a policy in hand.

| frame | seen | heard |
|---:|---|---|
| -100 |  | `move` |
| -41 | the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road | `boost` |
| -39 |  | loop starts: `boost_flame` |
| 0 | THE GATE IS REACHED (the rule); the policy pays: a shell of mint light round the rig takes the pane, an airbag of light swells in front of it, two mint rings, hit-stop; the rig is jolted and shimmies; the policy that paid breaks out of the HUD in mint shards | `impact_reject` · `impact_shield` · `crash_glass` (sounds 2 frames on) · `wrong` · `skid` (sounds 4 frames on) · `shield_down` (sounds 10 frames on) |
| +11 |  | loop stops: `boost_flame` |
| +27 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |

Loops running at the end of it: `engine_car`.

## A fifth right answer in a row: a policy is issued

Frame 0: the gate is reached. The policy's own picture and sound follow 0.3 s on, clear of the gate's burst.

| frame | seen | heard |
|---:|---|---|
| -100 |  | `move` |
| -41 | the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road | `boost` |
| -39 |  | loop starts: `boost_flame` |
| 0 | THE GATE IS REACHED (the rule); a right gate: the lane's light bursts over the nose in its colour (white heart, sparks, two thin rings, a ring and a pool on the road), the egg swells, hit-stop; the rig surges ahead on both stacks | `fever1` · announcer: "COMPOUNDING" · `trophy` · announcer: "Trophy unlocked" (waits its turn: spoken 78 frames on) · music intensity 2 · `gate_pass` · `impact_good` · `correct` · `deposit` · `boost` (sounds 2 frames on) |
| +5 | coins leave for the nest egg; stars leave for the nest egg | `reward` |
| +19 | a policy is issued: a soft swell of the shell; sparks of light leave for the policies in the HUD | `powerup` |
| +27 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |
| +45 |  | loop stops: `boost_flame` |

Loops running at the end of it: `engine_car`.

## A milestone: $100,000

Frame 0: the gate is reached. The banner and the announcer come 0.4 s on (the rule).

| frame | seen | heard |
|---:|---|---|
| -100 |  | `move` |
| -41 | the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road | `boost` |
| -39 |  | loop starts: `boost_flame` |
| 0 | THE GATE IS REACHED (the rule); a right gate: the lane's light bursts over the nose in its colour (white heart, sparks, two thin rings, a ring and a pool on the road), the egg swells, hit-stop; the rig surges ahead on both stacks | `fever2` · announcer: "BULL RUN" · `gate_pass` · `impact_good` · `correct` · `deposit` · `boost` (sounds 2 frames on) |
| +5 | coins leave for the nest egg; stars leave for the nest egg | `reward` |
| +24 | banner: "$100,000!" | `levelup` · announcer: "$100,000!" (waits its turn: spoken 40 frames on) |
| +27 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |
| +45 |  | loop stops: `boost_flame` |

Loops running at the end of it: `engine_car`.

## A near miss

Frame 0: something sets off from behind the lens in the next lane. It passes the rig about 35 frames on.

| frame | seen | heard |
|---:|---|---|
| +35 | a near miss: streaks of air on that side, the rig rocks away, the lens leans away | `near_miss` |

Loops running at the end of it: `engine_car`.

## The second crash: the last life

Frame 0: the gate is reached. The alarm is a loop of two tones (2.25 s); the red frame round the band swells once with each tone (every 67.5 frames), timed from the frame the loop starts.

| frame | seen | heard |
|---:|---|---|
| -102 |  | `move` |
| -42 | the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road | `boost` |
| -40 |  | loop starts: `boost_flame` |
| 0 | THE GATE IS REACHED (the rule); a wrong lane: the red pane breaks over the nose (glass thrown back, red sparks, the reject cross and dark smoke); the band's edge flashes red, the lens lurches, hit-stop; the rig is knocked: its tail steps out into a half-spin on locked wheels (tyre smoke, skid marks); the life that went breaks in the HUD; the HUD flickers and cracks; the last life: the red frame starts to swell with the alarm, the left stack burns | `impact_reject` · `crash` · `crash_glass` (sounds 2 frames on) · `player_hit` · `wrong` · `skid` (sounds 4 frames on) · `heart_lost` (sounds 8 frames on) · `debris` (sounds 19 frames on) · loop starts: `alarm` |
| +9 |  | `explosion_small` |
| +16 |  | loop stops: `boost_flame` |
| +33 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |
| +39 |  | announcer: "WARNING" |

Loops running at the end of it: `engine_car`, `alarm`.

## A pause, with the alarm sounding

Frame 0: the game is paused. The menu's own blip is the only thing left to sound.

| frame | seen | heard |
|---:|---|---|
| 0 | the game is paused | `blip` · loop stops: `engine_car` · loop stops: `alarm` · whatever is still ringing is faded out |

Loops running at the end of it: none.

## The pause ends

Frame 0: the game goes on.

| frame | seen | heard |
|---:|---|---|
| 0 | the game goes on | loop starts: `engine_car` · loop starts: `alarm` |

Loops running at the end of it: `engine_car`, `alarm`.

## The third crash

Frame 0: the gate is reached with one life left.

| frame | seen | heard |
|---:|---|---|
| -102 |  | `move` |
| -42 | the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road | `boost` |
| -40 |  | loop starts: `boost_flame` |
| 0 | THE GATE IS REACHED (the rule); a wrong lane: the red pane breaks over the nose (glass thrown back, red sparks, the reject cross and dark smoke); the band's edge flashes red, the lens lurches, hit-stop; the rig is knocked: its tail steps out into a half-spin on locked wheels (tyre smoke, skid marks); the life that went breaks in the HUD; the HUD flickers and cracks; no life left: the red frame holds, it burns harder | `impact_reject` · `crash` · `crash_glass` (sounds 2 frames on) · `player_hit` · `wrong` · `skid` (sounds 4 frames on) · `heart_lost` (sounds 8 frames on) · `debris` (sounds 19 frames on) · loop stops: `alarm` |
| +9 |  | `explosion_small` |
| +16 |  | loop stops: `boost_flame` |
| +33 | the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate) |  |

Loops running at the end of it: `engine_car`.

## Forced retirement

Frame 0: the explanation is closed with no life left. The results come up 114 frames on (1.9 s, the rule): the jingle starts with the skid (as the game always had it) and has all but rung out by then; the blast and the second blast are inside it, and every loop has stopped before it.

| frame | seen | heard |
|---:|---|---|
| 0 | THE RUN ENDS (the rule: the results come up 1.9 s on); banner: "FORCED RETIREMENT"; forced retirement begins: the road slows under it; no life left: the red frame holds, it burns harder; the rig slews to a stop | music stops · announcer: "FORCED RETIREMENT" · `skid` |
| +6 |  | `gameover` |
| +20 | a layered blast (hot core, lobes of fire, streaks, smoke, light on the road); a front wheel is thrown clear, spinning, sparks trailing from it; a stack falls | loop stops: `engine_car` · `explosion_big` · `crash_glass` (sounds 3 frames on) · `debris` (sounds 18 frames on) |
| +50 | a layered blast (hot core, lobes of fire, streaks, smoke, light on the road) | `explosion_small` |
| +114 |  | `trophy` · announcer: "Trophy unlocked" · `levelup` |

Loops running at the end of it: none.

## Retirement at 65

Frame 0: the explanation of the career's last question is closed. The results come up 114 frames on (1.9 s, the rule).

| frame | seen | heard |
|---:|---|---|
| 0 | THE RUN ENDS (the rule: the results come up 1.9 s on); banner: "RETIRED A MILLIONAIRE"; retirement at 65 begins: gold rings off the egg, fireworks; the rig turns on the spot with both stacks alight, then drives away toward the egg on the horizon; coins leave for the nest egg; stars leave for the nest egg | music stops · `win` · announcer: "RETIRED A MILLIONAIRE" · `boost` · `reward` (sounds 6 frames on) · `crowd_cheer` (sounds 15 frames on) |
| +72 |  | `boost` |
| +105 |  | loop stops: `engine_car` |
| +114 |  | `trophy` · announcer: "Trophy unlocked" (waits its turn: spoken 20 frames on) · `levelup` |

Loops running at the end of it: none.

