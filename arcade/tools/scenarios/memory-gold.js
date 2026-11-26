// Memory Bank's gold at the vault door, close (the master overhaul, Phase 5: the bars and the coins' trays). The vault as
// polish.js pictures it (the same seed, the same moment), then from that same frame the window cropped round each heap
// of bars; then a narrow lens close to the left heap at the game's own angle and from higher (the stamped tops); then
// eleven cards banked, the plinth's pyramid and a heap's coins cropped. Served, on the virtual clock: a before and an
// after differ only by what changed.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/memory-gold.js --out <dir> --size 1470x830 --dpr 2
//
// GOLD=quick: only the close lens on the left heap (for trying a change); GOLD=window: only the window and its crops (a
// phone's, say). Test only: the lens is moved here, never in the game, and the cards are graded only to show the
// plinth's bars.
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
module.exports = async (cap) => {
  const quick = process.env.GOLD === "quick", windowOnly = process.env.GOLD === "window";
  const reseed = (k) => cap.eval((n) => window.__reseed && window.__reseed(n), 1000 + [...k].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const jpg = (name, q = 88) => { const p = path.join(cap.out, name + ".png"), j = path.join(cap.out, name + ".jpg"); execFileSync("convert", [p, "-quality", String(q), j]); fs.unlinkSync(p); console.log("  " + path.basename(j)); return j; };
  // the frame on the screen now, cropped (no new frame drawn: the crops are of the still just taken)
  const crop = async (name, r) => { if (!r) return; await cap.page.screenshot({ path: path.join(cap.out, name + ".png"), clip: r, timeout: 180000 }); jpg(name); };
  // where a part of the scene stands on the screen (a box round it, its corners projected), padded: round a heap of bars
  // with its coins (the same box in any build), or the plinth's pyramid
  const rectOf = (which, pad) => cap.eval(([w, p]) => {
    const s = window.__arcade.Scenes.cur, T = window.THREE, g = w === "bank" ? null : s.stacks[w === "left" ? 0 : 1];
    const box = new T.Box3();
    if (g) box.set(new T.Vector3(g.position.x - 5.5, 0, g.position.z - 3.2), new T.Vector3(g.position.x + 5.5, 3.6, g.position.z + 7.6));
    else box.set(new T.Vector3(-5.6, 0, 4.2), new T.Vector3(5.6, 4.9, 8.4));
    s.camera.updateMatrixWorld();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) {
      const v = new T.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(s.camera);
      const x = (v.x * 0.5 + 0.5) * innerWidth, y = (0.5 - v.y * 0.5) * innerHeight;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(innerWidth, x1 + p); y1 = Math.min(innerHeight, y1 + p);
    return x1 - x0 > 4 && y1 - y0 > 4 ? { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) } : null;
  }, [which, pad]);
  // the lens held close to the left heap (test only): a narrow lens in front of it, at the game's own angle down onto the
  // gold (about 14 degrees) or from higher (35: the stamped tops); the page's card and buttons hidden and the deck the
  // cards are dealt from (between that lens and the heap) left out for those stills, then put back
  const closeLens = (rise) => cap.eval((k) => {
    const s = window.__arcade.Scenes.cur, st = s.stacks[0], c = s.camera, sd = st.userData.side, V = window.THREE.Vector3;
    if (!s.__place) {
      s.__place = s.placeCamera.bind(s); s.__fov = c.fov;
      if (s.el) s.el.style.opacity = "0";
      if (s.gen && s.gen.deck) s.gen.deck.scene.visible = false;
    }
    s.placeCamera = function () {
      s.__place();
      c.clearViewOffset();
      c.fov = 32;
      // (from where the game's own lens stands, seen across the floor: the same side of the heap, closer)
      const at = st.position.clone().add(new V(-sd * 0.2, 1.1, 2.4)), far = 11.5, d = new V(s.camBase.x - at.x, 0, s.camBase.z - at.z).normalize();
      c.position.set(at.x + d.x * far, at.y + far * Math.tan(k ? 0.61 : 0.245), at.z + d.z * far);
      c.lookAt(at);
      c.updateProjectionMatrix();
    };
  }, rise);
  const lensBack = () => cap.eval(() => {
    const s = window.__arcade.Scenes.cur, c = s.camera;
    if (!s.__place) return;
    s.placeCamera = s.__place; s.__place = null; c.fov = s.__fov;
    if (s.el) s.el.style.opacity = "";
    if (s.gen && s.gen.deck) s.gen.deck.scene.visible = true;
    const G = window.__arcade.GFX; s.resize(G.w, G.h);
  });

  await reseed("memory");
  // (the title hall goes on drawing from Math.random behind the cover until the vault is built, as often as its files,
  // arriving in real time, give it things to move: the cards dealt shifted run to run. Held still for the change of
  // screen, so a before and an after deal the same cards and the vault's sparks fall alike)
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s && s.update) s.update = function () {}; });
  await cap.go("memory", "3");
  await cap.fast(220);
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); });
  if (!quick) {
    await cap.shot("gold-window");
    jpg("gold-window");
    await crop("gold-left", await rectOf("left", 26));
    await crop("gold-right", await rectOf("right", 26));
    if (windowOnly) return;
  }
  await closeLens(0);
  await cap.fast(2);
  await cap.shot("gold-close");
  jpg("gold-close");
  if (quick) return;
  await closeLens(1);
  await cap.fast(2);
  await cap.shot("gold-close-high");
  jpg("gold-close-high");
  await lensBack();
  // eleven cards banked: the plinth's pyramid two courses high, and the coins' stacks risen a coin a card
  for (let i = 0; i < 11; i++) {
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.flip(); });
    await cap.fast(30);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.grade("good"); });
    await cap.fast(70);
  }
  await cap.fast(60);
  await cap.eval(() => { const s = window.__arcade.Scenes.cur; if (s.probeNow) s.probeNow(); });
  await cap.shot("gold-banked");
  jpg("gold-banked");
  await crop("gold-banked-plinth", await rectOf("bank", 30));
  await crop("gold-banked-left", await rectOf("left", 26));
};
