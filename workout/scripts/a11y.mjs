// axe-core accessibility pass (WCAG 2.1 AA incl. colour contrast) on every screen, plus a keyboard walk.
// Usage: npm run build && npm run a11y
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium, preview } from './lib/serve.mjs';

const axeSrc = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const srv = await preview(4321);
const browser = await chromium.launch();
const SEED = { version: 1, sessions: [], active: null, body: [], habits: {}, settings: { coldOpen: '2026-12-14' } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
await page.addInitScript((s) => { if (!sessionStorage.getItem('a')) { localStorage.setItem('tempo.v1', JSON.stringify(s)); sessionStorage.setItem('a', '1'); } }, SEED);
await page.goto(`${srv.url}#/?date=2026-12-14`);
await page.waitForTimeout(600);

async function audit(name) {
  await page.waitForTimeout(700);
  await page.addScriptTag({ content: axeSrc });
  const res = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 3).map((x) => x.target.join(' ') + ' :: ' + (x.failureSummary ?? '').split('\n').slice(1, 2).join(' ')) }));
  });
  console.log(`${res.length ? 'FAIL' : 'PASS'} ${name}${res.length ? '' : ' (0 violations)'}`);
  for (const v of res) console.log(`   - ${v.id} [${v.impact}] x${v.n}\n     ${v.sample.join('\n     ')}`);
  return res.length;
}
const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); };
let bad = 0;
bad += await audit('today');
for (const r of ['/week', '/body', '/history', '/settings', '/exercise/singleLegRdl', '/day/2026-12-16']) { await go(r); bad += await audit(r); }
await go('/');
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Start Upper A/ }).click();
bad += await audit('workout');
await page.getByRole('button', { name: 'Log set 1 without the timer' }).click();
bad += await audit('workout + rest timer');

// keyboard: tab through the workout and check focus lands on visible, named controls
await page.getByRole('button', { name: 'Skip rest' }).first().click();
await page.keyboard.press('Tab');
const seen = [];
for (let i = 0; i < 25; i++) {
  const f = await page.evaluate(() => {
    const el = document.activeElement;
    const r = el.getBoundingClientRect();
    const name = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName;
    const outline = getComputedStyle(el).outlineStyle;
    return { name, visible: r.width > 0 && r.height > 0, outline };
  });
  seen.push(f);
  await page.keyboard.press('Tab');
}
const unnamed = seen.filter((s) => !s.name || !s.visible);
console.log(`keyboard: ${seen.length} tab stops checked, ${unnamed.length} without a visible accessible name; focus ring style on stops: ${[...new Set(seen.map((s) => s.outline))].join(',')}`);
console.log('first stops:', seen.slice(0, 10).map((s) => s.name).join(' | '));
await page.evaluate(() => document.activeElement?.blur?.());
await page.keyboard.press('k');
await page.waitForTimeout(300);
console.log('(legacy K shortcut check):', await page.getByRole('button', { name: /Play demo/ }).count() > 0 ? 'yes' : 'no');
await browser.close();
srv.stop();
process.exit(bad ? 1 : 0);
