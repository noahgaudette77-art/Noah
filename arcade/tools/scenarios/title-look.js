// The title hall's look, for a before and an after (the master overhaul, Phase 2's polish, 2026-11-24): the hall with
// every piece in, each still at a set place (not a run of the glide): the glide's early and middle views, its end,
// the first cell close beside it, and a still in front of each of a few cells (the bosses as a first visit finds
// them: no progress), and a wall's bay seen square on (a computer's dressing). On the virtual clock, every boss at a
// fixed moment of its idle: two runs differ only by what changed.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/title-look.js --out <dir> [--phone --size 440x956 --insets 62,34 | --size 1470x830] --dpr 1
//
// VIEWS=glide1,glide2,end,cell,cells,wall (any of them; all by default). CELLS=0,4,5,6,11 (the cells stood in front of).
// TWEAK=<js>: run in the page (s: the hall) before the stills, to try a value without building (a test's only).
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const want = (n) => !process.env.VIEWS || process.env.VIEWS.split(",").includes(n);
  const jpg = (name, q = 90) => { const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", String(q), j]); fs.unlinkSync(p); return j; };
  const still = async (name) => { await cap.shot(name); console.log("  " + path.basename(jpg(name))); };
  const ready = () => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells && s.sky && s.podMesh && s.vault && s.cabs && s.stand && s.cup && s.cells.every((c) => c.boss && c.ready) && s.cells.every((c) => c.world._win.uniforms.uOn.value > 0 && (!c.world._win.uniforms.uTopOn || c.world._win.uniforms.uTopOn.value > 0)) && s.platesIn && s.treadIn && s.brushIn); };
  let ok = false;
  for (let i = 0; i < 1500 && !ok; i++) { await cap.fast(4); ok = await cap.eval(ready); if (!ok) await cap.page.waitForTimeout(100); }
  console.log("hall ready:", ok);
  await cap.eval(() => window.__reseed && window.__reseed(4242));
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); });
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.rattleIn = 1e9; (s.cells || []).forEach((c, i) => { c.twitchIn = 1e9; if (c.idle) c.idle.time = (i * 0.37) % Math.max(0.01, c.idle.getClip().duration); c.phase = i * 1.3; if (c.mixer) c.mixer.update(0); }); document.querySelector(".scr-title").classList.add("gliding"); });
  if (process.env.TWEAK) await cap.eval((code) => new Function("s", code)(window.__arcade.Scenes.cur), process.env.TWEAK);
  // the logo, the dock and the tip are gone with a CSS transition on the page's real clock
  await cap.page.waitForTimeout(1500);
  // a place on the glide (seconds into it), held
  const glide = async (name, gt) => {
    await cap.eval((g) => { const s = window.__arcade.Scenes.cur; s.state = "glide"; s.gt = g; s.u = 0; s.mult = 1; s.hurrying = false; s.arrived = true; s.onArrive = null; }, gt);
    await cap.fast(3);
    await still(name);
  };
  if (want("glide1")) await glide("01-glide-early", 5);
  if (want("glide2")) await glide("02-glide-middle", 16);
  if (want("end")) { await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.state = "rest"; s.rest = 0; s.u = 1; }); await cap.fast(3); await still("03-end"); }
  // the lens held still at a place, looking at a point (the logo and the dock, up at the glide's end, gone again: a
  // transition on the page's real clock)
  const look = async (cam, at) => {
    await cap.eval(([c, a]) => { const s = window.__arcade.Scenes.cur; s.state = "rest"; s.rest = 0; s.place = function () { this.camBase.set(c[0], c[1], c[2]); this.lookAt.set(a[0], a[1], a[2]); this.placeCamera(); }; document.querySelector(".scr-title").classList.add("gliding"); }, [cam, at]);
    for (let i = 0; i < 30; i++) { if (await cap.eval(() => { const l = document.querySelector(".scr-title .logo"); return !l || +getComputedStyle(l).opacity < 0.01; })) break; await cap.page.waitForTimeout(100); }
  };
  if (want("cell")) {
    const c = await cap.eval(() => { const c = window.__arcade.Scenes.cur.cells[0]; return { x: c.x, z: c.z }; });
    await look([c.x * 0.28, 2.3, c.z + 4.6], [c.x, 2.35, c.z - 0.2]);
    await cap.fast(3);
    await still("04-cell-closeup");
  }
  if (want("cells")) {
    for (const k of (process.env.CELLS || "0,4,5,6,11").split(",").map(Number)) {
      const c = await cap.eval((k) => { const c = window.__arcade.Scenes.cur.cells[k]; return { x: c.x, z: c.z, fx: Math.sin(c.anchor.rotation.y), fz: Math.cos(c.anchor.rotation.y) }; }, k);
      await look([c.x + c.fx * 6.2, 2.0, c.z + c.fz * 6.2], [c.x, 2.2, c.z]);
      await cap.fast(3);
      await still("05-cell-" + String(k).padStart(2, "0"));
    }
  }
  // a bay of the left wall between the memory world's window and the pillar toward the door, square on (on a phone
  // the bare wall)
  if (want("wall")) {
    await look([-1.5, 2.6, -40.5], [-7.8, 3.2, -38.5]);
    await cap.fast(3);
    await still("06-wall-bay");
  }
};
