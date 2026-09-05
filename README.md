# Hollis &amp; Vane

A storefront for a classy vintage clothing brand — a curated archive where every
garment is one of one.

Static HTML, CSS and vanilla JavaScript. No framework, no bundler, no runtime
dependencies, and **no third-party requests at all**: fonts are self-hosted and
every photograph is a generated SVG committed to the repo. Drop the repository
on any static host and it works.

## Run it

```bash
npm run dev      # build, then serve at http://localhost:4173
```

Or open `index.html` directly — the site needs no server, though `product.html`
reads a `?id=` query string so a server is more convenient.

## FPF Arcade (`tvm-arcade.html`)

A separate, self-contained page that lives in this repo: a 90s-arcade study game
built from the FPF study notes. Seven chapters share one cabinet.

Open `tvm-arcade.html` directly, or visit `/tvm-arcade.html` on the deployed site.

**On a phone it installs as an app.** Served over https, open it in Safari and
tap Share -> Add to Home Screen: `arcade.webmanifest` and the apple-touch-icon
give it a real icon and a full-screen launch with no browser chrome, and `sw.js`
caches the page so it plays with no signal at all. Layout, touch targets and the
safe-area insets are tuned for a modern iPhone; the calculator becomes a bottom
sheet that leaves the question readable above it. Opened straight off disk the
service worker is skipped and everything else still works.

`node scripts/build-arcade-artifact.js` emits an Artifact-hosted copy (the same
game with our `<head>` wrapper stripped).

| Chapter | Stages | Covers |
|---|---|---|
| **CH.1 — The Human Interface** | 4 + gauntlet | the communication process, non-verbal communication, perceptions, effective communication skills |
| **CH.2 — Know Your Client** | 6 + gauntlet | personal and socio-cultural variables, the decision-making process, the elderly, grieving and incapacitated client |
| **CH.3 — Market Forces** | 5 + gauntlet | demand and supply, equilibrium, market failure, GDP, business cycles, inflation, the labour market, monetary and fiscal policy |
| **CH.4 — The Planner's Path** | 4 + gauntlet | what a sound plan is, the six steps, goal-setting, the financial profile, analysis, recommendations, implementation and review |
| **M2 CH.1 — Time Value Raiders** | 5 + gauntlet | single sums, annuities, effective rates, loans, mortgages, bonds, retirement |
| **M2 CH.2 — The Paper Trail** | 5 + gauntlet | the net worth statement, registered plans and the pension adjustment, cash flow, projections, and the six financial ratios |
| **M3 CH.1 — The Debt Engine** | 8 + gauntlet | consumer credit, GDS and TDS, the five Cs, bankruptcy, borrowing to invest, automobile financing, mortgages, home affordability, RESPs and education funding |

- **1,193 drills and 43 bosses.** Each boss is a full case from the notes, broken
  into its steps: Ms. Varner's mutual fund, the Tuccis, Moore vs Petford,
  Robert Carson's two meetings, Mrs. Carpenter's grief, Mrs. Stone's Alzheimer's,
  the orange market's equilibrium, the policy desk, the goal setter, the full
  file, the pension adjuster, the Belangers' balance sheet and ratios, Sharon's
  college fund, Bill Brown's mortgage, Walter's retirement, the Lamberts' debt
  service ratios, Ken Swerski's leverage, Jacques Tellier's lease, Ismail
  Habibi's mortgage, the MacDonalds' house hunt, the DeJaeger children's
  education fund, and seven gauntlets.
- **Multiple-choice, true/false, numeric-entry and put-the-steps-in-order drills.**
  Every numeric answer key is the notes' own figure.
- **Miss a question and the game teaches the rule**, then re-queues that question
  at the end of the wave, so you don't leave a stage still getting it wrong.
- **An onboard EL-738-style TVM calculator** (n, i, PV, PMT, FV, COMP, BGN/END,
  →EFF, →APR, AMRT) that reproduces the textbook keystroke examples exactly —
  including Bill Brown's $509.67 payment and the $43,018.13 / $87.24 / $422.43
  amortization split. It appears only in the chapter that needs it.
- **Free play, drill-weak-spots, a cram sheet and per-topic mastery tracking**,
  all scoped per chapter. Scores and progress are stored in `localStorage`, on
  that browser only.

Like the storefront it makes **no third-party requests** — the two arcade fonts
(Press Start 2P and VT323, both SIL Open Font License 1.1) are embedded in the file.

## Layout

```
index.html  shop.html  product.html          ← built output (committed)
about.html  journal.html  contact.html
src/
  pages/      one file per page, with JSON front-matter
  partials/   layout, header, footer, cart drawer, newsletter block
assets/
  css/style.css     design tokens → primitives → components → pages → responsive
  css/fonts.css     generated @font-face rules for the self-hosted subsets
  js/products.js    the catalogue: one record per garment
  js/app.js         cart, filtering, product detail, nav, forms
  img/              generated SVG artwork (54 files)
  fonts/            woff2 subsets, latin + latin-ext
scripts/
  build.js          assembles src/ into the root HTML files
  generate-art.py   draws every garment illustration and editorial plate
  fetch-fonts.sh    re-downloads the font subsets (rarely needed)
  serve.js          zero-dependency dev server
```

## Editing

**Content and markup** live in `src/`. Edit a page or partial, then:

```bash
npm run build
```

The build resolves two directives — `{{> partial }}` and `{{ key }}`, where keys
come from the JSON front-matter comment at the top of each page. Nothing else.

**Products** live in `assets/js/products.js`. Add a record and it appears on the
shop page, in the filters (which derive their options and counts from the data),
and at `product.html?id=<id>`. A new product needs three images named
`<id>-1.svg`, `<id>-2.svg` and `<id>-3.svg` — add an entry to the `PRODUCTS`
list in `scripts/generate-art.py` and run `npm run art`.

**Design** is driven by the custom properties at the top of `assets/css/style.css`.
Changing `--oxblood`, `--brass` or the type scale restyles the whole site.

## What works

- Cart with quantity control, persisted to `localStorage` and synchronised
  across tabs; the one-of-one stock rule is enforced on every path.
- Shop filtering by category, era and size, plus sorting. Filter state is
  reflected in the URL, so a filtered view is linkable and survives a reload.
- Product pages rendered from the catalogue: gallery, size selector, related
  pieces, and accordions for the story, fabric, measurements and shipping.
- Responsive from 320px up, verified with no horizontal overflow at any width.
- Keyboard accessible: skip link, focus trapping in the cart drawer, `Escape`
  to close, `aria-pressed`/`aria-expanded` state on every control.
- Honours `prefers-reduced-motion`, and prints cleanly.

## Notes

The checkout button is deliberately inert — it raises a notice rather than
pretending to take payment. Wiring it to a real payment provider is the one
piece of server-side work this project does not include. The contact and
newsletter forms validate and give feedback but do not post anywhere.

Fonts are Cormorant Garamond and Jost, both SIL Open Font License 1.1.
