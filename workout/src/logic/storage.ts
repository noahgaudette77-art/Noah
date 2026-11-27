import type { BodyEntry, HabitDay, SessionLog } from '../data/types';

export const STORAGE_KEY = 'tempo.v1';
export const SCHEMA_VERSION = 1;

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** tempo ticks and countdown beeps (off by default) */
  ticks: boolean;
}

export interface AppState {
  version: number;
  sessions: SessionLog[];
  active: SessionLog | null;
  body: BodyEntry[];
  habits: Record<string, HabitDay>;
  settings: Settings;
}

export const emptyState = (): AppState => ({
  version: SCHEMA_VERSION,
  sessions: [],
  active: null,
  body: [],
  habits: {},
  settings: { sound: true, haptics: true, ticks: false },
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isISO = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Validate and normalise anything that claims to be app data. Throws with a readable message. */
export function parseState(raw: unknown): AppState {
  if (!isObj(raw)) throw new Error('File is not a Tempo backup.');
  const base = emptyState();
  const v = typeof raw.version === 'number' ? raw.version : 0;
  if (v > SCHEMA_VERSION) throw new Error('This backup is from a newer version of the app.');
  const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  for (const s of sessions) {
    if (!isObj(s) || !isISO(s.date) || typeof s.dayKey !== 'string' || !Array.isArray(s.exercises)) {
      throw new Error('A logged session in this file is malformed.');
    }
  }
  const body = Array.isArray(raw.body) ? raw.body.filter((b) => isObj(b) && isISO(b.date)) : [];
  return {
    version: SCHEMA_VERSION,
    sessions: sessions as SessionLog[],
    active: isObj(raw.active) ? (raw.active as unknown as SessionLog) : null,
    body: body as BodyEntry[],
    habits: isObj(raw.habits) ? (raw.habits as Record<string, HabitDay>) : {},
    settings: { ...base.settings, ...(isObj(raw.settings) ? (raw.settings as Partial<Settings>) : {}) },
  };
}

export function load(): AppState {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    return txt ? parseState(JSON.parse(txt)) : emptyState();
  } catch {
    return emptyState();
  }
}

export function save(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep running in memory */
  }
}

/** Merge an imported backup into current data: sessions by id, body and habits by date. */
export function mergeStates(cur: AppState, inc: AppState): AppState {
  const sessions = new Map(cur.sessions.map((s) => [s.id, s]));
  inc.sessions.forEach((s) => sessions.set(s.id, s));
  const body = new Map(cur.body.map((b) => [b.date, b]));
  inc.body.forEach((b) => body.set(b.date, { ...body.get(b.date), ...b }));
  return {
    ...cur,
    sessions: [...sessions.values()].sort((a, b) => a.startedAt - b.startedAt),
    body: [...body.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
    habits: { ...cur.habits, ...inc.habits },
  };
}
