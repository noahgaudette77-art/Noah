#!/usr/bin/env node
/**
 * Turn a rigged, animated candidate into a character the game loads with its soft skin kept (Boss Rush's wizard,
 * 2026-11-23). The bosses are rigid armour (process-rigged.mjs throws the skin away so plates do not stretch); a
 * robe, a coat and a cape should bend, so here the skin stays.
 *
 *   GEN_OUT=<dir> node tools/gen/process-skinned.mjs tools/gen/assets/<name>.json [--report]
 *
 *   - reads the rigged .glb (one skinned mesh, 4K maps, a skeleton, the clips of one retarget request) and any
 *     further clip files of the same rig (cfg.more)
 *   - stands it in the arcade's frame under one root: +Y up, facing +Z, feet on the ground, a set height
 *   - simplifies the skinned mesh to cfg.tris (meshopt; its joints and weights kept with every vertex left)
 *   - writes a flutter mask per vertex (_FLUTTER, 0..1): how freely each point of the cape and the coat's skirts may
 *     move in the wind of a cast. The game moves them in the vertex shader after skinning (no cloth simulation).
 *     cfg.flutter: { back: how far behind the body the cape starts (a share of the height), top: the height (a share)
 *     above which nothing moves, skirt: the height below which the coat's skirts move, legR: a leg's radius (a share
 *     of the height) inside which the legs themselves stay still }
 *   - packs the maps as WebP: base colour, a glow map from its neon (cfg.emissive, as for the bosses), metal/rough,
 *     normal
 *   - renames the clips to the game's names (cfg.clips) and drops tracks that never move
 *   - writes arcade/assets/models/<name>.glb (meshopt) and <name>.json (its notes: joints, clips, size)
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
if (!cfgFile) { console.error("usage: process-skinned.mjs <asset.json> [--report]"); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

// ---- column-major 4x4 helpers
const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
const mulPoint = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
function bounds(P) {
  const min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { const v = P[i + k]; if (v < min[k]) min[k] = v; if (v > max[k]) max[k] = v; }
  return { min, max, size: max.map((v, k) => v - min[k]), center: max.map((v, k) => (v + min[k]) / 2) };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ---- 1. the rigged model: its skinned mesh and skeleton
const doc = await io.read(path.resolve(OUT, cfg.src));
const root = doc.getRoot(), skin = root.listSkins()[0];
const meshNode = root.listNodes().find((n) => n.getSkin() && n.getMesh());
if (!skin || !meshNode) { console.error("no skinned mesh in " + cfg.src); process.exit(1); }
const prims = meshNode.getMesh().listPrimitives();
if (prims.length !== 1) console.warn("warning: " + prims.length + " primitives; only the first is used");
const prim = prims[0], srcMat = prim.getMaterial();
const joints = skin.listJoints(), ibm = skin.getInverseBindMatrices().getArray(), jname = joints.map((j) => j.getName());
const PA = prim.getAttribute("POSITION"), NA = prim.getAttribute("NORMAL"), TA = prim.getAttribute("TEXCOORD_0"), JA = prim.getAttribute("JOINTS_0"), WA = prim.getAttribute("WEIGHTS_0");
const P = PA.getArray(), N = NA.getArray(), T = TA.getArray(), I = prim.getIndices().getArray(), nV = P.length / 3, nT = I.length / 3;
const IBM = joints.map((_, k) => Array.from(ibm.slice(k * 16, k * 16 + 16)));
const B = joints.map((j, k) => mul(j.getWorldMatrix(), IBM[k]));
// every vertex where the rest pose puts it, in the file's world
const PW = new Float32Array(nV * 3), jw = [0, 0, 0, 0], ww = [0, 0, 0, 0];
for (let i = 0; i < nV; i++) {
  JA.getElement(i, jw); WA.getElement(i, ww);
  const s = ww[0] + ww[1] + ww[2] + ww[3] || 1;
  let x = 0, y = 0, z = 0;
  for (let k = 0; k < 4; k++) if (ww[k] > 0) { const p = mulPoint(B[jw[k]], P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); x += p[0] * ww[k] / s; y += p[1] * ww[k] / s; z += p[2] * ww[k] / s; }
  PW[i * 3] = x; PW[i * 3 + 1] = y; PW[i * 3 + 2] = z;
}
const wb = bounds(PW);
console.log(`${cfg.name}: ${nT} triangles, ${nV} vertices, ${joints.length} joints, rest pose ${wb.size.map((v) => v.toFixed(3)).join(" x ")}; clips: ${root.listAnimations().map((a) => a.getName()).join(", ")}`);
console.log("joints: " + jname.join(", "));

// ---- 2. the arcade's frame: one root over everything, turned to face +Z, scaled, feet on the ground
const jpos = (n) => { const j = joints[jname.indexOf(n)]; if (!j) return null; const m = j.getWorldMatrix(); return [m[12], m[13], m[14]]; };
const lh = jpos("L_Hand") || jpos("L_Upperarm"), rh = jpos("R_Hand") || jpos("R_Upperarm");
let turn = 0;
if (lh && rh) { const lx = lh[0] - rh[0], lz = lh[2] - rh[2], fx = -lz, fz = lx; turn = -Math.atan2(fx, fz); } // forward = left x up; turned onto +Z
if (cfg.turn !== undefined) turn = cfg.turn * Math.PI / 180;
const co = Math.cos(turn), si = Math.sin(turn), rotY = (x, z) => [x * co + z * si, -x * si + z * co];
const RW = new Float32Array(PW.length);
for (let i = 0; i < PW.length; i += 3) { const [x, z] = rotY(PW[i], PW[i + 2]); RW[i] = x; RW[i + 1] = PW[i + 1]; RW[i + 2] = z; }
const rb = bounds(RW), sz = cfg.size || { axis: "y", value: 1 }, scale = sz.value / rb.size["xyz".indexOf(sz.axis)];
const size = rb.size.map((v) => +(v * scale).toFixed(4));
// the framed rest pose (metres from the feet, x right, y up, z forward), for the flutter mask and the report
const F = new Float32Array(RW.length);
for (let i = 0; i < RW.length; i += 3) { F[i] = (RW[i] - rb.center[0]) * scale; F[i + 1] = (RW[i + 1] - rb.min[1]) * scale; F[i + 2] = (RW[i + 2] - rb.center[2]) * scale; }
const H = size[1], jf = (n) => { const p = jpos(n); if (!p) return null; const [x, z] = rotY(p[0], p[2]); return [(x - rb.center[0]) * scale, (p[1] - rb.min[1]) * scale, (z - rb.center[2]) * scale]; };
console.log(`frame: turned ${(turn * 180 / Math.PI).toFixed(1)} deg, scaled ${scale.toFixed(4)}: ${size.join(" x ")} (x right, y up, z forward)`);
for (const n of ["Hip", "Spine02", "Head", "L_Hand", "R_Hand", "L_Calf", "R_Calf", "L_Foot", "R_Foot"]) { const p = jf(n); if (p) console.log(`  ${n.padEnd(8)} ${p.map((v) => v.toFixed(3)).join(", ")}`); }

// ---- 3. the flutter mask: the cape (behind the body, below the shoulders) and the coat's skirts (below the hips,
// away from the legs' own lines) may move; the rest is still. Strongest at the hem.
const FL = Object.assign({ back: 0.05, top: 0.8, skirt: 0.5, legR: 0.07, feather: 0.06 }, cfg.flutter || {});
const flutter = new Float32Array(nV);
const spine = jf("Spine02") || [0, H * 0.7, 0], hips = jf("Hip") || [0, H * 0.5, 0];
const legLine = ["L", "R"].map((sd) => [jf(sd + "_Thigh") || jf(sd + "_Upperleg") || [sd === "L" ? 0.1 * H : -0.1 * H, hips[1], 0], jf(sd + "_Foot") || jf(sd + "_Calf") || [sd === "L" ? 0.1 * H : -0.1 * H, 0, 0]]);
const distSeg = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], t = Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1))); return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t); };
let capeN = 0, skirtN = 0;
for (let i = 0; i < nV; i++) {
  const x = F[i * 3], y = F[i * 3 + 1], z = F[i * 3 + 2], yH = y / H;
  // the cape: behind the spine's plane by more than `back`, below `top`; freer the lower it hangs
  const behind = smooth(FL.back * H, (FL.back + FL.feather) * H, spine[2] - z), below = smooth(FL.top, FL.top - 0.25, yH);
  const cape = behind * below * (0.35 + 0.65 * smooth(FL.top, 0.05, yH));
  // the coat's skirts: below `skirt`, farther than a leg's radius from either leg's line
  const p = [x, y, z], dl = Math.min(distSeg(p, legLine[0][0], legLine[0][1]), distSeg(p, legLine[1][0], legLine[1][1]));
  const skirt = smooth(FL.skirt, FL.skirt - 0.12, yH) * smooth(FL.legR * H, (FL.legR + FL.feather) * H, dl) * 0.6;
  flutter[i] = Math.min(1, Math.max(cape, skirt));
  if (cape > 0.3) capeN++; else if (skirt > 0.3) skirtN++;
}
console.log(`flutter: ${capeN} vertices of cape, ${skirtN} of skirts, of ${nV}`);

// ---- 3b. the cape hangs from the body, not the arms: Tripo's skin gives the cape's points near the arms a share of
// the arm's bones, and an arm raised (a victory, a blow to the head) dragged the cape up over the head like a sheet.
// For each point of the cape, its arms' and legs' share goes (as much as it is cape) to the spine bone at its height.
const LIMB = /(Clavicle|Upperarm|Forearm|Hand|Elbow|Pinky|Ring|Mid|Index|Thumb|Thigh|Calf|Knee|Foot|Toe)/;
const trunk = ["Hip", "Spine01", "Spine02"].map((n) => ({ k: jname.indexOf(n), y: (jf(n) || [0, 0, 0])[1] })).filter((t) => t.k >= 0);
let moved = 0;
if (trunk.length && cfg.capeToTrunk !== false) {
  const jv = [0, 0, 0, 0], wv = [0, 0, 0, 0];
  for (let i = 0; i < nV; i++) {
    const behind = smooth(FL.back * H, (FL.back + FL.feather) * H, spine[2] - F[i * 3 + 2]), yH = F[i * 3 + 1] / H;
    const w = behind * smooth(FL.top + 0.04, FL.top - 0.06, yH); // (the whole cape below its shoulders; above them, the skin as it was)
    if (w < 0.02) continue;
    JA.getElement(i, jv); WA.getElement(i, wv);
    const m = new Map();
    for (let k = 0; k < 4; k++) if (wv[k] > 0) m.set(jv[k], (m.get(jv[k]) || 0) + wv[k]);
    let gone = 0;
    for (const [j, v] of m) if (LIMB.test(jname[j])) { const cut = v * w; m.set(j, v - cut); gone += cut; }
    if (gone < 1e-4) continue;
    let tb = trunk[0];
    for (const t of trunk) if (Math.abs(t.y - F[i * 3 + 1]) < Math.abs(tb.y - F[i * 3 + 1])) tb = t;
    m.set(tb.k, (m.get(tb.k) || 0) + gone);
    const top = [...m].filter(([, v]) => v > 1e-5).sort((a, b) => b[1] - a[1]).slice(0, 4), sum = top.reduce((a, [, v]) => a + v, 0) || 1;
    for (let k = 0; k < 4; k++) { jv[k] = top[k] ? top[k][0] : 0; wv[k] = top[k] ? top[k][1] / sum : 0; }
    JA.setElement(i, jv); WA.setElement(i, wv);
    moved++;
  }
}
console.log(`cape: ${moved} points hung from the trunk (${trunk.map((t) => jname[t.k]).join(", ")}) instead of the arms and legs`);
if (REPORT) process.exit(0);

const wrap = doc.createNode(cfg.name).setRotation([0, Math.sin(turn / 2), 0, Math.cos(turn / 2)]).setScale([scale, scale, scale]).setTranslation([-rb.center[0] * scale, -rb.min[1] * scale, -rb.center[2] * scale]);
const scene = root.listScenes()[0];
for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); }
scene.addChild(wrap);

// ---- 4. the mesh simplified, every attribute of every vertex left kept (its joints and weights with it)
const buffer = root.listBuffers()[0], target = Math.min(nT, cfg.tris || 30000);
let idx = I;
if (target < nT) {
  const attrs = new Float32Array(nV * 5);
  for (let i = 0; i < nV; i++) { attrs[i * 5] = N[i * 3]; attrs[i * 5 + 1] = N[i * 3 + 1]; attrs[i * 5 + 2] = N[i * 3 + 2]; attrs[i * 5 + 3] = T[i * 2]; attrs[i * 5 + 4] = T[i * 2 + 1]; }
  idx = MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(I), new Float32Array(P), 3, attrs, 5, [0.5, 0.5, 0.5, 1.5, 1.5], null, target * 3, cfg.error || 0.02, [])[0];
}
const used = new Map(), order = [];
const I2 = new Uint32Array(idx.length);
for (let i = 0; i < idx.length; i++) { const v = idx[i]; let nv = used.get(v); if (nv === undefined) { nv = order.length; used.set(v, nv); order.push(v); } I2[i] = nv; }
const pick = (acc) => { const src = acc.getArray(), n = acc.getElementSize(), out = new src.constructor(order.length * n); order.forEach((v, k) => { for (let c = 0; c < n; c++) out[k * n + c] = src[v * n + c]; }); return doc.createAccessor().setType(acc.getType()).setArray(out).setNormalized(acc.getNormalized()).setBuffer(buffer); };
const fl2 = new Float32Array(order.length); order.forEach((v, k) => { fl2[k] = flutter[v]; });
const mat = doc.createMaterial(cfg.name).setDoubleSided(cfg.doubleSided !== false).setRoughnessFactor(1).setMetallicFactor(1);
const np = doc.createPrimitive().setMaterial(mat)
  .setAttribute("POSITION", pick(PA)).setAttribute("NORMAL", pick(NA)).setAttribute("TEXCOORD_0", pick(TA))
  .setAttribute("JOINTS_0", pick(JA)).setAttribute("WEIGHTS_0", pick(WA))
  .setAttribute("_FLUTTER", doc.createAccessor().setType("SCALAR").setArray(fl2).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType("SCALAR").setArray(order.length > 65535 ? I2 : new Uint16Array(I2)).setBuffer(buffer));
const oldMesh = meshNode.getMesh();
meshNode.setMesh(doc.createMesh(cfg.name).addPrimitive(np));
oldMesh.dispose();
console.log(`mesh: ${nT} -> ${I2.length / 3} triangles, ${order.length} vertices`);

// ---- 5. maps: base colour, a glow map from its neon, metal/roughness, normal (WebP)
const texSize = cfg.tex || 1024, baseSize = cfg.texBase || 2048;
const img = async (tex) => (tex ? sharp(Buffer.from(tex.getImage())) : null);
const baseTex = srcMat.getBaseColorTexture(), mrTex = srcMat.getMetallicRoughnessTexture(), nrmTex = srcMat.getNormalTexture();
const addTex = async (name, buf, set) => { const t = doc.createTexture(name).setImage(buf).setMimeType("image/webp"); set(t); return buf.length; };
const sizes = {};
const base = await (await img(baseTex)).resize(baseSize, baseSize, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = base.data, npx = baseSize * baseSize;
const soft = (x, lo, hi, edge) => Math.min(1, Math.max(0, (x - lo) / edge + 1)) * Math.min(1, Math.max(0, (hi - x) / edge + 1));
const hueIn = (h, a, c, edge = 12) => (a <= c ? soft(h, a, c, edge) : Math.max(soft(h, a, 360 + edge, edge), soft(h, -edge, c, edge)));
const E = Object.assign({ hues: [[150, 350]], sat: [0.45, 0.7], val: [0.45, 0.75], gain: 1, size: Math.min(2048, baseSize), median: 3 }, cfg.emissive || {});
const em = Buffer.alloc(npx * 3);
let lit = 0;
for (let i = 0; i < npx; i++) {
  const r = px[i * 3] / 255, g = px[i * 3 + 1] / 255, bl = px[i * 3 + 2] / 255, mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn, s = mx ? d / mx : 0;
  let h = 0;
  if (d > 1e-5) { h = mx === r ? ((g - bl) / d) % 6 : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  let hk = 0;
  for (const [a, c] of E.hues) hk = Math.max(hk, hueIn(h, a, c));
  const k = hk * Math.min(1, Math.max(0, (s - E.sat[0]) / (E.sat[1] - E.sat[0]))) * Math.min(1, Math.max(0, (mx - E.val[0]) / (E.val[1] - E.val[0]))) * E.gain;
  if (k > 0.02) { lit++; em[i * 3] = Math.min(255, px[i * 3] * k); em[i * 3 + 1] = Math.min(255, px[i * 3 + 1] * k); em[i * 3 + 2] = Math.min(255, px[i * 3 + 2] * k); }
}
console.log(`emissive: ${(100 * lit / npx).toFixed(2)}% of the map glows`);
sizes.base = await addTex("baseColor", await sharp(px, { raw: base.info }).webp({ quality: cfg.q || 90, effort: 5 }).toBuffer(), (t) => mat.setBaseColorTexture(t));
let emImg = sharp(em, { raw: base.info });
if (E.median > 1) emImg = sharp(await emImg.median(E.median).raw().toBuffer(), { raw: base.info });
sizes.emissive = await addTex("emissive", await emImg.resize(E.size, E.size).blur(0.5).webp({ quality: 90, effort: 5 }).toBuffer(), (t) => mat.setEmissiveTexture(t).setEmissiveFactor([1, 1, 1]));
if (mrTex) {
  // (metalLo/metalHi: metal below lo is cloth and goes to 0, above hi is metal and goes to 1: a generator's guess
  // leaves cloth half metal, and half-metal cloth is dark under coloured lamps)
  const M = Object.assign({ roughMin: 0.2, roughMax: 1, roughMul: 1, metalMul: 1, metalLo: 0, metalHi: 0 }, cfg.surface || {});
  const metal = (b) => { if (!(M.metalHi > M.metalLo)) return Math.min(255, b * M.metalMul); const x = Math.min(1, Math.max(0, (b / 255 - M.metalLo) / (M.metalHi - M.metalLo))); return 255 * x * x * (3 - 2 * x); };
  const mr = await (await img(mrTex)).resize(texSize, texSize, { kernel: "lanczos3" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < texSize * texSize; i++) { mr.data[i * 3] = 255; mr.data[i * 3 + 1] = Math.round(255 * Math.min(M.roughMax, Math.max(M.roughMin, (mr.data[i * 3 + 1] / 255) * M.roughMul))); mr.data[i * 3 + 2] = Math.round(metal(mr.data[i * 3 + 2])); }
  sizes.mr = await addTex("metalRough", await sharp(mr.data, { raw: mr.info }).webp({ quality: 90, effort: 5 }).toBuffer(), (t) => mat.setMetallicRoughnessTexture(t));
}
// (cfg.normalMap false: none. A figure seen small gains nothing it shows from one, and each of its pixels reads it)
if (nrmTex && cfg.normalMap !== false) sizes.normal = await addTex("normal", await (await img(nrmTex)).resize(texSize, texSize, { kernel: "lanczos3" }).removeAlpha().webp({ quality: 94, effort: 5 }).toBuffer(), (t) => mat.setNormalTexture(t).setNormalScale(cfg.normalScale || 1));
srcMat.dispose();

// ---- 6. clips: this file's and those of further retarget requests on the same rig, renamed to the game's names
const info = { clips: {}, size, source: cfg.src, joints: {}, height: H };
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
    if (still) { ch.dispose(); dropped++; continue; }
    kept++;
    const inp = s.getInput().getArray(); dur = Math.max(dur, inp[inp.length - 1]);
  }
  for (const s of a.listSamplers()) if (!a.listChannels().some((c) => c.getSampler() === s)) s.dispose();
  info.clips[want] = +dur.toFixed(3);
}
console.log(`clips: ${Object.entries(info.clips).map(([k, v]) => k + " " + v + " s").join(", ")}; tracks kept ${kept}, dropped ${dropped} (still)`);
for (const [k, n] of Object.entries({ head: "Head", chest: "Spine02", hips: "Hip", handL: "L_Hand", handR: "R_Hand", footL: "L_Foot", footR: "R_Foot" })) if (jname.includes(n)) info.joints[k] = n;
wrap.setExtras({ inr: info });

// ---- 7. pack and write
doc.createExtension(EXTTextureWebP).setRequired(true);
await doc.transform(resample({ tolerance: cfg.resample || 1e-4 }), dedup(), prune({ keepLeaves: true, keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
const outFile = path.join(ARCADE, "assets", "models", cfg.name + ".glb");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
await io.write(outFile, doc);
const kb = (n) => (n / 1024).toFixed(0) + " KB";
console.log(`wrote ${path.relative(ARCADE, outFile)}: ${kb(fs.statSync(outFile).size)}; ${I2.length / 3} triangles; maps base ${baseSize}px ${kb(sizes.base)}, metal/rough ${kb(sizes.mr || 0)}, normal ${kb(sizes.normal || 0)}, emissive ${kb(sizes.emissive)}`);
fs.writeFileSync(outFile.replace(/\.glb$/, ".json"), JSON.stringify(Object.assign({ name: cfg.name, triangles: I2.length / 3, bytes: fs.statSync(outFile).size, tex: texSize }, info), null, 1));
