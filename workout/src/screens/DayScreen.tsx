import { DayExtras, SessionList, StartButton } from '../components/DayView';
import { PageHeader } from '../components/Shell';
import { META } from '../data/program';
import { fmtLong } from '../logic/dates';
import { dayNumber } from '../logic/motivation';
import { programDay } from '../logic/schedule';

export default function DayScreen({ date }: { date: string }) {
  const pd = programDay(date);
  return (
    <div>
      <PageHeader back="/week" eyebrow={`${pd.started ? `Day ${dayNumber(date)} of 365 · week ${pd.week} of ${META.weeks}` : 'Before day one'} · ${fmtLong(date)}`} title={pd.plan.title}>
        <p className="mt-3 text-lg text-ash">{pd.plan.subtitle}</p>
      </PageHeader>
      <div className="gutter mx-auto max-w-5xl space-y-5">
        <StartButton plan={pd.plan} date={date} />
        <SessionList plan={pd.plan} />
        <DayExtras plan={pd.plan} />
      </div>
    </div>
  );
}
