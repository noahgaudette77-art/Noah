// A generated panorama (see Assets.loadSky) as a scene's sky, and as the light every glossy surface reflects.
//   const sky = Assets.sky("blaster-deep-1");            // null when it is not loaded: keep the scene's own sky
//   const dome = makePanoSky(sky, { gain: 1.1, lift: 1.6, rot: 0.3 });   scene.add(dome);
//   dome.userData.follow(camera);                         // every frame: the dome stays centred on the lens
//   dome.userData.blend(otherSky, k);                     // cross-fade toward another panorama (0..1)
//   applySkyEnv(scene, sky);                              // reflections and ambient light for lit (PBR) materials
// The picture is looked up by direction, exactly as the reflection map is, so what a chrome hull mirrors is what
// stands behind it. gain scales the whole sky; lift pushes only its brightest parts past white, so stars and the
// hearts of nebulae bloom; tint multiplies it (a boss's colour, a mood); rot turns it about the vertical (radians).
// window: { u, v, at, zoom, min } shows one part of the picture large, as a long lens would (Boss Rush's arena: only a
// narrow strip of sky stands above its tiers): the picture's place (u, v; v up) that stands straight ahead (-Z) at
// `at` degrees above the horizon, magnified `zoom` times; nothing below the picture's v = min is ever shown. A sky
// made without it is drawn exactly as before.
// pull: 0 to 1, how far the picture's magenta is drawn toward violet (uPull; Risk Blaster's nebula on a wide window:
// magenta is the B answer's colour, and the band there was led by it). Each pixel keeps its brightest and its least
// channel, so only its hue moves; blue, cyan, red and a white star are untouched. A sky made without it is drawn
// exactly as before.
function makePanoSky(sky, o = {}) {
  const noMip = (t) => { if (t.minFilter !== THREE.LinearFilter) { t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; } return t; };
  const win = o.window || null, pull = o.pull !== undefined;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tA: { value: noMip(sky.map) }, tB: { value: noMip(sky.map) }, uMix: { value: 0 },
      uGain: { value: o.gain === undefined ? 1 : o.gain }, uLift: { value: o.lift === undefined ? 1 : o.lift }, uTint: { value: new THREE.Color(o.tint === undefined ? 0xffffff : o.tint) },
      uRot: { value: (o.rot || 0) / (Math.PI * 2) }, uRotB: { value: 0 }, uDim: { value: new THREE.Vector4(0, 0, 1, 0) }, uAlpha: { value: o.alpha === undefined ? 1 : o.alpha },
    },
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, transparent: o.alpha !== undefined, // (alpha: a sky that fades in over the one it replaces)
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }",
    fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; uniform float uGain; uniform float uLift; uniform vec3 uTint; uniform float uRot; uniform float uRotB; uniform vec4 uDim; uniform float uAlpha; varying vec3 vDir;${win ? " uniform vec4 uWin; uniform float uWinMin;" : ""}${pull ? " uniform float uPull;" : ""}
      vec3 look(sampler2D t, vec3 d, float rot){
        ${win
          ? "vec2 uv = vec2(uWin.x + (fract(atan(d.z, d.x) * 0.15915494 + 0.75) - 0.5) * uWin.w, clamp(uWin.y + (asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5 - uWin.z) * uWin.w, uWinMin, 0.998));"
          : "vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5 + rot, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);"}
        vec3 c = texture2D(t, uv).rgb;
        return c * c * (c * 0.305 + 0.695); // sRGB to linear, near enough
      }${pull ? `
      vec3 pullViolet(vec3 c, float k){
        float M = max(c.r, c.b), d = M - c.g;
        if (c.g > min(c.r, c.b) || d < 1e-4) return c; // (only where green is the least: the hues from blue round through violet and magenta to red)
        float x = (c.r - c.b) / d; // (the hue as one number: -1 blue, -0.7 violet, near 0.4 the nebula's magenta, 1 red)
        // toward violet, never past it; reds and pale stars as they were. (The brightest toward a bluer violet: lifted
        // past white, the tone curve draws red and blue together again, and a violet heart came out fuchsia.)
        x = mix(x, -0.7 - 0.2 * smoothstep(0.3, 1.0, M), k * smoothstep(-0.7, -0.4, x) * (1.0 - smoothstep(0.6, 0.9, x)) * smoothstep(0.1, 0.35, d / M));
        return x < 0.0 ? vec3(M + x * d, c.g, M) : vec3(M, c.g, M - x * d);
      }` : ""}
      void main(){
        vec3 d = normalize(vDir);
        vec3 c = look(tA, d, uRot);
        if (uMix > 0.001) c = mix(c, look(tB, d, uRotB), uMix);${pull ? "\n        if (uPull > 0.001) c = pullViolet(c, uPull);" : ""}
        float m = max(max(c.r, c.g), c.b);
        c *= uGain * (1.0 + uLift * smoothstep(0.42, 0.95, m));
        gl_FragColor = linearToOutputTexel(vec4(c * uTint, uAlpha)); // (as it is, in a scene; packed for the target when a reflection map is made from it: see makeEnvMap)
      }`,
  });
  if (win) { mat.uniforms.uWin = { value: new THREE.Vector4(win.u, win.v, 0.5 + (win.at || 0) / 180, win.zoom || 1) }; mat.uniforms.uWinMin = { value: win.min === undefined ? 0.5 : win.min }; }
  if (pull) mat.uniforms.uPull = { value: +o.pull || 0 };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(o.radius || 400, 48, 24), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -20;
  dome.userData.sky = sky;
  dome.userData.follow = (camera) => dome.position.copy(camera.position);
  dome.userData.blend = (other, k, rot) => { const u = mat.uniforms; if (other && other.map) { u.tB.value = noMip(other.map); u.uRotB.value = (rot || 0) / (Math.PI * 2); u.uMix.value = clamp(k, 0, 1); } else u.uMix.value = 0; };
  dome.userData.set = (p) => { const u = mat.uniforms; if (p.alpha !== undefined) u.uAlpha.value = p.alpha; if (p.gain !== undefined) u.uGain.value = p.gain; if (p.lift !== undefined) u.uLift.value = p.lift; if (p.tint !== undefined) u.uTint.value.set(p.tint); if (p.rot !== undefined) u.uRot.value = p.rot / (Math.PI * 2); };
  return dome;
}
// The sky's reflection on every lit material in a scene (and, through them, most of its ambient light). A model's
// materials can be given their own strength with tuneModel.
function applySkyEnv(scene, sky) {
  if (sky && sky.env) scene.environment = sky.env;
  return !!(sky && sky.env);
}
// A loaded model made ready to move. In the file a part is a mesh that carries its own packing transform, so it does
// not turn where it hinges, and the anchors are only listed (model.info.anchors: places in the model's own frame).
//   rigModel(model, { ride: { muzzleL: "cannonL" }, tree: { head: "body" } });
//   model.parts[name]     now a node at the part's hinge (model.info.parts[name].pivot) holding the part: turn or move this
//   model.mesh[name]      the part's mesh
//   model.anchors[name]   an empty node at the anchor. ride hangs it on a part, so it moves with that part
//   model.rest[name]      where the hinge is at rest, in the model's own frame
// tree hangs one part on another (an arm on a body, wings on a back): the model stands as it stood, and now moves as one.
function rigModel(model, o = {}) {
  if (model.rigged) return model;
  const info = model.info || {}, P = info.parts || {}, A = info.anchors || {}, root = model.scene, ride = o.ride || {}, tree = o.tree || {}, v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  model.mesh = {}; model.anchors = {}; model.rest = {};
  for (const name in P) {
    const node = model.parts[name];
    if (!node) continue;
    const pivot = (model.rest[name] = new THREE.Vector3().fromArray(P[name].pivot));
    if (!node.isMesh) { model.mesh[name] = node.children.find((c) => c.isMesh) || null; continue; } // (a joint that already stands at its hinge, its mesh under it)
    const hinge = new THREE.Group(), parent = node.parent;
    hinge.name = name;
    node.name = name + "_mesh";
    hinge.position.copy(parent.worldToLocal(v.copy(pivot)));
    parent.add(hinge);
    hinge.attach(node);
    model.parts[name] = hinge;
    model.mesh[name] = node;
  }
  for (const name in tree) if (model.parts[name] && model.parts[tree[name]]) model.parts[tree[name]].attach(model.parts[name]);
  for (const name in A) {
    const a = new THREE.Object3D(), host = (ride[name] && model.parts[ride[name]]) || root;
    a.name = "anchor_" + name;
    host.updateWorldMatrix(true, false);
    a.position.copy(host.worldToLocal(v.fromArray(A[name])));
    host.add(a);
    model.anchors[name] = model.parts[a.name] = a;
  }
  model.rigged = true;
  return model;
}
// A loaded model's materials set for this renderer: how strongly they mirror the sky, how brightly their light
// strips burn (past white, so they bloom), and nothing drawn twice for nothing.
function tuneModel(model, o = {}) {
  const seen = new Set();
  model.scene.traverse((n) => {
    if (!n.isMesh) return;
    (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
      if (seen.has(m)) return;
      seen.add(m);
      if (o.env !== undefined) m.envMapIntensity = o.env;
      if (m.emissiveMap) { m.emissive.setRGB(1, 1, 1); m.emissiveIntensity = o.glow === undefined ? 2.4 : o.glow; }
      if (o.rough !== undefined) m.roughness = o.rough;
      if (o.metal !== undefined) m.metalness = o.metal;
      if (o.normal !== undefined && m.normalScale) m.normalScale.set(o.normal * (m.normalScale.x < 0 ? -1 : 1), o.normal * (m.normalScale.y < 0 ? -1 : 1)); // (the loader turns one axis over for a model without tangents: that is kept)
      m.needsUpdate = true;
    });
  });
  return [...seen];
}
// A loaded one-mesh model as a geometry to be drawn many times over by an InstancedMesh (Nest Egg Run's traffic, Risk
// Blaster's passing ships and drifting rocks): its mesh's packing undone (positions, normals and uvs in plain floats,
// in the model's own frame), then moved by m (turned and scaled into the game's units). One geometry and the model's
// own material serve every copy: nothing is parsed or textured twice. aRest is the position itself (what blasterSkin
// reads to place light on the shape). Returns { geo, mat, box } or null.
function modelGeometry(model, m) {
  let mesh = null;
  model.scene.updateMatrixWorld(true);
  model.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) return null;
  const src = mesh.geometry, M = new THREE.Matrix4().multiplyMatrices(m || new THREE.Matrix4(), mesh.matrixWorld), N = new THREE.Matrix3().getNormalMatrix(M), v = new THREE.Vector3();
  const unit = (a) => { const r = a.array; return !a.normalized ? 1 : r instanceof Int8Array ? 1 / 127 : r instanceof Uint8Array ? 1 / 255 : r instanceof Int16Array ? 1 / 32767 : r instanceof Uint16Array ? 1 / 65535 : 1; };
  const P = src.attributes.position, NO = src.attributes.normal, UV = src.attributes.uv, n = P.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let k = unit(P);
  for (let i = 0; i < n; i++) { v.set(P.getX(i) * k, P.getY(i) * k, P.getZ(i) * k).applyMatrix4(M); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
  if (NO) { k = unit(NO); for (let i = 0; i < n; i++) { v.set(NO.getX(i) * k, NO.getY(i) * k, NO.getZ(i) * k).applyMatrix3(N).normalize(); nor[i * 3] = v.x; nor[i * 3 + 1] = v.y; nor[i * 3 + 2] = v.z; } }
  if (UV) { k = unit(UV); for (let i = 0; i < n; i++) { uv[i * 2] = UV.getX(i) * k; uv[i * 2 + 1] = UV.getY(i) * k; } }
  const geo = new THREE.BufferGeometry(), at = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute("position", at);
  geo.setAttribute("aRest", at);
  if (NO) geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); else geo.computeVertexNormals();
  if (UV) geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  if (src.index) { const I = src.index; geo.setIndex(new THREE.BufferAttribute(n > 65535 ? Uint32Array.from({ length: I.count }, (_, i) => I.getX(i)) : Uint16Array.from({ length: I.count }, (_, i) => I.getX(i)), 1)); }
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return { geo, mat: Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, box: geo.boundingBox.clone() };
}
