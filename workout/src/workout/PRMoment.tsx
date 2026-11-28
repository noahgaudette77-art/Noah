import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Stamp } from '../components/iron';
import { EXERCISES } from '../data/program';
import { type PR, e1rm } from '../logic/motivation';
import { buzz, play } from '../lib/sfx';

const fmt = (w: number, r: number) => (w ? `${w} lb × ${r}` : `${r} reps`);

/** A new best: the rust-red PR stamp hits the logbook page and a plate drops on the rubber floor. */
export function PRMoment({ pr, onDone }: { pr: PR; onDone: () => void }) {
  const reduce = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t1 = setTimeout(() => { play('pr'); buzz([40, 60, 80]); }, reduce ? 0 : 260);
    const t = setTimeout(() => done.current(), 2800);
    return () => { clearTimeout(t); clearTimeout(t1); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const ex = EXERCISES[pr.exerciseId];
  return (
    <motion.div role="alertdialog" aria-label={`New best: ${ex.name} ${fmt(pr.set.weight, pr.set.reps)}`} onClick={onDone}
      className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-soot/90"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 40% at 50% 45%, rgba(239,90,74,0.22), transparent 70%)' }} />
      <motion.div className="print tape relative mx-6 w-full max-w-sm px-6 pb-7 pt-8 text-center" initial={reduce ? false : { y: -30, rotate: -3, opacity: 0 }} animate={{ y: 0, rotate: -1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
        <p className="label">New best · {ex.short}</p>
        <p className="display mt-3 text-[64px] leading-[0.9] text-ink">{fmt(pr.set.weight, pr.set.reps)}</p>
        <p className="typed mt-3 text-[14px] text-ink-faded">Previous best {fmt(pr.previous.weight, pr.previous.reps)}.{pr.set.weight ? ` Est. max ${Math.round(e1rm(pr.previous))} → ${Math.round(e1rm(pr.set))} lb.` : ''}</p>
        <div className="absolute -right-3 -top-6"><Stamp land size={72} angle={-14} color="var(--rust-hi)">PR</Stamp></div>
      </motion.div>
    </motion.div>
  );
}
