#!/usr/bin/env node
/**
 * Light copies of Risk Blaster's two generated asteroids (prop-rock, prop-rock2), for the far rocks (the master
 * overhaul's Phase 5, 2026-11-24: the far ones were built-in grey lumps beside the near ones' crystal and ore). Each
 * copy is the same rock's shape simplified to about two hundred triangles (meshoptimizer's sloppy simplifier, on
 * its shape alone: the seams of its picture are let go, as a speck shows none), with no material and no maps of its own: the game draws
 * it in the near rock's own material and picture (20f-blasterspace.js genKit). No provider is called.
 *
 *   node tools/gen/rock-lod.mjs [--tris 240] [--error 1]
 *   writes arcade/assets/models/prop-rock-lo.glb and prop-rock2-lo.glb
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, prune, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const M = path.join(HERE, "..", "..", "assets", "models");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : +args[i + 1]; };
const TRIS = flag("tris", 240), ERROR = flag("error", 1);
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const tris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute("POSITION").getCount()) / 3, 0), 0);
for (const name of ["prop-rock", "prop-rock2"]) {
  const src = await io.read(path.join(M, name + ".glb"));
  const before = tris(src);
  await src.transform(dequantize());
  // the first mesh, in its node's frame (as the game's modelGeometry reads it)
  const node = src.getRoot().listNodes().find((n) => n.getMesh()), prim = node.getMesh().listPrimitives()[0], wm = node.getWorldMatrix();
  const P = prim.getAttribute("POSITION").getArray(), N = prim.getAttribute("NORMAL").getArray(), T = prim.getAttribute("TEXCOORD_0").getArray(), I = prim.getIndices().getArray();
  const n = P.length / 3, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; pos[i * 3] = wm[0] * x + wm[4] * y + wm[8] * z + wm[12]; pos[i * 3 + 1] = wm[1] * x + wm[5] * y + wm[9] * z + wm[13]; pos[i * 3 + 2] = wm[2] * x + wm[6] * y + wm[10] * z + wm[14]; }
  // its shape alone: every corner at one place is one vertex (the picture's seams let go)
  const key = new Map(), canon = new Uint32Array(n);
  for (let i = 0; i < n; i++) { const k = pos[i * 3].toFixed(5) + "," + pos[i * 3 + 1].toFixed(5) + "," + pos[i * 3 + 2].toFixed(5); if (!key.has(k)) key.set(k, i); canon[i] = key.get(k); }
  const welded = new Uint32Array(I.length);
  for (let i = 0; i < I.length; i++) welded[i] = canon[I[i]];
  // (a sloppy simplification: it lets the topology go too, where the careful one stopped at the rock's crystals, each a
  // shell of its own; at a speck's size only the outline and the shading are seen)
  const [out] = MeshoptSimplifier.simplifySloppy(welded, pos, 3, null, TRIS * 3, ERROR);
  // the vertices it keeps, packed; a normal each from the faces round it (smooth: a speck has no hard edges to show)
  const used = new Map(), keep = [];
  for (const v of out) if (!used.has(v)) { used.set(v, keep.length); keep.push(v); }
  const m = keep.length, p2 = new Float32Array(m * 3), n2 = new Float32Array(m * 3), t2 = new Float32Array(m * 2), i2 = new Uint16Array(out.length);
  keep.forEach((v, j) => { p2.set(pos.subarray(v * 3, v * 3 + 3), j * 3); t2.set(T.subarray(v * 2, v * 2 + 2), j * 2); });
  for (let k = 0; k < out.length; k++) i2[k] = used.get(out[k]);
  for (let k = 0; k < i2.length; k += 3) {
    const a = i2[k] * 3, b = i2[k + 1] * 3, c = i2[k + 2] * 3;
    const ux = p2[b] - p2[a], uy = p2[b + 1] - p2[a + 1], uz = p2[b + 2] - p2[a + 2], vx = p2[c] - p2[a], vy = p2[c + 1] - p2[a + 1], vz = p2[c + 2] - p2[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (const o of [a, b, c]) { n2[o] += fx; n2[o + 1] += fy; n2[o + 2] += fz; }
  }
  for (let j = 0; j < m; j++) { const l = Math.hypot(n2[j * 3], n2[j * 3 + 1], n2[j * 3 + 2]) || 1; n2[j * 3] /= l; n2[j * 3 + 1] /= l; n2[j * 3 + 2] /= l; }
  const doc = new Document(), buf = doc.createBuffer();
  const pr = doc.createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(p2).setBuffer(buf))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(n2).setBuffer(buf))
    .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(t2).setBuffer(buf))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(i2).setBuffer(buf));
  doc.createScene(name + "-lo").addChild(doc.createNode(name + "-lo").setMesh(doc.createMesh(name + "-lo").addPrimitive(pr)));
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const file = path.join(M, name + "-lo.glb");
  await io.write(file, doc);
  console.log(name, Math.round(before), "->", out.length / 3, "triangles,", m, "vertices;", path.basename(file), (fs.statSync(file).size / 1024).toFixed(1) + " KB");
}
