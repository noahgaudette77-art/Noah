import { motion } from 'framer-motion';
import { EXERCISES } from '../data/program';
import type { CardioBlock, DayPlan } from '../data/types';
import { fmtLong } from '../logic/dates';
import { estimateDay } from '../logic/estimate';
import { STAGE_LABEL, tempoForStage } from '../logic/progression';
import { blocksFor, logStandalone, recommendationFor, startSession } from '../logic/session';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';
import { play } from '../lib/sfx';
import { DemoPlayer } from '../rig/DemoPlayer';
import { Icon } from './Icon';
import { Thumb } from './Thumb';
import { Button, Card } from './ui';

const ART: Record<string, string> = { upper: 'art/upper.webp', lower: 'art/lower.webp', cardio: 'art/cardio.webp', recovery: 'art/recovery.webp', rest: 'art/rest.webp' };
const repStr = (r: [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);

export function Hero({ plan, eyebrow, children }: { plan: DayPlan; eyebrow: string; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <img src={ART[plan.art]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-ink-950/55 to-ink-950" />
      <div className="relative mx-auto max-w-5xl px-4 pb-6 pt-[calc(76px+var(--safe-t))] sm:px-8 lg:pt-20">
        <p className="eyebrow text-bone-2">{eyebrow}</p>
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} className={`display mt-3 leading-[0.85] ${plan.title.length > 9 ? 'text-[58px] sm:text-[96px]' : 'text-[84px] sm:text-[120px]'}`}>
          {plan.title}
        </motion.h1>
        <p className="mt-3 text-lg text-bone-2">{plan.subtitle}</p>
        {children}
      </div>
    </div>
  );
}

function CardioCard({ c, date, plan, standalone }: { c: CardioBlock; date: string; plan: DayPlan; standalone: boolean }) {
  const done = useStore((s) => s.sessions.some((x) => x.date === date && x.cardioDone.includes(c.id)));
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <DemoPlayer id={c.demo} name={c.name} view={c.demo === 'bike' ? 'Upright bike' : 'Treadmill'} className="rounded-none md:rounded-l-[22px]" aspect={16 / 11} />
        <div className="p-5">
          <p className="eyebrow">{c.range ? `${c.range[0]}–${c.range[1]} min` : `${c.minutes} min`}</p>
          <h3 className="display mt-1 text-3xl">{c.name}</h3>
          <ul className="mt-3 space-y-1.5 text-bone-2">
            {c.details.map((d) => <li key={d} className="flex gap-2"><span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-volt" />{d}</li>)}
          </ul>
          {standalone && (
            <Button variant={done ? 'secondary' : 'primary'} icon={done ? 'check' : 'flag'} className="mt-5 w-full" onClick={() => logStandalone(plan.key, date, c.id)}>
              {done ? 'Logged. Tap to undo' : 'Mark complete'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function DayBody({ plan, date }: { plan: DayPlan; date: string }) {
  const est = estimateDay(plan);
  const active = useStore((s) => s.active);
  const finished = useStore((s) => s.sessions.find((x) => x.date === date && x.dayKey === plan.key && x.exercises.length));
  const blocks = blocksFor(plan);
  const isStrength = plan.kind === 'strength';
  const begin = () => {
    if (!active) { startSession(plan.key, date); play('start'); }
    navigate('/workout');
  };
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-8">
      {isStrength && (
        <>
          <div className="grid grid-cols-3 gap-3 rounded-[22px] border border-white/[0.06] bg-ink-900/80 p-4 backdrop-blur">
            <div><p className="eyebrow">Lift</p><p className="num mt-1 text-2xl font-semibold">~{est.liftMin}<span className="ml-1 text-sm text-bone-3">min</span></p></div>
            <div><p className="eyebrow">Walk</p><p className="num mt-1 text-2xl font-semibold">{est.cardioMin}<span className="ml-1 text-sm text-bone-3">min</span></p></div>
            <div><p className="eyebrow">Sets</p><p className="num mt-1 text-2xl font-semibold">{est.sets}</p></div>
          </div>
          {finished ? (
            <Card className="flex items-center gap-4 p-5">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-volt text-volt-ink"><Icon name="check" strokeWidth={2.5} /></span>
              <div className="flex-1">
                <p className="font-semibold">Session complete</p>
                <p className="text-sm text-bone-3">{Math.round(((finished.finishedAt ?? finished.startedAt) - finished.startedAt) / 60000)} min · {finished.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)} sets logged</p>
              </div>
              <Button variant="ghost" onClick={() => navigate('/history')}>History</Button>
            </Card>
          ) : (
            <Button variant="primary" size="lg" icon="play" className="w-full" onClick={begin}>
              {active ? (active.dayKey === plan.key ? 'Resume session' : 'Resume active session') : `Start ${plan.title}`}
            </Button>
          )}
          <p className="num text-center text-xs text-bone-3">Estimate: {est.liftMin} min lifting at 3 s lowering + {est.cardioMin} min incline walk = {est.totalMin} min</p>
          <Card className="p-2 sm:p-3">
            <ol>
              {blocks.map((b, bi) => {
                if (b.kind === 'cardio') {
                  return (
                    <li key={bi} className="flex items-center gap-4 rounded-2xl p-2.5">
                      <Thumb id={b.cardio.demo} />
                      <div className="flex-1">
                        <p className="font-semibold">{b.cardio.name}</p>
                        <p className="num text-sm text-bone-3">{b.cardio.minutes} min · {b.cardio.details[0]}</p>
                      </div>
                      <Icon name="walk" className="text-bone-3" />
                    </li>
                  );
                }
                return (
                  <li key={bi} className={b.kind === 'superset' ? 'relative my-1 rounded-2xl border border-volt/25 bg-volt/[0.03]' : ''}>
                    {b.kind === 'superset' && <p className="eyebrow px-3 pt-2.5 text-volt">Superset {b.group} · alternate, rest after both</p>}
                    {b.slots.map((s, si) => {
                      const ex = EXERCISES[s.exerciseId];
                      const rec = recommendationFor(s);
                      const t = tempoForStage(s.tempo, rec.stage);
                      return (
                        <a
                          key={s.exerciseId} href={`#/exercise/${s.exerciseId}`}
                          onClick={(e) => { e.preventDefault(); navigate(`/exercise/${s.exerciseId}`); }}
                          className="group flex items-center gap-4 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.03]"
                        >
                          <Thumb id={s.exerciseId} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug">{b.kind === 'superset' && <span className="num mr-1.5 text-volt">{b.group}{si + 1}</span>}{ex.name}</p>
                            <p className="num text-sm text-bone-3">
                              {rec.sets} × {repStr(s.reps)}{ex.perSide ? '/side' : ''} · {ex.load === 'bodyweight' ? 'BW' : `${rec.weight} lb`} {t.down !== 3 ? ` · ${t.down}s down` : ''}{t.bottom ? ` · ${t.bottom}s pause` : ''}{s.dropSetOnLast ? ' · drop set' : ''}
                            </p>
                            {rec.stage !== 'load' && <p className="mt-0.5 text-xs font-semibold text-volt">{STAGE_LABEL[rec.stage]}</p>}
                          </div>
                          <Icon name="chevR" size={18} className="text-bone-3 transition-transform group-hover:translate-x-0.5" />
                        </a>
                      );
                    })}
                  </li>
                );
              })}
            </ol>
          </Card>
        </>
      )}
      {!isStrength && plan.cardio.map((c) => <CardioCard key={c.id} c={c} date={date} plan={plan} standalone />)}
      {plan.sauna && (
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink-700 text-[#ffb070]"><Icon name="heat" /></span>
          <div>
            <p className="font-semibold">Sauna · {plan.sauna} min</p>
            <p className="text-sm text-bone-3">Drink 500 ml of water before and after. Step out if you feel dizzy.</p>
          </div>
        </Card>
      )}
      {plan.kind === 'rest' && (
        <Card className="p-5">
          <p className="eyebrow">Recovery</p>
          <p className="mt-2 text-bone-2">No training today. Muscle is built while you recover: hit your protein, sleep 7 to 8 hours, and walk for steps.</p>
        </Card>
      )}
      {plan.notes.length > 0 && (
        <ul className="space-y-2 px-1 text-sm text-bone-3">
          {plan.notes.map((n) => <li key={n} className="flex gap-2"><Icon name="info" size={16} className="mt-0.5 shrink-0" />{n}</li>)}
        </ul>
      )}
    </div>
  );
}

export const longDate = fmtLong;
