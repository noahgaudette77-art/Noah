// What a page holds on the graphics chip: every texture, renderbuffer and buffer as it is made, sized, and let go of
// (window.__mem: tex, rb and buf, each a Map from the object to its bytes; label: each texture's first picture, what it
// was made from and the screen up when it was sent). An init script, run in the page before anything else: cost-report
// adds it to every page it measures, and capture.js when GLMEM=1 (the soak's graphics memory, moment by moment).
//
//   await page.addInitScript(require("./glmem"));
//   window.__mem.tex.values(): a number, or { "<target>:<level>": bytes } for a texture's pictures
module.exports = function glMem() {
  const mem = (window.__mem = { tex: new Map(), rb: new Map(), buf: new Map(), label: new Map() });
  // (each texture's first picture: what it was made from, and the screen up when it was sent: see --textures)
  const era = () => { try { const s = window.__arcade && window.__arcade.Scenes.cur; return s ? s.constructor.name : "(start)"; } catch (e) { return "?"; } };
  const what = (a) => {
    if (a.length >= 8) { const px = a[8]; return (px ? "data " : "target ") + a[3] + "x" + a[4]; }
    const src = a[5]; if (!src) return "?";
    const wdt = src.videoWidth || src.naturalWidth || src.width, hgt = src.videoHeight || src.naturalHeight || src.height;
    if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) { const u = src.currentSrc || src.src || ""; return "image " + (u.startsWith("data:") ? "(inline)" : u.startsWith("blob:") ? "(blob)" : u.split("/").pop().split("?")[0].slice(0, 40)) + " " + wdt + "x" + hgt; }
    if (typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement) return "canvas " + wdt + "x" + hgt;
    if (typeof ImageBitmap !== "undefined" && src instanceof ImageBitmap) return "bitmap " + wdt + "x" + hgt;
    return ((src.constructor && src.constructor.name) || "?") + " " + wdt + "x" + hgt;
  };
  const bound = { tex: new Map(), rb: null, buf: new Map() };
  const BPP = { 0x8058: 4, 0x881a: 8, 0x8814: 16, 0x8c43: 4, 0x81a6: 4, 0x8cac: 4, 0x88f0: 4, 0x8229: 1, 0x822b: 2, 0x822d: 2, 0x822f: 4, 0x8051: 3, 0x1908: 4, 0x1907: 3, 0x1902: 4, 0x8d48: 1 }; // (RGBA8, RGBA16F, RGBA32F, SRGB8_A8, DEPTH24, DEPTH32F, D24S8, R8, R16F, RG16F, RG8?, RGB8, RGBA, RGB, DEPTH, STENCIL8)
  const TYPEB = { 0x1401: 1, 0x140b: 2, 0x8d61: 2, 0x1406: 4, 0x1405: 4, 0x84fa: 4, 0x1403: 2 }; // (UNSIGNED_BYTE, HALF_FLOAT, HALF_FLOAT_OES, FLOAT, UNSIGNED_INT, UINT_24_8, UNSIGNED_SHORT)
  const wrap = (P) => {
    const w = (name, fn) => { const o = P[name]; if (!o) return; P[name] = function () { const r = o.apply(this, arguments); try { fn.apply(this, arguments); } catch (e) { /* counting only */ } return r; }; };
    w("bindTexture", function (target, t) { bound.tex.set(target, t); });
    w("bindRenderbuffer", function (target, r) { bound.rb = r; });
    w("bindBuffer", function (target, b) { bound.buf.set(target, b); });
    const texTarget = (target) => (target >= 0x8515 && target <= 0x851a ? 0x8513 : target); // (a cube's faces: its cube)
    const addTex = (target, level, bytes) => { const t = bound.tex.get(texTarget(target)); if (!t) return; const m = mem.tex.get(t) || {}; m[target + ":" + level] = bytes; mem.tex.set(t, m); };
    w("texImage2D", function (target, level, internal) {
      const a = arguments; let wdt, hgt, fmt = a[a.length >= 9 ? 6 : 4], type = a[a.length >= 9 ? 7 : 5];
      if (a.length >= 8) { wdt = a[3]; hgt = a[4]; fmt = a[6]; type = a[7]; } else { const src = a[5]; wdt = src && (src.videoWidth || src.naturalWidth || src.width); hgt = src && (src.videoHeight || src.naturalHeight || src.height); fmt = a[3]; type = a[4]; }
      const bpp = BPP[internal] || (BPP[fmt] && TYPEB[type] ? (BPP[fmt] / 1) * (TYPEB[type] || 1) : 4);
      addTex(target, level, (wdt || 0) * (hgt || 0) * bpp);
      if (level === 0) { const t = bound.tex.get(texTarget(target)); if (t && !mem.label.has(t)) mem.label.set(t, { what: what(a), era: era(), fmt: internal }); }
    });
    w("texStorage2D", function (target, levels, internal, wdt, hgt) { const bpp = BPP[internal] || 4; let b = 0, x = wdt, y = hgt; for (let l = 0; l < levels; l++) { b += x * y * bpp; x = Math.max(1, x >> 1); y = Math.max(1, y >> 1); } addTex(target, "s", b); { const t = bound.tex.get(texTarget(target)); if (t && !mem.label.has(t)) mem.label.set(t, { what: "storage " + wdt + "x" + hgt, era: era(), fmt: internal }); } });
    w("deleteTexture", function (t) { mem.tex.delete(t); mem.label.delete(t); });
    w("renderbufferStorage", function (target, internal, wdt, hgt) { if (bound.rb) mem.rb.set(bound.rb, wdt * hgt * (BPP[internal] || 4)); });
    w("renderbufferStorageMultisample", function (target, samples, internal, wdt, hgt) { if (bound.rb) mem.rb.set(bound.rb, wdt * hgt * (BPP[internal] || 4) * Math.max(1, samples)); });
    w("deleteRenderbuffer", function (r) { mem.rb.delete(r); });
    w("bufferData", function (target, d) { const b = bound.buf.get(target); if (b) mem.buf.set(b, typeof d === "number" ? d : (d && d.byteLength) || 0); });
    w("deleteBuffer", function (b) { mem.buf.delete(b); });
    w("generateMipmap", function (target) { const t = bound.tex.get(target); if (!t) return; const m = mem.tex.get(t); if (m && m[target + ":0"]) m[target + ":mips"] = m[target + ":0"] / 3; });
  };
  if (window.WebGL2RenderingContext) wrap(WebGL2RenderingContext.prototype);
  if (window.WebGLRenderingContext) wrap(WebGLRenderingContext.prototype);
};
