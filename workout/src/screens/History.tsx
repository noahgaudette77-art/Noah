import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Button, Card, Empty } from '../components/ui';
import { CARDIO, EXERCISES, dayByKey } from '../data/program';
import { fmtLong } from '../logic/dates';
import { sessionPRs } from '../logic/motivation';
import { volume } from '../logic/progression';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';

export default function History() {
  const sessions = useStore((s) => s.sessions);
  const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.startedAt - a.startedAt)), [sessions]);
  const totalSets = sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.filter((x) => x.done).length, 0), 0);
  const totalVol = sessions.reduce((a, s) => a + s.exercises.reduce((b, e) => b + volume(e), 0), 0);
  return (
    <div>
      <PageHeader eyebrow={`${sessions.length} sessions · ${totalSets} sets · ${(totalVol / 1000).toFixed(1)}k lb lifted`} title="History" />
      <div className="gutter mx-auto max-w-5xl space-y-3">
        {list.length === 0 && (
          <Empty icon="history" title="Nothing logged yet" body="Finish a session and every set lands here, with your new bests marked."
            action={<Button variant="primary" onClick={() => navigate('/')}>Go to Today</Button>} />
        )}
        {list.map((s) => {
          const plan = dayByKey(s.dayKey);
          const sets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
          const vol = s.exercises.reduce((a, e) => a + volume(e), 0);
          const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
          const prs = sessionPRs(sessions, s);
          const isOpen = open === s.id;
          return (
            <Card key={s.id} as="article" className="overflow-hidden">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)} className="flex min-h-[88px] w-full items-center gap-4 p-5 text-left">
                <div className="min-w-0 flex-1">
                  <p className="label">{fmtLong(s.date)}</p>
                  <p className="display mt-1.5 text-[32px]">{plan.title}</p>
                </div>
                <div className="text-right">
                  {sets > 0 ? <p className="display text-[28px] leading-none">{(vol / 1000).toFixed(1)}k<span className="ml-1 font-sans text-xs font-normal text-smoke">lb</span></p> : <p className="text-sm text-ash">Cardio</p>}
                  <p className="mt-1 text-xs text-smoke">{sets ? `${sets} sets` : ''}{mins ? ` · ${mins} min` : ''}{prs.length ? ` · ${prs.length} new best${prs.length > 1 ? 's' : ''}` : ''}</p>
                </div>
                <Icon name="chevD" size={20} className={`shrink-0 text-smoke transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <ul className="space-y-4 border-t border-white/5 p-5">
                      {s.exercises.filter((e) => e.sets.some((x) => x.done)).map((e) => (
                        <li key={e.exerciseId}>
                          <p className="flex items-center gap-2 text-sm font-semibold">{EXERCISES[e.exerciseId].name}{prs.some((p) => p.exerciseId === e.exerciseId) && <Icon name="trophy" size={16} weight="fill" className="text-ember" />}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {e.sets.filter((x) => x.done).map((x, i) => (
                              <span key={i} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${x.drop ? 'bg-white/[0.04] text-ash' : 'bg-white/[0.07] text-chalk'}`}>{x.drop ? 'Drop ' : ''}{x.weight ? `${x.weight}×` : ''}{x.reps}<span className="font-normal text-smoke"> · {x.rir} left</span></span>
                            ))}
                          </div>
                        </li>
                      ))}
                      {s.cardioDone.map((c) => <li key={c} className="flex items-center gap-2 text-sm text-ash"><Icon name="check" size={16} className="text-chalk" />{CARDIO[c]?.name ?? (c === 'inclineWalk' ? 'Incline walk' : 'Cardio')}</li>)}
                      <li><Button variant="ghost" className="-ml-3" onClick={() => navigate(`/summary/${encodeURIComponent(s.id)}`)}>Open summary<Icon name="chevR" size={18} /></Button></li>
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
