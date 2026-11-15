#!/usr/bin/env node
/**
 * Skies for the game: each picked panorama (8K equirectangular from Blockade) resized and packed, with a check
 * sheet for seams and stretching.
 *
 *   GEN_OUT=<dir> node tools/gen/sky-build.js <name>[=<source-name>] ... [--size 4096] [--check dir]
 *
 * Writes arcade/assets/sky/<name>.webp (4096x2048 by default) and, with --check, a sheet per sky: the whole
 * panorama, the wrap seam (the right and left edges brought together), the zenith and the nadir.
 */
const fs = require("fs"), path = require("path");
const sharp = require("sharp");
const ARCADE = path.join(__dirname, "..", ".."), OUT = process.env.GEN_OUT || path.join(__dirname, "out");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf("--" + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const size = +flag("size", 4096), check = flag("check", null), q = +flag("q", 86);
(async () => {
  const idx = JSON.parse(fs.readFileSync(path.join(OUT, "sky", "index.json"), "utf8"));
  fs.mkdirSync(path.join(ARCADE, "assets", "sky"), { recursive: true });
  for (const a of args) {
    const [name, srcName = name] = a.split("="), src = path.join(OUT, "sky", srcName + ".jpg");
    const img = sharp(src).resize(size, size / 2, { kernel: "lanczos3" });
    const out = path.join(ARCADE, "assets", "sky", name + ".webp");
    await img.clone().webp({ quality: q, effort: 5 }).toFile(out);
    // where the light is: the brightest column of the band round the horizon, as an angle (the games turn the sky to suit)
    const small = await sharp(src).resize(360, 180).removeAlpha().raw().toBuffer();
    let best = 0, bx = 0, mean = 0;
    for (let x = 0; x < 360; x++) { let s = 0; for (let y = 60; y < 110; y++) { const i = (y * 360 + x) * 3; s += small[i] * 0.3 + small[i + 1] * 0.6 + small[i + 2] * 0.1; } if (s > best) { best = s; bx = x; } }
    for (let i = 0; i < small.length; i += 3) mean += small[i] * 0.3 + small[i + 1] * 0.6 + small[i + 2] * 0.1;
    mean /= (small.length / 3) * 255;
    const meta = { name, source: srcName, blockade: idx[srcName] ? { id: idx[srcName].id, style: idx[srcName].style_name, seed: idx[srcName].seed, prompt: idx[srcName].prompt } : null, width: size, height: size / 2, bytes: fs.statSync(out).size, lightAt: bx, mean: +mean.toFixed(3) };
    fs.writeFileSync(out.replace(/\.webp$/, ".json"), JSON.stringify(meta, null, 1));
    console.log(`${name}: ${(meta.bytes / 1024).toFixed(0)} KB, brightest at ${bx} deg, mean ${meta.mean}`);
    if (check) {
      fs.mkdirSync(check, { recursive: true });
      const W = 1600, H = 800, full = await sharp(src).resize(W, H).toBuffer();
      const seamL = await sharp(src).extract({ left: 8192 - 700, top: 1400, width: 700, height: 1300 }).resize(350, 650).toBuffer().catch(() => null);
      const meta0 = await sharp(src).metadata(), sw = meta0.width, sh = meta0.height, k = sw / 8192;
      const ex = (l, t, w, h, rw, rh) => sharp(src).extract({ left: Math.round(l * k), top: Math.round(t * k), width: Math.round(w * k), height: Math.round(h * k) }).resize(rw, rh).toBuffer();
      const right = await ex(8192 - 800, 1300, 800, 1500, 400, 750), left = await ex(0, 1300, 800, 1500, 400, 750);
      const top = await ex(0, 0, 8192, 500, 800, 180), bottom = await ex(0, 4096 - 500, 8192, 500, 800, 180);
      await sharp({ create: { width: W, height: H + 760, channels: 3, background: "#101018" } }).composite([
        { input: full, left: 0, top: 0 }, { input: right, left: 0, top: H + 8 }, { input: left, left: 400, top: H + 8 },
        { input: top, left: 800, top: H + 8 }, { input: bottom, left: 800, top: H + 8 + 190 },
      ]).jpeg({ quality: 84 }).toFile(path.join(check, name + ".check.jpg"));
    }
  }
})().catch((e) => { console.error("FAILED", e.message); process.exit(1); });
