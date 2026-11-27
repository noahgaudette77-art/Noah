// Phase 5 (the cohesion pass): one still of every screen, whole screen, for the side-by-side sheet (the three games with a
// question up, the title, the hall, chapter select, results, Memory Bank, Final Exam, Strategy Guide).
//
//   node arcade/tools/capture.js arcade/tools/scenarios/cohesion-look.js --out <dir> --dpr 2
//   SHEET=name: the sheet's file name (default look-sheet.jpg). PART=blaster,racer,... keeps only some of them.
// CALM=1 turns Reduced effects on first (the calm path: see GFX.calm).
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const jpg = (name, q = 84) => { const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", String(q), j]); fs.unlinkSync(p); return j; };
  const still = async (name, o) => { await cap.shot(name, o); return jpg(name); };
  const part = (n) => !process.env.PART || process.env.PART.split(",").indexOf(n) >= 0;
  const waitReal = async (js, ms = 30000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  const made = [];
  const shot = async (name) => { made.push(await still(name)); };
  if (process.env.CALM) await cap.eval(() => { const A = window.__arcade; A.Store.settings.calm = true; A.GFX.applySettings(); });

  // ---- the three games, a question up, some way in
  if (part("blaster")) {
    await cap.go("blaster", "3");
    await cap.ask(1500);
    await cap.fast(150);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.tLeft = s.T * 0.62; });
    await cap.fast(30);
    await shot("01-blaster");
  }
  if (part("racer")) {
    await cap.go("racer", "2");
    await cap.ask(1500);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.world) s.world.director.t = 1e9; s.year = 28; s.skyP = 28 / 40; s.hud(); });
    for (let i = 0; i < 6; i++) { await cap.fast(50); await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, 0.4); s.lockT = 0; }); }
    await shot("02-racer");
  }
  if (part("boss")) {
    await cap.go("boss", "1");
    await cap.ask(1500);
    await cap.fast(200);
    await shot("03-boss");
  }
  // ---- the title, the hall, the menus, the quieter rooms (a player some way in)
  if (part("title")) {
    await cap.eval(() => window.__arcade.go("title"));
    await waitReal(() => !!(window.__arcade.Assets.sky("title-dusk") && window.__arcade.Assets.sky("title-dusk-b")));
    await cap.fast(400);
    await shot("04-title");
  }
  await cap.eval(() => {
    const A = window.__arcade, s = A.Store.state;
    A.Sound.init();
    Object.assign(s.boss, { 1: 3, 2: 2, 3: 1, 4: 3, 5: 1 });
    s.ach = Object.assign(s.ach || {}, { first: 1, streak5: 1, streak10: 1, boss1: 1, flawless: 1, cards50: 1, ans100: 1, exam60: 1, wave5: 1 });
    Object.assign(s.stats, { bestStreak: 12, answered: 140, correct: 118, games: 9, bestExam: 72 });
  });
  if (part("hub")) {
    await cap.eval(() => window.__arcade.go("hub"));
    await waitReal(() => !!document.querySelector(".hub-name"));
    await cap.fast(300);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.skipIntro) s.skipIntro(); });
    await cap.fast(200);
    await shot("05-hub");
  }
  if (part("select")) {
    await cap.eval(() => window.__arcade.show.select("boss"));
    await cap.fast(120);
    await shot("06-select");
  }
  if (part("results")) {
    await cap.eval(() => {
      const A = window.__arcade;
      A.show.results({ game: "boss", sel: A.makeSelection("4"), run: { correct: 6, answered: 6, bestStreak: 6, missed: [], xp0: -230, start: {} }, stars: 3, score: 18450,
        title: "STAGE CLEAR", headline: "18,450", sub: "The Fine Print falls", color: "#ff3ad4", won: ["boss6", "streak20"] }, 0);
    });
    await cap.fast(400);
    await shot("07-results");
  }
  if (part("memory")) {
    await cap.go("memory", "3");
    await cap.fast(200);
    await shot("08-memory");
  }
  if (part("exam")) {
    await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); });
    await cap.go("exam", "all");
    await cap.fast(260);
    await shot("09-exam");
  }
  if (part("guide")) {
    await cap.eval(() => window.__arcade.go("guide"));
    await waitReal(() => !!document.querySelector(".guide-lib"));
    await cap.fast(150);
    await shot("10-guide");
  }
  // the sheet: every screen side by side, two rows of five
  if (made.length > 1) {
    const out = path.join(cap.out, process.env.SHEET || "look-sheet.jpg");
    for (let q = 86; q >= 40; q -= 6) {
      execFileSync("montage", [...made, "-tile", "5x", "-geometry", "300x+4+4", "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 440 * 1024) break;
    }
  }
};
