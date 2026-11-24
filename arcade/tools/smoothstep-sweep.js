#!/usr/bin/env node
/**
 * The shader lines that ask GLSL's smoothstep for a falling edge (edge0 above edge1: `smoothstep(0.3, 0.0, x)`), which
 * the GLSL specification leaves undefined (every GPU met so far computes the usual curve; the safety fix is
 * `1.0 - smoothstep(edge1, edge0, x)`). Found in Phase 5's review; swept in Phase 2's resumption.
 *
 *   node arcade/tools/smoothstep-sweep.js      (prints file:line and the call, and a count)
 *
 * It reads the template strings in src/js that look like GLSL and lists the calls whose two edges are number literals
 * in falling order (calls with computed edges are not judged: read them by hand). The page's own JavaScript smoothstep
 * (00-util.js) takes either order by design and is not listed.
 */
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "src", "js"), out = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js")).sort()) {
  const src = fs.readFileSync(path.join(dir, f), "utf8"), strings = /`([^`]*)`/g;
  let m;
  while ((m = strings.exec(src))) {
    if (!/\b(float|vec[234]|gl_|uniform|varying|void main)\b/.test(m[1])) continue;
    const calls = /smoothstep\(\s*(-?[0-9.]+)\s*,\s*(-?[0-9.]+)\s*,/g;
    let k;
    while ((k = calls.exec(m[1]))) if (parseFloat(k[1]) > parseFloat(k[2])) out.push(`${f}:${src.slice(0, m.index + 1 + k.index).split("\n").length}  smoothstep(${k[1]}, ${k[2]}, ...)`);
  }
}
console.log(out.join("\n"));
console.log(`${out.length} lines in ${new Set(out.map((x) => x.split(":")[0])).size} files`);
