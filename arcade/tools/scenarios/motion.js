// Boss Rush's movement, for the animation pass (2026-11-23): strips of frames at a fixed cadence, the same moments in
// any build, to compare before and after: the boss and the wizard idling with a question up, the boss's strike on a
// wrong answer (and the wizard's ward and flinch), the wizard's cast on a right answer (and the boss reeling), the
// boss's fall, and the wizard's own defeat. BOSS=1..11 or all (default 5); PARTS=idle,attack,hit,death,defeat (all by
// default); KEEP=1 keeps each frame as a JPG beside its strip. The 3D band only (between the question and the answers).
//
//   BOSS=5 node tools/capture.js tools/scenarios/motion.js --phone --size 440x956 --dpr 2 --insets 62,34 --out <dir>
//
// The scenario sets state in the page to reach a moment quickly (how far the attack bar has filled, how much HP and
// how many hearts are left): test only. Nothing here is the game.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
const NAMES = { 1: "pusher", 2: "perilmonger", 3: "specter", 4: "fineprint", 5: "golem", 6: "titan", 7: "lich", 8: "intestate", 9: "influencer", 10: "tollgate", 11: "phantom", all: "proctor" };
module.exports = async (cap) => {
  const key = process.env.BOSS || "5", tag = (key === "all" ? "12" : String(key).padStart(2, "0")) + "-" + NAMES[key];
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 86) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const sheet = (name, files, o = {}) => {
    const out = path.join(cap.out, name + ".jpg");
    for (let q = 88; q >= 40; q -= 6) {
      execFileSync("montage", [...files, "-tile", (o.cols || 6) + "x", "-geometry", `${o.thumb || 300}x+3+3`, "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 700 * 1024) break;
    }
    if (process.env.KEEP) files.forEach((f) => jpg(f));
    else files.forEach((f) => fs.unlinkSync(f));
    return out;
  };
  const frames = async (name, n, every) => {
    const made = await cap.seq(name, n, every, { band: true, keep: true, cols: n });
    fs.unlinkSync(made);
    return Array.from({ length: n }, (_, i) => path.join(cap.out, `${name}-${String(i).padStart(2, "0")}.png`));
  };
  const page = (fn, arg) => cap.eval(fn, arg);
  const ready = async (wait = 50, at = 0.05) => { await cap.next(); await cap.ask(2400); await page((k) => { const s = window.__arcade.Scenes.cur; s.charge = s.T * k; }, at); await cap.fast(wait); };
  const set = (o) => page((v) => { const s = window.__arcade.Scenes.cur; if (v.hp !== undefined) s.hp = Math.round(s.maxHp * v.hp); if (v.hearts !== undefined) { s.hearts = v.hearts; if (s.stage) { s.stage.debts.length = 0; s.stage.setLow(v.hearts === 1 ? 1 : 0); } } s.hud(); }, o);
  const noTrophy = () => page(() => { const T = window.__arcade.Trophies; if (T) { try { T.check(); } catch (e) {} if (T.queue) T.queue.length = 0; T.showing = false; } document.querySelectorAll(".trophy").forEach((e) => e.remove()); });

  await cap.go("boss", key);
  const info = await page(() => { const s = window.__arcade.Scenes.cur; return { staged: !!s.stage, wizard: !!(s.stage && s.stage.wiz) }; });
  console.log("boss", key, tag, info.staged ? "staged" : "NOT staged", info.wizard ? "· wizard" : "· NO WIZARD");
  await ready(80);
  if (has("idle")) sheet(tag + "-1-idle", await frames(tag + "-idle", 16, 6), { cols: 8, thumb: 240 }); // 1.6 s
  if (has("attack")) {
    await set({ hp: 1, hearts: 3 });
    await ready(40, 0.2);
    await cap.answer("W");
    sheet(tag + "-2-attack", await frames(tag + "-attack", 24, 3), { cols: 8, thumb: 240 }); // 1.2 s from the answer
    await cap.fast(60);
  }
  if (has("hit")) {
    await ready(40, 0.3);
    await cap.answer("R");
    sheet(tag + "-3-hit", await frames(tag + "-hit", 24, 3), { cols: 8, thumb: 240 }); // 1.2 s from the answer
    await cap.fast(40);
  }
  if (has("death")) {
    await set({ hp: 0.04, hearts: 3 });
    await ready(40);
    await cap.answer("R");
    await cap.fast(18);
    const a = await frames(tag + "-fin", 4, 6);
    await cap.fast(14);
    await cap.next();
    const b = await frames(tag + "-die", 20, 6);
    sheet(tag + "-4-death", [...a, ...b], { cols: 8, thumb: 240 });
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
    sheet(tag + "-5-defeat", await frames(tag + "-defeat", 16, 8), { cols: 8, thumb: 240 });
  }
};
