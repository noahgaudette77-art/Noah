// MuscleWiki demos at runtime, through our own token Worker (server/mw-worker).
// The API key never reaches the browser. The browser gets a 15-minute media token from the Worker and
// streams the video straight from api.musclewiki.com. Nothing here stores video: the service worker
// never caches /stream/ (vite.config.ts) and the token only ever lives in the video's src.
import { useEffect, useState } from 'react';
import { WORKER_URL } from '../config';

/** Worker address (src/config.ts or VITE_MW_ENDPOINT). Empty = not deployed yet -> form-cue cards. */
export const MW_ENDPOINT: string = (import.meta.env.VITE_MW_ENDPOINT || WORKER_URL || '').replace(/\/$/, '');
export const mwLive = () => !!MW_ENDPOINT;

export interface MwMeta {
  id: number;
  name: string;
  steps: string[];
  videos: { angle: string; gender: string; url: string }[];
}
export interface Quota { used: number; cap: number; limit: number; fallback: boolean; month?: string }

const META_TTL = 30 * 24 * 3600 * 1000; // MuscleWiki terms §3: text metadata up to 30 days
const metaKey = (id: number) => `tempo.mw.meta.${id}`;
let quota: Quota | null = null;
const quotaListeners = new Set<(q: Quota | null) => void>();
const setQuota = (q: Quota | null) => { quota = q; quotaListeners.forEach((l) => l(q)); };

/** Why the last demo request fell back: 'setup' (Worker not set up yet), 'cap' (month's allowance), or another reason. */
export let lastReason = '';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${MW_ENDPOINT}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  } catch (e) {
    // online but blocked (no CORS headers): the Worker is not running Tempo's code yet
    if (typeof navigator !== 'undefined' && navigator.onLine) { lastReason = 'setup'; return { fallback: true, reason: 'setup' } as T; }
    throw e;
  }
  const body = await r.json().catch(() => null);
  // not JSON (e.g. the Worker still runs Cloudflare's sample) or not configured yet: the service is not set up
  if (body === null) { lastReason = 'setup'; return { fallback: true, reason: 'setup' } as T; }
  if (body.fallback) lastReason = body.reason === 'monthly cap' ? 'cap' : body.reason === 'not configured' ? 'setup' : body.reason ?? '';
  if (!r.ok && !body.fallback) throw new Error(`demo service ${r.status}`);
  return body as T;
}

export async function getMeta(mwId: number): Promise<MwMeta | null> {
  try {
    const c = JSON.parse(localStorage.getItem(metaKey(mwId)) ?? 'null');
    if (c && Date.now() - c.t < META_TTL) return c.m as MwMeta;
  } catch { /* ignore */ }
  const m = await call<MwMeta & { fallback?: boolean }>(`/mw/exercise/${mwId}`);
  if (m.fallback || !m.videos) return null;
  try { localStorage.setItem(metaKey(mwId), JSON.stringify({ t: Date.now(), m: { id: m.id, name: m.name, steps: m.steps, videos: m.videos } })); } catch { /* full */ }
  return m;
}

/** A playable src for one angle, or null when the month's cap is reached / the Worker says fall back. */
export async function playSrc(meta: MwMeta, angle: 'front' | 'side'): Promise<string | null> {
  const v = meta.videos.find((x) => x.angle === angle && x.gender === 'male') ?? meta.videos.find((x) => x.angle === angle) ?? meta.videos[0];
  if (!v) return null;
  // Every playback goes through /mw/play so the Worker counts it against the month; the Worker hands
  // back its shared token (re-minted only near expiry).
  const r = await call<{ token?: string; expires_in?: number; used?: number; cap?: number; limit?: number; fallback?: boolean }>(`/mw/play/${meta.id}?angle=${angle}`);
  if (r.used != null) setQuota({ used: r.used, cap: r.cap ?? 900, limit: r.limit ?? 1000, fallback: !!r.fallback });
  if (r.fallback || !r.token) return null;
  return `${v.url}${v.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(r.token)}`;
}

/**
 * After a video has loaded, count the stream requests the browser really made for it (Resource Timing,
 * where the browser exposes them) and report the difference from the Worker's up-front estimate.
 */
export function reportStreamUse(src: string, estimate = 3) {
  try {
    const path = new URL(src).pathname;
    const n = performance.getEntriesByType('resource').filter((e) => e.name.includes(path)).length;
    if (n > estimate) void call('/mw/report', { method: 'POST', body: JSON.stringify({ requests: n, estimate }) }).catch(() => undefined);
  } catch { /* ignore */ }
}

export async function fetchQuota(): Promise<Quota | null> {
  if (!mwLive()) return null;
  try {
    const r = await call<Quota>('/mw/status');
    setQuota(r);
    return r;
  } catch { return null; }
}

export function useQuota() {
  const [q, setQ] = useState<Quota | null>(quota);
  useEffect(() => { quotaListeners.add(setQ); if (!quota) void fetchQuota(); return () => { quotaListeners.delete(setQ); }; }, []);
  return q;
}

export function useOnline() {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true), b = () => setOn(false);
    addEventListener('online', a); addEventListener('offline', b);
    return () => { removeEventListener('online', a); removeEventListener('offline', b); };
  }, []);
  return on;
}
