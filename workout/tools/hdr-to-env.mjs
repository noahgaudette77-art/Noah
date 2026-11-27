// Shrinks the Poly Haven HDRI (1.7 MB .hdr) to a 512x256 tone-mapped WebP used only to light the small
// props. Decodes Radiance RGBE (new-style RLE) in plain JS. Usage: node tools/hdr-to-env.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ASSETS, RAW, record } from './lib.mjs';

const src = join(RAW, 'ph', 'industrial_pipe_and_valve_01_1k.hdr'); // the downloaded original (not shipped)
const buf = readFileSync(src);
let p = 0;
const line = () => { let s = ''; while (buf[p] !== 0x0a) s += String.fromCharCode(buf[p++]); p++; return s; };
let l; while ((l = line()) !== '') { /* header */ }
const [, H, , W] = line().split(' ').map((x, i) => (i % 2 ? Number(x) : x));
const rgbe = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) {
  if (buf[p] !== 2 || buf[p + 1] !== 2) throw new Error('only RLE RGBE supported');
  p += 4;
  const row = new Uint8Array(W * 4);
  for (let c = 0; c < 4; c++) {
    let x = 0;
    while (x < W) {
      let n = buf[p++];
      if (n > 128) { n -= 128; const v = buf[p++]; while (n--) row[(x++) * 4 + c] = v; }
      else { while (n--) row[(x++) * 4 + c] = buf[p++]; }
    }
  }
  rgbe.set(row, y * W * 4);
}
const out = Buffer.alloc(W * H * 3);
const exposure = 1.6;
for (let i = 0; i < W * H; i++) {
  const e = rgbe[i * 4 + 3];
  const f = e ? Math.pow(2, e - 136) * exposure : 0;
  for (let c = 0; c < 3; c++) {
    const v = rgbe[i * 4 + c] * f;
    const t = v / (1 + v); // Reinhard
    out[i * 3 + c] = Math.round(255 * Math.pow(t, 1 / 2.2));
  }
}
const dst = join(ASSETS, 'ph', 'industrial_pipe_and_valve_01_env.webp');
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).resize(512, 256).webp({ quality: 80 }).toFile(dst);
record('ph-industrial_pipe_and_valve_01', { envLdr: 'assets/ph/industrial_pipe_and_valve_01_env.webp' });
console.log(`env ${W}x${H} -> 512x256 webp`);
