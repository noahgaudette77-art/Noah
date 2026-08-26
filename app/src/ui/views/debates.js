/** DEBATES — consensus, the case against, and what would settle it. */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse } from "../../core/router.js";
import { load, dataOf } from "../../data/store.js";
import { panel, pageHead, badge, chip, callout, sectionHead, empty, confidence, direction, lag, meter } from "../components/kit.js";
import { openNode, openConcept } from "../components/drawer.js";
import { DEBATES, debateFor, debateForWeek } from "../../content/debates.js";
import { underappreciated, alreadyPriced, contestedEffects, seedsFromClusters } from "../../domain/contrarian.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { concept as findConcept } from "../../content/concepts.js";
import { weekStart, num, plural } from "../../core/format.js";

export function debatesView() {
  const root = h("div.view-inner");
  const { segments } = parse();
  if (segments[1]) { renderDebate(root, segments[1]); return root; }

  load("stories").then(() => renderIndex(root));
  return root;
}

function renderIndex(root) {
  const stories = dataOf("stories");
  const seeds = seedsFromClusters(stories?.clusters || [], 3);
  const featured = debateForWeek(weekStart());

  mount(root,
    pageHead("Contrarian",
      "Two things sit here. What the week's material implies that is not yet obvious, derived from the model — and the live disagreements where competent people currently take opposite sides."),

    seeds.length ? missingSection(seeds) : panel({
      title: "What most people are missing",
      body: empty({
        icon: "brain", title: "Needs an intelligence stream",
        body: "This section derives from whatever the week's developments actually touched. Run the pipeline and it fills in.",
      }),
    }),

    h("div", { style: { marginTop: "var(--s8)" } },
      sectionHead("This week's debate", "Rotates weekly, alongside the historical lesson"),
      debateCard(featured, true)),

    h("div", { style: { marginTop: "var(--s7)" } },
      sectionHead("Every live debate", `${DEBATES.length} questions where the disagreement is real and resolvable`),
      panel({
        flush: true,
        body: h("div.rows", null, ...DEBATES.map((entry) => h("button.rowitem", {
          onclick: () => go(`/debates/${entry.id}`),
        },
          h("span.grow", null,
            h("div.row-s.wrap", { style: { marginBottom: "2px" } },
              badge(entry.domain),
              entry.id === featured.id && badge("this week", "accent")),
            h("div.rowitem__title", entry.topic),
            h("div.rowitem__body.clamp-2", { style: { marginTop: "var(--s1)" } }, entry.stakes)),
          icon("chevron", 12)))),
      })),

    h("div", { style: { marginTop: "var(--s6)" } },
      callout("Why both sides, stated at their strongest",
        "A debate you can only argue one side of is a position, not an understanding. Each entry ends with what would settle it — the only part of an opinion that does any work, and the part almost always missing."))
  );
}

function missingSection(seeds) {
  const missed = underappreciated(seeds, { limit: 7 });
  const priced = alreadyPriced(seeds, { limit: 6 });
  const contested = seeds.length === 1 ? contestedEffects(seeds).slice(0, 5) : [];
  const seedLabels = seeds.map((id) => findNode(id)?.label).filter(Boolean);

  return h("div.grid.g-main", null,
    panel({
      title: "What most people are missing",
      sub: `derived from ${seedLabels.join(", ")}`,
      flush: true,
      body: missed.length ? h("div", null,
        h("div.panel__body", { style: { paddingBottom: "var(--s3)" } },
          h("p.dim", { style: { fontSize: "var(--t-small)" } },
            "First-order effects are priced within hours because everyone reads the same headline. What survives as an edge is a consequence that is well-evidenced but arrives through several steps over a long horizon. ",
            h("b", "That is a heuristic, not a law"),
            " — it names specific variables precisely so you can check whether each is genuinely underwatched or merely slow.")),
        h("div.rows", null, ...missed.map((effect) => h("button.rowitem", {
          onclick: () => openNode(effect.id),
        },
          h("span.rowitem__rank", `${effect.order}°`),
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
              direction(effect.direction, effect.node.kind),
              effect.contested && badge("contested", "warn")),
            h("div.rowitem__body", { style: { marginTop: "2px" } }, effect.because),
            h("div.row-s", { style: { marginTop: "var(--s2)" } },
              confidence(effect.confidence), lag(effect.lagMonths))),
          h("div", { style: { width: "48px" } },
            h("div.eyebrow", { style: { textAlign: "right", marginBottom: "2px" } }, num(effect.neglect * 100, 0)),
            meter(effect.neglect, { max: 1, height: 3 })))))
      ) : empty({ title: "Nothing beyond first order", body: "This week's material does not reach deeply into the model." }),
      foot: "Score combines distance from the shock, cumulative lag, evidence quality and size. High is a candidate for attention, not a recommendation.",
    }),

    h("div.stack", null,
      panel({
        title: "Already priced",
        sub: "first-order, and therefore consensus",
        flush: true,
        body: priced.length ? h("div.rows", null, ...priced.map((effect) =>
          h("button.rowitem", { onclick: () => openNode(effect.id) },
            h("span.grow", null,
              h("div.row-s.wrap", null,
                h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
                direction(effect.direction, effect.node.kind)),
              h("div.row-s", { style: { marginTop: "var(--s1)" } },
                confidence(effect.confidence), lag(effect.lagMonths))),
            icon("chevron", 12))))
          : h("div.panel__body", null, h("span.dim", "Nothing direct.")),
        foot: "Naming what is already priced is half the work. Most claims presented as contrarian are first-order effects in costume.",
      }),

      contested.length ? panel({
        title: "Genuinely ambiguous",
        sub: "independent chains disagree on the sign",
        flush: true,
        body: h("div.rows", null, ...contested.map((effect) =>
          h("button.rowitem", { onclick: () => openNode(effect.id) },
            h("span.grow", null,
              h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
              h("div.rowitem__meta", { style: { marginTop: "2px" } },
                `${plural(effect.pathCount, "route")} reach it, pushing in opposite directions`)),
            icon("chevron", 12)))),
        foot: "The most honest kind of \"nobody knows\", and exactly where an argument is worth having.",
      }) : null)
  );
}

function renderDebate(root, id) {
  const entry = debateFor(id);
  if (!entry) {
    mount(root, empty({ title: "No such debate",
      action: h("button.btn", { type: "button", onclick: () => go("/debates") }, "All debates") }));
    return;
  }

  mount(root,
    h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/debates"),
      style: { marginBottom: "var(--s4)" } }, "← Contrarian"),
    pageHead(entry.topic, entry.stakes),
    debateCard(entry, false),

    h("div", { style: { marginTop: "var(--s6)" } },
      h("div.row-s.wrap", null,
        ...entry.nodes.map((nodeId) => {
          const target = findNode(nodeId);
          return target ? chip(target.label, { onclick: () => openNode(nodeId) }) : null;
        }).filter(Boolean),
        ...(entry.concepts || []).map((conceptId) => {
          const concept = findConcept(conceptId);
          return concept ? chip(concept.term, { onclick: () => openConcept(conceptId) }) : null;
        }).filter(Boolean))),

    h("div", { style: { marginTop: "var(--s6)" } },
      h("button.btn.btn--primary", { type: "button", onclick: () => go(`/simulator?shock=${entry.nodes[0]}`) },
        icon("flask", 12), `Trace ${findNode(entry.nodes[0])?.label || "it"} through the model`))
  );
}

function debateCard(entry, compact) {
  const side = (label, claim, why, points, tone) => h("div", { class: `callout callout--${tone}` },
    h("div.callout__label", label),
    h("p", { style: { marginTop: "var(--s2)", color: "var(--ink)", fontWeight: 550, fontSize: "var(--t-base)" } }, claim),
    why && h("p", { style: { marginTop: "var(--s2)" } }, why),
    points?.length ? h("ul", { style: { marginTop: "var(--s3)" } },
      ...points.map((point) => h("li", point))) : null);

  return panel({
    title: compact ? entry.topic : "The two positions",
    sub: compact ? entry.domain : null,
    actions: compact ? h("button.btn.btn--sm", { type: "button", onclick: () => go(`/debates/${entry.id}`) },
      "Open", icon("chevron", 11)) : null,
    body: h("div.stack.prose", null,
      side("Consensus", entry.consensus.claim, entry.consensus.whyHeld, entry.consensus.evidence, "fact"),
      side("If the consensus is wrong", entry.contrarian.claim, null, entry.contrarian.case, "warn"),

      entry.contrarian.evidence?.length ? h("div", null,
        h("div.callout__label", { style: { marginBottom: "var(--s2)" } }, "Evidence for the contrarian read"),
        h("ul", null, ...entry.contrarian.evidence.map((point) => h("li", point)))) : null,

      h("div.callout", { style: { borderLeftColor: "var(--accent)" } },
        h("div.callout__label", "What would settle it"),
        h("ol", { style: { marginTop: "var(--s2)" } },
          ...entry.whatWouldSettleIt.map((point) => h("li", point)))),

      !compact ? h("p.dim", { style: { fontSize: "var(--t-small)" } },
        h("b", "Why it matters: "), entry.stakes) : null),
  });
}
