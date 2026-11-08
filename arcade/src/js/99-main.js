// Boot: load progress, start the renderer, wait briefly for the pixel fonts
// (3D signs are drawn with them), then show the attract screen.
function boot() {
  Store.load();
  document.body.classList.toggle("crt-off", !Store.settings.crt);
  UI.init();
  GFX.init();

  Pointer.init();
  // FPS counter (Setup): frames per second, the frame rate the game is aiming for
  // (the screen's measured refresh rate, up to 120) and the adaptive quality level.
  const fpsEl = $("#fps");
  fpsEl.hidden = !Store.settings.fps;
  let fpsN = 0, fpsT = performance.now();
  let last = performance.now();
  const loop = (now) => {
    const real = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!fpsEl.hidden) {
      fpsN++;
      if (now - fpsT >= 500) {
        fpsEl.textContent = `${Math.round((fpsN * 1000) / (now - fpsT))} FPS · TARGET ${Math.round(1 / GFX.vsync)} · Q${GFX.qi + 1}/${GFX.Q.length}`;
        fpsN = 0;
        fpsT = now;
      }
    }
    let dt = real;
    // hit-stop: a beat of slow motion on big hits. The world never fully stops, so
    // an impact reads as weight, not as a stutter.
    if (GFX.freeze > 0) { GFX.freeze -= real; dt = real * 0.3; }
    try {
      Pointer.update(real);
      GFX.watch(real);
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
    GFX.saveMem(Scenes.cur);
  });
  window.addEventListener("pagehide", () => { Store.flush(); GFX.saveMem(Scenes.cur); });

  const fonts = document.fonts && document.fonts.load
    ? Promise.race([
        Promise.all([document.fonts.load('16px "Press Start 2P"'), document.fonts.load('20px "VT323"')]),
        new Promise((r) => setTimeout(r, 1800)),
      ]).catch(() => {})
    : Promise.resolve();
  fonts.then(() => {
    showTitle();
    Store.connectRemote();
  });
}

// Test hook: open the page with #debug to expose internals to automated checks.
if (/debug/.test(location.hash)) {
  window.__arcade = {
    Scenes, Store, UI, CHAPTERS, GFX,
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
