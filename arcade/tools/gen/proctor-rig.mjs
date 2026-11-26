#!/usr/bin/env node
/**
 * The Proctor as one design (the master overhaul, Phase 5, 2026-11-24): the mech the owner supplied for the Final Exam
 * (arcade/assets/boss, 32 rigid parts, one unit tall, +Y up, facing +Z) put on Boss Rush's motion-captured skeleton,
 * so the same machine is the final boss everywhere it appears. No provider is called: the clips are the ones Boss
 * Rush's Proctor already has (Tripo's presets as retargeted to that model, 2026-11-17/23), carried over here.
 *
 *   node tools/gen/proctor-rig.mjs --src <the clips' .glb> [--out arcade/assets/models/boss-all-rig.glb]
 *                                  [--preview <a .glb with the parts on, to draw with render.js --anim>]
 *
 * How the clips are carried over: every bone of the skeleton is set at the mech's own joints (the exam's rig, BOSS_RIG
 * in src/js/24c-examboss.js: hips, waist, neck, shoulders, elbows, wrists, hips, knees, ankles). For each frame of a
 * clip the source skeleton is posed, and each bone of the mech is turned so that it points where the source's bone
 * points, and turns as it turns: its world rotation is the source bone's turn from its rest (D) applied after the
 * turn that lays the mech's bone along the source's at rest (A, the shortest arc from one to the other); a bone with no
 * length of its own (the hips, the pelvis and the waist) takes the source's turn as it is, and an end bone (the head,
 * a hand, a foot) its parent's A. The hips travel as the source's do, scaled by the two hips' heights. So the mech
 * moves as the old Proctor did, with its own proportions; its rigid parts never bend.
 *
 * Writes the skeleton and its twelve clips, and nothing else (the parts are in the page already: the game hangs them
 * on the bones itself, with the exam's own material: src/js/24f-proctor.js). --preview writes a second file with the
 * parts hung on, wearing the mech's own grey picture, for render.js's contact sheets.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { resample, prune, dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ARCADE = path.join(HERE, "..", "..");
const require = createRequire(import.meta.url);
const THREE = require(path.join(ARCADE, "vendor", "three.min.js"));
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const SRC = flag("src", null), OUT = flag("out", path.join(ARCADE, "assets", "models", "boss-all-rig.glb")), PREVIEW = flag("preview", null);
// --ref rest|idle: the source's pose the turns are measured from (idle: the first frame of its idle, where the mech
// stands as modelled); --align none|arms|all: which bones are laid along the source's (the rest turn as it turns)
const REF = flag("ref", "idle"), ALIGN = flag("align", "none");
const FPS = 30;
if (!SRC) { console.error("usage: proctor-rig.mjs --src <clips.glb> [--out file.glb] [--preview file.glb]"); process.exit(2); }
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

// ---- the mech's rig, read from the exam's own code (one source for its joints)
const examSrc = fs.readFileSync(path.join(ARCADE, "src", "js", "24c-examboss.js"), "utf8");
const rigText = examSrc.match(/const BOSS_RIG = (\[[\s\S]*?\n\]);/);
if (!rigText) throw new Error("BOSS_RIG not found in 24c-examboss.js");
const BOSS_RIG = new Function("return " + rigText[1])();
const PIV = Object.fromEntries(BOSS_RIG.map(([n, , p]) => [n, p]));

// ---- the skeleton: Boss Rush's bone names and order, at the mech's joints (model units)
const add = (a, b) => a.map((v, i) => v + b[i]);
const BONES = [ // name, parent, where
  ["Root", null, [0, 0, 0]],
  ["Hip", "Root", PIV.hips],
  ["Pelvis", "Hip", PIV.hips],
  ["L_Thigh", "Pelvis", PIV.legL], ["L_Calf", "L_Thigh", PIV.shinL], ["L_Foot", "L_Calf", PIV.footL],
  ["R_Thigh", "Pelvis", PIV.legR], ["R_Calf", "R_Thigh", PIV.shinR], ["R_Foot", "R_Calf", PIV.footR],
  ["Waist", "Hip", PIV.hips],
  ["Spine01", "Waist", [PIV.hips[0], (PIV.hips[1] + PIV.chest[1]) / 2, (PIV.hips[2] + PIV.chest[2]) / 2]],
  ["Spine02", "Spine01", PIV.chest],
  ["NeckTwist01", "Spine02", add(PIV.head, [0, -0.03, -0.008])],
  ["NeckTwist02", "NeckTwist01", add(PIV.head, [0, -0.015, -0.004])],
  ["Head", "NeckTwist02", PIV.head],
  ["L_Clavicle", "Spine02", [PIV.chest[0] - 0.045, PIV.armL[1] + 0.02, PIV.armL[2]]],
  ["L_Upperarm", "L_Clavicle", PIV.armL], ["L_Forearm", "L_Upperarm", PIV.foreL], ["L_Hand", "L_Forearm", PIV.handL],
  ["R_Clavicle", "Spine02", [PIV.chest[0] + 0.045, PIV.armR[1] + 0.02, PIV.armR[2]]],
  ["R_Upperarm", "R_Clavicle", PIV.armR], ["R_Forearm", "R_Upperarm", PIV.foreR], ["R_Hand", "R_Forearm", PIV.handR],
];
const BI = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
// the direction each bone points (to this child), for the alignment; none: the hips, pelvis and waist (no length),
// and the ends (they take their parent's)
const AIM = { Spine01: "Spine02", Spine02: "NeckTwist01", NeckTwist01: "NeckTwist02", NeckTwist02: "Head", L_Clavicle: "L_Upperarm", L_Upperarm: "L_Forearm", L_Forearm: "L_Hand", R_Clavicle: "R_Upperarm", R_Upperarm: "R_Forearm", R_Forearm: "R_Hand", L_Thigh: "L_Calf", L_Calf: "L_Foot", R_Thigh: "R_Calf", R_Calf: "R_Foot" };
const ENDS = { Head: "NeckTwist02", L_Hand: "L_Forearm", R_Hand: "R_Forearm", L_Foot: "L_Calf", R_Foot: "R_Calf" };
// which of the mech's joints ride on which bone (the exam's joints; the pads on the collarbones, the pylons on the chest)
const RIDE = { hips: "Hip", chest: "Spine02", pylonL: "Spine02", pylonR: "Spine02", head: "Head", padL: "L_Clavicle", padR: "R_Clavicle", armL: "L_Upperarm", foreL: "L_Forearm", handL: "L_Hand", armR: "R_Upperarm", foreR: "R_Forearm", handR: "R_Hand", legL: "L_Thigh", shinL: "L_Calf", footL: "L_Foot", legR: "R_Thigh", shinR: "R_Calf", footR: "R_Foot" };

// ---- 1. the source: its nodes as an Object3D tree, its clips as three.js clips
const src = await io.read(path.resolve(SRC));
const sRoot = src.getRoot(), sScene = sRoot.listScenes()[0];
const objOf = new Map(), byName = {};
const build = (n) => {
  const o = new THREE.Object3D();
  o.name = n.getName();
  o.position.fromArray(n.getTranslation()); o.quaternion.fromArray(n.getRotation()); o.scale.fromArray(n.getScale());
  objOf.set(n, o); byName[o.name] = o;
  n.listChildren().forEach((c) => o.add(build(c)));
  return o;
};
const sTop = new THREE.Object3D();
sScene.listChildren().forEach((n) => sTop.add(build(n)));
for (const [n] of BONES) if (!byName[n]) throw new Error("the source has no bone " + n);
const clips = sRoot.listAnimations().map((a) => {
  const tracks = [];
  for (const ch of a.listChannels()) {
    const node = ch.getTargetNode(), pth = ch.getTargetPath(), s = ch.getSampler();
    const times = Array.from(s.getInput().getArray()), vals = Array.from(s.getOutput().getArray());
    const nm = objOf.get(node).name;
    if (pth === "rotation") tracks.push(new THREE.QuaternionKeyframeTrack(nm + ".quaternion", times, vals, s.getInterpolation() === "STEP" ? THREE.InterpolateDiscrete : THREE.InterpolateLinear));
    else if (pth === "translation") tracks.push(new THREE.VectorKeyframeTrack(nm + ".position", times, vals, s.getInterpolation() === "STEP" ? THREE.InterpolateDiscrete : THREE.InterpolateLinear));
  }
  return new THREE.AnimationClip(a.getName(), -1, tracks);
});
console.log("source:", clips.length, "clips:", clips.map((c) => c.name + " " + c.duration.toFixed(2) + "s").join(", "));

// the source at its reference pose: each bone's world rotation and place
const refMixer = new THREE.AnimationMixer(sTop);
if (REF === "idle") { const c = clips.find((k) => k.name === "idle"); const a = refMixer.clipAction(c); a.play(); a.time = 0; refMixer.update(0); }
sTop.updateMatrixWorld(true);
const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());
const sRestQ = {}, sRestP = {};
for (const [n] of BONES) { sRestQ[n] = wq(byName[n]); sRestP[n] = wp(byName[n]); }
refMixer.stopAllAction(); refMixer.uncacheRoot(sTop);
for (const o of Object.values(byName)) o.updateMatrix();
// (the source's height: the model is set one unit tall in the arcade's frame; the mech is one unit tall too)

// ---- 2. the alignment of each bone: the shortest arc from the mech's bone to the source's, both at rest
const V = (a) => new THREE.Vector3().fromArray(a);
const A = {};
const ARMS = /Clavicle|Upperarm|Forearm|Hand/;
for (const [n] of BONES) {
  if (AIM[n] && (ALIGN === "all" || (ALIGN === "arms" && ARMS.test(n)))) {
    const dt = V(BONES[BI[AIM[n]]][2]).sub(V(BONES[BI[n]][2])).normalize();
    const ds = sRestP[AIM[n]].clone().sub(sRestP[n]).normalize();
    A[n] = new THREE.Quaternion().setFromUnitVectors(dt, ds);
  } else A[n] = new THREE.Quaternion();
}
for (const [n, p] of Object.entries(ENDS)) A[n] = A[p].clone();
console.log("reference:", REF, "· aligned:", ALIGN);
const hipK = PIV.hips[1] / Math.max(0.05, sRestP.Hip.y);
console.log("hips: source", sRestP.Hip.y.toFixed(3), "mech", PIV.hips[1].toFixed(3), "scale", hipK.toFixed(3));
for (const n of ["L_Upperarm", "L_Thigh", "Spine02"]) {
  const e = new THREE.Euler().setFromQuaternion(A[n]);
  console.log("  alignment", n, [e.x, e.y, e.z].map((v) => (v * 57.3).toFixed(1)).join(", "), "deg");
}

// ---- 3. every clip, frame by frame
const mixer = new THREE.AnimationMixer(sTop);
const out = [];
for (const clip of clips) {
  const act = mixer.clipAction(clip); act.play();
  // (sampled where the source has keys, at most a thirtieth of a second apart: its keys are already where it changes)
  const keyT = new Set([0, clip.duration]);
  for (const tr of clip.tracks) for (const t of tr.times) keyT.add(+t.toFixed(4));
  const ts = [...keyT].sort((a, b) => a - b), fill = [];
  ts.forEach((t, i) => { fill.push(t); const nx = ts[i + 1]; if (nx !== undefined) for (let k = 1, m = Math.ceil((nx - t) * FPS); k < m; k++) fill.push(t + ((nx - t) * k) / m); });
  const times = [], rot = BONES.map(() => []), hip = [];
  for (const t of fill) {
    act.time = t; mixer.update(0); sTop.updateMatrixWorld(true);
    times.push(t);
    const W = {};
    for (const [b] of BONES) {
      const D = wq(byName[b]).multiply(sRestQ[b].clone().invert()); // the source bone's turn from its rest, in the world
      W[b] = D.multiply(A[b]); // the mech's bone: laid along the source's rest, then turned as it turns
    }
    BONES.forEach(([b, par], i) => {
      const L = par ? W[par].clone().invert().multiply(W[b]) : W[b].clone();
      rot[i].push(L.x, L.y, L.z, L.w);
    });
    const hp = wp(byName.Hip).sub(sRestP.Hip).multiplyScalar(hipK).add(V(PIV.hips)); // (Root stays at the origin)
    hip.push(hp.x, hp.y, hp.z);
  }
  act.stop(); mixer.uncacheAction(clip);
  // (keep the quaternions on one side, so a frame never takes the long way round to the next)
  for (const r of rot) for (let k = 4; k < r.length; k += 4) if (r[k] * r[k - 4] + r[k + 1] * r[k - 3] + r[k + 2] * r[k - 2] + r[k + 3] * r[k - 1] < 0) for (let j = 0; j < 4; j++) r[k + j] = -r[k + j];
  out.push({ name: clip.name, times, rot, hip });
}

// ---- 4. the mech's parts (only for the preview: the game has them inline)
function mechParts() {
  const buf = fs.readFileSync(path.join(ARCADE, "assets", "boss", "boss.bin"));
  if (buf.toString("latin1", 0, 4) !== "INRB") throw new Error("not a model");
  const hl = buf.readUInt32LE(4), base = 8 + hl, head = JSON.parse(buf.toString("latin1", 8, 8 + hl));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const parts = new Map();
  for (const p of head.parts) {
    const qp = new Uint16Array(ab, base + p.p, p.v * 3), qn = new Int8Array(ab, base + p.n, p.v * 4), qt = new Uint16Array(ab, base + p.t, p.v * 2);
    const pos = new Float32Array(p.v * 3), nor = new Float32Array(p.v * 3), uv = new Float32Array(p.v * 2);
    for (let i = 0; i < p.v; i++) {
      for (let k = 0; k < 3; k++) { pos[i * 3 + k] = p.min[k] + (qp[i * 3 + k] / 65535) * (p.max[k] - p.min[k]); nor[i * 3 + k] = qn[i * 4 + k] / 127; }
      uv[i * 2] = qt[i * 2] / 65535; uv[i * 2 + 1] = qt[i * 2 + 1] / 65535;
    }
    parts.set(p.id, { pos, nor, uv, ix: new Uint16Array(ab, base + p.x, p.i).slice() });
  }
  return parts;
}

// ---- 5. the file: the skeleton (rest: the mech standing as modelled, every bone unturned) and its clips
async function write(file, withParts) {
  const doc = new Document(), root = doc.getRoot(), buffer = doc.createBuffer();
  const scene = doc.createScene("proctor"), top = doc.createNode("proctor");
  scene.addChild(top);
  const arm = doc.createNode("Armature"); top.addChild(arm);
  const node = {};
  for (const [n, par, at] of BONES) {
    const pp = par ? BONES[BI[par]][2] : [0, 0, 0];
    node[n] = doc.createNode(n).setTranslation([at[0] - pp[0], at[1] - pp[1], at[2] - pp[2]]);
    (par ? node[par] : arm).addChild(node[n]);
  }
  if (withParts) {
    const P = mechParts();
    const tex = doc.createTexture("albedo").setImage(fs.readFileSync(path.join(ARCADE, "assets", "boss", "albedo.jpg"))).setMimeType("image/jpeg");
    const mat = doc.createMaterial("mech").setBaseColorTexture(tex).setMetallicFactor(0.6).setRoughnessFactor(0.45);
    const byBone = {};
    for (const [j, , piv, ids] of BOSS_RIG) (byBone[RIDE[j]] = byBone[RIDE[j]] || []).push({ j, piv, ids });
    for (const [b, list] of Object.entries(byBone)) {
      const holder = doc.createNode("part_" + b);
      node[b].addChild(holder);
      const bp = BONES[BI[b]][2];
      for (const { j, piv, ids } of list) {
        // one mesh a joint, its geometry about the joint's own pivot (as the exam builds it), set at that pivot
        let nv = 0, ni = 0;
        ids.forEach((id) => { nv += P.get(id).pos.length / 3; ni += P.get(id).ix.length; });
        const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), ix = new Uint32Array(ni);
        let vo = 0, io2 = 0;
        for (const id of ids) {
          const p = P.get(id), n = p.pos.length / 3;
          for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { pos[(vo + i) * 3 + k] = p.pos[i * 3 + k] - piv[k]; nor[(vo + i) * 3 + k] = p.nor[i * 3 + k]; }
          uv.set(p.uv, vo * 2);
          for (let i = 0; i < p.ix.length; i++) ix[io2 + i] = p.ix[i] + vo;
          vo += n; io2 += p.ix.length;
        }
        const prim = doc.createPrimitive()
          .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(pos).setBuffer(buffer))
          .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(nor).setBuffer(buffer))
          .setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(uv).setBuffer(buffer))
          .setIndices(doc.createAccessor().setType("SCALAR").setArray(ix).setBuffer(buffer))
          .setMaterial(mat);
        const mn = doc.createNode("mech_" + j).setMesh(doc.createMesh("mech_" + j).addPrimitive(prim)).setTranslation([piv[0] - bp[0], piv[1] - bp[1], piv[2] - bp[2]]);
        holder.addChild(mn);
      }
    }
  }
  for (const c of out) {
    const anim = doc.createAnimation(c.name), input = doc.createAccessor().setType("SCALAR").setArray(new Float32Array(c.times)).setBuffer(buffer);
    BONES.forEach(([b], i) => {
      if (b === "Root") return;
      const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType("VEC4").setArray(new Float32Array(c.rot[i])).setBuffer(buffer)).setInterpolation("LINEAR");
      anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(node[b]).setTargetPath("rotation").setSampler(s));
    });
    const s = doc.createAnimationSampler().setInput(input).setOutput(doc.createAccessor().setType("VEC3").setArray(new Float32Array(c.hip)).setBuffer(buffer)).setInterpolation("LINEAR");
    anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(node.Hip).setTargetPath("translation").setSampler(s));
  }
  await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  await io.write(file, doc);
  console.log("wrote", path.relative(process.cwd(), file), (fs.statSync(file).size / 1024).toFixed(0) + " KB");
}
await write(path.resolve(OUT), false);
if (PREVIEW) await write(path.resolve(PREVIEW), true);
