// The performance re-check: what the page keeps in memory as a session goes on, outside what the graphics chip holds:
// the files' raw bytes (Assets.bufs), the skies decoded and kept (Assets.kept: on a phone each drawn down to 2048 x 1024
// on a canvas of its own), the sounds decoded (Sound.sprites, Sound.tracks), the page pictures. Every screen visited in
// turn; after each, what is held. Run with --phone for a phone's page (its skies at 2048).
//
//   node arcade/tools/capture.js arcade/tools/scenarios/kept.js --size 440x956 --dpr 3 --phone --out <dir>
//
// Writes kept.json and kept.md.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const rows = [];
  const waitReal = async (js, ms = 120000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await cap.page.waitForTimeout(100); } return false; };
  const held = async (at) => {
    const o = await cap.eval(async () => {
      const A = window.__arcade, As = A.Assets, S = A.Sound, MB = (b) => +(b / 1048576).toFixed(1);
      const bufs = await Promise.all(Object.entries(As.bufs).map(([k, p]) => p.then((b) => [k, b.byteLength], () => [k, 0])));
      const kind = (k) => k.split("/")[0] === "audio" ? (/music-/.test(k) ? "music" : "sound") : k.split("/")[0];
      const raw = {};
      for (const [k, n] of bufs) raw[kind(k)] = (raw[kind(k)] || 0) + n;
      const skies = Object.entries(As.kept).filter(([k]) => k.startsWith("sky:")).map(([k, s]) => { const im = s.map && s.map.image; return { k: k.slice(4), w: im ? im.width : 0, h: im ? im.height : 0, canvas: !!(im && im.getContext) }; });
      const pcm = (b) => (b ? b.length * b.numberOfChannels * 4 : 0);
      const sprites = Object.values(S.sprites || {}).reduce((a, b) => a + pcm(b), 0), tracks = Object.values(S.tracks || {}).reduce((a, t) => a + pcm(t.buf), 0);
      const ui = Object.entries(As.kept).filter(([k]) => k.startsWith("ui:")).reduce((a, [, im]) => a + (im.naturalWidth || im.width || 0) * (im.naturalHeight || im.height || 0) * 4, 0);
      const r = A.GFX.renderer.info.memory;
      return { raw: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, MB(v)])), rawMB: MB(bufs.reduce((a, [, n]) => a + n, 0)), skies: skies.map((s) => s.k + " " + s.w + "x" + s.h + (s.canvas ? " canvas" : "")), skyMB: MB(skies.reduce((a, s) => a + s.w * s.h * 4, 0)), spritesMB: MB(sprites), spriteN: Object.keys(S.sprites || {}).length, tracksMB: MB(tracks), trackN: Object.keys(S.tracks || {}).length, uiMB: MB(ui), textures: r.textures, geometries: r.geometries, phone: As.phone };
    });
    o.at = at;
    rows.push(o);
    console.log(`${at.padEnd(9)} raw ${o.rawMB} MB ${JSON.stringify(o.raw)}; skies ${o.skies.length} (${o.skyMB} MB decoded); sounds ${o.spriteN} sprites ${o.spritesMB} MB, ${o.trackN} tracks ${o.tracksMB} MB; ui ${o.uiMB} MB; chip ${o.textures} tex`);
  };
  await cap.eval(() => { window.__cap.skipDialogs = true; window.__arcade.Sound.init(); });
  const open = async (where) => {
    if (where === "title" || where === "hub") { await cap.eval((w) => window.__arcade.go(w), where); if (where === "hub") await waitReal(() => !!document.querySelector(".scr-hub [data-act=play]")); await cap.fast(600); }
    else if (where === "guide") { await cap.eval(() => window.__arcade.go("guide")); await waitReal(() => !!document.querySelector(".guide-lib")); await cap.fast(300); }
    else { await cap.go(where, { blaster: "3", racer: "2", boss: "1", memory: "3", exam: "all" }[where]); await cap.fast(900); }
    await cap.page.waitForTimeout(1500); // (music and the hall's prefetch arrive in real time)
  };
  for (const w of ["title", "hub", "blaster", "hub", "racer", "hub", "boss", "hub", "memory", "hub", "exam", "hub", "guide", "hub", "blaster", "hub"]) { await open(w); await held(w); }
  fs.writeFileSync(path.join(cap.out, "kept.json"), JSON.stringify(rows, null, 1));
  const md = ["# What the page keeps (tools/scenarios/kept.js, " + new Date().toISOString().slice(0, 10) + (rows[0] && rows[0].phone ? ", a phone's page" : "") + ")", "", "| after | raw files MB | skies decoded (MB) | sound sprites MB | music decoded MB | page pictures MB | textures on the chip |", "|---|---|---|---|---|---|---|"];
  for (const o of rows) md.push(`| ${o.at} | ${o.rawMB} ${JSON.stringify(o.raw).replace(/"/g, "")} | ${o.skies.length} (${o.skyMB}) | ${o.spritesMB} (${o.spriteN}) | ${o.tracksMB} (${o.trackN}) | ${o.uiMB} | ${o.textures} |`);
  md.push("", "Skies kept at the end: " + rows[rows.length - 1].skies.join(", "));
  // a file fetched twice is a file whose bytes were let go and then wanted again
  const twice = await cap.eval(() => { const n = {}; for (const e of performance.getEntriesByType("resource")) if (/\/assets\//.test(e.name)) n[e.name.replace(/^.*\/assets\//, "")] = (n[e.name.replace(/^.*\/assets\//, "")] || 0) + 1; return Object.entries(n).filter(([, c]) => c > 1); });
  md.push("", "Files fetched more than once: " + (twice.length ? twice.map(([k, c]) => k + " x" + c).join(", ") : "none"));
  console.log("files fetched more than once: " + (twice.length ? JSON.stringify(twice) : "none"));
  fs.writeFileSync(path.join(cap.out, "kept.md"), md.join("\n"));
};
