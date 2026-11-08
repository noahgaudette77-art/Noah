// The WebGL layer: one renderer drawn at a low internal resolution and scaled up
// with nearest-neighbour filtering, which gives the chunky early-90s polygon look.
const GFX = {
  renderer: null,
  ok: false,
  hdr: false, // half-float targets: neon can be brighter than white and bloom like light
  pipe: null,
  w: window.innerWidth,
  h: window.innerHeight,
  t: 0,
  dyn: 1, // dynamic-resolution factor (HD look only)
  lite: false, // set when the device struggles: no reflections, lighter bloom
  ab: 0, // colour-fringe pulse
  flashAmt: 0, // white flash pulse
  freeze: 0, // hit-stop seconds remaining
  probe: null, // debug: called after each render pass (see the perf tools)
  init() {
    if (window.THREE) {
      try {
        this.renderer = new THREE.WebGLRenderer({ canvas: $("#gl"), antialias: false, powerPreference: "high-performance", stencil: false });
        this.renderer.setClearColor(0x090320, 1);
        this.ok = true;
      } catch (e) {
        this.ok = false;
      }
    }
    if (!this.ok) {
      document.body.classList.add("no-gl");
      this.resize();
      return;
    }
    const r = this.renderer;
    const ext = (n) => { try { return !!r.extensions.has(n); } catch (e) { return false; } };
    this.hdr = r.capabilities.isWebGL2 ? ext("EXT_color_buffer_float") || ext("EXT_color_buffer_half_float") : ext("OES_texture_half_float") && ext("EXT_color_buffer_half_float");
    this.small = Math.min(screen.width || 9999, screen.height || 9999) < 700 || matchMedia("(pointer: coarse)").matches;
    this.pipe = makePipeline(r, this.hdr);
    this.loadMem();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },
  // HD (default) renders sharp and anti-aliased; RETRO and CHUNKY render low-res pixels.
  get look() {
    const p = Store.settings.pixel;
    return p === "retro" || p === "chunky" ? p : "hd";
  },
  scenePR() {
    const dpr = window.devicePixelRatio || 1;
    const look = this.look;
    if (look === "retro") return clamp(680 / Math.max(this.w, this.h), 0.12, dpr);
    if (look === "chunky") return clamp(380 / Math.max(this.w, this.h), 0.12, dpr);
    const base = Math.min(dpr, this.small ? 1.5 : 2, 1900 / Math.max(this.w, this.h));
    return Math.max(0.35, base * this.dyn);
  },
  outPR() {
    // HD: the final image is drawn at the scene resolution (no upscale blur from post).
    // Retro looks: draw the glass at a finer resolution so scanlines stay crisp.
    return this.look === "hd" ? this.scenePR() : Math.min(window.devicePixelRatio || 1, 1.5);
  },
  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    if (this.ok) {
      this.renderer.setPixelRatio(this.outPR());
      this.renderer.setSize(this.w, this.h, false);
      const pr = this.scenePR();
      this.pipe.resize(Math.max(2, Math.round(this.w * pr)), Math.max(2, Math.round(this.h * pr)));
      $("#gl").classList.toggle("post", this.look === "hd");
    }
    Scenes.resize();
  },
  setCRT() { /* the glass is a pipeline uniform now; kept for the settings screen */ },
  render(scene, camera, dt) {
    this.t += dt;
    this.ab *= Math.pow(0.015, dt);
    this.flashAmt *= Math.pow(0.003, dt);
    // Object matrices are updated once per frame here, not again in every pass that
    // draws the scene (reflections draw it twice).
    scene.updateMatrixWorld();
    scene.autoUpdate = false;
    const mirrors = scene.userData.mirrors;
    if (this.probe) this.probe("start");
    if (mirrors) for (const m of mirrors) { if (this.lite) m.blank(this.renderer); else m.render(this.renderer, scene, camera, this.pipe.mirrorSize); }
    if (this.probe && mirrors) this.probe("mirror");
    this.pipe.render(scene, camera, {
      t: this.t,
      ab: this.ab,
      flash: this.flashAmt,
      glass: Store.settings.crt ? 1 : 0,
      look: this.look,
      post: scene.userData.post || {},
      lite: this.lite,
    });
  },
  // Juice: colour fringing + white flash, and a short freeze-frame.
  pulse(ab = 6, flash = 0.1) {
    if (REDUCED_MOTION) { ab *= 0.3; flash *= 0.3; }
    this.ab = Math.max(this.ab, ab);
    this.flashAmt = Math.max(this.flashAmt, flash);
  },
  hitStop(ms) { if (!REDUCED_MOTION) this.freeze = Math.max(this.freeze, ms / 1000); },
  // Adaptive quality, aimed at the screen's own refresh rate (60, 90, 120 Hz...).
  // A ladder of levels trades sharpness, then reflections, for frame rate:
  //   0-2: lower resolution, no reflections or sun rays ("lite")
  //   3-5: reflections on, resolution 75% -> 100%
  // Every 40 frames the average frame time is compared with the screen's frame
  // interval (measured, since browsers don't report it). Missing more than a few
  // frames: step down, since an uneven mix of short and long frames reads as judder.
  // Smooth for a few windows: probe one step up, but not to a level that just
  // failed (the wait doubles each time a probe fails). A steady 30 fps with no
  // faster frames is a frame-rate cap (iOS low-power mode), so it's left alone.
  // Each kind of scene remembers its level, so a light scene isn't stuck blurry
  // after a heavy one.
  Q: [{ d: 0.55, lite: true }, { d: 0.62, lite: true }, { d: 0.7, lite: true }, { d: 0.75, lite: false }, { d: 0.86, lite: false }, { d: 1, lite: false }],
  qi: 5,
  vsync: 1 / 60, // the screen's frame interval, refined as frames come in
  mem: {},
  lockQuality() { this.locked = true; this.setQ(this.Q.length - 1, true); },
  setQ(i, force) {
    i = clamp(i, 0, this.Q.length - 1);
    if (i === this.qi && !force) return;
    const was = this.dyn;
    this.qi = i;
    this.dyn = this.Q[i].d;
    this.lite = this.Q[i].lite;
    if (this.dyn !== was || force) this.resize();
  },
  // One environment-map generator for the whole session. Making one per scene and
  // throwing it away recompiled its blur shaders every time a scene loaded.
  pmrem() {
    if (!this._pmrem) this._pmrem = new THREE.PMREMGenerator(this.renderer);
    return this._pmrem;
  },
  // A closing scene's materials are parked here, still holding their GPU programs,
  // until the next scene of the same kind has been warmed: replaying a game (or
  // going back to one) then reuses every shader instead of compiling them again,
  // which on a phone can freeze the screen for a second or more.
  park(old) {
    const held = [];
    const free = THREE.Material.prototype.dispose;
    THREE.Material.prototype.dispose = function () { held.push(this); };
    try { old.dispose(); } finally { THREE.Material.prototype.dispose = free; }
    const name = old.constructor.name, P = this._parked || (this._parked = {});
    if (P[name]) P[name].forEach((m) => m.dispose());
    P[name] = held;
  },
  unpark(s) {
    const P = this._parked, name = s && s.constructor.name;
    if (!P || !P[name]) return;
    P[name].forEach((m) => m.dispose());
    delete P[name];
  },
  // Draw a new scene once, tiny and off-screen, with everything that starts hidden
  // (pooled effects, speed lines, and the pieces a scene lists in warmExtra) showing.
  // Every shader and GPU pipeline state it will need is built now, behind the screen
  // transition, instead of stalling the frame where a hit first happens.
  warm(s) {
    if (!this.ok || !s.scene || !s.camera) return;
    const r = this.renderer, scene = s.scene, extra = s.warmExtra || [];
    extra.forEach((o) => scene.add(o));
    const saved = [];
    scene.traverse((o) => { saved.push(o, o.visible, o.frustumCulled); o.visible = true; o.frustumCulled = false; });
    if (!this._warmRT) {
      this._warmRT = new THREE.WebGLRenderTarget(16, 16, {
        type: this.hdr ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false,
      });
    }
    try {
      r.setRenderTarget(this._warmRT);
      r.render(scene, s.camera);
    } catch (e) { /* best effort */ }
    r.setRenderTarget(null);
    for (let i = 0; i < saved.length; i += 3) { saved[i].visible = saved[i + 1]; saved[i].frustumCulled = saved[i + 2]; }
    extra.forEach((o) => scene.remove(o));
    s.warmExtra = null;
  },
  sceneChanged(old, s) {
    this._n = this._sum = this._good = 0;
    this._lo = [1, 1, 1];
    this.probed = false;
    this.settle = 1; // a new scene's first frames compile shaders and upload textures
    if (this.locked || !this.ok) return;
    const name = (o) => (o && o.constructor ? o.constructor.name : "");
    if (old) { this.mem[name(old)] = this.qi; this.saveMem(); }
    const m = s ? this.mem[name(s)] : undefined;
    if (m !== undefined) this.setQ(m);
  },
  // Each scene's settled quality level is remembered on this device between visits,
  // so a new session starts where it should instead of stuttering while it adapts
  // (it still probes upward). The refresh rate is measured afresh each session.
  loadMem() {
    try { const m = JSON.parse(localStorage.getItem("inr-arcade-gfx") || "{}"); if (m && m.mem) this.mem = m.mem; } catch (e) { /* no storage */ }
  },
  saveMem(cur) {
    if (this.locked) return;
    if (cur && cur.constructor) this.mem[cur.constructor.name] = this.qi;
    try { localStorage.setItem("inr-arcade-gfx", JSON.stringify({ mem: this.mem })); } catch (e) { /* no storage */ }
  },
  watch(realDt) {
    if (!this.ok || !this.pipe) return;
    // the screen's interval: the third-fastest frame of each window, snapped to a
    // standard rate, and only ever lowered (a slow GPU never shows fast frames)
    const lo = this._lo || (this._lo = [1, 1, 1]);
    if (realDt < lo[2]) { lo[2] = realDt; lo.sort((a, b) => a - b); }
    this._n = (this._n || 0) + 1;
    this._sum = (this._sum || 0) + realDt;
    if (this._n < 40) return;
    const avg = this._sum / this._n, third = lo[2];
    this._n = this._sum = 0;
    this._lo = [1, 1, 1];
    if (third > 0.003) {
      const hz = [240, 165, 144, 120, 90, 75, 60, 50, 30].reduce((b, r) => (Math.abs(1 / r - third) < Math.abs(1 / b - third) ? r : b), 60);
      // aim at the screen's rate, up to 120 fps (beyond that, sharpness wins)
      if (1 / Math.min(hz, 120) < this.vsync * 0.97) this.vsync = 1 / Math.min(hz, 120);
    }
    this.fpsAvg = avg;
    if (this.locked) return;
    if (this.t < 3 || this.settle > 0) { this.settle = Math.max(0, (this.settle || 0) - 1); return; }
    const v = this.vsync;
    const capped = third > 0.028 && avg < 0.0365 && v < 0.025;
    if (avg > v * 1.15 && !capped) {
      this._good = 0;
      this.backoff = this.probed ? Math.min(240, this.backoff * 2) : this.backoff || 15;
      this.probed = false;
      this.ceil = this.qi;
      this.ceilT = this.t + this.backoff;
      if (this.qi > 0) this.setQ(this.qi - (avg > v * 2.2 ? 2 : 1)); // far off: two steps at once
    } else if (avg < v * 1.04) {
      if (++this._good < 4) return;
      this._good = 0;
      const top = this.t < (this.ceilT || 0) ? this.ceil - 1 : this.Q.length - 1;
      if (this.qi < top) { this.setQ(this.qi + 1); this.probed = true; }
    } else this._good = 0;
  },
};

const Scenes = {
  cur: null,
  set(s) {
    const old = this.cur;
    this.cur = s;
    if (old && old !== s && !old.keepAlive) { if (GFX.ok) GFX.park(old); else old.dispose(); } // the hub stays built (see hubScene)
    if (old !== s) GFX.sceneChanged(old, s);
    if (s) s.resize(GFX.w, GFX.h);
    if (s && old !== s) { GFX.warm(s); GFX.unpark(s); }
    return s;
  },
  resize() { if (this.cur) this.cur.resize(GFX.w, GFX.h); },
  frame(dt, realDt) {
    const s = this.cur;
    if (!s) return;
    s.update(dt);
    if (GFX.ok && s.scene && s.camera) GFX.render(s.scene, s.camera, realDt);
  },
};

// The render pipeline: scene → HDR target → bloom → final pass with exposure, ACES
// filmic tone mapping, colour grading, FXAA (HD) or pixel snap (retro), and the
// optional CRT glass (curvature, scanlines, phosphor mask, rounded tube and bezel).
// Tuned for phones: the bright pass goes straight to quarter resolution, sun rays run
// at an eighth, and all the glow (five bloom levels plus rays) is gathered into one
// quarter-res texture, so the full-screen final pass reads the scene and one glow
// sample. Colour maths runs at half precision where the GPU has it (UVs stay high).
function makePipeline(renderer, hdr) {
  const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const rt = (depth) => new THREE.WebGLRenderTarget(2, 2, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type, depthBuffer: depth, stencilBuffer: false,
  });
  const sceneRT = rt(true);
  const brightRT = rt(false); // quarter res
  const raysRT = rt(false); // eighth res
  const glowRT = rt(false); // quarter res: every bloom level plus the rays
  const lightV = new THREE.Vector3();
  const LEVELS = 5;
  const MIRROR = 0.4; // reflections render at this fraction of the scene size
  const mips = Array.from({ length: LEVELS }, () => ({ a: rt(false), b: rt(false), w: 2, h: 2 }));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  quad.matrixAutoUpdate = false;
  quadScene.add(quad);
  quadScene.autoUpdate = false; // the full-screen quad never moves
  quadScene.updateMatrixWorld();
  const HP = "#ifdef GL_FRAGMENT_PRECISION_HIGH\n#define HP highp\n#else\n#define HP mediump\n#endif\n";
  const VS = "varying highp vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  const mat = (uniforms, fs) => new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: HP + fs, depthTest: false, depthWrite: false, precision: "mediump" });
  // Bright pass + downsample: four bilinear taps cover the 4x4 block under each
  // quarter-res pixel; each 2x2 average is thresholded on its own, so thin neon
  // lines keep their glow.
  const bright = mat({ tDiffuse: { value: null }, uThreshold: { value: 1 }, uKnee: { value: 0.5 }, uPx: { value: new THREE.Vector2() } }, `
    uniform sampler2D tDiffuse; uniform float uThreshold; uniform float uKnee; uniform HP vec2 uPx; varying HP vec2 vUv;
    vec3 bright(vec3 c){
      float l = max(c.r, max(c.g, c.b));
      float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
      soft = soft * soft / (4.0 * uKnee + 1e-4);
      return c * (max(soft, l - uThreshold) / max(l, 1e-4));
    }
    void main(){
      vec3 c = bright(texture2D(tDiffuse, vUv - uPx).rgb) + bright(texture2D(tDiffuse, vUv + uPx).rgb)
        + bright(texture2D(tDiffuse, vUv + vec2(uPx.x, -uPx.y)).rgb) + bright(texture2D(tDiffuse, vUv + vec2(-uPx.x, uPx.y)).rgb);
      gl_FragColor = vec4(min(c * 0.25, vec3(24.0)), 1.0);
    }`);
  const blur = mat({ tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, `
    uniform sampler2D tDiffuse; uniform HP vec2 uDir; varying HP vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb * 0.2270270;
      c += texture2D(tDiffuse, vUv + uDir * 1.3846154).rgb * 0.3162162;
      c += texture2D(tDiffuse, vUv - uDir * 1.3846154).rgb * 0.3162162;
      c += texture2D(tDiffuse, vUv + uDir * 3.2307692).rgb * 0.0702703;
      c += texture2D(tDiffuse, vUv - uDir * 3.2307692).rgb * 0.0702703;
      gl_FragColor = vec4(c, 1.0);
    }`);
  // God rays: smear the bright pass toward a light (the sun), only near it.
  const rays = mat({ tDiffuse: { value: null }, uLight: { value: new THREE.Vector2(0.5, 0.5) }, uRadius: { value: 0.35 }, uAspect: { value: 1 } }, `
    uniform sampler2D tDiffuse; uniform HP vec2 uLight; uniform float uRadius; uniform float uAspect; varying HP vec2 vUv;
    void main(){
      HP vec2 delta = (vUv - uLight) / 32.0 * 0.92;
      HP vec2 uv = vUv; float w = 1.0; vec3 acc = vec3(0.0);
      for (int i = 0; i < 32; i++) {
        uv -= delta;
        HP vec2 d = (uv - uLight) * vec2(uAspect, 1.0);
        acc += texture2D(tDiffuse, uv).rgb * w * smoothstep(uRadius, uRadius * 0.25, length(d));
        w *= 0.955;
      }
      gl_FragColor = vec4(acc / 32.0, 1.0);
    }`);
  // All the glow in one quarter-res texture.
  const glow = mat({ tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, tB4: { value: null }, tRays: { value: null }, uRays: { value: 0 }, uBloom: { value: 1 } }, `
    uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform sampler2D tB4; uniform sampler2D tRays;
    uniform float uRays; uniform float uBloom; varying HP vec2 vUv;
    void main(){
      vec3 g = (texture2D(tB0, vUv).rgb + texture2D(tB1, vUv).rgb * 0.75 + texture2D(tB2, vUv).rgb * 0.55
        + texture2D(tB3, vUv).rgb * 0.4 + texture2D(tB4, vUv).rgb * 0.3) * (uBloom * 0.2);
      if (uRays > 0.0) g += texture2D(tRays, vUv).rgb * uRays;
      gl_FragColor = vec4(g, 1.0);
    }`);
  const final = mat({
    tScene: { value: null }, tGlow: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) }, uSceneRes: { value: new THREE.Vector2(1, 1) }, uNoise: { value: new THREE.Vector2() },
    uAberr: { value: 0 }, uFlash: { value: 0 }, uExposure: { value: 1 }, uFlicker: { value: 1 },
    uSat: { value: 1.1 }, uContrast: { value: 1.05 }, uVignette: { value: 1 }, uGlass: { value: 1 }, uSnap: { value: 0 },
    uFXAA: { value: 1 }, uScan: { value: 0.1 }, uCurve: { value: 0.06 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
    uShadow: { value: new THREE.Vector3(0.55, 0.4, 1.0) }, uHigh: { value: new THREE.Vector3(1.0, 0.75, 0.6) }, uSplit: { value: 0.12 },
    uBezel: { value: new THREE.Vector2(16, 1) },
  }, `
    uniform sampler2D tScene; uniform sampler2D tGlow;
    uniform HP vec2 uRes; uniform HP vec2 uSceneRes; uniform HP vec2 uNoise; uniform HP vec2 uBezel;
    uniform float uAberr; uniform float uFlash; uniform float uExposure; uniform float uFlicker;
    uniform float uSat; uniform float uContrast; uniform float uVignette; uniform float uGlass; uniform float uSnap;
    uniform float uFXAA; uniform float uScan; uniform float uCurve; uniform vec3 uTint;
    uniform vec3 uShadow; uniform vec3 uHigh; uniform float uSplit;
    varying HP vec2 vUv;
    vec3 tex(HP vec2 uv){ if (uSnap > 0.5) uv = (floor(uv * uSceneRes) + 0.5) / uSceneRes; return texture2D(tScene, uv).rgb; }
    float luma(vec3 c){ return dot(min(c, vec3(1.0)), vec3(0.299, 0.587, 0.114)); }
    vec3 fxaa(HP vec2 uv){
      HP vec2 px = 1.0 / uSceneRes;
      vec3 nw = tex(uv + vec2(-1.0, -1.0) * px), ne = tex(uv + vec2(1.0, -1.0) * px);
      vec3 sw = tex(uv + vec2(-1.0, 1.0) * px), se = tex(uv + vec2(1.0, 1.0) * px), m = tex(uv);
      float lNW = luma(nw), lNE = luma(ne), lSW = luma(sw), lSE = luma(se), lM = luma(m);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
      float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.04, lMax * 0.12)) return m;
      HP vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      HP float reduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
      HP float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + reduce);
      dir = clamp(dir * rcp, -8.0, 8.0) * px;
      vec3 a = 0.5 * (tex(uv + dir * (1.0 / 3.0 - 0.5)) + tex(uv + dir * (2.0 / 3.0 - 0.5)));
      vec3 b = a * 0.5 + 0.25 * (tex(uv - dir * 0.5) + tex(uv + dir * 0.5));
      float lB = luma(b);
      return (lB < lMin || lB > lMax) ? a : b;
    }
    vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    void main(){
      HP vec2 uv = vUv;
      if (uGlass > 0.5) { HP vec2 c = uv - 0.5; c *= 1.0 + uCurve * dot(c, c); uv = c + 0.5; }
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0118, 0.0078, 0.0235, 1.0); return; }
      vec3 col = uFXAA > 0.5 ? fxaa(uv) : tex(uv);
      if (uAberr > 0.05) {
        // colour fringing, only while a hit pulse lasts (two extra samples)
        HP vec2 cd = uv - 0.5;
        HP vec2 dv = normalize(cd + 1e-5) * ((uAberr + 1.6 * dot(cd, cd)) / uRes.x);
        col.r = tex(uv + dv).r; col.b = tex(uv - dv).b;
      }
      col += texture2D(tGlow, uv).rgb;
      col = min(col * uExposure * uTint, vec3(64.0)); // keeps the tone curve inside half-float range
      col = aces(col);
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * mix(uShadow, uHigh, smoothstep(0.05, 0.75, lum)) * 1.25, uSplit);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);
      if (uGlass > 0.5) {
        float s = abs(fract(uv.y * uRes.y / 3.0) * 2.0 - 1.0);
        col *= 1.0 - uScan * (1.0 - s);
        HP float mx = mod(gl_FragCoord.x, 3.0);
        vec3 mask = mx < 1.0 ? vec3(1.0, 0.85, 0.85) : (mx < 2.0 ? vec3(0.85, 1.0, 0.85) : vec3(0.85, 0.85, 1.0));
        col *= mix(vec3(1.0), mask, uScan * 1.4) * uFlicker;
      }
      HP vec2 v = uv * (1.0 - uv.yx);
      col *= mix(1.0, clamp(sqrt(sqrt(v.x * v.y * 18.0)), 0.0, 1.0), uVignette);
      HP float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uNoise, vec2(0.06711056, 0.00583715))));
      col += (n - 0.5) * 0.018 + uFlash;
      if (uGlass > 0.5) {
        // the tube (drawn here rather than as page overlays, which phones would have
        // to blend over every frame): rounded corners, a dark rim and inner shadow,
        // and a sliver of glare
        HP vec2 q = abs(vUv - 0.5) * uRes - (uRes * 0.5 - uBezel.x);
        HP float d = (length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uBezel.x) / uBezel.y; // CSS px, < 0 inside
        col *= 1.0 - 0.75 * (1.0 - smoothstep(8.0, 36.0, -d)) - 0.15 * step(-d, 2.0);
        HP float t = 0.5 + (0.342 * uRes.x * (vUv.x - 0.5) + 0.94 * uRes.y * (0.5 - vUv.y)) / (0.342 * uRes.x + 0.94 * uRes.y);
        float g = t < 0.22 ? mix(0.07, 0.015, t / 0.22) : 0.015 * clamp(1.0 - (t - 0.22) / 0.18, 0.0, 1.0);
        col += (1.0 - col) * g;
        col = mix(vec3(0.0118, 0.0078, 0.0235), col, clamp(0.5 - d * uBezel.y, 0.0, 1.0));
      }
      gl_FragColor = vec4(col, 1.0);
    }`);
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, cam); };
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  black.needsUpdate = true;
  let sw = 2, sh = 2;
  return {
    hdr,
    mirrorSize: { w: 2, h: 2 },
    resize(w, h) {
      sw = w; sh = h;
      sceneRT.setSize(w, h);
      brightRT.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
      glowRT.setSize(Math.max(2, w >> 2), Math.max(2, h >> 2));
      raysRT.setSize(Math.max(2, w >> 3), Math.max(2, h >> 3));
      let mw = w >> 1, mh = h >> 1;
      for (const m of mips) {
        mw = Math.max(2, mw >> 1);
        mh = Math.max(2, mh >> 1);
        m.w = mw; m.h = mh;
        m.a.setSize(mw, mh);
        m.b.setSize(mw, mh);
      }
      this.mirrorSize.w = Math.max(2, Math.round(w * MIRROR));
      this.mirrorSize.h = Math.max(2, Math.round(h * MIRROR));
      final.uniforms.uSceneRes.value.set(w, h);
    },
    lastCalls: 0,
    render(scene, camera, o) {
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      this.lastCalls = renderer.info.render.calls;
      if (GFX.probe) GFX.probe("scene");
      const p = o.post;
      // bloom: soft-threshold bright pass straight to quarter res, then a blurred mip chain
      bright.uniforms.tDiffuse.value = sceneRT.texture;
      bright.uniforms.uThreshold.value = p.threshold !== undefined ? p.threshold : hdr ? 1.0 : 0.62;
      bright.uniforms.uKnee.value = 0.45;
      bright.uniforms.uPx.value.set(1 / sw, 1 / sh);
      pass(bright, brightRT);
      if (GFX.probe) GFX.probe("bright");
      const levels = o.lite ? 3 : LEVELS;
      let src = brightRT;
      for (let i = 0; i < levels; i++) {
        const m = mips[i];
        blur.uniforms.tDiffuse.value = src.texture;
        blur.uniforms.uDir.value.set(1 / m.w, 0);
        pass(blur, m.b);
        blur.uniforms.tDiffuse.value = m.b.texture;
        blur.uniforms.uDir.value.set(0, 1 / m.h);
        pass(blur, m.a);
        src = m.a;
      }
      if (GFX.probe) GFX.probe("bloom");
      // god rays toward a light the scene names (e.g. the sun), when it's on screen
      let raysOn = 0;
      if (p.rays && p.rays.pos && !o.lite) {
        lightV.copy(p.rays.pos).project(camera);
        if (lightV.z < 1 && Math.abs(lightV.x) < 1.6 && Math.abs(lightV.y) < 1.6) {
          rays.uniforms.tDiffuse.value = brightRT.texture;
          rays.uniforms.uLight.value.set(lightV.x * 0.5 + 0.5, lightV.y * 0.5 + 0.5);
          rays.uniforms.uRadius.value = p.rays.radius || 0.35;
          rays.uniforms.uAspect.value = sw / sh;
          pass(rays, raysRT);
          raysOn = p.rays.strength !== undefined ? p.rays.strength : 1;
          if (GFX.probe) GFX.probe("rays");
        }
      }
      const g = glow.uniforms;
      g.tB0.value = mips[0].a.texture;
      g.tB1.value = mips[1].a.texture;
      g.tB2.value = mips[2].a.texture;
      g.tB3.value = levels > 3 ? mips[3].a.texture : black;
      g.tB4.value = levels > 4 ? mips[4].a.texture : black;
      g.tRays.value = raysRT.texture;
      g.uRays.value = raysOn;
      g.uBloom.value = p.bloom !== undefined ? p.bloom : 1;
      pass(glow, glowRT);
      if (GFX.probe) GFX.probe("glow");
      const u = final.uniforms;
      u.tScene.value = sceneRT.texture;
      u.tGlow.value = glowRT.texture;
      u.uSplit.value = p.split !== undefined ? p.split : 0.12;
      const cw = renderer.domElement.width, ch = renderer.domElement.height;
      u.uRes.value.set(cw, ch);
      u.uNoise.value.set(Math.random() * 97, Math.random() * 97);
      u.uFlicker.value = 0.985 + 0.015 * Math.sin(o.t * 95);
      u.uAberr.value = o.ab;
      u.uFlash.value = o.flash;
      u.uExposure.value = p.exposure !== undefined ? p.exposure : 1.2;
      u.uSat.value = p.saturation !== undefined ? p.saturation : 1.12;
      u.uContrast.value = p.contrast !== undefined ? p.contrast : 1.06;
      u.uVignette.value = p.vignette !== undefined ? p.vignette : 1;
      if (p.tint) u.uTint.value.set(p.tint[0], p.tint[1], p.tint[2]); else u.uTint.value.set(1, 1, 1);
      const retro = o.look !== "hd";
      u.uGlass.value = o.glass;
      u.uSnap.value = retro ? 1 : 0;
      u.uFXAA.value = retro ? 0 : 1;
      u.uScan.value = retro ? 0.2 : 0.09;
      u.uCurve.value = retro ? 0.11 : 0.06;
      const cssW = Math.max(1, GFX.w), cssH = Math.max(1, GFX.h), pr = cw / cssW;
      u.uBezel.value.set(clamp(0.034 * Math.min(cssW, cssH), 16, 40) * pr, pr);
      pass(final, null);
      if (GFX.probe) GFX.probe("final");
    },
  };
}

// Where the finger or mouse is, from -1 to 1, for camera parallax. Eases back to
// the centre when a touch lifts.
const Pointer = {
  x: 0, y: 0, tx: 0, ty: 0, touch: false,
  init() {
    const set = (e) => {
      this.tx = clamp((e.clientX / GFX.w) * 2 - 1, -1, 1);
      this.ty = clamp((e.clientY / GFX.h) * 2 - 1, -1, 1);
      this.touch = e.pointerType === "touch";
    };
    window.addEventListener("pointermove", set, { passive: true });
    window.addEventListener("pointerdown", set, { passive: true });
    window.addEventListener("pointerup", (e) => { if (e.pointerType === "touch") { this.tx = 0; this.ty = 0; } }, { passive: true });
  },
  update(dt) {
    const k = Math.min(1, dt * 3);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
  },
};

const Haptics = {
  buzz(pattern) {
    if (!Store.settings.sfx) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not allowed here */ }
  },
};

// Base for every 3D scene. Works without WebGL too (update still runs, nothing draws).
class Scene3D {
  constructor({ fov = 60, near = 0.1, far = 500, bg = 0x090320, fog = null } = {}) {
    this.tw = new TweenSet();
    this.t = 0;
    this.shakeAmt = 0;
    this.band = null;
    this.has3D = !!window.THREE;
    if (!this.has3D) return;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bg);
    if (fog) this.scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
    this.camera = new THREE.PerspectiveCamera(fov, GFX.w / GFX.h, near, far);
    this.camera.layers.enable(1);
    this.camBase = new THREE.Vector3();
    this.lookAt = new THREE.Vector3(0, 0, -10);
    // pooled shockwave rings (see shockwave()), built with the scene so a hit never
    // creates GPU objects
    const rg = new THREE.RingGeometry(0.55, 0.8, 40);
    this.shockRings = Array.from({ length: 4 }, () => {
      const ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      ring.visible = false;
      ring.userData.tok = 0;
      this.scene.add(ring);
      return ring;
    });
    this.shockI = 0;
  }
  resize(w, h) {
    if (!this.camera) return;
    this.camera.aspect = w / h;
    if (this.band) {
      const yc = (this.band.top + this.band.bottom) / 2;
      this.camera.setViewOffset(w, h, 0, h / 2 - yc, w, h);
    } else {
      this.camera.clearViewOffset();
    }
    this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize(w, h);
  }
  // Centre the 3D action in the strip of screen between the HUD panels.
  setBand(el) {
    if (!el) { this.band = null; return this.resize(GFX.w, GFX.h); }
    const r = el.getBoundingClientRect();
    this.band = { top: r.top, bottom: r.bottom, h: Math.max(1, r.height) };
    this.resize(GFX.w, GFX.h);
  }
  // World-space size of the visible band at a given distance from the camera.
  bandSize(dist) {
    const H = GFX.h, W = GFX.w;
    const worldH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const perPx = worldH / H;
    const bh = (this.band ? this.band.h : H) * perPx;
    return { w: W * perPx, h: bh };
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, REDUCED_MOTION ? a * 0.3 : a); }
  // An expanding ring of light that faces the camera.
  shockwave(pos, color, size = 5, dur = 0.55) {
    if (!this.has3D) return;
    const ring = this.shockRings[this.shockI++ % this.shockRings.length];
    const tok = ++ring.userData.tok;
    ring.visible = true;
    ring.position.copy(pos);
    ring.quaternion.copy(this.camera.quaternion);
    ring.material.color.set(color);
    ring.material.opacity = 1;
    ring.scale.setScalar(0.4);
    this.tw.add(dur, (k) => {
      if (ring.userData.tok !== tok) return;
      ring.scale.setScalar(0.4 + k * size);
      ring.material.opacity = 1 - k;
    }, () => { if (ring.userData.tok === tok) ring.visible = false; });
  }
  placeCamera() {
    if (!this.camera) return;
    this.camera.position.copy(this.camBase);
    if (this.shakeAmt > 0.001) {
      this.camera.position.x += rand(-1, 1) * this.shakeAmt;
      this.camera.position.y += rand(-1, 1) * this.shakeAmt;
    }
    this.camera.lookAt(this.lookAt);
  }
  update(dt) {
    this.t += dt;
    this.tw.update(dt);
    this.shakeAmt *= Math.pow(0.02, dt);
  }
  dispose() {
    this.tw.clear();
    if (this.scene) disposeTree(this.scene);
    if (this.env) this.env.dispose();
    if (this.mirror) this.mirror.dispose();
  }
}

function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.map && m.map !== _glowTex) m.map.dispose();
        m.dispose();
      });
    }
  });
}

// ---- shared props --------------------------------------------------------------
function makeGrid({ size = 240, step = 5, color = 0xff3ad4, y = 0 } = {}) {
  const pts = [];
  const half = size / 2;
  for (let x = -half; x <= half + 0.001; x += step) pts.push(x, 0, -half, x, 0, half);
  for (let z = -half; z <= half + 0.001; z += step) pts.push(-half, 0, z, half, 0, z);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color }));
  grid.position.y = y;
  grid.userData.step = step;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), new THREE.MeshBasicMaterial({ color: 0x0b0326 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = y - 0.02;
  const grp = new THREE.Group();
  grp.add(floor, grid);
  grp.userData.grid = grid;
  return grp;
}
function scrollGrid(grp, dist) {
  const g = grp.userData.grid;
  g.position.z = dist % g.userData.step;
}

function sunTexture(top = "#ffe14f", mid = "#ff9b3d", bot = "#ff3ad4") {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, bot);
  x.fillStyle = g;
  x.beginPath();
  x.arc(128, 128, 124, 0, Math.PI * 2);
  x.fill();
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 8; i++) x.fillRect(0, 138 + i * 15, 256, 2 + i * 1.4);
  return new THREE.CanvasTexture(c);
}
function makeSun(radius = 40, colors = []) {
  const grp = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: sunTexture(...colors), transparent: true, fog: false, depthWrite: false })
  );
  const glow = glowSprite(colors[2] || "#ff3ad4", radius * 3.6, 0.55);
  grp.add(glow, sun);
  return grp;
}

let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}
function glowSprite(color, scale = 2, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  s.scale.set(scale, scale, 1);
  return s;
}

function makeStars(n = 500, r = 300, { color = 0xffffff, size = 1.6, lowest = -0.05 } = {}) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const th = Math.random() * Math.PI * 2;
    const y = rand(lowest, 1);
    const s = Math.sqrt(1 - y * y);
    pos[i * 3] = r * s * Math.cos(th);
    pos[i * 3 + 1] = r * y;
    pos[i * 3 + 2] = r * s * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: false, fog: false }));
}

function makeMountains({ width = 460, z = -190, color = 0xa65fff, fill = 0x10052c, height = 34, n = 46 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const x = -width / 2 + (width * i) / n;
    const edge = Math.abs(x) / (width / 2);
    const peak = i % 2 ? rand(0.55, 1) : rand(0.12, 0.45);
    pts.push([x, peak * height * (0.35 + 0.65 * edge)]);
  }
  const pos = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    pos.push(x0, 0, 0, x1, 0, 0, x1, y1, 0, x0, 0, 0, x1, y1, 0, x0, y0, 0);
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const fillMesh = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: fill, fog: false, side: THREE.DoubleSide }));
  const lp = [];
  pts.forEach(([x, y]) => lp.push(x, y, 0.2));
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
  const ridge = new THREE.Line(lg, new THREE.LineBasicMaterial({ color, fog: false }));
  const wp = [];
  const dx = width / n;
  for (let i = 1; i < n; i++) {
    const [x, y] = pts[i];
    if (y > height * 0.3) wp.push(x, y, 0.1, x - dx * 0.8, y * 0.35, 0.1, x, y, 0.1, x + dx * 0.6, y * 0.25, 0.1);
  }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3));
  const wire = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45, fog: false }));
  const grp = new THREE.Group();
  grp.add(fillMesh, wire, ridge);
  grp.position.z = z;
  return grp;
}

function textCanvas(text, { w = 256, h = 64, size = 26, color = "#ffffff", bg = null, glow = null, font = "Press Start 2P", align = "center", lh = 1.35 } = {}) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.font = `${size}px "${font}", "Courier New", monospace`;
  x.textAlign = align;
  x.textBaseline = "middle";
  if (glow) { x.shadowColor = glow; x.shadowBlur = Math.max(4, size * 0.45); }
  x.fillStyle = color;
  const lines = String(text).split("\n");
  lines.forEach((ln, i) => x.fillText(ln, align === "center" ? w / 2 : 10, h / 2 + (i - (lines.length - 1) / 2) * size * lh));
  return c;
}
function textTexture(text, opts) {
  const t = new THREE.CanvasTexture(textCanvas(text, opts));
  t.magFilter = THREE.NearestFilter;
  return t;
}
function labelSprite(text, color, scale = 1.4) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: textTexture(text, { w: 64, h: 64, size: 34, glow: color }), transparent: true, depthTest: false, fog: false })
  );
  s.scale.set(scale, scale, 1);
  s.renderOrder = 10;
  return s;
}

// A low-poly solid with neon edges. Needs lights for the Phong fill.
function neonSolid(geo, color, { fill = 0x120733, glow = 0.18, edgeColor } = {}) {
  const grp = new THREE.Group();
  const c = new THREE.Color(color);
  const mat = new THREE.MeshPhongMaterial({ color: fill, emissive: c.clone().multiplyScalar(glow), flatShading: true, shininess: 50, specular: 0x666666 });
  const mesh = new THREE.Mesh(geo, mat);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: edgeColor || color }));
  grp.add(mesh, edges);
  grp.userData.mat = mat;
  grp.userData.edgeMat = edges.material;
  grp.userData.color = c;
  return grp;
}

function addLights(scene, { ambient = 0x6a5aa8, ai = 0.7, key = 0xffffff, ki = 0.9, dir = [3, 6, 4] } = {}) {
  scene.add(new THREE.AmbientLight(ambient, ai));
  const d = new THREE.DirectionalLight(key, ki);
  d.position.set(...dir);
  scene.add(d);
  return d;
}

function beamMesh(from, to, color, radius = 0.07) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, 6, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
  );
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

// Particle bursts for explosions, coins and confetti.
// Particle bursts: one fixed pool of soft glowing dots, drawn in a single call.
// Nothing is created or freed during play, so a hit never waits on new GPU work
// (a fresh material per burst used to recompile its shader on every hit).
class Bursts {
  constructor(scene, cap = 768) {
    this.scene = scene;
    this.cap = cap;
    this.head = 0;
    this.until = 0;
    this.fresh = false;
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
    this.size = new Float32Array(cap);
    this.alpha = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.life = new Float32Array(cap).fill(1);
    this.grav = new Float32Array(cap);
    this._c = new THREE.Color();
    const g = new THREE.BufferGeometry();
    const attr = (a, n) => new THREE.BufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", attr(this.pos, 3));
    g.setAttribute("aColor", attr(this.col, 3));
    g.setAttribute("aSize", attr(this.size, 1));
    g.setAttribute("aAlpha", attr(this.alpha, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: glowTexture() }, uScale: { value: 300 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale; varying vec3 vC;
        void main(){
          vC = aColor * aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aAlpha > 0.0 ? aSize * uScale / max(-mv.z, 0.05) : 0.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: "uniform sampler2D tMap; varying vec3 vC; void main(){ gl_FragColor = vec4(vC * texture2D(tMap, gl_PointCoord).a, 1.0); }",
    });
    this.pts = new THREE.Points(g, mat);
    this.pts.frustumCulled = false;
    this.pts.visible = false;
    // dot size in pixels follows whichever target is being drawn (the scene or a mirror)
    this.pts.onBeforeRender = (r) => {
      const t = r.getRenderTarget();
      mat.uniforms.uScale.value = (t ? t.height : r.domElement.height) * 0.5;
      mat.uniformsNeedUpdate = true;
    };
    if (scene) scene.add(this.pts);
  }
  burst(pos, color, { n = 60, speed = 10, size = 0.3, life = 1.1, gravity = -5, spread = 1 } = {}) {
    if (!this.scene) return;
    const c = this._c.set(color).multiplyScalar(2.6);
    const P = this.pos, V = this.vel, C = this.col;
    for (let k = 0; k < n; k++) {
      const i = this.head, j = i * 3;
      this.head = (i + 1) % this.cap;
      const th = rand(Math.PI * 2), ph = Math.acos(rand(-1, 1)), sp = rand(0.25, 1) * speed;
      P[j] = pos.x; P[j + 1] = pos.y; P[j + 2] = pos.z;
      V[j] = Math.sin(ph) * Math.cos(th) * sp * spread;
      V[j + 1] = Math.cos(ph) * sp;
      V[j + 2] = Math.sin(ph) * Math.sin(th) * sp * spread;
      C[j] = c.r; C[j + 1] = c.g; C[j + 2] = c.b;
      this.size[i] = size * 2.4;
      this.alpha[i] = 1;
      this.age[i] = 0;
      this.life[i] = life;
      this.grav[i] = gravity;
    }
    this.until = Math.max(this.until, life);
    this.fresh = true;
    this.pts.visible = true;
  }
  update(dt) {
    if (!this.pts.visible) return;
    const P = this.pos, V = this.vel, A = this.alpha;
    const drag = Math.pow(0.4, dt);
    for (let i = 0; i < this.cap; i++) {
      if (A[i] <= 0) continue;
      const age = (this.age[i] += dt);
      if (age >= this.life[i]) { A[i] = 0; continue; }
      const j = i * 3;
      P[j] += V[j] * dt;
      P[j + 1] += V[j + 1] * dt;
      P[j + 2] += V[j + 2] * dt;
      V[j] *= drag;
      V[j + 2] *= drag;
      V[j + 1] = V[j + 1] * drag + this.grav[i] * dt;
      A[i] = 1 - age / this.life[i];
    }
    const at = this.pts.geometry.attributes;
    at.position.needsUpdate = true;
    at.aAlpha.needsUpdate = true;
    if (this.fresh) { at.aColor.needsUpdate = true; at.aSize.needsUpdate = true; this.fresh = false; }
    this.until -= dt;
    if (this.until <= 0) { A.fill(0); at.aAlpha.needsUpdate = true; this.pts.visible = false; }
  }
}

function carpetTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#0d0626";
  x.fillRect(0, 0, 256, 256);
  const cols = ["#35efff", "#ff3ad4", "#ffe14f", "#86ff5e", "#a65fff"];
  x.lineWidth = 3;
  for (let i = 0; i < 60; i++) {
    const col = pick(cols);
    x.strokeStyle = col;
    x.fillStyle = col;
    const px = rand(16, 240), py = rand(16, 240);
    const k = randInt(0, 3);
    x.beginPath();
    if (k === 0) { x.arc(px, py, rand(3, 7), 0, Math.PI * 2); x.stroke(); }
    else if (k === 1) { x.moveTo(px, py); x.lineTo(px + rand(-12, 12), py + rand(8, 14)); x.lineTo(px + rand(-12, 12), py - rand(4, 10)); x.closePath(); x.stroke(); }
    else if (k === 2) { x.moveTo(px - 12, py); x.lineTo(px - 6, py - 6); x.lineTo(px, py); x.lineTo(px + 6, py - 6); x.lineTo(px + 12, py); x.stroke(); }
    else x.fillRect(px, py, 4, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}
