// The hero car of Nest Egg Run: an original armored rally coupe. Gunmetal plating in
// chamfered, bolted layers; mint trim that glows; knobbly tyres on pale five-spoke
// rims with brake discs that heat up; a working roof light bar; a louvred rear
// window; a tubular rear guard. The body rides on springs over wheels that stay on
// the road: it heaves over bumps, rolls in lane changes, squats under boost and
// dives under braking. Look only: nothing here feeds back into the game.

// A box w x h x d whose top edges (or every edge) are chamfered by c.
function racerPlate(w, h, d, c = 0.025, all = false) {
  const hw = w / 2, hd = d / 2, hh = h / 2;
  c = Math.min(c, hw * 0.9, hd * 0.9, all ? hh * 0.9 : h * 0.9);
  const ring = (iw, id, y) => [[-iw, y, -id], [iw, y, -id], [iw, y, id], [-iw, y, id]];
  const rings = all
    ? [ring(hw - c, hd - c, -hh), ring(hw, hd, -hh + c), ring(hw, hd, hh - c), ring(hw - c, hd - c, hh)]
    : [ring(hw, hd, -hh), ring(hw, hd, hh - c), ring(hw - c, hd - c, hh)];
  const pos = [];
  const quad = (a, b, c2, d2) => pos.push(...a, ...b, ...c2, ...a, ...c2, ...d2);
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(rings[r][i], rings[r + 1][i], rings[r + 1][j], rings[r][j]); }
  }
  const top = rings[rings.length - 1], bot = rings[0];
  quad(top[0], top[3], top[2], top[1]);
  quad(bot[0], bot[1], bot[2], bot[3]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
// A round tube between two points.
function racerTube(b, cyl, a, c, r, color, k = 1, v = {}) {
  const d = new THREE.Vector3().subVectors(c, a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  b.add(cyl, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), q, new THREE.Vector3(r, d.length(), r)), color, k, v);
}
// (BODY: the shell is a champagne-gold lacquer, the nest egg's colour; the armour bolted over it stays gunmetal.)
const RACER_CAR = { BODY: 0xc88a2a, STEEL: 0x2b3139, PLATE: 0x4d5764, DARK: 0x14171c, RUBBER: 0x0a0b0e, MINT: 0x4fd69c, RIM: 0xd2d9de, BOLT: 0x8b949d, DISC: 0x5b6169 };
const RACER_WHEELS = [[-1.07, -1.25], [1.07, -1.25], [-1.07, 1.3], [1.07, 1.3]];
const RACER_WHEEL_Y = 0.5;

// One wheel, axle along x, outer face toward +x: a bulged tyre with two staggered
// rows of tread blocks, a dished pale rim with five spokes, hub, lug nuts, brake disc.
function racerWheelGeo() {
  const C = RACER_CAR;
  const b = new RacerBatch(), f = new RacerBatch(); // f: the fine detail, built as a second mesh
  const toX = racerM(0, 0, 0, 1, 1, 1, 0, 0, -Math.PI / 2); // lathe/cylinder axis y -> x
  const V = (r, x) => new THREE.Vector2(r, x);
  const tyre = new THREE.LatheGeometry([V(0.3, -0.2), V(0.39, -0.235), V(0.45, -0.215), V(0.474, -0.15), V(0.474, 0.15), V(0.45, 0.215), V(0.39, 0.235), V(0.3, 0.2)], 20);
  b.add(tyre, toX, C.RUBBER);
  const block = racerPlate(0.17, 0.05, 0.105, 0.018);
  for (let k = 0; k < 16; k++) {
    for (const row of [-1, 1]) {
      const a = ((k + (row > 0 ? 0.5 : 0)) / 16) * Math.PI * 2;
      f.add(block, racerM(row * 0.105, Math.sin(a) * 0.49, Math.cos(a) * 0.49, 1, 1, 1, Math.PI / 2 - a, row * 0.22, 0), C.RUBBER);
    }
  }
  // sidewall ribs: a ring of small blocks on the outer shoulder
  const rib = racerPlate(0.03, 0.02, 0.05, 0.006);
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    f.add(rib, new THREE.Matrix4().makeRotationX(a).multiply(racerM(0.232, 0, 0.405, 1, 1, 1, 0, 0, -Math.PI / 2)), C.RUBBER);
  }
  // rim: lip, dished face
  const lip = new THREE.LatheGeometry([V(0.3, 0.2), V(0.318, 0.222), V(0.3, 0.246), V(0.278, 0.232)], 20);
  b.add(lip, toX, C.RIM);
  const dish = new THREE.LatheGeometry([V(0.0, 0.07), V(0.11, 0.07), V(0.262, 0.13), V(0.285, 0.232)], 20);
  b.add(dish, toX, 0x9aa3ab);
  // five split spokes
  const spoke = racerPlate(0.05, 0.04, 0.2, 0.014);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    for (const off of [-0.036, 0.036]) {
      b.add(spoke, new THREE.Matrix4().makeRotationX(a).multiply(racerM(0.2, off, 0.178, 1, 1, 1, off * 2.6, 0, -Math.PI / 2)), C.RIM);
    }
  }
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  b.add(cyl, racerM(0.17, 0, 0, 0.078, 0.14, 0.078, 0, 0, -Math.PI / 2), C.DARK); // hub
  b.add(cyl, racerM(0.245, 0, 0, 0.04, 0.012, 0.04, 0, 0, -Math.PI / 2), C.MINT); // centre cap
  for (let k = 0; k < 5; k++) {
    const a = ((k + 0.5) / 5) * Math.PI * 2;
    f.add(cyl, racerM(0.238, Math.sin(a) * 0.055, Math.cos(a) * 0.055, 0.013, 0.02, 0.013, 0, 0, -Math.PI / 2), C.BOLT);
  }
  b.add(cyl, racerM(0.1, 0, 0, 0.245, 0.022, 0.245, 0, 0, -Math.PI / 2), C.DISC); // brake disc
  f.add(cyl, racerM(-0.12, 0, 0, 0.3, 0.2, 0.3, 0, 0, -Math.PI / 2), C.DARK); // inner barrel
  [tyre, block, rib, lip, dish, spoke, cyl].forEach((g) => g.dispose());
  return { core: b.build("color"), fine: f.build("color") };
}

// Gunmetal paint with what real plating has: matte where it is rubber or recess,
// seams between panels, road grime low down and a worn, uneven gloss.
function racerCarPaint(env, hull) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.84, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3, envMap: env, envMapIntensity: 1.2, flatShading: true });
  m.userData.rim = { value: new THREE.Color(0.2, 0.42, 0.5) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCarRim = m.userData.rim;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCarP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvCarP = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vCarP;
        uniform vec3 uCarRim;
        float carH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float carN(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(carH(i), carH(i + vec2(1.0, 0.0)), f.x), mix(carH(i + vec2(0.0, 1.0)), carH(i + vec2(1.0, 1.0)), f.x), f.y); }
        float carSeam(float v, float at, float w){ return 1.0 - smoothstep(w, w * 2.2, abs(v - at)); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float carMetal = smoothstep(0.055, 0.115, dot(vColor, vec3(0.3333)));
        ${hull ? `float carFlank = step(0.93, abs(vCarP.x)) * step(vCarP.y, 0.84) * step(0.34, vCarP.y);
        float carTop = step(0.72, vCarP.y) * step(abs(vCarP.x), 0.9);
        float carLines = carFlank * max(max(carSeam(vCarP.z, -0.56, 0.007), carSeam(vCarP.z, 0.7, 0.007)), carSeam(vCarP.y, 0.47, 0.006));
        carLines = max(carLines, carTop * step(vCarP.z, -0.98) * max(carSeam(abs(vCarP.x), 0.66, 0.006), carSeam(vCarP.z, -1.93, 0.007)));
        carLines = max(carLines, carTop * step(1.56, vCarP.z) * max(carSeam(abs(vCarP.x), 0.7, 0.006), carSeam(vCarP.z, 1.6, 0.007)));
        diffuseColor.rgb *= 1.0 - 0.72 * carLines;
        float carGrime = carN(vCarP.xz * vec2(5.0, 2.2) + vCarP.y * 3.0);
        diffuseColor.rgb *= mix(0.7 + 0.14 * carGrime, 1.0, smoothstep(0.24, 0.6, vCarP.y));` : ""}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        float carWear = carN(vCarP.zy * 7.0 + vCarP.x * 5.0) * 0.6 + carN(vCarP.xz * 23.0) * 0.4;
        roughnessFactor = mix(0.94, clamp(roughnessFactor * (0.78 + 0.5 * carWear), 0.08, 1.0), carMetal);
        float carBody = smoothstep(0.18, 0.34, vColor.r - vColor.b); // the gold shell: a deep, glossy lacquer
        roughnessFactor = mix(roughnessFactor, clamp(0.36 + 0.14 * carWear, 0.05, 1.0), carBody);
        // roof, rear deck and wing: the plates that face up. A low sun dead ahead mirrors off them straight into
        // the chase camera and burns them out to white bars, so their finish is a satin non-slip, not a mirror.
        vec3 carFaceN = normalize(cross(dFdx(vCarP), dFdy(vCarP)));
        float carUp = smoothstep(0.8, 0.97, abs(carFaceN.y)) * smoothstep(0.86, 0.96, vCarP.y);
        roughnessFactor = mix(roughnessFactor, max(roughnessFactor, 0.7), carUp);`)
      .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>
        material.clearcoat *= 1.0 - 0.9 * carUp;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance += vColor * (smoothstep(0.62, 0.8, dot(vColor, vec3(0.3333))) * 0.2); // pale rims stay pale at night
        // the sky's light catches every edge turned away from the camera: the car keeps its outline on a dark road
        totalEmissiveRadiance += uCarRim * (pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 3.0) * carMetal * (1.0 - 0.75 * carUp));`)
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor *= carMetal; metalnessFactor = mix(metalnessFactor, 0.45, smoothstep(0.18, 0.34, vColor.r - vColor.b));");
  };
  m.customProgramCacheKey = () => "racer-car-paint4-" + (hull ? 1 : 0);
  return surfaceDetail(m, { scale: 2.4, height: 0.0009, grain: 0.7, scratch: 1.2, smudge: 0.35 }); // (orange peel in the lacquer, hair scratches, road film)
}

class RacerCar {
  constructor(game) {
    this.g = game;
    const C = RACER_CAR;
    const env = game.env || null;
    const car = (this.car = new THREE.Group()); // lane position and spin (gameplay-driven)
    const rig = (this.rig = new THREE.Group()); // steering yaw
    rig.position.z = RACER_CAR_Z;
    car.add(rig);
    const chassis = (this.chassis = new THREE.Group()); // sprung: heave, roll, pitch
    const wheelBase = (this.wheelBase = new THREE.Group()); // unsprung: stays on the road
    rig.add(wheelBase, chassis);
    this.paint = racerCarPaint(env, true);
    this.wheelPaint = racerCarPaint(env, false);
    this.glass = new THREE.MeshStandardMaterial({ color: 0x0a1216, metalness: 0.9, roughness: 0.07, envMap: env, envMapIntensity: 1.9, flatShading: true });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
    const hex = new THREE.CylinderGeometry(0.022, 0.022, 0.022, 6);
    // Two batches: `paint` is the car's shape; `fine` is the small stuff (bolts,
    // vents, fittings, flaps).
    const paint = new RacerBatch(), fine = new RacerBatch();
    const L = new RacerBatch(["aCh"]); // lights and glowing trim, by channel
    const plateInto = (b) => (w, h, d, x, y, z, color, rx = 0, ry = 0, rz = 0, c = 0.025, all = false) => { const g = racerPlate(w, h, d, c, all); b.add(g, racerM(x, y, z, 1, 1, 1, rx, ry, rz), color); g.dispose(); };
    const P = plateInto(paint), Pf = plateInto(fine);
    const bolt = (x, y, z, rx = 0, rz = 0) => fine.add(hex, racerM(x, y, z, 1, 1, 1, rx, 0, rz), C.BOLT);
    const tube = (ax, ay, az, bx, by, bz, r, color) => racerTube(paint, cyl, new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), r, color);
    const tubeF = (ax, ay, az, bx, by, bz, r, color) => racerTube(fine, cyl, new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz), r, color);
    const lamp = (ch, w, h, d, x, y, z, color, k) => L.add(box, racerM(x, y, z, w, h, d), color, k, { aCh: ch });
    const H = Math.PI / 2;

    // --- the hull ------------------------------------------------------------
    const bodyGeo = racerLoft(RACER_BODY, racerBodyRing, true);
    paint.add(bodyGeo, null, C.BODY);
    bodyGeo.dispose();

    // --- front: bumper, skid plate, bull bar, winch, lamps, grille -----------
    P(1.92, 0.13, 0.27, 0, 0.47, -2.25, C.PLATE, -H, 0, 0, 0.035);
    P(1.5, 0.03, 0.42, 0, 0.27, -2.12, C.DARK, 0.5);
    [-0.52, 0.52].forEach((x) => { tube(x, 0.3, -2.37, x, 0.88, -2.35, 0.03, C.PLATE); tube(x, 0.6, -2.36, x, 0.6, -2.2, 0.024, C.PLATE); });
    tube(-0.72, 0.88, -2.35, 0.72, 0.88, -2.35, 0.03, C.PLATE);
    tube(-0.52, 0.62, -2.37, 0.52, 0.62, -2.37, 0.024, C.PLATE);
    fine.add(cyl, racerM(0, 0.44, -2.4, 0.06, 0.34, 0.06, 0, 0, H), C.DARK); // winch drum
    Pf(0.07, 0.03, 0.1, 0, 0.36, -2.44, C.MINT, 0.3);
    [-0.63, 0.63].forEach((x) => {
      P(0.42, 0.05, 0.17, x, 0.66, -2.21, C.DARK, -H, 0, 0, 0.02);
      lamp(8, 0.31, 0.095, 0.02, x, 0.67, -2.245, 0xfff0d2, 4.2); // headlights
      lamp(0, 0.31, 0.018, 0.02, x, 0.595, -2.245, 0xffa53d, 1.9); // amber running strip
      [-0.11, 0, 0.11].forEach((dx) => Pf(0.012, 0.012, 0.1, x + dx, 0.67, -2.25, C.DARK));
    });
    for (let i = 0; i < 4; i++) Pf(0.74, 0.02, 0.03, 0, 0.59 + i * 0.047, -2.215, C.DARK, -0.4);
    // --- hood: scoop with a dark mouth, vents, pins --------------------------
    P(0.64, 0.095, 0.84, 0, 0.865, -1.2, C.PLATE, 0.055, 0, 0, 0.04);
    P(0.5, 0.055, 0.03, 0, 0.87, -1.635, C.DARK, 0.055);
    [-1, 1].forEach((sx) => {
      for (let i = 0; i < 3; i++) Pf(0.27, 0.016, 0.075, sx * 0.55, 0.805 + i * 0.006, -0.78 - i * 0.135, C.DARK, 0.34);
      bolt(sx * 0.44, 0.775, -1.78);
      bolt(sx * 0.28, 0.918, -0.84);
      bolt(sx * 0.28, 0.9, -1.56);
    });
    // --- cabin armour: pillars, visor, roof plate ----------------------------
    P(1.27, 0.045, 0.8, 0, 1.3, 0.15, C.PLATE, 0, 0, 0, 0.03); // (the roof stays gunmetal: under the light bar a gold one burned out to white)
    P(1.24, 0.03, 0.24, 0, 1.262, -0.31, C.STEEL, -0.5, 0, 0, 0.02); // visor over the windscreen
    [-1, 1].forEach((sx) => {
      racerStrut(paint, box, new THREE.Vector3(sx * 0.8, 0.79, -0.95), new THREE.Vector3(sx * 0.615, 1.275, -0.2), 0.075, C.STEEL);
      racerStrut(paint, box, new THREE.Vector3(sx * 0.825, 0.85, 0.16), new THREE.Vector3(sx * 0.62, 1.28, 0.16), 0.09, C.STEEL);
      racerStrut(paint, box, new THREE.Vector3(sx * 0.615, 1.29, 0.5), new THREE.Vector3(sx * 0.81, 0.975, 1.5), 0.08, C.STEEL);
      [[-0.18, -0.2], [0.48, -0.2], [-0.18, 0.5], [0.48, 0.5]].forEach(([x, z]) => bolt(sx * (0.33 + x * 0.3) * 1.6, 1.325, z * 0.9 + 0.15));
      // wing mirror
      racerStrut(fine, box, new THREE.Vector3(sx * 0.84, 0.86, -0.74), new THREE.Vector3(sx * 1.02, 0.94, -0.76), 0.03, C.DARK);
      Pf(0.17, 0.1, 0.05, sx * 1.06, 0.96, -0.75, C.STEEL, 0, 0, 0, 0.02, true);
    });
    // --- over the rear window: open glass, a spine fin down the middle, a rail either side -------
    {
      const a0 = new THREE.Vector3(0, 1.31, 0.52), a1 = new THREE.Vector3(0, 1.0, 1.52), ang = Math.atan2(a0.y - a1.y, a1.z - a0.z);
      P(0.035, 0.2, 1.08, 0, 1.25, 1.02, C.BODY, ang, 0, 0, 0.012, true); // the fin
      P(0.05, 0.03, 1.06, 0, 1.165, 1.02, C.STEEL, ang, 0, 0, 0.01); // its foot
      [-1, 1].forEach((sx) => racerStrut(paint, box, new THREE.Vector3(sx * 0.6, 1.3, 0.5), new THREE.Vector3(sx * 0.78, 0.99, 1.5), 0.045, C.PLATE));
    }
    // --- roof light bar: stanchions, rail, four pods -------------------------
    [-0.58, 0.58].forEach((x) => P(0.06, 0.11, 0.1, x, 1.375, -0.1, C.PLATE));
    tube(-0.66, 1.43, -0.1, 0.66, 1.43, -0.1, 0.022, C.PLATE);
    [-0.45, -0.15, 0.15, 0.45].forEach((x, i) => {
      P(0.25, 0.14, 0.17, x, 1.485, -0.1, C.DARK, 0, 0, 0, 0.03, true);
      Pf(0.27, 0.02, 0.2, x, 1.565, -0.1, C.PLATE, 0, 0, 0, 0.012); // cowl
      lamp(2, 0.19, 0.088, 0.02, x, 1.485, -0.19, 0xdff4ff, 3.4); // the lamps face forward
      lamp(3 + i, 0.12, 0.05, 0.02, x, 1.485, -0.01, 0xffa53d, 1.45); // amber markers face the driver behind (lit, not blazing: four of them side by side bloomed into one blob over the roof)
    });
    // --- flanks: door armour in two layers, skirts, flares, flaps ------------
    [-1, 1].forEach((sx) => {
      const rz = -sx * H;
      P(0.4, 0.04, 1.32, sx * 1.012, 0.6, 0.02, C.PLATE, 0, 0, rz, 0.03);
      P(0.2, 0.03, 0.82, sx * 1.045, 0.665, 0.12, C.STEEL, 0, 0, rz, 0.02);
      [[0.76, -0.58], [0.76, 0.62], [0.44, -0.58], [0.44, 0.62]].forEach(([y, z]) => bolt(sx * 1.04, y, z, 0, rz));
      Pf(0.05, 0.03, 0.14, sx * 1.07, 0.71, 0.5, C.DARK, 0, 0, rz, 0.01); // handle
      for (let i = 0; i < 3; i++) Pf(0.03, 0.03, 0.2, sx * 1.035, 0.52 + i * 0.05, -0.36, C.DARK, 0, 0, rz, 0.008); // door vents
      P(0.1, 0.13, 1.52, sx * 1.03, 0.34, 0.02, C.PLATE, 0, 0, 0, 0.03, true); // skirt
      lamp(0, 0.014, 0.024, 2.36, sx * 1.004, 0.815, 0.32, 0x5dffb0, 1.5); // mint shoulder line
      lamp(7, 0.03, 0.03, 1.5, sx * 0.99, 0.215, 0.02, 0x5dffb0, 2.4); // under-glow tube
      for (const zc of [-1.25, 1.3]) {
        // the flare: seven chamfered plates round the arch. None sits near 30 degrees,
        // where a flat plate would mirror the key light straight into the chase camera.
        [[14, 0.38], [46, 0.28], [68, 0.26], [90, 0.26], [112, 0.26], [134, 0.28], [166, 0.38]].forEach(([deg, len], k) => {
          const a = (deg * Math.PI) / 180;
          const sy = Math.sin(a), cz = Math.cos(a), rx = H - a;
          P(0.4, 0.05, len, sx * 1.1, RACER_WHEEL_Y + sy * 0.63, zc + cz * 0.63, C.PLATE, rx, 0, 0, 0.022);
          Pf(0.035, 0.07, len, sx * 1.305, RACER_WHEEL_Y + sy * 0.625, zc + cz * 0.625, C.MINT, rx, 0, 0, 0.012);
          Pf(0.045, 0.18, len, sx * 0.915, RACER_WHEEL_Y + sy * 0.55, zc + cz * 0.55, C.DARK, rx);
          if (k % 2 === 1) fine.add(hex, racerM(sx * 1.2, RACER_WHEEL_Y + sy * 0.662, zc + cz * 0.662, 1, 1, 1, rx), C.BOLT);
        });
        // a short mud flap with a mint stripe: the tread stays in view from behind
        Pf(0.36, 0.03, 0.2, sx * 1.07, 0.5, zc + 0.74, C.DARK, H - 0.1);
        Pf(0.36, 0.034, 0.04, sx * 1.07, 0.415, zc + 0.752, C.MINT, H - 0.1);
      }
    });
    fine.add(cyl, racerM(1.03, 0.72, 0.98, 0.06, 0.03, 0.06, 0, 0, H), C.BOLT); // fuel cap
    // --- tail: deck, ducktail wing, lamp housings, guard, exhausts, diffuser --
    P(1.5, 0.04, 0.5, 0, 0.955, 1.8, C.BODY, -0.05, 0, 0, 0.03);
    [[-0.66, 1.62], [0.66, 1.62], [-0.66, 1.98], [0.66, 1.98]].forEach(([x, z]) => bolt(x, 0.985 - (z - 1.8) * 0.05, z));
    P(1.74, 0.045, 0.38, 0, 1.06, 1.96, C.PLATE, -0.15, 0, 0, 0.03);
    [-0.5, 0.5].forEach((x) => Pf(0.05, 0.1, 0.2, x, 1.0, 1.92, C.DARK));
    [-0.885, 0.885].forEach((x) => P(0.035, 0.19, 0.44, x, 1.03, 1.96, C.MINT, -0.15, 0, 0, 0.014, true));
    lamp(0, 1.62, 0.016, 0.016, 0, 1.094, 2.148, 0x5dffb0, 1.5); // mint lip on the wing
    P(1.86, 0.05, 0.26, 0, 0.72, 2.1, C.DARK, H, 0, 0, 0.02); // lamp panel
    // tail lamps: one blade across the whole width, broken round the emblem, with an upright at each end
    [-0.53, 0.53].forEach((x) => lamp(1, 0.66, 0.05, 0.02, x, 0.735, 2.135, 0xff0826, 2.4));
    [-0.845, 0.845].forEach((x) => lamp(1, 0.05, 0.2, 0.02, x, 0.735, 2.135, 0xff0826, 2.4));
    [-0.53, 0.53].forEach((x) => lamp(1, 0.6, 0.014, 0.02, x, 0.655, 2.135, 0xff0826, 1.3));
    [-0.92, 0.92].forEach((x) => lamp(9, 0.07, 0.13, 0.02, x, 0.73, 2.135, 0xffa53d, 2.6)); // indicators
    // an original emblem: a mint chevron
    [-1, 1].forEach((s) => L.add(box, racerM(s * 0.052, 0.735, 2.135, 0.15, 0.024, 0.014, 0, 0, s * 0.62), 0x5dffb0, 1.9, { aCh: 0 }));
    lamp(0, 0.07, 0.022, 0.014, 0, 0.675, 2.135, 0x5dffb0, 1.9);
    P(1.92, 0.12, 0.2, 0, 0.47, 2.14, C.STEEL, H, 0, 0, 0.03); // bumper beam
    tube(-0.97, 0.57, 2.33, 0.97, 0.57, 2.33, 0.034, C.PLATE);
    tube(-0.97, 0.37, 2.33, 0.97, 0.37, 2.33, 0.034, C.PLATE);
    [-0.97, -0.5, 0.5, 0.97].forEach((x) => tube(x, 0.3, 2.33, x, 0.62, 2.33, 0.034, C.PLATE));
    [-0.74, 0.74].forEach((x) => tubeF(x, 0.47, 2.33, x, 0.47, 2.18, 0.028, C.DARK));
    [-0.2, 0.2].forEach((x) => Pf(0.07, 0.11, 0.05, x, 0.3, 2.35, C.MINT, 0, 0, 0, 0.015, true)); // tow hooks
    [-0.34, 0.34].forEach((x) => {
      paint.add(cyl, racerM(x, 0.335, 2.2, 0.088, 0.3, 0.088, H), 0x59606a);
      fine.add(cyl, racerM(x, 0.335, 2.352, 0.097, 0.03, 0.097, H), C.BOLT); // tip ring
      Pf(0.26, 0.02, 0.24, x, 0.445, 2.2, C.DARK); // heat shield
      const glow = new THREE.CircleGeometry(0.072, 10);
      L.add(glow, racerM(x, 0.335, 2.37), 0xff7a2a, 2.2, { aCh: 10 });
      glow.dispose();
    });
    [-0.62, -0.31, 0, 0.31, 0.62].forEach((x) => Pf(0.022, 0.13, 0.32, x, 0.235, 2.0, C.DARK));
    lamp(7, 1.5, 0.03, 0.03, 0, 0.215, 1.98, 0x5dffb0, 2.4);
    lamp(7, 1.5, 0.03, 0.03, 0, 0.215, -2.02, 0x5dffb0, 2.4);
    // aerial with a mint tip
    tubeF(0.7, 0.97, 1.55, 0.79, 1.95, 1.78, 0.009, C.DARK);
    lamp(0, 0.03, 0.03, 0.03, 0.79, 1.96, 1.78, 0x5dffb0, 3);
    chassis.add(new THREE.Mesh(paint.build("color"), this.paint));
    const fineMesh = new THREE.Mesh(fine.build("color"), this.paint);
    chassis.add(fineMesh);
    const cabin = racerLoft(RACER_CABIN, racerCabinRing, false);
    chassis.add(new THREE.Mesh(cabin, this.glass));

    // --- lights: one unlit HDR mesh, each lamp group on its own channel ------
    this.ch = new Float32Array(12).fill(1);
    this.lightMat = new THREE.ShaderMaterial({
      uniforms: { uL: { value: this.ch } },
      vertexShader: "attribute vec3 aCol; attribute float aCh; uniform float uL[12]; varying vec3 vCol; void main(){ vCol = aCol * uL[int(aCh + 0.5)]; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol, 1.0); }",
    });
    chassis.add(new THREE.Mesh(L.build(), this.lightMat));

    // --- wheels: four copies of one geometry; calipers and disc glow stay put -
    const wheelGeo = racerWheelGeo();
    const stat = new RacerBatch();
    const hot = new RacerBatch(["aCh"]);
    const ring = new THREE.RingGeometry(0.11, 0.238, 14);
    this.wheels = RACER_WHEELS.map(([x, z], i) => {
      const sx = Math.sign(x);
      const steer = new THREE.Group();
      steer.position.set(x, RACER_WHEEL_Y, z);
      const w = new THREE.Mesh(wheelGeo.core, this.wheelPaint);
      w.scale.x = sx; // outer face outward
      const wf = new THREE.Mesh(wheelGeo.fine, this.wheelPaint); // treads, ribs, lug nuts
      w.add(wf);
      steer.add(w);
      wheelBase.add(steer);
      const cal = racerPlate(0.07, 0.1, 0.17, 0.02, true);
      stat.add(cal, racerM(x + sx * 0.115, RACER_WHEEL_Y + 0.15, z + 0.13, 1, 1, 1, -0.7), C.MINT); // caliper
      cal.dispose();
      hot.add(ring, racerM(x + sx * 0.113, RACER_WHEEL_Y, z, 1, 1, 1, 0, sx * H), 0xff5a1e, 2.4, { aCh: 11 });
      return { steer, w, front: i < 2, y: 0, v: 0 };
    });
    ring.dispose();
    wheelBase.add(new THREE.Mesh(stat.build("color"), this.wheelPaint));
    wheelBase.add(new THREE.Mesh(hot.build(), this.lightMat));

    // --- exhaust flames for the boost (look only, not reflected) -------------
    const fl = new RacerBatch();
    const cone = new THREE.CylinderGeometry(0.01, 0.1, 1, 8, 1, true);
    cone.translate(0, 0.5, 0);
    [-0.34, 0.34].forEach((x) => fl.add(cone, racerM(x, 0.335, 2.36, 1, 1, 1, H), 0x5ad8ff, 1));
    cone.dispose();
    this.flames = new THREE.Mesh(fl.build(), new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute vec3 aCol; varying vec3 vCol; varying float vT; void main(){ vCol = aCol; vT = clamp(position.z - 2.36, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uI; uniform float uTime; varying vec3 vCol; varying float vT; void main(){ float f = (1.0 - vT) * (0.85 + 0.15 * sin(uTime * 17.0 + vT * 20.0)); gl_FragColor = vec4(mix(vec3(3.0, 3.0, 3.4), vCol * 2.5, vT) * f * uI, 1.0); }",
    }));
    this.flames.layers.set(1);
    chassis.add(this.flames);

    // --- headlight shafts in the rain (look only) ----------------------------
    const bm = new RacerBatch();
    const shaft = new THREE.CylinderGeometry(1.25, 0.13, 11, 12, 1, true);
    shaft.translate(0, 5.5, 0);
    [-0.63, 0.63].forEach((x) => bm.add(shaft, racerM(x, 0.66, -2.26, 1, 1, 1, -H - 0.035, 0, x * 0.03), 0xfff0d2, 1));
    shaft.dispose();
    this.beams = new THREE.Mesh(bm.build(), new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0.5 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute vec3 aCol; varying vec3 vCol; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vCol = aCol; vT = clamp((-2.26 - position.z) / 11.0, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform float uI; varying vec3 vCol; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float rim = abs(dot(normalize(vN), normalize(vV))); float a = pow(1.0 - vT, 1.7) * smoothstep(0.0, 0.06, vT) * rim * rim; gl_FragColor = vec4(vCol * a * uI, 1.0); }",
    }));
    this.beams.layers.set(1);
    chassis.add(this.beams);

    // --- spray off the tyres: mist on a wet road, dust on a dry one -----------
    const N = 96;
    const seed = new Float32Array(N), side = new Float32Array(N);
    for (let i = 0; i < N; i++) { seed[i] = (i + Math.random()) / N; side[i] = (i % 2 ? 1 : -1) * (i % 8 < 6 ? 1 : 0.999); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    sg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    sg.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.6, 3), 6);
    this.spray = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uI: { value: 0 }, uSpeed: { value: 30 }, uShear: { value: 0 }, uH: { value: 800 }, uColor: { value: new THREE.Color(0x9fc4e8) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; attribute float aSide; uniform float uTime; uniform float uI; uniform float uSpeed; uniform float uShear; uniform float uH; varying float vA;
        void main(){
          float r1 = fract(aSeed * 91.7), r2 = fract(aSeed * 37.3);
          float life = fract(aSeed * 7.31 + uTime * (1.5 + r1 * 0.9));
          vec3 p = vec3(aSide * 1.07 + (r1 - 0.5) * 0.46 * (0.5 + life * 1.6) - uShear * life * 0.3,
            0.06 + life * (0.55 + r2 * 0.95) - life * life * 0.55,
            ${racerF(1.3 + 0.42)} + life * (0.9 + uSpeed * 0.045) * (0.55 + r2));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uH * (0.09 + 0.55 * life) * (0.55 + r1) / max(0.1, -mv.z);
          vA = uI * (1.0 - life) * (1.0 - life) * smoothstep(0.0, 0.06, life);
        }`,
      fragmentShader: "uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = max(0.0, 1.0 - d); gl_FragColor = vec4(uColor * (vA * a * a), 1.0); }",
    }));
    this.spray.layers.set(1);
    this.spray.frustumCulled = false;
    wheelBase.add(this.spray);
    [box, cyl, hex].forEach((g) => g.dispose());

    // --- ribbon trails from the tail lights and the under-glow ----------------
    this.trails = [
      { t: new RacerTrail({ length: 14, width: 0.16, color: 0xff1a40, intensity: 1.25 }), p: new THREE.Vector3(-0.64, 0.73, 2.16), step: 0.38 },
      { t: new RacerTrail({ length: 14, width: 0.16, color: 0xff1a40, intensity: 1.25 }), p: new THREE.Vector3(0.64, 0.73, 2.16), step: 0.38 },
      { t: new RacerTrail({ length: 7, width: 0.08, color: 0x5dffb0, intensity: 1.2 }), p: new THREE.Vector3(-1.02, 0.22, 0.75), step: 0.2 },
      { t: new RacerTrail({ length: 7, width: 0.08, color: 0x5dffb0, intensity: 1.2 }), p: new THREE.Vector3(1.02, 0.22, 0.75), step: 0.2 },
    ];
    this.trails.forEach((tr) => game.scene.add(tr.t.mesh));

    // spring state (look only)
    this.heave = { x: 0, v: 0 };
    this.roll = { x: 0, v: 0 };
    this.pitch = { x: 0, v: 0 };
    this.px = 0; this.pvx = 0; this.psp = 30;
    this.spin = 0;
    this.brake = 0; this.heat = 0; this.hazard = 0; this.flame = 0;
    this.nextBump = 18; this.rearBump = -1;
    this.wasBoost = false; this.wasState = ""; this.sparkT = 0;
    this.tmp = new THREE.Vector3();
    this.under = new THREE.Color();
  }
  // A damped spring, stepped once.
  spring(s, target, k, c, dt) {
    s.v += ((target - s.x) * k - s.v * c) * dt;
    s.x += s.v * dt;
  }
  // dt: frame time; sp: road speed; step: metres travelled this frame.
  update(dt, sp, step, sky) {
    const g = this.g;
    const boost = g.boostRate ? 1 : 0;
    const n = g.round ? g.round.n : 4;
    const steer = clamp((g.lane === null ? 0 : laneX(g.lane, n)) - g.carX, -2.5, 2.5);
    const idt = 1 / Math.max(dt, 1 / 240);
    const calm = REDUCED_MOTION || GFX.calm ? 0.45 : 1;
    // the old whole-car bob and bank are replaced by the suspension below
    this.car.position.y = 0;
    this.car.rotation.z = 0;
    const vx = (g.carX - this.px) * idt;
    this.px = g.carX;
    const ax = clamp((vx - this.pvx) * idt, -60, 60);
    this.pvx = vx;
    const along = clamp((sp - this.psp) * idt, -400, 400);
    this.psp = sp;
    // events the springs feel: boost kicks the tail down, a new question's braking
    // dips the nose, a crash or a paid claim slams everything
    if (boost && !this.wasBoost) { this.pitch.v += 0.5 * calm; this.heave.v -= 0.25 * calm; this.heat = 1; }
    if (g.state !== this.wasState) {
      if (g.state === "explain") { this.heave.v += 0.45 * calm; this.rearBump = 0.06; }
      if (g.state === "ask") { this.pitch.v -= 0.35 * calm; this.brake = 1; }
    }
    this.wasBoost = !!boost;
    this.wasState = g.state;
    const spinning = Math.abs(this.car.rotation.y) > 0.02;
    if (spinning) { this.hazard = 2.6; this.brake = 1; }
    // road joints: the front axle meets each one, then the rear a wheelbase later
    this.nextBump -= step;
    if (this.nextBump <= 0) {
      this.nextBump = rand(16, 42);
      const hit = rand(0.45, 0.95) * calm;
      this.heave.v += hit * 0.5;
      this.pitch.v += hit * 0.5;
      this.wheels[0].v += hit * 1.6; this.wheels[1].v += hit * 1.6;
      this.rearBump = 2.55 / Math.max(sp, 10);
      this.rearHit = hit;
    }
    if (this.rearBump >= 0 && (this.rearBump -= dt) < 0) {
      const hit = this.rearHit || 0.4 * calm;
      this.heave.v += hit * 0.5;
      this.pitch.v -= hit * 0.7;
      this.wheels[2].v += hit * 1.6; this.wheels[3].v += hit * 1.6;
      this.rearHit = 0;
    }
    const rough = (Math.sin(g.dist * 0.83) + Math.sin(g.dist * 1.97 + 1.3) * 0.6) * 0.0035 * clamp(sp / 40, 0.5, 2) * calm;
    this.spring(this.heave, rough, 190, 13, dt);
    // roll: thrown outward by the sideways acceleration of a lane change
    this.spring(this.roll, clamp(-ax * 0.0075 - vx * 0.012, -0.11, 0.11) * calm, 120, 11, dt);
    // pitch: squat under boost, dive under braking
    this.spring(this.pitch, clamp(boost * 0.038 - this.brake * 0.02 + along * 0.00012, -0.06, 0.06) * calm, 110, 10, dt);
    this.chassis.position.y = this.heave.x;
    this.chassis.rotation.z = this.roll.x;
    this.chassis.rotation.x = this.pitch.x;
    this.rig.rotation.y = -steer * 0.045;
    // wheels: spin with the road, front pair steers, each rides its own bump
    this.spin = (this.spin + step * 0.42) % (Math.PI * 2);
    for (const w of this.wheels) {
      w.v += (-w.y * 900 - w.v * 38) * dt;
      w.y = clamp(w.y + w.v * dt, -0.02, 0.07);
      w.steer.position.y = RACER_WHEEL_Y + w.y;
      w.w.rotation.x = -this.spin;
      if (w.front) w.steer.rotation.y = -steer * 0.16;
    }
    // --- lamps -----------------------------------------------------------
    const ch = this.ch, t = g.t;
    this.brake = Math.max(0, this.brake - dt * 1.1);
    this.heat = Math.max(boost ? 1 : 0, this.heat - dt * 0.35);
    this.hazard = Math.max(0, this.hazard - dt);
    this.flame += (boost - this.flame) * Math.min(1, dt * 8);
    const lamps = sky ? sky.lamps : 1;
    if (sky) this.paint.userData.rim.value.copy(sky.light).lerp(sky.horizon, 0.35).multiplyScalar(0.62);
    ch[0] = 0.85 + 0.15 * Math.sin(t * 2.1) + this.flame * 0.5; // mint trim breathes
    ch[1] = 0.56 + 0.8 * smoothstep(0, 0.25, this.brake); // tail lamps, brighter under braking (lit, not a haze over the whole tail)
    ch[2] = 0.75 + 0.35 * lamps + this.flame * 0.9; // roof lamps
    const chase = (t * (0.6 + 0.5 * this.flame)) % 1; // a chase across the four markers, well under 3 Hz
    for (let i = 0; i < 4; i++) {
      const d = Math.abs(((chase - i / 4 + 1.5) % 1) - 0.5);
      ch[3 + i] = 0.22 + 1.5 * smoothstep(0.24, 0.0, d);
    }
    ch[7] = 0.9 + 0.25 * Math.sin(t * 2.6) + this.flame * 0.9; // under-glow
    ch[8] = 0.55 + 0.6 * lamps; // headlights
    ch[9] = this.hazard > 0 ? 0.15 + 1.4 * smoothstep(-0.2, 0.6, Math.sin(t * 9.4)) : 0.12; // hazards after a crash (1.5 Hz)
    ch[10] = 0.03 + 2.0 * this.heat * this.heat; // exhaust tips: dark when cold, white-orange after a boost
    ch[11] = 0.05 + 1.5 * Math.max(smoothstep(0, 0.5, this.brake), this.hazard > 0 ? 0.8 : 0); // brake discs glow
    // flames
    const fl = this.flame * (0.8 + 0.2 * Math.sin(t * 16));
    this.flames.material.uniforms.uI.value = fl;
    this.flames.material.uniforms.uTime.value = t;
    this.flames.scale.set(1, 1, 0.4 + fl * 1.4);
    this.flames.position.z = -2.36 * (0.4 + fl * 1.4 - 1); // keep the flame's root on the tip
    this.flames.visible = this.flame > 0.02;
    // the shafts fade out as the car turns away from the road ahead: in a spin they
    // would otherwise sweep through the camera and white the picture out
    const ahead = Math.pow(Math.max(0, Math.cos(this.car.rotation.y)), 6);
    this.beams.material.uniforms.uI.value = GFX.opt.beams ? (0.1 + 0.3 * lamps) * (1 + this.flame * 0.5) * ahead : 0;
    this.beams.visible = !!GFX.opt.beams && ahead > 0.02;
    // spray
    const su = this.spray.material.uniforms;
    su.uTime.value = t;
    su.uSpeed.value = sp;
    su.uShear.value = vx;
    su.uH.value = GFX.h * GFX.scenePR();
    const wet = sky ? sky.wet : 1;
    su.uI.value = (0.12 + 0.4 * wet) * clamp((sp - 12) / 40, 0, 1.6) * (spinning ? 2 : 1);
    if (sky && sky.dust) su.uColor.value.copy(sky.dust); else su.uColor.value.setHex(0x9fc4e8);
    // sparks: off the rims in a spin, out of the pipes when the boost lights
    this.sparkT -= dt;
    if (g.bursts && this.sparkT <= 0 && (spinning || (boost && this.flame < 0.6))) {
      this.sparkT = 0.07;
      this.car.updateMatrixWorld(true);
      const w = this.wheels[2 + (Math.random() < 0.5 ? 0 : 1)].steer;
      const p = spinning ? w.getWorldPosition(this.tmp).setY(0.08) : this.chassis.localToWorld(this.tmp.set(Math.random() < 0.5 ? -0.34 : 0.34, 0.33, 2.45));
      g.bursts.burst(p.clone(), spinning ? COLORS.orange : 0xbfe8ff, { n: 5, speed: spinning ? 6 : 4, size: 0.13, life: 0.38, gravity: -12 });
    }
    // exhaust heat bends the picture behind the pipes
    if (GFX.opt.shimmer && !calmOnly()) {
      this.car.updateMatrixWorld(true);
      GFX.heatAt(g.camera, this.chassis.localToWorld(this.tmp.set(0, 0.42, 2.75)), 0.55, 0.35 + 0.65 * this.heat);
    }
    // trails ride the tail lights' real positions, through lane changes and spins
    this.car.updateMatrixWorld(true);
    const tI = (0.75 + 0.25 * clamp((sp - 30) / 45, 0, 1)) * (0.8 + 0.5 * smoothstep(0, 0.3, this.brake));
    for (const tr of this.trails) {
      tr.t.follow(this.chassis.localToWorld(this.tmp.copy(tr.p)), step, tr.step);
      tr.t.mesh.material.uniforms.uI.value = tI;
    }
  }
}
const calmOnly = () => REDUCED_MOTION || GFX.calm;
