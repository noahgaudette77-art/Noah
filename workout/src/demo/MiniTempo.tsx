// A chalk-drawn tempo ring for the form-cue card: 3 s lowering, 1 s lift (plus any programmed pauses).
// Pure CSS animation, so it costs nothing while the card is on screen; static under reduced motion.
import type { Tempo } from '../data/types';

export function MiniTempo({ tempo, size = 92, ink = 'var(--ink)' }: { tempo: Tempo; size?: number; ink?: string }) {
  const parts = [
    { k: 'down', s: tempo.down, label: 'Lower' },
    { k: 'bottom', s: tempo.bottom, label: 'Hold' },
    { k: 'up', s: tempo.up, label: 'Lift' },
    { k: 'top', s: tempo.top, label: 'Hold' },
  ].filter((p) => p.s > 0);
  const total = parts.reduce((a, p) => a + p.s, 0);
  const r = size / 2 - 7, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Tempo: ${parts.map((p) => `${p.label.toLowerCase()} ${p.s} s`).join(', ')}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {parts.map((p) => {
          const len = (p.s / total) * c - 3;
          const off = -(acc / total) * c;
          acc += p.s;
          return <circle key={p.k} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ink} strokeOpacity={p.k === 'down' ? 0.9 : 0.45} strokeWidth={p.k === 'down' ? 5 : 3} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={off} strokeLinecap="round" />;
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--stamp)" strokeWidth={5} strokeDasharray={`3 ${c - 3}`} strokeLinecap="round" className="mini-tempo-dot" style={{ animation: `mini-tempo ${total}s linear infinite`, ['--c' as string]: `${c}px` }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="display text-[26px] leading-none" style={{ color: ink }}>{parts.map((p) => p.s).join('·')}</p>
          <p className="typed text-[11px] uppercase" style={{ color: ink, opacity: 0.7 }}>sec</p>
        </div>
      </div>
      <style>{`@keyframes mini-tempo { from { stroke-dashoffset: 0; } to { stroke-dashoffset: calc(-1 * var(--c)); } }`}</style>
    </div>
  );
}
