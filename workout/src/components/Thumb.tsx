import { memo } from 'react';
import { DEMOS } from '../rig/demos';
import { SceneSVG, demoViewBox, staticPrims } from '../rig/Scene';

/** Static poster frame of a demo (end position), used in lists. */
export const Thumb = memo(function Thumb({ id, size = 64, which = 1 }: { id: string; size?: number; which?: 0 | 1 }) {
  const demo = DEMOS[id];
  if (!demo) return null;
  return (
    <div className="stage-bg shrink-0 overflow-hidden rounded-xl" style={{ width: size, height: size }}>
      <SceneSVG prims={staticPrims(demo, which)} viewBox={demoViewBox(demo, 1)} className="h-full w-full" />
    </div>
  );
});
