#!/usr/bin/env node
/**
 * INR Arcade regression test: proves a visual change left the game rules alone.
 *
 *   node scripts/arcade-regression.js --build arcade/backup/index.before-visual-upgrade.html --out /tmp/base.json
 *   node scripts/arcade-regression.js --compare /tmp/base.json        (plays arcade/index.html)
 *
 * It plays Boss Rush, Nest Egg Run and Risk Blaster with a fixed script of right
 * answers, wrong answers and timeouts, on a virtual clock (every frame is exactly
 * 1/60 s) and with seeded question picking, then records after every answer:
 * boss HP, hearts, score, streak, nest egg, crashes, shields, wave, the frame each
 * question appeared on, and at the end the results screen and the saved progress.
 * Two builds with the same rules produce identical traces, whatever they draw.
 *
 * Needs Playwright with Chromium (software WebGL is fine).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const BUILD = path.resolve(arg("build", path.join(ROOT, "arcade/index.html")));
const OUT = arg("out", null);
const COMPARE = arg("compare", null);
const ONLY = arg("only", null);
const VERBOSE = process.argv.includes("--verbose");

// R = right, W = wrong, T = let the clock run out, N = (racer) choose no lane.
// The number is how far into the question's clock the answer is given (0..1).
const R = (at = 0.03) => ({ k: "R", at });
const W = (at = 0.1) => ({ k: "W", at });
const T = () => ({ k: "T" });
const PLAYS = [
  // the final boss, won: the first right answer takes it from 200 to 180
  { id: "boss-final-win", game: "boss", stage: "all", script: [R(0.02), R(0.33), W(0.1), R(0.02), T(), R(0.72), R(0.02)], then: R(0.04) },
  // a chapter boss, lost on hearts
  { id: "boss-ch3-lose", game: "boss", stage: "3", script: [R(0.02), W(0.05), W(0.52), T()], then: W(0.1) },
  // a chapter boss, won without a miss (three stars)
  { id: "boss-ch7-win", game: "boss", stage: "7", script: [R(0.02), R(0.4)], then: R(0.03) },
  // a full career in Nest Egg Run with a paid claim, two crashes and a missed lane
  { id: "racer-career", game: "racer", stage: "2", script: [R(0.05), R(0.05), R(0.3), R(0.05), R(0.05), W(0.05), W(0.2), { k: "N" }, R(0.05), R(0.6)], then: R(0.05) },
  // Nest Egg Run ended early by three crashes
  { id: "racer-crash", game: "racer", stage: "5", script: [R(0.05), W(0.05), W(0.05), R(0.05)], then: W(0.05) },
  // Risk Blaster into wave 2, then out of shields
  // Memory Bank: got it, missed (comes back), easy; every grade moves a card's box
  { id: "memory", game: "memory", stage: "3", cards: ["good", "good", "again", "easy", "good", "again", "good", "easy"], then: "good" },
  // the Final Exam: three right in four, some left blank, then submit. No hint may show before that.
  { id: "exam", game: "exam", stage: "all" },
  { id: "blaster", game: "blaster", stage: "2", script: [R(0.05), R(0.4), W(0.1), R(0.05), R(0.05), R(0.7), R(0.05), R(0.05), R(0.05), R(0.05), R(0.05), R(0.05), T(), R(0.05)], then: W(0.08) },
];

// Runs in the page before anything else: a virtual clock and seeded randomness.
function inPage() {
  let now = 5000;
  const timers = new Map();
  let tid = 1, rafs = [], rid = 1;
  const hist = [now]; // the clock at every frame so far
  let back = 0; // frames the wall clock is held back by (see wallBack)
  performance.now = () => now;
  Date.now = () => 1767268800000 + hist[hist.length - 1 - back]; // 2026-01-01 12:00 UTC + virtual ms
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.set(id, { t: now + Math.max(0, +ms || 0), fn, a }); return id; };
  window.clearTimeout = (id) => { timers.delete(id); };
  window.setInterval = (fn, ms, ...a) => { const id = tid++; timers.set(id, { t: now + (+ms || 0), fn, a, every: Math.max(1, +ms || 0) }); return id; };
  window.clearInterval = window.clearTimeout;
  window.requestAnimationFrame = (fn) => { const id = rid++; rafs.push({ id, fn }); return id; };
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter((r) => r.id !== id); };
  // two streams: one for whatever the scenery does, one re-seeded for each question
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const visual = mulberry(12345);
  let logic = null;
  Math.random = () => (logic ? logic() : visual());
  const T = (window.__t = { frame: 0, errors: [], trace: null, done: false, logicSeed(n) { logic = mulberry(0x9e3779b1 ^ (n * 2654435761)); } });
  // Hold the wall clock (Date.now) still for one frame of a stretch that is show, not
  // rule: what is saved afterwards then carries exactly the timestamps it always did
  // (it reads the clock's own earlier values, so not even rounding differs). Frames still run.
  T.wallBack = () => { back++; };
  window.addEventListener("error", (e) => T.errors.push(String(e.message)));
  window.__tick = (n) => {
    for (let i = 0; i < n && !T.done; i++) {
      now += 1000 / 60;
      hist.push(now);
      // timers due this frame, in order; ones they set in turn wait for the next frame
      const due = [...timers].filter(([, t]) => t.t <= now).sort((a, b) => a[1].t - b[1].t || a[0] - b[0]);
      for (const [id, t] of due) {
        if (!timers.has(id)) continue;
        if (t.every) t.t = Math.max(now, t.t + t.every); else timers.delete(id);
        try { t.fn(...t.a); } catch (e) { T.errors.push("timer: " + e.message); }
      }
      const q = rafs;
      rafs = [];
      for (const r of q) { try { r.fn(now); } catch (e) { T.errors.push("frame: " + e.message); } }
      T.frame++;
      if (T.ctl) { try { T.ctl(); } catch (e) { T.errors.push("driver: " + e.message); T.done = true; } }
      logic = null; // the scenery's stream again until the next question is picked
    }
    return T.done;
  };
}

// Runs in the page once the arcade has booted: plays one scripted game.
function startPlay(play) {
  const A = window.__arcade, T = window.__t;
  const trace = (T.trace = { id: play.id, rounds: [], end: null });
  let n = 0, f0 = T.frame, cur = null, seen = null, picks = 0, overAt = 0, ending = 0, pending = false;
  A.GFX.lockQuality();
  // the rules never read a pixel back: skip the drawing itself so thousands of
  // frames run in seconds (scene updates, tweens and effects code all still run)
  const rr = A.GFX.renderer;
  if (rr) { rr.render = () => {}; rr.compile = () => {}; }
  // decks are drawn when a game is built: give that moment its own seed too
  const cover = A.UI.cover.bind(A.UI);
  A.UI.cover = (fn) => cover(() => { T.logicSeed(7000 + PLAYS_INDEX); fn(); });
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  A.go(play.game, play.stage);
  const snap = (s) => {
    const o = {};
    for (const k of ["hp", "maxHp", "hearts", "score", "egg", "peak", "crashes", "insurance", "year", "shields", "wave", "combo", "mult", "kills"]) if (typeof s[k] === "number") o[k] = Math.round(s[k] * 1000) / 1000;
    o.streak = s.run.streak; o.answered = s.run.answered; o.correct = s.run.correct; o.best = s.run.bestStreak;
    return o;
  };
  T.ctl = () => {
    const s = A.Scenes.cur;
    const skip = document.querySelector(".dlg-wrap [data-act=skip]");
    if (skip) { skip.click(); return; }
    const name = s && s.constructor.name;
    const hi = document.querySelector(".modal .dialog [data-act=ok]"); // "new high score": keep the default initials
    // the exam's ending has just finished: one tick's grace, so what follows is timed as it was when the results came at once
    if (pending && (hi || document.querySelector(".screen .res-head"))) { pending = false; ending++; T.ending = ending; return; }
    if (hi) { hi.click(); return; }
    const res = document.querySelector(".screen .res-head");
    if (res) {
      if (!overAt) overAt = T.frame;
      if (T.frame - overAt < 90) return; // let the tallies finish counting up
      const st = A.Store.state;
      const boxes = {};
      for (const id in st.items) boxes[st.items[id][0]] = (boxes[st.items[id][0]] || 0) + 1;
      trace.end = {
        // The Final Exam's results follow the boss's ending (its death, or its last stand).
        // That ending is show, not rule, so its length is taken off: the results must
        // then land on exactly the frame they always did.
        frame: overAt - f0 - ending,
        results: res.closest(".screen").innerText.replace(/\s+/g, " ").trim(),
        stats: st.stats, boxes, items: Object.keys(st.items).length,
        scores: Object.fromEntries(Object.entries(st.scores || {}).map(([g, l]) => [g, l.map((e) => { const c = Object.assign({}, e); delete c.t; return c; })])),
        boss: st.boss || null, ach: Object.keys(st.ach || {}).sort(),
        // every item's box, count and timestamp (the spaced-repetition state), and all saved progress but the settings
        itemsHash: hash(JSON.stringify(Object.keys(st.items).sort().map((k) => [k, st.items[k]]))),
        savedHash: hash(JSON.stringify(Object.keys(st).filter((k) => k !== "settings").sort().map((k) => [k, st[k]]))),
      };
      if (play.dump) T.dump = JSON.stringify(Object.keys(st).filter((k) => k !== "settings" && k !== "items").sort().map((k) => [k, st[k]]), null, 1); // REG_DUMP: what was saved, to look at
      T.done = true;
      return;
    }
    if (name === "MemoryGame") {
      if (s.state === "front") { cur = { n, id: s.queue[0], left: s.queue.length }; s.flip(); return; }
      if (s.state === "back") {
        const kind = play.cards[n] || play.then;
        n++;
        s.grade(kind);
        Object.assign(cur, { kind, frame: T.frame - f0, after: { done: s.done, deposits: s.deposits, left: s.queue.length, missed: s.missed.length, item: (A.Store.state.items[cur.id] || []).join("/") } });
        trace.rounds.push(cur);
      }
      return;
    }
    if (name === "ExamGame") {
      if (s.state === "over") { ending++; T.ending = ending; T.wallBack(); return; } // the ending is playing (it runs in full here)
      if (s.state !== "ask") return;
      if (!trace.exam) trace.exam = { n: s.rounds.length, limit: s.limit, hintsBeforeSubmit: 0, did: {} };
      const i = s.i, r = s.rounds[i];
      if (trace.exam.did[i] === undefined) {
        const k = i % 7 === 6 ? -1 : i % 4 === 3 ? (r.correct + 1) % r.n : r.correct;
        if (k >= 0) s.pick(k);
        trace.exam.did[i] = k;
        trace.rounds.push({ n: i, q: r.q.id, order: r.order.join(""), picked: k, frame: T.frame - f0 });
        return;
      }
      // the exam must not say whether an answer is right until it is submitted
      trace.exam.hintsBeforeSubmit += document.querySelectorAll(".answers .ans.good, .answers .ans.bad, .answers.locked, .sheet").length;
      if (i < s.rounds.length - 1) s.go(1);
      else {
        trace.exam.did = Object.keys(trace.exam.did).length;
        s.submit();
        // the mark is worked out and saved by now. If an ending plays before the results, hold the wall clock through it.
        if (!document.querySelector(".modal .dialog, .screen .res-head")) { pending = true; T.wallBack(); }
      }
      return;
    }
    if (!s || !s.run || !s.picker) return;
    if (!s.picker.__w) {
      const next = s.picker.next.bind(s.picker);
      s.picker.next = () => { T.logicSeed(1000 * PLAYS_INDEX + picks++); return next(); };
      s.picker.__w = true;
    }
    if (s.quiz && s.quiz.sheet) {
      if (cur && !cur.after) { cur.after = snap(s); cur.sheetFrame = T.frame - f0; cur.title = (s.quiz.sheet.querySelector("h3, .title, b") || s.quiz.sheet).textContent.trim().slice(0, 60); }
      s.quiz.next();
      return;
    }
    if (s.state !== "ask" || !s.round) return;
    if (seen !== s.round) {
      seen = s.round;
      const step = play.script[n] || play.then;
      cur = { n: n++, q: s.round.q.id, order: s.round.order.join(""), T: Math.round(s.T * 1000) / 1000, askFrame: T.frame - f0, step: step.k + (step.at === undefined ? "" : "@" + step.at), before: snap(s), acted: false };
      cur.stepObj = step;
      trace.rounds.push(cur);
    }
    if (cur.acted) return;
    const step = cur.stepObj;
    const frac = name === "BossGame" ? s.charge / s.T : name === "RacerGame" ? s.gp : 1 - s.tLeft / s.T;
    if (step.k === "T" || step.k === "N") { cur.acted = true; return; }
    if (frac < step.at) return;
    cur.acted = true;
    cur.pickFrame = T.frame - f0;
    cur.frac = Math.round(frac * 1e4) / 1e4;
    s.pick(step.k === "R" ? s.round.correct : (s.round.correct + 1) % s.round.n);
  };
}

function diff(a, b, at, out) {
  if (out.length > 40) return;
  if (typeof a !== typeof b || (a === null) !== (b === null)) return void out.push(`${at}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  if (a && typeof a === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], at + "." + k, out);
  } else if (a !== b) out.push(`${at}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
}

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const result = { build: path.relative(ROOT, BUILD), plays: [] };
  const consoleErrors = [];
  for (let pi = 0; pi < PLAYS.length; pi++) {
    const play = PLAYS[pi];
    if (ONLY && !play.id.includes(ONLY)) continue;
    const ctx = await browser.newContext({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => consoleErrors.push(play.id + ": " + e.message));
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(play.id + ": " + m.text().slice(0, 300)); });
    await page.route("https://cdnjs.cloudflare.com/**", (r) => r.fulfill({ path: path.join(ROOT, "arcade/vendor/three.min.js"), contentType: "application/javascript" }));
    await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ body: "", contentType: "text/css" }));
    await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
    await page.addInitScript(inPage);
    await page.goto("file://" + BUILD + "#debug");
    // boot: the title screen appears once fonts settle and the screen is measured
    for (let i = 0; i < 200; i++) {
      await page.evaluate(() => window.__tick(10));
      if (await page.evaluate(() => !!(window.__arcade && window.__arcade.Scenes.cur))) break;
      await page.waitForTimeout(20);
    }
    await page.evaluate(`(${startPlay.toString().replace(/PLAYS_INDEX/g, String(pi))})(${JSON.stringify(Object.assign({ dump: !!process.env.REG_DUMP }, play))})`);
    const t0 = Date.now();
    let done = false;
    let lastLog = Date.now();
    while (!done && Date.now() - t0 < 600000) {
      done = await page.evaluate(() => window.__tick(120));
      if (VERBOSE && Date.now() - lastLog > 4000) {
        lastLog = Date.now();
        console.log("  …", await page.evaluate(() => { const s = window.__arcade.Scenes.cur; return JSON.stringify({ frame: window.__t.frame, scene: s && s.constructor.name, state: s && s.state, rounds: window.__t.trace.rounds.length, sheet: !!(s && s.quiz && s.quiz.sheet), err: window.__t.errors.slice(0, 2) }); }));
      }
    }
    const t = await page.evaluate(() => ({ trace: window.__t.trace, errors: window.__t.errors, frame: window.__t.frame, ending: window.__t.ending || 0 }));
    if (t.ending) console.log(`  the exam's ending ran for ${t.ending} frames after submit (${(t.ending / 60).toFixed(1)} s) before the results; not part of the comparison`);
    for (const r of t.trace.rounds) { delete r.stepObj; delete r.acted; }
    if (process.env.REG_DUMP) fs.writeFileSync(process.env.REG_DUMP + "." + play.id + ".json", await page.evaluate(() => window.__t.dump || ""));
    if (t.trace.exam) { console.log(`  exam: ${t.trace.exam.n} questions, hints shown before submit: ${t.trace.exam.hintsBeforeSubmit}`); if (t.trace.exam.hintsBeforeSubmit) t.errors.push("the exam showed a hint before submit"); }
    t.trace.errors = t.errors;
    t.trace.finished = done;
    result.plays.push(t.trace);
    const last = t.trace.rounds[t.trace.rounds.length - 1];
    console.log(`${play.id}: ${t.trace.rounds.length} questions, ${done ? "finished" : "DID NOT FINISH"}${t.errors.length ? ", ERRORS " + t.errors.slice(0, 2).join(" | ") : ""}`);
    if (play.id === "boss-final-win") console.log("  final boss HP after each answer:", t.trace.rounds.map((r) => `${r.step}:${r.before.hp}>${r.after ? r.after.hp : "?"}`).join("  "));
    if (last && last.after) console.log("  last answer:", JSON.stringify(last.after));
    await ctx.close();
  }
  await browser.close();
  result.consoleErrors = consoleErrors;
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  let bad = consoleErrors.length > 0 || result.plays.some((p) => !p.finished || p.errors.length);
  console.log(consoleErrors.length ? "CONSOLE ERRORS:\n  " + [...new Set(consoleErrors)].slice(0, 6).join("\n  ") : "no console errors");
  if (COMPARE) {
    const base = JSON.parse(fs.readFileSync(COMPARE, "utf8"));
    const out = [];
    for (const p of result.plays) {
      const b = base.plays.find((x) => x.id === p.id);
      if (!b) { out.push(p.id + ": not in the baseline"); continue; }
      diff(b, p, p.id, out);
    }
    if (out.length) { bad = true; console.log("DIFFERENT FROM BASELINE (" + base.build + "):\n  " + out.join("\n  ")); }
    else console.log(`IDENTICAL to baseline ${base.build}: every HP, heart, score, streak, nest egg, shield, wave, card grade, exam mark, saved item, question and frame matches (${result.plays.reduce((a, p) => a + p.rounds.length, 0)} answers in ${result.plays.length} games)`);
  }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error("FAILED", e); process.exit(2); });
