// NEST EGG RUN — a neon lane racer through a 40-year career (age 25 to 65, one
// gate per year). A gantry with one sign per answer rushes toward you; be in the
// right lane when it arrives. Right answers compound your savings, wrong ones
// crash the market, three crashes force early retirement. Every 5-answer streak
// buys an insurance policy that pays out on your next crash.
const EGG_START = 25000;
const EGG_GOAL = 1000000;
const EGG_MILESTONES = [100000, 250000, 500000, 1000000, 1500000];
const CAREER_YEARS = 40;
const START_AGE = 25;

function makePalm(color) {
  const g = new THREE.Group();
  const trunk = new THREE.MeshBasicMaterial({ color: 0x1b0b3a });
  let y = 0, x = 0;
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.012, 0.2 - i * 0.012, 0.95, 5), trunk);
    x += 0.07 * i;
    seg.position.set(x, y + 0.45, 0);
    seg.rotation.z = -0.06 * i;
    g.add(seg);
    y += 0.88;
  }
  const leafMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const th = Math.PI / 2 + 0.38;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.7, 3), leafMat);
    leaf.scale.set(1, 1, 0.35);
    leaf.quaternion.setFromAxisAngle(new THREE.Vector3(Math.sin(a), 0, -Math.cos(a)), th);
    const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(leaf.quaternion);
    leaf.position.set(x, y, 0).addScaledVector(dir, 1.3);
    g.add(leaf);
  }
  return g;
}
function makePole(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.2, 0.14), new THREE.MeshBasicMaterial({ color: 0x2a1a5a }));
  pole.position.y = 2.6;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), new THREE.MeshBasicMaterial({ color }));
  arm.position.set(0, 5.1, 0);
  const lamp = glowSprite(color, 2.4, 0.9);
  lamp.position.set(0, 5.1, 0);
  g.add(pole, arm, lamp);
  return g;
}
function roadTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#150a3d";
  x.fillRect(0, 0, 256, 256);
  x.fillStyle = "rgba(255,255,255,0.03)";
  for (let y = 0; y < 256; y += 8) x.fillRect(0, y, 256, 3);
  x.fillStyle = "#35efff";
  x.fillRect(0, 0, 7, 256);
  x.fillRect(249, 0, 7, 256);
  x.fillStyle = "#ff3ad4";
  [64, 128, 192].forEach((lx) => { x.fillRect(lx - 2, 0, 4, 120); });
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}
const laneX = (i, n) => (n === 2 ? [-2.5, 2.5] : [-3.75, -1.25, 1.25, 3.75])[i];

// The sky across a career: dawn at 25, bright day mid-career, golden hour, dusk at 65.
const CAREER_SKY = [
  { p: 0, bg: 0x3b1452, fog: 0x4c1d60, sunY: 7, tint: 0xffd6ea, grid: 0xff7ad9, stars: 0.25 },
  { p: 0.4, bg: 0x1d2f7c, fog: 0x2c47a3, sunY: 44, tint: 0xffffff, grid: 0x6ad8ff, stars: 0 },
  { p: 0.75, bg: 0x30104e, fog: 0x45145a, sunY: 22, tint: 0xffc08f, grid: 0xff3ad4, stars: 0.35 },
  { p: 1, bg: 0x0c0326, fog: 0x14062f, sunY: 5, tint: 0xff8f70, grid: 0xa65fff, stars: 1 },
];
function skyAt(p) {
  let i = 0;
  while (i < CAREER_SKY.length - 2 && p > CAREER_SKY[i + 1].p) i++;
  const a = CAREER_SKY[i], b = CAREER_SKY[i + 1];
  const k = clamp((p - a.p) / (b.p - a.p), 0, 1);
  const mix = (x, y) => new THREE.Color(x).lerp(new THREE.Color(y), k);
  return { bg: mix(a.bg, b.bg), fog: mix(a.fog, b.fog), tint: mix(a.tint, b.tint), grid: mix(a.grid, b.grid), sunY: lerp(a.sunY, b.sunY, k), stars: lerp(a.stars, b.stars, k) };
}

class RacerGame extends QuizGame {
  constructor(sel) {
    super(sel, "racer", { fov: 62, fog: [0x12052e, 40, 230], bg: 0x0c0326 });
    this.picker = new QuestionPicker(selectionQids(sel));
    this.egg = EGG_START;
    this.peak = EGG_START;
    this.crashes = 0;
    this.insurance = 0;
    this.year = 0;
    this.speed = 30;
    this.dist = 0;
    this.lane = null;
    this.carX = 0;
    this.gate = null;
    this.gp = 0;
    this.nextMilestone = 0;
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="egg"><small data-sub>NEST EGG · AGE 25</small><span data-egg>${money(this.egg)}</span></div>
        <div class="grow"></div>
        <span class="combo" data-rate>4%</span>
        <div class="lives" data-ins></div>
        <div class="lives" data-lives></div>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <span class="meter goalbar" style="--c:${COLORS.lime}" title="Progress to $1,000,000"><i data-goal></i></span>
      <div class="timer"><i></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
      <div class="hint">TAP A LANE · TAP IT AGAIN TO FLOOR IT</div>
    </section>`);
    this.hud();
  }

  build3D() {
    const s = this.scene;
    addLights(s, { ambient: 0x9a8ad0, ai: 0.9, ki: 0.8, dir: [-3, 6, 5] });
    this.ground = makeGrid({ size: 460, step: 6, color: 0xa65fff, y: -0.04 });
    s.add(this.ground);
    this.roadTex = roadTexture();
    this.roadTex.repeat.set(1, 30);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 420), new THREE.MeshBasicMaterial({ map: this.roadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, -200);
    s.add(road);
    const sun = makeSun(42, ["#ffe14f", "#ff9b3d", "#ff3ad4"]);
    sun.position.set(0, 7, -260);
    s.add(sun);
    this.sun = sun;
    s.add(makeMountains({ z: -230, height: 30, color: 0xff3ad4 }));
    this.stars = makeStars(400, 330, { lowest: 0.03 });
    this.stars.material.transparent = true;
    s.add(this.stars);
    this.skyP = 0;
    this.props = [];
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1;
      const p = i % 4 < 2 ? makePalm(i % 3 ? 0xff3ad4 : 0x35efff) : makePole(i % 3 ? 0x35efff : 0xffe14f);
      p.position.set(side * rand(7.5, 11), 0, -i * 13 - 5);
      if (side > 0) p.scale.x = -1;
      s.add(p);
      this.props.push(p);
    }
    this.car = this.makeCar();
    s.add(this.car);
    this.camBase.set(0, 3.1, 7.4);
    this.lookAt.set(0, 1.1, -18);
  }
  // Widen the lens when the 3D strip is short, so the car and the horizon both fit.
  onLayout() {
    if (!this.has3D || !this.band) return;
    this.baseFov = clamp((38 * GFX.h) / this.band.h, 62, 104);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }
  makeCar() {
    const g = new THREE.Group();
    const body = neonSolid(new THREE.BoxGeometry(1.7, 0.42, 3.2), COLORS.magenta, { fill: 0x2a0f5a, glow: 0.3 });
    body.position.y = 0.48;
    const nose = neonSolid(new THREE.BoxGeometry(1.5, 0.25, 0.8), COLORS.magenta, { fill: 0x2a0f5a, glow: 0.3 });
    nose.position.set(0, 0.4, -1.85);
    const cabin = neonSolid(new THREE.BoxGeometry(1.2, 0.38, 1.3), COLORS.cyan, { fill: 0x0e0530, glow: 0.25 });
    cabin.position.set(0, 0.88, 0.25);
    const spoiler = neonSolid(new THREE.BoxGeometry(1.9, 0.08, 0.38), COLORS.magenta, { fill: 0x2a0f5a, glow: 0.3 });
    spoiler.position.set(0, 1.0, 1.45);
    g.add(body, nose, cabin, spoiler);
    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.3, 8);
    [[-0.88, -1.05], [0.88, -1.05], [-0.88, 1.05], [0.88, 1.05]].forEach(([x, z]) => {
      const w = neonSolid(wheelGeo, COLORS.violet, { fill: 0x050208, glow: 0.05 });
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.33, z);
      g.add(w);
    });
    [-0.55, 0.55].forEach((x) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: COLORS.red }));
      tl.position.set(x, 0.55, 1.62);
      const glow = glowSprite(COLORS.red, 1.1, 0.8);
      glow.position.set(x, 0.55, 1.7);
      g.add(tl, glow);
    });
    const under = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 4.4),
      new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(COLORS.magenta), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    under.rotation.x = -Math.PI / 2;
    under.position.y = 0.04;
    g.add(under);
    return g;
  }
  makeGate() {
    const g = new THREE.Group();
    const r = this.round;
    const frame = (geo, x, y) => {
      const m = neonSolid(geo, COLORS.violet, { fill: 0x1c0d45, glow: 0.2 });
      m.position.set(x, y, 0);
      g.add(m);
    };
    frame(new THREE.BoxGeometry(0.3, 5.2, 0.3), -5.6, 2.6);
    frame(new THREE.BoxGeometry(0.3, 5.2, 0.3), 5.6, 2.6);
    frame(new THREE.BoxGeometry(11.5, 0.35, 0.35), 0, 5.2);
    for (let i = 0; i < r.n; i++) {
      const col = SLOT_COLORS[i];
      const label = r.tf ? (i === 0 ? "TRUE" : "FALSE") : r.labels[i];
      const tex = textTexture(label, { w: 192, h: 112, size: r.tf ? 26 : 54, color: col, glow: col, bg: "#12052e" });
      const w = r.tf ? 4.6 : 2.3;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.35), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(laneX(i, r.n), 4.2, 0.22);
      const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, 1.35)), new THREE.LineBasicMaterial({ color: col }));
      border.position.copy(sign.position);
      g.add(sign, border);
      sign.userData.slot = i;
    }
    const divs = r.n === 2 ? [0] : [-2.5, 0, 2.5];
    divs.forEach((x) => {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.3, 0.16), new THREE.MeshBasicMaterial({ color: COLORS.red }));
      d.position.set(x, 0.65, 0);
      g.add(d);
    });
    g.position.z = -170;
    return g;
  }

  start() {
    Sound.play("game");
    Sound.engine(true);
    UI.banner("AGE 25. GO!", COLORS.yellow, "Grow " + money(EGG_START) + " into " + money(EGG_GOAL) + " by 65");
    this.tw.wait(1.3, () => this.nextQuestion());
  }
  rate() { return 0.03 + 0.005 * Math.min(this.run.streak, 10); }
  hud() {
    if (!this.el) return;
    $("[data-egg]", this.el).textContent = money(this.egg);
    $("[data-sub]", this.el).textContent = "NEST EGG · AGE " + (START_AGE + this.year);
    $("[data-rate]", this.el).textContent = "+" + Math.round(this.rate() * 100) + "%/YR";
    const frac = clamp(Math.log(this.egg / EGG_START) / Math.log(EGG_GOAL / EGG_START), 0, 1);
    $("[data-goal]", this.el).style.width = (frac * 100).toFixed(1) + "%";
    this.lives(3 - this.crashes, 3, "heart", COLORS.red);
    $("[data-ins]", this.el).innerHTML = Array.from({ length: this.insurance }, () => `<span title="Insurance policy">${icon("shield", COLORS.lime)}</span>`).join("");
  }
  nextQuestion() {
    if (this.unmounted) return;
    const q = this.picker.next();
    if (!q) { UI.toast("NO QUESTIONS IN THIS STAGE YET"); return this.quit(); }
    this.round = new Round(q);
    this.quiz.show(this.round, `STAGE ${q.ch} · ${q.topic}`);
    this.T = readTime(this.round, 1.05);
    this.gp = 0;
    this.lane = null;
    this.boostRate = 0;
    this.lockT = 0;
    if (this.has3D) {
      if (this.gate) { this.scene.remove(this.gate); disposeTree(this.gate); }
      this.gate = this.makeGate();
      this.scene.add(this.gate);
    }
    this.layoutBand();
    this.state = "ask";
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    if (this.lane === i) return this.boost();
    this.lane = i;
    this.quiz.select(i);
    Sound.sfx("move");
    this.lockT = 1.0; // floor it automatically if you don't change lanes again
  }
  boost() {
    if (this.boostRate || this.state !== "ask" || this.lane === null) return;
    this.timeFrac = 1 - this.gp;
    this.boostRate = Math.max(1 / this.T, (1 - this.gp) / 0.7);
    Sound.sfx("swoosh");
  }
  key(e) {
    if (this.state === "ask" && !this.quiz.sheet && !this.paused && !UI.modal) {
      const n = this.round ? this.round.n : 4;
      if (e.key === "ArrowLeft") { e.preventDefault(); return this.pick(this.lane === null ? Math.floor((n - 1) / 2) : Math.max(0, this.lane - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); return this.pick(this.lane === null ? Math.ceil((n - 1) / 2) : Math.min(n - 1, this.lane + 1)); }
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp") { e.preventDefault(); return this.boost(); }
    }
    super.key(e);
  }
  arrive() {
    const r = this.round;
    const picked = this.lane === null ? -1 : this.lane;
    const ok = this.run.record(r, picked);
    this.quiz.reveal(picked);
    this.state = "explain";
    let title;
    if (ok) {
      const tf = this.boostRate ? this.timeFrac : 0;
      const contrib = 2500 + 250 * Math.min(this.run.streak, 10) + Math.round(1500 * tf);
      const rate = this.rate();
      const before = this.egg;
      this.egg = (this.egg + contrib) * (1 + rate);
      this.peak = Math.max(this.peak, this.egg);
      if (this.run.streak > 0 && this.run.streak % 5 === 0 && this.insurance < 2) {
        this.insurance++;
        UI.toast("STREAK " + this.run.streak + "! INSURANCE POLICY ISSUED");
      }
      title = `+${money(this.egg - before)} · ${Math.round(rate * 100)}% RETURN`;
      Sound.sfx("correct");
      Sound.sfx("deposit");
      UI.flash("good");
      GFX.pulse(3, 0.08);
      Haptics.buzz(25);
      Sound.setIntensity(Sound.intensityFor(this.run.streak));
      this.speedKick();
      if (this.has3D) {
        this.bursts.burst(new THREE.Vector3(this.carX, 1.5, -1), COLORS.gold, { n: 50, speed: 6, size: 0.3, life: 1.2, gravity: -9 });
        this.signFlash(r.correct);
      }
      const p = this.bandPoint(0.4);
      UI.floater("+" + money(this.egg - before), p.x, p.y, COLORS.lime);
      while (this.nextMilestone < EGG_MILESTONES.length && this.egg >= EGG_MILESTONES[this.nextMilestone]) {
        const m = EGG_MILESTONES[this.nextMilestone++];
        this.tw.wait(0.4, () => {
          Sound.sfx("levelup");
          UI.banner(m === EGG_GOAL ? "MILLIONAIRE!" : money(m) + "!", COLORS.lime, m === EGG_GOAL ? "Retire rich if you keep it" : "Milestone at age " + (START_AGE + this.year));
        });
      }
    } else if (this.insurance > 0) {
      this.insurance--;
      title = picked < 0 ? "NO LANE! INSURANCE PAID THE CLAIM" : "WRONG LANE! INSURANCE PAID THE CLAIM";
      Sound.sfx("wrong");
      UI.flash("hit");
      this.shake(0.25);
      GFX.pulse(6, 0);
      Sound.setIntensity(0);
      this.spin();
    } else {
      this.crashes++;
      const loss = this.egg * 0.15;
      this.egg -= loss;
      title = (picked < 0 ? "NO LANE CHOSEN! " : "WRONG LANE! ") + "MARKET CRASH −" + money(loss);
      Sound.sfx("hit");
      Sound.sfx("wrong");
      UI.flash("hit");
      this.shake(0.5);
      GFX.pulse(12, 0);
      GFX.hitStop(120);
      Haptics.buzz([70, 40, 110]);
      Sound.setIntensity(0);
      this.spin();
      if (this.has3D) this.bursts.burst(new THREE.Vector3(this.carX, 0.8, -0.5), COLORS.red, { n: 60, speed: 8, size: 0.28, life: 0.9 });
    }
    this.hud();
    const gate = this.gate;
    this.gate = null;
    if (gate) this.tw.add(0.6, (k) => { gate.position.z = lerp(0, 16, k); }, () => { this.scene.remove(gate); disposeTree(gate); });
    this.tw.wait(0.45, () => {
      if (this.unmounted) return;
      this.quiz.feedback({ ok, title, auto: this.explainAuto(ok), onNext: () => this.after() });
    });
  }
  signFlash(slot) {
    if (!this.gate) return;
    this.gate.children.forEach((c) => {
      if (c.userData.slot === slot) this.tw.add(0.5, (k) => { c.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.4); });
    });
  }
  speedKick() {
    if (!this.has3D) return;
    this.tw.add(0.9, (k) => {
      this.camera.fov = (this.baseFov || 62) + Math.sin(k * Math.PI) * 10;
      this.camera.updateProjectionMatrix();
    });
    this.tw.add(1.0, (k) => { this.speed = 30 + Math.sin(k * Math.PI) * 50; });
  }
  spin() {
    if (!this.has3D) return;
    this.tw.add(0.8, (k) => { this.car.rotation.y = k * Math.PI * 2; }, () => { this.car.rotation.y = 0; }, Ease.outCubic);
  }
  after() {
    if (this.unmounted) return;
    this.year++;
    this.hud();
    if (this.crashes >= 3) return this.gameOver(false);
    if (this.year >= CAREER_YEARS) return this.gameOver(true);
    this.nextQuestion();
  }
  gameOver(fullCareer) {
    this.state = "over";
    Sound.stopMusic();
    Sound.engine(false);
    const rich = this.egg >= EGG_GOAL;
    const age = START_AGE + this.year;
    if (fullCareer) {
      Sound.sfx(rich ? "win" : "levelup");
      UI.banner(rich ? "RETIRED A MILLIONAIRE" : "HAPPY RETIREMENT", rich ? COLORS.lime : COLORS.yellow, "Age 65 · " + money(this.egg));
    } else {
      Sound.sfx("gameover");
      UI.banner("FORCED RETIREMENT", COLORS.red, "Three market crashes at age " + age);
    }
    this.tw.wait(1.9, () => {
      if (this.unmounted) return;
      showResults({
        game: "racer", sel: this.sel, run: this.run, score: Math.round(this.egg),
        title: rich ? "RETIRED RICH" : fullCareer ? "RETIRED AT 65" : "RETIRED EARLY", color: rich ? COLORS.lime : fullCareer ? COLORS.yellow : COLORS.red,
        headline: money(this.egg), sub: `Retired at age ${age} on ${this.sel.label} · peak ${money(this.peak)}`,
        tiles: [{ k: "RETIRED AT", v: age, c: COLORS.yellow }, { k: "PEAK", v: money(this.peak), c: COLORS.lime }],
      });
    });
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      if (this.lane !== null && !this.boostRate && this.lockT > 0) {
        this.lockT -= dt;
        if (this.lockT <= 0) this.boost();
      }
      this.gp += dt * (this.boostRate || 1 / this.T);
      this.timerBar(1 - this.gp);
      if (this.gp >= 1) { this.gp = 1; this.arrive(); }
    }
    if (!this.has3D) return;
    const sp = this.speed + (this.boostRate ? 45 : 0);
    Sound.rev(clamp(sp / 80, 0, 1.4));
    // Ease the sky toward this year of the career.
    this.skyP += (this.year / CAREER_YEARS - this.skyP) * Math.min(1, dt * 0.8);
    const sky = skyAt(this.skyP);
    this.scene.background.copy(sky.bg);
    this.scene.fog.color.copy(sky.fog);
    this.sun.position.y = sky.sunY;
    this.sun.children[1].material.color.copy(sky.tint);
    this.ground.userData.grid.material.color.copy(sky.grid);
    this.stars.material.opacity = sky.stars;
    this.dist += sp * dt;
    this.roadTex.offset.y = (this.dist / 14) % 1;
    scrollGrid(this.ground, this.dist);
    this.props.forEach((p) => {
      p.position.z += sp * dt;
      if (p.position.z > 12) p.position.z -= 18 * 13;
    });
    if (this.gate && this.state === "ask") this.gate.position.z = lerp(-170, 0, this.gp);
    const n = this.round ? this.round.n : 4;
    const tx = this.lane === null ? 0 : laneX(this.lane, n);
    const prev = this.carX;
    this.carX += (tx - this.carX) * Math.min(1, dt * 7);
    this.car.position.x = this.carX;
    this.car.position.y = Math.sin(this.t * 18) * 0.02;
    this.car.rotation.z = clamp((prev - this.carX) * 2.5, -0.25, 0.25);
    // On narrow screens the camera tracks the car closely so outer lanes stay in shot.
    const follow = GFX.w / GFX.h < 0.8 ? 0.85 : 0.35;
    this.camBase.x = this.carX * follow;
    this.lookAt.x = this.carX * follow * 0.6;
    this.placeCamera();
  }
  pause() {
    super.pause();
    if (this.paused) Sound.engine(false);
  }
  resume() {
    super.resume();
    if (this.state !== "over") Sound.engine(true);
  }
  dispose() {
    Sound.engine(false);
    super.dispose();
  }
}
