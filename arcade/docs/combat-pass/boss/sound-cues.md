# Boss Rush: which sound is called on which frame

Taken from the running game by `arcade/tools/scenarios/boss-sound.js`: every call to `Sound.sfx`, `Sound.loop`, `Sound.stopLoop`, `Sound.say`, `Sound.play`, `Sound.stopMusic`, `Sound.setIntensity` and `Sound.hush` is noted with the frame it was made on, beside what the stage shows on that frame. Frames are 1/60 s; each table counts from the moment named above it. A sound and its picture are fired from the same place in the code, so they share a frame; a sound marked "sounds n frames on" is asked for on that frame and starts n frames later. `charge`, `correct`, `gameover` and the banners' lines are the rules' own, left where they were.

# PRODUCT PUSHER (boss 1)

## The entrance

Frame 0: the game starts (the rule opens the boss's words 96 frames on; here they are closed at once, so the first question is up while it is still powering up).

| frame | seen | heard |
|---:|---|---|
| -2 |  | `crton` |
| 0 | the game starts: the arena waits under the storm | music starts: `boss` · `charge` · announcer: "STAND BY" |
| +17 | it appears above the picture and drops in | `whoosh` |
| +54 | its feet touch the floor: a ring of dust, wreckage, the floor shakes, lightning | `boss_land` |
| +77 | it powers up: its lights come on (its roar and its name follow) | `boss_power` |
| +96 | a question is up |  |
| +107 |  | `roar_1` |
| +134 |  | announcer: "PRODUCT PUSHER" |

Loops running at the end of it: none.

## A right answer: the burst, the lance, the boss recoils

Frame 0: the answer is picked. The rule lands the blow 18 frames on (0.3 s), as it always did; the frames after it are stretched by the rule's own hit-stop.

| frame | seen | heard |
|---:|---|---|
| 0 | the player's burst begins, from the answer's side; a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +4 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +6 | a bolt sparks off its armour | `impact_metal` |
| +9 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +10 | a bolt sparks off its armour | `impact_metal` |
| +15 | a bolt sparks off its armour | `impact_metal` |
| +18 | the lance lands on its body (a white heart, sparks in the answer's colour, a thin ring, a hit-stop); it recoils | `correct` · `impact_good` · `boss_hurt` (sounds 3 frames on) |
| +43 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## The bar runs out: the telegraph, the strike, the landing

Frame 0: four seconds of the bar are left (its wind-up pose has followed the bar since it was 45% full). The bar runs out at frame 240: the rule takes the heart there and fires its hit 8 frames on.

| frame | seen | heard |
|---:|---|---|
| 0 | the marker of its strike stands at the foot of the picture (a volley of projectiles) | `boss_servo` · `lock_on` · loop starts: `charge_hum` · `charge_up` |
| +240 | the boss strikes (the bar has run out): its blow begins | loop stops: `charge_hum` |
| +248 | the rule fires: the blow is at its end; it lets the strike go (a volley of projectiles): the markers close, a beat of slow motion | `volley_fire` |
| +251 |  | `volley_fire` |
| +254 |  | `volley_fire` |
| +257 |  | `volley_fire` |
| +258 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink) | `player_hit` · `heart_lost` (sounds 5 frames on) |
| +262 |  | `volley_fire` |
| +263 |  | `impact_hull` |
| +265 |  | `impact_hull` |
| +267 |  | `impact_hull` |
| +269 |  | `impact_hull` |
| +273 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## A wrong answer before it has wound up

Frame 0: the answer is picked. The shot dies on its armour, the blow is at its end on the rule's frame (8 frames on), and the strike has landed before the explanation sheet comes up.

| frame | seen | heard |
|---:|---|---|
| 0 | the player's shot leaves (the answer is wrong); the boss strikes (the answer is wrong): its blow begins; the marker of its strike stands at the foot of the picture (a volley of projectiles); a bolt leaves (muzzle flash, spent cell) | `lock_on` · `charge_up` · `laser_fire` |
| +5 | the shot dies on its armour in a dull red fizzle | `impact_reject` |
| +7 | the rule fires: the blow is at its end; it lets the strike go (a volley of projectiles): the markers close, a beat of slow motion | `volley_fire` |
| +10 |  | `volley_fire` |
| +13 |  | `volley_fire` |
| +16 |  | `volley_fire` |
| +17 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink) | `player_hit` · `heart_lost` (sounds 5 frames on) |
| +20 |  | `volley_fire` |
| +21 |  | `impact_hull` |
| +23 |  | `impact_hull` |
| +25 |  | `impact_hull` |
| +27 |  | `impact_hull` |
| +31 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## The last heart

Frame 0: a wrong answer is picked with two hearts left.

| frame | seen | heard |
|---:|---|---|
| 0 | the player's shot leaves (the answer is wrong); the boss strikes (the answer is wrong): its blow begins; the marker of its strike stands at the foot of the picture (a volley of projectiles); a bolt leaves (muzzle flash, spent cell) | `lock_on` · `charge_up` · `laser_fire` |
| +5 | the shot dies on its armour in a dull red fizzle | `impact_reject` |
| +7 | the rule fires: the blow is at its end; it lets the strike go (a volley of projectiles): the markers close, a beat of slow motion | `volley_fire` |
| +10 |  | `volley_fire` |
| +13 |  | `volley_fire` |
| +16 |  | `volley_fire` |
| +17 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink); one heart left: the red frame beats | `player_hit` · `heart_lost` (sounds 5 frames on) · announcer: "CRITICAL" · loop starts: `alarm` |
| +20 |  | `volley_fire` |
| +21 |  | `impact_hull` |
| +23 |  | `impact_hull` |
| +25 |  | `impact_hull` |
| +27 |  | `impact_hull` |
| +31 | the explanation sheet comes up |  |

Loops running at the end of it: `alarm`.

## A pause, with the alarm sounding

Frame 0: the game is paused. The menu's own blip is the only thing left to sound.

| frame | seen | heard |
|---:|---|---|
| 0 | the game is paused | `blip` · loop stops: `alarm` · whatever is still ringing is faded out |

Loops running at the end of it: none.

## The pause ends

Frame 0: the game goes on.

| frame | seen | heard |
|---:|---|---|
| 0 | the game goes on | loop starts: `alarm` |

Loops running at the end of it: `alarm`.

## Damage: armour is torn off

Frame 0: the answer is picked with 60% of its HP left (the blow takes it under 56%).

| frame | seen | heard |
|---:|---|---|
| 0 | the player's burst begins, from the answer's side; a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +4 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +5 | a bolt sparks off its armour | `impact_metal` |
| +8 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +9 | a bolt sparks off its armour | `impact_metal` |
| +13 | a bolt sparks off its armour | `impact_metal` |
| +17 | the lance lands on its body (a white heart, sparks in the answer's colour, a thin ring, a hit-stop); it recoils; a hole is burnt in its chest: it leaks sparks from now on | `correct` · `impact_big` · `boss_stagger` (sounds 3 frames on) · `boss_break` (sounds 2 frames on) |
| +35 | its l hand is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `boss_break` |
| +38 |  | `explosion_small` |
| +42 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## Rage

Frame 0: the answer is picked with 38% of its HP left (the blow takes it under 35%).

| frame | seen | heard |
|---:|---|---|
| 0 | the player's burst begins, from the answer's side; a bolt leaves (muzzle flash, spent cell) | `zip` · `laser_fire` |
| +4 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +5 | a bolt sparks off its armour | `impact_metal` |
| +8 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +9 | a bolt sparks off its armour | `impact_metal` |
| +13 | a bolt sparks off its armour | `impact_metal` |
| +17 | the lance lands on its body (a white heart, sparks in the answer's colour, a thin ring, a hit-stop); it recoils; its l forearm is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `correct` · music intensity 3 · `impact_big` · `boss_stagger` (sounds 3 frames on) · `boss_break` |
| +24 |  | `explosion_small` |
| +42 | the explanation sheet comes up |  |
| +48 | it rages: a roar, a red ring, lightning | `roar_1` |
| +51 | banner: ENRAGED | announcer: "ENRAGED" · `charge` |

Loops running at the end of it: none.

## The finishing blow: done for

Frame 0: the answer is picked. While its explanation is up the boss stands there done for.

| frame | seen | heard |
|---:|---|---|
| 0 | the player's burst begins, from the answer's side; a bolt leaves (muzzle flash, spent cell) | `fever1` · announcer: "COMPOUNDING" · `laser_fire` |
| +4 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +5 | a bolt sparks off its armour | `impact_metal` |
| +8 | a bolt leaves (muzzle flash, spent cell) | `laser_fire` |
| +9 | a bolt sparks off its armour | `impact_metal` |
| +13 | a bolt sparks off its armour | `impact_metal` |
| +17 | the lance lands on its body (a white heart, sparks in the answer's colour, a thin ring, a hit-stop); it is finished; done for: it sways, arms hanging, lights failing | `correct` · `impact_big` · `boss_stagger` (sounds 3 frames on) |
| +50 | the explanation sheet comes up |  |
| +59 | a small blast on its body | `explosion_small` |
| +107 | a small blast on its body | `explosion_small` |
| +149 | a small blast on its body | `explosion_small` |
| +199 | a small blast on its body | `explosion_small` |

Loops running at the end of it: none.

## Its death

Frame 0: the explanation is closed (the rule shows the results 192 frames on, as it always did). The last blast, the banner, the reward and the jingle are all over before that.

| frame | seen | heard |
|---:|---|---|
| 0 | its death begins: slow motion, it goes over backward | music stops · `slowmo_in` · `boss_death` |
| +15 | a blast on its body as it falls; its l upperarm is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on); its r hand is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `boss_break` · `explosion_small` |
| +37 | a blast on its body as it falls; its r forearm is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on); its l calf is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `boss_break` · `explosion_small` |
| +58 | a blast on its body as it falls; its head is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on); its r upperarm is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `boss_break` · `explosion_small` |
| +92 | the last blast as it hits the floor: every part thrown clear, rings, wreckage | `explosion_huge` · `debris` (sounds 18 frames on) |
| +100 | stars leave for the score; coins leave for the score | announcer: "BOSS DEFEATED!" · `reward` |
| +127 |  | `win` |
| +192 |  | `trophy` · announcer: "Trophy unlocked" · `levelup` |

Loops running at the end of it: none.

## The last heart goes

(A second fight.) Frame 0: a wrong answer is picked with one heart left.

| frame | seen | heard |
|---:|---|---|
| 0 | the player's shot leaves (the answer is wrong); the boss strikes (the answer is wrong): its blow begins; the marker of its strike stands at the foot of the picture (a volley of projectiles); a bolt leaves (muzzle flash, spent cell) | `lock_on` · `charge_up` · `laser_fire` |
| +5 | the shot dies on its armour in a dull red fizzle | `impact_reject` |
| +7 | the rule fires: the blow is at its end; it lets the strike go (a volley of projectiles): the markers close, a beat of slow motion | `volley_fire` |
| +10 |  | `volley_fire` |
| +13 |  | `volley_fire` |
| +16 |  | `volley_fire` |
| +17 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink); no heart left: the red frame holds | `player_hit` · `heart_lost` (sounds 5 frames on) · loop stops: `alarm` |
| +21 |  | `volley_fire` |
| +22 |  | `impact_hull` |
| +24 |  | `impact_hull` |
| +26 |  | `impact_hull` |
| +28 |  | `impact_hull` |
| +32 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## The player's defeat

Frame 0: the explanation is closed with no heart left (the rule shows the results 168 frames on).

| frame | seen | heard |
|---:|---|---|
| 0 | the boss has the last word: it roars and gloats | music stops · `gameover` · `roar_1` |
| +24 |  | announcer: "GAME OVER" |
| +72 |  | announcer: "DEFEATED" |

Loops running at the end of it: none.

# THE PROCTOR (all chapters)

## The entrance

Frame 0: the game starts.

| frame | seen | heard |
|---:|---|---|
| -2 |  | `crton` |
| 0 | the game starts: the arena waits under the storm; banner: STAND BY | music starts: `finalboss` · `charge` · announcer: "STAND BY" |
| +18 | it appears above the picture and drops in | `whoosh` |
| +55 | its feet touch the floor: a ring of dust, wreckage, the floor shakes, lightning | `boss_land` |
| +78 | it powers up: its lights come on (its roar and its name follow) | `boss_power` |
| +97 | a question is up |  |
| +109 |  | `roar_all` · announcer: "FINAL BOSS" |
| +137 |  | announcer: "THE PROCTOR" |

Loops running at the end of it: none.

## Its strike: a volley of projectiles

Frame 0: a second and a half of the bar is left.

| frame | seen | heard |
|---:|---|---|
| +88 | the boss strikes (the bar has run out): its blow begins | loop stops: `charge_hum` |
| +96 | the rule fires: the blow is at its end; it lets the strike go (a volley of projectiles): the markers close, a beat of slow motion | `volley_fire` |
| +99 |  | `volley_fire` |
| +102 |  | `volley_fire` |
| +105 |  | `volley_fire` |
| +106 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink) | `player_hit` · `heart_lost` (sounds 5 frames on) |
| +110 |  | `volley_fire` |
| +111 |  | `impact_hull` |
| +113 |  | `impact_hull` |
| +115 |  | `impact_hull` |
| +117 |  | `impact_hull` |
| +121 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## Its strike: a ground slam

Frame 0: a second and a half of the bar is left.

| frame | seen | heard |
|---:|---|---|
| +88 | the boss strikes (the bar has run out): its blow begins | loop stops: `charge_hum` |
| +96 | the rule fires: the blow is at its end; it lets the strike go (a ground slam): the markers close, a beat of slow motion | `slam` |
| +111 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink) | `player_hit` · `heart_lost` (sounds 5 frames on) |
| +121 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## Its strike: a wave of energy

Frame 0: a second and a half of the bar is left.

| frame | seen | heard |
|---:|---|---|
| +88 | the boss strikes (the bar has run out): its blow begins | loop stops: `charge_hum` |
| +96 | the rule fires: the blow is at its end; it lets the strike go (a wave of energy): the markers close, a beat of slow motion | `wave_fire` |
| +113 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink) | `player_hit` · `heart_lost` (sounds 5 frames on) |
| +121 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## Its strike: a swept beam

Frame 0: a second and a half of the bar is left.

| frame | seen | heard |
|---:|---|---|
| +88 | the boss strikes (the bar has run out): its blow begins | loop stops: `charge_hum` |
| +96 | the rule fires: the blow is at its end; it lets the strike go (a swept beam): the markers close, a beat of slow motion | `beam_fire` |
| +105 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink) | `player_hit` · `heart_lost` (sounds 5 frames on) |
| +120 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## Its strike: seekers

Frame 0: a second and a half of the bar is left.

| frame | seen | heard |
|---:|---|---|
| +87 | the boss strikes (the bar has run out): its blow begins | loop stops: `charge_hum` |
| +95 | the rule fires: the blow is at its end; it lets the strike go (seekers): the markers close, a beat of slow motion | `missile_fire` · `missile_fire` (sounds 3 frames on) |
| +110 | the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink) | `missile_hit` · `player_hit` · `heart_lost` (sounds 5 frames on) |
| +116 |  | `missile_hit` |
| +117 |  | `missile_hit` |
| +119 | the explanation sheet comes up |  |

Loops running at the end of it: none.

## Its death

Frame 0: the explanation of the finishing blow is closed.

| frame | seen | heard |
|---:|---|---|
| 0 | its death begins: slow motion, it goes over backward | music stops · `slowmo_in` · `boss_death` |
| +15 | a blast on its body as it falls; its l upperarm is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on); its r hand is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `boss_break` · `explosion_small` |
| +37 | a blast on its body as it falls; its r forearm is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on); its l calf is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `boss_break` · `explosion_small` |
| +58 | a blast on its body as it falls; its head is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on); its r upperarm is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on) | `boss_break` · `explosion_small` |
| +92 | the last blast as it hits the floor: every part thrown clear, rings, wreckage | `explosion_huge` · `debris` (sounds 18 frames on) |
| +98 |  | announcer: "FINAL BOSS DESTROYED" |
| +99 | stars leave for the score; coins leave for the score | `reward` |
| +105 |  | `explosion_big` |
| +125 |  | `win` |
| +191 |  | `levelup` |

Loops running at the end of it: none.

