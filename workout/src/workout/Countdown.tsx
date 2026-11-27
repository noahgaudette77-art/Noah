import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { buzz, play } from '../lib/sfx';

/** Full-screen 3-2-1, then calls onDone. Esc or tap cancels. */
export function Countdown({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [n, setN] = useState(3);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (n === 0) { play('go'); buzz(40); const t = setTimeout(() => done.current(), 380); return () => clearTimeout(t); }
    play('count'); buzz(18);
    const t = setTimeout(() => setN((x) => x - 1), 820);
    return () => clearTimeout(t);
  }, [n]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Get ready" className="fixed inset-0 z-[70] grid place-items-center bg-void/92 backdrop-blur-md"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(40% 35% at 50% 50%, rgba(255,91,31,0.22), transparent 70%)' }} />
      <AnimatePresence mode="popLayout">
        <motion.span key={n} className={`display relative leading-none ${n ? 'text-[46vh] text-chalk' : 'text-[28vh] text-ember'}`}
          initial={{ scale: 1.35, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          aria-live="assertive">
          {n || 'Go'}
        </motion.span>
      </AnimatePresence>
      <p className="label absolute bottom-[calc(32px+var(--safe-b))]">Tap to cancel</p>
    </motion.div>
  );
}
