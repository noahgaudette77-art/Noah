// Models the player supplied (.glb), converted by scripts/convert-model.js and inlined
// by the build as window.INR_ASSETS.<name> = { mesh, albedo }.

// The mesh, decoded: every part of the model as plain arrays (positions, normals and
// UVs as floats, its triangles as 16-bit indices), in the model's own units.
function inrModelParts(b64) {
  const raw = atob(b64), buf = new ArrayBuffer(raw.length), u8 = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
  // (a model that is not one, or was cut short, is refused here: its game falls back to what it had before)
  if (raw.length < 8 || raw.slice(0, 4) !== "INRB") throw new Error("not a model");
  const hl = new DataView(buf).getUint32(4, true), base = 8 + hl;
  if (base > raw.length) throw new Error("model cut short");
  let json = "";
  for (let i = 0; i < hl; i++) json += String.fromCharCode(u8[8 + i]);
  return JSON.parse(json).parts.map((p) => {
    const qp = new Uint16Array(buf, base + p.p, p.v * 3), qn = new Int8Array(buf, base + p.n, p.v * 4), qt = new Uint16Array(buf, base + p.t, p.v * 2);
    const pos = new Float32Array(p.v * 3), nor = new Float32Array(p.v * 3), uv = new Float32Array(p.v * 2);
    for (let i = 0; i < p.v; i++) {
      for (let k = 0; k < 3; k++) { pos[i * 3 + k] = p.min[k] + (qp[i * 3 + k] / 65535) * (p.max[k] - p.min[k]); nor[i * 3 + k] = qn[i * 4 + k] / 127; }
      uv[i * 2] = qt[i * 2] / 65535; uv[i * 2 + 1] = qt[i * 2 + 1] / 65535;
    }
    return { id: p.id, pos, nor, uv, ix: new Uint16Array(buf, base + p.x, p.i) };
  });
}
// Its colour texture (a glTF's UVs start at the top left: no flip).
function inrModelTexture(dataUrl) {
  const img = new Image(), t = new THREE.Texture(img);
  t.flipY = false;
  t.encoding = THREE.sRGBEncoding;
  if (GFX.ok) t.anisotropy = Math.min(8, GFX.renderer.capabilities.getMaxAnisotropy());
  img.onload = () => { t.needsUpdate = true; };
  img.src = dataUrl;
  return t;
}

// ---- the look the supplied models share in the arcade ------------------------------------
// Each model arrives with a painted, weathered colour texture and nothing else. Here it
// wears the arcade's own style instead: gunmetal and matte black, panel lines and wear
// from a tile of fine detail, seams and small lights that carry magenta and cyan, a rim
// of both. The model's texture stays as its light and shade, and as a mask of where its
// paint was.

// The armour tile: drawn once from a fixed seed, 512 px, wrapping both ways.
//   R  height: scratches, pits, shallow dents, grain (mid grey is flat)
//   G  panel lines: 0.5 a groove, 1.0 a seam that carries light
//   B  small lights (bright discs; each one's value sets its colour and its beat) and vent slots (dim bars)
function neonArmourTile() {
  if (neonArmourTile.tex) return neonArmourTile.tex;
  const N = 512;
  let tex;
  try {
    const canvas = () => { const c = document.createElement("canvas"); c.width = c.height = N; return c; };
    let seed = 20261113;
    const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const cr = canvas(), x = cr.getContext("2d");
    const wrap = (draw) => { for (let ox = -N; ox <= N; ox += N) for (let oy = -N; oy <= N; oy += N) { x.save(); x.translate(ox, oy); draw(); x.restore(); } };
    x.fillStyle = "rgb(128,128,128)";
    x.fillRect(0, 0, N, N);
    for (let i = 0; i < 10; i++) { // shallow dents
      const px = r() * N, py = r() * N, rad = 22 + r() * 44, a = 0.16 + r() * 0.2;
      wrap(() => {
        const g = x.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, "rgba(40,40,40," + a + ")"); g.addColorStop(1, "rgba(40,40,40,0)");
        x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, 6.2832); x.fill();
      });
    }
    x.lineCap = "round";
    for (let i = 0; i < 190; i++) { // scratches: most cut in, a few are raised burrs
      const px = r() * N, py = r() * N, ang = r() * 3.1416, len = 8 + r() * r() * 170, bend = (r() - 0.5) * len * 0.12, w = 0.7 + r() * r() * 1.5;
      const col = r() < 0.78 ? "rgba(12,12,12," + (0.3 + r() * 0.55) + ")" : "rgba(245,245,245," + (0.25 + r() * 0.4) + ")";
      const dx = Math.cos(ang), dy = Math.sin(ang);
      wrap(() => {
        x.strokeStyle = col; x.lineWidth = w;
        x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + dx * len * 0.5 - dy * bend, py + dy * len * 0.5 + dx * bend, px + dx * len, py + dy * len); x.stroke();
      });
    }
    for (let i = 0; i < 300; i++) { // pits, each with a bright lip on one side
      const px = r() * N, py = r() * N, rad = 0.7 + r() * r() * 3.4, a = 0.5 + r() * 0.45;
      wrap(() => {
        x.fillStyle = "rgba(240,240,240," + a * 0.5 + ")"; x.beginPath(); x.arc(px + rad * 0.45, py + rad * 0.45, rad, 0, 6.2832); x.fill();
        x.fillStyle = "rgba(6,6,6," + a + ")"; x.beginPath(); x.arc(px, py, rad, 0, 6.2832); x.fill();
      });
    }
    // panels: the tile is cut into rectangles; every cut is a groove, and about one in six carries light
    let rects = [[0, 0, N, N]];
    for (let pass = 0; pass < 5; pass++) {
      const next = [];
      rects.forEach(([x0, y0, w, h]) => {
        if (Math.max(w, h) < 76 || (pass > 1 && r() < 0.22)) return next.push([x0, y0, w, h]);
        if (w >= h) { const s = Math.round(w * (0.34 + 0.32 * r())); next.push([x0, y0, s, h], [x0 + s, y0, w - s, h]); }
        else { const s = Math.round(h * (0.34 + 0.32 * r())); next.push([x0, y0, w, s], [x0, y0 + s, w, h - s]); }
      });
      rects = next;
    }
    const cg = canvas(), g = cg.getContext("2d"), cb = canvas(), b = cb.getContext("2d");
    [g, b].forEach((c) => { c.fillStyle = "#000"; c.fillRect(0, 0, N, N); });
    g.lineWidth = 3.6;
    rects.forEach(([x0, y0, w, h]) => {
      [[x0, y0, x0 + w, y0], [x0, y0, x0, y0 + h]].forEach(([ax, ay, bx, by]) => {
        g.strokeStyle = r() < 0.17 ? "#fff" : "#808080";
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      });
    });
    for (let i = 0; i < 12; i++) { // small lights
      const [x0, y0, w, h] = rects[Math.floor(r() * rects.length)], v = Math.round(110 + r() * 145);
      b.fillStyle = `rgb(${v},${v},${v})`;
      b.beginPath(); b.arc(x0 + 10 + r() * Math.max(1, w - 20), y0 + 10 + r() * Math.max(1, h - 20), 4 + r() * 2, 0, 6.2832); b.fill();
    }
    for (let i = 0; i < 5; i++) { // vent slots
      const [x0, y0, w, h] = rects[Math.floor(r() * rects.length)];
      if (w < 64 || h < 44) continue;
      b.fillStyle = "rgb(58,58,58)";
      for (let k = 0; k < 4; k++) b.fillRect(x0 + 12, y0 + 10 + k * 7, Math.min(w - 24, 48), 3);
    }
    const img = x.getImageData(0, 0, N, N), d = img.data, G = g.getImageData(0, 0, N, N).data, B = b.getImageData(0, 0, N, N).data;
    for (let i = 0; i < d.length; i += 4) { d[i] = clamp(d[i] + (r() - 0.5) * 22, 0, 255); d[i + 1] = G[i]; d[i + 2] = B[i]; } // (and grain on the height)
    x.putImageData(img, 0, 0);
    tex = new THREE.CanvasTexture(cr);
  } catch (e) {
    tex = new THREE.DataTexture(new Uint8Array([128, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
  }
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return (neonArmourTile.tex = tex);
}

// One clock for every seam and small light (each model's update sets it).
const NEON_T = { value: 0 };
// What a material built on this look must carry in its uniforms.
const neonUniforms = () => ({ uNeonTile: { value: neonArmourTile() }, uNeonT: NEON_T });
// The shader side: lay the tile on, read gunmetal out of the texture's light and shade,
// what the seams and lights give off, the two-colour rim, and relief without tangents.
const NEON_GLSL = `
  uniform sampler2D uNeonTile; uniform float uNeonT;
  // the tile, from whichever side the surface faces most (so its lines stay sharp)
  vec3 neonTile(vec3 p, vec3 n){ vec3 a = abs(n); vec2 uv = a.x > a.y && a.x > a.z ? p.zy : (a.y > a.z ? p.xz : p.xy); return texture2D(uNeonTile, uv).rgb; }
  // a height's slope across the pixel tilts the normal
  vec3 neonBump(vec3 pos, vec3 nrm, vec2 dH){ vec3 sx = dFdx(pos), sy = dFdy(pos), r1 = cross(sy, nrm), r2 = cross(nrm, sx); float det = dot(sx, r1); return normalize(abs(det) * nrm - sign(det) * (dH.x * r1 + dH.y * r2)); }
  float neonGroove(vec3 tile){ return smoothstep(0.2, 0.45, tile.g); }
  // gunmetal: the texture's light and shade, worn by the tile, cut by its panel lines and vent slots
  vec3 neonMetal(float lum, vec3 tile){
    float vent = smoothstep(0.12, 0.2, tile.b) * (1.0 - smoothstep(0.3, 0.36, tile.b));
    return mix(vec3(0.017, 0.019, 0.027), vec3(0.2, 0.215, 0.265), lum) * (0.72 + 0.56 * tile.r) * (1.0 - 0.62 * neonGroove(tile)) * (1.0 - 0.8 * vent);
  }
  // the height the tile gives the surface
  float neonHeight(vec3 tile){ return tile.r - 0.9 * neonGroove(tile); }
  // what the tile's seams and small lights give off: the seams in one colour with a slow pulse
  // running along them, the lights in cyan or magenta, each on its own beat (well under 1 Hz)
  vec3 neonGlow(vec3 tile, vec3 p, vec3 seamCol){
    float seam = smoothstep(0.7, 0.92, tile.g), led = smoothstep(0.36, 0.44, tile.b);
    float run = 0.5 + 0.5 * sin(uNeonT * 1.6 - dot(p, vec3(2.1, 3.3, 1.7)));
    vec3 lamp = mix(vec3(0.25, 1.7, 2.0), vec3(2.1, 0.3, 1.4), step(0.72, tile.b)) * (0.35 + 1.65 * pow(0.5 + 0.5 * sin(uNeonT * (0.9 + tile.b * 2.2) + tile.b * 37.0), 4.0));
    return seamCol * seam * (0.8 + 1.5 * run * run) + lamp * led;
  }
  // a rim of the arcade's two colours: magenta from one side, cyan from the other (n and v in view space)
  vec3 neonRim(vec3 n, vec3 v, float power){ float f = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), power); return mix(vec3(1.5, 0.12, 0.95), vec3(0.1, 1.05, 1.5), smoothstep(-0.35, 0.35, n.x)) * f; }
`;

// The same look without the lighting, for the weakest quality levels: the texture's light and
// shade as gunmetal, its old paint as a dim neon, and whatever colour the model keeps for itself
// (keep: 1 leaves what is greener than it is red alone, the frog's skin).
function neonLowMaterial(map, o = {}) {
  return new THREE.ShaderMaterial({
    side: o.side === undefined ? THREE.FrontSide : o.side,
    uniforms: Object.assign(fogUniforms(), {
      map: { value: map }, uTint: o.tint || { value: new THREE.Color(1, 1, 1) }, uAccent: { value: new THREE.Color(o.accent === undefined ? 0x35efff : o.accent) },
      uKeep: { value: o.keep || 0 }, uPaint: { value: o.paint === undefined ? 1 : o.paint }, uBone: { value: o.bone ? 1 : 0 }, uRimK: { value: o.rim === undefined ? 0.5 : o.rim },
    }),
    vertexShader: "varying vec2 vUv; varying float vDepth; varying float vRim; varying float vNx; varying float vLit; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; vec3 n = normalize(normalMatrix * normal); vRim = 1.0 - abs(n.z); vNx = n.x; vLit = 0.62 + 0.38 * n.y; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `${GLSL_FOG_PARS} uniform sampler2D map; uniform vec3 uTint; uniform vec3 uAccent; uniform float uKeep; uniform float uPaint; uniform float uBone; uniform float uRimK; varying vec2 vUv; varying float vDepth; varying float vRim; varying float vNx; varying float vLit;
      void main(){
        vec3 t = texture2D(map, vUv).rgb; t *= t; // (near enough to linear)
        float l = dot(t, vec3(0.3, 0.59, 0.11)), mx = max(t.r, max(t.g, t.b)), mn = min(t.r, min(t.g, t.b));
        float paint = uPaint * smoothstep(0.3, 0.6, (mx - mn) / (mx + 0.02));
        float keep = uKeep * smoothstep(1.02, 1.2, t.g / (t.r + 0.02));
        vec3 c = mix(vec3(0.014, 0.016, 0.024), vec3(0.17, 0.185, 0.24), l) * vLit; // (dark metal, lit from above)
        c = mix(c, uAccent * (0.2 + 0.6 * l), paint * (1.0 - keep));
        c = mix(c, t * 1.3, keep);
        c = mix(c, mix(vec3(0.03, 0.03, 0.04), vec3(0.6, 0.58, 0.56), l) * vLit, uBone); // (pale, where it is bone)
        c += mix(vec3(1.0, 0.12, 0.7), vec3(0.1, 0.8, 1.1), smoothstep(-0.35, 0.35, vNx)) * (vRim * vRim * uRimK);
        gl_FragColor = vec4(mix(c * uTint, uFogColor, smoothstep(uFogNear, uFogFar, vDepth)), 1.0);
      }`,
  });
}
