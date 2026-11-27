// What a visit to a screen leaves behind (Phase 7's soak, 2026-11-25). Every geometry and texture the renderer holds on
// the graphics chip (it adds a 'dispose' listener to each the first time it draws it) is tracked with where it was made
// (a geometry: its first attribute set; a texture: its first upload mark); a screen is visited, then the hall, four
// times over, and after each visit from the second: what is still held that was not before it, grouped by its maker,
// and the live objects of each kind in JavaScript (Object3D, BufferGeometry, Material, Texture, page elements: the
// heap's own count after a collection, Chromium only). A screen that leaves nothing prints "0 new".
//
//   WHO=title,blaster,racer,boss,memory,exam,guide node arcade/tools/capture.js arcade/tools/scenarios/leaks.js --size 1470x830 --dpr 1 --out <dir>
//
// It found Risk Blaster's drones' glass and the overlord's brood's shapes, Boss Rush's sparks' texture and the title's
// bosses' bones held a visit at a time (13f7abc, 3ca6272, f7fd6b8, 034d7b3). Test only: it patches three.js in the page.
module.exports = async (cap) => {
  const WHO = (process.env.WHO || "title,boss").split(",");
  const cdp = await cap.page.context().newCDPSession(cap.page);
  const waitReal = async (js, ms = 120000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  await cap.eval(() => {
    const live = (window.__live = new Map());
    const stamp = (o) => { if (!o.__made) o.__made = new Error().stack.split("\n").slice(3, 9).map((l) => l.trim().replace(/^at /, "").replace(/\(.*index[^)]*:(\d+):\d+\)/, "@$1").replace(/https?:\/\/[^ ]*:(\d+):\d+/, "@$1")).join(" < "); };
    const sa = THREE.BufferGeometry.prototype.setAttribute;
    THREE.BufferGeometry.prototype.setAttribute = function (n, a) { stamp(this); return sa.call(this, n, a); };
    const si = THREE.BufferGeometry.prototype.setIndex;
    THREE.BufferGeometry.prototype.setIndex = function (i) { stamp(this); return si.call(this, i); };
    const ael = THREE.EventDispatcher.prototype.addEventListener;
    THREE.EventDispatcher.prototype.addEventListener = function (type, fn) {
      if (type === "dispose" && (this.isBufferGeometry || this.isTexture) && !live.has(this)) {
        if (this.isTexture && !this.__made) this.__made = new Error().stack.split("\n").slice(2, 10).map((l) => l.trim().replace(/^at /, "").replace(/\(.*index[^)]*:(\d+):\d+\)/, "@$1")).join(" < ");
        live.set(this, 1);
      }
      return ael.call(this, type, fn);
    };
    // a texture's maker: where it was first marked for upload (a DataTexture or CanvasTexture does it as it is made)
    const nu = Object.getOwnPropertyDescriptor(THREE.Texture.prototype, "needsUpdate");
    if (nu && nu.set) Object.defineProperty(THREE.Texture.prototype, "needsUpdate", { configurable: true, get: nu.get, set(v) { if (!this.__made2) this.__made2 = new Error().stack.split("\n").slice(2, 9).map((l) => l.trim().replace(/^at /, "").replace(/\(.*index[^)]*:(\d+):\d+\)/, "@$1").replace(/\(https:\/\/cdnjs[^)]*\)/, "(three)")).join(" < "); nu.set.call(this, v); } });
    const gd = THREE.BufferGeometry.prototype.dispose;
    THREE.BufferGeometry.prototype.dispose = function () { live.delete(this); return gd.call(this); };
    const td = THREE.Texture.prototype.dispose;
    THREE.Texture.prototype.dispose = function () { live.delete(this); return td.call(this); };
    window.__snap = () => new Set(window.__live.keys());
    window.__diff = (before) => {
      const out = [];
      for (const o of window.__live.keys()) if (!before.has(o)) {
        if (o.isTexture) { const im = o.image || {}; out.push({ kind: "texture", type: o.isDataTexture ? "Data" : o.isCanvasTexture ? "Canvas" : o.isCubeTexture ? "Cube" : o.isVideoTexture ? "Video" : "Tex", name: o.name || "", size: (im.width || "?") + "x" + (im.height || "?") + (im.data ? " data" + im.data.length : "") + (im.tagName ? " " + im.tagName : ""), src: (im.src || im.currentSrc || "").slice(-50), made: o.__made2 || o.__made || "" }); }
        else out.push({ kind: "geometry", type: o.type, name: o.name || "", verts: o.attributes && o.attributes.position ? o.attributes.position.count : 0, made: o.__made || "" });
      }
      return out;
    };
  });
  // live JavaScript objects of a kind, whether on the graphics chip or not (the heap's own count, after a collection)
  const alive = async (expr) => {
    const p = await cdp.send("Runtime.evaluate", { expression: expr });
    const q = await cdp.send("Runtime.queryObjects", { prototypeObjectId: p.result.objectId });
    const n = await cdp.send("Runtime.callFunctionOn", { objectId: q.objects.objectId, functionDeclaration: "function(){ return this.length; }", returnByValue: true });
    await cdp.send("Runtime.releaseObject", { objectId: q.objects.objectId }).catch(() => {});
    return n.result.value;
  };
  const counts = async () => {
    await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
    const o = {};
    for (const [k, e] of [["obj3d", "THREE.Object3D.prototype"], ["geo", "THREE.BufferGeometry.prototype"], ["mat", "THREE.Material.prototype"], ["tex", "THREE.Texture.prototype"], ["el", "HTMLElement.prototype"], ["canvas", "HTMLCanvasElement.prototype"]]) o[k] = await alive(e);
    o.attached = await cap.eval(() => document.getElementsByTagName("*").length);
    const u = await cdp.send("Runtime.getHeapUsage"); o.heapMB = +(u.usedSize / 1048576).toFixed(2);
    return o;
  };
  const info = async () => { const m = await cap.eval(() => { const m = window.__arcade.GFX.renderer.info.memory; return m.geometries + " geo, " + m.textures + " tex, held " + window.__live.size; }); return m + " | alive " + JSON.stringify(await counts()); };
  const toHub = async () => { await cap.eval(() => window.__arcade.go("hub")); await waitReal(() => !!document.querySelector(".scr-hub [data-act=play]")); await cap.fast(120); await cap.eval(() => window.__tick(2, true)); await cdp.send("HeapProfiler.collectGarbage").catch(() => {}); };
  const visit = async (k) => {
    if (k === "title") { await cap.eval(() => window.__arcade.go("title")); await waitReal(() => !!document.querySelector(".scr-title")); for (let i = 0; i < 6; i++) { await cap.fast(100); await cap.eval(() => window.__tick(1, true)); await cap.page.waitForTimeout(300); } }
    else { await cap.eval(() => { window.__cap.skipDialogs = true; }); await cap.go(k, { boss: "1", blaster: "3", racer: "2", memory: "3" }[k] || "1"); await cap.next(); await cap.ask(1500); await cap.fast(300); await cap.eval(() => window.__tick(2, true)); }
  };
  await toHub();
  for (const k of WHO) {
    await visit(k); await toHub(); // (the first visit loads and builds what is kept)
    for (let n = 1; n <= 3; n++) {
      const b = await cap.eval(() => { window.__before = window.__snap(); return window.__before.size; });
      await visit(k); await toHub();
      const d = await cap.eval(() => window.__diff(window.__before));
      const store = await cap.eval(() => JSON.stringify(window.__arcade.Store.state).length);
      console.log(`${k} visit ${n + 1}: ${await info()}; ${d.length} new and still held after it; the saved progress ${store} characters`);
      const groups = {};
      for (const x of d) { const key = x.kind + " " + x.type + " " + (x.name || "") + " " + (x.size || x.verts) + " | " + x.made.slice(0, 260); groups[key] = (groups[key] || 0) + 1; }
      for (const [key, c] of Object.entries(groups)) console.log("   " + c + " x " + key);
    }
  }
};
