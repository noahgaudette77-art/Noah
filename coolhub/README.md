# CoolHub™ by Vortex — concept mockup

A single-page marketing site for **CoolHub**, the urban-cooling sub-brand of Vortex
Aquatic Structures International. Built for internal stakeholder review: it is meant
to look and behave like a live customer-facing site, with one dismissible banner at
the top marking its status.

Static HTML, CSS and vanilla JavaScript. No framework, no bundler, no runtime
dependencies, and **no third-party requests** — fonts are self-hosted and every
image is a generated SVG committed to the repo, so it renders identically on an
internal network with no outbound access.

## Run it

Open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8000    # then visit /coolhub/
```

## Why one page

The site has one job: walk a reader from "CoolHub is its own category" to "I can
specify this myself." That is a single argument with a fixed order — category split,
then each category, then the shared operating model, then the evidence a particular
reader needs. Splitting it across routes would let someone arrive halfway through the
argument. Section anchors give the nav real targets without breaking the sequence.

## Layout

```
index.html                     the whole page
assets/
  css/coolhub.css              tokens → reset → type → layout → primitives → components → responsive
  css/fonts.css                generated @font-face rules for the self-hosted subsets
  js/coolhub.js                nav, reveals, parallax, tablists, spec drawings, form
  img/                         8 generated SVG scenes (168 kB total)
  fonts/                       woff2 subsets, latin + latin-ext
scripts/
  generate-scenes.py           draws every scene image
  fetch-fonts.sh               re-downloads the font subsets (rarely needed)
```

## The imagery

There is no photography. Every scene in `assets/img/` is drawn by
`scripts/generate-scenes.py` in the register of an architectural competition board:
layered silhouettes, atmospheric perspective, entourage figures for scale,
volumetric mist.

```bash
python3 scripts/generate-scenes.py
```

Drawing rather than shooting buys one thing photography could not. The three
Refreshing Play scenes — `rp-modular-panels`, `rp-circular-spraypoint`,
`rp-tiered-basins` — share a byte-identical camera, ground plane, surface and
entourage, generated from a fixed random seed. Only the module differs. So when the
module-swap component cross-fades between them, it *proves* "one platform, different
modules" rather than asserting it.

## Design system

Two families, both SIL Open Font License 1.1: **Jost** (geometric, Bauhaus lineage —
the architect's register) for display and text, **IBM Plex Mono** for spec numbers,
model codes, eyebrows and drawing callouts.

Category temperature runs through a single `[data-cat]` hook. `hw` resolves the
accent tokens cool (slate-teal, Health & Wellness); `rp` resolves them warm (clay,
Refreshing Play). One set of components serves both without duplicating a rule.

The ink scale is split so that `--ink-2/3/4` are text tiers that all clear WCAG AA,
while `--hairline` carries the pale drawing strokes. Keeping those separate is what
lets the text go dark enough to pass without heavying up the diagrams.

## What works

- **Module swap** — cross-fades the three Refreshing Play modules over one surface,
  updating the panel, the spec chips and the HUD readout.
- **Product selector** — Abrio, Glomist and Aeris, each with its own story and chips.
- **Persona switcher** — three roles, each surfacing the evidence that role needs;
  the underline animates between tabs and the panels fade rather than hard-cut.
- **Spec drawings** — plan, elevation and spray zone for all four units, redrawn from
  data at a *fixed* scale so the units compare honestly. Hovering or focusing a
  dimension lights the matching readout, and vice versa.
- **Before/after** — a draggable comparison of a park with and without CoolHub.
- **Quote form** — per-field validation, error states, and a confirmation state with a
  reference number. Nothing is transmitted.
- Ken Burns hero, drifting mist particles, scroll-linked parallax, staggered scroll
  reveals, and a scroll-progress hairline in the nav.
- Responsive from 320px up. Keyboard accessible: skip link, roving tabindex and arrow
  keys on every tablist, `Escape` to close the mobile menu, visible focus throughout.
- Honours `prefers-reduced-motion` — animation is replaced by an instant state change,
  never removed as functionality — and prints cleanly.

## Verified

31 interaction checks and a contrast sweep were run against a headless browser:
no horizontal overflow at 320–1920px, no console errors, no missing alt text or
labels, no duplicate ids, no heading-level skips, and every text element clearing
WCAG AA (4.5:1, or 3:1 where large).

## Notes for reviewers

- **All dimensions, flow rates and model codes are illustrative placeholders**, drawn
  to scale against one another and labelled as such throughout. They are not
  manufacturing data.
- The Refreshing Play system is unnamed; it appears as "Surface + Module (working
  name)".
- Downloads (DWG/RVT/IFC/PDF) are presented but not wired up.
- Direct e-commerce is shown as a roadmap item in a "coming soon" state, per brief.
  No checkout exists.
- The banner dismissal is remembered in `localStorage`.
