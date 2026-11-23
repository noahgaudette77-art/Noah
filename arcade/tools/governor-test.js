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
 * and SAFE tiers, the drawing size in tenths, the heat's easing, Low Power Mode to SAFE):
 *   start      a phone starts at PHONE drawn at 2x (no softer start); 11 steps
 *   slow       frames of 40 ms: a step every 3.5 s, one size, then two, then three at once while they stay slow
 *              (2x, 1.9x, 1.7x, 1.5x), then the effects and the lights a step at a time, to the last
 *   recover    steady 60 fps from the last step: a step back up every 11 s (2.5 s to show, then 8 steady), to PHONE
 *              at 2x and no higher
 *   lowpower   frames held at exactly 30: down until a real cut (a tier down, 56% of the pixels) still holds 30, so it
 *              is the device's cap: held at SAFE, named in the readout, held through a new screen's first seconds;
 *              at 60 again the cap lifts and the picture goes straight back to 2x
 *   boot       blank frames timed at the start every 33 ms: SAFE from the start, no step taken to find it; at 60, no cap
 *   under cap  frames still catching under the cap step down; steady at 30 again, back up
 *   load       held at 30 from the start by a load at 2x alone: SAFE runs at 60, so back to 2x; 30 there: a step down
 *   test       held at 30 by a load that SAFE still has: the step down tried after a minute runs at 60: no cap
 *   heavy      under a cap, a load too much even for 30: down until 30 holds, then held at SAFE
 *   heavy@30   a screen held at 30 by its own load, which a real cut lifts: no cap, held where it runs at 60
 *   10 fps     a slow device still steps down
 *   new screen the last screen's slow looks and a new screen's uneven first frames are not held against it
 *   catching   60 fps with one frame in eight at 50 ms: a step down (the frames catch)
 *   busy       the same hitches on frames that sent a new picture to the chip (a model arriving): no step
 *   creep      60 fps with one frame in thirty late (heat): after ten seconds one small step down, and climbed back
 *              only after half a minute steady; a step that did not help (judged from its own ten seconds) is taken
 *              back and not tried from there for five minutes; one that helped may be followed by another; never past the tier's
 *              last size into its effects or lights; not climbed back while one frame in sixty is still late
 *   relapse    a step up that runs late within 8 s is tried again only after 24 steady seconds, not 8
 *   fixed      Setup's fixed tier: the governor does nothing, at the tier's full size; AUTO again: back to 2x
 *   desktop    a desktop's ladder starts at MAC, full size, 12 steps, and no step down draws more pixels; the window
 *              moved to a 1x screen and back (Chromium: a real change of density): the ladder made again, the canvas
 *              at the new screen's pixels; resized twenty times, drawn each time: nothing left on the graphics chip;
 *              held at a steady 30 (a 30 Hz screen): the sharp step kept, not SAFE
 *   density    a phone held at 30 when its density changes: still held at SAFE on the new ladder, and back to the step
 *              it had when the cap lifts
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
  // each case from AUTO's start, its frames' history cleared (the step just set is given its 2.5 s to show, as ever)
  const reset = () => page.evaluate(() => { const G = window.__arcade.GFX; G.setQuality("auto"); G.perf.n = 0; G.perf.i = 0; });
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
  let p = await feed(40, 34, 2);
  s = await st();
  ok(s.rung === s.steps - 1, "slow: down to the last step", { rung: s.rung, path: p });
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
  // does not lift them, so it is the device's cap: held at SAFE
  await reset();
  p = await feed(33.33, 22, 0.2);
  s = await st();
  ok(s.capped && s.rung === 6 && s.tier === 2 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6]), "lowpower: down until a real cut (SAFE, 56% of the pixels) still held 30: held there, at SAFE", { capped: s.capped, rung: s.rung, path: p });
  ok(/HELD AT 30 FPS · LOW POWER MODE\? SAFE TIER/.test(s.label), "lowpower: the readout names it", s.label);
  p = await feed(33.33, 20, 0.2);
  ok(p.length === 0, "lowpower: held, no more steps while it lasts", p);
  await page.evaluate(() => { window.__arcade.GFX.sceneAt = performance.now(); }); // (a new screen)
  p = (await feed(33.33, 1.5, 0.2, 6, 70)).concat(await feed(33.33, 6, 0.2));
  s = await st();
  ok(s.capped && p.length === 0, "lowpower: held through a new screen's uneven first seconds", { capped: s.capped, path: p });
  p = await feed(16.67, 12, 0.3);
  s = await st();
  ok(!s.capped && s.rung === 0 && p.length === 1 && p[0].rung === 0 && !/HELD/.test(s.label), "lowpower: off again (60 fps): the cap lifts, straight back to 2x", { capped: s.capped, rung: s.rung, label: s.label, path: p });
  // lowpower from the start: the blank frames timed at the start came every 33 ms
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(16.67)));
  s = await st();
  ok(!s.capped && s.rung === 0, "boot: blank frames at 60: no cap", s.capped);
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  p = await feed(33.33, 10, 0.2);
  s = await st();
  ok(s.capped && s.rung === 6 && p.length === 0, "boot: blank frames every 33 ms: SAFE from the start, no step taken to find it", { capped: s.capped, rung: s.rung, path: p });
  // under the cap: frames still catching (a third of them at 67 ms) step down; steady again, back up
  p = [];
  for (let k = 0; k < 16 && !p.length; k++) p = await feed(33.33, 0.5, 0.2, 3, 66.7); // (until the step it causes)
  s = await st();
  ok(s.capped && p.length === 1 && p[0].rung === 7, "under the cap: frames still catching: a step down, still held", { capped: s.capped, path: p });
  p = await feed(33.33, 15, 0.2);
  s = await st();
  ok(s.capped && s.rung === 6 && p.length === 1 && p[0].rung === 6, "under the cap: steady at 30 again: back up to SAFE", { capped: s.capped, rung: s.rung, path: p });
  // a load just over a frame at 2x alone (30 there, 60 a step down), held at 30 from the start: SAFE runs at 60, so
  // the hold lets go and goes back to 2x; held at 30 there by its load, a step down lifts it: no cap
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  p = await page.evaluate(() => window.__feedBy([33.33], 16.67, 15, 0.3));
  s = await st();
  ok(!s.capped && p.length >= 2 && p[0].rung === 0 && p[1].rung === 1 && s.rung >= 1, "load: SAFE at 60, back to 2x; held at 30 there by the load, a step down: no cap", { capped: s.capped, rung: s.rung, path: p });
  // the hold tested: a load just over a frame down to SAFE (30 at every step to SAFE, 60 below), held at 30 from the
  // start: the step down tried after a minute runs at 60, so the cap lets go, where it is
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  p = await page.evaluate(() => window.__feedBy([33.33, 33.33, 33.33, 33.33, 33.33, 33.33, 33.33], 16.67, 72, 0.3));
  s = await st();
  ok(!s.capped && p.length === 1 && p[0].rung === 7 && s.rung === 7, "test: held at 30 at SAFE, a step down tried after a minute runs at 60: no cap after all", { capped: s.capped, rung: s.rung, why: s.why, path: p });
  // lowpower, heavy: under the cap, the first two steps too much even for 30 (45 ms a frame), the rest holding 30
  await reset();
  p = await page.evaluate(() => window.__feedBy([45, 45], 33.33, 30, 0.3));
  s = await st();
  ok(s.capped && s.rung === 6 && JSON.stringify(p.map((x) => x.rung)) === JSON.stringify([1, 3, 5, 6, 7, 6]), "lowpower, heavy: down until 30 holds through a real cut, then held at SAFE", { rung: s.rung, capped: s.capped, path: p });
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
  p = await feed(40, 10, 2);
  s = await st();
  ok(!s.auto && p.length === 0 && s.tier === 2 && s.scale === 1 && s.label === "FIXED (SETUP)" && s.why === "setup" && s.slots === 3, "fixed: Setup's SAFE holds, at its full size, every light", { tier: s.tier, scale: s.scale, label: s.label, why: s.why, slots: s.slots, path: p });
  await reset();
  s = await st();
  ok(s.auto && s.rung === 0 && s.tier === 1 && s.scale === 1, "fixed: AUTO again starts from PHONE at 2x", { rung: s.rung, tier: s.tier, scale: s.scale });
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
    else await page2.evaluate((v) => { Object.defineProperty(window, "devicePixelRatio", { get: () => v, configurable: true }); }, k); // (WebKit: the density as the page reads it; its own property, which a delete would take away altogether)
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
  ok(e.capped && e.rung === 0 && e.tier === 0 && /30 HZ SCREEN/.test(e.label) && p.length === 0, "desktop at 30: held at MAC 2x, named LOW POWER MODE OR A 30 HZ SCREEN?", { capped: e.capped, rung: e.rung, label: e.label, path: p });
  p = await page2.evaluate(() => window.__feed(16.67, 8, 0.3));
  e = await page2.evaluate(() => window.__state());
  ok(!e.capped && e.rung === 0, "desktop at 30: at 60 again, let go", { capped: e.capped, rung: e.rung, path: p });
  // a phone held at 30 (SAFE), its screen's density changed (to 1x and back): the hold kept at SAFE on the new ladder,
  // and when the cap lifts, back to the step it had
  await reset();
  await page.evaluate(() => window.__arcade.GFX.screenProbed(Array(13).fill(33.33)));
  const pdpr = async (k) => {
    if (ENGINE === "chromium") { const c = await ctx.newCDPSession(page); await c.send("Emulation.setDeviceMetricsOverride", { width: 440, height: 956, deviceScaleFactor: k, mobile: true }); await page.waitForTimeout(300); }
    else await page.evaluate((v) => { Object.defineProperty(window, "devicePixelRatio", { get: () => v, configurable: true }); }, k);
    await page.evaluate(() => window.__feed(33.33, 0.1));
    return st();
  };
  s = await pdpr(1);
  ok(s.capped && s.tier === 2 && s.ladder.length === 6 && s.rung === 1, "density in a hold: a 1x screen, a 6-step ladder, still held at SAFE", { capped: s.capped, tier: s.tier, rung: s.rung, steps: s.ladder.length });
  p = await feed(16.67, 8, 0.3);
  s = await st();
  ok(!s.capped && s.rung === 0 && s.tier === 1, "density in a hold: the cap lifts, back to PHONE, the step it had", { capped: s.capped, tier: s.tier, rung: s.rung, path: p });
  s = await pdpr(3);
  ok(s.ladder.length === 11 && s.rung === 0 && s.canvasW === 880, "density: back to the phone's own 3x: 11 steps, 2x drawn", { steps: s.ladder.length, rung: s.rung, w: s.canvasW });
  ok(errors.length === 0, "no page errors", errors.slice(0, 3));
  await browser.close();
  srv.close();
  console.log(fails ? fails + " FAILED" : "ALL OK");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
