export type V3 = [number, number, number];
export const v = (x = 0, y = 0, z = 0): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3) => len(sub(a, b));
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
export const DEG = Math.PI / 180;

/** Spherical interpolation between two directions (unit result). */
export function slerpDir(a: V3, b: V3, t: number): V3 {
  const na = norm(a);
  const nb = norm(b);
  const d = Math.max(-1, Math.min(1, dot(na, nb)));
  const om = Math.acos(d);
  if (om < 1e-4) return norm(lerp(na, nb, t));
  if (Math.PI - om < 1e-3) return norm(lerp(na, nb, t)); // opposite: fall back
  const s = Math.sin(om);
  return add(mul(na, Math.sin((1 - t) * om) / s), mul(nb, Math.sin(t * om) / s));
}

/** Rotate about the world Y axis (degrees). +deg turns +x toward -z. */
export function rotY(p: V3, deg: number): V3 {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
}

/** 3x3 rotation stored as its three column axes. */
export type M3 = [V3, V3, V3];
export const I3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
export const apply = (m: M3, p: V3): V3 => add(add(mul(m[0], p[0]), mul(m[1], p[1])), mul(m[2], p[2]));
export const compose = (a: M3, b: M3): M3 => [apply(a, b[0]), apply(a, b[1]), apply(a, b[2])];
export function rx(deg: number): M3 {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return [[1, 0, 0], [0, c, s], [0, -s, c]];
}
export function ry(deg: number): M3 {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return [[c, 0, -s], [0, 1, 0], [s, 0, c]];
}
export function rz(deg: number): M3 {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return [[c, s, 0], [-s, c, 0], [0, 0, 1]];
}
/** Interior angle at b (degrees) for the chain a-b-c. */
export function angleAt(a: V3, b: V3, c: V3): number {
  const u = norm(sub(a, b));
  const w = norm(sub(c, b));
  return Math.acos(Math.max(-1, Math.min(1, dot(u, w)))) / DEG;
}
export const angleBetween = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, dot(norm(a), norm(b))))) / DEG;
