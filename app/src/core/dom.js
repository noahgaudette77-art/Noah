/**
 * A ~100-line hyperscript layer. No virtual DOM: views are pure functions that
 * return real nodes, and the router swaps a subtree. That is fast enough for
 * data-dense panels and removes an entire class of framework dependency.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "text",
  "defs", "linearGradient", "radialGradient", "stop", "clipPath", "tspan",
  "ellipse", "use", "marker", "filter", "feGaussianBlur", "feMerge",
  "feMergeNode", "animate", "title", "foreignObject",
]);

/** h("div.panel#id", {onclick}, child, [children]) → Element */
export function h(spec, props, ...children) {
  const [tag, ...rest] = String(spec).split(/(?=[.#])/);
  const name = tag || "div";
  const el = SVG_TAGS.has(name)
    ? document.createElementNS(SVG_NS, name)
    : document.createElement(name);

  for (const token of rest) {
    if (token[0] === ".") el.classList.add(token.slice(1));
    else if (token[0] === "#") el.id = token.slice(1);
  }

  if (props && (props.nodeType || Array.isArray(props) || typeof props === "string")) {
    children.unshift(props);
    props = null;
  }

  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class" || key === "className") {
      String(value).split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
    } else if (key === "style" && typeof value === "object") {
      Object.assign(el.style, value);
    } else if (key === "dataset") {
      for (const [k, v] of Object.entries(value)) {
        if (v !== null && v !== undefined) el.dataset[k] = v;
      }
    } else if (key === "html") {
      el.innerHTML = value; // only ever called with strings this module built
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in el && !SVG_TAGS.has(name) && typeof value !== "object") {
      try { el[key] = value; } catch { el.setAttribute(key, value); }
    } else {
      el.setAttribute(key, value === true ? "" : value);
    }
  }

  append(el, children);
  return el;
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false || child === true) continue;
    parent.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Replace everything inside `parent` with `children`. */
export function mount(parent, ...children) {
  parent.replaceChildren();
  append(parent, children);
  return parent;
}

export const frag = (...children) => append(document.createDocumentFragment(), children);

/** Inline icon set — 16px stroke geometry, sized by the caller's font-size. */
const ICONS = {
  command: "M8 3H6a3 3 0 1 0 3 3v4a3 3 0 1 0-3 3h2m0-10v10m0-10h4m-4 10h4m0-10V6a3 3 0 1 1 3 3h-3m0 0v4a3 3 0 1 0 3-3",
  search: "M7.5 13a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM14 14l-2.6-2.6",
  grid: "M2.5 2.5h5v5h-5zM8.5 2.5h5v5h-5zM2.5 8.5h5v5h-5zM8.5 8.5h5v5h-5z",
  pulse: "M1 8h3l2-5 3 10 2-5h4",
  calendar: "M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 1.5v3M10.5 1.5v3",
  chart: "M2 13.5V3M2 13.5h12M4.5 11V7M7.5 11V4.5M10.5 11V8.5M13 11V5.5",
  building: "M2.5 13.5V4l5-2.5V13.5M7.5 13.5V6l6 2v5.5M1 13.5h14M4.5 6.5h1M4.5 9h1M10 9.5h1M10 11.5h1",
  target: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 8h.01",
  globe: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM2.2 6.5h11.6M2.2 9.5h11.6M8 2c1.7 1.8 2.5 3.9 2.5 6S9.7 12.2 8 14c-1.7-1.8-2.5-3.9-2.5-6S6.3 3.8 8 2Z",
  cpu: "M4.5 4.5h7v7h-7zM6.5 1.5v3M9.5 1.5v3M6.5 11.5v3M9.5 11.5v3M1.5 6.5h3M1.5 9.5h3M11.5 6.5h3M11.5 9.5h3",
  horizon: "M1 11h14M3 8.5h10M5 6h6M7 3.5h2",
  book: "M8 4C6.6 2.7 4.8 2.2 2.5 2.5v9c2.3-.3 4.1.2 5.5 1.5 1.4-1.3 3.2-1.8 5.5-1.5v-9C11.2 2.2 9.4 2.7 8 4ZM8 4v9",
  graph: "M4 4.5a2 2 0 1 0 0-.1ZM12.5 4.5a2 2 0 1 0 0-.1ZM8 12.5a2 2 0 1 0 0-.1ZM5.6 5.6l5.2-.6M5.2 6.3 7.2 10.6M10.8 6l-2 4.6",
  flask: "M6.5 1.5v4.2L2.8 12A1.5 1.5 0 0 0 4.1 14.2h7.8A1.5 1.5 0 0 0 13.2 12L9.5 5.7V1.5M5.5 1.5h5M4.6 9.5h6.8",
  layers: "M8 1.8 1.8 5 8 8.2 14.2 5 8 1.8ZM1.8 8 8 11.2 14.2 8M1.8 11 8 14.2 14.2 11",
  bookmark: "M4 1.8h8v12.4L8 11l-4 3.2V1.8Z",
  scale: "M8 2v12M4 5h8M4 5 2 9.5h4L4 5ZM12 5l-2 4.5h4L12 5ZM5 14h6",
  archive: "M1.8 3h12.4v3H1.8zM3 6v7.5h10V6M6.2 8.8h3.6",
  spark: "M8 1.5 9.6 6l4.5 1.6L9.6 9.2 8 13.7 6.4 9.2 1.9 7.6 6.4 6 8 1.5Z",
  chevron: "M6 3.5 10.5 8 6 12.5",
  close: "M3.5 3.5l9 9M12.5 3.5l-9 9",
  external: "M6.5 3.5h-3v9h9v-3M9.5 2.5h4v4M13.5 2.5 7.5 8.5",
  refresh: "M13.5 8a5.5 5.5 0 1 1-1.7-4M13.5 2v4h-4",
  check: "M3 8.5 6.5 12 13 4.5",
  alert: "M8 5.5v3.5M8 11.5h.01M8 1.8 1.5 13.2h13L8 1.8Z",
  layers2: "M2 8h12M8 2v12",
  menu: "M2 4h12M2 8h12M2 12h12",
  sun: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.9 3.1l-1 1M4.1 11.9l-1 1M12.9 12.9l-1-1M4.1 4.1l-1-1",
  moon: "M13.5 9.7A6 6 0 1 1 6.3 2.5a4.7 4.7 0 0 0 7.2 7.2Z",
  plus: "M8 3v10M3 8h10",
  minus: "M3 8h10",
  filter: "M2 3.5h12l-4.6 5.2v4.3L6.6 11.4V8.7L2 3.5Z",
  clock: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM8 4.8V8l2.2 1.6",
  brain: "M6.5 2.2A2.2 2.2 0 0 0 4.3 4.4 2 2 0 0 0 3 6.2a2 2 0 0 0 .9 1.7A2 2 0 0 0 3.4 11a2.1 2.1 0 0 0 1.9 1.3 2 2 0 0 0 3.2.3V2.9a2 2 0 0 0-2-.7ZM9.5 2.2a2.2 2.2 0 0 1 2.2 2.2 2 2 0 0 1 1.3 1.8 2 2 0 0 1-.9 1.7 2 2 0 0 1 .5 3.1 2.1 2.1 0 0 1-1.9 1.3 2 2 0 0 1-3.2.3",
};

export function icon(name, size = 14) {
  const d = ICONS[name] || ICONS.grid;
  return h("svg", {
    width: size, height: size, viewBox: "0 0 16 16", fill: "none",
    stroke: "currentColor", "stroke-width": 1.4,
    "stroke-linecap": "round", "stroke-linejoin": "round",
    "aria-hidden": "true", focusable: "false",
  }, h("path", { d }));
}

export function delegate(root, selector, type, handler) {
  root.addEventListener(type, (event) => {
    const match = event.target.closest(selector);
    if (match && root.contains(match)) handler(event, match);
  });
}

/** Escapes text for the rare places we build an HTML string (search highlight). */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
