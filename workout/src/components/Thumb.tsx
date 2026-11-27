import { memo } from 'react';
import { DEMOS } from '../rig/demos';
import { SceneSVG, demoViewBox, staticPrims } from '../rig/Scene';

/** Static poster frame of a demo (end position) on its lit stage. */
export const Thumb = memo(function Thumb({ id, size = 72, which = 1, stage = 0 }: { id: string; size?: number; which?: 0 | 1; stage?: number }) {
  const demo = DEMOS[id];
  if (!demo) return null;
  return (
    <div className="shrink-0 overflow-hidden rounded-2xl bg-void shadow-lit" style={{ width: size, height: size }}>
      <SceneSVG prims={staticPrims(demo, which, undefined, { stage })} viewBox={demoViewBox(demo, 1, 0.8)} className="h-full w-full" />
    </div>
  );
});
