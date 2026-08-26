/**
 * Time-series chart. Hand-drawn SVG rather than a charting library: the whole
 * application is dependency-free, and a chart engine would be the single largest
 * thing shipped to the browser for the least control over how it looks.
 *
 * Interaction is a pointer-tracked crosshair with a readout, which is the only
 * interaction a dense time series actually needs.
 */

import { h, mount } from "../../core/dom.js";
import { num, date as fmtDate } from "../../core/format.js";

const PAD = { top: 10, right: 54, bottom: 20, left: 6 };

export function lineChart({
  series,                 // [{ id, label, points: [{d, v}], colour, dashed }]
  height = 190,
  showAxis = true,
  showZero = false,
  band = null,            // { from, to } shaded region on the y axis
  reference = null,       // { value, label } horizontal marker line
  format = (v) => num(v, 2),
  onHover = null,
  ariaLabel = "Time series",
} = {}) {
  const root = h("div.chart", { role: "img", "aria-label": ariaLabel });
  const readout = h("div.chart__readout");
  const svgHost = h("div.chart__svg");
  mount(root, svgHost, readout);

  const visible = (series || []).filter((s) => s.points && s.points.length > 1);
  if (!visible.length) {
    mount(root, h("div.chart__empty", "No observations in range"));
    return root;
  }

  let width = 640;

  const draw = () => {
    const all = visible.flatMap((s) => s.points);
    const times = all.map((p) => Date.parse(p.d));
    const values = all.map((p) => p.v);
    let minT = Math.min(...times), maxT = Math.max(...times);
    let minV = Math.min(...values), maxV = Math.max(...values);
    if (showZero) { minV = Math.min(0, minV); maxV = Math.max(0, maxV); }
    const padV = (maxV - minV) * 0.12 || Math.abs(maxV || 1) * 0.1;
    minV -= padV; maxV += padV;
    if (maxT === minT) maxT = minT + 1;

    const innerW = Math.max(60, width - PAD.left - PAD.right);
    const innerH = height - PAD.top - PAD.bottom;
    const x = (t) => PAD.left + ((t - minT) / (maxT - minT)) * innerW;
    const y = (v) => PAD.top + innerH - ((v - minV) / (maxV - minV)) * innerH;

    const ticks = niceTicks(minV, maxV, 4);
    const gridlines = ticks.map((value) =>
      h("g", null,
        h("line", {
          x1: PAD.left, x2: PAD.left + innerW, y1: y(value).toFixed(1), y2: y(value).toFixed(1),
          stroke: "var(--grid-line)", "stroke-width": 1,
        }),
        showAxis && h("text", {
          x: PAD.left + innerW + 6, y: (y(value) + 3.5).toFixed(1),
          fill: "var(--ink-3)", "font-size": 10, "font-family": "var(--font-mono)",
        }, format(value))
      ));

    const zeroLine = (minV < 0 && maxV > 0)
      ? h("line", {
          x1: PAD.left, x2: PAD.left + innerW, y1: y(0).toFixed(1), y2: y(0).toFixed(1),
          stroke: "var(--line-strong)", "stroke-width": 1,
        })
      : null;

    const referenceLine = reference && Number.isFinite(reference.value)
      && reference.value > minV && reference.value < maxV
      ? h("g", null,
          h("line", {
            x1: PAD.left, x2: PAD.left + innerW,
            y1: y(reference.value).toFixed(1), y2: y(reference.value).toFixed(1),
            stroke: "var(--accent)", "stroke-width": 1, "stroke-dasharray": "4 3", "stroke-opacity": 0.7,
          }),
          reference.label && h("text", {
            x: PAD.left + 4, y: (y(reference.value) - 4).toFixed(1),
            fill: "var(--accent)", "font-size": 9.5, "font-family": "var(--font-ui)",
          }, reference.label))
      : null;

    const bandRect = band
      ? h("rect", {
          x: PAD.left, width: innerW,
          y: y(Math.max(band.from, band.to)).toFixed(1),
          height: Math.abs(y(band.from) - y(band.to)).toFixed(1),
          fill: "var(--accent-soft)",
        })
      : null;

    const gradientId = Math.random().toString(36).slice(2, 8);
    const firstColour = visible[0].colour || SERIES_COLOURS[0];

    const paths = visible.map((entry, index) => {
      const colour = entry.colour || SERIES_COLOURS[index % SERIES_COLOURS.length];
      const d = entry.points
        .map((point, i) => `${i ? "L" : "M"}${x(Date.parse(point.d)).toFixed(1)},${y(point.v).toFixed(1)}`)
        .join("");
      const area = visible.length === 1
        ? `${d}L${x(Date.parse(entry.points.at(-1).d)).toFixed(1)},${(PAD.top + innerH).toFixed(1)}` +
          `L${x(Date.parse(entry.points[0].d)).toFixed(1)},${(PAD.top + innerH).toFixed(1)}Z`
        : null;
      return h("g", null,
        area && h("path", { d: area, fill: `url(#grad-${gradientId})`, stroke: "none" }),
        h("path", {
          d, fill: "none", stroke: colour, "stroke-width": 1.6,
          "stroke-linejoin": "round", "stroke-linecap": "round",
          "stroke-dasharray": entry.dashed ? "3 3" : null,
        })
      );
    });

    const crosshair = h("g", { style: { opacity: 0 } },
      h("line", { y1: PAD.top, y2: PAD.top + innerH, stroke: "var(--ink-4)", "stroke-width": 1, "stroke-dasharray": "2 2" }),
      ...visible.map(() => h("circle", { r: 3, fill: "var(--bg-panel)", "stroke-width": 1.6 }))
    );

    const svg = h("svg", {
      viewBox: `0 0 ${width} ${height}`, width: "100%", height,
      preserveAspectRatio: "none", style: { display: "block" },
    },
      h("defs", null,
        h("linearGradient", { id: `grad-${gradientId}`, x1: 0, y1: 0, x2: 0, y2: 1 },
          h("stop", { offset: "0%", "stop-color": firstColour, "stop-opacity": 0.22 }),
          h("stop", { offset: "100%", "stop-color": firstColour, "stop-opacity": 0 })
        )
      ),
      ...gridlines, bandRect, zeroLine, referenceLine, ...paths, crosshair
    );

    mount(svgHost, svg);

    const nearest = (clientX) => {
      const rect = svg.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      const targetT = minT + ratio * (maxT - minT);
      return visible.map((entry) => {
        let best = entry.points[0], bestGap = Infinity;
        for (const point of entry.points) {
          const gap = Math.abs(Date.parse(point.d) - targetT);
          if (gap < bestGap) { bestGap = gap; best = point; }
        }
        return { entry, point: best };
      });
    };

    const move = (event) => {
      const hits = nearest(event.clientX);
      const anchor = hits[0].point;
      const px = x(Date.parse(anchor.d));
      crosshair.style.opacity = 1;
      crosshair.children[0].setAttribute("x1", px.toFixed(1));
      crosshair.children[0].setAttribute("x2", px.toFixed(1));
      hits.forEach((hit, index) => {
        const dot = crosshair.children[index + 1];
        if (!dot) return;
        dot.setAttribute("cx", x(Date.parse(hit.point.d)).toFixed(1));
        dot.setAttribute("cy", y(hit.point.v).toFixed(1));
        dot.setAttribute("stroke", hit.entry.colour || SERIES_COLOURS[index % SERIES_COLOURS.length]);
      });
      mount(readout,
        h("span.chart__date", fmtDate(anchor.d, { month: "short", day: "numeric", year: "numeric" })),
        ...hits.map((hit, index) => h("span.chart__value", null,
          visible.length > 1 && h("i", { style: { background: hit.entry.colour || SERIES_COLOURS[index % SERIES_COLOURS.length] } }),
          visible.length > 1 && h("span.dim", `${hit.entry.label} `),
          h("b", format(hit.point.v))
        ))
      );
      onHover?.(hits);
    };

    const leave = () => { crosshair.style.opacity = 0; mount(readout, defaultReadout(visible, format)); };

    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerleave", leave);
    leave();
  };

  const observer = new ResizeObserver((entries) => {
    const next = Math.round(entries[0].contentRect.width);
    if (next > 40 && Math.abs(next - width) > 8) { width = next; draw(); }
  });
  queueMicrotask(() => { width = root.clientWidth || 640; draw(); observer.observe(root); });

  root._destroy = () => observer.disconnect();
  return root;
}

function defaultReadout(visible, format) {
  return h("span.chart__legend", null,
    ...visible.map((entry, index) => h("span.chart__value", null,
      h("i", { style: { background: entry.colour || SERIES_COLOURS[index % SERIES_COLOURS.length] } }),
      h("span.dim", `${entry.label} `),
      h("b", format(entry.points.at(-1).v))
    ))
  );
}

export const SERIES_COLOURS = [
  "var(--accent)", "var(--cyan)", "var(--violet)", "var(--up)", "var(--down)", "var(--ink-3)",
];

/** Small inline trend line — no axes, no interaction, just shape. */
export function sparkline(points, { width = 84, height = 22, colour = null } = {}) {
  if (!points || points.length < 2) return h("span.faint", "—");
  const values = points.map((p) => p.v);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const d = points
    .map((point, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(height - 2 - ((point.v - min) / span) * (height - 4)).toFixed(1)}`)
    .join("");
  const rising = values.at(-1) >= values[0];
  return h("svg", { width, height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" },
    h("path", {
      d, fill: "none", "stroke-width": 1.4, "stroke-linejoin": "round",
      stroke: colour || (rising ? "var(--up)" : "var(--down)"),
    })
  );
}

/** "Nice" axis values — round numbers, not raw data extremes. */
export function niceTicks(min, max, count = 4) {
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) return [min];
  const rough = span / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalised = rough / magnitude;
  const step = (normalised >= 5 ? 5 : normalised >= 2 ? 2 : 1) * magnitude;
  const first = Math.ceil(min / step) * step;
  const ticks = [];
  for (let value = first; value <= max + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}
