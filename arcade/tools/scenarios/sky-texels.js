// How many of a sky's texels fall on one screen pixel, on each screen with a panorama, at the Mac's size: computed from
// the dome's own mapping (makePanoSky's shader, in numbers) for the pixels where the sky shows. Below 1, the picture is
// drawn up (a sharper copy shows more); above 1, drawn down (a sharper copy adds nothing a filter keeps).
//
//   node arcade/tools/capture.js arcade/tools/scenarios/sky-texels.js --size 1470x830 --dpr 2 --out <dir>   (the Mac tier's own size)
module.exports = async (cap) => {
  await cap.eval(() => { window.__cap.skipDialogs = true; });
  const measure = (label) => cap.eval((lab) => {
    const A = window.__arcade, s = A.Scenes.cur, cam = s.camera, G = A.GFX, out = [];
    s.scene.updateMatrixWorld(true);
    const domes = [];
    s.scene.traverse((o) => { if (o.isMesh && o.material && o.material.uniforms && o.material.uniforms.tA && o.visible !== false) domes.push(o); });
    const W = Math.round(G.w * G.scenePR()), H = Math.round(G.h * G.scenePR());
    for (const dome of domes) {
      const u = dome.material.uniforms, win = u.uWin ? u.uWin.value : null, rot = u.uRot.value, t = u.tA.value, tw = t && t.image ? t.image.width : 0, th = t && t.image ? t.image.height : 0;
      const inv = new THREE.Matrix4().copy(dome.matrixWorld).invert(), m3 = new THREE.Matrix3().setFromMatrix4(inv);
      const uvAt = (px, py) => {
        const ndc = new THREE.Vector3((px / W) * 2 - 1, -(py / H) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize();
        const d = ndc.applyMatrix3(m3).normalize();
        if (win) {
          const a = ((Math.atan2(d.z, d.x) * 0.15915494 + 0.75) % 1 + 1) % 1 - 0.5;
          return [win.x + a * win.w, win.y + (Math.asin(Math.max(-1, Math.min(1, d.y))) * 0.31830989 + 0.5 - win.z) * win.w];
        }
        return [Math.atan2(d.z, d.x) * 0.15915494 + 0.5 + rot, Math.asin(Math.max(-1, Math.min(1, d.y))) * 0.31830989 + 0.5];
      };
      const rs = [];
      for (let gy = 1; gy < 10; gy++) for (let gx = 1; gx < 16; gx++) {
        const px = (gx / 16) * W, py = (gy / 10) * H;
        const a = uvAt(px, py), b = uvAt(px + 1, py), c = uvAt(px, py + 1);
        let du = b[0] - a[0]; if (du > 0.5) du -= 1; if (du < -0.5) du += 1;
        const dx = Math.hypot(du * 4096, (b[1] - a[1]) * 2048), dy = Math.hypot((c[0] - a[0]) * 4096, (c[1] - a[1]) * 2048);
        rs.push(Math.max(dx, dy));
      }
      rs.sort((p, q) => p - q);
      out.push({ dome: dome.name || dome.parent && dome.parent.type, tex: tw + "x" + th, win: !!win, zoomZ: +(dome.parent ? dome.parent.scale.z : 1).toFixed(2), mipmapped: t ? t.minFilter === THREE.LinearMipmapLinearFilter : null, fourK: { min: +rs[0].toFixed(2), median: +rs[rs.length >> 1].toFixed(2), max: +rs[rs.length - 1].toFixed(2) } });
    }
    return { lab, W, H, fov: cam.fov, aspect: +cam.aspect.toFixed(3), tier: G.TIERS[G.tier].name, domes: out };
  }, label);
  for (const [game, stage] of [["blaster", "3"], ["racer", "2"], ["boss", "1"], ["boss", "4"], ["boss", "9"], ["exam", "all"], ["guide"]]) {
    if (game === "guide") { await cap.eval(() => window.__arcade.go("guide")); await cap.page.waitForTimeout(4000); await cap.fast(30); }
    else { await cap.go(game, stage); await cap.ask(2400).catch(() => {}); await cap.fast(30); }
    const r = await measure(game + (stage ? " " + stage : ""));
    console.log(JSON.stringify(r));
  }
};
