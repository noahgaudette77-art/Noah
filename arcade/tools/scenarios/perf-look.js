// The performance pass (the owner, 2026-11-22): what smoothness costs the look. The title hall as a phone draws it,
// from the polish pass's scenario (its glide early, half way, at the end, and one cell close): before, as a phone drew
// it (MEDIUM at 2x the page's pixels: where the old AUTO started a phone), and now (SMOOTH: MEDIUM at 1.75x, AUTO's
// start on a phone).
//
//   node arcade/tools/capture.js arcade/tools/scenarios/perf-look.js --phone --build <before.html> --out <dir>/before --size 440x956 --dpr 3 --insets 62,34
//   SCALE=0.875 node arcade/tools/capture.js arcade/tools/scenarios/perf-look.js --phone --out <dir>/after --size 440x956 --dpr 3 --insets 62,34
//
// At --dpr 3 a still is the phone's own pixels (1320 x 2868): the scene drawn at 2x or 1.75x and stretched to the
// screen, as the phone stretches it. PART as in polish.js (default title,cell). Test only: nothing here is the game's.
const polish = require("./polish.js");
module.exports = async (cap) => {
  const scale = +process.env.SCALE || 0;
  await cap.eval((sc) => {
    const G = window.__arcade.GFX;
    if (G.setQuality) G.setQuality("medium"); else { G.auto = false; G.setTier(1, "capture"); } // (an automated page keeps its first tier: set as Setup sets it)
    if (sc) { G.scale = sc; G.resize(); }
  }, scale);
  console.log("drawn at", await cap.eval(() => { const G = window.__arcade.GFX; return G.TIERS[G.tier].name + " " + G.scenePR().toFixed(2) + "x"; }));
  if (!process.env.PART) process.env.PART = "title,cell";
  await polish(cap);
};
