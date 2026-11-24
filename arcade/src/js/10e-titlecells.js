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
// On a computer the hall's walls are dressed as a prison block's too (10f-titledress.js), in these same draws (its
// searchlights and beacons one more); a phone's hall is as it was.

const CELL = { floor: 0.07, baseTop: 0.92, capY: 4.32, capTop: 5.08, R: 1.15, ring: 1.52 };
// which cells are worse off (by their boss: Boss Rush's key), whatever the player has done; a beaten boss's cell calms
const CELL_WORSE = { alert: ["6", "all"], crack: ["2", "8", "all"], steam: ["5", "10", "3"] };

// Each corner's place on its own face of a piece, for the steel's chamfers (cellSteelMaterial): 0 to 1 across the
// face, 0 or 1 at its edges. A box's faces as they are; a closed cylinder's sides each its own if it has a dozen or
// fewer (a pipe or a band, open, or more sides, is round: no edge down its sides, 0.25 to 0.75 across them), its ends
// by how far in from the rim (0 at the rim, 0.5 in the middle); anything else no edge at all (0.5 at every corner: the
// shader leaves it be). geo: the piece as made; U: its uvs unindexed (three corners a triangle); n: its corners.
// Nothing of three.js is made here.
function kitEdges(geo, U, n) {
  const E = new Float32Array(n * 2).fill(0.5);
  if (!U) return E;
  if (geo.type === "BoxGeometry") { E.set(U.subarray(0, n * 2)); return E; }
  if (geo.type !== "CylinderGeometry") return E;
  const p = geo.parameters || {}, segs = p.radialSegments || 8, faces = segs <= 12 && !p.openEnded;
  const round = (j) => Math.atan2(U[j + 1] - 0.5, U[j] - 0.5) / (2 * Math.PI); // (a rim corner's way round)
  for (let i = 0; i < n; i += 3) {
    let cap = -1, cu = 0;
    for (let k = 0; k < 3; k++) { const j = (i + k) * 2; if (U[j] === 0.5 && U[j + 1] === 0.5) cap = k; cu += U[j] / 3; } // (an end's triangles each have its middle, at uv 0.5, 0.5)
    const f = Math.floor(cu * segs);
    if (cap >= 0) {
      // an end: in from the rim one way, round it the other (each corner its own way round, its middle the two rim
      // corners' mean: the two ways never along one line, or the shader's frame would have no breadth)
      const r = [0, 1, 2].filter((k) => k !== cap).map((k) => round((i + k) * 2));
      if (r[1] - r[0] > 0.5) r[1] -= 1; else if (r[0] - r[1] > 0.5) r[0] -= 1;
      let q = 0;
      for (let k = 0; k < 3; k++) {
        const j = (i + k) * 2;
        if (k === cap) { E[j] = 0.5; E[j + 1] = 0.5; }
        else { E[j] = 0; E[j + 1] = 0.5 + 2 * (r[q] - (r[0] + r[1]) / 2); q++; }
      }
    } else {
      for (let k = 0; k < 3; k++) { const j = (i + k) * 2, a = U[j] * segs - f; E[j] = faces ? a : 0.25 + 0.5 * a; E[j + 1] = U[j + 1]; }
    }
  }
  return E;
}

// A batch of pieces made one geometry: each piece's corners carry what is given for it (colour, pattern, its cell's
// light and state...), and coordinates in metres along its faces (uvM), for the patterns drawn on them; with edges
// (o.edges: the steel's), each corner's place on its own face too (aEdge: see kitEdges).
class KitBatch {
  constructor(attrs = {}, o = {}) { this.attrs = attrs; this.edges = !!o.edges; this.pos = []; this.nor = []; this.uvm = []; this.edge = []; this.x = {}; for (const k in attrs) this.x[k] = []; }
  // geo placed by m; v: the piece's values; su, sv: its own uv in metres (a cylinder's: its girth and height);
  // smooth: keep its own normals (a torus, a dome), else flat (hard steel)
  add(geo, m, v = {}, su = 1, sv = 1, smooth = false) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!smooth) g.computeVertexNormals();
    const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv ? g.attributes.uv.array : null, n = P.length / 3;
    for (let i = 0; i < P.length; i++) { this.pos.push(P[i]); this.nor.push(N[i]); }
    for (let i = 0; i < n; i++) this.uvm.push(U ? U[i * 2] * su : 0, U ? U[i * 2 + 1] * sv : 0);
    if (this.edges) { const E = smooth ? null : kitEdges(geo, U, n); for (let i = 0; i < n * 2; i++) this.edge.push(E ? E[i] : 0.5); }
    for (const k in this.attrs) { const s = this.attrs[k], val = v[k] === undefined ? 0 : v[k]; const arr = this.x[k]; for (let i = 0; i < n; i++) for (let j = 0; j < s; j++) arr.push(s > 1 ? val[j] : val); }
    g.dispose();
    return this;
  }
  // its pieces as typed arrays, by attribute (with each attribute's size)
  arrays() {
    const a = { position: [new Float32Array(this.pos), 3], normal: [new Float32Array(this.nor), 3], uvM: [new Float32Array(this.uvm), 2] };
    if (this.edges) a.aEdge = [new Float32Array(this.edge), 2];
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
// (the master overhaul, Phase 2, 2026-11-23: two CC0 materials in the steel: the plinths' tops a tread plate
// (ambientCG DiamondPlate008C), the rest brushed (ambientCG Metal009), each read from its normal's y (the tread's
// relief) and its roughness (the brushing's streaks); they and the hall's reflection (HallScene.probeTaken) make the
// cells steel, where they read as flat grey boxes. Both pictures in assets/ui (normal x, y in red and green, roughness
// in blue): a level plate until they arrive.)
function cellFlatTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d");
  x.fillStyle = "rgb(128, 128, 128)"; x.fillRect(0, 0, 1, 1);
  const t = new THREE.Texture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = THREE.Texture.DEFAULT_ANISOTROPY; t.needsUpdate = true;
  return t;
}
// (Phase 2's polish, 2026-11-24: an art review found the steel still one flat tone a face, the near cells' bars,
// brackets and bands read as untextured boxes: the brushed map only made the roughness vary, and a flat face gives back
// one blurred reflection. Now each face finds its own frame (from how its corners' place on the face, aEdge, changes
// across the pixel: kitEdges) and with it: chamfers along its edges, worn to bright steel and turned 45 degrees out, so
// they catch the lamps and give back another part of the hall (as wide as they cover of the pixel: far off they fade,
// never a crawling line); the brushing's streaks tilting the face a little (the grain of the map's roughness across
// them), so what it gives back breaks along them; grime toward each upright face's foot; and the steel's tone mottled
// a little, warmer and cooler.)
function cellSteelMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.8, roughness: 0.38, envMapIntensity: 1.3 });
  m.userData.tTread = { value: cellFlatTexture() }; m.userData.tBrush = { value: cellFlatTexture() };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tTread = m.userData.tTread; sh.uniforms.tBrush = m.userData.tBrush;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 uvM; attribute float aPat; attribute vec2 aEdge; varying vec2 vUvM; varying float vPat; varying vec3 vWP; varying vec3 vWN; varying vec2 vEdge;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\n  vUvM = uvM; vPat = aPat; vEdge = aEdge;")
      .replace("#include <project_vertex>", "#include <project_vertex>\n#ifdef USE_INSTANCING\n  vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);\n#else\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);\n#endif"); // (an instance's own place counts: the cameras' bodies share this material)
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vUvM; varying float vPat; varying vec3 vWP; varying vec3 vWN; varying vec2 vEdge; uniform sampler2D tTread; uniform sampler2D tBrush;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float pHaz = step(0.5, vPat) * step(vPat, 1.5), pGri = step(1.5, vPat) * step(vPat, 2.5), pRec = step(2.5, vPat);
        float st = smoothstep(0.47, 0.53, abs(fract((vUvM.x + vUvM.y) * 2.6) - 0.5) * 2.0);
        vec3 haz = mix(vec3(0.95, 0.66, 0.05), vec3(0.03, 0.028, 0.035), st);
        float sl = fract(vUvM.y * 26.0);
        vec3 gri = mix(vec3(0.015, 0.016, 0.02), vec3(0.5, 0.53, 0.6), smoothstep(0.6, 0.72, sl) * (1.0 - smoothstep(0.84, 0.96, sl)));
        float seam = 1.0 - 0.5 * smoothstep(0.0, 0.008, abs(fract(vUvM.x * 0.7 + 0.25) - 0.5) - 0.49);
        diffuseColor.rgb = mix(diffuseColor.rgb * seam, haz, pHaz);
        diffuseColor.rgb = mix(diffuseColor.rgb, gri, pGri);
        diffuseColor.rgb *= 1.0 - 0.78 * pRec;
        float plain = (1.0 - pHaz) * (1.0 - pGri) * (1.0 - pRec), up = plain * smoothstep(0.6, 0.72, vWN.y); // (the base's top: its flat ring and the bevel round it, which is what the aisle sees)
        vec3 tread = texture2D(tTread, vWP.xz * 2.2).rgb, brush = texture2D(tBrush, vUvM * vec2(1.4, 0.35)).rgb;
        diffuseColor.rgb *= mix(1.0, 0.86 + 0.5 * (tread.g - 0.5) + 0.12, up);
        // the face's own frame: its two directions (view space) and its size in metres, from how the place on it changes
        // across the pixel (none for a piece without edges: sOn 0)
        vec3 sP = -vViewPosition, sDx = dFdx(sP), sDy = dFdy(sP);
        vec2 sEx = dFdx(vEdge), sEy = dFdy(vEdge);
        float sDet = sEx.x * sEy.y - sEy.x * sEx.y, sOn = step(0.02 * length(sEx) * length(sEy) + 1e-12, abs(sDet)); // (its two ways along nearly one line: no frame)
        sDet = mix(1.0, sDet, sOn);
        vec3 sTx = (sDx * sEy.y - sDy * sEx.y) * (sOn / sDet), sTy = (sDy * sEx.x - sDx * sEy.x) * (sOn / sDet);
        float sLx = max(length(sTx), 1e-4), sLy = max(length(sTy), 1e-4), sPx = max(length(sDx), length(sDy)) + 1e-5;
        // its chamfers: a band in from each edge (1.6 cm, less on a small piece), as much of the pixel as it covers; each
        // faces out across its edge
        vec2 sIn = min(vEdge, 1.0 - vEdge) * vec2(sLx, sLy);
        float sB = min(0.016, 0.18 * min(sLx, sLy));
        vec2 sCov = clamp((min(vec2(sB), sIn + 0.5 * sPx) - max(vec2(0.0), sIn - 0.5 * sPx)) / sPx, 0.0, 1.0) * sOn;
        float sBev = max(sCov.x, sCov.y);
        vec3 sTilt = sTx * (sCov.x * sign(vEdge.x - 0.5) / sLx) + sTy * (sCov.y * sign(vEdge.y - 0.5) / sLy);
        // the brushing: the grain of its streaks (the map's roughness, across them) tilts the face a little; finer than
        // the pixel, the map's smaller copies flatten it
        float sSl = clamp((texture2D(tBrush, vUvM * vec2(1.4, 0.35) + vec2(0.0, 0.002)).b - brush.b) * 175.0, -6.0, 6.0);
        vec3 sStreak = sTy * (-0.03 * sSl * sOn * (1.0 - up) / sLy); // (not on the tread plate: its diamonds are its own)
        // its tone mottled, a little warmer and cooler; grime toward an upright face's foot (its lowest edge)
        float sMot = smoothstep(0.38, 0.56, brush.b);
        diffuseColor.rgb *= mix((0.84 + 0.32 * sMot) * mix(vec3(1.03, 0.99, 0.95), vec3(0.96, 0.99, 1.04), sMot), vec3(1.0), up);
        vec3 sUp = (viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
        float sGx = dot(sTx, sUp) / sLx, sGy = dot(sTy, sUp) / sLy;
        float sLow = abs(sGy) >= abs(sGx) ? mix(1.0 - vEdge.y, vEdge.y, step(0.0, sGy)) * sLy * abs(sGy) : mix(1.0 - vEdge.x, vEdge.x, step(0.0, sGx)) * sLx * abs(sGx);
        float sGrime = clamp((1.0 - smoothstep(0.0, 0.22, sLow)) * smoothstep(0.55, 0.85, max(abs(sGx), abs(sGy))) * (0.55 + 0.9 * (1.0 - sMot)), 0.0, 1.0) * sOn;
        diffuseColor.rgb *= 1.0 - 0.5 * sGrime;
        // a chamfer worn bright: bare steel through paint, polished
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb * 2.2 + 0.05, vec3(0.5, 0.51, 0.55), max(pHaz, pRec)), sBev);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.6, pHaz);\n  roughnessFactor *= mix(mix(1.0, mix(0.78, 1.3, brush.b), plain), mix(0.6, 1.35, tread.b), up);\n  roughnessFactor = mix(mix(roughnessFactor, 0.85, 0.5 * sGrime), 0.24, sBev);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n  metalnessFactor = mix(mix(metalnessFactor, 0.15, pHaz), 0.9, sBev);")
      // the tread plate's relief: its diamonds tilt the surface, so they catch the lamps and the hall's reflection (only
      // its colour and roughness were taken before, and the plinth tops stayed a flat pale plane: Phase 2's gate review).
      // The tops face up, so the picture's frame is the world's (x along x, y along -z); elsewhere nothing changes
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { vec2 tn = (tread.rg * 2.0 - 1.0) * up;
          vec3 bent = vec3(tn.x, sqrt(max(1.0 - dot(tn, tn), 0.0)), -tn.y);
          normal = normalize(normal + mat3(viewMatrix) * ((bent - vec3(0.0, 1.0, 0.0)) * up)); }
        // the chamfers and the brushing, the face kept turned to the lens as much as it was (up to 0.25): a normal
        // turned away from the lens sends three.js's specular to thousands, a white bloom (the first try)
        { vec3 sV = normalize(vViewPosition); float sNV = min(dot(normal, sV), 0.25);
          normal = normalize(normal + sTilt + sStreak);
          normal = normalize(normal + sV * max(max(sNV, 0.02) - dot(normal, sV), 0.0)); }`);
  };
  m.customProgramCacheKey = () => "cell-steel-5";
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
// extra: more rows under the cells' (a computer's hall: its blocks' signs, 10f-titledress.js), each a painter of its row.
function cellAtlas(states, extra) {
  const W = 1024, RH = 128, K = Assets.phone ? 0.75 : 1, cv = document.createElement("canvas"), x = cv.getContext("2d"); // (drawn at three quarters on a phone: plenty for a plate a metre across; at full size on a computer's larger Retina picture)
  const more = extra || [];
  cv.width = W * K; cv.height = RH * (states.length + more.length) * K;
  const tex = new THREE.CanvasTexture(cv);
  tex.encoding = THREE.sRGBEncoding; tex.anisotropy = THREE.Texture.DEFAULT_ANISOTROPY; tex.minFilter = THREE.LinearMipmapLinearFilter; // (the plates are read at a slant down the aisle: filtered as finely as the tier allows)
  const css = (n) => "#" + new THREE.Color(n).getHexString();
  const draw = () => {
    x.setTransform(K, 0, 0, K, 0, 0);
    x.clearRect(0, 0, W, RH * (states.length + more.length));
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
    more.forEach((paint, j) => paint(x, (states.length + j) * RH, W, RH));
    tex.needsUpdate = true;
  };
  draw();
  const F = '18px "Press Start 2P"';
  if (document.fonts && document.fonts.load && !(document.fonts.check && document.fonts.check(F))) document.fonts.load(F).then(draw, () => {});
  return tex;
}

// A crack in glass: a strike's star of cracks with a spider's web between them, drawn once, white on black (added to
// the glass's light). Drawn in metres on the pane (the glass shows it over 1.27 m of its round and 2.04 m of its height:
// a picture twice as tall as it is wide, so nothing is stretched), the lines a pixel or so wide with no glow, each
// stretch catching the light more or less (Phase 2: soft 2 px lines with a halo and two drawn circles, stretched to
// 1.6 times their height, read as chalk scribbled over the boss)
function crackTexture() {
  const W = 256, H = 512, MW = 1.265, MH = 2.04, cv = document.createElement("canvas"), x = cv.getContext("2d");
  cv.width = W; cv.height = H;
  x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
  x.lineCap = "round"; x.lineJoin = "round";
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const px = (m) => (m / MW) * W, py = (m) => (m / MH) * H, C = [MW / 2, MH / 2];
  const seg = (a, b, w, lit) => { x.strokeStyle = `rgba(255,255,255,${lit.toFixed(2)})`; x.lineWidth = w; x.beginPath(); x.moveTo(px(a[0]), py(a[1])); x.lineTo(px(b[0]), py(b[1])); x.stroke(); };
  // a crack from p along angle a for len metres: short straight stretches, each its own glint; now and then a branch
  const crack = (p, a, len, w, depth, pts) => {
    const n = Math.max(3, Math.round(len / 0.05));
    for (let i = 0; i < n; i++) {
      a += (rnd() - 0.5) * 0.45;
      const q = [p[0] + Math.cos(a) * len / n, p[1] + Math.sin(a) * len / n];
      seg(p, q, w * (1 - 0.5 * i / n), 0.35 + 0.65 * rnd());
      if (pts) pts.push(q);
      if (depth > 0 && i > 1 && rnd() < 0.22) crack(q, a + (rnd() < 0.5 ? -1 : 1) * (0.45 + rnd() * 0.5), len * (0.25 + 0.3 * rnd()) * (1 - i / n), w * 0.7, depth - 1, null);
      p = q;
    }
  };
  // the star: radials from the strike, their points kept for the web
  const R = 8, rays = [];
  for (let k = 0; k < R; k++) { const pts = [C.slice()]; crack(C.slice(), (k / R) * Math.PI * 2 + (rnd() - 0.5) * 0.5, 0.32 + rnd() * 0.5, 1.5, 2, pts); rays.push(pts); }
  // the web: between each radial and the next, straight pieces across at three distances out, some missing
  const at = (pts, r) => { for (const q of pts) if (Math.hypot(q[0] - C[0], q[1] - C[1]) >= r) return q; return null; };
  for (const r of [0.05, 0.12, 0.22]) for (let k = 0; k < R; k++) {
    if (rnd() < 0.3) continue;
    const a = at(rays[k], r * (0.85 + 0.3 * rnd())), b = at(rays[(k + 1) % R], r * (0.85 + 0.3 * rnd()));
    if (a && b) seg(a, b, 1.0, 0.3 + 0.6 * rnd());
  }
  // the strike itself: the glass crushed white in a small knot
  for (let k = 0; k < 14; k++) { const a = rnd() * Math.PI * 2, r = 0.008 + rnd() * 0.022; seg(C, [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r], 1.2, 0.6 + 0.4 * rnd()); }
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
// cell's { col, k } (k breathes with the cell's pulse; a rattle flares it), and for a caged boss key: { value } (its
// cap's lamp: see below; none for the end of the hall's props).
// (Phase 2's polish, 2026-11-24: an art review found the gold and green cells hiding their bosses, the Group Golem a
// dark shape in its glass, its chest darker than the empty glass beside it (the art bible: a boss's face and chest never
// darker than what is behind them). Each caged boss is now lit from its cap's lamp too: a key from above it and toward
// the lens, nearly white with a little of its cell's colour, on its own surface with a floor under its darkest paint (a
// near-black plate still shows its shape), half as much on bare metal (chrome stays chrome), and a broad sheen where
// it turns to the lamp.)
const CELL_NO_KEY = { value: 0 };
function cellRim(mats, u) {
  for (const m of mats) {
    if (!m || !m.isMeshStandardMaterial || m.userData.cellRim) continue;
    m.userData.cellRim = u;
    m.onBeforeCompile = cellRimCompile;
    m.customProgramCacheKey = cellRimKey;
    m.needsUpdate = true;
  }
}
function cellRimKey() { return "cell-rim-2"; }
function cellRimCompile(sh) {
  const u = this.userData.cellRim;
  sh.uniforms.uCellCol = u.col; sh.uniforms.uCellK = u.k; sh.uniforms.uCellKey = u.key || CELL_NO_KEY;
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uCellCol; uniform float uCellK; uniform float uCellKey;")
    .replace("#include <tonemapping_fragment>", `{
      vec3 nV = normalize(geometry.normal), upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      float fr = 1.0 - clamp(dot(nV, geometry.viewDir), 0.0, 1.0), under = clamp(-dot(nV, upV) * 0.8 + 0.25, 0.0, 1.0);
      gl_FragColor.rgb += uCellCol * uCellK * (diffuseColor.rgb * (0.55 * under + 1.1 * fr * fr) + 0.55 * pow(max(fr, 0.0), 3.0));
      vec3 kL = normalize(upV * 0.8 + geometry.viewDir * 0.6);
      float kd = max(dot(nV, kL), 0.0), ks = pow(max(dot(reflect(-geometry.viewDir, nV), kL), 0.0), 16.0);
      gl_FragColor.rgb += mix(vec3(1.0), uCellCol, 0.4) * (uCellK * uCellKey) * ((diffuseColor.rgb + 0.035) * (0.25 + 0.75 * kd) * (1.0 - 0.5 * metalnessFactor) + 0.3 * ks * kd);
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
    fragmentShader: "uniform float uK; varying float vA; void main(){ float a = 1.0 - abs(vA); gl_FragColor = vec4(vec3(0.55, 0.85, 1.0) * (pow(max(a, 0.0), 3.0) * 3.0 + a * 0.6) * uK, 1.0); }",
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
  const steel = new KitBatch({ color: 3, aPat: 1 }, { edges: true }), glow = new KitBatch({ aCol: 3, aState: 4, aKind: 1 }); // (the hall's own pieces)
  const one = { steel: new KitBatch({ color: 3, aPat: 1 }, { edges: true }), detail: new KitBatch({ color: 3, aPat: 1 }, { edges: true }), glow: new KitBatch({ aCol: 3, aState: 4, aKind: 1 }), screens: new KitBatch({ aRow: 1, aState: 4 }) }; // (one cell's)
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
  // ---- on a computer, the hall's walls dressed as a prison block's (10f-titledress.js): made into the hall's own
  // batches below (its steel, its lights, its signs among the plates), so no draw is added for what stands still
  const dress = Assets.phone ? null : dressOwnRandom(() => hallDress(hall, { steel, glow, at, states, C: { GUN, DARK, BAR, BRIGHT, PIPE, WHITE } }));
  const rowsN = dress ? dress.rowsTotal : cells.length; // (the plates' picture: the cells' rows, then the signs')
  // ---- every cell: the one copied, moved and turned to its place, in its own light and state, its own row of pictures
  const mats = cells.map((c) => new THREE.Matrix4().compose(c.anchor.position, Q.setFromAxisAngle(up, c.anchor.rotation.y), S1));
  const per = (i) => { const st = states[i]; return { aCol: st.col.toArray(), aState: [st.alarm ? 1 : 0, st.crack ? 1 : 0, st.beaten ? 1 : 0, st.phase], aRow: rowsN - 1 - i }; };
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
        void main(){ float a = 1.0 - abs(vA); float drop = mix(step(0.06, fract(uTime * 0.23 + vPh * 1.7)), 1.0, uCalm); float k = (pow(abs(a), 4.0) * 1.8 + a * a * 0.28) * drop * mix(0.85 + 0.15 * sin(uTime * 31.0 + vPh * 40.0), 1.0, uCalm);
          gl_FragColor = vec4(vec3(1.0, 0.09, 0.12) * k * uK * (1.0 - smoothstep(uFogNear, uFogFar * 1.1, vDepth)), 1.0); }`,
    }));
    kit.laser.frustumCulled = false; kit.laser.renderOrder = 5;
  }
  // ---- built: the steel (one draw), its small parts for the near cells (instanced: one draw), the lights (one), the
  // plates and screens (one, one picture), the lasers (one)
  kit.steel = new THREE.Mesh(kitGeometry([copies.steel, steel.arrays()]), kit.steelMat);
  kit.glow = new THREE.Mesh(kitGeometry([copies.glow, glow.arrays()]), kit.glowMat);
  kit.atlas = cellAtlas(states, dress && dress.rows);
  kit.screens = new THREE.Mesh(kitGeometry(dress ? [copies.screens, dress.signs.arrays()] : [copies.screens]), new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { tAtlas: { value: kit.atlas }, uTime: { value: 0 }, uK: { value: 1 }, uRows: { value: rowsN }, uCalm: { value: calm ? 1 : 0 } }),
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
  [kit.steel.name, kit.glow.name, kit.screens.name, kit.detail.name, kit.laser.name] = ["cells-steel", "cells-lights", "cells-screens+plates", "cells-bolts+clamps", "lasers"]; // (named for tools/cost-report.js)
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
    const body = new KitBatch({ color: 3, aPat: 1 }, { edges: true }), lamp = new KitBatch({ aCol: 3, aState: 4, aKind: 1 });
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
    kit.camBody.name = "cameras"; kit.camLamp.name = "cameras-lamps";
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
    const steamy = cells.filter((c, i) => states[i].steam), per = 7, puffs = dress ? dress.puffs : [], n = steamy.length * per + puffs.length; // (and a computer's wall vents that breathe)
    if (n) {
      const off = new Float32Array(n * 4);
      steamy.forEach((c, j) => { for (let k = 0; k < per; k++) { const a = c.anchor.rotation.y + Math.PI + (k - 3) * 0.22; off.set([c.x + Math.sin(a) * 0.7, CELL.capTop + 0.05, c.z + Math.cos(a) * 0.7, (k / per + j * 0.31) % 1], (j * per + k) * 4); } });
      puffs.forEach((p, k) => off.set(p, (steamy.length * per + k) * 4));
      const qg = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
      qg.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 4));
      qg.instanceCount = n;
      kit.steam = new THREE.Mesh(qg, new THREE.ShaderMaterial({
        uniforms: Object.assign(fogUniforms(), { uTime: { value: 0 }, uK: { value: 1 } }), transparent: true, depthWrite: false,
        vertexShader: "attribute vec4 aOff; uniform float uTime; varying vec2 vUv; varying float vA; varying float vDepth; void main(){ float k = fract(uTime * 0.28 + aOff.w); vec3 p = aOff.xyz + vec3(sin(aOff.w * 40.0 + uTime) * 0.15 * k, k * 2.1, 0.0); vec4 mv = viewMatrix * vec4(p, 1.0); mv.xy += position.xy * (0.35 + k * 1.1); vUv = uv; vA = smoothstep(0.0, 0.15, k) * (1.0 - k); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: `${GLSL_FOG_PARS} uniform float uK; varying vec2 vUv; varying float vA; varying float vDepth; void main(){ float r = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), 1.8) * vA * 0.22 * uK * (1.0 - smoothstep(uFogNear, uFogFar, vDepth)); gl_FragColor = vec4(vec3(0.72, 0.78, 0.86), a); }`,
      }));
      kit.steam.frustumCulled = false; kit.steam.renderOrder = 6; kit.steam.name = "steam";
      kit.steam.visible = !calm && GFX.extras !== false;
      s.add(kit.steam); kit.meshes.push(kit.steam);
    }
  }
  // ---- an electric arc now and then on a near cell
  kit.arc = cellArc(); kit.arc.name = "arc"; s.add(kit.arc); kit.meshes.push(kit.arc);
  kit.arcT = 0;
  // ---- a computer's searchlights and beacons (one draw, moved by its shader; left out of the floor's reflection)
  kit.patrol = dress && dress.patrol;
  if (kit.patrol) { kit.patrol.visible = GFX.extras !== false; s.add(kit.patrol); kit.meshes.push(kit.patrol); }
  box.dispose(); plane.dispose(); torus.dispose(); dome.dispose(); bolt.dispose();
  // ---- each frame: the lights follow the hall's power (and INSERT COIN's surge); the near cells' small parts drawn
  // (the cells stand in order down the hall: the near ones are a run of them, one range of the one geometry); the
  // cameras pan; now and then an arc strikes a near cell (its glass flickers with it)
  const A = new THREE.Vector3(), B = new THREE.Vector3();
  kit.update = (hall, dt, cam) => {
    const k = (0.45 + 0.55 * hall.power) * (1 + (hall.endLamp.boost || 0) * 0.8);
    for (const m of [kit.glowMat, kit.screens.material, kit.laser.material, kit.camLamp.material]) m.uniforms.uK.value = k;
    if (kit.steam) { kit.steam.material.uniforms.uK.value = k; kit.steam.visible = !calm && GFX.extras !== false; } // (AUTO may take the tier down while the title is up)
    if (kit.patrol) { kit.patrol.material.uniforms.uK.value = k; kit.patrol.visible = GFX.extras !== false; }
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
