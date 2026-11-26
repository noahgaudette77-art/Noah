// FINAL EXAM — a mock exam across every chapter, weighted by chapter size.
// No feedback until you submit; then every miss is reviewed with its page.
function buildExam(n) {
  const chs = CHAPTERS.filter((c) => c.qids.length);
  const total = chs.reduce((s, c) => s + c.qids.length, 0);
  n = Math.min(n, total);
  const alloc = chs.map((c) => {
    const exact = (n * c.qids.length) / total;
    return { c, k: Math.floor(exact), r: exact - Math.floor(exact) };
  });
  let left = n - alloc.reduce((s, a) => s + a.k, 0);
  alloc.slice().sort((a, b) => b.r - a.r).forEach((a) => { if (left > 0) { a.k++; left--; } });
  const ids = alloc.flatMap((a) => shuffle(a.c.qids).slice(0, a.k));
  return shuffle(ids).map((id) => new Round(Q_BY_ID.get(id)));
}

// ---- the hall ----------------------------------------------------------------------
// The floor is y = 0. A gold cup turns slowly on a black-and-gold plinth under a warm
// spotlight, in a dark exam hall: tall arched windows full of stars, moonlight slanting
// through them, a colonnade, and a polished floor that mirrors it all. Calm by design:
// nothing flashes or hurries behind the questions.
const EXAM_WALL_Z = -20;
const EXAM_LOOK_Y = 0.5 + 9 * 0.83; // where the camera looks: the boss's jaw (its dais plus 83% of its height)
const EXAM_WINDOWS = [-32, -24, -16, -8, 0, 8, 16, 24, 32];

// makeEnvMap, but keeping the PMREM render target: disposing only its texture frees
// nothing in r128, so dispose() releases the whole target.
function examEnvMap(o) {
  if (!GFX.ok) return null;
  return GFX.keepEnv(() => examEnvMapScene(o)); // (kept: drawn again after a lost graphics context, into the same target)
}
function examEnvMapScene({ top, horizon, bottom, glow, panels }) {
  const sc = new THREE.Scene();
  sc.add(makeSky({ top, mid: top, horizon, bottom, stars: 0, glow, radius: 60 }));
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ color: neon(p.color, p.k), side: THREE.DoubleSide }));
    m.position.set(p.pos[0], p.pos[1], p.pos[2]);
    m.lookAt(0, 0, 0);
    sc.add(m);
  }
  const rt = GFX.pmrem().fromScene(sc, 0.02, 0.1, 100);
  disposeTree(sc);
  return rt;
}

// A lathe about y from [radius, y] pairs listed bottom to top (that winding faces
// outward); a third value `true` doubles the point so the edge there stays crisp.
function examLathe(pts, segs = 64) {
  const v = [];
  pts.forEach(([r, y, crisp]) => {
    v.push(new THREE.Vector2(r, y));
    if (crisp) v.push(new THREE.Vector2(r, y));
  });
  return new THREE.LatheGeometry(v, segs);
}

// Merge geometries (position + normal) into one, for a single draw call.
const examMerge = (geos) => mergeIndexed(geos);

// The back wall: one shape with a row of arched window openings.
function examWallGeometry(w, sill, spring) {
  const shape = new THREE.Shape();
  shape.moveTo(-80, 0);
  shape.lineTo(80, 0);
  shape.lineTo(80, 44);
  shape.lineTo(-80, 44);
  shape.lineTo(-80, 0);
  for (const x of EXAM_WINDOWS) {
    const h = new THREE.Path();
    h.moveTo(x - w / 2, sill);
    h.lineTo(x + w / 2, sill);
    h.lineTo(x + w / 2, spring);
    h.absarc(x, spring, w / 2, 0, Math.PI, false);
    h.lineTo(x - w / 2, sill);
    shape.holes.push(h);
  }
  return new THREE.ShapeGeometry(shape, 14);
}

// Neon outlines for the windows, with fainter mullions and transoms.
function examWindowLines(w, sill, spring) {
  const pos = [], col = [];
  const frame = neon(0x9a6bff, 1.5), bar = neon(0x7a5cff, 0.45);
  const seg = (x0, y0, x1, y1, c) => { pos.push(x0, y0, 0, x1, y1, 0); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
  for (const x of EXAM_WINDOWS) {
    const l = x - w / 2, r = x + w / 2;
    seg(l, sill, r, sill, frame);
    seg(r, sill, r, spring, frame);
    seg(l, sill, l, spring, frame);
    let px = r, py = spring;
    for (let i = 1; i <= 16; i++) {
      const a = (i / 16) * Math.PI, nx = x + Math.cos(a) * (w / 2), ny = spring + Math.sin(a) * (w / 2);
      seg(px, py, nx, ny, frame);
      px = nx; py = ny;
    }
    seg(x, sill, x, spring + w / 2, bar);
    seg(l, spring, r, spring, bar);
    seg(l, (sill + spring) / 2, r, (sill + spring) / 2, bar);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true }));
}

// ---- the hall's stone (the master overhaul, Phase 2, 2026-11-23) ------------------------------------------------
// The colonnade was twelve-sided flat violet posts and the wall one flat violet plane: the hall read as a violet haze
// round a dark figure. Its stone now is marble (ambientCG Marble012, CC0: assets/ui/mat-marble.webp, the stone's
// light and its veins as a grey picture, high where the stone is light; a level grey until it arrives), polished,
// mirroring the hall (ExamGame.probeTaken), its columns fluted, steel at their feet and capitals, and lit by their own
// violet neon: four tubes up each shaft and a ring at its foot and its neck. The wall is laid in courses, its windows
// set in mouldings that the moon lights from outside, an upper storey of blind arches over a cornice with its own neon,
// the columns' light washing up it from the floor, and the dark taking it above.
const EXAM_COL_TOP = 14.6;
// A column turned on a lathe, its texture's u round it (two repeats) and its v up it (a repeat every 1.9 units).
function examColumnGeometry() {
  const g = examLathe([[1.02, 0], [1.02, 0.42, true], [0.92, 0.5], [0.86, 0.64], [0.8, 0.72, true], [0.68, 0.78], [0.66, 0.9, true], [0.62, 1.0], [0.6, 7.0], [0.57, 13.38, true],
    [0.63, 13.43], [0.63, 13.56, true], [0.58, 13.62, true], [0.72, 13.86], [0.9, 14.12, true], [1.02, 14.14, true], [1.02, EXAM_COL_TOP, true], [0, EXAM_COL_TOP]], 32);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, uv.getX(i) * 2, p.getY(i) / 1.9);
  return g;
}
function examColumnMaterial(marble, env) {
  const m = new THREE.MeshStandardMaterial({ map: marble, metalness: 0, roughness: 0.2, envMap: env, envMapIntensity: 1 });
  m.userData.neon = { value: neon(0x9a52ff, 1.7) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uColNeon = m.userData.neon;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vColP;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>
        vColP = position;
        #ifdef USE_INSTANCING
        vUv += fract(instanceMatrix[3].xz * vec2(0.137, 0.311)) * vec2(2.0, 3.0); // (each column cut from its own part of the stone)
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vColP; uniform vec3 uColNeon;")
      .replace("#include <map_fragment>", `#include <map_fragment>
        float colV = texelColor.b, colY = vColP.y, colR = length(vColP.xz);
        float colShaft = smoothstep(0.9, 1.0, colY) * (1.0 - smoothstep(13.36, 13.42, colY));
        // marble on the shaft (a pale stone with dark veins), dark steel at its foot and its capital
        diffuseColor.rgb = mix(vec3(0.17, 0.17, 0.2), mix(vec3(0.035, 0.032, 0.045), vec3(0.24, 0.235, 0.27), colV), colShaft);
        // the neon: four tubes up the shaft (at 45 degrees either side of the front and back) and a ring at its foot and its neck
        float colA = atan(vColP.z, vColP.x), colPx = length(fwidth(vColP)) + 1e-4;
        float colD = abs(fract((colA - 0.7854) / 1.5708 + 0.5) - 0.5) * 1.5708 * colR;
        float colTube = (1.0 - smoothstep(0.022, 0.022 + colPx * 1.5, colD)) * colShaft;
        float colRing = (1.0 - smoothstep(0.03, 0.03 + colPx * 1.5, abs(colY - 0.95))) + (1.0 - smoothstep(0.03, 0.03 + colPx * 1.5, abs(colY - 13.5)));
        float colGlow = exp(-colD * 9.0) * colShaft * 0.5 + exp(-abs(colY - 0.95) * 4.0) * 0.6 + exp(-abs(colY - 13.5) * 4.0) * 0.6;`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.32, 0.14 + 0.16 * (1.0 - colV), colShaft);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(0.85, 0.0, colShaft);")
      // (the examiner's lamps are aimed at the examiner: on the colonnade they fall faint, and its own neon and the hall
      // it mirrors light it, so it stands back behind the figure)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\nreflectedLight.directDiffuse *= 0.4; reflectedLight.directSpecular *= 0.6;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        if (colShaft > 0.0) { // its flutes: twenty channels round the shaft, each tilting the light across it (none finer than a few pixels)
          float flw = 20.0 * colPx / max(colR, 0.1); // (how far round a channel a pixel goes: from the position, smooth where the angle wraps)
          vec3 tng = normalize((viewMatrix * vec4(-vColP.z, 0.0, vColP.x, 0.0)).xyz);
          normal = normalize(normal + tng * sin(colA * 20.0) * 0.3 * colShaft * (1.0 - smoothstep(1.6, 3.2, flw)));
        }`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance += uColNeon * (max(colTube, colRing) + colGlow * diffuseColor.rgb * 0.6);`);
  };
  m.customProgramCacheKey = () => "exam-column-1";
  return m;
}
// The back wall's stone, painted with its light (unlit: one look-up a pixel).
function examWallMaterial(marble) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(fogUniforms(), { tMarble: { value: marble }, uWash: { value: neon(0x7a52ff, 1) }, uMoon: { value: neon(0x8fb4ff, 1) }, uNeon: { value: neon(0xa65fff, 2.0) } }),
    extensions: { derivatives: true, shaderTextureLOD: true },
    vertexShader: "varying vec3 vWorld; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS}
      uniform sampler2D tMarble; uniform vec3 uWash; uniform vec3 uMoon; uniform vec3 uNeon; varying vec3 vWorld; varying float vDepth;
      // (each block of stone is its own part of the marble: looked up with the slope of the wall itself, so the jump
      // from one block's part to the next is not filtered to a line of blur along every joint)
      float stone(vec2 uv, vec2 s){
        #ifdef TEXTURE_LOD_EXT
        return texture2DGradEXT(tMarble, uv, dFdx(s), dFdy(s)).b;
        #else
        return texture2D(tMarble, uv).b;
        #endif
      }
      // distance outside an arched opening: half-width w, from y0 to its springing y1, a half disc above (negative inside)
      float arch(vec2 p, float w, float y0, float y1){ return p.y > y1 ? length(vec2(p.x, p.y - y1)) - w : max(abs(p.x) - w, y0 - p.y); }
      void main(){
        vec2 p = vWorld.xy;
        float px = max(fwidth(p.x), fwidth(p.y)) + 1e-4, fine = 1.0 - smoothstep(0.03, 0.09, px);
        // courses of stone, each block its own part of the marble, the joints a little darker
        float row = floor(p.y / 1.15);
        vec2 q = vec2(p.x / 2.3 + 0.5 * mod(row, 2.0), p.y / 1.15), f = fract(q), dd = min(f, 1.0 - f) * vec2(2.3, 1.15);
        float joint = (1.0 - smoothstep(0.025 - px, 0.025 + px, min(dd.x, dd.y))) * fine;
        float st = stone(p * 0.11 + floor(q) * vec2(0.37, 0.61), p * 0.11);
        vec3 col = vec3(0.055, 0.036, 0.12) * (0.72 + 0.45 * st) * (1.0 - 0.5 * joint);
        // the windows: each in a moulding (a band of lighter stone round its opening, its inner edge lit by the moon),
        // the moon's light spilling on the wall round it; the upper storey's blind arches, recessed and dark
        float wx = p.x - clamp(floor(p.x / 8.0 + 0.5), -4.0, 4.0) * 8.0;
        float dw = arch(vec2(wx, p.y), 1.7, 2.2, 10.2);
        float band = (1.0 - smoothstep(0.32, 0.32 + px, dw)) * smoothstep(0.0, px, dw);
        col = mix(col, vec3(0.1, 0.075, 0.2) * (0.85 + 0.3 * st), band);
        col += uMoon * (0.5 * (1.0 - smoothstep(0.0, 0.07 + px, dw)) * smoothstep(0.0, px, dw) + 0.05 * exp(-dw * 1.6));
        float db = arch(vec2(wx, p.y), 2.0, 15.4, 22.0);
        col *= 1.0 - 0.55 * (1.0 - smoothstep(-0.1, 0.0, db));
        col += uMoon * 0.12 * (1.0 - smoothstep(0.0, 0.05 + px, abs(db))) * fine;
        // the cornice: a ledge of lighter stone and a strip of the hall's neon along it
        col = mix(col, vec3(0.11, 0.08, 0.21), smoothstep(12.5, 12.5 + px, p.y) * (1.0 - smoothstep(13.4, 13.4 + px, p.y)));
        col += uNeon * (1.0 - smoothstep(0.035, 0.035 + px * 1.5, abs(p.y - 12.95))) + uNeon * 0.04 * exp(-abs(p.y - 12.95) * 2.0);
        // the columns' light washing up the wall from the floor, between the windows
        float cx = mod(p.x - 4.0, 8.0) - 4.0;
        col += uWash * exp(-pow(abs(cx / (0.9 + 0.09 * p.y)), 2.0)) * exp(-p.y * 0.13) * 0.42;
        // and the dark taking the wall above
        col *= mix(1.0, 0.3, smoothstep(13.5, 34.0, p.y));
        gl_FragColor = vec4(mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}

// The night outside the windows: a violet horizon, twinkling stars and a soft moon,
// placed so it shows through the window to the right of the cup (and in the floor).
function examNightMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMoon: { value: new THREE.Vector3(10.8, 7.6, 1.3) } },
    vertexShader: "varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `${GLSL_NOISE}
      uniform float uTime; uniform vec3 uMoon; varying vec3 vWorld;
      void main(){
        float h = clamp(vWorld.y / 36.0, 0.0, 1.0);
        vec3 col = mix(vec3(0.07, 0.035, 0.17), vec3(0.01, 0.008, 0.035), smoothstep(0.0, 0.6, h));
        col += vec3(0.22, 0.1, 0.36) * exp(-vWorld.y * 0.3) * 0.35;
        // an aurora: slow curtains of green shading to violet (it never flickers)
        float au = sin(vWorld.x * 0.07 + uTime * 0.04 + 1.6 * sin(vWorld.y * 0.16 - uTime * 0.03));
        float curtain = smoothstep(0.3, 1.0, au) * smoothstep(4.0, 8.0, vWorld.y) * (1.0 - smoothstep(10.0, 17.0, vWorld.y));
        col += mix(vec3(0.07, 0.42, 0.36), vec3(0.34, 0.16, 0.62), smoothstep(7.0, 14.0, vWorld.y)) * curtain * (0.3 + 0.12 * sin(vWorld.x * 0.9 + uTime * 0.2));
        vec2 p = vWorld.xy * 1.35; vec2 c = floor(p); float r = hash13(vec3(c, 7.0));
        if (r > 0.93) {
          float s = (1.0 - smoothstep(0.0, 0.32, length(fract(p) - 0.5)));
          float tw = 0.65 + 0.35 * sin(uTime * (0.5 + r * 1.5) + r * 60.0);
          col += vec3(0.9, 0.86, 1.0) * s * tw * (r > 0.992 ? 2.6 : 0.9);
        }
        float d = length(vWorld.xy - uMoon.xy);
        col += vec3(0.95, 0.93, 1.0) * smoothstep(uMoon.z, uMoon.z - 0.06, d) * 1.2;
        col += vec3(0.55, 0.5, 0.9) * exp(-max(d - uMoon.z, 0.0) * 0.45) * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

// A still shaft of light (like makeLightCone, without the flicker).
// A halo of runes for the hall's centrepiece: a ring of marks (made up here, stroke by stroke on a small
// lattice: no alphabet, no meaning), a ring of ticks that turns the other way, and a faint disc of light
// behind them. It turns slowly and steadily, whatever is answered.
function examHalo() {
  const S = 1024, R = S / 2;
  const ring = (draw) => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    x.translate(R, R);
    x.lineCap = "round"; x.lineJoin = "round";
    draw(x);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  };
  let seed = 90210;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const runes = ring((x) => {
    x.strokeStyle = "rgba(255, 226, 170, 0.95)"; x.fillStyle = "rgba(255, 226, 170, 0.95)";
    x.shadowColor = "rgba(190, 130, 255, 0.9)"; x.shadowBlur = 10;
    x.lineWidth = 5;
    x.beginPath(); x.arc(0, 0, R * 0.93, 0, 6.2832); x.stroke();
    x.beginPath(); x.arc(0, 0, R * 0.69, 0, 6.2832); x.stroke();
    x.lineWidth = 2;
    x.beginPath(); x.arc(0, 0, R * 0.905, 0, 6.2832); x.stroke();
    const N = 22;
    for (let i = 0; i < N; i++) {
      x.save();
      x.rotate((i / N) * 6.2832);
      x.translate(0, -R * 0.815);
      // a mark: two or three arcs hung on the points of a small lattice, a dot or two, sometimes a short bar
      // under it (curves and dots only: straight strokes kept coming out as letters)
      const u = 17, pt = () => [(Math.floor(rnd() * 3) - 1) * u, (Math.floor(rnd() * 3) - 1) * u];
      x.lineWidth = 5.6;
      for (let k = 0, n = 2 + Math.floor(rnd() * 2); k < n; k++) {
        const c = pt(), rad = u * (rnd() < 0.5 ? 0.5 : 1), a0 = Math.floor(rnd() * 4) * 1.5708, sw = (1 + Math.floor(rnd() * 3)) * 1.5708;
        x.beginPath(); x.arc(c[0], c[1], rad, a0, a0 + sw); x.stroke();
      }
      for (let k = 0, n = 1 + Math.floor(rnd() * 2); k < n; k++) { const d = pt(); x.beginPath(); x.arc(d[0] + (rnd() - 0.5) * 7, d[1] + (rnd() - 0.5) * 7, 2.8, 0, 6.2832); x.fill(); }
      if (rnd() < 0.4) { const t = (Math.floor(rnd() * 3) - 1) * u; x.beginPath(); x.moveTo(t - 6, u * 1.9); x.lineTo(t + 6, u * 1.9); x.stroke(); }
      x.restore();
      // a small diamond between marks
      x.save(); x.rotate(((i + 0.5) / N) * 6.2832); x.translate(0, -R * 0.815); x.rotate(0.7854); x.fillRect(-2.6, -2.6, 5.2, 5.2); x.restore();
    }
  });
  const ticks = ring((x) => {
    x.strokeStyle = "rgba(200, 160, 255, 0.95)";
    x.shadowColor = "rgba(160, 110, 255, 0.9)"; x.shadowBlur = 8;
    x.lineWidth = 1.6;
    x.beginPath(); x.arc(0, 0, R * 0.985, 0, 6.2832); x.stroke();
    for (let i = 0; i < 144; i++) {
      const a = (i / 144) * 6.2832, long = i % 12 === 0, r0 = R * (long ? 0.945 : 0.965), r1 = R * 0.985;
      x.lineWidth = long ? 3 : 1.6;
      x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); x.stroke();
    }
    x.lineWidth = 1.4;
    x.setLineDash([26, 14]);
    x.beginPath(); x.arc(0, 0, R * 0.64, 0, 6.2832); x.stroke();
  });
  const g = new THREE.Group(), D = 6.5; // (sized so the whole ring is inside the window on a phone: it reads as a halo, not as two arcs)
  // (the marks write depth, where they are drawn at all, so the lens focuses them where they hang and not on the wall behind)
  const plane = (map, color, size, solid = true) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: solid, alphaTest: solid ? 0.02 : 0, fog: false }));
    m.layers.set(1);
    g.add(m);
    return m;
  };
  g.userData.glow = plane(glowTexture(), neon(0x7a4cff, 1), D * 1.5, false);
  g.userData.glow.position.z = -0.2;
  g.userData.runes = plane(runes, neon(0xffe2b0, 2.1), D);
  g.userData.ticks = plane(ticks, neon(0xb48cff, 1.9), D * 1.12);
  g.userData.ticks.position.z = -0.1;
  // a ring of dust rides the halo: motes of light on its circle, each a little off it, turning slowly with the marks
  const n = 180, dp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.2832 + rnd() * 0.05, r = D * (0.4 + rnd() * 0.1);
    dp[i * 3] = Math.cos(a) * r; dp[i * 3 + 1] = Math.sin(a) * r; dp[i * 3 + 2] = (rnd() - 0.5) * 0.6;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.13, map: glowTexture(), color: neon(0xffe2b0, 1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  dust.layers.set(1);
  dust.frustumCulled = false;
  g.add(dust);
  g.userData.dust = dust;
  return g;
}

function examBeam({ color, top, bottom, height, intensity }) {
  const geo = new THREE.CylinderGeometry(top, bottom, height, 28, 1, true);
  geo.translate(0, -height / 2, 0);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { uColor: { value: neon(color, 1) }, uI: { value: intensity }, uH: { value: height } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `uniform float uH; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ vH = 1.0 + position.y / uH; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uI; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){
        float face = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float fall = pow(clamp(vH, 0.0, 1.0), 1.2) * smoothstep(0.0, 0.25, vH);
        gl_FragColor = vec4(uColor * (uI * face * fall), 1.0);
      }`,
  }));
  m.renderOrder = 5;
  return m;
}

class ExamGame extends QuizGame {
  constructor(sel) {
    super(sel, "exam", { fov: 55, fog: [0x06021a, 14, 74], bg: 0x06021a }); // the hall falls away into the dark behind the boss
    this.rounds = buildExam(ExamPrefs.len);
    this.answers = new Array(this.rounds.length).fill(-1);
    this.flags = new Array(this.rounds.length).fill(false);
    this.i = 0;
    this.limit = ExamPrefs.timed ? this.rounds.length * 90 : 0;
    this.elapsed = 0;
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game scr-exam">
      <div class="hud">
        <span class="tag" style="--c:${COLORS.violet}" data-pos>Q 1/${this.rounds.length}</span>
        <div class="grow"></div>
        <span class="tag" style="--c:${COLORS.yellow}" data-clock></span>
        <button class="iconbtn" data-act="grid" aria-label="All questions">${icon("grid")}</button>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <div class="timer"><i></i></div>
      <div class="qpanel"></div>
      <div class="band"></div>
      <div class="answers"></div>
      <div class="exam-nav">
        <button class="btn ghost" data-act="prev">${icon("left")} PREV</button>
        <button class="btn ghost" data-act="flag" style="--c:${COLORS.orange}">${icon("flag")}</button>
        <button class="btn" data-act="nextq" style="--c:${COLORS.violet}" data-nextbtn>NEXT ${icon("right")}</button>
      </div>
    </section>`);
    if (!this.limit) $(".timer", this.el).style.visibility = "hidden";
  }
  build3D() {
    const s = this.scene;
    // The lower half is warm: the cup's flaring bowl mirrors the spot-lit floor.
    this.envRT = examEnvMap(BossModel.ok() ? {
      top: 0x0a0624, horizon: 0x4a2a9a, bottom: 0x090618, glow: 0.5,
      panels: [
        { color: 0xe6e9ff, k: 2.0, w: 10, h: 4, pos: [0, 24, 10] }, // the lamp over it
        { color: 0x8f86c8, k: 0.6, w: 34, h: 7, pos: [0, 5, 30] }, // the dim hall behind the lens
        { color: 0xcfd6ff, k: 1.2, w: 8, h: 14, pos: [-21, 7, 22] }, // the key's side
        { color: 0xffc474, k: 1.0, w: 6, h: 14, pos: [24, 7, -8] }, // gold from behind on the far side: an edge, not a wash
        { color: 0xa65fff, k: 1.4, w: 6, h: 24, pos: [-30, 4, 4] },
        { color: 0xb8c4ff, k: 1.2, w: 3, h: 10, pos: [-8, 7, -30] }, // the windows behind
        { color: 0xb8c4ff, k: 1.2, w: 3, h: 10, pos: [8, 7, -30] },
      ],
    } : {
      top: 0x0a0624, horizon: 0x5a2fb0, bottom: 0x3a2412, glow: 0.6,
      panels: [
        { color: 0xfff0d8, k: 2.6, w: 10, h: 4, pos: [0, 24, 10] }, // the spotlight's lamp
        { color: 0xffe2b8, k: 1.5, w: 34, h: 7, pos: [0, 5, 30] }, // warm light behind the camera: the face of the cup
        { color: 0xffd090, k: 1.4, w: 8, h: 14, pos: [-21, 6, 22] }, // warm fills, front left and right: its flanks
        { color: 0xffd090, k: 1.0, w: 8, h: 14, pos: [23, 6, 18] },
        { color: 0xa65fff, k: 1.6, w: 6, h: 24, pos: [-30, 4, 4] },
        { color: 0x35efff, k: 1.0, w: 6, h: 24, pos: [30, 4, -2] },
        { color: 0xb8c4ff, k: 1.2, w: 3, h: 10, pos: [-8, 7, -30] }, // the windows behind
        { color: 0xb8c4ff, k: 1.2, w: 3, h: 10, pos: [8, 7, -30] },
        { color: 0xffc070, k: 1.1, w: 34, h: 12, pos: [0, -12, 26] },
      ],
    });
    const env = this.envRT ? this.envRT.texture : null;
    // What the examiner's armour reflects (the master overhaul, Phase 2, 2026-11-23: in the hall's pair, ice blue and
    // violet, and lit as its key and rims are; served, it mirrored the moonlit sky, and its plates facing the lens
    // mirrored the dark): the key's broad lamp high in front on its left, a long ice-blue lamp behind it on its right
    // and a violet one on its left (its rims), the hall's violet behind, a faint band of the hall's far lights in front
    // (what its chest has to mirror) and the floor under it.
    this.bossEnvRT = examEnvMap({
      top: 0x06051a, horizon: 0x1c1648, bottom: 0x0a0818, glow: 0.3,
      panels: [
        { color: 0xe8eeff, k: 2.6, w: 18, h: 9, pos: [-9, 17, 18] },
        { color: 0x8fb4ff, k: 2.0, w: 6, h: 26, pos: [27, 9, -10] },
        { color: 0xa65fff, k: 2.0, w: 6, h: 26, pos: [-27, 9, -12] },
        { color: 0x6c58d8, k: 0.6, w: 40, h: 8, pos: [0, 4, -30] },
        { color: 0xb8c8ff, k: 0.7, w: 44, h: 5, pos: [0, 7, 30] },
        { color: 0x8f86c8, k: 0.35, w: 30, h: 8, pos: [0, -14, 14] },
      ],
    });
    const gold = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0xf7c052, metalness: 1, roughness: 0.16, envMap: env, envMapIntensity: 1.5 }), { scale: 1.4, height: 0.0012, scratch: 1.2 });
    const lacquer = surfaceDetail(new THREE.MeshStandardMaterial({ color: 0x0d0a1c, metalness: 0.35, roughness: 0.16, envMap: env, envMapIntensity: 0.9 }), { scale: 1.1, height: 0.0008, grain: 0.5, scratch: 1.4, smudge: 0.55 });

    // Light it to be seen and feared (the master overhaul, Phase 2, 2026-11-23: the art bible's rule, a key and a rim,
    // its face and chest never darker than what is behind them). The budget draws one directional light and four
    // point lights; it drew the two colonnade lamps and the rims, and the lamp over the examiner and its fill never had
    // a place: its face had only a key that grazed it. Now: the moon's cold light from high in front on its left (the
    // hall's key); a lamp in front of its face, a little above it and to its left (its face and chest: it always keeps
    // its place); violet from behind on its left and ice blue from behind on its right (its rims, the hall's pair);
    // and a fill from low in front (its forearms and fists, and its chest from under the answers). The colonnade's
    // own neon lights its columns now. (The boss adds its own: the light under it, which the fire takes over at the
    // end and then outbids the fill; its eyes.)
    s.add(new THREE.HemisphereLight(0x2a3266, 0x1a0c34, 0.62)); // (no light is darker than the hall's deep violet)
    // (Phase 2, 2026-11-24: the key, the light on its face and the low fill lean to the world's ice blue, #8fb4ff: the
    // Proctor read violet on violet, the ice blue only in the windows)
    const key = (this.keyLight = new THREE.DirectionalLight(0xc8d8ff, 1.05));
    key.position.set(-8, 14, 12);
    key.userData.keep = true;
    s.add(key);
    this.spotLight = new THREE.PointLight(0x9fb2ff, 2.5, 34, 1.4); // the key on its face and chest
    this.spotLight.position.set(-BOSS_S * 0.38, BOSS_DAIS + BOSS_S * 1.13, BOSS_S * 1.05);
    this.spotLight.userData.keep = true;
    s.add(this.spotLight);
    this.rimA = new THREE.PointLight(0xa65fff, 2.3, 36, 1.5); // violet, from behind on its left
    this.rimA.position.set(-BOSS_S * 0.95, BOSS_DAIS + BOSS_S * 1.12, -BOSS_S * 0.5);
    s.add(this.rimA);
    this.fillLow = new THREE.PointLight(0x8fb4ff, 1.1, 30, 1.6); // from low in front: its chest and arms keep their shape under the answers
    this.fillLow.position.set(0, BOSS_DAIS + BOSS_S * 0.28, BOSS_S * 1.05);
    s.add(this.fillLow);
    this.rimB = new THREE.PointLight(0x8fb4ff, 2.6, 34, 1.5); // ice blue, from behind on its right
    this.rimB.position.set(BOSS_S, BOSS_DAIS + BOSS_S, -BOSS_S * 0.45);
    s.add(this.rimB);

    // the hall: a starry night through arched windows, pilasters and a colonnade
    const night = (this.night = new THREE.Mesh(new THREE.PlaneGeometry(190, 64), examNightMaterial()));
    night.position.set(0, 26, EXAM_WALL_Z - 12);
    s.add(night);
    // the hall's marble (see examColumnMaterial): a level grey until the picture arrives (takeSurfaces)
    this.marble = cellFlatTexture();
    // a big, dim surface: its light painted on it (one look-up a pixel, no lights reckoned), cheap on phones
    const wall = new THREE.Mesh(examWallGeometry(3.4, 2.2, 10.2), examWallMaterial(this.marble));
    wall.position.z = EXAM_WALL_Z;
    s.add(wall);
    const lines = examWindowLines(3.4, 2.2, 10.2);
    lines.position.z = EXAM_WALL_Z + 0.06;
    lines.layers.set(1);
    s.add(lines);
    const spots = EXAM_WINDOWS.slice(0, -1).map((x) => [x + 4, EXAM_WALL_Z + 0.35]);
    [-1, 1].forEach((sd) => [-14, -8, -2].forEach((z) => spots.push([sd * 11, z])));
    this.colMat = examColumnMaterial(this.marble, env);
    const cols = new THREE.InstancedMesh(examColumnGeometry(), this.colMat, spots.length);
    const m = new THREE.Matrix4();
    spots.forEach(([x, z], i) => cols.setMatrixAt(i, m.makeTranslation(x, 0, z)));
    cols.frustumCulled = false;
    s.add(cols);
    // violet uplights washing the foot of each column
    const up = new Float32Array(spots.length * 3);
    spots.forEach(([x, z], i) => { up[i * 3] = x; up[i * 3 + 1] = 0.25; up[i * 3 + 2] = z + 1.1; });
    const upGeo = new THREE.BufferGeometry();
    upGeo.setAttribute("position", new THREE.BufferAttribute(up, 3));
    const uplights = new THREE.Points(upGeo, new THREE.PointsMaterial({ color: neon(0x8a5cff, 1.0), map: glowTexture(), size: 3.2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    uplights.layers.set(1);
    s.add(uplights);
    // moonlight slanting in through three of the windows
    const dir = new THREE.Vector3(-0.3, -0.62, 0.72).normalize();
    this.moonBeams = [];
    [-8, 8, 16].forEach((x) => {
      const b = examBeam({ color: 0xa8b6ff, top: 1.5, bottom: 3.4, height: 26, intensity: 0.075 });
      b.position.set(x, 7, EXAM_WALL_Z);
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
      b.layers.set(1);
      s.add(b);
      this.moonBeams.push(b);
    });
    // mist at hip height: wide, faint sheets of light lying over the floor, front to back (violet near, the hall's ice
    // blue far: the planes a step cooler as they go back, Phase 2)
    this.mist = [[-9, 1.0, -12, 30, 3.2, 0.07], [8, 0.9, -7, 26, 2.8, 0.06], [-5, 0.8, -2, 24, 2.4, 0.05], [10, 0.9, -15, 30, 3.4, 0.07], [0, 1.1, -18, 44, 4, 0.08]].map(([x, y, z, w, h, o], i) => {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: neon(z > -10 ? 0x6a58d8 : 0x5f7ae6, 1), transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.position.set(x, y, z); m.scale.set(w, h, 1); m.layers.set(1); m.userData = { x, ph: i * 1.7 };
      s.add(m);
      return m;
    });
    this.ambience = new ExamAmbience(this, this.moonBeams); // lanterns past the windows, beams that sway

    // A polished floor of dark marble that gives the hall back (the master overhaul, Phase 2, 2026-11-23: a polar grid
    // on a black plane that reflected nothing on a phone and, on a Mac's ending, drew the whole hall a second time
    // every frame). The hall is drawn once into a cube from in front of the dais (roomProbe: a face a frame, a few
    // frames in; again only if the marble arrives after it: takeSurfaces) and the floor looks it up where each
    // reflected ray meets the hall's box, blurred by the stone's polish; the marble's veins pale in it, its slabs set
    // off by lines of the hall's violet. The examiner and its lectern are left out of the cube (it would mirror
    // itself); the columns take the same capture, filtered for their polish (probeTaken).
    this.probe = roomProbe(new THREE.Vector3(0, 4.5, 7), { size: Assets.phone ? 128 : 256 });
    this.floor = makeNeonFloor({
      size: 300, cell: 4.2, line: 0x9a6bff, lineK: 0.3, base: 0x040211, glow: 0.25, gridAlpha: 0.55, ripple: 0, streak: 0,
      probe: { map: this.probe.map, min: new THREE.Vector3(-36, 0, EXAM_WALL_Z), max: new THREE.Vector3(36, 44, 34), at: this.probe.at, k: 0.95, rough: 0.12 },
      plates: { map: this.marble, size: 4.2, k: 0, tint: new THREE.Color(0.05, 0.045, 0.075) },
    });
    s.add(this.floor);
    this.probeIn = 4;

    // the dais: black lacquer, gold bands, a violet ring of light at its foot
    s.add(new THREE.Mesh(examLathe([[BOSS_DAIS_R + 0.35, 0], [BOSS_DAIS_R + 0.35, 0.14, true], [BOSS_DAIS_R + 0.2, 0.22, true], [BOSS_DAIS_R, 0.22, true], [BOSS_DAIS_R, BOSS_DAIS, true], [0, BOSS_DAIS]], 72), lacquer));
    s.add(new THREE.Mesh(examMerge([
      new THREE.TorusGeometry(BOSS_DAIS_R, 0.045, 10, 96).rotateX(Math.PI / 2).translate(0, BOSS_DAIS, 0),
      new THREE.TorusGeometry(BOSS_DAIS_R + 0.36, 0.05, 10, 96).rotateX(Math.PI / 2).translate(0, 0.14, 0),
    ]), gold));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(BOSS_DAIS_R + 0.75, 0.03, 6, 120).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: neon(0xa65fff, 1.6) }));
    ring.position.y = 0.04;
    s.add(ring);
    // served: the moonlit night through the windows, the examiner's lectern (24d-examgen.js)
    this.gen = examGen(this);
    this.hall = examHall(this); // (served: the fallen bosses' statues behind the dais and the examiner's first desk, seen in the ending: 24e-examhall.js)
    // the final boss (24c-examboss.js): it stands and idles through the exam, whatever is answered (its armour mirrors
    // the lamps of its own rig, served or not: see bossEnvRT)
    try { this.boss = BossModel.ok() ? new ExamBoss(this, this.bossEnvRT ? this.bossEnvRT.texture : env) : null; } catch (e) { this.boss = null; }
    if (!this.boss) {
      // no boss model in this build, or it would not decode: the hall's old centrepiece stands in (24b-examhero.js)
      this.monument = new ExamMonument(this, gold, env);
      this.monument.group.scale.setScalar(1.05);
      this.monument.group.position.y = EXAM_LOOK_Y - 2.5; // afloat in the light, whole in the camera's frame
      s.add(this.monument.group);
    }
    if (this.boss) {
      this.halo = examHalo();
      this.halo.position.set(0, BOSS_DAIS + BOSS_S * 0.93, -BOSS_S * 0.36); // behind its head and shoulders, in front of the shaft of light
      this.haloK = 0;
      s.add(this.halo);
      this.backShade = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x030110, transparent: true, opacity: 0.78, depthWrite: false, fog: false }));
      this.backShade.position.set(0, BOSS_DAIS + BOSS_S * 0.62, -BOSS_S * 0.5);
      this.backShade.scale.set(BOSS_S * 2.3, BOSS_S * 2.3, 1);
      this.backShade.layers.set(1); // (it sorts by depth with the hall's other veils: over the shaft of light behind it, under the halo's ring)
      if (this.gen && this.gen.dome) this.backShade.material.opacity = 0.42; // (served: the moon behind its head shows through)
      s.add(this.backShade);
    }
    // what the hall's cube leaves out: the floor (it never mirrors itself), the examiner, its lectern and the shade
    // behind it (each would mirror itself on the floor, laid on the hall's far walls)
    this.probe.hide = [this.floor, this.boss && this.boss.root, this.boss && this.boss.puffs.mesh, this.backShade, this.gen && this.gen.podium && this.gen.podium.scene].filter(Boolean);
    // the spotlight from above, its pool on the floor, dust turning in it
    // (the shaft of light falls behind it, so it stands out against it instead of in its haze)
    const beam = examBeam({ color: 0xd8ccff, top: 0.7, bottom: 7, height: 22, intensity: 0.1 });
    beam.position.set(0, 22, -BOSS_S * 0.62);
    beam.layers.set(1);
    s.add(beam);
    const pool = makeLightPool({ color: 0xffd9a0, radius: 5.4, intensity: 0.38 });
    pool.layers.set(1);
    s.add(pool);
    this.motes = makeMotes({ count: 70, box: [13, 9, 6], center: [0, BOSS_DAIS + BOSS_S * 0.8, BOSS_S * 0.45], color: 0xff7a3a, size: 0.08, k: 1.5 }); // embers adrift round it
    this.moonMotes = makeMotes({ count: 50, box: [44, 12, 20], center: [0, 6, -8], color: 0xb8c4ff, size: 0.12, k: 0.75 });
    [this.motes, this.moonMotes].forEach((p) => { p.layers.set(1); s.add(p); });

    // a quiet arc of studs round the front of the plinth: one per question
    const n = Math.max(1, this.rounds.length);
    const sp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.PI - 0.2 + ((i + 0.5) / n) * (Math.PI + 0.4);
      sp[i * 3] = Math.cos(a) * (BOSS_DAIS_R + 1.3);
      sp[i * 3 + 1] = 0.06;
      sp[i * 3 + 2] = -Math.sin(a) * (BOSS_DAIS_R + 1.3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    sg.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.studs = new THREE.Points(sg, new THREE.PointsMaterial({ size: clamp(13 / n, 0.16, 0.5), map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.studs.layers.set(1);
    s.add(this.studs);
    // a soft ring that spreads across the floor when an answer is chosen
    this.ripple = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), new THREE.MeshBasicMaterial({ color: neon(0xb48cff, 1.5), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ripple.rotation.x = -Math.PI / 2;
    this.ripple.position.y = 0.05;
    this.ripple.layers.set(1);
    this.ripple.visible = false;
    s.add(this.ripple);
    this.rippleT = 1;

    // a hard, dark picture: less bloom, more contrast, a heavy vignette, sharpened, no colour fringe
    s.userData.lightBudget = { dir: 1, point: 4 }; // (the lights this screen draws: the moon's key; the lamp on the examiner's face, its two rims and one fill. See LightPool in 04-gfx.js)
    s.userData.post = { exposure: 0.97, bloom: 0.55, threshold: 1.2, saturation: GRADE.saturation, contrast: GRADE.contrast, vignette: 1.25, split: 0.2, // (Phase 5: brought to the games' grade: the bronze in the neon world's light, violet in its shadows; a lighter frame of dark)
      sharpen: 0.6, crisp: true, ao: 1, shadow: 0.85, shadowLen: 0.12, sun: [0.1, 1, 0.45], mblur: 0.5, dirt: 0.3, streak: 0.4, // (Phase 2: its steel lit, the lens's streaks off it ran across its chest)
      dof: { focus: 16, near: 400, far: 26, max: 0.007, k: 0.8 } }; // (the lens holds the figure over the exam; the hall behind it falls away)
    this.dist = this.distT = 16;
    this.lookY = EXAM_LOOK_Y;
    this.camBase.set(0, 4.6, this.dist);
    this.lookAt.set(0, this.lookY, 0.5);
  }
  // Frame the boss from below and close. Upright (a phone): its skull and shoulders across the band, the shoulders
  // whole with a little room either side, and what the band has room for of its chest. Landscape (a Mac): the whole
  // figure from its cap to its fists inside the band, above the answers, and the hall either side of it. (Phase 2,
  // 2026-11-23: on a phone its shoulders ran past the screen's edges and it read as a dark mass; on a Mac its fists sat
  // under the answers as dark blobs.)
  onResize(w, h) {
    if (!this.camera || !this.studs) return;
    const bandH = this.band ? this.band.h : h * 0.45;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const c = this._fit || (this._fit = new THREE.PerspectiveCamera()), v = new THREE.Vector3();
    c.fov = this.camera.fov; c.aspect = w / h; c.near = 0.1; c.far = 100; c.updateProjectionMatrix();
    const at = (d) => { c.position.set(0, this.lookY - d * 0.28, d); c.lookAt(0, this.lookY, 0.5); c.updateMatrixWorld(); };
    if (w < h * 1.15 || !this.boss) {
      const tall = (BOSS_S * 0.48 * h) / (2 * tanH * Math.max(110, bandH * 0.9)); // head to mid-chest in the band's height
      const wide = (BOSS_S * 0.86 * h) / (2 * tanH * 0.92 * w); // the shoulders in nine tenths of the screen's width
      this.lookY = EXAM_LOOK_Y;
      this.distT = clamp(Math.max(tall, wide), 7, 40);
    } else {
      // the nearest the lens may stand with the cap's top and the fists' foot (where they stand in its idle pose) both
      // inside the band, the fists clear of the shade the answers stand on, looking a little lower than its jaw
      this.lookY = EXAM_LOOK_Y - 1.3;
      const top = (0.94 * bandH) / h, foot = Math.max(0.2 * bandH, bandH - 64) / h;
      let d = 7;
      for (; d < 40; d += 0.25) { at(d); if (v.set(0, 9.95, 1.0).project(c).y <= top && v.set(4.4, 3.4, 3.6).project(c).y >= -foot) break; }
      this.distT = d;
    }
    // the lectern's top at the band's foot, a little of it showing (once the lens stood back it stood whole in front of
    // the examiner): at rest it stands sunk into the dais as far as that takes, as it sinks for the ending
    const G = this.gen;
    if (G && G.podium && G.top !== undefined) {
      at(this.distT);
      v.set(0, -(bandH * 0.86) / h, 0.5).unproject(c).sub(c.position);
      const y = c.position.y + (v.y * (EXAM_GEN.PODIUM.z - c.position.z)) / v.z;
      G.rest = clamp(G.top - y, 0, EXAM_GEN.PODIUM.s * 0.8);
    }
    if (!this.placed) {
      this.dist = this.distT;
      this.placed = !!this.band;
    }
  }
  pause() {
    super.pause();
    if (this.paused) Sound.dread(false);
  }
  resume() {
    super.resume();
    if (this.boss && this.boss.mode === "idle") Sound.dread(true);
  }
  // The hall's cube (the floor's reflection): a face a frame, once, a few frames in (the screen's lights are made at its
  // first drawing; what the cube sees, the neon, the painted wall and the windows, is its own light, so the examiner's
  // lamps coming up as it wakes change little in it), and again only if the marble arrives after it; and the marble
  // itself as it arrives.
  takeSurfaces() {
    if (this.marble && !this.marbleIn) { const img = Assets.ui("mat-marble"); if (img) { this.marble.image = img; this.marble.needsUpdate = true; this.marbleIn = true; if (this.probe && this.probe.made) this.probe.capture(); } }
    if (!this.probe) return;
    if (this.probeIn > 0 && --this.probeIn === 0) this.probe.capture();
    this.probe.step(this.scene, this.camera.layers.mask);
    this.probeTaken();
  }
  // a capture whole: the columns take it too, filtered for their polish (a cube of their own, made once a capture:
  // what reads it is never drawn into what it reads)
  probeTaken() {
    const P = this.probe;
    if (!P || P.left || P.done === P.made) return;
    P.done = P.made;
    if (this.colMat && GFX.ok) {
      try {
        const pm = GFX.pmrem().fromCubemap(P.map);
        if (this.colEnv) this.colEnv.dispose();
        this.colEnv = pm; this.colMat.envMap = pm.texture;
      } catch (e) { /* the columns keep the hall's own env */ }
    }
  }
  // the floor's reflection drawn whole at once (for a test's stills: the capture tool draws only the frames it keeps,
  // so a face a frame would never be drawn there; the game itself draws every frame. See HallScene.probeNow)
  probeNow() {
    if (!this.probe) return;
    this.takeSurfaces();
    this.probeIn = 0;
    this.probe.capture();
    while (this.probe.left) this.probe.step(this.scene, this.camera.layers.mask);
    this.probeTaken();
  }
  // Free what the scene graph walk misses: the env targets, the hall's cube and its filtered copy, the marble (not
  // only a material's map) and instance buffers.
  dispose() {
    Sound.dread(false);
    Trophies.hold(false);
    if (this.envRT) this.envRT.dispose();
    if (this.bossEnvRT) this.bossEnvRT.dispose();
    if (this.probe) this.probe.dispose();
    if (this.colEnv) this.colEnv.dispose();
    if (this.marble) this.marble.dispose();
    if (this.monument) this.monument.dispose();
    if (this.scene) this.scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); });
    super.dispose();
  }
  // Colour the studs: answered gold, flagged orange, the rest a faint violet.
  paintStuds() {
    if (!this.studs) return;
    const c = this.studs.geometry.attributes.color;
    for (let i = 0; i < this.rounds.length; i++) {
      if (this.flags[i]) c.setXYZ(i, 2.2, 0.8, 0.2);
      else if (this.answers[i] >= 0) c.setXYZ(i, 2.0, 1.35, 0.4);
      else c.setXYZ(i, 0.42, 0.3, 0.8);
    }
    c.needsUpdate = true;
  }
  start() {
    Sound.play("exam"); // (its own recording when served; else the calm tune, as before)
    if (!this.rounds.length) { UI.toast("NO QUESTIONS YET"); return this.quit(); }
    UI.banner(this.boss ? "FINAL BOSS" : "BEGIN", COLORS.violet, this.rounds.length + " QUESTIONS" + (this.limit ? " · " + Math.round(this.limit / 60) + " MIN" : "") + (this.boss ? " · 60% BRINGS IT DOWN" : ""));
    this.state = "ask";
    this.show();
    if (this.boss) this.boss.wake(); // it rises out of the dark
  }
  show() {
    const r = this.rounds[this.i];
    this.round = r;
    this.quiz.show(r, `QUESTION ${this.i + 1} OF ${this.rounds.length}`);
    UI.text($(".qmeta .diff", this.el), this.flags[this.i] ? "FLAGGED" : "");
    this.quiz.select(this.answers[this.i]);
    UI.text($("[data-pos]", this.el), `Q ${this.i + 1}/${this.rounds.length}`);
    const last = this.i === this.rounds.length - 1;
    const nb = $("[data-nextbtn]", this.el);
    nb.dataset.act = last ? "submit" : "nextq";
    nb.innerHTML = last ? `SUBMIT ${icon("check")}` : `NEXT ${icon("right")}`;
    nb.style.setProperty("--c", last ? COLORS.lime : COLORS.violet);
    $("[data-act=prev]", this.el).disabled = this.i === 0;
    $("[data-act=flag]", this.el).classList.toggle("flagged", this.flags[this.i]);
    this.paintStuds();
    this.layoutBand();
  }
  go(d) {
    const j = clamp(this.i + d, 0, this.rounds.length - 1);
    if (j === this.i) return;
    this.i = j;
    Sound.sfx("move");
    this.show();
  }
  pick(i) {
    if (this.state !== "ask" || this.paused) return;
    this.answers[this.i] = i;
    this.quiz.select(i);
    Sound.sfx("blip");
    this.paintStuds();
    if (this.ripple) { this.rippleT = 0; this.ripple.visible = true; }
    if (this.boss) this.boss.notice(); // (it starts at every pick alike: nothing in that says right or wrong)
  }
  on(a, t) {
    if (a === "pause") return this.pause();
    if (a === "ans") return this.pick(+t.dataset.i);
    if (a === "prev") return this.go(-1);
    if (a === "nextq") return this.go(1);
    if (a === "flag") {
      this.flags[this.i] = !this.flags[this.i];
      Sound.sfx("blip");
      return this.show();
    }
    if (a === "grid") return this.palette();
    if (a === "submit") return this.askSubmit();
    if (a === "skipcine" && this.boss) return this.boss.skip();
  }
  key(e) {
    if (this.state === "over") { // the ending is playing: any of these skips to the results
      if (this.boss && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.boss.skip(); }
      return;
    }
    if (e.key === "Escape" || e.key === "p" || e.key === "P") { e.preventDefault(); return this.pause(); } // (P as in the other games: in full screen the browser takes Escape to leave it)
    if (e.key === "ArrowLeft") { e.preventDefault(); return this.go(-1); }
    if (e.key === "ArrowRight" || e.key === "Enter") {
      e.preventDefault();
      return this.i === this.rounds.length - 1 ? this.askSubmit() : this.go(1);
    }
    const i = this.quiz.keyIndex(e);
    if (i >= 0) { e.preventDefault(); this.pick(i); }
  }
  palette() {
    const el = UI.el(`<div class="modal"><div class="dialog" style="--c:${COLORS.cyan}" role="dialog" aria-modal="true" aria-label="All questions">
      <h2>ALL QUESTIONS</h2>
      <p>${this.answers.filter((a) => a >= 0).length} answered · ${this.flags.filter(Boolean).length} flagged</p>
      <div class="pal-key" aria-hidden="true"><span><i class="done"></i>ANSWERED</span><span><i></i>OPEN</span><span><i class="flag"></i>FLAGGED</span><span><i class="here"></i>HERE</span></div>
      <div class="palette">${this.rounds.map((_, i) => `<button data-act="jump" data-i="${i}" class="${[this.answers[i] >= 0 ? "done" : "", this.flags[i] ? "flag" : "", i === this.i ? "here" : ""].join(" ")}">${i + 1}</button>`).join("")}</div>
      <button class="btn" data-act="submit" style="--c:${COLORS.lime}">SUBMIT EXAM</button>
      <button class="btn ghost" data-act="close">BACK TO QUESTION</button></div></div>`);
    UI.openModal({
      el,
      on: (a, t) => {
        if (a === "jump") { UI.closeModal(); this.i = +t.dataset.i; this.show(); }
        if (a === "close") UI.closeModal();
        if (a === "submit") { UI.closeModal(); this.askSubmit(); }
      },
      key: (e) => { if (e.key === "Escape") UI.closeModal(); else UI.arrowNav(e, el, ".palette button, .dialog > .btn", ".palette .here"); },
      // (the question you are on: the legend's HERE swatch comes first in the dialog. Scrolled to only for the keyboard: a
      // phone's grid opens at its top, its title and counts in view, as it always did)
      mounted: () => { const h = $(".palette .here", el); if (h) { h.focus({ preventScroll: true }); if (document.documentElement.dataset.input === "keys") h.scrollIntoView({ block: "nearest" }); } },
    });
  }
  askSubmit() {
    const blank = this.answers.filter((a) => a < 0).length;
    UI.confirm({
      title: "SUBMIT EXAM?",
      text: blank ? `${blank} question${blank === 1 ? " is" : "s are"} unanswered and will be marked wrong.` : "You answered every question.",
      yes: "SUBMIT", no: "KEEP WORKING", color: blank ? COLORS.orange : COLORS.lime, careful: blank > 0,
      onYes: () => this.submit(),
    });
  }
  submit() {
    if (this.state === "over") return;
    this.state = "over";
    if (Assets.on && this.has3D && this.boss) Trophies.hold(true); // (served, Phase 6: a trophy the answers win waits for the ending to be over; ExamBoss.finish lets it go. Only when it is shown changes)
    const by = {};
    let correct = 0;
    const review = [];
    this.rounds.forEach((r, i) => {
      const a = this.answers[i];
      const ok = this.run.record(r, a);
      if (ok) correct++;
      const b = (by[r.q.ch] = by[r.q.ch] || { n: 0, ok: 0 });
      b.n++;
      if (ok) b.ok++;
      if (!ok) review.push({ q: r.q.q, a: r.correctText, x: a >= 0 ? r.text(a) : null, e: r.q.explain, r: `P. ${r.q.page} · STAGE ${r.q.ch} · ${r.q.topic}` });
    });
    const score = pct(correct, this.rounds.length);
    const passed = score >= 60;
    Store.state.stats.exams = (Store.state.stats.exams || 0) + 1;
    Store.state.stats.bestExam = Math.max(Store.state.stats.bestExam || 0, score);
    Store.save();
    const ending = this.has3D && this.boss; // the boss dies (or stands) first; the results follow
    if (!ending || !passed) Sound.sfx(passed ? "win" : "gameover");
    const mins = Math.floor(this.elapsed / 60), secs = Math.floor(this.elapsed % 60);
    const breakdown = Object.keys(by).sort((a, b) => a - b).map((n) => {
      const b = by[n], p = pct(b.ok, b.n);
      return `<div class="mrow"><span>STAGE ${n} · ${esc(CH(+n).title)}</span><b style="color:${p >= 60 ? COLORS.lime : COLORS.red}">${b.ok}/${b.n}</b>
        <span class="meter" style="--c:${p >= 60 ? COLORS.lime : COLORS.red}"><i style="width:${p}%"></i></span></div>`;
    }).join("");
    const results = () => showResults({
      game: "exam", sel: this.sel, run: this.run, score, boardLabel: this.rounds.length + "Q",
      title: passed ? "PASSED" : "NOT YET", color: passed ? COLORS.lime : COLORS.red,
      headline: score + "%", sub: `${correct} of ${this.rounds.length} correct · pass mark 60% · ${mins}:${pad(secs)} used`,
      hideRunTiles: true,
      tiles: [{ k: "SCORE", v: score + "%", c: passed ? COLORS.lime : COLORS.red }, { k: "CORRECT", v: `${correct}/${this.rounds.length}` }, { k: "TIME", v: `${mins}:${pad(secs)}` }],
      extraHTML: `<h2 class="section-h">BY CHAPTER</h2><div class="mastery-list">${breakdown}</div>`,
      reviewTitle: "QUESTIONS TO REVIEW", review,
    });
    // Everything above is the exam itself, unchanged. What follows is only how the
    // result is shown: a pass kills the boss, a fail leaves it standing.
    if (ending) this.boss.finale(passed, score, results);
    else results();
  }
  update(dt) {
    super.update(dt);
    if (this.paused) return;
    if (this.state === "ask") {
      this.elapsed += dt;
      const clock = $("[data-clock]", this.el);
      if (this.limit) {
        const left = Math.max(0, this.limit - this.elapsed);
        UI.text(clock, `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}`);
        this.timerBar(left / this.limit);
        if (left <= 0) { UI.toast("TIME! EXAM SUBMITTED"); this.submit(); }
      } else {
        UI.text(clock, `${Math.floor(this.elapsed / 60)}:${pad(Math.floor(this.elapsed % 60))}`);
      }
    }
    if (!this.has3D) return;
    const t = this.t;
    examGenUpdate(this, dt); // (served: the moonlit sky round the lens; the lectern sinks away for the ending)
    examHallUpdate(this, VFX.dt); // (and the light comes up on the gallery)
    this.dist += (this.distT - this.dist) * Math.min(1, dt * 2.5);
    const B = this.boss;
    if (B) {
      // it grows more menacing as the exam is worked through: how many are answered, never which were right
      let done = 0;
      for (let i = 0; i < this.answers.length; i++) if (this.answers[i] >= 0) done++;
      // (or, on a timed exam, how much of the time is gone, whichever is further along)
      B.dreadTo = this.state === "ask" && this.answers.length ? Math.max(done / this.answers.length, this.limit ? clamp(this.elapsed / this.limit, 0, 1) : 0) : 0;
      B.update(dt, t);
    } else if (this.monument) {
      let done = 0;
      for (let i = 0; i < this.answers.length; i++) if (this.answers[i] >= 0) done++;
      this.monument.update(dt, t, this.answers.length ? done / this.answers.length : 0);
    }
    if (B) {
      this.keyLight.intensity = 1.05 * B.lightK;
      this.spotLight.intensity = 2.5 * B.lightK;
      this.rimA.intensity = 2.3 * B.lightK;
      this.rimB.intensity = 2.6 * B.lightK;
      this.fillLow.intensity = 1.1 * B.lightK;
      // and the dark closes in round it
      if (this.state === "ask") this.scene.userData.post.vignette = 1.25 + 0.3 * B.dread + 0.2 * B.menace;
    }
    this.ambience.update(dt, t);
    if (this.halo) { // the halo turns at one slow pace all exam long; it goes out with the boss
      const slow = REDUCED_MOTION || GFX.calm ? 0.3 : 1, H = this.halo.userData;
      this.haloK += ((B && B.mode !== "die" ? clamp(B.lightK, 0, 1) : 0) - this.haloK) * Math.min(1, dt * 1.2);
      H.runes.rotation.z += dt * 0.03 * slow;
      H.ticks.rotation.z -= dt * 0.018 * slow;
      H.runes.material.opacity = 1.0 * this.haloK * (0.92 + 0.08 * Math.sin(t * 0.6));
      H.ticks.material.opacity = 0.8 * this.haloK;
      H.glow.material.opacity = 0.2 * this.haloK;
      H.dust.rotation.z += dt * 0.045 * slow;
      H.dust.material.opacity = 0.8 * this.haloK * (0.85 + 0.15 * Math.sin(t * 0.9));
    }
    if (this.rippleT < 1) {
      this.rippleT = Math.min(1, this.rippleT + dt / 1.2);
      const k = this.rippleT;
      this.ripple.scale.setScalar(BOSS_DAIS_R + 1 + k * 7);
      this.ripple.material.opacity = 0.9 * (1 - k) * (1 - k);
      this.ripple.visible = k < 1;
    }
    // the current question's stud breathes
    if (this.state === "ask") {
      const c = this.studs.geometry.attributes.color, p = 0.75 + 0.25 * Math.sin(t * 3);
      c.setXYZ(this.i, 2.2 * p, 1.7 * p, 3.0 * p);
      c.needsUpdate = true;
    }
    // from below, close, and closer still as the end nears or it leans in
    const d = this.dist * (1 - (B ? 0.08 * B.dread + 0.05 * B.menace : 0));
    this.camBase.set(Pointer.x * 0.5, this.lookY - d * 0.28 + Math.sin(t * 0.3) * 0.05 - Pointer.y * 0.2, d);
    if (this.scene.userData.post.dof) this.scene.userData.post.dof.focus = Math.max(2, d - 0.4);
    this.lookAt.set(0, this.lookY, 0.5);
    if (B && (B.mode === "die" || B.mode === "rage") && !B.quick) B.camera(dt); // the ending has its own camera
    this.placeCamera();
    this.motes.userData.drift(t);
    this.moonMotes.userData.drift(t);
    FX.sync(this.scene, t);
    this.takeSurfaces();
  }
}
