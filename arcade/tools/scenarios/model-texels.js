// How many texels of a model's colour map fall on one screen pixel where it is drawn, at the Mac's size: each triangle's
// area in the picture (its UVs times the map's size) over its area on the screen (skinned, projected), weighted by the
// screen area. Below 1: the map is drawn up (a sharper map shows more); at 2 and above: a map twice as sharp would be
// drawn down through its smaller copies (it adds nothing).
//
//   WHAT=boss STAGES=1,5,9 node arcade/tools/capture.js arcade/tools/scenarios/model-texels.js --size 1470x830 --dpr 2 --out <dir>   (the wizard)
//   WHAT=title node arcade/tools/capture.js ...   (the title hall's bosses, at six places on the glide)
module.exports = async (cap) => {
  await cap.eval(() => { window.__cap.skipDialogs = true; });
  const density = (what) => cap.eval((what) => {
    const A = window.__arcade, s = A.Scenes.cur, cam = s.camera, G = A.GFX, W = G.w * G.scenePR(), H = G.h * G.scenePR();
    s.scene.updateMatrixWorld(true); cam.updateMatrixWorld(true);
    const roots = [];
    if (what === "wizard") { const w = s.stage && s.stage.wiz; if (w) roots.push(w.root || w.group || w.obj || w); }
    else if (what === "cells") { for (const c of s.cells || []) if (c.boss) roots.push(c.boss.scene || c.boss.root || c.boss); }
    const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const bins = new Map(); let total = 0, n = 0;
    // (a quantized attribute, as the game's meshopt files keep them: three.js r128 reads the stored integers as they are)
    const N = (a, i, c) => { let x = c === 0 ? a.getX(i) : c === 1 ? a.getY(i) : c === 2 ? a.getZ(i) : a.getW(i); if (a.normalized) { const A = a.array; x /= A instanceof Int8Array ? 127 : A instanceof Uint8Array ? 255 : A instanceof Int16Array ? 32767 : A instanceof Uint16Array ? 65535 : 1; if (A instanceof Int8Array || A instanceof Int16Array) x = Math.max(-1, x); } return x; };
    const M4 = new THREE.Matrix4(), base = new THREE.Vector3(), tmp = new THREE.Vector3();
    const skin = (o, i, out) => {
      const g = o.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
      base.set(N(P, i, 0), N(P, i, 1), N(P, i, 2)).applyMatrix4(o.bindMatrix); out.set(0, 0, 0);
      for (let k = 0; k < 4; k++) { const w = N(SW, i, k); if (!w) continue; const b = SI.array[i * SI.itemSize + k]; M4.multiplyMatrices(o.skeleton.bones[b].matrixWorld, o.skeleton.boneInverses[b]); out.addScaledVector(tmp.copy(base).applyMatrix4(M4), w); }
      return out.applyMatrix4(o.bindMatrixInverse);
    };
    const visit = (o) => {
      if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.uv) return;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material, map = mat && mat.map; if (!map || !map.image) return;
      const tw = map.image.width, th = map.image.height, g = o.geometry, pos = g.attributes.position, uv = g.attributes.uv, idx = g.index;
      const tris = idx ? idx.count / 3 : pos.count / 3, step = Math.max(1, Math.floor(tris / 6000));
      for (let t = 0; t < tris; t += step) {
        const ii = [0, 1, 2].map((k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k));
        for (let k = 0; k < 3; k++) {
          if (o.isSkinnedMesh) skin(o, ii[k], v[k]); else v[k].set(N(pos, ii[k], 0), N(pos, ii[k], 1), N(pos, ii[k], 2));
          p[k].copy(v[k]).applyMatrix4(o.matrixWorld).project(cam);
        }
        if (p.some((q) => q.z > 1 || q.z < -1 || Math.abs(q.x) > 1.2 || Math.abs(q.y) > 1.2)) continue;
        const sx = (q) => [(q.x * 0.5 + 0.5) * W, (q.y * 0.5 + 0.5) * H];
        const [a, b, c] = p.map(sx), area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
        if (area < 0.01) continue;
        // (facing away from the lens: not seen)
        const cross = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]); if (mat.side !== THREE.DoubleSide && cross < 0) continue;
        const U = ii.map((i) => [N(uv, i, 0) * tw, N(uv, i, 1) * th]), ta = Math.abs((U[1][0] - U[0][0]) * (U[2][1] - U[0][1]) - (U[2][0] - U[0][0]) * (U[1][1] - U[0][1])) / 2;
        const r = Math.sqrt(ta / area); // texels per pixel, along a side
        const key = r < 0.5 ? "<0.5" : r < 1 ? "0.5-1" : r < 2 ? "1-2" : r < 4 ? "2-4" : ">=4";
        if (tw < 1024) continue; // (the wand's and the cells' small parts: only the figure's own map)
        bins.set(key, (bins.get(key) || 0) + area); total += area; n++;
      }
    };
    for (const r of roots) r.traverse(visit);
    const pct = {}; for (const k of ["<0.5", "0.5-1", "1-2", "2-4", ">=4"]) pct[k] = total ? Math.round((100 * (bins.get(k) || 0)) / total) : 0;
    let mapSize = 0; for (const r of roots) r.traverse((o) => { if (o.isMesh && o.material && o.material.map && o.material.map.image) mapSize = Math.max(mapSize, o.material.map.image.width); });
    return { what, roots: roots.length, mapSize, screenPx: Math.round(total), tris: n, pctByTexelsPerPixel: pct };
  }, what);
  const [game] = (process.env.WHAT || "boss").split(",");
  if (game === "boss") {
    for (const stage of (process.env.STAGES || "1,5,9").split(",")) {
      await cap.go("boss", stage); await cap.ask(2400).catch(() => {}); await cap.fast(60);
      console.log("boss " + stage, JSON.stringify(await density("wizard")));
    }
  } else {
    await cap.eval(() => window.__arcade.go("title"));
    const ready = () => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells && s.cells.length && s.cells.every((c) => c.boss && c.ready)); };
    for (let i = 0; i < 1500; i++) { await cap.fast(2); if (await cap.eval(ready)) break; await cap.page.waitForTimeout(100); }
    for (const pose of [0.2, 0.35, 0.5, 0.7, 0.85, 1]) {
      await cap.eval((u) => { window.__arcade.Scenes.cur.pose = u; }, pose); await cap.fast(30);
      console.log("title pose " + pose, JSON.stringify(await density("cells")));
    }
  }
};
