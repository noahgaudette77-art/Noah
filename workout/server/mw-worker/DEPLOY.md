# Deploying the MuscleWiki token Worker

The Tempo app is static, so it cannot keep the MuscleWiki API key. This Worker keeps the key as a
Cloudflare **secret**, mints 15-minute media tokens, answers only the app's own origins, rate-limits
each IP (30 requests a minute), and counts calls per month. At **900 calls** it tells the app to show
the form-cue card instead of the video, so you never hit MuscleWiki's 1,000-call limit.

Until it is deployed, the app simply shows form-cue cards. Nothing breaks.

## Shortest route (2 steps, works from a phone)

The app already points at `https://temp-mw.noahgaudette77.workers.dev` (`src/config.ts`). The Worker exists;
it only needs Tempo's code and the key. KV storage and `ALLOWED_ORIGINS` are optional: without them the Worker
keeps its counters in Cloudflare's edge cache and answers Tempo's own addresses.

1. Worker `temp-mw` → **Edit code** → open `worker.js` → select all, delete, paste the whole of
   [`src/worker.js`](src/worker.js) (raw link:
   https://raw.githubusercontent.com/noahgaudette77-art/Noah/claude/workout-app-exercise-demos-35cf5n/workout/server/mw-worker/src/worker.js)
   → **Deploy**.
2. Worker `temp-mw` → **Settings → Variables and Secrets → Add** → type **Secret**, name `MUSCLEWIKI_API_KEY`,
   value = your MuscleWiki key → **Deploy**.

Videos start working in the app straight away; nothing else to publish.

---

The fuller routes below also add KV storage (a precise monthly count across all of Cloudflare's data centres).
Pick **one** of the two.

---

## Route A — Cloudflare dashboard, copy and paste (about 10 minutes, no tools)

1. Log in to <https://dash.cloudflare.com>. In the left menu open **Workers & Pages** (Compute).
2. **Create** → **Workers** → **Start with Hello World** → name it `tempo-mw` → **Deploy**.
3. Make the storage: left menu **Storage & Databases → KV** → **Create a namespace** → name
   `tempo-mw-kv` → **Add**.
4. Open the `tempo-mw` Worker → **Settings → Bindings → Add → KV namespace**.
   Variable name `MW_KV`, namespace `tempo-mw-kv` → **Save**.
5. Still in **Settings → Variables and Secrets → Add**:
   - Type **Secret**, name `MUSCLEWIKI_API_KEY`, value = your MuscleWiki key (starts with `mw_`). **Save.**
   - Type **Text**, name `ALLOWED_ORIGINS`, value:
     `https://noah-2ci.pages.dev,https://*.noah-2ci.pages.dev,https://noahgaudette77-art.github.io`
   - (optional, defaults shown) `CAP` = `900`, `LIMIT` = `1000`, `RATE_PER_MIN` = `30`, `STREAM_ESTIMATE` = `3`.
6. Click **Edit code** (top right). Delete everything in `worker.js`, paste the whole of
   [`src/worker.js`](src/worker.js) from this repo, then **Deploy**.
7. Copy the Worker's address, e.g. `https://tempo-mw.<your-subdomain>.workers.dev`.
8. Check it: open `https://tempo-mw.<your-subdomain>.workers.dev/mw/status` in a browser.
   You should see `{"error":"origin not allowed"}` — that is correct (a browser tab sends no allowed
   origin). The app's own requests get the real answer.
9. Tell the app where it is: put the address from step 7 in `workout/src/config.ts`
   (`export const WORKER_URL = 'https://tempo-mw.<your-subdomain>.workers.dev';`), or just tell Claude the
   address and it will commit it and rebuild `docs/`. The address is not a secret.

## Route B — let Claude deploy it (a fresh session with a scoped token)

1. Cloudflare dashboard → your profile (top right) → **My Profile → API Tokens → Create Token →
   Create Custom Token**.
2. Permissions (Account level): **Workers Scripts: Edit**, **Workers KV Storage: Edit**,
   **Account Settings: Read**. Account resources: only your account. No zone permissions needed.
   Set a TTL of a few days. **Create** and copy the token.
3. In claude.ai, open the cloud environment's settings and add it as a **network secret** for host
   `api.cloudflare.com` (header `Authorization`, prefix `Bearer`). Do not paste it in chat.
4. Add your MuscleWiki key the same way, or keep it as the `MUSCLEWIKI_API_KEY` variable it already is.
5. Start a new session and say: "Deploy the MuscleWiki Worker in workout/server/mw-worker." Claude will
   run `wrangler kv namespace create`, `wrangler secret put MUSCLEWIKI_API_KEY`, `wrangler deploy`, and
   set `WORKER_URL` in `workout/src/config.ts` and rebuild the app.

---

## What the app shows

- Settings → **Exercise demos**: "Calls used this month: N of 1,000" (from `/mw/status`).
- A video loads only when its exercise is on screen, front angle first, side on toggle, no preloading,
  paused when scrolled away.
- Each playback counts an estimate of 3 calls up front; after the video has loaded the app reports how
  many stream requests the browser actually made, and the Worker adds the difference.
- At 900 the app shows form-cue cards for the rest of the month.

## Terms it follows (MuscleWiki API Terms, 8 Oct 2026)

- The key never leaves the Worker. Videos stream directly from `api.musclewiki.com` with a token;
  nothing proxies, stores or re-hosts video bytes (§2). Only text metadata is edge-cached, ≤ 30 days (§3).
- Required disclosure, in the app's Settings → Credits & legal: "Exercise data and videos provided by
  MuscleWiki.com" (§8). The MuscleWiki mark in the video is never cropped or covered.
