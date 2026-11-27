// Mounts the one persistent room canvas behind every screen. three.js loads after first paint; until
// then (and without WebGL) a blurred still of the zone stands in, under the CSS scrim.
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { getState, useStore } from '../logic/store';
import { attach } from './gyro';
import { onRoom, roomState } from './state';
import { ZONE_FILES } from './zones.gen';
import type { Room } from './engine';

const phone = () => matchMedia('(max-width: 820px), (pointer: coarse)').matches;

function webgl() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** iOS Low Power Mode caps requestAnimationFrame at 30 fps: if the first 1.5 s never beat ~40 fps, assume power-limited. */
function measurePowerLimited(): Promise<boolean> {
  return new Promise((res) => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / 1.5 < 40); };
    requestAnimationFrame(f);
  });
}

export function RoomCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const room = useRef<Room | null>(null);
  const reduce = useReducedMotion();
  const clean = useStore((s) => s.settings.clean);
  const battery = useStore((s) => s.settings.battery);
  const gyro = useStore((s) => s.settings.gyro);
  const [ready, setReady] = useState(false);
  const [zone, setZone] = useState(roomState().override?.zone ?? roomState().zone);
  const [fallback, setFallback] = useState(false);
  const limited = useRef(false);

  useEffect(() => onRoom(() => setZone(roomState().override?.zone ?? roomState().zone)), []);
  useEffect(() => { document.documentElement.classList.toggle('clean', clean); }, [clean]);
  useEffect(() => { if (gyro) attach(); }, [gyro]);

  useEffect(() => {
    if (!webgl()) { setFallback(true); return; }
    let cancelled = false;
    const start = async () => {
      limited.current = await measurePowerLimited();
      const { Room } = await import('./engine');
      if (cancelled || !canvas.current) return;
      room.current = new Room({
        canvas: canvas.current,
        phone: phone(),
        clean: () => getState().settings.clean,
        still: () => {
          const s = getState().settings;
          return s.battery === 'on' || (s.battery === 'auto' && limited.current) || matchMedia('(prefers-reduced-motion: reduce)').matches;
        },
        onReady: () => setReady(true),
      });
    };
    // after first paint and the app being interactive
    const id = ('requestIdleCallback' in window ? (window as Window & { requestIdleCallback: (f: () => void, o?: object) => number }).requestIdleCallback(() => void start(), { timeout: 1200 }) : setTimeout(() => void start(), 600)) as number;
    return () => { cancelled = true; clearTimeout(id); room.current?.dispose(); room.current = null; };
  }, []);
  useEffect(() => { room.current?.poke(); }, [clean, battery, reduce]);

  const ph = zone ? ZONE_FILES[zone] : null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      {ph && (!ready || fallback) && (
        <div className="absolute inset-0 transition-opacity duration-500" style={{
          backgroundImage: `url(${fallback ? ph.phone : ph.placeholder})`, backgroundSize: 'cover', backgroundPosition: '50% 45%',
          filter: fallback ? 'sepia(0.25) brightness(0.55)' : 'blur(14px) brightness(0.6)', transform: fallback ? undefined : 'scale(1.1)',
        }} />
      )}
      {(!ready || fallback) && <div className="ambient" />}
      <canvas ref={canvas} className="absolute inset-0 h-full w-full transition-opacity duration-500" style={{ opacity: ready && zone ? 1 : 0 }} />
      <div className="vignette" />
    </div>
  );
}
