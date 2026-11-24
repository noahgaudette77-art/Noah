// Every shader program a screen has compiled, as text, for comparing two builds (written for the master overhaul's
// Phase 5, 2026-11-24: the exam's Proctor's skin was made a shared builder; its own programs must not change).
//   GAME=exam MATCH=exam-boss-skin node tools/capture.js tools/scenarios/shader-dump.js --phone --size 440x956 --out <dir>
// Writes <dir>/programs.txt: for each program whose cache key holds MATCH, its key, then its vertex and fragment text.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const game = process.env.GAME || "exam", match = process.env.MATCH || "";
  await cap.go(game, game === "exam" ? "all" : "2");
  await cap.fast(120);
  const out = await cap.eval((m) => {
    const r = window.__arcade.GFX.renderer, gl = r.getContext(), L = [];
    for (const p of r.info.programs || []) {
      const key = String(p.cacheKey || p.name || "");
      if (m && key.indexOf(m) < 0) continue;
      const sh = gl.getAttachedShaders(p.program) || [];
      const src = sh.map((s) => gl.getShaderSource(s));
      L.push({ key: key.slice(0, 200), src });
    }
    L.sort((a, b) => (a.key < b.key ? -1 : 1));
    return L;
  }, match);
  fs.writeFileSync(path.join(cap.out, "programs.txt"), out.map((p) => "=== " + p.key + "\n" + p.src.join("\n----\n")).join("\n\n"));
  console.log("  programs:", out.length, "matching", JSON.stringify(match));
};
