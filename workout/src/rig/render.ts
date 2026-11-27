// Turns a solved pose + props into depth-sorted 2D SVG primitives.
import { BODY } from './skeleton';
import { type Solved } from './solve';
import type { Hold, Prop, Side } from './types';
import { type M3, type V3, DEG, add, apply, cross, dot, mul, norm, rotY, sub } from './vec';

export interface Camera {
  yaw: number;
  pitch: number;
}
export interface Prim {
  d: number; // depth (bigger = nearer)
  path: string;
  fill?: string;
  stroke?: string;
  sw?: number;
  op?: number;
  cap?: 'round';
  bbox: [number, number, number, number];
}

export const PALETTE = {
  skinNear: '#DADDE2',
  skinFar: '#7C838E',
  topNear: '#5B6370',
  topFar: '#3E444E',
  shorts: '#252930',
  shortsFar: '#1C1F24',
  shoe: '#16181C',
  accent: '#D7FF3C',
  outline: '#0F1013',
  dbHead: '#30353C',
  dbCap: '#6A717C',
  dbHandle: '#A5ACB5',
  padTop: '#5C626C',
  padSide: '#3A3F47',
  frame: '#2A2E34',
  frameHi: '#454A52',
  floor: '#17191D',
};

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

function polyPath(pts: [number, number][]) {
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
}

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

function circlePts(cx: number, cy: number, r: number, n = 18): [number, number][] {
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)] as [number, number]);
}

/** Tapered capsule between two projected circles. */
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

class Builder {
  prims: Prim[] = [];
  constructor(public pr: Proj) {}
  capsule(a: V3, b: V3, ra: number, rb: number, fill: string, bias = 0, stroke = PALETTE.outline, sw = 1.4) {
    const A = this.pr.P(a), B = this.pr.P(b);
    this.prims.push({
      d: (A[2] + B[2]) / 2 + bias, path: capsulePath(A[0], A[1], ra, B[0], B[1], rb), fill, stroke, sw,
      bbox: bboxOf([[A[0], A[1]], [B[0], B[1]]], Math.max(ra, rb)),
    });
  }
  blob(spheres: [V3, number][], fill: string, bias = 0, stroke = PALETTE.outline, sw = 1.4) {
    const pts: [number, number][] = [];
    let dsum = 0;
    for (const [c, r] of spheres) {
      const C = this.pr.P(c);
      dsum += C[2];
      pts.push(...circlePts(C[0], C[1], r));
    }
    const h = hull(pts);
    this.prims.push({ d: dsum / spheres.length + bias, path: polyPath(h), fill, stroke, sw, bbox: bboxOf(h) });
  }
  poly(pts3: V3[], fill: string, bias = 0, stroke = PALETTE.outline, sw = 1, cull = false, op?: number) {
    if (cull) {
      const n = cross(sub(pts3[1], pts3[0]), sub(pts3[2], pts3[0]));
      if (dot(n, this.pr.toward) <= 0) return;
    }
    const P = pts3.map((p) => this.pr.P(p));
    const pts = P.map((q) => [q[0], q[1]] as [number, number]);
    this.prims.push({ d: P.reduce((a, q) => a + q[2], 0) / P.length + bias, path: polyPath(pts), fill, stroke, sw, op, bbox: bboxOf(pts) });
  }
  line(pts3: V3[], stroke: string, sw: number, bias = 0, op?: number) {
    const P = pts3.map((p) => this.pr.P(p));
    const pts = P.map((q) => [q[0], q[1]] as [number, number]);
    this.prims.push({
      d: P.reduce((a, q) => a + q[2], 0) / P.length + bias,
      path: 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L'), stroke, sw, cap: 'round', op, bbox: bboxOf(pts, sw),
    });
  }
  /** cylinder: silhouette plus the visible end cap */
  cylinder(c: V3, axis: V3, r: number, half: number, body: string, cap: string, bias = 0) {
    const a = norm(axis);
    const e1 = norm(Math.abs(a[1]) < 0.9 ? cross(a, [0, 1, 0]) : cross(a, [1, 0, 0]));
    const e2 = cross(a, e1);
    const ring = (o: V3) => Array.from({ length: 20 }, (_, i) => {
      const t = (i / 20) * 2 * Math.PI;
      return add(o, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))));
    });
    const c1 = add(c, mul(a, half)), c0 = add(c, mul(a, -half));
    const r1 = ring(c1).map((p) => this.pr.P(p)), r0 = ring(c0).map((p) => this.pr.P(p));
    const sil = hull([...r1, ...r0].map((q) => [q[0], q[1]] as [number, number]));
    const d = this.pr.P(c)[2] + bias;
    this.prims.push({ d, path: polyPath(sil), fill: body, stroke: PALETTE.outline, sw: 1, bbox: bboxOf(sil) });
    const front = dot(a, this.pr.toward) >= 0 ? r1 : r0;
    const fp = front.map((q) => [q[0], q[1]] as [number, number]);
    this.prims.push({ d: d + 0.01, path: polyPath(fp), fill: cap, stroke: PALETTE.outline, sw: 0.8, bbox: bboxOf(fp) });
  }
  /** oriented box: centre, three axes (unit) and half sizes; draws camera-facing faces */
  box(c: V3, ax: [V3, V3, V3], h: [number, number, number], colors: { top: string; side: string; end: string }, bias = 0) {
    const [u, v] = ax;
    const w = norm(cross(u, v)); // enforce a right-handed frame so face culling is correct
    const corner = (i: number, j: number, k: number) => add(c, add(add(mul(u, i * h[0]), mul(v, j * h[1])), mul(w, k * h[2])));
    const faces: [V3[], string][] = [
      [[corner(-1, 1, -1), corner(-1, 1, 1), corner(1, 1, 1), corner(1, 1, -1)], colors.top],
      [[corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1)], colors.side],
      [[corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)], colors.side],
      [[corner(-1, -1, -1), corner(-1, 1, -1), corner(1, 1, -1), corner(1, -1, -1)], colors.side],
      [[corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(1, -1, 1)], colors.end],
      [[corner(-1, -1, -1), corner(-1, -1, 1), corner(-1, 1, 1), corner(-1, 1, -1)], colors.end],
    ];
    const cd = this.pr.P(c)[2] + bias;
    for (const [pts, col] of faces) {
      const n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]));
      if (dot(n, this.pr.toward) <= 1e-6) continue;
      const P = pts.map((p) => this.pr.P(p));
      const p2 = P.map((q) => [q[0], q[1]] as [number, number]);
      this.prims.push({ d: cd, path: polyPath(p2), fill: col, stroke: PALETTE.outline, sw: 0.9, bbox: bboxOf(p2) });
    }
  }
}

// ---------- colour helpers ----------
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// ---------- props ----------
export const BENCH = { top: 44, pad: 7, width: 13, seat: 38, back: 80 };

/** Geometry of the back pad of a bench prop: hinge (on the pad surface), along (up the pad) and normal (away from pad). */
export function benchFrame(b: Extract<Prop, { kind: 'bench' }>) {
  const a = b.back * DEG;
  const sgn = b.facing === 'toward' ? 1 : -1; // toward: pad rises toward +x
  const yaw = b.yaw ?? 0;
  const hinge: V3 = [b.x, BENCH.top, b.z ?? 0];
  const along = rotY([sgn * Math.cos(a), Math.sin(a), 0], yaw);
  // normal points away from the pad surface, toward the athlete
  const normal = rotY([-sgn * Math.sin(a), Math.cos(a), 0], yaw);
  return { hinge, along, normal, seatDir: rotY([-sgn, 0, 0], yaw) };
}

function drawBench(B: Builder, b: Extract<Prop, { kind: 'bench' }>) {
  const { hinge, along, seatDir } = benchFrame(b);
  const yaw = b.yaw ?? 0;
  const zAx = rotY([0, 0, 1], yaw);
  const T = BENCH.pad / 2;
  const colors = { top: PALETTE.padTop, side: PALETTE.padSide, end: '#30353C' };
  // seat (flat)
  const seatMid = add(hinge, add(mul(seatDir, BENCH.seat / 2 + 1), [0, -T, 0]));
  B.box(seatMid, [seatDir, [0, 1, 0], zAx], [BENCH.seat / 2, T, BENCH.width], colors, -0.5);
  // back pad
  const nrm = norm(cross(zAx, along));
  const up = dot(nrm, [0, 1, 0]) >= 0 ? nrm : mul(nrm, -1);
  const backMid = add(hinge, add(mul(along, BENCH.back / 2 + 1), mul(up, -T)));
  B.box(backMid, [along, up, zAx], [BENCH.back / 2, T, BENCH.width - 0.5], colors, -0.5);
  // frame
  const fx = (d: number) => add(hinge, mul(seatDir, d));
  const flo = (p: V3): V3 => [p[0], 3, p[2]];
  const frontFoot = flo(fx(BENCH.seat - 6));
  const rearFoot = flo(fx(-48));
  const fc = PALETTE.frame;
  B.capsule(add(frontFoot, mul(zAx, -22)), add(frontFoot, mul(zAx, 22)), 3, 3, fc, -1);
  B.capsule(add(rearFoot, mul(zAx, -22)), add(rearFoot, mul(zAx, 22)), 3, 3, fc, -1);
  B.capsule(add(frontFoot, [0, 7, 0]), add(rearFoot, [0, 7, 0]), 2.6, 2.6, fc, -1.2);
  B.capsule(add(frontFoot, [0, 6, 0]), add(fx(BENCH.seat - 10), [0, -BENCH.pad, 0]), 2.6, 2.6, fc, -1.1);
  const backAnchor = add(hinge, add(mul(along, Math.min(BENCH.back * 0.55, 46)), mul(up, -BENCH.pad)));
  B.capsule(add(fx(-10), [0, -BENCH.top + 10, 0]), backAnchor, 2.4, 2.4, fc, -1.1);
  B.capsule(add(fx(2), [0, -BENCH.top + 10, 0]), add(hinge, [0, -BENCH.pad - 1, 0]), 2.6, 2.6, fc, -1.1);
}

function drawMat(B: Builder, m: Extract<Prop, { kind: 'mat' }>) {
  B.box([(m.x0 + m.x1) / 2, 0.6, 0], [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [(m.x1 - m.x0) / 2, 0.6, 34], { top: '#22262C', side: '#1B1E22', end: '#1B1E22' }, -400);
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
  B.box(mid, [along, up, [0, 0, 1]], [L / 2 / Math.cos(ang) + 4, 5, 31], { top: '#1E2125', side: '#2C3037', end: '#262A30' }, -300);
  // belt slats
  for (let i = 0; i < 9; i++) {
    const x = TREAD.x0 + 6 + ((i * 18 + 400 - (belt % 18)) % (L - 10));
    const y = treadY(x, t.grade) + 0.3;
    B.line([[x, y, -24], [x, y, 24]], '#2E3238', 1.4, -299);
  }
  // rails and console
  const fx = TREAD.x1 - 6;
  const fy = treadY(fx, t.grade);
  for (const z of [-34, 34]) {
    B.capsule([fx, fy, z], [fx + 8, fy + 108, z], 3, 2.6, PALETTE.frame, z > 0 ? 0 : -60);
    B.capsule([fx + 6, fy + 92, z], [fx - 52, fy + 88, z], 2.2, 2.2, PALETTE.frameHi, z > 0 ? 0 : -60);
  }
  B.box([fx + 9, fy + 112, 0], [[0.9, 0.44, 0], [-0.44, 0.9, 0], [0, 0, 1]], [10, 3, 33], { top: '#3A3F47', side: '#24272C', end: '#2D3137' }, -50);
  B.poly([[TREAD.x0 - 4, 1, 31], [TREAD.x0 - 4, treadY(TREAD.x0, t.grade) + 0.5, 31], [fx, fy + 0.5, 31], [fx, 1, 31]], '#202328', -200, PALETTE.outline, 0.8, true);
  B.line([[TREAD.x0, treadY(TREAD.x0, t.grade) - 2.5, 31.5], [fx, fy - 2.5, 31.5]], PALETTE.accent, 1.2, -199, 0.8);
}

export const BIKE = { crank: [16, 30, 0] as V3, crankR: 17, saddle: [-20, 96, 0] as V3, bars: [42, 110, 0] as V3 };

function drawBike(B: Builder, crankAngle: number) {
  const fc = PALETTE.frame;
  B.capsule([-50, 3, 0], [62, 3, 0], 3.2, 3.2, fc, -80);
  for (const x of [-46, 58]) B.capsule([x, 3, -24], [x, 3, 24], 3, 3, fc, -80);
  B.cylinder([50, 36, 0], [0, 0, 1], 24, 3.5, '#24282E', '#3B414A', -40);
  B.capsule([-40, 3, 0], BIKE.crank, 3.2, 3.2, fc, -30);
  B.capsule(BIKE.crank, [-14, 80, 0], 3.2, 3, fc, -30);
  B.capsule([-14, 80, 0], add(BIKE.saddle, [2, -4, 0]), 2.4, 2.4, PALETTE.frameHi, -30);
  B.capsule(BIKE.crank, [50, 36, 0], 3, 3, fc, -30);
  B.capsule([50, 36, 0], [36, 96, 0], 3.2, 3, fc, -30);
  B.capsule([36, 96, 0], BIKE.bars, 2.6, 2.6, PALETTE.frameHi, -30);
  B.capsule(add(BIKE.bars, [0, 0, -22]), add(BIKE.bars, [0, 0, 22]), 2.4, 2.4, PALETTE.frameHi, -5);
  B.box(add(BIKE.saddle, [0, 1, 0]), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [12, 2.5, 7], { top: '#3B4048', side: '#24272C', end: '#2C3036' }, -20);
  for (const s of [1, -1]) {
    const a = crankAngle + (s === 1 ? 0 : Math.PI);
    const ped: V3 = [BIKE.crank[0] + BIKE.crankR * Math.cos(a), BIKE.crank[1] + BIKE.crankR * Math.sin(a), s * 9];
    B.capsule([BIKE.crank[0], BIKE.crank[1], s * 7], ped, 2, 1.8, PALETTE.frameHi, s * 9);
    B.capsule(add(ped, [0, 0, s * 1]), add(ped, [0, 0, s * 9]), 2, 2, '#3B4048', s * 9);
  }
  B.cylinder(BIKE.crank, [0, 0, 1], 6, 7, '#2C3036', '#4A5058', -2);
}

// ---------- character ----------
function drawCharacter(B: Builder, s: Solved, hold: Hold) {
  const pr = B.pr;
  const center = pr.P(mul(add(s.pelvis, s.neckBase), 0.5))[2];
  const tone = (p: V3, near: string, far: string) => mix(far, near, Math.max(0, Math.min(1, 0.55 + (pr.P(p)[2] - center) / 38)));
  const fp = s.frames.pelvis, fl = s.frames.lumbar, ft = s.frames.thorax, fh = s.frames.head;
  const at = (o: V3, m: M3, p: V3) => add(o, apply(m, p));

  // pelvis / shorts
  B.blob([
    [at(s.pelvis, fp, [1.5, 0, BODY.hipW]), 10],
    [at(s.pelvis, fp, [1.5, 0, -BODY.hipW]), 10],
    [at(s.pelvis, fp, [-4.5, -3, 5]), 9.5],
    [at(s.pelvis, fp, [-4.5, -3, -5]), 9.5],
    [at(s.pelvis, fl, [0, 11, 0]), 11],
  ], PALETTE.shorts, 0.5);
  // thorax / top
  const tb: [V3, number][] = [
    [at(s.pelvis, fl, [0.5, 14, 4]), 11],
    [at(s.pelvis, fl, [0.5, 14, -4]), 11],
    [at(s.waist, ft, [4.5, 6, 0]), 11],
    [at(s.waist, ft, [6, 19, 6]), 9.5],
    [at(s.waist, ft, [6, 19, -6]), 9.5],
    [at(s.waist, ft, [-5.5, 20, 7]), 9.5],
    [at(s.waist, ft, [-5.5, 20, -7]), 9.5],
    [at(s.neckBase, ft, [0, -BODY.shoulderDrop, BODY.shoulderW - 2]), 7.5],
    [at(s.neckBase, ft, [0, -BODY.shoulderDrop, -BODY.shoulderW + 2]), 7.5],
  ];
  B.blob(tb, tone(s.neckBase, PALETTE.topNear, PALETTE.topFar), 1);

  // neck + head
  B.capsule(s.neckBase, at(s.neckBase, fh, [1, BODY.neck + 2, 0]), 5.2, 4.8, tone(s.neckBase, PALETTE.skinNear, PALETTE.skinFar), 1.2);
  B.blob([[s.head, BODY.headR], [s.chin, 5.8], [at(s.head, fh, [3, -3, 0]), 8.5]], tone(s.head, PALETTE.skinNear, PALETTE.skinFar), 1.4);
  // headband: ring around the head, front half only
  const ring: V3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = (i / 24) * 2 * Math.PI;
    ring.push(at(s.head, fh, [Math.cos(t) * (BODY.headR + 0.2), 3.2, Math.sin(t) * (BODY.headR + 0.2)]));
  }
  const vis = ring.map((p) => pr.P(p)[2] >= pr.P(s.head)[2] - 1.5);
  let seg: V3[] = [];
  const segs: V3[][] = [];
  ring.forEach((p, i) => {
    if (vis[i]) seg.push(p);
    else if (seg.length) { segs.push(seg); seg = []; }
  });
  if (seg.length) segs.push(seg);
  for (const sg of segs) if (sg.length > 1) B.line(sg, PALETTE.accent, 3.4, 1.5);

  for (const side of ['l', 'r'] as Side[]) {
    const a = s.arm[side], l = s.leg[side], ft2 = s.foot[side];
    const skin = (p: V3) => tone(p, PALETTE.skinNear, PALETTE.skinFar);
    // legs
    const k = 0.42;
    const thighCut = add(l.root, mul(sub(l.mid, l.root), k));
    B.capsule(l.root, thighCut, 9.6, 8.4, tone(l.root, PALETTE.shorts, PALETTE.shortsFar), 0.2);
    B.capsule(add(l.root, mul(sub(l.mid, l.root), k - 0.06)), l.mid, 8.2, 6, skin(l.mid), 0.1);
    B.capsule(l.mid, l.end, 6, 4.2, skin(l.end), 0.15);
    const fpts = [add(ft2.ankle, mul(ft2.dir, -3)), ft2.heel, ft2.ball, ft2.toe, ft2.top];
    B.poly([...fpts, add(ft2.ankle, mul(ft2.up, 3))], PALETTE.shoe, 0.3, PALETTE.outline, 1.4);
    B.line([ft2.heel, ft2.ball, ft2.toe], PALETTE.accent, 1.6, 0.35, 0.9);
    // arms
    B.capsule(a.root, a.mid, 6, 4.9, skin(a.mid), 0.6);
    B.capsule(a.mid, a.wrist!, 4.8, 3.6, skin(a.wrist!), 0.65);
    B.capsule(a.wrist!, add(a.end, mul(norm(sub(a.end, a.wrist!)), 1.5)), 3.7, 3.9, skin(a.end), hold === 'none' ? 0.7 : 1.2);
  }
}

function drawDumbbell(B: Builder, c: V3, axis: V3) {
  const a = norm(axis);
  B.capsule(add(c, mul(a, -9)), add(c, mul(a, 9)), 1.7, 1.7, PALETTE.dbHandle, 0.2);
  B.cylinder(add(c, mul(a, 12.5)), a, 6.8, 4, PALETTE.dbHead, PALETTE.dbCap, 0.25);
  B.cylinder(add(c, mul(a, -12.5)), a, 6.8, 4, PALETTE.dbHead, PALETTE.dbCap, 0.25);
}

export interface SceneInput {
  solved: Solved;
  props: Prop[];
  hold: Hold;
  extra?: Record<string, number>;
}

export function buildPrims(input: SceneInput, cam: Camera): Prim[] {
  const B = new Builder(projector(cam));
  const { solved: s } = input;
  // floor shadow
  const gx = (s.pelvis[0] + (s.foot.r.ankle[0] + s.foot.l.ankle[0]) / 2) / 2;
  const sh: V3[] = Array.from({ length: 24 }, (_, i) => {
    const t = (i / 24) * 2 * Math.PI;
    return [gx + Math.cos(t) * 55, 0, Math.sin(t) * 26];
  });
  B.poly(sh, '#000000', -1000, 'none', 0, false, 0.35);
  for (const p of input.props) {
    if (p.kind === 'bench') drawBench(B, p);
    else if (p.kind === 'mat') drawMat(B, p);
    else if (p.kind === 'treadmill') drawTreadmill(B, p, input.extra?.belt ?? 0);
    else if (p.kind === 'bike') drawBike(B, input.extra?.crank ?? 0);
  }
  drawCharacter(B, s, input.hold);
  if (input.hold === 'pair') s.db.forEach((d) => drawDumbbell(B, d.center, d.axis));
  else if (input.hold === 'right') drawDumbbell(B, s.db[0].center, s.db[0].axis);
  else if (input.hold === 'twoHand') drawDumbbell(B, s.db[0].center, s.db[0].axis);
  return B.prims.sort((a, b) => a.d - b.d);
}

export const _internal = { rotY };
