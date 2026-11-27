// Week: a 1970s time-clock punch card. Each completed session punches its column; a new punch
// animates once (the die comes down, the chad falls).
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { fmtWeekday } from '../logic/dates';
import { dayDone } from '../logic/motivation';
import { programDay, weekDates } from '../logic/schedule';
import { useStore } from '../logic/store';
import { cue } from '../lib/audio';

const SEEN = 'tempo.punched';
const short: Record<string, string> = { strength: 'LIFT', conditioning: 'BIKE', recovery: 'EASY', rest: 'REST' };

export function PunchCard({ date, className = '' }: { date: string; className?: string }) {
  const sessions = useStore((s) => s.sessions);
  const reduce = useReducedMotion();
  const days = useMemo(() => weekDates(date).map((d) => ({ d, plan: programDay(d).plan, done: dayDone(sessions, d) })), [sessions, date]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(SEEN) ?? '[]'); } catch { /* ignore */ }
    const now = days.filter((x) => x.done).map((x) => x.d);
    const f = now.filter((d) => !seen.includes(d));
    if (f.length && seen.length) { setFresh(new Set(f)); setTimeout(() => cue('stamp'), 250); }
    try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seen, ...now])].slice(-60))); } catch { /* ignore */ }
  }, [days.map((x) => x.done).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const doneCount = days.filter((x) => x.done && x.plan.kind !== 'rest').length;
  const planned = days.filter((x) => x.plan.kind !== 'rest').length;
  return (
    <div className={`print relative overflow-hidden px-4 pb-4 pt-3 ${className}`} role="img" aria-label={`Punch card: ${doneCount} of ${planned} sessions done this week`}>
      <div className="flex items-baseline justify-between">
        <p className="typed text-[13px] uppercase tracking-[0.12em] text-ink-faded">Time card · Tempo iron room</p>
        <p className="typed text-[13px] text-ink-faded">{doneCount}/{planned}</p>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 border-t border-ink/30 pt-2">
        {days.map(({ d, plan, done }) => (
          <div key={d} className="flex flex-col items-center gap-1.5">
            <span className="typed text-[12px] uppercase text-ink-faded">{fmtWeekday(d).slice(0, 3)}</span>
            <span className="relative grid h-11 w-9 place-items-center rounded-[3px] border border-dashed border-ink/35">
              {plan.kind === 'rest' ? (
                <span className="typed rotate-[-90deg] text-[10px] tracking-wider text-ink-faded">REST</span>
              ) : done ? (
                <>
                  <motion.span className="punch-hole" initial={fresh.has(d) && !reduce ? { scale: 0 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 900, damping: 30, delay: 0.15 }} />
                  {fresh.has(d) && !reduce && <motion.span className="punch-chad" initial={{ y: 0, opacity: 1, rotate: 0 }} animate={{ y: 60, opacity: 0, rotate: 140 }} transition={{ duration: 0.7, ease: 'easeIn', delay: 0.2 }} />}
                </>
              ) : (
                <span className="typed text-[10px] text-ink-faded/80">{short[plan.kind]}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
