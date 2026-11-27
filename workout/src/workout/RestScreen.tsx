import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { SplitFlap } from '../components/SplitFlap';
import { cue, say } from '../lib/audio';
import { buzz } from '../lib/sfx';
import { PropBox } from '../room/PropBox';
import { setRoom } from '../room/state';

export interface RestState {
  endsAt: number;
  total: number;
  next: { id: string; name: string; line: string; beat: string } | null;
  logged: { exerciseId: string; idx: number; rir: number; label: string };
}

const RIR = [0, 1, 2, 3];
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

/** Rest: you look up from the bench at the ceiling lights. A split-flap clock counts down; the next
 *  exercise is pinned below as a print; a rusted dumbbell turns slowly in the lamp light. */
export function RestScreen({ rest, onChange, onEnd, onRir }: { rest: RestState; onChange: (r: RestState) => void; onEnd: () => void; onRir: (v: number) => void }) {
  useEffect(() => { setRoom({ override: { zone: 'ceiling' } }); say('rest'); return () => setRoom({ override: null }); }, []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  const left = Math.ceil((rest.endsAt - now) / 1000);
  const [rir, setRir] = useState(rest.logged.rir);
  const end = useRef(onEnd);
  end.current = onEnd;
  // a flip click each second, the coach counts the last three
  useEffect(() => {
    if (left <= 0) { say('next-exercise'); buzz([120, 80, 120]); const t = setTimeout(() => end.current(), 900); return () => clearTimeout(t); }
    if (left === 3) say('three'); else if (left === 2) say('two'); else if (left === 1) say('one'); else cue('flap');
  }, [left]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onEnd();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onEnd]);
  const size = typeof window !== 'undefined' ? Math.min(104, (window.innerWidth - 80) / 3.6) : 96;
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Rest" className="fixed inset-0 z-[60] overflow-y-auto bg-soot/25"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="gutter relative mx-auto flex min-h-full max-w-xl flex-col pb-[calc(24px+var(--safe-b))] pt-[calc(20px+var(--safe-t))]">
        <div className="flex items-center justify-between">
          <p className="label text-ash">Rest · after {rest.logged.label}</p>
          <button type="button" onClick={onEnd} className="h-11 rounded-[6px] px-4 text-sm font-semibold text-ash hover:text-chalk" aria-label="Skip rest">Skip</button>
        </div>
        <div className="mt-6 grid place-items-center">
          <div className="plate rivets px-4 pb-3 pt-6">
            <SplitFlap value={mmss(left)} size={size} label={`Rest, ${Math.max(0, left)} seconds left`} />
            <p className="label mt-2 text-center">{left > 0 ? 'Breathe. Shake it out.' : 'Go'}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <button type="button" className="h-12 w-20 rounded-[6px] font-semibold lit-raised" onClick={() => onChange({ ...rest, endsAt: rest.endsAt - 15000 })}>−15 s</button>
          <button type="button" className="h-12 w-20 rounded-[6px] font-semibold lit-raised" onClick={() => onChange({ ...rest, endsAt: rest.endsAt + 15000, total: rest.total + 15 })}>+15 s</button>
        </div>
        <PropBox kind="dumbbell" spin={0.35} className="mx-auto mt-2 h-[120px] w-[200px]" label="A rusted cast-iron dumbbell turning in the lamp light" />
        <div className="plate mt-2 p-4">
          <p className="text-center text-sm text-ash">How many more reps could you have done?</p>
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Reps in reserve">
            {RIR.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={rir === r} onClick={() => { setRir(r); onRir(r); }}
                className={`h-14 rounded-[6px] text-lg font-semibold transition ${rir === r ? 'bg-chalk text-void' : 'lit-raised text-ash hover:text-chalk'}`}>
                {r === 3 ? '3+' : r}
              </button>
            ))}
          </div>
        </div>
        {rest.next && (
          <div className="print tape mt-7 px-5 pb-5 pt-6" style={{ rotate: '-0.8deg' }}>
            <p className="label">Up next</p>
            <p className="display mt-2 text-[34px] text-ink">{rest.next.name}</p>
            <p className="typed mt-1 text-[15px] text-ink-faded">{rest.next.line}</p>
            <p className="mt-3 flex items-start gap-2 font-semibold text-ink"><Icon name="target" size={20} className="mt-0.5 shrink-0 text-stamp" />{rest.next.beat}</p>
          </div>
        )}
        <div className="flex-1" />
        <button type="button" onClick={onEnd} className="lamp-btn mt-8 h-16 w-full rounded-full text-[17px] font-semibold">I'm ready</button>
      </div>
    </motion.div>
  );
}
