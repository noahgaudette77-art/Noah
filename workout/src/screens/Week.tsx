import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { ReviewCard, WeekCard } from '../components/Motivation';
import { PageHeader } from '../components/Shell';
import { Card, Label } from '../components/ui';
import { META } from '../data/program';
import { addDays, diffDays, fmtShort, fmtWeekday } from '../logic/dates';
import { estimateDay } from '../logic/estimate';
import { dayDone, dayNumber } from '../logic/motivation';
import { programDay, weekDates } from '../logic/schedule';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';
import { today } from '../lib/today';

const KIND_ICON: Record<string, IconName> = { strength: 'dumbbell', conditioning: 'bike', recovery: 'heat', rest: 'moon' };

export default function Week() {
  const t = today();
  const sessions = useStore((s) => s.sessions);
  const curWeek = Math.max(1, Math.min(META.weeks, programDay(t).week));
  const [week, setWeek] = useState(curWeek);
  const dates = useMemo(() => weekDates(addDays(META.startDate, (week - 1) * 7)), [week]);
  const sunday = dates[6];
  const showReview = diffDays(t, sunday) >= 0 && diffDays(t, META.startDate) >= 6;
  return (
    <div>
      <PageHeader
        eyebrow={`${fmtShort(dates[0])} to ${fmtShort(dates[6])} · month ${Math.min(12, Math.ceil((week * 7) / 30.44))} of 12`}
        title={<>Week {week}<span className="text-smoke">/{META.weeks}</span></>}
        right={
          <div className="flex gap-2">
            <button type="button" className="grid h-12 w-12 place-items-center rounded-full lit-raised disabled:opacity-30" onClick={() => setWeek((w) => Math.max(1, w - 1))} disabled={week === 1} aria-label="Previous week"><Icon name="chevL" /></button>
            <button type="button" className="grid h-12 w-12 place-items-center rounded-full lit-raised disabled:opacity-30" onClick={() => setWeek((w) => Math.min(META.weeks, w + 1))} disabled={week === META.weeks} aria-label="Next week"><Icon name="chevR" /></button>
          </div>
        }
      >
        <div className="mt-6 flex h-2 gap-[3px]" role="img" aria-label={`Week ${curWeek} of ${META.weeks}`}>
          {Array.from({ length: META.weeks }, (_, i) => (
            <span key={i} className={`flex-1 rounded-full ${i + 1 === week ? 'bg-chalk' : i + 1 < curWeek ? 'bg-ember/70' : i + 1 === curWeek ? 'bg-ember' : 'bg-white/[0.07]'}`} />
          ))}
        </div>
      </PageHeader>
      <div className="gutter mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ol className="space-y-2.5">
          {dates.map((d, i) => {
            const pd = programDay(d);
            const isToday = d === t;
            const done = dayDone(sessions, d);
            const past = diffDays(d, t) < 0;
            const est = estimateDay(pd.plan);
            return (
              <motion.li key={d} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035, type: 'spring', stiffness: 380, damping: 34 }}>
                <a href={`#/day/${d}`} onClick={(e) => { e.preventDefault(); navigate(`/day/${d}`); }}
                  className={`group flex min-h-[92px] items-center gap-4 rounded-[24px] p-4 transition ${isToday ? 'lit-raised shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]' : 'lit hover:brightness-110'}`}>
                  <div className="w-12 text-center">
                    <p className="label">{fmtWeekday(d)}</p>
                    <p className="display text-[34px] leading-none">{Number(d.slice(8))}</p>
                  </div>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${done ? 'bg-chalk text-void' : 'bg-white/[0.05] text-ash shadow-lit'}`}>
                    <Icon name={done ? 'check' : KIND_ICON[pd.plan.kind]} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="display text-[30px]">{pd.plan.title}</p>
                    <p className="truncate text-sm text-smoke">
                      {isToday ? <span className="font-semibold text-chalk">Today · </span> : null}
                      {done ? 'Done' : past && pd.plan.kind !== 'rest' && diffDays(d, META.startDate) >= 0 ? 'Missed' : pd.plan.subtitle}
                      {est.totalMin > 0 && !done ? ` · ${est.totalMin} min` : ''}
                    </p>
                  </div>
                  <Icon name="chevR" size={18} className="text-smoke transition-transform group-hover:translate-x-0.5" />
                </a>
              </motion.li>
            );
          })}
        </ol>
        <div className="space-y-5">
          {diffDays(t, META.startDate) >= 0 && <WeekCard date={week === curWeek ? t : sunday} />}
          {showReview && <ReviewCard date={week === curWeek ? t : sunday} />}
          <Card className="p-6">
            <Label>Weekly rhythm</Label>
            <p className="mt-3 text-ash">Four lifting sessions, each followed by a 20 minute incline walk at 15% and 3.0 mph. Bike intervals on Wednesday, a long easy session on Saturday, a full rest day on Sunday. Sauna Wednesday and Sunday.</p>
            {dayNumber(t) === 0 && <p className="mt-3 text-sm text-smoke">Day one is {fmtShort(META.startDate)}.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
