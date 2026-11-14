// The Strategy Guide's archive: a long vaulted aisle of bookshelves on two tiers,
// hanging lamps, holo-books open on lecterns, loose pages adrift, dust in the light, a
// rose window at the far end. It is calm on purpose: everything drifts, nothing darts,
// and while a chapter is being read it all but stops. Look only.
const LIB_GLSL = "float libH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }";

// A wall of books, drawn in the shader: bays and shelves, spines of every width, height
// and leather, gilt title bands, and here and there a holo-book glowing on the shelf.
function libraryShelfMaterial(len, tall) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(len, tall) } }),
    vertexShader: "varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS} ${LIB_GLSL}
      uniform float uTime; uniform vec2 uSize; varying vec2 vUv; varying float vDepth;
      void main(){
        vec2 p = vUv * uSize;
        float bx = fract(p.x / 4.0), row = floor(p.y / 1.25), ry = fract(p.y / 1.25);
        float sx = p.x / 0.115, si = floor(sx), sf = fract(sx);
        float h1 = libH(vec2(si, row)), h2 = libH(vec2(si + 17.0, row + 3.0));
        float top = 0.12 + 0.86 * (0.55 + 0.42 * h1);
        float book = step(0.12, ry) * step(ry, top) * step(0.05, sf) * step(sf, 0.95) * step(0.08, h2);
        vec3 leather = h1 < 0.25 ? vec3(0.3, 0.08, 0.1) : (h1 < 0.5 ? vec3(0.08, 0.13, 0.32) : (h1 < 0.75 ? vec3(0.09, 0.22, 0.17) : vec3(0.3, 0.2, 0.08)));
        float lamp = 0.3 + 0.7 * exp(-pow((mod(p.x + 4.0, 8.0) - 4.0) * 0.42, 2.0)); // warm pools under the hanging lamps
        vec3 col = vec3(0.012, 0.01, 0.022);
        col = mix(col, leather * (0.5 + 0.5 * sin(sf * 3.1416)) * (0.55 + 0.45 * h2), book);
        float gilt = book * step(abs(ry - (0.12 + (top - 0.12) * 0.72)), 0.035);
        col += vec3(0.9, 0.62, 0.22) * gilt * 0.7;
        col *= lamp * vec3(1.15, 0.95, 0.78);
        float holo = book * step(0.972, h2);
        vec3 hc = h1 < 0.33 ? vec3(0.2, 0.95, 1.0) : (h1 < 0.66 ? vec3(1.0, 0.25, 0.85) : vec3(1.0, 0.85, 0.3));
        col += hc * holo * (1.0 + 0.45 * sin(uTime * 0.8 + si * 1.7)) * (0.55 + 0.45 * step(0.5, fract(ry * 9.0)));
        // the case itself: uprights between bays, a board under every shelf, a brass lip
        float wood = max(step(bx, 0.028) + step(0.972, bx), step(ry, 0.09));
        col = mix(col, vec3(0.06, 0.04, 0.07) * lamp + vec3(0.35, 0.24, 0.1) * step(0.07, ry) * step(ry, 0.09) * lamp, clamp(wood, 0.0, 1.0));
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}

class LibraryScene extends Scene3D {
  constructor() {
    super({ fov: 58, far: 260, fog: [0x080519, 16, 84], bg: 0x080519 });
    this.reading = false; // a chapter is open: hold almost still
    this.calm = 1;
    if (!this.has3D) return;
    const s = this.scene, L = 84, Z0 = 10, zc = Z0 - L / 2;
    s.userData.post = { exposure: 1.08, bloom: 0.75, threshold: 1.05, saturation: 1.08, contrast: 1.08, vignette: 1.2, ao: 1, shadow: 0.8, shadowLen: 0.12, sun: [0.2, 1, 0.5], dirt: 0.35, sharpen: 0.4, fringe: 0.25 };
    s.add(new THREE.AmbientLight(0x4a3d78, 0.9));
    const key = new THREE.DirectionalLight(0xffe0b0, 0.7);
    key.position.set(2, 10, 6);
    s.add(key);
    const box = new THREE.BoxGeometry(1, 1, 1);
    // the walls of books: a lower and an upper tier each side
    const lower = libraryShelfMaterial(L, 10), upper = libraryShelfMaterial(L, 8.75);
    [-1, 1].forEach((sd) => {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(L, 10), lower);
      a.position.set(sd * 5.2, 5, zc); a.rotation.y = -sd * Math.PI / 2;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(L, 8.75), upper);
      b.position.set(sd * 7.1, 15, zc); b.rotation.y = -sd * Math.PI / 2;
      s.add(a, b);
    });
    // joinery and ironwork, one batch: uprights, cornices, the gallery and its rail,
    // arches overhead, lamp chains, lecterns, a rolling ladder, the end wall
    const B = new RacerBatch(), G = new RacerBatch();
    const WOOD = 0x2a1c2e, DARK = 0x130c1c, BRASS = 0x9a6a2a;
    const put = (geo, m, color, b = B, k = 1) => { b.add(geo, m, color, k); geo.dispose(); };
    [-1, 1].forEach((sd) => {
      for (let z = Z0; z >= Z0 - L; z -= 4) B.add(box, racerM(sd * 5.05, 5, z, 0.34, 10, 0.22), WOOD);
      B.add(box, racerM(sd * 5.0, 10.2, zc, 0.9, 0.4, L), WOOD); // cornice
      B.add(box, racerM(sd * 6.05, 10.52, zc, 2.3, 0.2, L), DARK); // gallery floor
      B.add(box, racerM(sd * 5.0, 11.55, zc, 0.07, 0.07, L), BRASS); // its rail
      G.add(box, racerM(sd * 4.97, 10.36, zc, 0.04, 0.05, L), 0xffc878, 1.1); // a line of light under the gallery
      for (let z = Z0; z >= Z0 - L; z -= 2) B.add(box, racerM(sd * 5.0, 11.05, z, 0.05, 1.0, 0.05), BRASS);
      for (let z = Z0; z >= Z0 - L; z -= 4) B.add(box, racerM(sd * 6.98, 15, z, 0.3, 8.75, 0.2), WOOD);
      B.add(box, racerM(sd * 6.9, 19.55, zc, 0.9, 0.4, L), WOOD);
    });
    this.lampZ = [];
    for (let z = Z0 - 6; z >= Z0 - L; z -= 8) {
      const arch = new THREE.TorusGeometry(7.1, 0.22, 5, 20, Math.PI);
      put(arch, racerM(0, 19.6, z), WOOD);
      B.add(box, racerM(0, 26.5, z, 0.5, 0.6, 0.5), BRASS);
      B.add(box, racerM(0, 22.2, z, 0.035, 8.6, 0.035), DARK); // chain
      put(new THREE.CylinderGeometry(0.16, 0.42, 0.42, 8), racerM(0, 17.8, z), BRASS);
      put(new THREE.SphereGeometry(0.24, 8, 6), racerM(0, 17.52, z), 0xffe2a8, G, 2.2);
      this.lampZ.push(z);
    }
    // lecterns
    this.lecterns = [[-2.6, -4], [2.7, -11], [-2.7, -19], [2.6, -28]];
    this.lecterns.forEach(([x, z]) => {
      put(racerPlate(0.9, 0.16, 0.9, 0.05, true), racerM(x, 0.08, z), DARK);
      put(new THREE.CylinderGeometry(0.11, 0.2, 2.0, 6), racerM(x, 1.1, z), WOOD);
      put(racerPlate(1.5, 0.1, 1.0, 0.04, true), racerM(x, 2.18, z, 1, 1, 1, 0.5), WOOD);
      B.add(box, racerM(x, 2.03, z + 0.46, 1.5, 0.08, 0.05, 0.5), BRASS);
      put(new THREE.TorusGeometry(0.62, 0.02, 4, 24), racerM(x, 0.18, z, 1, 1, 1, Math.PI / 2), 0x5fd8ff, G, 1.4);
    });
    // a rolling ladder on the left-hand shelves
    [-0.35, 0.35].forEach((dz) => racerStrut(B, box, new THREE.Vector3(-3.9, 0, -8 + dz), new THREE.Vector3(-5.0, 9.8, -8 + dz), 0.08, BRASS));
    for (let i = 1; i < 12; i++) B.add(box, racerM(-3.9 - (1.1 * i) / 12.5, (9.8 * i) / 12.5, -8, 0.06, 0.06, 0.7), BRASS);
    // the end wall round the rose window
    B.add(box, racerM(0, 13, Z0 - L - 0.6, 15, 26, 1), DARK);
    this.joinery = new THREE.Mesh(B.build("color"), new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.lights = new THREE.Mesh(G.build("color"), new THREE.MeshBasicMaterial({ vertexColors: true }));
    s.add(this.joinery, this.lights);
    // lamp glows and their cones of light
    this.lampZ.forEach((z) => {
      const gl = glowSprite(neon(0xffd9a0, 1.2), 4.2, 0.55);
      gl.position.set(0, 17.5, z);
      gl.layers.set(1);
      const cone = examBeam({ color: 0xffdcae, top: 0.3, bottom: 4.6, height: 17.5, intensity: 0.06 }); // (a still shaft: no flicker)
      cone.position.set(0, 17.4, z);
      cone.layers.set(1);
      s.add(gl, cone);
      this.decor(cone);
    });
    // the floor: dark stone flags, a warm pool under each lamp, the window's light lying along it
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 } }),
      vertexShader: "varying vec3 vW; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `${GLSL_FOG_PARS} ${LIB_GLSL} uniform float uTime; varying vec3 vW; varying float vDepth;
        void main(){
          vec2 c = floor(vW.xz / 1.3), f = fract(vW.xz / 1.3);
          float joint = max(step(f.x, 0.03), step(f.y, 0.03));
          vec3 col = vec3(0.03, 0.024, 0.05) * (0.8 + 0.4 * libH(c)) * (1.0 - 0.6 * joint);
          float pool = exp(-(pow(mod(vW.z - 4.0, 8.0) - 4.0, 2.0) * 0.16 + vW.x * vW.x * 0.09));
          col += vec3(0.5, 0.34, 0.16) * pool * 0.34;
          col += vec3(0.3, 0.22, 0.6) * exp(-vW.x * vW.x * 0.05) * smoothstep(-20.0, -74.0, vW.z) * 0.22; // the rose window on the stone
          gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
        }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, L + 12), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, zc);
    s.add(floor);
    // the rose window: twelve petals of coloured light, breathing slowly
    this.roseMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        void main(){
          // a window of filled panes (a gold hub, eight inner panes, sixteen outer ones in alternating jewel
          // colours, thin leads between): a solid object at any distance, not a ring of dashes
          vec2 p = vUv * 2.0 - 1.0; float r = length(p), a = atan(p.y, p.x) / 6.2832;
          float a8 = abs(fract(a * 8.0) - 0.5), a16 = abs(fract(a * 16.0 + 0.5) - 0.5);
          float i8 = floor(a * 8.0), i16 = floor(a * 16.0 + 0.5);
          float lead = smoothstep(0.035, 0.0, abs(r - 0.2)) + smoothstep(0.035, 0.0, abs(r - 0.6)) + smoothstep(0.05, 0.0, abs(r - 0.96));
          lead += step(0.2, r) * step(r, 0.6) * smoothstep(0.455, 0.5, a8) + step(0.6, r) * smoothstep(0.44, 0.5, a16);
          vec3 inner = mix(vec3(0.42, 0.2, 0.95), vec3(0.16, 0.5, 1.0), mod(i8, 2.0));
          vec3 outer = mix(vec3(0.12, 0.7, 0.85), vec3(0.75, 0.25, 0.85), mod(i16, 2.0));
          vec3 glass = r < 0.2 ? vec3(1.0, 0.72, 0.36) : (r < 0.6 ? inner : outer);
          glass *= 0.8 + 0.2 * sin(uTime * 0.35 + (r < 0.6 ? i8 : i16) * 1.3);
          glass *= 0.72 + 0.4 * smoothstep(1.0, 0.0, r);
          vec3 col = glass * 1.05 * (1.0 - clamp(lead, 0.0, 1.0)) * step(r, 1.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const rose = new THREE.Mesh(new THREE.CircleGeometry(5.2, 48), this.roseMat);
    rose.position.set(0, 11.5, Z0 - L + 0.02);
    s.add(rose);
    const shaft = examBeam({ color: 0x9a8cff, top: 2.2, bottom: 6.5, height: 46, intensity: 0.05 });
    shaft.position.set(0, 11.5, Z0 - L + 1);
    shaft.rotation.x = -(Math.PI / 2 - 0.2); // down the aisle, toward the reader
    shaft.layers.set(1);
    s.add(shaft);
    this.decor(shaft);
    // holo-books: two pages of light standing open over each lectern, lines of text running up them
    this.holoMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute vec3 aTint; attribute float aSeed; varying vec2 vUv; varying vec3 vTint; varying float vSeed; void main(){ vUv = uv; vTint = aTint; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `${LIB_GLSL} uniform float uTime; varying vec2 vUv; varying vec3 vTint; varying float vSeed;
        void main(){
          float y = vUv.y * 13.0 + uTime * 0.12 + vSeed, row = floor(y), fy = fract(y);
          float len = 0.35 + 0.6 * libH(vec2(row, vSeed));
          float line = step(0.3, fy) * step(fy, 0.62) * step(0.08, vUv.x) * step(vUv.x, 0.08 + 0.84 * len);
          float words = step(0.2, fract(vUv.x * 9.0 + libH(vec2(row, 3.0 + vSeed)) * 5.0));
          float edge = smoothstep(0.5, 0.42, abs(vUv.x - 0.5)) * smoothstep(0.5, 0.44, abs(vUv.y - 0.5));
          float frame = 1.0 - smoothstep(0.0, 0.03, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
          gl_FragColor = vec4(vTint * ((0.1 + line * words * 0.95) * edge + frame * 0.7), 1.0);
        }`,
    });
    const hb = [], tints = [[0.25, 0.95, 1.0], [1.0, 0.3, 0.85], [1.0, 0.85, 0.35], [0.55, 1.0, 0.45]];
    this.lecterns.forEach(([x, z], i) => {
      [-1, 1].forEach((sd) => {
        const pg = new THREE.PlaneGeometry(0.72, 0.96);
        pg.applyMatrix4(racerM(x + sd * 0.36, 3.05, z, 1, 1, 1, -0.25, sd * -0.32));
        const n = pg.attributes.position.count;
        pg.setAttribute("aTint", new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, k) => tints[i % 4][k % 3]), 3));
        pg.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Array(n).fill(i * 7.3 + sd), 1));
        hb.push(pg);
      });
    });
    this.holo = new THREE.Mesh(mergeIndexed(hb, ["position", "uv", "aTint", "aSeed"]), this.holoMat);
    this.holo.layers.set(1);
    s.add(this.holo);
    // loose pages adrift in the aisle
    this.pageMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshBasicMaterial({ color: neon(0xcfc6ff, 0.6), side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), 22);
    this.pageMesh.frustumCulled = false;
    this.pageMesh.layers.set(1);
    this.pages = Array.from({ length: 22 }, () => ({ x: rand(-3.6, 3.6), y: rand(0.6, 12), z: rand(4, -46), v: rand(0.08, 0.22), ax: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), ph: rand(6.28), w: rand(0.12, 0.4) }));
    s.add(this.pageMesh);
    this.decorCheap(this.pageMesh);
    this.motes = makeMotes({ count: 90, box: [10, 11, 50], center: [0, 6, -18], color: 0xffe2a8, size: 0.09, k: 0.9 });
    this.motes.layers.set(1);
    s.add(this.motes);
    this.decor(this.motes);
    box.dispose();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this.camBase.set(0, 3.4, 6);
    this.lookAt.set(0, 5.2, -30);
    this.lt = 0;
  }
  update(dt) {
    super.update(dt);
    if (!this.has3D) return;
    // reading: everything slows to a fifth, gently
    this.calm += ((this.reading || GFX.calm || REDUCED_MOTION ? 0.2 : 1) - this.calm) * Math.min(1, dt * 1.5);
    const lt = (this.lt += dt * this.calm);
    this.pages.forEach((p, i) => {
      p.y += p.v * dt * this.calm;
      if (p.y > 13) { p.y = 0.4; p.x = rand(-3.6, 3.6); p.z = rand(4, -46); }
      this.pageMesh.setMatrixAt(i, this._m.compose(this._p.set(p.x + Math.sin(lt * 0.3 + p.ph) * 0.5, p.y, p.z), this._q.setFromAxisAngle(p.ax, p.ph + lt * p.w), this._s));
    });
    this.pageMesh.instanceMatrix.needsUpdate = true;
    this.camBase.set(Math.sin(lt * 0.07) * 0.5 + Pointer.x * 0.3, 3.4 + Math.sin(lt * 0.09) * 0.12 - Pointer.y * 0.15, 6 - 2.2 + Math.sin(lt * 0.05) * 2.2);
    this.lookAt.set(Math.sin(lt * 0.04) * 0.5, 5.2, -30);
    this.placeCamera();
    this.motes.userData.drift(lt);
    FX.sync(this.scene, lt);
  }
  dispose() {
    if (this.pageMesh) this.pageMesh.dispose();
    super.dispose();
  }
}
