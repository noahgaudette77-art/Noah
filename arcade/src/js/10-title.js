// Attract mode: a synthwave horizon with a striped sun, and the INSERT COIN prompt.
class TitleScene extends Scene3D {
  constructor() {
    super({ fov: 62, far: 900, fog: [0x2a0a44, 105, 560] });
    this.speed = 14;
    this.dist = 0;
    if (!this.has3D) return;
    const s = this.scene;
    this.sky = makeSky({ top: 0x030009, mid: 0x170536, horizon: 0xd92aa6, bottom: 0x09031f, glow: 0.75, stars: 1, clouds: 0.8, radius: 860 }); // inside the 900 far plane, beyond the mountains
    s.add(this.sky);
    this.sun = makeNeonSun({ radius: 52, top: 0xffd24a, bottom: 0xff1f8f, intensity: 0.86 });
    this.sun.userData.glow.material.opacity = 0.3; // (a tighter halo: the city in front of it keeps its edges)
    this.sun.position.set(0, 30, -360);
    s.add(this.sun);
    s.add(makeRidge({ z: -330, width: 900, height: 78, n: 30, top: 0x2a0c52, bottom: 0x16063a, line: 0x35efff, lineK: 1.3 }));
    s.add(makeRidge({ z: -300, width: 760, height: 50, n: 44, top: 0x3c1068, bottom: 0x0c0326, line: 0xff3ad4, lineK: 2.3 }));
    s.add(makeSkyline({ z: -262, width: 300, count: 70, maxH: 34, minH: 5 }));
    // a nearer, taller layer either side of the sun: three depths of city slide past each other
    const A = clamp(GFX.w / Math.max(1, GFX.h), 0.42, 2.2), mw = 0.6 * A * 240;
    for (const sd of [-1, 1]) { const mid = makeSkyline({ z: -228, width: mw * 1.1, count: 22, maxH: A < 1 ? 46 : 70, minH: 16, lit: 0.42, edge: sd < 0 ? 0xff3ad4 : 0x35efff }); mid.position.x = sd * mw * 0.95; s.add(mid); }
    this.bursts = new Bursts(s);
    this.city = new TitleCity(this);
    this.life = new TitleLife(this);
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
    s.userData.post = { exposure: 1.12, bloom: 0.85, threshold: 1.12, contrast: 1.12, saturation: 1.18, fringe: 0.25, rays: { pos: this.sun.position, strength: 0.6, radius: 0.42 }, ao: 0.8, aoRadius: 0.035, shadow: 0, dirt: 0.6, mblur: 1 };
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
    this.sun.position.y = 30 + Math.sin(this.t * 0.4) * 0.8;
    this.sun.userData.disc.material.uniforms.uI.value = 0.86 * (1 + 0.05 * Math.sin(this.t * 1.2)); // the sun breathes
    this.bursts.update(dt);
    this.city.update(dt);
    this.life.update(dt);
    this.director.update(dt, false);
    this.skyFlash = Math.max(0, this.skyFlash - dt * 3);
    this.sky.material.uniforms.uGlow.value = 0.75 + this.skyFlash * 2.2;
    this.scene.fog.far = 560 + Math.sin(this.t * 0.13) * 60; // banks of haze drift through
    this.scene.userData.post.exposure = 1.12 + 0.16 * (this.life.flash || 0); // lightning lifts the whole picture for a moment
    // the camera is never still: it sways across the avenue, pushes slowly in toward the city and eases back, and rolls a hair
    const mv = REDUCED_MOTION || GFX.calm ? 0.25 : 1, t = this.t, sway = Math.sin(t * 0.11) * 3.4 * mv, push = (0.5 - 0.5 * Math.cos(t * 0.085)) * 9 * mv;
    this.camBase.set(sway + Pointer.x * 1.2, 3.4 + Math.sin(t * 0.7) * 0.15 - Pointer.y * 0.5 + push * 0.1, 12 - push);
    this.lookAt.set(Pointer.x * 6 + Math.sin(t * 0.11 + 0.9) * 2.4 * mv, 9, -120);
    this.placeCamera();
    this.camera.rotation.z += Math.sin(t * 0.09) * 0.014 * mv;
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
    </div>
    <div class="title-dock">
      <button class="insert-coin px" data-act="start">INSERT COIN</button>
      <div class="title-foot">TAP OR PRESS ENTER</div>
      <p class="attract" data-tip></p>
      <div class="logo-sub">11 STAGES · ${ALL_QIDS.length} QUESTIONS · ${ALL_FIDS.length} CARDS</div>
    </div>
  </section>`);
  $(".logo", el).addEventListener("pointerdown", () => Perf.tap()); // three taps on the title: the frame-rate readout, for this visit
  const tipEl = $("[data-tip]", el);
  let tipI = Math.floor(Math.random() * Math.max(1, ALL_TIPS.length));
  const showTip = () => {
    if (!ALL_TIPS.length) { tipEl.textContent = "Study content loading…"; return; }
    const tip = ALL_TIPS[tipI++ % ALL_TIPS.length];
    tipEl.innerHTML = `<span><b>STAGE ${tip.ch}</b> · ${esc(tip.t)}</span>`; // (one child: the plate centres it at a fixed height, so nothing above it jumps when a tip is longer)
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
