export function Mark({ size = 28 }: { size?: number }) {
  // three bars: 3 s down, 1 s up — the program's tempo
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#D7FF3C" />
      <rect x="7" y="8" width="18" height="4" rx="2" fill="#10140A" />
      <rect x="14" y="14" width="4" height="11" rx="2" fill="#10140A" />
      <rect x="20" y="18.5" width="5" height="3" rx="1.5" fill="#10140A" opacity=".55" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark />
      <span className="display text-[26px] tracking-[0.02em]">Tempo</span>
    </span>
  );
}
