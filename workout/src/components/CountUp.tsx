import { animate, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/** Rolls a number up from zero once, then holds. */
export function CountUp({ to, decimals = 0, duration = 1.1 }: { to: number; decimals?: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) { setV(to); return; }
    const c = animate(0, to, { duration, ease: [0.2, 0.9, 0.25, 1], onUpdate: setV });
    return () => c.stop();
  }, [to, duration, reduce]);
  return <>{v.toFixed(decimals)}</>;
}
