// Cold open: once a day, at most 2 s, tap to skip. The lamp hums and flickers on, its cone opens on the
// room, the title paints on in stencil. Reduced motion: a 150 ms fade. Clean mode: no flicker.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { todayISO } from '../logic/dates';
import { getState, setState } from '../logic/store';
import { cue } from '../lib/audio';

export function ColdOpen() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => getState().settings.coldOpen !== todayISO() && !location.hash.startsWith('#/workout'));
  const clean = getState().settings.clean;
  useEffect(() => {
    if (!show) return;
    setState((s) => ({ ...s, settings: { ...s.settings, coldOpen: todayISO() } }));
    cue('hum');
    const t = setTimeout(() => setShow(false), reduce ? 400 : 2000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AnimatePresence>
      {show && (
        <motion.div key="co" className="fixed inset-0 z-[90] grid place-items-center overflow-hidden bg-black" onClick={() => setShow(false)}
          role="presentation" exit={{ opacity: 0, transition: { duration: reduce ? 0.15 : 0.35 } }}>
          {/* the light cone opening on the room */}
          <motion.div className="absolute inset-0" style={{ background: 'radial-gradient(70% 45% at 50% 14%, rgba(235,240,225,0.38), rgba(220,225,205,0.08) 50%, transparent 75%)' }}
            initial={{ opacity: 0, scaleY: 0.3 }} animate={reduce ? { opacity: 1, scaleY: 1 } : { opacity: clean ? [0, 1] : [0, 0, 0.8, 0.2, 1, 0.55, 1], scaleY: [0.3, 0.3, 0.6, 0.6, 1, 1, 1] }}
            transition={{ duration: reduce ? 0.15 : 1.3, times: reduce ? undefined : clean ? [0, 1] : [0, 0.3, 0.38, 0.45, 0.6, 0.66, 0.8], ease: 'easeOut' }} />
          {/* the filament */}
          <motion.div className="absolute left-1/2 top-[12%] h-2 w-48 -translate-x-1/2 rounded-full" style={{ background: '#F2F6EA', boxShadow: '0 0 36px 10px rgba(230,240,220,0.5)' }}
            initial={{ opacity: 0 }} animate={{ opacity: reduce || clean ? 1 : [0, 1, 0.3, 1, 0.6, 1] }} transition={{ duration: reduce ? 0.1 : 0.9, delay: reduce ? 0 : 0.35 }} />
          <div className="relative text-center">
            <motion.p className="wallpaint uppercase text-[min(30vw,180px)]" initial={{ clipPath: reduce ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 0.75, delay: reduce ? 0 : 1.05, ease: [0.5, 0, 0.3, 1] }}>Tempo</motion.p>
            <motion.p className="typed mt-2 text-[15px] tracking-[0.3em] text-ash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.4 }}>IRON ROOM · EST. 1986</motion.p>
          </div>
          <p className="typed absolute bottom-[calc(24px+var(--safe-b))] text-[12px] text-concrete">tap to skip</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
