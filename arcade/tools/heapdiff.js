#!/usr/bin/env node
/**
 * Two heap snapshots (Chromium's .heapsnapshot, e.g. tools/scenarios/soak.js with SNAP=1) compared: the live objects of
 * each kind (an object's constructor, an array, a closure's name, a string) in each, and what grew from the first to
 * the second, by count and by bytes. What grows round after round at the same moment of play is what is kept.
 *
 *   node arcade/tools/heapdiff.js a.heapsnapshot b.heapsnapshot [--top 30]
 */
const fs = require("fs");
const args = process.argv.slice(2), TOP = +(args.includes("--top") ? args[args.indexOf("--top") + 1] : 30);
const load = (file) => {
  const s = JSON.parse(fs.readFileSync(file, "utf8")), m = s.snapshot.meta, F = m.node_fields.length, types = m.node_types[0];
  const iType = m.node_fields.indexOf("type"), iName = m.node_fields.indexOf("name"), iSize = m.node_fields.indexOf("self_size");
  const by = new Map(), n = s.nodes;
  for (let i = 0; i < n.length; i += F) {
    const type = types[n[i + iType]];
    if (type === "hidden" || type === "synthetic") continue;
    const key = type === "object" || type === "closure" || type === "native" ? type + " " + s.strings[n[i + iName]] : type;
    const e = by.get(key) || by.set(key, { n: 0, b: 0 }).get(key);
    e.n++; e.b += n[i + iSize];
  }
  return by;
};
const a = load(args[0]), b = load(args[1]), rows = [];
for (const [k, e] of b) { const o = a.get(k) || { n: 0, b: 0 }; if (e.n !== o.n || e.b !== o.b) rows.push({ k, dn: e.n - o.n, db: e.b - o.b, n: e.n }); }
let total = 0; for (const r of rows) total += r.db;
console.log(`grew by ${(total / 1048576).toFixed(2)} MB in all; the most by bytes:`);
rows.sort((p, q) => q.db - p.db).slice(0, TOP).forEach((r) => console.log(`${String(r.db).padStart(10)} B ${String(r.dn).padStart(7)} more  (${r.n} now)  ${r.k.slice(0, 90)}`));
