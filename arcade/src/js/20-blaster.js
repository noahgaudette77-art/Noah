// RISK BLASTER — a rail shooter. Each answer is a target flying down a neon
// tunnel; shoot the right one before the targets reach your shields.
const WAVE_COLORS = [0xff3ad4, 0x35efff, 0xffe14f, 0x86ff5e, 0xa65fff, 0xff9b3d];
const WAVE_LEN = 10;
// The tunnel: hex rings every BLASTER_GAP units, recycled as they pass the camera.
const BLASTER_RINGS = 14;
const BLASTER_GAP = 12;
const BLASTER_R = 12;

// Merge parts ({ geo, matrix, color }) into one non-indexed geometry with a
// per-vertex colour, so a detailed model costs one draw call. Also used by BOSS RUSH.
function blasterMerge(parts) {
  const pos = [], nor = [], col = [], uv = [];
  const c = new THREE.Color();
  for (const { geo, matrix, color } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    g.computeVertexNormals();
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    if (color && color.isColor) c.copy(color); else c.set(color === undefined ? 0xffffff : color);
    const t = g.attributes.uv ? g.attributes.uv.array : null;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) { col.push(c.r, c.g, c.b); uv.push(t ? t[i * 2] : 0, t ? t[i * 2 + 1] : 0); }
    g.dispose();
    geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

// A round answer badge: dark disc, ring in the slot colour, a big white letter.
// Readable over any background, at any distance.
function blasterBadge(text, color) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  x.beginPath();
  x.arc(64, 64, 47, 0, Math.PI * 2);
  x.fillStyle = "rgba(9, 3, 28, 0.86)";
  x.fill();
  x.shadowColor = color;
  x.shadowBlur = 16;
  x.lineWidth = 7;
  x.strokeStyle = color;
  x.stroke();
  x.shadowBlur = 8;
  x.fillStyle = "#ffffff";
  x.font = '46px "Press Start 2P", "Courier New", monospace';
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(text, 67, 68);
  return new THREE.CanvasTexture(c);
}

// Tumbling crystal shards for explosions: one pooled instanced mesh, lit by a
// cheap flat-shading shader in HDR colours. Also used by BOSS RUSH.
class BlasterShards {
  constructor(scene, cap = 48) {
    const g = new THREE.TetrahedronGeometry(0.3, 0);
    g.scale(0.6, 1.6, 0.35);
    const mat = new THREE.ShaderMaterial({
      extensions: { derivatives: true },
      vertexShader: `varying vec3 vV; varying vec3 vC;
        void main(){
          vC = vec3(1.0);
          #ifdef USE_INSTANCING_COLOR
            vC = instanceColor;
          #endif
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vV = mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vV; varying vec3 vC;
        void main(){
          vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
          float l = max(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0);
          float rim = pow(1.0 - abs(dot(n, normalize(-vV))), 2.0);
          gl_FragColor = vec4(vC * (0.3 + 1.2 * l + 1.4 * rim), 1.0);
        }`,
    });
    this.mesh = new THREE.InstancedMesh(g, mat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.list = Array.from({ length: cap }, () => ({ age: 1, life: 0, s: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < cap; i++) { this.mesh.setMatrixAt(i, zero); this.mesh.setColorAt(i, white); }
    scene.add(this.mesh);
    this.live = false;
    this._q = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
    this._s = new THREE.Vector3();
  }
  burst(pos, color, n, size = 1, speed = 9, gravity = 0) {
    const c = neon(color, 1.7);
    let k = 0;
    this.list.forEach((sh, i) => {
      if (k >= n || sh.age < sh.life) return;
      k++;
      sh.age = 0;
      sh.life = rand(0.7, 1.3);
      sh.s = size * rand(0.6, 1.4);
      sh.g = gravity;
      sh.p.copy(pos);
      sh.v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.4, 1));
      sh.r.set(rand(6.28), rand(6.28), rand(6.28));
      sh.w.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
      this.mesh.setColorAt(i, c);
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.live = true;
  }
  update(dt) {
    if (!this.live) return;
    let live = false;
    const drag = Math.pow(0.3, dt);
    this.list.forEach((sh, i) => {
      if (sh.age >= sh.life) return;
      sh.age += dt;
      const k = Math.min(1, sh.age / sh.life);
      sh.p.addScaledVector(sh.v, dt);
      sh.v.multiplyScalar(drag);
      sh.v.y -= sh.g * dt;
      sh.r.set(sh.r.x + sh.w.x * dt, sh.r.y + sh.w.y * dt, sh.r.z + sh.w.z * dt);
      const sc = sh.s * (1 - k * k);
      this._m.compose(sh.p, this._q.setFromEuler(sh.r), this._s.set(sc, sc, sc));
      this.mesh.setMatrixAt(i, this._m);
      live = true;
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    this.live = live;
  }
  dispose() { if (this.mesh.dispose) this.mesh.dispose(); }
}

class BlasterGame extends QuizGame {
  constructor(sel) {
    super(sel, "blaster", { fov: 60, fog: [0x07021a, 22, 135], bg: 0x05010f });
    this.picker = new QuestionPicker(selectionQids(sel));
    this.score = 0;
    this.combo = 1;
    this.shields = 3;
    this.wave = 1;
    this.inWave = 0;
    this.speed = 26;
    this.targets = [];
    this.fx = 3; this.fy = 1.6; this.ts = 1; this.shipY = -2.2; this.shipScale = 1;
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="score"><small data-wave>WAVE 1</small><span data-score>000000</span></div>
        <div class="grow"></div>
        <div class="combo-box"><span class="combo" data-combo>x1</span><span class="combo-meter" data-meter>${"<i></i>".repeat(7)}</span></div>
        <div class="lives" data-lives></div>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="timer"><i></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
      <div class="hint">${this.frog ? "TAP YOUR ANSWER TO OPEN FIRE" : "TAP A TARGET, OR ITS ANSWER"}</div>
    </section>`);
    this.lives(this.shields, 3);
    // Shoot by touching a target in the tunnel: the nearest one to the finger. (With one big frog
    // for an enemy there are no targets to choose between: the answers are picked below.)
    this.bandEl.addEventListener("pointerdown", (e) => {
      if (this.state !== "ask" || this.paused || !this.has3D || !e.isPrimary) return;
      let best = -1, bd = Math.max(70, GFX.w * 0.16);
      this.targets.forEach((t, i) => {
        const v = this._v.copy(t.position).project(this.camera);
        const d = Math.hypot((v.x * 0.5 + 0.5) * GFX.w - e.clientX, (0.5 - v.y * 0.5) * GFX.h - e.clientY);
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) this.pick(best);
    });
  }

  build3D() {
    const s = this.scene;
    s.userData.post = { exposure: 1.12, bloom: 1.15, threshold: 0.95, saturation: 1.16, contrast: 1.08, vignette: 1.15 };
    this.env = makeEnvMap({
      top: 0x12052e, horizon: 0xff3ad4, bottom: 0x04010c, glow: 1.1,
      panels: [
        { color: 0x35efff, pos: [14, 4, -8], w: 12, h: 3, k: 3 },
        { color: 0xff3ad4, pos: [-14, 6, -4], w: 12, h: 3, k: 3 },
        { color: 0xffe14f, pos: [2, 16, 6], w: 8, h: 2, k: 2.4 },
        { color: 0xa65fff, pos: [-4, -10, 12], w: 14, h: 4, k: 2 },
        { color: 0xffffff, pos: [6, 8, 14], w: 5, h: 1.4, k: 4 },
      ],
    });
    // What the fighter's hull reflects: the tunnel's neon as accents round a white lamp
    // above and behind it, so its own paint reads (the tunnel's map would wash it magenta).
    this.shipEnv = makeEnvMap({
      top: 0x0b0d1e, horizon: 0x4a3a8c, bottom: 0x06050e, glow: 0.5,
      panels: [
        { color: 0xffffff, pos: [3, 14, 10], w: 12, h: 5, k: 3.2 },
        { color: 0x35efff, pos: [16, 3, -6], w: 10, h: 3, k: 2.2 },
        { color: 0xff3ad4, pos: [-16, 4, -4], w: 10, h: 3, k: 2.2 },
        { color: 0xffa040, pos: [0, -4, 14], w: 8, h: 3, k: 1.6 },
        { color: 0xa65fff, pos: [0, -12, -8], w: 14, h: 4, k: 1.0 },
      ],
    });
    addLights(s, { ambient: 0x5a4aa0, ai: 0.6, key: 0xe0d8ff, ki: 1.1, dir: [2, 5, 6] });
    this.boomLight = new THREE.PointLight(0xffffff, 0, 36, 2);
    s.add(this.boomLight);
    this.engineLight = new THREE.PointLight(COLORS.orange, 1.4, 5, 2);
    s.add(this.engineLight);
    // Deep space: the sky dome is tipped so its zenith (stars + nebula) sits at
    // the end of the tunnel, with a soft galactic glow at the vanishing point.
    this.sky = makeSky({ top: 0x050113, mid: 0x0a0326, horizon: 0x6a1a8a, bottom: 0x050113, glow: 0, stars: 1.25, nebula: 0.62, nebulaColor: 0x1d64c8 });
    this.sky.rotation.x = -Math.PI / 2;
    s.add(this.sky);
    // a ringed giant hangs beyond the tunnel wall
    this.planet = makePlanet({ radius: 23 });
    this.planet.position.set(50, 36, -215);
    s.add(this.planet);
    this.decor(this.planet);
    this.coreBase = neon(0x7b3dff, 0.55);
    this.core = glowSprite(this.coreBase, 150, 0.6);
    this.core.position.set(0, 0, -340);
    s.add(this.core);
    this.waveCol = neon(WAVE_COLORS[0], 1);
    this.waveTarget = this.waveCol.clone();
    this.makeStreaks();
    this.makeTunnel();
    this.makeTargetKit();
    this.corridor = new BlasterCorridor(this); // ribs, pylons, conduits, rocks, lasers, passing traffic
    this.director = this.corridor.director;
    // the wave's carrier, far down the corridor (when the frog is the wave's enemy, there is none)
    this.carrier = this.frog ? { update() {}, arrive() {}, destroy() {}, volley() {} } : new BlasterCarrier(this);
    // a stand-in of every target material, drawn once off-screen at start (GFX.warm)
    this.warmExtra = this.frog ? [] : this.slotMats.map((M, i) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(this.tgeo[0], M.core), new THREE.Mesh(this.tgeo[0], M.body), new THREE.LineSegments(this.tedge[0], M.edge), new THREE.Mesh(this.tgeo[0], M.rim), new THREE.Sprite(M.halo));
      g.add(new THREE.Mesh(this.drones[i].body, this.dronePaint), new THREE.Mesh(this.drones[i].lamps, M.lamp));
      g.position.z = -40;
      return g;
    });
    this.shards = new BlasterShards(s);
    this.ship = this.makeShip();
    s.add(this.ship);
    this.trails = [0, 1].map(() => new Trail({ length: 12, width: 0.07, color: 0xff7a3d, intensity: 2 }));
    this.trails.forEach((t) => s.add(t.mesh));
    this.flashSprite = glowSprite(0xffffff, 1, 0);
    this.flashSprite.visible = false;
    this.flashSprite.renderOrder = 8;
    s.add(this.flashSprite);
    // one beam and muzzle flash per gun, reused for every shot
    this.shotFX = [0, 1].map(() => {
      const fx = { beam: makeBeam(SLOT_COLORS[0], 3.6), flash: glowSprite(0xffffff, 1, 1), tok: 0 };
      fx.flash.visible = false;
      s.add(fx.beam, fx.flash);
      return fx;
    });
    this.boomT = 0;
    this.boomSize = 6;
    this._v = new THREE.Vector3();
    this.camBase.set(0, 0, 0);
    this.lookAt.set(0, 0, -20);
  }

  // Star streaks: bright heads, tails fading into the dark; they stretch at warp.
  makeStreaks() {
    const N = 240;
    this.streakPos = new Float32Array(N * 6);
    this.streakLen = new Float32Array(N);
    const col = new Float32Array(N * 6);
    const tints = [0xffffff, 0xc9c0ff, 0x9fe8ff, 0xffb3ef];
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      c.set(tints[i % tints.length]).multiplyScalar(rand(0.6, 1.8));
      col[i * 6] = c.r; col[i * 6 + 1] = c.g; col[i * 6 + 2] = c.b;
      this.resetStreak(i, rand(-170, 0));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.streakPos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.streaks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.streaks.frustumCulled = false;
    this.scene.add(this.streaks);
    this.decor(this.streaks);
  }
  resetStreak(i, z) {
    const a = rand(Math.PI * 2), r = rand(3, 24);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    const p = this.streakPos;
    this.streakLen[i] = rand(1.5, 5);
    p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
    p[i * 6 + 3] = x; p[i * 6 + 4] = y; p[i * 6 + 5] = z - this.streakLen[i];
  }

  // The tunnel: 14 HDR hex rings with hot corner nodes (one draw call, moved in the
  // vertex shader) inside a faint honeycomb wall whose grid streams past.
  makeTunnel() {
    const parts = [{ geo: new THREE.TorusGeometry(BLASTER_R, 0.085, 4, 6), color: new THREE.Color(1, 1, 1) }];
    for (let j = 0; j < 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      parts.push({ geo: new THREE.OctahedronGeometry(0.22, 0), matrix: new THREE.Matrix4().makeTranslation(Math.cos(a) * BLASTER_R, Math.sin(a) * BLASTER_R, 0), color: new THREE.Color(2.1, 2.1, 2.1) });
    }
    const one = blasterMerge(parts);
    const n = one.attributes.position.count;
    const pos = new Float32Array(n * BLASTER_RINGS * 3), k = new Float32Array(n * BLASTER_RINGS), idx = new Float32Array(n * BLASTER_RINGS);
    const src = one.attributes.position.array, srcK = one.attributes.color.array;
    for (let r = 0; r < BLASTER_RINGS; r++) {
      pos.set(src, r * n * 3);
      for (let i = 0; i < n; i++) k[r * n + i] = srcK[i * 3];
      idx.fill(r, r * n, (r + 1) * n);
    }
    one.dispose();
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    rg.setAttribute("aK", new THREE.BufferAttribute(k, 1));
    rg.setAttribute("aIdx", new THREE.BufferAttribute(idx, 1));
    const flash = () => ({ uFlash: { value: 0 }, uFlashZ: { value: -50 }, uFlashColor: { value: new THREE.Color(1, 1, 1) } });
    this.ringMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), flash(), { uColor: { value: neon(WAVE_COLORS[0], 2.3) }, uScroll: { value: 0 }, uSpin: { value: 0 }, uTime: { value: 0 }, uBoost: { value: 1 } }),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aIdx; attribute float aK; uniform float uScroll; uniform float uSpin;
        varying float vDepth; varying float vZ; varying float vK;
        void main(){
          float a = aIdx * 0.17 + uSpin; float c = cos(a); float s = sin(a);
          vec3 p = vec3(c * position.x - s * position.y, s * position.x + c * position.y, position.z);
          float z = -aIdx * ${BLASTER_GAP}.0 - 6.0 + uScroll;
          p.z += 4.0 - mod(4.0 - z, ${BLASTER_RINGS * BLASTER_GAP}.0);
          vZ = p.z; vK = aK;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `${GLSL_FOG_PARS}
        uniform vec3 uColor; uniform vec3 uFlashColor; uniform float uFlash; uniform float uFlashZ; uniform float uBoost; uniform float uTime;
        varying float vDepth; varying float vZ; varying float vK;
        void main(){
          float chase = 0.8 + 0.7 * pow(0.5 + 0.5 * sin(vZ * 0.11 + uTime * 4.0), 10.0);
          vec3 col = uColor * vK * chase * uBoost;
          col += uFlashColor * uFlash * exp(-abs(vZ - uFlashZ) * 0.07) * 2.5;
          col *= 1.0 - smoothstep(uFogNear, uFogFar, vDepth);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.rings = new THREE.Mesh(rg, this.ringMat);
    this.rings.frustumCulled = false;
    this.scene.add(this.rings);
    // the honeycomb wall
    const L = 200;
    const wg = new THREE.CylinderGeometry(12.9, 12.9, L, 36, 1, true);
    wg.rotateX(-Math.PI / 2);
    wg.translate(0, 0, -L / 2 + 6);
    this.wallMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), flash(), { uColor: { value: neon(WAVE_COLORS[0], 1) }, uScroll: { value: 0 }, uWarp: { value: 0 }, uTime: { value: 0 } }),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, extensions: { derivatives: true },
      vertexShader: `varying vec2 vUv; varying float vZ; varying float vDepth;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vZ = w.z; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `${GLSL_FOG_PARS}
        uniform vec3 uColor; uniform vec3 uFlashColor; uniform float uFlash; uniform float uFlashZ; uniform float uScroll; uniform float uWarp; uniform float uTime;
        varying vec2 vUv; varying float vZ; varying float vDepth;
        void main(){
          vec2 p = vec2(vUv.x * 20.0, (vZ - uScroll) / (4.0 * (1.0 + uWarp * 6.0)));
          const vec2 s = vec2(1.0, 1.7320508);
          vec4 hc = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
          vec4 h = vec4(p - hc.xy * s, p - (hc.zw + 0.5) * s);
          vec2 gv = dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw;
          vec2 id = p - gv;
          vec2 a = abs(gv);
          float d = 0.5 - max(dot(a, s * 0.5), a.x);
          float line = 1.0 - smoothstep(0.0, fwidth(d) * 1.6, d);
          float r = fract(sin(dot(floor(id * 2.0 + 0.5), vec2(12.9898, 78.233))) * 43758.5453);
          float lit = step(0.9, r) * (0.5 + 0.5 * sin(uTime * (1.5 + r * 5.0) + r * 60.0));
          float fade = smoothstep(1.0, 14.0, vDepth) * (1.0 - smoothstep(uFogNear, uFogFar, vDepth));
          float far = smoothstep(14.0, 40.0, vDepth);
          fade *= 1.0 - smoothstep(40.0, 110.0, vDepth) * 0.75;
          vec3 tone = mix(vec3(0.32, 0.22, 1.0), uColor, 0.4);
          vec3 col = tone * (line * 0.2 + lit * far * (0.04 + 0.14 * smoothstep(0.35, 0.0, d))) * fade * (1.0 + uWarp * 2.6);
          col += uFlashColor * uFlash * exp(-abs(vZ - uFlashZ) * 0.06) * (0.12 + line * 0.9) * fade;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.wall = new THREE.Mesh(wg, this.wallMat);
    this.wall.frustumCulled = false;
    this.scene.add(this.wall);
    this.ringScroll = 0;
    this.wallScroll = 0;
    this.spin = 0;
  }

  // Targets are holo-drones: an armoured airframe (one shape per slot) holding the
  // answer core, a glowing crystal with a hot heart, translucent env-mapped facets,
  // neon edges and a fresnel rim, all in the slot colour. Shapes, materials and
  // badges are made once; each round only builds light-weight meshes from them.
  makeTargetKit() {
    // The enemy: the player's space frog (20e-blasterfrog.js), one big one that the fighter fires on
    // when an answer is right and that fires back when it is wrong. In a build without that model
    // every answer is a target to shoot instead: a crystal form in a holo-drone, built from this kit.
    this.frog = FrogModel.ok() ? new BlasterFrog(this) : null;
    if (this.frog) return;
    this.dronePaint = racerCarPaint(this.env, false);
    this.drones = SLOT_COLORS.map((hex, i) => blasterDroneGeo(i, hex));
    this.tgeo = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1.15, 0), new THREE.DodecahedronGeometry(1, 0), new THREE.TetrahedronGeometry(1.25, 0)];
    this.tedge = this.tgeo.map((g) => new THREE.EdgesGeometry(g, 1));
    this.badges = new Map();
    this.slotMats = SLOT_COLORS.map((hex) => {
      const c = new THREE.Color(hex);
      const rim = fresnelShell(this.tgeo[0], hex, { power: 2.0, intensity: 1.7 }).material;
      const M = {
        core: new THREE.MeshBasicMaterial({ color: neon(hex, 2.8) }),
        body: Object.assign(glossy(c.clone().multiplyScalar(0.32), { env: this.env, metal: 0.35, rough: 0.08, envI: 1.9, emissive: hex, emissiveK: 0.2 }), {
          transparent: true, opacity: 0.66, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
        }),
        edge: new THREE.LineBasicMaterial({ color: neon(hex, 2.3) }),
        rim,
        halo: new THREE.SpriteMaterial({ map: glowTexture(), color: neon(hex, 1.25), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
        lamp: new THREE.MeshBasicMaterial({ color: neon(hex, 2.1), vertexColors: true }),
        baseEdge: neon(hex, 2.3),
        baseRim: rim.uniforms.uColor.value.clone(),
      };
      return M;
    });
  }
  badge(text, i) {
    const key = text + i;
    if (!this.badges.has(key)) {
      const m = new THREE.SpriteMaterial({ map: blasterBadge(text, SLOT_COLORS[i]), transparent: true, depthTest: false, depthWrite: false, fog: false });
      m.color.setScalar(1.12);
      this.badges.set(key, m);
    }
    return this.badges.get(key);
  }

  // A light flash: a bloom sprite, a real light on the ship and crystals, and the
  // tunnel walls lighting up around the blast.
  boom(pos, color, size) {
    this.boomT = 1;
    this.boomSize = size;
    this.flashSprite.position.copy(pos);
    this.flashSprite.material.color.copy(neon(color, 2.4));
    this.boomLight.position.copy(pos);
    this.boomLight.color.set(color);
    const c = new THREE.Color(color);
    this.ringMat.uniforms.uFlashColor.value.copy(c);
    this.wallMat.uniforms.uFlashColor.value.copy(c);
    this.ringMat.uniforms.uFlashZ.value = pos.z;
    this.wallMat.uniforms.uFlashZ.value = pos.z;
  }

  // The fighter: the player's own model (20d-blasterfighter.js), or the built-in jet
  // (20b-blasterjet.js) if the build has no model. The game still owns where it is and where it aims.
  makeShip() {
    const jet = (this.jet = FighterModel.ok() ? new BlasterFighter(this) : new BlasterJet(this));
    this.nozzles = jet.nozzles;
    this.muzzles = jet.muzzles;
    this.engineGlows = jet.engineGlows;
    this.wingLights = jet.wingLights;
    jet.ship.position.set(0, -2.2, -7);
    return jet.ship;
  }

  start() {
    Sound.play("game");
    Sound.engine(true); // the fighter's engines: a low hum that rises with the combo and the warp
    if (this.has3D) this.corridor.director.force("flak"); // an opening salvo outside the wall
    if (this.has3D && this.jet.launch) this.jet.launch(); // and the fighter flies in
    if (this.frog) this.frog.arrive(); // to meet the frog coming up the tunnel
    UI.banner("WAVE 1", COLORS.magenta, this.sel.label);
    this.tw.wait(1.3, () => this.nextQuestion());
  }
  hud() {
    UI.text($("[data-score]", this.el), fmtScore(this.score));
    UI.text($("[data-wave]", this.el), "WAVE " + this.wave + " · " + this.sel.label);
    UI.text($("[data-combo]", this.el), "x" + this.combo);
    this.lives(this.shields, 3);
    // the combo meter: seven pips that fill and change colour as the multiplier climbs
    const cb = $("[data-combo]", this.el);
    cb.dataset.tier = this.combo >= 8 ? 3 : this.combo >= 6 ? 2 : this.combo >= 4 ? 1 : 0;
    this.el.querySelectorAll("[data-meter] i").forEach((pip, i) => pip.classList.toggle("on", i < this.combo - 1));
    if (this.combo > (this.comboShown || 1)) { cb.classList.remove("pop"); void cb.offsetWidth; cb.classList.add("pop"); }
    this.comboShown = this.combo;
  }
  onLayout() {
    if (!this.has3D) return;
    const far = this.bandSize(12);
    this.fx = Math.min(3.4, far.w * 0.27);
    this.fy = Math.min(1.8, far.h * 0.22);
    this.ts = clamp(Math.min(far.h * 0.16, far.w * 0.1), 0.4, 1.2);
    const near = this.bandSize(7);
    const fit = this.jet.fit || { w: 3.4, h: 1.2, y: 0.36 }; // the room the ship needs, and where it sits
    this.shipY = -near.h * fit.y;
    this.shipScale = clamp(Math.min((near.w * 0.6) / fit.w, (near.h * 0.3) / fit.h), 0.4, 1);
    // the band changes with each question's length: the ship eases to its new spot
    if (!this.laidOut) {
      this.laidOut = true;
      this.ship.position.y = this.shipY;
      this.ship.scale.setScalar(this.shipScale);
    }
    this.trails.forEach((t) => { t.width = 0.07 * this.shipScale; });
    if (this.frog) this.frog.fit(this.bandSize(FROG_NEAR));
    this.targets.forEach((t) => this.placeSlot(t));
  }
  placeSlot(t) {
    const i = t.userData.slot, n = this.round.n;
    t.userData.bx = n === 2 ? (i === 0 ? -this.fx : this.fx) : i % 2 ? this.fx : -this.fx;
    t.userData.by = n === 2 ? 0 : i < 2 ? this.fy : -this.fy;
    t.scale.setScalar(this.ts);
  }

  nextQuestion() {
    if (this.unmounted) return;
    const q = this.picker.next();
    if (!q) { UI.toast("NO QUESTIONS IN THIS STAGE YET"); return this.quit(); }
    this.round = new Round(q);
    this.quiz.show(this.round, `STAGE ${q.ch} · ${q.topic}`);
    const wf = Math.max(0.6, Math.pow(0.92, this.wave - 1));
    this.T = readTime(this.round, wf);
    this.tLeft = this.T;
    this.picked = -1;
    this.spawnTargets();
    this.layoutBand();
    this.state = "ask";
    this.hud();
  }
  spawnTargets() {
    this.clearTargets();
    if (!this.has3D || this.frog) return; // (one big frog: there are no targets)
    for (let i = 0; i < this.round.n; i++) {
      const shape = i % 4;
      const M = this.slotMats[i];
      M.edge.color.copy(M.baseEdge);
      M.rim.uniforms.uColor.value.copy(M.baseRim);
      const g = new THREE.Group();
      const rot = new THREE.Group();
      const core = new THREE.Mesh(this.tgeo[shape], M.core);
      core.scale.setScalar(0.42);
      const body = new THREE.Mesh(this.tgeo[shape], M.body);
      const edges = new THREE.LineSegments(this.tedge[shape], M.edge);
      const rim = new THREE.Mesh(this.tgeo[shape], M.rim);
      rim.scale.setScalar(1.05);
      rot.add(core, body, edges, rim);
      rot.rotation.set(rand(Math.PI * 2), rand(Math.PI * 2), 0);
      rot.scale.setScalar(0.62); // the answer core sits inside the drone's collar
      const frame = new THREE.Group();
      const hullMesh = new THREE.Mesh(this.drones[shape].body, this.dronePaint);
      // (weak quality levels are already on the plain twin of every metal: a new mesh must join them)
      if (GFX.ok && GFX.Q[GFX.qi].cheap) { hullMesh.userData.fullMat = this.dronePaint; hullMesh.material = GFX.twinOf(this.dronePaint); }
      frame.add(hullMesh, new THREE.Mesh(this.drones[shape].lamps, M.lamp));
      const halo = new THREE.Sprite(M.halo);
      halo.scale.set(3.8, 3.8, 1);
      halo.position.z = -0.9;
      const label = new THREE.Sprite(this.badge(this.round.labels[i], i));
      label.scale.set(1.24, 1.24, 1);
      label.position.z = 1.35;
      label.renderOrder = 10;
      g.add(halo, frame, rot, label);
      g.userData.frame = frame;
      g.userData.slot = i;
      g.userData.spin = rand(0.6, 1.6) * (i % 2 ? 1 : -1);
      g.userData.rot = rot;
      g.userData.M = M;
      g.position.z = -95;
      this.scene.add(g);
      this.targets.push(g);
      this.placeSlot(g);
    }
  }
  clearTargets() {
    // the meshes share geometry, materials and badges with the kit: only detach them
    this.targets.forEach((t) => this.scene.remove(t));
    this.targets = [];
  }

  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.state = "firing";
    this.picked = i;
    this.quiz.select(i);
    this.quiz.lock();
    const t = this.targets[i];
    this.panAt = t ? clamp(t.userData.bx / 3.4, -1, 1) * 0.8 : 0; // the target's side, for the stereo
    // What the guns are laid on: the answer's own target, or the one big frog. The fighter only fires
    // on the frog when the answer is right; when it is wrong the frog is already bringing its cannon
    // round. (Look and sound: the answer is checked and scored in resolve, as it always was.)
    const right = i === this.round.correct, opens = !this.frog || right;
    const at = !this.has3D ? null : this.frog ? (right ? this.frog.aimPoint(new THREE.Vector3()) : null) : t && t.position;
    if (opens) Sound.sfx("laser", this.panAt);
    if (opens && this.has3D) this.jet.fire(SLOT_COLORS[i]);
    if (this.frog && !right) this.frog.attack();
    if (at) {
      // lookAt aims +Z; the ship's nose is -Z, so aim at the mirrored point.
      this.ship.lookAt(this.ship.position.clone().multiplyScalar(2).sub(at));
      this.ship.updateMatrixWorld();
      const col = SLOT_COLORS[i];
      this.muzzles.forEach((m, gun) => {
        const fx = this.shotFX[gun];
        const tok = ++fx.tok;
        const from = this.jet.rig.localToWorld(m.clone());
        aimBeam(fx.beam, from, at, (0.06 + 0.07 * this.shipScale) * (this.frog ? 2.4 : 1)); // (the frog is close: fatter beams read)
        fx.beam.material.uniforms.uColor.value.copy(neon(col, 3.6));
        fx.beam.material.uniforms.uFade.value = 1;
        fx.flash.material.color.copy(neon(col, 2.6));
        fx.flash.material.opacity = 1;
        fx.flash.position.copy(from);
        fx.flash.scale.setScalar(1.3 * this.shipScale);
        fx.flash.visible = true;
        this.tw.add(0.3, (k) => {
          if (fx.tok !== tok) return;
          fx.beam.material.uniforms.uFade.value = 1 - k;
          fx.flash.material.opacity = 1 - k;
          fx.flash.scale.setScalar((1.3 + k * 0.8) * this.shipScale);
        }, () => { if (fx.tok === tok) { fx.beam.visible = false; fx.flash.visible = false; } });
      });
    }
    this.tw.wait(0.22, () => this.resolve(i));
  }
  resolve(i) {
    const r = this.round;
    const ok = this.run.record(r, i, this.tLeft / this.T);
    this.quiz.reveal(i);
    let title;
    if (ok) {
      const pts = Math.round(100 * this.combo * (1 + this.tLeft / this.T));
      this.score += pts;
      title = `DIRECT HIT! +${pts}`;
      this.combo = Math.min(8, this.combo + 1);
      if (this.has3D) { this.jet.hit(); this.jet.setCombo(this.combo); }
      if (this.combo >= 4) Sound.sfx("combo");
      Sound.sfx("boom", this.panAt);
      Sound.sfx("correct");
      UI.flash("good");
      GFX.pulse(4, 0.1);
      GFX.hitStop(70);
      Haptics.buzz(25);
      Sound.setIntensity(Sound.intensityFor(this.run.streak));
      const p = this.bandPoint(0.3);
      UI.floater("+" + pts, p.x, p.y, COLORS.yellow);
      if (this.frog) this.frog.hit(SLOT_COLORS[i]); // the fighter's fire lands on the frog
      else this.explode(this.targets[i], SLOT_COLORS[i]);
      if (this.combo >= 4) UI.floater("x" + this.combo + " COMBO", p.x - 20, p.y + 30, COLORS.magenta);
    } else {
      this.combo = 1;
      this.shields--;
      title = this.shields > 0 ? "WRONG TARGET! SHIELD DOWN" : "WRONG TARGET! SHIELDS GONE";
      this.shieldHit();
      Sound.sfx("wrong");
      Sound.sfx("hit");
      UI.flash("hit");
      this.shake(0.35);
      GFX.pulse(12, 0);
      Haptics.buzz([60, 40, 90]);
      Sound.setIntensity(0);
      if (!this.frog) this.explode(this.targets[i], COLORS.red); // (the frog is already firing: see pick)
      this.highlight(this.targets[r.correct]);
    }
    this.hud();
    this.state = "explain";
    this.tw.wait(0.5, () => {
      if (this.unmounted) return;
      this.quiz.feedback({ ok, title, auto: this.explainAuto(ok), onNext: () => this.after() });
    });
  }
  timeout() {
    this.state = "explain";
    const r = this.round;
    this.run.record(r, -1);
    this.quiz.reveal(-1);
    this.combo = 1;
    this.shields--;
    this.shieldHit();
    Sound.sfx("hit");
    UI.flash("hit");
    this.shake(0.5);
    GFX.pulse(12, 0);
    Haptics.buzz([60, 40, 90]);
    Sound.setIntensity(0);
    this.targets.forEach((t, i) => {
      if (i === r.correct) return this.highlight(t);
      const z0 = t.position.z;
      this.tw.add(0.35, (k) => { t.position.z = lerp(z0, 4, k); }, () => { t.visible = false; }, Ease.inCubic);
    });
    if (this.frog) this.frog.attack(); // time's up: the frog opens fire
    this.hud();
    this.quiz.feedback({ ok: false, title: this.shields > 0 ? "TOO SLOW! SHIELD DOWN" : "TOO SLOW! SHIELDS GONE", onNext: () => this.after() });
  }
  // A shield goes (look and sound only): the frog's cannon fire strikes and the lattice flares
  // (BlasterFrog.attack; without the frog it is the carrier's bolt).
  shieldHit() {
    Sound.sfx("shield");
    if (!this.has3D) return;
    this.jet.setCombo(1);
    if (this.frog) return;
    this.jet.shieldLost();
    this.carrier.volley();
  }
  explode(t, color) {
    if (!t || !this.has3D) return;
    this.blastAt(t.position, color);
    const s0 = t.scale.x;
    this.tw.add(0.2, (k) => t.scale.setScalar(s0 * (1 + k * 0.6)), () => { t.visible = false; });
  }
  // The blast where a shot lands: sparks, two shock rings, shards, embers, a flash on the tunnel
  // (flash: how big that flash is. The frog is close and asks for a small one, with fewer sparks, a
  // smaller ring and no white core, so it can be seen taking the hit).
  blastAt(pos, color, flash = 1) {
    // far blasts are scaled up so they read on screen as well as near ones
    const df = clamp(-pos.z / 28, 1, 2.6), full = flash >= 1;
    this.bursts.burst(pos, color, { n: full ? 70 : 44, speed: (9 * this.ts + 3) * df, size: 0.35 * df, life: 1 });
    if (full) this.bursts.burst(pos, 0xffffff, { n: 20, speed: 4 * df, size: 0.25 * df, life: 0.5 });
    this.shockwave(pos.clone(), neon(color, 2.2), (4 * this.ts + 2) * df * (full ? 1 : 0.6));
    this.shards.burst(pos, color, 16, this.ts * df, (7 * this.ts + 3) * df);
    this.shards.burst(pos, 0x9aa3b8, 10, this.ts * df * 0.8, (5 * this.ts + 2) * df); // the airframe, in pieces
    this.bursts.burst(pos, COLORS.orange, { n: 22, speed: 2.2 * df, size: 0.22 * df, life: 1.5 }); // embers that linger
    const at = pos.clone();
    if (full) this.tw.wait(0.12, () => { if (!this.unmounted) this.shockwave(at, neon(0xffffff, 1.4), (6 * this.ts + 3) * df, 0.7); });
    this.boom(pos, color, (7 * this.ts + 3) * df * flash);
  }
  highlight(t) {
    if (!t) return;
    t.userData.hot = true;
  }
  after() {
    if (this.unmounted) return;
    this.clearTargets();
    if (this.shields <= 0) return this.gameOver();
    this.inWave++;
    if (this.inWave >= WAVE_LEN) {
      this.inWave = 0;
      this.wave++;
      const bonus = this.shields * 500 + this.wave * 250;
      this.score += bonus;
      this.shields = Math.min(3, this.shields + 1);
      if (this.has3D) this.waveTarget = neon(WAVE_COLORS[(this.wave - 1) % WAVE_COLORS.length], 1);
      Sound.sfx("levelup");
      Sound.sfx("warp");
      if (this.has3D) {
        // the wave's carrier goes up, the fighter rolls through the wreck, the next carrier comes up out of the dark
        this.carrier.destroy();
        if (this.frog) this.frog.destroy(); // (or the wave's frog does, and the next wave's flies up)
        this.jet.warp();
        this.jet.shieldUp();
        this.tw.wait(1.2, () => { if (!this.unmounted) { this.carrier.arrive(this.wave); if (this.frog) this.frog.arrive(); } });
      }
      this.warp = 1.4;
      GFX.pulse(6, 0.2);
      UI.banner("WAVE " + this.wave, COLORS.yellow, "CLEAR BONUS +" + bonus + " · SHIELD RESTORED");
      this.hud();
      this.state = "intro";
      this.tw.wait(1.5, () => this.nextQuestion());
      return;
    }
    this.nextQuestion();
  }
  gameOver() {
    this.state = "over";
    Sound.stopMusic();
    Sound.engine(false);
    Sound.sfx("gameover");
    UI.banner("GAME OVER", COLORS.red);
    if (this.has3D) {
      this.bursts.burst(this.ship.position, COLORS.cyan, { n: 90, speed: 6, size: 0.3, life: 1.4 });
      this.shards.burst(this.ship.position, COLORS.cyan, 20, 0.7, 6);
      this.shockwave(this.ship.position.clone(), neon(COLORS.orange, 2.2), 5);
      this.boom(this.ship.position, COLORS.orange, 6);
      this.jet.down(); // (the ship goes: at once, or in pieces)
      this.trails.forEach((t) => { t.mesh.visible = false; });
      this.engineLight.intensity = 0;
    }
    this.tw.wait(1.6, () => {
      if (this.unmounted) return;
      showResults({
        game: "blaster", sel: this.sel, run: this.run, score: this.score,
        title: "GAME OVER", color: COLORS.cyan, headline: fmtScore(this.score) + " PTS",
        sub: `Reached wave ${this.wave} on ${this.sel.label}`,
        tiles: [{ k: "WAVE", v: this.wave }],
      });
    });
  }

  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      this.tLeft -= dt;
      this.timerBar(this.tLeft / this.T);
      if (this.tLeft <= 0) this.timeout();
    }
    if (!this.has3D) return;
    // Between waves the tunnel jumps to warp speed and the lens widens.
    let w = 0;
    if (this.warp > 0) {
      this.warp = Math.max(0, this.warp - dt);
      w = Math.sin((this.warp / 1.4) * Math.PI);
      this.camera.fov = 60 + w * 22;
      this.camera.updateProjectionMatrix();
    }
    const sp = this.speed * (1 + (this.wave - 1) * 0.08) * (1 + w * 5);
    // star streaks stretch into lines of light at warp
    const p = this.streakPos, L = this.streakLen, stretch = 1 + w * 9;
    for (let i = 0; i < L.length; i++) {
      const z = p[i * 6 + 2] + sp * 2 * dt;
      p[i * 6 + 2] = z;
      p[i * 6 + 5] = z - L[i] * stretch;
      if (p[i * 6 + 5] > 2) this.resetStreak(i, -170);
    }
    this.streaks.geometry.attributes.position.needsUpdate = true;
    this.streaks.material.color.setScalar(1 + w * 1.6);
    // tunnel: scroll, spin, wave colour, warp glow, blast light
    this.ringScroll = (this.ringScroll + sp * dt) % (BLASTER_RINGS * BLASTER_GAP);
    this.wallScroll = (this.wallScroll + sp * dt) % (4 * Math.sqrt(3) * 60);
    this.spin += dt * (0.2 + w * 1.2);
    this.waveCol.lerp(this.waveTarget, Math.min(1, dt * 2.5));
    const ru = this.ringMat.uniforms, wu = this.wallMat.uniforms;
    ru.uScroll.value = this.ringScroll;
    ru.uSpin.value = this.spin;
    ru.uColor.value.copy(this.waveCol).multiplyScalar(2.3);
    ru.uBoost.value = 1 + w * 1.3 + GFX.fever * 0.7; // the tunnel burns brighter on a streak
    GFX.speedBlur = w * 0.9 + GFX.fever * 0.12; // warp streaks the picture outward
    wu.uScroll.value = this.wallScroll;
    wu.uWarp.value = w;
    wu.uColor.value.copy(this.waveCol);
    this.wall.rotation.z = -this.spin * 0.35;
    this.sky.rotation.y += dt * (0.012 + w * 0.5);
    this.core.scale.setScalar(160 * (1 + w * 1.6));
    this.core.material.color.copy(this.coreBase).multiplyScalar(1 + w * 2.5);
    if (this.boomT > 0) {
      this.boomT = Math.max(0, this.boomT - dt * 2.6);
      const k = this.boomT;
      this.flashSprite.visible = k > 0;
      this.flashSprite.scale.setScalar(this.boomSize * (1.4 - k * 0.6));
      this.flashSprite.material.opacity = k * k;
      this.boomLight.intensity = k * k * 8;
      ru.uFlash.value = k * k;
      wu.uFlash.value = k * k;
    }
    this.shards.update(dt);
    this.corridor.update(dt, sp, w);
    this.carrier.update(dt);
    // the frog comes closer as the question's time runs out (and holds where it is while the guns fire)
    if (this.frog) this.frog.update(dt, this.state === "ask" || this.state === "firing" ? 1 - this.tLeft / this.T : null);
    // targets
    const k = this.state === "ask" ? 1 - this.tLeft / this.T : null;
    this.targets.forEach((t, i) => {
      const u = t.userData;
      if (k !== null) t.position.z = lerp(-95, -12, k);
      t.position.x = u.bx + Math.sin(this.t * 1.3 + i * 1.7) * 0.18 * this.ts;
      t.position.y = u.by + Math.cos(this.t * 1.1 + i) * 0.14 * this.ts;
      u.rot.rotation.x += dt * u.spin;
      u.rot.rotation.y += dt * u.spin * 0.7;
      u.frame.rotation.z = Math.sin(this.t * 0.9 + i * 2.1) * 0.07; // the airframe hovers: a slow sway, a lean into its side
      u.frame.rotation.y = -u.bx * 0.035;
      if (u.hot) {
        const pulse = 1 + Math.sin(this.t * 10) * 0.12;
        t.scale.setScalar(this.ts * pulse * 1.15);
        u.M.edge.color.setHex(Math.sin(this.t * 10) > 0 ? 0xffffff : 0x86ff5e).multiplyScalar(2.6);
        u.M.rim.uniforms.uColor.value.setHex(0x86ff5e).multiplyScalar(1.4);
      }
    });
    // the ship: drift, bank, engine flicker, blinking wing lights, ribbon trails
    this.ship.position.x = Math.sin(this.t * 0.9) * 0.15;
    const ease = Math.min(1, dt * 3);
    this.ship.position.y += (this.shipY - this.ship.position.y) * ease;
    this.ship.scale.setScalar(this.ship.scale.x + (this.shipScale - this.ship.scale.x) * ease);
    if (this.state === "ask") this.ship.rotation.set(Math.sin(this.t) * 0.05, 0, Math.sin(this.t * 0.9) * 0.12);
    const fl = 1 + Math.sin(this.t * 15) * 0.12 + Math.sin(this.t * 9.3) * 0.08 + w * 0.6;
    this.engineGlows.forEach((g, j) => g.scale.setScalar(0.5 * fl * (j ? 1.04 : 0.96)));
    this.wingLights.forEach((g, j) => { g.material.opacity = Math.sin(this.t * 4 + j * Math.PI) > 0.2 ? 1 : 0.25; });
    this.ship.updateMatrixWorld();
    this.jet.update(dt, sp, w); // bank, flaps, flames, shield, contrails (look only)
    Sound.rev(0.5 + this.jet.heat * 0.45 + w * 0.5);
    const rigM = this.jet.rig.matrixWorld;
    this.engineLight.position.set(0, 0, 2.0).applyMatrix4(rigM);
    // trails sample at a fixed 60 Hz so their length doesn't depend on the frame rate
    this.trailAcc = Math.min(4 / 60, (this.trailAcc || 0) + dt);
    while (this.trailAcc >= 1 / 60) {
      this.trailAcc -= 1 / 60;
      const step = Math.min(sp * 0.3, 9) / 60;
      this.trails.forEach((tr, j) => {
        tr.shift(0, 0, step);
        tr.push(this._v.copy(this.nozzles[j]).applyMatrix4(rigM));
      });
    }
    // the view leans a little with the pointer, or with the phone's tilt
    this.camBase.set(Pointer.x * 0.5, -Pointer.y * 0.3, 0);
    this.lookAt.set(Pointer.x * 1.6, -Pointer.y * 1.0, -20);
    this.placeCamera();
    if (w > 0.001 && !REDUCED_MOTION) this.camera.rotateZ(Math.sin(this.warp * 2.4) * w * 0.14);
    followSky(this.sky, this.camera);
    FX.sync(this.scene, this.t);
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
    this.clearTargets();
    if (this.shipEnv) this.shipEnv.dispose();
    if (this.frog) this.frog.dispose();
    if (this.has3D && !this.frog) { // (the answers' target kit)
      this.tgeo.concat(this.tedge).forEach((g) => g.dispose());
      this.slotMats.forEach((M) => [M.core, M.body, M.edge, M.rim, M.halo, M.lamp].forEach((m) => m.dispose()));
      this.drones.forEach((d) => { d.body.dispose(); d.lamps.dispose(); });
      this.dronePaint.dispose();
      this.badges.forEach((m) => { m.map.dispose(); m.dispose(); });
    }
    if (this.has3D) this.shards.dispose();
    super.dispose();
  }
}
