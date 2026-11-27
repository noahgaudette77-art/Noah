import { useEffect, useMemo, useState } from 'react';
import { Button, Label, Num, Ring } from '../components/ui';
import type { CardioBlock, SessionLog } from '../data/types';
import { toggleCardio } from '../logic/session';
import { buzz, play } from '../lib/sfx';
import { DemoPlayer } from '../rig/DemoPlayer';

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

function segmentsFor(c: CardioBlock) {
  if (c.intervals) {
    const segs = [{ label: 'Warm up', sec: 180, hard: false }];
    for (let i = 0; i < c.intervals.rounds; i++) {
      segs.push({ label: `Hard · ${i + 1} of ${c.intervals.rounds}`, sec: c.intervals.hard, hard: true });
      segs.push({ label: `Easy · ${i + 1} of ${c.intervals.rounds}`, sec: c.intervals.easy, hard: false });
    }
    segs.push({ label: 'Cool down', sec: 120, hard: false });
    return segs;
  }
  return [{ label: c.kind === 'incline-walk' ? '15% · 3.0 mph' : 'Easy pace', sec: c.minutes * 60, hard: false }];
}

export function CardioPanel({ c, session }: { c: CardioBlock; session: SessionLog }) {
  const segs = useMemo(() => segmentsFor(c), [c]);
  const total = segs.reduce((a, s) => a + s.sec, 0);
  const [clock, setClock] = useState<{ base: number; since: number | null }>({ base: 0, since: null });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (clock.since === null) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [clock.since]);
  const elapsed = Math.min(total, clock.base + (clock.since ? (now - clock.since) / 1000 : 0));
  let acc = 0, seg = segs[segs.length - 1], segLeft = 0, segIdx = segs.length - 1;
  for (let i = 0; i < segs.length; i++) { if (elapsed < acc + segs[i].sec) { seg = segs[i]; segLeft = acc + segs[i].sec - elapsed; segIdx = i; break; } acc += segs[i].sec; }
  const [lastIdx, setLastIdx] = useState(segIdx);
  useEffect(() => {
    if (segIdx !== lastIdx) { setLastIdx(segIdx); if (clock.since) { play('rest-done'); buzz(seg.hard ? [200, 80, 200] : 150); } }
  }, [segIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (elapsed >= total && clock.since) { setClock({ base: total, since: null }); if (!session.cardioDone.includes(c.id)) toggleCardio(c.id); } }, [elapsed >= total]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = clock.since !== null;
  const done = session.cardioDone.includes(c.id);
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-10">
      <DemoPlayer id={c.demo} name={c.name} view={c.demo === 'bike' ? 'Upright bike' : 'Treadmill'} primary aspect={16 / 11} className="-mx-4 h-[42vh] min-h-[280px] sm:mx-0 sm:rounded-[28px] lg:h-[560px]" />
      <div className="mt-6 lg:mt-0">
        <Label>{c.minutes} min</Label>
        <h2 className="display mt-2 text-[52px]">{c.name}</h2>
        <ul className="mt-3 space-y-1.5 text-ash">{c.details.map((d) => <li key={d}>{d}</li>)}</ul>
        <div className="mt-6 flex items-center gap-6">
          <Ring value={c.intervals ? segLeft / seg.sec : 1 - elapsed / total} size={196} stroke={12} tone={seg.hard ? 'ember' : 'chalk'} glow={seg.hard} label={`${seg.label}, ${Math.ceil(segLeft)} seconds left`}>
            <div className="text-center">
              <Num value={mmss(c.intervals ? segLeft : total - elapsed)} className="text-[46px] leading-none" />
              <p className="label mt-1">{c.intervals ? 'segment' : 'left'}</p>
            </div>
          </Ring>
          <div className="min-w-0">
            <p className={`display text-[34px] ${seg.hard ? 'text-ember' : ''}`} aria-live="polite">{seg.label}</p>
            <p className="mt-1 text-sm text-smoke">{mmss(elapsed)} of {mmss(total)}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant={running ? 'secondary' : 'primary'} size="lg" icon={running ? 'pause' : 'play'} onClick={() => setClock(running ? { base: elapsed, since: null } : { base: elapsed, since: Date.now() })}>
            {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start timer'}
          </Button>
          <Button variant="secondary" size="lg" icon={done ? 'check' : 'flag'} onClick={() => toggleCardio(c.id)}>{done ? 'Done' : 'Mark done'}</Button>
        </div>
        {elapsed > 0 && !running && <button type="button" className="mt-3 h-11 text-sm text-smoke hover:text-chalk" onClick={() => setClock({ base: 0, since: null })}>Reset timer</button>}
      </div>
    </div>
  );
}
