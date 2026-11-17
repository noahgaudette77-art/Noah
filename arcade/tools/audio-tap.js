#!/usr/bin/env node
/**
 * What each screen sounds like, without ears: the game is served and opened, its sound started, a screen opened, and
 * each bus of the mix recorded on its own for a few seconds (the recorded music, the synth's music, the effects and
 * their loops, the announcer, and all of them at the master), with a list of what was running (loops, the hall's
 * ambience, the exam's drone, the synth). Each recording is written as raw mono 32-bit float PCM, for
 * `noise-floor.py --pcm`, which measures its noise floor and flags a broadband hiss.
 *
 *   node arcade/tools/audio-tap.js --out dir [--only title,hub] [--secs 8] [--html index.html] [--slow audio/sfx-hub.mp3 --slowms 12000]
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const OUT = flag("out", "audio-tap"), ONLY = flag("only", "title,hub,blaster,racer,boss,memory,exam,guide"), SECS = +flag("secs", 8), HTML = flag("html", "index.html"), SLOW = flag("slow", ""), SLOW_MS = +flag("slowms", 12000), EVAL = flag("eval", "");
// --slow audio/sfx-hub.mp3: that file is held back (--slowms), as a phone on a slow network gets it late
const GO = { title: "go('title')", hub: "go('hub')", blaster: "go('blaster','3')", racer: "go('racer','2')", boss: "go('boss','1')", memory: "go('memory','2')", exam: "go('exam')", guide: "go('guide')" };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = http.createServer(async (q, r) => { const f = path.join(ARCADE, decodeURIComponent(q.url.split("?")[0])); if (SLOW && SLOW.split(",").some((n) => q.url.includes(n))) await new Promise((w) => setTimeout(w, SLOW_MS)); if (!f.startsWith(ARCADE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
  for (const name of ONLY.split(",")) {
    // a small window: the drawing is not what is measured, and a small one leaves the machine to the sound
    const ctx = await browser.newContext({ viewport: { width: 220, height: 478 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:" + srv.address().port + "/" + HTML + "#debug");
    await page.waitForFunction(() => window.__arcade && window.__arcade.Sound, null, { timeout: 60000 });
    await page.evaluate(`window.__arcade.Sound.init(); window.__arcade.${GO[name]}`);
    await page.waitForFunction(() => { const A = window.__arcade; return A.Scenes.cur && !document.getElementById("loading"); }, null, { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(3500); // (the screen's music and ambience come in)
    if (EVAL) await page.evaluate(EVAL).catch((e) => errors.push("eval: " + e.message)); // (--eval: something switched on before the recording, e.g. the exam's drone)
    const rate = await page.evaluate(() => {
      const S = window.__arcade.Sound, c = S.ctx;
      window.__tap = {};
      const mk = (label, node) => {
        if (!node) return;
        const sp = c.createScriptProcessor(4096, 2, 1), chunks = [];
        sp.onaudioprocess = (e) => { const a = e.inputBuffer.getChannelData(0), b = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : a, m = new Float32Array(a.length); for (let i = 0; i < a.length; i++) m[i] = (a[i] + b[i]) * 0.5; chunks.push(m); };
        node.connect(sp); const z = c.createGain(); z.gain.value = 0; sp.connect(z).connect(c.destination);
        window.__tap[label] = { chunks, sp };
      };
      mk("master", S.master); mk("music", S.trackBus); mk("synth", S.musicBus); mk("sfx", S.sfxBus); mk("voice", S.voiceBus);
      return c.sampleRate;
    });
    await page.waitForTimeout(SECS * 1000);
    const r = await page.evaluate(() => {
      const S = window.__arcade.Sound, out = {};
      for (const [label, t] of Object.entries(window.__tap)) {
        t.sp.disconnect();
        const n = t.chunks.reduce((s, c) => s + c.length, 0), all = new Float32Array(n);
        let o = 0; for (const c of t.chunks) { all.set(c, o); o += c.length; }
        const bytes = new Uint8Array(all.buffer); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        out[label] = btoa(bin);
      }
      const running = { track: S.trackName, take: S.takes && S.takes[S.trackName], recording: !!S._now, synthMusic: !!S.timer, loops: Object.keys(S.loops || {}), synthAmbience: !!S._amb, dread: !!S._dread, engine: !!S._eng, state: S.ctx.state };
      return { out, running };
    });
    for (const [label, b64] of Object.entries(r.out)) fs.writeFileSync(path.join(OUT, `${name}-${label}.f32`), Buffer.from(b64, "base64"));
    console.log(`${name}: rate ${rate}, running ${JSON.stringify(r.running)}${errors.length ? "  errors: " + errors.slice(0, 2).join(" | ") : ""}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
