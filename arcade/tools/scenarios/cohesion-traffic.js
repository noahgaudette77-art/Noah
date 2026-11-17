// Phase 5 (the cohesion pass): Nest Egg Run's generated traffic by day and by night, and a near miss; Risk Blaster's
// passing ships and drifting rocks. Saved as JPGs in the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/cohesion-traffic.js --out arcade/docs/combat-pass/cohesion --dpr 2
//
// PARTS=day,night,near,ships,shipstrip keeps only some of them. The scenario places traffic and ships where the band
// shows them (test only: nothing here is part of the game).
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 86) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const still = async (name, o = {}) => jpg(await cap.shot(name, o), o.q);
  const strip = async (name, n, every, o = {}) => {
    o = Object.assign({ band: true, cols: 6, thumb: 300 }, o);
    const made = await cap.seq(name, n, every, Object.assign({}, o, { keep: true })), out = path.join(cap.out, name + ".jpg");
    const files = Array.from({ length: n }, (_, i) => path.join(cap.out, `${name}-${String(i).padStart(2, "0")}.png`));
    for (let q = 88; q >= 40; q -= 6) {
      execFileSync("montage", [...files, "-tile", o.cols + "x", "-geometry", `${o.thumb}x+3+3`, "-background", "#101018", "-quality", String(q), out]);
      if (fs.statSync(out).size <= 440 * 1024) break;
    }
    files.forEach((f) => fs.unlinkSync(f));
    fs.unlinkSync(made);
    return out;
  };
  const page = (fn, arg) => cap.eval(fn, arg);

  if (has("day") || has("night") || has("near")) {
    await cap.go("racer", "2");
    await cap.ask(1500);
    await page(() => { const s = window.__arcade.Scenes.cur; if (s.world) s.world.director.t = 1e9; });
    const hold = () => page(() => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, 0.3); s.lockT = 0; });
    const year = async (y) => { await page((yr) => { const s = window.__arcade.Scenes.cur; s.year = yr; s.skyP = yr / 40; s.hud(); }, y); for (let i = 0; i < 6; i++) { await cap.fast(50); await hold(); } };
    // a set of traffic in sight: ours on the right, oncoming on the left, one of each kind
    const fill = () => page(() => {
      const w = window.__arcade.Scenes.cur.world;
      for (const c of w.cars) if (c.on && !c.special) { c.on = false; c.mesh.setMatrixAt(c.i, new THREE.Matrix4().makeScale(0, 0, 0)); }
      const put = (type, lane, x, z, speed) => w.spawn(type, lane, { x, tx: x, z, speed, laneT: 99 });
      // (three on the main road ahead, keeping pace with the rig, so the band shows them whole; the rest on the service lanes)
      const pace = (type, x, z, dir) => { const c = w.spawn(type, "M", { special: "show", dir, x, tx: x, z, speed: 0, y: 0 }); if (c) c.plan = (cc, dt, sp) => { cc.speed = dir > 0 ? sp : -sp; }; };
      // (the answers' discs stand over the road from about 15 ahead of the rig: these keep below them)
      pace("sedan", -3.6, -9, 1); pace("truck", 3.9, -11.5, 1); pace("bus", -6.9, -20, -1);
      put("sedan", "R", 6.6, -40, 14); put("truck", "R", 8.0, -75, 13);
      put("sedan", "L", -6.6, -60, 20); put("bus", "L", -8.0, -90, 18);
      w.spawnT = { R: 99, L: 99, H: 0.3 };
    });
    if (has("day")) { await year(10); await fill(); await cap.fast(30); await hold(); await still("traffic-day", { band: true }); }
    if (has("night")) { await year(36); await fill(); await cap.fast(30); await hold(); await still("traffic-night", { band: true }); }
    if (has("near")) {
      await year(36);
      await page(() => {
        const s = window.__arcade.Scenes.cur, w = s.world;
        const c = w.spawn("sedan", "M", { special: "pass", dir: 1, x: s.carX + (s.carX > 0 ? -2.6 : 2.6), z: 14, speed: s.speed + 20, y: 0 });
        if (c) { c.tx = c.x; c.plan = (cc, dt, sp) => { cc.speed = Math.max(cc.speed, sp + 18); }; }
      });
      await cap.fast(16); // (it comes up from behind the lens)
      await strip("traffic-near-miss", 12, 3);
    }
  }

  // ---- Risk Blaster, as the run begins (the fighter flies in; the demon has not come yet, so the whole picture is open
  // space): the asteroid belt, a freighter, a tug, a wing of fighters crossing, a cruiser far off
  if (has("open")) {
    await cap.go("blaster", "3");
    await page(() => {
      const s = window.__arcade.Scenes.cur, T = s.space.traffic, sp = T.sp0;
      s.space.setRegion(1, 0.05);
      T.ships.slice().forEach((x) => { if (!x.ev) T.kill(x); });
      T.ships = T.ships.filter((x) => x.alive);
      T.cool = 99;
      T.spawn("freighter", { p: [-30, 9, -150], v: [0, 0, -sp * 0.9], life: 90 });
      T.spawn("drone", { p: [16, -4, -90], v: [0, 0, 22 - sp], weave: 0.5, s: 1.3, life: 90 });
      T.spawn("shuttle", { p: [-15, -10, -70], v: [0, 0, -sp * 0.95], life: 90 });
      T.spawn("cruiser", { p: [120, 70, -520], v: [-10, 0, -sp], life: 90 });
      [[0, 0, 0], [-2.6, 0.5, 3.4], [-2.6, -0.5, -3.4]].forEach((o) => T.spawn("fighter", { p: [-40 + o[0], 22 + o[1], -120 + o[2]], v: [26, 0, -sp], life: 90 }));
    });
    await cap.fast(28);
    await still("ships-open", { clip: { x: 0, y: 120, width: 390, height: 600 } });
    await strip("ships-open-strip", 6, 7, { band: false, clip: { x: 0, y: 120, width: 390, height: 600 }, cols: 6, thumb: 300 });
  }
  // ---- Risk Blaster mid-fight: the asteroid belt (every near rock out), a freighter, a cruiser far off, a tug, a wing of fighters
  if (has("ships") || has("shipstrip")) {
    await cap.go("blaster", "3");
    await cap.ask(1500);
    await cap.fast(150);
    await page(() => { const s = window.__arcade.Scenes.cur; s.space.setRegion(1, 0.05); s.tLeft = s.T * 0.62; });
    await cap.fast(60);
    const fleet = () => page(() => {
      const s = window.__arcade.Scenes.cur, T = s.space.traffic, sp = T.sp0;
      T.ships.slice().forEach((x) => { if (!x.ev) T.kill(x); });
      T.ships = T.ships.filter((x) => x.alive);
      T.cool = 99;
      // (where the band shows them: the freighter left of the demon, between the answers A and C; the tug right of it;
      // the shuttle low on the left; the cruiser far above; a wing of fighters crossing high)
      // (the band is narrow: at 100 ahead it shows about 22 either side of the middle)
      T.spawn("freighter", { p: [-21, 2, -112], v: [0, 0, -sp], life: 90 });
      T.spawn("drone", { p: [10.5, -2, -50], v: [0, 0, -sp], weave: 0.4, s: 1.3, life: 90 });
      T.spawn("shuttle", { p: [-7.5, -7, -44], v: [0, 0, -sp], life: 90 });
      T.spawn("cruiser", { p: [70, 58, -440], v: [-4, 0, -sp], life: 90 });
      [[0, 0, 0], [-2.6, 0.5, 3.4], [2.6, 0.5, 3.4]].forEach((o) => T.spawn("fighter", { p: [-15 + o[0], 15 + o[1], -92 + o[2]], v: [7, 0, -sp], life: 90 }));
    });
    await fleet();
    await cap.fast(50);
    if (has("ships")) await still("ships-and-rocks", { band: true });
    if (has("shipstrip")) {
      // a wing of fighters crosses high from left to right; a tug comes in toward the lens on the right; the rocks tumble past
      await page(() => {
        const T = window.__arcade.Scenes.cur.space.traffic, sp = T.sp0;
        T.ships.slice().forEach((x) => { if (!x.ev && (x.type === "fighter" || x.type === "drone")) T.kill(x); });
        T.ships = T.ships.filter((x) => x.alive);
        [[0, 0, 0], [-2.6, 0.5, 3.4], [-2.6, -0.5, -3.4]].forEach((o) => T.spawn("fighter", { p: [-27 + o[0], 12 + o[1], -84 + o[2]], v: [30, 0, -sp], life: 30 }));
        T.spawn("drone", { p: [9, -3, -125], v: [0, 0, 32 - sp], weave: 0.5, s: 1.3, life: 30 });
      });
      await cap.fast(20);
      await strip("ships-and-rocks-strip", 12, 6);
    }
  }
};
