#!/usr/bin/env node
/**
 * 3D candidate round: the same concept (or the same text prompt) through Tripo and
 * Hyper3D Rodin, at their highest quality settings.
 *
 *   GEN_OUT=<dir> node tools/gen/candidates.js <asset> <concept-name> [<concept-name> ...] [--text] [--only tripo|rodin] [--faces N] [--tier T]
 *
 * <concept-name> is a key of OUT/concepts/index.json (e.g. starfighter-b-sd-0).
 * --text also runs each provider's text-to-3D from the concept's own prompt.
 * Models land in OUT/cand/<asset>/<concept>.<provider>[-text].glb and are listed in
 * OUT/cand/index.json with their task ids, seeds, settings and cost.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.js");

const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf("--" + k); if (i < 0) return null; const v = args[i + 1] && !args[i + 1].startsWith("--") ? args.splice(i + 1, 1)[0] : true; args.splice(i, 1); return v; };
const withText = !!flag("text"), multi = !!flag("multiview"), only = flag("only"), faces = +flag("faces") || 300000, tier = flag("tier") || "Gen-2.5-Extreme-High", noHighPack = !!flag("no-highpack");
const [asset, ...names] = args;
if (!asset || !names.length) { console.error("usage: candidates.js <asset> <concept-name>... [--text] [--only tripo|rodin]"); process.exit(2); }

const concepts = JSON.parse(fs.readFileSync(path.join(L.OUT, "concepts", "index.json"), "utf8"));
const dir = path.join(L.OUT, "cand", asset);
fs.mkdirSync(dir, { recursive: true });
const idxFile = path.join(L.OUT, "cand", "index.json");
const loadIdx = () => (fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, "utf8")) : {});
const saveIdx = (k, v) => { const idx = loadIdx(); idx[k] = v; fs.writeFileSync(idxFile, JSON.stringify(idx, null, 1)); };

// Tripo H3.1, Ultra geometry, HD texture from the newest texture model, PBR maps.
const TRIPO = { model: "v3.1-20260211", geometry_quality: "detailed", texture: true, pbr: true, texture_quality: "detailed", texture_version: "v3.5-20260815", face_limit: faces };
// Rodin Gen-2.5 at its top tier, raw triangles (decimated here later), PBR, HD texture, HighPack (4K maps).
const RODIN = Object.assign({ tier, quality_mesh_option: "500K Triangle", material: "PBR", geometry_file_format: "glb", hd_texture: true, texture_delight: true }, noHighPack ? {} : { addons: { high_pack: true } });

async function tripo(name, c, text) {
  const key = `${asset}/${name}.tripo${text ? "-text" : ""}`, file = path.join(dir, `${name}.tripo${text ? "-text" : ""}.glb`);
  if (loadIdx()[key]) return;
  const body = text
    ? Object.assign({ prompt: c.prompt.slice(0, 1024) }, TRIPO)
    : Object.assign({ input: c.url, texture_alignment: "original_image" }, TRIPO);
  const out = await L.tripoTask(text ? "/generation/text-to-model" : "/generation/image-to-model", body, { name: key });
  const url = out.pbr_model_url || out.model_url || out.base_model_url;
  const bytes = await L.download(url, file);
  if (out.rendered_image_url) await L.download(out.rendered_image_url, file.replace(/\.glb$/, ".preview.webp")).catch(() => {});
  saveIdx(key, { provider: "tripo", task_id: out.task_id, credits: out.credits, file: path.relative(L.OUT, file), bytes, settings: body, concept: name });
  L.log("done", key, (bytes / 1e6).toFixed(1) + " MB", out.credits, "credits");
}
async function rodin(name, c, text) {
  const key = `${asset}/${name}.rodin${text ? "-text" : ""}`, file = path.join(dir, `${name}.rodin${text ? "-text" : ""}.glb`);
  if (loadIdx()[key]) return;
  const input = text ? Object.assign({ prompt: c.prompt }, RODIN) : Object.assign({ image_urls: [c.url], prompt: "" }, RODIN);
  const out = await L.falRun(text ? "fal-ai/hyper3d/rodin/v2.5/text-to-3d" : "fal-ai/hyper3d/rodin/v2.5", input, { name: key, poll: 8000 });
  const bytes = await L.download(out.model_mesh.url, file);
  saveIdx(key, { provider: "rodin", seed: out.seed, usd: 0.4 + (noHighPack ? 0 : 0.8), file: path.relative(L.OUT, file), bytes, settings: input, concept: name, textures: (out.textures || []).map((t) => t.url), meshes: (out.model_meshes || []).map((m) => m.url) });
  L.log("done", key, (bytes / 1e6).toFixed(1) + " MB");
}

// Multi-view: the concept's elevation views (tools/gen/views.js: <concept>@front, @left, @back, @right) instead of
// one picture. Tripo takes exactly four (front, left, back, right); Rodin takes the hero picture and the views as
// pictures of one object ("concat").
async function viewUrls(name) {
  const dirC = path.join(L.OUT, "concepts"), idx = JSON.parse(fs.readFileSync(path.join(dirC, "index.json"), "utf8")), out = {};
  for (const v of ["front", "left", "back", "right"]) {
    const k = `${name}@${v}`;
    if (!idx[k] || !idx[k].url) { const f = path.join(dirC, k + ".png"); if (!fs.existsSync(f)) throw new Error("no view " + k); idx[k] = Object.assign(idx[k] || {}, { url: await L.falUpload(f), of: name, view: v }); fs.writeFileSync(path.join(dirC, "index.json"), JSON.stringify(idx, null, 1)); }
    out[v] = idx[k].url;
  }
  return out;
}
async function tripoMulti(name) {
  const key = `${asset}/${name}.tripo-mv`, file = path.join(dir, `${name}.tripo-mv.glb`);
  if (loadIdx()[key]) return;
  const v = await viewUrls(name);
  const body = Object.assign({ inputs: [v.front, v.left, v.back, v.right] }, TRIPO);
  const out = await L.tripoTask("/generation/multiview-to-model", body, { name: key });
  const bytes = await L.download(out.pbr_model_url || out.model_url || out.base_model_url, file);
  saveIdx(key, { provider: "tripo", task_id: out.task_id, credits: out.credits, file: path.relative(L.OUT, file), bytes, settings: body, concept: name });
  L.log("done", key, (bytes / 1e6).toFixed(1) + " MB", out.credits, "credits");
}
async function rodinMulti(name, c) {
  const key = `${asset}/${name}.rodin-mv`, file = path.join(dir, `${name}.rodin-mv.glb`);
  if (loadIdx()[key]) return;
  const v = await viewUrls(name);
  const input = Object.assign({ image_urls: [c.url, v.front, v.left, v.back, v.right], condition_mode: "concat", prompt: "" }, RODIN);
  const out = await L.falRun("fal-ai/hyper3d/rodin/v2.5", input, { name: key, poll: 8000 });
  const bytes = await L.download(out.model_mesh.url, file);
  saveIdx(key, { provider: "rodin", seed: out.seed, usd: 0.4 + (noHighPack ? 0 : 0.8), file: path.relative(L.OUT, file), bytes, settings: input, concept: name });
  L.log("done", key, (bytes / 1e6).toFixed(1) + " MB");
}

(async () => {
  const tj = [], rj = [];
  for (const name of names) {
    const c = concepts[name];
    if (!c) { console.error("no such concept: " + name); continue; }
    if (multi) { if (only !== "rodin") tj.push(() => tripoMulti(name)); if (only !== "tripo") rj.push(() => rodinMulti(name, c)); continue; }
    if (only !== "rodin") tj.push(() => tripo(name, c, false));
    if (only !== "tripo") rj.push(() => rodin(name, c, false));
  }
  if (withText) {
    const c = concepts[names[0]];
    if (only !== "rodin") tj.push(() => tripo(names[0], c, true));
    if (only !== "tripo") rj.push(() => rodin(names[0], c, true));
  }
  const [a, b] = await Promise.all([L.pool(tj, 4), L.pool(rj, 3)]);
  const all = a.concat(b);
  L.log(asset + ":", all.filter((r) => r.ok).length, "ok,", all.filter((r) => !r.ok).length, "failed;", "tripo", JSON.stringify(await L.tripoBalance()), "fal", await L.falBalance());
})().catch((e) => { console.error("FAILED", L.scrub(e.message)); process.exit(1); });
