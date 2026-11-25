# Phase 6: audio (2026-11-25)

Run seventh, by the owner's order of 2026-11-24 (0, 1, 5, 3, 2, 4, 6, 7, a performance re-check, 8). The plan
(`MASTER_PLAN.md`, Phase 6): loudness matched across screens, no hiss or static, varied effects, tight sync, fitting
music, the volume controls; ElevenLabs within budget. The gate: the sound test page passes; no clicks or cuts.

**The audit: `audit.md`.** The mix, the levels, the hiss and the variety were already right (Phase 5 matched every
track's loudness; the hiss went in 2026-11-17); the faults were at the edges of the sounds: where a loop comes round,
where a take starts and stops, where a line meets its banner. **The gate: `gate-report.md`.** **Spend: nothing** (no
provider called; no file re-encoded: the recordings are the same files, the fixes are in how the page plays them and
in where `audio.json` cuts them).

`tools/audio-check.js` (new) plays every loop, take and track through the page's own sound code into an offline
context at 48 kHz, decoded by the browser itself, and measures each join, start, end and seam: on the build before
this phase 34 failed (`audio-check-before.md`), on the build after, none (`audio-check.md`).

## What changed in the game

| commit | change | measured (Chromium, 48 kHz) |
|---|---|---|
| `c0a1a72` | **The looping effects joined** (the fighter's and the rig's engines, the boost flames, the charge hum, the alarm): their recordings do not run on from their end into their start, and swell in and fade out a little. When a sprite is decoded, each loop take's soft head and tail are left out and its last 0.15 s fades out under its first fading in (the hall's hum, clean, as it is): `Sound.LOOP_JOIN`, `Sound._join`. The alarm keeps its length (`aad20d5`, the review: its two beats a loop are the red frame's pulse, counted on the sound's clock): its end fades out and its start in over 4 ms | the join's spike against the sound around it (under 1 is not heard): the charge hum 59, 52, 11 to 0.21, 0.36, 0.51; the fighter's engine 28, 23, 26 to 0.32, 0.25, 0.49; the boost flames 3.9, 31, 7.6 to 0.14, 0.13, 0.22; the alarm 17 to 0.35, at 2.25 s a loop; no dip over 4.3 dB (was 7.2) |
| `0889340`, `1d2353d`, `ee1f956` | **Every take's ends:** a take comes in over 2 ms (so one started inside a sound cannot click), and one the generator stopped while it was still sounding is let go over its last quarter, at most 0.15 s, and never before its loudest moment (the review), instead of being cut by the build's 30 ms fade (`Sound._release`, measured once a take from a copy of it: the loudest 20 ms of the 40 ms before the build's fade within 12 dB of the take's loudest) | 15 takes cut off while still sounding (the wrong-answer and right-answer stings' takes, the Fine Print's and the Probate Tollgate's roars, a heart lost, a beam, the spent cells, charges, beeps) and 4 starting on a step (two slams, two slow-motion swells) to none; 21 of 369 takes let go, no announcer line among them; three stopped by the generator on their height keep it and are let go just after (a heart lost's third, the beam's first, the Fine Print's roar's first) |
| `6012283`, `aea4a94` | **The music's seams:** the loop points exact (`audio.json` had them to 0.1 ms: up to 3 samples skipped or repeated each time round; 6 decimals now, and the builder writes 6), and the loop played pass after pass, each running 30 ms on into the file's copy of the loop's start while the next comes in (`Sound._pass`): the two copies of the start, coded apart, differ by the codec's own noise, which the title's soft pad did not hide | the title's seam 2.6 to 0.26 (49 dB under the music), its second track's 1.2 to 0.31, the exam's second's 1.1 to 0.07; every track 0.02 to 0.44 |
| `0736bab`, `ef48d14` | **Fourteen announcer lines start at their words:** each began with a faint blip and its echoes, then silence (WAVE 3, FINAL BOSS DESTROYED, Charlie's GAME OVER 0.41 s; BOSS RUSH 0.28; WAVE 1 0.23; WELCOME 0.18; eight more 50 to 110 ms). Each starts 20 ms before its words now (its window in `audio.json`; the builder makes the same cut, so a rebuild keeps it) | the line lands with its banner |
| `806054e`, `ef48d14` | **Starfall's crash with its column of light:** its sound was played 0.2 s after the finishing blow and two of its takes crash 1.0 and 0.69 s in, so the crash came 0.77 and 0.42 s after the light. Each take starts at its crash (the swell's at its height), played in the callback that drops the column | `wiz_finisher` on frame 26 with the column (`kit.beam`), in any slow motion or none (it was called on frame 0 with a 12-frame delay) |
| `97602cf`, `1070ccd` | **The sound comes back after an iPhone's interruption** (a call, another app: Safari leaves it "interrupted", and a tap resumed only "suspended"), and **a hidden page is silent** (its game stands still while its music, an engine or the alarm droned on): its sound faded out while hidden and back in when shown, running on unheard (first suspended; the review found timers' sounds then bunched up for the page's return, and a race between a suspend and a resume) | in Chromium from disk: silent while hidden, the hall at its own level when shown, no burst; on the devices: below |
| `e11fbfd` | **Setup's effects OFF quiets the hall's hum or blips** that were running, as the mute button does | read |

The sound test page (`sound-test.html`) makes the same joins and ends and plays the music the same way, and fades its
own starts and stops (its music and the hall's hum were broken by this phase for an hour: `6af1a04`). Tools:
`tools/audio-check.js` and `tools/sound-test-check.js` (new); `tools/gen/audio-build.js` writes 6 decimals and makes
the announcer's and Starfall's cuts.

## Weighed and kept

- **A release on every take** (simpler): many effects peak in their last 0.2 s (a charge's climax, a beep, a roar's
  last breath); a fade there would soften what they are for. Only takes still sounding as the build's fade begins.
- **Rotating a title track's loop** within its file's copies to put its seam on a quieter moment: the best rotations
  (0.10) are lone points that depend on the decoder (Safari's would differ), and the median rotation is worse than the
  seam it has. The passes crossfade every seam on any decoder.
- **Rebuilding the loop sprites from the raw takes** with the join made in the files: the core set cannot be rebuilt on
  this machine (the title's soft coin's raw takes are not here), and every re-encode is a generation lost. The join is
  made in the decoded recording, before anything plays from it.
- **The music's level at its seams** (`audio-levels.py`'s "tail/head step", up to 8.3 dB): a downbeat; over 8 s either
  side the level runs on. The hiss finder's "click" column (`noise-floor.py`, against the largest step nearby) did not
  flag the loops' joins: `audio-check.js` measures the bend against the 99.9th percentile around it, which a step in a
  smooth hum cannot hide in.

## What to test on the devices

- **iPhone and Mac, Risk Blaster and Nest Egg Run:** the engines and the boost flames hum on without a tick every 3 to 4
  s; Boss Rush: the charge hum as a boss winds up, and the alarm on the last heart, steady.
- **Title:** the music comes round (about every 60 or 78 s) without a tick.
- **Announcer:** WAVE 3 in Risk Blaster and FINAL BOSS DESTROYED land with their banners.
- **Boss Rush, the finishing blow:** Starfall's crash with its column of light.
- **iPhone:** in a game, switch to another app (or take a call) and come back: the sound should be back at once, or at
  the first tap. **Mac:** switch tabs mid-game: the sound fades out; come back: it fades in, with no burst of sounds.
- **Three takes end on their height** (the generator stopped them there; they keep it and are let go just after): a
  heart lost (Boss Rush, a wrong answer), the Proctor's swept beam, the Fine Print's roar. Listen in the sound test
  (Setup > Sound test: General · heart_lost · take 3, Combat · beam_fire · take 1, Boss Rush · roar_4 · take 1); if
  one sounds cut, it can be left out of the turn (`SKIP_TAKES` in `audio-build.js`).
- **Setup:** sound test (Setup > Sound test): every loop and track plays without a tick, every take ends cleanly.
