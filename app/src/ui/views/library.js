/** RESEARCH · WATCHLIST · FORECASTS · SOURCES · SETTINGS */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse } from "../../core/router.js";
import { profile, storageAvailable } from "../../core/store.js";
import { load, dataOf, coverage } from "../../data/store.js";
import {
  panel,
  pageHead,
  badge,
  chip,
  callout,
  sectionHead,
  empty,
  stat,
  toast,
  confidence,
} from "../components/kit.js";
import { pipelineEmpty } from "../components/states.js";
import { openForm, confirmAction } from "../components/form.js";
import { openNode, openConcept } from "../components/drawer.js";
import { SOURCES, TIERS, byTier, keylessSources, tierMeta } from "../../content/sources.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { LEVELS } from "../../content/concepts.js";
import { ago, date as fmtDate, plural, isoDate } from "../../core/format.js";
import { levelFromXp } from "../../domain/learning.js";
import { LESSONS } from "../../content/lessons.js";
import { CONCEPTS } from "../../content/concepts.js";
import { TECHNOLOGIES } from "../../content/technologies.js";
import { stats as modelStats } from "../../domain/worldmodel.js";

/* ========================= RESEARCH ========================= */

export function researchView() {
  const root = h("div.view-inner");

  const render = () => {
    const projects = profile.at("research", []);
    const scenarios = profile.at("scenarios", []);

    mount(root,
      pageHead("Research workspace",
        "Projects live in this browser only. Nothing here is uploaded, and nothing about what you read leaves the device.",
        [h("button.btn.btn--primary", { type: "button", onclick: () => createProject(render) },
          icon("plus", 12), "New project")]),

      h("div.grid.g-main", null,
        h("div.stack", null,
          projects.length
            ? h("div.stack", null, ...projects.map((project) => projectPanel(project, render)))
            : panel({
                body: empty({
                  icon: "flask",
                  title: "No research projects yet",
                  body: "A project collects concepts, model variables, saved scenarios and your own notes around one question — \"AI infrastructure\", \"is the consumer cracking\", whatever you are actually working on.",
                  action: h("button.btn.btn--primary", { type: "button", onclick: () => createProject(render) },
                    icon("plus", 12), "Create the first one"),
                }),
              })),

        h("div.stack", null,
          panel({
            title: "Saved scenarios",
            sub: String(scenarios.length),
            flush: true,
            body: scenarios.length
              ? h("div.rows", null, ...scenarios.slice(0, 10).map((scenario) =>
                  h("button.rowitem", {
                    onclick: () => go(`/simulator?shock=${scenario.seeds[0].id}&mag=${scenario.seeds[0].magnitude}`),
                  },
                    h("span.grow", null,
                      h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, scenario.label),
                      h("div.rowitem__meta", ago(scenario.savedAt))),
                    icon("chevron", 12))))
              : h("div.panel__body", null, h("span.dim", "Run something in the simulator and save it.")),
          }),

          !storageAvailable ? callout("Storage unavailable",
            "This browser is blocking site data, so projects and progress will not survive a reload. Everything else works normally.",
            "warn") : null)
      )
    );
  };

  render();
  return root;
}

async function createProject(rerender) {
  const values = await openForm({
    title: "New research project",
    sub: "A project collects concepts, model variables, saved scenarios and your notes around one question.",
    submitLabel: "Create",
    fields: [{
      name: "title", label: "Project name", required: true,
      placeholder: "AI infrastructure",
      hint: "Name the question, not the topic — \u201cis the consumer cracking\u201d beats \u201cconsumers\u201d.",
    }],
  });
  if (!values) return;
  profile.set({
    research: [
      { id: `pr-${Date.now()}`, title: values.title, createdAt: Date.now(), items: [], notes: [] },
      ...profile.at("research", []),
    ],
  });
  rerender();
}

function projectPanel(project, rerender) {
  const noteInput = h("textarea.textarea", { rows: 3, placeholder: "Add a note…" });

  const addNote = () => {
    const text = noteInput.value.trim();
    if (!text) return;
    const projects = profile.at("research", []).map((entry) =>
      entry.id === project.id
        ? { ...entry, notes: [{ id: `n-${Date.now()}`, text, at: Date.now() }, ...entry.notes] }
        : entry);
    profile.set({ research: projects });
    rerender();
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: `Delete "${project.title}"?`,
      body: `This removes the project and its ${plural(project.notes.length, "note")}. It cannot be undone.`,
    });
    if (!ok) return;
    profile.set({ research: profile.at("research", []).filter((entry) => entry.id !== project.id) });
    toast("Project deleted");
    rerender();
  };

  return panel({
    title: project.title,
    sub: `created ${fmtDate(project.createdAt)}`,
    actions: h("button.iconbtn", { type: "button", "aria-label": "Delete project", onclick: remove }, icon("close", 12)),
    body: h("div.stack-s", null,
      project.items.length ? h("div.row-s.wrap", null, ...project.items.map((item) =>
        chip(item.label, { onclick: () => item.kind === "node" ? openNode(item.id) : openConcept(item.id) }))) : null,
      h("div", null, noteInput,
        h("div.row-s", { style: { marginTop: "var(--s3)" } },
          h("button.btn.btn--sm", { type: "button", onclick: addNote }, icon("plus", 11), "Add note"))),
      project.notes.length ? h("div.stack-xs", { style: { marginTop: "var(--s4)" } },
        ...project.notes.map((note) => h("div.callout", null,
          h("div.callout__label", ago(note.at)),
          h("p", { style: { marginTop: "var(--s1)", whiteSpace: "pre-wrap" } }, note.text)))) : null),
  });
}

/* ========================= WATCHLIST ========================= */

export function watchlistView() {
  const root = h("div.view-inner");
  load("filings").then(render);

  function render() {
    const filings = dataOf("filings");
    const tracked = filings?.tracked || {};
    const watchlist = profile.at("watchlist", []);

    const filingsFor = (ticker) => (filings?.filings || []).filter((entry) => entry.ticker === ticker);

    mount(root,
      pageHead("Watchlist",
        "Companies whose disclosure is pulled from EDGAR and attached to the world-model variable their economics depend on. No prices — no keyless source publishes them under terms that permit automated access, and an unreliable number is worse than none."),

      h("div.grid.g-main", null,
        h("div.stack", null,
          watchlist.length
            ? panel({
                flush: true,
                body: h("div.rows", null, ...watchlist.map((entry) => {
                  const recent = filingsFor(entry.ticker);
                  const target = tracked[entry.ticker] ? findNode(tracked[entry.ticker]) : null;
                  return h("div.rowitem", null,
                    h("span.grow", null,
                      h("div.row-s.wrap", null,
                        h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.ticker),
                        h("span.dim", entry.name || ""),
                        target && badge(target.label, "cyan")),
                      recent.length
                        ? h("div.stack-xs", { style: { marginTop: "var(--s2)" } },
                            ...recent.slice(0, 3).map((filing) => h("a.row-s", {
                              href: filing.url, target: "_blank", rel: "noopener noreferrer",
                              style: { fontSize: "var(--t-small)" },
                            }, badge(filing.form, "accent"),
                               h("span.truncate", { style: { maxWidth: "34ch" } }, filing.description || filing.company),
                               h("span.faint", ago(filing.filedAt)))))
                        : h("div.rowitem__meta", { style: { marginTop: "var(--s2)" } },
                            "No filings in the pipeline's current window."),
                      target && h("div.row-s", { style: { marginTop: "var(--s2)" } },
                        chip("Trace the variable", { onclick: () => openNode(target.id) }))),
                    h("button.iconbtn", {
                      type: "button", "aria-label": `Remove ${entry.ticker}`,
                      onclick: () => {
                        profile.set({ watchlist: watchlist.filter((item) => item.ticker !== entry.ticker) });
                        render();
                      },
                    }, icon("close", 12)));
                })),
              })
            : panel({
                body: empty({
                  icon: "bookmark", title: "Nothing on the watchlist",
                  body: "Add a tracked company from the panel alongside. Each one is linked to the world-model variable its economics actually depend on, so a macro move maps to a company rather than to a sector label.",
                }),
              })),

        h("div.stack", null,
          panel({
            title: "Companies the pipeline covers",
            sub: `${Object.keys(tracked).length}`,
            flush: true,
            body: Object.keys(tracked).length
              ? h("div.rows", null, ...Object.entries(tracked).map(([ticker, nodeId]) => {
                  const target = findNode(nodeId);
                  const already = watchlist.some((entry) => entry.ticker === ticker);
                  return h("button.rowitem", {
                    onclick: () => {
                      if (already) return;
                      profile.set({ watchlist: [...watchlist, { ticker, name: "", addedAt: Date.now() }] });
                      toast(`${ticker} added`);
                      render();
                    },
                  },
                    h("span.grow", null,
                      h("div.row-s", null,
                        h("span.mono", { style: { fontSize: "var(--t-body)", fontWeight: 600 } }, ticker),
                        target && h("span.dim", { style: { fontSize: "var(--t-tiny)" } }, target.label)),
                    ),
                    already ? badge("added", "up") : icon("plus", 12));
                }))
              : pipelineEmpty("filings"),
            foot: "Coverage, not a recommendation. These companies are here because they sit on a node in the model, which is a statement about the supply chain rather than about the shares.",
          }),

          callout("Why there are no prices",
            "The one keyless price source available began serving a bot challenge, and working around an access control is not something this pipeline will do. A keyed market-data provider can be added to the data layer; until one is configured, this stays empty rather than showing a number nobody can verify.",
            "warn"))
      )
    );
  }

  return root;
}

/* ========================= FORECASTS ========================= */

export function forecastsView() {
  const root = h("div.view-inner");

  const render = () => {
    const forecasts = profile.at("forecasts", []);
    const resolved = forecasts.filter((entry) => entry.resolution);
    const correct = resolved.filter((entry) => entry.resolution === "correct").length;
    const partial = resolved.filter((entry) => entry.resolution === "partial").length;

    mount(root,
      pageHead("Forecast scorecard",
        "Record what you expect, with your reasoning and a date. Later, resolve it. Nothing improves judgement like a written record you cannot argue with afterwards.",
        [h("button.btn.btn--primary", { type: "button", onclick: () => addForecast(render) },
          icon("plus", 12), "Record a forecast")]),

      resolved.length ? panel({
        title: "Your record",
        body: h("div.statgrid", null,
          stat({ label: "Resolved", value: String(resolved.length) }),
          stat({ label: "Correct", value: String(correct), tone: "up" }),
          stat({ label: "Partially correct", value: String(partial) }),
          stat({ label: "Hit rate", value: `${Math.round((correct / resolved.length) * 100)}`, unit: "%",
            note: "Compare against your stated confidence, not against 50%" })),
        foot: "A forecaster who is right 90% of the time while claiming high confidence on everything is well calibrated. One who is right 90% of the time on claims they called uncertain is not — they are underconfident, which costs just as much.",
      }) : null,

      h("div", { style: { marginTop: resolved.length ? "var(--s6)" : 0 } },
        forecasts.length
          ? panel({
              flush: true,
              body: h("div.rows", null, ...forecasts.map((entry) => forecastRow(entry, render))),
            })
          : panel({
              body: empty({
                icon: "target", title: "No forecasts recorded",
                body: "Start with something concrete and checkable: a level, a direction, a date. \"Things will get interesting\" cannot be scored, which is why it is the most popular kind of forecast.",
                action: h("button.btn.btn--primary", { type: "button", onclick: () => addForecast(render) },
                  icon("plus", 12), "Record the first one"),
              }),
            }))
    );
  };

  render();
  return root;
}

async function addForecast(rerender) {
  const values = await openForm({
    title: "Record a forecast",
    sub: "Specific enough to be scored. \u201cThings will get interesting\u201d cannot be resolved, which is why it is the most popular kind of forecast.",
    submitLabel: "Record",
    fields: [
      { name: "claim", label: "What do you expect to happen?", type: "textarea", rows: 3, required: true,
        placeholder: "The 2s10s spread is positive and above 0.75pp." },
      { name: "horizon", label: "By when?", type: "date", value: isoDate(new Date(Date.now() + 180 * 86_400_000)) },
      { name: "confidence", label: "Confidence", type: "select", value: "moderate",
        options: [
          { value: "high", label: "High — strong evidence, few ways to be wrong" },
          { value: "moderate", label: "Moderate — reasonable evidence, real uncertainty" },
          { value: "low", label: "Low — speculative" },
        ] },
      { name: "basis", label: "Reasoning, and what would make you wrong", type: "textarea", rows: 4,
        placeholder: "The mechanism you are relying on, and the observation that would falsify it.",
        hint: "The falsifier is the part worth writing. Without it a forecast cannot teach you anything." },
    ],
  });
  if (!values) return;

  profile.set({
    forecasts: [{
      id: `f-${Date.now()}`, claim: values.claim, madeAt: Date.now(),
      horizon: values.horizon || null,
      confidence: values.confidence || "moderate",
      basis: values.basis, resolution: null, resolvedAt: null, note: "",
    }, ...profile.at("forecasts", [])],
  });
  rerender();
}

function forecastRow(entry, rerender) {
  const resolve = async (outcome) => {
    const values = await openForm({
      title: `Resolve: ${outcome}`,
      sub: entry.claim,
      submitLabel: "Resolve",
      fields: [{
        name: "note", label: "What actually happened?", type: "textarea", rows: 4,
        placeholder: "The outcome, and whether your reasoning or your luck was responsible.",
        hint: "Being right for the wrong reason is worth recording — it is the failure that repeats.",
      }],
    });
    if (!values) return;
    const note = values.note;
    profile.set({
      forecasts: profile.at("forecasts", []).map((item) =>
        item.id === entry.id ? { ...item, resolution: outcome, resolvedAt: Date.now(), note } : item),
    });
    rerender();
  };

  const overdue = entry.horizon && !entry.resolution && Date.parse(entry.horizon) < Date.now();

  return h("div.rowitem", null,
    h("span.grow.stack-xs", null,
      h("div.row-s.wrap", null,
        badge(entry.confidence, entry.confidence === "high" ? "up" : entry.confidence === "low" ? "warn" : ""),
        entry.horizon && badge(`by ${fmtDate(entry.horizon)}`, overdue ? "down" : ""),
        entry.resolution && badge(entry.resolution,
          entry.resolution === "correct" ? "up" : entry.resolution === "incorrect" ? "down" : "warn"),
        overdue && badge("due for resolution", "warn")),
      h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.claim),
      entry.basis && h("div.rowitem__body", { style: { marginTop: "2px" } }, entry.basis),
      h("div.rowitem__meta", `recorded ${ago(entry.madeAt)}`),
      entry.note && h("div.callout", { style: { marginTop: "var(--s2)" } },
        h("div.callout__label", `resolved ${ago(entry.resolvedAt)}`), entry.note)),

    entry.resolution
      ? h("button.iconbtn", {
          type: "button", "aria-label": "Delete",
          onclick: () => {
            profile.set({ forecasts: profile.at("forecasts", []).filter((item) => item.id !== entry.id) });
            rerender();
          },
        }, icon("close", 12))
      : h("div.row-s", null,
          h("button.btn.btn--sm", { type: "button", onclick: () => resolve("correct") }, "Correct"),
          h("button.btn.btn--sm", { type: "button", onclick: () => resolve("partial") }, "Partly"),
          h("button.btn.btn--sm", { type: "button", onclick: () => resolve("incorrect") }, "Wrong")));
}

/* ========================= SOURCES ========================= */

export function sourcesView() {
  const root = h("div.view-inner");
  load("manifest").then(render);

  function render() {
    const manifest = dataOf("manifest");
    const cover = coverage();

    mount(root,
      pageHead("Sources",
        "Tier is about proximity to the fact, not about the quality of the writing. A central bank's own statement outranks excellent reporting about it, and both outrank an argument about what it meant."),

      manifest ? panel({
        title: "Last pipeline run",
        sub: ago(manifest.generatedAt),
        body: h("div.stack", null,
          h("div.statgrid", null,
            stat({ label: "Duration", value: `${Math.round(manifest.durationMs / 1000)}`, unit: "s" }),
            stat({ label: "Items", value: String(manifest.totals.stories) }),
            stat({ label: "Clusters", value: String(manifest.totals.clusters) }),
            stat({ label: "Series", value: String(manifest.totals.series) }),
            stat({ label: "Filings", value: String(manifest.totals.filings) }),
            stat({ label: "Papers", value: String(manifest.totals.research) })),

          h("div.rows", null, ...manifest.sources.map((entry) => h("div.rowitem", null,
            h("span", { style: { width: "18px", flex: "none" } },
              entry.skipped ? h("span.dim", "–")
                : entry.ok ? h("span.up", null, icon("check", 12))
                : h("span.down", null, icon("close", 12))),
            h("span.grow", null,
              h("div.row-s.wrap", null,
                h("span", { style: { fontSize: "var(--t-body)" } }, entry.label),
                badge(`${entry.ms}ms`),
                ...Object.entries(entry.counts || {}).filter(([, value]) => value)
                  .map(([key, value]) => badge(`${value} ${key}`, "cyan"))),
              entry.error && h("div.rowitem__meta", { style: { color: "var(--down)" } }, entry.error),
              ...(entry.notes || []).map((note) => h("div.rowitem__meta", { style: { color: "var(--warn)" } }, note)))))),
        ),
        foot: manifest.gaps?.length
          ? `${plural(manifest.gaps.length, "source")} reported a gap. Gaps are recorded rather than filled in — every view that depends on missing data shows an empty state naming what is absent.`
          : "Every source answered on the last run.",
      }) : panel({ title: "Pipeline", body: pipelineEmpty("manifest") }),

      h("div", { style: { marginTop: "var(--s7)" } },
        sectionHead("The tier system", "Applied consistently everywhere a claim appears"),
        panel({
          flush: true,
          body: h("div.rows", null, ...TIERS.map((tier) => h("div.rowitem", null,
            h("span", { class: `tier tier--${tier.tier}`, style: { flex: "none" } }, `T${tier.tier}`),
            h("span.grow", null,
              h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, tier.label),
              h("div.rowitem__body", { style: { marginTop: "2px" } }, tier.note)),
            badge(`${byTier(tier.tier).length} registered`)))),
        })),

      h("div", { style: { marginTop: "var(--s7)" } },
        sectionHead("The register", `${SOURCES.length} sources · ${keylessSources().length} usable with no credentials`),
        panel({
          flush: true,
          body: h("div.tbl-wrap", null, h("table.tbl.tbl--zebra", null,
            h("thead", null, h("tr", null,
              h("th", "Source"), h("th", "Tier"), h("th", "Access"), h("th", "What it gives"))),
            h("tbody", null, ...SOURCES.map((source) => h("tr", { id: source.id },
              h("td", null, source.url
                ? h("a", { href: source.url, target: "_blank", rel: "noopener noreferrer" }, source.name)
                : source.name),
              h("td", null, h("span", { class: `tier tier--${source.tier}`, title: tierMeta(source.tier).note }, `T${source.tier}`)),
              h("td", null, badge(source.access,
                source.access === "keyless" ? "up" : source.access === "key" ? "warn" : "")),
              h("td.dim", { style: { fontSize: "var(--t-small)" } }, source.note)))))),
          foot: h("span", null,
            h("b", "keyless"), " is fetched automatically with no credentials. ",
            h("b", "key"), " stays inert until you configure one — the adapter exists and is wired, it simply does not run. ",
            h("b", "manual"), " is not automated, and is listed so a claim traced to it is attributed honestly."),
        })),

      h("div", { style: { marginTop: "var(--s7)" } },
        callout("Where sources disagree",
          "Disagreement is not hidden or averaged away. Where two sources conflict, both positions are shown with their tier, and the platform says which is weighted more heavily and why — or says the disagreement is unresolved, which is frequently the honest answer."))
    );
  }

  return root;
}

/* ========================= SETTINGS ========================= */

export function settingsView() {
  const root = h("div.view-inner.view-inner--read");

  const render = () => {
    const settings = profile.at("settings", {});
    const learning = profile.at("learning", {});
    const level = levelFromXp(learning.xp || 0);

    mount(root,
      pageHead("Settings", "Everything is stored in this browser. Nothing is uploaded."),

      h("div.stack", null,
        panel({
          title: "Reading",
          body: h("div.stack", null,
            setting("Default explanation depth",
              "Where every EXPLAIN control starts. Reading deeper than this earns a little XP, because the point of the control is to pull you upward.",
              h("div.row-s.wrap", null, ...LEVELS.map((entry) => chip(entry.label, {
                pressed: settings.level === entry.id, title: entry.note,
                onclick: () => { profile.merge("settings", { level: entry.id }); render(); },
              })))),

            setting("Information density", "How much fits on a screen.",
              h("div.row-s", null, ...["compact", "default", "comfortable"].map((value) => chip(value, {
                pressed: (settings.density || "default") === value,
                onclick: () => {
                  profile.merge("settings", { density: value });
                  document.documentElement.dataset.density = value;
                  render();
                },
              })))),

            setting("Theme", "Dark is the default. Light is a peer, not an inversion.",
              h("div.row-s", null, ...["dark", "light"].map((value) => chip(value, {
                pressed: (settings.theme || "dark") === value,
                onclick: () => {
                  profile.merge("settings", { theme: value });
                  document.documentElement.dataset.theme = value;
                  render();
                },
              })))),

            setting("Serendipity",
              "Occasionally surface something outside your usual interests. Personalisation without this becomes a filter bubble, which is the opposite of what this application is for.",
              h("button.switch", {
                type: "button", role: "switch",
                "aria-checked": String(settings.serendipity !== false),
                "aria-label": "Serendipity",
                onclick: () => { profile.merge("settings", { serendipity: settings.serendipity === false }); render(); },
              }))),
        }),

        panel({
          title: "Your data",
          body: h("div.stack", null,
            h("div.statgrid", null,
              stat({ label: "Level", value: String(level.level), note: level.rank }),
              stat({ label: "XP", value: String(learning.xp || 0) }),
              stat({ label: "Concepts touched", value: String(Object.keys(learning.mastery || {}).length) }),
              stat({ label: "Lessons read", value: String((learning.lessonsRead || []).length) }),
              stat({ label: "Watchlist", value: String(profile.at("watchlist", []).length) }),
              stat({ label: "Forecasts", value: String(profile.at("forecasts", []).length) })),

            h("div.row-s.wrap", null,
              h("button.btn", { type: "button", onclick: exportProfile }, icon("archive", 12), "Export"),
              h("label.btn", { style: { cursor: "pointer" } }, icon("plus", 12), "Import",
                h("input", { type: "file", accept: "application/json", style: { display: "none" },
                  onchange: (event) => importProfile(event, render) })),
              h("button.btn", {
                type: "button", style: { color: "var(--down)", borderColor: "var(--down-soft)" },
                onclick: async () => {
                  const ok = await confirmAction({
                    title: "Erase everything?",
                    body: "Progress, mastery, watchlists, forecasts and research projects. This cannot be undone \u2014 export first if you might want them back.",
                    confirmLabel: "Erase everything",
                  });
                  if (!ok) return;
                  profile.reset();
                  toast("Profile reset");
                  render();
                },
              }, icon("close", 12), "Reset everything"))),
          foot: storageAvailable
            ? "Stored in this browser's local storage. Export before clearing site data."
            : "This browser is blocking site data, so nothing will persist across reloads.",
        }),

        panel({
          title: "What this application contains",
          flush: true,
          body: h("div.rows", null,
            countRow("World model variables", modelStats.nodes, "Authored causal nodes"),
            countRow("Transmission channels", modelStats.edges, "Each with a mechanism, lag and confidence"),
            countRow("Concepts", CONCEPTS.length, "Four explanation depths each"),
            countRow("Historical lessons", LESSONS.length, "One surfaced per week, in rotation"),
            countRow("Technology entries", TECHNOLOGIES.length, "Each with validating and invalidating conditions"),
            countRow("Registered sources", SOURCES.length, `${keylessSources().length} usable without credentials`)),
        }),

        callout("The standing disclaimer",
          "Nothing here is investment advice. Model output enumerates channels and ranks them by plausibility — it does not forecast, and its numbers are relative weights inside one authored model rather than estimates of anything in the world.")
      )
    );
  };

  render();
  return root;
}

const setting = (label, note, control) => h("div.spread", { style: { alignItems: "flex-start", gap: "var(--s6)" } },
  h("div.grow", null,
    h("div", { style: { fontSize: "var(--t-body)", fontWeight: 550 } }, label),
    h("div.rowitem__meta", { style: { marginTop: "2px" } }, note)),
  h("div", { style: { flex: "none" } }, control));

const countRow = (label, value, note) => h("div.rowitem", null,
  h("span.grow", null,
    h("div", { style: { fontSize: "var(--t-body)" } }, label),
    h("div.rowitem__meta", note)),
  h("span.mono", { style: { fontSize: "var(--t-h4)" } }, String(value)));

function exportProfile() {
  const blob = new Blob([JSON.stringify(profile.export(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `meridian-profile-${isoDate()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Profile exported");
}

function importProfile(event, rerender) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!data || typeof data !== "object") throw new Error("not an object");
      profile.import(data);
      document.documentElement.dataset.theme = profile.at("settings.theme", "dark");
      document.documentElement.dataset.density = profile.at("settings.density", "default");
      toast("Profile imported");
      rerender();
    } catch (error) {
      toast(`Could not read that file: ${error.message}`, "down");
    }
  };
  reader.readAsText(file);
}
