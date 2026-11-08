// Attract mode: a synthwave horizon with a striped sun, and the INSERT COIN prompt.
class TitleScene extends Scene3D {
  constructor() {
    super({ fov: 62, fog: [0x090320, 30, 250] });
    this.speed = 14;
    this.dist = 0;
    if (!this.has3D) return;
    const s = this.scene;
    this.grid = makeGrid({ size: 420, step: 7, color: 0xff3ad4 });
    s.add(this.grid);
    this.sun = makeSun(46, ["#ffe14f", "#ff9b3d", "#ff3ad4"]);
    this.sun.position.set(0, 24, -235);
    s.add(this.sun);
    s.add(makeMountains({ z: -200, color: 0xa65fff, height: 40 }));
    const back = makeMountains({ z: -215, color: 0x35efff, height: 58, n: 30 });
    back.position.y = -6;
    s.add(back);
    this.stars = makeStars(520, 320, { lowest: 0.02 });
    s.add(this.stars);
    this.camBase.set(0, 3.4, 12);
    this.lookAt.set(0, 7, -120);
  }
  boost() {
    this.tw.add(1.1, (k) => { this.speed = 14 + k * 160; }, null, Ease.inCubic);
  }
  update(dt) {
    super.update(dt);
    this.dist += this.speed * dt;
    if (!this.has3D) return;
    scrollGrid(this.grid, this.dist);
    this.stars.rotation.y += dt * 0.004;
    this.sun.position.y = 24 + Math.sin(this.t * 0.4) * 0.6;
    this.camBase.y = 3.4 + Math.sin(this.t * 0.7) * 0.15;
    this.placeCamera();
  }
}

function showTitle() {
  Sound.play("title");
  Sound.ambience(false);
  const scene = Scenes.cur instanceof TitleScene ? Scenes.cur : Scenes.set(new TitleScene());
  const best = Math.max(Store.best("blaster"), 0);
  const all = ALL_QIDS.concat(ALL_FIDS);
  const m = mpct(Store.masteryOf(all));
  const el = UI.el(`<section class="screen scr-title">
    <div class="title-top"><span>CREDIT <b data-credit>00</b></span><span>MASTERY <b>${m}%</b></span><span>HI <b>${fmtScore(best)}</b></span></div>
    <div class="logo">
      <div class="logo-kicker">INSURANCE &amp; RETIREMENT · QUEBEC</div>
      <h1 class="logo-main">INR<br>ARCADE</h1>
      <div class="logo-sub">11 STAGES · ${ALL_QIDS.length} QUESTIONS · ${ALL_FIDS.length} CARDS</div>
    </div>
    <button class="insert-coin px" data-act="start">INSERT COIN</button>
    <p class="attract" data-tip></p>
    <div class="title-foot">TAP OR PRESS ENTER</div>
  </section>`);
  const tipEl = $("[data-tip]", el);
  let tipI = Math.floor(Math.random() * Math.max(1, ALL_TIPS.length));
  const showTip = () => {
    if (!ALL_TIPS.length) { tipEl.textContent = "Study content loading…"; return; }
    const tip = ALL_TIPS[tipI++ % ALL_TIPS.length];
    tipEl.innerHTML = `<b>STAGE ${tip.ch}</b> · ${esc(tip.t)}`;
  };
  showTip();
  let started = false;
  const timer = setInterval(showTip, 6500);
  const start = () => {
    if (started) return;
    started = true;
    Sound.init();
    Sound.sfx("coin");
    $("[data-credit]", el).textContent = "01";
    $(".insert-coin", el).textContent = "PLAYER 1 READY";
    scene.boost();
    setTimeout(() => { UI.flash("crt-on"); showHub(); }, 900);
  };
  UI.show({
    el,
    on: (a) => { if (a === "start") start(); },
    key: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } },
    destroy: () => clearInterval(timer),
  });
}
