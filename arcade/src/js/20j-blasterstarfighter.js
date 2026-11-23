// Risk Blaster's starfighter, when its model arrived (Assets.model("starfighter"); without it 20d's fighter or
// 20b's jet flies, as before): a manta wing in black chrome, cyan along its leading edges, magenta rings round its
// five engines, twin cannons at its wing tips. The model is thirteen rigid parts; everything it does is posed here.
// Look and sound only: the game still owns where the ship is, where it aims, and everything that scores.
//   ship: where it is and where it aims (the game drives this)
//   rig:  bank, pitch, recoil, rolls, the fly-in (look only)
// Everything here runs on the show clock (VFX.dt), so a hit-stop holds it still and the rules never wait for it.
const STAR = {
  S: 3.6, // game units to one model unit (the model is one unit from cannon to cannon)
  TILT: 0.34, // it flies tipped back toward the camera behind it, which then sees its back, its neon and its engine rings, not only its tail
  RIDE: { muzzleL: "cannonL", muzzleR: "cannonR", tipL: "cannonL", tipR: "cannonR", exhaustC: "engineC", exhaustL: "engineL", exhaustR: "engineR", exhaustLL: "engineLL", exhaustLR: "engineLR", cockpit: "canopy" },
  TREE: { cannonL: "wingL", cannonR: "wingR" }, // (a cannon rides its wing tip: when the wing flexes, it goes with it)
  ENGINES: ["exhaustC", "exhaustL", "exhaustR", "exhaustLL", "exhaustLR"], // three mains across the tail, two smaller under them
  NOZZLE: 0.046, // a nozzle's radius, in the model's units
};

// Every vertex of a loaded model told where it stands in the model's own frame at rest (aRest): what a shader needs
// to light a place on it (an engine, a core, a wound) whatever pose it is in.
function blasterBakeRest(model) {
  const v = new THREE.Vector3();
  model.scene.updateMatrixWorld(true);
  model.scene.traverse((o) => {
    if (!o.isMesh || o.geometry.attributes.aRest) return;
    const p = o.geometry.attributes.position, a = p.array, out = new Float32Array(p.count * 3);
    const k = !p.normalized ? 1 : a instanceof Int16Array ? 1 / 32767 : a instanceof Uint16Array ? 1 / 65535 : a instanceof Int8Array ? 1 / 127 : a instanceof Uint8Array ? 1 / 255 : 1;
    for (let i = 0; i < p.count; i++) { v.set(p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k).applyMatrix4(o.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; }
    o.geometry.setAttribute("aRest", new THREE.BufferAttribute(out, 3));
  });
}
// A loaded model's maps, let go with the scene. (Its colour map goes in the scene's own sweep; these are the rest. A
// model is handed to one scene only, so nothing else is using them.)
function blasterDropMaps(mats) {
  const seen = new Set();
  mats.forEach((m) => ["emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap"].forEach((k) => { if (m[k] && !seen.has(m[k])) { seen.add(m[k]); m[k].dispose(); } }));
}
// What the game teaches a loaded model's material (one recipe for the fighter and the demon):
//   uSkGlow     its own light (the neon in its emissive map): a colour times a strength
//   uSkRimA/B   a thin rim on the edges that turn away from the lens: one colour from the left, one from the right
//   uSkKick     a cold kicker from above and behind: every upper edge is drawn in light, so the shape stands clear of the sky
//   uSkHit      a flash along its edges (it has just been struck)
//   uSkGone     0 to 1: it is eaten away from a noise, the edge of every hole burning (uSkBurn); uSkGoneF: how fine the noise
//   uSkHot      heat: all of it glows (a wreck, cooling)
//   uSkFill     a fill of its own: it is never a black shape on black space
//   uSkSpec     the most a lamp's own highlight may add (a flat chrome plate that turns to face a hard lamp would
//               otherwise be a slab of white: its sheen comes from the soft cards in what it mirrors instead)
// Chrome sparkles where its normal map is finer than a pixel: there it is made a little rougher (uSkAA), so a
// highlight slides over a plate instead of crawling across it.
// o.pars, o.cut, o.albedo, o.emissive: more GLSL for one model (declarations; before its texture is read; after; with the light it gives off).
const blasterSkinUniforms = () => ({
  uSkGlow: { value: new THREE.Color(1, 1, 1) }, uSkRimA: { value: new THREE.Color(0, 0, 0) }, uSkRimB: { value: new THREE.Color(0, 0, 0) }, uSkHit: { value: new THREE.Color(0, 0, 0) },
  uSkGone: { value: 0 }, uSkGoneF: { value: 14 }, uSkBurn: { value: new THREE.Color(5, 1.6, 0.5) }, uSkHot: { value: new THREE.Color(0, 0, 0) }, uSkAA: { value: 1.4 }, uSkKick: { value: new THREE.Color(0, 0, 0) }, uSkSpec: { value: 1.4 }, uSkFill: { value: new THREE.Color(0, 0, 0) },
});
function blasterSkin(mat, U, o = {}) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aRest; varying vec3 vRest;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = aRest;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vRest;
        uniform vec3 uSkGlow; uniform vec3 uSkRimA; uniform vec3 uSkRimB; uniform vec3 uSkHit; uniform float uSkGone; uniform float uSkGoneF; uniform vec3 uSkBurn; uniform vec3 uSkHot; uniform float uSkAA; uniform vec3 uSkKick; uniform float uSkSpec; uniform vec3 uSkFill;
        float skH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float skN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(skH(i), skH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(skH(i + vec3(0.0, 1.0, 0.0)), skH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                     mix(mix(skH(i + vec3(0.0, 0.0, 1.0)), skH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(skH(i + vec3(0.0, 1.0, 1.0)), skH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
        ${o.pars || ""}`)
      .replace("#include <map_fragment>", `float skBurn = 0.0;
        if (uSkGone > 0.0) {
          float skG = skN(vRest * uSkGoneF) * 0.68 + skN(vRest * uSkGoneF * 2.7) * 0.32 - uSkGone * 1.1;
          if (skG < 0.0) discard;
          skBurn = 1.0 - smoothstep(0.0, 0.08, skG);
        }
        ${o.cut || ""}
        #include <map_fragment>
        ${o.albedo || ""}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        { vec3 skD = max(abs(dFdx(normal)), abs(dFdy(normal))); roughnessFactor = min(1.0, roughnessFactor + max(max(skD.x, skD.y), skD.z) * uSkAA); }
        float skNV = clamp(dot(geometryNormal, normalize(vViewPosition)), 0.0, 1.0), skF = 1.0 - skNV; // (off the shape itself, not its bumps: a rim taken from a bumped normal is a dotted line)
        totalEmissiveRadiance *= uSkGlow;
        ${o.emissive || ""}
        totalEmissiveRadiance += mix(uSkRimA, uSkRimB, smoothstep(-0.4, 0.4, geometryNormal.x)) * (skF * skF * skF * skF) + uSkKick * (skF * skF * skF * smoothstep(-0.2, 0.75, geometryNormal.y)) + uSkHit * (0.03 + skF * skF * skF) + uSkFill * (0.45 + 0.55 * diffuseColor.g) + uSkBurn * skBurn + uSkHot * (0.35 + 0.65 * diffuseColor.g) * (0.12 + 0.88 * smoothstep(0.3, 0.72, skN(vRest * 26.0) * 0.65 + skN(vRest * 61.0) * 0.35)); // (heat glows in patches, like embers, dark between them: never a coat of orange)`);
    sh.fragmentShader = sh.fragmentShader.replace("reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance", "min(reflectedLight.directSpecular, vec3(uSkSpec)) + reflectedLight.indirectSpecular + totalEmissiveRadiance");
  };
  mat.customProgramCacheKey = () => "blaster-skin-" + (o.key || "");
  mat.needsUpdate = true;
  return mat;
}

// The exhaust of every engine as one mesh: for each, a soft outer cone and a hot inner one, rings from the nozzle
// (t = 0) to the tip (t = 1), in the rig's frame (the tail is +z). kind 0: a main engine; 1: one of the two under them.
function starPlumes(list) {
  const R = 7, M = 14, o = { pos: [], nor: [], t: [], core: [], axis: [], kind: [], z0: [], ph: [], idx: [] };
  list.forEach(({ p, r, len, kind, ph }) => {
    for (const core of [0, 1]) {
      const base = o.pos.length / 3;
      for (let i = 0; i < R; i++) {
        const t = i / (R - 1), rr = r * (core ? 0.36 : 0.92) * Math.pow(1 - t, 0.7) + r * 0.03;
        for (let j = 0; j < M; j++) {
          const a = (j / M) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
          o.pos.push(p.x + c * rr, p.y + s * rr, p.z + t * len * (core ? 0.62 : 1));
          o.nor.push(c, s, 0.25);
          o.t.push(t); o.core.push(core); o.axis.push(p.x, p.y); o.kind.push(kind); o.z0.push(p.z); o.ph.push(ph);
        }
      }
      for (let i = 0; i < R - 1; i++) for (let j = 0; j < M; j++) { const a = base + i * M + j, b = base + i * M + ((j + 1) % M); o.idx.push(a, b, a + M, b, b + M, a + M); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(o.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(o.nor, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(o.t, 1));
  g.setAttribute("aCore", new THREE.Float32BufferAttribute(o.core, 1));
  g.setAttribute("aAxis", new THREE.Float32BufferAttribute(o.axis, 2));
  g.setAttribute("aKind", new THREE.Float32BufferAttribute(o.kind, 1));
  g.setAttribute("aZ0", new THREE.Float32BufferAttribute(o.z0, 1));
  g.setAttribute("aPh", new THREE.Float32BufferAttribute(o.ph, 1));
  g.setIndex(o.idx);
  return g;
}
function starPlumeMaterial(U) {
  const VARY = "varying float vT; varying float vCore; varying float vPow; varying vec3 vN; varying vec3 vV;";
  return new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute float aT; attribute float aCore; attribute vec2 aAxis; attribute float aKind; attribute float aZ0; attribute float aPh;
      uniform float uTime; uniform vec2 uLen; uniform vec2 uPow; uniform float uHurt; ${VARY}
      void main(){
        vT = aT; vCore = aCore;
        // each engine flickers in its own time (small and fast: a shimmer, never a flash); the one that was hit sputters
        float pw = (aKind < 0.5 ? uPow.x : uPow.y) * (0.93 + 0.05 * sin(uTime * 23.0 + aPh * 5.1) + 0.03 * sin(uTime * 57.0 + aPh * 11.3));
        if (aPh > 0.5 && aPh < 1.5) pw *= 1.0 - uHurt * (0.5 + 0.4 * sin(uTime * 11.0) * sin(uTime * 4.3));
        vPow = pw;
        vec3 p = position;
        p.xy = aAxis + (p.xy - aAxis) * (1.0 + 0.12 * aT * sin(uTime * 14.0 + aT * 9.0 + aPh * 8.0));
        p.z = aZ0 + (p.z - aZ0) * (aKind < 0.5 ? uLen.x : uLen.y) * (0.85 + 0.15 * pw);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uTime; uniform vec3 uHot; uniform vec3 uCool; uniform vec3 uTail; ${VARY}
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV)));
        float body = pow(1.0 - vT, 1.3) * (0.3 + 0.7 * f);
        float diamonds = 0.74 + 0.5 * pow(0.5 + 0.5 * sin(vT * 16.0 - uTime * 10.0), 3.0); // shock diamonds, running down the flame
        vec3 c = vCore > 0.5 ? mix(uCool, uHot, pow(1.0 - vT, 2.0)) : mix(uTail, uCool, pow(1.0 - vT, 1.6));
        gl_FragColor = vec4(c * (body * diamonds * vPow * (vCore > 0.5 ? 0.6 : 0.4)), 1.0);
      }`,
  });
}

// The fighter's shield, seen when something lands on it: a shell of force that is brightest at its edge and clear at
// its middle, so the hull inside keeps its own colours; a hexagon lattice shows for a moment where the blow fell.
// It never reaches white. uK: how brightly its edge burns (the fighter pulses it); uHit, uHitP: the blow.
function starShellMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.28, 0.88, 1.0) }, uK: { value: 0 }, uHit: { value: 0 }, uHitP: { value: new THREE.Vector3(0, 0.6, -0.8) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uK; uniform float uHit; uniform vec3 uHitP; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
        const vec2 s = vec2(1.0, 1.7320508);
        vec2 q = vP.xz * 5.0 + vec2(0.0, uTime * 0.15);
        vec4 hc = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
        vec4 h = vec4(q - hc.xy * s, q - (hc.zw + 0.5) * s);
        vec2 a = abs(dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw);
        float line = 1.0 - smoothstep(0.0, 0.06, 0.5 - max(dot(a, s * 0.5), a.x));
        float near = exp(-distance(vP, uHitP) * 2.4);
        float k = fres * (0.25 + 0.75 * uK) * uK + line * (fres * 0.3 * uK + near * 0.3 * uHit);
        gl_FragColor = vec4(min(uColor * k, vec3(0.85)), 1.0);
      }`,
  });
}

class BlasterStarfighter {
  constructor(game, model) {
    const g = (this.g = game), S = STAR.S;
    const M = (this.model = rigModel(model, { ride: STAR.RIDE, tree: STAR.TREE }));
    blasterBakeRest(M);
    const ship = (this.ship = new THREE.Group()), rig = (this.rig = new THREE.Group()), P = (this.P = M.parts);
    ship.add(rig);
    this.fit = { w: 3.6, h: 1.72, y: 0.275 }; // the room it needs in the band, and how far below the middle it sits (the game scales and places it)
    M.scene.rotation.y = Math.PI; // (the model's nose is +z: it flies down the way ahead, -z)
    M.scene.scale.setScalar(S);
    rig.add(M.scene);
    for (const n in P) P[n].userData.rest = P[n].position.clone();
    // a point of the model at rest, in the rig's frame
    const at = (p, out) => (out || new THREE.Vector3()).set(-p[0] * S, p[1] * S, -p[2] * S);

    // ---- its chrome: what it mirrors (the region's sky and lamps), how its neon burns, and what the game adds
    tuneModel(M, { glow: 2.3, metal: 1.0, rough: 1.0, normal: 0.9 }); // (its finishes are in its own maps, part by part: satin plates, a mirror-glass canopy, heat-tinted nozzles, gunmetal cannons. They are left as they were made.)
    this.U = blasterSkinUniforms();
    this.U.uSkAA.value = 1.2;
    this.U.uSkBurn.value.setRGB(1.6, 3.8, 5);
    this.U.uSkSpec.value = 0.7;
    this.UE = Object.assign({}, this.U, { uSkGlow: { value: new THREE.Color(1, 1, 1) } }); // the engines' own light: it follows the thrust
    this.UG = Object.assign({}, this.U, { uSkSpec: { value: 6 }, uSkAA: { value: 0 }, uSkFill: { value: new THREE.Color(0, 0, 0) } }); // the canopy: glass takes a lamp's own glint, sharp, and is not lifted by the fill
    const PARS = "uniform vec3 uStHeat; uniform vec3 uStGun; uniform vec3 uStFlash;";
    const EM = `vec3 stE = vec3(max(abs(vRest.x) - 0.17, 0.0), vRest.y - 0.01, (vRest.z + 0.46) * 0.8);
        totalEmissiveRadiance += uStHeat * exp(-dot(stE, stE) * 110.0) * (0.3 + 0.7 * diffuseColor.g);
        vec3 stG = vec3(abs(vRest.x) - 0.4535, vRest.y + 0.0134, vRest.z - 0.2);
        totalEmissiveRadiance += uStGun * exp(-dot(stG * vec3(1.0, 1.0, 0.45), stG * vec3(1.0, 1.0, 0.45)) * 420.0);
        vec3 stF = vec3(abs(vRest.x) - 0.4535, (vRest.y + 0.0134) * 1.6, (vRest.z - 0.1) * 0.55);
        totalEmissiveRadiance += uStFlash * exp(-dot(stF, stF) * 24.0) * (0.25 + 1.5 * diffuseColor.rgb); // the light of a shot on the plates beside the gun`;
    this.U.uStHeat = this.UE.uStHeat = this.UG.uStHeat = { value: new THREE.Color(0, 0, 0) }; // metal glowing round the nozzles
    this.U.uStGun = this.UE.uStGun = this.UG.uStGun = { value: new THREE.Color(0, 0, 0) }; // the barrels, hot from firing
    this.U.uStFlash = this.UE.uStFlash = this.UG.uStFlash = { value: new THREE.Color(0, 0, 0) }; // a shot's light on the hull
    const base = M.mesh.body.material;
    this.mat = blasterSkin(base, this.U, { key: "star", pars: PARS, emissive: EM });
    this.engMat = blasterSkin(base.clone(), this.UE, { key: "star", pars: PARS, emissive: EM });
    STAR.ENGINES.forEach((n) => { const m = M.mesh[n.replace("exhaust", "engine")]; if (m) m.material = this.engMat; });
    this.glassMat = blasterSkin(base.clone(), this.UG, { key: "star", pars: PARS, emissive: EM }); // the canopy: dark mirror glass (the finish is in the maps; this copy gives it its own glint and a stronger mirror)
    if (M.mesh.canopy) M.mesh.canopy.material = this.glassMat;
    this.mats = [this.mat, this.engMat, this.glassMat];
    g.chrome(this.mat, 1.2); g.chrome(this.engMat, 1.2); g.chrome(this.glassMat, 2.6); // (the canopy mirrors the region's sky more strongly than the plates: the sky is seen in it)
    ["finL", "finR"].forEach((n) => { if (M.mesh[n]) M.mesh[n].visible = false; }); // (the two flat plates under the engines read as one dark quad from behind: the engine block stands without them)

    // ---- engines: five nozzles, each with a flame and a glow
    const noz = STAR.ENGINES.map((n) => at(M.info.anchors[n]));
    this.FU = { uTime: { value: 0 }, uLen: { value: new THREE.Vector2(1, 1) }, uPow: { value: new THREE.Vector2(1, 1) }, uHurt: { value: 0 },
      uHot: { value: new THREE.Color(2.6, 3.0, 3.4) }, uCool: { value: new THREE.Color(0.3, 1.5, 3.0) }, uTail: { value: new THREE.Color(1.3, 0.3, 2.4) } };
    this.flames = new THREE.Mesh(starPlumes(noz.map((p, i) => ({ p, r: STAR.NOZZLE * S * (i < 3 ? 1 : 0.92), len: i < 3 ? 1.5 : 1.0, kind: i < 3 ? 0 : 1, ph: i }))), starPlumeMaterial(this.FU));
    this.flames.renderOrder = 5;
    this.flames.frustumCulled = false;
    rig.add(this.flames);
    this.engineGlow = noz.map((p, i) => { const s = glowSprite(new THREE.Color(0.7, 1.7, 2.6), 0.5, 0.8); s.position.copy(p).setZ(p.z + 0.05); s.renderOrder = 5; rig.add(s); return s; });
    // ---- lights it carries: one at each wing tip (magenta to port, cyan to starboard), a beacon on its back
    this.navLights = [["tipR", 0xff3ad4], ["tipL", 0x35efff]].map(([n, c]) => { const s = glowSprite(neon(c, 2.4), 0.3, 1); M.anchors[n].add(s); s.scale.setScalar(0.3 / S); return s; });
    this.beacon = glowSprite(neon(0xff3a2a, 3.2), 0.15, 0); // (a lamp: a point of light, not a patch of red on the canopy)
    at([0, 0.125, -0.2], this.beacon.position);
    rig.add(this.beacon);
    // ---- at warp: a bow wave of light off the nose
    this.bowMat = fighterBowMaterial();
    const dome = new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.rotateX(-Math.PI / 2);
    this.bow = new THREE.Mesh(dome, this.bowMat);
    this.bow.scale.set(2.1, 1.0, 2.6);
    this.bow.position.set(0, 0.05, 0.5);
    this.bow.renderOrder = 6;
    this.bow.visible = false;
    rig.add(this.bow);
    // ---- the shield: a shell of force, unseen until something lands on it (see starShellMaterial)
    this.shieldMat = starShellMaterial();
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), this.shieldMat);
    this.shield.scale.set(2.25, 1.0, 2.1);
    this.shield.position.set(0, 0.1, 0);
    this.shield.renderOrder = 7;
    this.shield.visible = false;
    rig.add(this.shield);
    // ---- vapour off the wing tips
    this.contrails = [0, 1].map(() => new Trail({ length: 18, width: 0.03, color: 0xbfe8ff, intensity: 0.7 }));
    this.contrails.forEach((t) => { g.scene.add(t.mesh); });

    // ---- what the game reads (all in the rig's frame): where the guns and the engines are; the glows it used to flicker itself are this ship's own now
    this.nozzles = noz.map((p) => p.clone().setZ(p.z + 0.02));
    this.muzzles = [at(M.info.anchors.muzzleR), at(M.info.anchors.muzzleL)]; // (port, starboard: the model's R is the ship's port once it is turned to fly away from the lens)
    this.engineGlows = [];
    this.wingLights = [];
    this.extras = [this.flames, this.bow, this.shield, this.beacon, ...this.engineGlow, ...this.navLights];

    this.shellT = 9; this.shellA = 0; this.shoveK = 0; this.litK = 0; this.litCol = new THREE.Color(); this.flashK = 0;
    this.heat = 0; this.heatTo = 0; this.rollV = 0; this.recoil = 0; this.gun = 0; this.kick = [0, 0]; this.waggle = 0; this.spinT = 0; this.spinDir = 1; this.acc = 0; this.shieldOn = 1;
    this.inT = REDUCED_MOTION ? 1 : 0; this.launched = false; this.hold = 0; // the fly-in
    this.hurt = 0; this.boom = -1; this.boost = 0; this.jolt = 0; this.joltX = 0; this.pow = 0; this.blink = 0; this.struck = 0; this.barrelHot = 0;
    this.gunCol = new THREE.Color(1, 0.8, 0.5);
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._c = new THREE.Color();
    rig.position.set(0, -1.6, this.inT < 1 ? 12.5 : 0); // (it waits behind the camera until the game starts)
    rig.rotation.x = STAR.TILT;
  }
  // ---- where things are on it, in the world (each fills `out` and returns it) --------------------------------
  // the mouth of a cannon (0: port, 1: starboard)
  muzzle(i, out) { return this.model.anchors[i ? "muzzleL" : "muzzleR"].getWorldPosition(out); }
  // the way a cannon points
  aim(out) { return out.set(0, 0, -1).transformDirection(this.rig.matrixWorld); }
  // an engine's nozzle (0 to 4: the three mains, then the two under them)
  exhaust(i, out) { return this.rig.localToWorld(out.copy(this.nozzles[i % this.nozzles.length])); }
  cockpit(out) { return this.model.anchors.cockpit.getWorldPosition(out); }
  nose(out) { return this.model.anchors.nose.getWorldPosition(out); }
  // a wing tip (0: port, 1: starboard)
  tip(i, out) { return this.model.anchors[i ? "tipL" : "tipR"].getWorldPosition(out); }
  // its middle, and how big it is drawn (for a blast, a shield hit)
  centre(out) { return this.rig.getWorldPosition(out); }

  // the game starts: it comes in from behind the camera, engines wide open
  launch() {
    if (this.launched) return;
    this.launched = true;
    if (this.inT < 1) Sound.sfx("whoosh");
  }
  // the guns fire: a kick back, the cannons slide in their mounts, the barrels heat. (gun: 0 port, 1 starboard, or both.)
  fire(col, pods, gun) {
    this.recoil = 1; this.gun = 1; this.flashK = 1;
    if (gun === undefined) this.kick[0] = this.kick[1] = 1; else this.kick[gun] = 1;
    this.barrelHot = Math.min(1.6, this.barrelHot + 0.45);
    if (col !== undefined) this.gunCol.set(col);
  }
  // a clean hit: a quick wing waggle and a burst of thrust (it surges ahead, engines long, and settles back)
  hit() { if (!REDUCED_MOTION && !GFX.calm) { this.waggle = 1; this.boost = 1; } }
  // a streak heats the engines: longer, whiter flames
  setCombo(c) { this.heatTo = clamp((c - 1) / 7, 0, 1); }
  // a shield is lost: its shell flares cyan at its edge three times (45 frames in all; the hull keeps its own
  // colours inside it), its lattice shows where the blow landed, and the ship is knocked aside (the roar pushes it
  // back instead: see shove)
  shieldLost(from, kind) {
    const u = this.shieldMat.uniforms;
    u.uHit.value = 1;
    u.uHitP.value.set(from ? clamp(-from.x, -0.6, 0.6) : rand(-0.4, 0.4), 0.55, -0.7).normalize();
    this.shellT = 0; this.shellA = 1;
    this.struck = 1;
    if (!REDUCED_MOTION && !GFX.calm && this.boom < 0 && this.inT >= 1 && kind !== 2) { const sd = u.uHitP.value.x < 0 ? -1 : 1; this.jolt = 1; this.joltX = -sd; this.rollV += sd * 4.5; }
  }
  // a shield comes back: one soft swell of the shell
  shieldUp() { this.shellT = 0.5; this.shellA = 0.7; }
  // the roar pushes it back
  shove(k = 1) { if (!REDUCED_MOTION && !GFX.calm) this.shoveK = k; }
  // a coloured light falls on its hull for a moment (the demon's beam crossing it)
  lit(col, k = 1) { this.litCol.set(col); this.litK = Math.max(this.litK, k); }
  // through the warp between waves: it banks one way and back (never edge-on: its shape is kept)
  warp() { if (!REDUCED_MOTION && !GFX.calm) { this.spinT = 1; this.spinDir = Math.random() < 0.5 ? -1 : 1; } }
  // the last shield is gone: it comes apart into its own thirteen parts, each thrown its own way, burning
  down() {
    const g = this.g, M = this.model, root = M.scene.children[0] || M.scene;
    this.contrails.forEach((t) => { t.mesh.visible = false; });
    this.extras.forEach((o) => { o.visible = false; });
    if (REDUCED_MOTION || this.inT < 1 || this.boom >= 0) { this.ship.visible = false; return; } // (still: it is simply gone)
    this.boom = 0;
    this.wreck = [];
    for (const n in M.mesh) {
      const h = this.P[n];
      if (!h || !M.mesh[n]) continue;
      root.attach(h); // (every part on its own now)
      const d = new THREE.Vector3(h.position.x + rand(-0.08, 0.08), h.position.y + rand(-0.02, 0.1), h.position.z * 0.6 + rand(-0.1, 0.1));
      if (d.lengthSq() < 0.002) d.set(rand(-0.3, 0.3), 0.4, rand(-0.3, 0.3));
      this.wreck.push({ h, v: d.normalize().multiplyScalar(rand(0.25, 0.7)), w: new THREE.Vector3(rand(-5, 5), rand(-5, 5), rand(-5, 5)) });
    }
  }
  update(dt, sp, w) {
    const g = this.g, d = VFX.dt, t = VFX.t, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm, h = Math.min(d, 0.05), U = this.U, FU = this.FU, P = this.P, k = g.shipScale;
    if (this.boom >= 0) { // it is gone: only the wreck moves
      this.boom += d;
      const b = this.boom;
      for (const q of this.wreck) {
        q.h.position.addScaledVector(q.v, d * Math.exp(-b * 0.9));
        q.h.position.z -= d * 0.22 * b; // (it falls behind: toward the lens)
        q.h.rotation.x += q.w.x * d; q.h.rotation.y += q.w.y * d; q.h.rotation.z += q.w.z * d;
      }
      U.uSkHot.value.setRGB(0.5, 1.7, 2.6).multiplyScalar(Math.exp(-b * 2.0)); // (its wreck glows the cyan of its own lights, white-hot at first: nothing here burns orange)
      U.uSkGone.value = this.UE.uSkGone.value = clamp((b - 0.25) / 1.9, 0, 1);
      U.uSkGlow.value.multiplyScalar(Math.pow(0.004, d)); this.UE.uSkGlow.value.multiplyScalar(Math.pow(0.004, d)); // its lights die with it
      if (b > 2.4) this.model.scene.visible = false;
      return;
    }
    this.heat = Motion.damp(this.heat, this.heatTo, 3, d);
    const heat = this.heat;
    // the fly-in: from behind and below the camera to its place, rolling level as it arrives
    if (!this.launched && this.inT < 1 && (this.hold += d) > 1) this.launch();
    if (this.launched && this.inT < 1) this.inT = Math.min(1, this.inT + d / 1.6);
    // a burst of thrust after a clean hit: out fast, back slowly
    this.boost = Math.max(0, this.boost - d / 1.1);
    const lunge = this.boost > 0 ? Math.sin(Math.PI * Math.pow(1 - this.boost, 0.5)) : 0;
    this.jolt = Math.max(0, this.jolt - d * 2.2);
    const inK = this.inT < 1 ? Math.pow(1 - this.inT, 3) : 0, burn = Math.max(w, Math.min(1.2, inK * 3), lunge * 0.85) + clamp((sp / 26 - 1) / 0.6, 0, 1) * 0.12;
    // hovering: a slow bob on two beats, the nose leading it a little, and a yaw that trails the bank
    const hov = quiet ? 0 : 1 - Math.min(1, inK * 3);
    const bob = (Math.sin(t * 1.9) * 0.085 + Math.sin(t * 3.1 + 1.3) * 0.028) * hov;
    // bank into the drift and the pointer; waggle after a hit; one full roll through the warp
    let roll = (quiet ? 0 : -Pointer.x * 0.5) - Math.cos(t * 0.9) * 0.12 * hov - Math.min(1, inK * 2.5) * 1.3;
    if (this.waggle > 0) { this.waggle = Math.max(0, this.waggle - d * 1.5); roll += Math.sin((1 - this.waggle) * Math.PI * 2) * 0.5 * this.waggle; }
    if (this.spinT > 0) {
      this.spinT = Math.max(0, this.spinT - d / 1.2);
      roll += this.spinDir * 0.6 * Math.sin((1 - this.spinT) * Math.PI * 2);
    }
    this.shoveK = Math.max(0, this.shoveK - d * 2.4);
    const jj = this.jolt * this.jolt, sh = Math.sin(Math.min(1, this.shoveK * 1.4) * Math.PI * 0.5) * this.shoveK; // (pushed back by the roar: out fast, back slowly)
    this.rollV += ((roll - rig.rotation.z) * 60 - this.rollV * 11) * h;
    rig.rotation.z += this.rollV * h;
    rig.rotation.x = Motion.damp(rig.rotation.x, STAR.TILT + (quiet ? 0 : Pointer.y * 0.1) + this.recoil * 0.075 - sh * 0.1 - Math.min(1, inK * 2) * 0.3 + Math.sin(t * 1.9 + 0.9) * 0.016 * hov - lunge * 0.06 + jj * 0.09, 6.3, d);
    rig.rotation.y = Motion.damp(rig.rotation.y, (-Math.sin(rig.rotation.z) * 0.22 + Math.sin(t * 0.7 + 0.6) * 0.03) * hov + jj * this.joltX * 0.25, 2.5, d);
    this.recoil *= Math.pow(0.004, d);
    this.gun *= Math.pow(0.02, d);
    this.struck = Math.max(0, this.struck - d * 3.5);
    rig.position.set(jj * this.joltX * 0.5, -inK * 1.6 + bob - jj * 0.22 - this.recoil * 0.12 - sh * 0.16, this.recoil * 0.18 + sh * 0.6 + inK * 12.5 - (quiet ? 0 : w * 0.5) - lunge * 0.85); // (it surges forward into the warp, and after a clean hit)
    // ---- its parts: the wings flex with the roll (the one it rolls toward lags) and breathe; the cannons slide back in
    // their mounts when they fire; the fins answer the roll; the engines point a little against a turn
    const rate = clamp(this.rollV, -6, 6), flap = (quiet ? 0 : Math.sin(t * 1.9 + 0.5) * 0.022 + lunge * 0.05 - Math.min(1, inK * 2) * 0.12) + heat * 0.01;
    if (P.wingL) P.wingL.rotation.set(0, -lunge * 0.05, -flap - rate * 0.035);
    if (P.wingR) P.wingR.rotation.set(0, lunge * 0.05, flap - rate * 0.035);
    for (let i = 0; i < 2; i++) {
      this.kick[i] *= Math.pow(0.0015, d);
      const c = P[i ? "cannonL" : "cannonR"];
      if (c) c.position.z = c.userData.rest.z - this.kick[i] * 0.05;
    }
    if (P.finL) P.finL.rotation.z = clamp(-rate * 0.12, -0.45, 0.45);
    if (P.finR) P.finR.rotation.z = clamp(-rate * 0.12, -0.45, 0.45);
    STAR.ENGINES.forEach((n, i) => { const e = P[n.replace("exhaust", "engine")]; if (e) e.rotation.set(clamp(rig.rotation.x - STAR.TILT, -0.2, 0.2) * -0.5, clamp(rate * 0.02, -0.08, 0.08), 0); });
    // ---- engines: they burn longer and whiter with the streak, the warp and a surge; the two under the mains answer a roll
    const turn = Math.min(0.5, Math.abs(this.rollV) * 0.3);
    this.hurt = Motion.damp(this.hurt, g.shields <= 1 && g.state !== "over" ? 1 : 0, 3, d);
    FU.uTime.value = t;
    FU.uLen.value.set(0.75 + heat * 0.5 + burn * 1.2, 0.7 + heat * 0.35 + burn * 0.9 + turn);
    FU.uPow.value.set(0.5 + heat * 0.3 + burn * 0.45, 0.42 + heat * 0.25 + burn * 0.35 + turn * 0.6);
    FU.uHurt.value = this.hurt;
    FU.uCool.value.setRGB(lerp(0.3, 0.8, heat), lerp(1.5, 1.9, heat), 3.0);
    const flick = 1 + (quiet ? 0 : Math.sin(t * 23) * 0.05 + Math.sin(t * 9.3) * 0.04);
    this.engineGlow.forEach((s, j) => {
      const hurt = j === 1 ? 1 - this.hurt * (0.5 + 0.4 * Math.sin(t * 11) * Math.sin(t * 4.3)) : 1, pw = (j < 3 ? FU.uPow.value.x : FU.uPow.value.y) * hurt;
      s.scale.setScalar((j < 3 ? 0.42 : 0.34) * (0.8 + 0.3 * pw) * flick);
      s.material.opacity = Math.min(0.85, 0.4 + 0.3 * pw);
    });
    this.UE.uSkGlow.value.setRGB(1, 1, 1).multiplyScalar(this.pow * (0.7 + 0.5 * FU.uPow.value.x) * flick); // the nozzles' own light follows the thrust
    U.uStHeat.value.setRGB(0.25, 1.0, 2.2).multiplyScalar(this.pow * (0.12 + heat * 0.35 + Math.min(1, burn) * 0.6));
    if (g.engineLight && this.ship.visible) { g.engineLight.intensity = (0.8 + 0.4 * Math.min(1, burn) + 0.3 * heat) * this.pow * flick; g.engineLight.color.setRGB(0.45, 0.8, 1.0); g.engineLight.distance = 6 * k + 2; }
    // ---- the barrels cool; its neon comes on as it arrives, burns brighter with the streak and the thrust, dims on its last shield
    this.barrelHot = Math.max(0, this.barrelHot - d * 0.9);
    U.uStGun.value.copy(this.gunCol).multiplyScalar(this.gun * 2.2).add(this._c.setRGB(2.6, 0.75, 0.16).multiplyScalar(Math.min(1, this.barrelHot)));
    this.pow = Motion.damp(this.pow, this.inT > 0.4 ? 1 : 0, 2.5, d);
    this.blink = g.el && g.el.dataset.blink ? Math.min(1, this.blink + d * 8) : Math.max(0, this.blink - d * 5);
    const bl = this.blink * (0.5 + 0.5 * Math.sin(t * 2.6 * Math.PI * 2)); // (after a hit it cannot be hit again for a moment: its edges pulse, under three times a second)
    U.uSkGlow.value.setRGB(1, 1, 1).multiplyScalar(this.pow * (0.85 + 0.35 * heat + 0.4 * lunge) * (1 - 0.3 * this.hurt * (0.5 + 0.5 * Math.sin(t * 5.0))));
    const rimK = 0.5 + 0.25 * heat + 0.3 * lunge, pano = g.pano;
    if (pano) { U.uSkRimA.value.copy(pano.rimA.color).multiplyScalar(rimK * 0.8); U.uSkRimB.value.copy(pano.rimB.color).multiplyScalar(rimK * 0.8); } else { U.uSkRimA.value.setRGB(0.55, 0.3, 1.5).multiplyScalar(rimK); U.uSkRimB.value.setRGB(0.16, 0.9, 1.5).multiplyScalar(rimK); }
    U.uSkKick.value.setRGB(0.55, 0.9, 1.15).multiplyScalar(1.1 * this.pow); // (cyan-white along its upper edges: its back stands clear of whatever is behind it)
    this.litK = Math.max(0, this.litK - d * 6); this.flashK = Math.max(0, this.flashK - d * 18);
    U.uSkHit.value.copy(this.litCol).multiplyScalar(this.litK * 0.9).add(this._c.setRGB(2.0, 0.4, 0.4).multiplyScalar(this.struck * this.struck * 0.3)); // (struck: a red rim for a moment. Its shell and the sparks off it say the rest; the hull itself keeps its colours.)
    U.uStFlash.value.copy(this.gunCol).multiplyScalar(this.flashK * 1.6); // (three frames of a shot's light on the plates beside the gun)
    U.uSkFill.value.copy(pano && pano.amb ? pano.amb.color : this._c.setRGB(0.35, 0.4, 0.6)).multiplyScalar(0.26 * this.pow); // (a fill in the region's own colour: its hull never falls into black)
    // lights: the beacon on its back (a soft pulse, well under 1 Hz), the wing tips
    this.beacon.material.opacity = Math.pow(Math.max(0, Math.sin(t * 2.6)), 8) * this.pow;
    this.navLights.forEach((s, j) => { s.material.opacity = (0.55 + 0.45 * Math.sin(t * 2.2 + j * Math.PI)) * this.pow; });
    this.bow.visible = w > 0.02 && !REDUCED_MOTION;
    this.bowMat.uniforms.uW.value = w * 0.8;
    this.bowMat.uniforms.uTime.value = t;
    // shield: fades with the shields left, glows with the streak, settles back to blue after a hit
    const su = this.shieldMat.uniforms;
    this.shellT += d;
    const swell = this.shellT >= 0.75 ? 0 : quiet ? 0.6 * (1 - this.shellT / 0.75) : (0.5 - 0.5 * Math.cos((this.shellT / 0.25) * Math.PI * 2)) * (1 - 0.3 * Math.floor(this.shellT / 0.25)); // three swells, each fainter (with Reduced effects: one glow that fades)
    su.uTime.value = t;
    su.uK.value = swell * this.shellA;
    su.uHit.value = Math.max(0, su.uHit.value - d * 1.6);
    this.shield.visible = su.uK.value > 0.004 || su.uHit.value > 0.004;
    rig.updateMatrixWorld(true);
    // (what the game reads, in the rig's frame: the cannons' mouths as they are now, flexed and slid)
    for (let i = 0; i < 2; i++) rig.worldToLocal(this.muzzle(i, this.muzzles[i]));
    if (inK < 0.5) GFX.heatAt(g.camera, this._v.set(0, 0.2, 2.6).applyMatrix4(rig.matrixWorld), 0.55 * k, 0.4 + 0.6 * Math.max(heat, Math.min(1, burn))); // (not while it is still behind the camera)
    // wingtip vapour trails, sampled at a fixed 60 Hz
    this.acc = Math.min(4 / 60, this.acc + d);
    while (this.acc >= 1 / 60) {
      this.acc -= 1 / 60;
      const step = Math.min(sp * 0.3, 9) / 60;
      this.contrails.forEach((tr, j) => {
        tr.width = 0.028 * k * (1 + heat + lunge);
        tr.shift(0, 0, step);
        tr.push(this.tip(j, this._v));
      });
    }
  }
  dispose() {
    blasterDropMaps(this.mats);
    this.mats.concat([this.flames.material, this.bowMat, this.shieldMat, this.beacon.material], this.engineGlow.map((s) => s.material), this.navLights.map((s) => s.material)).forEach((m) => m.dispose());
    this.contrails.forEach((t) => { this.g.scene.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.dispose(); });
  }
}
