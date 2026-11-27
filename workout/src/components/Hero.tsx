import { useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEMOS } from '../rig/demos';
import { usePhysique } from '../rig/DemoPlayer';
import { buildPrims } from '../rig/render';
import { SceneSVG } from '../rig/Scene';
import { solve } from '../rig/solve';
import type { Pose } from '../rig/types';

const IDLE: Pose = DEMOS.lateralRaise.poses.bottom;
const CAM = { yaw: 26, pitch: 5 };

/** The athlete standing in the light: breathing, a small weight shift, dumbbells at the sides. */
export function HeroAthlete({ hold = true, className = '' }: { hold?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const stage = usePhysique();
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0, last = 0;
    const loop = (now: number) => {
      if (now - last > 33) { setT(now / 1000); last = now; } // 30 fps is plenty for breathing
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);
  const breath = reduce ? 0 : Math.sin((2 * Math.PI * t) / 4.2);
  const sway = reduce ? 0 : Math.sin((2 * Math.PI * t) / 5.5);
  const pose: Pose = { ...IDLE, pelvis: [IDLE.pelvis[0], IDLE.pelvis[1] - 0.3 * (0.5 + 0.5 * breath), IDLE.pelvis[2] + 0.6 * sway] };
  const prims = useMemo(() => buildPrims({ solved: solve(pose), props: [], hold: hold ? 'pair' : 'none', stage, breath }, CAM),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breath, sway, stage, hold]);
  const vb = useMemo<[number, number, number, number]>(() => {
    const ps = buildPrims({ solved: solve(IDLE), props: [], hold: 'pair', stage: 3 }, CAM).filter((p) => !p.nb);
    const a = Math.min(...ps.map((p) => p.bbox[0])), b = Math.min(...ps.map((p) => p.bbox[1]));
    const c = Math.max(...ps.map((p) => p.bbox[2])), d = Math.max(...ps.map((p) => p.bbox[3]));
    const h = (d - b) * 1.04, w = h * 0.62;
    return [(a + c) / 2 - w / 2, b - (d - b) * 0.02, w, h];
  }, []);
  return <SceneSVG prims={prims} viewBox={vb} stage={false} className={className} />;
}

/** Full-bleed lit gym: looping haze clip (poster under reduced motion or Save-Data). */
export function HeroMedia({ children, className = '' }: { children?: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const saveData = typeof navigator !== 'undefined' && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return (
    <div className={`relative overflow-hidden bg-void ${className}`}>
      {reduce || saveData ? (
        <img src="media/haze-poster.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster="media/haze-poster.webp" aria-hidden="true" tabIndex={-1}>
          <source src="media/haze.webm" type="video/webm" />
          <source src="media/haze.mp4" type="video/mp4" />
        </video>
      )}
      {children}
    </div>
  );
}
