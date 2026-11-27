// Progress wall: four target-physique posters on brick. Locked ones are painted over (the figure only
// a ghost under brick-red paint); reaching a checkpoint peels the paint off with a stamp and a thud.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { milestones } from '../logic/motivation';
import { fmtShort } from '../logic/dates';
import { useStore } from '../logic/store';
import { cue } from '../lib/audio';
import { Stamp } from './iron';

const POSTERS = [
  { id: 'poster-24', bf: 24, label: 'Start', at: 24 },
  { id: 'poster-19', bf: 19, label: 'Checkpoint', at: 19 },
  { id: 'poster-15', bf: 15, label: 'Checkpoint', at: 15.5 },
  { id: 'poster-12', bf: 12, label: 'Goal', at: 12 },
];
const SEEN = 'tempo.posters.seen';

export function PosterWall({ date }: { date: string }) {
  const body = useStore((s) => s.body);
  const reduce = useReducedMotion();
  const m = useMemo(() => milestones(body, date), [body, date]);
  const reached = (at: number) => at === 24 || !!m.list.find((x) => x.bf === at)?.reached;
  const when = (at: number) => m.list.find((x) => x.bf === at);
  const count = POSTERS.filter((p) => reached(p.at)).length;
  // peel the newest poster once, the first time it is seen unlocked
  const [peel, setPeel] = useState<string | null>(null);
  useEffect(() => {
    let seen = 1;
    try { seen = Number(localStorage.getItem(SEEN) ?? '1'); } catch { /* ignore */ }
    if (count > seen) {
      setPeel(POSTERS[count - 1].id);
      const t = setTimeout(() => cue('plate'), reduce ? 0 : 650);
      try { localStorage.setItem(SEEN, String(count)); } catch { /* ignore */ }
      return () => clearTimeout(t);
    }
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-label="Target physique posters" className="brickwall -mx-4 overflow-hidden px-4 py-6 sm:mx-0 sm:rounded-[6px]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="label text-ash">The wall</p>
          <h2 className="display mt-1 text-[32px]">Target physique</h2>
        </div>
        <p className="typed text-sm text-ash">{count} of 4 up</p>
      </div>
      <ol tabIndex={0} aria-label="Posters, scroll sideways" className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 pt-3">
        {POSTERS.map((p, i) => {
          const open = reached(p.at);
          const w = when(p.at);
          return (
            <li key={p.id} className="w-[62%] max-w-[240px] shrink-0 snap-center" style={{ rotate: `${[-1.2, 0.8, -0.6, 1.1][i]}deg` }}>
              <figure className="print tape relative aspect-[2/3] overflow-hidden p-1.5">
                <picture>
                  <source srcSet={`assets/art/${p.id}.avif`} type="image/avif" />
                  <img src={`assets/art/${p.id}.webp`} alt={open ? `Target physique at about ${p.bf}% body fat` : `Locked poster: about ${p.bf}% body fat`} loading="lazy" decoding="async"
                    className="h-full w-full object-cover" style={open ? undefined : { filter: 'grayscale(1) contrast(0.6) brightness(0.55)' }} />
                </picture>
                <AnimatePresence>
                  {(!open || peel === p.id) && (
                    <motion.div key="paint" className="paintover absolute inset-0"
                      initial={false}
                      animate={peel === p.id && !reduce ? { clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' } : { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                      transition={{ duration: 0.75, ease: [0.5, 0, 0.2, 1], delay: 0.3 }}
                      onAnimationComplete={() => peel === p.id && setPeel(null)}
                    />
                  )}
                </AnimatePresence>
                {!open && (
                  <figcaption className="absolute inset-x-0 bottom-0 p-3 text-center">
                    <p className="stencil text-[40px] text-cream/90">{p.bf}%</p>
                    <p className="typed text-[13px] text-cream/80">{w ? `Opens about ${fmtShort(w.date)} · ${w.weight.toFixed(0)} lb` : ''}</p>
                  </figcaption>
                )}
                {open && (
                  <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2.5">
                    <span className="dymo">{p.label} · {p.bf}%</span>
                    {p.at !== 24 && <Stamp land={peel === p.id} size={22} angle={-10}>Reached</Stamp>}
                  </figcaption>
                )}
              </figure>
            </li>
          );
        })}
      </ol>
      <p className="typed mt-1 text-[13px] text-ash">An original illustrated athlete, not a promise of your exact shape. Posters open as your 7-day average reaches each checkpoint.</p>
    </section>
  );
}
