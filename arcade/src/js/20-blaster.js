// RISK BLASTER — a rail shooter. Each answer is a target flying down a neon
// tunnel; shoot the right one before the targets reach your shields.
const WAVE_COLORS = [0xff3ad4, 0x35efff, 0xffe14f, 0x86ff5e, 0xa65fff, 0xff9b3d];
const WAVE_LEN = 10;

class BlasterGame extends QuizGame {
  constructor(sel) {
    super(sel, "blaster", { fov: 60, fog: [0x05010f, 25, 160], bg: 0x05010f });
    this.picker = new QuestionPicker(selectionQids(sel));
    this.score = 0;
    this.combo = 1;
    this.shields = 3;
    this.wave = 1;
    this.inWave = 0;
    this.speed = 26;
    this.targets = [];
    this.fx = 3; this.fy = 1.6; this.ts = 1; this.shipY = -2.2;
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="score"><small data-wave>WAVE 1</small><span data-score>000000</span></div>
        <div class="grow"></div>
        <span class="combo" data-combo>x1</span>
        <div class="lives" data-lives></div>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="timer"><i></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
    </section>`);
    this.lives(this.shields, 3);
  }

  build3D() {
    const s = this.scene;
    addLights(s, { ambient: 0x8070c0, ai: 0.8, ki: 1.0, dir: [2, 5, 6] });
    const N = 240;
    this.streakPos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) this.resetStreak(i, rand(-170, 0));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.streakPos, 3));
    this.streaks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc9c0ff, transparent: true, opacity: 0.75, fog: false }));
    s.add(this.streaks);
    this.rings = [];
    this.ringMat = new THREE.MeshBasicMaterial({ color: WAVE_COLORS[0] });
    for (let i = 0; i < 14; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(12, 0.07, 3, 6), this.ringMat);
      r.position.z = -i * 12 - 6;
      r.rotation.z = i * 0.17;
      s.add(r);
      this.rings.push(r);
    }
    this.ship = this.makeShip();
    s.add(this.ship);
    this.camBase.set(0, 0, 0);
    this.lookAt.set(0, 0, -20);
  }
  makeShip() {
    const N = [0, 0, -1.5], L = [-1.15, -0.05, 0.6], R = [1.15, -0.05, 0.6], T = [0, 0.38, 0.35], B = [0, -0.22, 0.45], C = [0, 0.04, 0.8];
    const tris = [N, T, L, N, R, T, N, L, B, N, B, R, T, C, L, T, R, C, L, C, B, B, C, R];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(tris.flat()), 3));
    geo.computeVertexNormals();
    const ship = neonSolid(geo, COLORS.cyan, { fill: 0x1c1050, glow: 0.3 });
    ship.userData.mat.side = THREE.DoubleSide;
    const flame = glowSprite(COLORS.orange, 1.3, 0.95);
    flame.position.set(0, 0.02, 0.95);
    ship.add(flame);
    ship.userData.flame = flame;
    ship.position.set(0, -2.2, -7);
    return ship;
  }
  resetStreak(i, z) {
    const a = rand(Math.PI * 2), r = rand(3, 24);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const p = this.streakPos;
    const len = rand(1.5, 5);
    p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
    p[i * 6 + 3] = x; p[i * 6 + 4] = y; p[i * 6 + 5] = z - len;
  }

  start() {
    Sound.play("game");
    UI.banner("WAVE 1", COLORS.magenta, this.sel.label);
    this.tw.wait(1.3, () => this.nextQuestion());
  }
  hud() {
    $("[data-score]", this.el).textContent = fmtScore(this.score);
    $("[data-wave]", this.el).textContent = "WAVE " + this.wave + " · " + this.sel.label;
    $("[data-combo]", this.el).textContent = "x" + this.combo;
    this.lives(this.shields, 3);
  }
  onLayout() {
    if (!this.has3D) return;
    const far = this.bandSize(12);
    this.fx = Math.min(3.4, far.w * 0.27);
    this.fy = Math.min(1.8, far.h * 0.22);
    this.ts = clamp(Math.min(far.h * 0.16, far.w * 0.1), 0.4, 1.2);
    this.shipY = -this.bandSize(7).h * 0.36;
    this.ship.position.y = this.shipY;
    this.targets.forEach((t) => this.placeSlot(t));
  }
  placeSlot(t) {
    const i = t.userData.slot, n = this.round.n;
    t.userData.bx = n === 2 ? (i === 0 ? -this.fx : this.fx) : i % 2 ? this.fx : -this.fx;
    t.userData.by = n === 2 ? 0 : i < 2 ? this.fy : -this.fy;
    t.scale.setScalar(this.ts);
  }

  nextQuestion() {
    if (this.unmounted) return;
    const q = this.picker.next();
    if (!q) { UI.toast("NO QUESTIONS IN THIS STAGE YET"); return this.quit(); }
    this.round = new Round(q);
    this.quiz.show(this.round, `STAGE ${q.ch} · ${q.topic}`);
    const wf = Math.max(0.6, Math.pow(0.92, this.wave - 1));
    this.T = readTime(this.round, wf);
    this.tLeft = this.T;
    this.picked = -1;
    this.spawnTargets();
    this.layoutBand();
    this.state = "ask";
    this.hud();
  }
  spawnTargets() {
    this.clearTargets();
    if (!this.has3D) return;
    const geos = [() => new THREE.IcosahedronGeometry(1, 0), () => new THREE.OctahedronGeometry(1.15, 0), () => new THREE.DodecahedronGeometry(1, 0), () => new THREE.TetrahedronGeometry(1.25, 0)];
    for (let i = 0; i < this.round.n; i++) {
      const col = SLOT_COLORS[i];
      const g = neonSolid(geos[i % 4](), col, { glow: 0.35 });
      const label = labelSprite(this.round.labels[i], col, 1.35);
      label.position.set(0, 0, 1.4);
      g.add(label);
      g.userData.slot = i;
      g.userData.spin = rand(0.6, 1.6) * (i % 2 ? 1 : -1);
      g.position.z = -95;
      this.scene.add(g);
      this.targets.push(g);
      this.placeSlot(g);
    }
  }
  clearTargets() {
    this.targets.forEach((t) => { this.scene.remove(t); disposeTree(t); });
    this.targets = [];
  }

  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.state = "firing";
    this.picked = i;
    this.quiz.select(i);
    this.quiz.lock();
    Sound.sfx("laser");
    const t = this.targets[i];
    if (t && this.has3D) {
      const from = this.ship.position.clone().add(new THREE.Vector3(0, 0.05, -1.4));
      const beam = beamMesh(from, t.position.clone(), SLOT_COLORS[i], 0.09);
      this.scene.add(beam);
      this.tw.add(0.3, (k) => { beam.material.opacity = 1 - k; }, () => { this.scene.remove(beam); disposeTree(beam); });
      // lookAt aims +Z; the ship's nose is -Z, so aim at the mirrored point.
      this.ship.lookAt(this.ship.position.clone().multiplyScalar(2).sub(t.position));
    }
    this.tw.wait(0.22, () => this.resolve(i));
  }
  resolve(i) {
    const r = this.round;
    const ok = this.run.record(r, i);
    this.quiz.reveal(i);
    let title;
    if (ok) {
      const pts = Math.round(100 * this.combo * (1 + this.tLeft / this.T));
      this.score += pts;
      title = `DIRECT HIT! +${pts}`;
      this.combo = Math.min(8, this.combo + 1);
      Sound.sfx("boom");
      Sound.sfx("correct");
      UI.flash("good");
      const p = this.bandPoint(0.3);
      UI.floater("+" + pts, p.x, p.y, COLORS.yellow);
      this.explode(this.targets[i], SLOT_COLORS[i]);
    } else {
      this.combo = 1;
      this.shields--;
      title = this.shields > 0 ? "WRONG TARGET! SHIELD DOWN" : "WRONG TARGET! SHIELDS GONE";
      Sound.sfx("wrong");
      Sound.sfx("hit");
      UI.flash("hit");
      this.shake(0.35);
      this.explode(this.targets[i], COLORS.red);
      this.highlight(this.targets[r.correct]);
    }
    this.hud();
    this.state = "explain";
    this.tw.wait(0.5, () => {
      if (this.unmounted) return;
      this.quiz.feedback({ ok, title, auto: this.explainAuto(ok), onNext: () => this.after() });
    });
  }
  timeout() {
    this.state = "explain";
    const r = this.round;
    this.run.record(r, -1);
    this.quiz.reveal(-1);
    this.combo = 1;
    this.shields--;
    Sound.sfx("hit");
    UI.flash("hit");
    this.shake(0.5);
    this.targets.forEach((t, i) => {
      if (i === r.correct) return this.highlight(t);
      const z0 = t.position.z;
      this.tw.add(0.35, (k) => { t.position.z = lerp(z0, 4, k); }, () => { t.visible = false; }, Ease.inCubic);
    });
    this.hud();
    this.quiz.feedback({ ok: false, title: this.shields > 0 ? "TOO SLOW! SHIELD DOWN" : "TOO SLOW! SHIELDS GONE", onNext: () => this.after() });
  }
  explode(t, color) {
    if (!t || !this.has3D) return;
    this.bursts.burst(t.position, color, { n: 70, speed: 9 * this.ts + 3, size: 0.35, life: 1 });
    this.bursts.burst(t.position, 0xffffff, { n: 20, speed: 4, size: 0.25, life: 0.5 });
    const s0 = t.scale.x;
    this.tw.add(0.2, (k) => t.scale.setScalar(s0 * (1 + k * 0.6)), () => { t.visible = false; });
  }
  highlight(t) {
    if (!t) return;
    t.userData.hot = true;
  }
  after() {
    if (this.unmounted) return;
    this.clearTargets();
    if (this.shields <= 0) return this.gameOver();
    this.inWave++;
    if (this.inWave >= WAVE_LEN) {
      this.inWave = 0;
      this.wave++;
      const bonus = this.shields * 500 + this.wave * 250;
      this.score += bonus;
      this.shields = Math.min(3, this.shields + 1);
      if (this.has3D) this.ringMat.color.setHex(WAVE_COLORS[(this.wave - 1) % WAVE_COLORS.length]);
      Sound.sfx("levelup");
      UI.banner("WAVE " + this.wave, COLORS.yellow, "CLEAR BONUS +" + bonus + " · SHIELD RESTORED");
      this.hud();
      this.state = "intro";
      this.tw.wait(1.5, () => this.nextQuestion());
      return;
    }
    this.nextQuestion();
  }
  gameOver() {
    this.state = "over";
    Sound.stopMusic();
    Sound.sfx("gameover");
    UI.banner("GAME OVER", COLORS.red);
    if (this.has3D) {
      this.bursts.burst(this.ship.position, COLORS.cyan, { n: 90, speed: 6, size: 0.3, life: 1.4 });
      this.ship.visible = false;
    }
    this.tw.wait(1.6, () => {
      if (this.unmounted) return;
      showResults({
        game: "blaster", sel: this.sel, run: this.run, score: this.score,
        title: "GAME OVER", color: COLORS.cyan, headline: fmtScore(this.score) + " PTS",
        sub: `Reached wave ${this.wave} on ${this.sel.label}`,
        tiles: [{ k: "WAVE", v: this.wave }],
      });
    });
  }

  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      this.tLeft -= dt;
      this.timerBar(this.tLeft / this.T);
      if (this.tLeft <= 0) this.timeout();
    }
    if (!this.has3D) return;
    const sp = this.speed * (1 + (this.wave - 1) * 0.08);
    const p = this.streakPos;
    for (let i = 0; i < p.length / 6; i++) {
      p[i * 6 + 2] += sp * 2 * dt;
      p[i * 6 + 5] += sp * 2 * dt;
      if (p[i * 6 + 5] > 2) this.resetStreak(i, -170);
    }
    this.streaks.geometry.attributes.position.needsUpdate = true;
    this.rings.forEach((r) => {
      r.position.z += sp * dt;
      r.rotation.z += dt * 0.2;
      if (r.position.z > 4) r.position.z -= 14 * 12;
    });
    const k = this.state === "ask" ? 1 - this.tLeft / this.T : null;
    this.targets.forEach((t, i) => {
      const u = t.userData;
      if (k !== null) t.position.z = lerp(-95, -12, k);
      t.position.x = u.bx + Math.sin(this.t * 1.3 + i * 1.7) * 0.18 * this.ts;
      t.position.y = u.by + Math.cos(this.t * 1.1 + i) * 0.14 * this.ts;
      t.children[0].rotation.x += dt * u.spin;
      t.children[0].rotation.y += dt * u.spin * 0.7;
      t.children[1].rotation.copy(t.children[0].rotation);
      if (u.hot) {
        const pulse = 1 + Math.sin(this.t * 10) * 0.12;
        t.scale.setScalar(this.ts * pulse * 1.15);
        u.edgeMat = u.edgeMat || t.children[1].material;
        u.edgeMat.color.setHex(Math.sin(this.t * 10) > 0 ? 0xffffff : 0x86ff5e);
      }
    });
    this.ship.position.x = Math.sin(this.t * 0.9) * 0.15;
    this.ship.userData.flame.scale.setScalar(1.1 + Math.sin(this.t * 30) * 0.2);
    if (this.state === "ask") this.ship.rotation.set(Math.sin(this.t) * 0.05, 0, Math.sin(this.t * 0.9) * 0.12);
    this.placeCamera();
  }
  dispose() {
    this.clearTargets();
    super.dispose();
  }
}
