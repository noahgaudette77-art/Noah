import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { fmtShort } from '../logic/dates';
import { consistency, milestones, streak, weekRings, weeklyReview } from '../logic/motivation';
import { useStore } from '../logic/store';
import { Icon } from './Icon';
import { Card, Label } from './ui';

/** Three concentric rings: lifting, conditioning, habits. */
export function TripleRing({ lift, cond, habits, size = 132 }: { lift: number; cond: number; habits: number; size?: number }) {
  const reduce = useReducedMotion();
  const rings = [
    { v: lift, r: size / 2 - 8, c: ['#FF8A4C', '#FF5B1F'] },
    { v: cond, r: size / 2 - 24, c: ['#F3EFE8', '#B8B3AA'] },
    { v: habits, r: size / 2 - 40, c: ['#A9C6FF', '#6F98F2'] },
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
  const rows = [
    { k: 'Lifting', v: `${r.lift.done}/${r.lift.goal}`, dot: 'bg-ember' },
    { k: 'Conditioning', v: `${r.conditioning.done}/${r.conditioning.goal}`, dot: 'bg-chalk' },
    { k: 'Habits', v: `${Math.round((100 * r.habits.done) / r.habits.goal)}%`, dot: 'bg-rim' },
  ];
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <Label>This week</Label>
          <p className="mt-2 text-sm text-ash">{st.current > 0 ? `${st.current}-day streak. Longest ${st.longest}.` : 'Your streak starts with the next session.'}</p>
        </div>
        {score != null && (
          <div className="text-right">
            <Label>Consistency</Label>
            <p className="display mt-1 text-[40px] leading-none">{score}</p>
          </div>
        )}
      </div>
      <div className="mt-5 flex items-center gap-6">
        <div role="img" aria-label={`Lifting ${rows[0].v}, conditioning ${rows[1].v}, habits ${rows[2].v}`}>
          <TripleRing lift={r.lift.done / r.lift.goal} cond={r.conditioning.done / r.conditioning.goal} habits={r.habits.done / r.habits.goal} />
        </div>
        <ul className="flex-1 space-y-3">
          {rows.map((x) => (
            <li key={x.k} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-ash"><span className={`h-2.5 w-2.5 rounded-full ${x.dot}`} />{x.k}</span>
              <span className="display text-[26px] leading-none">{x.v}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
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
      <div className="mt-2 flex justify-between text-xs text-smoke"><span>24% · 225 lb</span><span>12% · 194 lb</span></div>
    </Card>
  );
}

/** The 12-month path: checkpoints with dates and weights, and where you are on it. */
export function Journey({ date }: { date: string }) {
  const body = useStore((s) => s.body);
  const reduce = useReducedMotion();
  const m = useMemo(() => milestones(body, date), [body, date]);
  const pts = [{ bf: 24, weight: 225, date: '', reached: true }, ...m.list];
  const W = 1000, H = 400;
  const xs = pts.map((_, i) => 100 + (i * (W - 200)) / (pts.length - 1));
  const ys = pts.map((_, i) => (i % 2 === 0 ? 255 : 160));
  const d = xs.map((x, i) => (i === 0 ? `M${x} ${ys[i]}` : `C${xs[i - 1] + 110} ${ys[i - 1]} ${x - 110} ${ys[i]} ${x} ${ys[i]}`)).join(' ');
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
            <linearGradient id="jp" x1="0" x2="1"><stop offset="0" stopColor="#B83A0B" /><stop offset="1" stopColor="#FF8A4C" /></linearGradient>
          </defs>
          <path d={d} stroke="rgba(255,255,255,0.10)" strokeWidth="10" fill="none" strokeLinecap="round" />
          <motion.path d={d} stroke="url(#jp)" strokeWidth="10" fill="none" strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: Math.max(0.02, ((seg - 1) + frac) / (pts.length - 1)) }} transition={{ duration: 1.4, ease: [0.2, 0.9, 0.25, 1] }} />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={xs[i]} cy={ys[i]} r={i === 0 ? 10 : 14} fill={p.reached ? '#FF5B1F' : '#18181B'} stroke={p.reached ? '#FF8A4C' : 'rgba(255,255,255,0.22)'} strokeWidth="3" />
              <text x={xs[i]} y={ys[i] + (i % 2 === 0 ? 62 : -36)} textAnchor="middle" fill="#F3EFE8" fontFamily="'Big Shoulders Display Variable', sans-serif" fontWeight="800" fontSize="52">{p.bf}%</text>
              <text x={xs[i]} y={ys[i] + (i % 2 === 0 ? 100 : -96)} textAnchor="middle" fill="#B8B3AA" fontSize="28" fontFamily="'Instrument Sans Variable', sans-serif">
                {i === 0 ? 'Start · 225 lb' : `${fmtShort(p.date)} · ${p.weight.toFixed(0)} lb`}
              </text>
            </g>
          ))}
          <g transform={`translate(${meX} ${meY})`}>
            <circle r="22" fill="rgba(255,91,31,0.18)" />
            <circle r="9" fill="#F3EFE8" />
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
      <div className="mt-5 flex gap-3 rounded-2xl bg-white/[0.04] p-4">
        <Icon name="target" size={22} className="mt-0.5 shrink-0 text-ember" />
        <p><span className="font-semibold">Next week: </span><span className="text-ash">{r.focus}</span></p>
      </div>
    </Card>
  );
}
