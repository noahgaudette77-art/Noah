// The hall's attract call, served (opened from disk the hall is as it was): Boss Rush's cabinet, left in front of the
// lens for a few seconds, calls out once, as an arcade machine in attract mode does: "Boss incoming!", in one recorded
// voice and the next time in the other. Not on a move past it, not when it is chosen (the announcer calls the game
// then), never over another line (one line at a time: it waits for the announcer, and the next line waits for it),
// and not again for a while. Sound only.
const HUB_CALL = { WAIT: 3.2, REST: 14, LINES: ["vo@adam:boss incoming", "vo@brian:boss incoming"], n: 0, last: -99 };
function hubCall(scene, dt) {
  if (!Assets.on || !Sound.ctx) return;
  if (HUB_CALL.ix === undefined) HUB_CALL.ix = CABINETS.findIndex((c) => c.id === "boss");
  if (scene.sel !== HUB_CALL.ix || scene.zooming || scene.paused || !Store.settings.sfx || !Store.settings.voice) { scene.callT = 0; scene.called = false; return; }
  if (scene.called || (scene.callT = (scene.callT || 0) + dt) < HUB_CALL.WAIT) return;
  const now = performance.now() / 1000;
  if (now - HUB_CALL.last < HUB_CALL.REST || Sound.sayAt > now) return; // (rested, and nothing being said)
  const key = [0, 1].map((j) => HUB_CALL.LINES[(HUB_CALL.n + j) % 2]).find((k) => Sound.bank[k]);
  if (!key) return; // (the voice set has not arrived, or has neither take)
  HUB_CALL.n = (HUB_CALL.LINES.indexOf(key) + 1) % 2;
  HUB_CALL.last = now;
  scene.called = true;
  Sound.sayAt = now + Math.max(0.8, Sound.bank[key][0].dur + 0.1);
  Sound.duck(0.4, 1.1, 0.7);
  Sound._cue(key, 0, { bus: Sound.voiceBus, vary: 0 });
}
