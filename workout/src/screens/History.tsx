import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Button, Card } from '../components/ui';
import { EXERCISES, dayByKey } from '../data/program';
import { fmtLong } from '../logic/dates';
import { volume } from '../logic/progression';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';

export default function History() {
  const sessions = useStore((s) => s.sessions);
  const [open, setOpen] = useState<string | null>(null);
  const list = [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.startedAt - a.startedAt));
  const totalSets = sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.filter((x) => x.done).length, 0), 0);
  return (
    <div>
      <PageHeader eyebrow={`${sessions.length} sessions · ${totalSets} sets`} title="History" />
      <div className="mx-auto max-w-5xl space-y-3 px-4 sm:px-8">
        {list.length === 0 && (
          <Card className="grid place-items-center p-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-700 text-bone-2"><Icon name="history" /></span>
            <p className="display mt-4 text-3xl">Nothing logged yet</p>
            <p className="mt-2 max-w-xs text-bone-3">Finish a session and it shows up here with every set.</p>
            <Button variant="primary" className="mt-6" onClick={() => navigate('/')}>Go to Today</Button>
          </Card>
        )}
        {list.map((s) => {
          const plan = dayByKey(s.dayKey);
          const sets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
          const vol = s.exercises.reduce((a, e) => a + volume(e), 0);
          const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
          const isOpen = open === s.id;
          return (
            <Card key={s.id} as="article" className="overflow-hidden">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)} className="flex min-h-[76px] w-full items-center gap-4 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <p className="eyebrow">{fmtLong(s.date)}</p>
                  <p className="display mt-1 text-2xl">{plan.title}</p>
                </div>
                <div className="num hidden text-right text-sm text-bone-2 sm:block">
                  {sets > 0 && <p>{sets} sets · {(vol / 1000).toFixed(1)}k lb</p>}
                  <p className="text-bone-3">{mins ? `${mins} min` : ''}{s.cardioDone.length ? ` · cardio done` : ''}</p>
                </div>
                <p className="num text-sm text-bone-2 sm:hidden">{sets ? `${sets} sets` : 'Cardio'}</p>
                <Icon name="chevD" size={20} className={`shrink-0 text-bone-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ul className="space-y-3 border-t border-white/5 p-4">
                      {s.exercises.filter((e) => e.sets.some((x) => x.done)).map((e) => (
                        <li key={e.exerciseId}>
                          <p className="text-sm font-semibold">{EXERCISES[e.exerciseId].name}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {e.sets.filter((x) => x.done).map((x, i) => (
                              <span key={i} className={`num rounded-lg px-2 py-1 text-xs ${x.drop ? 'bg-volt/15 text-volt' : 'bg-ink-700 text-bone-2'}`}>{x.weight ? `${x.weight}×` : ''}{x.reps}<span className="text-bone-3"> @{x.rir}</span></span>
                            ))}
                          </div>
                        </li>
                      ))}
                      {s.cardioDone.map((c) => <li key={c} className="flex items-center gap-2 text-sm text-bone-2"><Icon name="check" size={16} className="text-volt" />{c === 'inclineWalk' ? 'Incline walk' : c === 'bikeIntervals' ? 'Bike intervals' : 'Easy cardio'}</li>)}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
