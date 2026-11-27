import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, Card, Ring, Sheet, Stepper } from '../components/ui';
import { EXERCISES, dayByKey } from '../data/program';
import type { CardioBlock, ExerciseLog, ExerciseSlot, SessionLog, SetLog } from '../data/types';
import { STAGE_LABEL, recommend, tempoForStage, volume } from '../logic/progression';
import {
  type Block, blocksFor, discardSession, finishSession, recommendationFor, setCursor, slotHistory, setsDone, setsTotal, toggleCardio, updateSet, updateWeight,
} from '../logic/session';
import { useStore } from '../logic/store';
import { navigate } from '../lib/router';
import { buzz, play } from '../lib/sfx';
import { DemoPlayer } from '../rig/DemoPlayer';

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const repStr = (r: [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);

function useNow(ms = 1000, on = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, on]);
  return now;
}

// ---------------------------------------------------------------- rest timer
interface Rest { endsAt: number; total: number; label: string }

function RestTimer({ rest, onChange, onDone }: { rest: Rest; onChange: (r: Rest | null) => void; onDone: () => void }) {
  const now = useNow(200);
  const left = Math.ceil((rest.endsAt - now) / 1000);
  useEffect(() => {
    if (left <= 0) { play('rest-done'); buzz([120, 80, 120]); onDone(); }
  }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <motion.div
      role="timer" aria-live="off" aria-label={`Rest, ${left} seconds left`}
      initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-x-3 bottom-[calc(12px+var(--safe-b))] z-40 mx-auto flex max-w-lg items-center gap-4 rounded-[26px] border border-white/10 bg-ink-850/95 p-3 pr-4 shadow-2xl backdrop-blur-xl lg:right-8 lg:left-auto lg:w-[440px]"
    >
      <Ring value={Math.max(0, left) / rest.total} size={72} stroke={6}>
        <span className="num text-lg font-semibold">{mmss(left)}</span>
      </Ring>
      <div className="min-w-0 flex-1">
        <p className="eyebrow">Rest</p>
        <p className="text-sm font-semibold leading-tight">{rest.label}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button type="button" className="num h-12 w-11 rounded-2xl bg-ink-700 text-sm font-semibold hover:bg-ink-600" onClick={() => onChange({ ...rest, endsAt: rest.endsAt - 15000 })} aria-label="Remove 15 seconds">-15</button>
        <button type="button" className="num h-12 w-11 rounded-2xl bg-ink-700 text-sm font-semibold hover:bg-ink-600" onClick={() => onChange({ ...rest, endsAt: rest.endsAt + 15000, total: rest.total + 15 })} aria-label="Add 15 seconds">+15</button>
        <button type="button" className="grid h-12 w-12 place-items-center rounded-2xl bg-bone text-ink-950 hover:bg-white" onClick={() => onChange(null)} aria-label="Skip rest">
          <Icon name="skip" size={20} />
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------- set row
const RIR = [0, 1, 2, 3];

function SetRow({ ex, slot, set, idx, label, onComplete, onReplay, focused, prev }: {
  ex: (typeof EXERCISES)[string]; slot: ExerciseSlot; set: SetLog; idx: number; label: string;
  onComplete: () => void; onReplay: () => void; focused: boolean; prev?: SetLog;
}) {
  const reduce = useReducedMotion();
  const bw = ex.load === 'bodyweight';
  const target = `${repStr(slot.reps)}${ex.perSide ? '/side' : ''}`;
  if (set.done) {
    return (
      <motion.li layout={!reduce} className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-ink-800/60 px-3 py-2">
        <button type="button" onClick={() => updateSet(ex.id, idx, { done: false })} aria-label={`Set ${label} done. Undo`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-volt text-volt-ink">
          <motion.svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <motion.path d="M5 12.5l4.2 4.2L19 7" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }} />
          </motion.svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="num text-[15px] font-semibold">{bw ? 'BW' : `${set.weight} lb`} × {set.reps}{set.drop && <span className="ml-2 text-xs text-volt">DROP</span>}</p>
          <p className="eyebrow mt-0.5">Set {label}</p>
        </div>
        <div className="flex items-center gap-1" role="radiogroup" aria-label={`Reps in reserve for set ${label}`}>
          <span className="eyebrow mr-1 hidden sm:inline">RIR</span>
          {RIR.map((r) => (
            <button
              key={r} type="button" role="radio" aria-checked={set.rir === r} onClick={() => updateSet(ex.id, idx, { rir: r })}
              className={`num h-11 w-9 rounded-xl text-sm font-semibold transition-colors ${set.rir === r ? 'bg-bone text-ink-950' : 'bg-ink-700 text-bone-2 hover:bg-ink-600'}`}
              aria-label={`${r === 3 ? '3 or more' : r} reps in reserve`}
            >
              {r === 3 ? '3+' : r}
            </button>
          ))}
        </div>
      </motion.li>
    );
  }
  return (
    <motion.li layout={!reduce} className={`rounded-2xl border p-3 transition-colors ${focused ? 'border-volt/40 bg-ink-800' : 'border-transparent bg-ink-800/60'}`}>
      <button type="button" onClick={onReplay} className="mb-2.5 flex w-full items-center gap-2 text-left">
        <span className="sr-only">Set </span>
        <span className={`num grid h-7 min-w-[28px] place-items-center rounded-lg px-1.5 text-xs font-bold ${set.drop ? 'bg-volt/15 text-volt' : 'bg-ink-600 text-bone'}`}>{set.drop ? 'DROP' : label}</span>
        <span className="num text-sm text-bone-2">Target {target} reps{set.drop ? ' · straight after the last set' : ''}</span>
        {prev && !set.drop && <span className="num ml-auto text-xs text-bone-3">Last {prev.weight ? `${prev.weight}×` : ''}{prev.reps}</span>}
        <Icon name="replay" size={16} className={`${prev && !set.drop ? 'ml-2' : 'ml-auto'} text-bone-3`} />
        <span className="sr-only">, replay demo</span>
      </button>
      <div className="flex items-center gap-2">
        {!bw && <div className="min-w-0 flex-1"><Stepper value={set.weight} onChange={(v) => updateWeight(ex.id, idx, v)} step={5} max={ex.load === 'pair' || ex.load === 'single' ? 50 : 999} unit={ex.load === 'pair' ? 'lb each' : 'lb'} label={`Weight for set ${label}`} wide /></div>}
        <div className="min-w-0 flex-1"><Stepper value={set.reps} onChange={(v) => updateSet(ex.id, idx, { reps: Math.round(v) })} step={1} max={50} unit="reps" label={`Reps for set ${label}`} /></div>
        <motion.button
          type="button" whileTap={{ scale: 0.92 }} onClick={onComplete}
          className="grid h-14 w-16 shrink-0 place-items-center rounded-2xl bg-volt text-volt-ink shadow-[0_0_0_0_rgba(215,255,60,0.4)] hover:bg-[#e2ff6b]"
          aria-label={`Complete set ${label}`}
        >
          <Icon name="check" size={26} strokeWidth={2.6} />
        </motion.button>
      </div>
    </motion.li>
  );
}

// ---------------------------------------------------------------- exercise block
function ExerciseHeader({ slot, log, session, tag }: { slot: ExerciseSlot; log: ExerciseLog; session: SessionLog; tag?: string }) {
  const ex = EXERCISES[slot.exerciseId];
  const rec = useMemo(() => recommendationFor(slot, session.id), [slot, session.id]);
  const t = tempoForStage(slot.tempo, log.stage);
  const prevTop = useMemo(() => { const l = slotHistory(slot, session.id)[0]?.log; return l ? Math.max(...l.sets.filter((s) => s.done && !s.drop).map((s) => s.weight)) : undefined; }, [slot, session.id]);
  const allDone = log.sets.every((s) => s.done);
  const next = useMemo(() => {
    if (!allDone) return null;
    return recommend(ex, slot, [{ date: session.date, log }, ...slotHistory(slot, session.id)]);
  }, [allDone, log, slot, ex, session.id, session.date]);
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{tag ? <span className="text-volt">{tag} · </span> : null}{ex.muscles.primary.join(', ')}</p>
          <h2 className="display mt-1.5 text-[34px] sm:text-[42px]">{ex.name}</h2>
        </div>
        <a href={`#/exercise/${ex.id}`} onClick={(e) => { e.preventDefault(); navigate(`/exercise/${ex.id}`); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink-800 text-bone-2 hover:text-bone" aria-label={`${ex.name}: full instructions`}>
          <Icon name="info" />
        </a>
      </div>
      <div className="num mt-2 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-ink-800 px-2.5 py-1.5 text-bone-2">{log.sets.filter((s) => !s.drop).length} × {repStr(slot.reps)}{ex.perSide ? '/side' : ''}</span>
        <span className="rounded-full bg-ink-800 px-2.5 py-1.5 text-bone-2">{t.down}s down · {t.up}s up{t.bottom ? ` · ${t.bottom}s pause` : ''}{t.top ? ` · ${t.top}s squeeze` : ''}</span>
        <span className="rounded-full bg-ink-800 px-2.5 py-1.5 text-bone-2">Rest {slot.rest}s</span>
        <span className="rounded-full bg-ink-800 px-2.5 py-1.5 text-bone-2">Stop 1–2 reps short</span>
      </div>
      <div className={`mt-3 flex items-start gap-3 rounded-2xl p-3 ${next?.kind === 'increase' || next?.kind === 'advance' || next?.kind === 'variation' ? 'bg-volt text-volt-ink' : 'bg-ink-800/70'}`}>
        <Icon name={next ? 'up' : 'target'} size={20} className={`mt-0.5 shrink-0 ${next && next.kind !== 'hold' ? '' : 'text-volt'}`} />
        <div className="text-sm">
          {next ? (
            <><p className="font-semibold">Next time: {next.headline}</p><p className="opacity-80">{next.detail}</p></>
          ) : (
            <><p className="font-semibold">{rec.stage !== 'load' ? `Today: ${STAGE_LABEL[rec.stage]}` : rec.kind === 'increase' ? `Up ${rec.weight - (prevTop ?? rec.weight)} lb today: ${rec.weight} lb` : rec.headline}</p>
              <p className="text-bone-3">{rec.kind === 'increase' ? `Last time every set hit ${slot.reps[1]} reps with reps in reserve. ${slot.reps[0] === slot.reps[1] ? `Aim for ${slot.reps[1]} again at the new weight.` : `Build back up from ${slot.reps[0]}.`}` : rec.detail}</p></>
          )}
        </div>
      </div>
      {ex.cues.filter((c) => c.priority).map((c) => (
        <div key={c.text} className="mt-2 flex items-start gap-3 rounded-2xl border border-volt/30 bg-volt/[0.06] p-3 text-sm">
          <Icon name="spine" size={20} className="mt-0.5 shrink-0 text-volt" />
          <p><span className="font-semibold text-bone">{c.text.split(':')[0]}:</span><span className="text-bone-2">{' ' + c.text.split(':').slice(1).join(':').trim().replace(/^./, (m) => m.toUpperCase())}</span></p>
        </div>
      ))}
    </div>
  );
}

function StrengthBlock({ block, session, onRest }: { block: Extract<Block, { kind: 'single' | 'superset' }>; session: SessionLog; onRest: (r: Rest) => void }) {
  const logs = block.slots.map((s) => session.exercises.find((e) => e.exerciseId === s.exerciseId)!);
  const prevLogs = block.slots.map((s) => slotHistory(s, session.id)[0]?.log);
  // next undone set across the block decides which exercise the demo shows
  const nextIdx = (() => {
    if (block.kind === 'single') return 0;
    const rounds = Math.max(...logs.map((l) => l.sets.length));
    for (let r = 0; r < rounds; r++) for (let i = 0; i < logs.length; i++) if (logs[i].sets[r] && !logs[i].sets[r].done) return i;
    return 0;
  })();
  const [focus, setFocus] = useState(nextIdx);
  const [replay, setReplay] = useState(0);
  useEffect(() => setFocus(nextIdx), [nextIdx]);
  const fSlot = block.slots[focus];
  const fEx = EXERCISES[fSlot.exerciseId];
  const tempo = tempoForStage(fSlot.tempo, logs[focus].stage);

  const complete = (i: number, setIdx: number) => {
    const ex = EXERCISES[block.slots[i].exerciseId];
    updateSet(ex.id, setIdx, { done: true });
    play('set-done');
    buzz(30);
    const log = logs[i];
    const isLastOfRound = block.kind === 'single' || i === block.slots.length - 1 || !logs[i + 1]?.sets[setIdx];
    const nextIsDrop = log.sets[setIdx + 1]?.drop;
    if (isLastOfRound && !nextIsDrop) {
      const remaining = logs.some((l, li) => l.sets.some((s, si) => !s.done && !(li === i && si === setIdx)));
      if (remaining) onRest({ endsAt: Date.now() + block.slots[i].rest * 1000, total: block.slots[i].rest, label: block.kind === 'superset' ? `Round ${setIdx + 2} next` : `Set ${setIdx + 2} next` });
    } else if (!isLastOfRound) {
      setFocus(i + 1);
      setReplay((r) => r + 1);
    }
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
      {/* demo: pinned above the sets on phones, beside them on desktop */}
      <div className="sticky top-[calc(64px+var(--safe-t))] z-20 -mx-4 bg-ink-950 px-4 pb-3 pt-1 lg:top-24 lg:mx-0 lg:self-start lg:bg-transparent lg:px-0">
        <DemoPlayer id={fSlot.exerciseId} name={fEx.name} tempo={tempo} replayToken={replay} view={fEx.view} primary aspect={16 / 10} className="lg:hidden" />
        <DemoPlayer id={fSlot.exerciseId} name={fEx.name} tempo={tempo} replayToken={replay} view={fEx.view} primary={false} aspect={4 / 3} className="hidden lg:block" />
        {block.kind === 'superset' && (
          <div className="mt-2 grid grid-cols-2 gap-2" role="tablist" aria-label="Superset exercise shown in the demo">
            {block.slots.map((s, i) => (
              <button key={s.exerciseId} type="button" role="tab" aria-selected={focus === i} onClick={() => { setFocus(i); setReplay((r) => r + 1); }}
                className={`h-11 truncate rounded-xl px-3 text-sm font-semibold transition-colors ${focus === i ? 'bg-bone text-ink-950' : 'bg-ink-800 text-bone-2'}`}>
                {block.group}{i + 1} · {EXERCISES[s.exerciseId].short}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 space-y-5 lg:mt-0">
        {block.kind === 'single' ? (
          <>
            <ExerciseHeader slot={block.slots[0]} log={logs[0]} session={session} />
            <ol className="space-y-2.5" aria-label="Sets">
              {logs[0].sets.map((s, si) => (
                <SetRow key={si} ex={EXERCISES[block.slots[0].exerciseId]} slot={block.slots[0]} set={s} idx={si} label={String(si + 1)}
                  focused={si === logs[0].sets.findIndex((x) => !x.done)} prev={prevLogs[0]?.sets[si]}
                  onComplete={() => complete(0, si)} onReplay={() => setReplay((r) => r + 1)} />
              ))}
            </ol>
          </>
        ) : (
          <>
            <div>
              <p className="eyebrow text-volt">Superset {block.group}</p>
              <p className="mt-1 text-sm text-bone-2">Do {block.group}1 then {block.group}2 back to back. Rest only after both.</p>
            </div>
            {block.slots.map((s, i) => <ExerciseHeader key={s.exerciseId} slot={s} log={logs[i]} session={session} tag={`${block.group}${i + 1}`} />).slice(focus, focus + 1)}
            <ol className="space-y-4" aria-label="Rounds">
              {Array.from({ length: Math.max(...logs.map((l) => l.sets.length)) }, (_, r) => (
                <li key={r}>
                  <p className="eyebrow mb-2">Round {r + 1}</p>
                  <ol className="space-y-2">
                    {block.slots.map((s, i) => logs[i].sets[r] && (
                      <SetRow key={s.exerciseId} ex={EXERCISES[s.exerciseId]} slot={s} set={logs[i].sets[r]} idx={r} label={`${block.group}${i + 1}`}
                        focused={i === nextIdx && r === logs[i].sets.findIndex((x) => !x.done)} prev={prevLogs[i]?.sets[r]}
                        onComplete={() => complete(i, r)} onReplay={() => { setFocus(i); setReplay((x) => x + 1); }} />
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </>
        )}
        <details className="group rounded-2xl bg-ink-900 p-4">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between font-semibold">
            Form cues: {fEx.short}<Icon name="chevD" size={18} className="transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-2 space-y-2 text-sm text-bone-2">
            {fEx.cues.map((c) => <li key={c.text} className="flex gap-2"><span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-volt" />{c.text}</li>)}
            <li className="flex gap-2 text-[#ffc2ad]"><Icon name="alert" size={16} className="mt-0.5 shrink-0" />Avoid: {fEx.mistake}</li>
          </ul>
        </details>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- cardio
function segmentsFor(c: CardioBlock) {
  if (c.intervals) {
    const segs = [{ label: 'Warm-up', sec: 180, hard: false }];
    for (let i = 0; i < c.intervals.rounds; i++) {
      segs.push({ label: `Hard · round ${i + 1}/${c.intervals.rounds}`, sec: c.intervals.hard, hard: true });
      segs.push({ label: `Easy · round ${i + 1}/${c.intervals.rounds}`, sec: c.intervals.easy, hard: false });
    }
    segs.push({ label: 'Cool-down', sec: 120, hard: false });
    return segs;
  }
  return [{ label: c.name, sec: c.minutes * 60, hard: false }];
}

function CardioPanel({ c, session }: { c: CardioBlock; session: SessionLog }) {
  const segs = useMemo(() => segmentsFor(c), [c]);
  const total = segs.reduce((a, s) => a + s.sec, 0);
  const [clock, setClock] = useState<{ base: number; since: number | null }>({ base: 0, since: null });
  const now = useNow(250, clock.since !== null);
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
    <div className="lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8">
      <div className="-mx-4 px-4 pb-3 lg:mx-0 lg:px-0"><DemoPlayer id={c.demo} name={c.name} view={c.demo === 'bike' ? 'Upright bike' : 'Treadmill'} primary aspect={16 / 10} /></div>
      <div className="space-y-4">
        <div>
          <p className="eyebrow">{c.minutes} min</p>
          <h2 className="display mt-1.5 text-[40px]">{c.name}</h2>
          <ul className="mt-2 space-y-1.5 text-bone-2">{c.details.map((d) => <li key={d} className="flex gap-2"><span className="mt-2 h-1 w-3 shrink-0 rounded-full bg-volt" />{d}</li>)}</ul>
        </div>
        <Card className="flex items-center gap-5 p-5">
          <Ring value={c.intervals ? segLeft / seg.sec : 1 - elapsed / total} size={116} stroke={8} color={seg.hard ? '#D7FF3C' : '#C4C8CF'} label={`${seg.label}, ${Math.ceil(segLeft)} seconds left`}>
            <div className="text-center">
              <p className="num text-2xl font-semibold">{mmss(c.intervals ? segLeft : total - elapsed)}</p>
              <p className="eyebrow">{c.intervals ? 'segment' : 'left'}</p>
            </div>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className={`display text-3xl ${seg.hard ? 'text-volt' : ''}`} aria-live="polite">{seg.label}</p>
            <p className="num mt-1 text-sm text-bone-3">{mmss(elapsed)} of {mmss(total)}</p>
            <div className="mt-3 flex gap-2">
              <Button variant={running ? 'secondary' : 'primary'} icon={running ? 'pause' : 'play'} onClick={() => setClock(running ? { base: elapsed, since: null } : { base: elapsed, since: Date.now() })}>
                {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
              </Button>
              {elapsed > 0 && !running && <Button variant="ghost" icon="replay" onClick={() => setClock({ base: 0, since: null })} aria-label="Reset timer" />}
            </div>
          </div>
        </Card>
        <Button variant={done ? 'secondary' : 'ghost'} icon={done ? 'check' : 'flag'} className="w-full border border-white/10" onClick={() => toggleCardio(c.id)}>
          {done ? `${c.name} complete` : `Mark ${c.name.toLowerCase()} complete`}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- screen
export default function Workout() {
  const session = useStore((s) => s.active);
  const [rest, setRest] = useState<Rest | null>(null);
  const [summary, setSummary] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const now = useNow(1000, !!session);
  const reduce = useReducedMotion();

  const closeRest = useCallback(() => setTimeout(() => setRest(null), 900), []);

  if (!session) {
    return (
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
        <div>
          <p className="eyebrow">No active session</p>
          <h1 className="display mt-2 text-5xl">Nothing running</h1>
          <Button variant="primary" className="mt-6" onClick={() => navigate('/')}>Go to Today</Button>
        </div>
      </div>
    );
  }
  const day = dayByKey(session.dayKey);
  const blocks = blocksFor(day);
  const cursor = Math.min(session.cursor ?? 0, blocks.length - 1);
  const block = blocks[cursor];
  const done = setsDone(session), total = setsTotal(session);
  const blockDone = (b: Block) => b.kind === 'cardio' ? session.cardioDone.includes(b.cardio.id) : b.slots.every((s) => session.exercises.find((e) => e.exerciseId === s.exerciseId)?.sets.every((x) => x.done));
  const go = (i: number) => { setCursor(Math.max(0, Math.min(blocks.length - 1, i))); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); };
  const finished = session ? finishPreview(session) : null;

  return (
    <div className="min-h-screen pb-[calc(120px+var(--safe-b))]">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/90 pt-[var(--safe-t)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
          <button type="button" onClick={() => navigate('/')} className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-bone-2 hover:bg-white/5 hover:text-bone" aria-label="Leave workout (progress is kept)">
            <Icon name="chevL" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="display truncate text-2xl">{day.title}</p>
            <p className="num text-xs text-bone-3"><span className="sr-only">Elapsed </span>{mmss((now - session.startedAt) / 1000)}</p>
          </div>
          <Ring value={total ? done / total : 0} size={44} stroke={4} label={`${done} of ${total} sets done`}>
            <span className="num text-[11px] font-semibold">{done}</span>
          </Ring>
          <Button variant="primary" onClick={() => setSummary(true)} className="h-11 px-4">Finish</Button>
        </div>
        {/* block stepper */}
        <nav aria-label="Exercises" className="no-scrollbar mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 pb-3 sm:px-8">
          {blocks.map((b, i) => {
            const name = b.kind === 'cardio' ? b.cardio.name : b.kind === 'superset' ? `Superset ${b.group}` : EXERCISES[b.slots[0].exerciseId].short;
            const complete = blockDone(b);
            return (
              <button key={i} type="button" onClick={() => go(i)} aria-current={i === cursor ? 'step' : undefined}
                className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${i === cursor ? 'bg-bone text-ink-950' : complete ? 'bg-volt/15 text-volt' : 'bg-ink-800 text-bone-2 hover:text-bone'}`}>
                {complete ? <Icon name="check" size={15} strokeWidth={2.5} /> : <span className="num opacity-60">{i + 1}</span>}
                {name}
              </button>
            );
          })}
        </nav>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={cursor} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }} className="mx-auto max-w-6xl px-4 pt-3 sm:px-8 lg:pt-8">
          {block.kind === 'cardio' ? <CardioPanel c={block.cardio} session={session} /> : <StrengthBlock block={block} session={session} onRest={(r) => setRest(r)} />}
          <div className="mt-8 flex gap-3">
            <Button variant="secondary" icon="chevL" className="flex-1" disabled={cursor === 0} onClick={() => go(cursor - 1)}>Previous</Button>
            {cursor < blocks.length - 1
              ? <Button variant={blockDone(block) ? 'primary' : 'secondary'} className="flex-1" onClick={() => go(cursor + 1)}>Next <Icon name="chevR" size={20} /></Button>
              : <Button variant="primary" icon="flag" className="flex-1" onClick={() => setSummary(true)}>Finish</Button>}
          </div>
          <button type="button" onClick={() => setConfirmQuit(true)} className="mx-auto mt-6 block h-11 px-4 text-sm text-bone-3 underline-offset-4 hover:text-bone hover:underline">Discard session</button>
        </motion.div>
      </AnimatePresence>

      <div aria-live="polite" className="sr-only">{rest ? `Rest started, ${rest.total} seconds` : ''}</div>
      <AnimatePresence>{rest && <RestTimer rest={rest} onChange={setRest} onDone={closeRest} />}</AnimatePresence>

      <Sheet open={summary} onClose={() => setSummary(false)} title="Finish session">
        {finished && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div><p className="eyebrow">Time</p><p className="num mt-1 text-2xl font-semibold">{Math.round((now - session.startedAt) / 60000)}<span className="text-sm text-bone-3"> min</span></p></div>
              <div><p className="eyebrow">Sets</p><p className="num mt-1 text-2xl font-semibold">{done}<span className="text-sm text-bone-3">/{total}</span></p></div>
              <div><p className="eyebrow">Volume</p><p className="num mt-1 text-2xl font-semibold">{(finished.volume / 1000).toFixed(1)}<span className="text-sm text-bone-3">k lb</span></p></div>
            </div>
            {finished.next.length > 0 && (
              <div>
                <p className="eyebrow mb-2">Next time</p>
                <ul className="space-y-1.5">
                  {finished.next.map((n) => (
                    <li key={n.id} className="flex items-center justify-between gap-3 rounded-xl bg-ink-800 px-3 py-2.5 text-sm">
                      <span className="font-semibold">{n.name}</span>
                      <span className={n.up ? 'font-semibold text-volt' : 'text-bone-3'}>{n.headline}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {done < total && <p className="text-sm text-bone-3">{total - done} sets are not ticked. They will not count toward progression.</p>}
            <Button variant="primary" size="lg" icon="check" className="w-full" onClick={() => { finishSession(); setSummary(false); navigate('/history'); }}>Save and finish</Button>
          </div>
        )}
      </Sheet>
      <Sheet open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Discard session?">
        <p className="text-bone-2">Nothing from this session will be saved.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setConfirmQuit(false)}>Keep going</Button>
          <Button variant="danger" className="flex-1" onClick={() => { discardSession(); navigate('/'); }}>Discard</Button>
        </div>
      </Sheet>
    </div>
  );
}

function finishPreview(session: SessionLog) {
  const day = dayByKey(session.dayKey);
  const vol = session.exercises.reduce((a, e) => a + volume(e), 0);
  const next = day.slots.flatMap((slot) => {
    const log = session.exercises.find((e) => e.exerciseId === slot.exerciseId);
    if (!log || !log.sets.some((s) => s.done)) return [];
    const ex = EXERCISES[slot.exerciseId];
    const r = recommend(ex, slot, [{ date: session.date, log }, ...slotHistory(slot, session.id)]);
    return [{ id: slot.exerciseId, name: ex.short, headline: r.headline, up: r.kind !== 'hold' }];
  });
  return { volume: vol, next };
}
