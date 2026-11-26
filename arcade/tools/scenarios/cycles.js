// Does anything pile up as the player goes round the screens? (the master overhaul, Phase 1, 2026-11-23: a phone that
// runs short of memory reloads the page.) Every screen and game opened in turn, round after round, and after each
// round what is held: textures and geometries on the graphics chip (three.js's own count), the programs made, and the
// JavaScript heap (Chromium). Whatever grows every round is a leak; what grows only the first round is a cache.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/cycles.js --phone --size 220x478 --dpr 1 --out <dir>
//
// ROUNDS=n (default 3); SCREENS=title,hub,blaster,racer,boss,memory,exam,guide (the default: all). Writes cycles.json.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const ROUNDS = +(process.env.ROUNDS || 3), SCREENS = (process.env.SCREENS || "title,hub,blaster,racer,boss,memory,exam,guide").split(",");
  const waitReal = async (js, ms = 60000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  const cdp = await cap.page.context().newCDPSession(cap.page).catch(() => null);
  const held = async () => {
    if (cdp) await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
    return cap.eval(() => {
      const A = window.__arcade, r = A.GFX.renderer, m = r.info.memory;
      return { textures: m.textures, geometries: m.geometries, programs: (r.info.programs || []).length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, nodes: document.getElementsByTagName("*").length };
    });
  };
  const rows = [];
  for (let round = 1; round <= ROUNDS; round++) {
    for (const k of SCREENS) {
      if (["blaster", "racer", "boss", "memory"].includes(k)) { await cap.go(k, { blaster: "3", racer: "2", boss: "1", memory: "3" }[k]); await cap.next(); await cap.ask(1500); await cap.fast(60); }
      else if (k === "exam") { await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); }); await cap.go("exam", "all"); await cap.fast(120); }
      else { await cap.eval((g) => window.__arcade.go(g), k); if (k === "guide") await waitReal(() => !!document.querySelector(".guide-lib")); await cap.fast(90); }
      await cap.eval(() => { window.__tick(2, true); }); // (drawn: what the screen shows is on the chip)
    }
    const h = await held();
    rows.push(Object.assign({ round }, h));
    console.log(`round ${round}: ${h.textures} textures, ${h.geometries} geometries, ${h.programs} programs on the chip; heap ${h.heapMB} MB; ${h.nodes} page elements`);
  }
  fs.writeFileSync(path.join(cap.out, "cycles.json"), JSON.stringify(rows, null, 1));
};
