import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Card, Label } from '../components/ui';
import { DAYS, EXERCISES } from '../data/program';
import { fmtShort } from '../logic/dates';
import { bestSet } from '../logic/motivation';
import { STAGE_LABEL, exerciseHistory, tempoForStage } from '../logic/progression';
import { recommendationFor } from '../logic/session';
import { useStore } from '../logic/store';
import { DemoPlayer } from '../rig/DemoPlayer';
import { tempoText } from '../workout/plan';

export default function ExerciseDetail({ id }: { id: string }) {
  const ex = EXERCISES[id];
  const sessions = useStore((s) => s.sessions);
  if (!ex) return <PageHeader title="Not found" back="/" />;
  const slots = DAYS.flatMap((d) => d.slots.filter((s) => s.exerciseId === id).map((s) => ({ d, s })));
  const first = slots[0];
  const rec = recommendationFor(first.s);
  const tempo = tempoForStage(first.s.tempo, rec.stage);
  const hist = exerciseHistory(sessions, id).slice(0, 8);
  const best = bestSet(sessions, id);
  const priority = ex.cues.filter((c) => c.priority);
  const rest = ex.cues.filter((c) => !c.priority);
  return (
    <div>
      <PageHeader back="/" eyebrow={`${slots.map(({ d }) => d.title).join(' · ')} · ${ex.view}`} title={ex.name} />
      <div className="gutter mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <DemoPlayer id={id} name={ex.name} tempo={tempo} view={ex.view} primary aspect={4 / 3.4} className="-mx-4 h-[52vh] min-h-[320px] sm:mx-0 sm:rounded-[28px] lg:h-[540px]" />
          <p className="mt-3 px-1 text-sm text-smoke">{tempoText(tempo)}. Press K to pause, 0.5x to slow it down.</p>
        </div>
        <div className="space-y-4">
          <Card className="p-6">
            <Label>Muscles</Label>
            <div className="mt-3 flex flex-wrap gap-2">
              {ex.muscles.primary.map((m) => <span key={m} className="rounded-full bg-chalk px-3.5 py-1.5 text-sm font-semibold text-void">{m}</span>)}
              {ex.muscles.secondary.map((m) => <span key={m} className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-sm text-ash">{m}</span>)}
            </div>
          </Card>
          {priority.map((c) => (
            <div key={c.text} className="flex gap-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(127,168,255,0.12),rgba(127,168,255,0.04))] p-6 shadow-lit">
              <Icon name="spine" className="mt-0.5 shrink-0 text-rim" />
              <p><span className="font-semibold">{c.text.split(':')[0]}.</span><span className="text-ash">{' ' + c.text.split(':').slice(1).join(':').trim().replace(/^./, (m) => m.toUpperCase())}</span></p>
            </div>
          ))}
          <Card className="p-6">
            <Label>How to do it</Label>
            <ol className="mt-4 space-y-4">
              {rest.map((c, i) => (
                <li key={c.text} className="flex gap-4">
                  <span className="display w-6 shrink-0 text-[28px] leading-none text-smoke">{i + 1}</span>
                  <span className="text-ash">{c.text}</span>
                </li>
              ))}
            </ol>
          </Card>
          <div className="flex gap-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,138,76,0.12),rgba(255,138,76,0.04))] p-6 shadow-lit">
            <Icon name="alert" className="mt-0.5 shrink-0 text-ember-hi" />
            <div><p className="font-semibold">Common mistake</p><p className="mt-1 text-ash">{ex.mistake}</p></div>
          </div>
          <Card className="p-6">
            <Label>Programming</Label>
            <ul className="mt-3 space-y-2">
              {slots.map(({ d, s }) => (
                <li key={d.key} className="flex justify-between text-sm"><span className="text-ash">{d.title}</span><span>{s.sets} × {s.reps[0] === s.reps[1] ? s.reps[0] : `${s.reps[0]}–${s.reps[1]}`}{ex.perSide ? ' each side' : ''} · rest {s.rest} s</span></li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-sm">
              <p className="font-semibold">{rec.stage !== 'load' ? STAGE_LABEL[rec.stage] : rec.headline}</p>
              <p className="mt-0.5 text-ash">{rec.detail}</p>
            </div>
            <p className="mt-3 text-sm text-smoke">At 50 lb: 4 s lowering, then a 2 s pause at the stretch, then one extra set, then {ex.harderVariation.charAt(0).toLowerCase() + ex.harderVariation.slice(1)}.</p>
          </Card>
          <Card className="p-6">
            <div className="flex items-end justify-between">
              <Label>History</Label>
              {best && <p className="text-sm text-ash">Best {best.weight ? `${best.weight} lb × ` : ''}{best.reps}</p>}
            </div>
            {hist.length === 0 ? <p className="mt-3 text-sm text-smoke">No sets logged yet.</p> : (
              <ul className="mt-3 divide-y divide-white/5">
                {hist.map((h) => (
                  <li key={h.date + h.log.sets.length} className="flex items-center justify-between py-3 text-sm">
                    <span className="text-ash">{fmtShort(h.date)}</span>
                    <span className="tnum">{h.log.sets.filter((s) => s.done && !s.drop).map((s) => `${s.weight || 'BW'}×${s.reps}`).join('   ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
