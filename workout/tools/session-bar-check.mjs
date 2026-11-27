// Step 1 carry-over check: the "Back to session" bar never overlaps content and never duplicates Today's card.
import { chromium, preview } from '../scripts/lib/serve.mjs';
const srv = await preview(4346);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
await p.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('tempo.v1', JSON.stringify({ version: 1, sessions: [], active: null, body: [], habits: {}, settings: { coldOpen: '2026-12-14' } })); sessionStorage.setItem('s', '1'); } });
await p.goto(`${srv.url}#/?date=2026-12-14`); await p.waitForTimeout(1500);
await p.getByRole('button', { name: /Start Upper A/ }).click(); await p.waitForTimeout(800);
const bar = () => p.locator('nav.fixed a', { hasText: 'Back to session' });
const out = {};
await p.evaluate(() => { location.hash = '/'; }); await p.waitForTimeout(900);
out.todayBar = await bar().count();
out.todayCard = await p.getByRole('button', { name: /Back to your session/ }).count();
for (const r of ['/week', '/body', '/history']) {
  await p.evaluate((h) => { location.hash = h; }, r); await p.waitForTimeout(900);
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(500);
  const barTop = (await bar().boundingBox())?.y ?? null;
  const lastBottom = await p.evaluate(() => { const els = [...document.querySelectorAll('main *')].filter((e) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).position !== 'fixed'); return Math.max(...els.map((e) => e.getBoundingClientRect().bottom)); });
  out[r] = { bar: barTop != null, barTop: barTop && Math.round(barTop), lastContentBottom: Math.round(lastBottom), clear: barTop != null && lastBottom <= barTop };
}
console.log(JSON.stringify(out, null, 1));
await b.close(); srv.stop();
