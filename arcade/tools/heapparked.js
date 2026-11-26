#!/usr/bin/env node
/**
 * What GFX._parked alone keeps alive in a heap snapshot (reached from it and from nothing else), by the parked kind of
 * screen, the scope of the material hook that holds it and the captured variable that leads to it: the array buffers'
 * bytes. A parked material is kept for its shader; a hook made inside a function holds that function's scope (Phase 7).
 *
 *   node --max-old-space-size=8000 arcade/tools/heapparked.js soak-r3.heapsnapshot
 */
const fs = require("fs");
const S = JSON.parse(fs.readFileSync(process.argv[2], "utf8")), m = S.snapshot.meta, F = m.node_fields.length, EF = m.edge_fields.length, types = m.node_types[0], et = m.edge_types[0];
const N = S.nodes.length / F, first = new Uint32Array(N + 1);
for (let n = 0, e = 0; n < N; n++) { first[n] = e; e += S.nodes[n * F + 4] * EF; first[n + 1] = e; }
const name = (n) => S.strings[S.nodes[n * F + 1]], type = (n) => types[S.nodes[n * F]];
const strongEdges = function* (n) { for (let e = first[n]; e < first[n + 1]; e += EF) { const ty = et[S.edges[e]]; if (ty === "weak") continue; const nm = ty === "element" || ty === "hidden" ? S.edges[e + 1] : S.strings[S.edges[e + 1]]; if (typeof nm === "string" && (nm.indexOf("WeakMap") >= 0 || nm.indexOf("part of key") >= 0)) continue; yield { ty, nm, to: S.edges[e + 2] / F }; } };
const child = (n, nm) => { for (const x of strongEdges(n)) if (x.nm === nm) return x.to; return -1; };
let win = -1; for (let n = 0; n < N; n++) if (type(n) === "object" && name(n).startsWith("Window") && child(n, "__arcade") >= 0) { win = n; break; }
const gfx = child(child(win, "__arcade"), "GFX"), parked = child(gfx, "_parked");
// 1. reachable from the roots without going through _parked
const R0 = new Uint8Array(N), q = [0]; R0[0] = 1;
while (q.length) { const n = q.pop(); for (const x of strongEdges(n)) { if (x.to === parked) continue; if (!R0[x.to]) { R0[x.to] = 1; q.push(x.to); } } }
// 2. from _parked, only what nothing else reaches, labelled by kind / hook scope / variable
const label = new Array(N), q2 = [];
for (const k of strongEdges(parked)) if (typeof k.nm === "string" && !R0[k.to]) { label[k.to] = k.nm; q2.push(k.to); }
const scopeVars = (ctx) => { const si = child(ctx, "scope_info"); const v = []; if (si >= 0) for (const x of strongEdges(si)) if (x.ty === "hidden" && type(x.to) === "string") v.push(name(x.to)); return v.join(","); };
while (q2.length) {
  const n = q2.shift();
  for (const x of strongEdges(n)) {
    if (R0[x.to] || label[x.to] !== undefined) continue;
    let l = label[n];
    if (type(n) === "object" && name(n).startsWith("system / Context") && x.ty === "context" && label[n].indexOf(" | ") < 0) l = label[n].split(" | ")[0] + " | scope(" + scopeVars(n) + ") ." + x.nm;
    label[x.to] = l; q2.push(x.to);
  }
}
const by = new Map(); let total = 0;
for (let n = 0; n < N; n++) if (label[n] !== undefined && type(n) === "native" && name(n) === "system / JSArrayBufferData") { const b = S.nodes[n * F + 3]; total += b; const g = by.get(label[n]) || by.set(label[n], { n: 0, b: 0 }).get(label[n]); g.n++; g.b += b; }
console.log("kept by the parked materials alone: " + (total / 1048576).toFixed(2) + " MB of array buffers");
[...by.entries()].sort((a, b) => b[1].b - a[1].b).slice(0, 14).forEach(([k, g]) => console.log((g.b / 1048576).toFixed(2).padStart(7) + " MB " + String(g.n).padStart(5) + "  " + k.slice(0, 200)));
