// Reports any route whose document is wider than the 390 px phone viewport (horizontal overflow).
// Usage: npm run build && node tools/overflow-check.mjs
import { chromium, preview } from '../scripts/lib/serve.mjs';
const srv = await preview(4331);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const routes = ['/', '/week', '/body', '/history', '/settings', '/day/2026-12-15', '/exercise/inclinePress'];
let bad = 0;
for (const r of routes) {
  await page.goto(`${srv.url}#${r}?date=2026-12-14`);
  await page.waitForTimeout(800);
  const w = await page.evaluate(() => {
    const wide = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 0.5 && getComputedStyle(e).position !== 'fixed').slice(0, 3).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)}`);
    return { sw: document.documentElement.scrollWidth, wide };
  });
  const ok = w.sw <= 390;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'WIDE'} ${r} scrollWidth=${w.sw}${ok ? '' : ' ' + w.wide.join(' | ')}`);
}
await browser.close(); srv.stop();
process.exit(bad ? 1 : 0);
