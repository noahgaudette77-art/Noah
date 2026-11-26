// Nest Egg Run's war rig, when its model arrived (Assets.model("warrig"); without it 21b's car drives, as before):
// an armoured hauler in champagne-gold lacquer and gunmetal that carries the player's nest egg in a cradle of four
// claws on its rear deck. A wedge nose with cyan and magenta strips, two upright exhaust stacks behind the cab,
// off-road tyres with cyan hub rings, magenta frames of light at the rear. The model is eight rigid parts;
// everything it does is posed here. Look only: the game still owns which lane it is in and everything that scores.
//   car   lane position (the game drives this)
//   rig   steering yaw, and what the show adds: the drive-in, a knock and a slide, a surge, a spin (look only)
//   body  the sprung part of the model: heave over joints, roll in a lane change, squat under boost, dive under
//         braking (21b's spring model, carried over). The egg and the stacks ride it; the wheels stay on the road.
// Everything the old car did is done from the model's own anchors, through the functions under "where things are":
// headlight shafts in rain (head), tail lamps under braking and their ribbons (tail), exhaust glow, flames and heat
// (stack), tyre spray (hub), and the roof light bar's job, which was to show the car alive from behind: light runs
// along the rig's strips nose to tail, and its rear frames blink as hazards after a blow.
// Everything here runs on the show clock (VFX.dt), so a hit-stop holds it still and the rules never wait for it.
// (Its material is taught by the same recipe as Risk Blaster's models: blasterSkin, in 20j.)
const RIG = {
  S: 4.7, // game units to one model unit (the model is one unit long): 4.7 long, 2.6 over its tyres (the old car's width), 2.1 to the top of its egg
  RIDE: { exhaustL: "exhaustL", exhaustR: "exhaustR", tailL: "body", tailR: "body", headL: "body", headR: "body", roof: "body", hood: "body", egg: "egg" },
  TREE: { egg: "body", exhaustL: "body", exhaustR: "body" },
  WHEELS: ["wheelFL", "wheelFR", "wheelRL", "wheelRR"], // (L is the rig's own left, which is the left of the screen from behind)
  // where things are, if the model's notes do not say (the model's own frame: +y up, +z forward)
  AT: { exhaustL: [0.1458, 0.3926, 0.0315], exhaustR: [-0.1458, 0.3926, 0.0315], tailL: [0.165, 0.145, -0.495], tailR: [-0.165, 0.145, -0.495],
    headL: [0.115, 0.105, 0.45], headR: [-0.115, 0.105, 0.45], roof: [0, 0.37, 0.08], hood: [0, 0.21, 0.33], egg: [0, 0.3425, -0.2089] },
  HUBS: [[0.2092, 0.1054, 0.2345], [-0.2092, 0.1054, 0.2345], [0.2125, 0.107, -0.2955], [-0.2125, 0.107, -0.2955]],
  FLAME: [0xffb040, 0xff5a20], // what its stacks burn: gold at the root, orange-red at the tip (the sparks and the flash at the stack mouths take the gold)
};

// A tongue of fire: narrow at the mouth it comes from, fullest a fifth of the way along, drawn out to a point. It
// licks from side to side toward its tip and flickers in length. It is drawn as itself, not added to what is behind
// it: gold in its heart, orange, red at its tip and along its edge, so it keeps the colour of fire against a lit road
// and never reaches white. The mesh lies along +z, one unit long (uLen stretches it); its radius is the mesh's scale.
function rigFlameGeo() {
  const R = 14, M = 10, pos = [], nor = [], at = [], idx = [];
  for (let i = 0; i < R; i++) {
    const u = i / (R - 1), rr = (0.55 + 0.45 * smoothstep(0, 0.22, u)) * Math.pow(1 - u, 0.75);
    for (let j = 0; j < M; j++) { const a = (j / M) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); pos.push(c * rr, sn * rr, u); nor.push(c, sn, 0.3); at.push(u); }
  }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + ((j + 1) % M); idx.push(a, b, a + M, b, b + M, a + M); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aT", new THREE.Float32BufferAttribute(at, 1));
  g.setIndex(idx);
  return g;
}
function rigFlameMat(ph) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLen: { value: 1 }, uPow: { value: 0 }, uPh: { value: ph }, uWob: { value: 1 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute float aT; uniform float uTime; uniform float uLen; uniform float uPh; uniform float uWob; varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){
        vT = aT;
        vec3 p = position;
        float w = aT * aT * uWob;
        p.x += w * (0.55 * sin(uTime * 17.0 + aT * 7.0 + uPh) + 0.3 * sin(uTime * 41.0 + aT * 13.0 + uPh * 2.3));
        p.y += w * (0.45 * cos(uTime * 13.0 + aT * 6.0 + uPh * 1.7) + 0.25 * sin(uTime * 37.0 + aT * 11.0 + uPh));
        p.xy *= 1.0 + 0.12 * uWob * sin(uTime * 23.0 + aT * 9.0 + uPh * 3.1);
        p.z *= uLen * (0.88 + 0.08 * sin(uTime * 29.0 + uPh * 5.0) + 0.04 * sin(uTime * 53.0 + uPh));
        vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uTime; uniform float uPow; uniform float uPh; varying float vT; varying vec3 vN; varying vec3 vV;
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV)));                     // 1 down the middle of the tongue as it is seen, 0 at its edge
        float lick = 0.82 + 0.18 * sin(vT * 15.0 - uTime * 21.0 + uPh * 3.0); // brighter bands that run down it
        float heat = clamp((1.0 - vT) * (0.2 + 0.8 * f * f) * lick * 1.55, 0.0, 1.0);
        vec3 c = heat > 0.5 ? mix(vec3(1.25, 0.5, 0.07), vec3(1.3, 1.0, 0.5), (heat - 0.5) * 2.0) : mix(vec3(0.85, 0.08, 0.03), vec3(1.25, 0.5, 0.07), heat * 2.0);
        float a = smoothstep(0.0, 0.22, heat) * smoothstep(0.0, 0.4, f) * (1.0 - smoothstep(0.82, 1.0, vT));
        gl_FragColor = vec4(c, a * clamp(uPow, 0.0, 1.0));
      }`,
  });
}

class RacerRig {
  constructor(game, model) {
    const g = (this.g = game), S = RIG.S, v = new THREE.Vector3();
    const M = (this.model = rigModel(model, { ride: RIG.RIDE, tree: RIG.TREE }));
    const P = (this.P = M.parts), A = (this.A = M.anchors), info = M.info || {};
    // an anchor the notes did not list stands where the design puts it
    for (const n in RIG.AT) {
      if (A[n]) continue;
      const a = new THREE.Object3D(), host = P[RIG.RIDE[n]] || M.scene;
      host.updateWorldMatrix(true, false);
      a.position.copy(host.worldToLocal(v.fromArray(RIG.AT[n])));
      host.add(a);
      A[n] = a;
    }
    blasterBakeRest(M);
    const car = (this.car = new THREE.Group()), rig = (this.rig = new THREE.Group());
    rig.position.z = RACER_CAR_Z;
    car.add(rig);
    M.scene.rotation.y = Math.PI; // (the model's nose is +z: it drives down the road, -z)
    M.scene.scale.setScalar(S);
    rig.add(M.scene);
    for (const n of ["body", "egg", "exhaustL", "exhaustR"].concat(RIG.WHEELS)) if (P[n]) P[n].userData.rest = P[n].position.clone();
    // a point of the model at rest, in the rig's frame
    const at = (p, out) => (out || new THREE.Vector3()).set(-p[0] * S, p[1] * S, -p[2] * S);
    const note = (n) => at((info.anchors && info.anchors[n]) || RIG.AT[n]);
    const head = [note("headL"), note("headR")], mouth = [note("exhaustL"), note("exhaustR")];
    this.wheels = RIG.WHEELS.map((n, i) => {
      const h = P[n] || null, pv = (info.parts && info.parts[n] && info.parts[n].pivot) || RIG.HUBS[i];
      if (h && i < 2) h.rotation.order = "YXZ"; // (a front wheel steers about its upright, then spins on its axle)
      return { h, front: i < 2, y: 0, v: 0, at: at(pv), r: pv[1] * S };
    });
    this.track = Math.abs(this.wheels[2].at.x); this.axle = this.wheels[2].at.z; this.tyre = this.wheels[2].r;

    // ---- its lacquer and armour: what they mirror (the sky), how the neon burns, and what the game adds
    tuneModel(M, { glow: 2.0, metal: 1.0, rough: 1.0, normal: 0.85 }); // (its finishes are in its own maps: gold lacquer, gunmetal, rubber, a polished egg)
    const U = (this.U = blasterSkinUniforms());
    U.uSkAA.value = 1.3; U.uSkSpec.value = 0.75; U.uSkBurn.value.setRGB(4, 1.2, 2.4);
    U.uRgLamp = { value: new THREE.Vector4(0, 0, 0, 0) }; // (tail frames, head strips, the light that runs along its strips)
    U.uRgHeat = { value: new THREE.Color(0, 0, 0) }; // the mouths of the stacks, hot from a boost
    U.uRgTime = { value: 0 };
    U.uRgEgg = { value: new THREE.Color(0, 0, 0) };
    // the egg has its own light: its glow follows the nest egg, and polished gold takes a lamp's own glint
    this.UE = Object.assign({}, U, { uSkGlow: { value: new THREE.Color(1, 1, 1) }, uSkSpec: { value: 3.2 }, uSkAA: { value: 0.5 }, uSkFill: { value: new THREE.Color(0, 0, 0) }, uSkHit: { value: new THREE.Color(0, 0, 0) }, uRgEgg: { value: new THREE.Color(0, 0, 0) } });
    const PARS = "uniform vec4 uRgLamp; uniform vec3 uRgHeat; uniform float uRgTime; uniform vec3 uRgEgg;";
    const EM = `{
          float rgTail = (1.0 - smoothstep(-0.46, -0.38, vRest.z)), rgHead = smoothstep(0.34, 0.42, vRest.z);
          totalEmissiveRadiance *= 1.0 + uRgLamp.x * rgTail + uRgLamp.y * rgHead;
          totalEmissiveRadiance *= 1.0 + uRgLamp.z * sin(vRest.z * 44.0 + uRgTime * 5.0); // light runs along its strips, nose to tail
          vec3 rgS = vec3(abs(vRest.x) - 0.1458, (vRest.y - 0.385) * 0.55, vRest.z - 0.0315);
          totalEmissiveRadiance += uRgHeat * exp(-dot(rgS, rgS) * 800.0) * (0.3 + 0.7 * diffuseColor.g);
          totalEmissiveRadiance += uRgEgg * (0.3 + 0.7 * diffuseColor.g);
        }`;
    const meshes = [];
    M.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const base = (M.mesh.body || meshes[0]).material;
    // (its lacquer is champagne: under a cool sky it would go to silver, so what is warm in it is kept warm)
    const ALB = "{ float rgWarm = smoothstep(0.02, 0.14, diffuseColor.r - diffuseColor.b); diffuseColor.rgb = mix(diffuseColor.rgb, max(mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), diffuseColor.rgb, 1.45) * vec3(1.06, 1.0, 0.9), 0.0), rgWarm); }";
    this.mat = blasterSkin(base, U, { key: "rig", pars: PARS, emissive: EM, albedo: ALB });
    this.eggMat = blasterSkin(base.clone(), this.UE, { key: "rig", pars: PARS, emissive: EM, albedo: ALB });
    meshes.forEach((o) => { o.material = this.mat; });
    if (M.mesh.egg) M.mesh.egg.material = this.eggMat;
    this.mats = [this.mat, this.eggMat];
    if (g.pano) { g.pano.mirror(this.mat, 1.1); g.pano.mirror(this.eggMat, 1.55); } // (the sky is seen in the egg)
    else this.mats.forEach((m) => { m.envMap = g.env || null; m.envMapIntensity = 1.2; });
    // what the game keeps up to date when it has no panorama (its own small sky maps)
    this.paint = this.mat; this.glass = this.eggMat; this.wheelPaint = this.mat;

    // ---- what stands round it, in the rig's frame (it does not ride the springs)
    const fx = (this.fx = new THREE.Group());
    rig.add(fx);
    const H = Math.PI / 2;
    // headlight shafts in the rain, from the two light strips on its nose
    { const bm = new RacerBatch(), shaft = new THREE.CylinderGeometry(1.25, 0.13, 11, 12, 1, true);
      shaft.translate(0, 5.5, 0);
      head.forEach((h) => bm.add(shaft, racerM(h.x, h.y, h.z - 0.06, 1, 1, 1, -H - 0.035, 0, h.x * 0.03), 0xd8f2ff, 1));
      shaft.dispose();
      this.beams = new THREE.Mesh(bm.build(), new THREE.ShaderMaterial({
        uniforms: { uI: { value: 0.5 }, uZ0: { value: head[0].z - 0.06 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "attribute vec3 aCol; uniform float uZ0; varying vec3 vCol; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vCol = aCol; vT = clamp((uZ0 - position.z) / 11.0, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform float uI; varying vec3 vCol; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float rim = abs(dot(normalize(vN), normalize(vV))); float a = pow(max(1.0 - vT, 0.0), 1.7) * smoothstep(0.0, 0.06, vT) * rim * rim; gl_FragColor = vec4(vCol * a * uI, 1.0); }",
      }));
      this.beams.layers.set(1);
      fx.add(this.beams); }
    // fire (see rigFlameGeo): two tongues that trail straight back from each stack's mouth when it floors it; one pair
    // that licks up from the left stack on the last life; three that stand on the hood once the engine has gone
    this.flameGeo = rigFlameGeo();
    const fire = (list, at) => {
      const hold = new THREE.Group(), ms = list.map(([r, ph, x, y, k]) => {
        const m = new THREE.Mesh(this.flameGeo, rigFlameMat(ph));
        m.scale.set(r, r, 1); m.position.set(x || 0, y || 0, 0); m.userData.k = k || 1;
        m.frustumCulled = false; m.renderOrder = 5; m.layers.set(1);
        hold.add(m);
        return m;
      });
      if (at) hold.position.copy(at);
      hold.visible = false;
      fx.add(hold);
      return { hold, ms };
    };
    this.plumes = [0, 1].map((i) => {
      const p = fire([[0.27, i * 2.1], [0.16, 3.3 + i * 1.7, (i ? -1 : 1) * 0.1, 0.11, 0.62]], mouth[i]);
      p.glow = glowSprite(new THREE.Color(1.0, 0.42, 0.08), 0.5, 0); // (a small warm glow at the mouth: the tongue itself is the fire)
      p.glow.renderOrder = 5; p.glow.position.z = 0.3;
      p.hold.add(p.glow);
      return p;
    });
    this.burnF = fire([[0.36, 5.1], [0.21, 7.7, 0.18, 0, 0.62]], mouth[0]);
    this.wreckF = fire([[0.46, 1.3], [0.36, 4.2, 0.55, 0, 0.8], [0.3, 8.8, -0.5, 0, 0.66]], null);
    this.fireK = 0; this.ablaze = false; this.flare = 0; this.smokeT = 0; this.emberT = 0;
    // the light the flames throw: on the road behind it (a pool that flickers), and on its own deck and egg
    this.roadGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.roadGlow.rotation.x = -H; this.roadGlow.position.set(0, 0.07, 2.6); this.roadGlow.scale.set(6.4, 8.6, 1); this.roadGlow.renderOrder = 2; this.roadGlow.layers.set(1); this.roadGlow.visible = false;
    fx.add(this.roadGlow);
    this.flameLight = new THREE.PointLight(0xff9a3a, 0, 9, 2);
    this.flameLight.position.set(0, 2.3, 0.6);
    fx.add(this.flameLight);
    this.eggLight = new THREE.PointLight(0xffc860, 0, 4.2, 2); // the egg lights its own cradle
    this.eggHalo = glowSprite(new THREE.Color(1.0, 0.62, 0.2), 3.4, 0); // and stands in a soft glow of its own
    this.eggHalo.renderOrder = 4;
    fx.add(this.eggLight, this.eggHalo);
    // spray off the rear tyres: mist on a wet road, dust on a dry one
    { const N = 96, seed = new Float32Array(N), side = new Float32Array(N);
      for (let i = 0; i < N; i++) { seed[i] = (i + Math.random()) / N; side[i] = i % 2 ? 1 : -1; }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      sg.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      sg.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
      sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.6, 3), 6);
      this.spray = new THREE.Points(sg, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uI: { value: 0 }, uSpeed: { value: 30 }, uShear: { value: 0 }, uH: { value: 800 }, uColor: { value: new THREE.Color(0x9fc4e8) }, uAt: { value: new THREE.Vector2(this.track, this.axle + this.tyre * 0.9) } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; attribute float aSide; uniform float uTime; uniform float uI; uniform float uSpeed; uniform float uShear; uniform float uH; uniform vec2 uAt; varying float vA;
          void main(){
            float r1 = fract(aSeed * 91.7), r2 = fract(aSeed * 37.3);
            float life = fract(aSeed * 7.31 + uTime * (1.5 + r1 * 0.9));
            vec3 p = vec3(aSide * uAt.x + (r1 - 0.5) * 0.5 * (0.5 + life * 1.6) - uShear * life * 0.3,
              0.06 + life * (0.6 + r2 * 1.0) - life * life * 0.55,
              uAt.y + life * (0.9 + uSpeed * 0.045) * (0.55 + r2));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uH * (0.09 + 0.55 * life) * (0.55 + r1) / max(0.1, -mv.z);
            vA = uI * (1.0 - life) * (1.0 - life) * smoothstep(0.0, 0.06, life);
          }`,
        fragmentShader: "uniform vec3 uColor; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = max(0.0, 1.0 - d); gl_FragColor = vec4(uColor * (vA * a * a), 1.0); }",
      }));
      this.spray.layers.set(1);
      this.spray.frustumCulled = false;
      fx.add(this.spray); }
    // ribbons of light from the rear frames and the rear hubs: a lane change leaves a curve, a slide a hook
    this.trails = [
      { t: new RacerTrail({ length: 12, width: 0.085, color: 0xff3ad4, intensity: 0.8 }), a: A.tailL, step: 0.34 },
      { t: new RacerTrail({ length: 12, width: 0.085, color: 0xff3ad4, intensity: 0.8 }), a: A.tailR, step: 0.34 },
      { t: new RacerTrail({ length: 7, width: 0.07, color: 0x35efff, intensity: 1.0 }), w: 2, step: 0.2 },
      { t: new RacerTrail({ length: 7, width: 0.07, color: 0x35efff, intensity: 1.0 }), w: 3, step: 0.2 },
    ];
    // two rims of real light, one from each side (their colours are the sky's: see RacerSky)
    this.rimA = new THREE.DirectionalLight(0xff3ad4, 0); this.rimA.position.set(-9, 2.4, -3.5);
    this.rimB = new THREE.DirectionalLight(0x35efff, 0); this.rimB.position.set(9, 2.4, -3.5);
    // and a warm one from the lens's side: whatever of the rig faces the lens keeps its shape (a half-spin, the turn at the end, night)
    this.lensLight = new THREE.DirectionalLight(0xffd2a8, 0); this.lensLight.position.set(0, 4.5, 14);

    // ---- springs and the show's own motion (look only)
    this.heave = { x: 0, v: 0 }; this.roll = { x: 0, v: 0 }; this.pitch = { x: 0, v: 0 };
    this.eggR = { x: 0, v: 0 }; this.eggP = { x: 0, v: 0 }; this.whip = { x: 0, v: 0 };
    this.px = g.carX || 0; this.pvx = 0; this.psp = g.speed || 30;
    this.spin = 0; this.brake = 0; this.heat = 0; this.hazard = 0; this.flame = 0; this.burn = 0;
    this.nextBump = 18; this.rearBump = -1; this.rearHit = 0;
    this.wasBoost = false; this.wasState = ""; this.sparkT = 0; this.puffT = 0;
    this.inT = REDUCED_MOTION ? 1 : 0; this.launched = false; this.inBraked = false; // the drive-in
    this.knockT = -1; this.knockSd = 1; this.knockA = 0; this.knockKind = 0; this.surgeT = 0; this.cheerT = -1; this.wreckT = -1; this.wreckSd = 1;
    this.struck = 0; this.blink = 0; this.pow = 0; this.eggS = 1; this.eggPulse = 0; this.eggK = 0; this.hurt = 0;
    this.off = new THREE.Vector3(); this.yaw = 0; this.locked = false; // (off, yaw: where the show has put it, for the road's shadow and the stage)
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._c = new THREE.Color();
    // (the ribbons and the two rim lights stand in the scene itself: added last, so a model that fails leaves nothing behind)
    this.trails.forEach((tr) => g.scene.add(tr.t.mesh));
    g.scene.add(this.rimA, this.rimB, this.lensLight);
  }
  // ---- where things are on it, in the world (each fills `out` and returns it) -----------------------------------
  // the mouth of an exhaust stack (0: its left, the left of the screen; 1: its right)
  stack(i, out) { return this.A[i ? "exhaustR" : "exhaustL"].getWorldPosition(out); }
  // a rear frame of light (brake glow, the ribbons)
  tail(i, out) { return this.A[i ? "tailR" : "tailL"].getWorldPosition(out); }
  // a light strip on its nose (the headlight shafts)
  head(i, out) { return this.A[i ? "headR" : "headL"].getWorldPosition(out); }
  // the egg's middle, the cab's roof, the hood
  eggAt(out) { return this.A.egg.getWorldPosition(out); }
  roofAt(out) { return this.A.roof.getWorldPosition(out); }
  hoodAt(out) { return this.A.hood.getWorldPosition(out); }
  // a wheel's hub (0 front left, 1 front right, 2 rear left, 3 rear right), and where its tyre meets the road
  hub(i, out) { const w = this.wheels[i]; return w.h ? w.h.getWorldPosition(out) : this.rig.localToWorld(out.copy(w.at)); }
  contact(i, out) { this.hub(i, out); out.y = 0.04; return out; }
  // its middle, and the front of its nose
  centre(out) { return this.rig.localToWorld(out.set(0, 0.95, 0)); }
  nose(out) { return this.rig.localToWorld(out.set(0, 0.7, -2.25)); }

  // ---- what the show asks of it -----------------------------------------------------------------------------------
  // the game starts: it drives in from behind the lens, stacks burning, and brakes into its place
  launch() { this.launched = true; }
  // a right gate: it surges ahead on both stacks and settles back; the egg takes the deposit
  surge() { if (!REDUCED_MOTION && !GFX.calm) this.surgeT = 1; this.eggPulse = 1; this.heat = 1; }
  // a wrong lane: the knock, a half-spin on locked wheels, the catch. sd: which way its tail goes (-1 left, 1 right)
  knock(sd, hard = 1) {
    const q = REDUCED_MOTION || GFX.calm;
    this.knockT = 0; this.knockSd = sd; this.knockKind = 0; this.knockA = (q ? 0.3 : 1.7) * hard;
    this.pitch.v -= q ? 0.3 : 1.3; this.heave.v += q ? 0.2 : 0.7; this.roll.v += sd * (q ? 0.3 : 1.6); this.eggR.v += sd * 2.2; this.eggP.v -= 1.6; this.whip.v -= 2.5;
    this.struck = 1; this.hazard = 2.6; this.brake = 1; this.surgeT = 0;
  }
  // the policy took the blow: it is jolted and shimmies, and drives on
  shimmy(sd) {
    const q = REDUCED_MOTION || GFX.calm;
    this.knockT = 0; this.knockSd = sd; this.knockKind = 1; this.knockA = q ? 0.08 : 0.22;
    this.heave.v += q ? 0.2 : 0.55; this.roll.v += sd * (q ? 0.2 : 0.8); this.eggR.v += sd * 1.2; this.brake = 0.6;
  }
  // retirement at 65: a turn on the spot with both stacks alight, then away down the road toward the egg
  cheer() { this.cheerT = 0; this.eggPulse = 1; this.heat = 1; }
  // forced retirement: it slews to a stop, a stack falls, its lights die
  wreck(sd) { this.wreckT = 0; this.wreckSd = sd; this.brake = 1; this.hazard = 9; this.pitch.v -= 0.9; }
  // a wheel is thrown off (the wreck): it leaves the model and flies on its own. Returns the wheel, or null
  throwWheel(i, vel) {
    const w = this.wheels[i];
    if (!w || !w.h || w.gone) return null;
    w.gone = true;
    this.model.scene.attach(w.h);
    this.thrown = { h: w.h, v: vel.clone().multiplyScalar(1 / RIG.S), w: new THREE.Vector3(rand(8, 14), rand(-3, 3), rand(-6, 6)), t: 0, floor: w.r / RIG.S };
    return w.h;
  }

  // A damped spring, stepped once.
  spring(s, target, k, c, dt) { s.v += ((target - s.x) * k - s.v * c) * dt; s.x += s.v * dt; }
  // dt: the game's frame time; sp: road speed; step: metres travelled this frame; sky: the career's colours now
  update(dt, sp, step, sky) {
    const g = this.g, d = VFX.dt, t = VFX.t, h = Math.min(d, 1 / 30), U = this.U, UE = this.UE, P = this.P, S = RIG.S, rig = this.rig;
    const quiet = REDUCED_MOTION || GFX.calm, calm = quiet ? 0.45 : 1, n = g.round ? g.round.n : 4;
    // (the game holds its boost until the next question. A rig that has just been knocked, or has just had a claim paid, is not flooring it: its stacks go out)
    const boost = g.boostRate && !(g.stage && g.state !== "ask" && g.stage.verdict && !g.stage.verdict.ok) && !(g.state !== "ask" && g.quiz && g.quiz.sheet) ? 1 : 0; // (nor once the explanation is up: the surge is the gate's, the reading is quiet)
    const steer = clamp((g.lane === null ? 0 : laneX(g.lane, n)) - g.carX, -2.5, 2.5);
    // (the game lays a bob and a bank on the whole car each frame: the suspension below replaces them)
    this.car.position.y = 0; this.car.rotation.z = 0;
    // how its lane position is moving (the game moves it on its own clock)
    const idt = dt > 1e-5 ? 1 / Math.max(dt, 1 / 240) : 0;
    const vx = idt ? (g.carX - this.px) * idt : this.pvx;
    this.px = g.carX;
    const ax = idt ? clamp((vx - this.pvx) * idt, -60, 60) : 0;
    this.pvx = vx;
    const along = idt ? clamp((sp - this.psp) * idt, -400, 400) : 0;
    this.psp = sp;
    // ---- events the springs feel: a boost kicks the tail down, a new question's braking dips the nose
    if (boost && !this.wasBoost) { this.pitch.v += 0.5 * calm; this.heave.v -= 0.25 * calm; this.heat = 1; this.eggP.v += 1.2 * calm; this.whip.v += 2 * calm; }
    if (g.state !== this.wasState) {
      if (g.state === "explain") { this.heave.v += 0.45 * calm; this.rearBump = 0.06; }
      if (g.state === "ask") { this.pitch.v -= 0.35 * calm; this.brake = 1; this.eggP.v -= 0.8 * calm; }
    }
    this.wasBoost = !!boost; this.wasState = g.state;
    // ---- the show's own motion: the drive-in, a knock, a surge, the two endings
    let yaw = -steer * 0.045, ox = 0, oz = 0, burn = 0, locked = false, lift = 0;
    if (this.inT < 1) {
      if (this.launched) this.inT = Math.min(1, this.inT + d / 1.25);
      const k = this.inT, e = 1 - Math.pow(1 - k, 3);
      oz += 13.5 * (1 - e) - 1.25 * Math.sin(Math.PI * clamp((k - 0.42) / 0.58, 0, 1)); // past its mark, and back onto it
      burn = k < 0.7 ? 1 : 0;
      if (k >= 0.7 && !this.inBraked) { this.inBraked = true; this.pitch.v -= 0.7 * calm; this.brake = 1; this.eggP.v -= 1.4 * calm; }
    }
    if (this.surgeT > 0) {
      this.surgeT = Math.max(0, this.surgeT - d / 1.05);
      // out fast, back slowly. (Phase 4, 2026-11-25: sin(pi sqrt x) is steep without end at its start, and 39% of the
      // lunge came in its first frame before the hit-stop held it: a pop. Out over the first fifth on an ease-out,
      // 22% in the first frame and 40% by the second, its height at 0.21 s as near as it was; back on a cosine that
      // settles, where it stopped with a jolt)
      const sg = 1 - this.surgeT, lunge = sg < 0.2 ? 1 - Math.pow(1 - sg / 0.2, 3) : 0.5 + 0.5 * Math.cos((Math.PI * (sg - 0.2)) / 0.8);
      oz -= 1.15 * lunge;
      if (this.surgeT > 0.45) burn = 1;
    }
    if (this.knockT >= 0) {
      this.knockT += d;
      const kt = this.knockT, sd = this.knockSd;
      if (this.knockKind === 0) { // the knock: its tail steps out to a half-spin on locked wheels, it is caught and straightens with a wobble
        const u = Math.min(1, kt / 0.95), f = Math.sin(Math.PI * Math.pow(u, 0.62));
        yaw += sd * this.knockA * f + (kt > 0.8 ? sd * 0.12 * calm * Math.sin((kt - 0.8) * 17) * Math.exp(-(kt - 0.8) * 6) : 0);
        ox += sd * 0.6 * Math.sin(Math.PI * u) * (this.knockA / 1.7);
        oz += 1.1 * Math.sin(Math.PI * Math.min(1, kt / 0.8)) * (this.knockA / 1.7); // it falls back toward the lens and pulls away again
        locked = kt < 0.62;
        if (kt > 1.6) this.knockT = -1;
      } else { // the policy held: a shimmy
        yaw += sd * this.knockA * Math.sin(kt * 15) * Math.exp(-kt * 4.5);
        ox += sd * this.knockA * 0.8 * Math.sin(kt * 9) * Math.exp(-kt * 4);
        if (kt > 1.3) this.knockT = -1;
      }
    }
    if (this.cheerT >= 0) {
      this.cheerT += d;
      const ct = this.cheerT;
      burn = 1;
      if (!quiet) { const u = clamp((ct - 0.12) / 1.0, 0, 1); yaw += Math.PI * 2 * (u * u * (3 - 2 * u)); locked = u > 0 && u < 1; lift = 0.05 * Math.sin(Math.PI * u); }
      oz -= 1.1 * clamp(ct / 0.5, 0, 1) + 26 * Math.pow(clamp((ct - 1.2) / 0.9, 0, 1), 2); // then away, toward the egg on the horizon
    }
    if (this.wreckT >= 0) {
      this.wreckT += d;
      const wt = this.wreckT, u = clamp(wt / 0.7, 0, 1), e = 1 - Math.pow(1 - u, 3);
      yaw += this.wreckSd * (quiet ? 0.25 : 0.95) * e;
      ox += this.wreckSd * 0.5 * e; oz += 1.2 * e;
      locked = true;
    }
    this.off.set(ox, 0, oz); this.yaw = yaw; this.locked = locked; this.burn = burn;
    rig.rotation.y = yaw;
    rig.position.set(ox, 0, RACER_CAR_Z + oz);
    const sliding = Math.abs(yaw) > 0.12 || Math.abs(this.car.rotation.y) > 0.02;
    if (sliding) { this.hazard = Math.max(this.hazard, 2.6); this.brake = 1; }
    // ---- road joints: the front axle meets each one, then the rear a wheelbase later
    const W = this.wheels, run = sp * d;
    this.nextBump -= run;
    if (this.nextBump <= 0) {
      this.nextBump = rand(16, 42);
      const hit = rand(0.45, 0.95) * calm;
      this.heave.v += hit * 0.5; this.pitch.v += hit * 0.5;
      W[0].v += hit * 1.6; W[1].v += hit * 1.6;
      this.rearBump = 2.35 / Math.max(sp, 10); this.rearHit = hit;
      this.eggP.v += hit * 0.9; this.whip.v -= hit * 1.2;
    }
    if (this.rearBump >= 0 && (this.rearBump -= d) < 0) {
      const hit = this.rearHit || 0.4 * calm;
      this.heave.v += hit * 0.5; this.pitch.v -= hit * 0.7;
      W[2].v += hit * 1.6; W[3].v += hit * 1.6;
      this.rearHit = 0;
      this.eggP.v -= hit * 1.3; this.eggR.v += rand(-1, 1) * hit * 0.8;
    }
    if (d > 0) {
      const rough = (Math.sin(g.dist * 0.83) + Math.sin(g.dist * 1.97 + 1.3) * 0.6) * 0.0035 * clamp(sp / 40, 0.5, 2) * calm;
      const sag = this.wreckT >= 0 ? clamp(this.wreckT / 0.6, 0, 1) : 0;
      this.spring(this.heave, rough + lift - 0.05 * sag, 190, 13, h);
      // roll: thrown outward by the sideways acceleration of a lane change
      this.spring(this.roll, clamp(-ax * 0.0075 - vx * 0.012, -0.11, 0.11) * calm + this.wreckSd * 0.07 * sag, 120, 11, h);
      // pitch: squat under boost, dive under braking
      this.spring(this.pitch, clamp((boost || burn ? 0.04 : 0) - this.brake * 0.022 + along * 0.00012, -0.065, 0.065) * calm - 0.035 * sag + (this.cheerT >= 0 ? 0.03 : 0), 110, 10, h);
      // the egg rocks in its claws and settles (it is heavy: slow, and barely damped); the stacks whip a little behind the body
      this.spring(this.eggR, clamp(-ax * 0.0035 - vx * 0.008 + this.roll.x * 0.5, -0.07, 0.07) * calm, 70, 4.5, h);
      this.spring(this.eggP, clamp(along * 0.0001 - this.pitch.x * 0.6, -0.06, 0.06) * calm, 70, 4.5, h);
      this.spring(this.whip, clamp(-along * 0.0002 - this.pitch.x * 0.8, -0.1, 0.1), 260, 9, h);
    }
    if (P.body) { const b = P.body, r0 = b.userData.rest; b.position.set(r0.x, r0.y + this.heave.x / S, r0.z); b.rotation.set(-this.pitch.x, 0, -this.roll.x); }
    // ---- wheels: spin with the road (locked in a slide), the front pair steers into a lane change (and against a slide), each rides its own bump
    if (!locked) this.spin = (this.spin + run * 0.42) % (Math.PI * 2);
    const turn = clamp(-steer * 0.16 - (yaw + steer * 0.045) * 0.55, -0.55, 0.55);
    for (const w of W) {
      w.v += (-w.y * 900 - w.v * 38) * h;
      w.y = clamp(w.y + w.v * h, -0.02, 0.07);
      if (!w.h || w.gone) continue;
      const r0 = w.h.userData.rest;
      w.h.position.set(r0.x, r0.y + w.y / S, r0.z);
      w.h.rotation.x = this.spin;
      if (w.front) w.h.rotation.y = turn;
    }
    if (this.thrown) { // a wheel that has left it: it flies, lands, bounces and rolls away (in the model's own units)
      const q = this.thrown;
      q.t += d;
      q.v.y -= 9.8 * d / S * 1.0;
      q.h.position.addScaledVector(q.v, d);
      if (q.h.position.y < q.floor) { q.h.position.y = q.floor; q.v.y = Math.abs(q.v.y) * 0.45; q.v.x *= 0.8; q.v.z *= 0.8; q.w.multiplyScalar(0.7); }
      q.h.rotation.x += q.w.x * d; q.h.rotation.y += q.w.y * d; q.h.rotation.z += q.w.z * d;
    }
    // ---- the stacks shudder with the engine and whip behind the body; in the wreck one of them falls
    const rev = clamp(sp / 80, 0, 1.4), eng = quiet ? 0 : 0.5 + 0.6 * rev + 0.9 * this.flame;
    for (let i = 0; i < 2; i++) {
      const e = P[i ? "exhaustR" : "exhaustL"];
      if (!e) continue;
      let fall = 0;
      if (this.wreckT >= 0 && (this.wreckSd > 0 ? i === 0 : i === 1)) { const u = clamp((this.wreckT - 0.4) / 0.5, 0, 1); fall = 1.25 * (1 - Math.pow(1 - u, 2)) - 0.12 * Math.sin(Math.PI * clamp((this.wreckT - 0.9) / 0.3, 0, 1)); }
      e.rotation.set(-(this.whip.x + Math.sin(t * 33 + i * 2.1) * 0.02 * eng), 0, (i ? -1 : 1) * fall - this.roll.x * 0.6 + Math.sin(t * 27 + i * 1.3) * 0.016 * eng);
    }
    // ---- the egg: it rocks, it grows gently with the nest egg, it swells for a moment as a deposit lands, and it glows
    this.eggPulse = Math.max(0, this.eggPulse - d * 1.5);
    const frac = clamp(Math.log(Math.max(g.egg, EGG_START) / EGG_START) / Math.log(EGG_GOAL / EGG_START), 0, 1), pulse = Math.sin(Math.PI * Math.pow(1 - this.eggPulse, 0.6)) * (this.eggPulse > 0 ? 1 : 0);
    this.eggK = Motion.damp(this.eggK, frac, 1.5, d);
    this.eggS = Motion.damp(this.eggS, 1 + 0.11 * frac, 2, d);
    if (P.egg) { P.egg.rotation.set(-this.eggP.x, 0, -this.eggR.x); P.egg.scale.setScalar(Math.min(1.15, this.eggS * (1 + 0.035 * pulse))); }
    // ---- lamps
    this.brake = Math.max(0, this.brake - d * 1.1);
    this.heat = Math.max(boost || burn ? 1 : 0, this.heat - d * 0.35);
    this.hazard = Math.max(0, this.hazard - d);
    this.struck = Math.max(0, this.struck - d * 3);
    this.flame = Motion.damp(this.flame, boost || burn ? 1 : 0, 8.6, d);
    this.pow = Motion.damp(this.pow, this.inT > 0.05 || this.launched ? 1 : 0.35, 3, d);
    this.hurt = Motion.damp(this.hurt, g.crashes >= 2 && g.state !== "over" ? 1 : 0, 3, d);
    const lamps = sky ? sky.lamps : 1, dead = this.wreckT >= 0 ? clamp(1 - (this.wreckT - 0.5) / 0.9, 0.12, 1) : 1;
    const haz = this.hazard > 0 && !quiet ? 0.5 + 0.5 * Math.sin(t * 9.4) : this.hazard > 0 ? 0.6 : 0; // (1.5 Hz)
    U.uRgTime.value = t;
    U.uRgLamp.value.set(0.15 + 1.5 * smoothstep(0, 0.25, this.brake) + 1.3 * haz, 0.25 + 0.9 * lamps, quiet ? 0 : 0.16 + 0.12 * this.flame, 0);
    U.uRgHeat.value.setRGB(2.4, 0.8, 0.25).multiplyScalar(this.heat * this.heat * 1.3);
    const flick = this.hurt * (quiet ? 0.15 : 0.3 * (0.5 + 0.5 * Math.sin(t * 5.0) * Math.sin(t * 13.0)));
    U.uSkGlow.value.setRGB(1, 1, 1).multiplyScalar(this.pow * dead * (0.92 + 0.08 * Math.sin(t * 2.1) + 0.35 * this.flame) * (1 - flick));
    // the sky's rims, its kicker along the upper edges and its fill (the panorama's, or the career sky's own colours)
    const pano = g.pano;
    if (pano) {
      U.uSkRimA.value.copy(pano.L.rimL).multiplyScalar(0.5 * pano.N.rimL); U.uSkRimB.value.copy(pano.L.rimR).multiplyScalar(0.5 * pano.N.rimR);
      U.uSkKick.value.copy(pano.L.kick).multiplyScalar(0.75 * pano.N.kick); U.uSkFill.value.copy(pano.L.fill).multiplyScalar(0.3 * pano.N.fill);
      this.rimA.color.copy(pano.L.rimL); this.rimA.intensity = 0.55 * pano.N.rimL; this.rimB.color.copy(pano.L.rimR); this.rimB.intensity = 0.55 * pano.N.rimR;
    } else if (sky) {
      U.uSkRimA.value.set(RACER_LAMP[1]).multiplyScalar(0.3 + 0.25 * lamps); U.uSkRimB.value.set(RACER_LAMP[0]).multiplyScalar(0.3 + 0.25 * lamps);
      U.uSkKick.value.copy(sky.light).lerp(sky.horizon, 0.35).multiplyScalar(0.7); U.uSkFill.value.copy(sky.amb).multiplyScalar(0.45);
      this.rimA.color.set(RACER_LAMP[1]); this.rimB.color.set(RACER_LAMP[0]); this.rimA.intensity = this.rimB.intensity = 0.3 + 0.3 * lamps;
    }
    // struck: a red rim for a moment; and for a moment after it cannot be struck again: its edges pulse (under three times a second)
    this.blink = g.el && g.el.dataset.blink ? Math.min(1, this.blink + d * 8) : Math.max(0, this.blink - d * 5);
    const bl = this.blink * (quiet ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.6 * Math.PI * 2));
    U.uSkHit.value.setRGB(1.7, 0.14, 0.24).multiplyScalar(this.struck * this.struck * 0.34).add(this._c.setRGB(0.8, 0.95, 1.1).multiplyScalar(bl * 0.6)); // (rims only, and never white: its lacquer keeps its colours under them)
    // what faces the lens is never left black: a warm light from the lens's side as it turns (a half-spin, the turn at
    // the end), a little of it always; the blink after a blow lifts the whole rig (it brightens, it never darkens)
    const faced = 0.5 - 0.5 * Math.cos(this.yaw);
    this.lensLight.intensity = 0.14 + 0.85 * faced + 0.35 * bl;
    U.uSkFill.value.add(this._c.setRGB(1.0, 0.76, 0.54).multiplyScalar(0.05 + 0.18 * faced + 0.22 * bl));
    // the egg's own light
    const eg = this.pow * dead * (1 - 0.6 * flick), gl = 0.85 + 0.75 * this.eggK + 1.3 * pulse;
    UE.uSkGlow.value.setRGB(1, 1, 1).multiplyScalar(eg * gl);
    UE.uRgEgg.value.setRGB(1.0, 0.62, 0.16).multiplyScalar(eg * (0.1 + 0.1 * this.eggK + 0.5 * pulse));
    UE.uSkHit.value.copy(U.uSkHit.value).multiplyScalar(0.6);
    UE.uSkFill.value.copy(U.uSkFill.value).multiplyScalar(0.5);
    this.eggLight.intensity = eg * (0.5 + 0.9 * this.eggK + 2.4 * pulse);
    // ---- flames from both stacks, leaning back with the wind; their light on the road and on the deck
    const fl = this.flame * (quiet ? 1 : 0.9 + 0.1 * Math.sin(t * 16));
    const seen = 1 - smoothstep(3, 6.5, this.off.z); // (as it drives in from behind the lens, its fire's light is not thrown over the picture)
    this.car.updateMatrixWorld(true);
    const tongues = (p, len, pow, wob) => { for (const m of p.ms) { const u = m.material.uniforms; u.uTime.value = t; u.uLen.value = len * m.userData.k; u.uPow.value = pow; u.uWob.value = wob; } };
    this.plumes.forEach((p, i) => {
      p.hold.visible = this.flame > 0.02;
      if (!p.hold.visible) return;
      this.fx.worldToLocal(this.stack(i, p.hold.position));
      // each trails back from its stack's mouth with the wind, rising a little as fire does (dead level it would point
      // at the lens behind and above it, and be seen end on)
      p.hold.quaternion.setFromUnitVectors(this._w.set(0, 0, 1), this._v.set((i ? 1 : -1) * 0.1, 0.36 + (quiet ? 0 : 0.04 * Math.sin(t * 7 + i * 2)), 1).normalize());
      tongues(p, 1.2 + 2.6 * fl, Math.min(1, fl * 1.6), quiet ? 0.4 : 1);
      p.glow.scale.setScalar(0.45 + 0.3 * fl); p.glow.material.opacity = 0.3 * fl * seen;
    });
    // the last life: the left stack burns, a tongue that licks up and back
    this.burnF.hold.visible = this.hurt > 0.03 && this.wreckT < 0.3;
    if (this.burnF.hold.visible) {
      this.fx.worldToLocal(this.stack(0, this.burnF.hold.position));
      this.burnF.hold.quaternion.setFromUnitVectors(this._w.set(0, 0, 1), this._v.set(-0.2, 0.5 + (quiet ? 0 : 0.06 * Math.sin(t * 5.3)), 0.85).normalize());
      tongues(this.burnF, (1.25 + (quiet ? 0 : 0.15 * Math.sin(t * 9.1))) * (0.5 + 0.5 * this.hurt), Math.min(1, this.hurt * 1.5), quiet ? 0.5 : 1.4);
    }
    // the wreck: fire stands on its hood (it leaps as the engine goes, then burns steadily)
    this.fireK = Motion.damp(this.fireK, this.ablaze ? 1 : 0, 6.3, d);
    this.flare = Math.max(0, this.flare - d * 2.0);
    this.wreckF.hold.visible = this.fireK > 0.03;
    if (this.wreckF.hold.visible) {
      this.fx.worldToLocal(this.hoodAt(this.wreckF.hold.position));
      this.wreckF.hold.quaternion.setFromUnitVectors(this._w.set(0, 0, 1), this._v.set(0.1 * this.wreckSd, 1, 0.14).normalize());
      this.wreckF.hold.scale.setScalar(1 + 0.7 * this.flare);
      tongues(this.wreckF, (1.9 + (quiet ? 0 : 0.25 * Math.sin(t * 6.7))) * this.fireK * (1 + 0.9 * this.flare), Math.min(1, this.fireK * 1.4), quiet ? 0.5 : 1.3);
    }
    this.roadGlow.visible = this.flame > 0.02;
    this.roadGlow.material.color.setRGB(1.0, 0.42, 0.1).multiplyScalar(0.5 * fl * seen);
    this.flameLight.intensity = 2.6 * fl * seen + 1.6 * this.hurt * (this.wreckT < 0.3 ? 1 : 0) + 3.2 * this.fireK;
    this.eggLight.position.copy(this.fx.worldToLocal(this.eggAt(this._v)));
    this.eggHalo.position.copy(this.eggLight.position);
    this.eggHalo.material.opacity = Math.min(0.6, eg * (0.16 + 0.12 * this.eggK + 0.4 * pulse));
    // the shafts fade out as it turns away from the road ahead: in a spin they would sweep through the lens
    const ahead = Math.pow(Math.max(0, Math.cos(yaw)), 6);
    this.beams.material.uniforms.uI.value = GFX.opt.beams ? (0.08 + 0.26 * lamps) * (1 + this.flame * 0.5) * ahead * dead : 0;
    this.beams.visible = !!GFX.opt.beams && ahead > 0.02;
    // ---- spray
    const su = this.spray.material.uniforms, wet = sky ? sky.wet : 1;
    su.uTime.value = t; su.uSpeed.value = sp; su.uShear.value = vx; su.uH.value = GFX.h * GFX.scenePR();
    su.uI.value = (0.12 + 0.4 * wet) * clamp((sp - 12) / 40, 0, 1.6) * (sliding ? 2 : 1);
    if (sky && sky.dust) su.uColor.value.copy(sky.dust); else su.uColor.value.setHex(0x9fc4e8);
    // ---- what the stacks give off: a thread of smoke that trails back, sparks as a boost lights, heat that bends the picture
    const kit = g.kit;
    if (kit && d > 0 && !quiet && this.inT > 0.2) {
      if ((this.puffT -= d) <= 0) {
        this.puffT = this.flame > 0.3 ? 0.05 : 0.14;
        const i = Math.random() < 0.5 ? 0 : 1, p = this.stack(i, this._v);
        kit.smoke(p, { size: 0.3 + 0.25 * this.flame, life: 0.55, a: 0.2, cold: this.flame < 0.3, color: 0x5a5478, rise: 1.4, vel: this._w.set(rand(-0.3, 0.3), 1.2, 3.5 + sp * 0.06) });
      }
      // the last life's stack, and the wreck: dark smoke that streams back along the road, lit from under by its fire
      // while it is young (it leaves upward and to the side: it never lies over the rig); embers
      const burning = this.fireK > 0.4 ? 2 : this.hurt > 0.4 && this.wreckT < 0.3 ? 1 : 0;
      if (burning && (this.smokeT -= d) <= 0) {
        this.smokeT = burning === 2 ? 0.09 : 0.065;
        if (burning === 1) { // (low and to the left, over the road: it is seen against the lanes' light, and it never lies over the rig)
          const p = this.stack(0, this._v); p.x -= 0.35; p.y += 0.45; p.z += 0.5;
          kit.smoke(p, { size: 0.9, life: 1.0, a: 0.55, color: 0x3a3552, rise: 0.3, vel: this._w.set(rand(-3.2, -2.0), rand(0.2, 0.7), 2 + sp * 0.03) });
        } else {
          const p = this.hoodAt(this._v); p.y += 1.6;
          kit.smoke(p, { size: 1.0, life: 1.3, a: 0.5, color: 0x4a4466, rise: 2.0, vel: this._w.set(rand(-0.5, 0.5) + 0.5 * this.wreckSd, rand(1.2, 2.0), rand(0.8, 1.8)) });
        }
      }
      if (burning && (this.emberT -= d) <= 0) {
        this.emberT = 0.09;
        const p = burning === 1 ? this.stack(0, this._v) : this.hoodAt(this._v); p.y += 0.5;
        kit.embers(p, 0xff8a3a, { n: 2, radius: burning === 2 ? 0.5 : 0.2, life: 1.1, speed: 2.6, rise: 1.6 });
      }
      if (boost && this.flame < 0.6 && (this.sparkT -= d) <= 0) { this.sparkT = 0.05; kit.sparks(this.stack(Math.random() < 0.5 ? 0 : 1, this._v), RIG.FLAME[0], { n: 3, speed: 5, dir: this._w.set(0, 0.8, 0.6), spread: 0.6, life: 0.35, len: 0.4, w: 0.05, gravity: 6 }); }
    }
    if (GFX.opt.shimmer && !quiet && this.inT > 0.6) GFX.heatAt(g.camera, this.fx.localToWorld(this._v.set(0, 3.05, 1.7)), 0.85, 0.3 + 1.25 * Math.max(this.heat * 0.5, this.flame, this.hurt * 0.6)); // (the air over and behind the tongues swims, strongly enough to be seen; the rig under it is left as it is)
    // ---- ribbons ride the rear frames and hubs through lane changes and slides
    const tI = 0.62 * (0.8 + 0.5 * smoothstep(0, 0.3, this.brake)) * this.pow * dead; // (ribbons of light, not jets: they do not brighten with speed)
    for (const tr of this.trails) {
      if (tr.a) tr.a.getWorldPosition(this._v); else this.hub(tr.w, this._v);
      tr.t.follow(this._v, run, tr.step);
      tr.t.mesh.material.uniforms.uI.value = tI;
    }
  }
  dispose() {
    blasterDropMaps(this.mats);
    this.mats.forEach((m) => m.dispose());
    [...this.plumes, this.burnF, this.wreckF].forEach((p) => p.ms.forEach((m) => m.material.dispose()));
    this.flameGeo.dispose();
    this.trails.forEach((tr) => { this.g.scene.remove(tr.t.mesh); tr.t.mesh.geometry.dispose(); tr.t.mesh.material.dispose(); });
  }
}
