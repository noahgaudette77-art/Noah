import { useMemo, useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../components/Icon';
import { Journey, NextMilestone } from '../components/Motivation';
import { PageHeader } from '../components/Shell';
import { Button, Card, Label, Stepper } from '../components/ui';
import { META } from '../data/program';
import type { BodyEntry } from '../data/types';
import { avg7, chartSeries, leanAt, projectedWeight, ruleCheck } from '../logic/body';
import { addDays, diffDays, fmtShort } from '../logic/dates';

import { setState, useStore } from '../logic/store';
import { today } from '../lib/today';
import { PosterWall } from '../components/PosterWall';

const RANGES = [{ k: '4W', days: 28 }, { k: '12W', days: 84 }, { k: 'Year', days: 364 }] as const;
const C = { avg: '#FF5B1F', proj: '#8C877F', dot: '#B8B3AA', grid: 'rgba(255,255,255,0.05)', axis: '#8C877F' };

function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; weight?: number; avg?: number; projected: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-2xl px-3.5 py-2.5 text-xs glass">
      <p className="mb-1 font-semibold text-chalk">{fmtShort(p.date)}</p>
      {p.weight != null && <p className="text-ash">Weigh-in <span className="text-chalk">{p.weight.toFixed(1)}</span></p>}
      {p.avg != null && <p className="text-ash"><span className="mr-1.5 inline-block h-0.5 w-3 bg-ember align-middle" />7-day average <span className="text-chalk">{p.avg.toFixed(1)}</span></p>}
      <p className="text-ash"><span className="mr-1.5 inline-block w-3 border-t border-dashed border-smoke align-middle" />Plan <span className="text-chalk">{p.projected.toFixed(1)}</span></p>
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
    setState((s) => ({ ...s, body: [...s.body.filter((b) => b.date !== date), { date, weight, waist }].sort((a, b) => (a.date < b.date ? -1 : 1)) }));
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
  const ys = data.flatMap((d) => [d.weight, d.avg, d.projected].filter((v): v is number => v != null));
  // even y-ticks: a step of 2 or 5 lb, the domain snapped to whole steps
  const lo = Math.min(...ys) - 1, hi = Math.max(...ys) + 1;
  const step = hi - lo > 14 ? 5 : 2;
  const domain: [number, number] = [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
  const yTicks = Array.from({ length: Math.round((domain[1] - domain[0]) / step) + 1 }, (_, i) => domain[0] + i * step);

  return (
    <div>
      <PageHeader eyebrow={`Start ${META.start.weightLb} lb · ${META.start.bodyFat}% · 5'11"`} title="Progress" />
      <div className="gutter mx-auto max-w-5xl space-y-5">
        <Journey date={t} />
        <PosterWall date={t} />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <NextMilestone date={t} compact />
          
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <Label>Scale weight, lb</Label>
                <p className="mt-2 flex items-baseline gap-2"><span className="display text-[52px] leading-none">{avgNow ? avgNow.toFixed(1) : '–'}</span><span className="text-ash">7-day average</span></p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ash" aria-label="Legend">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ash" />Weigh-ins</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-full bg-ember" />7-day average</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-smoke" />Plan</span>
                </div>
              </div>
              <div className="flex rounded-full p-1 glass" role="radiogroup" aria-label="Chart range">
                {RANGES.map((r) => (
                  <button key={r.k} type="button" role="radio" aria-checked={range === r.k} onClick={() => setRange(r.k)}
                    className={`h-10 rounded-full px-4 text-xs font-semibold ${range === r.k ? 'bg-chalk text-void' : 'text-ash'}`}>{r.k}</button>
                ))}
              </div>
            </div>
            <div className="h-[260px] sm:h-[300px]" role="img" aria-label={`Weight chart: 7-day average ${avgNow ? avgNow.toFixed(1) + ' lb' : 'not enough data yet'}, plan ${projectedWeight(startDay).toFixed(1)} lb today. Table below.`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -14 }}>
                  <defs>
                    <linearGradient id="avgline" x1="0" x2="1"><stop offset="0" stopColor="#FF8A4C" /><stop offset="1" stopColor="#FF5B1F" /></linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="day" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(d: number) => fmtShort(addDays(META.startDate, d))} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
                  <YAxis domain={domain} ticks={yTicks} interval={0} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={44} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }} />
                  <Line dataKey="projected" stroke={C.proj} strokeWidth={2} strokeDasharray="5 6" dot={false} activeDot={false} isAnimationActive animationDuration={900} legendType="none" />
                  <Line dataKey="weight" stroke="none" isAnimationActive={false} activeDot={false} legendType="none"
                    dot={(p: { cx?: number; cy?: number; value?: number; index?: number }) => (p.value == null ? <g key={p.index} /> : <circle key={p.index} cx={p.cx} cy={p.cy} r={3.5} fill={C.dot} stroke="#131316" strokeWidth={2} />)} />
                  <Line dataKey="avg" stroke="url(#avgline)" strokeWidth={3} dot={false} connectNulls activeDot={{ r: 6, fill: C.avg, stroke: '#131316', strokeWidth: 2 }} isAnimationActive animationDuration={1200}
                    style={{ filter: 'drop-shadow(0 0 6px rgba(255,91,31,0.45))' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-3">
              <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-ash hover:text-chalk">Table view</summary>
              <div className="overflow-x-auto">
                <table className="tnum mt-2 w-full text-left text-sm">
                  <thead className="text-smoke"><tr><th className="py-1.5 font-normal">Date</th><th className="font-normal">Weight</th><th className="font-normal">7-day</th><th className="font-normal">Waist</th><th className="font-normal">Plan</th><th><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {[...body].reverse().slice(0, 30).map((b: BodyEntry) => (
                      <tr key={b.date} className="border-t border-white/5">
                        <td className="py-1.5">{fmtShort(b.date)}</td><td>{b.weight?.toFixed(1) ?? '–'}</td><td>{avg7(body, b.date)?.toFixed(1) ?? '–'}</td><td>{b.waist ?? '–'}</td>
                        <td className="text-smoke">{projectedWeight(diffDays(b.date, META.startDate)).toFixed(1)}</td>
                        <td className="text-right"><button type="button" onClick={() => remove(b.date)} className="h-9 rounded-lg px-2 text-xs text-smoke hover:text-chalk" aria-label={`Delete entry for ${fmtShort(b.date)}`}>Delete</button></td>
                      </tr>
                    ))}
                    {body.length === 0 && <tr><td colSpan={6} className="py-2 text-smoke">No entries yet. Log your first weigh-in to start the chart.</td></tr>}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>
          <div className="space-y-5">
            <Card className="p-6">
              <Label>Morning weigh-in</Label>
              <label className="mt-4 block">
                <span className="label">Date</span>
                <input type="date" value={date} max={t} onChange={(e) => setDate(e.target.value)} className="mt-2 h-12 w-full rounded-2xl bg-white/[0.05] px-4 text-chalk shadow-lit [color-scheme:dark]" />
              </label>
              <div className="mt-5 space-y-5">
                <div><span className="label">Weight</span><div className="mt-2"><Stepper value={weight} onChange={setWeight} step={0.2} min={120} max={350} unit="lb" label="Body weight" /></div></div>
                <div><span className="label">Waist at the navel</span><div className="mt-2"><Stepper value={waist} onChange={setWaist} step={0.25} min={20} max={70} unit="in" label="Waist" /></div></div>
              </div>
              <Button variant="primary" icon={saved ? 'check' : undefined} className="mt-6 w-full" onClick={save}>{saved ? 'Saved' : 'Save entry'}</Button>
              <p className="mt-3 text-xs text-smoke">Weigh after waking, before food. Only the 7-day average matters.</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${rule.state === 'adjust' ? 'bg-caution text-void' : rule.state === 'on-track' ? 'bg-good text-void' : 'bg-white/[0.05] text-ash shadow-lit'}`}>
                  <Icon name={rule.state === 'adjust' ? 'alert' : rule.state === 'on-track' ? 'check' : 'info'} />
                </span>
                <div>
                  <Label>Monthly check</Label>
                  <p className="mt-1.5 font-semibold">
                    {rule.state === 'early' && `Opens in ${rule.daysLeft} days`}
                    {rule.state === 'no-data' && 'Log 3 weigh-ins this week'}
                    {rule.state === 'on-track' && `On track: down ${rule.drop} lb in 4 weeks`}
                    {rule.state === 'adjust' && `Adjust: down ${Math.max(0, rule.drop)} lb in 4 weeks`}
                  </p>
                  <p className="mt-1 text-sm text-ash">After month one, if the 7-day average drops less than 2 lb over 4 weeks: cut about 150 kcal a day or add about 2,000 daily steps.</p>
                </div>
              </div>
            </Card>
            <p className="px-1 text-xs text-smoke">Plan weights model lean mass rising from 171 lb to about 176 lb with training (now about {leanAt(startDay).toFixed(0)} lb): weight = lean mass ÷ (1 − body fat).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
