import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Button, Empty } from '../components/ui';
import { CARDIO, EXERCISES, dayByKey } from '../data/program';
import { sessionPRs } from '../logic/motivation';
import { volume } from '../logic/progression';
import { sessionMinutes } from '../logic/session';
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
        {list.length > 0 && (
          <div className="print ledger relative overflow-hidden pb-4 pl-12 pr-4 pt-5">
            <p className="typed text-[13px] uppercase tracking-[0.14em] text-ink-faded">Training log · Tempo iron room · 1974</p>
            <ol className="mt-3">
              {list.map((s) => {
                const plan = dayByKey(s.dayKey);
                const sets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
                const vol = s.exercises.reduce((a, e) => a + volume(e), 0);
                const mins = s.finishedAt ? sessionMinutes(s) ?? 0 : 0;
                const prs = sessionPRs(sessions, s);
                const isOpen = open === s.id;
                return (
                  <li key={s.id} className="ledger-row">
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)} className="typed flex min-h-[56px] w-full items-baseline gap-3 py-2 text-left text-ink">
                      <span className="ledger-date w-[52px] shrink-0 text-[13px] text-ink-faded">{s.date.slice(5).replace('-', '/')}</span>
                      <span className="min-w-0 flex-1">
                        <span className="text-[17px] uppercase tracking-wide">{plan.title}</span>
                        <span className="block text-[13px] text-ink-faded">{sets ? `${sets} sets · ${(vol / 1000).toFixed(1)}k lb` : 'cardio'}{mins ? <span className="whitespace-nowrap">{` · ${mins}′`}</span> : ''}</span>
                      </span>
                      {prs.length > 0 && <span className="stamp shrink-0 self-center text-[15px]" style={{ color: 'var(--stamp)', rotate: '-6deg', borderWidth: 2 }}>PR{prs.length > 1 ? ` ×${prs.length}` : ''}</span>}
                      <Icon name="chevD" size={18} className={`shrink-0 self-center text-ink-faded transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <ul className="typed space-y-2 pb-3 text-[14px] text-ink">
                            {s.exercises.filter((e) => e.sets.some((x) => x.done)).map((e) => (
                              <li key={e.exerciseId}>
                                <span className="uppercase">{EXERCISES[e.exerciseId].short}</span>{prs.some((p) => p.exerciseId === e.exerciseId) && <span className="ml-2 text-stamp">★ best</span>}
                                <span className="block tnum text-ink-faded">{e.sets.filter((x) => x.done).map((x) => `${x.drop ? 'd ' : ''}${x.weight ? `${x.weight}×` : ''}${x.reps}`).join('  ·  ')}</span>
                              </li>
                            ))}
                            {s.cardioDone.map((c) => <li key={c} className="uppercase">✓ {CARDIO[c]?.name ?? (c === 'inclineWalk' ? 'Incline walk' : 'Cardio')}</li>)}
                            <li><button type="button" className="h-11 text-[14px] underline underline-offset-4" onClick={() => navigate(`/summary/${encodeURIComponent(s.id)}`)}>Open summary →</button></li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
