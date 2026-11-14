// Twelve cyborgs, one for every boss, all built from one kit: black armor in
// chamfered layers, pistons, cables and servos, a glowing ribbed core, red eyes.
// Original designs. Each has its own frame, head, shoulders, hands and base.
// The rig (CyborgRig) animates them from what the fight is doing (HP, the attack
// charging, hits landing); it never changes the fight.
const CY = { ARMOR: 0x15161c, PLATE: 0x22242d, DARK: 0x09090c, STEEL: 0x8b929c, BONE: 0xcdb8b0 };
const cyHash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// Armor: lit metal whose "glow" vertices are light sources on numbered channels
// (eyes, core, trim, circuitry, cracks), so one mesh carries plating and lamps.
function cyborgArmor(env, hex) {
  const m = glossy(0xffffff, { env, metal: 0.88, rough: 0.4, envI: 0.95, emissive: hex, emissiveK: 0.03 });
  m.vertexColors = true;
  const uL = { value: new Float32Array(8).fill(1) };
  m.userData.uL = uL;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uL = uL;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aGlow; uniform float uL[8]; varying float vGlow; varying vec3 vObjP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvGlow = aGlow > 0.5 ? uL[int(aGlow + 0.5)] : -1.0; vObjP = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vGlow; varying vec3 vObjP;\nfloat cyH(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float cyLum = dot(vColor, vec3(0.3333));
        float cyBone = smoothstep(0.62, 0.72, cyLum);
        float cySteel = smoothstep(0.4, 0.5, cyLum) * (1.0 - cyBone);
        // panel lines: seams across the plating, skipped on faces that lie along them
        vec3 cyOn = abs(normalize(cross(dFdx(vObjP), dFdy(vObjP))));
        vec3 cyQ = vObjP * vec3(1.05, 1.3, 0.9) + 0.31;
        vec3 cyG = abs(fract(cyQ) - 0.5);
        vec3 cyW = fwidth(cyQ) * 1.1 + 0.009;
        vec3 cyLn = (1.0 - smoothstep(vec3(0.0), cyW, cyG)) * step(cyOn, vec3(0.7));
        float cySeam = max(cyLn.x, max(cyLn.y, cyLn.z)) * step(0.3, cyH(floor(cyQ + 0.5) + 3.0));
        diffuseColor.rgb *= 1.0 - (0.62 - 0.3 * cyBone) * cySeam;
        if (vGlow > -0.5) {
          if (vGlow < 0.004) discard; // a lamp that is off (a crack not yet opened) is not there at all
          diffuseColor.rgb = vec3(0.0);
        }`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = mix(mix(roughnessFactor, 0.2, cySteel), 0.8, cyBone);`)
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor *= 1.0 - 0.85 * cyBone;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        if (vGlow > -0.5) totalEmissiveRadiance = vColor * vGlow;
        else totalEmissiveRadiance += emissive * 16.0 * pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 3.0); // a rim of its own colour along every edge that turns away`);
  };
  m.customProgramCacheKey = () => "cyborg-armor-2";
  return surfaceDetail(m, { scale: 0.8, height: 0.002, scratch: 1.4, smudge: 0.45 }); // (cast plate: a soft hammered relief, hair scratches; fine grain only up close)
}

// A hull lofted through eight-sided rings [y, half-width, half-depth, chamfer], low to high.
function cyLoft(rings) {
  const R = rings.map(([y, w, d, c]) => [[w - c, y, -d], [w, y, -d + c], [w, y, d - c], [w - c, y, d], [-w + c, y, d], [-w, y, d - c], [-w, y, -d + c], [-w + c, y, -d]]);
  const pos = [];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let r = 0; r < R.length - 1; r++) {
    for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; tri(R[r][i], R[r + 1][i], R[r + 1][j]); tri(R[r][i], R[r + 1][j], R[r][j]); }
  }
  const top = R[R.length - 1], bot = R[0];
  for (let i = 1; i < 7; i++) { tri(top[0], top[i + 1], top[i]); tri(bot[0], bot[i], bot[i + 1]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// ---- torsos -------------------------------------------------------------------
// Shared: a ribbed gut with light between the ribs, hips, spine, flank hydraulics.
function cyGut(K, o = {}) {
  const n = o.n || 4, w = o.w || 2.15, d = o.d || 1.45, y0 = o.y || -0.62, gap = o.gap || 0.36;
  for (let i = 0; i < n; i++) {
    K.plate("body", w - i * 0.12, 0.2, d - i * 0.06, 0, y0 - i * gap, 0.05, i % 2 ? CY.DARK : CY.ARMOR, 0, 0, 0, 0.05);
    if (i < n - 1) K.glow("body", 2, w - 0.45 - i * 0.12, 0.09, d - 0.15, 0, y0 - 0.18 - i * gap, 0.08, 1.7);
  }
  K.cyl("body", 0.3, 0.36, n * gap + 0.5, 0, y0 - (n * gap) / 2 + 0.1, -0.62, CY.DARK, 0, 0, 0, 8); // spine
  for (let i = 0; i < n + 1; i++) K.plate("body", 0.5, 0.16, 0.34, 0, y0 + 0.3 - i * gap, -0.86, CY.PLATE, 0, 0, 0, 0.04);
  K.sym((sd) => {
    K.piston("body", [sd * (w * 0.5 + 0.12), y0 + 0.25, 0.3], [sd * (w * 0.5 - 0.2), y0 - n * gap + 0.1, 0.4], 0.1);
    K.cable("body", [sd * (w * 0.42), y0 + 0.3, -0.5], [sd * (w * 0.36), y0 - n * gap, -0.55], 0.25, 0.06);
  });
}
function cyHips(K, o = {}) {
  const w = o.w || 2.7, y = o.y || -2.25;
  K.plate("hips", w, 0.75, 1.7, 0, y, 0, CY.PLATE, 0, 0, 0, 0.1);
  K.plate("hips", w * 0.5, 0.5, 0.3, 0, y - 0.1, 0.9, CY.ARMOR, 0, 0, 0, 0.06);
  K.glow("hips", 3, w * 0.36, 0.06, 0.06, 0, y - 0.1, 1.07, 2.2);
  K.sym((sd) => {
    K.plate("hips", 0.9, 0.9, 1.3, sd * w * 0.5, y - 0.25, 0.05, CY.ARMOR, 0, 0, sd * 0.2, 0.1);
    K.bolt("hips", sd * (w * 0.5 + 0.12), y - 0.1, 0.72);
  });
}
const CY_TORSO = {
  // a wide chest of two angled breastplates over a keel
  hulk(K, o) {
    K.add("chest", cyLoft([[-0.35, 1.45, 0.85, 0.25], [0.4, 1.75, 0.95, 0.3], [1.5, 1.8, 0.95, 0.3], [1.78, 1.3, 0.8, 0.3]]), null, CY.ARMOR);
    K.sym((sd) => {
      K.breakaway("chest", 1.5, 1.72, 0.3, sd * 0.88, 0.82, 1.0, CY.PLATE, -0.1, sd * 0.2, 0, sd < 0 ? 1 : 2, (lit) => { for (let i = 0; i < 3; i++) { if (o.chevrons) { lit(0.42, 0.09, -0.17, 0.4 - i * 0.3, 2.4, 3, 0.6); lit(0.42, 0.09, 0.17, 0.4 - i * 0.3, 2.4, 3, -0.6); } else lit(0.7, 0.07, sd * 0.04, 0.43 - i * 0.2); } });
      K.plate("chest", 1.2, 0.4, 0.4, sd * 0.95, -0.22, 0.95, CY.DARK, 0.25, sd * 0.2, 0, 0.06);
      K.vent("chest", sd * 1.0, 1.55, -0.98, 0.7, 0.5, 0, Math.PI, 0);
    });
    K.plate("chest", 0.34, 1.9, 0.5, 0, 0.78, 1.12, CY.DARK, -0.1, 0, 0, 0.06);
    K.plate("chest", 2.0, 0.55, 1.7, 0, 1.98, 0.05, CY.PLATE, 0, 0, 0, 0.1); // gorget
    K.plate("chest", 2.5, 1.35, 0.3, 0, 2.55, -0.78, CY.ARMOR, 0.12, 0, 0, 0.08); // back plate
    cyGut(K, o.gut);
    cyHips(K, o.hips);
  },
  // a sharp suit: narrow waist, lapels, a tie of light
  suit(K, o) {
    K.add("chest", cyLoft([[-0.4, 0.95, 0.7, 0.2], [0.5, 1.35, 0.85, 0.25], [1.55, 1.7, 0.9, 0.28], [1.82, 1.15, 0.75, 0.25]]), null, CY.ARMOR);
    K.sym((sd) => {
      K.breakaway("chest", 0.95, 1.9, 0.22, sd * 0.72, 0.75, 0.93, CY.PLATE, -0.06, sd * 0.16, sd * -0.2, sd < 0 ? 1 : 2); // lapels
      K.plate("chest", 0.5, 0.12, 0.3, sd * 0.95, 1.32, 1.02, CY.STEEL, -0.06, sd * 0.16, sd * 0.5, 0.03); // pocket square / pin
      K.vent("chest", sd * 0.8, 1.4, -0.9, 0.6, 0.45, 0, Math.PI, 0);
    });
    if (o.tie !== false) {
      K.plate("chest", 0.5, 0.42, 0.3, 0, 1.52, 0.98, CY.PLATE, -0.06, 0, Math.PI / 4, 0.05); // knot
      K.glow("chest", 3, 0.2, 1.5, 0.06, 0, 0.6, 1.02, 2.6, -0.06);
      K.glow("chest", 3, 0.34, 0.34, 0.06, 0, -0.2, 0.98, 2.6, -0.06, 0, Math.PI / 4);
    } else K.plate("chest", 0.5, 2.0, 0.3, 0, 0.7, 0.9, CY.DARK, -0.06, 0, 0, 0.05);
    K.plate("chest", 1.8, 0.5, 1.5, 0, 1.98, 0.05, CY.PLATE, 0, 0, 0, 0.1);
    K.sym((sd) => K.plate("chest", 0.9, 0.5, 0.12, sd * 0.55, 2.2, 0.72, CY.BONE, -0.2, sd * 0.35, sd * 0.4, 0.04)); // collar points
    cyGut(K, Object.assign({ n: 5, w: 1.55, d: 1.15, gap: 0.3 }, o.gut));
    cyHips(K, Object.assign({ w: 2.0 }, o.hips));
  },
  // a riveted pressure vessel, hooped and bulging
  barrel(K, o) {
    const V = (r, y) => new THREE.Vector2(r, y);
    const g = new THREE.LatheGeometry([V(0.9, -2.0), V(1.7, -1.5), V(2.1, -0.5), V(2.15, 0.5), V(1.8, 1.4), V(1.2, 1.9), V(0.8, 2.0)], 14);
    K.add("chest", g, racerM(0, 0, 0, 1, 1, 0.82), CY.ARMOR);
    [-1.2, -0.3, 0.6, 1.4].forEach((y, i) => {
      const r = [1.82, 2.16, 2.14, 1.82][i];
      const t = new THREE.TorusGeometry(r, 0.09, 5, 20);
      K.add("chest", t, racerM(0, y, 0, 1, 1, 0.82, Math.PI / 2), CY.PLATE);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI - Math.PI / 2 + 0.16; K.bolt("chest", Math.sin(a) * (r + 0.06), y, Math.cos(a) * (r + 0.06) * 0.82); }
      if (i < 3) K.glow("chest", 2, 0.5, 0.07, 0.06, 0, y + 0.45, [1.66, 1.78, 1.58][i], 2.0);
    });
    K.breakaway("chest", 1.3, 1.1, 0.2, -1.0, -0.3, 1.5, CY.PLATE, 0, -0.5, 0, 1);
    K.breakaway("chest", 1.3, 1.1, 0.2, 1.0, -0.3, 1.5, CY.PLATE, 0, 0.5, 0, 2);
    K.plate("chest", 1.9, 0.45, 1.6, 0, 2.0, 0.05, CY.PLATE, 0, 0, 0, 0.1);
    K.sym((sd) => { K.vent("chest", sd * 1.3, 1.75, 0.2, 0.5, 0.4, -Math.PI / 2, 0, 0); K.piston("chest", [sd * 1.4, -1.6, 0.5], [sd * 1.0, -2.3, 0.5], 0.1); });
    K.plate("hips", 1.9, 0.6, 1.5, 0, -2.3, 0, CY.PLATE, 0, 0, 0, 0.1);
  },
  // an upright cabinet with doors, stripes and a coin slot
  cabinet(K, o) {
    K.plate("chest", 3.1, 3.3, 1.9, 0, 0.35, 0, CY.ARMOR, 0, 0, 0, 0.16);
    K.sym((sd) => {
      K.breakaway("chest", 1.35, 2.3, 0.2, sd * 0.74, 0.55, 1.0, CY.PLATE, 0, 0, 0, sd < 0 ? 1 : 2); // doors
      K.plate("chest", 0.1, 0.5, 0.12, sd * 0.2, 0.55, 1.14, CY.STEEL, 0, 0, 0, 0.03); // handles
      [1.7, -0.6].forEach((y) => K.bolt("chest", sd * 1.38, y, 0.98, Math.PI / 2));
      K.vent("chest", sd * 1.58, 1.2, 0, 0.9, 0.6, 0, sd * Math.PI / 2, 0);
    });
    for (let i = 0; i < 7; i++) K.glow("chest", 3, 0.3, 0.14, 0.05, -1.05 + i * 0.35, -0.92, 1.0, i % 2 ? 0.25 : 2.3, 0, 0, 0.6);
    K.plate("chest", 3.3, 0.3, 2.0, 0, 2.06, 0, CY.PLATE, 0, 0, 0, 0.08);
    K.plate("hips", 2.6, 0.7, 1.6, 0, -1.75, 0, CY.DARK, 0, 0, 0, 0.1);
    K.sym((sd) => K.piston("hips", [sd * 1.2, -1.4, 0.6], [sd * 1.5, -2.5, 0.5], 0.12));
  },
  // an open rib cage round whatever burns inside it
  cage(K, o) {
    K.cyl("chest", 0.28, 0.34, 3.6, 0, 0.3, -0.62, CY.BONE, 0, 0, 0, 8); // spine
    for (let i = 0; i < 9; i++) K.plate("chest", 0.62, 0.2, 0.42, 0, 1.9 - i * 0.42, -0.72, CY.BONE, 0, 0, 0, 0.05);
    for (let i = 0; i < 5; i++) {
      const y = 1.55 - i * 0.44, w = 1.5 - Math.abs(i - 1.2) * 0.16;
      K.sym((sd) => {
        K.strut("chest", [sd * 0.2, y, -0.6], [sd * w, y - 0.1, -0.05], 0.16, CY.BONE);
        K.strut("chest", [sd * w, y - 0.1, -0.05], [sd * w * 0.86, y - 0.3, 0.72], 0.15, CY.BONE);
        K.strut("chest", [sd * w * 0.86, y - 0.3, 0.72], [sd * 0.22, y - 0.42, 0.98], 0.13, CY.BONE);
        if (i < 4) K.glow("chest", 2, 0.05, 0.05, 0.9, sd * w * 0.9, y - 0.32, 0.3, 1.4);
      });
    }
    K.plate("chest", 0.3, 2.2, 0.26, 0, 0.72, 1.02, CY.BONE, -0.02, 0, 0, 0.06); // sternum
    K.sym((sd) => {
      K.breakaway("chest", 1.25, 0.8, 0.2, sd * 0.85, 1.72, 0.8, CY.PLATE, -0.25, sd * 0.25, 0, sd < 0 ? 1 : 2); // collar plates
      K.vent("chest", sd * 0.6, 1.9, -0.9, 0.5, 0.4, 0, Math.PI, 0);
    });
    K.plate("chest", 1.9, 0.4, 1.5, 0, 2.0, 0.0, CY.PLATE, 0, 0, 0, 0.1);
    K.plate("hips", 1.9, 0.55, 1.3, 0, -2.0, 0, CY.BONE, 0, 0, 0, 0.1); // pelvis
    K.sym((sd) => K.plate("hips", 0.8, 0.9, 0.9, sd * 1.05, -2.15, 0, CY.BONE, 0, 0, sd * 0.5, 0.1));
  },
  // a robed frame: a plated mantle that hangs to the floor
  robe(K, o) {
    K.add("chest", cyLoft([[-0.6, 1.2, 0.8, 0.25], [0.6, 1.55, 0.9, 0.28], [1.5, 1.7, 0.9, 0.28], [1.8, 1.2, 0.75, 0.25]]), null, CY.ARMOR);
    K.sym((sd) => {
      K.breakaway("chest", 1.25, 1.8, 0.24, sd * 0.78, 0.7, 0.96, CY.PLATE, -0.06, sd * 0.18, 0, sd < 0 ? 1 : 2);
      K.vent("chest", sd * 0.9, 1.5, -0.95, 0.6, 0.45, 0, Math.PI, 0);
    });
    for (let i = 0; i < 4; i++) { K.plate("chest", 0.62 - i * 0.07, 0.3, 0.16, 0, 1.55 - i * 0.36, 1.12, CY.BONE, -0.06, 0, 0, 0.04); K.glow("chest", 2, 0.5 - i * 0.07, 0.06, 0.05, 0, 1.37 - i * 0.36, 1.1, 2.0, -0.06); } // bands at the throat
    K.plate("chest", 2.1, 0.5, 1.7, 0, 1.98, 0.05, CY.PLATE, 0, 0, 0, 0.1);
    K.cyl("body", 0.7, 0.9, 1.8, 0, -1.4, 0, CY.DARK, 0, 0, 0, 8);
    const n = o.folds || 9;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2, len = (o.ragged ? 1.6 + cyHash(i * 3.1) * 1.3 : 2.5);
      K.add("body", racerPlate(0.86, len, 0.12, 0.04, true), new THREE.Matrix4().makeRotationY(a).multiply(racerM(0, -0.75 - len / 2, 1.18 + (len - 1.6) * 0.07, 1, 1, 1, -0.11)), i % 2 ? CY.ARMOR : CY.PLATE);
      if (i % 2 === 0) K.add("body", new THREE.BoxGeometry(0.06, len * 0.7, 0.03), new THREE.Matrix4().makeRotationY(a).multiply(racerM(0, -0.9 - len / 2, 1.27 + (len - 1.6) * 0.07, 1, 1, 1, -0.11)), K.hex, 1.9, 3);
    }
  },
};

// ---- heads --------------------------------------------------------------------
function cyNeck(K) {
  K.cyl("chest", 0.34, 0.4, 0.55, 0, 2.2, 0.05, CY.DARK, 0, 0, 0, 8);
  K.sym((sd) => { K.piston("chest", [sd * 0.5, 2.0, -0.2], [sd * 0.36, 2.5, -0.05], 0.06); K.cable("head", [sd * 0.4, 2.7, -0.35], [sd * 0.75, 2.3, -0.6], 0.15, 0.05, 4); });
}
const CY_HEAD = {
  // the examiner: a square-capped helm with a tassel, a stern brow over two lenses (one ringed like a
  // monocle, on a chain), and a row of answer bubbles where a mouth would be, one of them filled in
  proctor(K) {
    K.add("head", cyLoft([[2.26, 0.46, 0.48, 0.14], [2.6, 0.66, 0.62, 0.2], [3.06, 0.68, 0.62, 0.2], [3.3, 0.5, 0.5, 0.16]]), null, CY.ARMOR);
    K.fplate("head", 1.06, 0.36, 0.14, 0, 2.88, 0.6, CY.DARK); // visor recess
    K.plate("head", 1.22, 0.16, 0.4, 0, 3.1, 0.62, CY.PLATE, 0.2, 0, 0, 0.04); // brow
    K.sym((sd) => {
      K.eye(sd * 0.25, 2.88, 0.7, 0.4);
      K.breakaway("head", 0.5, 0.6, 0.1, sd * 0.7, 2.76, 0.06, CY.PLATE, 0, sd * Math.PI / 2, 0, sd < 0 ? 3 : 9); // cheek guards
    });
    K.add("head", new THREE.TorusGeometry(0.17, 0.028, 6, 18), racerM(0.25, 2.88, 0.74), CY.STEEL); // the monocle
    K.cable("head", [0.42, 2.84, 0.7], [0.64, 2.46, 0.46], 0.12, 0.02, 4); // and its chain
    K.fplate("head", 0.9, 0.2, 0.08, 0, 2.48, 0.6, CY.DARK); // the plate the bubbles are stamped in
    for (let i = 0; i < 4; i++) {
      const x = -0.3 + i * 0.2;
      K.add("head", new THREE.TorusGeometry(0.065, 0.018, 5, 12), racerM(x, 2.48, 0.67), CY.BONE);
      if (i === 2) K.glowCyl("head", 3, 0.045, 0.03, x, 2.48, 0.66, 2.6, Math.PI / 2);
    }
    // the cap: a square board set corner-forward at a tilt, a button, a cord to one corner, a lit tassel
    K.cyl("head", 0.4, 0.46, 0.16, 0, 3.36, 0, CY.DARK, 0, 0, 0, 8);
    K.plate("head", 1.5, 0.07, 1.5, 0, 3.48, 0, CY.PLATE, 0.06, Math.PI / 4, 0, 0.02);
    K.cyl("head", 0.07, 0.07, 0.06, 0, 3.55, 0, CY.STEEL, 0, 0, 0, 8);
    K.cable("head", [0, 3.56, 0], [1.0, 3.5, 0.06], 0.04, 0.02, 4);
    K.glow("head", 3, 0.07, 0.34, 0.07, 1.03, 3.3, 0.06, 2.4);
  },
  // a pale skull in a steel jaw, wired at the temples
  skull(K) {
    K.ball("head", 0.62, 0, 2.82, 0.2, CY.BONE, 1, 0.9, 1.12, 1);
    K.plate("head", 0.82, 0.4, 0.72, 0, 2.3, 0.42, CY.PLATE, 0, 0, 0, 0.06);
    for (let i = 0; i < 5; i++) K.box("head", 0.1, 0.13, 0.06, -0.26 + i * 0.13, 2.52, 0.76, CY.BONE);
    K.plate("head", 0.92, 0.17, 0.3, 0, 2.84, 0.74, CY.DARK, 0, 0, 0, 0.03);
    K.plate("head", 0.12, 0.2, 1.0, 0, 3.36, 0.1, CY.DARK, -0.25, 0, 0, 0.03);
    K.sym((sd) => {
      K.breakaway("head", 0.5, 0.5, 0.1, sd * 0.57, 2.75, 0.05, CY.DARK, 0, sd * Math.PI / 2, 0, sd < 0 ? 3 : 9);
      K.cyl("head", 0.09, 0.09, 0.1, sd * 0.6, 3.02, 0.3, CY.STEEL, 0, 0, Math.PI / 2, 6);
      K.eye(sd * 0.21, 2.84, 0.84, 0.5);
    });
  },
  // a salesman's helmet: a wide grin of light under two small eyes
  grin(K) {
    K.add("head", cyLoft([[2.32, 0.5, 0.5, 0.15], [2.8, 0.64, 0.62, 0.2], [3.2, 0.52, 0.55, 0.2], [3.36, 0.3, 0.35, 0.12]]), null, CY.ARMOR);
    K.fplate("head", 0.96, 0.62, 0.12, 0, 2.7, 0.62, CY.DARK);
    K.glow("head", 3, 0.72, 0.09, 0.05, 0, 2.5, 0.72, 2.8);
    K.sym((sd) => { K.glow("head", 3, 0.2, 0.08, 0.05, sd * 0.42, 2.56, 0.71, 2.8, 0, 0, sd * 0.6); K.eye(sd * 0.21, 2.92, 0.7, 0.34); K.cyl("head", 0.12, 0.12, 0.06, sd * 0.21, 2.92, 0.67, CY.STEEL, Math.PI / 2, 0, 0, 8); });
    for (let i = 0; i < 7; i++) K.box("head", 0.025, 0.11, 0.07, -0.3 + i * 0.1, 2.5, 0.72, CY.DARK);
    K.plate("head", 0.5, 0.09, 1.0, 0, 3.4, -0.05, CY.PLATE, 0.22, 0, 0, 0.03); // slicked-back crest
    K.breakaway("head", 0.5, 0.6, 0.1, -0.66, 2.85, 0.1, CY.PLATE, 0, -Math.PI / 2, 0, 3);
    K.tube("head", [0.66, 2.9, 0.1], [0.8, 2.52, 0.6], 0.035, CY.STEEL); // headset
    K.glow("head", 3, 0.09, 0.09, 0.09, 0.8, 2.5, 0.62, 3);
  },
  // a wedge of a head under two swept horns
  horned(K) {
    K.add("head", cyLoft([[2.28, 0.45, 0.46, 0.12], [2.75, 0.72, 0.62, 0.2], [3.18, 0.56, 0.5, 0.18]]), null, CY.ARMOR);
    K.fplate("head", 1.0, 0.3, 0.14, 0, 2.86, 0.6, CY.DARK);
    K.plate("head", 0.3, 0.5, 0.5, 0, 2.42, 0.5, CY.PLATE, 0.3, 0, 0, 0.06); // snout
    K.sym((sd) => {
      K.glow("head", 1, 0.36, 0.07, 0.05, sd * 0.25, 2.87, 0.69, 2.6, 0, 0, sd * 0.32, 0xff2418);
      K.eye(sd * 0.25, 2.87, 0.72, 0.46);
      K.cone("head", [sd * 0.55, 3.0, 0], [sd * 1.3, 3.4, 0.1], 0.2, 0.15, CY.PLATE);
      K.cone("head", [sd * 1.3, 3.4, 0.1], [sd * 1.55, 4.15, 0.45], 0.15, 0.02, CY.BONE);
      K.cone("head", [sd * 0.3, 2.36, 0.6], [sd * 0.36, 1.95, 0.8], 0.09, 0.01, CY.BONE); // tusks
      K.breakaway("head", 0.5, 0.45, 0.1, sd * 0.74, 2.72, 0.1, CY.PLATE, 0, sd * Math.PI / 2, 0, sd < 0 ? 3 : 9);
    });
    for (let i = 0; i < 3; i++) K.glow("head", 3, 0.16, 0.06, 0.05, -0.2 + i * 0.2, 3.08, 0.5, i % 2 ? 0.4 : 2.4, -0.5, 0, 0.7);
  },
  // one great lens deep in a hood
  cyclops(K) {
    K.ball("head", 0.78, 0, 2.86, 0.0, CY.ARMOR, 1, 1, 1.15, 1.05);
    K.sym((sd) => {
      K.fplate("head", 0.62, 1.25, 0.1, sd * 0.5, 2.88, 0.5, CY.PLATE, 0, sd * 0.62, sd * -0.1);
      K.breakaway("head", 0.5, 0.7, 0.08, sd * 0.78, 2.7, 0.0, CY.PLATE, 0, sd * Math.PI / 2, 0, sd < 0 ? 3 : 9);
    });
    K.cone("head", [0, 3.5, -0.1], [0, 4.1, -0.7], 0.42, 0.03, CY.ARMOR, 6); // the hood's peak
    K.add("head", new THREE.TorusGeometry(0.34, 0.07, 5, 14), racerM(0, 2.86, 0.6), CY.STEEL);
    K.glowCyl("head", 1, 0.26, 0.05, 0, 2.86, 0.58, 1.6, Math.PI / 2, 0, 0, 0xff2418, 12);
    K.eye(0, 2.86, 0.66, 0.9);
  },
  // a scribe's face: one small eye, and over the other a jeweller's loupe on a long barrel (for reading what
  // nobody else can); under them, lines of print that get smaller and smaller; quill mandibles
  cluster(K) {
    K.add("head", cyLoft([[2.3, 0.5, 0.5, 0.14], [2.75, 0.66, 0.6, 0.18], [3.15, 0.6, 0.55, 0.18]]), racerM(0, 0, 0), CY.ARMOR);
    K.fplate("head", 1.06, 0.92, 0.14, 0, 2.76, 0.58, CY.PLATE, 0.12);
    K.cyl("head", 0.1, 0.1, 0.08, -0.27, 2.9, 0.66, CY.STEEL, Math.PI / 2 + 0.12, 0, 0, 8);
    K.eye(-0.27, 2.9, 0.72, 0.26);
    K.cyl("head", 0.2, 0.25, 0.34, 0.24, 2.88, 0.8, CY.STEEL, Math.PI / 2 + 0.12, 0, 0, 10); // the loupe's barrel
    K.add("head", new THREE.TorusGeometry(0.21, 0.035, 6, 16), racerM(0.24, 2.9, 0.98, 1, 1, 1, 0.12), CY.BONE); // its rim
    K.eye(0.24, 2.9, 0.985, 0.52);
    K.tube("head", [0.44, 2.98, 0.72], [0.62, 3.12, 0.3], 0.025, CY.STEEL); // its arm, back to the temple
    [0.46, 0.34, 0.24, 0.16].forEach((w, i) => K.glow("head", 3, w, 0.028 - i * 0.004, 0.04, -0.04, 2.56 - i * 0.07, 0.69 + i * 0.008, 2.2)); // the fine print
    K.sym((sd) => { K.cone("head", [sd * 0.3, 2.4, 0.5], [sd * 0.12, 1.98, 0.95], 0.08, 0.01, CY.STEEL); K.breakaway("head", 0.5, 0.5, 0.1, sd * 0.68, 2.8, 0.05, CY.DARK, 0, sd * Math.PI / 2, 0, sd < 0 ? 3 : 9); });
    K.plate("head", 1.3, 0.07, 1.25, 0, 3.22, 0.05, CY.DARK, 0.1, 0, 0, 0.03); // a flat cap
    K.cone("head", [0.45, 3.25, -0.2], [0.75, 4.0, -0.5], 0.04, 0.01, CY.BONE); // a quill behind the ear
  },
  // a low dome sunk between the shoulders, one slit of light
  dome(K) {
    K.cyl("head", 0.78, 0.98, 0.55, 0, 2.3, 0.1, CY.PLATE, 0, 0, 0, 10);
    K.ball("head", 0.78, 0, 2.56, 0.1, CY.ARMOR, 1, 1, 0.55, 1);
    K.fplate("head", 1.1, 0.2, 0.1, 0, 2.44, 0.8, CY.DARK);
    K.glow("head", 1, 0.9, 0.07, 0.05, 0, 2.44, 0.87, 2.2, 0, 0, 0, 0xff2418);
    K.eye(-0.26, 2.44, 0.9, 0.42); K.eye(0.26, 2.44, 0.9, 0.42);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; K.bolt("head", Math.sin(a) * 0.93, 2.12, 0.1 + Math.cos(a) * 0.93); }
    K.breakaway("head", 0.6, 0.4, 0.1, 0.5, 2.78, 0.45, CY.PLATE, -0.6, 0.5, 0, 3);
  },
  // a boiler's head: goggles under a valve wheel
  valve(K) {
    K.cyl("head", 0.6, 0.72, 0.9, 0, 2.6, 0.1, CY.ARMOR, 0, 0, 0, 10);
    K.ball("head", 0.6, 0, 3.05, 0.1, CY.PLATE, 1, 1, 0.5, 1);
    K.cyl("head", 0.06, 0.06, 0.5, 0, 3.5, 0.1, CY.STEEL, 0, 0, 0, 6);
    K.add("head", new THREE.TorusGeometry(0.4, 0.06, 5, 14), racerM(0, 3.75, 0.1, 1, 1, 1, Math.PI / 2), CY.STEEL);
    for (let i = 0; i < 3; i++) K.box("head", 0.78, 0.05, 0.07, 0, 3.75, 0.1, CY.STEEL, 0, (i / 3) * Math.PI, 0);
    K.sym((sd) => {
      K.cyl("head", 0.24, 0.27, 0.22, sd * 0.3, 2.72, 0.66, CY.STEEL, Math.PI / 2, 0, 0, 10);
      K.eye(sd * 0.3, 2.72, 0.8, 0.5);
      K.cable("head", [sd * 0.55, 2.4, 0.3], [sd * 0.95, 2.1, 0.5], 0.2, 0.07, 4);
    });
    K.plate("head", 0.5, 0.18, 0.16, 0, 2.36, 0.72, CY.DARK, 0, 0, 0, 0.04); // grille
    K.breakaway("head", 0.5, 0.6, 0.1, -0.66, 2.7, 0.1, CY.PLATE, 0, -Math.PI / 2, 0, 3);
  },
  // a narrow skull under a crown of spikes
  crown(K) {
    K.ball("head", 0.56, 0, 2.86, 0.2, CY.BONE, 1, 0.82, 1.2, 0.95);
    K.plate("head", 0.5, 0.26, 0.5, 0, 2.2, 0.5, CY.BONE, 0.3, 0, 0, 0.05); // the jaw hangs open
    for (let i = 0; i < 4; i++) K.box("head", 0.08, 0.14, 0.05, -0.17 + i * 0.113, 2.46, 0.66, CY.BONE);
    K.sym((sd) => { K.box("head", 0.2, 0.22, 0.1, sd * 0.2, 2.88, 0.68, CY.DARK); K.eye(sd * 0.2, 2.88, 0.74, 0.4); K.plate("head", 0.12, 0.5, 0.3, sd * 0.42, 2.55, 0.35, CY.DARK, 0, 0, sd * 0.2, 0.03); });
    K.add("head", new THREE.TorusGeometry(0.5, 0.07, 5, 12), racerM(0, 3.28, 0.15, 1, 1, 1, Math.PI / 2 - 0.12), CY.PLATE);
    for (let i = 0; i < 7; i++) {
      const a = ((i - 3) / 7) * Math.PI * 1.5, x = Math.sin(a) * 0.5, z = 0.15 + Math.cos(a) * 0.5, h = 0.75 - Math.abs(i - 3) * 0.1;
      K.cone("head", [x, 3.3, z], [x * 1.45, 3.3 + h, z + (z - 0.15) * 0.35], 0.09, 0.01, CY.PLATE);
      K.glow("head", 3, 0.06, 0.06, 0.06, x * 1.45, 3.32 + h, z + (z - 0.15) * 0.35, 2.6);
    }
    K.breakaway("head", 0.4, 0.5, 0.08, -0.5, 2.9, 0.1, CY.BONE, 0, -Math.PI / 2, 0, 3);
  },
  // a pale face between the curled plates of a judge's wig
  judge(K) {
    K.ball("head", 0.56, 0, 2.82, 0.1, CY.ARMOR, 1, 1, 1.15, 1);
    K.fplate("head", 0.72, 0.9, 0.2, 0, 2.74, 0.5, CY.BONE);
    K.plate("head", 0.16, 0.3, 0.2, 0, 2.66, 0.66, CY.BONE, -0.3, 0, 0, 0.04); // nose
    K.box("head", 0.36, 0.05, 0.05, 0, 2.42, 0.62, CY.DARK);
    K.sym((sd) => {
      K.box("head", 0.22, 0.12, 0.08, sd * 0.19, 2.88, 0.6, CY.DARK);
      K.eye(sd * 0.19, 2.88, 0.66, 0.36);
      K.plate("head", 0.32, 1.5, 1.0, sd * 0.64, 2.5, 0.05, CY.PLATE, 0, 0, sd * -0.1, 0.06);
      for (let i = 0; i < 5; i++) K.cyl("head", 0.13, 0.13, 1.02, sd * 0.78, 3.12 - i * 0.3, 0.05, CY.BONE, Math.PI / 2, 0, 0, 8);
      K.breakaway("head", 0.9, 0.5, 0.08, sd * 0.84, 2.0, 0.05, CY.PLATE, 0, sd * Math.PI / 2, 0, sd < 0 ? 3 : 9);
    });
    for (let i = 0; i < 4; i++) K.cyl("head", 0.14, 0.14, 1.0, -0.45 + i * 0.3, 3.4, 0.05, CY.BONE, Math.PI / 2, 0, 0, 8);
  },
  // a smooth mask with slit eyes and no mouth
  mask(K) {
    K.ball("head", 0.62, 0, 2.86, 0.08, CY.ARMOR, 1, 1, 1.12, 1);
    K.ball("head", 0.6, 0, 2.8, 0.42, CY.BONE, 1, 0.84, 1.26, 0.36);
    K.sym((sd) => {
      K.box("head", 0.3, 0.07, 0.06, sd * 0.2, 2.92, 0.62, CY.DARK, 0, 0, sd * 0.3);
      K.eye(sd * 0.2, 2.92, 0.67, 0.42, 0.45);
      K.plate("head", 0.07, 1.25, 0.62, sd * 0.68, 3.12, -0.1, CY.PLATE, 0.2, 0, sd * -0.28, 0.03); // fins
      K.breakaway("head", 0.5, 0.6, 0.08, sd * 0.6, 2.6, 0.15, CY.DARK, 0, sd * 1.2, 0, sd < 0 ? 3 : 9);
    });
    K.glow("head", 3, 0.12, 0.12, 0.05, 0, 3.26, 0.52, 2.8, 0, 0, Math.PI / 4);
    K.plate("head", 1.5, 0.5, 0.12, 0, 2.18, -0.3, CY.PLATE, -0.3, 0, 0, 0.05); // a high collar behind
  },
  // a signal head: three lenses stacked under little hoods
  tri(K) {
    K.plate("head", 0.86, 1.62, 0.76, 0, 2.98, 0.15, CY.PLATE, 0, 0, 0, 0.1);
    [3.46, 2.98, 2.5].forEach((y, i) => {
      K.cyl("head", 0.25, 0.25, 0.1, 0, y, 0.55, CY.DARK, Math.PI / 2, 0, 0, 10);
      K.plate("head", 0.62, 0.05, 0.3, 0, y + 0.25, 0.66, CY.ARMOR, 0.2, 0, 0, 0.02);
      K.eye(0, y, 0.62, 0.52);
    });
    K.sym((sd) => {
      for (let i = 0; i < 4; i++) K.glow("head", 3, 0.05, 0.14, 0.3, sd * 0.445, 3.5 - i * 0.34, 0.15, i % 2 ? 0.3 : 2.3, 0.6);
      K.breakaway("head", 0.6, 1.2, 0.08, sd * 0.47, 2.98, 0.15, CY.ARMOR, 0, sd * Math.PI / 2, 0, sd < 0 ? 3 : 9);
    });
    K.cyl("head", 0.1, 0.1, 0.3, 0, 3.95, 0.1, CY.DARK, 0, 0, 0, 8);
    K.glowCyl("head", 3, 0.14, 0.16, 0, 4.14, 0.1, 2.6, 0, 0, 0, K.hex, 8);
  },
  // half a skull, half a machine, and a seam of light between them
  split(K) {
    K.ball("head", 0.6, -0.04, 2.82, 0.2, CY.BONE, 1, 0.9, 1.12, 1);
    K.plate("head", 0.56, 1.3, 1.1, 0.34, 2.8, 0.18, CY.DARK, 0, 0, 0, 0.08);
    K.glow("head", 3, 0.05, 1.34, 1.0, 0.045, 2.8, 0.24, 2.4);
    K.cyl("head", 0.26, 0.3, 0.2, 0.3, 2.88, 0.72, CY.STEEL, Math.PI / 2, 0, 0, 10);
    K.eye(0.3, 2.88, 0.86, 0.6);
    K.eye(-0.24, 2.86, 0.74, 0.4);
    K.box("head", 0.2, 0.2, 0.1, -0.24, 2.86, 0.68, CY.DARK);
    K.add("head", new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8), racerM(0.62, 3.1, 0.25, 1, 1, 1, 0, 0, Math.PI / 2), CY.STEEL);
    K.add("head", new THREE.CylinderGeometry(0.13, 0.13, 0.08, 8), racerM(0.62, 2.74, 0.45, 1, 1, 1, 0, 0, Math.PI / 2), CY.STEEL);
    K.plate("head", 0.4, 0.34, 0.6, -0.2, 2.28, 0.42, CY.BONE, 0.1, 0, 0, 0.05);
    K.plate("head", 0.4, 0.4, 0.66, 0.24, 2.3, 0.42, CY.PLATE, 0, 0, 0, 0.05);
    K.breakaway("head", 0.5, 0.6, 0.08, -0.6, 2.8, 0.1, CY.BONE, 0, -Math.PI / 2, 0, 3);
  },
};

// ---- shoulders ----------------------------------------------------------------
const CY_SHOULDER = {
  shield(K, sd, o) {
    K.ball("chest", 0.82, sd * 2.25, 1.5, 0, CY.ARMOR);
    K.breakaway("chest", 1.95, 2.55, 0.42, sd * 2.95, 0.95, 0.62, CY.PLATE, 0.05, sd * 0.55, sd * -0.1, sd < 0 ? 2 : 3);
    K.plate("chest", 1.6, 0.35, 0.5, sd * 2.9, 2.28, 0.6, CY.DARK, 0.05, sd * 0.55, sd * -0.1, 0.06);
    K.glow("chest", 3, 1.7, 0.06, 0.06, sd * 2.98, 2.08, 0.86, 2.8, 0.05, sd * 0.55, sd * -0.1);
    K.plate("chest", 1.5, 2.0, 0.2, sd * 2.8, 0.9, 0.3, CY.ARMOR, 0.05, sd * 0.55, sd * -0.1, 0.05);
  },
  pad(K, sd, o) {
    K.ball("chest", 0.7, sd * 2.25, 1.5, 0, CY.ARMOR);
    [[1.7, 1.85, 0.3], [1.35, 2.12, 0.26], [1.0, 2.34, 0.22]].forEach(([w, y, h], i) => {
      if (i === 0) K.breakaway("chest", w, 1.5, h, sd * 2.45, y, 0, CY.PLATE, -Math.PI / 2, sd * 0.25, 0, sd < 0 ? 2 : 3);
      else K.plate("chest", w, h, 1.5 - i * 0.2, sd * (2.45 - i * 0.06), y, 0, i % 2 ? CY.ARMOR : CY.PLATE, 0, 0, sd * -0.25, 0.07);
    });
    K.glow("chest", 3, 0.06, 0.06, 1.3, sd * 3.2, 1.62, 0, 2.4);
  },
  spike(K, sd, o) {
    CY_SHOULDER.pad(K, sd, o);
    [[-0.45, 0.9], [0, 1.25], [0.45, 0.9]].forEach(([z, h]) => K.cone("chest", [sd * 2.55, 2.3, z], [sd * (2.9 + h * 0.35), 2.4 + h, z * 1.3], 0.2, 0.01, CY.BONE));
  },
  stack(K, sd, o) {
    CY_SHOULDER.pad(K, sd, o);
    K.cyl("chest", 0.3, 0.38, 1.7, sd * 2.4, 3.0, -0.4, CY.DARK, 0.1, 0, sd * 0.08, 10);
    K.add("chest", new THREE.TorusGeometry(0.34, 0.07, 5, 12), racerM(sd * 2.42, 3.82, -0.48, 1, 1, 1, Math.PI / 2 + 0.1), CY.PLATE);
    K.glowCyl("chest", 3, 0.24, 0.06, sd * 2.42, 3.84, -0.48, 2.6, 0.1, 0, 0, K.hex, 10);
    K.steam(sd * 2.42, 3.9, -0.5);
  },
  cannon(K, sd, o) {
    CY_SHOULDER.pad(K, sd, o);
    K.plate("chest", 0.8, 0.7, 1.0, sd * 2.6, 2.75, -0.1, CY.ARMOR, 0, 0, 0, 0.08);
    K.cyl("chest", 0.26, 0.3, 1.7, sd * 2.6, 2.8, 0.75, CY.DARK, Math.PI / 2, 0, 0, 10);
    K.cyl("chest", 0.33, 0.33, 0.2, sd * 2.6, 2.8, 1.55, CY.STEEL, Math.PI / 2, 0, 0, 10);
    K.glowCyl("chest", 3, 0.2, 0.04, sd * 2.6, 2.8, 1.66, 2.6, Math.PI / 2, 0, 0, K.hex, 10);
  },
  pan(K, sd, o) {
    K.ball("chest", 0.6, sd * 2.25, 1.5, 0, CY.ARMOR);
    K.breakaway("chest", 1.4, 1.2, 0.26, sd * 2.4, 1.95, 0, CY.PLATE, -Math.PI / 2, sd * 0.2, 0, sd < 0 ? 2 : 3);
    K.tube("chest", [sd * 2.3, 2.3, 0], [sd * 3.7, 2.75, 0], 0.07, CY.STEEL);
    [[0, 0.55], [0.48, -0.28], [-0.48, -0.28]].forEach(([x, z]) => K.tube("chest", [sd * 3.7, 2.75, 0], [sd * 3.7 + x, 1.55, z], 0.02, CY.STEEL, 4));
    K.cyl("chest", 0.68, 0.5, 0.16, sd * 3.7, 1.5, 0, CY.PLATE, 0, 0, 0, 12);
    K.glowCyl("chest", 3, 0.5, 0.04, sd * 3.7, 1.6, 0, 1.8, 0, 0, 0, K.hex, 12);
  },
  block(K, sd, o) {
    K.breakaway("chest", 1.5, 1.5, 0.3, sd * 2.7, 1.75, 0.7, CY.PLATE, 0, 0, 0, sd < 0 ? 2 : 3);
    K.plate("chest", 1.6, 1.6, 1.5, sd * 2.7, 1.75, -0.1, CY.ARMOR, 0, 0, 0, 0.12);
    K.glow("chest", 3, 1.64, 0.07, 1.54, sd * 2.7, 1.2, -0.1, 2.0);
    K.glow("chest", 3, 0.07, 1.64, 1.54, sd * 2.2, 1.75, -0.1, 2.0);
  },
  fin(K, sd, o) {
    K.ball("chest", 0.6, sd * 2.2, 1.5, 0, CY.ARMOR);
    K.breakaway("chest", 1.9, 1.3, 0.3, sd * 2.5, 2.0, 0, CY.PLATE, -Math.PI / 2, sd * -0.16, 0, sd < 0 ? 2 : 3);
    K.plate("chest", 0.6, 0.12, 1.0, sd * 3.45, 2.3, 0, CY.ARMOR, 0, 0, sd * 0.7, 0.04);
    K.glow("chest", 3, 0.05, 0.05, 1.2, sd * 3.5, 2.2, 0, 2.6);
  },
  bone(K, sd, o) {
    K.ball("chest", 0.55, sd * 2.2, 1.5, 0, CY.BONE);
    K.cone("chest", [sd * 2.3, 1.8, 0], [sd * 3.1, 2.7, -0.2], 0.22, 0.02, CY.BONE);
    K.plate("chest", 0.9, 0.2, 0.9, sd * 2.25, 1.98, 0, CY.PLATE, 0, 0, sd * -0.3, 0.05);
  },
};

// ---- arms and hands (in the arm's own space: the shoulder is the origin) -------
function cyArm(K, s, sd, o) {
  const A = "arm" + s, F = "fore" + s, r = o.r, ua = o.ua, fa = o.fa;
  if (o.style === "bone") {
    K.sym((q) => K.cyl(A, 0.1, 0.09, ua - 0.3, q * 0.12, -ua / 2, 0, CY.BONE, 0, 0, 0, 6));
    K.ball(A, 0.3, 0, -ua, 0, CY.DARK);
    K.cable(A, [0, -0.2, -0.2], [0, -ua + 0.2, -0.25], 0.3, 0.04, 4);
    K.sym((q) => K.cyl(F, 0.08, 0.07, fa - 0.2, q * 0.1, -fa / 2, 0, CY.BONE, 0, 0, 0, 6));
    K.plate(F, 0.36, 0.3, 0.36, 0, -fa * 0.92, 0, CY.DARK, 0, 0, 0, 0.05);
  } else if (o.style === "tube") {
    for (let i = 0; i < 6; i++) K.cyl(A, r * (i % 2 ? 0.78 : 0.95), r * (i % 2 ? 0.95 : 0.78), ua / 6.4, 0, -0.25 - i * (ua - 0.4) / 6, 0, i % 2 ? CY.DARK : CY.ARMOR, 0, 0, 0, 8);
    K.cyl(A, r * 1.1, r * 1.1, r * 1.5, 0, -ua, 0, CY.PLATE, 0, 0, Math.PI / 2, 10);
    for (let i = 0; i < 5; i++) K.cyl(F, r * (i % 2 ? 0.7 : 0.88), r * (i % 2 ? 0.88 : 0.7), fa / 5.6, 0, -0.3 - i * (fa - 0.5) / 5, 0, i % 2 ? CY.DARK : CY.ARMOR, 0, 0, 0, 8);
    K.glow(F, 3, 0.05, fa * 0.6, 0.05, sd * r * 0.95, -fa * 0.5, 0, 2.2);
    K.cyl(F, r * 0.95, r * 0.95, 0.22, 0, -fa * 0.95, 0, CY.PLATE, 0, 0, 0, 8);
  } else {
    // piston / plated: a strut between two hydraulic rams, a servo at the elbow, a gauntlet
    K.cyl(A, r * 0.9, r * 0.8, ua * 0.78, 0, -ua * 0.52, -0.05, CY.DARK, 0, 0, 0, 8);
    K.piston(A, [0, -0.3, r * 0.95], [0, -ua + 0.3, r * 0.85], 0.11);
    K.piston(A, [-sd * r * 0.9, -0.3, -0.1], [-sd * r * 0.8, -ua + 0.3, -0.1], 0.09);
    K.plate(A, ua * 0.6, 0.3, r * 1.9, sd * r * 0.98, -ua * 0.46, 0, CY.PLATE, 0, 0, sd * -Math.PI / 2, 0.06, false);
    K.cable(A, [-sd * 0.25, -0.1, -r], [-sd * 0.1, -ua + 0.1, -r * 0.9], 0.3, 0.06);
    K.cyl(A, r * 1.15, r * 1.15, r * 1.9, 0, -ua, 0, CY.ARMOR, 0, 0, Math.PI / 2, 10);
    K.sym((q) => K.cyl(A, r * 0.6, r * 0.6, 0.1, q * r * 0.98, -ua, 0, CY.STEEL, 0, 0, Math.PI / 2, 8));
    K.plate(F, r * 2.1, fa * 0.95, r * 2.3, 0, -fa * 0.5, 0, CY.ARMOR, 0, 0, 0, 0.1);
    K.breakaway(F, r * 1.7, fa * 0.72, 0.22, sd * r * 1.12, -fa * 0.5, 0, CY.PLATE, 0, sd * Math.PI / 2, 0, sd < 0 ? 1 : 2);
    K.piston(F, [0, -0.2, -r * 1.2], [0, -fa * 0.8, -r * 1.25], 0.09);
    K.glow(F, 3, 0.08, fa * 0.62, 0.08, sd * r * 0.5, -fa * 0.5, r * 1.17, 2.2);
    K.cyl(F, r * 1.05, r * 1.05, 0.24, 0, -fa * 0.97, 0, CY.DARK, 0, 0, 0, 8);
    [-0.3, 0.3].forEach((dy) => K.bolt(F, sd * r * 0.6, -fa * 0.5 + dy * fa, r * 1.17, Math.PI / 2));
  }
  K.xf(racerM(0, -fa, 0, o.hs, o.hs, o.hs), () => CY_HAND[o.hand](K, F, sd));
}
const CY_HAND = {
  fist(K, F, sd) {
    K.plate(F, 0.95, 0.75, 0.98, 0, -0.42, 0.05, CY.ARMOR, 0, 0, 0, 0.1);
    for (let i = 0; i < 4; i++) K.plate(F, 0.2, 0.24, 0.3, -0.34 + i * 0.226, -0.72, 0.42, CY.PLATE, 0.5, 0, 0, 0.04);
    K.plate(F, 0.3, 0.4, 0.3, -sd * 0.52, -0.4, 0.42, CY.PLATE, 0, 0, 0, 0.05);
  },
  claw(K, F, sd) {
    K.plate(F, 0.8, 0.45, 0.7, 0, -0.25, 0.05, CY.ARMOR, 0, 0, 0, 0.08);
    [-0.3, 0, 0.3].forEach((x) => { K.cone(F, [x, -0.4, 0.2], [x * 1.3, -1.0, 0.75], 0.13, 0.1, CY.PLATE); K.cone(F, [x * 1.3, -1.0, 0.75], [x * 1.1, -1.75, 0.55], 0.1, 0.01, CY.BONE); });
    K.cone(F, [-sd * 0.4, -0.3, 0.0], [-sd * 0.75, -0.9, 0.35], 0.1, 0.01, CY.BONE);
  },
  open(K, F, sd) {
    K.plate(F, 0.7, 0.5, 0.3, 0, -0.3, 0.05, CY.ARMOR, 0.3, 0, 0, 0.06);
    for (let i = 0; i < 4; i++) { const x = -0.27 + i * 0.18; K.tube(F, [x, -0.5, 0.15], [x * 1.25, -1.0, 0.42], 0.05, CY.BONE, 5); K.cone(F, [x * 1.25, -1.0, 0.42], [x * 1.35, -1.5, 0.36], 0.05, 0.01, CY.BONE); }
    K.cone(F, [-sd * 0.36, -0.3, 0.1], [-sd * 0.7, -0.8, 0.4], 0.06, 0.01, CY.BONE);
  },
  hammer(K, F, sd) {
    K.plate(F, 0.6, 0.5, 0.6, 0, -0.25, 0.05, CY.ARMOR, 0, 0, 0, 0.08);
    K.tube(F, [0, -0.2, 0.3], [0, -0.5, 2.0], 0.1, CY.STEEL, 6);
    K.plate(F, 1.7, 0.85, 0.85, 0, -0.55, 2.2, CY.PLATE, 0, 0, 0, 0.1);
    K.sym((q) => { K.plate(F, 0.12, 0.95, 0.95, q * 0.6, -0.55, 2.2, CY.DARK, 0, 0, 0, 0.03); K.glow(F, 3, 0.04, 0.5, 0.5, q * 0.87, -0.55, 2.2, 2.2); });
  },
  needle(K, F, sd) {
    K.cyl(F, 0.24, 0.3, 0.5, 0, -0.3, 0.05, CY.DARK, 0, 0, 0, 8);
    K.cone(F, [0, -0.5, 0.1], [0, -2.5, 0.75], 0.14, 0.01, CY.STEEL, 6);
    K.glow(F, 2, 0.09, 0.09, 0.09, 0, -2.52, 0.76, 3);
    K.cyl(F, 0.16, 0.16, 0.5, sd * 0.3, -0.5, 0.0, CY.PLATE, 0, 0, 0, 8); // ink
    K.glowCyl(F, 2, 0.1, 0.3, sd * 0.3, -0.5, 0.14, 1.6, 0, 0, 0, K.hex, 6);
  },
  barrier(K, F, sd) {
    K.plate(F, 0.7, 0.6, 0.7, 0, -0.3, 0.05, CY.ARMOR, 0, 0, 0, 0.08);
    K.cyl(F, 0.2, 0.2, 0.9, 0, -0.6, 0.35, CY.STEEL, Math.PI / 2, 0, 0, 8);
    for (let i = 0; i < 7; i++) {
      const x = -sd * (0.3 + i * 0.52);
      if (i % 2) K.glow(F, 3, 0.5, 0.26, 0.2, x, -0.6, 0.75, 1.9); else K.box(F, 0.5, 0.26, 0.2, x, -0.6, 0.75, CY.BONE);
    }
    K.glow(F, 1, 0.16, 0.16, 0.12, -sd * 3.75, -0.6, 0.75, 2.6, 0, 0, 0, 0xff2418);
  },
  cleaver(K, F, sd) {
    K.plate(F, 0.6, 0.5, 0.6, 0, -0.25, 0.05, CY.ARMOR, 0, 0, 0, 0.08);
    K.fplate(F, 1.25, 2.5, 0.12, sd * 0.1, -1.6, 0.4, CY.PLATE, 0.25, sd * Math.PI / 2, 0);
    K.glow(F, 3, 0.06, 2.45, 0.06, sd * 0.1, -1.85, 1.02, 2.8, 0.25);
    K.plate(F, 0.2, 2.5, 0.16, sd * 0.1, -1.4, -0.16, CY.DARK, 0.25, 0, 0, 0.04);
  },
  strings(K, F, sd) {
    K.plate(F, 0.9, 0.3, 0.5, 0, -0.2, 0.1, CY.ARMOR, 0.2, 0, 0, 0.06);
    for (let i = 0; i < 5; i++) {
      const x = -0.5 + i * 0.25, z = 0.5 + (2 - Math.abs(i - 2)) * 0.22;
      K.tube(F, [x * 0.7, -0.3, 0.2], [x, -0.55, z], 0.045, CY.BONE, 5);
      K.cone(F, [x, -0.55, z], [x * 1.1, -0.95, z + 0.25], 0.045, 0.01, CY.BONE);
      K.tube(F, [x * 1.1, -0.95, z + 0.25], [x * 1.15, -2.5 + cyHash(i) * 0.6, z + 0.3], 0.012, CY.STEEL, 3);
      K.glow(F, 3, 0.22, 0.04, 0.04, x * 1.15, -2.5 + cyHash(i) * 0.6, z + 0.3, 2.4, 0, i * 0.7);
    }
  },
  cannon(K, F, sd) {
    K.cyl(F, 0.5, 0.55, 1.3, 0, -0.7, 0.05, CY.ARMOR, 0, 0, 0, 10);
    K.cyl(F, 0.58, 0.58, 0.2, 0, -1.3, 0.05, CY.STEEL, 0, 0, 0, 10);
    K.glowCyl(F, 3, 0.36, 0.05, 0, -1.42, 0.05, 2.6, 0, 0, 0, K.hex, 10);
    [0, 1, 2].forEach((i) => { const a = (i / 3) * Math.PI * 2; K.cyl(F, 0.11, 0.11, 1.1, Math.sin(a) * 0.52, -0.6, 0.05 + Math.cos(a) * 0.52, CY.DARK, 0, 0, 0, 6); });
  },
  // a briefcase on a short chain
  kase(K, F, sd) {
    K.plate(F, 0.6, 0.45, 0.6, 0, -0.25, 0.05, CY.ARMOR, 0, 0, 0, 0.08);
    K.tube(F, [0, -0.45, 0.1], [0, -0.85, 0.15], 0.035, CY.STEEL, 4);
    K.add(F, new THREE.TorusGeometry(0.2, 0.04, 4, 10, Math.PI), racerM(0, -0.9, 0.15), CY.STEEL);
    K.plate(F, 1.7, 1.15, 0.42, 0, -1.52, 0.15, CY.PLATE, 0, 0, 0, 0.08);
    K.sym((q) => { K.plate(F, 0.2, 0.2, 0.46, q * 0.76, -1.05, 0.15, CY.STEEL, 0, 0, 0, 0.04); K.plate(F, 0.2, 0.2, 0.46, q * 0.76, -1.99, 0.15, CY.STEEL, 0, 0, 0, 0.04); });
    K.glow(F, 3, 0.3, 0.12, 0.05, 0, -1.05, 0.38, 2.6);
    K.box(F, 1.72, 0.04, 0.44, 0, -1.2, 0.15, CY.DARK);
  },
};

// ---- bases --------------------------------------------------------------------
const CY_BASE = {
  jet(K) {
    K.cyl("base", 0.95, 0.5, 0.8, 0, -3.0, 0, CY.DARK, 0, 0, 0, 8);
    K.glowCyl("base", 2, 0.42, 0.1, 0, -3.42, 0, 3.2, 0, 0, 0, K.hex, 8);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.78; K.plate("base", 0.1, 0.7, 0.5, Math.sin(a) * 0.8, -3.0, Math.cos(a) * 0.8, CY.PLATE, 0, a, 0, 0.03); }
    K.jet(0, -3.6, 0, 2.4);
  },
  tri(K) {
    [[-1.0, 0.3], [1.0, 0.3], [0, -0.8]].forEach(([x, z]) => {
      K.tube("base", [x * 0.5, -2.5, z * 0.5], [x, -2.95, z], 0.09, CY.STEEL);
      K.cyl("base", 0.42, 0.26, 0.6, x, -3.1, z, CY.DARK, 0, 0, 0, 8);
      K.glowCyl("base", 2, 0.22, 0.08, x, -3.42, z, 3.0, 0, 0, 0, K.hex, 8);
    });
    K.jet(0, -3.6, 0, 2.8);
  },
  tail(K) {
    for (let i = 0; i < 7; i++) {
      const y = -2.75 - i * 0.3, z = -Math.pow(i, 1.5) * 0.09, s = 1 - i * 0.11;
      K.plate("base", 1.0 * s, 0.24, 0.8 * s, 0, y, z, i % 2 ? CY.PLATE : CY.ARMOR, 0.1 + i * 0.07, 0, 0, 0.05);
      if (i < 6) K.glow("base", 2, 0.5 * s, 0.07, 0.5 * s, 0, y - 0.15, z - 0.03, 1.8);
    }
    K.cone("base", [0, -4.8, -1.65], [0, -5.5, -2.2], 0.12, 0.01, CY.BONE);
  },
  skirt(K) {
    K.cyl("base", 0.5, 0.3, 1.0, 0, -3.0, 0, CY.DARK, 0, 0, 0, 8);
    K.glowCyl("base", 2, 0.26, 0.08, 0, -3.52, 0, 2.6, 0, 0, 0, K.hex, 8);
    K.jet(0, -3.7, 0, 2.0);
  },
  treads(K) {
    K.plate("base", 3.4, 0.5, 1.7, 0, -2.75, 0, CY.ARMOR, 0, 0, 0, 0.1);
    K.sym((sd) => {
      K.plate("base", 1.0, 1.0, 2.5, sd * 1.9, -3.15, 0.1, CY.DARK, 0, 0, 0, 0.2);
      for (let i = 0; i < 4; i++) { K.cyl("base", 0.3, 0.3, 0.12, sd * 2.43, -3.2, -0.8 + i * 0.6, CY.STEEL, 0, 0, Math.PI / 2, 8); K.bolt("base", sd * 2.5, -3.2, -0.8 + i * 0.6, 0, sd * -Math.PI / 2); }
      for (let i = 0; i < 9; i++) K.box("base", 1.04, 0.07, 0.2, sd * 1.9, -2.63, -1.0 + i * 0.28, CY.PLATE);
      for (let i = 0; i < 4; i++) K.box("base", 1.04, 0.2, 0.07, sd * 1.9, -2.8 - i * 0.26, 1.37, CY.PLATE);
      K.glow("base", 3, 0.5, 0.12, 0.05, sd * 1.9, -2.6, 1.38, 2.6);
    });
  },
  legs(K) {
    K.sym((sd) => {
      K.plate("base", 1.2, 1.0, 1.3, sd * 0.9, -3.0, 0.05, CY.ARMOR, 0, 0, 0, 0.12);
      K.plate("base", 1.45, 0.4, 1.8, sd * 0.9, -3.62, 0.3, CY.PLATE, 0, 0, 0, 0.1);
      K.glow("base", 3, 1.24, 0.07, 1.34, sd * 0.9, -3.38, 0.05, 2.0);
      K.piston("base", [sd * 0.4, -2.5, 0.5], [sd * 0.7, -3.4, 0.8], 0.09);
    });
  },
  coil(K) {
    K.cyl("base", 0.5, 0.5, 2.6, 0, -3.05, 0.2, CY.BONE, 0, 0, Math.PI / 2, 12);
    K.sym((sd) => { K.cyl("base", 0.62, 0.62, 0.14, sd * 1.36, -3.05, 0.2, CY.PLATE, 0, 0, Math.PI / 2, 12); K.ball("base", 0.2, sd * 1.52, -3.05, 0.2, CY.STEEL); });
    K.plate("base", 2.2, 1.4, 0.05, 0, -3.9, 0.66, CY.BONE, -0.12, 0, 0, 0.02);
    for (let i = 0; i < 6; i++) K.glow("base", 2, 1.7 - cyHash(i * 2.2) * 0.9, 0.05, 0.03, -0.1 - cyHash(i) * 0.2, -3.4 - i * 0.17, 0.74 + i * 0.02, 1.8, -0.12);
    K.tube("base", [0, -2.6, 0], [0, -3.0, 0.1], 0.2, CY.DARK);
  },
};

// ---- cores (the light in the chest) ---------------------------------------------
const CY_CORE = {
  none() {},
  reactor(K, z = 1.2, y = 0.75) {
    K.add("chest", new THREE.TorusGeometry(0.46, 0.09, 5, 16), racerM(0, y, z), CY.STEEL);
    K.glowCyl("chest", 2, 0.38, 0.08, 0, y, z - 0.04, 2.6, Math.PI / 2, 0, 0, K.hex, 14);
    for (let i = 0; i < 3; i++) K.box("chest", 0.8 - Math.abs(i - 1) * 0.2, 0.07, 0.1, 0, y - 0.2 + i * 0.2, z + 0.03, CY.DARK);
  },
  gauge(K, z = 1.78, y = 0.3) {
    K.cyl("chest", 0.74, 0.74, 0.14, 0, y, z, CY.BONE, Math.PI / 2, 0, 0, 16);
    K.add("chest", new THREE.TorusGeometry(0.76, 0.08, 5, 18), racerM(0, y, z + 0.06), CY.STEEL);
    for (let i = 0; i < 9; i++) { const a = -2.2 + (i / 8) * 4.4; K.glow("chest", 2, 0.05, 0.16, 0.04, Math.sin(a) * 0.56, y + Math.cos(a) * 0.56, z + 0.08, i > 5 ? 3 : 1.4, 0, 0, -a, i > 5 ? 0xff2418 : K.hex); }
    K.box("chest", 0.06, 0.6, 0.05, 0.2, y + 0.16, z + 0.1, CY.DARK, 0, 0, -0.9); // the needle, far into the red
    K.cyl("chest", 0.08, 0.08, 0.08, 0, y, z + 0.1, CY.STEEL, Math.PI / 2, 0, 0, 8);
  },
  hourglass(K) {
    K.cone("chest", [0, 1.3, 0.25], [0, 0.6, 0.25], 0.42, 0.04, CY.STEEL, 8);
    K.cone("chest", [0, -0.1, 0.25], [0, 0.6, 0.25], 0.42, 0.04, CY.STEEL, 8);
    K.add("chest", new THREE.ConeGeometry(0.3, 0.45, 8), racerM(0, 0.12, 0.25), K.hex, 2.6, 2);
    K.glow("chest", 2, 0.03, 0.5, 0.03, 0, 0.5, 0.25, 2.6);
    K.sym((sd) => K.tube("chest", [sd * 0.46, 1.36, 0.25], [sd * 0.46, -0.16, 0.25], 0.03, CY.STEEL, 4));
    [1.36, -0.16].forEach((y) => K.cyl("chest", 0.5, 0.5, 0.08, 0, y, 0.25, CY.PLATE, 0, 0, 0, 8));
  },
  vault(K, z = 1.16, y = 0.7) {
    K.cyl("chest", 0.78, 0.78, 0.16, 0, y, z - 0.06, CY.DARK, Math.PI / 2, 0, 0, 16);
    K.add("chest", new THREE.TorusGeometry(0.6, 0.07, 5, 18), racerM(0, y, z + 0.08), CY.STEEL);
    for (let i = 0; i < 4; i++) K.box("chest", 1.2, 0.07, 0.07, 0, y, z + 0.08, CY.STEEL, 0, 0, (i / 4) * Math.PI);
    K.cyl("chest", 0.16, 0.16, 0.14, 0, y, z + 0.1, CY.PLATE, Math.PI / 2, 0, 0, 8);
    K.add("chest", new THREE.TorusGeometry(0.8, 0.035, 4, 24), racerM(0, y, z + 0.02), K.hex, 2.4, 2);
  },
  rings(K, z = 1.12, y = 0.85) {
    [0.62, 0.42, 0.22].forEach((r, i) => K.add("chest", new THREE.TorusGeometry(r, 0.045, 4, 20), racerM(0, y, z + i * 0.03), K.hex, 2.0 + i * 0.4, 2));
    K.glowCyl("chest", 2, 0.08, 0.06, 0, y, z + 0.1, 3, Math.PI / 2, 0, 0, 0xffffff, 8);
    K.sym((sd) => K.tube("chest", [sd * 0.5, 1.9, 0.75], [sd * 0.3, y + 0.55, z], 0.025, CY.STEEL, 4)); // on a chain
  },
  slot(K, z = 1.14, y = 1.25) {
    K.fplate("chest", 1.5, 0.5, 0.1, 0, y, z - 0.03, CY.DARK);
    K.glow("chest", 2, 1.0, 0.1, 0.05, 0, y, z + 0.04, 2.8);
    for (let i = 0; i < 3; i++) K.cyl("chest", 0.2, 0.2, 0.05, -0.36 + i * 0.36, y - 0.55, z + 0.02, CY.BONE, Math.PI / 2, 0, 0, 10);
  },
  text(K, z = 1.16) {
    K.fplate("chest", 2.0, 2.2, 0.1, 0, 0.6, z - 0.04, CY.BONE);
    for (let i = 0; i < 9; i++) K.glow("chest", 2, 1.6 - cyHash(i * 1.7) * 0.9, 0.06, 0.04, -0.12 - cyHash(i + 5) * 0.3, 1.5 - i * 0.22, z + 0.03, 1.9);
    K.glow("chest", 3, 0.5, 0.05, 0.04, 0.5, -0.36, z + 0.03, 2.8);
  },
};

// ---- the twelve -----------------------------------------------------------------
// arm: [upper length, forearm length, thickness, style]; rest: [swing, spread, bend]
const CYBORGS = {
  // PRODUCT PUSHER: a salesman in a suit of plate, briefcase in one hand, the other held out
  1: { torso: "suit", head: "grin", shoulder: "fin", arm: [2.0, 1.9, 0.36, "tube"], hands: ["kase", "open"], hs: 0.9, base: "jet", core: "none", rest: [-0.1, 0.1, -0.5], restR: [-0.5, 0.12, -1.25], sway: 1.3, breath: 2.2 },
  // PERIL PRIME: a horned brute, all spikes, claws and hazard stripes
  2: { torso: "hulk", chevrons: true, head: "horned", shoulder: "spike", arm: [2.05, 2.0, 0.5, "piston"], hands: ["claw", "claw"], hs: 1.1, base: "jet", core: "reactor", rest: [0, 0.16, -0.6], twitch: 1.6, breath: 2.6, extra(K) { for (let i = 0; i < 5; i++) K.glow("hips", 3, 0.24, 0.1, 0.05, -0.8 + i * 0.4, -2.52, 0.88, i % 2 ? 0.3 : 2.4, 0, 0, 0.7); } },
  // SOLVENCY SPECTER: a hooded wraith in tattered plate, one eye, an empty vault in its chest
  3: { torso: "robe", ragged: true, folds: 11, head: "cyclops", shoulder: "bone", arm: [2.2, 2.3, 0.3, "bone"], hands: ["open", "open"], hs: 1.15, base: "tail", core: "vault", rest: [-0.25, 0.3, -0.9], sway: 1.5, breath: 1.5, steam: 1.6 },
  // THE FINE PRINT: a hunched scribe, many-eyed, four quill arms, clauses scrolling down its chest
  4: { torso: "robe", folds: 7, head: "cluster", shoulder: "pad", arm: [1.9, 2.0, 0.3, "tube"], hands: ["needle", "needle"], hs: 0.95, base: "coil", core: "text", rest: [-0.35, 0.1, -1.0], hunch: 0.16, twitch: 1.8,
    extra(K) { K.sym((sd) => { K.tube("chest", [sd * 1.5, 0.4, 0.5], [sd * 2.2, -0.3, 1.0], 0.1, CY.DARK); K.ball("chest", 0.2, sd * 2.2, -0.3, 1.0, CY.STEEL); K.cone("chest", [sd * 2.2, -0.3, 1.0], [sd * 1.7, -1.5, 1.8], 0.1, 0.01, CY.STEEL); K.glow("chest", 2, 0.08, 0.08, 0.08, sd * 1.7, -1.52, 1.82, 3); }); } },
  // GROUP GOLEM: slabs on slabs, a head sunk between cube shoulders, fists like safes
  5: { torso: "hulk", gut: { n: 3, w: 2.6, d: 1.6 }, hips: { w: 3.0 }, head: "dome", neck: 1.8, headS: 1.15, shoulder: "block", arm: [1.8, 1.9, 0.6, "piston"], hands: ["fist", "fist"], hs: 1.45, base: "legs", core: "reactor", rest: [0, 0.2, -0.35], sway: 0.6, breath: 1.4, twitch: 0.5 },
  // INFLATION TITAN: a boiler about to burst, gauge in the red, stacks venting
  6: { torso: "barrel", head: "valve", shoulder: "stack", arm: [1.9, 1.9, 0.42, "tube"], hands: ["fist", "fist"], hs: 1.0, base: "tri", core: "gauge", rest: [0, 0.34, -0.5], swell: 2.2, breath: 1.7, steam: 2.2, sw: 2.45 },
  // LONGEVITY LICH: a crowned skeleton with an hourglass where its heart was
  7: { torso: "cage", head: "crown", shoulder: "bone", arm: [2.2, 2.2, 0.3, "bone"], hands: ["open", "open"], hs: 1.25, base: "tail", core: "hourglass", rest: [-0.2, 0.22, -0.8], sway: 1.2, breath: 1.3 },
  // LORD INTESTATE: a judge in a plated robe and wig, gavel raised, scales on his shoulders
  8: { torso: "robe", folds: 10, head: "judge", shoulder: "pan", arm: [2.0, 2.0, 0.42, "piston"], hands: ["open", "hammer"], hs: 1.0, base: "skirt", core: "none", rest: [0, 0.14, -0.5], restR: [-0.7, 0.2, -1.3], sway: 0.8, breath: 1.6 },
  // UNDUE INFLUENCER: a masked puppeteer, strings hanging from long fingers
  9: { torso: "suit", tie: false, gut: { n: 6, w: 1.3 }, head: "mask", shoulder: "fin", arm: [2.2, 2.2, 0.3, "tube"], hands: ["strings", "strings"], hs: 1.0, base: "jet", core: "rings", rest: [-0.75, 0.42, -0.9], sway: 1.6, breath: 1.9,
    extra(K) { K.sym((sd) => K.plate("hips", 0.9, 2.0, 0.1, sd * 0.75, -3.2, -0.75, CY.PLATE, 0.14, 0, sd * 0.08, 0.04)); } },
  // PROBATRON: a toll booth on tracks, barrier arm down, shoulder guns, a signal for a head
  10: { torso: "cabinet", head: "tri", neck: 2.15, shoulder: "cannon", arm: [1.9, 1.9, 0.46, "piston"], hands: ["barrier", "cannon"], hs: 1.0, base: "treads", core: "slot", rest: [0, 0.14, -0.55], restL: [-0.2, 0.22, -1.2], sway: 0.5, breath: 1.2, twitch: 0.7 },
  // PATRIMONY PHANTOM: split down the middle: half armored, half bone, a cleaver to divide the rest
  11: { torso: "hulk", head: "split", shoulder: ["shield", "bone"], arm: [2.05, 2.0, 0.46, "piston"], armR: [2.2, 2.2, 0.3, "bone"], hands: ["cleaver", "open"], hs: 1.05, base: "tail", core: "none", rest: [0, 0.14, -0.6], restL: [-0.5, 0.25, -1.0], sway: 1.1, breath: 1.8,
    extra(K) { K.glow("chest", 3, 0.07, 2.3, 0.07, 0, 0.75, 1.38, 3, -0.1); K.glow("hips", 3, 0.07, 0.8, 0.07, 0, -2.25, 1.0, 3); } },
  // THE PROCTOR: the hulking black-armored cyborg: slab shields, piston arms, an examiner's capped helm
  all: { torso: "hulk", head: "proctor", shoulder: "shield", arm: [2.1, 2.0, 0.5, "piston"], hands: ["fist", "fist"], hs: 1.0, base: "jet", core: "reactor", rest: [0, 0.08, -0.42], sway: 1, breath: 2.0,
    extra(K) { K.sym((sd) => { K.cyl("chest", 0.2, 0.26, 1.7, sd * 1.15, 2.5, -1.15, CY.DARK, 0.15, 0, sd * 0.1, 8); K.glowCyl("chest", 3, 0.16, 0.06, sd * 1.15, 3.36, -1.28, 3, 0.15, 0, sd * 0.1, K.hex, 8); K.steam(sd * 1.15, 3.45, -1.3); }); } },
};

class CyborgRig {
  constructor(game, key) {
    const g = (this.g = game), hex = game.cfg.color;
    const D = (this.D = Object.assign({ sw: 2.25, sy: 1.5, neck: 2.05, sway: 1, breath: 2, twitch: 1, steam: 1, swell: 1, hunch: 0 }, CYBORGS[key] || CYBORGS.all));
    this.mat = cyborgArmor(game.env, hex);
    this.uL = this.mat.userData.uL.value;
    const grp = (this.grp = new THREE.Group());
    const G = (this.G = {}), B = {}, piv = { body: [0, 0, 0], hips: [0, 0, 0], base: [0, -2.6, 0], chest: [0, -0.5, 0], head: [0, D.neck, 0.1] };
    const mk = (n, parent, x, y, z) => { const o = (G[n] = new THREE.Group()); o.position.set(x, y, z); parent.add(o); B[n] = new RacerBatch(["aGlow"]); return o; };
    mk("body", grp, 0, 0, 0);
    mk("hips", G.body, 0, 0, 0);
    mk("base", G.body, 0, -2.6, 0);
    mk("chest", G.body, 0, -0.5, 0);
    mk("head", G.chest, 0, D.neck + 0.5, 0.1);
    const armOf = (s) => (s === "R" && D.armR) || D.arm;
    for (const [s, sd] of [["L", -1], ["R", 1]]) { mk("arm" + s, G.chest, sd * D.sw, D.sy + 0.5, 0); mk("fore" + s, G["arm" + s], 0, -armOf(s)[0], 0); }
    this.plates = []; this.vents = []; this.eyes = []; this.jetAt = null;
    const stack = [];
    const BOX = new THREE.BoxGeometry(1, 1, 1), HEXB = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6), RX90 = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    const full = (gn, m) => {
      let mm = m ? m.clone() : new THREE.Matrix4();
      for (let i = stack.length - 1; i >= 0; i--) mm.premultiply(stack[i]);
      const p = piv[gn];
      if (p) mm.premultiply(new THREE.Matrix4().makeTranslation(-p[0], -p[1], -p[2]));
      return mm;
    };
    const hot = new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.55);
    const crackOn = (b, M, len, ang, ch, seed) => {
      let px = (-Math.cos(ang) * len) / 2, py = (-Math.sin(ang) * len) / 2;
      for (let i = 0; i < 6; i++) {
        const l = (len / 6) * (0.7 + 0.6 * cyHash(seed + i)), na = ang + (i % 2 ? 1 : -1) * (0.45 + 0.4 * cyHash(seed + i + 9));
        const nx = px + Math.cos(na) * l, ny = py + Math.sin(na) * l;
        b.add(BOX, M.clone().multiply(racerM((px + nx) / 2, (py + ny) / 2, 0, l + 0.03, 0.06 * (1 - i / 10), 0.03, 0, 0, na)), hot, 2.6, { aGlow: ch });
        if (i === 1 || i === 3) b.add(BOX, M.clone().multiply(racerM(nx + Math.cos(na + 1.2) * l * 0.35, ny + Math.sin(na + 1.2) * l * 0.35, 0, l * 0.7, 0.035, 0.03, 0, 0, na + 1.2)), hot, 2.2, { aGlow: ch });
        px = nx; py = ny;
      }
    };
    const K = {
      hex, D,
      add(gn, geo, m, color, k = 1, ch = 0) { B[gn].add(geo, full(gn, m), color, k, { aGlow: ch }); geo.dispose(); },
      box(gn, w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0) { B[gn].add(BOX, full(gn, racerM(x, y, z, w, h, d, rx, ry, rz)), c, 1, { aGlow: 0 }); },
      plate(gn, w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0, ch = 0.05, all = true) { K.add(gn, racerPlate(w, h, d, ch, all), racerM(x, y, z, 1, 1, 1, rx, ry, rz), c); },
      // a plate that faces +z (w wide, h tall, t thick), chamfered on its face
      fplate(gn, w, h, t, x, y, z, c, rx = 0, ry = 0, rz = 0) { K.add(gn, racerPlate(w, t, h, Math.min(0.05, t * 0.45)), racerM(x, y, z, 1, 1, 1, rx, ry, rz).multiply(RX90), c); },
      cyl(gn, rt, rb, h, x, y, z, c, rx = 0, ry = 0, rz = 0, n = 10) { K.add(gn, new THREE.CylinderGeometry(rt, rb, h, n), racerM(x, y, z, 1, 1, 1, rx, ry, rz), c); },
      ball(gn, r, x, y, z, c, det = 0, sx = 1, sy = 1, sz = 1) { K.add(gn, new THREE.IcosahedronGeometry(r, det), racerM(x, y, z, sx, sy, sz), c); },
      bolt(gn, x, y, z, rx = 0, rz = 0) { B[gn].add(HEXB, full(gn, racerM(x, y, z, 1, 1, 1, rx, 0, rz)), CY.STEEL, 1, { aGlow: 0 }); },
      cone(gn, a, b, r1, r2, c, n = 6) {
        const A = V(a), Bv = V(b), d = new THREE.Vector3().subVectors(Bv, A);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
        K.add(gn, new THREE.CylinderGeometry(r2, r1, d.length(), n), new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), c);
      },
      tube(gn, a, b, r, c, n = 6) { K.cone(gn, a, b, r, r, c, n); },
      strut(gn, a, b, t, c) {
        const A = V(a), Bv = V(b), d = new THREE.Vector3().subVectors(Bv, A);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.clone().normalize());
        B[gn].add(BOX, full(gn, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(d.length() + t * 0.4, t, t))), c, 1, { aGlow: 0 });
      },
      glow(gn, ch, w, h, d, x, y, z, k = 2.4, rx = 0, ry = 0, rz = 0, color = hex) { B[gn].add(BOX, full(gn, racerM(x, y, z, w, h, d, rx, ry, rz)), color, k, { aGlow: ch }); },
      glowCyl(gn, ch, r, h, x, y, z, k = 2.4, rx = 0, ry = 0, rz = 0, color = hex, n = 10) { K.add(gn, new THREE.CylinderGeometry(r, r, h, n), racerM(x, y, z, 1, 1, 1, rx, ry, rz), color, k, ch); },
      // a hydraulic ram: dark sleeve, bright rod, collars
      piston(gn, a, b, r) {
        const A = V(a), Bv = V(b), mid = A.clone().lerp(Bv, 0.55);
        K.tube(gn, a, [mid.x, mid.y, mid.z], r, CY.DARK, 8);
        K.tube(gn, [mid.x, mid.y, mid.z], b, r * 0.55, CY.STEEL, 6);
        K.ball(gn, r * 1.25, A.x, A.y, A.z, CY.PLATE);
        K.ball(gn, r * 1.1, Bv.x, Bv.y, Bv.z, CY.PLATE);
        K.tube(gn, [mid.x, mid.y, mid.z], [mid.x + (Bv.x - A.x) * 0.04, mid.y + (Bv.y - A.y) * 0.04, mid.z + (Bv.z - A.z) * 0.04], r * 1.2, CY.STEEL, 8);
      },
      // a cable that hangs between two points
      cable(gn, a, b, sag = 0.3, r = 0.05, n = 5) {
        let p = a;
        for (let i = 1; i <= n; i++) {
          const t = i / n, s = Math.sin(t * Math.PI) * sag;
          const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - s, a[2] + (b[2] - a[2]) * t - s * 0.5];
          K.tube(gn, p, q, r, CY.DARK, 5);
          p = q;
        }
      },
      // a slatted vent that breathes steam
      vent: (gn, x, y, z, w, h, rx = 0, ry = 0, rz = 0) => {
        K.xf(racerM(x, y, z, 1, 1, 1, rx, ry, rz), () => {
          K.fplate(gn, w, h, 0.08, 0, 0, 0, CY.DARK);
          for (let i = 0; i < 4; i++) K.plate(gn, w * 0.86, 0.035, 0.12, 0, h * (0.32 - i * 0.21), 0.07, CY.PLATE, 0.6, 0, 0, 0.01);
        });
        const p = new THREE.Vector3(0, 0, 0.15).applyMatrix4(full(gn, racerM(x, y, z, 1, 1, 1, rx, ry, rz)));
        this.vents.push(p);
      },
      steam: (x, y, z) => { this.vents.push(new THREE.Vector3(x, y + 0.5, z)); },
      jet: (x, y, z, s) => { this.jetAt = [x, y, z, s]; },
      // an armor plate (facing +z before rotation) that is shot off at a damage stage,
      // baring a circuit board underneath
      breakaway: (gn, w, h, t, x, y, z, c, rx = 0, ry = 0, rz = 0, stage = 1, deco) => {
        const b = new RacerBatch(["aGlow"]);
        const pg = racerPlate(w, t, h, Math.min(0.06, t * 0.45));
        b.add(pg, RX90, c, 1, { aGlow: 0 });
        pg.dispose();
        // it cracks one stage before it goes
        if (stage >= 2) crackOn(b, new THREE.Matrix4().makeTranslation(0, 0, t / 2 + 0.012), Math.min(w, h) * 0.95, cyHash(x * 3.1 + y) * 6.28, 4 + Math.min(3, stage - 1), x * 5.3 + y * 9.1);
        if (deco) deco((gw, gh, gx, gy, k = 2.4, ch = 3, rz = 0) => b.add(BOX, racerM(gx, gy, t / 2 + 0.02, gw, gh, 0.05, 0, 0, rz), hex, k, { aGlow: ch }));
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => b.add(HEXB, racerM(i * (w / 2 - 0.12), j * (h / 2 - 0.12), t / 2, 1, 1, 1, Math.PI / 2), CY.STEEL, 1, { aGlow: 0 }));
        const mesh = new THREE.Mesh(b.build("color"), this.mat);
        const m = full(gn, racerM(x, y, z, 1, 1, 1, rx, ry, rz));
        m.decompose(mesh.position, mesh.quaternion, mesh.scale);
        G[gn].add(mesh);
        this.plates.push({ mesh, stage, gn, p0: mesh.position.clone(), q0: mesh.quaternion.clone(), s0: mesh.scale.clone(), v: new THREE.Vector3(), w: new THREE.Vector3(), t: -1, n: new THREE.Vector3(0, 0, 1).applyQuaternion(mesh.quaternion) });
        K.xf(racerM(x, y, z, 1, 1, 1, rx, ry, rz), () => {
          K.box(gn, w * 0.88, h * 0.88, t * 0.5, 0, 0, -t * 0.2, CY.DARK);
          const sdn = cyHash(x * 3.3 + y * 7.7 + z);
          for (let i = 0; i < 4; i++) K.glow(gn, 4, w * (0.25 + cyHash(sdn + i) * 0.5), 0.035, 0.02, (cyHash(sdn + i * 2.3) - 0.5) * w * 0.3, h * (-0.32 + i * 0.21), t * 0.06, 2.2, 0, 0, 0, i % 2 ? 0xffffff : hex);
          for (let i = 0; i < 3; i++) K.glow(gn, 4, 0.035, h * (0.2 + cyHash(sdn + i * 5.1) * 0.3), 0.02, w * (-0.3 + i * 0.3), (cyHash(sdn + i * 1.9) - 0.5) * h * 0.3, t * 0.06, 2.2);
          K.box(gn, w * 0.22, h * 0.16, 0.05, w * 0.18, h * 0.12, t * 0.05, CY.STEEL);
          K.box(gn, w * 0.16, h * 0.12, 0.05, -w * 0.22, -h * 0.2, t * 0.05, CY.PLATE);
        });
      },
      // a jagged glowing crack across a surface that faces +z (before rotation)
      crack(gn, stage, x, y, z, len, ang, rx = 0, ry = 0) { crackOn(B[gn], full(gn, racerM(x, y, z, 1, 1, 1, rx, ry, 0)), len, ang, 4 + stage, x * 5.3 + y * 9.1 + stage); },
      eye: (x, y, z, s, asp = 1) => { const p = new THREE.Vector3(x, y, z).applyMatrix4(full("head", null)); this.eyes.push([p.x, p.y, p.z, s, asp]); },
      sym(fn) { fn(-1); fn(1); },
      xf(m, fn) { stack.push(m); fn(); stack.pop(); },
    };
    // ---- assemble this boss
    const hunch = racerM(0, 0, 0, 1, 1, 1, D.hunch, 0, 0);
    const hs = D.headS || 1;
    const headM = new THREE.Matrix4().makeTranslation(0, D.neck + (D.headY || 0), 0.1).multiply(racerM(0, 0, 0, hs, hs, hs)).multiply(new THREE.Matrix4().makeTranslation(0, -2.05, -0.1));
    K.xf(hunch, () => {
      CY_TORSO[D.torso](K, D);
      cyNeck(K);
      K.xf(headM, () => CY_HEAD[D.head](K, D));
      K.sym((sd) => { const t = Array.isArray(D.shoulder) ? D.shoulder[sd < 0 ? 0 : 1] : D.shoulder; CY_SHOULDER[t](K, sd, D); });
      CY_CORE[D.core](K);
    });
    CY_BASE[D.base](K);
    for (const [s, sd] of [["L", -1], ["R", 1]]) {
      const a = armOf(s);
      cyArm(K, s, sd, { ua: a[0], fa: a[1], r: a[2], style: a[3], hand: D.hands[sd < 0 ? 0 : 1], hs: D.hs || 1 });
    }
    if (D.extra) D.extra(K);
    for (const n in B) if (B[n].pos.length) G[n].add(new THREE.Mesh(B[n].build("color"), this.mat));
    BOX.dispose(); HEXB.dispose();
    this.rest = { L: D.restL || D.rest, R: D.restR || D.rest };

    // ---- eyes: red coals on one anchor that blinks and aims the beam
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "#fff"); gr.addColorStop(0.25, "#ff3a2a"); gr.addColorStop(0.6, "rgba(255,30,30,0.35)"); gr.addColorStop(1, "rgba(255,0,0,0)");
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const eyeMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
    eyeMat.color.setScalar(1.15);
    const eye = (this.eye = new THREE.Group());
    eye.material = eyeMat; // the fight tints this as the boss enrages
    const E = this.eyes.length ? this.eyes : [[0, 2.84, 0.84, 0.5, 1]];
    const cx = E.reduce((a, e) => a + e[0], 0) / E.length, cy = E.reduce((a, e) => a + e[1], 0) / E.length, cz = Math.max(...E.map((e) => e[2]));
    eye.position.set(cx, cy, cz);
    for (const [ex, ey, ez, s, asp] of E) {
      const sp = new THREE.Sprite(eyeMat);
      sp.scale.set(s, (s * asp) / 1.8, 1); // the anchor is stretched 1.8x tall, and squashed to blink
      sp.position.set(ex - cx, (ey - cy) / 1.8, ez - cz);
      sp.renderOrder = 5;
      eye.add(sp);
    }
    G.head.add(eye);
    if (this.jetAt) {
      this.jet = glowSprite(neon(hex, 1.8), this.jetAt[3], 0.7);
      this.jet.position.set(this.jetAt[0], this.jetAt[1], this.jetAt[2]);
      G.body.add(this.jet);
    }

    // ---- a red aura behind it that only shows in its rage
    this.aura = glowSprite(neon(COLORS.red, 1.5), 12, 0);
    this.aura.position.set(0, 0.6, -1.4);
    this.aura.layers.set(1);
    G.body.add(this.aura);
    this.auraK = 0;

    // ---- steam from the vents (look only, not reflected)
    const NV = Math.max(1, this.vents.length), N = NV * 12;
    const sp = new Float32Array(N * 3), ss = new Float32Array(N);
    for (let i = 0; i < N; i++) { const v = this.vents[i % NV] || new THREE.Vector3(0, 2, -1); sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z; ss[i] = (i + Math.random()) / N; }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("aSeed", new THREE.BufferAttribute(ss, 1));
    this.steam = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uI: { value: 0.2 }, uH: { value: 800 }, uColor: { value: new THREE.Color(hex).lerp(new THREE.Color(0xdfe8ff), 0.75) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; uniform float uTime; uniform float uI; uniform float uH; varying float vA;
        void main(){
          float r1 = fract(aSeed * 91.7), r2 = fract(aSeed * 37.3);
          float life = fract(aSeed * 7.31 + uTime * (0.35 + r1 * 0.3));
          vec3 p = position + vec3((r1 - 0.5) * (0.3 + life * 1.3), life * (1.3 + r2 * 1.5), (r2 - 0.5) * (0.3 + life) - life * 0.5);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uH * (0.25 + 1.3 * life) * (0.5 + r1) * length(modelMatrix[0].xyz) / max(0.1, -mv.z);
          vA = uI * (1.0 - life) * smoothstep(0.0, 0.12, life);
        }`,
      fragmentShader: "uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = max(0.0, 1.0 - d); gl_FragColor = vec4(uColor * (vA * a * a * 0.5), 1.0); }",
    }));
    this.steam.frustumCulled = false;
    this.steam.layers.set(1);
    G.chest.add(this.steam);
    game.decor(this.steam);

    // ---- a shadow on the floor under it (a soft dark disc; the floor mirrors the rest)
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.045;
    this.shadow.renderOrder = 1;
    this.shadow.layers.set(1);
    game.scene.add(this.shadow);

    // ---- animation state
    this.lastHp = game.hp; this.lastAtk = game.atk ? game.atk.tok : 0; this.stage = 0;
    this.hit = 0; this.hitV = 0; this.lunge = 0; this.power = 0; this.landed = false; this.dead = 0;
    this.tw = { t: 1.5, part: 0, amt: 0, cur: 0, hold: 0 };
    this.crackK = [0, 0, 0];
    this.sparkT = 0; this.tmp = new THREE.Vector3();
  }
  // Blow a plate off: it tumbles away under gravity and is gone.
  shed(p, kick = 1) {
    if (p.t >= 0) return;
    p.t = 0;
    p.v.copy(p.n).multiplyScalar(2.2 * kick).add(this.tmp.set(rand(-1.4, 1.4), rand(1.5, 3.2), rand(0.5, 1.5)).multiplyScalar(kick));
    p.w.set(rand(-6, 6), rand(-6, 6), rand(-6, 6));
    const g = this.g;
    if (g.bursts) {
      g.boss.updateMatrixWorld(true);
      const at = p.mesh.getWorldPosition(new THREE.Vector3());
      g.bursts.burst(at, 0xffd9a0, { n: 16, speed: 6, size: 0.16 * g.bossScale + 0.05, life: 0.5, gravity: -9 });
      g.bursts.burst(at, g.cfg.color, { n: 10, speed: 3, size: 0.22 * g.bossScale + 0.05, life: 0.7 });
    }
  }
  update(dt, f) {
    const g = this.g, D = this.D, G = this.G, t = g.t, uL = this.uL;
    const calm = REDUCED_MOTION || GFX.calm ? 0.5 : 1;
    const hpF = clamp(g.hp / g.maxHp, 0, 1);
    const stage = g.hp <= 0 ? 4 : hpF < 0.35 ? 3 : hpF <= 0.55 ? 2 : hpF <= 0.8 ? 1 : 0;
    const rage = stage === 3 ? 1 : 0;
    const intro = g.state === "intro";
    // ---- what just happened
    if (g.hp < this.lastHp) {
      this.hitV += 2.4 + Math.min(2, (this.lastHp - g.hp) / 12);
      this.env = 1; // the blow rolls out through the arena
      if (g.floorRing) g.floorRing(g.cfg.color, 26, 1.1);
      this.tw.t = 0; // a spasm follows every hit
      if (g.bursts && g.hp > 0) { g.boss.updateMatrixWorld(true); g.bursts.burst(G.chest.getWorldPosition(new THREE.Vector3()).add(this.tmp.set(rand(-1.5, 1.5), rand(0, 2), 1.4).multiplyScalar(g.bossScale)), 0xffd9a0, { n: 14, speed: 7, size: 0.13, life: 0.45, gravity: -10 }); }
    }
    this.lastHp = g.hp;
    if (g.atk && g.atk.tok !== this.lastAtk) { this.lastAtk = g.atk.tok; this.lunge = 1; }
    if (stage > this.stage) {
      for (const p of this.plates) if ((p.stage <= stage || stage === 4) && p.t < 0) this.shed(p, stage === 4 ? 1.8 : 1);
      this.stage = stage;
      this.tw.t = 0;
    }
    if (stage === 4) this.dead += dt;
    // ---- entrance: it falls folded and dark, lands, then powers up
    const land = intro ? smoothstep(1.35, 2.3, t) : 1;
    if (intro && !this.landed && t > 1.4) {
      this.landed = true;
      this.hitV -= 2.2;
      if (g.bursts) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.bursts.burst(new THREE.Vector3(Math.cos(a) * 3.2, 0.2, Math.sin(a) * 3.2), i % 2 ? g.cfg.color : 0xffd9a0, { n: 8, speed: 5, size: 0.2, life: 0.7, gravity: -6 }); }
    }
    const was = this.power;
    this.power = stage === 4 ? Math.max(0, 1 - this.dead * 0.9) * (0.6 + 0.4 * Math.sin(t * 17)) : intro ? smoothstep(1.55, 2.5, t) : 1;
    if (intro && was < 0.7 && this.power >= 0.7 && g.flashAt) { g.boss.updateMatrixWorld(true); g.flashAt(this.eye.getWorldPosition(new THREE.Vector3()), COLORS.red, 0.7, 4 * g.bossScale + 1); }
    const crouch = 1 - land;
    // ---- springs: hit recoil and the lunge of an attack
    this.hitV += (-this.hit * 90 - this.hitV * 11) * dt;
    this.hit += this.hitV * dt;
    this.lunge = Math.max(0, this.lunge - dt * 2.6);
    const lg = Math.sin(Math.min(1, this.lunge) * Math.PI) * this.lunge;
    // ---- attack telegraph: it winds up as the charge fills, and shakes when it is about to fire
    const tele = smoothstep(0.5, 1, f), brink = smoothstep(0.82, 1, f);
    // ---- servo twitches: a part snaps a few degrees and settles
    const tw = this.tw;
    tw.t -= dt;
    if (tw.t <= 0) { tw.t = rand(1.2, 3.6) / (D.twitch * (1 + stage * 0.5)); tw.part = Math.floor(Math.random() * 5); tw.amt = rand(-1, 1) * (0.1 + stage * 0.06) * calm; tw.hold = 0.11; }
    tw.hold -= dt;
    tw.cur += ((tw.hold > 0 ? tw.amt : 0) - tw.cur) * Math.min(1, dt * 26);
    const twOf = (i) => (tw.part === i ? tw.cur : 0);
    // ---- breathing
    const br = Math.sin(t * D.breath * (1 + 0.7 * rage));
    const sw = D.swell * (1 + 0.6 * rage) * calm;
    G.chest.scale.set(1 + 0.012 * br * sw, 1 + 0.018 * br * sw, 1 + 0.04 * br * sw);
    const sag = stage >= 2 && stage < 4 ? 0.1 : 0;
    G.chest.position.y = -0.5 + 0.045 * br * sw - sag - crouch * 0.25 - this.dead * 0.25;
    G.chest.rotation.x = crouch * 0.4 + sag * 0.6 - this.hit * 0.22 + lg * 0.3 + tele * 0.05 - brink * 0.12 + Math.min(1, this.dead) * 0.5 + twOf(4) * 0.5;
    G.chest.rotation.z = (stage >= 2 ? 0.05 : 0) + this.hit * 0.06 + (brink * Math.sin(t * 17) * 0.012) * calm;
    // ---- head: looks about, glares down as it charges, snaps back when hit
    G.head.rotation.y = Math.sin(t * 0.37 * D.sway) * 0.22 * land + Pointer.x * 0.25 + twOf(0) * 1.6;
    G.head.rotation.x = crouch * 0.6 + tele * 0.2 - this.hit * 0.5 + lg * 0.25 + Math.sin(t * 0.23) * 0.04 + Math.min(1, this.dead * 1.4) * 0.7;
    G.head.rotation.z = (stage >= 2 ? -0.12 : 0) + twOf(1) * 1.5 + Math.sin(t * 0.31) * 0.03;
    // ---- arms
    for (const [s, sd, i] of [["L", -1, 2], ["R", 1, 3]]) {
      const r = this.rest[s];
      const limp = stage >= 2 && sd < 0 && stage < 4 ? 1 : 0; // the left arm fails at half health
      const A = G["arm" + s], F = G["fore" + s];
      const idle = Math.sin(t * 0.6 * D.sway + sd) * 0.05 + br * 0.02;
      A.rotation.x = lerp(r[0] + idle - tele * 0.55 * (1 - limp) - lg * 0.9 + this.hit * 0.5 + crouch * -0.5 + twOf(i), 0.12, limp * 0.8) + Math.min(1, this.dead) * (0.3 - r[0]);
      A.rotation.z = sd * (r[1] + tele * 0.3 + rage * 0.14 + this.hit * 0.35 - crouch * 0.3 + br * 0.015);
      F.rotation.x = lerp(r[2] - tele * 0.5 + lg * 0.7 - crouch * 0.9 + twOf(i) * 1.4 + this.hit * 0.3, -0.12 + twOf(i) * 2, limp * 0.85) + Math.min(1, this.dead) * (-0.1 - r[2]);
    }
    G.base.rotation.z = Math.sin(t * 0.8 * D.sway) * 0.07;
    G.base.rotation.x = Math.sin(t * 0.55 * D.sway) * 0.05 - this.hit * 0.15;
    // ---- lamps
    const P = this.power;
    uL[1] = P * (1 + 0.7 * tele + 0.6 * rage);
    uL[2] = P * (0.75 + 0.25 * br + tele * (0.9 + 0.7 * Math.sin(t * (7 + 8 * tele))) + rage * 0.9 + Math.max(0, this.hit) * 3);
    uL[3] = smoothstep(0.25, 0.9, P) * (0.85 + 0.15 * Math.sin(t * 1.3) + rage * (0.5 + 0.5 * Math.sin(t * 7.5)) + brink * 0.8);
    uL[4] = P * (0.5 + 0.5 * Math.sin(t * 11) * Math.sin(t * 3.7)) * 1.3; // circuitry flickers softly
    for (let i = 0; i < 3; i++) {
      this.crackK[i] += ((stage > i ? 1 : 0) - this.crackK[i]) * Math.min(1, dt * 4);
      uL[5 + i] = this.crackK[i] * P * (0.7 + 0.3 * Math.sin(t * (2.3 + i) + i * 2) + rage * 0.6);
    }
    this.eye.visible = P > 0.05;
    this.eye.material.opacity = Math.min(1, P * (1 + 0.5 * tele));
    if (this.jet) this.jet.material.opacity = 0.7 * P * (0.85 + 0.15 * Math.sin(t * 13));
    this.auraK += (rage - this.auraK) * Math.min(1, dt * 2);
    this.aura.material.opacity = this.auraK * P * (0.3 + 0.12 * Math.sin(t * 7.5));
    this.aura.visible = this.auraK > 0.01;
    // ---- steam: a wisp at rest, clouds when it winds up, is hurt or enraged
    const su = this.steam.material.uniforms;
    su.uTime.value = t;
    su.uH.value = GFX.h * GFX.scenePR();
    su.uI.value = P * D.steam * (0.1 + 0.25 * tele + 0.12 * stage + 0.3 * rage + Math.abs(this.hit) * 1.2);
    // ---- plates that have been shot off fall away
    for (const p of this.plates) {
      if (p.t < 0) continue;
      p.t += dt;
      if (p.t > 1.6) { p.mesh.visible = false; continue; }
      p.v.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.rotation.x += p.w.x * dt; p.mesh.rotation.y += p.w.y * dt; p.mesh.rotation.z += p.w.z * dt;
      p.mesh.scale.copy(p.s0).multiplyScalar(1 - smoothstep(1.1, 1.6, p.t));
    }
    // ---- sparks jump from the wounds
    this.sparkT -= dt;
    if (g.bursts && stage >= 1 && stage < 4 && this.sparkT <= 0 && !intro) {
      this.sparkT = rand(0.5, 1.6) / stage;
      const gone = this.plates.filter((p) => p.t >= 0);
      if (gone.length) {
        const p = gone[Math.floor(Math.random() * gone.length)];
        g.boss.updateMatrixWorld(true);
        const at = G[p.gn].localToWorld(this.tmp.copy(p.p0).addScaledVector(p.n, 0.2)).clone();
        g.bursts.burst(at, Math.random() < 0.5 ? 0xffffff : g.cfg.color, { n: 6, speed: 4, size: 0.1 * g.bossScale + 0.04, life: 0.4, gravity: -8 });
      }
    }
    // ---- the arena answers a hit: its lights surge, the sky flares, and settle
    if (g.capMat) {
      if (!this.capBase) { this.capBase = g.capMat.color.clone(); this.skyGlow = g.sky.material.uniforms.uGlow.value; }
      this.env = Math.max(0, (this.env || 0) - dt * 1.6);
      const e = this.env * this.env * calm;
      g.capMat.color.copy(this.capBase).multiplyScalar(1 + 1.6 * e);
      g.sky.material.uniforms.uGlow.value = this.skyGlow * (1 + 0.9 * e);
    }
    // ---- shadow
    const sh = this.shadow;
    sh.visible = !!GFX.opt.shadows;
    if (sh.visible) {
      const h = Math.max(0, g.boss.position.y - 3 * g.boss.scale.x);
      sh.position.x = g.boss.position.x; sh.position.z = g.boss.position.z;
      sh.scale.setScalar((9.5 + h * 0.9) * g.boss.scale.x);
      sh.material.opacity = 0.78 / (1 + h * 0.22);
    }
  }
  dispose() { /* geometries and materials are released with the scene */ }
}
