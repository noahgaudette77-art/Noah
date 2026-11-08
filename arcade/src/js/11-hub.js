// The arcade floor: six cabinets on an arc, blacklight carpet, neon wall strips.
// The camera turns to face the selected cabinet; its screen plays a tiny demo.
const HUB_R = 9;
const HUB_STEP = 0.42; // radians between cabinets

class HubScene extends Scene3D {
  constructor() {
    super({ fov: 58, fog: [0x090320, 9, 34] });
    this.sel = Hub.index;
    this.angle = this.cabAngle(this.sel);
    this.restDolly = 1.2;
    this.dolly = 1.2;
    this.cabs = [];
    if (!this.has3D) return;
    const s = this.scene;
    addLights(s, { ambient: 0x7a6ab8, ai: 0.85, ki: 0.5, dir: [0, 8, 6] });
    const carpet = carpetTexture();
    carpet.repeat.set(10, 10);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 40), new THREE.MeshLambertMaterial({ map: carpet }));
    floor.rotation.x = -Math.PI / 2;
    s.add(floor);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 16, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x0d0628, side: THREE.BackSide }));
    wall.position.y = 7;
    s.add(wall);
    [[2.2, 0x35efff], [6.5, 0xff3ad4], [6.8, 0xff3ad4]].forEach(([y, c]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(18.8, 0.05, 4, 90), new THREE.MeshBasicMaterial({ color: c, fog: false }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      s.add(ring);
    });
    const ceiling = makeStars(220, 18, { lowest: 0.45, size: 1.3 });
    s.add(ceiling);
    CABINETS.forEach((cab, i) => {
      const c = this.makeCabinet(cab, i);
      const a = this.cabAngle(i);
      c.group.position.set(Math.sin(a) * HUB_R, 0, -Math.cos(a) * HUB_R);
      c.group.rotation.y = -a;
      s.add(c.group);
      this.cabs.push(c);
    });
    this.spot = new THREE.PointLight(0xffffff, 1.4, 9, 1.5);
    s.add(this.spot);
  }
  cabAngle(i) { return (i - (CABINETS.length - 1) / 2) * HUB_STEP; }
  makeCabinet(cab, i) {
    const g = new THREE.Group();
    const col = new THREE.Color(cab.color);
    const dark = new THREE.MeshPhongMaterial({ color: 0x1a0c3e, flatShading: true, shininess: 20 });
    const side = new THREE.MeshPhongMaterial({ color: col.clone().multiplyScalar(0.45), emissive: col.clone().multiplyScalar(0.18), flatShading: true });
    const mats = [side, side, dark, dark, dark, dark];
    const box = (w, h, d, y, z, rx = 0) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const m = new THREE.Mesh(geo, mats);
      m.position.set(0, y, z);
      m.rotation.x = rx;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: cab.color }));
      m.add(e);
      g.add(m);
      return m;
    };
    box(2.2, 1.25, 1.5, 0.62, 0.05);
    const panel = box(2.2, 0.22, 0.95, 1.36, 0.42, 0.38);
    box(2.2, 2.05, 1.05, 2.45, -0.2);
    box(2.2, 0.6, 1.2, 3.75, -0.15);
    // joystick + buttons on the control panel
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    stick.position.set(-0.5, 0.2, 0);
    panel.add(stick);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: COLORS.red }));
    ball.position.set(-0.5, 0.36, 0);
    panel.add(ball);
    SLOT_COLORS.forEach((c, k) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), new THREE.MeshBasicMaterial({ color: c }));
      b.position.set(0.05 + k * 0.22, 0.12, k % 2 ? 0.08 : -0.08);
      panel.add(b);
    });
    // screen
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.32), new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.set(0, 2.5, 0.33);
    screen.rotation.x = -0.07;
    g.add(screen);
    // marquee
    const mq = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.5),
      new THREE.MeshBasicMaterial({ map: textTexture(cab.name, { w: 512, h: 120, size: cab.name.length > 12 ? 34 : 40, color: "#ffffff", glow: cab.color, bg: "#12052e" }) })
    );
    mq.position.set(0, 3.75, 0.46);
    g.add(mq);
    const halo = glowSprite(cab.color, 3.4, 0.35);
    halo.position.set(0, 4.3, 0.2);
    g.add(halo);
    const demo = { canvas, ctx: canvas.getContext("2d"), tex, t: Math.random() * 10, cab };
    drawDemo(demo, 0);
    return { group: g, demo, halo };
  }
  focus(i) { this.sel = i; }
  // Back the camera off until the whole cabinet fits in the strip above the card.
  onResize(w, h) {
    if (!this.camera) return;
    const bandH = this.band ? this.band.h : h;
    const need = (4.6 * h) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.max(80, bandH));
    this.restDolly = clamp(HUB_R - need, -5, 1.6);
    if (!this.zooming) this.dolly = this.restDolly;
  }
  zoomIn(done) {
    Sound.sfx("swoosh");
    this.zooming = true;
    const from = this.dolly;
    this.tw.add(0.75, (k) => { this.dolly = lerp(from, HUB_R - 2.6, k); }, done, Ease.inCubic);
  }
  zoomOut() {
    const from = this.dolly;
    this.zooming = true;
    this.tw.add(0.6, (k) => { this.dolly = lerp(from, this.restDolly, k); }, () => { this.zooming = false; });
  }
  update(dt) {
    super.update(dt);
    if (!this.has3D) return;
    const target = this.cabAngle(this.sel);
    this.angle += (target - this.angle) * Math.min(1, dt * 6);
    const a = this.angle;
    this.camBase.set(Math.sin(a) * this.dolly, 2.3 + Math.sin(this.t * 0.8) * 0.04, -Math.cos(a) * this.dolly);
    this.lookAt.set(Math.sin(a) * HUB_R, 2.25, -Math.cos(a) * HUB_R);
    this.placeCamera();
    const sa = this.cabAngle(this.sel);
    this.spot.position.set(Math.sin(sa) * (HUB_R - 3), 3, -Math.cos(sa) * (HUB_R - 3));
    this.spot.color.set(CABINETS[this.sel].color);
    this.cabs.forEach((c, i) => {
      c.halo.material.opacity = i === this.sel ? 0.45 + Math.sin(this.t * 4) * 0.12 : 0.18;
      if (i === this.sel) {
        c.demo.t += dt;
        drawDemo(c.demo, dt);
      }
    });
  }
}

// Tiny attract demos drawn on each cabinet's screen.
function drawDemo(d, dt) {
  const x = d.ctx, W = 160, H = 120, t = d.t, c = d.cab.color;
  x.fillStyle = "#07021a";
  x.fillRect(0, 0, W, H);
  x.font = '8px "Press Start 2P", monospace';
  x.textAlign = "center";
  switch (d.cab.id) {
    case "blaster": {
      x.fillStyle = "#fff";
      for (let i = 0; i < 40; i++) { const k = (i * 37.7 + t * 40 * (1 + (i % 3))) % 160; x.fillRect((i * 53) % W, k * 0.75, 1, 1 + (i % 2)); }
      SLOT_COLORS.forEach((col, i) => {
        const s = 6 + ((t * 0.35 + i * 0.25) % 1) * 18;
        x.fillStyle = col;
        x.fillRect(40 + (i % 2) * 80 - s / 2, 30 + Math.floor(i / 2) * 34 - s / 2, s, s);
      });
      x.fillStyle = COLORS.cyan;
      x.beginPath(); x.moveTo(80, 96); x.lineTo(70, 112); x.lineTo(90, 112); x.fill();
      if (Math.floor(t * 3) % 2) { x.fillStyle = COLORS.yellow; x.fillRect(79, 40, 2, 56); }
      break;
    }
    case "racer": {
      x.fillStyle = "#2a0b52"; x.fillRect(0, 50, W, 70);
      x.fillStyle = COLORS.yellow; x.beginPath(); x.arc(80, 50, 20, Math.PI, 0); x.fill();
      x.strokeStyle = COLORS.magenta;
      for (let i = 0; i < 8; i++) { const yy = 50 + Math.pow(((i / 8 + t * 0.6) % 1), 2) * 70; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
      x.strokeStyle = COLORS.cyan;
      [-1, -0.5, 0, 0.5, 1].forEach((k) => { x.beginPath(); x.moveTo(80 + k * 6, 50); x.lineTo(80 + k * 90, 120); x.stroke(); });
      const lane = Math.floor(t / 1.5) % 4;
      x.fillStyle = COLORS.red; x.fillRect(80 + (lane - 1.5) * 26 - 9, 100, 18, 10);
      x.fillStyle = COLORS.lime; x.fillText("$" + Math.floor(25 + t * 9) + "K", 80, 16);
      break;
    }
    case "boss": {
      const bob = Math.sin(t * 3) * 3;
      x.fillStyle = COLORS.magenta; x.fillRect(50, 26 + bob, 60, 50);
      x.fillStyle = "#07021a"; x.fillRect(60, 40 + bob, 12, 8); x.fillRect(88, 40 + bob, 12, 8);
      x.fillStyle = COLORS.yellow; x.fillRect(64, 42 + bob, 4, 4); x.fillRect(92, 42 + bob, 4, 4);
      x.fillStyle = "#07021a"; for (let i = 0; i < 5; i++) x.fillRect(58 + i * 10, 62 + bob, 6, 6);
      x.fillStyle = "#333"; x.fillRect(20, 8, 120, 6);
      x.fillStyle = COLORS.red; x.fillRect(20, 8, 120 * (0.3 + 0.7 * (1 - ((t * 0.15) % 1))), 6);
      if (Math.floor(t * 2) % 3 === 0) { x.fillStyle = COLORS.cyan; x.fillRect(78, 80, 4, 30); }
      break;
    }
    case "memory": {
      const flip = Math.abs(Math.cos(t * 1.2));
      x.fillStyle = Math.cos(t * 1.2) > 0 ? COLORS.lime : COLORS.cyan;
      x.fillRect(80 - 50 * flip, 24, 100 * flip, 64);
      x.fillStyle = "#07021a";
      if (flip > 0.4) { x.fillRect(80 - 34 * flip, 44, 68 * flip, 6); x.fillRect(80 - 26 * flip, 60, 52 * flip, 6); }
      x.fillStyle = COLORS.gold;
      for (let i = 0; i < 6; i++) { const yy = ((t * 30 + i * 22) % 110); x.fillRect(12 + (i % 2) * 130, yy, 6, 6); }
      break;
    }
    case "exam": {
      x.fillStyle = "#e8e2ff"; x.fillRect(30, 8, 100, 104);
      x.fillStyle = "#07021a";
      const filled = Math.floor(t * 2) % 10;
      for (let r = 0; r < 9; r++) for (let k = 0; k < 4; k++) {
        const on = r < filled && (r * 7 + 3) % 4 === k;
        x.beginPath(); x.arc(56 + k * 18, 18 + r * 10.5, 3, 0, Math.PI * 2);
        if (on) x.fill(); else { x.strokeStyle = "#5b4b9a"; x.stroke(); }
      }
      x.fillStyle = COLORS.violet; for (let r = 0; r < 9; r++) x.fillRect(36, 16 + r * 10.5, 8, 4);
      break;
    }
    default: {
      x.fillStyle = COLORS.orange;
      x.textAlign = "left";
      const lines = ["STAGE 1..11", "OBJECTIVES", "KEY RULES", "EXAM TIPS", "SEARCH", "NUMBERS", "TERMS"];
      for (let i = 0; i < 12; i++) {
        const yy = 16 + i * 12 - ((t * 10) % 12);
        x.fillStyle = i % 3 === 0 ? COLORS.orange : "#bfb3ff";
        x.fillText(lines[i % lines.length], 14, yy);
      }
    }
  }
  if (Math.floor(t * 1.4) % 2 === 0) {
    x.fillStyle = c;
    x.textAlign = "center";
    x.fillText("PRESS START", 80, 116);
  }
  d.tex.needsUpdate = true;
}

const Hub = { index: 0 };

// The suggested next step through the book: for each stage in order, read the
// notes, bank the flashcards, blast the questions, beat the boss. Then the exam.
function nextMission() {
  for (const c of CHAPTERS) {
    if (!c.qids.length) continue;
    if (!Store.state.read[c.n]) return { kind: "read", ch: c.n, text: `READ STAGE ${c.n} NOTES` };
    if (Store.countSeen(c.fids) < c.fids.length * 0.6) return { kind: "memory", ch: c.n, text: `BANK STAGE ${c.n} CARDS` };
    if (Store.masteryOf(c.qids) < 0.34) return { kind: "blaster", ch: c.n, text: `BLAST STAGE ${c.n}` };
    if (!(Store.state.boss[c.n] > 0)) return { kind: "boss", ch: c.n, text: `BEAT ${BOSSES[c.n].name}` };
  }
  if ((Store.state.stats.bestExam || 0) < 60) return { kind: "exam", text: "PASS THE FINAL EXAM" };
  if (weakIds(ALL_QIDS).length) return { kind: "blaster", ch: "weak", text: "CLEAR YOUR WEAK SPOTS" };
  return { kind: "racer", ch: "all", text: "RETIRE A MILLIONAIRE" };
}
function runMission(m) {
  UI.flash("crt-on");
  if (m.kind === "read") showGuide(m.ch);
  else if (m.kind === "exam") showExamSetup();
  else startGame(m.kind, makeSelection(String(m.ch)));
}

function overallMastery() {
  return mpct(Store.masteryOf(ALL_QIDS.concat(ALL_FIDS)));
}

function hubScene() {
  return Scenes.cur instanceof HubScene ? Scenes.cur : Scenes.set(new HubScene());
}

function showHub() {
  Sound.play("hub");
  const scene = hubScene();
  scene.zoomOut();
  const el = UI.el(`<section class="screen scr-hub">
    <header class="topbar">
      <div class="brand grow">INR ARCADE</div>
      <span class="chip">MASTERY <b data-m>${overallMastery()}%</b></span>
      <button class="iconbtn" data-act="stats">STATS</button>
      <button class="iconbtn" data-act="settings">SETUP</button>
      ${soundBtn()}
    </header>
    <button class="mission" data-act="mission"><span class="label">NEXT MISSION</span><span data-mission></span>${icon("play")}</button>
    <div class="spacer"></div>
    <div class="hub-card" data-card></div>
  </section>`);
  const card = $("[data-card]", el);
  const render = () => {
    const cab = CABINETS[Hub.index];
    card.style.setProperty("--c", cab.color);
    const best = Store.best(cab.id);
    const meta = {
      blaster: `HI-SCORE <b>${fmtScore(best)}</b>`,
      racer: `BEST NEST EGG <b>${money(best)}</b>`,
      boss: `BOSSES BEATEN <b>${Object.values(Store.state.boss).filter((v) => v > 0).length}/12</b>`,
      memory: `CARDS BANKED <b>${Store.countMastered(ALL_FIDS)}/${ALL_FIDS.length}</b>`,
      exam: `BEST EXAM <b>${Store.state.stats.bestExam || 0}%</b>`,
      guide: `${CHAPTERS.reduce((s, c) => s + c.guide.length, 0)} <b>NOTE PAGES</b>`,
    }[cab.id];
    card.innerHTML = `<div class="hub-nav">
        <button class="iconbtn" data-act="prev" aria-label="Previous cabinet">${icon("left")}</button>
        <div><div class="hub-name">${esc(cab.name)}</div><div class="hub-tag">${esc(cab.tag)}</div></div>
        <button class="iconbtn" data-act="next" aria-label="Next cabinet">${icon("right")}</button>
      </div>
      <p class="hub-desc">${esc(cab.desc)}</p>
      <div class="hub-meta"><span>${meta}</span><span>${Hub.index + 1}/${CABINETS.length}</span></div>
      <button class="btn" data-act="play">${cab.id === "guide" ? "OPEN GUIDE" : "PLAY"} ${icon("play")}</button>
      <div class="dots">${CABINETS.map((_, i) => `<i class="${i === Hub.index ? "on" : ""}"></i>`).join("")}</div>`;
    scene.focus(Hub.index);
    requestAnimationFrame(() => scene.setBand($(".spacer", el)));
  };
  const move = (d) => {
    Hub.index = (Hub.index + d + CABINETS.length) % CABINETS.length;
    Sound.sfx("move");
    render();
  };
  const play = () => {
    const cab = CABINETS[Hub.index];
    Sound.sfx("select");
    scene.zoomIn();
    setTimeout(() => {
      UI.flash("crt-on");
      if (cab.id === "guide") showGuide();
      else if (cab.id === "exam") showExamSetup();
      else showSelect(cab.id);
    }, 520);
  };
  render();
  const mission = nextMission();
  $("[data-mission]", el).textContent = mission.text;
  let sx = null;
  const down = (e) => { sx = e.clientX; };
  const up = (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50 && !card.contains(e.target)) move(dx < 0 ? 1 : -1);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  const off = Store.onChange(() => { const m = $("[data-m]", el); if (m) m.textContent = overallMastery() + "%"; });
  UI.show({
    el,
    on: (a, t) => {
      if (a === "prev") move(-1);
      if (a === "next") move(1);
      if (a === "play") play();
      if (a === "mission") { Sound.sfx("select"); runMission(mission); }
      if (a === "stats") { Sound.sfx("select"); showStats(); }
      if (a === "settings") { Sound.sfx("select"); showSettings(); }
      if (a === "mute") { toggleMute(); t.outerHTML = soundBtn(); }
    },
    key: (e) => {
      if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); }
      else if (e.key === "Escape") showTitle();
    },
    destroy: () => { off(); scene.setBand(null); },
  });
}
