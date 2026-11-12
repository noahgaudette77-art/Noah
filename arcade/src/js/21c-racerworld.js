// The world of Nest Egg Run beyond the road (look only; the game never reads it):
//   traffic  seven kinds of vehicle: both ways on the service lanes, and in hover
//            lanes overhead; they change lanes, brake, break down, part for a boost
//   biomes   downtown, a coast causeway, desert, a mountain pass and a tunnel, each
//            with its own scenery and palette, changed behind a bank of fog
//   events   what the Event Director can make happen: trains, helicopters, drones,
//            fireworks, lasers, meteors, a UFO, a blimp, lightning, explosions...

const RACER_ADS = [["RRSP", "START AT 25"], ["TFSA", "TAX-FREE GROWTH"], ["TERM 20", "COVER THE MORTGAGE"], ["ANNUITY", "INCOME FOR LIFE"],
  ["WRITE A WILL", "OR THE LAW DECIDES"], ["QPP", "CLAIM AT 65?"], ["DIVERSIFY", "MIND THE NEST EGG"], ["ASSURIS", "IF AN INSURER FAILS"]];
// Billboard ads: a 2 x 4 sheet of original posters in the course's own vocabulary.
function racerAdAtlas() {
  const cw = 256, ch = 128, c = document.createElement("canvas");
  c.width = cw * 2; c.height = ch * 4;
  const x = c.getContext("2d");
  x.fillStyle = "#05060c";
  x.fillRect(0, 0, c.width, c.height);
  const cols = ["#ff3ad4", "#35efff", "#ffd23d", "#5dffb0"];
  x.textAlign = "center"; x.textBaseline = "middle";
  RACER_ADS.forEach(([a, b], i) => {
    const x0 = (i % 2) * cw, y0 = Math.floor(i / 2) * ch, col = cols[i % 4];
    x.strokeStyle = col; x.lineWidth = 5; x.shadowColor = col; x.shadowBlur = 10;
    x.strokeRect(x0 + 8, y0 + 8, cw - 16, ch - 16);
    x.fillStyle = col;
    x.font = (a.length > 7 ? 19 : 30) + 'px "Press Start 2P", monospace';
    x.fillText(a, x0 + cw / 2, y0 + 50);
    x.shadowBlur = 0; x.fillStyle = "#e8f0ff";
    x.font = '22px "VT323", monospace';
    x.fillText(b, x0 + cw / 2, y0 + 94);
  });
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}
// Ad panels: each shows one poster, rolls to the next every few seconds. holo: a
// see-through projection with scan lines. loop: rides the looping roadside.
function racerAdMaterial(shared, tex, holo, loop) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uScroll: shared.uScroll, uLen: shared.uLen, uZMax: shared.uZMax, tAds: { value: tex }, uTime: { value: 0 }, uI: { value: 1 } }),
    side: THREE.DoubleSide, transparent: !!holo, depthWrite: !holo, blending: holo ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `${RACER_WRAP_GLSL}
      attribute float aZ; attribute float aSeed; varying vec2 vUv; varying float vSeed; varying float vDepth; varying float vFar;
      void main(){
        vec3 p = position; vFar = 1.0;
        ${loop ? "float zz = racerWrap(aZ); p.z += zz - aZ; vFar = racerFar(zz);" : ""}
        vUv = uv; vSeed = aSeed;
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform sampler2D tAds; uniform float uTime; uniform float uI; varying vec2 vUv; varying float vSeed; varying float vDepth; varying float vFar;
      void main(){
        float ph = uTime / 6.0 + vSeed * 8.0;
        float idx = mod(floor(ph) + floor(vSeed * 8.0), 8.0);
        float roll = smoothstep(0.88, 1.0, fract(ph));
        vec2 uv = vec2(vUv.x, fract(vUv.y - roll));
        if (roll > 0.0 && vUv.y - roll < 0.0) idx = mod(idx + 1.0, 8.0); // the next poster rolls in from the top
        vec2 cell = vec2(mod(idx, 2.0), floor(idx / 2.0));
        vec3 ad = texture2D(tAds, vec2((cell.x + uv.x) / 2.0, (3.0 - cell.y + uv.y) / 4.0)).rgb;
        ${holo
          ? "vec3 col = (ad * vec3(0.7, 1.0, 1.15) + vec3(0.0, 0.05, 0.07)) * (0.6 + 0.4 * sin(vUv.y * 120.0 - uTime * 5.0)) * (0.85 + 0.15 * sin(uTime * 2.3 + vSeed * 9.0)) * uI * 1.5 * vFar * (1.0 - smoothstep(uFogNear, uFogFar, vDepth)); gl_FragColor = vec4(col, 1.0);"
          : "vec3 col = ad * 1.9 * uI + vec3(0.01, 0.012, 0.02); float f = max(smoothstep(uFogNear, uFogFar, vDepth), 1.0 - vFar); gl_FragColor = vec4(mix(col, uFogColor, f), 1.0);"}
      }`,
  });
}

// ---- vehicles -----------------------------------------------------------------
// Light channels: 1 headlamps, 2 tail lamps, 3 windows, 4 hazards, 5 glow strips,
// 6/7 a patrol light bar, 8 steady markers. aPaint marks panels in the body colour.
const RACER_PAINTS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x4a5a6e, 0x16a085, 0xd35400, 0x8f9aa3, 0xff6fb5];
function racerVehicleGeo(type) {
  const b = new RacerBatch(["aCh", "aPaint"]);
  const box = new THREE.BoxGeometry(1, 1, 1), cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
  const GL = 0x0c141b, DK = 0x14161b, WH = 0xffffff;
  const P = (w, h, d, x, y, z, color, paint = 0, rx = 0, c = 0.08) => { const g = racerPlate(w, h, d, c, true); b.add(g, racerM(x, y, z, 1, 1, 1, rx), color, 1, { aCh: 0, aPaint: paint }); g.dispose(); };
  const L = (ch, w, h, d, x, y, z, color, k) => b.add(box, racerM(x, y, z, w, h, d), color, k, { aCh: ch, aPaint: 0 });
  const wheel = (x, y, z, r, w) => {
    b.add(cyl, racerM(x, y, z, r, w, r, 0, 0, Math.PI / 2), 0x0a0b0e, 1, { aCh: 0, aPaint: 0 });
    b.add(cyl, racerM(x + Math.sign(x || 1) * w * 0.5, y, z, r * 0.56, 0.04, r * 0.56, 0, 0, Math.PI / 2), 0x9aa3ab, 1, { aCh: 0, aPaint: 0 });
  };
  const lamps = (hw, y, zf, zr, tw = 0.5) => {
    [-1, 1].forEach((s) => { L(1, 0.42, 0.14, 0.06, s * hw, y, zf, 0xfff2d8, 5); L(2, tw, 0.13, 0.06, s * hw, y + 0.04, zr, 0xff1030, 3); L(4, 0.14, 0.13, 0.06, s * (hw + 0.36), y + 0.04, zr, 0xffa53d, 3); L(4, 0.14, 0.13, 0.06, s * (hw + 0.34), y, zf, 0xffa53d, 3); });
  };
  if (type === "sedan") {
    P(1.84, 0.56, 4.4, 0, 0.6, 0, WH, 1, 0, 0.12);
    P(1.7, 0.2, 4.2, 0, 0.3, 0, DK);
    P(1.56, 0.5, 2.2, 0, 1.1, 0.25, GL, 0, 0, 0.18);
    P(1.36, 0.07, 1.5, 0, 1.37, 0.3, WH, 1, 0, 0.03);
    [-1, 1].forEach((s) => { L(3, 0.03, 0.24, 1.7, s * 0.79, 1.12, 0.25, 0xffe2a8, 1.1); wheel(s * 0.88, 0.34, -1.4, 0.34, 0.24); wheel(s * 0.88, 0.34, 1.4, 0.34, 0.24); });
    lamps(0.62, 0.66, -2.2, 2.2);
    L(2, 1.3, 0.05, 0.06, 0, 0.84, 2.2, 0xff1030, 1.6);
  } else if (type === "truck") {
    P(2.3, 1.6, 1.8, 0, 1.3, -3.0, WH, 1, 0, 0.14);
    P(2.1, 0.62, 0.1, 0, 1.62, -3.9, GL);
    P(2.5, 2.7, 5.6, 0, 2.05, 0.9, 0xd4d9de, 0, 0, 0.1);
    P(2.1, 0.34, 7.9, 0, 0.56, -0.3, DK);
    [-1, 1].forEach((s) => { L(8, 0.03, 0.34, 5.0, s * 1.265, 2.5, 0.9, WH, 0.001); b.add(box, racerM(s * 1.262, 1.5, 0.9, 0.03, 0.5, 4.8), WH, 1, { aCh: 0, aPaint: 1 }); [-2.9, 1.7, 2.8].forEach((z) => wheel(s * 1.08, 0.46, z, 0.46, 0.3)); });
    [-0.9, -0.3, 0.3, 0.9].forEach((x) => L(8, 0.12, 0.07, 0.06, x, 3.44, -1.9, 0xffa53d, 2.6));
    lamps(0.82, 0.86, -3.92, 3.72, 0.4);
  } else if (type === "bus") {
    P(2.56, 2.7, 9.8, 0, 1.85, 0, WH, 1, 0, 0.16);
    P(2.3, 1.1, 0.1, 0, 2.2, -4.9, GL);
    [-1, 1].forEach((s) => {
      L(3, 0.03, 0.74, 8.6, s * 1.29, 2.3, 0.1, 0xfff0c8, 1.0);
      for (let i = 0; i < 6; i++) b.add(box, racerM(s * 1.295, 2.3, -3.5 + i * 1.44, 0.03, 0.8, 0.12), WH, 1, { aCh: 0, aPaint: 1 });
      L(8, 0.03, 0.56, 4.4, s * 1.292, 1.22, 0.8, 0xff3ad4, 1.0);
      [-3.3, 3.0].forEach((z) => wheel(s * 1.12, 0.5, z, 0.5, 0.32));
    });
    L(8, 1.7, 0.26, 0.06, 0, 2.95, -4.92, 0xffb000, 2.2);
    lamps(0.9, 0.8, -4.92, 4.92, 0.44);
  } else if (type === "bike") {
    P(0.34, 0.5, 1.5, 0, 0.66, 0, WH, 1, 0, 0.12);
    [-0.72, 0.72].forEach((z) => { b.add(cyl, racerM(0, 0.34, z, 0.34, 0.14, 0.34, 0, 0, Math.PI / 2), 0x0a0b0e, 1, { aCh: 0, aPaint: 0 }); b.add(cyl, racerM(0, 0.34, z, 0.18, 0.16, 0.18, 0, 0, Math.PI / 2), 0x9aa3ab, 1, { aCh: 0, aPaint: 0 }); });
    P(0.44, 0.66, 0.36, 0, 1.18, 0.1, 0x15171c, 0, -0.5);
    P(0.3, 0.3, 0.32, 0, 1.6, -0.2, WH, 1, 0, 0.1);
    P(0.62, 0.05, 0.08, 0, 1.05, -0.5, DK);
    L(1, 0.18, 0.18, 0.06, 0, 0.84, -0.84, 0xfff2d8, 6);
    L(2, 0.16, 0.09, 0.06, 0, 0.84, 0.8, 0xff1030, 3.5);
  } else if (type === "hover" || type === "police") {
    const pol = type === "police";
    P(1.95, 0.46, 4.5, 0, 0, 0, WH, 1, 0, 0.18);
    P(1.5, 0.3, 1.3, 0, -0.03, -2.6, pol ? DK : WH, pol ? 0 : 1, 0.14, 0.1);
    P(1.34, 0.44, 2.0, 0, 0.42, 0.15, GL, 0, 0, 0.18);
    [-1, 1].forEach((s) => {
      [-1.35, 1.4].forEach((z) => { b.add(cyl, racerM(s * 0.98, -0.24, z, 0.44, 0.3, 0.44), DK, 1, { aCh: 0, aPaint: 0 }); b.add(cyl, racerM(s * 0.98, -0.41, z, 0.34, 0.04, 0.34), 0x35efff, 3, { aCh: 5, aPaint: 0 }); });
      P(0.07, 0.52, 0.95, s * 0.92, 0.38, 1.75, WH, 1);
      L(3, 0.03, 0.2, 1.5, s * 0.68, 0.46, 0.15, 0xffe2a8, 1.0);
    });
    L(1, 1.3, 0.08, 0.06, 0, 0.06, -3.24, 0xfff2d8, 5);
    L(2, 1.55, 0.09, 0.06, 0, 0.1, 2.26, 0xff1030, 3.2);
    if (pol) { L(6, 0.56, 0.16, 0.34, -0.36, 0.74, 0.1, 0xff1030, 4.5); L(7, 0.56, 0.16, 0.34, 0.36, 0.74, 0.1, 0x2a60ff, 5); P(1.4, 0.06, 0.5, 0, 0.66, 0.1, DK); b.add(box, racerM(0, 0.02, 0.4, 1.97, 0.16, 1.6), DK, 1, { aCh: 0, aPaint: 0 }); }
  } else if (type === "rival") {
    P(1.9, 0.42, 4.5, 0, 0.47, 0, WH, 1, 0, 0.14);
    P(1.5, 0.26, 1.2, 0, 0.42, -2.55, WH, 1, 0.12, 0.08);
    P(1.3, 0.4, 1.8, 0, 0.86, 0.3, GL, 0, 0, 0.16);
    P(2.05, 0.06, 0.52, 0, 1.22, 2.05, DK);
    [-1, 1].forEach((s) => { P(0.08, 0.5, 0.3, s * 0.8, 0.95, 2.05, DK); L(5, 0.03, 0.08, 3.7, s * 0.965, 0.52, 0, 0xff3ad4, 3); wheel(s * 0.9, 0.36, -1.45, 0.36, 0.3); wheel(s * 0.9, 0.36, 1.45, 0.38, 0.34); });
    L(1, 1.4, 0.07, 0.06, 0, 0.52, -3.16, 0xfff2d8, 5);
    L(2, 1.6, 0.08, 0.06, 0, 0.6, 2.26, 0xff1030, 3.4);
    L(5, 0.3, 0.12, 0.06, 0, 0.3, 2.27, 0xffb86a, 3);
  }
  box.dispose(); cyl.dispose();
  return b.build();
}
function racerTrafficMaterial(P) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uKey: P.uKey, uKeyDir: P.uKeyDir, uAmb: P.uAmb, uTime: { value: 0 }, uSkyC: { value: new THREE.Color(0x35406a) }, uDim: { value: 1 } }),
    vertexShader: `attribute vec3 aCol; attribute float aCh; attribute float aPaint; attribute vec3 aTint; attribute vec4 aL;
      uniform float uTime; uniform float uDim;
      varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vLit; varying float vDepth;
      void main(){
        #ifdef USE_INSTANCING
          mat4 m = modelMatrix * instanceMatrix;
        #else
          mat4 m = modelMatrix;
        #endif
        vec4 w = m * vec4(position, 1.0);
        vN = mat3(m) * normal; vW = w.xyz;
        vec3 c = aCol * mix(vec3(1.0), aTint, aPaint);
        vLit = 0.0;
        if (aCh > 0.5) {
          float k = 1.0;
          vLit = 1.0;
          if (aCh < 1.5) k = aL.x;
          else if (aCh < 2.5) k = aL.y;
          else if (aCh < 3.5) k = 0.25 + 0.75 * step(0.45, fract(aL.w * 7.3 + floor(position.z * 0.7) * 0.37));
          else if (aCh < 4.5) k = aL.z * smoothstep(-0.1, 0.5, sin(uTime * 8.8 + aL.w * 20.0));
          else if (aCh < 5.5) k = 0.8 + 0.2 * sin(uTime * 3.0 + aL.w * 9.0);
          else if (aCh < 6.5) k = smoothstep(-0.2, 0.6, sin(uTime * 7.8));
          else if (aCh < 7.5) k = smoothstep(-0.2, 0.6, -sin(uTime * 7.8));
          else c = aCol * mix(vec3(1.0), aTint * 1.6, step(aCol.r + aCol.g + aCol.b, 0.01) + step(2.9, aCol.r + aCol.g + aCol.b) * 0.0);
          c *= k * uDim;
        }
        vCol = c;
        vec4 mv = viewMatrix * w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform vec3 uKey; uniform vec3 uKeyDir; uniform vec3 uAmb; uniform vec3 uSkyC;
      varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vLit; varying float vDepth;
      void main(){
        vec3 col = vCol;
        if (vLit < 0.5) {
          vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW);
          float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          col = vCol * (uAmb + uKey * max(dot(n, uKeyDir), 0.0)) + uSkyC * fr * 0.3 * (0.3 + 0.7 * max(n.y, 0.0));
        }
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}
const RACER_FLEET = { sedan: 6, truck: 3, bus: 2, bike: 4, hover: 6, police: 1, rival: 1 };

// A cone of light in the air (searchlights, tractor beams, lasers): bright at its
// source, fading along its length and toward its edges.
function racerShaft(color, r0, r1, len, sides = 12) {
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1, true);
  g.translate(0, len / 2, 0);
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: { uI: { value: 1 }, uColor: { value: new THREE.Color(color) }, uLen: { value: len } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "uniform float uLen; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = clamp(position.y / uLen, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
    fragmentShader: "uniform float uI; uniform vec3 uColor; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float rim = abs(dot(normalize(vN), normalize(vV))); float a = pow(1.0 - vT, 1.5) * smoothstep(0.0, 0.04, vT) * rim * rim; gl_FragColor = vec4(uColor * (a * uI), 1.0); }",
  }));
  m.layers.set(1);
  m.frustumCulled = false;
  return m;
}

// Which stretch of the career runs through which biome (years 0-39).
function racerBiomeAt(year) {
  if (year < 7) return "downtown";
  if (year < 8) return "tunnel";
  if (year < 16) return "coast";
  if (year < 24) return "desert";
  if (year < 25) return "tunnel";
  if (year < 33) return "mountain";
  if (year < 34) return "tunnel";
  return "downtown";
}
// What each biome does to the career sky's palette. mix values blend toward the colour.
const RACER_BIOME_PAL = {
  downtown: { fog: 0x000000, fogMix: 0, hor: 0x000000, horMix: 0, grid: 0x000000, gridMix: 0, base: 0x000000, baseMix: 0, rain: 1, wet: 1, dust: 0, far: 470, lamps: 1, ridge: 1 },
  coast: { fog: 0x3aa7b8, fogMix: 0.42, hor: 0xffb38a, horMix: 0.45, grid: 0x35efff, gridMix: 0.7, base: 0x3a2f1c, baseMix: 0.85, rain: 0, wet: 0.45, dust: 0.25, far: 560, lamps: 1, ridge: 0.6 },
  desert: { fog: 0xc86a2c, fogMix: 0.5, hor: 0xff7a2a, horMix: 0.55, grid: 0xffa53d, gridMix: 0.8, base: 0x40220e, baseMix: 0.9, rain: 0, wet: 0, dust: 1, far: 520, lamps: 1, ridge: 1.6 },
  mountain: { fog: 0x7f95c8, fogMix: 0.5, hor: 0xb8cdf5, horMix: 0.5, grid: 0xcfe0ff, gridMix: 0.7, base: 0x141b2c, baseMix: 0.8, rain: 0.8, wet: 0.6, dust: 0.5, far: 380, lamps: 1, ridge: 2.3 },
  tunnel: { fog: 0x1c1208, fogMix: 0.9, hor: 0x1c1208, horMix: 0.9, grid: 0x000000, gridMix: 1, base: 0x0b0b0c, baseMix: 1, rain: 0, wet: 0.25, dust: 0.2, far: 260, lamps: 0, ridge: 0 },
};

class RacerWorld {
  constructor(game) {
    const g = (this.g = game);
    this.t = 0;
    this.calmK = 0;
    this.part = 0; this.partT = 0;
    this.lastAnswered = 0;
    this.biome = racerBiomeAt(game.year);
    this.pal = Object.assign({}, RACER_BIOME_PAL[this.biome]);
    this.palC = { fog: new THREE.Color(), hor: new THREE.Color(), grid: new THREE.Color(), base: new THREE.Color() };
    for (const k in this.palC) this.palC[k].set(RACER_BIOME_PAL[this.biome][k]);
    this.swap = null;
    this.cityFog = 900;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color();
    RacerGame.adTex = RacerGame.adTex || racerAdAtlas();
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.addMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.buildTraffic();
    this.buildBiomes();
    this.buildEvents();
    this.setBiome(this.biome);
  }

  // ===== traffic =================================================================
  buildTraffic() {
    const g = this.g;
    this.trafficMat = racerTrafficMaterial(g.props.material.uniforms);
    this.fleet = {};
    this.cars = [];
    for (const type in RACER_FLEET) {
      const n = RACER_FLEET[type], geo = racerVehicleGeo(type);
      const tint = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3), lights = new THREE.InstancedBufferAttribute(new Float32Array(n * 4).fill(1), 4);
      tint.setUsage(THREE.DynamicDrawUsage); lights.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("aTint", tint);
      geo.setAttribute("aL", lights);
      const mesh = new THREE.InstancedMesh(geo, this.trafficMat, n);
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < n; i++) { mesh.setMatrixAt(i, zero); this.cars.push({ type, i, on: false, mesh, tint, lights }); }
      g.scene.add(mesh);
      this.fleet[type] = mesh;
    }
    this.spawnT = { R: 0.5, L: 1.2, H: 0.8 };
  }
  free(type) { return this.cars.find((c) => !c.on && c.type === type); }
  // lane: "R" the right service lane (our way), "L" the left one (oncoming), "H" a hover lane, "M" the main road (events)
  spawn(type, lane, o = {}) {
    const c = this.free(type);
    if (!c) return null;
    const sp = this.g.speed;
    Object.assign(c, { on: true, lane, special: o.special || null, hazard: 0, ind: 0, brake: 0, y: 0, age: 0, seed: Math.random(), s: rand(0.94, 1.06), yaw: 0, laneT: rand(3, 9) });
    if (lane === "R") { c.dir = 1; c.x = c.tx = Math.random() < 0.5 ? 6.6 : 8.0; c.speed = type === "bike" ? rand(40, 50) : type === "sedan" ? rand(19, 25) : rand(15, 20); c.z = c.speed > sp ? 15 : -244; }
    else if (lane === "L") { c.dir = -1; c.x = c.tx = Math.random() < 0.5 ? -6.6 : -8.0; c.speed = type === "bike" ? rand(26, 34) : rand(17, 25); c.z = -244; }
    else if (lane === "H") { const hl = Math.floor(Math.random() * 3); c.dir = hl === 1 ? -1 : 1; c.y = 10 + hl * 3 + rand(-0.6, 0.6); c.x = c.tx = rand(-5.6, 5.6); c.speed = c.dir > 0 ? rand(36, 46) + hl * 6 : rand(22, 32); c.z = c.dir > 0 && c.speed > sp + 4 ? 18 : -244; }
    Object.assign(c, o);
    c.tint.setXYZ(c.i, 1, 1, 1);
    const col = this._c.set(o.color !== undefined ? o.color : RACER_PAINTS[Math.floor(Math.random() * RACER_PAINTS.length)]);
    if (o.color === undefined) col.offsetHSL(rand(-0.03, 0.03), 0, rand(-0.06, 0.06));
    c.tint.setXYZ(c.i, col.r, col.g, col.b);
    c.tint.needsUpdate = true;
    return c;
  }
  updateTraffic(dt, sp, sky) {
    const g = this.g, tunnel = this.biome === "tunnel";
    const dense = (GFX.lite ? 0.6 : 1) * (1 - 0.4 * this.calmK);
    const count = (l) => this.cars.reduce((a, c) => a + (c.on && c.lane === l && !c.special ? 1 : 0), 0);
    const T = this.spawnT;
    for (const l of ["R", "L", "H"]) {
      T[l] -= dt;
      if (T[l] > 0) continue;
      T[l] = rand(0.7, 2.6) / dense;
      const want = l === "H" ? (tunnel ? 0 : 4) : 3;
      if (count(l) >= Math.round(want * dense)) continue;
      const r = Math.random();
      this.spawn(l === "H" ? "hover" : r < 0.42 ? "sedan" : r < 0.6 ? "bike" : r < 0.82 ? "truck" : "bus", l);
    }
    // a right answer: everything pulls aside for the boost
    this.partT -= dt;
    this.part += ((this.partT > 0 ? 1 : 0) - this.part) * Math.min(1, dt * 4);
    const head = (0.3 + 0.7 * (sky ? sky.lamps : 1)) * (1 - 0.3 * this.calmK);
    const dirty = new Set();
    for (const c of this.cars) {
      if (!c.on) continue;
      c.age += dt;
      const rel = c.dir > 0 ? sp - c.speed : sp + c.speed;
      c.z += rel * dt;
      if (c.z > 20 || c.z < -250 || (c.lane === "H" && tunnel)) { c.on = false; c.mesh.setMatrixAt(c.i, this._m.makeScale(0, 0, 0)); dirty.add(c.mesh); if (c.done) c.done(c); continue; }
      // lane changes on the service lanes, indicator blinking; a stalled car is given room
      if ((c.lane === "R" || c.lane === "L") && !c.special) {
        c.laneT -= dt;
        const side = Math.sign(c.x), stalled = this.cars.some((o) => o.on && o.special === "stall" && Math.sign(o.x) === side && o.z < c.z && o.z > c.z - 60);
        if (stalled) c.tx = side * 6.5;
        else if (c.laneT <= 0) { c.laneT = rand(4, 11); c.tx = side * (Math.abs(c.tx) < 7.3 ? 8.0 : 6.6); c.ind = 1.6; }
      }
      if (c.plan) c.plan(c, dt, sp);
      const px = c.x;
      c.x += (c.tx - c.x) * Math.min(1, dt * 1.5);
      c.ind = Math.max(0, c.ind - dt);
      c.yaw += (clamp((c.x - px) / Math.max(dt, 1e-3) * -0.05 * c.dir, -0.25, 0.25) - c.yaw) * Math.min(1, dt * 6);
      const ground = c.lane !== "H";
      const ox = ground && c.lane !== "M" ? Math.sign(c.x) * this.part * 0.9 : 0, oy = ground ? 0 : this.part * 2.2 + Math.sin(this.t * 1.3 + c.seed * 9) * 0.25;
      this._e.set(0, (c.dir < 0 ? Math.PI : 0) + c.yaw, ground ? 0 : c.yaw * -1.2);
      this._m.compose(this._p.set(c.x + ox, c.y + oy, c.z), this._q.setFromEuler(this._e), this._s.set(c.s, c.s, c.s));
      c.mesh.setMatrixAt(c.i, this._m);
      c.lights.setXYZW(c.i, head, 0.7 + (c.brake > 0 || this.part > 0.3 ? 1.1 : 0), c.hazard || c.ind > 0 ? 1 : 0, c.seed);
      dirty.add(c.mesh);
    }
    for (const m of dirty) { m.instanceMatrix.needsUpdate = true; m.geometry.attributes.aL.needsUpdate = true; }
    const u = this.trafficMat.uniforms;
    u.uDim.value = 1 - 0.25 * this.calmK;
    if (sky) u.uSkyC.value.copy(sky.horizon).lerp(sky.light, 0.4);
  }

  // ===== biomes ==================================================================
  buildBiomes() {
    const g = this.g, sh = g.shared;
    const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 8), CONE = new THREE.CylinderGeometry(0, 1, 1, 7), ICO = new THREE.IcosahedronGeometry(1, 0);
    const mk = () => new RacerBatch(["aZ", "aKind"]);
    const put = (b, geo, x, y, z, sx, sy, sz, color, aZ, kind = 0, k = 1, rx = 0, ry = 0, rz = 0) => b.add(geo, racerM(x, y, z, sx, sy, sz, rx, ry, rz), color, k, { aZ, aKind: kind });
    const strut = (b, a, c, t, color, aZ, kind = 0, k = 1) => racerStrut(b, BOX, new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(c[0], c[1], c[2]), t, color, k, { aZ, aKind: kind });
    const loft = (b, rings, x, z, color, aZ) => { const ge = cyLoft(rings); b.add(ge, racerM(x, 0, z), color, 1, { aZ, aKind: 0 }); ge.dispose(); };
    const mesh = (b) => { const m = new THREE.Mesh(b.build(), g.props.material); m.frustumCulled = false; return m; };
    // ad panels: [x, y, z, w, h, ry, aZ]
    const adMesh = (list, holo, loop = true) => {
      const pos = [], uv = [], az = [], seed = [];
      list.forEach(([x, y, z, w, h, ry, aZ], i) => {
        const c = Math.cos(ry), s = Math.sin(ry), sd = (i * 0.37 + 0.11) % 1;
        const P = (u, v) => { pos.push(x + (u - 0.5) * w * c, y + (v - 0.5) * h, z - (u - 0.5) * w * s); uv.push(u, v); az.push(aZ); seed.push(sd); };
        P(0, 0); P(1, 0); P(1, 1); P(0, 0); P(1, 1); P(0, 1);
      });
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      ge.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      ge.setAttribute("aZ", new THREE.Float32BufferAttribute(az, 1));
      ge.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
      const m = new THREE.Mesh(ge, racerAdMaterial(sh, RacerGame.adTex, holo, loop));
      m.frustumCulled = false;
      if (holo) m.layers.set(1);
      return m;
    };
    // a billboard on a post: frame, lamps along the top, the ad itself
    const billboard = (b, ads, x, z, y = 9, w = 9, h = 4.5) => {
      const aZ = z - 1, sd = Math.sign(x);
      put(b, BOX, x, y / 2, z, 0.45, y, 0.45, 0x3a3f48, aZ);
      put(b, BOX, x, y + h / 2, z + 0.2, w + 0.5, h + 0.5, 0.25, 0x15171c, aZ);
      for (let i = 0; i < 4; i++) put(b, BOX, x - w / 2 + (i + 0.5) * (w / 4), y + h + 0.45, z - 0.5, 0.5, 0.12, 0.3, 0xfff0d2, aZ, 2, 2.2);
      ads.push([x, y + h / 2, z + 0.05, w, h, sd * -0.0, aZ]);
    };
    const guard = (b, x, color = 0x9aa7b5) => { for (let i = 0; i < 16; i++) { const z = -i * 16, aZ = z - 16; put(b, BOX, x, 0.66, z - 8, 0.1, 0.14, 16, color, aZ); for (let k = 0; k < 4; k++) put(b, BOX, x, 0.36, z - 2 - k * 4, 0.13, 0.72, 0.13, 0x6a7480, aZ); } };
    this.sets = {};
    const set = (name, ...objs) => { const grp = new THREE.Group(); objs.forEach((o) => o && grp.add(o)); grp.visible = false; g.scene.add(grp); this.sets[name] = grp; return grp; };

    // ---- downtown: what the clockwork city gains: a works site, ads, holograms
    {
      const b = mk(), ads = [], holos = [];
      // road works on the right-hand shoulder: barriers, cones, an arrow board, a digger
      for (let i = 0; i < 9; i++) { const z = -74 - i * 3.4, aZ = -106; put(b, BOX, 9.05, 0.55, z, 0.3, 1.0, 2.8, i % 2 ? 0xffa53d : 0xf2f2f2, aZ, i % 2 ? 1 : 0, i % 2 ? 1.5 : 1); put(b, BOX, 9.05, 1.25, z, 0.14, 0.14, 0.14, 0xffa53d, aZ, 2, 2.6); }
      for (let i = 0; i < 6; i++) { put(b, CONE, 5.6, 0.4, -70 - i * 6, 0.24, 0.8, 0.24, 0xff7a2a, -106, 0, 1); put(b, BOX, 5.6, 0.52, -70 - i * 6, 0.3, 0.1, 0.3, 0xffffff, -106, 1, 1.2); }
      put(b, BOX, 8.9, 3.4, -68, 0.2, 2.2, 3.2, 0x15171c, -106);
      [[-0.7, 0.5], [-0.7, -0.5], [0.1, 0.5], [0.1, -0.5]].forEach(([dz, r]) => put(b, BOX, 8.78, 3.4 + r * 0.38, -68 + dz, 0.06, 0.16, 1.0, 0xffa53d, -106, 1, 2.4, r * -1.1));
      put(b, BOX, 8.9, 1.2, -68, 0.16, 2.4, 0.16, 0x3a3f48, -106);
      put(b, BOX, 8.6, 1.3, -96, 1.2, 1.6, 3.6, 0xf1c40f, -106); put(b, BOX, 8.6, 2.5, -96.6, 1.0, 1.0, 1.4, 0x20242a, -106);
      strut(b, [8.6, 2.6, -95], [8.4, 5.4, -91], 0.36, 0xf1c40f, -106); strut(b, [8.4, 5.4, -91], [8.2, 2.4, -88.6], 0.3, 0xf1c40f, -106);
      put(b, BOX, 8.2, 2.0, -88.4, 0.9, 0.7, 0.7, 0x3a3f48, -106);
      // camera gantries over the service lanes only (the main road's gantries are the questions)
      [[-1, -36], [1, -164]].forEach(([sd, z]) => { put(b, BOX, sd * 9.05, 3.6, z, 0.28, 7.2, 0.28, 0x3a3f48, z - 1); put(b, BOX, sd * 7.3, 7.1, z, 3.8, 0.24, 0.24, 0x3a3f48, z - 1); [6.6, 8.0].forEach((x) => { put(b, BOX, sd * x, 6.8, z, 0.5, 0.36, 0.4, 0x15171c, z - 1); put(b, BOX, sd * x, 6.8, z + 0.22, 0.2, 0.1, 0.05, 0xff3030, z - 1, 2, 2.4); }); });
      // rooftop and wall ads, and holograms that hang over the pavements
      ads.push([-9.1, 13.5, -58, 7, 3.5, Math.PI / 2, -62], [9.1, 15, -150, 7, 3.5, -Math.PI / 2, -154], [-9.1, 12.5, -212, 7, 3.5, Math.PI / 2, -216]);
      holos.push([-7.4, 8.6, -116, 4.2, 2.1, 0.5, -118], [7.4, 9.2, -30, 4.2, 2.1, -0.5, -32], [7.2, 8.4, -206, 4.2, 2.1, -0.5, -208]);
      [[-7.4, -116], [7.4, -30], [7.2, -206]].forEach(([x, z]) => { put(b, BOX, x * 1.2, 6.9, z, 0.5, 0.2, 0.5, 0x35efff, z - 2, 1, 2.2); put(b, BOX, x * 1.2, 3.4, z, 0.14, 6.8, 0.14, 0x3a3f48, z - 2); });
      const holo = adMesh(holos, true);
      g.decor(holo);
      set("downtown", mesh(b), adMesh(ads, false), holo);
    }

    // ---- coast: a causeway between two seas: palms, a cable-stayed bridge, a diner
    {
      const b = mk(), ads = [];
      guard(b, -9.7); guard(b, 9.7);
      for (let i = 0; i < 14; i++) {
        const sd = i % 2 ? 1 : -1, x = sd * rand(11, 15.2), z = -8 - i * 17.6 + rand(-3, 3), h = rand(6.5, 10), lean = rand(-0.12, 0.12), aZ = z - 4;
        for (let k = 0; k < 5; k++) put(b, CYL, x + lean * (k / 5) * h * 1.2, ((k + 0.5) * h) / 5, z, 0.3 - k * 0.03, h / 5 + 0.05, 0.3 - k * 0.03, k % 2 ? 0x7a5a36 : 0x6a4a2a, aZ, 0, 1, 0, 0, -lean);
        const tx = x + lean * h * 1.2;
        for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + i; put(b, BOX, tx + Math.cos(a) * 1.5, h - 0.25, z + Math.sin(a) * 1.5, 3.3, 0.05, 0.62, k % 2 ? 0x1f8a52 : 0x176a40, aZ, 0, 1, 0, -a, -0.28); }
        if (i % 3 === 0) for (let k = 0; k < 6; k++) put(b, BOX, x + lean * (k / 6) * h, 1 + (k * h) / 7.5, z, 0.72, 0.06, 0.72, 0xff3ad4, aZ, 1, 1.6, 0, k * 0.6, 0);
      }
      [-72, -200].forEach((z) => {
        const aZ = z - 48;
        for (const sd of [-1, 1]) {
          put(b, BOX, sd * 19, 14, z, 1.6, 28, 2.2, 0x55606c, aZ); put(b, BOX, sd * 19, 28.6, z, 2.4, 1.2, 3.0, 0x6a7684, aZ);
          put(b, BOX, sd * 19, 29.7, z, 0.5, 0.5, 0.5, 0xff3030, aZ, 2, 3);
          put(b, BOX, sd * 14.6, 0.5, z, 9.4, 0.7, 3.2, 0x414a55, aZ);
          for (let k = 1; k <= 5; k++) for (const fz of [-1, 1]) { strut(b, [sd * 19, 27 - k * 1.2, z], [sd * 10, 0.9, z + fz * k * 9], 0.09, 0xcfd8e0, aZ); put(b, BOX, sd * 10, 1.0, z + fz * k * 9, 0.2, 0.2, 0.2, 0xfff0d2, aZ, 2, 2.4); }
        }
      });
      { // a neon diner
        const z = -134, aZ = z - 6, x = 14.6;
        put(b, BOX, x, 2.1, z, 7, 4.2, 9, 0xd8d0c4, aZ); put(b, BOX, x - 3.53, 2.1, z, 0.06, 1.5, 7.4, 0xffe2a8, aZ, 2, 1.5);
        put(b, BOX, x, 4.45, z, 7.6, 0.3, 9.6, 0x35efff, aZ, 1, 2.2);
        put(b, BOX, x - 2.4, 6.4, z + 2, 0.3, 4, 0.3, 0x8a8f98, aZ); put(b, BOX, x - 2.4, 9, z + 2, 3.6, 1.5, 0.25, 0x16181d, aZ);
        [[0, 0.72, 3.6, 0.12], [0, -0.72, 3.6, 0.12], [1.76, 0, 0.12, 1.5], [-1.76, 0, 0.12, 1.5]].forEach(([dx, dy, w, h]) => put(b, BOX, x - 2.4 + dx, 9 + dy, z + 2.15, w, h, 0.06, 0xff3ad4, aZ, 1, 2.6));
        put(b, BOX, x - 2.4, 9, z + 2.16, 2.2, 0.5, 0.05, 0xffd23d, aZ, 1, 2.2);
      }
      for (let i = 0; i < 4; i++) { const z = -30 - i * 7, c = [0xff9bb5, 0x8fd8ff, 0xfff0a0, 0x9bf0c0][i]; put(b, BOX, -13.2, 1.2, z, 2.4, 2.4, 2.4, c, z - 2); put(b, CONE, -13.2, 3.0, z, 2.0, 1.2, 2.0, 0xf2f2f2, z - 2); }
      { const z = -100, aZ = z - 3; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => put(b, BOX, -13 + i * 0.9, 1.6, z + j * 0.9, 0.16, 3.2, 0.16, 0xe8e8e8, aZ)); put(b, BOX, -13, 4.1, z, 2.4, 1.8, 2.4, 0xff5a5a, aZ); put(b, BOX, -13, 5.2, z, 2.8, 0.2, 2.8, 0xf2f2f2, aZ); put(b, BOX, -13, 6.4, z, 0.06, 2.2, 0.06, 0xe8e8e8, aZ); put(b, BOX, -12.6, 7.1, z, 0.8, 0.5, 0.04, 0xff3030, aZ, 1, 1.6); }
      [[-58, -40, 1], [70, -150, -1], [-96, -220, 1], [44, -60, -1]].forEach(([x, z, s], i) => { const aZ = z - 4; put(b, BOX, x, 0.7, z, 2.2, 1.2, 7, 0xf2f2f2, aZ); put(b, BOX, x, 5.5, z, 0.14, 9, 0.14, 0x8a8f98, aZ); put(b, BOX, x + s * 1.1, 5.2, z + 0.4, 0.06, 7.4, 3.6, [0xfff0d2, 0xff9bb5, 0x8fd8ff, 0xfff0a0][i], aZ, 0, 1, 0, 0, s * 0.16); put(b, BOX, x, 10.1, z, 0.22, 0.22, 0.22, 0xfff0d2, aZ, 2, 3); });
      billboard(b, ads, -12.6, -168); billboard(b, ads, 12.8, -52);
      // the sea on both sides: it mirrors the bridge, the palms and the sky
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
        uniforms: Object.assign(fogUniforms(), { tReflect: g.groundMat.uniforms.tReflect, uMirror: g.groundMat.uniforms.uMirror, uTime: { value: 0 }, uScroll: sh.uScroll, uDeep: { value: new THREE.Color(0x06323c) }, uSkyC: { value: new THREE.Color(0xffb38a) }, uReflect: { value: 1 } }),
        vertexShader: "uniform mat4 uMirror; varying vec3 vWorld; varying vec4 vRefl; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vRefl = uMirror * w; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: `${GLSL_FOG_PARS}
          uniform sampler2D tReflect; uniform float uTime; uniform float uScroll; uniform vec3 uDeep; uniform vec3 uSkyC; uniform float uReflect;
          varying vec3 vWorld; varying vec4 vRefl; varying float vDepth;
          void main(){
            if (abs(vWorld.x) < 16.5) discard; // the causeway
            vec2 p = vec2(vWorld.x, vWorld.z - uScroll);
            float w = sin(p.x * 0.35 + uTime * 0.9) * 0.5 + sin(p.y * 0.22 - uTime * 0.7 + p.x * 0.12) * 0.5;
            float w2 = sin(p.x * 1.7 - uTime * 1.6 + p.y * 0.9) * sin(p.y * 1.3 + uTime * 1.1);
            vec3 V = normalize(cameraPosition - vWorld);
            float fres = 0.1 + 0.9 * pow(1.0 - clamp(V.y, 0.0, 1.0), 4.0);
            vec2 uv = vRefl.xy / vRefl.w + vec2(w * 0.006 + w2 * 0.003, w2 * 0.004);
            vec3 refl = uReflect > 0.5 ? texture2D(tReflect, uv).rgb : uSkyC * 0.55;
            vec3 col = mix(uDeep * (0.75 + 0.25 * w), refl * 0.95 + uSkyC * 0.1, fres);
            col += uSkyC * pow(max(w2, 0.0), 6.0) * 0.6 * fres;
            float shore = 1.0 - smoothstep(16.5, 19.5, abs(vWorld.x));
            col += vec3(0.9, 1.0, 1.0) * shore * (0.25 + 0.25 * sin(p.y * 0.8 + uTime * 1.4 + abs(p.x) * 2.0));
            gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
          }`,
      }));
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, 0.04, -440);
      sea.scale.set(1400, 940, 1);
      sea.frustumCulled = false;
      g.mirror.receivers.push(sea);
      this.sea = sea;
      // far off: a lighthouse that sweeps its beam, and a big wheel turning on the pier
      const far = new THREE.Group();
      const fb = new RacerBatch();
      for (let i = 0; i < 5; i++) fb.add(CYL, racerM(-170, 5 + i * 9, -330, 5 - i * 0.6, 9, 5 - i * 0.6), i % 2 ? 0xd8dde4 : 0xb84a4a, 0.55);
      fb.add(CYL, racerM(-170, 49, -330, 3.2, 4, 3.2), 0xfff0d2, 3);
      fb.add(BOX, racerM(-170, -2, -330, 60, 6, 30), 0x2a323c, 0.6);
      const farMesh = new THREE.Mesh(fb.build("color"), this.glowMat);
      this.beam = racerShaft(0xfff0d2, 2, 26, 260, 10);
      this.beam.position.set(-170, 49, -330);
      const wheel = new THREE.Group();
      const wb = new RacerBatch();
      const tor = new THREE.TorusGeometry(30, 0.6, 5, 28);
      wb.add(tor, null, 0xff3ad4, 2.2); tor.dispose();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; wb.add(BOX, racerM(Math.cos(a) * 15, Math.sin(a) * 15, 0, 30, 0.3, 0.3, 0, 0, a), 0x35efff, 1.5); wb.add(BOX, racerM(Math.cos(a) * 30, Math.sin(a) * 30, 0, 2.6, 2.6, 2.6), i % 2 ? 0xffd23d : 0x5dffb0, 2.4); }
      wheel.add(new THREE.Mesh(wb.build("color"), this.glowMat));
      wheel.position.set(190, 34, -345);
      this.wheel = wheel;
      far.add(farMesh, this.beam, wheel);
      far.traverse((o) => { if (o.material && o.material.fog !== undefined && o !== this.beam) o.frustumCulled = false; });
      set("coast", mesh(b), adMesh(ads, false), sea, far);
    }

    // ---- desert: mesas, an arch of rock over the road, cacti, a gas station
    {
      const b = mk(), ads = [];
      const mesa = (x, z, w, h, d) => { const aZ = z - d; loft(b, [[0, w, d, w * 0.25], [h * 0.58, w * 0.8, d * 0.8, w * 0.22]], x, z, 0x8f4a28, aZ); loft(b, [[h * 0.58, w * 0.66, d * 0.66, w * 0.2], [h, w * 0.56, d * 0.56, w * 0.16]], x, z, 0xb5683a, aZ); put(b, BOX, x, h * 0.58, z, w * 1.66, 0.5, d * 1.66, 0xd89a62, aZ); };
      [[-34, -30, 9, 20, 8], [40, -64, 12, 30, 10], [-58, -110, 14, 38, 12], [30, -150, 8, 16, 7], [-30, -196, 10, 26, 9], [56, -226, 13, 34, 11], [-78, -60, 12, 24, 10], [84, -130, 12, 28, 10]].forEach((m) => mesa(...m));
      { // the arch
        const z = -152, aZ = z - 4;
        for (const sd of [-1, 1]) loft(b, [[0, 2.6, 2.2, 0.7], [7, 2.0, 1.9, 0.6], [13, 2.6, 2.1, 0.7]], sd * 13.6, z, 0xa55a30, aZ);
        for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI, x = Math.cos(a) * 13.4, y = 13 + Math.sin(a) * 4.6; put(b, BOX, x, y, z, 5.4, 2.6 + (i % 2) * 0.5, 3.6, i % 2 ? 0xb5683a : 0x9a5230, aZ, 0, 1, 0, 0, a + Math.PI / 2 + Math.PI / 2); }
      }
      for (let i = 0; i < 14; i++) {
        const sd = i % 2 ? 1 : -1, x = sd * rand(10.8, 19), z = -6 - i * 17.8 + rand(-4, 4), h = rand(3.8, 6.4), aZ = z - 2;
        put(b, CYL, x, h / 2, z, 0.42, h, 0.42, 0x2f7040, aZ);
        [[1, 0.55], [-1, 0.38]].forEach(([s, f]) => { put(b, CYL, x + s * 0.7, h * f, z, 0.26, 1.2, 0.26, 0x2f7040, aZ, 0, 1, 0, 0, Math.PI / 2); put(b, CYL, x + s * 1.2, h * f + 0.8, z, 0.26, 1.8, 0.26, 0x377a48, aZ); });
      }
      for (let i = 0; i < 8; i++) {
        const z = -i * 32, aZ = z - 32, x = -10.6;
        put(b, CYL, x, 4, z, 0.14, 8, 0.14, 0x5a4630, aZ); put(b, BOX, x, 7.4, z, 2.2, 0.14, 0.14, 0x5a4630, aZ);
        [-0.9, 0, 0.9].forEach((dx) => { for (let k = 0; k < 4; k++) { const s0 = Math.sin((k / 4) * Math.PI) * 0.7, s1 = Math.sin(((k + 1) / 4) * Math.PI) * 0.7; strut(b, [x + dx, 7.5 - s0, z - k * 8], [x + dx, 7.5 - s1, z - (k + 1) * 8], 0.035, 0x15171c, aZ); } });
      }
      { // a gas station under a lit canopy
        const z = -88, aZ = z - 5, x = 15.4;
        put(b, BOX, x, 5.2, z, 9, 0.5, 7, 0xe8e0d0, aZ); put(b, BOX, x, 4.92, z, 8.4, 0.08, 6.4, 0xfff0d2, aZ, 2, 1.3);
        put(b, BOX, x, 5.2, z, 9.2, 0.16, 7.2, 0xff7a2a, aZ, 1, 2.2);
        [[-3.6, -2.8], [3.6, -2.8], [-3.6, 2.8], [3.6, 2.8]].forEach(([dx, dz]) => put(b, BOX, x + dx, 2.5, z + dz, 0.3, 5, 0.3, 0x8a8f98, aZ));
        [-1.6, 1.6].forEach((dz) => { put(b, BOX, x - 1.5, 0.9, z + dz, 0.7, 1.7, 0.5, 0xc0392b, aZ); put(b, BOX, x - 1.86, 1.4, z + dz, 0.04, 0.4, 0.34, 0x9fffd0, aZ, 2, 1.8); });
        put(b, BOX, x + 4.4, 1.7, z, 3.4, 3.4, 6, 0xcfc6b6, aZ); put(b, BOX, x + 2.66, 1.9, z, 0.06, 1.3, 4.6, 0xffe2a8, aZ, 2, 1.4);
        put(b, BOX, x - 5.2, 5, z + 3.4, 0.3, 10, 0.3, 0x8a8f98, aZ); put(b, BOX, x - 5.2, 10.6, z + 3.4, 2.6, 2.6, 0.3, 0x16181d, aZ);
        [[0, 0.7, 1.7, 0.16, 0], [-0.5, -0.1, 1.2, 0.16, 0.9], [0.5, -0.1, 1.2, 0.16, -0.9]].forEach(([dx, dy, w, h, r]) => put(b, BOX, x - 5.2 + dx, 10.6 + dy, z + 3.58, w, h, 0.06, 0xffd23d, aZ, 1, 2.6, 0, 0, r));
      }
      { // a motel sign: an arrow of lamps
        const z = -206, aZ = z - 2, x = -14;
        put(b, BOX, x, 4.5, z, 0.3, 9, 0.3, 0x8a8f98, aZ); put(b, BOX, x, 9.8, z, 4.4, 2.0, 0.3, 0x16181d, aZ);
        [[0, 0.86, 4.2, 0.12], [0, -0.86, 4.2, 0.12], [2.1, 0, 0.12, 1.8], [-2.1, 0, 0.12, 1.8]].forEach(([dx, dy, w, h]) => put(b, BOX, x + dx, 9.8 + dy, z + 0.18, w, h, 0.06, 0xff3ad4, aZ, 1, 2.6));
        for (let i = 0; i < 7; i++) put(b, BOX, x + 2.2 - i * 0.55, 7.6 - Math.abs(i - 5) * 0 - (i > 4 ? 0 : 0), z + 0.2, 0.22, 0.22, 0.06, 0xffd23d, aZ, 2, 2.4);
        [[-1.4, 8.0], [-1.4, 7.2], [-1.75, 7.6]].forEach(([dx, y]) => put(b, BOX, x + dx, y, z + 0.2, 0.22, 0.22, 0.06, 0xffd23d, aZ, 2, 2.4));
      }
      [[-46, -84], [50, -186]].forEach(([x, z]) => { const aZ = z - 2; put(b, CYL, x, 17, z, 0.5, 34, 0.5, 0x5a626c, aZ, 0, 1); put(b, CYL, x, 5, z, 1.4, 10, 1.4, 0x4a525c, aZ); [34, 24, 14].forEach((y) => put(b, BOX, x, y, z, 0.6, 0.6, 0.6, 0xff3030, aZ, 2, 3)); });
      for (let i = 0; i < 9; i++) { const sd = i % 2 ? 1 : -1, z = -12 - i * 27; put(b, ICO, sd * rand(13, 36), -0.5, z, rand(6, 11), rand(1.3, 2.2), rand(5, 9), 0xa87848, z - 9); }
      put(b, BOX, 11.6, 0.6, -34, 1.8, 0.7, 4, 0x7a3b22, -38, 0, 1, 0.05, 0.4, 0.18); put(b, BOX, 11.6, 1.2, -33.6, 1.5, 0.5, 1.8, 0x5a2c1a, -38, 0, 1, 0.05, 0.4, 0.18);
      billboard(b, ads, -13, -52); billboard(b, ads, 13.4, -230);
      set("desert", mesh(b), adMesh(ads, false));
    }

    // ---- mountain pass: a cliff on the right, pines and a drop on the left, a gallery
    {
      const b = mk(), ads = [];
      guard(b, -9.7, 0xb8c2cc);
      for (let i = 0; i < 16; i++) {
        const z = -i * 16 - 8, aZ = z - 8, w = rand(5, 8), h = rand(22, 44), c = i % 2 ? 0x363c4a : 0x2a303c;
        loft(b, [[0, w, 8.4, 1.6], [h * 0.6, w * 0.86, 8.0, 1.8], [h, w * 0.6, 6.5, 1.5]], 10.3 + w, z, c, aZ);
        put(b, BOX, 10.3 + w, h + 0.3, z, w * 1.1, 0.7, 12, 0xe8f0ff, aZ);
        if (i % 3 === 0) put(b, BOX, 10.6, rand(4, 9), z, 0.5, 0.5, 7, 0xe8f0ff, aZ);
      }
      const pine = (x, y, z, h) => { const aZ = z - 2; put(b, CYL, x, y + h * 0.12, z, 0.2, h * 0.24, 0.2, 0x4a3524, aZ); for (let k = 0; k < 3; k++) put(b, CONE, x, y + h * (0.36 + k * 0.24), z, h * (0.3 - k * 0.07), h * 0.36, h * (0.3 - k * 0.07), k % 2 ? 0x1d4a36 : 0x245a40, aZ); put(b, CONE, x, y + h * 0.98, z, h * 0.07, h * 0.12, h * 0.07, 0xe8f0ff, aZ); };
      for (let i = 0; i < 26; i++) pine(-rand(11, 40), 0, -4 - i * 9.6 + rand(-3, 3), rand(5, 9.5));
      for (let i = 0; i < 9; i++) { const z = -10 - i * 27; put(b, ICO, -rand(11, 26), 0.2, z, rand(1, 2.4), rand(0.8, 1.6), rand(1, 2.2), 0x4a5262, z - 3); }
      { // an avalanche gallery: a roof over the road on a row of columns
        const aZ = -146;
        put(b, BOX, 0.3, 9.1, -121, 20.6, 0.7, 48, 0x565c66, aZ);
        for (let i = 0; i < 7; i++) { put(b, BOX, -9.95, 4.4, -98 - i * 7.6, 0.8, 8.8, 0.8, 0x6a707a, aZ); put(b, BOX, 0.3, 8.6, -98 - i * 7.6, 20.4, 0.5, 0.6, 0x4a4f58, aZ); }
        [-3.2, 3.2].forEach((x) => { for (let i = 0; i < 6; i++) put(b, BOX, x, 8.7, -101 - i * 7.6, 0.3, 0.1, 3.4, 0xffd9a0, aZ, 2, 2.2); });
        put(b, BOX, 0.3, 9.6, -121, 21, 0.3, 48.4, 0xe8f0ff, aZ);
      }
      for (let i = 0; i < 5; i++) { const z = -28 - i * 8, aZ = z - 1; put(b, BOX, 9.6, 1.0, z, 0.12, 2, 0.12, 0x8a8f98, aZ); put(b, BOX, 9.55, 2.3, z, 0.1, 1.0, 1.0, 0x15171c, aZ); [0.55, -0.55].forEach((r) => put(b, BOX, 9.48, 2.3 + r * 0.2, z, 0.05, 0.14, 0.62, 0xffa53d, aZ, 1, 2.4, r * 1.4)); }
      { // a cabin with its lamps lit
        const z = -60, aZ = z - 4, x = -21;
        put(b, BOX, x, 1.6, z, 6, 3.2, 5, 0x6a4a34, aZ);
        [-1, 1].forEach((s) => put(b, BOX, x, 4.1, z + s * 1.4, 6.6, 0.3, 3.6, 0xe8f0ff, aZ, 0, 1, s * 0.6));
        [-1.6, 1.6].forEach((dx) => put(b, BOX, x + dx, 1.8, z + 2.52, 1.0, 1.0, 0.05, 0xffd9a0, aZ, 2, 2));
        put(b, BOX, x + 2, 5, z - 1, 0.7, 2.4, 0.7, 0x4a3a30, aZ);
      }
      { // a cable car over the pass
        const z = -188, aZ = z - 2;
        for (const sd of [-1, 1]) { put(b, BOX, sd * 26, 13, z, 0.8, 26, 0.8, 0x6a707a, aZ); put(b, BOX, sd * 26, 26.2, z, 3, 0.5, 1.2, 0x6a707a, aZ); }
        strut(b, [-26, 26, z], [26, 26, z], 0.1, 0x15171c, aZ);
        [-9, 8].forEach((x) => { put(b, BOX, x, 25, z, 0.1, 1.9, 0.1, 0x15171c, aZ); put(b, BOX, x, 22.9, z, 2.2, 2.3, 2.0, 0xc0392b, aZ); put(b, BOX, x, 23.3, z + 1.02, 1.8, 0.9, 0.05, 0xffe2a8, aZ, 2, 1.8); });
      }
      for (let i = 0; i < 6; i++) { const z = -202 - i * 7.6, aZ = -248; for (const sd of [-1, 1]) { put(b, BOX, sd * 9.85, 0.6, z, 0.5, 1.2, 7.6, 0x6a6e78, aZ); if (i % 2 === 0) { put(b, BOX, sd * 9.85, 1.9, z, 0.6, 1.4, 0.6, 0x7a7e88, aZ); put(b, BOX, sd * 9.85, 2.8, z, 0.34, 0.4, 0.34, 0xffd9a0, aZ, 2, 2.6); } } }
      put(b, CYL, 26, 50, -80, 0.3, 14, 0.3, 0x8a8f98, -82); put(b, BOX, 26, 57.2, -80, 0.6, 0.6, 0.6, 0xff3030, -82, 2, 3);
      billboard(b, ads, -13.4, -160, 7, 8, 4);
      set("mountain", mesh(b), adMesh(ads, false));
    }

    // ---- tunnel: tiled walls, ribs, lines of light, fans, a way out every so often
    {
      const b = mk();
      for (let i = 0; i < 16; i++) {
        const z = -i * 16 - 8, aZ = z - 8;
        for (const sd of [-1, 1]) {
          put(b, BOX, sd * 9.9, 4.3, z, 0.5, 8.6, 16, 0x2a2c30, aZ);
          put(b, BOX, sd * 9.62, 1.1, z, 0.08, 2.2, 16, 0x5a606a, aZ);
          put(b, BOX, sd * 9.56, 2.3, z, 0.05, 0.1, 16, sd < 0 ? 0x35efff : 0xff3ad4, aZ, 1, 2.0);
          put(b, BOX, sd * 9.4, 6.6, z, 0.5, 0.14, 16, 0x3a3d44, aZ);
          put(b, BOX, sd * 6.2, 8.26, z, 0.4, 0.1, 16, 0xffd9a0, aZ, 2, 2.4);
          put(b, BOX, sd * 9.5, 4.3, z - 7.7, 0.7, 8.6, 0.6, 0x3a3d44, aZ);
        }
        put(b, BOX, 0, 8.75, z, 20.4, 0.5, 16, 0x202226, aZ);
        put(b, BOX, 0, 8.3, z - 7.7, 20, 0.6, 0.6, 0x3a3d44, aZ);
        if (i % 3 === 1) [-3.4, 3.4].forEach((x) => { put(b, CYL, x, 7.5, z, 0.75, 3.2, 0.75, 0x4a4f58, aZ, 0, 1, Math.PI / 2); put(b, CYL, x, 7.5, z + 1.62, 0.6, 0.06, 0.6, 0x35efff, aZ, 1, 1.4, Math.PI / 2); });
        if (i % 4 === 2) { put(b, BOX, 9.6, 1.3, z, 0.1, 2.4, 1.3, 0x2c6a44, aZ); put(b, BOX, 9.56, 2.9, z, 0.08, 0.5, 1.5, 0x5dffb0, aZ, 2, 2.4); put(b, BOX, -9.6, 1.5, z + 3, 0.2, 0.8, 0.6, 0xff7a2a, aZ, 1, 1.5); }
      }
      set("tunnel", mesh(b));
    }
    [BOX, CYL, CONE, ICO].forEach((ge) => ge.dispose());

    // ---- floating dust, sand, snow or embers, in whatever the biome's air carries
    this.motes = makeMotes({ count: 150, box: [44, 14, 70], center: [0, 6, -28], color: 0xffffff, size: 0.16, k: 1.2 });
    this.motes.layers.set(1);
    g.scene.add(this.motes);
    g.decor(this.motes);
    // ---- the fog bank a change of biome hides behind
    this.curtain = new THREE.Mesh(new THREE.PlaneGeometry(900, 500), new THREE.MeshBasicMaterial({ color: 0x8090a0, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.curtain.position.set(0, 60, -36);
    this.curtain.renderOrder = 4;
    this.curtain.visible = false;
    this.curtain.layers.set(1);
    g.scene.add(this.curtain);
  }
  setBiome(name) {
    const g = this.g;
    this.biome = name;
    for (const k in this.sets) this.sets[k].visible = k === name;
    const dt = name === "downtown";
    [g.walls, g.cityDetail, g.signs, g.steam, g.towers, g.orrery].forEach((o) => { if (o) o.visible = dt; });
    if (g.city) g.city.visible = dt || name === "coast";
    const open = name !== "tunnel";
    [g.props, g.halos, g.cones, g.sun, g.ridgeFar, g.ridgeNear].forEach((o) => { if (o) o.visible = open; });
    const ry = RACER_BIOME_PAL[name].ridge || 1;
    g.ridgeFar.scale.y = ry; g.ridgeNear.scale.y = ry;
  }

  // ===== events ====================================================================
  buildEvents() {
    const g = this.g, s = g.scene;
    const D = (this.director = new EventDirector(g));
    const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
    const basic = (b) => { const m = new THREE.Mesh(b.build("color"), this.glowMat); m.frustumCulled = false; m.visible = false; return m; };
    const hide = (...o) => o.forEach((x) => { x.visible = false; });
    const open = () => this.biome !== "tunnel";
    const fade = (t, dur, a = 0.6, b = 0.8) => smoothstep(0, a, t) * (1 - smoothstep(dur - b, dur, t));

    // -- 1. meteor shower: streaks across the sky
    const mg = new THREE.PlaneGeometry(1, 1);
    this.meteors = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xffffff, map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 })); m.visible = false; m.layers.set(1); s.add(m); return m; });
    D.add({ id: "meteors", dur: 5, can: () => open() && g.skyP > 0.45,
      start: (r) => { r.m = this.meteors.map((m, i) => ({ m, t0: i * 0.45 + rand(0, 0.3), x: rand(-260, 200), y: rand(120, 200), vx: rand(70, 130), vy: -rand(36, 60), col: Math.random() < 0.5 ? 0xbfe8ff : 0xffe2b0 })); },
      update: (dt, t, r) => { for (const o of r.m) { const k = (t - o.t0) / 1.3; o.m.visible = k > 0 && k < 1; if (!o.m.visible) continue; o.m.position.set(o.x + o.vx * k * 1.3, o.y + o.vy * k * 1.3, -420); o.m.rotation.z = Math.atan2(o.vy, o.vx); o.m.scale.set(46, 2.4, 1); o.m.material.color.set(o.col).multiplyScalar(2.2); o.m.material.opacity = Math.sin(k * Math.PI); } },
      end: () => hide(...this.meteors) });

    // -- 2. fireworks over the skyline (also the answer to a right answer)
    D.add({ id: "fireworks", big: true, dur: 3.2, can: open,
      start: (r) => { r.n = 0; r.next = 0; r.max = r.arg && r.arg.n ? r.arg.n : 5; },
      update: (dt, t, r) => {
        if (r.n < r.max && t >= r.next) {
          r.n++; r.next = t + rand(0.42, 0.6); // never more than two or three bursts a second
          const p = new THREE.Vector3(rand(-150, 150), rand(70, 135), -300), col = [COLORS.magenta, COLORS.cyan, COLORS.yellow, COLORS.lime, COLORS.orange, 0xffffff][Math.floor(Math.random() * 6)];
          g.bursts.burst(p, col, { n: 64, speed: 34, size: 3.4, life: 1.7, gravity: -9 });
          g.bursts.burst(p, 0xffffff, { n: 18, speed: 16, size: 2.2, life: 0.9, gravity: -5 });
        }
      } });

    // -- 3. lightning: one bolt, one flash of sky
    const lpos = new Float32Array(14 * 18);
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3).setUsage(THREE.DynamicDrawUsage));
    this.bolt = new THREE.Mesh(lgeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.bolt.frustumCulled = false; this.bolt.visible = false; this.bolt.layers.set(1);
    s.add(this.bolt);
    D.add({ id: "lightning", big: true, flashy: true, dur: 1.4, can: () => open() && this.pal.rain > 0.5,
      start: () => {
        let x = rand(-220, 220), y = 230;
        for (let i = 0; i < 14; i++) {
          const nx = x + rand(-22, 22), ny = y - 14, w = 1.6 - i * 0.07, o = i * 18;
          [[x - w, y], [x + w, y], [nx + w, ny], [x - w, y], [nx + w, ny], [nx - w, ny]].forEach(([px, py], k) => { lpos[o + k * 3] = px; lpos[o + k * 3 + 1] = py; lpos[o + k * 3 + 2] = -430; });
          x = nx; y = ny;
        }
        lgeo.attributes.position.needsUpdate = true;
        this.bolt.visible = true;
      },
      update: (dt, t) => { const k = 1 - smoothstep(0.05, 0.5, t); this.bolt.material.color.setRGB(3.5 * k, 3.7 * k, 4.2 * k); this.skyFlash = Math.max(this.skyFlash || 0, k * 0.9); this.bolt.visible = k > 0.01; },
      end: () => hide(this.bolt) });

    // -- 4. a distant explosion: a flash on the horizon, a ring across the ground, then the shock arrives
    this.blast = glowSprite(neon(0xffb86a, 2.4), 10, 0);
    this.blast.visible = false; this.blast.layers.set(1);
    this.blastRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.blastRing.rotation.x = -Math.PI / 2; this.blastRing.visible = false; this.blastRing.layers.set(1);
    s.add(this.blast, this.blastRing);
    D.add({ id: "explosion", big: true, flashy: true, dur: 2.6, can: open,
      start: (r) => { r.p = new THREE.Vector3(rand(-150, 150), 14, -290); r.hit = false; this.blast.position.copy(r.p); this.blastRing.position.set(r.p.x, 0.3, r.p.z); this.blast.visible = this.blastRing.visible = true; g.bursts.burst(r.p, COLORS.orange, { n: 50, speed: 22, size: 4, life: 1.6, gravity: 3 }); },
      update: (dt, t, r) => {
        this.blast.scale.setScalar(30 + t * 70); this.blast.material.opacity = Math.max(0, 1 - t / 1.1);
        const k = t / 2.2; this.blastRing.scale.setScalar(1 + k * 330); this.blastRing.material.opacity = Math.max(0, 1 - k) * 0.8;
        if (!r.hit && t > 1.5) { r.hit = true; GFX.ripple(g.camera, new THREE.Vector3(r.p.x * 0.2, 2, -30), 0.5, 0.8); g.shake(0.16); }
      },
      end: () => hide(this.blast, this.blastRing) });

    // -- 5. a UFO: slides in, hangs with its beam down, and is gone
    { const b = new RacerBatch(), V = (r, y) => new THREE.Vector2(r, y);
      const hull = new THREE.LatheGeometry([V(0.2, -1.2), V(7, -0.2), V(9, 0.5), V(5, 1.4), V(3.4, 1.5)], 16);
      b.add(hull, null, 0x2a3140); hull.dispose();
      const dome = new THREE.SphereGeometry(3.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      b.add(dome, racerM(0, 1.4, 0), 0x9fe8ff, 0.8); dome.dispose();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.add(BOX, racerM(Math.cos(a) * 8.2, 0.3, Math.sin(a) * 8.2, 0.9, 0.5, 0.9), [0x5dffb0, 0xff3ad4, 0xffd23d][i % 3], 2.6); }
      this.ufo = new THREE.Group(); this.ufoBody = basic(b); this.ufoBody.visible = true;
      this.ufoBeam = racerShaft(0x8fffe0, 1.6, 11, 60, 14); this.ufoBeam.rotation.x = Math.PI;
      this.ufo.add(this.ufoBody, this.ufoBeam); this.ufo.visible = false; s.add(this.ufo); }
    D.add({ id: "ufo", dur: 9, can: open,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; r.x = rand(18, 70) * r.sd; this.ufo.visible = true; },
      update: (dt, t, r) => {
        const inn = smoothstep(0, 2.2, t), out = smoothstep(7, 9, t);
        this.ufo.position.set(lerp(-r.sd * 320, r.x, inn) + out * r.sd * 420 + Math.sin(t * 1.3) * 3, lerp(160, 62, inn) + out * 180 + Math.sin(t * 2.1) * 1.5, -230);
        this.ufoBody.rotation.y = t * 1.6; this.ufo.rotation.z = Math.sin(t * 1.3) * 0.08 - out * r.sd * 0.5;
        this.ufoBeam.material.uniforms.uI.value = 0.55 * smoothstep(2.4, 3.2, t) * (1 - smoothstep(6.2, 6.9, t)) * (1 - 0.4 * this.calmK);
      },
      end: () => hide(this.ufo) });

    // -- 6. a neon blimp with an ad on its flank, crossing the whole sky
    { const b = new RacerBatch();
      const hull = new THREE.IcosahedronGeometry(1, 2); b.add(hull, racerM(0, 0, 0, 34, 10, 10), 0x1c2230); hull.dispose();
      b.add(BOX, racerM(0, -10.5, 0, 9, 3, 4), 0x2a3140); b.add(BOX, racerM(0, -10.4, 2.05, 7, 1.2, 0.1), 0xffe2a8, 2);
      [[-30, 5, 0], [-30, -5, 0], [-30, 0, 5], [-30, 0, -5]].forEach(([x, y, z]) => b.add(BOX, racerM(x, y, z, 10, y ? 7 : 0.6, z ? 7 : 0.6), 0x2a3140));
      for (let i = 0; i < 9; i++) b.add(BOX, racerM(-28 + i * 7, -9.2 + Math.abs(i - 4) * 1.35, 9.4 - Math.abs(i - 4) * 1.5, 1, 1, 1), i % 2 ? 0xff3ad4 : 0x35efff, 2.6);
      b.add(BOX, racerM(34.5, 0, 0, 1.2, 1.2, 1.2), 0xff3030, 3);
      this.blimp = new THREE.Group(); const body = basic(b); body.visible = true;
      const ge = new THREE.PlaneGeometry(30, 9); ge.setAttribute("aZ", new THREE.Float32BufferAttribute(new Float32Array(4), 1)); ge.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Float32Array(4).fill(0.37), 1));
      const ad = new THREE.Mesh(ge, racerAdMaterial(g.shared, RacerGame.adTex, false, false)); ad.position.set(0, 0.5, 10.1);
      this.blimp.add(body, ad); this.blimp.visible = false; s.add(this.blimp); }
    D.add({ id: "blimp", dur: 30, can: open,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; r.y = rand(85, 125); this.blimp.visible = true; this.blimp.rotation.y = r.sd > 0 ? 0 : 0; },
      update: (dt, t, r) => { this.blimp.position.set(r.sd * (-330 + t * 22), r.y + Math.sin(t * 0.5) * 2, -360); this.blimp.scale.x = r.sd; },
      end: () => hide(this.blimp) });

    // -- 7. a helicopter sweeping a searchlight over the road
    { const b = new RacerBatch();
      const hull = new THREE.IcosahedronGeometry(1, 1); b.add(hull, racerM(0, 0, 0, 2.4, 1.5, 1.4), 0x20262e); hull.dispose();
      b.add(BOX, racerM(-3.4, 0.3, 0, 4.6, 0.36, 0.36), 0x20262e); b.add(BOX, racerM(-5.6, 1.0, 0, 0.5, 1.6, 0.12), 0x20262e);
      b.add(BOX, racerM(1.2, 0.2, 0, 1.2, 0.8, 1.2), 0x8fd8ff, 0.5);
      [-0.8, 0.8].forEach((z) => { b.add(BOX, racerM(0, -1.7, z, 3.4, 0.1, 0.1), 0x3a3f48); [-1, 1].forEach((x) => b.add(BOX, racerM(x, -1.25, z * 0.9, 0.08, 0.9, 0.08), 0x3a3f48)); });
      b.add(BOX, racerM(0, 0.2, 1.42, 0.3, 0.3, 0.1), 0x30ff60, 3); b.add(BOX, racerM(0, 0.2, -1.42, 0.3, 0.3, 0.1), 0xff3030, 3); b.add(BOX, racerM(-5.7, 1.9, 0, 0.26, 0.26, 0.26), 0xffffff, 3);
      b.add(CYL, racerM(1.9, -0.9, 0, 0.36, 0.5, 0.36), 0xfff0d2, 3);
      this.heli = new THREE.Group(); const body = basic(b); body.visible = true;
      this.rotor = new THREE.Mesh(new THREE.CircleGeometry(4.6, 18), new THREE.MeshBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
      this.rotor.rotation.x = -Math.PI / 2; this.rotor.position.y = 1.7;
      const blades = new RacerBatch(); [0, Math.PI / 2].forEach((a) => blades.add(BOX, racerM(0, 1.72, 0, 9.2, 0.05, 0.3, 0, a), 0x15171c));
      this.blades = basic(blades); this.blades.visible = true;
      this.heliBeam = racerShaft(0xfff0d2, 0.4, 7, 46, 12); this.heliBeam.position.set(1.9, -1.0, 0);
      this.heli.add(body, this.rotor, this.blades, this.heliBeam); this.heli.visible = false; s.add(this.heli); }
    D.add({ id: "helicopter", dur: 10, can: open,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; r.y = rand(24, 32); r.z = rand(-120, -70); this.heli.visible = true; },
      update: (dt, t, r) => {
        const x = r.sd * (-70 + t * 14);
        this.heli.position.set(x, r.y + Math.sin(t * 1.1) * 0.8, r.z);
        this.heli.rotation.set(0, r.sd > 0 ? 0 : Math.PI, r.sd * -0.12);
        this.blades.rotation.y = t * 14;
        this.heliBeam.rotation.set(Math.PI + Math.sin(t * 0.8) * 0.3, 0, -0.5 + Math.sin(t * 0.55) * 0.3);
        this.heliBeam.material.uniforms.uI.value = 0.42 * fade(t, 10) * (1 - 0.45 * this.calmK) * (GFX.opt.beams ? 1 : 0);
      },
      end: () => hide(this.heli) });

    // -- 8. delivery drones in a line, each with a parcel and a winking light
    { const b = new RacerBatch();
      b.add(BOX, racerM(0, 0, 0, 0.9, 0.22, 0.9), 0x20262e); b.add(BOX, racerM(0, -0.5, 0, 0.7, 0.6, 0.7), 0xb8874a);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { b.add(BOX, racerM(i * 0.6, 0.05, j * 0.6, 0.6, 0.06, 0.08, 0, Math.PI / 4 * i * j), 0x3a3f48); b.add(CYL, racerM(i * 0.85, 0.16, j * 0.85, 0.42, 0.02, 0.42), 0x8fd8ff, 0.55); });
      b.add(BOX, racerM(0, 0.16, 0.5, 0.14, 0.14, 0.14), 0x5dffb0, 3); b.add(BOX, racerM(0, 0.16, -0.5, 0.14, 0.14, 0.14), 0xff3030, 3);
      const ge = b.build("color");
      this.drones = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(ge, this.glowMat); m.visible = false; m.frustumCulled = false; s.add(m); return m; }); }
    D.add({ id: "drones", dur: 8, can: open,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; r.y = rand(10.5, 14); r.z = rand(-60, -34); },
      update: (dt, t, r) => this.drones.forEach((m, i) => { const x = r.sd * (-34 + (t - i * 0.5) * 9); m.visible = Math.abs(x) < 34; m.position.set(x, r.y + Math.sin(t * 2.4 + i) * 0.35 + i * 0.3, r.z - i * 1.6); m.rotation.set(0, r.sd > 0 ? Math.PI / 2 : -Math.PI / 2, Math.sin(t * 2 + i) * 0.08); m.scale.setScalar(1.25); }),
      end: () => hide(...this.drones) });

    // -- 9. a laser show from the rooftops
    this.lasers = [0xff3ad4, 0x35efff, 0x5dffb0, 0xffd23d].map((c, i) => { const l = racerShaft(c, 0.25, 1.4, 240, 6); l.position.set((i - 1.5) * 38, 26, -220 - (i % 2) * 40); l.visible = false; s.add(l); return l; });
    D.add({ id: "lasers", dur: 8, can: () => open() && this.biome !== "desert" && this.biome !== "mountain",
      start: () => this.lasers.forEach((l) => { l.visible = true; }),
      update: (dt, t) => this.lasers.forEach((l, i) => { l.rotation.set(-0.5 + Math.sin(t * 0.7 + i * 1.7) * 0.4, 0, Math.sin(t * 0.9 + i * 2.3) * 0.9); l.material.uniforms.uI.value = 0.75 * fade(t, 8) * (1 - 0.5 * this.calmK) * (GFX.opt.beams ? 1 : 0); }),
      end: () => hide(...this.lasers) });

    // -- 10. birds crossing in a loose V
    { const pos = [], wing = [], seed = [];
      for (let i = 0; i < 11; i++) { const bx = -Math.abs(i - 5) * 3 + rand(-1, 1), bz = (i - 5) * 3.4, by = rand(-1.5, 1.5);
        [[0, 0, 0, 0], [-1.2, 0, 2.0, 1], [0.9, 0, 0, 0], [0, 0, 0, 0], [0.9, 0, 0, 0], [-1.2, 0, -2.0, 1]].forEach(([x, y, z, w]) => { pos.push(bx + x, by + y, bz + z); wing.push(w); seed.push(i * 0.71); }); }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("aWing", new THREE.Float32BufferAttribute(wing, 1)); ge.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
      this.birds = new THREE.Mesh(ge, new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x0a0c12) } }, side: THREE.DoubleSide,
        vertexShader: "attribute float aWing; attribute float aSeed; uniform float uTime; void main(){ vec3 p = position; p.y += aWing * sin(uTime * 7.0 + aSeed * 6.0) * 1.3; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
        fragmentShader: "uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }" }));
      this.birds.frustumCulled = false; this.birds.visible = false; s.add(this.birds); }
    D.add({ id: "birds", dur: 11, can: open,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; r.y = rand(38, 60); r.z = rand(-190, -120); this.birds.visible = true; this.birds.material.uniforms.uColor.value.copy(g.scene.fog.color).multiplyScalar(0.25); },
      update: (dt, t, r) => { this.birds.position.set(r.sd * (-190 + t * 36), r.y + Math.sin(t * 0.6) * 3, r.z); this.birds.rotation.y = r.sd > 0 ? 0 : Math.PI; },
      end: () => hide(this.birds) });

    // -- 11. an elevated train crossing a viaduct ahead: we pass under it
    { const b = new RacerBatch();
      b.add(BOX, racerM(0, 11.4, 0, 150, 0.9, 5.2), 0x2a2f38); b.add(BOX, racerM(0, 12.1, 0, 150, 0.3, 0.5), 0x35efff, 1.6);
      [-9.7, 9.7, -30, 30, -52, 52].forEach((x) => b.add(BOX, racerM(x, 5.5, 0, 1.2, 11, 2.6), 0x343a44));
      [-2.4, 2.4].forEach((z) => b.add(BOX, racerM(0, 12.0, z, 150, 0.9, 0.2), 0x3a4048));
      this.viaduct = new THREE.Group(); const deck = basic(b); deck.visible = true;
      const tb = new RacerBatch();
      for (let i = 0; i < 6; i++) { const x = i * 13.4; tb.add(BOX, racerM(x, 14.2, 0, 12.6, 3.2, 3.4), i ? 0xd8dde4 : 0xc0392b, 0.5); tb.add(BOX, racerM(x, 14.6, 1.72, 11.4, 1.0, 0.06), 0xffe2a8, 1.9); tb.add(BOX, racerM(x, 14.6, -1.72, 11.4, 1.0, 0.06), 0xffe2a8, 1.9); tb.add(BOX, racerM(x, 12.75, 1.72, 12.6, 0.14, 0.06), 0xff3ad4, 2.2); }
      tb.add(BOX, racerM(-6.4, 13.6, 0, 0.1, 0.6, 2.4), 0xfff2d8, 4);
      this.train = basic(tb); this.train.visible = true;
      this.viaduct.add(deck, this.train); this.viaduct.visible = false; s.add(this.viaduct); }
    D.add({ id: "maglev", dur: 20, can: open,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; this.viaduct.position.set(0, 0, -252); this.viaduct.visible = true; },
      update: (dt, t, r) => {
        this.viaduct.position.z += this.step;
        const k = (this.viaduct.position.z + 252) / 262;
        this.train.position.x = -r.sd * (150 - k * 260) - (r.sd > 0 ? 67 : 0); this.train.scale.x = r.sd;
        this.viaduct.children[0].material.fog = true;
        if (this.viaduct.position.z > 16) return false;
      },
      end: () => hide(this.viaduct) });

    // -- 12-16. things traffic does: a near miss, a rival, a chase, a breakdown
    D.add({ id: "near-miss", dur: 9, can: () => g.state !== "ask" || g.lane !== null,
      start: (r) => {
        const n = g.round ? g.round.n : 4, lanes = RACER_GATE_LANES[n] || RACER_GATE_LANES[4];
        const mine = g.carX, x = lanes.slice().sort((a, b2) => Math.abs(a - mine) - Math.abs(b2 - mine))[1];
        r.c = this.spawn(Math.random() < 0.5 ? "sedan" : "bike", "M", { special: "pass", dir: 1, x, tx: x, z: 15, speed: g.speed + 26, y: 0 });
        if (!r.c) return false;
        r.c.plan = (c, dt, sp) => { c.speed = Math.max(c.speed, sp + 24); };
      },
      update: (dt, t, r) => r.c.on && r.c.special === "pass" });
    D.add({ id: "rival", big: true, dur: 12,
      start: (r) => {
        const sd = g.carX > 0 ? -1 : 1;
        r.c = this.spawn("rival", "M", { special: "rival", dir: 1, x: sd * 3.75, tx: sd * 3.75, z: 15, speed: g.speed + 10, y: 0, color: [0xff3ad4, 0xffd23d, 0x35efff][Math.floor(Math.random() * 3)] });
        if (!r.c) return false;
        r.c.plan = (c, dt, sp) => { c.speed = sp + (c.z > -16 ? 10 : c.z > -40 ? 5 : 30); if (c.z < -18 && c.z > -40) c.tx = sd * 1.25; c.brake = c.z < -16 && c.z > -40 ? 1 : 0; };
      },
      update: (dt, t, r) => r.c.on && r.c.special === "rival" });
    D.add({ id: "chase", dur: 9, can: open,
      start: (r) => {
        const x = rand(-4, 4), y = rand(10.5, 13);
        r.a = this.spawn("hover", "H", { special: "run", dir: 1, x, tx: x, y, z: 18, speed: g.speed + 34 });
        r.b = this.spawn("police", "H", { special: "cop", dir: 1, x: x + 0.6, tx: x + 0.6, y: y + 0.4, z: 34, speed: g.speed + 34, color: 0xf2f2f2 });
        if (!r.a || !r.b) { if (r.a) r.a.on = false; if (r.b) r.b.on = false; return false; }
        r.a.plan = (c, dt, sp) => { c.speed = sp + 34; c.tx = x + Math.sin(c.age * 2.2) * 2.6; };
        r.b.plan = (c, dt, sp) => { c.speed = sp + 34; c.tx = x + Math.sin(c.age * 2.2 - 0.7) * 2.6; };
      },
      update: (dt, t, r) => r.b.on && r.b.special === "cop" });
    D.add({ id: "breakdown", dur: 16, can: () => this.biome !== "tunnel",
      start: (r) => {
        r.c = this.spawn(Math.random() < 0.6 ? "sedan" : "truck", "R", { special: "stall", dir: 1, x: 8.7, tx: 8.7, z: -244, speed: 0, hazard: 1 });
        if (!r.c) return false;
      },
      update: (dt, t, r) => r.c.on && r.c.special === "stall" });

    // -- 17. a squall: the rain (or dust, or snow) comes down hard, the road rings with it
    D.add({ id: "squall", dur: 8, can: open, start: () => {}, update: (dt, t) => { this.gust = fade(t, 8, 1.5, 2); }, end: () => { this.gust = 0; } });

    // -- 18. steam bursts from a manhole as we pass
    D.add({ id: "steam-burst", dur: 2.4, can: () => this.biome === "downtown" || this.biome === "tunnel",
      start: (r) => { r.x = (Math.random() < 0.5 ? -1 : 1) * 5.4; r.z = -70; r.n = 0; },
      update: (dt, t, r) => { r.z += this.step; r.n -= dt; if (r.n <= 0 && r.z < 6) { r.n = 0.07; g.bursts.burst(new THREE.Vector3(r.x, 0.4, r.z), 0xdfe8ff, { n: 4, speed: 3.5, size: 0.9, life: 0.8, gravity: 7, spread: 0.4 }); } return r.z < 10; } });

    BOX.dispose(); CYL.dispose();
    this.gust = 0; this.skyFlash = 0; this.step = 0;
  }

  // What the world does when an answer lands (look only).
  onAnswer(ok) {
    if (ok) {
      this.partT = 1.5; // traffic pulls aside for the boost
      if (!GFX.calm) this.director.force("fireworks", { n: 3 });
    } else GFX.glitch(1, 0.4);
  }

  update(dt, sp, step, sky) {
    const g = this.g, P = RACER_BIOME_PAL;
    this.t += dt;
    this.step = step;
    this.calmK += ((g.state === "ask" ? 1 : 0) - this.calmK) * Math.min(1, dt * 2);
    if (g.run.answered !== this.lastAnswered) { this.lastAnswered = g.run.answered; this.onAnswer(g.run.streak > 0); }
    // ---- a change of biome happens inside a bank of fog
    const want = racerBiomeAt(g.year);
    if (want !== this.biome && !this.swap && g.state !== "over") this.swap = { to: want, t: 0, done: false, dark: want === "tunnel" || this.biome === "tunnel" };
    let fogK = 0;
    if (this.swap) {
      const s = this.swap;
      s.t += dt;
      fogK = s.t < 1.2 ? smoothstep(0, 1.1, s.t) : 1 - smoothstep(1.5, 3.2, s.t);
      if (s.t >= 1.2 && !s.done) { s.done = true; this.setBiome(s.to); }
      if (s.t > 3.2) this.swap = null;
    }
    // ---- palette: ease toward this biome's, then lay it over the career sky
    const T = P[this.biome], k = Math.min(1, dt * (this.swap ? 6 : 1.5)), pal = this.pal;
    for (const n of ["fogMix", "horMix", "gridMix", "baseMix", "rain", "wet", "dust", "far", "lamps"]) pal[n] += (T[n] - pal[n]) * k;
    for (const n in this.palC) if (T[n + "Mix"] > 0) this.palC[n].lerp(this._c.set(T[n]), k);
    const fog = g.scene.fog, su = g.sky.material.uniforms, gu = g.groundMat.uniforms;
    fog.color.lerp(this.palC.fog, pal.fogMix);
    g.scene.background.copy(fog.color);
    su.uHorizon.value.lerp(this.palC.hor, pal.horMix);
    su.uMid.value.lerp(this.palC.hor, pal.horMix * 0.35);
    su.uGlow.value += (this.skyFlash || 0) * 3;
    this.skyFlash = Math.max(0, (this.skyFlash || 0) - dt * 3);
    gu.uGrid.value.lerp(this._c.copy(this.palC.grid).multiplyScalar(0.9), pal.gridMix);
    gu.uBase.value.lerp(this.palC.base, pal.baseMix);
    gu.uReflect.value *= GFX.opt.wet ? pal.wet : 0;
    if (gu.uRain) gu.uRain.value = GFX.opt.wet ? clamp(pal.rain * (0.45 + this.gust * 0.9), 0, 1.4) : 0;
    g.shared.uLampI.value *= lerp(1, pal.lamps, 1);
    const curtainCol = this.swap && this.swap.dark ? this._c.set(0x04040a) : this._c.copy(fog.color);
    this.curtain.visible = fogK > 0.01;
    this.curtain.material.opacity = fogK;
    this.curtain.material.color.copy(curtainCol);
    this.curtain.position.x = g.camera.position.x;
    fog.near = lerp(30, 5, fogK);
    fog.far = lerp(pal.far, 40, fogK);
    this.cityFog = lerp(900, 60, fogK);
    // ---- weather
    const ru = g.rain.material.uniforms;
    g.rain.visible = pal.rain > 0.05;
    ru.uColor.value.multiplyScalar(pal.rain * (1 + this.gust * 1.6));
    const mo = this.motes.material.uniforms;
    if (mo.uColor) mo.uColor.value.copy(this.biome === "desert" ? this._c.set(0xffc890) : this.biome === "mountain" ? this._c.set(0xffffff) : this._c.copy(sky.light)).multiplyScalar(0.5 + pal.dust * (0.9 + this.gust * 1.5));
    if (this.motes.userData.drift) this.motes.userData.drift(this.t * (1 + sp * 0.02));
    sky.dust = this.biome === "desert" ? this._c2 || (this._c2 = new THREE.Color(0xd9a066)) : null;
    // ---- far showpieces of the coast
    if (this.sets.coast.visible) {
      this.beam.rotation.set(Math.PI / 2 - 0.06, 0, this.t * 0.35);
      this.beam.material.uniforms.uI.value = GFX.opt.beams ? 0.5 * (0.3 + 0.7 * sky.lamps) : 0;
      this.wheel.rotation.z = this.t * 0.12;
      const sea = this.sea.material.uniforms;
      sea.uSkyC.value.copy(su.uHorizon.value);
      sea.uReflect.value = GFX.lite || !GFX.opt.wet ? 0 : 1;
      sea.uDeep.value.set(0x06323c).lerp(fog.color, 0.25);
    }
    // ---- the sun breathes
    g.sun.userData.disc.material.uniforms.uI.value = sky.sunI * (1 + 0.07 * Math.sin(this.t * 1.1));
    this.updateTraffic(dt, sp, sky);
    this.director.update(dt, g.state === "ask");
  }
}
