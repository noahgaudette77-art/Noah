// Captures every screen at phone (390x844) and desktop (1440x900) sizes into shots/.
// Usage: npm run build && npm run screenshots
import { mkdirSync } from 'node:fs';
import { chromium, preview } from './lib/serve.mjs';

const OUT = 'shots';
mkdirSync(OUT, { recursive: true });
const TODAY = '2026-12-14'; // Monday of week 3

// ---- seed: two weeks of training, daily weigh-ins, habits ----
function seed() {
  const day = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const sets = (w, reps, rir = 2) => reps.map((r) => ({ weight: w, reps: r, rir, done: true }));
  const plan = {
    upperA: [['inclinePress', 35, [12, 12, 12, 12]], ['chestSupportedRow', 35, [12, 12, 11, 11]], ['pullover', 30, [15, 14, 13]], ['inclineFly', 20, [15, 15, 15]], ['lateralRaise', 15, [15, 15, 15]], ['inclineReverseFly', 10, [15, 15, 15]]],
    lowerA: [['bulgarian', 25, [12, 12, 11, 10]], ['singleLegRdl', 30, [12, 12, 12]], ['stepUp', 25, [10, 10, 10]], ['hipThrust', 50, [15, 15, 15]], ['weightedCrunch', 20, [15, 14, 13]]],
    upperB: [['seatedPress', 30, [12, 11, 10, 10]], ['oneArmRow', 45, [12, 12, 12, 12]], ['inclineCurl', 20, [13, 12, 11]], ['overheadExtension', 35, [15, 14, 13]], ['lateralRaise', 15, [18, 17, 16]], ['flatPress', 40, [15, 14, 12]]],
    lowerB: [['rdl', 45, [10, 10, 10, 10]], ['reverseLunge', 30, [10, 10, 10]], ['gobletSquat', 50, [15, 15, 15]], ['reverseCrunch', 0, [15, 15, 15]]],
  };
  const sessions = [];
  const start = '2026-11-30';
  for (let w = 0; w < 2; w++) {
    const keys = [['upperA', 0], ['lowerA', 1], ['bike', 2], ['upperB', 3], ['lowerB', 4], ['easy', 5]];
    for (const [k, off] of keys) {
      const date = day(start, w * 7 + off);
      const t0 = Date.parse(date + 'T11:05:00Z');
      const exercises = (plan[k] ?? []).map(([id, wgt, reps]) => ({ exerciseId: id, stage: 'load', sets: sets(w === 0 ? Math.max(0, wgt - 5) : wgt, reps) }));
      if (k === 'upperB') exercises[5].sets.push({ weight: 30, reps: 10, rir: 1, done: true, drop: true });
      sessions.push({ id: `${date}-${k}`, date, dayKey: k, startedAt: t0, finishedAt: t0 + (exercises.length ? 64 : 26) * 60000, exercises, cardioDone: k === 'bike' ? ['bikeIntervals'] : k === 'easy' ? ['easyCardio'] : ['inclineWalk'] });
    }
  }
  const body = [];
  for (let i = 0; i <= 14; i++) {
    const noise = [0.6, -0.4, 0.2, 0.9, -0.3, 0.1, -0.6, 0.4, -0.2, 0.5, -0.7, 0.3, 0, -0.4, 0.2][i];
    body.push({ date: day(start, i), weight: +(225 - i * 0.32 + noise).toFixed(1), waist: +(41 - i * 0.03).toFixed(2) });
  }
  const habits = {};
  for (let i = 0; i < 14; i++) habits[day(start, i)] = { kcal: true, protein: i % 3 !== 0, steps: i % 4 !== 1, sleep: i % 2 === 0 };
  habits[TODAY] = { kcal: true, protein: true };
  return { version: 1, sessions, active: null, body, habits, settings: { sound: false, haptics: false } };
}

const srv = await preview(4320);
const browser = await chromium.launch();
const shots = [];
async function run(name, vp, fn) {
  const ctx = await browser.newContext({ viewport: vp.size, deviceScaleFactor: 2, reducedMotion: vp.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error(`[${name}] pageerror`, e.message));
  await page.addInitScript(([data, fresh]) => {
    if (!sessionStorage.getItem('seeded')) {
      if (fresh) localStorage.removeItem('tempo.v1'); else localStorage.setItem('tempo.v1', JSON.stringify(data));
      sessionStorage.setItem('seeded', '1');
    }
  }, [seed(), !!vp.fresh]);
  await page.goto(`${srv.url}#/?date=${vp.date ?? TODAY}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await fn(page);
  await ctx.close();
}
const shot = async (page, file, full = false) => {
  await page.waitForTimeout(900);
  const css = full ? await page.addStyleTag({ content: 'nav.fixed{display:none!important}' }) : null;
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: full });
  if (css) await css.evaluate((n) => n.remove());
  shots.push(file);
};
const nav = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(700); };

const VPS = [
  { tag: 'mobile', size: { width: 390, height: 844 } },
  { tag: 'desktop', size: { width: 1440, height: 900 } },
];

for (const vp of VPS) {
  const t = vp.tag;
  await run(`today-${t}`, vp, async (p) => {
    await shot(p, `${t}-01-today`);
    if (t === 'mobile') await shot(p, `${t}-01b-today-full`, true);
    await nav(p, '/week'); await shot(p, `${t}-07-week`, t === 'mobile');
    await nav(p, '/exercise/bulgarian'); await shot(p, `${t}-06-exercise-detail`, true);
    await nav(p, '/history'); await p.getByRole('button', { expanded: false }).first().click(); await shot(p, `${t}-08-history`, t === 'mobile');
    await nav(p, '/body'); await p.waitForTimeout(800); await shot(p, `${t}-09-body`, true);
    await nav(p, '/settings'); await shot(p, `${t}-10-settings`, t === 'mobile');
    await nav(p, '/day/2026-12-16'); await shot(p, `${t}-11-bike-day`, t === 'mobile');
    // workout flow
    await nav(p, '/');
    await p.getByRole('button', { name: /Start Upper A/ }).click();
    await p.waitForTimeout(900);
    await shot(p, `${t}-02-workout`);
    await p.getByRole('button', { name: 'Complete set 1' }).click();
    await p.waitForTimeout(400);
    await shot(p, `${t}-03-workout-rest-timer`);
    await p.getByRole('button', { name: 'Skip rest' }).click();
    await p.getByRole('button', { name: /Superset A/ }).click();
    await p.waitForTimeout(600);
    await shot(p, `${t}-04-workout-superset`, t === 'mobile');
    await p.getByRole('button', { name: /Incline Walk/ }).click();
    await p.waitForTimeout(600);
    await shot(p, `${t}-05-workout-cardio`);
    await p.getByRole('banner').getByRole('button', { name: 'Finish' }).click();
    await shot(p, `${t}-12-finish-summary`);
  });
  await run(`prestart-${t}`, { ...vp, date: '2026-11-27', fresh: true }, async (p) => {
    await shot(p, `${t}-13-today-before-start`, t === 'mobile');
  });
  await run(`reduced-${t}`, { ...vp, reduced: true }, async (p) => {
    await nav(p, '/exercise/rdl');
    await shot(p, `${t}-14-reduced-motion-demo`);
  });
}
await browser.close();
srv.stop();
console.log(`${shots.length} screenshots in ${OUT}/`);
