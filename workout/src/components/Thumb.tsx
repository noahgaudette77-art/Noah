import { memo } from 'react';
import { Icon } from './Icon';

/** A stencilled station number on a small iron plate (replaces the old mannequin thumbnails). */
export const Thumb = memo(function Thumb({ n, cardio, size = 56 }: { n?: number | string; cardio?: 'bike' | 'treadmill' | string; size?: number }) {
  return (
    <div aria-hidden="true" className="grid shrink-0 place-items-center rounded-[6px] lit-raised" style={{ width: size, height: size }}>
      {cardio ? <Icon name={cardio === 'bike' ? 'bike' : 'walk'} size={size * 0.42} className="text-ash" />
        : <span className="stencil text-amber" style={{ fontSize: size * 0.56 }}>{n}</span>}
    </div>
  );
});
