// The title, served: the containment hall. Waits (in real time) for every piece of the hall to arrive and be put in
// place, then runs the glide from the door at its own pace and keeps a still every few seconds of it, then the end
// (the logo and INSERT COIN up), a boss rattling its pod, and the coin going in.
//   node tools/capture.js tools/scenarios/title-hall.js --out <dir> [--size 390x844] [--phone]
// GLIDE_STILLS=n (default 10) stills down the glide; each is a JPG, and the stills together a strip.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const jpg = (name, q = 84) => { const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", String(q), j]); fs.unlinkSync(p); return j; };
  const still = async (name) => { await cap.shot(name); return jpg(name); };
  // every piece in: the painted vault, the pod, the six windows, the end of the hall, all twelve bosses
  const ready = () => { const s = window.__arcade.Scenes.cur; return !!(s && s.cells && s.sky && s.podMesh && s.vault && s.cabs && s.stand && s.cup && s.cells.every((c) => c.boss) && s.cells.every((c) => c.world._win.uniforms.uOn.value > 0)); };
  let ok = false;
  for (let i = 0; i < 900 && !ok; i++) { await cap.fast(4); ok = await cap.eval(ready); if (!ok) await cap.page.waitForTimeout(100); }
  const st = await cap.eval(() => { const s = window.__arcade.Scenes.cur; return { name: s.constructor.name, seated: s.cells.filter((c) => c.boss).length, sky: !!s.sky, pod: !!s.podMesh, vault: !!s.vault, cabs: !!s.cabs, cup: !!s.cup }; });
  console.log("hall ready:", ok, JSON.stringify(st));
  // the glide from the door, from its first moment (the logo and the dock wait for it)
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.state = "glide"; s.gt = 0; s.u = 0; s.mult = 1; s.hurrying = false; s.arrived = false; s.rattleIn = 1e9; const el = document.querySelector(".scr-title"); el.classList.add("gliding"); s.onArrive = () => el.classList.remove("gliding"); });
  // VIDEO=fps: the glide as a film instead (every frame kept as a PNG under video/, then made an MP4 with ffmpeg), a
  // boss rattling on the way, and four seconds at the end with the logo up
  if (process.env.VIDEO) {
    const fps = +process.env.VIDEO, step = Math.round(60 / fps), dir = path.join(cap.out, "video");
    fs.mkdirSync(dir, { recursive: true });
    await cap.eval(() => { window.__arcade.Scenes.cur.rattleIn = 5; });
    const total = Math.round((34 + 4) * fps);
    for (let k = 0; k < total; k++) { await cap.fast(step - 2); await cap.shot("video/f-" + String(k).padStart(4, "0")); }
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(dir, "f-%04d.png"), "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "24", "-movflags", "+faststart", path.join(cap.out, "glide.mp4")]);
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  }
  const n = +(process.env.GLIDE_STILLS || 10), every = Math.round((34 * 60) / (n - 1));
  const files = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) await cap.fast(every - 2);
    const name = "glide-" + String(i).padStart(2, "0");
    files.push(await still(name));
  }
  execFileSync("montage", [...files, "-tile", Math.min(n, 5) + "x", "-geometry", "260x+3+3", "-background", "#101018", "-quality", "86", path.join(cap.out, "glide-strip.jpg")]);
  // the end: the logo and INSERT COIN up (the dock's transition over)
  await cap.fast(120);
  await still("end-logo");
  // a boss near the lens rattles its pod: a short fit, its lights flare, its glass and lamp flicker
  await cap.eval(() => { const s = window.__arcade.Scenes.cur, cam = s.camera.position; const near = s.cells.filter((c) => c.boss).sort((a, b) => Math.hypot(a.x - cam.x, a.z - cam.z) - Math.hypot(b.x - cam.x, b.z - cam.z)); s.rattle(near[0]); });
  await cap.fast(20);
  await still("end-rattle");
  // INSERT COIN: the lens rushes the vault
  await cap.eval(() => document.querySelector("[data-act=start]").click());
  await cap.fast(40);
  await still("coin-rush");
};
