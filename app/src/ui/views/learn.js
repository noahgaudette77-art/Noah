/** LEARN — quiz, spaced review, free-response challenge, and progress. */

import { h, mount, icon } from "../../core/dom.js";
import { go, parse } from "../../core/router.js";
import { profile } from "../../core/store.js";
import {
  panel,
  pageHead,
  badge,
  chip,
  meter,
  stat,
  callout,
  empty,
  toast,
} from "../components/kit.js";
import { openConcept, openNode } from "../components/drawer.js";
import { generateQuiz, challengePrompt, evaluateFreeResponse } from "../../domain/quiz.js";
import {
  levelFromXp,
  globalScore,
  knowledgeGaps,
  dueForReview,
  reviewConcept,
  recordActivity,
  earnedBadges,
  BADGES,
  XP,
} from "../../domain/learning.js";
import { concept as findConcept } from "../../content/concepts.js";
import { node as findNode } from "../../domain/worldmodel.js";
import { barRows } from "../charts/curve.js";
import { plural, weekStart } from "../../core/format.js";

export function learnView() {
  const root = h("div.view-inner");
  const { params } = parse();
  const start = params.get("start");

  if (start === "quiz") { runQuiz(root, params); return root; }
  if (start === "challenge") { runChallenge(root); return root; }
  if (start === "review") { runQuiz(root, params, { reviewOnly: true }); return root; }

  renderDashboard(root);
  return root;
}

/* ========================= DASHBOARD ========================= */

function renderDashboard(root) {
  const learning = profile.at("learning", {});
  const level = levelFromXp(learning.xp || 0);
  const score = globalScore(learning);
  const gaps = knowledgeGaps(learning, 6);
  const due = dueForReview(learning, 8);
  const badges = earnedBadges(learning);

  mount(root,
    pageHead("Learn",
      "Progress here is earned by demonstrating recall over time and by reasoning through scenarios. Opening pages does almost nothing, deliberately — a score you can farm is not feedback."),

    h("div.grid.g-main", null,
      h("div.stack", null,
        panel({
          title: "Start something",
          flush: true,
          body: h("div.rows", null,
            action("Weekly quiz", "Ten questions — roughly half written against common misconceptions, half generated from the world model.", "spark",
              () => go("/learn?start=quiz")),
            due.length ? action(`Review ${plural(due.length, "concept")}`,
              "Scheduled by spaced repetition. Mastery decays without it, because that is what actually happens to knowledge.", "clock",
              () => go("/learn?start=review")) : null,
            action("Challenge me", "A free-response scenario. Write what you think follows; your answer is scored against every channel the model traces.", "brain",
              () => go("/learn?start=challenge")),
            action("Follow a curriculum", "Ordered paths rather than a ranked list of weaknesses. Most of these ideas only make sense once another one is in place.", "layers",
              () => go("/curriculum"))),
        }),

        panel({
          title: "Knowledge gaps",
          sub: "ranked by weakness, centrality and how overdue they are",
          flush: true,
          body: gaps.next.length ? h("div.rows", null, ...gaps.next.map((gap) =>
            h("button.rowitem", { onclick: () => go(`/knowledge/${gap.concept.id}`) },
              h("span.grow", null,
                h("div.row-s.wrap", null,
                  h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, gap.concept.term),
                  badge(gap.concept.domain),
                  gap.overdue && badge("overdue", "warn")),
                h("div.rowitem__meta", { style: { marginTop: "2px" } }, gap.reason)),
              h("div", { style: { width: "54px" } }, meter(gap.level, { height: 3 })),
              icon("chevron", 12))))
            : empty({ title: "No gaps identified", body: "Answer a few questions and this becomes useful." }),
          foot: gaps.domains.length
            ? `Weakest areas: ${gaps.domains.slice(0, 3).map((entry) => `${entry.label} (${entry.score})`).join(", ")}.`
            : null,
        })),

      h("div.stack", null,
        panel({
          title: "Standing",
          sub: level.rank,
          body: h("div.stack-s", null,
            stat({ label: "Global knowledge score", value: String(score.score), large: true,
              note: `${score.conceptsTouched} of ${score.conceptsTotal} concepts touched` }),
            h("div", null,
              h("div.spread", { style: { fontSize: "var(--t-tiny)", marginBottom: "2px" } },
                h("span.dim", `Level ${level.level} · ${level.rank}`),
                h("span.mono.dim", `${level.into}/${level.span} XP`)),
              meter(level.progress)),
            h("hr.rule", { style: { margin: "var(--s4) 0" } }),
            barRows([
              { label: "Depth", value: score.components.depth, colour: "var(--accent)" },
              { label: "Breadth", value: score.components.breadth, colour: "var(--cyan)" },
              { label: "Retention", value: score.components.retention, colour: "var(--violet)" },
              { label: "Reasoning", value: score.components.reasoning, colour: "var(--up)" },
            ], { max: 100, format: (v) => String(Math.round(v)) })),
          foot: "Depth is average mastery, breadth is how many domains are genuinely represented, retention is whether mastery survives between reviews, and reasoning is scenario performance — which tests transfer rather than recall.",
        }),

        panel({
          title: "By domain",
          flush: true,
          body: h("div.panel__body.stack-s", null, ...score.domains.map((entry) => h("div", null,
            h("div.spread", { style: { fontSize: "var(--t-small)", marginBottom: "2px" } },
              h("span", entry.label), h("span.mono.dim", `${entry.score}`)),
            meter(entry.score, { max: 100, height: 4, tone: entry.score > 60 ? "up" : "" })))),
        }),

        panel({
          title: "Streak",
          body: h("div.stack-s", null,
            h("div.row-s", null,
              stat({ label: "Current", value: String(learning.streak || 0), unit: "d" }),
              stat({ label: "Best", value: String(learning.bestStreak || 0), unit: "d" }),
              stat({ label: "Active days", value: String((learning.days || []).length) })),
            h("p.dim", { style: { fontSize: "var(--t-tiny)" } },
              "A streak counts days with real activity. It is a nudge, not a score — nothing in the knowledge score depends on it.")),
        }),

        panel({
          title: "Badges",
          sub: `${badges.length}/${BADGES.length}`,
          body: h("div.row-s.wrap", null, ...BADGES.map((badgeDef) => {
            const earned = badges.some((entry) => entry.id === badgeDef.id);
            return h("span", {
              class: `chip${earned ? "" : ""}`, title: badgeDef.note,
              style: earned ? { borderColor: "var(--accent-line)", background: "var(--accent-soft)", color: "var(--ink)" }
                : { opacity: 0.45 },
            }, earned ? icon("check", 10) : null, badgeDef.label);
          })),
        }))
    )
  );
}

const action = (title, body, iconName, onclick) => h("button.rowitem", { onclick },
  h("span.rowitem__rank", null, icon(iconName, 14)),
  h("span.grow", null,
    h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, title),
    h("div.rowitem__body", { style: { marginTop: "2px" } }, body)),
  icon("chevron", 12));

/* ========================= QUIZ ========================= */

function runQuiz(root, params, { reviewOnly = false } = {}) {
  const learning = profile.at("learning", {});
  const seed = params.get("seed") || `${weekStart()}:${reviewOnly ? "review" : "quiz"}`;
  const focusConcept = params.get("concept");

  let quiz = generateQuiz({ seed, count: 10, mastery: learning.mastery || {} });
  if (focusConcept) {
    const focused = quiz.questions.filter((question) => question.concept === focusConcept);
    if (focused.length) quiz = { ...quiz, questions: [...focused, ...quiz.questions.filter((q) => q.concept !== focusConcept)].slice(0, 10) };
  }
  if (reviewOnly) {
    const due = new Set(dueForReview(learning, 20).map((entry) => entry.concept.id));
    const filtered = quiz.questions.filter((question) => due.has(question.concept));
    if (filtered.length >= 4) quiz = { ...quiz, questions: filtered };
  }

  let index = 0;
  const answers = [];

  const render = () => {
    if (index >= quiz.questions.length) { renderResults(); return; }
    const question = quiz.questions[index];
    let chosen = null;
    let revealed = false;

    const options = h("div.stack-s");
    const feedback = h("div");

    const paint = () => {
      mount(options, ...question.options.map((option, i) => h("button", {
        type: "button",
        class: "rowitem",
        style: {
          border: "1px solid var(--line)", borderRadius: "var(--radius)",
          background: !revealed ? (chosen === i ? "var(--bg-hover)" : "var(--bg-panel)")
            : i === question.answer ? "var(--up-soft)"
            : chosen === i ? "var(--down-soft)" : "var(--bg-panel)",
          borderColor: revealed && i === question.answer ? "var(--up)"
            : revealed && chosen === i ? "var(--down)" : "var(--line)",
          cursor: revealed ? "default" : "pointer",
        },
        onclick: () => { if (revealed) return; chosen = i; submit(); },
      },
        h("span.rowitem__rank", String.fromCharCode(65 + i)),
        h("span.grow", { style: { fontSize: "var(--t-base)", lineHeight: 1.45 } }, option),
        revealed && i === question.answer ? icon("check", 14) : null)));
    };

    const submit = () => {
      revealed = true;
      const correct = chosen === question.answer;
      answers.push({ question, chosen, correct });

      const current = profile.at("learning", {});
      const mastery = { ...(current.mastery || {}) };
      if (question.concept) {
        mastery[question.concept] = reviewConcept(mastery[question.concept], correct,
          { hard: question.difficulty >= 3 });
      }
      const reasoningQuestion = question.generated || question.difficulty >= 3;
      const reasoning = { ...(current.reasoning || { seen: 0, correct: 0 }) };
      if (reasoningQuestion) {
        reasoning.seen += 1;
        if (correct) reasoning.correct += 1;
      }
      const gained = correct ? (question.difficulty >= 3 ? XP.answerCorrectHard : XP.answerCorrect) : XP.answerWrong;
      profile.merge("learning", {
        ...recordActivity({ ...current, mastery, reasoning }),
        mastery, reasoning,
        xp: (current.xp || 0) + gained,
        answered: { ...(current.answered || {}), [question.id]: { at: Date.now(), correct } },
      });

      paint();
      mount(feedback,
        h("div", { class: `callout ${correct ? "callout--fact" : "callout--warn"}`, style: { marginTop: "var(--s5)" } },
          h("div.callout__label", correct ? `Correct · +${gained} XP` : "Not quite"),
          h("p", { style: { marginTop: "var(--s2)" } }, question.why),
          question.concept && h("div.row-s", { style: { marginTop: "var(--s3)" } },
            h("button.btn.btn--sm", { type: "button", onclick: () => openConcept(question.concept) },
              icon("brain", 11), `Explain ${findConcept(question.concept)?.term || "this"}`),
            ...(question.nodes || []).map((nodeId) => h("button.btn.btn--sm", {
              type: "button", onclick: () => openNode(nodeId),
            }, findNode(nodeId)?.label || nodeId)))),
        h("button.btn.btn--primary", { type: "button", style: { marginTop: "var(--s5)" },
          onclick: () => { index++; render(); } },
          index + 1 >= quiz.questions.length ? "See results" : "Next question", icon("chevron", 12)));
    };

    paint();

    mount(root,
      h("div.spread", { style: { marginBottom: "var(--s5)" } },
        h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/learn") }, "← Exit"),
        h("span.mono.dim", { style: { fontSize: "var(--t-small)" } },
          `${index + 1} / ${quiz.questions.length}`)),
      h("div.meter", { style: { marginBottom: "var(--s7)" } },
        h("div.meter__fill", { style: { width: `${(index / quiz.questions.length) * 100}%` } })),

      h("div.view-inner--read", { style: { padding: 0, margin: "0 auto" } },
        h("div.row-s.wrap", { style: { marginBottom: "var(--s4)" } },
          badge(question.generated ? "generated from the world model" : "written", question.generated ? "ai" : ""),
          badge(["", "recall", "mechanism", "judgement"][question.difficulty] || "", "cyan"),
          question.concept && badge(findConcept(question.concept)?.domain || "")),
        h("h2", { style: { fontSize: "var(--t-h3)", fontWeight: 600, letterSpacing: "-0.02em",
          lineHeight: 1.3, marginBottom: "var(--s6)" } }, question.prompt),
        options,
        feedback)
    );
  };

  const renderResults = () => {
    const correct = answers.filter((entry) => entry.correct).length;
    const share = correct / answers.length;
    if (share === 1) {
      const current = profile.at("learning", {});
      profile.merge("learning", { xp: (current.xp || 0) + XP.quizPerfect });
    }

    mount(root,
      pageHead(`${correct} of ${answers.length}`,
        share === 1 ? `A clean sweep. +${XP.quizPerfect} XP bonus.`
          : share >= 0.7 ? "Solid. The misses below are where the marginal learning is."
          : "Worth reworking. Every explanation below says why, not just what."),

      panel({
        flush: true,
        body: h("div.rows", null, ...answers.map((entry, i) => h("div.rowitem", null,
          h("span.rowitem__rank", null, entry.correct
            ? h("span.up", null, icon("check", 13))
            : h("span.down", null, icon("close", 12))),
          h("span.grow", null,
            h("div.rowitem__title", { style: { fontSize: "var(--t-body)" } }, entry.question.prompt),
            !entry.correct && h("div.rowitem__meta", { style: { marginTop: "2px" } },
              `You chose: ${entry.question.options[entry.chosen]} · Correct: ${entry.question.options[entry.question.answer]}`),
            h("div.rowitem__body", { style: { marginTop: "var(--s2)" } }, entry.question.why)),
          entry.question.concept && h("button.btn.btn--sm", {
            type: "button", onclick: () => openConcept(entry.question.concept),
          }, "Explain")))),
      }),

      h("div.row-s", { style: { marginTop: "var(--s6)" } },
        h("button.btn.btn--primary", { type: "button", onclick: () => { go("/learn?start=challenge"); } },
          icon("brain", 12), "Try a scenario challenge"),
        h("button.btn", { type: "button", onclick: () => go("/learn") }, "Back to progress"))
    );
  };

  render();
}

/* ========================= CHALLENGE ========================= */

function runChallenge(root) {
  let challenge = challengePrompt(String(Date.now()));
  const textarea = h("textarea.textarea", {
    rows: 8, placeholder: "Name the variables you expect to move, in which direction, and why. Push past the first step.",
  });
  const result = h("div");

  const evaluate = () => {
    const text = textarea.value.trim();
    if (text.length < 10) { toast("Write a little more first", "down"); return; }

    const assessment = evaluateFreeResponse(text, challenge.nodeId, { magnitude: challenge.magnitude });
    const current = profile.at("learning", {});
    const reasoning = { ...(current.reasoning || { seen: 0, correct: 0 }) };
    reasoning.seen += 1;
    if (assessment.score >= 50) reasoning.correct += 1;
    profile.merge("learning", {
      ...recordActivity(current), reasoning,
      xp: (current.xp || 0) + XP.challengeCompleted,
    });

    mount(result,
      h("div", { style: { marginTop: "var(--s7)" } },
        panel({
          title: "Assessment",
          sub: `${assessment.found.length} of ${assessment.all.length} modelled consequences named`,
          body: h("div.stack", null,
            h("div.row-s", null,
              stat({ label: "Coverage", value: `${assessment.score}`, unit: "%", large: true }),
              stat({ label: "Deepest order reached", value: assessment.deepestOrder ? `${assessment.deepestOrder}°` : "—",
                note: assessment.deepestOrder >= 3 ? "past consensus" : "first-order effects are usually priced" }),
              stat({ label: "XP", value: `+${XP.challengeCompleted}` })),
            meter(assessment.score, { max: 100, tone: assessment.score > 60 ? "up" : assessment.score > 30 ? "" : "down" }),
            ...assessment.notes.map((note) =>
              h("div", { class: `callout ${note.tone === "good" ? "callout--fact" : "callout--warn"}` }, note.text))),
        }),

        h("div.grid.g2", { style: { marginTop: "var(--s5)" } },
          panel({
            title: "You identified",
            flush: true,
            body: assessment.found.length
              ? h("div.rows", null, ...assessment.found.map((effect) => effectRow(effect, true)))
              : h("div.panel__body", null, h("span.dim", "Nothing the model recognised. Try naming concrete variables — an index, a rate, a commodity, a sector.")),
          }),
          panel({
            title: "You missed",
            flush: true,
            body: assessment.missed.length
              ? h("div.rows", null, ...assessment.missed.map((effect) => effectRow(effect, false)))
              : h("div.panel__body", null, h("span.up", "Nothing — you named every channel the model traces.")),
          })),

        h("div.row-s", { style: { marginTop: "var(--s6)" } },
          h("button.btn.btn--primary", { type: "button", onclick: () => {
            challenge = challengePrompt(String(Date.now()));
            textarea.value = "";
            mount(result);
            render();
          } }, icon("refresh", 12), "Another scenario"),
          h("button.btn", { type: "button", onclick: () => go(`/simulator?shock=${challenge.nodeId}&mag=${challenge.magnitude}`) },
            icon("flask", 12), "Open in the simulator"),
          h("button.btn", { type: "button", onclick: () => go("/learn") }, "Back"))));

    result.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const render = () => {
    mount(root,
      h("button.btn.btn--sm.btn--ghost", { type: "button", onclick: () => go("/learn"), style: { marginBottom: "var(--s4)" } },
        "← Learn"),
      pageHead("Challenge",
        "There is no right answer stored for this. Your response is checked against every channel the world model traces from the shock — including the ones you did not consider."),

      h("div.view-inner--read", { style: { padding: 0 } },
        panel({
          title: "Scenario",
          body: h("div.stack-s", null,
            h("p.read", { style: { color: "var(--ink)" } }, challenge.prompt),
            h("p.dim", { style: { fontSize: "var(--t-small)" } }, challenge.hint)),
        }),
        h("div", { style: { marginTop: "var(--s5)" } }, textarea),
        h("div.row-s", { style: { marginTop: "var(--s4)" } },
          h("button.btn.btn--primary", { type: "button", onclick: evaluate }, icon("check", 12), "Assess my reasoning"),
          h("button.btn.btn--ghost", { type: "button", onclick: () => {
            challenge = challengePrompt(String(Date.now())); textarea.value = ""; mount(result); render();
          } }, icon("refresh", 11), "Different scenario")),
        result));
  };

  render();
}

function effectRow(effect, found) {
  return h("button.rowitem", { onclick: () => openNode(effect.id) },
    h("span.rowitem__rank", `${effect.order}°`),
    h("span.grow", null,
      h("div.row-s.wrap", null,
        h("span.rowitem__title", { style: { fontSize: "var(--t-body)" } }, effect.node.label),
        h("span", { class: effect.direction > 0 ? "up" : "down" }, effect.direction > 0 ? "▲" : "▼"),
        effect.contested && badge("contested", "warn")),
      !found && h("div.rowitem__body", { style: { marginTop: "2px" } },
        effect.paths[0].edges.at(-1).why)),
    h("div", { style: { width: "44px" } }, meter(effect.magnitude, { height: 3, tone: found ? "up" : "" })));
}
