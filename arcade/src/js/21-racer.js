// NEST EGG RUN — a neon lane racer through a 40-year career (age 25 to 65, one
// gate per year). A gantry with one sign per answer rushes toward you; be in the
// right lane when it arrives. Right answers compound your savings, wrong ones
// crash the market, three crashes force early retirement. Every 5-answer streak
// buys an insurance policy that pays out on your next crash.
const EGG_START = 25000;
const EGG_GOAL = 1000000;
const EGG_MILESTONES = [100000, 250000, 500000, 1000000, 1500000];
const CAREER_YEARS = 40;
const START_AGE = 25;

const laneX = (i, n) => (n === 2 ? [-2.5, 2.5] : [-3.75, -1.25, 1.25, 3.75])[i];

// The sky across a career: dawn at 25, bright day mid-career, golden hour, dusk at 65.
// Everything in the world takes its colour from here: sky dome, sun, fog, grid,
// mountains, street lamps, the light on the car.
const CAREER_SKY = [
  { p: 0, bg: 0x1c0b44, fog: 0x261048, sunY: 18, tint: 0xffd6ea, grid: 0xff6ad5, stars: 0.5,
    top: 0x0a0a34, mid: 0x33207a, horizon: 0xff6c7c, glow: 0.7, clouds: 0.7, sunTop: 0xfff2b0, sunBot: 0xff5078, halo: 0xff6a8a,
    ridge: 0x4a2a8e, line: 0xff7ad9, lamps: 0.85, city: 0.3, light: 0xffc0d0, amb: 0x5040a0, exposure: 1.1, bloom: 1, wet: 1, sunI: 1.8 },
  { p: 0.4, bg: 0x12256a, fog: 0x1f3c8c, sunY: 86, tint: 0xffffff, grid: 0x5ad0ff, stars: 0,
    top: 0x08226e, mid: 0x2462c8, horizon: 0x9fe4ff, glow: 0.5, clouds: 1, sunTop: 0xffffff, sunBot: 0xffd36a, halo: 0xbfeaff,
    ridge: 0x2e4cb0, line: 0x9fe8ff, lamps: 0.15, city: 0.08, light: 0xffffff, amb: 0x7080c0, exposure: 1, bloom: 0.85, wet: 0.42, sunI: 1.35 },
  { p: 0.75, bg: 0x24082e, fog: 0x2e0c34, sunY: 34, tint: 0xffc08f, grid: 0xff3ad4, stars: 0.25,
    top: 0x120626, mid: 0x5a1a40, horizon: 0xff8a2a, glow: 0.85, clouds: 0.9, sunTop: 0xffe680, sunBot: 0xff4a1a, halo: 0xff7a2a,
    ridge: 0x6a1e4a, line: 0xffa040, lamps: 0.85, city: 0.45, light: 0xffa860, amb: 0x6a3a6a, exposure: 1.08, bloom: 1, wet: 0.85, sunI: 1.8 },
  { p: 1, bg: 0x08021c, fog: 0x0c0324, sunY: 6, tint: 0xff8f70, grid: 0xa65fff, stars: 1,
    top: 0x010006, mid: 0x0e0326, horizon: 0xb0208e, glow: 0.65, clouds: 0.4, sunTop: 0xffb060, sunBot: 0xff2a6a, halo: 0xff3ad4,
    ridge: 0x2c1060, line: 0xff3ad4, lamps: 1, city: 0.6, light: 0xff9ad0, amb: 0x40308a, exposure: 1.14, bloom: 1.1, wet: 1, sunI: 1.9 },
];
const RACER_SKY_COLORS = ["bg", "fog", "tint", "grid", "top", "mid", "horizon", "sunTop", "sunBot", "halo", "ridge", "line", "light", "amb"];
const RACER_SKY_NUMS = ["sunY", "stars", "glow", "clouds", "lamps", "city", "exposure", "bloom", "wet", "sunI"];
let racerSkyOut = null;
// The career sky at p (0 = age 25, 1 = age 65). Returns one shared object, refilled on
// every call, so the per-frame lookup allocates nothing.
function skyAt(p) {
  let i = 0;
  while (i < CAREER_SKY.length - 2 && p > CAREER_SKY[i + 1].p) i++;
  const a = CAREER_SKY[i], b = CAREER_SKY[i + 1];
  const k = clamp((p - a.p) / (b.p - a.p), 0, 1);
  if (!racerSkyOut) {
    racerSkyOut = { _c: new THREE.Color() };
    RACER_SKY_COLORS.forEach((c) => (racerSkyOut[c] = new THREE.Color()));
  }
  const o = racerSkyOut;
  for (const c of RACER_SKY_COLORS) o[c].setHex(a[c]).lerp(o._c.setHex(b[c]), k);
  for (const n of RACER_SKY_NUMS) o[n] = lerp(a[n], b[n], k);
  return o;
}

// ---- the look ------------------------------------------------------------------
const RACER_ROAD = 5; // half-width of the asphalt
const RACER_P = 32; // street-lamp spacing on one side; the other side is offset by half
const RACER_LEN = 256; // the roadside props loop over this stretch of road...
const RACER_ZMAX = 12; // ...which ends just behind the camera
const RACER_WRAP = 8192; // scroll uniforms wrap here (every pattern period divides it)
const RACER_LAMP = [0x35efff, 0xff3ad4]; // left side, right side
const RACER_HEAD = 6.3; // lamp head height
const RACER_GATE_LANES = { 2: [-2.5, 2.5], 4: [-3.75, -1.25, 1.25, 3.75] };
const RACER_CAR_Z = -0.45; // the car model sits this far ahead of the car's origin
const racerF = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(+v.toFixed(4))); // a GLSL float literal

function racerM(x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}

// Collects many small pieces into one geometry, so a whole family of props draws in
// one call. Colours may exceed 1 (HDR neon); extra per-vertex floats ride along.
class RacerBatch {
  constructor(extra = []) {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.extra = {};
    extra.forEach((k) => (this.extra[k] = []));
    this._c = new THREE.Color();
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
  }
  vals(v, n) {
    for (const k in this.extra) for (let i = 0; i < n; i++) this.extra[k].push(v[k] || 0);
  }
  add(geo, m, color, k = 1, v = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    g.computeVertexNormals();
    const p = g.attributes.position.array, nr = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { this.pos.push(p[i]); this.nor.push(nr[i]); }
    const n = p.length / 3;
    if (color !== null) {
      const c = this._c.set(color);
      for (let i = 0; i < n; i++) this.col.push(c.r * k, c.g * k, c.b * k);
    }
    this.vals(v, n);
    g.dispose();
    return this;
  }
  // One triangle with its own colour at each corner.
  tri(a, b, c, ca, cb, cc, v = {}) {
    const n = this._a.subVectors(b, a).cross(this._b.subVectors(c, a)).normalize();
    for (const [p, q] of [[a, ca], [b, cb], [c, cc]]) {
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(n.x, n.y, n.z);
      this.col.push(q.r, q.g, q.b);
    }
    this.vals(v, 3);
  }
  build(colorName = "aCol") {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    if (this.col.length) g.setAttribute(colorName, new THREE.Float32BufferAttribute(this.col, 3));
    for (const k in this.extra) g.setAttribute(k, new THREE.Float32BufferAttribute(this.extra[k], 1));
    g.computeBoundingSphere();
    return g;
  }
}
// A box stretched between two points.
function racerStrut(b, box, a, c, t, color, k = 1, v = {}) {
  const d = new THREE.Vector3().subVectors(c, a);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.clone().normalize());
  b.add(box, new THREE.Matrix4().compose(a.clone().add(c).multiplyScalar(0.5), q, new THREE.Vector3(d.length(), t, t)), color, k, v);
}

// Roadside props loop along the road in the vertex shader: each one slides toward
// the camera and jumps back to the far end, so the whole avenue is one draw call.
const RACER_WRAP_GLSL = `uniform float uScroll; uniform float uLen; uniform float uZMax;
  float racerWrap(float z){ return uZMax - mod(uZMax - z - uScroll, uLen); }
  float racerFar(float zz){ return smoothstep(uZMax - uLen, uZMax - uLen + 45.0, zz); }`;
function racerPropMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), shared, {
      uKey: { value: new THREE.Color(1, 1, 1) }, uKeyDir: { value: new THREE.Vector3(-0.35, 0.8, 0.5).normalize() }, uAmb: { value: new THREE.Color(0.3, 0.25, 0.45) },
      uNeonI: { value: 1 },
    }),
    side: THREE.DoubleSide,
    vertexShader: `${RACER_WRAP_GLSL}
      attribute vec3 aCol; attribute float aZ; attribute float aKind;
      varying vec3 vCol; varying vec3 vN; varying float vKind; varying float vDepth; varying float vFar;
      void main(){
        float zz = racerWrap(aZ);
        vec3 p = position; p.z += zz - aZ;
        vCol = aCol; vN = normal; vKind = aKind; vFar = racerFar(zz);
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform vec3 uKey; uniform vec3 uKeyDir; uniform vec3 uAmb; uniform float uLampI; uniform float uNeonI;
      varying vec3 vCol; varying vec3 vN; varying float vKind; varying float vDepth; varying float vFar;
      void main(){
        vec3 col;
        if (vKind < 0.5) col = vCol * (uAmb + uKey * max(dot(normalize(vN), uKeyDir), 0.0));
        else col = vCol * (vKind < 1.5 ? uNeonI : uLampI);
        float f = max(smoothstep(uFogNear, uFogFar, vDepth), 1.0 - vFar);
        gl_FragColor = vec4(mix(col, uFogColor, f), 1.0);
      }`,
  });
}
// Soft camera-facing glows around the lamp heads.
function racerHaloMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), shared),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${RACER_WRAP_GLSL} ${GLSL_FOG_PARS}
      attribute vec3 aCol; attribute float aZ; attribute vec2 aCorner; attribute float aSize;
      uniform float uLampI; varying vec3 vCol; varying vec2 vC;
      void main(){
        float zz = racerWrap(aZ);
        vec3 p = position; p.z += zz - aZ;
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
        mv.xy += aCorner * aSize;
        vC = aCorner;
        vCol = aCol * uLampI * racerFar(zz) * (1.0 - 0.8 * smoothstep(uFogNear, uFogFar, -mv.z)) * smoothstep(2.0, 9.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying vec3 vCol; varying vec2 vC;
      void main(){ float r = dot(vC, vC); gl_FragColor = vec4(vCol * (exp(-r * 4.5) * 0.55 + exp(-r * 26.0)) * max(1.0 - r, 0.0), 1.0); }`,
  });
}
// Volumetric light cones (street lamps loop with the road; gantry signs do not).
function racerConeMaterial(shared, top, wrap) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), shared || {}, { uTop: { value: top }, uI: { value: 1 }, uTime: { value: 0 } }),
    defines: wrap ? { WRAP: "" } : {},
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `${GLSL_FOG_PARS}
      #ifdef WRAP
      ${RACER_WRAP_GLSL}
      attribute float aZ; uniform float uLampI;
      #endif
      attribute vec3 aCol; uniform float uTop;
      varying vec3 vCol; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 p = position; float k = 1.0;
        #ifdef WRAP
        float zz = racerWrap(aZ); p.z += zz - aZ; k = racerFar(zz) * uLampI;
        #endif
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        vH = position.y / uTop;
        vCol = aCol * k * (1.0 - 0.85 * smoothstep(uFogNear, uFogFar, -mv.z)) * (0.25 + 0.75 * smoothstep(4.0, 16.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uI; uniform float uTime; varying vec3 vCol; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
        float fall = pow(clamp(vH, 0.0, 1.0), 1.3) * smoothstep(0.0, 0.25, vH);
        gl_FragColor = vec4(vCol * uI * face * fall * (0.94 + 0.06 * sin(uTime * 13.0 + vH * 5.0)), 1.0);
      }`,
  });
}

// The ground: wet asphalt with neon lane markings down the middle, a glowing grid
// floor either side, both reflecting the world through one mirror. Street lamps,
// headlights, the car's underglow and the gantry signs light it analytically.
function racerGroundMaterial(mirror, shared) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), {
      uScroll: shared.uScroll, uLampI: shared.uLampI, uTime: { value: 0 },
      tReflect: { value: mirror.texture }, uMirror: { value: mirror.matrix }, uReflect: { value: 1 },
      uAsphalt: { value: new THREE.Color(0x0d0826) }, uBase: { value: new THREE.Color(0x05021a) }, uGrid: { value: neon(0xff3ad4, 1.5) },
      uEdge: { value: neon(0x35efff, 2.6) }, uDash: { value: neon(0xff3ad4, 1.7) },
      uLampL: { value: neon(RACER_LAMP[0], 0.9) }, uLampR: { value: neon(RACER_LAMP[1], 0.9) },
      uCarX: { value: 0 }, uUnder: { value: neon(0xff3ad4, 0.9) }, uHead: { value: 0.5 }, uTail: { value: 1 },
      uGateZ: { value: -999 }, uGateI: { value: 0 }, uGateN: { value: 4 },
      uSlot0: { value: neon(SLOT_COLORS[0], 1) }, uSlot1: { value: neon(SLOT_COLORS[1], 1) }, uSlot2: { value: neon(SLOT_COLORS[2], 1) }, uSlot3: { value: neon(SLOT_COLORS[3], 1) },
    }),
    extensions: { derivatives: true },
    vertexShader: `uniform mat4 uMirror; varying vec3 vWorld; varying vec4 vRefl; varying float vDepth;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vRefl = uMirror * w; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform float uScroll; uniform float uTime; uniform sampler2D tReflect; uniform float uReflect;
      uniform vec3 uAsphalt; uniform vec3 uBase; uniform vec3 uGrid; uniform vec3 uEdge; uniform vec3 uDash;
      uniform vec3 uLampL; uniform vec3 uLampR; uniform float uLampI;
      uniform float uCarX; uniform vec3 uUnder; uniform float uHead; uniform float uTail;
      uniform float uGateZ; uniform float uGateI; uniform float uGateN;
      uniform vec3 uSlot0; uniform vec3 uSlot1; uniform vec3 uSlot2; uniform vec3 uSlot3;
      varying vec3 vWorld; varying vec4 vRefl; varying float vDepth;
      float rh(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
      // value noise that tiles along the road, so the scroll can wrap without a seam
      float rn(vec2 p, float per){
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        float y0 = mod(i.y, per); float y1 = mod(i.y + 1.0, per);
        return mix(mix(rh(vec2(i.x, y0)), rh(vec2(i.x + 1.0, y0)), f.x), mix(rh(vec2(i.x, y1)), rh(vec2(i.x + 1.0, y1)), f.x), f.y);
      }
      float pool(vec2 d, vec2 r){ vec2 q = d / r; return exp(-dot(q, q)); }
      void main(){
        float x = vWorld.x; float z = vWorld.z; float s = z - uScroll; float ax = abs(x);
        float fx = max(fwidth(x), 1e-4);
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = 0.05 + 0.95 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
        float road = 1.0 - smoothstep(${RACER_ROAD}.0 - fx, ${RACER_ROAD}.0 + fx, ax);
        // wet asphalt: puddles mirror cleanly, damp patches smear lights into streaks
        float wet = rn(vec2(x * 0.45, s * 0.0625), 512.0);
        float puddle = smoothstep(0.5, 0.78, wet) * road;
        float rill = rn(vec2(x * 8.0, s * 0.25), 2048.0);
        vec3 refl = vec3(0.0);
        if (uReflect > 0.0) {
          vec2 uv = vRefl.xy / vRefl.w;
          vec2 rip = vec2(sin(s * 1.9 + x * 0.7 + uTime * 0.7), cos(x * 2.1 - s * 0.5 + uTime * 0.5)) * mix(0.001, 0.0005, road);
          uv += rip;
          if (road > 0.5) {
            // lights smear into vertical streaks on damp asphalt, puddles stay sharp
            vec2 st = vec2(0.0, mix(0.0055, 0.0012, puddle));
            refl = texture2D(tReflect, uv).rgb * 0.2;
            refl += (texture2D(tReflect, uv + st).rgb + texture2D(tReflect, uv - st).rgb) * 0.17;
            refl += (texture2D(tReflect, uv + st * 2.0).rgb + texture2D(tReflect, uv - st * 2.0).rgb) * 0.13;
            refl += (texture2D(tReflect, uv + st * 3.0).rgb + texture2D(tReflect, uv - st * 3.0).rgb) * 0.1;
            refl *= mix(0.55 + 0.9 * rill, 1.0, puddle) * mix(0.7, 1.0, puddle);
          } else {
            refl = texture2D(tReflect, uv).rgb * 0.5 + (texture2D(tReflect, uv + vec2(0.0, 0.004)).rgb + texture2D(tReflect, uv - vec2(0.0, 0.004)).rgb) * 0.25;
            refl *= 0.36;
          }
          refl *= uReflect * fres;
        }
        // the road: dashed lane lines, solid neon edges
        float lx = x - 2.5 * floor(x / 2.5 + 0.5);
        float ds = fract(s / 8.0); float dw = fwidth(s / 8.0) * 1.5;
        float dash = smoothstep(0.0, dw, ds) * (1.0 - smoothstep(0.5 - dw, 0.5, ds));
        dash = mix(dash, 0.5, smoothstep(0.1, 0.35, dw));
        float dline = (1.0 - smoothstep(0.055, 0.055 + fx * 1.5, abs(lx))) * step(ax, 3.6) * dash;
        float ed = abs(ax - 4.78);
        float eline = 1.0 - smoothstep(0.07, 0.07 + fx * 1.5, ed);
        vec3 asphalt = uAsphalt * (0.8 + 0.45 * wet) * (1.0 - 0.45 * puddle);
        asphalt += uDash * dline + uEdge * (eline + exp(-ed * 2.6) * 0.1);
        // the grid floor beside it
        vec2 g = vec2(ax - ${RACER_ROAD}.0, s) / 8.0;
        vec2 gw = max(fwidth(g), vec2(1e-4));
        vec2 gd = abs(fract(g - 0.5) - 0.5) / gw;
        float gl = 1.0 - min(min(gd.x, gd.y), 1.0);
        float gh = exp(-min(gd.x, gd.y) * 0.45);
        float gf = 1.0 - smoothstep(0.18, 0.55, max(gw.x, gw.y));
        vec3 floorc = uBase + uGrid * (gl + gh * 0.08) * gf;
        vec3 col = mix(floorc, asphalt, road) + refl;
        // light falling on it
        float dzl = mod(z - uScroll + ${RACER_P / 2}.0, ${RACER_P}.0) - ${RACER_P / 2}.0;
        float dzr = mod(z - uScroll, ${RACER_P}.0) - ${RACER_P / 2}.0;
        vec3 lt = (uLampL * pool(vec2(x + 4.75, dzl), vec2(2.6, 3.8)) + uLampR * pool(vec2(x - 4.75, dzr), vec2(2.6, 3.8))) * uLampI;
        float ah = ${racerF(RACER_CAR_Z - 2.2)} - z; // distance ahead of the front bumper
        float hw = 0.32 + ah * 0.1;
        float beams = exp(-pow((x - uCarX + 0.62) / hw, 2.0)) + exp(-pow((x - uCarX - 0.62) / hw, 2.0));
        lt += vec3(1.0, 0.9, 0.78) * uHead * smoothstep(0.0, 1.5, ah) * exp(-ah * 0.07) * min(beams, 1.3);
        lt += uUnder * pool(vec2(x - uCarX, z - ${racerF(RACER_CAR_Z + 0.2)}), vec2(1.75, 2.9));
        lt += vec3(2.2, 0.06, 0.16) * uTail * pool(vec2(x - uCarX, z - ${racerF(RACER_CAR_Z + 2.5)}), vec2(1.15, 0.8));
        float gz = z - uGateZ;
        float gk = exp(-gz * gz * 0.16) * uGateI;
        if (gk > 0.003) {
          if (uGateN > 2.5) lt += gk * (uSlot0 * exp(-pow((x + 3.75) * 1.1, 2.0)) + uSlot1 * exp(-pow((x + 1.25) * 1.1, 2.0))
            + uSlot2 * exp(-pow((x - 1.25) * 1.1, 2.0)) + uSlot3 * exp(-pow((x - 3.75) * 1.1, 2.0)));
          else lt += gk * (uSlot0 * exp(-pow((x + 2.5) * 0.55, 2.0)) + uSlot1 * exp(-pow((x - 2.5) * 0.55, 2.0)));
        }
        col += lt * mix(0.4, 0.75 - 0.3 * puddle, road);
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// A street lamp: post, arm reaching over the road edge, a neon tube for a lamp.
function racerLamp(b, box, side, z, color) {
  const x = side * 6.4, hx = side * 4.75;
  const lit = { aZ: z, aKind: 0 }, glow = { aZ: z, aKind: 2 };
  b.add(box, racerM(x, 0.25, z, 0.42, 0.5, 0.42), 0x1a1430, 1, lit);
  b.add(box, racerM(x, 3.3, z, 0.16, 6.6, 0.16), 0x2e2650, 1, lit);
  b.add(box, racerM((x + hx) / 2, RACER_HEAD + 0.27, z, Math.abs(x - hx) + 0.3, 0.12, 0.14, 0, 0, side * 0.06), 0x2e2650, 1, lit);
  b.add(box, racerM(hx, RACER_HEAD + 0.15, z, 1.15, 0.16, 0.34), 0x18122c, 1, lit);
  b.add(box, racerM(hx, RACER_HEAD + 0.04, z, 1.0, 0.06, 0.2), color, 4.5, glow);
  b.add(box, racerM(x - side * 0.09, 3.0, z, 0.03, 2.6, 0.06), color, 2.4, glow);
}
// A palm: a ringed trunk bending away from the road and a crown of drooping
// fronds, dark like a silhouette but with glowing midribs.
function racerPalm(b, x, z, h, glowColor) {
  const side = Math.sign(x) || 1;
  const segs = 6;
  const lean = rand(0.1, 0.24) * side, lz = rand(-0.08, 0.08);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(new THREE.Vector3(x + lean * h * t * t, h * t, z + lz * h * t * t));
  }
  const cyl = new THREE.CylinderGeometry(0.92, 1.12, 1, 6, 1, true);
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), q = new THREE.Quaternion();
  const lit = { aZ: z, aKind: 0 };
  for (let i = 0; i < segs; i++) {
    d.subVectors(pts[i + 1], pts[i]);
    const len = d.length();
    q.setFromUnitVectors(up, d.normalize());
    const r = 0.2 * (1 - (0.42 * i) / segs);
    b.add(cyl, new THREE.Matrix4().compose(pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5), q, new THREE.Vector3(r, len * 1.04, r)), i % 2 ? 0x34184e : 0x281240, 1, lit);
  }
  cyl.dispose();
  const top = pts[segs];
  const dark = new THREE.Color(0x14071f);
  const neonV = { aZ: z, aKind: 1 };
  const nF = 8, K = 6;
  const ph = rand(Math.PI * 2);
  for (let f = 0; f < nF; f++) {
    const a = ph + (f / nF) * Math.PI * 2 + rand(-0.22, 0.22);
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const len = rand(2.7, 3.5) * (h / 8.5);
    const lift = rand(0.25, 0.55);
    const S = [], L = [], R = [], C = [];
    for (let j = 0; j <= K; j++) {
      const t = j / K;
      const w = 0.16 * len * Math.sin(Math.PI * Math.pow(t, 0.7)) * (j % 2 ? 1 : 0.62);
      const p = top.clone().addScaledVector(dir, len * t);
      p.y += len * (lift * t - 0.66 * t * t);
      S.push(p);
      L.push(p.clone().addScaledVector(perp, w).setY(p.y - w * 0.5));
      R.push(p.clone().addScaledVector(perp, -w).setY(p.y - w * 0.5));
      C.push(new THREE.Color(glowColor).multiplyScalar(1.7 * (1 - 0.55 * t)));
    }
    for (let j = 0; j < K; j++) {
      b.tri(L[j], S[j], L[j + 1], dark, C[j], dark, neonV);
      b.tri(S[j], S[j + 1], L[j + 1], C[j], C[j + 1], dark, neonV);
      b.tri(S[j], R[j], S[j + 1], C[j], dark, C[j + 1], neonV);
      b.tri(R[j], R[j + 1], S[j + 1], dark, dark, C[j + 1], neonV);
    }
  }
}

// Car body as lofted cross-sections from nose to tail: [z, half-width, sill, shoulder, deck, crown].
const RACER_BODY = [
  [-2.15, 0.8, 0.22, 0.34, 0.38, 0],
  [-1.8, 0.9, 0.17, 0.46, 0.52, 0.02],
  [-1.0, 0.95, 0.16, 0.58, 0.66, 0.03],
  [0.2, 0.98, 0.16, 0.66, 0.76, 0.03],
  [1.3, 0.99, 0.18, 0.72, 0.82, 0.02],
  [2.08, 0.96, 0.24, 0.7, 0.78, 0.01],
];
// The glass canopy: [z, base half-width, base, roof half-width, roof].
const RACER_CABIN = [
  [-1.05, 0.8, 0.63, 0.78, 0.65],
  [-0.25, 0.8, 0.7, 0.58, 1.16],
  [0.45, 0.82, 0.74, 0.58, 1.18],
  [1.45, 0.84, 0.8, 0.78, 0.84],
];
const racerBodyRing = ([, w, yb, ysh, yt, cr]) => {
  const half = [[0, yb], [w * 0.86, yb], [w, yb + 0.16], [w * 0.99, ysh], [w * 0.8, yt], [0, yt + cr]];
  return half.concat(half.slice(1, -1).reverse().map(([x, y]) => [-x, y]));
};
const racerCabinRing = ([, wb, yb, wt, yt]) => [[wb, yb], [wt, yt], [0, yt + 0.03], [-wt, yt], [-wb, yb]];
function racerLoft(sections, ringOf, closed) {
  const rings = sections.map(ringOf), zs = sections.map((s) => s[0]);
  const n = rings[0].length;
  const pos = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(), O = new THREE.Vector3();
  // Emit a triangle facing outward (away from the car's axis, or along `cap`).
  const tri = (a, b, c, cap) => {
    A.fromArray(a); B.fromArray(b); C.fromArray(c);
    N.subVectors(B, A).cross(O.subVectors(C, A));
    if (N.lengthSq() < 1e-10) return;
    const out = cap ? N.z * cap : N.dot(O.set((a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3 - 0.55, 0));
    if (out < 0) pos.push(...a, ...c, ...b);
    else pos.push(...a, ...b, ...c);
  };
  const P = (r, i) => [rings[r][i][0], rings[r][i][1], zs[r]];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n;
      tri(P(r, i), P(r, j), P(r + 1, j));
      tri(P(r, i), P(r + 1, j), P(r + 1, i));
    }
  }
  if (closed) {
    for (const [r, cap] of [[0, -1], [rings.length - 1, 1]]) {
      const cx = rings[r].reduce((s, p) => s + p[0], 0) / n, cy = rings[r].reduce((s, p) => s + p[1], 0) / n;
      for (let i = 0; i < n; i++) tri([cx, cy, zs[r]], P(r, i), P(r, (i + 1) % n), cap);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// Tail-light ribbons. The road carries the old points away behind the car, so a
// lane change leaves a curve and a spin-out leaves a spiral. Points are laid down
// by distance travelled, so the ribbon's length doesn't depend on frame rate.
class RacerTrail extends Trail {
  constructor(o) {
    super(o);
    const side = new Float32Array(this.n * 2);
    for (let i = 0; i < this.n; i++) { side[i * 2] = 1; side[i * 2 + 1] = -1; }
    this.mesh.geometry.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
    this.mesh.material.dispose();
    this.mesh.material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: neon(o.color, o.intensity) }, uI: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute float aAlpha; attribute float aSide; varying float vA; varying float vS; void main(){ vA = aAlpha; vS = aSide; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uColor; uniform float uI; varying float vA; varying float vS; void main(){ float c = 1.0 - abs(vS); c = c * c * (3.0 - 2.0 * c); gl_FragColor = vec4(uColor * vA * uI * (0.2 + 0.8 * c), 1.0); }",
    });
    this.mesh.layers.set(1);
    this.acc = 0;
  }
  follow(p, dz, step) {
    if (!this.pts.length) {
      this.reset(p);
      this.pts.forEach((q, i) => (q.z += i * step));
    }
    for (const q of this.pts) q.z += dz;
    this.acc += dz;
    if (this.acc >= step) {
      this.acc %= step;
      const last = this.pts.pop();
      this.pts.unshift(last.copy(p));
    } else {
      this.pts[0].copy(p);
    }
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
}

// The environment the car's paint and the gantry's metal reflect: a tiny copy of
// the career sky with the sun and the neon of the road around it, re-baked as the
// career moves on. One PMREM generator is kept for the whole run.
class RacerEnv {
  constructor() {
    this.pm = new THREE.PMREMGenerator(GFX.renderer);
    this.scene = new THREE.Scene();
    this.sky = makeSky({ stars: 0, glow: 1.3, radius: 40 });
    this.scene.add(this.sky);
    const panel = (geo, x, y, z) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      this.scene.add(m);
      return m;
    };
    this.sun = panel(new THREE.CircleGeometry(2.2, 24), 0, 4, -30);
    this.strips = [
      panel(new THREE.PlaneGeometry(40, 1.3), -26, 5, -4), panel(new THREE.PlaneGeometry(40, 1.3), 26, 5, -4),
      panel(new THREE.PlaneGeometry(34, 0.7), -20, 1.6, 18), panel(new THREE.PlaneGeometry(34, 0.7), 20, 1.6, 18),
      panel(new THREE.PlaneGeometry(26, 0.9), 0, 3, 28),
      panel(new THREE.PlaneGeometry(34, 5), 0, 25, -16), // a soft skylight band for the glass to catch
    ];
    this.rt = null;
  }
  build(sky) {
    const u = this.sky.material.uniforms;
    u.uTop.value.copy(sky.top);
    u.uMid.value.copy(sky.mid);
    u.uHorizon.value.copy(sky.horizon);
    u.uBottom.value.copy(sky.bg).multiplyScalar(0.2);
    u.uGlow.value = 0.55;
    const e = Math.atan2(sky.sunY + 10, 420);
    this.sun.position.set(0, Math.sin(e) * 30, -Math.cos(e) * 30);
    this.sun.lookAt(0, 0, 0);
    this.sun.material.color.copy(sky.sunTop).lerp(sky.sunBot, 0.5).multiplyScalar(3);
    const lamp = 0.6 + 2.6 * sky.lamps;
    this.strips[0].material.color.set(RACER_LAMP[0]).multiplyScalar(lamp);
    this.strips[1].material.color.set(RACER_LAMP[1]).multiplyScalar(lamp);
    this.strips[2].material.color.copy(sky.grid).multiplyScalar(2);
    this.strips[3].material.color.copy(sky.grid).multiplyScalar(2);
    this.strips[4].material.color.copy(sky.horizon).multiplyScalar(1.6);
    this.strips[5].material.color.copy(sky.mid).lerp(sky.horizon, 0.35).multiplyScalar(1.3);
    const rt = this.pm.fromScene(this.scene, 0.02, 0.1, 100);
    if (this.rt) this.rt.dispose();
    this.rt = rt;
    return rt.texture;
  }
  dispose() {
    if (this.rt) this.rt.dispose();
    this.pm.dispose();
    disposeTree(this.scene);
  }
}

// Gantry sign faces: the letter blazes, the panel stays dark.
function racerSignTexture(label, color, wide) {
  const c = document.createElement("canvas");
  c.width = wide ? 512 : 256;
  c.height = 128;
  const x = c.getContext("2d");
  const W = c.width, H = c.height;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0c0424");
  g.addColorStop(1, "#02010a");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < H; y += 4) x.fillRect(0, y, W, 1);
  x.font = `${wide ? 58 : 76}px "Press Start 2P", "Courier New", monospace`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.shadowColor = color;
  x.shadowBlur = 16;
  x.fillStyle = color;
  x.fillText(label, W / 2, H / 2 + 5);
  x.shadowBlur = 0;
  x.fillText(label, W / 2, H / 2 + 5);
  x.fillStyle = "rgba(255,255,255,0.35)";
  x.fillText(label, W / 2, H / 2 + 5);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

class RacerGame extends QuizGame {
  constructor(sel) {
    super(sel, "racer", { fov: 62, far: 900, fog: [0x12052e, 30, 470], bg: 0x0c0326 });
    this.picker = new QuestionPicker(selectionQids(sel));
    this.egg = EGG_START;
    this.peak = EGG_START;
    this.crashes = 0;
    this.insurance = 0;
    this.year = 0;
    this.speed = 30;
    this.dist = 0;
    this.lane = null;
    this.carX = 0;
    this.gate = null;
    this.gp = 0;
    this.nextMilestone = 0;
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="egg"><small data-sub>NEST EGG · AGE 25</small><span data-egg>${money(this.egg)}</span></div>
        <div class="grow"></div>
        <span class="combo" data-rate>4%</span>
        <div class="lives" data-ins></div>
        <div class="lives" data-lives></div>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <span class="meter goalbar" style="--c:${COLORS.lime}" title="Progress to $1,000,000"><i data-goal></i></span>
      <div class="timer"><i></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
      <div class="hint">TAP A LANE · TAP IT AGAIN TO FLOOR IT</div>
    </section>`);
    this.hud();
  }

  build3D() {
    const s = this.scene;
    this.owned = []; // shared GPU resources that may sit outside the scene graph
    this.skyP = 0;
    this.flame = 0;
    this.leaving = null;
    this.tmp = new THREE.Vector3();
    this.shared = { uScroll: { value: 0 }, uLen: { value: RACER_LEN }, uZMax: { value: RACER_ZMAX }, uLampI: { value: 1 } };
    const sky0 = skyAt(0);
    // light: key from behind the camera, a gantry light and one that rides the nearest lamp
    this.amb = new THREE.AmbientLight(0x6a5aa8, 0.55);
    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    this.keyLight.position.set(-3, 6, 6);
    this.gateLight = new THREE.PointLight(0xc9b8ff, 0, 16, 2);
    this.lampLight = new THREE.PointLight(0x35efff, 0, 12, 2);
    s.add(this.amb, this.keyLight, this.gateLight, this.lampLight);
    if (GFX.ok) {
      this.envKit = new RacerEnv();
      this.env = this.envKit.build(sky0);
      this.envP = 0;
    }
    // sky, sun and horizon
    this.sky = makeSky({ top: sky0.top, mid: sky0.mid, horizon: sky0.horizon, bottom: sky0.bg, glow: sky0.glow, stars: sky0.stars, clouds: sky0.clouds, radius: 860 }); // beyond the far mountains
    s.add(this.sky);
    this.sun = makeNeonSun({ radius: 58, top: sky0.sunTop, bottom: sky0.sunBot, intensity: 1.8, halo: sky0.halo });
    this.sun.position.set(0, sky0.sunY, -430);
    this.sun.userData.glow.layers.set(1); // the wet road mirrors the disc, not its huge halo
    s.add(this.sun);
    this.ridgeFar = makeRidge({ z: -400, width: 1300, height: 58, n: 34, top: 0xffffff, bottom: 0x3a3a50, line: 0x35efff, lineK: 1.3, wire: false });
    this.ridgeNear = makeRidge({ z: -350, width: 1000, height: 34, n: 48, top: 0xc8c8d8, bottom: 0x24243a, line: 0xff3ad4, lineK: 2.2 });
    for (const r of [this.ridgeFar, this.ridgeNear]) r.children.forEach((c) => { c.material.fog = false; });
    s.add(this.ridgeFar, this.ridgeNear);
    this.city = makeSkyline({ z: -315, width: 330, count: 80, minH: 6, maxH: 44, lit: 0.35 });
    s.add(this.city);
    // the wet ground: road and grid floor share one mirror
    this.mirror = new Mirror(0);
    this.groundMat = racerGroundMaterial(this.mirror, this.shared);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 940), this.groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.z = -440;
    this.mirror.receivers.push(this.ground);
    s.add(this.ground);
    s.userData.mirrors = [this.mirror];
    this.buildProps();
    this.buildSpeedLines();
    this.car = this.makeCar();
    s.add(this.car);
    this.buildGateKit();
    // a stand-in gantry with every sign, drawn once off-screen as the scene starts
    // (see GFX.warm), so the first real gate doesn't stall building its shaders
    const k4 = this.gateKit[4], wg = new THREE.Group();
    wg.add(new THREE.Mesh(k4.frame, this.gateFrameMat), new THREE.Mesh(k4.glow, this.gateGlowMat), new THREE.Mesh(k4.cones, this.gateConeMat));
    Object.values(this.signMats).forEach((m) => wg.add(new THREE.Mesh(k4.sign, m)));
    wg.position.z = -60;
    this.warmExtra = [wg];
    this.post = { exposure: 1.1, bloom: 1, threshold: 1, saturation: 1.14, contrast: 1.06, vignette: 1, rays: { pos: this.sun.position, strength: 0.8, radius: 0.4 } };
    s.userData.post = this.post;
    this.camBase.set(0, 3.1, 7.4);
    this.lookAt.set(0, 1.1, -18);
    this.applySky(sky0);
  }
  // Street lamps and palms down both sides of the road, all in three draw calls.
  buildProps() {
    const b = new RacerBatch(["aZ", "aKind"]);
    const cones = new RacerBatch(["aZ"]);
    const halo = { pos: [], col: [], z: [], corner: [], size: [] };
    const box = new THREE.BoxGeometry(1, 1, 1);
    const coneGeo = new THREE.CylinderGeometry(0.32, 2.4, RACER_HEAD, 18, 1, true);
    const palmCols = [0xff3ad4, 0x35efff, 0xa65fff, 0xff7ad9];
    const addHalo = (x, y, z, color, size) => {
      const c = new THREE.Color(color);
      for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
        halo.pos.push(x, y, z); halo.col.push(c.r, c.g, c.b); halo.z.push(z); halo.corner.push(cx, cy); halo.size.push(size);
      }
    };
    for (let k = 0; k < RACER_LEN / RACER_P; k++) {
      for (const side of [-1, 1]) {
        const z = -k * RACER_P - (side > 0 ? RACER_P / 2 : 0);
        const col = RACER_LAMP[side > 0 ? 1 : 0];
        racerLamp(b, box, side, z, col);
        addHalo(side * 4.75, RACER_HEAD, z, col, 1.8);
        cones.add(coneGeo, racerM(side * 4.75, RACER_HEAD / 2, z), col, 0.32, { aZ: z });
        racerPalm(b, side * rand(8.3, 9.8), z - RACER_P / 2 + rand(-4, 4), rand(7.2, 9.6), palmCols[(k * 2 + (side > 0 ? 1 : 0)) % 4]);
        if ((k + (side > 0 ? 1 : 0)) % 2 === 0) racerPalm(b, side * rand(13, 19), z - rand(2, RACER_P - 2), rand(8.5, 11.5), palmCols[(k + 1) % 4]);
      }
    }
    this.props = new THREE.Mesh(b.build(), racerPropMaterial(this.shared));
    this.props.frustumCulled = false;
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.Float32BufferAttribute(halo.pos, 3));
    hg.setAttribute("aCol", new THREE.Float32BufferAttribute(halo.col, 3));
    hg.setAttribute("aZ", new THREE.Float32BufferAttribute(halo.z, 1));
    hg.setAttribute("aCorner", new THREE.Float32BufferAttribute(halo.corner, 2));
    hg.setAttribute("aSize", new THREE.Float32BufferAttribute(halo.size, 1));
    this.halos = new THREE.Mesh(hg, racerHaloMaterial(this.shared));
    this.halos.frustumCulled = false;
    this.cones = new THREE.Mesh(cones.build(), racerConeMaterial(this.shared, RACER_HEAD, true));
    this.cones.frustumCulled = false;
    this.cones.position.y = 0;
    this.halos.layers.set(1);
    this.cones.layers.set(1);
    this.scene.add(this.props, this.halos, this.cones);
    box.dispose();
    coneGeo.dispose();
  }
  // Streaks of light that rush past when you floor it.
  buildSpeedLines() {
    const pos = [], z = [], uv = [];
    let made = 0;
    while (made < 60) {
      const x = rand(-12, 12), y = rand(0.25, 5.5);
      if (Math.abs(x) < 5.6) continue;
      made++;
      const r = new THREE.Vector2(x, y - 3).normalize();
      const w = new THREE.Vector3(-r.y, r.x, 0).multiplyScalar(rand(0.015, 0.035));
      const z0 = rand(-50, 10), l = rand(3, 6);
      const quad = [[-1, 0], [1, 0], [1, 1], [-1, 0], [1, 1], [-1, 1]];
      for (const [sx, t] of quad) {
        pos.push(x + w.x * sx, y + w.y * sx, z0 + l * t);
        z.push(z0);
        uv.push(sx * 0.5 + 0.5, t);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aZ", new THREE.Float32BufferAttribute(z, 1));
    g.setAttribute("aUv", new THREE.Float32BufferAttribute(uv, 2));
    this.lines = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { uScroll: { value: 0 }, uLen: { value: 60 }, uZMax: { value: 10 }, uStretch: { value: 1 }, uI: { value: 0 }, uColor: { value: neon(0xbff6ff, 1.8) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `uniform float uScroll; uniform float uLen; uniform float uZMax; uniform float uStretch;
        attribute float aZ; attribute vec2 aUv; varying vec2 vUv; varying float vF;
        void main(){
          float zz = uZMax - mod(uZMax - aZ - uScroll, uLen);
          vec3 p = position; p.z = zz + (position.z - aZ) * uStretch;
          vUv = aUv;
          vF = smoothstep(uZMax - uLen, uZMax - uLen + 30.0, zz) * (1.0 - smoothstep(uZMax - 6.0, uZMax, zz));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv; varying float vF;
        void main(){ float w = 1.0 - abs(vUv.x * 2.0 - 1.0); gl_FragColor = vec4(uColor * w * w * sin(3.14159 * vUv.y) * uI * vF, 1.0); }`,
    }));
    this.lines.frustumCulled = false;
    this.lines.layers.set(1);
    this.lines.visible = false;
    this.scene.add(this.lines);
  }
  // Widen the lens when the 3D strip is short, so the car and the horizon both fit.
  onLayout() {
    if (!this.has3D || !this.band) return;
    this.baseFov = clamp((38 * GFX.h) / this.band.h, 62, 104);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }
  // An 80s wedge in candy paint with a clearcoat that mirrors the career sky,
  // a full-width tail-light bar, neon light bars and ribbon trails.
  makeCar() {
    const car = new THREE.Group(); // lane position, bob, lean and spin (gameplay-driven)
    const rig = new THREE.Group(); // steering yaw and squat (look only)
    rig.position.z = RACER_CAR_Z;
    car.add(rig);
    this.carRig = rig;
    const env = this.env || null;
    this.paint = new THREE.MeshPhysicalMaterial({ color: 0xb00a48, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.03, envMap: env, envMapIntensity: 0.9, flatShading: true });
    this.glass = new THREE.MeshStandardMaterial({ color: 0x1a1030, metalness: 0.88, roughness: 0.08, envMap: env, envMapIntensity: 1.8, flatShading: true });
    this.trim = new THREE.MeshStandardMaterial({ color: 0x0d0a18, metalness: 0.6, roughness: 0.45, envMap: env, envMapIntensity: 0.8, flatShading: true });
    const box = new THREE.BoxGeometry(1, 1, 1);
    const paint = new RacerBatch();
    const bodyGeo = racerLoft(RACER_BODY, racerBodyRing, true);
    paint.add(bodyGeo, null, null);
    paint.add(box, racerM(0, 1.02, 1.86, 1.94, 0.05, 0.42, -0.06), null);
    paint.add(box, racerM(0, 0.42, -2.18, 1.5, 0.05, 0.25), null);
    const slope = Math.atan2(1.18 - 0.84, 1.0);
    for (let i = 1; i <= 5; i++) {
      const t = i / 6.5;
      paint.add(box, racerM(0, 1.18 - 0.34 * t + 0.025, 0.45 + t, 1.16 + 0.36 * t, 0.026, 0.07, slope), null);
    }
    bodyGeo.dispose();
    rig.add(new THREE.Mesh(paint.build(), this.paint));
    const cabin = racerLoft(RACER_CABIN, racerCabinRing, false);
    rig.add(new THREE.Mesh(cabin, this.glass));
    const trim = new RacerBatch();
    const wheel = new THREE.CylinderGeometry(0.33, 0.33, 0.3, 14);
    [[-0.92, -1.25], [0.92, -1.25], [-0.92, 1.3], [0.92, 1.3]].forEach(([x, z]) => trim.add(wheel, racerM(x, 0.33, z, 1, 1, 1, 0, 0, Math.PI / 2), null));
    [-0.62, 0.62].forEach((x) => trim.add(box, racerM(x, 0.9, 1.84, 0.06, 0.24, 0.14), null));
    [-0.32, 0.32].forEach((x) => trim.add(wheel, racerM(x, 0.3, 2.1, 0.22, 0.5, 0.22, Math.PI / 2), null));
    trim.add(box, racerM(0, 0.4, 2.085, 1.7, 0.16, 0.02), null);

    rig.add(new THREE.Mesh(trim.build(), this.trim));
    wheel.dispose();
    // neon: tail-light bar, wing light bar, side bars, glowing rims (HDR vertex colours)
    const n = new RacerBatch();
    n.add(box, racerM(0, 0.6, 2.095, 1.62, 0.07, 0.03), 0xff1438, 2);
    [-0.66, 0.66].forEach((x) => n.add(box, racerM(x, 0.6, 2.1, 0.36, 0.15, 0.035), 0xff1438, 3));
    n.add(box, racerM(0, 1.035, 2.075, 1.84, 0.028, 0.03), COLORS.cyan, 3);
    [-1, 1].forEach((sx) => n.add(box, racerM(sx * 0.985, 0.31, -0.1, 0.025, 0.035, 2.9), COLORS.magenta, 2.6));
    const rim = new THREE.TorusGeometry(0.21, 0.022, 4, 18);
    [[-1.075, -1.25], [1.075, -1.25], [-1.075, 1.3], [1.075, 1.3]].forEach(([x, z]) => n.add(rim, racerM(x, 0.33, z, 1, 1, 1, 0, Math.PI / 2), COLORS.violet, 2.4));
    rim.dispose();
    this.carNeon = new THREE.MeshBasicMaterial({ vertexColors: true });
    rig.add(new THREE.Mesh(n.build("color"), this.carNeon));
    // exhaust flames for the boost (look only, not reflected)
    const fl = new RacerBatch();
    const cone = new THREE.CylinderGeometry(0.01, 0.1, 1, 8, 1, true);
    cone.translate(0, 0.5, 0);
    [-0.32, 0.32].forEach((x) => fl.add(cone, racerM(x, 0.3, 2.12, 1, 1, 1, Math.PI / 2), 0x5ad8ff, 1));
    cone.dispose();
    this.flames = new THREE.Mesh(fl.build(), new THREE.ShaderMaterial({
      uniforms: { uI: { value: 0 }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute vec3 aCol; varying vec3 vCol; varying float vT; void main(){ vCol = aCol; vT = clamp(position.z - 2.12, 0.0, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform float uI; uniform float uTime; varying vec3 vCol; varying float vT; void main(){ float f = (1.0 - vT) * (0.8 + 0.2 * sin(uTime * 60.0 + vT * 20.0)); gl_FragColor = vec4(mix(vec3(3.0, 3.0, 3.4), vCol * 2.5, vT) * f * uI, 1.0); }",
    }));
    this.flames.layers.set(1);
    rig.add(this.flames);
    box.dispose();
    // ribbon trails from the tail lights and the wing tips
    this.trails = [
      { t: new RacerTrail({ length: 14, width: 0.2, color: 0xff1a40, intensity: 1.9 }), p: new THREE.Vector3(-0.66, 0.6, 2.12), step: 0.38 },
      { t: new RacerTrail({ length: 14, width: 0.2, color: 0xff1a40, intensity: 1.9 }), p: new THREE.Vector3(0.66, 0.6, 2.12), step: 0.38 },
      { t: new RacerTrail({ length: 7, width: 0.08, color: COLORS.cyan, intensity: 1.3 }), p: new THREE.Vector3(-0.95, 1.04, 2.06), step: 0.2 },
      { t: new RacerTrail({ length: 7, width: 0.08, color: COLORS.cyan, intensity: 1.3 }), p: new THREE.Vector3(0.95, 1.04, 2.06), step: 0.2 },
    ];
    this.trails.forEach((tr) => this.scene.add(tr.t.mesh));
    return car;
  }
  // Everything a gantry is made of is built once and shared; a gate per question is
  // just a group of meshes pointing at it.
  buildGateKit() {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const metal = 0x2a2050;
    const kit = (n) => {
      const frame = new RacerBatch(), glow = new RacerBatch(), cones = new RacerBatch();
      for (const sx of [-1, 1]) {
        frame.add(box, racerM(sx * 6.0, 2.95, 0, 0.4, 5.9, 0.4), metal);
        frame.add(box, racerM(sx * 6.0, 0.15, 0, 0.8, 0.3, 0.8), 0x1a1230);
        glow.add(box, racerM(sx * 5.78, 2.8, 0.21, 0.05, 5.2, 0.04), COLORS.violet, 2.6);
        glow.add(box, racerM(sx * 6.0, 6.0, 0, 0.18, 0.14, 0.18), COLORS.red, 4);
      }
      frame.add(box, racerM(0, 5.78, 0, 12.4, 0.2, 0.38), metal);
      frame.add(box, racerM(0, 4.98, 0, 12.4, 0.16, 0.38), metal);
      for (let i = 0; i < 12; i++) {
        const x0 = -6 + i, up = i % 2 === 0;
        racerStrut(frame, box, new THREE.Vector3(x0, up ? 4.98 : 5.78, 0), new THREE.Vector3(x0 + 1, up ? 5.78 : 4.98, 0), 0.09, metal);
      }
      glow.add(box, racerM(0, 4.88, 0.2, 12.0, 0.04, 0.03), 0xd8ccff, 3);
      glow.add(box, racerM(0, 5.9, 0.2, 12.0, 0.03, 0.03), COLORS.cyan, 2);
      const lanes = RACER_GATE_LANES[n], w = n === 2 ? 4.6 : 2.3;
      lanes.forEach((x, i) => {
        const col = SLOT_COLORS[i];
        frame.add(box, racerM(x, 4.2, -0.07, w + 0.2, 1.55, 0.14), 0x120a26);
        [-0.32, 0.32].forEach((f) => frame.add(box, racerM(x + f * w, 4.95, -0.07, 0.06, 0.2, 0.06), metal));
        glow.add(box, racerM(x, 4.95, 0.02, w + 0.14, 0.05, 0.05), col, 3);
        glow.add(box, racerM(x, 3.45, 0.02, w + 0.14, 0.05, 0.05), col, 3);
        glow.add(box, racerM(x - w / 2 - 0.07, 4.2, 0.02, 0.05, 1.55, 0.05), col, 3);
        glow.add(box, racerM(x + w / 2 + 0.07, 4.2, 0.02, 0.05, 1.55, 0.05), col, 3);
        const c = new THREE.CylinderGeometry(w * 0.3, w * 0.48, 3.42, 20, 1, true);
        cones.add(c, racerM(x, 1.71, 0.25), col, 0.5);
        c.dispose();
      });
      (n === 2 ? [0] : [-2.5, 0, 2.5]).forEach((x) => glow.add(box, racerM(x, 0.65, 0, 0.16, 1.3, 0.16), COLORS.red, 2.4));
      const k = { frame: frame.build("color"), glow: glow.build("color"), cones: cones.build(), sign: new THREE.PlaneGeometry(w, 1.4) };
      this.owned.push(k.frame, k.glow, k.cones, k.sign);
      return k;
    };
    this.gateKit = { 2: kit(2), 4: kit(4) };
    box.dispose();
    this.gateFrameMat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.35, envMap: this.env || null, envMapIntensity: 1.2, flatShading: true });
    this.gateGlowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.gateConeMat = racerConeMaterial(null, 3.42, false);
    this.signMats = {};
    ["A", "B", "C", "D", "TRUE", "FALSE"].forEach((label, i) => {
      const tf = label.length > 1;
      const col = SLOT_COLORS[tf ? i - 4 : i];
      this.signMats[label] = new THREE.MeshBasicMaterial({ map: racerSignTexture(label, col, tf), color: new THREE.Color(2.5, 2.5, 2.5), fog: false });
    });
    this.owned.push(this.gateFrameMat, this.gateGlowMat, this.gateConeMat);
    Object.values(this.signMats).forEach((m) => this.owned.push(m.map, m));
  }
  makeGate() {
    const g = new THREE.Group();
    const r = this.round;
    const n = r.n === 2 ? 2 : 4;
    const k = this.gateKit[n];
    g.add(new THREE.Mesh(k.frame, this.gateFrameMat), new THREE.Mesh(k.glow, this.gateGlowMat));
    const cones = new THREE.Mesh(k.cones, this.gateConeMat);
    cones.layers.set(1);
    g.add(cones);
    for (let i = 0; i < r.n; i++) {
      const label = r.tf ? (i === 0 ? "TRUE" : "FALSE") : r.labels[i];
      const sign = new THREE.Mesh(k.sign, this.signMats[label]);
      sign.position.set(laneX(i, r.n), 4.2, 0.02);
      sign.userData.slot = i;
      g.add(sign);
    }
    g.userData.n = n;
    g.position.z = -170;
    // the gantry rises out of the road
    g.scale.y = 0.01;
    this.tw.add(0.5, (e) => { g.scale.y = Math.max(0.01, e); }, null, Ease.outBack);
    return g;
  }
  dropGate(g) {
    if (!g) return;
    this.scene.remove(g);
    if (this.leaving === g) this.leaving = null;
  }

  start() {
    Sound.play("game");
    Sound.engine(true);
    UI.banner("AGE 25. GO!", COLORS.yellow, "Grow " + money(EGG_START) + " into " + money(EGG_GOAL) + " by 65");
    this.tw.wait(1.3, () => this.nextQuestion());
  }
  rate() { return 0.03 + 0.005 * Math.min(this.run.streak, 10); }
  hud() {
    if (!this.el) return;
    $("[data-egg]", this.el).textContent = money(this.egg);
    $("[data-sub]", this.el).textContent = "NEST EGG · AGE " + (START_AGE + this.year);
    $("[data-rate]", this.el).textContent = "+" + Math.round(this.rate() * 100) + "%/YR";
    const frac = clamp(Math.log(this.egg / EGG_START) / Math.log(EGG_GOAL / EGG_START), 0, 1);
    $("[data-goal]", this.el).style.width = (frac * 100).toFixed(1) + "%";
    this.lives(3 - this.crashes, 3, "heart", COLORS.red);
    $("[data-ins]", this.el).innerHTML = Array.from({ length: this.insurance }, () => `<span title="Insurance policy">${icon("shield", COLORS.lime)}</span>`).join("");
  }
  nextQuestion() {
    if (this.unmounted) return;
    const q = this.picker.next();
    if (!q) { UI.toast("NO QUESTIONS IN THIS STAGE YET"); return this.quit(); }
    this.round = new Round(q);
    this.quiz.show(this.round, `STAGE ${q.ch} · ${q.topic}`);
    this.T = readTime(this.round, 1.05);
    this.gp = 0;
    this.lane = null;
    this.boostRate = 0;
    this.lockT = 0;
    if (this.has3D) {
      if (this.gate) this.dropGate(this.gate);
      this.gate = this.makeGate();
      this.scene.add(this.gate);
    }
    this.layoutBand();
    this.state = "ask";
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    if (this.lane === i) return this.boost();
    this.lane = i;
    this.quiz.select(i);
    Sound.sfx("move");
    this.lockT = 1.0; // floor it automatically if you don't change lanes again
  }
  boost() {
    if (this.boostRate || this.state !== "ask" || this.lane === null) return;
    this.timeFrac = 1 - this.gp;
    this.boostRate = Math.max(1 / this.T, (1 - this.gp) / 0.7);
    Sound.sfx("swoosh");
    GFX.pulse(2.5, 0);
  }
  key(e) {
    if (this.state === "ask" && !this.quiz.sheet && !this.paused && !UI.modal) {
      const n = this.round ? this.round.n : 4;
      if (e.key === "ArrowLeft") { e.preventDefault(); return this.pick(this.lane === null ? Math.floor((n - 1) / 2) : Math.max(0, this.lane - 1)); }
      if (e.key === "ArrowRight") { e.preventDefault(); return this.pick(this.lane === null ? Math.ceil((n - 1) / 2) : Math.min(n - 1, this.lane + 1)); }
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp") { e.preventDefault(); return this.boost(); }
    }
    super.key(e);
  }
  arrive() {
    const r = this.round;
    const picked = this.lane === null ? -1 : this.lane;
    const ok = this.run.record(r, picked);
    this.quiz.reveal(picked);
    this.state = "explain";
    let title;
    if (ok) {
      const tf = this.boostRate ? this.timeFrac : 0;
      const contrib = 2500 + 250 * Math.min(this.run.streak, 10) + Math.round(1500 * tf);
      const rate = this.rate();
      const before = this.egg;
      this.egg = (this.egg + contrib) * (1 + rate);
      this.peak = Math.max(this.peak, this.egg);
      if (this.run.streak > 0 && this.run.streak % 5 === 0 && this.insurance < 2) {
        this.insurance++;
        UI.toast("STREAK " + this.run.streak + "! INSURANCE POLICY ISSUED");
      }
      title = `+${money(this.egg - before)} · ${Math.round(rate * 100)}% RETURN`;
      Sound.sfx("correct");
      Sound.sfx("deposit");
      UI.flash("good");
      GFX.pulse(3, 0.08);
      Haptics.buzz(25);
      Sound.setIntensity(Sound.intensityFor(this.run.streak));
      this.speedKick();
      if (this.has3D) {
        this.bursts.burst(new THREE.Vector3(this.carX, 1.5, -1), COLORS.gold, { n: 50, speed: 6, size: 0.3, life: 1.2, gravity: -9 });
        this.shockwave(new THREE.Vector3(this.carX, 1.1, -0.6), neon(COLORS.gold, 1.7), 4.5, 0.5);
        this.signFlash(r.correct);
      }
      const p = this.bandPoint(0.4);
      UI.floater("+" + money(this.egg - before), p.x, p.y, COLORS.lime);
      while (this.nextMilestone < EGG_MILESTONES.length && this.egg >= EGG_MILESTONES[this.nextMilestone]) {
        const m = EGG_MILESTONES[this.nextMilestone++];
        this.tw.wait(0.4, () => {
          Sound.sfx("levelup");
          UI.banner(m === EGG_GOAL ? "MILLIONAIRE!" : money(m) + "!", COLORS.lime, m === EGG_GOAL ? "Retire rich if you keep it" : "Milestone at age " + (START_AGE + this.year));
        });
      }
    } else if (this.insurance > 0) {
      this.insurance--;
      title = picked < 0 ? "NO LANE! INSURANCE PAID THE CLAIM" : "WRONG LANE! INSURANCE PAID THE CLAIM";
      Sound.sfx("wrong");
      UI.flash("hit");
      this.shake(0.25);
      GFX.pulse(6, 0);
      Sound.setIntensity(0);
      this.spin();
      if (this.has3D) this.shockwave(new THREE.Vector3(this.carX, 0.9, -0.4), neon(COLORS.lime, 2), 4, 0.5);
    } else {
      this.crashes++;
      const loss = this.egg * 0.15;
      this.egg -= loss;
      title = (picked < 0 ? "NO LANE CHOSEN! " : "WRONG LANE! ") + "MARKET CRASH −" + money(loss);
      Sound.sfx("hit");
      Sound.sfx("wrong");
      UI.flash("hit");
      this.shake(0.5);
      GFX.pulse(12, 0);
      GFX.hitStop(120);
      Haptics.buzz([70, 40, 110]);
      Sound.setIntensity(0);
      this.spin();
      if (this.has3D) {
        this.bursts.burst(new THREE.Vector3(this.carX, 0.8, -0.5), COLORS.red, { n: 60, speed: 8, size: 0.28, life: 0.9 });
        this.bursts.burst(new THREE.Vector3(this.carX, 0.4, 1.2), COLORS.orange, { n: 40, speed: 11, size: 0.16, life: 0.6, gravity: -14 });
        this.shockwave(new THREE.Vector3(this.carX, 0.9, -0.4), neon(COLORS.red, 2.4), 5, 0.55);
      }
    }
    this.hud();
    const gate = this.gate;
    this.gate = null;
    if (gate) {
      this.leaving = gate;
      this.tw.add(0.6, (k) => { gate.position.z = lerp(0, 16, k); }, () => this.dropGate(gate));
    }
    this.tw.wait(0.45, () => {
      if (this.unmounted) return;
      this.quiz.feedback({ ok, title, auto: this.explainAuto(ok), onNext: () => this.after() });
    });
  }
  signFlash(slot) {
    if (!this.gate) return;
    this.gate.children.forEach((c) => {
      if (c.userData.slot === slot) this.tw.add(0.5, (k) => { c.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.4); });
    });
  }
  speedKick() {
    if (!this.has3D) return;
    this.tw.add(0.9, (k) => {
      this.camera.fov = (this.baseFov || 62) + Math.sin(k * Math.PI) * 10;
      this.camera.updateProjectionMatrix();
    });
    this.tw.add(1.0, (k) => { this.speed = 30 + Math.sin(k * Math.PI) * 50; });
  }
  spin() {
    if (!this.has3D) return;
    this.tw.add(0.8, (k) => { this.car.rotation.y = k * Math.PI * 2; }, () => { this.car.rotation.y = 0; }, Ease.outCubic);
  }
  after() {
    if (this.unmounted) return;
    this.year++;
    this.hud();
    if (this.crashes >= 3) return this.gameOver(false);
    if (this.year >= CAREER_YEARS) return this.gameOver(true);
    this.nextQuestion();
  }
  gameOver(fullCareer) {
    this.state = "over";
    Sound.stopMusic();
    Sound.engine(false);
    const rich = this.egg >= EGG_GOAL;
    const age = START_AGE + this.year;
    if (fullCareer) {
      Sound.sfx(rich ? "win" : "levelup");
      UI.banner(rich ? "RETIRED A MILLIONAIRE" : "HAPPY RETIREMENT", rich ? COLORS.lime : COLORS.yellow, "Age 65 · " + money(this.egg));
    } else {
      Sound.sfx("gameover");
      UI.banner("FORCED RETIREMENT", COLORS.red, "Three market crashes at age " + age);
    }
    this.tw.wait(1.9, () => {
      if (this.unmounted) return;
      showResults({
        game: "racer", sel: this.sel, run: this.run, score: Math.round(this.egg),
        title: rich ? "RETIRED RICH" : fullCareer ? "RETIRED AT 65" : "RETIRED EARLY", color: rich ? COLORS.lime : fullCareer ? COLORS.yellow : COLORS.red,
        headline: money(this.egg), sub: `Retired at age ${age} on ${this.sel.label} · peak ${money(this.peak)}`,
        tiles: [{ k: "RETIRED AT", v: age, c: COLORS.yellow }, { k: "PEAK", v: money(this.peak), c: COLORS.lime }],
      });
    });
  }
  // Paint the whole world in the colours of this point in the career.
  applySky(sky) {
    const u = this.sky.material.uniforms;
    u.uTop.value.copy(sky.top);
    u.uMid.value.copy(sky.mid);
    u.uHorizon.value.copy(sky.horizon);
    u.uBottom.value.copy(sky.bg);
    u.uGlow.value = sky.glow;
    u.uStars.value = sky.stars;
    u.uClouds.value = sky.clouds;
    this.scene.background.copy(sky.bg);
    this.scene.fog.color.copy(sky.fog);
    const su = this.sun.userData.disc.material.uniforms;
    su.uTop.value.copy(sky.sunTop);
    su.uBottom.value.copy(sky.sunBot);
    su.uTint.value.copy(sky.tint);
    su.uI.value = sky.sunI;
    this.sun.position.y = sky.sunY;
    this.sun.userData.glow.material.color.copy(sky.halo).multiplyScalar(1.5);
    // far range hazy and lit by the horizon, near range dark with a neon crest
    this.ridgeFar.children[0].material.color.copy(sky.ridge).lerp(sky.horizon, 0.22).lerp(sky.fog, 0.35);
    this.ridgeFar.children[1].material.color.copy(sky.horizon).multiplyScalar(1.1);
    this.ridgeNear.children[0].material.color.copy(sky.ridge).multiplyScalar(0.42);
    this.ridgeNear.children[1].material.color.copy(sky.line).multiplyScalar(2.4);
    this.ridgeNear.children[2].material.color.copy(sky.line).multiplyScalar(0.6);
    this.city.material.uniforms.uLit.value = sky.city;
    const g = this.groundMat.uniforms;
    g.uGrid.value.copy(sky.grid).multiplyScalar(1.5);
    g.uBase.value.copy(sky.bg).multiplyScalar(0.18);
    g.uAsphalt.value.copy(sky.bg).multiplyScalar(0.28);
    this.shared.uLampI.value = sky.lamps;
    const pu = this.props.material.uniforms;
    pu.uKey.value.copy(sky.light).multiplyScalar(0.9);
    pu.uAmb.value.copy(sky.amb).multiplyScalar(0.55);
    pu.uNeonI.value = 0.55 + 0.45 * sky.lamps;
    this.amb.color.copy(sky.amb);
    this.keyLight.color.copy(sky.light);
    this.post.exposure = sky.exposure;
    this.post.bloom = sky.bloom;
    // sun rays through the skyline: strongest when the sun is low, faint at midday
    this.post.rays.strength = 0.25 + 0.65 * clamp(1 - (sky.sunY - 20) / 60, 0, 1);
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      if (this.lane !== null && !this.boostRate && this.lockT > 0) {
        this.lockT -= dt;
        if (this.lockT <= 0) this.boost();
      }
      this.gp += dt * (this.boostRate || 1 / this.T);
      this.timerBar(1 - this.gp);
      if (this.gp >= 1) { this.gp = 1; this.arrive(); }
    }
    if (!this.has3D) return;
    const sp = this.speed + (this.boostRate ? 45 : 0);
    Sound.rev(clamp(sp / 80, 0, 1.4));
    // Ease the sky toward this year of the career.
    const target = this.year / CAREER_YEARS;
    this.skyP += (target - this.skyP) * Math.min(1, dt * 0.8);
    const sky = skyAt(this.skyP);
    this.applySky(sky);
    if (this.envKit && Math.abs(this.skyP - this.envP) > 0.05 && Math.abs(target - this.skyP) < 0.004) {
      this.envP = this.skyP;
      this.env = this.envKit.build(sky);
      [this.paint, this.glass, this.trim, this.gateFrameMat].forEach((m) => { m.envMap = this.env; });
    }
    const step = sp * dt;
    this.dist += step;
    const scroll = this.dist % RACER_WRAP;
    this.shared.uScroll.value = scroll;
    if (this.gate && this.state === "ask") this.gate.position.z = lerp(-170, 0, this.gp);
    const n = this.round ? this.round.n : 4;
    const tx = this.lane === null ? 0 : laneX(this.lane, n);
    const prev = this.carX;
    this.carX += (tx - this.carX) * Math.min(1, dt * 7);
    this.car.position.x = this.carX;
    this.car.position.y = Math.sin(this.t * 18) * 0.02;
    this.car.rotation.z = clamp((prev - this.carX) * 2.5, -0.25, 0.25);
    this.updateLook(dt, sp, step, scroll, sky);
    // On narrow screens the camera tracks the car closely so outer lanes stay in shot.
    const follow = GFX.w / GFX.h < 0.8 ? 0.85 : 0.35;
    this.camBase.x = this.carX * follow;
    this.lookAt.x = this.carX * follow * 0.6;
    this.placeCamera();
    followSky(this.sky, this.camera);
    FX.sync(this.scene, this.t);
    this.city.material.uniforms.uFogFar.value = 900; // the city stays crisp through the haze
  }
  // The look-only motion: steering, flames, trails, speed lines, lights on the road.
  updateLook(dt, sp, step, scroll, sky) {
    const boost = this.boostRate ? 1 : 0;
    const steer = clamp((this.lane === null ? 0 : laneX(this.lane, this.round ? this.round.n : 4)) - this.carX, -2.5, 2.5);
    this.carRig.rotation.y = -steer * 0.045;
    this.carRig.rotation.x = lerp(this.carRig.rotation.x, boost * -0.035, Math.min(1, dt * 6));
    this.flame += (boost - this.flame) * Math.min(1, dt * 8);
    const fl = this.flame * (0.75 + 0.25 * Math.sin(this.t * 47));
    this.flames.material.uniforms.uI.value = fl;
    this.flames.scale.set(1, 1, 0.4 + fl * 1.4);
    this.flames.visible = this.flame > 0.02;
    // trails ride the tail lights' real positions, through lane changes and spins
    this.car.updateMatrixWorld(true);
    const tI = 0.75 + 0.25 * clamp((sp - 30) / 45, 0, 1);
    for (const tr of this.trails) {
      tr.t.follow(this.carRig.localToWorld(this.tmp.copy(tr.p)), step, tr.step);
      tr.t.mesh.material.uniforms.uI.value = tI;
    }
    // speed lines
    const rush = clamp((sp - 36) / 50, 0, 1) * (REDUCED_MOTION ? 0.4 : 1);
    const lu = this.lines.material.uniforms;
    lu.uI.value = rush;
    lu.uScroll.value = (lu.uScroll.value + step * 1.6) % 60;
    lu.uStretch.value = 1 + rush * 1.5;
    this.lines.visible = rush > 0.01;
    // the ground's lights
    const g = this.groundMat.uniforms;
    g.uCarX.value = this.carX;
    g.uReflect.value = GFX.lite ? 0 : sky.wet; // the road dries out around midday
    g.uHead.value = 0.45 + 0.75 * sky.lamps;
    g.uUnder.value.set(COLORS.magenta).multiplyScalar(0.95 + 0.7 * this.flame);
    const gate = this.gate || this.leaving;
    if (gate) {
      const gz = gate.position.z;
      g.uGateZ.value = gz + 0.3;
      g.uGateN.value = gate.userData.n;
      g.uGateI.value = gate.scale.y * (0.35 + 0.9 * racerSmooth((gz + 170) / 160)) * (1 - racerSmooth((gz - 4) / 12));
      this.gateLight.position.set(this.carX * 0.5, 4.4, gz + 1.2);
      this.gateLight.intensity = 3 * racerSmooth((gz + 60) / 56) * (1 - racerSmooth((gz - 2) / 12));
    } else {
      g.uGateI.value = 0;
      this.gateLight.intensity = 0;
    }
    // a light that rides the nearest street lamp, sweeping over the paint
    const zl = racerMod(scroll + RACER_P / 2, RACER_P) - RACER_P / 2;
    const zr = racerMod(scroll, RACER_P) - RACER_P / 2;
    const left = Math.abs(zl) < Math.abs(zr);
    const lz = left ? zl : zr;
    this.lampLight.position.set(left ? -4.75 : 4.75, RACER_HEAD - 0.4, lz);
    this.lampLight.color.set(RACER_LAMP[left ? 0 : 1]);
    this.lampLight.intensity = 2.4 * sky.lamps * Math.exp(-(lz * lz) / 40);
  }
  pause() {
    super.pause();
    if (this.paused) Sound.engine(false);
  }
  resume() {
    super.resume();
    if (this.state !== "over") Sound.engine(true);
  }
  dispose() {
    Sound.engine(false);
    if (this.has3D) {
      if (this.owned) this.owned.forEach((r) => r.dispose());
      if (this.envKit) this.envKit.dispose();
      this.env = null;
    }
    super.dispose();
  }
}
const racerMod = (a, n) => ((a % n) + n) % n;
const racerSmooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
