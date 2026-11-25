# Phase 6: audio, the audit (2026-11-25)

Every recording the game plays, measured from the files as the page plays them (decoded, the click a quarter of a second
in found as `Sound._clickAt` finds it, each cue's window cut where `audio.json` puts it), and the sound code read
(`src/js/02-sound.js`, the games' calls, Setup). The scripts are in the session's scratchpad (`phase6/`); the numbers
below are theirs. The gate's own check (`tools/audio-check.js`) renders the page's sound offline in the browser.

## What is already right

- **Loudness across screens:** every music track sits at one loudness in the mix (-21.5 LUFS, within 0.1 LU: Phase 5's
  `audio-levels.py --mix`), each set of effects with its main events some 7 dB over the music, the announcer clear
  over both. The limiter on the way out never has to clip (the loudest moment measured reaches it at -0.5 dBFS).
- **No hiss or static:** the silence between the effects in every file is digital silence (median -180 dBFS, the
  loudest gap far under hearing); the hiss found in 2026-11-17 (the hall's noise loop) is gone.
- **Varied effects:** every cue has two to six takes, played in turn, each a touch different in pitch (3%) and level
  (12%); the takes of a cue are levelled to one another at build.
- **The music's loops are cut on the beat** (a whole number of bars, the last two beats folded over the first), and
  measured across their seams over 8 s either side they run on at one level: no restart is heard in the level.
- **Sync, by construction:** every effect is called on the frame of what it sounds (the burst, each bolt's launch and
  its landing, the lance, each blast of a boss's death, the reward), and a delayed one is timed to its picture (Boss
  Rush's death and Starfall, frame by frame: `wizard-sync.txt`, below).
- **The volume controls:** each layer's level changes over 50 ms (no step), OFF stops the music with a fade, the mute
  button stops every loop; the announcer ducks the music under its line.

## Faults, worst first

| # | fault | measured | where | fix |
|---|---|---|---|---|
| 1 | **The looping effects click every time round**, and dip: the recordings do not run on from their end into their start, and each fades in and out a little (the generator's) | the join's spike against the sound around it (its 99.9th percentile; under 1 is not heard): the charge hum 63, 59 and 13 (its three takes), the fighter's engine 26, 18 and 20, the boost flames 3, 31 and 7, the alarm 8.5 (one take), the rig's engine 1.6 and 2.9; a dip of 5 to 7 dB over 0.3 s at each join | `Sound.loop` (02-sound.js) plays a take between its ends | the page makes each loop's join when its file is decoded: the soft head and tail left out (0.2 to 0.3 s), the last 0.15 s faded out under the first fading in (equal power), the loop that much shorter; the alarm only 10 ms, so its beat keeps its time; the hall's hum (clean) as it is. The sound test the same |
| 2 | **Announcer lines start late**: each begins with a faint blip (-31 to -38 dB under the line) and its echoes 55 and 110 ms on, then silence until the words | heard 0.44 s late: FINAL BOSS DESTROYED, WAVE 3, a boss's GAME OVER (Charlie's); 0.2 s: WELCOME; 80 to 130 ms: EXAM PASSED, DECK CLEARED, INFLATION TITAN, PERILMONGER | `audio.json` (the voice sprite's cues) | each line starts 20 ms before its words; every take fades in over 4 ms in the page, so a start inside a breath cannot click |
| 3 | **Starfall's crash comes after its column of light**: two of its three takes rise, fall silent and then crash, 1.0 s and 0.65 s into the take; the take is played 0.2 s after the finishing blow and the light falls 0.43 s after it (the death's slow motion) | the crash 0.77 s and 0.42 s after the light (the third take swells to its height with it) | `audio.json` (`wiz_finisher`), `Wizard.finisher` | each take starts at its crash (the swell's at its height) and the sound is played in the callback that drops the column, so the two land together in any slow motion or none (calm and reduced motion have none); their rise is dropped (the wand's charge, played at the blow, is the build) |
| 4 | **Takes stopped while still sounding (cuts)**: the generator ended them mid-sound, and the build's 30 ms fade is all that ends them | the wrong-answer sting's second take at -2 dB to its last 30 ms, the right-answer sting's third at -4 to -8 dB, the Probate Tollgate's roar's first at -1 dB, the spent cells' first at -3 to -16 dB | `Sound._cue` | a take still sounding as the build's fade begins (the loudest 20 ms of the 40 ms before it within 12 dB of the take's loudest) is let go over its last quarter, at most 0.15 s; one that ends in its own decay is played as it is (a release on every take was weighed and dropped: many effects peak in their last 0.2 s, a charge's climax, a beep) |
| 5 | **The music's loop points are rounded to 0.1 ms** (4.4 samples): each seam skips or repeats up to 3 samples | the seam's spike: the title 4.8, the exam's second track 2.1, the final boss's second 1.8, the calm 1.05; the others under 1 | `audio.json` (written by `audio-build.js` to 4 decimals); `Sound.play` | the exact loop points (each file holds a copy of its loop's start after its end: the end where that copy lines up), 6 decimals, and the build writes 6 from now on. With them, in Chromium at 48 kHz, the title's two tracks still stood at 1.5 and 1.4: the two copies of the loop's start, coded apart, differ by the codec's noise, which a soft pad does not hide. So the loop is played pass after pass, each running 30 ms on into the copy while the next comes in |
| 6 | **An iPhone can stay silent after an interruption** (a call, another app): Safari leaves the sound "interrupted", and a tap resumes it only from "suspended" | read | `Sound.resume` | resumed from any state but running and closed |
| 7 | **A hidden tab keeps sounding while the game stands still**: the music, an engine or the alarm droning on; the synth's music (with no recording) garbles as a background tab's timers slow to one a second | read | (nothing listens) | the sound is suspended while the page is hidden and resumed when it is shown |
| 8 | **Setup's effects OFF leaves a loop that is running playing** (the hall's hum, up to 14 s) | read | Setup (`32-stats.js`) | the loops stopped, as the mute button does |

## Weighed and kept

- **The music's level at its seams:** `audio-levels.py`'s "tail/head step" (up to 8.3 dB) compares the last half second
  with the first, which catches a downbeat; over 8 s either side the level runs on (`mseam.py`).
- **The two loudest hits' files peak at full scale** (`impact_good`, `impact_big`): decoded to floating point and played
  at about a third of it, they never clip; the limiter holds the sum.
- **Boss Rush's death and Starfall's third take:** each sound on the frame of its blast; the swell reaches its height
  as the light falls. The wizard's bolts, sputter, lance and ward: on their frames.
- **Two effects heard 50 and 60 ms into their take** (Starfall's first take, the Inflation Titan's roar): a rise, not a
  silence.

## Gate (as written)

The sound test page passes; no clicks or cuts. Here: `tools/audio-check.js` renders, in the browser's own decoder
and the page's own code, every loop twice round and every take, and finds no join, start or end that clicks or cuts;
the sound test page plays every take with the same join and the same fades; the harness (the rules IDENTICAL, content
and scripts untouched, budgets kept); an independent review.
