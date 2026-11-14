#!/usr/bin/env node
/**
 * INR Arcade sequence test: plays the games back to back on ONE page.
 *
 *   node scripts/arcade-sequence.js                 (plays arcade/index.html)
 *   node scripts/arcade-sequence.js --build <file>  (plays another build)
 *
 * arcade-regression.js opens a fresh page for every play, so it never sees a scene
 * being torn down. This test does: each game is started while the one before it is
 * still on screen, which disposes the old scene, and every step must reach its
 * playing state with nothing thrown. (A missing dispose method once left the next
 * game stuck at its intro after Risk Blaster; this is the check that catches it.)
 *
 * Needs Playwright with Chromium (software WebGL is fine).
 */
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const BUILD = path.resolve(arg("build", path.join(ROOT, "arcade/index.html")));
const SEQ = arg("seq", "blaster,racer,boss,memory,exam,blaster,blaster,hub,racer,title,boss,guide,memory").split(",");

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
  await page.route("https://cdnjs.cloudflare.com/**", (r) => r.fulfill({ path: path.join(ROOT, "arcade/vendor/three.min.js"), contentType: "application/javascript" }));
  await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ body: "", contentType: "text/css" }));
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await page.goto("file://" + BUILD + "#debug");
  await page.waitForFunction(() => window.__arcade && document.querySelector(".logo"), null, { timeout: 180000 });
  let bad = 0;
  for (const g of SEQ) {
    const n0 = errors.length;
    await page.evaluate((game) => { try { window.__arcade.go(game, "2"); } catch (e) { console.error("go threw: " + e.message); } }, g);
    let ok = false, seen = "";
    for (let i = 0; i < 140 && !ok; i++) {
      await page.evaluate(() => { const d = document.querySelector(".dlg-wrap [data-act=skip]"); if (d) d.click(); });
      const s = await page.evaluate(() => {
        const sc = window.__arcade.Scenes.cur;
        return { name: (sc && sc.constructor.name) || "", state: (sc && sc.state) || "", ans: !!document.querySelector(".answers .ans"), card: !!document.querySelector(".face"), hub: !!document.querySelector(".hub-name"), logo: !!document.querySelector(".logo"), guide: !!document.querySelector(".guide-lib, .ch-list") };
      });
      seen = `${s.name} ${s.state}`;
      if (g === "hub") ok = s.hub;
      else if (g === "title") ok = s.logo;
      else if (g === "guide") ok = s.guide;
      else if (g === "memory") ok = s.card && /Memory/.test(s.name);
      else if (g === "exam") ok = s.ans && /Exam/.test(s.name);
      else ok = s.state === "ask" && s.ans;
      if (!ok) await page.waitForTimeout(300);
    }
    await page.waitForTimeout(600);
    const errs = [...new Set(errors.slice(n0))];
    if (!ok || errs.length) bad++;
    console.log(`${g}: ${ok ? "playing" : "STUCK (" + seen + ")"}${errs.length ? "  ERRORS " + errs.slice(0, 2).join(" | ") : ""}`);
  }
  console.log(bad ? `FAILED: ${bad} of ${SEQ.length} steps` : `ALL ${SEQ.length} STEPS OK, no errors`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error("FAILED", e.message); process.exit(1); });
