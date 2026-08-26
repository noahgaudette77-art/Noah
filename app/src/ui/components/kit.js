/** Shared building blocks. Every view composes from here so the language stays consistent. */

import { h, icon, mount } from "../../core/dom.js";
import { ago, date as fmtDate, freshness, num, pct } from "../../core/format.js";
import { source as findSource, tierMeta } from "../../content/sources.js";
import { LEVELS as CONFIDENCE_LEVELS } from "../../domain/confidence.js";

export function panel({ title, sub, actions, body, foot, flush = false, className = "" }) {
  return h(`section.panel${className ? `.${className.split(" ").join(".")}` : ""}`, null,
    (title || actions) && h("header.panel__head", null,
      title && h("h3.panel__title", title),
      sub && h("span.panel__sub", sub),
      actions && h("div.row-s.push", null, actions)
    ),
    h(`div.panel__body${flush ? ".panel__body--flush" : ""}`, null, body),
    foot && h("footer.panel__foot", null, foot)
  );
}

export function sectionHead(title, sub, actions) {
  return h("div.sect", null,
    h("h2", title),
    sub && h("p", sub),
    actions && h("div.row-s.push", null, actions)
  );
}

export function pageHead(title, lede, actions) {
  return h("header.pagehead", null,
    h("div.spread", null,
      h("h1", title),
      actions && h("div.row-s", null, actions)
    ),
    lede && h("p.pagehead__lede", lede)
  );
}

export function stat({ label, value, delta, note, unit, large = false, tone = "" }) {
  return h("div.stat", null,
    h("span.stat__label", label),
    h("span", { class: `stat__value ${large ? "stat__value--lg" : ""} ${tone}`.trim() },
      value, unit && h("span.dim", { style: { fontSize: "0.62em", marginLeft: "2px" } }, unit)),
    delta !== undefined && delta !== null && h("span", { class: `stat__delta ${deltaTone(delta)}` }, delta),
    note && h("span.stat__note", note)
  );
}

const deltaTone = (delta) => {
  const text = String(delta);
  if (text.startsWith("+")) return "up";
  if (text.startsWith("-") || text.startsWith("−")) return "down";
  return "dim";
};

export function badge(text, variant = "") {
  return h(`span.badge${variant ? `.badge--${variant}` : ""}`, text);
}

export function chip(text, { pressed = false, onclick = null, title = null } = {}) {
  return h(onclick ? "button.chip" : "span.chip",
    { onclick, "aria-pressed": onclick ? String(pressed) : null, title, type: onclick ? "button" : null },
    text);
}

/** Confidence as three bars plus a tooltip that explains what the level means. */
export function confidence(level, { withLabel = false } = {}) {
  const meta = CONFIDENCE_LEVELS[level] || CONFIDENCE_LEVELS.low;
  return h("span.row-s", { title: `${meta.label} — ${meta.note}` },
    h("span.conf", { "data-level": level, "aria-label": meta.label },
      h("i"), h("i"), h("i")),
    withLabel && h("span.dim", { style: { fontSize: "var(--t-tiny)" } }, meta.label)
  );
}

/** Freshness dot bound to the datum's own shelf life, never to the page load. */
export function fresh(timestamp, maxAgeHours = 24, { withLabel = true } = {}) {
  const state = freshness(timestamp, maxAgeHours);
  return h("span.row-s", { title: timestamp ? `${state.label} — ${fmtDate(timestamp)}` : state.label },
    h("span", { class: `dot dot--${state.dot}` }),
    withLabel && h("span.dim", { style: { fontSize: "var(--t-tiny)" } },
      timestamp ? ago(timestamp) : state.label)
  );
}

/** A citation carries the tier, because "a source" and "the source" are different claims. */
export function cite(sourceId, { url = null, label = null, at = null } = {}) {
  const entry = findSource(sourceId);
  const tier = entry?.tier ?? 4;
  const text = label || entry?.name || sourceId;
  const href = url || entry?.url;
  const meta = tierMeta(tier);
  const inner = [
    h("span", { class: `tier tier--${tier}` }, `T${tier}`),
    h("span.truncate", { style: { maxWidth: "22ch" } }, text),
    at && h("span.faint", ago(at)),
  ];
  return href
    ? h("a.cite", { href, target: "_blank", rel: "noopener noreferrer",
        title: `${text} — ${meta.label}: ${meta.note}` }, ...inner)
    : h("span.cite", { title: `${text} — ${meta.label}: ${meta.note}` }, ...inner);
}

export function meter(value, { max = 1, tone = "", height = 4 } = {}) {
  return h(`div.meter${tone ? `.meter--${tone}` : ""}`, { style: { height: `${height}px` } },
    h("div.meter__fill", { style: { width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` } })
  );
}

export function empty({ icon: iconName = "layers", title, body, action = null }) {
  return h("div.empty", null,
    h("div.empty__icon", null, icon(iconName, 26)),
    h("p.empty__title", title),
    body && h("p.empty__body", body),
    action
  );
}

export function skeleton(rows = 3) {
  return h("div.stack-s", { "aria-busy": "true" },
    ...Array.from({ length: rows }, (_, i) =>
      h("div.skel", { style: { width: `${100 - i * 12}%` } }))
  );
}

export function callout(label, body, variant = "") {
  return h(`div.callout${variant ? `.callout--${variant}` : ""}`, null,
    label && h("div.callout__label", label),
    body
  );
}

export function disclosure(label, bodyFactory, { open = false } = {}) {
  const panelEl = h("div.disc__panel", { hidden: !open });
  let built = open;
  if (open) mount(panelEl, bodyFactory());

  const button = h("button.disc__btn", {
    type: "button", "aria-expanded": String(open),
    onclick: () => {
      const next = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(next));
      panelEl.hidden = !next;
      if (next && !built) { mount(panelEl, bodyFactory()); built = true; }
    },
  }, h("span.disc__chev", null, icon("chevron", 11)), h("span", label));

  return h("div.disc", null, button, panelEl);
}

export function tabs(items, active, onSelect) {
  return h("div.tabs", { role: "tablist" },
    ...items.map((item) => h("button.tab", {
      type: "button", role: "tab",
      "aria-selected": String(item.id === active),
      onclick: () => onSelect(item.id),
    }, item.label, item.count !== undefined && h("span.faint", ` ${item.count}`)))
  );
}

export function statGrid(stats) {
  return h("div.statgrid", null, ...stats.map((entry) => stat(entry)));
}

/** Arrow + tone for a modelled direction, with the vocabulary the node deserves. */
export function direction(value, kind = "macro") {
  if (!value) return h("span.dim", "ambiguous");
  const up = value > 0;
  const word = kind === "risk" ? (up ? "elevated" : "reduced")
    : ["sector", "industry", "market"].includes(kind) ? (up ? "supported" : "pressured")
    : (up ? "higher" : "lower");
  return h("span", { class: up ? "up" : "down" }, `${up ? "▲" : "▼"} ${word}`);
}

export function lag(months) {
  if (months === 0) return h("span.dim", "immediate");
  if (months < 12) return h("span.dim", `~${months}mo`);
  return h("span.dim", `~${num(months / 12, 1)}y`);
}

export function toast(message, tone = "") {
  let host = document.querySelector(".toasts");
  if (!host) {
    host = h("div.toasts", { "aria-live": "polite" });
    document.body.appendChild(host);
  }
  const el = h(`div.toast${tone ? `.toast--${tone}` : ""}`, message);
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(4px)";
    setTimeout(() => el.remove(), 260);
  }, 3200);
}

export { pct, num };
