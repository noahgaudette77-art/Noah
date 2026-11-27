// Boss Rush's arena seen close (the master overhaul, Phase 2's polish, 2026-11-24), for a before and an after of its
// surfaces: its steel (a pillar, the stands' faces), its crowd and its duellists' rims. Served, on the virtual clock: the
// same run gives the same frames.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/arena-look.js --size 1470x830 --dpr 1 --build <html> --out <dir>
//
// LOOK=pillar,stands,crowd,game (any of them; all by default): look-pillar (the lens held on the nearest pillar on the
// left), look-stands (on the stands' faces behind the boss), look-crowd (on the crowd over them), look-game (the game's
// own lens at its first question, the 3D strip only). Each but the last holds the lens and its focus where it says and
// the duellist out of sight: test only. Nothing here is the game.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = (n) => !process.env.LOOK || process.env.LOOK.split(",").includes(n);
  const shoot = cap.page.screenshot.bind(cap.page);
  cap.page.screenshot = (o = {}) => shoot(Object.assign({}, o, { timeout: 900000 }));
  const reseed = (k) => cap.eval((n) => window.__reseed && window.__reseed(n), 1000 + [...k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const still = async (name, o) => { await cap.shot(name, o); const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", "90", j]); fs.unlinkSync(p); console.log("  " + path.basename(j)); };
  await reseed("boss");
  await cap.go("boss", "1");
  await cap.next(); await reseed("boss-ask"); await cap.ask(1500); await cap.fast(90);
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); });
  if (want("game")) await still("look-game", { band: true });
  // (test only: the lens held where each look says, its focus there, the duellist out of the picture, the panels hidden)
  await cap.eval(() => {
    const s = window.__arcade.Scenes.cur, st = s.stage, w = st && st.wiz && st.wiz.root;
    if (st) st.frame = () => {};
    if (w) Object.defineProperty(w, "visible", { get: () => false, set: () => {} });
    for (const el of document.querySelectorAll(".scr-game .qpanel, .scr-game .answers, .scr-game .hud, .scr-game .bossbar, .scr-game .barrow")) el.style.visibility = "hidden";
    window.__look = (p, t, focus) => { s.placeCamera = function () { this.camera.position.set(p[0], p[1], p[2]); this.camera.lookAt(t[0], t[1], t[2]); }; const post = s.scene.userData.post; if (post && post.dof) post.dof.focus = focus; };
  });
  const look = async (name, p, t, focus) => { await cap.eval(([a, b, f]) => window.__look(a, b, f), [p, t, focus]); await cap.fast(4); await still(name); };
  if (want("pillar")) await look("look-pillar", [-10.6, 3.6, 9.4], [-16.6, 4.4, 2.2], 9);
  if (want("stands")) await look("look-stands", [2.2, 2.6, -14], [2.6, 2.2, -27], 13);
  if (want("crowd")) await look("look-crowd", [1.5, 5.0, -15.5], [2.6, 5.3, -30], 13);
};
