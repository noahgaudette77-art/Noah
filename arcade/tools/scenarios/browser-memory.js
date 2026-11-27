// What the page's own process holds, by the browser's own accounts (Chromium's memory-infra dump: V8, Blink's heap,
// PartitionAlloc, malloc, Skia's caches, the decoded-image caches, discardable memory), after a visit to Risk Blaster and
// Nest Egg Run and back in the hall.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/browser-memory.js --size 735x415 --dpr 2 --out <dir>   (Chromium only)
const fs = require("fs");
module.exports = async (cap) => {
  const b = await cap.page.context().browser().newBrowserCDPSession();
  await cap.eval(() => { window.__cap.skipDialogs = true; });
  const hub = async () => { await cap.eval(() => window.__arcade.go("hub")); for (let i = 0; i < 600; i++) { if (await cap.eval(() => !!document.querySelector(".scr-hub [data-act=play]"))) break; await cap.page.waitForTimeout(200); } await cap.fast(60); };
  for (const [g, s] of [["blaster", "3"], ["racer", "2"], ["blaster", "3"], ["racer", "2"]]) { await cap.go(g, s); await cap.ask(2400); await cap.fast(300); await hub(); }
  const chunks = [];
  b.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
  const done = new Promise((r) => b.once("Tracing.tracingComplete", r));
  await b.send("Tracing.start", { traceConfig: { includedCategories: ["disabled-by-default-memory-infra"], excludedCategories: ["*"], memoryDumpConfig: { triggers: [] } }, transferMode: "ReportEvents" });
  await cap.page.waitForTimeout(1000);
  const r = await b.send("Tracing.requestMemoryDump", { deterministic: true, levelOfDetail: "detailed" });
  await cap.page.waitForTimeout(1000);
  await b.send("Tracing.end");
  await done;
  const dumps = chunks.filter((e) => e.ph === "v" && e.args && e.args.dumps);
  const names = {}; for (const e of chunks) if (e.ph === "M" && e.name === "process_name") names[e.pid] = e.args.name;
  for (const d of dumps) {
    const pname = names[d.pid] || String(d.pid);
    if (!/Renderer|GPU/i.test(pname)) continue;
    const ad = d.args.dumps.allocators || {}, top = {};
    for (const [k, v] of Object.entries(ad)) {
      const root = k.split("/")[0], sz = v.attrs && v.attrs.size ? parseInt(v.attrs.size.value, 16) : 0;
      if (k === root) top[root] = sz;
    }
    console.log(pname, Object.entries(top).filter(([, v]) => v > 4 << 20).sort((a, x) => x[1] - a[1]).map(([k, v]) => `${k} ${(v / 1048576).toFixed(0)}`).join(", "));
    const dec = Object.entries(ad).filter(([k]) => /image|decode|discardable/i.test(k) && k.split("/").length <= 3).map(([k, v]) => `${k} ${v.attrs && v.attrs.size ? (parseInt(v.attrs.size.value, 16) / 1048576).toFixed(0) : "?"}`);
    if (dec.length) console.log("   pictures:", dec.slice(0, 12).join("; "));
  }
};
