/** The application chrome: rail, top bar, status bar, mobile bar. */

import { h, mount, icon } from "../core/dom.js";
import { parse, onNavigate } from "../core/router.js";
import { profile, session } from "../core/store.js";
import { openPalette, toggleTheme } from "./palette.js";
import { levelFromXp, globalScore } from "../domain/learning.js";
import { coverage, statusOf, DATASETS } from "../data/store.js";
import { ago } from "../core/format.js";

export const NAV = [
  { group: "Briefing", items: [
    { route: "/", label: "Command centre", icon: "grid", key: "1" },
    { route: "/ask", label: "Ask", icon: "brain", key: "0" },
    { route: "/daily", label: "Daily brief", icon: "pulse", key: "2" },
    { route: "/weekly", label: "Weekly brief", icon: "calendar", key: "3" },
  ]},
  { group: "Signal", items: [
    { route: "/stream", label: "Intelligence", icon: "layers", key: "4" },
    { route: "/markets", label: "Markets", icon: "chart", key: "5" },
    { route: "/companies", label: "Companies", icon: "building" },
    { route: "/economy", label: "Economy", icon: "building" },
    { route: "/politics", label: "Politics", icon: "globe" },
    { route: "/watchlist", label: "Watchlist", icon: "bookmark" },
  ]},
  { group: "Analysis", items: [
    { route: "/graph", label: "World model", icon: "graph", key: "6" },
    { route: "/simulator", label: "Simulator", icon: "flask", key: "7" },
    { route: "/debates", label: "Contrarian", icon: "scale" },
    { route: "/radar", label: "AI radar", icon: "cpu" },
    { route: "/future", label: "Future map", icon: "horizon" },
    { route: "/forecasts", label: "Forecasts", icon: "target" },
  ]},
  { group: "Knowledge", items: [
    { route: "/knowledge", label: "Concepts", icon: "brain", key: "8" },
    { route: "/history", label: "History", icon: "book" },
    { route: "/curriculum", label: "Curriculum", icon: "layers" },
    { route: "/learn", label: "Learn", icon: "spark", key: "9" },
  ]},
  { group: "Library", items: [
    { route: "/research", label: "Research", icon: "flask" },
    { route: "/archive", label: "Archive", icon: "archive" },
    { route: "/sources", label: "Sources", icon: "scale" },
    { route: "/settings", label: "Settings", icon: "layers2" },
  ]},
];

const MOBILE = [
  { route: "/", label: "Now", icon: "grid" },
  { route: "/daily", label: "Brief", icon: "pulse" },
  { route: "/markets", label: "Markets", icon: "chart" },
  { route: "/learn", label: "Learn", icon: "spark" },
  { route: "/graph", label: "Model", icon: "graph" },
];

const FLAT = NAV.flatMap((group) => group.items);

export function buildShell(root) {
  const rail = h("nav.rail", { "aria-label": "Primary" });
  const topbar = h("header.topbar");
  const main = h("main.main", { id: "main" });
  const statusbar = h("div.statusbar", { role: "status" });
  const mobilebar = h("nav.mobilebar", { "aria-label": "Primary, compact" });

  mount(root, rail, topbar, main, statusbar, mobilebar);

  renderRail(rail);
  renderTopbar(topbar);
  renderMobile(mobilebar);
  renderStatus(statusbar);

  onNavigate(() => {
    syncActive(root);
    renderTopbar(topbar);
    root.dataset.rail = window.innerWidth <= 860
      ? "closed"
      : profile.at("settings.rail", "expanded") === "collapsed" ? "collapsed" : "expanded";
  });

  session.subscribe(() => renderStatus(statusbar));
  profile.subscribe(() => { renderRail(rail); renderStatus(statusbar); syncActive(root); });

  return { main, statusbar };
}

function renderRail(rail) {
  const level = levelFromXp(profile.at("learning.xp", 0));
  mount(rail,
    h("div.rail__brand", null,
      h("svg.rail__mark", { viewBox: "0 0 20 20", fill: "none", "aria-hidden": "true" },
        h("path", { d: "M10 1.6 18 6v8l-8 4.4L2 14V6l8-4.4Z", stroke: "currentColor", "stroke-width": 1.3, "stroke-linejoin": "round" }),
        h("path", { d: "M10 6.4 13.6 8.4v3.4L10 13.8 6.4 11.8V8.4L10 6.4Z", fill: "currentColor", "fill-opacity": 0.9 })),
      h("span.rail__name", "Meridian")),

    h("div.rail__nav", null,
      ...NAV.flatMap((group) => [
        h("div.rail__group", h("span", group.group)),
        ...group.items.map((item) => h("a.navitem", {
          href: `#${item.route}`, dataset: { route: item.route },
          title: item.label,
        },
          h("span.navitem__key", null, icon(item.icon, 13)),
          h("span.navitem__label", item.label),
          item.key && h("span.navitem__badge", item.key)
        )),
      ])),

    h("div.rail__foot", null,
      h("a.stack-xs", { href: "#/learn", style: { textDecoration: "none", color: "inherit" } },
        h("div.spread", null,
          h("span.eyebrow", level.rank),
          h("span.mono.dim", { style: { fontSize: "var(--t-tiny)" } }, `L${level.level}`)),
        h("div.meter", null, h("div.meter__fill", { style: { width: `${level.progress * 100}%` } })),
        h("span", { class: "dim", style: { fontSize: "var(--t-micro)" } },
          `${level.into} / ${level.span} XP to L${level.level + 1}`)))
  );
}

function renderTopbar(topbar) {
  const { path } = parse();
  const active = FLAT.find((item) => item.route === path)
    || FLAT.find((item) => item.route !== "/" && path.startsWith(item.route));
  const score = globalScore(profile.at("learning", {}));
  const streak = profile.at("learning.streak", 0);

  mount(topbar,
    h("button.iconbtn", {
      type: "button", "aria-label": "Toggle navigation",
      onclick: () => {
        const app = document.getElementById("app");
        if (window.innerWidth <= 860) {
          app.dataset.rail = app.dataset.rail === "open" ? "closed" : "open";
        } else {
          const next = profile.at("settings.rail", "expanded") === "collapsed" ? "expanded" : "collapsed";
          profile.merge("settings", { rail: next });
          app.dataset.rail = next;
        }
      },
    }, icon("menu", 15)),

    h("span.topbar__crumb", null, h("b", active?.label || "Meridian")),

    h("button.omnibox", {
      type: "button", onclick: () => openPalette(),
      "aria-label": "Search or run a command",
    },
      icon("search", 13),
      h("span.grow", { style: { textAlign: "left" } }, "Search or run a command"),
      h("kbd", navigator.platform?.includes("Mac") ? "⌘K" : "Ctrl K")),

    h("div.row-s.push", null,
      streak > 0 && h("span.badge.badge--accent", { title: `${streak}-day streak` },
        icon("spark", 10), String(streak)),
      h("span.badge", { title: `Global knowledge score — ${score.components.depth}% depth, ${score.components.breadth}% breadth` },
        "GKS ", h("b", { style: { color: "var(--ink)" } }, String(score.score))),
      h("button.iconbtn", { type: "button", "aria-label": "Toggle theme", onclick: toggleTheme },
        icon(document.documentElement.dataset.theme === "light" ? "moon" : "sun", 14)))
  );
}

function renderMobile(bar) {
  mount(bar, ...MOBILE.map((item) => h("a", { href: `#${item.route}`, dataset: { route: item.route } },
    icon(item.icon, 15), h("span", item.label))));
}

function renderStatus(statusbar) {
  const cover = coverage();
  const manifest = statusOf("manifest");
  const generatedAt = manifest.data?.generatedAt;
  const gaps = manifest.data?.gaps?.length || 0;
  const partial = Boolean(manifest.data?.partial);

  mount(statusbar,
    h("span.row-s", null,
      h("span", { class: `dot dot--${cover.ready ? "live" : "none"}` }),
      h("span", null, "DATA ", h("b", `${cover.ready}/${cover.total}`))),
    generatedAt
      ? h("span", { title: partial ? "A partial run: sources it skipped kept their previous snapshots." : null },
          "LAST RUN ", h("b", ago(generatedAt)), partial ? h("span.faint", " · partial") : null)
      : h("span.faint", "PIPELINE NOT YET RUN"),
    gaps ? h("a", {
      href: "#/sources", style: { color: "var(--warn)" },
      title: "A source did not answer or skipped itself. Nothing is filled in for it — the affected views show what is missing.",
    }, `${gaps} SOURCE GAP${gaps === 1 ? "" : "S"}`) : null,
    cover.failed ? h("span", { style: { color: "var(--down)" } }, `${cover.failed} FAILED`) : null,
    h("span.push.faint", "NOT INVESTMENT ADVICE · MODEL OUTPUT IS NOT A FORECAST")
  );
}

function syncActive(root) {
  const { path } = parse();
  root.querySelectorAll("[data-route]").forEach((element) => {
    const route = element.dataset.route;
    const match = route === "/" ? path === "/" : path.startsWith(route);
    if (match) element.setAttribute("aria-current", "page");
    else element.removeAttribute("aria-current");
  });
}

export { FLAT as NAV_ITEMS, DATASETS };
