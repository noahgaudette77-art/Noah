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
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `boom` · `impact_metal` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +13 | the drone shatters and the lance goes through it into the demon's core; sparks leave for the score; the blow lands on its core (a slit of light, sparks, ring, hit-stop) | `correct` · `impact_good` · `impact_big` · `boss_hurt` (sounds 3 frames on) |

Loops running at the end of it: `engine_ship`.

## A wrong hit, the plasma volley, taking damage

Frame 0: the answer is picked. The demon starts to wind up on the same frame; the shield is seen to go when its strike lands, which is before the explanation sheet comes up (about frame 46).

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (plasma volley): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `lock_on` (sounds 2 frames on) · `lock_on` (sounds 10 frames on) · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +18 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `plasma_fire` |
| +23 |  | `plasma_fire` |
| +26 |  | `plasma_fire` |
| +29 |  | `plasma_fire` |
| +32 |  | `plasma_fire` |
| +33 | the strike is on the fighter: the shield is seen to go (the shell flares, the band's edge flashes red, shake, the HUD cracks); something pops on the fighter's shell | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +39 | something pops on the fighter's shell | `impact_shield` |
| +41 | something pops on the fighter's shell | `impact_shield` |
| +44 | something pops on the fighter's shell | `impact_shield` |
| +47 | something pops on the fighter's shell | `impact_shield` |
| +115 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The claw swipe (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (claw swipe): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `warning` · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +18 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `whoosh` |
| +27 | the strike is on the fighter: the shield is seen to go (the shell flares, the band's edge flashes red, shake, the HUD cracks) | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" · `slam` |
| +104 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The roared wave (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (roared wave): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `warning` · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +18 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `boss_roar` · `wave_fire` (sounds 2 frames on) |
| +34 | the strike is on the fighter: the shield is seen to go (the shell flares, the band's edge flashes red, shake, the HUD cracks) | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +92 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The swept beam (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (swept beam): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `warning` · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +17 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `beam_fire` |
| +30 | the strike is on the fighter: the shield is seen to go (the shell flares, the band's edge flashes red, shake, the HUD cracks) | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +80 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The seekers (telegraph, release, landing)

Frame 0: a wrong answer is picked.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (seekers): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `lock_on` (sounds 2 frames on) · `lock_on` (sounds 10 frames on) · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +17 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `missile_fire` · `missile_fire` (sounds 3 frames on) |
| +36 | the strike is on the fighter: the shield is seen to go (the shell flares, the band's edge flashes red, shake, the HUD cracks) | `missile_hit` · `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "SHIELD DOWN" |
| +42 |  | `missile_hit` |
| +43 |  | `missile_hit` |
| +67 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## Low health: the second shield goes

Frame 0: a wrong answer is picked with two shields left. The alarm is a loop of two tones (2.25 s); the red frame round the band swells once with each tone (every 67.5 frames), timed from the frame the loop starts.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; the demon starts to wind up (plasma volley): its glow gathers, the marker appears on the fighter; a volley leaves both cannons (bolts, muzzle flashes, recoil) | loop starts: `charge_hum` · `charge_up` · `lock_on` (sounds 2 frames on) · `lock_on` (sounds 10 frames on) · `laser_fire` |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_reject` |
| +13 | the shot is rejected: the drone locks out | `impact_reject` · `wrong` |
| +17 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `plasma_fire` |
| +23 |  | `plasma_fire` |
| +27 |  | `plasma_fire` |
| +29 |  | `plasma_fire` |
| +32 | the strike is on the fighter: the shield is seen to go (the shell flares, the band's edge flashes red, shake, the HUD cracks); one shield left: the red frame and the engine fire start; something pops on the fighter's shell | `plasma_fire` · `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "LAST SHIELD" · loop starts: `alarm` |
| +37 | something pops on the fighter's shell | `impact_shield` |
| +41 | something pops on the fighter's shell | `impact_shield` |
| +42 | something pops on the fighter's shell | `impact_shield` |
| +45 | something pops on the fighter's shell | `impact_shield` |
| +55 |  | `demonflap` |

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
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +13 | the drone shatters and the lance goes through it into the demon's core; sparks leave for the score; the blow lands on its core (a slit of light, sparks, ring, hit-stop); a wound opens in its armour | `zip` · `combo` · `correct` · `impact_good` · `impact_big` · `boss_hurt` (sounds 3 frames on) · `boss_break` (sounds 2 frames on) |
| +41 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The wave's last right answer: the demon is done for

Frame 0: the answer is picked. While its explanation is up the demon comes apart, a piece at a time.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter turns toward the answer's drone; its rage begins; a volley leaves both cannons (bolts, muzzle flashes, recoil) | `boss_roar` · `warning` (sounds 15 frames on) · announcer: "WARNING" · `laser_fire` · music intensity 2 |
| +3 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +5 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +7 | a volley leaves both cannons (bolts, muzzle flashes, recoil) | `laser_fire` |
| +8 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +12 | a pair of bolts lands on the drone (its housing cracks, or the pair dies in a red fizzle) | `impact_metal` |
| +13 | the drone shatters and the lance goes through it into the demon's core; sparks leave for the score; the blow lands on its core (a slit of light, sparks, ring, hit-stop); a wound opens in its armour; its horn is thrown off, spinning (a small blast where it tore, 3 frames on) | `zip` · `trophy` · announcer: "Trophy unlocked" · `combo` · `correct` · `impact_good` · `impact_big` · `boss_stagger` (sounds 3 frames on) · `boss_break` (sounds 2 frames on) · `boss_break` |
| +20 |  | `explosion_small` |
| +53 | a part of it comes away in a blast | `explosion_small` |
| +54 |  | `demonflap` |
| +80 | a part of it comes away in a blast | `explosion_small` |
| +107 | a part of it comes away in a blast | `explosion_small` |
| +124 |  | `demonflap` |
| +134 | a part of it comes away in a blast | `explosion_small` |
| +190 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## The demon's death, the warp, the next demon

Frame 0: the explanation of the wave's last question is closed (the rule closes the wave here; the next question comes up 90 frames on, as it always did). The last blast, the stars and the announcer's call of the wave are all over before it.

| frame | seen | heard |
|---:|---|---|
| 0 | the wave is closed: the fighter's last burst leaves its cannons | `levelup` · `laser_fire` |
| +2 |  | `laser_fire` |
| +4 |  | `impact_big` · `slowmo_in` · `boss_death` |
| +6 |  | `laser_fire` |
| +9 |  | `impact_big` |
| +15 |  | `impact_big` |
| +25 | the last blast | music intensity 3 · `explosion_huge` · `debris` (sounds 18 frames on) |
| +32 | stars leave for the score; coins leave for the score | `reward` |
| +33 | the warp starts | `warp` |
| +53 |  | announcer: "WAVE 2" |
| +83 | the next demon starts to fly in |  |
| +125 |  | `demonflap` |
| +161 |  | announcer: "NEW HIGH SCORE" |
| +165 | it throws its wings wide and roars | `boss_roar` |
| +213 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## Time runs out on the last shield

Frame 0: 45 frames of the clock are left. The demon starts to wind up when 37 are left and lets go a moment before the clock runs out, so that its strike is on the fighter as it does.

| frame | seen | heard |
|---:|---|---|
| +7 | the demon starts to wind up (claw swipe): its glow gathers, the marker appears on the fighter | loop starts: `charge_hum` · `charge_up` · `warning` |
| +40 | it lets the strike go (the markers close, a beat of slow motion) | loop stops: `charge_hum` · `whoosh` |
| +45 | time is up | `shatter` · music intensity 0 |
| +46 | the strike is on the fighter: the shield is seen to go (the shell flares, the band's edge flashes red, shake, the HUD cracks); no shield left: the red frame holds | `player_hit` · `shield_down` (sounds 5 frames on) · announcer: "CRITICAL" · loop stops: `alarm` · `slam` |
| +71 |  | `demonflap` |

Loops running at the end of it: `engine_ship`.

## Game over

Frame 0: the explanation is closed with no shield left. The blast, the announcer, the demon's roar and the jingle come one after another, each with its picture.

| frame | seen | heard |
|---:|---|---|
| 0 | the fighter blows up; low health ends | music stops · loop stops: `engine_ship` · `explosion_big` |
| +21 |  | announcer: "GAME OVER" |
| +25 |  | `explosion_small` |
| +45 |  | `boss_roar` |
| +72 |  | `gameover` |
| +96 |  | `trophy` · announcer: "Trophy unlocked" · `levelup` |

Loops running at the end of it: none.

