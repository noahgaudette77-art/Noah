import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Card } from '../components/ui';
import { DAYS, EXERCISES } from '../data/program';
import { fmtShort } from '../logic/dates';
import { STAGE_LABEL, exerciseHistory, tempoForStage } from '../logic/progression';
import { recommendationFor } from '../logic/session';
import { useStore } from '../logic/store';
import { DemoPlayer } from '../rig/DemoPlayer';

export default function ExerciseDetail({ id }: { id: string }) {
  const ex = EXERCISES[id];
  const sessions = useStore((s) => s.sessions);
  if (!ex) return <PageHeader title="Not found" back="/" />;
  const slots = DAYS.flatMap((d) => d.slots.filter((s) => s.exerciseId === id).map((s) => ({ d, s })));
  const first = slots[0];
  const rec = recommendationFor(first.s);
  const tempo = tempoForStage(first.s.tempo, rec.stage);
  const hist = exerciseHistory(sessions, id).slice(0, 8);
  const priority = ex.cues.filter((c) => c.priority);
  const rest = ex.cues.filter((c) => !c.priority);
  return (
    <div>
      <PageHeader back="/" eyebrow={slots.map(({ d }) => d.title).join(' · ')} title={ex.name} />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <DemoPlayer id={id} name={ex.name} tempo={tempo} view={ex.view} primary aspect={4 / 3} />
          <p className="mt-2 px-1 text-xs text-bone-3">Phase label shows the tempo. Press K to play or pause, 0.5x to slow it down.</p>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="eyebrow">Target muscles</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ex.muscles.primary.map((m) => <span key={m} className="rounded-full bg-volt px-3 py-1.5 text-sm font-semibold text-volt-ink">{m}</span>)}
              {ex.muscles.secondary.map((m) => <span key={m} className="rounded-full bg-ink-700 px-3 py-1.5 text-sm text-bone-2">{m}</span>)}
            </div>
          </Card>
          {priority.map((c) => (
            <div key={c.text} className="flex gap-3 rounded-[22px] border border-volt/35 bg-volt/[0.07] p-5">
              <Icon name="spine" className="mt-0.5 shrink-0 text-volt" />
              <p className="text-bone"><span className="font-semibold">{c.text.split(':')[0]}.</span><span className="text-bone-2">{' ' + c.text.split(':').slice(1).join(':').trim().replace(/^./, (m) => m.toUpperCase())}</span></p>
            </div>
          ))}
          <Card className="p-5">
            <p className="eyebrow">Form cues</p>
            <ol className="mt-3 space-y-3">
              {rest.map((c, i) => (
                <li key={c.text} className="flex gap-3">
                  <span className="num grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-700 text-xs font-bold">{i + 1}</span>
                  <span className="text-bone-2">{c.text}</span>
                </li>
              ))}
            </ol>
          </Card>
          <div className="flex gap-3 rounded-[22px] border border-[#ff8a5c]/30 bg-[#ff8a5c]/[0.07] p-5">
            <Icon name="alert" className="mt-0.5 shrink-0 text-warn" />
            <div><p className="font-semibold">Common mistake</p><p className="mt-1 text-bone-2">{ex.mistake}</p></div>
          </div>
          <Card className="p-5">
            <p className="eyebrow">Programming</p>
            <ul className="mt-3 space-y-2">
              {slots.map(({ d, s }) => (
                <li key={d.key} className="num flex justify-between text-sm"><span className="text-bone-2">{d.title}</span><span>{s.sets} × {s.reps[0] === s.reps[1] ? s.reps[0] : `${s.reps[0]}–${s.reps[1]}`}{ex.perSide ? '/side' : ''} · rest {s.rest}s</span></li>
              ))}
            </ul>
            <div className="mt-4 rounded-xl bg-ink-800 p-3 text-sm">
              <p className="font-semibold">{rec.stage !== 'load' ? STAGE_LABEL[rec.stage] : rec.headline}</p>
              <p className="text-bone-3">{rec.detail}</p>
            </div>
            <p className="mt-3 text-sm text-bone-3">At the 50 lb ceiling: 4 s lowering, then a 2 s pause at the stretch, then one extra set, then <span className="text-bone-2">{ex.harderVariation.toLowerCase()}</span>.</p>
          </Card>
          <Card className="p-5">
            <p className="eyebrow">History</p>
            {hist.length === 0 ? <p className="mt-2 text-sm text-bone-3">No sets logged yet.</p> : (
              <ul className="mt-3 divide-y divide-white/5">
                {hist.map((h) => (
                  <li key={h.date + h.log.sets.length} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-bone-2">{fmtShort(h.date)}</span>
                    <span className="num">{h.log.sets.filter((s) => s.done && !s.drop).map((s) => `${s.weight || 'BW'}×${s.reps}`).join('  ')}</span>
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
