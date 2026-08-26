/**
 * Term structure — the yield curve drawn against maturity rather than time.
 * A log-scaled x axis, because the interesting shape lives at the short end.
 */

import { h, mount } from "../../core/dom.js";
import { num } from "../../core/format.js";
import { niceTicks } from "./line.js";

export function curveChart({ points, compare = null, height = 210, label = "Yield curve" } = {}) {
  const root = h("div.chart", { role: "img", "aria-label": label });
  const readout = h("div.chart__readout");
  const host = h("div.chart__svg");
  mount(root, host, readout);

  if (!points || points.length < 3) {
    mount(root, h("div.chart__empty", "No curve available"));
    return root;
  }

  let width = 640;
  const pad = { top: 12, right: 46, bottom: 24, left: 8 };

  const draw = () => {
    const innerW = Math.max(60, width - pad.left - pad.right);
    const innerH = height - pad.top - pad.bottom;

    const series = [points, compare].filter(Boolean);
    const allYields = series.flat().map((p) => p.yield);
    const minY = Math.min(...allYields) - 0.15;
    const maxY = Math.max(...allYields) + 0.15;
    const minX = Math.log(Math.min(...points.map((p) => p.years)));
    const maxX = Math.log(Math.max(...points.map((p) => p.years)));

    const x = (years) => pad.left + ((Math.log(years) - minX) / (maxX - minX)) * innerW;
    const y = (value) => pad.top + innerH - ((value - minY) / (maxY - minY)) * innerH;

    const grid = niceTicks(minY, maxY, 4).map((value) => h("g", null,
      h("line", { x1: pad.left, x2: pad.left + innerW, y1: y(value).toFixed(1), y2: y(value).toFixed(1),
        stroke: "var(--grid-line)" }),
      h("text", { x: pad.left + innerW + 6, y: (y(value) + 3.5).toFixed(1),
        fill: "var(--ink-3)", "font-size": 10, "font-family": "var(--font-mono)" }, `${num(value, 2)}%`)
    ));

    const line = (list, colour, dashed) => h("path", {
      d: list.map((point, i) => `${i ? "L" : "M"}${x(point.years).toFixed(1)},${y(point.yield).toFixed(1)}`).join(""),
      fill: "none", stroke: colour, "stroke-width": dashed ? 1.3 : 1.8,
      "stroke-dasharray": dashed ? "4 3" : null, "stroke-linejoin": "round",
    });

    const dots = points.map((point) => h("circle", {
      cx: x(point.years).toFixed(1), cy: y(point.yield).toFixed(1), r: 2.6,
      fill: "var(--bg-panel)", stroke: "var(--accent)", "stroke-width": 1.5,
      "data-tenor": point.tenor,
    }));

    const labels = points
      .filter((point) => ["1m", "1y", "2y", "5y", "10y", "30y"].includes(point.tenor))
      .map((point) => h("text", {
        x: x(point.years).toFixed(1), y: height - 7, "text-anchor": "middle",
        fill: "var(--ink-3)", "font-size": 10, "font-family": "var(--font-mono)",
      }, point.tenor));

    const svg = h("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height,
      preserveAspectRatio: "none", style: { display: "block" } },
      ...grid,
      compare && line(compare, "var(--ink-4)", true),
      line(points, "var(--accent)", false),
      ...dots, ...labels
    );

    mount(host, svg);

    const setReadout = (point) => mount(readout,
      h("span.chart__date", point ? `${point.tenor} maturity` : "Latest curve"),
      h("span.chart__value", null, h("b", point ? `${num(point.yield, 2)}%` : `${num(points.at(-1).yield, 2)}% at ${points.at(-1).tenor}`)),
      compare && h("span.chart__value", null, h("i", { style: { background: "var(--ink-4)" } }), h("span.dim", "comparison"))
    );

    svg.addEventListener("pointermove", (event) => {
      const rect = svg.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const targetX = pad.left + ratio * innerW;
      let best = points[0], bestGap = Infinity;
      for (const point of points) {
        const gap = Math.abs(x(point.years) - targetX);
        if (gap < bestGap) { bestGap = gap; best = point; }
      }
      dots.forEach((dot) => dot.setAttribute("r", dot.dataset.tenor === best.tenor ? 4 : 2.6));
      setReadout(best);
    });
    svg.addEventListener("pointerleave", () => {
      dots.forEach((dot) => dot.setAttribute("r", 2.6));
      setReadout(null);
    });
    setReadout(null);
  };

  const observer = new ResizeObserver((entries) => {
    const next = Math.round(entries[0].contentRect.width);
    if (next > 40 && Math.abs(next - width) > 8) { width = next; draw(); }
  });
  queueMicrotask(() => { width = root.clientWidth || 640; draw(); observer.observe(root); });
  root._destroy = () => observer.disconnect();
  return root;
}

/** Horizontal magnitude bars — used for effect sizes and score components. */
export function barRows(rows, { format = (v) => num(v, 2), max = null, height = 5 } = {}) {
  const peak = max ?? Math.max(...rows.map((row) => Math.abs(row.value)), 0.0001);
  return h("div.bars", null, ...rows.map((row) => h("div.bars__row", null,
    h("span.bars__label", { title: row.label }, row.label),
    h("span.bars__track", { style: { height: `${height}px` } },
      h("span.bars__fill", {
        style: {
          width: `${Math.min(100, (Math.abs(row.value) / peak) * 100)}%`,
          background: row.colour || (row.value < 0 ? "var(--down)" : "var(--up)"),
        },
      })
    ),
    h("span.bars__value", format(row.value))
  )));
}
