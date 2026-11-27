// What the room should be doing right now. Screens set it; the WebGL engine reads it.
import type { ZoneId } from './zones.gen';

export interface RoomState {
  zone: ZoneId | null;
  /** yaw offset in degrees for screens that reuse a zone from another angle */
  yaw: number;
  /** an overlay (rest, session complete) borrowing another zone */
  override: { zone: ZoneId; yaw?: number } | null;
  /** a set is running: the room holds still */
  still: boolean;
  /** horizontal drags may look around (off where swipes mean something else) */
  drag: boolean;
}

let s: RoomState = { zone: 'entrance', yaw: 0, override: null, still: false, drag: true };
const subs = new Set<() => void>();
export const roomState = () => s;
export function setRoom(p: Partial<RoomState>) {
  const n = { ...s, ...p };
  if (JSON.stringify(n) === JSON.stringify(s)) return;
  s = n;
  subs.forEach((f) => f());
}
export function onRoom(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }

/** Route -> zone (DESIGN.md §1 zone map). */
export function zoneForPath(path: string): Pick<RoomState, 'zone' | 'yaw' | 'drag'> {
  if (path === '/') return { zone: 'entrance', yaw: 0, drag: true };
  if (path.startsWith('/summary')) return { zone: 'ceiling', yaw: 30, drag: true };
  if (path === '/history') return { zone: 'entrance', yaw: 140, drag: true };
  if (path === '/week' || path.startsWith('/day')) return { zone: 'lane', yaw: 0, drag: true };
  if (path === '/body') return { zone: 'mesh', yaw: 0, drag: true };
  if (path === '/workout' || path.startsWith('/exercise')) return { zone: 'bench', yaw: 0, drag: !path.startsWith('/workout') };
  if (path === '/settings') return { zone: null, yaw: 0, drag: false };
  return { zone: 'entrance', yaw: 0, drag: true };
}

// ---- prop views: DOM boxes the engine draws a small 3D scene into
export type PropKind = 'plate' | 'dumbbell' | 'kettlebell' | 'meshwall';
export interface PropView { id: number; el: HTMLElement; kind: PropKind; lit: boolean; spin: number }
let nextId = 1;
const views = new Map<number, PropView>();
export const propViews = () => views;
export function addView(v: Omit<PropView, 'id'>) { const id = nextId++; views.set(id, { ...v, id }); subs.forEach((f) => f()); return id; }
export function removeView(id: number) { views.delete(id); subs.forEach((f) => f()); }
