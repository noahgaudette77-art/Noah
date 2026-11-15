// FEVER: a run of right answers heats the whole cabinet up. Three levels, each with
// its own colour, a banner, a riser and a crowd cheer; the renderer wraps the screen
// in rays of that colour (GFX.setFever) and the HUD shows the streak. A miss
// shatters it. Only the action games use it (RunStats.hype).
const Hype = {
  level: 0,
  el: null,
  LV: [
    null,
    { name: "COMPOUNDING", at: 3, col: COLORS.orange, rgb: [1, 0.42, 0.08], amt: 0.5 },
    { name: "BULL RUN", at: 6, col: COLORS.magenta, rgb: [1, 0.16, 0.7], amt: 0.75 },
    { name: "BLUE CHIP", at: 10, col: COLORS.yellow, rgb: [1, 0.8, 0.25], amt: 1 },
  ],
  levelFor(streak) { return streak >= 10 ? 3 : streak >= 6 ? 2 : streak >= 3 ? 1 : 0; },
  // The streak pill lives in the HUD's spare middle.
  bind(screenEl) {
    this.level = 0;
    GFX.setFever(0);
    const g = $(".hud .grow", screenEl);
    this.grow = g;
    this.band = $(".band", screenEl);
    this.docked = false;
    this.el = g ? g.appendChild(UI.el(`<span class="fever" hidden></span>`)) : null;
  },
  // A HUD with no room to spare (Nest Egg Run on a phone) would have the pill sit on the readouts:
  // there it docks in the corner of the 3D strip instead, and stays there for the run.
  place() {
    const el = this.el;
    if (!el || this.docked || el.hidden || !this.grow || !this.band) return;
    if (el.offsetWidth <= this.grow.clientWidth - 4) return;
    this.docked = true;
    this.band.appendChild(el);
    el.classList.add("dock");
  },
  reset() {
    this.level = 0;
    this.el = null;
    this.grow = this.band = null;
    this.docked = false;
    GFX.setFever(0);
  },
  // Callouts sit in the strip of 3D between the HUD panels, clear of the question.
  spot(f) {
    const s = Scenes.cur, b = s && s.band;
    return b ? b.top + b.h * f : GFX.h * (0.3 + f * 0.2);
  },
  // A shower of sparks in front of the camera, in the level's colour.
  confetti(col) {
    const s = Scenes.cur;
    if (!s || !s.bursts || !s.camera || REDUCED_MOTION || GFX.calm) return;
    const at = s.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(9).add(s.camera.position);
    at.y += 1.5;
    s.bursts.burst(at, col, { n: 90, speed: 9, size: 0.3, life: 1.4, gravity: -7 });
    s.bursts.burst(at, 0xffffff, { n: 30, speed: 5, size: 0.2, life: 0.9, gravity: -7 });
  },
  // quick: 0..1, how much of the clock was left (undefined when there is none).
  answer(ok, streak, quick) {
    const lv = ok ? this.levelFor(streak) : 0;
    if (ok) {
      if (lv > this.level) {
        const L = this.LV[lv];
        const b = UI.root.appendChild(UI.el(`<div class="banner hype" style="--c:${L.col};top:${Math.round(this.spot(0.12))}px">${L.name}!<small>${streak} IN A ROW</small></div>`));
        setTimeout(() => b.remove(), 1400);
        Sound.sfx("fever" + lv);
        Sound.say(L.name);
        this.confetti(L.col);
        Haptics.buzz([30, 40, 30, 40, 90]);
        GFX.pulse(9, 0.22);
        GFX.setFever(L.amt, L.rgb);
      } else if (quick !== undefined && quick > 0.62 && streak > 1) {
        UI.floater(quick > 0.82 ? "LIGHTNING!" : "QUICK DRAW!", GFX.w / 2 - 58, this.spot(0.1), COLORS.cyan);
        Sound.sfx("zip");
      }
    } else if (this.level > 0) {
      UI.floater("STREAK LOST", GFX.w / 2 - 62, this.spot(0.1), COLORS.red);
      Sound.sfx("shatter");
      GFX.setFever(0);
    }
    this.level = lv;
    if (this.el) {
      this.el.hidden = streak < 2;
      UI.text(this.el, "STREAK " + streak);
      this.el.className = "fever" + (lv ? " lv" + lv : "") + (this.docked ? " dock" : "");
      this.place();
      if (ok && streak >= 2) { this.el.classList.remove("bump"); void this.el.offsetWidth; this.el.classList.add("bump"); }
    }
  },
};
