#!/usr/bin/env node
/**
 * Where a screen's drawing cost comes from: every visible mesh in its scene, grouped by the model (or object) it
 * belongs to, with copies, triangles, draw calls and materials, then every light (kind, intensity, distance, what it
 * hangs on). Phone-sized window, assets served, as perf-report.js.
 *
 *   node arcade/tools/scene-census.js [--html index.html] [--only blaster] [--tier 1] [--top 30] [--wait 4000]
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const HTML = flag("html", "index.html"), ONLY = flag("only", "blaster"), TIER = flag("tier", "1"), TOP = +flag("top", 30), WAIT = +flag("wait", 4000);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const GO = { title: "go('title')", hub: "go('hub')", blaster: "go('blaster','3')", racer: "go('racer','2')", boss: "go('boss','1')", memory: "go('memory','2')", exam: "go('exam')", guide: "go('guide')" };
(async () => {
  const srv = http.createServer((req, rsp) => {
    const file = path.join(ARCADE, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(ARCADE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end("no"); return; }
    rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(rsp);
  }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  const base = "http://127.0.0.1:" + srv.address().port;
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  for (const name of ONLY.split(",")) {
    const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("pageerror", e.message));
    await page.goto(base + "/" + HTML + "#debug");
    await page.waitForFunction(() => window.__arcade && window.__arcade.GFX, null, { timeout: 60000 });
    await page.evaluate((t) => { const G = window.__arcade.GFX; if (G.setTier) { G.auto = false; G.setTier(+t, "census"); } }, TIER);
    await page.evaluate(`window.__arcade.${GO[name]}`);
    await page.waitForFunction(() => { const A = window.__arcade; return A.Scenes && A.Scenes.cur && !document.getElementById("loading"); }, null, { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(WAIT);
    const r = await page.evaluate((top) => {
      const A = window.__arcade, sc = A.Scenes.cur && A.Scenes.cur.scene, cam = A.Scenes.cur && A.Scenes.cur.camera;
      if (!sc) return { error: "no scene" };
      const groups = {}, lights = [];
      // the model a mesh belongs to: the nearest ancestor with a name that is not a generic node name
      const owner = (o) => { let p = o, best = o.name || o.type; while (p && p !== sc) { if (p.userData && (p.userData.inr || p.userData.model)) return (p.userData.model || p.name || "model"); if (p.name && !/^(mesh|node|object|group|scene|root|Scene|RootNode)\d*$/i.test(p.name)) best = p.name; p = p.parent; } return best; };
      const tris = (g) => { if (!g) return 0; const n = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0; return (g.drawRange && g.drawRange.count < Infinity ? Math.min(n, g.drawRange.count) : n) / 3; };
      const frustum = new (window.THREE || A.THREE).Frustum(), m = new (window.THREE || A.THREE).Matrix4();
      if (cam) { cam.updateMatrixWorld(); m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(m); }
      sc.traverseVisible((o) => {
        if (o.isLight) { if (!o.isAmbientLight && !o.isHemisphereLight) lights.push({ kind: o.type.replace("Light", ""), name: o.name || "", parent: (o.parent && (o.parent.name || o.parent.type)) || "", i: +o.intensity.toFixed(2), d: o.distance !== undefined ? +(+o.distance).toFixed(1) : null, color: "#" + o.color.getHexString() }); return; }
        if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
        const k = owner(o), g = groups[k] || (groups[k] = { meshes: 0, inst: 0, tris: 0, inView: 0, mats: new Set(), kinds: new Set() });
        const copies = o.isInstancedMesh ? o.count : 1, t = o.isMesh ? tris(o.geometry) * copies : 0;
        g.meshes++; g.inst += copies; g.tris += t;
        let vis = true; if (cam && o.geometry && !o.isInstancedMesh && o.frustumCulled) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); vis = frustum.intersectsSphere(s); }
        if (vis) g.inView += t;
        [].concat(o.material || []).forEach((mm) => { g.mats.add(mm.uuid); g.kinds.add(mm.type.replace("Material", "")); });
      });
      const rows = Object.entries(groups).map(([k, g]) => ({ k, meshes: g.meshes, inst: g.inst, tris: Math.round(g.tris), inView: Math.round(g.inView), mats: g.mats.size, kinds: [...g.kinds].join("/") })).sort((a, b) => b.tris - a.tris);
      const total = rows.reduce((s, r) => s + r.tris, 0), totalView = rows.reduce((s, r) => s + r.inView, 0);
      return { rows: rows.slice(0, top), more: rows.length - top, total, totalView, meshes: rows.reduce((s, r) => s + r.meshes, 0), lights };
    }, TOP);
    if (r.error) { console.log(name, r.error); continue; }
    console.log(`\n== ${name}: ${r.meshes} visible meshes, ${r.total} triangles (${r.totalView} in the camera's view)`);
    console.log("model/object".padEnd(34), "meshes copies   tris   in-view  mats  kinds");
    for (const x of r.rows) console.log(String(x.k).slice(0, 33).padEnd(34), String(x.meshes).padStart(6), String(x.inst).padStart(6), String(x.tris).padStart(7), String(x.inView).padStart(8), String(x.mats).padStart(5), " " + x.kinds);
    if (r.more > 0) console.log(`... and ${r.more} more groups`);
    console.log(`lights (${r.lights.length}):`);
    for (const l of r.lights) console.log(`  ${l.kind.padEnd(12)} i ${String(l.i).padEnd(5)} d ${String(l.d).padEnd(5)} ${l.color}  ${l.name}  on ${l.parent}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
