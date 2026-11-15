#!/usr/bin/env node
/**
 * The regression test with the asset files loaded.
 *
 *   node tools/regress-http.js [--only blaster] [any other option of scripts/arcade-regression.js]
 *
 * scripts/arcade-regression.js opens the page from disk, where the page fetches nothing and plays with what is built
 * in. This runs the very same test (that script's own code, read from its file) with the page served over HTTP and
 * each play's models, skies and sound loaded before it starts, and compares with the same baseline. Both must print
 * IDENTICAL: the rules do not know which pictures and sounds they are being shown with.
 */
const fs = require("fs"), path = require("path"), http = require("http");
const { spawn } = require("child_process");
const ARCADE = path.join(__dirname, ".."), ROOT = path.join(ARCADE, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
let src = fs.readFileSync(path.join(ROOT, "scripts", "arcade-regression.js"), "utf8");
const swap = (a, b) => { if (!src.includes(a)) { console.error("regress-http: scripts/arcade-regression.js has changed; cannot find: " + a); process.exit(2); } src = src.replace(a, b); };
swap('const ROOT = path.join(__dirname, "..");', "const ROOT = " + JSON.stringify(ROOT) + ";");
swap('await page.goto("file://" + BUILD + "#debug");', 'await page.goto(process.env.REG_BASE + "/index.html#debug");');
swap("    await page.evaluate(`(${startPlay.toString()", "    await page.evaluate(async ([g, st]) => { const A = window.__arcade; A.Sound.init(); const p = A.Assets.need(g, A.gameAssets(g, A.makeSelection(st))); if (p) await p; window.__assetsLoaded = Object.keys(A.Assets.fresh).concat(Object.keys(A.Assets.kept), Object.keys(A.Sound.sprites)); }, [play.game, play.stage]);\n    console.log('  assets for ' + play.id + ': ' + (await page.evaluate(() => window.__assetsLoaded.join(' ') || 'none')));\n    await page.evaluate(`(${startPlay.toString()");
const tmp = path.join(require("os").tmpdir(), "arcade-regress-http-" + process.pid + ".js");
fs.writeFileSync(tmp, src);
const srv = http.createServer((req, rsp) => {
  const file = path.join(ARCADE, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ARCADE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end("not found"); return; }
  rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(rsp);
}).listen(0, "127.0.0.1", () => {
  const args = process.argv.slice(2);
  if (!args.includes("--compare")) args.push("--compare", path.join(ARCADE, "backup", "regression-baseline.json"));
  const child = spawn(process.execPath, [tmp, ...args], { stdio: "inherit", env: Object.assign({}, process.env, { REG_BASE: "http://127.0.0.1:" + srv.address().port }) });
  child.on("exit", (code) => { fs.unlinkSync(tmp); srv.close(); process.exit(code); });
});
