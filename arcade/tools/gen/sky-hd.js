#!/usr/bin/env node
/**
 * A Mac's sharper skies (the Mac's richer tier, 2026-11-25: the owner raised the Mac's graphics memory budget from
 * 900 MB to about 2 GB). Each game sky (assets/sky/<name>.webp, 4096 x 2048) was drawn down from Blockade's own 8192 x
 * 4096 panorama (tools/gen/sky-build.js). That original is fetched again by its id (the finished request's status:
 * nothing is generated, no credit is spent) and packed as assets/sky/<name>-hd.webp, the same picture at its own size.
 * A computer drawing at the MAC tier loads it in the sky's place (Assets.skyFile); a phone never does. On a Mac's
 * screen a 4096 px sky is drawn up some 2.8 times (a 60 degree view, 90 across, over 2,940 pixels); at 8192, 1.4.
 *
 *   node tools/gen/sky-hd.js <name> ...      (BLOCKADE_API_KEY in the environment; never printed)
 */
const fs = require("fs"), path = require("path"), os = require("os");
const sharp = require("sharp");
const { http, download, ledger, scrub } = require("./lib");
const ARCADE = path.join(__dirname, "..", ".."), SKY = path.join(ARCADE, "assets", "sky");
const BL = "https://backend.blockadelabs.com/api/v1";
(async () => {
  const key = process.env.BLOCKADE_API_KEY;
  if (!key) throw new Error("BLOCKADE_API_KEY is not set");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sky-hd-"));
  for (const name of process.argv.slice(2)) {
    const meta = JSON.parse(fs.readFileSync(path.join(SKY, name + ".json"), "utf8")), id = meta.blockade && meta.blockade.id;
    if (!id) { console.log(name + ": no Blockade id"); continue; }
    const r = await http(BL + "/imagine/requests/" + id, { headers: { "x-api-key": key } });
    const j = await r.json(), q = j.request || j;
    if (!r.ok || !q.file_url) { console.log(name + ": " + r.status + " " + scrub(JSON.stringify(j).slice(0, 200))); continue; }
    const src = path.join(tmp, name + ".jpg");
    await download(q.file_url, src);
    const m = await sharp(src).metadata();
    const out = path.join(SKY, name + "-hd.webp");
    await sharp(src).resize(8192, 4096, { kernel: "lanczos3" }).webp({ quality: meta.q || 86, effort: 5 }).toFile(out);
    ledger({ provider: "blockade", name: "sky-hd " + name, id, cost: 0, unit: "credits", note: "the finished request's original fetched again (no generation)", output: { width: m.width, height: m.height, file: "assets/sky/" + name + "-hd.webp" } });
    console.log(`${name}-hd.webp: from ${m.width}x${m.height}, ${(fs.statSync(out).size / 1048576).toFixed(2)} MB (${(fs.statSync(path.join(SKY, name + ".webp")).size / 1048576).toFixed(2)} MB the game's)`);
    fs.unlinkSync(src);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
})().catch((e) => { console.error("FAILED", scrub(e.message)); process.exit(1); });
