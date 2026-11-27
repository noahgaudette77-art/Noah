// Device-orientation look-around. iOS needs DeviceOrientationEvent.requestPermission() on a user tap.
type Listener = (yaw: number, pitch: number) => void;
const listeners = new Set<Listener>();
let attached = false;
let base: { a: number; b: number } | null = null;

function onOrient(e: DeviceOrientationEvent) {
  if (e.alpha == null || e.beta == null) return;
  if (!base) base = { a: e.alpha, b: e.beta };
  let dy = e.alpha - base.a; if (dy > 180) dy -= 360; if (dy < -180) dy += 360;
  const dp = e.beta - base.b;
  listeners.forEach((l) => l(dy, dp));
}

export async function requestGyro(): Promise<boolean> {
  const D = (globalThis as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!D) return false;
  try {
    if (typeof D.requestPermission === 'function') {
      const r = await D.requestPermission();
      if (r !== 'granted') return false;
    }
  } catch { return false; }
  attach();
  return true;
}

export function attach() {
  if (attached || typeof window === 'undefined') return;
  attached = true;
  base = null;
  window.addEventListener('deviceorientation', onOrient);
}

export function onGyro(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
export function recenter() { base = null; }
