#!/usr/bin/env node
/**
 * The sound test page passes (Phase 6's gate). sound-test.html is served and every recording on it is played as the
 * owner would tap it, each on a fresh load of the page, into an offline context at 48 kHz: the page's own code (its
 * joins, its ends, its music pass after pass), decoded by the browser itself. Nothing is heard. Each is measured as
 * tools/audio-check.js measures the game:
 * - a loop, twice round: the spike at each join (the sharpest bend there against the 99.9th percentile of the bends
 *   around it; under 1 is not heard);
 * - a track, through its first seam: a spike under 1, or a bend buried 40 dB under the music;
 * - a take, once: no step at its start (its first 0.25 ms), and not still sounding (within 12 dB of its loudest) as
 *   the build's 30 ms fade begins.
 * Then the page is loaded once more and every button on it tapped in real time, the loops and the music started and
 * stopped again: no error on the page.
 *
 *   node arcade/tools/sound-test-check.js [--out report.md] [--only loops,music,takes,taps]
 * Exits 1 when anything fails.
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const OUT = flag("out", ""), ONLY = flag("only", "loops,music,takes,taps").split(",");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mp3": "audio/mpeg", ".json": "application/json" };
const SR = 48000;

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ARCADE, decodeURIComponent(q.url.split("?")[0])); if (!f.startsWith(ARCADE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  const url = "http://127.0.0.1:" + srv.address().port + "/sound-test.html#debug";
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const bctx = await browser.newContext();
  const errors = [], audio = JSON.parse(fs.readFileSync(path.join(ARCADE, "assets", "audio", "audio.json"), "utf8"));
  const ready = (page) => page.waitForFunction(() => document.querySelectorAll("#list button").length > 50, null, { timeout: 60000 });
  // the page's buttons, and what each plays (its label: "<set> · <cue> · take <n>" or "Music · <track>")
  const p0 = await bctx.newPage();
  p0.on("pageerror", (e) => errors.push("the list: " + e.message));
  await p0.goto(url); await ready(p0);
  const buttons = await p0.evaluate(() => [...document.querySelectorAll("#list button")].map((b, i) => ({ i, label: b.dataset.label || "" })));
  await p0.close();
  const what = (label) => {
    let m = label.match(/^Music · (.+)$/);
    if (m && audio.music[m[1]]) { const t = audio.music[m[1]]; return { kind: "music", L: t.loop[1] - t.loop[0] }; }
    m = label.match(/^.+ · ([^·]+) · take (\d+)$/);
    if (!m) return null;
    for (const sp of Object.values(audio.sprites)) { const t = sp.cues[m[1].trim()]; if (t) return { kind: /^(engine_|alarm|charge_hum|boost_flame|hub_hum)/.test(m[1].trim()) ? "loops" : "takes", dur: t[+m[2] - 1][1] }; }
    return null;
  };
  const res = [];
  for (const b of buttons) {
    const w = what(b.label);
    if (!w || !ONLY.includes(w.kind)) continue;
    const secs = w.kind === "music" ? w.L + 1.5 : w.kind === "loops" ? w.dur * 2 + 0.6 : w.dur + 0.3;
    const page = await bctx.newPage();
    page.on("pageerror", (e) => errors.push(b.label + ": " + e.message));
    await page.addInitScript((secs) => {
      // the page's AudioContext an offline one, of the length this recording needs: it renders once told what to play
      window.AudioContext = window.webkitAudioContext = function () { const c = new OfflineAudioContext(2, Math.ceil(48000 * secs), 48000); c.resume = () => Promise.resolve(); window.__ctx = c; return c; };
    }, secs);
    await page.goto(url); await ready(page);
    await page.click("#start");
    await page.evaluate((i) => document.querySelectorAll("#list button")[i].click(), b.i);
    const started = await page.waitForFunction(() => /^Playing /.test(document.getElementById("status").textContent), null, { timeout: 30000 }).then(() => true, () => false);
    if (!started) { errors.push(b.label + ": never started"); await page.close(); continue; }
    const r = await page.evaluate(async (w) => {
      const SR = 48000, buf = await window.__ctx.startRendering(), l = buf.getChannelData(0), rr = buf.getChannelData(1), d = new Float32Array(l.length);
      for (let i = 0; i < l.length; i++) d[i] = (l[i] + rr[i]) / 2;
      const d2 = (i) => Math.abs(d[i + 1] - 2 * d[i] + d[i - 1]);
      const pct = (arr, p) => { if (!arr.length) return 1e-9; const a = Float64Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 1e-9; };
      const spike = (k, wd) => { let at = 0; for (let i = k - 3; i <= k + 3; i++) if (i > 0 && i < d.length - 1) at = Math.max(at, d2(i)); const ref = []; for (let i = Math.max(1, k - wd); i < Math.min(d.length - 1, k + wd); i++) if (Math.abs(i - k) > 50) ref.push(d2(i)); return at / pct(ref, 0.999); };
      const rmsDb = (a, n) => { let s = 0; a = Math.max(0, Math.round(a)); n = Math.round(n); for (let i = a; i < a + n && i < d.length; i++) s += d[i] * d[i]; return 10 * Math.log10(s / Math.max(1, n) + 1e-20); };
      if (w.kind === "takes") {
        const n = Math.round(w.dur * SR), wn = Math.round(0.02 * SR);
        let top = -200; for (let i = 0; i + wn <= n; i += wn >> 1) top = Math.max(top, rmsDb(i, wn));
        let st = 0; for (let i = 1; i < 12; i++) st = Math.max(st, d2(i));
        const ref = []; for (let i = 1; i < n - 1; i++) ref.push(d2(i));
        return { start: st / pct(ref, 0.999), end: rmsDb(n - 0.05 * SR, wn) - top };
      }
      if (w.kind === "loops") { // its join where the page made it (or its whole take, for a loop with none)
        const j = [...window.__soundTest.joined.values()][0], len = (j ? j[1] - j[0] : w.dur) * SR;
        return { len: len / SR, spike: Math.max(spike(Math.round(len), 0.5 * SR), len * 2 + 0.2 * SR < d.length ? spike(Math.round(2 * len), 0.5 * SR) : 0) };
      }
      const k = Math.round(w.L * SR);
      let bend = 0; for (let i = k - 3; i <= k + 3; i++) bend = Math.max(bend, d2(i));
      return { spike: spike(k, 0.5 * SR), bend: 20 * Math.log10(bend + 1e-12) - rmsDb(k - 0.25 * SR, 0.5 * SR) };
    }, w);
    res.push({ label: b.label, ...w, ...r });
    await page.close();
  }
  // every button tapped in real time on one page, the loops and the music started and stopped again
  let tapped = 0;
  if (ONLY.includes("taps")) {
    const page = await bctx.newPage();
    page.on("pageerror", (e) => errors.push("tapping: " + e.message));
    await page.goto(url); await ready(page);
    await page.click("#start");
    tapped = await page.evaluate(async () => {
      const bs = [...document.querySelectorAll("#list button")], wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (const b of bs) { // (a take plays once and ends; a loop, a track or a made sound plays until tapped again)
        b.click(); await wait(30);
        if (b.classList.contains("playing") && (b.textContent.includes("play / stop") || b.closest(".row").querySelector(".tag.loop"))) { await wait(60); b.click(); }
      }
      document.getElementById("stopAll").click();
      await wait(300);
      return bs.length;
    });
    await page.close();
  }
  await browser.close(); srv.close();

  const f2 = (v) => v.toFixed(2), lines = [`# The sound test page (tools/sound-test-check.js, ${new Date().toISOString().slice(0, 10)})`, ""];
  let fails = 0;
  const bad = (r) => (r.kind === "loops" ? r.spike >= 1 : r.kind === "music" ? r.spike >= 1 && r.bend > -40 : r.start >= 1 || r.end > -12);
  for (const kind of ["loops", "music", "takes"]) {
    const rows = res.filter((r) => r.kind === kind);
    if (!rows.length) continue;
    const nb = rows.filter(bad).length;
    fails += nb;
    lines.push(`## ${kind === "loops" ? "Loops, twice round" : kind === "music" ? "Music, through its first seam" : "Takes, once"}: ${rows.length} played, ${nb} failed`, "");
    if (kind === "loops") { lines.push("| button | loop s | spike at its joins | |", "|---|---:|---:|---|"); for (const r of rows) lines.push(`| ${r.label} | ${f2(r.len)} | ${f2(r.spike)} | ${bad(r) ? "**FAIL**" : "ok"} |`); }
    if (kind === "music") { lines.push("| button | spike at the seam | its bend against the music (dB) | |", "|---|---:|---:|---|"); for (const r of rows) lines.push(`| ${r.label} | ${f2(r.spike)} | ${r.bend.toFixed(1)} | ${bad(r) ? "**FAIL**" : "ok"} |`); }
    if (kind === "takes") {
      const worst = (k) => rows.reduce((m, r) => Math.max(m, r[k]), -999);
      lines.push(`The largest spike at a start ${f2(worst("start"))}; the loudest end ${worst("end").toFixed(1)} dB under its take's loudest.`);
      for (const r of rows.filter(bad)) lines.push(`- **FAIL** ${r.label}: start ${f2(r.start)}, end ${r.end.toFixed(1)} dB`);
    }
    lines.push("");
  }
  if (ONLY.includes("taps")) lines.push(`## Every button tapped in real time: ${tapped} buttons`, "");
  if (errors.length) { fails += errors.length; lines.push("Errors: " + errors.join("; "), ""); }
  lines.push(fails ? `**${fails} failed.**` : "**The sound test page passes: every loop, track and take, and every button tapped without an error.**");
  const text = lines.join("\n") + "\n";
  if (OUT) fs.writeFileSync(OUT, text);
  console.log(text);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
