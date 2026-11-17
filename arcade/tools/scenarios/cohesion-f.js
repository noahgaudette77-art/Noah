// Phase 5 (F): the two leftovers from the phases' lists. Risk Blaster: the demon come close over the fighter (its tail
// is carried back and aside, clear of the canopy). Nest Egg Run: out of the tunnel (through its mouth the sky beyond and
// the road under it, where there was a flat pale board). Saved as JPGs in the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/cohesion-f.js --out <dir> --dpr 2
//   PARTS=tail,tunnel keeps only one of them.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 88) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const strip = async (name, n, every, o = {}) => {
    o = Object.assign({ band: true, cols: 6, thumb: 300 }, o);
    const made = await cap.seq(name, n, every, Object.assign({}, o, { keep: true })), out = path.join(cap.out, name + ".jpg");
    const files = Array.from({ length: n }, (_, i) => path.join(cap.out, `${name}-${String(i).padStart(2, "0")}.png`));
    for (let q = 88; q >= 40; q -= 6) {
      execFileSync("montage", [...files, "-tile", o.cols + "x", "-geometry", `${o.thumb}x+3+3`, "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 440 * 1024) break;
    }
    files.forEach((f) => fs.unlinkSync(f));
    fs.unlinkSync(made);
    return out;
  };
  const page = (fn, arg) => cap.eval(fn, arg);
  if (has("tail")) {
    await cap.go("blaster", "3");
    await cap.ask(1500);
    await cap.fast(150);
    for (const [k, name] of [[0.3, "tail-close"], [0.08, "tail-closest"]]) {
      await page((x) => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * x; }, k);
      await cap.fast(60);
      jpg(await cap.shot(name, { band: true }));
    }
  }
  if (has("tunnel")) {
    await cap.go("racer", "2");
    await cap.ask(1500);
    await page(() => { const s = window.__arcade.Scenes.cur; if (s.world) s.world.director.t = 1e9; });
    const hold = () => page(() => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, 0.3); s.lockT = 0; });
    const to = (y) => page((yr) => { const s = window.__arcade.Scenes.cur; s.year = yr; s.skyP = yr / 40; s.hud(); }, y);
    await to(6); for (let i = 0; i < 6; i++) { await cap.fast(50); await hold(); }
    await to(7); for (let i = 0; i < 6; i++) { await cap.fast(50); await hold(); }
    await to(8);
    await strip("tunnel-way-out", 12, 9);
  }
};
