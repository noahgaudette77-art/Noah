#!/usr/bin/env node
/**
 * Elevation views of a picked concept, for multi-view image-to-3D: the same object redrawn flat from the front,
 * from its left side, from behind and from above by an image-editing model (Nano Banana Pro, edit), so the 3D
 * model's front and rear are designed and not guessed. The right side is the left side mirrored (the designs
 * this is used for are symmetrical), so the two agree exactly.
 *
 *   GEN_OUT=<dir> node tools/gen/views.js <concept-name> [front,left,back,top] [--subject "the vehicle"]
 *
 * Images land in OUT/concepts/<concept>@<view>.png and are added to OUT/concepts/index.json under those names.
 */
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const L = require("./lib.js");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf("--" + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const subject = flag("subject", "the vehicle");
const [name, list = "front,left,back,top"] = args;
if (!name) { console.error("usage: views.js <concept-name> [front,left,back,top]"); process.exit(2); }
const dir = path.join(L.OUT, "concepts"), idxFile = path.join(dir, "index.json");
const index = JSON.parse(fs.readFileSync(idxFile, "utf8"));
const src = index[name];
if (!src) { console.error("no such concept: " + name); process.exit(2); }
const KEEP = `Exactly the same ${subject} as in the reference image: the same design, proportions, colours, materials and details, nothing added and nothing left out.`;
const END = "Flat orthographic technical elevation with no perspective, the whole object in frame with a margin, centred. Plain flat light grey studio background, soft even diffuse light, no cast shadow, no glow, no text, no labels, no dimension lines.";
const VIEWS = {
  front: `${KEEP} Redrawn seen straight from the front, at the height of its middle, perfectly centred and left-right symmetrical. ${END}`,
  left: `${KEEP} Redrawn seen straight from its left side, in pure side profile, its front end pointing to the left edge of the picture and its rear to the right; both wheels of that side fully visible as circles. ${END}`,
  back: `${KEEP} Redrawn seen straight from behind, at the height of its middle, perfectly centred and left-right symmetrical. ${END}`,
  top: `${KEEP} Redrawn as a plan view seen straight down from directly above, its front end pointing to the top edge of the picture, perfectly centred and left-right symmetrical; all four wheels visible at the four corners. ${END}`,
};
(async () => {
  const jobs = list.split(",").filter((v) => VIEWS[v] && !index[`${name}@${v}`]).map((v) => async () => {
    const out = await L.falRun("fal-ai/nano-banana-pro/edit", { prompt: VIEWS[v], image_urls: [src.url], aspect_ratio: "1:1", resolution: "2K", num_images: 1, output_format: "png" }, { name: `view ${name}@${v}` });
    const file = path.join(dir, `${name}@${v}.png`);
    await L.download(out.images[0].url, file);
    const idx = JSON.parse(fs.readFileSync(idxFile, "utf8"));
    idx[`${name}@${v}`] = { url: out.images[0].url, prompt: VIEWS[v], model: "fal-ai/nano-banana-pro/edit", of: name, view: v };
    fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1));
    L.log("done", name + "@" + v);
  });
  const res = await L.pool(jobs, 4);
  // the right side: the left side mirrored (kept as a local file; uploaded when a provider needs it)
  const left = path.join(dir, `${name}@left.png`), right = path.join(dir, `${name}@right.png`);
  if (fs.existsSync(left) && !fs.existsSync(right)) execFileSync("convert", [left, "-flop", right]);
  L.log("views:", res.filter((r) => r.ok).length, "ok,", res.filter((r) => !r.ok).length, "failed; fal balance", await L.falBalance());
  for (const r of res) if (!r.ok) console.error(L.scrub(String(r.error && r.error.message || r.error)).slice(0, 400));
})().catch((e) => { console.error("FAILED", L.scrub(e.message)); process.exit(1); });
