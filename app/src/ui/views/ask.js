/** ASK — put a question to the platform's own knowledge. */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse, setParam } from "../../core/router.js";
import { profile } from "../../core/store.js";
import { load, dataOf } from "../../data/store.js";
import { panel, pageHead, badge, chip, cite, callout, meter, stat, empty, confidence, direction, lag } from "../components/kit.js";
import { explainPanel } from "../components/explain.js";
import { openNode, openConcept, openStory } from "../components/drawer.js";
import { ask, EXAMPLE_QUESTIONS } from "../../domain/ask.js";
import { node as findNode, pathText } from "../../domain/worldmodel.js";
import { orderName } from "../../domain/propagate.js";
import { num, compact, plural } from "../../core/format.js";

export function askView() {
  const root = h("div.view-inner");
  const { params } = parse();
  const initial = params.get("q") || "";

  const input = h("input.input", {
    type: "text", placeholder: "Ask about anything in here…",
    value: initial, autocomplete: "off", spellcheck: "false",
    style: { height: "40px", fontSize: "var(--t-lead)" },
  });
  const answerHost = h("div", { style: { marginTop: "var(--s6)" } });

  /** The catalogue of answerable shapes, retired once a question has been asked. */
  const reference = h("div", { style: { marginTop: "var(--s7)" }, hidden: Boolean(initial) },
    panel({
      title: "What it can answer",
      flush: true,
      body: h("div.rows", null, ...EXAMPLE_QUESTIONS.map((example) =>
        h("button.rowitem", { onclick: () => { input.value = example.text; run(example.text); } },
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, example.text),
            h("div.rowitem__meta", example.intent)),
          icon("chevron", 12)))),
      foot: "Anything outside these shapes returns an honest miss rather than a plausible paragraph.",
    }));

  let answered = false;

  const run = (question) => {
    if (!question.trim()) { mount(answerHost); return; }
    if (!answered) { answered = true; reference.hidden = true; }
    setParam("q", question);
    const context = {
      companies: dataOf("fundamentals")?.companies || [],
      clusters: dataOf("stories")?.clusters || [],
      learning: profile.at("learning", {}),
    };
    const answer = ask(question, context);
    mount(answerHost, renderAnswer(answer, run));
    answerHost.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") run(input.value);
  });

  Promise.all([load("stories"), load("fundamentals")]).then(() => {
    if (initial) run(initial);
  });

  mount(root,
    pageHead("Ask",
      "There is no language model here and nothing is generated. Your question is matched to an intent, the entities are resolved against the corpora, and the answer is assembled from the world model, the concepts, the lessons, the debates, the covered companies and the current stream. It cannot invent an answer — and it will say so rather than bluff."),

    panel({
      body: h("div.stack-s", null,
        h("div.row-s", null,
          h("span.grow", null, input),
          h("button.btn.btn--primary.btn--lg", { type: "button", onclick: () => run(input.value) },
            icon("search", 13), "Ask")),
        h("div.row-s.wrap", null,
          ...EXAMPLE_QUESTIONS.slice(0, 6).map((example) =>
            chip(example.text, { title: example.intent, onclick: () => { input.value = example.text; run(example.text); } })))),
    }),

    answerHost,

    reference
  );

  queueMicrotask(() => input.focus());
  return root;
}

function renderAnswer(answer, run) {
  return h("div.stack", null,
    ...answer.blocks.map((block) => renderBlock(block, run)).filter(Boolean),

    answer.action ? h("div.row-s", null,
      h("button.btn.btn--primary", { type: "button", onclick: () => go(answer.action.route) },
        answer.action.label, icon("chevron", 12))) : null,

    answer.followUps?.length ? panel({
      title: "Then ask",
      body: h("div.row-s.wrap", null, ...answer.followUps.map((question) =>
        chip(question, { onclick: () => run(question) }))),
    }) : null
  );
}

function renderBlock(block, run) {
  switch (block.type) {
    case "nothing": return panel({
      body: empty({
        icon: "search",
        title: `Nothing here matches "${block.term}"`,
        body: block.note,
      }),
    });

    case "concept": return explainPanel(block.concept.id, { initialLevel: block.startAt || null });

    case "node": return panel({
      title: block.node.label,
      sub: `${block.node.kind} · ${block.node.group}`,
      actions: h("button.btn.btn--sm", { type: "button", onclick: () => openNode(block.node.id) },
        "Open", icon("chevron", 11)),
      body: h("div.stack-s", null,
        h("p.prose", { style: { fontSize: "var(--t-base)" } }, block.node.blurb),
        block.node.proxies?.length ? h("div.row-s.wrap", null,
          h("span.eyebrow", "Follow it with"),
          ...block.node.proxies.map((proxy) => h("span.chip.mono", proxy))) : null),
    });

    case "concepts": return panel({
      title: "Read it properly",
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.concepts.map((concept) =>
        h("button.rowitem", { onclick: () => openConcept(concept.id) },
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, concept.term),
            h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, concept.levels.beginner)),
          icon("chevron", 12)))),
    });

    case "company": {
      const company = block.company;
      const d = company.derived || {};
      return panel({
        title: `${company.ticker} — ${company.name}`,
        sub: company.sic,
        actions: h("button.btn.btn--sm", { type: "button", onclick: () => go(`/companies/${company.ticker}`) },
          "Full page", icon("chevron", 11)),
        body: h("div.statgrid", null,
          stat({ label: `Revenue · ${company.currency}`, value: compact(d.revenue), large: true,
            delta: Number.isFinite(d.revenueGrowth) ? `${d.revenueGrowth > 0 ? "+" : ""}${num(d.revenueGrowth * 100, 1)}%` : null }),
          stat({ label: "Operating margin", value: Number.isFinite(d.operatingMargin) ? `${num(d.operatingMargin * 100, 1)}%` : "—" }),
          stat({ label: "FCF margin", value: Number.isFinite(d.fcfMargin) ? `${num(d.fcfMargin * 100, 1)}%` : "—" }),
          stat({ label: "Model variable", value: findNode(company.node)?.label || "—" })),
        foot: "Figures as filed with the SEC. No price, so no valuation.",
      });
    }

    case "lesson": return panel({
      title: block.lesson.title,
      sub: block.lesson.era,
      actions: h("button.btn.btn--sm", { type: "button", onclick: () => go(`/history/${block.lesson.id}`) },
        "Read", icon("chevron", 11)),
      body: h("p.read", block.lesson.hook),
    });

    case "effects": return panel({
      title: `What ${block.seed.label} moves`,
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.effects.map((effect) => effectRow(effect))),
    });

    case "simulation": {
      const { result, seed, magnitude } = block;
      return panel({
        title: `If ${seed.label} moves ${magnitude > 0 ? "higher" : "lower"}`,
        sub: `${result.effects.length} consequences traced`,
        flush: true,
        body: h("div", null,
          h("div.statgrid", null,
            stat({ label: "First order", value: String(result.effects.filter((e) => e.order === 1).length),
              note: "direct, usually already priced" }),
            stat({ label: "Second order", value: String(result.effects.filter((e) => e.order === 2).length),
              note: "where the analysis starts" }),
            stat({ label: "Third or deeper", value: String(result.effects.filter((e) => e.order >= 3).length) }),
            stat({ label: "Contested sign", value: String(result.effects.filter((e) => e.contested).length),
              note: "chains disagree" })),
          h("div.rows", null, ...result.effects.slice(0, 12).map((effect) => effectRow(effect)))),
      });
    }

    case "assumptions": return panel({
      title: "Assumptions",
      sub: "read these before the result",
      flush: true,
      body: h("div.rows", null, ...block.assumptions.map((assumption) =>
        h("div.rowitem", null,
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, assumption.label),
            h("div.rowitem__body", { style: { marginTop: "2px" } }, assumption.detail))))),
    });

    case "paths": {
      const { from, to, paths, reverse } = block;
      if (!paths.length) {
        return panel({
          body: empty({
            icon: "graph",
            title: `No route from ${from.label} to ${to.label}`,
            body: h("span", null,
              "The model contains no directed chain of seven hops or fewer in that direction. Not everything is connected, and asserting a link the model does not contain is exactly the failure this avoids.",
              reverse.length ? h("span", null, h("br"), h("br"),
                h("b", `There is a route the other way — ${to.label} does reach ${from.label}.`)) : null),
            action: reverse.length
              ? h("button.btn.btn--primary", { type: "button", onclick: () => run(`connect ${to.label} to ${from.label}`) },
                  icon("refresh", 12), `Trace ${to.label} → ${from.label}`)
              : null,
          }),
        });
      }
      return panel({
        title: `${from.label} → ${to.label}`,
        sub: `${plural(paths.length, "route")} through the model`,
        body: h("div.stack", null, ...paths.map((path, index) => h("div.callout", null,
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
              h("span", { style: { color: "var(--ink-2)" } }, edge.why))))))),
        foot: "Cumulative lag sums each link. Real chains overlap in time, so read it as an ordering rather than a schedule.",
      });
    }

    case "exposure": return panel({
      title: `Exposed to ${block.seed.label}`,
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.exposed.map(({ company, effect }) =>
        h("button.rowitem", { onclick: () => go(`/companies/${company.ticker}`) },
          h("span.rowitem__rank", `${effect.order}°`),
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.mono", { style: { fontWeight: 650 } }, company.ticker),
              h("span.dim.truncate", { style: { maxWidth: "26ch" } }, company.name),
              direction(effect.direction, "sector")),
            h("div.row-s.wrap", { style: { marginTop: "var(--s1)" } },
              confidence(effect.confidence), lag(effect.lagMonths),
              h("span.faint.mono", { style: { fontSize: "var(--t-tiny)" } },
                pathText({ edges: effect.paths[0].edges })))),
          icon("chevron", 12)))),
      foot: "Exposure through the model, carrying no price — so it is not a view on the shares.",
    });

    case "lessons": return panel({
      title: "Historical precedent",
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.lessons.map((lesson) =>
        h("button.rowitem", { onclick: () => go(`/history/${lesson.id}`) },
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, lesson.title),
              badge(lesson.era)),
            h("div.rowitem__body.clamp-2", { style: { marginTop: "2px" } }, lesson.hook)),
          icon("chevron", 12)))),
    });

    case "debates": return panel({
      title: "The case against",
      sub: `${plural(block.debates.length, "live disagreement")}`,
      flush: true,
      body: h("div.rows", null, ...block.debates.map((entry) =>
        h("button.rowitem", { onclick: () => go(`/debates/${entry.id}`) },
          h("span.grow.stack-s", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.topic),
            h("div.callout.callout--fact", { style: { padding: "var(--s3)" } },
              h("div.callout__label", "Consensus"),
              h("p", { style: { marginTop: "2px" } }, entry.consensus.claim)),
            h("div.callout.callout--warn", { style: { padding: "var(--s3)" } },
              h("div.callout__label", "If it is wrong"),
              h("p", { style: { marginTop: "2px" } }, entry.contrarian.claim))),
          icon("chevron", 12)))),
    });

    case "contested": return panel({
      title: "Genuinely ambiguous",
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.effects.map((effect) => effectRow(effect))),
    });

    case "priced": return panel({
      title: "Already priced",
      sub: block.note,
      body: h("div.row-s.wrap", null, ...block.effects.map((effect) =>
        h("span.chip", null, effect.node.label, " ", direction(effect.direction, effect.node.kind)))),
    });

    case "underappreciated": return panel({
      title: "What most people are missing",
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.effects.map((effect) =>
        h("button.rowitem", { onclick: () => openNode(effect.id) },
          h("span.rowitem__rank", `${effect.order}°`),
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
              direction(effect.direction, effect.node.kind),
              effect.contested && badge("contested", "warn")),
            h("div.rowitem__body", { style: { marginTop: "2px" } }, effect.because)),
          h("div", { style: { width: "44px" } }, meter(effect.neglect, { max: 1, height: 3 }))))),
    });

    case "next-steps": return panel({
      title: "What to study next",
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.tracks.map((entry) =>
        h("button.rowitem", { onclick: () => go(`/curriculum/${entry.track.id}`) },
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.track.title),
              badge(`${entry.done}/${entry.total}`)),
            entry.next && h("div.rowitem__meta", { style: { marginTop: "2px" } },
              `Next: ${entry.next.label} — ${entry.next.why.toLowerCase()}`)),
          icon("chevron", 12)))),
    });

    case "gaps": return panel({
      title: "Your weakest areas",
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.gaps.map((gap) =>
        h("button.rowitem", { onclick: () => go(`/knowledge/${gap.concept.id}`) },
          h("span.grow", null,
            h("div.row-s.wrap", null,
              h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, gap.concept.term),
              badge(gap.concept.domain),
              gap.overdue && badge("overdue", "warn")),
            h("div.rowitem__meta", { style: { marginTop: "2px" } }, gap.reason)),
          h("div", { style: { width: "44px" } }, meter(gap.level, { max: 1, height: 3 }))))),
    });

    case "stream": return panel({
      title: "What matters right now",
      sub: block.note,
      flush: true,
      body: h("div.rows", null, ...block.clusters.map((cluster) =>
        h("button.rowitem", { onclick: () => openStory(cluster) },
          h("span.rowitem__rank", `#${cluster.rank}`),
          h("span.grow", null,
            h("div.row-s.wrap", { style: { marginBottom: "2px" } },
              cluster.isDecision && badge("decision", "accent"),
              ...(cluster.nodes || []).slice(0, 2).map((entry) =>
                badge(findNode(entry.nodeId)?.label || entry.nodeId))),
            h("div.rowitem__title.clamp-2", cluster.lead.title),
            h("div.row-s", { style: { marginTop: "var(--s2)" } },
              cite(cluster.lead.sourceId, { url: cluster.lead.url, at: cluster.lead.publishedAt }))),
          icon("chevron", 12)))),
    });

    default: return null;
  }
}

function effectRow(effect) {
  return h("button.rowitem", { onclick: () => openNode(effect.id) },
    h("span.rowitem__rank", `${effect.order}°`),
    h("span.grow", null,
      h("div.row-s.wrap", null,
        h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
        direction(effect.direction, effect.node.kind),
        effect.contested && badge("contested", "warn")),
      h("div.rowitem__body", { style: { marginTop: "2px" } }, effect.paths[0]?.edges.at(-1)?.why),
      h("div.row-s.wrap", { style: { marginTop: "var(--s2)" } },
        confidence(effect.confidence), lag(effect.lagMonths),
        h("span.faint", { style: { fontSize: "var(--t-tiny)" } }, orderName(effect.order)))),
    icon("chevron", 12));
}
