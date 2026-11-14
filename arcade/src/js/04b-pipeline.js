// The render pipeline. One mode: maximum. Frame rate is not a goal here.
//
//   scene  -> multisampled HDR target (colour + 24-bit depth), at the screen's own pixels
//   depth  -> ambient occlusion and contact shadows (half size, depth-aware blur)
//   lit    -> the scene with that shade on it, camera motion blur, and depth of field
//             (a half-size disc blur, laid back by each pixel's circle of confusion)
//   bloom  -> soft-threshold bright pass, six-level downsample and tent upsample chain,
//             god rays toward a light the scene names, anamorphic streaks, lens ghosts,
//             and a dusty lens that catches the widest glow
//   final  -> FXAA, sharpening, lens fringe, exposure, ACES filmic curve, split-toned
//             neon grade, hit and streak overlays, and the CRT glass (curvature,
//             scanlines, phosphor mask, vignette, grain, tube and bezel)
//
// A scene steers it with scene.userData.post:
//   exposure, bloom, threshold, saturation, contrast, vignette, tint, split, sharpen, crisp
//   rays: { pos, strength, radius, flare }       god rays and flare toward a light
//   ao: 0..1 (default 1), aoRadius (fraction of depth, default 0.055)
//   sun: [x, y, z] world direction toward the key light, shadow: 0..1, shadowLen
//   dof: { focus, near, far, max, sky }           distances in world units along the view
//   mblur: 0..1                                   camera motion blur
function makePipeline(renderer, hdr) {
  const gl = renderer.getContext(), gl2 = renderer.capabilities.isWebGL2;
  const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const opts = (depth, t) => ({ minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: t || type, depthBuffer: depth, stencilBuffer: false });
  const rt = () => new THREE.WebGLRenderTarget(2, 2, opts(false));
  const rt8 = () => new THREE.WebGLRenderTarget(2, 2, opts(false, THREE.UnsignedByteType));
  // The scene target carries its depth as a texture: everything after it reads depth.
  const makeScene = (samples) => {
    const t = samples > 0 ? new THREE.WebGLMultisampleRenderTarget(2, 2, opts(true)) : new THREE.WebGLRenderTarget(2, 2, opts(true));
    if (samples > 0) t.samples = samples;
    t.depthTexture = new THREE.DepthTexture(2, 2, THREE.UnsignedIntType);
    t.depthTexture.minFilter = t.depthTexture.magFilter = THREE.NearestFilter;
    return t;
  };
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
  const mat = (uniforms, fs) => new THREE.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: HP + fs, depthTest: false, depthWrite: false, precision: "highp" });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, cam); };

  // ---- multisampling, checked once: a quad at a known depth must come back out of the resolve
  const DEPTH = `
    uniform sampler2D tDepth; uniform HP mat4 uInvProj; uniform HP mat4 uProj;
    HP float rawDepth(HP vec2 uv){ return texture2D(tDepth, uv).x; }
    HP vec3 viewPos(HP vec2 uv, HP float d){ HP vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
    float ign(HP vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;
  const resolves = (target) => {
    try {
      target.setSize(8, 8);
      const s = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x4080c0 })), probe = rt8();
      q.position.z = -0.5; // half way through the orthographic camera's range: depth 0.5
      s.add(q);
      probe.setSize(1, 1);
      const read = mat({ tScene: { value: target.texture }, tDepth: { value: target.depthTexture } }, `
        uniform sampler2D tScene; uniform sampler2D tDepth; varying HP vec2 vUv;
        void main(){ gl_FragColor = vec4(texture2D(tScene, vUv).rg, texture2D(tDepth, vUv).x, 1.0); }`);
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(s, cam);
      pass(read, probe);
      const px = new Uint8Array(4);
      renderer.readRenderTargetPixels(probe, 0, 0, 1, 1, px);
      renderer.setRenderTarget(null);
      q.geometry.dispose(); q.material.dispose(); read.dispose(); probe.dispose();
      return gl.getError() === 0 && px[0] > 20 && px[1] > 60 && Math.abs(px[2] - 128) < 12;
    } catch (e) { return false; }
  };
  let samples = gl2 ? Math.min(gl.getParameter(gl.MAX_SAMPLES) || 0, (window.devicePixelRatio || 1) >= 2.5 ? 4 : 8) : 0;
  let sceneRT = makeScene(samples);
  if (samples > 0 && !resolves(sceneRT)) { sceneRT.dispose(); samples = 0; sceneRT = makeScene(0); }
  let depthOK = samples > 0 || resolves(sceneRT); // (no usable depth texture: the depth passes are skipped)

  const litRT = rt(); // the scene with shade, motion blur and depth of field
  const aoA = rt8(), aoB = rt8(); // half size: r = ambient occlusion, g = contact shadow
  const halfA = rt(), halfB = rt(); // half size: depth of field
  const LEVELS = 7;
  const down = Array.from({ length: LEVELS }, () => ({ t: rt(), w: 2, h: 2 }));
  const up = Array.from({ length: LEVELS - 1 }, () => rt());
  const raysRT = rt(); // quarter res
  const glowRT = rt(); // half res: bloom, rays, streaks, ghosts and lens dirt in one texture
  const streakA = rt(), streakB = rt(); // eighth res
  const lightV = new THREE.Vector3(), sunV = new THREE.Vector3();
  const MIRROR = 0.6; // reflections render at this fraction of the scene size
  const prevVP = new THREE.Matrix4(), curVP = new THREE.Matrix4(), tmpM = new THREE.Matrix4();
  let prevCam = null;

  // ---- ambient occlusion + contact shadows, from depth alone ------------------------
  // The radius is a fraction of each pixel's own distance, so it suits a table top and a
  // skyline alike. The normal comes from the nearer neighbour on each axis, which keeps
  // edges clean. The shadow is a short march toward the scene's key light.
  const ao = mat({ tDepth: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() }, uPx: { value: new THREE.Vector2() }, uAspect: { value: 1 },
    uRad: { value: 0.055 }, uSunV: { value: new THREE.Vector3(0, 1, 0) }, uShLen: { value: 0.09 } }, DEPTH + `
    uniform HP vec2 uPx; uniform float uAspect; uniform float uRad; uniform HP vec3 uSunV; uniform float uShLen; varying HP vec2 vUv;
    void main(){
      HP float d = rawDepth(vUv);
      if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
      HP vec3 p = viewPos(vUv, d);
      HP vec2 ex = vec2(uPx.x, 0.0), ey = vec2(0.0, uPx.y);
      HP vec3 pr = viewPos(vUv + ex, rawDepth(vUv + ex)) - p, pl = p - viewPos(vUv - ex, rawDepth(vUv - ex));
      HP vec3 pu = viewPos(vUv + ey, rawDepth(vUv + ey)) - p, pd = p - viewPos(vUv - ey, rawDepth(vUv - ey));
      HP vec3 n = normalize(cross(abs(pr.z) < abs(pl.z) ? pr : pl, abs(pu.z) < abs(pd.z) ? pu : pd));
      HP float dist = -p.z, R = uRad * dist, rUV = uRad * uProj[1][1] * 0.5;
      float rnd = ign(gl_FragCoord.xy), occ = 0.0;
      for (int i = 0; i < 20; i++) {
        float fi = float(i), a = (fi + rnd) * 2.39996323, r = sqrt((fi + 0.5) / 20.0) * rUV;
        HP vec2 suv = vUv + vec2(cos(a) / uAspect, sin(a)) * r;
        HP vec3 v = viewPos(suv, rawDepth(suv)) - p;
        HP float vv = dot(v, v);
        occ += max(0.0, dot(v, n) * inversesqrt(vv + 1e-9) - 0.13) * clamp(1.0 - vv / (R * R), 0.0, 1.0);
      }
      float shade = clamp(1.0 - occ / 20.0 * 2.7, 0.0, 1.0), sh = 1.0;
      if (uShLen > 0.0 && dot(n, uSunV) > 0.03) {
        HP float len = uShLen * dist;
        HP vec3 stp = uSunV * (len / 16.0), s = p + n * (0.006 * dist) + stp * (0.3 + rnd);
        for (int i = 0; i < 16; i++) {
          HP vec4 c = uProj * vec4(s, 1.0);
          HP vec2 suv = c.xy / c.w * 0.5 + 0.5;
          if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) break;
          HP float sd = rawDepth(suv);
          HP float gap = viewPos(suv, sd).z - s.z; // > 0: something stands between this point and the light
          if (sd < 0.99999 && gap > 0.004 * dist && gap < 0.05 * dist + len * 0.6) { float k = (float(i) + 0.5) / 16.0; sh = k * k * 0.7; break; }
          s += stp;
        }
      }
      gl_FragColor = vec4(shade, sh, 1.0, 1.0);
    }`);
  const aoBlur = mat({ tAO: { value: null }, tDepth: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() }, uDir: { value: new THREE.Vector2() } }, DEPTH + `
    uniform sampler2D tAO; uniform HP vec2 uDir; varying HP vec2 vUv;
    void main(){
      HP float d0 = -viewPos(vUv, rawDepth(vUv)).z;
      vec2 acc = texture2D(tAO, vUv).rg * 0.2; float w = 0.2;
      for (int i = 1; i <= 5; i++) {
        float fi = float(i), g = exp(-fi * fi / 9.0) * 0.2;
        for (int s = 0; s < 2; s++) {
          HP vec2 uv = vUv + uDir * (s == 0 ? fi : -fi);
          HP float dk = -viewPos(uv, rawDepth(uv)).z;
          float k = g * max(0.0, 1.0 - abs(dk - d0) / (0.035 * d0 + 1e-5));
          acc += texture2D(tAO, uv).rg * k; w += k;
        }
      }
      gl_FragColor = vec4(acc / w, 1.0, 1.0);
    }`);
  // How much of the shade a pixel takes: light sources themselves are left alone.
  const SHADE = `
    uniform sampler2D tAO; uniform vec2 uShade;
    vec3 shaded(vec3 c, HP vec2 uv){
      vec2 a = texture2D(tAO, uv).rg;
      float keep = smoothstep(0.75, 1.9, max(c.r, max(c.g, c.b)));
      return c * mix(mix(1.0, a.r, uShade.x) * mix(1.0, a.g, uShade.y), 1.0, keep);
    }`;
  const COC = `
    uniform HP vec4 uDof; uniform float uDofSky; // focus distance, near range, far range, strength; how much the sky blurs
    float coc(HP float d, HP vec2 uv){
      if (d >= 0.99999) return uDofSky * uDof.w;
      HP float x = -viewPos(uv, d).z - uDof.x;
      return clamp(x > 0.0 ? x / uDof.z : x / uDof.y, -1.0, 1.0) * uDof.w;
    }`;
  // Depth of field, step 1: the lit scene at half size, with each pixel's circle of
  // confusion (signed: negative in front of the focus) beside it.
  const dofPre = mat({ tScene: { value: null }, tDepth: { value: null }, tAO: { value: null }, uShade: { value: new THREE.Vector2(1, 1) }, uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() },
    uDof: { value: new THREE.Vector4(10, 5, 20, 0) }, uDofSky: { value: 1 } }, DEPTH + SHADE + COC + `
    uniform sampler2D tScene; varying HP vec2 vUv;
    void main(){ gl_FragColor = vec4(min(shaded(texture2D(tScene, vUv).rgb, vUv), vec3(48.0)), coc(rawDepth(vUv), vUv) * 0.5 + 0.5); }`);
  // Step 2: a disc of 56 taps on a golden spiral. A tap counts when its own blur reaches
  // this pixel; what lies behind may not smear over what is sharp in front of it.
  const dofBlur = mat({ tHalf: { value: null }, uPx: { value: new THREE.Vector2() }, uUnit: { value: 1 } }, `
    uniform sampler2D tHalf; uniform HP vec2 uPx; uniform float uUnit; varying HP vec2 vUv;
    float ign(HP vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    void main(){
      vec4 c0 = texture2D(tHalf, vUv);
      float coc0 = c0.a * 2.0 - 1.0, size0 = abs(coc0) * 9.6;
      vec3 col = c0.rgb; float tot = 1.0, radius = 0.8, ang = ign(gl_FragCoord.xy) * 6.2832, spread = abs(coc0);
      for (int i = 0; i < 56; i++) {
        vec4 s = texture2D(tHalf, vUv + vec2(cos(ang), sin(ang)) * uPx * (radius * uUnit));
        float cs = s.a * 2.0 - 1.0, ss = abs(cs) * 9.6;
        if (cs > coc0) ss = min(ss, size0 * 2.0);
        float m = smoothstep(radius - 0.5, radius + 0.5, ss);
        col += mix(col / tot, s.rgb, m); tot += 1.0;
        if (cs < 0.0) spread = max(spread, m * -cs);
        ang += 2.39996323; radius += 0.8 / radius;
      }
      gl_FragColor = vec4(col / tot, spread);
    }`);
  // The lit picture at full size: shade, camera motion blur, depth of field laid back in.
  const lit = mat({ tScene: { value: null }, tDepth: { value: null }, tAO: { value: null }, tBlur: { value: null }, uShade: { value: new THREE.Vector2(1, 1) },
    uInvProj: { value: new THREE.Matrix4() }, uProj: { value: new THREE.Matrix4() }, uReproj: { value: new THREE.Matrix4() }, uMBlur: { value: 0 },
    uDof: { value: new THREE.Vector4(10, 5, 20, 0) }, uDofSky: { value: 1 }, uDepthOn: { value: 1 } }, DEPTH + SHADE + COC + `
    uniform sampler2D tScene; uniform sampler2D tBlur; uniform HP mat4 uReproj; uniform float uMBlur; uniform float uDepthOn; varying HP vec2 vUv;
    void main(){
      vec3 col = texture2D(tScene, vUv).rgb;
      if (uDepthOn < 0.5) { gl_FragColor = vec4(col, 1.0); return; }
      HP float d = rawDepth(vUv);
      if (uMBlur > 0.0) {
        // where this pixel was a frame ago, had only the camera moved
        HP vec4 pc = uReproj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
        HP vec2 vel = (vUv - (pc.xy / pc.w * 0.5 + 0.5)) * uMBlur;
        HP float vl = length(vel);
        if (vl > 0.0006) {
          vel *= min(1.0, 0.035 / vl);
          float j = ign(gl_FragCoord.xy) - 0.5;
          for (int i = 1; i < 10; i++) col += texture2D(tScene, vUv + vel * ((float(i) + j) / 9.0 - 0.5)).rgb;
          col /= 10.0;
        }
      }
      col = shaded(col, vUv);
      if (uDof.w > 0.0) {
        vec4 b = texture2D(tBlur, vUv);
        col = mix(col, b.rgb, smoothstep(0.1, 0.55, max(abs(coc(d, vUv)), b.a)));
      }
      gl_FragColor = vec4(col, 1.0);
    }`);

  // ---- bloom ------------------------------------------------------------------------
  // Bright pass and first downsample in one: thirteen taps, each thresholded on its own,
  // so a one-pixel neon line keeps its glow and never flickers.
  const bright = mat({ tDiffuse: { value: null }, uThreshold: { value: 1 }, uKnee: { value: 0.5 }, uPx: { value: new THREE.Vector2() } }, `
    uniform sampler2D tDiffuse; uniform float uThreshold; uniform float uKnee; uniform HP vec2 uPx; varying HP vec2 vUv;
    vec3 br(HP vec2 o){
      vec3 c = texture2D(tDiffuse, vUv + o * uPx).rgb;
      float l = max(c.r, max(c.g, c.b));
      float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
      soft = soft * soft / (4.0 * uKnee + 1e-4);
      return min(c * (max(soft, l - uThreshold) / max(l, 1e-4)), vec3(24.0));
    }
    void main(){
      vec3 c = br(vec2(0.0)) * 0.125
        + (br(vec2(-2.0, -2.0)) + br(vec2(2.0, -2.0)) + br(vec2(-2.0, 2.0)) + br(vec2(2.0, 2.0))) * 0.03125
        + (br(vec2(0.0, -2.0)) + br(vec2(-2.0, 0.0)) + br(vec2(2.0, 0.0)) + br(vec2(0.0, 2.0))) * 0.0625
        + (br(vec2(-1.0, -1.0)) + br(vec2(1.0, -1.0)) + br(vec2(-1.0, 1.0)) + br(vec2(1.0, 1.0))) * 0.125;
      gl_FragColor = vec4(c, 1.0);
    }`);
  const downs = mat({ tDiffuse: { value: null }, uPx: { value: new THREE.Vector2() } }, `
    uniform sampler2D tDiffuse; uniform HP vec2 uPx; varying HP vec2 vUv;
    vec3 t(HP vec2 o){ return texture2D(tDiffuse, vUv + o * uPx).rgb; }
    void main(){
      vec3 c = t(vec2(0.0)) * 0.125
        + (t(vec2(-2.0, -2.0)) + t(vec2(2.0, -2.0)) + t(vec2(-2.0, 2.0)) + t(vec2(2.0, 2.0))) * 0.03125
        + (t(vec2(0.0, -2.0)) + t(vec2(-2.0, 0.0)) + t(vec2(2.0, 0.0)) + t(vec2(0.0, 2.0))) * 0.0625
        + (t(vec2(-1.0, -1.0)) + t(vec2(1.0, -1.0)) + t(vec2(-1.0, 1.0)) + t(vec2(1.0, 1.0))) * 0.125;
      gl_FragColor = vec4(c, 1.0);
    }`);
  // Upsample: a 3x3 tent of the level below, plus this level's own light.
  const ups = mat({ tLow: { value: null }, tHere: { value: null }, uPx: { value: new THREE.Vector2() }, uW: { value: 1 }, uLowK: { value: 1 } }, `
    uniform sampler2D tLow; uniform sampler2D tHere; uniform HP vec2 uPx; uniform float uW; uniform float uLowK; varying HP vec2 vUv;
    vec3 t(HP vec2 o){ return texture2D(tLow, vUv + o * uPx).rgb; }
    void main(){
      vec3 c = t(vec2(0.0)) * 4.0 + (t(vec2(1.0, 0.0)) + t(vec2(-1.0, 0.0)) + t(vec2(0.0, 1.0)) + t(vec2(0.0, -1.0))) * 2.0
        + t(vec2(1.0, 1.0)) + t(vec2(-1.0, 1.0)) + t(vec2(1.0, -1.0)) + t(vec2(-1.0, -1.0));
      gl_FragColor = vec4(c * (uLowK / 16.0) + texture2D(tHere, vUv).rgb * uW, 1.0);
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
    float ign(HP vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    void main(){
      HP vec2 delta = (vUv - uLight) / 64.0 * 0.92;
      HP vec2 uv = vUv - delta * ign(gl_FragCoord.xy); float w = 1.0; vec3 acc = vec3(0.0);
      for (int i = 0; i < 64; i++) {
        uv -= delta;
        HP vec2 d = (uv - uLight) * vec2(uAspect, 1.0);
        acc += texture2D(tDiffuse, uv).rgb * w * smoothstep(uRadius, uRadius * 0.25, length(d));
        w *= 0.977;
      }
      gl_FragColor = vec4(acc / 64.0, 1.0);
    }`);
  // A dusty lens: soft specks and smears that only show where the widest glow falls on them.
  const dirt = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, 512, 512);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < 150; i++) {
      const px = rnd() * 512, py = rnd() * 512, r = 5 + rnd() * rnd() * 44, a = 0.05 + rnd() * 0.16;
      const g = x.createRadialGradient(px, py, r * 0.55, px, py, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.8, `rgba(255,255,255,${a * 1.25})`); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.beginPath();
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2 + 0.4; x[k ? "lineTo" : "moveTo"](px + Math.cos(ang) * r, py + Math.sin(ang) * r); }
      x.closePath(); x.fill();
    }
    for (let i = 0; i < 26; i++) {
      const px = rnd() * 512, py = rnd() * 512, r = 40 + rnd() * 90;
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(255,255,255,${0.03 + rnd() * 0.05})`); g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    return t;
  })();
  // All the glow in one half-res texture: the bloom chain, the rays, the streak an
  // anamorphic lens draws through every light, the ghosts a sun throws across the frame,
  // and the dust on the glass.
  const glow = mat({ tBloom: { value: null }, tWide: { value: null }, tRays: { value: null }, uRays: { value: 0 }, uBloom: { value: 1 }, tDirt: { value: dirt }, uDirt: { value: 0 },
    tStreak: { value: null }, uStreak: { value: 0 }, uFlare: { value: 0 }, uLight: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 } }, `
    uniform sampler2D tBloom; uniform sampler2D tWide; uniform sampler2D tRays; uniform sampler2D tStreak; uniform sampler2D tDirt;
    uniform float uRays; uniform float uBloom; uniform float uStreak; uniform float uFlare; uniform float uAspect; uniform float uDirt; uniform HP vec2 uLight; varying HP vec2 vUv;
    float disc(HP vec2 c, float r){ HP vec2 d = (vUv - c) * vec2(uAspect, 1.0); return smoothstep(r, r * 0.55, length(d)); }
    float ring(HP vec2 c, float r, float w){ HP vec2 d = (vUv - c) * vec2(uAspect, 1.0); return smoothstep(w, 0.0, abs(length(d) - r)); }
    void main(){
      vec3 g = texture2D(tBloom, vUv).rgb * uBloom;
      if (uDirt > 0.0) g += texture2D(tWide, vUv).rgb * texture2D(tDirt, vUv * vec2(uAspect, 1.0) * 1.3).r * (uDirt * uBloom);
      if (uRays > 0.0) g += texture2D(tRays, vUv).rgb * uRays;
      if (uStreak > 0.0) {
        vec3 st = texture2D(tStreak, vUv).rgb;
        g += st * vec3(0.72, 0.84, 1.0) * (uStreak * (0.25 + 0.75 * smoothstep(0.1, 1.2, max(st.r, max(st.g, st.b)))));
      }
      if (uFlare > 0.0) {
        vec3 sun = texture2D(tWide, clamp(uLight, 0.0, 1.0)).rgb;
        float vis = uFlare * min(1.0, max(sun.r, max(sun.g, sun.b)) * 2.4);
        if (vis > 0.01) {
          HP vec2 ax = vec2(0.5) - uLight;
          g += (vec3(0.2, 0.75, 1.0) * disc(uLight + ax * 0.55, 0.035) + vec3(1.0, 0.3, 0.75) * disc(uLight + ax * 1.3, 0.07)
            + vec3(1.0, 0.65, 0.25) * disc(uLight + ax * 1.75, 0.12) + vec3(0.45, 0.4, 1.0) * disc(uLight + ax * 2.2, 0.05)
            + vec3(0.5, 0.9, 1.0) * ring(uLight + ax * 2.0, 0.22, 0.012) * 0.6 + vec3(1.0, 0.5, 0.9) * ring(uLight, 0.3, 0.02) * 0.35) * (0.07 * vis);
        }
      }
      gl_FragColor = vec4(g, 1.0);
    }`);
  const final = mat({
    tScene: { value: null }, tGlow: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) }, uSceneRes: { value: new THREE.Vector2(1, 1) }, uNoise: { value: new THREE.Vector2() },
    uAberr: { value: 0 }, uEdge: { value: 0 }, uFlash: { value: 0 }, uExposure: { value: 1 }, uFlicker: { value: 1 }, uSharp: { value: 0 },
    uSat: { value: 1.1 }, uContrast: { value: 1.05 }, uVignette: { value: 1 }, uGlass: { value: 1 },
    uScan: { value: 0.1 }, uCurve: { value: 0.06 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
    uShadow: { value: new THREE.Vector3(0.55, 0.4, 1.0) }, uHigh: { value: new THREE.Vector3(1.0, 0.75, 0.6) }, uSplit: { value: 0.12 },
    uBezel: { value: new THREE.Vector2(16, 1) }, uGlowK: { value: 1 }, uPr: { value: 1 },
    uHitCol: { value: new THREE.Vector3(1, 1, 1) }, uHit: { value: new THREE.Vector3() },
    uFeverCol: { value: new THREE.Vector3(1, 0.5, 0.1) }, uFever: { value: new THREE.Vector2() },
    uRip: { value: new THREE.Vector4(0.5, 0.5, 0, 0) }, uZoom: { value: new THREE.Vector2() },
    uHeat: { value: new THREE.Vector4(0.5, 0.5, 0.1, 0) }, uT: { value: 0 }, uGlitch: { value: 0 }, uGrain: { value: 1 },
  }, `
    uniform sampler2D tScene; uniform sampler2D tGlow;
    uniform HP vec2 uRes; uniform HP vec2 uSceneRes; uniform HP vec2 uNoise; uniform HP vec2 uBezel;
    uniform float uAberr; uniform float uEdge; uniform float uFlash; uniform float uExposure; uniform float uFlicker; uniform float uSharp;
    uniform float uSat; uniform float uContrast; uniform float uVignette; uniform float uGlass; uniform float uPr;
    uniform float uScan; uniform float uCurve; uniform vec3 uTint;
    uniform vec3 uShadow; uniform vec3 uHigh; uniform float uSplit; uniform float uGlowK;
    uniform vec3 uHitCol; uniform vec3 uHit;
    uniform vec3 uFeverCol; uniform HP vec2 uFever;
    uniform HP vec4 uRip; uniform HP vec2 uZoom; uniform HP vec4 uHeat; uniform HP float uT; uniform float uGlitch; uniform float uGrain;
    varying HP vec2 vUv;
    vec3 tex(HP vec2 uv){ return texture2D(tScene, uv).rgb; }
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
      // Where the picture is read from: an impact zooms it toward you for a moment,
      // and a shockwave bends it in a ring that spreads from the blast.
      HP vec2 suv = uv;
      if (uZoom.x > 0.0) suv = 0.5 + (suv - 0.5) * (1.0 - uZoom.x);
      if (uRip.w > 0.0) {
        HP vec2 asp = vec2(uRes.x / uRes.y, 1.0);
        HP vec2 rd = (suv - uRip.xy) * asp;
        HP float ring = (length(rd) - uRip.z) * 14.0;
        suv += normalize(rd + 1e-5) / asp * (ring * exp(-ring * ring) * uRip.w * 0.045);
      }
      if (uGlitch > 0.0) {
        // a wrong answer tears the picture: bands of it slip sideways for a moment
        HP float gb = floor(vUv.y * 26.0) + floor(uT * 12.0) * 7.0;
        HP float gn = fract(sin(gb * 12.9898) * 43758.5453);
        suv.x += (gn - 0.5) * 0.09 * uGlitch * step(0.6, fract(gn * 7.31));
      }
      if (uHeat.w > 0.0) {
        // heat haze: hot air behind an exhaust makes the picture swim
        HP vec2 hd = (suv - uHeat.xy) * vec2(uRes.x / uRes.y, 1.0) / uHeat.z;
        HP float hm = exp(-dot(hd, hd)) * uHeat.w;
        suv += hm * 0.0021 * vec2(sin(suv.y * 150.0 + uT * 12.0) + sin(suv.y * 67.0 - uT * 7.3), cos(suv.x * 110.0 + uT * 9.1));
      }
      vec3 col = fxaa(suv);
      if (uSharp > 0.0) {
        // whatever a pixel has over its four neighbours is laid back on top of it
        HP vec2 sp = 1.0 / uSceneRes;
        vec3 nb = (tex(suv + vec2(sp.x, 0.0)) + tex(suv - vec2(sp.x, 0.0)) + tex(suv + vec2(0.0, sp.y)) + tex(suv - vec2(0.0, sp.y))) * 0.25;
        col = max(col + clamp(col - nb, -0.4, 0.4) * uSharp, 0.0);
      }
      if (uZoom.y > 0.0) {
        // speed: the picture streaks outward from the centre
        HP vec2 zd = (0.5 - suv) * (uZoom.y * 0.045);
        float zj = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        for (int i = 1; i < 12; i++) col += tex(suv + zd * (float(i) + zj) * 0.3);
        col /= 12.0;
      }
      {
        // the lens: colours part company toward the corners (never in the middle), and for a moment on a hit
        HP vec2 cd = suv - 0.5;
        HP float ca = (uAberr + uEdge * dot(cd, cd) * 4.0) * uPr;
        if (ca > 0.05) {
          HP vec2 dv = normalize(cd + 1e-5) * (ca / uRes.x);
          col.r = mix(col.r, tex(suv + dv).r, 0.85); col.b = mix(col.b, tex(suv - dv).b, 0.85);
        }
      }
      col += texture2D(tGlow, suv).rgb * uGlowK;
      col = min(col * uExposure * uTint, vec3(64.0)); // keeps the tone curve inside half-float range
      col = aces(col);
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * mix(uShadow, uHigh, smoothstep(0.05, 0.75, lum)) * 1.25, uSplit);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0);
      if (uHit.x > 0.002) {
        // right/wrong flash: a coloured vignette, strongest at the edges
        float e = smoothstep(0.3, 1.0, length(vUv - 0.5) * 1.4142);
        col = mix(col, uHitCol, uHit.x * mix(uHit.y, uHit.z, e));
      }
      if (uFever.x > 0.0) {
        // streak aura: rays of light sweeping round the screen edge, pulsing
        HP vec2 fc = vUv - 0.5;
        float fr = length(fc) * 1.4142;
        HP float fa = atan(fc.y, fc.x);
        float rays = max(sin(fa * 17.0 + uFever.y * 2.1) * sin(fa * 29.0 - uFever.y * 3.3) + 0.6 * sin(fa * 53.0 + uFever.y * 5.9), 0.0);
        float edge = smoothstep(0.4, 1.02, fr);
        col += uFeverCol * uFever.x * edge * (0.24 + 0.85 * rays * rays) * (0.82 + 0.18 * sin(uFever.y * 9.0));
      }
      if (uGlass > 0.5) {
        // scanlines three CSS pixels tall and a phosphor triad, both at the screen's own pixels
        float s = abs(fract(uv.y * uRes.y / (3.0 * uPr)) * 2.0 - 1.0);
        col *= 1.0 - uScan * (1.0 - s);
        HP float mx = mod(gl_FragCoord.x, 3.0);
        vec3 mask = mx < 1.0 ? vec3(1.0, 0.85, 0.85) : (mx < 2.0 ? vec3(0.85, 1.0, 0.85) : vec3(0.85, 0.85, 1.0));
        col *= mix(vec3(1.0), mask, uScan * 1.1) * uFlicker;
      }
      HP vec2 v = uv * (1.0 - uv.yx);
      col *= mix(1.0, clamp(sqrt(sqrt(v.x * v.y * 18.0)), 0.0, 1.0), uVignette);
      // film grain: finer than a CSS pixel, strongest in the mid tones
      HP float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy + uNoise, vec2(0.06711056, 0.00583715))));
      float gy = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col += (n - 0.5) * (0.012 + 0.03 * gy * (1.0 - gy)) * uGrain + uFlash;
      if (uGlass > 0.5) {
        // the tube: rounded corners, a dark rim and inner shadow, and a sliver of glare
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
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  black.needsUpdate = true;
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
  white.needsUpdate = true;
  const W = [0.26, 0.2, 0.15, 0.11, 0.08, 0.06, 0.05]; // each bloom level's share: tight glow first, then the haze
  let sw = 2, sh = 2;
  return {
    hdr,
    samples,
    mirrorSize: { w: 2, h: 2 },
    resize(w, h) {
      sw = w; sh = h;
      sceneRT.setSize(w, h);
      litRT.setSize(w, h);
      const hw = Math.max(2, w >> 1), hh = Math.max(2, h >> 1);
      aoA.setSize(hw, hh); aoB.setSize(hw, hh);
      halfA.setSize(hw, hh); halfB.setSize(hw, hh);
      glowRT.setSize(hw, hh);
      let mw = w, mh = h;
      down.forEach((d, i) => {
        mw = Math.max(2, mw >> 1); mh = Math.max(2, mh >> 1);
        d.w = mw; d.h = mh;
        d.t.setSize(mw, mh);
        if (i < LEVELS - 1) up[i].setSize(mw, mh);
      });
      raysRT.setSize(down[1].w, down[1].h);
      streakA.setSize(down[2].w, down[2].h);
      streakB.setSize(down[2].w, down[2].h);
      this.mirrorSize.w = Math.max(2, Math.round(w * MIRROR));
      this.mirrorSize.h = Math.max(2, Math.round(h * MIRROR));
      final.uniforms.uSceneRes.value.set(w, h);
      prevCam = null;
    },
    lastCalls: 0, lastTris: 0,
    render(scene, camera, o) {
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      this.lastCalls = renderer.info.render.calls;
      this.lastTris = renderer.info.render.triangles; // (the scene's own, for the readout)
      if (GFX.probe) GFX.probe("scene");
      const p = o.post, opt = o.opt;
      const depth = depthOK ? sceneRT.depthTexture : null;
      const P = camera.projectionMatrix, PI = camera.projectionMatrixInverse;

      // ---- shade from depth: ambient occlusion and contact shadows
      const aoK = depth && opt.ao !== false ? (p.ao !== undefined ? p.ao : 1) : 0;
      const shK = depth && opt.shadows !== false ? (p.shadow !== undefined ? p.shadow : 0.6) : 0;
      let shade = black;
      if (aoK > 0 || shK > 0) {
        const u = ao.uniforms;
        u.tDepth.value = depth; u.uInvProj.value.copy(PI); u.uProj.value.copy(P);
        u.uPx.value.set(1 / sw, 1 / sh); u.uAspect.value = sw / sh;
        u.uRad.value = p.aoRadius || 0.055;
        const sun = p.sun || [0.25, 1, 0.35];
        sunV.set(sun[0], sun[1], sun[2]).transformDirection(camera.matrixWorldInverse);
        u.uSunV.value.copy(sunV);
        u.uShLen.value = shK > 0 ? p.shadowLen || 0.09 : 0;
        pass(ao, aoA);
        const b = aoBlur.uniforms;
        b.tDepth.value = depth; b.uInvProj.value.copy(PI); b.uProj.value.copy(P);
        b.tAO.value = aoA.texture; b.uDir.value.set(2 / sw, 0); pass(aoBlur, aoB);
        b.tAO.value = aoB.texture; b.uDir.value.set(0, 2 / sh); pass(aoBlur, aoA);
        shade = aoA.texture;
        if (GFX.probe) GFX.probe("ao");
      }
      // ---- depth of field
      const D = depth && opt.dof !== false && p.dof && !(p.dof.k <= 0) ? p.dof : null;
      const dofV = lit.uniforms.uDof.value;
      if (D) dofV.set(Math.max(0.01, D.focus), Math.max(1e-3, D.near !== undefined ? D.near : D.focus * 0.6), Math.max(1e-3, D.far !== undefined ? D.far : D.focus * 2), D.k !== undefined ? D.k : 1);
      else dofV.set(1, 1, 1, 0);
      const sky = D && D.sky !== undefined ? D.sky : 1;
      if (D) {
        const u = dofPre.uniforms;
        u.tScene.value = sceneRT.texture; u.tDepth.value = depth; u.tAO.value = shade === black ? white : shade;
        u.uShade.value.set(aoK, shK); u.uInvProj.value.copy(PI); u.uProj.value.copy(P);
        u.uDof.value.copy(dofV); u.uDofSky.value = sky;
        pass(dofPre, halfA);
        const b = dofBlur.uniforms;
        b.tHalf.value = halfA.texture; b.uPx.value.set(2 / sw, 2 / sh);
        b.uUnit.value = ((D.max !== undefined ? D.max : 0.011) * sh * 0.5) / 9.6; // the widest blur, as a fraction of the picture's height
        pass(dofBlur, halfB);
        if (GFX.probe) GFX.probe("dof");
      }
      // ---- the lit picture: shade, camera motion blur, depth of field
      {
        const u = lit.uniforms;
        u.tScene.value = sceneRT.texture; u.tDepth.value = depth; u.uDepthOn.value = depth ? 1 : 0;
        u.tAO.value = shade === black ? white : shade; u.uShade.value.set(aoK, shK);
        u.tBlur.value = D ? halfB.texture : black; u.uDofSky.value = sky;
        u.uInvProj.value.copy(PI); u.uProj.value.copy(P);
        // camera motion blur: a 1/40 s shutter, whatever the frame rate
        curVP.multiplyMatrices(P, camera.matrixWorldInverse);
        let mb = 0;
        if (depth && opt.blur && !o.calm && prevCam === camera && o.dt > 0) {
          mb = (p.mblur !== undefined ? p.mblur : 1) * Math.min(1, 0.025 / o.dt);
          u.uReproj.value.multiplyMatrices(prevVP, tmpM.copy(curVP).invert());
        }
        u.uMBlur.value = mb;
        prevVP.copy(curVP); prevCam = camera;
        pass(lit, litRT);
        if (GFX.probe) GFX.probe("lit");
      }

      // ---- bloom: bright pass, downsample chain, tent upsample chain
      const noBloom = !opt.bloom, wantRays = !!(p.rays && p.rays.pos && opt.beams);
      if (!noBloom || wantRays) {
        const b = bright.uniforms;
        b.tDiffuse.value = litRT.texture;
        b.uThreshold.value = p.threshold !== undefined ? p.threshold : hdr ? 1.0 : 0.62;
        b.uKnee.value = 0.45;
        b.uPx.value.set(1 / sw, 1 / sh);
        pass(bright, down[0].t);
        for (let i = 1; i < LEVELS; i++) {
          downs.uniforms.tDiffuse.value = down[i - 1].t.texture;
          downs.uniforms.uPx.value.set(1 / down[i - 1].w, 1 / down[i - 1].h);
          pass(downs, down[i].t);
        }
        if (!noBloom) {
          let low = down[LEVELS - 1].t.texture, lw = down[LEVELS - 1].w, lh = down[LEVELS - 1].h;
          for (let i = LEVELS - 2; i >= 0; i--) {
            const u = ups.uniforms;
            u.tLow.value = low; u.tHere.value = down[i].t.texture;
            u.uPx.value.set(1 / lw, 1 / lh);
            u.uW.value = W[i];
            u.uLowK.value = i === LEVELS - 2 ? W[LEVELS - 1] : 1; // (the deepest level arrives unweighted)
            pass(ups, up[i]);
            low = up[i].texture; lw = down[i].w; lh = down[i].h;
          }
          // anamorphic streaks: the eighth-res light, smeared sideways in two widening passes
          if (opt.lens) {
            const m = down[2];
            blur.uniforms.tDiffuse.value = m.t.texture;
            blur.uniforms.uDir.value.set(2.2 / m.w, 0);
            pass(blur, streakB);
            blur.uniforms.tDiffuse.value = streakB.texture;
            blur.uniforms.uDir.value.set(5.5 / m.w, 0);
            pass(blur, streakA);
          }
        }
        if (GFX.probe) GFX.probe("bloom");
      }
      // god rays toward a light the scene names (e.g. the sun), when it's on screen
      let raysOn = 0;
      if (wantRays) {
        lightV.copy(p.rays.pos).project(camera);
        if (lightV.z < 1 && Math.abs(lightV.x) < 1.6 && Math.abs(lightV.y) < 1.6) {
          rays.uniforms.tDiffuse.value = down[0].t.texture;
          rays.uniforms.uLight.value.set(lightV.x * 0.5 + 0.5, lightV.y * 0.5 + 0.5);
          rays.uniforms.uRadius.value = p.rays.radius || 0.35;
          rays.uniforms.uAspect.value = sw / sh;
          pass(rays, raysRT);
          raysOn = p.rays.strength !== undefined ? p.rays.strength : 1;
          if (GFX.probe) GFX.probe("rays");
        }
      }
      const bloomK = noBloom ? 0 : p.bloom !== undefined ? p.bloom : 1;
      const u = final.uniforms;
      if (noBloom && !raysOn) {
        u.tGlow.value = black;
        u.uGlowK.value = 0;
      } else {
        const g = glow.uniforms;
        g.tBloom.value = noBloom ? black : up[0].texture;
        g.tWide.value = noBloom ? black : up[3].texture;
        g.tRays.value = raysRT.texture;
        g.uRays.value = raysOn;
        g.uBloom.value = bloomK;
        g.uDirt.value = opt.lens && !noBloom ? (p.dirt !== undefined ? p.dirt : 0.5) : 0;
        g.tStreak.value = streakA.texture;
        g.uStreak.value = opt.lens && !noBloom ? (p.streak !== undefined ? p.streak : 1) * 0.65 : 0;
        g.uFlare.value = raysOn && opt.lens && !noBloom ? (p.rays.flare !== undefined ? p.rays.flare : 1) : 0;
        if (raysOn) g.uLight.value.copy(rays.uniforms.uLight.value);
        g.uAspect.value = sw / sh;
        pass(glow, glowRT);
        if (GFX.probe) GFX.probe("glow");
        u.tGlow.value = glowRT.texture;
        u.uGlowK.value = 1;
      }
      u.tScene.value = litRT.texture;
      u.uSplit.value = p.split !== undefined ? p.split : 0.12;
      const cw = renderer.domElement.width, ch = renderer.domElement.height;
      u.uRes.value.set(cw, ch);
      u.uNoise.value.set(Math.random() * 97, Math.random() * 97);
      u.uFlicker.value = o.calm || !opt.scan ? 1 : 0.99 + 0.01 * Math.sin(o.t * 12); // a slow breath, well under 3 Hz
      u.uGrain.value = opt.grain ? 1 : 0;
      u.uAberr.value = o.ab;
      u.uEdge.value = opt.ca ? (p.fringe !== undefined ? p.fringe : p.crisp ? 0.15 : 0.25) : 0; // (at rest the lens's fringe is a trace in the far corners; a hit is what parts the colours)
      u.uSharp.value = p.sharpen !== undefined ? p.sharpen : 0.3;
      u.uFlash.value = o.flash;
      u.uHitCol.value.set(o.hit.col[0], o.hit.col[1], o.hit.col[2]);
      u.uHit.value.set(o.hitAmt, o.hit.inner, o.hit.outer);
      u.uFeverCol.value.set(o.feverCol[0], o.feverCol[1], o.feverCol[2]);
      u.uFever.value.set(o.fever, o.t % 628.3185);
      u.uRip.value.set(o.rip.x, o.rip.y, o.ripR, o.ripAmp);
      u.uZoom.value.set(o.punch, o.zoomBlur);
      u.uHeat.value.set(o.heat.x, o.heat.y, Math.max(0.01, o.heat.r), o.heat.a);
      u.uT.value = o.t % 628.3185;
      u.uGlitch.value = o.glitch;
      u.uExposure.value = p.exposure !== undefined ? p.exposure : 1.2;
      u.uSat.value = p.saturation !== undefined ? p.saturation : 1.12;
      u.uContrast.value = p.contrast !== undefined ? p.contrast : 1.06;
      u.uVignette.value = opt.vignette ? (p.vignette !== undefined ? p.vignette : 1) : 0;
      if (p.tint) u.uTint.value.set(p.tint[0], p.tint[1], p.tint[2]); else u.uTint.value.set(1, 1, 1);
      u.uGlass.value = o.glass;
      u.uScan.value = opt.scan ? (p.crisp ? 0.05 : 0.09) : 0; // (a crisp scene: fainter scan lines)
      u.uCurve.value = 0.06;
      const cssW = Math.max(1, GFX.w), cssH = Math.max(1, GFX.h), pr = cw / cssW;
      u.uPr.value = pr;
      u.uBezel.value.set(clamp(0.034 * Math.min(cssW, cssH), 16, 40) * pr, pr);
      pass(final, null);
      if (GFX.probe) GFX.probe("final");
    },
  };
}
