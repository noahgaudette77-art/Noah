// A generated panorama (see Assets.loadSky) as a scene's sky, and as the light every glossy surface reflects.
//   const sky = Assets.sky("blaster-deep-1");            // null when it is not loaded: keep the scene's own sky
//   const dome = makePanoSky(sky, { gain: 1.1, lift: 1.6, rot: 0.3 });   scene.add(dome);
//   dome.userData.follow(camera);                         // every frame: the dome stays centred on the lens
//   dome.userData.blend(otherSky, k);                     // cross-fade toward another panorama (0..1)
//   applySkyEnv(scene, sky);                              // reflections and ambient light for lit (PBR) materials
// The picture is looked up by direction, exactly as the reflection map is, so what a chrome hull mirrors is what
// stands behind it. gain scales the whole sky; lift pushes only its brightest parts past white, so stars and the
// hearts of nebulae bloom; tint multiplies it (a boss's colour, a mood); rot turns it about the vertical (radians).
function makePanoSky(sky, o = {}) {
  const noMip = (t) => { if (t.minFilter !== THREE.LinearFilter) { t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; } return t; };
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tA: { value: noMip(sky.map) }, tB: { value: noMip(sky.map) }, uMix: { value: 0 },
      uGain: { value: o.gain === undefined ? 1 : o.gain }, uLift: { value: o.lift === undefined ? 1 : o.lift }, uTint: { value: new THREE.Color(o.tint === undefined ? 0xffffff : o.tint) },
      uRot: { value: (o.rot || 0) / (Math.PI * 2) }, uRotB: { value: 0 }, uDim: { value: new THREE.Vector4(0, 0, 1, 0) },
    },
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }",
    fragmentShader: `uniform sampler2D tA; uniform sampler2D tB; uniform float uMix; uniform float uGain; uniform float uLift; uniform vec3 uTint; uniform float uRot; uniform float uRotB; uniform vec4 uDim; varying vec3 vDir;
      vec3 look(sampler2D t, vec3 d, float rot){
        vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5 + rot, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
        vec3 c = texture2D(t, uv).rgb;
        return c * c * (c * 0.305 + 0.695); // sRGB to linear, near enough
      }
      void main(){
        vec3 d = normalize(vDir);
        vec3 c = look(tA, d, uRot);
        if (uMix > 0.001) c = mix(c, look(tB, d, uRotB), uMix);
        float m = max(max(c.r, c.g), c.b);
        c *= uGain * (1.0 + uLift * smoothstep(0.42, 0.95, m));
        gl_FragColor = vec4(c * uTint, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(o.radius || 400, 48, 24), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -20;
  dome.userData.sky = sky;
  dome.userData.follow = (camera) => dome.position.copy(camera.position);
  dome.userData.blend = (other, k, rot) => { const u = mat.uniforms; if (other && other.map) { u.tB.value = noMip(other.map); u.uRotB.value = (rot || 0) / (Math.PI * 2); u.uMix.value = clamp(k, 0, 1); } else u.uMix.value = 0; };
  dome.userData.set = (p) => { const u = mat.uniforms; if (p.gain !== undefined) u.uGain.value = p.gain; if (p.lift !== undefined) u.uLift.value = p.lift; if (p.tint !== undefined) u.uTint.value.set(p.tint); if (p.rot !== undefined) u.uRot.value = p.rot / (Math.PI * 2); };
  return dome;
}
// The sky's reflection on every lit material in a scene (and, through them, most of its ambient light). A model's
// materials can be given their own strength with tuneModel.
function applySkyEnv(scene, sky) {
  if (sky && sky.env) scene.environment = sky.env;
  return !!(sky && sky.env);
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
      if (o.normal !== undefined && m.normalScale) m.normalScale.set(o.normal, o.normal);
      m.needsUpdate = true;
    });
  });
  return [...seen];
}
