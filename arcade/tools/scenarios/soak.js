// The soak (Phase 7's gate): half an hour of play on the Mac tier, on the virtual clock. Round after round: the title
// hall, the hall, each game played (questions answered, right and wrong, the explanation read, a pause, the game over
// or the deck's end and its results, played again while its time lasts), the guide, stats and Setup. Held at the same
// moments of every round (back in the hall after each game, the garbage collected): the JavaScript heap, textures,
// geometries and programs on the graphics chip, the page's elements, the timers waiting; and the time a frame takes
// here (its update alone, and drawn): a leak grows from round to round, a slowdown shows as the same screen costing
// more in a later round. (This machine draws in software: its times compare one round with another, not a device's.)
//
//   node arcade/tools/capture.js arcade/tools/scenarios/soak.js --size 1470x830 --dpr 2 --out <dir>
//
// MINUTES=30 (game time, split over ROUNDS=3: the first loads what is kept for good, the others are compared). Writes
// soak.json and soak.md.
// (the Mac's richer tier, 2026-11-25) With GLMEM=1 (capture.js adds tools/glmem.js to the page): what the page holds on
// the graphics chip, in megabytes, at each moment. In Chromium: the browser's own memory at each moment, every one of
// its processes (the page's, the graphics process's, which draws in software here and so holds the chip's pictures in
// memory, and the rest), each counted for its share of what they hold together (Linux's Pss). Each game is held once
// more at the end of its play, before the hall (its "in" moment: what it holds while played, compared apart, as a
// game's own end varies: a question, the results).
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const MIN = +(process.env.MINUTES || 30), ROUNDS = +(process.env.ROUNDS || 3);
  const cdp = await cap.page.context().newCDPSession(cap.page).catch(() => null);
  const bcdp = cap.page.context().browser().newBrowserCDPSession ? await cap.page.context().browser().newBrowserCDPSession().catch(() => null) : null;
  const procMem = async () => {
    const info = bcdp && (await bcdp.send("SystemInfo.getProcessInfo").catch(() => null));
    if (!info) return { procMB: null, gpuProcMB: null };
    let all = 0, gpu = 0, page = 0, pageShm = 0;
    for (const p of info.processInfo) {
      let kb = 0, shm = 0;
      try { const t = fs.readFileSync("/proc/" + p.id + "/smaps_rollup", "utf8"), m = /^Pss:\s+(\d+)/m.exec(t), sh = /^Pss_Shmem:\s+(\d+)/m.exec(t); kb = m ? +m[1] : 0; shm = sh ? +sh[1] : 0; } catch (e) { /* not on Linux, or gone */ }
      all += kb; if (p.type === "GPU") gpu += kb; if (p.type === "renderer") { page += kb; pageShm += shm; }
    }
    // (the page's own process apart, and of it what is shared memory: Chromium's discardable caches, decoded pictures
    // among them, live there and are given back when the machine runs short)
    return all ? { procMB: Math.round(all / 1024), gpuProcMB: Math.round(gpu / 1024), pageProcMB: Math.round(page / 1024), pageShmMB: Math.round(pageShm / 1024) } : { procMB: null, gpuProcMB: null };
  };
  const waitReal = async (js, ms = 120000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  // each round's share of game time, by screen (seconds; scaled so the rounds add up to MINUTES)
  const PLAN = [["title", 60], ["hub", 20], ["blaster", 150], ["hub", 10], ["racer", 150], ["hub", 10], ["boss", 150], ["hub", 10], ["memory", 100], ["hub", 10], ["exam", 150], ["hub", 10], ["guide", 30], ["stats", 10], ["setup", 10], ["hub", 10]];
  const k = (MIN * 60) / ROUNDS / PLAN.reduce((a, p) => a + p[1], 0);
  let clock = 0; // game seconds so far
  const step = async (frames) => { await cap.fast(frames); clock += frames / 60; };
  const rows = [];
  const held = async (round, at) => {
    if (cdp) await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
    const u = cdp ? await cdp.send("Runtime.getHeapUsage").catch(() => null) : null;
    const g = await cap.eval(() => {
      const A = window.__arcade, r = A.GFX.renderer, m = r.info.memory;
      return { textures: m.textures, geometries: m.geometries, programs: (r.info.programs || []).length, nodes: document.getElementsByTagName("*").length, timers: window.__timers ? window.__timers() : null, tier: A.GFX.tier, scale: +(r.domElement.width / (innerWidth * devicePixelRatio)).toFixed(3) };
    });
    // the time a frame takes here: 120 updated alone, 2 drawn (the median of what the screen costs now)
    let t0 = Date.now(); await cap.fast(120); const upd = (Date.now() - t0) / 120; clock += 2;
    // (drawn and then read back, one pixel: software drawing runs behind the script, and the read waits for it; with it
    // what a drawn frame asks of the chip: draw calls and triangles, which no machine's speed changes)
    t0 = Date.now();
    const work = await cap.eval(() => {
      const r = window.__arcade.GFX.renderer, gl = r.getContext();
      window.__tick(1, true);
      r.info.autoReset = false; r.info.reset(); // (the whole frame's draws, every pass: three.js counts one render call's by itself)
      window.__tick(1, true);
      const o = { calls: r.info.render.calls, tris: r.info.render.triangles };
      r.info.autoReset = true;
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      return o;
    });
    const drw = (Date.now() - t0) / 2; clock += 2 / 60;
    const gm = await cap.eval(() => {
      const M = window.__mem; if (!M) return { glMB: null, texMB: null };
      const sum = (m) => { let b = 0; for (const v of m.values()) b += typeof v === "number" ? v : Object.values(v).reduce((a, x) => a + x, 0); return b; };
      const t = sum(M.tex); return { glMB: Math.round((t + sum(M.rb) + sum(M.buf)) / 1048576), texMB: Math.round(t / 1048576) };
    });
    const row = Object.assign({ round, at, min: +(clock / 60).toFixed(1), heapMB: u ? +(u.usedSize / 1048576).toFixed(2) : null }, g, { updMs: +upd.toFixed(2), drawMs: Math.round(drw) }, work, gm, await procMem());
    rows.push(row);
    console.log(`r${round} ${at.padEnd(10)} ${row.min} min: heap ${row.heapMB} MB, ${row.textures} tex, ${row.geometries} geo, ${row.programs} prog, ${row.nodes} nodes, timers ${row.timers}; frame ${row.updMs} ms updated, ${row.drawMs} ms drawn (${row.calls} draws, ${row.tris} tris); scale ${row.scale}${row.glMB !== null ? "; graphics " + row.glMB + " MB" : ""}${row.procMB !== null ? "; browser " + row.procMB + " MB (graphics process " + row.gpuProcMB + ", the page's " + row.pageProcMB + " of it shared " + row.pageShmMB + ")" : ""}`);
    fs.writeFileSync(path.join(cap.out, "soak.json"), JSON.stringify(rows, null, 1));
  };
  const state = () => cap.eval(() => {
    const A = window.__arcade, s = A.Scenes.cur, m = A.UI.modal, scr = document.querySelector("#ui > .screen");
    return { st: s && s.state || null, ask: !!(s && s.state === "ask" && s.round && !(s.quiz && s.quiz.sheet)), sheet: !!(s && s.quiz && s.quiz.sheet), results: !!(scr && scr.classList.contains("scr-results")), modal: m ? (m.el.querySelector("h2") || {}).textContent || "modal" : null, game: !!(scr && scr.classList.contains("scr-game")) };
  });
  let answers = 0;
  const play = async (game, secs, round) => {
    const stage = { blaster: "3", racer: "2", boss: "1", memory: "3" }[game];
    const start = async () => {
      if (game === "exam") { await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); }); await cap.go("exam", "all"); }
      else await cap.go(game, stage);
    };
    await start();
    const end = clock + secs;
    let paused = false;
    while (clock < end) {
      const s = await state();
      if (s.results) { if (clock + 20 < end) { await start(); continue; } break; } // (played again while its time lasts)
      if (s.modal === "PAUSED") { await cap.eval(() => { const A = window.__arcade; A.UI.closeModal(); A.Scenes.cur.resume(); }); continue; }
      if (s.modal) { await cap.eval(() => { const y = document.querySelector("body > .modal [data-act=yes]") || document.querySelector("body > .modal .btn, .dlg-wrap [data-act=skip]"); if (y) y.click(); }); await step(10); continue; }
      if (game === "memory" && s.game) {
        if (s.st === "front") await cap.eval(() => window.__arcade.Scenes.cur.flip());
        else if (s.st === "back") await cap.eval((n) => window.__arcade.Scenes.cur.grade(n % 4 ? "good" : "again"), answers++);
        await step(90); continue;
      }
      if (game === "exam" && s.game && s.st !== "over") {
        const last = await cap.eval((n) => { const g = window.__arcade.Scenes.cur; if (g.answers[g.i] < 0) g.pick(n % 3 ? g.rounds[g.i].correct : (g.rounds[g.i].correct + 1) % g.rounds[g.i].n); const last = g.i === g.rounds.length - 1; if (!last) g.go(1); return last; }, answers++);
        if (last) await cap.eval(() => window.__arcade.Scenes.cur.askSubmit());
        await step(300); continue;
      }
      if (s.ask) {
        if (!paused && answers % 7 === 3) { paused = true; await cap.eval(() => window.__arcade.Scenes.cur.pause()); await step(60); continue; } // (a pause, now and then)
        paused = false;
        await cap.answer(answers++ % 4 === 1 ? "W" : "R"); // (one in four wrong: shields, hearts and lanes lost, the game over now and then)
        await step(150); continue;
      }
      if (s.sheet) { await cap.next(); await step(30); continue; }
      await step(30);
    }
    await held(round, "in " + game); // (what the game holds at the end of its play: compared apart, see below)
  };
  const open = async (where, secs) => {
    if (where === "title" || where === "hub") { await cap.eval((w) => window.__arcade.go(w), where); if (where === "hub") await waitReal(() => !!document.querySelector(".scr-hub [data-act=play]")); }
    else if (where === "guide") { await cap.eval(() => window.__arcade.go("guide")); await waitReal(() => !!document.querySelector(".guide-lib")); }
    else await cap.eval((w) => window.__arcade.show[w](), where);
    for (let t = 0; t < secs; t += 10) await step(600);
  };
  // SNAP=1: a heap snapshot at each round's end (soak-r<n>.heapsnapshot; tools/heapdiff.js compares two)
  const snap = async (round) => {
    if (!process.env.SNAP || !cdp) return;
    const file = path.join(cap.out, "soak-r" + round + ".heapsnapshot"), out = fs.createWriteStream(file);
    const onChunk = (m) => out.write(m.chunk);
    cdp.on("HeapProfiler.addHeapSnapshotChunk", onChunk);
    await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
    await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
    cdp.off("HeapProfiler.addHeapSnapshotChunk", onChunk);
    await new Promise((r) => out.end(r));
    console.log("   snapshot " + file);
  };
  await cap.eval(() => { window.__cap.skipDialogs = true; });
  for (let round = 1; round <= ROUNDS; round++) {
    for (const [where, secs] of PLAN) {
      const s = Math.max(10, Math.round(secs * k));
      if (["blaster", "racer", "boss", "memory", "exam"].includes(where)) { await play(where, s, round); await open("hub", 3); await held(round, "after " + where); }
      else { await open(where, s); if (where === "title") await held(round, "title"); }
    }
    await held(round, "round end");
    await snap(round);
  }
  // round by round, at the same moments: what grew, and what a frame costs
  const by = {}, md = [`# The soak (tools/scenarios/soak.js, ${new Date().toISOString().slice(0, 10)}): ${MIN} minutes of play, ${ROUNDS} rounds, the Mac tier`, ""];
  for (const r of rows) (by[r.at] = by[r.at] || []).push(r);
  md.push("| moment | heap MB | textures | geometries | programs | page elements | draw calls | a frame updated, ms | a frame drawn here, ms | graphics MB | browser MB |", "|---|---|---|---|---|---|---|---|---|---|---|");
  const f = (a, key) => a.map((r) => (r[key] === null || r[key] === undefined ? "-" : r[key])).join(" → ");
  for (const [at, a] of Object.entries(by)) md.push(`| ${at} | ${f(a, "heapMB")} | ${f(a, "textures")} | ${f(a, "geometries")} | ${f(a, "programs")} | ${f(a, "nodes")} | ${f(a, "calls")} | ${f(a, "updMs")} | ${f(a, "drawMs")} | ${f(a, "glMB")} | ${f(a, "procMB")} |`);
  // (the first round loads and builds what is kept for good: the files' cache, every shader once. A leak grows after
  // it: the second round against the last, moment by moment)
  const hall = (r) => !r.at.startsWith("in "); // (the same moments every round; a game's own end varies)
  const from = ROUNDS >= 3 ? 2 : 1, a0 = rows.filter((r) => r.round === from && hall(r)), a1 = rows.filter((r) => r.round === ROUNDS && hall(r));
  const grew = (key) => Math.max(...a1.map((r, i) => (a0[i] && r[key] !== null && a0[i][key] !== null && r[key] !== undefined && a0[i][key] !== undefined ? r[key] - a0[i][key] : 0))); // (a moment not measured is no growth)
  const slow = (key) => { const x = a0.map((r) => r[key]).sort((p, q) => p - q), y = a1.map((r) => r[key]).sort((p, q) => p - q); return [x[x.length >> 1], y[y.length >> 1]]; };
  const [u0, u1] = slow("updMs"), [d0, d1] = slow("drawMs");
  md.push("", `From round ${from} to round ${ROUNDS}, at the same moments, the most any grew: heap ${grew("heapMB").toFixed(2)} MB, textures ${grew("textures")}, geometries ${grew("geometries")}, programs ${grew("programs")}, page elements ${grew("nodes")}, timers waiting ${grew("timers")}. A frame (the median of the moments): ${u0} then ${u1} ms updated, ${d0} then ${d1} ms drawn here. ${answers} answers given.`);
  // (memory in megabytes, when it was measured: the graphics chip's, the browser's; and the most a game held while played)
  const has = (key) => rows.some((r) => r[key] !== null && r[key] !== undefined);
  if (has("glMB") || has("procMB")) {
    const mbs = [has("glMB") ? `graphics ${grew("glMB")} MB` : null, has("procMB") ? `the browser ${grew("procMB")} MB (its graphics process ${grew("gpuProcMB")})` : null].filter(Boolean).join(", ");
    md.push("", `In megabytes, from round ${from} to round ${ROUNDS}, at the same moments, the most either grew: ${mbs}.`);
    const ins = rows.filter((r) => !hall(r)), top = (key) => Math.max(...ins.map((r) => r[key] || 0)), at = (key) => { const r = ins.find((x) => x[key] === top(key)); return r ? r.at + ", round " + r.round : "-"; };
    if (ins.length) md.push(`The most held at the end of a game's play (one moment a game a round: a game holds more at its start, Nest Egg Run its five skies, and lets them go as its road runs on): ${has("glMB") ? `graphics ${top("glMB")} MB (${at("glMB")})` : ""}${has("glMB") && has("procMB") ? ", " : ""}${has("procMB") ? `the browser ${top("procMB")} MB (${at("procMB")})` : ""}.`);
  }
  fs.writeFileSync(path.join(cap.out, "soak.md"), md.join("\n") + "\n");
  console.log(md.join("\n"));
};
