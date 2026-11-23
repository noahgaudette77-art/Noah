// The detail polish pass (the owner, 2026-11-22): a still of each screen the owner listed, as their phone held upright
// shows it, for a before and an after. Served (every asset loaded), on the virtual clock: the same run gives the same
// frames, so a before and an after differ only by what changed.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/polish.js --out <dir> --size 440x956 --dpr 2 --insets 62,34 [--engine webkit]
//
// PART=title,cell,cells,hub,select,blaster,racer,boss,memory,exam,guide,results,stats,setup (any of them) makes only those.
// The scenario sets state in the page to reach a moment quickly (where the title's lens is, a player's progress):
// test only. Nothing here is part of the game.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const part = (n) => !process.env.PART || process.env.PART.split(",").includes(n);
  // each screen's randomness started afresh before it opens (the master overhaul, 2026-11-23: the stills of two runs
  // compared picture for picture; the files arrive in real time, so without this the questions and scenery shifted)
  const reseed = (k) => cap.eval((n) => window.__reseed && window.__reseed(n), 1000 + [...k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const jpg = (name, q = 86) => { const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", String(q), j]); fs.unlinkSync(p); return j; };
  // (the master overhaul, 2026-11-23: after each still, any two pieces of the page's visible text whose boxes overlap by
  // more than a third of the smaller, written to overlaps.json beside the stills: tools/harness.js reads it)
  const overlaps = {};
  const textOverlaps = () => cap.eval(() => {
    const shown = (el) => { for (let p = el; p && p !== document.documentElement; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === "none" || c.visibility === "hidden" || +c.opacity < 0.05) return false; } return true; };
    const items = [], W = innerWidth, H = innerHeight, walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    // (text under something else, a sheet or a bar drawn over it, is not seen: what is on top at a line's middle is
    // asked of the page with every element counted, pointer-events or not)
    const all = document.createElement("style");
    all.textContent = "* { pointer-events: auto !important; }";
    document.head.appendChild(all);
    const seen = (el, r) => { const top = document.elementFromPoint(Math.min(W - 1, Math.max(0, r.left + r.width / 2)), Math.min(H - 1, Math.max(0, r.top + r.height / 2))); return !top || top === el || el.contains(top) || top.contains(el); };
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent.trim(), el = n.parentElement;
      if (!t || !el || !shown(el)) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width > 2 && r.height > 2 && r.right > 0 && r.bottom > 0 && r.left < W && r.top < H && seen(el, r)) items.push({ el, r, t: t.slice(0, 28) });
    }
    all.remove();
    const out = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el) || a.t === b.t) continue; // (the same words over themselves: a glow drawn as a copy)
      const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (x > 0 && y > 0 && x * y > Math.min(a.r.width * a.r.height, b.r.width * b.r.height) / 3) out.push(a.t + " / " + b.t);
    }
    return [...new Set(out)].slice(0, 24);
  });
  const still = async (name, o) => { await cap.shot(name, o); const f = jpg(name); overlaps[name] = await textOverlaps().catch(() => ["(the check failed)"]); console.log("  " + path.basename(f) + (overlaps[name].length ? "  text overlaps: " + overlaps[name].length : "")); fs.writeFileSync(path.join(cap.out, "overlaps.json"), JSON.stringify(overlaps, null, 1)); return f; };
  const waitReal = async (js, ms = 60000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  // the page's own animations (CSS and scripted) stepped with the frames, as the menus' scenario steps them: they run
  // on the real clock and a capture steps a virtual one
  const stepAnimations = () => cap.eval(() => {
    if (window.__stepped) return;
    window.__stepped = true;
    const animate = Element.prototype.animate, live = [], css = new WeakMap();
    Element.prototype.animate = function (fr, o) { const a = animate.call(this, fr, o); a.pause(); live.push({ a, t0: performance.now() }); return a; };
    const step = () => {
      const now = performance.now();
      for (const x of live) { try { x.a.currentTime = now - x.t0; } catch (e) { /* gone */ } }
      if (document.getAnimations) for (const an of document.getAnimations()) {
        if (!/^CSS(Animation|Transition)$/.test(an.constructor && an.constructor.name)) continue;
        let t0 = css.get(an);
        if (t0 === undefined) { t0 = now; css.set(an, t0); an.pause(); }
        try { an.currentTime = now - t0; } catch (e) { /* gone */ }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // ---- the title hall: every piece in (real time: the files come in while the virtual clock waits), then the glide
  // from the door: early (the owner's first picture), half way (their second), and the end with the logo up (their third)
  const hallReady = () => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells && s.sky && s.podMesh && s.vault && s.cabs && s.stand && s.cup && s.cells.every((c) => c.boss && c.ready) && s.cells.every((c) => c.world._win.uniforms.uOn.value > 0 && (!c.world._win.uniforms.uTopOn || c.world._win.uniforms.uTopOn.value > 0))); }; // (and, from 2026-11-23, the skylights' own pictures)
  if (part("title") || part("cell")) {
    let ok = false;
    for (let i = 0; i < 1500 && !ok; i++) { await cap.fast(4); ok = await cap.eval(hallReady); if (!ok) await cap.page.waitForTimeout(100); }
    console.log("hall ready:", ok);
  }
  if (part("title") || part("cell")) { // (each boss's idle from a fixed moment, whenever its files arrived)
    await reseed("hall");
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); }); // (its floor's and glass's reflection drawn now: see HallScene.probeNow)
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; (s.cells || []).forEach((c, i) => { if (c.idle) c.idle.time = (i * 0.37) % Math.max(0.01, c.idle.getClip().duration); c.phase = i * 1.3; if (c.mixer) c.mixer.update(0); }); });
  }
  if (part("title")) {
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.state = "glide"; s.gt = 0; s.u = 0; s.mult = 1; s.hurrying = false; s.arrived = false; s.rattleIn = 1e9; const el = document.querySelector(".scr-title"); el.classList.add("gliding"); s.onArrive = () => el.classList.remove("gliding"); });
    await cap.fast(60 * 5);
    await still("01-title-glide-early");
    await cap.fast(60 * 11);
    await still("02-title-glide-middle");
    await cap.fast(60 * 18 + 150); // (the glide's end, and the logo and the dock up)
    await still("03-title-end");
  }
  // ---- one containment cell, close: the lens held beside the first world's left pod, looking at it
  if (part("cell")) {
    await cap.eval(() => {
      const s = window.__arcade.Scenes.cur, c = s.cells[0], T = window.THREE || null;
      s.rattleIn = 1e9; s.state = "rest"; s.u = 0.2;
      s.place = function () { this.camBase.set(c.x * 0.28, 2.3, c.z + 4.6); this.lookAt.set(c.x, 2.35, c.z - 0.2); this.placeCamera(); };
      document.querySelector(".scr-title").classList.add("gliding");
    });
    await cap.fast(90);
    await still("04-title-cell-closeup");
  }
  // ---- a player some way in (as the menus' scenario has one): a few trophies, some bosses beaten, a best exam
  await cap.eval(() => {
    const A = window.__arcade, s = A.Store.state;
    A.Sound.init();
    Object.assign(s.boss, { 1: 3, 2: 2, 3: 1, 4: 3, 5: 1 });
    s.ach = Object.assign(s.ach || {}, { first: 1, streak5: 1, streak10: 1, boss1: 1, flawless: 1, cards50: 1, ans100: 1, exam60: 1, wave5: 1 });
    Object.assign(s.stats, { bestStreak: 12, answered: 140, correct: 118, games: 9, bestExam: 72 });
  });
  // ---- the cells as the player's progress leaves them (PART=cells): back to the title (it opens at the hall's end), a
  // beaten boss's cell (the first: DEFEATED), a cell in alarm (the Inflation Titan's), the Proctor's (alarm, cracked)
  if (part("cells")) {
    await reseed("cells");
    // (by way of another screen, as a player comes back to the title: the title still up would be kept as it is, its
    // cells as they were before this progress)
    await cap.eval(() => window.__arcade.go("guide"));
    await waitReal(() => !!document.querySelector(".guide-lib")); // (it comes up when its files have: not before)
    await cap.fast(30);
    await cap.eval(() => window.__arcade.go("title"));
    let ok = false;
    for (let i = 0; i < 1500 && !ok; i++) { await cap.fast(4); ok = await cap.eval(hallReady); if (!ok) await cap.page.waitForTimeout(100); }
    for (const [k, name] of [[0, "04b-cell-defeated"], [5, "04c-cell-alarm"], [11, "04d-cell-proctor"]]) {
      await cap.eval((k) => {
        const s = window.__arcade.Scenes.cur, c = s.cells[k];
        s.rattleIn = 1e9; s.state = "rest";
        const fx = Math.sin(c.anchor.rotation.y), fz = Math.cos(c.anchor.rotation.y); // (in front of the cell, a little toward the door)
        s.place = function () { this.camBase.set(c.x + fx * 6.2, 2.0, c.z + fz * 6.2); this.lookAt.set(c.x, 2.2, c.z); this.placeCamera(); };
        document.querySelector(".scr-title").classList.add("gliding");
      }, k);
      await cap.fast(90);
      await still(name);
    }
  }
  // ---- the arcade floor: its first visit (the room powers on), then the first cabinet chosen
  if (part("hub")) {
    await reseed("hub");
    await cap.eval(() => window.__arcade.go("hub"));
    await waitReal(() => !!document.querySelector(".hub-name"));
    await cap.fast(300);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.skipIntro) s.skipIntro(); });
    await cap.fast(180);
    await still("05-hub");
  }
  if (part("select")) {
    await reseed("select");
    await cap.eval(() => window.__arcade.show.select("boss"));
    await cap.fast(120);
    await still("06-chapter-select");
  }
  // ---- the three games, each with a question up in the middle of its action; Risk Blaster's explanation sheet too
  if (part("blaster")) {
    await reseed("blaster");
    await cap.go("blaster", "3");
    await cap.next(); await reseed("blaster-ask"); await cap.ask(1500); await cap.fast(90);
    await still("07-blaster");
    await cap.answer("W"); await cap.fast(150);
    await still("08-blaster-explanation");
  }
  if (part("racer")) {
    await reseed("racer");
    await cap.go("racer", "2");
    await cap.next(); await reseed("racer-ask"); await cap.ask(1500); await cap.fast(90);
    await still("09-racer");
  }
  if (part("boss")) {
    await reseed("boss");
    await cap.go("boss", "1");
    await cap.next(); await reseed("boss-ask"); await cap.ask(1500); await cap.fast(90);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); }); // (its deck's reflection drawn now: see BossGame.probeNow)
    await still("10-boss");
  }
  // ---- Memory Bank: a card, its question side and its answer
  if (part("memory")) {
    await reseed("memory");
    await stepAnimations(); // (the card's turn is a CSS transition: stepped with the frames, it has turned when pictured)
    await cap.go("memory", "3");
    await cap.fast(220);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); }); // (its floor's reflection drawn now: see MemoryGame.probeNow)
    await still("11-memory-front");
    await cap.eval(() => window.__arcade.Scenes.cur.flip());
    await cap.fast(60);
    await still("12-memory-back");
  }
  // ---- Final Exam (twenty questions), its first question up
  if (part("exam")) {
    await reseed("exam");
    await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); });
    await cap.go("exam", "all");
    await cap.fast(260);
    await still("13-exam");
  }
  // ---- Strategy Guide: the library, then a chapter open
  if (part("guide")) {
    await reseed("guide");
    await cap.eval(() => window.__arcade.go("guide"));
    await waitReal(() => !!document.querySelector(".guide-lib"));
    await cap.fast(150);
    await still("14-guide");
    await cap.eval(() => { const b = document.querySelector("[data-act=ch]"); if (b) b.click(); });
    await cap.fast(80);
    await still("15-guide-chapter");
  }
  // ---- a results screen after its reward moment, the stats screen, Setup
  if (part("results")) {
    await reseed("results");
    await stepAnimations();
    await cap.eval(() => {
      const A = window.__arcade;
      A.show.results({ game: "boss", sel: A.makeSelection("4"), run: { correct: 6, answered: 6, bestStreak: 6, missed: [], xp0: -230, start: {} }, stars: 3, score: 18450,
        title: "STAGE CLEAR", headline: "18,450", sub: "The Fine Print falls", color: "#ff3ad4", won: ["boss6", "streak20"] }, 0);
    });
    await cap.fast(16 * 12 + 150);
    await still("16-results");
  }
  if (part("stats")) {
    await reseed("stats");
    await cap.eval(() => window.__arcade.show.stats());
    await cap.fast(60);
    await still("17-stats");
  }
  if (part("setup")) {
    await reseed("setup");
    await cap.eval(() => window.__arcade.show.setup());
    await cap.fast(40);
    await still("18-setup");
  }
};
