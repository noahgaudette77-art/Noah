#!/usr/bin/env node
/**
 * Textures for spells (Boss Rush's wizard, 2026-11-23): white light on black, drawn additively in the game and tinted
 * there, so one picture serves every colour. Generated once (fal.ai, Seedream), then made clean here: grey, its black
 * truly black, centred, at the game's size, as WebP in arcade/assets/ui/ (loaded with the Boss Rush set).
 *
 *   node tools/gen/fx-textures.js [name ...]        (no names: every one not yet made)
 *
 *   fx-runes   a magic circle of rings and geometric marks (no letters): the charge under a cast, the finisher's sigil
 *   fx-ward    a hexagonal shield of light: the ward that takes a blow
 *   fx-star    a four-pointed star flare: a spell's heart, the wand's tip
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const L = require("./lib.js");

const LOOK = "Pure white glowing lines on a pure black background, perfectly centred and symmetrical, flat front view, sharp thin lines, very high contrast, no colour, no gradient background, no texture, no text, no letters, no numbers, no real alphabet, no religious or occult symbols, no logo, no watermark. Original design.";
const TEX = {
  "fx-runes": { size: 512, prompt: `A magic circle sigil for a video game spell effect: three concentric rings, between them a band of small geometric marks made only of short lines, dots, little triangles and arcs, an inner six-pointed arrangement of overlapping thin circles, a small ring at the centre. ${LOOK}` },
  "fx-ward": { size: 512, prompt: `A round energy shield pattern for a video game: a honeycomb of hexagonal cells with bright thin edges filling a circle, the cells larger in the middle and fading toward the circle's rim, a bright thin circular rim, a few cells holding small geometric marks of lines and dots. ${LOOK}` },
  "fx-star": { size: 256, prompt: `A bright star flare for a video game spell: a sharp four-pointed star with long thin tapering rays, two shorter diagonal rays, a small round bright core and one thin ring round it. ${LOOK}` },
};

(async () => {
  const want = process.argv.slice(2), dirRaw = path.join(L.OUT, "fx"), dirOut = path.join(__dirname, "..", "..", "assets", "ui");
  fs.mkdirSync(dirRaw, { recursive: true });
  for (const [name, t] of Object.entries(TEX)) {
    if (want.length && !want.includes(name)) continue;
    const raw = path.join(dirRaw, name + ".png"), out = path.join(dirOut, name + ".webp");
    if (!fs.existsSync(raw)) {
      const r = await L.falRun("bytedance/seedream/v5.5/text-to-image", { prompt: t.prompt, image_size: "square_hd", num_images: 1, output_format: "png" }, { name: "texture " + name });
      await L.download(r.images[0].url, raw);
    }
    // grey; the black floor pulled to true black and the lines' white kept; a soft round edge so no square shows
    const s = t.size, tmp = path.join(dirRaw, name + ".tmp.png");
    execFileSync("convert", [raw, "-colorspace", "Gray", "-level", "8%,92%", "-resize", `${s}x${s}^`, "-gravity", "center", "-extent", `${s}x${s}`, tmp]);
    execFileSync("convert", [tmp, "(", "-size", `${s}x${s}`, "radial-gradient:white-black", "-level", "0%,60%", ")", "-compose", "Multiply", "-composite", "-quality", "92", out]);
    fs.unlinkSync(tmp);
    L.log("made", path.relative(path.join(__dirname, "..", ".."), out), (fs.statSync(out).size / 1024).toFixed(0) + " KB");
  }
})().catch((e) => { console.error("FAILED", L.scrub(e.message)); process.exit(1); });
