// FINAL EXAM — a mock exam across every chapter, weighted by chapter size.
// No feedback until you submit; then every miss is reviewed with its page.
function buildExam(n) {
  const chs = CHAPTERS.filter((c) => c.qids.length);
  const total = chs.reduce((s, c) => s + c.qids.length, 0);
  n = Math.min(n, total);
  const alloc = chs.map((c) => {
    const exact = (n * c.qids.length) / total;
    return { c, k: Math.floor(exact), r: exact - Math.floor(exact) };
  });
  let left = n - alloc.reduce((s, a) => s + a.k, 0);
  alloc.slice().sort((a, b) => b.r - a.r).forEach((a) => { if (left > 0) { a.k++; left--; } });
  const ids = alloc.flatMap((a) => shuffle(a.c.qids).slice(0, a.k));
  return shuffle(ids).map((id) => new Round(Q_BY_ID.get(id)));
}

class ExamGame extends QuizGame {
  constructor(sel) {
    super(sel, "exam", { fov: 55, fog: [0x0b0424, 12, 80], bg: 0x0b0424 });
    this.rounds = buildExam(ExamPrefs.len);
    this.answers = new Array(this.rounds.length).fill(-1);
    this.flags = new Array(this.rounds.length).fill(false);
    this.i = 0;
    this.limit = ExamPrefs.timed ? this.rounds.length * 90 : 0;
    this.elapsed = 0;
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <span class="tag" style="--c:${COLORS.violet}" data-pos>Q 1/${this.rounds.length}</span>
        <div class="grow"></div>
        <span class="tag" style="--c:${COLORS.yellow}" data-clock></span>
        <button class="iconbtn" data-act="grid" aria-label="All questions">${icon("grid")}</button>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="timer"><i></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
      <div class="exam-nav">
        <button class="btn ghost" data-act="prev">${icon("left")} PREV</button>
        <button class="btn ghost" data-act="flag" style="--c:${COLORS.orange}">${icon("flag")}</button>
        <button class="btn" data-act="nextq" style="--c:${COLORS.violet}" data-nextbtn>NEXT ${icon("right")}</button>
      </div>
    </section>`);
    if (!this.limit) $(".timer", this.el).style.visibility = "hidden";
  }
  build3D() {
    const s = this.scene;
    addLights(s, { ambient: 0x9080d0, ai: 0.7, ki: 1.1, dir: [4, 8, 6] });
    s.add(makeGrid({ size: 200, step: 4, color: 0xa65fff, y: -2 }));
    s.add(makeStars(400, 140, { lowest: 0.05 }));
    const profile = [[0, 0], [1.1, 0], [1.1, 0.22], [0.45, 0.38], [0.3, 1.3], [0.5, 1.6], [1.3, 2.2], [1.55, 3.4], [1.38, 3.42], [1.15, 2.45], [0, 2.25]];
    const cup = neonSolid(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 8), COLORS.gold, { fill: 0x6a4a08, glow: 0.35 });
    cup.userData.mat.side = THREE.DoubleSide;
    const trophy = new THREE.Group();
    trophy.add(cup);
    [-1, 1].forEach((sd) => {
      const h = neonSolid(new THREE.TorusGeometry(0.55, 0.1, 4, 10, Math.PI), COLORS.gold, { fill: 0x6a4a08, glow: 0.35 });
      h.position.set(sd * 1.45, 2.65, 0);
      h.rotation.z = sd > 0 ? -Math.PI / 2 : Math.PI / 2;
      trophy.add(h);
    });
    const ped = neonSolid(new THREE.BoxGeometry(2.6, 1.2, 2.6), COLORS.violet, { fill: 0x1c0d45, glow: 0.15 });
    ped.position.y = -0.6;
    trophy.add(ped);
    trophy.position.set(0, -1.4, -12);
    s.add(trophy);
    this.trophy = trophy;
    [-6, 6].forEach((x) => {
      const spot = glowSprite(COLORS.cyan, 9, 0.25);
      spot.position.set(x, 6, -16);
      s.add(spot);
    });
    this.camBase.set(0, 1.5, 4);
    this.lookAt.set(0, 0.6, -12);
  }
  start() {
    Sound.play("calm");
    if (!this.rounds.length) { UI.toast("NO QUESTIONS YET"); return this.quit(); }
    UI.banner("BEGIN", COLORS.violet, this.rounds.length + " QUESTIONS" + (this.limit ? " · " + Math.round(this.limit / 60) + " MIN" : ""));
    this.state = "ask";
    this.show();
  }
  show() {
    const r = this.rounds[this.i];
    this.round = r;
    this.quiz.show(r, `QUESTION ${this.i + 1} OF ${this.rounds.length}`);
    $(".qmeta .diff", this.el).textContent = this.flags[this.i] ? "FLAGGED" : "";
    this.quiz.select(this.answers[this.i]);
    $("[data-pos]", this.el).textContent = `Q ${this.i + 1}/${this.rounds.length}`;
    const last = this.i === this.rounds.length - 1;
    const nb = $("[data-nextbtn]", this.el);
    nb.dataset.act = last ? "submit" : "nextq";
    nb.innerHTML = last ? `SUBMIT ${icon("check")}` : `NEXT ${icon("right")}`;
    nb.style.setProperty("--c", last ? COLORS.lime : COLORS.violet);
    $("[data-act=prev]", this.el).disabled = this.i === 0;
    $("[data-act=flag]", this.el).classList.toggle("flagged", this.flags[this.i]);
    this.layoutBand();
  }
  go(d) {
    const j = clamp(this.i + d, 0, this.rounds.length - 1);
    if (j === this.i) return;
    this.i = j;
    Sound.sfx("move");
    this.show();
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.answers[this.i] = i;
    this.quiz.select(i);
    Sound.sfx("blip");
  }
  on(a, t) {
    if (a === "pause") return this.pause();
    if (a === "ans") return this.pick(+t.dataset.i);
    if (a === "prev") return this.go(-1);
    if (a === "nextq") return this.go(1);
    if (a === "flag") {
      this.flags[this.i] = !this.flags[this.i];
      Sound.sfx("blip");
      return this.show();
    }
    if (a === "grid") return this.palette();
    if (a === "submit") return this.askSubmit();
  }
  key(e) {
    if (e.key === "Escape") { e.preventDefault(); return this.pause(); }
    if (e.key === "ArrowLeft") return this.go(-1);
    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      return this.i === this.rounds.length - 1 ? this.askSubmit() : this.go(1);
    }
    const i = this.quiz.keyIndex(e);
    if (i >= 0) { e.preventDefault(); this.pick(i); }
  }
  palette() {
    const el = UI.el(`<div class="modal"><div class="dialog" style="--c:${COLORS.violet}" role="dialog" aria-modal="true" aria-label="All questions">
      <h2>ALL QUESTIONS</h2>
      <p>${this.answers.filter((a) => a >= 0).length} answered · ${this.flags.filter(Boolean).length} flagged</p>
      <div class="palette">${this.rounds.map((_, i) => `<button data-act="jump" data-i="${i}" class="${[this.answers[i] >= 0 ? "done" : "", this.flags[i] ? "flag" : "", i === this.i ? "here" : ""].join(" ")}">${i + 1}</button>`).join("")}</div>
      <button class="btn" data-act="submit" style="--c:${COLORS.lime}">SUBMIT EXAM</button>
      <button class="btn ghost" data-act="close">BACK TO QUESTION</button></div></div>`);
    UI.openModal({
      el,
      on: (a, t) => {
        if (a === "jump") { UI.closeModal(); this.i = +t.dataset.i; this.show(); }
        if (a === "close") UI.closeModal();
        if (a === "submit") { UI.closeModal(); this.askSubmit(); }
      },
      key: (e) => { if (e.key === "Escape") UI.closeModal(); },
      mounted: () => { const h = $(".here", el); if (h) h.focus(); },
    });
  }
  askSubmit() {
    const blank = this.answers.filter((a) => a < 0).length;
    UI.confirm({
      title: "SUBMIT EXAM?",
      text: blank ? `${blank} question${blank === 1 ? " is" : "s are"} unanswered and will be marked wrong.` : "You answered every question.",
      yes: "SUBMIT", no: "KEEP WORKING", color: COLORS.lime,
      onYes: () => this.submit(),
    });
  }
  submit() {
    if (this.state === "over") return;
    this.state = "over";
    const by = {};
    let correct = 0;
    const review = [];
    this.rounds.forEach((r, i) => {
      const a = this.answers[i];
      const ok = this.run.record(r, a);
      if (ok) correct++;
      const b = (by[r.q.ch] = by[r.q.ch] || { n: 0, ok: 0 });
      b.n++;
      if (ok) b.ok++;
      if (!ok) review.push({ q: r.q.q, a: r.correctText, x: a >= 0 ? r.text(a) : null, e: r.q.explain, r: `P. ${r.q.page} · STAGE ${r.q.ch} · ${r.q.topic}` });
    });
    const score = pct(correct, this.rounds.length);
    const passed = score >= 60;
    Store.state.stats.exams = (Store.state.stats.exams || 0) + 1;
    Store.state.stats.bestExam = Math.max(Store.state.stats.bestExam || 0, score);
    Store.save();
    Sound.sfx(passed ? "win" : "gameover");
    const mins = Math.floor(this.elapsed / 60), secs = Math.floor(this.elapsed % 60);
    const breakdown = Object.keys(by).sort((a, b) => a - b).map((n) => {
      const b = by[n], p = pct(b.ok, b.n);
      return `<div class="mrow"><span>STAGE ${n} · ${esc(CH(+n).title)}</span><b style="color:${p >= 60 ? COLORS.lime : COLORS.red}">${b.ok}/${b.n}</b>
        <span class="meter" style="--c:${p >= 60 ? COLORS.lime : COLORS.red}"><i style="width:${p}%"></i></span></div>`;
    }).join("");
    showResults({
      game: "exam", sel: this.sel, run: this.run, score, boardLabel: this.rounds.length + "Q",
      title: passed ? "PASSED" : "NOT YET", color: passed ? COLORS.lime : COLORS.red,
      headline: score + "%", sub: `${correct} of ${this.rounds.length} correct · pass mark 60% · ${mins}:${pad(secs)} used`,
      hideRunTiles: true,
      tiles: [{ k: "SCORE", v: score + "%", c: passed ? COLORS.lime : COLORS.red }, { k: "CORRECT", v: `${correct}/${this.rounds.length}` }, { k: "TIME", v: `${mins}:${pad(secs)}` }],
      extraHTML: `<h2 class="section-h">BY CHAPTER</h2><div class="mastery-list">${breakdown}</div>`,
      reviewTitle: "QUESTIONS TO REVIEW", review,
    });
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      this.elapsed += dt;
      const clock = $("[data-clock]", this.el);
      if (this.limit) {
        const left = Math.max(0, this.limit - this.elapsed);
        if (clock) clock.textContent = `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}`;
        this.timerBar(left / this.limit);
        if (left <= 0) { UI.toast("TIME! EXAM SUBMITTED"); this.submit(); }
      } else if (clock) {
        clock.textContent = `${Math.floor(this.elapsed / 60)}:${pad(Math.floor(this.elapsed % 60))}`;
      }
    }
    if (!this.has3D) return;
    this.trophy.rotation.y += dt * 0.4;
    this.placeCamera();
  }
}
