// Removes named imports that no module body references. Run after a refactor.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith(".js")) files.push(full);
  }
})(process.argv[2] || "app/src");

let removed = 0;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const body = source.replace(/^import[\s\S]*?from\s+["'][^"']+["'];?$/gm, "");
  let changed = false;

  const next = source.replace(/^(import\s*\{)([^}]+)(\}\s*from\s*["'][^"']+["'];?)$/gm,
    (whole, head, names, tail) => {
      const kept = names.split(",").map((n) => n.trim()).filter(Boolean).filter((entry) => {
        const local = entry.split(/\s+as\s+/).pop().trim();
        const used = new RegExp(`\\b${local.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(body);
        if (!used) removed++;
        return used;
      });
      if (kept.length === names.split(",").filter((n) => n.trim()).length) return whole;
      changed = true;
      if (!kept.length) return "";                       // drop the statement entirely
      const single = `${head} ${kept.join(", ")} ${tail}`;
      return single.length <= 98 ? single
        : `${head}\n  ${kept.join(",\n  ")},\n${tail.replace(/^\}/, "}")}`;
    });

  if (changed) writeFileSync(file, next.replace(/\n{3,}/g, "\n\n"), "utf8");
}
console.log(`removed ${removed} unused import(s)`);
