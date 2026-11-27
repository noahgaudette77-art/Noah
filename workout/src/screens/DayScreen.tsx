import { DayBody, Hero } from '../components/DayView';
import { Icon } from '../components/Icon';
import { META } from '../data/program';
import { fmtLong } from '../logic/dates';
import { programDay } from '../logic/schedule';
import { navigate } from '../lib/router';

export default function DayScreen({ date }: { date: string }) {
  const pd = programDay(date);
  return (
    <div>
      <div className="absolute z-10 px-2 pt-[calc(10px+var(--safe-t))] sm:px-6">
        <button type="button" onClick={() => (history.length > 1 ? history.back() : navigate('/week'))} className="inline-flex h-11 items-center gap-1 rounded-xl bg-black/30 px-3 text-sm font-semibold text-bone backdrop-blur">
          <Icon name="chevL" size={20} /> Week
        </button>
      </div>
      <Hero plan={pd.plan} eyebrow={`${pd.started ? `Week ${pd.week} of ${META.weeks}` : 'Before the start'} · ${fmtLong(date)}`} />
      <DayBody plan={pd.plan} date={date} />
    </div>
  );
}
