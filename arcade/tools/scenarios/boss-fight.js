// Boss Rush's fight, for review: stills and strips of frames of one boss (BOSS=1..11 or all; default 1), saved as JPGs
// in the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/boss-fight.js --out arcade/docs/combat-pass/boss --dpr 2
//   BOSS=5 node arcade/tools/capture.js arcade/tools/scenarios/boss-fight.js --out arcade/docs/combat-pass/boss --dpr 2
//
// Boss 1 gets the full set (SET=full, its default): the entrance, the idle still, the telegraph and the strike, a right
// hit, a wrong answer with the boss's strike landing and the whole screen, the last heart, damage states, rage, death,
// the player's defeat, and whole-screen stills of a question and of an explanation sheet. Every other boss gets
// three files (SET=short, their default): NN-name-idle.jpg, NN-name-fight.jpg (its entrance, its attack with the
// telegraph, taking a hit) and NN-name-death.jpg. PARTS=idle,death,... keeps only some of them; KIND=0..4 makes the
// attack shown a given kind (for a boss that has more than one: 0 volley, 1 slam, 2 wave, 3 beam, 4 seekers).
// The scenario sets state in the page to reach a moment quickly (how far the attack bar has filled, how much HP and
// how many hearts are left): test only. Nothing here is part of the game.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const NAMES = { 1: "pusher", 2: "perilmonger", 3: "specter", 4: "fineprint", 5: "golem", 6: "titan", 7: "lich", 8: "intestate", 9: "influencer", 10: "tollgate", 11: "phantom", all: "proctor" };
module.exports = async (cap) => {
  const key = process.env.BOSS || "1", nn = key === "all" ? "12" : String(key).padStart(2, "0"), tag = nn + "-" + NAMES[key];
  const full = (process.env.SET || (key === "1" ? "full" : "short")) === "full";
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 88) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const still = async (name, o = {}) => jpg(await cap.shot(name, o), o.q);
  // frames set side by side as one JPG, kept under about 450 KB (at the quality that fits)
  const sheet = (name, files, o = {}) => {
    const out = path.join(cap.out, name + ".jpg");
    for (let q = 88; q >= 40; q -= 6) {
      execFileSync("montage", [...files, "-tile", (o.cols || 6) + "x", "-geometry", `${o.thumb || 300}x+3+3`, "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 440 * 1024) break;
    }
    files.forEach((f) => fs.unlinkSync(f));
    return out;
  };
  // n frames `every` frames apart, as PNGs (the first one now)
  const frames = async (name, n, every, o = {}) => {
    o = Object.assign({ band: true }, o);
    const made = await cap.seq(name, n, every, Object.assign({}, o, { keep: true, cols: n }));
    fs.unlinkSync(made);
    return Array.from({ length: n }, (_, i) => path.join(cap.out, `${name}-${String(i).padStart(2, "0")}.png`));
  };
  const strip = async (name, n, every, o = {}) => sheet(name, await frames(name, n, every, o), Object.assign({ cols: 6, thumb: 300 }, o, process.env.THUMB ? { thumb: +process.env.THUMB } : {}));
  const page = (fn, arg) => cap.eval(fn, arg);
  // a question up, `wait` frames into it, the attack bar at `at` of its length
  const ready = async (wait = 50, at = 0.05) => { await cap.next(); await cap.ask(2400); await page((k) => { const s = window.__arcade.Scenes.cur; s.charge = s.T * k; }, at); await cap.fast(wait); };
  const charge = (k) => page((q) => { const s = window.__arcade.Scenes.cur; s.charge = q >= 0 ? s.T * q : s.T + q; }, k); // (a negative k: that many seconds before the bar is full)
  const set = (o) => page((v) => { const s = window.__arcade.Scenes.cur; if (v.hp !== undefined) s.hp = Math.round(s.maxHp * v.hp); if (v.hearts !== undefined) { s.hearts = v.hearts; if (s.stage) { s.stage.debts.length = 0; s.stage.setLow(v.hearts === 1 ? 1 : 0); } } s.hud(); }, o);
  // (The stars and coins that fly to the score, the HUD's own cracks and banners are page animations, scripted or in
  // CSS, which run on the real clock: a capture steps a virtual one. For the capture they are stepped with the frames
  // instead, so a strip shows what a player sees.)
  const stepAnimations = () => page(() => {
    if (window.__stepped) return;
    window.__stepped = true;
    const animate = Element.prototype.animate, live = [], css = new WeakMap();
    Element.prototype.animate = function (fr, o) { const a = animate.call(this, fr, o); a.pause(); live.push({ a, t0: performance.now() }); return a; };
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

  await page(() => { window.__cap.skipDialogs = false; });
  await cap.go("boss", key);
  await page(() => { window.__cap.skipDialogs = false; });
  await stepAnimations();
  const staged = await page(() => !!window.__arcade.Scenes.cur.stage);
  console.log("boss", key, tag, staged ? "staged (model loaded)" : "NOT staged: the built-in cyborg");

  // ---- the entrance: the whole screen is the picture until the first question (the boss's opening words are a page
  // dialog over the foot of it, closed here once it has landed)
  let enter = null;
  if (has("enter") || has("fight")) {
    await cap.fast(34); // (after the screen's power-on, 0.55 s: the boss is high in the air, about to come down)
    // (the short set keeps the part of the screen it lands in, the size of the fight's own picture)
    enter = await frames(tag + "-enter", full ? 12 : 4, full ? 7 : 14, full ? { band: false } : { band: false, clip: { x: 0, y: 300, width: 390, height: 325 } });
  }
  await page(() => { window.__cap.skipDialogs = true; });
  if (full && enter) sheet("01-entrance", enter, { cols: 6, thumb: 250 });
  await ready(70);
  // ---- the idle still; a question, whole screen
  if (has("idle")) {
    await still(full ? "02-idle" : tag + "-idle", { band: true, q: 92 });
    if (full) await still("11-question-full", { q: 86 });
  }
  // ---- its attack: the telegraph as the bar fills, the strike, the landing (the bar is run out: a timeout)
  let atk = null;
  if (has("attack") || has("fight")) {
    await ready(30, 0.6);
    if (process.env.KIND !== undefined) await page((k) => { const s = window.__arcade.Scenes.cur; if (s.stage) { s.stage.kindN = +k; s.stage.ask(); } }, process.env.KIND);
    await charge(-2.4);
    await cap.fast(34);
    if (full) { // the telegraph, coarsely; then the strike and its landing, every other frame
      const a = await frames(tag + "-tel", 6, 15);
      await charge(-0.2);
      sheet("03-telegraph-strike", a.concat(await frames(tag + "-atk", 18, 2)), { cols: 6, thumb: 300 });
    } else {
      atk = await frames(tag + "-atk", 3, 30);
      await charge(-0.12);
      atk = atk.concat(await frames(tag + "-atk2", 9, 3));
    }
    await cap.fast(40);
    await set({ hearts: 3 });
  }
  // ---- a right answer: the burst, the lance, the boss taking it
  let hit = null;
  if (has("hit") || has("fight")) {
    await ready(40);
    await cap.answer("R");
    hit = await frames(tag + "-hit", full ? 18 : 4, full ? 3 : 8);
    if (full) { sheet("04-right-hit", hit, { cols: 6, thumb: 300 }); hit = null; }
    await cap.fast(30);
  }
  if (!full) { const got = [enter, atk, hit].filter(Boolean); if (got.length) sheet(tag + (got.length === 3 ? "-fight" : "-part"), [].concat(...got), { cols: 5, thumb: process.env.THUMB ? +process.env.THUMB : 300 }); }
  if (full) {
    // ---- a wrong answer: the shot dies on its armour, its strike comes and lands; then the whole screen
    if (has("wrong")) {
      await set({ hp: 1, hearts: 3 });
      await ready(40, 0.2);
      await cap.answer("W");
      await strip("05-wrong-strike", 18, 2, { cols: 6 });
      await cap.fast(14); // (the explanation sheet has finished coming in; the HUD's cracks are still on it)
      await still("05b-wrong-full", { q: 86 });
      await cap.fast(36);
      await still("12-explanation-full", { q: 86 });
    }
    // ---- the last heart: the red frame and the alarm
    if (has("low")) {
      await set({ hearts: 2 });
      await ready(40, 0.3);
      await cap.answer("W");
      await cap.fast(26);
      await strip("06-last-heart", 6, 12, { cols: 6, band: false, thumb: 250 });
    }
    // ---- damage states: a hole in its chest, its hand torn off and the arm hanging, the forearm gone
    if (has("damage")) {
      await set({ hearts: 3 });
      const files = [];
      for (const [i, hp] of [0.82, 0.6, 0.38].entries()) {
        await set({ hp });
        await ready(40);
        await cap.answer("R");
        await cap.fast(22);
        files.push(...(await frames("dmg" + i, 4, i === 0 ? 4 : 6)));
        await cap.fast(60);
      }
      sheet("07-damage-states", files, { cols: 6, thumb: 300 });
    }
    // ---- rage: under 35% of its HP
    if (has("rage")) {
      await cap.fast(20);
      await strip("08-rage", 12, 9, { cols: 6 });
    }
  }
  // ---- death: the finishing blow, done for, then the fall, the chain, the last blast, the reward
  if (has("death")) {
    await set({ hp: 0.04, hearts: 3 });
    await ready(40);
    await cap.answer("R");
    await cap.fast(18);
    // (the short set's strip is the whole screen: once the fight is over the question and the answers have gone and the
    // whole screen is the picture, and the fallen boss and its last blast lie below the band)
    const a = await frames(tag + "-fin", full ? 6 : 3, full ? 8 : 12, full ? {} : { band: false });
    await cap.fast(20);
    await cap.next();
    const b = await frames(tag + "-die", full ? 18 : 12, full ? 8 : 12, { band: false });
    if (full) { sheet("09a-finishing-blow", a, { cols: 6 }); sheet("09-death", b, { cols: 6, thumb: 250 }); }
    else sheet(tag + "-death", [...a, ...b], { cols: 5, thumb: 250 });
  }
  // ---- the player's defeat (a second run of the same fight: the last heart goes, the boss has the last word)
  if (full && has("defeat")) {
    // (a trophy won by the fight before, in the same page, would still be dropping in over the HUD: cleared)
    const noTrophy = () => page(() => { const T = window.__arcade.Trophies; if (T && T.queue) T.queue.length = 0; document.querySelectorAll(".trophy").forEach((e) => e.remove()); });
    await noTrophy();
    await cap.go("boss", key);
    await ready(120);
    await set({ hearts: 1 });
    await cap.answer("W");
    await cap.fast(70);
    await cap.next();
    await noTrophy();
    await strip("10-player-defeat", 12, 12, { cols: 6, band: false, thumb: 250 });
  }
};
