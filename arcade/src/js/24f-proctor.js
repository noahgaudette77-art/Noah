// The Proctor as one design (the master overhaul, Phase 5, 2026-11-24). The owner supplied one machine for the final
// boss (arcade/assets/boss: the Final Exam's examiner, 32 rigid parts); Boss Rush's last fight, the title hall's twelfth
// cell, the hub's Boss Rush topper and the exam hall's statue each showed another design of it (the audit's #11). Now
// every one is this machine: the same parts, hung on the same joints as in the exam (BOSS_RIG), in the same skin
// (bossSkin), cap (bossCap), reactor (bossHousing) and eyes. In Boss Rush and in its cell it moves on a motion-captured
// skeleton whose clips are the old Proctor's, carried over to the machine's own joints by tools/gen/proctor-rig.mjs
// (assets/models/boss-all-rig.glb: the bones and twelve clips, nothing else; the parts are in the page already, inlined
// for the exam). Look only: nothing here knows a question, an answer or a score.

// which bone of the skeleton each of the exam's joints rides (the shoulder plates on the collarbones, the pylons on the
// chest), and the joints the Boss Rush actor reads
const PROCTOR_RIDE = { hips: "Hip", chest: "Spine02", pylonL: "Spine02", pylonR: "Spine02", head: "Head", padL: "L_Clavicle", padR: "R_Clavicle", armL: "L_Upperarm", foreL: "L_Forearm", handL: "L_Hand", armR: "R_Upperarm", foreR: "R_Forearm", handR: "R_Hand", legL: "L_Thigh", shinL: "L_Calf", footL: "L_Foot", legR: "R_Thigh", shinR: "R_Calf", footR: "R_Foot" };
const PROCTOR_JOINTS = { head: "Head", chest: "Spine02", hips: "Hip", handL: "L_Hand", handR: "R_Hand", footL: "L_Foot", footR: "R_Foot" };
const PROCTOR_SIZE = [0.868, 1, 0.446]; // (its box, in its own heights: as wide across the fists as 0.87 of its height)
// its seams' colours as the exam has them (violet at rest, a hot magenta raging) and its eyes'
const PROCTOR_SEAM = [0.62, 0.5, 1.35], PROCTOR_SEAM_RAGE = [1.35, 0.5, 2.3], PROCTOR_EYE = [2.3, 1.5, 5.2];
// its builders draw on a stream of their own (ownRandom): the ids three.js draws for what they make leave the game's be
const PROCTOR_SEED = 0x5a17c3e9;

// Can it be built? (the machine is inlined in the page; three.js and the exam's code are there)
function proctorOk() { return typeof BossModel !== "undefined" && BossModel.ok() && typeof bossSkin === "function"; }

// The machine on a loaded skeleton (Assets' model of boss-all-rig: { scene, animations, parts, info }). Returns that
// model, dressed: each joint's parts as one mesh (its geometry about the joint's own pivot, as in the exam) hung on its
// bone, the cap on the head, the reactor in the chest, the eyes in the skull; model.info says where its joints are and
// how big it is (as a processed boss's notes do); model.proctor holds its uniforms and turns its lights.
//   env      the reflection its metal takes (null: the scene's own environment)
//   o.local  the copy will be merged into one skinned mesh (the title hall's cells): its material reads each part's
//            own position from attributes (see hallSkinSteps)
//   o.env, o.boneEnv  how much the steel and the skull mirror (the exam's 0.9 and 0.6)
//   o.housing false: no reactor housing (nothing asks for it now: the topper, small as it is, keeps its reactor; and
//            not with o.local: merged, the chest's holder would be left empty and let go, and light() reads it)
function proctorDress(model, env, o = {}) { return ownRandom(PROCTOR_SEED, () => proctorDressOn(model, env, o)); }
function proctorDressOn(model, env, o) {
  const P = BossModel.parts(), parts = model.parts, root = model.scene;
  const seam = new THREE.Color().fromArray(PROCTOR_SEAM), seamRage = new THREE.Color().fromArray(PROCTOR_SEAM_RAGE), eyeCol = new THREE.Color().fromArray(PROCTOR_EYE);
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), v = new THREE.Vector3();
  const pivotOf = (b) => v.setFromMatrixPosition(parts[b].matrixWorld).applyMatrix4(inv).toArray();
  const PIV = {};
  for (const [j, , piv] of BOSS_RIG) PIV[j] = piv;
  const U = {
    uBossRim: { value: new THREE.Color(0, 0, 0) }, uBossRimK: { value: o.rimK === undefined ? 1 : o.rimK }, uBossSeam: { value: seam.clone() },
    uBossPower: { value: 0 }, uBossSweep: { value: 100 }, uBossCrack: { value: 0 }, uBossDim: { value: 1 },
    uBossCoreW: { value: new THREE.Vector3() }, uBossAll: { value: 0 },
  };
  const frameU = { value: new THREE.Matrix4() }, eye = { value: new THREE.Vector3() }, hp = PIV.head;
  const eyeAt = new THREE.Vector3(0.031, 0.879 - hp[1], 0.14 - hp[2]);
  const mat = bossSkin(env, THREE.FrontSide, { env: o.env === undefined ? 0.9 : o.env, frameU, local: !!o.local }, U);
  const boneM = bossSkin(env, THREE.FrontSide, { bone: true, env: o.boneEnv === undefined ? 0.6 : o.boneEnv, eye, eyeAt, frameU, local: !!o.local }, U);
  if (o.local) mat.userData.bossLocal = boneM.userData.bossLocal = true;
  const meshes = {}, holders = {};
  for (const [j, , piv, ids] of BOSS_RIG) {
    const b = PROCTOR_RIDE[j], bone = parts[b];
    if (!bone) continue;
    let holder = parts["part_" + b];
    if (!holder) { holder = new THREE.Group(); holder.name = "part_" + b; bone.add(holder); parts[holder.name] = holder; }
    const bp = pivotOf(b), mesh = new THREE.Mesh(bossJointGeometry(ids.map((id) => P.get(id)), piv), j === "head" ? boneM : mat);
    mesh.name = "proctor_" + j;
    mesh.position.set(piv[0] - bp[0], piv[1] - bp[1], piv[2] - bp[2]);
    holder.add(mesh);
    meshes[j] = mesh; holders[j] = holder;
  }
  // its dress rides the bones' holders, where its joint's mesh is (not the mesh itself: a merged copy lets the meshes go)
  const onJoint = (j, obj) => { obj.position.add(meshes[j].position); holders[j].add(obj); return obj; };
  const cap = onJoint("head", bossCap(env));
  const hous = o.housing === false ? null : bossHousing(env, PIV.chest);
  if (hous) onJoint("chest", hous.grp);
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeCol.clone() }), eyeGeo = new THREE.SphereGeometry(0.0072, 10, 8);
  [-0.031, 0.031].forEach((x) => { const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(x - hp[0], 0.879 - hp[1], 0.128 - hp[2]); onJoint("head", e); });
  model.info = Object.assign({}, model.info, { joints: PROCTOR_JOINTS, size: PROCTOR_SIZE });
  const chest = holders.chest, core = new THREE.Vector3(BOSS_CORE[0] - PIV.chest[0], BOSS_CORE[1] - PIV.chest[1], BOSS_CORE[2] - PIV.chest[2]).add(meshes.chest.position);
  const lamp = hous ? hous.coreLamp.material : null, lampK = lamp ? lamp.opacity : 0, toCore = new THREE.Matrix4().makeTranslation(-core.x, -core.y, -core.z);
  model.proctor = {
    U, mats: [mat, boneM], cap, hous, eyeMat, meshes,
    // each frame: its lights (power 0 dark .. 1 on, more when it surges), how far it rages (0..1), and where its reactor is now
    // (the hollow round it is dark gunmetal: the skin's mask is measured in the reactor's own frame, in the machine's units)
    light(power, rage) {
      const p = Math.max(0, power);
      U.uBossPower.value = p;
      U.uBossSeam.value.copy(seam).lerp(seamRage, Math.min(1, Math.max(0, +rage || 0)));
      eyeMat.color.copy(eyeCol).multiplyScalar(0.25 + 0.75 * Math.min(1.4, p));
      eye.value.set(0.5, 0.32, 1.1).multiplyScalar(Math.min(1.4, p)); // (the eyes' own light on the bone round them)
      if (hous) { hous.coreMat.color.copy(hous.coreCol).multiplyScalar(0.3 + 0.7 * Math.min(1.4, p)); if (lamp) lamp.opacity = lampK + Math.min(1, p) * 0.9; }
      if (chest) { chest.updateWorldMatrix(true, false); frameU.value.copy(chest.matrixWorld).invert().premultiply(toCore); }
    },
  };
  model.proctor.light(0, false);
  return model;
}

// The hub's Boss Rush topper: the machine standing as modelled (the skeleton at rest), merged as the title hall's bosses
// are (a mesh a material: hallSkinSteps), its lights on. Null until the skeleton's file is in hand. (It was a small
// copy of the old design, mini-proctor.)
function proctorTopper() {
  const m = Assets.model("boss-all-rig");
  if (!m || !proctorOk()) return null;
  return ownRandom(PROCTOR_SEED + 1, () => {
    proctorDress(m, null, { local: true });
    const it = hallSkinSteps(m);
    while (!it.next().done);
    m.animations = [];
    m.proctor.light(1, 0);
    return m;
  });
}

// The exam hall's statue of the Proctor (its gallery of the fallen: 24e-examhall.js): the machine as modelled, its cap
// on, as one mesh in a model's shape (the gallery casts all twelve in one bronze, from each model's first mesh). It
// was a statue of the old design (statue-all).
function proctorStatue() {
  if (!proctorOk()) return null;
  try { return ownRandom(PROCTOR_SEED + 2, proctorStatueBuild); } catch (e) { return null; } // (the gallery goes on without it, as without a statue whose file did not come)
}
function proctorStatueBuild() {
  const P = BossModel.parts(), geos = [];
  let head = null;
  for (const [j, , piv, ids] of BOSS_RIG) {
    geos.push(bossJointGeometry(ids.map((id) => P.get(id)), piv).translate(piv[0], piv[1], piv[2]));
    if (j === "head") head = piv;
  }
  const cap = bossCap(null);
  cap.position.add(new THREE.Vector3().fromArray(head));
  cap.updateMatrixWorld(true);
  cap.traverse((o) => { if (o.isMesh) { geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld)); o.geometry.dispose(); o.material.dispose(); } });
  const scene = new THREE.Group(), mesh = new THREE.Mesh(mergeIndexed(geos, ["position", "normal"]), new THREE.MeshBasicMaterial()); // (the cap's pieces have no uvs, and a bronze needs none)
  mesh.name = "statue-all";
  scene.add(mesh);
  return { name: "statue-all", scene, animations: [], parts: {}, info: { size: PROCTOR_SIZE } };
}
