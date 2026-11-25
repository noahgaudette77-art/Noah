# Phase 6: the gate (2026-11-25)

The gate as written: the sound test page passes; no clicks or cuts. Plus, as every phase: the harness and an
independent review.

## No clicks or cuts (`tools/audio-check.js`)

Every recording played through the page's own sound code into an offline context at 48 kHz (a phone's and a Mac's
rate), decoded by Chromium itself, tapped dry: every take of every looping effect twice round, every one of the 369
takes of every effect and announcer line once, every music track through two seams as `Sound.play` plays a visit (the render paused after the first, as a running
page would, so the pass set going when a pass ends is checked too, and the music must still be playing after the second).

| | the build before this phase (`index.html` at `a3546f7`) | after (`index.html` built from `ea51c89`) |
|---|---|---|
| loops: a join that clicks (its spike 1 or more) or dips 5 dB | 12 of 18 takes: the charge hum 59, 52, 11; the fighter's engine 28, 23, 26 (one dipping 7.2 dB); the boost flames 3.9, 31, 7.6; the alarm's first 17; the rig's engine 1.8, 3.3 | none: every join 0.04 to 0.51, no dip over 4.3 dB |
| takes: a start on a step (its first 0.25 ms) | 4 (two slams, two slow-motion swells) | none |
| takes: cut off while still sounding | 15 (stings, roars, a heart lost, a beam, the spent cells, charges, beeps) | none (21 let go over their last stretch) |
| music: a seam that stands out and is not buried 40 dB under the music | 3: the title 2.6, its second track 1.2, the exam's second 1.1 (the first seam) | none: every seam 0.02 to 0.44 through two seams, the title's 0.26 (49 dB under the music); every track still playing after the second |

The reports: `audio-check-before.md`, `audio-check.md`.

## The sound test page (`tools/sound-test-check.js`)

`sound-test.html` plays every take with the game's join and ends (`JOIN`, `release`: the same tables and rules as
`Sound.LOOP_JOIN` and `Sound._release`), its music pass after pass as `Sound._pass` does, and its own starts and stops
fade (a stop was a cut before). The new check loads the page afresh for every loop, track and take on it, taps its
button with the page's AudioContext an offline one, and measures what the page itself plays; then taps all of its 408
buttons in real time on one page.

**It found a fault of this phase's:** since `aea4a94` the page's music set its first pass's buffer a second time (the
browser refuses: the music never started), and the hall's hum, a loop with no join, went down the music's path.
Fixed in `6af1a04` (live within minutes of being found). Then: every loop twice round, every track through its seam
(the same numbers as the game's: the title's 0.26, 49 dB under the music), every take (the largest spike at a start
0.18, the loudest end 17.7 dB under its take's loudest), and every button tapped: no fault (`sound-test-check.md`).

## Sync

- **Starfall** (`scratchpad/phase6/sync/wizard-sync.js`, frame by frame on the capture's clock): before, its sound
  called on the finishing blow's frame with a 12-frame delay and its crash 0.42 to 0.77 s after the column of light
  (frame 26); after, called on frame 26 with the column, each take starting at its crash.
- **The announcer:** fourteen lines start 20 ms before their words (they began 50 to 419 ms early).
- **The wizard's bolts, sputter, lance and ward, Boss Rush's death:** each sound on its frame, as before.

## No hiss or static

`tools/noise-floor.py` over every track and loop: no floor flagged (spectral flatness above 4 kHz 0.15 at most,
against 0.3 for a hiss). The silence between the effects in every file is digital silence (audit).

## The harness

(to come)

## The independent review

An independent reviewer read the pass's code (`634b47f^..ea51c89`) and ran it, not told what to find. Nothing broke
the rules, the content, a screen or the page from disk. Its findings, worst first, and what was done:

| # | finding | done |
|---|---|---|
| 1 | The sound test page played no music and not the hall's hum: its music's first pass set the sound's buffer twice (the browser refuses), and the hum (a loop with no join) went down the music's path, past its low-pass | found by `sound-test-check.js` the same hour and fixed (`6af1a04`): music is marked as music, the hum plays as a loop through its low-pass |
| 2 | With the sound suspended behind a hidden page, timers (the hall's blips, a dialogue's typed letters, the results' effects) went on playing at its frozen clock: all at once when the page came back (20 blips after 25 s: 20 dB over one) | the sound is no longer suspended: its master is faded out while the page is hidden and back in when it is shown, and runs on unheard (`1070ccd`). In Chromium from disk: silent while hidden, the hall at its own level when shown (0.029 against 0.025 before), no burst; the sound running throughout; no line spoken while hidden |
| 3 | A hide and a show close together raced the suspend and the resume (the sound left running behind a hidden page in Chromium; silent after it came back in WebKit until a tap) | gone with the suspend (`1070ccd`): a fade a gain is set at once |
| 4 | The alarm's 10 ms crossfade made its loop 2.24 s; Risk Blaster's and Nest Egg Run's red frame pulse on a 1.125 s grid on the sound's own clock: the beat drifted a quarter of a second from the frame in a minute | the alarm keeps its length: its end fades out and its start in over 4 ms (`aad20d5`); its first take's seam 12.9 to 0.35 in Chromium, no dip; 2.25 s a loop |
| 5 | The release began before the loudest moment of four takes the generator stopped on their height (a heart lost's third played 19 dB down at its peak; a beam's and the Fine Print's roar 17 dB; a charge 5 dB) | a take is never let go before its loudest 20 ms has passed (`ee1f956`): three end on their height (a heart lost's third, the beam's first, the Fine Print's roar's first: let go just after it, listed by the checks), the charge keeps its peak |
| 6 | The announcer's and Starfall's new starts were hand edits in `audio.json`: a rebuild would have undone them | `audio-build.js` makes the same cuts (`ef48d14`); the wizard's set rebuilt from its raw takes in a scratch copy: Starfall's takes the same length as the windows (to 0.1 ms), their sound the same within the codec's noise, their levels within 0.2 dB |
| 7 | The check: a take's start judged over 12 samples (no start can fail with a 2 ms fade-in); the music through one seam only (the passes set from `onended` untested); the end check passes a released take by construction | the music through two seams with the render paused between, the third pass checked to come in (`6da337d`); the start check stands guard over the fade-in (it found four on the build before), its words corrected; a take ending on its height listed, not failed (`1140d09`). The ends' sound is for ears: the device test |
| 8 | Firefox: `_release` read the sprite's whole channel on a take's first play, which Firefox copies whole once the sprite has played (23 to 27 MB a take) | it reads a copy of the take alone (`copyFromChannel`, `ee1f956`) |

What it checked and found sound: the content and the scripts untouched since `ee413e3`, no `GFX.hitStop` added, no
study, scoring or boss health code touched; the built page the build of its sources; the page from disk loads and
plays the synth; the music's passes in real time (always two, spaced exactly; `stopMusic` sets no new pass and the
waiting one never starts; `refreshMusic` twice and a suspend and resume behave; a late recording restarts; the
music's levels and routing unchanged); the joins exact to the sample, equal power, made once and before anything
plays; the takes' envelope on a gain of its own (`hush` unaffected; a delayed line, a playback rate); `resume` from
Safari's "interrupted"; the data edits (every window inside its old one and the sprite; no alias split; no other cue
moved; no file changed; the loop lengths whole samples); the announcer's lines starting 5 to 20 ms before their
words, 50 to 79 dB under the line; Starfall on the show's clock; Setup's effects OFF.

The review's fixes, measured on the build with them (`index.html` from `ef48d14`): `tools/audio-check.js` passes
(the alarm's joins 0.35, 0.02, 0.01; 369 takes: no spike at a start, none cut off, 3 ending on their height, 21 let
go; every music seam 0.02 to 0.44 through two seams).

**Spend: nothing.**
