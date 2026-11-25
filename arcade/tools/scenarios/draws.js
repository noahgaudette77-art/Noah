// The performance re-check: the draw calls and triangles a frame asks for at many moments of play, not at one. Each
// game played as the soak plays it (questions answered, one in four wrong, the explanation read, Memory Bank's cards
// turned and graded, the exam's questions answered, played again when it ends), and about every EVERY frames one whole
// frame counted (every pass: three.js counts one render call's by itself). The least, the median and the most, and at
// the moment of the most what drew them: the scene's top-level pieces by name, the post-processing's passes by their
// material, shadow maps. On the page's tier: the phone's, run with --phone at a phone's size.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/draws.js --size 440x956 --dpr 3 --phone --out <dir>
//
// GAMES=blaster,racer,boss,memory,exam  SECONDS=150 (game time each)  EVERY=45 (frames between counts)  TOP=14
// Writes draws.json and draws.md.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const GAMES = (process.env.GAMES || "blaster,racer,boss,memory,exam").split(","), SECONDS = +(process.env.SECONDS || 150), EVERY = +(process.env.EVERY || 45), TOP = +(process.env.TOP || 14);
  const out = {}, md = [`# Draws at many moments (tools/scenarios/draws.js, ${new Date().toISOString().slice(0, 10)})`, "", `Each game ${SECONDS} s of play, a whole frame counted about every ${EVERY} frames (every pass).`, ""];
  // one whole frame counted (one drawn first, as the soak does), and what drew it
  const count = () => cap.eval(() => {
    const A = window.__arcade, r = A.GFX.renderer, cur = A.Scenes.cur, main = cur && cur.scene, by = {};
    window.__tick(1, true);
    const orig = r.renderBufferDirect;
    const base = THREE.Material.prototype.customProgramCacheKey;
    const what = (o) => o.name || (o.geometry ? (o.geometry.type || "geo").replace(/(Buffer)?Geometry$/, "") + (o.isInstancedMesh ? " x" + o.count : "") : o.type);
    r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      let k;
      const mk = material.customProgramCacheKey !== base ? material.customProgramCacheKey() : material.name || material.type.replace(/Material$/, "");
      if (!scene) k = "shadow maps";
      else if (scene === main) { let o = object; while (o.parent && o.parent !== scene) o = o.parent; k = (o === object ? "" : what(o) + " > ") + what(object) + " [" + String(mk).slice(0, 40) + "]"; }
      else k = "pass: " + (material.name || (material.uniforms ? Object.keys(material.uniforms).slice(0, 2).join("+") : material.type));
      const e = by[k] || (by[k] = { n: 0, tris: 0 });
      e.n++;
      const idx = geometry.index, cnt = Math.min(idx ? idx.count : geometry.attributes.position ? geometry.attributes.position.count : 0, geometry.drawRange.count);
      e.tris += object.isMesh ? Math.round((cnt / 3) * (object.isInstancedMesh ? object.count : geometry.isInstancedBufferGeometry ? geometry.instanceCount : 1)) : 0;
      return orig.apply(this, arguments);
    };
    r.info.autoReset = false; r.info.reset();
    try { window.__tick(1, true); } finally { r.renderBufferDirect = orig; }
    const o = { draws: r.info.render.calls, tris: r.info.render.triangles, by, tier: A.GFX.tier };
    r.info.autoReset = true;
    return o;
  });
  const state = () => cap.eval(() => {
    const A = window.__arcade, s = A.Scenes.cur, m = A.UI.modal, scr = document.querySelector("#ui > .screen");
    return { st: (s && s.state) || null, ask: !!(s && s.state === "ask" && s.round && !(s.quiz && s.quiz.sheet)), sheet: !!(s && s.quiz && s.quiz.sheet), results: !!(scr && scr.classList.contains("scr-results")), modal: m ? (m.el.querySelector("h2") || {}).textContent || "modal" : null, game: !!(scr && scr.classList.contains("scr-game")) };
  });
  // the tier fixed as Setup fixes it, as tools/cost-report.js does: a phone's page (--phone) at PHONE (1), a Mac's at
  // MAC (0); TIER=n another. (Left to itself the page picks by the browser it finds, which here is not a phone's.)
  const tier = await cap.eval((t) => { const A = window.__arcade, G = A.GFX, n = t === "" ? (A.Assets.phone ? 1 : 0) : +t; if (G.setQuality) G.setQuality(["high", "medium", "low", "lowest"][n]); else if (G.setTier) { G.auto = false; G.setTier(n, "report"); } if (G.perf) G.perf.off = true; return G.tier; }, process.env.TIER || "");
  md.push(`Tier ${tier} (${["MAC", "PHONE", "SAFE", "the last step"][tier] || tier}), fixed as Setup fixes it.`, "");
  let answers = 0;
  for (const game of GAMES) {
    const stage = { blaster: "3", racer: "2", boss: "1", memory: "3" }[game];
    const start = async () => {
      if (game === "exam") { await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); }); await cap.go("exam", "all"); }
      else await cap.go(game, stage);
    };
    await start();
    const rows = [];
    let frames = 0, since = 0;
    const step = async (n) => {
      await cap.fast(n); frames += n; since += n;
      if (since >= EVERY) { since = 0; rows.push(await count()); frames += 2; if (process.env.VERBOSE && rows.length % 10 === 0) console.log(`  ${game} ${rows.length} counted, ${(frames / 60).toFixed(0)} s; last ${rows[rows.length - 1].draws} draws`); }
    };
    let loops = 0;
    while (frames < SECONDS * 60) {
      const s = await state();
      if (process.env.VERBOSE && ++loops % 50 === 0) console.log(`  ${game} loop ${loops}: ${JSON.stringify(s)}, ${frames} frames`);
      if (s.results) { await start(); continue; }
      if (s.modal === "PAUSED") { await cap.eval(() => { const A = window.__arcade; A.UI.closeModal(); A.Scenes.cur.resume(); }); continue; }
      if (s.modal) { await cap.eval(() => { const y = document.querySelector("body > .modal [data-act=yes]") || document.querySelector("body > .modal .btn, .dlg-wrap [data-act=skip]"); if (y) y.click(); }); await step(10); continue; }
      if (game === "memory" && s.game) {
        if (s.st === "front") await cap.eval(() => window.__arcade.Scenes.cur.flip());
        else if (s.st === "back") await cap.eval((n) => window.__arcade.Scenes.cur.grade(n % 4 ? "good" : "again"), answers++);
        await step(45); continue;
      }
      if (game === "exam" && s.game && s.st !== "over") {
        const last = await cap.eval((n) => { const g = window.__arcade.Scenes.cur; if (g.answers[g.i] < 0) g.pick(n % 3 ? g.rounds[g.i].correct : (g.rounds[g.i].correct + 1) % g.rounds[g.i].n); const last = g.i === g.rounds.length - 1; if (!last) g.go(1); return last; }, answers++);
        if (last) await cap.eval(() => window.__arcade.Scenes.cur.askSubmit());
        await step(150); continue;
      }
      if (s.ask) { await cap.answer(answers++ % 4 === 1 ? "W" : "R"); await step(EVERY); continue; }
      if (s.sheet) { await cap.next(); await step(15); continue; }
      await step(15);
    }
    if (!rows.length) { md.push(`## ${game}`, "", "nothing counted", ""); continue; }
    const ds = rows.map((r) => r.draws).sort((a, b) => a - b), ts = rows.map((r) => r.tris).sort((a, b) => a - b), mid = (a) => a[a.length >> 1];
    const most = rows.reduce((a, r) => (r.draws > a.draws ? r : a), rows[0]);
    const top = Object.entries(most.by).sort((a, b) => b[1].n - a[1].n).slice(0, TOP);
    const heavy = rows.reduce((a, r) => (r.tris > a.tris ? r : a), rows[0]), topT = Object.entries(heavy.by).sort((a, b) => b[1].tris - a[1].tris).slice(0, 8);
    out[game] = { n: rows.length, tier: most.tier, draws: { least: ds[0], median: mid(ds), most: ds[ds.length - 1] }, tris: { least: ts[0], median: mid(ts), most: ts[ts.length - 1] }, atMost: top, atMostTris: topT, all: rows.map((r) => [r.draws, r.tris]) };
    md.push(`## ${game} (${rows.length} frames counted, tier ${most.tier})`, "", `draws: least ${ds[0]}, median ${mid(ds)}, most ${ds[ds.length - 1]}; triangles: least ${ts[0]}, median ${mid(ts)}, most ${ts[ts.length - 1]}`, "", "At the most draws:", "", "| piece [its material] | draws | triangles |", "|---|---|---|", ...top.map(([k, v]) => `| ${k} | ${v.n} | ${v.tris} |`), "", "At the most triangles:", "", "| piece [its material] | draws | triangles |", "|---|---|---|", ...topT.map(([k, v]) => `| ${k} | ${v.n} | ${v.tris} |`), "");
    console.log(`${game}: ${rows.length} frames; draws ${ds[0]} / ${mid(ds)} / ${ds[ds.length - 1]} (least / median / most), tris ${ts[0]} / ${mid(ts)} / ${ts[ts.length - 1]}`);
    fs.writeFileSync(path.join(cap.out, "draws.json"), JSON.stringify(out, null, 1));
    fs.writeFileSync(path.join(cap.out, "draws.md"), md.join("\n"));
  }
};
