import { motion, useReducedMotion } from 'framer-motion';
import { Wordmark } from '../components/Brand';
import { DayExtras, SessionList, StartButton } from '../components/DayView';
import { HabitsCard } from '../components/Habits';
import { HeroAthlete, HeroMedia } from '../components/Hero';
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
      <HeroMedia className="h-[min(78vh,700px)] min-h-[560px] lg:h-[720px] lg:min-h-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-void" />
        {/* the session name sits behind the athlete */}
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.9, 0.25, 1] }}
          className={`display absolute inset-x-0 top-[calc(108px+var(--safe-t))] text-center text-chalk/95 lg:top-[112px] ${big ? 'text-[min(17vw,140px)]' : 'text-[min(26vw,210px)]'}`}
          style={{ textShadow: '0 20px 80px rgba(0,0,0,0.6)' }}
        >
          {plan.title}
          <span className="mt-3 block font-sans text-lg font-normal normal-case tracking-normal text-ash">{plan.subtitle}</span>
        </motion.h1>
        <div className="absolute inset-x-0 bottom-[13%] mx-auto h-[44%] max-w-[360px] lg:bottom-[9%] lg:h-[43%]">
          <HeroAthlete hold={plan.kind === 'strength'} className="h-full w-full" />
        </div>
        <div className="absolute inset-x-0 top-0 pt-[var(--safe-t)]">
          <div className="gutter mx-auto flex max-w-5xl items-center justify-between pt-4">
            <span className="lg:invisible"><Wordmark /></span>
            <a href="#/settings" onClick={(e) => { e.preventDefault(); navigate('/settings'); }} className="grid h-11 w-11 place-items-center rounded-full glass lg:hidden" aria-label="Settings">
              <Icon name="settings" />
            </a>
          </div>
          <p className="label gutter mx-auto mt-5 max-w-5xl text-ash">{eyebrow}</p>
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <div className="gutter mx-auto max-w-5xl pb-6">
            <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 whitespace-nowrap rounded-full px-5 py-2.5 text-[13px] font-semibold text-chalk glass">
              {fd.started && <StreakChip date={date} />}
              {plan.slots.length > 0 && <span>Lift {est.liftMin}′</span>}
              {est.cardioMin > 0 && <span>{plan.slots.length ? 'Walk' : 'Cardio'} {est.cardioMin}′</span>}
              {est.sets > 0 && <span>{est.sets} sets</span>}
              {plan.sauna && <span>Sauna {plan.sauna}′</span>}
              {plan.kind === 'rest' && <span>Rest day</span>}
            </div>
          </div>
        </div>
      </HeroMedia>

      <div className="gutter relative mx-auto -mt-2 max-w-5xl space-y-5">
        {!fd.started && <p className="text-center text-sm text-ash">Day one is {fmtShort(META.startDate)}. You can run it early to learn the movements.</p>}
        <StartButton plan={plan} date={sessionDate} />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
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
