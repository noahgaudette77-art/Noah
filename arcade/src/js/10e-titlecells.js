// The containment hall's cells (the owner, 2026-11-22: the pods "look like plain glass cylinders with dark blobs, not a
// prison"). Each boss is held in a maximum-security cell: a heavy steel plinth and cap in hazard paint, bolted and
// clamped, vent grilles, a status screen on its plinth and a prisoner's plate on its cap (its number and its name, as
// Boss Rush names it), four bars clamped round the glass, two containment bands of its own light, hazard lamps on top,
// pipes and cables up into rails under the ceiling, a caution ring on the floor round it. Each boss stands lit from
// inside in its own colour (Boss Rush's colour for it), from below and round its edges, breathing with the cell's slow
// pulse; wisps of energy drift up the glass. A few cells are worse: cracked glass, steam from the cap, a red alarm.
// A boss the player has beaten stands in a calm cell, its screen DEFEATED (Store, read only). The hall itself is
// watched: laser tripwires across the aisle between the worlds, hazard strips and floor lights along it, cameras on the
// pillars panning slowly, rails overhead.
//
// Cheap: everything made here is drawn in a handful of calls whatever the number of cells. The cells' steel is one
// geometry (one draw), their lights another (one draw), their screens and plates a third (one draw, one picture);
// the small parts (bolts, clamps, lamp housings) are drawn only for the cells near the lens (instanced, one draw); the
// lasers, the cameras, the steam and an arc a draw each. No light is added: each boss's light is in its own shading.
// LOW (GFX.extras off): no steam, no arcs, no twitches. Reduced effects: no arcs, no steam, no twitches, no blinking.

const CELL = { floor: 0.07, baseTop: 0.92, capY: 4.32, capTop: 5.08, R: 1.15, ring: 1.52 };
// which cells are worse off (by their boss: Boss Rush's key), whatever the player has done; a beaten boss's cell calms
const CELL_WORSE = { alert: ["6", "all"], crack: ["2", "8", "all"], steam: ["5", "10", "3"] };

// A batch of pieces made one geometry: each piece's corners carry what is given for it (colour, pattern, its cell's
// light and state...), and coordinates in metres along its faces (uvM), for the patterns drawn on them.
class KitBatch {
  constructor(attrs = {}) { this.attrs = attrs; this.pos = []; this.nor = []; this.uvm = []; this.x = {}; for (const k in attrs) this.x[k] = []; }
  // geo placed by m; v: the piece's values; su, sv: its own uv in metres (a cylinder's: its girth and height);
  // smooth: keep its own normals (a torus, a dome), else flat (hard steel)
  add(geo, m, v = {}, su = 1, sv = 1, smooth = false) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!smooth) g.computeVertexNormals();
    const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv ? g.attributes.uv.array : null, n = P.length / 3;
    for (let i = 0; i < P.length; i++) { this.pos.push(P[i]); this.nor.push(N[i]); }
    for (let i = 0; i < n; i++) this.uvm.push(U ? U[i * 2] * su : 0, U ? U[i * 2 + 1] * sv : 0);
    for (const k in this.attrs) { const s = this.attrs[k], val = v[k] === undefined ? 0 : v[k]; const arr = this.x[k]; for (let i = 0; i < n; i++) for (let j = 0; j < s; j++) arr.push(s > 1 ? val[j] : val); }
    g.dispose();
    return this;
  }
  // its pieces as typed arrays, by attribute (with each attribute's size)
  arrays() {
    const a = { position: [new Float32Array(this.pos), 3], normal: [new Float32Array(this.nor), 3], uvM: [new Float32Array(this.uvm), 2] };
    for (const k in this.attrs) a[k] = [new Float32Array(this.x[k]), this.attrs[k]];
    return a;
  }
}
// One cell's pieces (made once, in the cell's own place) copied to every cell: moved and turned to it (mats), with its
// own values where per(i) gives them (its light, its state, its row of pictures). The made geometry is the costly part
// of building the cells: it is done for one, and the rest are copies into arrays made once at their full size.
function kitCopies(tpl, mats, per) {
  const src = tpl.arrays(), n = src.position[0].length / 3, N = n * mats.length, out = {};
  for (const k in src) out[k] = [new Float32Array(N * src[k][1]), src[k][1]];
  const P = src.position[0], No = src.normal[0], OP = out.position[0], ON = out.normal[0];
  mats.forEach((m, ci) => {
    const e = m.elements, base = ci * n, ov = per ? per(ci) : {};
    for (let i = 0; i < n; i++) {
      const j = i * 3, o = (base + i) * 3, x = P[j], y = P[j + 1], z = P[j + 2], nx = No[j], ny = No[j + 1], nz = No[j + 2];
      OP[o] = e[0] * x + e[4] * y + e[8] * z + e[12]; OP[o + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; OP[o + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      ON[o] = e[0] * nx + e[4] * ny + e[8] * nz; ON[o + 1] = e[1] * nx + e[5] * ny + e[9] * nz; ON[o + 2] = e[2] * nx + e[6] * ny + e[10] * nz; // (turned only: no scale)
    }
    for (const k in src) {
      if (k === "position" || k === "normal") continue;
      const [arr, sz] = out[k], v = ov[k];
      if (v === undefined) arr.set(src[k][0], base * sz);
      else for (let i = 0; i < n; i++) for (let c = 0; c < sz; c++) arr[(base + i) * sz + c] = sz > 1 ? v[c] : v;
    }
  });
  return out;
}
// arrays (from kitCopies or KitBatch.arrays) made one geometry, in order
function kitGeometry(list) {
  const g = new THREE.BufferGeometry();
  for (const k in list[0]) {
    const sz = list[0][k][1], all = new Float32Array(list.reduce((t, a) => t + a[k][0].length, 0));
    let o = 0;
    for (const a of list) { all.set(a[k][0], o); o += a[k][0].length; }
    g.setAttribute(k, new THREE.BufferAttribute(all, sz));
  }
  g.computeBoundingSphere();
  return g;
}

// The cells' steel: a lit, reflecting metal (the hall's painted vault in it) with patterns drawn on it by the piece's
// pattern: 0 steel (a seam now and then), 1 hazard paint (yellow and black at 45 degrees), 2 a vent grille (dark
// slots, their lips catching the light), 3 a dark recess. One material for every steel piece of the hall's dressing.
function cellSteelMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.8, roughness: 0.38, envMapIntensity: 1.3 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 uvM; attribute float aPat; varying vec2 vUvM; varying float vPat;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\n  vUvM = uvM; vPat = aPat;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vUvM; varying float vPat;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float pHaz = step(0.5, vPat) * step(vPat, 1.5), pGri = step(1.5, vPat) * step(vPat, 2.5), pRec = step(2.5, vPat);
        float st = smoothstep(0.47, 0.53, abs(fract((vUvM.x + vUvM.y) * 2.6) - 0.5) * 2.0);
        vec3 haz = mix(vec3(0.95, 0.66, 0.05), vec3(0.03, 0.028, 0.035), st);
        float sl = fract(vUvM.y * 26.0);
        vec3 gri = mix(vec3(0.015, 0.016, 0.02), vec3(0.5, 0.53, 0.6), smoothstep(0.6, 0.72, sl) * (1.0 - smoothstep(0.84, 0.96, sl)));
        float seam = 1.0 - 0.5 * smoothstep(0.0, 0.008, abs(fract(vUvM.x * 0.7 + 0.25) - 0.5) - 0.49);
        diffuseColor.rgb = mix(diffuseColor.rgb * seam, haz, pHaz);
        diffuseColor.rgb = mix(diffuseColor.rgb, gri, pGri);
        diffuseColor.rgb *= 1.0 - 0.78 * pRec;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.6, pHaz);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n  metalnessFactor = mix(metalnessFactor, 0.15, pHaz);");
  };
  m.customProgramCacheKey = () => "cell-steel-2";
  return m;
}

// The cells' lights, unlit: aKind 0 the cell's own light (its bands and strip, breathing; red pulses in an alarm,
// quieter for a beaten boss), 1 hazard lamps (amber blinking; red and quick in an alarm; green and steady for a beaten
// boss), 2 floor lights (cold white, a slow chase toward the vault), 3 a red status lamp (cameras, emitters), 4 a
// camera's dark lens. aState: alarm, cracked, beaten, phase.
function cellGlowMaterial(calm) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uK: { value: 1 }, uCalm: { value: calm ? 1 : 0 } }),
    vertexShader: `attribute vec3 aCol; attribute vec4 aState; attribute float aKind; varying vec3 vCol; varying vec4 vState; varying float vKind; varying float vDepth; varying float vZ;
      void main(){
        #ifdef USE_INSTANCING
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #else
        vec4 w = modelMatrix * vec4(position, 1.0);
        #endif
        vCol = aCol; vState = aState; vKind = aKind; vZ = w.z;
        vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `${GLSL_FOG_PARS} uniform float uTime; uniform float uK; uniform float uCalm; varying vec3 vCol; varying vec4 vState; varying float vKind; varying float vDepth; varying float vZ;
      void main(){
        float alarm = vState.x, beaten = vState.z, ph = vState.w;
        float t = uTime * (1.0 - 0.75 * uCalm);
        vec3 red = vec3(1.0, 0.1, 0.14), c;
        if (vKind < 0.5) {
          float pulse = 0.78 + 0.22 * sin(t * 1.3 + ph * 6.283);
          float a = alarm * (1.0 - uCalm) * (0.5 + 0.5 * sin(t * 6.5 + ph * 6.283));
          c = mix(mix(vCol, red, a), vec3(0.3, 1.0, 0.55), beaten * 0.85) * 1.9 * pulse * mix(1.0, 0.72, beaten); // (a beaten boss's cell: neutralized green)
        } else if (vKind < 1.5) {
          float on = mix(step(0.42, fract(t * 0.75 + ph)), 1.0, uCalm), onA = mix(step(0.5, fract(t * 2.4 + ph)), 1.0, uCalm);
          vec3 amber = vec3(1.0, 0.48, 0.05) * (0.22 + 2.4 * on), alarmC = red * (0.2 + 3.0 * onA), green = vec3(0.25, 1.0, 0.5) * 1.3;
          c = mix(mix(amber, alarmC, alarm), green, beaten);
        } else if (vKind < 2.5) {
          c = vec3(0.5, 0.82, 1.0) * (0.75 + 0.6 * smoothstep(0.75, 1.0, sin(vZ * 0.75 + t * 2.2)) * (1.0 - uCalm));
        } else if (vKind < 3.5) {
          c = red * (0.35 + 2.4 * mix(step(0.62, fract(t * 0.55 + ph)), 0.6, uCalm));
        } else c = vec3(0.015, 0.02, 0.03);
        gl_FragColor = vec4(mix(c * uK, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}

// Each cell's two pictures, in one: its prisoner's plate (its number, its name) and its status screen (CONTAINED,
// a red BREACH ALERT, or DEFEATED for a beaten boss), a row each. Drawn again when the page's fonts have come.
function cellAtlas(states) {
  const W = 1024, RH = 128, K = 0.75, cv = document.createElement("canvas"), x = cv.getContext("2d"); // (drawn at three quarters: plenty for a plate a metre across)
  cv.width = W * K; cv.height = RH * states.length * K;
  const tex = new THREE.CanvasTexture(cv);
  tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const css = (n) => "#" + new THREE.Color(n).getHexString();
  const draw = () => {
    x.setTransform(K, 0, 0, K, 0, 0);
    x.clearRect(0, 0, W, RH * states.length);
    states.forEach((s, i) => {
      const y = i * RH, col = css(s.col), num = String(s.no).padStart(2, "0");
      // the plate: brushed dark steel, a rule of the boss's colour, its number small and its name large
      const g = x.createLinearGradient(0, y, 0, y + RH);
      g.addColorStop(0, "#2a2e38"); g.addColorStop(1, "#14161c");
      x.fillStyle = g; x.fillRect(0, y, 512, RH);
      x.strokeStyle = "#4a505e"; x.lineWidth = 4; x.strokeRect(4, y + 4, 504, RH - 8);
      x.fillStyle = col; x.fillRect(14, y + 14, 6, RH - 28);
      x.fillStyle = "#9aa3b8"; x.font = '18px "Press Start 2P", "Courier New", monospace'; x.textBaseline = "top";
      x.fillText((s.key === "all" ? "INMATE 00" : "INMATE " + num) + (s.beaten ? "  · HELD" : "  · MAX SEC"), 34, y + 20);
      let fs = 30; x.font = `${fs}px "Press Start 2P", "Courier New", monospace`;
      while (x.measureText(s.name).width > 456 && fs > 14) { fs -= 2; x.font = `${fs}px "Press Start 2P", "Courier New", monospace`; }
      x.fillStyle = "#f4f1ff"; x.fillText(s.name, 34, y + 56 + (30 - fs) / 2);
      for (const bx of [10, 496]) for (const by of [10, 112]) { x.fillStyle = "#6b7282"; x.beginPath(); x.arc(bx + 3, y + by + 3, 4, 0, 7); x.fill(); }
      // the status screen: dark glass, its words in green (held, beaten) or red (an alarm), a row of bars under them
      const red = s.alarm && !s.beaten, ink = red ? "#ff3a4c" : s.beaten ? "#5dff9e" : "#4dfff0";
      x.fillStyle = red ? "#1a0306" : "#02100d"; x.fillRect(512, y, 512, RH);
      x.strokeStyle = ink; x.globalAlpha = 0.45; x.lineWidth = 3; x.strokeRect(520, y + 8, 496, RH - 16); x.globalAlpha = 1;
      x.fillStyle = ink; x.font = '16px "Press Start 2P", "Courier New", monospace';
      x.fillText("CELL " + num + (s.sd < 0 ? "-L" : "-R") + "  STASIS " + (s.beaten ? "LOCKED" : red ? "FAILING" : "STABLE"), 536, y + 20);
      x.font = '28px "Press Start 2P", "Courier New", monospace';
      x.fillText(s.beaten ? "DEFEATED" : red ? "BREACH ALERT" : "CONTAINED", 536, y + 50);
      if (s.beaten) { x.strokeStyle = ink; x.lineWidth = 6; x.lineCap = "square"; x.beginPath(); x.moveTo(784, y + 64); x.lineTo(796, y + 76); x.lineTo(820, y + 50); x.stroke(); } // (a tick: the font has none)
      for (let k = 0; k < 14; k++) { const h = 8 + ((k * 37 + i * 11) % 17); x.globalAlpha = red && k > 9 ? 1 : 0.7; x.fillRect(536 + k * 32, y + RH - 18 - h, 20, h); }
      x.globalAlpha = 1;
    });
    tex.needsUpdate = true;
  };
  draw();
  const F = '18px "Press Start 2P"';
  if (document.fonts && document.fonts.load && !(document.fonts.check && document.fonts.check(F))) document.fonts.load(F).then(draw, () => {});
  return tex;
}

// A crack in glass: lines from a strike, branching, drawn once (white on black: added to the glass's light)
function crackTexture() {
  const S = 256, cv = document.createElement("canvas"), x = cv.getContext("2d");
  cv.width = cv.height = S;
  x.fillStyle = "#000"; x.fillRect(0, 0, S, S);
  x.strokeStyle = "#fff"; x.lineCap = "round";
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const branch = (px, py, a, len, w, depth) => {
    x.lineWidth = w; x.beginPath(); x.moveTo(px, py);
    for (let i = 0; i < 6; i++) { a += (rnd() - 0.5) * 0.7; px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6; x.lineTo(px, py); if (depth > 0 && rnd() < 0.3) branch(px, py, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6), len * 0.5, w * 0.6, depth - 1); }
    x.stroke();
  };
  x.shadowColor = "#fff"; x.shadowBlur = 3;
  for (let k = 0; k < 9; k++) branch(S / 2, S / 2, (k / 9) * Math.PI * 2 + rnd() * 0.4, 70 + rnd() * 60, 2.2, 2);
  x.lineWidth = 1.5; x.beginPath(); x.arc(S / 2, S / 2, 14, 0, 7); x.stroke(); x.beginPath(); x.arc(S / 2, S / 2, 34 + rnd() * 8, 0.4, 2.6); x.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// Each cell's boss, from its model's name: its key in BOSSES, its number, its name and colour, and how its cell fares
function cellStates(cells) {
  const st = (typeof Store !== "undefined" && Store.state) || {}, beatenOf = (k) => ((st.boss && st.boss[k]) || 0) > 0 || (k === "all" && ((st.stats && st.stats.bestExam) || 0) >= 60);
  return cells.map((c, i) => {
    const m = /^boss-(\d+|all)-t$/.exec(c.name), key = m ? m[1] : String(i + 1), B = BOSSES[key] || { name: "UNKNOWN", color: "#35efff" };
    const beaten = beatenOf(key);
    return { key, no: key === "all" ? 12 : +key, name: B.name, col: new THREE.Color(B.color), sd: c.sd, beaten,
      alarm: CELL_WORSE.alert.includes(key) && !beaten, crack: CELL_WORSE.crack.includes(key), steam: CELL_WORSE.steam.includes(key), phase: ((i * 0.618) % 1) };
  });
}

// The rim and under-light of a boss in its cell, added to its own materials' shading (no light is added to the
// scene): its edges caught in its cell's colour, and the colour from the plinth's glow on what faces down. u: the
// cell's { col, k } (k breathes with the cell's pulse; a rattle flares it).
function cellRim(mats, u) {
  for (const m of mats) {
    if (!m || !m.isMeshStandardMaterial || m.userData.cellRim) continue;
    m.userData.cellRim = u;
    m.onBeforeCompile = cellRimCompile;
    m.customProgramCacheKey = cellRimKey;
    m.needsUpdate = true;
  }
}
function cellRimKey() { return "cell-rim-1"; }
function cellRimCompile(sh) {
  const u = this.userData.cellRim;
  sh.uniforms.uCellCol = u.col; sh.uniforms.uCellK = u.k;
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uCellCol; uniform float uCellK;")
    .replace("#include <tonemapping_fragment>", `{
      vec3 nV = normalize(geometry.normal), upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      float fr = 1.0 - clamp(dot(nV, geometry.viewDir), 0.0, 1.0), under = clamp(-dot(nV, upV) * 0.8 + 0.25, 0.0, 1.0);
      gl_FragColor.rgb += uCellCol * uCellK * (diffuseColor.rgb * (0.55 * under + 1.1 * fr * fr) + 0.55 * pow(fr, 3.0));
    }
    #include <tonemapping_fragment>`);
}

// An electric arc: a jagged line of light (two crossed ribbons along it), remade where it strikes
function cellArc() {
  const N = 12, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 2 * 6 * 3), across = new Float32Array(N * 2 * 6); // (each jag: two ribbons, six corners each)
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aAcross", new THREE.BufferAttribute(across, 1));
  for (let i = 0; i < across.length; i += 6) across.set([-1, 1, 1, -1, -1, 1], i); // (a0 b1 a1, a0 b0 b1: the sides they lie on)
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "attribute float aAcross; varying float vA; void main(){ vA = aAcross; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform float uK; varying float vA; void main(){ float a = 1.0 - abs(vA); gl_FragColor = vec4(vec3(0.55, 0.85, 1.0) * (pow(a, 3.0) * 3.0 + a * 0.6) * uK, 1.0); }",
  }));
  mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 6;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Vector3(), D = new THREE.Vector3(), u1 = new THREE.Vector3(), u2 = new THREE.Vector3(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  // from A to B in N jags: each jag two ribbons crossed along it (each across the jag, a little wide)
  mesh.userData.strike = (A, B, w = 0.045) => {
    let o = 0;
    const put = (v) => { pos[o++] = v.x; pos[o++] = v.y; pos[o++] = v.z; };
    a.copy(A);
    for (let i = 1; i <= N; i++) {
      b.lerpVectors(A, B, i / N);
      if (i < N) b.add(p.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.32));
      D.subVectors(b, a).normalize();
      u1.crossVectors(D, Math.abs(D.y) > 0.8 ? X : Y).normalize().multiplyScalar(w);
      u2.crossVectors(D, u1).normalize().multiplyScalar(w);
      for (const d of [u1, u2]) {
        p.copy(d); q.copy(p).negate();
        const a0 = a.clone().add(q), a1 = a.clone().add(p), b0 = b.clone().add(q), b1 = b.clone().add(p);
        put(a0); put(b1); put(a1); put(a0); put(b0); put(b1);
      }
      a.copy(b);
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeBoundingSphere();
  };
  return mesh;
}

// Everything of the cells and the watched hall, made in a few draws. hall: the HallScene (its cells, its scene).
function buildCellKit(hall) {
  const s = hall.scene, cells = hall.cells, calm = hall.calm, states = cellStates(cells);
  const kit = { states, steelMat: cellSteelMaterial(), glowMat: cellGlowMaterial(calm), meshes: [], near: [], t: 0, arcIn: 3, twitchIn: 2 };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  const at = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) => M.compose(V.set(x, y, z), Q.setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(sx, sy, sz)).clone(); // (laid by rx, then turned by ry)
  const oct = (r0, r1, h) => new THREE.CylinderGeometry(r1, r0, h, 8, 1, false, Math.PI / 8); // (a flat face toward the front)
  const steel = new KitBatch({ color: 3, aPat: 1 }), glow = new KitBatch({ aCol: 3, aState: 4, aKind: 1 }); // (the hall's own pieces)
  const one = { steel: new KitBatch({ color: 3, aPat: 1 }), detail: new KitBatch({ color: 3, aPat: 1 }), glow: new KitBatch({ aCol: 3, aState: 4, aKind: 1 }), screens: new KitBatch({ aRow: 1, aState: 4 }) }; // (one cell's)
  const GUN = [0.105, 0.115, 0.135], DARK = [0.055, 0.06, 0.072], BAR = [0.16, 0.17, 0.2], BRIGHT = [0.33, 0.35, 0.4], PIPE = [0.18, 0.19, 0.22], WHITE = [1, 1, 1];
  const box = new THREE.BoxGeometry(1, 1, 1), plane = new THREE.PlaneGeometry(1, 1);
  const torus = new THREE.TorusGeometry(1.24, 0.032, 6, 40).rotateX(Math.PI / 2), dome = new THREE.SphereGeometry(0.1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
  const bolt = new THREE.CylinderGeometry(0.045, 0.05, 0.06, 6), pipe = (r) => new THREE.CylinderGeometry(r, r, 1, 8, 1, true);
  // ---- one cell, in its own place (its front, +z, toward the aisle and the door): its steel, its small parts, its
  // lights, its plate and its screen. Made once: every cell is a copy of it (see kitCopies)
  {
    const { steel, detail, glow, screens } = one;
    const put = (b, geo, local, v, su, sv, smooth) => b.add(geo, local, v, su, sv, smooth);
    const g = (pat, col) => ({ color: col || GUN, aPat: pat });
    const L = { aCol: [0, 0, 0], aState: [0, 0, 0, 0] }; // (each cell's own, put in as it is copied)
    const apo = (r) => r * Math.cos(Math.PI / 8); // (an octagon's flat faces stand this far out)
    // the plinth: a floor plate, the body (a kick plate of hazard paint round its foot), a chamfer up to the glass
    put(steel, oct(1.75, 1.72, CELL.floor), at(0, CELL.floor / 2, 0), g(0, DARK), 11, 0.1);
    put(steel, oct(1.52, 1.52, 0.66), at(0, CELL.floor + 0.33, 0), g(0), 9.5, 0.66);
    put(steel, oct(1.535, 1.535, 0.15), at(0, CELL.floor + 0.1, 0), g(1, WHITE), 9.6, 0.15);
    put(steel, oct(1.52, 1.3, 0.19), at(0, 0.825, 0), g(0, BAR), 9, 0.2);
    put(steel, new THREE.CylinderGeometry(1.22, 1.22, 0.14, 24, 1, true), at(0, CELL.baseTop + 0.05, 0), g(0, BRIGHT), 7.7, 0.14);
    // its vent grilles (sides and back) and the bezel of its status screen (front)
    for (const a of [Math.PI / 2, Math.PI, -Math.PI / 2]) put(steel, box, at(Math.sin(a) * (apo(1.52) + 0.012), 0.47, Math.cos(a) * (apo(1.52) + 0.012), 0.62, 0.3, 0.03, a), g(2, WHITE), 0.62, 0.3);
    put(steel, box, at(0, 0.5, apo(1.52) + 0.02, 1.0, 0.37, 0.05), g(3, BAR), 1, 0.37);
    // the bars round the glass, and the cap: a chamfer, its body (the plate on its front), a lip of hazard paint, the lid
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; put(steel, box, at(Math.sin(a) * 1.27, (CELL.baseTop + CELL.capY) / 2, Math.cos(a) * 1.27, 0.15, CELL.capY - CELL.baseTop, 0.22, a), g(0, BAR), 0.4, 3.4); }
    put(steel, new THREE.CylinderGeometry(1.22, 1.22, 0.14, 24, 1, true), at(0, CELL.capY - 0.05, 0), g(0, BRIGHT), 7.7, 0.14);
    put(steel, oct(1.3, 1.52, 0.16), at(0, CELL.capY + 0.08, 0), g(0, BAR), 9, 0.16);
    put(steel, oct(1.52, 1.52, 0.42), at(0, CELL.capY + 0.37, 0), g(0), 9.5, 0.42);
    put(steel, oct(1.535, 1.535, 0.1), at(0, CELL.capY + 0.63, 0), g(1, WHITE), 9.6, 0.1);
    put(steel, oct(1.52, 1.25, 0.1), at(0, CELL.capTop - 0.05, 0), g(0, BAR), 8.5, 0.1);
    put(steel, box, at(0, CELL.capY + 0.37, apo(1.52) + 0.02, 1.16, 0.38, 0.05), g(3, BAR), 1.16, 0.38);
    // pipes and cables from the lid up into the ceiling (8.8 m), their flanges
    for (const [px, pz, r] of [[0, -0.85, 0.1], [0.62, -0.62, 0.075], [-0.62, -0.62, 0.075]]) {
      put(steel, pipe(r), at(px, (CELL.capTop + 8.8) / 2, pz, 1, 8.8 - CELL.capTop, 1), g(0, PIPE), 2 * Math.PI * r, 3.7);
      for (const fy of [CELL.capTop + 0.12, 6.4, 8.2]) put(steel, new THREE.CylinderGeometry(r + 0.045, r + 0.045, 0.07, 8), at(px, fy, pz), g(0, BRIGHT), 1, 0.07);
    }
    for (const sx of [-1, 1]) put(steel, pipe(0.025), at(sx * 1.0, 6.93, -0.25, 1, 3.75, 1, 0, 0, sx * 0.08), g(0, DARK), 0.15, 3.75);
    // the small parts (near cells only): bolts round the lid and the plinth's top, clamps on the bars, the lamps' housings
    for (let k = 0; k < 16; k++) { const a = ((k + 0.5) / 16) * Math.PI * 2; put(detail, bolt, at(Math.sin(a) * 1.36, CELL.capTop + 0.02, Math.cos(a) * 1.36), g(0, BRIGHT), 0.3, 0.06); }
    for (let k = 0; k < 8; k++) { const fa = (k * Math.PI) / 4; for (const dt of [-0.36, 0.36]) { if (k === 0) continue; put(detail, bolt, at(Math.sin(fa) * (apo(1.52) + 0.02) + Math.cos(fa) * dt, 0.62, Math.cos(fa) * (apo(1.52) + 0.02) - Math.sin(fa) * dt, 1, 1, 1, fa, Math.PI / 2), g(0, BRIGHT), 0.3, 0.06); } }
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; for (const cy of [1.4, 2.62, 3.85]) put(detail, box, at(Math.sin(a) * 1.29, cy, Math.cos(a) * 1.29, 0.32, 0.15, 0.3, a), g(0, BRIGHT), 0.3, 0.15); }
    for (const sx of [-1, 1]) put(detail, new THREE.CylinderGeometry(0.14, 0.16, 0.07, 10), at(sx * 0.62, CELL.capTop + 0.035, 0.62), g(0, DARK), 0.5, 0.07);
    for (const [bx, by] of [[-0.44, 0.655], [0.44, 0.655], [-0.44, 0.345], [0.44, 0.345]]) put(detail, bolt, at(bx, by, apo(1.52) + 0.05, 0.6, 0.6, 0.6, 0, Math.PI / 2, 0), g(0, BRIGHT), 0.2, 0.04);
    // its lights: two containment bands, a strip round the plinth, two hazard lamps on the lid, lights round its ring
    for (const ry of [1.95, 3.3]) put(glow, torus, at(0, ry, 0), Object.assign({ aKind: 0 }, L), 1, 1, true);
    put(glow, new THREE.CylinderGeometry(1.545, 1.545, 0.035, 8, 1, true, Math.PI / 8), at(0, 0.72, 0), Object.assign({ aKind: 0 }, L));
    for (const sx of [-1, 1]) put(glow, dome, at(sx * 0.62, CELL.capTop + 0.07, 0.62), Object.assign({ aKind: 1 }, L), 1, 1, true);
    for (let k = 0; k < 8; k++) { const a = ((k + 0.5) / 8) * Math.PI * 2; put(glow, plane, at(Math.sin(a) * 1.93, 0.016, Math.cos(a) * 1.93, 0.16, 0.16, 1, a, -Math.PI / 2), Object.assign({ aKind: 2 }, L)); }
    // its plate and its screen (their pictures: its row of the atlas, the plate its left half, the screen its right)
    const sv = { aRow: 0, aState: L.aState };
    put(screens, plane, at(0, CELL.capY + 0.37, apo(1.52) + 0.048, 1.08, 0.29, 1), sv, 0.5, 1);
    put(screens, plane, at(0, 0.5, apo(1.52) + 0.048, 0.9, 0.27, 1), sv, 0.5, 1);
    for (let i = 6; i < 12; i++) screens.uvm[i * 2] += 0.5;
    // the caution ring on the floor round it
    put(steel, new THREE.RingGeometry(1.8, 2.04, 40, 1), at(0, 0.012, 0, 1, 1, 1, 0, -Math.PI / 2), g(1, WHITE), 4.08, 4.08); // (its uv is planar: in metres, the stripes run straight across it)
  }
  // ---- every cell: the one copied, moved and turned to its place, in its own light and state, its own row of pictures
  const mats = cells.map((c) => new THREE.Matrix4().compose(c.anchor.position, Q.setFromAxisAngle(up, c.anchor.rotation.y), S1));
  const per = (i) => { const st = states[i]; return { aCol: st.col.toArray(), aState: [st.alarm ? 1 : 0, st.crack ? 1 : 0, st.beaten ? 1 : 0, st.phase], aRow: cells.length - 1 - i }; };
  const copies = { steel: kitCopies(one.steel, mats), detail: kitCopies(one.detail, mats), glow: kitCopies(one.glow, mats, per), screens: kitCopies(one.screens, mats, per) };
  // ---- the hall, watched: hazard strips and floor lights along the aisle, tripwires across it between the worlds
  // (their emitters), rails overhead (their hangers), cameras on the pillars
  const Z1 = 6, Z2 = HALL.endZ + 9;
  for (const sx of [-1, 1]) {
    steel.add(plane, at(sx * 2.55, 0.013, (Z1 + Z2) / 2, 0.22, Z1 - Z2, 1, 0, -Math.PI / 2), { color: WHITE, aPat: 1 }, 0.22, Z1 - Z2);
    for (let z = Z1 - 1; z > Z2; z -= 2) glow.add(plane, at(sx * 2.26, 0.015, z, 0.12, 0.3, 1, 0, -Math.PI / 2), { aCol: [1, 1, 1], aState: [0, 0, 0, 0], aKind: 2 });
    steel.add(box, at(sx * HALL.podX, 8.45, (9 + HALL.endZ) / 2, 0.24, 0.18, 9 - HALL.endZ), { color: BAR, aPat: 0 }, 0.24, 9 - HALL.endZ);
    for (let z = 6; z > HALL.endZ; z -= 6) steel.add(box, at(sx * HALL.podX, 8.65, z, 0.08, 0.3, 0.08), { color: DARK, aPat: 0 });
  }
  const lasers = [];
  for (let i = 1; i < HALL_WORLDS.length; i++) {
    const z = HALL.z0 + HALL.step / 2 - i * HALL.step;
    for (const sx of [-1, 1]) {
      steel.add(box, at(sx * 3.0, 0.5, z, 0.14, 1.0, 0.14), { color: BAR, aPat: 0 }, 0.14, 1);
      steel.add(box, at(sx * 3.0, 0.06, z, 0.3, 0.12, 0.3), { color: WHITE, aPat: 1 }, 0.3, 0.12);
      for (const ly of [0.25, 0.75]) glow.add(box, at(sx * 2.92, ly, z, 0.03, 0.05, 0.05), { aCol: [1, 0.1, 0.1], aState: [0, 0, 0, i * 0.37], aKind: 3 });
    }
    lasers.push([new THREE.Vector3(-2.92, 0.25, z), new THREE.Vector3(2.92, 0.75, z), i * 0.61], [new THREE.Vector3(-2.92, 0.75, z), new THREE.Vector3(2.92, 0.25, z), i * 0.61 + 0.3]);
  }
  // the laser tripwires: each two crossed ribbons, a hot core and a soft edge; a beam now and then drops out a moment
  {
    const pos = [], acr = [], ph = [], D = new THREE.Vector3(), P = new THREE.Vector3(), w = 0.028;
    for (const [a, b, p] of lasers) {
      D.subVectors(b, a).normalize();
      const flat = new THREE.Vector3(0, 1, 0).cross(D).normalize(), upright = new THREE.Vector3().crossVectors(D, flat).normalize();
      for (const off of [flat, upright]) {
        P.copy(off).multiplyScalar(w);
        const c = [a.clone().sub(P), a.clone().add(P), b.clone().add(P), b.clone().sub(P)];
        for (const [k, s] of [[0, -1], [2, 1], [1, 1], [0, -1], [3, -1], [2, 1]]) { pos.push(c[k].x, c[k].y, c[k].z); acr.push(s); ph.push(p); }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    lg.setAttribute("aAcross", new THREE.Float32BufferAttribute(acr, 1));
    lg.setAttribute("aPh", new THREE.Float32BufferAttribute(ph, 1));
    kit.laser = new THREE.Mesh(lg, new THREE.ShaderMaterial({
      uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uK: { value: 1 }, uCalm: { value: calm ? 1 : 0 } }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: "attribute float aAcross; attribute float aPh; varying float vA; varying float vPh; varying float vDepth; void main(){ vA = aAcross; vPh = aPh; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
      fragmentShader: `${GLSL_FOG_PARS} uniform float uTime; uniform float uK; uniform float uCalm; varying float vA; varying float vPh; varying float vDepth;
        void main(){ float a = 1.0 - abs(vA); float drop = mix(step(0.06, fract(uTime * 0.23 + vPh * 1.7)), 1.0, uCalm); float k = (pow(a, 4.0) * 1.8 + a * a * 0.28) * drop * mix(0.85 + 0.15 * sin(uTime * 31.0 + vPh * 40.0), 1.0, uCalm);
          gl_FragColor = vec4(vec3(1.0, 0.09, 0.12) * k * uK * (1.0 - smoothstep(uFogNear, uFogFar * 1.1, vDepth)), 1.0); }`,
    }));
    kit.laser.frustumCulled = false; kit.laser.renderOrder = 5;
  }
  // ---- built: the steel (one draw), its small parts for the near cells (instanced: one draw), the lights (one), the
  // plates and screens (one, one picture), the lasers (one)
  kit.steel = new THREE.Mesh(kitGeometry([copies.steel, steel.arrays()]), kit.steelMat);
  kit.glow = new THREE.Mesh(kitGeometry([copies.glow, glow.arrays()]), kit.glowMat);
  kit.atlas = cellAtlas(states);
  kit.screens = new THREE.Mesh(kitGeometry([copies.screens]), new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { tAtlas: { value: kit.atlas }, uTime: { value: 0 }, uK: { value: 1 }, uRows: { value: cells.length }, uCalm: { value: calm ? 1 : 0 } }),
    vertexShader: "attribute vec2 uvM; attribute float aRow; attribute vec4 aState; uniform float uRows; varying vec2 vUv; varying vec4 vState; varying float vDepth; void main(){ vUv = vec2(uvM.x, (aRow + uvM.y) / uRows); vState = aState; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS} uniform sampler2D tAtlas; uniform float uTime; uniform float uK; uniform float uCalm; varying vec2 vUv; varying vec4 vState; varying float vDepth;
      void main(){ vec3 c = texture2D(tAtlas, vUv).rgb; c = c * c * (c * 0.305 + 0.695); float screen = step(0.5, vUv.x); float blink = 1.0 - screen * vState.x * (1.0 - vState.z) * (1.0 - uCalm) * 0.55 * step(0.5, fract(uTime * 1.6 + vState.w));
        float scan = 1.0 - screen * 0.12 * step(0.5, fract(gl_FragCoord.y * 0.5)); c *= mix(1.35, 2.1, screen) * blink * scan * uK;
        gl_FragColor = vec4(mix(c, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0); }`,
  }));
  // (the small parts: every cell's, one after another in the cells' order, so the near cells' are one range of them)
  kit.detailPer = one.detail.pos.length / 3;
  kit.detail = new THREE.Mesh(kitGeometry([copies.detail]), kit.steelMat);
  kit.detail.geometry.setDrawRange(0, 0);
  for (const m of [kit.steel, kit.glow, kit.screens, kit.detail, kit.laser]) { m.frustumCulled = false; s.add(m); kit.meshes.push(m); }
  // ---- the cameras on the pillars, panning slowly (instanced: their bodies one draw, their lamps and lenses another)
  kit.placeCams = (t) => {
    const E = new THREE.Euler(0, 0, 0, "YXZ"), k = calm ? 0.15 : 1;
    kit.cams.forEach((c, i) => {
      E.set(0.42, c.ry + Math.sin(t * 0.27 + c.ph) * 0.55 * k, 0);
      M.compose(V.set(c.x, c.y, c.z), Q.setFromEuler(E), S1);
      kit.camBody.setMatrixAt(i, M); kit.camLamp.setMatrixAt(i, M);
    });
    kit.camBody.instanceMatrix.needsUpdate = kit.camLamp.instanceMatrix.needsUpdate = true;
  };
  {
    const body = new KitBatch({ color: 3, aPat: 1 }), lamp = new KitBatch({ aCol: 3, aState: 4, aKind: 1 });
    body.add(box, at(0, 0, 0.28, 0.08, 0.08, 0.56), { color: BAR, aPat: 0 });
    body.add(box, at(0, 0, 0.62, 0.22, 0.2, 0.38), { color: [0.45, 0.46, 0.49], aPat: 0 });
    body.add(box, at(0, 0.12, 0.66, 0.28, 0.04, 0.48), { color: DARK, aPat: 0 });
    body.add(box, at(0, -0.06, 0.62, 0.23, 0.05, 0.3), { color: WHITE, aPat: 1 }, 0.3, 0.05);
    lamp.add(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 12).rotateX(Math.PI / 2), at(0, 0, 0.83), { aCol: [0, 0, 0], aState: [0, 0, 0, 0], aKind: 4 });
    lamp.add(new THREE.SphereGeometry(0.025, 6, 4), at(0.07, 0.07, 0.82), { aCol: [0, 0, 0], aState: [0, 0, 0, 0], aKind: 3 }, 1, 1, true);
    const n = (HALL_WORLDS.length + 1) * 2;
    kit.camBody = new THREE.InstancedMesh(kitGeometry([body.arrays()]), kit.steelMat, n);
    kit.camLamp = new THREE.InstancedMesh(kitGeometry([lamp.arrays()]), cellGlowMaterial(calm), n);
    kit.cams = [];
    for (let i = 0; i <= HALL_WORLDS.length; i++) for (const sx of [-1, 1]) kit.cams.push({ x: sx * (HALL.wallX - 1.02), y: 5.0, z: HALL.z0 + HALL.step / 2 - i * HALL.step + 0.28 * sx, ry: sx < 0 ? Math.PI / 2 : -Math.PI / 2, ph: (i * 1.7 + (sx > 0 ? 0.8 : 0)) % 6.283 });
    for (const m of [kit.camBody, kit.camLamp]) { m.frustumCulled = false; s.add(m); kit.meshes.push(m); }
    // (each lamp blinks at its own moment)
    const ph = new Float32Array(n * 4);
    kit.cams.forEach((c, i) => { ph[i * 4 + 3] = (c.ph * 0.37) % 1; });
    kit.camLamp.geometry.deleteAttribute("aState");
    kit.camLamp.geometry.setAttribute("aState", new THREE.InstancedBufferAttribute(ph, 4));
    kit.placeCams(0);
  }
  // ---- steam from the worse cells' lids: soft puffs rising and spreading (instanced quads facing the lens)
  {
    const steamy = cells.filter((c, i) => states[i].steam), per = 7, n = steamy.length * per;
    if (n) {
      const off = new Float32Array(n * 4);
      steamy.forEach((c, j) => { for (let k = 0; k < per; k++) { const a = c.anchor.rotation.y + Math.PI + (k - 3) * 0.22; off.set([c.x + Math.sin(a) * 0.7, CELL.capTop + 0.05, c.z + Math.cos(a) * 0.7, (k / per + j * 0.31) % 1], (j * per + k) * 4); } });
      const qg = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
      qg.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
      qg.instanceCount = n;
      kit.steam = new THREE.Mesh(qg, new THREE.ShaderMaterial({
        uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uK: { value: 1 } }), transparent: true, depthWrite: false,
        vertexShader: "attribute vec4 aOff; uniform float uTime; varying vec2 vUv; varying float vA; varying float vDepth; void main(){ float k = fract(uTime * 0.28 + aOff.w); vec3 p = aOff.xyz + vec3(sin(aOff.w * 40.0 + uTime) * 0.15 * k, k * 2.1, 0.0); vec4 mv = viewMatrix * vec4(p, 1.0); mv.xy += position.xy * (0.35 + k * 1.1); vUv = uv; vA = smoothstep(0.0, 0.15, k) * (1.0 - k); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: `${GLSL_FOG_PARS} uniform float uK; varying vec2 vUv; varying float vA; varying float vDepth; void main(){ float r = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), 1.8) * vA * 0.22 * uK * (1.0 - smoothstep(uFogNear, uFogFar, vDepth)); gl_FragColor = vec4(vec3(0.72, 0.78, 0.86), a); }`,
      }));
      kit.steam.frustumCulled = false; kit.steam.renderOrder = 6;
      kit.steam.visible = !calm && GFX.extras !== false;
      s.add(kit.steam); kit.meshes.push(kit.steam);
    }
  }
  // ---- an electric arc now and then on a near cell
  kit.arc = cellArc(); s.add(kit.arc); kit.meshes.push(kit.arc);
  kit.arcT = 0;
  box.dispose(); plane.dispose(); torus.dispose(); dome.dispose(); bolt.dispose();
  // ---- each frame: the lights follow the hall's power (and INSERT COIN's surge); the near cells' small parts drawn
  // (the cells stand in order down the hall: the near ones are a run of them, one range of the one geometry); the
  // cameras pan; now and then an arc strikes a near cell (its glass flickers with it)
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  kit.update = (hall, dt, cam) => {
    const k = (0.45 + 0.55 * hall.power) * (1 + (hall.endLamp.boost || 0) * 0.8);
    for (const m of [kit.glowMat, kit.screens.material, kit.laser.material, kit.camLamp.material]) m.uniforms.uK.value = k;
    if (kit.steam) { kit.steam.material.uniforms.uK.value = k; kit.steam.visible = !calm && GFX.extras !== false; } // (AUTO may take the tier down while the title is up)
    let a = -1, b = -1;
    for (const c of cells) if (Math.hypot(c.x - cam.x, c.z - cam.z) < 24 && c.z < cam.z + 2.5) { if (a < 0) a = c.i; b = c.i; }
    kit.detail.geometry.setDrawRange(a < 0 ? 0 : a * kit.detailPer, a < 0 ? 0 : (b - a + 1) * kit.detailPer);
    if (!calm && (kit.camN = (kit.camN || 0) + 1) % 6 === 0) kit.placeCams(hall.t); // (every sixth frame, ten times a second on a phone: the pan is slow, and nothing is sent to the graphics chip on the frames between)
    const arc = kit.arc, au = arc.material.uniforms.uK;
    if (kit.arcT > 0) {
      kit.arcT -= dt;
      arc.visible = kit.arcT > 0;
      au.value = Math.random() < 0.3 ? 0.2 : 0.9 + Math.random() * 0.8; // (it stutters)
    } else if (!calm && GFX.extras !== false && !hall.leaving && (kit.arcIn -= dt) <= 0) {
      kit.arcIn = 2 + Math.random() * 4.5;
      const near = cells.filter((c) => c.boss && c.boss.visible && Math.hypot(c.x - cam.x, c.z - cam.z) < 20);
      if (near.length) {
        const c = near[Math.floor(Math.random() * near.length)], m = c.anchor.matrixWorld, a0 = Math.random() * 6.283, y0 = Math.random() < 0.5 ? 1.95 : 3.3, a1 = a0 + (Math.random() - 0.5) * 1.4;
        A.set(Math.sin(a0) * 1.25, y0, Math.cos(a0) * 1.25).applyMatrix4(m);
        B.set(Math.sin(a1) * 1.22, y0 > 2.5 ? CELL.capY - 0.05 : CELL.baseTop + 0.05, Math.cos(a1) * 1.22).applyMatrix4(m);
        arc.userData.strike(A, B);
        kit.arcT = 0.16 + Math.random() * 0.14;
        arc.visible = true;
        c.flick = Math.max(c.flick, 0.5);
      }
    }
  };
  return kit;
}
