#!/usr/bin/env node
/**
 * Is the characters' movement the same at any frame rate? (the animation pass, 2026-11-23: animation speed identical at
 * 60, 90 and 120 Hz)
 *
 *   node tools/motion-hz.js [--html index.html] [--boss 5] [--rates 30,60,90,120] [--engine chromium|webkit] [--pops]
 *
 * A Boss Rush boss and the wizard, made from the game's own classes in a scene of their own (the game's rules play no
 * part: nothing here waits on a rule's frame), are put through the same performance at each frame rate: a breath of
 * idle, a wind-up and its strike, a blow taken, the wizard's cast and lance, the boss's blow landing on the wizard's
 * ward, the boss's rage. Every event falls on a 30th of a second, a frame at every rate tried. At each 30th of a
 * second the places of their heads, hands, chests and feet, the wizard's wand tip and the boss's body are written down,
 * and each rate is compared with 240 Hz: the largest and the mean distance, in centimetres (the boss stands 7.4 m tall,
 * the wizard 2 m). A build from before the pass can be given (--html): its classes are put through the same. --pops:
 * at 60 Hz, each place's largest move in a single frame against the frames round it (a cut between two poses shows as
 * a move many times its neighbours').
 */
const fs = require("fs"), path = require("path"), http = require("http");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const HTML = flag("html", "index.html"), BOSS = flag("boss", "5"), RATES = flag("rates", "30,60,90,120").split(",").map(Number), ENGINE = flag("engine", "chromium"), POPS = args.includes("--pops");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };

// Runs in the page: the performance at one rate, sampled every 30th of a second
async function perform(o) {
  const A = window.__arcade, hz = o.hz, key = o.boss, dt = 1 / hz, T = 4.4;
  await A.Assets.need("boss", ["model:boss-" + key, "model:wizard", "model:wand"]);
  const bm = A.Assets.model("boss-" + key), wm = A.Assets.model("wizard"), wand = A.Assets.model("wand");
  if (!bm) return { error: "no boss model" };
  const nop = () => ({ stop() {}, set() {}, live() { return false; } }), kit = new Proxy({}, { get: () => nop });
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 440 / 300, 0.1, 300);
  camera.position.set(0, 3.2, 17); camera.lookAt(0, 4.2, 0);
  const g = { cfg: { color: 0x9a6bff }, scene, camera, kit, t: 0, state: "ask", band: null, camBase: camera.position.clone(), lookAt: new THREE.Vector3(0, 4.2, 0), camZ: 17, el: null, show: { wait() {}, add() {} }, unmounted: false, frontRow: null, shake() {} };
  const sfx = A.Sound.sfx, random = Math.random;
  A.Sound.sfx = () => 0;
  let seed = 12345; // (the same draws in every run: where its idle starts, how a strike varies)
  Math.random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try {
    const { BossActor, BossTollgate, Wizard, bossRow } = A;
    const a = bm.animations.length ? new BossActor(g, bm, bossRow(key)) : new BossTollgate(g, bm, bossRow(key));
    a.root.scale.setScalar(7.4); scene.add(a.root); a.power = 1; a.landed = true;
    const st = { g, kit, a, S: 7.4, tb: () => 0.42, lens: (x, y, D, out) => (out || new THREE.Vector3()).set(x * D * 0.6, 3.2 + y * D * 0.42, 17 - D) };
    let w = null;
    try { w = wm ? new Wizard(st, wm, wand) : null; } catch (e) { w = null; }
    if (w) w.root.visible = true;
    const head = (o) => (w.headAt ? w.headAt(o) : (w.model.parts.Head || w.hand).getWorldPosition(o)); // (a build from before the pass has no headAt)
    const v = new THREE.Vector3(), out = [], every = [], E = { from: new THREE.Vector3(-3, 2.5, 12), at: new THREE.Vector3(0, 5, 0.6) };
    const bones = (r) => { const b = []; for (const n of ["head", "chest", "handL", "handR", "footL"]) { a.at(n, v); b.push(v.x, v.y, v.z); } a.body.getWorldPosition(v); b.push(v.x, v.y, v.z); if (w) { head(v); b.push(v.x, v.y, v.z); w.hand.getWorldPosition(v); b.push(v.x, v.y, v.z); w.tip(v); b.push(v.x, v.y, v.z); } r.push(b); };
    const at = (t, s) => Math.abs(t - s) < dt / 2;
    // (continuous inputs, the wind-up and the strike, are set for the moment about to be shown, as the stage sets them;
    // an event happens on its moment, after the frame that reaches it: so every rate starts it at the same time)
    const S1 = 1.5, SW = 4 / 30;
    for (let i = 0; i <= Math.round(T * hz); i++) {
      const t = i / hz, f = t < 3.4 ? Math.min(1, t / 3) : 0.2, rage = t >= 3.6 + 1e-9 ? 1 : 0;
      if (i > 0) {
        if (t > 0.5 && t <= S1 + 1e-9) a.wind("attackA", (t - 0.5) / 1.0);
        if (t > S1 + 1e-9 && t <= S1 + SW + 1e-9) a.swing("attackA", Math.min(1, (t - S1) / SW));
        if (w) w.animate(dt, f);
        a.update(dt, { rage, glow: 0, flick: 1, charge: 0, look: w ? head(new THREE.Vector3()) : null });
        if (w) w.update(dt, f);
      }
      scene.updateMatrixWorld(true);
      const k = Math.round(t * 30);
      if (Math.abs(t * 30 - k) < 1e-6) bones(out);
      if (o.every) bones(every); // (every frame, for the jumps: --pops)
      if (at(t, S1 + SW)) a.recover();
      if (at(t, 2.2)) { if (a.hit) a.hit(E.from, E.at, false); a.kickV += 3.2; a.react("hurt", { rate: 1.55, in: 0.05, out: 0.32, k: 0.62 }); }
      if (w && at(t, 2.6)) w.cast(true);
      if (w && at(t, 2.8)) w.nova(false, E.at, null);
      if (w && at(t, 3.2)) w.shield(2);
      if (at(t, 3.6)) { a.react("rage", { rate: 1.5, in: 0.12, out: 0.4 }); if (a.enrage) a.enrage(); }
    }
    return { hz, samples: out, every, wizard: !!w };
  } finally { A.Sound.sfx = sfx; Math.random = random; }
}

(async () => {
  // (the page as served here hands its test hook the classes the performance needs: they live inside the page's own
  // closure. Only this copy, in this test; the game itself is not changed.)
  const HOOK = "window.__arcade = {", EXPOSE = HOOK + " BossActor: typeof BossActor !== 'undefined' ? BossActor : null, BossTollgate: typeof BossTollgate !== 'undefined' ? BossTollgate : null, Wizard: typeof Wizard !== 'undefined' ? Wizard : null, bossRow: typeof bossRow !== 'undefined' ? bossRow : null,";
  const srv = http.createServer((req, rsp) => {
    const file = path.join(ARCADE, decodeURIComponent(req.url.split("?")[0]));
    if (!file.startsWith(ARCADE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end(); return; }
    rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    if (/\.html$/.test(file)) { const h = fs.readFileSync(file, "utf8"); if (!h.includes(HOOK)) console.log("motion-hz: the page's test hook was not found"); rsp.end(h.replace(HOOK, EXPOSE)); return; }
    fs.createReadStream(file).pipe(rsp);
  }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  const pw = require("playwright");
  let browser;
  if (ENGINE === "webkit") { const dir = process.env.WEBKIT_BROWSERS_PATH, wk = dir && fs.existsSync(dir) && fs.readdirSync(dir).find((d) => /^webkit-\d+$/.test(d)); browser = await pw.webkit.launch(wk ? { executablePath: path.join(dir, wk, "pw_run.sh") } : {}); }
  else browser = await pw.chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  // (each rate in a page of its own: a fresh load, so every run starts from the same state: the same draws of its
  // seeded randomness, the same models)
  const ctx = await browser.newContext({ viewport: { width: 440, height: 956 } }), errors = [], runs = {};
  for (const hz of [240, ...RATES]) {
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://cdnjs.cloudflare.com/**", (r) => r.fulfill({ path: path.join(ARCADE, "vendor/three.min.js"), contentType: "application/javascript" }));
    await page.goto("http://127.0.0.1:" + srv.address().port + "/" + HTML + "#debug");
    await page.waitForFunction(() => window.__arcade && window.__arcade.GFX && window.__arcade.Assets, null, { timeout: 120000 });
    runs[hz === 240 && runs[240] ? "240b" : hz] = await page.evaluate(perform, { hz, boss: BOSS, every: POPS && hz === 60 });
    await page.close();
  }
  if (runs["240b"]) runs[240.5] = runs["240b"]; // (--rates 240: a second run at 240 Hz against the first: is it repeatable?)
  await browser.close(); srv.close();
  if (runs[240].error) { console.log("FAILED: " + runs[240].error); process.exit(1); }
  const names = ["boss head", "boss chest", "boss left hand", "boss right hand", "boss left foot", "boss body", "wizard head", "wizard hand", "wand tip"];
  console.log(`${HTML}, boss ${BOSS}${runs[240].wizard ? " and the wizard" : ""}: places every 30th of a second over ${(runs[240].samples.length / 30).toFixed(1)} s, against 240 Hz (cm)`);
  let worstAll = 0;
  for (const hz of RATES.map((r) => (r === 240 ? 240.5 : r))) {
    const A = runs[hz].samples, B = runs[240].samples, n = Math.min(A.length, B.length), per = names.map(() => ({ max: 0, sum: 0 }));
    for (let i = 0; i < n; i++) for (let j = 0; j * 3 < Math.min(A[i].length, B[i].length); j++) { const d = Math.hypot(A[i][j * 3] - B[i][j * 3], A[i][j * 3 + 1] - B[i][j * 3 + 1], A[i][j * 3 + 2] - B[i][j * 3 + 2]) * 100; if (d > per[j].max) { per[j].max = d; per[j].at = i / 30; } per[j].sum += d; }
    const max = Math.max(...per.map((p) => p.max)), mean = per.reduce((s, p) => s + p.sum, 0) / (n * per.filter((p) => p.sum > 0 || p.max > 0).length || 1);
    worstAll = Math.max(worstAll, max);
    console.log(`  ${String(hz).padStart(3)} Hz: largest ${max.toFixed(2)} cm, mean ${mean.toFixed(3)} cm   (` + per.map((p, j) => `${names[j]} ${p.max.toFixed(1)}` + (process.env.WHEN ? ` @${(p.at || 0).toFixed(2)}s` : "")).filter((s, j) => per[j].max > 0 || j < 6).join(", ") + ")");
  }
  // --pops: at 60 Hz, each place's largest move in one frame against the moves of the frames round it (a pop: a move
  // far larger than its neighbours', a cut between poses). (The first frames left out: the models start from the pose
  // they were made in until their first update.)
  if (POPS && runs[60] && runs[60].every.length) {
    const F = runs[60].every, worst = [];
    for (let j = 0; j * 3 < F[0].length; j++) {
      const step = F.slice(1).map((b, i) => Math.hypot(b[j * 3] - F[i][j * 3], b[j * 3 + 1] - F[i][j * 3 + 1], b[j * 3 + 2] - F[i][j * 3 + 2]) * 100);
      let best = { ratio: 0 };
      step.forEach((m, i) => { if (i < 3) return; const around = step.slice(Math.max(0, i - 4), i).concat(step.slice(i + 1, i + 5)).sort((x, y) => x - y), med = around[around.length >> 1] || 0; const r = m / Math.max(med, 0.5); if (m > 5 && r > best.ratio) best = { ratio: r, cm: m, med, at: (i + 1) / 60 }; });
      worst.push(names[j] + (best.ratio ? ` ${best.cm.toFixed(1)} cm @${best.at.toFixed(2)}s (x${best.ratio.toFixed(1)} its neighbours)` : " none"));
    }
    console.log("  jumps at 60 Hz (a move over 5 cm in one frame, against the frames round it): " + worst.join("; "));
  }
  console.log(errors.length ? "ERRORS:\n  " + errors.slice(0, 8).join("\n  ") : "no errors");
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
