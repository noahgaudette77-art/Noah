// A render.js addon (--addon tools/gen/addons/tollgate-signal.js): the Probate Tollgate's lane signal, built by the
// game's own code (src/js/22e-bosstollgate.js, makeSignal) and lit as it is at rest (an amber lens, an orange hood
// edge), so the boss's portrait shows the toll signal the game shows and not the bare round lamp the model came with.
window.addon = async function (root) {
  if (typeof BossTollgate === "undefined") await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "/src/js/22e-bosstollgate.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  // (the game's soft halo sprite is left out: a still portrait has no bloom for it to feed)
  window.glowSprite = () => { const o = new THREE.Object3D(); o.material = { color: new THREE.Color(), opacity: 0, dispose() {} }; return o; };
  // (the model's anchors are notes on its root, as the game reads them in rigModel: a point in the model's own space)
  let inr = root.userData && root.userData.inr;
  root.traverse((o) => { if (!inr && o.userData && o.userData.inr) inr = o.userData.inr; });
  const at = inr && inr.anchors && inr.anchors.eye;
  if (!at) throw new Error("no eye anchor in this model's notes");
  const eye = new THREE.Object3D();
  root.updateWorldMatrix(true, false);
  eye.position.copy(root.worldToLocal(new THREE.Vector3().fromArray(at)));
  root.add(eye);
  const sig = {};
  BossTollgate.prototype.makeSignal.call(sig, eye, 1, 0xff9b3d); // (the render page's room light is brighter than the arena's: a lower reflection keeps the hood gunmetal)
  sig.lensMat.color.setRGB(1, 0.52, 0.07).multiplyScalar(2.1);
  sig.rimMat.color.set(0xff9b3d).multiplyScalar(1.5);
};
