// Optional Tripo3D athlete for the Today hero (max 2 attempts): image-to-model from the A-pose reference,
// auto-rig, idle animation, then meshopt + 1k WebP. Ship only if it looks believable (owner's rule).
// Usage: node tools/gen-athlete.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAW, ASSETS, canTake, download, ensureDir, key, logCost, record, takes } from './lib.mjs';
import { balance, optimize, runTask } from './gen-props.mjs';

const API = 'https://api.tripo3d.ai/v2/openapi';
const id = 'lifter-3d';
if (!canTake(id, 2)) process.exit(0);
const take = takes(id) + 1;
const before = await balance();

// 1. upload the reference
const fd = new FormData();
fd.append('file', new Blob([readFileSync(join(RAW, 'athlete-apose-t1.png'))], { type: 'image/png' }), 'athlete.png');
const up = await (await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${key('TRIPO_API_KEY')}` }, body: fd })).json();
if (up.code !== 0) throw new Error(`upload: ${JSON.stringify(up).slice(0, 200)}`);
const token = up.data.image_token;
record(id, { takes: take, tool: 'Tripo3D image_to_model + animate_rig + animate_retarget(idle)', status: 'pending' });

// 2. model
const m = await runTask({ type: 'image_to_model', file: { type: 'png', file_token: token }, texture: true, pbr: true, face_limit: 20000 });
await download(m.output.pbr_model ?? m.output.model, join(RAW, `${id}-t${take}-static.glb`));
if (m.output.rendered_image) await download(m.output.rendered_image, join(RAW, `${id}-t${take}-render.webp`));
console.log('model done', m.task_id);

// 3. rig + idle
let animated = null;
try {
  const rig = await runTask({ type: 'animate_rig', original_model_task_id: m.task_id, out_format: 'glb' });
  console.log('rig done', rig.task_id);
  const idle = await runTask({ type: 'animate_retarget', original_model_task_id: rig.task_id, out_format: 'glb', animation: 'preset:idle' });
  animated = idle.output.model ?? idle.output.pbr_model;
  await download(animated, join(RAW, `${id}-t${take}-idle.glb`));
  console.log('idle done', idle.task_id);
} catch (e) { console.error('rig/idle failed:', e.message); }

const after = await balance();
logCost({ service: 'Tripo3D', asset: id, model: 'image_to_model + rig + idle', take, cost: `${before - after} credits` });
const src = join(RAW, animated ? `${id}-t${take}-idle.glb` : `${id}-t${take}-static.glb`);
const dst = join(ensureDir(join(RAW, 'review')), `${id}-t${take}.glb`); // NOT shipped until reviewed
const size = optimize(src, dst);
record(id, { status: 'review', credits: before - after, bytes: size, animated: !!animated, review: `tools/.raw/review/${id}-t${take}.glb` });
console.log(`athlete take ${take}: ${(size / 1024).toFixed(0)} KB, ${before - after} credits, animated=${!!animated}`);
void ASSETS;
