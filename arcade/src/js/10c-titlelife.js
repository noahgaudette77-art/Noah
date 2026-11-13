// What never stops on the title screen (the Event Director's set pieces come and go;
// these are always there): megatowers framing the view like the walls of a canyon,
// with real floors of windows; an avenue with lamp posts sliding past and strings of
// lanterns across it; traffic streaming into the city along sky lanes and along the
// wet street; two twin-hulled sky-ferries; a helicopter working its searchlight in
// front of the sun and another crossing overhead; a ribbon of drones; rain, with
// splashes; and a storm cloud that lights from within and throws forked bolts behind
// the mountains. All original, all procedural.
class TitleLife {
  constructor(g) {
    this.g = g;
    this.t = 0;
    const s = g.scene, hw = g.city.hw, BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 28, 18);
    const put = (b, x, y, z, sx, sy, sz, c, k = 1, rx = 0, ry = 0, rz = 0) => b.add(BOX, racerM(x, y, z, sx, sy, sz, rx, ry, rz), c, k);
    const NEON = [0x35efff, 0xff3ad4, 0x5dffb0, 0xffd23d];
    const quiet = REDUCED_MOTION;
    const smooth = (geo, m, c) => { const h = geo.clone(); h.applyMatrix4(m); h.deleteAttribute("uv"); const col = new THREE.Color(c), a = new Float32Array(h.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = col.r; a[i + 1] = col.g; a[i + 2] = col.b; } h.setAttribute("color", new THREE.Float32BufferAttribute(a, 3)); return h; };
    this.hullMat = skyHullMaterial({});

    // ---- 1. megatowers either side: the near one runs off the top of the picture
    const nb = new RacerBatch(), blades = [];
    const mega = (x, z, w, d, h, i) => {
      const c0 = 0x080716, inner = x < 0 ? x + w / 2 : x - w / 2, sd = x < 0 ? 1 : -1;
      put(nb, x, h / 2, z, w, h, d, c0);
      for (let y = 24; y < h - 6; y += 32) {
        put(nb, x, y, z, w + 1.6, 1.0, d + 1.6, 0x17152e);
        put(nb, x, y + 0.7, z + d / 2 + 0.85, w + 1.6, 0.22, 0.12, NEON[(i + Math.round(y / 32)) % 4], 1.8);
        put(nb, inner + sd * 0.85, y + 0.7, z, 0.12, 0.22, d + 1.6, NEON[(i + Math.round(y / 32)) % 4], 1.8);
      }
      put(nb, inner, h / 2, z + d / 2 + 0.12, 0.26, h, 0.26, NEON[i % 2], 2.0); // a fin of light up the corner
      put(nb, x, h + 3, z, w * 0.5, 6, d * 0.5, c0);
      put(nb, x, h + 16, z, 0.4, 20, 0.4, 0x1a1838);
      put(nb, x, h + 26.4, z, 1, 1, 1, 0xff3030, 3);
      // blade signs hung out over the street, facing down the avenue
      for (let y = 34, k = 0; y < Math.min(h - 20, 150); y += 27, k++) blades.push([inner + sd * 2.3, y, z + d / 2 - 1 - (k % 2) * 4, 3.4, 13, i * 3 + k]);
    };
    for (const sd of [-1, 1]) {
      mega(sd * (hw(-80) + 2.6), -80, 15, 13, 236, sd > 0 ? 1 : 0);
      mega(sd * (hw(-122) - 3), -122, 17, 15, 152, sd > 0 ? 3 : 2);
      mega(sd * (hw(-165) - 10.5), -165, 18, 16, 98, sd > 0 ? 1 : 2);
    }
    this.facade = new THREE.Mesh(nb.build("color"), cityFacadeMaterial({ lit: 0.52, cell: [1.15, 1.6] }));
    this.facade.frustumCulled = false;
    s.add(this.facade);
    RacerGame.signTex = RacerGame.signTex || racerSignAtlas();
    { const pos = [], uv = [], n = RACER_SIGNS.length;
      blades.forEach(([x, y, z, w, h, i]) => { const k = i % n, u0 = k / n, u1 = (k + 1) / n; [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]].forEach(([a, b]) => { pos.push(x + (a - 0.5) * w, y + b * h, z); uv.push(a ? u1 : u0, b); }); });
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      this.blades = new THREE.Mesh(ge, new THREE.MeshBasicMaterial({ map: RacerGame.signTex, fog: false, side: THREE.DoubleSide }));
      this.blades.frustumCulled = false;
      s.add(this.blades); }

    // ---- 2. the avenue: lamp posts that slide past with the street, and strings of lanterns across it
    { const b = new RacerBatch();
      put(b, 0, 0.2, 0, 0.7, 0.4, 0.7, 0x15132a); put(b, 0, 3.9, 0, 0.2, 7.4, 0.2, 0x15132a);
      put(b, 0.75, 7.5, 0, 1.7, 0.14, 0.14, 0x15132a); put(b, 1.45, 7.36, 0, 0.9, 0.1, 0.36, 0xffffff, 3.2);
      const post = b.build("color");
      this.posts = [0x35efff, 0xff3ad4].map((c, k) => {
        const ge = post.clone(), col = ge.attributes.color, tint = new THREE.Color(c);
        for (let i = 0; i < col.count; i++) if (col.getX(i) > 1) col.setXYZ(i, tint.r * 3.2, tint.g * 3.2, tint.b * 3.2);
        const m = new THREE.InstancedMesh(ge, this.hullMat, 13);
        m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        s.add(m);
        const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture(), color: tint.clone().multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 13);
        pools.frustumCulled = false; pools.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        s.add(pools);
        return { m, pools, sd: k ? 1 : -1 };
      });
      post.dispose();
      const cb = new RacerBatch(), V = (x, y, z) => new THREE.Vector3(x, y, z);
      [[-72, 15.5, 6.5, 20.5], [-100, 25, 7.5, 23], [-136, 36, 8, 25.5]].forEach(([z, y, sag, X], ci) => {
        const N = 22, pt = (i) => { const u = i / N, k = 2 * u - 1; return V(k * X, y - sag * (1 - k * k) + (ci === 1 ? k * 2.2 : 0), z); };
        for (let i = 0; i < N; i++) {
          racerStrut(cb, BOX, pt(i), pt(i + 1), 0.11, 0x0c0a1a);
          if (i % 2 === 1 && i > 1 && i < N - 1) { const p = pt(i); put(cb, p.x, p.y - 0.5, p.z, 0.05, 0.9, 0.05, 0x0c0a1a); put(cb, p.x, p.y - 1.25, p.z, 0.55, 0.7, 0.55, [0xffb347, 0xff7ad0, 0x7fe8ff][(i >> 1) % 3], 2.3); }
        }
      });
      this.cables = new THREE.Mesh(cb.build("color"), this.hullMat);
      this.cables.frustumCulled = false;
      s.add(this.cables); }

    // ---- 3. traffic into the city: comets of light along sky lanes and along the wet street, the ones
    // going away red, the ones coming toward us white
    { const pos = [], col = [], sp = [], z0 = [];
      const lane = (x, y, dir, n, speed, size, tint) => { for (let i = 0; i < n; i++) {
        const start = Math.random() * 340, v = speed * rand(0.8, 1.25) * dir, len = size * rand(5, 9), hh = size * 0.3, c = new THREE.Color(tint), jx = rand(-0.5, 0.5), jy = rand(-0.3, 0.3);
        const head = dir < 0 ? [2.6, 0.3 + 0.4 * c.g, 0.4 + 0.6 * c.b] : [2.4, 2.3, 2.0];
        // two crossed blades: a streak from below and from the side. Bright at its head, gone at its tail.
        [[1, 0], [0, 1]].forEach(([ax, ay]) => [[0, -1], [1, -1], [1, 1], [0, -1], [1, 1], [0, 1]].forEach(([a, b]) => {
          pos.push(x + jx + b * hh * ax, y + jy + b * hh * ay, (dir < 0 ? a : -a) * len); const k = 1 - a; col.push(head[0] * k * k, head[1] * k * k, head[2] * k * k); sp.push(v); z0.push(start);
        })); } };
      [[9, 30, 0x35efff], [13, 46, 0xff3ad4], [17, 62, 0x5dffb0], [6.5, 78, 0xffd23d]].forEach(([x, y, tint], k) => {
        for (const sd of [-1, 1]) { lane(sd * x, y, -1, 10, 34 + k * 4, 0.42 + k * 0.05, tint); lane(sd * (x + 2.2), y + 2.4, 1, 8, 30 + k * 4, 0.42 + k * 0.05, tint); }
      });
      // the street itself: four lanes close to the ground, reflected in the wet floor
      [[-5.4, -1, 52], [-2.6, -1, 60], [2.6, 1, 58], [5.4, 1, 50]].forEach(([x, dir, v]) => lane(x, 0.75, dir, 9, v, 0.26, 0xff5a8a));
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("aCol", new THREE.Float32BufferAttribute(col, 3));
      ge.setAttribute("aSp", new THREE.Float32BufferAttribute(sp, 1)); ge.setAttribute("aZ0", new THREE.Float32BufferAttribute(z0, 1));
      this.streams = new THREE.Mesh(ge, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "attribute vec3 aCol; attribute float aSp; attribute float aZ0; uniform float uTime; varying vec3 vCol; void main(){ vec3 p = position; float z = mod(aZ0 + uTime * aSp, 340.0) - 310.0; p.z += z; vCol = aCol * smoothstep(-310.0, -250.0, z) * smoothstep(30.0, 4.0, z); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
        fragmentShader: "varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol, 1.0); }",
      }));
      this.streams.frustumCulled = false;
      s.add(this.streams); }

    // ---- 4. two sky-ferries: twin hulls under one deck, a row of lit cabins down each side
    const ferry = (scale) => {
      const b = new RacerBatch(), HULL = 0x34315a, DARK = 0x1a1836;
      put(b, 0, -0.5, 0, 15, 0.6, 5.4, DARK); put(b, 0.5, 0.35, 0, 11, 1.1, 3.0, HULL); put(b, 3.6, 1.25, 0, 3.2, 0.7, 2.2, HULL); // deck, cabin, bridge
      put(b, 5.25, 1.3, 0, 0.1, 0.42, 1.9, 0x9fe8ff, 1.6);
      for (let i = -6; i <= 6; i++) for (const z of [-1, 1]) { put(b, 0.5 + i * 0.78, 0.4, z * 1.52, 0.5, 0.42, 0.06, i % 4 === 0 ? 0x9fe8ff : 0xffe2a8, 2.4); put(b, i * 1.9, -0.86, z * 2.6, 0.22, 0.14, 0.22, i % 2 ? 0x35efff : 0xff3ad4, 3); }
      put(b, -11.2, 1.7, 0, 3.2, 3.6, 0.22, HULL); put(b, -11.4, 0.6, 0, 2.6, 0.22, 6.4, HULL); // tail
      for (const z of [-1, 1]) { put(b, -6.4, -1.3, z * 2.6, 2.4, 1.0, 1.0, DARK); put(b, -7.7, -1.3, z * 2.6, 0.12, 1.2, 1.2, 0x35efff, 2.4); }
      put(b, 12.6, 0.2, 2.6, 0.5, 0.5, 0.5, 0x30ff60, 4); put(b, 12.6, 0.2, -2.6, 0.5, 0.5, 0.5, 0xff3030, 4); put(b, -12.9, 3.7, 0, 0.5, 0.5, 0.5, 0xffffff, 4);
      const hulls = [-2.6, 2.6].map((z) => smooth(SPH, new THREE.Matrix4().makeTranslation(0, -0.5, z).multiply(new THREE.Matrix4().makeScale(13.4, 1.9, 1.9)), HULL));
      const m = new THREE.Mesh(mergeIndexed(hulls.concat([b.build("color")]), ["position", "normal", "color"]), this.hullMat);
      m.scale.setScalar(scale);
      m.frustumCulled = false;
      s.add(m);
      return m;
    };
    this.ferries = [ferry(1.15), ferry(0.72)];

    // ---- 5. two helicopters with searchlights
    const heli = (scale) => {
      const b = new RacerBatch(), grp = new THREE.Group(), NAVY = 0x1c2444;
      put(b, -3.9, 0.35, 0, 5.2, 0.34, 0.34, NAVY); put(b, -6.3, 1.1, 0, 0.6, 1.9, 0.12, NAVY); put(b, -6.3, 0.45, 0, 1.4, 0.1, 1.5, NAVY); // boom, fin, stabiliser
      put(b, -6.5, 1.1, 0.2, 0.06, 1.5, 1.5, 0x9fb4c8, 0.5); // tail rotor, seen as a disc
      put(b, 0.2, -0.05, 0.94, 2.6, 0.12, 0.05, 0xff3ad4, 2.2); put(b, 0.2, -0.05, -0.94, 2.6, 0.12, 0.05, 0xff3ad4, 2.2); // a stripe of light down each flank
      [-0.9, 0.9].forEach((z) => { put(b, 0, -1.6, z, 3.8, 0.1, 0.1, 0x3a4058); [-1.1, 1.1].forEach((x) => put(b, x, -1.2, z * 0.92, 0.08, 0.8, 0.08, 0x3a4058)); });
      put(b, 0.4, 0.2, 1.02, 0.3, 0.3, 0.1, 0x30ff60, 4); put(b, 0.4, 0.2, -1.02, 0.3, 0.3, 0.1, 0xff3030, 4); put(b, -6.4, 2.2, 0, 0.28, 0.28, 0.28, 0xffffff, 4);
      put(b, 2.2, -0.75, 0, 0.5, 0.42, 0.5, 0xfff0d2, 5);
      const hull = smooth(SPH, new THREE.Matrix4().makeScale(2.9, 1.25, 1.2), NAVY), glass = smooth(SPH, new THREE.Matrix4().makeTranslation(1.25, 0.28, 0).multiply(new THREE.Matrix4().makeScale(1.55, 0.92, 1.02)), 0x35b8e8);
      const body = new THREE.Mesh(mergeIndexed([hull, glass, b.build("color")], ["position", "normal", "color"]), this.hullMat);
      const rotor = new THREE.Mesh(new THREE.CircleGeometry(4.9, 28), new THREE.MeshBasicMaterial({ color: 0xb8c8dc, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide }));
      rotor.rotation.x = -Math.PI / 2; rotor.position.y = 1.5;
      const bl = new RacerBatch(); [0, Math.PI / 2].forEach((a) => bl.add(BOX, racerM(0, 1.52, 0, 9.8, 0.05, 0.3, 0, a), 0x15171c)); put(bl, 0, 1.3, 0, 0.3, 0.5, 0.3, 0x15171c);
      const bladesM = new THREE.Mesh(bl.build("color"), this.hullMat);
      const beam = racerShaft(0xfff0d2, 0.3, 9, 80, 18); beam.position.set(2.2, -0.8, 0);
      grp.add(body, rotor, bladesM, beam);
      grp.userData = { blades: bladesM, beam };
      grp.scale.setScalar(scale);
      grp.traverse((o) => { o.frustumCulled = false; });
      s.add(grp);
      return grp;
    };
    this.helis = [heli(1.45), heli(1)];

    // ---- 6. a ribbon of drones, sixty lights following each other through the sky
    { const N = 60, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const c = new THREE.Color([0x35efff, 0xff3ad4, 0xffd23d][i % 3]); col.set([c.r * 2.4, c.g * 2.4, c.b * 2.4], i * 3); }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.BufferAttribute(pos, 3)); ge.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
      this.droneN = N;
      this.drones = new THREE.Points(ge, new THREE.ShaderMaterial({
        uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: "attribute vec3 aCol; uniform float uPx; varying vec3 vCol; void main(){ vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uPx * 820.0 / -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "varying vec3 vCol; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; gl_FragColor = vec4(vCol * (exp(-r * 9.0) + 0.25 * exp(-r * 2.5)), 1.0); }",
      }));
      this.drones.frustumCulled = false;
      s.add(this.drones); }

    // ---- 7. rain: streaks through the air in front of us, and rings where they land on the street
    { const N = quiet ? 700 : 2400, pos = [], seed = [], corner = [];
      for (let i = 0; i < N; i++) {
        const x = rand(-38, 38), y = rand(0, 70), z = rand(-90, 9), sd = Math.random();
        [[-1, 0], [1, 0], [1, 1], [-1, 0], [1, 1], [-1, 1]].forEach(([a, b]) => { pos.push(x, y, z); seed.push(sd); corner.push(a, b); });
      }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("aSeed", new THREE.Float32BufferAttribute(seed, 1)); ge.setAttribute("aCorner", new THREE.Float32BufferAttribute(corner, 2));
      this.rain = new THREE.Mesh(ge, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uI: { value: 1 }, uGust: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: `attribute float aSeed; attribute vec2 aCorner; uniform float uTime; uniform float uGust; varying float vA;
          void main(){
            vec3 dir = normalize(vec3(0.1 + uGust * 0.22, -1.0, 0.04));
            vec3 p = position;
            float fall = uTime * (44.0 + aSeed * 22.0);
            p.y = mod(p.y - fall, 70.0);
            p.x += (70.0 - p.y) * dir.x / -dir.y - 4.0;
            vec3 toCam = normalize(cameraPosition - p), side = normalize(cross(dir, toCam));
            float len = 1.1 + aSeed * 1.6;
            p += side * aCorner.x * 0.024 - dir * aCorner.y * len;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vA = (0.5 + 0.5 * aSeed) * smoothstep(1.5, 6.0, -mv.z) * smoothstep(100.0, 60.0, -mv.z) * (1.0 - aCorner.y * 0.7);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: "uniform float uI; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.62, 0.7, 1.0) * vA * uI, 1.0); }",
      }));
      this.rain.frustumCulled = false;
      this.rain.layers.set(1); // (not in the floor's reflection)
      s.add(this.rain);
      const M = quiet ? 80 : 260, sp = [], ss = [], sc = [];
      for (let i = 0; i < M; i++) { const sd = Math.random(); [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { sp.push(0, 0, 0); ss.push(sd); sc.push(a, b); }); }
      const sg = new THREE.BufferGeometry();
      sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute("aSeed", new THREE.Float32BufferAttribute(ss, 1)); sg.setAttribute("aCorner", new THREE.Float32BufferAttribute(sc, 2));
      this.splash = new THREE.Mesh(sg, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uI: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; attribute vec2 aCorner; uniform float uTime; varying float vA; varying vec2 vC;
          float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
          void main(){
            float cyc = uTime * (1.1 + aSeed * 0.8) + aSeed * 37.0, k = fract(cyc), id = floor(cyc);
            vec2 c = vec2(h1(aSeed * 91.7 + id * 1.37) * 76.0 - 38.0, 8.0 - h1(aSeed * 33.1 + id * 2.11) * 100.0);
            float r = 0.12 + k * (0.5 + aSeed * 0.7);
            vC = aCorner; vA = (1.0 - k) * (1.0 - k);
            gl_Position = projectionMatrix * viewMatrix * vec4(c.x + aCorner.x * r, 0.05, c.y + aCorner.y * r, 1.0);
          }`,
        fragmentShader: "uniform float uI; varying float vA; varying vec2 vC; void main(){ float d = length(vC); gl_FragColor = vec4(vec3(0.7, 0.8, 1.0) * smoothstep(0.16, 0.0, abs(d - 0.78)) * vA * uI, 1.0); }",
      }));
      this.splash.frustumCulled = false;
      this.splash.layers.set(1);
      s.add(this.splash); }

    // ---- 8. a bank of storm cloud over the city, lit from below and, now and then, from within;
    // and the bolt itself, forked, striking somewhere beyond the mountains
    { this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(900, 260), new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uBolt: { value: new THREE.Vector3(0.5, 0.5, 0) }, uCity: { value: neon(0xff3ad4, 1.0) }, uMoon: { value: neon(0x8fc8ff, 1.1) } },
        transparent: true, depthWrite: false, fog: false,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `${GLSL_NOISE} uniform float uTime; uniform vec3 uBolt; uniform vec3 uCity; uniform vec3 uMoon; varying vec2 vUv;
          float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
          void main(){
            vec2 q = vec2(vUv.x * 7.0 + uTime * 0.012, vUv.y * 2.2);
            float d = fbm(vec3(q, uTime * 0.02)), d2 = fbm(vec3(q * 2.3 + 3.0, uTime * 0.03));
            float body = smoothstep(0.4, 0.68, d + 0.25 * d2 - 0.42 * (1.0 - smoothstep(0.0, 0.55, vUv.y)));
            float a = body * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.86, vUv.y) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
            // lit from under by the city, silvered along the tops by a moon that never shows itself
            float under = smoothstep(0.78, 0.4, d + 0.25 * d2), top = smoothstep(0.5, 0.72, d2) * body;
            vec3 col = vec3(0.05, 0.022, 0.11) + uCity * under * (1.0 - vUv.y) + uMoon * top * top * (0.4 + 0.6 * vUv.y);
            // sheet lightning: a glow inside the bank, shaped by the cloud itself
            vec2 bd = (vUv - uBolt.xy) * vec2(3.0, 1.0);
            col += vec3(0.8, 0.86, 1.4) * uBolt.z * (exp(-dot(bd, bd) * 9.0) * (0.5 + 2.2 * d2 * d) + 0.12);
            gl_FragColor = vec4(col, a * 0.95);
          }`,
      }));
      this.clouds.position.set(0, 262, -430);
      this.clouds.frustumCulled = false;
      this.clouds.renderOrder = -1;
      s.add(this.clouds);
      this.boltGeo = new THREE.BufferGeometry();
      this.boltGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(40 * 18), 3));
      this.boltMesh = new THREE.Mesh(this.boltGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
      this.boltMesh.frustumCulled = false; this.boltMesh.visible = false; this.boltMesh.layers.set(1);
      s.add(this.boltMesh);
      this.boltT = rand(3, 5); this.boltAge = 9; this.boltK = 0; }
    BOX.dispose(); SPH.dispose();
  }
  // A new bolt: a jagged trunk from the cloud down behind the mountains, with two forks.
  strike(x0) {
    const P = this.boltGeo.attributes.position, a = P.array;
    let n = 0;
    const seg = (x1, y1, x2, y2, w) => { if (n >= 40) return; const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, px = (-dy / l) * w, py = (dx / l) * w, o = n++ * 18;
      a.set([x1 - px, y1 - py, -404, x1 + px, y1 + py, -404, x2 + px, y2 + py, -404, x1 - px, y1 - py, -404, x2 + px, y2 + py, -404, x2 - px, y2 - py, -404], o); };
    const run = (x, y, steps, dy, drift, w) => { for (let i = 0; i < steps; i++) { const nx = x + drift + rand(-9, 9), ny = y - dy * rand(0.7, 1.3); seg(x, y, nx, ny, w * (1 - (i / steps) * 0.5)); if (w > 0.9 && (i === 3 || i === 7)) run(nx, ny, 5, dy * 0.7, (Math.random() < 0.5 ? -1 : 1) * rand(6, 12), 0.55); x = nx; y = ny; } };
    run(x0, 262, 13, 16, rand(-2.5, 2.5), 1.25);
    for (let i = n * 18; i < a.length; i++) a[i] = 0;
    P.needsUpdate = true;
  }
  update(dt) {
    const g = this.g, t = (this.t += dt), calm = REDUCED_MOTION || GFX.calm, hw = g.city.hw;
    const loop = (t0, span, T) => ((t0 % T) / T) * span * 2 - span;
    this.facade.material.uniforms.uTime.value = t;
    this.streams.material.uniforms.uTime.value = t;
    this.blades.material.color.setScalar(1.3 + 0.15 * Math.sin(t * 0.8));
    // lamp posts ride the street toward us and come round again at the far end
    { const M = this._m || (this._m = new THREE.Matrix4()), V = this._v || (this._v = new THREE.Vector3(9, 9, 1)), d = g.dist, L = 13 * 28;
      for (const P of this.posts) {
        for (let i = 0; i < 13; i++) {
          const z = -L + 14 + ((i * 28 + d + (P.sd > 0 ? 14 : 0)) % L);
          P.m.setMatrixAt(i, M.makeRotationY(P.sd > 0 ? Math.PI : 0).setPosition(P.sd * 10.5, 0, z));
          P.pools.setMatrixAt(i, M.makeRotationX(-Math.PI / 2).scale(V).setPosition(P.sd * 9.0, 0.06, z));
        }
        P.m.instanceMatrix.needsUpdate = true; P.pools.instanceMatrix.needsUpdate = true;
      } }
    // sky-ferries along the avenue: one passes overhead and away into the city, one comes out of it toward us
    const [f0, f1] = this.ferries;
    { const u = ((t + 6) % 36) / 36, v = ((t + 21) % 46) / 46;
      f0.position.set(-9 + Math.sin(t * 0.21) * 1.5, 58 + u * 30 + Math.sin(t * 0.4) * 1.2, 40 - u * 400); f0.rotation.set(Math.sin(t * 0.33) * 0.05, Math.PI / 2, 0.03);
      f1.position.set(12 + Math.sin(t * 0.17 + 2) * 1.5, 96 - v * 22 + Math.sin(t * 0.3) * 1.2, -360 + v * 420); f1.rotation.set(Math.sin(t * 0.27) * 0.05, -Math.PI / 2, -0.03); }
    // helicopters: one holds station in front of the sun, working its light across the water; one crosses overhead
    const [h0, h1] = this.helis;
    h0.position.set(Math.sin(t * 0.19) * 7, 9.2 + Math.sin(t * 0.43) * 0.9, -58 + Math.sin(t * 0.13) * 6);
    h0.rotation.set(0, -Math.PI / 2 + Math.sin(t * 0.19 + 1.2) * 0.6, Math.cos(t * 0.19) * -0.1);
    h0.userData.blades.rotation.y = t * 13;
    h0.userData.beam.rotation.set(Math.PI + Math.sin(t * 0.5) * 0.28, 0, -0.35 + Math.sin(t * 0.37) * 0.3);
    h1.position.set(loop(t + 7, hw(-104) + 30, 26), 60 + Math.sin(t * 0.6) * 1.2, -104); h1.rotation.set(0, 0, -0.12);
    h1.userData.blades.rotation.y = t * 13;
    h1.userData.beam.rotation.set(Math.PI + Math.sin(t * 0.7) * 0.25, 0, -0.5 + Math.sin(t * 0.45) * 0.25);
    const beamK = GFX.opt.beams ? (calm ? 0.2 : 0.34) : 0;
    h0.userData.beam.material.uniforms.uI.value = beamK; h1.userData.beam.material.uniforms.uI.value = beamK;
    // drones: each follows the one ahead along a path that winds between the towers
    { const P = this.drones.geometry.attributes.position, W = hw(-190) * 0.62;
      for (let i = 0; i < this.droneN; i++) {
        const u = t * 0.32 - i * 0.045;
        P.setXYZ(i, Math.sin(u) * W + Math.sin(u * 2.7 + i) * 0.5, 102 + Math.sin(u * 1.7 + 1) * 9 + Math.sin(u * 4.1 + i * 0.7) * 0.6, -190 + Math.cos(u * 1.3) * 44);
      }
      P.needsUpdate = true;
      this.drones.material.uniforms.uPx.value = (GFX.h / 844) * GFX.scenePR(); }
    // rain: steady, with gusts that lean it
    const gust = 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.071 + 1);
    this.rain.material.uniforms.uTime.value = t;
    this.rain.material.uniforms.uGust.value = calm ? 0 : gust;
    this.rain.material.uniforms.uI.value = (calm ? 0.3 : 0.44) * (0.75 + 0.5 * gust);
    this.splash.material.uniforms.uTime.value = t;
    this.splash.material.uniforms.uI.value = calm ? 0.25 : 0.5;
    // lightning: a strike, and sometimes a second flicker of it (never more than three flashes a second)
    this.boltAge += dt;
    if ((this.boltT -= dt) <= 0) {
      this.boltT = rand(5, 10);
      this.boltAge = 0;
      this.double = !calm && Math.random() < 0.5;
      const bx = rand(0.36, 0.64);
      this.clouds.material.uniforms.uBolt.value.set(bx, rand(0.3, 0.5), 0);
      this.boltK = calm ? 0.4 : rand(0.8, 1.2);
      this.strike((bx - 0.5) * 900);
    }
    const a = this.boltAge, env = (x) => (x < 0 ? 0 : x < 0.06 ? x / 0.06 : Math.exp(-(x - 0.06) * 6));
    const k = this.boltK * Math.max(env(a), this.double ? 0.7 * env(a - 0.42) : 0);
    this.flash = k;
    this.clouds.material.uniforms.uBolt.value.z = k;
    this.clouds.material.uniforms.uTime.value = t;
    this.boltMesh.visible = k > 0.02 && !calm;
    this.boltMesh.material.color.setRGB(k * 5, k * 5.6, k * 8);
    // its light on the towers' glass, and on the sky
    this.facade.material.uniforms.uFlash.value = k;
    if (g.city.towers) g.city.towers.material.uniforms.uFlash.value = k;
    g.skyFlash = Math.max(g.skyFlash, k * 0.45);
  }
}
