// Date helpers that work on plain 'YYYY-MM-DD' strings (local calendar days),
// so time zones never shift a workout to the wrong day.
const DAY = 86_400_000;

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export const todayISO = () => toISO(new Date());

function utc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
export function addDays(iso: string, n: number): string {
  const t = new Date(utc(iso) + n * DAY);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}
export const diffDays = (a: string, b: string) => Math.round((utc(a) - utc(b)) / DAY);
export const weekday = (iso: string) => new Date(utc(iso)).getUTCDay();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function fmtShort(iso: string) {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}
export const fmtWeekday = (iso: string, long = false) => (long ? WD_LONG : WD)[weekday(iso)];
export const fmtLong = (iso: string) => `${fmtWeekday(iso, true)}, ${fmtShort(iso)}`;
