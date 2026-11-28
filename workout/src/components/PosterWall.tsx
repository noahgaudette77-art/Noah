// Progress wall: four photocopied 1980s gym flyers on the brick, one per checkpoint. Text only, no people.
// Locked flyers are still taped up but greyed out with "Coming up"; reaching a checkpoint stamps it.
import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { fmtShort } from '../logic/dates';
import { milestones } from '../logic/motivation';
import { useStore } from '../logic/store';
import { cue } from '../lib/audio';
import { Stamp } from './iron';

const FLYERS = [
  { bf: 24, at: 24, phase: 'Day one', line: 'Where it starts' },
  { bf: 19, at: 19, phase: 'Phase 2', line: 'Lean out' },
  { bf: 15, at: 15.5, phase: 'Phase 3', line: 'Cut lines' },
  { bf: 12, at: 12, phase: 'The goal', line: 'Lean and strong' },
];
const SEEN = 'tempo.posters.seen';

export function PosterWall({ date }: { date: string }) {
  const body = useStore((s) => s.body);
  const reduce = useReducedMotion();
  const m = useMemo(() => milestones(body, date), [body, date]);
  const when = (at: number) => m.list.find((x) => x.bf === at);
  const reached = (at: number) => at === 24 || !!when(at)?.reached;
  const count = FLYERS.filter((f) => reached(f.at)).length;
  const [fresh, setFresh] = useState<number | null>(null);
  useEffect(() => {
    let seen = 1;
    try { seen = Number(localStorage.getItem(SEEN) ?? '1'); } catch { /* ignore */ }
    if (count > seen) { setFresh(count - 1); setTimeout(() => cue('stamp'), reduce ? 0 : 300); }
    try { localStorage.setItem(SEEN, String(count)); } catch { /* ignore */ }
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section aria-label="Checkpoint flyers" className="brickwall -mx-4 overflow-hidden px-4 py-6 sm:mx-0 sm:rounded-[6px]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="label text-ash">The wall</p>
          <h2 className="display mt-1 text-[32px]">Checkpoints</h2>
        </div>
        <p className="typed text-sm text-ash">{count} of 4 reached</p>
      </div>
      <ol tabIndex={0} aria-label="Checkpoint flyers, scroll sideways" className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 pt-3">
        {FLYERS.map((f, i) => {
          const open = reached(f.at);
          const w = when(f.at);
          const weight = f.at === 24 ? 225 : w?.weight;
          return (
            <li key={f.bf} className="w-[62%] max-w-[230px] shrink-0 snap-center" style={{ rotate: `${[-1.2, 0.9, -0.7, 1.1][i]}deg` }}>
              <figure className={`flyer tape relative flex aspect-[3/4] flex-col overflow-hidden px-4 pb-4 pt-5 ${open ? '' : 'opacity-60 grayscale'}`}
                aria-label={`${f.phase}: about ${f.bf}% body fat${weight ? `, about ${weight.toFixed(0)} lb` : ''}${open ? ', reached' : ', coming up'}`}>
                <p className="typed text-[12px] uppercase tracking-[0.2em]">Tempo iron room presents</p>
                <div className="stripes mt-2 w-full" />
                <p className="display mt-3 text-[18px] leading-none">{f.phase}</p>
                <p className="display mt-1 text-[92px] leading-[0.8] tracking-tight">{f.bf}<span className="text-[44px]">%</span></p>
                <p className="display text-[20px] uppercase leading-none">{f.line}</p>
                <div className="flex-1" />
                <p className="typed text-[13px] leading-tight">{f.at === 24 ? 'Nov 30 · 225 lb' : `${w ? fmtShort(w.date) : ''} · about ${weight?.toFixed(0)} lb`}</p>
                {open && f.at !== 24 && (
                  <span className="absolute right-2 top-16"><Stamp land={fresh === i} size={26} angle={-12} color="#C42B21">Reached</Stamp></span>
                )}
                {!open && <span className="absolute right-2 top-16"><Stamp size={20} angle={-8} color="#3a342d">Coming up</Stamp></span>}
              </figure>
            </li>
          );
        })}
      </ol>
      <p className="typed mt-1 text-[13px] text-ash">Each flyer gets stamped when your 7-day average reaches that checkpoint.</p>
    </section>
  );
}
