// The room behind every screen: a still 1980s gym photograph for the current zone (no people, no
// motion), darkened under a scrim so content stays legible. three.js loads only when a screen has
// 3D props (milestone plates, the rest dumbbell) and draws them on a transparent canvas on top.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { getState, useStore } from '../logic/store';
import { onRoom, propViews, roomState } from './state';
import { ZONE_FILES } from './zones.gen';
import type { Room } from './engine';

const phone = () => matchMedia('(max-width: 820px), (pointer: coarse)').matches;
function webgl() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export function RoomCanvas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const room = useRef<Room | null>(null);
  const loading = useRef(false);
  const reduce = useReducedMotion();
  const clean = useStore((s) => s.settings.clean);
  const battery = useStore((s) => s.settings.battery);
  const [zone, setZone] = useState(roomState().override?.zone ?? roomState().zone);

  useEffect(() => { document.documentElement.classList.toggle('clean', clean); }, [clean]);

  useEffect(() => {
    const start = async () => {
      if (room.current || loading.current || !propViews().size || !webgl()) return;
      loading.current = true;
      const { Room } = await import('./engine');
      if (!canvas.current) return;
      room.current = new Room({
        canvas: canvas.current,
        phone: phone(),
        panorama: false,
        clean: () => getState().settings.clean,
        still: () => getState().settings.battery === 'on' || matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    };
    const sync = () => { setZone(roomState().override?.zone ?? roomState().zone); void start(); };
    sync();
    return onRoom(sync);
  }, []);
  useEffect(() => () => { room.current?.dispose(); room.current = null; }, []);
  useEffect(() => { room.current?.poke(); }, [clean, battery, reduce]);

  const z = zone ? ZONE_FILES[zone] : null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-soot">
      <AnimatePresence initial={false}>
        {z && (
          <motion.div key={zone} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.1 : 0.4 }}>
            <div className="absolute inset-0 scale-105 bg-cover bg-center blur-md" style={{ backgroundImage: `url(${z.placeholder})` }} />
            <picture>
              <source srcSet={z.avif} type="image/avif" />
              <img src={z.photo} alt="" decoding="async" className="room-photo absolute inset-0 h-full w-full object-cover" />
            </picture>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="ambient" />
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="vignette" />
    </div>
  );
}
