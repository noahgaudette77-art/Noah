import { getState } from '../logic/store';

const cache: Record<string, HTMLAudioElement> = {};
export type Sfx = 'set-done' | 'rest-done' | 'start' | 'pr' | 'tick-low' | 'tick-high' | 'count' | 'go';
const TICKS: Sfx[] = ['tick-low', 'tick-high', 'count', 'go'];
const VOL: Partial<Record<Sfx, number>> = { 'set-done': 0.5, 'tick-low': 0.45, 'tick-high': 0.45, count: 0.6, go: 0.7, pr: 0.8 };

/** Plays a UI sound. Tempo ticks and countdown beeps follow the Ticks setting (off by default); the rest follow Sounds. */
export function play(name: Sfx) {
  const s = getState().settings;
  if (TICKS.includes(name) ? !s.ticks : !s.sound) return;
  try {
    const a = (cache[name] ??= new Audio(`sfx/${name}.mp3`));
    a.currentTime = 0;
    a.volume = VOL[name] ?? 0.85;
    void a.play().catch(() => undefined);
  } catch { /* audio unavailable */ }
}

export function buzz(pattern: number | number[]) {
  if (!getState().settings.haptics) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}
