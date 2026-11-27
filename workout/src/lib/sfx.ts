// Legacy call sites (play/buzz) routed into the room's sound engine (lib/audio.ts).
import { getState } from '../logic/store';
import { cue, say } from './audio';

export type Sfx = 'set-done' | 'rest-done' | 'start' | 'pr' | 'tick-low' | 'tick-high' | 'count' | 'go';

/** Plays a UI sound in the Iron Room palette. Everything is silent unless Sound is on in Settings. */
export function play(name: Sfx) {
  switch (name) {
    case 'set-done': cue('stamp'); break;
    case 'pr': cue('plate'); break;
    case 'tick-low': case 'tick-high': cue('tick'); break;
    case 'count': cue('flap'); break;
    case 'rest-done': say('next-exercise'); break;
    case 'start': cue('hum'); break;
    case 'go': cue('chalk'); break;
  }
}

export function buzz(pattern: number | number[]) {
  if (!getState().settings.haptics) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported (iOS Safari has no vibration API) */ }
}
