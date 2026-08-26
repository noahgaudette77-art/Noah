/** Deterministic formatting. Never an LLM's job. */

const locale = "en-US";

export function num(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

export function compact(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = Number(value);
  const abs = Math.abs(n);
  const [div, suffix] =
    abs >= 1e12 ? [1e12, "T"] :
    abs >= 1e9  ? [1e9, "B"]  :
    abs >= 1e6  ? [1e6, "M"]  :
    abs >= 1e3  ? [1e3, "K"]  : [1, ""];
  return `${(n / div).toFixed(div === 1 ? 0 : digits)}${suffix}`;
}

export function pct(value, digits = 2, { sign = false } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const s = sign && value > 0 ? "+" : "";
  return `${s}${num(value, digits)}%`;
}

export function bps(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = Math.round(value * 100);
  return `${n > 0 ? "+" : ""}${n} bp`;
}

export function signClass(value) {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "";
  return value > 0 ? "up" : "down";
}

export function arrow(value) {
  if (!value) return "→";
  return value > 0 ? "▲" : "▼";
}

/* --- Dates --------------------------------------------------------------- */

export function date(input, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, opts);
}

export const dayMonth = (input) => date(input, { month: "short", day: "numeric" });

export function time(input) {
  if (!input) return "—";
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? "—"
    : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function ago(input) {
  if (!input) return "—";
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "—";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 0) return "in " + ago(new Date(Date.now() * 2 - then));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days}d ago`;
  const months = Math.round(days / 30.44);
  if (months < 24) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export const isoDate = (d = new Date()) => new Date(d).toISOString().slice(0, 10);

/** Monday of the week containing `d`, as an ISO date. Weeks start Monday. */
export function weekStart(d = new Date()) {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

export function weekLabel(iso) {
  const start = new Date(`${iso}T00:00:00Z`);
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  const opts = { month: "short", day: "numeric", timeZone: "UTC" };
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(
    locale, sameMonth ? { day: "numeric", timeZone: "UTC" } : opts
  )}, ${end.getUTCFullYear()}`;
}

/* --- Freshness ----------------------------------------------------------- */

/**
 * Freshness is a property of the datum, not the page. `maxAgeHours` says how
 * long this *kind* of information stays current: a quote ages in minutes, a
 * quarterly filing in months, a historical lesson never.
 */
export function freshness(timestamp, maxAgeHours = 24) {
  if (maxAgeHours === Infinity) return { state: "timeless", label: "Timeless", dot: "none" };
  if (!timestamp) return { state: "unknown", label: "No timestamp", dot: "none" };
  const hours = (Date.now() - new Date(timestamp).getTime()) / 3.6e6;
  if (Number.isNaN(hours)) return { state: "unknown", label: "No timestamp", dot: "none" };
  if (hours <= maxAgeHours) return { state: "fresh", label: "Fresh", dot: "fresh" };
  if (hours <= maxAgeHours * 3) return { state: "aging", label: "Aging", dot: "aging" };
  return { state: "stale", label: "Outdated", dot: "stale" };
}

export const titleCase = (s) =>
  String(s).replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

export const slug = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
