// The Final Exam's boss. The model is the player's own (arcade/assets/boss, converted
// from a .glb by scripts/convert-boss.js): 32 rigid parts, hung here on a skeleton of
// 19 joints. It towers over the camera on its dais: dark, worn armour under a bone
// skull, two violet-white lamps for eyes (its own colour: not the red eyes of every film robot), lit from above, from below and from behind.
//
// Look and sound only. While the exam is being taken it wakes, looms, breathes, watches
// whoever is in front of it and now and then leans in or flexes a claw, all slowly and
// on its own clock. It grows more menacing as questions are ANSWERED (how many: never
// which were right), and it gives the same small start at every pick, right or wrong.
// So it can give nothing away. Everything else happens after submit, once the mark is
// already worked out and saved: a pass kills it, a fail brings it down on the camera.

const BOSS_S = 9; // the model is one unit tall: this many world units in the hall
const BOSS_K = BOSS_S / 6.2; // the ending was staged at 6.2: its distances, sizes and speeds scale by this
const BOSS_G = 2.3; // gravity on its wreckage, in model units
const BOSS_DAIS = 0.5; // the dais it stands on (world units)
const BOSS_DAIS_R = 5.6;
const BOSS_CORE = [0.006, 0.7, 0.03]; // the reactor in its chest (model units)
const BOSS_ZERO = [0, 0, 0];
// joint, parent, pivot (model units), the model's parts that ride on it. L is x < 0.
const BOSS_RIG = [
  ["hips", null, [0.006, 0.5, 0.02], [7]],
  ["chest", "hips", [0.006, 0.545, 0.0], [0, 21, 22, 27, 28, 30, 31]],
  ["pylonL", "chest", [-0.11, 0.86, -0.12], [23]],
  ["pylonR", "chest", [0.125, 0.86, -0.12], [24]],
  ["head", "chest", [0.007, 0.815, 0.03], [4]],
  ["padL", "chest", [-0.2, 0.78, 0.0], [12]],
  ["padR", "chest", [0.2, 0.78, 0.0], [11]],
  ["armL", "chest", [-0.146, 0.748, 0.001], [26, 10]],
  ["foreL", "armL", [-0.296, 0.569, -0.032], [17, 14]],
  ["handL", "foreL", [-0.345, 0.415, 0.06], [2]],
  ["armR", "chest", [0.157, 0.747, -0.004], [25, 9]],
  ["foreR", "armR", [0.309, 0.564, -0.039], [18, 13]],
  ["handR", "foreR", [0.35, 0.41, 0.06], [1]],
  ["legL", "hips", [-0.062, 0.44, 0.015], [20, 6]],
  ["shinL", "legL", [-0.145, 0.262, 0.04], [3]],
  ["footL", "shinL", [-0.19, 0.075, 0.05], [15]],
  ["legR", "hips", [0.074, 0.44, 0.021], [19, 5, 29]],
  ["shinR", "legR", [0.155, 0.262, 0.07], [8]],
  ["footR", "shinR", [0.195, 0.075, 0.09], [16]],
];
// Poses: joint rotations (x, y, z radians) away from the model's own stance.
const BOSS_KNEEL = { legL: [-0.4, 0, 0], shinL: [1.9, 0, 0], footL: [0.7, 0, 0], legR: [-0.4, 0, 0], shinR: [1.9, 0, 0], footR: [0.7, 0, 0] };
const BOSS_BRACE = { legL: [-0.25, 0, 0], shinL: [0.5, 0, 0], footL: [-0.25, 0, 0], legR: [-0.35, 0, 0], shinR: [0.6, 0, 0], footR: [-0.25, 0, 0] };
const BOSS_POSE = {
  // how it stands through the exam: hunched over whoever is below it, head down, claws ready
  idle: { hips: [0.06, 0, 0], chest: [0.16, 0, 0], head: [0.24, 0, 0], armL: [-0.18, 0, -0.16], foreL: [-0.42, 0, 0], handL: [-0.25, 0, 0], armR: [-0.18, 0, 0.16], foreR: [-0.42, 0, 0], handR: [-0.25, 0, 0], padL: [0, 0, -0.06], padR: [0, 0, 0.06] },
  struck: { chest: [-0.28, 0, 0], head: [-0.38, 0, 0], armL: [0, 0, -0.55], armR: [0, 0, 0.55], foreL: [-0.4, 0, 0], foreR: [-0.4, 0, 0] },
  stagger: {
    hips: [0.05, 0.14, 0], chest: [-0.05, -0.18, 0.08], head: [0.18, 0.3, 0.1], armL: [-0.8, 0, -0.18], foreL: [-1.25, 0, 0.45], armR: [0.14, 0, 0.12], foreR: [-0.2, 0, 0],
    legL: [-0.22, 0, 0], shinL: [0.42, 0, 0], footL: [-0.2, 0, 0], legR: [-0.32, 0, 0], shinR: [0.58, 0, 0], footR: [-0.26, 0, 0],
  },
  limp: {
    hips: [0.08, -0.1, 0.03], chest: [0.12, 0.12, -0.1], head: [0.3, -0.25, -0.12], armL: [-0.7, 0, -0.2], foreL: [-1.3, 0, 0.45], armR: [0.3, 0, 0.02], foreR: [-0.05, 0, 0], handR: [0.5, 0, 0],
    legL: [-0.3, 0, 0], shinL: [0.6, 0, 0], footL: [-0.3, 0, 0], legR: [-0.2, 0, 0], shinR: [0.4, 0, 0], footR: [-0.2, 0, 0],
  },
  kneel: Object.assign({ hips: [0.1, 0, 0], chest: [0.52, 0, 0.05], head: [0.55, 0.1, 0], armL: [0.25, 0, -0.12], foreL: [-0.35, 0, 0], armR: [0.3, 0, 0.1], foreR: [-0.2, 0, 0], handR: [0.4, 0, 0] }, BOSS_KNEEL),
  overload: Object.assign({ hips: [-0.12, 0, 0], chest: [-0.45, 0, 0], head: [-0.62, 0, 0], armL: [0.5, 0, -0.95], foreL: [-0.5, 0, 0], armR: [0.5, 0, 0.95], foreR: [-0.5, 0, 0] }, BOSS_KNEEL),
  down: Object.assign({ hips: [0.1, 0, 0], chest: [0.6, 0, 0], head: [0.6, 0, 0], armL: [0.3, 0, -0.1], armR: [0.3, 0, 0.1] }, BOSS_KNEEL),
  // how it waits before the exam starts: on its knees in the dark, but with its face up
  crouch: Object.assign({ hips: [0.05, 0, 0], chest: [0.34, 0, 0], head: [-0.08, 0, 0], armL: [0.2, 0, -0.1], foreL: [-0.3, 0, 0], armR: [0.2, 0, 0.1], foreR: [-0.3, 0, 0] }, BOSS_KNEEL),
  // a fail: it roars, winds up and brings a fist down on the camera, then puts its face in the lens
  roar: { hips: [-0.08, 0, 0], chest: [-0.3, 0, 0], head: [-0.45, 0, 0], armL: [0.2, 0, -1.0], foreL: [-0.7, 0, 0], armR: [0.2, 0, 1.0], foreR: [-0.7, 0, 0], padL: [0, 0, -0.14], padR: [0, 0, 0.14] },
  windup: { hips: [-0.05, -0.25, 0], chest: [-0.2, -0.3, 0], head: [0.1, 0.3, 0], armR: [-2.5, 0, 0.35], foreR: [-0.9, 0, 0], handR: [-0.3, 0, 0], armL: [0.1, 0, -0.4], foreL: [-0.6, 0, 0] },
  smash: Object.assign({ hips: [0.22, 0.2, 0], chest: [0.6, 0.25, 0], head: [-0.1, -0.15, 0], armR: [-0.75, 0, 0.1], foreR: [-0.25, 0, 0], handR: [0.2, 0, 0], armL: [0.3, 0, -0.5], foreL: [-0.5, 0, 0] }, BOSS_BRACE),
  glare: Object.assign({ hips: [0.16, 0, 0], chest: [0.46, 0, 0], head: [0.0, 0, 0], armL: [-0.2, 0, -0.4], foreL: [-0.85, 0, 0], armR: [-0.2, 0, 0.4], foreR: [-0.85, 0, 0] }, BOSS_BRACE),
};

// The model, decoded once and kept for the session.
const BossModel = {
  _parts: null, _tex: null,
  ok() { return !!(window.THREE && window.INR_ASSETS && window.INR_ASSETS.boss); },
  parts() {
    if (this._parts) return this._parts;
    const out = new Map();
    inrModelParts(window.INR_ASSETS.boss.mesh).forEach((part) => { bossChunks(part); out.set(part.id, part); });
    return (this._parts = out);
  },
  texture() { return this._tex || (this._tex = inrModelTexture(window.INR_ASSETS.boss.albedo)); },
  // decode ahead of time, so opening the exam never waits on it
  preload() { if (this.ok()) { try { this.parts(); this.texture(); } catch (e) { /* the exam falls back to an empty dais */ } } },
};
// Split a part's triangles into a few fragments (each triangle joins its nearest seed,
// the seeds chosen far apart), so the armour breaks along irregular lines.
function bossChunks(part) {
  const T = part.ix.length / 3, k = clamp(Math.round(T / 55), 2, 12), cen = new Float32Array(T * 3);
  for (let t = 0; t < T; t++) for (let c = 0; c < 3; c++) cen[t * 3 + c] = (part.pos[part.ix[t * 3] * 3 + c] + part.pos[part.ix[t * 3 + 1] * 3 + c] + part.pos[part.ix[t * 3 + 2] * 3 + c]) / 3;
  const dmin = new Float32Array(T).fill(1e9), chunk = new Uint8Array(T);
  let seed = 0;
  for (let s = 0; s < k; s++) {
    let far = 0, fd = -1;
    for (let t = 0; t < T; t++) {
      const dx = cen[t * 3] - cen[seed * 3], dy = cen[t * 3 + 1] - cen[seed * 3 + 1], dz = cen[t * 3 + 2] - cen[seed * 3 + 2], d = dx * dx + dy * dy + dz * dz;
      if (d < dmin[t]) { dmin[t] = d; chunk[t] = s; }
      if (dmin[t] > fd) { fd = dmin[t]; far = t; }
    }
    seed = far;
  }
  part.chunk = chunk;
  part.nChunk = k;
}
// The parts that ride on one joint, as one geometry about that joint's pivot.
function bossJointGeometry(parts, pivot) {
  let nv = 0, ni = 0;
  parts.forEach((p) => { nv += p.pos.length / 3; ni += p.ix.length; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), ix = new Uint16Array(ni);
  let vo = 0, io = 0;
  parts.forEach((p) => {
    const n = p.pos.length / 3;
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[(vo + i) * 3 + k] = p.pos[i * 3 + k] - pivot[k];
    nor.set(p.nor, vo * 3);
    uv.set(p.uv, vo * 2);
    for (let i = 0; i < p.ix.length; i++) ix[io + i] = p.ix[i] + vo;
    vo += n; io += p.ix.length;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(ix, 1));
  g.computeBoundingSphere();
  return g;
}
// The boss's surface. Its own texture is rusty tan paint; here it only gives light and
// shade to the arcade's look (08m-model.js): gunmetal plates cut by panel lines, worn
// bright on every hard edge, with seams and small lights that carry colour and a rim of
// magenta and cyan. The skull (o.bone) stays pale and bare. U is one set of uniforms for
// all of it: how bright the seams are and what colour, how far up the body they are lit
// (the reveal), the cracks and the stutter of its destruction, the red rim of its dread.
function bossSkin(env, side, o, U) {
  const bone = !!o.bone;
  const m = new THREE.MeshStandardMaterial({ map: BossModel.texture(), metalness: 1, roughness: 1, envMap: env, envMapIntensity: o.env, side, emissive: 0x000000 });
  m.extensions = { derivatives: true };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, neonUniforms(), U, { uBossEye: o.eye || { value: new THREE.Vector3() }, uBossEyeAt: { value: o.eyeAt || new THREE.Vector3() } });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vBossP; varying vec3 vBossN; varying float vBossY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBossP = position; vBossN = normal; vBossY = (modelMatrix * vec4(transformed, 1.0)).y;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vBossP; varying vec3 vBossN; varying float vBossY;
        uniform vec3 uBossRim; uniform vec3 uBossSeam; uniform float uBossPower; uniform float uBossSweep; uniform float uBossCrack; uniform float uBossDim; uniform float uBossRimK; uniform vec3 uBossEye; uniform vec3 uBossEyeAt;
        ${NEON_GLSL}`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 bossT = neonTile(vBossP * 2.6, vBossN);
        float bossL = clamp(dot(texelColor.rgb, vec3(0.3333)) * 1.25, 0.0, 1.0);
        float bossEdge = clamp(length(fwidth(normalize(vNormal))) * 4.5 - 0.1, 0.0, 1.0);
        ${bone
          ? "diffuseColor.rgb = mix(vec3(0.04, 0.04, 0.05), vec3(0.8, 0.78, 0.74), bossL) * (0.78 + 0.44 * bossT.r);"
          : "diffuseColor.rgb = mix(neonMetal(bossL, bossT), vec3(0.5, 0.53, 0.6), bossEdge * 0.6);"}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = ${bone ? "clamp(0.5 + (0.5 - bossT.r) * 0.5, 0.2, 0.9)" : "mix(clamp(0.52 - 0.24 * bossL + (0.5 - bossT.r) * 0.6, 0.16, 0.95), 0.2, bossEdge)"};`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\nmetalnessFactor = ${bone ? "0.2" : "0.92"};`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        float bossH = ${bone ? "bossT.r" : "neonHeight(bossT)"};
        normal = neonBump(-vViewPosition, normal, clamp(vec2(dFdx(bossH), dFdy(bossH)), -0.5, 0.5) * 0.008);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        vec3 bossV = normalize(vViewPosition);
        // (its rim is violet from one side and gold from the other: not the arcade's magenta and cyan, which on this figure read as red and blue)
        totalEmissiveRadiance += mix(vec3(0.8, 0.42, 1.6), vec3(1.5, 1.0, 0.36), smoothstep(-0.35, 0.35, normal.x)) * pow(1.0 - clamp(abs(dot(normal, bossV)), 0.0, 1.0), 3.0) * uBossRimK * ${bone ? "0.5" : "1.0"};
        totalEmissiveRadiance += uBossRim * pow(1.0 - clamp(abs(dot(normal, bossV)), 0.0, 1.0), 4.0);
        ${bone ? "" : `// its seams and small lights: on from the feet up as it wakes, stuttering as it dies
        float bossOn = uBossPower * uBossDim * (1.0 - smoothstep(uBossSweep - 1.2, uBossSweep, vBossY));
        totalEmissiveRadiance += neonGlow(bossT, vBossP * 2.6, uBossSeam) * bossOn;
        // destroyed: its panel lines open and burn
        totalEmissiveRadiance += vec3(3.4, 1.2, 0.3) * neonGroove(bossT) * uBossCrack * (0.45 + 0.55 * bossT.r);`}
        // the eyes' own light on the bone round them (the skull only: elsewhere uBossEye is zero)
        vec3 bossE = vec3(abs(vBossP.x) - uBossEyeAt.x, vBossP.yz - uBossEyeAt.yz);
        totalEmissiveRadiance += uBossEye * diffuseColor.rgb * exp(-dot(bossE, bossE) * 420.0);`);
  };
  m.customProgramCacheKey = () => "exam-boss-skin-2-" + (bone ? 1 : 0);
  return m;
}

// Fire, smoke, vapour and flashes: camera-facing puffs, all in one draw call. A fire
// puff burns from white through orange to red and ends as smoke; smoke is lit from
// below by whatever still burns. Drawn far to near so smoke lies over what is behind it.
class ExamPuffs {
  constructor(scene, cap = 64) {
    this.cap = cap;
    this.list = [];
    const quad = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.setIndex(quad.index);
    g.setAttribute("position", quad.attributes.position);
    g.setAttribute("uv", quad.attributes.uv);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); // x, y, z, size
    this.aQ = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4); // age, seed, kind, turn
    this.aP.setUsage(THREE.DynamicDrawUsage);
    this.aQ.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aP", this.aP);
    g.setAttribute("aQ", this.aQ);
    g.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uGlow: { value: 0 }, uDetail: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      vertexShader: `attribute vec4 aP; attribute vec4 aQ; varying vec2 vUv; varying vec4 vQ;
        void main(){
          vUv = uv; vQ = aQ;
          float c = cos(aQ.w), s = sin(aQ.w);
          vec4 mv = viewMatrix * vec4(aP.xyz, 1.0);
          mv.xy += vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aP.w;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform float uTime; uniform float uGlow; uniform float uDetail; varying vec2 vUv; varying vec4 vQ;
        float pH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float pN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(pH(i), pH(i + vec2(1.0, 0.0)), f.x), mix(pH(i + vec2(0.0, 1.0)), pH(i + vec2(1.0, 1.0)), f.x), f.y); }
        void main(){
          vec2 p = vUv * 2.0 - 1.0; float r = length(p), age = vQ.x;
          vec2 q = p * 1.7 + vQ.y * 31.0 + vec2(0.0, -uTime * 0.5 - age * 0.8);
          float n = pN(q) * 0.62 + pN(q * 2.1 + 7.3) * 0.38;
          if (uDetail > 0.5) n = n * 0.82 + pN(q * 4.6 + 1.7) * 0.18;
          float shape = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.9);
          vec3 rgb; float a;
          if (vQ.z < 0.5) {
            float heat = shape * pow(1.0 - age, 1.6) * (0.55 + 0.75 * n);
            vec3 fire = mix(vec3(1.6, 0.25, 0.03), vec3(3.2, 1.5, 0.35), smoothstep(0.15, 0.6, heat));
            fire = mix(fire, vec3(4.0, 3.4, 2.4), smoothstep(0.6, 1.0, heat));
            a = shape * smoothstep(0.25, 0.9, age) * (1.0 - smoothstep(0.75, 1.0, age)) * 0.6;
            rgb = fire * heat * 1.05 + vec3(0.05, 0.045, 0.055) * a;
          } else if (vQ.z < 1.5) {
            a = shape * smoothstep(0.0, 0.12, age) * pow(1.0 - age, 1.3) * 0.55;
            rgb = (mix(vec3(0.04, 0.035, 0.05), vec3(0.2, 0.18, 0.22), n) + vec3(1.2, 0.45, 0.1) * uGlow * (1.0 - vUv.y) * 0.5) * a;
          } else if (vQ.z < 2.5) {
            a = 0.0;
            rgb = vec3(3.6, 3.0, 2.2) * pow(max(1.0 - r, 0.0), 2.0) * pow(1.0 - age, 2.0);
          } else {
            // vapour off its back: thin, and red where the light under it catches it
            a = shape * smoothstep(0.0, 0.2, age) * pow(1.0 - age, 1.5) * 0.14;
            rgb = (mix(vec3(0.05, 0.04, 0.08), vec3(0.2, 0.17, 0.26), n) + vec3(0.3, 0.04, 0.05) * (1.0 - vUv.y)) * a;
          }
          gl_FragColor = vec4(rgb, a);
        }`,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
    scene.add(this.mesh);
  }
  // kind: 0 fire, 1 smoke, 2 flash, 3 vapour
  emit(kind, pos, vel, s0, s1, life, lift = 0, drag = 0.35) {
    if (this.list.length >= this.cap) { // full: the oldest puff makes room
      let old = 0;
      this.list.forEach((p, i) => { if (p.age > this.list[old].age) old = i; });
      this.list.splice(old, 1);
    }
    this.list.push({ kind, x: pos.x, y: pos.y, z: pos.z, vx: vel.x, vy: vel.y, vz: vel.z, s0, s1, life, lift, drag, age: 0, seed: Math.random(), turn: rand(-0.7, 0.7), d: 0 });
  }
  update(dt, camera, t) {
    const L = this.list, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.age += dt / p.life;
      if (p.age >= 1) { L.splice(i, 1); continue; }
      const d = Math.pow(p.drag, dt);
      p.vx *= d; p.vz *= d; p.vy = p.vy * d + p.lift * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.d = (p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy) + (p.z - cz) * (p.z - cz);
    }
    L.sort((a, b) => b.d - a.d);
    const P = this.aP.array, Q = this.aQ.array;
    for (let i = 0; i < L.length; i++) {
      const p = L[i], k = 1 - (1 - p.age) * (1 - p.age);
      P[i * 4] = p.x; P[i * 4 + 1] = p.y; P[i * 4 + 2] = p.z; P[i * 4 + 3] = p.s0 + (p.s1 - p.s0) * k;
      Q[i * 4] = p.age; Q[i * 4 + 1] = p.seed; Q[i * 4 + 2] = p.kind; Q[i * 4 + 3] = p.seed * 6.283 + p.turn * p.age;
    }
    this.aP.needsUpdate = this.aQ.needsUpdate = true;
    this.mesh.geometry.instanceCount = L.length;
    this.mat.uniforms.uTime.value = t;
  }
}

class ExamBoss {
  constructor(game, env) {
    const g = (this.g = game), s = g.scene, P = BossModel.parts(), K = BOSS_K;
    this.root = new THREE.Group();
    this.root.scale.setScalar(BOSS_S);
    this.root.position.y = BOSS_DAIS;
    s.add(this.root);
    // a soft shadow where it stands
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "varying vec2 vUv; void main(){ gl_FragColor = vec4(0.0, 0.0, 0.0, 0.8 * pow(1.0 - clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0), 1.5)); }",
    }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.004;
    this.root.add(this.shadow);
    // Gunmetal armour and a pale skull. Through the exam both are drawn one-sided (the
    // shells are closed, and that halves the work); the ending bends and breaks them, so it
    // switches to two-sided twins, built and compiled with the scene so the switch costs nothing.
    this.U = {
      uBossRim: { value: new THREE.Color(0, 0, 0) }, uBossRimK: { value: 0 }, uBossSeam: { value: new THREE.Color(0, 0, 0) },
      uBossPower: { value: 0 }, uBossSweep: { value: 100 }, uBossCrack: { value: 0 }, uBossDim: { value: 1 },
    };
    this.rim = this.U.uBossRim;
    this.seamCold = new THREE.Color(0.62, 0.5, 1.35); this.seamHot = new THREE.Color(1.4, 0.62, 0.42); this.seamRage = new THREE.Color(1.75, 0.95, 0.2);
    this.flick = 1; this.flickT = 0; this.twT = 3; this.twK = 0; this.twA = 0; this.twJ = "head"; this.seed = 20261113;
    const ARMOUR = { env: 1.1 }, BONE = { bone: true, env: 0.6 };
    BONE.eye = this.eyeU = { value: new THREE.Vector3() }; // how hard the eyes light the skull
    BONE.eyeAt = this.eyeAt = new THREE.Vector3();
    this.mat = bossSkin(env, THREE.FrontSide, ARMOUR, this.U);
    this.bone = bossSkin(env, THREE.FrontSide, BONE, this.U);
    this.matOpen = bossSkin(env, THREE.DoubleSide, ARMOUR, this.U);
    this.boneOpen = bossSkin(env, THREE.DoubleSide, BONE, this.U);
    this.matOpen.emissive = this.bone.emissive = this.boneOpen.emissive = this.mat.emissive; // one glow for all four
    // the same look for the weakest quality levels: unlit gunmetal and pale bone with the two-colour rim
    this.lowTint = { value: new THREE.Color(1, 1, 1) };
    [[this.mat, false, THREE.FrontSide], [this.bone, true, THREE.FrontSide], [this.matOpen, false, THREE.DoubleSide], [this.boneOpen, true, THREE.DoubleSide]].forEach(([m, bone, side]) => {
      m.userData.twin = neonLowMaterial(BossModel.texture(), { bone, side, tint: this.lowTint, paint: 0, rim: bone ? 0.3 : 0.75 });
    });
    this.heatCol = new THREE.Color(1.0, 0.36, 0.08);
    this.J = {};
    this.joints = BOSS_RIG.map(([name, parent, pivot, ids]) => {
      const grp = new THREE.Group(), pp = parent ? this.J[parent].pivot : BOSS_ZERO;
      grp.position.set(pivot[0] - pp[0], pivot[1] - pp[1], pivot[2] - pp[2]);
      const mesh = new THREE.Mesh(bossJointGeometry(ids.map((id) => P.get(id)), pivot), name === "head" ? this.bone : this.mat);
      grp.add(mesh);
      (parent ? this.J[parent].grp : this.root).add(grp);
      return (this.J[name] = { name, parent, pivot, ids, grp, mesh, rot: new THREE.Vector3(), on: true });
    });
    this.hipRest = this.J.hips.grp.position.clone();
    [this.matOpen, this.boneOpen].forEach((m) => { // (never seen: here so the two-sided twins are compiled while the scene loads)
      const warm = new THREE.Mesh(this.J.footL.mesh.geometry, m);
      warm.visible = false;
      this.root.add(warm);
    });
    // eyes: two violet-white lamps deep in the skull's sockets, a hard streak of glare across each, their light on its face
    const hp = this.J.head.pivot;
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 1.5, 5.2) });
    this.eyeBase = new THREE.Color(2.3, 1.5, 5.2);
    this.eyes = [];
    [-0.031, 0.031].forEach((x) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.0072, 10, 8), this.eyeMat), gl = glowSprite(new THREE.Color(0.6, 0.25, 1.6), 0.07, 0.9), streak = glowSprite(new THREE.Color(0.55, 0.3, 1.4), 0.1, 0.7);
      e.position.set(x - hp[0], 0.879 - hp[1], 0.128 - hp[2]);
      gl.position.copy(e.position); gl.position.z += 0.012;
      streak.position.copy(gl.position);
      gl.layers.set(1); streak.layers.set(1);
      this.J.head.grp.add(e, gl, streak);
      this.eyes.push({ gl, streak });
    });
    this.eyeAt.set(0.031, 0.879 - hp[1], 0.14 - hp[2]); // (their light on the skull is in its shader: see bossSkin)
    // a red light at its feet, throwing its shadows upward
    // the light from under it: cold at first (the skull stays bone, the eyes are the only red),
    // then redder as the exam nears its end
    this.underCold = new THREE.Color(0x93a8ff); this.underHot = new THREE.Color(0xffa030);
    this.under = new THREE.PointLight(0x93a8ff, 0, 22, 1.5);
    this.under.position.set(0, BOSS_DAIS + 0.38 * BOSS_S, 0.52 * BOSS_S);
    s.add(this.under);
    // the reactor: a glow on the chest and a light inside, dark until it fails
    this.coreHot = neon(0xffb060, 1.6); this.coreEmber = new THREE.Color(1.5, 0.62, 0.1);
    this.coreGlow = glowSprite(this.coreHot.clone(), 0.5, 0);
    this.coreGlow.position.set(BOSS_CORE[0] - this.J.chest.pivot[0], BOSS_CORE[1] - this.J.chest.pivot[1], 0.2);
    this.coreGlow.layers.set(1);
    this.J.chest.grp.add(this.coreGlow);
    this.firePos = new THREE.Vector3(); // where its fires burn: in the ending the light under it becomes their light
    // the wreck: every fragment of armour in one mesh, thrown and landed in the vertex shader
    this.blastMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), { map: { value: BossModel.texture() }, uTint: { value: new THREE.Color(0.5, 0.56, 0.72) }, uT: { value: 0 }, uG: { value: BOSS_G }, uFire: { value: 0 }, uCore: { value: new THREE.Vector3() } }),
      side: THREE.DoubleSide,
      vertexShader: `attribute vec3 aC; attribute vec3 aV; attribute vec4 aR; attribute vec2 aK; uniform float uT; uniform float uG;
        varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL; varying float vHeat; varying float vDepth;
        vec3 spin(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
        void main(){
          float t = min(uT, aK.x), rest = max(uT - aK.x, 0.0);
          vec3 c = aC + aV * t; c.y -= 0.5 * uG * t * t;
          c.xz += aV.xz * 0.2 * (1.0 - exp(-rest * 2.5)); // a short skid where it lands
          float ang = aR.w * (t + (1.0 - exp(-rest * 3.0)) / 3.0);
          vec3 p = c + spin(position - aC, aR.xyz, ang);
          vN = spin(normal, aR.xyz, ang); vP = p; vHeat = aK.y; vUv = uv; vL = position;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `${GLSL_FOG_PARS} uniform sampler2D map; uniform vec3 uTint; uniform float uT; uniform float uFire; uniform vec3 uCore;
        varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vL; varying float vHeat; varying float vDepth;
        void main(){
          vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
          vec3 alb = texture2D(map, vUv).rgb; alb *= alb * uTint;
          vec3 toCore = uCore - vP;
          float fire = uFire * max(dot(n, normalize(toCore)), 0.0) / (1.0 + dot(toCore, toCore) * 6.0);
          vec3 lit = alb * (vec3(0.2, 0.16, 0.32) + vec3(1.0, 0.92, 0.8) * 1.1 * max(dot(n, normalize(vec3(-0.3, 0.75, 0.6))), 0.0) + vec3(3.4, 1.5, 0.5) * fire);
          float cool = exp(-uT * (0.95 + vHeat * 1.5));
          // the heat is not a flat fill: veins of it across the metal, brightest in the cracks, dying down to embers
          float vein = 0.5 + 0.5 * sin(vL.x * 310.0 + sin(vL.y * 230.0) * 2.2) * sin(vL.z * 270.0 + vL.y * 110.0);
          vec3 glow = vec3(3.0, 1.05, 0.22) * (cool * (0.12 + 0.88 * smoothstep(0.3, 0.95, vein)) + 0.05 * smoothstep(0.82, 1.0, vein));
          vec3 col = gl_FrontFacing
            ? lit * mix(1.0, 0.5, smoothstep(0.0, 1.5, uT)) + glow * (0.2 + 0.45 * vHeat) // scorched outside
            : lit * 0.32 + vec3(0.02, 0.016, 0.022) + glow; // the torn inside: bare metal, shaded like the rest, glowing in veins
          gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        }`,
    });
    const stub = new THREE.BufferGeometry(); // (a stand-in so the shader is built while the scene loads)
    stub.setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    stub.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(9), 3));
    stub.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(6), 2));
    stub.setAttribute("aC", new THREE.BufferAttribute(new Float32Array(9), 3));
    stub.setAttribute("aV", new THREE.BufferAttribute(new Float32Array(9), 3));
    stub.setAttribute("aR", new THREE.BufferAttribute(new Float32Array(12), 4));
    stub.setAttribute("aK", new THREE.BufferAttribute(new Float32Array(6), 2));
    this.wreck = new THREE.Mesh(stub, this.blastMat);
    this.wreck.frustumCulled = false;
    this.wreck.visible = false;
    this.root.add(this.wreck);
    this.puffs = new ExamPuffs(s);
    // a ring of force across the floor, a scorch where it stood, streamers of burning debris
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 72), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = BOSS_DAIS + 0.06;
    this.ring.layers.set(1);
    this.ring.visible = false;
    this.scorch = new THREE.Mesh(new THREE.CircleGeometry(BOSS_DAIS_R * 1.05, 48), new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0 }, uHot: { value: 0 } },
      transparent: true, depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uK; uniform float uHot; varying vec2 vUv;
        float sH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x);
          float ray = sH(vec2(floor(a * 9.0), 1.0)) * 0.35 + sH(vec2(floor(a * 23.0), 2.0)) * 0.2;
          float burn = smoothstep(0.95, 0.15, r + ray * 0.5) * 0.82 * uK;
          float crack = smoothstep(0.06, 0.0, abs(fract(a * 3.5 + sH(vec2(floor(r * 6.0), 3.0))) - 0.5) - 0.44) * smoothstep(0.75, 0.1, r);
          gl_FragColor = vec4(vec3(2.6, 0.8, 0.15) * crack * uHot, burn);
        }`,
    }));
    this.scorch.rotation.x = -Math.PI / 2;
    this.scorch.position.y = BOSS_DAIS + 0.03;
    this.scorch.visible = false;
    s.add(this.ring, this.scorch);
    this.streamers = Array.from({ length: 9 }, () => {
      const tr = new Trail({ length: 20, width: 0.16 * K, color: 0xff9a3d, intensity: 2.2, up: new THREE.Vector3(0, 0, 1) }), head = glowSprite(neon(0xffd9a0, 2), 0.9 * K, 1);
      tr.mesh.visible = head.visible = false;
      tr.mesh.layers.set(1); head.layers.set(1);
      s.add(tr.mesh, head);
      return { tr, head, p: new THREE.Vector3(), v: new THREE.Vector3(), on: false };
    });
    this.bodies = []; // big pieces thrown clear and left lying: a pauldron, a pylon, the head
    this.smokers = []; // damaged joints that trail smoke
    this.ct = 0; this.tremor = 0; this.heat = 0; this.fire = 0; this.popI = 0; this.smokeT = 0; this.vapT = 0; this.blown = false; this.finished = false;
    this.dread = 0; this.dreadTo = 0; this.menace = 0; this.noticeK = 0; this.lookX = 0; this.lookY = 0; this.wt = 0; this.waking = false; this.stiff = 7;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
    this.camP = new THREE.Vector3(); this.camL = new THREE.Vector3();
    // It begins on its knees in the dark, eyes out, and wakes when the exam starts.
    const still = REDUCED_MOTION;
    this.mode = still ? "idle" : "wake";
    this.pose = still ? BOSS_POSE.idle : BOSS_POSE.crouch;
    this.eyeK = 0; this.eyeTo = still ? 1 : 0;
    this.lightK = still ? 1 : 0.1; this.lightTo = this.lightK;
    this.settle(0);
  }
  // world position of a point given in model units on a joint
  at(joint, x, y, z, out) {
    const j = this.J[joint];
    return j.grp.localToWorld((out || new THREE.Vector3()).set(x - j.pivot[0], y - j.pivot[1], z - j.pivot[2]));
  }
  core(out) { return this.at("chest", BOSS_CORE[0], BOSS_CORE[1], BOSS_CORE[2], out); }
  // the exam begins: it wakes
  wake() { this.waking = true; if (this.mode === "idle") Sound.dread(true); }
  // an answer was chosen (any answer: it starts the same way at a right one and a wrong one)
  notice() { this.noticeK = 1; }
  // (its own dice: the game's are never touched while a question is up)
  lcg() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  // Ease every joint toward the pose, add the small motions on top, then set the hips
  // so the feet (or the knees, once it kneels) stay on the dais where they stood.
  settle(dt) {
    const t = this.g.t, live = this.mode === "idle" || this.mode === "wake", tr = this.tremor;
    const k = dt ? 1 - Math.exp(-dt * (this.mode === "idle" ? 3 : this.mode === "wake" ? 1.9 : this.stiff)) : 1;
    this.joints.forEach((j, i) => {
      const p = this.pose[j.name] || BOSS_ZERO;
      j.rot.x += (p[0] - j.rot.x) * k; j.rot.y += (p[1] - j.rot.y) * k; j.rot.z += (p[2] - j.rot.z) * k;
      j.grp.rotation.set(j.rot.x + Math.sin(t * 23 + i * 1.7) * 0.022 * tr, j.rot.y + Math.sin(t * 19 + i * 2.3) * 0.022 * tr, j.rot.z + Math.sin(t * 29 + i) * 0.018 * tr);
    });
    if (live) {
      // Heavy breathing: the chest swells, the pauldrons ride up, the arms hang off them.
      // And the closer the exam is to its end, the further it hunches over the camera.
      const R = (n) => this.J[n].grp.rotation, b = Math.sin(t * 1.25), d = this.dread;
      R("chest").x += b * 0.024 + d * 0.07; R("hips").x += d * 0.03; R("head").x += -d * 0.05 - b * 0.012; // (the body hunches; the face stays up, on you)
      R("padL").z += b * 0.035; R("padR").z -= b * 0.035; R("armL").z -= b * 0.018; R("armR").z += b * 0.018;
      R("foreL").x += Math.sin(t * 0.7) * 0.03; R("foreR").x += Math.sin(t * 0.7 + 1.3) * 0.03;
      this.menace = 0;
      if (!REDUCED_MOTION && this.mode === "idle") {
        // it watches whoever is in front of it: the head follows the pointer (or the phone's tilt), slowly
        const e = dt ? 1 - Math.exp(-dt * 1.6) : 1;
        this.lookX += (clamp(Pointer.x, -1, 1) * 0.36 - this.lookX) * e;
        this.lookY += (clamp(Pointer.y, -1, 1) * 0.1 - this.lookY) * e;
        R("head").y += this.lookX + Math.sin(t * 0.23) * 0.06; R("head").x += this.lookY + 0.06 * this.noticeK;
        R("chest").y += this.lookX * 0.3; R("hips").y += Math.sin(t * 0.2) * 0.025;
        // every sixteen seconds, something slow and unfriendly: it leans in, cocks its head, or flexes a claw
        const tau = (t + 9) % 16, w = smoothstep(0, 1.8, tau) * (1 - smoothstep(3.6, 5.4, tau)), which = Math.floor((t + 9) / 16) % 3;
        if (which === 0) {
          this.menace = w; R("hips").x += 0.07 * w; R("chest").x += 0.13 * w; R("head").x -= 0.12 * w;
          if (w > 0.05 && !this.growled) { this.growled = true; Sound.sfx("bossgrowl"); } // (a low growl as it leans in)
        } else {
          this.growled = false;
          if (which === 1) { R("head").z += 0.3 * w; R("head").y -= 0.12 * w; R("chest").z += 0.04 * w; }
          else { R("armR").x -= 0.55 * w; R("armR").z += 0.1 * w; R("foreR").x -= 0.85 * w; R("handR").x -= 0.35 * w; }
        }
        // servo twitches: every few seconds one joint jerks a little and settles (on its own dice)
        if ((this.twT -= dt) <= 0) {
          this.twT = 2.2 + 3.4 * this.lcg();
          this.twJ = ["handL", "handR", "foreL", "foreR", "head", "pylonL", "pylonR", "padL", "padR"][Math.floor(this.lcg() * 9)];
          this.twA = (this.lcg() - 0.5) * 0.1;
          this.twK = 1;
        }
        if (this.twK > 0) {
          this.twK = Math.max(0, this.twK - dt * 2);
          const u = 1 - this.twK, o = this.twA * (u < 0.15 ? u / 0.15 : Math.pow(1 - (u - 0.15) / 0.85, 2));
          R(this.twJ).x += o; R(this.twJ).z += o * 0.5;
        }
      }
    }
    const hips = this.J.hips.grp;
    hips.position.copy(this.hipRest);
    this.root.updateMatrixWorld(true);
    let lx = 0, lz = 0, low = 1e9;
    ["L", "R"].forEach((sd) => {
      const a = this.root.worldToLocal(this._v.setFromMatrixPosition(this.J["foot" + sd].grp.matrixWorld)), rest = this.J["foot" + sd].pivot;
      lx += (rest[0] - a.x) / 2; lz += (rest[2] - a.z) / 2;
      low = Math.min(low, a.y - rest[1]);
      const kn = this.root.worldToLocal(this._w.setFromMatrixPosition(this.J["shin" + sd].grp.matrixWorld));
      low = Math.min(low, kn.y - 0.058);
    });
    hips.position.x += lx; hips.position.z += lz; hips.position.y -= low;
    this.root.updateMatrixWorld(true);
  }
  // ---- the end of the exam -------------------------------------------------------
  // passed: it dies. Failed: it comes for the camera. done() shows the results
  // (now, if the sequence is skipped). score is only used to show how hard it was hit.
  finale(passed, score, done) {
    this.done = done;
    this.passed = passed;
    this.ct = 0;
    this.quick = REDUCED_MOTION;
    this.soft = GFX.calm || REDUCED_MOTION;
    this.mode = passed ? "die" : "rage";
    this.menace = 0;
    this.lightTo = 1;
    const g = this.g, cheap = GFX.ok && GFX.Q[GFX.qi].cheap;
    Sound.dread(false);
    this.joints.forEach((j) => {
      const open = j.name === "head" ? this.boneOpen : this.matOpen;
      j.mesh.userData.fullMat = cheap ? open : null;
      j.mesh.material = cheap ? GFX.twinOf(open) : open;
    });
    g.setBand(null);
    g.scene.userData.post.vignette = 1.3; // (the dark that closed in during the exam opens up for the ending)
    g.scene.userData.mirrorOff = false; // (and the floor, out of sight until now, reflects again)
    this.camP.copy(g.camera.position); this.camL.copy(g.lookAt);
    if (g.el) {
      g.el.classList.add("cine");
      this.ui = UI.el(`<div class="exam-cine"><i class="bar top"></i><i class="bar bot"></i>
        <div class="bossbar"><b>FINAL BOSS</b><span><i data-hp></i></span></div>
        <button class="btn ghost skip" data-act="skipcine">SKIP ${icon("right")}</button></div>`);
      g.el.appendChild(this.ui);
      requestAnimationFrame(() => { if (this.ui) this.ui.classList.add("on"); });
    }
    if (passed) {
      UI.banner("EXAM PASSED", COLORS.lime, "THE FINAL BOSS IS FAILING");
      Sound.sfx("bossdown");
      this.pose = this.quick ? BOSS_POSE.down : BOSS_POSE.struck;
      this.hp(this.quick ? 0 : 88);
      if (!this.soft) { g.shake(0.25); GFX.pulse(5, 0.05); }
    } else {
      UI.banner("NOT YET", COLORS.red, "IT STILL STANDS · 60% BRINGS IT DOWN");
      this.pose = this.quick ? BOSS_POSE.glare : BOSS_POSE.roar;
      this.eyeTo = 2.6;
      this.hp(100 - Math.round(clamp(score / 60, 0, 1) * 85)); // what the answers took off it: not enough
      if (this.quick) Sound.sfx("bossgrowl");
    }
  }
  // the bar over the ending: how much of it is left
  hp(pc) { const el = this.ui && this.ui.querySelector("[data-hp]"); if (el) el.style.transform = `scaleX(${clamp(pc, 0, 100) / 100})`; }
  skip() { if (this.done && this.ct > 0.5) this.finish(); }
  finish() {
    if (this.finished) return;
    this.finished = true;
    const g = this.g;
    if (g.scene.userData.post) g.scene.userData.post.rays = null;
    if (this.passed && !this.blown) this.detonate(true); // skipped before the blast: the wreck is still there behind the results
    if (this.passed && !this.cheered) { this.cheered = true; Sound.sfx("win"); }
    if (this.done) this.done();
  }
  // one joint fails: a burst of sparks, a gout of fire, and from then on it smokes
  pop(joint, sever) {
    const g = this.g, K = BOSS_K, j = this.J[joint], p = j.grp.getWorldPosition(new THREE.Vector3()), n = this.soft ? 0.5 : 1;
    g.bursts.burst(p, COLORS.orange, { n: Math.round(34 * n), speed: 9 * K, size: 0.26 * K, life: 0.9, gravity: -16 * K });
    g.bursts.burst(p, 0xffffff, { n: Math.round(12 * n), speed: 5 * K, size: 0.2 * K, life: 0.4 });
    this.puffs.emit(2, p, this._v.set(0, 0, 0), 1.2 * K, 3.4 * K, 0.3);
    this.puffs.emit(0, p, this._v.set(rand(-0.6, 0.6), 1.6, rand(-0.3, 0.6)).multiplyScalar(K), 0.7 * K, 2.3 * K, 0.9, 1.5 * K);
    this.smokers.push(j);
    this.fire = Math.max(this.fire, 0.5);
    this.firePos.copy(p);
    Sound.sfx("bosspop", clamp(p.x / 4, -1, 1));
    if (!this.soft) { g.shake(0.16); GFX.pulse(3, 0); }
    if (sever) this.sever(sever, this._v.set(Math.sign(p.x || 1) * rand(2.5, 4.5), rand(5, 7.5), rand(1, 3.5)).multiplyScalar(K));
  }
  // a part breaks away and falls as its own body
  sever(joint, vel) {
    const j = this.J[joint];
    if (!j.on) return;
    j.on = false;
    const m = j.mesh;
    m.updateMatrixWorld(true);
    m.matrixWorld.decompose(this._w, this._q, this._s);
    j.grp.remove(m);
    m.position.copy(this._w); m.quaternion.copy(this._q); m.scale.copy(this._s);
    this.g.scene.add(m);
    if (joint === "head") this.eyes.forEach((e) => { e.gl.visible = e.streak.visible = false; });
    this.bodies.push({ m, v: vel.clone(), w: new THREE.Vector3(rand(-5, 5), rand(-3, 3), rand(-5, 5)), r: (m.geometry.boundingSphere.radius || 0.1) * BOSS_S * 0.55, still: false });
  }
  // The blast. Everything still attached becomes wreckage: each fragment gets a way
  // out from the reactor, a spin, and the moment it will meet the floor.
  detonate(quiet) {
    if (this.blown) return;
    this.blown = true;
    const g = this.g, K = BOSS_K, P = BossModel.parts(), core = this.root.worldToLocal(this.core(new THREE.Vector3())), inv = this._m.copy(this.root.matrixWorld).invert();
    const live = this.joints.filter((j) => j.on && j.name !== "head");
    let tris = 0, nChunk = 0;
    live.forEach((j) => j.ids.forEach((id) => { tris += P.get(id).ix.length / 3; nChunk += P.get(id).nChunk; }));
    const pos = new Float32Array(tris * 9), nor = new Float32Array(tris * 9), uv = new Float32Array(tris * 6), cid = new Uint16Array(tris);
    const cc = new Float32Array(nChunk * 3), cn = new Uint16Array(nChunk);
    const M = new THREE.Matrix4(), v = this._v, n3 = new THREE.Matrix3();
    let ti = 0, cb = 0;
    live.forEach((j) => {
      M.multiplyMatrices(inv, j.grp.matrixWorld);
      n3.setFromMatrix4(M);
      j.ids.forEach((id) => {
        const p = P.get(id);
        for (let t = 0; t < p.ix.length / 3; t++, ti++) {
          const c = (cid[ti] = cb + p.chunk[t]);
          for (let e = 0; e < 3; e++) {
            const i = p.ix[t * 3 + e];
            v.set(p.pos[i * 3] - j.pivot[0], p.pos[i * 3 + 1] - j.pivot[1], p.pos[i * 3 + 2] - j.pivot[2]).applyMatrix4(M);
            pos[ti * 9 + e * 3] = v.x; pos[ti * 9 + e * 3 + 1] = v.y; pos[ti * 9 + e * 3 + 2] = v.z;
            cc[c * 3] += v.x; cc[c * 3 + 1] += v.y; cc[c * 3 + 2] += v.z;
            v.set(p.nor[i * 3], p.nor[i * 3 + 1], p.nor[i * 3 + 2]).applyMatrix3(n3).normalize();
            nor[ti * 9 + e * 3] = v.x; nor[ti * 9 + e * 3 + 1] = v.y; nor[ti * 9 + e * 3 + 2] = v.z;
            uv[ti * 6 + e * 2] = p.uv[i * 2]; uv[ti * 6 + e * 2 + 1] = p.uv[i * 2 + 1];
          }
          cn[c] += 3;
        }
        cb += p.nChunk;
      });
      j.grp.visible = false;
      j.mesh.visible = false;
    });
    const cv = new Float32Array(nChunk * 3), cr = new Float32Array(nChunk * 4), ck = new Float32Array(nChunk * 2), daisR = BOSS_DAIS_R / BOSS_S, drop = BOSS_DAIS / BOSS_S;
    for (let c = 0; c < nChunk; c++) {
      const n = cn[c] || 1, x = (cc[c * 3] /= n), y = (cc[c * 3 + 1] /= n), z = (cc[c * 3 + 2] /= n);
      v.set(x - core.x, y - core.y + 0.1, z - core.z);
      if (v.lengthSq() < 1e-6) v.set(0, 1, 0);
      v.normalize().add(this._w.set(rand(-0.4, 0.4), rand(-0.1, 0.5), rand(-0.4, 0.4))).normalize();
      const sp = (quiet ? 0.5 : 1) * (1.1 + 3.4 * Math.pow(Math.random(), 1.6));
      const vx = v.x * sp, vy = v.y * sp + 0.7 + Math.random() * 0.9, vz = v.z * sp + 0.25; // (a little toward the hall, where it can be seen)
      cv[c * 3] = vx; cv[c * 3 + 1] = vy; cv[c * 3 + 2] = vz;
      this._w.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      cr[c * 4] = this._w.x; cr[c * 4 + 1] = this._w.y; cr[c * 4 + 2] = this._w.z; cr[c * 4 + 3] = rand(2, 9) * (Math.random() < 0.5 ? -1 : 1);
      // when it meets the floor: the dais if it lands on it, the hall floor beyond
      const hit = (fy) => (vy + Math.sqrt(Math.max(0, vy * vy + 2 * BOSS_G * (y - fy)))) / BOSS_G;
      let th = hit(0.018);
      if (Math.hypot(x + vx * th, z + vz * th) > daisR) th = hit(0.018 - drop);
      ck[c * 2] = th; ck[c * 2 + 1] = Math.random();
    }
    const aC = new Float32Array(tris * 9), aV = new Float32Array(tris * 9), aR = new Float32Array(tris * 12), aK = new Float32Array(tris * 6);
    for (let t = 0; t < tris; t++) {
      const c = cid[t];
      for (let e = 0; e < 3; e++) {
        const o = t * 3 + e;
        aC[o * 3] = cc[c * 3]; aC[o * 3 + 1] = cc[c * 3 + 1]; aC[o * 3 + 2] = cc[c * 3 + 2];
        aV[o * 3] = cv[c * 3]; aV[o * 3 + 1] = cv[c * 3 + 1]; aV[o * 3 + 2] = cv[c * 3 + 2];
        aR[o * 4] = cr[c * 4]; aR[o * 4 + 1] = cr[c * 4 + 1]; aR[o * 4 + 2] = cr[c * 4 + 2]; aR[o * 4 + 3] = cr[c * 4 + 3];
        aK[o * 2] = ck[c * 2]; aK[o * 2 + 1] = ck[c * 2 + 1];
      }
    }
    const geo = new THREE.BufferGeometry();
    [["position", pos, 3], ["normal", nor, 3], ["uv", uv, 2], ["aC", aC, 3], ["aV", aV, 3], ["aR", aR, 4], ["aK", aK, 2]].forEach(([name, arr, n]) => geo.setAttribute(name, new THREE.BufferAttribute(arr, n)));
    this.wreck.geometry.dispose();
    this.wreck.geometry = geo;
    this.wreck.visible = true;
    this.blastMat.uniforms.uCore.value.copy(core);
    this.blastT = quiet ? 3 : 0;
    this.coreGlow.visible = false;
    this.eyes.forEach((e) => { e.gl.visible = e.streak.visible = false; });
    this.eyeMat.color.setScalar(0.02);
    this.eyeU.value.setScalar(0);
    this.eyeTo = 0; this.eyeK = 0;
    this.rim.value.setScalar(0);
    const at = this.core(new THREE.Vector3());
    this.blastAt = at;
    this.scorch.visible = true;
    this.hp(0);
    // the head is thrown clear in one piece, toward the camera, and rolls to a stop
    this.sever("head", this._v.set(rand(-0.5, 0.5), quiet ? 3 : 9.5, quiet ? 2 : 4.4).multiplyScalar(K));
    this.headBody = this.bodies[this.bodies.length - 1];
    this.bodies.forEach((b) => { if (b !== this.headBody) { b.still = false; b.v.set(rand(-9, 9), rand(4, 9), rand(0, 8)).multiplyScalar(quiet ? 0.2 * K : K); } });
    if (quiet) return;
    const k = this.soft ? 0.5 : 1;
    g.bursts.burst(at, 0xffffff, { n: Math.round(110 * k), speed: 34 * K, size: 0.4 * K, life: 0.8, gravity: -6 * K });
    g.bursts.burst(at, COLORS.orange, { n: Math.round(170 * k), speed: 20 * K, size: 0.42 * K, life: 1.6, gravity: -14 * K });
    g.bursts.burst(at, COLORS.yellow, { n: Math.round(70 * k), speed: 6 * K, size: 0.3 * K, life: 2.6, gravity: 1.5 * K });
    this.puffs.emit(2, at, v.set(0, 0, 0), 4 * K, 15 * K, 0.28);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * 6.283 + rand(0.5), r = i < 3 ? 0 : 1;
      this.puffs.emit(0, this._w.copy(at).add(v.set(Math.cos(a) * r * 1.2, rand(-0.6, 1.2), Math.sin(a) * r * 0.8 + 0.6).multiplyScalar(K)), v.set(Math.cos(a) * r * 5.5, rand(2, 6), Math.sin(a) * r * 3 + 1.5).multiplyScalar(K), 3.2 * K, (8.5 + rand(3)) * K, 1.5 + rand(0.7), 2.4 * K);
    }
    // smoke that climbs out of the fireball, and a low wave of dust across the floor
    for (let i = 0; i < 6; i++) this.puffs.emit(1, this._w.copy(at).add(v.set(rand(-1.5, 1.5), rand(0, 1.5), rand(-0.8, 1)).multiplyScalar(K)), v.set(rand(-1, 1), rand(3, 5.5), rand(-0.5, 0.8)).multiplyScalar(K), 3.5 * K, (10 + rand(3)) * K, 2.6 + rand(1), 1.6 * K);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      this.puffs.emit(1, this._w.set(at.x + Math.cos(a) * 2.2 * K, BOSS_DAIS + 0.5 * K, at.z + Math.sin(a) * 2.2 * K), v.set(Math.cos(a) * 11 * K, 0.5 * K, Math.sin(a) * 11 * K), 1.6 * K, 4.6 * K, 1.1, 0.3 * K, 0.12);
    }
    g.shockwave(at.clone(), neon(0xffe2b0, 2.4), 30 * K, 0.7);
    g.tw.wait(0.14, () => g.shockwave(at.clone(), neon(0xff8a3a, 1.6), 44 * K, 1.0));
    this.ringT = 0;
    this.ring.visible = true;
    this.streamers.forEach((st, i) => {
      const a = (i / this.streamers.length) * 6.283 + rand(0.6);
      st.on = true; st.t = 0;
      st.p.copy(at);
      st.v.set(Math.cos(a) * rand(9, 17), rand(11, 21), Math.sin(a) * rand(4, 10) + 3).multiplyScalar(K);
      st.tr.pts = [];
      st.tr.mesh.visible = st.head.visible = true;
    });
    this.cook = [0.5, 1.05]; // two more charges go off in the wreck
    this.fire = 1.8;
    this.firePos.copy(at);
    Sound.sfx("bossblast");
    if (!this.soft) { g.shake(1.1); GFX.pulse(14, 0.2); GFX.hitStop(140); }
    Haptics.buzz([80, 40, 160]);
  }
  update(dt, t) {
    const g = this.g, K = BOSS_K, u = this.blastMat.uniforms;
    // the exam itself: it wakes once, then looms. dread follows how much of the exam is answered.
    this.dread += (this.dreadTo - this.dread) * Math.min(1, dt * 0.7);
    this.noticeK = Math.max(0, this.noticeK - dt * 1.6);
    this.lightK += (this.lightTo - this.lightK) * Math.min(1, dt * 1.4);
    if (this.mode === "wake" && this.waking) {
      const w = (this.wt += dt);
      if (w > 0.55 && !this.lit) { this.lit = true; this.eyeTo = 1.5; Sound.sfx("bosswake"); }
      if (w > 1.0) { this.pose = BOSS_POSE.idle; this.lightTo = 1; }
      if (w > 2.35 && !this.stood) {
        this.stood = true;
        this.eyeTo = 1;
        Sound.sfx("bossroar");
        if (!GFX.calm) g.shake(0.3);
        g.bursts.burst(this._v.set(0, BOSS_DAIS + 0.2, 0.2 * BOSS_S), 0xbfb3ff, { n: 30, speed: 5 * K, size: 0.3 * K, life: 0.9 });
        Haptics.buzz(40);
      }
      if (w > 3.1) { this.mode = "idle"; Sound.dread(true); }
    }
    this.eyeK += (this.eyeTo - this.eyeK) * Math.min(1, dt * 3);
    let eye = this.eyeK * (0.85 + 0.15 * Math.sin(t * 1.1)) * (1 + 0.35 * this.dread + 0.4 * this.menace + 0.5 * this.noticeK);
    if (this.mode === "die" && !this.quick) this.dying(dt, t);
    else if (this.mode === "rage" && !this.quick) this.raging(dt);
    else if (this.mode === "die" || this.mode === "rage") {
      this.ct += dt;
      if (this.mode === "die") this.eyeTo = 0;
      if (this.ct > (this.mode === "die" ? 1.7 : 1.3)) this.finish();
    }
    if (this.mode === "die" && !this.quick && !this.blown) eye = this.eyeDie;
    if (!this.blown) this.settle(dt);
    if (!this.blown) {
      this.eyeMat.color.copy(this.eyeBase).multiplyScalar(eye);
      this.eyes.forEach((e) => {
        e.gl.material.opacity = clamp(eye * 0.85, 0, 1); e.gl.scale.setScalar(0.07 * (0.8 + 0.3 * eye));
        e.streak.material.opacity = clamp(eye * 0.5, 0, 0.85); e.streak.scale.set(0.19 * (0.7 + 0.4 * eye), 0.011, 1);
      });
      this.eyeU.value.set(0.5, 0.3, 1.0).multiplyScalar(0.62 * eye * this.lightK);
      // the light under it beats, slowly, like something alive
      const live = this.mode === "idle" || this.mode === "wake" || this.mode === "rage";
      // an ember in its chest, beating with that light
      if (this.mode !== "die") {
        const k = live ? (0.3 + 0.12 * Math.sin(t * 3.1) + 0.06 * this.dread + 0.12 * this.menace) * this.lightK : 0;
        this.coreGlow.material.color.copy(this.coreEmber); this.coreGlow.material.opacity = k; this.coreGlow.scale.setScalar(0.3 + 0.24 * k);
      }
      if (this.mode !== "die") {
        this.under.color.copy(this.underCold).lerp(this.underHot, this.mode === "rage" ? 1 : clamp(0.08 + 0.3 * this.dread + 0.22 * this.menace, 0, 0.6));
        this.under.intensity = (live ? (0.62 + 0.14 * this.dread + 0.2 * this.menace) * (0.88 + 0.12 * Math.sin(t * 3.1)) : 0.3) * this.lightK * (this.mode === "rage" ? 3 : 1);
      }
      this.rim.value.setRGB(0.55, 0.26, 0.03).multiplyScalar((0.1 + 0.18 * this.dread + 0.3 * this.menace + (this.mode === "rage" ? 0.9 : 0)) * this.lightK);
      // Its seams and small lights. Off until it wakes, then lit from the feet up; violet at first,
      // rose-gold as the exam goes on (how far along it is, never which answers were right), bright gold in a rage.
      const U = this.U, rage = this.mode === "rage" ? 1 : 0, dying = this.mode === "die";
      NEON_T.value = t;
      U.uBossRimK.value = 0.42 * this.lightK;
      U.uBossSeam.value.copy(this.seamCold).lerp(this.seamHot, clamp(this.dread * 0.9 + this.menace * 0.4, 0, 1)).lerp(this.seamRage, rage);
      const lit = this.mode !== "wake" || this.wt > 1.0;
      U.uBossPower.value += ((lit ? 0.7 + 0.3 * this.dread + 0.3 * this.menace + 0.9 * rage : 0) - U.uBossPower.value) * Math.min(1, dt * 3);
      U.uBossSweep.value = this.mode === "wake" ? BOSS_DAIS + smoothstep(1.0, 2.6, this.wt) * (BOSS_S * 1.1 + 1.4) : 100;
      // destroyed: the lights stutter (a change at most 2.6 times a second, and never fully out) and the panel lines open
      if (dying && !this.soft) {
        if ((this.flickT -= dt) <= 0) { this.flickT = 0.38; this.flick = this.lcg() < 0.55 ? 0.35 : 1; }
      } else this.flick = 1;
      U.uBossDim.value += (this.flick - U.uBossDim.value) * Math.min(1, dt * 14);
      U.uBossCrack.value += ((dying ? clamp(this.popI / 5, 0, 1) * 0.45 + this.heat * 0.9 : 0) - U.uBossCrack.value) * Math.min(1, dt * 4);
      // vapour vents off its back, more of it as the end comes nearer
      this.vapT -= dt;
      if (this.vapT < 0 && this.mode === "idle") {
        this.vapT = 0.55 - 0.25 * this.dread;
        const sd = Math.random() < 0.5 ? -1 : 1, p = this.at(sd < 0 ? "pylonL" : "pylonR", sd * 0.14, 0.99, -0.14, this._v);
        this.puffs.emit(3, p, this._w.set(rand(-0.2, 0.2), 1.0, -0.25).multiplyScalar(K), 0.7 * K, 2.8 * K, 3.2, 0.3 * K, 0.5);
      }
    }
    this.mat.emissive.copy(this.heatCol).multiplyScalar(this.heat * 0.55);
    { // (the plain version follows the hall's light, runs red in a rage and hot as it burns)
      const k = 0.12 + 0.88 * this.lightK, rg = this.mode === "rage" ? 1 : 0;
      this.lowTint.value.setRGB(k * (1 + 0.6 * rg + 1.6 * this.heat), k * (1 - 0.25 * rg + 0.5 * this.heat), k * (1 - 0.3 * rg));
    }
    // fire light, falling away
    this.fire *= Math.pow(0.12, dt);
    if (this.mode === "die") {
      const ul = this.under;
      ul.position.copy(this.firePos); ul.color.setHex(0xff8a3a); ul.distance = 60 * K; ul.decay = 1.6;
      ul.intensity = this.fire * 9;
    }
    u.uFire.value = this.fire;
    this.puffs.mat.uniforms.uGlow.value = Math.min(1, this.fire);
    this.puffs.mat.uniforms.uDetail.value = GFX.ok && GFX.Q[GFX.qi].cheap ? 0 : 1;
    // smoke from every joint that has failed
    this.smokeT -= dt;
    if (this.smokeT < 0 && this.smokers.length && !this.blown) {
      this.smokeT = 0.16;
      const j = pick(this.smokers);
      if (j.on) this.puffs.emit(1, j.grp.getWorldPosition(this._v), this._w.set(rand(-0.3, 0.3), 1.1, rand(-0.2, 0.3)).multiplyScalar(K), 0.7 * K, 2.6 * K, 1.7, 0.9 * K);
    }
    // thrown pieces: fall, bounce, roll, lie still
    this.bodies.forEach((b) => {
      if (b.still) return;
      const m = b.m, floor = (Math.hypot(m.position.x, m.position.z) < BOSS_DAIS_R ? BOSS_DAIS : 0) + b.r;
      b.v.y -= 26 * K * dt;
      m.position.addScaledVector(b.v, dt);
      m.rotateOnWorldAxis(this._w.copy(b.w).normalize(), b.w.length() * dt);
      if (m.position.y < floor) {
        m.position.y = floor;
        if (Math.abs(b.v.y) > 2.2 * K) g.bursts.burst(m.position, COLORS.orange, { n: 8, speed: 3 * K, size: 0.2 * K, life: 0.5 });
        b.v.y = Math.abs(b.v.y) * 0.3; b.v.x *= 0.62; b.v.z *= 0.62; b.w.multiplyScalar(0.55);
        if (b.v.length() < 0.9 * K) b.still = true;
      }
    });
    if (this.blown) {
      this.blastT += dt;
      u.uT.value = this.blastT;
      const post = g.scene.userData.post; // the blast's own rays, gone in half a second
      if (post && post.rays) { post.rays.strength = Math.max(0, 1.0 - this.blastT * 2.2); if (post.rays.strength <= 0) post.rays = null; }
      if (this.cook && this.cook.length && this.blastT >= this.cook[0]) {
        this.cook.shift();
        const p = this._v.copy(this.blastAt).add(this._w.set(rand(-2.6, 2.6), rand(-1.6, -0.4), rand(-0.6, 2.4)).multiplyScalar(K));
        g.bursts.burst(p, COLORS.orange, { n: this.soft ? 22 : 46, speed: 12 * K, size: 0.3 * K, life: 1.0, gravity: -14 * K });
        this.puffs.emit(2, p, this._w.set(0, 0, 0), 1.5 * K, 5 * K, 0.25);
        this.puffs.emit(0, p, this._w.set(rand(-1, 1), 3, rand(-0.5, 1)).multiplyScalar(K), 1.4 * K, 4.4 * K, 1.2, 2.2 * K);
        this.fire = Math.max(this.fire, 0.9);
        this.firePos.copy(p);
        Sound.sfx("bosspop", clamp(p.x / 4, -1, 1));
        if (!this.soft) g.shake(0.3);
      }
      const sm = this.scorch.material.uniforms;
      sm.uK.value = Math.min(1, this.blastT * 3);
      sm.uHot.value = Math.exp(-this.blastT * 0.45);
      if (this.ring.visible) {
        this.ringT += dt / 0.9;
        const k = Math.min(1, this.ringT);
        this.ring.scale.setScalar((2 + 30 * (1 - (1 - k) * (1 - k))) * K);
        this.ring.material.color.setRGB(2.6 * (1 - k), 1.5 * (1 - k), 0.7 * (1 - k));
        this.ring.material.opacity = 1;
        this.ring.visible = k < 1;
      }
      this.streamers.forEach((st) => {
        if (!st.on) return;
        st.t += dt;
        st.v.y -= 22 * K * dt;
        st.p.addScaledVector(st.v, dt);
        st.tr.push(st.p);
        st.head.position.copy(st.p);
        const fade = clamp(1.6 - st.t, 0, 1);
        st.head.material.opacity = fade;
        st.tr.mesh.material.uniforms.uColor.value.setRGB(2.4 * fade, 1.0 * fade, 0.3 * fade);
        if (st.p.y < 0.1 || st.t > 1.7) { st.on = false; st.tr.mesh.visible = st.head.visible = false; }
      });
      // what is left burns down and smokes
      if (this.blastT < 4.5 && this.smokeT < 0) {
        this.smokeT = 0.13;
        const p = this._v.copy(this.blastAt).setY(BOSS_DAIS + 0.5 * K);
        p.x += rand(-2.2, 2.2) * K; p.z += rand(-1.2, 2.4) * K;
        if (this.blastT < 2.6 && Math.random() < 0.6) this.puffs.emit(0, p, this._w.set(rand(-0.3, 0.3), 2.2, 0).multiplyScalar(K), 0.9 * K, 2.6 * K, 1.0, 2.2 * K);
        else this.puffs.emit(1, p, this._w.set(rand(-0.4, 0.4), 2.4, rand(-0.2, 0.2)).multiplyScalar(K), 1.6 * K, 5.5 * K, 2.6, 1.4 * K);
        this.fire = Math.max(this.fire, 0.22 * Math.exp(-this.blastT * 0.5));
      }
    }
    this.puffs.update(dt, g.camera, t);
    if (this.passed && this.blown && !this.finished && !this.cheered && this.blastT > 1.3) {
      this.cheered = true;
      UI.banner("FINAL BOSS DESTROYED", COLORS.yellow, "THE EXAM IS YOURS");
      Sound.sfx("win");
    }
  }
  // The death, beat by beat.
  dying(dt, t) {
    const g = this.g, K = BOSS_K, ct = (this.ct += dt), post = g.scene.userData.post;
    const POPS = [[0.95, "armR", "padR"], [1.5, "foreR", null], [2.05, "legL", null], [2.6, "chest", "pylonL"], [3.1, "head", null]];
    if (this.blown) { if (ct > 9.4) this.finish(); return; }
    this.stiff = 7;
    while (this.popI < POPS.length && ct >= POPS[this.popI][0]) { const p = POPS[this.popI++]; this.pop(p[1], p[2]); this.hp(88 - this.popI * 15); }
    if (ct < 0.5) { this.pose = BOSS_POSE.struck; this.tremor = 0.5; this.eyeDie = 1.8; }
    else if (ct < 3.45) {
      this.pose = ct < 1.6 ? BOSS_POSE.stagger : BOSS_POSE.limp;
      this.tremor = 0.35;
      this.eyeDie = 0.75 + 0.55 * Math.sin(ct * 11); // a failing flicker, under 2 Hz
    } else if (ct < 4.5) {
      if (this.pose !== BOSS_POSE.kneel) { this.pose = BOSS_POSE.kneel; Sound.sfx("bossfall"); this.hp(6); }
      this.tremor = 0.18;
      this.eyeDie = 0.3;
      this.heat = Math.min(0.12, this.heat + dt * 0.2);
      if (!this.thud && ct > 3.85) { this.thud = true; if (!this.soft) g.shake(0.4); g.bursts.burst(this._v.set(0, BOSS_DAIS + 0.2, 1.4 * K), 0xbfb3ff, { n: 26, speed: 5 * K, size: 0.3 * K, life: 0.8 }); }
    } else if (ct < 5.6) {
      // the reactor runs away: the armour glows, light pours out of it, it throws its head back
      if (this.pose !== BOSS_POSE.overload) { this.pose = BOSS_POSE.overload; Sound.sfx("bosscharge"); this.hp(0); }
      const k = clamp((ct - 4.5) / 0.85, 0, 1), hold = ct > 5.35;
      this.tremor = hold ? 0 : 0.3 + 0.9 * k;
      this.heat = 0.12 + 0.88 * k * k;
      this.eyeDie = 1 + 2.2 * k;
      this.coreGlow.material.color.copy(this.coreHot);
      this.coreGlow.material.opacity = k;
      this.coreGlow.scale.setScalar(0.5 + 1.5 * k * k);
      this.fire = Math.max(this.fire, 0.45 * k);
      this.firePos.copy(this.core(this._v));
      if (post && !this.soft) post.rays = { pos: this.firePos, strength: 0.75 * k, radius: 0.45 };
      if (!hold && !this.soft) g.shake(0.05 + 0.1 * k);
    } else this.detonate(false);
  }
  // A fail: it roars, takes back what little was knocked off it, and comes down on the camera.
  raging(dt) {
    const g = this.g, K = BOSS_K, ct = (this.ct += dt);
    if (ct < 0.9) {
      this.pose = BOSS_POSE.roar; this.stiff = 6; this.tremor = 0.3; this.eyeTo = 3;
      if (!this.roared && ct > 0.15) { this.roared = true; Sound.sfx("bossroar"); if (!this.soft) g.shake(0.35); this.hp(100); }
    } else if (ct < 1.4) { this.pose = BOSS_POSE.windup; this.stiff = 9; this.tremor = 0; }
    else if (ct < 1.85) {
      this.pose = BOSS_POSE.smash; this.stiff = 17;
      if (!this.struck && ct > 1.56) {
        this.struck = true;
        const p = this.at("handR", 0.36, 0.3, 0.14, this._v);
        g.bursts.burst(p, COLORS.red, { n: this.soft ? 20 : 44, speed: 12 * K, size: 0.34 * K, life: 0.8, gravity: -10 * K });
        g.bursts.burst(p, 0xbfb3ff, { n: 24, speed: 6 * K, size: 0.3 * K, life: 0.9 });
        g.shockwave(p.clone(), neon(0xffb040, 2), 18 * K, 0.5);
        Sound.sfx("bosssmash");
        if (!this.soft) { UI.flash("hit"); g.shake(1.0); GFX.pulse(10, 0.1); GFX.hitStop(90); }
        Haptics.buzz([70, 30, 120]);
      }
    } else { this.pose = BOSS_POSE.glare; this.stiff = 4; this.tremor = 0.06; this.eyeTo = 2.6; }
    if (ct > 3.6) this.finish();
  }
  // Where the camera stands through the ending (the exam's own framing until then).
  camera(dt) {
    const g = this.g, K = BOSS_K, ct = this.ct, fit = Math.max(1, 0.56 / g.camera.aspect), b = this.blown ? this.blastT : -1;
    const KEYS = this.mode === "rage"
      ? [[0, 0.3, 2.3, 10.5, 0, 4.4, 0], [0.9, -0.6, 2.0, 11.4, 0, 4.3, 0], [1.6, 0.0, 2.7, 8.4, 0, 4.5, 1.2], [3.6, 0.0, 3.6, 4.9, 0, 4.75, 1.9]]
      : [[0, 2.4, 2.4, 11.8, 0, 3.7, 0], [3.2, -1.8, 2.2, 11.2, 0, 3.5, 0], [4.4, -1.0, 1.7, 9.6, 0, 2.6, 0.9], [5.55, 0.3, 2.0, 12.6, 0, 2.8, 0.6], [5.9, 0.3, 2.7, 16.5, 0, 3.0, 0], [9.4, 0.7, 1.9, 13.6, 0, 1.2, 2.2]];
    let i = 0;
    while (i < KEYS.length - 2 && ct > KEYS[i + 1][0]) i++;
    const a = KEYS[i], c = KEYS[Math.min(i + 1, KEYS.length - 1)], k = smoothstep(a[0], c[0] || 1, ct);
    this._v.set(lerp(a[1], c[1], k) * K, lerp(a[2], c[2], k) * K, lerp(a[3], c[3], k) * K * (this.mode === "rage" ? lerp(fit, 1, smoothstep(0.9, 1.6, ct)) : fit));
    this._w.set(lerp(a[4], c[4], k) * K, lerp(a[5], c[5], k) * K, lerp(a[6], c[6], k) * K);
    if (b > 1.3 && this.headBody) this._w.lerp(this.headBody.m.position, 0.55 * smoothstep(1.3, 2.6, b)); // the last shot finds the skull
    const e = 1 - Math.exp(-dt * (b >= 0 && b < 0.5 ? 9 : this.mode === "rage" && ct > 1.4 ? 5 : 2.6));
    this.camP.lerp(this._v, e); this.camL.lerp(this._w, e);
    g.camBase.copy(this.camP); g.lookAt.copy(this.camL);
  }
}

if (typeof requestIdleCallback === "function") requestIdleCallback(() => BossModel.preload(), { timeout: 5000 });
else setTimeout(() => BossModel.preload(), 2500);
