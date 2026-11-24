// BOSS RUSH — every chapter has a boss that only falls to its hardest questions.
// The boss charges an attack while you read; answer right to shoot first.
// Reuses blasterMerge() and BlasterShards from 20-blaster.js (concatenated first).

// Mist for the arena: thickest at the floor, thinning upward, in soft uneven banks.
function bossHazeTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.45, "rgba(255,255,255,0.16)");
  g.addColorStop(1, "rgba(255,255,255,0.7)");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 256);
  let seed = 4242;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.globalCompositeOperation = "destination-out"; // bite soft holes out of it, so it is banks and not a sheet
  for (let i = 0; i < 26; i++) {
    const px = rnd() * 512, py = 40 + rnd() * 190, r = 26 + rnd() * 60, h = x.createRadialGradient(px, py, 0, px, py, r);
    h.addColorStop(0, `rgba(0,0,0,${0.25 + rnd() * 0.4})`);
    h.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = h;
    for (const ox of [-512, 0, 512]) { x.save(); x.translate(ox, 0); x.fillRect(px - r, py - r, r * 2, r * 2); x.restore(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
function bossRuneTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1536; // (three times the old size, with heavier rings: it was a hairline on the floor)
  const x = c.getContext("2d");
  x.scale(3, 3);
  x.translate(256, 256);
  x.strokeStyle = x.fillStyle = "#ffffff";
  const ring = (r, w) => { x.lineWidth = w; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke(); };
  ring(242, 11);
  ring(220, 4);
  ring(150, 5.5);
  ring(134, 2.5);
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

// The crowd's card, one for all of them (Phase 5: drawn instanced, its figure, place and size each one's own: see
// makeCrowd): a figure of the crowd's picture (bossCrowdTexture in 22c) facing the floor, its feet at its origin and
// 1.25 m tall at its own size. It reaches on down past its feet, into the stand it stands on and out of sight, so a
// hop never shows the cut under it (the picture's last row, the body, runs on down to its foot).
function bossCardGeometry() {
  const g = new THREE.PlaneGeometry(1.25, 1.8), p = g.attributes.position, uv = g.attributes.uv;
  g.translate(0, 0.345, 0); // (from 0.555 under its feet to the old card's top, 1.245 over them)
  for (let i = 0; i < uv.count; i++) uv.setY(i, (p.getY(i) + 0.005) / 1.25);
  return g;
}

class BossGame extends QuizGame {
  constructor(sel) {
    super(sel, "boss", { fov: 60, fog: [0x0a0322, 24, 86], bg: 0x0a0322 }); // (the stands fall back into haze; the boss, 16 away, stays clear)
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
    // What has loaded for this fight (nothing, when the page is opened from disk: then all of it is as it always was):
    // the arena's sky, and the boss's model. (Look only: the rules never ask which.)
    this.row = bossRow(this.bossKey);
    this.gen = { sky: this.has3D ? Assets.sky(this.row.sky) : null, model: this.has3D ? Assets.model("boss-" + (this.bossKey === "all" ? "all-rig" : this.bossKey)) : null };
    // (the Proctor: the machine the owner supplied, as in the Final Exam, on its skeleton: 24f-proctor.js)
    if (this.bossKey === "all" && this.gen.model) this.gen.model = proctorOk() ? proctorDress(this.gen.model, null) : null;
    if (this.gen.sky && !this.gen.sky.map) this.gen.sky = null;
    this.pano = !!this.gen.sky;
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
        <div class="name"><span>${esc(this.cfg.name)}<em class="ragetag">ENRAGED</em></span><span data-hp>${this.hp}/${this.maxHp}</span></div>
        <span class="meter slide" style="--c:${c}"><i data-hpbar style="transform:none"></i></span>
      </div>
      <div class="barrow threat" title="Boss attack charge"><b>BOSS ATTACK</b><div class="charge"><i data-charge></i></div></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
      <i class="slashes" aria-hidden="true"></i>
    </section>`);
    this.hud();
  }
  build3D() {
    const s = this.scene;
    const hex = this.cfg.color;
    const col = new THREE.Color(hex);
    const P = (this.pair = bossArenaPair(hex)); // the arena's own neon: violet and cyan, never the boss's colour (22c)
    s.userData.lightBudget = { dir: 2, point: 3 }; // (the lights this screen draws: the key and the pale edge; the two rims and the strongest of fill, under-light, eyes and blast. See LightPool in 04-gfx.js)
    s.userData.post = { exposure: 1.1, bloom: 0.55, threshold: 1.5, knee: 0.22, bloomTight: 1, saturation: GRADE.saturation, contrast: GRADE.contrast, vignette: 1.15, tint: [1, 1, 1], ao: 1, shadow: 0.85, shadowLen: 0.11, sun: [0.2, 1, 0.55], mblur: 0.7, dirt: 0.18, streak: 0.3, // (only its lamps, the ring and a blow bloom, and tightly: plate and paper used to clip to white)
     
      dof: { focus: 16, near: 200, far: 90, max: 0.0036, sky: 0.5, k: 0.7 } }; // (the lens holds the boss; the tiers and the ridge behind it go a little soft)
    this.fogBase = s.fog.color.clone().lerp(P.a, 0.08); // (the shared violet-black, leaning to the arena's own light: it leaned to the boss's, and a cyan boss's stands went royal blue)
    s.fog.color.copy(this.fogBase);
    this.rageCol = new THREE.Color(COLORS.red);
    this.hotCol = neon(0xff5a3c, 2.4); // what the floor's ring and pool turn to as an attack comes due
    this.rageMid = new THREE.Color(0x2a0410);
    this.rageFog = new THREE.Color(0x2a0614);
    this.rageLine = neon(COLORS.red, 1.6);
    this.rageAmb = new THREE.Color(0xc03050);
    this.beamCol = P.b.clone(); // (the searchlights are the arena's)
    this.rageK = 0;
    this.env = makeEnvMap({
      top: 0x0b0424, horizon: col.clone().multiplyScalar(0.45), bottom: 0x05010f, glow: 0.6,
      panels: [
        { color: hex, pos: [0, 12, -16], w: 12, h: 2.5, k: 2 },
        { color: 0x35efff, pos: [16, 4, 4], w: 10, h: 3, k: 2.2 },
        { color: 0xff3ad4, pos: [-16, 5, 2], w: 10, h: 3, k: 2.2 },
        { color: 0x6a5aff, pos: [-6, -12, 10], w: 14, h: 4, k: 1.6 },
        { color: 0xd4c8ff, pos: [4, 14, 10], w: 6, h: 1.5, k: 1.6 }, // (lilac, and lower: at white 3.2 a plate that faced it blew out)
      ],
    });
    this.ambient = new THREE.AmbientLight(0x7566c4, 0.38);
    this.ambientBase = this.ambient.color.clone();
    s.add(this.ambient);
    const key = new THREE.DirectionalLight(0xe6deff, 1.4);
    key.position.set(3, 8, 10);
    s.add(key);
    // Two lamps behind it, either side, edge it against the dark stands in the arena's two colours (the art bible: the
    // rims in the world's pair; the left one was the boss's own colour at 4.6 and reached 46 m, so a cyan boss's
    // stands went blue on one side: Phase 2's gate review); a third at its feet in front, in its own colour, lights it
    // from below.
    const big = this.bossKey === "all" ? 1.3 : 1; // (the final boss is the brightest thing in the building)
    // (the second is an edge, not a second key: at full strength it turned black armour pale)
    const rims = [[-11, P.a.clone().lerp(new THREE.Color(0xffffff), 0.15).getHex(), 3.4 * big], [11, P.b.clone().lerp(new THREE.Color(0xffffff), 0.15).getHex(), 1.9]].map(([x, c, k]) => { const l = new THREE.PointLight(c, k, 46, 1.6); l.position.set(x, 8, -9); s.add(l); return l; });
    const under = new THREE.PointLight(col.getHex(), 0.85 * big, 24, 1.8);
    const edge = new THREE.DirectionalLight(0xffffff, 0.95); // a pale edge along its head and shoulders, whatever colour the arena is
    edge.position.set(0, 10, -9);
    s.add(edge);
    const fill = new THREE.PointLight(0x8f7cff, 0.9, 40, 1.6); // a violet fill from the lens side, low: the limbs' dark faces keep their shape
    fill.position.set(-5, 3.2, 13);
    s.add(fill);
    under.position.set(0, 0.7, 6.5);
    s.add(under);
    this.lamps = { key, rimA: rims[0], rimB: rims[1], edge, fill, under }; // (the staged fight sets them for a model that mirrors the sky: 22f)
    this.eyeLight = new THREE.PointLight(hex, 0.6, 26, 2);
    s.add(this.eyeLight);
    this.hitLight = new THREE.PointLight(0xffffff, 0, 30, 2);
    s.add(this.hitLight);
    // sky with a horizon in the arena's light, leaning to the boss's colour (from disk: served, the storm stands there)
    this.skyHorizon = P.a.clone().lerp(col, 0.35).multiplyScalar(0.3);
    this.skyMid = new THREE.Color(0x10042a).lerp(col, 0.05);
    this.sky = makeSky({ top: 0x030009, mid: this.skyMid, horizon: this.skyHorizon, bottom: 0x05010f, glow: 1.7, stars: 1, clouds: 0.3 });
    this.sky.userData.arena = true;
    s.add(this.sky);
    // a distant ridge for a layered horizon (not reflected: the mirror pass stays cheap)
    const ridge = makeRidge({ z: -62, width: 360, height: 15, n: 40, top: new THREE.Color(0x1c0838).lerp(P.a, 0.12), bottom: 0x07021a, line: P.a, lineK: 1.5, wire: false });
    ridge.traverse((o) => o.layers.set(1));
    ridge.userData.arena = true;
    s.add(ridge);
    this.ridge = ridge;
    // The floor: a polished dark deck that gives the arena back (the master overhaul, Phase 2, 2026-11-23: it was dark
    // and empty, with thin lines). The arena is drawn once into a cube from over the middle of the ring (roomProbe: a
    // face a frame; again once the boss has powered up: see probeStep) and looked up where each reflected ray meets the
    // arena's walls; the deck's plates and wear are a CC0 material's (Poly Haven's metal_plate_02, as the title hall's:
    // assets/ui/mat-deck.webp, a level plate until it arrives), its colour the shared violet-black; its lines are the
    // arena's second colour. One look-up a pixel on every tier and no second drawing of the scene; where the tier draws
    // the floor's mirror (the Mac), the capture gives back less (arenaFrame).
    // (Phase 5: the capture is the arena calm; as the boss rages, what the deck and the steel give back of it turns red
    // with the arena's own neon, each pixel's brightness kept (probeTint: as the neon's own rage, arenaGlowMaterial), and
    // a stroke of lightning lifts it for that moment: see update. No second capture: a frame's stall each time.)
    this.mirror = new Mirror(0);
    this.lineBase = neon(P.b, 1.05);
    this.probe = roomProbe(new THREE.Vector3(0, 3, 0), { size: Assets.phone ? 128 : 256 });
    if (GFX.ok) { try { GFX.pmrem().compileCubemapShader(); } catch (e) { /* made at the first capture instead */ } } // (the steel's filtered copy of it: its shader made now, behind the cover, not as the boss drops in)
    this.plates = cellFlatTexture();
    this.probeTint = new THREE.Vector4(1, 0.14, 0.24, 0); // (the neon's rage red; how far: the rage)
    this.floor = makeNeonFloor({
      size: 600, cell: 3, line: P.b, lineK: 1.05, base: 0x07031a, mirror: this.mirror, reflect: 0.55, polar: true, spokes: 24, glow: 0.08, ripple: 0.0018, streak: 0.01,
      probe: { map: this.probe.map, min: new THREE.Vector3(-28, 0, -29), max: new THREE.Vector3(28, 16, 28), at: this.probe.at, k: (this.probeK = 0.9), rough: 0.16, f0: 0.12, tint: this.probeTint }, // (dark looking down, a mirror at a slant)
      plates: { map: this.plates, size: 2.4, k: 0.8 },
    });
    // (the deck is in its own capture, its reflection blanked while it is drawn: what the steel gives back below the
    // horizon is the deck and its lines, where it was the sky's last row stretched into bright streaks)
    this.floor.userData.arena = true;
    this.probe.swap = [this.floor.material.uniforms.tProbe];
    s.add(this.floor);
    // where it stands: a pool of the arena's light on the floor, and its shadow in the middle of the pool (the arena's
    // second colour, smaller and fainter than it was: a wash of its own colour over the deck stood it on that colour,
    // and hid the deck)
    const pool = makeLightPool({ color: P.b, radius: 8.5, intensity: 0.22 });
    pool.layers.set(1);
    s.add(pool);
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.92, depthWrite: false }));
    this.contact.rotation.x = -Math.PI / 2;
    this.contact.position.y = 0.05;
    this.contact.renderOrder = 5;
    this.contact.layers.set(1);
    s.add(this.contact);
    this.contactCore = new THREE.Mesh(this.contact.geometry, this.contact.material.clone()); // (and a smaller, darker one right under it: where it stands)
    this.contactCore.rotation.x = -Math.PI / 2;
    this.contactCore.position.y = 0.06;
    this.contactCore.renderOrder = 5;
    this.contactCore.layers.set(1);
    s.add(this.contactCore);
    s.userData.mirrors = [this.mirror];
    // the arena's steel (its pillars, its stands' panels, its banners) and its neon: a draw each (22c)
    const steel = new RacerBatch(["aMetal", "aRough", "aKind"]), glow = new RacerBatch(["aRole"]);
    this.makeArena(steel, glow);
    this.makeCrowd(steel, glow);
    this.steelMat = arenaSteelMaterial(this.env, this.probeTint, P); // (its reflection: the arena itself once it has been drawn: probeTaken; red with the rage as the deck's; the neon's light on it, the arena's pair)
    this.glowMat = arenaGlowMaterial();
    const sm = new THREE.Mesh(arenaFaceFrames(steel.build("color")), this.steelMat), gm = new THREE.Mesh(glow.build("aCol"), this.glowMat); // (each face of the steel in its own frame: 22c)
    sm.name = "arena-steel"; gm.name = "arena-neon"; // (named for tools/cost-report.js)
    sm.userData.arena = gm.userData.arena = true;
    s.add(sm, gm);
    this.texIn();
    this.motes = makeMotes({ count: 110, box: [46, 16, 20], center: [0, 7, -14], color: hex, size: 0.13, k: 1.4 });
    this.motes.layers.set(1);
    s.add(this.motes);
    this.boss = this.makeBoss();
    if (!this.actor) this.boss.position.set(0, 14, 0);
    s.add(this.boss);
    this.shards = new BlasterShards(s, 90);
    this.shards.mesh.layers.set(1);
    this.flash = glowSprite(0xffffff, 1, 0);
    this.flash.visible = false;
    this.flash.renderOrder = 8;
    s.add(this.flash);
    // the player's plasma bolt, the boss's eye beam and the floor shockwaves: built
    // once, reused every time (a fresh set per shot stalled the frame)
    { // sparks: hard square pixels (the soft round ones went to discs of bokeh, the only round soft things in a world of blocks)
      const c = document.createElement("canvas"); c.width = c.height = 4;
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 4, 4);
      const tx = new THREE.CanvasTexture(c); tx.magFilter = tx.minFilter = THREE.NearestFilter;
      this.bursts.pts.material.uniforms.tMap.value = tx;
      const burst = this.bursts.burst.bind(this.bursts);
      this.bursts.burst = (pos, color, o = {}) => burst(pos, color, Object.assign({}, o, { size: (o.size || 0.3) * 0.5 }));
    }
    this.hitStar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0 }, uColor: { value: new THREE.Color(1, 1, 1) } }, transparent: true, depthWrite: false, depthTest: false, fog: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uK; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          vec2 p = vUv * 2.0 - 1.0; float r = length(p), seg = atan(p.y, p.x) * 1.2732, id = floor(seg + 0.5), w = abs(seg - id); // eight points
          float len = mod(id, 2.0) < 0.5 ? 1.0 : 0.56;
          float thin = 0.35 + 0.65 * uK; // (it closes as it goes: its points thin to nothing, they do not fade)
          float t0 = 0.27 * thin * (1.0 - r / len);
          float spike = step(w, t0) * step(r, len); // hard edges: a cut-out star, not a glow
          float heart = max(step(w, t0 * 0.46 - 0.02) * step(r, len * 0.66), step(r, 0.15 * thin)); // a white star inside it: the blow itself
          float d = (w - t0) * max(r, 0.2) * 0.785; // (how far outside the star's edge, as a length)
          float edge = step(d, 0.034) * step(r, len + 0.05) * (1.0 - spike); // its outline, dark indigo: it reads on a boss of its own colour
          vec3 c = mix(uColor, vec3(1.6, 1.56, 1.5), heart);
          c = mix(vec3(0.016, 0.006, 0.062), c, spike);
          gl_FragColor = vec4(c, max(spike, edge) * step(0.03, uK));
        }`,
    }));
    this.hitStar.layers.set(1);
    this.hitStar.renderOrder = 9;
    this.hitStar.visible = false;
    s.add(this.hitStar);
    const bolt = { shot: glowSprite(neon(COLORS.cyan, 3), 1.4, 1), hot: glowSprite(neon(0xffffff, 3), 0.55, 1), tail: new Trail({ length: 12, width: 0.14, color: COLORS.cyan, intensity: 2.6 }), tok: 0 };
    bolt.shot.add(bolt.hot);
    bolt.tc0 = bolt.tail.mesh.material.uniforms.uColor.value.clone();
    bolt.shot.visible = bolt.tail.mesh.visible = false;
    s.add(bolt.shot, bolt.tail.mesh);
    this.bolt = bolt;
    const atk = { beam: makeBeam(col.getHex(), 3.6), glow: makeBeam(col.getHex(), 0.9), muzzle: glowSprite(0xffffff, 3, 1), tok: 0 };
    atk.muzzle.renderOrder = 7;
    atk.muzzle.visible = false;
    // (its blow is a wedge of light from its lens to the bottom edge of the picture: a point at the lens, half the
    // picture wide where it reaches you, a white core in a red rim. It is drawn in the picture's own plane, so it is
    // a clean wedge at any depth: a ribbon in the arena read as stripes painted down its chest)
    atk.beam.geometry.dispose();
    atk.beam.geometry = new THREE.BufferGeometry();
    atk.beam.geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 0, 0, 1, 1, 0, -1, 1, 0], 3)); // x: across; y: 0 at its lens, 1 at the bottom edge
    atk.beam.material.dispose();
    atk.beam.material = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(1, 0, 0) }, uFade: { value: 1 }, uTime: { value: 0 }, uA: { value: new THREE.Vector2() }, uB: { value: new THREE.Vector2(0, -1) }, uHalf: { value: 0.5 }, uGrow: { value: 0 } },
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false,
      vertexShader: `uniform vec2 uA; uniform vec2 uB; uniform float uHalf; varying vec2 vP;
        void main(){ vec2 c = mix(uA, uB, position.y); gl_Position = vec4(c.x + position.x * uHalf * mix(0.03, 1.0, position.y), c.y, 0.0, 1.0); vP = vec2(gl_Position.x, position.y); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uFade; uniform float uGrow; uniform vec2 uA; uniform vec2 uB; uniform float uHalf; varying vec2 vP;
        void main(){
          float y = vP.y;                                     // along it, from its lens (0) to the bottom edge (1)
          float x = abs(vP.x - mix(uA.x, uB.x, y)) / (uHalf * mix(0.03, 1.0, y)); // across it, from its own centre line (a tapered quad's two triangles would skew it)
          if (y > uGrow || x > 1.0) discard;                  // (it shoots out from the lens: it is not there all at once)
          float core = 1.0 - smoothstep(0.24, 0.3, x), rim = step(x, 0.86); // a white core, a red rim, a thin dark edge
          vec3 c = mix(uColor * 0.1, uColor * mix(1.0, 0.62, smoothstep(0.3, 0.86, x)), rim);
          c = mix(c, vec3(1.7, 1.62, 1.55), core) * mix(1.0, 0.82, y); // hottest at its lens
          gl_FragColor = vec4(c, mix(0.86, 1.0, rim) * step(0.02, uFade));
        }`,
    });
    atk.beam.layers.set(1); // (drawn once, in the picture: not in the floor's mirror)
    atk.beam.frustumCulled = false;
    atk.beam.renderOrder = 8;
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
    if (this.pano) this.arena = new BossArena(this, this.gen.sky, this.row); // (the storm sky, its light and its lightning: 22c)
    if (this.actor) this.stage = new BossStage(this, this.actor); // (the boss's model has loaded: the fight is staged, on the show clock: 22f)
    // The cold edge from behind in the world's second colour, cyan (Boss Rush's pair's, and the player's), lower and
    // stronger (Phase 2's polish, 2026-11-24: an art review found neither the boss nor the duellist had a rim of it, cyan
    // 1-2% of the lit picture; the stage sets it a pale white). It is the one lamp that edges the boss and the duellist
    // while it barely touches the arena (the stands, their crowd and the pillars face the lens, away from it), so a cyan
    // boss's arena keeps its pair (bossArenaPair). As the boss rages it turns half red with the rims (update). No new light.
    this.edgeCol = new THREE.Color(COLORS.cyan).lerp(new THREE.Color(0xffffff), 0.15);
    this.lamps.edge.color.copy(this.edgeCol);
    this.lamps.edge.position.set(0, 5, -10);
    this.lamps.edge.intensity = this.stage ? 2.6 : 1.3;
    this.camBase.set(0, this.camY, this.camZ);
    this.lookAt.set(0, this.bossY, 0);
    // the deck's reflection: the arena as it stands (only what is marked arena: not the boss, the duellist, the floor,
    // what flies; see probeStep), now, and once more when the boss has powered up and its lamps are full (staged)
    this.probeFull = !this.stage;
    this.probe.capture();
  }
  // The arena drawn into the deck's cube, a face a frame (or all six now): everything but the arena itself (marked
  // userData.arena) is left out, the lights kept; the storm at half its strength (the deck carries the neon's
  // reflections: the sky in it washed the deck pale). Not before the screen's light budget is in place (its shaders
  // are the ones the screen draws with), nor while a stroke of lightning lights the sky.
  probeStep(all) {
    const P = this.probe, s = this.scene;
    if (!P || !P.left || !s.userData.lightPool || (!all && this.arena && this.arena.boltK > 0.03)) return;
    GFX.lightsFor(s); // (a light added since the last frame is taken into the budget first)
    const hide = [];
    for (const o of s.children) if (o.visible && !o.isLight && !o.userData.arena && !o.userData.slot) hide.push(o);
    P.hide = hide;
    const gu = this.arena && this.arena.dome.material.uniforms.uGain, g0 = gu ? gu.value : 0;
    if (gu) gu.value = g0 * 0.5;
    for (let i = 0; i < (all ? 6 : 1) && P.left; i++) P.step(s, this.camera.layers.mask);
    if (gu) gu.value = g0;
    this.probeTaken();
  }
  // the reflection drawn whole at once (for a test's stills: the capture tool draws only the frames it keeps, so a
  // face a frame would never be drawn there; the game itself draws every frame. See HallScene.probeNow)
  probeNow() {
    if (!this.probe || !GFX.ok) return;
    if (this.stage) this.probeFull = true;
    this.probe.capture();
    this.probeStep(true);
  }
  // a capture whole: the steel takes it too, filtered for its roughness (its own copy, made once a capture: what reads
  // it is never drawn into what it reads)
  probeTaken() {
    const P = this.probe;
    if (!P || P.left || P.done === P.made) return;
    P.done = P.made;
    if (this.steelMat && GFX.ok) {
      try {
        const pm = GFX.pmrem().fromCubemap(P.map);
        if (this.steelEnv) this.steelEnv.dispose();
        this.steelEnv = pm; this.steelMat.envMap = pm.texture;
      } catch (e) { /* the steel keeps the panels' reflection */ }
    }
  }
  // the deck's plates and the steel's brushing (assets/ui): taken as they arrive (a level plate until then; from disk, always)
  texIn() {
    if (this.plates && !this.platesIn) { const img = Assets.ui("mat-deck"); if (img) { this.plates.image = img; this.plates.needsUpdate = true; this.platesIn = true; } }
    if (this.steelMat && !this.brushIn) { const img = Assets.ui("mat-steel"), t = this.steelMat.userData.tBrush.value; if (img) { t.image = img; t.needsUpdate = true; this.brushIn = true; } }
  }
  // Pillars ringing the arena (steel, neon up their faces, a lamp on each: bossPillar in 22c, into the arena's steel and
  // its neon), each throwing a sweeping searchlight into the sky. Merged: a few draw calls in all.
  makeArena(steel, glow) {
    const s = this.scene, hex = this.cfg.color, P = this.pair;
    const R = 17, H = 44;
    const angles = [18, 44, 70, 98].flatMap((d) => [d, -d]).map((d) => (d * Math.PI) / 180);
    const cone = new THREE.CylinderGeometry(3.4, 0.32, H, 14, 1, true);
    cone.translate(0, H / 2, 0);
    const coneNI = cone.toNonIndexed();
    cone.dispose();
    const cp = coneNI.attributes.position.array, cn = coneNI.attributes.normal.array, cv = cp.length / 3;
    const pools = [];
    const bp = [], bn = [], bb = [], bph = [], bt = [];
    angles.forEach((a, i) => {
      const x = Math.sin(a) * R, z = -Math.cos(a) * R;
      const at = (y) => new THREE.Matrix4().makeRotationY(-a).setPosition(x, y, z); // (local +z is toward the ring's centre)
      bossPillar(steel, glow, at(0), P.a, P.b, hex);
      const pool = new THREE.PlaneGeometry(7, 7);
      pool.rotateX(-Math.PI / 2);
      pools.push({ geo: pool, matrix: at(0.04) });
      for (let k = 0; k < cv; k++) {
        bp.push(cp[k * 3], cp[k * 3 + 1], cp[k * 3 + 2]);
        bn.push(cn[k * 3], cn[k * 3 + 1], cn[k * 3 + 2]);
        bb.push(x, 10.6, z);
        bph.push(i * 1.7);
        bt.push(cp[k * 3 + 1] / H);
      }
    });
    coneNI.dispose();
    this.arenaCol = neon(P.a, 2.6); // the arena's own light at full strength: the front row's rims and the mist take theirs from it
    { // the front row: heads and shoulders in the dark between the lens and the ring (the arena had no foreground)
      const row = [], rim = [];
      for (let i = 0; i < 15; i++) {
        const x = (i - 7) * 1.12 + ((i * 37) % 7) * 0.05, h = 0.3 + ((i * 53) % 9) * 0.045, z = 7.3 + (i % 2) * 0.55, r = 0.185 + ((i * 29) % 5) * 0.012;
        row.push({ geo: new THREE.SphereGeometry(r, 10, 7), matrix: new THREE.Matrix4().makeTranslation(x, h + 0.27, z), color: 0x0a0618 });
        row.push({ geo: new THREE.BoxGeometry(0.62, 0.36, 0.26), matrix: new THREE.Matrix4().makeTranslation(x, h - 0.02, z), color: 0x0a0618 });
        // the arena's light along the top of each head and across each pair of shoulders (a sliver shows past the dark shape in front of it)
        rim.push({ geo: new THREE.SphereGeometry(r + 0.012, 10, 4, 0, Math.PI * 2, 0, 0.95), matrix: new THREE.Matrix4().makeTranslation(x, h + 0.281, z - 0.06) });
        rim.push({ geo: new THREE.BoxGeometry(0.62, 0.03, 0.2), matrix: new THREE.Matrix4().makeTranslation(x, h + 0.168, z - 0.07) });
      }
      const fr = new THREE.Group(), dark = new THREE.Mesh(blasterMerge(row), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
      this.frontRimMat = new THREE.MeshBasicMaterial({ color: neon(P.a, 0.5), fog: false });
      const lit = new THREE.Mesh(blasterMerge(rim), this.frontRimMat);
      dark.layers.set(1); // (not in the floor's mirror)
      lit.layers.set(1);
      fr.add(lit, dark);
      fr.userData.top = 0.3 + 8 * 0.045 + 0.27 + 0.2; // the top of the tallest head
      s.add(fr);
      this.frontRow = fr; // (update() keeps it at the bottom edge of the strip: only heads crest it)
    }
    this.runeCol = neon(P.b, 2.6); // the circle it stands in and the pool of light under it are the arena's (the boss never stands on its own colour)
    const poolMesh = new THREE.Mesh(blasterMerge(pools), new THREE.MeshBasicMaterial({ map: glowTexture(), color: neon(P.b, 0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); // (each lamp's light at its pillar's foot)
    poolMesh.layers.set(1);
    poolMesh.userData.arena = true;
    s.add(poolMesh);
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
    bg.setAttribute("normal", new THREE.Float32BufferAttribute(bn, 3));
    bg.setAttribute("aBase", new THREE.Float32BufferAttribute(bb, 3));
    bg.setAttribute("aPhase", new THREE.Float32BufferAttribute(bph, 1));
    bg.setAttribute("aT", new THREE.Float32BufferAttribute(bt, 1));
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: neon(P.b, 1) }, uI: { value: 0.44 }, uTime: { value: 0 } },
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
          float fall = pow(max(1.0 - vT, 0.0), 1.5) * smoothstep(0.0, 0.04, vT);
          float flick = 0.92 + 0.08 * sin(uTime * 9.0 + vT * 5.0);
          gl_FragColor = vec4(uColor * uI * face * fall * flick, 1.0);
        }`,
    });
    const beams = new THREE.Mesh(bg, this.beamMat);
    beams.frustumCulled = false;
    beams.renderOrder = 4;
    beams.userData.arena = true;
    s.add(beams);
    // the summoning circle and a pool of light under the boss
    this.rune = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 13.5), new THREE.MeshBasicMaterial({ map: bossRuneTexture(), color: neon(P.b, 2.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.rune.rotation.x = -Math.PI / 2;
    this.rune.position.y = 0.05;
    this.rune.layers.set(1);
    s.add(this.rune);
    this.pool = makeLightPool({ color: P.b, radius: 7, intensity: 0.2 });
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
  // Behind the ring: four tiers of an amphitheatre curving round the back (two under the storm sky), their faces painted
  // panels (the arena's steel: 22c) under a rail of the arena's lead colour and a line of its second, a crowd on each,
  // lit, and lights held up along it (they sway, and surge when a blow lands).
  makeCrowd(steel, glow) {
    const s = this.scene, hex = this.cfg.color, P = this.pair, pos = [], col = [], seed = [], people = [];
    const lilac = new THREE.Color(0xd9d0ff), tints = [P.a, P.b, lilac, new THREE.Color(hex)]; // (the arena's light, lilac, and the boss's own fans)
    // what the crowd wears: dark, each a little different, never black (lit by the arena's lamps, it reads as people;
    // the lamps are strong, the boss's own: what they fall on is dark)
    const wear = [[0.05, 0.022, 0.06], [0.024, 0.026, 0.06], [0.07, 0.018, 0.04], [0.016, 0.034, 0.042], [0.04, 0.03, 0.05], [0.075, 0.014, 0.024], [0.03, 0.022, 0.034], [0.05, 0.03, 0.075]].map(([r, g, b]) => new THREE.Color(r, g, b)); // (violet, indigo, plum, teal, grey, wine, charcoal, lilac)
    const panel = { aMetal: 0.35, aRough: 0.52, aKind: 1 }, arena = { aRole: 1 };
    let n = 0;
    for (let k = 0; k < (this.pano ? 2 : 4); k++) { // (under the storm sky: two tiers, lower and darker, and the sky above them)
      const Rk = 27 + k * 6, y = this.pano ? 1.4 + k * 3.3 : 2.2 + k * 4.1, N = 44, tk = this.pano ? 0.42 - 0.1 * k : 0.66 - 0.12 * k; // (each tier darker than the one below: the boss is the brightest thing in the building)
      const face = new THREE.Color(0.016, 0.005, 0.022).multiplyScalar(1 - 0.16 * k), box = new THREE.BoxGeometry(1, 1, 1); // (deep violet paint: the shared ground, under strong lamps)
      for (let i = 0; i < N; i++) {
        const a0 = (-118 + (236 * i) / N) * (Math.PI / 180), a1 = (-118 + (236 * (i + 1)) / N) * (Math.PI / 180), am = (a0 + a1) / 2;
        const w = 2 * Rk * Math.sin((a1 - a0) / 2) + 0.06, on = (r, h) => new THREE.Matrix4().makeRotationY(-am).setPosition(Math.sin(am) * r, h, -Math.cos(am) * r);
        steel.add(box, on(Rk, y).multiply(new THREE.Matrix4().makeScale(w, 3.6, 0.9)), face.clone().multiplyScalar(0.9 + 0.2 * (((i * 37 + k * 11) % 7) / 6)), 1, panel); // its face: painted panels
        glow.add(box, on(Rk - 0.5, y + 1.9).multiply(new THREE.Matrix4().makeScale(w, 0.12, 0.12)), P.a, 1.15 - 0.2 * k, arena); // the rail along its top
        glow.add(box, on(Rk - 0.47, y + 1.42).multiply(new THREE.Matrix4().makeScale(w, 0.045, 0.04)), P.b, 0.8 - 0.15 * k, arena); // and a line of the second colour under it
        // the people: two rows on every tier, shoulder to shoulder, some with their arms up
        const per = Math.max(2, Math.floor(w / 1.15));
        for (let row = 0; row < 2; row++) for (let j = 0; j < per; j++) {
          const a = a0 + (a1 - a0) * ((j + 0.5 + (Math.random() - 0.5) * 0.5 + row * 0.5) / per), r = Rk - 0.05 + row * 0.42, fy = y + 1.8 + row * 0.5, sc = 1.25 + Math.random() * 0.4, sd = Math.random();
          // (the master overhaul, Phase 2: lit figures, where they were black cut-outs: what they wear takes the arena's
          // lamps; a rim of the arena's light along their tops and upper sides; a light stick, a phone, a sign of their own)
          const rim = new THREE.Color().copy(tints[Math.floor(Math.random() * tints.length)]).multiplyScalar((0.75 + Math.random() * 0.5) * tk * 2.4);
          // (Phase 5: each an instance of one card: where it stands, facing the floor, its size, which figure, its seed
          // and where it is round the ring. The same draws from the randomness for each, in the same order, as when each
          // was a card of its own; but three.js no longer draws an id for a card each, so in the capture tool's seeded
          // runs what is drawn after the crowd comes out otherwise. The rules are not touched: their regression holds)
          people.push({ m: new THREE.Matrix4().makeRotationY(-a).setPosition(Math.sin(a) * r, fy, -Math.cos(a) * r).scale(new THREE.Vector3(sc, sc, sc)), fig: BOSS_CROWD_PICK[Math.floor(Math.random() * BOSS_CROWD_PICK.length)], sd, a, rim, wear: wear[(n * 5 + (n >> 3)) % wear.length].clone().multiplyScalar(1 - 0.2 * k) });
          n++;
        }
        // what they hold up: glow sticks in the house colours, a few phone lights
        for (let j = 0; j < 2; j++) {
          const a = a0 + (a1 - a0) * Math.random(), r = Rk - 0.1 + Math.random() * 0.55, t = tints[Math.floor(Math.random() * tints.length)], b = (0.3 + Math.random() * 0.5) * (1 - 0.14 * k);
          pos.push(Math.sin(a) * r, y + 3.15 + Math.random() * 0.7, -Math.cos(a) * r); col.push(t.r * b, t.g * b, t.b * b); seed.push(Math.random());
        }
        // aisle lights down the face of the tier, every fourth bay
        if (i % 4 === 0) for (let q = 0; q < 5; q++) glow.add(box, new THREE.Matrix4().makeRotationY(-a0).setPosition(Math.sin(a0) * (Rk - 0.47), y - 1.3 + q * 0.62, -Math.cos(a0) * (Rk - 0.47)).multiply(new THREE.Matrix4().makeScale(0.16, 0.09, 0.06)), P.a, 1.0, arena);
      }
      box.dispose();
    }
    // footlights round the edge of the floor, at the foot of the stands
    const foot = new THREE.BoxGeometry(0.5, 0.14, 0.2);
    for (let i = 0; i < 64; i++) {
      const a = (-118 + (236 * (i + 0.5)) / 64) * (Math.PI / 180);
      glow.add(foot, new THREE.Matrix4().makeRotationY(-a).setPosition(Math.sin(a) * 24.6, 0.12, -Math.cos(a) * 24.6), P.b, 1.1, arena);
    }
    foot.dispose();
    // The crowd itself: lit by the arena's lamps (each corner's light reckoned once: a card is small); its rims and what
    // it holds up glow of their own (aRim), red as the boss rages. Phase 5 (it was cards that never moved): one card
    // drawn for all of them at once, each moved in the shader on its own. Waiting, each sways from the hips and shifts
    // its weight at its own pace, and now and then pumps its arms (restless as the boss rages). A blow on the boss
    // (crowdCue "cheer") runs out from behind it along the stands: each hops at its own beat, stretched as it goes up,
    // and throws up its arms (its cheering figure: the picture holds each twice). The boss's strike ("stir"): a
    // flinch that runs through them, quicker: down, squashed, away to one side, some hands thrown up. Reduced effects:
    // a quarter of the sway, a third of a cheer, arms up and held, no pumping.
    // (its clock is uCrowdT, not uTime: FX.sync sets every uTime in the scene to the scene's clock each frame, and the
    // light sticks' material holds these very uniforms: Phase 5's review)
    const U = this.crowdU = { uCrowdT: { value: 0 }, uPx: { value: 1 }, uCheer: { value: 0 }, uRage: { value: 0 }, uCheers: { value: new THREE.Vector4(99, 0, 99, 0) }, uStirs: { value: new THREE.Vector4(99, 0, 99, 0) }, uMove: { value: new THREE.Vector2(1, 0) } };
    this.cues = { cheer: [99, 0, 99, 0], stir: [99, 0, 99, 0] }; // (the last two of each: [since, how big] twice)
    this.crowdT = 0; // (its clock: the show's, so a hit-stop holds it and slow motion slows it)
    const card = bossCardGeometry(), NP = people.length, aFig = new Float32Array(NP * 4), aRim = new Float32Array(NP * 3);
    people.forEach((p, i) => { aFig[i * 4] = p.fig; aFig[i * 4 + 1] = p.sd; aFig[i * 4 + 2] = p.a; aFig[i * 4 + 3] = cyHash(i); p.rim.toArray(aRim, i * 3); }); // (its own beat: a hash of its place in the crowd, not the randomness)
    card.setAttribute("aFig", new THREE.InstancedBufferAttribute(aFig, 4));
    card.setAttribute("aRim", new THREE.InstancedBufferAttribute(aRim, 3));
    const pm = new THREE.MeshLambertMaterial({ map: bossCrowdTexture(), alphaTest: 0.5, side: THREE.DoubleSide }); // (what each wears: its instance's colour)
    pm.onBeforeCompile = (sh) => {
      for (const k of ["uCrowdT", "uRage", "uCheers", "uStirs", "uMove"]) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
          attribute vec4 aFig; attribute vec3 aRim; uniform float uCrowdT; uniform vec4 uCheers; uniform vec4 uStirs; uniform vec2 uMove; varying vec3 vRim; varying float vSide;
          // how hard one of the crowd is in a moment that runs out through the stands: t since it began behind the boss,
          // k how big, lag when it reaches this one, fall how fast it passes, rise how fast it takes hold
          float crowdK(float t, float k, float lag, float fall, float rise){ float u = t - lag; return u > 0.0 ? k * exp(-u * fall) * min(1.0, u * rise) : 0.0; }`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          {
            float sd = aFig.y, hh = aFig.w, ring = abs(aFig.z), lift = max(uv.y, 0.0), tt = uCrowdT;
            float sway = (sin(tt * (0.75 + 0.6 * hh) + sd * 40.0) * 0.1 + sin(tt * (2.1 + 1.3 * sd) + hh * 23.0) * 0.028) * uMove.x;
            float bob = sin(tt * (1.2 + 1.1 * sd) + sd * 31.0) * 0.045 * uMove.x;
            float lc = ring * 0.5 + hh * 0.2, beat = 6.0 + 2.6 * hh;
            float ea = crowdK(uCheers.x, uCheers.y, lc, 0.85, 8.0), eb = crowdK(uCheers.z, uCheers.w, lc, 0.85, 8.0);
            float hop = max(abs(sin(max(uCheers.x - lc, 0.0) * beat)) * ea, abs(sin(max(uCheers.z - lc, 0.0) * beat)) * eb);
            float ls = ring * 0.16 + hh * 0.06, se = max(crowdK(uStirs.x, uStirs.y, ls, 3.0, 14.0), crowdK(uStirs.z, uStirs.w, ls, 3.0, 14.0));
            transformed.y *= 1.0 + 0.06 * hop - 0.1 * se;
            transformed.x *= 1.0 - 0.03 * hop + 0.04 * se;
            transformed.x += (sway + 0.12 * se * (hh < 0.5 ? -1.0 : 1.0)) * lift;
            transformed.y += bob + 0.32 * hop - 0.1 * se;
            float pump = uMove.x > 0.5 ? step(-0.35, sin(tt * (4.2 + 2.4 * hh) + hh * 40.0)) : 1.0;
            float idle = step(0.82 - 0.16 * uMove.y, fract(tt * 0.045 + hh * 7.13)) * step(0.0, sin(tt * (3.4 + 2.0 * sd) + sd * 50.0)) * step(0.5, uMove.x);
            float up = max(max(step(0.22, max(ea, eb)) * pump, idle), step(0.3, se) * step(0.62, hh));
            vUv = vec2((aFig.x + ${BOSS_CROWD_N}.0 * up + uv.x) / ${2 * BOSS_CROWD_N}.0, uv.y); // (its figure, standing or cheering)
            vRim = aRim;
            // (Phase 2's polish) which side of it its lamps are on: the boss's two rims behind it, either side, the nearer;
            // across the card, -1 its left, 1 its right, 0 straight before it
            vec3 at = (modelMatrix * instanceMatrix * vec4(0.0, 0.6, 0.0, 1.0)).xyz, ax = mat3(modelMatrix) * mat3(instanceMatrix) * vec3(1.0, 0.0, 0.0);
            vSide = clamp(dot(normalize(vec2(sign(at.x) * 11.0, -9.0) - at.xz), normalize(ax.xz)) * 1.8, -1.0, 1.0);
          }`);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRim; varying float vSide; uniform float uRage;")
        // (Phase 2's polish: each figure lit as a body, not a flat card: from above, its head and shoulders most, its
        // legs least; and from the side its lamps are on, red saying which way each part of it faces, its middle a
        // little fuller; alpha: the figure)
        .replace("#include <map_fragment>", `vec4 fig = texture2D(map, vUv); float fnx = fig.r * 2.0 - 1.0;
          diffuseColor.rgb *= mix(0.22, 1.1, smoothstep(0.04, 0.72, vUv.y)) * (1.0 + 0.6 * vSide * fnx + 0.25 * (1.0 - abs(fnx)));
          diffuseColor.a *= fig.a;`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          vec3 rimC = mix(vRim, vec3(1.0, 0.14, 0.24) * max(max(vRim.r, vRim.g), vRim.b), uRage);
          totalEmissiveRadiance += rimC * fig.g * (0.55 + 0.9 * clamp(0.5 + 0.8 * vSide * fnx, 0.0, 1.0)) + (rimC * 1.5 + 0.08) * fig.b;`); // (green: its rim, brightest on the side its lamps are on; blue: what glows of its own)
    };
    pm.customProgramCacheKey = () => "boss-crowd-4";
    const folk = (this.folk = new THREE.InstancedMesh(card, pm, NP));
    people.forEach((p, i) => { folk.setMatrixAt(i, p.m); folk.setColorAt(i, p.wear); });
    folk.name = "arena-crowd"; // (named for tools/cost-report.js)
    folk.layers.set(1);
    folk.frustumCulled = false;
    folk.userData.arena = true;
    s.add(folk);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("aCol", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
    this.crowd = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aSeed; uniform float uCrowdT; uniform float uPx; uniform float uCheer; varying vec3 vCol;
        void main(){
          vec3 p = position;
          p.y += sin(uCrowdT * (1.2 + aSeed * 1.4) + aSeed * 40.0) * (0.12 + 0.5 * uCheer) + uCheer * 0.5 * aSeed; // they sway, and jump when a blow lands
          vCol = aCol * (0.55 + 0.45 * sin(uCrowdT * (0.6 + aSeed) + aSeed * 17.0)) * (1.0 + uCheer);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = uPx * 150.0 / -mv.z; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "varying vec3 vCol; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; gl_FragColor = vec4(vCol * (exp(-r * 9.0) + 0.16 * exp(-r * 2.6)) * (1.0 - smoothstep(0.55, 1.0, r)), 1.0); }",
    }));
    this.crowd.frustumCulled = false;
    this.crowd.layers.set(1);
    this.crowd.userData.arena = true;
    s.add(this.crowd);
    this.cheer = 0;
    // mist between the fight and the stands, in the arena's own light (it was the boss's: a boss stood in a mist of its
    // own colour), the far one deep violet (it was royal blue): two curtains of it that drift past each other
    const hazeTex = bossHazeTexture();
    this.haze = [[-12, 90, 13, 1.6, 0.09], [-21, 150, 19, 2.6, 0.15]].map(([z, w, h, rep, k]) => {
      const map = hazeTex.clone();
      map.needsUpdate = true;
      map.repeat.set(rep, 1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, color: neon(z < -15 ? 0x3d2c80 : P.a, k), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      m.userData.far = z < -15;
      m.userData.arena = true;
      m.position.set(0, h / 2 - 0.2, z);
      m.layers.set(1);
      m.renderOrder = 1;
      m.userData.k = k;
      s.add(m);
      return m;
    });
  }
  makeBoss() {
    const hex = this.cfg.color;
    if (this.gen.model) { // the boss's own model, played by an actor (22d; the Tollgate, which has no skeleton, by its own: 22e)
      this.actor = this.gen.model.animations.length ? new BossActor(this, this.gen.model, this.row) : typeof BossTollgate !== "undefined" ? new BossTollgate(this, this.gen.model, this.row) : null;
      if (this.actor) { this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); return this.actor.root; }
    }
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
    const orbs = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.34, 0), glossy(new THREE.Color(hex).multiplyScalar(0.55).getHex(), { env: this.env, metal: 0.85, rough: 0.16, envI: 2.1, emissive: hex, emissiveK: 0.34 }), 6); // (cut stones: their facets take the light; lit from inside they were flat scraps)
    orbs.frustumCulled = false;
    orbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    grp.add(orbs);
    const charge = glowSprite(neon(hex, 2.4), 0.1, 1);
    charge.position.set(0, 2.9, -0.95);
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
    if (this.stage) { this.laidOut = true; return; } // (staged: the boss keeps its size and the lens finds its distance: 22f)
    const bs = this.bandSize(16);
    if (!this.fit) { // its measure, once: the rig at rest (not its rings, sparks or aura)
      const box = new THREE.Box3(), tmp = new THREE.Box3(), inv = new THREE.Matrix4();
      this.boss.updateMatrixWorld(true);
      inv.copy(this.boss.matrixWorld).invert();
      this.rig.G.body.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inv)); } });
      this.fit = box.isEmpty() ? { w: 8, h: 7.4 } : { w: Math.max(8, 2 * Math.max(Math.abs(box.min.x), Math.abs(box.max.x)) + 1.2), h: Math.max(7.4, box.max.y - box.min.y + 0.9) };
    }
    this.bossScale = clamp(Math.min((bs.h * 0.74) / this.fit.h, (bs.w * 0.84) / this.fit.w), 0.3, 1.1);
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
    if (this.stage) this.stage.talk(1900 + String(text).length * 20, String(text).length, String(text)); // (staged: the lens makes room for its words above its head)
  }
  start() {
    Sound.play(this.stage && this.bossKey === "all" ? "finalboss" : "boss"); // (staged: the last boss has its own track; until it has loaded, and from disk, the boss tune)
    Sound.sfx("charge");
    UI.banner("STAND BY", COLORS.red, this.cfg.name + " ENTERS", "low");
    this.layoutBand();
    if (this.stage) this.stage.enter(); // (staged: it drops in, lands, powers up and roars, on the show clock)
    else if (this.has3D) {
      this.tw.add(1.4, (k) => { this.boss.position.y = lerp(this.bossY + 7.5, this.bossY, k); }, () => {
        this.shockwave(new THREE.Vector3(0, 0.2, 0), neon(this.cfg.color, 2), 9, 0.8);
        this.floorRing(this.cfg.color, 18, 1);
        this.flashAt(new THREE.Vector3(0, 0.6, 0), this.cfg.color, 0.8, 10);
        this.shake(0.4);
        GFX.pulse(8, 0.15);
        Haptics.buzz(80);
        Sound.sfx("hit");
        this.crowdCue("stir", 0.8); // (the crowd flinches as it lands)
      }, Ease.outBack);
    }
    this.tw.wait(1.6, () => {
      if (this.unmounted) return;
      Dialog.open({
        lines: this.lines.intro,
        name: this.cfg.name,
        boss: this.bossKey,
        color: this.cfg.color,
        voice: 140,
        skipLabel: "FIGHT!",
        onDone: () => { if (!this.unmounted) this.nextQuestion(); },
      });
    });
  }
  // where a bolt spins up when the streak reaches a new tier (QuizGame.propTier): low on the player's side of the
  // picture, clear of the boss (staged fights only)
  tierAt() { return this.stage ? { p: this.stage.lens(0.56, -0.42, 3.2), size: 0.42 } : null; }
  hud() {
    if (!this.el) return;
    UI.text($("[data-score]", this.el), fmtScore(this.score));
    UI.text($("[data-hp]", this.el), Math.max(0, this.hp) + "/" + this.maxHp);
    UI.meter($("[data-hpbar]", this.el), this.hp / this.maxHp);
    this.lives(this.hearts + (this.stage ? this.stage.owed : 0), 3, "heart", COLORS.red); // (staged: a heart is seen to go when the boss's blow lands, a moment after the rule took it)
    const plate = $(".bossbar", this.el);
    if (plate) plate.classList.toggle("rage", this.enraged && this.hp > 0);
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
    this.el.classList.remove("threat");
    this.layoutBand();
    this.state = "ask";
    if (this.stage) this.stage.ask(); // (which strike it will wind up as the bar fills: look only)
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.state = "resolve";
    const frac = this.charge / this.T;
    const ok = this.run.record(this.round, i, 1 - frac);
    this.quiz.reveal(i);
    if (this.stage) this.stage.fire(i, ok); // (staged: the player's burst leaves from the answer's side; a wrong one dies on its armour)
    if (ok) this.playerHit(frac, i);
    else this.bossAttack(false);
  }
  timeout() {
    this.state = "resolve";
    this.run.record(this.round, -1);
    this.quiz.reveal(-1);
    this.bossAttack(true);
  }
  playerHit(frac, slot) {
    const dmg = 10 + Math.round(10 * (1 - frac)) + Math.min(8, (this.run.streak - 1) * 2);
    const hitCol = slot >= 0 && SLOT_COLORS[slot] ? SLOT_COLORS[slot] : COLORS.cyan; // (the look of the blow: the answer's own colour)
    if (!this.stage) Sound.sfx("shot"); // (staged: the burst has its own sounds)
    const land = () => {
      const wasCalm = !this.enraged;
      this.hp -= dmg;
      this.score += dmg * 10;
      if (!this.stage) Sound.sfx("boom"); // (staged: the blow has its own sounds, where it lands)
      Sound.sfx("correct");
      UI.flash("good");
      GFX.pulse(this.stage ? 1.6 : 3, this.stage ? 0.03 : 0.06); // (staged: the blow has its own flash where it lands; the whole picture is not lifted to white over it)
      GFX.hitStop(this.hp <= 0 ? 260 : 80);
      Haptics.buzz(30);
      Sound.setIntensity(this.enraged ? 3 : Sound.intensityFor(this.run.streak));
      if (this.hp > 0) this.taunt(pick(this.lines.hit));
      if (wasCalm && this.enraged && this.hp > 0) {
        this.tw.wait(0.5, () => { UI.banner("ENRAGED", COLORS.red, "Its attacks charge faster"); Sound.sfx("charge"); });
        if (this.has3D) this.scene.fog.color.setHex(0x2a0614);
      }
      const p = this.bandPoint(0.25);
      if (this.stage) Object.assign(p, this.stage.floatAt()); // (staged: over its head, above the burst)
      else if (this.has3D) { // the figure lands on the boss itself, large
        const v = this._v.copy(this.boss.position).project(this.camera);
        p.x = clamp((v.x * 0.5 + 0.5) * GFX.w, 60, GFX.w - 60); p.y = (0.5 - v.y * 0.5) * GFX.h - 10;
      }
      UI.floater("-" + dmg + " HP", p.x, p.y, hitCol, true);
      if (this.stage) { // (staged: a lance lands on its body; it recoils, staggers on a heavy blow, loses armour as its HP falls)
        this.stage.outline(UI.root.lastElementChild);
        this.stage.bossHit(dmg, { slot, col: hitCol, now: Math.max(0, this.hp) / this.maxHp, enraged: wasCalm && this.enraged && this.hp > 0, dead: this.hp <= 0 });
      } else if (this.has3D) {
        const b = this.boss;
        const at = b.position.clone().add(new THREE.Vector3(0, 0, 2 * this.bossScale));
        this.crowdCue("cheer", this.hp <= 0 ? 1.5 : 1); // (the stands cheer the blow)
        // (sparks leave from round the point of the blow, not all from one spot: piled on one another they were a white ball)
        for (let q = 0; q < 6; q++) this.bursts.burst(this._v.copy(at).add(this._s.set(rand(-1, 1), rand(-1, 1), rand(-0.3, 0.3)).multiplyScalar(0.9 * this.bossScale)), q % 2 ? hitCol : this.cfg.color, { n: 7, speed: 7, size: 0.3, life: q % 2 ? 0.6 : 1 });
        this.shards.burst(at, this.cfg.color, 12, this.bossScale * 1.1, 8, 6);
        this.flashAt(at, hitCol, 0.2, 1.7 * this.bossScale + 1);
        if (!GFX.calm && !REDUCED_MOTION) { // a hard-edged star where the bolt lands, in the answer's colour
          const st = this.hitStar;
          st.position.copy(at); st.material.uniforms.uColor.value.copy(neon(hitCol, 1.0)); st.visible = true; this.hitStarT = 0;
          this.hitLine = (this.hitLine || new THREE.Color()).copy(neon(hitCol, 1.5)); this.hitTint = 1; // (the arena takes the blow's colour for a moment: the floor's lines run in it)
          // and the boss is a dark shape for that moment, so the star is the brightest thing in the picture whatever the boss's colour
          const sil = this.rig && this.rig.mat.userData.uSil;
          if (sil) this.tw.add(0.34, (k) => { sil.value = k < 0.42 ? 1 : 1 - (k - 0.42) / 0.58; }, () => { sil.value = 0; });
        }
        this.tw.add(0.35, (k) => { b.position.z = -Math.sin(k * Math.PI) * 1.2; });
        this.shockwave(b.position.clone(), neon(hitCol, 1.5), 6); // (the ring is the answer's colour too)
      }
      this.hud();
      const title = this.hp <= 0 ? `FINISHING BLOW! −${dmg} HP` : `HIT! −${dmg} HP`;
      this.tw.wait(0.35, () => {
        if (this.unmounted) return;
        this.quiz.feedback({ ok: true, title, auto: this.explainAuto(true), onNext: () => this.after() });
      });
    };
    if (this.stage) this.tw.wait(0.3, land); // (staged: the rule's own 0.3 s; the burst that fills it and the lance that ends it are the stage's)
    else if (this.has3D) {
      // a plasma bolt with a ribbon tail
      const { shot, tail } = this.bolt;
      const tok = ++this.bolt.tok;
      const from = new THREE.Vector3(0, this.camY - 1.2, this.camZ - 3);
      { // it leaves from the side of the screen its answer's letter is on, at the foot of the picture
        const el = $$(".answers .ans .k", this.el)[slot], r = el && el.getBoundingClientRect();
        if (r && this.band) {
          const d = this._v.set(((r.left + r.width / 2) / GFX.w) * 2 - 1, 1 - (Math.min(this.band.bottom + 30, GFX.h) / GFX.h) * 2, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
          from.copy(this.camera.position).addScaledVector(d, 3.4);
        }
      }
      const to = this.boss.position.clone();
      shot.position.copy(from);
      shot.material.color.copy(neon(hitCol, 3));
      shot.visible = true;
      tail.reset(from);
      tail.mesh.visible = true;
      const tc = tail.mesh.material.uniforms.uColor.value, tc0 = neon(hitCol, 2.6);
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
    this.atkK = REDUCED_MOTION || GFX.calm ? 0.45 : 1;
    if (!this.stage) Sound.sfx("charge");
    const hit = () => {
      if (this.stage) this.stage.strikeNow(); // (staged: the blow is let go on this frame; the flash, the shake and the heart come as it lands)
      else { Sound.sfx("hit"); UI.flash("hit"); this.shake(0.55); GFX.pulse(7, 0); this.slash(); Haptics.buzz([60, 40, 90]); }
      Sound.setIntensity(this.enraged ? 3 : 0);
      this.taunt(this.hearts > 0 ? pick(this.lines.miss) : this.lines.win);
      this.hud();
      const title = (slow ? "TOO SLOW! " : "WRONG! ") + (this.hearts > 0 ? "THE BOSS HITS YOU" : "YOU'RE OUT OF HEARTS");
      this.tw.wait(0.4, () => {
        if (this.unmounted) return;
        this.quiz.feedback({ ok: false, title, onNext: () => this.after() });
      });
    };
    if (this.stage) { this.stage.attack(slow); this.tw.wait(0.12, hit); } // (staged: one of five strikes, its blow at its end on the rule's frame)
    else if (this.has3D) {
      // an energy beam from the eye, with a hot core, an outer glow and a muzzle flare
      const eye = new THREE.Vector3();
      this.boss.userData.eye.getWorldPosition(eye);
      const to = new THREE.Vector3(this.camBase.x, this.camY - 1.0, this.camZ - 1.5); // (at the lens, wherever its drift has taken it)
      const r = 0.25 * this.bossScale + 0.05;
      const col = COLORS.red; // (its blow is red whatever colour it is: red is "you were hurt" everywhere in the arcade)
      this.crowdCue("stir"); // (the stands flinch at its blow)
      const { beam, glow, muzzle } = this.atk;
      const tok = ++this.atk.tok;
      // First a flash at its lens; then the wedge shoots from the lens to the bottom edge of the picture, holds, and
      // closes. (Look only: the blow itself lands at the same moment as it always did.)
      const bu = beam.material.uniforms, ndc = this._v, half = this.band ? this.band.h / GFX.h : 1;
      const aim = () => { this.boss.userData.eye.getWorldPosition(ndc).project(this.camera); bu.uA.value.set(ndc.x, ndc.y); bu.uB.value.set(ndc.x * 0.35, -half - 0.04); };
      aim();
      bu.uColor.value.setRGB(1.25, 0.03, 0.075); // (red, not the pink a lit neon red goes to)
      bu.uFade.value = 1; bu.uGrow.value = 0; bu.uHalf.value = 0.4;
      beam.visible = true;
      muzzle.material.color.copy(neon(col, 3));
      muzzle.material.opacity = 1;
      muzzle.scale.setScalar(2.8 * this.bossScale);
      muzzle.position.copy(eye);
      muzzle.visible = true;
      this.flashAt(eye, col, 0.34, 2 * this.bossScale + 1); // (a flare at its eye, not a white blob over the whole figure)
      this.tw.add(0.5, (k) => {
        if (this.atk.tok !== tok) return;
        const t = k * 0.5, fade = 1 - clamp((t - 0.27) / 0.23, 0, 1);
        aim();
        bu.uGrow.value = clamp((t - 0.045) / 0.085, 0, 1);
        bu.uFade.value = fade;
        bu.uHalf.value = 0.4 * (0.3 + 0.7 * fade);
        muzzle.material.opacity = 1 - k;
        muzzle.scale.setScalar((2.8 - 1.5 * Math.min(1, t / 0.12) + k * 0.6) * this.bossScale);
      }, () => { if (this.atk.tok === tok) beam.visible = glow.visible = muzzle.visible = false; });
      this.tw.wait(0.12, hit);
    } else hit();
    this.charge = 0;
  }
  // Three slashes across the whole screen, panels and all: its blow lands on the player, not in the arena.
  slash() {
    const el = $(".slashes", this.el);
    if (!el || REDUCED_MOTION || GFX.calm) return;
    el.classList.remove("go");
    void el.offsetWidth; // (so the stroke starts again from its beginning)
    el.classList.add("go");
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
    if (!this.stage) Sound.sfx("bigboom");
    this.taunt(this.lines.defeat);
    GFX.pulse(this.stage ? 2 : 12, this.stage ? 0 : 0.45); // (staged: the death is seen sharp)
    Haptics.buzz([100, 50, 200]);
    if (this.has3D && !this.stage) {
      this.shockwave(this.boss.position.clone(), neon(0xfff4e0, 0.9), 12, 1.1); // (a ring, not a white band across the strip)
      this.floorRing(this.cfg.color, 26, 1.4);
      this.flashAt(this.boss.position, 0xffffff, 0.75, 7 * this.bossScale + 2);
    }
    const sub = stars + (stars === 1 ? " STAR" : " STARS"), banner = () => (this.stage ? this.stage.showResult("BOSS DEFEATED!", COLORS.lime, sub) : UI.banner("BOSS DEFEATED!", COLORS.lime, sub)); // (staged: on the top layer, held until the results)
    // (staged: slow motion, it goes over backward as blasts run along it, the last blast, the reward. The banner and
    // the jingle come with the last blast instead of on their old marks: look and sound only.)
    if (this.stage) this.stage.death(banner); else this.tw.wait(0.9, banner);
    if (this.has3D && !this.stage) {
      for (let i = 0; i < 6; i++) {
        this.tw.wait(i * 0.18, () => {
          const bs = this.bossScale;
          const p = this.boss.position.clone().add(new THREE.Vector3(rand(-2, 2), rand(-2, 2), 1).multiplyScalar(bs));
          this.bursts.burst(p, i % 2 ? this.cfg.color : 0xffffff, { n: 44, speed: 8 * bs, size: 0.3 * bs, life: 1.1 });
          this.shards.burst(p, i % 2 ? this.cfg.color : 0xffffff, 9, bs * 1.1, 11 * bs, 7);
          this.flashAt(p, i % 2 ? this.cfg.color : 0xffffff, 0.6, 5 * this.bossScale + 1.5);
          Sound.sfx("boom");
        });
      }
      // the core overloads to white while it collapses, then goes supernova
      const em = this.boss.userData.core.userData.mat.emissive;
      const e0 = em.clone();
      const s0 = this.boss.scale.x, r0 = this.boss.rotation.y;
      const G = this.rig ? this.rig.G : {};
      const apart = [[G.head, 0, 2.0, 0.5], [G.armL, -3.0, 0.7, 0.4], [G.armR, 3.0, 0.7, 0.4], [G.foreL, -1.0, -1.4, 0.7], [G.foreR, 1.0, -1.4, 0.7], [G.base, 0, -1.3, -0.5], [G.hips, 0, -0.5, 0.6]]
        .filter((a) => a[0]).map(([o, x, y, z]) => ({ o, p: o.position.clone(), x, y, z }));
      this.tw.add(1.2, (k, raw) => {
        this.boss.scale.setScalar(s0 * (1 - 0.4 * k));
        this.boss.rotation.y = r0 + raw * raw * 4.2;
        const d = REDUCED_MOTION ? 0 : raw * 0.7 + raw * raw * 1.5; // a body's width apart within the second
        apart.forEach((a) => a.o.position.set(a.p.x + a.x * d, a.p.y + a.y * d, a.p.z + a.z * d));
        const fl = Math.max(0, 1 - raw * 14) * 1.5, up = k * k * 0.3; // (a flash of white for three frames, then its own colours to the end: at full white it was a chalk statue)
        em.setRGB(e0.r + fl + up, e0.g + fl + up, e0.b + fl + up);
        if (!REDUCED_MOTION) this.camZ = 16 - 3 * raw; // the lens closes on it as it goes
      }, () => {
        const p = this.boss.position.clone();
        this.boss.visible = false;
        this.bursts.burst(p, 0xffffff, { n: 50, speed: 12 * s0, size: 0.28 * s0, life: 1.2, gravity: -2 });
        this.bursts.burst(p, this.cfg.color, { n: 60, speed: 8 * s0, size: 0.3 * s0, life: 1.5, gravity: -3 });
        this.shards.burst(p, this.cfg.color, 20, s0 * 1.4, 12 * s0, 6);
        this.shockwave(p, neon(this.cfg.color, 2.4), 18, 1.2);
        this.floorRing(0xffffff, 34, 1.6);
        this.flashAt(p, 0xffffff, 0.9, 9 * s0 + 3);
        this.shake(0.5);
        // what is left of it comes down across the floor for a second or two
        for (let i = 0; i < 5; i++) this.tw.wait(0.12 + i * 0.22, () => {
          const q = p.clone().add(new THREE.Vector3(rand(-4, 4), rand(1.5, 4.5), rand(-1, 2)).multiplyScalar(s0));
          this.shards.burst(q, i % 2 ? this.cfg.color : 0x8f95a8, 7, s0 * 1.1, 3 * s0, 16);
          this.bursts.burst(q, 0xffd9a0, { n: 16, speed: 3 * s0, size: 0.2 * s0, life: 1.3, gravity: -7 });
        });
      }, Ease.inCubic);
    }
    if (!this.stage) this.tw.wait(1.4, () => Sound.sfx("win"));
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
    if (this.stage) this.stage.defeat(); // (staged: the boss has the last word)
    this.tw.wait(1.2, () => (this.stage ? this.stage.showResult("DEFEATED", COLORS.red, "Read the notes, then come back", { pre: "GAME OVER" }) : UI.banner("DEFEATED", COLORS.red, "Read the notes, then come back"))); // (staged: on the top layer, held until the results)
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
      if (bar) {
        const fc = clamp(f, 0, 1);
        bar.style.transform = `scaleX(${fc.toFixed(3)})`;
        bar.style.setProperty("--f", Math.max(0.02, fc).toFixed(3)); // (the ramp is laid along the whole track, not squeezed into the fill)
        const hot = fc > 0.72, row = bar.parentNode.parentNode;
        if (row.classList.contains("hot") !== hot) { row.classList.toggle("hot", hot); this.el.classList.toggle("threat", hot); } // the last quarter: the bar and the question's frame warn
      }
      if (f >= 1) this.timeout();
    }
    if (!this.has3D) return;
    const st = this.stage; // (staged: the model's actor and the staged fight take the cyborg's place)
    const f = this.state === "ask" ? clamp(this.charge / this.T, 0, 1) : 0;
    const rage = this.enraged ? 1.8 : 1;
    const ease = Math.min(1, dt * 3);
    this.showY += (this.bossY - this.showY) * ease;
    const wind = smoothstep(0.45, 1, f); // the wind-up, as the attack charges
    this.atkK = Math.max(0, (this.atkK || 0) - dt * 3.4); // the lunge of an attack, decaying
    const lungeK = Math.sin(Math.min(1, this.atkK) * Math.PI);
    if (this.state !== "over" && !st) {
      this.showScale += (this.bossScale - this.showScale) * ease;
      this.boss.scale.setScalar(this.showScale * (1 + 0.12 * wind + 0.2 * lungeK));
      if (this.state !== "resolve" || lungeK > 0) this.boss.position.z = (1.6 * wind + 2.4 * lungeK) * this.showScale;
    }
    this.rune.scale.setScalar(0.45 + this.showScale * 0.75);
    this.pool.scale.setScalar(0.5 + this.showScale * 0.6);
    if (st) st.update(dt); // (the actor, the strike in hand, what is in flight, the lens: 22f)
    else this.cyborgFrame(dt, f, rage, wind);
    const hotK = smoothstep(0.55, 0.95, f);
    this.pool.material.color.copy(this.runeCol).lerp(this.hotCol, hotK).multiplyScalar(0.2 + f * 0.4);
    this.rune.rotation.z += dt * (0.15 + f * 1.2) * rage;
    this.rune.material.color.copy(this.runeCol).lerp(this.hotCol, hotK).multiplyScalar(0.45 + f * 0.75);
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 2.4);
      const k = Math.min(1, this.flashT);
      this.flash.visible = k > 0;
      this.flash.scale.setScalar(this.flashSize * (1.4 - k * 0.5));
      this.flash.material.opacity = 0.6 * k * k; // (a burst on the boss, not a veil over the picture)
      this.hitLight.intensity = this.flashT * this.flashT * 6;
    }
    this.shards.update(dt);
    if (this.hitStar.visible) { // the star a bolt leaves: it opens fast and is gone in a quarter of a second
      const k = Math.min(1, (this.hitStarT += dt / 0.34)), e = 1 - (1 - k) * (1 - k);
      this.hitStar.quaternion.copy(this.camera.quaternion);
      this.hitStar.scale.setScalar((3.4 + 4.6 * e) * this.bossScale);
      this.hitStar.material.uniforms.uK.value = 1 - k * k;
      this.hitStar.visible = k < 1;
    }
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
      this.beamMat.uniforms.uColor.value.copy(this.beamCol).lerp(this.rageCol, rk);
      this.glowMat.uniforms.uRage.value = this.crowdU.uRage.value = this.probeTint.w = this.steelMat.userData.uSpillRage.value = rk * 0.6; // (the arena's own neon and the crowd's rims bleed red with it, and what the deck and the steel give back of them, and its light on the steel)
      this.ambient.color.copy(this.ambientBase).lerp(this.rageAmb, rk);
      this.lamps.edge.color.copy(this.edgeCol).lerp(this.rageCol, rk * 0.5); // (the cold edge half red with the rims)
      const tint = this.scene.userData.post.tint;
      tint[0] = 1 + 0.1 * rk; tint[1] = 1 - 0.08 * rk; tint[2] = 1 - 0.05 * rk;
      if (!st) this.boss.userData.eye.material.color.setRGB(1.15 + 0.4 * rk, 1.15 - 0.35 * rk, 1.15 - 0.35 * rk);
      if (!st && this.state !== "over" && this.state !== "intro") this.boss.position.x = rand(-1, 1) * 0.04 * rk * this.bossScale * (REDUCED_MOTION || GFX.calm ? 0.25 : 1);
    }
    this.floor.material.uniforms.uReflect.value = 0.55;
    // (the deck's capture of the arena gives back less where the tier draws the floor's mirror, the Mac's: the mirror
    // has the arena exactly, the boss with it; the capture adds the crowd, which the mirror leaves out)
    // (and a stroke of lightning lifts what it gives back for that moment, as it lights the arena: the capture holds the
    // storm as it was)
    this.floor.material.uniforms.uProbe.value.x = this.probeK * (GFX.ok && GFX.opt.wet && GFX.TIERS[GFX.tier].mirror > 0 && !this.scene.userData.mirrorOff ? 0.45 : 1) * (1 + 0.45 * (this.arena ? this.arena.flash : 0));
    { // the floor's lines: low while it waits, running hot as its attack charges; a blow that lands runs through them in the answer's colour
      const fl = this.floor.material.uniforms.uLine.value;
      let ch = this.state === "ask" ? clamp(this.charge / this.T, 0, 1) : 0;
      if (this.stage) { this.chEase = ch >= (this.chEase || 0) ? ch : this.chEase + (ch - this.chEase) * Math.min(1, VFX.dt * 4); ch = this.chEase; } // (staged: the warning in the floor eases off over a few frames; it does not snap)
      fl.copy(this.lineBase).lerp(this.rageLine, rk).multiplyScalar(0.52 + 0.48 * ch);
      if (this.hitTint > 0.002) { this.hitTint = Math.max(0, this.hitTint - dt * 4); fl.lerp(this.hitLine, Math.min(1, this.hitTint * 1.25)); }
    }
    // a slow cinematic drift, with a touch of pointer parallax
    if (!st) this.cyborgCamera();
    this.placeCamera();
    followSky(this.sky, this.camera);
    if (this.arena) this.arena.update(VFX.dt);
    // the deck's reflection, a face a frame: drawn again once the boss has powered up and its lamps are full (staged)
    if (this.probe) {
      if (!this.probeFull && st && st.phase === "fight" && st.a.power >= 0.999) { this.probeFull = true; this.probe.capture(); }
      this.probeStep();
    }
    if (!this.platesIn || !this.brushIn) this.texIn();
    this.arenaFrame(dt);
  }
  // the built-in cyborg: its hover, its halo and gems, the charge it gathers, its eye's light
  cyborgFrame(dt, f, rage, wind) {
    const u = this.boss.userData;
    if (this.state !== "intro") this.boss.position.y = this.showY + Math.sin(this.t * 1.5 * rage) * 0.35 * this.showScale;
    u.core.rotation.y += dt * 0.5 * rage;
    u.core.rotation.x += dt * 0.15 * rage;
    u.ring.rotation.z += dt * rage;
    u.ring2.rotation.y = Math.sin(this.t * 0.5 * rage) * 0.5;
    if (u.body) {
      // the war machine shifts its weight, looks about and leans in as it charges
      u.body.rotation.y = Math.sin(this.t * 0.55 * rage) * 0.16 + Pointer.x * 0.12;
      u.body.rotation.z = Math.sin(this.t * 0.4 * rage) * 0.035;
      u.body.rotation.x = f * 0.16 + wind * 0.14 + Math.sin(this.t * 0.7) * 0.02;
    }
    this.rig.update(dt, f); // breathing, twitches, wind-up, recoil, damage, rage (look only)
    const orbR = u.body ? 4.7 : 3.7; // the cyborg's gems circle outside its shields
    for (let i = 0; i < 6; i++) {
      const a = this.t * 1.2 * rage + (i / 6) * Math.PI * 2;
      this._v.set(Math.cos(a) * orbR, Math.sin(a * 2) * 0.7, Math.sin(a) * orbR);
      this._q.setFromEuler(this._e.set(0, this.t * 3 + i, 0.6));
      u.orbs.setMatrixAt(i, this._m.compose(this._v, this._q, this._s.set(1, 1.55, 1)));
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
  }
  // the lens on the cyborg: a slow cinematic drift, with a touch of pointer parallax; and its shadow on the floor
  cyborgCamera() {
    const sway = REDUCED_MOTION || GFX.calm ? 0.2 : 1;
    this.camBase.set((Math.sin(this.t * 0.23) * 0.7 + Pointer.x * 0.6) * sway, this.camY + (Math.sin(this.t * 0.37) * 0.12 - Pointer.y * 0.2) * sway, this.camZ);
    this.lookAt.set(0, this.showY - 0.42 * this.showScale, 0); // (aimed below its middle: it stands higher in the strip, with floor under its feet)
    if (this.contact) { const cs = 9.2 * this.showScale; this.contact.scale.set(cs, cs, 1); this.contact.position.x = this.boss.position.x; this.contact.position.z = this.boss.position.z; this.contact.material.opacity = 0.9 * clamp(1.6 - this.boss.position.y / (this.showY + 0.001) * 0.6, 0, 1); this.contactCore.scale.set(cs * 0.5, cs * 0.36, 1); this.contactCore.position.x = this.contact.position.x; this.contactCore.position.z = this.contact.position.z; this.contactCore.material.opacity = this.contact.material.opacity; }
  }
  // the front row, the crowd and the mist (they follow the lens, so they are set once it has been placed)
  arenaFrame(dt) {
    if (this.frontRow) { // the front row keeps to the bottom edge of the strip, whatever the strip's height (and sinks out of the picture when the boss falls)
      const fr = this.frontRow, half = (this.band ? this.band.h : GFX.h) / 2, m = (half * 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / GFX.h;
      const th = Math.atan2(this.lookAt.y - this.camBase.y, this.camZ), D = (this.camZ - 7.55) / (Math.cos(th) - m * Math.sin(th));
      const edge = this.camBase.y + D * (Math.sin(th) - m * Math.cos(th)); // how high the strip's bottom edge is, at the row
      const to = (this.state === "over" ? Math.min(edge, 0) - 1.4 : edge + 0.4) - fr.userData.top;
      fr.position.y = this.frontSet ? fr.position.y + (to - fr.position.y) * (1 - Math.pow(0.004, dt)) : to;
      this.frontSet = true;
      fr.visible = fr.position.y + fr.userData.top > 0.05;
      this.frontRimMat.color.copy(this.arenaCol).multiplyScalar(0.16);
    }
    if (this.crowd) { // the crowd: swaying, louder for a moment whenever the light of a hit goes up
      this.cheer = Math.max(this.cheer * Math.pow(0.12, dt), Math.min(1, this.hitLight.intensity * 0.25));
      const quiet = REDUCED_MOTION || GFX.calm, d = VFX.dt, u = this.crowdU, ch = this.cues.cheer, st = this.cues.stir, km = quiet ? 0.3 : 1;
      this.crowdT += d * (1 + 0.5 * (this.rageK || 0)); // (the cards and what they hold up, on the show's clock: see makeCrowd; restless, quicker, as the boss rages)
      ch[0] = Math.min(60, ch[0] + d); ch[2] = Math.min(60, ch[2] + d); st[0] = Math.min(60, st[0] + d); st[2] = Math.min(60, st[2] + d); // (no list made a frame)
      u.uCrowdT.value = this.crowdT; u.uCheer.value = quiet ? this.cheer * 0.3 : this.cheer; u.uPx.value = (GFX.h / 844) * GFX.scenePR();
      u.uCheers.value.set(ch[0], ch[1] * km, ch[2], ch[3] * km); u.uStirs.value.set(st[0], st[1] * km, st[2], st[3] * km);
      u.uMove.value.set(quiet ? 0.25 : 1, this.rageK || 0);
      const drift = quiet ? 0.25 : 1;
      this.haze.forEach((m, i) => { m.material.map.offset.x = (i ? -1 : 1) * this.t * 0.006 * drift; if (!m.userData.far) m.material.color.copy(this.arenaCol).multiplyScalar(m.userData.k * 0.42 * (1 + 0.6 * this.cheer)); });
    }
    FX.sync(this.scene, this.t);
  }
  // The crowd's moments (look only: the staged fight, and the built-in fight's own effects, call it): "cheer", a blow
  // has landed on the boss (k: how big); "stir", the boss strikes. Each runs out through the stands from behind the
  // boss (makeCrowd's shader); the last two of each kind are kept, so a new one never cuts one still running short.
  crowdCue(kind, k = 1) {
    const q = this.cues && this.cues[kind === "stir" ? "stir" : "cheer"];
    if (!q) return;
    const i = q[0] >= q[2] ? 0 : 2; // (in place of the older)
    q[i] = 0; q[i + 1] = Math.min(1.5, k);
  }
  pause() { super.pause(); if (this.paused && this.stage) this.stage.pause(); } // (staged: nothing keeps sounding behind the menu)
  resume() { super.resume(); if (this.stage) this.stage.resume(); }
  dispose() {
    if (this.has3D) {
      if (this.stage) this.stage.dispose();
      if (this.arena) this.arena.dispose();
      this.shards.dispose();
      if (this.boss.userData.orbs && this.boss.userData.orbs.dispose) this.boss.userData.orbs.dispose();
      if (this.folk) this.folk.dispose(); // (the crowd's places and colours: an instanced mesh's own buffers)
      // (the deck's capture, the steel's filtered copy of it, the deck's and the steel's pictures: no scene holds them)
      if (this.probe) this.probe.dispose();
      if (this.steelEnv) this.steelEnv.dispose();
      if (this.plates) this.plates.dispose();
      if (this.steelMat) this.steelMat.userData.tBrush.value.dispose();
    }
    super.dispose();
  }
}
