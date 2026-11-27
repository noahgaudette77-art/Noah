// The combat effects kit on its own, in Boss Rush's arena: every recipe once, as a strip of frames.
module.exports = async (cap) => {
  await cap.go("boss", "4");
  await cap.ask(1200);
  await cap.eval(() => {
    const A = window.__arcade, s = A.Scenes.cur;
    const fx = (window.__fx = new A.CombatFX(s, { unit: 1, ground: 0 }));
    const up = s.update.bind(s);
    s.update = (dt) => { up(dt); fx.update(A.VFX.dt); };
    s.charge = 0; s.T = 1e9; // hold the question's clock: this is a look at effects, not a game
  });
  const V = (x, y, z) => `new THREE.Vector3(${x},${y},${z})`;
  const run = async (name, js, n = 8, every = 3) => { await cap.eval(js); return cap.seq(name, n, every, { thumb: 300, band: true, cols: 5 }); };
  await cap.fast(30);
  await run("01-bolt-impact", `(() => { const fx = window.__fx; fx.muzzle(${V(-3, 1.2, 9)}, ${V(0.3, 0.2, -1)}, 0x35efff, 1); fx.bolt(${V(-3, 1.2, 9)}, ${V(0, 4, 0.5)}, 0x35efff, { dur: 0.14, onHit: (p) => fx.impact(p, 0x35efff, { size: 1.3 }) }); })()`, 8, 2);
  await cap.fast(40);
  await run("02-fizzle", `window.__fx.fizzle(${V(0, 4, 1.5)}, { size: 1.4 })`, 8, 3);
  await cap.fast(40);
  await run("03-explosion", `window.__fx.explosion(${V(0, 3.5, 1.5)}, { size: 1.3, color: 0xff8a2a })`, 10, 4);
  await cap.fast(60);
  await run("04-beam-marks", `(() => { const fx = window.__fx; fx.mark("lock", ${V(0, 2.2, 8)}, 0xff4769, { size: 2.6, dur: 0.9 }); fx.mark("ring", ${V(2.5, 0.05, 5)}, 0xff4769, { size: 4, dur: 0.9, flat: true }); fx.mark("bang", ${V(-2.6, 3, 4)}, 0xffe14f, { size: 1.6, dur: 0.9 }); fx.beam(${V(0, 5, 0.5)}, ${V(-1, 1, 9)}, 0xff4769, { dur: 0.7, width: 0.5 }); })()`, 8, 5);
  await cap.fast(40);
  await run("05-hull-debris-trail", `(() => { const fx = window.__fx; fx.hull(${V(1.5, 3, 2)}, 0xffe14f, { size: 1.2 }); fx.debris(${V(-1.5, 4, 2)}, { n: 12, size: 1.1, speed: 8 }); window.__tr = fx.trailer((v) => v.set(2.5 + Math.sin(performance.now() / 300), 2.5, 3), { smoke: 1, fire: 0.6, sparks: 0.4, rate: 30 }); })()`, 10, 5);
};
