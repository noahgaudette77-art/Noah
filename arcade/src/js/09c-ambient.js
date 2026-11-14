// Things that happen in a sky, shared by every scene that has one: meteor showers,
// fireworks, lightning, a distant explosion, a UFO, a blimp with an ad, a helicopter
// with a searchlight, delivery drones, a laser show, birds. Each is built once,
// hidden, and registered with the scene's Event Director. Look only.
const AMBIENT_SHARED = { uScroll: { value: 0 }, uLen: { value: 256 }, uZMax: { value: 12 } };
function adTexture() { return adTexture.t || (adTexture.t = racerAdAtlas()); }
class AmbientSky {
  // o: host (a Scene3D with scene, camera, bursts, shake), director, win() -> the
  // slice of sky in view { w, y0, y1, z, s }, and optional city(), open(), wide(),
  // calm() 0..1, storm(), flash(k), dry()
  constructor(o) {
    const g = o.host, s = g.scene, D = o.director;
    this.o = o;
    o.calm = o.calm || (() => 0);
    o.storm = o.storm || (() => true);
    o.flash = o.flash || (() => {});
    const win = o.win, city = o.city || (() => false), open = o.open || (() => true), wide = o.wide || (() => open() && !city());
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
    const basic = (b) => { const m = new THREE.Mesh(b.build("color"), this.glowMat); m.frustumCulled = false; m.visible = false; return m; };
    const hide = (...x) => x.forEach((y) => { y.visible = false; });
    const fade = (t, dur, a = 0.6, b = 0.8) => smoothstep(0, a, t) * (1 - smoothstep(dur - b, dur, t));

    // -- 1. meteor shower: streaks across the sky
    const mg = new THREE.PlaneGeometry(1, 1);
    this.meteors = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xffffff, map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 })); m.visible = false; m.layers.set(1); s.add(m); return m; });
    D.add({ id: "meteors", dur: 5, can: wide,
      start: (r) => { const c = city(), W = c ? 20 : 230; r.z = c ? -210 : -420; r.s = c ? 0.3 : 1; r.m = this.meteors.map((m, i) => ({ m, t0: i * 0.45 + rand(0, 0.3), x: rand(-1.1, -0.1) * W, y: c ? rand(52, 74) : rand(120, 200), vx: rand(0.35, 0.6) * W, vy: -rand(0.16, 0.26) * W, col: Math.random() < 0.5 ? 0xbfe8ff : 0xffe2b0 })); },
      update: (dt, t, r) => { for (const o of r.m) { const k = (t - o.t0) / 1.3; o.m.visible = k > 0 && k < 1; if (!o.m.visible) continue; o.m.position.set(o.x + o.vx * k * 1.3, o.y + o.vy * k * 1.3, r.z); o.m.rotation.z = Math.atan2(o.vy, o.vx); o.m.scale.set(46 * r.s, 2.4 * r.s, 1); o.m.material.color.set(o.col).multiplyScalar(2.2); o.m.material.opacity = Math.sin(k * Math.PI); } },
      end: () => hide(...this.meteors) });

    // -- 2. fireworks over the skyline (also the answer to a right answer)
    D.add({ id: "fireworks", big: true, dur: 3.2, can: open,
      start: (r) => { r.n = 0; r.next = 0; r.max = r.arg && r.arg.n ? r.arg.n : 5; },
      update: (dt, t, r) => {
        if (r.n < r.max && t >= r.next) {
          r.n++; r.next = t + rand(0.42, 0.6); // never more than two or three bursts a second
          const W = win(), p = new THREE.Vector3(rand(-W.w, W.w) * 0.85, rand(W.y0, W.y1), W.z), col = [COLORS.magenta, COLORS.cyan, COLORS.yellow, COLORS.lime, COLORS.orange, 0xffffff][Math.floor(Math.random() * 6)];
          g.bursts.burst(p, col, { n: 64, speed: 34 * W.s, size: 3.4 * W.s, life: 1.7, gravity: -9 * W.s });
          g.bursts.burst(p, 0xffffff, { n: 18, speed: 16 * W.s, size: 2.2 * W.s, life: 0.9, gravity: -5 * W.s });
        }
      } });

    // -- 3. lightning: one bolt, one flash of sky
    const lpos = new Float32Array(14 * 18);
    const lgeo = new THREE.BufferGeometry();
    lgeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3).setUsage(THREE.DynamicDrawUsage));
    this.bolt = new THREE.Mesh(lgeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.bolt.frustumCulled = false; this.bolt.visible = false; this.bolt.layers.set(1);
    s.add(this.bolt);
    D.add({ id: "lightning", big: true, flashy: true, dur: 1.4, can: () => open() && o.storm(),
      start: () => {
        const c = city(), q = c ? 0.2 : 1, z = c ? -200 : -430;
        let x = c ? rand(-9, 9) : rand(-220, 220), y = c ? 76 : 230;
        for (let i = 0; i < 14; i++) {
          const nx = x + rand(-22, 22) * q, ny = y - 14 * q, w = (1.6 - i * 0.07) * (c ? 0.3 : 1), o = i * 18;
          [[x - w, y], [x + w, y], [nx + w, ny], [x - w, y], [nx + w, ny], [nx - w, ny]].forEach(([px, py], k) => { lpos[o + k * 3] = px; lpos[o + k * 3 + 1] = py; lpos[o + k * 3 + 2] = z; });
          x = nx; y = ny;
        }
        lgeo.attributes.position.needsUpdate = true;
        this.bolt.visible = true;
      },
      update: (dt, t) => { const k = 1 - smoothstep(0.05, 0.5, t); this.bolt.material.color.setRGB(3.5 * k, 3.7 * k, 4.2 * k); o.flash(k * 0.9); this.bolt.visible = k > 0.01; },
      end: () => hide(this.bolt) });

    // -- 4. a distant explosion: a flash on the horizon, a ring across the ground, then the shock arrives
    this.blast = glowSprite(neon(0xffb86a, 2.4), 10, 0);
    this.blast.visible = false; this.blast.layers.set(1);
    this.blastRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.blastRing.rotation.x = -Math.PI / 2; this.blastRing.visible = false; this.blastRing.layers.set(1);
    s.add(this.blast, this.blastRing);
    D.add({ id: "explosion", big: true, flashy: true, dur: 2.6, can: open,
      start: (r) => { const c = city(); r.s = c ? 0.4 : 1; r.p = c ? new THREE.Vector3(rand(-5, 5), 12, -190) : new THREE.Vector3(rand(-1, 1) * win().w, 14, -290); r.hit = false; this.blast.position.copy(r.p); this.blastRing.position.set(r.p.x, 0.3, r.p.z); this.blast.visible = this.blastRing.visible = true; g.bursts.burst(r.p, COLORS.orange, { n: 50, speed: 22 * r.s, size: 4 * r.s, life: 1.6, gravity: 3 }); },
      update: (dt, t, r) => {
        this.blast.scale.setScalar((30 + t * 70) * r.s); this.blast.material.opacity = Math.max(0, 1 - t / 1.1);
        const k = t / 2.2; this.blastRing.scale.setScalar(1 + k * 330 * (r.s < 1 ? 0.6 : 1)); this.blastRing.material.opacity = Math.max(0, 1 - k) * 0.8;
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
      start: (r) => { const c = city(); r.c = c; r.sd = Math.random() < 0.5 ? -1 : 1; r.x = c ? rand(-2.5, 2.5) : rand(0.15, 0.5) * win().w * r.sd; r.hy = c ? 14.5 : win().y0; this.ufo.visible = true; this.ufo.scale.setScalar(c ? 0.17 : 1); },
      update: (dt, t, r) => {
        const inn = smoothstep(0, 2.2, t), out = smoothstep(7, 9, t), q = r.c ? 0.3 : 1;
        this.ufo.position.set(lerp(-r.sd * 320 * (r.c ? 0.02 : 1), r.x, inn) + out * r.sd * 420 * (r.c ? 0.015 : 1) + Math.sin(t * 1.3) * 3 * q, lerp(r.c ? 26 : r.hy + 100, r.hy, inn) + out * (r.c ? 16 : 180) + Math.sin(t * 2.1) * 1.5 * q * 0.5, r.c ? -46 : -230);
        this.ufoBody.rotation.y = t * 1.6; this.ufo.rotation.z = Math.sin(t * 1.3) * 0.08 - out * r.sd * 0.5;
        this.ufoBeam.material.uniforms.uI.value = 0.55 * smoothstep(2.4, 3.2, t) * (1 - smoothstep(6.2, 6.9, t)) * (1 - 0.4 * o.calm());
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
      const ad = new THREE.Mesh(ge, racerAdMaterial(AMBIENT_SHARED, adTexture(), false, false)); ad.position.set(0, 0.5, 10.1);
      this.blimp.add(body, ad); this.blimp.visible = false; s.add(this.blimp); }
    D.add({ id: "blimp", dur: 30, can: wide,
      start: (r) => { r.c = city(); r.y = r.c ? rand(40, 52) : rand(win().y0, win().y1) * 1.42; this.blimp.visible = true; this.blimp.scale.setScalar(r.c ? 0.32 : 1); },
      update: (dt, t, r) => { const x = r.c ? -44 + t * 6.5 : -330 + t * 22; this.blimp.position.set(x, r.y + Math.sin(t * 0.5) * 2 * (r.c ? 0.4 : 1), r.c ? -170 : -360); if (r.c && x > 44) return false; },
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
      start: (r) => { r.c = city(); r.sd = Math.random() < 0.5 ? -1 : 1; r.y = r.c ? rand(12.5, 15) : rand(26, 32); r.z = rand(-120, -70); r.x = rand(-3.5, 3.5); this.heli.visible = true; this.heli.scale.setScalar(r.c ? 0.7 : 1); },
      update: (dt, t, r) => {
        if (r.c) { this.heli.position.set(r.x + Math.sin(t * 0.7) * 1.5, r.y + Math.sin(t * 1.1) * 0.8, -215 + t * 23); this.heli.rotation.set(0, -Math.PI / 2, 0); }
        else { this.heli.position.set(r.sd * (-70 + t * 14), r.y + Math.sin(t * 1.1) * 0.8, r.z); this.heli.rotation.set(0, r.sd > 0 ? 0 : Math.PI, r.sd * -0.12); }
        this.blades.rotation.y = t * 14;
        this.heliBeam.rotation.set(Math.PI + Math.sin(t * 0.8) * 0.3, 0, -0.5 + Math.sin(t * 0.55) * 0.3);
        this.heliBeam.material.uniforms.uI.value = 0.42 * fade(t, 10) * (1 - 0.45 * o.calm()) * (GFX.opt.beams ? 1 : 0);
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
      update: (dt, t, r) => this.drones.forEach((m, i) => { const x = r.sd * (-34 + (t - i * 0.5) * 9); m.visible = Math.abs(x) < (city() ? 8.4 : 34); m.position.set(x, r.y + Math.sin(t * 2.4 + i) * 0.35 + i * 0.3, r.z - i * 1.6); m.rotation.set(0, r.sd > 0 ? Math.PI / 2 : -Math.PI / 2, Math.sin(t * 2 + i) * 0.08); m.scale.setScalar(1.25); }),
      end: () => hide(...this.drones) });

    // -- 9. a laser show from the rooftops
    this.lasers = [0xff3ad4, 0x35efff, 0x5dffb0, 0xffd23d].map((c, i) => { const l = racerShaft(c, 0.25, 1.4, 240, 6); l.position.set((i - 1.5) * 38, 26, -220 - (i % 2) * 40); l.visible = false; s.add(l); return l; });
    D.add({ id: "lasers", dur: 8, can: () => wide() && !(o.dry && o.dry()),
      start: (r) => { r.c = city(); this.lasers.forEach((l, i) => { l.visible = true; if (r.c) l.position.set((i % 2 ? 1 : -1) * 9.6, 30 + i * 2, -80 - i * 26); else l.position.set((i - 1.5) * 38, 26, -220 - (i % 2) * 40); l.scale.setScalar(r.c ? 0.32 : 1); }); },
      update: (dt, t, r) => this.lasers.forEach((l, i) => { l.rotation.set(-0.5 + Math.sin(t * 0.7 + i * 1.7) * 0.4, 0, r.c ? (i % 2 ? 1 : -1) * (0.75 + Math.sin(t * 0.9 + i * 2.3) * 0.5) : Math.sin(t * 0.9 + i * 2.3) * 0.9); l.material.uniforms.uI.value = 0.75 * fade(t, 8) * (1 - 0.5 * o.calm()) * (GFX.opt.beams ? 1 : 0); }),
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
      start: (r) => { r.c = city(); r.sd = Math.random() < 0.5 ? -1 : 1; r.y = r.c ? rand(9, 13) : rand(38, 60); r.z = rand(-190, -120); this.birds.visible = true; this.birds.scale.setScalar(r.c ? 0.22 : 1); this.birds.material.uniforms.uColor.value.copy(g.scene.fog.color).multiplyScalar(0.25); },
      update: (dt, t, r) => {
        if (r.c) { this.birds.position.set(Math.sin(t * 0.5) * 2.5, r.y + Math.sin(t * 0.6) * 1.5, -210 + t * 21); this.birds.rotation.y = -Math.PI / 2; }
        else { this.birds.position.set(r.sd * (-190 + t * 36), r.y + Math.sin(t * 0.6) * 3, r.z); this.birds.rotation.y = r.sd > 0 ? 0 : Math.PI; }
      },
      end: () => hide(this.birds) });

    BOX.dispose(); CYL.dispose();
  }
}
