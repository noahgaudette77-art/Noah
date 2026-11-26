// A lost graphics context, forced and given back (WEBGL_lose_context), on the title hall, in a Boss Rush fight, in the
// Memory Bank, in Risk Blaster and in Nest Egg Run (the context-loss handler, GFX.contextLost and GFX.contextRestored:
// 2026-11-26); and three cases around it: a game lost in its opening moments, a screen opened while the context is lost
// (it waits, and is built when it is back), and a loss that lasts (the notice offers RELOAD after ten seconds).
// For each screen: held still (the title at a place on its glide; a game at its question or card), a still taken, every
// kept reflection target (GFX.kept) and the screen's probe and steel reflection read back; the context lost: a game
// paused by it, the notice up, frames run while it is lost (nothing moves: the game's state, its clocks); given back:
// three.js's own state, the reflections, the probe and the bakes made again, the screen readied, the game resumed;
// read back and a still again. Passes when every target holds what it held (none black), the probe and the steel as
// before, the still after as the control's (no part of it darker), the game's state as it was, and the game goes on
// after it (an answer recorded, a card turned). The Memory Bank's context is lost twice over.
//
// The still after is set against a control's: CONTROL=1 runs the same moments with the context kept, the game paused
// and its screen held for the same frames as the handler holds them (GFX.lost set by hand: Scenes.frame runs nothing);
// COMPARE=<the control's out dir> sets each still after against the control's, and each probe face against the
// control's at that moment. Two runs of a screen are not always the same picture before anything is lost (WebKit's
// title hall, its bosses arriving in another order; a light that flickers in Risk Blaster): the two stills before are
// set against each other too, and what is judged is what the restore adds (squares darker after that were not before,
// and the difference over the frame no more than it was before, give or take).
//
//   CONTROL=1 node arcade/tools/capture.js arcade/tools/scenarios/context-loss.js --size 1470x830 --dpr 1 --out <dir>/control
//   COMPARE=<dir>/control node arcade/tools/capture.js arcade/tools/scenarios/context-loss.js --size 1470x830 --dpr 1 --out <dir>/lost
//   (--engine webkit for both in WebKit; SCREENS=title,boss,memory,blaster,racer,intro,opened; writes context-loss.json,
//   <screen>-before.png and <screen>-after.png)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const CONTROL = !!process.env.CONTROL, COMPARE = process.env.COMPARE || "";
  const SCREENS = (process.env.SCREENS || "title,boss,memory,blaster,racer,intro,opened").split(",").filter((n) => !CONTROL || !["intro", "opened"].includes(n));
  const page = cap.page, out = { engine: process.env.ENGINE || "", screens: {} }, ctl = COMPARE ? JSON.parse(fs.readFileSync(path.join(COMPARE, "context-loss.json"), "utf8")) : null;
  let fails = 0;
  const check = (where, ok, what) => { console.log(`${ok ? "  ok  " : "  FAIL"} ${where}: ${what}`); if (!ok) fails++; return ok; };
  if (!CONTROL) check("all", !!ctl, COMPARE ? "the control's run read: " + COMPARE : "the control's run given (COMPARE): without it no still is compared");
  const waitReal = async (js, ms = 60000, arg) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js, arg)) return true; await page.waitForTimeout(100); } return false; };
  await cap.eval(() => { window.__cap.skipDialogs = true; });
  // every WebGL complaint the browser makes, warnings too (Chromium reports a GL error as a warning, WebKit as an error;
  // three.js's own word that the context was lost and is back is a log, not a complaint)
  const glSays = [];
  page.on("console", (m) => { const t = m.text(); if ((m.type() === "warning" || m.type() === "error") && /WebGL|GL_[A-Z_]+|INVALID_/.test(t)) glSays.push(m.type() + ": " + t.slice(0, 200)); });
  // (three.js's own restore, which runs before the page's, draws ids for what it makes from Math.random: given a
  // randomness of its own here, so the game's draws after it are the control's, frame for frame)
  if (!CONTROL) await cap.eval(() => {
    const c = window.__arcade.GFX.renderer.domElement, seeded = Math.random;
    let s = 99;
    const own = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    c.addEventListener("webglcontextrestored", () => { Math.random = own; }, true); // (at the canvas, before three.js's listener)
    window.__afterGL = () => { Math.random = seeded; };
  });

  // every kept reflection, the probe's six faces and the steel's reflection, read back: a target's mean and how much
  // of it is not black (a half-float target's values read as floats)
  const readBack = () => cap.eval(() => {
    const A = window.__arcade, G = A.GFX, r = G.renderer, s = A.Scenes.cur;
    const h2f = (h) => { const e = (h >> 10) & 31, m = h & 1023, v = e === 0 ? m / 1024 / 16384 : e === 31 ? 0 : (1 + m / 1024) * Math.pow(2, e - 15); return h & 32768 ? -v : v; };
    const read = (rt, face) => {
      const w = rt.width, h = rt.height, half = rt.texture.type === THREE.HalfFloatType, buf = half ? new Uint16Array(w * h * 4) : new Uint8Array(w * h * 4);
      try { r.readRenderTargetPixels(rt, 0, 0, w, h, buf, face); } catch (e) { return { err: String(e.message || e) }; }
      let sum = 0, lit = 0;
      for (let i = 0; i < buf.length; i += 4) { const v = half ? h2f(buf[i]) + h2f(buf[i + 1]) + h2f(buf[i + 2]) : (buf[i] + buf[i + 1] + buf[i + 2]) / 255; sum += v; if (v > 1e-3) lit++; }
      return { mean: +(sum / (w * h)).toFixed(4), lit: +(lit / (w * h)).toFixed(4) };
    };
    const kept = [...G.kept].map((rt) => Object.assign({ name: rt.texture.name || "target", size: rt.width + "x" + rt.height }, read(rt)));
    const probe = s && s.probe && s.probe.rt ? [0, 1, 2, 3, 4, 5].map((f) => read(s.probe.rt, f)) : null;
    const env2 = s && (s.steelEnv || s.colEnv), steel = env2 ? read(env2) : null; // (the steel's or the columns' copy of the probe)
    return { kept, probe, steel };
  });
  // a game's state: its own fields that are plain values, its question, its card, and its record of answers
  const state = () => cap.eval(() => {
    const s = window.__arcade.Scenes.cur, o = {};
    for (const k of Object.keys(s)) { const v = s[k]; if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") o[k] = v; }
    if (s.round) o.question = (s.round.q && s.round.q.id) || s.round.id || null;
    if (s.card) o.card = s.card.id || null;
    if (s.run) { o.answered = s.run.answered; o.missed = s.run.missed.length; }
    return o;
  });
  const differ = (a, b, skip = []) => Object.keys(Object.assign({}, a, b)).filter((k) => !skip.includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  // the stills before and after, the control's and this run's: the RMSE over the frame, before and after, and the parts
  // of the frame (16 px squares) darker in this run than in the control's by more than 0.08 of full brightness and a
  // third of what they were (a black reflection, however small its patch): after, and after but not before (nor next to
  // a square that was)
  const compare = (cb, lb, ca, la) => {
    const py = "import sys\nimport numpy as np\nfrom PIL import Image\nY=np.array([0.2126,0.7152,0.0722],np.float32);B=16\ndef im(f): return np.asarray(Image.open(f).convert('RGB'),dtype=np.float32)/255\ndef blk(x):\n  l=x@Y;H,W=l.shape;H2,W2=H//B*B,W//B*B\n  return l[:H2,:W2].reshape(H2//B,B,W2//B,B).mean(axis=(1,3))\ndef cmp(a,b):\n  ba,bb=blk(a),blk(b);d=ba-bb\n  return float(np.sqrt(((a-b)**2).mean())),(d>0.08)&(d>ba/3),d\nr0,k0,d0=cmp(im(sys.argv[1]),im(sys.argv[2]));r1,k1,d1=cmp(im(sys.argv[3]),im(sys.argv[4]))\nn=k0.copy()\nfor dy in (-1,0,1):\n  for dx in (-1,0,1): n|=np.roll(np.roll(k0,dy,0),dx,1)\nnew=k1&~n;dd=np.where(new,d1,-1);i=np.unravel_index(np.argmax(dd),dd.shape)\nprint(round(r0,4),round(r1,4),int(k0.sum()),int(k1.sum()),int(new.sum()),round(float(max(0,dd.max())),3),int(i[1]*B),int(i[0]*B))";
    try { const [r0, r1, k0, k1, nw, drop, x, y] = execFileSync("python3", ["-c", py, cb, lb, ca, la]).toString().trim().split(" ").map(Number); return { rmseBefore: r0, rmse: r1, darkBefore: k0, dark: k1, newDark: nw, drop, at: [x, y] }; } catch (e) { return null; }
  };
  const tick = async (n) => { for (let i = 0; i < n; i += 30) await cap.eval((k) => window.__tick(k, true), Math.min(30, n - i)); };
  const pausable = () => cap.eval(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.pause && !s.paused && s.state && s.state !== "over" && s.state !== "intro"); });
  const lose = () => cap.eval(() => { const gl = window.__arcade.GFX.renderer.getContext(); window.__lc = gl.getExtension("WEBGL_lose_context"); window.__lc.loseContext(); });
  const giveBack = async (at) => {
    await cap.eval(() => window.__lc.restoreContext());
    const back = await waitReal((t) => window.__arcade.GFX.lost === false && (window.__arcade.GFX.restoredAt || 0) !== t, 60000, at);
    await cap.eval(() => window.__afterGL());
    return back;
  };

  // one loss, held for n frames, and the context given back (or, in the control, the same frames held by hand)
  const cycle = async (name, n, isGame, s0, o = {}) => {
    if (CONTROL) {
      const p = isGame && (await pausable());
      if (p) await cap.eval(() => window.__arcade.Scenes.cur.pause());
      await cap.eval(() => { window.__arcade.GFX.lost = true; }); // (the screen held as the handler holds it: Scenes.frame runs nothing)
      await tick(n);
      await cap.eval(() => { window.__arcade.GFX.lost = false; window.__arcade.GFX.perfAfresh(); });
      if (p) await cap.eval(() => { window.__arcade.UI.closeModal(); window.__arcade.Scenes.cur.resume(); });
      return;
    }
    const p = isGame && (await pausable()), at = await cap.eval(() => window.__arcade.GFX.restoredAt || 0);
    await lose();
    check(name, await waitReal(() => window.__arcade.GFX.lost === true, 20000), "the context lost, and the page knows it");
    check(name, await cap.eval(() => !!document.getElementById("gl-lost")), "the notice up");
    if (p) check(name, await cap.eval(() => window.__arcade.Scenes.cur.paused === true), "the game paused by it");
    if (o.reload) {
      // (a loss that lasts: RELOAD hidden at first, offered after ten seconds, reached by Tab)
      const shown = () => cap.eval(() => { const b = document.querySelector("#gl-lost [data-act=reload]"); return !!b && getComputedStyle(b).display !== "none" && b.getBoundingClientRect().width > 0; });
      check(name, !(await shown()), "RELOAD not offered at first (the context may be back in a moment)");
      await tick(n);
      check(name, await shown(), "RELOAD offered after ten seconds (the browser may never give the context back)");
      await page.keyboard.press("Tab");
      check(name, await cap.eval(() => !!document.activeElement && document.activeElement.dataset.act === "reload"), "Tab reaches RELOAD (no other key does anything)");
    } else await tick(n);
    if (isGame) { const s1 = await state(), d = differ(s0, s1, ["paused"]); check(name, d.length === 0, d.length ? "its state moved while lost: " + d.join(", ") : `its state still while lost (${n} frames)`); }
    check(name, await giveBack(at), "the context back, and the page has made again what it holds");
    check(name, await cap.eval(() => !document.getElementById("gl-lost")), "the notice gone");
    if (p) check(name, await cap.eval(() => window.__arcade.Scenes.cur.paused === false && !window.__arcade.UI.modal), "the game resumed (the pause it made, taken away)");
    if (isGame) { const s2 = await state(), d = differ(s0, s2, ["paused"]); check(name, d.length === 0, d.length ? "its state differs after: " + d.join(", ") : "its state as it was"); }
  };

  for (const name of SCREENS) {
    console.log("== " + name);
    const R = (out.screens[name] = {});
    if (name === "intro") {
      // a game lost in its opening moments (its first question 1.3 s on, which no pause holds): nothing asked unseen,
      // no answer run out; given back, the game goes on from where it was
      await cap.go("blaster", "2");
      const s0 = await state();
      check(name, s0.state === "intro", "Risk Blaster in its opening moments (" + s0.state + ")");
      await cycle(name, 300, true, s0);
      check(name, await cap.ask(600), "its first question asked after it");
      const s3 = await state();
      check(name, s3.missed === 0 && s3.answered === 0, `no answer run out or recorded in the dark (${s3.answered} answered, ${s3.missed} missed)`);
      continue;
    }
    if (name === "opened") {
      // a screen opened while the context is lost (a game's files in, the player's choice made just before): it waits,
      // and is built, readied with its own list, when the context is back
      const was = await cap.eval(() => window.__arcade.Scenes.cur && window.__arcade.Scenes.cur.constructor.name);
      const at = await cap.eval(() => window.__arcade.GFX.restoredAt || 0);
      await lose();
      check(name, await waitReal(() => window.__arcade.GFX.lost === true, 20000), "the context lost");
      await cap.eval(() => window.__arcade.go("memory", "2"));
      await tick(120);
      check(name, await cap.eval((w) => !!window.__arcade.Scenes.cur && window.__arcade.Scenes.cur.constructor.name === w, was), "the Memory Bank waits while it is lost (" + was + " still up)");
      check(name, await giveBack(at), "the context back");
      // (the frames it is built in drawn, as cap.go draws them: what a scene draws into a target of its own while it is
      // built, its reflection above all, is drawn only in a frame drawn)
      for (let i = 0; i < 240; i++) { await cap.eval(() => window.__tick(1, true)); if (await cap.eval(() => !!window.__arcade.Scenes.cur && window.__arcade.Scenes.cur.constructor.name === "MemoryGame")) break; }
      const built = await cap.until(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.constructor.name === "MemoryGame" && s.state === "front"); }, 2400);
      check(name, built, "the Memory Bank built once it is back, at its first card");
      check(name, await cap.eval(() => { const s = window.__arcade.Scenes.cur; return !!(s._warm && s._warm.want.length); }), "readied with its own list (GFX.warm: what its files brought)");
      await tick(60);
      const b = await readBack();
      R.after = b;
      check(name, b.kept.length > 0 && b.kept.every((k) => !k.err && k.lit > 0.05), `its ${b.kept.length} kept reflections, none black`);
      await cap.eval(() => window.__arcade.Scenes.cur.flip()); await cap.fast(60);
      check(name, (await state()).state === "back", "the game goes on (a card turned)");
      continue;
    }
    if (name === "title") {
      await cap.eval(() => window.__arcade.go("title"));
      const ready = () => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells && s.cells.length && s.cells.every((c) => c.boss && c.ready) && s.vault); };
      let ok = false;
      for (let i = 0; i < 1500 && !ok; i++) { await cap.fast(2); ok = await cap.eval(ready); if (!ok) await page.waitForTimeout(100); }
      // (held at the middle of its glide; each cell's random phase and pace, drawn as its boss arrives, in whatever order
      // the files come, set alike in both runs, and the randomness started afresh: the control's picture and this one
      // the same before anything is lost, in WebKit too)
      await cap.eval(() => {
        const s = window.__arcade.Scenes.cur;
        s.pose = 0.5;
        s.cells.forEach((c, i) => { c.phase = (i * 3.7) % 10; if (c.idle) { c.idle.time = ((i * 0.37) % 1) * c.idle.getClip().duration; c.idle.timeScale = 0.95; } });
        if (window.__reseed) window.__reseed(4242);
      });
      for (let i = 0; i < 60; i++) { await cap.eval(() => window.__tick(1, true)); } // (its probe's six faces drawn, and the steel's reflection taken)
      await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); });
    } else {
      await cap.go(name, name === "boss" ? "1" : "2");
      if (name === "memory") await cap.until(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.state === "front"); }, 2400);
      else await cap.ask(2400);
      await cap.fast(60);
      await cap.eval(() => window.__tick(2, true)); // (a probe is drawn from what a frame drew: the deck's mirror in Boss Rush; the capture tool draws only the frames it keeps)
      await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); });
    }
    const isGame = await cap.eval(() => !!(window.__arcade.Scenes.cur && window.__arcade.Scenes.cur.pause));
    await cap.shot(name + "-before");
    const s0 = isGame ? await state() : null, b0 = await readBack();
    R.before = b0;
    check(name, b0.kept.length > 0 && b0.kept.every((k) => !k.err && k.lit > 0.05), `${b0.kept.length} kept reflections read before, none black`);
    if (name === "title") await cycle(name, 660, false, null, { reload: true });
    else if (name === "memory") { await cycle(name, 300, isGame, s0); await cycle(name, 300, isGame, s0); } // (twice over)
    else await cycle(name, 300, isGame, s0);

    const b1 = await readBack(); // (at once: the probe as the restore left it)
    R.after = b1;
    // (the probe made once more at this same moment, as the restore makes it (a screen's restoreGraphics, or probeNow),
    // in both runs, before the still: the two stills alike in it; the restore's own probe is judged by b1, read before)
    let b2 = null;
    if (b0.probe) {
      await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.restoreGraphics) s.restoreGraphics(); else if (s.probeNow) s.probeNow(); });
      b2 = await readBack();
      R.probeOnceMore = b2.probe;
    }
    const a = await cap.shot(name + "-after");
    if (ctl && ctl.screens[name]) {
      const c = compare(path.join(COMPARE, name + "-before.png"), path.join(cap.out, name + "-before.png"), path.join(COMPARE, name + "-after.png"), a);
      R.still = c;
      const ok = !!c && c.newDark === 0 && c.rmse <= Math.max(0.02, c.rmseBefore + 0.015);
      check(name, ok, `the still after as the control's (the context kept, the same frames held): RMSE ${c && c.rmse} (before ${c && c.rmseBefore}), ${c && c.newDark} parts darker that were not before (${c && c.dark} after, ${c && c.darkBefore} before)` + (c && c.newDark ? ` (the most: ${c.drop} at ${c.at})` : ""));
    }
    if (!CONTROL) {
      const same = b0.kept.length === b1.kept.length && b0.kept.every((k, i) => !b1.kept[i].err && Math.abs(k.mean - b1.kept[i].mean) <= Math.max(0.002, k.mean * 0.01) && Math.abs(k.lit - b1.kept[i].lit) <= 0.01);
      check(name, same, `the ${b1.kept.length} kept reflections drawn again as they were (mean and lit share within 1%)` + (same ? "" : ": " + JSON.stringify(b1.kept.map((k, i) => [b0.kept[i] && b0.kept[i].mean, k.mean]))));
      if (b0.probe) {
        // (set against the control's probe at this moment (the context never lost: what it held), and against a capture
        // made once more now (drawn again whole, converged: its steel mirrors the probe and the probe the steel, which
        // came back black; a capture more changes nothing). What the probe sees moves a little from frame to frame (the
        // crowd, the lamps): the control's was drawn three frames before the loss. Boss Rush's storm too: its restore
        // captures without the lightning, as the capture made once more does)
        const cp = ctl && ctl.screens[name] && ctl.screens[name].after && ctl.screens[name].after.probe;
        if (cp) {
          const sum = (p) => p.reduce((t, f) => t + f.mean, 0), k = sum(b1.probe) / sum(cp);
          const pc = Math.abs(1 - k) <= 0.08 && b1.probe.every((f, i) => !f.err && f.lit >= cp[i].lit - 0.02 && f.mean >= cp[i].mean * 0.8);
          check(name, pc, `the room's probe as the control's: its light ${(k * 100).toFixed(1)}% of the control's (within 8%), no face darker by a fifth, none less lit` + (pc ? "" : ": " + JSON.stringify([b1.probe.map((f) => f.mean), cp.map((f) => f.mean)])));
        }
        const pOk = b1.probe && b2.probe && b1.probe.every((f, i) => !f.err && f.lit > 0.05 && Math.abs(f.mean - b2.probe[i].mean) <= Math.max(0.01, b2.probe[i].mean * 0.05));
        check(name, pOk, "the room's probe drawn again whole: every face lit, and as a capture made once more at that moment gives it (within 5%)" + (pOk ? "" : ": " + JSON.stringify([b1.probe.map((f) => f.mean), b2.probe.map((f) => f.mean)])));
      }
      if (b0.steel) check(name, !!b1.steel && !b1.steel.err && b1.steel.lit > 0.05 && Math.abs(b1.steel.mean - b0.steel.mean) <= Math.max(0.01, b0.steel.mean * 0.05), `the steel's reflection made again (${b0.steel.mean} then ${b1.steel && b1.steel.mean})`);
    }
    // the game goes on
    if (isGame && name !== "memory") { await cap.answer("R"); await cap.fast(240); const s3 = await state(); check(name, s3.answered === s0.answered + 1, `the game goes on after it (an answer recorded: ${s0.answered} then ${s3.answered})`); }
    if (name === "memory") { await cap.eval(() => window.__arcade.Scenes.cur.flip()); await cap.fast(60); check(name, (await state()).state === "back", "the game goes on after it (a card turned)"); }
    R.errors = await cap.eval(() => (window.__cap.errors || []).slice(-5));
  }
  out.glSays = glSays;
  check("all", glSays.length === 0, glSays.length ? `the browser complained of WebGL ${glSays.length} time(s): ` + [...new Set(glSays)].slice(0, 4).join(" | ") : "no WebGL complaint from the browser, warnings included");
  out.pageErrors = await cap.eval(() => (window.__cap.errors || []).slice(-10));
  check("all", out.pageErrors.length === 0, out.pageErrors.length ? "the page's errors: " + out.pageErrors.join(" | ") : "no error from the page");
  out.fails = fails;
  fs.writeFileSync(path.join(cap.out, "context-loss.json"), JSON.stringify(out, null, 1));
  console.log(fails ? `${fails} check(s) failed` : "every check passed");
};
