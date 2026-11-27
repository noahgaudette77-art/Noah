// The room's sound (DESIGN.md §5). OFF by default. Web Audio with decoded buffers, one master gain
// (the volume slider), created on the first tap (iOS rule). Files are ElevenLabs output, build time only.
import { getState } from '../logic/store';

export type CueName = 'plate' | 'stamp' | 'flap' | 'tick' | 'chalk' | 'hum';
export type VoiceName = 'three' | 'two' | 'one' | 'lower' | 'hold' | 'press' | 'last-rep' | 'rest' | 'set-complete' | 'next-exercise';

const FILES: Record<string, string> = {
  plate: 'sfx-plate-drop', stamp: 'sfx-stamp', flap: 'sfx-flap', tick: 'sfx-stopwatch-tick', chalk: 'sfx-chalk-clap', hum: 'sfx-lamp-hum', room: 'amb-room-tone',
  three: 'vo-three', two: 'vo-two', one: 'vo-one', lower: 'vo-lower', hold: 'vo-hold', press: 'vo-press',
  'last-rep': 'vo-last-rep', rest: 'vo-rest', 'set-complete': 'vo-set-complete', 'next-exercise': 'vo-next-exercise',
};
const LEVEL: Partial<Record<string, number>> = { tick: 0.45, flap: 0.5, room: 0.35, hum: 0.6 };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();
let room: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let lastVoice = 0;

const settings = () => getState().settings;
const on = () => settings().audio;

/** Create the context on a user gesture. Safe to call often. */
export function unlockAudio() {
  if (ctx || typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = settings().volume;
  master.connect(ctx.destination);
}

export function setVolume(v: number) {
  if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

function load(name: string): Promise<AudioBuffer | null> {
  if (!ctx) return Promise.resolve(null);
  let p = buffers.get(name);
  if (!p) {
    p = fetch(`assets/audio/${FILES[name]}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((b) => new Promise<AudioBuffer>((res, rej) => ctx!.decodeAudioData(b, res, rej))).catch(() => null);
    buffers.set(name, p);
  }
  return p;
}

async function playBuf(name: string, gain = 1, when = 0) {
  if (!ctx || !master) return;
  if (ctx.state === 'suspended') await ctx.resume().catch(() => undefined);
  const b = await load(name);
  if (!b || !ctx || !master) return;
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = gain * (LEVEL[name] ?? 1);
  src.buffer = b;
  src.connect(g).connect(master);
  src.start(ctx.currentTime + when);
}

/** A sound effect. Flip ticks and tempo ticks have their own switches. */
export function cue(name: CueName) {
  if (!on()) return;
  if (name === 'flap' && !settings().flips) return;
  if (name === 'tick' && !settings().ticks) return;
  void playBuf(name);
}

/** A coach voice line. Lines never overlap: a new one waits for a short gap. */
export function say(name: VoiceName) {
  if (!on() || !settings().voice) return;
  const now = performance.now();
  if (now - lastVoice < 350) return;
  lastVoice = now;
  void playBuf(name, 1);
}

/** Warm the buffers a screen is about to use, so the first cue lands on time. */
export function preload(names: string[]) {
  if (!on() || !ctx) return;
  names.forEach((n) => void load(n));
}

/** The room-tone bed, looping, only while sound + ambience are on and the page is visible. */
export async function ambience(want: boolean) {
  const s = settings();
  const should = want && s.audio && s.ambience && !document.hidden;
  if (!should) {
    if (room && ctx) { const r = room; r.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => { try { r.src.stop(); } catch { /* stopped */ } }, 1500); room = null; }
    return;
  }
  if (room || !ctx || !master) return;
  const b = await load('room');
  if (!b || room || !ctx || !master) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.buffer = b; src.loop = true;
  src.connect(gain).connect(master);
  src.start();
  gain.gain.setTargetAtTime(LEVEL.room ?? 0.35, ctx.currentTime, 1.2);
  room = { src, gain };
}

if (typeof document !== 'undefined') {
  const unlock = () => unlockAudio();
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) void ambience(false); else void ambience(true); });
}
