// Risk Blaster's combat, for review: stills of the idle scene in each of the three skies, and a strip of frames for
// each moment (the ship's entrance, the demon's entrance, firing, a right hit and its hit-stop, a wrong hit, each of
// the demon's five strikes from its telegraph to its landing, taking damage with the HUD, the low-health state, the
// tail shot away, the demon done for and its death, the fighter's own death), plus full-screen stills of a question
// and of an explanation sheet, and one clean still of the scene. Saved as JPGs in the --out folder.
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
    for (let q = 88; q >= 46; q -= 6) {
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
  const heal = () => page(() => { const s = window.__arcade.Scenes.cur; s.shields = 3; s.hud(); if (s.stage) s.stage.setLow(0); });
  const region = async (i) => { await page((k) => { const s = window.__arcade.Scenes.cur; s.space.setRegion(k, 0.05); }, i); await cap.fast(36); };
  // the whole screen down to the foot of the band (the HUD, the question, the picture)
  const upper = async () => { const b = await cap.band(0); return { x: 0, y: 0, width: b.width, height: b.y + b.height }; };
  // (The stars and coins that fly to the score, and the HUD's own cracks, are page animations, which run on the real
  // clock: a capture steps a virtual one. For the capture they are stepped with the frames instead.)
  const stepAnimations = () => page(() => {
    if (window.__stepped) return;
    window.__stepped = true;
    const animate = Element.prototype.animate, live = [], css = new WeakMap();
    Element.prototype.animate = function (frames, o) { const a = animate.call(this, frames, o); a.pause(); live.push({ a, t0: performance.now() }); return a; };
    // (Phase 6: and the page's CSS animations and transitions too, as boss-fight.js steps them: unstepped, a banner's
    // entrance ran on the real clock and was over before the strip's second frame, so the wave's banner never showed)
    const step = () => {
      const now = performance.now();
      for (const x of live) { try { x.a.currentTime = now - x.t0; } catch (e) { /* gone */ } }
      if (document.getAnimations) for (const an of document.getAnimations()) {
        if (!/^CSS(Animation|Transition)$/.test(an.constructor && an.constructor.name)) continue;
        let t0 = css.get(an);
        if (t0 === undefined) { t0 = now; css.set(an, t0); an.pause(); }
        try { an.currentTime = now - t0; } catch (e) { /* gone */ }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

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
    // the hit-stop: every frame from one before the blow lands (the demon holds still for three while the burst runs)
    await cap.answer("R");
    await cap.fast(10);
    await strip("07b-hit-stop", 12, 1);
    await cap.fast(40);
    await ready();
  }
  // ---- a wrong hit: each pair of bolts dies on the drone in a dull red fizzle, and the drone locks out
  if (has("wrong")) {
    await heal();
    await page(() => { window.__arcade.Scenes.cur.enemy.atkN = 0; });
    await cap.answer("W");
    await strip("08-wrong-hit", 12, 2);
    await cap.fast(60);
    await ready();
  }
  // ---- each of the demon's strikes, from its telegraph to its landing (all of it before the sheet comes up)
  const NAMES = ["volley", "swipe", "wave", "beam", "missiles"];
  for (let k = 0; k < 5; k++) {
    if (!has("attacks") && !has(NAMES[k])) continue;
    await heal();
    await page((n) => { window.__arcade.Scenes.cur.enemy.atkN = n; }, k);
    await cap.answer("W");
    await cap.fast(2);
    await strip(String(9 + k).padStart(2, "0") + "-attack-" + NAMES[k], 24, 2, { cols: 8, thumb: 240 });
    await cap.fast(40);
    await ready();
  }
  // ---- taking damage: the claws land; the shield goes, the HUD cracks and the lost shield breaks (the screen down to the band's foot)
  if (has("damage")) {
    await heal();
    await stepAnimations();
    await page(() => { window.__arcade.Scenes.cur.enemy.atkN = 1; });
    await cap.answer("W");
    await cap.fast(20);
    await strip("14-taking-damage", 12, 2, { band: false, clip: await upper(), cols: 6, thumb: 300 });
    await cap.fast(40);
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
  // ---- breakage: the wave's fourth hit shoots its tail away (from the frame before the blow); by the eighth a wing has gone
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
  // ---- a shield lost, close: the shield comes up before the fighter and breaks apart (the band only)
  if (has("shield")) {
    await heal();
    await page(() => { window.__arcade.Scenes.cur.enemy.atkN = 0; });
    await cap.answer("W");
    await cap.until(() => { const s = window.__arcade.Scenes.cur; return !!(s.iconFX && s.iconFX.k.shield && s.iconFX.k.shield.mesh.visible); }, 300);
    await strip("23-shield-lost", 12, 2);
    await cap.fast(40);
    await ready();
  }
  // ---- the streak reaches a new tier: the bolt spins up over the fighter
  if (has("tier")) {
    await heal();
    await page(() => { const A = window.__arcade, s = A.Scenes.cur; s.run.streak = 2; A.Hype.level = 0; });
    await cap.answer("R");
    await cap.fast(10);
    await strip("22-streak-tier", 12, 5);
    await cap.fast(30);
    await ready();
  }
  // ---- the demon's death in the band only (the stars thrown out of the last blast, its brood scattering, allies
  // crossing between the waves), then the next one's entrance with its brood gathering: a lighter strip than "death"'s
  // whole screen, for a busy machine
  if (has("deathband")) {
    await heal();
    await page(() => { const s = window.__arcade.Scenes.cur; s.inWave = 9; });
    await cap.answer("R");
    await cap.until(() => !!window.__arcade.Scenes.cur.quiz.sheet, 200);
    await cap.next();
    await strip("17c-death-band", 18, 8, { cols: 6 });
    await cap.ask(1500);
    await cap.until(() => { const e = window.__arcade.Scenes.cur.enemy; return e.alive && e.inT > 0.02; }, 600);
    await strip("05-demon-entrance", 18, 7, { cols: 6 });
  }
  // ---- the demon's death, and the next one's entrance
  if (has("death")) {
    await heal();
    await stepAnimations();
    await page(() => { const s = window.__arcade.Scenes.cur; s.inWave = 9; });
    await cap.answer("R");
    await cap.until(() => !!window.__arcade.Scenes.cur.quiz.sheet, 200);
    await strip("17a-demon-critical", 12, 10); // (the wave's last blow has landed, its explanation is up: it comes apart a piece at a time)
    await cap.next();
    // (from the top of the screen to the foot of the band: the stars and coins go round the question to the score)
    await strip("17-demon-death", 24, 4, { band: false, clip: await upper(), cols: 12, thumb: 155 });
    await cap.ask(1500);
    await cap.until(() => { const e = window.__arcade.Scenes.cur.enemy; return e.alive && e.inT > 0.02; }, 600);
    await strip("05-demon-entrance", 18, 7, { cols: 6 });
  }
  // ---- the run ends: the last shield goes, and the fighter with it
  if (has("over")) {
    await ready(60);
    await page(() => { const s = window.__arcade.Scenes.cur; s.shields = 1; s.hud(); s.stage.setLow(1); s.enemy.atkN = 2; });
    await cap.answer("W");
    await cap.until(() => !!window.__arcade.Scenes.cur.quiz.sheet, 200);
    await cap.fast(60);
    await cap.next();
    await strip("21-game-over", 12, 5);
  }
};
