#!/usr/bin/env node
/**
 * Assembles the static site from src/pages + src/partials into the repo root.
 *
 * Two directives, deliberately:
 *   {{> name }}      inline src/partials/name.html
 *   {{ key }}        substitute a value from the page's front-matter
 *
 * Front-matter is a JSON object in an HTML comment at the top of a page:
 *   <!--{ "title": "...", "description": "...", "nav": "shop" }-->
 *
 *   node scripts/build.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGES = path.join(ROOT, "src", "pages");
const PARTIALS = path.join(ROOT, "src", "partials");

const DEFAULTS = {
  title: "Hollis & Vane",
  description:
    "Hollis & Vane is a curated archive of classy vintage clothing — tailoring, outerwear and accessories, each piece one of one.",
  nav: "",
  bodyClass: "",
};

function readPartial(name) {
  const file = path.join(PARTIALS, `${name}.html`);
  if (!fs.existsSync(file)) throw new Error(`Missing partial: ${name}`);
  return fs.readFileSync(file, "utf8");
}

function expand(html, data, depth = 0) {
  if (depth > 8) throw new Error("Partial nesting too deep — check for a cycle.");
  const withPartials = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) =>
    expand(readPartial(name), data, depth + 1)
  );
  return withPartials.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(data, key) ? String(data[key]) : ""
  );
}

function build() {
  const files = fs.readdirSync(PAGES).filter((f) => f.endsWith(".html"));
  if (!files.length) throw new Error("No pages found in src/pages.");

  for (const file of files) {
    const raw = fs.readFileSync(path.join(PAGES, file), "utf8");
    const fm = raw.match(/^<!--(\{[\s\S]*?\})-->\s*/);
    let data = { ...DEFAULTS };
    let body = raw;

    if (fm) {
      try {
        data = { ...DEFAULTS, ...JSON.parse(fm[1]) };
      } catch (err) {
        throw new Error(`Bad front-matter in ${file}: ${err.message}`);
      }
      body = raw.slice(fm[0].length);
    }

    // Nav highlighting is data, not markup duplication.
    for (const key of ["shop", "about", "journal", "contact"]) {
      data[`nav_${key}`] = data.nav === key ? ' aria-current="page"' : "";
    }
    // Expand the page body first — partials used inside a page (the newsletter
    // block, say) must be resolved before the result is injected into the layout.
    data.content = expand(body, data);

    const out = expand(readPartial("layout"), data);
    fs.writeFileSync(path.join(ROOT, file), out);
    console.log(`  built  ${file}  (${(out.length / 1024).toFixed(1)} kB)`);
  }
  console.log(`\n${files.length} pages built.`);
}

build();
