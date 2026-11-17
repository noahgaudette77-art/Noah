#!/usr/bin/env node
/**
 * Capture stills and frame sequences of the game for review.
 *
 *   node tools/capture.js <scenario.js> [--out dir] [--size 390x844] [--dpr 2] [--file] [--build index.html]
 *
 * The page runs on a virtual clock (every frame is exactly 1/60 s, as in the regression test), so a scenario is
 * repeatable frame for frame. Frames that are not kept are not drawn (software WebGL is slow); a kept frame is
 * drawn for real, after one drawn frame before it so motion blur shows one frame's motion and no more.
 *
 * A scenario exports async (cap) => { ... } and drives the page with:
 *   cap.go(game, stage)          start a game ("boss", "4"), skipping its briefing
 *   cap.fast(n)                  n frames, not drawn
 *   cap.until(js, max)           frames until the expression is true in the page (not drawn)
 *   cap.ask()                    frames until a question is up and can be answered
 *   cap.answer("R" | "W" | i)    pick the right answer, a wrong one, or slot i
 *   cap.next()                   dismiss the explanation sheet, if one is up
 *   cap.shot(name, {band})       one still (band: only the strip the 3D view shows in)
 *   cap.seq(name, n, every, {band, cols, thumb})   n stills `every` frames apart, and a strip of them side by side
 *   cap.eval(fn, arg)            run something in the page
 * Served over HTTP by default, so the asset files load; --file opens it from disk, as the regression does. --reduced:
 * the browser asks for reduced motion (REDUCED_MOTION in the page; a scenario sets Setup > Reduced effects itself).
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf("--" + k); if (i < 0) return d; const v = args[i + 1] && !args[i + 1].startsWith("--") ? args.splice(i + 1, 1)[0] : true; args.splice(i, 1); return v; };
const OUT = path.resolve(flag("out", "captures")), [W, H] = String(flag("size", "390x844")).split("x").map(Number), DPR = +flag("dpr", 2), FILE = !!flag("file", false), BUILD = path.resolve(flag("build", path.join(ARCADE, "index.html"))), REDUCED = !!flag("reduced", false);
const scenario = args[0] && path.resolve(args[0]);
if (!scenario) { console.error("usage: capture.js <scenario.js> [--out dir] [--size WxH] [--dpr n] [--file]"); process.exit(2); }

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".wasm": "application/wasm", ".ktx2": "image/ktx2", ".bin": "application/octet-stream" };
function serve(root) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end("not found"); return; }
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      fs.createReadStream(file).pipe(rsp);
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

// Runs in the page before anything else: the virtual clock (as in scripts/arcade-regression.js) and seeded randomness.
function inPage() {
  let now = 5000, tid = 1, rafs = [], rid = 1;
  const timers = new Map();
  performance.now = () => now;
  const realDate = Date.now.bind(Date), t0 = realDate();
  Date.now = () => t0 + (now - 5000);
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.set(id, { t: now + Math.max(0, +ms || 0), fn, a }); return id; };
  window.clearTimeout = (id) => { timers.delete(id); };
  window.setInterval = (fn, ms, ...a) => { const id = tid++; timers.set(id, { t: now + (+ms || 0), fn, a, every: Math.max(1, +ms || 0) }); return id; };
  window.clearInterval = window.clearTimeout;
  window.requestAnimationFrame = (fn) => { const id = rid++; rafs.push({ id, fn }); return id; };
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter((r) => r.id !== id); };
  let seed = 12345;
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const C = (window.__cap = { frame: 0, errors: [], draw: true, render: null });
  window.addEventListener("error", (e) => C.errors.push(String(e.message)));
  window.__tick = (n, draw) => {
    const A = window.__arcade, rr = A && A.GFX && A.GFX.renderer;
    if (rr && !C.render) C.render = rr.render;
    for (let i = 0; i < n; i++) {
      if (rr) rr.render = draw && i >= n - 2 ? C.render : () => {}; // the last two frames are drawn: the one kept, and the one before it
      now += 1000 / 60;
      const due = [...timers].filter(([, t]) => t.t <= now).sort((a, b) => a[1].t - b[1].t || a[0] - b[0]);
      for (const [id, t] of due) { if (!timers.has(id)) continue; if (t.every) t.t = Math.max(now, t.t + t.every); else timers.delete(id); try { t.fn(...t.a); } catch (e) { C.errors.push("timer: " + e.message); } }
      const q = rafs; rafs = [];
      for (const r of q) { try { r.fn(now); } catch (e) { C.errors.push("frame: " + e.message + " " + String(e.stack).split("\n")[1]); } }
      C.frame++;
      const skip = document.querySelector(".dlg-wrap [data-act=skip]");
      if (skip && C.skipDialogs) skip.click();
    }
    if (rr) rr.render = C.render;
    return C.frame;
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = FILE ? null : await serve(path.dirname(BUILD));
  const url = (FILE ? "file://" + BUILD : "http://127.0.0.1:" + srv.address().port + "/" + path.basename(BUILD)) + "#debug";
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, reducedMotion: REDUCED ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });
  await page.route("https://cdnjs.cloudflare.com/**", (r) => r.fulfill({ path: path.join(ARCADE, "vendor/three.min.js"), contentType: "application/javascript" }));
  await page.addInitScript(inPage);
  await page.goto(url);
  for (let i = 0; i < 300; i++) {
    await page.evaluate(() => window.__tick(10, false));
    if (await page.evaluate(() => !!(window.__arcade && window.__arcade.Scenes.cur))) break;
    await page.waitForTimeout(20);
  }
  const cap = {
    page, out: OUT, errors,
    eval: (fn, arg) => page.evaluate(fn, arg),
    fast: (n) => page.evaluate((k) => window.__tick(k, false), n),
    async until(js, max = 3600) { for (let i = 0; i < max; i += 4) { if (await page.evaluate(js)) return true; await page.evaluate(() => window.__tick(4, false)); } return false; },
    async go(game, stage = "2") {
      await page.evaluate(() => { window.__cap.skipDialogs = true; });
      // the game's asset files first (real time: the virtual clock does not move a download), then the game
      await page.evaluate(async ([g, s]) => { const A = window.__arcade; A.Sound.init(); const sel = A.makeSelection(s); const p = A.Assets.need(g, window.__arcade.gameAssets ? window.__arcade.gameAssets(g, sel) : []); if (p) await p; }, [game, stage]);
      const before = await page.evaluate(([g, s]) => { const was = window.__arcade.Scenes.cur; window.__was = was; window.__arcade.go(g, s); return !!was; }, [game, stage]);
      // (the game is built a few frames on, behind the briefing and the cover. Those frames are drawn for real: what a
      // scene renders to a texture while it is built, its reflection maps above all, would otherwise come out empty
      // in every capture.)
      for (let i = 0; i < 8; i++) { await page.evaluate(() => window.__tick(1, true)); if (await page.evaluate(() => window.__arcade.Scenes.cur !== window.__was)) break; }
      await cap.fast(before ? 4 : 6);
    },
    ask: (max) => cap.until(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.state === "ask" && s.round && !(s.quiz && s.quiz.sheet)); }, max),
    answer: (k) => page.evaluate((kind) => { const s = window.__arcade.Scenes.cur, r = s.round; s.pick(kind === "R" ? r.correct : kind === "W" ? (r.correct + 1) % r.n : kind); }, k),
    next: () => page.evaluate(() => { const s = window.__arcade.Scenes.cur; if (s && s.quiz && s.quiz.sheet) s.quiz.next(); }),
    async shot(name, o = {}) {
      await page.evaluate(() => window.__tick(2, true));
      const f = path.join(OUT, name + ".png");
      const clip = o.band ? await cap.band(o.pad || 0) : o.clip;
      await page.screenshot(clip ? { path: f, clip } : { path: f });
      return f;
    },
    // the strip of screen the 3D view shows in (between the question and the answers), as a clip rectangle
    band: (pad = 0) => page.evaluate((p) => { const s = window.__arcade.Scenes.cur; if (!s || !s.band) return null; const top = Math.max(0, s.band.top - p), bottom = Math.min(window.innerHeight, s.band.bottom + p); return { x: 0, y: top, width: window.innerWidth, height: bottom - top }; }, pad),
    // n stills `every` frames apart (the first one now), and a strip of them.
    async seq(name, n = 8, every = 2, o = {}) {
      const files = [];
      if (o.band) { const b = await cap.band(o.pad === undefined ? 0 : o.pad); if (b) o = Object.assign({}, o, { clip: b }); }
      for (let i = 0; i < n; i++) {
        if (i > 0 && every > 2) await page.evaluate((k) => window.__tick(k, false), every - 2);
        await page.evaluate((k) => window.__tick(k, true), i === 0 ? 2 : Math.min(2, every));
        const f = path.join(OUT, `${name}-${String(i).padStart(2, "0")}.png`);
        await page.screenshot(o.clip ? { path: f, clip: o.clip } : { path: f });
        files.push(f);
      }
      const strip = path.join(OUT, name + ".strip.jpg");
      execFileSync("montage", [...files, "-tile", (o.cols || n) + "x", "-geometry", `${o.thumb || 300}x+3+3`, "-background", "#101018", "-quality", "86", strip]);
      if (!o.keep) files.forEach((f) => fs.unlinkSync(f));
      return strip;
    },
  };
  try {
    await require(scenario)(cap);
  } finally {
    const pe = await page.evaluate(() => window.__cap.errors).catch(() => []);
    const all = [...new Set(errors.concat(pe))];
    console.log(all.length ? "ERRORS:\n  " + all.slice(0, 12).join("\n  ") : "no errors");
    await browser.close();
    if (srv) srv.close();
  }
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
