// Risk Blaster's world: open deep space. No walls: a sky of drifting nebulae that the
// ship is always flying into, three depths of stars, a ringed giant, a bright star with
// its lens flare, galaxies, clouds and rocks that pass by, and the big things each
// region is known by (a station, a field of wrecks, a wormhole gate). A wave travels
// through two regions; the sky, the fog and the light blend from one to the next.
// Look only: nothing here reads or changes the score, shields, timer or the questions.

// The regions, in the order a run travels through them. Colours: a, b, c are the nebula's
// own (blended by its texture), gold is its bright heart.
// Only a window of about 30 by 27 degrees round the way ahead is ever seen (the band between
// the question and the answers), and the enemy fills its middle: so the star (sun: degrees
// right, degrees up) and the giant (planet: degrees right, degrees up, distance, radius)
// are placed in the frame round it.
const SPACE_REGIONS = [
  { id: "nebula", name: "NEBULA", base: 0x030418, a: 0x2334d8, b: 0x2aa8ff, c: 0x7a5cff, gold: 0xffc46a, neb: 1.25, stars: 1.1, fog: 0x050826, amb: 0x5e6ed0, key: 0xdce6ff,
    sun: [-9.5, 9.5], sunCol: 0xffe6c0, sunK: 0.75, planet: [10.5, 9, 1500, 62], clouds: 1, cloudA: 0x2a3fff, cloudB: 0x35c8ff, rocks: 0.1, rockTint: 0x5a6a9a,
    streak: 0xd9c8ff, traffic: { freighter: 2, tanker: 1, cruiser: 0, fighter: 3, drone: 2, shuttle: 2 } },
  { id: "belt", name: "ASTEROID BELT", base: 0x0a0406, a: 0x8a3a12, b: 0xff9a2a, c: 0xffd870, gold: 0xfff0c0, neb: 0.8, stars: 0.9, fog: 0x140806, amb: 0x9a7058, key: 0xffe6c0,
    sun: [9.5, 9], sunCol: 0xffc070, sunK: 1.05, planet: [-11, 8.5, 1700, 80], clouds: 0.55, cloudA: 0x8a4a1e, cloudB: 0xffb357, rocks: 1, rockTint: 0x8a6a52,
    streak: 0xffd9a8, traffic: { freighter: 3, tanker: 3, cruiser: 0, fighter: 0, drone: 3, shuttle: 1 } },
  { id: "orbit", name: "PLANET ORBIT", base: 0x020714, a: 0x12389a, b: 0x2ad0e8, c: 0x8a5cff, gold: 0xffe9a8, neb: 0.55, stars: 1.15, fog: 0x04081c, amb: 0x5a78c8, key: 0xdcecff,
    sun: [-10.5, 8], sunCol: 0xfff4dc, sunK: 0.9, planet: [16.5, 13, 760, 205], clouds: 0.15, cloudA: 0x2a6ad0, cloudB: 0x35efff, rocks: 0.3, rockTint: 0x9ab0c8,
    streak: 0xbfe8ff, traffic: { freighter: 2, tanker: 1, cruiser: 1, fighter: 3, drone: 1, shuttle: 3 } },
  { id: "station", name: "STATION ZONE", base: 0x04051a, a: 0x1a2a9a, b: 0x2aa8ff, c: 0xbfe8ff, gold: 0xfff2cf, neb: 0.6, stars: 1.0, fog: 0x070722, amb: 0x6a74c0, key: 0xe6f0ff,
    sun: [10, 9.5], sunCol: 0xffffff, sunK: 0.8, planet: [-11.5, -8, 1800, 72], clouds: 0.2, cloudA: 0x3a4ad8, cloudB: 0xff7ad0, rocks: 0.05, rockTint: 0x7a80a0,
    station: 1, streak: 0xcfe0ff, traffic: { freighter: 3, tanker: 2, cruiser: 1, fighter: 3, drone: 3, shuttle: 5 } },
  { id: "graveyard", name: "SHIP GRAVEYARD", base: 0x020a0a, a: 0x0a5a50, b: 0x3adf9a, c: 0xc8ff6a, gold: 0xffd27a, neb: 0.75, stars: 0.8, fog: 0x04120e, amb: 0x4a9080, key: 0xd0ffe6,
    sun: [8.5, 10], sunCol: 0xff7a4a, sunK: 0.6, planet: [-10.5, 9, 1900, 60], clouds: 0.6, cloudA: 0x0f7a60, cloudB: 0x86ff5e, rocks: 0.45, rockTint: 0x5a6a70,
    wrecks: 1, streak: 0xb8ffd8, traffic: { freighter: 0, tanker: 0, cruiser: 0, fighter: 2, drone: 4, shuttle: 1 } },
  { id: "gate", name: "WORMHOLE GATE", base: 0x0a0318, a: 0x8a3aff, b: 0xffe14f, c: 0xff3ad4, gold: 0xffffff, neb: 1.05, stars: 1.1, fog: 0x10052a, amb: 0x8a62d8, key: 0xf2e4ff,
    sun: [10.5, 8], sunCol: 0xffe0f8, sunK: 0.7, planet: [-11, -7.5, 1700, 64], clouds: 0.7, cloudA: 0xa65fff, cloudB: 0xffe14f, rocks: 0.08, rockTint: 0x8a70b0,
    gate: 1, streak: 0xf0d8ff, traffic: { freighter: 3, tanker: 2, cruiser: 1, fighter: 3, drone: 2, shuttle: 2 } },
];
const SPACE_SHIPS = ["freighter", "tanker", "cruiser", "fighter", "drone", "shuttle"];
const SPACE_CALM_R = 16; // nothing drifts closer to the way ahead than this: the enemy and the answers have it to themselves

// The nebula's texture, drawn once on the graphics card: tiling noise. Red: billows; green:
// filaments; blue: where the colour changes and the dark lanes run; alpha: fine star dust.
function spaceBakeNebula(size) {
  const flat = () => { const t = new THREE.DataTexture(new Uint8Array([70, 70, 110, 0]), 1, 1, THREE.RGBAFormat); t.needsUpdate = true; return t; };
  if (!GFX.ok) return flat();
  try {
    const rt = new THREE.WebGLRenderTarget(size, size, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: false, stencilBuffer: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: `varying vec2 vUv;
        float h2(vec2 p, float s){ return fract(sin(dot(p + s, vec2(127.1, 311.7))) * 43758.5453); }
        float pn(vec2 p, float per, float s){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          vec2 a = mod(i, per), b = mod(i + 1.0, per);
          return mix(mix(h2(a, s), h2(vec2(b.x, a.y), s), f.x), mix(h2(vec2(a.x, b.y), s), h2(b, s), f.x), f.y); }
        float fbm(vec2 p, float per, float s){ float a = 0.5, v = 0.0; for (int o = 0; o < 7; o++){ v += a * pn(p * per, per, s); per *= 2.0; a *= 0.5; s += 7.3; } return v; }
        void main(){
          vec2 p = vUv;
          vec2 w = vec2(fbm(p, 5.0, 1.0), fbm(p, 5.0, 9.0)) - 0.5;
          vec2 q = p + w * 0.13;
          float A = fbm(q, 5.0, 21.0);
          float B = 1.0 - abs(2.0 * fbm(q + w * 0.07, 6.0, 47.0) - 1.0);
          float C = fbm(p - w * 0.09, 4.0, 77.0);
          vec2 g = p * 150.0, c = floor(g), f = fract(g);
          float on = step(0.93, h2(c, 3.0));
          vec2 sp = vec2(h2(c, 5.0), h2(c, 8.0)) * 0.7 + 0.15;
          float sb = h2(c, 13.0);
          float st = on * smoothstep(0.1 + 0.16 * sb, 0.0, length(f - sp)) * (0.15 + 0.85 * sb * sb);
          gl_FragColor = vec4(smoothstep(0.26, 0.8, A), smoothstep(0.34, 0.96, B), C, st);
        }`,
    }));
    quad.frustumCulled = false;
    const sc = new THREE.Scene(), r = GFX.renderer, prev = r.getRenderTarget();
    sc.add(quad);
    r.setRenderTarget(rt);
    r.render(sc, new THREE.Camera());
    r.setRenderTarget(prev);
    quad.geometry.dispose();
    quad.material.dispose();
    rt.texture.rt = rt; // (kept so it can be let go with the scene)
    return rt.texture;
  } catch (e) { return flat(); }
}
// A spiral galaxy seen from far away: a warm heart, two arms of blue and rose stars.
function spaceGalaxyTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  let s = 77123;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dot = (px, py, rad, col, al) => { const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2); };
  dot(128, 128, 120, "150,120,255", 0.1);
  for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 620; i++) {
    const t = Math.pow(r(), 0.7), th = arm * Math.PI + t * 7.2 + (r() - 0.5) * 0.7 * (0.3 + t), rad = 8 + t * 108 + (r() - 0.5) * 12;
    dot(128 + Math.cos(th) * rad, 128 + Math.sin(th) * rad, 2 + r() * 5 * (1.2 - t), t < 0.35 ? "255,214,170" : (r() < 0.5 ? "150,200,255" : "255,150,220"), 0.1 + r() * 0.16);
  }
  dot(128, 128, 30, "255,236,200", 0.95);
  dot(128, 128, 60, "255,200,150", 0.4);
  return new THREE.CanvasTexture(c);
}

// Everything solid out here wears one material, lit without the scene's lights: the star's
// light from its side of the sky, the region's ambient, a rim of the region's colour, the
// light of a blast. A hull is cut into panels (each a shade of its own) and its marked
// faces carry lit windows; marked parts shine. aGlow: 1 engines, 2 running lights that
// blink slowly (each ship in its own time), 3 and 4 rows of windows (large, small), 5 lamps.
function spaceHullMaterial(shared, o = {}) {
  return new THREE.ShaderMaterial({
    defines: o.swim ? { SPACE_SWIM: 1 } : {},
    uniforms: Object.assign(fogUniforms(), shared, { uTime: { value: 0 }, uFogK: { value: o.fog === undefined ? 0.85 : o.fog }, uDim: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) } }),
    vertexShader: `attribute vec3 aCol; attribute float aGlow; attribute float aPanel;
      #ifdef USE_INSTANCING
      attribute float aSeed;
      #endif
      uniform float uTime;
      varying vec3 vC; varying vec3 vN; varying vec3 vNo; varying vec3 vL; varying vec3 vW; varying float vGlow; varying float vDepth; varying float vSeed; varying float vPanel;
      void main(){
        vec3 p = position;
        #ifdef SPACE_SWIM
        p.y += sin(p.z * 0.085 + uTime * 0.9) * (2.2 + abs(p.z) * 0.07) + abs(p.x) * sin(uTime * 0.9 + abs(p.x) * 0.1) * 0.22; // it swims
        #endif
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
        m = modelMatrix * instanceMatrix; vSeed = aSeed;
        #else
        vSeed = 0.37;
        #endif
        vec4 w = m * vec4(p, 1.0);
        vW = w.xyz; vN = normalize(mat3(m) * normal); vNo = normal; vL = position; vC = aCol; vGlow = aGlow; vPanel = aPanel;
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uRimCol; uniform vec3 uFlashPos; uniform vec3 uFlashCol; uniform vec3 uTint; uniform float uTime; uniform float uFogK; uniform float uDim;
      varying vec3 vC; varying vec3 vN; varying vec3 vNo; varying vec3 vL; varying vec3 vW; varying float vGlow; varying float vDepth; varying float vSeed; varying float vPanel;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 n = normalize(vN), no = abs(vNo), v = normalize(cameraPosition - vW);
        vec2 uv = no.x > no.y && no.x > no.z ? vL.zy : (no.y > no.z ? vL.xz : vL.xy);
        vec2 pc = uv / vPanel, pf = fract(pc);
        float seam = max(step(0.95, pf.x), step(0.93, pf.y));
        vec3 alb = vC * uTint * (0.84 + 0.32 * h21(floor(pc) + vSeed * 3.0)) * (1.0 - 0.34 * seam);
        float key = max(dot(n, uSunDir), 0.0), fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = alb * (uAmb + uSunCol * key) + uRimCol * fr * (0.25 + 0.6 * dot(alb, vec3(0.33)));
        vec3 fd = vW - uFlashPos;
        col += alb * uFlashCol * (1.0 / (1.0 + 0.0012 * dot(fd, fd)));
        if (vGlow > 0.5) {
          if (vGlow < 1.5) col = vC * (1.7 + 0.25 * sin(uTime * 2.3 + vSeed * 40.0));
          else if (vGlow < 2.5) col = vC * (0.12 + 2.5 * smoothstep(0.5, 0.8, 0.5 + 0.5 * sin(uTime * 4.2 + vSeed * 50.0 + vL.z * 0.35)));
          else if (vGlow < 4.5) {
            vec2 cs = vGlow < 3.5 ? vec2(1.7, 1.1) : vec2(0.5, 0.36);
            vec2 wc = uv / cs, wf = fract(wc);
            float r = h21(floor(wc) + vSeed * 7.0);
            float win = step(0.4, r) * step(0.18, wf.x) * step(wf.x, 0.82) * step(0.28, wf.y) * step(wf.y, 0.74);
            col = mix(col, mix(vec3(1.7, 1.2, 0.62), vec3(0.5, 1.3, 1.8), step(0.84, r)) * (0.7 + 0.6 * r), win);
          } else col = vC * 1.8;
        }
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth) * uFogK) * uDim, 1.0);
      }`,
  });
}
// A chunky rock: a ball pushed about by noise and dented with craters, every face flat.
function spaceRockGeo(detail, seed) {
  const g = new THREE.IcosahedronGeometry(1, detail), P = g.attributes.position, n = P.count;
  const hsh = (i, j, k) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177) + Math.imul(seed, 2246822519)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const L = (a, b, t) => a + (b - a) * t;
    return L(L(L(hsh(xi, yi, zi), hsh(xi + 1, yi, zi), u), L(hsh(xi, yi + 1, zi), hsh(xi + 1, yi + 1, zi), u), v), L(L(hsh(xi, yi, zi + 1), hsh(xi + 1, yi, zi + 1), u), L(hsh(xi, yi + 1, zi + 1), hsh(xi + 1, yi + 1, zi + 1), u), v), w);
  };
  const craters = Array.from({ length: 5 }, (_, i) => { const v = new THREE.Vector3(hsh(i, 1, 9) - 0.5, hsh(i, 2, 9) - 0.5, hsh(i, 3, 9) - 0.5).normalize(); return { v, r: 0.28 + hsh(i, 4, 9) * 0.3 }; });
  const col = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(P, i).normalize();
    let r = 1 + (vn(v.x * 1.4 + 5, v.y * 1.4 + 5, v.z * 1.4 + 5) - 0.5) * 0.9 + (vn(v.x * 3.3 + 9, v.y * 3.3 + 9, v.z * 3.3 + 9) - 0.5) * 0.34, shade = 0.75 + 0.5 * vn(v.x * 2.6, v.y * 2.6, v.z * 2.6);
    craters.forEach((c) => { const d = v.distanceTo(c.v) / c.r; if (d < 1.25) { r -= 0.2 * Math.max(0, 1 - d * d) - 0.05 * Math.exp(-Math.pow((d - 1) * 5, 2)); if (d < 0.8) shade *= 0.72; } });
    P.setXYZ(i, v.x * r, v.y * r, v.z * r);
    col[i * 3] = shade; col[i * 3 + 1] = shade * 0.96; col[i * 3 + 2] = shade * 0.92;
  }
  g.computeVertexNormals();
  g.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aGlow", new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute("aPanel", new THREE.BufferAttribute(new Float32Array(n).fill(1000), 1));
  g.computeBoundingSphere();
  return g;
}
// An instanced mesh of the hull material: each copy has its own seed (panel shades, window pattern, when its lights blink).
function spaceInstanced(geo, mat, n) {
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) seed[i] = Math.random();
  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.frustumCulled = false;
  return m;
}

class BlasterSpace {
  constructor(game) {
    const g = (this.g = game), s = g.scene;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._c = new THREE.Color();
    this.regions = SPACE_REGIONS.map((r) => this.parse(r));
    this.cur = this.parse(SPACE_REGIONS[0]);
    this.from = this.regions[0]; this.to = this.regions[0]; this.ri = 0; this.blend = 1; this.blendDur = 1;
    this.travel = 0; this.zoom = 0; this.flashK = 0;
    this.sunDir = new THREE.Vector3(-0.17, 0.17, -1).normalize();
    this.keyDir = new THREE.Vector3(0.5, 0.5, 0.7).normalize(); // (the star lights the side of things the player sees: see update)
    // what every hull, rock and wreck shares: the star's light, the ambient, the rim, the light of a blast
    this.shared = {
      uSunDir: { value: this.keyDir }, uSunCol: { value: new THREE.Color(1, 1, 1) }, uAmb: { value: new THREE.Color(0.2, 0.2, 0.3) }, uRimCol: { value: new THREE.Color(0.5, 0.2, 0.8) },
      uFlashPos: { value: new THREE.Vector3(0, 0, -50) }, uFlashCol: { value: new THREE.Color(0, 0, 0) },
    };
    this.hull = spaceHullMaterial(this.shared);
    this.ambLight = s.children.find((o) => o.isAmbientLight);
    this.amb0 = this.ambLight ? this.ambLight.color.clone() : new THREE.Color(1, 1, 1);
    this.key0 = g.keyLight ? g.keyLight.color.clone() : new THREE.Color(1, 1, 1);

    // ---- the sky: two layers of the nebula, each growing as the ship flies into it; one fades in as the other fades out
    this.nebTex = spaceBakeNebula(2048);
    this.skyU = {
      uNeb: { value: this.nebTex }, uBase: { value: new THREE.Color() }, uA: { value: new THREE.Color() }, uB: { value: new THREE.Color() }, uC: { value: new THREE.Color() }, uGold: { value: new THREE.Color() },
      uSunDir: { value: this.sunDir }, uSunCol: { value: new THREE.Color() }, uFlash: { value: new THREE.Color(0, 0, 0) }, uNebK: { value: 1 }, uStarK: { value: 1 }, uCalm: { value: 0.5 }, uZoom: { value: 0 },
      uOff: { value: new THREE.Vector4(0.13, 0.71, 0.58, 0.29) }, uDetail: { value: 1 },
    };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false,
      vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform sampler2D uNeb; uniform vec3 uBase; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uGold; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uFlash;
        uniform float uNebK; uniform float uStarK; uniform float uCalm; uniform float uZoom; uniform float uDetail; uniform vec4 uOff; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          vec2 uv = d.xy / (1.0 - min(d.z, 0.5)); // a chart of the sky ahead
          float f1 = fract(uZoom), f2 = fract(uZoom + 0.5), w1 = sin(3.14159 * f1);
          w1 *= w1;
          vec4 t = texture2D(uNeb, uv * (2.9 * exp2(-2.0 * f1)) + uOff.xy) * w1 + texture2D(uNeb, uv * (2.9 * exp2(-2.0 * f2)) + uOff.zw) * (1.0 - w1);
          float dens = max(t.r * 1.1 + t.g * 0.55 - 0.78, 0.0);
          if (uDetail > 0.5) { vec4 fine = texture2D(uNeb, uv * 7.0 + uOff.xw); dens *= 0.62 + 0.8 * fine.g * fine.r + 0.25 * fine.g; }
          vec3 col = mix(uA, uB, smoothstep(0.3, 0.68, t.b));
          col = mix(col, uC, smoothstep(0.62, 0.96, t.g) * 0.4);
          col = mix(col, uGold, smoothstep(0.5, 1.05, dens) * 0.45);
          float lane = 1.0 - 0.7 * smoothstep(0.55, 0.76, t.b) * smoothstep(0.5, 0.2, t.r);
          vec3 c = uBase * (0.75 + 0.45 * d.y) + col * ((1.0 - exp(-pow(dens, 1.4) * 3.2)) * 0.72 * uNebK * lane) + mix(uA, uB, t.b) * (0.03 * uNebK * (t.r + t.g));
          if (uDetail > 0.5) c += vec3(0.85, 0.9, 1.0) * texture2D(uNeb, uv * 6.5 + vec2(0.13, 0.71)).a * 2.2 * uStarK * (1.0 - min(1.0, dens * 2.5));
          float sd = max(dot(d, uSunDir), 0.0);
          c += uSunCol * (pow(sd, 6000.0) * 4.0 + pow(sd, 700.0) * 0.4 + pow(sd, 70.0) * 0.08);
          // darker and quieter round the way ahead, where the enemy and the answers are
          c *= mix(1.0 - uCalm, 1.0, smoothstep(0.02, 0.2, length(uv - vec2(0.0, 0.015))));
          c += uFlash * (0.06 + dens * 0.9); // a blast lights the dust
          gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
        }`,
    }));
    this.sky.renderOrder = 50;
    this.sky.frustumCulled = false;
    this.far = new THREE.Group(); // what is too far away to pass: it keeps the camera's place
    this.far.add(this.sky);
    s.add(this.far);

    // ---- stars at three depths: the far ones stand still, the middle ones drift, the near dust streams past
    const starGeo = (count, fill) => {
      const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), aS = new Float32Array(count * 4), c = new THREE.Color(), tints = [0xffffff, 0xcfd8ff, 0xfff0d0, 0xffc8f0, 0xa8e8ff];
      for (let i = 0; i < count; i++) {
        const o = fill(i);
        pos.set(o.p, i * 3);
        c.set(tints[i % tints.length]).multiplyScalar(o.k);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        aS.set([o.size, Math.random() * 6.283, o.f, o.range], i * 4);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
      geo.setAttribute("aS", new THREE.BufferAttribute(aS, 4));
      return geo;
    };
    this.starU = { uTravel: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 }, uStarK: { value: 1 } };
    this.starMat = new THREE.ShaderMaterial({
      uniforms: this.starU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute vec4 aS; uniform float uTravel; uniform float uTime; uniform float uPx; uniform float uStarK; varying vec3 vC;
        void main(){
          vec3 p = position; float k = 1.0, size = aS.x;
          if (aS.z > 0.0) { // it drifts toward the ship and comes round again
            float zMax = aS.z > 0.5 ? 12.0 : -70.0;
            p.z = zMax - mod(zMax - p.z - uTravel * aS.z, aS.w);
          }
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          if (aS.z > 0.0) { float dz = -mv.z; k = smoothstep(aS.w, aS.w * 0.75, dz) * smoothstep(4.0, 22.0, dz); size *= 110.0 / max(dz, 14.0); }
          vC = aCol * k * uStarK * (0.72 + 0.28 * sin(uTime * (0.5 + fract(aS.y) * 1.6) + aS.y * 9.0));
          gl_PointSize = max(1.0, size * uPx);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "varying vec3 vC; void main(){ float a = max(0.0, 1.0 - length(gl_PointCoord - 0.5) * 2.0); gl_FragColor = vec4(vC * a * a, 1.0); }",
    });
    this.farStars = new THREE.Points(starGeo(2200, () => {
      const v = this._v.set(rand(-0.62, 0.62), rand(-0.56, 0.56), -1).normalize().multiplyScalar(940);
      return { p: [v.x, v.y, v.z], k: Math.pow(Math.random(), 2.6) * 2.0 + 0.2, size: rand(0.9, 3.4), f: 0, range: 1 };
    }), this.starMat);
    this.farStars.frustumCulled = false;
    this.far.add(this.farStars);
    this.field = new THREE.Points(starGeo(1500, (i) => (i < 900
      ? { p: [rand(-230, 230), rand(-190, 190), rand(-820, -70)], k: rand(0.5, 1.6), size: rand(1.1, 2.6), f: 0.2, range: 750 }
      : { p: [rand(-46, 46), rand(-40, 40), rand(-330, 12)], k: rand(0.35, 0.9), size: rand(0.5, 1.2), f: 1, range: 342 })), this.starMat);
    this.field.frustumCulled = false;
    s.add(this.field);
    g.decorCheap(this.field);

    // ---- galaxies, very far off
    this.galaxyTex = spaceGalaxyTexture();
    this.galaxies = [[-0.2, -0.165, -1, 64, 0.5, 0.42, 0xffffff], [0.1, 0.225, -1, 44, -0.9, 0.34, 0xffd0f0], [0.225, -0.18, -1, 54, 0.2, 0.5, 0xd0e0ff]].map(([x, y, z, size, rot, squash, tint]) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.galaxyTex, color: tint, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, rotation: rot }));
      sp.position.set(x, y, z).normalize().multiplyScalar(960);
      sp.scale.set(size, size * squash, 1);
      this.far.add(sp);
      return sp;
    });

    // ---- the star: a hot core; the sky draws its glow, and the lens its ghosts
    this.sun = glowSprite(0xffffff, 70, 1);
    this.far.add(this.sun);
    this.sunBoost = 0;
    this.ghosts = [[0.62, 9, 0xffc890, 0.22], [0.3, 4.5, 0x8fd8ff, 0.3], [-0.22, 6.5, 0xff8fd8, 0.2], [-0.55, 12, 0xa8b8ff, 0.14], [-0.92, 5.5, 0xffe2a8, 0.22]].map(([k, size, tint, al]) => {
      const sp = glowSprite(tint, size, al);
      sp.material.depthTest = false;
      sp.renderOrder = 60;
      sp.userData = { k, al };
      s.add(sp);
      g.decor(sp);
      return sp;
    });

    // ---- the ringed giant: bands and a storm, lit from the star's side, an atmosphere that glows past its limb, rings in its shadow
    const planet = (this.planet = new THREE.Group());
    this.planetU = { uSunDir: { value: this.keyDir }, uA: { value: new THREE.Color(0x3b1d8f) }, uB: { value: new THREE.Color(0xff5fb4) }, uC: { value: new THREE.Color(0x35c8ff) }, uGold: { value: new THREE.Color(0xffd89a) }, uRim: { value: neon(0x7ad0ff, 1.8) } };
    const ball = new THREE.SphereGeometry(1, 48, 28);
    planet.add(new THREE.Mesh(ball, new THREE.ShaderMaterial({
      uniforms: this.planetU,
      vertexShader: "varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vP = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `uniform vec3 uSunDir; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform vec3 uGold; uniform vec3 uRim; varying vec3 vN; varying vec3 vP; varying vec3 vW;
        void main(){
          vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
          float turb = sin(vP.x * 5.0 + sin(vP.z * 4.0) * 1.2) * 0.05 + sin(vP.z * 9.0 + vP.y * 3.0) * 0.025;
          vec3 alb = mix(uA, uB, 0.5 + 0.5 * sin((vP.y + turb) * 17.0));
          alb = mix(alb, uC, (0.5 + 0.5 * sin((vP.y - turb * 1.6) * 43.0 + 1.3)) * 0.32);
          vec2 sv = (vec2(atan(vP.z, vP.x), vP.y) - vec2(2.2, -0.26)) * vec2(2.6, 8.0);
          alb = mix(alb, uGold, exp(-dot(sv, sv)) * 0.85); // the great storm
          float day = smoothstep(-0.12, 0.38, dot(n, uSunDir)), fr = pow(1.0 - max(dot(n, v), 0.0), 2.6);
          gl_FragColor = vec4(alb * (0.015 + 0.78 * day) + uRim * fr * (0.1 + 0.55 * day), 1.0);
        }`,
    })));
    const air = new THREE.Mesh(ball, new THREE.ShaderMaterial({
      uniforms: this.planetU, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `uniform vec3 uSunDir; uniform vec3 uRim; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 n = normalize(vN);
          float x = abs(dot(n, normalize(cameraPosition - vW))), k = smoothstep(0.0, 0.46, x);
          gl_FragColor = vec4(uRim * (k * k * (0.2 + 0.8 * smoothstep(-0.35, 0.5, dot(n, uSunDir))) * 0.8), 1.0);
        }`,
    }));
    air.scale.setScalar(1.1);
    const rings = new THREE.Mesh(new THREE.RingGeometry(1.32, 2.3, 96, 1), new THREE.ShaderMaterial({
      uniforms: Object.assign({ uColor: { value: neon(0xffd9a8, 1) }, uLaneK: { value: 1 } }, this.planetU),
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec2 vP; varying vec3 vQ; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vQ = (w.xyz - modelMatrix[3].xyz) / length(modelMatrix[0].xyz); gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: `uniform vec3 uColor; uniform vec3 uSunDir; uniform float uLaneK; varying vec2 vP; varying vec3 vQ;
        void main(){
          float r = length(vP), t = (r - 1.32) / 0.98;
          float lanes = mix(0.6, 0.3 + 0.7 * (0.5 + 0.5 * sin(r * 96.0)) * (0.55 + 0.45 * sin(r * 23.0 + 1.0)), uLaneK);
          lanes *= 1.0 - smoothstep(0.012, 0.0, abs(r - 1.86)) * 0.95; // the gap
          float along = dot(vQ, uSunDir), shade = along < 0.0 ? smoothstep(0.92, 1.06, length(vQ - along * uSunDir)) : 1.0; // the planet's shadow
          gl_FragColor = vec4(uColor * (lanes * smoothstep(0.0, 0.07, t) * smoothstep(1.0, 0.88, t) * (0.06 + 0.94 * shade) * 0.62), 1.0);
        }`,
    }));
    this.rings = rings;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.ShaderMaterial({
      uniforms: this.planetU,
      vertexShader: "varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uSunDir; varying vec3 vN; void main(){ float d = smoothstep(-0.1, 0.4, dot(normalize(vN), uSunDir)); gl_FragColor = vec4(vec3(0.5, 0.52, 0.6) * (0.03 + d), 1.0); }",
    }));
    moon.scale.setScalar(0.09);
    moon.position.set(-2.9, 0.5, 0.8);
    planet.add(air, rings, moon);
    this.moon = moon;
    s.add(planet);

    // ---- wisps of the nebula that pass the ship: soft clouds, well off the way ahead, gone before they reach the lens
    const N = (this.cloudN = 14), cg = new THREE.PlaneGeometry(1, 1);
    this.cloudData = new Float32Array(N * 4);
    cg.setAttribute("aData", new THREE.InstancedBufferAttribute(this.cloudData, 4));
    this.cloudU = Object.assign(fogUniforms(), { uNeb: { value: this.nebTex }, uCA: { value: new THREE.Color() }, uCB: { value: new THREE.Color() }, uK: { value: 1 } });
    this.cloudMesh = new THREE.InstancedMesh(cg, new THREE.ShaderMaterial({
      uniforms: this.cloudU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec4 aData; varying vec2 vUv; varying vec2 vUn; varying float vMix; varying float vA;
        void main(){
          vUv = uv - 0.5; vMix = aData.y; vUn = uv * 0.55 + aData.yw * 3.7;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          float dz = -mv.z;
          vA = aData.z * smoothstep(620.0, 430.0, dz) * smoothstep(40.0, 130.0, dz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform sampler2D uNeb; uniform vec3 uCA; uniform vec3 uCB; uniform float uK; varying vec2 vUv; varying vec2 vUn; varying float vMix; varying float vA;
        void main(){
          float d = 1.0 - smoothstep(0.12, 0.5, length(vUv)); vec4 n = texture2D(uNeb, vUn);
          float dens = d * smoothstep(0.2, 0.95, n.r * 0.75 + n.g * 0.5);
          gl_FragColor = vec4(mix(uCA, uCB, clamp(vMix * 0.6 + n.b * 0.8 - 0.3, 0.0, 1.0)) * (dens * dens * vA * uK), 1.0);
        }`,
    }), N);
    this.cloudMesh.frustumCulled = false;
    this.clouds = Array.from({ length: N }, (_, i) => { const c = { p: new THREE.Vector3(), s: 1, rot: 0 }; this.resetCloud(c, i, rand(-600, -60)); return c; });
    s.add(this.cloudMesh);
    g.decor(this.cloudMesh);

    // ---- rocks: a handful of big detailed ones near the ship's path, many small ones filling the distance
    this.rockMat = spaceHullMaterial(this.shared);
    this.rockNear = spaceInstanced(spaceRockGeo(2, 11), this.rockMat, 16);
    this.rockFar = spaceInstanced(spaceRockGeo(1, 23), this.rockMat, 96);
    this.rocks = [];
    for (let i = 0; i < 112; i++) {
      const near = i < 16, r = { near, i: near ? i : i - 16, p: new THREE.Vector3(), ax: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), ph: rand(6.28), w: rand(0.1, 0.6) * (Math.random() < 0.5 ? -1 : 1), f: rand(0.75, 1.1), sc: new THREE.Vector3() };
      this.resetRock(r, rand(-640, 0));
      this.rocks.push(r);
    }
    s.add(this.rockNear, this.rockFar);
    g.decor(this.rockNear);
    g.decorCheap(this.rockFar);

    this.buildStation();
    this.buildWrecks();
    this.buildGate();

    // ---- a halo behind the enemy: the picture is dimmed there and ringed with the wave's colour, so what must be read stands clear
    this.haloU = { uColor: { value: new THREE.Color(1, 1, 1) }, uK: { value: 1 } };
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: this.haloU, transparent: true, depthWrite: false,
      vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 uColor; uniform float uK; varying vec2 vP;
        void main(){
          float r = length(vP), dim = (1.0 - smoothstep(0.3, 1.0, r)) * 0.55, aura = exp(-pow((r - 0.62) * 3.4, 2.0)) * 0.1 + exp(-r * r * 2.6) * 0.04;
          gl_FragColor = vec4(uColor * aura * uK, dim * uK); // (premultiplied: it darkens what is behind it and adds its own soft light)
        }`,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    }));
    this.halo.renderOrder = 1;
    s.add(this.halo);

    this.traffic = new SpaceTraffic(this); // ships on their way (20g-blastertraffic.js)
    this.director = spaceEvents(this); // and what happens out there
    this.apply(1);
  }

  // a region as numbers and colours that can be blended
  parse(r) {
    const C = (h) => new THREE.Color(h), D2R = Math.PI / 180;
    return {
      id: r.id, name: r.name, base: C(r.base), a: C(r.a), b: C(r.b), c: C(r.c), gold: C(r.gold), fog: C(r.fog), amb: C(r.amb), key: C(r.key), sunCol: C(r.sunCol), cloudA: C(r.cloudA), cloudB: C(r.cloudB), rockTint: C(r.rockTint), streak: C(r.streak),
      neb: r.neb, stars: r.stars, sunK: r.sunK, clouds: r.clouds, rocks: r.rocks, station: r.station || 0, wrecks: r.wrecks || 0, gate: r.gate || 0,
      sun: new THREE.Vector3(Math.tan(r.sun[0] * D2R), Math.tan(r.sun[1] * D2R), -1).normalize(), traffic: r.traffic,
      planet: new THREE.Vector4(r.planet[2] * Math.tan(r.planet[0] * D2R), r.planet[2] * Math.tan(r.planet[1] * D2R), -r.planet[2], r.planet[3]),
    };
  }
  // Travel on to a region (by its number in the run), over dur seconds.
  setRegion(i, dur = 3) {
    const n = this.regions.length, to = this.regions[((i % n) + n) % n];
    if (to === this.to) return;
    this.from = this.snapshot();
    this.to = to;
    this.ri = ((i % n) + n) % n;
    this.blend = 0;
    this.blendDur = Math.max(0.01, dur);
  }
  snapshot() {
    const c = this.cur, o = {};
    for (const k in c) o[k] = c[k] && c[k].clone ? c[k].clone() : c[k];
    return o;
  }
  // where things stand between the region it left and the one it is entering (k: 0 to 1)
  apply(k) {
    const A = this.from, B = this.to, c = this.cur, e = k * k * (3 - 2 * k);
    ["base", "a", "b", "c", "gold", "fog", "amb", "key", "sunCol", "cloudA", "cloudB", "rockTint", "streak"].forEach((n) => c[n].copy(A[n]).lerp(B[n], e));
    ["neb", "stars", "sunK", "clouds", "rocks", "station", "wrecks", "gate"].forEach((n) => { c[n] = lerp(A[n], B[n], e); });
    c.sun.copy(A.sun).lerp(B.sun, e).normalize();
    c.planet.copy(A.planet).lerp(B.planet, e);
    c.traffic = B.traffic; c.id = B.id; c.name = B.name;
  }

  // ---- the station: a spindle, a wheel that turns, solar wings, a mast; and the lights of the lane that leads to it
  buildStation() {
    const g = this.g, box = new THREE.BoxGeometry(1, 1, 1), put = (b, geo, m, color, k = 1, v) => { b.add(geo, m, color, k, v); geo.dispose(); };
    const hub = new RacerBatch(["aGlow", "aPanel"]), P = { aPanel: 3.2 }, W = { aGlow: 3, aPanel: 3.2 };
    put(hub, cyLoft([[-34, 2.2, 2.2, 0.7], [-22, 6, 6, 2], [-9, 9, 9, 3], [9, 9, 9, 3], [20, 5.5, 5.5, 1.8], [38, 2, 2, 0.6]]), null, 0x39425e, 1, P);
    put(hub, cyLoft([[-8, 9.4, 9.4, 3.2], [8, 9.4, 9.4, 3.2]]), null, 0x2a3350, 1, W); // its windowed waist
    [-1, 1].forEach((sd) => {
      [0, 1].forEach((j) => {
        hub.add(box, racerM(sd * (24 + j * 19), -26, 0, 17, 0.4, 9.5), 0x14265a, 1, { aPanel: 1.9 }); // solar wings
        hub.add(box, racerM(sd * (24 + j * 19), -26, 0, 17.3, 0.2, 0.5), 0x9aa4c0, 1, P);
      });
      hub.add(box, racerM(sd * 23, -26, 0, 46, 0.7, 0.7), 0x6a7388, 1, P);
      hub.add(box, racerM(sd * 46, -26, 5.2, 0.5, 0.5, 0.5), sd < 0 ? 0xff3ad4 : 0x35efff, 2.2, { aGlow: 2, aPanel: 3 });
      hub.add(box, racerM(sd * 12.5, 14, 0, 9, 2.4, 3.4), 0x343d5e, 1, W); // docking arms
      hub.add(box, racerM(sd * 17.4, 14, 0, 0.5, 3, 4), 0xffe2a0, 1.8, { aGlow: 5, aPanel: 3 });
    });
    hub.add(box, racerM(0, 44, 0, 0.5, 13, 0.5), 0x8a94b0, 1, P);
    hub.add(box, racerM(0, 51, 0, 1.1, 1.1, 1.1), 0xff3a2a, 2.6, { aGlow: 2, aPanel: 3 });
    hub.add(box, racerM(0, -37, 0, 1.3, 1.3, 1.3), 0x35efff, 2.2, { aGlow: 2, aPanel: 3 });
    const ring = new RacerBatch(["aGlow", "aPanel"]), R = 36, SEG = 22;
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * 6.2832, m = racerM(Math.cos(a) * R, 0, Math.sin(a) * R, 1, 1, 1, 0, -a + Math.PI / 2, 0);
      ring.add(box, m.clone().multiply(racerM(0, 0, 0, 10.6, 4.6, 6.4)), i % 2 ? 0x39425e : 0x2f3854, 1, W);
      ring.add(box, m.clone().multiply(racerM(0, 2.6, 0, 9.4, 0.6, 5)), 0x4a5578, 1, P);
      if (i % 3 === 0) ring.add(box, m.clone().multiply(racerM(0, 0, 3.4, 1.2, 1.2, 0.5)), i % 6 ? 0x35efff : 0xff3ad4, 2.2, { aGlow: 2, aPanel: 3 });
    }
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.2832 + 0.4; racerStrut(ring, box, new THREE.Vector3(Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5), new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R), 1.3, 0x59648a, 1, P); }
    const st = (this.station = new THREE.Group());
    this.stationHub = new THREE.Mesh(hub.build(), this.hull);
    this.stationRing = new THREE.Mesh(ring.build(), this.hull);
    this.stationHub.frustumCulled = this.stationRing.frustumCulled = false;
    st.add(this.stationHub, this.stationRing);
    st.rotation.set(0.5, 0.3, 0.35);
    st.visible = false;
    g.scene.add(st);
    // the lane: two lines of markers running out from the station, their lamps blinking one after the other
    const lb = new RacerBatch(["aGlow", "aPanel"]);
    put(lb, new THREE.OctahedronGeometry(1, 0), racerM(0, 0, 0, 0.7, 1.1, 0.7), 0x39425e, 1, { aPanel: 3 });
    lb.add(box, racerM(0, 1.3, 0, 0.5, 0.5, 0.5), 0xffe14f, 2.6, { aGlow: 2, aPanel: 3 });
    this.laneMesh = spaceInstanced(lb.build(), this.hull, 28);
    const seed = this.laneMesh.geometry.attributes.aSeed.array;
    for (let i = 0; i < 28; i++) seed[i] = Math.floor(i / 2) * 0.0105; // (the blink runs along the lane)
    this.laneMesh.visible = false;
    g.scene.add(this.laneMesh);
    g.decorCheap(this.laneMesh);
    box.dispose();
  }
  // ---- the graveyard: broken hulls, each a different size and lie, turning slowly; a few emergency lamps still blink
  buildWrecks() {
    const g = this.g, box = new THREE.BoxGeometry(1, 1, 1), b = new RacerBatch(["aGlow", "aPanel"]), P = { aPanel: 2.6 };
    const hullG = cyLoft([[-30, 3.2, 2.4, 1], [-16, 7.5, 5.5, 2], [-2, 8.6, 6.4, 2.4], [9, 7.2, 6.6, 2.2], [13.5, 4.4, 5.2, 1.6]]);
    b.add(hullG, racerM(0, 0, 0, 1, 1, 1, Math.PI / 2), 0x2e3440, 1, P);
    hullG.dispose();
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.2832; racerStrut(b, box, new THREE.Vector3(Math.cos(a) * 5.6, Math.sin(a) * 4.6, 12.5), new THREE.Vector3(Math.cos(a) * (6.6 + (i % 3)), Math.sin(a) * (5.4 + (i % 2) * 1.6), 20 + (i % 4) * 3.2), 0.55, 0x4a5260, 1, P); } // ribs laid bare where it broke
    b.add(box, racerM(1.5, 7.6, -4, 7, 4, 9, 0.1, 0.2, 0.3), 0x39404e, 1, { aGlow: 0, aPanel: 2 }); // what is left of its tower
    b.add(box, racerM(-8.5, 1, 4, 0.5, 7, 12, 0, 0, 0.5), 0x343a48, 1, P);
    b.add(box, racerM(0, 9.9, -4, 0.7, 0.7, 0.7), 0xff3a2a, 2.6, { aGlow: 2, aPanel: 3 });
    b.add(box, racerM(-6.5, -3.4, -18, 0.6, 0.6, 0.6), 0xff7a2a, 2.2, { aGlow: 2, aPanel: 3 });
    this.wreckMesh = spaceInstanced(b.build(), this.hull, 9);
    this.wrecks = Array.from({ length: 9 }, (_, i) => {
      const a = rand(6.283), rr = rand(34, 150);
      return { p: new THREE.Vector3(Math.cos(a) * rr * 1.1, Math.sin(a) * rr * 0.9, -rand(120, 900)), ax: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), ph: rand(6.28), w: rand(0.02, 0.07) * (i % 2 ? 1 : -1), s: rand(1.2, 3.4) };
    });
    this.wreckMesh.visible = false;
    g.scene.add(this.wreckMesh);
    box.dispose();
  }
  // ---- the gate: a whirl of light held open by three great arms
  buildGate() {
    const g = this.g, box = new THREE.BoxGeometry(1, 1, 1), b = new RacerBatch(["aGlow", "aPanel"]), P = { aPanel: 4 };
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * 6.2832 + 0.5;
      for (let j = 0; j < 7; j++) {
        const a = a0 + (j - 3) * 0.105, m = racerM(Math.cos(a) * 118, Math.sin(a) * 118, 0, 1, 1, 1, 0, 0, a + Math.PI / 2);
        b.add(box, m.clone().multiply(racerM(0, 0, 0, 13, 9 - Math.abs(j - 3) * 1.4, 12)), j % 2 ? 0x3a3558 : 0x2c2848, 1, j === 3 ? { aGlow: 3, aPanel: 4 } : P);
        if (j % 2 === 0) b.add(box, m.clone().multiply(racerM(0, -5.2, 0, 2.2, 1.2, 2.2)), k % 2 ? 0xffe14f : 0xa65fff, 2.4, { aGlow: 2, aPanel: 4 });
      }
      const m = racerM(Math.cos(a0) * 104, Math.sin(a0) * 104, 0, 1, 1, 1, 0, 0, a0 + Math.PI / 2);
      b.add(box, m.clone().multiply(racerM(0, -9, 0, 3.4, 24, 3.4)), 0x59508a, 1, P); // the emitter that reaches in
      b.add(box, m.clone().multiply(racerM(0, -22, 0, 4.6, 2.2, 4.6)), 0xffffff, 2.6, { aGlow: 5, aPanel: 4 });
    }
    const gate = (this.gate = new THREE.Group());
    this.gateArms = new THREE.Mesh(b.build(), this.hull);
    this.gateArms.frustumCulled = false;
    this.vortexMat = () => new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 1 }, uColA: { value: neon(0x8a3aff, 1.3) }, uColB: { value: neon(0xffe14f, 1.2) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uTime; uniform float uK; uniform vec3 uColA; uniform vec3 uColB; varying vec2 vP;
        void main(){
          float r = length(vP), a = atan(vP.y, vP.x);
          float arms = smoothstep(0.1, 0.95, 0.5 + 0.5 * sin(a * 4.0 + log(r + 0.02) * 9.0 - uTime * 0.9)) * (0.6 + 0.4 * sin(a * 9.0 - log(r + 0.02) * 15.0 + uTime * 0.5));
          float disc = smoothstep(1.0, 0.6, r) * smoothstep(0.02, 0.2, r);
          vec3 col = mix(uColA, uColB, arms) * (arms * 0.9 + 0.1) * disc + vec3(1.0, 0.95, 0.9) * exp(-r * r * 26.0) * 2.4 + uColB * exp(-pow((r - 0.86) * 9.0, 2.0)) * 0.8;
          gl_FragColor = vec4(col * uK, 1.0);
        }`,
    });
    this.vortex = new THREE.Mesh(new THREE.CircleGeometry(1, 48), this.vortexMat());
    this.vortex.scale.setScalar(104);
    gate.add(this.gateArms, this.vortex);
    gate.rotation.set(0.1, 0.5, 0);
    gate.visible = false;
    g.scene.add(gate);
    box.dispose();
  }

  resetCloud(c, i, z) {
    const a = rand(6.283), r = rand(70, 230);
    c.p.set(Math.cos(a) * r * 1.15, Math.sin(a) * r * 0.85, z);
    c.s = rand(130, 270);
    c.rot = rand(6.283);
    this.cloudData.set([i % 4, Math.random(), rand(0.5, 1), Math.random()], i * 4);
  }
  resetRock(r, z) {
    const a = rand(6.283), rr = r.near ? rand(30, 62) : rand(22, 125), s = r.near ? rand(1.4, 4.2) : rand(1.2, 6.5) * (Math.random() < 0.1 ? 2.2 : 1);
    r.p.set(Math.cos(a) * rr * 1.1, Math.sin(a) * rr * 0.9, z);
    if (Math.abs(r.p.x) < SPACE_CALM_R + s && Math.abs(r.p.y) < SPACE_CALM_R + s) r.p.x += (r.p.x < 0 ? -1 : 1) * (SPACE_CALM_R + s);
    r.sc.set(s * rand(0.8, 1.3), s * rand(0.7, 1.1), s * rand(0.8, 1.25));
  }

  // The light of a blast on the dust and on every hull near it (the game calls this where the tunnel's walls used to light up).
  flash(pos, color) {
    this.flashK = 1;
    this.flashCol = this.flashCol || new THREE.Color();
    this.flashCol.set(color);
    this.shared.uFlashPos.value.copy(pos);
  }

  update(dt, sp, w) {
    const v0z = this._z || (this._z = new THREE.Vector3(0, 0, 1));
    const g = this.g, t = g.t, c = this.cur, cheap = GFX.ok && GFX.Q[GFX.qi].cheap, lite = GFX.ok && GFX.Q[GFX.qi].lite, calm = GFX.calm || REDUCED_MOTION;
    if (this.blend < 1) { this.blend = Math.min(1, this.blend + dt / this.blendDur); this.apply(this.blend); }
    this.travel += sp * dt;
    this.sp = sp;
    // the sky: flying into the nebula (a layer doubles in size every 50 seconds or so at cruise; far faster in the warp)
    const z0 = this.zoom;
    this.zoom += dt * (0.01 + sp * 0.00034) * (calm ? 0.5 : 1);
    const U = this.skyU;
    if (Math.floor(this.zoom) !== Math.floor(z0)) { U.uOff.value.x = Math.random(); U.uOff.value.y = Math.random(); } // (a layer starts again somewhere new while it is invisible)
    if (Math.floor(this.zoom + 0.5) !== Math.floor(z0 + 0.5)) { U.uOff.value.z = Math.random(); U.uOff.value.w = Math.random(); }
    U.uZoom.value = this.zoom;
    U.uBase.value.copy(c.base); U.uA.value.copy(c.a); U.uB.value.copy(c.b); U.uC.value.copy(c.c); U.uGold.value.copy(c.gold);
    U.uNebK.value = c.neb * (1 + w * 0.5 + GFX.fever * 0.25);
    U.uStarK.value = c.stars;
    U.uCalm.value = g.state === "ask" ? 0.55 : 0.4;
    this.flashK = Math.max(0, this.flashK - dt * 2.6);
    const fk = this.flashK * this.flashK;
    if (this.flashCol) { U.uFlash.value.copy(this.flashCol).multiplyScalar(fk * 0.5); this.shared.uFlashCol.value.copy(this.flashCol).multiplyScalar(fk * 2.2); }
    // the star, its light on everything solid, its ghosts in the lens
    this.sunBoost = Math.max(0, this.sunBoost - dt * 0.5);
    const sunK = c.sunK * (1 + this.sunBoost * 0.7);
    this.sunDir.copy(c.sun);
    this.keyDir.set(c.sun.x * 0.9, c.sun.y * 0.6 + 0.3, 0.5).normalize();
    U.uSunCol.value.copy(c.sunCol).multiplyScalar(sunK);
    this.sun.position.copy(this.sunDir).multiplyScalar(950);
    this.sun.material.color.copy(c.sunCol).multiplyScalar(2.6 * sunK);
    this.sun.scale.setScalar(46 * (1 + this.sunBoost * 0.5));
    const S = this.shared;
    S.uSunCol.value.copy(c.sunCol).multiplyScalar(1.15 * sunK);
    S.uAmb.value.copy(c.amb).multiplyScalar(0.42);
    S.uRimCol.value.copy(c.b).lerp(c.c, 0.4).multiplyScalar(1.1);
    this.rockMat.uniforms.uTint.value.copy(c.rockTint).multiplyScalar(1.5);
    const sv = this._v.copy(this.sunDir).multiplyScalar(950).add(g.camera.position).project(g.camera), on = sv.z < 1 && Math.abs(sv.x) < 1.25 && Math.abs(sv.y) < 1.25 && !calm;
    const fade = on ? clamp(1.35 - Math.max(Math.abs(sv.x), Math.abs(sv.y)), 0, 1) * sunK : 0;
    this.ghosts.forEach((gh) => {
      gh.visible = fade > 0.02;
      if (!gh.visible) return;
      const a = this._w.set(sv.x * gh.userData.k, sv.y * gh.userData.k, -1).unproject(g.camera), b = this._s.set(sv.x * gh.userData.k, sv.y * gh.userData.k, 1).unproject(g.camera);
      gh.position.copy(g.camera.position).add(b.sub(a).normalize().multiplyScalar(60));
      gh.material.opacity = gh.userData.al * fade;
    });
    // stars
    this.starU.uTravel.value = this.travel;
    this.starU.uTime.value = t;
    this.starU.uStarK.value = c.stars * (1 + w * 0.8);
    this.starU.uPx.value = GFX.ok ? GFX.renderer.getDrawingBufferSize(this._gv || (this._gv = new THREE.Vector2())).y / 800 : 1;
    this.galaxies.forEach((sp) => { sp.material.opacity = 0.5 * c.stars; });
    // the giant: where this region has it in the sky; it turns slowly, its moon goes round
    const pl = this.planet, P = c.planet;
    pl.position.set(P.x, P.y, P.z);
    pl.scale.setScalar(P.w);
    pl.children[0].rotation.y = t * 0.012;
    {
      const d = this._w.copy(pl.position).sub(g.camera.position).normalize(), open = lerp(0.3, 0.11, smoothstep(90, 180, P.w)); // (how far the rings are tipped open toward the eye)
      const up = this._s.set(-0.42, 0.9, 0).addScaledVector(d, -(d.x * -0.42 + d.y * 0.9)).normalize();
      this.rings.quaternion.setFromUnitVectors(v0z, up.multiplyScalar(Math.cos(open)).addScaledVector(d, -Math.sin(open)).normalize());
      this.rings.material.uniforms.uLaneK.value = clamp(P.w / 150, 0.2, 1);
    }
    this.moon.position.set(Math.cos(t * 0.05) * 3.0, 0.5, Math.sin(t * 0.05) * 3.0);
    this.planetU.uA.value.copy(c.a).multiplyScalar(0.5);
    this.planetU.uB.value.copy(c.b).lerp(c.a, 0.35).multiplyScalar(0.8);
    this.planetU.uC.value.copy(c.gold).multiplyScalar(0.6);
    this.planetU.uGold.value.copy(c.c);
    this.planetU.uRim.value.copy(c.c).lerp(c.b, 0.3).multiplyScalar(1.5);
    // clouds
    const m = this._m, q = this._q, v = this._v, sc = this._s;
    this.cloudMesh.visible = c.clouds > 0.02;
    if (this.cloudMesh.visible && !lite) {
      this.cloudU.uCA.value.copy(c.cloudA); this.cloudU.uCB.value.copy(c.cloudB); this.cloudU.uK.value = c.clouds * 0.45;
      this.clouds.forEach((cl, i) => {
        cl.p.z += sp * 0.55 * dt;
        if (cl.p.z > -30) this.resetCloud(cl, i, -640);
        this.cloudMesh.setMatrixAt(i, m.compose(cl.p, q.setFromAxisAngle(v.set(0, 0, 1), cl.rot), sc.set(cl.s, cl.s * 0.62, 1)));
      });
      this.cloudMesh.instanceMatrix.needsUpdate = true;
      this.cloudMesh.geometry.attributes.aData.needsUpdate = true;
    }
    // rocks: as many as the region has, tumbling past
    const nearN = Math.round(16 * Math.min(1, c.rocks * 1.4)), farN = Math.round(96 * c.rocks);
    this.rockNear.count = nearN; this.rockFar.count = farN;
    this.rockNear.visible = nearN > 0; this.rockFar.visible = farN > 0;
    if (nearN + farN > 0 && !cheap) {
      this.rocks.forEach((r) => {
        if (r.i >= (r.near ? nearN : farN) || (r.near && lite)) return;
        r.p.z += sp * r.f * dt;
        r.ph += r.w * dt;
        if (r.p.z > 30) this.resetRock(r, -660);
        const grow = smoothstep(-660, -560, r.p.z) * (1 - smoothstep(-45, 12, r.p.z)); // they come out of the distance rather than popping in, and shrink away as they pass
        (r.near ? this.rockNear : this.rockFar).setMatrixAt(r.i, m.compose(r.p, q.setFromAxisAngle(r.ax, r.ph), sc.copy(r.sc).multiplyScalar(grow)));
      });
      this.rockNear.instanceMatrix.needsUpdate = this.rockFar.instanceMatrix.needsUpdate = true;
    }
    // the station, off to port: it is there in its region, far ahead before, left behind after
    const place = (obj, k, home, near) => {
      obj.visible = k > 0.004;
      if (!obj.visible) { obj.userData.d = 0; return; }
      const e = k * k * (3 - 2 * k), coming = this.to[obj.userData.key] > 0.5;
      obj.userData.d = Math.min(1, (obj.userData.d || 0) + dt / 150); // (two and a half minutes to come all the way in)
      const z = lerp(home[2], near, obj.userData.d), f = z / home[2];
      obj.position.set(home[0] * f, home[1] * f, coming ? lerp(z - 1500, z, e) : lerp(z + 900, z, e));
    };
    this.station.userData.key = "station"; this.wreckMesh.userData.key = "wrecks"; this.gate.userData.key = "gate";
    place(this.station, c.station, [-104, 90, -640], -330);
    if (this.station.visible) {
      this.stationRing.rotation.y += dt * 0.11;
      this.laneMesh.visible = true;
      for (let i = 0; i < 28; i++) {
        const row = Math.floor(i / 2), side = i % 2 ? 1 : -1, u = row / 13;
        this.laneMesh.setMatrixAt(i, m.compose(v.set(this.station.position.x + 34 + u * 26 + side * 2, this.station.position.y - 10 - u * 30 + side * 7, this.station.position.z + 40 + u * 420), q.identity(), sc.setScalar(1.3)));
      }
      this.laneMesh.instanceMatrix.needsUpdate = true;
    } else this.laneMesh.visible = false;
    // the wrecks
    this.wreckMesh.visible = c.wrecks > 0.004;
    if (this.wreckMesh.visible) {
      const e = c.wrecks * c.wrecks * (3 - 2 * c.wrecks), coming = this.to.wrecks > 0.5, off = coming ? (1 - e) * -1300 : (1 - e) * 900;
      this.wrecks.forEach((wr, i) => {
        wr.p.z += sp * 0.22 * dt;
        wr.ph += wr.w * dt;
        if (wr.p.z > 120) wr.p.z -= 1050;
        this.wreckMesh.setMatrixAt(i, m.compose(v.copy(wr.p).setZ(wr.p.z + off), q.setFromAxisAngle(wr.ax, wr.ph), sc.setScalar(wr.s)));
      });
      this.wreckMesh.instanceMatrix.needsUpdate = true;
    }
    // the gate, high to port, its whirl turning
    place(this.gate, c.gate, [-158, 140, -1050], -640);
    if (this.gate.visible) {
      this.vortex.material.uniforms.uK.value = c.gate * (0.42 + 0.06 * Math.sin(t * 0.8)) * (calm ? 0.7 : 1);
      this.vortex.material.uniforms.uColA.value.copy(c.a).multiplyScalar(1.4);
      this.vortex.material.uniforms.uColB.value.copy(c.b).multiplyScalar(1.2);
    }
    // the halo behind the enemy (or the answers' targets)
    const fr = g.enemy && g.enemy.root.visible ? g.enemy : null, H = this.halo;
    if (fr) { H.position.copy(fr.root.position); H.position.z -= 9; H.position.y += fr.S * 0.02; H.scale.setScalar(fr.S * 1.25); } else { H.position.set(0, 0.4, -98); H.scale.setScalar(13 + g.fx * 2.2); }
    H.quaternion.copy(g.camera.quaternion);
    this.haloU.uColor.value.copy(g.waveCol).multiplyScalar(0.55);
    this.haloU.uK.value += ((g.state === "over" ? 0 : 1) - this.haloU.uK.value) * Math.min(1, dt * 3);
    // fog and the scene's own lights take the region's colour (a little: the fighter and the enemy keep their own look)
    if (g.scene.fog) g.scene.fog.color.copy(c.fog);
    if (this.ambLight) this.ambLight.color.copy(this.amb0).lerp(c.amb, 0.4);
    if (g.keyLight) g.keyLight.color.copy(this.key0).lerp(c.key, 0.4);
    if (this.traffic) this.traffic.update(dt, sp, w);
    if (this.fx) this.fx.update(dt, sp);
    if (this.director) this.director.update(dt, g.state === "ask" || g.state === "explain");
  }
  // A right answer: the traffic near the fighter moves aside for it, and fireworks go up round the frame.
  onRight(color) {
    this.traffic.part();
    this.director.force("fireworks", color);
  }
  // A wrong answer (with the picture's glitch and the shield's flare, which the game already does): sparks off the hull, arcs across the shield.
  onWrong() {
    const g = this.g, k = g.shipScale, p = g.ship.position;
    [-1, 1].forEach((sd) => g.bursts.burst(this._v.set(p.x + sd * 2.4 * k, p.y + 0.5 * k, p.z - 0.5 * k), sd < 0 ? 0xffb357 : 0xbfe8ff, { n: GFX.calm ? 6 : 14, speed: 6 * k, size: 0.15 * k, life: 0.45 }));
    if (!GFX.calm) for (let i = 0; i < 3; i++) { // three short forks, each of three kinks
      const a = this._v.set(p.x + rand(-2.2, 2.2) * k, p.y + rand(0.3, 1.3) * k, p.z + rand(-0.8, 0.8) * k), b = this._w;
      for (let j = 0; j < 3; j++) {
        b.copy(a).add(this._s.set(rand(-0.5, 0.5) * k, rand(-0.45, 0.45) * k, rand(-0.3, 0.3) * k));
        this.fx.beam(a, b, 0.2, [1.5, 2.0, 2.8], 0.035 * k);
        a.copy(b);
      }
    }
  }
  // keep the far things where the camera is
  follow(camera) { this.far.position.copy(camera.position); }
  dispose() {
    if (this.nebTex.rt) this.nebTex.rt.dispose(); else this.nebTex.dispose();
    this.galaxyTex.dispose();
    if (this.traffic) this.traffic.dispose();
  }
}
