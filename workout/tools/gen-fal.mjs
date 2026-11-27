// fal.ai: the Lifter reference, 4 target-physique posters, 3 video stills, 3 Kling loops (ASSETS.md §C).
// Usage: node tools/gen-fal.mjs ref | posters | stills | loops | <asset-id>
//        RETAKE=<asset-id> node tools/gen-fal.mjs <asset-id>   (one more take, max 3)
// Cost of every call is measured from the account balance before/after and logged to COSTS.md.
// Stops before the running fal total would pass $20.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ASSETS, RAW, canTake, download, ensureDir, falBudget, fetchJson, key, logCost, manifest, record, sleep, takes } from './lib.mjs';

const H = { Authorization: `Key ${key('FAL_KEY')}`, 'content-type': 'application/json' };
const balance = async () => Number(await (await fetch('https://rest.alpha.fal.ai/billing/user_balance', { headers: H })).text());

const NO_TEXT = 'No text, no letters, no numbers, no logos.';
const REF = 'A 1970s gym poster illustration of an original fictional man in his early 30s, short 1970s-cut dark brown hair, light stubble, square jaw, athletic build, standing in a relaxed three-quarter pose, shown from head to mid-thigh, plain dark training shorts, no shirt. Halftone duotone print in rust orange and black ink on aged cream paper, coarse visible halftone dots, slight ink misregistration, paper fibres and soft creases, dramatic hard side light from the left with deep shadow on the right, plain paper background with wide margins. No text, no letters, no numbers, no logos, no border, no watermark. Not a real person, not a celebrity.';
const POSTER = (phys) => `Same man as the reference image: keep his exact face, hair, skin tone, age and identity, same pose, framing, side light and the same halftone duotone print style in rust orange and black on aged cream paper. Change only his physique to ${phys} Natural and believable. ${NO_TEXT}`;
const STILL = (action) => `A cinematic 16mm film still of the same man as the reference image (same face, hair and build, about 20% body fat), photographed for real, in a dim 1970s underground gym with exposed brick and a black pendant lamp casting a warm tungsten light cone. ${action} Medium shot from the side, shallow depth of field, heavy film grain, faded warm tones, halation around the lamp. Vertical 9:16. No text, no signage, no logos.`;
const LOOP_NEG = 'text, watermark, logo, morphing face, extra fingers, distortion, fast motion, camera shake, cuts';

export const JOBS = {
  'lifter-ref': { kind: 'image', model: 'fal-ai/nano-banana-pro', est: 0.15, input: { prompt: REF, aspect_ratio: '2:3', resolution: '1K', output_format: 'png' } },
  'poster-24': { kind: 'edit', est: 0.15, prompt: POSTER('about 24% body fat: solid and broad, soft midsection with no visible abs, thick waist, rounded chest and shoulders.'), ar: '2:3' },
  'poster-19': { kind: 'edit', est: 0.15, prompt: POSTER('about 19% body fat: a visibly leaner waist, a faint outline of the upper abs, more shape in the shoulders and arms.'), ar: '2:3' },
  'poster-15': { kind: 'edit', est: 0.15, prompt: POSTER('about 15% body fat: lean and athletic, upper abs and obliques visible, defined shoulders and arms, faint veins on the forearms.'), ar: '2:3' },
  'poster-12': { kind: 'edit', est: 0.15, prompt: POSTER('about 12% body fat: lean and muscular, a clear six-pack, defined chest and shoulders, athletic and natural, not a bodybuilder, not extreme.'), ar: '2:3' },
  'still-hero': { kind: 'edit', est: 0.15, prompt: STILL('He claps chalk from his hands and a cloud of chalk dust hangs in the light.'), ar: '9:16' },
  'still-rest': { kind: 'edit', est: 0.15, prompt: STILL('He sits on the end of a worn leather bench between sets, forearms on his knees, head slightly down, breathing, a towel over one shoulder, dust motes drifting in the lamp light behind him.'), ar: '9:16' },
  'still-complete': { kind: 'edit', est: 0.15, prompt: STILL('He sets a rusted hex dumbbell back on a steel rack and exhales, chalk on his hands, a slight satisfied smile, warm lamp light from above.'), ar: '9:16' },
  // input for the optional Tripo athlete (image-to-3D wants a full body, front-on, arms away from the body)
  'athlete-apose': { kind: 'edit', est: 0.15, prompt: 'The same man as the reference image (same face, hair, skin tone and build, about 20% body fat), photographed for real: full body from head to feet, standing straight and facing the camera, arms held slightly away from the body in an A-pose, plain dark training shorts, barefoot, plain light grey studio background, even soft lighting, sharp focus. No text, no logos.', ar: '2:3' },
  'loop-hero': { kind: 'loop', from: 'still-hero', est: 0.35, prompt: '16mm film look, flickering warm tungsten lamp, dust motes drifting in the light cone, slow push-in. The man claps chalk from his hands once and rubs them together, chalk dust swirling in the light. Subtle natural motion, steady camera, no cuts.' },
  'loop-rest': { kind: 'loop', from: 'still-rest', est: 0.35, prompt: '16mm film look, flickering warm tungsten lamp, dust motes drifting, slow push-in. The man breathes slowly, shoulders rising and falling, otherwise still. Steady camera, no cuts.' },
  'loop-complete': { kind: 'loop', from: 'still-complete', est: 0.35, prompt: '16mm film look, flickering warm tungsten lamp, dust motes drifting, slow push-in. The man lets go of the dumbbell on the rack and exhales, then looks up into the light. Steady camera, no cuts.' },
};
const GROUPS = { ref: ['lifter-ref'], posters: ['poster-24', 'poster-19', 'poster-15', 'poster-12'], stills: ['still-hero', 'still-rest', 'still-complete'], loops: ['loop-hero', 'loop-rest', 'loop-complete'] };

async function queue(model, input) {
  const q = await fetchJson(`https://queue.fal.run/${model}`, { method: 'POST', headers: H, body: JSON.stringify(input) });
  for (let i = 0; i < 360; i++) {
    await sleep(i < 10 ? 2000 : 5000);
    const s = await fetchJson(q.status_url, { headers: H });
    if (s.status === 'COMPLETED') return fetchJson(q.response_url, { headers: H });
    if (s.status === 'FAILED' || s.error) throw new Error(`fal ${model} failed: ${JSON.stringify(s).slice(0, 300)}`);
  }
  throw new Error('fal timed out');
}

const urlOf = (id) => manifest().generated[id]?.url;

async function one(id) {
  const job = JOBS[id];
  const out = ensureDir(join(ASSETS, 'art'));
  const done = manifest().generated[id]?.status === 'done';
  if (done && process.env.RETAKE !== id) { console.log(`skip ${id}: exists`); return; }
  if (!canTake(id)) return;
  falBudget(job.est);
  const take = takes(id) + 1;
  const before = await balance();
  let res, model, input;
  if (job.kind === 'image') { model = job.model; input = job.input; }
  else if (job.kind === 'edit') {
    const ref = urlOf('lifter-ref');
    if (!ref) throw new Error('make lifter-ref first');
    model = 'fal-ai/nano-banana-pro/edit';
    input = { prompt: job.prompt, image_urls: [ref], aspect_ratio: job.ar, resolution: '1K', output_format: 'png' };
  } else {
    const still = urlOf(job.from);
    if (!still) throw new Error(`make ${job.from} first`);
    model = 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
    // tail = start frame: the clip returns to where it began, so it loops without a seam
    input = { prompt: job.prompt, image_url: still, tail_image_url: still, duration: '5', negative_prompt: LOOP_NEG, cfg_scale: 0.5 };
  }
  record(id, { takes: take, tool: 'fal.ai', model, prompt: job.prompt ?? job.input?.prompt, status: 'pending' });
  res = await queue(model, input);
  await sleep(3000);
  const after = await balance();
  const cost = Math.max(0, +(before - after).toFixed(3)) || job.est;
  logCost({ service: 'fal.ai', asset: id, model, take, cost });

  if (job.kind === 'loop') {
    const raw = await download(res.video.url, join(ensureDir(RAW), `${id}-t${take}.mp4`));
    const mp4 = join(out, `${id}.mp4`), webm = join(out, `${id}.webm`), poster = join(out, `${id}.webp`);
    const vf = 'scale=720:-2,fps=24';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-an', '-vf', vf, '-c:v', 'libx264', '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', mp4]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-an', '-vf', vf, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', webm]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', 'scale=720:-2', '-frames:v', '1', join(RAW, `${id}-frame.png`)]);
    await sharp(join(RAW, `${id}-frame.png`)).webp({ quality: 72 }).toFile(poster);
    record(id, { status: 'done', url: res.video.url, cost, files: [`assets/art/${id}.mp4`, `assets/art/${id}.webm`, `assets/art/${id}.webp`], bytes: { mp4: statSync(mp4).size, webm: statSync(webm).size } });
    console.log(`done ${id} $${cost} mp4 ${(statSync(mp4).size / 1024).toFixed(0)} KB`);
    return;
  }
  const img = res.images[0];
  const raw = await download(img.url, join(ensureDir(RAW), `${id}-t${take}.png`));
  const files = [];
  if (id !== 'lifter-ref') {
    const w = id.startsWith('poster') ? 900 : 720;
    await sharp(raw).resize({ width: w }).webp({ quality: 80 }).toFile(join(out, `${id}.webp`));
    await sharp(raw).resize({ width: w }).avif({ quality: 52 }).toFile(join(out, `${id}.avif`));
    files.push(`assets/art/${id}.webp`, `assets/art/${id}.avif`);
  }
  record(id, { status: 'done', url: img.url, cost, files, size: `${img.width ?? '?'}x${img.height ?? '?'}` });
  console.log(`done ${id} $${cost}`);
}

const args = process.argv.slice(2);
const ids = args.flatMap((a) => GROUPS[a] ?? [a]);
for (const id of ids) {
  if (!JOBS[id]) { console.error(`unknown ${id}`); continue; }
  try { await one(id); } catch (e) { console.error(`FAIL ${id}: ${e.message}`); if (/budget/.test(e.message)) break; }
}
