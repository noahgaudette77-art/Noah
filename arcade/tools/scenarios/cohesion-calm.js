// Phase 5 (E): the calm path. Setup > Reduced effects on, and the browser asking for reduced motion (run with --reduced
// at the end): a still of each game with a question up and of the hall, then each game's right and wrong answer as
// frames, every third frame for a second and a half (20 a second: enough to see a flash of 3 a second), measured for flashes: the band cut into a 4 x 4 grid, a flash is a
// pair of opposite changes in a cell's mean relative luminance of 0.1 or more with the darker below 0.8 (as WCAG counts
// them), and the most flashes any cell shows in any one second is printed. Three or fewer is the rule.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/cohesion-calm.js --out <dir> --dpr 2 --reduced
//   PART=blaster,racer,boss,hub keeps only some of them; FLASH=0 makes the stills only (the count is slow: run it at --dpr 1).
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const sharp = require(path.join(__dirname, "..", "node_modules", "sharp"));
  const part = (n) => !process.env.PART || process.env.PART.split(",").indexOf(n) >= 0;
  const jpg = (name, q = 84) => { const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", String(q), j]); fs.unlinkSync(p); return j; };
  const waitReal = async (js, ms = 30000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  await cap.eval(() => { const A = window.__arcade; A.Store.settings.calm = true; A.GFX.applySettings(); });
  console.log("calm:", JSON.stringify(await cap.eval(() => ({ calm: window.__arcade.GFX.calm, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches }))));
  // a cell's relative luminance (sRGB to linear) from a screenshot, 4 x 4 cells
  const cells = async (buf) => {
    const { data, info } = await sharp(buf).resize(64, 64, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const out = new Array(16).fill(0);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * info.channels; out[Math.floor(y / 16) * 4 + Math.floor(x / 16)] += (0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2])) / 256; }
    return out;
  };
  // n samples, `every` frames apart (at 60 frames a second), of the band: the most flashes of any cell in any second
  const flashes = async (n = 30, every = 3) => {
    const clip = await cap.band(0), series = [];
    for (let i = 0; i < n; i++) {
      await cap.eval((k) => { window.__tick(k - 1, false); window.__tick(1, true); }, every); // (one drawn frame a sample)
      const png = await cap.page.screenshot({ clip });
      series.push(await cells(png));
      if (process.env.DEBUG && i % 15 === 0) console.log("  sample", i);
    }
    const perSec = Math.round(60 / every);
    let worst = 0;
    for (let c = 0; c < 16; c++) {
      // turning points of the cell's luminance that are 0.1 or more apart: each pair of them is a flash
      const L = series.map((s) => s[c]), ev = [];
      let lo = L[0], hi = L[0], dir = 0;
      L.forEach((v, i) => {
        if (dir >= 0 && v > hi) hi = v;
        if (dir <= 0 && v < lo) lo = v;
        if (dir >= 0 && hi - v >= 0.1 && Math.min(v, hi) < 0.8) { ev.push(i); dir = -1; lo = v; }
        else if (dir <= 0 && v - lo >= 0.1 && Math.min(v, lo) < 0.8) { ev.push(i); dir = 1; hi = v; }
      });
      for (let s = 0; s < ev.length; s++) { let k = 0; while (s + k < ev.length && ev[s + k] - ev[s] < perSec) k++; worst = Math.max(worst, Math.floor(k / 2)); }
    }
    return worst;
  };
  const game = async (g, st, setup) => {
    await cap.go(g, st);
    await cap.ask(1500);
    if (setup) await cap.eval(setup);
    await cap.fast(150);
    await cap.shot("calm-" + g);
    jpg("calm-" + g);
    if (process.env.FLASH === "0") return; // (the stills only)
    await cap.answer("R");
    const right = await flashes();
    await cap.until(() => !!(window.__arcade.Scenes.cur.quiz && window.__arcade.Scenes.cur.quiz.sheet), 600);
    await cap.next();
    await cap.ask(1500);
    await cap.fast(60);
    await cap.answer("W");
    const wrong = await flashes();
    console.log(`${g}: the most flashes in any second, any cell: right answer ${right}, wrong answer ${wrong}`);
  };
  if (part("blaster")) await game("blaster", "3");
  if (part("racer")) await game("racer", "2", () => { const s = window.__arcade.Scenes.cur; if (s.world) s.world.director.t = 1e9; });
  if (part("boss")) await game("boss", "1");
  if (part("hub")) {
    await cap.eval(() => window.__arcade.go("hub"));
    await waitReal(() => !!document.querySelector(".hub-name"));
    await cap.fast(300);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.skipIntro) s.skipIntro(); });
    await cap.fast(200);
    await cap.shot("calm-hub");
    jpg("calm-hub");
  }
};
