import { memo } from 'react';
import type { Tempo } from '../data/types';
import { type Prim, buildPrims } from './render';
import { solve } from './solve';
import { buildTimeline, poseAt } from './timeline';
import type { DemoSpec, Pose } from './types';

export function primsFor(demo: DemoSpec, pose: Pose) {
  return buildPrims({ solved: solve(pose), props: demo.props, hold: demo.hold, extra: pose.extra }, { yaw: demo.camera.yaw, pitch: demo.camera.pitch ?? 8 });
}

const vbCache = new Map<string, [number, number, number, number]>();

/** A fixed viewBox that contains every frame of the loop (so the camera never jumps). */
export function demoViewBox(demo: DemoSpec, aspect = 4 / 3): [number, number, number, number] {
  const key = demo.id + aspect;
  const hit = vbCache.get(key);
  if (hit) return hit;
  const tl = buildTimeline(demo);
  const total = demo.procedural ? demo.procedural.period : tl.total;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (let i = 0; i < 24; i++) {
    const prims = primsFor(demo, poseAt(demo, tl, (i / 24) * total).pose);
    for (const p of prims) {
      if (p.op !== undefined && p.op < 0.5) continue; // ignore soft shadows
      a = Math.min(a, p.bbox[0]); b = Math.min(b, p.bbox[1]); c = Math.max(c, p.bbox[2]); d = Math.max(d, p.bbox[3]);
    }
  }
  const padX = (c - a) * 0.07, padY = (d - b) * 0.09;
  a -= padX; c += padX; b -= padY; d += padY * 0.6;
  let w = c - a, h = d - b;
  if (w / h < aspect) { const nw = h * aspect; a -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; b -= (nh - h) * 0.6; h = nh; }
  const vb: [number, number, number, number] = [a, b, w, h];
  vbCache.set(key, vb);
  return vb;
}

export const SceneSVG = memo(function SceneSVG({ prims, viewBox, title, className }: { prims: Prim[]; viewBox: [number, number, number, number]; title?: string; className?: string }) {
  const [x, y, w, h] = viewBox;
  const floorY = 0;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} className={className} role="img" aria-label={title} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="floorfade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={x} y={floorY} width={w} height={Math.max(0, y + h - floorY)} fill="url(#floorfade)" />
      <line x1={x} x2={x + w} y1={floorY} y2={floorY} stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.6" />
      {prims.map((p, i) => (
        <path
          key={i} d={p.path} fill={p.fill ?? 'none'} stroke={p.stroke} strokeWidth={p.sw}
          strokeLinejoin="round" strokeLinecap={p.cap} opacity={p.op}
        />
      ))}
    </svg>
  );
});

export function staticPrims(demo: DemoSpec, which: 0 | 1, tempo?: Tempo) {
  if (demo.procedural) {
    const tl = buildTimeline(demo, tempo);
    return primsFor(demo, poseAt(demo, tl, which ? demo.procedural.period / 2 : 0).pose);
  }
  return primsFor(demo, demo.poses[demo.keyframes[which]]);
}
