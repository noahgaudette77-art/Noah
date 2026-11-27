// Shared helpers for the build-time asset generators in tools/.
// Keys are read from the environment only. They are never printed, written to disk or shipped.
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ASSETS = join(ROOT, 'public', 'assets');
export const RAW = join(ROOT, 'tools', '.raw'); // full-size originals, gitignored
const MANIFEST = join(ASSETS, 'manifest.json');
const COSTS = join(ROOT, 'COSTS.md');

export function key(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set in the environment`);
  return v;
}

export const ensureDir = (p) => (mkdirSync(p, { recursive: true }), p);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Strip anything key-like from text before it is logged. */
export const scrub = (s) => String(s).replace(/(api_key=|token=)[^&\s"]+/gi, '$1***').replace(/\b(mw|sk|tsk)_[A-Za-z0-9_-]{8,}/g, '$1_***');

export function manifest() {
  return existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { generated: {}, note: 'Written by tools/*.mjs. Paths are relative to public/.' };
}
export function record(id, entry) {
  ensureDir(ASSETS);
  const m = manifest();
  m.generated[id] = { ...(m.generated[id] ?? {}), ...entry, updated: new Date().toISOString().slice(0, 10) };
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
}

/** How many paid takes an asset has used (from the manifest). Max 3 per asset. */
export const takes = (id) => manifest().generated[id]?.takes ?? 0;
export function canTake(id, max = 3) {
  const n = takes(id);
  if (n >= max) { console.log(`skip ${id}: already used ${n}/${max} takes`); return false; }
  return true;
}

/** Append one paid call to COSTS.md. */
export function logCost({ service, asset, model, take, cost }) {
  const date = new Date().toISOString().slice(0, 10);
  const running = service === 'fal.ai' ? falTotal() + (typeof cost === 'number' ? cost : 0) : null;
  const c = typeof cost === 'number' ? `$${cost.toFixed(3)}` : cost;
  appendFileSync(COSTS, `| ${date} | ${service} | ${asset} | ${model} | ${take} | ${c} | ${running == null ? '' : '$' + running.toFixed(2)} |\n`);
}
export function falTotal() {
  if (!existsSync(COSTS)) return 0;
  return readFileSync(COSTS, 'utf8').split('\n').filter((l) => l.includes('| fal.ai |')).reduce((s, l) => {
    const m = l.split('|')[6]?.trim().match(/^\$([\d.]+)/);
    return s + (m ? Number(m[1]) : 0);
  }, 0);
}
export const FAL_CAP = 20;
export function falBudget(next) {
  const t = falTotal();
  if (t + next > FAL_CAP) throw new Error(`fal.ai budget: $${t.toFixed(2)} spent + $${next.toFixed(2)} would pass the $${FAL_CAP} cap. Stop and ask.`);
}

export async function fetchJson(url, opts = {}, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, opts);
      const text = await r.text();
      if (!r.ok) {
        if ((r.status === 429 || r.status >= 500) && i < tries - 1) { await sleep(2000 * 2 ** i); continue; }
        throw new Error(`HTTP ${r.status} ${scrub(url.split('?')[0])}: ${scrub(text.slice(0, 400))}`);
      }
      return text ? JSON.parse(text) : {};
    } catch (e) {
      if (i < tries - 1 && /fetch failed|ECONNRESET|ETIMEDOUT/.test(String(e))) { await sleep(2000 * 2 ** i); continue; }
      throw e;
    }
  }
}

export async function download(url, file) {
  ensureDir(dirname(file));
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download HTTP ${r.status}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return file;
}
