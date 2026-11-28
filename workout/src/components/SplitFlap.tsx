// Mechanical split-flap digits (rest countdown, session clock). Each changed digit flips once.
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

function Flap({ ch, size }: { ch: string; size: number }) {
  const reduce = useReducedMotion();
  const [cur, setCur] = useState(ch);
  const [prev, setPrev] = useState(ch);
  const [flip, setFlip] = useState(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (ch === cur) return;
    setPrev(cur); setCur(ch); setFlip((f) => f + 1);
  }, [ch]); // eslint-disable-line react-hooks/exhaustive-deps
  const w = size * 0.62, h = size * 1.12;
  const face = (c: string, half: 'top' | 'bottom', extra = '') => (
    <div className={`flap-half ${half} ${extra}`} style={{ height: h / 2 }}>
      <span style={{ fontSize: size, lineHeight: `${h}px`, height: h, top: half === 'top' ? 0 : -h / 2 }}>{c}</span>
    </div>
  );
  if (ch === ':' || ch === ' ') return <span className="display px-[0.04em] text-chalk" style={{ fontSize: size * 0.8, lineHeight: `${h}px` }}>{ch}</span>;
  return (
    <span className="flap relative inline-block" style={{ width: w, height: h }} aria-hidden="true">
      {face(cur, 'top', 'static')}
      {face(reduce ? cur : prev, 'bottom', 'static')}
      {!reduce && flip > 0 && (
        <span key={flip} className="absolute inset-0">
          {face(prev, 'top', 'fold-top')}
          {face(cur, 'bottom', 'fold-bottom')}
        </span>
      )}
      {!reduce && flip > 0 && <span key={`b${flip}`} className="absolute inset-x-0 bottom-0" style={{ height: h / 2 }}>{face(cur, 'bottom', 'static settle')}</span>}
      <span className="flap-axle" />
    </span>
  );
}

export function SplitFlap({ value, size = 96, label }: { value: string; size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-[4px]" role="timer" aria-label={label ?? value}>
      {value.split('').map((c, i) => <Flap key={i} ch={c} size={size} />)}
    </span>
  );
}
