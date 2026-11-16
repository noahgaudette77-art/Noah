#!/usr/bin/env node
/**
 * Turn a rigged, animated candidate into a boss the game loads: rigid armour parts on a motion-captured skeleton.
 *
 *   GEN_OUT=<dir> node tools/gen/process-rigged.mjs tools/gen/assets/<name>.json [--report]
 *
 * Tripo's auto-rig binds one soft skin to a skeleton, and on these machines that stretches plates, cases and robes
 * like rubber. A robot's armour is rigid, so this tool keeps the skeleton and its retargeted clips and throws the
 * soft skin away:
 *   - reads the rigged .glb (one skinned mesh, 4K maps, a skeleton, the clips of one retarget request) and any
 *     further clip files of the same rig
 *   - reads the model's segmented twin (the same triangles split into parts by Tripo): every part goes, whole, to
 *     the one bone that owns most of it (twist bones count as the bone they twist), so a briefcase follows the
 *     hand and a shoulder plate the collar bone, and nothing bends
 *   - writes each bone's parts as an ordinary mesh hanging from that bone (its geometry moved into the bone's own
 *     space with the bone's inverse bind matrix): no skinning at run time, and any part can be torn off
 *   - stands the model in the arcade's frame (+Y up, facing +Z, feet on the ground, a set height) under one root
 *   - simplifies each bone's mesh (borders locked), packs the maps as WebP with a glow map from the base colour
 *   - renames the clips to the game's names, drops tracks that never move and the twist bones' tracks
 *   - packs it: meshopt-compressed .glb in arcade/assets/models/<name>.glb and its notes in <name>.json
 * With --report it prints the parts, the bone each would go to and how clear that choice is, and writes nothing.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { meshopt, prune, dedup, resample } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARCADE = path.join(HERE, "..", "..");
const OUT = process.env.GEN_OUT || path.join(HERE, "out");
const args = process.argv.slice(2), REPORT = args.includes("--report");
const cfgFile = args.find((a) => a.endsWith(".json"));
if (!cfgFile) { console.error("usage: process-rigged.mjs <asset.json> [--report]"); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

// ---- column-major 4x4 helpers
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const mulPoint = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const mulDir = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
function bounds(P) {
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { const v = P[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  return { min, max, size: max.map((v, k) => v - min[k]), center: max.map((v, k) => (v + min[k]) / 2) };
}

// ---- 1. the rigged model: its one skinned mesh and its skeleton
const doc = await io.read(path.resolve(OUT, cfg.src));
const root = doc.getRoot(), skin = root.listSkins()[0];
const meshNode = root.listNodes().find((n) => n.getSkin() && n.getMesh());
if (!skin || !meshNode) { console.error("no skinned mesh in " + cfg.src); process.exit(1); }
const prims = meshNode.getMesh().listPrimitives();
if (prims.length !== 1) console.warn("warning: " + prims.length + " primitives; only the first is used");
const prim = prims[0], srcMat = prim.getMaterial();
const joints = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray(), jname = joints.map((j) => j.getName());
const P = prim.getAttribute("POSITION").getArray(), N = prim.getAttribute("NORMAL").getArray(), T = prim.getAttribute("TEXCOORD_0").getArray(), I = prim.getIndices().getArray();
const JA = prim.getAttribute("JOINTS_0"), WA = prim.getAttribute("WEIGHTS_0"), nV = P.length / 3, nT = I.length / 3;
const IBM = joints.map((_, k) => Array.from(ibm.slice(k * 16, k * 16 + 16)));
// twist bones, toes and the like have no part of their own: their share counts for the bone they belong to
const ALIAS = [[/(Upperarm|Forearm|Thigh|Calf)Twist\d+$/, "$1"], [/ToeBase$/, "Foot"], [/^Pelvis$/, "Hip"], [/^NeckTwist01$/, "Spine02"], [/^NeckTwist02$/, "Head"]].concat((cfg.alias || []).map(([a, b]) => [new RegExp(a), b]));
const owner = jname.map((n) => { let m = n; for (const [re, to] of ALIAS) m = m.replace(re, to); const k = jname.indexOf(m); return k < 0 ? jname.indexOf(n) : k; });
// every vertex where the rest pose puts it, in the file's world (to match the segmented twin, and to measure)
const B = joints.map((j, k) => mul(j.getWorldMatrix(), IBM[k]));
const PW = new Float32Array(nV * 3), VJ = new Uint16Array(nV * 4), VW = new Float32Array(nV * 4), jw = [0, 0, 0, 0], ww = [0, 0, 0, 0];
for (let i = 0; i < nV; i++) {
  JA.getElement(i, jw); WA.getElement(i, ww);
  const s = ww[0] + ww[1] + ww[2] + ww[3] || 1;
  let x = 0, y = 0, z = 0;
  for (let k = 0; k < 4; k++) { VJ[i * 4 + k] = jw[k]; VW[i * 4 + k] = ww[k] / s; if (ww[k] > 0) { const p = mulPoint(B[jw[k]], P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); x += p[0] * ww[k] / s; y += p[1] * ww[k] / s; z += p[2] * ww[k] / s; } }
  PW[i * 3] = x; PW[i * 3 + 1] = y; PW[i * 3 + 2] = z;
}
const wb = bounds(PW);
console.log(`${cfg.name}: ${nT} triangles, ${joints.length} joints, rest pose ${wb.size.map((v) => v.toFixed(3)).join(" x ")}; clips: ${root.listAnimations().map((a) => a.getName()).join(", ")}`);

// ---- 2. parts: the segmented twin's label for every triangle (matched by where the triangles are)
const centroid = (A, t) => { const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3; return [(A[a] + A[b] + A[c]) / 3, (A[a + 1] + A[b + 1] + A[c + 1]) / 3, (A[a + 2] + A[b + 2] + A[c + 2]) / 3]; };
let label = new Int32Array(nT).fill(-1), nParts = 0;
if (cfg.seg) {
  const sdoc = await io.read(path.resolve(OUT, cfg.seg));
  const GP = [], GL = [];
  sdoc.getRoot().listNodes().filter((n) => n.getMesh()).forEach((node, ni) => {
    const m = node.getWorldMatrix();
    for (const p of node.getMesh().listPrimitives()) {
      const pos = p.getAttribute("POSITION").getArray(), idx = p.getIndices() ? p.getIndices().getArray() : null, cnt = idx ? idx.length : pos.length / 3;
      for (let i = 0; i < cnt; i += 3) {
        let cx = 0, cy = 0, cz = 0;
        for (let k = 0; k < 3; k++) { const v = (idx ? idx[i + k] : i + k) * 3, q = mulPoint(m, pos[v], pos[v + 1], pos[v + 2]); cx += q[0] / 3; cy += q[1] / 3; cz += q[2] / 3; }
        GP.push(cx, cy, cz); GL.push(ni);
      }
    }
    nParts = ni + 1;
  });
  // the twin may sit in another frame (turned a quarter about the upright axis, scaled, shifted): try the four
  // quarter turns and keep the one whose box fits and whose triangles land on the model's
  const gb0 = bounds(GP);
  let best = null;
  for (let q = 0; q < 4; q++) {
    const co = Math.round(Math.cos(q * Math.PI / 2)), si = Math.round(Math.sin(q * Math.PI / 2)), Q = new Float32Array(GP.length);
    for (let i = 0; i < GP.length; i += 3) { Q[i] = GP[i] * co + GP[i + 2] * si; Q[i + 1] = GP[i + 1]; Q[i + 2] = -GP[i] * si + GP[i + 2] * co; }
    const gb = bounds(Q), k = wb.size.map((v, i) => v / gb.size[i]), spread = Math.max(...k) / Math.min(...k);
    if (spread > 1.06) continue;
    const sc = (k[0] + k[1] + k[2]) / 3, cell = Math.max(...wb.size) / 300, grid = new Map(), key = (x, y, z) => x + "," + y + "," + z;
    for (let i = 0; i < Q.length; i += 3) { const x = (Q[i] - gb.center[0]) * sc + wb.center[0], y = (Q[i + 1] - gb.center[1]) * sc + wb.center[1], z = (Q[i + 2] - gb.center[2]) * sc + wb.center[2], kk = key(Math.round(x / cell), Math.round(y / cell), Math.round(z / cell)); let arr = grid.get(kk); if (!arr) grid.set(kk, (arr = [])); arr.push(x, y, z, GL[i / 3]); }
    const lab = new Int32Array(nT).fill(-1);
    let exact = 0, far = 0;
    for (let t = 0; t < nT; t++) {
      const c = centroid(PW, t), cx = Math.round(c[0] / cell), cy = Math.round(c[1] / cell), cz = Math.round(c[2] / cell);
      let bd = 1e9, bp = -1;
      for (let r = 1; r <= 3 && bp < 0; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        const arr = grid.get(key(cx + dx, cy + dy, cz + dz));
        if (!arr) continue;
        for (let j = 0; j < arr.length; j += 4) { const d = (arr[j] - c[0]) ** 2 + (arr[j + 1] - c[1]) ** 2 + (arr[j + 2] - c[2]) ** 2; if (d < bd) { bd = d; bp = arr[j + 3]; } }
      }
      if (bp < 0) far++; else if (bd < (cell * 0.1) ** 2) exact++;
      lab[t] = bp;
    }
    if (!best || exact > best.exact) best = { q, exact, far, lab };
  }
  if (!best) { console.error("the segmented twin's box does not fit the rigged model's in any quarter turn"); process.exit(1); }
  label = best.lab;
  console.log(`${cfg.seg}: ${nParts} parts; quarter turn ${best.q}; triangles matched exactly ${(100 * best.exact / nT).toFixed(1)}%, unmatched ${best.far}`);
}

// ---- 3. each part's bone. cfg.bones overrides a part: { "<part>": "L_Hand" }; cfg.mode forces how: { "<part>": "whole" | "limb" | "bands" }
//   whole: a part one bone clearly owns goes to it, whole (a briefcase to the hand, a shoulder plate to its arm)
//   limb:  a limb that came as one part (thigh, shin and foot together) is cut where its bones meet, so it bends
//   trunk: a torso that several trunk bones share goes, whole, to the trunk bone that owns most of it (never to a limb)
//   bands: a robe or cloak (a trunk part most of the model's height) is cut into bands: hood on the head, mantle on
//          the chest, skirt on the hips (its share on the legs counts for the hips: a skirt hangs, it does not walk)
const area = (t) => { const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3, ux = PW[b] - PW[a], uy = PW[b + 1] - PW[a + 1], uz = PW[b + 2] - PW[a + 2], vx = PW[c] - PW[a], vy = PW[c + 1] - PW[a + 1], vz = PW[c + 2] - PW[a + 2]; return 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx); };
const J = (n) => jname.indexOf(n), TRUNK = new Set(["Hip", "Waist", "Spine01", "Spine02", "Head", "L_Clavicle", "R_Clavicle"].map(J).filter((k) => k >= 0));
// the trunk's own reading of who owns what: legs and waist count for the hips, collar bones for the chest
const trunkOwner = owner.map((o) => { const n = jname[o]; const to = /_(Thigh|Calf|Foot)$/.test(n) || n === "Waist" ? "Hip" : /_Clavicle$/.test(n) ? "Spine02" : n; const k = J(to); return k < 0 ? o : k; });
const triBone = new Int32Array(nT).fill(-1), nP = Math.max(1, nParts);
const partAcc = Array.from({ length: nP }, () => new Float64Array(joints.length)), partTris = new Int32Array(nP), partBox = Array.from({ length: nP }, () => ({ min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] })), partList = Array.from({ length: nP }, () => []);
for (let t = 0; t < nT; t++) {
  const p = Math.max(0, label[t]), ar = area(t) + 1e-12;
  partTris[p]++; partList[p].push(t);
  for (let k = 0; k < 3; k++) { const v = I[t * 3 + k]; for (let q = 0; q < 4; q++) partAcc[p][owner[VJ[v * 4 + q]]] += VW[v * 4 + q] * ar; for (let c = 0; c < 3; c++) { const x = PW[v * 3 + c]; if (x < partBox[p].min[c]) partBox[p].min[c] = x; if (x > partBox[p].max[c]) partBox[p].max[c] = x; } }
}
// triangles that touch (by position: the mesh is split along its UV seams), for smoothing a cut
const weld = new Int32Array(nV), wmap = new Map(), wq = 1 / (Math.max(...wb.size) * 2e-5);
for (let i = 0; i < nV; i++) { const k = Math.round(PW[i * 3] * wq) + "," + Math.round(PW[i * 3 + 1] * wq) + "," + Math.round(PW[i * 3 + 2] * wq); let w = wmap.get(k); if (w === undefined) { w = wmap.size; wmap.set(k, w); } weld[i] = w; }
function cut(tl, own) {
  // each triangle to the bone that owns most of it, then the cut smoothed and stray islands joined to what surrounds them
  const lab = new Int32Array(tl.length), acc = new Float64Array(joints.length), edge = new Map(), nb = tl.map(() => []);
  tl.forEach((t, i) => { acc.fill(0); for (let k = 0; k < 3; k++) { const v = I[t * 3 + k]; for (let q = 0; q < 4; q++) acc[own[VJ[v * 4 + q]]] += VW[v * 4 + q]; } let b = 0; for (let j = 1; j < acc.length; j++) if (acc[j] > acc[b]) b = j; lab[i] = b; });
  tl.forEach((t, i) => { for (let k = 0; k < 3; k++) { const u = weld[I[t * 3 + k]], v = weld[I[t * 3 + (k + 1) % 3]], key = u < v ? u * 4194304 + v : v * 4194304 + u, o = edge.get(key); if (o === undefined) edge.set(key, i); else { nb[i].push(o); nb[o].push(i); } } });
  for (let pass = 0; pass < 4; pass++) { const prev = lab.slice(); for (let i = 0; i < lab.length; i++) { const c = new Map([[prev[i], 1]]); for (const o of nb[i]) c.set(prev[o], (c.get(prev[o]) || 0) + 1); let best = prev[i], bn = c.get(prev[i]); for (const [l, n] of c) if (n > bn) { best = l; bn = n; } lab[i] = best; } }
  const comp = new Int32Array(lab.length).fill(-1), minSize = Math.max(60, tl.length * 0.004);
  for (let i = 0; i < lab.length; i++) {
    if (comp[i] >= 0) continue;
    const stack = [i], mem = []; comp[i] = i;
    while (stack.length) { const x = stack.pop(); mem.push(x); for (const o of nb[x]) if (comp[o] < 0 && lab[o] === lab[i]) { comp[o] = i; stack.push(o); } }
    if (mem.length >= minSize) continue;
    const c = new Map(); for (const x of mem) for (const o of nb[x]) if (lab[o] !== lab[i]) c.set(lab[o], (c.get(lab[o]) || 0) + 1);
    let best = -1, bn = 0; for (const [l, n] of c) if (n > bn) { best = l; bn = n; }
    if (best >= 0) for (const x of mem) lab[x] = best;
  }
  return lab;
}
// a cape (cfg.cape: [part ids]) hangs from the chest even where it lies over the arms: a sleeve follows its arm, a cape does not
const capeOwner = trunkOwner.map((o) => (/_(Upperarm|Forearm|Hand)$/.test(jname[o]) && J("Spine02") >= 0 ? J("Spine02") : o)), capes = new Set((cfg.cape || []).map(Number));
const WHOLE = cfg.whole === undefined ? 0.66 : cfg.whole, ROBE = cfg.robe === undefined ? 0.6 : cfg.robe, modes = {};
for (let p = 0; p < nP; p++) {
  if (!partTris[p]) continue;
  const acc = partAcc[p], tot = acc.reduce((a, b) => a + b, 0) || 1, order = [...acc.keys()].sort((a, b) => acc[b] - acc[a]), top = acc[order[0]] / tot;
  let trunk = 0; for (const k of TRUNK) trunk += acc[k] / tot;
  const tall = (partBox[p].max[1] - partBox[p].min[1]) / wb.size[1], forced = (cfg.bones || {})[p];
  // (a part that both sides of the body share, a pelvis plate on both thighs, a yoke on both arms, is the trunk's)
  let left = 0, right = 0; for (let j = 0; j < acc.length; j++) { if (/^L_/.test(jname[j])) left += acc[j] / tot; else if (/^R_/.test(jname[j])) right += acc[j] / tot; }
  let mode = (cfg.mode || {})[p] || (forced !== undefined || top >= WHOLE ? "whole" : tall > ROBE ? "bands" : trunk >= 0.25 || Math.min(left, right) >= 0.2 ? "trunk" : "limb"), bone = order[0];
  if (forced !== undefined) { bone = J(forced); if (bone < 0) { console.error("no such bone: " + forced); process.exit(1); } }
  else if (mode === "trunk") {
    // the highest trunk bone with a real share of it: what must not come apart is where the arms and the head meet the chest
    const ta = new Float64Array(joints.length); for (let j = 0; j < acc.length; j++) ta[trunkOwner[j]] += acc[j] / tot;
    const sh = (n) => (J(n) < 0 ? 0 : ta[J(n)]);
    bone = J(sh("Head") >= 0.5 ? "Head" : sh("Spine02") >= 0.15 ? "Spine02" : sh("Spine01") >= 0.15 ? "Spine01" : "Hip");
    if (bone < 0) bone = order[0];
  }
  let how = jname[bone];
  if (mode === "whole" || mode === "trunk") for (const t of partList[p]) triBone[t] = bone;
  else { const lab = cut(partList[p], mode === "bands" ? (capes.has(p) ? capeOwner : trunkOwner) : owner), n = new Map(); partList[p].forEach((t, i) => { triBone[t] = lab[i]; n.set(lab[i], (n.get(lab[i]) || 0) + 1); }); how = [...n].sort((a, b) => b[1] - a[1]).map(([l, c]) => jname[l] + " " + Math.round(100 * c / lab.length) + "%").join(", "); }
  modes[p] = mode;
  if (REPORT || cfg.verbose) console.log(`  part ${String(p).padStart(2)}  ${String(partTris[p]).padStart(6)} tris  y[${partBox[p].min[1].toFixed(2)},${partBox[p].max[1].toFixed(2)}] x[${partBox[p].min[0].toFixed(2)},${partBox[p].max[0].toFixed(2)}] z[${partBox[p].min[2].toFixed(2)},${partBox[p].max[2].toFixed(2)}]  ${mode.padEnd(5)} -> ${how}   (owners: ${order.slice(0, 3).map((j) => jname[j] + " " + (100 * acc[j] / tot).toFixed(0) + "%").join(", ")}; trunk ${(100 * trunk).toFixed(0)}%)`);
}
if (REPORT) process.exit(0);

// ---- 4. the arcade's frame: one root over the armature, turned to face +Z, scaled, feet on the ground
const jpos = (n) => { const j = joints[jname.indexOf(n)]; if (!j) return null; const m = j.getWorldMatrix(); return [m[12], m[13], m[14]]; };
const lh = jpos("L_Hand") || jpos("L_Upperarm"), rh = jpos("R_Hand") || jpos("R_Upperarm");
let turn = 0;
if (lh && rh) { const lx = lh[0] - rh[0], lz = lh[2] - rh[2], fx = -lz, fz = lx; turn = -Math.atan2(fx, fz); } // forward = left x up; turn it onto +Z
if (cfg.turn !== undefined) turn = cfg.turn * Math.PI / 180;
const co = Math.cos(turn), si = Math.sin(turn), rotY = (x, z) => [x * co + z * si, -x * si + z * co];
const RW = new Float32Array(PW.length);
for (let i = 0; i < PW.length; i += 3) { const [x, z] = rotY(PW[i], PW[i + 2]); RW[i] = x; RW[i + 1] = PW[i + 1]; RW[i + 2] = z; }
const rb = bounds(RW), sz = cfg.size || { axis: "y", value: 1 }, scale = sz.value / rb.size["xyz".indexOf(sz.axis)];
const wrap = doc.createNode(cfg.name).setRotation([0, Math.sin(turn / 2), 0, Math.cos(turn / 2)]).setScale([scale, scale, scale]).setTranslation([-rb.center[0] * scale, -rb.min[1] * scale, -rb.center[2] * scale]);
const scene = root.listScenes()[0];
for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); }
scene.addChild(wrap);
const size = rb.size.map((v) => +(v * scale).toFixed(4));
console.log(`frame: turned ${(turn * 180 / Math.PI).toFixed(1)} deg, scaled ${scale.toFixed(3)}: ${size.join(" x ")} (x right, y up, z forward)`);

// ---- 5. maps: base colour, a glow map from its neon, metal/roughness, normal (WebP)
const texSize = cfg.tex || 2048, baseSize = cfg.texBase || texSize;
const img = async (tex) => (tex ? sharp(Buffer.from(tex.getImage())) : null);
const baseTex = srcMat.getBaseColorTexture(), mrTex = srcMat.getMetallicRoughnessTexture(), nrmTex = srcMat.getNormalTexture();
const mat = doc.createMaterial(cfg.name).setDoubleSided(cfg.doubleSided !== false).setRoughnessFactor(1).setMetallicFactor(1);
const addTex = async (name, buf, set) => { const t = doc.createTexture(name).setImage(buf).setMimeType("image/webp"); set(t); return buf.length; };
const sizes = {};
const base = await (await img(baseTex)).resize(baseSize, baseSize, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = base.data, npx = baseSize * baseSize;
const soft = (x, lo, hi, edge) => Math.min(1, Math.max(0, (x - lo) / edge + 1)) * Math.min(1, Math.max(0, (hi - x) / edge + 1));
const hueIn = (h, a, c, edge = 12) => (a <= c ? soft(h, a, c, edge) : Math.max(soft(h, a, 360 + edge, edge), soft(h, -edge, c, edge)));
const E = Object.assign({ hues: [[150, 350]], sat: [0.45, 0.7], val: [0.45, 0.75], gain: 1, size: Math.min(2048, baseSize), median: 3 }, cfg.emissive || {});
const C = Object.assign({ val: 1, sat: 1 }, cfg.color || {}); // the whole base colour, darker or richer (never the neon)
const em = Buffer.alloc(npx * 3);
let lit = 0;
// cfg.hue: [{ from: [a, b], to: c }]: colours whose hue is in the band are turned so the band's middle lands on c
if (cfg.hue) for (let i = 0; i < npx; i++) {
  const r = px[i * 3] / 255, g = px[i * 3 + 1] / 255, bl = px[i * 3 + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
  if (d < 0.04) continue;
  let h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360;
  for (const rule of cfg.hue) {
    const w = hueIn(h, rule.from[0], rule.from[1], 10) * Math.min(1, (d / mx) / 0.25);
    if (w <= 0.01) continue;
    const mid = (rule.from[0] + rule.from[1]) / 2, nh = (((h + (rule.to - mid) * w) % 360) + 360) % 360, sat = Math.min(1, (d / mx) * (rule.sat || 1)), c = mx * sat, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = mx - c, k = Math.floor(nh / 60) % 6;
    const [nr, ng, nb] = k === 0 ? [c, x, 0] : k === 1 ? [x, c, 0] : k === 2 ? [0, c, x] : k === 3 ? [0, x, c] : k === 4 ? [x, 0, c] : [c, 0, x];
    px[i * 3] = Math.round((nr + m) * 255); px[i * 3 + 1] = Math.round((ng + m) * 255); px[i * 3 + 2] = Math.round((nb + m) * 255);
    break;
  }
}
for (let i = 0; i < npx; i++) {
  const r = px[i * 3] / 255, g = px[i * 3 + 1] / 255, bl = px[i * 3 + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn, s = mx ? d / mx : 0;
  let h = 0;
  if (d > 1e-5) { h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  let hk = 0;
  for (const [a, c] of E.hues) hk = Math.max(hk, hueIn(h, a, c));
  const k = hk * Math.min(1, Math.max(0, (s - E.sat[0]) / (E.sat[1] - E.sat[0]))) * Math.min(1, Math.max(0, (mx - E.val[0]) / (E.val[1] - E.val[0]))) * E.gain;
  if (k > 0.02) { lit++; em[i * 3] = Math.min(255, px[i * 3] * k); em[i * 3 + 1] = Math.min(255, px[i * 3 + 1] * k); em[i * 3 + 2] = Math.min(255, px[i * 3 + 2] * k); }
  if (C.val !== 1 || C.sat !== 1) { const w = 1 - Math.min(1, k * 2), gray = 0.299 * px[i * 3] + 0.587 * px[i * 3 + 1] + 0.114 * px[i * 3 + 2]; for (let c = 0; c < 3; c++) { const v = px[i * 3 + c], nv = Math.min(255, (gray + (v - gray) * C.sat) * C.val); px[i * 3 + c] = v + (nv - v) * w; } }
}
console.log(`emissive: ${(100 * lit / npx).toFixed(2)}% of the map glows`);
sizes.base = await addTex("baseColor", await sharp(px, { raw: base.info }).webp({ quality: cfg.q || 90, effort: 5 }).toBuffer(), (t) => mat.setBaseColorTexture(t));
let emImg = sharp(em, { raw: base.info });
if (E.median > 1) emImg = sharp(await emImg.median(E.median).raw().toBuffer(), { raw: base.info });
sizes.emissive = await addTex("emissive", await emImg.resize(E.size, E.size).blur(0.5).webp({ quality: 90, effort: 5 }).toBuffer(), (t) => mat.setEmissiveTexture(t).setEmissiveFactor([1, 1, 1]));
if (mrTex) {
  const M = Object.assign({ roughMin: 0.14, roughMax: 1, roughMul: 1, metalMul: 1 }, cfg.surface || {});
  const mr = await (await img(mrTex)).resize(texSize, texSize, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < texSize * texSize; i++) { mr.data[i * 3] = 255; mr.data[i * 3 + 1] = Math.round(255 * Math.min(M.roughMax, Math.max(M.roughMin, (mr.data[i * 3 + 1] / 255) * M.roughMul))); mr.data[i * 3 + 2] = Math.round(Math.min(255, mr.data[i * 3 + 2] * M.metalMul)); }
  sizes.mr = await addTex("metalRough", await sharp(mr.data, { raw: mr.info }).webp({ quality: 90, effort: 5 }).toBuffer(), (t) => mat.setMetallicRoughnessTexture(t));
}
if (nrmTex) sizes.normal = await addTex("normal", await (await img(nrmTex)).resize(texSize, texSize, { kernel: "lanczos3" }).removeAlpha().webp({ quality: 94, effort: 5 }).toBuffer(), (t) => mat.setNormalTexture(t).setNormalScale(cfg.normalScale || 1));

// ---- 6. geometry: each bone's triangles, moved into the bone's own space, as a mesh hanging from the bone
const buffer = root.listBuffers()[0], target = cfg.tris || 70000, info = { bones: {}, clips: {}, size, source: cfg.src, joints: {} };
const byBone = new Map();
for (let t = 0; t < nT; t++) { const b = triBone[t]; let arr = byBone.get(b); if (!arr) byBone.set(b, (arr = [])); arr.push(t); }
let outTris = 0, capTris = 0;
const inner = doc.createMaterial(cfg.name + "_inner").setBaseColorFactor(cfg.innerColor || [0.035, 0.036, 0.05, 1]).setRoughnessFactor(0.38).setMetallicFactor(0.9).setDoubleSided(true);
for (const [b, tl] of byBone) {
  const remap = new Map(), gp = [], gn = [], gt = [], idx0 = new Uint32Array(tl.length * 3), M = IBM[b];
  tl.forEach((t, k) => { for (let j = 0; j < 3; j++) { const v = I[t * 3 + j]; let nv = remap.get(v); if (nv === undefined) { nv = gp.length / 3; remap.set(v, nv); const p = mulPoint(M, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]), n = mulDir(M, N[v * 3], N[v * 3 + 1], N[v * 3 + 2]), l = Math.hypot(n[0], n[1], n[2]) || 1; gp.push(p[0], p[1], p[2]); gn.push(n[0] / l, n[1] / l, n[2] / l); gt.push(T[v * 2], T[v * 2 + 1]); } idx0[k * 3 + j] = nv; } });
  const GPf = new Float32Array(gp), GNf = new Float32Array(gn), GTf = new Float32Array(gt);
  const want = Math.max(Math.min(tl.length, cfg.minPart || 500), Math.round((tl.length / nT) * target * ((cfg.keep || {})[jname[b]] || 1)));
  let idx = idx0;
  if (want < tl.length) {
    const attrs = new Float32Array((GPf.length / 3) * 5);
    for (let i = 0; i < GPf.length / 3; i++) { attrs[i * 5] = GNf[i * 3]; attrs[i * 5 + 1] = GNf[i * 3 + 1]; attrs[i * 5 + 2] = GNf[i * 3 + 2]; attrs[i * 5 + 3] = GTf[i * 2]; attrs[i * 5 + 4] = GTf[i * 2 + 1]; }
    idx = MeshoptSimplifier.simplifyWithAttributes(idx0, GPf, 3, attrs, 5, [0.5, 0.5, 0.5, 1.5, 1.5], null, want * 3, cfg.error || 0.02, ["LockBorder"])[0];
  }
  const used = new Map(), P2 = [], N2 = [], T2 = [], I2 = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) { const v = idx[i]; let nv = used.get(v); if (nv === undefined) { nv = P2.length / 3; used.set(v, nv); P2.push(GPf[v * 3], GPf[v * 3 + 1], GPf[v * 3 + 2]); N2.push(GNf[v * 3], GNf[v * 3 + 1], GNf[v * 3 + 2]); T2.push(GTf[v * 2], GTf[v * 2 + 1]); } I2[i] = nv; }
  info.bones[jname[b]] = { tris: I2.length / 3 };
  const pr = doc.createPrimitive().setMaterial(mat)
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(P2)).setBuffer(buffer))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(N2)).setBuffer(buffer))
    .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(new Float32Array(T2)).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType("SCALAR").setArray(P2.length / 3 > 65535 ? I2 : new Uint16Array(I2)).setBuffer(buffer));
  const mesh = doc.createMesh("part_" + jname[b]).addPrimitive(pr);
  // caps: where this bone's shell was cut from its neighbours it is open, and a turned arm would show the hollow
  // inside. Every open rim is closed with a dark disc (a fan from its middle), in a plain dark material of its own.
  const KEY = 16777216, cnt = new Map(), out = new Map();
  for (let i = 0; i < I2.length; i += 3) for (let k = 0; k < 3; k++) { const u = I2[i + k], v = I2[i + (k + 1) % 3], key = u < v ? u * KEY + v : v * KEY + u; cnt.set(key, (cnt.get(key) || 0) + 1); }
  for (let i = 0; i < I2.length; i += 3) for (let k = 0; k < 3; k++) { const u = I2[i + k], v = I2[i + (k + 1) % 3], key = u < v ? u * KEY + v : v * KEY + u; if (cnt.get(key) === 1) { let a = out.get(u); if (!a) out.set(u, (a = [])); a.push(v); } }
  const CP = [], CN = [], CI = [];
  let caps = 0;
  for (const start of [...out.keys()]) {
    const loop = [];
    let u = start;
    while (out.get(u) && out.get(u).length) { const v = out.get(u).pop(); loop.push(u); u = v; if (u === start) break; if (loop.length > 20000) break; }
    if (u !== start || loop.length < 3) continue;
    if (loop.length < 8) continue;
    const stepL = Math.max(1, Math.ceil(loop.length / 20)), ring = loop.filter((_, i) => i % stepL === 0);
    if (ring.length < 5) continue;
    let cx = 0, cy = 0, cz = 0, nx = 0, ny = 0, nz = 0;
    for (const v of ring) { cx += P2[v * 3]; cy += P2[v * 3 + 1]; cz += P2[v * 3 + 2]; }
    cx /= ring.length; cy /= ring.length; cz /= ring.length;
    for (let i = 0; i < ring.length; i++) { const a = ring[i], c = ring[(i + 1) % ring.length]; nx += (P2[a * 3 + 1] - P2[c * 3 + 1]) * (P2[a * 3 + 2] + P2[c * 3 + 2]); ny += (P2[a * 3 + 2] - P2[c * 3 + 2]) * (P2[a * 3] + P2[c * 3]); nz += (P2[a * 3] - P2[c * 3]) * (P2[a * 3 + 1] + P2[c * 3 + 1]); }
    const l = Math.hypot(nx, ny, nz) || 1; nx /= -l; ny /= -l; nz /= -l; // (the rim runs with the shell's winding: the cap faces the other way)
    // a shallow dome, not a flat lid: when a limb turns far from its rest pose the cap shows, and reads as the ball
    // of a joint. Rim, a ring at 60% of the way in lifted a little, the middle lifted more.
    let rad = 0;
    for (const v of ring) rad += Math.hypot(P2[v * 3] - cx, P2[v * 3 + 1] - cy, P2[v * 3 + 2] - cz);
    rad /= ring.length;
    if (rad * scale < (cfg.capMin || 0.012)) continue; // (too small to see into)
    let per = 0, ax = 0, ay = 0, az = 0;
    for (let i = 0; i < ring.length; i++) { const a = ring[i] * 3, c = ring[(i + 1) % ring.length] * 3; per += Math.hypot(P2[a] - P2[c], P2[a + 1] - P2[c + 1], P2[a + 2] - P2[c + 2]); ax += (P2[a + 1] - cy) * (P2[c + 2] - cz) - (P2[a + 2] - cz) * (P2[c + 1] - cy); ay += (P2[a + 2] - cz) * (P2[c] - cx) - (P2[a] - cx) * (P2[c + 2] - cz); az += (P2[a] - cx) * (P2[c + 1] - cy) - (P2[a + 1] - cy) * (P2[c] - cx); }
    if (4 * Math.PI * (0.5 * Math.hypot(ax, ay, az)) / (per * per) < (cfg.capRound || 0.4)) continue; // (the edge of an open sheet, not the mouth of a shell: a lid across it would show)
    const lift = rad * (cfg.dome === undefined ? 0.32 : cfg.dome), n = ring.length, base = CP.length / 3;
    CP.push(cx + nx * lift, cy + ny * lift, cz + nz * lift); CN.push(nx, ny, nz);
    for (const v of ring) { const x = P2[v * 3], y = P2[v * 3 + 1], z = P2[v * 3 + 2], ox = x - cx, oy = y - cy, oz = z - cz, l = Math.hypot(ox, oy, oz) || 1; CP.push(x, y, z); CN.push(ox / l * 0.8 + nx * 0.6, oy / l * 0.8 + ny * 0.6, oz / l * 0.8 + nz * 0.6); }
    for (const v of ring) { const x = cx + (P2[v * 3] - cx) * 0.6 + nx * lift * 0.72, y = cy + (P2[v * 3 + 1] - cy) * 0.6 + ny * lift * 0.72, z = cz + (P2[v * 3 + 2] - cz) * 0.6 + nz * lift * 0.72, ox = x - cx, oy = y - cy, oz = z - cz, l = Math.hypot(ox, oy, oz) || 1; CP.push(x, y, z); CN.push(ox / l * 0.45 + nx * 0.9, oy / l * 0.45 + ny * 0.9, oz / l * 0.45 + nz * 0.9); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, a = base + 1 + i, b2 = base + 1 + j, c = base + 1 + n + i, d = base + 1 + n + j; CI.push(c, b2, a, c, d, b2, base, d, c); }
    caps++;
  }
  if (CI.length) {
    mesh.addPrimitive(doc.createPrimitive().setMaterial(inner)
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(CP)).setBuffer(buffer))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(new Float32Array(CN)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(CP.length / 3 > 65535 ? new Uint32Array(CI) : new Uint16Array(CI)).setBuffer(buffer)));
    capTris += CI.length / 3;
  }
  // (a holder of its own under the bone: the bone is animated, and packing may put a transform on the mesh's node)
  joints[b].addChild(doc.createNode("part_" + jname[b]).setMesh(mesh));
  info.bones[jname[b]].caps = caps;
  outTris += I2.length / 3;
}
// the soft skin goes
const oldMesh = meshNode.getMesh();
meshNode.setSkin(null).setMesh(null); meshNode.dispose(); skin.dispose(); oldMesh.dispose(); srcMat.dispose();

// ---- 7. clips: this file's, and those of further retarget requests on the same rig; renamed to the game's names
const nodeByName = new Map(root.listNodes().map((n) => [n.getName(), n]));
for (const f of cfg.more || []) {
  const d2 = await io.read(path.resolve(OUT, f));
  for (const a of d2.getRoot().listAnimations()) {
    const na = doc.createAnimation(a.getName()), smap = new Map();
    for (const ch of a.listChannels()) {
      const tn = ch.getTargetNode(), node = tn && nodeByName.get(tn.getName());
      if (!node) continue;
      const s = ch.getSampler();
      let ns = smap.get(s);
      if (!ns) { ns = doc.createAnimationSampler().setInterpolation(s.getInterpolation()).setInput(doc.createAccessor().setType("SCALAR").setArray(new Float32Array(s.getInput().getArray())).setBuffer(buffer)).setOutput(doc.createAccessor().setType(s.getOutput().getType()).setArray(new Float32Array(s.getOutput().getArray())).setBuffer(buffer)); smap.set(s, ns); na.addSampler(ns); }
      na.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(ch.getTargetPath()).setSampler(ns));
    }
  }
}
// which joints carry something (a mesh of their own or below them): the others' tracks are dropped
const carries = new Map();
const walk = (n) => { let c = !!n.getMesh(); for (const k of n.listChildren()) c = walk(k) || c; carries.set(n, c); return c; };
walk(wrap);
const near = (a, b, tol) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > tol) return false; return true; };
let dropped = 0, kept = 0;
for (const a of root.listAnimations()) {
  const want = cfg.clips ? cfg.clips[a.getName()] : a.getName();
  if (cfg.clips && !want) { a.listChannels().forEach((c) => c.dispose()); a.listSamplers().forEach((s) => s.dispose()); a.dispose(); continue; }
  a.setName(want);
  let dur = 0;
  for (const ch of a.listChannels()) {
    const node = ch.getTargetNode(), s = ch.getSampler(), out = s.getOutput().getArray(), pathName = ch.getTargetPath(), n = pathName === "rotation" ? 4 : 3;
    const rest = pathName === "rotation" ? node.getRotation() : pathName === "scale" ? node.getScale() : node.getTranslation(), tol = pathName === "translation" ? 1e-4 * Math.max(...wb.size) : pathName === "rotation" ? 2e-4 : 1e-3;
    let still = true;
    for (let i = 0; i < out.length && still; i += n) { const v = Array.from(out.slice(i, i + n)); if (!near(v, rest, tol) && !(pathName === "rotation" && near(v.map((x) => -x), rest, tol))) still = false; }
    if (!carries.get(node) || still) { ch.dispose(); dropped++; continue; }
    kept++;
    const inp = s.getInput().getArray(); dur = Math.max(dur, inp[inp.length - 1]);
  }
  for (const s of a.listSamplers()) if (!a.listChannels().some((c) => c.getSampler() === s)) s.dispose();
  info.clips[want] = +dur.toFixed(3);
}
console.log(`clips: ${Object.entries(info.clips).map(([k, v]) => k + " " + v + " s").join(", ")}; tracks kept ${kept}, dropped ${dropped} (still, or on bones that carry nothing)`);
// where the game looks for things: the main joints, by the names the rig gives them
for (const [k, n] of Object.entries({ head: "Head", chest: "Spine02", hips: "Hip", handL: "L_Hand", handR: "R_Hand", footL: "L_Foot", footR: "R_Foot" })) if (jname.includes(n)) info.joints[k] = n;
wrap.setExtras({ inr: info });

// ---- 8. pack and write
doc.createExtension(EXTTextureWebP).setRequired(true);
await doc.transform(resample({ tolerance: cfg.resample || 1e-4 }), dedup(), prune({ keepLeaves: false }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
const outFile = path.join(ARCADE, "assets", "models", cfg.name + ".glb");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
await io.write(outFile, doc);
const kb = (n) => (n / 1024).toFixed(0) + " KB";
console.log(`wrote ${path.relative(ARCADE, outFile)}: ${kb(fs.statSync(outFile).size)}; ${outTris} triangles on ${byBone.size} bones (+${capTris} in caps); maps base ${baseSize}px ${kb(sizes.base)}, metal/rough ${kb(sizes.mr || 0)}, normal ${kb(sizes.normal || 0)}, emissive ${kb(sizes.emissive)}`);
fs.writeFileSync(outFile.replace(/\.glb$/, ".json"), JSON.stringify(Object.assign({ name: cfg.name, triangles: outTris, bytes: fs.statSync(outFile).size, tex: texSize }, info), null, 1));
