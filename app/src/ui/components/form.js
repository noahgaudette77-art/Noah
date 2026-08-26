/**
 * A small modal form.
 *
 * Exists because `prompt()` cannot be styled, cannot validate, cannot show more
 * than one field, and looks exactly like what it is. Anything the reader has to
 * type into deserves better than a browser chrome dialog.
 */

import { h, icon } from "../../core/dom.js";

/**
 * @param {{title, sub?, fields: Array, submitLabel?}} spec
 *   field: { name, label, type: text|textarea|select|date, placeholder?,
 *            value?, options?, required?, hint? }
 * @returns {Promise<object|null>} the values, or null if dismissed
 */
export function openForm({ title, sub = null, fields, submitLabel = "Save" }) {
  return new Promise((resolve) => {
    const restore = document.activeElement;
    const inputs = new Map();
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      scrim.remove();
      box.remove();
      restore?.focus?.();
      resolve(value);
    };

    const errorFor = (field) => h("span.dim", {
      style: { fontSize: "var(--t-tiny)", color: "var(--down)", display: "none" },
      dataset: { errorFor: field.name },
    }, "Required");

    const control = (field) => {
      if (field.type === "textarea") {
        return h("textarea.textarea", { rows: field.rows || 4, placeholder: field.placeholder || "", value: field.value || "" });
      }
      if (field.type === "select") {
        return h("select.select", null, ...field.options.map((option) =>
          h("option", { value: option.value, selected: option.value === field.value }, option.label)));
      }
      return h("input.input", {
        type: field.type || "text",
        placeholder: field.placeholder || "",
        value: field.value || "",
      });
    };

    const rows = fields.map((field) => {
      const element = control(field);
      inputs.set(field.name, { field, element });
      return h("label.field", null,
        h("span", null, field.label, field.required ? h("span", { style: { color: "var(--down)" } }, " *") : null),
        element,
        field.hint && h("span.dim", { style: { fontSize: "var(--t-tiny)" } }, field.hint),
        errorFor(field));
    });

    const submit = () => {
      let valid = true;
      const values = {};
      for (const [name, { field, element }] of inputs) {
        const value = String(element.value ?? "").trim();
        const missing = field.required && !value;
        box.querySelector(`[data-error-for="${name}"]`).style.display = missing ? "block" : "none";
        if (missing) { valid = false; if (valid === false) element.focus(); }
        values[name] = value;
      }
      if (valid) finish(values);
    };

    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(null); return; }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submit(); return; }
      if (event.key !== "Tab") return;
      const focusable = box.querySelectorAll("input, textarea, select, button");
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    const scrim = h("div.scrim", { onclick: () => finish(null) });
    const box = h("div.palette", {
      role: "dialog", "aria-modal": "true", "aria-label": title,
      style: { maxHeight: "82vh" },
    },
      h("div.palette__input", { style: { display: "block" } },
        h("div.spread", null,
          h("div", null,
            h("h3", { style: { fontSize: "var(--t-h4)", fontWeight: 620, letterSpacing: "-0.015em" } }, title),
            sub && h("p.dim", { style: { fontSize: "var(--t-small)", marginTop: "var(--s1)" } }, sub)),
          h("button.iconbtn", { type: "button", "aria-label": "Close", onclick: () => finish(null) },
            icon("close", 13)))),
      h("div", { style: { padding: "var(--s5)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--s5)" } }, ...rows),
      h("div.palette__hint", { style: { justifyContent: "flex-end", gap: "var(--s3)" } },
        h("button.btn", { type: "button", onclick: () => finish(null) }, "Cancel"),
        h("button.btn.btn--primary", { type: "button", onclick: submit }, submitLabel))
    );

    document.addEventListener("keydown", onKey, true);
    document.body.append(scrim, box);
    inputs.values().next().value?.element.focus();
  });
}

/** A styled confirm, for destructive actions. */
export function confirmAction({ title, body, confirmLabel = "Delete", danger = true }) {
  return new Promise((resolve) => {
    const restore = document.activeElement;
    const finish = (value) => {
      document.removeEventListener("keydown", onKey, true);
      scrim.remove(); box.remove(); restore?.focus?.(); resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false); }
    };
    const scrim = h("div.scrim", { onclick: () => finish(false) });
    const box = h("div.palette", { role: "alertdialog", "aria-modal": "true", "aria-label": title,
      style: { maxWidth: "440px" } },
      h("div", { style: { padding: "var(--s6)" } },
        h("h3", { style: { fontSize: "var(--t-h4)", fontWeight: 620 } }, title),
        h("p", { style: { marginTop: "var(--s3)", color: "var(--ink-2)", fontSize: "var(--t-body)", lineHeight: 1.55 } }, body)),
      h("div.palette__hint", { style: { justifyContent: "flex-end", gap: "var(--s3)" } },
        h("button.btn", { type: "button", onclick: () => finish(false) }, "Cancel"),
        h("button.btn", {
          type: "button",
          style: danger ? { background: "var(--down)", borderColor: "var(--down)", color: "#fff" } : {},
          onclick: () => finish(true),
        }, confirmLabel))
    );
    document.addEventListener("keydown", onKey, true);
    document.body.append(scrim, box);
    box.querySelector(".btn--primary, .btn")?.focus();
  });
}
