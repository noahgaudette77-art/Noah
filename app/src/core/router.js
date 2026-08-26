/**
 * Hash routing. Hash rather than history API because the app must work when
 * dropped on any static host (including a `file://` open) with no rewrite rules.
 *
 * Route shape:  #/markets/yields?range=5y
 *   → { path: "/markets/yields", segments: ["markets","yields"], params: URLSearchParams }
 */

const routes = [];
let notFound = null;
let current = null;
const listeners = new Set();

export function define(pattern, handler, meta = {}) {
  // "/company/:ticker" → /^\/company\/([^/]+)$/
  const keys = [];
  const source = pattern
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) { keys.push(part.slice(1)); return "([^/]+)"; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  routes.push({ pattern, regex: new RegExp(`^${source}$`), keys, handler, meta });
}

export function fallback(handler) { notFound = handler; }

export function parse(hash) {
  const raw = (hash || location.hash || "#/").replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return {
    path: path.length > 1 ? path.replace(/\/+$/, "") : path,
    params: new URLSearchParams(queryPart),
    segments: path.split("/").filter(Boolean),
  };
}

export function resolve(path) {
  for (const route of routes) {
    const match = route.regex.exec(path);
    if (!match) continue;
    const values = {};
    route.keys.forEach((key, index) => { values[key] = decodeURIComponent(match[index + 1]); });
    return { route, values };
  }
  return null;
}

export function go(to, { replace = false } = {}) {
  const target = to.startsWith("#") ? to : `#${to.startsWith("/") ? to : `/${to}`}`;
  if (replace) history.replaceState(null, "", target);
  else location.hash = target;
  if (replace) dispatch();
}

/** Rewrite a query parameter on the current route without a full navigation. */
export function setParam(key, value) {
  const { path, params } = parse();
  if (value === null || value === undefined || value === "") params.delete(key);
  else params.set(key, value);
  const query = params.toString();
  history.replaceState(null, "", `#${path}${query ? `?${query}` : ""}`);
  current = { ...parse(), ...resolve(path) };
}

export const currentRoute = () => current;
export function onNavigate(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function dispatch() {
  const parsed = parse();
  const matched = resolve(parsed.path);
  current = { ...parsed, route: matched?.route || null, values: matched?.values || {} };
  const handler = matched ? matched.route.handler : notFound;
  if (handler) handler(current);
  for (const fn of listeners) fn(current);
}

export function start() {
  window.addEventListener("hashchange", dispatch);
  if (!location.hash) history.replaceState(null, "", "#/");
  dispatch();
}
