// Blockade Labs skyboxes for the five zones of the room (ASSETS.md §B).
// Usage: node tools/gen-skybox.mjs [zone...]      (idempotent: existing zones are skipped)
//        RETAKE=sky-bench node tools/gen-skybox.mjs  (one more take of one zone, max 3)
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ASSETS, RAW, canTake, download, ensureDir, fetchJson, key, logCost, record, sleep, takes } from './lib.mjs';

const API = 'https://backend.blockadelabs.com/api/v1';
const STYLE = 67; // M3 Photoreal
const SUFFIX = '1970s underground iron gym, shot on 35mm film, heavy grain, faded warm tones, halation around lamps, exposed brick, raw concrete, rusted steel, rubber floor, black pendant lamps with warm tungsten glow, dust in the air, no people, no text, no signage';
const NEG = 'windows, daylight, sunlight, people, person, figure, text, letters, words, numbers, signage, logo, poster, watermark, modern machines, treadmill, screens, mirror selfie, cartoon, painting, oversaturated, blurry';
export const ZONES = {
  'sky-entrance': 'Entrance of a long basement gym at the foot of worn concrete stairs, a row of black pendant lamps hanging low into the distance, heavy steel door, chalk-stained concrete pillars, deep shadow between warm pools of light,',
  'sky-bench': 'Bench and dumbbell area, two worn leather weight benches, a long steel rack of rusted cast-iron hex dumbbells along a brick wall, an old squat stand, a chalk bucket, scuffed black rubber floor tiles,',
  // take 2 (take 1 had no mesh): the wall itself is the subject
  'sky-mesh': 'A whole wall covered by a large welded steel wire grid panel in a rusted frame, kettlebells hanging from S-hooks on the grid, old pipes along the ceiling, brick beside it, amber strip light at its base,',
  // take 2 (take 1 had no red lane and daylight windows): windowless, the lane is the subject
  'sky-lane': 'Windowless basement, a long red rubber sprint lane with white lines runs across the dark concrete floor into the distance, an old tractor tire on the lane, a climbing rope from a steel beam, concrete pillars,',
  'sky-ceiling': 'Looking up at a low concrete ceiling with a honeycomb of warm hexagonal light fixtures glowing amber, steel beams and old ducts between them, brick walls fading into shadow below,',
};

const k = key('BLOCKADE_API_KEY');
const H = { 'x-api-key': k, 'content-type': 'application/json' };
const retake = process.env.RETAKE;
const want = retake ? [retake] : process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ZONES);
const outDir = ensureDir(join(ASSETS, 'room'));

async function one(id) {
  const final = join(outDir, `${id}-2k.webp`);
  if (existsSync(final) && !retake) { console.log(`skip ${id}: exists`); return; }
  if (!canTake(id)) return;
  const prompt = `${ZONES[id]} ${SUFFIX}`;
  if (prompt.length > 600) throw new Error(`${id} prompt is ${prompt.length} chars (max 600)`);
  const take = takes(id) + 1;
  const job = await fetchJson(`${API}/skybox`, { method: 'POST', headers: H, body: JSON.stringify({ skybox_style_id: STYLE, prompt, negative_text: NEG, enhance_prompt: false }) });
  record(id, { takes: take, tool: 'Blockade Labs', style: 'M3 Photoreal (67)', prompt, negative: NEG, status: 'pending' });
  logCost({ service: 'Blockade', asset: id, model: 'skybox M3 Photoreal', take, cost: '1 generation' });
  let r = job;
  for (let i = 0; i < 120 && !['complete', 'error', 'abort'].includes(r.status); i++) {
    await sleep(5000);
    r = (await fetchJson(`${API}/imagine/requests/${job.id}`, { headers: H })).request ?? r;
  }
  if (r.status !== 'complete') throw new Error(`${id}: status ${r.status} ${r.error_message ?? ''}`);
  const raw = await download(r.file_url, join(ensureDir(RAW), `${id}-t${take}.jpg`));
  const meta = await sharp(raw).metadata();
  const base = sharp(raw).modulate({ saturation: 0.92 });
  await base.clone().resize(4096, 2048).webp({ quality: 78 }).toFile(join(outDir, `${id}-4k.webp`));
  await base.clone().resize(2048, 1024).webp({ quality: 74 }).toFile(final);
  const tiny = await base.clone().resize(32, 16).blur(0.6).webp({ quality: 50 }).toBuffer();
  record(id, { status: 'done', source: `${meta.width}x${meta.height}`, files: [`assets/room/${id}-2k.webp`, `assets/room/${id}-4k.webp`], placeholder: `data:image/webp;base64,${tiny.toString('base64')}`, blockadeId: job.id });
  console.log(`done ${id} (${meta.width}x${meta.height})`);
}

for (const id of want) {
  try { await one(id); } catch (e) { console.error(`FAIL ${id}: ${e.message}`); }
}
