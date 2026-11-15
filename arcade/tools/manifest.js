#!/usr/bin/env node
/**
 * Writes src/js/03a-files.js: the list of asset files the page may fetch (path and size), the cues inside each
 * sound sprite, the music, and what each screen needs. Run it after adding or rebuilding anything under assets/,
 * then rebuild the page.
 *
 *   node tools/manifest.js
 */
const fs = require("fs"), path = require("path");
const ARCADE = path.join(__dirname, ".."), A = path.join(ARCADE, "assets");
// What each screen needs. Entries whose files are not there are left out, so a screen never waits for nothing.
const SETS = {
  blaster: ["model:starfighter", "model:demon", "sky:blaster-deep-1", "sky:blaster-deep-4", "sky:blaster-deep-5", "sfx:core", "sfx:combat", "sfx:voice", "music:blaster"],
  racer: ["model:warrig", "sky:racer-sunset", "sky:racer-dawn", "sky:racer-night", "sfx:core", "sfx:racer", "sfx:voice", "music:racer"],
  boss: ["sky:boss-storm", "sfx:core", "sfx:combat", "sfx:voice", "music:boss"],
  hub: ["sky:hub-hall", "sfx:core", "sfx:hub", "sfx:voice", "music:hub"],
  title: ["sky:title-dusk", "sfx:core", "sfx:voice", "music:title"],
  memory: ["sky:vault-gold", "sfx:core", "sfx:voice", "music:calm"],
  exam: ["sky:exam-moon", "sfx:core", "sfx:combat", "sfx:voice", "music:calm"],
  guide: ["sky:guide-archive", "sfx:core", "music:calm"],
};
const files = {};
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.(glb|webp|jpg|mp3)$/.test(f)) files[path.relative(A, p).split(path.sep).join("/")] = st.size; } };
for (const d of ["models", "sky", "audio"]) if (fs.existsSync(path.join(A, d))) walk(path.join(A, d));
const audio = fs.existsSync(path.join(A, "audio", "audio.json")) ? JSON.parse(fs.readFileSync(path.join(A, "audio", "audio.json"), "utf8")) : { sprites: {}, music: {} };
const sprites = {}, music = {};
for (const [k, v] of Object.entries(audio.sprites || {})) if (files[v.file] !== undefined) sprites[k] = v;
for (const [k, v] of Object.entries(audio.music || {})) if (files[v.file] !== undefined) music[k] = { file: v.file, loop: v.loop, vol: v.vol };
const has = (e) => { const [kind, name] = e.split(":"); return kind === "model" ? files["models/" + name + ".glb"] !== undefined : kind === "sky" ? files["sky/" + name + ".webp"] !== undefined || files["sky/" + name + ".jpg"] !== undefined : kind === "sfx" ? !!sprites[name] : kind === "music" ? !!music[name] : false; };
const sets = {};
for (const [k, list] of Object.entries(SETS)) sets[k] = list.filter(has);
// only what a set or a boss fight can ask for is listed: a file left in assets/ by an experiment is not fetched
const wanted = new Set();
for (const list of Object.values(sets)) for (const e of list) { const [kind, name] = e.split(":"); if (kind === "model") wanted.add("models/" + name + ".glb"); if (kind === "sky") wanted.add(files["sky/" + name + ".webp"] !== undefined ? "sky/" + name + ".webp" : "sky/" + name + ".jpg"); if (kind === "sfx") wanted.add(sprites[name].file); if (kind === "music") wanted.add(music[name].file); }
for (const f of Object.keys(files)) if (/^models\/boss-/.test(f)) wanted.add(f);
const listed = {};
for (const f of [...wanted].sort()) listed[f] = files[f];
const out = "// Written by tools/manifest.js: every file under arcade/assets the page may fetch (and its size), the cues inside each\n// sound sprite ([start, length, level, how far the music ducks]), the music and its loop points, and what each screen needs.\nconst INR_FILES = " + JSON.stringify({ files: listed, sprites, music, sets }) + ";\n";
fs.writeFileSync(path.join(ARCADE, "src", "js", "03a-files.js"), out);
const total = Object.values(listed).reduce((a, b) => a + b, 0);
console.log(`${Object.keys(listed).length} files, ${(total / 1048576).toFixed(1)} MB; sprites: ${Object.keys(sprites).join(", ") || "none"}; music: ${Object.keys(music).join(", ") || "none"}`);
for (const [k, v] of Object.entries(sets)) if (v.length) console.log(`  ${k}: ${v.join(" ")}`);
