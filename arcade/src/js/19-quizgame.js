// Shared plumbing for the question-driven games: HUD mounting, pause, keys, band layout.
class QuizGame extends Scene3D {
  constructor(sel, gameId, sceneOpts) {
    super(sceneOpts);
    this.sel = sel;
    this.gameId = gameId;
    this.cab = CAB(gameId);
    this.run = new RunStats(sel);
    this.run.hype = gameId === "blaster" || gameId === "racer" || gameId === "boss"; // streaks build FEVER
    Hype.reset();
    this.paused = false;
    this.state = "intro";
    this.bursts = this.has3D ? new Bursts(this.scene) : null;
    // the generated icon props (a shield, a heart, a bolt, stars, coins: see PropFX), when they were served
    const pk = { blaster: ["shield", "bolt", "star"], racer: ["shield", "heart", "bolt", "star"], boss: ["heart", "bolt", "star", "coin"] }[gameId];
    this.iconFX = pk && this.has3D && GFX.ok && Assets.on ? new PropFX(this.scene, pk) : null;
  }
  // The streak has reached a new tier (see Hype): a bolt spins up where the game says (tierAt: { p, size }: over the
  // fighter, over the rig, on the player's side of the arena).
  propTier(lv, col) {
    const at = this.iconFX && this.tierAt ? this.tierAt() : null;
    if (at) this.iconFX.spin("bolt", at.p, { size: at.size, face: this.camera, col });
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
    if (this.run.hype) Hype.bind(this.el);
    // (the icon props mirror the sky as the game's own models do: Risk Blaster hands its panorama's reflection to each
    // material (pano.mirror) rather than to the whole scene. Done here, with the scene built and before its warm-up.)
    if (this.iconFX && this.pano && this.pano.mirror && this.scene && !this.scene.environment) this.iconFX.mirror((m) => this.pano.mirror(m, 1.3));
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
    if (!box) return;
    const was = box.dataset.n === undefined ? n : +box.dataset.n; // (the one that has just gone gets its own moment)
    box.dataset.n = n;
    box.innerHTML = Array.from({ length: max }, (_, i) => `<span class="${i < n ? "" : "lost"}${i >= n && i < was ? " just" : ""}">${icon(kind, color)}</span>`).join("");
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
    if (this.iconFX) this.iconFX.update(VFX.dt);
  }
  dispose() {
    this.unmounted = true;
    Hype.reset();
    super.dispose();
  }
}

// The asset files one play needs beyond its game's standing set: Boss Rush fights one boss, so it loads one (the Proctor:
// its skeleton and clips, boss-all-rig; its parts are in the page: 24f-proctor.js).
function gameAssets(id, sel) {
  if (id === "boss") return ["model:boss-" + (sel && sel.chapters && sel.chapters.length === 1 ? sel.chapters[0] : "all-rig")];
  return [];
}
function startGame(id, sel) {
  const G = { blaster: BlasterGame, racer: RacerGame, boss: BossGame, memory: MemoryGame, exam: ExamGame }[id];
  const go = () => {
    Sound.ambience(false);
    Sound.setIntensity(0);
    Sound.sfx("crton");
    // (the game's asset files first, when the page can fetch them: see Assets. With nothing to wait for this runs
    // straight through, as it always did.)
    Assets.with(id, gameAssets(id, sel), () => UI.cover(() => {
      const g = new G(sel);
      Scenes.set(g);
      g.start();
    }));
  };
  Assets.prefetch(id, gameAssets(id, sel)); // (its files, the boss it fights among them, are on their way during the briefing)
  if (id === "exam") go();
  else withBriefing(sel, go);
}
