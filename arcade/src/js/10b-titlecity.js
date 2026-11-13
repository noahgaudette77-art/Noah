// The city on the title screen: megatowers laced with neon conduits, rolling ad
// panels and flickering blade signs; a suspension bridge across the sun carrying
// two streams of traffic, more streams in sky lanes at three depths; searchlights;
// and what the Event Director sends through (a train, a patrol chase, cars passing
// overhead, plus everything in AmbientSky). All original, all procedural.
class TitleCity {
  constructor(host) {
    const g = (this.g = host), s = g.scene;
    this.t = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    const BOX = new THREE.BoxGeometry(1, 1, 1);
    // How wide the view is at a distance: a phone held upright sees a narrow slice,
    // so everything is laid out as a fraction of what is actually on screen.
    const A = clamp(GFX.w / Math.max(1, GFX.h), 0.42, 2.2), tall = A < 1;
    const hw = (z) => 0.6 * A * (12 - z);
    this.hw = hw;
    const glow = (this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true }));
    const put = (b, x, y, z, sx, sy, sz, c, k = 1, rx = 0, ry = 0, rz = 0) => b.add(BOX, racerM(x, y, z, sx, sy, sz, rx, ry, rz), c, k);
    const strut = (b, a, c, t, col, k = 1) => racerStrut(b, BOX, new THREE.Vector3(a[0], a[1], a[2]), new THREE.Vector3(c[0], c[1], c[2]), t, col, k);

    // ---- megatowers: stacked setbacks, conduits of light, window bands, beacons
    const tb = new RacerBatch(), blinkA = new RacerBatch(), blinkB = new RacerBatch();
    const ads = [], signs = [[], [], []];
    const NEON = [0x35efff, 0xff3ad4, 0x5dffb0, 0xffd23d];
    const tower = (x, z, w, h, i) => {
      const c0 = [0x0b0a1c, 0x0e0c22, 0x090818][i % 3];
      let y = 0, ww = w;
      [0.52, 0.3, 0.18].forEach((f, k) => {
        const hh = h * f;
        put(tb, x, y + hh / 2, z, ww, hh, ww * 0.8, c0, 1 + k * 0.25);
        put(tb, x, y + hh, z, ww + 1.2, 0.8, ww * 0.8 + 1.2, 0x1a1838); // ledge
        put(tb, x, y + hh + 0.5, z + ww * 0.4 + 0.62, ww + 1.2, 0.18, 0.1, NEON[(i + k) % 4], 1.7);
        // window bands on the face toward us: most steady, some on a slow twinkle
        const rows = Math.floor(hh / 3.2);
        for (let r = 0; r < rows; r++) {
          if (Math.random() < 0.3) continue;
          const wy = y + 2 + r * 3.2, lit = Math.random(), bw = ww * rand(0.3, 0.86), bx = x + rand(-1, 1) * (ww - bw) * 0.45;
          const col = Math.random() < 0.7 ? 0xffcf7a : Math.random() < 0.5 ? 0x8fe8ff : 0xff9bd8;
          (lit < 0.14 ? blinkA : lit < 0.28 ? blinkB : tb).add(BOX, racerM(bx, wy, z + ww * 0.4 + 0.05, bw, 1.0, 0.1), col, rand(0.5, 1.25));
        }
        y += hh; ww *= 0.72;
      });
      // conduits of light running up the face, kinked like cable trunks
      [-0.32, 0.12, 0.36].forEach((f, k) => {
        if ((i + k) % 3 === 0) return;
        const col = NEON[(i * 2 + k) % 2], cx = x + f * w, zz = z + w * 0.4 + 0.16;
        put(tb, cx, h * 0.14, zz, 0.28, h * 0.28, 0.1, col, 2.0);
        put(tb, cx + 0.9, h * 0.28, zz, 2.0, 0.28, 0.1, col, 2.0);
        put(tb, cx + 1.8, h * 0.4, zz, 0.28, h * 0.24, 0.1, col, 2.0);
      });
      put(tb, x, h + 5, z, 0.3, 10, 0.3, 0x1a1838);
      put(tb, x, h + 10.2, z, 0.9, 0.9, 0.9, 0xff3030, 3);
      // an ad panel that rolls to a new poster, and a blade sign that flickers
      ads.push([x - w * 0.12, h * rand(0.3, 0.44), z + w * 0.4 + 0.5, w * 0.6, w * 0.3, 0]);
      signs[i % 3].push([x + w * 0.5 + 1.2, h * rand(0.2, 0.34), z + w * 0.4, 2.4, 9.6, i]);
    };
    // nearer the middle they stay low, so the logo keeps clear sky behind it
    [[-0.5, -150, 30], [-0.74, -168, 40], [-1.02, -146, 50], [0.52, -152, 32], [0.78, -170, 42], [1.04, -148, 52], [-1.5, -190, 96], [1.55, -192, 104], [-2.1, -200, 130], [2.15, -205, 120]]
      .forEach(([f, z, h], i) => tower(f * hw(z), z, clamp(hw(z) * 0.2, 9, 26), tall ? h : h * 1.5, i));
    this.towers = new THREE.Mesh(tb.build("color"), cityFacadeMaterial({ lit: 0.36 }));
    s.add(this.towers);
    this.blink = [blinkA, blinkB].map((b) => { const m = new THREE.Mesh(b.build("color"), new THREE.MeshBasicMaterial({ vertexColors: true })); s.add(m); return m; });
    // ad panels (not looping) and blade signs
    { const pos = [], uv = [], az = [], seed = [];
      ads.forEach(([x, y, z, w, h], i) => { const P = (u, v) => { pos.push(x + (u - 0.5) * w, y + (v - 0.5) * h, z); uv.push(u, v); az.push(0); seed.push((i * 0.37 + 0.11) % 1); }; P(0, 0); P(1, 0); P(1, 1); P(0, 0); P(1, 1); P(0, 1); });
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      ge.setAttribute("aZ", new THREE.Float32BufferAttribute(az, 1)); ge.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1));
      const m = new THREE.Mesh(ge, racerAdMaterial(AMBIENT_SHARED, adTexture(), false, false));
      m.frustumCulled = false;
      s.add(m); }
    RacerGame.signTex = RacerGame.signTex || racerSignAtlas();
    this.signs = signs.map((list) => {
      const pos = [], uv = [], n = RACER_SIGNS.length;
      list.forEach(([x, y, z, w, h, i]) => { const k = i % n, u0 = k / n, u1 = (k + 1) / n; [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]].forEach(([a, b]) => { pos.push(x + (a - 0.5) * w, y + b * h, z); uv.push(a ? u1 : u0, b); }); });
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      const m = new THREE.Mesh(ge, new THREE.MeshBasicMaterial({ map: RacerGame.signTex, fog: false }));
      s.add(m);
      return m;
    });

    // ---- the bridge across the sun, and a lower causeway behind it
    const bb = new RacerBatch(), DK = 0x0d0b20;
    put(bb, 0, 16, -120, 560, 1.3, 9, DK, 1.4);
    put(bb, 0, 16.9, -115.4, 560, 0.16, 0.16, 0x35efff, 1.8);
    put(bb, 0, 16.9, -124.6, 560, 0.16, 0.16, 0xff3ad4, 1.2);
    const BW = hw(-120), sp = BW * 0.56, TH = tall ? 30 : 46; // piers either side of the sun, none across its middle
    for (let i = -6; i < 6; i++) put(bb, (i + 0.5) * sp, 7.7, -120, 2.4, 15.4, 5.5, DK, 1.2);
    for (const tx of [-BW * 0.62, BW * 0.62]) {
      for (const dz of [-4.6, 4.6]) put(bb, tx, TH / 2, -120 + dz, 1.5, TH, 1.5, DK, 1.6);
      put(bb, tx, TH - 2, -120, 1.9, 1.6, 10.8, DK, 1.8); put(bb, tx, TH * 0.7, -120, 1.7, 1.3, 10.8, DK, 1.8);
      put(bb, tx, TH + 0.9, -120, 0.9, 0.9, 0.9, 0xff3030, 3);
      const run = BW * 0.52 / 7;
      for (let k = 1; k <= 7; k++) for (const sd of [-1, 1]) { strut(bb, [tx, TH - 1 - k * (TH - 19) / 8, -115.4], [tx + sd * k * run, 16.9, -115.4], 0.16, 0x7f95d0, 1.0); put(bb, tx + sd * k * run, 17.3, -115.2, 0.4, 0.4, 0.3, 0xfff0d2, 2.2); }
    }
    put(bb, 0, 8.6, -196, 640, 0.9, 6, DK, 1.2); put(bb, 0, 9.3, -193, 640, 0.14, 0.14, 0xffa53d, 1.4);
    for (let i = -8; i <= 8; i++) put(bb, i * 38, 4.2, -196, 2.4, 8.4, 4, DK, 1.1);
    s.add(new THREE.Mesh(bb.build("color"), glow));

    // ---- traffic as moving light: each car a short streak, white ahead and red behind,
    // sliding along its lane in the vertex shader (one draw call for all of it)
    { const pos = [], col = [], sp = [], x0 = [];
      const lane = (y, z, dir, n, speed, size, tint) => { for (let i = 0; i < n; i++) {
        const start = Math.random() * 640, v = speed * rand(0.8, 1.25) * dir, len = size * rand(2.6, 4.4), hh = size * 0.3, c = new THREE.Color(tint);
        [[0, len * 0.5, [1.8, 1.7, 1.5]], [-len * 0.5, 0, [1.9, 0.12, 0.2]]].forEach(([a, b2, cc], part) => {
          const A = dir > 0 ? a : -a, B = dir > 0 ? b2 : -b2, cl = part === 0 ? cc : [cc[0] * (0.6 + 0.4 * c.r), cc[1] + 0.25 * c.g, cc[2] + 0.5 * c.b];
          [[A, -hh], [B, -hh], [B, hh], [A, -hh], [B, hh], [A, hh]].forEach(([dx, dy]) => { pos.push(dx, y + dy + (i % 3) * 0.5, z + (i % 2) * 1.4); col.push(cl[0], cl[1], cl[2]); sp.push(v); x0.push(start); });
        }); } };
      lane(17.9, -117.6, 1, 22, 16, 0.5, 0x000000); lane(17.9, -122.6, -1, 22, 14, 0.5, 0x000000);
      lane(9.9, -195, 1, 16, 11, 0.4, 0x000000); lane(9.9, -197, -1, 16, 10, 0.4, 0x000000);
      // sky lanes, placed in the open sky above the logo and in the gap beneath it
      lane(55, -96, 1, 12, 30, 0.7, 0x35efff); lane(61, -100, -1, 12, 26, 0.7, 0x35efff);
      lane(112, -210, -1, 16, 22, 0.9, 0xff3ad4); lane(120, -214, 1, 16, 20, 0.9, 0xff3ad4);
      lane(170, -330, 1, 18, 15, 1.2, 0x5dffb0); lane(178, -334, -1, 18, 13, 1.2, 0x5dffb0);
      lane(25, -150, 1, 10, 24, 0.6, 0xffd23d); lane(28.5, -154, -1, 10, 21, 0.6, 0xffd23d);
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("aCol", new THREE.Float32BufferAttribute(col, 3));
      ge.setAttribute("aSp", new THREE.Float32BufferAttribute(sp, 1)); ge.setAttribute("aX0", new THREE.Float32BufferAttribute(x0, 1));
      this.traffic = new THREE.Mesh(ge, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uI: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "attribute vec3 aCol; attribute float aSp; attribute float aX0; uniform float uTime; varying vec3 vCol; void main(){ vCol = aCol; vec3 p = position; p.x += mod(aX0 + uTime * aSp, 640.0) - 320.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
        fragmentShader: "uniform float uI; varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol * uI, 1.0); }",
      }));
      this.traffic.frustumCulled = false;
      s.add(this.traffic); }

    // ---- searchlights turning over the skyline
    this.lights = [[-0.7, 0x35efff], [0.75, 0xff3ad4], [-0.2, 0xfff0d2]].map(([f, c]) => { const l = racerShaft(c, 0.8, 9, 240, 8); l.position.set(f * hw(-230), 30, -230); s.add(l); return l; });
    g.decor(...this.lights);

    // ---- a few real vehicles for the close passes: hover cars and one patrol cruiser
    const U = { uKey: { value: new THREE.Color(0.9, 0.6, 0.9) }, uKeyDir: { value: new THREE.Vector3(0.2, 0.5, -0.8).normalize() }, uAmb: { value: new THREE.Color(0.32, 0.2, 0.5) } };
    this.carMat = racerTrafficMaterial(U);
    this.carMat.uniforms.uSkyC.value.set(0xff3ad4);
    this.fleet = [["hover", 4], ["police", 1]].map(([type, n]) => {
      const geo = racerVehicleGeo(type);
      const tint = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3), lights = new THREE.InstancedBufferAttribute(new Float32Array(n * 4).fill(1), 4);
      geo.setAttribute("aTint", tint); geo.setAttribute("aL", lights);
      const m = new THREE.InstancedMesh(geo, this.carMat, n);
      m.frustumCulled = false; m.count = 0;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      RACER_PAINTS.slice(0, n).forEach((c, i) => { const col = new THREE.Color(type === "police" ? 0xf2f2f2 : c); tint.setXYZ(i, col.r, col.g, col.b); });
      s.add(m);
      return m;
    });
    // ---- the train that crosses the bridge
    { const b = new RacerBatch();
      for (let i = 0; i < 7; i++) { const x = i * 12.6; put(b, x, 0, 0, 11.8, 3.0, 3.2, i ? 0xcfd6e2 : 0xff3ad4, 0.45); put(b, x, 0.4, 1.62, 10.6, 0.9, 0.06, 0xffe2a8, 2.0); put(b, x, -1.3, 1.62, 11.8, 0.14, 0.06, 0x35efff, 2.4); }
      put(b, 82, 0, 0, 0.2, 0.7, 2.4, 0xfff2d8, 4);
      this.train = new THREE.Mesh(b.build("color"), glow);
      this.train.visible = false; this.train.frustumCulled = false;
      s.add(this.train); }
    BOX.dispose();
  }
  // Events of the city's own, added to the title's director.
  events(D) {
    const place = (m, i, x, y, z, ry, rz = 0, sc = 1) => { m.setMatrixAt(i, this._m.compose(this._p.set(x, y, z), this._q.setFromEuler(this._e.set(0, ry, rz)), this._s.set(sc, sc, sc))); m.instanceMatrix.needsUpdate = true; };
    const [hover, police] = this.fleet;
    D.add({ id: "maglev", dur: 11,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; this.train.visible = true; this.train.scale.x = r.sd; },
      update: (dt, t, r) => { const far = this.hw(-120) + 110; this.train.position.set(r.sd * (-far + t * 46), 19.2, -120); if (t * 46 > far * 2 + 20) return false; },
      end: () => { this.train.visible = false; } });
    D.add({ id: "flyby", dur: 6,
      start: (r) => { r.x = [rand(-9, -3), rand(3, 9), rand(-2, 2)]; hover.count = 3; },
      update: (dt, t, r) => { for (let i = 0; i < 3; i++) { const k = t - i * 0.7; place(hover, i, r.x[i] + Math.sin(k * 1.4 + i) * 0.8, 6.5 + i * 1.6 + Math.sin(k * 2 + i) * 0.3, 26 - k * 58, 0, Math.sin(k * 1.4 + i) * 0.2, k > 0 ? 1 : 0); } },
      end: () => { hover.count = 0; } });
    D.add({ id: "chase", dur: 7,
      start: (r) => { r.sd = Math.random() < 0.5 ? -1 : 1; r.y = rand(9, 12); hover.count = 4; police.count = 1; for (let i = 0; i < 3; i++) place(hover, i, 0, -99, 0, 0, 0, 0); },
      update: (dt, t, r) => {
        const x = r.sd * (-this.hw(-70) - 30 + t * 30), w = Math.sin(t * 2.4) * 5;
        place(hover, 3, x, r.y + w * 0.4, -70 + w, r.sd > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 1.6);
        place(police, 0, x - r.sd * 14, r.y + 0.6 + Math.sin(t * 2.4 - 0.6) * 2, -70 + Math.sin(t * 2.4 - 0.6) * 5, r.sd > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 1.6);
      },
      end: () => { hover.count = 0; police.count = 0; } });
  }
  update(dt) {
    const t = (this.t += dt);
    this.traffic.material.uniforms.uTime.value = t;
    this.carMat.uniforms.uTime.value = t;
    // windows twinkle and signs flicker, slowly: nothing here changes faster than 3 Hz
    this.blink[0].material.color.setScalar(0.55 + 0.45 * Math.sin(t * 0.9));
    this.blink[1].material.color.setScalar(0.55 + 0.45 * Math.sin(t * 0.6 + 2));
    this.signs.forEach((m, i) => { const f = Math.sin(t * (1.1 + i * 0.7) + i * 2.1), dip = Math.sin(t * (5.3 + i) + i) > 0.93 ? 0.45 : 1; m.material.color.setScalar((1.25 + 0.2 * f) * dip); });
    this.lights.forEach((l, i) => { l.rotation.set(-0.25 + Math.sin(t * 0.21 + i * 2) * 0.2, 0, Math.sin(t * 0.33 + i * 1.9) * 0.75); l.material.uniforms.uI.value = GFX.opt.beams ? 0.3 : 0; });
  }
}
