// Boot: load progress, start the renderer, wait briefly for the pixel fonts
// (3D signs are drawn with them), then show the attract screen.
function boot() {
  Store.load();
  document.body.classList.toggle("crt-off", !Store.settings.crt);
  UI.init();
  GFX.init();
  GFX.applySettings();

  Pointer.init();
  // FPS counter (Setup), a readout to read on the phone and send as a picture (the owner, 2026-11-22). Switched on in
  // Setup (saved), or for this visit by tapping the title three times (Perf.tap) or opening the page with #fps.
  //   line 1: frames a second (the last half second), the average frame's time, the slowest frame, and how many frames
  //           caught (over 50 ms) in the last ten seconds; the main thread's own time a frame (the game and its calls)
  //   graph:  the last two seconds of frames, a bar each as tall as it took (the top is 50 ms); the bright line is
  //           60 fps, the dim one 30. Green bars met 60, amber missed it by a frame, red caught (over two frames);
  //           blue ones were a moment's work (a model arriving: shaders made, pictures sent), which AUTO leaves out
  //   line 2: the tier, the size the scene is drawn at (and its share of the tier's), how its edges are smoothed (MSAA
  //           and its samples, or NO AA where the device cannot multisample: 2026-11-23), the lights, draw calls, triangles
  //   line 3: what AUTO is doing (its step on the ladder and why it last moved), or HELD AT 24 FPS (30, ...) when the
  //           device itself holds the page at a lower rate: LOW POWER MODE?, or the main thread's time when that is
  //           what fills a frame (see GFX.perfTick)
  const fpsEl = $("#fps");
  fpsEl.hidden = !(Store.settings.fps || /fps/.test(location.hash));
  fpsEl.innerHTML = `<div class="f1"></div><canvas class="fg" width="360" height="96"></canvas><div class="f2"></div><div class="f3"></div>`;
  const fpsL1 = $(".f1", fpsEl), fpsL2 = $(".f2", fpsEl), fpsL3 = $(".f3", fpsEl), fpsCv = $(".fg", fpsEl), fpsCtx = fpsCv.getContext && fpsCv.getContext("2d");
  let fpsN = 0, fpsT = performance.now(), fpsWorst = 0, fpsCpu = 0, cpuLast = 0, fpsSum = 0;
  const hitches = [];
  const drawGraph = () => {
    if (!fpsCtx) return;
    const W = fpsCv.width, H = fpsCv.height, P = GFX.perf, x = fpsCtx, sc = H / 50; // (50 ms is the graph's top)
    x.clearRect(0, 0, W, H);
    x.fillStyle = "rgba(5, 1, 20, 0.9)"; x.fillRect(0, 0, W, H);
    let t = 0, px = W;
    for (let k = 1; k <= P.n && px > 0 && t < 2000; k++) {
      const j = (P.i - k + P.ring.length) % P.ring.length, v = P.ring[j], bw = Math.max(1, Math.round((v / 2000) * W));
      t += v; px -= bw;
      x.fillStyle = P.busy[j] ? "#6fa8ff" : v <= 17.4 ? "#4dffa6" : v <= 34 ? "#ffc93d" : "#ff4769";
      const h = Math.max(2, Math.min(H, v * sc));
      x.fillRect(px, H - h, Math.max(1, bw - 1), h);
    }
    x.fillStyle = "rgba(255, 255, 255, 0.75)"; x.fillRect(0, H - Math.round(16.7 * sc), W, 2); // (the 60 fps line)
    x.fillStyle = "rgba(255, 255, 255, 0.3)"; x.fillRect(0, H - Math.round(33.3 * sc), W, 2); // (and 30's)
  };
  let last = performance.now();
  const loop = (now) => {
    const real = Math.min(0.05, Math.max(0, (now - last) / 1000));
    GFX.perfTick(now - last, cpuLast); // (the quality governor, told the frame's time and the main thread's share of it: see GFX.perfTick)
    if (!fpsEl.hidden) {
      fpsN++;
      fpsSum += now - last;
      fpsWorst = Math.max(fpsWorst, now - last);
      if (now - last > 50) hitches.push(now);
      fpsCpu += cpuLast; // (the main thread's own time last frame: the game and the drawing calls; what is left of a frame's time is the graphics chip's)
      if (now - fpsT >= 500) {
        while (hitches.length && now - hitches[0] > 10000) hitches.shift();
        const tris = GFX.ok && GFX.pipe ? GFX.pipe.lastTris : 0, pr = GFX.ok ? GFX.scenePR() : 1;
        fpsL1.textContent = `${Math.round((fpsN * 1000) / (now - fpsT))} FPS · ${(fpsSum / fpsN).toFixed(1)} MS · WORST ${Math.round(fpsWorst)} MS · HITCHES ${hitches.length} /10 S · CPU ${(fpsCpu / fpsN).toFixed(1)} MS`;
        fpsL2.textContent = GFX.ok ? `${GFX.TIERS[GFX.tier].name} · ${pr.toFixed(2)}X${GFX.scale < 1 ? " (" + Math.round(GFX.scale * 100) + "%)" : ""} ${Math.round(GFX.w * pr)}×${Math.round(GFX.h * pr)} · ${GFX.pipe && GFX.pipe.samples ? "MSAA " + GFX.pipe.samples + "X" : "NO AA"} · LIGHTS ${GFX.lightCount()} · ${GFX.pipe ? GFX.pipe.lastCalls : 0} CALLS · ${tris >= 1000 ? (tris / 1000).toFixed(1) + "K" : tris} TRIS` : "NO WEBGL";
        fpsL3.textContent = GFX.ok ? GFX.govLabel() + (GFX.auto && GFX.perf.why && !GFX.perf.capped ? " · " + GFX.perf.why.toUpperCase() : "") : "";
        drawGraph();
        fpsN = 0;
        fpsT = now;
        fpsWorst = 0;
        fpsCpu = 0;
        fpsSum = 0;
      }
    }
    last = now;
    let dt = real;
    // hit-stop: a beat of slow motion on big hits. The world never fully stops, so
    // an impact reads as weight, not as a stutter.
    if (GFX.freeze > 0) { GFX.freeze -= real; dt = real * 0.3; }
    const t0 = performance.now();
    try {
      Pointer.update(real);
      VFX.frame(dt, real);
      Scenes.frame(dt, real);
    } catch (e) {
      console.error(e);
    }
    cpuLast = performance.now() - t0;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    const s = Scenes.cur;
    if (s && s.pause && s.state && s.state !== "over" && s.state !== "intro") s.pause();
    Store.flush();
    Store.flushRemote();
  });
  window.addEventListener("pagehide", () => { Store.flush(); });

  const fonts = document.fonts && document.fonts.load
    ? Promise.race([
        Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('20px "VT323"')]),
        new Promise((r) => setTimeout(r, 1800)),
      ]).catch(() => {})
    : Promise.resolve();
  Promise.all([fonts, GFX.measureScreen()]).then(() => {
    showTitle();
    // the boot splash (drawn by the page itself while this script was still loading) fades out over the title
    const splash = $("#boot");
    if (splash) { splash.classList.add("done"); setTimeout(() => splash.remove(), 900); }
    Store.connectRemote();
  });
}

// Test hook: open the page with #debug to expose internals to automated checks.
if (/debug/.test(location.hash)) {
  window.__arcade = {
    Scenes, Store, UI, CHAPTERS, GFX, VFX, Sound, Assets, CombatFX, HudFX, gameAssets, Trophies, Hype, drawPortrait, client, proctorDress, mergeStates, // (mergeStates: tools/governor-test.js checks a synced copy's settings) // (proctorDress: tools/scenarios/proctor-portrait.js draws the Proctor's portrait with it)
    show: { select: showSelect, setup: showSettings, stats: showStats, results: renderResults, examSetup: showExamSetup, guide: showGuide }, makeSelection, selectionQids, Q_BY_ID, // (for capturing the plain screens)
    // go("blaster", "2"), go("hub"), go("title"), go("guide") …
    go(where, stage = "2") {
      for (let n = 1; n <= 11; n++) Store.state.met[n] = 1;
      Sound.init();
      if (where === "hub") return showHub();
      if (where === "title") return showTitle();
      if (where === "guide") return showGuide();
      if (where === "exam") return startGame("exam", makeSelection("all"));
      startGame(where, makeSelection(stage));
    },
  };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
