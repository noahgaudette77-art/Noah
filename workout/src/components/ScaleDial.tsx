// Weigh-in: an analog bathroom-scale dial. The needle sweeps (damped spring) to today's number; a faded
// second needle marks the 7-day average. The dial is decoration: the number itself is printed big below.
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

export function ScaleDial({ value, avg, size = 280 }: { value: number; avg: number | null; size?: number }) {
  const reduce = useReducedMotion();
  const center = Math.round(avg ?? value);
  const lo = center - 12, hi = center + 12; // a 24 lb window around where you are
  const ang = (v: number) => -120 + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * 240;
  const spring = useSpring(ang(lo), { stiffness: 70, damping: 9, mass: 0.9 });
  useEffect(() => { if (reduce) spring.jump(ang(value)); else spring.set(ang(value)); }, [value, lo]); // eslint-disable-line react-hooks/exhaustive-deps
  const rot = useTransform(spring, (a) => `rotate(${a}deg)`);
  const c = size / 2, r = size / 2 - 10;
  const ticks = [];
  for (let v = lo; v <= hi; v++) {
    const a = ((ang(v) - 90) * Math.PI) / 180;
    const major = v % 5 === 0;
    const r1 = r - (major ? 22 : 12);
    ticks.push(<line key={v} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * (r - 4)} y2={c + Math.sin(a) * (r - 4)} stroke="var(--ink)" strokeWidth={major ? 3 : 1.4} />);
    if (major) ticks.push(<text key={`t${v}`} x={c + Math.cos(a) * (r - 40)} y={c + Math.sin(a) * (r - 40) + 6} textAnchor="middle" fontFamily="'Big Shoulders Display Variable', sans-serif" fontWeight={800} fontSize={20} fill="var(--ink)">{v}</text>);
  }
  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 0.78 }} role="img" aria-label={`Scale dial at ${value.toFixed(1)} lb${avg ? `, 7-day average ${avg.toFixed(1)} lb` : ''}`}>
      <svg width={size} height={size * 0.78} viewBox={`0 0 ${size} ${size * 0.78}`} aria-hidden="true" className="overflow-visible">
        <defs>
          <radialGradient id="dialface" cx="50%" cy="40%" r="65%"><stop offset="0" stopColor="#f3ead4" /><stop offset="1" stopColor="#d9ccaa" /></radialGradient>
        </defs>
        <circle cx={c} cy={c} r={r + 8} fill="#2a2622" stroke="#5a5048" strokeWidth={2} />
        <circle cx={c} cy={c} r={r} fill="url(#dialface)" />
        {ticks}
        {avg != null && (
          <g transform={`rotate(${ang(avg)} ${c} ${c})`} opacity={0.4}>
            <line x1={c} y1={c + 10} x2={c} y2={c - r + 26} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" />
          </g>
        )}
        <motion.g style={{ transform: rot, transformOrigin: `${c}px ${c}px` }}>
          <line x1={c} y1={c + 16} x2={c} y2={c - r + 14} stroke="var(--stamp)" strokeWidth={3.5} strokeLinecap="round" />
        </motion.g>
        <circle cx={c} cy={c} r={9} fill="#2a2622" />
      </svg>
      {avg != null && <p className="typed absolute inset-x-0 bottom-1 text-center text-[13px] text-ash">faded needle: 7-day average {avg.toFixed(1)}</p>}
    </div>
  );
}
