// FINAL EXAM — a mock exam across every chapter, weighted by chapter size.
// No feedback until you submit; then every miss is reviewed with its page.
function buildExam(n) {
  const chs = CHAPTERS.filter((c) => c.qids.length);
  const total = chs.reduce((s, c) => s + c.qids.length, 0);
  n = Math.min(n, total);
  const alloc = chs.map((c) => {
    const exact = (n * c.qids.length) / total;
    return { c, k: Math.floor(exact), r: exact - Math.floor(exact) };
  });
  let left = n - alloc.reduce((s, a) => s + a.k, 0);
  alloc.slice().sort((a, b) => b.r - a.r).forEach((a) => { if (left > 0) { a.k++; left--; } });
  const ids = alloc.flatMap((a) => shuffle(a.c.qids).slice(0, a.k));
  return shuffle(ids).map((id) => new Round(Q_BY_ID.get(id)));
}

// ---- the hall ----------------------------------------------------------------------
// The floor is y = 0. A gold cup turns slowly on a black-and-gold plinth under a warm
// spotlight, in a dark exam hall: tall arched windows full of stars, moonlight slanting
// through them, a colonnade, and a polished floor that mirrors it all. Calm by design:
// nothing flashes or hurries behind the questions.
const EXAM_WALL_Z = -20;
const EXAM_LOOK_Y = 0.5 + 9 * 0.83; // where the camera looks: the boss's jaw (its dais plus 83% of its height)
const EXAM_WINDOWS = [-32, -24, -16, -8, 0, 8, 16, 24, 32];

// makeEnvMap, but keeping the PMREM render target: disposing only its texture frees
// nothing in r128, so dispose() releases the whole target.
function examEnvMap({ top, horizon, bottom, glow, panels }) {
  if (!GFX.ok) return null;
  const sc = new THREE.Scene();
  sc.add(makeSky({ top, mid: top, horizon, bottom, stars: 0, glow, radius: 60 }));
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ color: neon(p.color, p.k), side: THREE.DoubleSide }));
    m.position.set(p.pos[0], p.pos[1], p.pos[2]);
    m.lookAt(0, 0, 0);
    sc.add(m);
  }
  const rt = GFX.pmrem().fromScene(sc, 0.02, 0.1, 100);
  disposeTree(sc);
  return rt;
}

// A lathe about y from [radius, y] pairs listed bottom to top (that winding faces
// outward); a third value `true` doubles the point so the edge there stays crisp.
function examLathe(pts, segs = 64) {
  const v = [];
  pts.forEach(([r, y, crisp]) => {
    v.push(new THREE.Vector2(r, y));
    if (crisp) v.push(new THREE.Vector2(r, y));
  });
  return new THREE.LatheGeometry(v, segs);
}

// Merge geometries (position + normal) into one, for a single draw call.
const examMerge = (geos) => mergeIndexed(geos);

// The back wall: one shape with a row of arched window openings.
function examWallGeometry(w, sill, spring) {
  const shape = new THREE.Shape();
  shape.moveTo(-80, 0);
  shape.lineTo(80, 0);
  shape.lineTo(80, 44);
  shape.lineTo(-80, 44);
  shape.lineTo(-80, 0);
  for (const x of EXAM_WINDOWS) {
    const h = new THREE.Path();
    h.moveTo(x - w / 2, sill);
    h.lineTo(x + w / 2, sill);
    h.lineTo(x + w / 2, spring);
    h.absarc(x, spring, w / 2, 0, Math.PI, false);
    h.lineTo(x - w / 2, sill);
    shape.holes.push(h);
  }
  return new THREE.ShapeGeometry(shape, 14);
}

// Neon outlines for the windows, with fainter mullions and transoms.
function examWindowLines(w, sill, spring) {
  const pos = [], col = [];
  const frame = neon(0x9a6bff, 1.5), bar = neon(0x7a5cff, 0.45);
  const seg = (x0, y0, x1, y1, c) => { pos.push(x0, y0, 0, x1, y1, 0); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
  for (const x of EXAM_WINDOWS) {
    const l = x - w / 2, r = x + w / 2;
    seg(l, sill, r, sill, frame);
    seg(r, sill, r, spring, frame);
    seg(l, sill, l, spring, frame);
    let px = r, py = spring;
    for (let i = 1; i <= 16; i++) {
      const a = (i / 16) * Math.PI, nx = x + Math.cos(a) * (w / 2), ny = spring + Math.sin(a) * (w / 2);
      seg(px, py, nx, ny, frame);
      px = nx; py = ny;
    }
    seg(x, sill, x, spring + w / 2, bar);
    seg(l, spring, r, spring, bar);
    seg(l, (sill + spring) / 2, r, (sill + spring) / 2, bar);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true }));
}

// The night outside the windows: a violet horizon, twinkling stars and a soft moon,
// placed so it shows through the window to the right of the cup (and in the floor).
function examNightMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMoon: { value: new THREE.Vector3(10.8, 7.6, 1.3) } },
    vertexShader: "varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `${GLSL_NOISE}
      uniform float uTime; uniform vec3 uMoon; varying vec3 vWorld;
      void main(){
        float h = clamp(vWorld.y / 36.0, 0.0, 1.0);
        vec3 col = mix(vec3(0.07, 0.035, 0.17), vec3(0.01, 0.008, 0.035), smoothstep(0.0, 0.6, h));
        col += vec3(0.22, 0.1, 0.36) * exp(-vWorld.y * 0.3) * 0.35;
        // an aurora: slow curtains of green shading to violet (it never flickers)
        float au = sin(vWorld.x * 0.07 + uTime * 0.04 + 1.6 * sin(vWorld.y * 0.16 - uTime * 0.03));
        float curtain = smoothstep(0.3, 1.0, au) * smoothstep(4.0, 8.0, vWorld.y) * (1.0 - smoothstep(10.0, 17.0, vWorld.y));
        col += mix(vec3(0.07, 0.42, 0.36), vec3(0.34, 0.16, 0.62), smoothstep(7.0, 14.0, vWorld.y)) * curtain * (0.3 + 0.12 * sin(vWorld.x * 0.9 + uTime * 0.2));
        vec2 p = vWorld.xy * 1.35; vec2 c = floor(p); float r = hash13(vec3(c, 7.0));
        if (r > 0.93) {
          float s = smoothstep(0.32, 0.0, length(fract(p) - 0.5));
          float tw = 0.65 + 0.35 * sin(uTime * (0.5 + r * 1.5) + r * 60.0);
          col += vec3(0.9, 0.86, 1.0) * s * tw * (r > 0.992 ? 2.6 : 0.9);
        }
        float d = length(vWorld.xy - uMoon.xy);
        col += vec3(0.95, 0.93, 1.0) * smoothstep(uMoon.z, uMoon.z - 0.06, d) * 1.2;
        col += vec3(0.55, 0.5, 0.9) * exp(-max(d - uMoon.z, 0.0) * 0.45) * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// A still shaft of light (like makeLightCone, without the flicker).
function examBeam({ color, top, bottom, height, intensity }) {
  const geo = new THREE.CylinderGeometry(top, bottom, height, 28, 1, true);
  geo.translate(0, -height / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: neon(color, 1) }, uI: { value: intensity }, uH: { value: height } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform float uH; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ vH = 1.0 + position.y / uH; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float fall = pow(clamp(vH, 0.0, 1.0), 1.2) * smoothstep(0.0, 0.25, vH);
        gl_FragColor = vec4(uColor * (uI * face * fall), 1.0);
      }`,
  }));
  m.renderOrder = 5;
  return m;
}

class ExamGame extends QuizGame {
  constructor(sel) {
    super(sel, "exam", { fov: 55, fog: [0x06021a, 14, 74], bg: 0x06021a }); // the hall falls away into the dark behind the boss
    this.rounds = buildExam(ExamPrefs.len);
    this.answers = new Array(this.rounds.length).fill(-1);
    this.flags = new Array(this.rounds.length).fill(false);
    this.i = 0;
    this.limit = ExamPrefs.timed ? this.rounds.length * 90 : 0;
    this.elapsed = 0;
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <span class="tag" style="--c:${COLORS.violet}" data-pos>Q 1/${this.rounds.length}</span>
        <div class="grow"></div>
        <span class="tag" style="--c:${COLORS.yellow}" data-clock></span>
        <button class="iconbtn" data-act="grid" aria-label="All questions">${icon("grid")}</button>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="timer"><i></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
      <div class="exam-nav">
        <button class="btn ghost" data-act="prev">${icon("left")} PREV</button>
        <button class="btn ghost" data-act="flag" style="--c:${COLORS.orange}">${icon("flag")}</button>
        <button class="btn" data-act="nextq" style="--c:${COLORS.violet}" data-nextbtn>NEXT ${icon("right")}</button>
      </div>
    </section>`);
    if (!this.limit) $(".timer", this.el).style.visibility = "hidden";
  }
  build3D() {
    const s = this.scene;
    // The lower half is warm: the cup's flaring bowl mirrors the spot-lit floor.
    this.envRT = examEnvMap({
      top: 0x0a0624, horizon: 0x5a2fb0, bottom: 0x3a2412, glow: 0.6,
      panels: [
        { color: 0xfff0d8, k: 2.6, w: 10, h: 4, pos: [0, 24, 10] }, // the spotlight's lamp
        { color: 0xffe2b8, k: 1.5, w: 34, h: 7, pos: [0, 5, 30] }, // warm light behind the camera: the face of the cup
        { color: 0xffd090, k: 1.4, w: 8, h: 14, pos: [-21, 6, 22] }, // warm fills, front left and right: its flanks
        { color: 0xffd090, k: 1.0, w: 8, h: 14, pos: [23, 6, 18] },
        { color: 0xa65fff, k: 1.6, w: 6, h: 24, pos: [-30, 4, 4] },
        { color: 0x35efff, k: 1.0, w: 6, h: 24, pos: [30, 4, -2] },
        { color: 0xb8c4ff, k: 1.2, w: 3, h: 10, pos: [-8, 7, -30] }, // the windows behind
        { color: 0xb8c4ff, k: 1.2, w: 3, h: 10, pos: [8, 7, -30] },
        { color: 0xffc070, k: 1.1, w: 34, h: 12, pos: [0, -12, 26] },
      ],
    });
    const env = this.envRT ? this.envRT.texture : null;
    // what the boss's armour reflects: not the warm hall but the dark, a cold lamp, red and blue behind it
    this.bossEnvRT = examEnvMap({
      top: 0x05040c, horizon: 0x1a1440, bottom: 0x0b0a14, glow: 0.3,
      panels: [
        { color: 0xdfe6ff, k: 2.4, w: 12, h: 5, pos: [3, 24, 16] },
        { color: 0xff2f45, k: 2.2, w: 5, h: 22, pos: [-28, 8, -12] },
        { color: 0x4f7cff, k: 1.6, w: 5, h: 22, pos: [28, 6, -10] },
        { color: 0x8a5cff, k: 0.8, w: 30, h: 6, pos: [0, 4, -30] },
        { color: 0x9fb0ff, k: 0.5, w: 20, h: 6, pos: [0, -14, 14] },
      ],
    });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf7c052, metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.5 });
    const lacquer = new THREE.MeshStandardMaterial({ color: 0x0d0a1c, metalness: 0.35, roughness: 0.16, envMap: env, envMapIntensity: 0.9 });
    const marble = new THREE.MeshStandardMaterial({ color: 0x1a1233, metalness: 0.2, roughness: 0.4, envMap: env, envMapIntensity: 0.7, flatShading: true });

    // Light it to be feared: little ambient, a hard lamp high in front (its brow shadows
    // its eyes), red from behind on one side and cold blue on the other to cut its
    // outline out of the dark. (The boss adds its own: the red under it, its eyes.)
    s.add(new THREE.AmbientLight(0x1e1840, 0.42));
    const key = new THREE.DirectionalLight(0xfff2dd, 0.3);
    key.position.set(-4, 16, 9);
    s.add(key);
    this.spotLight = new THREE.PointLight(0xe6ecff, 2.6, 32, 1.5); // the lamp over the boss
    this.spotLight.position.set(0.8, BOSS_DAIS + BOSS_S * 1.55, BOSS_S * 0.62);
    s.add(this.spotLight);
    this.rimA = new THREE.PointLight(0xff2f55, 2.8, 36, 1.5);
    this.rimA.position.set(-BOSS_S * 0.95, BOSS_DAIS + BOSS_S * 1.12, -BOSS_S * 0.5);
    s.add(this.rimA);
    this.rimB = new THREE.PointLight(0x4f7cff, 1.8, 34, 1.5);
    this.rimB.position.set(BOSS_S, BOSS_DAIS + BOSS_S, -BOSS_S * 0.45);
    s.add(this.rimB);

    // the hall: a starry night through arched windows, pilasters and a colonnade
    const night = new THREE.Mesh(new THREE.PlaneGeometry(190, 64), examNightMaterial());
    night.position.set(0, 26, EXAM_WALL_Z - 12);
    s.add(night);
    // a big, dim surface: per-vertex lighting is plenty here and cheap on phones
    const wall = new THREE.Mesh(examWallGeometry(3.4, 2.2, 10.2), new THREE.MeshLambertMaterial({ color: 0x140b2b }));
    wall.position.z = EXAM_WALL_Z;
    s.add(wall);
    const lines = examWindowLines(3.4, 2.2, 10.2);
    lines.position.z = EXAM_WALL_Z + 0.06;
    lines.layers.set(1);
    s.add(lines);
    const colGeo = examLathe([[1.0, 0], [1.0, 0.45, true], [0.84, 0.6], [0.8, 0.72, true], [0.66, 0.86, true], [0.58, 13.6, true], [0.7, 13.8], [0.88, 14.15, true], [1.0, 14.15, true], [1.0, 14.6, true], [0, 14.6]], 12);
    const spots = EXAM_WINDOWS.slice(0, -1).map((x) => [x + 4, EXAM_WALL_Z + 0.35]);
    [-1, 1].forEach((sd) => [-14, -8, -2].forEach((z) => spots.push([sd * 11, z])));
    const cols = new THREE.InstancedMesh(colGeo, marble, spots.length);
    const m = new THREE.Matrix4();
    spots.forEach(([x, z], i) => cols.setMatrixAt(i, m.makeTranslation(x, 0, z)));
    cols.frustumCulled = false;
    s.add(cols);
    // violet uplights washing the foot of each column
    const up = new Float32Array(spots.length * 3);
    spots.forEach(([x, z], i) => { up[i * 3] = x; up[i * 3 + 1] = 0.25; up[i * 3 + 2] = z + 1.1; });
    const upGeo = new THREE.BufferGeometry();
    upGeo.setAttribute("position", new THREE.BufferAttribute(up, 3));
    const uplights = new THREE.Points(upGeo, new THREE.PointsMaterial({ color: neon(0x8a5cff, 0.6), map: glowTexture(), size: 2.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    uplights.layers.set(1);
    s.add(uplights);
    this.decor(uplights);
    // moonlight slanting in through three of the windows
    const dir = new THREE.Vector3(-0.3, -0.62, 0.72).normalize();
    this.moonBeams = [];
    [-8, 8, 16].forEach((x) => {
      const b = examBeam({ color: 0xa8b6ff, top: 1.5, bottom: 3.4, height: 26, intensity: 0.075 });
      b.position.set(x, 7, EXAM_WALL_Z);
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      b.layers.set(1);
      s.add(b);
      this.decor(b);
      this.moonBeams.push(b);
    });
    this.ambience = new ExamAmbience(this, this.moonBeams); // lanterns past the windows, beams that sway

    // polished floor: a polar grid around the plinth, and the reflection of it all
    this.mirror = new Mirror(0);
    this.floor = makeNeonFloor({ size: 300, mirror: this.mirror, polar: true, spokes: 32, cell: 2.6, line: 0x7a4dff, lineK: 0.42, base: 0x030110, reflect: 0.62, glow: 0.3, ripple: 0.0018, streak: 0.013 });
    s.add(this.floor);
    s.userData.mirrors = [this.mirror];

    // the dais: black lacquer, gold bands, a violet ring of light at its foot
    s.add(new THREE.Mesh(examLathe([[BOSS_DAIS_R + 0.35, 0], [BOSS_DAIS_R + 0.35, 0.14, true], [BOSS_DAIS_R + 0.2, 0.22, true], [BOSS_DAIS_R, 0.22, true], [BOSS_DAIS_R, BOSS_DAIS, true], [0, BOSS_DAIS]], 72), lacquer));
    s.add(new THREE.Mesh(examMerge([
      new THREE.TorusGeometry(BOSS_DAIS_R, 0.045, 10, 96).rotateX(Math.PI / 2).translate(0, BOSS_DAIS, 0),
      new THREE.TorusGeometry(BOSS_DAIS_R + 0.36, 0.05, 10, 96).rotateX(Math.PI / 2).translate(0, 0.14, 0),
    ]), gold));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(BOSS_DAIS_R + 0.75, 0.03, 6, 120).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: neon(0xa65fff, 1.6) }));
    ring.position.y = 0.04;
    s.add(ring);
    // the final boss (24c-examboss.js): it stands and idles through the exam, whatever is answered
    this.boss = BossModel.ok() ? new ExamBoss(this, this.bossEnvRT ? this.bossEnvRT.texture : env) : null;
    // while the questions are up the camera is under the boss's chin and the floor is out of
    // sight: its reflection (the whole hall drawn a second time) waits for the ending
    s.userData.mirrorOff = !!this.boss;
    // the spotlight from above, its pool on the floor, dust turning in it
    // (the shaft of light falls behind it, so it stands out against it instead of in its haze)
    const beam = examBeam({ color: 0xd8ccff, top: 0.7, bottom: 7, height: 22, intensity: 0.1 });
    beam.position.set(0, 22, -BOSS_S * 0.62);
    beam.layers.set(1);
    s.add(beam);
    const pool = makeLightPool({ color: 0xffd9a0, radius: 5.4, intensity: 0.38 });
    pool.layers.set(1);
    s.add(pool);
    this.motes = makeMotes({ count: 70, box: [13, 9, 6], center: [0, BOSS_DAIS + BOSS_S * 0.8, BOSS_S * 0.45], color: 0xff7a3a, size: 0.08, k: 1.5 }); // embers adrift round it
    this.moonMotes = makeMotes({ count: 50, box: [44, 12, 20], center: [0, 6, -8], color: 0xb8c4ff, size: 0.12, k: 0.75 });
    [this.motes, this.moonMotes].forEach((p) => { p.layers.set(1); s.add(p); });
    this.decor(this.motes, this.moonMotes);

    // a quiet arc of studs round the front of the plinth: one per question
    const n = Math.max(1, this.rounds.length);
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.PI - 0.2 + ((i + 0.5) / n) * (Math.PI + 0.4);
      sp[i * 3] = Math.cos(a) * (BOSS_DAIS_R + 1.3);
      sp[i * 3 + 1] = 0.06;
      sp[i * 3 + 2] = -Math.sin(a) * (BOSS_DAIS_R + 1.3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.studs = new THREE.Points(sg, new THREE.PointsMaterial({ size: clamp(13 / n, 0.16, 0.5), map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.studs.layers.set(1);
    s.add(this.studs);
    // a soft ring that spreads across the floor when an answer is chosen
    this.ripple = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), new THREE.MeshBasicMaterial({ color: neon(0xb48cff, 1.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ripple.rotation.x = -Math.PI / 2;
    this.ripple.position.y = 0.05;
    this.ripple.layers.set(1);
    this.ripple.visible = false;
    s.add(this.ripple);
    this.rippleT = 1;

    // a hard, dark picture: less bloom, more contrast, a heavy vignette, sharpened, no colour fringe
    s.userData.post = { exposure: 1.08, bloom: 0.72, threshold: 1.05, saturation: 1.02, contrast: 1.14, vignette: 1.45, sharpen: 0.55, crisp: true, pr: 2 };
    this.dist = this.distT = 16;
    this.camBase.set(0, 4.6, this.dist);
    this.lookAt.set(0, EXAM_LOOK_Y, 0.5);
  }
  // Frame the boss from below and close: its skull and shoulders fill the band (the
  // shoulders run a little past the screen's edges), and what the band has room for
  // of its chest. It is meant to be too big for the frame.
  onResize(w, h) {
    if (!this.camera || !this.studs) return;
    const bandH = this.band ? this.band.h : h * 0.45;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tall = (BOSS_S * 0.48 * h) / (2 * tanH * Math.max(110, bandH * 0.9)); // head to mid-chest in the band's height
    const wide = (BOSS_S * 0.87 * h) / (2 * tanH * 1.45 * w); // shoulders half as wide again as the screen
    this.distT = clamp(Math.max(tall, wide), 7, 40);
    if (!this.placed) {
      this.dist = this.distT;
      this.placed = !!this.band;
    }
  }
  pause() {
    super.pause();
    if (this.paused) Sound.dread(false);
  }
  resume() {
    super.resume();
    if (this.boss && this.boss.mode === "idle") Sound.dread(true);
  }
  // Free what the scene graph walk misses: the env target and instance buffers.
  dispose() {
    Sound.dread(false);
    if (this.envRT) this.envRT.dispose();
    if (this.bossEnvRT) this.bossEnvRT.dispose();
    if (this.scene) this.scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    super.dispose();
  }
  // Colour the studs: answered gold, flagged orange, the rest a faint violet.
  paintStuds() {
    if (!this.studs) return;
    const c = this.studs.geometry.attributes.color;
    for (let i = 0; i < this.rounds.length; i++) {
      if (this.flags[i]) c.setXYZ(i, 2.2, 0.8, 0.2);
      else if (this.answers[i] >= 0) c.setXYZ(i, 2.0, 1.35, 0.4);
      else c.setXYZ(i, 0.42, 0.3, 0.8);
    }
    c.needsUpdate = true;
  }
  start() {
    Sound.play("calm");
    if (!this.rounds.length) { UI.toast("NO QUESTIONS YET"); return this.quit(); }
    UI.banner(this.boss ? "FINAL BOSS" : "BEGIN", COLORS.violet, this.rounds.length + " QUESTIONS" + (this.limit ? " · " + Math.round(this.limit / 60) + " MIN" : "") + (this.boss ? " · 60% BRINGS IT DOWN" : ""));
    this.state = "ask";
    this.show();
    if (this.boss) this.boss.wake(); // it rises out of the dark
  }
  show() {
    const r = this.rounds[this.i];
    this.round = r;
    this.quiz.show(r, `QUESTION ${this.i + 1} OF ${this.rounds.length}`);
    UI.text($(".qmeta .diff", this.el), this.flags[this.i] ? "FLAGGED" : "");
    this.quiz.select(this.answers[this.i]);
    UI.text($("[data-pos]", this.el), `Q ${this.i + 1}/${this.rounds.length}`);
    const last = this.i === this.rounds.length - 1;
    const nb = $("[data-nextbtn]", this.el);
    nb.dataset.act = last ? "submit" : "nextq";
    nb.innerHTML = last ? `SUBMIT ${icon("check")}` : `NEXT ${icon("right")}`;
    nb.style.setProperty("--c", last ? COLORS.lime : COLORS.violet);
    $("[data-act=prev]", this.el).disabled = this.i === 0;
    $("[data-act=flag]", this.el).classList.toggle("flagged", this.flags[this.i]);
    this.paintStuds();
    this.layoutBand();
  }
  go(d) {
    const j = clamp(this.i + d, 0, this.rounds.length - 1);
    if (j === this.i) return;
    this.i = j;
    Sound.sfx("move");
    this.show();
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.answers[this.i] = i;
    this.quiz.select(i);
    Sound.sfx("blip");
    this.paintStuds();
    if (this.ripple) { this.rippleT = 0; this.ripple.visible = true; }
    if (this.boss) this.boss.notice(); // (it starts at every pick alike: nothing in that says right or wrong)
  }
  on(a, t) {
    if (a === "pause") return this.pause();
    if (a === "ans") return this.pick(+t.dataset.i);
    if (a === "prev") return this.go(-1);
    if (a === "nextq") return this.go(1);
    if (a === "flag") {
      this.flags[this.i] = !this.flags[this.i];
      Sound.sfx("blip");
      return this.show();
    }
    if (a === "grid") return this.palette();
    if (a === "submit") return this.askSubmit();
    if (a === "skipcine" && this.boss) return this.boss.skip();
  }
  key(e) {
    if (this.state === "over") { // the ending is playing: any of these skips to the results
      if (this.boss && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.boss.skip(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); return this.pause(); }
    if (e.key === "ArrowLeft") return this.go(-1);
    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      return this.i === this.rounds.length - 1 ? this.askSubmit() : this.go(1);
    }
    const i = this.quiz.keyIndex(e);
    if (i >= 0) { e.preventDefault(); this.pick(i); }
  }
  palette() {
    const el = UI.el(`<div class="modal"><div class="dialog" style="--c:${COLORS.violet}" role="dialog" aria-modal="true" aria-label="All questions">
      <h2>ALL QUESTIONS</h2>
      <p>${this.answers.filter((a) => a >= 0).length} answered · ${this.flags.filter(Boolean).length} flagged</p>
      <div class="palette">${this.rounds.map((_, i) => `<button data-act="jump" data-i="${i}" class="${[this.answers[i] >= 0 ? "done" : "", this.flags[i] ? "flag" : "", i === this.i ? "here" : ""].join(" ")}">${i + 1}</button>`).join("")}</div>
      <button class="btn" data-act="submit" style="--c:${COLORS.lime}">SUBMIT EXAM</button>
      <button class="btn ghost" data-act="close">BACK TO QUESTION</button></div></div>`);
    UI.openModal({
      el,
      on: (a, t) => {
        if (a === "jump") { UI.closeModal(); this.i = +t.dataset.i; this.show(); }
        if (a === "close") UI.closeModal();
        if (a === "submit") { UI.closeModal(); this.askSubmit(); }
      },
      key: (e) => { if (e.key === "Escape") UI.closeModal(); },
      mounted: () => { const h = $(".here", el); if (h) h.focus(); },
    });
  }
  askSubmit() {
    const blank = this.answers.filter((a) => a < 0).length;
    UI.confirm({
      title: "SUBMIT EXAM?",
      text: blank ? `${blank} question${blank === 1 ? " is" : "s are"} unanswered and will be marked wrong.` : "You answered every question.",
      yes: "SUBMIT", no: "KEEP WORKING", color: COLORS.lime,
      onYes: () => this.submit(),
    });
  }
  submit() {
    if (this.state === "over") return;
    this.state = "over";
    const by = {};
    let correct = 0;
    const review = [];
    this.rounds.forEach((r, i) => {
      const a = this.answers[i];
      const ok = this.run.record(r, a);
      if (ok) correct++;
      const b = (by[r.q.ch] = by[r.q.ch] || { n: 0, ok: 0 });
      b.n++;
      if (ok) b.ok++;
      if (!ok) review.push({ q: r.q.q, a: r.correctText, x: a >= 0 ? r.text(a) : null, e: r.q.explain, r: `P. ${r.q.page} · STAGE ${r.q.ch} · ${r.q.topic}` });
    });
    const score = pct(correct, this.rounds.length);
    const passed = score >= 60;
    Store.state.stats.exams = (Store.state.stats.exams || 0) + 1;
    Store.state.stats.bestExam = Math.max(Store.state.stats.bestExam || 0, score);
    Store.save();
    const ending = this.has3D && this.boss; // the boss dies (or stands) first; the results follow
    if (!ending || !passed) Sound.sfx(passed ? "win" : "gameover");
    const mins = Math.floor(this.elapsed / 60), secs = Math.floor(this.elapsed % 60);
    const breakdown = Object.keys(by).sort((a, b) => a - b).map((n) => {
      const b = by[n], p = pct(b.ok, b.n);
      return `<div class="mrow"><span>STAGE ${n} · ${esc(CH(+n).title)}</span><b style="color:${p >= 60 ? COLORS.lime : COLORS.red}">${b.ok}/${b.n}</b>
        <span class="meter" style="--c:${p >= 60 ? COLORS.lime : COLORS.red}"><i style="width:${p}%"></i></span></div>`;
    }).join("");
    const results = () => showResults({
      game: "exam", sel: this.sel, run: this.run, score, boardLabel: this.rounds.length + "Q",
      title: passed ? "PASSED" : "NOT YET", color: passed ? COLORS.lime : COLORS.red,
      headline: score + "%", sub: `${correct} of ${this.rounds.length} correct · pass mark 60% · ${mins}:${pad(secs)} used`,
      hideRunTiles: true,
      tiles: [{ k: "SCORE", v: score + "%", c: passed ? COLORS.lime : COLORS.red }, { k: "CORRECT", v: `${correct}/${this.rounds.length}` }, { k: "TIME", v: `${mins}:${pad(secs)}` }],
      extraHTML: `<h2 class="section-h">BY CHAPTER</h2><div class="mastery-list">${breakdown}</div>`,
      reviewTitle: "QUESTIONS TO REVIEW", review,
    });
    // Everything above is the exam itself, unchanged. What follows is only how the
    // result is shown: a pass kills the boss, a fail leaves it standing.
    if (ending) this.boss.finale(passed, score, results);
    else results();
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      this.elapsed += dt;
      const clock = $("[data-clock]", this.el);
      if (this.limit) {
        const left = Math.max(0, this.limit - this.elapsed);
        UI.text(clock, `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}`);
        this.timerBar(left / this.limit);
        if (left <= 0) { UI.toast("TIME! EXAM SUBMITTED"); this.submit(); }
      } else {
        UI.text(clock, `${Math.floor(this.elapsed / 60)}:${pad(Math.floor(this.elapsed % 60))}`);
      }
    }
    if (!this.has3D) return;
    const t = this.t;
    this.dist += (this.distT - this.dist) * Math.min(1, dt * 2.5);
    const B = this.boss;
    if (B) {
      // it grows more menacing as the exam is worked through: how many are answered, never which were right
      let done = 0;
      for (let i = 0; i < this.answers.length; i++) if (this.answers[i] >= 0) done++;
      // (or, on a timed exam, how much of the time is gone, whichever is further along)
      B.dreadTo = this.state === "ask" && this.answers.length ? Math.max(done / this.answers.length, this.limit ? clamp(this.elapsed / this.limit, 0, 1) : 0) : 0;
      B.update(dt, t);
      this.spotLight.intensity = 2.6 * B.lightK;
      this.rimA.intensity = 2.8 * B.lightK;
      this.rimB.intensity = 1.8 * B.lightK;
      // and the dark closes in round it
      if (this.state === "ask") this.scene.userData.post.vignette = 1.45 + 0.3 * B.dread + 0.2 * B.menace;
    }
    this.ambience.update(dt, t);
    if (this.rippleT < 1) {
      this.rippleT = Math.min(1, this.rippleT + dt / 1.2);
      const k = this.rippleT;
      this.ripple.scale.setScalar(BOSS_DAIS_R + 1 + k * 7);
      this.ripple.material.opacity = 0.9 * (1 - k) * (1 - k);
      this.ripple.visible = k < 1;
    }
    // the current question's stud breathes
    if (this.state === "ask") {
      const c = this.studs.geometry.attributes.color, p = 0.75 + 0.25 * Math.sin(t * 3);
      c.setXYZ(this.i, 2.2 * p, 1.7 * p, 3.0 * p);
      c.needsUpdate = true;
    }
    // from below, close, and closer still as the end nears or it leans in
    const d = this.dist * (1 - (B ? 0.08 * B.dread + 0.05 * B.menace : 0));
    this.camBase.set(Pointer.x * 0.5, EXAM_LOOK_Y - d * 0.28 + Math.sin(t * 0.3) * 0.05 - Pointer.y * 0.2, d);
    this.lookAt.set(0, EXAM_LOOK_Y, 0.5);
    if (B && (B.mode === "die" || B.mode === "rage") && !B.quick) B.camera(dt); // the ending has its own camera
    this.placeCamera();
    this.motes.userData.drift(t);
    this.moonMotes.userData.drift(t);
    FX.sync(this.scene, t);
  }
}
