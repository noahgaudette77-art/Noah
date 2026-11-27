import { useId } from 'react';

/** Tempo mark: three bars = 3 s down, the 1 s drive, the reset. */
export function Mark({ size = 30 }: { size?: number }) {
  const id = `tm${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF7A3A" /><stop offset="1" stopColor="#E8480F" /></linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id})`} />
      <rect x="7" y="8" width="18" height="4" rx="2" fill="#170700" />
      <rect x="14" y="14" width="4" height="11" rx="2" fill="#170700" />
      <rect x="20" y="18.5" width="5" height="3" rx="1.5" fill="#170700" opacity=".5" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark />
      <span className="display text-[28px] tracking-[0.04em]">Tempo</span>
    </span>
  );
}
