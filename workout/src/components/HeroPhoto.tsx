// A still film photograph of the gym, pinned to the wall as a print. No people, no animation.
import type { ReactNode } from 'react';

export function HeroPhoto({ name, className = '', alt, children }: { name: 'photo80-hero' | 'photo80-rest' | 'photo80-complete'; className?: string; alt: string; children?: ReactNode }) {
  return (
    <div className={`print relative overflow-hidden p-2 ${className}`}>
      <div className="relative h-full w-full overflow-hidden bg-[#120f0c]">
        <picture>
          <source srcSet={`assets/art/${name}.avif`} type="image/avif" />
          <img src={`assets/art/${name}.webp`} alt={alt} className="absolute inset-0 h-full w-full object-cover" decoding="async" />
        </picture>
        {children}
      </div>
    </div>
  );
}
