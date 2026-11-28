// IRON ROOM primitives: prints on the wall, Dymo labels, rubber stamps. DESIGN.md §3.
import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

/** A paper print pinned to the wall with masking tape. Never rotated when it holds editable numbers. */
export function Print({ children, className = '', tilt = 0, tape = true, as: As = 'section', style }: { children: ReactNode; className?: string; tilt?: number; tape?: boolean; as?: 'section' | 'div' | 'article'; style?: CSSProperties }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { rotate: tilt - 1.4, y: -6, opacity: 0 }}
      animate={{ rotate: tilt, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 14, mass: 0.8 }}
      style={{ transformOrigin: '50% 0%', ...style }}
      className={className}
    >
      <As className={`print ${tape ? 'tape' : ''} h-full`}>{children}</As>
    </motion.div>
  );
}

export function Dymo({ children, tone, className = '' }: { children: ReactNode; tone?: 'amber'; className?: string }) {
  return <span className={`dymo ${tone ?? ''} ${className}`}>{children}</span>;
}

/** Rubber stamp. `land` animates the thud (scale down onto the paper). */
export function Stamp({ children, color = 'var(--stamp)', angle = -8, size = 44, land, className = '' }: { children: ReactNode; color?: string; angle?: number; size?: number; land?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className={`stamp ${className}`}
      style={{ color, fontSize: size, rotate: angle }}
      initial={land && !reduce ? { scale: 1.6, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 0.92 }}
      transition={land && !reduce ? { type: 'spring', stiffness: 900, damping: 26, mass: 0.6 } : { duration: 0 }}
    >
      {children}
    </motion.span>
  );
}

/** Big 1980s gym lettering with the triple stripe under it. Decorative: pair it with a real heading. */
export function WallText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true">
      <p className={`wallpaint uppercase ${className}`}>{children}</p>
      <div className="stripes mt-2 w-[min(70%,320px)]" />
    </div>
  );
}
