// Phase 5 (D): what a session downloads, file by file, and that nothing is fetched twice. The page is served (every
// asset loads) and goes title -> hall -> each game and room -> hall, as a player would; then every file the page fetched
// is listed with how often, and each screen's arrival with what it had to wait for.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/loads.js --out <dir> --dpr 1
module.exports = async (cap) => {
  const waitReal = async (js, ms = 40000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  const fetched = () => cap.eval(() => performance.getEntriesByType("resource").filter((e) => /\/assets\//.test(e.name)).map((e) => e.name.replace(/^.*\/assets\//, "")));
  const mb = (n) => (n / 1048576).toFixed(2) + " MB";
  const sizes = await cap.eval(() => window.__arcade.Assets.files.files);
  let before = [];
  const step = async (label) => {
    const now = await fetched(), add = now.slice(before.length);
    before = now;
    console.log(`${label}: ${add.length} files, ${mb(add.reduce((a, f) => a + (sizes[f] || 0), 0))}`);
  };
  await waitReal(() => !!window.__arcade.Assets.sky("title-dusk"));
  await cap.fast(60);
  await step("title (and the hall's set, fetched behind it)");
  await cap.eval(() => window.__arcade.go("hub"));
  await waitReal(() => !!document.querySelector(".hub-name"));
  await cap.fast(200);
  await step("the hall");
  for (const [g, st] of [["blaster", "3"], ["racer", "2"], ["boss", "4"], ["memory", "3"], ["exam", "all"]]) {
    await cap.eval((x) => { if (x !== "exam") window.__arcade.show.select(x); else window.__arcade.show.examSetup(); }, g);
    await cap.fast(30);
    await cap.go(g, st);
    await cap.fast(60);
    await step(`${g} (its stage select, then the game)`);
    await cap.eval(() => window.__arcade.go("hub"));
    await cap.fast(60);
  }
  await cap.eval(() => window.__arcade.go("guide"));
  await waitReal(() => !!document.querySelector(".guide-lib"));
  await cap.fast(60);
  await step("the Strategy Guide");
  const all = await fetched(), count = {};
  all.forEach((f) => { count[f] = (count[f] || 0) + 1; });
  const twice = Object.entries(count).filter(([, n]) => n > 1);
  console.log(`the whole session: ${all.length} fetches of ${Object.keys(count).length} files, ${mb(Object.keys(count).reduce((a, f) => a + (sizes[f] || 0), 0))}; fetched more than once: ${twice.length ? twice.map(([f, n]) => f + " x" + n).join(", ") : "none"}`);
};
