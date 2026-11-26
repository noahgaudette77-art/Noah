// A closed game kept alive? Risk Blaster, Nest Egg Run and Risk Blaster again, each closed for the hub: the live
// instances of each game's class and of its sky's (BlasterSky, RacerSky), after a garbage collection, while the closed
// game's materials are parked for their shaders (GFX.park). Every count should be 0. (The context-loss handler's
// review, 2026-11-26: a kept reflection's builder, held by its target, which a parked material holds, kept the whole
// game; with it, 1 of each after a game closed and 2 after Risk Blaster's second play.) Chromium only (the DevTools
// protocol's queryObjects).
//   node arcade/tools/capture.js arcade/tools/scenarios/closed-games.js --size 1470x830 --dpr 1 --out <dir>
module.exports = async (cap) => {
  const page = cap.page, cdp = await page.context().newCDPSession(page);
  const waitReal = async (js) => { for (let i = 0; i < 600; i++) { if (await cap.eval(js)) return true; await page.waitForTimeout(100); } return false; };
  const live = async (name) => {
    await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
    const p = await cdp.send("Runtime.evaluate", { expression: `window.__protos[${JSON.stringify(name)}]` });
    if (!p.result.objectId) return "n/a";
    const q = await cdp.send("Runtime.queryObjects", { prototypeObjectId: p.result.objectId });
    const n = await cdp.send("Runtime.callFunctionOn", { objectId: q.objects.objectId, functionDeclaration: "function(){ return this.length; }", returnByValue: true });
    await cdp.send("Runtime.releaseObject", { objectId: q.objects.objectId }).catch(() => {});
    return n.result.value;
  };
  await cap.eval(() => { window.__protos = {}; }); // (each class's prototype: it holds no instance)
  const toHub = async () => { await cap.eval(() => window.__arcade.go("hub")); await waitReal(() => !!document.querySelector(".scr-hub [data-act=play]")); await cap.fast(120); await cap.eval(() => window.__tick(2, true)); };
  let bad = 0;
  for (const g of ["blaster", "racer", "blaster"]) {
    await cap.go(g, "2"); await cap.ask(1500); await cap.fast(120); await cap.eval(() => window.__tick(2, true));
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; window.__protos[s.constructor.name] = Object.getPrototypeOf(s); if (s.pano) window.__protos[s.pano.constructor.name] = Object.getPrototypeOf(s.pano); });
    await toHub();
    const out = {};
    for (const k of await cap.eval(() => Object.keys(window.__protos))) { out[k] = await live(k); if (out[k]) bad++; }
    console.log(`${g} closed, at the hub (its materials parked): live ${JSON.stringify(out)}`);
  }
  console.log(bad ? "FAIL: a closed game kept alive" : "every count 0: no closed game kept alive");
};
