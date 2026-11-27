// A transparent box the room canvas draws a 3D prop into (rusted plate, dumbbell, kettlebell).
import { useEffect, useRef } from 'react';
import { type PropKind, addView, removeView } from './state';

export function PropBox({ kind, lit = true, spin = 0.5, className = '', label }: { kind: PropKind; lit?: boolean; spin?: number; className?: string; label?: string }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const id = addView({ el: el.current, kind, lit, spin });
    return () => removeView(id);
  }, [kind, lit, spin]);
  return <div ref={el} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
