/**
 * Observable state with namespaced localStorage persistence.
 *
 * Two stores exist: `session` (ephemeral view state) and `profile` (the user's
 * durable record — mastery, XP, watchlist, settings). Only `profile` persists.
 * Reads and writes are wrapped because storage throws in private windows and
 * in embedded contexts.
 */

const NS = "pios.v1";

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(`${NS}.${key}`);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(`${NS}.${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota, private mode, or blocked site data — never fatal
  }
}

export function createStore({ key = null, initial = {} } = {}) {
  let state = key ? { ...initial, ...readStorage(key, {}) } : { ...initial };
  const listeners = new Set();
  let queued = false;

  function notify() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      for (const fn of listeners) fn(state);
    });
  }

  return {
    get: () => state,
    /** Path read: get("learning.xp", 0) */
    at(path, fallback) {
      return path.split(".").reduce(
        (node, part) => (node && node[part] !== undefined ? node[part] : undefined),
        state
      ) ?? fallback;
    },
    set(patch) {
      const next = typeof patch === "function" ? patch(state) : patch;
      let changed = false;
      for (const [k, v] of Object.entries(next)) {
        if (state[k] !== v) changed = true;
      }
      if (!changed) return state;
      state = { ...state, ...next };
      if (key) writeStorage(key, state);
      notify();
      return state;
    },
    /** Merge into a nested object key without clobbering siblings. */
    merge(field, patch) {
      return this.set({ [field]: { ...(state[field] || {}), ...patch } });
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset() {
      state = { ...initial };
      if (key) writeStorage(key, state);
      notify();
    },
    export: () => JSON.parse(JSON.stringify(state)),
    import(data) {
      state = { ...initial, ...data };
      if (key) writeStorage(key, state);
      notify();
    },
  };
}

/* --- The two application stores ------------------------------------------ */

export const profile = createStore({
  key: "profile",
  initial: {
    createdAt: null,
    settings: {
      theme: "dark",
      density: "default",
      level: "intermediate",     // default depth for EXPLAIN
      rail: "expanded",
      regions: ["us", "canada", "europe", "china"],
      interests: [],
      serendipity: true,          // deliberately break the filter bubble
    },
    learning: {
      xp: 0,
      mastery: {},                // conceptId → { seen, correct, wrong, ease, due, streak }
      answered: {},               // questionId → { at, correct }
      lessonsRead: [],
      lastActive: null,
      streak: 0,
      bestStreak: 0,
      days: [],                   // ISO dates with recorded activity
      badges: [],
    },
    watchlist: [],                // { ticker, name, addedAt, note }
    research: [],                 // { id, title, createdAt, items[], notes[] }
    forecasts: [],                // { id, claim, madeAt, horizon, confidence, basis, resolution }
    scenarios: [],                // saved simulator runs
    seen: {},                     // storyId → timestamp, powers "since you were last here"
    lastVisit: null,
  },
});

export const session = createStore({
  initial: {
    route: null,
    datasets: {},                 // name → { status, data, error, loadedAt }
    drawer: null,
    palette: false,
    query: "",
  },
});

export const storageAvailable = writeStorage("probe", 1);
