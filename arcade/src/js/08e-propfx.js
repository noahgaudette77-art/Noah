// The generated icon props as moments in Risk Blaster, Nest Egg Run and Boss Rush. Look only, and only when the asset
// files are served (from disk there are no models, and nothing here is made):
//   shatter("shield" | "heart", pos, o)  it pops up, holds, cracks, and breaks into shards that fly apart turning and
//                                        shrinking: a shield lost, a life lost
//   spin("bolt", pos, o)                 a bolt spins up and rises, then is gone: the streak reaches a new tier
//   burst("star" | "coin", from, o)      a handful thrown out of a blast, tumbling, gone as the HUD's own fly home
// One geometry and one material per kind, made once with the scene from its model (the stand the icon was modelled on
// cut away, the rest centred and one unit tall). The shield and the heart break in their own vertex shader (one draw);
// the stars and the coins are instanced (one draw each). No lights, no shadows. Everything is pooled with the scene
// like the combat kit (nothing is made when an event fires, and the warm-up compiles it), hidden when its moment is
// over, and freed with the scene. Nothing shows while GFX.extras is off. Everything runs on the show clock.
//   this.iconFX = new PropFX(this.scene, ["shield", "bolt", "star"]);   // with the scene (QuizGame does it)
//   this.iconFX.update(VFX.dt);                                          // every frame (QuizGame.update does it)
//   o: { size (world units tall), face (a camera: the prop faces it), turn (radians about its upright), hold, crack,
//        onBreak (called on the frame it breaks: the caller's sparks and sound), dir, speed, n, life, up }
if (GFX.extras === undefined) GFX.extras = true; // the background additions and effect props: a quality scaler may switch them off on slow frames
const PROP_KINDS = {
  shield: { model: "prop-shield", cut: 0, shards: 9, env: 1.1, glow: 2.2 },
  heart: { model: "prop-heart", cut: 0.3, shards: 11, env: 1.3, glow: 2.4 },
  bolt: { model: "prop-bolt", cut: 0.36, env: 1.2, glow: 2.6 },
  star: { model: "prop-star", cut: 0.19, many: 12, env: 1.3, glow: 2.2 },
  coin: { model: "prop-coin", cut: 0, many: 10, env: 1.3, glow: 2 },
};
// A model's mesh as a centred geometry one unit tall, without what stands below `cut` (a share of its height, from its
// foot). With shards, each triangle gets its own corners and the number of the shard it belongs to (nearest of a few
// points scattered over its face), and the shard's centre: aShard = (centre, a random number per shard).
function propGeometry(model, cut, shards) {
  const g = modelGeometry(model);
  if (!g) return null;
  let geo = g.geo;
  geo.deleteAttribute("aRest");
  const P = geo.attributes.position, I = geo.index;
  if (cut > 0 && I) {
    const keep = [];
    for (let t = 0; t < I.count; t += 3) { const a = I.getX(t), b = I.getX(t + 1), c = I.getX(t + 2); if (P.getY(a) > cut && P.getY(b) > cut && P.getY(c) > cut) keep.push(a, b, c); }
    geo.setIndex(keep);
  }
  const box = new THREE.Box3();
  if (geo.index) { const v = new THREE.Vector3(), Ix = geo.index; for (let t = 0; t < Ix.count; t++) box.expandByPoint(v.fromBufferAttribute(P, Ix.getX(t))); } else box.setFromBufferAttribute(P);
  const c = box.getCenter(new THREE.Vector3()), h = Math.max(1e-3, box.max.y - box.min.y);
  geo.translate(-c.x, -c.y, -c.z);
  geo.scale(1 / h, 1 / h, 1 / h);
  if (shards) {
    geo = geo.toNonIndexed();
    const pos = geo.attributes.position, n = pos.count, w = (box.max.x - box.min.x) / h, seeds = [], own = new Int16Array(n / 3), sum = new Float32Array(shards * 4), rnd = [];
    for (let i = 0; i < shards; i++) { seeds.push([(((i * 0.6180339) % 1) - 0.5) * w * 0.9, ((i + 0.5) / shards - 0.5) * 0.9]); rnd.push(((i * 0.7548777 + 0.31) % 1)); }
    for (let t = 0; t < n / 3; t++) {
      let cx = 0, cy = 0, cz = 0;
      for (let q = 0; q < 3; q++) { cx += pos.getX(t * 3 + q) / 3; cy += pos.getY(t * 3 + q) / 3; cz += pos.getZ(t * 3 + q) / 3; }
      let best = 0, bd = 1e9;
      for (let i = 0; i < shards; i++) { const dx = cx - seeds[i][0], dy = cy - seeds[i][1], d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
      own[t] = best; sum[best * 4] += cx; sum[best * 4 + 1] += cy; sum[best * 4 + 2] += cz; sum[best * 4 + 3]++;
    }
    const at = new Float32Array(n * 4);
    for (let t = 0; t < n / 3; t++) {
      const s = own[t], k = 1 / Math.max(1, sum[s * 4 + 3]);
      for (let q = 0; q < 3; q++) at.set([sum[s * 4] * k, sum[s * 4 + 1] * k, sum[s * 4 + 2] * k, rnd[s]], (t * 3 + q) * 4);
    }
    geo.setAttribute("aShard", new THREE.BufferAttribute(at, 4));
  }
  geo.computeBoundingSphere();
  return { geo, mat: g.mat, w: (box.max.x - box.min.x) / h };
}
// The model's own material, breaking: each shard turns about its own axis and flies out from the middle, shrinking.
function propBreakMaterial(src, U) {
  const m = src.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBreak = U.uBreak;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aShard; uniform float uBreak;\nvec3 propTurn(vec3 v, vec3 a, float t){ float c = cos(t), s = sin(t); return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c); }")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvec3 pAx = normalize(vec3(sin(aShard.w * 41.0), cos(aShard.w * 17.0), 0.5 * sin(aShard.w * 73.0)));\nfloat pAng = uBreak * (1.5 + 4.5 * aShard.w);\nobjectNormal = propTurn(objectNormal, pAx, pAng);")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nif (uBreak > 0.0) { vec3 pc = aShard.xyz, pd = normalize(vec3(pc.xy * 2.0, 0.35)); transformed = pc + propTurn(transformed - pc, pAx, pAng) * max(0.0, 1.0 - 0.92 * uBreak) + pd * uBreak * (0.5 + 0.7 * aShard.w) + vec3(0.0, -0.45 * uBreak * uBreak, 0.0); }");
  };
  m.customProgramCacheKey = () => "propBreak";
  return m;
}
class PropFX {
  constructor(scene, kinds) {
    this.scene = scene;
    this.k = {}; // kind -> { mesh, U, live } (one at a time) or { mesh, parts } (instanced)
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._v = new THREE.Vector3(); this._e = new THREE.Euler();
    for (const kind of kinds) {
      const P = PROP_KINDS[kind], model = Assets.model(P.model);
      if (!model) continue;
      tuneModel(model, { env: P.env, glow: P.glow });
      const g = propGeometry(model, P.cut, P.shards);
      if (!g) continue;
      let mesh, e;
      if (P.many) {
        mesh = new THREE.InstancedMesh(g.geo, g.mat, P.many);
        for (let i = 0; i < P.many; i++) mesh.setMatrixAt(i, this._m.makeScale(1e-4, 1e-4, 1e-4));
        e = { mesh, parts: [], max: P.many };
      } else {
        const U = { uBreak: { value: 0 } };
        mesh = new THREE.Mesh(g.geo, P.shards ? propBreakMaterial(g.mat, U) : g.mat);
        if (P.shards) g.mat.dispose(); // (its clone, with the same maps, is the one drawn)
        e = { mesh, U, live: null };
      }
      mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.castShadow = mesh.receiveShadow = false;
      scene.add(mesh);
      this.k[kind] = e;
    }
  }
  has(kind) { return !!this.k[kind]; }
  // each kind's material handed to fn (a scene that lights its models with its own sky's reflection, not the scene's)
  mirror(fn) { for (const kind in this.k) fn(this.k[kind].mesh.material); }
  // ---- one at a time: the shield, the heart (shatter) and the bolt (spin) ---------------------------------------
  _one(kind, pos, o, type) {
    const e = this.k[kind];
    if (!e || !GFX.extras) return null;
    const m = e.mesh;
    m.position.copy(pos);
    if (o.face && o.face.quaternion) m.quaternion.copy(o.face.quaternion); else m.quaternion.set(0, 0, 0, 1);
    if (o.turn) m.quaternion.multiply(this._q.setFromAxisAngle(this._s.set(0, 1, 0), o.turn));
    m.scale.setScalar(1e-4);
    m.visible = true;
    e.U && (e.U.uBreak.value = 0);
    e.live = { type, t: 0, size: o.size || 1, hold: o.hold === undefined ? 0.12 : o.hold, crack: o.crack === undefined ? 0.1 : o.crack, onBreak: o.onBreak || null, broke: false, q0: m.quaternion.clone(), y0: pos.y, quiet: REDUCED_MOTION || GFX.calm };
    return e.live;
  }
  shatter(kind, pos, o = {}) { return this._one(kind, pos, o, "shatter"); }
  spin(kind, pos, o = {}) { return this._one(kind, pos, o, "spin"); }
  // ---- many: stars and coins thrown out of a blast ------------------------------------------------------------
  // from: where they come from; o.n how many; o.dir the way they are thrown (default: up and toward the lens, o.up), o.speed, o.size, o.life
  burst(kind, from, o = {}) {
    const e = this.k[kind];
    if (!e || !GFX.extras) return 0;
    const quiet = REDUCED_MOTION || GFX.calm, n = Math.min(e.max - e.parts.length, Math.max(1, Math.round((o.n || 6) * (quiet ? 0.5 : 1)))), sp = o.speed || 6, dir = o.dir || this._v.set(0, 0.6, 1).normalize();
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rand(-1, 1), rand(-0.6, 1), rand(-0.6, 1)).normalize().multiplyScalar(0.75).add(dir).normalize().multiplyScalar(sp * rand(0.65, 1.15));
      e.parts.push({ p: from.clone(), v, ax: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-0.3, 0.3)).normalize(), a: rand(0, 6.28), w: rand(4, 9) * (quiet ? 0.4 : 1), t: -i * (o.gap || 0.02), life: (o.life || 1.0) * rand(0.85, 1.1), s: (o.size || 0.5) * rand(0.8, 1.15), g: o.gravity === undefined ? 3 : o.gravity, drag: o.drag === undefined ? 1.6 : o.drag });
    }
    e.mesh.visible = e.parts.length > 0;
    return n;
  }
  // ---- every frame (show clock) ---------------------------------------------------------------------------
  update(d) {
    if (!GFX.extras) { this.clear(); return; }
    for (const kind in this.k) {
      const e = this.k[kind];
      if (e.parts) { if (e.parts.length) this._many(e, d); continue; }
      const L = e.live;
      if (!L) continue;
      L.t += d;
      const m = e.mesh, t = L.t, S = L.size;
      if (L.type === "shatter") {
        const tb = 0.09 + L.hold + L.crack; // (it breaks here)
        const pop = Math.min(1, t / 0.09), k = pop < 1 ? 1 + 2.4 * Math.pow(pop - 1, 3) + 1.4 * Math.pow(pop - 1, 2) : 1; // (an ease that overshoots a little)
        m.scale.setScalar(Math.max(1e-4, S * k));
        let b = 0;
        if (t > tb - L.crack) b = 0.045 * smoothstep(tb - L.crack, tb, t); // (cracks open: the shards part a hair)
        if (t >= tb) {
          if (!L.broke) { L.broke = true; if (L.onBreak) L.onBreak(m.position); }
          b = 0.045 + 0.955 * (1 - Math.pow(1 - Math.min(1, (t - tb) / (L.quiet ? 0.5 : 0.62)), 2));
        }
        if (t > tb - L.crack && t < tb) m.quaternion.copy(L.q0).multiply(this._q.setFromEuler(this._e.set(0, 0, Math.sin(t * 90) * 0.03))); // (it shudders as it cracks)
        e.U.uBreak.value = b;
        if (b >= 0.999) { m.visible = false; e.live = null; e.U.uBreak.value = 0; }
      } else { // spin: up from nothing, turning fast and slowing, rising; then gone
        const dur = 1.15, q = t / dur, grow = Math.min(1, t / 0.16), k = (grow < 1 ? 1 + 2.4 * Math.pow(grow - 1, 3) + 1.4 * Math.pow(grow - 1, 2) : 1) * (1 - smoothstep(0.78, 1, q));
        m.scale.setScalar(Math.max(1e-4, S * k));
        const turns = L.quiet ? 0.6 : 2.2;
        m.quaternion.copy(L.q0).multiply(this._q.setFromAxisAngle(this._s.set(0, 1, 0), (1 - Math.pow(1 - Math.min(1, q), 3)) * turns * Math.PI * 2));
        m.position.y = L.y0 + S * 0.45 * (1 - Math.pow(1 - Math.min(1, q), 2));
        if (q >= 1) { m.visible = false; e.live = null; }
      }
    }
  }
  _many(e, d) {
    const m = e.mesh, keep = [];
    for (const p of e.parts) {
      p.t += d;
      if (p.t < 0) { keep.push(p); continue; }
      if (p.t > p.life) continue;
      p.v.multiplyScalar(Math.exp(-p.drag * d)); p.v.y -= p.g * d;
      p.p.addScaledVector(p.v, d);
      p.a += p.w * d;
      keep.push(p);
    }
    e.parts = keep;
    let i = 0;
    for (const p of keep) {
      const k = p.t < 0 ? 0 : Math.min(1, p.t / 0.08) * (1 - smoothstep(p.life * 0.7, p.life, p.t));
      this._q.setFromAxisAngle(p.ax, p.a);
      this._m.compose(p.p, this._q, this._s.setScalar(Math.max(1e-4, p.s * k)));
      m.setMatrixAt(i++, this._m);
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
    m.visible = i > 0;
  }
  // everything put away at once (the game is over, or the extras were switched off)
  clear() {
    for (const kind in this.k) {
      const e = this.k[kind];
      e.mesh.visible = false;
      if (e.parts) e.parts.length = 0; else { e.live = null; if (e.U) e.U.uBreak.value = 0; }
    }
  }
}
