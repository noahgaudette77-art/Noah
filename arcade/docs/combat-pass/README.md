# Combat and impact effects pass: how it is built

Risk Blaster, Boss Rush and Nest Egg Run share one way of showing a shot, a blow and a blast. This page is the
contract every part of that work follows. `arcade/PROGRESS.md` (thirteenth pass) has the wider picture.

## 1. What must never change

- **The rules.** Study logic, questions, answers, scoring, timers, spaced repetition, progression, saved progress
  and every word of question, answer and explanation text stay exactly as they are.
- **When a rule fires.** The regression test (`node scripts/arcade-regression.js --compare
  arcade/backup/regression-baseline.json`, add `--only blaster|boss|racer` for one game) plays each game on a
  virtual clock and compares every HP, heart, score and **frame number** with a baseline. It must print
  `IDENTICAL`. That means:
  - `this.state`, `this.tw.wait(...)`/`this.tw.add(...)` calls whose callbacks move the game on (show the
    feedback sheet, ask the next question, show results), the picker, `this.run`, HP, hearts, shields, score and
    `Store` are off limits. Do not add, remove, reorder or re-time them.
  - `GFX.hitStop(ms)` slows the scene's own clock, rules included. The calls that exist stay exactly as they are.
    **Never add a new one.** Use the show clock instead (below).
  - New visuals may use `Math.random` freely (the test seeds question picking separately).
- **Legibility.** Nothing may cover or dim the question, the answers or the explanation sheet. The 3D view is the
  band between them; DOM effects stay off the text.
- **Photosensitivity.** Nothing flashes more than three times a second. Everything scales down under
  `REDUCED_MOTION || GFX.calm` (the kit's screen helpers already do).
- **Originality.** No copyrighted characters, logos, sounds or lookalikes.
- Only files under `arcade/` change. Do not commit `arcade/index.html` from a worktree (it is rebuilt after merging).

## 2. The show clock

Everything that is look and not rule runs on `VFX`, which the rules never read:

```js
VFX.dt                    // this frame's show time step (0 during a hit-stop, small in slow motion)
VFX.hitStop(frames)       // freeze the show for 2-3 frames on a big impact
VFX.slowMo(k, dur, hold)  // drop to k of full speed, hold, ease back over dur seconds
```

In a scene's `update(dt)`: rules use `dt` as before; effects, model animation and anything new use `VFX.dt`.
Give the scene a second tween set for show-only timing and update it with the show clock:

```js
this.show = new TweenSet();           // constructor
this.show.update(VFX.dt);             // update(), after the paused check
this.show.wait(0.35, () => { ... });  // a visual beat; never put a rule in here
```

To re-time what is *seen* without moving a rule: leave the rule's `this.tw.wait` where it is and move only the
visual calls (flash, shake, particles, HUD effects) onto `this.show` at the moment they should be seen. A HUD write
that only displays a value already decided (the hearts row after a hit) may be delayed the same way.

## 3. The kit

`CombatFX` (`src/js/08c-combatfx.js`, its header lists every call) is created once per scene and pooled:

```js
this.fx = new CombatFX(this, { unit: 1, ground: 0 });   // ground: null in space
this.fx.update(VFX.dt);                                  // every frame
this.fx.drift.set(0, 0, speed);                          // if the world scrolls past the camera
```

One language in all three games:

| Event | Call | Reads as |
|---|---|---|
| The player fires | `fx.muzzle`, `fx.bolt(from, to, color, { onHit })` or `fx.beam`, `fx.shells`, `fx.light` | white core, coloured sheath, tapered tail, a flash and a light at the gun |
| A right answer lands | `fx.impact(pos, slotColor)` + `VFX.hitStop(2)` | white heart, sparks in the answer's colour, ring, bloom pulse, small shake |
| A wrong answer lands | `fx.fizzle(pos)` | dull red cross and sparks that fall, dark smoke, no ring, no bloom |
| A blow on plate or hull | `fx.hull(pos, color)` | hot sparks off the surface, a little smoke |
| A blast | `fx.explosion(pos, { size, color })` | flash, fire cooling to dark red, lingering smoke, embers, sparks, ring, light, ground mark |
| An attack is coming | `fx.mark("lock" \| "ring" \| "bang", pos, color, { dur, flat, follow })` + a wind-up glow + `Sound.sfx("charge_up")` + `VFX.slowMo(0.3, 0.25, 0.08)` at release | the player always sees it coming |
| Damage that lasts | `fx.trailer(at, { smoke, fire, sparks })` | smoke and fire trailing from the ship, vehicle or boss |

Screen and HUD (all already softened for reduced effects):

```js
GFX.hitFlash("hit" | "good" | "white")   GFX.pulse(aberration, flash)   GFX.bloomPulse(k)
GFX.ripple(camera, pos, amp, dur)        GFX.glitch(amt, dur)           this.shake(amount)
GFX.setDanger(0..1)                      // low health: a red vignette that beats, until set back to 0
HudFX.hurt(this.el, k)                   // the HUD flickers and cracks
HudFX.low(this.el, on)                   // lives beat red
HudFX.lifeLost(this.el)                  // call right after this.lives(...) has drawn the lost one
HudFX.blink(this.el, ms)                 // invulnerability blink: flicker the ship/vehicle while this.el.dataset.blink is set
HudFX.reward(this.el, {x, y}, "[data-score]", { n, kind: "star" | "coin" | "spark", color })
```

Red: a lit neon red goes pink through the tone curve. For "you were hurt" use a deep red at low gain
(`fx.beam(a, b, 0xff1030, { k: 1.5 })`), as Boss Rush's old beam did.

## 4. Sound

`Sound.sfx(name, pan, { vol, rate, delay })` plays a recording when one is loaded and the synth otherwise
(`Sound.ALIAS` maps each new name to a synth sound, so the game is never silent). Use these names for combat
events; each will have several recorded takes:

`laser_fire` `laser_heavy` `plasma_fire` `shell` · `impact_good` `impact_big` `impact_reject` `impact_hull`
`impact_shield` `impact_metal` · `explosion_small` `explosion_big` `explosion_huge` `debris` · `charge_up`
`charge_long` `warning` `lock_on` `alarm` · `beam_fire` `missile_fire` `missile_hit` `slam` `wave_fire`
`volley_fire` · `boss_roar` `boss_hurt` `boss_stagger` `boss_break` `boss_death` · `player_hit` `heart_lost`
`shield_down` · `crash` `crash_glass` `skid` `near_miss` `boost` `boost_flame` · `reward` `slowmo_in`

Loops: `Sound.loop(id, name, { vol, rate })` (returns false when there is no recording: keep the synth fallback),
`Sound.loopSet(id, { vol, rate })`, `Sound.stopLoop(id)`. Loop names: `alarm`, `engine_ship`, `engine_car`,
`boost_flame`, `charge_hum`. Stop every loop you start in `pause()`, at game over and in `dispose()`.

A sound belongs on the frame its picture appears: fire both from the same place in the code. If you need a sound
that is not listed, add it with an alias in `Sound.ALIAS` and say so in your report.

## 5. Tools

```bash
node scripts/build-arcade.js                                   # rebuild arcade/index.html
node scripts/arcade-regression.js --compare arcade/backup/regression-baseline.json [--only boss]
node scripts/arcade-sequence.js                                 # every game started back to back on one page
node arcade/tools/capture.js arcade/tools/scenarios/<name>.js --out <dir> [--dpr 2]
```

`tools/capture.js` steps the game on a virtual clock and saves stills and frame strips (see its header and
`tools/scenarios/fxkit.js`). `cap.seq(name, n, every, { band: true, cols })` keeps `n` frames `every` frames
apart, cropped to the 3D band: stills hide motion problems, so every effect is reviewed as a strip. After every
build, also parse the page's inline scripts (a syntax error in one file stops the whole page):

```bash
node -e "const h=require('fs').readFileSync('arcade/index.html','utf8');[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m,i)=>{try{new Function(m[1])}catch(e){console.log('script',i,e.message);process.exit(1)}});console.log('ok')"
```

## 6. What each game's pass delivers

- The effects themselves, wired at the right moments, with sound on the same frame.
- A capture scenario `tools/scenarios/<game>-combat.js` and its strips in `docs/combat-pass/<game>/`:
  fire, hit, miss, each enemy attack with its telegraph, taking damage, low health, breakage, death
  (Nest Egg Run: crash, wrong lane, near miss, boost).
- Regression `IDENTICAL`, sequence test passing, no console errors.
