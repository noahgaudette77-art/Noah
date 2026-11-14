// Boot: load progress, start the renderer, wait briefly for the pixel fonts
// (3D signs are drawn with them), then show the attract screen.
function boot() {
  Store.load();
  document.body.classList.toggle("crt-off", !Store.settings.crt);
  UI.init();
  GFX.init();
  GFX.applySettings();

  Pointer.init();
  // FPS counter (Setup): frames per second, the frame rate the game is aiming for
  // (the screen's measured refresh rate, up to 120).
  // The readout is switched on in Settings (saved), or for this visit only by tapping the title three times (Perf.tap,
  // see the title screen) or by opening the page with #fps. Second line: the slowest frame of the last half second,
  // the triangles and draw calls of the scene itself, and the size it is drawn at.
  const fpsEl = $("#fps");
  fpsEl.hidden = !(Store.settings.fps || /fps/.test(location.hash));
  let fpsN = 0, fpsT = performance.now(), fpsWorst = 0;
  let last = performance.now();
  const loop = (now) => {
    const real = Math.min(0.05, Math.max(0, (now - last) / 1000));
    if (!fpsEl.hidden) {
      fpsN++;
      fpsWorst = Math.max(fpsWorst, now - last);
      if (now - fpsT >= 500) {
        const tris = GFX.ok && GFX.pipe ? GFX.pipe.lastTris : 0, pr = GFX.ok ? GFX.scenePR() : 1;
        fpsEl.innerHTML = `${Math.round((fpsN * 1000) / (now - fpsT))} FPS · WORST ${Math.round(fpsWorst)} MS<br>${tris >= 1000 ? (tris / 1000).toFixed(1) + "K" : tris} TRIS · ${GFX.ok && GFX.pipe ? GFX.pipe.lastCalls : 0} CALLS · ${Math.round(GFX.w * pr)}×${Math.round(GFX.h * pr)}${GFX.ok && GFX.pipe && GFX.pipe.samples ? " · MSAA " + GFX.pipe.samples : ""}`;
        fpsN = 0;
        fpsT = now;
        fpsWorst = 0;
      }
    }
    last = now;
    let dt = real;
    // hit-stop: a beat of slow motion on big hits. The world never fully stops, so
    // an impact reads as weight, not as a stutter.
    if (GFX.freeze > 0) { GFX.freeze -= real; dt = real * 0.3; }
    try {
      Pointer.update(real);
      Scenes.frame(dt, real);
    } catch (e) {
      console.error(e);
    }
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
    Scenes, Store, UI, CHAPTERS, GFX, Sound, Trophies, Hype,
    show: { select: showSelect, setup: showSettings, stats: showStats, results: renderResults }, makeSelection, selectionQids, Q_BY_ID, // (for capturing the plain screens)
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
