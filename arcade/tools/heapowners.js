#!/usr/bin/env node
/**
 * The array buffers (or another kind of object) of two heap snapshots of one page, each attributed to its path from the
 * page's roots (strong edges; the weak maps' own entries left out), the first named steps of it, and the difference by
 * path: where a growth between two moments of play is held (Phase 7's soak: 25 MB more each round under
 * GFX._parked.HallScene, a parked material's hook).
 *
 *   node --max-old-space-size=10000 arcade/tools/heapowners.js a.heapsnapshot b.heapsnapshot ["native system / JSArrayBufferData"] [steps]
 */
// (strong edges, the weak maps' own entries left out), the first named steps of it; the difference by path
const fs = require("fs");
const [fa, fb] = process.argv.slice(2), KIND = process.argv[4] || "native system / JSArrayBufferData", STEPS = +(process.argv[5] || 6);
function owners(file) {
  const S = JSON.parse(fs.readFileSync(file, "utf8")), m = S.snapshot.meta, F = m.node_fields.length, EF = m.edge_fields.length, types = m.node_types[0], et = m.edge_types[0];
  const N = S.nodes.length / F, first = new Uint32Array(N + 1);
  for (let n = 0, e = 0; n < N; n++) { first[n] = e; e += S.nodes[n * F + 4] * EF; first[n + 1] = e; }
  const lab = (n) => { const t = types[S.nodes[n * F]], nm = S.strings[S.nodes[n * F + 1]]; return t === "object" || t === "closure" || t === "native" || t === "synthetic" ? t + " " + nm : t; };
  const parent = new Int32Array(N).fill(-1), pedge = new Int32Array(N).fill(-1), q = new Int32Array(N);
  let h = 0, t = 0; q[t++] = 0; parent[0] = 0;
  while (h < t) {
    const n = q[h++];
    for (let e = first[n]; e < first[n + 1]; e += EF) {
      const ty = et[S.edges[e]]; if (ty === "weak") continue;
      if (ty !== "element" && ty !== "hidden") { const en = String(S.strings[S.edges[e + 1]]); if (en.indexOf("WeakMap") >= 0 || en.indexOf("part of key") >= 0) continue; }
      const to = S.edges[e + 2] / F; if (parent[to] >= 0) continue; parent[to] = n; pedge[to] = e; q[t++] = to;
    }
  }
  const by = new Map();
  for (let n = 0; n < N; n++) {
    if (lab(n) !== KIND) continue;
    const size = S.nodes[n * F + 3];
    let key = "(unreached)";
    if (parent[n] >= 0) {
      const names = []; let c = n;
      while (c !== 0) { const e = pedge[c], ty = et[S.edges[e]]; names.push(ty === "element" ? "[]" : ty === "hidden" ? "{h}" : String(S.strings[S.edges[e + 1]]).slice(0, 30)); c = parent[c]; }
      names.reverse();
      const w = names.indexOf("global_object");
      key = (w >= 0 ? names.slice(w + 1) : names).slice(0, STEPS).join(".");
    }
    const g = by.get(key) || by.set(key, { n: 0, b: 0 }).get(key); g.n++; g.b += size;
  }
  return by;
}
const A = owners(fa), B = owners(fb), rows = [];
for (const k of new Set([...A.keys(), ...B.keys()])) { const a = A.get(k) || { n: 0, b: 0 }, b = B.get(k) || { n: 0, b: 0 }; if (a.b !== b.b) rows.push({ k, db: b.b - a.b, dn: b.n - a.n, b: b.b }); }
rows.sort((p, q) => Math.abs(q.db) - Math.abs(p.db));
for (const r of rows.slice(0, 25)) console.log(`${(r.db / 1048576).toFixed(2).padStart(7)} MB ${String(r.dn).padStart(5)}  (${(r.b / 1048576).toFixed(2)} MB now)  ${r.k}`);
