// Phase 8's films: the title hall's glide, and one fight, as the page draws them, frame after frame at 30 a second on
// the virtual clock (each frame the page's own two at 60), encoded to MP4 (H.264) with ffmpeg. On the tier the page
// picks for the window (a Mac's at a Mac's size).
//
//   node arcade/tools/capture.js arcade/tools/scenarios/film.js --size 1280x720 --dpr 1 --out <dir>
//
// PART=title,fight (both by default). SECONDS=12 (each film's length). FIGHT=boss:1 (or blaster:3). Writes
// film-title.mp4 and film-fight.mp4 to --out (the frames themselves are deleted).
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = (n) => !process.env.PART || process.env.PART.split(",").includes(n);
  const SECONDS = +(process.env.SECONDS || 12), N = Math.round(SECONDS * 30);
  const roll = async (name, between) => {
    const dir = path.join(cap.out, name);
    fs.mkdirSync(dir, { recursive: true });
    for (let i = 0; i < N; i++) {
      if (between) await between(i);
      const f = await cap.shot(name + "/" + String(i).padStart(4, "0"));
      if (i % 30 === 0) console.log(`  ${name}: ${i} of ${N}`, path.basename(f));
    }
    const mp4 = path.join(cap.out, "film-" + name + ".mp4");
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "30", "-i", path.join(dir, "%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "23", "-preset", "slow", "-movflags", "+faststart", mp4]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`${name}: ${N} frames, ${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB`);
  };
  await cap.eval(() => { window.__cap.skipDialogs = true; });
  if (want("title")) {
    await cap.eval(() => window.__arcade.go("title"));
    // the hall with every piece in before the film starts (its files arrive in real time)
    const ready = () => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells && s.cells.length && s.cells.every((c) => c.boss && c.ready)); };
    let ok = false;
    for (let i = 0; i < 1500 && !ok; i++) { await cap.fast(2); ok = await cap.eval(ready); if (!ok) await cap.page.waitForTimeout(100); }
    console.log("hall ready:", ok);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.t !== undefined) s.t = 0; }); // (from the glide's start)
    await roll("title");
  }
  if (want("fight")) {
    const [game, stage] = (process.env.FIGHT || "boss:1").split(":");
    await cap.go(game, stage);
    await cap.ask(1800);
    // a right answer at once, a wrong one later (the boss's strike), and a right one again, with the explanation read
    let n = 0;
    await roll("fight", async (i) => {
      if (i === 15 || i === 150 || i === 285) {
        const ask = await cap.eval(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.state === "ask" && s.round && !(s.quiz && s.quiz.sheet)); });
        if (ask) await cap.answer(n++ === 1 ? "W" : "R");
      }
      if (i === 120 || i === 255) await cap.next();
    });
  }
};
