// The MuscleWiki token Worker, against an in-memory KV, Cache and a fake MuscleWiki.
import { beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error plain JS module
import worker from '../server/mw-worker/src/worker.js';

const ORIGIN = 'https://noah-2ci.pages.dev';
function kv() {
  const m = new Map<string, string>();
  return {
    m,
    get: async (k: string, type?: string) => (m.has(k) ? (type === 'json' ? JSON.parse(m.get(k)!) : m.get(k)!) : null),
    put: async (k: string, v: string) => { m.set(k, v); },
  };
}
let env: Record<string, unknown>;
let upstream: { path: string; key: string | null }[];
const ctx = { waitUntil: (p: Promise<unknown>) => p };

beforeEach(() => {
  env = { MUSCLEWIKI_API_KEY: 'mw_test_secret_key', MW_KV: kv(), ALLOWED_ORIGINS: `${ORIGIN},https://*.noah-2ci.pages.dev`, CAP: '900', LIMIT: '1000', STREAM_ESTIMATE: '3', RATE_PER_MIN: '30' };
  upstream = [];
  const store = new Map<string, Response>();
  vi.stubGlobal('caches', { default: { match: async (r: Request) => store.get(r.url)?.clone(), put: async (r: Request, res: Response) => { store.set(r.url, res); } } });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    upstream.push({ path: u.pathname, key: (init?.headers as Record<string, string>)?.['X-API-Key'] ?? null });
    if (u.pathname === '/media/token') return new Response(JSON.stringify({ token: 'tok123', expires_in: 900 }), { status: 200 });
    if (u.pathname.startsWith('/exercises/')) return new Response(JSON.stringify({ id: 398, name: 'Dumbbell Incline Bench Press', category: 'Dumbbells', steps: ['a'], videos: [{ url: 'https://api.musclewiki.com/stream/videos/branded/x-front.mp4', angle: 'front', gender: 'male', og_image: 'x' }] }), { status: 200 });
    return new Response('{}', { status: 404 });
  });
});

const call = (path: string, init: RequestInit = {}, origin = ORIGIN, ip = '1.2.3.4') =>
  worker.fetch(new Request(`https://tempo-mw.example.workers.dev${path}`, { ...init, headers: { Origin: origin, 'CF-Connecting-IP': ip, ...(init.headers ?? {}) } }), env, ctx);

describe('mw worker', () => {
  it('answers only allowed origins (and branch previews)', async () => {
    expect((await call('/mw/status', {}, 'https://evil.example')).status).toBe(403);
    expect((await call('/mw/status', {}, '')).status).toBe(403);
    expect((await call('/mw/status', {}, 'https://claude-x.noah-2ci.pages.dev')).status).toBe(200);
  });
  it('never returns the API key', async () => {
    for (const p of ['/mw/status', '/mw/exercise/398', '/mw/play/398']) {
      const t = await (await call(p)).text();
      expect(t).not.toContain('mw_test_secret_key');
    }
  });
  it('mints one token and reuses it; counts each playback against the month', async () => {
    const a = await (await call('/mw/play/398?angle=front')).json();
    const b = await (await call('/mw/play/398?angle=side')).json();
    expect(a.token).toBe('tok123');
    expect(b.token).toBe('tok123');
    expect(upstream.filter((u) => u.path === '/media/token')).toHaveLength(1);
    expect(upstream.every((u) => u.key === 'mw_test_secret_key')).toBe(true);
    expect(b.used).toBe(1 + 3 + 3); // one mint + two playback estimates
  });
  it('edge-caches metadata (text only) so a second request costs nothing', async () => {
    const a = await (await call('/mw/exercise/398')).json();
    await call('/mw/exercise/398');
    expect(a.name).toBe('Dumbbell Incline Bench Press');
    expect(a.videos[0]).not.toHaveProperty('og_image');
    expect(upstream.filter((u) => u.path === '/exercises/398')).toHaveLength(1);
  });
  it('falls back to the form card at the 900-call cap instead of failing', async () => {
    const month = new Date().toISOString().slice(0, 7);
    await (env.MW_KV as ReturnType<typeof kv>).put(`calls:${month}`, '898');
    const r = await call('/mw/play/398');
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.fallback).toBe(true);
    expect(j.token).toBeUndefined();
    expect(upstream).toHaveLength(0);
    expect((await (await call('/mw/status')).json()).fallback).toBe(true);
  });
  it('adds the stream requests the browser reported beyond the estimate', async () => {
    await call('/mw/play/398');
    const r = await (await call('/mw/report', { method: 'POST', body: JSON.stringify({ requests: 7, estimate: 3 }) })).json();
    expect(r.used).toBe(1 + 3 + 4);
  });
  it('rate-limits per IP', async () => {
    env.RATE_PER_MIN = '3';
    for (let i = 0; i < 3; i++) expect((await call('/mw/status')).status).toBe(200);
    expect((await call('/mw/status')).status).toBe(429);
    expect((await call('/mw/status', {}, ORIGIN, '5.6.7.8')).status).toBe(200);
  });
  it('works with only the key set: no KV (edge cache instead) and default origins', async () => {
    delete env.MW_KV; delete env.ALLOWED_ORIGINS;
    expect((await call('/mw/status', {}, 'https://evil.example')).status).toBe(403);
    const a = await (await call('/mw/play/398', {}, 'https://noahgaudette77-art.github.io')).json();
    const b = await (await call('/mw/play/398', {}, 'https://noahgaudette77-art.github.io')).json();
    expect(a.token).toBe('tok123');
    expect(upstream.filter((u) => u.path === '/media/token')).toHaveLength(1);
    expect(b.used).toBe(1 + 3 + 3);
  });
  it('falls back cleanly when not configured', async () => {
    delete env.MUSCLEWIKI_API_KEY;
    const j = await (await call('/mw/play/398')).json();
    expect(j.fallback).toBe(true);
  });
});
