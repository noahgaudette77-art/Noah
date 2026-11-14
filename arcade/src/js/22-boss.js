// BOSS RUSH — every chapter has a boss that only falls to its hardest questions.
// The boss charges an attack while you read; answer right to shoot first.
// Reuses blasterMerge() and BlasterShards from 20-blaster.js (concatenated first).

function bossRuneTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.translate(256, 256);
  x.strokeStyle = x.fillStyle = "#ffffff";
  const ring = (r, w) => { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke(); };
  ring(244, 7);
  ring(222, 2.5);
  ring(150, 3.5);
  ring(134, 1.5);
  for (let i = 0; i < 60; i++) {
    x.save();
    x.rotate((i / 60) * Math.PI * 2);
    x.fillRect(-1.5, -240, 3, i % 5 ? 10 : 18);
    x.restore();
  }
  for (let i = 0; i < 12; i++) {
    x.save();
    x.rotate((i / 12) * Math.PI * 2 + 0.13);
    x.fillRect(-14, -206, 28, 7);
    x.fillRect(-4, -196, 8, 26);
    x.fillRect(-14, -176, 28, 5);
    x.restore();
  }
  x.lineWidth = 3;
  [0, Math.PI].forEach((o) => {
    x.beginPath();
    for (let k = 0; k <= 3; k++) {
      const a = o + (k / 3) * Math.PI * 2 - Math.PI / 2;
      x[k ? "lineTo" : "moveTo"](Math.cos(a) * 134, Math.sin(a) * 134);
    }
    x.stroke();
  });
  return new THREE.CanvasTexture(c);
}

class BossGame extends QuizGame {
  constructor(sel) {
    super(sel, "boss", { fov: 60, fog: [0x0a0322, 26, 120], bg: 0x0a0322 });
    this.bossKey = sel.chapters.length === 1 ? sel.chapters[0] : "all";
    this.cfg = BOSSES[this.bossKey];
    this.maxHp = this.cfg.hp;
    this.hp = this.maxHp;
    this.hearts = 3;
    this.score = 0;
    this.charge = 0;
    this.bossY = 3.4;
    this.bossScale = 1;
    this.showY = 3.4;
    this.showScale = 1;
    // The arena is centred on the origin; the camera stands back at z = camZ.
    this.camY = 1.25;
    this.camZ = 16;
    this.picker = new QuestionPicker(selectionQids(sel), { preferHard: true });
    if (this.has3D) this.build3D();
    const c = this.cfg.color;
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="lives" data-lives></div>
        <div class="grow"></div>
        <div class="score"><small>SCORE · ${esc(sel.label)}</small><span data-score>000000</span></div>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="bossbar" style="--c:${c}">
        <div class="name"><span>${esc(this.cfg.name)}</span><span data-hp>${this.hp}/${this.maxHp}</span></div>
        <span class="meter slide" style="--c:${c}"><i data-hpbar style="transform:none"></i></span>
      </div>
      <div class="charge" title="Boss attack charge"><i data-charge></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
    </section>`);
    this.hud();
  }
  build3D() {
    const s = this.scene;
    const hex = this.cfg.color;
    const col = new THREE.Color(hex);
    s.userData.post = { exposure: 1.1, bloom: 0.78, threshold: 1.1, saturation: 1.16, contrast: 1.14, vignette: 1.15, tint: [1, 1, 1], ao: 1, shadow: 0.85, shadowLen: 0.11, sun: [0.2, 1, 0.55], mblur: 0.7, dirt: 0.45,
      dof: { focus: 16, near: 200, far: 90, max: 0.0036, sky: 0.5, k: 0.7 } }; // (the lens holds the boss; the tiers and the ridge behind it go a little soft)
    this.fogBase = s.fog.color.clone().lerp(col, 0.1);
    s.fog.color.copy(this.fogBase);
    this.rageCol = new THREE.Color(COLORS.red);
    this.rageMid = new THREE.Color(0x2a0410);
    this.rageFog = new THREE.Color(0x2a0614);
    this.rageLine = neon(COLORS.red, 1.6);
    this.rageAmb = new THREE.Color(0xc03050);
    this.bossCol = col.clone();
    this.rageK = 0;
    this.env = makeEnvMap({
      top: 0x0b0424, horizon: col.clone().multiplyScalar(0.45), bottom: 0x05010f, glow: 0.6,
      panels: [
        { color: hex, pos: [0, 12, -16], w: 12, h: 2.5, k: 2 },
        { color: 0x35efff, pos: [16, 4, 4], w: 10, h: 3, k: 2.2 },
        { color: 0xff3ad4, pos: [-16, 5, 2], w: 10, h: 3, k: 2.2 },
        { color: 0x6a5aff, pos: [-6, -12, 10], w: 14, h: 4, k: 1.6 },
        { color: 0xffffff, pos: [4, 14, 10], w: 6, h: 1.5, k: 3.2 },
      ],
    });
    this.ambient = new THREE.AmbientLight(0x6a5aa8, 0.36);
    this.ambientBase = this.ambient.color.clone();
    s.add(this.ambient);
    const key = new THREE.DirectionalLight(0xe6deff, 1.45);
    key.position.set(3, 8, 10);
    s.add(key);
    // Lit in its own colour: two lamps behind it, either side (one its colour, one that colour paled toward
    // white), edge it against the dark stands; a third at its feet in front lights it from below.
    const big = this.bossKey === "all" ? 1.3 : 1; // (the final boss is the brightest thing in the building)
    [[-11, col.getHex(), 3.6], [11, col.clone().lerp(new THREE.Color(0xffffff), 0.55).getHex(), 3.0]].forEach(([x, c, k]) => { const l = new THREE.PointLight(c, k * big, 46, 1.6); l.position.set(x, 8, -9); s.add(l); });
    const under = new THREE.PointLight(col.getHex(), 1.5 * big, 24, 1.8);
    under.position.set(0, 0.7, 6.5);
    s.add(under);
    this.eyeLight = new THREE.PointLight(hex, 0.6, 26, 2);
    s.add(this.eyeLight);
    this.hitLight = new THREE.PointLight(0xffffff, 0, 30, 2);
    s.add(this.hitLight);
    // sky with a horizon in the boss's colour
    this.skyHorizon = col.clone().multiplyScalar(0.3);
    this.skyMid = new THREE.Color(0x10042a).lerp(col, 0.05);
    this.sky = makeSky({ top: 0x030009, mid: this.skyMid, horizon: this.skyHorizon, bottom: 0x05010f, glow: 1.7, stars: 1, clouds: 0.3 });
    s.add(this.sky);
    // a distant ridge for a layered horizon (not reflected: the mirror pass stays cheap)
    const ridge = makeRidge({ z: -62, width: 360, height: 15, n: 40, top: new THREE.Color(0x1c0838).lerp(col, 0.12), bottom: 0x07021a, line: hex, lineK: 1.5, wire: false });
    ridge.traverse((o) => o.layers.set(1));
    s.add(ridge);
    // the reflective polar-grid floor
    this.mirror = new Mirror(0);
    this.lineBase = neon(hex, 1.35);
    this.floor = makeNeonFloor({ size: 600, cell: 3, line: hex, lineK: 1.35, base: 0x05010f, mirror: this.mirror, reflect: 0.55, polar: true, spokes: 24, glow: 0.3, ripple: 0.0018, streak: 0.01 });
    s.add(this.floor);
    // where it stands: a wide pool of its own light on the floor, and its shadow in the middle of the pool
    const pool = makeLightPool({ color: hex, radius: 11, intensity: 0.5 });
    pool.layers.set(1);
    s.add(pool);
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.78, depthWrite: false }));
    this.contact.rotation.x = -Math.PI / 2;
    this.contact.position.y = 0.05;
    this.contact.renderOrder = 5;
    this.contact.layers.set(1);
    s.add(this.contact);
    s.userData.mirrors = [this.mirror];
    this.makeArena();
    this.makeCrowd();
    this.motes = makeMotes({ count: 110, box: [46, 16, 34], center: [0, 7, -10], color: hex, size: 0.2, k: 1.5 });
    this.motes.layers.set(1);
    s.add(this.motes);
    this.decor(this.motes);
    this.boss = this.makeBoss();
    this.boss.position.set(0, 14, 0);
    s.add(this.boss);
    this.shards = new BlasterShards(s, 40);
    this.shards.mesh.layers.set(1);
    this.flash = glowSprite(0xffffff, 1, 0);
    this.flash.visible = false;
    this.flash.renderOrder = 8;
    s.add(this.flash);
    // the player's plasma bolt, the boss's eye beam and the floor shockwaves: built
    // once, reused every time (a fresh set per shot stalled the frame)
    const bolt = { shot: glowSprite(neon(COLORS.cyan, 3), 1.4, 1), hot: glowSprite(neon(0xffffff, 3), 0.55, 1), tail: new Trail({ length: 12, width: 0.14, color: COLORS.cyan, intensity: 2.6 }), tok: 0 };
    bolt.shot.add(bolt.hot);
    bolt.tc0 = bolt.tail.mesh.material.uniforms.uColor.value.clone();
    bolt.shot.visible = bolt.tail.mesh.visible = false;
    s.add(bolt.shot, bolt.tail.mesh);
    this.bolt = bolt;
    const atk = { beam: makeBeam(col.getHex(), 3.6), glow: makeBeam(col.getHex(), 0.9), muzzle: glowSprite(0xffffff, 3, 1), tok: 0 };
    atk.muzzle.renderOrder = 7;
    atk.muzzle.visible = false;
    s.add(atk.beam, atk.glow, atk.muzzle);
    this.atk = atk;
    const fr = new THREE.RingGeometry(0.85, 1, 64);
    this.floorRings = [0, 1, 2].map(() => {
      const ring = new THREE.Mesh(fr, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      ring.layers.set(1);
      ring.visible = false;
      ring.userData.tok = 0;
      s.add(ring);
      return ring;
    });
    this.floorRingI = 0;
    this.flashT = 0;
    this.flashSize = 8;
    this.camBase.set(0, this.camY, this.camZ);
    this.lookAt.set(0, this.bossY, 0);
  }
  // Pillars ringing the arena (glossy metal, neon edges, glowing caps), each
  // throwing a sweeping searchlight into the sky. Merged: a few draw calls total.
  makeArena() {
    const s = this.scene, hex = this.cfg.color;
    const R = 17, H = 44;
    const angles = [18, 44, 70, 98].flatMap((d) => [d, -d]).map((d) => (d * Math.PI) / 180);
    const shaft = new THREE.CylinderGeometry(0.5, 0.72, 9, 4, 1);
    shaft.rotateY(Math.PI / 4);
    shaft.translate(0, 5, 0);
    const shaftEdges = new THREE.EdgesGeometry(shaft, 1).attributes.position.array;
    const cone = new THREE.CylinderGeometry(3.4, 0.32, H, 14, 1, true);
    cone.translate(0, H / 2, 0);
    const coneNI = cone.toNonIndexed();
    cone.dispose();
    const cp = coneNI.attributes.position.array, cn = coneNI.attributes.normal.array, cv = cp.length / 3;
    const body = [], caps = [], pools = [], edges = [];
    const bp = [], bn = [], bb = [], bph = [], bt = [];
    const v = new THREE.Vector3();
    angles.forEach((a, i) => {
      const x = Math.sin(a) * R, z = -Math.cos(a) * R;
      const at = (y) => new THREE.Matrix4().makeRotationY(-a).setPosition(x, y, z);
      body.push({ geo: new THREE.BoxGeometry(2, 0.5, 2), matrix: at(0.25), color: 0x2a2244 });
      body.push({ geo: shaft.clone(), matrix: at(0), color: 0x1c1733 });
      body.push({ geo: new THREE.BoxGeometry(1.4, 0.35, 1.4), matrix: at(9.6), color: 0x2a2244 });
      caps.push({ geo: new THREE.OctahedronGeometry(0.55, 0), matrix: at(10.5) });
      const pool = new THREE.PlaneGeometry(7, 7);
      pool.rotateX(-Math.PI / 2);
      pools.push({ geo: pool, matrix: at(0.04) });
      const m = at(0);
      for (let k = 0; k < shaftEdges.length; k += 3) {
        v.set(shaftEdges[k], shaftEdges[k + 1], shaftEdges[k + 2]).applyMatrix4(m);
        edges.push(v.x, v.y, v.z);
      }
      for (let k = 0; k < cv; k++) {
        bp.push(cp[k * 3], cp[k * 3 + 1], cp[k * 3 + 2]);
        bn.push(cn[k * 3], cn[k * 3 + 1], cn[k * 3 + 2]);
        bb.push(x, 10.6, z);
        bph.push(i * 1.7);
        bt.push(cp[k * 3 + 1] / H);
      }
    });
    shaft.dispose();
    coneNI.dispose();
    const pillarMat = Object.assign(glossy(0xffffff, { env: this.env, metal: 0.85, rough: 0.3, envI: 1.3 }), { vertexColors: true });
    s.add(new THREE.Mesh(blasterMerge(body), pillarMat));
    const eg = new THREE.BufferGeometry();
    eg.setAttribute("position", new THREE.Float32BufferAttribute(edges, 3));
    this.pillarEdgeMat = new THREE.LineBasicMaterial({ color: neon(hex, 1.8) });
    s.add(new THREE.LineSegments(eg, this.pillarEdgeMat));
    this.capMat = new THREE.MeshBasicMaterial({ color: neon(hex, 2.6) });
    s.add(new THREE.Mesh(blasterMerge(caps), this.capMat));
    const poolMesh = new THREE.Mesh(blasterMerge(pools), new THREE.MeshBasicMaterial({ map: glowTexture(), color: neon(hex, 0.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    poolMesh.layers.set(1);
    s.add(poolMesh);
    this.decor(poolMesh);
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
    bg.setAttribute("normal", new THREE.Float32BufferAttribute(bn, 3));
    bg.setAttribute("aBase", new THREE.Float32BufferAttribute(bb, 3));
    bg.setAttribute("aPhase", new THREE.Float32BufferAttribute(bph, 1));
    bg.setAttribute("aT", new THREE.Float32BufferAttribute(bt, 1));
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: neon(hex, 1) }, uI: { value: 0.44 }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute vec3 aBase; attribute float aPhase; attribute float aT; uniform float uTime;
        varying float vT; varying vec3 vN; varying vec3 vV;
        void main(){
          vec2 o = normalize(aBase.xz);
          float sw = sin(uTime * 0.3 + aPhase) * 0.32;
          vec3 dir = normalize(vec3(o.x * 0.3 - o.y * sw, 1.0, o.y * 0.3 + o.x * sw));
          vec3 side = normalize(cross(dir, vec3(0.0, 0.0, 1.0)));
          vec3 fwd = cross(side, dir);
          vec3 p = side * position.x + dir * position.y + fwd * position.z;
          vec3 n = side * normal.x + dir * normal.y + fwd * normal.z;
          vec4 mv = modelViewMatrix * vec4(aBase + p, 1.0);
          vN = normalize(normalMatrix * n); vV = normalize(-mv.xyz); vT = aT;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uI; uniform float uTime; varying float vT; varying vec3 vN; varying vec3 vV;
        void main(){
          float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.4);
          float fall = pow(1.0 - vT, 1.5) * smoothstep(0.0, 0.04, vT);
          float flick = 0.92 + 0.08 * sin(uTime * 9.0 + vT * 5.0);
          gl_FragColor = vec4(uColor * uI * face * fall * flick, 1.0);
        }`,
    });
    const beams = new THREE.Mesh(bg, this.beamMat);
    beams.frustumCulled = false;
    beams.renderOrder = 4;
    s.add(beams);
    this.decor(beams);
    // the summoning circle and a pool of light under the boss
    this.rune = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: bossRuneTexture(), color: neon(hex, 1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.rune.rotation.x = -Math.PI / 2;
    this.rune.position.y = 0.05;
    this.rune.layers.set(1);
    s.add(this.rune);
    this.pool = makeLightPool({ color: hex, radius: 7, intensity: 0.55 });
    this.pool.layers.set(1);
    s.add(this.pool);
  }
  // The final boss: a war machine with a man's head. A pale skull with burning eyes
  // and a steel jaw rides a black armored hulk: slab shields on the shoulders,
  // piston arms, a ribbed gut lit from inside and a thruster where legs would be.
  // It offers the same handles as the other bosses (core, eye, rings, orbs, charge,
  // sparks), so the fight's animation drives it unchanged.
  // Every boss is a cyborg from the kit in 22b-cyborg.js. This wraps one in what the
  // fight expects: an eye that aims the beam, a halo, orbiting gems, the charge orb.
  // Behind the ring: four tiers of an amphitheatre curving round the back, each with a rail of the boss's colour
  // and a crowd of lights along it (they sway, and surge when a blow lands).
  makeCrowd() {
    const s = this.scene, hex = this.cfg.color, parts = [], rails = [], pos = [], col = [], seed = [], people = [], pSeed = [];
    const c0 = new THREE.Color(hex), tints = [c0, new THREE.Color(0xffffff), c0.clone().lerp(new THREE.Color(0xffffff), 0.5), new THREE.Color(0xffd27a)];
    for (let k = 0; k < 4; k++) {
      const Rk = 27 + k * 6, y = 2.2 + k * 4.1, N = 44;
      for (let i = 0; i < N; i++) {
        const a0 = (-118 + (236 * i) / N) * (Math.PI / 180), a1 = (-118 + (236 * (i + 1)) / N) * (Math.PI / 180), am = (a0 + a1) / 2;
        const w = 2 * Rk * Math.sin((a1 - a0) / 2) + 0.06, m = new THREE.Matrix4().makeRotationY(-am).setPosition(Math.sin(am) * Rk, y, -Math.cos(am) * Rk);
        parts.push({ geo: new THREE.BoxGeometry(w, 3.6, 0.9), matrix: m, color: k % 2 ? 0x0b0918 : 0x0f0c20 });
        rails.push({ geo: new THREE.BoxGeometry(w, 0.12, 0.12), matrix: new THREE.Matrix4().makeRotationY(-am).setPosition(Math.sin(am) * (Rk - 0.5), y + 1.9, -Math.cos(am) * (Rk - 0.5)) });
        // the people: two rows on every tier, shoulder to shoulder, some with their arms up
        const per = Math.max(3, Math.floor(w / 0.8));
        for (let row = 0; row < 2; row++) for (let j = 0; j < per; j++) {
          const a = a0 + (a1 - a0) * ((j + 0.5 + (Math.random() - 0.5) * 0.5 + row * 0.5) / per), r = Rk - 0.05 + row * 0.42, fy = y + 1.8 + row * 0.5, sc = 0.88 + Math.random() * 0.26, sd = Math.random();
          const at = (dx, dy, dz, rz = 0) => new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeRotationZ(rz)).setPosition(Math.sin(a) * r + Math.cos(a) * dx - Math.sin(a) * dz, fy + dy * sc, -Math.cos(a) * r + Math.sin(a) * dx + Math.cos(a) * dz);
          const cloth = new THREE.Color().setHSL(Math.random(), 0.3 + Math.random() * 0.3, 0.035 + Math.random() * 0.06), skin = new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 0.35, 0.1 + Math.random() * 0.12);
          people.push({ geo: new THREE.BoxGeometry(0.6 * sc, 0.82 * sc, 0.32), matrix: at(0, 0.45, 0), color: cloth }); pSeed.push(sd, 36);
          people.push({ geo: new THREE.IcosahedronGeometry(0.19 * sc, 0), matrix: at(0, 1.04, 0), color: skin }); pSeed.push(sd, 60);
          if (Math.random() < 0.3) for (const sx of [-1, 1]) { people.push({ geo: new THREE.BoxGeometry(0.11, 0.62 * sc, 0.11), matrix: at(sx * 0.36 * sc, 1.02, 0, sx * -0.28), color: cloth }); pSeed.push(sd, 36); }
        }
        // what they hold up: glow sticks in the house colours, a few phone lights
        for (let j = 0; j < 2; j++) {
          const a = a0 + (a1 - a0) * Math.random(), r = Rk - 0.1 + Math.random() * 0.55, t = tints[Math.floor(Math.random() * tints.length)], b = 0.45 + Math.random() * 0.8;
          pos.push(Math.sin(a) * r, y + 3.15 + Math.random() * 0.7, -Math.cos(a) * r); col.push(t.r * b, t.g * b, t.b * b); seed.push(Math.random());
        }
        // aisle lights down the face of the tier, every fourth bay
        if (i % 4 === 0) for (let q = 0; q < 5; q++) rails.push({ geo: new THREE.BoxGeometry(0.16, 0.09, 0.06), matrix: new THREE.Matrix4().makeRotationY(-a0).setPosition(Math.sin(a0) * (Rk - 0.47), y - 1.3 + q * 0.62, -Math.cos(a0) * (Rk - 0.47)) });
      }
    }
    // The crowd itself: unlit by its own lamps, lit by the arena's, bobbing on the spot and jumping at a blow.
    const U = this.crowdU = { uTime: { value: 0 }, uPx: { value: 1 }, uCheer: { value: 0 } };
    const pg = blasterMerge(people), ps = new Float32Array(pg.attributes.position.count);
    for (let i = 0, v = 0; i < pSeed.length; i += 2) { ps.fill(pSeed[i], v, v + pSeed[i + 1]); v += pSeed[i + 1]; }
    pg.setAttribute("aSeed", new THREE.BufferAttribute(ps, 1));
    const pm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, envMap: this.env, envMapIntensity: 0.35 });
    pm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uCheer = U.uCheer;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aSeed; uniform float uTime; uniform float uCheer;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += sin(uTime * (1.2 + aSeed * 1.4) + aSeed * 40.0) * (0.04 + 0.2 * uCheer) + uCheer * 0.38 * fract(aSeed * 7.3);");
    };
    pm.customProgramCacheKey = () => "boss-crowd";
    const folk = new THREE.Mesh(pg, pm);
    folk.layers.set(1);
    folk.frustumCulled = false;
    s.add(folk);
    const wall = new THREE.Mesh(blasterMerge(parts), Object.assign(glossy(0xffffff, { env: this.env, metal: 0.5, rough: 0.62, envI: 0.3 }), { vertexColors: true }));
    wall.layers.set(1); // (not in the floor's reflection)
    s.add(wall);
    this.railMat = new THREE.MeshBasicMaterial({ color: neon(hex, 1.5) });
    const rail = new THREE.Mesh(blasterMerge(rails), this.railMat);
    rail.layers.set(1);
    s.add(rail);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aCol", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    this.crowd = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aSeed; uniform float uTime; uniform float uPx; uniform float uCheer; varying vec3 vCol;
        void main(){
          vec3 p = position;
          p.y += sin(uTime * (1.2 + aSeed * 1.4) + aSeed * 40.0) * (0.12 + 0.5 * uCheer) + uCheer * 0.5 * aSeed; // they sway, and jump when a blow lands
          vCol = aCol * (0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 17.0)) * (1.0 + uCheer);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPx * 150.0 / -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "varying vec3 vCol; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; gl_FragColor = vec4(vCol * (exp(-r * 9.0) + 0.16 * exp(-r * 2.6)) * smoothstep(1.0, 0.55, r), 1.0); }",
    }));
    this.crowd.frustumCulled = false;
    this.crowd.layers.set(1);
    s.add(this.crowd);
    this.cheer = 0;
  }
  makeBoss() {
    const hex = this.cfg.color;
    const rig = (this.rig = new CyborgRig(this, this.bossKey));
    const grp = rig.grp, body = rig.G.body, eye = rig.eye;
    this.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), vertexColors: true });
    // a halo of runner lights behind the shoulders, and a thin ring that sways
    const ringGeo = blasterMerge([{ geo: new THREE.TorusGeometry(3.5, 0.05, 4, 64), color: new THREE.Color(1.2, 1.2, 1.2) }]
      .concat([0, 1, 2, 3, 4, 5].map((i) => ({ geo: new THREE.TorusGeometry(3.5, 0.1, 4, 8, 0.32), matrix: new THREE.Matrix4().makeRotationZ((i / 6) * Math.PI * 2), color: new THREE.Color(2.7, 2.7, 2.7) }))));
    const ring = new THREE.Mesh(ringGeo, this.ringMat);
    ring.position.set(0, 0.6, -1.5);
    ring.scale.setScalar(0.9);
    grp.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.05, 0.03, 3, 72), new THREE.MeshBasicMaterial({ color: neon(hex, 1.5) }));
    ring2.position.set(0, 0.6, -1.7);
    ring2.scale.setScalar(0.9);
    grp.add(ring2);
    const orbs = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.3, 0), glossy(0x1a1430, { env: this.env, metal: 0.6, rough: 0.25, envI: 1.4, emissive: hex, emissiveK: 1.3 }), 6);
    orbs.frustumCulled = false;
    orbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    grp.add(orbs);
    const charge = glowSprite(neon(hex, 2.4), 0.1, 1);
    charge.position.set(0, 2.84, 1.25);
    charge.renderOrder = 6;
    body.add(charge);
    const N = 44;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: neon(hex, 3), map: glowTexture(), size: 0.2, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sparks.position.copy(charge.position);
    sparks.frustumCulled = false;
    sparks.layers.set(1);
    body.add(sparks);
    this.sparkData = Array.from({ length: N }, () => ({ d: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-0.3, 1)).normalize(), r: rand(2.5, 5), p: Math.random() }));
    // `core` is an empty handle: the fight flashes its material (the armor) on a hit
    const core = new THREE.Group();
    core.userData.mat = rig.mat;
    grp.userData = { core, eye, ring, ring2, orbs, charge, sparks, horns: new THREE.Group(), body };
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    return grp;
  }
  onLayout() {
    if (!this.has3D) return;
    const bs = this.bandSize(16);
    this.bossScale = clamp(Math.min((bs.h * 0.8) / 7.4, (bs.w * 0.86) / 8), 0.3, 1.1);
    // hover just above the floor so the reflection sits in view
    this.bossY = 1.1 + 3.25 * this.bossScale;
    // the band changes with each question's length: ease into the new framing
    if (!this.laidOut) {
      this.laidOut = true;
      this.showScale = this.bossScale;
      this.showY = this.bossY;
      this.boss.scale.setScalar(this.bossScale);
    }
  }
  get lines() {
    const L = bossLines(this.bossKey) || {};
    return {
      intro: L.intro && L.intro.length ? L.intro : [this.cfg.line],
      hit: L.hit && L.hit.length ? L.hit : ["ARGH!", "A lucky shot!", "Impossible!"],
      miss: L.miss && L.miss.length ? L.miss : [this.cfg.line],
      defeat: L.defeat || "This isn't over...",
      win: L.win || this.cfg.line,
    };
  }
  // The boss talks: a speech bubble just above the 3D strip.
  taunt(text) {
    Dialog.say(this.el, text, { top: this.band ? this.band.top + 8 : 140, color: this.cfg.color, voice: 150, name: this.cfg.name, ms: 1900 });
  }
  start() {
    Sound.play("boss");
    Sound.sfx("charge");
    UI.banner("WARNING", COLORS.red, "BOSS APPROACHING");
    this.layoutBand();
    if (this.has3D) {
      this.tw.add(1.4, (k) => { this.boss.position.y = lerp(14, this.bossY, k); }, () => {
        this.shockwave(new THREE.Vector3(0, 0.2, 0), neon(this.cfg.color, 2), 9, 0.8);
        this.floorRing(this.cfg.color, 18, 1);
        this.flashAt(new THREE.Vector3(0, 0.6, 0), this.cfg.color, 0.8, 10);
        this.shake(0.4);
        GFX.pulse(8, 0.15);
        Haptics.buzz(80);
        Sound.sfx("hit");
      }, Ease.outBack);
    }
    this.tw.wait(1.6, () => {
      if (this.unmounted) return;
      Dialog.open({
        lines: this.lines.intro,
        name: this.cfg.name,
        boss: true,
        color: this.cfg.color,
        voice: 140,
        skipLabel: "FIGHT!",
        onDone: () => { if (!this.unmounted) this.nextQuestion(); },
      });
    });
  }
  hud() {
    if (!this.el) return;
    UI.text($("[data-score]", this.el), fmtScore(this.score));
    UI.text($("[data-hp]", this.el), Math.max(0, this.hp) + "/" + this.maxHp);
    UI.meter($("[data-hpbar]", this.el), this.hp / this.maxHp);
    this.lives(this.hearts, 3, "heart", COLORS.red);
  }
  get enraged() { return this.hp / this.maxHp < 0.35; }
  nextQuestion() {
    if (this.unmounted) return;
    const q = this.picker.next();
    if (!q) { UI.toast("NO QUESTIONS IN THIS STAGE YET"); return this.quit(); }
    this.round = new Round(q);
    this.quiz.show(this.round, `STAGE ${q.ch} · ${q.topic}`);
    this.T = readTime(this.round, this.enraged ? 0.85 : 1);
    this.charge = 0;
    this.layoutBand();
    this.state = "ask";
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.state = "resolve";
    const frac = this.charge / this.T;
    const ok = this.run.record(this.round, i, 1 - frac);
    this.quiz.reveal(i);
    if (ok) this.playerHit(frac);
    else this.bossAttack(false);
  }
  timeout() {
    this.state = "resolve";
    this.run.record(this.round, -1);
    this.quiz.reveal(-1);
    this.bossAttack(true);
  }
  playerHit(frac) {
    const dmg = 10 + Math.round(10 * (1 - frac)) + Math.min(8, (this.run.streak - 1) * 2);
    Sound.sfx("shot");
    const land = () => {
      const wasCalm = !this.enraged;
      this.hp -= dmg;
      this.score += dmg * 10;
      Sound.sfx("boom");
      Sound.sfx("correct");
      UI.flash("good");
      GFX.pulse(5, 0.12);
      GFX.hitStop(this.hp <= 0 ? 260 : 80);
      Haptics.buzz(30);
      Sound.setIntensity(this.enraged ? 3 : Sound.intensityFor(this.run.streak));
      if (this.hp > 0) this.taunt(pick(this.lines.hit));
      if (wasCalm && this.enraged && this.hp > 0) {
        this.tw.wait(0.5, () => { UI.banner("ENRAGED", COLORS.red, "Its attacks charge faster"); Sound.sfx("charge"); });
        if (this.has3D) this.scene.fog.color.setHex(0x2a0614);
      }
      const p = this.bandPoint(0.25);
      UI.floater("-" + dmg + " HP", p.x, p.y, this.cfg.color);
      if (this.has3D) {
        const b = this.boss;
        const at = b.position.clone().add(new THREE.Vector3(0, 0, 2 * this.bossScale));
        this.bursts.burst(at, this.cfg.color, { n: 60, speed: 7, size: 0.35 });
        this.bursts.burst(at, COLORS.cyan, { n: 24, speed: 5, size: 0.3, life: 0.6 });
        this.shards.burst(at, this.cfg.color, 12, this.bossScale * 1.1, 8, 6);
        this.flashAt(at, COLORS.cyan, 1, 5 * this.bossScale + 2);
        const em = b.userData.core.userData.mat.emissive;
        const base = em.clone();
        this.tw.add(0.4, (k) => { em.setRGB(lerp(1.1, base.r, k), lerp(1.1, base.g, k), lerp(1.1, base.b, k)); });
        this.tw.add(0.35, (k) => { b.position.z = -Math.sin(k * Math.PI) * 1.2; });
        this.shockwave(b.position.clone(), neon(this.cfg.color, 2), 6);
      }
      this.hud();
      const title = this.hp <= 0 ? `FINISHING BLOW! −${dmg} HP` : `HIT! −${dmg} HP`;
      this.tw.wait(0.35, () => {
        if (this.unmounted) return;
        this.quiz.feedback({ ok: true, title, auto: this.explainAuto(true), onNext: () => this.after() });
      });
    };
    if (this.has3D) {
      // a plasma bolt with a ribbon tail
      const { shot, tail, tc0 } = this.bolt;
      const tok = ++this.bolt.tok;
      const from = new THREE.Vector3(0, this.camY - 1.2, this.camZ - 3);
      const to = this.boss.position.clone();
      shot.position.copy(from);
      shot.visible = true;
      tail.reset(from);
      tail.mesh.visible = true;
      const tc = tail.mesh.material.uniforms.uColor.value;
      tc.copy(tc0);
      this.tw.add(0.3, (k) => { if (this.bolt.tok === tok) { shot.position.lerpVectors(from, to, k); tail.push(shot.position); } }, () => {
        if (this.bolt.tok === tok) shot.visible = false;
        land();
        this.tw.add(0.25, (k) => { if (this.bolt.tok === tok) { tail.push(to); tc.copy(tc0).multiplyScalar(1 - k); } }, () => {
          if (this.bolt.tok === tok) tail.mesh.visible = false;
        });
      }, Ease.inCubic);
    } else land();
  }
  bossAttack(slow) {
    this.hearts--;
    Sound.sfx("charge");
    const hit = () => {
      Sound.sfx("hit");
      UI.flash("hit");
      this.shake(0.55);
      GFX.pulse(14, 0);
      Haptics.buzz([60, 40, 90]);
      Sound.setIntensity(this.enraged ? 3 : 0);
      this.taunt(this.hearts > 0 ? pick(this.lines.miss) : this.lines.win);
      this.hud();
      const title = (slow ? "TOO SLOW! " : "WRONG! ") + (this.hearts > 0 ? "THE BOSS HITS YOU" : "YOU'RE OUT OF HEARTS");
      this.tw.wait(0.4, () => {
        if (this.unmounted) return;
        this.quiz.feedback({ ok: false, title, onNext: () => this.after() });
      });
    };
    if (this.has3D) {
      // an energy beam from the eye, with a hot core, an outer glow and a muzzle flare
      const eye = new THREE.Vector3();
      this.boss.userData.eye.getWorldPosition(eye);
      const to = new THREE.Vector3(0, this.camY - 1.0, this.camZ - 1.5);
      const r = 0.25 * this.bossScale + 0.05;
      const col = this.enraged ? COLORS.red : this.cfg.color;
      const { beam, glow, muzzle } = this.atk;
      const tok = ++this.atk.tok;
      aimBeam(beam, eye, to, r);
      aimBeam(glow, eye, to, r * 2.8);
      beam.material.uniforms.uColor.value.copy(neon(col, 3.6));
      glow.material.uniforms.uColor.value.copy(neon(col, 0.9));
      beam.material.uniforms.uFade.value = 1;
      glow.material.uniforms.uFade.value = 1;
      muzzle.material.color.copy(neon(col, 3));
      muzzle.material.opacity = 1;
      muzzle.scale.setScalar(3 * this.bossScale);
      muzzle.position.copy(eye);
      muzzle.visible = true;
      this.flashAt(eye, col, 1, 7 * this.bossScale + 2);
      this.tw.add(0.5, (k) => {
        if (this.atk.tok !== tok) return;
        beam.material.uniforms.uFade.value = 1 - k;
        glow.material.uniforms.uFade.value = (1 - k) * (1 - k);
        muzzle.material.opacity = 1 - k;
        muzzle.scale.setScalar((3 + k * 2.5) * this.bossScale);
      }, () => { if (this.atk.tok === tok) beam.visible = glow.visible = muzzle.visible = false; });
      this.tw.wait(0.12, hit);
    } else hit();
    this.charge = 0;
  }
  // A flash of light at a point: a bloom sprite plus a real light on the metal.
  flashAt(pos, color, k = 1, size = 8) {
    if (!this.has3D) return;
    this.flashT = k;
    this.flashSize = size;
    this.flash.position.copy(pos);
    this.flash.material.color.copy(neon(color, 1.9));
    this.hitLight.position.copy(pos);
    this.hitLight.color.set(color);
  }
  // A shockwave rolling across the floor.
  floorRing(color, size, dur) {
    if (!this.has3D) return;
    const ring = this.floorRings[this.floorRingI++ % this.floorRings.length];
    const tok = ++ring.userData.tok;
    ring.material.color.copy(neon(color, 2.4));
    ring.material.opacity = 1;
    ring.scale.setScalar(1);
    ring.visible = true;
    this.tw.add(dur, (k) => {
      if (ring.userData.tok !== tok) return;
      ring.scale.setScalar(1 + k * size);
      ring.material.opacity = 1 - k;
    }, () => { if (ring.userData.tok === tok) ring.visible = false; });
  }
  after() {
    if (this.unmounted) return;
    if (this.hp <= 0) return this.victory();
    if (this.hearts <= 0) return this.defeat();
    this.nextQuestion();
  }
  victory() {
    this.state = "over";
    this.el.classList.add("finale");
    const stars = this.hearts;
    const bonus = this.hearts * 1000;
    this.score += bonus;
    Store.state.boss[this.bossKey] = Math.max(Store.state.boss[this.bossKey] || 0, stars);
    Store.save();
    Sound.stopMusic();
    Sound.sfx("bigboom");
    this.taunt(this.lines.defeat);
    GFX.pulse(12, 0.45);
    Haptics.buzz([100, 50, 200]);
    if (this.has3D) {
      this.shockwave(this.boss.position.clone(), neon(0xfff4e0, 1.6), 14, 1.1);
      this.floorRing(this.cfg.color, 26, 1.4);
      this.flashAt(this.boss.position, 0xffffff, 1.2, 10 * this.bossScale + 3);
    }
    this.tw.wait(0.9, () => UI.banner("BOSS DEFEATED!", COLORS.lime, stars + (stars === 1 ? " STAR" : " STARS")));
    if (this.has3D) {
      for (let i = 0; i < 6; i++) {
        this.tw.wait(i * 0.18, () => {
          const bs = this.bossScale;
          const p = this.boss.position.clone().add(new THREE.Vector3(rand(-2, 2), rand(-2, 2), 1).multiplyScalar(bs));
          this.bursts.burst(p, i % 2 ? this.cfg.color : 0xffffff, { n: 44, speed: 8 * bs, size: 0.3 * bs, life: 1.1 });
          this.shards.burst(p, i % 2 ? this.cfg.color : 0xffffff, 6, bs * 1.3, 10 * bs, 7);
          this.flashAt(p, i % 2 ? this.cfg.color : 0xffffff, 1, 8 * this.bossScale + 2);
          Sound.sfx("boom");
        });
      }
      // the core overloads to white while it collapses, then goes supernova
      const em = this.boss.userData.core.userData.mat.emissive;
      const e0 = em.clone();
      const s0 = this.boss.scale.x;
      this.tw.add(1.2, (k) => {
        this.boss.scale.setScalar(s0 * (1 - k));
        this.boss.rotation.y += 0.3;
        em.setRGB(lerp(e0.r, 3, k), lerp(e0.g, 3, k), lerp(e0.b, 3, k));
      }, () => {
        const p = this.boss.position.clone();
        this.bursts.burst(p, 0xffffff, { n: 50, speed: 12 * s0, size: 0.28 * s0, life: 1.2, gravity: -2 });
        this.bursts.burst(p, this.cfg.color, { n: 60, speed: 8 * s0, size: 0.3 * s0, life: 1.5, gravity: -3 });
        this.shards.burst(p, this.cfg.color, 20, s0 * 1.4, 12 * s0, 6);
        this.shockwave(p, neon(this.cfg.color, 2.4), 18, 1.2);
        this.floorRing(0xffffff, 34, 1.6);
        this.flashAt(p, 0xffffff, 1.3, 14 * s0 + 4);
        this.shake(0.5);
      }, Ease.inCubic);
    }
    this.tw.wait(1.4, () => Sound.sfx("win"));
    this.tw.wait(3.2, () => {
      if (this.unmounted) return;
      showResults({
        game: "boss", sel: this.sel, run: this.run, score: this.score, stars,
        title: "STAGE CLEAR", color: COLORS.lime, headline: fmtScore(this.score) + " PTS",
        sub: `${this.cfg.name} defeated with ${this.hearts} heart${this.hearts === 1 ? "" : "s"} left`,
        tiles: [{ k: "STARS", v: stars + "/3", c: COLORS.yellow }],
        debrief: this.bossKey !== "all" ? this.bossKey : null,
      });
    });
  }
  defeat() {
    this.state = "over";
    this.el.classList.add("finale");
    Sound.stopMusic();
    Sound.sfx("gameover");
    this.tw.wait(1.2, () => UI.banner("DEFEATED", COLORS.red, "Read the notes, then come back"));
    this.tw.wait(2.8, () => {
      if (this.unmounted) return;
      showResults({
        game: "boss", sel: this.sel, run: this.run, score: this.score,
        title: "DEFEATED", color: COLORS.red, headline: fmtScore(this.score) + " PTS",
        sub: `${this.cfg.name} survived with ${Math.max(0, this.hp)} HP. Read the guide and try again.`,
        tiles: [{ k: "BOSS HP LEFT", v: Math.max(0, this.hp), c: COLORS.red }],
      });
    });
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      this.charge += dt;
      const f = this.charge / this.T;
      const bar = $("[data-charge]", this.el);
      if (bar) bar.style.transform = `scaleX(${clamp(f, 0, 1).toFixed(3)})`;
      if (f >= 1) this.timeout();
    }
    if (!this.has3D) return;
    const u = this.boss.userData;
    const f = this.state === "ask" ? clamp(this.charge / this.T, 0, 1) : 0;
    const rage = this.enraged ? 1.8 : 1;
    const ease = Math.min(1, dt * 3);
    this.showY += (this.bossY - this.showY) * ease;
    if (this.state !== "over") {
      this.showScale += (this.bossScale - this.showScale) * ease;
      this.boss.scale.setScalar(this.showScale);
    }
    this.rune.scale.setScalar(0.45 + this.showScale * 0.75);
    this.pool.scale.setScalar(0.5 + this.showScale * 0.6);
    if (this.state !== "intro") this.boss.position.y = this.showY + Math.sin(this.t * 1.5 * rage) * 0.35 * this.showScale;
    u.core.rotation.y += dt * 0.5 * rage;
    u.core.rotation.x += dt * 0.15 * rage;
    u.ring.rotation.z += dt * rage;
    u.ring2.rotation.y = Math.sin(this.t * 0.5 * rage) * 0.5;
    if (u.body) {
      // the war machine shifts its weight, looks about and leans in as it charges
      u.body.rotation.y = Math.sin(this.t * 0.55 * rage) * 0.16 + Pointer.x * 0.12;
      u.body.rotation.z = Math.sin(this.t * 0.4 * rage) * 0.035;
      u.body.rotation.x = f * 0.16 + Math.sin(this.t * 0.7) * 0.02;
    }
    this.rig.update(dt, f); // breathing, twitches, wind-up, recoil, damage, rage (look only)
    const orbR = u.body ? 4.7 : 3.7; // the cyborg's gems circle outside its shields
    for (let i = 0; i < 6; i++) {
      const a = this.t * 1.2 * rage + (i / 6) * Math.PI * 2;
      this._v.set(Math.cos(a) * orbR, Math.sin(a * 2) * 0.7, Math.sin(a) * orbR);
      this._q.setFromEuler(this._e.set(0, this.t * 3 + i, 0.6));
      u.orbs.setMatrixAt(i, this._m.compose(this._v, this._q, this._s.set(1, 1, 1)));
    }
    u.orbs.instanceMatrix.needsUpdate = true;
    u.charge.scale.setScalar(0.1 + f * 3.4 + (f > 0.8 ? Math.sin(this.t * 17) * 0.3 : 0)); // under 3 Hz
    u.eye.scale.y = 1.8 * (Math.sin(this.t * 0.7) > 0.985 ? 0.15 : 1);
    // charge: sparks spiral into the orb, faster and brighter as it fills
    const sp = u.sparks, pa = sp.geometry.attributes.position.array;
    sp.material.opacity = clamp((f - 0.02) / 0.23, 0, 1);
    sp.visible = f > 0.01;
    if (sp.visible) {
      this.sparkData.forEach((d, i) => {
        d.p += dt * (0.35 + f * 2.2);
        if (d.p >= 1) { d.p -= 1; d.d.set(rand(-1, 1), rand(-1, 1), rand(-0.3, 1)).normalize(); d.r = rand(2.5, 5); }
        const rr = d.r * Math.pow(1 - d.p, 1.6);
        pa[i * 3] = d.d.x * rr; pa[i * 3 + 1] = d.d.y * rr; pa[i * 3 + 2] = d.d.z * rr;
      });
      sp.geometry.attributes.position.needsUpdate = true;
      sp.material.size = 0.14 + f * 0.14;
    }
    // light: the eye lights the arena as the attack charges; flashes decay
    u.eye.getWorldPosition(this.eyeLight.position);
    this.eyeLight.intensity = 0.5 + f * 3.5 + (f > 0.8 ? Math.sin(this.t * 17) * 0.6 : 0);
    this.pool.material.color.copy(this.capMat.color).multiplyScalar(0.2 + f * 0.35);
    this.rune.rotation.z += dt * (0.15 + f * 1.2) * rage;
    this.rune.material.color.copy(this.capMat.color).multiplyScalar(0.45 + f * 0.5);
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 2.4);
      const k = Math.min(1, this.flashT);
      this.flash.visible = k > 0;
      this.flash.scale.setScalar(this.flashSize * (1.4 - k * 0.5));
      this.flash.material.opacity = k * k;
      this.hitLight.intensity = this.flashT * this.flashT * 6;
    }
    this.shards.update(dt);
    this.motes.userData.drift(this.t);
    // enraged: the arena bleeds red
    this.rageK += ((this.enraged && this.hp > 0 ? 1 : 0) - this.rageK) * Math.min(1, dt * 1.5);
    const rk = this.rageK;
    if (rk > 0.001 || this.rageOn) {
      this.rageOn = rk > 0.001;
      const su = this.sky.material.uniforms;
      su.uHorizon.value.copy(this.skyHorizon).lerp(this.rageCol, rk * 0.75);
      su.uMid.value.copy(this.skyMid).lerp(this.rageMid, rk * 0.6);
      this.scene.fog.color.copy(this.fogBase).lerp(this.rageFog, rk);
      this.floor.material.uniforms.uLine.value.copy(this.lineBase).lerp(this.rageLine, rk);
      this.beamMat.uniforms.uColor.value.copy(this.bossCol).lerp(this.rageCol, rk);
      this.ambient.color.copy(this.ambientBase).lerp(this.rageAmb, rk);
      const tint = this.scene.userData.post.tint;
      tint[0] = 1 + 0.1 * rk; tint[1] = 1 - 0.08 * rk; tint[2] = 1 - 0.05 * rk;
      u.eye.material.color.setRGB(1.15 + 0.4 * rk, 1.15 - 0.35 * rk, 1.15 - 0.35 * rk);
      if (this.state !== "over" && this.state !== "intro") this.boss.position.x = rand(-1, 1) * 0.04 * rk * this.bossScale * (REDUCED_MOTION || GFX.calm ? 0.25 : 1);
    }
    this.floor.material.uniforms.uReflect.value = GFX.lite ? 0 : 0.55;
    // a slow cinematic drift, with a touch of pointer parallax
    const sway = REDUCED_MOTION || GFX.calm ? 0.2 : 1;
    this.camBase.set((Math.sin(this.t * 0.23) * 0.7 + Pointer.x * 0.6) * sway, this.camY + (Math.sin(this.t * 0.37) * 0.12 - Pointer.y * 0.2) * sway, this.camZ);
    this.lookAt.set(0, this.showY - 0.42 * this.showScale, 0); // (aimed below its middle: it stands higher in the strip, with floor under its feet)
    if (this.contact) { const cs = 6.4 * this.showScale; this.contact.scale.set(cs, cs, 1); this.contact.position.x = this.boss.position.x; this.contact.position.z = this.boss.position.z; this.contact.material.opacity = 0.78 * clamp(1.6 - this.boss.position.y / (this.showY + 0.001) * 0.6, 0, 1); }
    this.placeCamera();
    followSky(this.sky, this.camera);
    if (this.crowd) { // the crowd: swaying, louder for a moment whenever the light of a hit goes up
      this.cheer = Math.max(this.cheer * Math.pow(0.12, dt), Math.min(1, this.hitLight.intensity * 0.25));
      const u = this.crowd.material.uniforms; u.uTime.value = this.t; u.uCheer.value = REDUCED_MOTION || GFX.calm ? this.cheer * 0.3 : this.cheer; u.uPx.value = (GFX.h / 844) * GFX.scenePR();
      this.railMat.color.copy(this.capMat.color).multiplyScalar(0.6);
    }
    FX.sync(this.scene, this.t);
  }
  dispose() {
    if (this.has3D) {
      this.shards.dispose();
      if (this.boss.userData.orbs.dispose) this.boss.userData.orbs.dispose();
    }
    super.dispose();
  }
}
