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
 * perfTick). Each case starts from AUTO's first step and checks where the governor goes (2026-11-23: the MAC, PHONE
 * and SAFE tiers, the drawing size in tenths, the heat's easing; 2026-11-26: a device's cap at any rate, 30 or 24 a
 * second, held at the sharpest step that holds it):
 *   start      a phone starts at PHONE drawn at 2x (no softer start); 11 steps
 *   slow       frames of 40 ms, uneven (a load: 32 to 48 ms): a step every 3.5 s, one size, then two, then three at
 *              once while they stay slow (2x, 1.9x, 1.7x, 1.5x), then the effects and the lights a step at a time, to
 *              the last (frames held at one rate through it all would be a cap: see 24 fps)
 *   recover    steady 60 fps from the last step: a step back up every 11 s (2.5 s to show, then 8 steady), to PHONE
 *              at 2x and no higher
 *   lowpower   frames held at exactly 30: down until one step past a real cut (a tier down, 56% of the pixels: SAFE,
 *              then LIGHTEST) still holds 30, so it is the device's cap: back to PHONE 2x, the sharpest step that held
 *              it, named in the readout, held through a new screen's first seconds; at 60 again, let go, 2x as it was
 *   24 fps     the owner's iPhone in Low Power Mode (2026-11-26: 41.7 ms a frame, steadily; it went to the last step
 *              for nothing): the same at 24, held at PHONE 2x, HELD AT 24 FPS; lifted at 60
 *   boot       blank frames timed at the start every 33 ms, or every 41.7: held at 2x from the start, no step taken to
 *              find it; at 60 or 50 (a 50 Hz screen), no cap
 *   under cap  frames still catching under the cap step down; steady at 30 again, back up to 2x
 *   lower cap  held at 30, then 24 (the device's cap lower still): found as the first was, held at 2x at 24
 *   setup      held at 24, Setup's PHONE chosen and AUTO again: the hold kept, no step to find it again
 *   load       held at 30 from the start by a load at 2x alone: held at 2x for a minute, then the step down tried runs
 *              at 60: no cap after all, held there
 *   test       held at 30 from the start by a load that SAFE still has: the one-step test runs no faster, back to 2x;
 *              the page back in view, the test goes past the real cut, runs at 60 there: let go, held there
 *   deep load  a load (not a cap) that holds 30 through SAFE and lifts at LIGHTEST (the independent review's case): no
 *              cap, held where it runs at 60
 *   low cap    a cap at 24 that starts with the picture already low (LIGHTEST): down to the last step, still 24, so
 *              back to where it was held first, then up as frames hold (the review: it stayed at the last step)
 *   eased      a fixed tier eased a size (heat) when a 30 cap starts: its sizes down to the last, still 30: back to the
 *              eased size, held, then up to its full size
 *   faster     held at 24, then frames at 30 a second at 2x that a cut past the real one lifts (the cap lifted, a load
 *              in its place): tested that deep at once, let go there
 *   band       held at 24, frames at 30 a second at times (the device's own rate moving): one deep test, the band
 *              learned (HELD AT 24-30 FPS), no step after
 *   heavy      under a cap, a load too much even for 30 at 2x and 1.9x: down until 30 holds one step past a real cut,
 *              then back to the sharpest step that held it (1.7x), and up to 1.8x as it holds there
 *   heavy@30   a screen held at 30 by its own load, which a real cut lifts: no cap, held where it runs at 60
 *   10 fps     a slow device still steps down
 *   new screen the last screen's slow looks and a new screen's uneven first frames are not held against it
 *   catching   60 fps with one frame in eight at 50 ms: a step down (the frames catch)
 *   busy       the same hitches on frames that sent a new picture to the chip (a model arriving): no step
 *   creep      60 fps with one frame in thirty late (heat): after ten seconds one small step down, and climbed back
 *              only after half a minute steady; a step that did not help (judged from its own ten seconds) is taken
 *              back and not tried from there for five minutes (then ten); one that helped may be followed by another; never past the tier's
 *              last size into its effects or lights; not climbed back while one frame in sixty is still late
 *   relapse    a step up that runs late within 8 s is tried again only after 24 steady seconds, not 8
 *   fixed      Setup's fixed tier (2026-11-26: an iPhone at a fixed tier drew the title hall under 55 FPS and nothing
 *              eased it): its effects and its lights stay, and only its drawing size steps down while frames run late
 *              (SAFE on a 3x phone: 1.5x to three quarters of it), every step the same tier and every light; steady,
 *              it climbs back to its full size; the readout names the step; AUTO again: back to 2x
 *   phone      no frosted glass over the live picture on a phone at any tier, Setup's HIGH included (body.lite)
 *   fixed@30   a fixed tier held at exactly 30 (Low Power Mode): its sizes step down until three quarters of it still
 *              hold 30, then back to its full size, held; held at 24 from the start: its full size, no step
 *   once       a Graphics setting fixed before 2026-11-26 is AUTO again on the next visit, once (a copy synced from
 *              another device too: mergeStates); fixed again after, it stays
 *   desktop    a desktop's ladder starts at MAC, full size, 12 steps, and no step down draws more pixels; the window
 *              moved to a 1x screen and back (Chromium: a real change of density): the ladder made again, the canvas
 *              at the new screen's pixels; resized twenty times, drawn each time: nothing left on the graphics chip;
 *              held at a steady 30 (a 30 Hz screen): the sharp step kept
 *   density    a phone held at 30 when its density changes: still held, at the nearest step of the new ladder, and
 *              let go when the cap lifts
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
  // (the screen's density, as WebKit's runs change it: window.__dpr set by the test. A getter in place from the start:
  // defining one later, after many frames have read the density, is not always seen by WebKit's compiled code)
  const dprOwn = Object.getOwnPropertyDescriptor(window, "devicePixelRatio") || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), "devicePixelRatio");
  Object.defineProperty(window, "devicePixelRatio", { get: () => window.__dpr || (dprOwn && dprOwn.get ? dprOwn.get.call(window) : dprOwn ? dprOwn.value : 1), configurable: true });
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
      capped: P.capped, auto: G.auto, label: G.govLabel(), why: P.why, slots: pool ? pool.slots.point.length : null, ladder: P.ladder.map((r) => [r.tier, r.scale, r.lights]),
      px: P.ladder.map((r) => +(Math.min(window.devicePixelRatio || 1, G.TIERS[r.tier].pr) * r.scale).toFixed(4)) };
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
  // each case from AUTO's start, its frames' history cleared (the step just set is given its 2.5 s to show, as ever),
  // with no hold (a device's cap held is kept through a Setup choice: see setup)
  const reset = () => page.evaluate(() => { const G = window.__arcade.GFX; G.perf.capped = false; G.setQuality("auto"); G.perf.n = 0; G.perf.i = 0; });
  await page.evaluate(() => { window.__T = performance.now() + 10000; });

  console.log(ENGINE + ": the governor on made-up frames (a phone, 440 x 956 at 3x)");
  // (a light budget on the screen and four lights to share it, so the light steps can be seen in its pool)
  await page.evaluate(() => { const sc = window.__arcade.Scenes.cur.scene; sc.userData.lightBudget = { point: 3, dir: 1 }; for (let k = 0; k < 4; k++) { const l = new THREE.PointLight(0xffffff, 1, 20); l.position.set(k * 3, 2, 0); sc.add(l); } });
  const NAMES = ["MAC", "PHONE", "SAFE", "LIGHTEST"];
  let s = await st();
  console.log("  ladder: " + s.ladder.map(([t, sc, l]) => NAMES[t] + " " + sc + (l < 99 ? " lights " + l : "")).join(" > "));
  // start
  ok(s.auto && s.rung === 0 && s.start === 0 && s.ladder.length === 11, "start: AUTO at the phone's first step, 11 steps", { rung: s.rung, start: s.start, steps: s.ladder.length });
  ok(s.tier === 1 && s.scale === 1 && Math.abs(s.pr - 2) < 1e-6 && s.canvasW === 880, "start: PHONE at 2x, the canvas 880 px across", { tier: s.tier, scale: s.scale, pr: s.pr, w: s.canvasW });
  ok(s.label === "AUTO · STEP 1/11" && s.slots === 3, "start: the readout says AUTO, step 1 of 11; three point lights", { label: s.label, slots: s.slots });
  ok(JSON.stringify(s.px) === JSON.stringify([2, 1.9, 1.8, 1.7, 1.6, 1.5, 1.5, 1.25, 1.0625, 1.0625, 1.0625]) && s.ladder[6][0] === 2 && s.ladder[7][0] === 3, "start: 2x to 1.5x in tenths, then SAFE at 1.5x, then LIGHTEST", s.px);
  // slow
  let p = await feed(40, 34, 8);
  s = await st();
  ok(s.rung === s.steps - 1 && !s.capped, "slow: down to the last step", { rung: s.rung, capped: s.capped, path: p });
  const gaps = p.map((x, i) => x.at - (i ? p[i - 1].at : 0));
  ok(gaps.slice(1).every((g) => g >= 3.4 && g <= 4.1), "slow: a step every 3.5 s (2.5 s to show, then late through a second)", gaps);
  ok(JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6, 7, 8, 9, 10]), "slow: one size, then two, then three (to the tier's last), then the effects and the lights one at a time", p.map((x) => x.rung));
  ok(s.lightCap === 1 && s.slots === 1 && s.tier === 3 && Math.abs(s.pr - 1.0625) < 1e-3, "slow: at the last step LIGHTEST at 1.06x and one point light", { cap: s.lightCap, slots: s.slots, tier: s.tier, pr: s.pr });
  // recover
  p = await feed(16.67, 125, 0.3);
  s = await st();
  ok(s.rung === 0, "recover: back up to the first step", { rung: s.rung, path: p });
  const ups = p.map((x, i) => x.at - (i ? p[i - 1].at : 0));
  ok(p.length === 10 && ups.slice(1).every((g) => g >= 10.4 && g <= 11.6), "recover: one step up at a time, every 11 s (2.5 s to show, then 8 steady)", ups);
  ok(s.lightCap === 99 && s.slots === 3 && s.scale === 1 && s.canvasW === 880, "recover: every light back, the canvas 880 px across", { cap: s.lightCap, slots: s.slots, scale: s.scale, w: s.canvasW });
  p = await feed(16.67, 20, 0.3);
  ok(p.length === 0, "recover: no higher by itself (MAC is Setup's)", p);
  // lowpower: frames held at exactly 30 from the start of a step: down until a real cut (SAFE, 56% of the pixels)
  // does not lift them, so it is the device's cap: back to the sharpest step that held it (PHONE 2x), held there
  await reset();
  p = await feed(33.33, 22, 0.2);
  s = await st();
  ok(s.capped && s.rung === 0 && s.tier === 1 && s.scale === 1 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6, 7, 0]), "lowpower: down until one step past a real cut (SAFE, then LIGHTEST) still held 30: back to PHONE 2x, held there", { capped: s.capped, rung: s.rung, path: p });
  ok(s.label === "HELD AT 30 FPS · LOW POWER MODE?", "lowpower: the readout names it", s.label);
  p = await feed(33.33, 20, 0.2);
  ok(p.length === 0, "lowpower: held, no more steps while it lasts", p);
  await page.evaluate(() => { window.__arcade.GFX.sceneAt = performance.now(); }); // (a new screen)
  p = (await feed(33.33, 1.5, 0.2, 6, 70)).concat(await feed(33.33, 6, 0.2));
  s = await st();
  ok(s.capped && p.length === 0, "lowpower: held through a new screen's uneven first seconds", { capped: s.capped, path: p });
  p = await feed(16.67, 12, 0.3);
  s = await st();
  ok(!s.capped && s.rung === 0 && p.length === 0 && s.label === "AUTO · STEP 1/11", "lowpower: off again (60 fps): the cap lifts, 2x as it was", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  // 24 fps: the owner's iPhone in Low Power Mode (2026-11-26: 41.7 ms a frame, steadily, and the last step taken for
  // nothing): the same, at 24
  await reset();
  p = await feed(41.67, 24, 0.3);
  s = await st();
  ok(s.capped && s.rung === 0 && s.tier === 1 && s.scale === 1 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6, 7, 0]) && s.label === "HELD AT 24 FPS · LOW POWER MODE?", "24 fps: down until one step past a real cut still held 24: back to PHONE 2x, held, HELD AT 24 FPS", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  p = await feed(41.67, 40, 0.3);
  s = await st();
  ok(s.capped && p.length === 0, "24 fps: held at 2x while it lasts", { capped: s.capped, path: p });
  p = await feed(16.67, 8, 0.3);
  s = await st();
  ok(!s.capped && s.rung === 0 && p.length === 0, "24 fps: off again (60 fps): let go, 2x as it was", { capped: s.capped, rung: s.rung, path: p });
  // lowpower from the start: the blank frames timed at the start came every 33 ms
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(16.67)));
  s = await st();
  ok(!s.capped && s.rung === 0, "boot: blank frames at 60: no cap", s.capped);
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(20)));
  s = await st();
  ok(!s.capped && s.rung === 0, "boot: blank frames at 50 (a 50 Hz screen): no cap", s.capped);
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(41.67)));
  p = await feed(41.67, 10, 0.3);
  s = await st();
  ok(s.capped && s.rung === 0 && p.length === 0 && s.label === "HELD AT 24 FPS · LOW POWER MODE?", "boot: blank frames every 41.7 ms: held at 24 at PHONE 2x from the start, no step taken to find it", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  // setup: held at 24, Setup's PHONE chosen, then AUTO again: the hold is the device's, kept (no step to find it again)
  await page.evaluate(() => window.__arcade.GFX.setQuality("medium"));
  p = await feed(41.67, 8, 0.3);
  s = await st();
  ok(!s.auto && s.capped && s.rung === 0 && s.scale === 1 && p.length === 0 && s.label === "FIXED (SETUP) · HELD AT 24 FPS · LOW POWER MODE?", "setup: held at 24, Setup's PHONE chosen: held at its full size, no step", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  await page.evaluate(() => window.__arcade.GFX.setQuality("auto"));
  p = await feed(41.67, 8, 0.3);
  s = await st();
  ok(s.auto && s.capped && s.rung === 0 && s.tier === 1 && p.length === 0, "setup: AUTO again: still held, at PHONE 2x", { capped: s.capped, rung: s.rung, path: p });
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  p = await feed(33.33, 10, 0.2);
  s = await st();
  ok(s.capped && s.rung === 0 && p.length === 0 && s.label === "HELD AT 30 FPS · LOW POWER MODE?", "boot: blank frames every 33 ms: held at 30 at PHONE 2x from the start, no step taken to find it", { capped: s.capped, rung: s.rung, path: p });
  // under the cap: frames still catching (a third of them at 67 ms) step down; steady again, back up
  p = [];
  for (let k = 0; k < 16 && !p.length; k++) p = await feed(33.33, 0.5, 0.2, 3, 66.7); // (until the step it causes)
  s = await st();
  ok(s.capped && p.length === 1 && p[0].rung === 1, "under the cap: frames still catching: a step down, still held", { capped: s.capped, path: p });
  p = await feed(33.33, 15, 0.2);
  s = await st();
  ok(s.capped && s.rung === 0 && p.length === 1 && p[0].rung === 0, "under the cap: steady at 30 again: back up to 2x", { capped: s.capped, rung: s.rung, path: p });
  // lower cap: held at 30, then the device holds the page at 24: found as the first was, held at 2x at 24
  p = await feed(41.67, 24, 0.3);
  s = await st();
  ok(s.capped && s.rung === 0 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6, 7, 0]) && /^HELD AT 24(-30)? FPS · LOW POWER MODE\?$/.test(s.label), "lower cap: held at 30, then 24: down until one step past a real cut still held 24, back to 2x, held", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  // a load just over a frame at 2x alone (30 there, 60 a step down), held at 30 from the start: held at 2x, and the
  // step down tried after a minute runs at 60: no cap after all, held there
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  p = await page.evaluate(() => window.__feedBy([33.33], 16.67, 15, 0.3));
  s = await st();
  ok(s.capped && s.rung === 0 && p.length === 0, "load: held at 30 from the start: 2x kept through the first minute", { capped: s.capped, rung: s.rung, path: p });
  p = await page.evaluate(() => window.__feedBy([33.33], 16.67, 50, 0.3));
  s = await st();
  ok(!s.capped && s.rung === 1 && p.length === 1 && p[0].rung === 1 && p[0].at >= 43 && p[0].at <= 47 && /it was the load/.test(s.why), "load: the step down tried after a minute runs at 60: no cap after all, held there", { capped: s.capped, rung: s.rung, why: s.why, path: p });
  // the hold tested: a load down to SAFE (30 at every step to SAFE, 60 below), held at 30 from the start: the step
  // down tried after a minute runs no faster, so back to 2x, held, and tried again later (the probe's steady 33 ms is
  // a device's cap: a load that deep, read as one, is left to the tests)
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  p = await page.evaluate(() => window.__feedBy([33.33, 33.33, 33.33, 33.33, 33.33, 33.33, 33.33], 16.67, 72, 0.3));
  s = await st();
  ok(s.capped && s.rung === 0 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 0]) && p[0].at >= 59 && p[0].at <= 62, "test: held at 30 by a load that SAFE still has: the one-step test after a minute runs no faster: back to 2x, held", { capped: s.capped, rung: s.rung, why: s.why, path: p });
  await page.evaluate(() => window.__arcade.GFX.perfAfresh()); // (the page back in view)
  p = await page.evaluate(() => window.__feedBy([33.33, 33.33, 33.33, 33.33, 33.33, 33.33, 33.33], 16.67, 10, 0.3));
  s = await st();
  ok(!s.capped && s.rung === 7 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([7]) && /it was the load/.test(s.why), "test: the page back in view: the test goes past the real cut (LIGHTEST), runs at 60 there: let go, held there", { capped: s.capped, rung: s.rung, why: s.why, path: p });
  // deep load (the independent review's case): a load, not a cap, that holds 30 down through SAFE and lifts at
  // LIGHTEST: the step past the real cut runs at 60, so no cap: held there
  await reset();
  p = await page.evaluate(() => window.__feedBy([33.33, 33.33, 33.33, 33.33, 33.33, 33.33, 33.33], 16.67, 24, 0.3));
  s = await st();
  ok(!s.capped && s.rung === 7 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6, 7]), "deep load: 30 through SAFE, 60 at LIGHTEST: no cap, held at LIGHTEST", { capped: s.capped, rung: s.rung, path: p });
  // low cap: a 24 fps cap that starts with the picture already at LIGHTEST (no real cut below it): down to the last
  // step, still 24: back to LIGHTEST, held, then up as frames hold
  await reset();
  await page.evaluate(() => window.__arcade.GFX.setRung(7, "test"));
  p = await feed(41.67, 16, 0.3);
  s = await st();
  ok(s.capped && s.rung === 7 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([8, 9, 10, 7]), "low cap: from LIGHTEST, down to the last step, still 24: back to LIGHTEST, held", { capped: s.capped, rung: s.rung, path: p });
  p = await feed(41.67, 80, 0.3);
  s = await st();
  ok(s.capped && s.rung <= 1 && p.length >= 5 && p.slice(0, 5).every((x, i) => x.rung === 6 - i), "low cap: steady under the hold: up a step at a time toward PHONE 2x (the hold's one-step test on the way)", { capped: s.capped, rung: s.rung, path: p.slice(0, 9) });
  // faster: held at 24 from the start, then frames at 30 a second at 2x and through SAFE, 60 at LIGHTEST (the cap
  // lifted, a load in its place): tested past the real cut at once, let go there
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(41.67)));
  p = await page.evaluate(() => window.__feedBy([33.33, 33.33, 33.33, 33.33, 33.33, 33.33, 33.33], 16.67, 10, 0.3));
  s = await st();
  ok(!s.capped && s.rung === 7 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([7]) && p[0].at <= 6, "faster: held at 24, then 30 at 2x from a load: tested past the real cut within seconds, 60 there: let go", { capped: s.capped, rung: s.rung, why: s.why, path: p });
  // band: held at 24 from the start, the device's own rate at 30 at times (3 s of 30, 5 s of 24, over and over): one
  // deep test, the band learned, no step after
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(41.67)));
  p = [];
  for (let k = 0; k < 8; k++) { p = p.concat(await feed(33.33, 3, 0.3), await feed(41.67, 5, 0.3)); }
  s = await st();
  ok(s.capped && s.rung === 0 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([7, 0]) && s.label === "HELD AT 24-30 FPS · LOW POWER MODE?", "band: 24 and 30 by turns: one deep test, the band learned (HELD AT 24-30 FPS), held at 2x, no step after", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  // lowpower, heavy: under the cap, the first two steps too much even for 30 (45 ms a frame), the rest holding 30:
  // down until 30 holds one step past a real cut below where it was first held (1.7x: LIGHTEST, then its smaller
  // size), back there, then up to 1.8x as it holds
  await reset();
  p = await page.evaluate(() => window.__feedBy([45, 45], 33.33, 30, 0.3));
  s = await st();
  ok(s.capped && s.rung === 3 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6, 7, 8, 3]), "lowpower, heavy: down until 30 holds one step past a real cut, then back to the sharpest step that held it (1.7x)", { rung: s.rung, capped: s.capped, path: p });
  p = await page.evaluate(() => window.__feedBy([45, 45], 33.33, 60, 0.3));
  s = await st();
  ok(s.capped && s.rung === 2 && p.length >= 1 && p[0].rung === 2 && p.every((x) => x.rung >= 1), "lowpower, heavy: steady there: up to 1.8x, the sharpest step that holds 30 (1.9x tried, back)", { rung: s.rung, capped: s.capped, path: p });
  // a heavy screen at 30 (each frame just over 17 ms) down to 1.8x: a real cut lifts it, so no cap
  await reset();
  p = await page.evaluate(() => window.__feedBy([33.33, 33.33, 33.33], 16.67, 14, 0.3));
  s = await st();
  ok(!s.capped && s.rung === 3, "heavy at 30: lifted at 1.7x (60 fps there): no cap, held there", { rung: s.rung, capped: s.capped, path: p });
  // a slow device: frames of 100 ms (10 a second) still step it down
  await reset();
  p = await feed(100, 12, 3);
  ok(p.length >= 2 && p[0].rung === 1, "slow device (10 fps): it steps down", p);
  // a new screen's first seconds: slow looks under way, then a new screen whose first frames are uneven
  await reset();
  p = await feed(40, 3, 1);
  await page.evaluate(() => { window.__arcade.GFX.sceneAt = performance.now(); });
  p = p.concat(await feed(40, 0.8, 1), await feed(16.67, 6, 0.3));
  ok(p.length === 0, "a new screen: the last one's slow looks and its own first frames are not held against it", p);
  // catching
  await reset();
  p = await feed(16.67, 6, 0.3, 8, 50);
  ok(p.length === 1 && p[0].rung === 1, "catching: a step down when one frame in eight catches", p);
  // busy
  await reset();
  p = await feed(16.67, 12, 0.3, 8, 80, true);
  ok(p.length === 0, "busy: hitches that made shaders or sent pictures (a model arriving) are not held against it", p);
  // creep: one frame in thirty a frame late (34 ms), the main thread idle: heat. Eased one small step after ten
  // seconds, and climbed back only after half a minute steady
  await reset();
  p = await feed(16.67, 13, 0.3, 30, 34);
  s = await st();
  ok(p.length === 1 && p[0].rung === 1 && p[0].at >= 9 && /easing/.test(s.why), "creep: one frame in thirty late through ten seconds: eased one small step (1.9x)", { path: p, why: s.why });
  p = await feed(16.67, 25, 0.3);
  ok(p.length === 0, "creep: not climbed back after 25 steady seconds", p);
  p = await feed(16.67, 8, 0.3);
  ok(p.length === 1 && p[0].rung === 0, "creep: climbed back after half a minute steady", p);
  // creep that a smaller picture does not help (the same late frames after the step): judged from its own ten seconds,
  // back up, and never eased from there again
  await reset();
  p = await feed(16.67, 60, 0.3, 30, 34);
  s = await st();
  ok(p.length === 2 && p[0].rung === 1 && p[1].rung === 0 && p[1].at - p[0].at >= 11.5 && p[1].at - p[0].at <= 13 && /did not help/.test(s.why), "creep: the same late frames after the step: judged after its ten seconds, back up, and not eased again in the next 38 s", { path: p, why: s.why });
  p = await feed(16.67, 270, 0.3, 30, 34);
  ok(p.length >= 1 && p[0].rung === 1 && p[0].at >= 245 && p[0].at <= 262, "creep: tried again five minutes after it did not help (a verdict can be wrong, and things change)", p.slice(0, 3));
  p = await feed(16.67, 640, 0.3, 30, 34);
  ok(p.length >= 2 && p[0].rung === 0 && p[1].rung === 1 && p[1].at - p[0].at >= 590 && p[1].at - p[0].at <= 615, "creep: no help a second time: tried again after ten minutes, not five", p.slice(0, 3));
  // creep that a step helps, then creeping again at the new step (the chip warmer still): a second step
  await reset();
  p = (await feed(16.67, 13, 0.3, 30, 34)).concat(await feed(16.67, 15, 0.3), await feed(16.67, 13, 0.3, 30, 34));
  ok(p.length === 2 && p[0].rung === 1 && p[1].rung === 2, "creep: a step that helped, then late frames again: a second small step (1.8x)", p);
  // creep at the tier's last size: never across into the effects or the lights
  await reset();
  await page.evaluate(() => window.__arcade.GFX.setRung(5, "test"));
  p = await feed(16.67, 30, 0.3, 30, 34);
  ok(p.every((x) => x.rung <= 5), "creep: from the tier's last size (1.5x), never a step into SAFE: easing is the drawing size only (it may climb when steady and ease back)", p);
  // eased, then frames still late now and then (one in sixty): not climbed back
  await reset();
  p = await feed(16.67, 13, 0.3, 30, 34);
  p = p.concat(await feed(16.67, 45, 0.3, 60, 34));
  ok(p.length === 1 && p[0].rung === 1, "creep: eased, then one late frame in sixty: held there, not climbed back (it would run late again)", p);
  // relapse
  await reset();
  await page.evaluate(() => window.__arcade.GFX.setRung(2, "test"));
  p = await feed(16.67, 12, 0.3);
  ok(p.length === 1 && p[0].rung === 1, "relapse: a step up after 11 steady seconds", p);
  p = await feed(25, 3, 0.5);
  ok(p.length === 1 && p[0].rung === 2, "relapse: late again at once: back down", p);
  p = await feed(16.67, 20, 0.3);
  ok(p.length === 0, "relapse: not tried again after 20 s", p);
  p = await feed(16.67, 8, 0.3);
  ok(p.length === 1 && p[0].rung === 1, "relapse: tried again after 26.5 s (24 steady)", p);
  // fixed
  await page.evaluate(() => window.__arcade.GFX.setQuality("low"));
  s = await st();
  ok(!s.auto && s.tier === 2 && s.scale === 1 && s.label === "FIXED (SETUP)" && s.steps === 6 && s.ladder.every(([t, , l]) => t === 2 && l === 99), "fixed: Setup's SAFE at its full size, its six sizes all SAFE with every light", { tier: s.tier, scale: s.scale, label: s.label, steps: s.steps, ladder: s.ladder });
  p = await feed(40, 12, 8);
  s = await st();
  ok(!s.auto && p.length >= 2 && s.tier === 2 && s.scale < 1 && s.slots === 3 && /^FIXED \(SETUP\) · SIZE STEP \d\/6$/.test(s.label), "fixed: frames of 40 ms: its drawing size steps down, SAFE kept, every light kept, the readout names the step", { path: p, tier: s.tier, scale: s.scale, slots: s.slots, label: s.label });
  p = await feed(16.67, 90, 0.3);
  s = await st();
  ok(!s.auto && p.length >= 1 && s.rung === 0 && s.scale === 1 && s.tier === 2 && s.label === "FIXED (SETUP)", "fixed: steady again: back to its full size, SAFE as chosen", { path: p, rung: s.rung, scale: s.scale, tier: s.tier, label: s.label });
  // (the phone's page: no frosted glass at Setup's HIGH either)
  await page.evaluate(() => window.__arcade.GFX.setQuality("high"));
  s = await st();
  const lite = await page.evaluate(() => document.body.classList.contains("lite"));
  ok(s.tier === 0 && lite, "phone: Setup's HIGH (MAC) and still no frosted glass over the live picture (body.lite)", { tier: s.tier, lite });
  await reset();
  s = await st();
  ok(s.auto && s.rung === 0 && s.tier === 1 && s.scale === 1, "fixed: AUTO again starts from PHONE at 2x", { rung: s.rung, tier: s.tier, scale: s.scale });
  // fixed@30: a fixed tier held at exactly 30 (Low Power Mode): its sizes down until three quarters of it (56% of the
  // pixels) still hold 30, then back to its full size, held
  await page.evaluate(() => window.__arcade.GFX.setQuality("medium"));
  p = await feed(33.33, 15, 0.3);
  s = await st();
  ok(!s.auto && s.capped && s.tier === 1 && s.rung === 0 && s.scale === 1 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 0]) && s.label === "FIXED (SETUP) · HELD AT 30 FPS · LOW POWER MODE?", "fixed@30: Setup's PHONE held at exactly 30: down to three quarters of its size, still 30: back to its full size, held", { tier: s.tier, rung: s.rung, scale: s.scale, label: s.label, path: p });
  p = await feed(33.33, 20, 0.3);
  ok(p.length === 0, "fixed@30: held at its full size while it lasts", p);
  // a fixed tier held at 24 from the start (the blank frames at the start every 41.7 ms): its full size, no step
  await reset();
  await page.evaluate(() => { const G = window.__arcade.GFX; G.setQuality("medium"); G.screenProbed(Array(13).fill(41.67)); });
  p = await feed(41.67, 10, 0.3);
  s = await st();
  ok(!s.auto && s.capped && s.rung === 0 && s.scale === 1 && p.length === 0 && /HELD AT 24 FPS/.test(s.label), "fixed@24: Setup's PHONE held at 24 from the start: its full size, no step", { rung: s.rung, scale: s.scale, label: s.label, path: p });
  // eased: a fixed tier already a size down (heat) when a 30 cap starts (no real cut below 0.95 of it): its sizes down
  // to the last, still 30: back to the eased size, held, then up to its full size
  await reset();
  await page.evaluate(() => { const G = window.__arcade.GFX; G.setQuality("medium"); G.setRung(1, "test"); });
  p = await feed(33.33, 30, 0.3);
  s = await st();
  ok(!s.auto && s.capped && s.rung === 0 && s.scale === 1 && p.length >= 3 && p[p.length - 2].rung === 1 && p[p.length - 1].rung === 0, "eased: a fixed tier eased a size when 30 starts: down to its last size, still 30: back to the eased size, held, then up to its full size", { rung: s.rung, scale: s.scale, path: p });
  await reset();
  // once: a Graphics setting fixed before 2026-11-26 is AUTO again, once
  {
    const ctx3 = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }), page3 = await ctx3.newPage();
    page3.on("pageerror", (e) => errors.push(e.message));
    await page3.addInitScript(inPage);
    await page3.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("inr-arcade-v1", JSON.stringify({ settings: { quality: "high" }, updated: 1 })); } });
    const open = async (again) => { if (again) await page3.reload(); else await page3.goto(base + "/index.html#debug,phone,noassets"); await page3.waitForFunction(() => window.__arcade && window.__arcade.GFX && window.__arcade.GFX.perf.ladder, null, { timeout: 60000, polling: 250 }); return page3.evaluate(() => ({ auto: window.__arcade.GFX.auto, q: window.__arcade.Store.settings.quality, qv: window.__arcade.Store.settings.qv })); };
    let o = await open();
    ok(o.auto && o.q === "auto" && o.qv === 2, "once: a phone saved at a fixed HIGH before today opens at AUTO", o);
    await page3.evaluate(() => { const S = window.__arcade.Store; S.settings.quality = "high"; S.save(); if (S.flush) S.flush(); });
    o = await open(true);
    ok(!o.auto && o.q === "high", "once: fixed at HIGH again after it: it stays (the reset is once)", o);
    // (a copy synced from another device that still has an old fixed setting, newer than this one: AUTO too)
    const m = await page3.evaluate(() => { const mine = { settings: { quality: "high", qv: 2 }, updated: 5 }, theirs = { settings: { quality: "high" }, updated: 9 }, mine2 = { settings: { quality: "low", qv: 2 }, updated: 9 }; return { old: window.__arcade.mergeStates(mine, theirs).settings, kept: window.__arcade.mergeStates({ settings: {}, updated: 1 }, mine2).settings }; });
    ok(m.old.quality === "auto" && m.old.qv === 2 && m.kept.quality === "low", "once: a newer synced copy with an old fixed setting comes in as AUTO; one fixed since is kept", { old: m.old.quality, qv: m.old.qv, kept: m.kept.quality });
    await ctx3.close();
  }
  // a desktop screen (no #phone, 2x): its ladder starts at MAC, full size
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 }), page2 = await ctx2.newPage();
  page2.on("pageerror", (e) => errors.push(e.message));
  await page2.addInitScript(inPage);
  await page2.goto(base + "/index.html#debug,noassets");
  await page2.waitForFunction(() => window.__arcade && window.__arcade.GFX && window.__arcade.GFX.perf.ladder && window.__arcade.Scenes.cur, null, { timeout: 60000, polling: 250 });
  const d = await page2.evaluate(() => window.__state());
  console.log("  desktop ladder: " + d.ladder.map(([t, sc, l]) => NAMES[t] + " " + sc + (l < 99 ? " lights " + l : "")).join(" > "));
  ok(d.rung === 0 && d.tier === 0 && d.scale === 1 && d.ladder.length === 12 && d.ladder[1][1] === 0.95 && d.ladder[6][0] === 1 && d.ladder[6][1] === 0.75 && d.ladder[7][0] === 2, "desktop: MAC at full size first; 12 steps; 2x to 1.5x in tenths, then PHONE and SAFE at 1.5x", { rung: d.rung, tier: d.tier, ladder: d.ladder });
  ok(d.px.every((x, i) => i === 0 || x <= d.px[i - 1] + 1e-9), "desktop: no step down draws more pixels", d.px);
  ok(d.canvasW === 2560, "desktop: the canvas at the screen's own pixels (2560 across)", d.canvasW);
  // the window moved to a 1x screen and back
  const dpr = async (k) => {
    if (ENGINE === "chromium") { const c = await ctx2.newCDPSession(page2); await c.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: k, mobile: false }); await page2.waitForTimeout(400); }
    else await page2.evaluate((v) => { window.__dpr = v; }, k); // (WebKit: the density as the page reads it, through the getter set up at the start: see inPage)
    await page2.evaluate(() => window.__feed(16.67, 0.05)); // (a frame or so: each looks at the density)
    return page2.evaluate(() => window.__state());
  };
  let e = await dpr(1);
  ok(e.canvasW === 1280 && e.ladder.length === 7 && e.tier === 0 && e.rung === 0, "density: moved to a 1x screen: the canvas 1280 across, a 7-step ladder, still MAC", { w: e.canvasW, steps: e.ladder.length, tier: e.tier, rung: e.rung });
  e = await dpr(2);
  ok(e.canvasW === 2560 && e.ladder.length === 12 && e.tier === 0 && e.rung === 0, "density: back to the 2x screen: 2560 across, 12 steps", { w: e.canvasW, steps: e.ladder.length, tier: e.tier, rung: e.rung });
  // resized twenty times, a frame drawn at each size: what is on the graphics chip is what it was
  const mem = () => page2.evaluate(() => { const A = window.__arcade, G = A.GFX, s = A.Scenes.cur; G.render(s.scene, s.camera, 0.016); const m = G.renderer.info.memory; return { tex: m.textures, geo: m.geometries, w: G.renderer.domElement.width }; });
  const m0 = await mem();
  const sizes = [[1000, 700], [1470, 830], [800, 600], [1440, 900], [1280, 800]];
  for (let k = 0; k < 20; k++) { const [w, h] = sizes[k % sizes.length]; await page2.setViewportSize({ width: w, height: h }); await page2.evaluate(() => window.__arcade.GFX.resize()); await mem(); }
  const m1 = await mem();
  ok(m1.tex === m0.tex && m1.geo === m0.geo && m1.w === 2560, "resize: twenty sizes, drawn at each: the same textures and geometry held after (nothing leaked)", { before: m0, after: m1 });
  // a computer held at a steady 30 (a 30 Hz screen, or its own power saving): the step that held it, not SAFE
  await page2.evaluate(() => { const G = window.__arcade.GFX; G.setQuality("auto"); G.perf.n = 0; G.perf.i = 0; G.screenProbed(Array(13).fill(33.33)); });
  p = await page2.evaluate(() => window.__feed(33.33, 10, 0.2));
  e = await page2.evaluate(() => window.__state());
  ok(e.capped && e.rung === 0 && e.tier === 0 && e.label === "HELD AT 30 FPS · LOW POWER MODE OR A 30 HZ SCREEN?" && p.length === 0, "desktop at 30: held at MAC 2x, named LOW POWER MODE OR A 30 HZ SCREEN?", { capped: e.capped, rung: e.rung, label: e.label, path: p });
  p = await page2.evaluate(() => window.__feed(16.67, 8, 0.3));
  e = await page2.evaluate(() => window.__state());
  ok(!e.capped && e.rung === 0, "desktop at 30: at 60 again, let go", { capped: e.capped, rung: e.rung, path: p });
  // a phone held at 30 (PHONE 2x), its screen's density changed (to 1x and back): the hold kept, at the nearest step
  // of the new ladder, and let go when the cap lifts
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  const pdpr = async (k) => {
    if (ENGINE === "chromium") { const c = await ctx.newCDPSession(page); await c.send("Emulation.setDeviceMetricsOverride", { width: 440, height: 956, deviceScaleFactor: k, mobile: true }); await page.waitForTimeout(300); }
    else await page.evaluate((v) => { window.__dpr = v; }, k); // (WebKit: through the getter set up at the start: see inPage)
    await page.evaluate(() => window.__feed(33.33, 0.1));
    return st();
  };
  s = await pdpr(1);
  ok(s.capped && s.tier === 1 && s.ladder.length === 6 && s.rung === 0, "density in a hold: a 1x screen, a 6-step ladder, still held, at PHONE", { capped: s.capped, tier: s.tier, rung: s.rung, steps: s.ladder.length });
  p = await feed(16.67, 8, 0.3);
  s = await st();
  ok(!s.capped && s.rung === 0 && s.tier === 1, "density in a hold: the cap lifts: let go, at PHONE", { capped: s.capped, tier: s.tier, rung: s.rung, path: p });
  s = await pdpr(3);
  ok(s.ladder.length === 11 && s.rung === 0 && s.canvasW === 880, "density: back to the phone's own 3x: 11 steps, 2x drawn", { steps: s.ladder.length, rung: s.rung, w: s.canvasW });
  ok(errors.length === 0, "no page errors", errors.slice(0, 3));
  await browser.close();
  srv.close();
  console.log(fails ? fails + " FAILED" : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
