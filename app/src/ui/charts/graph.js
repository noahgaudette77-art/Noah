/**
 * Force-directed graph, ~150 lines of simulation and no dependency.
 *
 * Verlet-ish integration with three forces: repulsion between every pair,
 * spring attraction along edges, and a weak pull to centre. Runs for a bounded
 * number of ticks and then stops — a graph that never settles is a screensaver,
 * not a diagram.
 */

import { h, mount } from "../../core/dom.js";

const KIND_COLOUR = {
  policy: "var(--accent)", rate: "var(--cyan)", inflation: "var(--down)",
  macro: "var(--ink-2)", commodity: "var(--warn)", fx: "var(--violet)",
  market: "var(--up)", sector: "var(--cyan)", industry: "var(--cyan)",
  tech: "var(--violet)", structural: "var(--ink-3)", risk: "var(--down)",
};

export function forceGraph({
  nodes, edges, height = 460, focusId = null,
  onSelect = null, onHover = null, label = "Knowledge graph",
} = {}) {
  const root = h("div.graph", { role: "application", "aria-label": label, tabindex: "0" });
  if (!nodes?.length) {
    mount(root, h("div.chart__empty", "Nothing to plot"));
    return root;
  }

  let width = 720;
  const state = nodes.map((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    const radius = node.id === focusId ? 0 : 120 + (index % 5) * 26;
    return {
      ...node,
      x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
      vx: 0, vy: 0,
      pinned: node.id === focusId,
      degree: 0,
    };
  });
  const byId = new Map(state.map((node) => [node.id, node]));
  const links = edges
    .map((edge) => ({ ...edge, source: byId.get(edge.from), target: byId.get(edge.to) }))
    .filter((link) => link.source && link.target);
  for (const link of links) { link.source.degree++; link.target.degree++; }

  const radiusOf = (node) => 4 + Math.min(node.degree, 10) * 0.75 + (node.id === focusId ? 3 : 0);

  /** Nudge apart any pair whose labels would overlap after the simulation settles. */
  function separateLabels(passes = 40) {
    const width = (node) => Math.min(node.label.length, 22) * 4.6;
    for (let pass = 0; pass < passes; pass++) {
      let moved = false;
      for (let i = 0; i < state.length; i++) {
        for (let j = i + 1; j < state.length; j++) {
          const a = state[i], b = state[j];
          const sameBand = Math.abs(a.y - b.y) < 13 && (a.y < 0) === (b.y < 0);
          if (!sameBand) continue;
          const need = (width(a) + width(b)) / 2 + 8;
          const dx = b.x - a.x;
          const overlap = need - Math.abs(dx);
          if (overlap <= 0) continue;
          const push = (overlap / 2) * (dx >= 0 ? 1 : -1);
          if (!a.pinned) a.x -= push;
          if (!b.pinned) b.x += push;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function simulate(ticks = 260) {
    const repulsion = 4200;
    const springLength = 104;
    for (let step = 0; step < ticks; step++) {
      const cooling = 1 - step / ticks;
      for (let i = 0; i < state.length; i++) {
        const a = state[i];
        for (let j = i + 1; j < state.length; j++) {
          const b = state[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let distSq = dx * dx + dy * dy;
          if (distSq < 1) { dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); distSq = 1; }
          const dist = Math.sqrt(distSq);
          const force = repulsion / distSq;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
        }
      }
      for (const link of links) {
        const dx = link.target.x - link.source.x, dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - springLength) * 0.045 * (0.4 + link.strength * 0.6);
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        link.source.vx += fx; link.source.vy += fy;
        link.target.vx -= fx; link.target.vy -= fy;
      }
      for (const node of state) {
        node.vx -= node.x * 0.006;
        node.vy -= node.y * 0.006;
        if (node.pinned) { node.vx = 0; node.vy = 0; node.x = 0; node.y = 0; continue; }
        node.vx *= 0.82 * cooling + 0.1;
        node.vy *= 0.82 * cooling + 0.1;
        node.x += Math.max(-18, Math.min(18, node.vx));
        node.y += Math.max(-18, Math.min(18, node.vy));
      }
    }
  }

  let selected = focusId;

  const render = () => {
    const xs = state.map((n) => n.x), ys = state.map((n) => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const margin = 52;
    const viewW = Math.max(220, maxX - minX + margin * 2);
    const viewH = Math.max(180, maxY - minY + margin * 2);

    const highlighted = new Set();
    if (selected) {
      highlighted.add(selected);
      for (const link of links) {
        if (link.from === selected) highlighted.add(link.to);
        if (link.to === selected) highlighted.add(link.from);
      }
    }

    const edgeEls = links.map((link) => {
      const active = !selected || (link.from === selected || link.to === selected);
      return h("line", {
        x1: link.source.x.toFixed(1), y1: link.source.y.toFixed(1),
        x2: link.target.x.toFixed(1), y2: link.target.y.toFixed(1),
        stroke: link.sign > 0 ? "var(--up)" : "var(--down)",
        "stroke-width": (0.5 + link.strength * 1.5).toFixed(2),
        "stroke-opacity": active ? 0.42 : 0.07,
      });
    });

    const nodeEls = state.map((node) => {
      const dim = selected && !highlighted.has(node.id);
      const r = radiusOf(node);
      return h("g", {
        class: "graph__node", dataset: { id: node.id },
        style: { opacity: dim ? 0.22 : 1, cursor: "pointer" },
        transform: `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`,
      },
        h("circle", {
          r, fill: node.id === selected ? KIND_COLOUR[node.kind] || "var(--accent)" : "var(--bg-panel)",
          stroke: KIND_COLOUR[node.kind] || "var(--ink-3)",
          "stroke-width": node.id === selected ? 2 : 1.4,
        }),
        h("text", {
          // Labels alternate above and below the node. Two neighbours at a
          // similar radius would otherwise print their text on top of each other.
          // The focused node sits at the origin, so its label is pushed clear of
          // the ring of neighbours rather than landing among them.
          y: node.pinned ? r + 18 : node.y < 0 ? -(r + 5) : r + 11,
          "text-anchor": "middle", "font-size": 9.5,
          fill: node.id === selected ? "var(--ink)" : "var(--ink-3)",
          "font-family": "var(--font-ui)",
          "font-weight": node.id === selected ? 600 : 400,
          style: { pointerEvents: "none" },
        }, node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label)
      );
    });

    const svg = h("svg", {
      viewBox: `${(minX - margin).toFixed(0)} ${(minY - margin).toFixed(0)} ${viewW.toFixed(0)} ${viewH.toFixed(0)}`,
      width: "100%", height, style: { display: "block" },
    }, h("g", null, ...edgeEls), h("g", null, ...nodeEls));

    svg.addEventListener("click", (event) => {
      const group = event.target.closest(".graph__node");
      if (!group) { selected = null; render(); onSelect?.(null); return; }
      selected = group.dataset.id;
      render();
      onSelect?.(byId.get(selected));
    });
    svg.addEventListener("pointermove", (event) => {
      const group = event.target.closest(".graph__node");
      onHover?.(group ? byId.get(group.dataset.id) : null);
    });

    mount(root, svg);
  };

  const observer = new ResizeObserver((entries) => {
    const next = Math.round(entries[0].contentRect.width);
    if (next > 40) width = next;
  });
  queueMicrotask(() => {
    width = root.clientWidth || 720;
    simulate();
    separateLabels();
    render();
    observer.observe(root);
  });

  root.select = (id) => { selected = id; render(); };
  root._destroy = () => observer.disconnect();
  return root;
}

export { KIND_COLOUR };
