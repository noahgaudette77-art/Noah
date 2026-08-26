/**
 * Empty states that tell the truth.
 *
 * When a dataset is missing, this names it, says which command produces it and
 * which sources it comes from, and stops. It never substitutes a plausible
 * number, and it never renders a chart of nothing dressed up as a chart of
 * something.
 */

import { h, icon } from "../../core/dom.js";
import { DATASETS, statusOf, STATUS, load } from "../../data/store.js";
import { source as findSource } from "../../content/sources.js";
import { empty } from "./kit.js";

export function pipelineEmpty(key) {
  const dataset = DATASETS[key];
  const entry = statusOf(key);

  if (entry.status === STATUS.ERROR) {
    return empty({
      icon: "alert",
      title: `${dataset.label} could not be read`,
      body: `${entry.error}. The file exists but is not valid JSON — re-run the pipeline to rewrite it.`,
      action: h("button.btn.btn--sm", { type: "button", onclick: () => load(key, { force: true }) },
        icon("refresh", 11), "Retry"),
    });
  }

  const sources = (dataset.sources || []).map((id) => findSource(id)?.name).filter(Boolean);

  return empty({
    icon: "layers",
    title: `No ${dataset.label.toLowerCase()} yet`,
    body: h("span", null,
      dataset.describes, " ",
      h("br"),
      h("span.faint", "This view stays empty until the pipeline produces it. Nothing here is filled in with placeholder values."),
      sources.length ? h("span", null, h("br"), h("span.faint", `Sources: ${sources.join(", ")}.`)) : null),
    action: h("div.row-s", null,
      h("code.mono", {
        style: {
          fontSize: "var(--t-tiny)", background: "var(--bg-sink)", padding: "4px 8px",
          borderRadius: "var(--radius)", border: "1px solid var(--line)", color: "var(--ink-2)",
        },
      }, dataset.produces),
      h("button.btn.btn--sm", { type: "button", onclick: () => load(key, { force: true }) },
        icon("refresh", 11), "Check again")),
  });
}

export function loadingRows(count = 4) {
  return h("div.stack-s", { "aria-busy": "true", style: { padding: "var(--s5)" } },
    ...Array.from({ length: count }, (_, i) =>
      h("div.skel", { style: { width: `${96 - i * 9}%` } })));
}
