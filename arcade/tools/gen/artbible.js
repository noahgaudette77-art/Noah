#!/usr/bin/env node
/**
 * The art bible's reference sheet (the master overhaul, Phase 2, 2026-11-23): eight pictures of the look every screen
 * keeps (ART_BIBLE.md), made with fal.ai's Seedream 5.5 ($0.03 a picture: about $0.24 a full run), set side by side
 * as docs/art/reference-sheet.jpg with a caption under each. Nothing happens unless it is run with "run" (it costs):
 *
 *   node arcade/tools/gen/artbible.js run [--only hall,floor]
 *
 * Every call is logged in tools/gen/ledger.jsonl (lib.js); the key (FAL_KEY) is read from the environment, never
 * printed. The pictures are references to check new work against, not assets of the game.
 */
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
if (process.argv[2] !== "run") { console.log("node arcade/tools/gen/artbible.js run [--only a,b]  (costs about $0.03 a picture)"); process.exit(0); }
const L = require("./lib");
const ARCADE = path.join(__dirname, "..", ".."), OUT = path.join(ARCADE, "docs", "art"), RAW = path.join(L.OUT, "artbible");
const only = (() => { const i = process.argv.indexOf("--only"); return i < 0 ? null : process.argv[i + 1].split(","); })();
const STYLE = "synthwave neon arcade at night, deep violet-black ambient, chrome and glass, lit by its own neon signs, polished reflective dark floor catching the neon, cinematic lighting with a key and a rim light, high detail, crisp, no text, no letters, no watermark, no people's faces";
const SHEET = [
  ["hall", "A long containment hall seen from its middle: two rows of tall cylindrical glass stasis cells, each holding a chrome robotic figure lit from inside in its own colour (cyan, violet, orange, gold, lime, ice blue), steel caps and brackets of brushed and painted metal, a polished dark steel deck floor with fine plate seams reflecting every cell, hazard stripes at the cell bases, ring lamps overhead, a vault door glowing gold at the far end", "the title hall"],
  ["cell", "Close-up of one cylindrical glass stasis cell: thin clear glass with a bright Fresnel edge and soft reflections of neon, a chrome robot standing inside lit cyan from below, a heavy steel cap with bolts and a tread-plate base with yellow-black hazard stripes, a small glowing status screen on the base", "a cell: glass, steel, tread plate"],
  ["floor", "Low view across a polished dark metal deck floor with fine plate seams and rivets, mirror-like reflections of magenta and cyan neon tubes and a gold vault light, slight wet sheen, the floor fills most of the frame", "the floor every screen shares"],
  ["arena", "A circular combat arena at night under a dome of stands: a crowd of lit stylised spectator figures with cyan and magenta rim light in tiered stands, sculpted pillars of dark brushed metal with neon inlays, a polished floor with a glowing duel circle, a hulking chrome boss facing a small caped wizard with a glowing wand", "Boss Rush's arena"],
  ["vault", "A bank vault room: a huge round gold vault door with a spinning dial, walls of brushed steel safe-deposit boxes with warm amber rim light, stacks of gold bars that read as clean ingots, a polished dark floor reflecting the gold glow", "Memory Bank's vault"],
  ["exam", "A grand examination hall at night: polished marble columns with violet neon edges, a raised dais under a cold blue key light, a towering armoured robot examiner wearing a mortarboard, its face and chest lit clearly, rim light in violet, moon through tall arched windows", "the Final Exam"],
  ["street", "A rain-wet city street at night seen from a low racing car: building facades with real detail (window frames, balconies, signs, shopfronts, air vents), neon shop signs in orange and magenta, street lamps throwing pools of light on wet asphalt, reflections of signs on the road", "Nest Egg Run's street"],
  ["ui", "A game interface panel design sheet on a dark violet background: a glass panel with a thin glowing cyan border, four answer buttons outlined in cyan, magenta, yellow and orange, a gold coin icon, a silver star icon, a trophy icon, all crisp vector style, pixel-art accents", "the interface's panels and icons"],
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(RAW, { recursive: true });
  const index = fs.existsSync(path.join(OUT, "reference.json")) ? JSON.parse(fs.readFileSync(path.join(OUT, "reference.json"), "utf8")) : {};
  for (const [key, subject, caption] of SHEET) {
    if (only && !only.includes(key)) continue;
    const prompt = subject + ". " + STYLE;
    const out = await L.falRun("bytedance/seedream/v5.5/text-to-image", { prompt, image_size: "landscape_4_3", num_images: 1, output_format: "png" }, { name: "art bible " + key });
    const png = path.join(RAW, key + ".png");
    await L.download(out.images[0].url, png);
    execFileSync("convert", [png, "-resize", "1024x768^", "-gravity", "center", "-extent", "1024x768", "-quality", "86", path.join(OUT, "ref-" + key + ".jpg")]);
    index[key] = { caption, prompt };
    L.log("made", key);
  }
  fs.writeFileSync(path.join(OUT, "reference.json"), JSON.stringify(index, null, 1));
  // the sheet: every picture made so far, captioned, four across
  const tiles = SHEET.filter(([k]) => fs.existsSync(path.join(OUT, "ref-" + k + ".jpg"))).map(([k, , c]) => ["-label", c, path.join(OUT, "ref-" + k + ".jpg")]).flat();
  if (tiles.length) execFileSync("montage", [...tiles, "-tile", "4x", "-geometry", "480x360+6+6", "-background", "#0b0618", "-fill", "#f4efff", "-pointsize", "18", "-quality", "84", path.join(OUT, "reference-sheet.jpg")]);
  L.log("sheet", path.join(OUT, "reference-sheet.jpg"));
})().catch((e) => { console.error("FAILED", L.scrub(String(e && e.message))); process.exit(1); });
