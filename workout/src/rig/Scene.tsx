import { memo, useId } from 'react';
import type { Tempo } from '../data/types';
import { type Grad, type Prim, buildPrims } from './render';
import { solve } from './solve';
import { buildTimeline, poseAt } from './timeline';
import type { DemoSpec, Pose } from './types';

export interface Look {
  /** target physique stage 0..3 */
  stage?: number;
  /** breathing phase -1..1 */
  breath?: number;
}

export function primsFor(demo: DemoSpec, pose: Pose, look: Look = {}) {
  return buildPrims(
    { solved: solve(pose), props: demo.props, hold: demo.hold, extra: pose.extra, stage: look.stage, breath: look.breath },
    { yaw: demo.camera.yaw, pitch: demo.camera.pitch ?? 8 },
  );
}

const vbCache = new Map<string, [number, number, number, number]>();

/** A fixed viewBox that contains every frame of the loop (so the camera never jumps). */
export function demoViewBox(demo: DemoSpec, aspect = 4 / 3, pad = 1): [number, number, number, number] {
  const key = `${demo.id}:${aspect}:${pad}`;
  const hit = vbCache.get(key);
  if (hit) return hit;
  const tl = buildTimeline(demo);
  const total = demo.procedural ? demo.procedural.period : tl.total;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (let i = 0; i < 24; i++) {
    const prims = primsFor(demo, poseAt(demo, tl, (i / 24) * total).pose, { stage: 3 });
    for (const p of prims) {
      if (p.nb) continue;
      a = Math.min(a, p.bbox[0]); b = Math.min(b, p.bbox[1]); c = Math.max(c, p.bbox[2]); d = Math.max(d, p.bbox[3]);
    }
  }
  const padX = (c - a) * 0.06 * pad, padY = (d - b) * 0.08 * pad;
  a -= padX; c += padX; b -= padY; d += padY * 0.7;
  let w = c - a, h = d - b;
  if (w / h < aspect) { const nw = h * aspect; a -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; b -= (nh - h) * 0.62; h = nh; }
  const vb: [number, number, number, number] = [a, b, w, h];
  vbCache.set(key, vb);
  return vb;
}

function GradEl({ id, g }: { id: string; g: Grad }) {
  const stops = g.stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />);
  return g.kind === 'linear'
    ? <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>{stops}</linearGradient>
    : <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={g.cx} cy={g.cy} r={g.r}>{stops}</radialGradient>;
}

/** The lit gym the athlete stands in: slat wall, rubber floor, one work light, haze, cool rim glow. */
function Stage({ uid, vb }: { uid: string; vb: [number, number, number, number] }) {
  const [x0, y0, w0, h0] = vb;
  const x = x0 - w0, y = y0 - h0 * 0.5, w = w0 * 3, h = h0 * 2;
  const cx = x + w / 2;
  const floorH = Math.max(1, y + h);
  const slats = Array.from({ length: 102 }, (_, i) => x + (i + 0.5) * (w / 102));
  const seams = [0.06, 0.16, 0.32, 0.56, 0.9].map((k) => k * floorH);
  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}wall`} x1="0" y1={y} x2="0" y2={0} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#09090B" />
          <stop offset="1" stopColor="#1A1714" />
        </linearGradient>
        <linearGradient id={`${uid}floor`} x1="0" y1={0} x2="0" y2={y + h} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1B1816" />
          <stop offset="1" stopColor="#08080A" />
        </linearGradient>
        <radialGradient id={`${uid}slatmask`} cx={cx} cy={y0 + h0 * 0.42} r={w0 * 0.55} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={`${uid}m`}><rect x={x} y={y} width={w} height={h} fill={`url(#${uid}slatmask)`} /></mask>
        <linearGradient id={`${uid}cone`} x1="0" y1={y0} x2="0" y2={0} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF9A5C" stopOpacity="0.20" />
          <stop offset="1" stopColor="#FF7A3C" stopOpacity="0.03" />
        </linearGradient>
        <radialGradient id={`${uid}pool`} cx={cx} cy={floorH * 0.18} r={w0 * 0.36} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF7A3C" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FF7A3C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}rim`} cx={x0 + w0 * 0.78} cy={y0 + h0 * 0.3} r={w0 * 0.45} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6FA0FF" stopOpacity="0.16" />
          <stop offset="1" stopColor="#6FA0FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}vig`} cx={cx} cy={y0 + h0 * 0.48} r={Math.max(w0, h0) * 0.75} gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.62" />
        </radialGradient>
      </defs>
      <rect x={x} y={y} width={w} height={Math.max(0, -y)} fill={`url(#${uid}wall)`} />
      <g mask={`url(#${uid}m)`} stroke="#FFD9BF" strokeOpacity="0.07" strokeWidth={w / 102 * 0.12}>
        {slats.map((sx) => <line key={sx} x1={sx} x2={sx} y1={y} y2={0} />)}
      </g>
      <rect x={x} y={0} width={w} height={floorH} fill={`url(#${uid}floor)`} />
      {seams.map((sy) => <line key={sy} x1={x} x2={x + w} y1={sy} y2={sy} stroke="#ffffff" strokeOpacity="0.035" strokeWidth="0.5" />)}
      <line x1={x} x2={x + w} y1={0} y2={0} stroke="#FFC9A6" strokeOpacity="0.10" strokeWidth="0.6" />
      <ellipse cx={cx} cy={floorH * 0.18} rx={w0 * 0.36} ry={Math.max(4, (y0 + h0) * 0.5)} fill={`url(#${uid}pool)`} />
      <polygon points={`${cx - w0 * 0.05},${y0} ${cx + w0 * 0.05},${y0} ${cx + w0 * 0.3},0 ${cx - w0 * 0.3},0`} fill={`url(#${uid}cone)`} />
      <rect x={x} y={y} width={w} height={h} fill={`url(#${uid}rim)`} />
    </g>
  );
}

export const SceneSVG = memo(function SceneSVG({ prims, viewBox, title, className, stage = true }:
  { prims: Prim[]; viewBox: [number, number, number, number]; title?: string; className?: string; stage?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const [x, y, w, h] = viewBox;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} preserveAspectRatio="xMidYMid meet" overflow="hidden">
      {title && <title>{title}</title>}
      {stage && <Stage uid={uid} vb={viewBox} />}
      <defs>
        {prims.map((p, i) => (
          <g key={i}>
            {p.fillGrad && <GradEl id={`${uid}f${i}`} g={p.fillGrad} />}
            {p.strokeGrad && <GradEl id={`${uid}s${i}`} g={p.strokeGrad} />}
          </g>
        ))}
      </defs>
      {prims.map((p, i) => (
        <path
          key={i} d={p.path}
          fill={p.fillGrad ? `url(#${uid}f${i})` : p.fill ?? 'none'}
          stroke={p.strokeGrad ? `url(#${uid}s${i})` : p.stroke}
          strokeWidth={p.sw} strokeLinejoin="round" strokeLinecap={p.cap} opacity={p.op} strokeDasharray={p.dash}
        />
      ))}
      {stage && <rect x={x - w} y={y - h} width={w * 3} height={h * 3} fill={`url(#${uid}vig)`} pointerEvents="none" />}
    </svg>
  );
});

export function staticPrims(demo: DemoSpec, which: 0 | 1, tempo?: Tempo, look: Look = {}) {
  if (demo.procedural) {
    const tl = buildTimeline(demo, tempo);
    return primsFor(demo, poseAt(demo, tl, which ? demo.procedural.period / 2 : 0).pose, look);
  }
  return primsFor(demo, demo.poses[demo.keyframes[which]], look);
}
