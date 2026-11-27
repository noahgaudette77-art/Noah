import { todayISO } from '../logic/dates';

/** Today's date. `#/?date=YYYY-MM-DD` overrides it for previews/screenshots (kept for the tab session). */
export function today(): string {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '').get('date');
  try {
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) sessionStorage.setItem('tempo.date', q);
    return sessionStorage.getItem('tempo.date') ?? todayISO();
  } catch {
    return q ?? todayISO();
  }
}
