// Risk Blaster's escort and the overlord's brood, when their models were served (look only; staged fights only):
//   the allies   the other starfighter designs. Two of the clean builds (ally-a, ally-c) fly in on the fighter's
//                wings as it comes in, and peel away into the distance before the first drones are up; between
//                waves, once the overlord has gone up, one or two of the other builds (ally-a2, ally-b2, ally-c2: kept
//                small, in the mid-ground) cross the band. Lit as the passing ships are (the region's lamps and rims,
//                the sky mirrored: BlasterSpace.genKit), with cyan running lights at their wing tips. Never more than
//                two on screen, and never while the answers' drones are up after the entrance.
//   the brood    the other demon designs and builds: small dark shapes far off in the region's nebula, each in one
//                silhouette material rimmed in the region's colour (the simplified builds' patchy maps are never
//                drawn). They gather as each overlord comes up out of the distance (three at most, three designs a
//                wave in turn, so every one is seen within three waves) and scatter when it dies.
// One mesh per ship or shape on screen, each sharing its model's one geometry and material; the running lights are
// one draw. No lights, no shadows. Everything is hidden while GFX.extras is off. Everything runs on the show clock.
const BLASTER_ESCORT = {
  NEAR: ["ally-a", "ally-c"], // the clean builds: close beside the fighter
  FAR: ["ally-a2", "ally-b2", "ally-c2"], // the simplified builds: small, in the mid-ground
  BROOD: ["brood-a", "brood-a1", "brood-a2", "brood-a3", "brood-b", "brood-d", "brood-d2", "brood-f", "brood-f2"],
  // where the brood wait, as places in the band (0..1 across, 0..1 down): beside the drones' rows, clear of the
  // overlord and of every letter
  SLOTS: [[0.045, 0.41], [0.955, 0.45], [0.05, 0.05], [0.95, 0.06]],
  DEPTH: 150, // how far off they are
};
class BlasterEscort {
  constructor(g) {
    this.g = g;
    const s = g.scene;
    // ---- the allies
    this.kits = {};
    for (const n of BLASTER_ESCORT.NEAR.concat(BLASTER_ESCORT.FAR)) { const k = g.space && g.space.genKit(n); if (k) this.kits[n] = k; }
    const any = Object.values(this.kits)[0];
    this.ships = any ? [0, 1].map(() => { const m = new THREE.Mesh(any.geo, any.mat); m.visible = false; m.frustumCulled = false; s.add(m); return { m, mode: "", t: 0, side: 1, a: new THREE.Vector3(), b: new THREE.Vector3(), v: new THREE.Vector3(), size: 1, dur: 1, delay: 0, roll: 0 }; }) : [];
    // their running lights: two to a ship, one draw for all of them
    if (this.ships.length) {
      this.lightGeo = new THREE.BufferGeometry();
      this.lightGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
      this.lights = new THREE.Points(this.lightGeo, new THREE.PointsMaterial({ map: glowTexture(), color: new THREE.Color(0.35, 1.6, 2.0), size: 0.55, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      this.lights.frustumCulled = false; this.lights.visible = false; this.lights.renderOrder = 5;
      s.add(this.lights);
    }
    this.nearI = Math.floor(Math.random() * 2); this.farI = Math.floor(Math.random() * 3); this.passSide = Math.random() < 0.5 ? -1 : 1;
    // ---- the brood
    this.broodGeo = [];
    for (const n of BLASTER_ESCORT.BROOD) {
      const model = g.gen && g.gen.brood && g.gen.brood[n], made = model && modelGeometry(model);
      if (!made) continue;
      const bb = made.box, sz = bb.getSize(new THREE.Vector3()), k = 1 / Math.max(1e-3, sz.x); // (one unit across its wings)
      made.geo.deleteAttribute("aRest"); made.geo.deleteAttribute("uv");
      made.geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
      made.geo.scale(k, k, k);
      made.geo.computeBoundingSphere();
      this.broodGeo.push(made.geo);
      model.scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { for (const q of ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap"]) if (m[q]) m[q].dispose(); m.dispose(); }); } }); // (only its shape is used)
    }
    if (this.broodGeo.length) {
      this.broodU = { uRim: { value: new THREE.Color(0.6, 0.3, 1) }, uBody: { value: new THREE.Color(0.012, 0.006, 0.03) }, uK: { value: 1 } };
      const mat = new THREE.ShaderMaterial({
        uniforms: this.broodU, fog: false,
        vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
        // (a dark shape; a rim of the region's light round its edges, a little more from above)
        fragmentShader: "uniform vec3 uRim; uniform vec3 uBody; uniform float uK; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = normalize(vN); float f = 1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0); gl_FragColor = vec4(uBody + uRim * (pow(f, 3.0) * 1.7 + 0.25 * max(0.0, n.y) * f) * uK, 1.0); }",
      });
      this.brood = [0, 1, 2].map(() => { const m = new THREE.Mesh(this.broodGeo[0], mat); m.visible = false; m.frustumCulled = false; m.renderOrder = -5; s.add(m); return { m, on: false, t: 0, delay: 0, slot: 0, home: new THREE.Vector3(), v: new THREE.Vector3(), out: 0, ph: Math.random() * 6.28, size: 1 }; });
    } else this.brood = [];
    this.broodI = Math.floor(Math.random() * 3) * 3;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, "YXZ"); this._m = new THREE.Matrix4();
  }
  // a place in the band (bx across, by down, 0..1) seen d away from the lens
  bandAt(bx, by, d, out) {
    const g = this.g, b = g.band, cam = g.camera;
    const y = b ? b.top + b.h * by : GFX.h * by;
    out.set(bx * 2 - 1, 1 - (2 * y) / GFX.h, 0.5).unproject(cam).sub(cam.position).normalize();
    return out.multiplyScalar(d).add(cam.position);
  }
  // ---- the allies ----------------------------------------------------------------------------------------
  // the run starts: two fly in on the fighter's wings, and peel away
  entrance() {
    if (!GFX.extras || REDUCED_MOTION || !this.ships.length) return;
    const near = BLASTER_ESCORT.NEAR.filter((n) => this.kits[n]);
    if (!near.length) return;
    const k = this.g.shipScale;
    this.ships.forEach((sh, i) => {
      const name = near[(this.nearI + i) % near.length];
      this.fly(sh, name, "escort", { side: i ? 1 : -1, size: 1.25 * k, dur: 1.15, delay: 0 });
    });
  }
  // between waves, once the overlord has gone up: one or two cross the band in the mid-ground
  pass() {
    if (!GFX.extras || !this.ships.length) return;
    const far = BLASTER_ESCORT.FAR.filter((n) => this.kits[n]);
    if (!far.length) return;
    const two = Math.random() < 0.6, side = (this.passSide = -this.passSide), d = 34;
    this.ships.forEach((sh, i) => {
      if (i && !two) return;
      const name = far[this.farI++ % far.length];
      this.fly(sh, name, "pass", { side, size: 1.5, dur: REDUCED_MOTION || GFX.calm ? 2.6 : 1.9, delay: 0.45 + i * 0.28 });
      // from beyond one edge of the band to beyond the other, through the open corridor between the drones' two rows
      // (where the next question's drones will stand), climbing a little and a little deeper as it goes
      this.bandAt(side < 0 ? -0.18 : 1.18, 0.4 + i * 0.045, d + i * 4, sh.a);
      this.bandAt(side < 0 ? 1.2 : -0.2, 0.35 + i * 0.045, d + 10 + i * 4, sh.b);
    });
  }
  fly(sh, name, mode, o) {
    const kit = this.kits[name];
    if (!kit) return;
    sh.m.geometry = kit.geo; sh.m.material = kit.mat;
    sh.mode = mode; sh.t = 0; sh.side = o.side; sh.size = o.size; sh.dur = o.dur; sh.delay = o.delay; sh.roll = 0;
    sh.w = kit.geo.boundingBox ? kit.geo.boundingBox.max.x - kit.geo.boundingBox.min.x : 0.8;
    sh.m.visible = false;
  }
  // ---- the brood -------------------------------------------------------------------------------------------
  // an overlord comes up out of the distance: three of its brood gather, one after another, as it comes
  gather() {
    if (!this.brood.length) return;
    const slots = [0, 1, 2 + Math.floor(Math.random() * 2)];
    this.brood.forEach((b, i) => {
      b.m.geometry = this.broodGeo[(this.broodI + i) % this.broodGeo.length];
      b.on = true; b.out = 0; b.t = 0; b.delay = 0.25 + i * 0.55; b.slot = slots[i]; b.size = (i === 2 ? 3.2 : 4.2) * (0.9 + Math.random() * 0.2);
      b.m.visible = false;
    });
    this.broodI = (this.broodI + 3) % this.broodGeo.length;
  }
  // it dies: they scatter, out and away
  scatter() {
    this.brood.forEach((b) => {
      if (!b.on || b.out) return;
      b.out = 1e-4;
      const c = this.g.camera.position;
      b.v.copy(b.m.position).sub(c).normalize().multiplyScalar(30); // (away, deeper into the nebula ...)
      b.v.x += (b.m.position.x - c.x > 0 ? 1 : -1) * 55; b.v.y += 22; // (... and out to the side, up)
    });
  }
  hideAll() { this.ships.forEach((sh) => { sh.mode = ""; sh.m.visible = false; }); if (this.lights) this.lights.visible = false; this.brood.forEach((b) => { b.on = false; b.m.visible = false; }); }
  // ---- every frame ---------------------------------------------------------------------------------------
  update(d) {
    if (!GFX.extras) { this.hideAll(); return; }
    const g = this.g, P = g.pano;
    // the allies
    let lit = 0;
    const L = this.lights && this.lightGeo.attributes.position;
    for (const sh of this.ships) {
      if (!sh.mode) continue;
      sh.t += d;
      const t = sh.t - sh.delay, m = sh.m;
      if (t < 0) { m.visible = false; continue; }
      const q = t / sh.dur;
      if (sh.mode === "escort") { // on the fighter's wing; then away
        const c = g.stage.shipPos(this._v), k = g.shipScale;
        if (q < 1) {
          m.position.copy(c).add(this._w.set(sh.side * 2.3 * k, 0.32 * k + Math.sin(t * 2.3 + sh.side) * 0.06 * k, 1.2 * k));
          sh.roll = -sh.side * 0.12 + Math.sin(t * 1.7) * 0.05;
          this._e.set(0.04, 0, sh.roll);
        } else { // peel away: a hard bank outward, and off into the distance
          const p = q - 1, e = p * p;
          m.position.copy(c).add(this._w.set(sh.side * (2.3 + 9 * e + 3 * p) * k, (0.32 + 2.4 * e) * k, (1.2 - 70 * e - 6 * p) * k));
          sh.roll = -sh.side * (0.12 + 1.1 * smoothstep(0, 0.35, p));
          this._e.set(0.04 - 0.25 * smoothstep(0, 0.5, p), -sh.side * 0.35 * smoothstep(0, 0.5, p), sh.roll);
          if (p > 1.3) { sh.mode = ""; m.visible = false; continue; }
        }
        m.scale.setScalar(sh.size);
      } else { // a pass across the band
        const e = q < 1 ? q : 1;
        m.position.lerpVectors(sh.a, sh.b, e);
        const dir = this._w.subVectors(sh.b, sh.a).normalize();
        sh.roll = sh.side * (0.5 + 0.25 * Math.sin(q * Math.PI));
        this._e.set(0, Math.atan2(-dir.x, -dir.z), sh.roll);
        m.scale.setScalar(sh.size * smoothstep(0, 0.08, q) * (1 - smoothstep(0.92, 1, q)));
        if (q >= 1) { sh.mode = ""; m.visible = false; continue; }
      }
      m.quaternion.setFromEuler(this._e);
      m.visible = true;
      // two running lights at its wing tips: a slow cyan beat, port and starboard in turn
      if (L && lit < 4) {
        m.updateMatrixWorld();
        for (const sd of [-1, 1]) { this._v.set(sd * sh.w * 0.48, 0.02, 0.28).applyMatrix4(m.matrixWorld); L.setXYZ(lit++, this._v.x, this._v.y, this._v.z); }
      }
    }
    if (this.lights) {
      for (let i = lit; i < 4; i++) L.setXYZ(i, 0, -1e4, 0);
      L.needsUpdate = true;
      this.lights.visible = lit > 0;
      this.lights.material.size = 0.42 * (0.75 + 0.25 * Math.sin(VFX.t * 5.2)) * (this.ships[0].mode === "escort" ? g.shipScale : 1.6);
    }
    // the brood
    if (this.brood.length) {
      const U = this.broodU;
      if (P && P.rimA) U.uRim.value.copy(P.rimA.color).lerp(P.rimB.color, 0.5).multiplyScalar(0.9); // (the region's own light)
      for (const b of this.brood) {
        if (!b.on) continue;
        b.t += d;
        const t = b.t - b.delay, m = b.m;
        if (t < 0) { m.visible = false; continue; }
        if (!b.out) { // it comes out of the deep to its place and waits there, rocking on its wings
          const [bx, by] = BLASTER_ESCORT.SLOTS[b.slot], come = smoothstep(0, 1.1, t);
          this.bandAt(bx, by, BLASTER_ESCORT.DEPTH * (1.6 - 0.6 * come), b.home);
          m.position.copy(b.home);
          m.position.y += Math.sin(VFX.t * 0.9 + b.ph) * 0.7;
          m.scale.setScalar(b.size * smoothstep(0, 0.5, t));
          m.lookAt(g.camera.position);
          m.rotateZ(Math.sin(VFX.t * 0.6 + b.ph) * 0.12);
        } else { // scattering
          b.out += d;
          m.position.addScaledVector(b.v, d);
          m.rotateZ((b.v.x > 0 ? -1 : 1) * d * 1.5);
          m.scale.setScalar(b.size * (1 - smoothstep(0.2, 0.9, b.out)));
          if (b.out > 0.9) { b.on = false; m.visible = false; continue; }
        }
        m.visible = true;
      }
    }
  }
}
