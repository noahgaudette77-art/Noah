#!/usr/bin/env node
/**
 * Builds INR Arcade — the Insurance & Retirement (Quebec) study arcade — into
 * ONE self-contained HTML file.
 *
 *   node scripts/build-arcade.js                 →  arcade/index.html
 *   node scripts/build-arcade.js --fragment out  →  also writes a body-only copy
 *                                                    for hosts that supply their
 *                                                    own <html>/<head> skeleton
 *
 * Inputs
 *   arcade/src/style.css     the stylesheet
 *   arcade/src/body.html     the static markup
 *   arcade/src/js/*.js       the game, concatenated in filename order into one IIFE
 *   arcade/content/*.json    one file per chapter (ch06a + ch06b merge into ch06)
 *   arcade/assets/<name>/    the models the player supplied: the Final Exam's boss and
 *                            Risk Blaster's fighter (<name>.bin, albedo.jpg), made by
 *                            scripts/convert-model.js and inlined as base64
 *
 * Three.js r128 loads from cdnjs; the full build falls back to the vendored copy
 * in arcade/vendor/ when the CDN is unreachable, so the game also works offline
 * (fonts then fall back to the system monospace).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "arcade");
const SRC = path.join(DIR, "src");
const OUT = path.join(DIR, "index.html");

const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const FONTS_CSS = "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap";

const read = (p) => fs.readFileSync(p, "utf8");

function loadContent() {
  const dir = path.join(DIR, "content");
  const files = fs.readdirSync(dir).filter((f) => /^ch\d\d[a-z]?\.json$/.test(f)).sort();
  const byChapter = new Map();
  for (const f of files) {
    const d = JSON.parse(read(path.join(dir, f)));
    const cur = byChapter.get(d.chapter);
    if (!cur) {
      byChapter.set(d.chapter, {
        n: d.chapter,
        title: d.title,
        objectives: [...d.objectives],
        guide: [...d.guide],
        tips: [...d.tips],
        flashcards: [...d.flashcards],
        questions: [...d.questions],
      });
    } else {
      // A chapter written in halves (ch06a, ch06b): append in filename order.
      for (const k of ["objectives", "guide", "tips", "flashcards", "questions"]) cur[k].push(...d[k]);
    }
  }
  return [...byChapter.values()].sort((a, b) => a.n - b.n);
}

// Spots where the course text contradicts itself, shown in the Strategy Guide.
function loadErrata() {
  const f = path.join(DIR, "content", "errata.json");
  return fs.existsSync(f) ? JSON.parse(read(f)) : [];
}

// Client briefings and boss dialogue.
function loadStory() {
  const f = path.join(DIR, "content", "story.json");
  return fs.existsSync(f) ? JSON.parse(read(f)) : { clients: {}, bosses: {} };
}

// Binary assets, inlined as base64 so the page stays one self-contained file.
function loadAssets() {
  const out = {};
  ["boss", "fighter"].forEach((name) => {
    const dir = path.join(DIR, "assets", name), mesh = path.join(dir, name + ".bin"), tex = path.join(dir, "albedo.jpg");
    if (fs.existsSync(mesh) && fs.existsSync(tex)) {
      out[name] = { mesh: fs.readFileSync(mesh).toString("base64"), albedo: "data:image/jpeg;base64," + fs.readFileSync(tex).toString("base64") };
    }
  });
  return out;
}

function build() {
  const chapters = loadContent();
  const errata = loadErrata();
  const story = loadStory();
  const css = read(path.join(SRC, "style.css"));
  const body = read(path.join(SRC, "body.html")).trim();
  const jsFiles = fs.readdirSync(path.join(SRC, "js")).filter((f) => f.endsWith(".js")).sort();
  const js =
    '(function () {\n"use strict";\n' +
    jsFiles.map((f) => `/* ---- ${f} ---- */\n` + read(path.join(SRC, "js", f))).join("\n") +
    "\n})();";

  // JSON is valid JS; escape "</" so no string can close the <script> element.
  const data = "window.INR_DATA=" + JSON.stringify({ chapters, errata, story }).replace(/<\//g, "<\\/") + ";";
  const assets = "window.INR_ASSETS=" + JSON.stringify(loadAssets()) + ";";

  const head = [
    "<title>INR Arcade</title>",
    '<meta name="claude:viewport-fit-sides" content="cover">',
    '<meta name="description" content="A retro 3D arcade for mastering the CSI Insurance and Retirement (Quebec) course: shooter, racer, boss fights, spaced-repetition flashcards and a mock exam.">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="stylesheet" href="${FONTS_CSS}">`,
    `<style>\n${css}\n</style>`,
  ].join("\n");

  const scripts = (withFallback) =>
    [
      `<script src="${THREE_CDN}"></script>`,
      withFallback ? `<script>window.THREE||document.write('<script src="vendor/three.min.js"><\\/script>')</script>` : "",
      `<script>${data}</script>`,
      `<script>${assets}</script>`,
      `<script>\n${js}\n</script>`,
    ]
      .filter(Boolean)
      .join("\n");

  const full =
    "<!doctype html>\n<html lang=\"en\">\n<head>\n" +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
    '<meta name="theme-color" content="#090320">\n' +
    head +
    "\n</head>\n<body>\n" +
    body +
    "\n" +
    scripts(true) +
    "\n</body>\n</html>\n";
  fs.writeFileSync(OUT, full);

  const q = chapters.reduce((s, c) => s + c.questions.length, 0);
  const f = chapters.reduce((s, c) => s + c.flashcards.length, 0);
  console.log(`arcade/index.html  ${(full.length / 1024).toFixed(0)} KB  ·  ${chapters.length} chapters, ${q} questions, ${f} flashcards`);

  const i = process.argv.indexOf("--fragment");
  if (i > -1 && process.argv[i + 1]) {
    const fragment = head + "\n" + body + "\n" + scripts(false) + "\n";
    fs.writeFileSync(process.argv[i + 1], fragment);
    console.log(`${process.argv[i + 1]}  ${(fragment.length / 1024).toFixed(0)} KB (fragment)`);
  }
}

build();
