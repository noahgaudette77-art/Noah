import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Num, Ring } from '../components/ui';
import { buzz, play } from '../lib/sfx';
import { DemoPlayer } from '../rig/DemoPlayer';

export interface RestState {
  endsAt: number;
  total: number;
  next: { id: string; name: string; line: string; beat: string } | null;
  logged: { exerciseId: string; idx: number; rir: number; label: string };
}

const RIR = [0, 1, 2, 3];
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

export function RestScreen({ rest, onChange, onEnd, onRir }: { rest: RestState; onChange: (r: RestState) => void; onEnd: () => void; onRir: (v: number) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  const left = Math.ceil((rest.endsAt - now) / 1000);
  const [rir, setRir] = useState(rest.logged.rir);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => {
    if (left <= 0) { play('rest-done'); buzz([120, 80, 120]); const t = setTimeout(() => end.current(), 700); return () => clearTimeout(t); }
    if (left <= 3 && left > 0) play('count');
  }, [left <= 0 ? 0 : left <= 3 ? left : 99]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onEnd();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onEnd]);
  return (
    <motion.div role="dialog" aria-modal="true" aria-label="Rest" className="fixed inset-0 z-[60] overflow-y-auto bg-void"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 40% at 50% 28%, rgba(110,160,255,0.10), transparent 70%), radial-gradient(50% 35% at 50% 100%, rgba(255,110,50,0.10), transparent 70%)' }} />
      <div className="gutter relative mx-auto flex min-h-full max-w-xl flex-col pb-[calc(24px+var(--safe-b))] pt-[calc(20px+var(--safe-t))] lg:grid lg:max-w-6xl lg:grid-cols-2 lg:content-center lg:gap-x-16">
        <div className="flex items-center justify-between lg:col-span-2">
          <p className="label">Rest · after {rest.logged.label}</p>
          <button type="button" onClick={onEnd} className="h-11 rounded-full px-4 text-sm font-semibold text-ash hover:text-chalk" aria-label="Skip rest">Skip</button>
        </div>
        <div className="lg:row-span-3"><div className="mt-4 grid place-items-center">
          <Ring value={Math.max(0, left) / rest.total} size={Math.min(300, typeof window !== 'undefined' ? window.innerWidth - 80 : 300)} stroke={12} tone="rim" glow label={`Rest, ${Math.max(0, left)} seconds left`}>
            <div className="text-center">
              <Num value={mmss(left)} className="text-[104px] leading-none" />
              <p className="label mt-1">{left > 0 ? 'Breathe. Shake it out.' : 'Go'}</p>
            </div>
          </Ring>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" className="h-12 w-20 rounded-full bg-white/[0.06] font-semibold shadow-lit hover:bg-white/[0.1]" onClick={() => onChange({ ...rest, endsAt: rest.endsAt - 15000 })}>−15 s</button>
          <button type="button" className="h-12 w-20 rounded-full bg-white/[0.06] font-semibold shadow-lit hover:bg-white/[0.1]" onClick={() => onChange({ ...rest, endsAt: rest.endsAt + 15000, total: rest.total + 15 })}>+15 s</button>
        </div>
        </div>
        <div className="mt-7">
          <p className="text-center text-sm text-ash">How many more reps could you have done?</p>
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Reps in reserve">
            {RIR.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={rir === r} onClick={() => { setRir(r); onRir(r); }}
                className={`h-14 rounded-2xl text-lg font-semibold transition ${rir === r ? 'bg-chalk text-void' : 'bg-white/[0.05] text-ash shadow-lit hover:text-chalk'}`}>
                {r === 3 ? '3+' : r}
              </button>
            ))}
          </div>
        </div>
        {rest.next && (
          <div className="mt-8 overflow-hidden rounded-[24px] lit">
            <DemoPlayer id={rest.next.id} name={rest.next.name} controls="none" aspect={16 / 8} pad={0.9} className="h-auto" />
            <div className="p-5">
              <p className="label">Up next</p>
              <p className="display mt-2 text-[34px]">{rest.next.name}</p>
              <p className="mt-1 text-sm text-ash">{rest.next.line}</p>
              <p className="mt-3 flex items-start gap-2 font-semibold"><Icon name="target" size={20} className="mt-0.5 shrink-0 text-ember" />{rest.next.beat}</p>
            </div>
          </div>
        )}
        <div className="flex-1 lg:hidden" />
        <button type="button" onClick={onEnd} className="ember-btn mt-8 lg:col-start-2 h-16 w-full rounded-[22px] text-[17px] font-semibold">I'm ready</button>
      </div>
    </motion.div>
  );
}
