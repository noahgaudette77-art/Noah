// Syntax-checks ES modules without executing them: node --experimental-vm-modules scripts/check-esm.mjs <files...>
import { readFileSync } from "node:fs";
import vm from "node:vm";
let bad = 0;
for (const file of process.argv.slice(2)) {
  try {
    new vm.SourceTextModule(readFileSync(file, "utf8"), { identifier: file });
  } catch (error) {
    bad++;
    console.error(`✗ ${file}\n  ${error.message}`);
  }
}
console.log(bad ? `${bad} file(s) failed` : `✓ ${process.argv.length - 2} file(s) OK`);
process.exit(bad ? 1 : 0);
