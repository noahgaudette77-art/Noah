#!/usr/bin/env node
/** Spend so far per provider, from the ledger, with the live balances beside it: node tools/gen/spend.js */
const L = require("./lib.js");
(async () => {
  const rows = L.readLedger(), by = {};
  for (const r of rows) {
    const p = (by[r.provider] = by[r.provider] || { calls: 0, failed: 0, cost: 0, unit: r.unit, kinds: {} });
    p.calls++;
    if (r.failed) { p.failed++; continue; }
    p.cost += r.cost || 0;
    const k = r.provider === "tripo" ? r.route : r.provider === "fal" ? r.endpoint : r.provider === "elevenlabs" ? r.route.split("?")[0].replace(/\/[A-Za-z0-9]{20}$/, "/{voice}") : "skybox";
    const q = (p.kinds[k] = p.kinds[k] || { n: 0, cost: 0 });
    q.n++; q.cost += r.cost || 0;
  }
  for (const [name, p] of Object.entries(by)) {
    console.log(`${name}: ${p.calls} calls (${p.failed} failed, not charged), ${+p.cost.toFixed(2)} ${p.unit}`);
    for (const [k, q] of Object.entries(p.kinds)) console.log(`   ${k}: ${q.n} x, ${+q.cost.toFixed(2)}`);
  }
  const safe = async (f) => { try { return JSON.stringify(await f()); } catch (e) { return "unavailable (" + e.message.slice(0, 60) + ")"; } };
  console.log("live: tripo", await safe(L.tripoBalance), "| fal $", await safe(L.falBalance), "| elevenlabs", await safe(L.elevenUsage));
})();
