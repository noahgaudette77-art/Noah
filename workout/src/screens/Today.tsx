import { Wordmark } from '../components/Brand';
import { DayBody, Hero } from '../components/DayView';
import { HabitsCard } from '../components/Habits';
import { Icon } from '../components/Icon';
import { META } from '../data/program';
import { fmtLong } from '../logic/dates';
import { featuredDay } from '../logic/schedule';
import { navigate } from '../lib/router';
import { today } from '../lib/today';

export default function Today() {
  const date = today();
  const fd = featuredDay(date);
  const eyebrow = fd.started
    ? `Week ${Math.min(fd.week, META.weeks)} of ${META.weeks} · ${fmtLong(date)}`
    : `Program starts ${fmtLong(META.startDate)} · in ${fd.daysUntilStart} day${fd.daysUntilStart === 1 ? '' : 's'}`;
  return (
    <div>
      <div className="absolute inset-x-0 top-0 z-10 mx-auto flex max-w-5xl items-center justify-between px-4 pt-[calc(14px+var(--safe-t))] sm:px-8 lg:hidden">
        <Wordmark />
        <a href="#/settings" onClick={(e) => { e.preventDefault(); navigate('/settings'); }} className="grid h-11 w-11 place-items-center rounded-full bg-black/30 text-bone backdrop-blur" aria-label="Settings">
          <Icon name="settings" />
        </a>
      </div>
      <Hero plan={fd.plan} eyebrow={eyebrow}>
        {!fd.started && <p className="mt-4 max-w-md text-sm text-bone-2">Preview of day one. You can run it early as a practice session to learn the movements.</p>}
      </Hero>
      <div className="lg:mx-auto lg:grid lg:max-w-5xl lg:grid-cols-[1fr_340px] lg:gap-6 lg:px-8">
        <div className="lg:-mx-8"><DayBody plan={fd.plan} date={fd.started ? date : META.startDate} /></div>
        <div className="mt-5 px-4 sm:px-8 lg:mt-0 lg:px-0"><HabitsCard date={date} /></div>
      </div>
    </div>
  );
}
