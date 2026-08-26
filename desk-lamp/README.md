# Desk Lamp

A study timer that behaves like a lamp on your desk. It glows warm amber while
you work and cools to blue when you break, and the time left is a ring rather
than a number you have to squint at. Full-screen focus mode takes everything
else away.

Static HTML, CSS and vanilla JavaScript. No framework, no bundler, no runtime
dependencies, and no network requests of any kind: the typeface is the Jost
subset already committed to this repository, the artwork is inline SVG, and the
chime is synthesised in the browser.

## Run it

```bash
npm run serve      # then open http://localhost:4173/desk-lamp/
```

Or open `desk-lamp/index.html` directly — nothing here needs a server.

## The idea

**One number drives the palette.** `--warmth` is 1 during a study block and 0
during a break. Every colour in the sheet — the ring, the room, the text, the
pool of light on the wall behind it — is mixed from it in oklab, which takes
the crossfade through a near-neutral white the way a real bulb does rather than
through green. Changing modes is one transition, not a theme swap.

**A second number is the dimmer.** `--lumen` is 1 while a block runs, 0.45
before you start and 0.26 when you pause, and it reaches the ring itself, not
only the glow. A paused timer reads as paused from across the desk. In the last
minute of a block the lamp leans slightly brighter, so you feel the end coming
without looking at the clock.

**The ring is the reading.** The lit arc is the time remaining. It burns down
from twelve o'clock, and the bright filament at its leading edge travels
clockwise like a hand — that is the part you take in without thinking. Faint
quarter marks give you *about half left* at a glance. The numerals are there to
confirm, not to be read.

**The clock is a deadline, not a countdown.** While a block runs, the only
thing stored is the timestamp it ends at. Everything on screen is derived from
that, so the display is right after a throttled background tab, a locked phone
or a reload — and any block that finished while you were away is rolled
forward when you come back.

## Layout

```
index.html   markup: the bar, the dial, the controls, the settings panel
lamp.css     tokens → reset → room → dial → controls → panel → focus → responsive
lamp.js      one IIFE: the clock, rendering, the chime, focus mode, persistence
icon.svg     favicon
```

`lamp.css` reads its typeface from `../assets/css/fonts.css`, which the
storefront in this repository already ships. Unused faces in that file are
never downloaded, so sharing it costs nothing.

## Controls

| | |
|---|---|
| `space` | start or pause |
| `f` | focus mode |
| `r` | reset the block — press again on a full block to restart the cycle |
| `s` | skip to the next block |
| `,` | settings |
| `esc` | leave focus mode, or close settings |

Settings cover the three lengths, how many rounds precede a long break,
auto-starting the next block, the chime, holding a screen wake lock, and
turning the glow down. They persist, along with the running block and whatever
you typed in the task field.

## What works

- Timing that survives background throttling, sleep and reload, and catches up
  on every deadline it missed.
- Focus mode: full screen where the browser allows it, and a stripped-back
  view where it does not. The bar and controls fade after two and a half
  seconds of stillness and return the moment you move.
- Every tab in the same browser is the same desk — starting a block in one
  starts it in the others.
- A chime built from two sine tones a fifth apart, rising back into work and
  falling into a break.
- Keyboard throughout, a focus trap in the settings panel, a polite live region
  for block changes, and shortcuts that never fire while you are typing.
- All text measures at least 4.5:1 against what is actually rendered behind it,
  and every control boundary at least 3:1, in both the warm and the cool state.
- Honours `prefers-reduced-motion` and `prefers-contrast`.
- Degrades cleanly: without `@property` the colours snap instead of crossfading,
  without `color-mix()` a flat two-tone palette takes over, and with
  `localStorage` blocked everything still runs for the session.

## Notes

The spent part of the ring is deliberately dim rather than a high-contrast
track. The point of the design is that the light burns down; a bright track
would leave the ring looking full at a glance when it is nearly empty.

The screen wake lock is best-effort — browsers may refuse it, and it is
released whenever the tab is hidden or the timer is not running.
