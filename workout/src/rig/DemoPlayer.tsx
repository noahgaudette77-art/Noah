import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import type { Tempo } from '../data/types';
import { physiqueStage } from '../logic/motivation';
import { useStore } from '../logic/store';
import { today } from '../lib/today';
import { DEMOS } from './demos';
import { SceneSVG, demoViewBox, primsFor, staticPrims } from './Scene';
import { buildTimeline, liven, poseAt } from './timeline';

export const TOGGLE_EVENT = 'tempo:toggle-demo';

/** Target physique stage from logged weight (0..3). */
export function usePhysique() {
  const body = useStore((s) => s.body);
  return useMemo(() => physiqueStage(body, today()), [body]);
}

interface Props {
  id: string;
  name: string;
  tempo?: Tempo;
  /** change to restart the loop from the top (e.g. when a set row is tapped) */
  replayToken?: number;
  aspect?: number;
  view?: string;
  /** listen for the global K shortcut */
  primary?: boolean;
  className?: string;
  /** 'full' shows the control bar; 'none' is a bare loop (previews, hero) */
  controls?: 'full' | 'none';
  /** frame the athlete tighter (1) or looser (>1) */
  pad?: number;
  /** stop animating while covered by a full-screen layer */
  suspended?: boolean;
}

export function DemoPlayer({ id, name, tempo, replayToken, aspect = 4 / 3, view, primary, className = '', controls = 'full', pad = 1, suspended }: Props) {
  const demo = DEMOS[id];
  const reduced = useReducedMotion();
  const stage = usePhysique();
  const tl = useMemo(() => buildTimeline(demo, tempo), [demo, tempo?.down, tempo?.up, tempo?.top, tempo?.bottom]);
  const vb = useMemo(() => demoViewBox(demo, aspect, pad), [demo, aspect, pad]);
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  const [time, setTime] = useState(0);
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (replayToken === undefined) return;
    setTime(0);
    setPlaying(true);
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
    if (reduced || !playing || !visible || suspended) return;
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
  }, [reduced, playing, visible, slow, suspended]);

  const frame = poseAt(demo, tl, time);
  const alive = liven(demo, frame.pose, time);
  const prims = useMemo(() => primsFor(demo, alive.pose, { stage, breath: alive.breath }), [demo, alive.pose, alive.breath, stage]);
  const lowering = frame.phase?.role === 'down';

  if (reduced) {
    const half = demoViewBox(demo, Math.max(0.8, aspect / 2), pad);
    return (
      <div className={`relative flex flex-col overflow-hidden rounded-[24px] bg-void ${className}`} ref={box}>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-black">
          {[0, 1].map((i) => (
            <figure key={i} className="relative min-h-0">
              <SceneSVG prims={staticPrims(demo, i as 0 | 1, tempo, { stage })} viewBox={half} className="block h-full w-full" title={`${name}: ${i ? 'end' : 'start'} position`} />
              <figcaption className="label absolute left-3 top-3 text-ash">{i ? 'End' : 'Start'}</figcaption>
            </figure>
          ))}
        </div>
        <p className="border-t border-white/5 px-4 py-2.5 text-[13px] text-ash">
          Motion reduced: start and end positions. Tempo {tl.phases.map((p) => p.label).filter((l, i, a) => /\d/.test(l) && a.indexOf(l) === i).join(', ') || demo.procedural?.label}.
        </p>
      </div>
    );
  }

  return (
    <div ref={box} className={`relative overflow-hidden bg-void ${className}`}>
      <SceneSVG prims={prims} viewBox={vb} className="block h-full w-full" title={`${name} demonstration, looping`} />
      {controls === 'full' && (
        <>
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2" aria-hidden="true">
            <span className={`flex items-baseline gap-2 leading-none ${lowering ? 'text-ember' : 'text-chalk'}`}>
              <span className="display text-[30px]">{frame.label.replace(/\s[\d.]+s$/, '')}</span>
              {/[\d.]+s$/.test(frame.label) && <span className="text-[15px] font-semibold">{frame.label.match(/([\d.]+)s$/)![1]} sec</span>}
            </span>
            <span className="h-[3px] w-28 overflow-hidden rounded-full bg-white/10">
              <span className={`block h-full rounded-full ${lowering ? 'bg-ember' : 'bg-chalk/80'}`} style={{ width: `${Math.round(frame.phaseProgress * 100)}%` }} />
            </span>
          </div>
          {view && <span className="label pointer-events-none absolute right-4 top-4 text-smoke">{view}</span>}
          <div className="absolute bottom-3 right-3 flex gap-1.5 rounded-full p-1 glass">
            <button type="button" onClick={() => setSlow((s) => !s)} aria-pressed={slow} aria-label="0.5x speed"
              className={`h-11 min-w-[3.25rem] rounded-full px-3 text-[13px] font-semibold transition ${slow ? 'bg-chalk text-void' : 'text-chalk hover:bg-white/10'}`}>
              0.5x
            </button>
            <button type="button" onClick={() => { setTime(0); setPlaying(true); }} aria-label="Replay from the start" className="grid h-11 w-11 place-items-center rounded-full text-chalk transition hover:bg-white/10">
              <Icon name="replay" size={20} />
            </button>
            <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause demo' : 'Play demo'} aria-keyshortcuts={primary ? 'k' : undefined}
              className="grid h-11 w-11 place-items-center rounded-full bg-chalk text-void transition hover:bg-white">
              <Icon name={playing ? 'pause' : 'play'} size={18} weight="fill" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
