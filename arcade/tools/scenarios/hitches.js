// What still stalls a frame in play (the master overhaul, Phase 1, 2026-11-23): each screen and game opened and played
// with every frame drawn, counting
//   shaders made after the screen opened   (each a stall of a frame or more on a phone: GFX.warm is to have made every
//                                           one behind the change of screen; the materials that needed it are named)
//   pictures sent to the graphics chip after it opened   (an image, a canvas or data: decoded and copied in a frame)
//   the garbage the game makes a frame     (Chromium only: the heap sampled through the play, objects since swept
//                                           included; JavaScript's collector stops the page to sweep it, Safari's too:
//                                           the less a frame leaves behind, the rarer and shorter those stops)
//   the page's elements changed a frame    (each change can make the browser work out styles and layout again)
// What a frame draws does not depend on its size for any of these, so the page is drawn small (fast in software).
//
//   node arcade/tools/capture.js arcade/tools/scenarios/hitches.js --phone --size 220x478 --dpr 1 --out <dir>
//
// GAMES=title,hub,blaster,racer,boss,memory,exam (the default: all); FRAMES=n caps each game's play (default 1500).
// Each game is played with right and wrong answers (R R W R ...) a second after each question is up. Writes
// hitches.json (every event, the frame it came in, what it was) to --out and prints a table. Test only.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const GAMES = (process.env.GAMES || "title,hub,blaster,racer,boss,memory,exam").split(",");
  const FRAMES = +(process.env.FRAMES || 1500);
  const page = cap.page;
  // the page's own lines, back to the source file each came from (the build heads every file with /* ---- name ---- */)
  const html = fs.readFileSync(path.join(__dirname, "..", "..", "index.html"), "utf8").split("\n"), starts = [];
  html.forEach((l, i) => { const m = /^\/\* ---- (\S+\.js) ---- \*\/$/.exec(l); if (m) starts.push([i, m[1]]); });
  const where = (line) => { let f = null; for (const [i, n] of starts) { if (i <= line) f = [n, line - i]; else break; } return f ? f[0] + ":" + f[1] : "line " + (line + 1); };
  // the counters, in the page
  await cap.eval(() => {
    const A = window.__arcade, R = A.GFX.renderer, gl = R.getContext(), H = (window.__hc = { links: [], uploads: [], programs: [], seen: new Set() });
    const link = gl.linkProgram;
    gl.linkProgram = function (p) { H.links.push(window.__cap.frame); return link.call(gl, p); };
    const name = (s) => {
      if (!s) return "?";
      if (ArrayBuffer.isView(s)) return "data " + Math.round(s.byteLength / 1024) + " KB";
      const w = s.naturalWidth || s.videoWidth || s.width, h = s.naturalHeight || s.videoHeight || s.height;
      if (typeof HTMLImageElement !== "undefined" && s instanceof HTMLImageElement) { const u = s.currentSrc || s.src || ""; return (u.startsWith("data:") ? "image (inline)" : u.startsWith("blob:") ? "image (blob)" : "image " + u.split("/").pop().slice(0, 40)) + " " + w + "x" + h; }
      if (typeof HTMLCanvasElement !== "undefined" && s instanceof HTMLCanvasElement) return "canvas " + w + "x" + h;
      if (typeof ImageBitmap !== "undefined" && s instanceof ImageBitmap) return "bitmap " + w + "x" + h;
      return (s.constructor && s.constructor.name) + " " + w + "x" + h;
    };
    for (const k of ["texImage2D", "texSubImage2D", "compressedTexImage2D", "compressedTexSubImage2D", "texImage3D", "texSubImage3D"]) {
      const f = gl[k];
      if (!f) continue;
      gl[k] = function () {
        let src = null;
        for (let i = 0; i < arguments.length; i++) { const x = arguments[i]; if (x && typeof x === "object") { src = x; break; } }
        if (src) H.uploads.push({ f: window.__cap.frame, k, what: name(src) });
        return f.apply(gl, arguments);
      };
    }
    // a new program after a frame: the materials of the current screen drawn with it, named
    H.check = () => {
      const P = R.info.programs || [];
      for (const p of P) {
        if (H.seen.has(p)) continue;
        H.seen.add(p);
        const users = [], sc = A.Scenes.cur && A.Scenes.cur.scene;
        if (sc) sc.traverse((o) => { (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => { const pr = R.properties.get(m); if (pr && pr.program === p && users.length < 3) users.push((m.name || m.type) + " on " + (o.name || (o.parent && o.parent.name) || o.type)); }); });
        H.programs.push({ f: window.__cap.frame, name: p.name, users });
      }
    };
    H.check();
    // the page's own elements changed a frame (each change may make the browser work out its styles and layout again)
    H.dom = { on: false, n: 0, by: new Map() };
    const label = (el) => !el ? "?" : (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.classList && el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : ""));
    new MutationObserver((list) => {
      if (!H.dom.on) return;
      for (const m of list) { H.dom.n++; const el = m.target.nodeType === 1 ? m.target : m.target.parentElement, k = label(el) + (m.type === "attributes" ? " [" + m.attributeName + "]" : m.type === "childList" ? " [children]" : " [text]"); H.dom.by.set(k, (H.dom.by.get(k) || 0) + 1); }
    }).observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true });
  });
  // n frames, each drawn, the new programs looked for after each
  const play = (n) => page.evaluate((k) => { for (let i = 0; i < k; i++) { window.__tick(1, true); window.__hc.check(); } return window.__cap.frame; }, n);
  const frame = () => page.evaluate(() => window.__cap.frame);
  const counts = () => page.evaluate(() => ({ links: window.__hc.links.length, uploads: window.__hc.uploads.length, programs: window.__hc.programs.length }));
  const state = () => page.evaluate(() => {
    const s = window.__arcade.Scenes.cur;
    if (!s) return { k: "none" };
    if (s.quiz && s.quiz.sheet) return { k: "sheet" };
    if (s.rounds && s.answers && typeof s.i === "number") return { k: s.state === "ask" ? "exam" : s.state, i: s.i, n: s.rounds.length };
    if (s.state === "front" || s.state === "back") return { k: "card-" + s.state };
    return { k: s.state === "ask" && s.round ? "ask" : String(s.state || "") };
  });
  const cdp = cap.engine === "webkit" ? null : await page.context().newCDPSession(page).catch(() => null);
  const results = [];
  const PATTERN = "RRWRRRWRRWRRRRWR";
  for (const game of GAMES) {
    const row = { game };
    const c0 = await counts(), f0 = await frame();
    if (game === "title" || game === "hub") await cap.eval((g) => window.__arcade.go(g), game);
    else if (game === "exam") { await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); }); await cap.go("exam", "all"); }
    else await cap.go(game, { blaster: "3", racer: "2", boss: "1", memory: "3" }[game]);
    // the screen built and opened: drawn until its first question is up (a game) or for two seconds (a screen)
    let opened = false;
    for (let i = 0; i < 90 && !opened; i++) {
      await play(10);
      const st = await state();
      if (st.k === "sheet") await cap.next();
      opened = game === "title" || game === "hub" ? i >= 12 : ["ask", "exam", "card-front"].includes(st.k);
    }
    const c1 = await counts(), f1 = await frame();
    row.opening = { frames: f1 - f0, programs: c1.programs - c0.programs, links: c1.links - c0.links, uploads: c1.uploads - c0.uploads };
    // the play
    // (the garbage is sampled from a third of the way in: by then the browser has compiled the game's code for speed.
    // Before that, Chromium keeps every fractional number it works out in a box of its own, garbage that Safari never
    // makes: it stores such numbers in place)
    const warmUp = Math.round(FRAMES / 3);
    await cap.eval(() => { const D = window.__hc.dom; D.on = true; D.n = 0; D.by = new Map(); });
    let sampling = false, fs0 = f1;
    let answered = 0, waitAsk = 0, waitSheet = 0, end = "";
    const t0 = Date.now();
    while ((await frame()) - f1 < FRAMES) {
      await play(10);
      if (cdp && !sampling && (await frame()) - f1 >= warmUp) { sampling = true; fs0 = await frame(); await cdp.send("HeapProfiler.enable"); await cdp.send("HeapProfiler.collectGarbage"); await cdp.send("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
      const st = await state();
      if (st.k === "ask" || st.k === "exam") {
        waitAsk += 10;
        if (waitAsk >= 60) {
          const kind = PATTERN[answered % PATTERN.length];
          if (st.k === "ask") await cap.answer(kind);
          else await cap.eval(([w, last]) => { const s = window.__arcade.Scenes.cur, r = s.rounds[s.i], ok = r.correct, n = (r.answers || r.options || r.choices || [0, 0, 0, 0]).length || 4; s.pick(w === "W" ? (ok + 1) % n : ok); if (last) s.submit(); else s.go(1); }, [kind, st.i >= st.n - 1]);
          answered++; waitAsk = 0;
        }
      } else waitAsk = 0;
      if (st.k === "card-front") { waitAsk += 10; if (waitAsk >= 60) { await cap.eval(() => window.__arcade.Scenes.cur.flip()); waitAsk = 0; } }
      if (st.k === "card-back") { waitSheet += 10; if (waitSheet >= 40) { const kind = PATTERN[answered % PATTERN.length]; await cap.eval((g) => window.__arcade.Scenes.cur.grade(g), kind === "W" ? "again" : "good"); answered++; waitSheet = 0; } }
      if (st.k === "sheet") { waitSheet += 10; if (waitSheet >= 90) { await cap.next(); waitSheet = 0; } }
      const gone = await page.evaluate((g) => { const A = window.__arcade, s = A.Scenes.cur; return !s || (g !== "title" && g !== "hub" && !/blaster|racer|boss|memory|exam/i.test((s.constructor && s.constructor.name) || "")) ? "left the game" : ""; }, game).catch(() => "");
      if (gone) { end = gone; break; }
      if (Date.now() - t0 > 25 * 60000) { end = "out of time"; break; }
    }
    const c2 = await counts(), f2 = await frame();
    const dom = await cap.eval(() => { const D = window.__hc.dom; D.on = false; return { n: D.n, top: [...D.by].sort((a, b) => b[1] - a[1]).slice(0, 8) }; });
    row.dom = { perFrame: +(dom.n / Math.max(1, f2 - f1)).toFixed(2), top: dom.top.map(([k, v]) => `${(v / Math.max(1, f2 - f1)).toFixed(2)}/frame ${k}`) };
    row.play = { frames: f2 - f1, answered, end, programs: c2.programs - c1.programs, links: c2.links - c1.links, uploads: c2.uploads - c1.uploads };
    const ev = await page.evaluate(([a, b, c]) => ({ programs: window.__hc.programs.slice(a), uploads: window.__hc.uploads.slice(b).map((u) => u.f + " " + u.what), links: window.__hc.links.slice(c) }), [c1.programs, c1.uploads, c1.links]);
    row.playPrograms = ev.programs.map((p) => `frame ${p.f}: ${p.name} (${p.users.join("; ") || "not in the scene"})`);
    row.playUploads = ev.uploads;
    if (cdp && sampling) {
      const { profile } = await cdp.send("HeapProfiler.stopSampling"), nf = Math.max(1, f2 - fs0);
      const by = new Map();
      let total = 0;
      const walk = (n) => {
        const cf = n.callFrame, own = /index\.html/.test(cf.url);
        if (n.selfSize && own) { const k = (cf.functionName || "(anonymous)") + " " + where(cf.lineNumber); by.set(k, (by.get(k) || 0) + n.selfSize); total += n.selfSize; }
        (n.children || []).forEach(walk);
      };
      walk(profile.head);
      row.garbage = { frames: nf, kbPerFrame: +(total / 1024 / nf).toFixed(1), top: [...by].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${(v / 1024 / nf).toFixed(2)} KB/frame ${k}`) };
    }
    results.push(row);
    console.log(`${game}: opened in ${row.opening.frames} frames (${row.opening.programs} shaders, ${row.opening.uploads} pictures); played ${row.play.frames} frames, ${answered} answers${end ? " (" + end + ")" : ""}: ${row.play.programs} shaders made, ${row.play.uploads} pictures sent${row.garbage ? ", " + row.garbage.kbPerFrame + " KB of garbage a frame" : ""}`);
    for (const p of row.playPrograms.slice(0, 12)) console.log("    shader " + p);
    for (const u of row.playUploads.slice(0, 12)) console.log("    picture at frame " + u);
    if (row.garbage) for (const t of row.garbage.top.slice(0, 6)) console.log("    " + t);
    console.log(`    page elements changed: ${row.dom.perFrame} a frame` + (row.dom.top.length ? " (" + row.dom.top.slice(0, 4).join(", ") + ")" : ""));
  }
  fs.writeFileSync(path.join(cap.out, "hitches.json"), JSON.stringify(results, null, 1));
};
