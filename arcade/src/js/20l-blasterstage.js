// Risk Blaster's combat, staged (when the overlord's model arrived: with the built-in demon the game shows what it
// always showed). The rules decide what happens and when (20-blaster.js: pick, resolve, timeout, after); this file
// decides what is seen and heard of it, with the shared effects kit (CombatFX), on the show clock:
//   the fighter fires        three volleys from both cannons in a seventh of a second: bolts, muzzle flashes that light
//                            the hull, spent cells, recoil, hot barrels; each pair cracks the drone it lands on
//   a right answer           the bolts hold as two beams on the answer's drone; at the rule's moment the drone shatters
//                            and a lance goes through it into the demon's core: sparks, a ring, a hit-stop
//   a wrong answer           each pair of bolts dies on the drone in a dull red fizzle; the drone locks out
//   the demon strikes        a telegraph (wind-up, a marker of the strike's own shape on the fighter, a charging sound),
//                            then one of five strikes, each its own colour, flight and landing. Every strike has landed
//                            before the explanation sheet comes up (the sheet is a rule: the show is timed to it).
//   the strike lands         now the shield is seen to go: the shell flares cyan at its edge three times, the band's
//                            edge flashes red, a short colour split, a shake, sparks, shards, the HUD cracks
//   one shield left          a red frame that swells with the alarm, a ribbon of flame and dark smoke from the hurt engine
//   the demon dies           the fighter's last burst, a chain of blasts as it comes apart, the last one, stars to the
//                            score: all of it over before the next question's drones appear
// Nothing here is read by a rule. A shield lost is shown when the blow lands (a moment after the rule took it), so
// the game's HUD asks this file how many are still owed (owed) before it draws its lives.
// Light has a shape here: a blast is a small hot core, lobes of fire in its own colour, a ring, streaks and smoke;
// nothing is a soft ball of white, and nothing but a core passes white.
const STAGE = {
  COL: [0xc850ff, 0xff2a3c, 0xb48cff, 0xff1a30, 0xffa030], // each strike's colour: plasma, claws, the roar, the beam, seekers
  MARK: ["lock", "bang", "ring", "arc", "seek"], // and its marker's shape
  SMOKE: 0x2c2244, WRECK: 0x241c38, // smoke and wreckage stay in the palette
};
class BlasterStage {
  constructor(game) {
    const g = (this.g = game), s = g.scene;
    g.show = new TweenSet(); // show-only timing: nothing in it is a rule
    this.kit = g.kit = new CombatFX(g, { unit: 1, ground: null, sparks: 420, chunks: 96, firePuffs: 120, smokePuffs: 120, lights: 3 });
    this.shot = null; // the burst being fired
    this.atk = null; // the demon's strike being staged
    this.debts = []; // shields the rules have taken that have not been seen to go yet
    this.low = 0; this.lowT = 0; this.lowK = 0; this.hitK = 0; this.alarmAt = 0; this.alarmGame = 0; this.smokeT = 0; this.misses = 0; this.leaks = []; this.warpAt = -1; // (low: 1 with one shield left, 2 with none)
    this.aimQ = new THREE.Quaternion(); this.idleQ = new THREE.Quaternion(); this.aimT = 0;
    this.engine = false; this.alarm = false; this.charge = false; // (which of its running sounds are recordings that are playing)
    // thin rings that face the lens: the roar's wave of force, a pop on the fighter's shell, a ripple
    const wg = new THREE.PlaneGeometry(2, 2);
    this.waves = Array.from({ length: 8 }, () => {
      const m = new THREE.Mesh(wg, new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uK: { value: 0 }, uW: { value: 0.05 } },
        transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, extensions: { derivatives: true },
        vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        // (a hard-edged ring, clear inside, never brighter than its own colour: it is laid over the picture, not added to it)
        fragmentShader: `uniform vec3 uColor; uniform float uK; uniform float uW; varying vec2 vP;
          void main(){
            float r = length(vP), e = fwidth(r) * 1.5, band = smoothstep(1.0 - uW - e, 1.0 - uW, r) * (1.0 - smoothstep(1.0 - e, 1.0, r));
            if (band < 0.01) discard;
            gl_FragColor = vec4(uColor, band * uK);
          }`,
      }));
      m.visible = false; m.renderOrder = 6; m.frustumCulled = false;
      s.add(m);
      return { m, t: -1, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), s0: 1, s1: 1, w: 0.055, live: false };
    });
    // its seekers: a hot head each, a ribbon of fire behind it
    this.missiles = [0, 1, 2, 3].map(() => {
      const sp = glowSprite(new THREE.Color(2.2, 1.2, 0.4), 0.5, 1), tail = new Trail({ length: 18, width: 0.1, color: 0xff9a2a, intensity: 1.7, up: new THREE.Vector3(0, 0, 1) }); // (the ribbon lies across the line of sight)
      sp.visible = tail.mesh.visible = false; sp.renderOrder = 9; tail.mesh.renderOrder = 8;
      s.add(sp, tail.mesh);
      return { sp, tail, t: -1, dur: 1, out: 0, acc: 0, a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), p: new THREE.Vector3() };
    });
    // its plasma: orbs with a white-cyan heart and a dark rim, so they read on a magenta sky
    const oc = document.createElement("canvas");
    oc.width = oc.height = 64;
    { const x = oc.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      [[0, "rgba(255,255,255,1)"], [0.2, "rgba(200,250,255,1)"], [0.4, "rgba(214,110,255,1)"], [0.58, "rgba(120,30,205,1)"], [0.64, "rgba(16,3,34,0.96)"], [0.8, "rgba(16,3,34,0.9)"], [0.86, "rgba(150,60,255,0.3)"], [1, "rgba(150,60,255,0)"]].forEach(([k, c]) => gr.addColorStop(k, c));
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
    this.orbTex = new THREE.CanvasTexture(oc);
    this.orbs = Array.from({ length: 6 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.orbTex, transparent: true, depthWrite: false, depthTest: false })); sp.material.color.setScalar(1.2); sp.visible = false; sp.renderOrder = 9; s.add(sp); return { sp, t: -1, dur: 1, a: new THREE.Vector3(), b: new THREE.Vector3(), hit: null }; });
    // the band's edge: red when a shield goes (once), and with one shield left a frame that swells with each tone of
    // the alarm. It lies over the picture's edges only: the answers' drones stand inside it.
    this.frameU = { uK: { value: 0 } };
    this.frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.frameU, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, // (premultiplied: it darkens what it lies over and adds its own red)
      vertexShader: "varying vec2 vP; void main(){ vP = (uv - 0.5) * 3.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", // (the quad is half as large again as the band: vP is 1 at the band's edge)
      fragmentShader: `uniform float uK; varying vec2 vP;
        void main(){
          vec2 d = abs(vP);
          float ex = smoothstep(0.76, 1.02, d.x), ey = smoothstep(0.7, 1.02, d.y), e = 1.0 - (1.0 - ex) * (1.0 - ey);
          e = e * e * (1.0 - smoothstep(1.0, 1.45, max(d.x, d.y)));
          gl_FragColor = vec4(vec3(0.9, 0.03, 0.07) * (e * uK * 0.7), e * uK * 0.5);
        }`,
    }));
    this.frame.renderOrder = 54; this.frame.frustumCulled = false; this.frame.visible = false;
    s.add(this.frame);
    // (Phase 6: with one shield left, the frame is Boss Rush's, drawn over the finished picture and under the four
    // letters: inside the picture the post's vignette blacked it out. The flash as a shield goes stays in the picture.)
    this.edge = new BandEdge();
    s.userData.edge = (r) => this.edge.draw(r, g.band);
    // the hurt engine burns: a ribbon of flame that trails down the screen
    this.flame = new Trail({ length: 16, width: 0.09, color: 0xff8a2a, intensity: 2.0, up: new THREE.Vector3(0, 0, 1) });
    this.flame.mesh.visible = false; this.flame.mesh.renderOrder = 6;
    s.add(this.flame.mesh);
    // a crack in a drone's housing: a jagged line across its ring (a ribbon: lines are a pixel wide whatever is asked)
    { const pts = [[1.04, 0], [1.2, 0.09], [1.34, -0.05], [1.52, 0.08], [1.74, 0]], pos = [], w = 0.035;
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = Math.hypot(bx - ax, by - ay), nx = (-(by - ay) / l) * w, ny = ((bx - ax) / l) * w; pos.push(ax + nx, ay + ny, 0, ax - nx, ay - ny, 0, bx + nx, by + ny, 0, ax - nx, ay - ny, 0, bx - nx, by - ny, 0, bx + nx, by + ny, 0); }
      this.crackGeo = new THREE.BufferGeometry(); this.crackGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); }
    this.crackMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.6), side: THREE.DoubleSide, depthTest: false, transparent: true });
    // Everything that used to throw a burst of soft round dots here (the streak's confetti, a far blast, a derelict
    // shorting) throws sparks instead while the fight is staged: darts with a point, a tail and a hot heart.
    g.bursts.burst = (pos, color, o = {}) => {
      const n = o.n || 60, size = o.size || 0.3, life = o.life || 1.1;
      if (n <= 2) return this.kit.embers(pos, color, { n, radius: size, life, speed: (o.speed || 10) * 0.6 });
      this.kit.sparks(pos, color, { n: Math.min(46, Math.ceil(n * 0.55)), speed: (o.speed || 10) * 1.15, life: life * 0.7, len: size * 2.6, w: size * 0.3, gravity: o.gravity === undefined ? 2.5 : -o.gravity * 0.5, drag: 0.35 });
    };
    this._n = new THREE.Vector3(); this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._u = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._up = new THREE.Vector3(0, 1, 0); this._e = new THREE.Euler();
    this.escort = new BlasterEscort(g); // the allies on the fighter's wings and between waves, the overlord's brood far off (20m)
    this.incoming = false; // ("BOSS INCOMING" is called once a run, as the first overlord comes)
  }
  // ---- where things are (the starfighter and the built-in fighter both answer) -----------------------------
  shipPos(out) { const j = this.g.jet; return j.centre ? j.centre(out) : out.copy(this.g.ship.position); }
  muzzle(i, out) { const j = this.g.jet; return j.muzzle ? j.muzzle(i, out) : j.rig.localToWorld(out.copy(j.muzzles[i % j.muzzles.length])); }
  exhaust(i, out) { const j = this.g.jet; return j.exhaust ? j.exhaust(i, out) : j.rig.localToWorld(out.copy(j.nozzles[i % j.nozzles.length])); }
  // where it burns with one shield left (Phase 6): on its back beside the canopy, to port, where the lens sees it (the
  // engine it used to burn at sits under the foot of the band). Found once on the model's own skin: straight down
  // onto the hull from above a point a fifth of the way from the cockpit to the tail, out by a nozzle's spacing.
  hurt(out) {
    const j = this.g.jet;
    if (!j.model || !j.cockpit || !j.exhaust) return this.exhaust(1, out);
    if (!this.hurtL) {
      j.rig.updateMatrixWorld(true);
      const c = j.cockpit(new THREE.Vector3()), t0 = j.exhaust(0, new THREE.Vector3()), t1 = j.exhaust(1, new THREE.Vector3());
      const side = t1.clone().sub(t0), up = new THREE.Vector3(0, 1, 0).transformDirection(j.rig.matrixWorld);
      const p = c.clone().lerp(t0, 0.22).addScaledVector(side, 1.15), from = p.clone().addScaledVector(up, 5);
      const meshes = Object.values(j.model.mesh || {}).filter((m) => m && m.isMesh && m.visible);
      const hit = meshes.length ? new THREE.Raycaster(from, up.clone().negate(), 0, 10).intersectObjects(meshes, false)[0] : null;
      this.hurtL = j.rig.worldToLocal((hit ? hit.point : p).clone().addScaledVector(up, 0.02));
    }
    return j.rig.localToWorld(out.copy(this.hurtL));
  }
  // a place in the world, as a place on the screen (pixels)
  screen(p) { const v = this._u.copy(p).project(this.g.camera); return { x: (v.x * 0.5 + 0.5) * GFX.w, y: (0.5 - v.y * 0.5) * GFX.h }; }
  pan(p) { return clamp(p.x / 4, -1, 1) * 0.7; }
  // a point a little toward the lens from another (in front of a drone, on the near side of the fighter's shell)
  near(p, d, out) { const v = this._n.copy(this.g.camera.position).sub(p).normalize().multiplyScalar(d); return (out || new THREE.Vector3()).copy(p).add(v); } // (out may be p itself)
  // how many shields the HUD should still show beyond what the rules hold (a blow on its way)
  get owed() { return this.debts.length; }

  // ---- sound that runs on: the engines, the alarm, a charge -------------------------------------------------
  start() { this.loops(true); this.escort.entrance(); } // (two allies fly in on its wings)
  loops(on) {
    if (on) {
      this.engine = Sound.loop("blaster-engine", "engine_ship", { vol: 0.3, rate: 0.9, fade: 0.6 });
      if (!this.engine) Sound.engine(true); // (no recording: the synth's hum, as before)
      if (this.low === 1) this.alarmOn();
      if (this.atk && !this.atk.released) this.charge = Sound.loop("blaster-charge", "charge_hum", { vol: 0.5, rate: 1.2, fade: 0.08 }); // (paused in the middle of a wind-up: its charge is heard again)
    } else {
      Sound.stopLoop("blaster-engine", 0.2); Sound.stopLoop("blaster-alarm", 0.1); Sound.stopLoop("blaster-charge", 0.05);
      Sound.engine(false);
      this.engine = this.alarm = this.charge = false;
    }
  }
  alarmOn() { this.alarm = Sound.loop("blaster-alarm", "alarm", { vol: 0.34 }); this.alarmAt = Sound.ctx ? Sound.ctx.currentTime : 0; this.alarmGame = 0; } // (the red frame swells with each of its tones, counted from here)
  pause() { this.loops(false); Sound.hush(); } // (nothing keeps sounding behind the menu: the loops, and whatever was still ringing)
  resume() { if (this.g.state !== "over") this.loops(true); }

  // ---- thin rings, gashes, orbs: the stage's own small shapes --------------------------------------------------
  // a ring that travels from one place to another, growing (the roar), or opens where it is (a pop, a ripple)
  wave(from, to, dur, s0, s1, delay, col, w = 0.055, k = 0.95) {
    const r = this.waves.find((x) => !x.live) || this.waves[0];
    r.from.copy(from); r.to.copy(to || from); r.dur = dur; r.t = -1e-4 - delay; r.s0 = s0; r.s1 = s1; r.w = w; r.live = true;
    r.m.material.uniforms.uColor.value.set(col).multiplyScalar(k);
  }
  // a streak of light drawn fast from one place to another: a point, a tail thinning to nothing (a claw raked across)
  streak(from, to, col, dur, w, k = 1.5) {
    const d = this.kit._dart(), v = this._u.subVectors(to, from), len = v.length();
    d.p.copy(from); d.v.copy(v).multiplyScalar(1 / dur); d.life = d.t = dur * 1.6; d.w = w; d.len = len * 0.75; d.stretch = 0; d.g = 0; d.drag = 1; d.fade = 1.5; d.col = fxRGB(col, k); d.bolt = null;
  }
  // a line that stays where it was cut for a moment (a gash in the shell, the line a beam burns across it)
  gash(from, to, col, life, w, k = 1.4) {
    const d = this.kit._dart(), v = this._u.subVectors(to, from), len = v.length();
    d.p.copy(from).addScaledVector(v, 0.5); d.v.copy(v).multiplyScalar(0.02 / Math.max(len, 1e-3)); d.life = d.t = life; d.w = w; d.len = len; d.stretch = 0; d.g = 0; d.drag = 1; d.fade = 1.3; d.col = fxRGB(col, k); d.bolt = null;
  }
  // a plasma orb flies from a claw to the fighter's shell
  orb(from, to, dur, hit) {
    const o = this.orbs.find((x) => x.t < 0) || this.orbs[0];
    o.a.copy(from); o.b.copy(to); o.t = 0; o.dur = dur; o.hit = hit;
  }
  // a hit on the fighter's shell that it holds: a small cyan ring and a few sparks where it landed
  pop(p, col = 0x8feaff, s = 1) {
    const k = this.g.shipScale * s;
    this.wave(p, null, 0.2, 0.1 * k, 0.6 * k, 0, col, 0.05, 0.8);
    this.kit.flash(p, col, 0.1 * k, 0.34 * k, 0.07, 0.9, 1.3);
    this.kit.sparks(p, 0xffffff, { n: 6, speed: 6 * k, life: 0.22, len: 0.45 * k, w: 0.04 * k, k: 1.8 });
  }

  // ---- the fighter fires (the rule: pick) --------------------------------------------------------------------
  // right: whether the answer is the right one (look only: the rule checks it itself, 0.22 s on)
  fire(i, right) {
    const g = this.g, t = g.targets[i];
    if (!t) return;
    const at = t.position.clone(), p = g.ship.position;
    // it turns toward its target, most of the way (its bolts do the rest), quickly but never in a snap
    this.aimQ.setFromRotationMatrix(this._m.lookAt(p, at, this._up));
    this.aimQ.slerp(this._q.set(0, 0, 0, 1), 0.38);
    this.aimT = 0.62;
    if (this.shot && this.shot.beams) this.shot.beams.forEach((b) => b.stop());
    this.shot = { i, t, right, col: SLOT_COLORS[i], at, n: 0, time: 0, beams: null, until: 1e9, side: at.x < 0 ? -1 : 1 };
  }
  volley(sh) {
    const g = this.g, kit = this.kit, k = g.shipScale, n = sh.n;
    for (let gun = 0; gun < 2; gun++) {
      const from = this.muzzle(gun, new THREE.Vector3()), to = sh.at.clone().add(this._v.set((gun ? 0.12 : -0.12) * (1 + n), rand(-0.08, 0.08), 0)), dir = this._w.subVectors(to, from).normalize();
      kit.muzzle(from, dir, sh.col, 0.4 * k);
      kit.bolt(from, to, sh.col, { dur: 0.085, width: 0.2 * k, len: 3.6 * k, onHit: (hit) => this.boltLands(sh, gun, n, hit) });
      // a spent cell thrown clear of the gun: a bright chunk that tumbles away and falls behind
      kit.debris(from, { n: 1, size: 0.12 * k, speed: 3.4, dir: this._v.set(gun ? 1 : -1, 0.7, 0.9).normalize(), spread: 0.3, color: 0x8fdcff, hot: 0xffffff, gravity: 5, life: 0.55, radius: 0.02, k: 1.6 });
      kit.shells(from, this._v.set(gun ? 1 : -1, 0.5, 0.6).normalize(), 0xbfe8ff);
      if (g.jet.fire) g.jet.fire(sh.col, true, g.jet.model ? gun : undefined);
    }
    Sound.sfx("laser_fire", sh.side * 0.5, { vol: 0.8, rate: 1 + n * 0.06 });
    Sound.sfx("shell", n % 2 ? 0.55 : -0.55, { vol: 0.3, delay: 0.04 }); // (the spent cells thrown clear: quietly, under the shot)
  }
  boltLands(sh, gun, n, p) {
    const g = this.g, kit = this.kit, k = g.shipScale, t = sh.t, ds = t ? clamp(t.scale.x / 0.4, 0.8, 1.5) : 1, front = this.near(p, 1.5 * (t ? t.scale.x : 0.4), this._v);
    if (sh.right) {
      kit.flash(front, sh.col, 0.16 * ds, 0.55 * ds, 0.08, 0.8, 1.4);
      kit.sparks(front, sh.col, { n: 5, speed: 6 * ds, life: 0.22, len: 0.5 * ds, w: 0.05 * ds });
      if (gun === 0) { // each pair is seen and heard to land on its housing: a crack, a chip, a jolt, light on the drone
        this.crack(t, n);
        kit.light(front, sh.col, 4, 0.06, 7);
        Sound.sfx("impact_metal", sh.side * 0.5, { vol: 0.4, rate: 1.1 + n * 0.1 });
      }
      if (!sh.beams) sh.beams = [0, 1].map((q) => kit.beam(this.muzzle(q, this._w), sh.at, sh.col, { dur: 0, width: 0.13 * k, grow: 0.03, k: 2.0 })); // the two beams that hold on the drone until the answer lands
    } else if (gun === 0) { // it does not bite: each pair dies on the drone's face in a dull red fizzle, and the drone's ring goes red for a moment
      kit.fizzle(front, { size: 0.72 * ds + 0.05 * n }); // (large enough that its red cross and its falling sparks stand out round the letter)
      if (t) t.userData.refuse = 1;
      Sound.sfx("impact_reject", sh.side * 0.5, { vol: 0.5, rate: 1.1 - n * 0.08 });
    }
  }
  // a crack across a drone's ring, a chip off it, a jolt (n: which pair of bolts, or 3 and up as it shatters)
  crack(t, n) {
    if (!t) return;
    const u = t.userData, c = new THREE.Mesh(this.crackGeo, this.crackMat);
    c.rotation.z = (u.cracks || 0) * 2.2 + rand(0.4, 1.4); c.position.z = 0.34; c.renderOrder = 9;
    t.add(c);
    u.cracks = (u.cracks || 0) + 1; u.jolt = 1;
    this.kit.debris(t.position, { n: 2, size: 0.2 * t.scale.x, speed: 4, color: 0x4a4466, hot: SLOT_COLORS[u.slot], gravity: 0, life: 0.5, radius: 1.3 * t.scale.x });
  }
  // ---- a right answer lands (the rule: resolve) --------------------------------------------------------------
  right(i) {
    const g = this.g, kit = this.kit, t = g.targets[i], col = SLOT_COLORS[i], e = g.enemy;
    if (this.shot) this.shot.until = this.shot.time; // (the cannons' beams let go as the lance goes in)
    if (!t) return;
    const p = t.position.clone(), u = t.userData, s0 = t.scale.x, ds = clamp(s0 / 0.4, 0.8, 1.5);
    // the drone was a link in the demon's shield: its housing shatters (cracked through on this frame, in pieces over the next seven) ...
    for (let q = 0; q < 3; q++) this.crack(t, 3 + q);
    u.gone = true; u.shat = 0.001;
    kit.flash(p, 0xffffff, 0.14 * ds, 0.5 * ds, 0.08, 1, 1.6);
    kit.sparks(p, col, { n: 18, speed: 9 * ds, spread: 1.4, life: 0.4, len: 0.55 * ds, w: 0.05 * ds });
    kit.sparks(p, 0xffffff, { n: 6, speed: 13 * ds, life: 0.2, len: 0.7 * ds, w: 0.04 * ds, k: 1.9 });
    kit.debris(p, { n: 12, size: 0.4 * ds, speed: 7, color: 0x4a4466, hot: col, life: 0.7, gravity: 0, radius: 0.5 * ds });
    this.wave(p, null, 0.3, 0.3 * ds, 2.0 * ds, 0, col, 0.07, 1);
    kit.light(p, col, 2, 0.18, 8);
    g.show.add(0.12, (q) => { u.shat = Math.max(0.001, q); t.scale.setScalar(s0 * (1 + 0.3 * q)); u.frame.rotation.z += 0.09; }, () => { t.visible = false; });
    // ... and the shot goes on through it into the demon's core
    if (e && e.alive) { kit.beam(p, e.aimPoint(this._v), col, { dur: 0.17, width: 0.3 * (e.S / 6), grow: 0.03, k: 2.2 }); Sound.sfx("laser_heavy", g.panAt || 0, { vol: 0.7 }); } // (the lance: its own heavy crack)
    Sound.sfx("impact_good", g.panAt || 0);
    HudFX.reward(g.el, this.screen(p), "[data-score]", { n: 4, kind: "spark", color: col, clear: ".qpanel" }); // (round the question, never across it)
    g.show.wait(0.05, () => { GFX.ab = Math.min(GFX.ab, 0.6); }); // (the colours split for three frames, no longer: the picture is sharp while the blow is read)
  }
  // ---- a wrong answer lands (the rule: resolve), or none in time (timeout): a shield is owed ------------------
  wrong(i) {
    const g = this.g, t = g.targets[i];
    this.owe();
    if (!t) return;
    this.kit.fizzle(this.near(t.position, 1.5 * t.scale.x, this._v), { size: 0.8 * clamp(t.scale.x / 0.4, 0.8, 1.5) });
    t.userData.rejected = true; // (it locks out: its lamps go a dull red and it shrinks back. See the game's update.)
    Sound.sfx("impact_reject", g.panAt || 0, { vol: 0.9, rate: 0.85 });
  }
  timeout() { this.owe(); }
  owe() { this.debts.push({ t: 0 }); this.misses++; }

  // ---- the demon winds up and strikes -----------------------------------------------------------------------
  // (att: the overlord's own record of the strike: its kind, how far in it is, whether it has been let go)
  demonAttack(e, att) {
    const g = this.g, kit = this.kit, k = g.shipScale, kind = att.kind, ship = (v) => this.shipPos(v), COL = STAGE.COL[kind];
    this.endAttack();
    const a = (this.atk = { e, att, kind, col: COL, marks: [], released: false, n: 0, hit: false, dead: false, pending: null, acc: 0, beam: null, sd: e.twist > 0 ? 1 : -1 });
    // each strike has a marker of its own shape: a reticle for the plasma, a warning for the claws, a toothed ring for
    // the roar, an arc where the beam will sweep, chevrons closing in for the seekers
    const mark = (size, o) => a.marks.push(kit.mark(STAGE.MARK[kind], ship(this._v), COL, Object.assign({ size: size * k, dur: 0.75, follow: ship }, o)));
    if (kind === 0) mark(1.9);
    else if (kind === 1) mark(1.4, { follow: (v) => ship(v).add(this._w.set(0, 1.2 * k, 0)) });
    else if (kind === 2) mark(2.3);
    else if (kind === 3) { mark(3.0, { spin: 0, follow: (v) => ship(v).add(this._w.set(0, 0.35 * k, 0)) }); a.beam = kit.beam(e.aimPoint(this._v), this.sweepAt(a, 0, this._w), COL, { dur: 0, width: 0.07, k: 0.9, grow: 0.25 }); } // (and a thin line of sight from its core to where the sweep will start)
    else mark(2.1, { spin: 2.4 });
    // heard for exactly as long as it winds up: a hum that rises (runAttack) and is cut as the strike is let go; over
    // it, the first breath of the charge, and the strike's own warning. (Without the recordings: the synth's charge.)
    this.charge = Sound.loop("blaster-charge", "charge_hum", { vol: 0.3, rate: 0.9, fade: 0.06 });
    Sound.sfx(this.charge ? "charge_up" : kind === 2 || kind === 3 ? "charge_long" : "charge_up", 0, { vol: this.charge ? 0.6 : 0.8, rate: [1, 0.92, 0.8, 1.25, 1.1][kind] });
    if (kind === 1 || kind === 2 || kind === 3) Sound.sfx("warning", 0, { vol: 0.6, rate: [1, 1, 0.85, 1.2][kind] });
    else [0.04, 0.16].forEach((dl) => Sound.sfx("lock_on", 0, { vol: 0.55, delay: dl, rate: 1 + dl * 2 }));
  }
  // where the beam points as it sweeps across the fighter (u: 0 to 1)
  sweepAt(a, u, out) { const k = this.g.shipScale; return this.shipPos(out).add(this._u.set(a.sd * lerp(-2.4, 2.4, u) * k, (0.2 - 0.25 * Math.sin(u * Math.PI)) * k, 0)); }
  endAttack() {
    const a = this.atk;
    if (!a) return;
    a.marks.forEach((m) => { m.t = Math.min(m.t, 0.05); });
    if (a.beam) a.beam.stop();
    a.dead = a.dead || !a.hit; // (what is still in flight for it lands on the shell and does nothing)
    this.atk = null;
    if (this.charge) { Sound.stopLoop("blaster-charge", 0.06); this.charge = false; }
  }
  // its strike was broken by the fighter's shot (it had begun as the clock ran out, and the answer was right)
  demonFoiled(e) {
    const a = this.atk;
    if (a) { a.dead = true; [0, 1].forEach((i) => this.kit.sparks(e.claw(i, this._v), a.col, { n: 8, speed: 5, life: 0.4, gravity: 3 })); }
    this.endAttack();
  }
  runAttack(d) {
    const a = this.atk;
    if (!a) return;
    const g = this.g, kit = this.kit, e = a.e, A = a.att, GO = LORD.GO, k = g.shipScale, k6 = e.S / 6, quiet = REDUCED_MOTION || GFX.calm;
    if (e.att !== A) { if (a.pending && this.debts.length) this.strikeLands(a, a.pending); this.endAttack(); return; } // (over, or broken off)
    if (a.pending && this.debts.length) this.strikeLands(a, a.pending); // (it reached the fighter a frame before the rule took the shield: now it lands)
    const T = A.time;
    if (T < GO) { // winding up: what it gathers is drawn in to where it gathers
      a.acc += d;
      if (a.acc > 0.045 && !quiet) {
        a.acc = 0;
        const src = a.kind === 0 ? e.claw(Math.random() < 0.5 ? 0 : 1, this._v) : a.kind === 2 ? e.mouth(this._v) : a.kind === 3 ? e.aimPoint(this._v) : a.kind === 4 ? e.wingTip(Math.random() < 0.5 ? 0 : 1, this._v) : e.claw(a.sd > 0 ? 0 : 1, this._v);
        const off = this._w.set(rand(-1, 1), rand(-1, 1), rand(-0.4, 0.8)).normalize().multiplyScalar(1.3 * k6);
        kit.sparks(this._u.copy(src).add(off), a.col, { n: 1, speed: 1.3 * k6 / 0.24, dir: off.clone().multiplyScalar(-1).normalize(), spread: 0.08, life: 0.24, len: 0.5 * k6, w: 0.05 * k6, drag: 1 });
      }
      if (a.beam) a.beam.set(e.aimPoint(this._v), this.sweepAt(a, 0, this._w));
      if (this.charge) Sound.loopSet("blaster-charge", { rate: 0.9 + 0.9 * (T / GO), vol: 0.3 + 0.4 * (T / GO) });
      return;
    }
    const u = T - GO;
    if (!a.released) { // it lets go: the markers close, and (when there is time for it) the moment is held
      a.released = true;
      if (this.charge) { Sound.stopLoop("blaster-charge", 0.05); this.charge = false; }
      a.marks.forEach((m) => { m.t = Math.min(m.t, 0.08); });
      if (!A.early) VFX.slowMo(0.4, 0.14, 0.04);
      if (a.kind === 1) Sound.sfx("whoosh", 0, { vol: 0.8 });
      if (a.kind === 2) { // the roar: three thin rings of force from its mouth, down on the fighter and past it
        Sound.sfx("boss_roar", 0, { vol: 0.9, rate: 1.1 }); Sound.sfx("wave_fire", 0, { delay: 0.04 });
        const m = e.mouth(new THREE.Vector3()), to = this.shipPos(new THREE.Vector3()), dist = m.distanceTo(to);
        a.reach = LORD.FLY[2] * (dist / (dist + 3.2)); to.z += 3.2;
        for (let j = 0; j < 3; j++) this.wave(m, to, LORD.FLY[2], 0.6 * k6, (4.2 - j * 0.6) * k, j * 0.05, a.col, 0.075, 0.95);
        kit.sparks(m, a.col, { n: quiet ? 6 : 16, speed: 15 * k6, dir: this._w.subVectors(to, m).normalize(), spread: 0.4, life: 0.3, len: 0.9 * k6, w: 0.06 * k6 });
      }
      if (a.kind === 3) { Sound.sfx("beam_fire"); if (a.beam) a.beam.stop(); a.beam = kit.beam(e.aimPoint(this._v), this.sweepAt(a, 0, this._w), 0xff1030, { dur: 0, width: 1.25 * k, k: 1.5, grow: 0.05 }); } // (a beam with a body: a white core a dozen pixels across in a wide red halo)
      if (a.kind === 4) { Sound.sfx("missile_fire", -0.4); Sound.sfx("missile_fire", 0.4, { delay: 0.05, rate: 1.08 }); this.missiles.forEach((ms, j) => this.launch(ms, e, j, a)); }
    }
    if (a.kind === 0) { // a burst of plasma orbs, one claw then the other: each pops on the fighter's shell where it lands
      while (a.n < (quiet ? 2 : 5) && u >= a.n * 0.045) {
        const i = a.n % 2, n = a.n++, from = e.claw(i, new THREE.Vector3()), to = this.near(this.shipPos(this._u).add(this._v.set(rand(-1.1, 1.1), rand(-0.1, 0.6), rand(-0.3, 0.3)).multiplyScalar(k * (n ? 1 : 0.25))), 0.9 * k);
        kit.flash(from, a.col, 0.1 * k6, 0.4 * k6, 0.08, 0.9, 1.3); // (its claw already burns: a flick of light as each orb leaves it)
        this.orb(from, to, LORD.FLY[0], (p) => { if (n === 0 && !a.hit) this.strikeLands(a, from); this.pop(p, n % 2 ? 0x8feaff : 0xd9a0ff, 1.2); if (n) Sound.sfx("impact_shield", this.pan(p), { vol: 0.45 }); });
        e.recoil[i] = 1;
        Sound.sfx("plasma_fire", i ? -0.5 : 0.5, { vol: 0.7, rate: 1 + n * 0.03 });
      }
    } else if (a.kind === 1) { // the lunge: three claws raked across the fighter
      if (a.n === 0 && u >= 0.03) {
        a.n = 1;
        const c = this.shipPos(new THREE.Vector3());
        a.c = c;
        for (let j = -1; j <= 1; j++) this.streak(c.clone().add(this._v.set(a.sd * 2.4 * k, (1.4 + j * 0.4) * k, 0.2)), c.clone().add(this._w.set(-a.sd * 2.2 * k, (-0.9 + j * 0.4) * k, 0.5)), a.col, 0.08, 0.2 * k);
        a.from = c.clone().add(this._v.set(a.sd * 2.4 * k, 1.4 * k, 0));
      }
      if (a.n === 1 && u >= LORD.FLY[1]) { a.n = 2; this.strikeLands(a, a.from); Sound.sfx("slam", 0, { vol: 0.9 }); } // the claws go through
    } else if (a.kind === 2) { // the first ring of force is on the fighter
      if (!a.hit && !a.pending && u >= (a.reach || 0.2)) this.strikeLands(a, e.mouth(this._v));
    } else if (a.kind === 3) { // the beam sweeps across the fighter, scorching what it crosses, and bites as it passes the middle
      const su = clamp(u / 0.3, 0, 1), from = e.aimPoint(new THREE.Vector3()), end = this.sweepAt(a, su, new THREE.Vector3());
      if (a.beam) { if (u < 0.34) a.beam.set(from, end); else { a.beam.stop(); a.beam = null; } }
      if (u < 0.32 && (a.acc += d) > 0.02) { // scorch sparks along its length, light where it falls
        a.acc = 0;
        kit.sparks(this._v.lerpVectors(from, end, rand(0.15, 0.95)), 0xff6a4a, { n: 2, speed: 4, life: 0.28, gravity: 0, len: 0.4, w: 0.05, k: 1.6 });
        kit.sparks(end, 0xffb09a, { n: 2, speed: 7 * k, life: 0.3, gravity: 4, len: 0.5 * k, w: 0.05 * k });
        kit.light(end, 0xff2a2a, 5, 0.05, 6);
        if (g.jet.lit) g.jet.lit(0xff2a2a, 0.8);
      }
      if (!a.hit && !a.pending && su >= 0.5) { a.at0 = this.sweepAt(a, 0.12, new THREE.Vector3()); a.at1 = this.sweepAt(a, 0.88, new THREE.Vector3()); this.strikeLands(a, from); }
    }
  }
  // a seeker leaves a wing blade, swings wide and comes in on the fighter
  launch(ms, e, j, a) {
    const g = this.g, k = g.shipScale, sd = j % 2 ? -1 : 1;
    e.wingBlade(j, ms.a);
    this.near(this.shipPos(ms.c).add(this._v.set(sd * (0.5 + (j >> 1) * 0.7), 0.1 + (j >> 1) * 0.35, 0).multiplyScalar(k)), 0.7 * k, ms.c); // (each to its own place on the shell)
    ms.b.copy(ms.a).lerp(ms.c, 0.5).add(this._v.set(sd * (2.6 + (j >> 1) * 1.3), 0.9 - (j >> 1) * 1.9, 1.5)); // (it swings out to its own side, high or low)
    ms.t = -(j >> 1) * 0.05 - j * 0.012 - 1e-4; ms.dur = LORD.FLY[4]; ms.atk = a; ms.j = j;
    ms.sp.visible = false;
    ms.tail.pts = []; ms.tail.width = 0.085 * k; ms.tail.mesh.visible = false; ms.out = 0; ms.acc = 0;
  }
  // the strike reaches the fighter: now the shield is seen to go. (A strike let go as the clock ran out can be on the
  // fighter a frame before the rule has taken the shield: it lands when it has. If the answer came in time instead,
  // the strike was broken and what is left of it does nothing.)
  strikeLands(a, from) {
    if (a.hit || a.dead) return;
    if (!this.debts.length) { a.pending = from || this._up; return; }
    a.pending = null; a.hit = true;
    this.playerHit(from === this._up ? null : from, a.kind, a);
  }
  // ---- the fighter is hit: the shield that the rules took is seen to go --------------------------------------
  playerHit(from, kind, a) {
    const g = this.g, kit = this.kit, k = g.shipScale, p = this.shipPos(new THREE.Vector3()), quiet = REDUCED_MOTION || GFX.calm;
    if (this.debts.length) this.debts.shift();
    const left = g.shields + this.debts.length, hard = clamp((3 - left) / 3, 0.34, 1), sd = from ? (from.x < p.x ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;
    if (g.jet.shieldLost) g.jet.shieldLost({ x: -sd }, kind);
    // the HUD: the shield that went breaks, the bar flickers and cracks, the ship cannot be hit again for a moment
    g.lives(left, 3);
    HudFX.lifeLost(g.el);
    HudFX.hurt(g.el, hard);
    HudFX.blink(g.el, 750);
    // the picture: the band's edge flashes red (its middle, and the answers' letters, are left alone), the colours
    // split for three frames, a shake by how much is left
    this.hitK = 1;
    GFX.glitch(0.2 + 0.25 * hard, 0.06);
    GFX.pulse(1.6 + 2 * hard, 0);
    g.shake(0.07 + 0.08 * hard);
    g.show.wait(0.05, () => { GFX.ab = Math.min(GFX.ab, 0.7); GFX.punch = Math.min(GFX.punch, 0.002); });
    VFX.hitStop(2);
    Haptics.buzz([60, 40, 90]);
    // where it landed on the shell: sparks, shards of the shield, a breath of dark smoke; then what this strike leaves
    const at = this.near(p.clone().add(this._v.set(sd * 0.7 * k, 0.35 * k, 0)), 0.8 * k);
    // the shield itself comes up before the fighter on the side the blow fell, cracks, and breaks apart (its sound is
    // the shield_down below)
    if (g.iconFX) g.iconFX.shatter("shield", this.near(p.clone().add(this._v.set(sd * 0.5 * k, 0.62 * k, 0)), 1.4 * k), { size: 0.9 * k, face: g.camera, turn: -sd * 0.35, hold: 0.06, crack: 0.06, onBreak: (q) => kit.sparks(q, 0x8feaff, { n: quiet ? 6 : 14, speed: 7 * k, life: 0.4, len: 0.45 * k, w: 0.045 * k, k: 1.7 }) });
    kit.sparks(at, 0xffffff, { n: 12, speed: 9 * k, life: 0.35, len: 0.7 * k, w: 0.05 * k, k: 1.8 });
    kit.debris(at, { n: quiet ? 4 : 9, size: 0.28 * k, speed: 7 * k, color: 0x1c7a90, hot: 0x8feaff, gravity: 0, life: 0.8 });
    if (!quiet) for (let i = 0; i < 2; i++) kit.smoke(this._w.set(rand(-0.5, 0.5), rand(0, 0.4), 0).multiplyScalar(k).add(at), { size: 0.45 * k, life: 0.7, a: 0.45, cold: true, color: STAGE.SMOKE, vel: this._u.set(0, -0.3, 2.5) });
    if (kind === 1 && a && a.c) { // the claws: three gashes cut across the shell, sparks along each
      for (let j = -1; j <= 1; j++) { const g0 = this.near(a.c.clone().add(this._v.set(a.sd * 1.5 * k, (0.95 + j * 0.36) * k, 0)), 0.9 * k), g1 = this.near(a.c.clone().add(this._v.set(-a.sd * 1.4 * k, (-0.45 + j * 0.36) * k, 0)), 0.9 * k); this.gash(g0, g1, 0xff5a6a, 0.34, 0.07 * k); kit.sparks(this._v.lerpVectors(g0, g1, 0.5), 0xff8a8a, { n: 5, speed: 5 * k, life: 0.3, len: 0.4 * k, w: 0.04 * k, gravity: 3 }); }
    } else if (kind === 2) { // the roar: the shell ripples and the fighter is pushed back
      if (g.jet.shove) g.jet.shove(1);
      for (let j = 0; j < 2; j++) this.wave(this.near(p, 0.9 * k), null, 0.34, 0.5 * k, (2.3 + j * 0.5) * k, j * 0.09, 0x8feaff, 0.05, 0.9);
    } else if (kind === 3 && a && a.at0) { // the beam: a line burnt across the shell, molten drips falling from it
      const b0 = this.near(a.at0, 0.9 * k), b1 = this.near(a.at1, 0.9 * k);
      this.gash(b0, b1, 0xffb070, 0.55, 0.09 * k, 1.5);
      for (let j = 0; j < 3; j++) g.show.wait(j * 0.09, () => { if (!g.unmounted) kit.sparks(this._v.lerpVectors(b0, b1, rand(0.1, 0.9)), 0xffa050, { n: 4, speed: 1.5, life: 0.5, len: 0.3 * k, w: 0.05 * k, gravity: 7, k: 1.6 }); });
    } else if (kind < 0) this.pop(at, 0xff6a8a, 1.6);
    Sound.sfx("player_hit", sd * 0.3);
    Sound.sfx("shield_down", 0, { delay: 0.09, vol: 0.9 });
    if (left === 2) Sound.say("SHIELD DOWN"); else if (left === 1) Sound.say("LAST SHIELD"); else if (left <= 0) Sound.say("CRITICAL");
    this.setLow(left <= 0 ? 2 : left === 1 ? 1 : 0);
  }
  // ---- one shield left -------------------------------------------------------------------------------------
  // on: 0 (or false) no; 1 (or true) one shield left: the red frame beats, the alarm sounds, the hurt engine burns;
  // 2 none left: the frame holds, the alarm has gone quiet with everything else, the fire is worse
  setLow(on) {
    const g = this.g;
    on = on === true ? 1 : on || 0;
    if (on === this.low) return;
    this.low = on;
    GFX.setDanger(on === 2 ? 1 : on ? 0.72 : 0);
    HudFX.low(g.el, !!on);
    if (on === 1) { this.alarmOn(); this.lowT = 0; } else { Sound.stopLoop("blaster-alarm", 0.3); this.alarm = false; }
    this.flame.pts = [];
  }

  // ---- the demon is hurt ---------------------------------------------------------------------------------------
  demonArrive(e) {
    this.leaks.forEach((t) => { t.on = false; }); this.leaks.length = 0;
    this.escort.gather(); // its brood gather far off as it comes up out of the distance
    if (!this.incoming) { // the first, once a run: called after the wave (one line at a time: see Sound.say)
      this.incoming = true;
      this.g.show.wait(0.05, () => { if (!this.g.unmounted && this.g.state !== "over") Sound.say("BOSS INCOMING"); });
    }
  }
  // the lance lands on its core (the rule: resolve, a right answer): a small hot heart, tongues of fire in the
  // answer's colour, long streaks, a ring; the demon is seen taking it
  demonHit(e, p, color, staggered) {
    const g = this.g, kit = this.kit, k6 = e.S / 6;
    // (its core is a rift: the blow shows as a slit of white light down it, a small heart in the answer's colour and a
    // tongue of fire to each side. The torso is never hidden behind a ball of light.)
    this.gash(this._v.set(0, 0.4 * k6, 0.12).add(p), this._w.set(0, -0.4 * k6, 0.12).add(p), 0xffffff, 0.1, 0.09 * k6, 1.5);
    kit.flash(p, color, 0.12 * k6, 0.46 * k6, 0.1, 0.7, 1.2);
    for (const sd of [-1, 1]) kit.fire(this._v.set(sd * 0.16 * k6, 0, 0.1).add(p), { size: 0.32 * k6, life: 0.22, vel: this._w.set(sd * 3 * k6, 0.4, 0), rise: 0, color, k: 0.7 });
    kit.sparks(p, 0xffffff, { n: 8, speed: 20 * k6, life: 0.26, len: 1.4 * k6, w: 0.05 * k6, k: 1.7 });
    kit.sparks(p, color, { n: 12, speed: 12 * k6, spread: 1.4, life: 0.45, len: 0.9 * k6, w: 0.07 * k6, k: 1.6 });
    kit.embers(p, color, { n: 8, radius: 0.5 * k6, life: 1.1 });
    this.wave(p, null, 0.42, 0.5 * k6, 6.5 * k6, 0, color, 0.06, 0.9); // (a thin ring, clear inside)
    GFX.ripple(g.camera, p, 0.6, 0.4);
    kit.light(p, color, 1.6 * k6, 0.22, 14 * k6);
    GFX.bloomPulse(0.25);
    g.shake(0.1 * k6);
    kit.debris(p, { n: staggered ? 9 : 4, size: 0.5 * k6, speed: 8 * k6, color: STAGE.WRECK, hot: color, dir: this._v.set(0, 0.2, 1), spread: 1.2, gravity: 0, life: 0.8 });
    VFX.hitStop(3);
    Sound.sfx("impact_big", 0, { vol: 0.85 });
    Sound.sfx(staggered ? "boss_stagger" : "boss_hurt", 0, { vol: 0.75, delay: 0.05 });
  }
  // a wound opens in its armour: a tight burst of sparks where the plate goes, and from now on that place leaks
  demonWound(e, i) {
    const kit = this.kit, k6 = e.S / 6, W = e.wounds3[i], p = e.at(W, new THREE.Vector3());
    kit.flash(p, 0xffffff, 0.1 * k6, 0.36 * k6, 0.08, 1, 1.5);
    kit.sparks(p, 0xffb8d8, { n: 14, speed: 9 * k6, life: 0.4, len: 0.6 * k6, w: 0.05 * k6 });
    kit.debris(p, { n: 6, size: 0.42 * k6, speed: 7 * k6, color: STAGE.WRECK, hot: 0xff5a8a, gravity: 0, life: 0.7 });
    Sound.sfx("boss_break", this.pan(p), { vol: 0.7, delay: 0.04 });
    if (!(REDUCED_MOTION || GFX.calm)) this.leaks.push(kit.trailer((v) => (e.root.visible && !e.blown ? e.at(W, v) : null), { smoke: 0.3, fire: 0.1, sparks: 0.8, rate: 7, size: 0.26 * k6, vel: new THREE.Vector3(0, 0.5, 0.8), life: 0.55, color: 0xff6a8a, a: 0.3 })); // (sparks and a thread of smoke: it is seen through them)
  }
  // a part of it is shot away (its tail, a wing): thrown clear on the frame of the blow, spinning, sparks trailing
  // from it; a small blast where it was torn off, and the stump burns
  demonShed(e, p, name, scrap) {
    const g = this.g, kit = this.kit, k6 = e.S / 6;
    // (the part itself goes on the frame of the blow; the small blast where it was torn off, three frames on, so the
    // two are not one mass of light)
    kit.sparks(p, 0xffb8d8, { n: 8, speed: 9 * k6, life: 0.3, len: 0.6 * k6, w: 0.05 * k6, k: 1.6 });
    Sound.sfx("boss_break", this.pan(p), { vol: 0.8 });
    g.show.wait(0.05, () => { if (g.unmounted) return; kit.explosion(p, { size: 0.32 * k6, color: 0xff4a9a, shake: false, smoke: false, debrisLife: 0.6 }); g.shake(0.1); Sound.sfx("explosion_small", this.pan(p)); });
    if (scrap) { const tr = kit.trailer((v) => (scrap.t < scrap.life * 0.85 ? scrap.j.getWorldPosition(v) : null), { smoke: 0, fire: 0, sparks: 1, rate: 40, size: 0.3 * k6, life: 0.3, color: 0xff7ab8 }); g.show.wait(scrap.life, () => { tr.on = false; }); }
    if (!(REDUCED_MOTION || GFX.calm)) this.leaks.push(kit.trailer((v) => (e.root.visible && !e.blown ? e.stump(name, v) : null), { smoke: 0.45, fire: 0.4, sparks: 0.7, rate: 10, size: 0.34 * k6, vel: new THREE.Vector3(0, 0.5, 1.0), life: 0.6, a: 0.35, color: 0xff6a8a }));
  }
  // something shorts in one of its wounds
  demonLeak(e, p) { this.kit.sparks(p, 0xff7ab0, { n: 10, speed: 5 * (e.S / 6), life: 0.45, len: 0.5, gravity: 2 }); }
  // it arrives: wings wide, and roars
  demonRoar(e) {
    const m = e.mouth(new THREE.Vector3());
    Sound.sfx("boss_roar", 0, { vol: 0.9 });
    if (!(REDUCED_MOTION || GFX.calm)) { this.wave(m, null, 0.7, 0.4 * (e.S / 6), 4.5 * (e.S / 6), 0, 0xd050ff, 0.03, 0.9); this.g.shake(0.1); }
  }
  // the wave's last three questions: it rages
  demonRage(e) {
    const g = this.g, quiet = REDUCED_MOTION || GFX.calm;
    Sound.sfx("boss_roar", 0, { vol: 0.9, rate: 0.9 });
    Sound.sfx("warning", 0, { vol: 0.7, delay: 0.25 });
    Sound.say("WARNING");
    this.wave(e.aimPoint(this._v), null, 0.6, 0.6 * (e.S / 6), 6 * (e.S / 6), 0, 0xff2a40, 0.03, 0.9);
    this.kit.sparks(e.aimPoint(this._v), 0xff3a5a, { n: quiet ? 8 : 26, speed: 6, life: 0.9, gravity: 1.2 });
    if (!quiet) g.shake(0.12);
  }
  demonGloat(e) { Sound.sfx("boss_roar", 0, { vol: 0.9, rate: 0.8 }); }
  // ---- the demon dies (the rule: after, the wave's last question) -------------------------------------------
  // The fighter's last burst goes into its core, and that is what ends it: a beat of slow motion as the first bolts
  // land, then what is left of it comes apart in a quick chain and the last blast. All of it is over before the next
  // question's drones appear. (After the wave's last right answer it has been coming apart already: see demonChain.)
  demonDeath(e) {
    const g = this.g, kit = this.kit, k = g.shipScale, k6 = e.S / 6, col = 0xbfe8ff, quiet = REDUCED_MOTION || GFX.calm;
    this.endAttack();
    this.aimQ.setFromRotationMatrix(this._m.lookAt(g.ship.position, e.aimPoint(this._v), this._up)).slerp(this._q.set(0, 0, 0, 1), 0.45);
    this.aimT = 0.45;
    for (let n = 0; n < 3; n++) g.show.wait(n * 0.045, () => {
      if (g.unmounted) return;
      for (let gun = 0; gun < 2; gun++) {
        const from = this.muzzle(gun, new THREE.Vector3()), to = e.aimPoint(new THREE.Vector3()).add(this._v.set((gun ? 0.1 : -0.1) * (1 + n), rand(-0.1, 0.1), 0.25 * k6)), dir = this._w.subVectors(to, from).normalize();
        kit.muzzle(from, dir, col, 0.4 * k);
        kit.bolt(from, to, col, { dur: 0.08, width: 0.2 * k, len: 3.6 * k, onHit: (p) => {
          kit.flash(p, 0xffffff, 0.1 * k6, 0.36 * k6, 0.07, 1, 1.5);
          kit.sparks(p, col, { n: quiet ? 5 : 12, speed: 11 * k6, life: 0.3, len: 0.8 * k6, w: 0.06 * k6 });
          if (gun === 0) Sound.sfx("impact_big", 0, { vol: 0.6, rate: 1.05 + n * 0.08 });
          if (n === 0 && gun === 0) { VFX.slowMo(0.4, 0.2, 0.07); Sound.sfx("slowmo_in", 0, { vol: 0.5 }); Sound.sfx("boss_death", 0, { vol: 0.9 }); e.flash = 0.6; e.flashCol.setRGB(0.8, 0.95, 1); }
        } });
        if (g.jet.fire) g.jet.fire(col, true, g.jet.model ? gun : undefined);
      }
      Sound.sfx("laser_fire", 0, { vol: 0.8, rate: 1 + n * 0.06 });
    });
  }
  // a part of it comes away in a blast (one link of the chain: while it hangs there done for, or as it dies)
  demonChain(e, p, i) {
    const g = this.g, kit = this.kit, k6 = e.S / 6;
    if (REDUCED_MOTION || GFX.calm) { kit.sparks(p, 0xffd8f0, { n: 14, speed: 10 * k6, life: 0.5, len: 0.7 * k6 }); kit.debris(p, { n: 5, size: 0.6 * k6, speed: 8 * k6, color: STAGE.WRECK, gravity: 0, life: 0.6 }); } // (with Reduced effects: sparks and wreckage, no run of flashes)
    else kit.explosion(p, { size: (0.5 + 0.04 * i) * k6, color: i % 2 ? 0xff4a9a : g.waveCol.getHex(), shake: false, ring: i % 2 === 0, smoke: false, debrisLife: 0.55 });
    g.shake(0.08 + 0.015 * i);
    Sound.sfx("explosion_small", this.pan(p), { rate: 0.95 + i * 0.06 });
  }
  // the last blast
  demonBlast(e, p) {
    const g = this.g, kit = this.kit, k6 = e.S / 6, col = g.waveCol.getHex(), quiet = REDUCED_MOTION || GFX.calm;
    this.leaks.forEach((t) => { t.on = false; }); this.leaks.length = 0;
    kit.explosion(p, { size: 1.0 * k6, color: col, shake: false, debrisLife: 0.5 });
    kit.sparks(p, 0xffffff, { n: quiet ? 8 : 14, speed: 30 * k6, life: 0.5, len: 2.0 * k6, w: 0.07 * k6, k: 1.9 }); // (long white streaks thrown clear: the blast's size is in these, its rings and its wreckage)
    kit.debris(p, { n: quiet ? 6 : 14, size: 0.8 * k6, speed: 15 * k6, color: STAGE.WRECK, hot: col, gravity: 0, life: 0.5 });
    this.wave(p, null, 0.5, 0.8 * k6, 9 * k6, 0, 0xffffff, 0.02, 0.9);
    this.wave(p, null, 0.6, 0.8 * k6, 12 * k6, 0.08, col, 0.02, 0.9);
    GFX.ripple(g.camera, p, 1, 0.6); // the picture itself bends as the shock passes
    VFX.hitStop(3);
    GFX.pulse(2.5, 0);
    g.shake(0.16);
    Sound.setIntensity(3);
    Sound.sfx("explosion_huge");
    Sound.sfx("debris", 0, { delay: 0.3, vol: 0.8 });
    this.escort.scatter(); // its brood scatter into the nebula; a moment later allies cross the band
    this.escort.pass();
    // the reward: stars and coins fly from the blast, round the question, to the score. They have landed before the
    // next question's drones appear.
    const from = this.screen(p), perfect = this.misses === 0, high = e.finale, wave = this.sayWave;
    g.show.wait(0.05, () => {
      if (g.unmounted) return;
      HudFX.reward(g.el, from, "[data-score]", { n: 8, kind: "star", color: COLORS.yellow, clear: ".qpanel", dur: 400, gap: 12 });
      HudFX.reward(g.el, from, "[data-score]", { n: 5, kind: "coin", color: COLORS.gold, clear: ".qpanel", dur: 430, gap: 12 });
      if (g.iconFX) g.iconFX.burst("star", p, { n: 7, size: 0.75 * k6, speed: 11 * k6, dir: this._v.copy(g.camera.position).sub(p).normalize().add(this._w.set(0, 0.55, 0)).normalize(), life: 1.0, gravity: 4 * k6, gap: 0.03 }); // (gold stars thrown out of the blast with the coins)
      Sound.sfx("reward", 0, { vol: 0.9 });
    });
    if (wave) g.show.wait(0.4, () => { if (!g.unmounted && g.state !== "over") Sound.say(wave); }); // (the next wave is called once this one's demon has gone)
    if (high || perfect) g.show.wait(2.2, () => { if (!g.unmounted && g.state !== "over") Sound.say(high ? "NEW HIGH SCORE" : "PERFECT"); });
    this.misses = 0; this.sayWave = null;
  }
  // ---- between waves: the warp, held back until the demon has gone up (look only) -----------------------------
  // region: the part of space the next wave starts in (it comes up with the warp); call: what the announcer says
  // once the demon has gone
  // (the wave that takes the run to the wormhole gate, the journey's last region before the warp back, is called
  // "FINAL WAVE" in place of its number)
  waveEnd(region, call) {
    const nr = this.g.space && this.g.space.regions ? this.g.space.regions.length : 6;
    if (call && (region + 1) % nr === nr - 1) call = "FINAL WAVE";
    const e = this.g.enemy; this.region = region; this.sayWave = call || null; this.warpAt = e && e.dieT >= 0 ? e.blowAt + 0.07 : 0.02; if (!(e && e.dieT >= 0) && call) { Sound.say(call); this.sayWave = null; } }
  // ---- the run ends: the last shield has gone, and the ship with it ---------------------------------------------
  // (the sounds of it one after another, each with its picture: the blast now, the call, the demon's roar as it
  // spreads its wings over the wreck, the jingle)
  over() {
    const g = this.g, kit = this.kit, k = g.shipScale, p = this.shipPos(new THREE.Vector3());
    this.debts.length = 0;
    g.lives(g.shields, 3);
    this.endAttack();
    this.setLow(0);
    this.loops(false);
    kit.explosion(p, { size: 0.95 * k, color: 0x6fd0ff, debrisColor: 0x23232e }); // (close to the lens: a blast of this size, and the ship is still seen to come apart behind it)
    Sound.sfx("explosion_big");
    g.show.wait(0.35, () => { if (!g.unmounted) Sound.say("GAME OVER"); });
    g.show.wait(0.42, () => { if (g.unmounted) return; const q = p.clone().add(this._v.set(rand(-0.8, 0.8) * k, 0.2 * k, 0.6 * k)); kit.explosion(q, { size: 0.55 * k, color: 0xff7ab8, ring: false }); Sound.sfx("explosion_small", 0, { rate: 0.9 }); }); // a tank goes, a moment after the rest
    g.show.wait(1.2, () => { if (!g.unmounted) Sound.sfx("gameover"); });
  }

  update(dt, sp, w) {
    const g = this.g, d = VFX.dt, kit = this.kit, ship = g.ship, k = g.shipScale, quiet = REDUCED_MOTION || GFX.calm;
    kit.drift.set(0, 0, Math.min(sp * 0.3, 3.5)); // (what is left behind falls behind: slowly enough that a blast stays where it was struck)
    this.escort.update(d);
    // ---- the fighter's aim: toward its target for a moment after it fires, back to its hover otherwise
    this.aimT = Math.max(0, this.aimT - d);
    this.idleQ.setFromEuler(this._e.set(Math.sin(VFX.t) * 0.05, 0, Math.sin(VFX.t * 0.9) * 0.12));
    if (g.state !== "over") ship.quaternion.slerp(this.aimT > 0 ? this.aimQ : this.idleQ, 1 - Math.exp(-d * (this.aimT > 0 ? 26 : 7)));
    // ---- the burst: three volleys, then the beams hold until the answer has landed
    const sh = this.shot;
    if (sh) {
      sh.time += d;
      while (sh.n < (quiet ? 1 : 3) && sh.time >= sh.n * 0.065) { this.volley(sh); sh.n++; } // (with Reduced effects: one volley, not three in a row)
      if (sh.beams) sh.beams.forEach((b, q) => b.set(this.muzzle(q, this._v), sh.at));
      if (sh.time > sh.until || sh.time > 0.9) { if (sh.beams) sh.beams.forEach((b) => b.stop()); this.shot = null; }
    }
    this.runAttack(d);
    // ---- rings, orbs and seekers in flight
    for (const wv of this.waves) {
      if (!wv.live) continue;
      wv.t = wv.t < 0 ? Math.min(0, wv.t + d) : wv.t + d;
      if (wv.t < 0) { wv.m.visible = false; continue; }
      const u = Math.min(1, wv.t / wv.dur);
      wv.m.visible = u < 1;
      if (u >= 1) { wv.live = false; wv.t = -1; continue; }
      const sc = lerp(wv.s0, wv.s1, Math.pow(u, 0.8));
      wv.m.position.lerpVectors(wv.from, wv.to, u);
      wv.m.quaternion.copy(g.camera.quaternion);
      wv.m.scale.setScalar(sc);
      wv.m.material.uniforms.uW.value = clamp(wv.w / sc, 0.006, 0.4); // (as thick on the screen at every size: a line, not a band)
      wv.m.material.uniforms.uK.value = Math.min(1, u * 10) * (1 - smoothstep(0.7, 1, u));
    }
    for (const o of this.orbs) {
      if (o.t < 0) continue;
      o.t += d;
      const u = Math.min(1, o.t / o.dur);
      o.sp.visible = true;
      o.sp.position.lerpVectors(o.a, o.b, u);
      o.sp.scale.setScalar(0.52 * k * (0.92 + 0.08 * Math.sin(VFX.t * 30)));
      if (d > 0 && !quiet) kit.sparks(o.sp.position, 0xc060ff, { n: 1, speed: 0.6, life: 0.16, len: 0.5 * k, w: 0.07 * k, dir: this._v.subVectors(o.a, o.b).normalize(), spread: 0.1, k: 1.3 }); // (a short tail behind it)
      if (u >= 1) { o.t = -1; o.sp.visible = false; const f = o.hit; o.hit = null; if (f) f(o.b); }
    }
    for (const ms of this.missiles) {
      if (ms.t === -1) continue;
      ms.t = ms.t < 0 ? Math.min(0, ms.t + d) : ms.t + d;
      if (ms.t < 0) continue;
      const u = Math.min(1, ms.t / ms.dur), v = 1 - u;
      ms.p.set(v * v * ms.a.x + 2 * v * u * ms.b.x + u * u * ms.c.x, v * v * ms.a.y + 2 * v * u * ms.b.y + u * u * ms.c.y, v * v * ms.a.z + 2 * v * u * ms.b.z + u * u * ms.c.z);
      ms.sp.visible = true;
      ms.sp.position.copy(ms.p);
      ms.sp.scale.setScalar(0.3 * k * (0.9 + 0.1 * Math.sin(VFX.t * 40)));
      if (d > 0) { ms.tail.mesh.visible = true; ms.tail.push(ms.p); } // a ribbon of fire behind it, and sparks shed along the way
      if ((ms.acc += d) > 0.035) { ms.acc = 0; kit.sparks(ms.p, 0xffc070, { n: 1, speed: 1.6, life: 0.3, len: 0.3 * k, w: 0.04 * k, gravity: 0 }); }
      if (u >= 1) { // each lands at its own place on the shell, a few frames after the last: a small shaped blast
        ms.t = -1; ms.sp.visible = false; ms.out = 0.2;
        kit.explosion(ms.p, { size: 0.26 * k, color: 0xffa030, ring: false, shake: false, debris: false, smoke: ms.j === 3, smokeColor: STAGE.SMOKE });
        this.wave(ms.p, null, 0.22, 0.15 * k, 0.8 * k, 0, 0xffc070, 0.05, 0.85);
        Sound.sfx("missile_hit", this.pan(ms.p), { vol: 0.8 });
        if (ms.atk) this.strikeLands(ms.atk, ms.a);
      }
    }
    for (const ms of this.missiles) if (ms.t === -1 && ms.out > 0) { ms.out -= d; if (d > 0) ms.tail.push(ms.p); if (ms.out <= 0) ms.tail.mesh.visible = false; } // (its ribbon runs in to where it struck, and is gone)
    // ---- a shield owed is always seen to go: if no strike lands for it, it goes on its own
    for (let i = this.debts.length - 1; i >= 0; i--) if ((this.debts[i].t += d) > 1.7) { this.debts.splice(i, 1); this.debts.unshift({ t: 0 }); this.playerHit(null, -1); break; }
    // ---- the warp between waves, when the demon's blast has passed
    if (this.warpAt >= 0 && (this.warpAt -= d) < 0) {
      this.warpAt = -1;
      g.warp = g.warpDur = 0.9; // (over before the next question comes up)
      if (this.region !== undefined) g.space.setRegion(this.region, 1.8);
      if (g.jet.warp) g.jet.warp();
      if (g.jet.shieldUp) g.jet.shieldUp();
      Sound.sfx("warp", 0, { vol: 0.8 });
      this.setLow(g.shields + this.debts.length === 1 ? 1 : 0);
    }
    // ---- the band's edge: a red flash as a shield goes; with one shield left a red frame that swells once with each
    // tone of the alarm (two to its loop of 2.25 s), counted on the alarm's own clock, or stands still with Reduced
    // effects; with no shield left it holds.
    this.hitK = Math.max(0, this.hitK - d * 3.4);
    this.lowK += ((this.low && g.state !== "over" ? 1 : 0) - this.lowK) * Math.min(1, d * 5);
    this.alarmGame += dt;
    const fk = this.hitK * this.hitK;
    if (this.lowK > 0.01 || fk > 0.01) {
      const cam = g.camera, b = g.bandSize(6);
      // (the alarm's clock is the sound's own when it runs with the game's; in a capture, or behind a stalled tab, the game's)
      const at = this.alarm && Sound.ctx ? Sound.ctx.currentTime - this.alarmAt : this.alarmGame, ph = (Math.abs(at - this.alarmGame) < 0.2 ? at : this.alarmGame) / 1.125;
      const beat = quiet || this.low === 2 ? 0.7 : 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
      this.frame.visible = true;
      this.frame.position.copy(cam.position).add(this._v.set(0, 0, -6).applyQuaternion(cam.quaternion));
      this.frame.quaternion.copy(cam.quaternion);
      this.frame.scale.set(b.w * 1.5, b.h * 1.5, 1);
      this.frameU.uK.value = fk;
      this.edge.set(this.lowK, beat);
    } else { this.frame.visible = false; this.edge.set(0, 0); }
    // ---- the hurt hull burns: a ribbon of flame and puffs of dark smoke that trail down the screen
    if (this.low && g.state !== "over" && !quiet) {
      const n = this.hurt(this._v), fl = this.flame, hot = this.low === 2 ? 1.5 : 1;
      fl.mesh.visible = true; fl.width = 0.22 * k * hot;
      // (Phase 6: from a breach on its back that the lens sees, see hurt(); the flame, the fire and the smoke stay on the
      // skin and stream back along it toward the lens, where they used to be thrown down into the hull and hidden)
      if (d > 0) { fl.shift(Math.sin(VFX.t * 17) * 0.006 * k, 0.004 * k * hot, 0.07 * k); fl.push(this._w.copy(n).add(this._u.set(Math.sin(VFX.t * 31) * 0.02 * k, 0.02 * k, 0))); }
      if ((this.smokeT -= d) <= 0) { this.smokeT = 0.09 / hot; kit.smoke(this._w.copy(n).add(this._u.set(rand(-0.06, 0.06) * k, 0.07 * k, 0.1 * k)), { size: 0.42 * k * hot, life: 0.8, a: 0.75, cold: true, color: 0x140f1c, rise: 0.25, vel: this._u.set(rand(-0.25, 0.25), 0.2, 1.5) }); /* (dark against the lit plates) */
        kit.fire(this._w.copy(n).add(this._u.set(rand(-0.05, 0.05) * k, 0.03 * k, 0.03 * k)), { size: 0.32 * k * hot, life: 0.3, rise: 0.35, k: 1.1 }); /* flames lick over the breach */ kit.sparks(n, 0xffb060, { n: 1, speed: 2.5, life: 0.35, len: 0.25 * k, w: 0.04 * k, gravity: 5, dir: this._u.set(0, 0.5, 1), spread: 0.5, k: 1.5 }); }
    } else this.flame.mesh.visible = false;
    // ---- sound that follows the game: the engines with the streak and the warp (wavering when one is hurt);
    // without a recording, the alarm as a pip
    const heat = g.jet.heat || 0, sput = this.low ? 0.93 + 0.05 * Math.sin(VFX.t * 9) * Math.sin(VFX.t * 2.3) : 1;
    if (this.engine) Sound.loopSet("blaster-engine", { rate: (0.85 + heat * 0.3 + w * 0.5) * sput, vol: 0.26 + heat * 0.1 + w * 0.22 }); else Sound.rev((0.5 + heat * 0.45 + w * 0.5) * sput);
    if (this.low === 1 && !this.alarm && (this.lowT -= d) <= 0) { this.lowT = 1.125; Sound.sfx("alarm", 0, { vol: 0.6 }); }
    if (this.low && g.state === "over") this.setLow(0);
    // the music holds its upper layers through the wave's last three questions (its rage), whatever the streak
    if (g.enemy.rageOn && g.state !== "over" && Sound.intensity < 2) Sound.setIntensity(2);
  }
  dispose() {
    this.loops(false);
    GFX.setDanger(0);
    HudFX.low(this.g.el, false);
    this.kit.dispose();
    this.edge.dispose();
    this.waves.forEach((w) => { w.m.material.dispose(); });
    this.waves[0].m.geometry.dispose();
    this.missiles.forEach((m) => { m.sp.material.dispose(); m.tail.mesh.geometry.dispose(); m.tail.mesh.material.dispose(); });
    this.orbs.forEach((o) => o.sp.material.dispose());
    this.orbTex.dispose();
    [this.frame, this.flame.mesh].forEach((m) => { m.material.dispose(); m.geometry.dispose(); });
    this.crackGeo.dispose(); this.crackMat.dispose();
  }
}
