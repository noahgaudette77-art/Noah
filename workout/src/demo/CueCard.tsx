// The form-cue card: a typed print pinned to the wall with the tempo ring. Shown whenever a MuscleWiki
// video can't be: Worker not deployed yet, offline, the month's call cap reached, or an error.
import type { ReactNode } from 'react';
import { EXERCISES } from '../data/program';
import type { Tempo } from '../data/types';
import { Stamp } from '../components/iron';
import { MiniTempo } from './MiniTempo';

/** compact = the workout screen: the title is already the page heading, so the card keeps to two cues and a small ring. */
export function CueCard({ id, tempo, note, compact, children }: { id: string; tempo?: Tempo; note?: string; compact?: boolean; children?: ReactNode }) {
  const ex = EXERCISES[id];
  const t = tempo ?? { down: 3, bottom: 0, up: 1, top: 0 };
  const cues = ex.cues.filter((c) => !c.priority).slice(0, compact ? 2 : 4);
  const spine = ex.cues.find((c) => c.priority);
  return (
    <div className={`print tape relative px-5 ${compact ? 'pb-3 pt-4' : 'pb-5 pt-6'}`} role="group" aria-label={`${ex.name}: form cues`}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="label">Form card · {ex.view}</p>
          {!compact && <p className="display mt-1.5 text-[30px] text-ink">{ex.name}</p>}
          {compact && (
            <ol className="typed mt-2 space-y-1 text-[14px] leading-snug text-ink">
              {cues.map((c, i) => <li key={c.text} className="flex gap-2"><span className="w-3.5 shrink-0 text-ink-faded">{i + 1}.</span><span>{c.text}</span></li>)}
            </ol>
          )}
        </div>
        <MiniTempo tempo={t} size={compact ? 64 : 88} />
      </div>
      {!compact && <ol className="typed mt-3 space-y-1.5 text-[15px] leading-snug text-ink">
        {cues.map((c, i) => <li key={c.text} className="flex gap-2.5"><span className="w-4 shrink-0 text-ink-faded">{i + 1}.</span><span>{c.text}</span></li>)}
      </ol>}
      {spine && !compact && <p className="typed mt-3 border-t border-dashed border-ink/25 pt-2.5 text-[14px] leading-snug text-ink-faded">{spine.text}</p>}
      {note && (
        <div className={`${compact ? 'mt-2' : 'mt-4'} flex items-center gap-3`}>
          <Stamp size={compact ? 15 : 20} angle={-4} color="var(--stamp)">No film</Stamp>
          <p className="typed text-[13px] text-ink-faded">{note}</p>
        </div>
      )}
      {children}
    </div>
  );
}
