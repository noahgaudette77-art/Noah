import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useId, useRef } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'secondary', icon, children, className = '', size = 'md', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; size?: 'md' | 'lg' | 'xl' }) {
  const v = {
    primary: 'ember-btn',
    secondary: 'lit-raised text-chalk hover:brightness-110',
    ghost: 'bg-transparent text-ash hover:bg-white/[0.04] hover:text-chalk',
    danger: 'bg-[#2A140E] text-[#FFB59A] hover:bg-[#341a12] shadow-lit',
  }[variant];
  const s = { md: 'h-12 px-5 text-[15px] rounded-[6px]', lg: 'h-16 px-7 text-[17px] rounded-[6px]', xl: 'h-[72px] px-8 text-lg rounded-[6px]' }[size];
  return (
    <button type="button" className={`inline-flex select-none items-center justify-center gap-2.5 font-semibold tracking-[0.01em] transition duration-150 ease-snap disabled:opacity-40 ${s} ${v} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'md' ? 20 : 24} />}
      {children}
    </button>
  );
}

export function Card({ children, className = '', as: As = 'section', raised }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; raised?: boolean }) {
  return <As className={`${raised ? 'lit-raised' : 'lit'} ${className}`}>{children}</As>;
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`label ${className}`}>{children}</p>;
}

/** Numerals in the display face with fixed digit slots, so counting timers never jitter. */
export function Num({ value, className = '', slot = 0.56 }: { value: string | number; className?: string; slot?: number }) {
  const s = String(value);
  return (
    <span className={`display inline-flex items-baseline ${className}`}>
      <span className="sr-only">{s}</span>
      {s.split('').map((c, i) => (
        <span key={i} aria-hidden="true" className="inline-block text-center" style={/\d/.test(c) ? { width: `${slot}em` } : undefined}>{c}</span>
      ))}
    </span>
  );
}

/** Progress ring: gradient stroke that sweeps with a slight settle. */
export function Ring({ value, size = 56, stroke = 5, children, label, tone = 'ember', glow }:
  { value: number; size?: number; stroke?: number; children?: ReactNode; label?: string; tone?: 'ember' | 'chalk' | 'rim'; glow?: boolean }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const stops = { ember: ['#FF8A7A', '#EF5A4A'], chalk: ['#FFFFFF', '#CFC9C0'], rim: ['#E8DFCF', '#A39C90'] }[tone];
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role={label ? 'img' : undefined} aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true" style={glow && v > 0 ? { filter: `drop-shadow(0 0 ${stroke * 1.6}px ${tone === 'ember' ? 'rgba(239,90,74,0.45)' : 'rgba(255,255,255,0.18)'})` } : undefined}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={stops[0]} /><stop offset="1" stopColor={stops[1]} /></linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - v) }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 140, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Stepper({ value, onChange, step, min = 0, max = 999, unit, label, size = 'md' }:
  { value: number; onChange: (v: number) => void; step: number; min?: number; max?: number; unit?: string; label: string; size?: 'md' | 'xl' }) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const big = size === 'xl';
  if (big) {
    return (
      <div className="flex flex-col items-center" role="group" aria-label={label}>
        <label className="flex w-full flex-col items-center">
          <input
            inputMode="decimal" value={value} aria-label={label}
            onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n)) onChange(clamp(n)); }}
            onFocus={(e) => e.currentTarget.select()}
            className="display w-full bg-transparent text-center text-[76px] leading-[0.95] text-chalk outline-none sm:text-[88px]"
          />
          {unit && <span className="label -mt-1">{unit}</span>}
        </label>
        <div className="mt-2 flex gap-3">
          <button type="button" className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-full bg-white/[0.06] text-ash shadow-lit transition hover:text-chalk active:scale-95" onClick={() => onChange(clamp(+(value - step).toFixed(2)))} aria-label={`Decrease ${label}`}><Icon name="minus" size={22} /></button>
          <button type="button" className="grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-full bg-white/[0.06] text-ash shadow-lit transition hover:text-chalk active:scale-95" onClick={() => onChange(clamp(+(value + step).toFixed(2)))} aria-label={`Increase ${label}`}><Icon name="plus" size={22} /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-1" role="group" aria-label={label}>
      <button type="button" className={`grid shrink-0 place-items-center rounded-full bg-white/[0.06] text-ash shadow-lit transition hover:text-chalk active:scale-95 ${big ? 'h-14 w-14' : 'h-12 w-12'}`} onClick={() => onChange(clamp(+(value - step).toFixed(2)))} aria-label={`Decrease ${label}`}>
        <Icon name="minus" size={big ? 22 : 18} />
      </button>
      <label className="flex min-w-0 flex-1 flex-col items-center">
        <input
          inputMode="decimal" value={value} aria-label={label}
          onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); if (!Number.isNaN(n)) onChange(clamp(n)); }}
          onFocus={(e) => e.currentTarget.select()}
          className={`display w-full bg-transparent text-center text-chalk outline-none ${big ? 'text-[84px] leading-[0.9]' : 'text-[40px] leading-none'}`}
        />
        {unit && <span className="label -mt-0.5">{unit}</span>}
      </label>
      <button type="button" className={`grid shrink-0 place-items-center rounded-full bg-white/[0.06] text-ash shadow-lit transition hover:text-chalk active:scale-95 ${big ? 'h-14 w-14' : 'h-12 w-12'}`} onClick={() => onChange(clamp(+(value + step).toFixed(2)))} aria-label={`Increase ${label}`}>
        <Icon name="plus" size={big ? 22 : 18} />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, detail, icon }: { checked: boolean; onChange: (v: boolean) => void; label: string; detail?: string; icon?: IconName }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-[64px] w-full items-center justify-between gap-4 py-2 text-left">
      <span className="flex items-center gap-3">
        {icon && <span className="grid h-10 w-10 place-items-center rounded-[6px] bg-white/[0.05] text-ash"><Icon name={icon} size={20} /></span>}
        <span>
          <span className="block font-semibold">{label}</span>
          {detail && <span className="block text-sm text-smoke">{detail}</span>}
        </span>
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? 'bg-chalk' : 'bg-slate'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full shadow transition-all ${checked ? 'left-7 bg-void' : 'left-1 bg-smoke'}`} />
      </span>
    </button>
  );
}

/** Modal dialog: focuses itself, traps Tab, Esc closes, restores focus. */
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
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
            initial={reduce ? { opacity: 0 } : { y: 48, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={reduce ? { opacity: 0 } : { y: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-gradient-to-b from-[#1E1E22] to-[#141417] p-6 pb-[calc(24px+var(--safe-b))] shadow-float outline-none sm:rounded-[6px]"
          >
            <div className="mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 className="display text-[40px]">{title}</h2>
              <button type="button" onClick={onClose} className="-mr-2 -mt-1 grid h-11 w-11 place-items-center rounded-full text-ash hover:bg-white/5" aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Stat({ label, value, unit, className = '' }: { label: string; value: ReactNode; unit?: string; className?: string }) {
  return (
    <div className={className}>
      <p className="label">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1"><span className="display text-[34px] leading-none text-chalk">{value}</span>{unit && <span className="text-sm text-smoke">{unit}</span>}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[6px] bg-white/[0.04] ${className}`} aria-hidden="true" />;
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body: string; action?: ReactNode }) {
  return (
    <Card className="grid place-items-center px-6 py-12 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-[6px] bg-white/[0.05] text-ash shadow-lit"><Icon name={icon} size={28} /></span>
      <p className="display mt-5 text-[36px]">{title}</p>
      <p className="mt-2 max-w-xs text-ash">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}
