// Resizing and moving between displays, on a Mac (Phase 7): on each screen, the window is resized through twelve sizes,
// its pixel ratio switched between 2 (a Retina screen) and 1 (an external display) on the way, as when a window is
// dragged from one to the other; then back to where it began. What is held before and after (textures, geometries and
// programs on the graphics chip, the render targets the pipeline keeps, the JavaScript heap, the page's elements):
// whatever grows is a leak. And after every change, whether the drawing follows it: the canvas's size against the
// window's at its pixel ratio (the governor's render scale allowed).
//
//   node arcade/tools/capture.js arcade/tools/scenarios/resize.js --size 1470x830 --dpr 2 --out <dir>
//
// SCREENS=title,hub,blaster,racer,boss,memory,exam,guide (the default: all). Writes resize.json.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const SCREENS = (process.env.SCREENS || "title,hub,blaster,racer,boss,memory,exam,guide").split(",");
  const SIZES = [[1280, 720, 2], [1920, 1080, 1], [1024, 640, 2], [2560, 1440, 1], [900, 1000, 2], [1470, 560, 2], [1680, 1050, 1], [1100, 760, 2], [1920, 1200, 1], [800, 600, 2], [1440, 900, 1], [1470, 830, 2]];
  const waitReal = async (js, ms = 60000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  const cdp = await cap.page.context().newCDPSession(cap.page);
  const setSize = async (w, h, dpr) => {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile: false });
    await cap.page.waitForTimeout(150); // (the resize and the pixel ratio's media query reach the page)
    await cap.fast(6);
    await cap.eval(() => { window.__tick(2, true); });
  };
  const held = async () => {
    await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
    return cap.eval(() => {
      const A = window.__arcade, r = A.GFX.renderer, m = r.info.memory, P = A.GFX.pipe || A.GFX.pipeline || null;
      let rts = null;
      try { rts = P && P.targets ? Object.keys(P.targets).length : null; } catch (e) { /* none */ }
      return { textures: m.textures, geometries: m.geometries, programs: (r.info.programs || []).length, rts, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, nodes: document.getElementsByTagName("*").length };
    });
  };
  const follows = () => cap.eval(() => {
    const c = window.__arcade.GFX.renderer.domElement, dpr = window.devicePixelRatio, w = innerWidth * dpr, h = innerHeight * dpr;
    return { canvas: c.width + "x" + c.height, css: c.clientWidth + "x" + c.clientHeight, window: innerWidth + "x" + innerHeight, dpr, scale: +(c.width / w).toFixed(3), aspectOK: Math.abs(c.width / c.height - w / h) < 0.02, fills: Math.abs(c.clientWidth - innerWidth) <= 1 && Math.abs(c.clientHeight - innerHeight) <= 1 };
  });
  const out = [];
  for (const k of SCREENS) {
    await setSize(1470, 830, 2);
    if (["blaster", "racer", "boss", "memory"].includes(k)) { await cap.go(k, { blaster: "3", racer: "2", boss: "1", memory: "3" }[k]); await cap.next(); await cap.ask(1500); await cap.fast(60); }
    else if (k === "exam") { await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); }); await cap.go("exam", "all"); await cap.fast(120); }
    else { await cap.eval((g) => window.__arcade.go(g), k); if (k === "guide") await waitReal(() => !!document.querySelector(".guide-lib")); await cap.fast(90); }
    await cap.eval(() => { window.__tick(2, true); });
    // one round through the sizes first (anything made once for a size is made), then the measure over two more
    // (CONTROL=1: the same frames with the window left as it is: what grows by itself, playing, not by the resizing)
    const step = async (w, h, d) => { if (process.env.CONTROL) { await cap.page.waitForTimeout(150); await cap.fast(6); await cap.eval(() => { window.__tick(2, true); }); } else await setSize(w, h, d); };
    for (const [w, h, d] of SIZES) await step(w, h, d);
    if (process.env.SETTLE) { await cap.page.waitForTimeout(+process.env.SETTLE * 1000); await cap.fast(30); } // (SETTLE=s: real seconds for a screen's files to finish arriving before the measure)
    const before = await held(), checks = [], rounds = [];
    for (let round = 0; round < (+process.env.ROUNDS || 2); round++) { for (const [w, h, d] of SIZES) { await step(w, h, d); checks.push(Object.assign({ want: w + "x" + h + "@" + d }, await follows())); } rounds.push((await held()).heapMB); }
    const after = await held();
    const bad = checks.filter((c) => !c.aspectOK || !c.fills);
    const scales = [...new Set(checks.map((c) => c.scale))];
    out.push({ screen: k, rounds, before, after, grew: Object.fromEntries(Object.keys(before).map((x) => [x, before[x] === null ? null : +(after[x] - before[x]).toFixed(1)])), drawing: bad.length ? bad.slice(0, 4) : "follows every change", scales });
    console.log(k, JSON.stringify(out[out.length - 1].grew), "heap a round", rounds.join(" "), bad.length ? bad.length + " sizes not followed" : "drawing follows", "scales", scales.join(" "));
    fs.writeFileSync(path.join(cap.out, "resize.json"), JSON.stringify(out, null, 1));
  }
};
