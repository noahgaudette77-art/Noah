# The title hall's stutter on the owner's iPhone (Phase 8, 2026-11-26)

The owner's report, as given: "I have lots of stutter in the first screen, where we see all the prisoners before
entering the arcade, from begining to end it stutters a lot". Asked: the iPhone in Safari; every time, after a reload
too (the files in hand); the FPS counter (`#fps`) during the glide: under 55 frames a second, more than five hitches in
ten seconds, and its third line **FIXED (SETUP)**: Setup's Graphics held at a fixed tier on that phone (the owner was not
sure which, nor that it had been set; the site's settings do not travel between devices: that happens only inside
claude.ai).

## What that meant

- **Nothing eased it.** At a fixed tier the frame-rate governor did nothing at all (`GFX.perfTick` returned at once when
  not AUTO): a phone drawing the hall under 55 frames a second stayed there, at 2x, for the whole glide.
- **Frosted glass over the live picture at HIGH.** A phone at Setup's HIGH draws the MAC tier, and the MAC tier kept the
  frosted panels (`backdrop-filter`) over the picture that the lite page (`body.lite`, every tier below MAC) drops: each
  makes the browser blur what is behind it again on every frame the picture changes.
- **Not the files.** Every time, after a reload too, and the hall's own pieces all in within the first fifteen seconds
  of the glide (`tools/glide-frames.js`: the glide's first visit in real time over a 6 MB/s connection, every frame and
  every picture sent timed; nothing sent after 14.5 s of the 34 s glide).
- **Not the hall's own script.** Its update is under a quarter of a millisecond a frame here (median), its slowest 4 ms.

## What was done

| change | what it does |
|---|---|
| a fixed tier eases its drawing size (`GFX.fixedLadder`, `perfTick`) | Setup's fixed tier keeps its effects and its lights as chosen; only its drawing size steps down while frames run late (on a high-density screen from the tier's own size to three quarters of it: 2x to 1.5x on a phone) and back up as they hold, as AUTO's first tier does; the readout names the step (`FIXED (SETUP) · SIZE STEP 3/6`). A screen of one device pixel a page pixel has one size: nothing changes there. The 30 fps hold (Low Power Mode) stays AUTO's. |
| no frosted glass on a phone or a tablet at any tier (`GFX.liteAlways`) | the lite page's opaque panels at Setup's HIGH too |
| a boss's skin made in smaller steps (`hallSkinSteps`) | a boss arriving mid-glide merged its whole body in one frame; now about 6,000 corners a frame at most. The merged bosses are the same, number for number (checked against the build before). |

The governor's own test (`tools/governor-test.js`) has the fixed case anew: a fixed SAFE at 40 ms frames steps down
through its sizes, SAFE and every light kept, and climbs back to its full size when frames hold; a phone at Setup's
HIGH has no frosted glass. Every case passes in Chromium and WebKit. The rules IDENTICAL from disk and served, the
sequence passing, content and scripts untouched.

## What this machine cannot say

It draws in software: how many frames a second the iPhone draws the hall at, and which part of it costs the phone's
graphics chip most, only the phone shows. In software the HIGH tier's own effects cost the hall's frame some 8% more
than the PHONE tier's (most of it the ambient shade), and the drawing size at 1.5x instead of 2x some 31% less; the hall's
largest parts are its walls' and the cells' steel, the end of the hall's props and the nearest bosses. Those shares are
software's, not a phone's, so nothing of the hall's look was cut for them.

## Then: the best picture each device holds (8b)

The owner's next word: "It's okay just get it done please max graphics possible best immersion, no more questions. Good
FPS". A first answer let a phone's AUTO climb from PHONE to MAC when frames had room to spare; the independent review
showed it could never climb on a 60 Hz screen (the owner's iPhone in Safari): a frame's time here is the gap between the
screen's refreshes, never under 16.7 ms at 60 Hz, so "room to spare" (the slowest tenth under 13.3 ms) cannot be seen;
where it could (a faster screen, an iPad) it brought the computer's tier, its 4x smoothing, floor mirror and sharper
files, and left too loosely. It was taken out before it was shipped. A real measure of spare time on the graphics chip
(a fence after the frame's drawing, polled) would be the way to do it; not now.

What stands: **AUTO** finds the best picture a device holds at a steady frame rate (a phone starts at PHONE, a computer
at MAC, each stepping down only as far as it must, and back up when it can); **a Graphics setting fixed before today goes
back to AUTO once** (`qv`: the owner's iPhone with it; a copy synced from another device is brought along the same way,
`mergeStates`); **a fixed tier eases its drawing size** when frames run late (8a), but not while the device itself
holds the frame rate (Low Power Mode: at first 30 only; since 8e any rate, 24 on the owner's iPhone, held at the
sharpest step that holds it: the Phase 8 README); choosing a tier in Setup starts the governor's clock afresh. For the most the phone can draw, Setup's MAC is there, its size easing to keep frames smooth.

## For the owner

- Nothing to set: Graphics is AUTO again on the next visit (once). For the Mac's effects on the phone, Setup's MAC
  (its size eases to keep frames smooth).
- Then `https://noah-2ci.pages.dev/#fps` again (the tab closed first, so the glide plays): the first line's FPS and
  HITCHES during the glide, and its second line (the tier and the size).
