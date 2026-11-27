// Renders 3 frames of every exercise demo into one image: shots/contact-sheet.png
// Usage: npm run build && npm run contact-sheet   (uses `vite preview`)
import { mkdirSync } from 'node:fs';
import { chromium, preview } from './lib/serve.mjs';

const srv = await preview(4319);
mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1728, height: 1000 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()));
  const only = process.argv[2] ? `?only=${process.argv[2]}` : '';
  await page.goto(`${srv.url}#/dev/contact-sheet${only}`);
  await page.waitForSelector('#sheet [data-demo]', { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  const out = process.argv[3] ?? 'shots/contact-sheet.png';
  await page.locator('#sheet').screenshot({ path: out });
  const fails = await page.locator('#sheet .text-caution').count();
  console.log(`wrote ${out}; failing checks: ${fails}`);
} finally {
  await browser.close();
  srv.stop();
}
