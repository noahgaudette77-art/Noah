// What a blow does to the HUD. All of it is look: classes and a few short-lived elements on the game's own screen,
// never a word of text changed and nothing laid over the question or the answers.
//   HudFX.hurt(root, k)          the HUD flickers and cracks spread from its corners (k 0..1: how hard the blow was)
//   HudFX.low(root, on)          low health: the lives beat red and the HUD's edge turns red until it is switched off
//   HudFX.lifeLost(root)         the life that has just gone breaks into shards
//   HudFX.blink(root, ms)        the short invulnerability blink after a hit (a class the scene can read: root.dataset.blink)
//   HudFX.reward(root, from, to, { n, kind, color, clear })   stars, coins or sparks fly from a point to a place in the HUD
//                                (clear: an element, or a selector inside root, that they must not cross: the question.
//                                They go round it, up the margin at its side.)
const HudFX = {
  CRACKS: [
    "M0 0 L14 9 L22 6 L37 19 L46 17 L61 31 M14 9 L11 24 L19 33 M37 19 L33 34 M22 6 L30 0",
    "M100 0 L88 11 L79 8 L66 22 L57 20 L49 33 M88 11 L91 25 L84 36 M66 22 L69 35 M79 8 L72 0",
  ],
  hurt(root, k = 1) {
    if (!root) return;
    const hud = $(".hud", root);
    root.classList.remove("hud-hurt");
    void root.offsetWidth;
    root.classList.add("hud-hurt");
    clearTimeout(root._hurtT);
    root._hurtT = setTimeout(() => root.classList.remove("hud-hurt"), 620);
    if (!hud || REDUCED_MOTION) return;
    let c = $(".hud-cracks", root);
    if (!c) {
      c = UI.el(`<i class="hud-cracks" aria-hidden="true"><svg viewBox="0 0 100 40" preserveAspectRatio="none">${this.CRACKS.map((d) => `<path d="${d}"/>`).join("")}</svg></i>`);
      root.appendChild(c);
    }
    const r = hud.getBoundingClientRect(), pr = root.getBoundingClientRect();
    c.style.left = r.left - pr.left + "px"; c.style.top = r.top - pr.top + "px"; c.style.width = r.width + "px"; c.style.height = Math.max(34, r.height) + "px";
    c.style.setProperty("--k", clamp(0.45 + k * 0.55, 0.3, 1).toFixed(2));
    c.classList.remove("go");
    void c.offsetWidth;
    c.classList.add("go");
  },
  low(root, on) {
    if (root) root.classList.toggle("hud-low", !!on);
  },
  lifeLost(root) {
    const box = root && $("[data-lives]", root), just = box && $(".just", box);
    if (!just || REDUCED_MOTION) return;
    const r = just.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rand(-0.3, 0.3), d = rand(16, 34);
      const s = UI.el(`<i class="life-shard" style="left:${cx}px;top:${cy}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d + 10).toFixed(1)}px;--r:${Math.round(rand(-220, 220))}deg"></i>`);
      UI.root.appendChild(s);
      setTimeout(() => s.remove(), 620);
    }
  },
  blink(root, ms = 900) {
    if (!root) return;
    root.dataset.blink = "1";
    clearTimeout(root._blinkT);
    root._blinkT = setTimeout(() => { delete root.dataset.blink; }, ms);
  },
  // from: { x, y } in screen pixels; to: an element, a selector inside root, or { x, y }.
  reward(root, from, to, o = {}) {
    if (!root || REDUCED_MOTION) return;
    const el = typeof to === "string" ? $(to, root) : to && to.nodeType ? to : null;
    const tr = el ? el.getBoundingClientRect() : null, tx = tr ? tr.left + tr.width / 2 : to.x, ty = tr ? tr.top + tr.height / 2 : to.y;
    const n = o.n || 10, kind = o.kind || "star", color = o.color || COLORS.yellow;
    // what the flight must go round (the question panel, when it lies between the start and the HUD)
    const ce = typeof o.clear === "string" ? $(o.clear, root) : o.clear && o.clear.nodeType ? o.clear : null, cr = ce ? ce.getBoundingClientRect() : null;
    const round = cr && cr.height > 0 && from.y > cr.bottom && ty < cr.top + cr.height * 0.5;
    for (let i = 0; i < n; i++) {
      const sx = from.x + rand(-26, 26), sy = from.y + rand(-22, 22), mx = (sx + tx) / 2 + rand(-70, 70), my = Math.min(sy, ty) - rand(20, 90);
      if (round) { // out to the margin at the side the target is on, up it past the panel, and in
        const p = UI.el(`<i class="reward-bit ${kind}" style="left:0;top:0;--c:${color}">${kind === "spark" ? "" : icon(kind === "coin" ? "coin" : "star", color)}</i>`);
        UI.root.appendChild(p);
        const left = tx < innerWidth / 2, ex = clamp(left ? cr.left - 9 + rand(-2, 2) : cr.right + 9 + rand(-2, 2), 7, innerWidth - 7), dur = 640 + i * 38 + rand(0, 120);
        if (p.animate) {
          p.animate([
            { transform: `translate(${sx}px,${sy}px) scale(0.3) rotate(0deg)`, opacity: 0 },
            { transform: `translate(${sx}px,${sy}px) scale(1.25) rotate(40deg)`, opacity: 1, offset: 0.1 },
            { transform: `translate(${ex}px,${cr.bottom + rand(14, 46)}px) scale(0.9) rotate(150deg)`, opacity: 1, offset: 0.42 },
            { transform: `translate(${ex}px,${cr.top - rand(2, 8)}px) scale(0.8) rotate(260deg)`, opacity: 1, offset: 0.76 },
            { transform: `translate(${tx}px,${ty}px) scale(0.45) rotate(360deg)`, opacity: 0.9 },
          ], { duration: dur, delay: i * 34, easing: "cubic-bezier(0.3, 0, 0.3, 1)", fill: "both" });
        }
        setTimeout(() => p.remove(), dur + i * 34 + 60);
        continue;
      }
      const p = UI.el(`<i class="reward-bit ${kind}" style="left:0;top:0;--c:${color}">${kind === "spark" ? "" : icon(kind === "coin" ? "coin" : "star", color)}</i>`);
      UI.root.appendChild(p);
      const dur = 520 + i * 38 + rand(0, 120);
      if (p.animate) {
        p.animate([
          { transform: `translate(${sx}px,${sy}px) scale(0.3) rotate(0deg)`, opacity: 0 },
          { transform: `translate(${sx}px,${sy}px) scale(1.25) rotate(40deg)`, opacity: 1, offset: 0.12 },
          { transform: `translate(${mx}px,${my}px) scale(1) rotate(200deg)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${tx}px,${ty}px) scale(0.45) rotate(360deg)`, opacity: 0.9 },
        ], { duration: dur, delay: i * 34, easing: "cubic-bezier(0.3, 0, 0.3, 1)", fill: "both" });
      }
      setTimeout(() => p.remove(), dur + i * 34 + 60);
    }
    if (el) setTimeout(() => { el.classList.remove("reward-pop"); void el.offsetWidth; el.classList.add("reward-pop"); setTimeout(() => el.classList.remove("reward-pop"), 500); }, 520);
  },
};
