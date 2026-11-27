import { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Shell';
import { Button, Card, Stepper } from '../components/ui';
import { META } from '../data/program';
import type { BodyEntry } from '../data/types';
import { LEAN_MASS, avg7, chartSeries, projectedBodyFat, projectedWeight, ruleCheck } from '../logic/body';
import { addDays, diffDays, fmtShort } from '../logic/dates';
import { setState, useStore } from '../logic/store';
import { today } from '../lib/today';

const RANGES = [{ k: '4W', days: 28 }, { k: '12W', days: 84 }, { k: 'Year', days: 364 }] as const;
const C = { avg: '#D7FF3C', proj: '#8E959F', dot: '#C4C8CF', grid: 'rgba(255,255,255,0.06)', axis: '#9EA4AD' };

function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; weight?: number; avg?: number; projected: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="num rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-bone">{fmtShort(p.date)}</p>
      {p.weight != null && <p className="text-bone-2">Weigh-in <span className="text-bone">{p.weight.toFixed(1)}</span></p>}
      {p.avg != null && <p className="text-bone-2"><span className="mr-1 inline-block h-0.5 w-3 bg-volt align-middle" />7-day avg <span className="text-bone">{p.avg.toFixed(1)}</span></p>}
      <p className="text-bone-2"><span className="mr-1 inline-block w-3 border-t border-dashed border-bone-3 align-middle" />Projected <span className="text-bone">{p.projected.toFixed(1)}</span></p>
    </div>
  );
}

export default function Body() {
  const t = today();
  const body = useStore((s) => s.body);
  const last = [...body].reverse().find((b) => b.weight != null);
  const lastWaist = [...body].reverse().find((b) => b.waist != null);
  const existing = body.find((b) => b.date === t);
  const [date, setDate] = useState(t);
  const [weight, setWeight] = useState(existing?.weight ?? last?.weight ?? META.start.weightLb);
  const [waist, setWaist] = useState(existing?.waist ?? lastWaist?.waist ?? 40);
  const [range, setRange] = useState<(typeof RANGES)[number]['k']>('12W');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setState((s) => {
      const rest = s.body.filter((b) => b.date !== date);
      return { ...s, body: [...rest, { date, weight, waist }].sort((a, b) => (a.date < b.date ? -1 : 1)) };
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };
  const remove = (d: string) => setState((s) => ({ ...s, body: s.body.filter((b) => b.date !== d) }));

  const startDay = Math.max(0, diffDays(t, META.startDate));
  const days = RANGES.find((r) => r.k === range)!.days;
  const to = addDays(META.startDate, Math.max(startDay + 14, Math.min(days, 364)));
  const from = addDays(to, -days);
  const data = useMemo(() => chartSeries(body, diffDays(from, META.startDate) < 0 ? META.startDate : from, to), [body, from, to]);
  const avgNow = avg7(body, t);
  const rule = ruleCheck(body, t);
  const bfNow = avgNow ? (1 - LEAN_MASS / avgNow) * 100 : null;
  const ys = data.flatMap((d) => [d.weight, d.avg, d.projected].filter((v): v is number => v != null));
  const domain: [number, number] = [Math.floor(Math.min(...ys) - 2), Math.ceil(Math.max(...ys) + 2)];

  return (
    <div>
      <PageHeader eyebrow={`Start ${META.start.weightLb} lb · ${META.start.bodyFat}% · 5'11"`} title="Body" />
      <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: '7-day avg', v: avgNow ? avgNow.toFixed(1) : '—', u: 'lb' },
              { l: 'Since start', v: avgNow ? (avgNow - META.start.weightLb).toFixed(1) : '—', u: 'lb' },
              { l: 'Plan today', v: projectedWeight(startDay).toFixed(1), u: 'lb' },
              { l: 'Est. body fat', v: bfNow ? bfNow.toFixed(1) : projectedBodyFat(startDay).toFixed(1), u: bfNow ? '%' : '% plan' },
            ].map((s) => (
              <Card key={s.l} className="p-4"><p className="eyebrow">{s.l}</p><p className="num mt-1.5 text-[26px] font-semibold leading-none">{s.v}<span className="ml-1 text-xs font-normal text-bone-3">{s.u}</span></p></Card>
            ))}
          </div>
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Scale weight, lb</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-bone-2" aria-label="Legend">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bone-2" />Weigh-ins</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-volt" />7-day average</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-[#8E959F]" />Projected</span>
                </div>
              </div>
              <div className="flex rounded-xl bg-ink-800 p-1" role="radiogroup" aria-label="Chart range">
                {RANGES.map((r) => (
                  <button key={r.k} type="button" role="radio" aria-checked={range === r.k} onClick={() => setRange(r.k)}
                    className={`num h-10 rounded-lg px-3 text-xs font-semibold ${range === r.k ? 'bg-bone text-ink-950' : 'text-bone-2'}`}>{r.k}</button>
                ))}
              </div>
            </div>
            <div className="h-[260px] sm:h-[300px]" role="img" aria-label={`Weight chart: 7-day average ${avgNow ? avgNow.toFixed(1) + ' lb' : 'not enough data yet'}, plan ${projectedWeight(startDay).toFixed(1)} lb today. Table below.`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 44, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="day" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(d: number) => fmtShort(addDays(META.startDate, d))} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis domain={domain} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }} />
                  <Line dataKey="projected" stroke={C.proj} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} isAnimationActive animationDuration={900}
                    label={(p: { index?: number; x?: number | string; y?: number | string }) => (p.index === data.length - 1 ? <text key="pl" x={Number(p.x ?? 0) + 6} y={Number(p.y ?? 0) + 4} fill={C.axis} fontSize={11}>Plan</text> : <g key={p.index} />)} />
                  <Line dataKey="weight" stroke="none" isAnimationActive={false} activeDot={false} legendType="none"
                    dot={(p: { cx?: number; cy?: number; value?: number; index?: number }) => (p.value == null ? <g key={p.index} /> : <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={C.dot} stroke="#111214" strokeWidth={2} />)} />
                  <Line dataKey="avg" stroke={C.avg} strokeWidth={2.5} dot={false} connectNulls activeDot={{ r: 5, fill: C.avg, stroke: '#111214', strokeWidth: 2 }} isAnimationActive animationDuration={1100} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-3">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-bone-2 hover:text-bone">Table view</summary>
              <table className="num mt-2 w-full text-left text-sm">
                <thead className="text-bone-3"><tr><th className="py-1.5 font-normal">Date</th><th className="font-normal">Weight</th><th className="font-normal">7-day</th><th className="font-normal">Waist</th><th className="font-normal">Plan</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {[...body].reverse().slice(0, 30).map((b: BodyEntry) => (
                    <tr key={b.date} className="border-t border-white/5">
                      <td className="py-1.5">{fmtShort(b.date)}</td><td>{b.weight?.toFixed(1) ?? '—'}</td><td>{avg7(body, b.date)?.toFixed(1) ?? '—'}</td><td>{b.waist ?? '—'}</td>
                      <td className="text-bone-3">{projectedWeight(diffDays(b.date, META.startDate)).toFixed(1)}</td>
                      <td className="text-right"><button type="button" onClick={() => remove(b.date)} className="h-9 rounded-lg px-2 text-xs text-bone-3 hover:text-bone" aria-label={`Delete entry for ${fmtShort(b.date)}`}>Delete</button></td>
                    </tr>
                  ))}
                  {body.length === 0 && <tr><td colSpan={6} className="py-2 text-bone-3">No entries yet.</td></tr>}
                </tbody>
              </table>
            </details>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="p-5">
            <p className="eyebrow">Log</p>
            <h2 className="display mt-1 text-3xl">Morning weigh-in</h2>
            <label className="mt-4 block">
              <span className="eyebrow">Date</span>
              <input type="date" value={date} max={t} onChange={(e) => setDate(e.target.value)} className="num mt-1.5 h-12 w-full rounded-xl bg-ink-800 px-3 text-bone [color-scheme:dark]" />
            </label>
            <div className="mt-4 grid gap-3">
              <div><p className="eyebrow mb-1.5">Weight</p><Stepper value={weight} onChange={setWeight} step={0.2} min={120} max={350} unit="lb" label="Body weight" wide /></div>
              <div><p className="eyebrow mb-1.5">Waist at navel</p><Stepper value={waist} onChange={setWaist} step={0.25} min={20} max={70} unit="in" label="Waist" wide /></div>
            </div>
            <Button variant="primary" icon={saved ? 'check' : undefined} className="mt-5 w-full" onClick={save}>{saved ? 'Saved' : 'Save entry'}</Button>
            <p className="mt-3 text-xs text-bone-3">Weigh daily after waking, before food. Only the 7-day average matters.</p>
          </Card>
          <Card className={`p-5 ${rule.state === 'adjust' ? 'border-warn/40 bg-[#ff8a5c]/[0.06]' : ''}`}>
            <div className="flex items-start gap-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${rule.state === 'adjust' ? 'bg-warn text-ink-950' : rule.state === 'on-track' ? 'bg-volt text-volt-ink' : 'bg-ink-700 text-bone-2'}`}>
                <Icon name={rule.state === 'adjust' ? 'alert' : rule.state === 'on-track' ? 'check' : 'info'} />
              </span>
              <div>
                <p className="eyebrow">Monthly check rule</p>
                <p className="mt-1 font-semibold">
                  {rule.state === 'early' && `Unlocks in ${rule.daysLeft} days`}
                  {rule.state === 'no-data' && 'Need 3 weigh-ins this week'}
                  {rule.state === 'on-track' && `On track: down ${rule.drop} lb in 4 weeks`}
                  {rule.state === 'adjust' && `Adjust: down only ${Math.max(0, rule.drop)} lb in 4 weeks`}
                </p>
                <p className="mt-1 text-sm text-bone-2">
                  After month one, if the 7-day average is down less than 2 lb over 4 weeks, cut about 150 kcal per day or add about 2,000 daily steps.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <p className="eyebrow mb-3">Projection</p>
            <ul className="num space-y-1.5 text-sm">
              {META.projection.slice(1, 5).map((p) => (
                <li key={p.month} className="flex justify-between"><span className="text-bone-2">Month {p.month}</span><span>{p.bf}% · ~{(LEAN_MASS / (1 - p.bf / 100)).toFixed(0)} lb</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-bone-3">Weights assume lean mass is held at ~{LEAN_MASS.toFixed(0)} lb. If you add muscle, scale weight will sit higher at the same body fat.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
