// The visual effects library every scene builds from. Colours passed through
// neon() exceed 1.0, which the HDR pipeline turns into real glow.
const neon = (hex, k = 2.4) => new THREE.Color(hex).multiplyScalar(k);

// Shared GLSL: hash + value noise.
const GLSL_NOISE = `
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}`;
// Merge geometries into one mesh (one draw call), keeping each piece's shared
// vertices: an indexed mesh shades a vertex once, where a flattened copy shades it
// again for every triangle that uses it (3-6x the vertex work on a lathe or torus).
function mergeIndexed(geos, names = ["position", "normal"]) {
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const size = geos[0].attributes[name].itemSize, arr = new Float32Array(count * size);
    let o = 0;
    for (const g of geos) {
      const a = g.attributes[name];
      for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[o++] = a.getComponent ? a.getComponent(i, k) : a.array[i * size + k];
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  const idx = [];
  let base = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    if (g.index) { const I = g.index.array; for (let j = 0; j < g.index.count; j++) idx.push(base + I[j]); }
    else for (let j = 0; j < n; j++) idx.push(base + j);
    base += n;
    g.dispose();
  }
  out.setIndex(idx);
  return out;
}
// Fog the shaders apply themselves (kept in sync with scene.fog by FX.sync).
const GLSL_FOG_PARS = "uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;";
const fogUniforms = () => ({ uFogColor: { value: new THREE.Color(0) }, uFogNear: { value: 1 }, uFogFar: { value: 1e5 } });

const FX = {
  // Copy scene fog and time into every custom shader in a scene. Call once a frame.
  sync(scene, t) {
    const fog = scene.fog;
    scene.traverse((o) => {
      const m = o.material;
      if (!m || !m.uniforms) return;
      const u = m.uniforms;
      if (u.uTime) u.uTime.value = t;
      if (u.uFogColor && fog) { u.uFogColor.value.copy(fog.color); u.uFogNear.value = fog.near; u.uFogFar.value = fog.far; }
    });
  },
};

// A sky dome that follows the camera: gradient, a hot horizon band, twinkling
// stars, optional thin cloud bands or a nebula.
function makeSky({ top = 0x05010f, mid = 0x1d0640, horizon = 0xff3ad4, bottom = 0x07021a, glow = 1, stars = 1, clouds = 0, nebula = 0, nebulaColor = 0x35efff, radius = 420 } = {}) {
  const uniforms = {
    uTop: { value: new THREE.Color(top) }, uMid: { value: new THREE.Color(mid) }, uHorizon: { value: new THREE.Color(horizon) },
    uBottom: { value: new THREE.Color(bottom) }, uGlow: { value: glow }, uStars: { value: stars }, uClouds: { value: clouds },
    uNebula: { value: nebula }, uNebulaColor: { value: new THREE.Color(nebulaColor) }, uTime: { value: 0 },
  };
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `${GLSL_NOISE}
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uNebulaColor;
      uniform float uGlow; uniform float uStars; uniform float uClouds; uniform float uNebula; uniform float uTime; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.2, h));
        col = mix(col, uTop, smoothstep(0.2, 0.75, h));
        if (h < 0.0) col = mix(uHorizon * 0.55, uBottom, smoothstep(0.0, 0.18, -h));
        col += uHorizon * uGlow * (0.8 * exp(-abs(h) * 26.0) + 0.25 * exp(-abs(h) * 6.0));
        if (uNebula > 0.0) {
          float n = vnoise(d * 3.0 + vec3(0.0, 0.0, uTime * 0.01)) * 0.55 + vnoise(d * 7.5 - vec3(uTime * 0.008)) * 0.3 + vnoise(d * 16.0) * 0.15;
          float m = vnoise(d * 2.2 + 11.0);
          col += mix(uNebulaColor, uHorizon, m) * pow(max(n - 0.25, 0.0) * 1.4, 2.2) * uNebula;
        }
        // clouds and stars only exist above the horizon: skip their noise elsewhere
        if (uClouds > 0.0 && h > 0.015 && h < 0.42) {
          float b = vnoise(vec3(d.x * 3.0 + uTime * 0.004, h * 34.0, d.z * 3.0));
          float band = smoothstep(0.58, 0.9, b) * smoothstep(0.015, 0.09, h) * (1.0 - smoothstep(0.12, 0.42, h));
          col = mix(col, uHorizon * 0.9 + uMid * 0.4, band * uClouds * 0.45);
        }
        if (uStars > 0.0 && h > 0.02) {
          vec3 p = d * 240.0; vec3 c = floor(p); float r = hash13(c);
          if (r > 0.972) {
            float s = smoothstep(0.3, 0.0, length(fract(p) - 0.5));
            float tw = 0.5 + 0.5 * sin(uTime * (1.2 + r * 5.0) + r * 77.0);
            col += vec3(1.0, 0.9, 1.0) * s * (0.4 + 0.6 * tw) * uStars * smoothstep(0.02, 0.22, h) * (r > 0.996 ? 3.5 : 1.3);
          }
        }
        // a shooting star now and then: a short streak of light across the upper sky
        if (uStars > 0.0 && h > 0.06) {
          float mp = uTime / 3.7; float mid = floor(mp); float mf = fract(mp);
          if (mf < 0.22) {
            vec2 sp = vec2(atan(d.x, -d.z), h);
            // it starts low enough to be in view and runs mostly sideways, sinking a little
            float side = hash13(vec3(mid, 9.0, 4.0)) < 0.5 ? -1.0 : 1.0;
            vec2 m0 = vec2(hash13(vec3(mid, 1.0, 7.0)) * 1.2 - 0.6 - side * 0.25, 0.2 + hash13(vec3(mid, 5.0, 2.0)) * 0.22);
            vec2 mv = normalize(vec2(side, -0.3));
            float k = mf / 0.22;
            vec2 head = m0 + mv * k * 0.5;
            float along = clamp(dot(sp - head, -mv), 0.0, 0.16);
            float dist = length(sp - head + mv * along);
            col += vec3(1.0, 0.92, 0.85) * smoothstep(0.006, 0.0, dist) * (1.0 - along / 0.16) * sin(k * 3.14159) * 3.0 * uStars;
          }
        }
        // Encode like built-in materials do: identity in the scene, RGBE when the
        // PMREM generator renders this sky into an environment map.
        gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
      }`,
  }));
  // Drawn after the other solid objects and depth-tested (the dome is far behind
  // them), so the sky's noise and stars are only computed where they show, not
  // under the floor, mountains and city that cover half the screen.
  m.renderOrder = 50;
  m.frustumCulled = false;
  m.userData.sky = true;
  return m;
}
// A ringed gas giant, lit from one side with a bright limb: scenery for deep space.
function makePlanet({ radius = 20, a = 0x3b1d8f, b = 0xff5fb4, rim = 0x7ad0ff, ring = 0xffc98a } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), new THREE.ShaderMaterial({
    uniforms: { uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uRim: { value: neon(rim, 1.9) } },
    vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uA; uniform vec3 uB; uniform vec3 uRim; varying vec3 vN; varying vec3 vP;
      void main(){
        vec3 n = normalize(vN);
        float lit = max(dot(n, normalize(vec3(-0.62, 0.45, 0.64))), 0.0);
        float band = 0.5 + 0.5 * sin(vP.y * ${(11 / radius).toFixed(3)} + sin(vP.x * ${(5 / radius).toFixed(3)}) * 1.3);
        float limb = pow(1.0 - max(n.z, 0.0), 2.6);
        gl_FragColor = vec4(mix(uA, uB, band) * (0.03 + 1.25 * lit) + uRim * limb * (0.12 + lit), 1.0);
      }`,
  }));
  const rings = new THREE.Mesh(new THREE.RingGeometry(radius * 1.35, radius * 2.15, 64, 1), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: neon(ring, 1.1) } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 uColor; varying vec2 vP;
      void main(){
        float r = (length(vP) - ${(radius * 1.35).toFixed(2)}) / ${(radius * 0.8).toFixed(2)};
        float lanes = 0.35 + 0.65 * abs(sin(r * 21.0)) * step(0.08, fract(r * 3.1));
        gl_FragColor = vec4(uColor * lanes * smoothstep(0.0, 0.08, r) * smoothstep(1.0, 0.85, r) * 0.55, 1.0);
      }`,
  }));
  rings.rotation.x = Math.PI / 2 - 0.42;
  rings.rotation.y = 0.3;
  g.add(body, rings);
  return g;
}
// Keep a sky dome centred on the camera so it reads as infinitely far.
function followSky(sky, camera) { sky.position.copy(camera.position); }

// The synthwave sun: a gradient disc with stripe gaps that scroll down.
// (egg: the disc is an egg instead, fuller below its middle, with a sheen and a few speckles and no gaps:
// Nest Egg Run's own sun.)
function makeNeonSun({ radius = 40, top = 0xffe14f, bottom = 0xff2a8a, intensity = 2.4, stripes = true, halo = 0xff3ad4, egg = false } = {}) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(top) }, uBottom: { value: new THREE.Color(bottom) }, uI: { value: intensity }, uTime: { value: 0 }, uStripes: { value: stripes ? 1 : 0 }, uTint: { value: new THREE.Color(1, 1, 1) }, uEgg: { value: egg ? 1 : 0 } },
    transparent: true, depthWrite: false, extensions: { derivatives: true },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uTint; uniform float uI; uniform float uTime; uniform float uStripes; uniform float uEgg; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0; float r = length(p);
        vec2 q = p;
        if (uEgg > 0.5) { q = vec2(p.x / (0.77 * (1.0 - 0.2 * p.y)), p.y / 0.98); r = length(q); }
        float fw = fwidth(r);
        float a = 1.0 - smoothstep(1.0 - fw * 1.5, 1.0, r);
        vec3 col = mix(uBottom, uTop, smoothstep(-0.85, 0.85, p.y)) * uI * uTint;
        col *= 1.0 + 0.35 * smoothstep(0.6, 1.0, r);
        if (uEgg > 0.5) {
          // a shell, not a disc: lit from its upper left, falling to shade at its lower right, a bright
          // rim all round, a sheen on its shoulder, speckles of two sizes
          vec3 en = vec3(q, sqrt(max(0.0, 1.0 - r * r)));
          float lit = clamp(dot(en, normalize(vec3(-0.45, 0.5, 0.74))), 0.0, 1.0);
          col *= 0.5 + 0.75 * lit;
          col += uTop * uTint * uI * 0.55 * pow(lit, 14.0);
          col += uBottom * uTint * uI * 0.5 * smoothstep(0.86, 1.0, r);
          vec2 sq = floor(q * 22.0), sf = fract(q * 22.0) - 0.5;
          float sh = fract(sin(dot(sq, vec2(127.1, 311.7))) * 43758.5453);
          col *= 1.0 - 0.34 * step(0.9, sh) * (1.0 - smoothstep(0.12 + 0.2 * fract(sh * 7.0), 0.3 + 0.2 * fract(sh * 7.0), length(sf)));
        }
        if (uStripes > 0.5) {
          float yy = 0.18 - p.y;
          if (yy > 0.0) {
            float ph = fract(yy * 7.0 + uTime * 0.25);
            float th = clamp(0.06 + yy * 0.55, 0.06, 0.8);
            float w = fwidth(ph) * 1.2;
            a *= smoothstep(th - w, th + w, ph);
          }
        }
        gl_FragColor = vec4(col, a);
      }`,
  });
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  const glow = glowSprite(neon(halo, 1.6), radius * 3.6, 0.55);
  g.add(glow, disc);
  g.userData.disc = disc;
  g.userData.glow = glow;
  return g;
}

// A planar mirror at height y. Floors sample its texture for reflections.
// Only layer-0 objects are reflected; put small details on layer 1.
class Mirror {
  constructor(y = 0) {
    this.y = y;
    this.rt = new THREE.WebGLRenderTarget(2, 2, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
      type: GFX.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false,
    });
    this.cam = new THREE.PerspectiveCamera();
    this.cam.layers.set(0);
    this.matrix = new THREE.Matrix4();
    this.receivers = [];
    this.hide = [];
    this._v = { n: new THREE.Vector3(0, 1, 0), p: new THREE.Vector3(), cam: new THREE.Vector3(), look: new THREE.Vector3(), tgt: new THREE.Vector3(),
      rot: new THREE.Matrix4(), plane: new THREE.Plane(), clip: new THREE.Vector4(), q: new THREE.Vector4() };
  }
  get texture() { return this.rt.texture; }
  render(renderer, scene, camera, size) {
    const v = this._v;
    if (this.rt.width !== size.w || this.rt.height !== size.h) this.rt.setSize(size.w, size.h);
    camera.updateMatrixWorld();
    v.cam.setFromMatrixPosition(camera.matrixWorld);
    if (v.cam.y <= this.y + 0.01) return;
    v.p.set(v.cam.x, this.y, v.cam.z);
    const vc = this.cam;
    vc.position.copy(v.p).sub(v.cam).reflect(v.n).negate().add(v.p);
    v.rot.extractRotation(camera.matrixWorld);
    v.look.set(0, 0, -1).applyMatrix4(v.rot).add(v.cam);
    v.tgt.copy(v.p).sub(v.look).reflect(v.n).negate().add(v.p);
    vc.up.set(0, 1, 0).applyMatrix4(v.rot).reflect(v.n);
    vc.lookAt(v.tgt);
    vc.far = camera.far;
    vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    this.matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
    // Oblique near plane: clip everything below the mirror.
    v.plane.setFromNormalAndCoplanarPoint(v.n, v.p).applyMatrix4(vc.matrixWorldInverse);
    v.clip.set(v.plane.normal.x, v.plane.normal.y, v.plane.normal.z, v.plane.constant);
    const e = vc.projectionMatrix.elements;
    v.q.set((Math.sign(v.clip.x) + e[8]) / e[0], (Math.sign(v.clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    v.clip.multiplyScalar(2 / v.clip.dot(v.q));
    e[2] = v.clip.x; e[6] = v.clip.y; e[10] = v.clip.z + 1 - 0.003; e[14] = v.clip.w;
    for (const r of this.receivers) r.visible = false;
    for (const o of this.hide) o.visible = false;
    const sky = scene.children.find((c) => c.userData.sky);
    if (sky) { sky.position.copy(vc.position); sky.updateMatrixWorld(); } // scenes don't auto-update matrices per pass (GFX.render)
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, vc);
    if (sky) { sky.position.copy(v.cam); sky.updateMatrixWorld(); }
    for (const r of this.receivers) r.visible = true;
    for (const o of this.hide) o.visible = true;
    this.blanked = false;
  }
  // Lite mode skips reflections: clear the old one once, so floors don't keep showing
  // a frozen picture of the scene while the world moves on.
  blank(renderer) {
    if (this.blanked) return;
    this.blanked = true;
    const c = renderer.getClearColor(this._v.cc || (this._v.cc = new THREE.Color())), a = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.setClearColor(c, a);
  }
  dispose() { this.rt.dispose(); }
}

// A glossy floor with a glowing anti-aliased grid (square or polar) and an
// optional mirror reflection with a gentle wet ripple.
function makeNeonFloor({ size = 900, cell = 6, line = 0xff3ad4, lineK = 2.2, base = 0x07021a, mirror = null, reflect = 0.5, polar = false, spokes = 16,
  glow = 0.45, ripple = 0.004, streak = 0.012, gridAlpha = 1, pulse = 0 } = {}) {
  const uniforms = Object.assign(fogUniforms(), {
    uLine: { value: neon(line, lineK) }, uBase: { value: new THREE.Color(base) }, uCell: { value: cell }, uScroll: { value: 0 },
    tReflect: { value: mirror ? mirror.texture : null }, uMirror: { value: mirror ? mirror.matrix : new THREE.Matrix4() },
    uReflect: { value: mirror ? reflect : 0 }, uTime: { value: 0 }, uGlow: { value: glow }, uPolar: { value: polar ? 1 : 0 },
    uSpokes: { value: spokes }, uRipple: { value: ripple }, uStreak: { value: streak }, uGrid: { value: gridAlpha }, uPulse: { value: pulse },
  });
  const mat = new THREE.ShaderMaterial({
    uniforms, extensions: { derivatives: true },
    vertexShader: `uniform mat4 uMirror; varying vec3 vWorld; varying vec4 vRefl; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vRefl = uMirror * w; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform vec3 uLine; uniform vec3 uBase; uniform float uCell; uniform float uScroll; uniform sampler2D tReflect; uniform float uReflect;
      uniform float uTime; uniform float uGlow; uniform float uPolar; uniform float uSpokes; uniform float uRipple; uniform float uStreak; uniform float uGrid; uniform float uPulse;
      varying vec3 vWorld; varying vec4 vRefl; varying float vDepth;
      void main(){
        vec3 col = uBase;
        if (uReflect > 0.0) {
          vec2 ruv = vRefl.xy / vRefl.w;
          vec2 rip = vec2(sin(vWorld.z * 2.3 + uTime * 0.9) * 0.6 + sin(vWorld.x * 1.1 - uTime * 0.5) * 0.4, cos(vWorld.x * 1.7 + vWorld.z * 0.4 + uTime * 0.6)) * uRipple;
          vec3 r = texture2D(tReflect, ruv + rip).rgb * 0.36;
          r += texture2D(tReflect, ruv + rip + vec2(0.0, uStreak)).rgb * 0.22;
          r += texture2D(tReflect, ruv + rip - vec2(0.0, uStreak)).rgb * 0.22;
          r += texture2D(tReflect, ruv + rip + vec2(0.0, uStreak * 2.2)).rgb * 0.1;
          r += texture2D(tReflect, ruv + rip - vec2(0.0, uStreak * 2.2)).rgb * 0.1;
          col += r * uReflect;
        }
        vec2 g; vec2 fw;
        if (uPolar > 0.5) {
          float rr = length(vWorld.xz);
          float th = atan(vWorld.z, vWorld.x) / 6.2831853;
          g = vec2(th * uSpokes, rr / uCell);
          fw = vec2(min(fwidth(th), fwidth(fract(th + 0.5))) * uSpokes, fwidth(g.y));
        } else {
          g = vec2(vWorld.x, vWorld.z + uScroll) / uCell;
          fw = fwidth(g);
        }
        fw = max(fw, vec2(1e-4));
        vec2 dd = abs(fract(g - 0.5) - 0.5);
        vec2 aa = dd / fw;
        float ln = 1.0 - min(min(aa.x, aa.y), 1.0);
        float halo = exp(-min(aa.x, aa.y) * 0.45);
        float fade = 1.0 - smoothstep(0.18, 0.55, max(fw.x, fw.y));
        col += uLine * (ln + halo * uGlow * 0.2) * fade * uGrid;
        if (uPulse > 0.0) {
          // packets of light running along the lines: toward us down the long ones, sideways on the cross ones
          float pz = pow(0.5 + 0.5 * sin(g.y * 0.55 + uTime * 2.3 + floor(g.x - 0.5) * 1.7), 14.0);
          float px = pow(0.5 + 0.5 * sin(g.x * 0.7 - uTime * 1.6 + floor(g.y - 0.5) * 2.3), 18.0);
          col += (uLine + vec3(0.6)) * uPulse * fade * ((1.0 - min(aa.x, 1.0)) * pz + (1.0 - min(aa.y, 1.0)) * px * 0.7) * 2.2;
        }
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  floor.rotation.x = -Math.PI / 2;
  if (mirror) mirror.receivers.push(floor);
  return floor;
}

// A distant city: merged boxes with lit windows and a glowing roofline.
function makeSkyline({ count = 70, width = 380, z = -185, minH = 6, maxH = 34, depth = 16, base = 0x0c0424, window = 0xffcf7a, lit = 0.3, edge = 0x35efff } = {}) {
  const pos = [], nor = [], seed = [];
  let x = -width / 2;
  for (let i = 0; i < count && x < width / 2; i++) {
    const w = rand(4, 11), h = rand(minH, maxH) * (1 - Math.abs(x) / width * 0.9), d = rand(depth * 0.5, depth);
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x + w / 2, h / 2, z + rand(-8, 8));
    const p = g.attributes.position.array, n = g.attributes.normal.array, s = Math.random();
    for (let k = 0; k < p.length; k++) { pos.push(p[k]); nor.push(n[k]); }
    for (let k = 0; k < p.length / 3; k++) seed.push(s);
    x += w + rand(-1.5, 1.5);
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uBase: { value: new THREE.Color(base) }, uWin: { value: neon(window, 2.2) }, uLit: { value: lit }, uTime: { value: 0 } }),
    extensions: { derivatives: true },
    vertexShader: `attribute float aSeed; varying vec3 vWorld; varying vec3 vN; varying float vSeed; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vN = normal; vSeed = aSeed; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_NOISE} ${GLSL_FOG_PARS}
      uniform vec3 uBase; uniform vec3 uWin; uniform float uLit; uniform float uTime; varying vec3 vWorld; varying vec3 vN; varying float vSeed; varying float vDepth;
      void main(){
        vec3 col = uBase * (0.6 + 0.4 * max(vN.z, 0.0)) * (0.7 + 0.5 * smoothstep(0.0, 30.0, vWorld.y));
        if (abs(vN.z) > 0.5 || abs(vN.x) > 0.5) {
          vec2 q = vec2((abs(vN.z) > 0.5 ? vWorld.x : vWorld.z) / 1.7, vWorld.y / 1.45);
          vec2 cell = floor(q); vec2 f = fract(q);
          float on = step(hash13(vec3(cell, floor(vSeed * 97.0))), uLit);
          float win = step(0.28, f.x) * step(f.x, 0.72) * step(0.32, f.y) * step(f.y, 0.78);
          float flick = 0.85 + 0.15 * sin(uTime * 0.5 + hash13(vec3(cell, 3.0)) * 40.0);
          vec3 wc = mix(uWin, uWin.bgr * 0.8, step(0.8, hash13(vec3(cell, 9.0))));
          col += wc * win * on * flick * (abs(vN.z) > 0.5 ? 1.0 : 0.5);
        }
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

// Layered mountains: gradient-filled peaks with a glowing ridge line.
function makeRidge({ width = 560, z = -230, height = 40, n = 46, top = 0x3a1066, bottom = 0x0b0322, line = 0xff3ad4, lineK = 2.2, wire = true } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = -width / 2 + (width * i) / n;
    const edge = Math.abs(x) / (width / 2);
    const peak = i % 2 ? rand(0.55, 1) : rand(0.1, 0.42);
    pts.push([x, peak * height * (0.3 + 0.7 * edge)]);
  }
  const pos = [], col = [];
  const cTop = new THREE.Color(top), cBot = new THREE.Color(bottom);
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const c0 = cBot.clone().lerp(cTop, y0 / height), c1 = cBot.clone().lerp(cTop, y1 / height);
    pos.push(x0, 0, 0, x1, 0, 0, x1, y1, 0, x0, 0, 0, x1, y1, 0, x0, y0, 0);
    [cBot, cBot, c1, cBot, c1, c0].forEach((c) => col.push(c.r, c.g, c.b));
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  fg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  const lp = [];
  pts.forEach(([x, y]) => lp.push(x, y, 0.2));
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  grp.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color: neon(line, lineK) })));
  if (wire) {
    const wp = [];
    const dx = width / n;
    for (let i = 1; i < n; i++) {
      const [x, y] = pts[i];
      if (y > height * 0.3) wp.push(x, y, 0.1, x - dx * 0.8, y * 0.35, 0.1, x, y, 0.1, x + dx * 0.6, y * 0.25, 0.1);
    }
    const wg = new THREE.BufferGeometry();
    wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3));
    grp.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: neon(line, 0.7), transparent: true, opacity: 0.5 })));
  }
  grp.position.z = z;
  return grp;
}

// A soft volumetric beam of light, hanging down from its origin.
function makeLightCone({ color = 0xff3ad4, top = 0.25, bottom = 2.6, height = 8, intensity = 0.55 } = {}) {
  const geo = new THREE.CylinderGeometry(top, bottom, height, 32, 1, true);
  geo.translate(0, -height / 2, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: neon(color, 1) }, uI: { value: intensity }, uH: { value: height }, uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform float uH; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ vH = 1.0 + position.y / uH; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; uniform float uTime; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float fall = pow(clamp(vH, 0.0, 1.0), 1.4) * smoothstep(0.0, 0.18, vH);
        float flick = 0.92 + 0.08 * sin(uTime * 13.0 + vH * 4.0);
        gl_FragColor = vec4(uColor * uI * face * fall * flick, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 5;
  return m;
}

// A glowing pool of light lying on the floor.
function makeLightPool({ color = 0xff3ad4, radius = 2.6, intensity = 0.9 } = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color: neon(color, intensity), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  m.renderOrder = 4;
  return m;
}

// A rim of light around a shape, brightest where it turns away from you.
function fresnelShell(geometry, color, { power = 2.4, intensity = 2, scale = 1.04 } = {}) {
  const m = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: neon(color, 1) }, uP: { value: power }, uI: { value: intensity } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform vec3 uColor; uniform float uP; uniform float uI; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uP); gl_FragColor = vec4(uColor * uI * f, 1.0); }",
  }));
  m.scale.setScalar(scale);
  return m;
}

// A glowing ribbon trail (engine exhaust, tail lights). Points are pushed each
// frame; the ribbon lies flat, perpendicular to its own direction.
class Trail {
  constructor({ length = 28, width = 0.3, color = 0xff3ad4, intensity = 2.5, up = new THREE.Vector3(0, 1, 0) } = {}) {
    this.n = length;
    this.width = width;
    this.up = up;
    this.pts = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.n * 2 * 3);
    const alpha = new Float32Array(this.n * 2);
    for (let i = 0; i < this.n; i++) { const a = Math.pow(1 - i / (this.n - 1), 1.6); alpha[i * 2] = a; alpha[i * 2 + 1] = a; }
    const idx = [];
    for (let i = 0; i < this.n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { uColor: { value: neon(color, intensity) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute float aAlpha; varying float vA; void main(){ vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor * vA, 1.0); }",
    }));
    this.mesh.frustumCulled = false;
    this._a = new THREE.Vector3();
    this._s = new THREE.Vector3();
  }
  reset(p) { this.pts = Array.from({ length: this.n }, () => p.clone()); }
  push(p) {
    if (!this.pts.length) this.reset(p);
    const last = this.pts.pop();
    last.copy(p);
    this.pts.unshift(last);
    for (let i = 0; i < this.n; i++) {
      const a = this.pts[i], b = this.pts[Math.min(this.n - 1, i + 1)], c = this.pts[Math.max(0, i - 1)];
      this._a.subVectors(c, b);
      if (this._a.lengthSq() < 1e-8) this._a.set(0, 0, 1);
      this._s.crossVectors(this._a, this.up).normalize().multiplyScalar(this.width * (1 - (i / this.n) * 0.6));
      this.pos[i * 6] = a.x + this._s.x; this.pos[i * 6 + 1] = a.y + this._s.y; this.pos[i * 6 + 2] = a.z + this._s.z;
      this.pos[i * 6 + 3] = a.x - this._s.x; this.pos[i * 6 + 4] = a.y - this._s.y; this.pos[i * 6 + 5] = a.z - this._s.z;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
  // Move every point (for worlds that scroll toward the camera).
  shift(dx, dy, dz) { for (const p of this.pts) { p.x += dx; p.y += dy; p.z += dz; } }
}

// An environment map for glossy materials, made from a small neon scene:
// a gradient sky plus a few bright panels that show up as reflections.
function makeEnvMap({ top = 0x14052e, horizon = 0xff3ad4, bottom = 0x05010f, glow = 1.4, panels = [] } = {}) {
  if (!GFX.ok) return null;
  const sc = new THREE.Scene();
  sc.add(makeSky({ top, mid: top, horizon, bottom, stars: 0, glow, radius: 60 }));
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w || 10, p.h || 4), new THREE.MeshBasicMaterial({ color: neon(p.color, p.k || 3), side: THREE.DoubleSide }));
    m.position.set(p.pos[0], p.pos[1], p.pos[2]);
    m.lookAt(0, 0, 0);
    sc.add(m);
  }
  const rt = GFX.pmrem().fromScene(sc, 0.02, 0.1, 100);
  disposeTree(sc);
  // In three r128 a render target's texture is only freed through the target, so
  // disposing the returned texture (as scenes do) frees the whole target.
  rt.texture.dispose = () => rt.dispose();
  return rt.texture;
}

// A glossy material that picks up the neon around it.
function glossy(color, { env = null, metal = 0.6, rough = 0.3, emissive = 0, emissiveK = 1, envI = 1.2 } = {}) {
  return new THREE.MeshStandardMaterial({
    color, metalness: metal, roughness: rough, envMap: env, envMapIntensity: envI,
    emissive: emissive ? neon(emissive, emissiveK) : 0x000000, flatShading: true,
  });
}

// An energy beam: hot white core, coloured falloff, crawling noise.
function beamMaterial(color, intensity = 3) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: neon(color, intensity) }, uTime: { value: 0 }, uFade: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_NOISE}
      uniform vec3 uColor; uniform float uTime; uniform float uFade; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV)));
        float core = pow(f, 6.0) * 2.5 + pow(f, 1.5);
        float crawl = 0.7 + 0.3 * vnoise(vec3(vUv.y * 30.0 - uTime * 25.0, vUv.x * 6.0, uTime));
        gl_FragColor = vec4((uColor + vec3(core * 0.6)) * core * crawl * uFade, 1.0);
      }`,
  });
}
// A reusable beam: a unit open cylinder, aimed and sized per shot with aimBeam().
// Pools of these replace a fresh beam per shot, whose new geometry and shader
// stalled the frame each time.
function makeBeam(color, intensity = 3) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 12, 1, true), beamMaterial(color, intensity));
  m.renderOrder = 6;
  m.visible = false;
  return m;
}
function aimBeam(m, from, to, radius) {
  const v = aimBeam._v || (aimBeam._v = { up: new THREE.Vector3(0, 1, 0), d: new THREE.Vector3() });
  v.d.subVectors(to, from);
  const len = Math.max(v.d.length(), 1e-4);
  m.position.copy(from).addScaledVector(v.d, 0.5);
  m.quaternion.setFromUnitVectors(v.up, v.d.multiplyScalar(1 / len));
  m.scale.set(radius, len, radius);
  m.visible = true;
  return m;
}
function beamBetween(from, to, color, radius = 0.1, intensity = 3) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 12, 1, true), beamMaterial(color, intensity));
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.renderOrder = 6;
  return m;
}

// Dust motes drifting in the air (or snow of sparks), additive soft dots.
function makeMotes({ count = 160, box = [30, 10, 30], center = [0, 4, -8], color = 0xbfb3ff, size = 0.18, k = 1.4 } = {}) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center[0] + rand(-box[0], box[0]) / 2;
    pos[i * 3 + 1] = center[1] + rand(-box[1], box[1]) / 2;
    pos[i * 3 + 2] = center[2] + rand(-box[2], box[2]) / 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: neon(color, k), map: glowTexture(), size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  p.userData.base = pos.slice();
  p.userData.drift = (t) => {
    const a = g.attributes.position.array, b = p.userData.base;
    for (let i = 0; i < count; i++) {
      a[i * 3] = b[i * 3] + Math.sin(t * 0.3 + i) * 0.4;
      a[i * 3 + 1] = b[i * 3 + 1] + Math.sin(t * 0.21 + i * 1.7) * 0.5;
    }
    g.attributes.position.needsUpdate = true;
  };
  return p;
}

// A falling star streaking across the sky now and then.
function makeShootingStar() {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -6, 1.2, 0], 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute([3, 3, 3.4, 0, 0, 0], 3));
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  l.visible = false;
  l.userData.t = rand(2, 6);
  l.userData.tick = (dt) => {
    const u = l.userData;
    u.t -= dt;
    if (u.t < 0 && !l.visible) {
      l.visible = true;
      u.life = 0;
      l.position.set(rand(-120, 120), rand(60, 110), -300);
      u.v = new THREE.Vector3(rand(-1, 1) > 0 ? 160 : -160, -36, 0);
      l.scale.set(u.v.x > 0 ? -1 : 1, 1, 1);
      l.scale.multiplyScalar(3);
    }
    if (l.visible) {
      u.life += dt;
      l.position.addScaledVector(u.v, dt);
      l.material.opacity = Math.sin(Math.min(1, u.life / 0.9) * Math.PI);
      if (u.life > 0.9) { l.visible = false; u.t = rand(4, 10); }
    }
  };
  return l;
}

// A city tower's skin, for boxes merged by RacerBatch (position, normal, color). Dark
// boxes become glass and steel: floors of windows lit at random (whole floors busy,
// whole floors dark), a few on a slow twinkle, rooms brighter toward their ceilings,
// unlit glass mirroring the sky, light from the street climbing the lower storeys.
// Bright boxes (trim, lamps, signs) pass through as light. Where the windows would be
// smaller than a pixel or two they melt into an even glow instead of shimmering.
function cityFacadeMaterial({ win = 0xffd9a0, cool = 0x9fe8ff, hot = 0xff8fd0, sky = 0xff3ad4, skyB = 0x2ad8ff, zenith = 0x120836, street = 0xff3ad4, lit = 0.4, cell = [1.3, 1.75], k = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uWin: { value: neon(win, 2.3) }, uCool: { value: neon(cool, 1.8) }, uHot: { value: neon(hot, 1.9) },
      uSky: { value: new THREE.Color(sky) }, uSkyB: { value: new THREE.Color(skyB) }, uZen: { value: new THREE.Color(zenith) }, uStreet: { value: neon(street, 0.4) }, uLit: { value: lit }, uCell: { value: new THREE.Vector2(cell[0], cell[1]) }, uK: { value: k },
      uSunDir: { value: new THREE.Vector3(0, 0.06, -1).normalize() }, uSunCol: { value: neon(0xffa860, 1.5) }, uFlash: { value: 0 } }),
    vertexColors: true, extensions: { derivatives: true },
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = mat3(modelMatrix) * normal; vC = color; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_NOISE} ${GLSL_FOG_PARS}
      uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uFlash;
      uniform float uTime; uniform vec3 uWin; uniform vec3 uCool; uniform vec3 uHot; uniform vec3 uSky; uniform vec3 uSkyB; uniform vec3 uZen; uniform vec3 uStreet; uniform float uLit; uniform vec2 uCell; uniform float uK;
      varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vDepth;
      void main(){
        vec3 col = vC;
        if (max(vC.r, max(vC.g, vC.b)) < 0.3) {
          vec3 n = normalize(vN), V = normalize(cameraPosition - vW), R = reflect(-V, n);
          float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
          // the glass mirrors the sky: cyan off the towers to the left, magenta off those to the right
          vec3 skyc = mix(mix(uSkyB, uSky, smoothstep(-34.0, 34.0, vW.x)), uZen, smoothstep(-0.15, 0.5, R.y));
          col = vC * (0.55 + 0.7 * max(n.y, 0.0)) + skyc * (0.02 + 0.2 * fres);
          if (abs(n.y) < 0.5) {
            float along = abs(n.z) > abs(n.x) ? vW.x : vW.z;
            vec2 q = vec2(along / uCell.x, vW.y / uCell.y), id = floor(q), f = fract(q);
            float fine = 1.0 - smoothstep(0.22, 0.6, max(fwidth(q.x), fwidth(q.y)));
            float h1 = hash13(vec3(id, 1.0)), h2 = hash13(vec3(id, 5.0)), h3 = hash13(vec3(id, 9.0));
            float busy = step(0.6, hash13(vec3(id.y, floor(along / 17.0), 3.0)));
            float on = step(h1, uLit * (0.25 + 1.6 * busy));
            // structure: a pier every sixth bay, a spandrel under every window, two sashes to a bay
            float pier = step(0.5, mod(id.x, 6.0));
            float pane = smoothstep(0.1, 0.16, f.x) * smoothstep(0.9, 0.84, f.x) * smoothstep(0.22, 0.28, f.y) * smoothstep(0.9, 0.84, f.y) * pier;
            pane *= 0.3 + 0.7 * smoothstep(0.0, 0.04, abs(f.x - 0.5));
            vec3 wc = h2 < 0.5 ? uWin : (h2 < 0.72 ? uWin * vec3(1.0, 0.8, 0.55) : (h2 < 0.9 ? uCool : uHot));
            float level = 0.22 + 0.78 * h3 * h3; // most rooms dim, a few bright
            float room = 0.4 + 0.6 * smoothstep(0.22, 0.9, f.y); // brighter toward the ceiling lights
            float tw = 0.85 + 0.15 * sin(uTime * (0.3 + h2 * 0.9) + h1 * 40.0);
            vec3 glass = skyc * (0.06 + 0.34 * fres);
            vec3 near = mix(glass, wc * level * room * tw, on), far = glass + uWin * (uLit * 0.16);
            float gl = mix(0.55, pane, fine);
            col = mix(col, mix(far, near, fine), gl);
            // the low sun glancing off the panes, and lightning: a cold glint on the same glass, for a moment
            col += (uSunCol * pow(max(dot(R, uSunDir), 0.0), 9.0) * 0.5 + vec3(0.6, 0.72, 1.0) * uFlash * 0.5) * gl * (0.15 + 0.85 * fres);
            col += skyc * 0.06 * smoothstep(0.55, 1.0, vnoise(vec3(along * 1.1, vW.y * 0.06, 2.0))) * fine; // rain running down the glass
          }
          col += uStreet * smoothstep(26.0, 0.0, vW.y) * (0.2 + 0.6 * fres);
          col += vec3(0.6, 0.72, 1.0) * uFlash * 0.05;
        }
        col = mix(col * uK, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// A lit skin for things that fly (blimps, helicopters, drones), merged by RacerBatch:
// a key light, a glow from the city below, the sky caught at a glance. Bright boxes
// (lamps, panels) pass through as light.
function skyHullMaterial({ key = 0xffb6e6, keyDir = [0.1, 0.35, -1], under = 0xff3ad4, sky = 0x6a4cff, k = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uKey: { value: neon(key, 1.1) }, uKeyDir: { value: new THREE.Vector3(keyDir[0], keyDir[1], keyDir[2]).normalize() }, uUnder: { value: neon(under, 0.6) }, uSky: { value: new THREE.Color(sky) }, uK: { value: k } }),
    vertexColors: true,
    vertexShader: `varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vDepth;
      void main(){
        #ifdef USE_INSTANCING
        mat4 mm = modelMatrix * instanceMatrix;
        #else
        mat4 mm = modelMatrix;
        #endif
        vec4 w = mm * vec4(position, 1.0); vW = w.xyz; vN = mat3(mm) * normal; vC = color; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_FOG_PARS} uniform vec3 uKey; uniform vec3 uKeyDir; uniform vec3 uUnder; uniform vec3 uSky; uniform float uK;
      varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vDepth;
      void main(){
        vec3 col = vC;
        if (max(vC.r, max(vC.g, vC.b)) < 0.75) {
          vec3 n = normalize(vN), V = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(dot(n, V), 0.0), 2.6);
          col = vC * (0.5 + uKey * max(dot(n, uKeyDir), 0.0) * 2.2 + uUnder * max(-n.y, 0.0) * 1.6) + uSky * fres * 0.5 + uKey * pow(max(dot(reflect(-V, n), uKeyDir), 0.0), 24.0) * 0.6;
        }
        col = mix(col * uK, uFogColor, smoothstep(uFogNear, uFogFar, vDepth) * 0.85);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// ---- surface detail for physically-based materials -----------------------------------
// One tiling texture, made once: r = fine grain (cast metal, pebbled plastic), g = hair
// scratches, b = smudges (where a surface has been handled it is a little glossier or
// duller). surfaceDetail() lays it on a MeshStandardMaterial without any UVs (three
// projections, blended by the surface's facing) as real relief in the normal and as
// variation in roughness, at two scales so no repeat shows. Reflections break up over
// it the way they do on a real cabinet, hull or vault door.
function detailTile() {
  if (detailTile.t) return detailTile.t;
  const S = 512, c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d"), img = x.createImageData(S, S), d = img.data;
  let seed = 12345;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // tiling value noise on a lattice of n cells
  const lattice = (n) => { const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = rnd(); return (u, v) => {
    const fx = u * n, fy = v * n, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = g[(y0 % n) * n + (x0 % n)], b = g[(y0 % n) * n + ((x0 + 1) % n)], e = g[((y0 + 1) % n) * n + (x0 % n)], f = g[((y0 + 1) % n) * n + ((x0 + 1) % n)];
    return a + (b - a) * sx + (e - a) * sy + (a - b - e + f) * sx * sy; }; };
  const g1 = lattice(128), g2 = lattice(48), s1 = lattice(6), s2 = lattice(14), s3 = lattice(31);
  // scratches on their own canvas, each drawn nine times so they wrap
  const sc = document.createElement("canvas"); sc.width = sc.height = S;
  const y = sc.getContext("2d");
  y.fillStyle = "#000"; y.fillRect(0, 0, S, S);
  y.lineCap = "round";
  for (let i = 0; i < 150; i++) {
    const px = rnd() * S, py = rnd() * S, a = rnd() * Math.PI, len = 12 + rnd() * rnd() * 150, bend = (rnd() - 0.5) * 22, al = 0.18 + rnd() * 0.6;
    y.strokeStyle = `rgba(255,255,255,${al})`; y.lineWidth = 0.6 + rnd() * 0.8;
    for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
      y.beginPath(); y.moveTo(px + ox, py + oy);
      y.quadraticCurveTo(px + ox + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, py + oy + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, px + ox + Math.cos(a) * len, py + oy + Math.sin(a) * len);
      y.stroke();
    }
  }
  const sd = y.getImageData(0, 0, S, S).data;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S, v = j / S, k = (j * S + i) * 4;
    d[k] = 255 * clamp(0.5 + (g1(u, v) - 0.5) * 0.9 + (g2(u, v) - 0.5) * 0.5 + (rnd() - 0.5) * 0.25, 0, 1);
    d[k + 1] = sd[k];
    d[k + 2] = 255 * clamp(0.5 + (s1(u, v) - 0.5) * 0.9 + (s2(u, v) - 0.5) * 0.5 + (s3(u, v) - 0.5) * 0.25, 0, 1);
    d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (detailTile.t = t);
}
// scale: repeats per unit of the object's own space. height: relief in the same units.
// grain, scratch: how much of each. smudge: roughness variation (0..1). big: the second,
// larger layer's scale as a fraction of the first.
function surfaceDetail(m, { scale = 3, height = 0.0016, grain = 1, scratch = 1, smudge = 0.35, big = 0.19 } = {}) {
  const prev = m.onBeforeCompile, prevKey = (m.customProgramCacheKey ? m.customProgramCacheKey() : "") + (prev ? prev.toString() : "");
  const U = { tDetail: { value: detailTile() }, uDetail: { value: new THREE.Vector4(scale, grain * height, scratch * height, smudge) }, uDetailBig: { value: big } };
  m.extensions = Object.assign({}, m.extensions, { derivatives: true });
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, U);
    if (sh.fragmentShader.indexOf("#include <normal_fragment_begin>") < 0 || sh.fragmentShader.indexOf("#include <normal_fragment_maps>") < 0) return; // (a material with its own normal work keeps it)
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vDetailP; varying vec3 vDetailN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvDetailP = transformed; vDetailN = objectNormal;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vDetailP; varying vec3 vDetailN; uniform sampler2D tDetail; uniform vec4 uDetail; uniform float uDetailBig;
        vec3 detailTri(vec3 p, vec3 w){ return texture2D(tDetail, p.yz).rgb * w.x + texture2D(tDetail, p.xz).rgb * w.y + texture2D(tDetail, p.xy).rgb * w.z; }`)
      .replace("#include <normal_fragment_begin>", `
        vec3 dtW = abs(normalize(vDetailN)); dtW = dtW * dtW * dtW * dtW; dtW /= dtW.x + dtW.y + dtW.z;
        vec3 dtP = vDetailP * uDetail.x;
        vec3 dtA = detailTri(dtP, dtW), dtB = detailTri(dtP * uDetailBig + 0.37, dtW);
        // How many of the tile's texels land in one pixel. Relief finer than the pixel grid cannot be
        // drawn, only sparkle, so each layer fades out as it gets there (the broad layer lasts longer).
        float dtPx = max(length(dFdx(dtP)), length(dFdy(dtP))) * 512.0;
        float dtFine = 1.0 - smoothstep(0.55, 1.7, dtPx), dtBroad = 1.0 - smoothstep(0.55, 1.7, dtPx * uDetailBig);
        roughnessFactor = clamp(roughnessFactor * (1.0 + uDetail.w * (dtB.b * 2.0 - 1.0) * dtBroad) - dtA.g * 0.22 * dtFine * step(1e-7, uDetail.z), 0.05, 1.0);
        #include <normal_fragment_begin>`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { float dh = ((dtA.r - 0.5) * uDetail.y - dtA.g * uDetail.z) * dtFine + (dtB.r - 0.5) * uDetail.y * 2.5 * dtBroad;
          vec3 dsx = dFdx(-vViewPosition), dsy = dFdy(-vViewPosition), dr1 = cross(dsy, normal), dr2 = cross(normal, dsx);
          float ddet = dot(dsx, dr1);
          normal = normalize(abs(ddet) * normal - sign(ddet) * (dFdx(dh) * dr1 + dFdy(dh) * dr2)); }`);
  };
  m.customProgramCacheKey = () => prevKey + "|detail2";
  return m;
}

// The badge from an answer's button, for the 3D scenes: a disc (a lozenge for TRUE and FALSE) in the answer's
// colour, rimmed dark and then pale, its letter dark with a pale edge. It stands in the answer's lane in Nest Egg
// Run and is the face of the answer's drone in Risk Blaster: one badge, wherever an answer is shown.
function answerBadgeTexture(label, color, wide) {
  const c = document.createElement("canvas"), K = 3, W = wide ? 512 : 256, H = 256;
  c.width = W * K;
  c.height = H * K;
  const x = c.getContext("2d");
  x.scale(K, K);
  const R = H / 2 - 10;
  const shape = (inset) => {
    const r = R - inset;
    x.beginPath();
    x.moveTo(H / 2, H / 2 - r);
    x.lineTo(W - H / 2, H / 2 - r);
    x.arc(W - H / 2, H / 2, r, -Math.PI / 2, Math.PI / 2);
    x.lineTo(H / 2, H / 2 + r);
    x.arc(H / 2, H / 2, r, Math.PI / 2, Math.PI * 1.5);
    x.closePath();
  };
  shape(0);
  x.fillStyle = "#05021a";
  x.fill();
  shape(9);
  x.fillStyle = "#fff8e8";
  x.fill();
  shape(17);
  x.fillStyle = "#05021a";
  x.fill();
  shape(23);
  const g = x.createLinearGradient(0, H / 2 - R, 0, H / 2 + R);
  g.addColorStop(0, color);
  g.addColorStop(1, color);
  x.fillStyle = g;
  x.fill();
  x.save();
  shape(23);
  x.clip();
  const hi = x.createLinearGradient(0, H / 2 - R, 0, H / 2 + R);
  hi.addColorStop(0, "rgba(255,255,255,0.26)");
  hi.addColorStop(0.34, "rgba(255,255,255,0)");
  hi.addColorStop(0.55, "rgba(0,0,0,0)");
  hi.addColorStop(1, "rgba(10,0,60,0.5)");
  x.fillStyle = hi;
  x.fillRect(0, 0, W, H);
  x.restore();
  x.font = `${wide ? 78 : 132}px "Press Start 2P", "Courier New", monospace`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.lineJoin = "round";
  x.lineWidth = wide ? 9 : 12;
  x.strokeStyle = "rgba(255,255,255,0.75)";
  x.strokeText(label, W / 2 + (wide ? 4 : 7), H / 2 + (wide ? 6 : 10));
  x.fillStyle = "#12052e";
  x.fillText(label, W / 2 + (wide ? 4 : 7), H / 2 + (wide ? 6 : 10));
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 16;
  return t;
}
