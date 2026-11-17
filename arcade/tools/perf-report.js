#!/usr/bin/env node
/**
 * What each screen costs to draw, on a phone's screen: the size the picture is drawn at, the multisampling, how many
 * million pixels every frame shades across all its passes (the scene, the reflections, every post-processing pass),
 * the draw calls, the lights each lit pixel reckons with, and the textures held.
 *
 *   node arcade/tools/perf-report.js [--html index.html] [--only blaster,hub] [--tier 0..3] [--frames 12]
 *
 * The page is served over HTTP (every asset loaded) in a phone-sized window: 440 x 956 at 3 device pixels per page
 * pixel, touch, as an iPhone 17 Pro Max. This machine draws in software, so its frame rates mean nothing: the pixel
 * and call counts are what to compare from one build to the next. Real frame rates come from the phone (Setup > FPS).
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const HTML = flag("html", "index.html"), ONLY = flag("only", ""), TIER = flag("tier", null), FRAMES = +flag("frames", 12);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const SCREENS = [
  ["title", "go('title')"], ["hub", "go('hub')"], ["blaster", "go('blaster','3')"], ["racer", "go('racer','2')"],
  ["boss", "go('boss','1')"], ["memory", "go('memory','2')"], ["exam", "go('exam')"], ["guide", "go('guide')"],
].filter(([k]) => !ONLY || ONLY.split(",").includes(k));

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
  const rows = [];
  for (const [name, go] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/" + HTML + "#debug");
    await page.waitForFunction(() => window.__arcade && window.__arcade.GFX, null, { timeout: 60000 });
    if (TIER !== null) await page.evaluate((t) => { const G = window.__arcade.GFX; if (G.setTier) { G.auto = false; G.setTier(+t, "report"); } }, TIER);
    await page.evaluate(`window.__arcade.${go}`);
    // wait for the screen's files and its first frames
    await page.waitForFunction(() => { const A = window.__arcade; return A.Scenes && A.Scenes.cur && !document.getElementById("loading"); }, null, { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const r = await page.evaluate(async (frames) => {
      const A = window.__arcade, G = A.GFX, R = G.renderer, gl = R.getContext();
      // every draw into a target counts that target's pixels (times its samples): what the chip shades and stores
      let px = 0, draws = 0, passes = 0;
      const realRender = R.render.bind(R);
      R.render = function (scene, camera) {
        const t = R.getRenderTarget();
        const w = t ? t.width : R.domElement.width, h = t ? t.height : R.domElement.height, s = t && t.samples ? t.samples : 1;
        px += w * h * s; passes++;
        const before = R.info.render.calls;
        const out = realRender(scene, camera);
        draws += R.info.render.calls - before;
        return out;
      };
      R.info.autoReset = false;
      const wait = () => new Promise((res) => requestAnimationFrame(() => res()));
      for (let i = 0; i < 3; i++) await wait();
      px = 0; draws = 0; passes = 0;
      for (let i = 0; i < frames; i++) await wait();
      R.render = realRender; R.info.autoReset = true;
      const sc = A.Scenes.cur && A.Scenes.cur.scene;
      let lights = 0, point = 0, spot = 0, dir = 0;
      if (sc) sc.traverseVisible((o) => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight) { lights++; if (o.isPointLight) point++; else if (o.isSpotLight) spot++; else if (o.isDirectionalLight) dir++; } });
      const pr = G.scenePR ? G.scenePR() : 1;
      return {
        tier: G.TIERS ? G.TIERS[G.tier].name : "(none)",
        canvas: R.domElement.width + "x" + R.domElement.height,
        scene: Math.round(G.w * pr) + "x" + Math.round(G.h * pr),
        samples: G.pipe ? G.pipe.samples : 0,
        mpx: +(px / frames / 1e6).toFixed(1),
        passes: +(passes / frames).toFixed(1),
        draws: Math.round(draws / frames),
        tris: G.pipe ? G.pipe.lastTris : 0,
        lights, point, spot, dir,
        textures: R.info.memory.textures, geometries: R.info.memory.geometries, programs: (R.info.programs || []).length,
      };
    }, FRAMES).catch((e) => ({ error: e.message.slice(0, 160) }));
    rows.push([name, r, errors.slice(0, 2)]);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log("screen    tier     canvas      scene drawn  MSAA  Mpx/frame  passes  draws  tris     lights (point/spot/dir)  textures  programs");
  for (const [n, r, errs] of rows) {
    if (r.error) { console.log(n.padEnd(9), "ERROR", r.error); continue; }
    console.log(`${n.padEnd(9)} ${String(r.tier).padEnd(8)} ${r.canvas.padEnd(11)} ${r.scene.padEnd(12)} ${String(r.samples).padEnd(5)} ${String(r.mpx).padEnd(10)} ${String(r.passes).padEnd(7)} ${String(r.draws).padEnd(6)} ${String(r.tris).padEnd(8)} ${String(r.lights).padEnd(3)} (${r.point}/${r.spot}/${r.dir})               ${String(r.textures).padEnd(9)} ${r.programs}${errs.length ? "   errors: " + errs.join(" | ").slice(0, 120) : ""}`);
  }
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
