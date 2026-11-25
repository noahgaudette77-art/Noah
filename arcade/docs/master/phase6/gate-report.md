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

(to come)

**Spend: nothing.**
