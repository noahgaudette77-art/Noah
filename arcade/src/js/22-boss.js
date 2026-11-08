// BOSS RUSH — every chapter has a boss that only falls to its hardest questions.
// The boss charges an attack while you read; answer right to shoot first.
function eyeTexture(color) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff";
  x.beginPath(); x.ellipse(32, 32, 28, 17, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = color;
  x.beginPath(); x.arc(32, 32, 13, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#000";
  x.fillRect(29, 20, 6, 24);
  x.strokeStyle = "#000";
  x.lineWidth = 5;
  x.beginPath(); x.ellipse(32, 32, 28, 17, 0, 0, Math.PI * 2); x.stroke();
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  return t;
}

class BossGame extends QuizGame {
  constructor(sel) {
    super(sel, "boss", { fov: 60, fog: [0x0a0322, 16, 70], bg: 0x0a0322 });
    this.bossKey = sel.chapters.length === 1 ? sel.chapters[0] : "all";
    this.cfg = BOSSES[this.bossKey];
    this.maxHp = this.cfg.hp;
    this.hp = this.maxHp;
    this.hearts = 3;
    this.score = 0;
    this.charge = 0;
    this.bossY = 3.4;
    this.picker = new QuestionPicker(selectionQids(sel), { preferHard: true });
    if (this.has3D) this.build3D();
    const c = this.cfg.color;
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="lives" data-lives></div>
        <div class="grow"></div>
        <div class="score"><small>SCORE · ${esc(sel.label)}</small><span data-score>000000</span></div>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="bossbar" style="--c:${c}">
        <div class="name"><span>${esc(this.cfg.name)}</span><span data-hp>${this.hp}/${this.maxHp}</span></div>
        <span class="meter" style="--c:${c}"><i data-hpbar style="width:100%"></i></span>
      </div>
      <div class="charge" title="Boss attack charge"><i data-charge></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
    </section>`);
    this.hud();
  }
  build3D() {
    const s = this.scene;
    const col = new THREE.Color(this.cfg.color);
    addLights(s, { ambient: 0x8a7ac8, ai: 0.85, ki: 0.9, dir: [3, 8, 6] });
    s.add(new THREE.Mesh(new THREE.CircleGeometry(40, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0c0428 })));
    const pts = [];
    for (let r = 3; r <= 30; r += 3) for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * Math.PI * 2, a1 = ((i + 1) / 48) * Math.PI * 2;
      pts.push(Math.cos(a0) * r, 0.01, Math.sin(a0) * r, Math.cos(a1) * r, 0.01, Math.sin(a1) * r);
    }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; pts.push(Math.cos(a) * 3, 0.01, Math.sin(a) * 3, Math.cos(a) * 30, 0.01, Math.sin(a) * 30); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    s.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(0.75) })));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const p = neonSolid(new THREE.BoxGeometry(0.9, 7, 0.9), this.cfg.color, { glow: 0.12 });
      p.position.set(Math.cos(a) * 16, 3.5, Math.sin(a) * 16 - 8);
      const top = glowSprite(this.cfg.color, 3, 0.7);
      top.position.y = 3.8;
      p.add(top);
      s.add(p);
    }
    s.add(makeStars(300, 120, { lowest: 0.15 }));
    this.boss = this.makeBoss();
    this.boss.position.set(0, 14, -10);
    s.add(this.boss);
    this.camBase.set(0, 1.6, 6);
    this.lookAt.set(0, this.bossY, -10);
  }
  makeBoss() {
    const cfg = this.cfg;
    const grp = new THREE.Group();
    const geos = {
      box: () => new THREE.BoxGeometry(3, 3, 3),
      ico: () => new THREE.IcosahedronGeometry(2.1, 0),
      octa: () => new THREE.OctahedronGeometry(2.4, 0),
      dodeca: () => new THREE.DodecahedronGeometry(2.1, 0),
      knot: () => new THREE.TorusKnotGeometry(1.35, 0.42, 64, 6, 2, 3),
    };
    const core = neonSolid(geos[cfg.shape](), cfg.color, { glow: 0.25, fill: 0x1a0b40 });
    grp.add(core);
    const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: eyeTexture(cfg.color), transparent: true, depthTest: false }));
    eye.scale.set(1.8, 1.8, 1);
    eye.position.set(0, 0.25, 2.6);
    eye.renderOrder = 5;
    grp.add(eye);
    [-1, 1].forEach((sd) => {
      const h = neonSolid(new THREE.ConeGeometry(0.38, 1.7, 4), cfg.color, { glow: 0.3 });
      h.position.set(sd * 1.35, 2.15, 0);
      h.rotation.z = -sd * 0.5;
      grp.add(h);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.06, 3, 40), new THREE.MeshBasicMaterial({ color: cfg.color }));
    ring.rotation.x = Math.PI / 2.4;
    grp.add(ring);
    const orbs = [];
    for (let i = 0; i < 6; i++) {
      const o = neonSolid(new THREE.OctahedronGeometry(0.34, 0), cfg.color, { glow: 0.5 });
      grp.add(o);
      orbs.push(o);
    }
    const charge = glowSprite(cfg.color, 0.1, 1);
    charge.position.copy(eye.position);
    grp.add(charge);
    grp.userData = { core, eye, ring, orbs, charge };
    return grp;
  }
  onLayout() {
    if (!this.has3D) return;
    const bs = this.bandSize(16);
    this.bossScale = clamp(Math.min((bs.h * 0.86) / 7.4, (bs.w * 0.86) / 8), 0.3, 1.1);
    this.boss.scale.setScalar(this.bossScale);
  }
  start() {
    Sound.play("boss");
    Sound.sfx("charge");
    UI.banner("WARNING", COLORS.red, "BOSS APPROACHING");
    this.layoutBand();
    if (this.has3D) this.tw.add(1.4, (k) => { this.boss.position.y = lerp(14, this.bossY, k); }, null, Ease.outBack);
    this.tw.wait(1.5, () => {
      UI.banner(this.cfg.name, this.cfg.color, this.cfg.line);
      this.tw.wait(1.4, () => this.nextQuestion());
    });
  }
  hud() {
    if (!this.el) return;
    $("[data-score]", this.el).textContent = fmtScore(this.score);
    $("[data-hp]", this.el).textContent = Math.max(0, this.hp) + "/" + this.maxHp;
    $("[data-hpbar]", this.el).style.width = (clamp(this.hp / this.maxHp, 0, 1) * 100).toFixed(1) + "%";
    this.lives(this.hearts, 3, "heart", COLORS.red);
  }
  get enraged() { return this.hp / this.maxHp < 0.35; }
  nextQuestion() {
    if (this.unmounted) return;
    const q = this.picker.next();
    if (!q) { UI.toast("NO QUESTIONS IN THIS STAGE YET"); return this.quit(); }
    this.round = new Round(q);
    this.quiz.show(this.round, `STAGE ${q.ch} · ${q.topic}`);
    this.T = readTime(this.round, this.enraged ? 0.85 : 1);
    this.charge = 0;
    this.layoutBand();
    this.state = "ask";
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.state = "resolve";
    const frac = this.charge / this.T;
    const ok = this.run.record(this.round, i);
    this.quiz.reveal(i);
    if (ok) this.playerHit(frac);
    else this.bossAttack(false);
  }
  timeout() {
    this.state = "resolve";
    this.run.record(this.round, -1);
    this.quiz.reveal(-1);
    this.bossAttack(true);
  }
  playerHit(frac) {
    const dmg = 10 + Math.round(10 * (1 - frac)) + Math.min(8, (this.run.streak - 1) * 2);
    Sound.sfx("shot");
    const land = () => {
      this.hp -= dmg;
      this.score += dmg * 10;
      Sound.sfx("boom");
      Sound.sfx("correct");
      UI.flash("good");
      const p = this.bandPoint(0.25);
      UI.floater("-" + dmg + " HP", p.x, p.y, this.cfg.color);
      if (this.has3D) {
        const b = this.boss;
        this.bursts.burst(b.position.clone().add(new THREE.Vector3(0, 0, 2 * this.bossScale)), this.cfg.color, { n: 60, speed: 7, size: 0.35 });
        const em = b.userData.core.userData.mat.emissive;
        const base = em.clone();
        this.tw.add(0.4, (k) => { em.setRGB(lerp(1, base.r, k), lerp(1, base.g, k), lerp(1, base.b, k)); });
        this.tw.add(0.35, (k) => { b.position.z = -10 - Math.sin(k * Math.PI) * 1.2; });
      }
      this.hud();
      const title = this.hp <= 0 ? `FINISHING BLOW! −${dmg} HP` : `HIT! −${dmg} HP`;
      this.tw.wait(0.35, () => {
        if (this.unmounted) return;
        this.quiz.feedback({ ok: true, title, auto: this.explainAuto(true), onNext: () => this.after() });
      });
    };
    if (this.has3D) {
      const shot = glowSprite(COLORS.cyan, 1.4, 1);
      const from = new THREE.Vector3(0, 0.4, 3);
      const to = this.boss.position.clone();
      shot.position.copy(from);
      this.scene.add(shot);
      this.tw.add(0.3, (k) => shot.position.lerpVectors(from, to, k), () => { this.scene.remove(shot); land(); }, Ease.inCubic);
    } else land();
  }
  bossAttack(slow) {
    this.hearts--;
    Sound.sfx("charge");
    const hit = () => {
      Sound.sfx("hit");
      UI.flash("hit");
      this.shake(0.55);
      this.hud();
      const title = (slow ? "TOO SLOW! " : "WRONG! ") + (this.hearts > 0 ? "THE BOSS HITS YOU" : "YOU'RE OUT OF HEARTS");
      this.tw.wait(0.4, () => {
        if (this.unmounted) return;
        this.quiz.feedback({ ok: false, title, onNext: () => this.after() });
      });
    };
    if (this.has3D) {
      const eye = new THREE.Vector3();
      this.boss.userData.eye.getWorldPosition(eye);
      const beam = beamMesh(eye, new THREE.Vector3(0, 0.6, 4.5), this.cfg.color, 0.25 * this.bossScale + 0.05);
      this.scene.add(beam);
      this.tw.add(0.5, (k) => { beam.material.opacity = 1 - k; }, () => { this.scene.remove(beam); disposeTree(beam); });
      this.tw.wait(0.12, hit);
    } else hit();
    this.charge = 0;
  }
  after() {
    if (this.unmounted) return;
    if (this.hp <= 0) return this.victory();
    if (this.hearts <= 0) return this.defeat();
    this.nextQuestion();
  }
  victory() {
    this.state = "over";
    this.el.classList.add("finale");
    const stars = this.hearts;
    const bonus = this.hearts * 1000;
    this.score += bonus;
    Store.state.boss[this.bossKey] = Math.max(Store.state.boss[this.bossKey] || 0, stars);
    Store.save();
    Sound.stopMusic();
    Sound.sfx("bigboom");
    UI.banner("BOSS DEFEATED!", COLORS.lime, stars + (stars === 1 ? " STAR" : " STARS"));
    if (this.has3D) {
      for (let i = 0; i < 6; i++) {
        this.tw.wait(i * 0.18, () => {
          const p = this.boss.position.clone().add(new THREE.Vector3(rand(-2, 2), rand(-2, 2), 1).multiplyScalar(this.bossScale));
          this.bursts.burst(p, i % 2 ? this.cfg.color : 0xffffff, { n: 70, speed: 9, size: 0.4, life: 1.2 });
          Sound.sfx("boom");
        });
      }
      const s0 = this.boss.scale.x;
      this.tw.add(1.2, (k) => { this.boss.scale.setScalar(s0 * (1 - k)); this.boss.rotation.y += 0.3; }, null, Ease.inCubic);
    }
    this.tw.wait(1.4, () => Sound.sfx("win"));
    this.tw.wait(2.4, () => {
      if (this.unmounted) return;
      showResults({
        game: "boss", sel: this.sel, run: this.run, score: this.score, stars,
        title: "STAGE CLEAR", color: COLORS.lime, headline: fmtScore(this.score) + " PTS",
        sub: `${this.cfg.name} defeated with ${this.hearts} heart${this.hearts === 1 ? "" : "s"} left`,
        tiles: [{ k: "STARS", v: stars + "/3", c: COLORS.yellow }],
      });
    });
  }
  defeat() {
    this.state = "over";
    this.el.classList.add("finale");
    Sound.stopMusic();
    Sound.sfx("gameover");
    UI.banner("DEFEATED", COLORS.red, this.cfg.line);
    this.tw.wait(2, () => {
      if (this.unmounted) return;
      showResults({
        game: "boss", sel: this.sel, run: this.run, score: this.score,
        title: "DEFEATED", color: COLORS.red, headline: fmtScore(this.score) + " PTS",
        sub: `${this.cfg.name} survived with ${Math.max(0, this.hp)} HP. Read the guide and try again.`,
        tiles: [{ k: "BOSS HP LEFT", v: Math.max(0, this.hp), c: COLORS.red }],
      });
    });
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      this.charge += dt;
      const f = this.charge / this.T;
      const bar = $("[data-charge]", this.el);
      if (bar) bar.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + "%";
      if (f >= 1) this.timeout();
    }
    if (!this.has3D) return;
    const u = this.boss.userData;
    const f = this.state === "ask" ? clamp(this.charge / this.T, 0, 1) : 0;
    const rage = this.enraged ? 1.8 : 1;
    if (this.state !== "intro") this.boss.position.y = this.bossY + Math.sin(this.t * 1.5 * rage) * 0.35 * this.bossScale;
    u.core.rotation.y += dt * 0.5 * rage;
    u.core.rotation.x += dt * 0.15 * rage;
    u.ring.rotation.z += dt * rage;
    u.orbs.forEach((o, i) => {
      const a = this.t * 1.2 * rage + (i / u.orbs.length) * Math.PI * 2;
      o.position.set(Math.cos(a) * 3.7, Math.sin(a * 2) * 0.7, Math.sin(a) * 3.7);
      o.rotation.y += dt * 3;
    });
    u.charge.scale.setScalar(0.1 + f * 3.4 + (f > 0.8 ? Math.sin(this.t * 40) * 0.3 : 0));
    u.eye.scale.y = 1.8 * (Math.sin(this.t * 0.7) > 0.985 ? 0.15 : 1);
    this.lookAt.y = this.bossY;
    this.placeCamera();
  }
}
