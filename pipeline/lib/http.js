/**
 * The only place the pipeline touches the network.
 *
 * Rules, all deliberate:
 *   - A real, identifying User-Agent. SEC requires one; everyone deserves one.
 *   - One request at a time per host, with a floor on the gap between them.
 *   - Bounded retries with backoff on transient failures only.
 *   - A hard timeout, so a hanging host cannot stall the run.
 *   - Failures are recorded and returned, never thrown past the orchestrator:
 *     one unreachable source must not cost the other fifteen.
 */

/**
 * Several public data providers — the SEC most explicitly — require requests to
 * carry a contact address so they can reach whoever is calling them. That is a
 * reasonable condition of free access, so the pipeline honours it rather than
 * routing around it: sources that require identification skip themselves when
 * INTEL_CONTACT is unset, and the manifest says why.
 */
const CONTACT = (process.env.INTEL_CONTACT || "").trim();
export const hasContact = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(CONTACT);
export const USER_AGENT = hasContact
  ? `personal-intelligence-os/0.1 (${CONTACT})`
  : "personal-intelligence-os/0.1 (+https://github.com/noahgaudette77-art/Noah)";

const MIN_GAP_MS = Number(process.env.INTEL_MIN_GAP || 700);

/** Hosts that publish a stricter rate expectation than our default. */
const HOST_GAP_MS = {
  "export.arxiv.org": 3200,     // arXiv asks for no more than one request per 3s
  "data.sec.gov": 1200,         // SEC asks for 10/s; we stay far below it
  "www.sec.gov": 1500,
  "www.federalreserve.gov": 1200,
};

const gapFor = (host) => HOST_GAP_MS[host] ?? MIN_GAP_MS;
const lastHit = new Map();
const queues = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Serialise per host so we never open parallel connections to one server. */
function perHost(host, task) {
  const previous = queues.get(host) || Promise.resolve();
  const next = previous.then(async () => {
    const since = Date.now() - (lastHit.get(host) || 0);
    const gap = gapFor(host);
    if (since < gap) await sleep(gap - since);
    try { return await task(); } finally { lastHit.set(host, Date.now()); }
  });
  queues.set(host, next.catch(() => {}));
  return next;
}

export async function get(url, { accept = "*/*", timeout = 25_000, retries = 2, headers = {} } = {}) {
  const host = new URL(url).host;

  return perHost(host, async () => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt) await sleep(900 * Math.pow(2, attempt - 1));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Accept: accept, ...headers },
          signal: controller.signal,
          redirect: "follow",
        });
        // 403 and 406 are included deliberately: several public services use
        // them as soft rejections under load rather than as real authorisation
        // or content-negotiation failures — the same URL and headers succeed on
        // the next attempt. Retrying twice is cheap; treating a throttle as
        // permanent silently loses a source.
        if (response.status === 429 || response.status === 403
            || response.status === 406 || response.status >= 500) {
          lastError = `HTTP ${response.status}`;
          continue;
        }
        if (!response.ok) return { ok: false, status: response.status, error: `HTTP ${response.status}`, url };
        const body = await response.text();
        return { ok: true, status: response.status, body, url, bytes: body.length };
      } catch (error) {
        lastError = error.name === "AbortError" ? `timeout after ${timeout}ms` : String(error.message || error);
      } finally {
        clearTimeout(timer);
      }
    }
    return { ok: false, status: 0, error: lastError || "unreachable", url };
  });
}

export async function getJson(url, options = {}) {
  const result = await get(url, { accept: "application/json", ...options });
  if (!result.ok) return result;
  try {
    return { ...result, json: JSON.parse(result.body) };
  } catch (error) {
    return { ok: false, status: result.status, error: `invalid JSON: ${error.message}`, url };
  }
}
