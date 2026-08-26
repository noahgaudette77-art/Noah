/**
 * Command palette — ⌘K / Ctrl-K.
 *
 * Commands and search results share one list, because the distinction between
 * "go somewhere" and "find something" is not one the reader is thinking about
 * when they hit the shortcut.
 */

import { h, mount, icon, escapeHtml } from "../core/dom.js";
import { go } from "../core/router.js";
import { search, KIND_ICON } from "./search.js";
import { profile } from "../core/store.js";

let open = false;
let teardown = null;

const COMMANDS = [
  { id: "cmd-home", label: "Command centre", hint: "Today's picture", route: "/" },
  { id: "cmd-ask", label: "Ask a question", hint: "Answered from the model and corpus", route: "/ask" },
  { id: "cmd-daily", label: "Daily brief", hint: "Five minutes", route: "/daily" },
  { id: "cmd-weekly", label: "Weekly intelligence brief", hint: "Monday", route: "/weekly" },
  { id: "cmd-markets", label: "Markets", hint: "Yields, curve, currencies", route: "/markets" },
  { id: "cmd-economy", label: "Economy", hint: "Indicators and structure", route: "/economy" },
  { id: "cmd-stream", label: "Intelligence stream", hint: "Everything, ranked", route: "/stream" },
  { id: "cmd-companies", label: "Companies", hint: "Fundamental screen", route: "/companies" },
  { id: "cmd-graph", label: "World model", hint: "The causal graph", route: "/graph" },
  { id: "cmd-sim", label: "Run a simulation", hint: "What-if engine", route: "/simulator" },
  { id: "cmd-debates", label: "Contrarian", hint: "Consensus vs the case against", route: "/debates" },
  { id: "cmd-radar", label: "AI radar", hint: "Frontier research", route: "/radar" },
  { id: "cmd-future", label: "Future map", hint: "Structural trends", route: "/future" },
  { id: "cmd-knowledge", label: "Knowledge base", hint: "Concepts, four depths", route: "/knowledge" },
  { id: "cmd-history", label: "History engine", hint: "One thing you should know", route: "/history" },
  { id: "cmd-curriculum", label: "Curriculum", hint: "Ordered learning paths", route: "/curriculum" },
  { id: "cmd-ahead", label: "Ahead of the curve", hint: "Learn it before it matters", route: "/curriculum" },
  { id: "cmd-learn", label: "Learn", hint: "Quiz, review, progress", route: "/learn" },
  { id: "cmd-quiz", label: "Quiz me", hint: "Start a quiz now", route: "/learn?start=quiz" },
  { id: "cmd-challenge", label: "Challenge me", hint: "Free-response scenario", route: "/learn?start=challenge" },
  { id: "cmd-research", label: "Research workspace", hint: "Projects and notes", route: "/research" },
  { id: "cmd-watchlist", label: "Watchlist", hint: "Tracked companies", route: "/watchlist" },
  { id: "cmd-forecasts", label: "Forecast scorecard", hint: "Accountability", route: "/forecasts" },
  { id: "cmd-archive", label: "Archive", hint: "Every past brief", route: "/archive" },
  { id: "cmd-sources", label: "Sources", hint: "Tiers and coverage", route: "/sources" },
  { id: "cmd-settings", label: "Settings", hint: "Depth, density, theme", route: "/settings" },
  { id: "cmd-theme", label: "Toggle theme", hint: "Dark / light", action: toggleTheme },
  { id: "cmd-density", label: "Cycle density", hint: "Compact / default / comfortable", action: cycleDensity },
];

function toggleTheme() {
  const current = profile.at("settings.theme", "dark");
  const next = current === "dark" ? "light" : "dark";
  profile.merge("settings", { theme: next });
  document.documentElement.dataset.theme = next;
}

function cycleDensity() {
  const order = ["compact", "default", "comfortable"];
  const current = profile.at("settings.density", "default");
  const next = order[(order.indexOf(current) + 1) % order.length];
  profile.merge("settings", { density: next });
  document.documentElement.dataset.density = next;
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0, index)) +
    `<mark>${escapeHtml(text.slice(index, index + query.length))}</mark>` +
    escapeHtml(text.slice(index + query.length));
}

export function openPalette(initial = "") {
  if (open) return;
  open = true;
  const restore = document.activeElement;

  const input = h("input", {
    type: "text", placeholder: "Search or run a command…", value: initial,
    autocomplete: "off", spellcheck: "false", "aria-label": "Search",
  });
  const list = h("div.palette__list", { role: "listbox" });
  const scrim = h("div.scrim", { onclick: close });
  const box = h("div.palette", { role: "dialog", "aria-modal": "true", "aria-label": "Command palette" },
    h("div.palette__input", null, icon("search", 15), input,
      h("kbd", "esc")),
    list,
    h("div.palette__hint", null,
      h("span", null, h("kbd", "↑↓"), " navigate"),
      h("span", null, h("kbd", "↵"), " open"),
      h("span", null, h("kbd", "esc"), " close"))
  );

  let items = [];
  let cursor = 0;

  const render = () => {
    const query = input.value.trim();
    const commands = query
      ? COMMANDS.filter((command) =>
          command.label.toLowerCase().includes(query.toLowerCase()) ||
          command.hint.toLowerCase().includes(query.toLowerCase()))
      : COMMANDS.slice(0, 9);
    const found = query.length >= 2 ? search(query, { limit: 10 }) : [];

    // A question typed into the palette should reach the interface built to
    // answer it, rather than being matched as a keyword and quietly failing.
    const looksLikeQuestion = /\?$|^(what|why|how|who|which|when|explain|teach|connect|challenge|show)\b/i.test(query);
    const askItem = looksLikeQuestion && query.length > 6
      ? [{ kind: "command", id: "ask-this", label: `Ask: ${query}`,
           hint: "answered from the model and corpus", route: `/ask?q=${encodeURIComponent(query)}` }]
      : [];

    items = [
      ...askItem,
      ...commands.slice(0, 7).map((command) => ({ ...command, kind: "command" })),
      ...found,
    ];
    cursor = Math.min(cursor, Math.max(0, items.length - 1));

    if (!items.length) {
      mount(list, h("div.empty", null,
        h("p.empty__title", "Nothing matched"),
        h("p.empty__body", "Search covers concepts, world-model nodes, historical lessons, sources and the current intelligence stream.")));
      return;
    }

    const groups = [];
    let lastKind = null;
    items.forEach((item, index) => {
      if (item.kind !== lastKind) {
        groups.push(h("div.palette__group", GROUP_LABEL[item.kind] || item.kind));
        lastKind = item.kind;
      }
      groups.push(h("button.palette__item", {
        type: "button", role: "option", "aria-selected": String(index === cursor),
        dataset: { index },
        onmouseenter: () => { cursor = index; syncSelection(); },
        onclick: () => run(item),
      },
        icon(KIND_ICON[item.kind] || "grid", 13),
        h("span.grow", { html: highlight(item.title || item.label, query) }),
        h("span.push", item.hint || item.subtitle || "")
      ));
    });
    mount(list, ...groups);
  };

  const syncSelection = () => {
    list.querySelectorAll(".palette__item").forEach((element, index) => {
      element.setAttribute("aria-selected", String(index === cursor));
      if (index === cursor) element.scrollIntoView({ block: "nearest" });
    });
  };

  const run = (item) => {
    close();
    if (item.action) item.action();
    else if (item.route) go(item.route);
  };

  const onKey = (event) => {
    if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); cursor = (cursor + 1) % items.length; syncSelection(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); cursor = (cursor - 1 + items.length) % items.length; syncSelection(); }
    else if (event.key === "Enter") { event.preventDefault(); if (items[cursor]) run(items[cursor]); }
  };

  function close() {
    open = false;
    scrim.remove(); box.remove();
    document.removeEventListener("keydown", onKey, true);
    restore?.focus?.();
    teardown = null;
  }
  teardown = close;

  input.addEventListener("input", () => { cursor = 0; render(); });
  document.addEventListener("keydown", onKey, true);
  document.body.append(scrim, box);
  render();
  input.focus();
  input.select();
}

const GROUP_LABEL = {
  command: "Commands", concept: "Concepts", node: "World model",
  lesson: "History", source: "Sources", story: "Intelligence stream",
  company: "Companies", debate: "Debates", track: "Curriculum",
};

export function closePalette() { teardown?.(); }
export { toggleTheme, cycleDensity };
