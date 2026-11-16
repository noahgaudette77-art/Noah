// Nest Egg Run, for review: stills of the drive under each of the five skies, and a strip of frames for each moment
// (the start, a lane change, a right gate, a wrong gate and its crash, taking damage with the whole screen, a near
// miss, a boost, the last-life state, an insured crash, early retirement, retirement at 65), plus whole-screen
// stills of a question and of an explanation sheet, and one clean still of the rig. Saved as JPGs in the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/racer-run.js --out arcade/docs/combat-pass/racer --dpr 2
//
// (parts: start, question, skies, beauty, tunnel, lane, boost, right, explain, wrong, damage, insured, near, low, finish, early)
//
// PARTS=skies,right,... keeps only some of them (see `has` below); STAGE picks the questions (default 2).
// The scenario sets state in the page to reach a moment quickly (which year of the career, how many crashes, a
// policy in hand, where the gate is): test only. Nothing here is part of the game.
const fs = require("fs"), path = require("path");
const { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = process.env.PARTS || "all", has = (n) => want === "all" || want.split(",").includes(n);
  const jpg = (png, q = 88) => { const out = png.replace(/\.png$/, ".jpg"); execFileSync("convert", [png, "-quality", String(q), out]); fs.unlinkSync(png); return out; };
  const still = async (name, o = {}) => jpg(await cap.shot(name, o), o.q);
  // a strip of frames as one JPG, kept under about 450 KB (the frames are set side by side here, at the quality that fits)
  const strip = async (name, n, every, o = {}) => {
    o = Object.assign({ band: true, cols: 6, thumb: 300 }, o, process.env.THUMB ? { thumb: +process.env.THUMB } : {});
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
  const STAGE = process.env.STAGE || "2";
  // a new run, its question up; nothing happens in the sky or on the road that the scenario did not ask for
  const begin = async (wait = 40) => { await cap.go("racer", STAGE); await cap.ask(1500); await page(() => { const s = window.__arcade.Scenes.cur; if (s.world) s.world.director.t = 1e9; }); await cap.fast(wait); };
  // the next question up, its gate held `gp` of the way along
  const ready = async (wait = 30, gp = 0.3) => { await cap.next(); await cap.ask(1500); await cap.fast(wait); await page((k) => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, k); s.lockT = 0; }, gp); };
  const hold = (gp = 0.3) => page((k) => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, k); }, gp);
  // the year of the career (and with it the landscape and its sky: the change is made behind its bank of fog)
  const year = async (y) => { await page((yr) => { const s = window.__arcade.Scenes.cur; s.year = yr; s.skyP = yr / 40; s.hud(); }, y); for (let i = 0; i < 6; i++) { await cap.fast(50); await hold(0.3); } };
  const set = (o) => page((v) => { const s = window.__arcade.Scenes.cur; Object.assign(s, v); s.hud(); if (s.stage) s.stage.setLow(s.crashes >= 3 ? 2 : s.crashes === 2 ? 1 : 0); }, o);
  // a lane is taken (right, wrong, or a slot) and the rig floors it; frames run until `lead` of them are left before the gate
  const drive = async (k, lead = 2, settle = 26) => {
    await cap.answer(k);
    await cap.fast(settle);
    await page(() => { window.__arcade.Scenes.cur.boost(); });
    for (let i = 0; i < 240; i++) { if (await page((l) => { const s = window.__arcade.Scenes.cur; return s.state !== "ask" || (1 - s.gp) / (s.boostRate || 1) <= l / 60; }, lead)) break; await cap.fast(1); }
  };
  const sheet = () => cap.until(() => !!window.__arcade.Scenes.cur.quiz.sheet, 240);
  // the whole screen down to the foot of the band (the HUD, the question, the picture)
  const upper = async () => { const b = await cap.band(0); return { x: 0, y: 0, width: b.width, height: b.y + b.height }; };
  // (The coins that fly to the nest egg are page animations, which run on the real clock: a capture steps a virtual
  // one. For the capture they are stepped with the frames instead.)
  const stepAnimations = () => page(() => {
    if (window.__stepped) return;
    window.__stepped = true;
    const animate = Element.prototype.animate, live = [];
    Element.prototype.animate = function (frames, o) { const a = animate.call(this, frames, o); a.pause(); live.push({ a, t0: performance.now() }); return a; };
    const step = () => { const now = performance.now(); for (const x of live) { try { x.a.currentTime = now - x.t0; } catch (e) { /* gone */ } } requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  // ---- the start: the rig drives in from behind the lens as the run begins (the question is not up yet)
  if (has("start")) {
    await cap.go("racer", STAGE);
    await page(() => { const s = window.__arcade.Scenes.cur; if (s.world) s.world.director.t = 1e9; });
    await strip("06-start", 12, 7, { band: false, cols: 6, thumb: 250 });
    await cap.ask(1500);
    await cap.fast(40);
  } else await begin();
  await stepAnimations();

  // ---- a question, whole screen; the drive under each of the five skies
  if (has("question")) { await hold(0.4); await cap.fast(20); await still("17-question-full", { q: 86 }); }
  if (has("skies")) {
    const SKIES = [[0, "01-sky-dawn"], [10, "02-sky-day"], [20, "03-sky-golden"], [28, "04-sky-dusk"], [36, "05-sky-night"]];
    for (const [y, name] of SKIES) {
      await year(y);
      await page(() => { window.__arcade.Scenes.cur.gp = 0.5; });
      await cap.fast(8);
      await still(name, { band: true, q: 90 });
    }
    await year(10); await year(0); // (a sky is chosen as its landscape is entered: back into the city by way of the coast, for its dawn)
  }
  // ---- one clean still of the rig: from behind and a little to one side, close, under the day sky
  if (has("beauty")) {
    await year(10);
    await page(() => {
      const s = window.__arcade.Scenes.cur;
      s.__place = s.placeCamera; s.__fov = s.camera.fov;
      if (s.laneTags) s.laneTags.visible = false; // (the lane badges are drawn from the game's own lens: they have no place in a test camera's picture)
      s.placeCamera = () => { s.camera.position.set(s.carX - 5.2, 3.5, 7.0); s.camera.lookAt(s.carX + 0.1, 0.95, -0.5); };
      s.camera.fov = 64; s.camera.updateProjectionMatrix();
      s.gp = 0.2;
    });
    await cap.fast(10);
    await still("19-beauty", { band: true, q: 93 });
    await page(() => { const s = window.__arcade.Scenes.cur; s.placeCamera = s.__place; s.camera.fov = s.__fov; s.camera.updateProjectionMatrix(); if (s.laneTags) s.laneTags.visible = true; });
    await year(0);
  }
  // ---- a tunnel, driven through: its mouth comes up the road (dark, in its wall, a rim of light round it); then the
  // way out (an opening bright with the sky beyond, growing) and the open road under a whole sky. And one change
  // from an open landscape into the next, with no tunnel between them: a bank of mist in the sky's own colour.
  if (has("tunnel")) {
    const to = (y) => page((yr) => { const s = window.__arcade.Scenes.cur; s.year = yr; s.skyP = yr / 40; s.hud(); }, y);
    const settle = async () => { for (let i = 0; i < 4; i++) { await cap.fast(50); await hold(0.3); } };
    await year(6);
    await to(7);
    await strip("20-into-the-tunnel", 12, 9);
    await settle();
    await to(8);
    await strip("21-out-of-the-tunnel", 12, 9);
    await settle();
    await year(15);
    await to(16);
    await strip("22-coast-to-desert", 12, 14);
    await year(0);
  }
  // ---- a lane change: the body rolls, the front wheels steer, the egg rocks and settles
  if (has("lane")) {
    await ready(30, 0.25);
    // (a question with four lanes, for a change right across the road: any with fewer are answered on the way to it)
    for (let i = 0; i < 5 && (await page(() => window.__arcade.Scenes.cur.round.n)) < 4; i++) { await cap.answer("R"); await sheet(); await cap.fast(20); await ready(30, 0.25); }
    await cap.answer(0);
    await cap.fast(50);
    await page(() => { const s = window.__arcade.Scenes.cur; s.lockT = 0; s.gp = Math.min(s.gp, 0.3); });
    await page(() => { const s = window.__arcade.Scenes.cur; s.pick(s.round.n - 1); s.lockT = 9; }); // (to the far lane: a question has two to four)
    await strip("07-lane-change", 12, 3);
    await page(() => { const s = window.__arcade.Scenes.cur; s.lockT = 0.01; });
    await sheet();
    await cap.fast(30);
  }
  // ---- a boost: the roar, flames from both stacks, the squat, the light on the road
  if (has("boost")) {
    await ready(30, 0.2);
    await cap.answer("R");
    await cap.fast(24);
    await page(() => { const s = window.__arcade.Scenes.cur; s.T = 30; s.gp = 0.1; s.boost(); s.boostRate = 0.25; });
    await cap.fast(2);
    await strip("12-boost", 12, 4);
    await page(() => { const s = window.__arcade.Scenes.cur; s.boostRate = 3; });
    await sheet();
    await cap.fast(30);
  }
  // ---- a right gate: the clean burst, the rings, coins to the nest egg; then the explanation, whole screen
  if (has("right")) {
    await ready(30, 0.3);
    await page(() => { window.__arcade.Scenes.cur.run.streak = 0; }); // (a plain right gate: not the fifth in a row, which also issues a policy)
    await drive("R", 5);
    await strip("08-right-gate", 12, 2);
    await sheet();
    await cap.fast(30);
    if (has("explain")) await still("18-explanation-full", { q: 86 });
  }
  // ---- a wrong gate and its crash: the pane breaks, the blow, the half-spin and the catch
  if (has("wrong")) {
    await set({ crashes: 0, insurance: 0 });
    await ready(30, 0.3);
    await drive("W", 5);
    await strip("09-wrong-gate-crash", 18, 2, { cols: 6 });
    await sheet();
    await cap.fast(30);
  }
  // ---- taking damage, with the whole screen: the life that breaks, the HUD's cracks, the red edge
  if (has("damage")) {
    await set({ crashes: 0, insurance: 0 });
    await ready(30, 0.3);
    await drive("W", 1);
    await strip("10-taking-damage", 12, 2, { band: false, clip: await upper(), cols: 6, thumb: 300 });
    await sheet();
    await cap.fast(30);
  }
  // ---- an insured crash: the policy takes the blow
  if (has("insured")) {
    await set({ crashes: 0, insurance: 1 });
    await ready(30, 0.3);
    await drive("W", 2);
    await strip("14-insured-crash", 12, 2);
    await sheet();
    await cap.fast(30);
  }
  // ---- a near miss: something overtakes close by
  if (has("near")) {
    await set({ crashes: 0, insurance: 0 });
    await ready(30, 0.2);
    await cap.answer(1);
    await page(() => { window.__arcade.Scenes.cur.lockT = 9; });
    await cap.fast(40);
    await page(() => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, 0.25); s.world.director.force("near-miss"); });
    await cap.fast(22);
    await strip("11-near-miss", 12, 2);
    await page(() => { const s = window.__arcade.Scenes.cur; s.lockT = 0.01; });
    await sheet();
    await cap.fast(30);
  }
  // ---- the last life: the red frame that swells with the alarm, the burning stack
  if (has("low")) {
    await set({ crashes: 1, insurance: 0 });
    await ready(30, 0.3);
    await drive("W", 2);
    await sheet();
    await cap.fast(40);
    await ready(40, 0.3);
    await year(3); // (in the open, downtown: the fire and its smoke are seen against the street)
    await strip("13-last-life", 12, 6);
  }
  // ---- retirement at 65: the last gate of the career, taken right
  if (has("finish")) {
    await begin();
    await year(28); await year(39); // (the last city is entered from the mountains, as in a career: its sky is the night's)
    await set({ crashes: 0, insurance: 0, egg: 1180000, peak: 1180000 });
    await ready(30, 0.3);
    await drive("R", 2);
    await sheet();
    await cap.fast(40);
    await cap.next();
    await strip("16-retirement-65", 12, 9);
  }
  // ---- early retirement: the third crash, and what follows it
  if (has("early")) {
    await begin();
    await year(4);
    await set({ crashes: 2, insurance: 0 });
    await ready(30, 0.3);
    await drive("W", 2);
    await sheet();
    await cap.fast(50);
    await cap.next();
    await strip("15-early-retirement", 12, 9);
  }
};
