#!/usr/bin/env node
/**
 * Converts a supplied 3D model (.glb) into the compact form the arcade inlines.
 *
 *   node scripts/convert-model.js <model.glb> <name> [textureSize=2048]
 *
 * <name> is "boss" (the Final Exam's boss), "fighter" (Risk Blaster's ship) or "frog"
 * (Risk Blaster's enemy). Writes into arcade/assets/<name>/ (or the folder in OUT_DIR):
 *   <name>.bin   every part of the model in one buffer: positions as 16-bit fractions
 *                of the part's bounding box, normals as signed bytes, UVs as 16-bit
 *                fractions, 16-bit indices, after a small JSON header
 *   albedo.jpg   the colour texture, resized and sharpened (needs ImageMagick's
 *                `convert`): the boss's in grey at 2048 px, the fighter's at 1024 px,
 *                the frog's at 2048 px. GRADE=off keeps any model's as it is.
 *
 * A model made of separate parts (the boss, the fighter) is kept part by part. A sculpt
 * (the frog: one meshopt-compressed mesh of 1.9 million triangles) is simplified
 * instead, keeping its texture mapping, to the triangle counts in TRIANGLES (default
 * "20000,3000": the game's version and a lighter one for weak quality levels, as
 * parts 0 and 1). That path needs the meshoptimizer package (MIT), which is not a
 * dependency of this repo: install it anywhere and point MESHOPTIMIZER at its
 * index.js, or have it in node_modules.
 *
 * The .glb is only read as numbers: nothing in it is executed.
 */
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");

// ---- a minimal .glb reader: JSON + binary chunk, accessors, node world matrices ----
function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "glTF") throw new Error("not a .glb file");
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === "JSON") json = JSON.parse(data.toString("utf8"));
    else if (type.startsWith("BIN")) bin = data;
    off += 8 + len;
  }
  return { json, bin };
}
const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
// An accessor as a plain array of numbers (normalized ints mapped to floats).
function accessor(g, i) {
  const A = g.json.accessors[i], bv = g.json.bufferViews[A.bufferView], [T, bytes] = COMP[A.componentType], n = SIZE[A.type];
  const stride = bv.byteStride || bytes * n, base = (bv.byteOffset || 0) + (A.byteOffset || 0);
  const out = new Array(A.count * n);
  const dv = new DataView(g.bin.buffer, g.bin.byteOffset, g.bin.byteLength);
  const get = { 5120: (o) => dv.getInt8(o), 5121: (o) => dv.getUint8(o), 5122: (o) => dv.getInt16(o, true), 5123: (o) => dv.getUint16(o, true), 5125: (o) => dv.getUint32(o, true), 5126: (o) => dv.getFloat32(o, true) }[A.componentType];
  const norm = A.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[A.componentType] : 0;
  for (let k = 0; k < A.count; k++) for (let c = 0; c < n; c++) { const v = get(base + k * stride + c * bytes); out[k * n + c] = norm ? Math.max(-1, v / norm) : v; }
  return out;
}
// 4x4 column-major helpers
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function trs(n) {
  if (n.matrix) return n.matrix.slice();
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
// every node that carries a mesh, with its world matrix
function meshNodes(g) {
  const out = [], J = g.json;
  const walk = (i, parent) => { const n = J.nodes[i], m = mul(parent, trs(n)); if (n.mesh !== undefined) out.push({ node: i, name: n.name || "node" + i, mesh: n.mesh, matrix: m }); (n.children || []).forEach((c) => walk(c, m)); };
  (J.scenes[J.scene || 0].nodes || []).forEach((r) => walk(r, ident()));
  return out;
}
const xf = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const xn = (m, x, y, z) => { const v = [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z], l = Math.hypot(...v) || 1; return v.map((c) => c / l); };


const src = process.argv[2], name = process.argv[3];
if (!src || !/^[a-z]+$/.test(name || "")) { console.error("usage: convert-model.js <model.glb> <boss|fighter|frog> [textureSize]"); process.exit(1); }
const outDir = path.resolve(process.env.OUT_DIR || path.join(__dirname, "..", "arcade", "assets", name));
// In the arcade each model wears gunmetal and neon (src/js/08m-model.js), so its texture is only
// read as light and shade and as a mask of where its paint was: the boss's is kept in grey at
// full size (it is seen from very close), the fighter's in colour at half size (it is small).
const texSize = +(process.argv[4] || { fighter: 1024 }[name] || 2048);
const GRADES = { boss: ["-colorspace", "Gray", "-sigmoidal-contrast", "4x45%", "-unsharp", "0x1.2+0.8+0.02"], fighter: ["-unsharp", "0x1.0+0.7+0.01"], frog: ["-unsharp", "0x1.2+0.7+0.01"] };
const GRADE = process.env.GRADE === "off" ? [] : GRADES[name] || [];
const QUALITY = process.env.QUALITY || { boss: "74", fighter: "82", frog: "74" }[name] || "86";
fs.mkdirSync(outDir, { recursive: true });

const g = readGlb(src), J = g.json;
// the model's colour texture, resized (and graded) into albedo.jpg
function writeTexture() {
  const im = J.images[J.textures[J.materials[0].pbrMetallicRoughness.baseColorTexture.index].source], bv = J.bufferViews[im.bufferView];
  const tmp = path.join(outDir, "albedo-source.tmp");
  fs.writeFileSync(tmp, g.bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
  execFileSync("convert", [(im.mimeType === "image/png" ? "png:" : "jpeg:") + tmp, "-resize", `${texSize}x${texSize}`, ...GRADE, "-sampling-factor", "4:2:0", "-quality", QUALITY, "-strip", path.join(outDir, "albedo.jpg")]);
  fs.unlinkSync(tmp);
}
if ((J.extensionsRequired || []).includes("EXT_meshopt_compression")) { sculpt().catch((e) => { console.error(e.message || e); process.exit(1); }); return; }
const parts = [], blobs = [];
let offset = 0;
const push = (typed) => { const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), pad = (4 - (b.length % 4)) % 4, at = offset; blobs.push(b); if (pad) blobs.push(Buffer.alloc(pad)); offset += b.length + pad; return at; };
const nodes = meshNodes(g).sort((a, b) => (+a.name.replace(/\D/g, "") || 0) - (+b.name.replace(/\D/g, "") || 0));
for (const n of nodes) {
  const prim = J.meshes[n.mesh].primitives[0];
  const P = accessor(g, prim.attributes.POSITION), N = accessor(g, prim.attributes.NORMAL), T = accessor(g, prim.attributes.TEXCOORD_0), I = accessor(g, prim.indices);
  const count = P.length / 3, W = new Float32Array(P.length), min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (let i = 0; i < count; i++) {
    const w = xf(n.matrix, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
    for (let k = 0; k < 3; k++) { W[i * 3 + k] = w[k]; min[k] = Math.min(min[k], w[k]); max[k] = Math.max(max[k], w[k]); }
  }
  const qp = new Uint16Array(count * 3), qn = new Int8Array(count * 4), qt = new Uint16Array(count * 2);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) qp[i * 3 + k] = Math.round(((W[i * 3 + k] - min[k]) / (max[k] - min[k] || 1)) * 65535);
    const nn = xn(n.matrix, N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    for (let k = 0; k < 3; k++) qn[i * 4 + k] = Math.round(nn[k] * 127);
    for (let k = 0; k < 2; k++) qt[i * 2 + k] = Math.round(Math.min(1, Math.max(0, T[i * 2 + k])) * 65535);
  }
  if (count > 65535) throw new Error(n.name + ": too many vertices for 16-bit indices");
  parts.push({ id: +n.name.replace(/\D/g, ""), v: count, i: I.length, min: min.map((v) => +v.toFixed(5)), max: max.map((v) => +v.toFixed(5)), p: push(qp), n: push(qn), t: push(qt), x: push(Uint16Array.from(I)) });
}
const header = Buffer.from(JSON.stringify({ version: 1, parts }), "utf8");
const pad = (4 - (header.length % 4)) % 4, head = Buffer.alloc(8);
head.write("INRB", 0, "ascii");
head.writeUInt32LE(header.length + pad, 4);
const bin = Buffer.concat([head, header, Buffer.alloc(pad, 0x20), ...blobs]);
fs.writeFileSync(path.join(outDir, name + ".bin"), bin);

writeTexture();
const tris = parts.reduce((s, p) => s + p.i / 3, 0), verts = parts.reduce((s, p) => s + p.v, 0);
console.log(`${parts.length} parts, ${verts} vertices, ${tris} triangles -> ${name}.bin ${(bin.length / 1024).toFixed(0)} KB, albedo.jpg ${(fs.statSync(path.join(outDir, "albedo.jpg")).size / 1024).toFixed(0)} KB (${texSize}px)`);

// ---- a sculpt: one dense, meshopt-compressed mesh --------------------------------
// Decoded and simplified to each count in TRIANGLES with its texture mapping kept (the
// simplifier holds the seams between the texture's charts together). The vertices that
// survive keep their own positions and UVs; their normals are the average of the
// sculpt's normals round them, so the fine modelling that was cut away still shades it.
async function sculpt() {
  let mo;
  try { mo = await import(process.env.MESHOPTIMIZER ? require("url").pathToFileURL(path.resolve(process.env.MESHOPTIMIZER)).href : "meshoptimizer"); }
  catch (e) { throw new Error("this model is meshopt-compressed: it needs the meshoptimizer package (set MESHOPTIMIZER to its index.js, or have it in node_modules)"); }
  const { MeshoptDecoder, MeshoptSimplifier } = mo;
  await MeshoptDecoder.ready;
  await MeshoptSimplifier.ready;
  const view = (i) => {
    const e = J.bufferViews[i].extensions.EXT_meshopt_compression, out = new Uint8Array(e.count * e.byteStride);
    MeshoptDecoder.decodeGltfBuffer(out, e.count, e.byteStride, new Uint8Array(g.bin.buffer, g.bin.byteOffset + e.byteOffset, e.byteLength), e.mode, e.filter || "NONE");
    return out;
  };
  const prim = J.meshes[0].primitives[0], acc = (k) => J.accessors[k];
  if (acc(prim.attributes.POSITION).componentType !== 5126 || acc(prim.attributes.TEXCOORD_0).componentType !== 5126 || acc(prim.attributes.NORMAL).componentType !== 5120 || acc(prim.indices).componentType !== 5125) throw new Error("unexpected vertex layout in this sculpt");
  const P = new Float32Array(view(acc(prim.attributes.POSITION).bufferView).buffer), Nb = new Int8Array(view(acc(prim.attributes.NORMAL).bufferView).buffer);
  const T = new Float32Array(view(acc(prim.attributes.TEXCOORD_0).bufferView).buffer), I = new Uint32Array(view(acc(prim.indices).bufferView).buffer);
  const nv = P.length / 3, same = MeshoptSimplifier.generatePositionRemap(P, 3); // (same[v]: the first vertex at v's position; a seam has several)
  const parts = [], blobs = [], report = [];
  let offset = 0;
  const push = (typed) => { const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength), pad = (4 - (b.length % 4)) % 4, at = offset; blobs.push(b); if (pad) blobs.push(Buffer.alloc(pad)); offset += b.length + pad; return at; };
  (process.env.TRIANGLES || "20000,3000").split(",").map(Number).forEach((want, lod) => {
    const [S] = MeshoptSimplifier.simplifyWithAttributes(I, P, 3, T, 2, [1, 1], null, want * 3, 0.5, []);
    const id = new Map(), keep = [], X = new Uint16Array(S.length);
    for (let i = 0; i < S.length; i++) { let k = id.get(S[i]); if (k === undefined) { k = keep.length; id.set(S[i], k); keep.push(S[i]); } X[i] = k; }
    const n = keep.length;
    if (n > 65535) throw new Error("too many vertices for 16-bit indices: ask for fewer triangles");
    // normals: one per kept position (both sides of a seam share it), gathered from the sculpt's vertices nearest it
    const spot = new Map(), spots = [];
    keep.forEach((v) => { if (!spot.has(same[v])) { spot.set(same[v], spots.length); spots.push(same[v]); } });
    let edge = 0;
    for (let i = 0; i < S.length; i += 3) { const a = S[i] * 3, b = S[i + 1] * 3; edge += Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]); }
    const R = (edge / (S.length / 3)) * 0.75, grid = new Map(), cell = (x, y, z) => Math.floor(x / R) + "," + Math.floor(y / R) + "," + Math.floor(z / R);
    spots.forEach((v, k) => { const c = cell(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); let list = grid.get(c); if (!list) grid.set(c, (list = [])); list.push(k); });
    const NN = new Float64Array(spots.length * 3);
    for (let v = 0; v < nv; v++) {
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2], cx = Math.floor(x / R), cy = Math.floor(y / R), cz = Math.floor(z / R);
      let best = -1, bd = R * R;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const list = grid.get((cx + dx) + "," + (cy + dy) + "," + (cz + dz));
        if (!list) continue;
        for (const k of list) { const q = spots[k] * 3, d = (P[q] - x) ** 2 + (P[q + 1] - y) ** 2 + (P[q + 2] - z) ** 2; if (d < bd) { bd = d; best = k; } }
      }
      if (best < 0) continue;
      const q = spots[best] * 4;
      if (Nb[q] * Nb[v * 4] + Nb[q + 1] * Nb[v * 4 + 1] + Nb[q + 2] * Nb[v * 4 + 2] < 0) continue; // (the other face of a thin part)
      for (let c = 0; c < 3; c++) NN[best * 3 + c] += Nb[v * 4 + c];
    }
    const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
    keep.forEach((v) => { for (let c = 0; c < 3; c++) { min[c] = Math.min(min[c], P[v * 3 + c]); max[c] = Math.max(max[c], P[v * 3 + c]); } });
    const qp = new Uint16Array(n * 3), qn = new Int8Array(n * 4), qt = new Uint16Array(n * 2);
    keep.forEach((v, k) => {
      const s3 = spot.get(same[v]) * 3;
      let nx = NN[s3], ny = NN[s3 + 1], nz = NN[s3 + 2], l = Math.hypot(nx, ny, nz);
      if (!l) { nx = Nb[v * 4]; ny = Nb[v * 4 + 1]; nz = Nb[v * 4 + 2]; l = Math.hypot(nx, ny, nz) || 1; }
      qn[k * 4] = Math.round((nx / l) * 127); qn[k * 4 + 1] = Math.round((ny / l) * 127); qn[k * 4 + 2] = Math.round((nz / l) * 127);
      for (let c = 0; c < 3; c++) qp[k * 3 + c] = Math.round(((P[v * 3 + c] - min[c]) / (max[c] - min[c] || 1)) * 65535);
      for (let c = 0; c < 2; c++) qt[k * 2 + c] = Math.round(Math.min(1, Math.max(0, T[v * 2 + c])) * 65535);
    });
    parts.push({ id: lod, v: n, i: X.length, min: min.map((v) => +v.toFixed(5)), max: max.map((v) => +v.toFixed(5)), p: push(qp), n: push(qn), t: push(qt), x: push(X) });
    report.push(`${X.length / 3} triangles (${n} vertices)`);
  });
  const header = Buffer.from(JSON.stringify({ version: 1, parts }), "utf8"), pad = (4 - (header.length % 4)) % 4, head = Buffer.alloc(8);
  head.write("INRB", 0, "ascii");
  head.writeUInt32LE(header.length + pad, 4);
  const bin = Buffer.concat([head, header, Buffer.alloc(pad, 0x20), ...blobs]);
  fs.writeFileSync(path.join(outDir, name + ".bin"), bin);
  writeTexture();
  console.log(`sculpt of ${I.length / 3} triangles -> ${report.join(", ")} -> ${name}.bin ${(bin.length / 1024).toFixed(0)} KB, albedo.jpg ${(fs.statSync(path.join(outDir, "albedo.jpg")).size / 1024).toFixed(0)} KB (${texSize}px)`);
}
