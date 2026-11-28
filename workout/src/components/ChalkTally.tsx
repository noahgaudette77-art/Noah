// Streak: chalk tally marks on slate, drawn stroke by stroke. Every fifth crosses the four.
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cue } from '../lib/audio';

const SEEN = 'tempo.tally.seen';

export function ChalkTally({ count, longest }: { count: number; longest: number }) {
  const reduce = useReducedMotion();
  const shown = Math.min(count, 60);
  const [from, setFrom] = useState(shown);
  const played = useRef(false);
  useEffect(() => {
    let seen = 0;
    try { seen = Number(localStorage.getItem(SEEN) ?? '0'); } catch { /* ignore */ }
    // draw the new strokes (all of them on a first visit, capped so it never takes long)
    setFrom(reduce ? shown : Math.max(0, Math.min(seen, shown), shown - 20));
    try { localStorage.setItem(SEEN, String(shown)); } catch { /* ignore */ }
  }, [shown, reduce]);
  const groups = Math.ceil(shown / 5);
  const W = 46, H = 52;
  const strokes: { d: string; i: number }[] = [];
  for (let g = 0; g < groups; g++) {
    for (let k = 0; k < 5; k++) {
      const i = g * 5 + k;
      if (i >= shown) break;
      const x0 = g * W + 6;
      const wob = ((i * 37) % 7) - 3;
      const d = k < 4
        ? `M${x0 + k * 8 + wob * 0.3} ${8 + (wob % 2)} q ${1 + wob * 0.2} ${H / 2 - 8} ${-1 + wob * 0.3} ${H - 16}`
        : `M${x0 - 4} ${H - 14} L ${x0 + 32} ${12 + wob}`;
      strokes.push({ d, i });
    }
  }
  const delay = (i: number) => (i < from ? 0 : (i - from) * 0.12);
  useEffect(() => {
    if (played.current || shown <= from) return;
    played.current = true;
    const fifth = [...Array(shown - from)].map((_, j) => from + j).filter((i) => i % 5 === 4);
    fifth.forEach((i) => setTimeout(() => cue('chalk'), (delay(i) + 0.1) * 1000));
  }, [from, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="slate rounded-[6px] p-4" role="img" aria-label={`${count}-day streak, longest ${longest}`}>
      <div className="flex items-baseline justify-between">
        <p className="label text-ash">Streak</p>
        <p className="typed text-[13px] text-ash">longest {longest}</p>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <p className="display text-[56px] leading-none text-chalk">{count}</p>
        {shown > 0 ? (
          <svg viewBox={`0 0 ${Math.max(1, groups) * W} ${H}`} className="h-[52px] max-w-full" style={{ width: Math.max(1, groups) * W }} aria-hidden="true">
            {strokes.map(({ d, i }) => (
              <path key={i} d={d} fill="none" stroke="rgba(244,239,228,0.9)" strokeWidth="3.2" strokeLinecap="round" pathLength={1}
                className="chalk-stroke" style={{ strokeDasharray: 1, strokeDashoffset: i < from ? 0 : 1, animation: i < from ? undefined : `chalk-draw 0.11s ${delay(i)}s ease-out forwards` }} />
            ))}
          </svg>
        ) : <p className="typed text-sm text-ash">The first mark goes up after your next session.</p>}
      </div>
    </div>
  );
}
