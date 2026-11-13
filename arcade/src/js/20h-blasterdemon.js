// Risk Blaster's enemy: the player's own void demon, a horned skull-faced torso on four
// wings that flies ahead of the fighter. The model has 106 loose parts,
// one colour texture, no skeleton and no animation, so everything here is made in code:
// the parts are gathered into 22 joints with pivots, it wears obsidian and gunmetal with
// light in its eyes, third eye, mouth, core, horns and veins, and every move is posed
// from smooth curves. Look and sound only. The game still asks, times, checks and scores:
//   a wave starts: it flies in out of the distance, spreads its wings and roars
//   while a question's clock runs it comes closer
//   right answer: the fighter's fire lands; it recoils, and by and by it cracks, sheds
//                 armour and its core shows
//   wrong answer, or none in time: it rears up (the warning) and strikes: bolts from
//                 its claws, a lunge and a swipe, or a roar and a blast, in turn
//   the wave's last three questions: it rages (faster wings, red light, an aura)
//   wave cleared: it staggers, breaks up and goes in a ball of fire

// Where things are on the model, in its own units (one unit across the wings, 0.73 tall, facing +z).
const DEMON = {
  height: 0.734, width: 1.0, centre: [0, 0.37, 0],
  eyes: [[-0.04, 0.455, 0.172], [0.04, 0.455, 0.172]], third: [0.003, 0.514, 0.207], mouth: [0, 0.392, 0.17],
  core: [0.008, 0.255, 0.175], // where the fighter's fire lands
  hands: [[-0.285, 0.085, 0.17], [0.285, 0.085, 0.17]], tips: [[-0.46, 0.4, -0.12], [0.46, 0.4, -0.12], [-0.42, 0.7, -0.04], [0.42, 0.7, -0.04]],
};
const DEMON_FAR = 22, DEMON_NEAR = 14; // how far ahead it waits, and how close it has come when the time is up
// The joints: what each hangs from, where it turns (model units), which of the model's parts it carries.
const DEMON_RIG = {
  body: { at: [0, 0.3, 0.02], parts: [20, 42, 30, 39, 72, 43, 44, 47, 71, 74, 97, 100, 105, 99, 49] },
  waist: { p: "body", at: [0, 0.235, 0.03], parts: [40, 64, 98] },
  tail: { p: "waist", at: [0, 0.15, 0.04], parts: [26, 55] },
  head: { p: "body", at: [0, 0.425, 0.05], parts: [13, 24, 2, 69, 33, 36, 102, 45, 27, 57, 95, 73, 50, 12, 14] },
  jaw: { p: "head", at: [0, 0.44, 0.085], parts: [15, 61, 96, 101] },
  padL: { p: "body", at: [-0.115, 0.35, 0.03], parts: [11, 9, 78, 79, 80, 81, 82] },
  padR: { p: "body", at: [0.115, 0.35, 0.03], parts: [7, 18, 85, 86, 89, 90, 91] },
  armL: { p: "body", at: [-0.16, 0.335, 0.03], parts: [4, 51] },
  armR: { p: "body", at: [0.16, 0.335, 0.03], parts: [0, 75] },
  foreL: { p: "armL", at: [-0.235, 0.205, 0.05], parts: [28, 41, 52, 76, 77] },
  foreR: { p: "armR", at: [0.235, 0.205, 0.05], parts: [29, 6, 35, 87, 88] },
  handL: { p: "foreL", at: [-0.28, 0.16, 0.115], parts: [16] },
  handR: { p: "foreR", at: [0.285, 0.16, 0.115], parts: [8] },
  clawL: { p: "handL", at: [-0.285, 0.125, 0.15], parts: [22, 23, 31, 38, 46, 54, 56, 58, 59, 60, 68, 70] },
  clawR: { p: "handR", at: [0.285, 0.125, 0.15], parts: [17, 37, 62, 63, 65, 66, 67, 32, 34, 103] },
  wingL: { p: "body", at: [-0.13, 0.31, -0.06], parts: [3, 83, 84] },
  wingR: { p: "body", at: [0.13, 0.31, -0.06], parts: [10, 21, 92, 93, 94] },
  bladeL: { p: "wingL", at: [-0.27, 0.5, -0.07], parts: [1] },
  bladeR: { p: "wingR", at: [0.27, 0.5, -0.07], parts: [5] },
  lowL: { p: "body", at: [-0.17, 0.33, -0.1], parts: [25, 48] },
  lowR: { p: "body", at: [0.17, 0.33, -0.1], parts: [19, 53, 104] },
};
// What each part is made of (anything not listed is armour): 1 skull, 2 horn and wing bone, 3 the third eye,
// 4 fangs, 5 studs (small lights), 6 wing blades, 7 claws, 8 the core.
const DEMON_ZONE = { 1: [13, 24, 2, 33, 36, 45, 27, 57, 95, 73, 15], 2: [12, 14, 102, 3, 10, 21], 3: [69], 4: [50, 61, 96, 101], 6: [1, 5, 25, 48, 19, 53, 104], 8: [30],
  5: [76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94], 7: DEMON_RIG.clawL.parts.concat(DEMON_RIG.clawR.parts) };
// The armour it sheds as it is hurt, in this order: studs, the plates on its arms, wrists and collar, the rims of its
// shoulders, and last the two plates over its core.
const DEMON_SHED = [76, 85, 79, 88, 81, 92, 77, 86, 83, 90, 78, 94, 80, 87, 82, 89, 84, 91, 93, 51, 75, 52, 35, 47, 43, 9, 18, 42, 20];

// How closed-in every point of the model is by the rest of it (0 deep in a crevice, 1 in the open): space has no
// floor to cast a shadow on, so this is what gives it weight. The model is marked into a grid of small cells; from
// each vertex nine rays go out round its normal, and each one that soon meets a marked cell counts against it.
function demonOcclusion(parts) {
  const N = [58, 44, 28], lo = [-0.53, -0.03, -0.25], cell = [1.06 / N[0], 0.8 / N[1], 0.5 / N[2]], grid = new Uint8Array(N[0] * N[1] * N[2]);
  const at = (x, y, z) => { const i = Math.floor((x - lo[0]) / cell[0]), j = Math.floor((y - lo[1]) / cell[1]), k = Math.floor((z - lo[2]) / cell[2]); return i < 0 || j < 0 || k < 0 || i >= N[0] || j >= N[1] || k >= N[2] ? -1 : (k * N[1] + j) * N[0] + i; };
  const mark = (x, y, z) => { const q = at(x, y, z); if (q >= 0) grid[q] = 1; };
  parts.forEach((p) => {
    const P = p.pos, I = p.ix;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      mark(P[a], P[a + 1], P[a + 2]); mark(P[b], P[b + 1], P[b + 2]); mark(P[c], P[c + 1], P[c + 2]);
      mark((P[a] + P[b]) / 2, (P[a + 1] + P[b + 1]) / 2, (P[a + 2] + P[b + 2]) / 2); mark((P[b] + P[c]) / 2, (P[b + 1] + P[c + 1]) / 2, (P[b + 2] + P[c + 2]) / 2); mark((P[c] + P[a]) / 2, (P[c + 1] + P[a + 1]) / 2, (P[c + 2] + P[a + 2]) / 2);
      mark((P[a] + P[b] + P[c]) / 3, (P[a + 1] + P[b + 1] + P[c + 1]) / 3, (P[a + 2] + P[b + 2] + P[c + 2]) / 3);
    }
  });
  const h = 0.019, C = Math.cos(0.87), S = Math.sin(0.87);
  return (x, y, z, nx, ny, nz) => {
    // two directions across the normal
    let ux = Math.abs(ny) < 0.9 ? nz : 0, uy = Math.abs(ny) < 0.9 ? 0 : -nz, uz = Math.abs(ny) < 0.9 ? -nx : ny;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul; uy /= ul; uz /= ul;
    const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
    let open = 0;
    for (let k = 0; k < 9; k++) {
      const a = k * 0.7854, ca = k < 8 ? Math.cos(a) * S : 0, sa = k < 8 ? Math.sin(a) * S : 0, cn = k < 8 ? C : 1;
      const dx = nx * cn + ux * ca + vx * sa, dy = ny * cn + uy * ca + vy * sa, dz = nz * cn + uz * ca + vz * sa;
      let hit = 0;
      for (let s = 2; s <= 7; s++) { const q = at(x + dx * s * h, y + dy * s * h, z + dz * s * h); if (q >= 0 && grid[q]) { hit = 1 - (s - 2) / 6.5; break; } }
      open += 1 - hit;
    }
    return open / 9;
  };
}

// A far lighter copy of a joint's mesh for the weakest quality levels: vertices that fall in the same small cell of
// space (and are made of the same thing) become one, and triangles that collapse are dropped.
function demonLowGeo(P, N, T, R, Z, I, cell) {
  const map = new Map(), n = P.length / 3, remap = new Int32Array(n), oP = [], oN = [], oT = [], oR = [], oZ = [], oI = [];
  for (let i = 0; i < n; i++) {
    const key = Math.round(R[i * 3] / cell) + "," + Math.round(R[i * 3 + 1] / cell) + "," + Math.round(R[i * 3 + 2] / cell) + "," + Z[i * 4];
    let at = map.get(key);
    if (at === undefined) {
      at = oP.length / 3;
      map.set(key, at);
      oP.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); oN.push(0, 0, 0); oT.push(T[i * 2], T[i * 2 + 1]); oR.push(R[i * 3], R[i * 3 + 1], R[i * 3 + 2]); oZ.push(Z[i * 4], Z[i * 4 + 1], Z[i * 4 + 2], Z[i * 4 + 3]);
    }
    oN[at * 3] += N[i * 3]; oN[at * 3 + 1] += N[i * 3 + 1]; oN[at * 3 + 2] += N[i * 3 + 2];
    remap[i] = at;
  }
  for (let t = 0; t < I.length; t += 3) { const a = remap[I[t]], b = remap[I[t + 1]], c = remap[I[t + 2]]; if (a !== b && b !== c && a !== c) oI.push(a, b, c); }
  for (let i = 0; i < oN.length; i += 3) { const l = Math.hypot(oN[i], oN[i + 1], oN[i + 2]) || 1; oN[i] /= l; oN[i + 1] /= l; oN[i + 2] /= l; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(oP, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(oN, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(oT, 2));
  g.setAttribute("aRest", new THREE.Float32BufferAttribute(oR, 3));
  g.setAttribute("aZ", new THREE.Float32BufferAttribute(oZ, 4));
  g.setIndex(oI);
  return g;
}

const DemonModel = {
  _geo: null, _tex: null,
  ok() { return !!(window.THREE && window.INR_ASSETS && window.INR_ASSETS.demon); },
  // One mesh for each joint (full), and a far lighter one (low): its parts merged, measured from its pivot. Every vertex also knows where it was on the
  // model at rest (aRest), its part's middle and four random numbers (aC, aK: a part can come away and tumble),
  // and what it is made of, how far along its part it is, when it is shed, and how open it is to the sky (aZ).
  geometry() {
    if (this._geo) return this._geo;
    const parts = inrModelParts(window.INR_ASSETS.demon.mesh), byId = new Map(parts.map((p) => [p.id, p]));
    if (parts.length < 80) throw new Error("demon: parts missing");
    const zone = {}, drop = {}, listed = new Set(), out = { full: {}, low: {}, lowTris: 0 };
    for (const z in DEMON_ZONE) DEMON_ZONE[z].forEach((id) => { zone[id] = +z; });
    DEMON_SHED.forEach((id, i) => { drop[id] = 0.06 + (0.88 * i) / (DEMON_SHED.length - 1); });
    for (const n in DEMON_RIG) DEMON_RIG[n].parts.forEach((id) => listed.add(id));
    let seed = 20261113;
    const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296, occ = demonOcclusion(parts);
    for (const name in DEMON_RIG) {
      const at = DEMON_RIG[name].at, list = DEMON_RIG[name].parts.map((id) => byId.get(id)).filter(Boolean);
      if (name === "body") parts.forEach((p) => { if (!listed.has(p.id)) list.push(p); }); // (anything unlisted rides the body)
      let nv = 0, ni = 0;
      list.forEach((p) => { nv += p.pos.length / 3; ni += p.ix.length; });
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), T = new Float32Array(nv * 2), R = new Float32Array(nv * 3), C = new Float32Array(nv * 3), K = new Float32Array(nv * 4), Z = new Float32Array(nv * 4), I = new Uint16Array(ni);
      let v0 = 0, i0 = 0;
      list.forEach((p) => {
        const n = p.pos.length / 3, k = [r(), r(), r(), r()], zn = zone[p.id] || 0, dr = drop[p.id] || 2;
        let cx = 0, cy = 0, cz = 0, lo = 1e9, hi = 0, x0 = 1e9, x1 = 0, y0 = 1e9, y1 = -1e9;
        for (let i = 0; i < n; i++) {
          const x = p.pos[i * 3] - at[0], y = p.pos[i * 3 + 1] - at[1], z = p.pos[i * 3 + 2] - at[2], d = Math.hypot(x, y, z), ax = Math.abs(p.pos[i * 3]);
          cx += x / n; cy += y / n; cz += z / n; lo = Math.min(lo, d); hi = Math.max(hi, d);
          x0 = Math.min(x0, ax); x1 = Math.max(x1, ax); y0 = Math.min(y0, p.pos[i * 3 + 1]); y1 = Math.max(y1, p.pos[i * 3 + 1]);
        }
        for (let i = 0; i < n; i++) {
          const j = v0 + i, x = p.pos[i * 3] - at[0], y = p.pos[i * 3 + 1] - at[1], z = p.pos[i * 3 + 2] - at[2];
          P[j * 3] = x; P[j * 3 + 1] = y; P[j * 3 + 2] = z;
          N[j * 3] = p.nor[i * 3]; N[j * 3 + 1] = p.nor[i * 3 + 1]; N[j * 3 + 2] = p.nor[i * 3 + 2];
          T[j * 2] = p.uv[i * 2]; T[j * 2 + 1] = p.uv[i * 2 + 1];
          R[j * 3] = p.pos[i * 3]; R[j * 3 + 1] = p.pos[i * 3 + 1]; R[j * 3 + 2] = p.pos[i * 3 + 2];
          C[j * 3] = cx; C[j * 3 + 1] = cy; C[j * 3 + 2] = cz;
          K.set(k, j * 4);
          // how far along its part: from the joint outward; for a wing blade, toward its outer and lower edges (where it is ragged)
          Z[j * 4] = zn; Z[j * 4 + 2] = dr; Z[j * 4 + 3] = occ(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2], p.nor[i * 3], p.nor[i * 3 + 1], p.nor[i * 3 + 2]);
          Z[j * 4 + 1] = zn === 6 ? clamp(0.62 * ((Math.abs(p.pos[i * 3]) - x0) / (x1 - x0 || 1)) + 0.62 * (1 - (p.pos[i * 3 + 1] - y0) / (y1 - y0 || 1)), 0, 1) : (Math.hypot(x, y, z) - lo) / (hi - lo || 1);
        }
        for (let j = 0; j < p.ix.length; j++) I[i0 + j] = p.ix[j] + v0;
        v0 += n; i0 += p.ix.length;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(P, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(T, 2));
      g.setAttribute("aRest", new THREE.BufferAttribute(R, 3));
      g.setAttribute("aC", new THREE.BufferAttribute(C, 3));
      g.setAttribute("aK", new THREE.BufferAttribute(K, 4));
      g.setAttribute("aZ", new THREE.BufferAttribute(Z, 4));
      g.setIndex(new THREE.BufferAttribute(I, 1));
      out.full[name] = g;
      out.low[name] = demonLowGeo(P, N, T, R, Z, I, 0.035);
      out.lowTris += out.low[name].index.count / 3;
    }
    return (this._geo = out);
  },
  texture() { return this._tex || (this._tex = inrModelTexture(window.INR_ASSETS.demon.albedo)); },
  // decode ahead of time, so opening the game never waits on it
  preload() { if (this.ok()) { try { this.geometry(); this.texture(); } catch (e) { /* the game falls back to its answer targets */ } } },
};

const DEMON_VERT = `attribute vec3 aRest; attribute vec3 aC; attribute vec4 aK; attribute vec4 aZ;
  uniform float uDmBoom; uniform float uDmBoomK; uniform float uDmShedA; uniform float uDmShedB; uniform float uDmFall;
  varying vec3 vDmP; varying vec3 vDmN; varying vec4 vDmZ;
  vec3 dmSpin(vec3 v, vec3 ax, float a){ float c = cos(a), s = sin(a); return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c); }`;
const DEMON_NOISE = `float dmH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float dmN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dmH(i), dmH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(dmH(i + vec3(0.0, 1.0, 0.0)), dmH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
               mix(mix(dmH(i + vec3(0.0, 0.0, 1.0)), dmH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(dmH(i + vec3(0.0, 1.0, 1.0)), dmH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }`;
// The demon's material. Its baked texture is a muddy stone brown, so it is only read as light and shade. What it is
// made of comes from which part a vertex belongs to: gunmetal armour (panel lines, wear and glowing veins from the
// shared detail tile), obsidian for its skull, horns, wing blades and claws, and light in its third eye, fangs, studs,
// core, horn tips and round its eyes and mouth. Wing blades are eaten ragged toward their edges. A plate that has been
// shed falls away turning; at the end every part is thrown outward and burns up.
function demonSkin(env, U) {
  const m = new THREE.MeshStandardMaterial({ map: DemonModel.texture(), metalness: 1, roughness: 1, envMap: env, envMapIntensity: 1.2, side: THREE.DoubleSide });
  m.extensions = { derivatives: true };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, neonUniforms(), U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\n" + DEMON_VERT)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        vDmN = objectNormal;
        float dmShed = step(aZ.z, uDmShedB) * mix(uDmFall, 1.0, step(aZ.z, uDmShedA));
        vec3 dmAx = normalize(aK.xyz * 2.0 - 1.0 + vec3(0.001));
        float dmAng = uDmBoom * (1.5 + 7.0 * aK.w) + dmShed * (2.0 + 5.0 * aK.w);
        objectNormal = dmSpin(objectNormal, dmAx, dmAng);`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vDmP = aRest; vDmZ = aZ;
        vec3 dmOut = normalize(aRest - vec3(0.0, 0.3, 0.0) + (aK.yzx - 0.5) * 0.9);
        float dmGo = (1.0 - exp(-uDmBoom * 1.4)) / 1.4;
        transformed = aC + dmSpin(transformed - aC, dmAx, dmAng) * (1.0 - smoothstep(1.2, 2.3, uDmBoom)) * (1.0 - smoothstep(0.6, 1.0, dmShed))
          + dmOut * ((0.28 + 0.8 * aK.w) * dmGo * uDmBoomK + 0.12 * dmShed) + vec3(0.0, -0.05 * uDmBoom * uDmBoom - 0.6 * dmShed * dmShed, 0.0);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        ${NEON_GLSL}
        ${DEMON_NOISE}
        varying vec3 vDmP; varying vec3 vDmN; varying vec4 vDmZ;
        uniform float uDmKick; uniform vec3 uDmCoreCol; uniform vec3 uDmHaze;
        uniform float uDmHit; uniform float uDmGone; uniform float uDmCrack; uniform float uDmPow; uniform float uDmDim; uniform float uDmRage; uniform float uDmBeat; uniform float uDmSweep;
        uniform float uDmMouth; uniform float uDmClaw; uniform float uDmExpose; uniform float uDmBoomHot; uniform float uDmRimK; uniform vec3 uDmEye; uniform vec3 uDmRim;`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        float dmL = dot(texelColor.rgb, vec3(0.3, 0.59, 0.11)), dmZone = floor(vDmZ.x + 0.5), dmTip = vDmZ.y, dmCut = 1.0, dmBurn = 0.0;
        if (dmZone > 5.5 && dmZone < 6.5) { // a wing blade: eaten ragged toward its edge
          dmCut = dmN(vDmP * 30.0) * 0.6 + dmN(vDmP * 77.0) * 0.4 - smoothstep(0.42, 1.0, dmTip) * 0.82;
          if (dmCut < 0.0) discard;
        }
        if (uDmGone > 0.0) { // destroyed: eaten away from a noise, the edge of every hole burning
          float dmG = dmN(vDmP * 13.0) * 0.7 + dmN(vDmP * 31.0) * 0.3 - uDmGone * 1.1;
          if (dmG < 0.0) discard;
          dmBurn = 1.0 - smoothstep(0.0, 0.08, dmG);
        }
        vec3 dmT = neonTile(vDmP * 5.5, vDmN);
        float dmArm = 1.0 - step(0.5, dmZone);
        float dmEdge = smoothstep(0.25, 0.9, length(fwidth(normalize(vNormal))) * 3.0); // (worn bright where a plate turns sharply)
        vec3 dmGun = mix(neonMetal(clamp(dmL * 2.6, 0.0, 1.0), dmT), vec3(0.42, 0.44, 0.52), dmEdge * 0.55);
        vec3 dmObs = (vec3(0.014, 0.011, 0.022) + vec3(0.075, 0.055, 0.11) * clamp(dmL * 1.5, 0.0, 1.0)) * (0.7 + 0.6 * dmT.r) * (1.0 - 0.55 * neonGroove(dmT));
        diffuseColor.rgb = mix(dmObs, dmGun, dmArm);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(clamp(0.13 + (0.5 - dmT.r) * 0.4 + 0.3 * neonGroove(dmT), 0.05, 0.6), mix(clamp(0.5 - 0.2 * dmL + (0.5 - dmT.r) * 0.6, 0.18, 0.95), 0.22, dmEdge), dmArm);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.82, 0.92, dmArm);")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        // (relief from the change in the texture's brightness from one pixel to the next, and from the tile's dents and lines)
        float dmHh = sqrt(dmL), dmTh = neonHeight(dmT);
        vec2 dmD = vec2(dFdx(dmHh), dFdy(dmHh));
        dmD *= smoothstep(0.012, 0.06, length(dmD)) * 1.4;
        normal = neonBump(-vViewPosition, normal, clamp(dmD, -0.7, 0.7) * vec2(length(dFdx(vViewPosition)), length(dFdy(vViewPosition))) + clamp(vec2(dFdx(dmTh), dFdy(dmTh)), -0.5, 0.5) * 0.008);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        vec3 dmV = normalize(vViewPosition);
        float dmNV = clamp(abs(dot(normal, dmV)), 0.0, 1.0);
        // its lights: off until it arrives, then on from the bottom up; they stutter when it is badly hurt
        float dmOn = uDmPow * uDmDim * (1.0 - smoothstep(uDmSweep - 0.1, uDmSweep, vDmP.y)), dmPulse = 0.55 + 0.9 * uDmBeat;
        vec3 dmVein = mix(mix(vec3(1.5, 0.12, 0.9), vec3(0.7, 0.2, 1.7), step(0.5, dmH(floor(vDmP * 6.0)))), vec3(2.0, 0.1, 0.22), uDmRage);
        // Weight without a shadow to cast: crevices are dark (how closed-in each vertex is, worked out when the model
        // loads), so is everything that faces down, and it darkens toward its tail.
        vec3 dmNr = normalize(vDmN);
        float dmShade = mix(0.26, 1.0, vDmZ.w * vDmZ.w) * mix(0.42, 1.0, smoothstep(-0.7, 0.35, dmNr.y)) * mix(0.7, 1.0, smoothstep(0.05, 0.5, vDmP.y));
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.15, 0.13, 0.2) * dmShade; // a soft fill
        // rim lights: magenta and cyan from the sides, the wave's colour, and a cold one from above and behind
        totalEmissiveRadiance += neonRim(normal, dmV, 3.0) * uDmRimK + uDmRim * pow(1.0 - dmNV, 4.0) + vec3(0.42, 0.5, 0.95) * (pow(1.0 - dmNV, 3.5) * smoothstep(-0.1, 0.9, normal.y) * uDmKick);
        // its own light spills on the armour near it: the core's on its chest, jaw and arms, the eyes' on its brow and cheeks
        vec3 dmLc = vec3(0.008, 0.256, 0.21) - vDmP, dmLe = vec3(sign(vDmP.x) * 0.04, 0.455, 0.21) - vDmP, dmL3 = vec3(0.003, 0.514, 0.24) - vDmP;
        float dmDc = dot(dmLc, dmLc), dmDe = dot(dmLe, dmLe), dmD3 = dot(dmL3, dmL3);
        totalEmissiveRadiance += (uDmCoreCol * (max(dot(dmNr, dmLc) * inversesqrt(dmDc + 1e-5), 0.0) / (1.0 + dmDc * 150.0))
          + uDmEye * (0.45 * max(dot(dmNr, dmLe) * inversesqrt(dmDe + 1e-5), 0.0) / (1.0 + dmDe * 420.0))
          + vec3(1.3, 0.3, 2.6) * (0.3 * dmOn * max(dot(dmNr, dmL3) * inversesqrt(dmD3 + 1e-5), 0.0) / (1.0 + dmD3 * 500.0))) * (0.1 + 0.5 * dmT.r) * (0.4 + 0.6 * vDmZ.w);
        totalEmissiveRadiance += neonGlow(dmT, vDmP * 5.5, dmVein) * dmOn * dmPulse; // veins, and small lights in the armour
        totalEmissiveRadiance += vec3(2.5, 0.4, 0.55) * neonGroove(dmT) * uDmCrack * (0.4 + 0.6 * dmT.r); // cracks, as it is hurt
        if (dmZone > 2.5 && dmZone < 3.5) { // the third eye: brightest at its heart
          vec2 dmQ = vDmP.xy - vec2(0.003, 0.512);
          totalEmissiveRadiance += vec3(1.3, 0.3, 2.6) * dmOn * (0.2 + 1.7 * exp(-dot(dmQ, dmQ) * 2400.0)) * (0.7 + 0.7 * uDmBeat);
        }
        else if (dmZone > 3.5 && dmZone < 4.5) totalEmissiveRadiance += vec3(2.4, 0.5, 1.2) * dmOn * (0.3 + 1.5 * uDmMouth); // fangs
        else if (dmZone > 4.5 && dmZone < 5.5) { // studs: each a small light with its own slow beat
          float dmS = dmH(floor(vDmP * 26.0));
          totalEmissiveRadiance += mix(vec3(2.2, 0.25, 1.4), vec3(0.3, 1.6, 2.2), step(0.5, dmS)) * dmOn * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uNeonT * (0.8 + 2.0 * dmS) + dmS * 40.0), 3.0));
        } else if (dmZone > 7.5) { // the core: a heart of light under the plate, veined, beating
          vec2 dmCd = vDmP.xy - vec2(0.008, 0.256);
          totalEmissiveRadiance += mix(vec3(2.4, 0.3, 1.0), vec3(3.0, 0.25, 0.35), uDmRage) * dmOn * (0.03 + 1.9 * exp(-dot(dmCd, dmCd) * 750.0)) * (0.35 + 0.9 * dmT.r) * (1.0 - 0.75 * neonGroove(dmT)) * (0.5 + 0.9 * uDmBeat + 0.8 * uDmExpose);
        }
        if (dmZone > 1.5 && dmZone < 2.5) totalEmissiveRadiance += mix(vec3(1.9, 0.2, 1.3), vec3(2.4, 0.15, 0.3), uDmRage) * pow(dmTip, 4.0) * 0.8 * dmOn * (0.6 + 0.8 * uDmBeat); // horns and wing spikes, toward their tips
        if (dmZone > 6.5 && dmZone < 7.5) totalEmissiveRadiance += vec3(1.3, 0.3, 2.4) * pow(dmTip, 2.0) * dmOn * (0.15 + uDmClaw); // claws: energy
        if (dmZone > 5.5 && dmZone < 6.5) totalEmissiveRadiance += vec3(2.4, 0.4, 1.3) * (1.0 - smoothstep(0.0, 0.1, dmCut)) * dmOn; // the burning edge of its tatters
        if (dmZone > 0.5 && dmZone < 1.5) { // the skull: lit from inside its eye sockets and its mouth
          vec3 dmE = vec3(abs(vDmP.x) - 0.04, vDmP.y - 0.455, vDmP.z - 0.165), dmM = vDmP - vec3(0.0, 0.395, 0.155);
          totalEmissiveRadiance += uDmEye * exp(-dot(dmE, dmE) * 4200.0) + vec3(2.6, 0.45, 0.9) * uDmMouth * exp(-dot(dmM, dmM) * 1100.0);
        }
        totalEmissiveRadiance += vec3(1.05, 0.9, 1.0) * uDmHit + vec3(6.0, 1.6, 2.4) * dmBurn + vec3(2.8, 0.7, 0.9) * uDmBoomHot * (0.3 + 0.7 * dmL);`)
      // (what it reflects is dimmed by that shading, its own light is not; and what is furthest back sinks into the haze of the place)
      .replace("vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;",
        "vec3 outgoingLight = (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular) * dmShade + totalEmissiveRadiance;\noutgoingLight = mix(outgoingLight, uDmHaze, smoothstep(0.08, -0.22, vDmP.z) * 0.5);");
  };
  m.customProgramCacheKey = () => "blaster-demon-2";
  return m;
}
// The same demon for the weakest quality levels: unlit obsidian and gunmetal, the two-colour rim, its lights. (No
// shedding or break-up here: when it is destroyed it simply goes in the blast.)
function demonLow(U) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: Object.assign(fogUniforms(), { map: { value: DemonModel.texture() }, uNeonT: NEON_T }, U),
    vertexShader: `attribute vec3 aRest; attribute vec4 aZ; varying vec2 vUv; varying vec3 vP; varying vec4 vZ; varying float vDepth; varying float vRim; varying float vNx; varying float vLit;
      void main(){ vUv = uv; vP = aRest; vZ = aZ; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; vec3 n = normalize(normalMatrix * normal); vRim = 1.0 - abs(n.z); vNx = n.x; vLit = (0.5 + 0.5 * n.y) * mix(0.35, 1.0, aZ.w * aZ.w); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_FOG_PARS} uniform sampler2D map; uniform float uDmCrack; uniform float uDmExpose; uniform float uDmHit; uniform float uDmPow; uniform float uDmDim; uniform float uDmRage; uniform float uDmBeat; uniform float uDmMouth; uniform float uDmRimK; uniform vec3 uDmEye;
      varying vec2 vUv; varying vec3 vP; varying vec4 vZ; varying float vDepth; varying float vRim; varying float vNx; varying float vLit;
      void main(){
        vec3 t = texture2D(map, vUv).rgb; t *= t;
        float l = dot(t, vec3(0.3, 0.59, 0.11)), zone = floor(vZ.x + 0.5), on = uDmPow * uDmDim;
        vec3 c = zone < 0.5 ? mix(vec3(0.014, 0.016, 0.024), vec3(0.17, 0.185, 0.24), clamp(l * 2.6, 0.0, 1.0)) : vec3(0.014, 0.011, 0.022) + vec3(0.07, 0.05, 0.1) * clamp(l * 1.5, 0.0, 1.0);
        c *= vLit;
        c += mix(vec3(1.0, 0.12, 0.7), vec3(0.1, 0.8, 1.1), smoothstep(-0.35, 0.35, vNx)) * (vRim * vRim * (0.4 + 0.5 * uDmRimK));
        vec3 hot = mix(vec3(1.6, 0.2, 0.9), vec3(2.0, 0.15, 0.25), uDmRage) * on * (0.6 + 0.6 * uDmBeat);
        if (zone > 2.5 && zone < 5.5) c += hot;
        else if (zone > 7.5) c += hot * (1.3 + 1.2 * uDmExpose);
        else if (zone < 0.5) c += vec3(1.7, 0.25, 0.4) * (uDmCrack * smoothstep(0.03, 0.0, abs(fract(vP.x * 19.0 + vP.y * 13.0 + sin(vP.z * 37.0) * 0.35) - 0.5))); // cracks in its armour
        else if (zone > 1.5 && zone < 2.5) c += hot * pow(vZ.y, 3.0);
        c += vec3(1.0, 0.9, 1.0) * uDmHit;
        gl_FragColor = vec4(mix(c, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}

class BlasterDemon {
  constructor(game) {
    const g = (this.g = game), geo = DemonModel.geometry();
    this.U = {
      uDmBoom: { value: 0 }, uDmBoomK: { value: 1 }, uDmShedA: { value: 0 }, uDmShedB: { value: 0 }, uDmFall: { value: 0 }, uDmHit: { value: 0 }, uDmGone: { value: 0 }, uDmCrack: { value: 0 }, uDmPow: { value: 0 }, uDmDim: { value: 1 },
      uDmRage: { value: 0 }, uDmBeat: { value: 0 }, uDmSweep: { value: 9 }, uDmMouth: { value: 0 }, uDmClaw: { value: 0 }, uDmExpose: { value: 0 }, uDmBoomHot: { value: 0 }, uDmRimK: { value: 0.4 }, uDmKick: { value: 0.45 },
      uDmEye: { value: new THREE.Color(0, 0, 0) }, uDmRim: { value: new THREE.Color(0, 0, 0) }, uDmCoreCol: { value: new THREE.Color(0, 0, 0) }, uDmHaze: { value: new THREE.Color(0, 0, 0) },
    };
    this.mat = demonSkin(g.shipEnv || g.env, this.U);
    this.lowMat = this.mat.userData.twin = demonLow(this.U);
    //   root: where it is · tilt: thrown back by a hit, leaning into a strike · pose: its size · then its joints
    const root = (this.root = new THREE.Group()), tilt = (this.tilt = new THREE.Group()), pose = (this.pose = new THREE.Group());
    this.J = {}; this.full = []; this.low = [];
    for (const name in DEMON_RIG) {
      const d = DEMON_RIG[name], j = new THREE.Group(), from = d.p ? DEMON_RIG[d.p].at : DEMON.centre, mesh = new THREE.Mesh(geo.full[name], this.mat), low = new THREE.Mesh(geo.low[name], this.lowMat);
      j.position.set(d.at[0] - from[0], d.at[1] - from[1], d.at[2] - from[2]);
      mesh.frustumCulled = low.frustumCulled = false; // (its vertices move in the shader)
      low.visible = false; // (what the weakest quality levels draw in its place)
      this.full.push(mesh); this.low.push(low);
      j.add(mesh, low);
      (d.p ? this.J[d.p] : pose).add(j);
      // (where it rests, and which way it is thrown and how it turns when the demon comes apart in chunks)
      j.userData = { rest: j.position.clone(), dir: new THREE.Vector3(d.at[0] - DEMON.centre[0] + rand(-0.1, 0.1), d.at[1] - DEMON.centre[1] + rand(-0.1, 0.16), d.at[2] - DEMON.centre[2] + rand(-0.05, 0.25)).normalize(), spin: new THREE.Vector3(rand(-3, 3), rand(-3, 3), rand(-3, 3)) };
      this.J[name] = j;
    }
    // light that has no surface: its eyes, third eye, core and mouth, the energy in its claws, a glow behind it
    const spr = (joint, at, color, size, parent = this.J[joint]) => { const s = glowSprite(color, size, 0), o = DEMON_RIG[joint].at; s.position.set(at[0] - o[0], at[1] - o[1], at[2] - o[2]); parent.add(s); return s; };
    this.eyes = DEMON.eyes.map((p) => spr("head", p, new THREE.Color(2.8, 0.12, 0.3), 0.07));
    this.third = spr("head", DEMON.third, new THREE.Color(1.5, 0.3, 2.6), 0.09);
    this.core = spr("body", DEMON.core, new THREE.Color(2.4, 0.25, 0.9), 0.3);
    this.maw = spr("head", DEMON.mouth, new THREE.Color(2.6, 0.5, 1.0), 0.16);
    this.claws = [spr("clawL", DEMON.hands[0], new THREE.Color(1.3, 0.35, 2.6), 0.2), spr("clawR", DEMON.hands[1], new THREE.Color(1.3, 0.35, 2.6), 0.2)];
    this.glow = glowSprite(new THREE.Color(0.5, 0.1, 0.75), 1.9, 0); // (a breath of violet light round it)
    this.glow.position.set(0, 0, -0.25);
    this.glow.renderOrder = 2;
    pose.add(this.glow);
    tilt.add(pose);
    root.add(tilt);
    root.visible = false; // (it arrives when the game starts)
    g.scene.add(root);
    // its bolts (they come almost straight at the camera, so each is a ball of light), and a ring of light for its aura
    this.bolts = Array.from({ length: 6 }, () => { const b = glowSprite(new THREE.Color(2.8, 0.45, 1.5), 0.5, 1); b.visible = false; b.renderOrder = 6; g.scene.add(b); return { mesh: b, t: -1, from: new THREE.Vector3(), to: new THREE.Vector3() }; });
    this.auraU = { uColor: { value: new THREE.Color(1.0, 0.08, 0.2) }, uK: { value: 0 } };
    this.aura = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.auraU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uColor; uniform float uK; varying vec2 vUv; void main(){ vec2 d = abs(vUv - 0.5) * 2.0; float e = smoothstep(0.3, 1.0, max(d.x, d.y)) * 0.8 + 0.3 * smoothstep(0.6, 1.3, length(d)); gl_FragColor = vec4(uColor * (e * e * uK), 1.0); }",
    }));
    this.aura.renderOrder = 55;
    this.aura.frustumCulled = false;
    this.aura.visible = false;
    g.scene.add(this.aura);
    this.puffs = new ExamPuffs(g.scene, 44); // dark mist off its wings, smoke when it is hurt, fire when it goes
    this.S = this.fitS = 6; this.yK = this.fitY = 0.04; // its size and how high it rides (see fit)
    this.alive = false; this.inT = 1; this.adv = 0; this.kick = 0; this.kickTo = 0; this.twist = 1; this.hits = 0; this.look = 0; this.nod = 0;
    this.att = null; this.atkN = 0; // the strike under way: { time, kind, fired, hit }
    this.dieT = -1; this.pending = false; this.blown = false; // seconds since it was destroyed; the next one is waiting; it has gone up
    this.finale = false; this.finaleDone = false; this.blast2 = false; // its last stand: once a run, when the player passes their best score
    this.rageOn = false; this.rageT = 9; this.gloatT = -1; this.beatN = 0;
    this.flap = 0; this.rage = 0; this.pow = 0; this.shed = 0; this.fall = 1; this.flick = 1; this.flickT = 0; this.emberT = 0; this.mistT = 0; this.arcT = 0; this.sparkT = 3; this.heat = 0; this.roared = false; this.seed = 7741;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._d = new THREE.Vector3(); this._c = new THREE.Color(); this._c2 = new THREE.Color();
  }
  lcg() { return (this.seed = (this.seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // Its size and height, from the room there is: at its closest it fills the band between the question and the
  // answers from top to bottom and its wingtips run past the sides; when a question starts it is two thirds of that.
  fit(band) {
    this.fitS = clamp(Math.min((band.h * 1.12) / DEMON.height, (band.w * 1.3) / DEMON.width), 1.5, 14);
    this.fitY = (band.h * 0.1) / DEMON_NEAR;
    if (!this.root.visible) { this.S = this.fitS; this.yK = this.fitY; }
  }
  // A wave starts: the next demon flies up out of the distance. (If the last one is still breaking up, it waits for that.)
  arrive() {
    if (this.dieT >= 0) { this.pending = true; return; }
    const U = this.U;
    this.alive = true; this.att = null; this.hits = 0; this.adv = 0; this.kick = this.kickTo = 0; this.shed = 0; this.fall = 1; this.rage = 0; this.pow = 0; this.roared = false; this.pending = false; this.blown = false;
    this.finale = false; this.blast2 = false; this.rageOn = false; this.rageT = 9;
    this.inT = REDUCED_MOTION ? 1 : 0;
    U.uDmGone.value = U.uDmHit.value = U.uDmBoom.value = U.uDmBoomHot.value = U.uDmShedA.value = U.uDmShedB.value = U.uDmCrack.value = U.uDmExpose.value = 0;
    U.uDmBoomK.value = 1;
    for (const n in this.J) { this.J[n].position.copy(this.J[n].userData.rest); this.J[n].scale.setScalar(1); } // (whole again)
    this.root.visible = true;
  }
  // a point on the model (its own units, at rest), in the world
  at(p, out) { this.pose.updateWorldMatrix(true, false); return this.pose.localToWorld(out.set(p[0] - DEMON.centre[0], p[1] - DEMON.centre[1], p[2] - DEMON.centre[2])); }
  // where the fighter's fire should land
  aimPoint(out) { return this.at(DEMON.core, out); }
  // A right answer: the fighter's fire lands on its core. It whites out, is thrown back, and is a little more broken.
  hit(color) {
    if (!this.alive) return;
    const g = this.g, U = this.U, k6 = this.S / 6, cheap = GFX.ok && GFX.Q[GFX.qi].cheap, p = this.aimPoint(this._a);
    g.blastAt(p, color, 0.42);
    U.uDmHit.value = 1;
    this.kickTo = 1;
    this.twist = -this.twist;
    this.hits++;
    // armour comes away: what was falling is gone, the next plates start to fall. (The plain version of the demon
    // cannot move its plates, so there bits of armour fly off it instead.)
    U.uDmShedA.value = U.uDmShedB.value;
    this.shed = clamp((this.hits - 2) / 7, 0, 1);
    U.uDmShedB.value = this.shed;
    this.fall = 0;
    Sound.sfx("demonhit");
    if (this.hits >= 3) {
      g.shards.burst(p, 0x3a3848, cheap ? 7 : 3, 0.45 * k6, 6 * k6);
      Sound.sfx("demonshed");
    }
  }
  // A wrong answer, or none in time: it rears up, then strikes. Three strikes in turn: bolts from both claws, a lunge
  // and a swipe, a roar and a blast from its mouth.
  attack() {
    if (this.att) return;
    if (!this.alive) { this.g.jet.shieldLost(); return; } // (between demons: the shield still shows the hit)
    this.att = { time: 0, kind: this.atkN++ % 3, fired: 0, hit: false, ring: false };
    Sound.sfx("demoncharge");
  }
  // The wave is cleared: it staggers, then breaks up in a blast of the wave's colour. Once in a run, at the wave that
  // takes the player past their best score, it makes a last stand of it: a long roar, the aura full, a bigger break-up
  // and two blasts. (Read from the saved scores; nothing is written.)
  destroy() {
    if (!this.alive) return;
    const g = this.g;
    this.alive = false;
    this.att = null;
    this.dieT = 0;
    this.blown = this.blast2 = false;
    this.finale = !this.finaleDone && typeof Store !== "undefined" && g.score > Store.best("blaster");
    if (this.finale) this.finaleDone = true;
    Sound.sfx(this.finale ? "demonroarlong" : "demonroar");
  }
  blow() {
    const g = this.g, p = this.aimPoint(new THREE.Vector3()), col = g.waveCol.clone(), big = (this.finale ? 1.45 : 1) * (1 + clamp((g.wave - 2) * 0.05, 0, 0.3)), k = (this.S / 6) * big, v = this._d;
    this.blown = true;
    this.U.uDmHit.value = 1;
    this.U.uDmBoomK.value = this.finale ? 1.7 : 1;
    g.bursts.burst(p, col, { n: Math.round(90 * big), speed: 13 * k, size: 0.36 * k, life: 1.2 });
    g.bursts.burst(p, 0xffffff, { n: 24, speed: 6 * k, size: 0.28 * k, life: 0.7 });
    g.bursts.burst(p, 0xff3a6a, { n: Math.round(40 * big), speed: 5 * k, size: 0.3 * k, life: 1.6, gravity: 1.5 });
    g.shockwave(p.clone(), col.clone().multiplyScalar(2.2), 16 * k, 0.8);
    g.shards.burst(p, col.getHex(), 22, 1.4 * k, 18 * k);
    g.shards.burst(p, 0x3a3848, 14, 1.1 * k, 12 * k); // its armour, in pieces
    g.boom(p, col.getHex(), 7 * k);
    if (!GFX.calm) this.puffs.emit(2, p, v.set(0, 0, 0), 1.3 * k, 3.8 * k, 0.24); // (Reduced effects: no flash)
    for (let i = 0; i < 6; i++) this.puffs.emit(0, this._b.set(p.x + rand(-2, 2) * k, p.y + rand(-1.4, 1.6) * k, p.z + rand(-0.6, 0.6) * k), v.set(rand(-2, 2), rand(-0.5, 2), rand(1, 4)), 0.9 * k, (2.1 + rand(0.8)) * k, 0.9 + rand(0.4), 0.6);
    for (let i = 0; i < 4; i++) this.puffs.emit(1, this._b.set(p.x + rand(-1.6, 1.6) * k, p.y + rand(-1, 1.4) * k, p.z), v.set(rand(-1.5, 1.5), rand(0, 1.5), rand(2, 5)), 1.6 * k, (3.6 + rand(1.4)) * k, 1.5 + rand(0.5), 0.5);
    Sound.sfx(this.finale ? "demonfinale" : "demonboom");
    Sound.sfx("demonbreak");
  }
  // the finale's second blast, a moment after the first: white at its heart, wider
  blowAgain() {
    const g = this.g, p = this.aimPoint(new THREE.Vector3()), k = (this.S / 6) * 1.5, v = this._d;
    this.blast2 = true;
    g.bursts.burst(p, 0xffffff, { n: 70, speed: 17 * k, size: 0.4 * k, life: 1.3 });
    g.bursts.burst(p, 0xff3a6a, { n: 60, speed: 9 * k, size: 0.34 * k, life: 1.8, gravity: 1.2 });
    g.shockwave(p.clone(), new THREE.Color(2.4, 2.2, 2.4), 24 * k, 1.0);
    g.shards.burst(p, 0x3a3848, 24, 1.3 * k, 22 * k);
    for (let i = 0; i < 6; i++) this.puffs.emit(0, this._b.set(p.x + rand(-2.6, 2.6) * k, p.y + rand(-1.6, 1.8) * k, p.z + rand(-0.6, 0.6) * k), v.set(rand(-3, 3), rand(-0.5, 2.5), rand(1, 5)), 1.0 * k, (2.6 + rand(1)) * k, 1.0 + rand(0.5), 0.6);
    g.shake(0.5);
  }
  // advance: how much of the question's time has gone (0 to 1), or null between questions
  update(dt, advance) {
    const g = this.g, t = g.t, U = this.U, J = this.J, cheap = GFX.ok && GFX.Q[GFX.qi].cheap, quiet = REDUCED_MOTION || GFX.calm, ship = g.ship.position, sin = Math.sin, cos = Math.cos;
    this.S += (this.fitS - this.S) * Math.min(1, dt * 3);
    this.yK += (this.fitY - this.yK) * Math.min(1, dt * 3);
    const S = this.S, k6 = S / 6;
    this.puffs.update(dt, g.camera, t);
    this.puffs.mat.uniforms.uDetail.value = cheap ? 0 : 1;
    NEON_T.value = t;
    // bolts on their way (they outlive whatever it does next)
    this.bolts.forEach((b) => {
      if (b.t < 0) return;
      b.t += dt / 0.26;
      if (b.t >= 1) {
        b.t = -1;
        b.mesh.visible = false;
        g.bursts.burst(b.to, 0xff4fb0, { n: quiet ? 5 : 10, speed: 3.2 * g.shipScale, size: 0.14 * g.shipScale, life: 0.35 });
        if (this.att && !this.att.hit) { this.att.hit = true; g.jet.shieldLost(); } // the first one home flares the ship's shield
        return;
      }
      b.mesh.position.lerpVectors(b.from, b.to, b.t);
      b.mesh.scale.setScalar((0.55 + 0.45 * b.t) * (0.5 + 0.09 * S));
      b.mesh.visible = true;
    });
    this.aura.visible = false;
    if (!this.root.visible) return;
    if (this.wasCheap !== cheap) { this.wasCheap = cheap; this.full.forEach((m) => { m.visible = !cheap; }); this.low.forEach((m) => { m.visible = cheap; }); }

    // ---- how it is: arriving, raging, hurt, striking, winning, dying (each a smooth weight, 0 to 1)
    const A = this.att;
    if (A) A.time += dt;
    const dying = this.dieT >= 0;
    if (dying) this.dieT += dt;
    if (this.inT < 1) this.inT = Math.min(1, this.inT + dt / 1.9);
    const inK = Math.pow(1 - this.inT, 3), flare = smoothstep(0.62, 0.8, this.inT) * (1 - smoothstep(0.86, 1, this.inT)); // (its wings thrown wide as it arrives)
    // rage: the wave's last three questions. As it begins it throws its wings wide and roars, once; then faster
    // wings, red light, arcs across its wings and an aura that fills the edges of the view.
    const rageNow = this.alive && g.inWave >= WAVE_LEN - 3;
    if (rageNow && !this.rageOn) {
      this.rageT = 0;
      Sound.sfx("demonrage");
      g.bursts.burst(this.aimPoint(this._a), 0xff3a5a, { n: quiet ? 10 : 30, speed: 5 * k6, size: 0.16 * k6, life: 1.2, gravity: 1.2 });
    }
    this.rageOn = rageNow;
    this.rageT += dt;
    this.rage += ((rageNow ? 1 : 0) - this.rage) * Math.min(1, dt * 1.5);
    const rage = this.rage, hurt = clamp((this.hits - 1) / 7, 0, 1), onset = smoothstep(0, 0.25, this.rageT) * (1 - smoothstep(0.55, 1.3, this.rageT));
    // the run is over: it has won, and roars over the wreck with its wings spread
    if (g.state === "over" && this.alive && this.gloatT < 0) { this.gloatT = 0; Sound.sfx("demonroarlong"); }
    if (this.gloatT >= 0) this.gloatT += dt;
    const gloat = this.gloatT >= 0 ? smoothstep(0, 0.35, this.gloatT) * (1 - smoothstep(1.7, 2.6, this.gloatT)) : 0;
    const tele = A ? smoothstep(0, 0.4, A.time) * (1 - smoothstep(0.42, 0.56, A.time)) : 0; // rearing up: the warning
    const strike = A ? smoothstep(0.42, 0.56, A.time) * (1 - smoothstep(0.8, 1.35, A.time)) : 0;
    this.kickTo *= Math.pow(0.03, dt);
    this.kick += (this.kickTo - this.kick) * Math.min(1, dt * 22);
    // dying: it sags and staggers; in its last stand it rears back and roars instead
    const stag = dying ? smoothstep(0, 0.25, this.dieT) : 0, kick = this.kick, roar = dying && this.finale && !this.blown ? stag : 0, sag = stag - roar;
    const raise = Math.min(1.2, tele + 0.8 * roar + 0.7 * gloat + 0.5 * onset); // (arms up and out, claws open)
    this.fall = Math.min(1, this.fall + dt / 1.0);
    U.uDmFall.value = this.fall;
    // wings: a slow beat, faster in a rage and as it flies in; its heart. Each down-beat is heard, quietly.
    this.flap += dt * (5.2 + 4.4 * rage + 6 * Math.min(1, inK * 4) + 2.5 * tele + 3 * gloat) * (quiet ? 0.6 : 1);
    const ph = this.flap, beat = Math.pow(0.5 + 0.5 * sin(t * (5.4 + 3 * rage)), 6), beatN = Math.floor((ph - 1.5708) / 6.2832);
    if (beatN !== this.beatN) { this.beatN = beatN; if (this.inT > 0.25 && !dying) Sound.sfx("demonflap", clamp(this.root.position.x * 0.1, -0.6, 0.6)); }
    // ---- where it is: as far ahead as the time left says, further when a hit has thrown it back, flying up when it is new
    if (advance !== null) this.adv += (advance - this.adv) * Math.min(1, dt * 5);
    else if (!A) this.adv += (0 - this.adv) * Math.min(1, dt * 1.1);
    const lunge = strike * (A && A.kind === 1 ? 5.5 : 2.2) * (REDUCED_MOTION ? 0.3 : 1);
    const z = -lerp(DEMON_FAR, DEMON_NEAR, this.adv) - kick * (REDUCED_MOTION ? 3 : 8) - inK * 120 + lunge - stag * 2.5 + gloat * 3;
    const bob = quiet ? 0 : -sin(ph + 0.4) * 0.016 * S * (1 + 0.5 * rage);
    this.root.position.set(quiet ? 0 : sin(t * 0.45) * 0.07 * S, this.yK * -z + bob + (quiet ? 0 : sin(t * 0.8) * 0.015 * S) + tele * 0.05 * S - sag * 0.1 * S + roar * 0.05 * S, z);
    this.pose.scale.setScalar(S);
    const d = this._d.subVectors(ship, this.root.position), toShip = Math.atan2(d.x, d.z), down = Math.atan2(-d.y, Math.hypot(d.x, d.z));
    // the whole of it: leaning over the player; back as it rears and when it is hit; down into its strike
    this.tilt.rotation.set(0.1 + down * 0.35 - 0.3 * tele + 0.42 * strike - 0.5 * kick - 0.35 * sag - 0.3 * roar - 0.2 * gloat + 0.25 * Math.min(1, inK * 3), toShip * 0.5 + this.twist * 0.22 * kick,
      quiet ? 0 : sin(t * 0.7) * 0.04 + this.twist * 0.18 * kick + (dying ? sin(this.dieT * 13) * 0.07 * (1 - smoothstep(0.5, 0.8, this.dieT)) : 0) + (rage > 0.5 ? 0.012 * sin(t * 9.1) * sin(t * 1.7) : 0));
    // ---- its joints. Angles from smooth curves; what is further out follows a little later.
    const breath = sin(t * 1.9), open = 0.28 * tele + 0.5 * strike * (A && A.kind === 2 ? 1 : 0.6) + 0.34 * kick + 0.3 * flare + 0.45 * sag + 0.6 * roar + 0.5 * onset + 0.55 * gloat + 0.04 + 0.03 * breath; // its jaw
    const up = 0.5 * tele - 0.55 * strike + 0.45 * flare - 0.55 * sag + 0.55 * roar - 0.25 * kick + 0.4 * onset + 0.5 * gloat, fwd = 0.45 * kick - 0.25 * tele + 0.3 * strike + 0.2 * sag - 0.2 * roar; // wings: raised, swept forward
    const amp = (quiet ? 0.5 : 1) * (1 + 0.35 * rage) * (1 - 0.7 * stag);
    const wing = (sd, lag) => 0.06 + up + amp * 0.17 * sin(ph - lag) + sd * 0.02 * sin(t * 0.6);
    J.wingL.rotation.set(0, fwd + amp * 0.08 * cos(ph), -wing(-1, 0));
    J.wingR.rotation.set(0, -fwd - amp * 0.08 * cos(ph), wing(1, 0));
    J.bladeL.rotation.set(0, 0.05 * fwd, -(amp * 0.13 * sin(ph - 0.75) + 0.3 * up));
    J.bladeR.rotation.set(0, -0.05 * fwd, amp * 0.13 * sin(ph - 0.75) + 0.3 * up);
    J.lowL.rotation.set(0, fwd * 0.7 + amp * 0.1 * cos(ph - 1.1), -(-0.04 + 0.7 * up + amp * 0.22 * sin(ph - 1.15)));
    J.lowR.rotation.set(0, -fwd * 0.7 - amp * 0.1 * cos(ph - 1.1), -0.04 + 0.7 * up + amp * 0.22 * sin(ph - 1.15));
    // body, shoulders, tail: breathing, and a sway that runs down it
    J.body.rotation.set(0.03 * breath + 0.02 * sin(ph + 1.2) * amp, quiet ? 0 : sin(t * 0.5) * 0.05, 0);
    J.body.scale.setScalar(1 + 0.012 * breath);
    J.padL.rotation.set(0, 0, -0.035 * breath - 0.12 * raise + 0.1 * kick);
    J.padR.rotation.set(0, 0, 0.035 * breath + 0.12 * raise - 0.1 * kick);
    const sway = quiet ? 0.4 : 1;
    J.waist.rotation.set(0.05 * sin(t * 0.9 + 1) * sway - 0.2 * raise + 0.25 * strike + 0.3 * kick, 0, 0.07 * sin(t * 0.9) * sway);
    J.tail.rotation.set(0.1 * sin(t * 0.9 + 0.2) * sway - 0.25 * raise + 0.35 * strike + 0.4 * kick + 0.3 * sag, 0, 0.14 * sin(t * 0.9 - 0.9) * sway);
    // head: it watches the player (the pointer turns it a little); thrown back by a hit and by its roars; it lolls as it dies
    this.look += ((quiet ? 0 : 0.12 * sin(t * 0.6) + clamp(Pointer.x, -1, 1) * 0.25) * (1 - strike) - this.look) * Math.min(1, dt * 7);
    this.nod += ((0.16 - clamp(Pointer.y, -1, 1) * 0.1) - 0.3 * tele + 0.22 * strike - 0.45 * kick - 0.32 * roar - 0.28 * gloat - 0.22 * onset - this.nod) * Math.min(1, dt * 9);
    J.head.rotation.set(this.nod + (rage > 0.5 && !quiet ? 0.03 * sin(t * 7.3) * sin(t * 1.3) : 0) + 0.35 * sag * sin(this.dieT * 3 + 1), this.look + 0.3 * sag * sin(this.dieT * 4), 0.05 * sin(t * 0.8) * sway + this.twist * 0.25 * kick + 0.3 * sag);
    J.jaw.rotation.set(open, 0, 0);
    // arms: hanging and swaying; raised and spread as it rears or roars; swept in and down as it strikes; thrown wide by a hit
    const arm = (sd, j, f, h, c) => {
      const o = sd * 1.3, swipe = A && A.kind === 1 ? 1 : 0.55;
      j.rotation.set(-0.08 + 0.05 * sin(t * 0.9 + o) * sway - 0.95 * raise + (0.35 - 0.5 * swipe) * strike - 0.5 * kick * (sd * this.twist > 0 ? 1 : 0.3) - 0.2 * flare + 0.25 * sag, sd * 0.25 * strike * swipe, sd * (0.05 + 0.04 * sin(t * 0.7 + o) + 0.55 * raise - 0.6 * strike * swipe + 0.45 * kick + 0.3 * flare - 0.15 * sag));
      f.rotation.set(-0.12 + 0.07 * sin(t * 1.1 + o + 0.6) * sway - 0.65 * raise + 0.15 * strike - 0.3 * kick - 0.3 * sag, 0, sd * 0.1 * strike);
      h.rotation.set(0.06 * sin(t * 1.2 + o + 1.2) * sway - 0.3 * raise + 0.3 * strike, 0, 0);
      c.rotation.set(0.1 * sin(t * 1.4 + o + 2) * sway - 0.45 * raise + 0.55 * strike + 0.25 * sag + 0.12 * rage * sin(t * 3.1 + o), 0, 0);
    };
    arm(-1, J.armL, J.foreL, J.handL, J.clawL);
    arm(1, J.armR, J.foreR, J.handR, J.clawR);

    // ---- its light
    const lit = this.inT > 0.55 && !dying;
    this.pow += ((lit ? 1 : 0) - this.pow) * Math.min(1, dt * (dying ? 6 : 2.5));
    U.uDmSweep.value = this.inT < 1 ? -0.1 + smoothstep(0.55, 1, this.inT) * 1.0 : 9;
    if ((this.hits >= 6 || dying) && !quiet) { if ((this.flickT -= dt) <= 0) { this.flickT = 0.4; this.flick = this.lcg() < 0.5 ? 0.4 : 1; } } else this.flick = 1; // (a change at most 2.5 times a second)
    U.uDmDim.value += (this.flick - U.uDmDim.value) * Math.min(1, dt * 12);
    U.uDmPow.value = this.pow * (0.8 + 0.5 * rage + 0.6 * tele + 0.4 * strike + 0.5 * onset + 0.6 * gloat) + (dying && !this.blown ? 0.9 + 0.6 * roar : 0);
    U.uDmRage.value = Math.max(rage, 0.6 * tele + 0.8 * strike, gloat, roar);
    U.uDmBeat.value = beat;
    U.uDmRimK.value = 0.4 + 0.3 * rage + 0.4 * tele + 0.3 * gloat + 0.3 * roar;
    U.uDmKick.value = 0.5 * (1 - 0.6 * rage);
    U.uDmRim.value.copy(g.waveCol).multiplyScalar(0.5);
    U.uDmHaze.value.copy(g.space ? g.space.cur.a : g.scene.fog.color).multiplyScalar(0.1);
    U.uDmHit.value = Math.max(0, U.uDmHit.value - dt * 5.5);
    U.uDmCrack.value += ((dying ? 1 : hurt * 0.55) - U.uDmCrack.value) * Math.min(1, dt * 3);
    U.uDmExpose.value += ((this.shed > 0.85 ? 1 : 0) - U.uDmExpose.value) * Math.min(1, dt * 2);
    U.uDmMouth.value = Math.min(1.6, open * 2.6) * this.pow;
    const charge = Math.max(tele, strike * 0.6, 0.35 * rage, 0.8 * roar, 0.7 * gloat);
    U.uDmClaw.value = charge * 1.6;
    const eye = this.pow * (0.75 + 0.2 * sin(t * 2.1) + 1.4 * tele + 1.0 * strike + 0.5 * rage + onset + gloat) * U.uDmDim.value;
    U.uDmEye.value.setRGB(2.8, 0.12, 0.3).multiplyScalar(eye * 0.9);
    this._c.setRGB(2.4, 0.3, 1.0).lerp(this._c2.setRGB(3.0, 0.25, 0.35), U.uDmRage.value); // the core's colour: magenta, crimson in a rage
    U.uDmCoreCol.value.copy(this._c).multiplyScalar(this.pow * U.uDmDim.value * (0.45 + 0.9 * beat + 0.8 * U.uDmExpose.value));
    this.eyes.forEach((s) => { s.material.opacity = Math.min(1, 0.55 * eye); s.scale.setScalar(0.05 + 0.035 * Math.min(2, eye)); });
    this.third.material.opacity = Math.min(1, this.pow * (0.5 + 0.5 * beat) * U.uDmDim.value);
    this.core.material.opacity = Math.min(1, this.pow * (0.1 + 0.2 * beat + 0.3 * U.uDmExpose.value + 0.2 * rage));
    this.core.scale.setScalar(0.15 + 0.06 * beat + 0.12 * U.uDmExpose.value);
    this.core.material.color.copy(this._c);
    this.maw.material.opacity = Math.min(1, open * 1.6 * this.pow);
    this.claws.forEach((s, i) => { s.material.opacity = Math.min(1, charge * 0.9); s.scale.setScalar(0.12 + 0.16 * charge * (1 + 0.15 * sin(t * 9 + i * 2))); });
    this.glow.material.opacity = this.pow * (0.05 + 0.1 * rage + 0.08 * tele + 0.14 * gloat) * (cheap ? 0 : 1) + (cheap ? 0 : 0.2 * roar);
    this.glow.material.color.setRGB(0.5, 0.1, 0.75).lerp(this._c2.setRGB(0.9, 0.06, 0.16), U.uDmRage.value);
    this.heat = Math.max(0.25 * rage, tele, strike * 0.8, dying ? 0.9 : 0, gloat);
    // the aura: the edges of the view glow red. It breathes slowly in a rage, swells as the rage begins, and fills the
    // view for its last stand and when it has won. (Not with Reduced effects.)
    const au = quiet ? 0 : rage * (0.42 + 0.14 * sin(t * 2.6)) + 0.25 * tele + 0.4 * onset + 0.8 * gloat + 0.95 * roar;
    if (au > 0.01) {
      const cam = g.camera, b = g.bandSize(6);
      this.aura.visible = true;
      this.aura.position.copy(cam.position).add(this._a.set(0, 0, -6).applyQuaternion(cam.quaternion));
      this.aura.quaternion.copy(cam.quaternion);
      this.aura.scale.set(b.w * 1.3, b.h * 1.3, 1); // (its brightest part lies just outside the band)
      this.auraU.uK.value = au;
    }

    // ---- the strike: when it lands, and what flies
    if (A) {
      const n = A.kind === 0 ? 4 : A.kind === 1 ? 1 : 3;
      while (A.fired < n && A.time >= 0.5 + A.fired * 0.09) {
        const b = this.bolts[A.fired], src = A.kind === 2 ? DEMON.mouth : DEMON.hands[A.fired % 2];
        A.fired++;
        b.t = 0;
        this.at(src, b.from);
        b.to.copy(ship).add(this._a.set(rand(-0.7, 0.7), rand(-0.1, 0.5), rand(-0.6, 0.9)).multiplyScalar(g.shipScale));
      }
      if (!A.ring && A.time > 0.5) { // let go: with its roar, a ring of force from its mouth (not while the picture should stay calm)
        A.ring = true;
        Sound.sfx(A.kind === 2 ? "demonroar" : "demonrelease");
        if (!quiet && A.kind === 2) g.shockwave(this.at(DEMON.mouth, this._a).clone(), new THREE.Color(1.6, 0.25, 0.8), 3.4 * k6, 0.55);
      }
      if (A.time > 1.45) this.att = null;
    }
    // arriving: it spreads its wings and roars, once
    if (!this.roared && this.inT > 0.7 && this.inT < 1) {
      this.roared = true;
      Sound.sfx("demonroar");
      if (!quiet) g.shockwave(this.at(DEMON.mouth, this._a).clone(), new THREE.Color(1.3, 0.25, 1.0), 4.2 * k6, 0.8);
    }
    // ---- what comes off it: embers, mist from its wings, sparks from its wounds, arcs between its claws and across its wings
    if (!cheap && this.inT > 0.5 && !this.blown) {
      if ((this.emberT -= dt) <= 0) {
        this.emberT = (quiet ? 0.5 : 0.2) / (1 + 2.6 * rage + 2 * roar);
        g.bursts.burst(this.at([rand(-0.3, 0.3), rand(0.1, 0.55), rand(-0.1, 0.15)], this._a), rage > 0.5 || this.lcg() < 0.5 ? 0xff3a5a : 0xd04fff, { n: 1, speed: 0.6 * k6, size: 0.1 * k6, life: 1.5, gravity: 1.6 });
      }
      if (!quiet && (this.mistT -= dt) <= 0) {
        this.mistT = 0.14;
        const tip = DEMON.tips[Math.floor(this.lcg() * 4)];
        this.puffs.emit(1, this.at([tip[0] * rand(0.6, 1), tip[1], tip[2]], this._a), this._b.set(rand(-0.3, 0.3), rand(-0.6, 0.1), rand(-3, -1.2)), 0.09 * S, 0.3 * S, 1.2, 0.1, 0.5);
      }
      if (this.hits >= 3 && !quiet && (this.sparkT -= dt) <= 0) {
        this.sparkT = rand(1.6, 3.2) / (1 + hurt);
        g.bursts.burst(this.at([rand(-0.2, 0.2), rand(0.18, 0.4), 0.12], this._a), 0xff7a4a, { n: 12, speed: 4 * k6, size: 0.13 * k6, life: 0.45 });
        this.puffs.emit(1, this._a, this._b.set(rand(-0.3, 0.3), rand(0.4, 1.1), rand(-1, 1)), 0.08 * S, 0.26 * S, 0.9, 0.5, 0.5);
      }
      if ((charge > 0.3 || rage > 0.6) && !quiet && g.space && g.space.fx && (this.arcT -= dt) <= 0) { // energy crackling: an arc every 0.4 s at most
        this.arcT = 0.4;
        if (charge > 0.3 && this.lcg() < 0.6) { // in its claws
          const h = DEMON.hands[this.lcg() < 0.5 ? 0 : 1], a = this.at([h[0] + rand(-0.05, 0.05), h[1] + rand(0, 0.08), h[2]], this._a), b = this._b.copy(a).add(this._d.set(rand(-0.06, 0.06) * S, rand(-0.07, 0.03) * S, rand(-0.03, 0.03) * S));
          g.space.fx.beam(a, b, 0.2, [1.4, 0.6, 2.8], 0.012 * S);
        } else { // in a rage, from a wingtip down its wing
          const tip = DEMON.tips[Math.floor(this.lcg() * 4)], a = this.at(tip, this._a).clone(), m = this.at([tip[0] * 0.55 + rand(-0.04, 0.04), tip[1] - 0.08 + rand(-0.05, 0.05), tip[2] + 0.05], this._a), b = this.at([tip[0] * 0.25, 0.36, 0], this._b);
          g.space.fx.beam(a, m, 0.2, [2.6, 0.3, 0.5], 0.01 * S);
          g.space.fx.beam(m, b, 0.2, [2.6, 0.3, 0.5], 0.01 * S);
        }
      }
    }
    // ---- dying: it staggers (or, in its last stand, roars), then every part is thrown outward and burns up
    if (dying) {
      const blowAt = this.finale ? 1.15 : 0.75;
      if (!this.blown && this.dieT > blowAt) this.blow();
      if (this.blown) {
        const b = this.dieT - blowAt;
        if (this.finale && !this.blast2 && b > 0.46) this.blowAgain(); // (two blasts, never closer than this)
        U.uDmBoom.value = b;
        U.uDmBoomHot.value = Math.exp(-b * 2.2);
        U.uDmGone.value = clamp(b / (this.finale ? 2.0 : 1.5), 0, 1);
        [this.core, this.third, this.maw, this.glow].concat(this.eyes, this.claws).forEach((s) => { s.material.opacity = 0; });
        // The plain version cannot throw its parts in the shader: there its joints fly apart as chunks, turning and
        // shrinking away. (In the last stand the full version's joints are thrown too, on top of its parts.)
        if (cheap || this.finale) {
          const go = (1 - Math.exp(-b * 1.8)) * (cheap ? 0.3 : 0.12) * (this.finale ? 1.5 : 1), shrink = cheap ? Math.max(0.001, 1 - smoothstep(0.6, 1.35, b)) : 1;
          for (const n in J) {
            const j = J[n], u = j.userData;
            if (n !== "body") { j.position.copy(u.rest).addScaledVector(u.dir, go); j.rotation.x += u.spin.x * b; j.rotation.y += u.spin.y * b; j.rotation.z += u.spin.z * b; j.scale.setScalar(shrink); } else j.scale.multiplyScalar(shrink);
          }
        }
      }
      if (this.dieT > (this.finale ? 3.2 : 2.3)) { this.dieT = -1; this.root.visible = false; if (this.pending) this.arrive(); }
    }
  }
  // (after the fighter has had its say) the air shimmers round it when it rears, strikes, rages or burns
  late() { if (this.root.visible && this.heat > 0.3) GFX.heatAt(this.g.camera, this.aimPoint(this._a), 0.5 * this.S, this.heat); }
  dispose() {
    const sprites = [this.core, this.third, this.maw, this.glow].concat(this.eyes, this.claws, this.bolts.map((b) => b.mesh));
    [this.mat, this.lowMat, this.aura.material, this.aura.geometry].concat(sprites.map((s) => s.material)).forEach((m) => m.dispose());
    this.bolts.forEach((b) => this.g.scene.remove(b.mesh));
    this.g.scene.remove(this.aura);
  }
}

if (typeof requestIdleCallback === "function") requestIdleCallback(() => DemonModel.preload(), { timeout: 6000 });
else setTimeout(() => DemonModel.preload(), 3000);
