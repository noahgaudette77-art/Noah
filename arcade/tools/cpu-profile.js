#!/usr/bin/env node
/**
 * Where a screen's main-thread time goes: a sampling profile of a few seconds of play (Chrome's own profiler), as
 * self time per function, with the source file each comes from. Phone-sized window, assets served, as perf-report.js.
 *
 *   node arcade/tools/cpu-profile.js [--only blaster] [--tier 1] [--secs 4] [--top 30]
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const ONLY = flag("only", "blaster"), TIER = flag("tier", "1"), SECS = +flag("secs", 4), TOP = +flag("top", 30);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const GO = { title: "go('title')", hub: "go('hub')", blaster: "go('blaster','3')", racer: "go('racer','2')", boss: "go('boss','1')", memory: "go('memory','2')", exam: "go('exam')", guide: "go('guide')" };
// which source file a line of the built page came from: the build marks each file's start with a comment
const html = fs.readFileSync(path.join(ARCADE, "index.html"), "utf8").split("\n");
const marks = []; html.forEach((l, i) => { const m = l.match(/^\/\* ---- (\S+\.js) ---- \*\//); if (m) marks.push([i, m[1]]); });
const fileOf = (line) => { let f = "?"; for (const [i, n] of marks) { if (i <= line) f = n; else break; } return f; };
(async () => {
  const srv = http.createServer((req, rsp) => { const file = path.join(ARCADE, decodeURIComponent(req.url.split("?")[0])); if (!file.startsWith(ARCADE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end(); return; } rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(rsp); }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  for (const name of ONLY.split(",")) {
    const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto("http://127.0.0.1:" + srv.address().port + "/index.html#debug");
    await page.waitForFunction(() => window.__arcade && window.__arcade.GFX, null, { timeout: 60000 });
    await page.evaluate((t) => { const G = window.__arcade.GFX; G.auto = false; G.setTier(+t, "profile"); }, TIER);
    await page.evaluate(`window.__arcade.${GO[name]}`);
    await page.waitForFunction(() => { const A = window.__arcade; return A.Scenes && A.Scenes.cur && !document.getElementById("loading"); }, null, { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
    await cdp.send("Profiler.start");
    await page.waitForTimeout(SECS * 1000);
    const { profile } = await cdp.send("Profiler.stop");
    const byId = new Map(profile.nodes.map((n) => [n.id, n])), self = new Map();
    const dts = profile.timeDeltas; let total = 0;
    profile.samples.forEach((id, i) => { const n = byId.get(id), d = (dts[i + 1] || 0) / 1000; total += d; const f = n.callFrame; const key = (f.functionName || "(anonymous)") + "  " + (f.url ? (/index\.html/.test(f.url) ? fileOf(f.lineNumber) + ":" + (f.lineNumber + 1) : f.url.split("/").pop() + ":" + (f.lineNumber + 1)) : "(" + (f.functionName || "native") + ")"); self.set(key, (self.get(key) || 0) + d); });
    const idle = [...self.entries()].filter(([k]) => /^\(idle\)|^\(program\)|^\(garbage collector\)/.test(k)).reduce((s, [, v]) => s + v, 0);
    console.log(`\n== ${name}: ${(total / 1000).toFixed(1)} s sampled; busy ${((total - (self.get("(idle)  ((idle))") || 0)) / total * 100).toFixed(0)}%`);
    const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);
    for (const [k, v] of rows) console.log(`${(v / total * 100).toFixed(1).padStart(5)}%  ${(v).toFixed(0).padStart(6)} ms  ${k}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
