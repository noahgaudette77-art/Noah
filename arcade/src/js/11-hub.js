// The arcade floor at night. Six glossy cabinets stand on an arc of polished
// tiles that mirror the neon, each under a cone of light with dust drifting in
// it; a blacklight carpet, a row of attract-mode machines along the wall, neon
// signs, boss posters and the Hall of Fame fill the room around them.
// The camera turns to face the selected cabinet; its screen plays a tiny demo.
const HUB_R = 9;
const HUB_STEP = 0.42; // radians between cabinets
const HUB_WALL = 19; // radius of the round room
const HUB_CEIL = 9.6; // ceiling height
const HUB_BG_R = 16.6; // the row of background machines along the wall
const HUB_TILE_R = 11.3; // polished tiles inside this radius, carpet outside
// Light groups. A lamp switches HubScene.on[g]; update() turns that into the
// levels every neon shader reads. Cabinet i is group HUB_G.cab + i.
const HUB_G = { tube: 0, ring: 1, sign: 4, signC: 5, board: 6, signs: 7, bg: 8, cab: 9 };
const HUB_NG = 16;
// Side profiles (z toward the player, y up): the painted side panel, the dark
// body set between the panels, and the simpler machines along the wall.
const HUB_SIDE = [[-0.72, 0], [0.7, 0], [0.7, 1.1], [0.98, 1.2], [1, 1.36], [0.46, 1.56], [0.24, 3.08], [0.54, 3.2], [0.58, 3.98], [-0.48, 4.08], [-0.72, 3.72]];
const HUB_BODY = [[-0.7, 0], [0.655, 0], [0.655, 1.11], [0.935, 1.205], [0.955, 1.335], [0.43, 1.53], [0.2, 3.07], [0.5, 3.19], [0.535, 3.95], [-0.47, 4.05], [-0.7, 3.71]];
const HUB_MINI = [[-0.55, 0], [0.5, 0], [0.5, 1], [0.78, 1.1], [0.8, 1.22], [0.36, 1.38], [0.18, 2.68], [0.42, 2.78], [0.45, 3.32], [-0.45, 3.4], [-0.55, 3.1]];
const HUB_PALETTE = ["#35efff", "#ff3ad4", "#ffe14f", "#86ff5e", "#ff9b3d", "#a65fff", "#ff4769"];
const HUB_TITLES = ["STAR FURY", "NOVA RAID", "TURBO 88", "NINJA RUN", "ROBO BRAWL", "NEON DRIFT", "LASER GRID", "PIXEL QUEST", "ASTRO MINER", "THUNDER JET", "GHOST MAZE", "VOID RUNNER", "HYPER BALL", "DRAGON II", "MEGA BLOX", "SKY ACE"];
const HUB_RINGS = [[3.62, "#35efff"], [5.7, "#ff3ad4"], [5.92, "#ff3ad4"]]; // wall neon: height, colour
// Neon signs on the wall: text, colour, angle, width (their atlas row is the index).
const HUB_SIGNS = [["GAME ON", "#35efff", -0.84, 3.6], ["INSERT COIN", "#ff3ad4", 0.84, 4], ["PLAYER 1", "#86ff5e", 1.5, 3.6], ["TOKENS", "#ff9b3d", -2.12, 3.3], ["HIGH SCORE", "#ffe14f", 2.08, 3.7]];
// The room is rebuilt every time the player comes back from a game, so its
// static geometry and artwork are kept for the session (once the pixel font
// has loaded, so nothing is frozen in a fallback font).
const HUB_CACHE = { geo: {}, dust: null, marquee: null, wall: null };
function hubFontsReady() {
  try { return !document.fonts || document.fonts.check('16px "Press Start 2P"'); } catch (e) { return false; }
}

// ---- hub helpers (prefixed so they never clash with other scenes) ------------
function hubM(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
}
// A spot on the edge a→b of a side profile, pushed out along the edge's normal,
// with the tilt (about x) that lays a plane flat on that edge.
function hubFace(a, b, s = 0.5, out = 0) {
  const dz = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dz, dy);
  return { z: a[0] + dz * s + (dy / len) * out, y: a[1] + dy * s - (dz / len) * out, rx: Math.atan2(dz, dy), len };
}
// A side profile extruded along +Z (shape x = cabinet z, shape y = height).
function hubPrism(profile, depth) {
  return new THREE.ExtrudeGeometry(new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y))), { depth, bevelEnabled: false });
}
// A pixel rect of a 1024² canvas as texture coordinates [u0, v0, u1, v1].
const hubUV = (x, y, w, h) => [x / 1024, 1 - (y + h) / 1024, (x + w) / 1024, 1 - y / 1024];
function hubRGB(hex, k = 1, a = 1) {
  const c = new THREE.Color(hex);
  const f = (v) => Math.round(clamp(v * k, 0, 1) * 255);
  return `rgba(${f(c.r)},${f(c.g)},${f(c.b)},${a})`;
}
function hubRoundRect(x, X, Y, W, H, r) {
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + W, Y, X + W, Y + H, r);
  x.arcTo(X + W, Y + H, X, Y + H, r);
  x.arcTo(X, Y + H, X, Y, r);
  x.arcTo(X, Y, X + W, Y, r);
  x.closePath();
}
// Stroke as a neon tube: a soft coloured halo in a few cheap passes (canvas
// shadowBlur is slow), the coloured tube, and its white-hot core.
function hubTubeStroke(x, color, lw, stroke) {
  x.lineJoin = "round";
  x.lineCap = "round";
  x.strokeStyle = color;
  [[3.4, 0.1], [2.2, 0.22], [1, 1]].forEach(([w, a]) => {
    x.globalAlpha = a;
    x.lineWidth = lw * w;
    stroke();
  });
  x.globalAlpha = 1;
  x.strokeStyle = "#ffffff";
  x.lineWidth = lw * 0.36;
  stroke();
}
function hubTube(x, color, lw) { hubTubeStroke(x, color, lw, () => x.stroke()); }
function hubTubeText(x, text, cx, cy, size, color, align = "center") {
  x.font = `${size}px "Press Start 2P", "Courier New", monospace`;
  x.textAlign = align;
  x.textBaseline = "middle";
  hubTubeStroke(x, color, Math.max(3, size * 0.085), () => x.strokeText(text, cx, cy));
}
// A flat piece of a wall-mounted picture q = { ang, y, r, w, h, uv }: the part
// fx0..fx1 across, fy0..fy1 up. Slicing a wide sign keeps it on the curved wall.
function hubWallQuad(K, batch, q, fx0, fx1, fy0, fy1, g, k = 1) {
  const fx = (fx0 + fx1) / 2, fy = (fy0 + fy1) / 2;
  const ang = q.ang + ((fx - 0.5) * q.w) / q.r;
  const u = q.uv;
  K.quad(batch, (fx1 - fx0) * q.w * 1.004, (fy1 - fy0) * q.h, hubM(Math.sin(ang) * q.r, q.y + (fy - 0.5) * q.h, -Math.cos(ang) * q.r, 0, -ang), 0xffffff,
    { k, g, uv: [lerp(u[0], u[2], fx0), lerp(u[1], u[3], fy0), lerp(u[0], u[2], fx1), lerp(u[1], u[3], fy1)] });
}

// Gathers many small pieces into one mesh, so a room full of props costs a
// single draw call. Each vertex keeps its piece's colour (k > 1 is HDR neon),
// its light group and two spare values: metalness/roughness on lit meshes.
// With ao > 0, colours darken toward the floor, which grounds the machines.
// A batch already built this session (HUB_CACHE) skips its pieces entirely.
class HubBatch {
  constructor(key, ao = 0) {
    this.key = key;
    this.ao = ao;
    this.done = HUB_CACHE.geo[key] || null;
    this.p = []; this.n = []; this.c = []; this.u = []; this.x = []; this.g = []; this.i = [];
  }
  // Add geometry placed by matrix m (a template marked hubKeep is reused, any
  // other geometry is consumed).
  add(geo, m, color, { k = 1, aux = [0.1, 0.6], g = 0, uv = null } = {}) {
    if (this.done) {
      if (!geo.userData.hubKeep) geo.dispose();
      return;
    }
    const P = geo.attributes.position.array;
    const N = geo.attributes.normal ? geo.attributes.normal.array : null;
    const U = geo.attributes.uv ? geo.attributes.uv.array : null;
    const I = geo.index ? geo.index.array : null;
    const e = m.elements, ne = new THREE.Matrix3().getNormalMatrix(m).elements;
    const c = new THREE.Color(color).multiplyScalar(k);
    // Each vertex is stored once and the piece's own triangles index it, so the
    // batch keeps the pieces' shared vertices (about half the vertex work here).
    const vc = P.length / 3, base = this.p.length / 3;
    if (I) for (let j = 0; j < I.length; j++) this.i.push(base + I[j]);
    else for (let j = 0; j < vc; j++) this.i.push(base + j);
    for (let i = 0; i < vc; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
      this.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], wy, e[2] * x + e[6] * y + e[10] * z + e[14]);
      if (N) {
        const a = N[i * 3], b = N[i * 3 + 1], d = N[i * 3 + 2];
        const nx = ne[0] * a + ne[3] * b + ne[6] * d, ny = ne[1] * a + ne[4] * b + ne[7] * d, nz = ne[2] * a + ne[5] * b + ne[8] * d;
        const l = Math.hypot(nx, ny, nz) || 1;
        this.n.push(nx / l, ny / l, nz / l);
      } else this.n.push(0, 1, 0);
      const f = 1 - clamp(wy / 1.3, 0, 1), o = 1 - this.ao * f * f;
      this.c.push(c.r * o, c.g * o, c.b * o);
      const u = U ? U[i * 2] : 0, v = U ? U[i * 2 + 1] : 0;
      if (uv) this.u.push(uv[0] + u * (uv[2] - uv[0]), uv[1] + v * (uv[3] - uv[1]));
      else this.u.push(u, v);
      this.x.push(aux[0], aux[1]);
      this.g.push(g);
    }
    if (!geo.userData.hubKeep) geo.dispose();
  }
  mesh(material, colorName = "aCol") {
    let d = this.done;
    if (!d) {
      const F = (a) => new Float32Array(a);
      d = { p: F(this.p), n: F(this.n), c: F(this.c), u: F(this.u), x: F(this.x), g: F(this.g), i: (this.p.length / 3 > 65535 ? Uint32Array : Uint16Array).from(this.i) };
      if (hubFontsReady()) HUB_CACHE.geo[this.key] = d;
    }
    const geo = new THREE.BufferGeometry();
    const f = (a, n) => new THREE.BufferAttribute(a, n);
    geo.setAttribute("position", f(d.p, 3));
    geo.setAttribute("normal", f(d.n, 3));
    geo.setAttribute(colorName, f(d.c, 3));
    geo.setAttribute("uv", f(d.u, 2));
    geo.setAttribute("aMR", f(d.x, 2));
    geo.setAttribute("aGroup", f(d.g, 1));
    geo.setIndex(f(d.i, 1));
    return new THREE.Mesh(geo, material);
  }
}

// Template geometry shared by every piece of the same shape: built once,
// stretched into place by the matrix (unit box, unit quad, prisms, knobs).
class HubKit {
  constructor() { this.cache = {}; }
  get(key, make) {
    let geo = this.cache[key];
    if (!geo) {
      geo = this.cache[key] = make();
      geo.userData.hubKeep = true;
    }
    return geo;
  }
  box(batch, w, h, d, m, color, opts) { batch.add(this.get("box", () => new THREE.BoxGeometry(1, 1, 1)), m.scale(new THREE.Vector3(w, h, d)), color, opts); }
  quad(batch, w, h, m, color, opts) { batch.add(this.get("quad", () => new THREE.PlaneGeometry(1, 1)), m.scale(new THREE.Vector3(w, h, 1)), color, opts); }
  dispose() { Object.values(this.cache).forEach((geo) => geo.dispose()); this.cache = {}; }
}

// ---- hub materials -----------------------------------------------------------
// Glossy paint, chrome and plastic in one material: colour, metalness and
// roughness come per vertex; the env map supplies the neon reflections.
function hubLitMaterial(env) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 1, roughness: 1, envMap: env, envMapIntensity: 1.4 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aMR;\nvarying vec2 vMR;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMR = aMR;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vMR;")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = vMR.y;")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = vMR.x;");
  };
  return m;
}
// Neon: per-vertex HDR colour times the level of the vertex's light group
// (0 leaves an unlit glass tube). With a map it lights a texture instead; with
// glint, a highlight sweeps across the selected cabinet's marquee now and then.
function hubGlowMaterial(levels, { map = null, additive = false, fog = 0.35, min = 0.04, glint = false } = {}) {
  const defines = {};
  if (map) defines.HUB_MAP = "";
  if (glint) defines.HUB_GLINT = "";
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uLevel: { value: levels }, tMap: { value: map }, uFogAmt: { value: fog }, uMin: { value: min }, uSel: { value: -1 }, uSelV: { value: 0 }, uTime: { value: 0 } }),
    defines,
    transparent: additive, depthWrite: !additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `attribute vec3 aCol; attribute float aGroup; uniform float uLevel[${HUB_NG}]; uniform float uSel;
      varying vec3 vCol; varying float vLv; varying float vDepth; varying vec2 vUv; varying float vSel;
      void main(){
        vCol = aCol; vLv = uLevel[int(aGroup + 0.5)]; vUv = uv; vSel = 1.0 - step(0.5, abs(aGroup - uSel));
        vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS} uniform sampler2D tMap; uniform float uFogAmt; uniform float uMin; uniform float uSelV; uniform float uTime;
      varying vec3 vCol; varying float vLv; varying float vDepth; varying vec2 vUv; varying float vSel;
      void main(){
        vec3 c = vCol;
        #ifdef HUB_MAP
        c *= texture2D(tMap, vUv).rgb;
        #endif
        c *= max(vLv, uMin);
        #ifdef HUB_GLINT
        float gx = vUv.x * 2.0 + (vUv.y - uSelV) * 2.2 - (fract(uTime * 0.11) * 9.0 - 1.0);
        c += vec3(0.3, 0.28, 0.36) * vSel * exp(-gx * gx * 700.0) * vLv;
        #endif
        float f = smoothstep(uFogNear, uFogFar, vDepth) * uFogAmt;
        ${additive ? "c *= 1.0 - f;" : "c = mix(c, uFogColor, f);"}
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
// Soft beams of light hanging from the ceiling; uv.y runs 0 (floor) to 1 (lamp).
function hubConeMaterial(levels) {
  return new THREE.ShaderMaterial({
    uniforms: { uLevel: { value: levels }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute vec3 aCol; attribute float aGroup; uniform float uLevel[${HUB_NG}];
      varying vec3 vCol; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        vCol = aCol * uLevel[int(aGroup + 0.5)]; vH = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uTime; varying vec3 vCol; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.8);
        float fall = mix(0.04, 1.0, vH * vH * vH) * smoothstep(0.0, 0.07, vH) * (1.0 - smoothstep(0.9, 1.0, vH));
        float flick = 0.95 + 0.05 * sin(uTime * 9.0 + vH * 6.0);
        gl_FragColor = vec4(vCol * face * fall * flick, 1.0);
      }`,
  });
}
// Dust motes drifting inside the beams; each belongs to one cabinet's lamp.
function hubDustMaterial(levels) {
  return new THREE.ShaderMaterial({
    uniforms: { uLevel: { value: levels }, uTime: { value: 0 }, uScale: { value: 700 }, uSize: { value: 0.045 }, uColor: { value: neon(0xffe6ff, 2.6) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec2 aMR; attribute float aGroup; uniform float uLevel[${HUB_NG}]; uniform float uTime; uniform float uScale; uniform float uSize;
      varying float vB;
      void main(){
        float s = aMR.x;
        vec3 p = position + vec3(sin(uTime * 0.21 + s * 40.0), sin(uTime * 0.13 + s * 23.0) * 1.6, cos(uTime * 0.17 + s * 31.0)) * 0.28;
        vB = uLevel[int(aGroup + 0.5)] * (1.0 - aMR.y * aMR.y) * max(0.0, 0.35 + 0.65 * sin(uTime * (0.5 + s) + s * 50.0));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = max(1.0, uSize * uScale / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vB;
      void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(uColor * vB * (1.0 - smoothstep(0.05, 0.5, d)), 1.0); }`,
  });
}
// A cabinet's CRT behind its bezel: curved glass, scanlines, a warm-up line
// when it powers on, and coloured light spilling onto the bezel art.
function hubScreenMaterial(tex, color) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { tMap: { value: tex }, uTint: { value: new THREE.Color(color) }, uPower: { value: 1 }, uGain: { value: 1 } }),
    extensions: { derivatives: true },
    vertexShader: "varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS}
      uniform sampler2D tMap; uniform vec3 uTint; uniform float uPower; uniform float uGain;
      varying vec2 vUv; varying float vDepth;
      void main(){
        vec2 p = (vUv - 0.5) * vec2(1.96, 1.5);
        vec2 b = vec2(0.8, 0.6);
        vec2 d = abs(p) - (b - 0.09);
        float sd = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - 0.09;
        float aa = fwidth(sd) + 1e-4;
        float tube = 1.0 - smoothstep(-aa, aa, sd);
        vec3 bez = vec3(0.022, 0.016, 0.046);
        float l1 = 1.0 - smoothstep(0.0, aa * 1.5, abs(sd - 0.05) - 0.007);
        float l2 = 1.0 - smoothstep(0.0, aa * 1.5, abs(sd - 0.125) - 0.003);
        bez += uTint * (l1 * 0.9 + l2 * 0.4) * (0.3 + 0.7 * uPower);
        bez += uTint * exp(-max(sd, 0.0) * 15.0) * 0.45 * uPower * uGain;
        vec2 q = p / b;
        q *= 1.0 + 0.045 * dot(q, q);
        vec2 tuv = q * 0.5 + 0.5;
        float hx = clamp(uPower * 2.4, 0.0, 1.0);
        float vy = clamp(uPower * 2.4 - 1.2, 0.012, 1.0);
        vec2 su = (tuv - 0.5) / vec2(max(hx, 0.001), vy) + 0.5;
        float win = step(abs(tuv.x - 0.5), hx * 0.5) * step(abs(tuv.y - 0.5), vy * 0.5);
        vec3 img = texture2D(tMap, su).rgb;
        img *= 1.35 / (1.0 + 0.45 * dot(img, vec3(0.299, 0.587, 0.114)));
        img = mix(vec3(2.4, 2.3, 2.6), img, smoothstep(0.55, 0.95, uPower));
        // 60 lines: wide enough to resolve on a phone, and faded out before they can beat against the pixels
        float fw = fwidth(su.y * 60.0);
        img *= mix(1.0, 0.86 + 0.14 * cos(su.y * 376.99), clamp(1.25 - fw * 2.5, 0.0, 1.0));
        img *= 1.0 - 0.2 * dot(q, q);
        vec3 crt = vec3(0.012, 0.016, 0.02) + img * win * uGain;
        crt += vec3(0.08, 0.07, 0.13) * (1.0 - smoothstep(0.0, 0.8, length(q - vec2(-0.55, 0.62)))) * 0.45;
        vec3 col = mix(bez, crt, tube);
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth) * 0.6);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
// Screens of the machines along the wall, all procedural: attract-mode blocks
// cycling through colours (aMR.y = 0), a pinball playfield (1), a backglass (2).
function hubMachineScreenMaterial(levels) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uLevel: { value: levels }, uTime: { value: 0 } }),
    vertexShader: `attribute vec2 aMR; attribute float aGroup; uniform float uLevel[${HUB_NG}];
      varying vec2 vUv; varying vec2 vMR; varying float vLv; varying float vDepth;
      void main(){ vUv = uv; vMR = aMR; vLv = uLevel[int(aGroup + 0.5)]; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_FOG_PARS} uniform float uTime; varying vec2 vUv; varying vec2 vMR; varying float vLv; varying float vDepth;
      float hubH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float s = vMR.x;
        float t = uTime;
        vec3 hue = 0.55 + 0.45 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + s * 5.3 + floor(t * 0.09 + s * 4.0) * 0.37));
        vec3 col;
        if (vMR.y < 0.5) {
          vec2 g = floor(vUv * vec2(9.0, 7.0));
          float blk = step(0.72, hubH(g + floor(t * (1.2 + s * 2.0) + s * 17.0) * 1.37 + s * 31.0));
          float bar = smoothstep(0.9, 1.0, fract(vUv.y * 3.0 + t * (0.25 + s * 0.4)));
          col = hue * (0.1 + 0.85 * blk) + hue.brg * bar * 0.5;
          col *= 1.0 - 0.75 * step(0.985, hubH(vec2(floor(t * 10.0), s * 9.0)));
          vec2 v = vUv * (1.0 - vUv);
          col *= clamp(v.x * v.y * 45.0, 0.0, 1.0);
        } else if (vMR.y < 1.5) {
          vec2 gq = vUv * vec2(4.0, 10.0);
          vec2 g = floor(gq);
          float on = step(0.45, hubH(g + floor(t * 2.5 + hubH(g) * 4.0)));
          float dm = 1.0 - smoothstep(0.12, 0.32, length(fract(gq) - 0.5));
          col = hue * 0.12 + mix(hue, hue.gbr, hubH(g + 3.0)) * dm * on * 1.3;
        } else {
          vec2 c = vUv - 0.5;
          col = hue * (0.3 + 0.45 * (1.0 - smoothstep(0.0, 0.5, length(c))));
          float chase = step(0.5, fract((vUv.x + vUv.y) * 6.0 - t * 2.0));
          col += vec3(1.0, 0.85, 0.55) * chase * step(0.4, max(abs(c.x), abs(c.y))) * 1.3;
        }
        col *= vLv * 1.25;
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
// The floor: polished dark tiles that mirror the room, a blacklight carpet
// beyond them, an LED inlay ring between the two, soft contact shadows under
// the machines and pools of coloured light thrown by the cabinets.
function hubFloorMaterial(mirror, carpet) {
  const v2 = () => CABINETS.map(() => new THREE.Vector2());
  const v3 = () => CABINETS.map(() => new THREE.Color(0));
  const N = CABINETS.length, TR = HUB_TILE_R.toFixed(2), BR = HUB_BG_R.toFixed(2);
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), {
      tReflect: { value: mirror.texture }, uMirror: { value: mirror.matrix }, uReflect: { value: 1 }, tCarpet: { value: carpet },
      uBlack: { value: 1 }, uInlay: { value: 1 }, uInlayCol: { value: neon(0xff3ad4, 2.2) }, uBg: { value: 1 }, uRoom: { value: 1 },
      uCab: { value: v2() }, uPoolPos: { value: v2() }, uPoolCol: { value: v3() }, uConeCol: { value: v3() },
    }),
    extensions: { derivatives: true },
    vertexShader: `uniform mat4 uMirror; varying vec3 vWorld; varying vec4 vRefl; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vRefl = uMirror * w; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform sampler2D tReflect; uniform sampler2D tCarpet; uniform float uReflect;
      uniform float uBlack; uniform float uInlay; uniform vec3 uInlayCol; uniform float uBg; uniform float uRoom;
      uniform vec2 uCab[${N}]; uniform vec2 uPoolPos[${N}]; uniform vec3 uPoolCol[${N}]; uniform vec3 uConeCol[${N}];
      varying vec3 vWorld; varying vec4 vRefl; varying float vDepth;
      void main(){
        vec2 p = vWorld.xz;
        float r = length(p);
        float fr = max(fwidth(r), 1e-4);
        float tiles = 1.0 - smoothstep(${TR} - fr, ${TR} + fr, r);
        vec2 tc = p / 1.25;
        float aw = max(fwidth(tc.x), fwidth(tc.y));
        vec2 f = abs(fract(tc) - 0.5);
        float grout = mix(smoothstep(0.014, 0.014 + aw * 1.5, 0.5 - max(f.x, f.y)), 0.85, smoothstep(0.08, 0.3, aw));
        float ch = mix(mod(floor(tc.x) + floor(tc.y), 2.0), 0.5, smoothstep(0.15, 0.45, aw));
        vec3 tile = mix(vec3(0.018, 0.012, 0.038), vec3(0.032, 0.02, 0.062), ch) * mix(0.45, 1.0, grout);
        vec3 cp = texture2D(tCarpet, p * 0.22).rgb;
        vec3 col = mix(cp * (0.22 + 0.85 * uBlack), tile, tiles) * (0.5 + 0.5 * uRoom);
        float ao = 1.0 - 0.5 * exp(-(r - ${BR}) * (r - ${BR}) * 1.4);
        vec3 light = vec3(0.0);
        for (int i = 0; i < ${N}; i++) {
          vec2 d = p - uCab[i];
          float dd = dot(d, d);
          ao *= 1.0 - 0.55 * exp(-dd * 0.85);
          vec2 e = p - uPoolPos[i];
          light += uPoolCol[i] * exp(-dot(e, e) * 0.75) + uConeCol[i] * exp(-dd * 0.3);
        }
        float ang = atan(p.x, -p.y);
        vec3 hue = 0.5 + 0.5 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) + ang * 0.8));
        light += hue * uBg * 0.12 * exp(-(r - 15.2) * (r - 15.2) * 0.8) * (0.7 + 0.3 * sin(ang * 50.0));
        col = col * ao + light * mix(cp * 1.8 + 0.06, vec3(0.5), tiles) * ao;
        if (uReflect > 0.0) {
          vec3 V = normalize(cameraPosition - vWorld);
          float fres = 0.32 + 0.68 * pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
          vec2 ruv = vRefl.xy / vRefl.w + vec2(sin(p.y * 3.1 + p.x * 0.7), cos(p.x * 2.7 - p.y * 0.5)) * 0.0012;
          float s = 0.006;
          vec3 rc = texture2D(tReflect, ruv).rgb * 0.4
            + (texture2D(tReflect, ruv + vec2(0.0, s)).rgb + texture2D(tReflect, ruv - vec2(0.0, s)).rgb) * 0.2
            + (texture2D(tReflect, ruv + vec2(0.0, s * 2.4)).rgb + texture2D(tReflect, ruv - vec2(0.0, s * 2.4)).rgb) * 0.1;
          col += rc * mix(0.06, mix(0.25, 0.6, grout), tiles) * fres * uReflect;
        }
        float dr = abs(r - ${TR});
        float wr = max(0.03, fr * 1.2);
        col += uInlayCol * uInlay * ((1.0 - smoothstep(wr * 0.25, wr, dr)) + 0.2 * exp(-dr * 6.0));
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
// The round wall: dark padded panels, washed with light by the neon rings and
// glowing softly behind each sign.
function hubWallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), {
      uRingCol: { value: HUB_RINGS.map(() => new THREE.Color(0)) }, uRingY: { value: new THREE.Vector3(...HUB_RINGS.map((r) => r[0])) },
      uGlowPos: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -99, 1, 1)) }, uGlowCol: { value: Array.from({ length: 8 }, () => new THREE.Color(0)) },
      uRoom: { value: 1 },
    }),
    side: THREE.BackSide, extensions: { derivatives: true },
    vertexShader: "varying vec3 vWorld; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS}
      uniform vec3 uRingCol[3]; uniform vec3 uRingY; uniform vec4 uGlowPos[8]; uniform vec3 uGlowCol[8]; uniform float uRoom;
      varying vec3 vWorld; varying float vDepth;
      void main(){
        float ang = atan(vWorld.x, -vWorld.z);
        float y = vWorld.y;
        float u = ang * ${(HUB_WALL / 1.9).toFixed(3)};
        float pu = abs(fract(u) - 0.5) * 2.0;
        float seam = smoothstep(0.96 - fwidth(u) * 3.0, 1.0, pu);
        vec3 col = mix(vec3(0.03, 0.017, 0.066), vec3(0.013, 0.008, 0.032), smoothstep(0.5, 9.0, y));
        col *= (0.8 + 0.2 * (1.0 - pu * pu)) * (1.0 - 0.6 * seam) * (0.55 + 0.45 * uRoom);
        col *= 1.0 - 0.35 * (1.0 - smoothstep(1.2, 1.25, y));
        col += uRingCol[0] * exp(-abs(y - uRingY.x) * 1.7) * 0.1;
        col += uRingCol[1] * exp(-abs(y - uRingY.y) * 1.7) * 0.1;
        col += uRingCol[2] * exp(-abs(y - uRingY.z) * 1.7) * 0.1;
        for (int i = 0; i < 8; i++) {
          vec4 g = uGlowPos[i];
          float da = (ang - g.x) * ${HUB_WALL.toFixed(1)};
          float dy = y - g.y;
          col += uGlowCol[i] * exp(-(da * da * g.z + dy * dy * g.w));
        }
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
// The ceiling: black, with fibre-optic stars and the glow of its neon tubes.
function hubCeilMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uGlow: { value: new THREE.Color(0) }, uStars: { value: 1 }, uTime: { value: 0 } }),
    extensions: { derivatives: true },
    vertexShader: "varying vec3 vWorld; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS} uniform vec3 uGlow; uniform float uStars; uniform float uTime; varying vec3 vWorld; varying float vDepth;
      void main(){
        vec2 p = vWorld.xz;
        float r = length(p);
        vec3 col = vec3(0.012, 0.008, 0.026);
        col += uGlow * (0.16 * exp(-abs(r - 13.4) * 1.8) + 0.14 * exp(-abs(r - 4.4) * 1.8) + 0.2 * exp(-abs(r - 18.55) * 1.4));
        vec2 q = p * 1.5;
        vec2 c = floor(q);
        float h = fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
        float fw = fwidth(q.x) + fwidth(q.y);
        if (h > 0.97) {
          float tw = 0.55 + 0.45 * sin(uTime * (0.8 + h * 3.0) + h * 70.0);
          col += vec3(0.9, 0.8, 1.0) * (1.0 - smoothstep(0.0, 0.1 + fw, length(fract(q) - 0.5))) * tw * uStars * 1.6 * (1.0 - smoothstep(0.15, 0.6, fw));
        }
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// ---- hub artwork (canvas atlases) --------------------------------------------
// A backlit marquee: sunburst and horizon grid behind a chrome title.
function hubMarquee(x, X, Y, W, H, text, color, tag) {
  x.save();
  x.translate(X, Y);
  x.beginPath();
  x.rect(0, 0, W, H);
  x.clip();
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#040010");
  bg.addColorStop(0.55, hubRGB(color, 0.3));
  bg.addColorStop(1, "#040010");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  if (tag) {
    x.save();
    x.translate(W / 2, H * 0.6);
    for (let k = 0; k < 18; k++) {
      x.rotate(Math.PI / 9);
      x.fillStyle = k % 2 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.2)";
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(W, -W * 0.17);
      x.lineTo(W, W * 0.17);
      x.fill();
    }
    x.restore();
    x.strokeStyle = hubRGB(color, 0.8, 0.45);
    x.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const yy = H * (0.76 + 0.24 * Math.pow(k / 4, 1.7));
      x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke();
    }
    for (let k = -9; k <= 9; k++) {
      x.beginPath(); x.moveTo(W / 2 + k * 14, H * 0.76); x.lineTo(W / 2 + k * 64, H); x.stroke();
    }
    x.fillStyle = "#ffffff";
    for (let k = 0; k < 16; k++) x.fillRect(Math.random() * W, Math.random() * H * 0.6, 2, 2);
  }
  const b = Math.max(2, H * 0.035);
  x.strokeStyle = color;
  x.lineWidth = b;
  x.strokeRect(b * 1.3, b * 1.3, W - b * 2.6, H - b * 2.6);
  const size = Math.floor(Math.min(H * (tag ? 0.28 : 0.4), (W * (tag ? 0.72 : 0.84)) / text.length));
  const ty = tag ? H * 0.42 : H * 0.53;
  x.font = `${size}px "Press Start 2P", "Courier New", monospace`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.lineJoin = "round";
  x.strokeStyle = color;
  [[0.34, 0.14], [0.2, 0.3]].forEach(([w, a]) => { // a tight glow: wide soft strokes smeared the letters
    x.globalAlpha = a;
    x.lineWidth = size * w;
    x.strokeText(text, W / 2, ty);
  });
  x.globalAlpha = 1;
  x.lineWidth = size * 0.13;
  x.strokeStyle = "#14022a";
  x.strokeText(text, W / 2, ty);
  const tg = x.createLinearGradient(0, ty - size / 2, 0, ty + size / 2);
  tg.addColorStop(0, "#ffffff");
  tg.addColorStop(0.48, "#fff2fd");
  tg.addColorStop(0.6, color);
  tg.addColorStop(1, hubRGB(color, 0.7));
  x.fillStyle = tg;
  x.fillText(text, W / 2, ty);
  if (tag) {
    x.font = `${Math.round(H * 0.075)}px "Press Start 2P", "Courier New", monospace`;
    x.fillStyle = "#ffffff";
    x.fillText(tag.toUpperCase().replace("·", "-"), W / 2, H * 0.66);
  }
  x.restore();
}
// Marquees: the six cabinets down the left half, sixteen wall machines on the right.
function hubMarqueeAtlas() {
  if (HUB_CACHE.marquee) return HUB_CACHE.marquee;
  const c = document.createElement("canvas");
  c.width = c.height = 2048; // twice the old size: marquee lettering stays sharp on a phone's dense screen
  const x = c.getContext("2d");
  x.scale(2, 2);
  x.fillStyle = "#000";
  x.fillRect(0, 0, 1024, 1024);
  CABINETS.forEach((cab, i) => { hubMarquee(x, 0, i * 170, 512, 170, cab.name, cab.color, cab.tag); [34, 478].forEach((ex) => hubEmblem(x, cab.id, ex, i * 170 + 72, 17, cab.color)); });
  HUB_TITLES.forEach((t, i) => hubMarquee(x, 512 + (i % 2) * 256, Math.floor(i / 2) * 64, 256, 64, t, HUB_PALETTE[i % HUB_PALETTE.length]));
  if (hubFontsReady()) HUB_CACHE.marquee = c;
  return c;
}
// The neon half of the wall texture, which never changes: the INR ARCADE sign
// (top strip) and five neon signs. Returns the texture-u range of the sign's
// C, which has a loose contact.
function hubWallNeon() {
  if (HUB_CACHE.wall) return HUB_CACHE.wall;
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d");
  x.fillStyle = "#000";
  x.fillRect(0, 0, 1024, 1024);
  // INR ARCADE, bent in tubes: pink INR, cyan ARCADE, a violet frame.
  x.font = '92px "Press Start 2P", "Courier New", monospace';
  const x0 = (1024 - x.measureText("INR ARCADE").width) / 2;
  const cU = [(x0 + x.measureText("INR AR").width) / 1024, (x0 + x.measureText("INR ARC").width) / 1024];
  const xA = x0 + x.measureText("INR ").width;
  hubRoundRect(x, 16, 14, 992, 172, 34);
  hubTube(x, "#a65fff", 7);
  hubTubeText(x, "INR", x0, 102, 92, "#ff3ad4", "left");
  hubTubeText(x, "ARCADE", xA, 102, 92, "#35efff", "left");
  // Neon signs (512, 200 + k·164, 512×164), each with a little pictogram.
  HUB_SIGNS.forEach(([text, col], k) => {
    x.save();
    x.translate(512, 200 + k * 164);
    const size = Math.min(48, Math.floor(400 / text.length));
    hubTubeText(x, text, 256, 96, size, col);
    x.beginPath();
    if (k === 0) {
      [[36, 1], [476, -1]].forEach(([bx, s]) => {
        x.moveTo(bx + 10 * s, 52); x.lineTo(bx - 8 * s, 98); x.lineTo(bx + 6 * s, 98); x.lineTo(bx - 4 * s, 140); x.lineTo(bx + 18 * s, 86); x.lineTo(bx + 4 * s, 86); x.closePath();
      });
      hubTube(x, "#ffe14f", 5);
    } else if (k === 1) {
      x.arc(256, 40, 20, 0, Math.PI * 2);
      x.moveTo(256, 30); x.lineTo(256, 50);
      hubTube(x, "#ffe14f", 5);
    } else if (k === 2) {
      [44, 468].forEach((sx) => {
        for (let j = 0; j <= 10; j++) {
          const a = (j / 10) * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? 9 : 22;
          if (j) x.lineTo(sx + Math.cos(a) * rr, 96 + Math.sin(a) * rr); else x.moveTo(sx + Math.cos(a) * rr, 96 + Math.sin(a) * rr);
        }
      });
      hubTube(x, "#ffe14f", 4);
    } else if (k === 3) {
      x.moveTo(150, 140); x.lineTo(360, 140); x.moveTo(336, 124); x.lineTo(362, 140); x.lineTo(336, 156);
      hubTube(x, "#ff3ad4", 5);
    } else {
      x.moveTo(214, 54); x.lineTo(214, 24); x.lineTo(235, 42); x.lineTo(256, 18); x.lineTo(277, 42); x.lineTo(298, 24); x.lineTo(298, 54); x.closePath();
      hubTube(x, "#ff9b3d", 4);
    }
    x.restore();
  });
  const neonArt = { canvas: c, cU };
  if (hubFontsReady()) HUB_CACHE.wall = neonArt;
  return neonArt;
}
// Everything on the wall in one texture: the neon art, plus the Hall of Fame
// board and the boss posters, drawn fresh so scores and stars are current.
function hubWallAtlas() {
  const neonArt = hubWallNeon();
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const x = c.getContext("2d");
  x.drawImage(neonArt.canvas, 0, 0);
  // Hall of Fame board (0,200 512×300)
  x.save();
  x.translate(0, 200);
  x.fillStyle = "#0a0420";
  x.fillRect(0, 0, 512, 300);
  x.strokeStyle = "#ffe14f";
  x.lineWidth = 6;
  x.strokeRect(6, 6, 500, 288);
  x.textBaseline = "top";
  x.font = '22px "Press Start 2P", monospace';
  x.fillStyle = "#ffe14f";
  x.textAlign = "center";
  x.fillText("HALL OF FAME", 256, 22);
  x.textAlign = "left";
  x.font = '13px "Press Start 2P", monospace';
  const rows = [
    ["BLASTER", (Store.state.scores.blaster || [])[0], (v) => fmtScore(v), "#35efff"],
    ["NEST EGG", (Store.state.scores.racer || [])[0], (v) => money(v), "#ffe14f"],
    ["BOSS RUSH", (Store.state.scores.boss || [])[0], (v) => fmtScore(v), "#ff3ad4"],
    ["EXAM", (Store.state.scores.exam || [])[0], (v) => v + "%", "#a65fff"],
  ];
  rows.forEach(([label, rec, fmt, col], i) => {
    const y = 76 + i * 40;
    x.fillStyle = col;
    x.fillText(label, 28, y);
    x.fillStyle = "#f4efff";
    x.textAlign = "right";
    x.fillText(rec ? `${rec.n} ${fmt(rec.s)}` : "---", 484, y);
    x.textAlign = "left";
  });
  const r = rankOf(xpTotal());
  x.fillStyle = "#86ff5e";
  x.fillText(`LV${r.level} ${r.name}`, 28, 252);
  x.textAlign = "right";
  x.fillText(`MASTERY ${overallMastery()}%`, 484, 252);
  x.restore();
  // Boss posters, five to a row from (0,506)
  const keys = CHAPTERS.map((ch) => ch.n).concat(["all"]);
  keys.forEach((k, i) => {
    const cfg = BOSSES[k];
    const stars = Store.state.boss[k] || 0;
    x.save();
    x.translate(2 + (i % 5) * 100, 506 + Math.floor(i / 5) * 152);
    x.beginPath();
    x.rect(0, 0, 96, 144);
    x.clip();
    x.fillStyle = "#0b0424";
    x.fillRect(0, 0, 96, 144);
    x.strokeStyle = stars ? cfg.color : "#3d2c80";
    x.lineWidth = 4;
    x.strokeRect(2, 2, 92, 140);
    const face = drawBossPortrait(document.createElement("canvas"), stars ? cfg.color : "#4a3a7a");
    x.imageSmoothingEnabled = false;
    x.drawImage(face, 18, 14, 60, 60);
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    x.font = '8px "Press Start 2P", monospace';
    x.fillStyle = stars ? "#f4efff" : "#7a6aa8";
    const words = cfg.name.split(" ");
    const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [cfg.name];
    lines.forEach((ln, j) => x.fillText(ln, 48, 92 + j * 12));
    x.fillStyle = "#a99cdc";
    x.fillText(k === "all" ? "FINAL" : "STAGE " + k, 48, 120);
    for (let j = 0; j < 3; j++) {
      x.fillStyle = j < stars ? "#ffe14f" : "#3d2c80";
      x.fillRect(30 + j * 14, 128, 8, 8);
    }
    x.restore();
  });
  return { canvas: c, cU: neonArt.cU };
}

class HubScene extends Scene3D {
  constructor() {
    super({ fov: 58, fog: [0x0b0424, 12, 44] });
    this.sel = Hub.index;
    this.angle = this.cabAngle(this.sel);
    this.restDolly = 1.2;
    this.dolly = 1.2;
    this.cabs = [];
    if (!this.has3D) return;
    const s = this.scene;
    s.background = new THREE.Color(0x07021a);
    s.userData.post = { exposure: 1.05, bloom: 0.95, threshold: 1, saturation: 1.12, contrast: 1.1, vignette: 1.15 };
    this.texs = [];
    // on[g]: what the lamps say; lv[g]: the level the shaders get (focus, buzz).
    this.on = new Float32Array(HUB_NG).fill(1);
    this.lv = new Float32Array(HUB_NG).fill(1);
    this.room = 1; // how much of the room is powered, eased
    this.buzzT = 3;
    this.buzzOn = true;
    this.env = makeEnvMap({
      top: 0x0d0526, horizon: 0x2c0f5c, bottom: 0x06020f, glow: 0.7,
      panels: [
        { pos: [0, 7, -17], w: 13, h: 2, color: 0xff3ad4, k: 3 },
        { pos: [0, 15, 0], w: 26, h: 1.4, color: 0x35efff, k: 2 },
        { pos: [0, 15, -6], w: 26, h: 1.2, color: 0xff3ad4, k: 2 },
        { pos: [-17, 3.5, 2], w: 14, h: 0.6, color: 0x35efff, k: 2.5 },
        { pos: [17, 3.5, 2], w: 14, h: 0.6, color: 0x35efff, k: 2.5 },
        { pos: [-16, 6.2, -8], w: 10, h: 0.5, color: 0xff3ad4, k: 2.4 },
        { pos: [16, 6.2, -8], w: 10, h: 0.5, color: 0xff3ad4, k: 2.4 },
        { pos: [-12, 1.6, 12], w: 7, h: 2.4, color: 0xffe14f, k: 1.4 },
        { pos: [12, 1.6, 12], w: 7, h: 2.4, color: 0x86ff5e, k: 1.3 },
        { pos: [0, 2, 17], w: 10, h: 3, color: 0xa65fff, k: 1.6 },
      ],
    });
    // Real lights: a dim purple room light, a key from the ceiling, and two
    // that follow the selection (its screen's glow, the lamp above it).
    this.hemi = new THREE.HemisphereLight(0x8c6cff, 0x1c0a36, 0.6);
    this.key = new THREE.DirectionalLight(0xffe4f6, 0.5);
    this.key.position.set(0, 10, 3);
    this.screenLight = new THREE.PointLight(0xffffff, 0, 7, 2);
    this.topLight = new THREE.PointLight(0xfff0f8, 0, 12, 1.4);
    this.lightCol = new THREE.Color(CABINETS[this.sel].color);
    s.add(this.hemi, this.key, this.screenLight, this.topLight);
    const atlas = hubWallAtlas();
    const wallTex = this.canvasTex(atlas.canvas);
    // The floor stays built while you play (see hubScene()); on the way back only
    // the Hall of Fame and the posters are redrawn, and only if they changed.
    this.keepAlive = true;
    this.wallTex = wallTex;
    this.wallSig = hubWallSig();
    const marqTex = this.canvasTex(hubMarqueeAtlas());
    const B = { lit: new HubBatch("lit", 0.6), glow: new HubBatch("glow"), marq: new HubBatch("marq"), panels: new HubBatch("panels"), signs: new HubBatch("signs"), screens: new HubBatch("screens"), cones: new HubBatch("cones") };
    this.dustPts = { p: [], x: [], g: [] };
    const K = new HubKit();
    this.addRoom(B, K);
    this.addWall(B, K, atlas);
    CABINETS.forEach((cab, i) => this.cabs.push(this.makeCabinet(cab, i, B, K)));
    this.addMachines(B, K);
    K.dispose();
    const lv = this.lv;
    s.add(B.lit.mesh(hubLitMaterial(this.env), "color"));
    s.add(B.glow.mesh(hubGlowMaterial(lv)));
    this.marqMat = hubGlowMaterial(lv, { map: marqTex, fog: 0.45, glint: !REDUCED_MOTION });
    s.add(B.marq.mesh(this.marqMat));
    s.add(B.panels.mesh(hubGlowMaterial(lv, { map: wallTex, fog: 0.5, min: 0.16 })));
    const signs = B.signs.mesh(hubGlowMaterial(lv, { map: wallTex, additive: true, fog: 0.25 }));
    signs.renderOrder = 2;
    s.add(signs);
    s.add(B.screens.mesh(hubMachineScreenMaterial(lv)));
    // beams and dust are small details: layer 1 keeps them out of the mirror
    const cones = B.cones.mesh(hubConeMaterial(lv));
    cones.renderOrder = 5;
    cones.layers.set(1);
    s.add(cones);
    this.decor(cones);
    const D = (HUB_CACHE.dust = HUB_CACHE.dust || { p: new Float32Array(this.dustPts.p), x: new Float32Array(this.dustPts.x), g: new Float32Array(this.dustPts.g) });
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(D.p, 3));
    dg.setAttribute("aMR", new THREE.BufferAttribute(D.x, 2));
    dg.setAttribute("aGroup", new THREE.BufferAttribute(D.g, 1));
    this.dust = new THREE.Points(dg, hubDustMaterial(lv));
    this.dust.renderOrder = 6;
    this.dust.frustumCulled = false;
    this.dust.layers.set(1);
    s.add(this.dust);
    this.decor(this.dust);
    // Club lasers: thin beams fan out from the ceiling and sweep across the floor.
    // They hang behind the ring of cabinets, so they cross the back of the room.
    this.lasers = [0x35efff, 0xff3ad4, 0x86ff5e, 0xa65fff, 0x35efff, 0xff3ad4, 0x86ff5e, 0xa65fff].map((col, i) => {
      const beam = makeBeam(col, 1.25);
      const az = (i / 8) * Math.PI * 2 + 0.2;
      beam.userData = { az, from: new THREE.Vector3(Math.sin(az) * 10.5, HUB_CEIL - 0.3, -Math.cos(az) * 10.5), to: new THREE.Vector3(), ph: i * 1.7 };
      beam.material.uniforms.uFade.value = 0;
      s.add(beam);
      this.decor(beam);
      return beam;
    });
    // Everything that lights up, so the room can power on piece by piece.
    const grp = (g) => ({ on: () => { this.on[g] = 1; }, off: () => { this.on[g] = 0; } });
    this.lights = [
      { kind: "tube", parts: [grp(HUB_G.tube)] },
      ...HUB_RINGS.map((_, k) => ({ kind: "ring", parts: [grp(HUB_G.ring + k)] })),
      { kind: "sign", parts: [grp(HUB_G.sign)] },
      { kind: "sign", parts: [grp(HUB_G.board)] },
      { kind: "sign", parts: [grp(HUB_G.signs)] },
      { kind: "bg", parts: [grp(HUB_G.bg)] },
      ...this.cabs.map((c, i) => ({ kind: "cab", parts: [grp(HUB_G.cab + i), { on: () => { c.scr.target = 1; }, off: () => { c.scr.target = 0; c.scr.power = 0; } }] })),
    ];
    this.flickT = 3;
    this.extras = new HubExtras(this); // room props, patrons, the power-up effect
  }
  canvasTex(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    if (GFX.ok) t.anisotropy = Math.min(4, GFX.renderer.capabilities.getMaxAnisotropy());
    this.texs.push(t);
    return t;
  }
  // Floor, wall, ceiling and the neon tubes that run around the room.
  addRoom(B, K) {
    const s = this.scene;
    this.mirror = new Mirror(0);
    s.userData.mirrors = [this.mirror];
    const carpet = carpetTexture();
    this.texs.push(carpet);
    this.floorMat = hubFloorMaterial(this.mirror, carpet);
    CABINETS.forEach((_, i) => {
      const a = this.cabAngle(i);
      this.floorMat.uniforms.uCab.value[i].set(Math.sin(a) * HUB_R, -Math.cos(a) * HUB_R);
      this.floorMat.uniforms.uPoolPos.value[i].set(Math.sin(a) * (HUB_R - 1.8), -Math.cos(a) * (HUB_R - 1.8));
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(HUB_WALL, 72), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.mirror.receivers.push(floor);
    s.add(floor);
    this.wallMat = hubWallMaterial();
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(HUB_WALL, HUB_WALL, HUB_CEIL, 120, 1, true), this.wallMat);
    wall.position.y = HUB_CEIL / 2;
    s.add(wall);
    this.ceilMat = hubCeilMaterial();
    const ceil = new THREE.Mesh(new THREE.CircleGeometry(HUB_WALL, 72), this.ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = HUB_CEIL;
    s.add(ceil);
    const g = HUB_G.tube, y = HUB_CEIL;
    [[18.55, 0xff3ad4, y - 0.2], [13.4, 0x35efff, y - 0.07], [4.4, 0xff3ad4, y - 0.07]].forEach(([r, c, yy]) => {
      B.glow.add(new THREE.TorusGeometry(r, 0.055, 4, Math.round(r * 7)), hubM(0, yy, 0, Math.PI / 2), c, { k: 2.3, g });
    });
    for (let k = 0; k < 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      B.glow.add(K.get("spoke", () => new THREE.CylinderGeometry(0.045, 0.045, 8.4, 5, 1, true)), hubM(Math.sin(t) * 8.9, y - 0.07, -Math.cos(t) * 8.9, 0, -t).multiply(hubM(0, 0, 0, Math.PI / 2)), k % 2 ? 0xa65fff : 0x35efff, { k: 2, g });
    }
    HUB_RINGS.forEach(([yy, c], k) => B.glow.add(K.get("ring", () => new THREE.TorusGeometry(18.85, 0.05, 4, 132)), hubM(0, yy, 0, Math.PI / 2), c, { k: 2.4, g: HUB_G.ring + k }));
    this.tubeTint = new THREE.Color(0xb060ff);
    this.ringCols = HUB_RINGS.map(([, c]) => new THREE.Color(c));
  }
  // The INR ARCADE sign, the Hall of Fame, neon signs and the boss posters.
  addWall(B, K, atlas) {
    const G = HUB_G;
    const sign = { ang: 0, y: 6.75, r: 18.3, w: 9.2, h: (9.2 * 200) / 1024, uv: hubUV(0, 0, 1024, 200) };
    const [c0, c1] = atlas.cU;
    const strip = (f0, f1, n) => { for (let k = 0; k < n; k++) hubWallQuad(K, B.signs, sign, f0 + ((f1 - f0) * k) / n, f0 + ((f1 - f0) * (k + 1)) / n, 0, 1, G.sign, 2.6); };
    strip(0, c0, 4);
    strip(c1, 1, 2);
    hubWallQuad(K, B.signs, sign, c0, c1, 0, 0.2, G.sign, 2.6);
    hubWallQuad(K, B.signs, sign, c0, c1, 0.2, 0.8, G.signC, 2.6);
    hubWallQuad(K, B.signs, sign, c0, c1, 0.8, 1, G.sign, 2.6);
    for (let k = 0; k < 5; k++) {
      const ang = ((k - 2) * 1.88) / 18.42;
      K.box(B.lit, 1.9, 1.78, 0.06, hubM(Math.sin(ang) * 18.42, sign.y, -Math.cos(ang) * 18.42, 0, -ang), 0x07030f, { aux: [0.3, 0.22] });
    }
    // the Hall of Fame hangs on the open wall left of the first cabinet
    const board = { ang: -1.56, y: 6.1, r: 18.55, w: 5, h: (5 * 300) / 512, uv: hubUV(0, 200, 512, 300) };
    hubWallQuad(K, B.panels, board, 0, 0.5, 0, 1, G.board, 1.3);
    hubWallQuad(K, B.panels, board, 0.5, 1, 0, 1, G.board, 1.3);
    // [angle, y, width, height, colour, group, strength] of the light on the wall
    this.wallGlows = [[0, 6.75, 9.2, 1.9, 0xb070ff, G.sign, 0.24], [-1.56, 6.1, 5, 2.9, 0xffe14f, G.board, 0.07]];
    HUB_SIGNS.forEach(([, col, ang, w], k) => {
      const q = { ang, y: 6.72, r: 18.45, w, h: (w * 164) / 512, uv: hubUV(512, 200 + k * 164, 512, 164) };
      hubWallQuad(K, B.signs, q, 0, 0.5, 0, 1, G.signs, 2.2);
      hubWallQuad(K, B.signs, q, 0.5, 1, 0, 1, G.signs, 2.2);
      this.wallGlows.push([ang, 6.72, w, q.h, col, G.signs, 0.16]);
    });
    // boss posters in a row above the machines, right of the Hall of Fame
    const keys = CHAPTERS.map((ch) => ch.n).concat(["all"]);
    keys.forEach((k, i) => {
      const ang = -1.1 + (i / Math.max(1, keys.length - 1)) * 3.1;
      const q = { ang, y: 4.62, r: 18.75, w: 1.167, h: 1.75, uv: hubUV(2 + (i % 5) * 100, 506 + Math.floor(i / 5) * 152, 96, 144) };
      hubWallQuad(K, B.panels, q, 0, 1, 0, 1, G.tube, 0.95);
    });
    const wu = this.wallMat.uniforms;
    this.wallGlows.forEach(([ang, y, w, h], k) => wu.uGlowPos.value[k].set(ang, y, 1 / Math.pow(0.6 * w, 2), 1 / Math.pow(0.9 * h, 2)));
    this.wallGlows = this.wallGlows.map(([, , , , col, g, amt]) => ({ c: new THREE.Color(col).multiplyScalar(amt), g }));
  }
  cabAngle(i) { return (i - (CABINETS.length - 1) / 2) * HUB_STEP; }
  // A cabinet: painted glossy sides with racing stripes and glowing T-molding,
  // a backlit marquee, a CRT in a bezel, lit buttons and coin slots, and the
  // ceiling lamp whose beam falls on it.
  makeCabinet(cab, i, B, K) {
    const a = this.cabAngle(i);
    const base = hubM(Math.sin(a) * HUB_R, 0, -Math.cos(a) * HUB_R, 0, -a);
    const at = (...args) => base.clone().multiply(hubM(...args));
    const g = HUB_G.cab + i;
    const col = new THREE.Color(cab.color);
    const W = 2.2, T = 0.07, IW = W - 2 * T;
    const GLOSS = [0.25, 0.24], SATIN = [0.3, 0.36], METAL = [1, 0.2], CHROME = 0xd2d0e4;
    [W / 2, -W / 2 + T].forEach((xo) => B.lit.add(K.get("side", () => hubPrism(HUB_SIDE, T)), at(xo, 0, 0, 0, -Math.PI / 2), col, { k: 0.3, aux: GLOSS }));
    B.lit.add(K.get("body", () => hubPrism(HUB_BODY, IW + 0.004)), at(IW / 2 + 0.002, 0, 0, 0, -Math.PI / 2), 0x0c0816, { aux: SATIN });
    [-1, 1].forEach((sx) => {
      [[-0.17, 0.11, col, 0.85], [0, 0.055, 0xffffff, 0.8], [0.17, 0.035, col, 0.85]].forEach(([o, w, c, k]) => {
        K.box(B.lit, 0.006, 2, w, at(sx * (W / 2 + 0.003), 2 + o * 0.5, o * 0.866, -0.5236), c, { k, aux: GLOSS });
      });
    });
    const TM = 0.034;
    for (let k = 1; k < 9; k++) {
      const f = hubFace(HUB_SIDE[k], HUB_SIDE[k + 1], 0.5, TM / 2 - 0.008);
      [-1, 1].forEach((sx) => K.box(B.glow, 0.044, f.len + TM, TM, at(sx * (W / 2 - T / 2), f.y, f.z, f.rx), col, { k: 2.1, g }));
    }
    // kick plate, coin door with lit slots, stripes either side
    const zf = HUB_BODY[1][0];
    K.box(B.lit, IW, 0.16, 0.03, at(0, 0.08, zf + 0.015), CHROME, { aux: METAL });
    K.box(B.lit, 0.7, 0.68, 0.02, at(0, 0.62, zf + 0.01), CHROME, { aux: METAL });
    K.box(B.lit, 0.62, 0.6, 0.03, at(0, 0.62, zf + 0.018), 0x23212c, { aux: [0.85, 0.32] });
    [-0.13, 0.13].forEach((x) => {
      K.box(B.glow, 0.05, 0.13, 0.012, at(x, 0.76, zf + 0.036), 0xff5a2a, { k: 2.4, g });
      K.box(B.glow, 0.1, 0.07, 0.012, at(x, 0.46, zf + 0.036), 0xffb13a, { k: 1.1, g });
    });
    [-0.74, 0.74].forEach((x) => K.box(B.lit, 0.16, 0.92, 0.008, at(x, 0.6, zf + 0.004), col, { k: 0.7, aux: GLOSS }));
    // control panel: chrome lip, coloured overlay, joystick, buttons
    const lip = hubFace(HUB_BODY[3], HUB_BODY[4], 0.5, 0.006);
    K.box(B.lit, IW, lip.len, 0.012, at(0, lip.y, lip.z, lip.rx), CHROME, { aux: METAL });
    const top = hubFace(HUB_BODY[4], HUB_BODY[5], 0.5, 0.006);
    K.box(B.lit, IW, top.len, 0.012, at(0, top.y, top.z, top.rx), col, { k: 0.42, aux: [0.15, 0.3] });
    const onPanel = (x, s, h) => {
      const f = hubFace(HUB_BODY[4], HUB_BODY[5], s, 0.012 + h / 2);
      return at(x, f.y, f.z, f.rx).multiply(hubM(0, 0, 0, Math.PI / 2));
    };
    B.lit.add(K.get("stickBase", () => new THREE.CylinderGeometry(0.11, 0.11, 0.012, 14)), onPanel(-0.55, 0.5, 0.012), 0x111018, { aux: SATIN });
    B.lit.add(K.get("shaft", () => new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8)), onPanel(-0.55, 0.5, 0.22), CHROME, { aux: METAL });
    B.lit.add(K.get("ball", () => new THREE.SphereGeometry(0.075, 12, 9)), onPanel(-0.55, 0.5, 0.46), 0xff2346, { aux: [0, 0.14] });
    const BTN = [COLORS.cyan, COLORS.magenta, COLORS.yellow, COLORS.lime, COLORS.red, COLORS.orange];
    [[0, 0.64], [0.24, 0.64], [0.48, 0.64], [0.06, 0.36], [0.3, 0.36], [0.54, 0.36]].forEach(([x, s], k) => {
      B.glow.add(K.get("button", () => new THREE.CylinderGeometry(0.066, 0.066, 0.05, 14)), onPanel(x, s, 0.05), BTN[k], { k: 1.5, g });
    });
    [-0.2, 0.2].forEach((x) => B.glow.add(K.get("start", () => new THREE.CylinderGeometry(0.04, 0.04, 0.04, 10)), onPanel(x, 0.88, 0.04), 0xffffff, { k: 1.4, g }));
    // marquee in its lightbox, and the light leaking under it
    const mf = hubFace(HUB_BODY[7], HUB_BODY[8], 0.5, 0.005);
    K.quad(B.marq, IW - 0.04, 0.67, at(0, mf.y, mf.z, mf.rx), 0xffffff, { k: 1.12, g, uv: hubUV(0, i * 170, 512, 170) });
    const sp = hubFace(HUB_BODY[6], HUB_BODY[7], 0.62, 0.004);
    K.quad(B.glow, IW - 0.12, sp.len * 0.3, at(0, sp.y, sp.z, sp.rx), col, { k: 0.9, g });
    // the CRT
    const canvas = document.createElement("canvas");
    canvas.width = 320; // drawn in 160 x 120 units at 2x, so the attract text is legible
    canvas.height = 240;
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    this.texs.push(tex);
    const mat = hubScreenMaterial(tex, cab.color);
    const sf = hubFace(HUB_BODY[5], HUB_BODY[6], 0.5, 0.005);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.5), mat);
    screen.applyMatrix4(at(0, sf.y, sf.z, sf.rx));
    this.scene.add(screen);
    // what makes this cabinet unlike the other five (see 11b-hubextras.js)
    hubCabinetStyle(cab.id, { K, B, at, onPanel, g, col, zf });
    // the ceiling lamp, its beam, and the dust drifting in it
    const lamp = new THREE.Vector3(0, HUB_CEIL - 0.32, 1.15).applyMatrix4(base);
    const foot = new THREE.Vector3(0, 0, 0.5).applyMatrix4(base);
    const dir = lamp.clone().sub(foot);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const one = new THREE.Vector3(1, 1, 1);
    const coneCol = new THREE.Color(0xfff1e6).lerp(col, 0.4);
    B.cones.add(K.get("cone", () => new THREE.CylinderGeometry(0.2, 1.75, len, 28, 1, true)), new THREE.Matrix4().compose(foot.clone().addScaledVector(dir, 0.5), q, one), coneCol, { k: 0.46, g });
    const lampM = new THREE.Matrix4().compose(lamp.clone().addScaledVector(dir, 0.18 / len), q, one);
    B.lit.add(K.get("can", () => new THREE.CylinderGeometry(0.2, 0.26, 0.42, 14)), lampM.clone(), 0x1a1724, { aux: [0.8, 0.35] });
    B.glow.add(K.get("lens", () => new THREE.CircleGeometry(0.2, 14)), lampM.clone().multiply(hubM(0, -0.215, 0, Math.PI / 2)), 0xfff1e0, { k: 3, g });
    const D = this.dustPts;
    for (let k = 0; k < 46; k++) {
      const h = rand(0.46, 0.92), rr = Math.sqrt(Math.random()) * 0.9, ph = rand(Math.PI * 2);
      const R = lerp(1.75, 0.2, h) * rr;
      const p = foot.clone().addScaledVector(dir, h);
      D.p.push(p.x + Math.cos(ph) * R, p.y, p.z + Math.sin(ph) * R);
      D.x.push(Math.random(), rr);
      D.g.push(g);
    }
    const demo = { canvas, ctx: canvas.getContext("2d"), tex, t: Math.random() * 10, cab };
    drawDemo(demo, 0);
    return { demo, mat, scr: { power: 1, target: 1 }, color: col, coneCol, focus: i === this.sel ? 1 : 0 };
  }
  // A row of attract-mode machines, claw machines and pinball tables along the wall.
  addMachines(B, K) {
    const pattern = "uuucuuppuuuucuuuppuuucuuuuppuuc";
    const end = 2.45;
    let ang = -end, k = 0;
    for (;;) {
      const type = pattern[k % pattern.length];
      const half = (type === "u" ? 0.9 : type === "c" ? 0.82 : 0.42) / HUB_BG_R;
      if (ang + 2 * half > end) break;
      ang += half;
      this.makeMachine(type, ang, k, B, K);
      ang += half + 0.24 / HUB_BG_R;
      k++;
    }
  }
  makeMachine(type, ang, k, B, K) {
    const base = hubM(Math.sin(ang) * HUB_BG_R, 0, -Math.cos(ang) * HUB_BG_R, 0, -ang);
    const at = (...args) => base.clone().multiply(hubM(...args));
    const g = HUB_G.bg;
    const col = new THREE.Color(HUB_PALETTE[(k * 3 + (k >> 2)) % HUB_PALETTE.length]);
    const GLOSS = [0.3, 0.3], METAL = [1, 0.22], CHROME = 0xd2d0e4;
    const seed = Math.random();
    const title = (k * 5) % HUB_TITLES.length;
    const tUV = hubUV(512 + (title % 2) * 256, Math.floor(title / 2) * 64, 256, 64);
    if (type === "u") {
      const W = 1.8;
      B.lit.add(K.get("mini", () => hubPrism(HUB_MINI, W)), at(W / 2, 0, 0, 0, -Math.PI / 2), col, { k: 0.16, aux: GLOSS });
      [[1, 2], [3, 4], [4, 5], [5, 6], [7, 8], [8, 9]].forEach(([p, q]) => {
        const f = hubFace(HUB_MINI[p], HUB_MINI[q], 0.5, 0.012);
        [-1, 1].forEach((sx) => K.box(B.glow, 0.05, f.len + 0.03, 0.03, at(sx * (W / 2 - 0.02), f.y, f.z, f.rx), col, { k: 1.5, g }));
      });
      const cp = hubFace(HUB_MINI[4], HUB_MINI[5], 0.5, 0.006);
      K.box(B.lit, W - 0.1, cp.len, 0.012, at(0, cp.y, cp.z, cp.rx), col, { k: 0.4, aux: GLOSS });
      const sf = hubFace(HUB_MINI[5], HUB_MINI[6], 0.5, 0.005);
      K.quad(B.screens, 1.42, 1.08, at(0, sf.y, sf.z, sf.rx), 0xffffff, { aux: [seed, 0], g });
      const mf = hubFace(HUB_MINI[7], HUB_MINI[8], 0.5, 0.005);
      K.quad(B.marq, 1.66, 0.46, at(0, mf.y, mf.z, mf.rx), 0xffffff, { k: 1.35, g, uv: tUV });
    } else if (type === "c") {
      // claw machine: lit cabinet, glass case of plush prizes, the claw
      K.box(B.lit, 1.5, 1.05, 1.35, at(0, 0.525, 0), col, { k: 0.3, aux: GLOSS });
      K.box(B.glow, 1.42, 0.05, 0.02, at(0, 0.92, 0.68), col, { k: 1.8, g });
      K.box(B.lit, 0.42, 0.34, 0.03, at(0.35, 0.5, 0.68), 0x111018, { aux: [0.2, 0.5] });
      [[-0.72, -0.64], [0.72, -0.64], [-0.72, 0.64], [0.72, 0.64]].forEach(([x, z]) => K.box(B.lit, 0.06, 1.55, 0.06, at(x, 1.82, z), CHROME, { aux: METAL }));
      K.box(B.lit, 1.6, 0.48, 1.45, at(0, 2.84, 0), col, { k: 0.3, aux: GLOSS });
      K.box(B.glow, 1.3, 0.025, 1.1, at(0, 2.59, 0), 0xffffff, { k: 2.2, g });
      K.quad(B.marq, 1.5, 0.4, at(0, 2.84, 0.73), 0xffffff, { k: 1.35, g, uv: tUV });
      for (let p = 0; p < 11; p++) {
        const r = rand(0.12, 0.17);
        B.lit.add(K.get("plush", () => new THREE.SphereGeometry(1, 7, 5)), at(rand(-0.5, 0.5), 1.15 + rand(0, 0.3), rand(-0.45, 0.45)).scale(new THREE.Vector3(r, r, r)), pick(HUB_PALETTE), { k: 0.75, aux: [0, 0.85] });
      }
      B.lit.add(K.get("cable", () => new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5)), at(0.1, 2.33, 0.1), CHROME, { aux: METAL });
      B.lit.add(K.get("claw", () => new THREE.SphereGeometry(0.09, 8, 6)), at(0.1, 2.05, 0.1), CHROME, { aux: METAL });
    } else {
      // pinball table: legs, tilted body with a twinkling playfield, backbox
      [[-0.32, 0.65], [0.32, 0.65], [-0.32, -0.62], [0.32, -0.62]].forEach(([x, z]) => K.box(B.lit, 0.06, 0.78, 0.06, at(x, 0.39, z), CHROME, { aux: METAL }));
      K.box(B.lit, 0.76, 0.32, 1.5, at(0, 0.93, 0, 0.1), col, { k: 0.25, aux: GLOSS });
      K.quad(B.screens, 0.66, 1.38, at(0, 1.095, 0.016, 0.1 - Math.PI / 2), 0xffffff, { aux: [seed, 1], g });
      K.box(B.lit, 0.8, 0.82, 0.22, at(0, 1.62, -0.72), col, { k: 0.22, aux: GLOSS });
      K.quad(B.screens, 0.68, 0.6, at(0, 1.66, -0.605), 0xffffff, { aux: [seed, 2], g });
      [-1, 1].forEach((sx) => K.box(B.glow, 0.03, 0.03, 1.5, at(sx * 0.38, 1.09, 0, 0.1), col, { k: 1.6, g }));
    }
  }
  // The first visit of a session powers the room on, piece by piece.
  powerOn() {
    this.lights.forEach((l) => l.parts.forEach((p) => p.off()));
    this.room = 0.15;
    this.introRunning = true;
    this.introLook = 5.2;
    this.tw.add(2.9, (k) => { this.introLook = 5.2 * (1 - k); }, null, Ease.inOutQuad);
    this.dolly = -8;
    this.zooming = true;
    const from = this.dolly;
    this.tw.add(2.8, (k) => { this.dolly = lerp(from, this.restDolly, k); }, () => { this.zooming = false; this.introRunning = false; }, Ease.inOutQuad);
    let t = 0.25;
    this.lights.forEach((l) => {
      this.tw.wait(t, () => {
        if (!this.introRunning) return;
        l.parts.forEach((p) => p.on());
        Sound.sfx(l.kind === "cab" ? "clunk" : "buzz");
      });
      t += l.kind === "cab" ? 0.16 : 0.2;
    });
  }
  skipIntro() {
    if (!this.introRunning) return;
    this.introRunning = false;
    this.lights.forEach((l) => l.parts.forEach((p) => p.on()));
    this.tw.clear();
    this.zooming = false;
    this.dolly = this.restDolly;
  }
  focus(i) { this.sel = i; }
  // Back the camera off until the whole cabinet fits in the strip above the card.
  onResize(w, h) {
    if (!this.camera) return;
    const bandH = this.band ? this.band.h : h;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const need = (4.6 * h) / (2 * tanH * Math.max(80, bandH));
    this.restDolly = clamp(HUB_R - need, -5, 1.6);
    if (!this.zooming) this.dolly = this.restDolly;
    if (this.dust) this.dust.material.uniforms.uScale.value = (h * GFX.scenePR()) / (2 * tanH);
  }
  zoomIn(done) {
    Sound.sfx("swoosh");
    this.zooming = true;
    const from = this.dolly;
    this.tw.add(0.75, (k) => { this.dolly = lerp(from, HUB_R - 2.6, k); }, done, Ease.inCubic);
  }
  zoomOut() {
    const from = this.dolly;
    this.zooming = true;
    this.tw.add(0.6, (k) => { this.dolly = lerp(from, this.restDolly, k); }, () => { this.zooming = false; });
  }
  update(dt) {
    super.update(dt);
    if (!this.has3D) return;
    const target = this.cabAngle(this.sel);
    // A dolly move between cabinets: a damped spring eases out and in, and the camera
    // draws back a little on the way across.
    const h = Math.min(dt, 0.05);
    this.angV = (this.angV || 0) + ((target - this.angle) * 46 - (this.angV || 0) * 13.6) * h;
    this.angle += this.angV * h;
    const travel = this.zooming || this.introRunning ? 0 : smoothstep(0, HUB_STEP * 0.7, Math.abs(target - this.angle));
    const a = this.angle;
    // Lean the view toward the finger / mouse a little: the room feels like a place.
    const pa = a + Pointer.x * 0.07;
    const dol = this.dolly - travel * 1.5;
    this.camBase.set(Math.sin(a) * dol, 2.3 + Math.sin(this.t * 0.8) * 0.04 - Pointer.y * 0.15 + travel * 0.18, -Math.cos(a) * dol);
    this.lookAt.set(Math.sin(pa) * HUB_R, 2.15 - Pointer.y * 0.9 + (this.introRunning ? this.introLook : 0), -Math.cos(pa) * HUB_R);
    this.placeCamera();
    // Old neon flickers now and then.
    this.flickT -= dt;
    if (this.flickT < 0 && !this.introRunning && this.lights.length) {
      const l = pick(this.lights.filter((x) => x.kind !== "cab" && x.kind !== "bg"));
      if (l) {
        l.parts.forEach((p) => p.off());
        this.tw.wait(0.07, () => l.parts.forEach((p) => p.on()));
        this.tw.wait(0.16, () => l.parts.forEach((p) => p.off()));
        this.tw.wait(0.22, () => l.parts.forEach((p) => p.on()));
      }
      this.flickT = rand(4, 11);
    }
    this.updateLights(dt, a);
    // the lasers come on once the room has power, then sweep slowly
    const lf = this.introRunning ? 0 : 1;
    this.lasers.forEach((b) => {
      const u = b.userData, sw = u.az + Math.sin(this.t * 0.31 + u.ph) * 0.55, reach = 15.5 + Math.sin(this.t * 0.23 + u.ph * 2) * 2;
      u.to.set(Math.sin(sw) * reach, 0.05, -Math.cos(sw) * reach);
      aimBeam(b, u.from, u.to, 0.035);
      const f = b.material.uniforms.uFade;
      f.value += (lf * 0.55 - f.value) * Math.min(1, dt * 1.5);
      b.material.uniforms.uTime.value = this.t;
    });
    // CRTs warm up when switched on. The demos are canvas drawings re-uploaded as
    // textures, so they run at a fixed retro rate whatever the screen's refresh
    // rate: 30 fps on the selected cabinet, 8 fps (staggered) on the others.
    const lean = GFX.ok && GFX.Q[GFX.qi].cheap; // the weakest quality levels redraw the demos half as often
    this.cabs.forEach((c, i) => {
      const sc = c.scr;
      sc.power = sc.target > 0 ? Math.min(1, sc.power + dt * 2.6) : 0;
      c.mat.uniforms.uPower.value = sc.power;
      c.mat.uniforms.uGain.value = 0.8 + 0.3 * c.focus;
      c.demo.t += dt;
      c.demo.wait = (c.demo.wait === undefined ? i / 40 : c.demo.wait) - dt;
      if (sc.power > 0 && c.demo.wait <= 0) {
        drawDemo(c.demo, dt);
        c.demo.wait += (i === this.sel ? 1 / 30 : 1 / 8) * (lean ? 2 : 1);
        if (c.demo.wait < 0) c.demo.wait = 0;
      }
    });
    this.extras.update(dt);
    FX.sync(this.scene, this.t);
  }
  // Turn lamp states into light: neon levels, the room's real lights, and the
  // light that the floor, wall and ceiling fake.
  updateLights(dt, a) {
    const G = HUB_G, on = this.on, lv = this.lv;
    for (let g = 0; g < HUB_NG; g++) lv[g] = on[g];
    this.buzzT -= dt;
    if (this.buzzT < 0) {
      this.buzzOn = !this.buzzOn;
      this.buzzT = this.buzzOn ? rand(0.8, 6) : rand(0.04, 0.16);
    }
    lv[G.signC] = on[G.sign] * (this.buzzOn || REDUCED_MOTION ? 1 : 0.1);
    let cabsOn = 0;
    this.cabs.forEach((c, i) => {
      c.focus += ((i === this.sel ? 1 : 0) - c.focus) * Math.min(1, dt * 4);
      cabsOn += on[G.cab + i];
      lv[G.cab + i] = on[G.cab + i] * (0.78 + 0.3 * c.focus + (i === this.sel ? 0.05 * Math.sin(this.t * 3.2) : 0));
    });
    const goal = 0.18 + 0.32 * on[G.tube] + (0.2 * (on[G.ring] + on[G.ring + 1] + on[G.ring + 2])) / 3 + (0.3 * cabsOn) / this.cabs.length;
    this.room += (goal - this.room) * Math.min(1, dt * 3);
    const room = this.room;
    this.hemi.intensity = 0.62 * room;
    this.key.intensity = 0.5 * room;
    const sc = this.cabs[this.sel];
    this.lightCol.lerp(sc.color, Math.min(1, dt * 5));
    this.screenLight.color.copy(this.lightCol);
    this.screenLight.intensity = 1.8 * sc.scr.power * (0.93 + 0.07 * Math.sin(this.t * 15));
    this.screenLight.position.set(Math.sin(a) * (HUB_R - 1.45), 2.4, -Math.cos(a) * (HUB_R - 1.45));
    this.topLight.intensity = 1.1 * lv[G.cab + this.sel];
    this.topLight.position.set(Math.sin(a) * (HUB_R - 2.3), 6.6, -Math.cos(a) * (HUB_R - 2.3));
    const fu = this.floorMat.uniforms;
    fu.uReflect.value = GFX.lite ? 0 : 1;
    fu.uBlack.value = lv[G.tube];
    fu.uInlay.value = lv[G.tube];
    fu.uRoom.value = room;
    fu.uBg.value = lv[G.bg];
    this.cabs.forEach((c, i) => {
      fu.uPoolCol.value[i].copy(c.color).multiplyScalar(0.5 * c.scr.power * lv[G.cab + i]);
      fu.uConeCol.value[i].copy(c.coneCol).multiplyScalar(0.3 * lv[G.cab + i]);
    });
    const wu = this.wallMat.uniforms;
    this.ringCols.forEach((c, k) => wu.uRingCol.value[k].copy(c).multiplyScalar(lv[G.ring + k]));
    wu.uRoom.value = room;
    this.wallGlows.forEach((w, k) => wu.uGlowCol.value[k].copy(w.c).multiplyScalar(lv[w.g]));
    this.ceilMat.uniforms.uGlow.value.copy(this.tubeTint).multiplyScalar(lv[G.tube]);
    this.ceilMat.uniforms.uStars.value = room;
    this.marqMat.uniforms.uSel.value = G.cab + this.sel;
    this.marqMat.uniforms.uSelV.value = 1 - ((this.sel + 0.5) * 170) / 1024;
  }
  refreshWall() {
    const sig = hubWallSig();
    if (!this.wallTex || sig === this.wallSig) return;
    this.wallSig = sig;
    this.wallTex.image = hubWallAtlas().canvas;
    this.wallTex.needsUpdate = true;
  }
  dispose() {
    this.disposed = true;
    super.dispose();
    if (this.texs) this.texs.forEach((t) => t.dispose());
  }
}

// Tiny attract demos drawn on each cabinet's screen.
function drawDemo(d, dt) {
  const x = d.ctx, W = 160, H = 120, t = d.t, c = d.cab.color;
  x.setTransform(d.canvas.width / 160, 0, 0, d.canvas.height / 120, 0, 0);
  x.fillStyle = "#07021a";
  x.fillRect(0, 0, W, H);
  x.font = '10px "Press Start 2P", monospace';
  x.textAlign = "center";
  switch (d.cab.id) {
    case "blaster": {
      x.fillStyle = "#fff";
      for (let i = 0; i < 40; i++) { const k = (i * 37.7 + t * 40 * (1 + (i % 3))) % 160; x.fillRect((i * 53) % W, k * 0.75, 1, 1 + (i % 2)); }
      SLOT_COLORS.forEach((col, i) => {
        const s = 6 + ((t * 0.35 + i * 0.25) % 1) * 18;
        x.fillStyle = col;
        x.fillRect(40 + (i % 2) * 80 - s / 2, 30 + Math.floor(i / 2) * 34 - s / 2, s, s);
      });
      x.fillStyle = COLORS.cyan;
      x.beginPath(); x.moveTo(80, 96); x.lineTo(70, 112); x.lineTo(90, 112); x.fill();
      if (Math.floor(t * 3) % 2) { x.fillStyle = COLORS.yellow; x.fillRect(79, 40, 2, 56); }
      break;
    }
    case "racer": {
      x.fillStyle = "#2a0b52"; x.fillRect(0, 50, W, 70);
      x.fillStyle = COLORS.yellow; x.beginPath(); x.arc(80, 50, 20, Math.PI, 0); x.fill();
      x.strokeStyle = COLORS.magenta;
      for (let i = 0; i < 8; i++) { const yy = 50 + Math.pow(((i / 8 + t * 0.6) % 1), 2) * 70; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
      x.strokeStyle = COLORS.cyan;
      [-1, -0.5, 0, 0.5, 1].forEach((k) => { x.beginPath(); x.moveTo(80 + k * 6, 50); x.lineTo(80 + k * 90, 120); x.stroke(); });
      const lane = Math.floor(t / 1.5) % 4;
      x.fillStyle = COLORS.red; x.fillRect(80 + (lane - 1.5) * 26 - 9, 100, 18, 10);
      x.fillStyle = COLORS.lime; x.fillText("$" + Math.floor(25 + t * 9) + "K", 80, 16);
      break;
    }
    case "boss": {
      const bob = Math.sin(t * 3) * 3;
      x.fillStyle = COLORS.magenta; x.fillRect(50, 26 + bob, 60, 50);
      x.fillStyle = "#07021a"; x.fillRect(60, 40 + bob, 12, 8); x.fillRect(88, 40 + bob, 12, 8);
      x.fillStyle = COLORS.yellow; x.fillRect(64, 42 + bob, 4, 4); x.fillRect(92, 42 + bob, 4, 4);
      x.fillStyle = "#07021a"; for (let i = 0; i < 5; i++) x.fillRect(58 + i * 10, 62 + bob, 6, 6);
      x.fillStyle = "#333"; x.fillRect(20, 8, 120, 6);
      x.fillStyle = COLORS.red; x.fillRect(20, 8, 120 * (0.3 + 0.7 * (1 - ((t * 0.15) % 1))), 6);
      if (Math.floor(t * 2) % 3 === 0) { x.fillStyle = COLORS.cyan; x.fillRect(78, 80, 4, 30); }
      break;
    }
    case "memory": {
      const flip = Math.abs(Math.cos(t * 1.2));
      x.fillStyle = Math.cos(t * 1.2) > 0 ? COLORS.lime : COLORS.cyan;
      x.fillRect(80 - 50 * flip, 24, 100 * flip, 64);
      x.fillStyle = "#07021a";
      if (flip > 0.4) { x.fillRect(80 - 34 * flip, 44, 68 * flip, 6); x.fillRect(80 - 26 * flip, 60, 52 * flip, 6); }
      x.fillStyle = COLORS.gold;
      for (let i = 0; i < 6; i++) { const yy = ((t * 30 + i * 22) % 110); x.fillRect(12 + (i % 2) * 130, yy, 6, 6); }
      break;
    }
    case "exam": {
      x.fillStyle = "#e8e2ff"; x.fillRect(30, 8, 100, 104);
      x.fillStyle = "#07021a";
      const filled = Math.floor(t * 2) % 10;
      for (let r = 0; r < 9; r++) for (let k = 0; k < 4; k++) {
        const on = r < filled && (r * 7 + 3) % 4 === k;
        x.beginPath(); x.arc(56 + k * 18, 18 + r * 10.5, 3, 0, Math.PI * 2);
        if (on) x.fill(); else { x.strokeStyle = "#5b4b9a"; x.stroke(); }
      }
      x.fillStyle = COLORS.violet; for (let r = 0; r < 9; r++) x.fillRect(36, 16 + r * 10.5, 8, 4);
      break;
    }
    default: {
      x.fillStyle = COLORS.orange;
      x.textAlign = "left";
      const lines = ["STAGE 1..11", "OBJECTIVES", "KEY RULES", "EXAM TIPS", "SEARCH", "NUMBERS", "TERMS"];
      for (let i = 0; i < 12; i++) {
        const yy = 16 + i * 12 - ((t * 10) % 12);
        x.fillStyle = i % 3 === 0 ? COLORS.orange : "#bfb3ff";
        x.fillText(lines[i % lines.length], 14, yy);
      }
    }
  }
  if (Math.floor(t * 1.4) % 2 === 0) {
    x.fillStyle = "rgba(7, 2, 26, 0.85)"; // a dark plate, so the words read over any demo
    x.fillRect(20, 103, 120, 15);
    x.fillStyle = c;
    x.textAlign = "center";
    x.fillText("PRESS START", 80, 115);
  }
  d.tex.needsUpdate = true;
}

const Hub = { index: 0 };

// The suggested next step through the book: for each stage in order, read the
// notes, bank the flashcards, blast the questions, beat the boss. Then the exam.
function nextMission() {
  for (const c of CHAPTERS) {
    if (!c.qids.length) continue;
    if (!Store.state.read[c.n]) return { kind: "read", ch: c.n, text: `READ STAGE ${c.n} NOTES` };
    if (Store.countSeen(c.fids) < c.fids.length * 0.6) return { kind: "memory", ch: c.n, text: `BANK STAGE ${c.n} CARDS` };
    if (Store.masteryOf(c.qids) < 0.34) return { kind: "blaster", ch: c.n, text: `BLAST STAGE ${c.n}` };
    if (!(Store.state.boss[c.n] > 0)) return { kind: "boss", ch: c.n, text: `BEAT ${BOSSES[c.n].name}` };
  }
  if ((Store.state.stats.bestExam || 0) < 60) return { kind: "exam", text: "PASS THE FINAL EXAM" };
  if (weakIds(ALL_QIDS).length) return { kind: "blaster", ch: "weak", text: "CLEAR YOUR WEAK SPOTS" };
  return { kind: "racer", ch: "all", text: "RETIRE A MILLIONAIRE" };
}
function runMission(m) {
  UI.flash("crt-on");
  if (m.kind === "read") showGuide(m.ch);
  else if (m.kind === "exam") showExamSetup();
  else startGame(m.kind, makeSelection(String(m.ch)));
}

function overallMastery() {
  return mpct(Store.masteryOf(ALL_QIDS.concat(ALL_FIDS)));
}

// What the wall shows: best scores, rank and boss stars.
function hubWallSig() {
  const sc = Store.state.scores;
  return JSON.stringify([["blaster", "racer", "boss", "exam"].map((g) => (sc[g] && sc[g][0]) || 0), rankOf(xpTotal()), Store.state.boss]);
}

// The arcade floor is built once and kept while you play, so coming back from a
// game is instant: no rebuild, no shader compiles, no long frame.
function hubScene() {
  if (Scenes.cur instanceof HubScene) return Scenes.cur;
  if (!Hub.scene || Hub.scene.disposed) Hub.scene = new HubScene();
  else Hub.scene.refreshWall();
  return Scenes.set(Hub.scene);
}

function showHub() {
  Sound.play("hub");
  Sound.setIntensity(0);
  const fresh = !(Scenes.cur instanceof HubScene);
  const scene = hubScene();
  if (fresh && !Hub.poweredOn && scene.has3D) {
    Hub.poweredOn = true;
    scene.powerOn();
    setTimeout(() => Sound.ambience(true), 2600);
  } else {
    scene.zoomOut();
    Sound.ambience(true);
  }
  const el = UI.el(`<section class="screen scr-hub">
    <header class="topbar">
      ${rankChip()}
      <span class="grow"></span>
      <span class="chip wide-only">MASTERY <b data-m>${overallMastery()}%</b></span>
      ${document.fullscreenEnabled ? `<button class="iconbtn" data-act="fullscreen" aria-label="Full screen">${icon("full")}</button>` : ""}
      <button class="iconbtn" data-act="stats">STATS</button>
      <button class="iconbtn" data-act="settings">SETUP</button>
      ${soundBtn()}
    </header>
    <button class="mission" data-act="mission"><span class="label">NEXT MISSION</span><span data-mission></span>${icon("play")}</button>
    <div class="spacer"></div>
    <div class="hub-card" data-card></div>
  </section>`);
  const card = $("[data-card]", el);
  const render = () => {
    const cab = CABINETS[Hub.index];
    card.style.setProperty("--c", cab.color);
    const best = Store.best(cab.id);
    const meta = {
      blaster: `HI-SCORE <b>${fmtScore(best)}</b>`,
      racer: `BEST NEST EGG <b>${money(best)}</b>`,
      boss: `BOSSES BEATEN <b>${Object.values(Store.state.boss).filter((v) => v > 0).length}/12</b>`,
      memory: `CARDS BANKED <b>${Store.countMastered(ALL_FIDS)}/${ALL_FIDS.length}</b>`,
      exam: `BEST EXAM <b>${Store.state.stats.bestExam || 0}%</b>`,
      guide: `${CHAPTERS.reduce((s, c) => s + c.guide.length, 0)} <b>NOTE PAGES</b>`,
    }[cab.id];
    card.innerHTML = `<div class="hub-nav">
        <button class="iconbtn" data-act="prev" aria-label="Previous cabinet">${icon("left")}</button>
        <div><div class="hub-name">${esc(cab.name)}</div><div class="hub-tag">${esc(cab.tag)}</div></div>
        <button class="iconbtn" data-act="next" aria-label="Next cabinet">${icon("right")}</button>
      </div>
      <p class="hub-desc">${esc(cab.desc)}</p>
      <div class="hub-meta"><span>${meta}</span><span>${Hub.index + 1}/${CABINETS.length}</span></div>
      <button class="btn" data-act="play">${cab.id === "guide" ? "OPEN GUIDE" : "PLAY"} ${icon("play")}</button>
      <div class="dots">${CABINETS.map((_, i) => `<i class="${i === Hub.index ? "on" : ""}"></i>`).join("")}</div>`;
    scene.focus(Hub.index);
    requestAnimationFrame(() => scene.setBand($(".spacer", el)));
  };
  const move = (d) => {
    Hub.index = (Hub.index + d + CABINETS.length) % CABINETS.length;
    Sound.sfx("move", d * 0.7);
    render();
  };
  const play = () => {
    const cab = CABINETS[Hub.index];
    Sound.sfx("select");
    scene.zoomIn();
    setTimeout(() => {
      UI.flash("crt-on");
      if (cab.id === "guide") showGuide();
      else if (cab.id === "exam") showExamSetup();
      else showSelect(cab.id);
    }, 520);
  };
  render();
  Trophies.check();
  // swipe across the floor to walk to the next cabinet
  const floor = $(".spacer", el);
  let swipeX = null;
  floor.addEventListener("pointerdown", (e) => { if (e.isPrimary) swipeX = e.clientX; });
  floor.addEventListener("pointerup", (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 36) move(dx < 0 ? 1 : -1);
  });
  floor.addEventListener("pointercancel", () => { swipeX = null; });
  const mission = nextMission();
  $("[data-mission]", el).textContent = mission.text;
  let sx = null;
  const down = (e) => { sx = e.clientX; };
  const up = (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50 && !card.contains(e.target)) move(dx < 0 ? 1 : -1);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerdown", () => scene.skipIntro && scene.skipIntro());
  el.addEventListener("pointerup", up);
  const off = Store.onChange(() => { const m = $("[data-m]", el); if (m) m.textContent = overallMastery() + "%"; });
  UI.show({
    el,
    on: (a, t) => {
      if (a === "prev") move(-1);
      if (a === "next") move(1);
      if (a === "play") play();
      if (a === "mission") { Sound.sfx("select"); runMission(mission); }
      if (a === "stats") { Sound.sfx("select"); showStats(); }
      if (a === "settings") { Sound.sfx("select"); showSettings(); }
      if (a === "mute") { toggleMute(); t.outerHTML = soundBtn(); Sound.ambience(Store.settings.sfx); }
      if (a === "fullscreen") {
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen().catch(() => UI.toast("FULL SCREEN ISN'T ALLOWED HERE"));
        } catch (e) { UI.toast("FULL SCREEN ISN'T ALLOWED HERE"); }
      }
    },
    key: (e) => {
      if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); }
      else if (e.key === "Escape") showTitle();
    },
    destroy: () => { off(); scene.setBand(null); },
  });
}
