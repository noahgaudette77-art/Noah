// Dev-only page: 3 frames of every demo with measured joint angles and the form checks.
import { EXERCISES, DAYS } from '../data/program';
import { DEMOS } from '../rig/demos';
import { BENCH } from '../rig/render';
import { SceneSVG, demoViewBox, primsFor } from '../rig/Scene';
import { metrics, solve } from '../rig/solve';
import { buildTimeline, poseAt, sampleTimes } from '../rig/timeline';

const order = [...new Set(DAYS.flatMap((d) => d.slots.map((s) => s.exerciseId)))].concat(['treadmill', 'bike']);
const fmt = (n: number) => Math.round(n).toString();

export default function ContactSheet() {
  const lat = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const only = lat.get('only');
  const ids = only ? only.split(',') : order;
  return (
    <main className="bg-void p-6 text-bone" style={{ width: 1680 }} id="sheet">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="label">Tempo rig QA</p>
          <h1 className="display text-5xl">Exercise contact sheet</h1>
        </div>
        <p className="tnum text-xs text-smoke">3 frames per demo: start of lowering, mid, bottom. Angles: interior joint angles in degrees; trunk = lean from vertical.</p>
      </header>
      {!only && (
        <section className="mb-5 rounded-xl border border-white/10 bg-graphite p-3" data-demo="physique">
          <h2 className="display mb-2 text-2xl">Target physique · stages 1 to 4</h2>
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((st) => (
              <figure key={st} className="overflow-hidden rounded-lg">
                <SceneSVG prims={primsFor(DEMOS.lateralRaise, DEMOS.lateralRaise.poses.top, { stage: st })} viewBox={demoViewBox(DEMOS.lateralRaise)} className="block aspect-[4/3] w-full" />
                <figcaption className="px-2 py-1 text-[11px] text-ash">Stage {st + 1} · {['24% start', '22%', '19%', '15.5% and below'][st]}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {ids.map((id) => {
          const demo = DEMOS[id];
          const tl = buildTimeline(demo);
          const times = sampleTimes(demo, tl);
          const vb = demoViewBox(demo);
          const bench = demo.props.find((p) => p.kind === 'bench');
          const ex = EXERCISES[id];
          const checks = demo.checks.map((c) => {
            const p = demo.poses[c.pose];
            const v = metrics(solve(p), p)[c.metric];
            const ok = (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);
            return { ...c, v, ok };
          });
          return (
            <section key={id} className="rounded-xl border border-white/10 bg-graphite p-3" data-demo={id}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="display text-2xl">{ex?.name ?? (id === 'bike' ? 'Bike Intervals' : 'Incline Walk')}</h2>
                <p className="tnum text-[11px] text-smoke">
                  cam {demo.camera.yaw}° · {bench && bench.kind === 'bench' ? `bench ${bench.back}° ${bench.facing ?? ''} h${BENCH.top}` : demo.props.map((p) => p.kind).join(', ') || 'floor'}
                  {' · '}{demo.procedural ? `loop ${demo.procedural.period}s` : tl.phases.map((p) => `${p.verb} ${p.seconds.toFixed(1)}s`).join(' / ')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {times.map((t, i) => {
                  const fr = poseAt(demo, tl, t);
                  const m = metrics(solve(fr.pose), fr.pose);
                  return (
                    <figure key={i} className="overflow-hidden rounded-lg">
                      <SceneSVG prims={primsFor(demo, fr.pose)} viewBox={vb} className="block aspect-[4/3] w-full" />
                      <figcaption className="tnum px-2 pb-1.5 text-[10px] leading-4 text-ash">
                        <span className="text-ember">{['start', 'mid', 'end'][i]} · {fr.label}</span><br />
                        trunk {fmt(m.trunk)} · knee R{fmt(m.kneeR)}/L{fmt(m.kneeL)} · hip R{fmt(m.hipR)}<br />
                        elbow R{fmt(m.elbowR)}/L{fmt(m.elbowL)} · sh R{fmt(m.shoulderR)} · spine {fmt(m.spine)} · err {m.maxError.toFixed(1)}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              <ul className="tnum mt-2 grid grid-cols-2 gap-x-3 text-[10px] leading-4">
                {checks.map((c, i) => (
                  <li key={i} className={c.ok ? 'text-smoke' : 'text-caution'}>
                    {c.ok ? 'PASS' : 'FAIL'} {c.pose}.{c.metric}={fmt(c.v)} [{c.min ?? '-'}..{c.max ?? '-'}] {c.note}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
