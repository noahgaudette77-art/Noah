import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { EXERCISES } from '../data/program';
import { type PR, e1rm } from '../logic/motivation';
import { buzz, play } from '../lib/sfx';

const fmt = (w: number, r: number) => (w ? `${w} lb × ${r}` : `${r} reps`);

/** One quiet full-screen moment for a new best. Auto-dismisses after 2.6 s; tap to close. */
export function PRMoment({ pr, onDone }: { pr: PR; onDone: () => void }) {
  const reduce = useReducedMotion();
  // keep the latest callback without restarting the timer when the parent re-renders
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    play('pr'); buzz([40, 60, 40]);
    const t = setTimeout(() => done.current(), 2600);
    return () => clearTimeout(t);
  }, []);
  const ex = EXERCISES[pr.exerciseId];
  return (
    <motion.div role="alertdialog" aria-label={`New best: ${ex.name} ${fmt(pr.set.weight, pr.set.reps)}`} onClick={onDone}
      className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-void/95 backdrop-blur"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {!reduce && (
        <motion.div className="pointer-events-none absolute inset-y-0 w-[60vw] -skew-x-12"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,110,50,0.22), transparent)' }}
          initial={{ x: '-80vw' }} animate={{ x: '120vw' }} transition={{ duration: 1.8, ease: [0.3, 0, 0.2, 1] }} />
      )}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(45% 40% at 50% 48%, rgba(255,91,31,0.20), transparent 70%)' }} />
      <div className="relative px-8 text-center">
        <motion.p className="label text-ember" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>New best</motion.p>
        <motion.p className="display mt-4 text-[min(22vw,180px)] leading-[0.85]" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.15 }}>
          {fmt(pr.set.weight, pr.set.reps)}
        </motion.p>
        <motion.p className="mt-5 text-xl text-chalk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>{ex.name}</motion.p>
        <motion.p className="mt-1 text-ash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          Previous best {fmt(pr.previous.weight, pr.previous.reps)}.{pr.set.weight ? ` Estimated max ${Math.round(e1rm(pr.previous))} to ${Math.round(e1rm(pr.set))} lb.` : ''}
        </motion.p>
      </div>
    </motion.div>
  );
}
