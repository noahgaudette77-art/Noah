// Progress: milestone plates hung on the steel mesh wall. 3D cast-iron plates (Tripo) drawn by the room
// canvas into each slot; earned = lit by the lamp, upcoming = dim. Numbers are HTML, never baked in.
import { useMemo } from 'react';
import { fmtShort } from '../logic/dates';
import { milestones } from '../logic/motivation';
import { useStore } from '../logic/store';
import { PropBox } from '../room/PropBox';

export function MilestonePlates({ date }: { date: string }) {
  const body = useStore((s) => s.body);
  const m = useMemo(() => milestones(body, date), [body, date]);
  return (
    <section className="relative overflow-hidden rounded-[6px] p-4 shadow-lit" aria-label="Milestone plates">
      {/* the steel mesh wall itself is drawn by the room canvas, so the plates can hang in front of it */}
      <PropBox kind="meshwall" className="absolute inset-0 -z-0" />
      <div className="relative">
      <div className="flex items-end justify-between">
        <h2 className="display text-[28px]">Milestone plates</h2>
        <p className="typed text-sm text-ash">{m.list.filter((x) => x.reached).length} of {m.list.length} earned</p>
      </div>
      <ol className="mt-3 grid grid-cols-4 gap-2">
        {m.list.map((x, i) => (
          <li key={x.bf} className="relative flex flex-col items-center">
            <span className="hook" aria-hidden="true" />
            <PropBox kind="plate" lit={x.reached} spin={0.25 + i * 0.05} className="aspect-square w-full" />
            <p className={`stencil mt-1 text-[26px] ${x.reached ? 'text-amber' : 'text-concrete'}`}>{x.bf}%</p>
            <p className="typed text-center text-[12px] leading-tight text-ash">{x.reached ? 'earned' : `${fmtShort(x.date)}`}<br />{x.weight.toFixed(0)} lb</p>
          </li>
        ))}
      </ol>
      </div>
    </section>
  );
}
