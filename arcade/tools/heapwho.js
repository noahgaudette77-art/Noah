#!/usr/bin/env node
/**
 * What keeps the objects that a later heap snapshot has and an earlier one did not (Chromium .heapsnapshot files of
 * one page, e.g. tools/scenarios/soak.js with SNAP=1): the new objects of a kind (by default the array buffers' data),
 * each followed up its retainers to the page's own objects, and grouped by that path, the largest first.
 *
 *   node --max-old-space-size=6000 arcade/tools/heapwho.js a.heapsnapshot b.heapsnapshot ["native system / JSArrayBufferData"] [--depth 9]
 */
const fs = require("fs");
const args = process.argv.slice(2), KIND = args[2] && !args[2].startsWith("--") ? args[2] : "native system / JSArrayBufferData";
const DEPTH = +(args.includes("--depth") ? args[args.indexOf("--depth") + 1] : 9);
const load = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const label = (s, i, F, types) => { const t = types[s.nodes[i]]; const nm = s.strings[s.nodes[i + 1]]; return t === "object" || t === "closure" || t === "native" ? t + " " + nm : t; };
// the earlier snapshot's ids of the kind
const A = load(args[0]);
const fa = A.snapshot.meta.node_fields.length, ta = A.snapshot.meta.node_types[0], seen = new Set();
for (let i = 0; i < A.nodes.length; i += fa) if (label(A, i, fa, ta) === KIND) seen.add(A.nodes[i + 2]);
// the later one: the new of the kind, and every edge turned round
const B = load(args[1]), m = B.snapshot.meta, F = m.node_fields.length, EF = m.edge_fields.length, types = m.node_types[0], etypes = m.edge_types[0];
const N = B.nodes.length / F, firstEdge = new Uint32Array(N + 1);
for (let n = 0, e = 0; n < N; n++) { firstEdge[n] = e; e += B.nodes[n * F + 4] * EF; firstEdge[n + 1] = e; }
const revCount = new Uint32Array(N);
for (let e = 0; e < B.edges.length; e += EF) revCount[B.edges[e + 2] / F]++;
const revStart = new Uint32Array(N + 1); for (let n = 0; n < N; n++) revStart[n + 1] = revStart[n] + revCount[n];
const rev = new Uint32Array(revStart[N]), fill = revStart.slice(0, N), revEdge = new Uint32Array(revStart[N]);
for (let n = 0; n < N; n++) for (let e = firstEdge[n]; e < firstEdge[n + 1]; e += EF) { const to = B.edges[e + 2] / F; rev[fill[to]] = n; revEdge[fill[to]++] = e; }
const groups = new Map();
let count = 0, bytes = 0;
for (let n = 0; n < N; n++) {
  const i = n * F;
  if (label(B, i, F, types) !== KIND || seen.has(B.nodes[i + 2])) continue;
  count++; bytes += B.nodes[i + 3];
  // up the retainers: at each step the first that is not a weak edge and not the snapshot's own roots
  const path = []; let cur = n;
  const visited = new Set([n]);
  for (let d = 0; d < DEPTH; d++) {
    let next = -1, how = "";
    for (let r = revStart[cur]; r < revStart[cur + 1]; r++) {
      const from = rev[r], e = revEdge[r], et = etypes[B.edges[e]];
      if (et === "weak" || visited.has(from)) continue;
      const t = types[B.nodes[from * F]];
      if (t === "synthetic") continue;
      next = from; how = et === "element" || et === "hidden" ? "[" + B.edges[e + 1] + "]" : String(B.strings[B.edges[e + 1]]);
      break;
    }
    if (next < 0) break;
    visited.add(next);
    path.push(label(B, next * F, F, types).slice(0, 40) + "." + how);
    cur = next;
  }
  const key = path.join(" <- ");
  const g = groups.get(key) || groups.set(key, { n: 0, b: 0 }).get(key);
  g.n++; g.b += B.nodes[i + 3];
}
console.log(`${count} new ${KIND}, ${(bytes / 1048576).toFixed(2)} MB; kept by:`);
[...groups.entries()].sort((p, q) => q[1].b - p[1].b).slice(0, 14).forEach(([k, g]) => console.log(`${(g.b / 1048576).toFixed(2).padStart(7)} MB ${String(g.n).padStart(5)} x  ${k.slice(0, 700)}`));
