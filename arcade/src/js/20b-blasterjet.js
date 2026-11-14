// Risk Blaster's fighter, and the small tools its hardware is built with. Look only:
// nothing here reads or changes the score, the shields, the timer or the questions.

const BK = { HULL: 0x26304e, PLATE: 0x3d4b72, GUN: 0x232a3c, DARK: 0x10131c, PALE: 0xb9c4d8, STEEL: 0x6a7388, TEAM: 0x1f8fb4, ROCK: 0x4a4458 };
const BK_ROT = racerM(0, 0, 0, 1, 1, 1, -Math.PI / 2); // a loft built upward becomes one built nose-ward (-z)

// A flat slab cut from a polygon in the x-z plane ([x, z] points), t thick and centred
// on y = 0; its top edge is chamfered by bevel.
function blasterSlab(pts, t, bevel = 0) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const P = area > 0 ? pts.slice().reverse() : pts; // wound so the top faces up
  const n = P.length;
  let cx = 0, cz = 0;
  P.forEach((p) => { cx += p[0] / n; cz += p[1] / n; });
  const top = P.map(([x, z]) => { const d = Math.hypot(x - cx, z - cz) || 1, k = Math.max(0, 1 - bevel / d); return [cx + (x - cx) * k, cz + (z - cz) * k]; });
  const h = t / 2, hm = bevel ? h - Math.min(bevel * 0.6, t * 0.45) : h;
  const pos = [];
  const v = (p, y) => pos.push(p[0], y, p[1]);
  THREE.ShapeUtils.triangulateShape(P.map((p) => new THREE.Vector2(p[0], p[1])), []).forEach(([a, b, c]) => {
    const s = (P[b][0] - P[a][0]) * (P[c][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[c][0] - P[a][0]);
    const [i, j, k] = s < 0 ? [a, b, c] : [a, c, b];
    v(top[i], h); v(top[j], h); v(top[k], h);
    v(P[i], -h); v(P[k], -h); v(P[j], -h);
  });
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    v(P[i], -h); v(P[j], -h); v(P[j], hm); v(P[i], -h); v(P[j], hm); v(P[i], hm);
    if (bevel) { v(P[i], hm); v(P[j], hm); v(top[j], h); v(P[i], hm); v(top[j], h); v(top[i], h); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
// The same geometry n times over, each copy tagged with its number (aIdx).
function blasterRepeat(geo, n) {
  const out = new THREE.BufferGeometry(), count = geo.attributes.position.count;
  for (const name in geo.attributes) {
    const a = geo.attributes[name], arr = new Float32Array(a.array.length * n);
    for (let i = 0; i < n; i++) arr.set(a.array, i * a.array.length);
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  const idx = new Float32Array(count * n);
  for (let i = 0; i < n; i++) idx.fill(i, i * count, (i + 1) * count);
  out.setAttribute("aIdx", new THREE.BufferAttribute(idx, 1));
  geo.dispose();
  return out;
}
// Unlit HDR parts whose brightness comes from numbered channels (uL): lamps that blink and surge.
function blasterLampMaterial(n) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uL: { value: new Float32Array(n).fill(1) } }),
    vertexShader: `attribute vec3 aCol; attribute float aCh; uniform float uL[${n}]; varying vec3 vC; varying float vDepth;
      void main(){ vC = aCol * uL[int(aCh + 0.5)]; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `${GLSL_FOG_PARS} varying vec3 vC; varying float vDepth;
      void main(){ gl_FragColor = vec4(vC * (1.0 - 0.7 * smoothstep(uFogNear, uFogFar, vDepth)), 1.0); }`,
  });
}
// Dark structural metal, lit without the scene's lights: a key from the camera's side,
// the tunnel's own glow on faces that look inward, and the light of a blast. Parts
// tagged aGlow shine: 1 the wave colour, 2 warm white, 3 energy flowing along a pylon.
function blasterHullMaterial(o = {}) {
  const wrap = !!o.wrap; // ribs repeat down the tunnel, sliding toward the camera
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), {
      uWave: { value: neon(WAVE_COLORS[0], 1) }, uTime: { value: 0 }, uScroll: { value: 0 }, uSpin: { value: 0 }, uFade: { value: 1 }, uFogK: { value: o.fog === undefined ? 1 : o.fog },
      uFlash: { value: 0 }, uFlashZ: { value: -50 }, uFlashColor: { value: new THREE.Color(1, 1, 1) }, uSurgeZ: { value: 99 }, uHot: { value: 0 },
    }),
    vertexShader: `attribute vec3 aCol; attribute float aGlow; ${wrap ? "attribute float aIdx; uniform float uScroll; uniform float uSpin;" : ""}
      varying vec3 vC; varying float vGlow; varying vec3 vN; varying vec3 vW; varying float vDepth;
      void main(){
        vec3 p = position; vec3 n = normal;
        ${wrap ? `float a = aIdx * 0.5236 - uSpin * 0.35; float c = cos(a); float s = sin(a);
        p.xy = vec2(c * p.x - s * p.y, s * p.x + c * p.y); n.xy = vec2(c * n.x - s * n.y, s * n.x + c * n.y);
        float z = -aIdx * 24.0 - 12.0 + uScroll; p.z += 4.0 - mod(4.0 - z, 168.0);` : ""}
        vec4 w = modelMatrix * vec4(p, 1.0);
        vW = w.xyz; vN = normalize(mat3(modelMatrix) * n); vC = aCol; vGlow = aGlow;
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS}
      uniform vec3 uWave; uniform vec3 uFlashColor; uniform float uTime; uniform float uFade; uniform float uFogK; uniform float uFlash; uniform float uFlashZ; uniform float uSurgeZ; uniform float uHot;
      varying vec3 vC; varying float vGlow; varying vec3 vN; varying vec3 vW; varying float vDepth;
      void main(){
        vec3 n = normalize(vN);
        float key = max(dot(n, normalize(vec3(0.25, 0.5, 0.83))), 0.0);
        float inner = max(dot(n.xy, -normalize(vW.xy + 1e-4)), 0.0);
        vec3 col = vC * (0.2 + 0.95 * key) + vC * uWave * inner * 0.9;
        col += vC * uFlashColor * (uFlash * exp(-abs(vW.z - uFlashZ) * 0.05) * 2.2);
        float surge = exp(-abs(vW.z - uSurgeZ) * 0.09);
        if (vGlow > 0.5) {
          float pulse = 0.78 + 0.22 * sin(uTime * 1.9 + vW.z * 0.07);
          vec3 g = vGlow < 1.5 ? uWave * 2.3 : (vGlow < 2.5 ? vec3(2.3, 2.0, 1.6) : uWave * (0.7 + 2.4 * pow(0.5 + 0.5 * sin(length(vW.xy) * 3.2 + uTime * 5.0), 6.0)));
          col = g * vC * (pulse + surge * 1.6 + uHot * 1.6);
        }
        col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth) * uFogK) * uFade;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// The built-in fighter, drawn when the player's own model (20d-blasterfighter.js) is not
// in the build: a twin-engine delta with canards and canted fins. Layered armour over
// an eight-sided hull, a faceted glass canopy, lit intakes, wing strips, fences and
// missile rails, ailerons that work, afterburners with shock diamonds and heat haze,
// wingtip contrails, and an energy shield that flares when it takes a hit.
//   ship: where it is and where it aims (the game drives this, as before)
//   rig:  bank, pitch, recoil, rolls (look only)
class BlasterJet {
  constructor(game) {
    const g = (this.g = game), env = g.env, C = BK;
    const ship = (this.ship = new THREE.Group());
    const rig = (this.rig = new THREE.Group());
    ship.add(rig);
    const P = new RacerBatch(), F = new RacerBatch(), L = new RacerBatch(["aCh"]);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const put = (b, geo, m, color, k = 1, v) => { b.add(geo, m, color, k, v); geo.dispose(); };
    const loft = (b, rings, color, m) => put(b, cyLoft(rings.map(([z, w, h, c]) => [-z, w, h, c])), m ? m.clone().multiply(BK_ROT) : BK_ROT, color);
    const slab = (b, pts, t, bevel, m, color) => put(b, blasterSlab(pts, t, bevel), m, color);
    const lamp = (ch, w, h, d, x, y, z, color, k = 1.6) => L.add(box, racerM(x, y, z, w, h, d), color, k, { aCh: ch });
    const mir = (pts, sd) => pts.map(([x, z]) => [x * sd, z]);

    // hull: eight-sided fuselage, pale radome behind a team-colour band, dorsal spine, pitot
    loft(P, [[1.2, 0.4, 0.17, 0.09], [0.55, 0.5, 0.25, 0.12], [-0.35, 0.46, 0.29, 0.13], [-1.0, 0.33, 0.24, 0.1], [-1.5, 0.21, 0.16, 0.07]], C.HULL);
    loft(P, [[-1.5, 0.21, 0.16, 0.07], [-1.85, 0.11, 0.09, 0.04], [-2.1, 0.03, 0.025, 0.01]], C.PALE);
    loft(P, [[-1.4, 0.245, 0.19, 0.08], [-1.5, 0.22, 0.17, 0.074]], C.TEAM);
    loft(P, [[1.05, 0.09, 0.05, 0.03], [0.2, 0.15, 0.09, 0.05], [-0.45, 0.17, 0.1, 0.05]], C.PLATE, racerM(0, 0.27, 0));
    put(F, new THREE.CylinderGeometry(0.012, 0.012, 0.36, 5), racerM(0, 0, -2.25, 1, 1, 1, Math.PI / 2), C.STEEL);
    for (let i = 0; i < 4; i++) F.add(box, racerM(0, 0.365, 0.02 + i * 0.13, 0.17, 0.014, 0.045), C.DARK); // spine vents
    lamp(0, 0.03, 0.014, 0.5, 0, 0.335, 0.78, 0x5fd8ff, 1.2);
    put(P, racerPlate(0.26, 0.07, 0.5, 0.025, true), racerM(0, 0.02, 1.2), C.PLATE); // tail between the engines
    lamp(0, 0.1, 0.03, 0.02, 0, 0.03, 1.46, 0xffffff, 1.5);
    // canopy frame and lit sills (the glass itself is its own mesh, below)
    F.add(box, racerM(0, 0.4, -0.92, 0.025, 0.02, 0.86, 0.04), C.DARK);
    [[-0.75, 0.21, 0.4], [-1.15, 0.18, 0.385]].forEach(([z, w, y]) => {
      F.add(box, racerM(0, y, z, w * 1.5, 0.02, 0.03), C.DARK);
      [-1, 1].forEach((sd) => F.add(box, racerM(sd * w, y - 0.07, z, 0.02, 0.15, 0.03, 0, 0, sd * 0.35), C.DARK));
    });
    [-1, 1].forEach((sd) => lamp(4, 0.02, 0.02, 0.8, sd * 0.205, 0.245, -0.9, 0x5fd8ff, 1.1));

    const WING = [[0.44, -0.72], [0.95, -0.2], [1.82, 0.62], [1.82, 0.95], [1.1, 1.0], [0.44, 0.98]];
    const ARMOR = [[0.52, -0.5], [0.92, -0.1], [1.56, 0.5], [1.56, 0.84], [0.52, 0.86]];
    [-1, 1].forEach((sd) => {
      // intake: armoured box, dark mouth, a lit fan, a shoulder plate with a pale edge
      put(P, racerPlate(0.3, 0.3, 0.9, 0.05, true), racerM(sd * 0.55, -0.02, -0.35), C.PLATE);
      P.add(box, racerM(sd * 0.55, -0.02, -0.805, 0.22, 0.2, 0.03), C.DARK);
      lamp(5, 0.15, 0.13, 0.02, sd * 0.55, -0.02, -0.815, 0x5fd8ff, 1.5);
      put(F, racerPlate(0.34, 0.035, 0.6, 0.02, true), racerM(sd * 0.55, 0.15, -0.3), C.HULL);
      F.add(box, racerM(sd * 0.55, 0.172, -0.56, 0.3, 0.012, 0.05), C.PALE);
      // wing: a bevelled delta, an armour panel over it, a recognition stripe, a team chevron
      const wm = racerM(0, -0.02, 0, 1, 1, 1, 0, 0, sd * -0.06), up = (y) => wm.clone().multiply(racerM(0, y, 0));
      slab(P, mir(WING, sd), 0.085, 0.03, wm, C.HULL);
      slab(P, mir(ARMOR, sd), 0.03, 0.012, up(0.05), C.PLATE);
      slab(F, mir([[0.62, 0.22], [1.5, 0.6], [1.5, 0.72], [0.62, 0.36]], sd), 0.012, 0, up(0.07), C.PALE);
      slab(F, mir([[0.56, -0.38], [0.8, -0.14], [0.8, 0.0], [0.56, -0.2]], sd), 0.012, 0, up(0.07), C.TEAM);
      const E = (x, z) => new THREE.Vector3(sd * x, -0.02 - 0.06 * x, z); // a point on the drooping wing
      racerStrut(L, box, E(0.47, -0.69), E(0.95, -0.2), 0.024, 0x5fd8ff, 1.5, { aCh: 0 }); // leading-edge strips
      racerStrut(L, box, E(0.95, -0.2), E(1.8, 0.6), 0.024, 0x5fd8ff, 1.5, { aCh: 0 });
      [1.0, 1.4].forEach((x) => F.add(box, racerM(sd * x, 0.045 - 0.06 * x, 0.62, 0.02, 0.07, 0.42), C.DARK)); // fences
      // wingtip rail and missile
      P.add(box, racerM(sd * 1.85, -0.13, 0.74, 0.07, 0.07, 0.8), C.GUN);
      put(F, new THREE.CylinderGeometry(0.045, 0.045, 0.6, 6), racerM(sd * 1.85, -0.21, 0.7, 1, 1, 1, Math.PI / 2), C.PALE);
      put(F, new THREE.ConeGeometry(0.045, 0.16, 6), racerM(sd * 1.85, -0.21, 0.32, 1, 1, 1, -Math.PI / 2), C.TEAM);
      // cannon in the wing root
      P.add(box, racerM(sd * 0.72, -0.09, -0.62, 0.07, 0.07, 0.95), C.GUN);
      F.add(box, racerM(sd * 0.72, -0.09, -1.06, 0.1, 0.1, 0.09), C.STEEL);
      put(P, racerPlate(0.2, 0.09, 0.62, 0.03, true), racerM(sd * 0.72, -0.05, -0.3), C.PLATE);
      lamp(7, 0.05, 0.05, 0.03, sd * 0.72, -0.09, -1.115, 0xffd9a0, 2.4);
      // canard
      slab(P, mir([[0.3, -1.3], [0.8, -1.04], [0.8, -0.92], [0.3, -1.0]], sd), 0.04, 0.012, racerM(0, 0.06, 0, 1, 1, 1, 0, 0, sd * 0.1), C.PLATE);
      // canted fin: team-colour cap, pale rudder flash, a beacon at its tip
      const fm = racerM(sd * 0.4, 0.2, 0, 1, 1, 1, 0, 0, Math.PI / 2 - sd * 0.32);
      slab(P, [[0, 0.3], [0.8, 0.92], [0.8, 1.24], [0, 1.2]], 0.05, 0.015, fm, C.HULL);
      slab(F, [[0.6, 0.77], [0.8, 0.92], [0.8, 1.24], [0.6, 1.23]], 0.06, 0, fm, C.TEAM);
      slab(F, [[0.2, 0.62], [0.52, 0.86], [0.52, 0.94], [0.2, 0.72]], 0.058, 0, fm, C.PALE);
      lamp(2, 0.04, 0.04, 0.08, sd * 0.66, 0.975, 1.2, 0xffffff, 2.6);
      // engine: nacelle, turbine bands, ten nozzle petals, a white-hot core and a lit lip
      const ex = sd * 0.36;
      put(P, new THREE.CylinderGeometry(0.235, 0.285, 1.1, 10), racerM(ex, 0.02, 0.75, 1, 1, 1, Math.PI / 2), C.GUN);
      [0.45, 0.85].forEach((z) => put(F, new THREE.TorusGeometry(0.275, 0.02, 4, 12), racerM(ex, 0.02, z), C.STEEL));
      put(F, racerPlate(0.3, 0.04, 0.6, 0.02, true), racerM(sd * 0.38, 0.3, 0.72, 1, 1, 1, 0, 0, sd * -0.2), C.PLATE);
      for (let i = 0; i < 10; i++) {
        F.add(box, new THREE.Matrix4().makeTranslation(ex, 0.02, 0).multiply(new THREE.Matrix4().makeRotationZ((i / 10) * Math.PI * 2)).multiply(racerM(0, 0.205, 1.4, 0.135, 0.02, 0.26, 0.22)), C.STEEL);
      }
      const hot = new THREE.CircleGeometry(0.17, 12), core = new THREE.CircleGeometry(0.09, 10), lip = new THREE.TorusGeometry(0.19, 0.018, 4, 14);
      L.add(hot, racerM(ex, 0.02, 1.32), 0xff9a3d, 1.3, { aCh: 3 });
      L.add(core, racerM(ex, 0.02, 1.33), 0xfff0d0, 1.9, { aCh: 3 });
      L.add(lip, racerM(ex, 0.02, 1.5), 0xffb060, 1.2, { aCh: 3 });
      [hot, core, lip].forEach((x) => x.dispose());
    });

    this.paint = racerCarPaint(env, false);
    const hull = new THREE.Mesh(P.build("color"), this.paint);
    const fine = new THREE.Mesh(F.build("color"), this.paint);
    this.lamps = blasterLampMaterial(8);
    const lamps = new THREE.Mesh(L.build(), this.lamps);
    const glassGeo = cyLoft([[0.4, 0.13, 0.05, 0.04], [0.75, 0.2, 0.15, 0.08], [1.15, 0.17, 0.13, 0.07], [1.5, 0.06, 0.03, 0.02]]);
    glassGeo.applyMatrix4(racerM(0, 0.25, 0).multiply(BK_ROT));
    glassGeo.computeVertexNormals();
    this.glass = new THREE.MeshStandardMaterial({ color: 0x0b1a2a, metalness: 0.9, roughness: 0.06, envMap: env, envMapIntensity: 2.2, flatShading: true, emissive: 0x0a3a66, emissiveIntensity: 0.3 });
    rig.add(hull, fine, lamps, new THREE.Mesh(glassGeo, this.glass));

    // ailerons, hinged on the trailing edge: they deflect as the fighter rolls
    this.flaps = [-1, 1].map((sd) => {
      const b = new RacerBatch();
      slab(b, mir([[0.5, 0.0], [1.76, -0.03], [1.72, 0.2], [0.5, 0.26]], sd), 0.05, 0.015, null, C.PLATE);
      slab(b, mir([[1.3, -0.02], [1.76, -0.03], [1.72, 0.2], [1.3, 0.22]], sd), 0.058, 0, null, C.PALE);
      const m = new THREE.Mesh(b.build("color"), this.paint);
      m.position.set(0, -0.02, 1.0);
      m.rotation.z = sd * -0.06;
      rig.add(m);
      return m;
    });

    // afterburners: an outer cone and a hot inner one per engine, shock diamonds running down them
    const fb = new RacerBatch(["aCore"]);
    [-1, 1].forEach((sd) => {
      put(fb, new THREE.CylinderGeometry(0.03, 0.2, 1, 10, 4, true), racerM(sd * 0.36, 0.02, 0.5, 1, 1, 1, Math.PI / 2), null, 1, { aCore: 0 });
      put(fb, new THREE.CylinderGeometry(0.01, 0.11, 0.7, 8, 3, true), racerM(sd * 0.36, 0.02, 0.35, 1, 1, 1, Math.PI / 2), null, 1, { aCore: 1 });
    });
    this.flameMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLen: { value: 1 }, uI: { value: 1 }, uHot: { value: new THREE.Color(1.6, 2.2, 3.2) }, uCool: { value: new THREE.Color(3.0, 1.1, 0.25) } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `attribute float aCore; uniform float uTime; uniform float uLen; varying float vT; varying float vCore; varying vec3 vN; varying vec3 vV;
        void main(){
          vT = position.z / (aCore > 0.5 ? 0.7 : 1.0); vCore = aCore;
          vec3 p = position; vec2 axis = vec2(sign(p.x) * 0.36, 0.02);
          p.xy = axis + (p.xy - axis) * (1.0 + 0.1 * vT * sin(uTime * 14.0 + vT * 9.0 + axis.x * 8.0));
          p.z *= uLen;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform float uTime; uniform float uI; uniform vec3 uHot; uniform vec3 uCool; varying float vT; varying float vCore; varying vec3 vN; varying vec3 vV;
        void main(){
          float f = abs(dot(normalize(vN), normalize(vV)));
          float body = pow(1.0 - vT, 1.4) * (0.35 + 0.65 * f);
          float diamonds = 0.7 + 0.5 * pow(0.5 + 0.5 * sin(vT * 15.0 - uTime * 9.0), 3.0);
          vec3 c = mix(uCool, uHot, vCore > 0.5 ? 1.0 : pow(1.0 - vT, 3.0) * 0.6);
          gl_FragColor = vec4(c * (body * diamonds * uI * (vCore > 0.5 ? 1.3 : 0.75)), 1.0);
        }`,
    });
    const flames = new THREE.Mesh(fb.build(), this.flameMat);
    flames.position.z = 1.5;
    flames.renderOrder = 5;
    rig.add(flames);

    // the shield: a hexagon lattice on a bubble of force, all but invisible until something hits it
    this.shieldMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.25, 0.85, 1.0) }, uOn: { value: 1 }, uHit: { value: 0 }, uHitP: { value: new THREE.Vector3(0, 0.6, -0.8) }, uGlow: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOn; uniform float uHit; uniform vec3 uHitP; uniform float uGlow; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){
          float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
          const vec2 s = vec2(1.0, 1.7320508);
          vec2 q = vP.xz * 5.0 + vec2(0.0, uTime * 0.15);
          vec4 hc = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
          vec4 h = vec4(q - hc.xy * s, q - (hc.zw + 0.5) * s);
          vec2 a = abs(dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw);
          float line = 1.0 - smoothstep(0.0, 0.07, 0.5 - max(dot(a, s * 0.5), a.x));
          float dist = distance(vP, uHitP);
          float ring = uHit * exp(-pow((dist - (1.0 - uHit) * 2.4) * 3.0, 2.0));
          float flare = uHit * uHit * exp(-dist * 1.6);
          float base = uOn * (fres * (0.06 + 0.4 * uGlow) + line * fres * (0.12 + 0.6 * uGlow) + line * 0.008);
          gl_FragColor = vec4(uColor * (base + line * (ring * 1.6 + flare * 1.2) + fres * (ring + flare) * 0.8), 1.0);
        }`,
    });
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), this.shieldMat);
    this.shield.scale.set(2.15, 0.9, 2.35);
    this.shield.position.set(0, 0.06, -0.25);
    this.shield.renderOrder = 7;
    rig.add(this.shield);

    // what the game reads: engine and gun positions, glows it flickers, lights it blinks
    this.nozzles = [new THREE.Vector3(-0.36, 0.02, 1.52), new THREE.Vector3(0.36, 0.02, 1.52)];
    this.muzzles = [new THREE.Vector3(-0.72, -0.09, -1.14), new THREE.Vector3(0.72, -0.09, -1.14)];
    this.engineGlows = this.nozzles.map((p) => { const s = glowSprite(neon(COLORS.orange, 1.7), 0.5, 0.7); s.position.copy(p); rig.add(s); return s; });
    this.wingLights = [[-1.85, COLORS.magenta], [1.85, COLORS.cyan]].map(([x, c]) => { const s = glowSprite(neon(c, 2.6), 0.42, 1); s.position.set(x, -0.13, 1.14); rig.add(s); return s; });
    this.tips = [new THREE.Vector3(-1.85, -0.13, 1.14), new THREE.Vector3(1.85, -0.13, 1.14)];
    this.contrails = this.tips.map(() => new Trail({ length: 18, width: 0.03, color: 0xbfe8ff, intensity: 0.7 }));
    this.contrails.forEach((t) => { g.scene.add(t.mesh); });
    box.dispose();
    this.heat = 0; this.heatTo = 0; this.rollV = 0; this.recoil = 0; this.gun = 0; this.waggle = 0; this.spinT = 0; this.spinDir = 1; this.acc = 0; this.shieldOn = 1;
    this._v = new THREE.Vector3();
    this._c = new THREE.Color();
    this.glowCool = neon(COLORS.orange, 1.2);
    this.glowHot = neon(0x9fd8ff, 1.7);
  }
  // the guns fire: a kick back and a muzzle glow
  fire() { this.recoil = 1; this.gun = 1; }
  // a clean hit: a quick wing waggle
  hit() { if (!REDUCED_MOTION && !GFX.calm) this.waggle = 1; }
  // a streak heats the engines: longer, bluer flames, brighter strips and shield
  setCombo(c) { this.heatTo = clamp((c - 1) / 7, 0, 1); }
  // a shield is lost: the lattice flares red from the point of impact
  shieldLost() {
    const u = this.shieldMat.uniforms;
    u.uHit.value = 1;
    u.uHitP.value.set(rand(-0.4, 0.4), 0.55, -0.7).normalize();
    u.uColor.value.setRGB(1.0, 0.28, 0.2);
  }
  // a shield comes back: the lattice sweeps on from the nose
  shieldUp() {
    const u = this.shieldMat.uniforms;
    u.uHit.value = 0.9;
    u.uHitP.value.set(0, 0.1, -1);
    u.uColor.value.setRGB(0.6, 1.0, 1.0);
  }
  // through the warp between waves: one full roll
  warp() { if (!REDUCED_MOTION && !GFX.calm) { this.spinT = 1; this.spinDir = Math.random() < 0.5 ? -1 : 1; } }
  down() { this.ship.visible = false; this.contrails.forEach((t) => { t.mesh.visible = false; }); }
  update(dt, sp, w) {
    const g = this.g, t = g.t, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm, h = Math.min(dt, 0.05);
    this.heat += (this.heatTo - this.heat) * Math.min(1, dt * 3);
    const heat = this.heat;
    // bank into the drift and the pointer; waggle after a hit; one full roll through the warp
    let roll = (quiet ? 0 : -Pointer.x * 0.4) - Math.cos(t * 0.9) * 0.14;
    if (this.waggle > 0) { this.waggle = Math.max(0, this.waggle - dt * 1.5); roll += Math.sin((1 - this.waggle) * Math.PI * 2) * 0.5 * this.waggle; }
    if (this.spinT > 0) {
      this.spinT = Math.max(0, this.spinT - dt / 1.2);
      roll += this.spinDir * Math.PI * 2 * smoothstep(0, 1, 1 - this.spinT);
      if (this.spinT === 0) rig.rotation.z -= this.spinDir * Math.PI * 2; // a whole turn is no turn: nothing to unwind
    }
    this.rollV += ((roll - rig.rotation.z) * 60 - this.rollV * 11) * h;
    rig.rotation.z += this.rollV * h;
    rig.rotation.x += ((quiet ? 0 : Pointer.y * 0.1) + this.recoil * 0.05 - rig.rotation.x) * Math.min(1, dt * 6);
    this.recoil *= Math.pow(0.004, dt);
    this.gun *= Math.pow(0.02, dt);
    rig.position.z = this.recoil * 0.14;
    const d = clamp(this.rollV * 0.35, -0.5, 0.5);
    this.flaps[0].rotation.x = d;
    this.flaps[1].rotation.x = -d;
    // engines
    const fu = this.flameMat.uniforms;
    fu.uLen.value = 0.8 + heat * 0.7 + w * 1.8;
    fu.uI.value = 0.42 + heat * 0.35 + w * 0.8;
    fu.uCool.value.setRGB(lerp(3.0, 1.2, heat), lerp(1.1, 1.9, heat), lerp(0.25, 3.0, heat));
    this.engineGlows.forEach((s) => s.material.color.copy(this.glowCool).lerp(this.glowHot, heat));
    const L = this.lamps.uniforms.uL.value;
    L[0] = 1 + heat * 0.8;
    L[2] = Math.pow(Math.max(0, Math.sin(t * 2.6)), 8); // fin beacons: a soft pulse, well under 1 Hz
    L[3] = 0.85 + 0.12 * Math.sin(t * 7) + heat * 0.6 + w;
    L[5] = 0.7 + 0.3 * Math.sin(t * 2.2);
    L[7] = this.gun;
    this.glass.envMapIntensity = 2.1 + 0.5 * Math.sin(t * 0.8);
    // shield: fades with the shields left, glows with the streak, settles back to blue after a hit
    const su = this.shieldMat.uniforms;
    this.shieldOn += (clamp(g.shields / 3, 0, 1) - this.shieldOn) * Math.min(1, dt * 4);
    su.uOn.value = this.shieldOn;
    su.uGlow.value = heat * 0.6;
    su.uHit.value = Math.max(0, su.uHit.value - dt * 1.3);
    if (su.uHit.value === 0) su.uColor.value.lerp(this._c.setRGB(lerp(0.25, 1.0, heat * heat), 0.85, lerp(1.0, 0.45, heat * heat)), Math.min(1, dt * 4));
    this.shield.visible = su.uHit.value > 0 || this.shieldOn > 0.01;
    rig.updateMatrixWorld();
    GFX.heatAt(g.camera, this._v.set(0, 0.02, 2.2).applyMatrix4(rig.matrixWorld), 0.55 * g.shipScale, 0.4 + 0.6 * Math.max(heat, Math.min(1, w)));
    // wingtip contrails, sampled at a fixed 60 Hz like the engine trails
    this.acc = Math.min(4 / 60, this.acc + dt);
    while (this.acc >= 1 / 60) {
      this.acc -= 1 / 60;
      const step = Math.min(sp * 0.3, 9) / 60;
      this.contrails.forEach((tr, j) => {
        tr.width = 0.03 * g.shipScale * (1 + heat);
        tr.shift(0, 0, step);
        tr.push(this._v.copy(this.tips[j]).applyMatrix4(rig.matrixWorld));
      });
    }
  }
}
