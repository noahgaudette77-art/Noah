// Renders PWA icons from the SVG mark: node scripts/icons.mjs
import { readFileSync } from 'node:fs';
import { chromium } from './lib/serve.mjs';
const svg = readFileSync('public/icons/icon.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size, maskable] of [['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable-512', 512, true]]) {
  await p.setViewportSize({ width: size, height: size });
  const inner = maskable ? svg.replace('rx="9"', 'rx="0"').replace('viewBox="0 0 32 32"', 'viewBox="-6 -6 44 44" style="background:#F25414"') : svg;
  await p.setContent(`<html><body style="margin:0;background:${maskable ? '#F25414' : 'transparent'}">${inner.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: `public/icons/${name}.png`, omitBackground: !maskable });
}
await b.close();
console.log('icons written');
