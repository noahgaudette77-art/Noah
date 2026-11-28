// A 5 s fal.ai film loop (16mm look) pinned on the wall as a print. Plays only while on screen;
// a still under reduced motion, data saver or Save-Data. Never the exercise demo (that is MuscleWiki).
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../logic/store';

export function HeroLoop({ name, className = '', alt = '', frame = true, children }: { name: 'loop-hero' | 'loop-rest' | 'loop-complete'; className?: string; alt?: string; frame?: boolean; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  const dataSaver = useStore((s) => s.settings.dataSaver);
  const saveData = typeof navigator !== 'undefined' && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const still = reduce || dataSaver || saveData;
  const v = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || still || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [still]);
  useEffect(() => {
    const el = v.current;
    if (!el) return;
    if (on && !document.hidden) void el.play().catch(() => undefined); else el.pause();
  }, [on]);
  const poster = `assets/art/${name}.webp`;
  return (
    <div ref={box} className={`relative overflow-hidden ${frame ? 'print p-2' : ''} ${className}`}>
      <div className="relative h-full w-full overflow-hidden bg-[#120f0c]">
        {still ? (
          <img src={poster} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "60% 38%" }} />
        ) : (
          <video ref={v} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "60% 38%" }} muted loop playsInline preload="none" poster={poster} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} tabIndex={-1}>
            <source src={`assets/art/${name}.webm`} type="video/webm" />
            <source src={`assets/art/${name}.mp4`} type="video/mp4" />
          </video>
        )}
        {children}
      </div>
    </div>
  );
}
