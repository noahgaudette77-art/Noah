// Models the player supplied (.glb), converted by scripts/convert-model.js and inlined
// by the build as window.INR_ASSETS.<name> = { mesh, albedo }.

// The mesh, decoded: every part of the model as plain arrays (positions, normals and
// UVs as floats, its triangles as 16-bit indices), in the model's own units. A model
// whose colours are on its vertices (the frog) has col (linear RGB) and no uv.
function inrModelParts(b64) {
  const raw = atob(b64), buf = new ArrayBuffer(raw.length), u8 = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) u8[i] = raw.charCodeAt(i);
  const hl = new DataView(buf).getUint32(4, true), base = 8 + hl;
  let json = "";
  for (let i = 0; i < hl; i++) json += String.fromCharCode(u8[8 + i]);
  return JSON.parse(json).parts.map((p) => {
    const qp = new Uint16Array(buf, base + p.p, p.v * 3), qn = new Int8Array(buf, base + p.n, p.v * 4);
    const qt = p.t === undefined ? null : new Uint16Array(buf, base + p.t, p.v * 2), qc = p.c === undefined ? null : new Uint8Array(buf, base + p.c, p.v * 4);
    const pos = new Float32Array(p.v * 3), nor = new Float32Array(p.v * 3), uv = qt && new Float32Array(p.v * 2), col = qc && new Float32Array(p.v * 3);
    for (let i = 0; i < p.v; i++) {
      for (let k = 0; k < 3; k++) {
        pos[i * 3 + k] = p.min[k] + (qp[i * 3 + k] / 65535) * (p.max[k] - p.min[k]);
        nor[i * 3 + k] = qn[i * 4 + k] / 127;
        if (col) col[i * 3 + k] = Math.pow(qc[i * 4 + k] / 255, 2.2); // (stored as sRGB bytes)
      }
      if (uv) { uv[i * 2] = qt[i * 2] / 65535; uv[i * 2 + 1] = qt[i * 2 + 1] / 65535; }
    }
    return { id: p.id, pos, nor, uv, col, ix: new Uint16Array(buf, base + p.x, p.i) };
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
