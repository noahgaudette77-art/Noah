// Phase 4's captures: the title, the arcade hall, the menus and the three quieter rooms, served (every asset loaded).
//   node tools/capture.js tools/scenarios/menus.js --out docs/combat-pass/menus --dpr 2
// Each still is saved as a JPG; each strip as a JPG of frames side by side. The list is in docs/combat-pass/menus/README.md.
// PART=title,hub,menus,memory,exam,guide (any of them) makes only those parts.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const jpg = (name, q = 80) => { const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", String(q), j]); fs.unlinkSync(p); return j; };
  const still = async (name, o) => { await cap.shot(name, o); return jpg(name); };
  const strip = async (name, n, every, o = {}) => { const f = await cap.seq(name, n, every, Object.assign({ thumb: 260 }, o)); fs.renameSync(f, path.join(cap.out, name + ".jpg")); };
  const part = (n) => !process.env.PART || process.env.PART.split(",").indexOf(n) >= 0;
  const waitReal = async (js, ms = 30000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };

  // ---- the title: its first two seconds (the dusk fading in over the drawn sky as it arrives), then a still
  if (part("title")) {
    await waitReal(() => !!(window.__arcade.Assets.sky("title-dusk") && window.__arcade.Assets.sky("title-dusk-b")));
    await strip("01-title-first-2s", 6, 24);
    await cap.fast(400);
    await still("02-title");
  }

  // ---- a player some way in: a few trophies, some bosses beaten, a best exam
  await cap.eval(() => {
    const A = window.__arcade, s = A.Store.state;
    A.Sound.init();
    Object.assign(s.boss, { 1: 3, 2: 2, 3: 1, 4: 3, 5: 1 });
    s.ach = Object.assign(s.ach || {}, { first: 1, streak5: 1, streak10: 1, boss1: 1, flawless: 1, cards50: 1, ans100: 1, exam60: 1, wave5: 1 });
    Object.assign(s.stats, { bestStreak: 12, answered: 140, correct: 118, games: 9, bestExam: 72 });
  });
  // ---- the hall: its first visit (the room powers on), seen from the far side of the floor, each cabinet, the stand
  if (part("hub")) {
  await cap.eval(() => window.__arcade.go("hub"));
  await waitReal(() => !!document.querySelector(".hub-name"));
  await cap.fast(300); // (the room has powered on)
  // the wide view: the camera held back at the far side of the floor, the whole row in sight
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.skipIntro(); s.zooming = true; s.dolly = -15; });
  await cap.fast(30);
  await still("03-hub-wide");
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.zooming = false; });
  await cap.fast(120);
  const at = () => cap.eval(() => [...document.querySelectorAll(".dots i")].findIndex((e) => e.classList.contains("on")));
  const names = ["blaster", "racer", "boss", "memory", "exam", "guide"];
  for (let i = 0; i < 6; i++) {
    while ((await at()) !== i) { await cap.eval(() => document.querySelector("[data-act=next]").click()); await cap.fast(8); }
    await cap.fast(150);
    await still(`04-hub-${i + 1}-${names[i]}`);
  }
  await cap.eval(() => document.querySelector("[data-act=next]").click());
  await cap.fast(170);
  await still("05-hub-trophy-stand");
  // moving from one cabinet to the next and choosing it (Boss Rush to Memory Bank, then PLAY)
  while ((await at()) !== 2) { await cap.eval(() => document.querySelector("[data-act=prev]").click()); await cap.fast(8); }
  await cap.fast(160);
  await cap.eval(() => document.querySelector("[data-act=next]").click());
  await strip("06-hub-move-and-choose", 10, 9, { cols: 10, thumb: 220 });
  await cap.eval(() => document.querySelector("[data-act=play]").click());
  await strip("06b-hub-chosen", 6, 6, { thumb: 260 });
  await cap.fast(60);
  }
  if (part("menus")) {

  // ---- chapter select (Boss Rush: the bosses' busts, stars drawn from the model)
  await cap.eval(() => window.__arcade.show.select("boss"));
  await cap.fast(120);
  await still("07-chapter-select");
  // ---- a results screen and its reward moment: stars, coins, a medal, a cup for the new best, two new trophies
  await cap.eval(() => {
    const A = window.__arcade;
    A.show.results({ game: "boss", sel: A.makeSelection("4"), run: { correct: 6, answered: 6, bestStreak: 6, missed: [], xp0: -230, start: {} }, stars: 3, score: 18450,
      title: "STAGE CLEAR", headline: "18,450", sub: "The Fine Print falls", color: "#ff3ad4", won: ["boss6", "streak20"] }, 0);
  });
  await strip("08-results-reward", 9, 9, { thumb: 240 });
  await cap.fast(60);
  await still("09-results");
  // ---- stats: rank, tiles, the trophies
  await cap.eval(() => window.__arcade.show.stats());
  await cap.fast(60);
  await cap.eval(() => { const t = document.querySelector(".trophies"); if (t) t.scrollIntoView({ block: "center" }); });
  await cap.fast(10);
  await still("10-stats");
  }

  // ---- Memory Bank: the vault, then a card banked (the coin flies up into the slot)
  if (part("memory")) {
  await cap.go("memory", "3");
  await cap.fast(200);
  await still("11-memory");
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.flip(); });
  await cap.fast(30);
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.grade("good"); });
  await strip("12-memory-banked", 10, 9, { thumb: 220, cols: 10 });
  }

  // ---- Final Exam: the examiner at its lectern under the moon, then its fall when the exam is passed
  if (part("exam")) {
  await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); });
  await cap.go("exam", "all");
  await cap.fast(260);
  await still("13-exam");
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.answers = s.rounds.map((r) => r.correct); s.submit(); });
  await strip("14-exam-passed", 10, 42, { thumb: 220, cols: 10 });
  }

  // ---- Strategy Guide: the archive, then a chapter opened (the camera turns to the shelves)
  if (part("guide")) {
  await cap.eval(() => window.__arcade.go("guide"));
  await waitReal(() => !!document.querySelector(".guide-lib"));
  await cap.fast(150);
  await still("15-guide");
  await cap.eval(() => document.querySelector("[data-act=ch]").click());
  await strip("16-guide-open-chapter", 8, 8, { thumb: 240 });
  }
};
