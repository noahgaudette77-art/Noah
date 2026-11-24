// Boss Rush's arena (the master overhaul, Phase 5), for a before and an after of its rebuild list's two items. Served,
// on the virtual clock: the same run gives the same frames.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/arena.js --phone --size 440x956 --dpr 1 --insets 62,34 --out <dir>
//   node arcade/tools/capture.js arcade/tools/scenarios/arena.js --size 1470x830 --dpr 1 --out <dir>
//
// PARTS=rage (the default), crowd, or both (rage,crowd):
//   rage    the fight once the boss rages, the deck's reflection taken as the game takes it (once, calm, when the boss
//           has powered up): 10-boss-rage (the question up, the arena red), 10-boss-rage-wide (the lens drawn back as
//           its strike winds up: the deck in view), 10-boss-rage-deck (the same, the question and the answers hidden:
//           the deck under them); where the deck takes the rage, 10-boss-rage-deck-untinted (that moment again with
//           its tint held at naught: the deck as it was before)
//   crowd   the stands behind the boss seen close, the lens held on them: crowd-idle (waiting: 1.2 s), crowd-cheer (a
//           right answer: its blow lands 0.3 s on; 1.3 s), crowd-stir (a wrong one: the boss strikes; 0.8 s); each a
//           strip, its frames kept
// The scenario sets state in the page to reach a moment quickly (how much HP is left, how far the attack bar has
// filled), hides panels for the deck's still, and for the crowd holds the lens on the stands and the duellist out of
// sight: test only. Nothing here is the game.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const parts = (process.env.PARTS || "rage").split(","), has = (n) => parts.includes(n);
  // (a still in software on a busy machine can take minutes: the wait for each picture is lengthened, not its content)
  const shoot = cap.page.screenshot.bind(cap.page);
  cap.page.screenshot = (o = {}) => shoot(Object.assign({}, o, { timeout: 900000 }));
  const reseed = (k) => cap.eval((n) => window.__reseed && window.__reseed(n), 1000 + [...k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const still = async (name, o) => { await cap.shot(name, o); const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", "86", j]); fs.unlinkSync(p); console.log("  " + path.basename(j)); };
  const charge = (k) => cap.eval((v) => { const s = window.__arcade.Scenes.cur; s.charge = s.T * v; }, k);
  const open = async () => {
    await reseed("boss");
    await cap.go("boss", "1");
    await cap.next(); await reseed("boss-ask"); await cap.ask(1500); await cap.fast(90);
    // (the deck's reflection as the game has it by now: drawn once the boss has powered up, calm. See BossGame.probeNow)
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); });
  };
  if (has("rage")) {
    await open();
    // under 35% of its HP: it rages (the arena's neon, its searchlights, its mist and its crowd's rims bleed red)
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.hp = Math.round(s.maxHp * 0.3); s.hud(); });
    await charge(0.05);
    await cap.fast(180);
    await charge(0.05);
    await cap.fast(2);
    await still("10-boss-rage");
    await charge(0.86); // (its strike winding up: the lens draws back and up, the deck in view)
    await cap.fast(60);
    await still("10-boss-rage-wide");
    // the same moment with the question and the answers hidden (test only), so the deck under them shows
    await cap.eval(() => { for (const el of document.querySelectorAll(".scr-game .qpanel, .scr-game .answers")) el.style.visibility = "hidden"; });
    await still("10-boss-rage-deck");
    // (where the deck takes the rage, Phase 5: the same moment again with that tint held at naught, as it was before:
    // what the deck and the steel give back of the calm capture, unturned. Test only)
    if (await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (!s.probeTint) return false; const t = s.probeTint; s.probeTint = t.clone(); t.w = 0; return true; })) await still("10-boss-rage-deck-untinted");
  }
  if (has("crowd")) {
    await open();
    // (test only: the lens held on the stands behind the boss, its focus on them, the duellist out of the picture)
    await cap.eval(() => {
      const s = window.__arcade.Scenes.cur, st = s.stage, post = s.scene.userData.post, w = st && st.wiz && st.wiz.root;
      if (st) st.frame = () => {};
      s.placeCamera = function () { this.camera.position.set(1.5, 5.0, -15.5); this.camera.lookAt(2.6, 5.3, -30); };
      if (post && post.dof) post.dof.focus = 13;
      if (w) Object.defineProperty(w, "visible", { get: () => false, set: () => {} });
    });
    const strip = async (name, n, every) => { const f = await cap.seq(name, n, every, { band: true, keep: true, cols: 4, thumb: 440 }); console.log("  " + path.basename(f)); };
    await charge(0.05);
    await cap.fast(30);
    await strip("crowd-idle", 12, 6);
    await charge(0.3);
    await cap.answer("R");
    await strip("crowd-cheer", 20, 4);
    await cap.fast(60);
    await cap.next(); await cap.ask(1500); await cap.fast(30);
    await charge(0.3);
    await cap.answer("W");
    await strip("crowd-stir", 16, 3);
  }
};
