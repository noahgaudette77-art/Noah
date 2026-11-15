// Risk Blaster's combat, for review: stills of the idle scene in each of the three skies, and a strip of frames for
// each moment (the ship's entrance, the demon's entrance, firing, a right hit, a wrong hit, each of the demon's five
// strikes with its telegraph, taking damage, the low-health state, armour breakage, the demon's death), plus
// full-screen stills of a question and of an explanation sheet, and one clean still of the scene. Saved as JPGs in
// the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/blaster-combat.js --out arcade/docs/combat-pass/blaster --dpr 2
//
// PARTS=idle,fire,... keeps only some of them (see `has` below); STAGE picks the questions (default 3).
// The scenario sets state in the page to reach a moment quickly (how many shields, which strike is next, how far
// into a wave): test only. Nothing here is part of the game.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 88) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const still = async (name, o = {}) => jpg(await cap.shot(name, o), o.q);
  // a strip of frames as one JPG, kept under about 450 KB (the frames are set side by side here, at the quality that fits)
  const strip = async (name, n, every, o = {}) => {
    o = Object.assign({ band: true, cols: 6, thumb: 300 }, o, process.env.THUMB ? { thumb: +process.env.THUMB } : {});
    const made = await cap.seq(name, n, every, Object.assign({}, o, { keep: true })), out = path.join(cap.out, name + ".jpg");
    const files = Array.from({ length: n }, (_, i) => path.join(cap.out, `${name}-${String(i).padStart(2, "0")}.png`));
    for (let q = 88; q >= 52; q -= 6) {
      execFileSync("montage", [...files, "-tile", o.cols + "x", "-geometry", `${o.thumb}x+3+3`, "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 440 * 1024) break;
    }
    files.forEach((f) => fs.unlinkSync(f));
    fs.unlinkSync(made);
    return out;
  };
  const page = (fn, arg) => cap.eval(fn, arg);
  // a question up, the demon at the distance it has when `left` of the clock remains, `wait` frames of idling behind it
  const ready = async (wait = 40, left = 0.62) => { await cap.next(); await cap.ask(1500); await cap.fast(wait); await page((k) => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * k; }, left); await cap.fast(24); };
  const heal = () => page(() => { const s = window.__arcade.Scenes.cur; s.shields = 3; s.hud(); if (s.stage) s.stage.setLow(false); });
  const region = async (i) => { await page((k) => { const s = window.__arcade.Scenes.cur; s.space.setRegion(k, 0.05); }, i); await cap.fast(36); };

  await cap.go("blaster", process.env.STAGE || "3");
  // ---- the ship's entrance (the question is not up yet: the whole screen is the picture)
  if (has("shipin")) { await cap.fast(2); await strip("04-ship-entrance", 12, 7, { band: false, cols: 6, thumb: 250 }); }
  await ready(150);
  // ---- the idle scene in each sky; a question, full screen
  if (has("idle")) {
    await still("01-idle-nebula", { band: true });
    await still("18-question-full", { q: 86 });
    await region(1); await page(() => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * 0.62; });
    await still("02-idle-crimson", { band: true });
    await region(5); await page(() => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * 0.62; });
    await still("03-idle-gate", { band: true });
    await region(0); await page(() => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * 0.62; });
  }
  // ---- one clean still: the demon come close, the fighter under it
  if (has("beauty")) {
    await page(() => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * 0.3; });
    await cap.fast(50);
    await still("20-beauty", { band: true, q: 93 });
    await page(() => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * 0.62; });
    await cap.fast(30);
  }
  // ---- firing, and a right hit; the explanation sheet, full screen
  if (has("fire")) {
    await cap.answer("R");
    await strip("06-firing", 12, 1);
    await strip("07-right-hit", 12, 2);
    await cap.until(() => !!window.__arcade.Scenes.cur.quiz.sheet, 200);
    await cap.fast(20);
    await still("19-explanation-full", { q: 86 });
    await ready();
  }
  // ---- a wrong hit: the shot dies on the drone; then each of the demon's strikes, from its telegraph to its landing
  const NAMES = ["volley", "swipe", "wave", "beam", "missiles"];
  for (let k = 0; k < 5; k++) {
    if (!has("attacks") && !has(NAMES[k]) && !(k === 0 && (has("wrong") || has("damage")))) continue;
    await heal();
    await page((n) => { window.__arcade.Scenes.cur.enemy.atkN = n; }, k);
    await cap.answer("W");
    if (k === 0 && (has("wrong") || want === "all")) await strip("08-wrong-hit", 12, 2); else await cap.fast(8);
    await strip(String(9 + k).padStart(2, "0") + "-attack-" + NAMES[k], 24, 3, { cols: 8, thumb: 240 });
    if (k === 0 && (has("damage") || want === "all")) { await heal(); await page(() => { const s = window.__arcade.Scenes.cur; s.enemy.atkN = 1; s.stage.owe(); s.enemy.att = null; s.enemy.attack(); }); await cap.fast(34); await strip("14-taking-damage", 12, 2); }
    await cap.fast(30);
    await ready();
  }
  // ---- one shield left
  if (has("low")) {
    await page(() => { const s = window.__arcade.Scenes.cur; s.shields = 2; s.hud(); s.enemy.atkN = 0; });
    await cap.answer("W");
    await cap.fast(75);
    await cap.next(); await cap.ask(1500); await cap.fast(30);
    await strip("15-low-health", 12, 6);
    await heal();
    await ready();
  }
  // ---- breakage: the wave's fourth hit shoots its tail away; by the eighth a wing has gone
  if (has("break")) {
    await heal();
    await page(() => { const s = window.__arcade.Scenes.cur; s.inWave = 0; });
    for (let i = 0; i < 3; i++) { await cap.answer("R"); await cap.fast(50); await ready(10); }
    await cap.answer("R");
    await cap.fast(10);
    await strip("16-armour-breakage", 12, 3);
    for (let i = 0; i < 4; i++) { await ready(10); await page(() => { const s = window.__arcade.Scenes.cur; s.inWave = 0; }); await cap.answer("R"); await cap.fast(50); }
    await ready(60);
    await still("16b-battered", { band: true });
  }
  // ---- the demon's death, and the next one's entrance
  if (has("death")) {
    await heal();
    await page(() => { const s = window.__arcade.Scenes.cur; s.inWave = 9; });
    await cap.answer("R");
    await cap.until(() => !!window.__arcade.Scenes.cur.quiz.sheet, 200);
    await cap.fast(50);
    await still("17a-demon-critical", { band: true }); // (the wave's last blow has landed: it hangs there, breaking up, until the wave is closed)
    // (The stars and coins that fly to the score are page animations, which run on the real clock: a capture steps a
    // virtual one, and would show them already landed. For the capture they are stepped with the frames instead.)
    await page(() => {
      const animate = Element.prototype.animate, live = [];
      Element.prototype.animate = function (frames, o) { const a = animate.call(this, frames, o); a.pause(); live.push({ a, t0: performance.now() }); return a; };
      const step = () => { const now = performance.now(); for (const x of live) { try { x.a.currentTime = now - x.t0; } catch (e) { /* gone */ } } requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    await cap.next();
    // (from the top of the screen to the foot of the band: the stars and coins fly from the last blast up to the score)
    const b = await cap.band(0);
    await strip("17-demon-death", 24, 5, { band: false, clip: { x: 0, y: 0, width: b.width, height: b.y + b.height }, cols: 12, thumb: 155 });
    await cap.ask(1500);
    await cap.until(() => { const e = window.__arcade.Scenes.cur.enemy; return e.alive && e.inT > 0.02; }, 600);
    await strip("05-demon-entrance", 18, 7, { cols: 6 });
  }
};
