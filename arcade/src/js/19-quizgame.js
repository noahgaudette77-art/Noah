// Shared plumbing for the question-driven games: HUD mounting, pause, keys, band layout.
class QuizGame extends Scene3D {
  constructor(sel, gameId, sceneOpts) {
    super(sceneOpts);
    this.sel = sel;
    this.gameId = gameId;
    this.cab = CAB(gameId);
    this.run = new RunStats(sel);
    this.paused = false;
    this.state = "intro";
    this.bursts = this.has3D ? new Bursts(this.scene) : null;
  }
  mountUI(html) {
    this.el = UI.el(html);
    UI.show({
      el: this.el,
      on: (a, t, e) => this.on(a, t, e),
      key: (e) => this.key(e),
      destroy: () => { if (this.quiz) this.quiz.clearSheet(); this.unmounted = true; },
    });
    this.quiz = new QuizPanel(this.el);
    this.bandEl = $(".band", this.el);
  }
  on(a, t) {
    if (a === "pause") this.pause();
    else if (a === "ans") this.pick(+t.dataset.i);
    else if (a === "next") { Sound.sfx("blip"); this.quiz.next(); }
  }
  key(e) {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") { e.preventDefault(); this.pause(); return; }
    if (this.quiz.sheet) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") { e.preventDefault(); this.quiz.next(); }
      return;
    }
    const i = this.quiz.keyIndex(e);
    if (i >= 0) { e.preventDefault(); this.pick(i); }
  }
  pause() {
    if (this.paused || this.state === "over" || this.unmounted) return;
    this.paused = true;
    this.quiz.holdAuto();
    Sound.sfx("blip");
    pauseMenu(this);
  }
  resume() { this.paused = false; }
  restart() { UI.flash("crt-on"); startGame(this.gameId, this.sel); }
  quit() { Sound.sfx("back"); showHub(); }
  layoutBand() {
    requestAnimationFrame(() => {
      if (this.unmounted) return;
      this.setBand(this.bandEl);
      if (this.onLayout) this.onLayout();
    });
  }
  timerBar(frac) {
    const i = this.el && $(".timer i", this.el);
    if (!i) return;
    i.style.transform = `scaleX(${clamp(frac, 0, 1)})`;
    i.parentElement.classList.toggle("low", frac < 0.25);
  }
  lives(n, max, kind = "shield", color = COLORS.cyan) {
    const box = $("[data-lives]", this.el);
    if (box) box.innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < n ? "" : "lost"}">${icon(kind, color)}</span>`).join("");
  }
  explainAuto(ok) { return ok && Store.settings.explain === "smart" ? 2600 : 0; }
  // Screen position of the centre of the 3D band (for floating score text).
  bandPoint(fy = 0.5) {
    if (!this.band) return { x: GFX.w / 2, y: GFX.h / 2 };
    return { x: GFX.w / 2 - 30, y: this.band.top + this.band.h * fy };
  }
  update(dt) {
    if (this.paused) return;
    super.update(dt);
    if (this.bursts) this.bursts.update(dt);
  }
  dispose() {
    this.unmounted = true;
    super.dispose();
  }
}

function startGame(id, sel) {
  const G = { blaster: BlasterGame, racer: RacerGame, boss: BossGame, memory: MemoryGame, exam: ExamGame }[id];
  const go = () => {
    Sound.ambience(false);
    Sound.setIntensity(0);
    Sound.sfx("crton");
    const g = new G(sel);
    Scenes.set(g);
    g.start();
  };
  if (id === "exam") go();
  else withBriefing(sel, go);
}
