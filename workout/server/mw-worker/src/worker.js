// Tempo × MuscleWiki token Worker.
//
// Why it exists: MuscleWiki's API terms forbid shipping the API key to the browser and forbid
// hosting or caching their videos. Their supported pattern is a short-lived media token minted by
// our own backend; the browser then streams the video straight from api.musclewiki.com.
//
// What it does:
//   GET  /mw/status            -> { live, used, limit, cap, month }
//   GET  /mw/exercise/:id      -> exercise metadata (name, steps, video stream URLs). Text only,
//                                 edge-cached up to 30 days (their §3 allows metadata for 30 days).
//   GET  /mw/play/:id?angle=   -> { token, expires_in, src, used, cap } or { fallback: true, reason }
//                                 The token (15 min) is reused across plays until near expiry.
//   POST /mw/report            -> { requests, estimate } after a playback: corrects the monthly count
//                                 with the stream requests the browser actually made.
//
// Guards: answers only ALLOWED_ORIGINS, rate-limits per IP, and keeps a monthly call count in KV.
// At CAP (default 900 of the 1,000 monthly calls) /mw/play returns { fallback: true } and the app
// shows its form-cue card instead of failing.
//
// Secrets / bindings (see DEPLOY.md):
//   MUSCLEWIKI_API_KEY  secret   the key (never returned, never logged)
//   MW_KV               KV       counters + the shared media token
//   ALLOWED_ORIGINS     var      comma-separated origins, e.g. https://noah-2ci.pages.dev
//   CAP, LIMIT, STREAM_ESTIMATE, RATE_PER_MIN  vars (optional)

const MW = 'https://api.musclewiki.com';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowed = allowedOrigin(origin, env);
    const cors = allowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400' } : {};
    const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors, ...extra } });

    if (req.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });
    if (!allowed) return json({ error: 'origin not allowed' }, 403);
    if (!url.pathname.startsWith('/mw/')) return json({ error: 'not found' }, 404);
    if (!env.MUSCLEWIKI_API_KEY || !env.MW_KV) return json({ fallback: true, reason: 'not configured' }, 503);

    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    if (!(await rateOk(env, ip))) return json({ error: 'rate limited', fallback: true, reason: 'rate' }, 429, { 'Retry-After': '60' });

    const cap = num(env.CAP, 900), limit = num(env.LIMIT, 1000);
    const month = new Date().toISOString().slice(0, 7);
    const counterKey = `calls:${month}`;
    const used = async () => num(await env.MW_KV.get(counterKey), 0);
    const add = async (n) => { if (n <= 0) return used(); const v = (await used()) + n; await env.MW_KV.put(counterKey, String(v), { expirationTtl: 60 * 60 * 24 * 62 }); return v; };

    try {
      if (url.pathname === '/mw/status') {
        const u = await used();
        return json({ live: true, used: u, limit, cap, month, fallback: u + num(env.STREAM_ESTIMATE, 3) > cap });
      }

      let m = url.pathname.match(/^\/mw\/exercise\/(\d{1,6})$/);
      if (m && req.method === 'GET') {
        const id = m[1];
        const cache = caches.default;
        const ck = new Request(`https://mw-meta.cache/exercise/${id}`);
        const hit = await cache.match(ck);
        if (hit) return json(await hit.json(), 200, { 'x-cache': 'hit' });
        if ((await used()) >= cap) return json({ fallback: true, reason: 'monthly cap' }, 200);
        const r = await fetch(`${MW}/exercises/${id}`, { headers: { 'X-API-Key': env.MUSCLEWIKI_API_KEY } });
        await add(1);
        if (!r.ok) return json({ error: `musclewiki ${r.status}`, fallback: true, reason: 'upstream' }, 502);
        const d = await r.json();
        const meta = {
          id: d.id, name: d.name, category: d.category, steps: d.steps || [],
          videos: (d.videos || []).map((v) => ({ angle: v.angle, gender: v.gender, url: v.url })),
          attribution: 'Exercise data and videos provided by MuscleWiki.com',
        };
        // text metadata only, 30 days at the edge (MuscleWiki terms §3)
        ctx.waitUntil(cache.put(ck, new Response(JSON.stringify(meta), { headers: { 'cache-control': 'public, max-age=2592000' } })));
        return json(meta);
      }

      m = url.pathname.match(/^\/mw\/play\/(\d{1,6})$/);
      if (m && req.method === 'GET') {
        const estimate = num(env.STREAM_ESTIMATE, 3);
        const u0 = await used();
        if (u0 + estimate > cap) return json({ fallback: true, reason: 'monthly cap', used: u0, cap });
        const tok = await mediaToken(env, add);
        if (!tok) return json({ fallback: true, reason: 'token' }, 502);
        const u = await add(estimate);
        return json({ token: tok.token, expires_in: tok.expires_in, used: u, cap, limit });
      }

      if (url.pathname === '/mw/report' && req.method === 'POST') {
        const b = await req.json().catch(() => ({}));
        const extra = Math.min(50, Math.max(0, Math.round(num(b.requests, 0) - num(b.estimate, 3))));
        const u = await add(extra);
        return json({ used: u, cap, limit });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'worker error', fallback: true, reason: 'error' }, 500);
    }
  },
};

/** One media token shared by all plays until 60 s before it expires. Minting counts as one call. */
async function mediaToken(env, add) {
  const cached = await env.MW_KV.get('media-token', 'json');
  if (cached && cached.exp - Date.now() > 60_000) return { token: cached.token, expires_in: Math.floor((cached.exp - Date.now()) / 1000) };
  const r = await fetch(`${MW}/media/token`, { method: 'POST', headers: { 'X-API-Key': env.MUSCLEWIKI_API_KEY } });
  await add(1);
  if (!r.ok) return null;
  const d = await r.json();
  const exp = Date.now() + d.expires_in * 1000;
  await env.MW_KV.put('media-token', JSON.stringify({ token: d.token, exp }), { expirationTtl: Math.max(60, d.expires_in - 30) });
  return { token: d.token, expires_in: d.expires_in };
}

async function rateOk(env, ip) {
  const per = num(env.RATE_PER_MIN, 30);
  const k = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const n = num(await env.MW_KV.get(k), 0);
  if (n >= per) return false;
  await env.MW_KV.put(k, String(n + 1), { expirationTtl: 120 });
  return true;
}

function allowedOrigin(origin, env) {
  if (!origin) return false;
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.some((o) => {
    if (o === origin) return true;
    // "https://*.example.pages.dev" allows branch previews
    const m = o.match(/^(https?:\/\/)\*\.(.+)$/);
    return !!m && origin.startsWith(m[1]) && origin.endsWith('.' + m[2]);
  });
}

const num = (v, d) => (v == null || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
