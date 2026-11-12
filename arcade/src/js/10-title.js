// Attract mode: a synthwave horizon with a striped sun, and the INSERT COIN prompt.
class TitleScene extends Scene3D {
  constructor() {
    super({ fov: 62, far: 900, fog: [0x2a0a44, 80, 620] });
    this.speed = 14;
    this.dist = 0;
    if (!this.has3D) return;
    const s = this.scene;
    this.sky = makeSky({ top: 0x030009, mid: 0x170536, horizon: 0xd92aa6, bottom: 0x09031f, glow: 0.75, stars: 1, clouds: 0.8, radius: 860 }); // inside the 900 far plane, beyond the mountains
    s.add(this.sky);
    this.sun = makeNeonSun({ radius: 58, top: 0xffe36a, bottom: 0xff2a8a, intensity: 1.9 });
    this.sun.position.set(0, 18, -360);
    s.add(this.sun);
    s.add(makeRidge({ z: -330, width: 900, height: 78, n: 30, top: 0x2a0c52, bottom: 0x16063a, line: 0x35efff, lineK: 1.3 }));
    s.add(makeRidge({ z: -300, width: 760, height: 50, n: 44, top: 0x3c1068, bottom: 0x0c0326, line: 0xff3ad4, lineK: 2.3 }));
    s.add(makeSkyline({ z: -262, width: 300, count: 70, maxH: 34, minH: 5 }));
    // a nearer, taller layer either side of the sun: three depths of city slide past each other
    const A = clamp(GFX.w / Math.max(1, GFX.h), 0.42, 2.2), mw = 0.6 * A * 240;
    for (const sd of [-1, 1]) { const mid = makeSkyline({ z: -228, width: mw * 1.1, count: 22, maxH: A < 1 ? 46 : 70, minH: 16, lit: 0.42, edge: sd < 0 ? 0xff3ad4 : 0x35efff }); mid.position.x = sd * mw * 0.95; s.add(mid); }
    this.bursts = new Bursts(s);
    this.city = new TitleCity(this);
    // something happens in the sky or the streets every 3 to 6 seconds
    this.director = new EventDirector(this, { min: 3, max: 6 });
    this.skyFlash = 0;
    this.skyKit = new AmbientSky({ host: this, director: this.director, win: () => ({ w: Math.min(150, 0.6 * A * 262 * 0.8), y0: 100, y1: 150, z: -250, s: 1 }), flash: (k) => { this.skyFlash = Math.max(this.skyFlash, k); } });
    this.city.events(this.director);
    this.mirror = new Mirror(0);
    this.floor = makeNeonFloor({ size: 1600, cell: 7, line: 0xff3ad4, lineK: 1.7, base: 0x05011a, mirror: this.mirror, reflect: 0.45, ripple: 0.0016, streak: 0.009, pulse: 1 });
    s.add(this.floor);
    s.userData.mirrors = [this.mirror];
    this.shooting = makeShootingStar();
    s.add(this.shooting);
    s.userData.post = { exposure: 1.15, bloom: 1, rays: { pos: this.sun.position, strength: 0.9, radius: 0.42 } };
    this.camBase.set(0, 3.4, 12);
    this.lookAt.set(0, 9, -120);
  }
  boost() {
    this.tw.add(1.1, (k) => { this.speed = 14 + k * 160; }, null, Ease.inCubic);
  }
  update(dt) {
    super.update(dt);
    this.dist += this.speed * dt;
    if (!this.has3D) return;
    this.floor.material.uniforms.uScroll.value = -this.dist;
    this.shooting.userData.tick(dt);
    this.sun.position.y = 18 + Math.sin(this.t * 0.4) * 0.8;
    this.sun.userData.disc.material.uniforms.uI.value = 1.9 * (1 + 0.08 * Math.sin(this.t * 1.2)); // the sun breathes
    this.bursts.update(dt);
    this.city.update(dt);
    this.director.update(dt, false);
    this.skyFlash = Math.max(0, this.skyFlash - dt * 3);
    this.sky.material.uniforms.uGlow.value = 0.75 + this.skyFlash * 2.2;
    this.scene.fog.far = 620 + Math.sin(this.t * 0.13) * 60; // banks of haze drift through
    this.camBase.set(Pointer.x * 1.2, 3.4 + Math.sin(this.t * 0.7) * 0.15 - Pointer.y * 0.5, 12);
    this.lookAt.set(Pointer.x * 6, 9, -120);
    this.placeCamera();
    followSky(this.sky, this.camera);
    FX.sync(this.scene, this.t);
  }
  dispose() {
    if (this.mirror) this.mirror.dispose();
    super.dispose();
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
      <h1 class="logo-main"><span class="logo-depth" aria-hidden="true">INR<br>ARCADE</span><span class="logo-face">INR<br>ARCADE</span><span class="logo-glint" aria-hidden="true"><span>INR<br>ARCADE</span></span></h1>
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
  document.body.classList.add("on-title"); // the sync toast sits below the top row here
  const timer = setInterval(showTip, 6500);
  const start = () => {
    if (started) return;
    started = true;
    Sound.init();
    Sound.sfx("coin");
    $("[data-credit]", el).textContent = "01";
    $(".insert-coin", el).textContent = "PLAYER 1 READY";
    scene.boost();
    setTimeout(() => UI.cover(showHub), 900); // the first arcade-floor build happens behind black
  };
  UI.show({
    el,
    on: (a) => { if (a === "start") start(); },
    key: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } },
    destroy: () => { clearInterval(timer); document.body.classList.remove("on-title"); },
  });
}
