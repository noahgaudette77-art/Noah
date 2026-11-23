#!/usr/bin/env node
/**
 * New clips into a model the game already uses, by bone name (the animation pass, 2026-11-23): Tripo retargets its
 * presets onto a rig the model was made from; the clips come back on the same skeleton, and are added to the model
 * as it is. Nothing else in it changes: its meshes, pictures, parts and other clips are kept as they were (checked
 * after writing: every vertex and every old clip's key the same).
 *
 *   node tools/gen/merge-clips.mjs <model> <retarget.glb> '{"fold_arms": "idle2", "hit_to_side": "hurtS"}'
 *
 *   <model>         assets/models/<model>.glb (and its .json, whose clip list is brought up to date)
 *   <retarget.glb>  a retarget's output (GEN_OUT/post/..., or a path)
 *   mapping         the retarget's clip names to the game's (a clip of that name already in the model is replaced);
 *                   "idle2@loop": a clip that is played round and round, its end eased into its start
 *
 * As tools/gen/process-rigged.mjs did for the clips it took in: a track on a bone the model does not have, or that
 * carries nothing (no part on it or below it), or that never moves from the bone's rest, is left out; the keys are
 * thinned where they lie on a straight line (resample); the file is packed as it was (meshopt).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const here = path.dirname(fileURLToPath(import.meta.url)), ARCADE = path.join(here, "..", ".."), require = createRequire(path.join(ARCADE, "tools") + "/");
const { NodeIO } = require("@gltf-transform/core");
const { ALL_EXTENSIONS } = require("@gltf-transform/extensions");
const { resample } = require("@gltf-transform/functions");
const { MeshoptDecoder, MeshoptEncoder } = require("meshoptimizer");

const [name, src, mapJson] = process.argv.slice(2);
if (!name || !src || !mapJson) { console.error("usage: merge-clips.mjs <model> <retarget.glb> '{\"preset\": \"clip\"}'"); process.exit(2); }
const MAP = JSON.parse(mapJson), OUT = process.env.GEN_OUT || path.join(here, "out");
const file = path.join(ARCADE, "assets", "models", name + ".glb"), from = fs.existsSync(src) ? src : path.join(OUT, src);
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(file), root = doc.getRoot(), buffer = root.listBuffers()[0];
const before = await io.read(file); // (a second copy, to check against after writing)
const d2 = await io.read(from);
// a clip that loops (its game name ends "@loop"): its last third of a second eased into its first pose, so the loop
// has no seam (the presets are captured to be played once)
const SEAM = 0.35;
const loopSeam = (inA, outA, pathName) => {
  const n = pathName === "rotation" ? 4 : 3, T = inA[inA.length - 1], first = Array.from(outA.slice(0, n));
  for (let i = 0; i < inA.length; i++) {
    const u = (inA[i] - (T - SEAM)) / SEAM;
    if (u <= 0) continue;
    const k = u >= 1 ? 1 : u * u * (3 - 2 * u), o = i * n;
    if (n === 4) { // (a turn: the shorter way, renormalised)
      const dot = outA[o] * first[0] + outA[o + 1] * first[1] + outA[o + 2] * first[2] + outA[o + 3] * first[3], sg = dot < 0 ? -1 : 1;
      let l = 0;
      for (let c = 0; c < 4; c++) { outA[o + c] = outA[o + c] + (sg * first[c] - outA[o + c]) * k; l += outA[o + c] * outA[o + c]; }
      l = Math.sqrt(l) || 1;
      for (let c = 0; c < 4; c++) outA[o + c] /= l;
    } else for (let c = 0; c < 3; c++) outA[o + c] = outA[o + c] + (first[c] - outA[o + c]) * k;
  }
};
const near = (a, b, tol) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > tol) return false; return true; };
for (const a of d2.getRoot().listAnimations()) if (/@loop$/.test(MAP[a.getName()] || "")) for (const ch of a.listChannels()) { const sp = ch.getSampler(), o = new Float32Array(sp.getOutput().getArray()); loopSeam(sp.getInput().getArray(), o, ch.getTargetPath()); sp.getOutput().setArray(o); }
await d2.transform(resample({ tolerance: 1e-4 })); // (the new clips' keys thinned where they lie on a line: here, before they come in, so the model's own clips are not touched)
const nodeByName = new Map(root.listNodes().map((n) => [n.getName(), n]));
// which nodes carry something (a mesh of their own or below them)
const carries = new Map();
const walk = (n) => { let c = !!n.getMesh(); for (const k of n.listChildren()) c = walk(k) || c; carries.set(n, c); return c; };
for (const s of root.listScenes()) for (const n of s.listChildren()) walk(n);
for (const sk of root.listSkins()) for (const j of sk.listJoints()) carries.set(j, true); // (a skinned model: every joint of its skin moves the mesh)
const info = JSON.parse(fs.readFileSync(file.replace(/\.glb$/, ".json"), "utf8"));
const added = [];
for (const a of d2.getRoot().listAnimations()) {
  const spec = MAP[a.getName()];
  if (!spec) continue;
  const want = spec.replace(/@loop$/, "");
  for (const old of root.listAnimations().filter((x) => x.getName() === want)) { old.listChannels().forEach((c) => c.dispose()); old.listSamplers().forEach((s) => s.dispose()); old.dispose(); }
  const na = doc.createAnimation(want);
  let dur = 0, kept = 0, dropped = 0;
  for (const ch of a.listChannels()) {
    const tn = ch.getTargetNode(), node = tn && nodeByName.get(tn.getName()), s = ch.getSampler(), pathName = ch.getTargetPath();
    if (!node || !carries.get(node)) { dropped++; continue; }
    const outA = s.getOutput().getArray(), n = pathName === "rotation" ? 4 : 3;
    const rest = pathName === "rotation" ? node.getRotation() : pathName === "scale" ? node.getScale() : node.getTranslation(), tol = pathName === "translation" ? 1e-4 : pathName === "rotation" ? 2e-4 : 1e-3;
    let still = true;
    for (let i = 0; i < outA.length && still; i += n) { const v = Array.from(outA.slice(i, i + n)); if (!near(v, rest, tol) && !(pathName === "rotation" && near(v.map((x) => -x), rest, tol))) still = false; }
    if (still) { dropped++; continue; }
    const inA = s.getInput().getArray();
    const outC = new Float32Array(outA);
    const ns = doc.createAnimationSampler().setInterpolation(s.getInterpolation())
      .setInput(doc.createAccessor().setType("SCALAR").setArray(new Float32Array(inA)).setBuffer(buffer))
      .setOutput(doc.createAccessor().setType(s.getOutput().getType()).setArray(outC).setBuffer(buffer));
    na.addSampler(ns);
    na.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(pathName).setSampler(ns));
    dur = Math.max(dur, inA[inA.length - 1]); kept++;
  }
  info.clips[want] = +dur.toFixed(3);
  added.push(`${a.getName()} -> ${want} (${dur.toFixed(2)} s, ${kept} tracks, ${dropped} left out)`);
}
if (!added.length) { console.error("nothing to add: no clip of the retarget is in the mapping (" + d2.getRoot().listAnimations().map((a) => a.getName()).join(", ") + ")"); process.exit(1); }
const newNames = new Set(Object.values(MAP).map((v) => v.replace(/@loop$/, "")));
await io.write(file, doc);
// checked: every vertex, index and old clip key as it was
const after = await io.read(file), same = (A, B) => { if (!A || !B || A.length !== B.length) return false; for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false; return true; };
let meshes = 0, bad = 0;
const pm = (d) => d.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
const P0 = pm(before), P1 = pm(after);
if (P0.length !== P1.length) bad++;
P0.forEach((p, i) => { const q = P1[i]; if (!q) return; for (const sem of p.listSemantics()) { meshes++; if (!same(p.getAttribute(sem).getArray(), q.getAttribute(sem) && q.getAttribute(sem).getArray())) bad++; } if (p.getIndices() && !same(p.getIndices().getArray(), q.getIndices() && q.getIndices().getArray())) bad++; });
let keys = 0;
for (const a of before.getRoot().listAnimations()) {
  if (newNames.has(a.getName())) continue;
  const b = after.getRoot().listAnimations().find((x) => x.getName() === a.getName());
  if (!b || b.listChannels().length !== a.listChannels().length) { bad++; continue; }
  a.listChannels().forEach((c, i) => { const e = b.listChannels()[i]; keys++; if (!same(c.getSampler().getInput().getArray(), e.getSampler().getInput().getArray()) || !same(c.getSampler().getOutput().getArray(), e.getSampler().getOutput().getArray())) bad++; });
}
info.bytes = fs.statSync(file).size;
fs.writeFileSync(file.replace(/\.glb$/, ".json"), JSON.stringify(info, null, 1));
console.log(`${name}: ${added.join("; ")}; now ${(info.bytes / 1024).toFixed(0)} KB; checked ${meshes} vertex arrays and ${keys} old tracks: ${bad ? bad + " CHANGED" : "all as they were"}`);
if (bad) process.exit(1);
