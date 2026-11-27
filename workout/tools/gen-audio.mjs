// ElevenLabs: room sound effects, a seamless room-tone loop, and the coach's voice cues (ASSETS.md §D).
// Usage: node tools/gen-audio.mjs [sfx|voice|<id>]   (idempotent; RETAKE=<id> for one more take, max 3)
// Credits are measured from the subscription counter before/after each call and logged to COSTS.md.
import { execFileSync } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSETS, RAW, canTake, ensureDir, fetchJson, key, logCost, record, takes } from './lib.mjs';

const API = 'https://api.elevenlabs.io/v1';
const K = key('ELEVENLABS_API_KEY');
const VOICE = { id: 'TTyZrDYo6LQowrH8mixJ', owner: 'e3f59c5c065dae143d73d51c5a4a6fa45d1f39e239c78b3fc1557a641de97381', name: 'Joseph Ortman - Deep & Raspy' };

export const SFX = {
  'sfx-plate-drop': { text: 'A heavy cast-iron weight plate dropped flat onto a thick rubber gym floor in an empty brick basement, deep thud with a short metallic ring, short natural room reverb', dur: 2.0, lufs: -20 },
  'sfx-stopwatch-tick': { text: 'A single crisp tick of an old analog mechanical stopwatch, close up, dry', dur: 0.5, lufs: -24 },
  'sfx-flap': { text: 'A single mechanical split-flap display flip, one plastic flap clacking over, close up, dry', dur: 0.5, lufs: -24 },
  'sfx-stamp': { text: 'A rubber stamp pressed hard onto paper on a wooden desk, firm muffled thud, close up', dur: 0.8, lufs: -20 },
  'sfx-chalk-clap': { text: 'Two hands clapping chalk off once, a soft dry powdery clap with a puff of dust, in a brick room', dur: 1.0, lufs: -22 },
  'sfx-lamp-hum': { text: 'An old tungsten lamp switching on with a click, then a low electrical hum and a faint intermittent buzz', dur: 3.0, lufs: -24 },
  'amb-room-tone': { text: 'Room tone of an empty underground brick gym at night: a low ventilation hum, a distant pipe tick, faint lamp buzz, no voices, no music, seamless loop', dur: 30, lufs: -32, loop: true },
};
export const LINES = {
  'vo-three': 'Three.', 'vo-two': 'Two.', 'vo-one': 'One.', 'vo-lower': 'Lower.', 'vo-hold': 'Hold.', 'vo-press': 'Press.',
  'vo-last-rep': 'Last rep.', 'vo-rest': 'Rest.', 'vo-set-complete': 'Set complete.', 'vo-next-exercise': 'Next exercise.',
};

const used = async () => (await fetchJson(`${API}/user/subscription`, { headers: { 'xi-api-key': K } })).character_count;
const out = ensureDir(join(ASSETS, 'audio'));

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'xi-api-key': K, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return Buffer.from(await r.arrayBuffer());
}

/** Loudness-normalise (and for voice, trim the silence at both ends) into a small mono MP3. */
function finish(raw, dst, lufs, { voice = false, loop = false } = {}) {
  const f = [];
  if (voice) f.push('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02', 'areverse', 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.06', 'areverse');
  f.push(`loudnorm=I=${lufs}:TP=-1.5:LRA=11`);
  if (!loop) f.push('afade=t=out:st=0:d=0.001'); // no-op guard keeps the chain valid
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', f.join(','), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', loop ? '64k' : '96k', dst]);
  return statSync(dst).size;
}

async function sfx(id) {
  const j = SFX[id];
  const dst = join(out, `${id}.mp3`);
  if (existsSync(dst) && process.env.RETAKE !== id) { console.log(`skip ${id}`); return; }
  if (!canTake(id)) return;
  const take = takes(id) + 1, before = await used();
  const body = { text: j.text, duration_seconds: j.dur, prompt_influence: 0.55, model_id: 'eleven_text_to_sound_v2', ...(j.loop ? { loop: true } : {}) };
  const buf = await post(`${API}/sound-generation?output_format=mp3_44100_128`, body);
  const raw = join(ensureDir(RAW), `${id}-t${take}.mp3`);
  writeFileSync(raw, buf);
  const size = finish(raw, dst, j.lufs, { loop: !!j.loop });
  const cost = (await used()) - before;
  logCost({ service: 'ElevenLabs', asset: id, model: 'sound-generation v2', take, cost: `${cost} credits` });
  record(id, { takes: take, tool: 'ElevenLabs sound effects', prompt: j.text, seconds: j.dur, credits: cost, bytes: size, file: `assets/audio/${id}.mp3`, status: 'done' });
  console.log(`done ${id} ${cost} credits ${(size / 1024).toFixed(0)} KB`);
}

async function ensureVoice() {
  const mine = await fetchJson(`${API}/voices`, { headers: { 'xi-api-key': K } });
  if (mine.voices?.some((v) => v.voice_id === VOICE.id)) return;
  await fetchJson(`${API}/voices/add/${VOICE.owner}/${VOICE.id}`, { method: 'POST', headers: { 'xi-api-key': K, 'content-type': 'application/json' }, body: JSON.stringify({ new_name: 'Tempo Coach (Joseph Ortman)' }) });
  console.log('voice added to the library (1 slot)');
}

async function line(id) {
  const dst = join(out, `${id}.mp3`);
  if (existsSync(dst) && process.env.RETAKE !== id) { console.log(`skip ${id}`); return; }
  if (!canTake(id)) return;
  const take = takes(id) + 1, before = await used();
  const buf = await post(`${API}/text-to-speech/${VOICE.id}?output_format=mp3_44100_128`, {
    text: LINES[id], model_id: 'eleven_multilingual_v2',
    voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true },
  });
  const raw = join(ensureDir(RAW), `${id}-t${take}.mp3`);
  writeFileSync(raw, buf);
  const size = finish(raw, dst, -16, { voice: true });
  const cost = (await used()) - before;
  logCost({ service: 'ElevenLabs', asset: id, model: `TTS multilingual v2 · ${VOICE.name}`, take, cost: `${cost} credits` });
  record(id, { takes: take, tool: 'ElevenLabs TTS', voice: VOICE.name, voiceId: VOICE.id, text: LINES[id], credits: cost, bytes: size, file: `assets/audio/${id}.mp3`, status: 'done' });
  console.log(`done ${id} ${cost} credits`);
}

const args = process.argv.slice(2);
const want = args.length ? args : ['sfx', 'voice'];
for (const a of want) {
  try {
    if (a === 'sfx') for (const id of Object.keys(SFX)) await sfx(id);
    else if (a === 'voice') { await ensureVoice(); for (const id of Object.keys(LINES)) await line(id); }
    else if (SFX[a]) await sfx(a);
    else if (LINES[a]) { await ensureVoice(); await line(a); }
  } catch (e) { console.error(`FAIL ${a}: ${e.message}`); }
}
