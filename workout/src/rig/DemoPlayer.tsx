import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import type { Tempo } from '../data/types';
import { DEMOS } from './demos';
import { SceneSVG, demoViewBox, primsFor, staticPrims } from './Scene';
import { buildTimeline, poseAt } from './timeline';

export const TOGGLE_EVENT = 'tempo:toggle-demo';

interface Props {
  id: string;
  name: string;
  tempo?: Tempo;
  /** change this value to restart the loop from the top (e.g. when a set row is tapped) */
  replayToken?: number;
  aspect?: number;
  view?: string;
  /** listen for the global K shortcut */
  primary?: boolean;
  className?: string;
}

export function DemoPlayer({ id, name, tempo, replayToken, aspect = 4 / 3, view, primary, className = '' }: Props) {
  const demo = DEMOS[id];
  const reduced = useReducedMotion();
  const tl = useMemo(() => buildTimeline(demo, tempo), [demo, tempo?.down, tempo?.up, tempo?.top, tempo?.bottom]);
  const vb = useMemo(() => demoViewBox(demo, aspect), [demo, aspect]);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [time, setTime] = useState(0);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const flash = useRef(0);
  const [replayFlash, setReplayFlash] = useState(0);

  // restart on replay requests
  useEffect(() => {
    if (replayToken === undefined) return;
    setTime(0);
    setPlaying(true);
    flash.current += 1;
    setReplayFlash(flash.current);
  }, [replayToken]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!primary) return;
    const h = () => setPlaying((p) => !p);
    window.addEventListener(TOGGLE_EVENT, h);
    return () => window.removeEventListener(TOGGLE_EVENT, h);
  }, [primary]);

  useEffect(() => {
    if (reduced || !playing || !visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) setTime((t) => t + dt * (slow ? 0.5 : 1));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, playing, visible, slow]);

  const frame = poseAt(demo, tl, time);
  const prims = useMemo(() => primsFor(demo, frame.pose), [demo, frame.pose]);
  const lowering = frame.phase?.role === 'down';

  if (reduced) {
    const labels = demo.procedural ? ['Stride', 'Stride'] : demo.keyframes.map((k) => k.replace(/\d/g, ''));
    return (
      <div className={`stage-bg relative overflow-hidden rounded-2xl ${className}`} ref={box}>
        <div className="grid grid-cols-2 gap-px">
          {[0, 1].map((i) => (
            <figure key={i} className="relative">
              <SceneSVG prims={staticPrims(demo, i as 0 | 1, tempo)} viewBox={vb} className="block w-full" title={`${name}: ${i ? 'end' : 'start'} position`} />
              <figcaption className="eyebrow absolute left-3 top-3 text-bone-2">{i ? 'End' : 'Start'} · {labels[i]}</figcaption>
            </figure>
          ))}
        </div>
        <p className="num border-t border-white/5 px-3 py-2 text-[11px] text-bone-3">
          Motion reduced: showing start and end positions. Tempo: {tl.phases.map((p) => p.label).filter((l, i, a) => a.indexOf(l) === i).join(' · ') || demo.procedural?.label}
        </p>
      </div>
    );
  }

  return (
    <div ref={box} className={`stage-bg group relative overflow-hidden rounded-2xl ${className}`}>
      <SceneSVG prims={prims} viewBox={vb} className="block w-full" title={`${name} demonstration, looping`} />
      {/* phase label */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5" aria-hidden="true">
        <span
          key={frame.label + replayFlash}
          className={`num inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold tracking-wide transition-colors ${lowering ? 'bg-volt text-volt-ink' : 'bg-black/55 text-bone backdrop-blur'}`}
        >
          {frame.label}
        </span>
        <span className="h-[3px] w-24 overflow-hidden rounded-full bg-white/10">
          <span className={`block h-full rounded-full ${lowering ? 'bg-volt' : 'bg-bone-2'}`} style={{ width: `${Math.round(frame.phaseProgress * 100)}%` }} />
        </span>
      </div>
      {view && <span className="eyebrow pointer-events-none absolute right-3 top-3.5 text-bone-3">{view}</span>}
      <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
        <button
          type="button" onClick={() => setSlow((s) => !s)} aria-pressed={slow} aria-label="Half speed"
          className={`num h-11 min-w-[3rem] rounded-full px-3 text-[13px] font-semibold backdrop-blur transition ${slow ? 'bg-volt text-volt-ink' : 'bg-black/55 text-bone hover:bg-black/70'}`}
        >
          0.5x
        </button>
        <button
          type="button" onClick={() => { setTime(0); setPlaying(true); }} aria-label="Replay from the start"
          className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-bone backdrop-blur transition hover:bg-black/70"
        >
          <Icon name="replay" size={20} />
        </button>
        <button
          type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause demo' : 'Play demo'} aria-keyshortcuts={primary ? 'k' : undefined}
          className="grid h-11 w-11 place-items-center rounded-full bg-bone text-ink-950 transition hover:bg-white"
        >
          <Icon name={playing ? 'pause' : 'play'} size={18} />
        </button>
      </div>
    </div>
  );
}
