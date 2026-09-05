#!/usr/bin/env node
/* Rebuilds the Artifact-hosted copy of tvm-arcade.html.
 *
 * Artifacts supply their own <!doctype>/<html>/<head>/<body> wrapper, so this
 * strips ours and emits <title> + <style> + body content in that order (the
 * title has to land inside the first 8KB to be picked up). It also drops the
 * PWA links and the service-worker registration, whose relative paths only
 * resolve on the real site. The game itself is untouched: fonts are already
 * inlined as data: URIs, so the artifact makes no third-party requests either.
 *
 *   node scripts/build-arcade-artifact.js [outfile]
 */
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "tvm-arcade.html");
const out = process.argv[2] || path.join(__dirname, "..", "tvm-arcade.artifact.html");
const src = fs.readFileSync(SRC, "utf8");

const pick = (re, what) => {
  const m = src.match(re);
  if (!m) throw new Error(`could not find ${what} in ${SRC}`);
  return m[1];
};

const title = pick(/<title>([\s\S]*?)<\/title>/, "<title>");
let style   = pick(/<style>([\s\S]*?)<\/style>/, "<style>");
let body    = pick(/<body>([\s\S]*?)<\/body>/, "<body>");

// The artifact shell sets color-scheme: light on :root; the cabinet is dark.
style = ":root{color-scheme:dark}\n" + style;

// Service-worker registration: sw.js does not exist on the artifact origin.
const swBlock = /\n\/\* Register the offline worker[\s\S]*?\n\}\n/;
if (!swBlock.test(body)) throw new Error("service-worker block not found - update this script");
body = body.replace(swBlock, "\n");

const html = `<title>${title}</title>\n<style>\n${style}\n</style>\n${body}\n`;
fs.writeFileSync(out, html);

for (const bad of ["<!DOCTYPE", "<html", "<head", "<body", "</html>", "</head>", "</body>"]) {
  if (html.includes(bad)) throw new Error(`wrapper tag ${bad} survived into the artifact build`);
}
if (html.indexOf("<title>") > 8192) throw new Error("<title> pushed past the 8KB scan window");
if (/\bhttps?:\/\/(?!www\.w3\.org|scripts\.sil\.org)/.test(html.replace(/<!--[\s\S]*?-->/g, ""))) {
  console.warn("note: an absolute http(s) URL is present - check it is not a runtime fetch");
}
console.log(`${path.relative(process.cwd(), out)}  ${(html.length / 1024).toFixed(0)} KB`);
