// Memory Bank's machinery: gear trains round the dial, a row of deck lamps over the
// door (one per card, lit as each is banked), coin stacks by the bullion, lamp panels
// on the wall. Look and sound only: nothing here touches the cards, grades or boxes.

// A spur gear lying in the x-y plane: flat-topped teeth, a hub, five lightening holes.
function memoryGearGeometry(r, teeth, thick) {
  const shape = new THREE.Shape(), n = teeth * 4, ri = r * 0.8;
  for (let i = 0; i < n; i++) {
    const a = ((i - 0.5) / n) * Math.PI * 2, rr = i % 4 < 2 ? r : ri, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  const hole = (x, y, hr) => { const h = new THREE.Path(); h.absarc(x, y, hr, 0, Math.PI * 2, true); shape.holes.push(h); };
  hole(0, 0, r * 0.17);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; hole(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, r * 0.14); }
  return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 6 });
}

class MemoryWorks {
  constructor(game, mats) {
    const g = (this.g = game), s = g.scene, Y = MEMORY_DOOR_Y;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._z = new THREE.Vector3(0, 0, 1);
    this.turn = 0; // how far the trains have turned
    this.kick = 0; // a deposit spins them on; a miss jerks them back
    // gear trains: three gears each side of the coin slot, and the same round the foot of
    // the dial. Neighbours mesh, so they turn opposite ways at speeds set by their teeth.
    const small = memoryGearGeometry(0.6, 10, 0.16), big = memoryGearGeometry(0.7, 12, 0.16);
    this.small = new THREE.InstancedMesh(small, mats.chrome, 8);
    this.big = new THREE.InstancedMesh(big, mats.gold, 4);
    this.gears = [];
    let ns = 0, nb = 0;
    [1, -1].forEach((v) => [-1, 1].forEach((sd) => [[9, 10], [19.4, 12], [29.8, 10]].forEach(([deg, teeth], k) => {
      const a = (deg * Math.PI) / 180;
      this.gears.push({ mesh: teeth === 10 ? this.small : this.big, i: teeth === 10 ? ns++ : nb++, x: sd * Math.sin(a) * 7.2, y: v * Math.cos(a) * 7.2, w: (k % 2 ? -1 : 1) * sd * v * (10 / teeth), ph: k % 2 ? Math.PI / teeth : 0 });
    })));
    [this.small, this.big].forEach((m) => {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.layers.set(1); // (not in the floor's reflection: that pass stays cheap)
      m.position.set(0, Y, 0.3);
      s.add(m);
    });
    g.decorCheap(this.small, this.big);

    // deck lamps: an arc of them over the door, one per card in the deck. Banked cards
    // light theirs; the next one breathes; a miss washes the dark ones red for a moment.
    const lamp = new THREE.BoxGeometry(0.3, 0.44, 0.1), N = Math.max(1, Math.min(DECK_SIZE, g.total || DECK_SIZE));
    const lp = lamp.attributes.position, pos = new Float32Array(lp.count * N * 3), idx = new Float32Array(lp.count * N), ind = [];
    for (let i = 0; i < N; i++) {
      pos.set(lp.array, i * lp.count * 3);
      idx.fill(i, i * lp.count, (i + 1) * lp.count);
      for (let j = 0; j < lamp.index.count; j++) ind.push(lamp.index.array[j] + i * lp.count);
    }
    lamp.dispose();
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    lg.setAttribute("aIdx", new THREE.BufferAttribute(idx, 1));
    lg.setIndex(ind);
    this.lampMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCount: { value: N }, uLit: { value: 0 }, uMiss: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: `attribute float aIdx; uniform float uCount; varying float vI;
        void main(){
          vI = aIdx;
          float a = -(aIdx - (uCount - 1.0) * 0.5) * 0.042; float c = cos(a); float s = sin(a);
          vec3 p = position + vec3(0.0, 9.95, 0.0);
          p.xy = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `uniform float uTime; uniform float uLit; uniform float uMiss; uniform float uFlash; varying float vI;
        void main(){
          float on = step(vI + 0.5, uLit);
          float next = step(abs(vI - floor(uLit + 0.001)), 0.5) * (1.0 - on);
          vec3 col = mix(vec3(0.07, 0.11, 0.09), vec3(0.5, 1.9, 0.75) * (1.0 + uFlash * step(uLit - 1.5, vI)), on);
          col += vec3(1.3, 1.0, 0.3) * next * (0.35 + 0.3 * sin(uTime * 2.4));
          col += vec3(2.4, 0.18, 0.14) * uMiss * (1.0 - on);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.lamps = new THREE.Mesh(lg, this.lampMat);
    this.lamps.position.set(0, Y, 0.36);
    this.lamps.frustumCulled = false;
    this.lamps.layers.set(1);
    s.add(this.lamps);

    // lamp panels on the wall either side of the door (they show on wide screens)
    this.panelMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpen: { value: 0 }, uMiss: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uTime; uniform float uOpen; uniform float uMiss; varying vec2 vUv;
        void main(){
          vec2 q = vUv * vec2(4.0, 14.0), c = floor(q), f = fract(q) - 0.5;
          float r = fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
          float lamp = smoothstep(0.34, 0.24, max(abs(f.x), abs(f.y) * 1.25));
          float on = step(r, 0.25 + 0.6 * uOpen) * (0.6 + 0.4 * sin(uTime * (0.4 + r * 1.2) + r * 40.0));
          vec3 col = vec3(0.02, 0.03, 0.03) + lamp * (vec3(0.06, 0.1, 0.08) + mix(vec3(1.5, 1.1, 0.4), vec3(0.4, 1.6, 0.7), step(0.5, r)) * on);
          col += lamp * vec3(2.2, 0.16, 0.12) * uMiss * step(0.6, r);
          float edge = max(abs(vUv.x - 0.5) * 2.0, abs(vUv.y - 0.5) * 2.0);
          col = mix(col, vec3(0.5, 0.36, 0.16), smoothstep(0.93, 0.97, edge));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.panels = [-1, 1].map((sd) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 9.4), this.panelMat);
      p.position.set(sd * 15.6, Y + 0.4, -1.15);
      p.layers.set(1);
      s.add(p);
      return p;
    });
    g.decor(...this.panels);

    // coin stacks beside the bullion
    const piles = [[-2.75, 0.95, 7], [-2.1, 1.5, 4], [2.6, 1.05, 9], [3.25, 0.55, 5], [0.4, 1.75, 3]];
    const count = piles.reduce((n, p) => n + p[2], 0);
    const flat = this._q.clone().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), tw = new THREE.Quaternion();
    this.coins = g.stacks.map((grp) => {
      const m = new THREE.InstancedMesh(g.coinGeo, g.coinMat, count);
      let n = 0;
      piles.forEach(([x, z, h]) => {
        for (let i = 0; i < h; i++) {
          tw.setFromAxisAngle(THREE.Object3D.DefaultUp, rand(6.28)).multiply(flat);
          m.setMatrixAt(n++, this._m.compose(this._p.set(x + rand(-0.03, 0.03), 0.06 + i * 0.122, z + rand(-0.03, 0.03)), tw, this._s));
        }
      });
      m.frustumCulled = false;
      grp.add(m);
      g.decor(m);
      return m;
    });
    this.missT = 0;
    this.flashT = 0;
    this.place();
  }
  place() {
    const a = this.turn;
    this.gears.forEach((gr) => {
      gr.mesh.setMatrixAt(gr.i, this._m.compose(this._p.set(gr.x, gr.y, 0), this._q.setFromAxisAngle(this._z, a * gr.w + gr.ph), this._s));
    });
    this.small.instanceMatrix.needsUpdate = true;
    this.big.instanceMatrix.needsUpdate = true;
  }
  // a card is banked: the trains spin on, its lamp lights, the lock goes home
  banked() { this.kick = 2.6; this.flashT = 1; Sound.sfx("lock"); }
  // a card is missed: the trains jerk back, the dark lamps wash red
  missed() { this.kick = -1.4; this.missT = 1; }
  update(dt, t) {
    const g = this.g;
    this.kick *= Math.pow(0.03, dt);
    this.turn += dt * (0.22 + this.kick);
    this.place();
    this.missT = Math.max(0, this.missT - dt * 1.4);
    this.flashT = Math.max(0, this.flashT - dt * 1.2);
    const u = this.lampMat.uniforms;
    u.uLit.value += (g.deposits - u.uLit.value) * Math.min(1, dt * 6);
    u.uMiss.value = this.missT * this.missT;
    u.uFlash.value = this.flashT;
    const pu = this.panelMat.uniforms;
    pu.uOpen.value = g.open;
    pu.uMiss.value = this.missT * this.missT;
  }
  dispose() {
    // (the coin stacks share the game's coin geometry and material: the game frees those)
    [this.small, this.big, ...this.coins].forEach((m) => m.dispose());
  }
}
