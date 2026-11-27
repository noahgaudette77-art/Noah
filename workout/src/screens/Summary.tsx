import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CountUp } from '../components/CountUp';
import { Icon } from '../components/Icon';
import { WeekCard } from '../components/Motivation';
import { HeroLoop } from '../components/HeroLoop';
import { Stamp } from '../components/iron';
import { Button, Card, Label } from '../components/ui';
import { EXERCISES, dayByKey } from '../data/program';
import { fmtLong } from '../logic/dates';
import { dayNumber, sessionPRs, streak } from '../logic/motivation';
import { volume } from '../logic/progression';
import { recommendationFor } from '../logic/session';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';
import { drawSummaryCard, shareOrDownload } from '../lib/summaryCard';

export default function Summary({ id }: { id: string }) {
  const sessions = useStore((s) => s.sessions);
  const s = sessions.find((x) => x.id === id);
  const reduce = useReducedMotion();
  const [saving, setSaving] = useState<'' | 'busy' | 'shared' | 'downloaded'>('');
  const data = useMemo(() => {
    if (!s) return null;
    const plan = dayByKey(s.dayKey);
    const sets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0);
    const vol = s.exercises.reduce((a, e) => a + volume(e), 0);
    const mins = Math.max(1, Math.round(((s.finishedAt ?? s.startedAt) - s.startedAt) / 60000));
    const prs = sessionPRs(sessions, s);
    const st = streak(sessions, s.date);
    const next = plan.slots.filter((sl) => s.exercises.find((e) => e.exerciseId === sl.exerciseId)?.sets.some((x) => x.done))
      .map((sl) => ({ id: sl.exerciseId, name: EXERCISES[sl.exerciseId].short, rec: recommendationFor(sl) }));
    return { plan, sets, vol, mins, prs, st, next };
  }, [s, sessions]);

  if (!s || !data) {
    return (
      <div className="gutter mx-auto grid min-h-screen max-w-md place-items-center text-center">
        <div><Label>Not found</Label><p className="display mt-3 text-[48px]">No such session</p><Button className="mt-6" onClick={() => navigate('/history')}>History</Button></div>
      </div>
    );
  }
  const { plan, sets, vol, mins, prs, st, next } = data;
  const save = async () => {
    setSaving('busy');
    const blob = await drawSummaryCard({
      title: plan.title, date: fmtLong(s.date), dayLine: dayNumber(s.date) ? `Day ${dayNumber(s.date)} of 365` : 'Practice session',
      stats: [
        { label: 'Volume', value: vol >= 1000 ? (vol / 1000).toFixed(1) : String(vol), unit: vol >= 1000 ? 'k lb' : 'lb' },
        { label: 'Time', value: String(mins), unit: 'min' },
        { label: 'Sets', value: String(sets) },
        { label: 'New bests', value: String(prs.length) },
      ],
      prs: prs.map((p) => `${EXERCISES[p.exerciseId].short} ${p.set.weight ? `${p.set.weight} lb × ` : ''}${p.set.reps}`),
      streak: st.current,
    });
    setSaving(await shareOrDownload(blob, `tempo-${s.date}-${plan.key}.png`));
  };
  return (
    <div className="gutter mx-auto min-h-screen max-w-3xl pb-[calc(40px+var(--safe-b))] pt-[calc(24px+var(--safe-t))]">
      <div className="flex items-center justify-between">
        <Label>{dayNumber(s.date) ? `Day ${dayNumber(s.date)} of 365` : 'Practice session'} · {fmtLong(s.date)}</Label>
        <button type="button" onClick={() => navigate('/')} className="grid h-11 w-11 place-items-center rounded-full text-ash hover:bg-white/5" aria-label="Close"><Icon name="close" /></button>
      </div>
      <HeroLoop name="loop-complete" className="mx-auto mt-5 aspect-[4/5] w-full max-w-[400px]" alt="">
        <div className="pointer-events-none absolute right-3 top-3"><Stamp land size={46} angle={-8} color="var(--amber)">Complete</Stamp></div>
      </HeroLoop>
      <motion.div className="mt-6 flex items-center gap-4" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div>
          <p className="label">Session complete</p>
          <h1 className="display misprint mt-1 text-[64px] sm:text-[88px]">{plan.title}</h1>
        </div>
      </motion.div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: 'Volume', v: <><CountUp to={vol >= 1000 ? vol / 1000 : vol} decimals={vol >= 1000 ? 1 : 0} />{vol >= 1000 ? 'k' : ''}</>, u: 'lb' },
          { l: 'Time', v: <CountUp to={mins} />, u: 'min' },
          { l: 'Sets', v: <CountUp to={sets} /> },
          { l: 'New bests', v: <CountUp to={prs.length} /> },
        ].map((x) => (
          <Card key={x.l} className="p-5"><Label>{x.l}</Label><p className="mt-2 flex items-baseline gap-1"><span className="display text-[64px] leading-none">{x.v}</span>{x.u && <span className="text-ash">{x.u}</span>}</p></Card>
        ))}
      </div>
      {prs.length > 0 && (
        <Card className="mt-5 p-6">
          <Label>New bests</Label>
          <ul className="mt-3 space-y-3">
            {prs.map((p) => (
              <li key={p.exerciseId} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3"><Icon name="trophy" weight="fill" className="text-ember" />{EXERCISES[p.exerciseId].name}</span>
                <span className="text-right"><span className="display text-[28px]">{p.set.weight ? `${p.set.weight} × ` : ''}{p.set.reps}</span><span className="block text-xs text-smoke">was {p.previous.weight ? `${p.previous.weight} × ` : ''}{p.previous.reps}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="mt-5"><WeekCard date={s.date} /></div>
      {next.length > 0 && (
        <Card className="mt-5 p-6">
          <Label>Next time</Label>
          <ul className="mt-3 divide-y divide-white/5">
            {next.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-semibold">{n.name}</span>
                <span className={n.rec.kind === 'hold' ? 'text-ash' : 'font-semibold text-chalk'}>{n.rec.headline}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button variant="primary" size="lg" icon="share" onClick={save} disabled={saving === 'busy'}>{saving === 'busy' ? 'Drawing card…' : 'Save summary card'}</Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/')}>Done</Button>
      </div>
      {(saving === 'shared' || saving === 'downloaded') && <p className="mt-3 text-center text-sm text-ash" role="status">{saving === 'shared' ? 'Card shared.' : 'Card saved to your downloads.'}</p>}
      <p className="mt-3 text-center text-sm text-smoke">{st.current > 0 ? `${st.current}-day streak.` : ''} {plan.cardio.length && !s.cardioDone.length ? `Still to do: ${plan.cardio[0].name.toLowerCase()}.` : ''}</p>
    </div>
  );
}
