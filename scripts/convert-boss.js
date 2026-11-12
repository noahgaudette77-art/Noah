#!/usr/bin/env node
/**
 * Converts the Final Exam boss model (.glb) into the compact form the arcade inlines.
 *
 *   node scripts/convert-boss.js <model.glb> [outDir=arcade/assets/boss] [textureSize=2048]
 *
 * Writes
 *   boss.bin     every part of the model in one buffer: positions as 16-bit fractions of
 *                the part's bounding box, normals as signed bytes, UVs as 16-bit
 *                fractions, 16-bit indices, after a small JSON header
 *   albedo.jpg   the colour texture, resized, graded and sharpened (needs ImageMagick's
 *                `convert`). The grade takes the model's bright paint down to dark,
 *                worn metal (less saturation, deeper shadows): in the exam hall it is
 *                lit as a threat, not a toy. BOSS_GRADE=off keeps the model's own colours.
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


const src = process.argv[2];
const outDir = path.resolve(process.argv[3] || path.join(__dirname, "..", "arcade", "assets", "boss"));
const texSize = +(process.argv[4] || 2048);
const GRADE = process.env.BOSS_GRADE === "off" ? [] : ["-modulate", "74,46,100", "-sigmoidal-contrast", "5x42%", "-unsharp", "0x1.6+1.1+0.015"];
if (!src) { console.error("usage: convert-boss.js <model.glb> [outDir] [textureSize]"); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const g = readGlb(src), J = g.json;
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
fs.writeFileSync(path.join(outDir, "boss.bin"), bin);

const im = J.images[J.textures[J.materials[0].pbrMetallicRoughness.baseColorTexture.index].source], bv = J.bufferViews[im.bufferView];
const tmp = path.join(outDir, "albedo-source.tmp");
fs.writeFileSync(tmp, g.bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
execFileSync("convert", [(im.mimeType === "image/png" ? "png:" : "jpeg:") + tmp, "-resize", `${texSize}x${texSize}`, ...GRADE, "-sampling-factor", "4:2:0", "-quality", "86", "-strip", path.join(outDir, "albedo.jpg")]);
fs.unlinkSync(tmp);
const tris = parts.reduce((s, p) => s + p.i / 3, 0), verts = parts.reduce((s, p) => s + p.v, 0);
console.log(`${parts.length} parts, ${verts} vertices, ${tris} triangles -> boss.bin ${(bin.length / 1024).toFixed(0)} KB, albedo.jpg ${(fs.statSync(path.join(outDir, "albedo.jpg")).size / 1024).toFixed(0)} KB (${texSize}px)`);
