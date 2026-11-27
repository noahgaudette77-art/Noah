import { motion } from 'framer-motion';
import { useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Card } from '../components/ui';
import { META } from '../data/program';
import { addDays, diffDays, fmtShort, fmtWeekday } from '../logic/dates';
import { estimateDay } from '../logic/estimate';
import { programDay, weekDates } from '../logic/schedule';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';
import { today } from '../lib/today';

const KIND_ICON: Record<string, IconName> = { strength: 'dumbbell', conditioning: 'bike', recovery: 'heat', rest: 'moon' };

export default function Week() {
  const t = today();
  const sessions = useStore((s) => s.sessions);
  const curWeek = Math.max(1, programDay(t).week);
  const [week, setWeek] = useState(curWeek);
  const dates = weekDates(addDays(META.startDate, (week - 1) * 7));
  const doneDates = new Set(sessions.map((s) => `${s.date}:${s.dayKey}`));
  const doneCount = dates.filter((d) => doneDates.has(`${d}:${programDay(d).plan.key}`)).length;
  return (
    <div>
      <PageHeader
        eyebrow={`${fmtShort(dates[0])} – ${fmtShort(dates[6])}`}
        title={<>Week <span className="text-volt">{week}</span><span className="text-bone-3">/{META.weeks}</span></>}
        right={
          <div className="flex gap-2">
            <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 disabled:opacity-30" onClick={() => setWeek((w) => Math.max(1, w - 1))} disabled={week === 1} aria-label="Previous week"><Icon name="chevL" /></button>
            <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-800 disabled:opacity-30" onClick={() => setWeek((w) => Math.min(META.weeks, w + 1))} disabled={week === META.weeks} aria-label="Next week"><Icon name="chevR" /></button>
          </div>
        }
      />
      <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-8">
        <div aria-label={`Program progress: week ${curWeek} of ${META.weeks}`} role="img" className="flex h-2.5 gap-[3px]">
          {Array.from({ length: META.weeks }, (_, i) => (
            <span key={i}
              className={`flex-1 rounded-full transition-colors ${i + 1 === week ? 'bg-bone' : i + 1 < curWeek ? 'bg-volt/70' : i + 1 === curWeek ? 'bg-volt' : 'bg-ink-700'}`} />
          ))}
        </div>
        <p className="num text-sm text-bone-3">{doneCount} of 6 training days logged this week · month {Math.min(12, Math.ceil((week * 7) / 30.44))} of 12</p>
        <ol className="grid gap-2.5 md:grid-cols-2">
          {dates.map((d, i) => {
            const pd = programDay(d);
            const isToday = d === t;
            const done = doneDates.has(`${d}:${pd.plan.key}`);
            const past = diffDays(d, t) < 0;
            const est = estimateDay(pd.plan);
            return (
              <motion.li key={d} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <a href={`#/day/${d}`} onClick={(e) => { e.preventDefault(); navigate(`/day/${d}`); }}
                  className={`group flex min-h-[84px] items-center gap-4 rounded-[22px] border p-4 transition-colors ${isToday ? 'border-volt/50 bg-volt/[0.05]' : 'border-white/[0.06] bg-ink-900 hover:bg-ink-850'}`}>
                  <div className="w-12 text-center">
                    <p className="eyebrow">{fmtWeekday(d)}</p>
                    <p className="num text-2xl font-semibold">{Number(d.slice(8))}</p>
                  </div>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${done ? 'bg-volt text-volt-ink' : 'bg-ink-700 text-bone-2'}`}>
                    <Icon name={done ? 'check' : KIND_ICON[pd.plan.kind]} strokeWidth={done ? 2.5 : 1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="display text-2xl">{pd.plan.title}</p>
                    <p className="truncate text-sm text-bone-3">
                      {isToday ? <span className="font-semibold text-volt">Today · </span> : null}
                      {done ? 'Done' : past && pd.plan.kind !== 'rest' ? 'Not logged' : pd.plan.subtitle}
                      {est.totalMin > 0 && !done ? ` · ~${est.totalMin} min` : ''}
                    </p>
                  </div>
                  <Icon name="chevR" size={18} className="text-bone-3 transition-transform group-hover:translate-x-0.5" />
                </a>
              </motion.li>
            );
          })}
        </ol>
        <Card className="p-5 text-sm text-bone-2">
          <p className="eyebrow mb-2">Weekly rhythm</p>
          Four 45-minute lifting sessions with a 20 minute incline walk (15%, 3 mph), one bike interval day, one long easy day and a full rest day. Sauna on Wednesday and Sunday.
        </Card>
      </div>
    </div>
  );
}
