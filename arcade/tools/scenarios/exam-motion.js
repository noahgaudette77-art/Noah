// The Final Exam's Proctor in motion, for the master overhaul's Phase 3 (written 2026-11-23): strips of frames at a fixed
// cadence, the same moments in any build, to compare before and after: the Proctor rising out of the dark as the exam
// opens (wake), standing over a question (idle), starting at a pick (notice: it starts at every pick alike, nothing in
// it says right or wrong), coming apart at a pass (pass) and standing over a fail (fail). PARTS=wake,idle,notice,pass,
// fail (all by default); KEEP=1 keeps each frame as a JPG beside its strip. The 3D band only (between the question and
// the answers), as tools/scenarios/motion.js does for Boss Rush.
//
//   node tools/capture.js tools/scenarios/exam-motion.js --phone --size 440x956 --dpr 1 --insets 62,34 --out <dir>
//
// The scenario fills in the answers and submits in the page to reach an ending quickly (all right for a pass, all wrong
// for a fail): test only, in the capture's own page. Nothing here is the game.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 86) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const sheet = (name, files, o = {}) => {
    const out = path.join(cap.out, name + ".jpg");
    for (let q = 88; q >= 40; q -= 6) {
      execFileSync("montage", [...files, "-tile", (o.cols || 8) + "x", "-geometry", `${o.thumb || 240}x+3+3`, "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 700 * 1024) break;
    }
    if (process.env.KEEP) files.forEach((f) => jpg(f));
    else files.forEach((f) => fs.unlinkSync(f));
    console.log("  " + name + ".jpg");
    return out;
  };
  const frames = async (name, n, every) => {
    const made = await cap.seq(name, n, every, { band: true, keep: true, cols: n });
    fs.unlinkSync(made);
    return Array.from({ length: n }, (_, i) => path.join(cap.out, `${name}-${String(i).padStart(2, "0")}.png`));
  };
  const page = (fn, arg) => cap.eval(fn, arg);
  const reseed = (n) => page((k) => window.__reseed && window.__reseed(k), n);
  // a 20-question exam, opened as the exam setup screen opens it
  const open = async () => {
    await reseed(41);
    await page(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); });
    await cap.go("exam", "all");
    const info = await page(() => { const s = window.__arcade.Scenes.cur; return { boss: !!s.boss, q: s.rounds ? s.rounds.length : 0 }; });
    console.log("exam:", info.boss ? "the Proctor is up" : "NO PROCTOR (no 3D, or its files did not arrive)", "·", info.q, "questions");
    return info;
  };
  // every answer filled in (right or wrong) and the exam handed in, as SUBMIT does once its question is confirmed
  const handIn = (right) => page((ok) => {
    const s = window.__arcade.Scenes.cur;
    s.rounds.forEach((r, i) => { s.answers[i] = ok ? r.correct : (r.correct + 1) % Math.max(2, r.n || 4); });
    const T = window.__arcade.Trophies; if (T && T.queue) T.queue.length = 0;
    s.submit();
  }, right);

  const info = await open();
  if (!info.boss) return;
  if (has("wake")) sheet("12-proctor-1-wake", await frames("exam-wake", 24, 8)); // from the moment it opens: 3.2 s
  else await cap.fast(200);
  await cap.fast(60);
  if (has("idle")) sheet("12-proctor-2-idle", await frames("exam-idle", 16, 6)); // 1.6 s over a question
  if (has("notice")) {
    await page(() => window.__arcade.Scenes.cur.pick(0));
    sheet("12-proctor-3-notice", await frames("exam-notice", 16, 3)); // 0.8 s from the pick
    await cap.fast(40);
  }
  if (has("pass")) {
    await handIn(true);
    await cap.fast(6);
    sheet("12-proctor-4-pass", await frames("exam-pass", 32, 8)); // 4.3 s of its fall
  }
  if (has("fail")) {
    await open();
    await cap.fast(260);
    await handIn(false);
    await cap.fast(6);
    sheet("12-proctor-5-fail", await frames("exam-fail", 24, 8)); // 3.2 s standing over a fail
  }
};
