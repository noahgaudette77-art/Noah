// Poly Haven (CC0) textures and HDRI, 1k, converted to WebP. Idempotent.
// Usage: node tools/get-polyhaven.mjs   -> public/assets/ph/*, writes CREDITS.md entries via the manifest
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ASSETS, RAW, ROOT, download, ensureDir, fetchJson, manifest, record } from './lib.mjs';

const UA = { 'User-Agent': 'tempo-iron-room-build/1.0' };
const TEX = {
  rusty_metal_02: ['Diffuse', 'nor_gl', 'Rough'],
  rust_coarse_01: ['Diffuse'],
  red_brick_03: ['Diffuse', 'nor_gl'],
  concrete_wall_003: ['Diffuse'],
  rubber_tiles: ['Diffuse', 'nor_gl'],
  concrete_floor_worn_001: ['Diffuse'],
  rusty_metal_grid: ['Diffuse', 'nor_gl', 'Rough'],
  weathered_brown_planks: ['Diffuse'],
};
const HDRI = 'industrial_pipe_and_valve_01';
const out = ensureDir(join(ASSETS, 'ph'));
const raw = ensureDir(join(RAW, 'ph'));

for (const [id, maps] of Object.entries(TEX)) {
  const files = await fetchJson(`https://api.polyhaven.com/files/${id}`, { headers: UA });
  const info = await fetchJson(`https://api.polyhaven.com/info/${id}`, { headers: UA });
  const done = [];
  for (const m of maps) {
    const dst = join(out, `${id}_${m.toLowerCase()}_1k.webp`);
    done.push(`assets/ph/${id}_${m.toLowerCase()}_1k.webp`);
    if (existsSync(dst)) continue;
    const entry = files[m]?.['1k']?.jpg ?? files[m]?.['1k']?.png;
    if (!entry) { console.warn(`no 1k ${m} for ${id}`); done.pop(); continue; }
    const f = await download(entry.url, join(raw, `${id}_${m}.${entry.url.split('.').pop()}`));
    await sharp(f).webp({ quality: m === 'Diffuse' ? 78 : 85 }).toFile(dst);
  }
  record(`ph-${id}`, { tool: 'Poly Haven', license: 'CC0', name: info.name, authors: Object.keys(info.authors ?? {}), url: `https://polyhaven.com/a/${id}`, files: done, cost: 'free' });
  console.log(`ok ${id}`);
}

{
  const files = await fetchJson(`https://api.polyhaven.com/files/${HDRI}`, { headers: UA });
  const info = await fetchJson(`https://api.polyhaven.com/info/${HDRI}`, { headers: UA });
  const dst = join(out, `${HDRI}_1k.hdr`);
  if (!existsSync(dst)) await download(files.hdri['1k'].hdr.url, dst);
  record(`ph-${HDRI}`, { tool: 'Poly Haven', license: 'CC0', name: info.name, authors: Object.keys(info.authors ?? {}), url: `https://polyhaven.com/a/${HDRI}`, files: [`assets/ph/${HDRI}_1k.hdr`], cost: 'free' });
  console.log(`ok ${HDRI}`);
}

// CREDITS.md: regenerate the Poly Haven section from the manifest
const m = manifest().generated;
const rows = Object.entries(m).filter(([k]) => k.startsWith('ph-')).map(([, v]) => `| [${v.name}](${v.url}) | ${v.authors.join(', ')} | CC0 1.0 | ${v.files.map((f) => '`' + f + '`').join(', ')} |`);
const path = join(ROOT, 'CREDITS.md');
const prev = existsSync(path) ? readFileSync(path, 'utf8') : '';
const section = `<!-- polyhaven:start -->\n## Poly Haven textures and HDRI (CC0)\n\nPublic domain (CC0 1.0), from [polyhaven.com](https://polyhaven.com). Credit is not required; given with thanks.\n\n| Asset | Author(s) | Licence | Files |\n|---|---|---|---|\n${rows.join('\n')}\n<!-- polyhaven:end -->`;
const next = prev.includes('<!-- polyhaven:start -->') ? prev.replace(/<!-- polyhaven:start -->[\s\S]*<!-- polyhaven:end -->/, section) : `${prev || '# Credits\n'}\n${section}\n`;
writeFileSync(path, next);
console.log('CREDITS.md updated');
