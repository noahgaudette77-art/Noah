import { motion } from 'framer-motion';
import { HABITS } from '../data/program';
import { setState, useStore } from '../logic/store';
import { Card, Ring } from './ui';
import { Icon } from './Icon';

const EMPTY = {};
export function HabitsCard({ date }: { date: string }) {
  const day = useStore((s) => s.habits[date] ?? EMPTY) as Record<string, boolean | undefined>;
  const done = HABITS.filter((h) => day[h.id]).length;
  const toggle = (id: string) =>
    setState((s) => ({ ...s, habits: { ...s.habits, [date]: { ...s.habits[date], [id]: !(s.habits[date] as Record<string, boolean | undefined> | undefined)?.[id] } } }));
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="eyebrow">Daily habits</p>
          <h2 className="display mt-1 text-3xl">Fuel and recover</h2>
        </div>
        <Ring value={done / HABITS.length} size={58} label={`${done} of ${HABITS.length} habits done`}>
          <span className="num text-sm font-semibold">{done}/{HABITS.length}</span>
        </Ring>
      </div>
      <ul className="divide-y divide-white/5">
        {HABITS.map((h) => {
          const on = !!day[h.id];
          return (
            <li key={h.id}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(h.id)} className="flex min-h-[64px] w-full items-center gap-4 py-2 text-left">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors ${on ? 'border-volt bg-volt text-volt-ink' : 'border-white/15 text-transparent'}`}>
                  <motion.span initial={false} animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0 }}><Icon name="check" size={20} strokeWidth={2.5} /></motion.span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{h.label} <span className="num ml-1 text-sm font-normal text-bone-2">{h.target}</span></span>
                  <span className="block text-sm text-bone-3">{h.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
