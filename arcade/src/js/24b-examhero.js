// The quiet life of the Final Exam's hall. Look only. (The boss that stands in it is in
// 24c-examboss.js.) Every motion here is slow and steady: no events, no flashes.

// The hall's slow life: paper lanterns rising past the windows, moonbeams that sway a
// little, an aurora over the night sky (see examNightMaterial). All of it continuous.
class ExamAmbience {
  constructor(game, beams) {
    const g = (this.g = game);
    this.beams = beams;
    this.lanterns = Array.from({ length: 9 }, (_, i) => {
      const s = glowSprite(neon(i % 3 ? 0xffb86a : 0xff8fd0, 1.3), 1.5, 0.9);
      s.userData = { x: EXAM_WINDOWS[(i * 2 + 1) % EXAM_WINDOWS.length] + rand(-1.4, 1.4), y: rand(0, 30), v: rand(0.25, 0.5), ph: rand(6.28) };
      s.position.z = EXAM_WALL_Z - 4 - (i % 3) * 2;
      s.layers.set(1);
      g.scene.add(s);
      return s;
    });
    this.base = new THREE.Vector3(-0.3, -0.62, 0.72);
    this._d = new THREE.Vector3();
    this._up = new THREE.Vector3(0, -1, 0);
  }
  update(dt, t) {
    this.lanterns.forEach((s) => {
      const u = s.userData;
      u.y += u.v * dt;
      if (u.y > 32) { u.y = -1; u.x = pick(EXAM_WINDOWS) + rand(-1.4, 1.4); }
      s.position.x = u.x + Math.sin(t * 0.3 + u.ph) * 0.6;
      s.position.y = u.y;
      s.material.opacity = 0.55 + 0.25 * Math.sin(t * 1.3 + u.ph);
    });
    this.beams.forEach((b, i) => {
      this._d.copy(this.base); this._d.x += 0.05 * Math.sin(t * 0.11 + i * 1.7);
      b.quaternion.setFromUnitVectors(this._up, this._d.normalize());
      b.material.uniforms.uI.value = 0.075 * (1 + 0.22 * Math.sin(t * 0.23 + i * 2.1));
    });
  }
}

// ---- the Keystone: what stands in the hall when the boss can't -----------------------
// The hall's procedural centrepiece from before the boss model: a faceted crystal spire
// held in three gold claws on a jewelled foot, an armillary of three rings turning about
// it, a laurel over its tip, runes on its faces and a halo of drifting motes. A build
// without the boss model, or one whose model fails to decode, shows this instead. It
// fills with light as questions are ANSWERED (right or wrong makes no difference).

// Sixteen rune glyphs on a 4 x 4 sheet: strokes joining points of a 3 x 3 lattice.
function examRuneTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#000"; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "#fff"; x.fillStyle = "#fff"; x.lineWidth = 5; x.lineCap = "round"; x.lineJoin = "round";
  let seed = 9173;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let k = 0; k < 16; k++) {
    const ox = (k % 4) * 64, oy = Math.floor(k / 4) * 64;
    const pt = (i) => [ox + 14 + (i % 3) * 18, oy + 12 + Math.floor(i / 3) * 20];
    let at = Math.floor(rnd() * 9);
    x.beginPath(); x.moveTo(...pt(at));
    for (let s = 0; s < 4; s++) { let to = Math.floor(rnd() * 9); if (to === at) to = (to + 4) % 9; x.lineTo(...pt(to)); at = to; }
    x.stroke();
    const d = pt(Math.floor(rnd() * 9));
    x.beginPath(); x.arc(d[0], d[1], 4, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}
// A six-sided spire: a point, a girdle, a shoulder, a point. uv.x runs round the six
// faces, uv.y from foot to tip.
function examCrystalGeometry() {
  const R = [[0, 0.55], [0.62, 1.5], [0.5, 2.9], [0, 3.6]];
  const pos = [], uv = [];
  const P = (r, y, i) => { const a = (i / 6) * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; };
  const V = (y) => (y - 0.55) / 3.05;
  const tri = (a, b, c) => { for (const [p, u] of [a, b, c]) { pos.push(...p); uv.push(u, V(p[1])); } };
  for (let i = 0; i < 6; i++) {
    for (let k = 0; k < R.length - 1; k++) {
      const [r0, y0] = R[k], [r1, y1] = R[k + 1], u0 = i / 6, u1 = (i + 1) / 6;
      const a = [P(r0, y0, i), u0], b = [P(r0, y0, i + 1), u1], c = [P(r1, y1, i + 1), u1], d = [P(r1, y1, i), u0];
      if (r1 > 0) tri(a, d, c);
      if (r0 > 0) tri(a, c, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

class ExamMonument {
  constructor(game, gold, env) {
    const g = (this.g = game);
    const mon = (this.group = new THREE.Group());
    this.fill = 0;
    // the foot: a stepped gold base set with eleven gems, one for each chapter of the book
    mon.add(new THREE.Mesh(examLathe([[0, 0], [1.05, 0, true], [1.08, 0.08], [1.0, 0.18, true], [0.72, 0.26], [0.6, 0.36], [0.62, 0.46, true], [0.5, 0.5], [0, 0.5]], 48), gold));
    const gems = [];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2, o = new THREE.OctahedronGeometry(0.075, 0);
      o.scale(1, 0.7, 1); o.translate(Math.cos(a) * 0.87, 0.225, Math.sin(a) * 0.87);
      gems.push(o);
    }
    this.gemMat = new THREE.MeshBasicMaterial({ color: neon(0x9a6bff, 1.6) });
    mon.add(new THREE.Mesh(examMerge(gems), this.gemMat));
    // three claws rising from the foot to grip the crystal at its girdle, and a collar where they meet it
    const claws = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5, at = (r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      claws.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([at(0.5, 0.44), at(0.84, 0.86), at(0.82, 1.34), at(0.6, 1.62), at(0.5, 1.9)]), 24, 0.05, 8, false));
      const tip = new THREE.SphereGeometry(0.075, 10, 8); tip.translate(Math.cos(a) * 0.5, 1.9, Math.sin(a) * 0.5); claws.push(tip);
    }
    claws.push(new THREE.TorusGeometry(0.66, 0.035, 8, 48).rotateX(Math.PI / 2).translate(0, 1.5, 0));
    mon.add(new THREE.Mesh(examMerge(claws), gold));
    // the crystal: lit runes inside (they light from the foot up as questions are answered),
    // a glass skin that mirrors the hall, a rim of light
    const cg = examCrystalGeometry();
    this.runeTex = examRuneTexture();
    this.coreMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFill: { value: 0 }, tRunes: { value: this.runeTex } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uTime; uniform float uFill; uniform sampler2D tRunes; varying vec2 vUv;
        void main(){
          vec2 q = vec2(vUv.x * 6.0, vUv.y * 8.0);
          vec2 cell = floor(q), f = fract(q);
          float id = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
          vec2 guv = (vec2(mod(floor(id * 16.0), 4.0), floor(id * 4.0)) + clamp((f - 0.5) * 1.5 + 0.5, 0.0, 1.0)) / 4.0;
          float inCell = step(0.17, f.x) * step(f.x, 0.83) * step(0.17, f.y) * step(f.y, 0.83);
          float rune = texture2D(tRunes, guv).r * inCell * smoothstep(0.02, 0.1, vUv.y) * smoothstep(0.98, 0.86, vUv.y);
          float lit = smoothstep(uFill + 0.03, uFill - 0.03, vUv.y); // 1 below the level of the light
          float breath = 0.82 + 0.18 * sin(uTime * 1.0 + cell.y * 0.7);
          vec3 cold = vec3(0.3, 0.26, 0.75), warm = vec3(1.25, 0.95, 0.5);
          vec3 col = rune * mix(cold * 0.55, warm * 2.2, lit) * breath;
          col += mix(cold * 0.08, warm * 0.16, lit) * (0.7 + 0.3 * sin(uTime * 0.7 + vUv.y * 9.0)); // the light inside
          col += warm * 0.5 * exp(-abs(vUv.y - uFill) * 40.0) * step(0.004, uFill); // its surface
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const core = new THREE.Mesh(cg, this.coreMat);
    core.scale.setScalar(0.94); core.position.y = 0.12; core.renderOrder = 3;
    this.glass = new THREE.MeshStandardMaterial({ color: 0xa9bcff, metalness: 0.15, roughness: 0.03, envMap: env, envMapIntensity: 2.6, transparent: true, opacity: 0.34, flatShading: true, depthWrite: false });
    const shell = new THREE.Mesh(cg, this.glass);
    shell.renderOrder = 4;
    const rim = fresnelShell(cg, 0x9fb8ff, { power: 2.2, intensity: 1.1, scale: 1.02 });
    rim.renderOrder = 5;
    mon.add(core, shell, rim);
    // the armillary: three gold rings about the crystal, each on its own axis, each carrying a bead of light
    this.beadMat = new THREE.MeshBasicMaterial({ color: neon(0xffe2a8, 1.8) });
    this.rings = [[1.22, 0.5, 0.2, 0.16], [1.4, -0.7, 0.9, -0.12], [1.58, 1.15, -0.5, 0.09]].map(([r, tx, tz, w]) => {
      const tilt = new THREE.Group(), spin = new THREE.Group();
      tilt.position.y = 2.1; tilt.rotation.set(tx, 0, tz);
      spin.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 72).rotateX(Math.PI / 2), gold));
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), this.beadMat);
      bead.position.x = r;
      spin.add(bead);
      tilt.add(spin);
      mon.add(tilt);
      return { spin, w };
    });
    // the laurel: a wreath of gold leaves floating over the tip
    const leaves = [new THREE.TorusGeometry(0.5, 0.018, 6, 40).rotateX(Math.PI / 2)];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, leaf = new THREE.SphereGeometry(0.12, 6, 4);
      leaf.scale(1, 0.16, 0.42);
      leaf.rotateZ(i % 2 ? 0.5 : -0.35); leaf.rotateY(-a + Math.PI / 2 + 0.35);
      leaf.translate(Math.cos(a) * 0.52, i % 2 ? 0.05 : -0.02, Math.sin(a) * 0.52);
      leaves.push(leaf);
    }
    this.laurel = new THREE.Mesh(examMerge(leaves), gold);
    this.laurel.position.y = 4.05;
    mon.add(this.laurel);
    this.tip = glowSprite(neon(0xffe6c0, 1.4), 1.5, 0.3);
    this.tip.position.y = 3.62;
    this.tip.layers.set(1);
    mon.add(this.tip);
    // the halo: motes on slow orbits round the monument; more of them join as the exam goes on
    const N = 130, a0 = new Float32Array(N * 4), a1 = new Float32Array(N * 2), p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      a0[i * 4] = Math.random() * 6.283; a0[i * 4 + 1] = 1.05 + Math.random() * 1.5; a0[i * 4 + 2] = 0.5 + Math.random() * 3.6; a0[i * 4 + 3] = (0.08 + Math.random() * 0.2) * (i % 5 ? 1 : -1);
      a1[i * 2] = Math.random(); a1[i * 2 + 1] = Math.random() * 6.283;
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.BufferAttribute(p, 3));
    hg.setAttribute("aOrbit", new THREE.BufferAttribute(a0, 4));
    hg.setAttribute("aRank", new THREE.BufferAttribute(a1, 2));
    this.haloMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFill: { value: 0 }, tMap: { value: glowTexture() }, uSize: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aOrbit; attribute vec2 aRank; uniform float uTime; uniform float uFill; uniform float uSize; varying float vA;
        void main(){
          float a = aOrbit.x + uTime * aOrbit.w;
          vec3 pos = vec3(cos(a) * aOrbit.y, aOrbit.z + 0.16 * sin(uTime * 0.4 + aRank.y), sin(a) * aOrbit.y);
          vA = smoothstep(aRank.x - 0.04, aRank.x + 0.04, 0.3 + 0.7 * uFill) * (0.55 + 0.45 * sin(uTime * 0.9 + aRank.y * 3.0));
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = uSize * (0.5 + aRank.x * 0.6) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "uniform sampler2D tMap; varying float vA; void main(){ gl_FragColor = vec4(vec3(1.5, 1.2, 0.75) * (texture2D(tMap, gl_PointCoord).r * vA), 1.0); }",
    });
    this.halo = new THREE.Points(hg, this.haloMat);
    this.halo.frustumCulled = false;
    this.halo.layers.set(1);
    g.scene.add(this.halo); // (not in the turning group: the motes keep their own orbits)
  }
  // k: the share of the exam answered so far (0..1)
  update(dt, t, k) {
    this.fill += (k - this.fill) * Math.min(1, dt * 0.8);
    const f = this.fill;
    this.group.rotation.y += dt * 0.22;
    this.rings.forEach((r) => { r.spin.rotation.y += dt * r.w; });
    this.laurel.position.y = 4.05 + Math.sin(t * 0.6) * 0.05;
    this.laurel.rotation.y -= dt * 0.3;
    this.coreMat.uniforms.uFill.value = f;
    this.haloMat.uniforms.uFill.value = f;
    this.haloMat.uniforms.uSize.value = GFX.h * 0.11;
    this.halo.position.copy(this.group.position);
    this.tip.material.opacity = 0.22 + 0.55 * f;
    this.gemMat.color.setRGB(1.0 + 0.9 * f, 0.7 + 0.9 * f, 1.6 - 0.5 * f);
  }
  dispose() { this.runeTex.dispose(); }
}
