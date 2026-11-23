// What each screen keeps on the graphics chip, picture by picture (the master overhaul, Phase 1, 2026-11-23): every
// texture on the chip once the screen is open, its size, its format, and the bytes it holds with its smaller copies,
// the largest first, with what it was made from (a file, a canvas, data) and where it is used. A phone that runs out
// of memory reloads the page: this is what to shrink first.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/texmem.js --phone --size 440x956 --dpr 1 --out <dir>
//
// SCREENS=title,hub,blaster,racer,boss,memory,exam,guide (the default: all). Writes texmem.json to --out. Test only.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const SCREENS = (process.env.SCREENS || "title,hub,blaster,racer,boss,memory,exam,guide").split(",");
  const waitReal = async (js, ms = 60000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  const out = {};
  for (const k of SCREENS) {
    if (["blaster", "racer", "boss", "memory"].includes(k)) { await cap.go(k, { blaster: "3", racer: "2", boss: "1", memory: "3" }[k]); await cap.next(); await cap.ask(1500); }
    else if (k === "exam") { await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); }); await cap.go("exam", "all"); }
    else { await cap.eval((g) => window.__arcade.go(g), k); if (k === "guide") await waitReal(() => !!document.querySelector(".guide-lib")); }
    await cap.fast(120);
    await cap.shot("_" + k); // (two frames drawn for real: everything the screen shows is on the chip)
    fs.unlinkSync(path.join(cap.out, "_" + k + ".png"));
    out[k] = await cap.eval(() => {
      const A = window.__arcade, r = A.GFX.renderer, sc = A.Scenes.cur && A.Scenes.cur.scene, uses = new Map(), list = [];
      const note = (t, where) => { if (!t || !t.isTexture) return; if (!uses.has(t)) uses.set(t, new Set()); if (uses.get(t).size < 3) uses.get(t).add(where); };
      if (sc) {
        sc.traverse((o) => {
          (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => {
            for (const key in m) { const v = m[key]; if (v && v.isTexture) note(v, key + " of " + (o.name || (o.parent && o.parent.name) || o.type)); }
            if (m.uniforms) for (const key in m.uniforms) { const v = m.uniforms[key] && m.uniforms[key].value; if (v && v.isTexture) note(v, key + " of " + (o.name || (o.parent && o.parent.name) || o.type)); }
          });
        });
        if (sc.environment) note(sc.environment, "the scene's environment");
        if (sc.background && sc.background.isTexture) note(sc.background, "the scene's background");
      }
      for (const [t] of uses) {
        if (!r.properties.get(t).__webglTexture) continue;
        const img = t.image, imgs = Array.isArray(img) ? img : [img], w = (img && (img.width || (img.image && img.image.width))) || (imgs[0] && imgs[0].width) || 0, h = (img && (img.height || (img.image && img.image.height))) || (imgs[0] && imgs[0].height) || 0;
        const mip = t.generateMipmaps !== false && t.minFilter !== THREE.LinearFilter && t.minFilter !== THREE.NearestFilter ? 4 / 3 : 1;
        const per = t.type === THREE.HalfFloatType ? 8 : t.type === THREE.FloatType ? 16 : t.format === THREE.RGBFormat ? 4 : t.format === THREE.RedFormat || t.format === THREE.LuminanceFormat || t.format === THREE.AlphaFormat ? 1 : 4;
        const faces = t.isCubeTexture ? 6 : 1, bytes = w * h * per * mip * faces;
        const s = imgs[0], from = !s ? "?" : s.currentSrc || s.src ? "file " + String(s.currentSrc || s.src).split("/").pop().split("?")[0].slice(0, 48) : typeof HTMLCanvasElement !== "undefined" && s instanceof HTMLCanvasElement ? "canvas" : s.data ? "data" : typeof ImageBitmap !== "undefined" && s instanceof ImageBitmap ? "bitmap" : (s.constructor && s.constructor.name) || "?";
        list.push({ mb: +(bytes / 1048576).toFixed(2), size: w + "x" + h + (faces > 1 ? "x6" : ""), type: t.type === THREE.HalfFloatType ? "half" : t.type === THREE.FloatType ? "float" : "8-bit", name: t.name || "", from, uses: [...uses.get(t)].join("; ") });
      }
      list.sort((a, b) => b.mb - a.mb);
      return { totalMB: +list.reduce((a, x) => a + x.mb, 0).toFixed(1), count: list.length, top: list.slice(0, 25) };
    });
    console.log(`${k}: ${out[k].totalMB} MB in ${out[k].count} textures the scene uses`);
    for (const x of out[k].top.slice(0, 10)) console.log(`    ${String(x.mb).padStart(6)} MB  ${x.size.padEnd(11)} ${x.type.padEnd(5)} ${x.from}  (${x.uses.slice(0, 90)})`);
  }
  fs.writeFileSync(path.join(cap.out, "texmem.json"), JSON.stringify(out, null, 1));
};
