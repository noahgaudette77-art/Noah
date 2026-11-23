// The WebGL layer: one renderer drawn at a low internal resolution and scaled up
// with nearest-neighbour filtering, which gives the chunky early-90s polygon look.
const GFX = {
  renderer: null,
  ok: false,
  hdr: false, // half-float targets: neon can be brighter than white and bloom like light
  pipe: null,
  w: window.innerWidth,
  h: window.innerHeight,
  t: 0,
  ab: 0, // colour-fringe pulse
  flashAmt: 0, // white flash pulse
  hit: { t: 1, dur: 1, col: [1, 1, 1], inner: 0, outer: 0 }, // coloured hit flash (see hitFlash)
  fever: 0, feverT: 0, feverCol: [1, 0.5, 0.1], // streak aura around the screen (see Hype)
  rip: { x: 0.5, y: 0.5, t: 1, dur: 1, amp: 0 }, // a shockwave bending the picture (see ripple)
  punch: 0, // impact zoom: the picture jumps toward you for a moment
  speedBlur: 0, // radial blur from speed; scenes set it each frame
  heat: { x: 0.5, y: 0.5, r: 0.1, a: 0 }, // heat haze behind an exhaust (see heatAt)
  keep: { x: 0.5, y: 0.5, rx: 0.1, ry: 0.1, a: 0 }, // the subject of the shot: the speed streak and the colour split leave it sharp (see keepAt)
  gl: { a: 0, t: 1, dur: 1 }, // a glitch: bands of the picture slip sideways (see glitch)
  // Every effect can be switched off (Setup > Effects). calm: reduced effects, and
  // also set while a question is on screen so the answers stay the brightest thing.
  opt: { bloom: true, scan: true, ca: true, vignette: true, blur: true, grain: true, beams: true, wet: true, shadows: true, shimmer: true, lens: true },
  calm: false,
  flashAt: -9, hitAt: -9,
  danger: 0, dangerT: 0, // low health: a red vignette that beats (see setDanger)
  bloomKick: 0, // a blow's bloom: the glow of the whole picture swells for a moment (see bloomPulse)
  // Setup: the effect switches and Reduced effects.
  applySettings() {
    const s = Store.settings;
    s.fx = Object.assign({ bloom: true, scan: true, ca: true, vignette: true, blur: true, grain: true, beams: true, wet: true, shadows: true, shimmer: true, lens: true, dof: false, ao: true, curve: false }, s.fx || {});
    // (2026-11-23, the owner: as crisp as it can be, no visible blur. Depth of field, which softens what is behind the
    // subject on purpose, starts off, once, for a save made before; it and the glass's bend are Setup > Effects switches.
    // The mark is kept with the switches, so switches synced from an older copy are brought along too, and goes with the
    // next save: saving here would make this device's settings look newer than a copy synced from another.)
    if (!(s.fx.v >= 2)) { s.fx.v = 2; s.fx.dof = false; }
    this.opt = s.fx;
    this.calm = !!s.calm;
    if (typeof document !== "undefined") document.documentElement.classList.toggle("calm", this.calm); // (Setup's Reduced effects, for what the page's own styles move: see .insert-coin)
  },
  // ---- quality tiers (2026-11-23, the owner's: a MAC tier, a PHONE tier and a SAFE one, chosen by the device, with
  // Setup's override). MAC draws everything: the screen's own Retina pixels (twice the page's), edges smoothed by 4x
  // multisampling, every effect. PHONE: at most 2x (a 3x phone screen is drawn at 2x: the eye cannot tell, the chip
  // can), 2x multisampling, the bloom from half size, no ambient shade, depth of field, motion blur or lens streaks, and
  // fewer particles. SAFE, for a weak or a throttled device: 1.5x, 2x multisampling, the fewest passes. LIGHTEST is the
  // governor's last step, never Setup's: 1.25x, and FXAA (one cheap pass) in place of multisampling.
  // No tier draws the lens's resting fringe (a pixel's colour split toward the corners: a soft edge for an effect the
  // eye cannot find; a hit still parts the colours), and none draws larger than the screen's own pixels: the page's
  // text, menus and HUD are its own, drawn by the browser over the picture at the screen's full sharpness.
  TIERS: [
    { name: "MAC", pr: 2, samples: 4, ao: true, dof: true, mblur: true, lens: true, rays: true, levels: 7, mirror: 0.6, extras: true, sharpen: true, fringe: false, fx: 1 },
    { name: "PHONE", pr: 2, samples: 2, ao: false, dof: false, mblur: false, lens: false, rays: true, levels: 6, mirror: 0.45, extras: true, sharpen: true, fringe: false, fx: 0.8 },
    { name: "SAFE", pr: 1.5, samples: 2, ao: false, dof: false, mblur: false, lens: false, rays: false, levels: 5, mirror: 0, extras: false, sharpen: false, fringe: false, fx: 0.6 },
    { name: "LIGHTEST", pr: 1.25, samples: 0, ao: false, dof: false, mblur: false, lens: false, rays: false, levels: 4, mirror: 0, extras: false, sharpen: false, fringe: false, fx: 0.45 },
  ],
  // On a phone (Assets.phone) each tier is lighter still (the owner, 2026-11-17: the shared render cost first): no
  // floor mirror at any tier (it drew the whole scene a second time), never more than 2x multisampling (and at MAC no
  // lens streaks, six bloom levels), and at PHONE, where a phone starts, no god rays, no contact shadows, four bloom
  // levels, and fewer particles still.
  PHONE: [
    { samples: 2, mirror: 0, lens: false, levels: 6 },
    { mirror: 0, rays: false, shadows: false, levels: 4, fx: 0.7 },
    { mirror: 0, shadows: false },
    { mirror: 0, shadows: false },
  ],
  tier: 0,
  auto: true, // the tier follows the frame rate (Setup > Graphics: AUTO)
  extras: true, // background figures and decorative extras (the tier's; scenes check it)
  fxScale: 1, // how many particles an effect throws (the tier's; effects may scale by it)
  // the effects as drawn: the player's own switches, less what the tier leaves out
  eopt() {
    const T = this.TIERS[this.tier], o = this.opt;
    return Object.assign({}, o, { ao: o.ao !== false && T.ao, dof: o.dof !== false && T.dof, mblur: T.mblur, lens: o.lens && T.lens, beams: o.beams && T.rays, wet: o.wet && T.mirror > 0, sharpen: T.sharpen, shadows: o.shadows !== false && T.shadows !== false, fringe: T.fringe !== false });
  },
  // how many lights the current scene has on (for the readout: each one is reckoned for every lit pixel)
  lightCount() {
    const sc = Scenes.cur && Scenes.cur.scene;
    if (!sc) return 0;
    let n = 0; sc.traverseVisible((o) => { if (o.isLight && !o.isAmbientLight && !o.isHemisphereLight && o.layers.mask !== (1 << LIGHT_LAYER)) n++; }); // (the lights drawn: a screen's own lights under a budget are not)
    return n;
  },
  setTier(n, why) {
    n = Math.max(0, Math.min(this.TIERS.length - 1, n | 0));
    if (n === this.tier && this._tierSet) return;
    this._tierSet = true;
    const T = this.TIERS[n];
    this.tier = n; this.extras = T.extras; this.fxScale = T.fx;
    document.body.classList.toggle("lite", n >= 1); // (no frosted glass over the live picture below MAC: see style.css, body.lite)
    if (this.ok && this.pipe) { this.pipe.setSamples(T.samples); this.pipe.setMirror(T.mirror); this.resize(); }
    this.perf.changedAt = performance.now(); this.perf.why = why || "";
    if (typeof Scenes !== "undefined" && Scenes.cur && Scenes.cur.onTier) { try { Scenes.cur.onTier(n); } catch (e) { /* a scene's own response to the tier */ } }
  },
  // Setup > Graphics: "auto" lets the frame rate choose; a fixed tier stays put
  // (the saved values keep their old names: high is MAC, medium PHONE, low SAFE)
  setQuality(q) {
    const fixed = { high: 0, medium: 1, low: 2, lowest: 3 }[q], P = this.perf;
    this.auto = fixed === undefined;
    P.failed = {}; P.eased = {}; P.easeNo = {}; P.easing = null; P.capped = false; P.preCap = -1; P.lockFrom = -1; P.testing = false; P.okSince = 0; P.slowSince = 0; P.downRun = 0; P.why = "setup";
    if (this.auto && P.ladder) { P.start = this.startRung(); this.setRung(P.start, "setup"); return; }
    const lights = this.lightCap !== 99;
    this.scale = 1; this.lightCap = 99;
    if (lights) this.lightsReset();
    if (fixed === this.tier) this.resize();
    this.setTier(fixed, "setup");
  },
  // ---- the frame rate, watched (Setup > Graphics: AUTO) by a governor (the owner, 2026-11-22 and 2026-11-23: a steady
  // 60 FPS comes before any one effect, on the phone and through a long session on the Mac). It moves the picture along
  // a ladder of steps, sharpest first: the size the scene is drawn at goes first (on a high-density screen 2x, then
  // 1.9x, 1.8x and on to 1.5x the page's pixels, about a tenth of the pixels a step: the page's own text stays sharp),
  // then the effects (a tier down: PHONE, SAFE, LIGHTEST; no step down draws more pixels than the one above it), then
  // the lights (the screen's point lights cut to two, then one: the one step that costs a moment, its shaders made
  // again). A desktop's ladder starts at MAC, a phone's and a tablet's at PHONE, and AUTO never climbs above where it
  // starts (the rest is Setup's).
  // A step down when frames have run under 55 a second (or kept catching: a tenth of them over 25 ms) through a second
  // of its looks, each look the last two seconds; frames still slow at the next look take two of a tier's sizes at
  // once, then three (the effects and the lights only ever go a step at a time). Heat: a long session's frames may creep
  // up (a fanless laptop slows its chip as it warms). One frame in fifty running late through ten seconds, late for a
  // reason the main thread did not cause, eases the drawing size one small step before it becomes a stutter: only the
  // size, within the tier. Each ease is judged from its own first full ten seconds: no help (the late frames did not
  // fall by three in ten), and it steps back and does not ease from there for five minutes, then ten, then twenty (what
  // a smaller picture does not help is left alone); help, and it may ease again later from there. A step eased from is climbed back after half a
  // minute steady with no more than one late frame in a hundred, a minute the second time, never after a third. Otherwise a step up after eight steady
  // seconds (a step that runs late again at once is tried less often, then not at all). What a moment's work costs is
  // not held against the picture: a frame that made shaders or sent new pictures to the chip (a model arriving), and the
  // one after it, are left out, and so are the first seconds of a new screen, a new step, or the page come back into view.
  // The device's own cap: iOS holds a page at 30 frames a second in Low Power Mode (and a phone grown hot may). Blank
  // frames timed at the start that come every 33 ms are that cap, and a rate held at exactly 30 through a real cut (a
  // tier down and 60% of the pixels or fewer) is it too (a load just over a frame lifts off 30 with less). Held at 30, a
  // phone's picture goes to SAFE at once rather than fight it (the battery is what the mode is saving, and only 30
  // frames are shown; a computer's holds the step that held 30: see capFloor), the readout names it, frames are judged
  // against 30's own frame (a step down if they still catch), a step down is tried now and then in case the 30 was a
  // load after all, and once frames run well under 30's (the mode switched off) the picture goes back to the step it had.
  // Setup's fixed tiers stay put; Reduced effects is its own switch. (Automated browsers keep where they start.)
  scale: 1, // the drawing size, a share of the tier's (see outPR)
  lightCap: 99, // the most point lights a screen's budget may draw (see lightsFor)
  perf: {
    ring: new Float32Array(720), at: new Float64Array(720), cpu: new Float32Array(720), busy: new Uint8Array(720), n: 0, i: 0, skip: 0, wp: -1, wt: -1,
    changedAt: 0, shownAt: -1e9, sceneSeen: -1, okSince: 0, slowSince: 0, downRun: 0, failed: {}, eased: {}, easeNo: {}, easing: null, upAt: -1e9, why: "", fps: 0, cpuMed: 0, rung: 0, start: 0, ladder: null, evalAt: 0,
    lockFrom: -1, capped: false, capRung: 0, capTop: 0, preCap: -1, testing: false, testAt: 0, testGap: 60000, off: false,
  },
  FINE: [1, 0.95, 0.9, 0.85, 0.8, 0.75], // (the first tier's sizes on a high-density screen: 2x, 1.9x, 1.8x, 1.7x, 1.6x, 1.5x)
  // the steps, sharpest first: { tier, scale, lights }. A step down never draws more pixels than the one above it: a
  // tier whose own size is larger than the last step's is drawn at the last step's.
  makeLadder() {
    const L = [], T = this.TIERS, last = T.length - 1, first = Assets.phone || this.small ? 1 : 0, dpr = window.devicePixelRatio || 1, hi = dpr >= 1.5;
    let cur = Infinity;
    for (let t = first; t <= last; t++) {
      const own = Math.min(dpr, T[t].pr), scales = t === first && hi ? this.FINE : t === last ? [1, 0.85] : [1];
      for (const sc of scales) { const k = Math.min(sc, cur / own); L.push({ tier: t, scale: +k.toFixed(4), lights: 99 }); cur = own * k; }
    }
    const end = L[L.length - 1].scale;
    L.push({ tier: last, scale: end, lights: 2 }, { tier: last, scale: end, lights: 1 });
    return L;
  },
  // the step AUTO starts from: the ladder's first (a desktop's MAC at the screen's own pixels, a phone's PHONE at 2x)
  startRung() { return 0; },
  // the first step of the SAFE tier (where the device's 30 fps cap puts the picture)
  safeRung() { const L = this.perf.ladder || [], i = L.findIndex((R) => R.tier >= 2); return i < 0 ? Math.max(0, L.length - 1) : i; },
  // a step's pixels, for the cap's test (the scene's own drawing size, squared)
  rungPixels(i) { const R = this.perf.ladder[i], px = Math.min(window.devicePixelRatio || 1, this.TIERS[R.tier].pr) * R.scale; return px * px; },
  setRung(i, why) {
    const P = this.perf, L = P.ladder;
    if (!L) return;
    i = Math.max(0, Math.min(L.length - 1, i));
    const R = L[i], lights = R.lights !== this.lightCap;
    P.rung = i; this.scale = R.scale; this.lightCap = R.lights; P.slowSince = 0; P.okSince = 0;
    if (lights) this.lightsReset();
    if (R.tier !== this.tier) this.setTier(R.tier, why); else { this.resize(); P.changedAt = performance.now(); P.why = why || ""; }
  },
  // held at the device's 30 (rung: the sharpest step that held it): the picture to the cap's floor (capFloor), and the
  // step it had kept for when the cap lifts
  capHold(rung, why) {
    const P = this.perf;
    if (!P.capped) P.preCap = rung;
    P.capped = true; P.lockFrom = -1; P.testing = false; P.downRun = 0; P.testAt = performance.now(); P.testGap = 60000;
    P.capTop = P.capRung = this.capFloor(rung); // (never climbed above while held)
    this.setRung(P.capRung, why);
  },
  // let go of the cap: back to the step it had (back), or left where it is (a step down showed the 30 was a load)
  capRelease(why, back) {
    const P = this.perf, to = P.preCap;
    P.capped = false; P.preCap = -1; P.lockFrom = -1; P.testing = false; P.slowSince = 0; P.okSince = 0; P.downRun = 0;
    if (back && to >= 0 && to < P.rung) { P.upAt = performance.now(); this.setRung(to, why); return; }
    P.changedAt = performance.now(); P.why = why;
  },
  // the blank frames timed at the start (measureScreen): every 33 ms, steadily, is the device's cap from the start
  screenProbed(d) {
    if (d.length < 8 || !this.auto || !this.perf.ladder || navigator.webdriver) return;
    const m = d[d.length >> 1], lo = d[Math.floor(d.length * 0.15)], hi = d[Math.floor(d.length * 0.85)];
    if (m > 31 && m < 36 && lo > 29 && hi < 38) this.capHold(this.perf.rung, "held at 30 fps from the start: the device's cap (low power mode?)");
  },
  // the page back in view (or a frame that took a second or more): its first seconds are not looked at, its timers
  // start afresh, and a held cap is tested soon (Low Power Mode may have been switched off meanwhile)
  perfAfresh() {
    const P = this.perf, now = performance.now();
    P.shownAt = now; P.slowSince = 0; P.okSince = 0;
    if (P.capped) { P.testAt = now - P.testGap + 2500; P.testGap = 60000; }
  },
  // the frames since `from`, over the last span (ms) at most: their times and main-thread times sorted (a moment's
  // work left out, unless all), and the time they cover
  recent(span, from, all) {
    const P = this.perf, w = [], cpu = [], N = P.ring.length;
    let t = 0;
    for (let k = 1; k <= P.n && t < span; k++) { const j = (P.i - k + N) % N; if (from !== undefined && P.at[j] <= from) break; t += P.ring[j]; if (all || !P.busy[j]) { w.push(P.ring[j]); cpu.push(P.cpu[j]); } }
    w.sort((a, b) => a - b); cpu.sort((a, b) => a - b);
    return { w, cpu, covered: t };
  },
  // the last ten seconds' frames (from the last change, screen or return, at most): how many, and how many ran late
  // (over a frame and a half) while the main thread's own share of them was small (what the main thread does, a smaller
  // picture would not help)
  late10(F, now, ms = 10000) {
    const P = this.perf, N = P.ring.length, from = Math.max(P.changedAt + 500, (this.sceneAt || 0) + 1500, P.shownAt + 1500, now - ms);
    let n = 0, late = 0;
    for (let k = 1; k <= P.n; k++) { const j = (P.i - k + N) % N; if (P.at[j] <= from) break; if (P.busy[j]) continue; n++; if (P.ring[j] > F * 1.5 && P.cpu[j] < F * 0.6) late++; }
    return { n, late, rate: n ? late / n : 0, span: now - from };
  },
  // a step the device's 30 fps cap holds the picture at: on a phone or a tablet SAFE, or the sharpest step that held 30
  // if it is lighter (iOS Low Power Mode: the battery is what it saves); on a computer the step that held 30 itself (a
  // screen that runs at 30, or a laptop's own power saving, gains nothing from a lighter picture)
  capFloor(i) { return Assets.phone || this.small ? Math.max(i, this.safeRung()) : i; },
  perfTick(ms, cpu) {
    const P = this.perf, now = performance.now(), N = P.ring.length, dpr = window.devicePixelRatio || 1;
    if (dpr !== this._dpr && this._dpr) { this._dpr = dpr; this.dprChanged(); } // (moved to another screen, or the page zoomed: a property read a frame, where a media query's event is not sent everywhere)
    // a frame that made shaders or sent new pictures to the chip: its time is the moment's (and the next frame's too)
    if (this.ok) { const I = this.renderer.info, wp = I.programs ? I.programs.length : 0, wt = I.memory.textures; if (wp !== P.wp || wt !== P.wt) { if (P.wp >= 0) P.skip = 2; P.wp = wp; P.wt = wt; } }
    if (ms > 0 && ms < 1000) { P.ring[P.i] = ms; P.at[P.i] = now; P.cpu[P.i] = cpu || 0; P.busy[P.i] = P.skip > 0 ? 1 : 0; P.i = (P.i + 1) % N; P.n = Math.min(N, P.n + 1); } // (every frame, whatever the setting: the readout reads them too)
    else if (ms >= 1000) this.perfAfresh();
    if (P.skip > 0) P.skip--;
    if ((this.sceneAt || 0) !== P.sceneSeen) { P.sceneSeen = this.sceneAt || 0; P.slowSince = 0; P.okSince = 0; } // (a new screen: its own frames decide, from its own start)
    if (!this.auto || P.off || !P.ladder || navigator.webdriver || document.hidden) return;
    if (now - P.changedAt < 2500 || now - (this.sceneAt || 0) < 2000 || now - P.shownAt < 2000 || now - P.evalAt < 500) return;
    P.evalAt = now;
    const r = this.recent(2000, Math.max(P.changedAt + 500, (this.sceneAt || 0) + 1500, P.shownAt + 1500)), w = r.w;
    if (r.covered < 1500 || w.length < 4) return; // (a second and a half of frames at least: at 10 a second, 15)
    const L = P.ladder, F = P.capped ? 33.33 : this.screenMs || 16.67; // (a frame of the screen's: 60 Hz, or 50 if measured so; held at 30, 30's)
    const q = (f) => w[Math.min(w.length - 1, Math.floor(f * w.length))], med = q(0.5), p10 = q(0.1), p90 = q(0.9), long = w.filter((x) => x > F * 1.5).length / w.length;
    P.fps = 1000 / med; P.cpuMed = r.cpu.length ? r.cpu[r.cpu.length >> 1] : 0;
    if (P.capped) {
      if (med < 25) { this.capRelease(P.testing ? "a step down lifted the 30 fps hold: it was the load" : "the 30 fps cap lifted", !P.testing); return; } // (frames well under 30's)
      if (P.testing) { P.testing = false; P.testAt = now; P.testGap = Math.min(P.testGap * 2, 480000); this.setRung(P.capRung, "held at 30 fps: the device's cap (low power mode?)"); return; } // (a step down ran no faster: held as it was; tested again later)
      if (P.rung === P.capRung && P.rung < L.length - 1 && now - P.testAt > P.testGap && med < F * 1.09) { P.testing = true; this.setRung(P.rung + 1, "testing the 30 fps hold"); return; } // (a load just over a frame would lift off 30 with it)
    } else {
      // held at exactly 30: a cap, or a load just over a frame, which a real cut lifts
      if (!(med > 31 && med < 36 && p10 > 29 && p90 < 38)) P.lockFrom = -1;
      else {
        if (P.lockFrom < 0) P.lockFrom = P.rung;
        if (L[P.rung].tier > L[P.lockFrom].tier && this.rungPixels(P.rung) <= 0.6 * this.rungPixels(P.lockFrom)) { this.capHold(P.lockFrom, "held at 30 fps: the device's cap (low power mode?)"); return; }
      }
    }
    const slow = med > F * 1.09 || long > 0.1;
    if (slow) {
      P.okSince = 0;
      if (!P.slowSince) P.slowSince = now;
      if (now - P.slowSince < 1000 || P.rung >= L.length - 1) return; // (late through a second of looks, not one)
      if (now - P.upAt < 8000) P.failed[P.rung] = (P.failed[P.rung] || 0) + 1; // (a step just climbed to, dropped again)
      // how far: one step; still slow at the next look, two of the tier's sizes, then three (a big load is met in
      // seconds, a small one by a tenth of the pixels). Only ever sizes at once: the effects and the lights a step at a time.
      const far = Math.min(3, 1 + P.downRun), R0 = L[P.rung];
      let j = P.rung + 1;
      for (let k = 1; k < far && j + 1 < L.length && L[j + 1].tier === R0.tier && L[j + 1].lights === R0.lights; k++) j++;
      P.downRun++;
      this.setRung(j, (long > 0.1 && med <= F * 1.09 ? "frames catching" : "slow frames") + " (" + Math.round(1000 / med) + " fps)");
      if (P.capped) P.capRung = P.rung;
      return;
    }
    P.slowSince = 0; P.downRun = 0;
    // heat: frames creeping up over ten seconds (one in fifty late), eased one small step before they become a stutter:
    // the drawing size only, within the tier (never its effects or its lights). Each ease is judged once, from its own
    // first full ten seconds (a new screen in between: looked at once ten seconds are in): if the late frames did not
    // fall by three in ten against the rate before it (the last ten seconds', or the last five's if higher: late frames
    // on the rise), and by a few frames at least (what a smaller picture does not help: the main thread's pauses, the
    // browser's own), it steps back and does not ease from there for five minutes (ten, then twenty, if it happens
    // again); if they fell, it stays, and may ease again from the new step if they creep up again
    const E = P.easing;
    if (E && now - E.at >= 12000) {
      const s10 = this.late10(F, now);
      if (P.rung !== E.to || now - E.at > 40000) P.easing = null; // (another step since, or no full look in time: no verdict)
      else if (s10.span >= 9000 && s10.n >= 300) {
        P.easing = null;
        if (s10.rate >= 0.01 && !(s10.rate <= E.rate * 0.7 && (E.rate - s10.rate) * s10.n >= 3)) {
          const no = P.easeNo[E.from]; P.easeNo[E.from] = { at: now, wait: no ? Math.min(1200000, no.wait * 2) : 300000 }; P.eased[E.from] = Math.max(0, (P.eased[E.from] || 1) - 1); // (five minutes, then ten, then twenty: each try and undo costs a moment)
          this.setRung(E.from, "easing did not help: back");
          return;
        }
      }
    }
    const no = P.easeNo[P.rung];
    if (!P.capped && !P.easing && !(no && now - no.at < no.wait) && P.rung < L.length - 1 && L[P.rung + 1].tier === L[P.rung].tier && L[P.rung + 1].lights === L[P.rung].lights) {
      const s10 = this.late10(F, now);
      if (s10.span >= 9000 && s10.n >= 300 && s10.late >= Math.max(6, s10.n * 0.02)) {
        const s5 = this.late10(F, now, 5000);
        P.easing = { from: P.rung, to: P.rung + 1, at: now, rate: Math.max(s10.rate, s5.n >= 150 ? s5.rate : 0) };
        P.eased[P.rung] = (P.eased[P.rung] || 0) + 1;
        this.setRung(P.rung + 1, "easing: frames creeping up (heat?)");
        return;
      }
    }
    if (p90 < F * 1.044 && w[w.length - 1] < F * 2.04) {
      if (!P.okSince) P.okSince = now;
      // (a step eased from: climbed back after half a minute steady, a minute the second time, never after a third,
      // and only with no more than one late frame in a hundred through ten seconds)
      const up = P.rung - 1, f = P.failed[up] || 0, e = P.eased[up] || 0, wait = e ? 30000 * e : 8000 * (1 + 2 * f);
      if (up >= 0 && f < 3 && e < 3 && !P.easing && !(P.capped && up < P.capTop) && now - P.okSince > wait && (!e || this.late10(F, now).rate < 0.01)) { P.upAt = now; this.setRung(up, "steady frames"); if (P.capped) P.capRung = P.rung; }
    } else P.okSince = 0;
  },
  // the governor's state, for the readout
  govLabel() {
    const P = this.perf;
    if (!this.auto) return "FIXED (SETUP)";
    if (P.capped) return "HELD AT 30 FPS · " + (P.cpuMed > 20 ? "MAIN THREAD " + Math.round(P.cpuMed) + " MS A FRAME" : Assets.phone || this.small ? "LOW POWER MODE? SAFE TIER" : "LOW POWER MODE OR A 30 HZ SCREEN?") + (P.testing ? " (TESTING)" : "");
    return "AUTO" + (P.ladder ? " · STEP " + (P.rung + 1) + "/" + P.ladder.length : "");
  },
  // the window moved to a screen of another density (a Retina laptop's own and an external monitor's), or the page
  // zoomed: the ladder made again for it, AUTO kept at the same tier and lights at the nearest size, and the picture
  // drawn at the new pixels at once (never shown stretched, or drawn at the old screen's density)
  dprChanged() {
    const P = this.perf;
    if (P.ladder) {
      const old = P.ladder, L = (P.ladder = this.makeLadder());
      // (a step of the old ladder: the new one's of the same tier and lights, at the nearest size)
      const near = (i) => { const R = old[Math.max(0, Math.min(old.length - 1, i))]; let best = 0, d = Infinity; L.forEach((S, k) => { const e = Math.abs(S.tier - R.tier) * 100 + Math.abs(S.lights - R.lights) + Math.abs(S.scale - R.scale); if (e < d) { d = e; best = k; } }); return best; };
      const at = P.capped && P.testing ? P.capRung : P.rung; // (a test of the 30 fps hold under way: called off, the hold's own step kept)
      P.failed = {}; P.eased = {}; P.easeNo = {}; P.easing = null; P.lockFrom = -1; P.testing = false;
      if (P.preCap >= 0) P.preCap = near(P.preCap);
      if (P.capped) { P.capTop = this.capFloor(near(P.capTop)); P.capRung = Math.max(near(at), P.capTop); }
      if (this.auto) {
        const r = P.capped ? P.capRung : near(at), R = L[r];
        P.rung = r; this.scale = R.scale;
        if (R.lights !== this.lightCap) { this.lightCap = R.lights; this.lightsReset(); }
        if (R.tier !== this.tier) this.setTier(R.tier, "a screen of another density");
      }
    }
    this.perfAfresh();
    this.resize();
  },
  freeze: 0, // hit-stop seconds remaining
  probe: null, // debug: called after each render pass (see the perf tools)
  init() {
    if (window.THREE) {
      try {
        // alpha: false: the frame is always opaque, so the browser can drop it on screen
        // without blending it over the page behind it, on every frame.
        this.renderer = new THREE.WebGLRenderer({ canvas: $("#gl"), alpha: false, antialias: false, powerPreference: "high-performance", stencil: false });
        this.renderer.setClearColor(0x090320, 1);
        this.ok = true;
      } catch (e) {
        this.ok = false;
      }
    }
    if (!this.ok) {
      document.body.classList.add("no-gl");
      this.resize();
      return;
    }
    const r = this.renderer;
    // every texture is filtered as finely as the graphics chip can, so signs, floors and walls stay sharp at a slant
    // (on a phone 4 times over, not 16: a floor or a road seen low cost up to four times the reads at 16, for a
    // difference a phone's screen does not show)
    try { THREE.Texture.DEFAULT_ANISOTROPY = Math.max(1, Math.min(Assets.phone ? 4 : 16, r.capabilities.getMaxAnisotropy())); } catch (e) { /* default */ }
    // A new shader is checked for errors only when the page is opened for tests (#debug). Each check makes the page
    // wait for the graphics chip to finish compiling (Safari asks its graphics process and waits for the answer), so
    // every new material stalled a frame twice over; a shader that will not compile is no more drawn with the check.
    if (!/debug/.test(location.hash)) r.debug.checkShaderErrors = false;
    const ext = (n) => { try { return !!r.extensions.has(n); } catch (e) { return false; } };
    this.hdr = r.capabilities.isWebGL2 ? ext("EXT_color_buffer_float") || ext("EXT_color_buffer_half_float") : ext("OES_texture_half_float") && ext("EXT_color_buffer_half_float");
    this.small = Math.min(screen.width || 9999, screen.height || 9999) < 700 || matchMedia("(pointer: coarse)").matches;
    if (Assets.phone) this.TIERS = this.TIERS.map((T, i) => Object.assign({}, T, this.PHONE[i] || {})); // (a phone's lighter tiers: see PHONE)
    // the first tier: Setup's choice, or (auto) MAC on a desktop and PHONE on a phone or a tablet, from where the frame rate leads
    const q = (Store.settings && Store.settings.quality) || "auto", fixed = { high: 0, medium: 1, low: 2, lowest: 3 }[q];
    this.auto = fixed === undefined;
    this.perf.ladder = this.makeLadder();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) this.perfAfresh(); }); // (back in view: see perfAfresh)
    let t0 = fixed !== undefined ? fixed : navigator.webdriver ? 0 : this.small ? 1 : 0;
    if (this.auto && !navigator.webdriver) { const P = this.perf, R = P.ladder[(P.rung = P.start = this.startRung())]; t0 = R.tier; this.scale = R.scale; this.lightCap = R.lights; } // (AUTO: from its first step)
    this.tier = t0; this.extras = this.TIERS[t0].extras; this.fxScale = this.TIERS[t0].fx;
    document.body.classList.toggle("lite", t0 >= 1);
    this.pipe = makePipeline(r, this.hdr, this.TIERS[t0].samples);
    this.pipe.setMirror(this.TIERS[t0].mirror);
    this._tierSet = true;
    this.resize();
    // a window resized: the picture and its passes made again at once (a browser sends one a frame at most, before the
    // frame's drawing: the frame is drawn at the new size, never stretched; made again later, it would be shown blank)
    window.addEventListener("resize", () => this.resize());
    this._dpr = window.devicePixelRatio || 1; // (the screen's density, looked at every frame: see perfTick and dprChanged)
  },
  look: "hd",
  // The scene is drawn at the screen's own pixels (its full device pixel ratio), limited
  // only by the largest texture the graphics chip can make.
  // A scene may ask to be drawn larger than that and brought down in the final pass (its post.ssaa, up to 2): thin
  // bright edges and seams of light come out as smooth lines that do not shimmer. (As large as asked, within what a
  // graphics chip can be trusted to hold.) No scene that does not ask is drawn any differently.
  scenePR() {
    const lim = this.ok ? this.renderer.capabilities.maxTextureSize / Math.max(this.w, this.h, 1) : 8, out = this.outPR();
    const post = Scenes.cur && Scenes.cur.scene && Scenes.cur.scene.userData.post, want = post && post.ssaa > 1 ? Math.min(2, post.ssaa) : 1;
    // drawing larger than the screen smooths thin edges, but its cost multiplies: only at the MAC tier, only on a
    // screen of less than 1.5 device pixels per page pixel (a high-density screen is smooth already), and never past
    // four million pixels
    if (want <= 1 || this.tier > 0 || out >= 1.5 || this.scale < 1) return out; // (nor while AUTO is drawing smaller)
    return Math.min(lim, out * Math.max(1, Math.min(want, Math.sqrt(4e6 / Math.max(1, this.w * this.h * out * out)))));
  },
  outPR() {
    const lim = this.ok ? this.renderer.capabilities.maxTextureSize / Math.max(this.w, this.h, 1) : 8;
    return Math.max(0.35, Math.min(window.devicePixelRatio || 1, lim, this.TIERS[this.tier].pr) * (this.scale || 1)); // (AUTO's scale: a share of what the tier would draw, on any screen)
  },
  ss: 1, // how many times larger than the screen the scene is drawn (1 unless the scene asked: see scenePR)
  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    if (this.ok) {
      this.renderer.setPixelRatio(this.outPR());
      this.renderer.setSize(this.w, this.h, false);
      const pr = (this._pr = this.scenePR());
      this.ss = pr / this.outPR();
      this.pipe.resize(Math.max(2, Math.round(this.w * pr)), Math.max(2, Math.round(this.h * pr)));
      $("#gl").classList.add("post");
    }
    Scenes.resize();
  },
  // a new scene may want a different resolution (see scenePR)
  refit() { if (this.ok && Math.abs(this.scenePR() - (this._pr || 0)) > 1e-3) this.resize(); },
  setCRT() { /* the glass is a pipeline uniform now; kept for the settings screen */ },
  render(scene, camera, dt) {
    if (scene.userData.lightBudget) this.lightsFor(scene); // (the strongest of the screen's lights into its budget: see LightPool)
    this.t += dt;
    this.ab *= Math.pow(0.015, dt);
    this.flashAmt *= Math.pow(0.003, dt);
    const hk = Math.min(1, (this.hit.t += dt) / this.hit.dur), hitAmt = 1 - hk * (2 - hk); // ease-out fade
    this.fever += (this.feverT - this.fever) * Math.min(1, dt * (this.feverT > this.fever ? 5 : 2.5));
    this.punch *= Math.pow(0.0006, dt);
    const rp = this.rip, rk = Math.min(1, (rp.t += dt) / rp.dur);
    const gk = Math.min(1, (this.gl.t += dt) / this.gl.dur);
    this.danger += (this.dangerT - this.danger) * Math.min(1, dt * 3);
    this.bloomKick *= Math.pow(0.0015, dt);
    // Object matrices are updated once per frame here, not again in every pass that
    // draws the scene (reflections draw it twice).
    scene.updateMatrixWorld();
    scene.autoUpdate = false;
    const mirrors = scene.userData.mirrors;
    if (this.probe) this.probe("start");
    if (mirrors) for (const m of mirrors) { if (!this.opt.wet || !(this.TIERS[this.tier].mirror > 0) || scene.userData.mirrorOff) m.blank(this.renderer); else m.render(this.renderer, scene, camera, this.pipe.mirrorSize); }
    if (this.probe && mirrors) this.probe("mirror");
    this.pipe.render(scene, camera, {
      t: this.t,
      ab: this.opt.ca && this.ab > 0.05 ? 5.5 * Math.tanh(this.ab / 5.5) : 0, // the fringe of a hit, eased off at the top so the hardest blow splits the picture without tearing it in three (the lens's own fringe, toward the corners, is the pipeline's)
      dt: dt,
      flash: this.flashAmt,
      hit: this.hit,
      hitAmt: hitAmt,
      fever: this.fever < 0.004 ? 0 : this.fever,
      feverCol: this.feverCol,
      rip: rp, ripR: rk * 0.62, ripAmp: rk < 1 ? rp.amp * (1 - rk) * (1 - rk) : 0,
      punch: this.punch < 0.0006 || this.calm ? 0 : this.punch,
      zoomBlur: !this.opt.blur || this.calm ? 0 : Math.min(0.72, this.speedBlur + this.punch * 9), // (streaks, not a smear: the subject stays readable through a boost or a blow)
      opt: this.eopt(), calm: this.calm, levels: this.TIERS[this.tier].levels,
      heat: this.heat,
      keep: this.keep,
      glitch: gk < 1 ? this.gl.a * (1 - gk) : 0,
      danger: this.danger < 0.004 ? 0 : this.danger,
      bloomKick: this.bloomKick < 0.004 ? 0 : this.bloomKick,
      glass: Store.settings.crt ? 1 : 0,
      look: this.look,
      post: scene.userData.post || {},
    });
    if (scene.userData.edge) scene.userData.edge(this.renderer); // (a red frame round the band, over the finished picture: see BandEdge)
    if (scene.userData.overlay) scene.userData.overlay(this.renderer); // (a scene's own last word, over the finished picture: what must stay sharp through every effect)
    this.heat.a = 0; // a scene asks for its heat haze again every frame
    this.keep.a = 0; // and names its subject again
  },
  // Juice: colour fringing + white flash, and a short freeze-frame.
  // Streak aura: rays of light around the screen edge in the streak's colour.
  setFever(amount, rgb) {
    this.feverT = REDUCED_MOTION || this.calm ? amount * 0.5 : amount;
    if (rgb) this.feverCol = rgb;
  },
  // A wrong answer glitches the picture for a moment. amt 0..1.
  glitch(amt = 1, dur = 0.4) {
    if (REDUCED_MOTION || this.calm || !this.opt.ca) return;
    this.gl.a = amt; this.gl.t = 0; this.gl.dur = dur;
  },
  // Heat haze around a point in the scene (an exhaust, a vent): the final pass makes
  // the picture swim there this frame. radius in world units, amt 0..1.
  heatAt(camera, pos, radius, amt) {
    if (!camera) return;
    const v = this._heatV || (this._heatV = new THREE.Vector3());
    v.copy(pos).project(camera);
    if (v.z > 1 || Math.abs(v.x) > 1.3 || Math.abs(v.y) > 1.3) return;
    const h = this.heat;
    h.x = v.x * 0.5 + 0.5; h.y = v.y * 0.5 + 0.5;
    const y0 = v.y;
    v.copy(pos); v.y += radius; v.project(camera);
    h.r = Math.abs(v.y - y0) * 0.5;
    h.a = amt;
  },
  // The subject of the shot (a car, say): this frame the speed streak and the colour split of a blow leave an
  // ellipse round it alone, so it stays readable while the world streaks past. halfW/halfH in world units.
  keepAt(camera, pos, halfW, halfH, amt = 1) {
    if (!camera) return;
    const v = this._keepV || (this._keepV = new THREE.Vector3());
    v.copy(pos).project(camera);
    if (v.z > 1) return;
    const k = this.keep, x0 = v.x, y0 = v.y;
    k.x = x0 * 0.5 + 0.5; k.y = y0 * 0.5 + 0.5;
    v.copy(pos); v.y += halfH; v.project(camera); k.ry = Math.max(0.02, Math.abs(v.y - y0) * 0.5);
    v.copy(pos); v.x += halfW; v.project(camera); k.rx = Math.max(0.02, Math.abs(v.x - x0) * 0.5);
    k.a = amt;
  },
  // A shockwave at a point in the scene bends the picture as it spreads: a ring of
  // refraction in the final pass. amp 0..1.
  ripple(camera, pos, amp = 1, dur = 0.55) {
    if (REDUCED_MOTION || this.calm || !camera) return;
    const v = this._ripV || (this._ripV = new THREE.Vector3());
    v.copy(pos).project(camera);
    if (v.z > 1) return;
    const r = this.rip;
    r.x = v.x * 0.5 + 0.5; r.y = v.y * 0.5 + 0.5; r.t = 0; r.dur = dur; r.amp = amp;
  },
  pulse(ab = 6, flash = 0.1) {
    const soft = REDUCED_MOTION || this.calm;
    if (!soft) this.punch = Math.max(this.punch, Math.min(0.03, ab * 0.0022));
    if (soft) { ab *= 0.3; flash *= 0.3; }
    // never more than three flashes a second, however fast the hits come
    if (flash > 0) { if (this.t - this.flashAt < 0.34) flash = 0; else this.flashAt = this.t; }
    this.ab = Math.max(this.ab, ab);
    this.flashAmt = Math.max(this.flashAmt, flash);
  },
  hitStop(ms) { if (!REDUCED_MOTION) this.freeze = Math.max(this.freeze, ms / 1000); },
  // Low health: a red vignette round the picture that beats like a pulse, until it is set back to 0. amt 0..1.
  setDanger(amt) { this.dangerT = REDUCED_MOTION || this.calm ? amt * 0.45 : amt; },
  // The glow of the whole picture swells for a moment (a blow that lands, a blast). k 0..1.5.
  bloomPulse(k = 0.6) { if (!REDUCED_MOTION && !this.calm) this.bloomKick = Math.max(this.bloomKick, k); },
  // Right/wrong flashes, drawn by the final shader as a coloured vignette over the
  // 3D view (they used to be a full-screen page layer, which the browser had to
  // blend on every frame of the fade, plus a forced layout to restart it).
  hitFlash(kind) {
    const K = { good: [[0.525, 1, 0.37], 0.07, 0.42, 0.35], hit: [[1, 0.28, 0.41], 0.2, 0.68, 0.45], white: [[1, 1, 1], 1, 1, 0.5] }[kind];
    if (!K) return false;
    if (this.t - this.hitAt < 0.34) return true; // at most three a second
    this.hitAt = this.t;
    const h = this.hit, soft = REDUCED_MOTION || this.calm ? 0.4 : 1;
    h.col = K[0]; h.inner = K[1] * soft; h.outer = K[2] * soft; h.dur = K[3]; h.t = 0;
    return true;
  },
  vsync: 1 / 60, // the screen's frame interval, refined as frames come in
  // The screen's refresh rate, measured on a dozen blank frames before anything is
  // drawn. watch() can only learn it from fast frames, which a slow GPU never shows,
  // so without this a 120 Hz phone whose first scenes are heavy is taken for a 60 Hz
  // one and settles a little under 60. Only ever raises the target (up to 120).
  measureScreen() {
    return new Promise((done) => {
      const ts = [];
      let over = false;
      const finish = () => {
        if (over) return;
        over = true;
        const d = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b);
        this.screenProbe = d; // for the FPS tools
        if (d.length >= 6 && d[d.length >> 1] > 18.5 && d[d.length >> 1] < 22) this.screenMs = d[d.length >> 1]; // (a 50 Hz screen: its own frame is the governor's mark, not 60's)
        this.screenProbed(d); // (every 33 ms, steadily: the device holds the page at 30)
        if (d.length >= 6) {
          const hz = snapHz(d[d.length >> 1] / 1000); // the median interval
          if (hz > 60) this.vsync = Math.min(this.vsync, 1 / Math.min(hz, 120));
        }
        done();
      };
      // each probe frame clears the canvas, so it is a real frame: a browser may slow
      // frames that change nothing on screen
      const tick = (t) => {
        ts.push(t);
        if (this.ok && !Scenes.cur) { this.renderer.setRenderTarget(null); this.renderer.clear(); }
        if (ts.length < 14) requestAnimationFrame(tick); else finish();
      };
      requestAnimationFrame(tick);
      setTimeout(finish, 600); // a hidden tab gets no frames: don't hold up the title
    });
  },
  // One environment-map generator for the whole session. Making one per scene and
  // throwing it away recompiled its blur shaders every time a scene loaded.
  pmrem() {
    if (!this._pmrem) this._pmrem = new THREE.PMREMGenerator(this.renderer);
    return this._pmrem;
  },
  // A closing scene's materials are parked here, still holding their GPU programs,
  // until the next scene of the same kind has been warmed: replaying a game (or
  // going back to one) then reuses every shader instead of compiling them again,
  // which on a phone can freeze the screen for a second or more.
  park(old) {
    const held = [];
    const free = THREE.Material.prototype.dispose;
    THREE.Material.prototype.dispose = function () { held.push(this); };
    try { old.dispose(); } finally { THREE.Material.prototype.dispose = free; }
    const name = old.constructor.name, P = this._parked || (this._parked = {});
    if (P[name]) P[name].forEach((m) => m.dispose());
    P[name] = held;
  },
  unpark(s) {
    const P = this._parked, name = s && s.constructor.name;
    if (!P || !P[name]) return;
    P[name].forEach((m) => m.dispose());
    delete P[name];
  },
  // A scene that is kept while you play (the arcade hall: see hubScene) lets go of its pictures and its shapes on the
  // graphics chip while you are away: every texture drawn from a picture, a canvas or data, every geometry's buffers.
  // It keeps them in memory, and its programs and the pictures it rendered (reflections, the screens' own) on the chip,
  // so coming back is still no rebuild and no shader compile: warm() sends them back behind the change of screen.
  rest(old) {
    if (!old.scene) return;
    const up = (img) => img && ((typeof HTMLImageElement !== "undefined" && img instanceof HTMLImageElement) || (typeof HTMLCanvasElement !== "undefined" && img instanceof HTMLCanvasElement) || (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) || (img.data && img.width > 0));
    const done = new Set(), tex = (t) => { if (t && t.isTexture && !done.has(t) && t !== _glowTex && up(t.image)) { done.add(t); t.dispose(); } };
    old.scene.traverse((o) => {
      if (o.geometry && !done.has(o.geometry)) { done.add(o.geometry); o.geometry.dispose(); }
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => {
        for (const k of DISPOSE_MAPS) tex(m[k]);
        if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) tex(v); }
      });
    });
  },
  // Draw a new scene once, tiny and off-screen, with everything that starts hidden
  // (pooled effects, speed lines, and the pieces a scene lists in warmExtra) showing.
  // Every shader and GPU pipeline state it will need is built now, behind the screen
  // transition, instead of stalling the frame where a hit first happens.
  // A new screen is drawn once, off-screen and tiny, with everything in it shown: every shader it will use is
  // compiled and every picture sent to the graphics chip now, behind the curtain, and not the first time a thing
  // appears in play (on a phone each of those was a stall of a frame or more). With it: what the screen keeps aside
  // for later (warmExtra), every model its files brought that it has not put in the scene yet (allies, props, the
  // pieces of an event), and every sky it may fly into.
  // the screen's light budget: made the first time its scene is drawn (see LightPool), then kept up each frame
  lightsFor(scene) {
    const b = scene && scene.userData.lightBudget;
    if (!b) return null;
    let p = scene.userData.lightPool;
    if (p && p.cap !== this.lightCap) { p.dispose(); p = null; } // (the governor's last steps cut the point lights: the screen's shaders are made again, once)
    if (!p) { p = scene.userData.lightPool = new LightPool(scene, Object.assign({}, b, { point: Math.min(b.point || 0, this.lightCap) })); p.cap = this.lightCap; }
    p.update();
    return p;
  },
  // the current screen's light budget made again at the governor's cap (see lightsFor)
  lightsReset() { const sc = typeof Scenes !== "undefined" && Scenes.cur && Scenes.cur.scene; if (sc && sc.userData.lightPool) { sc.userData.lightPool.dispose(); sc.userData.lightPool = null; } },
  // Shaders asked for ahead of a piece's first draw (the master overhaul, 2026-11-23: nothing arriving in view may stall
  // a frame). The programs the new pieces need are made now, unseen, in a scene of their own lit by as many lights of
  // each kind as the screen draws (a program depends on how many, not where), into a target like the screen's own;
  // the returned function says when they are ready to be shown: when the graphics driver says they are built
  // (KHR_parallel_shader_compile: Safari builds them on threads of its own, and Chrome on a graphics chip), at most a
  // second and a half on; without that word, two frames on. Pieces not yet hung anywhere.
  prepare(scene, camera, objs) {
    if (!this.ok || !objs || !objs.length) return () => true;
    const r = this.renderer, gl = r.getContext();
    if (this._par === undefined) { try { this._par = gl.getExtension("KHR_parallel_shader_compile") || null; } catch (e) { this._par = null; } }
    const K = this._par, P = this._prep || (this._prep = { scene: new THREE.Scene(), lights: {} });
    const kinds = { DirectionalLight: 0, PointLight: 0, SpotLight: 0, HemisphereLight: 0 };
    scene.traverseVisible((o) => { if (o.isLight && o.layers.test(camera.layers) && kinds[o.type] !== undefined) kinds[o.type]++; });
    for (const k in kinds) {
      const have = P.lights[k] || (P.lights[k] = []);
      while (have.length < kinds[k]) { const l = new THREE[k](0xffffff, 0); have.push(l); P.scene.add(l); }
      have.forEach((l, i) => { l.visible = i < kinds[k]; });
    }
    P.scene.fog = scene.fog; P.scene.environment = scene.environment;
    const before = new Set(r.info.programs || []), was = r.getRenderTarget();
    try {
      for (const o of objs) P.scene.add(o);
      r.setRenderTarget(this._warmRT || null); // (a program differs by the kind of target it draws into: the screen's is like this one)
      r.compile(P.scene, camera);
    } catch (e) { /* best effort: they are made at their first draw instead */ }
    r.setRenderTarget(was);
    for (const o of objs) P.scene.remove(o);
    const made = (r.info.programs || []).filter((p) => !before.has(p));
    let n = 0;
    return () => {
      n++;
      if (!made.length) return true;
      if (!K) return n > 2;
      if (n > 90) return true;
      try { return made.every((p) => gl.getProgramParameter(p.program, K.COMPLETION_STATUS_KHR)); } catch (e) { return true; }
    };
  },
  warm(s) {
    if (!this.ok || !s.scene || !s.camera) return;
    const r = this.renderer, scene = s.scene, extra = (s.warmExtra || []).slice(), want = Assets.cur || [];
    Assets.cur = null;
    for (const n of want) { const m = n.startsWith("model:") && Assets.fresh[n]; if (m && m.scene && !m.scene.parent) extra.push(m.scene); }
    extra.forEach((o) => scene.add(o));
    const saved = [];
    scene.traverse((o) => { saved.push(o, o.visible, o.frustumCulled); o.visible = true; o.frustumCulled = false; });
    if (!this._warmRT) {
      this._warmRT = new THREE.WebGLRenderTarget(16, 16, {
        type: this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false,
      });
    }
    if (this.pipe && this.pipe.compileAll) this.pipe.compileAll(); // (and every post-processing pass, the first time)
    this.lightsFor(scene); // (the screen's light budget in place, so its shaders are compiled for the lights it will draw)
    const layers = s.camera.layers.mask;
    s.camera.layers.mask = ~(1 << LIGHT_LAYER); // (what a screen keeps on layers of its own, the mirror's or the overlay's, is readied too; not the hidden lights)
    try {
      r.setRenderTarget(this._warmRT);
      r.render(scene, s.camera);
    } catch (e) { /* best effort */ }
    s.camera.layers.mask = layers;
    r.setRenderTarget(null);
    for (let i = 0; i < saved.length; i += 3) { saved[i].visible = saved[i + 1]; saved[i].frustumCulled = saved[i + 2]; }
    extra.forEach((o) => scene.remove(o));
    s.warmExtra = null;
    if (r.initTexture) {
      for (const n of want) { const k = n.startsWith("sky:") && Assets.kept[n]; if (k && k.map) try { r.initTexture(k.map); } catch (e) { /* best effort */ } }
      for (const t of s.warmTextures || []) try { r.initTexture(t); } catch (e) { /* best effort */ } // (pictures a screen swaps in later: CombatFX's markers)
    }
    s.warmTextures = null;
  },
  sceneChanged() {
    this.speedBlur = this.punch = 0;
    this.danger = this.dangerT = this.bloomKick = 0;
    VFX.reset();
    this.rip.t = this.rip.dur;
    this.gl.t = this.gl.dur;
  },
};

// The show clock. Everything that is look and not rule (effects, model animation, telegraphs, deaths) runs on
// VFX.dt instead of the scene's own dt, so a hit-stop or a beat of slow motion changes what is seen and never when
// a rule fires: timers, charge bars and the order of events run on, frame for frame, as they always did.
//   VFX.hitStop(frames)      freeze the show for that many 60 Hz frames (2 or 3 on a big impact)
//   VFX.slowMo(k, dur, hold) drop to k of full speed, hold, and ease back to full over dur seconds (real time)
//   VFX.dt                   this frame's show time step; VFX.k its speed (0..1); VFX.t show time so far
const VFX = {
  dt: 0, k: 1, t: 0,
  stop: 0, // seconds of freeze left
  slow: { k: 1, t: 0, dur: 0, hold: 0 },
  hitStop(frames = 3) { if (!REDUCED_MOTION && !GFX.calm) this.stop = Math.max(this.stop, frames / 60); },
  slowMo(k = 0.25, dur = 0.5, hold = 0.12) {
    if (REDUCED_MOTION || GFX.calm) return;
    const s = this.slow;
    if (s.t < s.dur + s.hold && s.k < k) return; // a deeper one is already running
    s.k = k; s.t = 0; s.dur = dur; s.hold = hold;
  },
  // called once a frame by the main loop, with the scene's time step and the real one
  frame(dt, real) {
    let k = 1;
    const s = this.slow;
    if (s.t < s.dur + s.hold) {
      s.t += real;
      const u = clamp((s.t - s.hold) / Math.max(1e-4, s.dur), 0, 1);
      k = lerp(s.k, 1, u * u * (3 - 2 * u));
    }
    if (this.stop > 0) { this.stop -= real; k = 0; }
    this.k = k;
    this.dt = dt * k;
    this.t += this.dt;
  },
  reset() { this.stop = 0; this.slow.t = this.slow.dur = this.slow.hold = 0; this.k = 1; },
};

// The standard refresh rate nearest a frame interval (seconds).
const snapHz = (dt) => [240, 165, 144, 120, 90, 75, 60, 50, 30].reduce((b, r) => (Math.abs(1 / r - dt) < Math.abs(1 / b - dt) ? r : b), 60);

// The game's one colour grade (the owner, 2026-11-17: one shared look): every screen's picture is finished with the
// same saturation and contrast. What still differs from screen to screen is only how bright a room is lit (exposure)
// and how much its lights bloom: a moonlit exam hall is not a sunlit avenue.
const GRADE = { saturation: 1.16, contrast: 1.15 };
// ---- the light budget (the owner, 2026-11-17: a small budget of lights per screen). A screen states how many
// lights of each kind it may draw: scene.userData.lightBudget = { dir, point, spot }. Its own lights stay where its
// code keeps them (moved, faded, coloured, switched by `visible` as before) but are never drawn themselves (they live
// on layer 31, which no lens sees); each frame the strongest of each kind is copied into the few lights that are
// drawn. The number of lights the shaders see never changes, so nothing recompiles when a flash comes and goes, and
// every lit pixel reckons with a handful of lights, not a dozen. A spot light the budget has no room for competes for
// a point light's place, drawn as a point light. A light marked userData.keep (a key light) always keeps its place.
const LIGHT_LAYER = 31;
class LightPool {
  constructor(scene, budget) {
    this.scene = scene;
    this.slots = { dir: [], point: [], spot: [] };
    const make = { dir: () => new THREE.DirectionalLight(0xffffff, 0), point: () => new THREE.PointLight(0xffffff, 0, 0, 2), spot: () => new THREE.SpotLight(0xffffff, 0) };
    for (const k of ["dir", "point", "spot"]) for (let i = 0; i < (budget[k] || 0); i++) {
      const l = make[k]();
      l.userData.slot = true; l.name = "budget-" + k + i;
      scene.add(l);
      if (l.target) { l.target.userData.slot = true; scene.add(l.target); }
      this.slots[k].push({ l, src: null });
    }
    this.lists = { dir: [], point: [], spot: [] };
    this._p = new THREE.Vector3();
  }
  // its lights taken out of the scene (a pool with fewer is made in its place)
  dispose() { for (const k of ["dir", "point", "spot"]) for (const s of this.slots[k]) { this.scene.remove(s.l); if (s.l.target) this.scene.remove(s.l.target); } }
  // every light of the screen's own: found each frame (a scene adds lights as it builds things), moved out of sight
  collect() {
    const L = this.lists; L.dir.length = L.point.length = L.spot.length = 0;
    this.scene.traverse((o) => {
      if (!o.isLight || o.userData.slot || o.isAmbientLight || o.isHemisphereLight) return;
      if (o.layers.mask !== (1 << LIGHT_LAYER)) o.layers.set(LIGHT_LAYER);
      (o.isDirectionalLight ? L.dir : o.isSpotLight ? (this.slots.spot.length ? L.spot : L.point) : o.isPointLight ? L.point : L.dir).push(o);
    });
  }
  // is it on, as its screen means it: lit, and it and everything it hangs on shown
  shown(o) { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return o.intensity > 0; }
  score(o, held) {
    const reach = o.isDirectionalLight ? 1 : Math.min(o.distance > 0 ? o.distance : 40, 60) / 20;
    return o.intensity * reach * (held ? 1.25 : 1) * (o.userData.keep ? 1000 : 1); // (a light that holds a place keeps it against a near equal: no flicker between two)
  }
  update() {
    this.collect();
    for (const k of ["dir", "point", "spot"]) {
      const slots = this.slots[k];
      if (!slots.length) continue;
      const held = new Set(slots.map((s) => s.src));
      const lit = this.lists[k].filter((o) => this.shown(o)).sort((a, b) => this.score(b, held.has(b)) - this.score(a, held.has(a))).slice(0, slots.length);
      // a light that keeps its place keeps its slot (no jump in which slot draws what)
      const free = slots.filter((s) => !s.src || lit.indexOf(s.src) < 0);
      for (const s of free) s.src = null;
      for (const o of lit) if (!slots.some((s) => s.src === o)) { const s = slots.find((x) => !x.src); if (s) s.src = o; }
      for (const s of slots) this.copy(s.l, s.src);
    }
  }
  copy(l, o) {
    if (!o) { l.intensity = 0; return; }
    l.color.copy(o.color); l.intensity = o.intensity;
    l.position.setFromMatrixPosition(o.matrixWorld);
    if (l.isPointLight || l.isSpotLight) { l.distance = o.distance; l.decay = o.decay; }
    if (l.isSpotLight) { l.angle = o.angle; l.penumbra = o.penumbra; }
    if (l.target && o.target) l.target.position.setFromMatrixPosition(o.target.matrixWorld);
  }
}

const Scenes = {
  cur: null,
  set(s) {
    const old = this.cur;
    this.cur = s;
    if (old && old !== s && !old.keepAlive) { if (GFX.ok) GFX.park(old); else old.dispose(); } // the hub stays built (see hubScene)
    else if (old && old !== s && GFX.ok) GFX.rest(old); // (and lets its pictures and shapes go from the graphics chip while you are away)
    if (old !== s) { GFX.sceneChanged(old, s); GFX.refit(); GFX.sceneAt = performance.now(); } // (the frame-rate watch skips a new screen's first moments: building it is not drawing it)
    if (s) s.resize(GFX.w, GFX.h);
    if (s && old !== s) { GFX.warm(s); GFX.unpark(s); }
    return s;
  },
  resize() { if (this.cur) this.cur.resize(GFX.w, GFX.h); },
  frame(dt, realDt) {
    const s = this.cur;
    if (!s) return;
    s.update(dt);
    if (GFX.ok && s.scene && s.camera) GFX.render(s.scene, s.camera, realDt);
  },
};

// Where the finger or mouse is, from -1 to 1, for camera parallax. Eases back to
// the centre when a touch lifts.
const Pointer = {
  x: 0, y: 0, tx: 0, ty: 0, touch: false,
  tiltX: 0, tiltY: 0, tilt0: null,
  // Tilting the phone looks around the scene, like the pointer does on a desktop.
  // Android sends motion events freely; iOS asks first, so there it starts from the
  // Setup switch (a tap). Where a page isn't allowed motion events, nothing happens.
  initTilt(ask) {
    if (this._tilt || typeof DeviceOrientationEvent === "undefined") return;
    const listen = () => {
      this._tilt = true;
      window.addEventListener("deviceorientation", (e) => {
        if (e.gamma == null || e.beta == null || !Store.settings.tilt) { this.tiltX = this.tiltY = 0; return; }
        const ang = (screen.orientation && screen.orientation.angle) || 0;
        const g = ang === 90 ? e.beta : ang === 270 ? -e.beta : e.gamma;
        const b = ang === 90 ? -e.gamma : ang === 270 ? e.gamma : e.beta;
        // measured from how the phone is being held, which re-centres slowly
        if (!this.tilt0) this.tilt0 = { g, b };
        this.tilt0.g += (g - this.tilt0.g) * 0.004;
        this.tilt0.b += (b - this.tilt0.b) * 0.004;
        this.tiltX = clamp((g - this.tilt0.g) / 16, -1, 1);
        this.tiltY = clamp((b - this.tilt0.b) / 16, -1, 1);
      }, { passive: true });
    };
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      if (ask) DeviceOrientationEvent.requestPermission().then((r) => { if (r === "granted") listen(); else UI.toast("MOTION ACCESS WAS DECLINED"); }).catch(() => UI.toast("TILT ISN'T AVAILABLE HERE"));
    } else listen();
  },
  init() {
    const set = (e) => {
      this.tx = clamp((e.clientX / GFX.w) * 2 - 1, -1, 1);
      this.ty = clamp((e.clientY / GFX.h) * 2 - 1, -1, 1);
      this.touch = e.pointerType === "touch";
    };
    window.addEventListener("pointermove", set, { passive: true });
    window.addEventListener("pointerdown", set, { passive: true });
    window.addEventListener("pointerup", (e) => { if (e.pointerType === "touch") { this.tx = 0; this.ty = 0; } }, { passive: true });
    if (Store.settings.tilt) this.initTilt(false);
  },
  update(dt) { // (eased exactly: the same glide at any frame rate)
    this.x = Motion.damp(this.x, clamp(this.tx + this.tiltX, -1, 1), 3, dt);
    this.y = Motion.damp(this.y, clamp(this.ty + this.tiltY, -1, 1), 3, dt);
  },
};

const Haptics = {
  buzz(pattern) {
    if (!Store.settings.sfx) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not allowed here */ }
  },
};

// Base for every 3D scene. Works without WebGL too (update still runs, nothing draws).
// The ring of a shockwave, across its width: a thin bright stroke near the outer edge, a soft tail inside it,
// nothing at either rim. (The ring's mesh spans 0.69 to 1 of its outer radius.)
let _shockTex = null;
function shockTexture() {
  if (_shockTex) return _shockTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d"), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  [[0, 0], [0.7, 0], [0.86, 0.08], [0.925, 0.3], [0.95, 1], [0.972, 0.45], [1, 0]].forEach(([r, v]) => { const k = Math.round(v * 255); g.addColorStop(r, `rgb(${k},${k},${k})`); });
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  _shockTex = new THREE.CanvasTexture(c);
  return _shockTex;
}

class Scene3D {
  constructor({ fov = 60, near = 0.1, far = 500, bg = 0x090320, fog = null } = {}) {
    this.tw = new TweenSet();
    this.t = 0;
    this.shakeAmt = 0;
    this.band = null;
    this.has3D = !!window.THREE;
    if (!this.has3D) return;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bg);
    if (fog) this.scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
    this.camera = new THREE.PerspectiveCamera(fov, GFX.w / GFX.h, near, far);
    this.camera.layers.enable(1);
    this.camBase = new THREE.Vector3();
    this.lookAt = new THREE.Vector3(0, 0, -10);
    // pooled shockwave rings (see shockwave()), built with the scene so a hit never
    // creates GPU objects
    const rg = new THREE.RingGeometry(0.55, 0.8, 72);
    this.shockRings = Array.from({ length: 4 }, () => {
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, map: shockTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      ring.visible = false;
      ring.userData.tok = 0;
      this.scene.add(ring);
      return ring;
    });
    this.shockI = 0;
  }
  resize(w, h) {
    if (!this.camera) return;
    this.camera.aspect = w / h;
    if (this.band) {
      const yc = (this.band.top + this.band.bottom) / 2;
      this.camera.setViewOffset(w, h, 0, h / 2 - yc, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(w, h);
  }
  // Centre the 3D action in the strip of screen between the HUD panels.
  setBand(el) {
    if (!el) { this.band = null; return this.resize(GFX.w, GFX.h); }
    const r = el.getBoundingClientRect();
    this.band = { top: r.top, bottom: r.bottom, h: Math.max(1, r.height) };
    this.resize(GFX.w, GFX.h);
  }
  // World-space size of the visible band at a given distance from the camera.
  bandSize(dist) {
    const H = GFX.h, W = GFX.w;
    const worldH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const perPx = worldH / H;
    const bh = (this.band ? this.band.h : H) * perPx;
    return { w: W * perPx, h: bh };
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, REDUCED_MOTION || GFX.calm ? a * 0.3 : a); }
  // An expanding ring of light that faces the camera.
  shockwave(pos, color, size = 5, dur = 0.55) {
    if (!this.has3D) return;
    const ring = this.shockRings[this.shockI++ % this.shockRings.length];
    const tok = ++ring.userData.tok;
    ring.visible = true;
    ring.position.copy(pos);
    ring.quaternion.copy(this.camera.quaternion);
    ring.material.color.set(color);
    ring.material.opacity = 1;
    ring.scale.setScalar(0.4);
    GFX.ripple(this.camera, pos, clamp(size / 7, 0.45, 1), dur);
    this.tw.add(dur, (k) => {
      if (ring.userData.tok !== tok) return;
      ring.scale.setScalar(0.4 + k * size);
      ring.material.opacity = 1 - k;
    }, () => { if (ring.userData.tok === tok) ring.visible = false; });
  }
  placeCamera() {
    if (!this.camera) return;
    this.camera.position.copy(this.camBase);
    if (this.shakeAmt > 0.001) {
      this.camera.position.x += rand(-1, 1) * this.shakeAmt;
      this.camera.position.y += rand(-1, 1) * this.shakeAmt;
    }
    this.camera.lookAt(this.lookAt);
  }
  update(dt) {
    this.t += dt;
    this.tw.update(dt);
    this.shakeAmt *= Math.pow(0.02, dt);
  }
  dispose() {
    this.tw.clear();
    if (this.scene) disposeTree(this.scene);
    if (this.env) this.env.dispose();
    if (this.mirror) this.mirror.dispose();
  }
}

// (Phase 5: a loaded model's other maps go too, its glow, relief, finish and shade: a model is handed to one scene
// only, and they stayed on the graphics chip after it, some 60 MB a visit for a Boss Rush boss. A texture that is
// shown again is sent to the chip again, from the picture it keeps. Reflection maps are shared and stay.)
const DISPOSE_MAPS = ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "alphaMap", "bumpMap"];
function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        for (const k of DISPOSE_MAPS) if (m[k] && m[k].isTexture && m[k] !== _glowTex) m[k].dispose();
        m.dispose();
      });
    }
  });
}

// ---- shared props --------------------------------------------------------------
function makeGrid({ size = 240, step = 5, color = 0xff3ad4, y = 0 } = {}) {
  const pts = [];
  const half = size / 2;
  for (let x = -half; x <= half + 0.001; x += step) pts.push(x, 0, -half, x, 0, half);
  for (let z = -half; z <= half + 0.001; z += step) pts.push(-half, 0, z, half, 0, z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color }));
  grid.position.y = y;
  grid.userData.step = step;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), new THREE.MeshBasicMaterial({ color: 0x0b0326 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y - 0.02;
  const grp = new THREE.Group();
  grp.add(floor, grid);
  grp.userData.grid = grid;
  return grp;
}
function scrollGrid(grp, dist) {
  const g = grp.userData.grid;
  g.position.z = dist % g.userData.step;
}

function sunTexture(top = "#ffe14f", mid = "#ff9b3d", bot = "#ff3ad4") {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, bot);
  x.fillStyle = g;
  x.beginPath();
  x.arc(128, 128, 124, 0, Math.PI * 2);
  x.fill();
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 8; i++) x.fillRect(0, 138 + i * 15, 256, 2 + i * 1.4);
  return new THREE.CanvasTexture(c);
}
function makeSun(radius = 40, colors = []) {
  const grp = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: sunTexture(...colors), transparent: true, fog: false, depthWrite: false })
  );
  const glow = glowSprite(colors[2] || "#ff3ad4", radius * 3.6, 0.55);
  grp.add(glow, sun);
  return grp;
}

let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}
function glowSprite(color, scale = 2, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  s.scale.set(scale, scale, 1);
  return s;
}

function makeStars(n = 500, r = 300, { color = 0xffffff, size = 1.6, lowest = -0.05 } = {}) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2;
    const y = rand(lowest, 1);
    const s = Math.sqrt(1 - y * y);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * y;
    pos[i * 3 + 2] = r * s * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, fog: false }));
}

function makeMountains({ width = 460, z = -190, color = 0xa65fff, fill = 0x10052c, height = 34, n = 46 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = -width / 2 + (width * i) / n;
    const edge = Math.abs(x) / (width / 2);
    const peak = i % 2 ? rand(0.55, 1) : rand(0.12, 0.45);
    pts.push([x, peak * height * (0.35 + 0.65 * edge)]);
  }
  const pos = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    pos.push(x0, 0, 0, x1, 0, 0, x1, y1, 0, x0, 0, 0, x1, y1, 0, x0, y0, 0);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const fillMesh = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: fill, fog: false, side: THREE.DoubleSide }));
  const lp = [];
  pts.forEach(([x, y]) => lp.push(x, y, 0.2));
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const ridge = new THREE.Line(lg, new THREE.LineBasicMaterial({ color, fog: false }));
  const wp = [];
  const dx = width / n;
  for (let i = 1; i < n; i++) {
    const [x, y] = pts[i];
    if (y > height * 0.3) wp.push(x, y, 0.1, x - dx * 0.8, y * 0.35, 0.1, x, y, 0.1, x + dx * 0.6, y * 0.25, 0.1);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3));
  const wire = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45, fog: false }));
  const grp = new THREE.Group();
  grp.add(fillMesh, wire, ridge);
  grp.position.z = z;
  return grp;
}

// Text for the 3D scenes is drawn three times finer than asked and filtered down, so it
// stays razor-sharp close up and at a slant (the sizes callers pass are unchanged).
const TEXT_K = 3;
function textCanvas(text, { w = 256, h = 64, size = 26, color = "#ffffff", bg = null, glow = null, font = "Press Start 2P", align = "center", lh = 1.35 } = {}) {
  const c = document.createElement("canvas"), K = TEXT_K;
  c.width = w * K;
  c.height = h * K;
  const x = c.getContext("2d");
  x.scale(K, K);
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.font = `${size}px "${font}", "Courier New", monospace`;
  x.textAlign = align;
  x.textBaseline = "middle";
  if (glow) { x.shadowColor = glow; x.shadowBlur = Math.max(4, size * 0.45) * K; }
  x.fillStyle = color;
  const lines = String(text).split("\n");
  lines.forEach((ln, i) => x.fillText(ln, align === "center" ? w / 2 : 10, h / 2 + (i - (lines.length - 1) / 2) * size * lh));
  return c;
}
function textTexture(text, opts) {
  return new THREE.CanvasTexture(textCanvas(text, opts));
}
function labelSprite(text, color, scale = 1.4) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: textTexture(text, { w: 64, h: 64, size: 34, glow: color }), transparent: true, depthTest: false, fog: false })
  );
  s.scale.set(scale, scale, 1);
  s.renderOrder = 10;
  return s;
}

// A low-poly solid with neon edges. Needs lights for the Phong fill.
function neonSolid(geo, color, { fill = 0x120733, glow = 0.18, edgeColor } = {}) {
  const grp = new THREE.Group();
  const c = new THREE.Color(color);
  const mat = new THREE.MeshPhongMaterial({ color: fill, emissive: c.clone().multiplyScalar(glow), flatShading: true, shininess: 50, specular: 0x666666 });
  const mesh = new THREE.Mesh(geo, mat);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: edgeColor || color }));
  grp.add(mesh, edges);
  grp.userData.mat = mat;
  grp.userData.edgeMat = edges.material;
  grp.userData.color = c;
  return grp;
}

function addLights(scene, { ambient = 0x6a5aa8, ai = 0.7, key = 0xffffff, ki = 0.9, dir = [3, 6, 4] } = {}) {
  scene.add(new THREE.AmbientLight(ambient, ai));
  const d = new THREE.DirectionalLight(key, ki);
  d.position.set(...dir);
  scene.add(d);
  return d;
}

function beamMesh(from, to, color, radius = 0.07) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 6, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// Particle bursts for explosions, coins and confetti.
// Particle bursts: one fixed pool of soft glowing dots, drawn in a single call.
// Nothing is created or freed during play, so a hit never waits on new GPU work
// (a fresh material per burst used to recompile its shader on every hit).
class Bursts {
  constructor(scene, cap = 768) {
    this.scene = scene;
    this.cap = cap;
    this.head = 0;
    this.until = 0;
    this.fresh = false;
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
    this.size = new Float32Array(cap);
    this.alpha = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.life = new Float32Array(cap).fill(1);
    this.grav = new Float32Array(cap);
    this._c = new THREE.Color();
    const g = new THREE.BufferGeometry();
    const attr = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", attr(this.pos, 3));
    g.setAttribute("aColor", attr(this.col, 3));
    g.setAttribute("aSize", attr(this.size, 1));
    g.setAttribute("aAlpha", attr(this.alpha, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: glowTexture() }, uScale: { value: 300 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale; varying vec3 vC;
        void main(){
          vC = aColor * aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aAlpha > 0.0 ? aSize * uScale / max(-mv.z, 0.05) : 0.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "uniform sampler2D tMap; varying vec3 vC; void main(){ gl_FragColor = vec4(vC * texture2D(tMap, gl_PointCoord).a, 1.0); }",
    });
    this.pts = new THREE.Points(g, mat);
    this.pts.frustumCulled = false;
    this.pts.visible = false;
    // dot size in pixels follows whichever target is being drawn (the scene or a mirror)
    this.pts.onBeforeRender = (r) => {
      const t = r.getRenderTarget();
      mat.uniforms.uScale.value = (t ? t.height : r.domElement.height) * 0.5;
      mat.uniformsNeedUpdate = true;
    };
    if (scene) scene.add(this.pts);
  }
  burst(pos, color, { n = 60, speed = 10, size = 0.3, life = 1.1, gravity = -5, spread = 1 } = {}) {
    if (!this.scene) return;
    const c = this._c.set(color).multiplyScalar(2.6);
    const P = this.pos, V = this.vel, C = this.col;
    for (let k = 0; k < n; k++) {
      const i = this.head, j = i * 3;
      this.head = (i + 1) % this.cap;
      const th = rand(Math.PI * 2), ph = Math.acos(rand(-1, 1)), sp = rand(0.25, 1) * speed;
      P[j] = pos.x; P[j + 1] = pos.y; P[j + 2] = pos.z;
      V[j] = Math.sin(ph) * Math.cos(th) * sp * spread;
      V[j + 1] = Math.cos(ph) * sp;
      V[j + 2] = Math.sin(ph) * Math.sin(th) * sp * spread;
      C[j] = c.r; C[j + 1] = c.g; C[j + 2] = c.b;
      this.size[i] = size * 2.4;
      this.alpha[i] = 1;
      this.age[i] = 0;
      this.life[i] = life;
      this.grav[i] = gravity;
    }
    this.until = Math.max(this.until, life);
    this.fresh = true;
    this.pts.visible = true;
  }
  update(dt) {
    if (!this.pts.visible) return;
    const P = this.pos, V = this.vel, A = this.alpha;
    const drag = Math.pow(0.4, dt);
    for (let i = 0; i < this.cap; i++) {
      if (A[i] <= 0) continue;
      const age = (this.age[i] += dt);
      if (age >= this.life[i]) { A[i] = 0; continue; }
      const j = i * 3;
      P[j] += V[j] * dt;
      P[j + 1] += V[j + 1] * dt;
      P[j + 2] += V[j + 2] * dt;
      V[j] *= drag;
      V[j + 2] *= drag;
      V[j + 1] = V[j + 1] * drag + this.grav[i] * dt;
      A[i] = 1 - age / this.life[i];
    }
    const at = this.pts.geometry.attributes;
    at.position.needsUpdate = true;
    at.aAlpha.needsUpdate = true;
    if (this.fresh) { at.aColor.needsUpdate = true; at.aSize.needsUpdate = true; this.fresh = false; }
    this.until -= dt;
    if (this.until <= 0) { A.fill(0); at.aAlpha.needsUpdate = true; this.pts.visible = false; }
  }
}

function carpetTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#0d0626";
  x.fillRect(0, 0, 256, 256);
  const cols = ["#35efff", "#ff3ad4", "#ffe14f", "#4dffa6", "#a65fff"];
  x.lineWidth = 3;
  for (let i = 0; i < 60; i++) {
    const col = pick(cols);
    x.strokeStyle = col;
    x.fillStyle = col;
    const px = rand(16, 240), py = rand(16, 240);
    const k = randInt(0, 3);
    x.beginPath();
    if (k === 0) { x.arc(px, py, rand(3, 7), 0, Math.PI * 2); x.stroke(); }
    else if (k === 1) { x.moveTo(px, py); x.lineTo(px + rand(-12, 12), py + rand(8, 14)); x.lineTo(px + rand(-12, 12), py - rand(4, 10)); x.closePath(); x.stroke(); }
    else if (k === 2) { x.moveTo(px - 12, py); x.lineTo(px - 6, py - 6); x.lineTo(px, py); x.lineTo(px + 6, py - 6); x.lineTo(px + 12, py); x.stroke(); }
    else x.fillRect(px, py, 4, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}
