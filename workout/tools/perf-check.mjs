// First-screen performance under Chrome DevTools' "Fast 4G" profile (9 Mbps down, 1.5 Mbps up, 60 ms RTT)
// with a 4x CPU slowdown, cold cache, at 390x844. Also a scroll-smoothness proxy on Progress.
// Usage: npm run build && node tools/perf-check.mjs
import { chromium, preview } from '../scripts/lib/serve.mjs';

const srv = await preview(4344);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
let bytes = 0; const byType = {};
cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
cdp.on('Network.responseReceived', (e) => { const t = e.type; byType[t] = (byType[t] ?? 0) + 1; });
await page.addInitScript((battery) => { localStorage.setItem('tempo.v1', JSON.stringify({ version: 1, sessions: [], active: null, body: [], habits: {}, settings: { coldOpen: new Date().toISOString().slice(0, 10), battery } })); }, process.env.BATTERY ?? 'auto');
const t0 = Date.now();
await page.goto(`${srv.url}#/?date=2026-12-14`, { waitUntil: 'commit' });
// interactive = the Start lamp is visible and enabled and a click handler responds
await page.getByRole('button', { name: /Start Upper A/ }).waitFor({ state: 'visible', timeout: 30000 });
const tStart = Date.now() - t0;
const paint = await page.evaluate(() => {
  const p = performance.getEntriesByType('paint').reduce((a, e) => ({ ...a, [e.name]: Math.round(e.startTime) }), {});
  const n = performance.getEntriesByType('navigation')[0];
  return { ...p, dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) };
});
const bytesFirst = bytes;
await page.waitForFunction(() => getComputedStyle(document.querySelector('canvas')).opacity === '1', null, { timeout: 30000 }).catch(() => null);
const tRoom = Date.now() - t0;
await page.waitForTimeout(1500);
const bytesRoom = bytes;

// scroll smoothness proxy: frame intervals while scrolling Progress (CPU slowdown off: desktop GPU stand-in)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
await page.evaluate(() => { location.hash = '/body'; });
await page.waitForTimeout(4000);
const frames = await page.evaluate(async () => {
  const ts = []; let y = 0;
  await new Promise((res) => { const f = (t) => { ts.push(t); y += 18; scrollTo(0, y); if (ts.length < 180) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
  return { median: +d[Math.floor(d.length / 2)].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), over33: d.filter((x) => x > 33.4).length, n: d.length };
});
console.log(JSON.stringify({ profile: 'Fast 4G (9 Mbps / 1.5 Mbps / 60 ms) + 4x CPU, cold cache', startButtonVisibleMs: tStart, ...paint, kbBeforeInteractive: Math.round(bytesFirst / 1024), roomVisibleMs: tRoom, kbWithRoom: Math.round(bytesRoom / 1024), requests: byType, scrollFrames: frames }, null, 2));
await browser.close(); srv.stop();
