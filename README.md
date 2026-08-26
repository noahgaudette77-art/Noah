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

## Also in this repository

`app/` holds **Meridian**, a personal intelligence platform — primary-source
market and policy data, an authored causal model of the world, and a learning
system built on top of both. It is entirely separate from the storefront and
shares only the dev server.

```bash
node scripts/serve.js        # → http://localhost:4173/app/index.html
npm run intel                # fetch real data into data/
```

See [`app/README.md`](app/README.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
