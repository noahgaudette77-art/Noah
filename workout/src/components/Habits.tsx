import { motion } from 'framer-motion';
import { HABITS } from '../data/program';
import { setState, useStore } from '../logic/store';
import { Icon } from './Icon';
import { Card, Label, Ring } from './ui';

const EMPTY = {};
export function HabitsCard({ date }: { date: string }) {
  const day = useStore((s) => s.habits[date] ?? EMPTY) as Record<string, boolean | undefined>;
  const done = HABITS.filter((h) => day[h.id]).length;
  const toggle = (id: string) =>
    setState((s) => ({ ...s, habits: { ...s.habits, [date]: { ...s.habits[date], [id]: !(s.habits[date] as Record<string, boolean | undefined> | undefined)?.[id] } } }));
  return (
    <Card className="p-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <Label>Today's basics</Label>
          <h2 className="display mt-2 text-[40px]">Fuel and recover</h2>
        </div>
        <Ring value={done / HABITS.length} size={64} stroke={6} tone="rim" label={`${done} of ${HABITS.length} habits done`}>
          <span className="display text-[22px]">{done}/{HABITS.length}</span>
        </Ring>
      </div>
      <ul>
        {HABITS.map((h) => {
          const on = !!day[h.id];
          return (
            <li key={h.id} className="border-t border-white/[0.05] first:border-0">
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(h.id)} className="flex min-h-[68px] w-full items-center gap-4 py-2 text-left">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${on ? 'bg-chalk text-void' : 'bg-white/[0.05] text-transparent shadow-lit'}`}>
                  <motion.span initial={false} animate={{ scale: on ? 1 : 0.4, opacity: on ? 1 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 28 }}><Icon name="check" size={20} /></motion.span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{h.label}<span className="ml-2 font-normal text-ash">{h.target}</span></span>
                  <span className="block text-sm text-smoke">{h.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
