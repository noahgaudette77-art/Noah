#!/usr/bin/env node
/**
 * Memory Bank's flashcard shows one face at a time: a regression check, in a WebKit engine (as iPhone Safari) and in
 * Chromium. The card is turned in 3D, and on iPhone Safari the face turned away from the viewer showed through the
 * answer, mirrored: a box inside a face that the browser draws on a layer of its own (the term's scrolling box, the
 * dial's masked ring) ignored its face's backface culling. The face turned away must now be hidden outright.
 *
 * For each of several cards, front up and then turned over, it checks:
 *   1. the face turned away is hidden (visibility hidden or display none): the page never relies on 3D culling alone;
 *   2. what is drawn is that one face: a picture of the card matches a picture of it with the other face removed
 *      (any text of the other face drawn through, mirrored or not, makes them differ).
 * Fails (exit 1) if either check fails on any card in any engine.
 *
 *   node arcade/tools/card-faces.js [--engine webkit|chromium|both] [--cards 6] [--out dir] [--html index.html]
 *                                   [--url https://the.site/]   (the page as a web host serves it, in place of this folder)
 * (The 3D scene behind the page, and the served deal's card flying over it, are hidden while the card is pictured: they
 * move, and in some engines the scene shows through the card's edges; only the card's two faces are compared.)
 *
 * WebKit is not part of the pre-installed browsers: install it once into a folder of its own, and point at it:
 *   PLAYWRIGHT_BROWSERS_PATH=<dir> npx playwright install webkit && npx playwright install-deps webkit
 *   WEBKIT_BROWSERS_PATH=<dir> node arcade/tools/card-faces.js
 */
const fs = require("fs"), path = require("path"), http = require("http");
const ARCADE = path.join(__dirname, "..");
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const ENGINES = flag("engine", "both") === "both" ? ["webkit", "chromium"] : [flag("engine")], CARDS = +flag("cards", 6), OUT = flag("out", ""), HTML = flag("html", "index.html"), SITE = flag("url", "");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };

// how to launch the engine asked for (WebKit from its own folder, WEBKIT_BROWSERS_PATH, if it was installed there:
// the pre-installed browsers' folder is left as it is)
// (a web host is reached through this machine's proxy, when it has one)
function launchOptions(name) {
  const proxy = SITE && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {};
  if (name === "chromium") return { args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"], ...proxy };
  const dir = process.env.WEBKIT_BROWSERS_PATH, wk = dir && fs.existsSync(dir) && fs.readdirSync(dir).find((d) => /^webkit-\d+$/.test(d));
  return wk ? { executablePath: path.join(dir, wk, "pw_run.sh"), ...proxy } : proxy;
}

(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ARCADE, decodeURIComponent(q.url.split("?")[0])); if (!f.startsWith(ARCADE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0, "127.0.0.1");
  await new Promise((r) => srv.on("listening", r));
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  let failed = 0;
  for (const name of ENGINES) {
    let browser;
    try { browser = await require("playwright")[name].launch(launchOptions(name)); }
    catch (e) { console.log(`${name}: not available (${e.message.split("\n")[0].slice(0, 120)}): see the note at the top of this file`); failed++; continue; }
    // a phone held upright, as the owner's (430 x 932 at 3x, touch)
    const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: name !== "firefox", hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto((SITE ? SITE.replace(/#.*$/, "") : "http://127.0.0.1:" + srv.address().port + "/" + HTML) + "#debug", { timeout: 120000 });
    await page.waitForFunction(() => window.__arcade && window.__arcade.Scenes && window.__arcade.Scenes.cur, null, { timeout: 120000 });
    await page.evaluate(() => window.__arcade.go("memory", "3"));
    // (the stage's briefing is skipped; the game deals its first card)
    for (let i = 0; i < 120; i++) {
      const up = await page.evaluate(() => { const s = document.querySelector(".dlg-wrap [data-act=skip]"); if (s) s.click(); const c = window.__arcade.Scenes.cur; return !!(c && /Memory/.test(c.constructor.name) && c.state === "front" && document.querySelector(".card3d .face.front")); });
      if (up) break;
      await page.waitForTimeout(500);
    }
    const shot = async () => { const b = await page.locator(".card3d").boundingBox(); return { buf: await page.screenshot({ clip: b }), box: b }; };
    // the card at rest: its turn and its faces' switch over (this machine draws a phone's screen in software, slowly:
    // a fixed wait is not enough), and the deal's own motion done (served, the card dealt is also seen flying off the
    // deck into place, a picture laid over the page and moved by the 3D scene's clock: it must have landed)
    const settled = async () => {
      for (let i = 0; i < 80; i++) {
        const busy = await page.evaluate(() => { const c = document.querySelector(".card3d"); return !c || !!document.querySelector(".mem-fly") || c.getAnimations({ subtree: true }).some((a) => a.playState === "running" || a.playState === "pending"); });
        if (!busy) break;
        await page.waitForTimeout(250);
      }
      await page.waitForTimeout(400);
    };
    // only the card is pictured: the 3D scene behind it (and any card still flying over it) is hidden for the comparison
    const style = (css) => page.evaluate((css) => { const s = document.createElement("style"); s.dataset.check = "1"; s.textContent = css; document.head.appendChild(s); }, css);
    const unstyle = () => page.evaluate(() => document.querySelectorAll("style[data-check]").forEach((s) => s.remove()));
    // the share of the card's picture that differs, past a small tolerance, between two pictures of it (compared in
    // the page: no image library needed here)
    const differ = (a, b) => page.evaluate(async ([a, b]) => {
      const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = "data:image/png;base64," + s; });
      const [ia, ib] = await Promise.all([load(a), load(b)]), w = Math.min(ia.width, ib.width), h = Math.min(ia.height, ib.height);
      const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
      x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, w, h).data; x.clearRect(0, 0, w, h); x.drawImage(ib, 0, 0); const db = x.getImageData(0, 0, w, h).data;
      let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) > 48 || Math.abs(da[i + 1] - db[i + 1]) > 48 || Math.abs(da[i + 2] - db[i + 2]) > 48) n++;
      return n / (w * h);
    }, [a.toString("base64"), b.toString("base64")]);
    const check = async (k, side) => {
      const away = side === "front" ? "back" : "front";
      // 1. the face turned away is hidden outright
      const st = await page.evaluate((away) => { const f = document.querySelector(".card3d .face." + away), cs = getComputedStyle(f); return { visibility: cs.visibility, display: cs.display, text: f.textContent.replace(/\s+/g, " ").trim().slice(0, 50) }; }, away);
      const hidden = st.visibility === "hidden" || st.display === "none";
      // 2. what is drawn is the one face: the card's picture against its picture with the other face taken out
      await style("canvas, .mem-fly { visibility: hidden !important; }");
      await page.waitForTimeout(400);
      const a = await shot();
      await style(`.card3d .face.${away} { display: none !important; }`);
      await page.waitForTimeout(400);
      const b = await shot();
      await unstyle();
      const d = await differ(a.buf, b.buf), drawnOnce = d < 0.006;
      if (OUT) { fs.writeFileSync(path.join(OUT, `${name}-card${k}-${side}.png`), a.buf); fs.writeFileSync(path.join(OUT, `${name}-card${k}-${side}-alone.png`), b.buf); }
      const ok = hidden && drawnOnce;
      if (!ok) failed++;
      console.log(`${name} card ${k + 1} ${side} up: the ${away} face ${hidden ? "hidden" : "NOT hidden (visibility " + st.visibility + ")"}; drawn differently from the ${side} alone: ${(d * 100).toFixed(2)} % of the card${drawnOnce ? "" : "  <-- the " + away + " face shows through"}  ${ok ? "ok" : "FAIL"}`);
    };
    for (let k = 0; k < CARDS; k++) {
      await settled(); // (the deal)
      await check(k, "front");
      await page.evaluate(() => window.__arcade.Scenes.cur.flip());
      await settled(); // (the turn, 0.68 s and its overshoot, and the faces' switch at its edge-on moment)
      await check(k, "back");
      await page.evaluate(() => window.__arcade.Scenes.cur.grade("good"));
      await page.waitForTimeout(700);
    }
    if (errors.length) { console.log(`${name}: page errors: ${errors.slice(0, 3).join(" | ")}`); failed++; }
    await browser.close();
  }
  srv.close();
  console.log(failed ? `FAILED: ${failed} check(s)` : "OK: one face drawn at a time, in every engine and on every card");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAILED", e); process.exit(1); });
