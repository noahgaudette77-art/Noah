// What never stops on the title screen (the Event Director's set pieces come and go;
// these are always there): megatowers framing the view like the walls of a canyon,
// with real floors of windows; traffic streaming into the city along sky lanes; two
// blimps with scrolling screens; a helicopter working its searchlight in front of the
// sun and another crossing overhead; a drone formation that reshapes itself; rain; and
// a bank of storm cloud that lights from within. All original, all procedural.
class TitleLife {
  constructor(g) {
    this.g = g;
    this.t = 0;
    const s = g.scene, hw = g.city.hw, BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 28, 18);
    const put = (b, x, y, z, sx, sy, sz, c, k = 1, rx = 0, ry = 0, rz = 0) => b.add(BOX, racerM(x, y, z, sx, sy, sz, rx, ry, rz), c, k);
    const NEON = [0x35efff, 0xff3ad4, 0x5dffb0, 0xffd23d];
    const quiet = REDUCED_MOTION;

    // ---- 1. megatowers either side: the near one runs off the top of the picture
    const nb = new RacerBatch(), blades = [];
    const mega = (x, z, w, d, h, i) => {
      const c0 = 0x0a0918, inner = x < 0 ? x + w / 2 : x - w / 2, sd = x < 0 ? 1 : -1;
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

    // ---- 2. traffic into the city: streams of light along sky lanes, away from us
    // (red) and toward us (white), converging on the far end of the avenue
    { const pos = [], col = [], sp = [], z0 = [];
      const lane = (x, y, dir, n, speed, size, tint) => { for (let i = 0; i < n; i++) {
        const start = Math.random() * 340, v = speed * rand(0.8, 1.25) * dir, len = size * rand(3.2, 5.5), hh = size * 0.32, c = new THREE.Color(tint), jx = rand(-0.5, 0.5), jy = rand(-0.4, 0.4);
        const cl = dir < 0 ? [1.9, 0.14 + 0.25 * c.g, 0.2 + 0.5 * c.b] : [1.7, 1.6, 1.4];
        // two crossed blades, so a car reads as a streak from below and from the side
        [[1, 0], [0, 1]].forEach(([ax, ay]) => [[-0.5, -1], [0.5, -1], [0.5, 1], [-0.5, -1], [0.5, 1], [-0.5, 1]].forEach(([a, b]) => {
          pos.push(x + jx + b * hh * ax, y + jy + b * hh * ay, a * len); col.push(cl[0], cl[1], cl[2]); sp.push(v); z0.push(start);
        })); } };
      [[9, 30, 0x35efff], [13, 46, 0xff3ad4], [17, 62, 0x5dffb0], [6.5, 78, 0xffd23d]].forEach(([x, y, tint], k) => {
        for (const sd of [-1, 1]) { lane(sd * x, y, -1, 12, 34 + k * 4, 0.42 + k * 0.05, tint); lane(sd * (x + 2.2), y + 2.4, 1, 10, 30 + k * 4, 0.42 + k * 0.05, tint); }
      });
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute("aCol", new THREE.Float32BufferAttribute(col, 3));
      ge.setAttribute("aSp", new THREE.Float32BufferAttribute(sp, 1)); ge.setAttribute("aZ0", new THREE.Float32BufferAttribute(z0, 1));
      this.streams = new THREE.Mesh(ge, new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: "attribute vec3 aCol; attribute float aSp; attribute float aZ0; uniform float uTime; varying vec3 vCol; void main(){ vec3 p = position; p.z += mod(aZ0 + uTime * aSp, 340.0) - 310.0; vCol = aCol * smoothstep(-310.0, -250.0, p.z) * smoothstep(30.0, 4.0, p.z); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
        fragmentShader: "varying vec3 vCol; void main(){ gl_FragColor = vec4(vCol, 1.0); }",
      }));
      this.streams.frustumCulled = false;
      s.add(this.streams); }

    // ---- 3. two blimps, each with a screen down its flank
    const adTex = (() => {
      const c = document.createElement("canvas"); c.width = 1536; c.height = 256;
      const x = c.getContext("2d");
      x.fillStyle = "#070214"; x.fillRect(0, 0, 1536, 256);
      [["INR ARCADE", "#35efff"], ["PLAYER 1 READY", "#ffd23d"], ["HI-SCORES TONIGHT", "#ff3ad4"]].forEach(([txt, col], i) => {
        x.font = `${i === 0 ? 62 : 40}px "Press Start 2P", monospace`; x.textAlign = "center"; x.textBaseline = "middle";
        x.shadowColor = col; x.shadowBlur = 18; x.fillStyle = col; x.fillText(txt, 256 + i * 512, 132);
        x.shadowBlur = 0; x.strokeStyle = col; x.lineWidth = 6; x.strokeRect(22 + i * 512, 22, 468, 212);
      });
      const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
    })();
    const blimp = (scale) => {
      const b = new RacerBatch(), grp = new THREE.Group();
      put(b, 0, -5.2, 0, 7, 1.7, 2.2, 0x141228); put(b, 0, -5.2, 1.14, 5.6, 0.7, 0.06, 0xffe2a8, 2.2); put(b, 0, -5.2, -1.14, 5.6, 0.7, 0.06, 0xffe2a8, 2.2); // gondola and its windows
      [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(([, fy, fz]) => put(b, -14.5, fy * 3.4, fz * 3.4, 5, fy ? 4.4 : 0.3, fz ? 4.4 : 0.3, 0x1c1838)); // tail fins
      for (let i = -5; i <= 5; i++) { put(b, i * 2.6, -4.3, 0, 0.3, 0.3, 0.3, i % 2 ? 0x35efff : 0xff3ad4, 3); put(b, i * 2.6, 0, 4.72 - Math.abs(i) * 0.085 * Math.abs(i), 0.3, 0.3, 0.14, 0xffffff, 2.2); }
      put(b, 16.2, 0, 0, 0.6, 0.6, 0.6, 0xffffff, 4); put(b, -17, 3.6, 0, 0.5, 0.5, 0.5, 0xff3030, 4);
      for (const z of [-1, 1]) { put(b, -3, -4.4, z * 2.6, 2.6, 0.9, 0.9, 0x1c1838); put(b, -4.6, -4.4, z * 2.6, 0.3, 1.5, 1.5, 0x35efff, 1.6); }
      const hull = SPH.clone(); hull.applyMatrix4(new THREE.Matrix4().makeScale(16.5, 4.8, 4.8));
      hull.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(hull.attributes.position.count * 3).fill(0.085), 3));
      const body = new THREE.Mesh(mergeIndexed([hull, b.build("color")], ["position", "normal", "color"]), this.hullMat);
      const scr = new THREE.PlaneGeometry(17, 4.6, 12, 1), sp = scr.attributes.position;
      for (let i = 0; i < sp.count; i++) { const u = sp.getX(i) / 16.5; sp.setZ(i, 4.86 * Math.sqrt(Math.max(0, 1 - u * u * 0.92)) - 0.02); } // laid on the hull's curve
      const screen = new THREE.Mesh(scr, this.screenMat);
      const screen2 = screen.clone(); screen2.rotation.y = Math.PI;
      grp.add(body, screen, screen2);
      grp.scale.setScalar(scale);
      grp.traverse((o) => { o.frustumCulled = false; });
      s.add(grp);
      return grp;
    };
    this.hullMat = skyHullMaterial({});
    this.screenMat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: adTex }, uTime: { value: 0 } }, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform sampler2D tMap; uniform float uTime; varying vec2 vUv;
        void main(){
          // three posters; every eight seconds the next one slides in
          float ph = uTime / 8.0, k = floor(ph), sl = smoothstep(0.86, 1.0, fract(ph));
          vec3 c = texture2D(tMap, vec2((vUv.x + k + sl) / 3.0, vUv.y)).rgb;
          float led = 0.72 + 0.28 * step(0.35, fract(vUv.y * 46.0)) * step(0.3, fract(vUv.x * 170.0)); // the screen's own lamps
          gl_FragColor = vec4(c * led * 2.1, 1.0);
        }`,
    });
    this.blimps = [blimp(1), blimp(0.55)];

    // ---- 4. two helicopters with searchlights
    const heli = () => {
      const b = new RacerBatch(), grp = new THREE.Group();
      const hull = new THREE.IcosahedronGeometry(1, 2); b.add(hull, racerM(0, 0, 0, 2.5, 1.5, 1.45), 0x232a36); hull.dispose();
      put(b, -3.5, 0.3, 0, 4.8, 0.36, 0.36, 0x232a36); put(b, -5.8, 1.0, 0, 0.5, 1.7, 0.12, 0x232a36); put(b, -5.8, 0.4, 0, 1.3, 0.1, 1.4, 0x232a36);
      put(b, 1.35, 0.25, 0, 1.3, 0.85, 1.25, 0x8fd8ff, 0.5); // the canopy
      [-0.85, 0.85].forEach((z) => { put(b, 0, -1.75, z, 3.6, 0.1, 0.1, 0x3a3f48); [-1, 1].forEach((x) => put(b, x, -1.3, z * 0.9, 0.08, 0.9, 0.08, 0x3a3f48)); });
      put(b, 0, 0.2, 1.46, 0.3, 0.3, 0.1, 0x30ff60, 3); put(b, 0, 0.2, -1.46, 0.3, 0.3, 0.1, 0xff3030, 3); put(b, -5.9, 2.0, 0, 0.26, 0.26, 0.26, 0xffffff, 3);
      put(b, 1.9, -0.95, 0, 0.5, 0.4, 0.5, 0xfff0d2, 4);
      const body = new THREE.Mesh(b.build("color"), this.hullMat);
      const rotor = new THREE.Mesh(new THREE.CircleGeometry(4.8, 24), new THREE.MeshBasicMaterial({ color: 0xb8c8dc, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }));
      rotor.rotation.x = -Math.PI / 2; rotor.position.y = 1.75;
      const bl = new RacerBatch(); [0, Math.PI / 2].forEach((a) => bl.add(BOX, racerM(0, 1.77, 0, 9.6, 0.05, 0.32, 0, a), 0x15171c));
      const bladesM = new THREE.Mesh(bl.build("color"), this.hullMat);
      const beam = racerShaft(0xfff0d2, 0.35, 8, 70, 16); beam.position.set(1.9, -1.0, 0);
      grp.add(body, rotor, bladesM, beam);
      grp.userData = { blades: bladesM, beam };
      grp.traverse((o) => { o.frustumCulled = false; });
      s.add(grp);
      return grp;
    };
    this.helis = [heli(), heli()];

    // ---- 5. a drone formation: forty lights that fly from one figure to the next
    { const N = 40, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const c = new THREE.Color(NEON[i % 2 ? 0 : 1]); col.set([c.r * 2.2, c.g * 2.2, c.b * 2.2], i * 3); }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute("position", new THREE.BufferAttribute(pos, 3)); ge.setAttribute("aCol", new THREE.BufferAttribute(col, 3));
      this.droneN = N;
      this.drones = new THREE.Points(ge, new THREE.ShaderMaterial({
        uniforms: { uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: "attribute vec3 aCol; uniform float uPx; varying vec3 vCol; void main(){ vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uPx * 1000.0 / -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "varying vec3 vCol; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; gl_FragColor = vec4(vCol * (exp(-r * 9.0) + 0.25 * exp(-r * 2.5)), 1.0); }",
      }));
      this.drones.frustumCulled = false;
      s.add(this.drones);
      // the figures: a ring, a chevron, a diamond, a double helix seen side-on
      const fig = [];
      const F = (fn) => { const a = []; for (let i = 0; i < N; i++) a.push(fn(i / N, i)); fig.push(a); };
      F((u) => [Math.cos(u * 6.2832) * 9, Math.sin(u * 6.2832) * 9, 0]);
      F((u) => { const k = u * 2 - 1; return [k * 12, 7 - Math.abs(k) * 14, 0]; });
      F((u) => { const a = u * 4, f = a % 1, p = [[10, 0], [0, 10], [-10, 0], [0, -10], [10, 0]], i0 = Math.floor(a) % 4; return [p[i0][0] + (p[i0 + 1][0] - p[i0][0]) * f, p[i0][1] + (p[i0 + 1][1] - p[i0][1]) * f, 0]; });
      F((u, i) => [(u * 2 - 1) * 13, Math.sin(u * 12.566 + (i % 2) * Math.PI) * 5, Math.cos(u * 12.566 + (i % 2) * Math.PI) * 3]);
      this.figs = fig; }

    // ---- 6. rain: two thousand streaks falling through the air in front of us
    { const N = quiet ? 700 : 2200, pos = [], seed = [], corner = [];
      for (let i = 0; i < N; i++) {
        const x = rand(-34, 34), y = rand(0, 70), z = rand(-90, 9), sd = Math.random();
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
            p += side * aCorner.x * 0.022 - dir * aCorner.y * len;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vA = (0.5 + 0.5 * aSeed) * smoothstep(1.5, 6.0, -mv.z) * smoothstep(100.0, 60.0, -mv.z) * (1.0 - aCorner.y * 0.7);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: "uniform float uI; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.62, 0.7, 1.0) * vA * uI, 1.0); }",
      }));
      this.rain.frustumCulled = false;
      this.rain.layers.set(1); // (not in the floor's reflection)
      s.add(this.rain); }

    // ---- 7. a bank of storm cloud over the city, lit from below and, now and then, from within
    { this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(900, 260), new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uBolt: { value: new THREE.Vector3(0.5, 0.5, 0) }, uCity: { value: neon(0xff3ad4, 0.9) }, uMoon: { value: neon(0x8fc8ff, 0.95) } },
        transparent: true, depthWrite: false, fog: false,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `${GLSL_NOISE} uniform float uTime; uniform vec3 uBolt; uniform vec3 uCity; uniform vec3 uMoon; varying vec2 vUv;
          float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
          void main(){
            vec2 q = vec2(vUv.x * 7.0 + uTime * 0.012, vUv.y * 2.2);
            float d = fbm(vec3(q, uTime * 0.02)), d2 = fbm(vec3(q * 2.3 + 3.0, uTime * 0.03));
            float body = smoothstep(0.4, 0.7, d + 0.25 * d2 - 0.42 * (1.0 - smoothstep(0.0, 0.55, vUv.y)));
            float a = body * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.86, vUv.y) * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
            // lit from under by the city, silvered along the tops by a moon that never shows itself
            float under = smoothstep(0.75, 0.4, d + 0.25 * d2), top = smoothstep(0.52, 0.72, d2) * body;
            vec3 col = vec3(0.05, 0.022, 0.11) + uCity * under * (1.0 - vUv.y) * 0.9 + uMoon * top * top * (0.4 + 0.6 * vUv.y);
            // sheet lightning: a glow inside the bank, shaped by the cloud itself
            vec2 bd = (vUv - uBolt.xy) * vec2(3.4, 1.0);
            col += vec3(0.75, 0.82, 1.3) * uBolt.z * exp(-dot(bd, bd) * 16.0) * (0.35 + 1.4 * d2 * d);
            gl_FragColor = vec4(col, a * 0.94);
          }`,
      }));
      this.clouds.position.set(0, 262, -430);
      this.clouds.frustumCulled = false;
      this.clouds.renderOrder = -1;
      s.add(this.clouds);
      this.boltT = rand(3, 6); this.bolt = 0; this.boltAge = 9; }
    BOX.dispose(); SPH.dispose();
  }
  update(dt) {
    const g = this.g, t = (this.t += dt), calm = REDUCED_MOTION || GFX.calm, hw = g.city.hw;
    this.facade.material.uniforms.uTime.value = t;
    this.streams.material.uniforms.uTime.value = t;
    this.screenMat.uniforms.uTime.value = t;
    this.blades.material.color.setScalar(1.3 + 0.15 * Math.sin(t * 0.8));
    // blimps: one far and slow, one nearer the other way
    const [b0, b1] = this.blimps;
    const loop = (t0, span, T) => ((t0 % T) / T) * span * 2 - span;
    b0.position.set(loop(t * 1 + 40, hw(-300) + 70, 95), 166 + Math.sin(t * 0.21) * 3, -300); b0.rotation.set(0, 0, Math.sin(t * 0.17) * 0.02);
    b1.position.set(-loop(t * 1 + 18, hw(-150) + 40, 64), 80 + Math.sin(t * 0.3 + 2) * 1.6, -150); b1.rotation.set(0, Math.PI, Math.sin(t * 0.23) * 0.025);
    // helicopters: one holds station in front of the sun, working its light across the water; one crosses overhead
    const [h0, h1] = this.helis;
    h0.position.set(Math.sin(t * 0.19) * 8, 7.8 + Math.sin(t * 0.43) * 0.9, -62 + Math.sin(t * 0.13) * 6);
    h0.rotation.set(0, -Math.PI / 2 + Math.sin(t * 0.19 + 1.2) * 0.5, Math.cos(t * 0.19) * -0.1);
    h0.userData.blades.rotation.y = t * 13;
    h0.userData.beam.rotation.set(Math.PI + Math.sin(t * 0.5) * 0.28, 0, -0.35 + Math.sin(t * 0.37) * 0.3);
    const span1 = hw(-104) + 30, x1 = loop(t + 7, span1, 26);
    h1.position.set(x1, 60 + Math.sin(t * 0.6) * 1.2, -104); h1.rotation.set(0, 0, -0.12);
    h1.userData.blades.rotation.y = t * 13;
    h1.userData.beam.rotation.set(Math.PI + Math.sin(t * 0.7) * 0.25, 0, -0.5 + Math.sin(t * 0.45) * 0.25);
    const beamK = GFX.opt.beams ? (calm ? 0.2 : 0.34) : 0;
    h0.userData.beam.material.uniforms.uI.value = beamK; h1.userData.beam.material.uniforms.uI.value = beamK;
    // drones: nine seconds holding a figure, three flying to the next
    { const P = this.drones.geometry.attributes.position, n = this.figs.length, ph = t / 12, k = Math.floor(ph) % n, f = smoothstep(0.75, 1, ph % 1);
      const A = this.figs[k], B = this.figs[(k + 1) % n], cx = hw(-190) * 0.4, sp = Math.sin(t * 0.25) * 0.25, R = 0.62;
      for (let i = 0; i < this.droneN; i++) {
        const e = clamp(f * 1.6 - (i / this.droneN) * 0.6, 0, 1), m = e * e * (3 - 2 * e); // they leave in turn
        const x = A[i][0] + (B[i][0] - A[i][0]) * m, y = A[i][1] + (B[i][1] - A[i][1]) * m, z = A[i][2] + (B[i][2] - A[i][2]) * m;
        P.setXYZ(i, cx + (x * Math.cos(sp) + z * Math.sin(sp)) * R, 104 + y * R + Math.sin(t * 1.3 + i) * 0.2, -190 + (z * Math.cos(sp) - x * Math.sin(sp)) * R);
      }
      P.needsUpdate = true;
      this.drones.material.uniforms.uPx.value = (GFX.h / 844) * GFX.scenePR(); }
    // rain: steady, with gusts that lean it
    const gust = 0.5 + 0.5 * Math.sin(t * 0.23) * Math.sin(t * 0.071 + 1);
    this.rain.material.uniforms.uTime.value = t;
    this.rain.material.uniforms.uGust.value = calm ? 0 : gust;
    this.rain.material.uniforms.uI.value = (calm ? 0.28 : 0.4) * (0.75 + 0.5 * gust);
    // sheet lightning inside the cloud bank: a pulse and, sometimes, a second (never more than three a second)
    this.boltAge += dt;
    if ((this.boltT -= dt) <= 0) {
      this.boltT = rand(5, 10);
      this.boltAge = 0;
      this.double = !calm && Math.random() < 0.5;
      this.clouds.material.uniforms.uBolt.value.set(rand(0.3, 0.7), rand(0.3, 0.62), 0);
      this.boltK = calm ? 0.45 : rand(0.7, 1.15);
    }
    const a = this.boltAge, env = (x) => (x < 0 ? 0 : x < 0.08 ? x / 0.08 : Math.exp(-(x - 0.08) * 5));
    this.clouds.material.uniforms.uBolt.value.z = (this.boltK || 0) * Math.max(env(a), this.double ? 0.7 * env(a - 0.42) : 0);
    this.clouds.material.uniforms.uTime.value = t;
    // the cloud's flash lights the towers' glass a little too
    this.facade.material.uniforms.uK.value = 1 + 0.5 * this.clouds.material.uniforms.uBolt.value.z;
  }
}
