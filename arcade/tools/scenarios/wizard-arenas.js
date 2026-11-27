// Boss Rush's wizard against every arena: for each of the twelve bosses, a question up and the wizard casting at it
// (a right answer, a few frames in: its arm out, the bolts in flight), the band only; then one sheet of all twelve.
//
//   node tools/capture.js tools/scenarios/wizard-arenas.js --phone --size 440x956 --dpr 1 --insets 62,34 --out <dir>
//   BOSSES=1,7,all ...   (some of them)
// The scenario sets how far the attack bar has filled: test only. Nothing here is the game.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const keys = (process.env.BOSSES || "1,2,3,4,5,6,7,8,9,10,11,all").split(","), files = [];
  const page = (fn, arg) => cap.eval(fn, arg);
  for (const key of keys) {
    await page(() => { window.__cap.skipDialogs = true; });
    await cap.go("boss", key);
    await cap.next(); await cap.ask(2400);
    await page(() => { const s = window.__arcade.Scenes.cur; s.charge = s.T * 0.3; });
    await cap.fast(60);
    const info = await page(() => { const s = window.__arcade.Scenes.cur; return { staged: !!s.stage, wizard: !!(s.stage && s.stage.wiz) }; });
    console.log("boss", key, info.staged ? "staged" : "NOT staged", info.wizard ? "· wizard" : "· NO WIZARD");
    await cap.answer("R");
    await cap.fast(+(process.env.AT || 7));
    const png = await cap.shot("arena-" + String(key).padStart(2, "0"), { band: true });
    const jpg = png.replace(/\.png$/, ".jpg");
    execFileSync("convert", [png, "-quality", "88", jpg]); fs.unlinkSync(png);
    files.push(jpg);
    await cap.fast(30);
  }
  const out = path.join(cap.out, "wizard-arenas.jpg");
  for (let q = 88; q >= 40; q -= 6) {
    execFileSync("montage", [...files, "-tile", "4x", "-geometry", "330x+3+3", "-background", "#101018", "-quality", String(q), out]);
    if (fs.statSync(out).size <= 900 * 1024) break;
  }
  console.log("wrote", out);
};
