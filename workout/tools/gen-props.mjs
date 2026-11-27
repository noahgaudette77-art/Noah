// Tripo3D props (ASSETS.md §C): rusted cast-iron dumbbell, weight plate, kettlebell, optional athlete.
// Usage: node tools/gen-props.mjs [id...]   (idempotent; RETAKE=<id> for one more take, max 3)
// Output: public/assets/props/<id>.glb  (meshopt + 1k WebP textures, < 1 MB)
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ASSETS, RAW, canTake, download, ensureDir, fetchJson, key, logCost, record, sleep, takes } from './lib.mjs';

const API = 'https://api.tripo3d.ai/v2/openapi';
export const PROPS = {
  'prop-dumbbell': 'A rusted cast-iron hexagonal dumbbell from a 1970s gym, chipped black paint over orange-brown rust, worn knurled steel handle polished by hands, realistic proportions, single object, no text, no logo',
  'prop-plate': 'An old cast-iron weight plate, round with a raised outer rim and a centre hole, worn black enamel with rust showing through, smooth faces, no lettering, no numbers, single object',
  // take 2 (take 1 had an embossed number): a completely blank bell
  'prop-kettlebell': 'A vintage cast-iron kettlebell with a completely smooth blank surface and no markings of any kind, rust patina with worn black paint, smooth handle polished by use, single object',
};
const H = { Authorization: `Bearer ${key('TRIPO_API_KEY')}`, 'content-type': 'application/json' };
const retake = process.env.RETAKE;
const want = retake ? [retake] : process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PROPS);
const outDir = ensureDir(join(ASSETS, 'props'));

export const balance = async () => (await fetchJson(`${API}/user/balance`, { headers: H })).data.balance;
export async function runTask(body) {
  const t = await fetchJson(`${API}/task`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const id = t.data.task_id;
  for (let i = 0; i < 240; i++) {
    await sleep(5000);
    const r = (await fetchJson(`${API}/task/${id}`, { headers: H })).data;
    if (r.status === 'success') return r;
    if (['failed', 'cancelled', 'unknown', 'banned', 'expired'].includes(r.status)) throw new Error(`task ${id} ${r.status}`);
  }
  throw new Error(`task ${id} timed out`);
}

export function optimize(src, dst) {
  const bin = join(process.cwd(), 'node_modules', '.bin', 'gltf-transform');
  execFileSync(bin, ['optimize', src, dst, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '1024', '--simplify', 'false'], { stdio: 'pipe' });
  return statSync(dst).size;
}

async function one(id) {
  const final = join(outDir, `${id}.glb`);
  if (existsSync(final) && !retake) { console.log(`skip ${id}: exists`); return; }
  if (!canTake(id)) return;
  const take = takes(id) + 1;
  const before = await balance();
  record(id, { takes: take, tool: 'Tripo3D text_to_model', prompt: PROPS[id], status: 'pending' });
  const r = await runTask({ type: 'text_to_model', prompt: PROPS[id], texture: true, pbr: true, face_limit: 12000 });
  const url = r.output.pbr_model ?? r.output.model ?? r.output.base_model;
  const raw = await download(url, join(ensureDir(RAW), `${id}-t${take}.glb`));
  if (r.output.rendered_image) await download(r.output.rendered_image, join(RAW, `${id}-t${take}-render.webp`));
  const size = optimize(raw, final);
  const after = await balance();
  logCost({ service: 'Tripo3D', asset: id, model: 'text_to_model (texture, PBR)', take, cost: `${before - after} credits` });
  record(id, { status: 'done', file: `assets/props/${id}.glb`, bytes: size, credits: before - after, taskId: r.task_id });
  console.log(`done ${id}: ${(size / 1024).toFixed(0)} KB, ${before - after} credits`);
}

if (process.argv[1].endsWith('gen-props.mjs')) {
  for (const id of want) {
    try { await one(id); } catch (e) { console.error(`FAIL ${id}: ${e.message}`); }
  }
}
