// What a game sends to the graphics chip in play, every frame drawn (a picture goes to the chip when it is first drawn):
// each picture of a million pixels or more and each build of a picture's smaller copies after the game opened, its size
// and the frame, as the game runs from one sky into the next (Nest Egg Run's landscapes, Risk Blaster's regions). At the
// MAC tier unless KEEPTIER=1 (the Mac's richer tier, 2026-11-25).
//
//   GAME=racer STAGE=2 node arcade/tools/capture.js arcade/tools/scenarios/play-uploads.js --size 480x270 --dpr 1 --out <dir>   (FRAMES=9000 for Risk Blaster's regions; KEEPTIER=1 keeps the page's own tier, e.g. with --phone)
module.exports = async (cap) => {
  if (process.env.KEEPTIER) await cap.eval(() => { window.__noHigh = true; });
  await cap.eval(() => { window.__cap.skipDialogs = true; const G = window.__arcade.GFX; if (G.setQuality && !window.__noHigh) G.setQuality("high"); });
  console.log("tier", await cap.eval(() => window.__arcade.GFX.TIERS[window.__arcade.GFX.tier].name), "rich", await cap.eval(() => window.__arcade.GFX.rich));
  await cap.go(process.env.GAME || "racer", process.env.STAGE || "2");
  console.log("skies:", await cap.eval(() => Object.keys(window.__arcade.Assets.kept).filter((k) => k.startsWith("sky:")).map((k) => k + " " + window.__arcade.Assets.kept[k].w + (window.__arcade.Assets.kept[k].hd ? " hd" : "")).join(", ")));
  await cap.ask(2400).catch(() => {});
  await cap.eval(() => {
    const gl = window.__arcade.GFX.renderer.getContext(), H = (window.__up = []);
    for (const k of ["texImage2D", "texSubImage2D", "generateMipmap"]) {
      const o = gl[k].bind(gl);
      gl[k] = function () { const a = arguments, src = a.length === 6 ? a[5] : a.length >= 9 ? a[8] : null; const w = src && (src.naturalWidth || src.width) || (a.length >= 9 ? a[3] : 0), h = src && (src.naturalHeight || src.height) || (a.length >= 9 ? a[4] : 0); if (k === "generateMipmap" || w * h >= 1024 * 1024) H.push({ f: window.__cap.frame, k, level: a[1], w, h }); return o.apply(gl, a); };
    }
  });
  let last = null, n = 0;
  const FR = +(process.env.FRAMES || 12000);
  for (let f = 0; f < FR; f += 30) {
    const st = await cap.eval(() => { const s = window.__arcade.Scenes.cur; return { id: s.pano && s.pano.cur && s.pano.cur.id, next: s.pano && s.pano.next && s.pano.next.id, year: s.year !== undefined ? s.year : s.round && s.round.i, ask: !!(s.state === "ask" && s.round && !(s.quiz && s.quiz.sheet)), sheet: !!(s.quiz && s.quiz.sheet), over: s.state === "over" || !!document.querySelector(".scr-results") }; });
    if (st.over) { console.log("run over at frame", f); break; }
    if (st.id !== last) { console.log(`frame ${f}: year ${st.year && st.year.toFixed ? st.year.toFixed(2) : st.year}, sky ${st.id}${st.next ? " -> " + st.next : ""}`); last = st.id; }
    if (st.ask) await cap.answer("R");
    else if (st.sheet) await cap.next();
    await cap.eval((k) => window.__tick(k, true), 30); n++; // (every frame drawn: a picture is sent to the chip when it is first drawn)
  }
  const up = await cap.eval(() => window.__up);
  console.log("uploads of 1 Mpx and more, and mipmap builds, after the game opened:");
  for (const u of up) console.log(`  frame ${u.f}: ${u.k} level ${u.level === undefined ? "-" : u.level} ${u.w}x${u.h}`);
};
