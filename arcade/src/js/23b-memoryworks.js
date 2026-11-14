// Memory Bank's machinery: the lock's movement in the middle of the door (three brass
// gears round a steel one, under the handwheel), an arc of deck lamps over the door (one
// per card, lit as each is banked), coin piles by the bullion, lamp panels on the wall.
// Look and sound only: nothing here touches the cards, grades or boxes.

// A spur gear lying in the x-y plane: flat-topped teeth, a hub hole, lightening holes
// (five small ones, or as many larger ones as asked for).
function memoryGearGeometry(r, teeth, thick, holes = 5, holeR = 0.14) {
  const shape = new THREE.Shape(), n = teeth * 4, ri = r * 0.8;
  for (let i = 0; i < n; i++) {
    const a = ((i - 0.5) / n) * Math.PI * 2, rr = i % 4 < 2 ? r : ri, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  const hole = (x, y, hr) => { const h = new THREE.Path(); h.absarc(x, y, hr, 0, Math.PI * 2, true); shape.holes.push(h); };
  hole(0, 0, r * 0.17);
  for (let k = 0; k < holes; k++) { const a = ((k + 0.5) / holes) * Math.PI * 2; hole(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, r * holeR); }
  return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 8 });
}

const MEMORY_SUN_TEETH = 9, MEMORY_PLANET_TEETH = 8;

class MemoryWorks {
  constructor(game, mats) {
    const g = (this.g = game), s = g.scene, Y = MEMORY_DOOR_Y;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1); this._z = new THREE.Vector3(0, 0, 1);
    this.turn = 0; // how far the movement has turned
    this.kick = 0; // a deposit spins it on; a miss jerks it back
    // The movement: a steel gear on the handwheel's arbor and three brass gears round it, on the dark plate in
    // the middle of the door (a clock's train, large enough to watch; the door itself has no teeth). Meshed
    // gears turn opposite ways, at speeds set by their teeth.
    const pitchP = 1.4, pitchS = (pitchP * MEMORY_SUN_TEETH) / MEMORY_PLANET_TEETH; // pitch radii: the same tooth on both
    this.sun = new THREE.Mesh(memoryGearGeometry(pitchS / 0.9, MEMORY_SUN_TEETH, 0.2, 3, 0.2), mats.chrome);
    this.planets = new THREE.InstancedMesh(memoryGearGeometry(pitchP / 0.9, MEMORY_PLANET_TEETH, 0.2, 4, 0.25), mats.brass, 3);
    this.planetAt = [90, 210, 330].map((d) => { const a = (d * Math.PI) / 180; return { a, x: Math.cos(a) * (pitchP + pitchS), y: Math.sin(a) * (pitchP + pitchS) }; });
    // a pin through each brass gear
    const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.17, 0.34, 12).rotateX(Math.PI / 2), mats.chrome, 3);
    this.planetAt.forEach((p, i) => pins.setMatrixAt(i, this._m.compose(this._p.set(p.x, p.y, 0.12), this._q.identity(), this._s)));
    this.planets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    [this.sun, this.planets, pins].forEach((m) => {
      m.frustumCulled = false;
      m.layers.set(1); // (not in the floor's reflection: that pass stays cheap)
      m.position.set(0, Y, 0.69);
      s.add(m);
    });
    this.pins = pins;

    // deck lamps: an arc of them over the door, one per card in the deck. Banked cards
    // light theirs; the next one breathes gold; a miss turns the dark ones red and holds them so for a moment.
    const lamp = new THREE.BoxGeometry(0.76, 1.02, 0.12), N = Math.max(1, Math.min(DECK_SIZE, g.total || DECK_SIZE));
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
      uniforms: { uTime: { value: 0 }, uCount: { value: N }, uLit: { value: 0 }, uMiss: { value: 0 }, uFlash: { value: 0 }, uStep: { value: Math.min(0.092, 1.75 / N) } },
      vertexShader: `attribute float aIdx; uniform float uCount; uniform float uStep; varying float vI; varying vec2 vP;
        void main(){
          vI = aIdx;
          vP = position.xy / vec2(0.38, 0.51);
          float a = -(aIdx - (uCount - 1.0) * 0.5) * uStep; float c = cos(a); float s = sin(a);
          vec3 p = position + vec3(0.0, 10.44, 0.0);
          p.xy = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `uniform float uTime; uniform float uLit; uniform float uMiss; uniform float uFlash; varying float vI; varying vec2 vP;
        void main(){
          float on = step(vI + 0.5, uLit);
          float next = step(abs(vI - floor(uLit + 0.001)), 0.5) * (1.0 - on);
          // a lamp is a lens in a bezel: unlit it is a green you can count, lit it burns, the card in hand breathes gold
          float m = max(abs(vP.x), abs(vP.y));
          float lens = 1.0 - smoothstep(0.66, 0.76, m);
          float rim = smoothstep(0.7, 0.8, m);
          vec3 col = mix(vec3(0.05, 0.3, 0.2) * (0.8 + 0.4 * smoothstep(-1.0, 1.0, vP.y)), vec3(0.22, 2.0, 0.5) * (1.0 + uFlash * step(uLit - 1.5, vI)), on);
          col = mix(col, vec3(2.0, 1.4, 0.3) * (0.78 + 0.22 * sin(uTime * 2.4)), next);
          col = mix(col, vec3(2.9, 0.2, 0.36), uMiss * (1.0 - on));
          vec3 bezel = vec3(0.36, 0.42, 0.4) * (0.35 + 0.65 * smoothstep(-1.2, 1.2, vP.y - vP.x)); // lit from the upper left
          gl_FragColor = vec4(mix(col * lens + vec3(0.012, 0.016, 0.02) * (1.0 - lens), bezel, rim), 1.0);
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

    // coin piles in front of each heap of bars (half as large again as a coin in flight ends, so a pile reads as coins)
    const piles = [[-1.5, 2.3, 4], [-0.2, 3.2, 3], [1.3, 2.6, 8], [2.8, 2.1, 6], [3.9, 2.9, 5]], K = 1.5; // (x counted outward from the door)
    const count = piles.reduce((n, p) => n + p[2], 0);
    const flat = this._q.clone().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), tw = new THREE.Quaternion(), big = new THREE.Vector3(K, K, K);
    this.coinTotal = count;
    this.coins = g.stacks.map((grp) => {
      const m = new THREE.InstancedMesh(g.coinGeo, g.coinMat, count);
      // Laid level by level across the piles, so drawing the first n coins raises every pile together: the
      // piles start two coins high and gain a coin for each card banked.
      let n = 0;
      for (let i = 0; i < 9; i++) piles.forEach(([x, z, h]) => {
        if (i >= h) return;
        tw.setFromAxisAngle(THREE.Object3D.DefaultUp, rand(6.28)).multiply(flat);
        m.setMatrixAt(n++, this._m.compose(this._p.set(x * grp.userData.side + rand(-0.04, 0.04), (0.06 + i * 0.122) * K, z + rand(-0.04, 0.04)), tw, big));
      });
      m.count = Math.min(count, 10);
      m.frustumCulled = false;
      grp.add(m);
      return m;
    });
    this.missT = 0;
    this.flashT = 0;
    this.place();
  }
  place() {
    const a = this.turn * 0.8, ratio = MEMORY_SUN_TEETH / MEMORY_PLANET_TEETH;
    this.sun.rotation.z = a;
    this.planetAt.forEach((p, i) => {
      // (the angle at which this gear's teeth fall between the steel one's, wherever it stands round it)
      this.planets.setMatrixAt(i, this._m.compose(this._p.set(p.x, p.y, 0), this._q.setFromAxisAngle(this._z, p.a + Math.PI + (p.a - a) * ratio - Math.PI / MEMORY_PLANET_TEETH), this._s));
    });
    this.planets.instanceMatrix.needsUpdate = true;
  }
  // a card is banked: the movement spins on, its lamp lights, the lock goes home
  banked() { this.kick = 2.6; this.flashT = 1; Sound.sfx("lock"); }
  // a card is missed: the movement jerks back, the dark lamps turn red and hold
  missed() { this.kick = -1.4; this.missT = 1; }
  update(dt, t) {
    const g = this.g;
    this.kick *= Math.pow(0.03, dt);
    this.turn += dt * (0.22 + this.kick);
    this.place();
    this.missT = Math.max(0, this.missT - dt * 0.95);
    this.flashT = Math.max(0, this.flashT - dt * 1.2);
    const u = this.lampMat.uniforms;
    u.uLit.value += (g.deposits - u.uLit.value) * Math.min(1, dt * 6);
    const show = Math.min(this.coinTotal, 10 + g.deposits); // the piles by the bullion rise with every card banked
    this.coins.forEach((m) => { if (m.count !== show) m.count = show; });
    const red = Math.min(1, this.missT * 2.4); // full red for the first half second, then away (one slow pulse)
    u.uMiss.value = red;
    u.uFlash.value = this.flashT;
    u.uTime.value = t;
    const pu = this.panelMat.uniforms;
    pu.uOpen.value = g.open;
    pu.uMiss.value = red;
  }
  dispose() {
    // (the coin stacks share the game's coin geometry and material: the game frees those)
    [this.planets, this.pins, ...this.coins].forEach((m) => m.dispose());
  }
}
