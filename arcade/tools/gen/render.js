#!/usr/bin/env node
/**
 * Turnaround sheets for 3D candidates: every model from six views (front, three-quarter,
 * side, rear, rear three-quarter, top) in one row, with its triangle count and maps.
 *
 *   node tools/gen/render.js --out sheet.jpg [--size 420] [--stats stats.json] a.glb b.glb ...
 *
 * Needs Playwright (Chromium, software WebGL is fine) and ImageMagick's `montage`.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf("--" + k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = flag("out", "sheet.jpg"), size = +flag("size", 420), statsFile = flag("stats", null), views = flag("views", null), exposure = +flag("exposure", 1), emissiveBoost = +flag("emissive", 0), zoom = +flag("zoom", 0.6), envI = flag("envi", undefined) === undefined ? undefined : +flag("envi", 1), bg = flag("bg", undefined) === undefined ? undefined : parseInt(flag("bg", "0"), 16), norot = flag("norot", null) !== null;
const files = args.map((f) => path.resolve(f));
const ARCADE = path.join(__dirname, "..", "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".bin": "application/octet-stream", ".ktx2": "image/ktx2", ".mp3": "audio/mpeg", ".wasm": "application/wasm" };

// Serves the arcade folder, and any absolute path under /abs/ (the candidates live in the scratch directory).
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split("?")[0]);
      const file = u.startsWith("/abs/") ? u.slice(4) : path.join(ARCADE, u);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { rsp.writeHead(404).end("no"); return; }
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
      fs.createReadStream(file).pipe(rsp);
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

(async () => {
  const srv = await serve(), base = "http://127.0.0.1:" + srv.address().port;
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const n = views ? views.split(",").length : 6;
  const page = await (await browser.newContext({ viewport: { width: size * n, height: size }, deviceScaleFactor: 1 })).newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(base + "/tools/gen/render.html");
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "turn-"));
  const rows = [], all = {};
  for (const f of files) {
    const name = path.basename(f).replace(/\.glb$/, "");
    try {
      const st = await page.evaluate(([u, o]) => window.show(u, o), [base + "/abs" + f, Object.assign({ size, exposure, emissiveBoost, zoom, envI, bg, rotY: /\.tripo/.test(name) && !norot ? -Math.PI / 2 : 0 }, views ? { views: views.split(",") } : {})]);
      await page.waitForTimeout(150);
      const png = path.join(tmp, name + ".png");
      await page.locator("#c").screenshot({ path: png });
      all[name] = st;
      const label = `${name}   ${(st.tris / 1000).toFixed(0)}K tris   ${st.textures.join(", ") || "no textures"}   ${(fs.statSync(f).size / 1e6).toFixed(1)} MB   size ${st.size.join(" x ")}`;
      const row = path.join(tmp, name + ".row.png");
      execFileSync("convert", [png, "-background", "#101018", "-fill", "#e8e4ff", "-pointsize", "17", "-gravity", "NorthWest", "-splice", "0x26", "-annotate", "+8+4", label, row]);
      rows.push(row);
      console.log(label);
    } catch (e) { console.error("FAILED " + name + ": " + e.message.slice(0, 300)); }
  }
  await browser.close();
  srv.close();
  if (rows.length) execFileSync("convert", [...rows, "-append", "-quality", "88", out]);
  if (statsFile) fs.writeFileSync(statsFile, JSON.stringify(all, null, 1));
  console.log("wrote", out);
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
