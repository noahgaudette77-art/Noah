#!/usr/bin/env node
/**
 * The frame-rate governor (Setup > Graphics: AUTO, GFX.perfTick), checked on made-up frame times (the owner,
 * 2026-11-22: a steady 60 FPS on their phone first; when frames run late the picture draws smaller, then drops
 * effects, then lights, and climbs back when they hold).
 *
 *   node arcade/tools/governor-test.js [--engine chromium|webkit]
 *
 * The page is opened as a phone (#phone, 440 x 956 at 3x, touch), its game loop held still and its clock taken over,
 * so nothing but the frame times fed in moves the governor (an automated browser is otherwise left alone: see
 * perfTick). Each case starts from AUTO's first step and checks where the governor goes:
 *   start     a phone starts at SMOOTH (MEDIUM drawn at 1.75x, not 2x)
 *   slow      frames of 40 ms: a step every 3.5 s, the drawing size first, then the effects, then the lights, to the last
 *   recover   steady 60 fps from the last step: a step back up every 7.5 s, to SMOOTH and no higher
 *   lowpower  frames held at exactly 30 fps: two steps down change nothing, so it is the device's cap; back to SMOOTH,
 *             named in the readout, and held there, through a screen's loading too; at 60 again the cap lifts without a
 *             step down. Under a cap with a load too much even for 30: down until 30 holds, and held at that step
 *   catching  60 fps with one frame in eight at 50 ms: a step down (the frames catch)
 *   busy      the same hitches on frames that sent a new picture to the chip (a model arriving): no step
 *   relapse   a step up that runs late within 8 s is tried again only after 15 steady seconds, not 5
 *   fixed     Setup's fixed tier: the governor does nothing, at the tier's full size; AUTO again: back to SMOOTH
 *   desktop   a desktop's ladder starts at HIGH, full size
 * Exit code 1 on any failure.
 */
const fs = require("fs"), path = require("path"), http = require("http");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const ENGINE = flag("engine", "chromium");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".glb": "model/gltf-binary", ".mp3": "audio/mpeg", ".jpg": "image/jpeg" };

// in the page before anything else: the game's frames held, the clock ours, and the page not an automated one
function inPage() {
  window.__hold = true;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => (window.__hold ? 0 : raf(cb));
  Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false, configurable: true });
  const realNow = performance.now.bind(performance);
  window.__T = null;
  performance.now = () => (window.__T === null ? realNow() : window.__T);
  // feed frames of ms (each jittered by up to j), for secs; every `every`-th frame `spike` ms instead
  window.__feed = (ms, secs, j = 0, every = 0, spike = 0, busy = false) => {
    const G = window.__arcade.GFX, path = [];
    let t = 0, k = 0, lastRung = G.perf.rung;
    while (t < secs * 1000) {
      const sp = every && ++k % every === 0, m = sp ? spike : ms + (j ? (Math.random() * 2 - 1) * j : 0);
      if (sp && busy) G.renderer.info.memory.textures++; // (as if that frame had sent a new picture to the chip)
      window.__T += m; t += m;
      G.perfTick(m);
      if (G.perf.rung !== lastRung) { path.push({ at: +(t / 1000).toFixed(1), rung: G.perf.rung }); lastRung = G.perf.rung; }
    }
    return path;
  };
  // frames whose time depends on the step the governor is on (byRung[rung], else ms): a load that lighter steps lift
  window.__feedBy = (byRung, ms, secs, j = 0) => {
    const G = window.__arcade.GFX, path = [];
    let t = 0, lastRung = G.perf.rung;
    while (t < secs * 1000) {
      const m = (byRung[G.perf.rung] !== undefined ? byRung[G.perf.rung] : ms) + (j ? (Math.random() * 2 - 1) * j : 0);
      window.__T += m; t += m;
      G.perfTick(m);
      if (G.perf.rung !== lastRung) { path.push({ at: +(t / 1000).toFixed(1), rung: G.perf.rung }); lastRung = G.perf.rung; }
    }
    return path;
  };
  window.__state = () => {
    const G = window.__arcade.GFX, P = G.perf, sc = window.__arcade.Scenes.cur && window.__arcade.Scenes.cur.scene;
    if (sc) G.lightsFor(sc); // (the screen's lights made for the current cap, as its next frame would)
    const pool = sc && sc.userData.lightPool;
    return { rung: P.rung, start: P.start, steps: P.ladder.length, tier: G.tier, scale: G.scale, lightCap: G.lightCap, pr: +G.outPR().toFixed(3), canvasW: G.renderer.domElement.width,
      capped: P.capped, auto: G.auto, label: G.govLabel(), why: P.why, slots: pool ? pool.slots.point.length : null, ladder: P.ladder.map((r) => [r.tier, r.scale, r.lights]) };
  };
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
  const pw = require("playwright");
  let browser;
  if (ENGINE === "webkit") {
    const dir = process.env.WEBKIT_BROWSERS_PATH, wk = dir && fs.existsSync(dir) && fs.readdirSync(dir).find((d) => /^webkit-\d+$/.test(d));
    browser = await pw.webkit.launch(wk ? { executablePath: path.join(dir, wk, "pw_run.sh") } : {});
  } else browser = await pw.chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(inPage);
  // (#noassets: the built-in title, nothing to download: the governor needs a screen, not its pictures)
  await page.goto(base + "/index.html#debug,phone,noassets");
  await page.waitForFunction(() => window.__arcade && window.__arcade.GFX && window.__arcade.GFX.perf.ladder && window.__arcade.Scenes.cur, null, { timeout: 60000, polling: 250 }); // (polled by the clock: the page's frames are held)
  await page.waitForTimeout(500);
  let fails = 0;
  const ok = (cond, what, got) => { console.log((cond ? "  ok   " : "  FAIL ") + what + (got !== undefined ? "  (" + JSON.stringify(got) + ")" : "")); if (!cond) fails++; };
  const st = () => page.evaluate(() => window.__state());
  const feed = (ms, secs, j, every, spike, busy) => page.evaluate(([a, b, c, d, e, f]) => window.__feed(a, b, c, d, e, f), [ms, secs, j || 0, every || 0, spike || 0, !!busy]);
  // each case from AUTO's start, its frames' history cleared (the step just set is given its 2.5 s to show, as ever)
  const reset = () => page.evaluate(() => { const G = window.__arcade.GFX; G.setQuality("auto"); G.perf.n = 0; G.perf.i = 0; });
  await page.evaluate(() => { window.__T = performance.now() + 10000; });

  console.log(ENGINE + ": the governor on made-up frames (a phone, 440 x 956 at 3x)");
  // (a light budget on the screen and four lights to share it, so the light steps can be seen in its pool)
  await page.evaluate(() => { const sc = window.__arcade.Scenes.cur.scene; sc.userData.lightBudget = { point: 3, dir: 1 }; for (let k = 0; k < 4; k++) { const l = new THREE.PointLight(0xffffff, 1, 20); l.position.set(k * 3, 2, 0); sc.add(l); } });
  let s = await st();
  console.log("  ladder: " + s.ladder.map(([t, sc, l]) => ["HIGH", "MEDIUM", "LOW", "LOWEST"][t] + " " + sc + (l < 99 ? " lights " + l : "")).join(" > "));
  // start
  ok(s.auto && s.rung === 0 && s.start === 0 && s.ladder.length === 7, "start: AUTO at the phone's first step (SMOOTH), 7 steps", { rung: s.rung, start: s.start, steps: s.ladder.length });
  ok(s.tier === 1 && s.scale === 0.875 && Math.abs(s.pr - 1.75) < 1e-6 && s.canvasW === 770, "start: MEDIUM at 1.75x, the canvas 770 px across", { tier: s.tier, scale: s.scale, pr: s.pr, w: s.canvasW });
  ok(/SMOOTH/.test(s.label) && s.slots === 3, "start: the readout says SMOOTH; three point lights", { label: s.label, slots: s.slots });
  // slow
  let p = await feed(40, 30, 2);
  s = await st();
  ok(s.rung === s.steps - 1, "slow: down to the last step", { rung: s.rung, path: p });
  const gaps = p.map((x, i) => x.at - (i ? p[i - 1].at : 0));
  ok(gaps.slice(1).every((g) => g >= 3.4 && g <= 4.1), "slow: a step every 3.5 s (2.5 s to show, then late through a second)", gaps);
  ok(p.length === s.steps - 1 && p.every((x, i) => x.rung === i + 1), "slow: one step at a time, none skipped", p.length);
  ok(s.lightCap === 1 && s.slots === 1 && s.tier === 3 && Math.abs(s.pr - 1.0625) < 1e-3, "slow: at the last step LOWEST at 1.06x and one point light", { cap: s.lightCap, slots: s.slots, tier: s.tier, pr: s.pr });
  // recover
  p = await feed(16.67, 60, 0.3);
  s = await st();
  ok(s.rung === 0, "recover: back up to SMOOTH", { rung: s.rung, path: p });
  const ups = p.map((x, i) => x.at - (i ? p[i - 1].at : 0));
  ok(ups.slice(1).every((g) => g >= 7.4 && g <= 8.1), "recover: a step up every 7.5 s (2.5 s to show, then 5 steady)", ups);
  ok(s.lightCap === 99 && s.slots === 3 && s.scale === 0.875 && s.canvasW === 770, "recover: every light back, the canvas 770 px across", { cap: s.lightCap, slots: s.slots, scale: s.scale, w: s.canvasW });
  p = await feed(16.67, 20, 0.3);
  ok(p.length === 0, "recover: no higher by itself (MEDIUM's 2x is Setup's)", p);
  // lowpower
  await reset();
  p = await feed(33.33, 14, 0.2);
  s = await st();
  ok(s.capped && s.rung === 0, "lowpower: two steps down, then back to SMOOTH and held", { capped: s.capped, rung: s.rung, path: p });
  ok(p.length === 3 && p[0].rung === 1 && p[1].rung === 2 && p[2].rung === 0, "lowpower: down, down, back", p);
  ok(/LOW POWER/.test(s.label), "lowpower: the readout names it", s.label);
  p = await feed(33.33, 20, 0.2);
  ok(p.length === 0, "lowpower: held, no more steps while it lasts", p);
  p = await feed(33.33, 8, 0.2, 6, 70);
  s = await st();
  ok(s.capped && p.length === 0, "lowpower: held through a screen's loading (a frame in six at 70 ms)", { capped: s.capped, path: p });
  p = await feed(16.67, 12, 0.3);
  s = await st();
  ok(!s.capped && s.rung === 0 && p.length === 0 && !/LOW POWER/.test(s.label), "lowpower: off again (60 fps): the cap lifts, no step down", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  // lowpower, heavy: under the cap, the first two steps too much even for 30 (45 ms a frame), the rest holding 30
  await reset();
  p = await page.evaluate(() => window.__feedBy([45, 45], 33.33, 22, 0.3));
  s = await st();
  ok(s.capped && s.rung === 2 && p.length === 5 && p[4].rung === 2, "lowpower, heavy: down until 30 holds, two more, then back to the sharpest step that held it", { rung: s.rung, capped: s.capped, path: p });
  // catching
  await reset();
  p = await feed(16.67, 6, 0.3, 8, 50);
  ok(p.length === 1 && p[0].rung === 1, "catching: a step down when one frame in eight catches", p);
  // busy
  await reset();
  p = await feed(16.67, 12, 0.3, 8, 80, true);
  ok(p.length === 0, "busy: hitches that made shaders or sent pictures (a model arriving) are not held against it", p);
  // relapse
  await reset();
  await page.evaluate(() => window.__arcade.GFX.setRung(2, "test"));
  p = await feed(16.67, 9, 0.3);
  ok(p.length === 1 && p[0].rung === 1, "relapse: a step up after 7.5 steady seconds", p);
  p = await feed(25, 3, 0.5);
  ok(p.length === 1 && p[0].rung === 2, "relapse: late again at once: back down", p);
  p = await feed(16.67, 12, 0.3);
  ok(p.length === 0, "relapse: not tried again after 12 s", p);
  p = await feed(16.67, 8, 0.3);
  ok(p.length === 1 && p[0].rung === 1, "relapse: tried again after 17.5 s (15 steady)", p);
  // fixed
  await page.evaluate(() => window.__arcade.GFX.setQuality("low"));
  p = await feed(40, 10, 2);
  s = await st();
  ok(!s.auto && p.length === 0 && s.tier === 2 && s.scale === 1 && s.label === "FIXED (SETUP)" && s.slots === 3, "fixed: Setup's LOW holds, at its full size, every light", { tier: s.tier, scale: s.scale, label: s.label, slots: s.slots, path: p });
  await reset();
  s = await st();
  ok(s.auto && s.rung === 0 && s.tier === 1 && s.scale === 0.875, "fixed: AUTO again starts from SMOOTH", { rung: s.rung, tier: s.tier, scale: s.scale });
  // a desktop screen (no #phone, 2x): its ladder starts at HIGH, full size
  const page2 = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })).newPage();
  page2.on("pageerror", (e) => errors.push(e.message));
  await page2.addInitScript(inPage);
  await page2.goto(base + "/index.html#debug,noassets");
  await page2.waitForFunction(() => window.__arcade && window.__arcade.GFX && window.__arcade.GFX.perf.ladder && window.__arcade.Scenes.cur, null, { timeout: 60000, polling: 250 });
  const d = await page2.evaluate(() => window.__state());
  ok(d.rung === 0 && d.tier === 0 && d.scale === 1 && d.ladder.length === 9 && d.ladder[1][1] === 0.875 && d.ladder[3][0] === 1, "desktop: HIGH at full size first; 9 steps", { rung: d.rung, tier: d.tier, ladder: d.ladder });
  ok(errors.length === 0, "no page errors", errors.slice(0, 3));
  await browser.close();
  srv.close();
  console.log(fails ? fails + " FAILED" : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
