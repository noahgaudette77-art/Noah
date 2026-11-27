import { motion, useReducedMotion } from 'framer-motion';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'secondary', icon, children, className = '', size = 'md', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; size?: 'md' | 'lg' }) {
  const v = {
    primary: 'bg-volt text-volt-ink hover:bg-[#e2ff6b] active:bg-volt-dim',
    secondary: 'bg-ink-700 text-bone hover:bg-ink-600',
    ghost: 'bg-transparent text-bone-2 hover:bg-white/5 hover:text-bone',
    danger: 'bg-[#3a1a14] text-[#ffb39a] hover:bg-[#4a2118]',
  }[variant];
  const s = size === 'lg' ? 'h-16 px-7 text-lg' : 'h-12 px-5 text-[15px]';
  return (
    <button type="button" className={`inline-flex select-none items-center justify-center gap-2.5 rounded-2xl font-semibold transition-colors disabled:opacity-40 ${s} ${v} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'lg' ? 24 : 20} />}
      {children}
    </button>
  );
}

export function Card({ children, className = '', as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <As className={`rounded-[22px] border border-white/[0.06] bg-ink-900 ${className}`}>{children}</As>;
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

export function Ring({ value, size = 56, stroke = 5, children, label, track = 'rgba(255,255,255,0.09)', color = '#D7FF3C' }:
  { value: number; size?: number; stroke?: number; children?: ReactNode; label?: string; track?: string; color?: string }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - v) }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 22 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Stepper({ value, onChange, step, min = 0, max = 999, unit, label, wide }:
  { value: number; onChange: (v: number) => void; step: number; min?: number; max?: number; unit?: string; label: string; wide?: boolean }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="flex items-center rounded-2xl bg-ink-800" role="group" aria-label={label}>
      <button type="button" className="grid h-14 w-11 place-items-center rounded-l-2xl text-bone-2 hover:text-bone active:bg-white/5" onClick={() => onChange(clamp(+(value - step).toFixed(1)))} aria-label={`Decrease ${label}`}>
        <Icon name="minus" size={18} />
      </button>
      <label className={`flex flex-col items-center ${wide ? 'w-[4.5rem]' : 'w-10'}`}>
        <span className="sr-only">{label}</span>
        <input
          inputMode="decimal" value={value} aria-label={label}
          onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n)) onChange(clamp(n)); }}
          onFocus={(e) => e.currentTarget.select()}
          className="num w-full bg-transparent text-center text-xl font-semibold text-bone outline-none"
        />
        {unit && <span className="num -mt-0.5 text-[10px] uppercase tracking-widest text-bone-3">{unit}</span>}
      </label>
      <button type="button" className="grid h-14 w-11 place-items-center rounded-r-2xl text-bone-2 hover:text-bone active:bg-white/5" onClick={() => onChange(clamp(+(value + step).toFixed(1)))} aria-label={`Increase ${label}`}>
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, detail }: { checked: boolean; onChange: (v: boolean) => void; label: string; detail?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-[56px] w-full items-center justify-between gap-4 rounded-2xl px-1 text-left">
      <span>
        <span className="block font-semibold">{label}</span>
        {detail && <span className="block text-sm text-bone-3">{detail}</span>}
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-volt' : 'bg-ink-600'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full transition-all ${checked ? 'left-7 bg-volt-ink' : 'left-1 bg-bone-2'}`} />
      </span>
    </button>
  );
}

/** Modal dialog with focus trap-lite: focuses itself, Esc closes, restores focus. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/10 bg-ink-850 p-6 pb-[calc(1.5rem+var(--safe-b))] outline-none sm:rounded-[28px]"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="display text-3xl">{title}</h2>
          <button type="button" onClick={onClose} className="-mr-2 -mt-1 grid h-11 w-11 place-items-center rounded-full text-bone-2 hover:bg-white/5" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function Stat({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="num mt-1 text-2xl font-semibold text-bone">{value}{unit && <span className="ml-1 text-sm font-normal text-bone-3">{unit}</span>}</p>
    </div>
  );
}
