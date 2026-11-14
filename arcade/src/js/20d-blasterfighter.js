// Risk Blaster's ship: the player's own space fighter. The model is supplied as a .glb
// (166 rigid parts, one colour texture), converted by scripts/convert-model.js and
// inlined by the build. Look and sound only: the game still owns where the ship is,
// where it aims, and everything that scores.
//   ship: where it is and where it aims (the game drives this)
//   rig:  bank, pitch, recoil, rolls, the fly-in (look only)

const FTR_S = 3.5; // game units per model unit (the model is one unit from wingtip to wingtip)
const FTR_Y = 0.24; // the model stands on y = 0: its middle is this far up
const FTR_TILT = 0.17; // it flies tipped back a little toward the camera behind it, which then sees its painted top and not only its tail
// Where things are on the model, in its own units (its nose points +z; ftrP turns it round).
const FTR = {
  engines: [[0.0558, 0.327, -0.484, 0.0516], [-0.0707, 0.3258, -0.4824, 0.0497]], // the two main nozzles: x, y, z, radius
  thrusters: [[0.4094, 0.2891, -0.3064, 0.0229], [0.4068, 0.2367, -0.295, 0.0205], [-0.4109, 0.2891, -0.2963, 0.0258], [-0.4118, 0.2352, -0.2857, 0.0199]], // two small ones in the tail of each wing pod
  chin: [[0.0786, 0.1023, 0.4494], [-0.0762, 0.1017, 0.4517]], // the cannons under the nose
  pod: [[0.4502, 0.2101, 0.1177], [-0.4531, 0.2123, 0.1277]], // and the one in the front of each wing pod
  tips: [[0.494, 0.2, -0.3], [-0.494, 0.2, -0.3]], // wingtips, where the vapour trails start
  lamps: [[0.497, 0.205, -0.1], [-0.497, 0.205, -0.1]], // navigation lights
  mast: [0, 0.521, -0.26], // the top of the aerial behind the cockpit
  GLASS: 39, // the part that is the canopy's glass
  CAGE: 1, // and the one that is its frame and the cockpit tub (2,000 triangles of thin tube)
};
// a point on the model, in the rig's units: scaled, centred, and turned to fly down the tunnel (-z)
const ftrP = (p, out) => (out || new THREE.Vector3()).set(-p[0] * FTR_S, (p[1] - FTR_Y) * FTR_S, -p[2] * FTR_S);

// The same ship for the weakest quality levels, where it is a hundred pixels across:
// only its larger parts (no canopy frame, no fittings), every vertex moved to the middle
// of the small cell it falls in, and the triangles that survive that. A fifth of the
// triangles; each UV island keeps its own vertices, so the paint stays where it was.
function fighterLow(parts) {
  const G = 0.03 * FTR_S, cells = new Map(), verts = new Map(), P = [], N = [], T = [], I = [];
  const big = parts.filter((p) => p.id !== FTR.GLASS && p.id !== FTR.CAGE && p.diag >= 0.12 * FTR_S);
  big.forEach((p) => {
    p.keys = [];
    for (let i = 0; i < p.pos.length / 3; i++) {
      const k = Math.floor(p.pos[i * 3] / G) + "," + Math.floor(p.pos[i * 3 + 1] / G) + "," + Math.floor(p.pos[i * 3 + 2] / G);
      let c = cells.get(k);
      if (!c) cells.set(k, (c = [0, 0, 0, 0]));
      c[0] += p.pos[i * 3]; c[1] += p.pos[i * 3 + 1]; c[2] += p.pos[i * 3 + 2]; c[3]++;
      p.keys.push(k);
    }
  });
  let islands = 0;
  big.forEach((p) => {
    const n = p.pos.length / 3, par = new Int32Array(n);
    for (let i = 0; i < n; i++) par[i] = i;
    const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    for (let t = 0; t < p.ix.length; t += 3) { const a = find(p.ix[t]); par[find(p.ix[t + 1])] = a; par[find(p.ix[t + 2])] = a; }
    const vert = (i) => {
      const k = p.keys[i] + "|" + (islands + find(i));
      let o = verts.get(k);
      if (o === undefined) {
        const c = cells.get(p.keys[i]);
        o = P.length / 3;
        verts.set(k, o);
        P.push(c[0] / c[3], c[1] / c[3], c[2] / c[3]); N.push(0, 0, 0); T.push(p.uv[i * 2], p.uv[i * 2 + 1]);
      }
      N[o * 3] += p.nor[i * 3]; N[o * 3 + 1] += p.nor[i * 3 + 1]; N[o * 3 + 2] += p.nor[i * 3 + 2];
      return o;
    };
    for (let t = 0; t < p.ix.length; t += 3) {
      const a = p.ix[t], b = p.ix[t + 1], c = p.ix[t + 2];
      if (p.keys[a] !== p.keys[b] && p.keys[b] !== p.keys[c] && p.keys[a] !== p.keys[c]) I.push(vert(a), vert(b), vert(c));
    }
    islands += n;
  });
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(T, 2));
  g.setIndex(I);
  g.computeBoundingSphere();
  return g;
}

const FighterModel = {
  _geo: null, _tex: null,
  ok() { return !!(window.THREE && window.INR_ASSETS && window.INR_ASSETS.fighter); },
  // Three geometries in the rig's units. hull: every part but the glass, as one mesh. The
  // big parts are cut into fragments; no vertex is shared between two fragments, and
  // each carries its fragment's centre (aC) and four random numbers (aK), so the
  // vertex shader can throw the ship apart when it is destroyed. glass: the canopy.
  // low: the hull again, far lighter (see fighterLow).
  geometry() {
    if (this._geo) return this._geo;
    const S = FTR_S, P = [], N = [], T = [], C = [], K = [], I = [];
    let seed = 20261113, glass = null;
    const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const parts = inrModelParts(window.INR_ASSETS.fighter.mesh);
    parts.forEach((p) => {
      const n = p.pos.length / 3, tris = p.ix.length / 3, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) { // into the rig's units, nose to -z
        p.pos[i * 3] *= -S; p.pos[i * 3 + 1] = (p.pos[i * 3 + 1] - FTR_Y) * S; p.pos[i * 3 + 2] *= -S;
        p.nor[i * 3] *= -1; p.nor[i * 3 + 2] *= -1;
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p.pos[i * 3 + k]); hi[k] = Math.max(hi[k], p.pos[i * 3 + k]); }
      }
      p.diag = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
      if (p.id === FTR.GLASS) {
        glass = new THREE.BufferGeometry();
        glass.setAttribute("position", new THREE.BufferAttribute(p.pos, 3));
        glass.setAttribute("normal", new THREE.BufferAttribute(p.nor, 3));
        glass.setAttribute("uv", new THREE.BufferAttribute(p.uv, 2));
        glass.setIndex(new THREE.BufferAttribute(p.ix, 1));
        return;
      }
      if (tris >= 150) bossChunks(p); else { p.chunk = new Uint8Array(tris); p.nChunk = 1; }
      for (let c = 0; c < p.nChunk; c++) {
        const seen = new Map(), first = P.length / 3;
        let cx = 0, cy = 0, cz = 0;
        for (let t = 0; t < tris; t++) {
          if (p.chunk[t] !== c) continue;
          for (let k = 0; k < 3; k++) {
            const v = p.ix[t * 3 + k];
            let at = seen.get(v);
            if (at === undefined) {
              at = P.length / 3;
              seen.set(v, at);
              P.push(p.pos[v * 3], p.pos[v * 3 + 1], p.pos[v * 3 + 2]);
              N.push(p.nor[v * 3], p.nor[v * 3 + 1], p.nor[v * 3 + 2]);
              T.push(p.uv[v * 2], p.uv[v * 2 + 1]);
              cx += p.pos[v * 3]; cy += p.pos[v * 3 + 1]; cz += p.pos[v * 3 + 2];
            }
            I.push(at);
          }
        }
        const m = P.length / 3 - first, k4 = [r(), r(), r(), r()];
        for (let i = 0; i < m; i++) { C.push(cx / m, cy / m, cz / m); K.push(k4[0], k4[1], k4[2], k4[3]); }
      }
    });
    const hull = new THREE.BufferGeometry();
    hull.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    hull.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    hull.setAttribute("uv", new THREE.Float32BufferAttribute(T, 2));
    hull.setAttribute("aC", new THREE.Float32BufferAttribute(C, 3));
    hull.setAttribute("aK", new THREE.Float32BufferAttribute(K, 4));
    hull.setIndex(P.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(I, 1) : new THREE.Uint16BufferAttribute(I, 1));
    hull.computeBoundingSphere();
    if (glass) glass.computeBoundingSphere();
    return (this._geo = { hull, glass, low: fighterLow(parts) });
  },
  texture() { return this._tex || (this._tex = inrModelTexture(window.INR_ASSETS.fighter.albedo)); },
  // decode ahead of time, so opening the game never waits on it
  preload() { if (this.ok()) { try { this.geometry(); this.texture(); } catch (e) { /* the game falls back to the built-in jet */ } } },
};

// The hull's material. The model has one colour texture and nothing else, so the rest
// is read out of it: paint (anything bright or coloured) is a semi-gloss coat, dark
// grey is bare metal, soot is rough; what is brighter stands a little proud, so panel
// lines and rivets catch the light. On top: a soft fill of its own (the tunnel is dark
// and its tail is seen in shadow), a rim of the tunnel's colour at its edges, metal that
// glows round the engines, the flash of its own guns, and the break-up (see FighterModel.geometry).
function fighterSkin(env, side, U) {
  const m = new THREE.MeshStandardMaterial({ map: FighterModel.texture(), color: 0xffffff, metalness: 1, roughness: 1, envMap: env, envMapIntensity: 1.0, side });
  m.extensions = { derivatives: true };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, neonUniforms(), U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        attribute vec3 aC; attribute vec4 aK; uniform float uBoom; varying vec3 vFtrP; varying vec3 vFtrN;
        vec3 ftrSpin(vec3 v, vec3 ax, float a){ float c = cos(a), s = sin(a); return v * c + cross(ax, v) * s + ax * dot(ax, v) * (1.0 - c); }`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        vFtrN = objectNormal;
        vec3 ftrAx = normalize(aK.xyz * 2.0 - 1.0 + vec3(0.001));
        float ftrAng = uBoom * (1.5 + 7.0 * aK.w);
        objectNormal = ftrSpin(objectNormal, ftrAx, ftrAng);`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vFtrP = position;
        // destroyed: each fragment turns about its own centre, is thrown outward (sideways more
        // than at the camera), slows, falls a little behind, and shrinks away
        vec3 ftrDir = normalize(aC - vec3(0.0, 0.1, 0.3) + (aK.yzx - 0.5) * 1.3);
        ftrDir.z *= 0.5;
        float ftrGo = (1.0 - exp(-uBoom * 1.4)) / 1.4;
        transformed = aC + ftrSpin(transformed - aC, ftrAx, ftrAng) * (1.0 - smoothstep(1.1, 2.3, uBoom)) + ftrDir * (2.2 + 6.5 * aK.w) * ftrGo + vec3(0.0, -0.5, 2.2) * (0.5 * uBoom * uBoom);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        ${NEON_GLSL}
        varying vec3 vFtrP; varying vec3 vFtrN; uniform float uBoomHot; uniform float uHeat; uniform vec3 uRim; uniform vec3 uGun; uniform vec3 uEngAt; uniform vec3 uGunAt;
        uniform vec3 uFtrSeam; uniform float uFtrPow; uniform float uFtrRimK; uniform float uFtrSide; uniform vec3 uFtrUnder;`)
      // The hull as supplied is white and orange paint, weathered. Here its brightness shades a
      // dark gunmetal, and where the paint had a colour (the orange bands) a strip of light runs:
      // magenta on the port side, cyan on the starboard, like its wing lights.
      .replace("#include <map_fragment>", `#include <map_fragment>
        vec3 ftrAlb = texelColor.rgb;
        float ftrL = dot(ftrAlb, vec3(0.3, 0.59, 0.11));
        float ftrMx = max(ftrAlb.r, max(ftrAlb.g, ftrAlb.b)), ftrMn = min(ftrAlb.r, min(ftrAlb.g, ftrAlb.b));
        // (the paint mask is read from a blurrier level of the texture, so rust specks do not count as paint)
        vec3 ftrSoft = texture2D(map, vUv, 2.5).rgb;
        float ftrSMx = max(ftrSoft.r, max(ftrSoft.g, ftrSoft.b)), ftrSMn = min(ftrSoft.r, min(ftrSoft.g, ftrSoft.b));
        float ftrSat = smoothstep(0.36, 0.62, (ftrSMx - ftrSMn) / (ftrSMx + 0.02)) * smoothstep(0.1, 0.25, ftrSMx);
        float ftrTrim = clamp(length(vec2(dFdx(ftrSat), dFdy(ftrSat))) * 2.2, 0.0, 1.0); // the edge of a painted area: a line of light
        float ftrH = sqrt(ftrL);
        vec3 ftrT = neonTile(vFtrP * 0.85, vFtrN);
        vec3 ftrAcc = mix(vec3(1.5, 0.14, 0.95), vec3(0.12, 1.05, 1.5), smoothstep(-0.1, 0.1, vFtrP.x * uFtrSide));
        float ftrEdge = smoothstep(0.25, 0.9, length(fwidth(normalize(vNormal))) * 3.0); // (worn bright where a plate turns sharply)
        diffuseColor.rgb = mix(mix(neonMetal(clamp(ftrL * 1.25, 0.0, 1.0), ftrT), vec3(0.42, 0.45, 0.52), ftrEdge * 0.5), ftrAcc * (0.05 + 0.1 * ftrH) * (0.7 + 0.6 * ftrT.r) * (1.0 - 0.5 * neonGroove(ftrT)), ftrSat);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(clamp(0.52 - 0.2 * ftrL + (0.5 - ftrT.r) * 0.4, 0.3, 0.95), 0.34, ftrEdge), 0.3, ftrSat);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.92, 0.55, ftrSat);")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        // (relief from the change in the old paint's brightness from one pixel to the next, and from the tile's dents and panel lines)
        vec2 ftrD = vec2(dFdx(ftrH), dFdy(ftrH));
        ftrD *= smoothstep(0.012, 0.06, length(ftrD)) * 1.5;
        float ftrTH = neonHeight(ftrT);
        normal = neonBump(-vViewPosition, normal, clamp(ftrD, -0.7, 0.7) * vec2(length(dFdx(vViewPosition)), length(dFdy(vViewPosition))) + clamp(vec2(dFdx(ftrTH), dFdy(ftrTH)), -0.5, 0.5) * 0.007);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        vec3 ftrV = normalize(vViewPosition);
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.3, 0.3, 0.38); // a soft fill, so it reads in the dark tunnel
        totalEmissiveRadiance += neonRim(normal, ftrV, 3.0) * uFtrRimK;
        totalEmissiveRadiance += uRim * pow(1.0 - clamp(abs(dot(normal, ftrV)), 0.0, 1.0), 6.0);
        totalEmissiveRadiance += ftrAcc * (ftrSat * 0.07 * (0.3 + 0.7 * ftrH) + ftrTrim * 1.25) * uFtrPow; // where its paint was: anodised colour, with a line of light round it
        totalEmissiveRadiance += neonGlow(ftrT, vFtrP * 0.85, uFtrSeam) * uFtrPow * (1.0 - ftrSat); // seams and small lights
        totalEmissiveRadiance += uFtrUnder * max(0.0, -vFtrN.y) * (0.3 + 0.7 * ftrH) * (1.0 - 0.6 * neonGroove(ftrT)); // lit from below by its own glow
        vec3 ftrE = vec3(abs(vFtrP.x) - uEngAt.x, vFtrP.yz - uEngAt.yz);
        totalEmissiveRadiance += vec3(2.6, 0.7, 0.16) * (0.25 + ftrH) * uHeat * exp(-dot(ftrE, ftrE) * 13.0);
        vec3 ftrG = vec3(abs(vFtrP.x) - uGunAt.x, vFtrP.yz - uGunAt.yz);
        totalEmissiveRadiance += uGun * (0.3 + ftrL) * exp(-dot(ftrG, ftrG) * 5.0);
        totalEmissiveRadiance += vec3(2.6, 0.8, 0.16) * uBoomHot * (0.35 + 0.65 * ftrL);`);
  };
  m.customProgramCacheKey = () => "blaster-fighter-neon";
  return m;
}

// One exhaust flame for fighterFlames: rings from the nozzle (t = 0) to the tip (t = 1).
// kind 0: a main engine, 1: a pod thruster. core 1: the hot inner cone.
function fighterFlame(o, p, r, len, core, kind) {
  const R = 5, M = 10, base = o.pos.length / 3;
  for (let i = 0; i < R; i++) {
    const t = i / (R - 1), rr = r * (core ? 0.3 : 0.8) * Math.pow(1 - t, 0.75) + r * 0.04;
    for (let j = 0; j < M; j++) {
      const a = (j / M) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      o.pos.push(p.x + c * rr, p.y + s * rr, p.z + t * len * (core ? 0.6 : 1));
      o.nor.push(c, s, 0.25);
      o.t.push(t); o.core.push(core); o.axis.push(p.x, p.y); o.kind.push(kind); o.z0.push(p.z);
    }
  }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < M; j++) {
    const a = base + i * M + j, b = base + i * M + ((j + 1) % M);
    o.idx.push(a, b, a + M, b, b + M, a + M);
  }
}

class BlasterFighter {
  constructor(game) {
    const g = (this.g = game), env = g.shipEnv || g.env, S = FTR_S, geo = FighterModel.geometry();
    const ship = (this.ship = new THREE.Group()), rig = (this.rig = new THREE.Group());
    ship.add(rig);
    this.fit = { w: 3.5, h: 1.9, y: 0.28 }; // the room it needs in the band, and how far below the middle it sits (the game scales and places it)
    const eng = FTR.engines.map((e) => ftrP(e)), thr = FTR.thrusters.map((e) => ftrP(e));

    // ---- hull -----------------------------------------------------------------------
    this.U = {
      uBoom: { value: 0 }, uBoomHot: { value: 0 }, uHeat: { value: 0.2 }, uRim: { value: new THREE.Color(0, 0, 0) }, uGun: { value: new THREE.Color(0, 0, 0) },
      uEngAt: { value: new THREE.Vector3((Math.abs(eng[0].x) + Math.abs(eng[1].x)) / 2, eng[0].y, eng[0].z) }, uGunAt: { value: new THREE.Vector3(1.58, -0.1, -0.43) },
      // the neon it wears: seam colour, how lit its lights are, its two-colour rim, which side is cyan, the glow under it
      uFtrSeam: { value: new THREE.Color(0.15, 0.95, 1.25) }, uFtrPow: { value: 0 }, uFtrRimK: { value: 0.4 }, uFtrSide: { value: ftrP(FTR.lamps[1]).x < 0 ? -1 : 1 }, uFtrUnder: { value: new THREE.Color(0, 0, 0) },
    };
    this.seamCold = new THREE.Color(0.15, 0.95, 1.25); this.seamHot = new THREE.Color(0.75, 1.25, 1.7);
    this.hullMat = fighterSkin(env, THREE.FrontSide, this.U);
    // (its plain version for the weakest quality levels: the same dark metal, strips of light and rim, unlit)
    this.lowTint = { value: new THREE.Color(1, 1, 1) };
    this.hullMat.userData.twin = neonLowMaterial(FighterModel.texture(), { accent: 0x35efff, rim: 0.7, tint: this.lowTint });
    this.hullOpen = fighterSkin(env, THREE.DoubleSide, this.U); // for the wreck: its fragments are seen from inside too
    this.hull = new THREE.Mesh(geo.hull, this.hullMat);
    rig.add(this.hull);
    const warm = new THREE.Mesh(geo.hull, this.hullOpen); // (never seen: here so the two-sided twin is compiled while the scene loads)
    warm.visible = false;
    this.hullLow = new THREE.Mesh(geo.low, this.hullMat); // what the weakest quality levels draw in its place
    this.hullLow.visible = false;
    rig.add(warm, this.hullLow);

    // ---- cockpit: a pilot under the glass, a head-up display in front of them ----------
    const b = new RacerBatch(), box = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.SphereGeometry(1, 10, 8);
    const at = (x, y, z, sx, sy, sz) => racerM(-x * S, (y - FTR_Y) * S, -z * S, sx * S, sy * S, sz * S);
    b.add(box, at(0, 0.392, -0.052, 0.062, 0.07, 0.012), 0x2a2f3a); // seat back
    b.add(box, at(0, 0.376, -0.03, 0.06, 0.022, 0.03), 0xc8641e); // shoulders, in a flight suit the hull's orange
    b.add(ball, at(0, 0.402, -0.026, 0.017, 0.017, 0.018), 0xe8e4da); // helmet
    b.add(box, at(0, 0.418, -0.026, 0.007, 0.004, 0.03), 0xc23a2a); // its stripe
    b.add(box, at(0, 0.372, 0.046, 0.09, 0.02, 0.024), 0x181b22); // instrument cowl
    box.dispose(); ball.dispose();
    this.pilotMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.1, envMap: env, envMapIntensity: 0.35 });
    this.pilot = new THREE.Mesh(b.build("color"), this.pilotMat);
    this.hudMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uTime; uniform float uK; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * vec2(2.0, 1.0);
          float r = length(p);
          float ring = smoothstep(0.03, 0.0, abs(r - 0.3)) + smoothstep(0.02, 0.0, abs(r - 0.12)) * 0.7;
          float cross = (smoothstep(0.02, 0.0, abs(p.x)) + smoothstep(0.02, 0.0, abs(p.y))) * step(0.16, r) * step(r, 0.42);
          float ladder = smoothstep(0.012, 0.0, abs(fract(vUv.y * 7.0 + uTime * 0.15) - 0.5) - 0.44) * step(0.62, abs(p.x)) * step(abs(p.x), 0.86);
          float edge = smoothstep(0.5, 0.42, abs(vUv.x - 0.5)) * smoothstep(0.5, 0.4, abs(vUv.y - 0.5));
          gl_FragColor = vec4(vec3(0.35, 1.5, 1.25) * (ring + cross * 0.8 + ladder * 0.7 + 0.05) * edge * uK * (0.9 + 0.1 * sin(uTime * 5.0)), 1.0);
        }`,
    });
    this.hud = new THREE.Mesh(new THREE.PlaneGeometry(0.05 * S, 0.026 * S), this.hudMat);
    ftrP([0, 0.394, 0.03], this.hud.position);
    this.hud.renderOrder = 3;
    // the glass: clear looking straight through it, a mirror at its edges
    this.glassMat = new THREE.MeshStandardMaterial({ color: 0x0c1c2c, metalness: 0.85, roughness: 0.05, envMap: env, envMapIntensity: 2.4, transparent: true, opacity: 0.5, depthWrite: false, emissive: 0x08304a, emissiveIntensity: 0.25 });
    this.glassMat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\ndiffuseColor.a = mix(0.36, 0.95, pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 2.0));");
    };
    this.glassMat.customProgramCacheKey = () => "blaster-fighter-glass";
    this.glass = new THREE.Mesh(geo.glass || new THREE.BufferGeometry(), this.glassMat);
    this.glass.renderOrder = 4;
    rig.add(this.pilot, this.hud, this.glass);
    g.decorCheap(this.pilot, this.hud);

    // ---- engines: a white-hot disc in each nozzle, a flame with shock diamonds behind it ----
    this.FU = {
      uTime: { value: 0 }, uLen: { value: new THREE.Vector2(1, 1) }, uPow: { value: new THREE.Vector2(1, 1) }, uHurt: { value: 0 },
      uHot: { value: new THREE.Color(1.6, 2.2, 3.2) }, uCool: { value: new THREE.Color(3.0, 1.1, 0.25) }, uIon: { value: new THREE.Color(0.45, 1.5, 2.6) },
    };
    const fl = { pos: [], nor: [], t: [], core: [], axis: [], kind: [], z0: [], idx: [] };
    eng.forEach((p, i) => { const r = FTR.engines[i][3] * S; fighterFlame(fl, p, r, 1.15, 0, 0); fighterFlame(fl, p, r, 1.15, 1, 0); });
    thr.forEach((p, i) => { const r = FTR.thrusters[i][3] * S; fighterFlame(fl, p, r, 0.5, 0, 1); fighterFlame(fl, p, r, 0.5, 1, 1); });
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.Float32BufferAttribute(fl.pos, 3));
    fg.setAttribute("normal", new THREE.Float32BufferAttribute(fl.nor, 3));
    fg.setAttribute("aT", new THREE.Float32BufferAttribute(fl.t, 1));
    fg.setAttribute("aCore", new THREE.Float32BufferAttribute(fl.core, 1));
    fg.setAttribute("aAxis", new THREE.Float32BufferAttribute(fl.axis, 2));
    fg.setAttribute("aKind", new THREE.Float32BufferAttribute(fl.kind, 1));
    fg.setAttribute("aZ0", new THREE.Float32BufferAttribute(fl.z0, 1));
    fg.setIndex(fl.idx);
    const FLAME_VARY = "varying float vT; varying float vCore; varying float vKind; varying float vPow; varying vec3 vN; varying vec3 vV;";
    this.flameMat = new THREE.ShaderMaterial({
      uniforms: this.FU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute float aT; attribute float aCore; attribute vec2 aAxis; attribute float aKind; attribute float aZ0;
        uniform float uTime; uniform vec2 uLen; uniform vec2 uPow; uniform float uHurt; ${FLAME_VARY}
        void main(){
          vT = aT; vCore = aCore; vKind = aKind;
          vPow = aKind < 0.5 ? uPow.x : uPow.y;
          if (aKind < 0.5 && aAxis.x < 0.0) vPow *= 1.0 - uHurt * (0.5 + 0.4 * sin(uTime * 11.0) * sin(uTime * 4.3)); // the engine that was hit sputters
          vec3 p = position;
          p.xy = aAxis + (p.xy - aAxis) * (1.0 + 0.12 * aT * sin(uTime * 14.0 + aT * 9.0 + aAxis.x * 8.0));
          p.z = aZ0 + (p.z - aZ0) * (aKind < 0.5 ? uLen.x : uLen.y);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform float uTime; uniform vec3 uHot; uniform vec3 uCool; uniform vec3 uIon; ${FLAME_VARY}
        void main(){
          float f = abs(dot(normalize(vN), normalize(vV)));
          float body = pow(1.0 - vT, 1.4) * (0.35 + 0.65 * f);
          float diamonds = 0.7 + 0.5 * pow(0.5 + 0.5 * sin(vT * 15.0 - uTime * 9.0), 3.0);
          vec3 c = vKind < 0.5 ? mix(uCool, uHot, vCore > 0.5 ? 1.0 : pow(1.0 - vT, 3.0) * 0.6) : uIon * (vCore > 0.5 ? 1.5 : 0.8);
          gl_FragColor = vec4(c * (body * diamonds * vPow * (vCore > 0.5 ? 0.5 : 0.42)), 1.0);
        }`,
    });
    this.flames = new THREE.Mesh(fg, this.flameMat);
    this.flames.renderOrder = 5;
    this.flames.frustumCulled = false;
    // the discs: a fan of triangles just inside each nozzle
    const dk = { pos: [], uv: [], kind: [], side: [], idx: [] };
    eng.map((p, i) => [p, FTR.engines[i][3] * S * 0.9, 0]).concat(thr.map((p, i) => [p, FTR.thrusters[i][3] * S * 0.9, 1])).forEach(([p, r, kind]) => {
      const base = dk.pos.length / 3, M = 14;
      dk.pos.push(p.x, p.y, p.z - 0.03); dk.uv.push(0, 0); dk.kind.push(kind); dk.side.push(p.x);
      for (let j = 0; j < M; j++) {
        const a = (j / M) * Math.PI * 2;
        dk.pos.push(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, p.z - 0.03); dk.uv.push(Math.cos(a), Math.sin(a)); dk.kind.push(kind); dk.side.push(p.x);
        dk.idx.push(base, base + 1 + j, base + 1 + ((j + 1) % M));
      }
    });
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.Float32BufferAttribute(dk.pos, 3));
    dg.setAttribute("uv", new THREE.Float32BufferAttribute(dk.uv, 2));
    dg.setAttribute("aKind", new THREE.Float32BufferAttribute(dk.kind, 1));
    dg.setAttribute("aSide", new THREE.Float32BufferAttribute(dk.side, 1));
    dg.setIndex(dk.idx);
    this.coreMat = new THREE.ShaderMaterial({
      uniforms: this.FU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute float aKind; attribute float aSide; uniform float uTime; uniform vec2 uPow; uniform float uHurt; varying vec2 vP; varying float vKind; varying float vPow;
        void main(){
          vP = uv; vKind = aKind; vPow = aKind < 0.5 ? uPow.x : uPow.y;
          if (aKind < 0.5 && aSide < 0.0) vPow *= 1.0 - uHurt * (0.5 + 0.4 * sin(uTime * 11.0) * sin(uTime * 4.3));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform float uTime; uniform vec3 uCool; uniform vec3 uIon; varying vec2 vP; varying float vKind; varying float vPow;
        void main(){
          float core = 1.0 - clamp(length(vP), 0.0, 1.0);
          vec3 c = vKind < 0.5 ? mix(uCool, vec3(3.4, 3.1, 2.8), core * core) : uIon * (0.7 + 1.8 * core);
          gl_FragColor = vec4(c * core * (0.4 + 0.6 * core) * (0.4 + 0.7 * vPow) * (0.92 + 0.08 * sin(uTime * 13.0 + vP.x * 3.0)), 1.0);
        }`,
    });
    this.cores = new THREE.Mesh(dg, this.coreMat);
    this.cores.renderOrder = 5;
    rig.add(this.cores, this.flames);

    // ---- at warp: a bow wave of light off the nose --------------------------------------
    this.bowMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uW: { value: 0 }, uColor: { value: new THREE.Color(0.5, 0.95, 1.4) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `uniform float uTime; uniform float uW; uniform vec3 uColor; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){
          float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
          float a = atan(vP.y, vP.x);
          float streak = pow(0.5 + 0.5 * sin(a * 22.0 + sin(a * 5.0) * 2.0), 6.0) * (0.35 + 0.65 * fract(vP.z * 1.3 + uTime * 2.6 + sin(a * 9.0)));
          gl_FragColor = vec4(uColor * (uW * (fres * 0.45 + streak * 0.55) * smoothstep(0.0, 0.35, -vP.z)), 1.0);
        }`,
    });
    const dome = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.rotateX(-Math.PI / 2); // the dome's top points down the tunnel
    this.bow = new THREE.Mesh(dome, this.bowMat);
    this.bow.scale.set(2.0, 1.35, 2.7);
    this.bow.position.set(0, 0.1, 0.7);
    this.bow.renderOrder = 6;
    this.bow.visible = false;
    rig.add(this.bow);

    // ---- the shield: a hexagon lattice on a bubble of force, all but invisible until something hits it ----
    this.shieldMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.25, 0.85, 1.0) }, uOn: { value: 1 }, uHit: { value: 0 }, uHitP: { value: new THREE.Vector3(0, 0.6, -0.8) }, uGlow: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOn; uniform float uHit; uniform vec3 uHitP; uniform float uGlow; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){
          float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
          const vec2 s = vec2(1.0, 1.7320508);
          vec2 q = vP.xz * 5.0 + vec2(0.0, uTime * 0.15);
          vec4 hc = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
          vec4 h = vec4(q - hc.xy * s, q - (hc.zw + 0.5) * s);
          vec2 a = abs(dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw);
          float line = 1.0 - smoothstep(0.0, 0.07, 0.5 - max(dot(a, s * 0.5), a.x));
          float dist = distance(vP, uHitP);
          float ring = uHit * exp(-pow((dist - (1.0 - uHit) * 2.4) * 3.0, 2.0));
          float flare = uHit * uHit * exp(-dist * 1.6);
          float base = uOn * (fres * (0.06 + 0.4 * uGlow) + line * fres * (0.12 + 0.6 * uGlow) + line * 0.008);
          gl_FragColor = vec4(uColor * (base + line * (ring * 1.6 + flare * 1.2) + fres * (ring + flare) * 0.8), 1.0);
        }`,
    });
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.shieldMat);
    this.shield.scale.set(2.1, 1.2, 2.15);
    this.shield.position.set(0, 0.12, 0);
    this.shield.renderOrder = 7;
    rig.add(this.shield);

    // ---- what the game reads: engine and gun positions, glows it flickers, lights it blinks ----
    this.nozzles = eng.map((p) => p.clone().setZ(p.z + 0.02));
    this.guns = [FTR.chin.map((p) => ftrP(p)), FTR.pod.map((p) => ftrP(p))];
    this.muzzles = this.guns[0].map((p) => p.clone());
    this.engineGlows = this.nozzles.map((p) => { const s = glowSprite(neon(COLORS.orange, 1.7), 0.5, 0.7); s.position.copy(p); rig.add(s); return s; });
    this.podGlows = [0, 2].map((i) => { const s = glowSprite(neon(0x6fd0ff, 1.5), 0.24, 0.75); s.position.copy(thr[i]).lerp(thr[i + 1], 0.5); s.position.z += 0.04; rig.add(s); return s; });
    this.wingLights = [[FTR.lamps[0], COLORS.magenta], [FTR.lamps[1], COLORS.cyan]].map(([p, c]) => { const s = glowSprite(neon(c, 2.6), 0.36, 1); ftrP(p, s.position); rig.add(s); return s; });
    this.beacon = glowSprite(neon(0xff3a2a, 2.8), 0.3, 0);
    ftrP(FTR.mast, this.beacon.position);
    rig.add(this.beacon);
    this.tips = [ftrP(FTR.tips[1]), ftrP(FTR.tips[0])];
    this.contrails = this.tips.map(() => new Trail({ length: 18, width: 0.03, color: 0xbfe8ff, intensity: 0.7 }));
    this.contrails.forEach((t) => { g.scene.add(t.mesh); g.decor(t.mesh); });
    this.puffs = new ExamPuffs(g.scene, 40); // smoke when it is hurt, fire when it goes
    this.extras = [this.hullLow, this.glass, this.pilot, this.hud, this.cores, this.flames, this.bow, this.shield, this.beacon, ...this.engineGlows, ...this.podGlows, ...this.wingLights];

    this.heat = 0; this.heatTo = 0; this.rollV = 0; this.recoil = 0; this.gun = 0; this.waggle = 0; this.spinT = 0; this.spinDir = 1; this.acc = 0; this.shieldOn = 1;
    this.inT = REDUCED_MOTION ? 1 : 0; this.launched = false; this.hold = 0; // the fly-in
    this.hurt = 0; this.smokeT = 0; this.sparkT = 2; this.boom = -1; this.cook = 0; this.barrel = 1;
    this.boost = 0; this.jolt = 0; this.pow = 0;
    this.gunCol = new THREE.Color(1, 0.8, 0.5);
    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this._c = new THREE.Color();
    this.glowCool = neon(COLORS.orange, 1.2);
    this.glowHot = neon(0x9fd8ff, 1.7);
    rig.position.set(0, -1.6, this.inT < 1 ? 12.5 : 0); // (it waits behind the camera until the game starts)
    rig.rotation.x = FTR_TILT;
  }
  // the game starts: it comes in from behind the camera, engines wide open
  launch() {
    if (this.launched) return;
    this.launched = true;
    if (this.inT < 1) Sound.sfx("whoosh");
  }
  // the guns fire: a kick back, their flash on the hull. The nose cannons and the wing cannons take turns.
  fire(col) {
    this.recoil = 1; this.gun = 1;
    this.barrel ^= 1;
    this.muzzles.forEach((m, i) => m.copy(this.guns[this.barrel][i]));
    this.U.uGunAt.value.set(Math.abs(this.muzzles[0].x), this.muzzles[0].y, this.muzzles[0].z);
    if (col !== undefined) this.gunCol.set(col);
  }
  // a clean hit: a quick wing waggle and a burst of thrust (it surges ahead, engines long, and settles back)
  hit() { if (!REDUCED_MOTION && !GFX.calm) { this.waggle = 1; this.boost = 1; } }
  // a streak heats the engines: longer, bluer flames, a brighter shield
  setCombo(c) { this.heatTo = clamp((c - 1) / 7, 0, 1); }
  // a shield is lost: the lattice flares red from the point of impact
  shieldLost() {
    const u = this.shieldMat.uniforms;
    u.uHit.value = 1;
    u.uHitP.value.set(rand(-0.4, 0.4), 0.55, -0.7).normalize();
    u.uColor.value.setRGB(1.0, 0.28, 0.2);
    // and it is knocked: down and over to one side, then it rights itself (the roll's own spring carries the wobble)
    if (!REDUCED_MOTION && !GFX.calm && this.boom < 0 && this.inT >= 1) { this.jolt = 1; this.rollV += (u.uHitP.value.x < 0 ? -1 : 1) * 4.5; }
  }
  // a shield comes back: the lattice sweeps on from the nose
  shieldUp() {
    const u = this.shieldMat.uniforms;
    u.uHit.value = 0.9;
    u.uHitP.value.set(0, 0.1, -1);
    u.uColor.value.setRGB(0.6, 1.0, 1.0);
  }
  // through the warp between waves: one full roll
  warp() { if (!REDUCED_MOTION && !GFX.calm) { this.spinT = 1; this.spinDir = Math.random() < 0.5 ? -1 : 1; } }
  // the last shield is gone: it breaks up into its own parts in a ball of fire
  down() {
    const g = this.g, k = g.shipScale;
    this.contrails.forEach((t) => { t.mesh.visible = false; });
    this.extras.forEach((o) => { o.visible = false; });
    if (REDUCED_MOTION || this.inT < 1 || this.hull.material !== this.hullMat) { this.ship.visible = false; return; } // (still: it is simply gone, as is the plain version the weakest quality levels draw)
    this.boom = 0;
    this.cook = 0.45;
    this.hull.material = this.hullOpen;
    this.hull.frustumCulled = false;
    const p = this.ship.position, v = this._w;
    if (!GFX.calm) this.puffs.emit(2, p, v.set(0, 0, 0), 1.6 * k, 4.4 * k, 0.24); // (Reduced effects: no flash)
    for (let i = 0; i < 6; i++) this.puffs.emit(0, this._v.set(p.x + rand(-1, 1) * k, p.y + rand(-0.3, 0.8) * k, p.z + rand(-0.8, 0.8) * k), v.set(rand(-2, 2), rand(-0.5, 2), rand(0.3, 2)), 1.0 * k, (2.2 + rand(0.9)) * k, 0.8 + rand(0.4), 0.6);
    for (let i = 0; i < 4; i++) this.puffs.emit(1, this._v.set(p.x + rand(-1, 1) * k, p.y + rand(-0.2, 0.6) * k, p.z + rand(-0.5, 0.5) * k), v.set(rand(-1.5, 1.5), rand(0, 1.5), rand(0.5, 2.5)), 1.2 * k, (2.8 + rand(1.2)) * k, 1.4 + rand(0.5), 0.5);
  }
  update(dt, sp, w) {
    const g = this.g, t = g.t, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm, h = Math.min(dt, 0.05), U = this.U, FU = this.FU;
    const cheap = GFX.ok && GFX.Q[GFX.qi].cheap, k = g.shipScale;
    this.puffs.update(dt, g.camera, t);
    this.puffs.mat.uniforms.uDetail.value = cheap ? 0 : 1;
    if (this.boom >= 0) { // it is gone: only the wreck moves
      this.boom += dt;
      U.uBoom.value = this.boom;
      U.uBoomHot.value = Math.exp(-this.boom * 2.2);
      U.uFtrPow.value = Math.max(0, U.uFtrPow.value - dt * 5); // its lights die with it
      U.uFtrUnder.value.multiplyScalar(Math.pow(0.01, dt));
      if (this.cook && this.boom > this.cook) { // a tank goes, a moment after the rest
        this.cook = 0;
        const p = this._v.copy(this.ship.position); p.z += 0.5 * k; p.x += rand(-0.8, 0.8) * k;
        if (!GFX.calm) this.puffs.emit(2, p, this._w.set(0, 0, 0), 1.0 * k, 3.0 * k, 0.22);
        this.puffs.emit(0, p, this._w.set(rand(-1, 1), rand(0, 1.5), 1.5), 0.8 * k, 2.2 * k, 0.9, 0.5);
        g.bursts.burst(p, COLORS.orange, { n: 34, speed: 9 * k, size: 0.2 * k, life: 0.7 });
      }
      if (this.boom > 2.6 || this.hull.material !== this.hullOpen) this.hull.visible = false; // (a quality drop swaps in a plain material that can't move the fragments)
      return;
    }
    this.hull.visible = !cheap;
    this.hullLow.visible = cheap;
    this.heat += (this.heatTo - this.heat) * Math.min(1, dt * 3);
    const heat = this.heat;
    // the fly-in: from behind and below the camera to its place, rolling level as it arrives
    if (!this.launched && this.inT < 1 && (this.hold += dt) > 1) this.launch();
    if (this.launched && this.inT < 1) this.inT = Math.min(1, this.inT + dt / 1.6);
    // a burst of thrust after a clean hit: out fast, back slowly
    this.boost = Math.max(0, this.boost - dt / 1.1);
    const lunge = this.boost > 0 ? Math.sin(Math.PI * Math.pow(1 - this.boost, 0.5)) : 0;
    this.jolt = Math.max(0, this.jolt - dt * 2.4);
    const inK = this.inT < 1 ? Math.pow(1 - this.inT, 3) : 0, burn = Math.max(w, Math.min(1.2, inK * 3), lunge * 0.85) + clamp((sp / 26 - 1) / 0.6, 0, 1) * 0.12;
    // hovering: a slow bob on two beats, the nose leading it a little, and a yaw that trails the bank
    const hov = quiet ? 0 : 1 - Math.min(1, inK * 3);
    const bob = (Math.sin(t * 1.9) * 0.045 + Math.sin(t * 3.1 + 1.3) * 0.016) * hov;
    // bank into the drift and the pointer; waggle after a hit; one full roll through the warp
    let roll = (quiet ? 0 : -Pointer.x * 0.4) - Math.cos(t * 0.9) * 0.14 - Math.min(1, inK * 2.5) * 1.3;
    if (this.waggle > 0) { this.waggle = Math.max(0, this.waggle - dt * 1.5); roll += Math.sin((1 - this.waggle) * Math.PI * 2) * 0.5 * this.waggle; }
    if (this.spinT > 0) {
      this.spinT = Math.max(0, this.spinT - dt / 1.2);
      roll += this.spinDir * Math.PI * 2 * smoothstep(0, 1, 1 - this.spinT);
      if (this.spinT === 0) rig.rotation.z -= this.spinDir * Math.PI * 2; // a whole turn is no turn: nothing to unwind
    }
    this.rollV += ((roll - rig.rotation.z) * 60 - this.rollV * 11) * h;
    rig.rotation.z += this.rollV * h;
    rig.rotation.x += (FTR_TILT + (quiet ? 0 : Pointer.y * 0.1) + this.recoil * 0.05 - Math.min(1, inK * 2) * 0.22 + Math.sin(t * 1.9 + 0.9) * 0.014 * hov - lunge * 0.045 + this.jolt * this.jolt * 0.07 - rig.rotation.x) * Math.min(1, dt * 6);
    rig.rotation.y += ((-Math.sin(rig.rotation.z) * 0.22 + Math.sin(t * 0.7 + 0.6) * 0.03) * hov - rig.rotation.y) * Math.min(1, dt * 2.5);
    this.recoil *= Math.pow(0.004, dt);
    this.gun *= Math.pow(0.02, dt);
    rig.position.set(0, -inK * 1.6 + bob - this.jolt * this.jolt * 0.2, this.recoil * 0.14 + inK * 12.5 - (quiet ? 0 : w * 0.5) - lunge * 0.85); // (it surges forward into the warp, and after a clean hit)
    // engines: the mains burn longer and bluer with the streak and the warp; the pod thrusters answer a roll
    const turn = Math.min(0.5, Math.abs(this.rollV) * 0.3);
    FU.uTime.value = t;
    FU.uLen.value.set(0.8 + heat * 0.7 + burn * 1.8, 0.7 + heat * 0.4 + burn * 1.2 + turn);
    FU.uPow.value.set(0.46 + heat * 0.38 + burn * 0.8, 0.36 + heat * 0.3 + burn * 0.6 + turn);
    FU.uCool.value.setRGB(lerp(3.0, 1.2, heat), lerp(1.1, 1.9, heat), lerp(0.25, 3.0, heat));
    this.hurt += ((g.shields <= 1 && g.state !== "over" ? 1 : 0) - this.hurt) * Math.min(1, dt * 3);
    FU.uHurt.value = this.hurt;
    this.engineGlows.forEach((s) => s.material.color.copy(this.glowCool).lerp(this.glowHot, heat));
    this.podGlows.forEach((s, j) => s.scale.setScalar(0.2 * (1 + 0.1 * Math.sin(t * 13 + j * 2)) * (0.7 + FU.uPow.value.y)));
    U.uHeat.value = 0.16 + heat * 0.5 + Math.min(1, burn) * 0.7;
    // (the game's engine light is tuned for a dark hull: on this one it is kept low, so the paint keeps its own colours)
    if (g.engineLight && this.ship.visible) { g.engineLight.intensity = 0.5 + 0.5 * Math.min(1, burn) + 0.25 * heat; g.engineLight.color.copy(this.glowCool).lerp(this.glowHot, heat).multiplyScalar(0.6); }
    U.uGun.value.copy(this.gunCol).multiplyScalar(this.gun * 2.4);
    U.uRim.value.copy(g.waveCol).multiplyScalar(0.7 + 0.4 * heat);
    // its neon: lights come on as it arrives, burn brighter with the streak and the thrust, dim on its last shield
    NEON_T.value = t;
    this.pow += ((this.inT > 0.55 ? 1 : 0) - this.pow) * Math.min(1, dt * 2.5);
    U.uFtrPow.value = this.pow * (0.8 + 0.5 * heat + 0.5 * lunge) * (1 - 0.35 * this.hurt);
    U.uFtrSeam.value.copy(this.seamCold).lerp(this.seamHot, heat);
    U.uFtrRimK.value = 0.62 + 0.2 * heat + 0.25 * lunge; // (edged in light: it stands out from the demon behind it)
    U.uFtrUnder.value.copy(g.waveCol).multiplyScalar(0.09 + 0.1 * heat + 0.2 * Math.min(1, burn));
    this.lowTint.value.setScalar(1 + 0.25 * heat + 0.3 * lunge);
    // lights: the aerial's beacon (a soft pulse, well under 1 Hz), the head-up display, the canopy
    this.beacon.material.opacity = Math.pow(Math.max(0, Math.sin(t * 2.6)), 8);
    this.hudMat.uniforms.uTime.value = t;
    this.glassMat.envMapIntensity = 2.2 + 0.5 * Math.sin(t * 0.8);
    this.bow.visible = w > 0.02 && !cheap && !REDUCED_MOTION;
    this.bowMat.uniforms.uW.value = w * 0.8;
    this.bowMat.uniforms.uTime.value = t;
    // shield: fades with the shields left, glows with the streak, settles back to blue after a hit
    const su = this.shieldMat.uniforms;
    this.shieldOn += (clamp(g.shields / 3, 0, 1) - this.shieldOn) * Math.min(1, dt * 4);
    su.uTime.value = t;
    su.uOn.value = this.shieldOn;
    su.uGlow.value = heat * 0.6;
    su.uHit.value = Math.max(0, su.uHit.value - dt * 1.3);
    if (su.uHit.value === 0) su.uColor.value.lerp(this._c.setRGB(lerp(0.25, 1.0, heat * heat), 0.85, lerp(1.0, 0.45, heat * heat)), Math.min(1, dt * 4));
    // (the weakest quality levels only draw the bubble while it flares)
    this.shield.visible = su.uHit.value > 0; // (the lattice only shows when something lands on it: at rest it read as a wire dome across the demon)
    rig.updateMatrixWorld();
    if (inK < 0.5) GFX.heatAt(g.camera, this._v.set(0, 0.3, 2.5).applyMatrix4(rig.matrixWorld), 0.6 * k, 0.4 + 0.6 * Math.max(heat, Math.min(1, burn))); // (not while it is still behind the camera)
    // down to its last shield: the engine that was hit trails smoke, and now and then something shorts
    if (this.hurt > 0.5 && !quiet) {
      if ((this.smokeT -= dt) <= 0) {
        this.smokeT = 0.085;
        this.puffs.emit(1, this._v.copy(this.nozzles[0]).applyMatrix4(rig.matrixWorld), this._w.set(rand(-0.4, 0.4), rand(0.1, 0.7), 9 + rand(3)), 0.2 * k, 0.75 * k, 0.5, 0.4, 0.5);
      }
      if ((this.sparkT -= dt) <= 0) {
        this.sparkT = rand(2.2, 3.6);
        g.bursts.burst(this._v.set(rand(-1.2, 1.2), 0.3, rand(-0.8, 1.2)).applyMatrix4(rig.matrixWorld), COLORS.orange, { n: 12, speed: 3.5 * k, size: 0.13 * k, life: 0.4 });
      }
    }
    // wingtip vapour trails, sampled at a fixed 60 Hz like the engine trails
    this.acc = Math.min(4 / 60, this.acc + dt);
    while (this.acc >= 1 / 60) {
      this.acc -= 1 / 60;
      const step = Math.min(sp * 0.3, 9) / 60;
      this.contrails.forEach((tr, j) => {
        tr.width = 0.03 * k * (1 + heat + lunge);
        tr.shift(0, 0, step);
        tr.push(this._v.copy(this.tips[j]).applyMatrix4(rig.matrixWorld));
      });
    }
  }
}

if (typeof requestIdleCallback === "function") requestIdleCallback(() => FighterModel.preload(), { timeout: 5000 });
else setTimeout(() => FighterModel.preload(), 2500);
