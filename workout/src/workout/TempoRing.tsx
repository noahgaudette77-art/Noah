import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Tempo } from '../data/types';
import { buzz, play } from '../lib/sfx';

type Phase = { key: 'down' | 'bottom' | 'up' | 'top'; word: string; sec: number };

export function phasesFor(t: Tempo): Phase[] {
  return ([
    { key: 'down', word: 'Lower', sec: t.down },
    { key: 'bottom', word: 'Pause', sec: t.bottom },
    { key: 'up', word: 'Drive', sec: t.up },
    { key: 'top', word: 'Reset', sec: Math.max(t.top, 0.6) },
  ] as Phase[]).filter((p) => p.sec > 0);
}

/**
 * Paces every rep on the program tempo: big ring, phase word, seconds left, rep count. Ticks and haptics
 * on phase changes. The ring sweep is written straight to the DOM each frame; React only re-renders
 * when the phase, the second or the rep changes.
 */
export function TempoRing({ tempo, size = 300 }: { tempo: Tempo; size?: number }) {
  const phases = phasesFor(tempo);
  const cycle = phases.reduce((a, p) => a + p.sec, 0);
  const [state, setState] = useState({ rep: 1, idx: 0, sec: Math.ceil(phases[0].sec) });
  const arc = useRef<SVGCircleElement>(null);
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let last = { rep: 0, idx: -1, sec: -1 };
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      const rep = Math.floor(t / cycle) + 1;
      let within = t % cycle, idx = 0;
      for (let i = 0; i < phases.length; i++) { if (within < phases[i].sec) { idx = i; break; } within -= phases[i].sec; }
      const ph = phases[idx];
      const sec = Math.ceil(Math.max(0, ph.sec - within) - 1e-6);
      if (arc.current) arc.current.style.strokeDashoffset = String(c * (within / ph.sec));
      if (rep !== last.rep || idx !== last.idx || sec !== last.sec) {
        const phaseChanged = rep !== last.rep || idx !== last.idx;
        if (phaseChanged && ph.key === 'down') { play('tick-low'); buzz(14); }
        else if (phaseChanged && ph.key === 'up') { play('tick-high'); buzz([10, 40, 10]); }
        else if (!phaseChanged && ph.key === 'down') play('tick-low');
        last = { rep, idx, sec };
        setState(last);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cycle, c]); // eslint-disable-line react-hooks/exhaustive-deps

  const ph = phases[state.idx];
  const lowering = ph.key === 'down' || ph.key === 'bottom';
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="timer" aria-label={`Rep ${state.rep}, ${ph.word}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true" style={{ filter: lowering ? 'drop-shadow(0 0 22px rgba(255,91,31,0.35))' : undefined }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth="14" fill="none" />
        <circle ref={arc} cx={size / 2} cy={size / 2} r={r} stroke={lowering ? '#FF5B1F' : '#F3EFE8'} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={c} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.p key={ph.key + state.rep} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`display text-[56px] leading-none ${lowering ? 'text-ember' : 'text-chalk'}`}>{ph.word}</motion.p>
          <p className="display mt-1 h-[96px] text-[96px] leading-none text-chalk">{ph.key === 'down' || ph.key === 'up' ? state.sec : ''}</p>
          <p className="label mt-1">Rep {state.rep}</p>
        </div>
      </div>
    </div>
  );
}
