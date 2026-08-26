/** WORLD MODEL · SIMULATOR — the two views that make the causal graph usable. */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse, setParam } from "../../core/router.js";
import { profile } from "../../core/store.js";
import {
  panel,
  pageHead,
  badge,
  chip,
  confidence,
  direction,
  lag,
  callout,
  meter,
  stat,
  empty,
} from "../components/kit.js";
import { forceGraph, KIND_COLOUR } from "../charts/graph.js";
import { barRows } from "../charts/curve.js";
import { openNode, openConcept } from "../components/drawer.js";
import {
  NODES,
  GROUPS,
  KIND_LABEL,
  node as findNode,
  neighbourhood,
  findPaths,
  pathText,
  stats as modelStats,
  hubs,
} from "../../domain/worldmodel.js";
import { propagate, salience, orderName } from "../../domain/propagate.js";
import { num, plural } from "../../core/format.js";
import { XP } from "../../domain/learning.js";
import { conceptsForNode } from "../../content/concepts.js";

/* ========================= WORLD MODEL ========================= */

export function graphView() {
  const root = h("div.view-inner.view-inner--wide");
  const { params } = parse();
  let focus = params.get("focus") || "policy_rate";
  let depth = Number(params.get("depth")) || 1;
  let mode = "explore";
  // Defaults to the chain the platform was built to trace, so the feature
  // demonstrates itself rather than opening on an empty result.
  let pathFrom = "ai_capability";
  let pathTo = "copper";

  const render = () => {
    const target = findNode(focus) || NODES[0];
    focus = target.id;
    const local = neighbourhood(focus, depth);

    mount(root,
      pageHead("World model",
        `${modelStats.nodes} variables and ${modelStats.edges} transmission channels. Each edge is an authored analytical judgement with a stated mechanism, lag and confidence — not a measured coefficient, and not a forecast.`),

      h("div.row-s.wrap", { style: { marginBottom: "var(--s5)" } },
        chip("Explore a variable", { pressed: mode === "explore", onclick: () => { mode = "explore"; render(); } }),
        chip("Connect two variables", {
          pressed: mode === "path",
          onclick: () => { mode = "path"; render(); },
        }),
        mode === "path" && findNode(focus) && chip(`Start from ${findNode(focus).label}`, {
          onclick: () => { pathFrom = focus; render(); },
        })),

      mode === "explore" ? exploreMode(target, local, depth, (next) => { focus = next; setParam("focus", next); render(); },
        (nextDepth) => { depth = nextDepth; setParam("depth", nextDepth); render(); })
        : pathMode(pathFrom, pathTo, (from, to) => { pathFrom = from; pathTo = to; render(); })
    );
  };

  render();
  return root;
}

function nodePicker(value, onChange, { label = "Variable" } = {}) {
  const grouped = new Map();
  for (const node of NODES) {
    if (!grouped.has(node.group)) grouped.set(node.group, []);
    grouped.get(node.group).push(node);
  }
  return h("label.field", { style: { minWidth: "200px" } },
    h("span", label),
    h("select.select", { onchange: (event) => onChange(event.target.value) },
      ...[...grouped.entries()].map(([group, nodes]) =>
        h("optgroup", { label: group },
          ...nodes.map((node) => h("option", { value: node.id, selected: node.id === value }, node.label)))))
  );
}

function exploreMode(target, local, depth, onFocus, onDepth) {
  const downstream = propagate([{ id: target.id, magnitude: 1 }], { maxDepth: 3 });
  const concepts = conceptsForNode(target.id);

  return h("div.grid.g-main", null,
    h("div.stack", null,
      panel({
        title: target.label,
        sub: `${KIND_LABEL[target.kind] || target.kind} · ${target.group}`,
        actions: h("div.row-s", null,
          ...[1, 2].map((value) => chip(`${value} hop${value > 1 ? "s" : ""}`, {
            pressed: depth === value, onclick: () => onDepth(value) }))),
        flush: true,
        body: h("div", null,
          h("div.panel__body", { style: { paddingBottom: "var(--s3)" } },
            h("p.dim", { style: { fontSize: "var(--t-small)" } }, target.blurb)),
          forceGraph({
            nodes: local.nodes, edges: local.edges, focusId: target.id, height: 430,
            onSelect: (node) => { if (node && node.id !== target.id) onFocus(node.id); },
          }),
          h("div.panel__body", null,
            h("div.graph__legend", null,
              ...[...new Set(local.nodes.map((node) => node.kind))].map((kind) =>
                h("span", { style: { color: KIND_COLOUR[kind] || "var(--ink-3)" } },
                  h("i"), h("span.dim", KIND_LABEL[kind] || kind))),
              h("span", { style: { color: "var(--up)" } }, h("i", { style: { borderRadius: 0, height: "2px", border: 0, background: "currentColor" } }), h("span.dim", "same direction")),
              h("span", { style: { color: "var(--down)" } }, h("i", { style: { borderRadius: 0, height: "2px", border: 0, background: "currentColor" } }), h("span.dim", "inverse"))))),
        foot: h("span", null, `${local.nodes.length} variables and ${local.edges.length} channels within ${plural(depth, "hop")}. Click a node to re-centre.`),
      }),

      panel({
        title: "Downstream consequences",
        sub: "ranked by salience, not magnitude alone",
        flush: true,
        body: downstream.effects.length
          ? h("div.rows", null, ...[...downstream.effects].sort((a, b) => salience(b) - salience(a)).slice(0, 14).map((effect) =>
              h("button.rowitem", { onclick: () => onFocus(effect.id) },
                h("span.rowitem__rank", `${effect.order}°`),
                h("span.grow", null,
                  h("div.row-s.wrap", null,
                    h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
                    direction(effect.direction, effect.node.kind),
                    effect.contested && badge("contested", "warn")),
                  h("div.mono.faint", { style: { fontSize: "var(--t-tiny)", marginTop: "2px" } },
                    pathText({ edges: effect.paths[0].edges })),
                  h("div.row-s", { style: { marginTop: "var(--s2)" } },
                    confidence(effect.confidence), lag(effect.lagMonths),
                    h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, plural(effect.pathCount, "route")))),
                h("div", { style: { width: "54px" } }, meter(effect.magnitude, { max: downstream.effects[0].magnitude })))))
          : h("div.panel__body", null, h("span.dim", "Terminal node — nothing downstream.")),
      })),

    h("div.stack", null,
      panel({ title: "Jump to", body: h("div.stack-s", null,
        nodePicker(target.id, onFocus),
        h("div.row-s.wrap", null,
          ...hubs(8).map((entry) => chip(entry.node.label, { onclick: () => onFocus(entry.node.id) }))))}),

      concepts.length ? panel({
        title: "Understand it",
        flush: true,
        body: h("div.rows", null, ...concepts.map((concept) =>
          h("button.rowitem", { onclick: () => openConcept(concept.id) },
            h("span.grow", null,
              h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, concept.term),
              h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, concept.levels.beginner)),
            icon("chevron", 12)))),
      }) : null,

      panel({
        title: "Model composition",
        body: h("div.stack-s", null,
          barRows(GROUPS.map((group) => ({
            label: group,
            value: NODES.filter((node) => node.group === group).length,
            colour: "var(--cyan)",
          })).sort((a, b) => b.value - a.value), { format: (v) => String(v) }),
          h("hr.rule", { style: { margin: "var(--s4) 0" } }),
          h("div.stack-xs", null,
            ...Object.entries(modelStats.byConfidence).sort().map(([level, count]) =>
              h("div.spread", { style: { fontSize: "var(--t-small)" } },
                h("span.row-s", null, confidence(level), h("span.dim", level)),
                h("span.mono", String(count)))))),
        foot: "Edges rated low confidence are drawn and used, but the propagation engine steps confidence down further with each additional hop.",
      }),

      h("button.btn.btn--primary.btn--block", { type: "button", onclick: () => go(`/simulator?shock=${target.id}`) },
        icon("flask", 12), `Shock ${target.label}`))
  );
}

function pathMode(from, to, onChange) {
  const paths = findPaths(from, to, { maxDepth: 7, limit: 6 });
  const fromNode = findNode(from), toNode = findNode(to);
  // Causation is directional. If nothing runs one way, say so and offer the
  // other — which is frequently the question the reader actually meant.
  const reverse = paths.length ? [] : findPaths(to, from, { maxDepth: 7, limit: 1 });

  return h("div.stack", null,
    panel({
      title: "Connect the dots",
      sub: "every route between two variables",
      body: h("div.stack", null,
        h("div.row-s.wrap", null,
          nodePicker(from, (value) => onChange(value, to), { label: "From" }),
          h("span.dim", { style: { alignSelf: "flex-end", paddingBottom: "6px" } }, "→"),
          nodePicker(to, (value) => onChange(from, value), { label: "To" })),

        paths.length
          ? h("div.stack", null, ...paths.map((path, index) => h("div.callout", null,
              h("div.spread", { style: { marginBottom: "var(--s3)" } },
                h("div.row-s.wrap", null,
                  badge(`route ${index + 1}`, index === 0 ? "accent" : ""),
                  badge(`${path.length} hops`),
                  badge(path.sign > 0 ? "same direction" : "inverse", path.sign > 0 ? "up" : "down"),
                  confidence(path.confidence, { withLabel: true })),
                h("span.mono.dim", { style: { fontSize: "var(--t-tiny)" } },
                  `strength ${num(path.strength, 3)} · cumulative lag ~${path.lag}mo`)),
              h("div.mono", { style: { fontSize: "var(--t-small)", color: "var(--ink)", marginBottom: "var(--s3)", lineHeight: 1.6 } },
                pathText(path)),
              h("div.stack-xs", null, ...path.edges.map((edge, step) =>
                h("div", { style: { fontSize: "var(--t-small)" } },
                  h("b", { style: { color: "var(--ink)" } },
                    `${step + 1}. ${findNode(edge.from).label} `,
                    h("span", { class: edge.sign > 0 ? "up" : "down" }, edge.sign > 0 ? "→ " : "⊣ "),
                    `${findNode(edge.to).label}. `),
                  h("span", { style: { color: "var(--ink-2)" } }, edge.why))))))
            )
          : empty({
              icon: "graph",
              title: `No route from ${fromNode?.label} to ${toNode?.label}`,
              body: h("span", null,
                "The model contains no directed chain of seven hops or fewer in that direction. That is a real answer: not everything is connected, and asserting a link the model does not contain is exactly the failure this application exists to avoid.",
                reverse.length ? h("span", null, h("br"), h("br"),
                  h("b", `There is a route the other way — ${toNode.label} does reach ${fromNode.label}.`)) : null),
              action: reverse.length
                ? h("button.btn.btn--primary", { type: "button", onclick: () => onChange(to, from) },
                    icon("refresh", 12), `Trace ${toNode.label} → ${fromNode.label}`)
                : null,
            })),
      foot: "Cumulative lag sums the lag on each link. Real chains overlap in time, so treat it as an ordering, not a schedule.",
    }),

    callout("Why routes rather than a number",
      "The honest answer to \"what does A have to do with B\" is the set of mechanisms connecting them, with the weakest link named. A single correlation coefficient would hide precisely the part worth arguing about.")
  );
}

/* ========================= SIMULATOR ========================= */

const PRESETS = [
  { id: "oil-shock", label: "Oil rises sharply", seeds: [{ id: "oil", magnitude: 1.2 }],
    note: "A supply-driven crude move of the kind that follows a Middle East disruption." },
  { id: "ai-doubles", label: "AI compute demand doubles", seeds: [{ id: "ai_capex", magnitude: 1.4 }, { id: "compute_demand", magnitude: 1 }],
    note: "The chain the platform was built to trace: capex through silicon, buildings, power and grid." },
  { id: "fed-cuts", label: "The Fed cuts materially", seeds: [{ id: "policy_rate", magnitude: -1 }],
    note: "Three cuts' worth of easing, with no assumption about why." },
  { id: "inflation-returns", label: "Inflation re-accelerates", seeds: [{ id: "core_inflation", magnitude: 1 }, { id: "inflation_expectations", magnitude: 0.6 }],
    note: "Core reaccelerating with expectations starting to move — the state central banks fear most." },
  { id: "taiwan", label: "Taiwan Strait risk escalates", seeds: [{ id: "taiwan_risk", magnitude: 1.3 }],
    note: "Concentrated leading-edge fabrication makes this the highest-consequence single contingency in the model." },
  { id: "credit-event", label: "A credit event", seeds: [{ id: "financial_instability", magnitude: 1.2 }],
    note: "Leverage meeting a repricing, wherever funding is short and assets are long." },
  { id: "power-crunch", label: "Electricity supply tightens", seeds: [{ id: "power_demand", magnitude: 1.2 }, { id: "grid_capacity", magnitude: -0.6 }],
    note: "Load growth against a grid that cannot be built fast enough." },
  { id: "dollar-fall", label: "The dollar weakens sharply", seeds: [{ id: "usd", magnitude: -1.1 }],
    note: "A broad dollar move, which is a global financial condition rather than a price." },
];

export function simulatorView() {
  const root = h("div.view-inner");
  const { params } = parse();

  let seeds = params.get("shock")
    ? [{ id: params.get("shock"), magnitude: Number(params.get("mag")) || 1 }]
    : [{ id: "oil", magnitude: 1 }];
  let depth = 4;
  let activePreset = null;

  const run = () => {
    const valid = seeds.filter((seed) => findNode(seed.id));
    return valid.length ? propagate(valid, { maxDepth: depth }) : null;
  };

  const render = () => {
    const result = run();

    mount(root,
      pageHead("Simulator",
        "Push a variable and follow the consequences through the model. This enumerates channels and ranks them by plausibility — it does not predict, and every assumption it makes is listed below the result.",
        [h("button.btn", { type: "button", onclick: () => go("/graph") }, icon("graph", 12), "World model")]),

      h("div.grid.g-side", null,
        h("div.stack", null,
          panel({
            title: "Scenario",
            flush: true,
            body: h("div", null,
              h("div.panel__body.stack-s", null,
                h("span.eyebrow", "Presets"),
                h("div.stack-xs", null, ...PRESETS.map((preset) => h("button.rowitem", {
                  style: { padding: "var(--s3) 0", border: 0,
                    background: activePreset === preset.id ? "var(--accent-soft)" : "none" },
                  onclick: () => { seeds = preset.seeds.map((s) => ({ ...s })); activePreset = preset.id; render(); },
                },
                  h("span.grow", null,
                    h("div", { style: { fontSize: "var(--t-body)", fontWeight: 550 } }, preset.label),
                    h("div.rowitem__meta.clamp-2", { style: { marginTop: "2px" } }, preset.note)),
                  icon("chevron", 11))))),

              h("div.panel__body.stack-s", { style: { borderTop: "1px solid var(--line)" } },
                h("span.eyebrow", "Or build your own"),
                ...seeds.map((seed, index) => h("div.stack-xs", null,
                  h("div.row-s", null,
                    nodePicker(seed.id, (value) => { seeds[index].id = value; activePreset = null; render(); },
                      { label: `Shock ${index + 1}` }),
                    seeds.length > 1 && h("button.iconbtn", {
                      type: "button", "aria-label": "Remove",
                      style: { alignSelf: "flex-end", marginBottom: "4px" },
                      onclick: () => { seeds.splice(index, 1); activePreset = null; render(); },
                    }, icon("minus", 12))),
                  h("div.row-s", null,
                    h("input", {
                      type: "range", min: "-2", max: "2", step: "0.1", value: String(seed.magnitude),
                      oninput: (event) => {
                        seeds[index].magnitude = Number(event.target.value);
                        activePreset = null;
                        render();
                      },
                    }),
                    h("span.mono", { style: { minWidth: "44px", textAlign: "right", fontSize: "var(--t-small)" } },
                      `${seed.magnitude > 0 ? "+" : ""}${num(seed.magnitude, 1)}`)))),

                h("div.row-s", null,
                  h("button.btn.btn--sm", {
                    type: "button",
                    onclick: () => { seeds.push({ id: "policy_rate", magnitude: 1 }); activePreset = null; render(); },
                  }, icon("plus", 11), "Add a second shock"),
                  h("div.push.row-s", null,
                    h("span.dim", { style: { fontSize: "var(--t-tiny)" } }, "depth"),
                    ...[2, 3, 4, 5].map((value) => chip(String(value), {
                      pressed: depth === value, onclick: () => { depth = value; render(); } })))))),
          }),

          result && panel({
            title: "Assumptions",
            sub: "read these before the result",
            flush: true,
            body: h("div.rows", null, ...result.assumptions.map((assumption) =>
              h("div.rowitem", null,
                h("span.grow", null,
                  h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, assumption.label),
                  h("div.rowitem__body", { style: { marginTop: "2px" } }, assumption.detail))))),
          })),

        h("div.stack", null, result ? resultPanels(result, seeds) : empty({
          title: "Choose a shock", body: "Pick a preset or build your own to see how it propagates.",
        }))
      )
    );
  };

  render();
  return root;
}

function resultPanels(result, seeds) {
  const ordered = [...result.effects].sort((a, b) => salience(b) - salience(a));
  const seedLabels = result.seeds.map((seed) =>
    `${seed.node.label} ${seed.magnitude > 0 ? "up" : "down"}`).join(", ");

  return h("div.stack", null,
    panel({
      title: "Result",
      sub: seedLabels,
      actions: h("button.btn.btn--sm", {
        type: "button",
        onclick: () => {
          const saved = profile.at("scenarios", []);
          profile.set({
            scenarios: [{ id: `sc-${Date.now()}`, seeds, savedAt: Date.now(), label: seedLabels }, ...saved].slice(0, 20),
            learning: { ...profile.at("learning", {}), xp: (profile.at("learning.xp", 0) || 0) + XP.scenarioRun },
          });
          import("../components/kit.js").then((kit) => kit.toast("Scenario saved to your research"));
        },
      }, icon("bookmark", 11), "Save"),
      body: h("div.statgrid", null,
        stat({ label: "Consequences traced", value: String(result.effects.length) }),
        stat({ label: "First order", value: String(result.effects.filter((e) => e.order === 1).length) }),
        stat({ label: "Third order or deeper", value: String(result.effects.filter((e) => e.order >= 3).length) }),
        stat({ label: "Contested sign", value: String(result.effects.filter((e) => e.contested).length),
               note: "independent chains disagree" })),
    }),

    ...result.byOrder.map(([order, effects]) => panel({
      title: orderName(order),
      sub: `${effects.length} · ${order === 1 ? "direct channels, usually already priced" : order === 2 ? "where the analysis starts" : "speculative — the confidence step-down applies"}`,
      flush: true,
      body: h("div.rows", null, ...[...effects].sort((a, b) => salience(b) - salience(a)).map((effect) =>
        h("button.rowitem", { onclick: () => openNode(effect.id) },
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
              direction(effect.direction, effect.node.kind),
              effect.contested && badge("contested", "warn")),
            h("div.rowitem__body", { style: { marginTop: "2px" } },
              effect.paths[0].edges.at(-1).why),
            h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
              confidence(effect.confidence), lag(effect.lagMonths),
              h("span.faint.mono", { style: { fontSize: "var(--t-tiny)" } },
                pathText({ edges: effect.paths[0].edges })))),
          h("div", { style: { width: "58px" } },
            h("div.mono", { style: { fontSize: "var(--t-tiny)", textAlign: "right", color: effect.direction > 0 ? "var(--up)" : "var(--down)" } },
              `${effect.impact > 0 ? "+" : ""}${num(effect.impact, 2)}`),
            meter(effect.magnitude, { max: ordered[0].magnitude, height: 3,
              tone: effect.direction > 0 ? "up" : "down" }))))),
    })),

    result.effects.some((effect) => effect.contested) ? callout("Contested signs",
      h("span", null,
        "Where independent chains push in opposite directions, the model reports the net and flags it. ",
        h("b", "A contested sign is a finding, not a defect"),
        " — it identifies exactly the question a real analyst would argue about, and where the outcome depends on which channel dominates."),
      "warn") : null,

    callout("What this is not",
      "No probabilities, no magnitudes in real units, and no policy response. Numbers are relative weights inside one authored model; two effects can be compared to each other and to nothing else.")
  );
}
