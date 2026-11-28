import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { fmtShort } from '../logic/dates';
import { consistency, milestones, streak, weekRings, weeklyReview } from '../logic/motivation';
import { useStore } from '../logic/store';
import { ChalkTally } from './ChalkTally';
import { Icon } from './Icon';
import { PunchCard } from './PunchCard';
import { Card, Label } from './ui';

/** Three concentric rings: lifting, conditioning, habits. */
export function TripleRing({ lift, cond, habits, size = 132 }: { lift: number; cond: number; habits: number; size?: number }) {
  const reduce = useReducedMotion();
  const rings = [
    { v: lift, r: size / 2 - 8, c: ['#FF8A7A', '#EF5A4A'] },
    { v: cond, r: size / 2 - 24, c: ['#F3EFE8', '#B8B3AA'] },
    { v: habits, r: size / 2 - 40, c: ['#E8DFCF', '#A39C90'] },
  ];
  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0" aria-hidden="true">
      <defs>
        {rings.map((g, i) => <linearGradient key={i} id={`tr${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={g.c[0]} /><stop offset="1" stopColor={g.c[1]} /></linearGradient>)}
      </defs>
      {rings.map((g, i) => {
        const c = 2 * Math.PI * g.r;
        return (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={g.r} stroke="rgba(255,255,255,0.07)" strokeWidth="11" fill="none" />
            <motion.circle cx={size / 2} cy={size / 2} r={g.r} stroke={`url(#tr${i})`} strokeWidth="11" fill="none" strokeLinecap="round" strokeDasharray={c}
              initial={reduce ? false : { strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, g.v))) }}
              transition={{ type: 'spring', stiffness: 90, damping: 20, delay: reduce ? 0 : 0.15 + i * 0.08 }} />
          </g>
        );
      })}
    </svg>
  );
}

export function WeekCard({ date }: { date: string }) {
  const sessions = useStore((s) => s.sessions);
  const habits = useStore((s) => s.habits);
  const r = useMemo(() => weekRings(sessions, habits, date), [sessions, habits, date]);
  const st = useMemo(() => streak(sessions, date), [sessions, date]);
  const score = useMemo(() => consistency(sessions, habits, date), [sessions, habits, date]);
  return (
    <section className="space-y-3" aria-label="This week">
      <PunchCard date={date} />
      <ChalkTally count={st.current} longest={st.longest} />
      <Card className="grid grid-cols-3 divide-x divide-white/5 p-1">
        {[
          { k: 'Lifting', v: `${r.lift.done}/${r.lift.goal}` },
          { k: 'Conditioning', v: `${r.conditioning.done}/${r.conditioning.goal}` },
          { k: 'Habits', v: `${Math.round((100 * r.habits.done) / r.habits.goal)}%` },
        ].map((x) => (
          <div key={x.k} className="px-3 py-3 text-center">
            <p className="display text-[30px] leading-none">{x.v}</p>
            <p className="label mt-1.5 text-[12px]">{x.k}</p>
          </div>
        ))}
      </Card>
      {score != null && <p className="typed px-1 text-[13px] text-ash">Consistency score {score} of 100.</p>}
    </section>
  );
}

export function StreakChip({ date }: { date: string }) {
  const sessions = useStore((s) => s.sessions);
  const st = useMemo(() => streak(sessions, date), [sessions, date]);
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name="flame" size={16} weight="fill" className={st.current ? 'text-ember' : 'text-smoke'} />
      <span>{st.current} day streak</span>
    </span>
  );
}

export function NextMilestone({ date, compact }: { date: string; compact?: boolean }) {
  const body = useStore((s) => s.body);
  const m = useMemo(() => milestones(body, date), [body, date]);
  if (!m.next) {
    return (
      <Card className="p-6"><Label>Milestones</Label><p className="display mt-3 text-[40px]">12% reached</p><p className="mt-1 text-ash">Every checkpoint is behind you. Hold it.</p></Card>
    );
  }
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label>Next milestone · {fmtShort(m.next.date)}</Label>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="display text-[56px] leading-none">{m.fatToNext.toFixed(1)}</span>
            <span className="text-ash">lb of fat to {m.next.bf}%</span>
          </p>
          {!compact && <p className="mt-2 text-sm text-smoke">Now about {m.bf.toFixed(1)}% at {m.weight.toFixed(1)} lb. Target {m.next.weight.toFixed(0)} lb.</p>}
        </div>
        <Icon name="flag" size={26} className="mt-1 text-smoke" />
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={`${Math.round(m.progress * 100)}% of the way from 24% to 12%`}>
        <motion.div className="h-full rounded-full bg-gradient-to-r from-ember-deep to-ember" initial={{ width: 0 }} animate={{ width: `${Math.max(2, m.progress * 100)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 20 }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-smoke"><span>24% · 225 lb</span><span>12% · {(m.list.find((x) => x.bf === 12)?.weight ?? 200).toFixed(0)} lb</span></div>
    </Card>
  );
}

/** The 12-month path: checkpoints with dates and weights, and where you are on it. */
export function Journey({ date }: { date: string }) {
  const body = useStore((s) => s.body);
  const reduce = useReducedMotion();
  const m = useMemo(() => milestones(body, date), [body, date]);
  const pts = [{ bf: 24, weight: 225, date: '', reached: true }, ...m.list];
  // One monotonic descending line: x is time (month), y is planned scale weight on a linear scale.
  const W = 1000, H = 400, X0 = 100, X1 = 900, Y0 = 120, Y1 = 290;
  const months = [0, ...m.list.map((x) => x.month)];
  const wMax = pts[0].weight, wMin = pts[pts.length - 1].weight;
  const xs = months.map((mo) => X0 + (mo / months[months.length - 1]) * (X1 - X0));
  const ys = pts.map((p) => Y0 + ((wMax - p.weight) / (wMax - wMin)) * (Y1 - Y0));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  // where you are: between the last reached and next checkpoint, by fat lost
  const nextIdx = pts.findIndex((p, i) => i > 0 && !p.reached);
  const seg = nextIdx < 0 ? pts.length - 1 : nextIdx;
  const prevW = pts[Math.max(0, seg - 1)].weight, nextW = pts[seg].weight;
  const frac = nextIdx < 0 ? 1 : Math.max(0, Math.min(1, (prevW - m.weight) / (prevW - nextW)));
  const meX = xs[Math.max(0, seg - 1)] + (xs[seg] - xs[Math.max(0, seg - 1)]) * frac;
  const meY = ys[Math.max(0, seg - 1)] + (ys[seg] - ys[Math.max(0, seg - 1)]) * frac;
  return (
    <Card className="overflow-hidden p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Label>The 12-month path</Label>
          <h2 className="display mt-2 text-[44px]">24% to 12%</h2>
        </div>
        <p className="text-right text-sm text-ash">Now <span className="display text-[28px] text-chalk">{m.bf.toFixed(1)}%</span></p>
      </div>
      <div className="-mx-2 mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Checkpoints: ${m.list.map((x) => `${x.bf}% about ${x.weight.toFixed(0)} lb by ${fmtShort(x.date)}`).join('; ')}. You are at ${m.bf.toFixed(1)}%.`}>
          <defs>
            <linearGradient id="jp" x1="0" x2="1"><stop offset="0" stopColor="#A0211A" /><stop offset="1" stopColor="#FF8A7A" /></linearGradient>
          </defs>
          <path d={d} stroke="rgba(255,255,255,0.10)" strokeWidth="10" fill="none" strokeLinecap="round" />
          <motion.path d={d} stroke="url(#jp)" strokeWidth="10" fill="none" strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: Math.max(0.02, ((seg - 1) + frac) / (pts.length - 1)) }} transition={{ duration: 1.4, ease: [0.2, 0.9, 0.25, 1] }} />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={ys[i]} r={i === 0 ? 10 : 14} fill={p.reached ? '#EF5A4A' : '#1A1714'} stroke={p.reached ? '#FF8A7A' : 'rgba(255,255,255,0.22)'} strokeWidth="3" />
              <text x={xs[i]} y={ys[i] + (i % 2 === 0 ? -36 : 66)} textAnchor="middle" fill="#F4EFE4" fontFamily="'Big Shoulders Display Variable', sans-serif" fontWeight="800" fontSize="52">{p.bf}%</text>
              <text x={xs[i]} y={ys[i] + (i % 2 === 0 ? -96 : 102)} textAnchor="middle" fill="#C9C1B4" fontSize="28" fontFamily="'Instrument Sans Variable', sans-serif">
                {i === 0 ? 'Start · 225 lb' : `${fmtShort(p.date)} · ${p.weight.toFixed(0)} lb`}
              </text>
            </g>
          ))}
          <g transform={`translate(${meX} ${meY})`}>
            <circle r="22" fill="rgba(239,90,74,0.2)" />
            <circle r="9" fill="#F4EFE4" />
          </g>
        </svg>
      </div>
      {m.next && <p className="mt-1 text-ash"><span className="font-semibold text-chalk">{m.fatToNext.toFixed(1)} lb of fat</span> to {m.next.bf}%, planned for {fmtShort(m.next.date)}.</p>}
    </Card>
  );
}

export function ReviewCard({ date }: { date: string }) {
  const sessions = useStore((s) => s.sessions);
  const body = useStore((s) => s.body);
  const habits = useStore((s) => s.habits);
  const r = useMemo(() => weeklyReview(sessions, body, habits, date), [sessions, body, habits, date]);
  const dv = r.volumeLast ? Math.round((100 * (r.volume - r.volumeLast)) / r.volumeLast) : null;
  return (
    <Card className="p-6">
      <Label>Sunday review · week of {fmtShort(r.weekStart)}</Label>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div><p className="display text-[40px] leading-none">{r.sessionsDone}<span className="text-smoke">/{r.sessionsPlanned}</span></p><p className="mt-1 text-sm text-ash">sessions</p></div>
        <div><p className="display text-[40px] leading-none">{(r.volume / 1000).toFixed(1)}k</p><p className="mt-1 text-sm text-ash">lb lifted{dv != null ? `, ${dv >= 0 ? '+' : ''}${dv}%` : ''}</p></div>
        <div><p className="display text-[40px] leading-none">{r.weightChange == null ? '–' : `${r.weightChange > 0 ? '+' : ''}${r.weightChange}`}</p><p className="mt-1 text-sm text-ash">lb, 7-day avg</p></div>
      </div>
      <div className="mt-5 flex gap-3 rounded-[6px] bg-white/[0.04] p-4">
        <Icon name="target" size={22} className="mt-0.5 shrink-0 text-ember" />
        <p><span className="font-semibold">Next week: </span><span className="text-ash">{r.focus}</span></p>
      </div>
    </Card>
  );
}
