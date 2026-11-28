import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, Label, Ring, Sheet, Stepper } from '../components/ui';
import { EXERCISES, dayByKey } from '../data/program';
import type { ExerciseLog, SessionLog, SetLog } from '../data/types';
import { type PR, prFor } from '../logic/motivation';
import { STAGE_LABEL, tempoForStage } from '../logic/progression';
import {
  type Block, blocksFor, discardSession, finishSession, recommendationFor, setCursor, setsDone, setsTotal, slotHistory, updateSet, updateWeight,
} from '../logic/session';
import { getState, useStore } from '../logic/store';
import { navigate } from '../lib/router';
import { buzz, play } from '../lib/sfx';
import { today } from '../lib/today';
import { cuesFor } from '../data/musclewiki';
import { VideoPrint } from '../demo/VideoPrint';
import { setRoom } from '../room/state';
import { Stamp } from '../components/iron';
import { say } from '../lib/audio';
import { CardioPanel } from '../workout/CardioPanel';
import { Countdown } from '../workout/Countdown';
import { type StrengthBlock, beatLine, firstOpen, nextSet, tempoText } from '../workout/plan';
import { PRMoment } from '../workout/PRMoment';
import { RestScreen, type RestState } from '../workout/RestScreen';
import { TempoRing } from '../workout/TempoRing';

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const repStr = (r: [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);
const blockName = (b: Block) => (b.kind === 'cardio' ? b.cardio.name : b.kind === 'superset' ? `Superset ${b.group}` : EXERCISES[b.slots[0].exerciseId].short);
const logsOf = (b: StrengthBlock, s: SessionLog) => b.slots.map((x) => s.exercises.find((e) => e.exerciseId === x.exerciseId)!);

function useNow(ms: number, on: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!on) return; const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms, on]);
  return now;
}

// ---------------------------------------------------------------- logged-set chips
function SetChips({ log, onEdit }: { log: ExerciseLog; onEdit: (i: number) => void }) {
  const reduce = useReducedMotion();
  const bw = EXERCISES[log.exerciseId].load === 'bodyweight';
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Sets">
      {log.sets.map((s, i) => (
        <li key={i}>
          <button type="button" onClick={() => s.done && onEdit(i)} disabled={!s.done}
            className={`relative flex h-11 min-w-[44px] items-center justify-center gap-1.5 overflow-hidden rounded-full px-3 text-sm font-semibold transition-colors ${s.done ? 'bg-chalk text-void' : 'bg-white/[0.05] text-smoke shadow-lit'}`}>
            {s.done && !reduce && <motion.span className="absolute inset-0 rounded-full bg-white" initial={{ opacity: 0.9, scale: 0.4 }} animate={{ opacity: 0, scale: 1.8 }} transition={{ duration: 0.6 }} />}
            <span className="sr-only">Set {i + 1}{s.drop ? ', drop' : ''}{s.done ? ', ' : ', not done'}</span>
            {s.done ? <>{s.drop && <span className="opacity-60">D</span>}{bw ? '' : `${s.weight}×`}{s.reps}<span className="sr-only">, edit</span></> : <span aria-hidden="true">{s.drop ? 'Drop' : i + 1}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}

function EditSet({ log, idx, onClose }: { log: ExerciseLog; idx: number; onClose: () => void }) {
  const s = log.sets[idx];
  const bw = EXERCISES[log.exerciseId].load === 'bodyweight';
  return (
    <div className="space-y-5">
      {!bw && <div><Label>Weight</Label><Stepper value={s.weight} onChange={(v) => updateSet(log.exerciseId, idx, { weight: v })} step={5} max={50} unit="lb" label="Weight" /></div>}
      <div><Label>Reps</Label><Stepper value={s.reps} onChange={(v) => updateSet(log.exerciseId, idx, { reps: Math.round(v) })} step={1} max={50} unit="reps" label="Reps" /></div>
      <div>
        <Label>Reps left in the tank</Label>
        <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Reps in reserve">
          {[0, 1, 2, 3].map((r) => (
            <button key={r} type="button" role="radio" aria-checked={s.rir === r} onClick={() => updateSet(log.exerciseId, idx, { rir: r })}
              className={`h-12 rounded-[6px] font-semibold ${s.rir === r ? 'bg-chalk text-void' : 'bg-white/[0.05] text-ash shadow-lit'}`}>{r === 3 ? '3+' : r}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={() => { updateSet(log.exerciseId, idx, { done: false }); onClose(); }}>Undo set</Button>
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- strength block
function StrengthPanel({ block, session, index, total, onLogged, onAdvance, covered }: {
  block: StrengthBlock; session: SessionLog; index: number; total: number; covered?: boolean;
  onLogged: (info: { i: number; s: number; set: SetLog; blockDone: boolean; roundDone: boolean }) => void; onAdvance: () => void;
}) {
  const logs = logsOf(block, session);
  const ns = nextSet(block, logs);
  const [focus, setFocus] = useState(ns?.i ?? 0);
  useEffect(() => { if (ns) setFocus(ns.i); }, [ns?.i, ns?.s]); // eslint-disable-line react-hooks/exhaustive-deps
  const [, setReplay] = useState(0);
  const [film, setFilm] = useState(false);
  const [stamp, setStamp] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'set'>('idle');
  const [edit, setEdit] = useState<{ log: ExerciseLog; idx: number } | null>(null);
  const slot = block.slots[focus];
  const log = logs[focus];
  const ex = EXERCISES[slot.exerciseId];
  const tempo = tempoForStage(slot.tempo, log.stage);
  const setIdx = firstOpen(log);
  const cur = setIdx >= 0 ? log.sets[setIdx] : null;
  const prev = useMemo(() => slotHistory(slot, session.id)[0], [slot, session.id]);
  const rec = useMemo(() => recommendationFor(slot, session.id), [slot, session.id]);
  const bw = ex.load === 'bodyweight';
  const working = log.sets.filter((x) => !x.drop).length;
  const allDone = !ns;

  const logSet = useCallback(() => {
    if (setIdx < 0 || !cur) return;
    updateSet(ex.id, setIdx, { done: true });
    // the set-complete moment: a rubber stamp lands, a thud, a short pulse, the coach
    play('set-done'); buzz([18, 30, 40]); say('set-complete');
    setStamp(Date.now());
    setTimeout(() => setStamp(0), 1100);
    setPhase('idle');
    const after = logsOf(block, getState().active!);
    const blockDone = !nextSet(block, after);
    // a round ends after the last exercise of a superset round, or any single-exercise set not followed by its drop set
    const roundDone = block.kind === 'single' ? !after[focus].sets[setIdx + 1]?.drop : focus === block.slots.length - 1 || !after[focus + 1]?.sets[setIdx];
    onLogged({ i: focus, s: setIdx, set: { ...cur, done: true }, blockDone, roundDone });
    if (!roundDone || (block.kind === 'single' && after[focus].sets[setIdx + 1]?.drop)) setReplay((r) => r + 1);
  }, [setIdx, cur, ex.id, block, focus, onLogged]);

  // the room holds still while a set runs
  useEffect(() => { setRoom({ still: phase !== 'idle' }); return () => setRoom({ still: false }); }, [phase]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [role=dialog]')) return;
      if (e.key === 'Enter' && phase === 'set') { e.preventDefault(); logSet(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [phase, logSet]);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10">
      {/* demo: huge, pinned on phones */}
      <div className="relative -mx-4 sm:mx-0 lg:sticky lg:top-24 lg:self-start">
        <div className="mx-4 sm:mx-0">
          <VideoPrint key={slot.exerciseId} id={slot.exerciseId} tempo={tempo} suspended={covered || phase !== 'idle'} onFilm={setFilm} compact />
        </div>
        {block.kind === 'superset' && (
          <div className="mx-4 mt-3 flex w-fit gap-1 rounded-[6px] p-1 glass sm:mx-0" role="tablist" aria-label="Superset exercise">
            {block.slots.map((s, i) => (
              <button key={s.exerciseId} type="button" role="tab" aria-selected={focus === i} onClick={() => { setFocus(i); setReplay((r) => r + 1); }}
                className={`h-11 rounded-full px-4 text-sm font-semibold transition ${focus === i ? 'bg-chalk text-void' : 'text-ash hover:text-chalk'}`}>
                {block.group}{i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative mt-4 lg:mt-0">
        <p className="label">Exercise {index + 1} of {total}{block.kind === 'superset' ? ` · Superset ${block.group}${focus + 1}` : ''}</p>
        <h2 className="display mt-2 text-[36px] sm:text-[58px]">{ex.name}</h2>
        <p className="mt-2 hidden text-ash lg:block">{working} × {repStr(slot.reps)}{ex.perSide ? ' each side' : ''} · {tempoText(tempo)} · rest {slot.rest} s</p>
        {cur && !allDone && <p className="mt-2 flex items-start gap-2 font-semibold lg:hidden"><Icon name="target" size={20} className="mt-0.5 shrink-0 text-ember" />{beatLine(slot, prev, setIdx, cur, today())}</p>}
        {allDone && <p className="mt-2 text-ash lg:hidden">{working} × {repStr(slot.reps)}{ex.perSide ? ' each side' : ''} · rest {slot.rest} s</p>}
        {rec.stage !== 'load' && <p className="mt-1 text-sm font-semibold text-chalk">{STAGE_LABEL[rec.stage]} this session</p>}

        {allDone ? (
          <div className="mt-8 rounded-[6px] p-6 lit">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-chalk text-void"><Icon name="check" size={28} /></span>
            <p className="display mt-4 text-[40px]">{block.kind === 'superset' ? 'Superset done' : 'Exercise done'}</p>
            <div className="mt-3"><SetChips log={log} onEdit={(i) => setEdit({ log, idx: i })} /></div>
            <Button variant="primary" size="lg" className="mt-6 w-full" onClick={onAdvance}>{index + 1 < total ? 'Next exercise' : 'Finish session'}<Icon name="chevR" size={20} /></Button>
          </div>
        ) : cur && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <p className="display text-[30px]">{cur.drop ? 'Drop set' : `Set ${setIdx + 1}`}<span className="text-smoke"> of {working}</span></p>
              <SetChips log={log} onEdit={(i) => setEdit({ log, idx: i })} />
            </div>
            <div className={`relative mt-3 grid gap-3 ${bw ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <AnimatePresence>
                {stamp > 0 && (
                  <motion.div key={stamp} className="pointer-events-none absolute inset-0 z-10 grid place-items-center" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }} aria-hidden="true">
                    <Stamp land size={64} angle={-9} color="var(--amber)">Done</Stamp>
                  </motion.div>
                )}
              </AnimatePresence>
              {!bw && (
                <div className="rounded-[6px] px-2 py-3 lit">
                  <Stepper value={cur.weight} onChange={(v) => updateWeight(ex.id, setIdx, v)} step={5} max={50} unit={ex.load === 'pair' ? 'lb each' : 'lb'} label="Weight" size="xl" />
                </div>
              )}
              <div className="rounded-[6px] px-2 py-3 lit">
                <Stepper value={cur.reps} onChange={(v) => updateSet(ex.id, setIdx, { reps: Math.round(v) })} step={1} max={50} unit={ex.perSide ? 'reps each side' : 'reps'} label="Reps" size="xl" />
              </div>
            </div>
            <p className="mt-4 hidden items-start gap-2.5 text-[17px] font-semibold lg:flex"><Icon name="target" size={22} className="mt-0.5 shrink-0 text-ember" />{beatLine(slot, prev, setIdx, cur, today())}</p>
            {cuesFor(ex.id, ex, film).cues.filter((c) => c.priority).map((c) => (
              <p key={c.text} className="mt-3 flex items-start gap-2.5 text-sm text-ash"><Icon name="spine" size={18} className="mt-0.5 shrink-0 text-rim" />{c.text}</p>
            ))}
            {/* the one action: pinned to the bottom on phones so it is always in reach */}
            <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-[1fr_auto] gap-3 bg-gradient-to-t from-void via-void/95 to-void/0 px-4 pb-[calc(16px+var(--safe-b))] pt-8 lg:static lg:mt-6 lg:bg-none lg:p-0">
              <Button variant="primary" size="xl" icon="play" onClick={() => setPhase('countdown')}>Start set</Button>
              <button type="button" onClick={logSet} className="grid h-[72px] w-[72px] place-items-center rounded-[6px] text-chalk lit-raised hover:brightness-110" aria-label={`Log set ${setIdx + 1} without the timer`}>
                <Icon name="check" size={28} />
              </button>
            </div>
          </>
        )}
        <details className="group mt-6 rounded-[6px] lit">
          <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between px-5 font-semibold">
            How to do it<Icon name="chevD" size={18} className="transition-transform group-open:rotate-180" />
          </summary>
          <ol className="space-y-2.5 px-5 pb-5 text-ash">
            {cuesFor(ex.id, ex, film).cues.filter((c) => !c.priority).map((c, i) => <li key={c.text} className="flex gap-3"><span className="display w-4 shrink-0 text-[20px] text-smoke">{i + 1}</span>{c.text}</li>)}
            <li className="flex gap-3 text-amber-core"><Icon name="alert" size={18} className="mt-0.5 shrink-0" />Avoid: {cuesFor(ex.id, ex, film).mistake}</li>
          </ol>
        </details>
      </div>

      <AnimatePresence>{phase === 'countdown' && <Countdown onDone={() => setPhase('set')} onCancel={() => setPhase('idle')} />}</AnimatePresence>
      <AnimatePresence>
        {phase === 'set' && cur && (
          <motion.div role="dialog" aria-modal="true" aria-label={`${ex.name}, set in progress`} className="fixed inset-0 z-[65] overflow-y-auto bg-soot"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="gutter mx-auto flex min-h-full max-w-xl flex-col items-center pb-[calc(24px+var(--safe-b))] pt-[calc(20px+var(--safe-t))]">
              <div className="flex w-full items-center justify-between">
                <p className="label">{ex.short} · {cur.drop ? 'drop set' : `set ${setIdx + 1} of ${working}`}</p>
                <button type="button" onClick={() => setPhase('idle')} className="h-11 rounded-full px-4 text-sm font-semibold text-ash hover:text-chalk">Cancel</button>
              </div>
              <p className="display mt-6 text-center text-[34px]">{ex.name}</p>
              <div className="mt-4"><TempoRing tempo={tempo} reps={cur.reps} lastSet={log.sets.slice(setIdx + 1).every((x) => x.done)} size={Math.min(300, typeof window !== 'undefined' ? window.innerWidth - 64 : 300)} /></div>
              <p className="mt-4 text-center text-ash">{bw ? '' : `${cur.weight} lb · `}target {cur.reps} reps{ex.perSide ? ' each side' : ''}. Stop 1 to 2 short of failure.</p>
              <div className="flex-1" />
              <button type="button" onClick={logSet} className="ember-btn mt-6 h-[72px] w-full rounded-[6px] text-lg font-semibold">Done · log {cur.reps} reps</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit ? `Edit set ${edit.idx + 1}` : 'Edit set'}>
        {edit && <EditSet log={logsOf(block, getState().active ?? session)[block.slots.findIndex((s) => s.exerciseId === edit.log.exerciseId)]} idx={edit.idx} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- screen
export default function Workout() {
  const session = useStore((s) => s.active);
  const [rest, setRest] = useState<RestState | null>(null);
  const [pr, setPr] = useState<PR | null>(null);
  const [prSeen] = useState(() => new Set<string>());
  const [finishOpen, setFinishOpen] = useState(false);
  const [quit, setQuit] = useState(false);
  const now = useNow(1000, !!session);
  const reduce = useReducedMotion();

  const day = session ? dayByKey(session.dayKey) : null;
  const blocks = useMemo(() => (day ? blocksFor(day) : []), [day]);
  const cursor = session ? Math.min(session.cursor ?? 0, Math.max(0, blocks.length - 1)) : 0;
  const block = blocks[cursor];
  const [dir, setDir] = useState(1);
  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(blocks.length - 1, i));
    if (n === cursor) return;
    setDir(n > cursor ? 1 : -1);
    setCursor(n);
    window.scrollTo({ top: 0 });
  }, [blocks.length, cursor]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [role=dialog]')) return;
      if (e.key === 'ArrowRight') go(cursor + 1);
      if (e.key === 'ArrowLeft') go(cursor - 1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [cursor, go]);

  const onLogged = useCallback((info: { i: number; s: number; set: SetLog; blockDone: boolean; roundDone: boolean }) => {
    if (!session || !block || block.kind === 'cardio') return;
    const slot = block.slots[info.i];
    const ex = EXERCISES[slot.exerciseId];
    const p = !prSeen.has(ex.id) ? prFor(getState().sessions, ex.id, info.set) : null;
    if (p) { prSeen.add(ex.id); setPr(p); }
    const isDropNext = block.kind === 'single' && logsOf(block, getState().active!)[0].sets[info.s + 1]?.drop;
    if (!info.roundDone || isDropNext) return;
    // rest, with a preview of what comes next
    const live = getState().active!;
    let next: RestState['next'] = null;
    const after = nextSet(block, logsOf(block, live));
    if (after) {
      const ns = block.slots[after.i], nl = logsOf(block, live)[after.i];
      next = { id: ns.exerciseId, name: EXERCISES[ns.exerciseId].name, line: `${nl.sets[after.s].drop ? 'Drop set' : `Set ${after.s + 1} of ${nl.sets.filter((x) => !x.drop).length}`} · ${EXERCISES[ns.exerciseId].load === 'bodyweight' ? '' : `${nl.sets[after.s].weight} lb · `}${repStr(ns.reps)} reps`, beat: beatLine(ns, slotHistory(ns, live.id)[0], after.s, nl.sets[after.s], today()) };
    } else {
      const nb = blocks[cursor + 1];
      if (nb && nb.kind !== 'cardio') {
        const ns = nb.slots[0], nl = logsOf(nb, live)[0];
        next = { id: ns.exerciseId, name: EXERCISES[ns.exerciseId].name, line: `${nl.sets.filter((x) => !x.drop).length} × ${repStr(ns.reps)} · ${EXERCISES[ns.exerciseId].load === 'bodyweight' ? 'bodyweight' : `${nl.sets[0].weight} lb`}`, beat: beatLine(ns, slotHistory(ns, live.id)[0], 0, nl.sets[0], today()) };
      } else if (nb && nb.kind === 'cardio') {
        next = { id: nb.cardio.demo, name: nb.cardio.name, line: `${nb.cardio.minutes} min`, beat: nb.cardio.details[0] };
      }
      if (!nb) return; // last set of the session: no rest needed
    }
    setRest({ endsAt: Date.now() + slot.rest * 1000, total: slot.rest, next, logged: { exerciseId: ex.id, idx: info.s, rir: info.set.rir, label: `${ex.short}, set ${info.s + 1}` } });
  }, [session, block, blocks, cursor, prSeen]);

  if (!session || !day || !block) {
    return (
      <div className="gutter mx-auto grid min-h-screen max-w-md place-items-center text-center">
        <div>
          <Label>No session running</Label>
          <h1 className="display mt-3 text-[56px]">Nothing to log</h1>
          <Button variant="primary" className="mt-6" onClick={() => navigate('/')}>Go to Today</Button>
        </div>
      </div>
    );
  }
  const done = setsDone(session), total = setsTotal(session);
  const blockDone = (b: Block) => b.kind === 'cardio' ? session.cardioDone.includes(b.cardio.id) : logsOf(b, session).every((l) => l.sets.every((x) => x.done));
  const finish = () => { const s = finishSession(); setFinishOpen(false); navigate(s ? `/summary/${encodeURIComponent(s.id)}` : '/'); };

  return (
    <div className="min-h-screen pb-[calc(140px+var(--safe-b))] lg:pb-[calc(40px+var(--safe-b))]">
      {/* while resting, the page steps aside so the ceiling shows through the rest overlay */}
      <div className={rest ? 'invisible' : undefined}>
      <header className="sticky top-0 z-40 bg-gradient-to-b from-void via-void/95 to-void/0 pb-3 pt-[var(--safe-t)]">
        <div className="gutter mx-auto flex h-16 max-w-6xl items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-ash hover:bg-white/5 hover:text-chalk" aria-label="Leave session (progress is kept)">
            <Icon name="close" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="display truncate text-[26px] leading-none">{day.title}</p>
            <p className="mt-1 text-xs text-smoke"><span className="sr-only">Elapsed </span>{mmss((now - session.startedAt) / 1000)} · {done} of {total} sets</p>
          </div>
          <Ring value={total ? done / total : 0} size={44} stroke={4} tone="chalk" label={`${done} of ${total} sets done`} />
          <Button variant="secondary" className="h-11 px-4" onClick={() => setFinishOpen(true)}>Finish</Button>
        </div>
        <nav aria-label="Exercises" className="gutter mx-auto flex max-w-6xl gap-1.5">
          {blocks.map((b, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-current={i === cursor ? 'step' : undefined} aria-label={`${i + 1}. ${blockName(b)}${blockDone(b) ? ', done' : ''}`}
              className="group flex h-6 flex-1 items-center">
              <span className={`h-1.5 w-full rounded-full transition-colors ${i === cursor ? 'bg-chalk' : blockDone(b) ? 'bg-chalk/45' : 'bg-white/10 group-hover:bg-white/20'}`} />
            </button>
          ))}
        </nav>
      </header>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={cursor} custom={dir}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40 * dir }}
          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          drag={reduce ? false : 'x'} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} dragDirectionLock dragSnapToOrigin
          onDragEnd={(_, info) => { if (info.offset.x < -90 || info.velocity.x < -600) go(cursor + 1); else if (info.offset.x > 90 || info.velocity.x > 600) go(cursor - 1); }}
          className="gutter mx-auto max-w-6xl touch-pan-y pt-1 lg:pt-6"
        >
          {block.kind === 'cardio'
            ? <CardioPanel c={block.cardio} session={session} />
            : <StrengthPanel block={block} session={session} index={cursor} total={blocks.length} onLogged={onLogged} covered={!!rest || !!pr} onAdvance={() => (cursor + 1 < blocks.length ? go(cursor + 1) : setFinishOpen(true))} />}
          <div className="mt-10 flex items-center justify-between gap-3">
            <Button variant="ghost" icon="chevL" disabled={cursor === 0} onClick={() => go(cursor - 1)}>Previous</Button>
            <span className="hidden items-center gap-2 text-sm text-smoke sm:flex"><Icon name="swipe" size={18} />Swipe or use arrow keys</span>
            {cursor < blocks.length - 1
              ? <Button variant="ghost" onClick={() => go(cursor + 1)}>Next<Icon name="chevR" size={20} /></Button>
              : <Button variant="ghost" icon="flag" onClick={() => setFinishOpen(true)}>Finish</Button>}
          </div>
          <button type="button" onClick={() => setQuit(true)} className="mx-auto mt-4 block h-11 px-4 text-sm text-smoke underline-offset-4 hover:text-chalk hover:underline">Discard session</button>
        </motion.div>
      </AnimatePresence>

      </div>
      <AnimatePresence>
        {rest && <RestScreen rest={rest} onChange={setRest} onEnd={() => setRest(null)} onRir={(v) => updateSet(rest.logged.exerciseId, rest.logged.idx, { rir: v })} />}
      </AnimatePresence>
      <AnimatePresence>{pr && <PRMoment pr={pr} onDone={() => setPr(null)} />}</AnimatePresence>

      <Sheet open={finishOpen} onClose={() => setFinishOpen(false)} title="Finish session">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[6px] p-4 lit-raised"><Label>Sets</Label><p className="display mt-1 text-[40px] leading-none">{done}<span className="text-smoke">/{total}</span></p></div>
            <div className="rounded-[6px] p-4 lit-raised"><Label>Time</Label><p className="display mt-1 text-[40px] leading-none">{Math.round((now - session.startedAt) / 60000)}<span className="text-xl text-smoke"> min</span></p></div>
          </div>
          {done < total && <p className="text-ash">{total - done} sets not logged. They won't count toward progression.</p>}
          <Button variant="primary" size="lg" icon="check" className="w-full" onClick={finish}>Save session</Button>
          <Button variant="ghost" className="w-full" onClick={() => setFinishOpen(false)}>Keep going</Button>
        </div>
      </Sheet>
      <Sheet open={quit} onClose={() => setQuit(false)} title="Discard session?">
        <p className="text-ash">Nothing from this session will be saved.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={() => setQuit(false)}>Keep going</Button>
          <Button variant="danger" onClick={() => { discardSession(); navigate('/'); }}>Discard</Button>
        </div>
      </Sheet>
    </div>
  );
}
