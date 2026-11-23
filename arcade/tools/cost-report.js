#!/usr/bin/env node
/**
 * What each screen's frame costs, and what in it costs the most, on a phone's screen (the owner, 2026-11-22: the game
 * lags on their iPhone 17 Pro Max; every screen measured, its top five costs found, before and after each fix).
 *
 *   node arcade/tools/cost-report.js [--html index.html] [--only title,hub] [--tier 1] [--frames 6] [--engine chromium|webkit]
 *                                    [--poses 0.35,1] [--parts] [--json out.json] [--scale 0.875] [--paint] [--device phone|mac] [--cpu] [--textures]
 *
 * --device mac (2026-11-23): a MacBook Air's window instead (1470 x 830 at 2x, a mouse: a desktop, so the desktop's
 * tiers; loaded and played to the moment measured at 1x, then drawn at 2x for the measured frames); --tier auto leaves
 * the page's own choice (AUTO's first step) as it is. Boss Rush is measured at its first question, the wizard in.
 *
 * For each screen (the page served, every asset loaded, 440 x 956 at 3x, touch: a phone, so the phone's tiers):
 *   the drawing size and pixel ratio; draw calls, triangles, lights (point/spot/directional) and shadow casters;
 *   the render passes a frame and the pixels they shade; what is held on the graphics chip (textures, render targets
 *   and renderbuffers, geometry buffers: bytes, tracked as the page makes them); the main thread's own time a frame
 *   (the game's script; in Chromium also its style, layout and paint time, read from its own counters: the page's
 *   CSS animations); and the frame's drawing time on this machine.
 * This machine draws in software: its milliseconds are not a phone's. What costs more here costs more there, roughly
 * in proportion: the parts are compared with each other and a build with the one before it, not with 16.7 ms.
 * --paint (Chromium): the game held still for three seconds, what the page's own animations cost the browser while it
 * stands (its CSS: style, layout, paint and raster, in ms a second, read from a trace), and how many paints a second.
 * --parts: the frame drawn again without each part of the scene (each of its top-level pieces, by name) and each layer
 * of the post-processing, one at a time, the game held still: what each one costs, the top five listed.
 */
const fs = require("fs"), path = require("path"), http = require("http");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const DEVICE = flag("device", "phone"), MAC = DEVICE === "mac";
const HTML = flag("html", "index.html"), ONLY = flag("only", ""), TIER = flag("tier", MAC ? "0" : "1"), FRAMES = +flag("frames", 6), ENGINE = flag("engine", "chromium"), PARTS = args.includes("--parts"), PAINT = args.includes("--paint") && ENGINE === "chromium", JSON_OUT = flag("json", ""), POSES_ARG = flag("poses", "0.35,1"), SCALE = +flag("scale", 0), CPU = args.includes("--cpu") && ENGINE === "chromium", TEXTURES = args.includes("--textures");
// --cpu (Chromium; the master overhaul, 2026-11-23): the main thread sampled through the measured stretch of frames, its
// time by function (where in the source each is: the build heads every file with /* ---- name ---- */), the top ten
const SRC_STARTS = (() => { try { const st = []; fs.readFileSync(path.join(ARCADE, HTML), "utf8").split("\n").forEach((l, i) => { const m = /^\/\* ---- (\S+\.js) ---- \*\/$/.exec(l); if (m) st.push([i, m[1]]); }); return st; } catch (e) { return []; } })();
const srcAt = (line) => { let f = null; for (const [i, n] of SRC_STARTS) { if (i <= line) f = n + ":" + (line - i); else break; } return f || "line " + (line + 1); };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const SCREENS = [
  ["title", "go('title')"], ["hub", "go('hub')"], ["blaster", "go('blaster','3')"], ["racer", "go('racer','2')"],
  ["boss", "go('boss','1')"], ["memory", "go('memory','2')"], ["exam", "go('exam')"], ["guide", "go('guide')"],
].filter(([k]) => !ONLY || ONLY.split(",").includes(k));
// what a screen is measured at: the title with every piece in; Boss Rush at its first question, the wizard in
const READY = { boss: () => { const s = window.__arcade.Scenes.cur; return !s || !s.stage || (s.state === "ask" && !!s.stage.wiz); }, title: () => { const s = window.__arcade.Scenes.cur; return !s || !s.cells || (s.cells.every((c) => c.boss) && !!s.vault && !!s.cabs && !!s.cup && !!s.podMesh && !!s.sky && s.scene.children.filter((o) => o.name === "windows+skylights").every((o) => !o.material.uniforms.tTop || o.material.uniforms.tTop.value)); } }; // (and, from 2026-11-23, the skylights' own pictures)

// Runs in the page before anything else: the main thread's time in each frame, and what the page holds on the
// graphics chip (every texture, renderbuffer and buffer as it is made, sized, and let go of).
function inPage() {
  const raf = window.requestAnimationFrame.bind(window);
  window.__cpu = { sum: 0, n: 0, max: 0 };
  window.__hold = false; // (set: the game's frames stop, so a frame can be drawn and timed alone)
  window.__queued = [];
  window.requestAnimationFrame = (cb) => { if (window.__hold) { window.__queued.push(cb); return 0; } return raf((t) => { const t0 = performance.now(); cb(t); const d = performance.now() - t0; const c = window.__cpu; c.sum += d; c.n++; if (d > c.max) c.max = d; }); };
  const mem = (window.__mem = { tex: new Map(), rb: new Map(), buf: new Map(), label: new Map() });
  // (each texture's first picture: what it was made from, and the screen up when it was sent: see --textures)
  const era = () => { try { const s = window.__arcade && window.__arcade.Scenes.cur; return s ? s.constructor.name : "(start)"; } catch (e) { return "?"; } };
  const what = (a) => {
    if (a.length >= 8) { const px = a[8]; return (px ? "data " : "target ") + a[3] + "x" + a[4]; }
    const src = a[5]; if (!src) return "?";
    const wdt = src.videoWidth || src.naturalWidth || src.width, hgt = src.videoHeight || src.naturalHeight || src.height;
    if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) { const u = src.currentSrc || src.src || ""; return "image " + (u.startsWith("data:") ? "(inline)" : u.startsWith("blob:") ? "(blob)" : u.split("/").pop().split("?")[0].slice(0, 40)) + " " + wdt + "x" + hgt; }
    if (typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement) return "canvas " + wdt + "x" + hgt;
    if (typeof ImageBitmap !== "undefined" && src instanceof ImageBitmap) return "bitmap " + wdt + "x" + hgt;
    return ((src.constructor && src.constructor.name) || "?") + " " + wdt + "x" + hgt;
  };
  const bound = { tex: new Map(), rb: null, buf: new Map() };
  const BPP = { 0x8058: 4, 0x881a: 8, 0x8814: 16, 0x8c43: 4, 0x81a6: 4, 0x8cac: 4, 0x88f0: 4, 0x8229: 1, 0x822b: 2, 0x822d: 2, 0x822f: 4, 0x8051: 3, 0x1908: 4, 0x1907: 3, 0x1902: 4, 0x8d48: 1 }; // (RGBA8, RGBA16F, RGBA32F, SRGB8_A8, DEPTH24, DEPTH32F, D24S8, R8, R16F, RG16F, RG8?, RGB8, RGBA, RGB, DEPTH, STENCIL8)
  const TYPEB = { 0x1401: 1, 0x140b: 2, 0x8d61: 2, 0x1406: 4, 0x1405: 4, 0x84fa: 4, 0x1403: 2 }; // (UNSIGNED_BYTE, HALF_FLOAT, HALF_FLOAT_OES, FLOAT, UNSIGNED_INT, UINT_24_8, UNSIGNED_SHORT)
  const wrap = (P) => {
    const w = (name, fn) => { const o = P[name]; if (!o) return; P[name] = function () { const r = o.apply(this, arguments); try { fn.apply(this, arguments); } catch (e) { /* counting only */ } return r; }; };
    w("bindTexture", function (target, t) { bound.tex.set(target, t); });
    w("bindRenderbuffer", function (target, r) { bound.rb = r; });
    w("bindBuffer", function (target, b) { bound.buf.set(target, b); });
    const texTarget = (target) => (target >= 0x8515 && target <= 0x851a ? 0x8513 : target); // (a cube's faces: its cube)
    const addTex = (target, level, bytes) => { const t = bound.tex.get(texTarget(target)); if (!t) return; const m = mem.tex.get(t) || {}; m[target + ":" + level] = bytes; mem.tex.set(t, m); };
    w("texImage2D", function (target, level, internal) {
      const a = arguments; let wdt, hgt, fmt = a[a.length >= 9 ? 6 : 4], type = a[a.length >= 9 ? 7 : 5];
      if (a.length >= 8) { wdt = a[3]; hgt = a[4]; fmt = a[6]; type = a[7]; } else { const src = a[5]; wdt = src && (src.videoWidth || src.naturalWidth || src.width); hgt = src && (src.videoHeight || src.naturalHeight || src.height); fmt = a[3]; type = a[4]; }
      const bpp = BPP[internal] || (BPP[fmt] && TYPEB[type] ? (BPP[fmt] / 1) * (TYPEB[type] || 1) : 4);
      addTex(target, level, (wdt || 0) * (hgt || 0) * bpp);
      if (level === 0) { const t = bound.tex.get(texTarget(target)); if (t && !mem.label.has(t)) mem.label.set(t, { what: what(a), era: era(), fmt: internal }); }
    });
    w("texStorage2D", function (target, levels, internal, wdt, hgt) { const bpp = BPP[internal] || 4; let b = 0, x = wdt, y = hgt; for (let l = 0; l < levels; l++) { b += x * y * bpp; x = Math.max(1, x >> 1); y = Math.max(1, y >> 1); } addTex(target, "s", b); { const t = bound.tex.get(texTarget(target)); if (t && !mem.label.has(t)) mem.label.set(t, { what: "storage " + wdt + "x" + hgt, era: era(), fmt: internal }); } });
    w("deleteTexture", function (t) { mem.tex.delete(t); mem.label.delete(t); });
    w("renderbufferStorage", function (target, internal, wdt, hgt) { if (bound.rb) mem.rb.set(bound.rb, wdt * hgt * (BPP[internal] || 4)); });
    w("renderbufferStorageMultisample", function (target, samples, internal, wdt, hgt) { if (bound.rb) mem.rb.set(bound.rb, wdt * hgt * (BPP[internal] || 4) * Math.max(1, samples)); });
    w("deleteRenderbuffer", function (r) { mem.rb.delete(r); });
    w("bufferData", function (target, d) { const b = bound.buf.get(target); if (b) mem.buf.set(b, typeof d === "number" ? d : (d && d.byteLength) || 0); });
    w("deleteBuffer", function (b) { mem.buf.delete(b); });
    w("generateMipmap", function (target) { const t = bound.tex.get(target); if (!t) return; const m = mem.tex.get(t); if (m && m[target + ":0"]) m[target + ":mips"] = m[target + ":0"] / 3; });
  };
  if (window.WebGL2RenderingContext) wrap(WebGL2RenderingContext.prototype);
  if (window.WebGLRenderingContext) wrap(WebGLRenderingContext.prototype);
}

function launch(engine) {
  const pw = require("playwright");
  if (engine === "webkit") {
    const dir = process.env.WEBKIT_BROWSERS_PATH, wk = dir && fs.existsSync(dir) && fs.readdirSync(dir).find((d) => /^webkit-\d+$/.test(d));
    return pw.webkit.launch(wk ? { executablePath: path.join(dir, wk, "pw_run.sh") } : {});
  }
  return pw.chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
}

(async () => {
  const srv = http.createServer((req, rsp) => {
    const file = path.join(ARCADE, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(ARCADE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end("no"); return; }
    rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(rsp);
  }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  const base = "http://127.0.0.1:" + srv.address().port;
  const browser = await launch(ENGINE);
  const out = [];
  for (const [name, go] of SCREENS) {
    // (the Mac: the page loads and plays to the moment measured at 1x, four times fewer pixels a frame in software, then
    // reads 2x and draws the measured frames at the Retina screen's own size)
    const ctx = await browser.newContext(MAC ? { viewport: { width: 1470, height: 830 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } : { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: ENGINE !== "firefox", hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(inPage);
    await page.goto(base + "/" + HTML + (MAC ? "#debug" : "#debug,phone"));
    await page.waitForFunction(() => window.__arcade && window.__arcade.GFX, null, { timeout: 60000 });
    // the tier fixed as Setup fixes it (its full drawing size); --scale: a share of it, as AUTO draws it (0.875: a phone's SMOOTH)
    await page.evaluate(([t, sc]) => { const G = window.__arcade.GFX; if (t === "auto") { /* AUTO's own first step, held */ } else if (G.setQuality) G.setQuality(["high", "medium", "low", "lowest"][+t]); else if (G.setTier) { G.auto = false; G.setTier(+t, "report"); } if (G.perf) G.perf.off = true; if (sc) { G.scale = sc; G.resize(); } }, [TIER, SCALE]);
    // every file the screen asks for in hand before it opens (on a loaded machine the game's own 40 s wait for its files
    // can run out, and the screen opens without its models: measured, it is not the screen)
    await page.evaluate(async (k) => {
      const A = window.__arcade, P = { blaster: "3", racer: "2", boss: "1", memory: "2", exam: "all" }, extra = P[k] && A.gameAssets ? A.gameAssets(k, A.makeSelection(P[k])) : undefined;
      for (let i = 0; i < 400; i++) { const p = A.Assets.need(k, extra); if (!p) return; await p; }
    }, name).catch(() => {});
    await page.evaluate(`window.__arcade.${go}`);
    await page.waitForFunction(() => { const A = window.__arcade; return A.Scenes && A.Scenes.cur && !document.getElementById("loading"); }, null, { timeout: 180000 }).catch(() => {});
    if (READY[name]) await page.waitForFunction(READY[name], null, { timeout: 900000, polling: 250 }).catch(() => errors.push("not all of its pieces arrived"));
    if (name === "title") await page.evaluate(() => window.__arcade.Assets.need("hub")).catch(() => null);
    await page.waitForTimeout(2500);
    if (MAC) { await page.evaluate(() => { Object.defineProperty(window, "devicePixelRatio", { get: () => 2, configurable: true }); window.__arcade.GFX.resize(); }); await page.waitForTimeout(1500); }
    if (TEXTURES) await page.evaluate(() => { window.__wantTextures = true; });
    const poses = name === "title" && (await page.evaluate(() => !!(window.__arcade.Scenes.cur && window.__arcade.Scenes.cur.cells))) ? POSES_ARG.split(",").map(Number) : [null];
    let cdp = null;
    if (ENGINE === "chromium") { cdp = await ctx.newCDPSession(page); await cdp.send("Performance.enable"); }
    for (const pose of poses) {
      if (pose !== null) { await page.evaluate((u) => { window.__arcade.Scenes.cur.pose = u; }, pose); await page.waitForTimeout(900); }
      // the main thread over a stretch of the game's own frames: script, and (Chromium) style, layout, paint
      const C0 = cdp ? Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value])) : null;
      if (CPU && cdp) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 250 }); await cdp.send("Profiler.start"); }
      await page.evaluate(() => { const c = window.__cpu; c.sum = 0; c.n = 0; c.max = 0; });
      await page.waitForTimeout(3000);
      const cpu = await page.evaluate(() => { const c = window.__cpu; return { ms: c.n ? c.sum / c.n : 0, max: c.max, n: c.n }; });
      let hot = null;
      if (CPU && cdp) {
        const { profile } = await cdp.send("Profiler.stop"), byId = new Map(profile.nodes.map((n) => [n.id, n])), self = new Map();
        for (let i = 0; i < profile.samples.length; i++) { const id = profile.samples[i], dt = (profile.timeDeltas[i + 1] || 0) / 1000; self.set(id, (self.get(id) || 0) + dt); }
        const by = new Map();
        for (const [id, ms] of self) {
          const cf = byId.get(id).callFrame, own = cf.url && cf.url.endsWith(HTML), k = (cf.functionName || "(anonymous)") + (own ? " " + srcAt(cf.lineNumber) : cf.url ? " " + cf.url.split("/").pop().slice(0, 30) : "");
          if (/^\((idle|program|root)\)/.test(k)) continue;
          by.set(k, (by.get(k) || 0) + ms);
        }
        hot = [...by].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, ms]) => [k, +(ms / Math.max(1, cpu.n)).toFixed(3)]);
      }
      const C1 = cdp ? Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value])) : null;
      const per = (k) => (C0 && C1 && cpu.n ? ((C1[k] - C0[k]) * 1000) / cpu.n : null);
      const main = cdp ? { style: per("RecalcStyleDuration"), layout: per("LayoutDuration"), script: per("ScriptDuration"), task: per("TaskDuration") } : null;
      // (--paint) the game held still for three seconds: what the page's own animations cost while it stands
      let paint = null;
      if (PAINT) {
        await page.evaluate(() => { window.__hold = true; });
        await page.waitForTimeout(300);
        await browser.startTracing(page, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline"] });
        await page.waitForTimeout(3000);
        const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents || [];
        const sum = (names) => ev.filter((e) => names.includes(e.name) && e.ph === "X").reduce((a, e) => a + (e.dur || 0), 0) / 1000 / 3;
        paint = { style: +sum(["UpdateLayoutTree", "RecalcStyle"]).toFixed(2), layout: +sum(["Layout"]).toFixed(2), paint: +sum(["Paint", "PaintImage"]).toFixed(2), raster: +sum(["RasterTask"]).toFixed(2), paints: +(ev.filter((e) => e.name === "Paint" && e.ph === "X").length / 3).toFixed(1) };
        await page.evaluate(() => { window.__hold = false; const q = window.__queued; window.__queued = []; q.forEach((cb) => requestAnimationFrame(cb)); });
        await page.waitForTimeout(300);
      }
      // the game held still; a frame drawn alone and timed to its end, then the parts
      const r = await page.evaluate(async ([frames, parts]) => {
        window.__hold = true;
        await new Promise((res) => setTimeout(res, 120));
        const A = window.__arcade, G = A.GFX, R = G.renderer, gl = R.getContext(), s = A.Scenes.cur, sc = s.scene, cam = s.camera;
        const px1 = new Uint8Array(4);
        const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1);
        // one frame, counted: passes, pixels, draws, triangles
        let pxs = 0, passes = 0, draws = 0, tris = 0, sizes = new Map();
        const realRender = R.render.bind(R);
        R.render = function (scene, camera) { const t = R.getRenderTarget(), w = t ? t.width : R.domElement.width, h = t ? t.height : R.domElement.height, smp = t && t.samples ? t.samples : 1; pxs += w * h * smp; passes++; const k = w + "x" + h; sizes.set(k, (sizes.get(k) || 0) + 1); const c0 = R.info.render.calls, t0 = R.info.render.triangles; const o = realRender(scene, camera); draws += R.info.render.calls - c0; if (scene === sc) tris += R.info.render.triangles - t0; return o; };
        R.info.autoReset = false;
        G.render(sc, cam, 0); sync();
        R.render = realRender; R.info.autoReset = true;
        const counted = { passes, mpx: +(pxs / 1e6).toFixed(2), draws, tris, sizes: [...sizes].map(([k, n]) => (n > 1 ? n + "x " : "") + k).join(" ") };
        // the frame's drawing time: the median of a few, each drawn and finished alone
        const time = () => { const ts = []; for (let i = 0; i < frames; i++) { const t0 = performance.now(); G.render(sc, cam, 0); sync(); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); return ts[Math.floor(ts.length / 2)]; };
        time(); // (a first draw: anything not yet made is made now, not timed)
        const ms = time();
        // what the scene holds and lights
        let lights = 0, point = 0, spot = 0, dir = 0, casters = 0;
        sc.traverseVisible((o) => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight && o.layers.test(cam.layers)) { lights++; if (o.isPointLight) point++; else if (o.isSpotLight) spot++; else if (o.isDirectionalLight) dir++; } if (o.isMesh && o.castShadow) casters++; });
        const M = window.__mem, sum = (m) => { let b = 0; for (const v of m.values()) b += typeof v === "number" ? v : Object.values(v).reduce((a, x) => a + x, 0); return b; };
        const mb = (b) => +(b / 1048576).toFixed(1);
        const res = { pr: +(G.scenePR ? G.scenePR() : 1).toFixed(2), size: Math.round(G.w * G.scenePR()) + "x" + Math.round(G.h * G.scenePR()), tier: G.TIERS[G.tier].name, ...counted, ms: +ms.toFixed(1),
          lights, point, spot, dir, casters, shadows: !!R.shadowMap.enabled, texMB: mb(sum(M.tex)), rtMB: mb(sum(M.rb)), bufMB: mb(sum(M.buf)), textures: M.tex.size, programs: (R.info.programs || []).length };
        if (window.__wantTextures) {
          const rows = [], eras = {};
          for (const [t, m] of M.tex) { const b = Object.values(m).reduce((a, x) => a + x, 0), L = M.label.get(t) || { what: "?", era: "?" }; rows.push([b, L.what, L.era]); eras[L.era] = (eras[L.era] || 0) + b; }
          rows.sort((a, b) => b[0] - a[0]);
          res.texTop = rows.slice(0, 18).map(([b, w, e]) => [mb(b), w, e]);
          res.texByEra = Object.entries(eras).sort((a, b) => b[1] - a[1]).map(([e, b]) => [e, mb(b)]);
        }
        if (parts) {
          // each part of the scene left out in turn (its top-level pieces, named), then each layer of the post-processing
          const label = (o, i) => o.name || (o.isLight ? o.type : (o.type || "obj") + "#" + i) + (o.children && o.children.length && !o.name ? "(" + o.children.length + ")" : "");
          const groups = new Map();
          sc.children.forEach((o, i) => { if (!o.visible) return; const k = o.isLight ? "lights: " + o.type : label(o, i).replace(/#\d+/, ""); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });
          const cost = [];
          for (const [k, list] of groups) { list.forEach((o) => (o.visible = false)); const m = time(); list.forEach((o) => (o.visible = true)); cost.push([k + (list.length > 1 ? " x" + list.length : ""), +(ms - m).toFixed(1)]); }
          const O = G.opt, post = [["bloom", "bloom"], ["scanlines", "scan"], ["colour fringe", "ca"], ["vignette", "vignette"], ["grain", "grain"], ["god rays", "beams"]];
          for (const [lbl, key] of post) { if (O[key] === false) continue; O[key] = false; const m = time(); O[key] = true; cost.push(["post: " + lbl, +(ms - m).toFixed(1)]); }
          // the drawing size: the same frame at three quarters of the pixels across (what the pixels themselves cost)
          const pr0 = G._pr; R.setPixelRatio(G.outPR() * 0.75); G.pipe.resize(Math.round(G.w * pr0 * 0.75), Math.round(G.h * pr0 * 0.75)); const m75 = time(); G.resize();
          cost.push(["size: 3/4 across (saves)", +(ms - m75).toFixed(1)]);
          cost.sort((a, b) => b[1] - a[1]);
          res.parts = cost;
        }
        window.__hold = false; const q = window.__queued; window.__queued = []; q.forEach((cb) => requestAnimationFrame(cb));
        return res;
      }, [FRAMES, PARTS]).catch((e) => ({ error: e.message.slice(0, 200) }));
      r.cpu = +cpu.ms.toFixed(2); r.cpuMax = +cpu.max.toFixed(1);
      if (hot) r.hot = hot;
      if (main) { r.style = main.style === null ? null : +main.style.toFixed(2); r.layout = main.layout === null ? null : +main.layout.toFixed(2); r.task = main.task === null ? null : +main.task.toFixed(2); }
      if (paint) r.paint = paint;
      r.errors = errors.slice(0, 2);
      out.push([pose === null ? name : name + "@" + pose, r]);
      console.error("measured", pose === null ? name : name + "@" + pose);
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(`${ENGINE}, ${HTML}, tier ${TIER} (a phone's tiers); frame ms: this machine's software drawing (compare, do not read as a phone's)`);
  console.log("screen      tier    pr    size       passes  Mpx    draws  tris     lights(p/s/d) shadow  tex MB  RT MB  buf MB  frame ms  cpu ms (max)  style+layout ms  sizes");
  for (const [n, r] of out) {
    if (r.error) { console.log(n.padEnd(11), "ERROR", r.error); continue; }
    console.log(`${n.padEnd(11)} ${String(r.tier).padEnd(7)} ${String(r.pr).padEnd(5)} ${String(r.size).padEnd(10)} ${String(r.passes).padEnd(7)} ${String(r.mpx).padEnd(6)} ${String(r.draws).padEnd(6)} ${String(r.tris).padEnd(8)} ${(r.lights + " (" + r.point + "/" + r.spot + "/" + r.dir + ")").padEnd(13)} ${(r.shadows ? r.casters + " casters" : "off").padEnd(7)} ${String(r.texMB).padEnd(7)} ${String(r.rtMB).padEnd(6)} ${String(r.bufMB).padEnd(7)} ${String(r.ms).padEnd(9)} ${(r.cpu + " (" + r.cpuMax + ")").padEnd(13)} ${r.style === undefined || r.style === null ? "-".padEnd(16) : ((r.style + r.layout).toFixed(2)).padEnd(16)} ${r.sizes}`);
    if (r.paint) console.log(`            the page standing still (its CSS), a second: style ${r.paint.style} ms · layout ${r.paint.layout} ms · paint ${r.paint.paint} ms · raster ${r.paint.raster} ms · ${r.paint.paints} paints`);
    if (r.parts) console.log("            top costs: " + r.parts.slice(0, 5).map(([k, v]) => `${k} ${v} ms`).join(" · "));
    if (r.hot) console.log("            main thread, ms a frame by function: " + r.hot.map(([k, v]) => `${k} ${v}`).join(" · "));
    if (r.texByEra) console.log("            textures by the screen up when each was sent (MB): " + r.texByEra.map(([e, v]) => `${e} ${v}`).join(" · "));
    if (r.texTop) for (const [mbs, w, e] of r.texTop) console.log(`              ${String(mbs).padStart(6)} MB  ${w}  (sent during ${e})`);
    if (r.errors && r.errors.length) console.log("            errors: " + r.errors.join(" | "));
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
