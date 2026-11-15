# Risk Blaster: which sound is called on which frame

Taken from the running game by `arcade/tools/scenarios/blaster-sound.js`: every call to `Sound.sfx`, `Sound.loop`, `Sound.stopLoop`, `Sound.say`, `Sound.play`, `Sound.stopMusic`, `Sound.setIntensity` and `Sound.hush` is noted with the frame it was made on, beside what the stage shows on that frame. Frames are 1/60 s; each table counts from the moment named in its heading (frame 0). A cue marked "sounds N frames on" was given a delay and is heard N frames after its row. The loops that follow the game every frame (`Sound.loopSet`: the engine's note, the charge's rise) are not listed. A sound and its picture are fired from the same place in the code, so they share a row.

## The start: both entrances

Frame 0: the game starts.

| frame | seen | heard |
|---:|---|---|
| -2 |  | `crton` |
| 0 | the game starts: the fighter is launched and the demon begins its fly-in | music starts: `blaster` · loop starts: `engine_ship` · `whoosh` · announcer: "WAVE 1" |
| +49 |  | `demonflap` |
| +81 | it throws its wings wide and roars | `boss_roar` |
| +157 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## Firing, and a right hit

Frame 0: the answer is picked. The rule checks it 13 frames on (0.22 s), as it always did.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_metal` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_metal` |
| +12 | a pair of bolts lands on the drone | `impact_metal` |
| +13 | the drone bursts and the lance goes through it into the demon's core; sparks leave for the score; the blow lands on its core (flash, sparks, ring, hit-stop) | `correct` · `impact_good` · `impact_big` · `boss_hurt` (sounds 3 frames on) |

Loops running at the end of it: `engine_ship`.

## A wrong hit, the plasma volley, taking damage

Frame 0: the answer is picked. The demon starts to wind up on the same frame; the shield is seen to go when its strike lands.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (plasma volley): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `lock_on` (sounds 3 frames on) · `lock_on` (sounds 12 frames on) · `lock_on` (sounds 21 frames on) · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_reject` |
| +12 | a pair of bolts lands on the drone | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +30 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `plasma_fire` |
| +39 |  | `plasma_fire` |
| +45 |  | `plasma_fire` |
| +49 |  | `plasma_fire` |
| +50 | the strike reaches the fighter; the shield is seen to go (flash, colour split, shake, the HUD cracks) | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +55 |  | `plasma_fire` |
| +56 |  | `impact_shield` |
| +60 |  | `impact_shield` |
| +64 |  | `impact_shield` |
| +67 |  | `impact_shield` |
| +115 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The claw swipe (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (claw swipe): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `warning` · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_reject` |
| +12 | a pair of bolts lands on the drone | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +30 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `whoosh` |
| +45 | the strike reaches the fighter; the shield is seen to go (flash, colour split, shake, the HUD cracks) | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" · `slam` |
| +103 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The roared wave (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (roared wave): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_reject` |
| +12 | a pair of bolts lands on the drone | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +30 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `boss_roar` · `wave_fire` (sounds 2 frames on) |
| +58 | the strike reaches the fighter; the shield is seen to go (flash, colour split, shake, the HUD cracks) | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +90 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The swept beam (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (swept beam): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_reject` |
| +12 | a pair of bolts lands on the drone | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +29 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `beam_fire` |
| +50 | the strike reaches the fighter; the shield is seen to go (flash, colour split, shake, the HUD cracks) | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +77 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The seekers (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (seekers): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `lock_on` (sounds 3 frames on) · `lock_on` (sounds 12 frames on) · `lock_on` (sounds 21 frames on) · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_reject` |
| +12 | a pair of bolts lands on the drone | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +29 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `missile_fire` · `missile_fire` (sounds 5 frames on) |
| +63 |  | `demonflap` |
| +68 | the strike reaches the fighter; the shield is seen to go (flash, colour split, shake, the HUD cracks) | `missile_hit` · `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +74 |  | `missile_hit` |

Loops running at the end of it: `engine_ship`.

## Low health: the second shield goes

Frame 0: a wrong answer is picked with two shields left. The alarm is a loop of two tones (2.25 s); the red frame round the band swells once with each tone (every 67.5 frames), timed from the frame the loop starts.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (plasma volley): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `lock_on` (sounds 3 frames on) · `lock_on` (sounds 12 frames on) · `lock_on` (sounds 21 frames on) · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_reject` |
| +12 | a pair of bolts lands on the drone | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +29 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `plasma_fire` |
| +40 |  | `plasma_fire` |
| +45 |  | `plasma_fire` |
| +49 | the strike reaches the fighter; the shield is seen to go (flash, colour split, shake, the HUD cracks); one shield left: the red frame and the engine fire start | `plasma_fire` · `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "LAST SHIELD" · loop starts: `alarm` |
| +52 |  | `demonflap` |
| +54 |  | `plasma_fire` |
| +55 |  | `impact_shield` |
| +59 |  | `impact_shield` |
| +62 |  | `impact_shield` |
| +65 |  | `impact_shield` |

Loops running at the end of it: `engine_ship`, `alarm`.

## A pause, with the alarm sounding

Frame 0: the game is paused. The menu's own blip is the only thing left to sound.

| frame | seen | heard |
|---:|---|---|
| 0 | the game is paused | `blip` · loop stops: `engine_ship` · loop stops: `alarm` · whatever is still ringing is faded out |

Loops running at the end of it: none.

## The pause ends

Frame 0: the game goes on.

| frame | seen | heard |
|---:|---|---|
| 0 | the game goes on | loop starts: `engine_ship` · loop starts: `alarm` |

Loops running at the end of it: `engine_ship`, `alarm`.

## Armour breakage: the wave's fourth hit shoots its tail away

Frame 0: the answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone | `impact_metal` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone | `impact_metal` |
| +12 | a pair of bolts lands on the drone | `impact_metal` |
| +13 | the drone bursts and the lance goes through it into the demon's core; sparks leave for the score; the blow lands on its core (flash, sparks, ring, hit-stop); a wound opens in its armour | `zip` · `combo` · `correct` · `impact_good` · `impact_big` · `boss_hurt` (sounds 3 frames on) · `boss_break` (sounds 2 frames on) |
| +38 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The demon's death, the warp, the next demon

Frame 0: the explanation of the wave's last question is closed (the rule closes the wave here; the next question comes up 90 frames on, as it always did). In a first run the wave that passes the best score is the demon's last stand, which this is: its last blast comes 12 frames later than in other waves.

| frame | seen | heard |
|---:|---|---|
| 0 | the wave is closed: the fighter's last burst leaves its cannons | `levelup` · announcer: "WAVE 2" · `laser_fire` |
| +3 |  | `laser_fire` |
| +5 |  | `impact_big` · `slowmo_in` · `boss_death` |
| +8 |  | `laser_fire` |
| +14 |  | `impact_big` |
| +25 |  | `impact_big` |
| +47 | a part of it comes away in a blast | `explosion_small` |
| +53 | a part of it comes away in a blast | `explosion_small` |
| +60 | a part of it comes away in a blast | `explosion_small` |
| +67 | a part of it comes away in a blast | `explosion_small` |
| +79 | the last blast | music intensity 3 · `explosion_huge` · `debris` (sounds 21 frames on) |
| +87 | the warp starts | `warp` |
| +95 | stars leave for the score; coins leave for the score | `reward` |
| +149 |  | announcer: "NEW HIGH SCORE" |
| +167 | the next demon starts to fly in |  |
| +224 |  | `demonflap` |
| +249 | it throws its wings wide and roars | `boss_roar` |

Loops running at the end of it: `engine_ship`.

## Time runs out on the last shield

Frame 0: 45 frames of the clock are left. The demon starts to wind up when 30 are left, and lets go as the clock runs out.

| frame | seen | heard |
|---:|---|---|
| +15 | the demon starts to wind up (claw swipe): its glow gathers, the marker appears on the fighter | loop starts: `charge_hum` · `charge_up` · `warning` |
| +45 | time is up | `shatter` · music intensity 0 |
| +47 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `whoosh` |
| +62 | the strike reaches the fighter; the shield is seen to go (flash, colour split, shake, the HUD cracks); no shield left: the red frame holds | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "CRITICAL" · loop stops: `alarm` · `slam` |
| +70 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## Game over

Frame 0: the explanation is closed with no shield left.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter blows up; low health ends | music stops · `gameover` · announcer: "GAME OVER" · loop stops: `engine_ship` · `explosion_big` · `boss_roar` |
| +25 |  | `explosion_small` |
| +96 |  | `trophy` · announcer: "Trophy unlocked" · `levelup` |

Loops running at the end of it: none.

