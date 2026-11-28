// The MuscleWiki demo, mounted on a paper print. DESIGN.md §3 "Video print".
//
// Quota rules (1,000 calls a month, the Worker caps at 900):
//  - nothing is requested until the print is on screen (IntersectionObserver); no preloading;
//  - front angle first, side only when toggled;
//  - paused when scrolled away or covered, resumes from the browser's own buffer.
// MuscleWiki terms: the video is shown as delivered. Tape sits on the paper mount, outside the frame,
// so their mark (bottom-left) is never covered; the "vintage grade" is a light CSS filter only.
import { useEffect, useRef, useState } from 'react';
import { MW } from '../data/musclewiki';
import type { Tempo } from '../data/types';
import { useStore } from '../logic/store';
import { type MwMeta, getMeta, lastReason, mwLive, playSrc, reportStreamUse, useOnline } from '../lib/mw';
import { CueCard } from './CueCard';

type State = 'idle' | 'loading' | 'ready' | 'error' | 'offline' | 'fallback';

export function VideoPrint({ id, tempo, suspended, compact, onFilm }: { id: string; tempo?: Tempo; suspended?: boolean; compact?: boolean; onFilm?: (showing: boolean) => void }) {
  const map = MW[id];
  const online = useOnline();
  const rawVideo = useStore((s) => s.settings.rawVideo);
  const clean = useStore((s) => s.settings.clean);
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  const [angle, setAngle] = useState<'front' | 'side'>('front');
  const [meta, setMeta] = useState<MwMeta | null>(null);
  const [src, setSrc] = useState<Record<string, string>>({});
  const [state, setState] = useState<State>('idle');
  const [paused, setPaused] = useState(false);
  const [slow, setSlow] = useState(false);
  const [grade, setGrade] = useState(!rawVideo);
  useEffect(() => setGrade(!rawVideo), [rawVideo]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { setVisible(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // fetch metadata + a playable src only once the print has been on screen, and only for the chosen angle
  useEffect(() => {
    if (!map || !seen || !mwLive()) return;
    if (!online) { setState('offline'); return; }
    if (src[angle]) return;
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const m = meta ?? (await getMeta(map.mwId));
        if (cancelled) return;
        if (!m) { setState('fallback'); return; }
        setMeta(m);
        const s = await playSrc(m, angle);
        if (cancelled) return;
        if (!s) { setState('fallback'); return; }
        setSrc((x) => ({ ...x, [angle]: s }));
      } catch {
        if (!cancelled) setState(navigator.onLine ? 'error' : 'offline');
      }
    })();
    return () => { cancelled = true; };
  }, [map, seen, angle, online]); // eslint-disable-line react-hooks/exhaustive-deps

  // play only while visible, not covered, not paused by the user
  useEffect(() => {
    const v = vid.current;
    if (!v || state !== 'ready') return;
    v.playbackRate = slow ? 0.5 : 1;
    if (visible && !suspended && !paused) void v.play().catch(() => undefined);
    else v.pause();
  }, [visible, suspended, paused, slow, state, angle]);

  const current = src[angle];
  const film = !!map && mwLive() && !['fallback', 'offline', 'error'].includes(state);
  useEffect(() => { onFilm?.(film); }, [film]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!film) {
    const note = !map ? undefined
      : !mwLive() ? 'Demo film arrives when the demo service is switched on.'
      : state === 'offline' ? 'Offline. The demo needs a connection; the cues work anywhere.'
      : state === 'fallback' && lastReason === 'setup' ? 'Demo film arrives when the demo service is switched on.'
      : state === 'fallback' && lastReason === 'cap' ? "This month's demo allowance is used up. Back on the 1st."
      : state === 'fallback' ? 'The demo is not available right now. Cues below.'
      : 'The demo would not load. Cues below.';
    return (
      <div ref={box}>
        <CueCard id={id} tempo={tempo} note={note} compact={compact} />
        {state === 'error' && <button type="button" className="mt-2 h-11 px-3 text-sm font-semibold text-ash underline underline-offset-4" onClick={() => { setSrc({}); setState('idle'); setSeen(false); setTimeout(() => setSeen(true), 0); }}>Try the demo again</button>}
      </div>
    );
  }

  return (
    <div ref={box} className="print tape p-2.5 pb-3" role="group" aria-label={`${meta?.name ?? map.mwName} demo video`}>
      <div className="relative overflow-hidden rounded-[1px] bg-[#1a1714]" style={{ aspectRatio: '16 / 9' }}>
        {current ? (
          <video
            key={angle}
            ref={vid}
            src={current}
            muted loop playsInline preload="none"
            disablePictureInPicture controlsList="nodownload noplaybackrate noremoteplayback"
            onContextMenu={(e) => e.preventDefault()}
            onLoadedData={() => { setState('ready'); reportStreamUse(current); }}
            onError={() => setState(navigator.onLine ? 'error' : 'offline')}
            className="h-full w-full object-contain"
            style={{ filter: grade && !clean ? 'sepia(0.08) contrast(1.04) saturate(0.92) brightness(0.98)' : undefined }}
          />
        ) : null}
        {state !== 'ready' && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="typed animate-pulse text-sm text-ash">{state === 'loading' ? 'Threading the film…' : 'Demo loads when you get here'}</p>
          </div>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
        <p className="typed min-w-0 truncate text-[13px] text-ink-faded" title="Exercise data and videos provided by MuscleWiki.com">
          {meta?.name ?? map.mwName}{map.match === 'close' ? ' · close variant' : ''}
        </p>
        <div className="flex shrink-0 gap-1" role="toolbar" aria-label="Demo controls">
          <Seg on={angle === 'front'} onClick={() => setAngle('front')}>Front</Seg>
          <Seg on={angle === 'side'} onClick={() => setAngle('side')}>Side</Seg>
          <Seg on={paused} onClick={() => setPaused((p) => !p)} label={paused ? 'Play' : 'Pause'}>{paused ? '▶' : '❚❚'}</Seg>
          <Seg on={slow} onClick={() => setSlow((s) => !s)} label="Half speed">0.5×</Seg>
          <Seg on={!grade} onClick={() => setGrade((g) => !g)} label="Raw footage (no grade)">Raw</Seg>
        </div>
      </div>
    </div>
  );
}

function Seg({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label}
      className={`grid h-11 min-w-[40px] place-items-center rounded-[3px] px-2 text-[12px] font-bold uppercase tracking-wider transition ${on ? 'bg-ink text-cream' : 'text-ink hover:bg-ink/10'}`}>
      {children}
    </button>
  );
}
