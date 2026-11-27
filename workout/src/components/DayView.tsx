import { EXERCISES } from '../data/program';
import type { DayPlan } from '../data/types';
import { estimateDay } from '../logic/estimate';
import { STAGE_LABEL, tempoForStage } from '../logic/progression';
import { blocksFor, recommendationFor, startSession } from '../logic/session';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';
import { play } from '../lib/sfx';
import { usePhysique } from '../rig/DemoPlayer';
import { Icon } from './Icon';
import { Thumb } from './Thumb';
import { Button, Card, Label } from './ui';

const repStr = (r: [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);

/** Start (or resume) the day's session; strength and conditioning days both run in workout mode. */
export function StartButton({ plan, date }: { plan: DayPlan; date: string }) {
  const active = useStore((s) => s.active);
  const finished = useStore((s) => s.sessions.find((x) => x.date === date && x.dayKey === plan.key && (x.exercises.some((e) => e.sets.some((y) => y.done)) || x.cardioDone.length)));
  const est = estimateDay(plan);
  if (plan.kind === 'rest') return null;
  if (finished) {
    return (
      <Card className="flex items-center gap-4 p-5">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-chalk text-void"><Icon name="check" /></span>
        <div className="flex-1">
          <p className="font-semibold">{plan.title} done</p>
          <p className="text-sm text-smoke">{Math.round(((finished.finishedAt ?? finished.startedAt) - finished.startedAt) / 60000)} min · {finished.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0)} sets logged</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(`/summary/${encodeURIComponent(finished.id)}`)}>Summary</Button>
      </Card>
    );
  }
  const begin = () => {
    if (!active) { startSession(plan.key, date); play('start'); }
    navigate('/workout');
  };
  const n = plan.slots.length;
  return (
    <button type="button" onClick={begin} className="ember-btn group flex h-[76px] w-full items-center justify-between rounded-[24px] px-6 text-left">
      <span>
        <span className="block text-[19px] font-semibold">{active ? 'Back to your session' : `Start ${plan.title}`}</span>
        <span className="block text-[13px] font-medium opacity-75">{n ? `${n} exercises · ` : ''}about {est.totalMin} min</span>
      </span>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-ember-ink/90 text-ember transition-transform group-hover:translate-x-0.5"><Icon name="play" size={20} weight="fill" /></span>
    </button>
  );
}

export function SessionList({ plan }: { plan: DayPlan }) {
  const stage = usePhysique();
  const blocks = blocksFor(plan);
  const est = estimateDay(plan);
  if (!plan.slots.length && !plan.cardio.length) return null;
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-end justify-between px-3 pb-2 pt-2">
        <div>
          <Label>The session</Label>
          <p className="mt-1.5 text-sm text-ash">{plan.slots.length ? `${est.liftMin} min lifting at a 3 s lowering, then ${est.cardioMin} min walking` : plan.cardio[0]?.details[0]}</p>
        </div>
      </div>
      <ol>
        {blocks.map((b, bi) => {
          if (b.kind === 'cardio') {
            return (
              <li key={bi} className="flex items-center gap-4 rounded-2xl p-2.5">
                <Thumb id={b.cardio.demo} stage={stage} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{b.cardio.name}</p>
                  <p className="text-sm text-smoke">{b.cardio.range ? `${b.cardio.range[0]}–${b.cardio.range[1]}` : b.cardio.minutes} min · {b.cardio.details[0]}</p>
                </div>
              </li>
            );
          }
          return (
            <li key={bi} className={b.kind === 'superset' ? 'my-1 rounded-[20px] bg-white/[0.025] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]' : ''}>
              {b.kind === 'superset' && <p className="label px-3 pt-2">Superset {b.group} · back to back</p>}
              {b.slots.map((s, si) => {
                const ex = EXERCISES[s.exerciseId];
                const rec = recommendationFor(s);
                const t = tempoForStage(s.tempo, rec.stage);
                return (
                  <a key={s.exerciseId} href={`#/exercise/${s.exerciseId}`} onClick={(e) => { e.preventDefault(); navigate(`/exercise/${s.exerciseId}`); }}
                    className="group flex items-center gap-4 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.03]">
                    <Thumb id={s.exerciseId} stage={stage} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{b.kind === 'superset' && <span className="mr-1.5 text-ash">{b.group}{si + 1}</span>}{ex.name}</p>
                      <p className="mt-0.5 text-sm text-smoke">
                        {rec.sets} × {repStr(s.reps)}{ex.perSide ? ' each side' : ''} · {ex.load === 'bodyweight' ? 'bodyweight' : `${rec.weight} lb`}
                        {t.down !== 3 ? ` · ${t.down} s down` : ''}{t.bottom ? ` · ${t.bottom} s pause` : ''}{s.dropSetOnLast ? ' · drop set' : ''}
                      </p>
                      {rec.stage !== 'load' && <p className="mt-0.5 text-xs font-semibold text-ash">{STAGE_LABEL[rec.stage]}</p>}
                    </div>
                    <Icon name="chevR" size={18} className="text-smoke transition-transform group-hover:translate-x-0.5" />
                  </a>
                );
              })}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function DayExtras({ plan }: { plan: DayPlan }) {
  return (
    <>
      {plan.sauna && (
        <Card className="flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.05] text-ash shadow-lit"><Icon name="heat" /></span>
          <div>
            <p className="font-semibold">Sauna · {plan.sauna} min</p>
            <p className="text-sm text-smoke">500 ml of water before and after. Step out if you feel light-headed.</p>
          </div>
        </Card>
      )}
      {plan.kind === 'rest' && (
        <Card className="p-6">
          <Label>Recovery day</Label>
          <p className="mt-2 text-ash">No training. Hit protein, walk for steps, sleep 7 to 8 hours. The work from this week is consolidated today.</p>
        </Card>
      )}
      {plan.notes.length > 0 && (
        <ul className="space-y-2 px-1 text-sm text-smoke">
          {plan.notes.map((n) => <li key={n} className="flex gap-2"><Icon name="info" size={16} className="mt-0.5 shrink-0" />{n}</li>)}
        </ul>
      )}
    </>
  );
}
