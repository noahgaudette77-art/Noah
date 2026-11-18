// Phase 5 (D): what each screen holds on the graphics chip, estimated from what its scene refers to (every texture's
// pixels with their smaller copies, of the textures that are on the chip now; every geometry's buffers) and from the
// renderer's own count.
// It goes to the hall, then into a game and back, and prints what is held at each step.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/gpu-mem.js --out <dir> --dpr 1
module.exports = async (cap) => {
  const waitReal = async (js, ms = 30000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  const measure = (label) => cap.eval((lab) => {
    const A = window.__arcade, r = A.GFX.renderer, seen = new Set(), geos = new Set();
    let tex = 0, rt = 0, geo = 0;
    const texBytes = (t) => {
      if (!t || seen.has(t)) return;
      seen.add(t);
      if (t.isWebGLRenderTarget || !r.properties.get(t).__webglTexture) return; // (only what is on the chip now)
      const img = t.image, w = img && (img.width || (img.data && img.width)) || 0, h = img && img.height || 0;
      const mip = t.generateMipmaps !== false && t.minFilter !== THREE.LinearFilter && t.minFilter !== THREE.NearestFilter ? 4 / 3 : 1;
      const faces = Array.isArray(img) ? img.length : 1, per = t.type === THREE.HalfFloatType ? 8 : t.type === THREE.FloatType ? 16 : 4;
      if (Array.isArray(img)) tex += img.reduce((a, im) => a + (im.width || 0) * (im.height || 0), 0) * per * mip;
      else tex += w * h * per * mip * faces;
    };
    const scan = (scene) => {
      if (!scene) return;
      if (scene.environment) texBytes(scene.environment);
      if (scene.background && scene.background.isTexture) texBytes(scene.background);
      scene.traverse((o) => {
        if (o.geometry && !geos.has(o.geometry)) { geos.add(o.geometry); for (const k in o.geometry.attributes) { const a = o.geometry.attributes[k]; geo += (a.array || (a.data && a.data.array) || { byteLength: 0 }).byteLength; } if (o.geometry.index) geo += o.geometry.index.array.byteLength; }
        if (o.isInstancedMesh) geo += o.instanceMatrix.array.byteLength;
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => {
          for (const k in m) { const v = m[k]; if (v && v.isTexture) texBytes(v); }
          if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) texBytes(v); }
        });
      });
    };
    const cur = A.Scenes.cur;
    scan(cur && cur.scene);
    const hub = window.__hubRef && window.__hubRef !== cur ? window.__hubRef : null;
    let hubTex = 0, hubGeo = 0;
    if (hub && hub.scene) { const t0 = tex, g0 = geo; scan(hub.scene); hubTex = tex - t0; hubGeo = geo - g0; }
    const mb = (b) => (b / 1048576).toFixed(1) + " MB";
    return `${lab}: renderer holds ${r.info.memory.textures} textures, ${r.info.memory.geometries} geometries; scene textures ${mb(tex - hubTex)} (+ the kept hall ${mb(hubTex)}), geometry ${mb(geo - hubGeo)} (+ the kept hall ${mb(hubGeo)})`;
  }, label);
  await cap.eval(() => window.__arcade.go("hub"));
  await waitReal(() => !!document.querySelector(".hub-name"));
  await cap.fast(300);
  await cap.eval(() => { window.__hubRef = window.__arcade.Scenes.cur; });
  await cap.fast(30);
  console.log(await measure("the hall"));
  await cap.go("blaster", "3");
  await cap.ask(1500);
  await cap.fast(60);
  console.log(await measure("Risk Blaster, from the hall"));
  await cap.eval(() => window.__arcade.go("hub"));
  await cap.fast(120);
  console.log(await measure("the hall again"));
  // Boss Rush twice, and the quieter rooms, each time back to the hall: what the chip holds must not grow visit by visit
  for (const [g, st] of [["boss", "1"], ["boss", "1"], ["memory", "3"], ["memory", "3"]]) {
    await cap.go(g, st);
    await cap.fast(120);
    console.log(await measure(g + " " + st));
    await cap.eval(() => window.__arcade.go("hub"));
    await cap.fast(120);
    console.log(await measure("  back in the hall"));
  }
};
