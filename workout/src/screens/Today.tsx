import { motion, useReducedMotion } from 'framer-motion';
import { Wordmark } from '../components/Brand';
import { DayExtras, SessionList, StartButton } from '../components/DayView';
import { HabitsCard } from '../components/Habits';
import { HeroPhoto } from '../components/HeroPhoto';
import { WallText } from '../components/iron';
import { Icon } from '../components/Icon';
import { NextMilestone, ReviewCard, StreakChip, WeekCard } from '../components/Motivation';
import { META } from '../data/program';
import { estimateDay } from '../logic/estimate';
import { fmtLong, fmtShort, weekday } from '../logic/dates';
import { dayNumber } from '../logic/motivation';
import { featuredDay } from '../logic/schedule';
import { navigate } from '../lib/router';
import { today } from '../lib/today';

export default function Today() {
  const date = today();
  const fd = featuredDay(date);
  const plan = fd.plan;
  const est = estimateDay(plan);
  const reduce = useReducedMotion();
  const sessionDate = fd.started ? date : META.startDate;
  const eyebrow = fd.started
    ? `Day ${dayNumber(date)} of 365 · ${fmtLong(date)}`
    : `Starts ${fmtLong(META.startDate)} · in ${fd.daysUntilStart} day${fd.daysUntilStart === 1 ? '' : 's'}`;
  const big = plan.title.length > 9;
  return (
    <div>
      <header className="relative pt-[var(--safe-t)]">
        <div className="gutter mx-auto flex max-w-5xl items-center justify-between pt-4">
          <span className="lg:invisible"><Wordmark /></span>
          <a href="#/settings" onClick={(e) => { e.preventDefault(); navigate('/settings'); }} className="grid h-11 w-11 place-items-center rounded-[6px] glass lg:hidden" aria-label="Settings">
            <Icon name="settings" />
          </a>
        </div>
        <div className="gutter mx-auto max-w-5xl">
          <p className="label mt-4 text-ash">{eyebrow}</p>
          {/* the session name, stencilled on the wall of the entrance */}
          <motion.div initial={reduce ? false : { opacity: 0, clipPath: 'inset(0 100% 0 0)' }} animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}>
            <WallText className={`mt-2 ${big ? 'text-[min(19vw,128px)]' : 'text-[min(27vw,176px)]'}`}>{plan.title}</WallText>
          </motion.div>
          <h1 className="sr-only">{plan.title}: {plan.subtitle}</h1>
          <p className="typed mt-2 text-[17px] text-ash">{plan.subtitle}</p>
        </div>
        <div className="gutter mx-auto mt-6 max-w-5xl">
          <HeroPhoto name="photo80-hero" className="mx-auto h-[min(40vh,400px)] w-full max-w-[440px] lg:h-auto lg:aspect-[4/5]" alt="The gym: a long rack of hex dumbbells along a mirrored wood-panelled wall">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
              <div className="flex flex-wrap gap-1.5">
                {fd.started && <span className="dymo amber"><StreakChip date={date} /></span>}
                {plan.slots.length > 0 && <span className="dymo">Lift {est.liftMin} min</span>}
                {est.cardioMin > 0 && <span className="dymo">{plan.slots.length ? 'Walk' : 'Cardio'} {est.cardioMin} min</span>}
                {est.sets > 0 && <span className="dymo">{est.sets} sets</span>}
                {plan.sauna && <span className="dymo">Sauna {plan.sauna} min</span>}
                {plan.kind === 'rest' && <span className="dymo">Rest day</span>}
              </div>
            </div>
          </HeroPhoto>
        </div>
      </header>

      <div className="gutter relative mx-auto mt-6 max-w-5xl space-y-5">
        {!fd.started && <p className="text-center text-sm text-ash">Day one is {fmtShort(META.startDate)}. You can run it early to learn the movements.</p>}
        <StartButton plan={plan} date={sessionDate} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {fd.started && weekday(date) === 0 && <ReviewCard date={date} />}
            <SessionList plan={plan} />
            <DayExtras plan={plan} />
          </div>
          <div className="space-y-5">
            {fd.started && <WeekCard date={date} />}
            <NextMilestone date={date} />
            <HabitsCard date={date} />
          </div>
        </div>
      </div>
    </div>
  );
}
