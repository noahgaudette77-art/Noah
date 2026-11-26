#!/usr/bin/env node
/**
 * Clicks and cuts, found without ears (Phase 6's gate): the page is served and opened, and its own sound code plays
 * every recording into an offline context at 48 kHz (a phone's and a Mac's rate), decoded by the browser itself, dry
 * (no hall reverb, no limiter: what is measured is the recording and how the page plays it). Nothing is heard.
 *
 *   node arcade/tools/audio-check.js [--html index.html] [--out report.md] [--only loops,takes,music]
 *
 * - loops: every take of every looping effect, started by Sound.loop and played twice round. At each join: its spike
 *   (the sharpest bend of the wave there against the sound around it, its 99.9th percentile: under 1 is not heard) and
 *   its level at the first (50 ms steps from 0.15 s before to 0.15 s after, against the loop's own 5th percentile: no dip
 *   of 5 dB).
 * - takes: every take of every effect and announcer line, played once by Sound._cue as the game plays it (its pitch and
 *   level not varied). Its start (the spike over its first 0.25 ms: a step there is a click; with the page's 2 ms fade-in
 *   none can be, and the check stands guard over that fade) and its end: the 20 ms before the build's own 30 ms fade at
 *   least 12 dB under its loudest 20 ms, or else it is cut off while still sounding, unless its loudest moment lies in
 *   its last 0.15 s (the generator stopped it on its height: it keeps it, and the page lets it go just after; listed).
 * - music: every track, played by Sound.play as a visit plays it, through two seams: the spike at each, and its
 *   sharpest bend against the music's own level (a fault: a spike of 1 or more not buried 40 dB under the music), and
 *   the music still playing after the second (the passes keep coming).
 * Exits 1 when anything fails.
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { chromium } = require("playwright");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const HTML = flag("html", "index.html"), OUT = flag("out", ""), ONLY = flag("only", "loops,takes,music").split(",");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ARCADE, decodeURIComponent(q.url.split("?")[0])); if (!f.startsWith(ARCADE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
  const page = await (await browser.newContext({ viewport: { width: 320, height: 480 } })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:" + srv.address().port + "/" + HTML + "#debug");
  await page.waitForFunction(() => window.__arcade && window.__arcade.Sound && window.__arcade.Assets, null, { timeout: 60000 });
  const res = await page.evaluate(async (only) => {
    const A = window.__arcade, S = A.Sound, SR = 48000;
    window.requestAnimationFrame = () => 0; // (the game's frames stop: nothing here is drawn, and drawing in software is slow)
    // every AudioContext the page makes is an offline one, of the length the next test asks for
    let secs = 4;
    window.AudioContext = window.webkitAudioContext = function () { return new OfflineAudioContext(2, Math.ceil(SR * secs), SR); };
    const fresh = (s) => { secs = s; S.ctx = null; S.init(); const c = S.ctx; for (const b of [S.sfxBus, S.voiceBus]) { b.disconnect(); b.gain.value = 1; b.connect(c.destination); } return c; };
    fresh(1);
    for (const name of Object.keys(A.Assets.files.sprites)) await S.loadSprite(name);
    const mono = (buf) => { const l = buf.getChannelData(0), r = buf.getChannelData(1), m = new Float32Array(l.length); for (let i = 0; i < l.length; i++) m[i] = (l[i] + r[i]) / 2; return m; };
    const d2 = (d, i) => Math.abs(d[i + 1] - 2 * d[i] + d[i - 1]);
    const pct = (arr, p) => { if (!arr.length) return 1e-9; const a = Float64Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 1e-9; };
    // the spike at sample k: the sharpest bend within 3 samples of it against the 99.9th percentile of the bends within w
    // of it (leaving out 50 samples either side)
    const spike = (d, k, w) => { let at = 0; for (let i = k - 3; i <= k + 3; i++) if (i > 0 && i < d.length - 1) at = Math.max(at, d2(d, i)); const ref = []; for (let i = Math.max(1, k - w); i < Math.min(d.length - 1, k + w); i++) if (Math.abs(i - k) > 50) ref.push(d2(d, i)); return at / pct(ref, 0.999); };
    const rmsDb = (d, a, n) => { let s = 0; a = Math.max(0, Math.round(a)); n = Math.round(n); for (let i = a; i < a + n && i < d.length; i++) s += d[i] * d[i]; return 10 * Math.log10(s / Math.max(1, n) + 1e-20); };
    const out = { loops: [], takes: [], music: [] }, LOOPS = Object.keys(S.LOOP_SOFT);
    if (only.includes("loops")) for (const name of LOOPS) {
      const takes = S.bank[name];
      if (!takes) continue;
      for (let k = 0; k < takes.length; k++) {
        const q = takes[k], c = fresh(q.dur * 2 + 0.6);
        takes.li = k - 1;
        S.loops = {};
        S.loop("check", name, { vol: 1, fade: 0.001 });
        const d = mono(await c.startRendering()), len = q.dur * SR, w = 0.05 * SR, x = ((S.LOOP_JOIN && S.LOOP_JOIN[name]) || [0, 0, 0])[2];
        const body = []; for (let i = 0; i + w <= len; i += w) body.push(rmsDb(d, i, w));
        const p5 = pct(body, 0.05);
        let dip = 0, sp = 0;
        for (const j of [len, 2 * len]) {
          if (j + 0.2 * SR > d.length) continue;
          sp = Math.max(sp, spike(d, Math.round(j), 0.5 * SR));
          if (j === len) for (let i = j - 0.15 * SR; i + w <= j + (x + 0.15) * SR; i += w) dip = Math.min(dip, rmsDb(d, i, w) - p5); // (the level at the first join: the alarm falls to a faint beat after 3.4 s by design)
        }
        out.loops.push({ name, k, dur: q.dur, spike: sp, dip });
      }
    }
    if (only.includes("takes")) {
      const seen = new Set();
      for (const name of Object.keys(S.bank)) {
        if (LOOPS.includes(name)) continue;
        const takes = S.bank[name];
        for (let k = 0; k < takes.length; k++) {
          const q = takes[k], key = q.buf.length + ":" + q.at.toFixed(5);
          if (seen.has(key)) continue;
          seen.add(key);
          const c = fresh(q.dur + 0.3), rnd = Math.random;
          takes.i = (k - 1 + takes.length) % takes.length;
          Math.random = () => 0;
          try { S._cue(name, 0, { vary: 0, bus: /^vo/.test(name) ? S.voiceBus : undefined }); } finally { Math.random = rnd; }
          const d = mono(await c.startRendering()), n = Math.round(q.dur * SR), w = Math.round(0.02 * SR);
          let top = -200, pk = 0; for (let i = 0; i + w <= n; i += w >> 1) { const v = rmsDb(d, i, w); if (v > top) { top = v; pk = i + w; } }
          let st = 0; for (let i = 1; i < 12; i++) st = Math.max(st, d2(d, i)); // (its first 0.25 ms: a click at a start is there)
          const ref = []; for (let i = 1; i < n - 1; i++) ref.push(d2(d, i));
          out.takes.push({ name, k, dur: q.dur, start: st / pct(ref, 0.999), end: rmsDb(d, n - 0.05 * SR, w) - top, rel: q.rel || 0, height: (n - pk) / SR <= 0.15 });
        }
      }
    }
    if (only.includes("music")) for (const name of Object.keys(A.Assets.files.music)) {
      fresh(1);
      await S.loadTrack(name);
      const rec = S.tracks[name];
      if (!rec) { out.music.push({ name, missing: true }); continue; }
      // played by Sound.play as a visit plays it (this recording lined up for its screen), through its first seam, its
      // passes tapped dry (before the music's tone, duck and level)
      // (through two seams: the render waits a moment after the first, as a running page would, for the pass that
      // ended there to set the one after the next)
      const base = name.replace(/-b$/, ""), L = rec.loop[1] - rec.loop[0], c = fresh(2 * L + 1.5);
      A.Store.settings.music = true;
      S.trackName = base; S.takes[base] = name; S._now = null;
      S.play(base, true);
      if (!S._now || !S._now.g) { out.music.push({ name, missing: true }); continue; }
      S._now.g.disconnect(); S._now.g.connect(c.destination);
      const pause = Math.ceil(((L + 0.5) * SR) / 128) * 128 / SR; // (on a render quantum)
      c.suspend(pause).then(() => new Promise((r) => setTimeout(r, 50))).then(() => c.resume());
      const d = mono(await c.startRendering()), seams = [Math.round(L * SR), Math.round(2 * L * SR)];
      let sp = 0, bend = -200;
      for (const k of seams) {
        let b = 0; for (let i = k - 3; i <= k + 3; i++) b = Math.max(b, d2(d, i));
        const s1 = spike(d, k, 0.5 * SR), b1 = 20 * Math.log10(b + 1e-12) - rmsDb(d, k - 0.25 * SR, 0.5 * SR);
        if (s1 > sp) { sp = s1; bend = b1; }
      }
      // (and the music still playing after the second seam: the third pass came in)
      const after = rmsDb(d, seams[1] + 0.2 * SR, 0.5 * SR) - rmsDb(d, seams[1] - 0.7 * SR, 0.5 * SR);
      out.music.push({ name, end: rec.loop[1], spike: sp, bend, after }); // (bend: the worse seam's sharpest bend, dB against the music's own level over the half second around it)
      S._now = null; S.trackName = null;
      delete S.tracks[name]; if (S._trackLoad) delete S._trackLoad[name];
    }
    return out;
  }, ONLY);
  await browser.close(); srv.close();

  const f2 = (v) => v.toFixed(2), lines = [`# Clicks and cuts: ${HTML} (tools/audio-check.js, ${new Date().toISOString().slice(0, 10)})`, ""];
  let fails = 0;
  const mark = (bad) => { if (bad) fails++; return bad ? "**FAIL**" : "ok"; };
  if (res.loops.length) {
    lines.push("## Loops: every take twice round", "", "| loop | take | length s | spike at the join | level across it (dB under its 5th percentile) | |", "|---|---:|---:|---:|---:|---|");
    for (const r of res.loops) lines.push(`| ${r.name} | ${r.k + 1} | ${f2(r.dur)} | ${f2(r.spike)} | ${r.dip.toFixed(1)} | ${mark(r.spike >= 1 || r.dip < -5)} |`);
    lines.push("");
  }
  if (res.takes.length) {
    const loud = (r) => r.end > -12, bad = res.takes.filter((r) => r.start >= 1 || (loud(r) && !r.height)), high = res.takes.filter((r) => loud(r) && r.height && r.start < 1);
    lines.push("## Takes: every effect and announcer line, played once", "", `${res.takes.length} takes. A spike at the start: ${res.takes.filter((r) => r.start >= 1).length}; cut off while still sounding (the 20 ms before the last 30 ms within 12 dB of the loudest): ${res.takes.filter((r) => loud(r) && !r.height).length}; ending on their height (their loudest moment in their last 0.15 s, kept; let go just after it): ${high.length}. Let go over their last stretch (a release): ${res.takes.filter((r) => r.rel).length}.`, "");
    lines.push("| take | length s | start spike | end (dB under its loudest) | release s | |", "|---|---:|---:|---:|---:|---|");
    for (const r of [...bad, ...high, ...res.takes.filter((r) => r.rel && !bad.includes(r) && !high.includes(r))]) lines.push(`| ${r.name} ${r.k + 1} | ${f2(r.dur)} | ${f2(r.start)} | ${r.end.toFixed(1)} | ${f2(r.rel)} | ${bad.includes(r) ? mark(true) : high.includes(r) ? "ends on its height" : "ok"} |`);
    lines.push("");
  }
  if (res.music.length) {
    // (a seam fails when it stands out from the music's own bends and is not buried 40 dB under the music: the two copies
    // of a loop's start in its file, coded apart, differ by the codec's own noise, some 30 dB under the music)
    lines.push("## Music: every track through two seams (the worse of the two)", "", "| track | loop end s | spike at the seam | its bend against the music (dB) | |", "|---|---:|---:|---:|---|");
    for (const r of res.music) lines.push(r.missing ? `| ${r.name} | | | | **FAIL** (did not load) |` : `| ${r.name} | ${r.end.toFixed(6)} | ${f2(r.spike)} | ${r.bend.toFixed(1)} | ${mark((r.spike >= 1 && r.bend > -40) || r.after < -12)}${r.after < -12 ? " (silent after the second seam)" : ""} |`);
    lines.push("");
  }
  if (errors.length) { lines.push("Errors on the page: " + errors.join("; "), ""); fails++; }
  lines.push(fails ? `**${fails} failed.**` : "**Every join, start, end and seam passes.**");
  const text = lines.join("\n") + "\n";
  if (OUT) fs.writeFileSync(OUT, text);
  console.log(text);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
