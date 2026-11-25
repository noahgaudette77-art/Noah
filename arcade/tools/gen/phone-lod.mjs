#!/usr/bin/env node
/**
 * A phone's copies of Risk Blaster's generated ships and near rocks (the master overhaul's performance re-check,
 * 2026-11-25: at its busiest moments a phone's frame asked for some 430,000-480,000 triangles against a budget of
 * 350,000, most of it these: a ship is about 8,000-9,000 triangles and a near rock about 7,000, drawn a few dozen
 * pixels across on a phone's screen). Each copy is the model's own shape simplified to a share of its triangles
 * (meshoptimizer's simplifier, which keeps the picture's seams and the outline), with no material and no maps of its
 * own: a phone draws it in the full model's material and picture, fitted as the full one is (20f-blasterspace.js
 * genKit). The Mac draws the full models, as before. No provider is called.
 *
 *   node tools/gen/phone-lod.mjs [--ratio 0.4] [--error 0.02]
 *   writes arcade/assets/models/<name>-md.glb for prop-ship-a, prop-ship-b, prop-ship-c, prop-rock, prop-rock2
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const M = path.join(HERE, "..", "..", "assets", "models");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : +args[i + 1]; };
const RATIO = flag("ratio", 0.4), ERROR = flag("error", 0.02);
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
for (const name of ["prop-ship-a", "prop-ship-b", "prop-ship-c", "prop-rock", "prop-rock2"]) {
  const src = await io.read(path.join(M, name + ".glb"));
  await src.transform(dequantize());
  // the first mesh, in its node's frame (as the game's modelGeometry reads it: one mesh, its node's world matrix)
  const node = src.getRoot().listNodes().find((n) => n.getMesh()), prim = node.getMesh().listPrimitives()[0], wm = node.getWorldMatrix();
  const P = prim.getAttribute("POSITION").getArray(), N = prim.getAttribute("NORMAL").getArray(), T = prim.getAttribute("TEXCOORD_0").getArray(), I = prim.getIndices().getArray();
  const n = P.length / 3, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  // the normal matrix (row by row): the cofactors of the node's 3x3 over its determinant, the inverse transpose
  const [A, B, C, D, E, F, G, H, K] = [wm[0], wm[4], wm[8], wm[1], wm[5], wm[9], wm[2], wm[6], wm[10]], det = A * (E * K - F * H) - B * (D * K - F * G) + C * (D * H - E * G);
  const NM = [E * K - F * H, -(D * K - F * G), D * H - E * G, -(B * K - C * H), A * K - C * G, -(A * H - B * G), B * F - C * E, -(A * F - C * D), A * E - B * D].map((v) => v / det);
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    pos[i * 3] = wm[0] * x + wm[4] * y + wm[8] * z + wm[12]; pos[i * 3 + 1] = wm[1] * x + wm[5] * y + wm[9] * z + wm[13]; pos[i * 3 + 2] = wm[2] * x + wm[6] * y + wm[10] * z + wm[14];
    // (the normal turned by the node's normal matrix, the inverse transpose of its rotation and scale, so a scale
    // that is not the same on every axis still leaves it at right angles to the surface; then set to unit length)
    const a = N[i * 3], b = N[i * 3 + 1], c = N[i * 3 + 2], nx = NM[0] * a + NM[1] * b + NM[2] * c, ny = NM[3] * a + NM[4] * b + NM[5] * c, nz = NM[6] * a + NM[7] * b + NM[8] * c, l = Math.hypot(nx, ny, nz) || 1;
    nor[i * 3] = nx / l; nor[i * 3 + 1] = ny / l; nor[i * 3 + 2] = nz / l;
  }
  // (the careful simplifier, on the index buffer as it is: a vertex split at a seam of the picture is two, and the
  // seam is kept; its own normal and place in the picture ride with each vertex it keeps)
  const [out] = MeshoptSimplifier.simplify(Uint32Array.from(I), pos, 3, Math.floor((I.length * RATIO) / 3) * 3, ERROR);
  const used = new Map(), keep = [];
  for (const v of out) if (!used.has(v)) { used.set(v, keep.length); keep.push(v); }
  const m = keep.length, p2 = new Float32Array(m * 3), n2 = new Float32Array(m * 3), t2 = new Float32Array(m * 2), i2 = m > 65535 ? new Uint32Array(out.length) : new Uint16Array(out.length);
  keep.forEach((v, j) => { p2.set(pos.subarray(v * 3, v * 3 + 3), j * 3); n2.set(nor.subarray(v * 3, v * 3 + 3), j * 3); t2.set(T.subarray(v * 2, v * 2 + 2), j * 2); });
  for (let k = 0; k < out.length; k++) i2[k] = used.get(out[k]);
  const doc = new Document(), buf = doc.createBuffer();
  const pr = doc.createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(p2).setBuffer(buf))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(n2).setBuffer(buf))
    .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(t2).setBuffer(buf))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(i2).setBuffer(buf));
  doc.createScene(name + "-md").addChild(doc.createNode(name + "-md").setMesh(doc.createMesh(name + "-md").addPrimitive(pr)));
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const file = path.join(M, name + "-md.glb");
  await io.write(file, doc);
  console.log(name, I.length / 3, "->", out.length / 3, "triangles,", n, "->", m, "vertices;", path.basename(file), (fs.statSync(file).size / 1024).toFixed(1) + " KB");
}
