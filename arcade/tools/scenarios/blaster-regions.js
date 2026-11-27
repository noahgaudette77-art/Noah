// Risk Blaster's six regions of space, one still each, the 3D band only, at the same moment in any build: for checking
// the painted sky, the rocks and the planet region by region (written for the master overhaul's Phase 5, 2026-11-24:
// a wide window's own sky centres). REGIONS=0,1,2 keeps only some (0 nebula, 1 belt, 2 orbit, 3 station, 4 graveyard,
// 5 gate). Test only: the scenario sets the region in the page.
//   node tools/capture.js tools/scenarios/blaster-regions.js --size 1470x830 --dpr 1 --out <dir>
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const want = (process.env.REGIONS || "0,1,2,3,4,5").split(",").map(Number);
  await cap.go("blaster", "3");
  await cap.ask(1500);
  await cap.fast(150);
  const names = ["nebula", "belt", "orbit", "station", "graveyard", "gate"];
  for (const i of want) {
    await cap.eval((k) => { const s = window.__arcade.Scenes.cur; s.space.setRegion(k, 0.05); s.tLeft = s.T * 0.62; }, i);
    await cap.fast(90);
    await cap.shot("region-" + i + "-" + names[i], { band: true });
  }
  for (const f of fs.readdirSync(cap.out)) if (/^region-.*\.png$/.test(f)) { require("child_process").execFileSync("convert", [path.join(cap.out, f), "-quality", "86", path.join(cap.out, f.replace(/\.png$/, ".jpg"))]); fs.unlinkSync(path.join(cap.out, f)); }
};
