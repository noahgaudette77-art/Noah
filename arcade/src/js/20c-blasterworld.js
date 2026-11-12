// Risk Blaster's surroundings: the corridor's structure and traffic, the holo-drones
// that carry the answers, and the carrier that looms at the end of each wave. Look
// only: nothing here reads or changes the score, shields, timer or the questions.

// ---- holo-drones -----------------------------------------------------------------
// Four airframes, one per answer slot, so a target is known by its shape as well as
// its colour and letter. Each is wide rather than tall (the rows sit close together)
// and holds the glowing answer core in a hexagonal collar.
function blasterDroneGeo(shape, hex) {
  const B = new RacerBatch(), L = new RacerBatch();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const put = (b, geo, m, color, k = 1) => { b.add(geo, m, color, k); geo.dispose(); };
  const ring = (i, n) => new THREE.Matrix4().makeRotationZ((i / n) * Math.PI * 2);
  const deg = (d) => new THREE.Matrix4().makeRotationZ((d * Math.PI) / 180);
  // a slab drawn in [x, y] stands up facing the player, bevel forward
  const stand = (pts, t, bevel, z) => { const geo = blasterSlab(pts.map(([x, y]) => [x, -y]), t, bevel); geo.applyMatrix4(racerM(0, 0, z, 1, 1, 1, Math.PI / 2)); return geo; };
  const paint = new THREE.Color(hex).multiplyScalar(0.5).getHex();
  // collar: six armour plates round the core, three carrying the slot's colour, lit bolts at the corners
  for (let i = 0; i < 6; i++) {
    put(B, racerPlate(1.42, 0.2, 0.36, 0.05, true), ring(i, 6).multiply(racerM(0, 1.2, -0.1)), i % 2 ? BK.GUN : BK.PLATE);
    if (i % 2 === 0) B.add(box, ring(i, 6).multiply(racerM(0, 1.2, 0.09, 0.9, 0.11, 0.04)), paint);
    L.add(box, ring(i + 0.5, 6).multiply(racerM(0, 1.39, 0.1, 0.11, 0.11, 0.06)), 0xffffff, 1);
  }
  put(B, new THREE.CylinderGeometry(0.8, 0.6, 0.5, 8), racerM(0, 0, -0.55, 1, 1, 1, Math.PI / 2), BK.GUN); // housing behind the core
  L.add(box, racerM(0, -0.97, 0.1, 0.34, 0.07, 0.05), 0xffffff, 0.8); // sensor slit
  if (shape === 0) {
    // four rotor pods on swept arms
    [28, 152, 208, 332].forEach((a) => {
      B.add(box, deg(a - 90).multiply(racerM(0, 1.62, -0.1, 0.15, 0.62, 0.15)), BK.STEEL);
      put(B, new THREE.CylinderGeometry(0.36, 0.36, 0.4, 10), deg(a - 90).multiply(racerM(0, 2.02, -0.1, 1, 1, 1, Math.PI / 2)), BK.GUN);
      put(L, new THREE.TorusGeometry(0.29, 0.05, 4, 12), deg(a - 90).multiply(racerM(0, 2.02, 0.11)), 0xffffff, 1);
      B.add(box, deg(a - 90).multiply(racerM(0, 2.02, 0.1, 0.5, 0.05, 0.03)), BK.PALE);
    });
  } else if (shape === 1) {
    // a delta: two swept wings and a short dorsal fin
    [-1, 1].forEach((sd) => {
      put(B, stand([[sd * 1.15, 0.42], [sd * 2.35, -0.12], [sd * 2.35, -0.34], [sd * 1.15, -0.5]], 0.16, 0.04, -0.1), null, BK.PLATE);
      put(B, stand([[sd * 1.3, 0.2], [sd * 2.1, -0.1], [sd * 2.1, -0.22], [sd * 1.3, -0.1]], 0.2, 0, -0.1), null, paint);
      L.add(box, racerM(sd * 2.38, -0.23, -0.02, 0.07, 0.26, 0.1), 0xffffff, 1);
    });
    put(B, stand([[-0.3, 1.25], [0.3, 1.25], [0.1, 1.42], [-0.1, 1.42]], 0.14, 0, -0.1), null, BK.STEEL);
  } else if (shape === 2) {
    // twin booms: armoured side pods with light bars, a mast, a dish
    [-1, 1].forEach((sd) => {
      B.add(box, racerM(sd * 1.68, 0, -0.1, 0.8, 0.18, 0.18), BK.STEEL);
      put(B, racerPlate(0.5, 1.5, 0.56, 0.1, true), racerM(sd * 2.18, 0, -0.1), BK.PLATE);
      B.add(box, racerM(sd * 2.18, 0.5, 0.19, 0.4, 0.14, 0.04), paint);
      L.add(box, racerM(sd * 2.18, -0.1, 0.2, 0.08, 0.86, 0.04), 0xffffff, 1);
    });
    B.add(box, racerM(0, 1.5, -0.1, 0.05, 0.38, 0.05), BK.STEEL);
    L.add(box, racerM(0, 1.7, -0.1, 0.1, 0.1, 0.1), 0xffffff, 1.2);
  } else {
    // a saucer: an elliptical ring of nodes round the collar
    put(B, new THREE.TorusGeometry(2.05, 0.11, 5, 22), racerM(0, 0, -0.1, 1, 0.64, 1), BK.GUN);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 2.05, y = Math.sin(a) * 2.05 * 0.64;
      if (i % 2) L.add(box, racerM(x, y, -0.02, 0.2, 0.2, 0.14), 0xffffff, 1);
      else put(B, racerPlate(0.34, 0.34, 0.3, 0.07, true), racerM(x, y, -0.1), paint);
    }
    [0, 180].forEach((a) => B.add(box, deg(a - 90).multiply(racerM(0, 1.72, -0.1, 0.12, 0.5, 0.12)), BK.STEEL));
  }
  box.dispose();
  return { body: B.build("color"), lamps: L.build("color") };
}

// ---- the corridor ----------------------------------------------------------------
// Heavy ribs with energy pylons, light conduits, tumbling asteroids, laser chords,
// station blocks drifting by beyond the wall, and a director that sends something
// past every few seconds (a patrol of drones, a comet, a capital ship, a scan ring,
// a buoy, a surge of power). While a question is up, only the quiet ones.
class BlasterCorridor {
  constructor(game) {
    const g = (this.g = game), s = g.scene;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const put = (b, geo, m, color, k = 1, v) => { b.add(geo, m, color, k, v); geo.dispose(); };
    const ring = (i, n) => new THREE.Matrix4().makeRotationZ((i / n) * Math.PI * 2);
    this._v = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._m = new THREE.Matrix4();

    // ribs: twelve-sided frames every 24 units, clamps at the hexagon's corners, two pylons each
    const R = new RacerBatch(["aGlow"]);
    for (let i = 0; i < 12; i++) {
      put(R, racerPlate(6.95, 0.7, 1.4, 0.16, true), ring(i, 12).multiply(racerM(0, 12.78, 0)), 0x232a40);
      R.add(box, ring(i, 12).multiply(racerM(0, 12.4, 0, 5.0, 0.06, 0.14)), 0xffffff, 0.4, { aGlow: 1 });
      R.add(box, ring(i + 0.5, 12).multiply(racerM(0, 12.1, 0, 0.26, 1.25, 0.26)), 0x2a3350);
    }
    for (let i = 0; i < 6; i++) {
      put(R, racerPlate(1.5, 1.15, 1.9, 0.2, true), ring(i, 6).multiply(racerM(0, 12.42, 0)), 0x343d5e);
      R.add(box, ring(i, 6).multiply(racerM(0, 11.82, 0.96, 0.5, 0.1, 0.03)), 0xffffff, 1, { aGlow: 2 });
    }
    [0.5, 6.5].forEach((i) => {
      const m = ring(i, 12), at = (x, y, sx = 1, sy = 1, sz = 1, rz = 0) => m.clone().multiply(racerM(x, y, 0, sx, sy, sz, 0, 0, rz));
      put(R, racerPlate(1.3, 0.9, 1.3, 0.2, true), at(0, 12.2), 0x343d5e);
      put(R, new THREE.CylinderGeometry(0.36, 0.17, 2.7, 6), at(0, 10.55), 0x2a3350);
      [11.3, 10.6, 9.9].forEach((r, k) => put(R, new THREE.CylinderGeometry(0.42 - k * 0.07, 0.42 - k * 0.07, 0.14, 6), at(0, r), 0xffffff, 1, { aGlow: 3 }));
      put(R, new THREE.OctahedronGeometry(0.42, 0), at(0, 8.95, 1, 1.5, 1), 0xffffff, 1, { aGlow: 1 });
      [-1, 1].forEach((sd) => R.add(box, at(sd * 0.34, 9.25, 0.08, 0.8, 0.08, sd * 0.25), 0x6a7388));
    });
    this.ribMat = blasterHullMaterial({ wrap: true });
    this.ribs = new THREE.Mesh(blasterRepeat(R.build(), 7), this.ribMat);
    this.ribs.frustumCulled = false;
    s.add(this.ribs);
    g.decorCheap(this.ribs); // the weakest quality levels fly the bare tunnel

    // conduits: six lines of light along the wall, packets of energy running away down them
    const cb = new RacerBatch();
    for (let i = 0; i < 6; i++) [0, Math.PI / 2].forEach((ry) => put(cb, new THREE.PlaneGeometry(0.16, 196), ring(i + 0.5, 6).multiply(racerM(0, 12.62, -92, 1, 1, 1, Math.PI / 2, ry)), null));
    this.conduitMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), { uWave: { value: neon(WAVE_COLORS[0], 1) }, uTime: { value: 0 }, uSurgeZ: { value: 99 } }),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying float vZ; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vZ = w.z; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `${GLSL_FOG_PARS} uniform vec3 uWave; uniform float uTime; uniform float uSurgeZ; varying float vZ; varying float vDepth;
        void main(){
          float packet = pow(0.5 + 0.5 * sin(vZ * 0.21 + uTime * 2.6), 14.0);
          float surge = exp(-abs(vZ - uSurgeZ) * 0.09);
          float fade = smoothstep(1.0, 9.0, vDepth) * (1.0 - smoothstep(uFogNear, uFogFar, vDepth));
          gl_FragColor = vec4(mix(uWave, vec3(1.0), 0.25) * ((0.2 + 1.7 * packet + 2.6 * surge) * fade), 1.0);
        }`,
    });
    this.conduits = new THREE.Mesh(cb.build(), this.conduitMat);
    this.conduits.frustumCulled = false;
    s.add(this.conduits);

    // laser chords: a triangle of beams strung across three of the ribs, well clear of the lanes
    const lb = new RacerBatch(["aIdx"]);
    [1, 4].forEach((idx) => {
      const pts = [0, 1, 2].map((k) => new THREE.Vector3(Math.cos(Math.PI / 2 + (k * Math.PI * 2) / 3) * 12.3, Math.sin(Math.PI / 2 + (k * Math.PI * 2) / 3) * 12.3, 0));
      [0, 1, 2].forEach((k) => racerStrut(lb, box, pts[k], pts[(k + 1) % 3], 0.04, null, 1, { aIdx: idx }));
    });
    this.laserMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), { uColor: { value: neon(0xff3ad4, 0.55) }, uTime: { value: 0 }, uScroll: { value: 0 }, uSpin: { value: 0 } }),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aIdx; uniform float uScroll; uniform float uSpin; uniform float uTime; varying float vI; varying float vDepth;
        void main(){
          float a = aIdx * 0.5236 - uSpin * 0.35 + uTime * 0.06; float c = cos(a); float s = sin(a);
          vec3 p = vec3(c * position.x - s * position.y, s * position.x + c * position.y, position.z);
          float z = -aIdx * 24.0 - 12.0 + uScroll; p.z += 4.0 - mod(4.0 - z, 168.0);
          vI = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.9 + aIdx * 2.1));
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `${GLSL_FOG_PARS} uniform vec3 uColor; varying float vI; varying float vDepth;
        void main(){ gl_FragColor = vec4(uColor * (vI * smoothstep(6.0, 22.0, vDepth) * (1.0 - smoothstep(uFogNear, uFogFar, vDepth))), 1.0); }`,
    });
    this.lasers = new THREE.Mesh(lb.build(), this.laserMat);
    this.lasers.frustumCulled = false;
    s.add(this.lasers);
    g.decor(this.lasers);

    // asteroids: craggy rocks tumbling past between the lanes and the wall
    const rock = new THREE.IcosahedronGeometry(1, 1), rp = rock.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
      const hsh = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453, k = 0.7 + 0.55 * (hsh - Math.floor(hsh));
      rp.setXYZ(i, x * k * 1.25, y * k * 0.85, z * k);
    }
    rock.computeVertexNormals();
    this.rockMesh = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.05, flatShading: true }), 14);
    this.rockMesh.frustumCulled = false;
    this.rocks = [];
    const tint = new THREE.Color();
    for (let i = 0; i < 14; i++) {
      const r = { ax: new THREE.Vector3(), ph: rand(6.28) };
      this.resetRock(r, rand(-175, -10));
      this.rocks.push(r);
      this.rockMesh.setColorAt(i, tint.set(BK.ROCK).multiplyScalar(rand(0.7, 1.35)));
    }
    s.add(this.rockMesh);
    g.decorCheap(this.rockMesh);

    // station blocks beyond the wall: dark girders with lit windows, drifting by at half speed
    this.blockMat = new THREE.ShaderMaterial({
      uniforms: fogUniforms(),
      vertexShader: `varying vec3 vL; varying vec3 vN; varying float vDepth; varying float vSeed;
        void main(){
          vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vL = position * sc; vN = normal; vSeed = instanceMatrix[3].x;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `${GLSL_FOG_PARS} varying vec3 vL; varying vec3 vN; varying float vDepth; varying float vSeed;
        void main(){
          vec2 uv = abs(vN.x) > 0.5 ? vL.zy : (abs(vN.y) > 0.5 ? vL.xz : vL.xy);
          vec2 cell = floor(uv / vec2(1.7, 1.15));
          float r = fract(sin(dot(cell + vSeed, vec2(127.1, 311.7))) * 43758.5453);
          vec2 f = fract(uv / vec2(1.7, 1.15));
          float win = step(0.74, r) * step(0.2, f.x) * step(f.x, 0.8) * step(0.3, f.y) * step(f.y, 0.75);
          vec3 col = vec3(0.012, 0.014, 0.03) + win * mix(vec3(1.5, 1.1, 0.6), vec3(0.5, 1.2, 1.6), step(0.9, r)) * 0.9;
          gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear * 2.0, uFogFar * 1.7, vDepth)), 1.0);
        }`,
    });
    this.blockMesh = new THREE.InstancedMesh(box.clone(), this.blockMat, 8);
    this.blockMesh.frustumCulled = false;
    this.blocks = Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * 6.283 + rand(-0.25, 0.25), r: rand(21, 33), z: -260 + i * 40 + rand(-12, 12), s: [rand(3, 7), rand(3, 7), rand(28, 64)] }));
    s.add(this.blockMesh);
    g.decor(this.blockMesh);

    this.buildEvents();
    box.dispose();
  }
  resetRock(r, z) {
    r.a = rand(6.283); r.r = rand(6.6, 10.8); r.z = z; r.f = rand(0.55, 1.05); r.w = rand(0.2, 0.9);
    r.s = rand(0.3, 1.15);
    r.ax.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
  }

  // What can pass by. Everything keeps to the wall or stays outside it, away from the targets.
  buildEvents() {
    const g = this.g, s = g.scene;
    const D = (this.director = new EventDirector(g, { min: 4, max: 7 }));
    const hull = (this.eventMat = blasterHullMaterial({ fog: 0.6 }));
    const box = new THREE.BoxGeometry(1, 1, 1);
    const put = (b, geo, m, color, k = 1, v) => { b.add(geo, m, color, k, v); geo.dispose(); };
    // 1. a patrol of three escort drones overtakes along the wall
    const eb = new RacerBatch(["aGlow"]);
    put(eb, cyLoft([[-0.9, 0.2, 0.12, 0.06], [0.1, 0.3, 0.2, 0.09], [0.9, 0.06, 0.05, 0.02]]), BK_ROT, 0x3d4b72);
    [-1, 1].forEach((sd) => {
      put(eb, blasterSlab([[sd * 0.25, -0.3], [sd * 1.1, 0.5], [sd * 1.1, 0.75], [sd * 0.25, 0.7]], 0.07, 0.02), null, 0x26304e);
      eb.add(box, racerM(sd * 1.1, 0, 0.62, 0.05, 0.05, 0.3), 0xffffff, 1, { aGlow: 1 });
    });
    eb.add(box, racerM(0, 0, 0.93, 0.26, 0.18, 0.04), 0xffffff, 1, { aGlow: 2 });
    const escortGeo = eb.build();
    const squad = new THREE.Group();
    [[0, 0, 0], [-1.3, 0.25, 1.5], [1.3, 0.25, 1.5]].forEach((p) => { const m = new THREE.Mesh(escortGeo, hull); m.position.set(p[0], p[1], p[2]); squad.add(m); });
    squad.visible = false;
    s.add(squad);
    g.decor(squad);
    D.add({
      id: "patrol", dur: 6,
      start: (run) => { run.a = rand(6.283); run.dir = rand() < 0.5 ? -1 : 1; squad.visible = true; Sound.sfx("whoosh", Math.cos(run.a) * 0.7); },
      update: (dt, t, run) => {
        const a = run.a + run.dir * t * 0.3, z = 8 - t * 34;
        squad.position.set(Math.cos(a) * 8.8, Math.sin(a) * 8.8, z);
        squad.rotation.z = a + Math.PI / 2 + Math.sin(t * 1.4) * 0.2;
        return z > -190;
      },
      end: () => { squad.visible = false; },
    });
    // 2. a comet crosses beyond the wall
    const comet = glowSprite(neon(0x9fd8ff, 2.2), 5, 1), tail = new Trail({ length: 26, width: 0.9, color: 0x9fd8ff, intensity: 1.3 });
    comet.visible = tail.mesh.visible = false;
    s.add(comet, tail.mesh);
    g.decor(comet, tail.mesh);
    D.add({
      id: "comet", dur: 4,
      start: (run) => { run.sd = rand() < 0.5 ? -1 : 1; run.y = rand(14, 34); tail.pts = []; comet.visible = tail.mesh.visible = true; },
      update: (dt, t, run) => { comet.position.set(run.sd * (-85 + t * 48), run.y - t * 5, -185 + t * 6); tail.push(comet.position); return t < 3.6; },
      end: () => { comet.visible = tail.mesh.visible = false; },
    });
    // 3. a surge of power runs away down the conduits and pylons
    D.add({ id: "surge", dur: 2.2, update: (dt, t) => { this.surgeZ = 6 - t * 95; return t < 2.1; }, start: () => {}, end: () => { this.surgeZ = 99; } });
    // 4. a scan ring sweeps up the corridor toward the fighter
    const scan = new THREE.Mesh(new THREE.TorusGeometry(12.2, 0.09, 4, 36), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    scan.visible = false;
    s.add(scan);
    D.add({
      id: "scan", dur: 3,
      start: () => { scan.visible = true; },
      update: (dt, t) => { scan.position.z = -175 + t * 70; this.surgeZ = scan.position.z; scan.material.color.copy(g.waveCol).multiplyScalar(1.6 * smoothstep(0, 0.4, t) * smoothstep(2.6, 2.2, t)); return t < 2.6; },
      end: () => { scan.visible = false; this.surgeZ = 99; },
    });
    // 5. a capital ship crosses far ahead, beyond the wall
    const cap = new RacerBatch(["aGlow"]);
    put(cap, cyLoft([[-22, 1.2, 0.9, 0.5], [-10, 3.2, 2.2, 1.0], [8, 3.6, 2.6, 1.2], [20, 2.4, 1.8, 0.8]]), racerM(0, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2), 0x2a3350);
    put(cap, racerPlate(7, 3.4, 3, 0.6, true), racerM(9, 3.4, 0), 0x343d5e);
    put(cap, racerPlate(3, 2.6, 2, 0.4, true), racerM(11, 6.2, 0), 0x3d4b72);
    for (let i = 0; i < 16; i++) cap.add(box, racerM(-16 + i * 2.2, 0.4 + (i % 3) * 0.5, 2.3 + Math.min(i, 8) * 0.04, 0.9, 0.16, 0.1), 0xffffff, 1, { aGlow: 2 });
    cap.add(box, racerM(20.4, 0, 0, 0.3, 2.6, 2.6), 0xffffff, 1, { aGlow: 1 });
    cap.add(box, racerM(11, 7.8, 0, 0.3, 0.6, 0.3), 0xffffff, 1, { aGlow: 1 });
    const capital = new THREE.Mesh(cap.build(), blasterHullMaterial({ fog: 0.25 }));
    this.capitalMat = capital.material;
    capital.visible = false;
    capital.frustumCulled = false;
    s.add(capital);
    g.decor(capital);
    D.add({
      id: "capital", dur: 16,
      start: (run) => { run.sd = rand() < 0.5 ? -1 : 1; run.y = rand(20, 34); capital.visible = true; capital.rotation.y = run.sd > 0 ? Math.PI : 0; },
      update: (dt, t, run) => { capital.position.set(run.sd * (-95 + t * 13), run.y, -172); return t < 14.6; },
      end: () => { capital.visible = false; },
    });
    // 6. a navigation buoy drifts by on the wall, its lamp breathing
    const bb = new RacerBatch(["aGlow"]);
    put(bb, new THREE.OctahedronGeometry(0.6, 0), racerM(0, 0, 0, 1, 1.6, 1), 0x343d5e);
    put(bb, new THREE.TorusGeometry(0.75, 0.06, 4, 12), racerM(0, 0, 0, 1, 1, 1, Math.PI / 2), 0x6a7388);
    bb.add(box, racerM(0, 1.15, 0, 0.16, 0.3, 0.16), 0xffffff, 1, { aGlow: 2 });
    const buoy = new THREE.Mesh(bb.build(), hull), buoyGlow = glowSprite(neon(0xffe14f, 1.6), 2.4, 1);
    buoyGlow.position.y = 1.2;
    buoy.add(buoyGlow);
    buoy.visible = false;
    s.add(buoy);
    g.decor(buoy);
    D.add({
      id: "buoy", dur: 12,
      start: (run) => { run.a = rand(6.283); run.z = -170; buoy.visible = true; },
      update: (dt, t, run) => {
        run.z += this.sp * dt;
        buoy.position.set(Math.cos(run.a) * 10.4, Math.sin(run.a) * 10.4, run.z);
        buoy.rotation.set(0, t * 0.8, run.a - Math.PI / 2);
        buoyGlow.material.opacity = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 4.4), 3);
        return run.z < 8;
      },
      end: () => { buoy.visible = false; },
    });
    // 7. flak bursts outside the wall: only between questions
    D.add({
      id: "flak", big: true, flashy: true, dur: 1.6,
      start: (run) => { run.n = 0; },
      update: (dt, t, run) => {
        if (run.n < 2 && t > run.n * 0.7) {
          run.n++;
          const a = rand(6.283), p = this._v.set(Math.cos(a) * rand(17, 24), Math.sin(a) * rand(17, 24), rand(-90, -45));
          g.bursts.burst(p, COLORS.orange, { n: 46, speed: 12, size: 0.7, life: 1.0 });
          g.bursts.burst(p, 0xffffff, { n: 14, speed: 5, size: 0.5, life: 0.5 });
          g.boom(p.clone(), COLORS.orange, 16);
          Sound.sfx("boom", Math.cos(a) * 0.8);
        }
        return t < 1.5;
      },
    });
    this.surgeZ = 99;
    this.sp = 26;
    box.dispose();
  }

  update(dt, sp, w) {
    const g = this.g;
    this.sp = sp;
    const ru = this.ribMat.uniforms, src = g.ringMat.uniforms;
    ru.uScroll.value = g.ringScroll;
    ru.uSpin.value = g.spin;
    ru.uWave.value.copy(g.waveCol);
    ru.uFlash.value = src.uFlash.value;
    ru.uFlashZ.value = src.uFlashZ.value;
    ru.uFlashColor.value.copy(src.uFlashColor.value);
    ru.uSurgeZ.value = this.surgeZ;
    ru.uHot.value = w * 0.8;
    const cu = this.conduitMat.uniforms;
    cu.uWave.value.copy(g.waveCol);
    cu.uSurgeZ.value = this.surgeZ;
    this.conduits.rotation.z = g.wall.rotation.z;
    const lu = this.laserMat.uniforms;
    lu.uScroll.value = g.ringScroll;
    lu.uSpin.value = g.spin;
    this.eventMat.uniforms.uWave.value.copy(g.waveCol);
    this.capitalMat.uniforms.uWave.value.copy(g.waveCol);
    // rocks
    const m = this._m, q = this._q, v = this._v, sc = this._s;
    this.rocks.forEach((r, i) => {
      r.z += sp * r.f * dt;
      r.ph += r.w * dt;
      if (r.z > 10) this.resetRock(r, -178);
      const near = smoothstep(-178, -150, r.z); // they grow out of the dark rather than popping in
      this.rockMesh.setMatrixAt(i, m.compose(v.set(Math.cos(r.a) * r.r, Math.sin(r.a) * r.r, r.z), q.setFromAxisAngle(r.ax, r.ph), sc.setScalar(r.s * near)));
    });
    this.rockMesh.instanceMatrix.needsUpdate = true;
    // station blocks
    this.blocks.forEach((b, i) => {
      b.z += sp * 0.5 * dt;
      if (b.z > 70) b.z -= 330;
      this.blockMesh.setMatrixAt(i, m.compose(v.set(Math.cos(b.a) * b.r, Math.sin(b.a) * b.r, b.z), q.set(0, 0, Math.sin(b.a / 2), Math.cos(b.a / 2)), sc.set(b.s[0], b.s[1], b.s[2])));
    });
    this.blockMesh.instanceMatrix.needsUpdate = true;
    // a question on screen (or its explanation): quiet events only
    this.director.update(dt, g.state !== "intro");
  }
}

// ---- the carrier -----------------------------------------------------------------
// Each wave has a carrier holding station at the far end of the corridor: the drones
// are its brood. It answers a miss with a bolt at the shield, and when the wave is
// cleared it goes up, and the fighter jumps through the wreck. Three hull forms.
const BK_CARRIER_Y = 6.4; // it holds station above the lanes, so its eye is never mistaken for a target
class BlasterCarrier {
  constructor(game) {
    const g = (this.g = game);
    this.mat = blasterHullMaterial({ fog: 0.45 });
    this.group = new THREE.Group();
    this.group.position.set(0, BK_CARRIER_Y, -128);
    g.scene.add(this.group);
    this.bolt = makeBeam(0xff4d5a, 3.2);
    g.scene.add(this.bolt);
    this.fade = 0; this.hot = 0; this.tok = 0;
    this._v = new THREE.Vector3();
    this.build(1);
  }
  build(wave) {
    if (this.mesh) { this.group.remove(this.mesh); this.mesh.geometry.dispose(); }
    const v = (wave - 1) % 3, H = new RacerBatch(["aGlow"]);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const put = (geo, m, color, glow = 0) => { H.add(geo, m, color, 1, { aGlow: glow }); geo.dispose(); };
    const ring = (i, n) => new THREE.Matrix4().makeRotationZ((i / n) * Math.PI * 2);
    // a slab drawn in [x, y] stands up facing the fighter, bevel forward
    const stand = (pts, t, bevel, z) => { const geo = blasterSlab(pts.map(([x, y]) => [x, -y]), t, bevel); geo.applyMatrix4(racerM(0, 0, z, 1, 1, 1, Math.PI / 2)); return geo; };
    const mir = (pts, sd) => pts.map(([x, y]) => [x * sd, y]);
    const sx = [1, 0.72, 0.9][v], sy = [1, 1.4, 1.1][v];
    // core block, brow and jaw, the reactor eye behind six iris blades
    put(cyLoft([[-2.2, 2.6 * sx, 1.9 * sy, 0.7], [0, 3.1 * sx, 2.3 * sy, 0.9], [1.1, 2.4 * sx, 1.7 * sy, 0.7]]), racerM(0, 0, 0, 1, 1, 1, Math.PI / 2), 0x232a3c);
    put(racerPlate(4.6 * sx, 0.55, 0.7, 0.14, true), racerM(0, 1.72 * sy, 0.95, 1, 1, 1, -0.3), 0x343d5e);
    put(racerPlate(3.3 * sx, 0.45, 0.6, 0.12, true), racerM(0, -1.68 * sy, 0.85, 1, 1, 1, 0.3), 0x2a3350);
    put(new THREE.CircleGeometry(1.25, 18), racerM(0, 0, 1.12), 0x8a8a8a, 1);
    put(new THREE.CircleGeometry(0.5, 12), racerM(0, 0, 1.15), 0x9a9a9a, 2);
    for (let i = 0; i < 6; i++) H.add(box, ring(i, 6).multiply(racerM(0, 1.42, 1.2, 1.3, 0.5, 0.12, 0, 0, 0.36)), 0x10131c, 1, { aGlow: 0 });
    [-1, 1].forEach((sd) => {
      const wing = [
        [[2.4, 1.3], [8.6, 0.5], [8.9, -0.4], [6.5, -1.2], [2.4, -1.4]],
        [[1.9, 1.7], [5.3, 2.7], [5.8, 1.9], [4.3, -1.9], [1.9, -2.3]],
        [[2.2, 1.2], [6.8, 2.3], [7.7, 0.3], [6.7, -2.7], [5.5, -3.5], [5.9, -1.2], [5.0, 0.0], [2.2, -1.0]],
      ][v];
      put(stand(mir(wing, sd), 1.2, v === 2 ? 0 : 0.25, -0.4), null, 0x1c2134);
      const plate = [[[3.0, 0.9], [7.8, 0.3], [7.9, -0.25], [3.0, -1.0]], [[2.4, 1.3], [4.9, 2.0], [4.4, -1.3], [2.4, -1.7]], [[2.7, 0.8], [6.4, 1.7], [6.9, 0.3], [5.4, 0.3], [2.7, -0.6]]][v];
      put(stand(mir(plate, sd), 0.3, 0.08, 0.3), null, 0x343d5e);
      // hangar bay with its strip lights, a row of windows, a wingtip lamp
      const bay = [[3.6, 0.3, 2.4, 0.7], [2.7, 0.2, 1.5, 1.4], [3.2, 0.25, 2.0, 0.6]][v];
      H.add(box, racerM(sd * (bay[0] + bay[2] / 2), bay[1], 0.5, bay[2], bay[3], 0.08), 0x05060a, 1, { aGlow: 0 });
      [-1, 1].forEach((e) => H.add(box, racerM(sd * (bay[0] + bay[2] / 2), bay[1] + e * (bay[3] / 2 + 0.06), 0.52, bay[2], 0.05, 0.05), 0xffffff, 1, { aGlow: 2 }));
      for (let i = 0; i < 7; i++) H.add(box, racerM(sd * (2.9 + i * 0.55) * sx, -1.05 * sy + (v === 1 ? i * 0.1 : 0), 0.5, 0.2, 0.09, 0.05), 0xffffff, 1, { aGlow: 2 });
      const tip = [[8.75, 0.05], [5.55, 2.3], [7.25, 1.3]][v];
      H.add(box, racerM(sd * tip[0], tip[1], 0.3, 0.22, 0.5, 0.22), 0xffffff, 1, { aGlow: 1 });
      // armoured cheeks flanking the eye
      put(blasterSlab(mir([[1.5, 0.5], [2.3, 0.2], [2.3, -0.2], [1.5, -0.5]], sd), 2.6 * sy, 0.1), racerM(0, 0, 1.3), 0x2a3350);
    });
    // masts and a keel
    [[0, 2.3 * sy, 2.6], [-1.3 * sx, 2.1 * sy, 1.5], [1.3 * sx, 2.1 * sy, 1.5]].forEach(([x, y, hgt]) => {
      H.add(box, racerM(x, y + hgt / 2, -0.4, 0.12, hgt, 0.12), 0x343d5e, 1, { aGlow: 0 });
      H.add(box, racerM(x, y + hgt + 0.1, -0.4, 0.2, 0.2, 0.2), 0xffffff, 1, { aGlow: 1 });
    });
    put(stand([[-0.7, -2.2 * sy], [0.7, -2.2 * sy], [0.2, -2.2 * sy - 2.4], [-0.2, -2.2 * sy - 2.4]], 0.5, 0.1, -0.3), null, 0x1c2134);
    if (v === 1) put(stand([[-0.8, 2.9], [0.8, 2.9], [0.25, 6.4], [-0.25, 6.4]], 0.6, 0.12, -0.6), null, 0x232a3c);
    box.dispose();
    this.mesh = new THREE.Mesh(H.build(), this.mat);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
    this.group.visible = true;
    this.fade = 0;
    this.alive = true;
  }
  // a new wave's carrier comes up out of the dark
  arrive(wave) { this.build(wave); }
  // a miss: the carrier puts a bolt into the shield
  volley() {
    if (!this.alive) return;
    const g = this.g, tok = ++this.tok, from = this._v.copy(this.group.position).setZ(this.group.position.z + 1.5).clone(), to = g.ship.position.clone();
    this.hot = 1;
    aimBeam(this.bolt, from, to, 0.14);
    this.bolt.material.uniforms.uFade.value = 1;
    g.tw.add(0.32, (k) => { if (this.tok === tok) this.bolt.material.uniforms.uFade.value = 1 - k; }, () => { if (this.tok === tok) this.bolt.visible = false; });
  }
  // the wave is cleared: it goes up
  destroy() {
    if (!this.alive) return;
    this.alive = false;
    const g = this.g, p = this.group.position.clone(), col = g.waveCol.clone();
    this.hot = 2;
    g.bursts.burst(p, col.getHex(), { n: 120, speed: 30, size: 1.5, life: 1.3 });
    g.bursts.burst(p, 0xffffff, { n: 50, speed: 14, size: 1.1, life: 0.7 });
    g.shockwave(p.clone(), col.clone().multiplyScalar(2.2), 34, 0.8);
    g.shards.burst(p, col.getHex(), 22, 3, 46);
    g.boom(p, col.getHex(), 40);
    g.tw.wait(0.16, () => { if (!this.alive) this.group.visible = false; });
  }
  update(dt) {
    const g = this.g, u = this.mat.uniforms;
    this.fade = Math.min(1, this.fade + dt / 2.4);
    this.hot = Math.max(0, this.hot - dt * 1.6);
    u.uFade.value = this.fade * this.fade;
    u.uHot.value = this.hot + 0.25 * Math.sin(g.t * 2.2); // the eye breathes
    u.uWave.value.copy(g.waveCol);
    u.uFlash.value = g.ringMat.uniforms.uFlash.value * 0.4;
    u.uFlashZ.value = this.group.position.z;
    this.group.position.set(0, BK_CARRIER_Y + Math.sin(g.t * 0.5) * 0.25, -128 - (1 - this.fade) * 30);
    this.group.rotation.z = Math.sin(g.t * 0.3) * 0.03;
  }
}
