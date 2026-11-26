#!/usr/bin/env node
/**
 * The title hall's first glide in real time (the owner, 2026-11-26: "lots of stutter in the first screen ... from
 * beginning to end"): the page opened fresh, as a first visit opens it, its files coming over a connection of a given
 * speed, and every frame of the glide timed, with what the page did in it: each picture and shape sent to the graphics
 * chip (its size and how long the call took), each shader linked or compiled, each reflection made (PMREM), each long
 * task (Chromium), the tier, the piece of the hall coming in. Not the virtual clock of capture.js: the page runs as on
 * a device, its files arriving while it glides.
 *
 * This machine draws in software, so a frame's own drawing is slow here and its time says little of a device's; what
 * matters is what lands in a frame on top of its drawing (the frames that take longest beside their neighbours, and
 * why). Draw small to keep the drawing out of the way (the default size).
 *
 *   node arcade/tools/glide-frames.js [--engine webkit] [--phone] [--size 960x540] [--rate 6] [--secs 90]
 *                                     [--build arcade/index.html] [--out <dir>] [--quality high|medium]
 *
 * --rate: the connection, in MB/s (6: about 50 Mbit/s; 0: as fast as the disk). --phone: the page takes itself for a
 * phone (#phone: its pictures no larger than 2048, its lighter models) and Setup's MEDIUM (a phone's PHONE tier).
 * Writes glide-frames.json and prints the worst frames and what was in them.
 */
const fs = require("fs"), path = require("path"), http = require("http");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; }, has = (k) => args.includes("--" + k);
const ENGINE = flag("engine", "chromium"), PHONE = has("phone"), SIZE = flag("size", PHONE ? "195x422" : "400x225").split("x").map(Number);
const RATE = +flag("rate", "6") * 1048576, SECS = +flag("secs", "90"), QUALITY = flag("quality", PHONE ? "medium" : "");
const BUILD = path.resolve(flag("build", path.join(__dirname, "..", "index.html"))), OUT = path.resolve(flag("out", path.join(__dirname, "..", "docs", "master", "runs", "glide-frames")));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".glb": "model/gltf-binary", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".opus": "audio/ogg", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webm": "video/webm" };

// a server whose connection is shared and of a given speed: each file's bytes go out in turn, 64 KB at a time
function serve(root) {
  let free = 0;
  const wait = (n) => { if (!RATE) return 0; const now = Date.now(), at = Math.max(now, free); free = at + (n / RATE) * 1000; return at - now; };
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const file = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/" + path.basename(BUILD)));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end("not found"); return; }
      const buf = fs.readFileSync(file);
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Content-Length": buf.length, "Cache-Control": "no-store" });
      let i = 0;
      const next = () => { if (i >= buf.length) { rsp.end(); return; } const n = Math.min(65536, buf.length - i), d = wait(n); setTimeout(() => { rsp.write(buf.subarray(i, i + n)); i += n; next(); }, d); };
      setTimeout(next, RATE ? 20 : 0); // (a first byte's latency)
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

// in the page, before anything else
function inPage(quality) {
  if (quality) { try { const k = "inr-arcade-v1", s = JSON.parse(localStorage.getItem(k) || "{}"); s.settings = Object.assign({}, s.settings, { quality }); localStorage.setItem(k, JSON.stringify(s)); } catch (e) { /* */ } }
  const E = (window.__gf = { frames: [], st: [], ev: [], lt: [], tiers: [] }), now = () => performance.now();
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) E.lt.push([+e.startTime.toFixed(1), +e.duration.toFixed(1)]); }).observe({ type: "longtask", buffered: true }); } catch (e) { /* WebKit has none */ }
  let hooked = false;
  const hookThree = () => {
    const A = window.__arcade, T = window.THREE;
    if (hooked || !A || !T || !A.GFX) return;
    hooked = true;
    if (A.GFX.renderer) A.GFX.renderer.debug.checkShaderErrors = false; // (as the live page: #debug alone keeps three.js's checks, which wait on every shader)
    const P = T.PMREMGenerator.prototype;
    for (const k of ["fromEquirectangular", "fromScene", "fromCubemap"]) { const f = P[k]; P[k] = function () { const t0 = now(), r = f.apply(this, arguments); E.ev.push([+t0.toFixed(1), +(now() - t0).toFixed(2), "PMREM." + k, ""]); return r; }; }
    const G = A.GFX, st = G.setTier.bind(G);
    G.setTier = (n, why) => { E.tiers.push([+now().toFixed(1), G.tier, n, why || ""]); return st(n, why); };
    const R = G.renderer;
    if (R && R.initTexture) { const it = R.initTexture.bind(R); R.initTexture = (t) => { const t0 = now(); it(t); const d = now() - t0; if (d > 0.3) E.ev.push([+t0.toFixed(1), +d.toFixed(2), "initTexture", (t.image && (t.image.width + "x" + t.image.height)) || ""]); }; }
  };
  const loop = (t) => {
    E.frames.push(+t.toFixed(2));
    hookThree();
    const A = window.__arcade, s = A && A.Scenes && A.Scenes.cur;
    E.st.push(s ? [s.constructor.name, s.state || "", s.gt !== undefined ? +s.gt.toFixed(2) : -1, s.job ? 1 : 0, s.cells ? s.cells.filter((c) => c.ready).length : -1, A.GFX ? A.GFX.tier : -1] : null);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  const gc = HTMLCanvasElement.prototype.getContext, done = new WeakSet();
  HTMLCanvasElement.prototype.getContext = function (type, opts) {
    const gl = gc.call(this, type, opts);
    if (gl && /webgl/.test(type) && !done.has(gl)) { done.add(gl); wrap(gl); }
    return gl;
  };
  function wrap(gl) {
    const src = (a) => { const s = a.length === 6 ? a[5] : a.length >= 9 ? a[8] : null; const w = (s && (s.naturalWidth || s.videoWidth || s.width)) || (a.length >= 9 ? a[3] : 0), h = (s && (s.naturalHeight || s.videoHeight || s.height)) || (a.length >= 9 ? a[4] : 0); return w + "x" + h + (s && s.constructor ? " " + s.constructor.name.replace(/^HTML|Element$/g, "") : ""); };
    const time = (name, info, min = 0.3) => { const f = gl[name]; if (typeof f !== "function") return; gl[name] = function () { const t0 = now(), r = f.apply(gl, arguments), d = now() - t0; if (d >= min) E.ev.push([+t0.toFixed(1), +d.toFixed(2), name, info ? info(arguments) : ""]); return r; }; };
    time("texImage2D", src, 0); time("texSubImage2D", src, 0); time("texStorage2D", (a) => a[3] + "x" + a[4], 0); time("generateMipmap", null, 0);
    time("compressedTexImage2D", (a) => a[3] + "x" + a[4], 0); time("linkProgram", null, 0); time("compileShader"); time("getProgramParameter", (a) => String(a[1]), 0.5);
    time("bufferData", (a) => String((a[1] && a[1].byteLength) || a[1]), 0.5); time("readPixels"); time("clear", null, 2); time("drawElements", null, 2); time("drawArrays", null, 2);
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(path.dirname(BUILD)), url = "http://127.0.0.1:" + srv.address().port + "/" + path.basename(BUILD) + "#debug" + (PHONE ? ",phone" : ""); // (#debug: the page's handle for tests; its one other change, the shader checks, is undone below)
  let browser;
  if (ENGINE === "webkit") {
    const dir = process.env.WEBKIT_BROWSERS_PATH, wk = dir && fs.existsSync(dir) && fs.readdirSync(dir).find((d) => /^webkit-\d+$/.test(d));
    browser = await require("playwright").webkit.launch(wk ? { executablePath: path.join(dir, wk, "pw_run.sh") } : {});
  } else browser = await require("playwright").chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: SIZE[0], height: SIZE[1] }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message)));
  await page.addInitScript(inPage, QUALITY || "");
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "commit", timeout: 180000 });
  // to the end of the glide (or SECS), in real time
  let end = null, said = 0;
  while ((Date.now() - t0) / 1000 < SECS) {
    await page.waitForTimeout(2000);
    const s = await page.evaluate(() => { const A = window.__arcade, s = A && A.Scenes && A.Scenes.cur, E = window.__gf; return { n: s ? s.constructor.name : "", state: s && s.state, gt: s && s.gt, frames: E.frames.length, ev: E.ev.length }; }).catch(() => null);
    if (s && Date.now() - said > 15000) { said = Date.now(); console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)} s: ${s.n} ${s.state || ""} ${s.gt !== undefined && s.gt !== null ? s.gt.toFixed(1) + " s into the glide" : ""}, ${s.frames} frames, ${s.ev} events`); }
    if (s && s.n === "HallScene" && s.state && s.state !== "glide") { end = s; break; }
  }
  const E = await page.evaluate(() => window.__gf);
  await browser.close(); srv.close();
  // each frame: its time (to the next frame's start), the state then, the events that started in it
  const F = E.frames, rows = [];
  let k = 0;
  const ev = E.ev.slice().sort((a, b) => a[0] - b[0]), lt = E.lt.slice().sort((a, b) => a[0] - b[0]);
  for (let i = 0; i + 1 < F.length; i++) {
    const a = F[i], b = F[i + 1], st = E.st[i + 1] || E.st[i], r = { i, at: a, ms: +(b - a).toFixed(1), st, ev: [], evMs: 0, lt: 0 };
    while (k < ev.length && ev[k][0] < a) k++;
    for (let j = k; j < ev.length && ev[j][0] < b; j++) { r.ev.push(ev[j]); r.evMs += ev[j][1]; }
    for (const L of lt) if (L[0] >= a && L[0] < b) r.lt = Math.max(r.lt, L[1]);
    r.evMs = +r.evMs.toFixed(1);
    rows.push(r);
  }
  const glide = rows.filter((r) => r.st && r.st[0] === "HallScene" && r.st[1] === "glide");
  const med = (xs) => { const s = xs.slice().sort((p, q) => p - q); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const base = med(glide.map((r) => r.ms));
  const sum = {};
  for (const r of glide) for (const e of r.ev) { const key = e[2] + (e[2].startsWith("tex") || e[2] === "initTexture" ? " " + e[3].split(" ")[0] : ""); const s = (sum[key] = sum[key] || { n: 0, ms: 0, max: 0 }); s.n++; s.ms += e[1]; s.max = Math.max(s.max, e[1]); }
  const out = { engine: ENGINE, phone: PHONE, size: SIZE, rate: RATE / 1048576, secs: (Date.now() - t0) / 1000, end, base, frames: glide.length, tiers: E.tiers, errors, worst: glide.slice().sort((p, q) => (q.ms - base) - (p.ms - base)).slice(0, 40), sum, rows };
  fs.writeFileSync(path.join(OUT, "glide-frames.json"), JSON.stringify(out));
  console.log(`${ENGINE}${PHONE ? " (phone)" : ""} ${SIZE.join("x")}, ${RATE / 1048576} MB/s: the glide ${end ? "ended" : "did not end"} after ${out.secs.toFixed(0)} s; ${glide.length} frames, median ${base} ms; tiers ${JSON.stringify(E.tiers)}; errors ${errors.length}`);
  console.log("what landed in the glide's frames (calls of 0.3 ms or more, and every picture sent):");
  for (const [key, s] of Object.entries(sum).sort((p, q) => q[1].ms - p[1].ms).slice(0, 25)) console.log(`  ${key.padEnd(34)} ${String(s.n).padStart(4)}x  ${s.ms.toFixed(0).padStart(6)} ms in all, the most ${s.max.toFixed(1)} ms`);
  console.log(`the 25 frames furthest over the median (${base} ms):`);
  for (const r of out.worst.slice(0, 25)) console.log(`  #${r.i} at ${(r.at / 1000).toFixed(1)} s, glide ${r.st ? r.st[2] : "?"} s: ${r.ms} ms (GL calls ${r.evMs} ms${r.lt ? ", long task " + r.lt + " ms" : ""}) ${r.ev.slice().sort((p, q) => q[1] - p[1]).slice(0, 3).map((e) => e[2] + " " + e[3] + " " + e[1] + "ms").join("; ")}`);
})().catch((e) => { console.error(e); process.exit(1); });
