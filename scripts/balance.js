// Reports the bracket depth at each top-level function boundary, to locate an unbalanced call.
const fs = require("fs");
for (const file of process.argv.slice(2)) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  let depth = 0, inStr = null, prevDepth = 0;
  const marks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (inStr) { if (c === inStr && line[j - 1] !== "\\") inStr = null; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
      if (c === "/" && line[j + 1] === "/") break;
      if ("([{".includes(c)) depth++;
      if (")]}".includes(c)) depth--;
    }
    if (/^(export )?(function|const|class) /.test(line)) {
      marks.push([i + 1, prevDepth, line.slice(0, 56)]);
    }
    prevDepth = depth;
  }
  console.log(`\n${file} — final depth ${depth}`);
  let last = 0;
  for (const [n, d, text] of marks) {
    if (d !== 0) console.log(`  line ${n}: depth ${d} before this declaration → imbalance above  | ${text}`);
    last = d;
  }
}
