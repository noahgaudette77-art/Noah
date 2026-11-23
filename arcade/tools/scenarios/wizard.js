// Boss Rush's wizard (22h), for review: stills and strips of frames of the player's duellist in one fight (BOSS=1..11
// or all; default 1), saved as JPGs in the --out folder.
//
//   node tools/capture.js tools/scenarios/wizard.js --phone --size 440x956 --dpr 3 --insets 62,34 --out <dir>
//   PARTS=idle,cast BOSS=7 node tools/capture.js tools/scenarios/wizard.js ...
//
// Parts (PARTS=a,b,...; all by default): enter (the fight starts: it steps out of the light as the boss drops in),
// idle (the band, and the whole screen with a question up), cast (a right answer: the Arc Bolts, the Nova Lance, the
// boss reeling), ward (a wrong answer: the sputter, the boss's strike, the ward taking it), death (the last right
// answer: Starfall, the boss's fall, the wizard raising its wand), defeat (the last heart: it sinks). STEP=n sets the
// frames between stills of a strip (2 by default). The scenario sets state in the page to reach a moment quickly (how
// far the attack bar has filled, how much HP and how many hearts are left): test only. Nothing here is the game.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const NAMES = { 1: "pusher", 2: "perilmonger", 3: "specter", 4: "fineprint", 5: "golem", 6: "titan", 7: "lich", 8: "intestate", 9: "influencer", 10: "tollgate", 11: "phantom", all: "proctor" };
module.exports = async (cap) => {
  const key = process.env.BOSS || "1", tag = (key === "all" ? "12" : String(key).padStart(2, "0")) + "-" + NAMES[key], step = +(process.env.STEP || 2);
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 88) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const still = async (name, o = {}) => jpg(await cap.shot(name, o), o.q);
  const sheet = (name, files, o = {}) => {
    const out = path.join(cap.out, name + ".jpg");
    for (let q = 88; q >= 40; q -= 6) {
      execFileSync("montage", [...files, "-tile", (o.cols || 6) + "x", "-geometry", `${o.thumb || 300}x+3+3`, "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 600 * 1024) break;
    }
    if (!o.keep) files.forEach((f) => fs.unlinkSync(f));
    return out;
  };
  const frames = async (name, n, every, o = {}) => {
    o = Object.assign({ band: true }, o);
    const made = await cap.seq(name, n, every, Object.assign({}, o, { keep: true, cols: n }));
    fs.unlinkSync(made);
    return Array.from({ length: n }, (_, i) => path.join(cap.out, `${name}-${String(i).padStart(2, "0")}.png`));
  };
  // a strip, and (KEEP=1) its frames kept as JPGs beside it, for a frame-by-frame look
  const strip = async (name, n, every, o = {}) => {
    const files = await frames(name, n, every, o), out = sheet(name, files, Object.assign({ cols: 6, thumb: 300, keep: !!process.env.KEEP }, o));
    if (process.env.KEEP) files.forEach((f) => jpg(f, 86));
    return out;
  };
  const page = (fn, arg) => cap.eval(fn, arg);
  const ready = async (wait = 50, at = 0.05) => { await cap.next(); await cap.ask(2400); await page((k) => { const s = window.__arcade.Scenes.cur; s.charge = s.T * k; }, at); await cap.fast(wait); };
  const set = (o) => page((v) => { const s = window.__arcade.Scenes.cur; if (v.hp !== undefined) s.hp = Math.round(s.maxHp * v.hp); if (v.hearts !== undefined) { s.hearts = v.hearts; if (s.stage) { s.stage.debts.length = 0; s.stage.setLow(v.hearts === 1 ? 1 : 0); } } s.hud(); }, o);
  const noTrophy = () => page(() => { const T = window.__arcade.Trophies; if (T) { try { T.check(); } catch (e) {} if (T.queue) T.queue.length = 0; T.showing = false; } document.querySelectorAll(".trophy").forEach((e) => e.remove()); });

  await page(() => { window.__cap.skipDialogs = false; });
  await cap.go("boss", key);
  const info = await page(() => { const s = window.__arcade.Scenes.cur; return { staged: !!s.stage, wizard: !!(s.stage && s.stage.wiz) }; });
  console.log("boss", key, tag, info.staged ? "staged" : "NOT staged (the built-in cyborg)", info.wizard ? "· wizard" : "· NO WIZARD");
  if (has("enter")) {
    await cap.fast(4);
    await strip(tag + "-a-enter", 12, 6, { band: false, cols: 6, thumb: 250 });
  }
  await page(() => { window.__cap.skipDialogs = true; });
  await ready(80);
  if (has("idle")) {
    await still(tag + "-b-idle", { band: true, q: 92 });
    await still(tag + "-b-idle-full", { q: 88 });
  }
  if (has("cast")) {
    await ready(40, 0.3);
    await cap.answer("R");
    await strip(tag + "-c-cast", 18, step, { cols: 6 });
    await cap.fast(40);
  }
  if (has("ward")) {
    await set({ hp: 1, hearts: 3 });
    await ready(40, 0.2);
    await cap.answer("W");
    await strip(tag + "-d-ward", 24, step, { cols: 6 });
    await cap.fast(60);
  }
  if (has("death")) {
    await set({ hp: 0.04, hearts: 3 });
    await ready(40);
    await cap.answer("R");
    await cap.fast(18);
    const a = await frames(tag + "-fin", 4, 6);
    await cap.fast(14);
    await cap.next();
    const b = await frames(tag + "-die", 14, 7, { band: false });
    sheet(tag + "-e-death", [...a, ...b], { cols: 6, thumb: 250 });
  }
  if (has("defeat")) {
    await noTrophy();
    await cap.go("boss", key);
    await ready(120);
    await set({ hearts: 1 });
    await cap.answer("W");
    await cap.fast(50);
    await cap.next();
    await noTrophy();
    await strip(tag + "-f-defeat", 12, 10, { cols: 6, band: false, thumb: 250 });
  }
};
