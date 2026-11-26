#!/usr/bin/env node
/**
 * Tripo post-processing on a candidate: segmentation (split parts), part completion,
 * rig check, auto rig, animation retarget, re-texture, format conversion.
 *
 *   GEN_OUT=<dir> node tools/gen/tripo-post.js <op> <source> <out-name> [json-params]
 *
 *   <op>      segment | complete | rigcheck | rig | retarget | texture | convert | smartsegment
 *   <source>  a key of OUT/cand/index.json or OUT/post/index.json (its task id is used),
 *             a raw task id, or a path to a .glb (uploaded first)
 *   <out-name> result is saved as OUT/post/<out-name>.glb and indexed in OUT/post/index.json
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.js");

const ROUTES = { segment: "/mesh/segment", smartsegment: "/mesh/smartsegment", complete: "/mesh/complete", rigcheck: "/animations/rig-check", rig: "/animations/rig", retarget: "/animations/retarget", texture: "/models/texture", convert: "/models/convert" };
const [op, source, outName, extra] = process.argv.slice(2);
if (!ROUTES[op] || !source || !outName) { console.error("usage: tripo-post.js <op> <source> <out-name> [json-params]"); process.exit(2); }

const dir = path.join(L.OUT, "post");
fs.mkdirSync(dir, { recursive: true });
const idxFile = path.join(dir, "index.json");
const load = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {});

(async () => {
  const cand = load(path.join(L.OUT, "cand", "index.json")), post = load(idxFile);
  let input;
  if (cand[source] && cand[source].task_id) input = cand[source].task_id;
  else if (post[source] && post[source].task_id) input = post[source].task_id;
  else if (/\.glb$/i.test(source) || (cand[source] && cand[source].file)) {
    const file = /\.glb$/i.test(source) ? source : path.join(L.OUT, cand[source].file);
    L.log("uploading", path.basename(file), (fs.statSync(file).size / 1e6).toFixed(1) + " MB");
    input = await L.tripoUpload(file);
  } else input = source;
  const body = Object.assign({ input }, extra ? JSON.parse(extra) : {});
  const out = await L.tripoTask(ROUTES[op], body, { name: `${op} ${outName}` });
  const rec = { op, source, task_id: out.task_id, credits: out.credits, params: extra ? JSON.parse(extra) : {}, output: {} };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === "string" && /^https?:/.test(v)) {
      const ext = (v.split("?")[0].match(/\.(glb|fbx|png|webp|jpg|jpeg|zip|obj|usdz)$/i) || [, "bin"])[1].toLowerCase();
      const file = path.join(dir, `${outName}${k === "model_url" || k === "pbr_model_url" || k === "seg_model_url" ? "" : "." + k.replace(/_url$/, "")}.${ext}`);
      try { rec.output[k] = { file: path.relative(L.OUT, file), bytes: await L.download(v, file) }; } catch (e) { rec.output[k] = { error: e.message }; }
    } else if (k !== "task_id" && k !== "credits") rec.output[k] = v;
  }
  const idx = load(idxFile);
  idx[outName] = rec;
  fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1));
  L.log("done", op, outName, JSON.stringify(rec.output).slice(0, 400), "credits", out.credits);
})().catch((e) => { console.error("FAILED", op, outName, L.scrub(e.message)); process.exit(1); });
