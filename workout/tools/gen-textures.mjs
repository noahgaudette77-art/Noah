// Procedural textures (free, no API): aged cream paper (Poly Haven has no paper) and a film-grain tile.
// Usage: node tools/gen-textures.mjs   -> public/assets/tex/paper-cream.webp, grain.webp
import { join } from 'node:path';
import sharp from 'sharp';
import { ASSETS, ensureDir, record } from './lib.mjs';

const out = ensureDir(join(ASSETS, 'tex'));
let seed = 1974;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// tileable value noise
function noise(size, cells) {
  const g = Array.from({ length: cells * cells }, rnd);
  const at = (x, y) => g[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)];
  const f = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = (x / size) * cells, gy = (y / size) * cells;
    const x0 = Math.floor(gx), y0 = Math.floor(gy), tx = gx - x0, ty = gy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    f[y * size + x] = a + (b - a) * sy;
  }
  return f;
}

async function paper() {
  const S = 1024;
  const n1 = noise(S, 6), n2 = noise(S, 24), n3 = noise(S, 96);
  const px = Buffer.alloc(S * S * 3);
  const base = [237, 227, 204];
  const v = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) v[i] = (n1[i] - 0.5) * 14 + (n2[i] - 0.5) * 7 + (n3[i] - 0.5) * 5 + (rnd() - 0.5) * 6;
  // fibres: short faint strokes
  for (let k = 0; k < 2600; k++) {
    let x = rnd() * S, y = rnd() * S; const a = rnd() * Math.PI, len = 6 + rnd() * 22, d = (rnd() < 0.6 ? -1 : 1) * (3 + rnd() * 5);
    for (let t = 0; t < len; t++) { const xi = Math.floor(x + Math.cos(a) * t) & (S - 1), yi = Math.floor(y + Math.sin(a) * t) & (S - 1); v[yi * S + xi] += d; }
  }
  // foxing: a few warm brown spots
  const fox = [];
  for (let k = 0; k < 22; k++) fox.push([rnd() * S, rnd() * S, 3 + rnd() * 14, 0.2 + rnd() * 0.6]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    let r = base[0] + v[i], g = base[1] + v[i], b = base[2] + v[i] * 1.1;
    for (const [fx, fy, fr, fa] of fox) {
      const dx = Math.min(Math.abs(x - fx), S - Math.abs(x - fx)), dy = Math.min(Math.abs(y - fy), S - Math.abs(y - fy));
      const d = Math.sqrt(dx * dx + dy * dy) / fr;
      if (d < 1.6) { const w = fa * Math.max(0, 1 - d / 1.6) ** 1.5; r -= 28 * w; g -= 40 * w; b -= 62 * w; }
    }
    px[i * 3] = Math.max(0, Math.min(255, r)); px[i * 3 + 1] = Math.max(0, Math.min(255, g)); px[i * 3 + 2] = Math.max(0, Math.min(255, b));
  }
  await sharp(px, { raw: { width: S, height: S, channels: 3 } }).webp({ quality: 72 }).toFile(join(out, 'paper-cream.webp'));
  // a crease/fold overlay (transparent) for posters and the ledger
  const C = 512, cp = Buffer.alloc(C * C * 4);
  for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
    const i = (y * C + x) * 4;
    const d1 = Math.abs(x - C * 0.5 - (y - C * 0.5) * 0.04), d2 = Math.abs(y - C * 0.42 - (x - C * 0.5) * 0.02);
    const a = Math.max(0, 1 - d1 / 2.2) * 60 + Math.max(0, 1 - d2 / 2.2) * 50;
    const lift = Math.max(0, 1 - Math.abs(d1 - 3) / 2) * 30;
    cp[i] = lift ? 255 : 60; cp[i + 1] = lift ? 250 : 45; cp[i + 2] = lift ? 240 : 30; cp[i + 3] = Math.min(255, a + lift);
  }
  await sharp(cp, { raw: { width: C, height: C, channels: 4 } }).webp({ quality: 80 }).toFile(join(out, 'paper-crease.webp'));
}

async function grain() {
  const S = 256, px = Buffer.alloc(S * S * 2);
  for (let i = 0; i < S * S; i++) { const g = Math.floor(rnd() * 255); px[i * 2] = g; px[i * 2 + 1] = 255; }
  await sharp(px, { raw: { width: S, height: S, channels: 2 } }).webp({ quality: 60 }).toFile(join(out, 'grain.webp'));
}

async function paintMask() {
  // mostly opaque with worn specks and dry-brush streaks: eats into stencil paint and stamp ink
  const S = 512, n = noise(S, 40), n2 = noise(S, 160), px = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const streak = Math.sin((x + n[i] * 60) * 0.21) * 0.5 + 0.5;
    const v = n2[i] * 0.7 + n[i] * 0.3;
    const a = v < 0.2 ? 0 : v < 0.25 ? 120 : streak < 0.025 ? 120 : 255;
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 255; px[i * 4 + 3] = a;
  }
  await sharp(px, { raw: { width: S, height: S, channels: 4 } }).png().toFile(join(out, 'paint-mask.png'));
}

await paper();
await grain();
await paintMask();
record('tex-procedural', { tool: 'procedural (tools/gen-textures.mjs)', files: ['assets/tex/paper-cream.webp', 'assets/tex/paper-crease.webp', 'assets/tex/grain.webp', 'assets/tex/paint-mask.png'], cost: 'free' });
console.log('textures done');
