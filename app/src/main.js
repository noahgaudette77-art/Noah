/**
 * Bootstrap: theme, routes, keyboard, first paint.
 *
 * Views are dynamically imported so the first screen ships only what it needs;
 * everything else arrives on navigation. No bundler is involved — the browser's
 * own module loader does the work.
 */

import { h, mount, icon } from "./core/dom.js";
import { define, fallback, start, go, onNavigate } from "./core/router.js";
import { profile, session } from "./core/store.js";
import { buildShell } from "./ui/shell.js";
import { openPalette } from "./ui/palette.js";
import { load, loadAll } from "./data/store.js";
import { recordActivity } from "./domain/learning.js";
import { empty, toast } from "./ui/components/kit.js";
import { invalidate as invalidateSearch } from "./ui/search.js";

/* --- Theme before first paint ------------------------------------------- */
const settings = profile.at("settings", {});
document.documentElement.dataset.theme = settings.theme || "dark";
document.documentElement.dataset.density = settings.density || "default";

const app = document.getElementById("app");
app.dataset.rail = window.innerWidth <= 860 ? "closed" : (settings.rail || "expanded");

const { main } = buildShell(app);

/* --- Routes -------------------------------------------------------------- */

const ROUTES = [
  ["/", () => import("./ui/views/command-center.js").then((m) => m.commandCenter()), "Command centre"],
  ["/ask", () => import("./ui/views/ask.js").then((m) => m.askView()), "Ask"],
  ["/daily", () => import("./ui/views/briefs.js").then((m) => m.dailyBrief()), "Daily brief"],
  ["/weekly", () => import("./ui/views/briefs.js").then((m) => m.weeklyBrief()), "Weekly brief"],
  ["/archive", () => import("./ui/views/briefs.js").then((m) => m.archiveView()), "Archive"],
  ["/stream", () => import("./ui/views/markets.js").then((m) => m.streamView()), "Intelligence"],
  ["/markets", () => import("./ui/views/markets.js").then((m) => m.marketsView()), "Markets"],
  ["/economy", () => import("./ui/views/markets.js").then((m) => m.economyView()), "Economy"],
  ["/graph", () => import("./ui/views/model.js").then((m) => m.graphView()), "World model"],
  ["/simulator", () => import("./ui/views/model.js").then((m) => m.simulatorView()), "Simulator"],
  ["/debates", () => import("./ui/views/debates.js").then((m) => m.debatesView()), "Contrarian"],
  ["/debates/:id", () => import("./ui/views/debates.js").then((m) => m.debatesView()), "Debate"],
  ["/radar", () => import("./ui/views/radar.js").then((m) => m.radarView()), "AI radar"],
  ["/future", () => import("./ui/views/radar.js").then((m) => m.futureView()), "Future map"],
  ["/knowledge", () => import("./ui/views/knowledge.js").then((m) => m.knowledgeView()), "Knowledge"],
  ["/knowledge/:id", () => import("./ui/views/knowledge.js").then((m) => m.knowledgeView()), "Concept"],
  ["/history", () => import("./ui/views/knowledge.js").then((m) => m.historyView()), "History"],
  ["/history/:id", () => import("./ui/views/knowledge.js").then((m) => m.historyView()), "Lesson"],
  ["/learn", () => import("./ui/views/learn.js").then((m) => m.learnView()), "Learn"],
  ["/curriculum", () => import("./ui/views/curriculum.js").then((m) => m.curriculumView()), "Curriculum"],
  ["/curriculum/:id", () => import("./ui/views/curriculum.js").then((m) => m.curriculumView()), "Track"],
  ["/research", () => import("./ui/views/library.js").then((m) => m.researchView()), "Research"],
  ["/companies", () => import("./ui/views/companies.js").then((m) => m.companiesView()), "Companies"],
  ["/companies/:ticker", () => import("./ui/views/companies.js").then((m) => m.companiesView()), "Company"],
  ["/watchlist", () => import("./ui/views/library.js").then((m) => m.watchlistView()), "Watchlist"],
  ["/forecasts", () => import("./ui/views/library.js").then((m) => m.forecastsView()), "Forecasts"],
  ["/sources", () => import("./ui/views/library.js").then((m) => m.sourcesView()), "Sources"],
  ["/settings", () => import("./ui/views/library.js").then((m) => m.settingsView()), "Settings"],
];

let renderToken = 0;

function renderRoute(factory, title) {
  const token = ++renderToken;
  document.title = `${title} · Meridian`;

  const timer = setTimeout(() => {
    if (token === renderToken) {
      mount(main, h("div.view", null, h("div.view-inner", null,
        h("div.stack-s", { "aria-busy": "true" },
          h("div.skel", { style: { width: "38%", height: "26px" } }),
          h("div.skel", { style: { width: "72%" } }),
          h("div.skel", { style: { width: "56%" } })))));
    }
  }, 90);

  Promise.resolve()
    .then(factory)
    .then((view) => {
      clearTimeout(timer);
      if (token !== renderToken) return;              // a later navigation won
      const scroller = h("div.view.enter", null, view);
      mount(main, scroller);
      scroller.scrollTop = 0;
    })
    .catch((error) => {
      clearTimeout(timer);
      if (token !== renderToken) return;
      console.error("view failed", error);
      mount(main, h("div.view", null, h("div.view-inner", null,
        empty({
          icon: "alert",
          title: "This view failed to load",
          body: String(error?.message || error),
          action: h("button.btn", { type: "button", onclick: () => location.reload() },
            icon("refresh", 12), "Reload"),
        }))));
    });
}

for (const [pattern, factory, title] of ROUTES) {
  define(pattern, () => renderRoute(factory, title), { title });
}

fallback(() => {
  document.title = "Not found · Meridian";
  mount(main, h("div.view", null, h("div.view-inner", null,
    empty({
      icon: "search",
      title: "No such view",
      body: "The address does not match anything in the application.",
      action: h("button.btn.btn--primary", { type: "button", onclick: () => go("/") }, "Command centre"),
    }))));
});

/* --- Keyboard ------------------------------------------------------------ */

const NUMBER_ROUTES = {
  1: "/", 2: "/daily", 3: "/weekly", 4: "/stream", 5: "/markets",
  6: "/graph", 7: "/simulator", 8: "/knowledge", 9: "/learn", 0: "/ask",
};

document.addEventListener("keydown", (event) => {
  const typing = /^(input|textarea|select)$/i.test(event.target.tagName) || event.target.isContentEditable;

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openPalette();
    return;
  }
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

  if (event.key === "/") { event.preventDefault(); openPalette(); return; }
  if (event.key === "?") { event.preventDefault(); showShortcuts(); return; }
  if (NUMBER_ROUTES[event.key]) { event.preventDefault(); go(NUMBER_ROUTES[event.key]); }
});

function showShortcuts() {
  import("./ui/components/drawer.js").then(({ openDrawer }) => {
    const row = (keys, label) => h("div.spread", { style: { padding: "var(--s2) 0" } },
      h("span.dim", { style: { fontSize: "var(--t-small)" } }, label),
      h("span.row-s", null, ...keys.map((key) => h("kbd", key))));
    openDrawer("Keyboard", "Shortcuts", [
      h("div.stack-xs", null,
        row(["⌘", "K"], "Command palette"),
        row(["/"], "Search"),
        row(["?"], "This panel"),
        row(["Esc"], "Close a panel"),
        row(["1"], "Command centre"),
        row(["2"], "Daily brief"),
        row(["3"], "Weekly brief"),
        row(["4"], "Intelligence stream"),
        row(["5"], "Markets"),
        row(["6"], "World model"),
        row(["7"], "Simulator"),
        row(["8"], "Knowledge base"),
        row(["9"], "Learn"),
        row(["0"], "Ask")),
    ]);
  });
}

/* --- Session bookkeeping -------------------------------------------------- */

const lastVisit = profile.at("lastVisit", null);
profile.set({
  lastVisit: Date.now(),
  createdAt: profile.at("createdAt", null) || Date.now(),
  learning: recordActivity(profile.at("learning", {})),
});

onNavigate(() => {
  if (window.innerWidth <= 860) app.dataset.rail = "closed";
});

/* --- Data ---------------------------------------------------------------- */

loadAll(["manifest", "stories", "markets", "fundamentals"]).then(() => {
  invalidateSearch();
  const manifest = session.at("datasets.manifest", {});
  if (manifest?.data?.gaps?.length) {
    console.info(`intel: ${manifest.data.gaps.length} source gap(s) recorded in the last pipeline run`);
  }
});

start();

if (!lastVisit) {
  setTimeout(() => toast("Press ⌘K or / to search anything · ? for shortcuts"), 900);
}
