// Blockade Labs skyboxes, 1980s gym set (the owner's reference: wood panelling, hex dumbbell racks,
// red racks and benches, hardwood floor, film-photo look). Same pipeline as gen-skybox.mjs.
// Usage: node tools/gen-skybox.mjs [zone...]      (idempotent: existing zones are skipped)
//        RETAKE=sky-bench node tools/gen-skybox.mjs  (one more take of one zone, max 3)
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ASSETS, RAW, canTake, download, ensureDir, fetchJson, key, logCost, record, sleep, takes } from './lib.mjs';

const API = 'https://backend.blockadelabs.com/api/v1';
const STYLE = 67; // M3 Photoreal
const SUFFIX = '1980s bodybuilding gym photographed on 35mm film in 1986, film grain, faded warm colours, dark wood-panelled walls, big wall mirrors, worn black hex dumbbells, red-painted steel racks and benches, worn hardwood floor, fluorescent tube lights, no people, no text, no signage, no posters';
const NEG = 'people, person, figure, man, woman, text, letters, words, numbers, signage, logo, poster, watermark, modern machines, treadmill, screens, concrete bunker, cartoon, painting, oversaturated, blurry';
export const ZONES = {
  'sky80-entrance': 'Long room of an old-school gym: a wooden dumbbell rack full of hex dumbbells runs along a mirrored wall, red flat benches in a row,',
  'sky80-bench': 'Bench area of an old-school gym: red vinyl flat and incline benches on steel frames, dumbbells on the floor beside them, a red squat rack,',
  'sky80-mesh': 'Back wall of an old-school gym with dark wood panelling, a red steel rack of iron weight plates and a row of kettlebells, a chalk bucket,',
  'sky80-lane': 'Open floor of an old-school gym: worn hardwood planks with a long red stripe painted down the floor, a climbing rope and a tractor tire,',
  'sky80-ceiling': 'Looking up at the ceiling of an old-school gym: stained acoustic ceiling tiles and long rows of fluorescent tube lights, wood panelled walls below,',
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
