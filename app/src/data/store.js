/**
 * Dataset loading and status.
 *
 * Loads are cached, deduplicated and non-fatal. A 404 is `absent`, not `error`:
 * before the pipeline has ever run, every dataset is legitimately missing and the
 * interface should say so calmly rather than showing a failure.
 */

import { DATASETS, dataUrl, STATUS } from "./registry.js";
import { session } from "../core/store.js";

const cache = new Map();     // key → { status, data, error, loadedAt }
const inflight = new Map();

function publish(key, entry) {
  cache.set(key, entry);
  session.merge("datasets", { [key]: entry });
  return entry;
}

export function statusOf(key) {
  return cache.get(key) || { status: STATUS.IDLE, data: null, error: null, loadedAt: null };
}

export function dataOf(key) {
  return cache.get(key)?.data ?? null;
}

export async function load(key, { force = false } = {}) {
  if (!DATASETS[key]) throw new Error(`Unknown dataset: ${key}`);
  if (!force && cache.has(key) && cache.get(key).status !== STATUS.IDLE) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  publish(key, { status: STATUS.LOADING, data: null, error: null, loadedAt: null });

  const promise = (async () => {
    try {
      const response = await fetch(dataUrl(key), { cache: force ? "reload" : "default" });
      if (response.status === 404) {
        return publish(key, { status: STATUS.ABSENT, data: null, error: null, loadedAt: Date.now() });
      }
      if (!response.ok) {
        return publish(key, {
          status: STATUS.ERROR, data: null,
          error: `HTTP ${response.status}`, loadedAt: Date.now(),
        });
      }
      const data = await response.json();
      return publish(key, { status: STATUS.READY, data, error: null, loadedAt: Date.now() });
    } catch (error) {
      // A file:// open or an offline load lands here. Absent, not broken.
      const absent = error instanceof TypeError;
      return publish(key, {
        status: absent ? STATUS.ABSENT : STATUS.ERROR,
        data: null, error: absent ? null : String(error.message || error),
        loadedAt: Date.now(),
      });
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function loadAll(keys) {
  return Promise.all(keys.map((key) => load(key)));
}

/** One line summarising the state of every dataset, for the status bar. */
export function coverage() {
  const keys = Object.keys(DATASETS);
  const ready = keys.filter((key) => statusOf(key).status === STATUS.READY);
  const absent = keys.filter((key) => statusOf(key).status === STATUS.ABSENT);
  const failed = keys.filter((key) => statusOf(key).status === STATUS.ERROR);
  return { total: keys.length, ready: ready.length, absent: absent.length, failed: failed.length, keys: { ready, absent, failed } };
}

export { STATUS, DATASETS };
