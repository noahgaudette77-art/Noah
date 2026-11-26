// The seeded randomness with the Mac's extras on and off (NORICH=1: GFX.rich held false), at the MAC tier: each game
// opened from the same seed and played the same way (right and wrong answers, its fights), then the next number the
// seeded Math.random would give and the questions it asked. With the extras drawing from their own randomness and slots,
// both runs give the same numbers.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/seeded-probe.js --size 480x270 --dpr 1 --out <dir>; then again with NORICH=1: the lines must match
module.exports = async (cap) => {
  const off = !!process.env.NORICH;
  await cap.eval((o) => { window.__cap.skipDialogs = true; if (o) Object.defineProperty(window.__arcade.GFX, "rich", { get: () => false, configurable: true }); }, off);
  for (const [game, stage] of (process.env.GAMES || "blaster:3,boss:1,racer:2").split(",").map((x) => x.split(":"))) {
    await cap.eval(() => window.__arcade.go("hub"));
    for (let i = 0; i < 600; i++) { if (await cap.eval(() => !!document.querySelector(".scr-hub [data-act=play]"))) break; await cap.page.waitForTimeout(200); }
    await cap.fast(60);
    await cap.eval(() => window.__reseed && window.__reseed(4242));
    await cap.go(game, stage);
    const qs = [];
    let built = null;
    for (let i = 0; i < 6; i++) {
      const up = await cap.ask(2400).catch(() => false);
      if (!up) { console.log(game, "no question", JSON.stringify(await cap.eval(() => { const s = window.__arcade.Scenes.cur; return { scene: s && s.constructor.name, state: s && s.state, round: !!(s && s.round), sheet: !!(s && s.quiz && s.quiz.sheet), modal: !!document.querySelector("body > .modal, .dlg-wrap"), screen: (document.querySelector("#ui > .screen") || {}).className }; }))); break; }
      if (i === 0) built = await cap.eval(() => Math.random());
      qs.push(await cap.eval(() => { const s = window.__arcade.Scenes.cur, r = s.round || s.quiz && s.quiz.round; return r && r.q ? r.q.id : r && r.id || "?"; }));
      await cap.answer(i % 3 === 1 ? "W" : "R");
      await cap.fast(240);
      await cap.next().catch(() => {});
      await cap.fast(60);
    }
    const probe = await cap.eval(() => Math.random());
    const rich = await cap.eval(() => window.__arcade.GFX.rich);
    if (built === null) { console.log(game, "did not open"); continue; }
    console.log(`${game} rich=${rich}: at its first question ${built.toFixed(12)}, after six answers ${probe.toFixed(12)}; questions ${qs.join(" ")}`);
  }
};
