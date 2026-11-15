// Combat and impact effects shared by Risk Blaster, Boss Rush and Nest Egg Run. One kit, so a shot, a blow and a
// blast mean the same thing in every game:
//   a right answer   a hot white heart, sparks in the answer's colour, a ring, the whole picture's glow swelling
//   a wrong answer   a dull red fizzle: short dark-red sparks that fall, a puff of dark smoke, no ring, no glow
//   a blast          layers: a white flash, fire that cools from yellow to dark red, smoke that lingers, embers
//                    that drift, fast sparks, a ring, light on whatever stands near
// Everything is pooled and built with the scene (nothing is created when a hit lands), and everything runs on the
// show clock: call update(VFX.dt). Nothing here knows a rule: it is told what happened and shows it.
//
//   const fx = new CombatFX(this, { unit: 1, ground: 0 });      // in a Scene3D's constructor, after its scene
//   fx.update(VFX.dt);                                           // every frame
//   fx.bolt(from, to, color, { dur, width, onHit })              a laser bolt: white core, coloured sheath, tapered tail
//   fx.beam(from, to, color, { dur, width })                     a beam that holds between two points (a handle: .set(a,b), .stop())
//   fx.muzzle(pos, dir, color, size)                             the flash at a gun, and its light
//   fx.impact(pos, color, { size, dir })                         a right answer's hit
//   fx.fizzle(pos, { size })                                     a wrong answer's reject
//   fx.explosion(pos, { size, color, smoke, ring, ground })      a layered blast
//   fx.sparks(pos, color, { n, speed, dir, spread, gravity, life, len })
//   fx.embers(pos, color, { n, rise, life })                     slow, drifting
//   fx.fire(pos, { size, life, vel }) / fx.smoke(pos, { size, life, vel, dark, cold })   (cold: smoke with no fire under it)
//   fx.debris(pos, { n, size, speed, color, hot, gravity })      tumbling chunks (armour, glass)
//   fx.light(pos, color, intensity, dur, range)                  a real light for a moment (it lights lit materials)
//   fx.ring(pos, color, { size, dur, flat })                     a shock ring (flat: lying on the ground)
//   fx.mark(kind, pos, color, { size, dur, flat })               a warning marker before an attack: "ring" | "lock" | "bang"
//   fx.scorch(pos, { size, life, kind })                         a mark left on the ground: "scorch" | "skid"
//   fx.trailer(fn, { smoke, fire, sparks, rate, a })             smoke or fire trailing from a moving point (a handle: .on; a: how thick its smoke)
//   fx.drift                                                     the world's scroll (units/s) carried by every particle
const fxRGB = (c, k = 1) => { const q = c && c.isColor ? c : new THREE.Color(c); return [q.r * k, q.g * k, q.b * k]; };

// Sparks and bolts: two crossed blades shaped where they are drawn (a pointed head, a tail thinning to nothing),
// a white heart in a sheath of colour. (After Risk Blaster's dart; this one is hidden by what stands in front of it.)
function fxDartMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, extensions: { derivatives: true },
    vertexShader: "varying vec3 vC; varying vec2 vUv; void main(){ vUv = uv; vC = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\nvC = instanceColor;\n#endif\ngl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
    fragmentShader: `varying vec3 vC; varying vec2 vUv;
      void main(){
        float t = vUv.y, x = abs(vUv.x - 0.5) * 2.0;
        float w = t < 0.86 ? pow(t / 0.86, 1.5) : 1.0 - (t - 0.86) / 0.14;
        float aa = fwidth(x) * 1.2 + 1e-4;
        float body = 1.0 - smoothstep(w - aa, w, x), core = 1.0 - smoothstep(w * 0.42 - aa, w * 0.42, x);
        if (body < 0.004) discard;
        float hot = max(max(vC.r, vC.g), vC.b);
        gl_FragColor = vec4(mix(vC * (0.5 + 0.5 * t), vC * 0.5 + vec3(1.3) * min(1.0, hot), core) * body, 1.0);
      }`,
  });
}
function fxDartGeo() {
  const g = new THREE.BufferGeometry(), pos = [], uv = [];
  for (const [ax, ay] of [[1, 0], [0, 1]])
    [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].forEach(([a, z]) => { pos.push(a * ax, a * ay, z); uv.push(a + 0.5, z + 0.5); });
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
// Fire and smoke: discs that face the lens, eaten away by noise as they age. Fire adds light; smoke covers.
function fxPuffMaterial(fire) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: fire ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: `attribute vec3 aPos; attribute vec4 aData; attribute vec4 aCol; varying vec2 vUv; varying vec4 vCol; varying vec2 vAge;
      void main(){
        float c = cos(aData.y), s = sin(aData.y);
        vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * aData.x;
        vec4 mv = viewMatrix * vec4(aPos, 1.0);
        mv.xy += q;
        vUv = position.xy; vCol = aCol; vAge = aData.zw;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_NOISE}
      varying vec2 vUv; varying vec4 vCol; varying vec2 vAge;
      void main(){
        float age = vAge.x, seed = vAge.y, r = length(vUv);
        float n = vnoise(vec3(vUv * 2.3 + seed * 17.0, age * 2.2 + seed * 5.0)) * 0.62 + vnoise(vec3(vUv * 5.2 - seed * 9.0, age * 3.1)) * 0.38;
        float body = 1.0 - smoothstep(0.3, 1.0, r + (n - 0.5) * 0.8 + age * 0.3);
        if (body < 0.004) discard;
        ${fire
          ? `float heat = body * (1.0 - age);
             vec3 col = mix(vCol.rgb * 0.22, vCol.rgb, smoothstep(0.0, 0.45, heat));
             col = mix(col, vec3(1.0, 0.9, 0.7) * 1.7, smoothstep(0.74, 1.0, heat));
             gl_FragColor = vec4(col * body * vCol.a * (1.0 - age * age), 1.0);`
          : `float a = body * vCol.a * (1.0 - smoothstep(0.45, 1.0, age)) * smoothstep(0.0, 0.08, age);
             vec3 col = vCol.rgb * (0.5 + 0.7 * n) + vec3(1.0, 0.45, 0.12) * pow(1.0 - age, 5.0) * body * 0.9 * step(seed, 1.5); // (young smoke glows from the fire under it, unless it is cold: seed above 1.5)
             gl_FragColor = vec4(col, a);`}
      }`,
  });
}
// Debris: small angular chunks, flat-shaded, a hot edge that cools.
function fxChunkMaterial() {
  return new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    vertexShader: "varying vec3 vV; varying vec3 vC; void main(){ vC = vec3(1.0);\n#ifdef USE_INSTANCING_COLOR\nvC = instanceColor;\n#endif\nvec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vV = mv.xyz; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `varying vec3 vV; varying vec3 vC;
      void main(){
        vec3 n = normalize(cross(dFdx(vV), dFdy(vV)));
        float l = max(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0), rim = pow(1.0 - abs(dot(n, normalize(-vV))), 2.0);
        gl_FragColor = vec4(vC * (0.25 + 0.95 * l + 0.7 * rim), 1.0);
      }`,
  });
}
// A beam that holds: a white heart, a sheath of colour, a shimmer running along it. Shaded across its width, so
// it reads the same seen end-on.
function fxBeamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uTime: { value: 0 }, uFade: { value: 1 }, uLen: { value: 1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `${GLSL_NOISE}
      uniform vec3 uColor; uniform float uTime; uniform float uFade; uniform float uLen; varying vec2 vUv;
      void main(){
        float x = abs(vUv.x - 0.5) * 2.0, t = vUv.y;
        float flick = 0.86 + 0.14 * vnoise(vec3(t * uLen * 0.9 - uTime * 14.0, uTime * 3.0, 0.0));
        float core = 1.0 - smoothstep(0.1, 0.24, x), sheath = pow(1.0 - x, 2.2);
        float ends = smoothstep(0.0, 0.04, t) * smoothstep(0.0, 0.03, 1.0 - t);
        gl_FragColor = vec4((uColor * sheath * flick + vec3(1.6) * core) * uFade * ends, 1.0);
      }`,
  });
}
// The markers that warn of an attack, drawn once: a ring with ticks, a lock-on reticle, a warning triangle.
function fxMarkTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.strokeStyle = x.fillStyle = "#fff";
  x.lineCap = "butt";
  x.translate(128, 128);
  if (kind === "ring") {
    x.lineWidth = 7; x.beginPath(); x.arc(0, 0, 104, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 84, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 9;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.beginPath(); x.moveTo(Math.cos(a) * 108, Math.sin(a) * 108); x.lineTo(Math.cos(a) * 124, Math.sin(a) * 124); x.stroke(); }
  } else if (kind === "lock") {
    x.lineWidth = 9;
    for (let i = 0; i < 4; i++) { x.save(); x.rotate((i * Math.PI) / 2); x.beginPath(); x.moveTo(62, 112); x.lineTo(112, 112); x.lineTo(112, 62); x.stroke(); x.beginPath(); x.moveTo(0, 60); x.lineTo(0, 96); x.stroke(); x.restore(); }
    x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 40, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(0, 0, 6, 0, Math.PI * 2); x.fill();
  } else { // bang: a triangle with a stroke and a dot
    x.lineWidth = 12; x.lineJoin = "miter";
    x.beginPath(); x.moveTo(0, -104); x.lineTo(112, 92); x.lineTo(-112, 92); x.closePath(); x.stroke();
    x.fillRect(-9, -52, 18, 78); x.beginPath(); x.arc(0, 56, 12, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
// What a blast or a skid leaves on the ground.
function fxScorchTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  let seed = kind === "skid" ? 7 : 3;
  const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  if (kind === "skid") {
    for (const u of [34, 94]) for (let i = 0; i < 46; i++) { x.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.16})`; x.fillRect(u - 9 + r() * 6, r() * 16, 6 + r() * 8, 128 - r() * 30); }
  } else {
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.45, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 90; i++) { const a = r() * 6.283, d = 30 + r() * 34; x.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.5})`; x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 2 + r() * 7, 0, 6.283); x.fill(); }
    x.globalCompositeOperation = "source-over";
    x.strokeStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 14; i++) { const a = r() * 6.283; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(64 + Math.cos(a) * 10, 64 + Math.sin(a) * 10); x.lineTo(64 + Math.cos(a + (r() - 0.5) * 0.3) * (36 + r() * 26), 64 + Math.sin(a + (r() - 0.5) * 0.3) * (36 + r() * 26)); x.stroke(); }
  }
  return new THREE.CanvasTexture(c);
}

class CombatFX {
  constructor(host, o = {}) {
    this.host = host;
    this.unit = o.unit || 1;
    this.ground = o.ground === undefined ? null : o.ground;
    this.drift = new THREE.Vector3();
    this.t = 0;
    const scene = (this.scene = host.scene), zero = (this._zero = new THREE.Matrix4().makeScale(0, 0, 0));
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._c = new THREE.Color(); this._d = new THREE.Vector3(); this._z = new THREE.Vector3(0, 0, 1); this._e = new THREE.Euler();
    const inst = (geo, mat, cap, order) => {
      const m = new THREE.InstancedMesh(geo, mat, cap);
      m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = order;
      for (let i = 0; i < cap; i++) { m.setMatrixAt(i, zero); m.setColorAt(i, this._c.setRGB(0, 0, 0)); }
      scene.add(m);
      return m;
    };
    // sparks and bolts
    const DN = (this.DN = o.sparks || 260);
    this.darts = inst(fxDartGeo(), fxDartMaterial(), DN, 8);
    this.dl = Array.from({ length: DN }, (_, i) => ({ i, life: 0, t: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), len: 1, w: 1, col: [1, 1, 1], g: 0, drag: 1, stretch: 0, fade: 2.5 }));
    this.dHead = 0;
    // debris
    const CN = (this.CN = o.chunks || 56), cg = new THREE.TetrahedronGeometry(0.3, 0);
    cg.scale(0.7, 1.5, 0.4);
    this.chunks = inst(cg, fxChunkMaterial(), CN, 2);
    this.cl = Array.from({ length: CN }, (_, i) => ({ i, age: 1, life: 0, s: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), g: 0, col: [1, 1, 1], hot: [0, 0, 0] }));
    // fire and smoke
    const puffs = (fire, cap) => {
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      const P = { cap, n: 0, head: 0, pos: new Float32Array(cap * 3), data: new Float32Array(cap * 4), col: new Float32Array(cap * 4), list: Array.from({ length: cap }, () => ({ age: 1, life: 0, v: new THREE.Vector3(), s0: 1, s1: 1, spin: 0, rise: 0, drag: 1 })) };
      g.setAttribute("aPos", (P.aPos = new THREE.InstancedBufferAttribute(P.pos, 3).setUsage(THREE.DynamicDrawUsage)));
      g.setAttribute("aData", (P.aData = new THREE.InstancedBufferAttribute(P.data, 4).setUsage(THREE.DynamicDrawUsage)));
      g.setAttribute("aCol", (P.aCol = new THREE.InstancedBufferAttribute(P.col, 4).setUsage(THREE.DynamicDrawUsage)));
      g.instanceCount = cap;
      P.mesh = new THREE.Mesh(g, fxPuffMaterial(fire));
      P.mesh.frustumCulled = false; P.mesh.renderOrder = fire ? 7 : 6; P.mesh.visible = false;
      scene.add(P.mesh);
      return P;
    };
    this.fireP = puffs(true, o.firePuffs || 72);
    this.smokeP = puffs(false, o.smokePuffs || 72);
    // flashes (glow sprites) and real lights
    this.flashes = Array.from({ length: 10 }, () => { const sp = glowSprite(0xffffff, 1, 0); sp.visible = false; sp.renderOrder = 9; scene.add(sp); return { sp, t: 0, dur: 1, a: 1, s0: 1, s1: 1 }; });
    this.lights = Array.from({ length: o.lights === undefined ? 3 : o.lights }, () => { const l = new THREE.PointLight(0xffffff, 0, 30 * this.unit, 2); scene.add(l); return { l, t: 0, dur: 1, i: 0 }; });
    // shock rings that lie on the ground
    const rg = new THREE.RingGeometry(0.55, 0.8, 64);
    this.rings = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, map: shockTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.visible = false; m.renderOrder = 5; scene.add(m); return { m, t: 0, dur: 1, s: 1, flat: false }; });
    // beams
    const bg = fxDartGeo();
    this.beams = Array.from({ length: 4 }, () => {
      const m = new THREE.Mesh(bg, fxBeamMaterial()), a = glowSprite(0xffffff, 1, 0), b = glowSprite(0xffffff, 1, 0);
      m.visible = a.visible = b.visible = false; m.frustumCulled = false; m.renderOrder = 8; a.renderOrder = b.renderOrder = 9;
      scene.add(m, a, b);
      return { m, a, b, t: 0, dur: 0, w: 1, on: false, from: new THREE.Vector3(), to: new THREE.Vector3(), col: [1, 1, 1] };
    });
    // bolts in flight (each is a dart with a glow at its head and, for the first two, a light)
    this.bolts = Array.from({ length: 10 }, () => { const sp = glowSprite(0xffffff, 1, 0); sp.visible = false; sp.renderOrder = 9; scene.add(sp); return { sp, on: false, t: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), p: new THREE.Vector3(), col: [1, 1, 1], w: 1, len: 1, onHit: null, dart: null }; });
    // warning markers
    this.markTex = { ring: fxMarkTexture("ring"), lock: fxMarkTexture("lock"), bang: fxMarkTexture("bang") };
    const pg = new THREE.PlaneGeometry(1, 1);
    this.marks = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0xffffff, map: this.markTex.ring, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide, fog: false })); m.visible = false; m.renderOrder = 10; scene.add(m); return { m, t: 0, dur: 0, size: 1, flat: false, kind: "ring", col: [1, 1, 1], follow: null }; });
    // marks left on the ground
    this.scorchTex = { scorch: fxScorchTexture("scorch"), skid: fxScorchTexture("skid") };
    this.scorches = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0x000000, map: this.scorchTex.scorch, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false })); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 1; scene.add(m); return { m, t: 0, dur: 0, a: 1, ride: false }; });
    this.scorchI = 0;
    this.trailers = [];
  }

  // ---- particles ---------------------------------------------------------------------------
  _dart() { const d = this.dl[this.dHead]; this.dHead = (this.dHead + 1) % this.DN; return d; }
  sparks(pos, color, o = {}) {
    const n = o.n || 16, sp = (o.speed === undefined ? 9 : o.speed) * this.unit, col = fxRGB(color, o.k === undefined ? 2.4 : o.k), spread = o.spread === undefined ? 1 : o.spread;
    for (let k = 0; k < n; k++) {
      const d = this._dart();
      d.p.copy(pos);
      d.v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      if (o.dir) d.v.multiplyScalar(spread).add(o.dir).normalize();
      d.v.multiplyScalar(sp * rand(0.35, 1));
      d.life = d.t = (o.life || 0.5) * rand(0.6, 1.2);
      d.w = (o.w || 0.07) * this.unit * rand(0.7, 1.3);
      d.len = (o.len || 0.7) * this.unit * rand(0.6, 1.4);
      d.stretch = o.stretch === undefined ? 0.045 : o.stretch;
      d.g = (o.gravity || 0) * this.unit; d.drag = o.drag === undefined ? 0.25 : o.drag; d.fade = 2.5;
      d.col = col;
    }
  }
  embers(pos, color, o = {}) {
    const n = o.n || 10, col = fxRGB(color, 2.0), R = (o.radius || 0.6) * this.unit;
    for (let k = 0; k < n; k++) {
      const d = this._dart();
      d.p.set(pos.x + rand(-R, R), pos.y + rand(-R, R), pos.z + rand(-R, R));
      d.v.set(rand(-1, 1), rand(0.2, 1), rand(-1, 1)).multiplyScalar((o.speed || 1.6) * this.unit);
      d.life = d.t = (o.life || 1.6) * rand(0.6, 1.3);
      d.w = 0.05 * this.unit * rand(0.7, 1.4); d.len = 0.12 * this.unit; d.stretch = 0.03;
      d.g = -(o.rise === undefined ? 1.2 : o.rise) * this.unit; d.drag = 0.5; d.fade = 1.6; d.col = col;
    }
  }
  _puff(P, pos, o) {
    const i = P.head; P.head = (P.head + 1) % P.cap;
    const q = P.list[i], u = this.unit;
    q.age = 0; q.life = o.life; q.s0 = o.s0 * u; q.s1 = o.s1 * u; q.spin = rand(-1, 1) * (o.spin === undefined ? 0.8 : o.spin); q.rise = (o.rise || 0) * u; q.drag = o.drag === undefined ? 0.35 : o.drag;
    q.v.copy(o.vel || this._d.set(0, 0, 0));
    P.pos[i * 3] = pos.x; P.pos[i * 3 + 1] = pos.y; P.pos[i * 3 + 2] = pos.z;
    P.data[i * 4] = q.s0; P.data[i * 4 + 1] = rand(6.283); P.data[i * 4 + 2] = 0; P.data[i * 4 + 3] = Math.random() + (o.cold ? 2 : 0);
    P.col[i * 4] = o.col[0]; P.col[i * 4 + 1] = o.col[1]; P.col[i * 4 + 2] = o.col[2]; P.col[i * 4 + 3] = o.a === undefined ? 1 : o.a;
    P.aCol.needsUpdate = true;
    P.live = true; P.mesh.visible = true;
  }
  fire(pos, o = {}) { const s = o.size || 1; this._puff(this.fireP, pos, { life: o.life || 0.5, s0: s * 0.45, s1: s * 1.25, vel: o.vel, rise: o.rise === undefined ? 0.8 : o.rise, col: fxRGB(o.color === undefined ? 0xff6a14 : o.color, o.k || 1.5), a: o.a, spin: o.spin, drag: o.drag }); }
  smoke(pos, o = {}) { const s = o.size || 1, d = o.dark === undefined ? 0.12 : o.dark; this._puff(this.smokeP, pos, { life: o.life || 1.4, s0: s * 0.5, s1: s * 1.9, vel: o.vel, rise: o.rise === undefined ? 0.6 : o.rise, col: o.color !== undefined ? fxRGB(o.color) : [d * 1.05, d * 0.9, d * 1.25], a: o.a === undefined ? 0.7 : o.a, spin: 0.5, drag: o.drag, cold: o.cold }); }
  debris(pos, o = {}) {
    const n = o.n || 8, col = fxRGB(o.color === undefined ? 0x23232e : o.color, o.k || 1), hot = o.hot === false ? [0, 0, 0] : fxRGB(o.hot === undefined || o.hot === true ? 0xff7a1e : o.hot, 1.1), u = this.unit;
    let k = 0;
    for (const c of this.cl) {
      if (k >= n) break;
      if (c.age < c.life) continue;
      k++;
      c.age = 0; c.life = (o.life || 1.3) * rand(0.7, 1.3); c.s = (o.size || 1) * u * rand(0.5, 1.5); c.g = (o.gravity === undefined ? 9 : o.gravity) * u;
      c.p.copy(pos).add(this._d.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar((o.radius || 0.3) * u));
      c.v.set(rand(-1, 1), rand(-0.4, 1), rand(-1, 1)).normalize();
      if (o.dir) c.v.multiplyScalar(o.spread === undefined ? 0.8 : o.spread).add(o.dir).normalize();
      c.v.multiplyScalar((o.speed === undefined ? 8 : o.speed) * u * rand(0.4, 1));
      c.r.set(rand(6.28), rand(6.28), rand(6.28)); c.w.set(rand(-10, 10), rand(-10, 10), rand(-10, 10));
      c.col = col; c.hot = hot;
    }
  }

  // ---- light -------------------------------------------------------------------------------
  flash(pos, color, s0, s1, dur, a = 1, k = 2.2) {
    const f = this.flashes.find((x) => x.t <= 0) || this.flashes[0], c = fxRGB(color, k);
    f.sp.position.copy(pos); f.sp.material.color.setRGB(c[0], c[1], c[2]); f.t = f.dur = dur; f.a = a; f.s0 = s0 * this.unit; f.s1 = s1 * this.unit; f.sp.visible = true;
    return f;
  }
  light(pos, color, intensity = 4, dur = 0.25, range = 18) {
    if (!this.lights.length) return;
    const L = this.lights.reduce((a, b) => (b.t < a.t ? b : a));
    L.l.position.copy(pos); L.l.color.set(color); L.l.distance = range * this.unit; L.i = intensity; L.t = L.dur = dur;
  }
  ring(pos, color, o = {}) {
    if (!o.flat) { this.host.shockwave(pos, neon(color, o.k || 1.6), (o.size || 5) * this.unit, o.dur || 0.5); return; }
    const r = this.rings.find((x) => x.t <= 0) || this.rings[0], c = fxRGB(color, o.k || 2);
    r.m.position.copy(pos); r.m.rotation.set(-Math.PI / 2, 0, 0); r.m.material.color.setRGB(c[0], c[1], c[2]); r.m.visible = true;
    r.t = r.dur = o.dur || 0.6; r.s = (o.size || 6) * this.unit; r.flat = true;
  }

  // ---- weapons -----------------------------------------------------------------------------
  // A bolt flies from one point to another and calls onHit when it lands.
  bolt(from, to, color, o = {}) {
    const b = this.bolts.find((x) => !x.on) || this.bolts[0], u = this.unit;
    b.on = true; b.t = 0; b.dur = Math.max(0.02, o.dur || 0.16); b.from.copy(from); b.to.copy(to); b.col = fxRGB(color, o.k || 2.8);
    b.w = (o.width || 0.34) * u; b.len = (o.len || 4.2) * u; b.onHit = o.onHit || null; b.lit = o.light !== false;
    b.dart = this._dart(); b.dart.life = b.dart.t = b.dur + 0.02; b.dart.v.set(0, 0, 0); b.dart.g = 0; b.dart.drag = 1; b.dart.stretch = 0; b.dart.fade = 99; b.dart.col = b.col; b.dart.w = b.w; b.dart.len = 0.01; b.dart.bolt = b;
    b.sp.material.color.setRGB(b.col[0], b.col[1], b.col[2]); b.sp.visible = true;
    return b;
  }
  // A beam held between two points until it fades or is stopped. set(a, b) moves it.
  beam(from, to, color, o = {}) {
    const b = this.beams.find((x) => !x.on) || this.beams[0];
    b.on = true; b.t = 0; b.dur = o.dur === undefined ? 0.3 : o.dur; b.w = (o.width || 0.35) * this.unit; b.col = fxRGB(color, o.k || 2.6); b.from.copy(from); b.to.copy(to); b.grow = o.grow === undefined ? 0.05 : o.grow;
    b.m.material.uniforms.uColor.value.setRGB(b.col[0], b.col[1], b.col[2]);
    b.m.visible = b.a.visible = b.b.visible = true;
    b.a.material.color.setRGB(b.col[0], b.col[1], b.col[2]); b.b.material.color.copy(b.a.material.color);
    return { set: (a, c) => { b.from.copy(a); b.to.copy(c); }, stop: () => { b.dur = b.dur > 0 ? Math.min(b.dur, b.t + 0.08) : b.t + 0.08; }, live: () => b.on };
  }
  // A small hot heart, a tongue of flame down the line of fire and four short spikes round it: a star, not a ball.
  muzzle(pos, dir, color, size = 1) {
    const u = this.unit, col = fxRGB(color, 2.6), hot = [2.6, 2.6, 2.6];
    this.flash(pos, 0xffffff, 0.2 * size, 0.62 * size, 0.07, 1, 2.6);
    this.flash(pos, color, 0.36 * size, 1.0 * size, 0.1, 0.5, 2.2);
    const side = new THREE.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? this._d.set(1, 0, 0) : this._d.set(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(side, dir).normalize();
    const spike = (x, y, f, len, w, c, life) => {
      const q = this._dart();
      q.v.set(0, 0, 0).addScaledVector(side, x).addScaledVector(up, y).addScaledVector(dir, f).normalize();
      q.p.copy(pos).addScaledVector(q.v, len * u * 0.5);
      q.v.multiplyScalar((len * u * 0.5) / life);
      q.life = q.t = life; q.w = w * u; q.len = len * u; q.stretch = 0; q.g = 0; q.drag = 0.1; q.fade = 1.3; q.col = c; q.bolt = null;
    };
    spike(0, 0, 1, 1.7 * size, 0.24 * size, hot, 0.07);
    spike(0, 0, 1, 2.3 * size, 0.36 * size, col, 0.09);
    for (const [x, y] of [[1, 0.3], [-1, -0.3], [0.3, -1], [-0.3, 1]]) spike(x, y, 0.55, 0.95 * size, 0.15 * size, col, 0.08);
    this.sparks(pos, color, { n: 5, speed: 9 * size, dir, spread: 0.45, life: 0.16, len: 0.6 * size, w: 0.05 * size });
    this.light(pos, color, 3.2 * size, 0.12, 9 * size);
  }
  // Spent energy cells thrown clear of a gun: a few dull sparks to one side that fall.
  shells(pos, side, color = 0xffc070) { this.sparks(pos, color, { n: 2, speed: 3.2, dir: side, spread: 0.5, life: 0.5, len: 0.2, w: 0.045, gravity: 7, k: 1.4, drag: 0.6 }); }

  // ---- hits --------------------------------------------------------------------------------
  // A right answer landing.
  impact(pos, color, o = {}) {
    const s = o.size || 1;
    this.flash(pos, 0xffffff, 0.5 * s, 2.0 * s, 0.11, 1, 3);
    this.flash(pos, color, 1.0 * s, 3.4 * s, 0.24, 0.7, 2.2);
    this.sparks(pos, color, { n: Math.round(20 * Math.min(2, s)), speed: 13 * s, dir: o.dir, spread: 1.4, life: 0.45, len: 0.9 * s, w: 0.075 * s });
    this.sparks(pos, 0xffffff, { n: Math.round(8 * Math.min(2, s)), speed: 18 * s, dir: o.dir, spread: 1.6, life: 0.22, len: 1.2 * s, w: 0.05 * s, k: 2.2 });
    this.embers(pos, color, { n: 8, radius: 0.5 * s, life: 1.1 });
    if (o.ring !== false) this.ring(pos, color, { size: 5 * s, dur: 0.42 });
    this.light(pos, color, 5 * s, 0.22, 16 * s);
    GFX.bloomPulse(0.45 * Math.min(1.6, s));
    if (o.shake !== false) this.host.shake(0.12 * s);
  }
  // A wrong answer: it does not bite. Dull, dark, short, and it falls.
  fizzle(pos, o = {}) {
    const s = o.size || 1, u = this.unit, cam = this.host.camera;
    this.flash(pos, 0xa01424, 0.6 * s, 2.0 * s, 0.16, 0.6, 1.25);
    this.sparks(pos, 0xd02434, { n: 16, speed: 6 * s, dir: o.dir, spread: 1.2, life: 0.42, len: 0.5 * s, w: 0.08 * s, gravity: 10, k: 1.6, drag: 0.4, stretch: 0.02 });
    this.sparks(pos, 0x6a1622, { n: 8, speed: 3 * s, life: 0.6, len: 0.26 * s, w: 0.075 * s, gravity: 8, k: 1.2, drag: 0.5, stretch: 0.02 });
    // a blunt red cross where it struck: four short strokes that hold for a moment and go out
    const R = this._d.set(1, 0, 0).applyQuaternion(cam.quaternion).clone(), U = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const d = this._dart(), v = new THREE.Vector3().addScaledVector(R, a).addScaledVector(U, b).normalize();
      d.p.copy(pos).addScaledVector(v, 0.55 * s * u); d.v.copy(v).multiplyScalar(0.6 * s * u);
      d.life = d.t = 0.26; d.w = 0.16 * s * u; d.len = 0.8 * s * u; d.stretch = 0; d.g = 0; d.drag = 0.2; d.fade = 1.4; d.col = fxRGB(0xc81e30, 1.5);
    }
    for (let i = 0; i < 4; i++) this.smoke(new THREE.Vector3(rand(-0.4, 0.4) * s * u, rand(-0.25, 0.35) * s * u, 0).add(pos), { size: 1.25 * s, life: 0.8, rise: 0.5, a: 0.72, dark: 0.05, cold: true }); // (cold: no glow of fire in it. A reject is a dud.)
  }
  // A blow on plate or hull: sparks off the surface, a little smoke.
  hull(pos, color, o = {}) {
    const s = o.size || 1;
    this.flash(pos, color, 0.4 * s, 1.6 * s, 0.12, 0.9, 2.2);
    this.sparks(pos, 0xffd9a0, { n: 14, speed: 10 * s, dir: o.dir, spread: 1.1, life: 0.4, len: 0.7 * s, w: 0.06 * s, gravity: o.gravity === undefined ? 5 : o.gravity, k: 2 });
    this.sparks(pos, color, { n: 8, speed: 7 * s, dir: o.dir, spread: 1.4, life: 0.5, len: 0.5 * s, w: 0.06 * s, gravity: o.gravity === undefined ? 5 : o.gravity });
    this.smoke(pos, { size: 0.9 * s, life: 0.8, a: 0.45, cold: true }); // (cold: a struck plate smokes, it does not burn)
    this.light(pos, color, 3.5 * s, 0.18, 12 * s);
  }
  // A layered blast.
  explosion(pos, o = {}) {
    const s = o.size || 1, col = o.color === undefined ? 0xff8a2a : o.color, u = this.unit, d = this._d;
    this.flash(pos, 0xffffff, 0.6 * s, 2.2 * s, 0.1, 1, 2.4);
    this.flash(pos, col, 1.0 * s, 4.2 * s, 0.36, 0.42, 1.5); // (its light is a heart, not the whole of it: fire, sparks, ring and debris give it its size)
    const nf = Math.round(6 + 3 * Math.min(2, s));
    for (let i = 0; i < nf; i++) {
      const v = new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-1, 1)).normalize().multiplyScalar(rand(1, 4) * s * u);
      this.fire(d.copy(pos).addScaledVector(v, 0.14), { size: rand(1.0, 1.9) * s, life: rand(0.38, 0.7), vel: v, rise: 1.2, color: i % 3 ? 0xff6a14 : col, k: 1.35 });
    }
    if (o.smoke !== false) for (let i = 0; i < Math.round(5 + 3 * Math.min(2, s)); i++) {
      const v = new THREE.Vector3(rand(-1, 1), rand(-0.2, 1), rand(-1, 1)).normalize().multiplyScalar(rand(0.6, 2.2) * s * u);
      this.smoke(d.copy(pos).addScaledVector(v, 0.2), { size: rand(1.4, 2.6) * s, life: rand(1.1, 2.1), vel: v, rise: 0.9, a: 0.62 });
    }
    this.sparks(pos, 0xffe2b0, { n: Math.round(22 * Math.min(2, s)), speed: 19 * s, life: 0.5, len: 1.1 * s, w: 0.07 * s, k: 2.4, gravity: this.ground === null ? 0 : 6 });
    this.sparks(pos, col, { n: Math.round(14 * Math.min(2, s)), speed: 11 * s, life: 0.8, len: 0.7 * s, w: 0.08 * s, gravity: this.ground === null ? 0 : 6 });
    this.embers(pos, 0xffa040, { n: Math.round(12 * Math.min(2, s)), radius: 1.2 * s, life: 2.0, speed: 2.2 });
    if (o.debris !== false) this.debris(pos, { n: Math.round(6 * Math.min(2.5, s)), size: 0.8 * s, speed: 11 * s, gravity: this.ground === null ? 0 : 9, color: o.debrisColor });
    if (o.ring !== false) this.ring(pos, col, { size: 9 * s, dur: 0.6 });
    if (o.ground || (this.ground !== null && o.ground !== false && Math.abs(pos.y - this.ground) < 3 * s * u)) {
      const gp = d.set(pos.x, this.ground === null ? pos.y : this.ground + 0.03 * u, pos.z).clone();
      this.ring(gp, col, { flat: true, size: 12 * s, dur: 0.7 });
      this.scorch(gp, { size: 4.5 * s, life: 6 });
    }
    this.light(pos, col, 9 * s, 0.45, 30 * s);
    GFX.bloomPulse(0.4 * Math.min(1.6, s));
    if (o.shake !== false) this.host.shake(0.3 * s);
  }

  // ---- telegraphs --------------------------------------------------------------------------
  // A warning marker: it closes in on its place, blinks under three times a second and is gone when its time is up.
  // follow: a function returning where it should be now (a marker that tracks its target).
  mark(kind, pos, color, o = {}) {
    const k = this.marks.find((x) => x.t <= 0) || this.marks[0];
    k.kind = kind; k.m.material.map = this.markTex[kind] || this.markTex.ring; k.m.material.needsUpdate = true;
    k.col = fxRGB(color, o.k || 2.2); k.t = k.dur = o.dur || 0.6; k.size = (o.size || 3) * this.unit; k.flat = !!o.flat; k.follow = o.follow || null; k.spin = o.spin === undefined ? (kind === "bang" ? 0 : 1.6) : o.spin;
    k.m.position.copy(pos); k.m.visible = true;
    return k;
  }
  scorch(pos, o = {}) {
    const s = this.scorches[this.scorchI++ % this.scorches.length];
    s.m.material.map = this.scorchTex[o.kind || "scorch"]; s.m.material.needsUpdate = true;
    s.m.position.copy(pos); s.m.rotation.z = o.angle === undefined ? rand(6.283) : o.angle; s.m.scale.set((o.size || 3) * this.unit * (o.wide || 1), (o.size || 3) * this.unit * (o.long || 1), 1);
    s.t = s.dur = o.life || 5; s.a = o.a === undefined ? 0.72 : o.a; s.ride = o.ride !== false; s.m.visible = true;
    return s;
  }
  // Smoke, fire or sparks trailing from a point that moves (a damaged engine, a burning wreck). Set .on = false to stop.
  trailer(at, o = {}) {
    const t = { at, on: true, acc: 0, rate: o.rate || 14, smoke: o.smoke === undefined ? 1 : o.smoke, fire: o.fire || 0, sparks: o.sparks || 0, size: o.size || 1, vel: o.vel || null, life: o.life || 1.2, color: o.color, a: o.a === undefined ? 0.5 : o.a };
    this.trailers.push(t);
    return t;
  }

  update(dt) {
    if (dt <= 0) return;
    this.t += dt;
    const dr = this.drift, m = this._m, q = this._q, s = this._s, c = this._c, z = this._z, d = this._d, cam = this.host.camera;
    // trailers
    for (let i = this.trailers.length - 1; i >= 0; i--) {
      const t = this.trailers[i];
      if (!t.on) { this.trailers.splice(i, 1); continue; }
      t.acc += dt * t.rate;
      while (t.acc >= 1) {
        t.acc -= 1;
        const p = t.at(d);
        if (!p) break;
        const jit = new THREE.Vector3(rand(-0.15, 0.15), rand(-0.1, 0.15), rand(-0.15, 0.15)).multiplyScalar(t.size * this.unit).add(p);
        if (t.smoke && Math.random() < t.smoke) this.smoke(jit, { size: 0.7 * t.size, life: t.life, vel: t.vel, a: t.a });
        if (t.fire && Math.random() < t.fire) this.fire(jit, { size: 0.6 * t.size, life: 0.35, vel: t.vel, color: t.color });
        if (t.sparks && Math.random() < t.sparks) this.sparks(jit, t.color === undefined ? 0xffb060 : t.color, { n: 1, speed: 4 * t.size, life: 0.4, len: 0.3 * t.size, w: 0.05 * t.size, gravity: this.ground === null ? 0 : 6 });
      }
    }
    // bolts
    for (const b of this.bolts) {
      if (!b.on) continue;
      b.t += dt;
      const k = Math.min(1, b.t / b.dur), dart = b.dart;
      b.p.lerpVectors(b.from, b.to, k);
      const total = b.from.distanceTo(b.to), len = Math.min(b.len, total * k + 0.001);
      if (dart && dart.bolt === b) { // its tail trails behind its head; the whole of it shrinks into the target as it lands
        d.subVectors(b.to, b.from).normalize();
        dart.p.copy(b.p).addScaledVector(d, -len * 0.5); dart.len = len; dart.w = b.w; dart.dirv = d.clone(); dart.life = Math.max(dart.life, 0.03);
      }
      b.sp.position.copy(b.p); b.sp.scale.setScalar(b.w * 2.6); b.sp.material.opacity = 0.6; // (a glow that hugs its head: the bolt is its dart, not a ball of light)
      if (b.lit) this.lights.length && this.lights[0].t <= 0.02 && (this.lights[0].l.position.copy(b.p), this.lights[0].l.color.setRGB(Math.min(1, b.col[0]), Math.min(1, b.col[1]), Math.min(1, b.col[2])), (this.lights[0].i = 2.2), (this.lights[0].t = this.lights[0].dur = 0.05));
      if (k >= 1) { b.on = false; b.sp.visible = false; if (dart && dart.bolt === b) { dart.life = 0; dart.bolt = null; } const f = b.onHit; b.onHit = null; if (f) f(b.to); }
    }
    // darts
    let hi = 0;
    for (const p of this.dl) {
      if (p.life <= 0) { if (p.shown) { this.darts.setMatrixAt(p.i, this._zero); p.shown = false; } continue; }
      p.life -= dt;
      if (p.life <= 0) { this.darts.setMatrixAt(p.i, this._zero); p.shown = false; p.bolt = null; continue; }
      hi = Math.max(hi, p.i + 1);
      let len = p.len;
      if (p.bolt) q.setFromUnitVectors(z, p.dirv || z);
      else {
        p.v.multiplyScalar(Math.pow(p.drag, dt)); p.v.y -= p.g * dt;
        p.p.addScaledVector(p.v, dt).addScaledVector(dr, dt);
        if (this.ground !== null && p.g > 0 && p.p.y < this.ground) { p.p.y = this.ground; p.v.y = Math.abs(p.v.y) * 0.35; p.v.x *= 0.6; p.v.z *= 0.6; }
        const sp = p.v.length();
        q.setFromUnitVectors(z, d.copy(p.v).multiplyScalar(1 / Math.max(sp, 1e-4)));
        len = p.len + sp * p.stretch;
      }
      this.darts.setMatrixAt(p.i, m.compose(p.p, q, s.set(p.w, p.w, len)));
      const a = Math.min(1, (p.life / p.t) * p.fade);
      this.darts.setColorAt(p.i, c.setRGB(p.col[0] * a, p.col[1] * a, p.col[2] * a));
      p.shown = true;
    }
    this.darts.count = Math.max(1, hi); this.darts.visible = hi > 0;
    this.darts.instanceMatrix.needsUpdate = true;
    if (this.darts.instanceColor) this.darts.instanceColor.needsUpdate = true;
    // debris
    let live = false;
    for (const ch of this.cl) {
      if (ch.age >= ch.life) { if (ch.shown) { this.chunks.setMatrixAt(ch.i, this._zero); ch.shown = false; } continue; }
      ch.age += dt;
      const k = Math.min(1, ch.age / ch.life);
      ch.v.multiplyScalar(Math.pow(0.55, dt)); ch.v.y -= ch.g * dt;
      ch.p.addScaledVector(ch.v, dt).addScaledVector(dr, dt);
      if (this.ground !== null && ch.p.y < this.ground + 0.1 * ch.s) { ch.p.y = this.ground + 0.1 * ch.s; ch.v.y = Math.abs(ch.v.y) * 0.4; ch.v.x *= 0.7; ch.v.z *= 0.7; ch.w.multiplyScalar(0.6); }
      ch.r.set(ch.r.x + ch.w.x * dt, ch.r.y + ch.w.y * dt, ch.r.z + ch.w.z * dt);
      const sc = ch.s * (1 - k * k * k);
      this.chunks.setMatrixAt(ch.i, m.compose(ch.p, q.setFromEuler(ch.r), s.set(sc, sc, sc)));
      const h = Math.pow(1 - k, 3);
      this.chunks.setColorAt(ch.i, c.setRGB(ch.col[0] + ch.hot[0] * h, ch.col[1] + ch.hot[1] * h, ch.col[2] + ch.hot[2] * h));
      ch.shown = true; live = true;
    }
    this.chunks.visible = live;
    this.chunks.instanceMatrix.needsUpdate = true;
    if (this.chunks.instanceColor) this.chunks.instanceColor.needsUpdate = true;
    // fire and smoke
    for (const P of [this.fireP, this.smokeP]) {
      if (!P.live) continue;
      let any = false;
      for (let i = 0; i < P.cap; i++) {
        const u = P.list[i];
        if (u.age >= 1) continue;
        u.age += dt / u.life;
        const k = Math.min(1, u.age), j = i * 3;
        if (k >= 1) { P.data[i * 4] = 0; continue; }
        u.v.multiplyScalar(Math.pow(u.drag, dt));
        P.pos[j] += (u.v.x + dr.x) * dt; P.pos[j + 1] += (u.v.y + dr.y + u.rise) * dt; P.pos[j + 2] += (u.v.z + dr.z) * dt;
        P.data[i * 4] = lerp(u.s0, u.s1, 1 - (1 - k) * (1 - k)); P.data[i * 4 + 1] += u.spin * dt; P.data[i * 4 + 2] = k;
        any = true;
      }
      P.aPos.needsUpdate = P.aData.needsUpdate = true;
      P.live = any; P.mesh.visible = any;
    }
    // flashes, lights, rings
    for (const f of this.flashes) {
      if (f.t <= 0) continue;
      f.t -= dt;
      const k = 1 - Math.max(0, f.t) / f.dur;
      f.sp.visible = f.t > 0;
      f.sp.position.addScaledVector(dr, dt);
      f.sp.scale.setScalar(lerp(f.s0, f.s1, 1 - (1 - k) * (1 - k)));
      f.sp.material.opacity = (1 - k * k) * f.a;
    }
    for (const L of this.lights) { if (L.t <= 0) { L.l.intensity = 0; continue; } L.t -= dt; const k = Math.max(0, L.t) / L.dur; L.l.intensity = L.i * k * k; L.l.position.addScaledVector(dr, dt); }
    for (const r of this.rings) {
      if (r.t <= 0) continue;
      r.t -= dt;
      const k = 1 - Math.max(0, r.t) / r.dur;
      r.m.visible = r.t > 0; r.m.scale.setScalar(0.4 + (1 - (1 - k) * (1 - k)) * r.s); r.m.material.opacity = 1 - k; r.m.position.addScaledVector(dr, dt);
    }
    // beams
    for (const b of this.beams) {
      if (!b.on) continue;
      b.t += dt;
      const k = b.dur > 0 ? Math.min(1, b.t / b.dur) : 0, fade = b.dur > 0 ? 1 - smoothstep(0.6, 1, k) : 1, grow = b.grow > 0 ? Math.min(1, b.t / b.grow) : 1;
      if (b.dur > 0 && k >= 1) { b.on = false; b.m.visible = b.a.visible = b.b.visible = false; continue; }
      const len = b.from.distanceTo(b.to) * grow;
      d.subVectors(b.to, b.from).normalize();
      b.m.position.copy(b.from).addScaledVector(d, len * 0.5);
      b.m.quaternion.setFromUnitVectors(z, d);
      b.m.scale.set(b.w, b.w, Math.max(0.001, len));
      const U = b.m.material.uniforms; U.uFade.value = fade; U.uTime.value = this.t; U.uLen.value = len / this.unit;
      b.a.position.copy(b.from); b.a.scale.setScalar(b.w * 2.4); b.a.material.opacity = 0.7 * fade;
      b.b.position.copy(b.from).addScaledVector(d, len); b.b.scale.setScalar(b.w * 3.0 * (0.9 + 0.1 * Math.sin(this.t * 40))); b.b.material.opacity = 0.8 * fade;
    }
    // warning markers
    for (const k of this.marks) {
      if (k.t <= 0) continue;
      k.t -= dt;
      const u = 1 - Math.max(0, k.t) / k.dur;
      k.m.visible = k.t > 0;
      if (k.follow) { const p = k.follow(d); if (p) k.m.position.copy(p); }
      if (k.flat) k.m.rotation.set(-Math.PI / 2, 0, u * k.spin); else { k.m.quaternion.copy(cam.quaternion); k.m.rotateZ(u * k.spin); }
      const close = 1 + 0.9 * Math.pow(1 - Math.min(1, u * 2.2), 2), blink = REDUCED_MOTION || GFX.calm ? 1 : 0.62 + 0.38 * Math.cos(this.t * 2.6 * Math.PI * 2); // 2.6 Hz
      k.m.scale.setScalar(k.size * close);
      const a = Math.min(1, u * 8) * (1 - smoothstep(0.85, 1, u)) * blink;
      k.m.material.color.setRGB(k.col[0] * a, k.col[1] * a, k.col[2] * a);
    }
    // ground marks
    for (const sc of this.scorches) {
      if (sc.t <= 0) continue;
      sc.t -= dt;
      sc.m.visible = sc.t > 0;
      if (sc.ride) sc.m.position.addScaledVector(dr, dt);
      sc.m.material.opacity = sc.a * Math.min(1, sc.t / (sc.dur * 0.4));
    }
  }
  dispose() {
    for (const t of Object.values(this.markTex)) t.dispose();
    for (const t of Object.values(this.scorchTex)) t.dispose();
    this.trailers.length = 0;
  }
}
