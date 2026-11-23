#!/usr/bin/env node
/**
 * What each screen costs to draw, on a phone's screen: the size the picture is drawn at, the multisampling, how many
 * million pixels every frame shades across all its passes (the scene, the reflections, every post-processing pass),
 * the draw calls, the lights each lit pixel reckons with, the textures held, and the main thread's own time per frame
 * (the game's code and its drawing calls: a fair guide to a fast phone's processor, unlike this machine's frame rate).
 *
 *   node arcade/tools/perf-report.js [--html index.html] [--only blaster,hub] [--tier 0..3] [--frames 12] [--wait 2500] [--peak]
 *
 * The page is served over HTTP (every asset loaded) in a phone-sized window: 440 x 956 at 3 device pixels per page
 * pixel, touch, as an iPhone 17 Pro Max. This machine draws in software, so its frame rates mean nothing: the pixel
 * and call counts are what to compare from one build to the next. Real frame rates come from the phone (Setup > FPS).
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const HTML = flag("html", "index.html"), ONLY = flag("only", ""), TIER = flag("tier", null), FRAMES = +flag("frames", 12), WAIT = +flag("wait", 2500), PEAK = args.includes("--peak");
// Each screen's stated budget, as a phone draws it at MEDIUM (where it starts): million pixels shaded a frame, render
// passes, draw calls, triangles, lights (the owner, 2026-11-17: every scene a stated budget for models, draw calls and
// lights; a steady 60 fps on an iPhone 17 Pro Max is the pass). Models: the generated models its files bring.
// At HIGH (on a phone only by choice, in Setup) the pixels may be 2.2 times these and the passes 21. A row over its
// budget is marked OVER.
const BUDGET = {
  title: { mpx: 5, passes: 10, draws: 60, tris: 300000, lights: 4, models: 17 }, // (the containment hall: twelve bosses, the pod, the vault door, a cabinet, the stand and its cup; one key and three of its seven lamps)
  hub: { mpx: 5, passes: 10, draws: 70, tris: 200000, lights: 4, models: 12 },
  blaster: { mpx: 5, passes: 10, draws: 80, tris: 260000, lights: 5, models: 24 },
  racer: { mpx: 5, passes: 10, draws: 80, tris: 200000, lights: 5, models: 11 },
  boss: { mpx: 5, passes: 10, draws: 70, tris: 150000, lights: 5, models: 5 },
  memory: { mpx: 5, passes: 10, draws: 70, tris: 200000, lights: 4, models: 3 },
  exam: { mpx: 5, passes: 10, draws: 100, tris: 200000, lights: 5, models: 14 },
  guide: { mpx: 5, passes: 10, draws: 60, tris: 60000, lights: 3, models: 2 },
};
// --peak: each game's additions brought on at once before measuring (the brood gathering, the allies flying in, a
// full burst of the effect props, a rival on the road), so the budget is checked at its fullest moment
// a screen whose generated pieces come in while it is up is measured once they are all in (the title's hall), and at
// each of its poses (the hall: the lens at the door, a third and two thirds down its glide, at its end); each pose is
// a row, and each row is held to the budget
const READY = { title: () => { const s = window.__arcade.Scenes.cur; return !s || !s.cells || (s.cells.every((c) => c.boss) && !!s.vault && !!s.cabs && !!s.cup && !!s.podMesh && !!s.sky); } };
const POSES = { title: [0, 0.35, 0.7, 1] };
const PEAK_RUN = {
  blaster: () => { const A = window.__arcade, s = A.Scenes.cur, st = s.stage, p = s.camera.position.clone().add(new THREE.Vector3(0, 0, -9)); if (st && st.escort) { st.escort.gather(); st.escort.entrance(); } if (s.iconFX) { s.iconFX.burst("star", p, { n: 12 }); s.iconFX.spin("bolt", p.clone().add(new THREE.Vector3(1, 0, 0))); s.iconFX.shatter("shield", p.clone().add(new THREE.Vector3(-1, 0, 0))); } },
  racer: () => { const A = window.__arcade, s = A.Scenes.cur, p = s.camera.position.clone().add(new THREE.Vector3(0, -1, -9)); if (s.world && s.world.director) s.world.director.force("rival"); if (s.iconFX) { s.iconFX.burst("star", p, { n: 12 }); s.iconFX.spin("heart", p.clone().add(new THREE.Vector3(1, 0, 0))); } },
  boss: () => { const A = window.__arcade, s = A.Scenes.cur, p = s.camera.position.clone().add(new THREE.Vector3(0, 0, -7)); if (s.iconFX) { s.iconFX.burst("star", p, { n: 12 }); s.iconFX.burst("coin", p, { n: 10 }); s.iconFX.spin("heart", p.clone().add(new THREE.Vector3(1, 0, 0))); s.iconFX.spin("bolt", p.clone().add(new THREE.Vector3(-1, 0, 0))); } },
};
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
    // the main thread's own time in each frame (the game's code and the drawing calls it makes; the drawing itself
    // runs elsewhere): unlike this machine's frame rate, this is about what a fast phone's processor spends too
    await page.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.__cpu = { sum: 0, n: 0, max: 0 };
      window.requestAnimationFrame = (cb) => raf((t) => { const t0 = performance.now(); cb(t); const d = performance.now() - t0; const c = window.__cpu; c.sum += d; c.n++; if (d > c.max) c.max = d; });
      // what goes to the graphics chip besides drawing: texture and buffer uploads (bytes), calls that make the page
      // wait for the chip (reads back), and shader compiles; a steady screen should upload little and wait for nothing
      const gl = (window.__gl = { tex: 0, texN: 0, buf: 0, bufN: 0, sync: 0, compile: 0, programs: 0 });
      const wrap = (P) => {
        const w = (name, fn) => { const o = P[name]; if (!o) return; P[name] = function () { fn.apply(this, arguments); return o.apply(this, arguments); }; };
        const bytes = (a) => (a && a.byteLength) || 0, texBytes = (args) => { const last = args[args.length - 1]; if (last && last.byteLength !== undefined) return last.byteLength; if (last && (last.width || last.videoWidth)) return (last.videoWidth || last.width) * (last.videoHeight || last.height) * 4; const w = args[3], h = args[4]; return typeof w === "number" && typeof h === "number" ? w * h * 4 : 0; };
        w("texImage2D", function () { gl.tex += texBytes(arguments); gl.texN++; });
        w("texSubImage2D", function () { gl.tex += texBytes(arguments); gl.texN++; });
        w("bufferData", function (t, d) { gl.buf += typeof d === "number" ? d : bytes(d); gl.bufN++; });
        w("bufferSubData", function (t, o, d) { gl.buf += bytes(d); gl.bufN++; });
        ["readPixels", "getError", "finish", "getProgramParameter", "getShaderParameter", "checkFramebufferStatus", "getParameter"].forEach((n) => w(n, function () { gl.sync++; }));
        w("compileShader", function () { gl.compile++; });
        w("linkProgram", function () { gl.programs++; });
      };
      if (window.WebGL2RenderingContext) wrap(WebGL2RenderingContext.prototype);
      if (window.WebGLRenderingContext) wrap(WebGLRenderingContext.prototype);
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/" + HTML + "#debug");
    await page.waitForFunction(() => window.__arcade && window.__arcade.GFX, null, { timeout: 60000 });
    if (TIER !== null) await page.evaluate((t) => { const G = window.__arcade.GFX; if (G.setQuality) G.setQuality(["high", "medium", "low", "lowest"][+t]); else if (G.setTier) { G.auto = false; G.setTier(+t, "report"); } }, TIER); // (as Setup fixes it: the tier's full drawing size)
    await page.evaluate(`window.__arcade.${go}`);
    // wait for the screen's files and its first frames
    await page.waitForFunction(() => { const A = window.__arcade; return A.Scenes && A.Scenes.cur && !document.getElementById("loading"); }, null, { timeout: 180000 }).catch(() => {});
    // (the hall takes its pieces in a step a frame, and this machine draws a phone's screen at HIGH at well under one
    // frame a second: it is given up to 15 minutes)
    if (READY[name]) await page.waitForFunction(READY[name], null, { timeout: 900000, polling: 250 }).catch(() => errors.push("not all of its pieces arrived"));
    // (the title makes the arcade floor's set ready once its glide arrives, a load and not a frame's cost: it is had
    // first, so the hall's own frames are what is measured)
    if (name === "title") await page.evaluate(() => window.__arcade.Assets.need("hub")).catch(() => null);
    await page.waitForTimeout(WAIT); // (--wait: a game's full set of lights and events is out a few seconds in)
    if (PEAK && PEAK_RUN[name]) { await page.evaluate(PEAK_RUN[name]).catch((e) => errors.push("peak: " + e.message)); await page.waitForTimeout(900); }
    const poses = POSES[name] && (await page.evaluate(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells); })) ? POSES[name] : [null]; // (the avenue, opened before the hall, has one view)
    for (const pose of poses) {
    if (pose !== null) { await page.evaluate((u) => { window.__arcade.Scenes.cur.pose = u; }, pose); await page.waitForTimeout(700); }
    const r = await page.evaluate(async (frames) => {
      const A = window.__arcade, G = A.GFX, R = G.renderer, gl = R.getContext();
      // every draw into a target counts that target's pixels (times its samples): what the chip shades and stores
      let px = 0, draws = 0, passes = 0, tris = 0, sceneDraws = 0;
      const realRender = R.render.bind(R), world = A.Scenes.cur && A.Scenes.cur.scene;
      R.render = function (scene, camera) {
        const t = R.getRenderTarget();
        const w = t ? t.width : R.domElement.width, h = t ? t.height : R.domElement.height, s = t && t.samples ? t.samples : 1;
        px += w * h * s; passes++;
        const before = R.info.render.calls, tb = R.info.render.triangles;
        const out = realRender(scene, camera);
        draws += R.info.render.calls - before;
        // the triangles of the screen's own world, in every pass that draws it (the picture and its reflection)
        if (scene === world) { tris += R.info.render.triangles - tb; sceneDraws += R.info.render.calls - before; }
        return out;
      };
      R.info.autoReset = false;
      const wait = () => new Promise((res) => requestAnimationFrame(() => res()));
      for (let i = 0; i < 3; i++) await wait();
      px = 0; draws = 0; passes = 0; tris = 0; sceneDraws = 0;
      const C = window.__cpu; C.sum = 0; C.n = 0; C.max = 0;
      const GL = window.__gl; for (const k in GL) GL[k] = 0;
      for (let i = 0; i < frames; i++) await wait();
      const cpu = C.n ? C.sum / C.n : 0, cpuMax = C.max;
      R.render = realRender; R.info.autoReset = true;
      const sc = A.Scenes.cur && A.Scenes.cur.scene;
      let lights = 0, point = 0, spot = 0, dir = 0;
      const lens = A.Scenes.cur && A.Scenes.cur.camera; // (the lights drawn: a light the lens's layers leave out, a screen's own light under a light budget, is not)
      if (sc) sc.traverseVisible((o) => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight && (!lens || o.layers.test(lens.layers))) { lights++; if (o.isPointLight) point++; else if (o.isSpotLight) spot++; else if (o.isDirectionalLight) dir++; } });
      const pr = G.scenePR ? G.scenePR() : 1;
      return {
        tier: G.TIERS ? G.TIERS[G.tier].name : "(none)",
        canvas: R.domElement.width + "x" + R.domElement.height,
        scene: Math.round(G.w * pr) + "x" + Math.round(G.h * pr),
        samples: G.pipe ? G.pipe.samples : 0,
        mpx: +(px / frames / 1e6).toFixed(1),
        passes: +(passes / frames).toFixed(1),
        draws: Math.round(draws / frames),
        tris: Math.round(tris / frames), sceneDraws: Math.round(sceneDraws / frames),
        lights, point, spot, dir,
        textures: R.info.memory.textures, geometries: R.info.memory.geometries, programs: (R.info.programs || []).length,
        cpu: +cpu.toFixed(1), cpuMax: +cpuMax.toFixed(1),
        up: `${(GL.tex / frames / 1024).toFixed(0)}K tex (${(GL.texN / frames).toFixed(1)}), ${(GL.buf / frames / 1024).toFixed(0)}K buf (${(GL.bufN / frames).toFixed(1)}), ${(GL.sync / frames).toFixed(1)} waits, ${GL.compile + GL.programs} compiles`,
      };
    }, FRAMES).catch((e) => ({ error: e.message.slice(0, 160) }));
    rows.push([pose === null ? name : name + "@" + pose, r, errors.slice(0, 2), name]);
    }
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log("screen    tier     canvas      scene drawn  MSAA  Mpx/frame  passes  draws (world)  tris     lights (point/spot/dir)  textures  programs  cpu ms (worst)  uploads per frame  budget");
  for (const [n, r, errs, key] of rows) {
    if (r.error) { console.log(n.padEnd(9), "ERROR", r.error); continue; }
    const B = BUDGET[key], k = r.tier === "HIGH" || r.tier === "MAC" ? 2.2 : 1, over = B ? [["mpx", r.mpx, B.mpx * k], ["passes", r.passes, k > 1 ? 21 : B.passes], ["draws", r.draws, B.draws], ["tris", r.tris, B.tris], ["lights", r.lights, B.lights]].filter(([, v, b]) => v > b).map(([q, v, b]) => `${q} ${v} > ${b}`) : [];
    r.budget = !B ? "" : over.length ? "OVER: " + over.join(", ") : "within budget";
    console.log(`${n.padEnd(9)} ${String(r.tier).padEnd(8)} ${r.canvas.padEnd(11)} ${r.scene.padEnd(12)} ${String(r.samples).padEnd(5)} ${String(r.mpx).padEnd(10)} ${String(r.passes).padEnd(7)} ${(r.draws + " (" + r.sceneDraws + ")").padEnd(13)} ${String(r.tris).padEnd(8)} ${String(r.lights).padEnd(3)} (${r.point}/${r.spot}/${r.dir})               ${String(r.textures).padEnd(9)} ${String(r.programs).padEnd(9)} ${(r.cpu + " (" + r.cpuMax + ")").padEnd(15)} ${r.up}  ${r.budget}${errs.length ? "   errors: " + errs.join(" | ").slice(0, 120) : ""}`);
  }
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
