import { getState } from '../logic/store';

const cache: Record<string, HTMLAudioElement> = {};
export type Sfx = 'set-done' | 'rest-done' | 'start';

export function play(name: Sfx) {
  if (!getState().settings.sound) return;
  try {
    const a = (cache[name] ??= new Audio(`sfx/${name}.mp3`));
    a.currentTime = 0;
    a.volume = name === 'set-done' ? 0.5 : 0.85;
    void a.play().catch(() => undefined);
  } catch { /* audio unavailable */ }
}

export function buzz(pattern: number | number[]) {
  if (!getState().settings.haptics) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}
