#!/usr/bin/env node
/**
 * Bundles the whole site into ONE self-contained HTML file.
 *
 * Every page becomes a <div data-route> in a single document, navigated by
 * hash. CSS, JavaScript, fonts and all 54 SVG illustrations are inlined, so the
 * result opens straight from the filesystem with no server and no network.
 *
 *   node scripts/build-single.js   →   hollis-and-vane.html
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES = path.join(ROOT, "src", "pages");
const PARTIALS = path.join(ROOT, "src", "partials");
const OUT = path.join(ROOT, "hollis-and-vane.html");

// Only the Latin subsets — they cover the site's copy and halve the file size.
const FONTS = [
  "cormorant-garamond-300-latin",
  "cormorant-garamond-300-italic-latin",
  "cormorant-garamond-400-latin",
  "cormorant-garamond-400-italic-latin",
  "jost-200-latin",
  "jost-300-latin",
  "jost-400-latin",
];

const read = (p) => fs.readFileSync(p, "utf8");
const partial = (name) => read(path.join(PARTIALS, `${name}.html`));

/* --- template expansion (same two directives as the multi-page build) ----- */
function expand(html, data, depth = 0) {
  if (depth > 8) throw new Error("Partial nesting too deep.");
  return html
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => expand(partial(n), data, depth + 1))
    .replace(/\{\{\s*([\w-]+)\s*\}\}/g, (m, k) =>
      Object.prototype.hasOwnProperty.call(data, k) ? String(data[k]) : ""
    );
}

/* --- assets --------------------------------------------------------------- */
function svgDataUri(file) {
  // Collapse the generator's pretty-printing, then percent-encode. For SVG this
  // is considerably smaller than base64.
  const svg = read(file).replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
  return "data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
}

function inlineFonts() {
  const css = read(path.join(ROOT, "assets", "css", "fonts.css"));
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) || [];
  const kept = [];
  for (const block of blocks) {
    const m = block.match(/url\('\.\.\/fonts\/([\w-]+)\.woff2'\)/);
    if (!m || !FONTS.includes(m[1])) continue;
    const b64 = fs.readFileSync(path.join(ROOT, "assets", "fonts", `${m[1]}.woff2`)).toString("base64");
    kept.push(block.replace(m[0], `url(data:font/woff2;base64,${b64}) format('woff2')`).replace(" format('woff2')  format('woff2')", " format('woff2')"));
  }
  if (!kept.length) throw new Error("No font faces matched — check FONTS against assets/css/fonts.css.");
  return kept.join("\n");
}

/* --- rewrite page-to-page links into hash routes -------------------------- */
const PAGE_NAMES = ["index", "shop", "product", "about", "journal", "contact"];

function toHashLinks(html) {
  return html.replace(
    /href="(index|shop|product|about|journal|contact)\.html(?:\?([^"#]*))?(?:#([^"]*))?"/g,
    (_, page, query, anchor) => {
      const parts = [];
      if (query) parts.push(query);
      if (anchor) parts.push("to=" + anchor);
      const qs = parts.join("&");
      const slug = page === "index" ? "" : page;
      return `href="#/${slug}${qs ? "?" + qs : ""}"`;
    }
  );
}

/* --- build ---------------------------------------------------------------- */
function build() {
  const routes = [];
  let siteDescription = "";

  for (const name of PAGE_NAMES) {
    const raw = read(path.join(PAGES, `${name}.html`));
    const fm = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
    const data = fm ? JSON.parse(fm[1]) : {};
    const body = fm ? raw.slice(fm[0].length) : raw;

    for (const key of PAGE_NAMES) data[`nav_${key}`] = "";
    const content = toHashLinks(expand(body, data));
    if (name === "index") siteDescription = data.description || "";

    routes.push(
      `<div data-route="${name}" data-title="${(data.title || "Hollis & Vane").replace(/"/g, "&quot;")}"${
        name === "index" ? "" : " hidden"
      }>\n${content}\n</div>`
    );
  }

  const header = toHashLinks(
    expand(partial("header"), Object.fromEntries(PAGE_NAMES.map((k) => [`nav_${k}`, ""])))
  );
  const footer = toHashLinks(expand(partial("footer"), {}));
  const drawer = expand(partial("drawer"), {});

  let css = read(path.join(ROOT, "assets", "css", "style.css"));
  // Routes are toggled with [hidden]; make sure nothing overrides it.
  css += "\n\n/* single-file router */\n[data-route][hidden] { display: none !important; }\n";

  const js =
    read(path.join(ROOT, "assets", "js", "products.js")) +
    "\n" +
    read(path.join(ROOT, "assets", "js", "app.js"));

  // Inline every referenced image.
  const imgDir = path.join(ROOT, "assets", "img");
  const cache = new Map();
  const inlineImages = (s) =>
    s.replace(/assets\/img\/([\w-]+)\.svg/g, (whole, file) => {
      const p = path.join(imgDir, `${file}.svg`);
      if (!fs.existsSync(p)) throw new Error(`Missing image: ${file}.svg`);
      if (!cache.has(file)) cache.set(file, svgDataUri(p));
      return cache.get(file);
    });

  // Product imagery is addressed in JS as `<id>-<n>.svg`, so those files need an
  // explicit map rather than a regex sweep over the source.
  const catalogue = fs
    .readFileSync(path.join(ROOT, "assets", "js", "products.js"), "utf8")
    .match(/id:\s*"([\w-]+)"/g)
    .map((m) => m.match(/"([\w-]+)"/)[1]);

  const imageMap = {};
  for (const id of catalogue) {
    for (const n of [1, 2, 3]) {
      const key = `${id}-${n}`;
      const p = path.join(imgDir, `${key}.svg`);
      if (!fs.existsSync(p)) throw new Error(`Missing product image: ${key}.svg`);
      if (!cache.has(key)) cache.set(key, svgDataUri(p));
      imageMap[key] = cache.get(key);
    }
  }
  const imageMapJs = `window.HV_IMAGES = ${JSON.stringify(imageMap)};\n`;

  const html = `<!doctype html>
<html lang="en" data-spa="true">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hollis &amp; Vane — Classy Vintage Clothing, One of One</title>
<meta name="description" content="${siteDescription}">
<meta name="theme-color" content="#1f1c18">
<link rel="icon" href="${svgDataUri(path.join(imgDir, "favicon.svg"))}" type="image/svg+xml">
<style>
${inlineFonts()}
</style>
<style>
${css}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header}
<main id="main">
${inlineImages(routes.join("\n\n"))}
</main>
${footer}
${drawer}
<div class="toast" id="toast" role="status" aria-live="polite" data-open="false"></div>
<script>
${imageMapJs}
${inlineImages(js)}
</script>
</body>
</html>
`;

  fs.writeFileSync(OUT, html);
  console.log(
    `hollis-and-vane.html — ${(html.length / 1024 / 1024).toFixed(2)} MB, ` +
      `${routes.length} routes, ${cache.size} images inlined, ${FONTS.length} font faces`
  );
}

build();
