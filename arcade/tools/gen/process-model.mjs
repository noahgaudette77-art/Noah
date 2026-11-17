#!/usr/bin/env node
/**
 * Turn a picked candidate into the model the game loads.
 *
 *   GEN_OUT=<dir> node tools/gen/process-model.mjs tools/gen/assets/<name>.json [--report]
 *
 * What it does, from the asset's config:
 *   - reads the source .glb (one dense mesh, 4K PBR maps) and, when there is one, its segmented twin (the same
 *     triangles split into parts by Tripo): every source triangle takes the part of the matching segmented
 *     triangle, so the parts keep the source's own UVs and full-resolution maps
 *   - turns it to the arcade's frame (+Y up, +Z forward), scales it, sets its origin
 *   - gathers parts into named groups (wheels, wings, cannons ...), each a node with its pivot where it hinges
 *   - simplifies each group (meshopt, borders locked so no cracks open between parts)
 *   - writes base colour, metal/roughness and normal maps at the game's size as WebP, and derives an emissive map
 *     from the base colour (the neon strips: saturated, bright, in the asset's light colours)
 *   - adds named anchor nodes (muzzles, exhausts, the core) for effects to attach to
 *   - packs it: quantised, meshopt-compressed .glb in arcade/assets/models/<name>.glb
 * With --report it only prints what it found (parts, their boxes, sizes) and writes nothing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { meshopt, prune, dedup } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARCADE = path.join(HERE, "..", "..");
const OUT = process.env.GEN_OUT || path.join(HERE, "out");
const args = process.argv.slice(2), REPORT = args.includes("--report");
const cfgFile = args.find((a) => a.endsWith(".json"));
if (!cfgFile) { console.error("usage: process-model.mjs <asset.json> [--report]"); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

// ---- small matrix helpers (column-major 4x4, as glTF)
const mulPoint = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const mulDir = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];

// Every triangle of a document in world space: positions, normals, uvs, and which node (part) it came from.
function flatten(doc) {
  const P = [], N = [], T = [], I = [], part = [];
  let base = 0, material = null;
  const nodes = doc.getRoot().listNodes().filter((n) => n.getMesh());
  nodes.forEach((node, ni) => {
    const m = node.getWorldMatrix();
    for (const prim of node.getMesh().listPrimitives()) {
      const pos = prim.getAttribute("POSITION"), nor = prim.getAttribute("NORMAL"), uv = prim.getAttribute("TEXCOORD_0"), idx = prim.getIndices();
      material = material || prim.getMaterial();
      const n = pos.getCount(), v = [0, 0, 0], w = [0, 0];
      for (let i = 0; i < n; i++) {
        pos.getElement(i, v); const p = mulPoint(m, v[0], v[1], v[2]); P.push(p[0], p[1], p[2]);
        if (nor) { nor.getElement(i, v); const q = mulDir(m, v[0], v[1], v[2]), l = Math.hypot(q[0], q[1], q[2]) || 1; N.push(q[0] / l, q[1] / l, q[2] / l); } else N.push(0, 1, 0);
        if (uv) { uv.getElement(i, w); T.push(w[0], w[1]); } else T.push(0, 0);
      }
      const cnt = idx ? idx.getCount() : n;
      for (let i = 0; i < cnt; i += 3) { I.push(base + (idx ? idx.getScalar(i) : i), base + (idx ? idx.getScalar(i + 1) : i + 1), base + (idx ? idx.getScalar(i + 2) : i + 2)); part.push(ni); }
      base += n;
    }
  });
  return { P: new Float32Array(P), N: new Float32Array(N), T: new Float32Array(T), I: new Uint32Array(I), part: new Int32Array(part), names: nodes.map((n) => n.getName()), material };
}
function bounds(P, I, filter) {
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  const add = (i) => { for (let k = 0; k < 3; k++) { const v = P[i * 3 + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; } };
  if (I) for (let t = 0; t < I.length / 3; t++) { if (filter && !filter(t)) continue; add(I[t * 3]); add(I[t * 3 + 1]); add(I[t * 3 + 2]); }
  else for (let i = 0; i < P.length / 3; i++) add(i);
  return { min, max, size: max.map((v, k) => v - min[k]), center: max.map((v, k) => (v + min[k]) / 2) };
}
const centroid = (P, I, t) => { const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3; return [(P[a] + P[b] + P[c]) / 3, (P[a + 1] + P[b + 1] + P[c + 1]) / 3, (P[a + 2] + P[b + 2] + P[c + 2]) / 3]; };

// ---- 1. the source, and its parts
const srcDoc = await io.read(path.resolve(OUT, cfg.src));
const S = flatten(srcDoc);
const sb = bounds(S.P);
// The part of every source triangle, taken from a segmented twin of the source (the same triangles, split into nodes).
async function transfer(segFile) {
  const out = new Int32Array(S.I.length / 3).fill(0);
  const G = flatten(await io.read(path.resolve(OUT, segFile)));
  const gb = bounds(G.P);
  // the segmented twin may have been normalised on upload: fit it back onto the source by their boxes
  const k = sb.size.map((v, i) => v / gb.size[i]), sc = (k[0] + k[1] + k[2]) / 3;
  if (Math.max(...k) / Math.min(...k) > 1.03) console.warn("warning: the segmented model's box is not a scaled copy of the source's", k);
  const cell = Math.max(...sb.size) / 400, key = (x, y, z) => Math.round(x / cell) + "," + Math.round(y / cell) + "," + Math.round(z / cell), grid = new Map();
  for (let t = 0; t < G.I.length / 3; t++) {
    const c = centroid(G.P, G.I, t).map((v, i) => (v - gb.center[i]) * sc + sb.center[i]);
    const kk = key(c[0], c[1], c[2]);
    let arr = grid.get(kk); if (!arr) grid.set(kk, (arr = []));
    arr.push(c[0], c[1], c[2], G.part[t]);
  }
  let exact = 0, far = 0;
  for (let t = 0; t < S.I.length / 3; t++) {
    const c = centroid(S.P, S.I, t), cx = Math.round(c[0] / cell), cy = Math.round(c[1] / cell), cz = Math.round(c[2] / cell);
    let best = 1e9, bp = -1;
    for (let r = 1; r <= 3 && bp < 0; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const arr = grid.get(cx + dx + "," + (cy + dy) + "," + (cz + dz));
      if (!arr) continue;
      for (let j = 0; j < arr.length; j += 4) { const d = (arr[j] - c[0]) ** 2 + (arr[j + 1] - c[1]) ** 2 + (arr[j + 2] - c[2]) ** 2; if (d < best) { best = d; bp = arr[j + 3]; } }
    }
    if (bp < 0) { far++; bp = 0; } else if (best < (cell * 0.05) ** 2) exact++;
    out[t] = bp;
  }
  console.log(`${segFile}: ${G.names.length} parts; triangles matched exactly ${(100 * exact / out.length).toFixed(1)}%, unmatched ${far}`);
  return { label: out, names: G.names };
}
let label = new Int32Array(S.I.length / 3).fill(0), partNames = ["0"];
if (cfg.seg) { const r = await transfer(cfg.seg); label = r.label; partNames = r.names; }
// a second, finer split of the same model: some of its parts are lifted out as groups of their own (cfg.lift)
let label2 = cfg.seg2 ? (await transfer(cfg.seg2)).label : null;

// ---- 2. the arcade's frame: +Y up, +Z forward
const fwd = cfg.forward || "+z";
const rot = { "+z": [1, 0, 0, 1], "-z": [-1, 0, 0, -1], "+x": [0, 0, -1, 1, 0, 0], "-x": [0, 0, 1, -1, 0, 0] };
// (x, z) -> (x', z'): forward maps to +Z, keeping the model right-handed
const R = fwd === "+x" ? (x, z) => [-z, x] : fwd === "-x" ? (x, z) => [z, -x] : fwd === "-z" ? (x, z) => [-x, -z] : (x, z) => [x, z];
for (let i = 0; i < S.P.length; i += 3) { const [x, z] = R(S.P[i], S.P[i + 2]); S.P[i] = x; S.P[i + 2] = z; const [nx, nz] = R(S.N[i], S.N[i + 2]); S.N[i] = nx; S.N[i + 2] = nz; }
let b = bounds(S.P);
const sz = cfg.size || { axis: "max", value: 1 };
const scale = sz.value / (sz.axis === "max" ? Math.max(...b.size) : b.size["xyz".indexOf(sz.axis)]);
const origin = cfg.origin === "ground" ? [b.center[0], b.min[1], b.center[2]] : b.center;
for (let i = 0; i < S.P.length; i += 3) { S.P[i] = (S.P[i] - origin[0]) * scale; S.P[i + 1] = (S.P[i + 1] - origin[1]) * scale; S.P[i + 2] = (S.P[i + 2] - origin[2]) * scale; }
b = bounds(S.P);
console.log(`${cfg.name}: ${S.I.length / 3} triangles, size ${b.size.map((v) => v.toFixed(3)).join(" x ")} (x right, y up, z forward)`);

// ---- 2b. symmetry (cfg.mirror): find the model's own plane of symmetry (a small turn about the upright axis and a
// shift sideways), put it on x = 0, then keep one half and reflect it. The result is exactly symmetrical about one
// straight centreline, whatever the generator delivered. Parts named ...L / ...R swap sides in the reflection.
let mir = null; // per triangle: 1 when it is a reflected copy
const symmetry = {};
if (cfg.mirror) {
  const M = Object.assign({ keep: "+x", align: true }, cfg.mirror === true ? {} : cfg.mirror);
  if (M.align) {
    const nV = S.P.length / 3, stepV = Math.max(1, Math.floor(nV / 30000)), pts = [];
    for (let i = 0; i < nV; i += stepV) pts.push(S.P[i * 3], S.P[i * 3 + 1], S.P[i * 3 + 2]);
    const cell = Math.max(...b.size) / 160, H = (x, y, z) => (Math.round(x / cell) * 73856093) ^ (Math.round(y / cell) * 19349663) ^ (Math.round(z / cell) * 83492791);
    // a candidate plane's score: the share of sampled points whose reflection lands in an occupied cell
    const score = (th, cx) => {
      const co = Math.cos(th), si = Math.sin(th), set = new Set(), q = new Float32Array(pts.length);
      for (let i = 0; i < pts.length; i += 3) { q[i] = pts[i] * co + pts[i + 2] * si - cx; q[i + 1] = pts[i + 1]; q[i + 2] = -pts[i] * si + pts[i + 2] * co; set.add(H(q[i], q[i + 1], q[i + 2])); }
      let hit = 0;
      for (let i = 0; i < q.length; i += 3) if (set.has(H(-q[i], q[i + 1], q[i + 2]))) hit++;
      return hit / (q.length / 3);
    };
    let best = { s: -1, th: 0, cx: 0 };
    const w = b.size[0], D = Math.PI / 180;
    const search = (t0, t1, dt, c0, c1, dc) => { for (let th = t0; th <= t1 + 1e-9; th += dt) for (let cx = c0; cx <= c1 + 1e-9; cx += dc) { const sc = score(th, cx); if (sc > best.s) best = { s: sc, th, cx }; } };
    const s0 = score(0, 0);
    search(-4 * D, 4 * D, 0.5 * D, -0.03 * w, 0.03 * w, 0.006 * w);
    search(best.th - 0.5 * D, best.th + 0.5 * D, 0.1 * D, best.cx - 0.006 * w, best.cx + 0.006 * w, 0.0015 * w);
    const co = Math.cos(best.th), si = Math.sin(best.th);
    for (let i = 0; i < S.P.length; i += 3) {
      const x = S.P[i], z = S.P[i + 2]; S.P[i] = x * co + z * si - best.cx; S.P[i + 2] = -x * si + z * co;
      const nx = S.N[i], nz = S.N[i + 2]; S.N[i] = nx * co + nz * si; S.N[i + 2] = -nx * si + nz * co;
    }
    Object.assign(symmetry, { delivered: +s0.toFixed(3), turned_deg: +(best.th / D).toFixed(2), shifted: +(best.cx / w).toFixed(4), aligned: +best.s.toFixed(3) });
    console.log(`symmetry: as delivered ${(100 * s0).toFixed(1)}% of points have a mirror twin; best plane is turned ${(best.th / D).toFixed(2)} deg and shifted ${(100 * best.cx / w).toFixed(2)}% of the width: ${(100 * best.s).toFixed(1)}%`);
  }
  const sg = M.keep === "-x" ? -1 : 1, eps = Math.max(...b.size) * 2e-5;
  const P = Array.from(S.P), N = Array.from(S.N), T = Array.from(S.T), I2 = [], L1 = [], L2 = label2 ? [] : null, cut = new Map();
  const side = (i) => { const x = P[i * 3] * sg; return x > eps ? 1 : x < -eps ? -1 : 0; };
  const mid = (i, j) => { // where the edge i-j crosses the plane (one new vertex per edge, shared by its two triangles)
    const k = i < j ? i + ":" + j : j + ":" + i;
    let v = cut.get(k);
    if (v === undefined) {
      const xi = P[i * 3], xj = P[j * 3], t = xi / (xi - xj), lerp = (A, n, c) => A[i * n + c] + (A[j * n + c] - A[i * n + c]) * t;
      v = P.length / 3;
      P.push(0, lerp(P, 3, 1), lerp(P, 3, 2));
      const ny = lerp(N, 3, 1), nz = lerp(N, 3, 2), l = Math.hypot(ny, nz) || 1;
      N.push(0, ny / l, nz / l);
      T.push(lerp(T, 2, 0), lerp(T, 2, 1));
      cut.set(k, v);
    }
    return v;
  };
  const keepTri = (a, bb, c, t) => { I2.push(a, bb, c); L1.push(label[t]); if (L2) L2.push(label2[t]); };
  for (let t = 0; t < S.I.length / 3; t++) {
    const v = [S.I[t * 3], S.I[t * 3 + 1], S.I[t * 3 + 2]], sd = v.map(side);
    if (sd[0] >= 0 && sd[1] >= 0 && sd[2] >= 0) { if (sd[0] + sd[1] + sd[2] > 0) keepTri(v[0], v[1], v[2], t); continue; }
    if (sd[0] <= 0 && sd[1] <= 0 && sd[2] <= 0) continue;
    const poly = [];
    for (let k = 0; k < 3; k++) { const i = v[k], j = v[(k + 1) % 3], a = sd[k], c = sd[(k + 1) % 3]; if (a >= 0) poly.push(i); if ((a > 0 && c < 0) || (a < 0 && c > 0)) poly.push(mid(i, j)); }
    for (let k = 1; k + 1 < poly.length; k++) keepTri(poly[0], poly[k], poly[k + 1], t);
  }
  const twin = new Map();
  const reflect = (i) => {
    let v = twin.get(i);
    if (v !== undefined) return v;
    if (Math.abs(P[i * 3]) <= eps) { P[i * 3] = 0; const l = Math.hypot(N[i * 3 + 1], N[i * 3 + 2]) || 1; N[i * 3] = 0; N[i * 3 + 1] /= l; N[i * 3 + 2] /= l; v = i; } // on the plane: shared by both halves
    else { v = P.length / 3; P.push(-P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); N.push(-N[i * 3], N[i * 3 + 1], N[i * 3 + 2]); T.push(T[i * 2], T[i * 2 + 1]); }
    twin.set(i, v);
    return v;
  };
  const kept = I2.length / 3, flags = new Uint8Array(kept * 2);
  for (let t = 0; t < kept; t++) { const a = I2[t * 3], bb = I2[t * 3 + 1], c = I2[t * 3 + 2]; I2.push(reflect(a), reflect(c), reflect(bb)); L1.push(L1[t]); if (L2) L2.push(L2[t]); flags[kept + t] = 1; }
  S.P = new Float32Array(P); S.N = new Float32Array(N); S.T = new Float32Array(T); S.I = new Uint32Array(I2);
  label = Int32Array.from(L1); if (L2) label2 = Int32Array.from(L2);
  mir = flags;
  b = bounds(S.P);
  Object.assign(symmetry, { mirrored: true, kept: M.keep });
  console.log(`mirrored: kept the ${M.keep} half (${kept} triangles), reflected it; size now ${b.size.map((v) => v.toFixed(3)).join(" x ")}`);
}
const mirrorName = (g) => (cfg.mirror && cfg.mirror.pairs && cfg.mirror.pairs[g]) || (/L$/.test(g) ? g.slice(0, -1) + "R" : /R$/.test(g) ? g.slice(0, -1) + "L" : g);

// ---- 3. parts: where each lies
const nParts = partNames.length, pb = [];
for (let p = 0; p < nParts; p++) { let n = 0; const bb = bounds(S.P, S.I, (t) => label[t] === p && !(mir && mir[t]) && ++n); pb.push(Object.assign(bb, { tris: n })); }
if (REPORT || cfg.verbose) pb.forEach((q, p) => q.tris && console.log(`  part ${String(p).padStart(2)}  ${String(q.tris).padStart(7)} tris  centre ${q.center.map((v) => v.toFixed(2).padStart(6)).join(" ")}  size ${q.size.map((v) => v.toFixed(2)).join(" x ")}  x[${q.min[0].toFixed(2)},${q.max[0].toFixed(2)}] y[${q.min[1].toFixed(2)},${q.max[1].toFixed(2)}] z[${q.min[2].toFixed(2)},${q.max[2].toFixed(2)}]`));
if (REPORT) process.exit(0);

// ---- 4. groups. cfg.groups: { name: [part ids] | { where: "expression over c (centre), s (size), min, max" } }
const groupOf = new Array(nParts).fill("body"), groupNames = ["body"];
for (const [g, spec] of Object.entries(cfg.groups || {})) {
  groupNames.push(g);
  if (Array.isArray(spec)) spec.forEach((p) => (groupOf[p] = g));
  else { const f = new Function("c", "s", "min", "max", "tris", "return (" + spec.where + ");"); pb.forEach((q, p) => { if (q.tris && groupOf[p] === "body" && f(q.center, q.size, q.min, q.max, q.tris)) groupOf[p] = g; }); }
}
const triGroup = new Array(label.length);
for (let t = 0; t < label.length; t++) triGroup[t] = groupOf[label[t]];
if (label2 && cfg.lift) for (const [g, ids] of Object.entries(cfg.lift)) { if (!groupNames.includes(g)) groupNames.push(g); const set = new Set(ids); for (let t = 0; t < label.length; t++) if (set.has(label2[t])) triGroup[t] = g; }
if (mir) for (let t = 0; t < label.length; t++) if (mir[t]) { const g = mirrorName(triGroup[t]); triGroup[t] = g; if (!groupNames.includes(g)) groupNames.push(g); }
const groups = {};
for (const g of groupNames) groups[g] = { tris: [] };
for (let t = 0; t < label.length; t++) groups[triGroup[t]].tris.push(t);
const totalTris = label.length, target = cfg.tris || 80000;

// ---- 5. the document
const doc = new Document();
doc.createBuffer();
const scene = doc.createScene(cfg.name), root = doc.createNode(cfg.name);
scene.addChild(root);

// textures
const texSize = cfg.tex || 2048, baseSize = cfg.texBase || texSize, srcMat = S.material;
const img = async (tex) => (tex ? sharp(Buffer.from(tex.getImage())) : null);
const baseTex = srcMat.getBaseColorTexture(), mrTex = srcMat.getMetallicRoughnessTexture(), nrmTex = srcMat.getNormalTexture();
const mat = doc.createMaterial(cfg.name).setDoubleSided(cfg.doubleSided !== false).setRoughnessFactor(1).setMetallicFactor(1);
const addTex = async (name, buf, set) => { const t = doc.createTexture(name).setImage(buf).setMimeType("image/webp"); set(t); return buf.length; };
const sizes = {};
const base = await (await img(baseTex)).resize(baseSize, baseSize, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = base.data, npx = baseSize * baseSize;
const hsv = (i) => {
  const r = px[i * 3] / 255, g = px[i * 3 + 1] / 255, bl = px[i * 3 + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
  let h = 0;
  if (d > 1e-5) { h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx];
};
// how far inside a range a value is, 0..1, with soft edges (hue ranges may wrap past 360)
const soft = (x, lo, hi, edge) => Math.min(1, Math.max(0, (x - lo) / edge + 1)) * Math.min(1, Math.max(0, (hi - x) / edge + 1));
const hueIn = (h, a, c, edge = 12) => { if (a <= c) return soft(h, a, c, edge); return Math.max(soft(h, a, 360 + edge, edge), soft(h, -edge, c, edge)); };

// ---- surface rules by part ("paint"): which group every texel belongs to (the triangles drawn into the map by
// their UVs), then per rule a roughness, a metalness, a glow or a colour change for the texels of some groups,
// optionally only where the base colour is in a range. This is how one generated map gets horn, chrome and membrane.
const fields = { rough: null, metal: null, glow: null };
if (cfg.paint) {
  const lab = new Uint8Array(npx), gid = new Map(groupNames.map((g, i) => [g, i + 1])), W = baseSize;
  for (let t = 0; t < label.length; t++) {
    const id = gid.get(triGroup[t]), ia = S.I[t * 3] * 2, ib = S.I[t * 3 + 1] * 2, ic = S.I[t * 3 + 2] * 2;
    const fu = Math.floor(Math.min(S.T[ia], S.T[ib], S.T[ic])), fv = Math.floor(Math.min(S.T[ia + 1], S.T[ib + 1], S.T[ic + 1]));
    const x0 = (S.T[ia] - fu) * W, y0 = (S.T[ia + 1] - fv) * W, x1 = (S.T[ib] - fu) * W, y1 = (S.T[ib + 1] - fv) * W, x2 = (S.T[ic] - fu) * W, y2 = (S.T[ic + 1] - fv) * W;
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0), sg = area < 0 ? -1 : 1;
    const l0 = Math.hypot(x2 - x1, y2 - y1) || 1, l1 = Math.hypot(x0 - x2, y0 - y2) || 1, l2 = Math.hypot(x1 - x0, y1 - y0) || 1;
    const xa = Math.max(0, Math.floor(Math.min(x0, x1, x2) - 1)), xb = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2) + 1)), ya = Math.max(0, Math.floor(Math.min(y0, y1, y2) - 1)), yb = Math.min(W - 1, Math.ceil(Math.max(y0, y1, y2) + 1));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      const d0 = sg * ((x2 - x1) * (cy - y1) - (y2 - y1) * (cx - x1)) / l0, d1 = sg * ((x0 - x2) * (cy - y2) - (y0 - y2) * (cx - x2)) / l1, d2 = sg * ((x1 - x0) * (cy - y0) - (y1 - y0) * (cx - x0)) / l2;
      if (d0 >= -0.6 && d1 >= -0.6 && d2 >= -0.6) lab[y * W + x] = id;
    }
  }
  for (let pass = 0; pass < 4; pass++) { // grow into the gutters, so filtering at an island's edge finds the same surface
    const src = lab.slice();
    for (let y = 1; y < W - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!src[i]) lab[i] = src[i - 1] || src[i + 1] || src[i - W] || src[i + W]; }
  }
  // (a rule's value and how much of it: the map keeps the rest)
  const rv = new Float32Array(npx), rw = new Float32Array(npx), mv = new Float32Array(npx), mw = new Float32Array(npx), glow = (fields.glow = new Float32Array(npx));
  fields.rough = { v: rv, w: rw }; fields.metal = { v: mv, w: mw };
  const rules = cfg.paint.map((r) => Object.assign({}, r, { ids: new Set((r.groups || groupNames).map((g) => gid.get(g))) }));
  const counts = rules.map(() => 0);
  for (let i = 0; i < npx; i++) {
    const id = lab[i];
    if (!id) continue;
    let c = null;
    rules.forEach((r, ri) => {
      if (!r.ids.has(id)) return;
      let w = r.blend === undefined ? 1 : r.blend;
      if (r.where) { c = hsv(i); if (r.where.h) w *= hueIn(c[0], r.where.h[0], r.where.h[1]); if (r.where.s) w *= soft(c[1], r.where.s[0], r.where.s[1], 0.06); if (r.where.v) w *= soft(c[2], r.where.v[0], r.where.v[1], 0.06); }
      if (w <= 0.003) return;
      counts[ri]++;
      if (r.rough !== undefined) { rv[i] = rv[i] * (1 - w) + r.rough * w; rw[i] = rw[i] * (1 - w) + w; }
      if (r.metal !== undefined) { mv[i] = mv[i] * (1 - w) + r.metal * w; mw[i] = mw[i] * (1 - w) + w; }
      if (r.glow) glow[i] = Math.max(glow[i], r.glow * w);
      if (r.color || r.sat !== undefined || r.val !== undefined) {
        let R = px[i * 3], G = px[i * 3 + 1], B = px[i * 3 + 2];
        const k = r.color || [1, 1, 1], gray = 0.299 * R + 0.587 * G + 0.114 * B, sa = r.sat === undefined ? 1 : r.sat, va = r.val === undefined ? 1 : r.val;
        const nr = Math.min(255, (gray + (R - gray) * sa) * va * k[0]), ng = Math.min(255, (gray + (G - gray) * sa) * va * k[1]), nb = Math.min(255, (gray + (B - gray) * sa) * va * k[2]);
        px[i * 3] = R + (nr - R) * w; px[i * 3 + 1] = G + (ng - G) * w; px[i * 3 + 2] = B + (nb - B) * w;
      }
    });
  }
  rules.forEach((r, ri) => console.log(`paint ${ri} (${(r.groups || ["all"]).join(",")}${r.where ? " where " + JSON.stringify(r.where) : ""}): ${(100 * counts[ri] / npx).toFixed(2)}% of the map`));
}

// the glow map: the neon in the base colour (saturated, bright, in the asset's light colours), plus what the rules ask for
const E = Object.assign({ hues: [[150, 350]], sat: [0.45, 0.7], val: [0.45, 0.75], gain: 1, size: Math.min(2048, baseSize), median: 3 }, cfg.emissive || {});
const em = Buffer.alloc(npx * 3);
let lit = 0;
for (let i = 0; i < npx; i++) {
  const [h, s, mx] = hsv(i);
  let hk = 0;
  for (const [a, c] of E.hues) hk = Math.max(hk, hueIn(h, a, c));
  let k = hk * Math.min(1, Math.max(0, (s - E.sat[0]) / (E.sat[1] - E.sat[0]))) * Math.min(1, Math.max(0, (mx - E.val[0]) / (E.val[1] - E.val[0]))) * E.gain;
  if (fields.glow) k = Math.max(k, fields.glow[i]);
  if (k > 0.02) { lit++; em[i * 3] = Math.min(255, px[i * 3] * k); em[i * 3 + 1] = Math.min(255, px[i * 3 + 1] * k); em[i * 3 + 2] = Math.min(255, px[i * 3 + 2] * k); }
}
console.log(`emissive: ${(100 * lit / npx).toFixed(2)}% of the map glows`);
sizes.base = await addTex("baseColor", await sharp(px, { raw: base.info }).webp({ quality: cfg.q || 92, effort: 5 }).toBuffer(), (t) => mat.setBaseColorTexture(t));
// (a median first: single lit texels at an island's edge are noise, and on the model they are a dotted line of light)
let emImg = sharp(em, { raw: base.info });
if (E.median > 1) emImg = sharp(await emImg.median(E.median).raw().toBuffer(), { raw: base.info });
sizes.emissive = await addTex("emissive", await emImg.resize(E.size, E.size).blur(0.5).webp({ quality: 90, effort: 5 }).toBuffer(), (t) => mat.setEmissiveTexture(t).setEmissiveFactor([1, 1, 1]));
if (mrTex) {
  // metal and roughness, with the asset's floor and ceiling (a mirror with no roughness at all sparkles in motion)
  const M = Object.assign({ roughMin: 0, roughMax: 1, roughMul: 1, metalMul: 1 }, cfg.surface || {});
  const mr = await (await img(mrTex)).resize(texSize, texSize, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const kq = baseSize / texSize;
  for (let i = 0; i < texSize * texSize; i++) {
    let ro = Math.min(M.roughMax, Math.max(M.roughMin, (mr.data[i * 3 + 1] / 255) * M.roughMul)), me = Math.min(1, (mr.data[i * 3 + 2] / 255) * M.metalMul);
    if (fields.rough) {
      const x = i % texSize, y = (i / texSize) | 0, j = Math.min(baseSize - 1, Math.floor((y + 0.5) * kq)) * baseSize + Math.min(baseSize - 1, Math.floor((x + 0.5) * kq));
      ro = ro * (1 - fields.rough.w[j]) + fields.rough.v[j];
      me = me * (1 - fields.metal.w[j]) + fields.metal.v[j];
    }
    mr.data[i * 3] = 255; mr.data[i * 3 + 1] = Math.round(255 * ro); mr.data[i * 3 + 2] = Math.round(255 * me);
  }
  sizes.mr = await addTex("metalRough", await sharp(mr.data, { raw: mr.info }).webp({ quality: 90, effort: 5 }).toBuffer(), (t) => mat.setMetallicRoughnessTexture(t));
}
if (nrmTex) sizes.normal = await addTex("normal", await (await img(nrmTex)).resize(texSize, texSize, { kernel: "lanczos3" }).removeAlpha().webp({ quality: 95, effort: 5 }).toBuffer(), (t) => mat.setNormalTexture(t).setNormalScale(cfg.normalScale || 1));
const buffer = doc.getRoot().listBuffers()[0];

// geometry, group by group
const info = { parts: {}, anchors: {}, size: b.size, source: cfg.src };
if (cfg.mirror) info.symmetry = symmetry;
let outTris = 0;
for (const g of groupNames) {
  const tl = groups[g].tris;
  if (!tl.length) continue;
  // this group's own vertices
  const remap = new Map(), P = [], N = [], T = [], I = new Uint32Array(tl.length * 3);
  tl.forEach((t, k) => { for (let j = 0; j < 3; j++) { const v = S.I[t * 3 + j]; let nv = remap.get(v); if (nv === undefined) { nv = P.length / 3; remap.set(v, nv); P.push(S.P[v * 3], S.P[v * 3 + 1], S.P[v * 3 + 2]); N.push(S.N[v * 3], S.N[v * 3 + 1], S.N[v * 3 + 2]); T.push(S.T[v * 2], S.T[v * 2 + 1]); } I[k * 3 + j] = nv; } });
  let gp = new Float32Array(P), gn = new Float32Array(N), gt = new Float32Array(T);
  // cfg.weld: a mesh delivered as loose triangles (Rodin's) is welded first, where position and texture coordinate
  // agree (a texture seam stays a seam), its normals averaged: then the careful simplifier can work on it
  if (cfg.weld) {
    const key = new Map(), q = 1e5, qt = 1e5, P3 = [], N3 = [], T3 = [], cnt = [];
    const re = new Uint32Array(gp.length / 3);
    for (let v = 0; v < gp.length / 3; v++) {
      const k = Math.round(gp[v * 3] * q) + "," + Math.round(gp[v * 3 + 1] * q) + "," + Math.round(gp[v * 3 + 2] * q) + "|" + Math.round(gt[v * 2] * qt) + "," + Math.round(gt[v * 2 + 1] * qt);
      let n = key.get(k);
      if (n === undefined) { n = P3.length / 3; key.set(k, n); P3.push(gp[v * 3], gp[v * 3 + 1], gp[v * 3 + 2]); N3.push(0, 0, 0); T3.push(gt[v * 2], gt[v * 2 + 1]); }
      N3[n * 3] += gn[v * 3]; N3[n * 3 + 1] += gn[v * 3 + 1]; N3[n * 3 + 2] += gn[v * 3 + 2];
      re[v] = n;
    }
    for (let n = 0; n < N3.length / 3; n++) { const l = Math.hypot(N3[n * 3], N3[n * 3 + 1], N3[n * 3 + 2]) || 1; N3[n * 3] /= l; N3[n * 3 + 1] /= l; N3[n * 3 + 2] /= l; }
    for (let i = 0; i < I.length; i++) I[i] = re[I[i]];
    if (g === groupNames[0]) console.log(`weld: ${gp.length / 3} vertices to ${P3.length / 3}`);
    gp = new Float32Array(P3); gn = new Float32Array(N3); gt = new Float32Array(T3);
  }
  const gb = bounds(gp);
  // simplify: its share of the triangle budget (small parts keep more of themselves)
  const share = Math.max(Math.min(tl.length, cfg.minPart || 600), Math.round((tl.length / totalTris) * target * ((cfg.keep || {})[g] || 1)));
  let idx = I;
  if (share < tl.length) {
    const attrs = new Float32Array((gp.length / 3) * 5);
    for (let i = 0; i < gp.length / 3; i++) { attrs[i * 5] = gn[i * 3]; attrs[i * 5 + 1] = gn[i * 3 + 1]; attrs[i * 5 + 2] = gn[i * 3 + 2]; attrs[i * 5 + 3] = gt[i * 2]; attrs[i * 5 + 4] = gt[i * 2 + 1]; }
    let [res] = MeshoptSimplifier.simplifyWithAttributes(I, gp, 3, attrs, 5, [0.5, 0.5, 0.5, 1.5, 1.5], null, share * 3, cfg.error || 0.02, ["LockBorder"]);
    // cfg.sloppy: a mesh delivered as loose triangles (Rodin's) is nearly all border, so the careful simplifier can hardly
    // take anything away; for a model seen small or far off, cluster its vertices instead (its UVs stay its own)
    if (cfg.sloppy && res.length > share * 3 * 1.5) [res] = MeshoptSimplifier.simplifySloppy(I, gp, 3, null, share * 3, 1);
    idx = res;
  }
  // drop the vertices nothing uses any more
  const used = new Map(), P2 = [], N2 = [], T2 = [], I2 = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) { const v = idx[i]; let nv = used.get(v); if (nv === undefined) { nv = P2.length / 3; used.set(v, nv); P2.push(gp[v * 3], gp[v * 3 + 1], gp[v * 3 + 2]); N2.push(gn[v * 3], gn[v * 3 + 1], gn[v * 3 + 2]); T2.push(gt[v * 2], gt[v * 2 + 1]); } I2[i] = nv; }
  // pivot: where the part hinges. "c" centre, "min"/"max" an edge of its box, or a number, per axis
  const pv = ((cfg.pivots || {})[g] || ["c", "c", "c"]).map((s, k) => (s === "c" ? gb.center[k] : s === "min" ? gb.min[k] : s === "max" ? gb.max[k] : +s));
  for (let i = 0; i < P2.length; i += 3) { P2[i] -= pv[0]; P2[i + 1] -= pv[1]; P2[i + 2] -= pv[2]; }
  const prim = doc.createPrimitive().setMaterial(mat)
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(P2)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(N2)).setBuffer(buffer))
    .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(T2)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(P2.length / 3 > 65535 ? I2 : new Uint16Array(I2)).setBuffer(buffer));
  const node = doc.createNode(g).setMesh(doc.createMesh(g).addPrimitive(prim)).setTranslation(pv);
  info.parts[g] = { pivot: pv.map((v) => +v.toFixed(4)), min: gb.min.map((v) => +v.toFixed(4)), max: gb.max.map((v) => +v.toFixed(4)), tris: I2.length / 3 };
  groups[g].node = node; groups[g].box = gb;
  outTris += I2.length / 3;
}
// the tree: cfg.tree = { child: parent } (a hand hangs from a forearm); everything else hangs from the root
for (const g of groupNames) {
  if (!groups[g].node) continue;
  const parent = (cfg.tree || {})[g];
  if (parent && groups[parent] && groups[parent].node) {
    const pp = info.parts[parent].pivot, cp = info.parts[g].pivot;
    groups[g].node.setTranslation([cp[0] - pp[0], cp[1] - pp[1], cp[2] - pp[2]]);
    groups[parent].node.addChild(groups[g].node);
  } else root.addChild(groups[g].node);
}
// anchors: named points for effects. { name: { of: group, at: ["c" | "min" | "max" | number, ...], d: [dx, dy, dz] } } or { name: [x, y, z] }
for (const [name, a] of Object.entries(cfg.anchors || {})) {
  let p;
  if (Array.isArray(a)) p = a;
  else { const gb = a.of ? groups[a.of].box : b; p = a.at.map((s, k) => (s === "c" ? gb.center[k] : s === "min" ? gb.min[k] : s === "max" ? gb.max[k] : +s)); if (a.d) p = p.map((v, k) => v + a.d[k]); }
  const parent = !Array.isArray(a) && a.ride && groups[a.ride] && groups[a.ride].node;
  const node = doc.createNode("anchor_" + name);
  if (parent) { let q = info.parts[a.ride].pivot; node.setTranslation([p[0] - q[0], p[1] - q[1], p[2] - q[2]]); parent.addChild(node); } else { node.setTranslation(p); root.addChild(node); }
  info.anchors[name] = p.map((v) => +v.toFixed(4));
}
root.setExtras({ inr: info });

// ---- 6. pack and write
doc.createExtension(EXTTextureWebP).setRequired(true);
await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: "high" }));
const outFile = path.join(ARCADE, "assets", "models", cfg.name + ".glb");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
await io.write(outFile, doc);
const kb = (n) => (n / 1024).toFixed(0) + " KB";
console.log(`wrote ${path.relative(ARCADE, outFile)}: ${kb(fs.statSync(outFile).size)}; ${outTris} triangles in ${Object.keys(info.parts).length} parts; maps ${texSize}px: base ${kb(sizes.base)}, metal/rough ${kb(sizes.mr || 0)}, normal ${kb(sizes.normal || 0)}, emissive ${kb(sizes.emissive)}`);
fs.writeFileSync(outFile.replace(/\.glb$/, ".json"), JSON.stringify(Object.assign({ name: cfg.name, triangles: outTris, bytes: fs.statSync(outFile).size, tex: texSize }, info), null, 1));
