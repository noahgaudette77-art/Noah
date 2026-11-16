// The Strategy Guide's archive: a long nave of bookshelves on two tiers, seen from the
// height of a reader on a ladder. A rose window of jewel glass stands in the end wall and
// throws its colours onto the stone floor below it; hanging lamps make warm pools by the
// galleries, the air between them is violet, lines of neon run the length of the shelves.
// A great ledger lies open on the desk in the middle; holo-books stand over the lecterns;
// loose pages and dust drift in the light. It is calm on purpose: everything drifts,
// nothing darts, and while a chapter is being read it all but stops. Look only.
const LIB_GLSL = "float libH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }";
const LIB_EYE = 7.0; // the height the archive is seen from
// The rose window's glass at q (the unit disc is the glass; outside it the answer is black): pieces of glass set
// in dark leads. A gold eye; eight lancets, ruby and sapphire by turns, broad at the foot and drawn to a point;
// green quarries between them, a lead down each gap; a band of amber cut into short pieces; sixteen round-headed
// lights in six colours. Every piece is deeper at its rim and no two are quite alike (glass = 1); the same
// function with glass = 0 is the light the window throws, with no grain in it. t makes the panes breathe.
const LIB_ROSE = `
  vec3 libJewel(float i){
    i = mod(i, 6.0);
    return i < 0.5 ? vec3(1.0, 0.1, 0.55) : i < 1.5 ? vec3(0.08, 0.7, 1.0) : i < 2.5 ? vec3(1.0, 0.68, 0.12) : i < 3.5 ? vec3(0.45, 0.16, 1.0) : i < 4.5 ? vec3(0.1, 0.95, 0.5) : vec3(1.0, 0.26, 0.16);
  }
  vec3 libRose(vec2 q, float t, float glass){
    const float LEAD = 0.017, E = 0.009;
    float r = length(q);
    float a = atan(q.y, q.x) / 6.2832 + 0.5 + 0.0625;
    float i8 = floor(a * 8.0), f8 = fract(a * 8.0) - 0.5, i16 = floor(a * 16.0), f16 = fract(a * 16.0) - 0.5;
    float arc8 = 0.7854 * r, d8 = abs(f8) * arc8; // how far round from the middle of its eighth, as a length
    float mott = mix(1.0, 0.84 + 0.32 * libH(floor(q * 26.0)), glass);
    // the eye
    vec3 col = vec3(1.0, 0.7, 0.24) * 1.7 * (1.0 - smoothstep(0.108 - E, 0.108, r)) * (1.0 - 0.5 * glass * smoothstep(0.03, 0.108, r));
    // the lancets and the quarries between them
    float zone = smoothstep(0.142, 0.142 + E, r) * (1.0 - smoothstep(0.6 - E, 0.6, r));
    float W = min(0.3927 * r - LEAD, 0.34 * (0.61 - r)) - LEAD;
    float leaf = (1.0 - smoothstep(W - E, W, d8)) * zone * step(0.0, W);
    vec3 leafCol = mod(i8, 2.0) < 0.5 ? vec3(1.0, 0.09, 0.2) : vec3(0.1, 0.34, 1.0);
    float breathe8 = 0.8 + 0.2 * sin(t * 0.55 + i8 * 1.3), breathe16 = 0.8 + 0.2 * sin(t * 0.47 + i16 * 0.9);
    col += leafCol * 1.55 * leaf * breathe8 * (1.0 - 0.55 * glass * pow(clamp(d8 / max(W, 1e-3), 0.0, 1.0), 2.0)) * mott;
    float quarry = zone * smoothstep(W + 2.0 * LEAD, W + 2.0 * LEAD + E, d8) * smoothstep(LEAD * 0.6, LEAD * 0.6 + E, (0.5 - abs(f8)) * arc8);
    col += vec3(0.05, 0.42, 0.3) * 0.55 * quarry * mott;
    // the band
    float band = smoothstep(0.627, 0.627 + E, r) * (1.0 - smoothstep(0.672 - E, 0.672, r));
    float piece = smoothstep(0.007, 0.007 + E, (0.5 - abs(fract(a * 32.0) - 0.5)) * 0.19635 * r);
    col += vec3(1.0, 0.66, 0.16) * 1.3 * band * mix(1.0, piece, glass) * mott;
    // the sixteen lights
    float head = 0.955 - 0.1 * (1.0 - sqrt(max(0.0, 1.0 - f16 * f16 / 0.1764)));
    float lightW = 0.42 - 0.012 / max(r, 0.3);
    float light = (1.0 - smoothstep(lightW - 0.03, lightW, abs(f16))) * smoothstep(0.7, 0.715, r) * (1.0 - smoothstep(head - 0.02, head, r));
    col += libJewel(i16) * 1.35 * light * breathe16 * (1.0 - 0.5 * glass * pow(abs(f16) / lightW, 2.0)) * mott;
    // the tracery between the pieces: dark violet stone, not a void (only in the window itself)
    float cover = clamp(1.0 - smoothstep(0.108 - E, 0.108, r) + leaf + quarry + band + light, 0.0, 1.0);
    col += vec3(0.055, 0.04, 0.13) * glass * (1.0 - cover);
    return col * step(r, 1.0);
  }`;

// A wall of books, drawn in the shader: bays and shelves, spines of every width, height
// and leather, gilt title bands, and here and there a holo-book glowing on the shelf. A warm
// pool of light lies on it by each hanging lamp; between the lamps it stands in the violet of
// the window. Far down the nave, where one spine is thinner than a pixel, the books run
// together into the tone of a shelf (no shimmer).
function libraryShelfMaterial(len, tall, lampY) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(len, tall) } }),
    extensions: { derivatives: true },
    vertexShader: "varying vec2 vUv; varying float vDepth; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS} ${LIB_GLSL}
      uniform float uTime; uniform vec2 uSize; varying vec2 vUv; varying float vDepth; varying vec3 vW;
      void main(){
        vec2 p = vUv * uSize;
        float bx = fract(p.x / 4.0), row = floor(p.y / 1.25), ry = fract(p.y / 1.25);
        float sx = p.x / 0.115, si = floor(sx), sf = fract(sx);
        float aa = fwidth(sx), detail = 1.0 - smoothstep(0.45, 1.5, aa);
        float h1 = libH(vec2(si, row)), h2 = libH(vec2(si + 17.0, row + 3.0));
        float top = 0.12 + 0.86 * (0.55 + 0.42 * h1);
        float sides = smoothstep(0.04, 0.04 + aa, sf) * (1.0 - smoothstep(0.96 - aa, 0.96, sf));
        float book = step(0.12, ry) * step(ry, top) * sides * step(0.08, h2);
        vec3 leather = h1 < 0.25 ? vec3(0.46, 0.12, 0.16) : (h1 < 0.5 ? vec3(0.12, 0.2, 0.5) : (h1 < 0.75 ? vec3(0.13, 0.34, 0.26) : vec3(0.46, 0.3, 0.12)));
        vec3 one = mix(vec3(0.012, 0.01, 0.022), leather * (0.5 + 0.5 * sin(sf * 3.1416)) * (0.55 + 0.45 * h2), book);
        // one book in six or so is bound in a bright cloth: cyan, magenta or amber runs along every shelf
        float gay = step(0.82, h2) * book;
        vec3 cloth = h1 < 0.34 ? vec3(0.1, 0.62, 0.78) : (h1 < 0.67 ? vec3(0.78, 0.16, 0.6) : vec3(0.86, 0.56, 0.12));
        one = mix(one, cloth * (0.55 + 0.45 * sin(sf * 3.1416)), gay);
        float gilt = book * step(abs(ry - (0.12 + (top - 0.12) * 0.72)), 0.035);
        one += vec3(0.9, 0.62, 0.22) * gilt * 0.7;
        vec3 many = vec3(0.2, 0.165, 0.19) * step(0.12, ry) * (1.0 - smoothstep(0.59, 0.95, ry)); // the same shelf, its books run together
        vec3 col = mix(many, one, detail);
        // light: a warm pool by each hanging lamp, the violet of the window between them and over the far end
        float dz = mod(vW.z, 8.0) - 4.0;
        float lampK = exp(-dz * dz * 0.075) * exp(-pow((vW.y - ${lampY.toFixed(1)}) * 0.085, 2.0)) * smoothstep(-52.0, -44.0, vW.z);
        vec3 light = vec3(0.46, 0.4, 0.98) * 1.7 + vec3(1.3, 0.94, 0.6) * lampK * 3.1 + vec3(0.6, 0.36, 1.0) * 0.7 * smoothstep(-44.0, -74.0, vW.z);
        col *= light;
        float holo = book * step(0.972, h2) * detail;
        vec3 hc = h1 < 0.33 ? vec3(0.2, 0.95, 1.0) : (h1 < 0.66 ? vec3(1.0, 0.25, 0.85) : vec3(1.0, 0.85, 0.3));
        col += hc * holo * (1.0 + 0.45 * sin(uTime * 0.8 + si * 1.7)) * (0.55 + 0.45 * step(0.5, fract(ry * 9.0)));
        // the case itself: uprights between bays, a board under every shelf, a brass lip
        float wood = max(step(bx, 0.028) + step(0.972, bx), step(ry, 0.09));
        col = mix(col, (vec3(0.07, 0.05, 0.09) + vec3(0.4, 0.28, 0.12) * step(0.07, ry) * step(ry, 0.09)) * light, clamp(wood, 0.0, 1.0));
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}

// Paper: a sheet with lines of writing on it, lit on either side. Instanced for the loose pages adrift in the
// aisle (each with its own writing), plain for the ledger on the desk. From too far to read, the lines run
// together into a grey (no shimmer).
function libraryPaperMaterial(instanced, gain = 1) {
  const M = instanced ? "instanceMatrix * " : "";
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uGain: { value: gain } }), side: THREE.DoubleSide, extensions: { derivatives: true },
    vertexShader: `attribute float aSeed; ${instanced ? "attribute float aGain;" : ""} varying vec2 vUv; varying float vDepth; varying float vLit; varying float vSeed; varying float vGain;
      void main(){
        vUv = uv; vSeed = aSeed; vGain = ${instanced ? "aGain" : "1.0"};
        vec4 w = modelMatrix * (${M}vec4(position, 1.0));
        vec3 n = normalize((modelMatrix * (${M}vec4(normal, 0.0))).xyz);
        vLit = abs(dot(n, normalize(vec3(0.15, 0.6, 0.78))));
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS} ${LIB_GLSL} uniform float uGain; varying vec2 vUv; varying float vDepth; varying float vLit; varying float vSeed; varying float vGain;
      void main(){
        float y = vUv.y * 18.0, row = floor(y), fy = fract(y);
        float fine = 1.0 - smoothstep(0.5, 1.4, fwidth(y));
        float len = 0.45 + 0.5 * libH(vec2(row, vSeed));
        float gap = step(0.14, libH(vec2(row, vSeed + 9.0))); // a blank line between paragraphs now and then
        float inText = step(0.1, vUv.x) * step(vUv.x, 0.1 + 0.8 * len) * step(1.5, y) * step(y, 16.5) * gap;
        float line = step(0.3, fy) * step(fy, 0.68) * inText;
        float words = step(0.16, fract(vUv.x * 11.0 + libH(vec2(row, 3.0 + vSeed)) * 5.0));
        float ink = mix(inText * 0.3, line * words, fine) * (gl_FrontFacing ? 1.0 : 0.22); // (the writing shows faintly through the back)
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        vec3 paper = vec3(0.92, 0.8, 0.6) * (0.94 + 0.06 * mix(0.5, libH(floor(vUv * vec2(36.0, 48.0) + vSeed)), fine));
        vec3 col = mix(paper, paper * vec3(0.8, 0.78, 1.12), 1.0 - vGain) * (0.12 + 0.6 * vLit) * uGain * vGain * (1.0 - 0.7 * ink) * (0.8 + 0.2 * smoothstep(0.0, 0.05, edge));
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth) * 0.9), 1.0);
      }`,
  });
}

class LibraryScene extends Scene3D {
  constructor() {
    super({ fov: 58, far: 260, fog: [0x0e0830, 20, 128], bg: 0x0e0830 });
    this.reading = false; // a chapter is open: hold almost still
    this.calm = 1;
    this.readK = 0; // 0 in the list's window, 1 behind a chapter's banner
    if (!this.has3D) return;
    const s = this.scene, L = 84, Z0 = 10, zc = Z0 - L / 2, LAMP_X = 4.0, LAMP_Y = 12.5, ROSE_Y = 11.5;
    s.userData.post = { exposure: 1.18, bloom: 0.62, threshold: 1.1, saturation: 1.22, contrast: 1.14, vignette: 0.6, ao: 1, shadow: 0.8, shadowLen: 0.12, sun: [0.2, 1, 0.5], dirt: 0.15, sharpen: 0.5, fringe: 0.15,
      // the rose window's light lies on the floor below it; the lens holds the whole nave and lets only what hangs by it go soft
      rays: { pos: new THREE.Vector3(0, ROSE_Y, Z0 - L + 1), strength: 0.16, radius: 0.45 },
      dof: { focus: 9.5, near: 12, far: 1600, max: 0.0065, k: 0.75 } };
    s.add(new THREE.AmbientLight(0x3d3488, 0.85));
    const key = new THREE.DirectionalLight(0xffe0b0, 0.5);
    key.position.set(2, 10, 6);
    s.add(key);
    const box = new THREE.BoxGeometry(1, 1, 1);
    // the walls of books: a lower and an upper tier each side
    const lower = libraryShelfMaterial(L, 10, LAMP_Y), upper = libraryShelfMaterial(L, 8.75, LAMP_Y);
    [-1, 1].forEach((sd) => {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(L, 10), lower);
      a.position.set(sd * 5.2, 5, zc); a.rotation.y = -sd * Math.PI / 2;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(L, 8.75), upper);
      b.position.set(sd * 7.1, 15, zc); b.rotation.y = -sd * Math.PI / 2;
      s.add(a, b);
    });
    // joinery and ironwork, one batch: uprights, cornices, the gallery and its rail,
    // arches overhead, lamp chains, lecterns, a rolling ladder
    const B = new RacerBatch(), G = new RacerBatch();
    const WOOD = 0x2a1c2e, DARK = 0x130c1c, BRASS = 0x9a6a2a;
    const put = (geo, m, color, b = B, k = 1) => { b.add(geo, m, color, k); geo.dispose(); };
    [-1, 1].forEach((sd) => {
      for (let z = Z0; z >= Z0 - L; z -= 4) {
        B.add(box, racerM(sd * 5.05, 5, z, 0.34, 10, 0.22), 0x4a3350);
        G.add(box, racerM(sd * 4.87, 5, z + 0.12, 0.03, 10, 0.03), 0x6a5cff, 0.55); // its edge toward the reader, rimmed violet
      }
      B.add(box, racerM(sd * 5.0, 10.2, zc, 0.9, 0.4, L), 0x4a3350); // cornice
      B.add(box, racerM(sd * 6.05, 10.52, zc, 2.3, 0.2, L), DARK); // gallery floor
      B.add(box, racerM(sd * 5.0, 11.55, zc, 0.07, 0.07, L), BRASS); // its rail
      G.add(box, racerM(sd * 4.97, 10.36, zc, 0.05, 0.06, L), 0x5fd8ff, 1.2); // a line of cyan light under the gallery
      G.add(box, racerM(sd * 4.84, 0.07, zc, 0.05, 0.07, L), 0xff4fd8, 1.05); // and one of magenta along the foot of the shelves
      for (let z = Z0; z >= Z0 - L; z -= 2) B.add(box, racerM(sd * 5.0, 11.05, z, 0.05, 1.0, 0.05), BRASS);
      for (let z = Z0; z >= Z0 - L; z -= 4) B.add(box, racerM(sd * 6.98, 15, z, 0.3, 8.75, 0.2), WOOD);
      B.add(box, racerM(sd * 6.9, 19.55, zc, 0.9, 0.4, L), WOOD);
    });
    // arches overhead; a pair of lamps hangs from each on long chains, out by the galleries, so the middle of the
    // nave is clear to the window (beyond the last pair the window lights the nave itself)
    this.lampZ = [];
    for (let z = Z0 - 6; z >= Z0 - L; z -= 8) {
      put(new THREE.TorusGeometry(7.1, 0.22, 5, 20, Math.PI), racerM(0, 19.6, z), WOOD);
      B.add(box, racerM(0, 26.5, z, 0.5, 0.6, 0.5), BRASS); // keystone
      if (z < Z0 - 56) continue;
      [-1, 1].forEach((sd) => {
        B.add(box, racerM(sd * LAMP_X, (25.9 + LAMP_Y + 0.5) / 2, z, 0.035, 25.9 - LAMP_Y - 0.5, 0.035), DARK); // chain
        put(new THREE.CylinderGeometry(0.16, 0.42, 0.42, 8), racerM(sd * LAMP_X, LAMP_Y + 0.3, z), BRASS); // shade
        put(new THREE.SphereGeometry(0.24, 8, 6), racerM(sd * LAMP_X, LAMP_Y + 0.02, z), 0xffe2a8, G, 2.2);
      });
      this.lampZ.push(z);
    }
    // two lanterns hang close to the lens, one either side: as the view drifts they slide across the shelves behind them
    this.nearLamps = [];
    [[-0.95, LIB_EYE + 0.2, 0.2], [1.0, LIB_EYE + 0.4, -0.2]].forEach(([x, y, z]) => {
      B.add(box, racerM(x, y + 2.4, z, 0.02, 4.4, 0.02), DARK); // chain
      put(new THREE.TorusGeometry(0.03, 0.008, 4, 10), racerM(x, y + 0.27, z), BRASS); // its ring
      put(new THREE.CylinderGeometry(0.035, 0.11, 0.1, 6), racerM(x, y + 0.2, z), BRASS); // cap
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dz]) => B.add(box, racerM(x + dx * 0.085, y, z + dz * 0.085, 0.014, 0.3, 0.014), BRASS)); // cage
      put(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 6), racerM(x, y - 0.16, z), BRASS); // foot
      put(new THREE.CylinderGeometry(0.02, 0.026, 0.07, 6), racerM(x, y - 0.115, z), 0xe9dcc0); // candle
      // the flame: a hot core in an amber tongue (it was one pale ball)
      put(new THREE.SphereGeometry(0.03, 8, 6), racerM(x, y - 0.045, z, 1, 1.5, 1), 0xff9a2e, G, 1.7);
      put(new THREE.SphereGeometry(0.016, 6, 5), racerM(x, y - 0.052, z + 0.01, 1, 1.5, 1), 0xfff0c0, G, 2.6);
      this.nearLamps.push([x, y - 0.045, z]);
    });
    // lecterns: a pair by the desk
    this.lecterns = [[-3.5, -22], [3.5, -22]];
    this.lecterns.forEach(([x, z]) => {
      put(racerPlate(0.9, 0.16, 0.9, 0.05, true), racerM(x, 0.08, z), DARK);
      put(new THREE.CylinderGeometry(0.11, 0.2, 2.0, 6), racerM(x, 1.1, z), WOOD);
      put(racerPlate(1.5, 0.1, 1.0, 0.04, true), racerM(x, 2.18, z, 1, 1, 1, 0.5), WOOD);
      B.add(box, racerM(x, 2.03, z + 0.46, 1.5, 0.08, 0.05, 0.5), BRASS);
      put(new THREE.TorusGeometry(0.62, 0.02, 4, 24), racerM(x, 0.18, z, 1, 1, 1, Math.PI / 2), 0x5fd8ff, G, 1.4);
    });
    // the reading desk in the middle of the nave: a great ledger lies open on its rest under a brass lamp
    // (its pages are paper: see the paper shader)
    this.heroDesk = [0, -24];
    const ledgerPages = [];
    {
      const [x, z] = this.heroDesk;
      put(racerPlate(2.9, 0.2, 1.6, 0.06, true), racerM(x, 0.1, z), DARK);
      put(racerPlate(2.5, 1.5, 1.2, 0.05, true), racerM(x, 0.95, z), WOOD);
      put(racerPlate(2.8, 0.12, 1.5, 0.04, true), racerM(x, 1.76, z), WOOD);
      B.add(box, racerM(x, 1.84, z + 0.68, 2.8, 0.06, 0.05), BRASS);
      [-1, 1].forEach((sd) => B.add(box, racerM(x + sd * 1.2, 0.95, z + 0.6, 0.05, 1.5, 0.05), BRASS));
      put(new THREE.TorusGeometry(1.7, 0.03, 4, 40), racerM(x, 0.2, z, 1, 1, 1, Math.PI / 2), 0xffd27a, G, 1.6);
      B.add(box, racerM(x, 2.63, z - 0.12, 2.98, 1.8, 0.07, -0.5), 0x4a1a2c); // the ledger's leather boards, a little larger than its leaves
      B.add(box, racerM(x, 2.66, z - 0.03, 0.07, 1.7, 0.09, -0.5), BRASS); // its spine
      B.add(box, racerM(x, 3.2, z - 0.66, 0.06, 2.7, 0.06), BRASS); // the lamp's post
      B.add(box, racerM(x, 4.66, z - 0.36, 1.7, 0.07, 0.5), BRASS); // its cap
      G.add(box, racerM(x, 4.47, z - 0.36, 1.6, 0.3, 0.44), 0xf09a2a, 1.25); // and its shade of amber glass over the book
      G.add(box, racerM(x, 4.33, z - 0.13, 1.6, 0.05, 0.03), 0xfff0c8, 2.4); // the light under its lip
      [-1, 1].forEach((sd) => B.add(box, racerM(x + sd * 0.84, 4.48, z - 0.36, 0.08, 0.36, 0.5), BRASS)); // brass ends
      [-1, 1].forEach((sd) => {
        const pg = new THREE.PlaneGeometry(1.36, 1.66, 6, 1), pp = pg.attributes.position;
        for (let i = 0; i < pp.count; i++) { const u = (pp.getX(i) / 0.68) * sd; pp.setZ(i, 0.018 * (1 - u) * (1 - u)); } // the leaves swell toward the gutter
        pg.computeVertexNormals();
        pg.applyMatrix4(racerM(x + sd * 0.69, 2.68, z - 0.07, 1, 1, 1, -0.5, sd * -0.14));
        pg.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Array(pp.count).fill(40 + sd * 7), 1));
        ledgerPages.push(pg);
      });
    }
    this.joinery = new THREE.Mesh(B.build("color"), new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.lights = new THREE.Mesh(G.build("color"), new THREE.MeshBasicMaterial({ vertexColors: true }));
    s.add(this.joinery, this.lights);
    this.ledger = new THREE.Mesh(mergeIndexed(ledgerPages, ["position", "normal", "uv", "aSeed"]), libraryPaperMaterial(false, 1.45));
    s.add(this.ledger);
    // the end wall: coursed stone, an arch of cut blocks round the window, all of it lit by the glass it holds
    // (the nave's haze does not hide it: the window's light carries)
    this.wallMat = new THREE.ShaderMaterial({
      uniforms: fogUniforms(), extensions: { derivatives: true },
      vertexShader: "varying vec2 vP; varying float vDepth; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `${GLSL_FOG_PARS} ${LIB_GLSL} varying vec2 vP; varying float vDepth;
        void main(){
          float row = floor(vP.y / 1.1), fy = fract(vP.y / 1.1);
          float bx = vP.x / 2.2 + 0.5 * mod(row, 2.0), fx = fract(bx);
          float joint = max(step(fy, 0.07), step(fx, 0.035));
          float grain = libH(vec2(floor(bx), row));
          vec2 d = vP - vec2(0.0, ${(ROSE_Y - 13).toFixed(1)}); // (the wall is centred 13 up; the rose stands at ${ROSE_Y})
          float r = length(d);
          vec3 light = vec3(0.6, 0.38, 1.0) * (0.9 * exp(-max(r - 6.3, 0.0) * 0.3) + 0.12); // the window's light on the stone round it
          vec3 col = vec3(0.2, 0.16, 0.3) * (0.7 + 0.5 * grain) * (1.0 - 0.55 * joint) * light;
          // the arch: a ring of paler blocks, each cut on the radius
          float ring = smoothstep(6.3, 6.36, r) * (1.0 - smoothstep(7.2, 7.26, r));
          float a = atan(d.y, d.x) / 6.2832;
          float vj = smoothstep(0.44, 0.5, abs(fract(a * 34.0) - 0.5));
          vec3 arch = vec3(0.36, 0.28, 0.54) * (0.8 + 0.4 * libH(vec2(floor(a * 34.0), 7.0))) * (1.0 - 0.6 * vj) * (0.45 + 0.9 * exp(-(r - 6.3) * 1.1));
          col = mix(col, arch, ring);
          gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth) * 0.3), 1.0);
        }`,
    });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 27), this.wallMat);
    wall.position.set(0, 13, Z0 - L);
    s.add(wall);
    // lamp glows; the two pairs that hang in view show their cones of light (nearer ones would only be haze over the shelves)
    this.lampZ.forEach((z) => [-1, 1].forEach((sd) => {
      const gl = glowSprite(neon(0xffd9a0, 1.2), 2.4, 0.5);
      gl.position.set(sd * LAMP_X, LAMP_Y, z);
      gl.layers.set(1);
      s.add(gl);
      if (z > -26 || z < -40) return;
      const cone = examBeam({ color: 0xffc27a, top: 0.25, bottom: 1.5, height: LAMP_Y, intensity: 0.05 }); // (a still shaft: no flicker)
      cone.position.set(sd * LAMP_X, LAMP_Y - 0.1, z);
      cone.layers.set(1);
      s.add(cone);
    }));
    {
      const [x, z] = this.heroDesk;
      const gl = glowSprite(neon(0xffb648, 1.2), 2.2, 0.3);
      gl.position.set(x, 4.4, z - 0.2);
      gl.layers.set(1);
      const cone = examBeam({ color: 0xffc27a, top: 0.7, bottom: 1.5, height: 2.0, intensity: 0.2 }); // the shade's light, down onto the pages
      cone.position.set(x, 4.36, z - 0.3);
      cone.layers.set(1);
      const lamp = new THREE.PointLight(0xffd9a0, 1.6, 12, 1.6);
      lamp.position.set(x, 4.2, z + 0.6);
      s.add(gl, cone, lamp);
    }
    this.nearLamps.forEach(([x, y, z]) => { const gl = glowSprite(neon(0xffb040, 1.3), 0.8, 0.5); gl.position.set(x, y, z); gl.layers.set(1); s.add(gl); });
    // the floor: dark stone flags, a warm pool under each lamp, the neon of the shelves' foot beside them, and the rose
    // window's glass thrown onto the stone below it by the light behind it (what stands there throws its shadow)
    const SLOPE = 0.36; // the window's light falls about one in three, so it lies down the nave as far as the desk
    const shadowOf = (x, z, halfW, tall) => `shade *= 1.0 - 0.8 * (1.0 - smoothstep(${halfW.toFixed(2)}, ${(halfW + 0.3).toFixed(2)}, abs(vW.x - (${x.toFixed(2)})))) * smoothstep(${(z - 0.7).toFixed(2)}, ${(z - 0.3).toFixed(2)}, vW.z) * (1.0 - smoothstep(${(z + (tall / SLOPE) * 0.8).toFixed(2)}, ${(z + tall / SLOPE + 0.6).toFixed(2)}, vW.z));`;
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 } }), extensions: { derivatives: true },
      vertexShader: "varying vec3 vW; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `${GLSL_FOG_PARS} ${LIB_GLSL} ${LIB_ROSE} uniform float uTime; varying vec3 vW; varying float vDepth;
        void main(){
          vec2 c = floor(vW.xz / 1.3), f = fract(vW.xz / 1.3);
          float fine = 1.0 - smoothstep(0.25, 0.9, fwidth(vW.z / 1.3)); // far off, the joints run together
          float joint = max(step(f.x, 0.03), step(f.y, 0.03)) * fine;
          float flag = 0.8 + 0.4 * mix(0.5, libH(c), fine);
          vec3 col = vec3(0.05, 0.04, 0.095) * flag * (1.0 - 0.6 * joint);
          float dz = mod(vW.z, 8.0) - 4.0;
          float pool = exp(-(dz * dz * 0.16 + pow(abs(vW.x) - ${LAMP_X.toFixed(1)}, 2.0) * 0.2)) * smoothstep(-52.0, -44.0, vW.z);
          col += vec3(0.5, 0.34, 0.16) * pool * 0.5;
          col += vec3(1.0, 0.25, 0.8) * 0.12 * exp(-pow((4.84 - abs(vW.x)) * 1.5, 2.0)); // the magenta line, on the stone beside it
          col += vec3(0.3, 0.2, 0.62) * exp(-vW.x * vW.x * 0.05) * smoothstep(-40.0, -74.0, vW.z) * 0.2; // the window's glow at its foot
          col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth));
          // the window on the stone: each flag is asked which pane its light came through
          vec2 q = vec2(vW.x, (vW.z - (${(Z0 - L).toFixed(1)})) * ${SLOPE} - ${ROSE_Y.toFixed(1)}) / 5.2;
          float shade = 1.0;
          ${[...this.lecterns.map(([x, z]) => shadowOf(x, z, 0.5, 2.2)), shadowOf(this.heroDesk[0], this.heroDesk[1], 1.4, 1.84)].join("\n          ")}
          // (five looks at the window, a little apart: thrown light has no hard edges)
          vec3 thrown = libRose(q, uTime, 0.0) * 0.28 + (libRose(q + vec2(0.05, 0.03), uTime, 0.0) + libRose(q + vec2(-0.05, 0.035), uTime, 0.0) + libRose(q + vec2(0.035, -0.05), uTime, 0.0) + libRose(q + vec2(-0.04, -0.04), uTime, 0.0)) * 0.18;
          col += thrown * shade * (0.55 + 0.45 * flag) * (1.0 - 0.4 * joint) * 0.46;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, L + 12), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, zc);
    s.add(floor);
    // the rose window: its glass (see LIB_ROSE) set in a rim of cut stone that its own light falls on. Nothing
    // hangs in front of it: its light shows on the floor instead.
    this.roseMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `${LIB_GLSL} ${LIB_ROSE} uniform float uTime; varying vec2 vUv;
        void main(){
          vec2 q = vUv * 2.0 - 1.0; float rr = length(q);
          vec3 col = libRose(q / 0.825, uTime, 1.0); // the glass ends at 0.825 of the disc; the rest is the stone rim
          if (rr > 0.825) { // the rim: cut blocks, their joints dark, the edge nearest the glass catching its light
            float a = atan(q.y, q.x) / 6.2832 + 0.5 + 0.0625;
            float t = (rr - 0.825) / 0.175; // 0 at the glass, 1 at the outside
            float j = abs(fract(a * 28.0) - 0.5);
            float joint = smoothstep(0.47, 0.5, j);
            float grain = fract(sin(dot(floor(vec2(a * 28.0, t * 3.0)), vec2(12.9898, 78.233))) * 43758.5453);
            vec3 stone = vec3(0.07, 0.055, 0.13) * (0.75 + 0.5 * grain);
            stone += libJewel(floor(a * 16.0)) * 0.55 * exp(-t * 5.0); // each light's own colour on the stone beside it
            stone += vec3(0.16, 0.13, 0.3) * smoothstep(0.75, 1.0, t) * 0.5; // and a paler outer arris
            col = stone * (1.0 - 0.7 * joint) * (1.0 - smoothstep(0.93, 1.0, t) * 0.6) * step(rr, 1.0);
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const rose = new THREE.Mesh(new THREE.CircleGeometry(6.3, 64), this.roseMat);
    rose.position.set(0, ROSE_Y, Z0 - L + 0.02);
    s.add(rose);
    // shafts of the window's light, from its lowest panes down to the floor: each in its pane's colour, dark where
    // it leaves the glass (so nothing hangs in front of the window) and gone again before it lands
    const tilt = Math.atan(SLOPE);
    this.shafts = [];
    [[-2, 0x9b5cff], [-1, 0x35d0ff], [0, 0xffc04a], [1, 0xff4fb8], [2, 0x4dff9a]].forEach(([k, color]) => {
      const ang = -Math.PI / 2 + k * 0.3927, x = Math.cos(ang) * 4.3, y = ROSE_Y + Math.sin(ang) * 4.3;
      const shaft = examBeam({ color, top: 0.42, bottom: 0.95, height: y / Math.sin(tilt), intensity: 0.55 });
      shaft.material.fragmentShader = shaft.material.fragmentShader.replace("float fall = pow(clamp(vH, 0.0, 1.0), 1.2) * smoothstep(0.0, 0.25, vH);", "float fall = smoothstep(0.0, 0.34, 1.0 - vH) * smoothstep(0.0, 0.3, vH);");
      shaft.position.set(x, y, Z0 - L + 0.6);
      shaft.rotation.x = -(Math.PI / 2 - tilt);
      shaft.layers.set(1);
      s.add(shaft);
      this.shafts.push(shaft);
    });
    this.shaftMotes = makeMotes({ count: 46, box: [8, 6.5, 26], center: [0, 3.6, -50], color: 0xdccbff, size: 0.09, k: 1.25 });
    this.shaftMotes.layers.set(1);
    s.add(this.shaftMotes);
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
        const pg = new THREE.PlaneGeometry(1.0, 1.34);
        pg.applyMatrix4(racerM(x + sd * 0.5, 3.25, z, 1, 1, 1, -0.25, sd * -0.32));
        const n = pg.attributes.position.count;
        pg.setAttribute("aTint", new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, k) => tints[i % 4][k % 3]), 3));
        pg.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Array(n).fill(i * 7.3 + sd), 1));
        hb.push(pg);
      });
    });
    this.holo = new THREE.Mesh(mergeIndexed(hb, ["position", "uv", "aTint", "aSeed"]), this.holoMat);
    this.holo.layers.set(1);
    s.add(this.holo);
    // loose pages adrift in the aisle: curled sheets of paper with lines of writing, catching the lamps as they turn
    const N_PAGES = 11, pageGeo = new THREE.PlaneGeometry(0.5, 0.66, 6, 1);
    { const pp = pageGeo.attributes.position; for (let i = 0; i < pp.count; i++) { const u = pp.getX(i) / 0.25; pp.setZ(i, 0.045 * u * u); } pageGeo.computeVertexNormals(); }
    pageGeo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(Float32Array.from({ length: N_PAGES }, () => rand(1, 90)), 1));
    pageGeo.setAttribute("aGain", new THREE.InstancedBufferAttribute(Float32Array.from({ length: N_PAGES }, (_, i) => (i >= N_PAGES - 2 ? 0.5 : 0.74)), 1));
    this.pageMat = libraryPaperMaterial(true);
    this.pageMesh = new THREE.InstancedMesh(pageGeo, this.pageMat, N_PAGES);
    this.pageMesh.frustumCulled = false;
    this.pageMesh.layers.set(1);
    // (9 down the sides of the nave, clear of the window; 2 nearer the lens and well to one side, which go by larger)
    this.pages = Array.from({ length: N_PAGES }, (_, i) => {
      const p = { near: i >= N_PAGES - 2, v: rand(0.08, 0.22), ax: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(), ph: rand(6.28), w: rand(0.12, 0.4) };
      this.placePage(p, true);
      return p;
    });
    s.add(this.pageMesh);
    this.motes = makeMotes({ count: 90, box: [10, 10, 44], center: [0, 6.5, -28], color: 0xffe2a8, size: 0.06, k: 0.9 });
    this.motes.layers.set(1);
    s.add(this.motes);
    box.dispose();
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this.camBase.set(0, LIB_EYE, 6);
    this.lookAt.set(0, LIB_EYE - 1.3, -30);
    this.lt = 0;
    this.gen = libraryGen(this); // (served: the generated archive round the nave, the great book on show: 31c-librarygen.js)
  }
  // Where a loose page starts (or starts again, once it has risen out of sight).
  placePage(p, anywhere) {
    if (p.near) { p.x = (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 2.6); p.z = rand(-9, -4); p.y = anywhere ? rand(LIB_EYE - 0.5, LIB_EYE + 2.2) : LIB_EYE - 0.5; }
    else { p.x = (Math.random() < 0.5 ? -1 : 1) * rand(2.3, 4.2); p.z = rand(-12, -40); p.y = anywhere ? rand(0.6, 12) : 0.4; }
  }
  update(dt) {
    super.update(dt);
    if (!this.has3D) return;
    // reading: everything slows to a fifth, gently
    this.calm += ((this.reading || GFX.calm || REDUCED_MOTION ? 0.2 : 1) - this.calm) * Math.min(1, dt * 1.5);
    const lt = (this.lt += dt * this.calm);
    this.pages.forEach((p, i) => {
      p.y += p.v * dt * this.calm;
      if (p.y > (p.near ? LIB_EYE + 2.2 : 13)) this.placePage(p, false);
      this.pageMesh.setMatrixAt(i, this._m.compose(this._p.set(p.x + Math.sin(lt * 0.3 + p.ph) * (p.near ? 0.2 : 0.3), p.y, p.z), this._q.setFromAxisAngle(p.ax, p.ph + lt * p.w), this._s));
    });
    this.pageMesh.instanceMatrix.needsUpdate = true;
    this.camBase.set(Math.sin(lt * 0.07) * 0.3 + Pointer.x * 0.25, LIB_EYE + Math.sin(lt * 0.09) * 0.12 - Pointer.y * 0.15, 5.2 + Math.sin(lt * 0.05) * 1.0);
    const rk = (this.readK += ((this.reading ? 1 : 0) - this.readK) * Math.min(1, dt * 2.5));
    this.lookAt.set(Math.sin(lt * 0.04) * 0.4 - 8.6 * rk, LIB_EYE - 1.3 + 4.3 * rk, -30);
    if (Math.abs(this.camera.fov - (58 + 30 * rk)) > 0.01) { this.camera.fov = 58 + 30 * rk; this.camera.updateProjectionMatrix(); }
    const post = this.scene.userData.post;
    post.saturation = 1.22 - 1.1 * rk;
    post.tint = [1 - 0.22 * rk, 1 - 0.46 * rk, 1 + 0.6 * rk];
    post.contrast = 1.14 + 0.24 * rk;
    post.exposure = 1.18 + 0.2 * rk;
    this.placeCamera();
    libraryGenUpdate(this, dt, lt);
    this.motes.userData.drift(lt);
    this.shaftMotes.userData.drift(lt * 0.8);
    this.shafts.forEach((sh, i) => { sh.material.uniforms.uI.value = 0.55 * (0.72 + 0.28 * Math.sin(lt * 1.05 + i * 1.9)); }); // each shaft swells and thins on its own time (about six seconds)
    FX.sync(this.scene, lt);
  }
  dispose() {
    if (this.pageMesh) { this.pageMesh.dispose(); this.pageMesh.geometry.dispose(); this.pageMat.dispose(); }
    super.dispose();
  }
}
