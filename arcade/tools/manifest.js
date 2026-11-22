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
  blaster: ["model:starfighter", "model:demon", "model:prop-ship-a", "model:prop-ship-b", "model:prop-ship-c", "model:prop-rock", "model:prop-rock2", "sky:blaster-deep-1", "sky:blaster-deep-4", "sky:blaster-deep-5", "sfx:core", "sfx:combat", "sfx:voice", "music:blaster", "model:ally-a", "model:ally-c", "model:ally-a2", "model:ally-b2", "model:ally-c2", "model:brood-a", "model:brood-a1", "model:brood-a2", "model:brood-a3", "model:brood-b", "model:brood-d", "model:brood-d2", "model:brood-f", "model:brood-f2", "model:prop-shield", "model:prop-bolt", "model:prop-star", "music:blaster-b"],
  racer: ["model:warrig", "model:prop-car", "model:prop-van", "model:prop-bus", "sky:racer-dawn", "sky:racer-day", "sky:racer-sunset", "sky:racer-sunset-b", "sky:racer-night", "sfx:core", "sfx:racer", "sfx:voice", "music:racer", "model:rival-rig", "model:rival-rig2", "model:chaser", "model:prop-shield", "model:prop-heart", "model:prop-bolt", "model:prop-star", "music:racer-b"],
  boss: ["sky:boss-storm", "sky:boss-storm-b", "sky:boss-void", "sfx:core", "sfx:combat", "sfx:bosses", "sfx:voice", "music:boss", "music:finalboss", "model:prop-heart", "model:prop-star", "model:prop-coin", "model:prop-bolt", "music:boss-b", "music:finalboss-b"],
  // The arcade hall: one cabinet model for all six games, their toppers, the trophy case's cup, medal and coins, one
  // hall panorama for its reflections and light (never shown), the boss portraits for its posters. (Its sound comes
  // with it but is not waited for: see showHub.)
  hub: ["model:prop-cabinet", "model:mini-starfighter", "model:mini-warrig", "model:mini-proctor", "model:prop-deck", "model:prop-podium", "model:prop-tome", "model:prop-trophy", "model:prop-medal", "model:prop-coin", "model:prop-stand", "model:prop-vault", "sky:hub-hall", "sky:hub-hall-b", "ui:bosses", "ui:icons"],
  hubsound: ["sfx:core", "sfx:hub", "sfx:voice", "music:hub", "music:hub-b"],
  // The title (served): the containment hall. Its painted vault, the six worlds' windows, the stasis pod, the end of the
  // hall (vault door, cabinets, trophy stand), then the twelve captured bosses, nearest the door first. (Its sound is
  // titlesound, asked for after the first tap; the bosses' distant growls, titleroar, after that.)
  title: ["sky:title-hall", "ui:win-blaster", "ui:win-racer", "ui:win-boss", "ui:win-memory", "ui:win-exam", "ui:win-guide", "model:prop-vault", "model:prop-cabinet", "model:prop-stand", "model:prop-trophy",
    "model:boss-1-t", "model:boss-2-t", "model:boss-3-t", "model:boss-4-t", "model:boss-5-t", "model:boss-6-t", "model:boss-7-t", "model:boss-8-t", "model:boss-9-t", "model:boss-10-t", "model:boss-11-t", "model:boss-all-t"],
  titlesound: ["sfx:core", "sfx:voice", "music:title", "music:title-b"],
  titleroar: ["sfx:bosses"],
  memory: ["sky:vault-gold", "model:prop-deck", "model:prop-coin", "sfx:core", "sfx:voice", "music:memory", "model:decor-deck", "music:memory-b"], // (the vault's own door stays: it moves as the deck is banked)
  exam: ["sky:exam-moon", "model:prop-podium", "sfx:core", "sfx:combat", "sfx:voice", "music:exam", "model:statue-1", "model:statue-2", "model:statue-3", "model:statue-4", "model:statue-5", "model:statue-6", "model:statue-7", "model:statue-8", "model:statue-9", "model:statue-10", "model:statue-11", "model:statue-all", "model:decor-podium", "music:exam-b"],
  guide: ["sky:guide-archive", "model:prop-tome", "sfx:core", "music:calm", "model:decor-tome", "music:calm-b"],
};
const files = {};
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), st = fs.statSync(p); if (st.isDirectory()) walk(p); else if (/\.(glb|webp|jpg|mp3)$/.test(f)) files[path.relative(A, p).split(path.sep).join("/")] = st.size; } };
for (const d of ["models", "sky", "audio", "ui"]) if (fs.existsSync(path.join(A, d))) walk(path.join(A, d));
const audio = fs.existsSync(path.join(A, "audio", "audio.json")) ? JSON.parse(fs.readFileSync(path.join(A, "audio", "audio.json"), "utf8")) : { sprites: {}, music: {} };
const sprites = {}, music = {};
for (const [k, v] of Object.entries(audio.sprites || {})) if (files[v.file] !== undefined) sprites[k] = v;
for (const [k, v] of Object.entries(audio.music || {})) if (files[v.file] !== undefined) music[k] = { file: v.file, loop: v.loop, vol: v.vol };
const has = (e) => { const [kind, name] = e.split(":"); return kind === "model" ? files["models/" + name + ".glb"] !== undefined : kind === "sky" ? files["sky/" + name + ".webp"] !== undefined || files["sky/" + name + ".jpg"] !== undefined : kind === "sfx" ? !!sprites[name] : kind === "music" ? !!music[name] : kind === "ui" ? files["ui/" + name + ".webp"] !== undefined : false; };
const sets = {};
for (const [k, list] of Object.entries(SETS)) sets[k] = list.filter(has);
// only what a set or a boss fight can ask for is listed: a file left in assets/ by an experiment is not fetched
const wanted = new Set();
for (const list of Object.values(sets)) for (const e of list) { const [kind, name] = e.split(":"); if (kind === "model") wanted.add("models/" + name + ".glb"); if (kind === "sky") wanted.add(files["sky/" + name + ".webp"] !== undefined ? "sky/" + name + ".webp" : "sky/" + name + ".jpg"); if (kind === "sfx") wanted.add(sprites[name].file); if (kind === "music") wanted.add(music[name].file); if (kind === "ui") wanted.add("ui/" + name + ".webp"); }
for (const f of Object.keys(files)) if (/^models\/boss-/.test(f)) wanted.add(f);
const listed = {};
for (const f of [...wanted].sort()) listed[f] = files[f];
const out = "// Written by tools/manifest.js: every file under arcade/assets the page may fetch (and its size), the cues inside each\n// sound sprite ([start, length, level, how far the music ducks]), the music and its loop points, and what each screen needs.\nconst INR_FILES = " + JSON.stringify({ files: listed, sprites, music, sets }) + ";\n";
fs.writeFileSync(path.join(ARCADE, "src", "js", "03a-files.js"), out);
const total = Object.values(listed).reduce((a, b) => a + b, 0);
console.log(`${Object.keys(listed).length} files, ${(total / 1048576).toFixed(1)} MB; sprites: ${Object.keys(sprites).join(", ") || "none"}; music: ${Object.keys(music).join(", ") || "none"}`);
for (const [k, v] of Object.entries(sets)) if (v.length) console.log(`  ${k}: ${v.join(" ")}`);
