// The Proctor's portrait in the menus' strip of boss portraits (assets/ui/bosses.webp, its "all" cell), drawn from the
// machine as the game itself dresses it (src/js/24f-proctor.js: the owner's mech, its skin, cap, reactor and eyes), the
// way tools/gen/render.js --sprites drew the others: alone on a clear ground, from its hero view (28 degrees round, 12
// up), a white key and a cool rim, a neutral room's reflection, ACES, drawn at twice the cell and brought down.
// Written for the master overhaul's Phase 5 (2026-11-24: the Proctor as one design).
//
//   node tools/capture.js tools/scenarios/proctor-portrait.js --size 600x600 --out <dir>   (then splice <dir>/proctor.png)
//
// FOCUS=x,y,z (shares of its box; default 0.5,0.7,0.5) and FRAME (share of its size; default 0.62) frame it; EXPOSURE
// (0.72) and ENVK (how much its steel mirrors the room: 0.55) set its tone beside the strip's dark chrome.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const focus = (process.env.FOCUS || "0.5,0.7,0.5").split(",").map(Number), frame = +(process.env.FRAME || 0.62), cell = 192, expo = +(process.env.EXPOSURE || 0.72), envK = +(process.env.ENVK || 0.55);
  await cap.eval(() => window.__arcade.Assets.loadModel("boss-all-rig").then((m) => !!m));
  const url = await cap.eval(([focus, frame, size, expo, envK]) => {
    const { Assets, proctorDress } = window.__arcade;
    // a neutral room, as three.js's RoomEnvironment lays it out: a grey box, a few blocks, bright panels on the walls and ceiling
    const room = new THREE.Scene(), box = new THREE.BoxGeometry(), grey = new THREE.MeshStandardMaterial({ side: THREE.BackSide }), block = new THREE.MeshStandardMaterial();
    const add = (mat, p, s, ry = 0) => { const m = new THREE.Mesh(box, mat); m.position.set(...p); m.scale.set(...s); m.rotation.y = ry; room.add(m); };
    const lamp = (k) => { const m = new THREE.MeshBasicMaterial(); m.color.setScalar(k); return m; };
    const pl = new THREE.PointLight(0xffffff, 5, 28, 2); pl.position.set(0.418, 16.199, 0.3); room.add(pl);
    add(grey, [-0.757, 13.219, 0.717], [31.713, 28.305, 28.591]);
    add(block, [-10.906, 2.009, 1.846], [2.328, 7.905, 4.651], -0.195); add(block, [-5.607, -0.754, -0.758], [1.97, 1.534, 3.955], 0.994);
    add(block, [6.167, 0.857, 7.803], [3.927, 6.285, 3.687], 0.561); add(block, [-2.017, 0.018, 6.124], [2.002, 4.566, 2.064], 0.333);
    add(block, [2.291, -0.756, -2.621], [1.546, 1.552, 1.496], -0.286); add(block, [-2.193, -0.369, -5.547], [3.875, 3.487, 2.986], 0.516);
    add(lamp(50), [-16.116, 14.37, 8.208], [0.1, 2.428, 2.739]); add(lamp(50), [-16.109, 18.021, -8.207], [0.1, 2.425, 2.751]);
    add(lamp(17), [14.904, 12.198, -1.832], [0.15, 4.265, 6.331]); add(lamp(43), [-0.462, 8.89, 14.52], [4.38, 5.441, 0.088]);
    add(lamp(20), [3.235, 11.486, -12.541], [2.5, 2, 0.1]); add(lamp(100), [0, 20, 0], [1, 0.1, 1]);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size * 2;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = expo; r.setClearColor(0x000000, 0);
    const pm = new THREE.PMREMGenerator(r), env = pm.fromScene(room, 0.04).texture;
    const scene = new THREE.Scene();
    scene.environment = env;
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.6); rim.position.set(-4, 3, -5); scene.add(rim);
    const m = Assets.model("boss-all-rig");
    if (!m) return null;
    proctorDress(m, env, { env: envK, boneEnv: envK * 0.7 });
    m.proctor.light(1, 0);
    scene.add(m.scene);
    m.scene.updateMatrixWorld(true);
    m.proctor.light(1, 0);
    const b = new THREE.Box3().setFromObject(m.scene), s = b.getSize(new THREE.Vector3());
    const c = new THREE.Vector3(b.min.x + s.x * focus[0], b.min.y + s.y * focus[1], b.min.z + s.z * focus[2]);
    const R = 0.5 * s.length() * frame, cam = new THREE.PerspectiveCamera(30, 1, R * 0.05, R * 30), dist = (R / Math.sin(THREE.MathUtils.degToRad(15))) * 0.92;
    const a = THREE.MathUtils.degToRad(28), e = THREE.MathUtils.degToRad(12);
    cam.position.set(c.x + dist * Math.sin(a) * Math.cos(e), c.y + dist * Math.sin(e), c.z + dist * Math.cos(a) * Math.cos(e));
    cam.lookAt(c);
    r.render(scene, cam);
    return canvas.toDataURL("image/png");
  }, [focus, frame, cell, expo, envK]);
  if (!url) { console.log("no portrait: the skeleton's file did not load"); return; }
  const out = path.join(cap.out, "proctor-big.png");
  fs.writeFileSync(out, Buffer.from(url.split(",")[1], "base64"));
  require("child_process").execFileSync("convert", [out, "-resize", cell + "x" + cell, path.join(cap.out, "proctor.png")]);
  console.log("  proctor.png (" + cell + " px), from", out);
};
