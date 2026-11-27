// Turns a solved pose + props into depth-sorted, lit SVG primitives.
// Lighting model: warm key light from the upper left, cool rim light from behind/right.
// Every limb gets a fill gradient across its width (lit edge -> base -> shadow) and an outline whose
// shadow side glows with the rim colour. Joint maths lives in solve.ts and is untouched by styling.
import { BODY } from './skeleton';
import { type Solved } from './solve';
import type { Hold, Prop, Side } from './types';
import { type M3, type V3, DEG, add, apply, cross, dot, mul, norm, rotY, sub } from './vec';

export interface Camera {
  yaw: number;
  pitch: number;
}
export type Stop = [number, string, number?];
export type Grad =
  | { kind: 'linear'; x1: number; y1: number; x2: number; y2: number; stops: Stop[] }
  | { kind: 'radial'; cx: number; cy: number; r: number; stops: Stop[] };
export interface Prim {
  d: number; // depth (bigger = nearer)
  path: string;
  fill?: string;
  fillGrad?: Grad;
  stroke?: string;
  strokeGrad?: Grad;
  sw?: number;
  op?: number;
  cap?: 'round';
  dash?: string;
  /** excluded from camera framing (soft shadows, glows) */
  nb?: boolean;
  bbox: [number, number, number, number];
}

// ---------- palette ----------
export const PALETTE = {
  skin: { lit: '#E6BCA0', base: '#A9785B', shade: '#4A2F22' },
  skinFar: { lit: '#B08A73', base: '#7C5642', shade: '#33201A' },
  tank: { lit: '#4A4D55', base: '#2B2D33', shade: '#141518' },
  tankFar: { lit: '#34363C', base: '#1F2024', shade: '#0E0F11' },
  shorts: { lit: '#34363C', base: '#1A1B1F', shade: '#0B0B0D' },
  hair: '#141210',
  shoe: { lit: '#3A3D44', base: '#1C1E22', shade: '#0B0C0E' },
  midsole: '#D9D3C9',
  ember: '#FF5B1F',
  outline: '#08080A',
  rim: '#9CC0FF',
  metal: { lit: '#6B727C', base: '#272A30', shade: '#0C0D10', spec: '#C9D0D9' },
  chrome: { lit: '#F1F3F6', base: '#9AA1AB', shade: '#3A3E45' },
  pad: { lit: '#4A4C53', base: '#2A2B30', shade: '#141518' },
  frame: { lit: '#4A4D54', base: '#1F2024', shade: '#0B0B0D' },
};
const LIGHT: [number, number] = [-0.55, -0.83]; // screen-space direction toward the key light (y down)

// ---------- projection ----------
export function projector(cam: Camera) {
  const cy = Math.cos(cam.yaw * DEG), sy = Math.sin(cam.yaw * DEG);
  const cp = Math.cos(cam.pitch * DEG), sp = Math.sin(cam.pitch * DEG);
  const toward: V3 = [sy * cp, sp, cy * cp];
  const P = (p: V3): [number, number, number] => {
    const sx = p[0] * cy - p[2] * sy;
    const d0 = p[0] * sy + p[2] * cy;
    const up = p[1] * cp - d0 * sp;
    const depth = d0 * cp + p[1] * sp;
    return [sx, -up, depth];
  };
  return { P, toward };
}
type Proj = ReturnType<typeof projector>;

const f = (n: number) => (Math.round(n * 10) / 10).toString();

function bboxOf(pts: [number, number][], pad = 0): Prim['bbox'] {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [x, y] of pts) {
    a = Math.min(a, x - pad); b = Math.min(b, y - pad); c = Math.max(c, x + pad); d = Math.max(d, y + pad);
  }
  return [a, b, c, d];
}
const polyPath = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';

function hull(points: [number, number][]): [number, number][] {
  const pts = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  if (pts.length < 3) return pts;
  const cr = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
const circlePts = (cx: number, cy: number, r: number, n = 20): [number, number][] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)] as [number, number]);

function capsulePath(ax: number, ay: number, ra: number, bx: number, by: number, rb: number) {
  const dx = bx - ax, dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (d < Math.abs(ra - rb) + 0.01) {
    const [cx, cy, r] = ra > rb ? [ax, ay, ra] : [bx, by, rb];
    return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  }
  const th = Math.atan2(dy, dx);
  const ph = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)));
  const p = (cx: number, cy: number, r: number, a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  const bigB = 2 * ph > Math.PI ? 1 : 0;
  const bigA = 2 * Math.PI - 2 * ph > Math.PI ? 1 : 0;
  return `M${p(ax, ay, ra, th + ph)}L${p(bx, by, rb, th + ph)}A${f(rb)} ${f(rb)} 0 ${bigB} 0 ${p(bx, by, rb, th - ph)}L${p(ax, ay, ra, th - ph)}A${f(ra)} ${f(ra)} 0 ${bigA} 0 ${p(ax, ay, ra, th + ph)}Z`;
}

interface Tone { lit: string; base: string; shade: string }
/** Fill + rim-stroke gradients across a shape, oriented toward the key light. */
function shading(cx: number, cy: number, half: number, dirx: number, diry: number, t: Tone, rim = 0.75): { fillGrad: Grad; strokeGrad: Grad } {
  const x1 = cx + dirx * half, y1 = cy + diry * half, x2 = cx - dirx * half, y2 = cy - diry * half;
  return {
    fillGrad: { kind: 'linear', x1, y1, x2, y2, stops: [[0, t.lit], [0.38, t.base], [1, t.shade]] },
    strokeGrad: { kind: 'linear', x1, y1, x2, y2, stops: [[0, PALETTE.outline], [0.78, PALETTE.outline], [0.94, PALETTE.rim, rim * 0.6], [1, PALETTE.rim, rim * 0.6]] },
  };
}

class Builder {
  prims: Prim[] = [];
  constructor(public pr: Proj) {}
  /** shaded tapered capsule */
  capsule(a: V3, b: V3, ra: number, rb: number, tone: Tone | string, bias = 0, sw = 1.3, rim = 0.75) {
    const A = this.pr.P(a), B = this.pr.P(b);
    const prim: Prim = {
      d: (A[2] + B[2]) / 2 + bias, path: capsulePath(A[0], A[1], ra, B[0], B[1], rb), sw,
      bbox: bboxOf([[A[0], A[1]], [B[0], B[1]]], Math.max(ra, rb)),
    };
    if (typeof tone === 'string') { prim.fill = tone; prim.stroke = PALETTE.outline; }
    else {
      let nx = -(B[1] - A[1]), ny = B[0] - A[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }
      Object.assign(prim, shading((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, Math.max(ra, rb), nx, ny, tone, rim));
    }
    this.prims.push(prim);
  }
  /** one smooth limb: hull of circles along a bone (k = fraction along a->b, r = radius), shaded across the bone */
  limb(a: V3, b: V3, rings: [number, number][], tone: Tone | string, bias = 0, sw = 1.3, rim = 0.75) {
    const A = this.pr.P(a), B = this.pr.P(b);
    const pts: [number, number][] = [];
    for (const [k, r] of rings) pts.push(...circlePts(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, r, 16));
    const h = hull(pts);
    const prim: Prim = { d: (A[2] + B[2]) / 2 + bias, path: polyPath(h), sw, bbox: bboxOf(h) };
    if (typeof tone === 'string') { prim.fill = tone; prim.stroke = PALETTE.outline; }
    else {
      let nx = -(B[1] - A[1]), ny = B[0] - A[0];
      const l = Math.hypot(nx, ny);
      if (l < 0.5) { nx = LIGHT[0]; ny = LIGHT[1]; } else { nx /= l; ny /= l; }
      if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }
      Object.assign(prim, shading((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, Math.max(...rings.map((q) => q[1])), nx, ny, tone, rim));
    }
    this.prims.push(prim);
  }
  /** shaded convex hull of projected spheres */
  blob(spheres: [V3, number][], tone: Tone | string, bias = 0, sw = 1.3, rim = 0.75) {
    const pts: [number, number][] = [];
    let dsum = 0;
    for (const [c, r] of spheres) {
      const C = this.pr.P(c);
      dsum += C[2];
      pts.push(...circlePts(C[0], C[1], r));
    }
    const h = hull(pts);
    const bb = bboxOf(h);
    const prim: Prim = { d: dsum / spheres.length + bias, path: polyPath(h), sw, bbox: bb };
    if (typeof tone === 'string') { prim.fill = tone; prim.stroke = PALETTE.outline; }
    else Object.assign(prim, shading((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 2, LIGHT[0], LIGHT[1], tone, rim));
    this.prims.push(prim);
  }
  /** soft radial highlight (muscle bellies, speculars) */
  glow(c: V3, rx: number, ry: number, color: string, alpha: number, bias = 0.01, angle = 0) {
    const C = this.pr.P(c);
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const pts = Array.from({ length: 18 }, (_, i) => {
      const t = (i / 18) * 2 * Math.PI;
      const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
      return [C[0] + x * ca - y * sa, C[1] + x * sa + y * ca] as [number, number];
    });
    this.prims.push({
      d: C[2] + bias, path: polyPath(pts), bbox: bboxOf(pts),
      fillGrad: { kind: 'radial', cx: C[0], cy: C[1], r: Math.max(rx, ry), stops: [[0, color, alpha], [1, color, 0]] },
    });
  }
  poly(pts3: V3[], fill: string | Tone, bias = 0, stroke = PALETTE.outline, sw = 1, cull = false, op?: number) {
    if (cull) {
      const n = cross(sub(pts3[1], pts3[0]), sub(pts3[2], pts3[0]));
      if (dot(n, this.pr.toward) <= 0) return;
    }
    const P = pts3.map((p) => this.pr.P(p));
    const pts = P.map((q) => [q[0], q[1]] as [number, number]);
    const bb = bboxOf(pts);
    const prim: Prim = { d: P.reduce((a, q) => a + q[2], 0) / P.length + bias, path: polyPath(pts), stroke, sw, op, bbox: bb };
    if (typeof fill === 'string') prim.fill = fill;
    else prim.fillGrad = { kind: 'linear', x1: bb[0], y1: bb[1], x2: bb[2], y2: bb[3], stops: [[0, fill.lit], [0.45, fill.base], [1, fill.shade]] };
    this.prims.push(prim);
  }
  line(pts3: V3[], stroke: string, sw: number, bias = 0, op?: number, dash?: string) {
    const P = pts3.map((p) => this.pr.P(p));
    const pts = P.map((q) => [q[0], q[1]] as [number, number]);
    this.prims.push({
      d: P.reduce((a, q) => a + q[2], 0) / P.length + bias,
      path: 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L'), stroke, sw, cap: 'round', op, dash, bbox: bboxOf(pts, sw),
    });
  }
  /** shaded cylinder: silhouette with a lit/spec gradient plus the visible cap */
  cylinder(c: V3, axis: V3, r: number, half: number, body: Tone & { spec?: string }, cap: [string, string], bias = 0) {
    const a = norm(axis);
    const e1 = norm(Math.abs(a[1]) < 0.9 ? cross(a, [0, 1, 0]) : cross(a, [1, 0, 0]));
    const e2 = cross(a, e1);
    const ring = (o: V3) => Array.from({ length: 22 }, (_, i) => {
      const t = (i / 22) * 2 * Math.PI;
      return add(o, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))));
    });
    const c1 = add(c, mul(a, half)), c0 = add(c, mul(a, -half));
    const r1 = ring(c1).map((p) => this.pr.P(p)), r0 = ring(c0).map((p) => this.pr.P(p));
    const sil = hull([...r1, ...r0].map((q) => [q[0], q[1]] as [number, number]));
    const d = this.pr.P(c)[2] + bias;
    const A = this.pr.P(c0), B = this.pr.P(c1);
    let nx = -(B[1] - A[1]), ny = B[0] - A[0];
    const l = Math.hypot(nx, ny);
    if (l < 0.5) { nx = -LIGHT[0]; ny = -LIGHT[1]; } else { nx /= l; ny /= l; }
    if (nx * LIGHT[0] + ny * LIGHT[1] < 0) { nx = -nx; ny = -ny; }
    const cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2;
    const stops: Stop[] = body.spec
      ? [[0, body.base], [0.16, body.lit], [0.26, body.spec], [0.36, body.lit], [0.62, body.base], [1, body.shade]]
      : [[0, body.lit], [0.4, body.base], [1, body.shade]];
    this.prims.push({
      d, path: polyPath(sil), sw: 0.9, stroke: PALETTE.outline, bbox: bboxOf(sil),
      fillGrad: { kind: 'linear', x1: cx + nx * r, y1: cy + ny * r, x2: cx - nx * r, y2: cy - ny * r, stops },
    });
    const front = dot(a, this.pr.toward) >= 0 ? r1 : r0;
    const fp = front.map((q) => [q[0], q[1]] as [number, number]);
    const fb = bboxOf(fp);
    this.prims.push({
      d: d + 0.01, path: polyPath(fp), stroke: PALETTE.outline, sw: 0.7, bbox: fb,
      fillGrad: { kind: 'radial', cx: fb[0] + (fb[2] - fb[0]) * 0.35, cy: fb[1] + (fb[3] - fb[1]) * 0.3, r: Math.max(fb[2] - fb[0], fb[3] - fb[1]) * 0.75, stops: [[0, cap[0]], [1, cap[1]]] },
    });
  }
  /** oriented box with camera-facing faces; the top face can carry stitching */
  box(c: V3, ax: [V3, V3, V3], h: [number, number, number], colors: { top: Tone; side: Tone; end: Tone }, bias = 0, stitch = false) {
    const [u, v] = ax;
    const w = norm(cross(u, v));
    const corner = (i: number, j: number, k: number) => add(c, add(add(mul(u, i * h[0]), mul(v, j * h[1])), mul(w, k * h[2])));
    const faces: [V3[], Tone, boolean][] = [
      [[corner(-1, 1, -1), corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1)], colors.top, true],
      [[corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1)], colors.side, false],
      [[corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)], colors.side, false],
      [[corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1), corner(1, -1, -1)], colors.side, false],
      [[corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(1, -1, 1)], colors.end, false],
      [[corner(-1, -1, -1), corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1)], colors.end, false],
    ];
    const cd = this.pr.P(c)[2] + bias;
    for (const [pts, tone, isTop] of faces) {
      const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
      if (dot(n, this.pr.toward) <= 1e-6) continue;
      const P = pts.map((p) => this.pr.P(p));
      const p2 = P.map((q) => [q[0], q[1]] as [number, number]);
      const bb = bboxOf(p2);
      this.prims.push({
        d: cd, path: polyPath(p2), stroke: PALETTE.outline, sw: 0.9, bbox: bb,
        fillGrad: { kind: 'linear', x1: bb[0], y1: bb[1], x2: bb[2], y2: bb[3], stops: [[0, tone.lit], [0.5, tone.base], [1, tone.shade]] },
      });
      if (isTop && stitch) {
        const inset = (i: number, j: number) => add(corner(i * 0.93, 1, j * 0.8), mul(v, 0.05));
        const ring = [inset(-1, -1), inset(-1, 1), inset(1, 1), inset(1, -1), inset(-1, -1)];
        this.line(ring, '#80848C', 0.45, bias + 0.005, 0.55, '1.6 1.4');
        this.prims[this.prims.length - 1].d = cd + 0.001;
      }
    }
  }
}

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
const mixTone = (far: Tone, near: Tone, t: number): Tone => ({ lit: mix(far.lit, near.lit, t), base: mix(far.base, near.base, t), shade: mix(far.shade, near.shade, t) });

// ---------- props ----------
export const BENCH = { top: 44, pad: 7, width: 13, seat: 38, back: 80 };

/** Geometry of the back pad of a bench prop: hinge (on the pad surface), along (up the pad) and normal (away from pad). */
export function benchFrame(b: Extract<Prop, { kind: 'bench' }>) {
  const a = b.back * DEG;
  const sgn = b.facing === 'toward' ? 1 : -1;
  const yaw = b.yaw ?? 0;
  const hinge: V3 = [b.x, BENCH.top, b.z ?? 0];
  const along = rotY([sgn * Math.cos(a), Math.sin(a), 0], yaw);
  const normal = rotY([-sgn * Math.sin(a), Math.cos(a), 0], yaw);
  return { hinge, along, normal, seatDir: rotY([-sgn, 0, 0], yaw) };
}

function drawBench(B: Builder, b: Extract<Prop, { kind: 'bench' }>) {
  const { hinge, along, seatDir } = benchFrame(b);
  const yaw = b.yaw ?? 0;
  const zAx = rotY([0, 0, 1], yaw);
  const T = BENCH.pad / 2;
  const colors = { top: PALETTE.pad, side: { lit: '#2A2B30', base: '#1A1B1F', shade: '#0C0C0E' }, end: { lit: '#26272C', base: '#18191C', shade: '#0C0C0E' } };
  const seatMid = add(hinge, add(mul(seatDir, BENCH.seat / 2 + 1), [0, -T, 0]));
  B.box(seatMid, [seatDir, [0, 1, 0], zAx], [BENCH.seat / 2, T, BENCH.width], colors, -0.5, true);
  const nrm = norm(cross(zAx, along));
  const up = dot(nrm, [0, 1, 0]) >= 0 ? nrm : mul(nrm, -1);
  const backMid = add(hinge, add(mul(along, BENCH.back / 2 + 1), mul(up, -T)));
  B.box(backMid, [along, up, zAx], [BENCH.back / 2, T, BENCH.width - 0.5], colors, -0.5, true);
  const fx = (d: number) => add(hinge, mul(seatDir, d));
  const flo = (p: V3): V3 => [p[0], 3, p[2]];
  const frontFoot = flo(fx(BENCH.seat - 6));
  const rearFoot = flo(fx(-48));
  const fc = PALETTE.frame;
  B.capsule(add(frontFoot, mul(zAx, -22)), add(frontFoot, mul(zAx, 22)), 3, 3, fc, -1, 1, 0.5);
  B.capsule(add(rearFoot, mul(zAx, -22)), add(rearFoot, mul(zAx, 22)), 3, 3, fc, -1, 1, 0.5);
  B.capsule(add(frontFoot, [0, 7, 0]), add(rearFoot, [0, 7, 0]), 2.6, 2.6, fc, -1.2, 1, 0.5);
  B.capsule(add(frontFoot, [0, 6, 0]), add(fx(BENCH.seat - 10), [0, -BENCH.pad, 0]), 2.6, 2.6, fc, -1.1, 1, 0.5);
  const backAnchor = add(hinge, add(mul(along, Math.min(BENCH.back * 0.55, 46)), mul(up, -BENCH.pad)));
  B.capsule(add(fx(-10), [0, -BENCH.top + 10, 0]), backAnchor, 2.4, 2.4, fc, -1.1, 1, 0.5);
  B.capsule(add(fx(2), [0, -BENCH.top + 10, 0]), add(hinge, [0, -BENCH.pad - 1, 0]), 2.6, 2.6, fc, -1.1, 1, 0.5);
}

function drawMat(B: Builder, m: Extract<Prop, { kind: 'mat' }>) {
  const t = { lit: '#2A2622', base: '#1C1A18', shade: '#121110' };
  B.box([(m.x1 + m.x0) / 2, 0.6, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [(m.x1 - m.x0) / 2, 0.6, 34], { top: t, side: t, end: t }, -400);
}

export const TREAD = { x0: -80, x1: 78, base: 9 };
export const treadY = (x: number, grade: number) => TREAD.base + (x - TREAD.x0) * (grade / 100);

function drawTreadmill(B: Builder, t: Extract<Prop, { kind: 'treadmill' }>, belt: number) {
  const g = t.grade / 100;
  const ang = Math.atan(g);
  const along: V3 = [Math.cos(ang), Math.sin(ang), 0];
  const up: V3 = [-Math.sin(ang), Math.cos(ang), 0];
  const L = TREAD.x1 - TREAD.x0;
  const mid: V3 = [(TREAD.x0 + TREAD.x1) / 2, treadY((TREAD.x0 + TREAD.x1) / 2, t.grade) - 5, 0];
  const deck = { lit: '#2E3036', base: '#1A1B1F', shade: '#0C0C0E' };
  B.box(mid, [along, up, [0, 0, 1]], [L / 2 / Math.cos(ang) + 4, 5, 31], { top: { lit: '#1E1F23', base: '#141518', shade: '#0B0B0D' }, side: deck, end: deck }, -300);
  for (let i = 0; i < 9; i++) {
    const x = TREAD.x0 + 6 + ((i * 18 + 400 - (belt % 18)) % (L - 10));
    const y = treadY(x, t.grade) + 0.3;
    B.line([[x, y, -24], [x, y, 24]], '#2A2C31', 1.4, -299);
  }
  const fx = TREAD.x1 - 6;
  const fy = treadY(fx, t.grade);
  for (const z of [-34, 34]) {
    B.capsule([fx, fy, z], [fx + 8, fy + 108, z], 3, 2.6, PALETTE.frame, z > 0 ? 0 : -60, 1, 0.6);
    B.capsule([fx + 6, fy + 92, z], [fx - 52, fy + 88, z], 2.2, 2.2, PALETTE.chrome, z > 0 ? 0 : -60, 0.9, 0.6);
  }
  B.box([fx + 9, fy + 112, 0], [[0.9, 0.44, 0], [-0.44, 0.9, 0], [0, 0, 1]], [10, 3, 33], { top: { lit: '#3C3F46', base: '#24262B', shade: '#111214' }, side: deck, end: deck }, -50);
  B.line([[TREAD.x0, treadY(TREAD.x0, t.grade) - 2.5, 31.5], [fx, fy - 2.5, 31.5]], PALETTE.ember, 1.2, -199, 0.9);
}

export const BIKE = { crank: [16, 30, 0] as V3, crankR: 17, saddle: [-20, 96, 0] as V3, bars: [42, 110, 0] as V3 };

function drawBike(B: Builder, crankAngle: number) {
  const fc = PALETTE.frame;
  B.capsule([-50, 3, 0], [62, 3, 0], 3.2, 3.2, fc, -80, 1, 0.5);
  for (const x of [-46, 58]) B.capsule([x, 3, -24], [x, 3, 24], 3, 3, fc, -80, 1, 0.5);
  B.cylinder([50, 36, 0], [0, 0, 1], 24, 3.5, { ...PALETTE.metal, spec: undefined }, ['#3E434B', '#15161A'], -40);
  B.capsule([-40, 3, 0], BIKE.crank, 3.2, 3.2, fc, -30, 1, 0.5);
  B.capsule(BIKE.crank, [-14, 80, 0], 3.2, 3, fc, -30, 1, 0.5);
  B.capsule([-14, 80, 0], add(BIKE.saddle, [2, -4, 0]), 2.4, 2.4, PALETTE.chrome, -30, 0.9, 0.5);
  B.capsule(BIKE.crank, [50, 36, 0], 3, 3, fc, -30, 1, 0.5);
  B.capsule([50, 36, 0], [36, 96, 0], 3.2, 3, fc, -30, 1, 0.5);
  B.capsule([36, 96, 0], BIKE.bars, 2.6, 2.6, PALETTE.chrome, -30, 0.9, 0.5);
  B.capsule(add(BIKE.bars, [0, 0, -22]), add(BIKE.bars, [0, 0, 22]), 2.4, 2.4, PALETTE.chrome, -5, 0.9, 0.5);
  const sad = { lit: '#3C3E45', base: '#202125', shade: '#0E0E10' };
  B.box(add(BIKE.saddle, [0, 1, 0]), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [12, 2.5, 7], { top: sad, side: sad, end: sad }, -20);
  for (const s of [1, -1]) {
    const a = crankAngle + (s === 1 ? 0 : Math.PI);
    const ped: V3 = [BIKE.crank[0] + BIKE.crankR * Math.cos(a), BIKE.crank[1] + BIKE.crankR * Math.sin(a), s * 9];
    B.capsule([BIKE.crank[0], BIKE.crank[1], s * 7], ped, 2, 1.8, PALETTE.chrome, s * 9, 0.8, 0.5);
    B.capsule(add(ped, [0, 0, s * 1]), add(ped, [0, 0, s * 9]), 2, 2, fc, s * 9, 0.8, 0.5);
  }
  B.cylinder(BIKE.crank, [0, 0, 1], 6, 7, { ...PALETTE.metal }, ['#5A606A', '#1A1C20'], -2);
}

// ---------- character ----------
/** Physique build 0..3 (target physique stages 1..4): shoulders, lats, arms and legs grow; waist narrows. */
function build(stage: number) {
  const s = Math.max(0, Math.min(3, stage));
  return {
    delt: 7.2 + s * 0.75, upperArm: 6.1 + s * 0.4, bicep: 6.3 + s * 0.55, forearm: 5.0 + s * 0.28,
    chestW: 5.4 + s * 1.0, chestR: 9.4 + s * 0.45, backR: 9.4 + s * 0.6, lat: 10.2 + s * 0.85,
    belly: 13.4 - s * 1.25, waist: 12.6 - s * 0.85, thigh: 9.8 + s * 0.35, quad: 9.9 + s * 0.55, calf: 6.2 + s * 0.4, neck: 5.1 + s * 0.35,
    sheen: 0.08 + s * 0.06,
  };
}

function drawCharacter(B: Builder, s: Solved, hold: Hold, stage: number, breath: number) {
  const pr = B.pr;
  const g = build(stage);
  const center = pr.P(mul(add(s.pelvis, s.neckBase), 0.5))[2];
  const t01 = (p: V3) => Math.max(0, Math.min(1, 0.55 + (pr.P(p)[2] - center) / 38));
  const skin = (p: V3) => mixTone(PALETTE.skinFar, PALETTE.skin, t01(p));
  const tank = (p: V3) => mixTone(PALETTE.tankFar, PALETTE.tank, t01(p));
  const fp = s.frames.pelvis, fl = s.frames.lumbar, ft = s.frames.thorax, fh = s.frames.head;
  const at = (o: V3, m: M3, p: V3) => add(o, apply(m, p));
  const br = 1 + 0.018 * breath;

  // shorts
  B.blob([
    [at(s.pelvis, fp, [1.5, 0, BODY.hipW]), 10.2],
    [at(s.pelvis, fp, [1.5, 0, -BODY.hipW]), 10.2],
    [at(s.pelvis, fp, [-4.5, -3, 5]), 9.8],
    [at(s.pelvis, fp, [-4.5, -3, -5]), 9.8],
    [at(s.pelvis, fl, [0, 10, 0]), g.waist],
  ], PALETTE.shorts, 0.5);
  // waistband
  B.line([at(s.pelvis, fl, [g.waist * 0.9, 9, 0]), at(s.pelvis, fl, [g.waist * 0.95, 11.5, 0])], '#3A3C42', 1.4, 0.55, 0.9);

  // compression tank: V-taper hull
  const tb: [V3, number][] = [
    [at(s.pelvis, fl, [0.5, 14, 4]), g.belly],
    [at(s.pelvis, fl, [0.5, 14, -4]), g.belly],
    [at(s.waist, ft, [4.5, 6, 0]), g.belly - 0.6],
    [at(s.waist, ft, [6, 19 + breath * 0.3, g.chestW]), g.chestR * br],
    [at(s.waist, ft, [6, 19 + breath * 0.3, -g.chestW]), g.chestR * br],
    [at(s.waist, ft, [-5.5, 17, 7.5]), g.lat],
    [at(s.waist, ft, [-5.5, 17, -7.5]), g.lat],
    [at(s.waist, ft, [-5, 22, 6.5]), g.backR],
    [at(s.waist, ft, [-5, 22, -6.5]), g.backR],
    [at(s.neckBase, ft, [0, -BODY.shoulderDrop + breath * 0.25, BODY.shoulderW - 2.5]), 7],
    [at(s.neckBase, ft, [0, -BODY.shoulderDrop + breath * 0.25, -BODY.shoulderW + 2.5]), 7],
  ];
  B.blob(tb, tank(s.neckBase), 1);
  // chest plate sheen and the ember piping down the near side seam
  B.glow(at(s.waist, ft, [11, 20, 0]), 8, 6, '#FFFFFF', 0.10, 1.02);
  const nearSide = pr.P(at(s.waist, ft, [0, 0, 1]))[2] >= pr.P(s.waist)[2] ? 1 : -1;
  B.line([at(s.neckBase, ft, [0, -9, nearSide * (BODY.shoulderW - 4)]), at(s.waist, ft, [0, 4, nearSide * 12]), at(s.pelvis, fl, [0, 13, nearSide * 11.5])], PALETTE.ember, 1.3, 1.04, 0.95);

  // neck, hair, head, ear
  B.capsule(s.neckBase, at(s.neckBase, fh, [1, BODY.neck + 2, 0]), g.neck, g.neck - 0.4, skin(s.neckBase), 1.2);
  B.blob([[at(s.head, fh, [-1.2, 2.4, 0]), BODY.headR + 0.7], [at(s.head, fh, [-4.2, -1.5, 0]), BODY.headR - 0.6]], PALETTE.hair, 1.35, 1);
  B.blob([[s.head, BODY.headR], [s.chin, 5.8], [at(s.head, fh, [3, -3, 0]), 8.5]], skin(s.head), 1.4);
  for (const k of [1, -1]) {
    const ear = at(s.head, fh, [-0.8, -0.6, k * (BODY.headR - 0.6)]);
    if (pr.P(ear)[2] > pr.P(s.head)[2]) B.glow(ear, 2.4, 3, '#7A4A33', 0.85, 1.45);
  }
  // hairline accent so the head reads as a head from every angle
  B.glow(at(s.head, fh, [4, 1, 0]), 5, 4, '#FFE2C8', 0.16, 1.46);

  for (const side of ['l', 'r'] as Side[]) {
    const a = s.arm[side], l = s.leg[side], ft2 = s.foot[side];
    const sk = (p: V3) => skin(p);
    // legs: shorts over the upper thigh, then skin with a quad and calf belly
    const thighAt = (k: number) => add(l.root, mul(sub(l.mid, l.root), k));
    const shinAt = (k: number) => add(l.mid, mul(sub(l.end, l.mid), k));
    B.limb(l.root, l.mid, [[0.3, g.quad - 0.2], [0.62, g.quad - 1.4], [1, 6]], sk(l.mid), 0.1);
    B.limb(l.root, l.mid, [[0, g.thigh + 0.4], [0.46, g.thigh - 0.2]], PALETTE.shorts, 0.12);
    B.glow(thighAt(0.66), 2.4, 5, '#FFFFFF', g.sheen, 0.13, Math.atan2(pr.P(l.mid)[1] - pr.P(l.root)[1], pr.P(l.mid)[0] - pr.P(l.root)[0]));
    B.limb(l.mid, l.end, [[0, 6], [0.3, g.calf], [1, 4.0]], sk(l.end), 0.15);
    B.glow(shinAt(0.3), 2, 3.6, '#FFFFFF', g.sheen * 0.8, 0.151, Math.atan2(pr.P(l.end)[1] - pr.P(l.mid)[1], pr.P(l.end)[0] - pr.P(l.mid)[0]));
    // trainer: upper, midsole, ember outsole
    const fpts = [add(ft2.ankle, mul(ft2.dir, -3)), ft2.heel, ft2.ball, ft2.toe, ft2.top];
    B.poly([...fpts, add(ft2.ankle, mul(ft2.up, 3))], PALETTE.shoe, 0.3, PALETTE.outline, 1.3);
    B.line([ft2.heel, ft2.ball, ft2.toe], PALETTE.midsole, 1.5, 0.33, 0.9);
    B.line([add(ft2.heel, mul(ft2.up, -0.9)), add(ft2.ball, mul(ft2.up, -0.9)), add(ft2.toe, mul(ft2.up, -0.6))], PALETTE.ember, 1.2, 0.34, 0.95);
    // arms: deltoid cap, upper arm with a belly, forearm taper, hand
    const upAt = (k: number) => add(a.root, mul(sub(a.mid, a.root), k));
    B.limb(a.root, a.mid, [[0, g.delt], [0.5, g.bicep], [1, 4.8]], sk(a.mid), 0.6);
    B.glow(upAt(0.18), 3.2, 3.2, '#FFFFFF', g.sheen + 0.04, 0.62);
    B.glow(upAt(0.55), 2.2, 3.8, '#FFFFFF', g.sheen, 0.62, Math.atan2(pr.P(a.mid)[1] - pr.P(a.root)[1], pr.P(a.mid)[0] - pr.P(a.root)[0]));
    B.limb(a.mid, a.wrist!, [[0, 4.7], [0.32, g.forearm], [1, 3.4]], sk(a.wrist!), 0.65);
    B.capsule(a.wrist!, add(a.end, mul(norm(sub(a.end, a.wrist!)), 1.5)), 3.6, 3.9, sk(a.end), hold === 'none' ? 0.7 : 1.2);
  }
}

function drawDumbbell(B: Builder, c: V3, axis: V3) {
  const a = norm(axis);
  B.capsule(add(c, mul(a, -9)), add(c, mul(a, 9)), 1.7, 1.7, PALETTE.chrome, 0.2, 0.8, 0.5);
  B.cylinder(add(c, mul(a, 12.5)), a, 6.9, 4.1, PALETTE.metal, ['#7C838E', '#24272C'], 0.25);
  B.cylinder(add(c, mul(a, -12.5)), a, 6.9, 4.1, PALETTE.metal, ['#7C838E', '#24272C'], 0.25);
}

export interface SceneInput {
  solved: Solved;
  props: Prop[];
  hold: Hold;
  extra?: Record<string, number>;
  /** physique stage 0..3 */
  stage?: number;
  /** breathing phase -1..1 */
  breath?: number;
}

export function buildPrims(input: SceneInput, cam: Camera): Prim[] {
  const B = new Builder(projector(cam));
  const { solved: s } = input;
  // soft contact shadow under the athlete
  const gx = (s.pelvis[0] + (s.foot.r.ankle[0] + s.foot.l.ankle[0]) / 2) / 2;
  const sh = B.pr.P([gx, 0, 0]);
  const shadowPts = Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * 2 * Math.PI;
    return B.pr.P([gx + Math.cos(t) * 62, 0, Math.sin(t) * 30]);
  }).map((q) => [q[0], q[1]] as [number, number]);
  B.prims.push({
    d: -1000, path: polyPath(shadowPts), bbox: bboxOf(shadowPts), nb: true,
    fillGrad: { kind: 'radial', cx: sh[0], cy: sh[1], r: 62, stops: [[0, '#000000', 0.7], [0.55, '#000000', 0.35], [1, '#000000', 0]] },
  });
  for (const p of input.props) {
    if (p.kind === 'bench') drawBench(B, p);
    else if (p.kind === 'mat') drawMat(B, p);
    else if (p.kind === 'treadmill') drawTreadmill(B, p, input.extra?.belt ?? 0);
    else if (p.kind === 'bike') drawBike(B, input.extra?.crank ?? 0);
  }
  drawCharacter(B, s, input.hold, input.stage ?? 0, input.breath ?? 0);
  if (input.hold === 'pair') s.db.forEach((d) => drawDumbbell(B, d.center, d.axis));
  else if (input.hold === 'right' || input.hold === 'twoHand') drawDumbbell(B, s.db[0].center, s.db[0].axis);
  return B.prims.sort((a, b) => a.d - b.d);
}

export const _internal = { rotY };
