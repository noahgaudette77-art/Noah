// Boot: load progress, start the renderer, wait briefly for the pixel fonts
// (3D signs are drawn with them), then show the attract screen.
function boot() {
  Store.load();
  document.body.classList.toggle("crt-off", !Store.settings.crt);
  UI.init();
  GFX.init();

  Pointer.init();
  let last = performance.now();
  const loop = (now) => {
    const real = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    let dt = real;
    if (GFX.freeze > 0) { GFX.freeze -= real; dt = 0; } // hit-stop: the world pauses, the screen still glows
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
    Store.flushRemote();
  });

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
