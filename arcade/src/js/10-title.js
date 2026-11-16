// Attract mode: a synthwave horizon with a striped sun, and the INSERT COIN prompt.
const TITLE_PANO_ROT = { "title-dusk": 1.9, "title-dusk-b": 2.92 }; // (the painted dusk turned so its sun sets behind the striped one; the bright one turned so its sun is hidden by the towers on the left and its red streaks cross the avenue)
class TitleScene extends Scene3D {
  constructor() {
    super({ fov: 62, far: 900, fog: [0x2a0a44, 105, 560] });
    this.speed = 14;
    this.dist = 0;
    if (!this.has3D) return;
    const s = this.scene;
    this.sky = makeSky({ top: 0x030009, mid: 0x170536, horizon: 0xd92aa6, bottom: 0x09031f, glow: 0.75, stars: 1, clouds: 0.8, radius: 860 }); // inside the 900 far plane, beyond the mountains
    s.add(this.sky);
    this.sun = makeNeonSun({ radius: 52, top: 0xffc640, bottom: 0xff2a86, intensity: 0.9, lift: 0.5, stripeTop: 0.9, stripeN: 5.5 }); // (gold at its crown, rose where it meets the skyline)
    this.sun.userData.glow.material.opacity = 0.4; // (a halo, but tight: the city in front of it keeps its edges)
    this.sun.position.set(0, 30, -360);
    s.add(this.sun);
    s.add(makeRidge({ z: -330, width: 900, height: 78, n: 30, top: 0x2a0c52, bottom: 0x16063a, line: 0x35efff, lineK: 1.3 }));
    s.add(makeRidge({ z: -300, width: 760, height: 50, n: 44, top: 0x3c1068, bottom: 0x0c0326, line: 0xff3ad4, lineK: 2.3 }));
    s.add(makeSkyline({ z: -262, width: 300, count: 70, maxH: 34, minH: 5, winK: 0.8 })); // (far windows: small lit squares, not sparks)
    // a nearer, taller layer either side of the sun: three depths of city slide past each other
    const A = clamp(GFX.w / Math.max(1, GFX.h), 0.42, 2.2), mw = 0.6 * A * 240;
    for (const sd of [-1, 1]) { const mid = makeSkyline({ z: -228, width: mw * 1.1, count: 22, maxH: A < 1 ? 46 : 70, minH: 16, lit: 0.42, edge: sd < 0 ? 0xff3ad4 : 0x35efff, winK: 0.95 }); mid.position.x = sd * mw * 0.95; s.add(mid); }
    this.bursts = new Bursts(s);
    this.city = new TitleCity(this);
    this.life = new TitleLife(this);
    // something happens in the sky or the streets every 3 to 6 seconds
    this.director = new EventDirector(this, { min: 3, max: 6 });
    this.skyFlash = 0;
    this.skyKit = new AmbientSky({ host: this, director: this.director, win: () => ({ w: Math.min(150, 0.6 * A * 262 * 0.8), y0: 100, y1: 150, z: -250, s: 1 }), flash: (k) => { this.skyFlash = Math.max(this.skyFlash, k); } });
    this.city.events(this.director);
    this.mirror = new Mirror(0);
    this.floor = makeNeonFloor({ size: 1600, cell: 7, line: 0xff3ad4, lineK: 1.0, base: 0x05011a, mirror: this.mirror, reflect: 0.5, ripple: 0.0016, streak: 0.009, pulse: 1,
      road: 7.7, roadGrid: 0.2, sun: { top: 0xffc640, bottom: 0xff2a86, spread: 0.078, k: 0.56, z: -360, bars: 5.5 } }); // (the carriageway is a wet mirror first and a grid second; the sun lies down it)
    s.add(this.floor);
    s.userData.mirrors = [this.mirror];
    this.shooting = makeShootingStar();
    s.add(this.shooting);
    s.userData.post = { exposure: 1.12, bloom: 0.85, threshold: 1.12, contrast: 1.12, saturation: 1.18, fringe: 0.25, sharpen: 0.1, // (little sharpening: it turned the far windows into crosses)
      rays: { pos: this.sun.position, strength: 0.6, radius: 0.42 }, ao: 0.8, aoRadius: 0.035, shadow: 0, dirt: 0.6, mblur: 1 };
    this.camBase.set(0, 3.4, 12);
    this.lookAt.set(0, 9, -120);
  }
  boost() {
    this.tw.add(1.1, (k) => { this.speed = 14 + k * 160; }, null, Ease.inCubic);
  }
  // The generated dusk, served, once it has arrived (the title never waits for it): a panorama behind the city in
  // place of the drawn sky, faded in over it, then drifting slowly from one dusk to the other. Each is turned so its
  // own sun stands behind the striped one. The haze the city stands in takes the colour of its horizon, and the wet
  // road mirrors it.
  takeSky() {
    const a = Assets.sky("title-dusk-b"), b = Assets.sky("title-dusk"), first = a || b; // (the painted dusk first: storm cloud rimmed in magenta)
    if (!first || !first.map) return;
    this.pano = makePanoSky(first, { gain: 0.8, lift: 0.5, rot: TITLE_PANO_ROT[first.name] || 0, alpha: 0 });
    this.pano.renderOrder = -19;
    this.sky.renderOrder = -21; // (the drawn sky first; the panorama fades in over it)
    this.scene.add(this.pano);
    this.panoA = first; this.panoB = null; this.panoIn = 0;
    // the haze: the colour of the panorama's horizon in front, darkened, half way from the drawn one
    try {
      const c = document.createElement("canvas"), x = c.getContext("2d"), img = first.map.image;
      c.width = 64; c.height = 32;
      x.drawImage(img, 0, 0, 64, 32);
      const u0 = Math.round(((((TITLE_PANO_ROT[first.name] || 0) / (Math.PI * 2) + 0.25) % 1) * 64)), d = x.getImageData(0, 14, 64, 4).data;
      let r = 0, g = 0, bb = 0, n = 0;
      for (let row = 0; row < 4; row++) for (let k = -10; k <= 10; k++) { const i = (row * 64 + ((u0 + k + 64) % 64)) * 4; r += d[i]; g += d[i + 1]; bb += d[i + 2]; n++; }
      this.hazeTo = new THREE.Color(r / n / 255, g / n / 255, bb / n / 255).multiplyScalar(0.3);
      this.hazeFrom = this.scene.fog.color.clone();
    } catch (e) { this.hazeTo = null; }
  }
  update(dt) {
    super.update(dt);
    this.dist += this.speed * dt;
    if (!this.has3D) return;
    if (Assets.on && !this.pano && (Assets.sky("title-dusk") || Assets.sky("title-dusk-b"))) this.takeSky();
    if (this.pano) {
      const P = this.pano.userData;
      this.panoIn = Math.min(1, this.panoIn + dt / 1.6);
      if (!this.panoB) { const o = Assets.sky(this.panoA.name === "title-dusk" ? "title-dusk-b" : "title-dusk"); if (o && o.map) this.panoB = o; }
      const k = this.panoB ? 0.5 - 0.5 * Math.cos((this.t * Math.PI * 2) / 48) : 0; // (one dusk to the other and back, every 48 seconds)
      if (this.panoB) P.blend(this.panoB, k, TITLE_PANO_ROT[this.panoB.name] || 0);
      const bright = (n) => (n === "title-dusk" ? 0.6 : 0.8); // (the bright dusk is held down: its sky must not wash out the striped sun or the logo)
      P.set({ alpha: smoothstep(0, 1, this.panoIn), gain: lerp(bright(this.panoA.name), this.panoB ? bright(this.panoB.name) : 0.8, k) * (1 + this.skyFlash * 1.1) });
      this.sky.visible = this.panoIn < 1;
      if (this.hazeTo) this.scene.fog.color.copy(this.hazeFrom).lerp(this.hazeTo, 0.4 * this.panoIn);
      P.follow(this.camera);
    }
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
    this.scene.userData.post.exposure = 1.12 + 0.1 * (this.life.flash || 0); // lightning lifts the picture a little for a moment (not a wash over the street)
    { // and the logo with it: its face takes the flash too (written only when it changes)
      const f = Math.round(Math.min(1, this.life.flash || 0) * 20) / 20;
      if (f !== this.logoFlash) { this.logoFlash = f; document.documentElement.style.setProperty("--bolt", f); }
    }
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
    // (one child: the plate centres it at a fixed height, so nothing above it jumps when a tip is longer. A tip's
    // own lead-in, "EXAM TIP:" or "DID YOU KNOW?", joins the stage on the heading line: every word is kept.)
    const lead = /^([A-Z][A-Z ']{2,22}[:?])\s+(.*)$/.exec(tip.t);
    tipEl.innerHTML = `<span><b>STAGE ${tip.ch}${lead ? " · " + esc(lead[1]) : ""}</b><i>${esc(lead ? lead[2] : tip.t)}</i></span>`;
  };
  showTip();
  let started = false, woke = false;
  // Served: the title's dusk and the hall's models are asked for while the title is up, and the sound's bytes are
  // fetched (it can only be decoded after a tap). The title shows at once and takes each in as it arrives.
  if (Assets.on) {
    Assets.need("title");
    Assets.prefetch("title");
    Assets.need("hub");
    Assets.prefetch("hubsound");
  }
  // The first tap or key: the sound comes on, the title's music plays and the announcer calls for a coin.
  const wake = () => {
    if (woke || !Assets.on) return;
    woke = true;
    Sound.init();
    Sound.play("title");
    const t0 = performance.now(), p = Assets.need("title");
    Assets.need("hubsound");
    (p || Promise.resolve()).then(() => { if (performance.now() - t0 < 2500) Sound.say("INSERT COIN"); }); // (a call that would come late is not made)
  };
  document.body.classList.add("on-title"); // the sync toast sits below the top row here
  const timer = setInterval(showTip, 6500);
  const start = () => {
    if (started) return;
    started = true;
    wake();
    Sound.init();
    Sound.sfx(Sound.bank.coin_insert ? "coin_insert" : "coin");
    $("[data-credit]", el).textContent = "01";
    $(".insert-coin", el).textContent = "GET READY!";
    scene.boost();
    setTimeout(() => UI.cover(showHub), 900); // the first arcade-floor build happens behind black
  };
  el.addEventListener("pointerdown", wake);
  UI.show({
    el,
    on: (a) => { if (a === "start") start(); },
    key: (e) => { wake(); if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } },
    destroy: () => { clearInterval(timer); document.body.classList.remove("on-title"); },
  });
}
