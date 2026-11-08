// Boot: load progress, start the renderer, wait briefly for the pixel fonts
// (3D signs are drawn with them), then show the attract screen.
function boot() {
  Store.load();
  document.body.classList.toggle("crt-off", !Store.settings.crt);
  UI.init();
  GFX.init();

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      Scenes.frame(dt);
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
if (/debug/.test(location.hash)) window.__arcade = { Scenes, Store, UI, CHAPTERS };

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
