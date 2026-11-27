import { useSyncExternalStore } from 'react';
import { type AppState, load, save } from './storage';

let state: AppState = typeof localStorage !== 'undefined' ? load() : load();
const listeners = new Set<() => void>();

export const getState = () => state;

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state);
  save(state);
  listeners.forEach((l) => l());
}

export function replaceState(next: AppState) {
  setState(() => next);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}
