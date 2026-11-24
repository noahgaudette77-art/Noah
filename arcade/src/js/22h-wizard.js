// Boss Rush's wizard (the owner, 2026-11-23): the player's duellist, an original spellcaster in an indigo coat and a
// violet cape (assets/models/wizard.glb, soft-skinned, its eight clips from Tripo's motion presets) with its own wand
// (wand.glb) in its right hand. It stands in the foreground, low on the left of the picture, its back three-quarters
// to the lens and facing the boss, and duels it: everything it does is shown for what the rules have already decided
// (22-boss.js), on the stage's show clock (22f-bossstage.js tells it what happened). Nothing here is read by a rule.
//
//   the entrance   it drops in, in a burst of cyan light, as the boss does, and rises from the landing
//   a question     it holds its wand out at the boss, higher as the attack bar fills; the wand's tip gathers light
//                  (while it is there, the crowd's front row, the arena's old foreground, sinks out of the picture)
//   an answer      it casts: ARC BOLTS, cyan, leave the wand's tip (a wrong answer's sputter and die on the armour)
//   a right one    NOVA LANCE, magenta, from the wand to the boss on the rule's frame; a heavy blow (a big hit, an
//                  enraging or a finishing one) is a big cast, with a rune circle at the wand
//   a blow lands   AEGIS WARD, a wall of green hexagons across the foot of the picture, flares where it strikes,
//                  ripples out from the blow and breaks up (the heart still goes: the rule took it); it reels
//   the boss falls STARFALL: a golden sigil turns over the boss and a column of light comes down through it; at
//                  the last blast it raises its wand
//   out of hearts  it sinks, its wand's light dying and its neon dimming
// The cape and the coat's skirts move in the vertex shader (a flutter mask baked into the model: tools/gen/process-
// skinned.mjs), more as it casts or is struck. A cold rim of light holds its edge against every arena's dark. No light
// of its own (the stage's light budget is spent): its glow is drawn, and the kit's one blast light stays the boss's.
// Reduced effects (or reduced motion): no flutter, no floating runes, fewer sparks, no turning sigils.
// (The stage calls it through wizCall: should anything here fail, the wizard goes and the fight goes on without it.)
const WIZ = {
  BOLT: 0x35efff, NOVA: 0xff3ad4, WARD: 0x4dffa6, STAR: 0xffe14f, MISS: 0x7a5aa8, // the spells' colours, from the arcade's palette (a sputter: a dull violet)
  // where it stands in the picture: x across (-1 left, 1 right); cut: how high up it (metres from its feet) the answers'
  // top edge crosses it while a question is up (it is seen from the hips up: the answers hide the rest); metres from the
  // lens (dist), and when it stands on the floor (distWhole: before the first question and after the last, when the
  // whole screen is the picture; never more than half the way to the boss); how far it is turned from facing the boss
  // (negative: its right side, the wand's, toward the lens)
  SPOT: { x: -0.58, cut: 0.95, dist: 4.2, distWide: 3.2, distWhole: 6.0, turn: -0.45 }, // (distWide: a landscape screen, the Mac's: its picture is a short band, so it comes a metre nearer)
  ROW_SINK: 0.55, // while it is there, the crowd's front row (7.3-7.85 m out, its heads just over the foot of the picture) sinks this far, out of the picture
  READY: [0.6, 0.9], // how far its wand is held out at the boss while a question is read: as it comes up, and as the attack bar fills
  RIM: [0.55, 0.9, 1.0], RIM_K: 1.15, // its rim's colour (a cold cyan-white: it reads against a red arena and a blue one) and strength
  GLOW: 1.9, // its neon's strength (out of hearts, it dims)
  // its own colours (the owner, 2026-11-23: it could barely be seen against the arenas' violet, and need not match
  // them): the model's violet cloth repainted, its folds kept: a gold coat, a vermilion cape, coat-tails and hat (the
  // cape's lining a deeper red), the arenas' violet and blue's opposites; its cyan trim, its steel and its skin as made.
  // A little light of its own (FILL) keeps its colours in the darkest arena. (Tried: ivory, washed out under the
  // arena's lights; crimson, lost in a red arena; emerald.)
  COAT: 0xe2a428, CAPE: 0xff4d1a, LINING: 0xb01c14, FILL: 0.08,
  CAPE_EDGE: [0.02, 0.08], // (where the cape's colour starts on the flutter mask, 0 where the cloth hangs from and 1 at its hem: all of the cape, a clean edge)
};
// a sound of the wizard's set; where that set has not loaded, `alt` (one of the game's own) or nothing
function wizSfx(name, alt, pan, o) { const n = Sound.bank && Sound.bank[name] ? name : alt; if (n) Sound.sfx(n, pan, o); }
// v eased toward `to` (k: how fast: exactly, the same curve at any frame rate); at once the first time
const wizEase = (v, to, d, k) => (v === undefined ? to : Motion.damp(v, to, k, d));
function wizTex(name) {
  const img = Assets.ui(name);
  if (!img) return null;
  const t = new THREE.Texture(img);
  t.needsUpdate = true;
  return t;
}
// a camera-facing picture of one of the spell textures, drawn additively in a colour (a soft glow where there is none)
function wizSprite(tex, color, size) {
  const s = tex ? new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) : glowSprite(color, 1, 1);
  s.scale.setScalar(size); s.visible = false; s.renderOrder = 9;
  return s;
}
// a flat picture lying in a plane (the finisher's sigil over the boss), additive, in a colour
function wizDisc(tex, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uColor: { value: new THREE.Color(color) }, uK: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uColor; uniform float uK; varying vec2 vUv;
      void main(){ float a = ${tex ? "texture2D(uTex, vUv).r" : "pow(max(0.0, 1.0 - length(vUv - 0.5) * 2.0), 2.0)"}; gl_FragColor = vec4(uColor * a * uK, 1.0); }`,
  }));
  m.visible = false; m.renderOrder = 8; m.frustumCulled = false;
  return m;
}
// the ward: a round wall of hexagons facing the lens that flares, ripples out from where the blow struck (uHit) and
// breaks up a cell at a time, nearest the blow first
function wizWard(tex) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uColor: { value: new THREE.Color(WIZ.WARD).multiplyScalar(1.5) }, uK: { value: 0 }, uRip: { value: 0 }, uBreak: { value: 0 }, uHit: { value: new THREE.Vector2(0.5, 0.5) } },
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform sampler2D uTex; uniform vec3 uColor; uniform float uK; uniform float uRip; uniform float uBreak; uniform vec2 uHit; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      void main(){
        vec2 d = vUv - uHit; float r = length(d), front = uRip * 1.1;
        vec2 uv = vUv + d / max(r, 1e-3) * sin(r * 46.0 - uRip * 30.0) * 0.012 * (1.0 - uRip); // (the wall shivers out from the blow)
        float a = ${tex ? "texture2D(uTex, uv).r" : "smoothstep(0.5, 0.45, length(vUv - 0.5)) * (0.3 + 0.7 * step(0.9, fract(r * 14.0)))"};
        float ring = smoothstep(0.04, 0.0, abs(r - front)) * (1.0 - uRip) * step(length(vUv - 0.5), 0.5); // its wave
        float spot = smoothstep(0.14, 0.0, r) * (1.0 - uRip); // the blow itself
        float cells = step(uBreak * 1.5 - r * 0.9, h(floor(vUv * 11.0) + 0.5)); // (breaks up a cell at a time, nearest the blow first)
        gl_FragColor = vec4(uColor * (a * (0.5 + 0.8 * ring) * cells + ring * 0.55 + spot * 1.2) * uK, 1.0);
      }`,
  }));
  m.visible = false; m.renderOrder = 10; m.frustumCulled = false;
  return m;
}
class Wizard {
  constructor(stage, model, wand) {
    const g = (this.g = stage.g), s = g.scene;
    this.st = stage; this.kit = stage.kit;
    this.model = model;
    this.root = new THREE.Group(); this.root.name = "wizard";
    this.root.add(model.scene);
    s.add(this.root);
    this.root.visible = false;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._u = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._m = new THREE.Matrix4();
    // ---- its look: the arena's reflections, its neon lit, a cold rim round its edge, the cape's flutter
    this.mats = tuneModel(model, { env: 1.35, glow: WIZ.GLOW });
    this.flut = { swing: { value: new THREE.Vector3() }, t: { value: 0 }, k: { value: 0.3 }, back: { value: new THREE.Vector3(0, 0, -1) }, side: { value: new THREE.Vector3(1, 0, 0) }, up: { value: new THREE.Vector3(0, 1, 0) }, amp: { value: 0.05 } };
    this.rim = { col: { value: new THREE.Color().fromArray(WIZ.RIM) }, k: { value: WIZ.RIM_K } };
    model.scene.updateMatrixWorld(true);
    model.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false; // (a skinned mesh's bounds are its rest pose's)
      if (!o.isSkinnedMesh) return;
      const geo = o.geometry, fa = geo.getAttribute("_flutter");
      if (fa) { geo.setAttribute("aFlutter", fa); geo.deleteAttribute("_flutter"); }
      // its own axes as the wizard's: the mesh hangs under the model's frame node (turned, scaled)
      const inv = this._m.copy(o.matrixWorld).invert(), sc = o.getWorldScale(this._v).x;
      this.flut.back.value.set(0, 0, -1).transformDirection(inv); this.flut.side.value.set(1, 0, 0).transformDirection(inv); this.flut.up.value.set(0, 1, 0).transformDirection(inv);
      this.flut.amp.value = 1 / Math.max(1e-4, sc); // (the mesh's own units in a metre)
      this.mesh = o;
    });
    const F = this.flut, R = this.rim, has = !!(this.mesh && this.mesh.geometry.getAttribute("aFlutter"));
    const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear(), headBone = this.mesh && this.mesh.skeleton ? Math.max(0, this.mesh.skeleton.bones.indexOf(model.parts[(model.info.joints || {}).head || "Head"])) : 0;
    const C = (this.colors = { coat: { value: lin(WIZ.COAT) }, cape: { value: lin(WIZ.CAPE) }, lining: { value: lin(WIZ.LINING) }, fill: { value: WIZ.FILL }, head: { value: headBone }, edge: { value: new THREE.Vector2().fromArray(WIZ.CAPE_EDGE) } });
    for (const m of this.mats) {
      if (!m.isMeshStandardMaterial) continue;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uFlutT = F.t; sh.uniforms.uFlutK = F.k; sh.uniforms.uFlutSwing = F.swing; sh.uniforms.uFlutBack = F.back; sh.uniforms.uFlutSide = F.side; sh.uniforms.uFlutUp = F.up; sh.uniforms.uFlutAmp = F.amp;
        sh.uniforms.uRimCol = R.col; sh.uniforms.uRimK = R.k;
        sh.uniforms.uWizCoat = C.coat; sh.uniforms.uWizCape = C.cape; sh.uniforms.uWizLining = C.lining; sh.uniforms.uWizFill = C.fill; sh.uniforms.uWizHead = C.head;
        // (where its cape is: the flutter mask, the cape and the coat-tails; and its hat: what hangs from its head bone)
        sh.uniforms.uWizEdge = C.edge;
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vWizCape; uniform float uWizHead; uniform vec2 uWizEdge;" + (has ? "\nattribute float aFlutter;" : ""))
          .replace("#include <skinning_vertex>", `#include <skinning_vertex>
            #ifdef USE_SKINNING
              vWizCape = max(${has ? "smoothstep(uWizEdge.x, uWizEdge.y, aFlutter)" : "0.0"}, smoothstep(0.5, 0.8, dot(vec4(equal(skinIndex, vec4(uWizHead))), skinWeight)));
            #else
              vWizCape = 0.0;
            #endif`);
        // (the wave's height and breadth are read from the skinned point, in the mesh's own units: the stored one is packed)
        if (has) sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uFlutT; uniform float uFlutK; uniform vec3 uFlutBack; uniform vec3 uFlutSide; uniform vec3 uFlutUp; uniform float uFlutAmp; uniform vec3 uFlutSwing;")
          .replace("#include <skinning_vertex>", `#include <skinning_vertex>
            { // the cape and the skirts move in the wind of the spells: a wave running down them, stronger at the hem
              float w = aFlutter * uFlutK, hgt = dot(transformed, uFlutUp) / uFlutAmp, across = dot(transformed, uFlutSide) / uFlutAmp; // (metres)
              float a = sin(uFlutT * 3.1 - hgt * 4.2 + across * 2.0), b = sin(uFlutT * 2.3 - hgt * 3.1 + 1.3);
              transformed += (uFlutBack * (0.055 + 0.045 * a) + uFlutSide * 0.035 * b + uFlutUp * 0.012 * a) * (w * uFlutAmp); // (metres, in the mesh's units)
              transformed += uFlutSwing * (aFlutter * aFlutter); // (it trails its moves: the hem's own lag, from the spring)
            }`);
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uRimCol; uniform float uRimK; uniform vec3 uWizCoat; uniform vec3 uWizCape; uniform vec3 uWizLining; uniform float uWizFill; varying float vWizCape;")
          .replace("#include <map_fragment>", `#include <map_fragment>
            { // its colours, its own: the model's violet cloth (violet, indigo, magenta; never its cyan trim, steel or skin)
              // repainted, its folds kept: a light coat, a vivid cape, coat-tails and hat, the cape's lining deeper
              vec3 c = diffuseColor.rgb;
              float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), dd = mx - mn, sat = dd / max(mx, 1e-4);
              float hue = mx == c.r ? mod((c.g - c.b) / max(dd, 1e-5), 6.0) : mx == c.g ? (c.b - c.r) / max(dd, 1e-5) + 2.0 : (c.r - c.g) / max(dd, 1e-5) + 4.0;
              hue /= 6.0;
              float cloth = smoothstep(0.16, 0.3, sat) * smoothstep(0.6, 0.65, hue) * (1.0 - smoothstep(0.95, 0.99, hue));
              float shade = clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)) / 0.075, 0.22, 1.0); // (its folds, as the cloth was painted: never brighter than the colour itself)
              vec3 tgt = mix(uWizCoat, mix(uWizCape, uWizLining, smoothstep(0.84, 0.88, hue)), vWizCape);
              diffuseColor.rgb = mix(c, tgt * shade, cloth);
            }`)
          .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
            totalEmissiveRadiance += diffuseColor.rgb * uWizFill; // (a little light of its own: its colours hold in the darkest arena)`)
          .replace("#include <tonemapping_fragment>", `{ // a cold rim of light round its edge
              float fr = 1.0 - clamp(dot(normalize(geometry.normal), geometry.viewDir), 0.0, 1.0);
              gl_FragColor.rgb += uRimCol * uRimK * (0.6 * pow(max(fr, 0.0), 3.0) + 0.35 * fr * fr * diffuseColor.rgb);
            }
            #include <tonemapping_fragment>`);
      };
      m.customProgramCacheKey = () => "wizard-4" + (has ? "f" : "");
      m.needsUpdate = true;
    }
    // ---- its clips, blended by hand: the idle always under; one clip at a time played through over it; while a
    // question is read, a second copy of the cast held at its release (its wand held out), more as the bar fills.
    // Each clip as made holds its hips somewhere of its own, and the big cast its root a little turned: each is moved to
    // stand where the idle stands, so going from one to another does not slide the body (the feet, under the answers,
    // take the difference). The entrance is a jump down from a ledge that lands a metre under where the idle stands:
    // it is moved to land there instead, and so drops in from above.
    const J = model.info.joints || {}, hipT = (J.hips || "Hip") + ".position", rootQ = "BoneRoot.quaternion", trackOf = (c, n) => c && c.tracks.find((tr) => tr.name === n);
    const idleClip = model.animations.find((c) => c.name === "idle"), hi = trackOf(idleClip, hipT), ri = trackOf(idleClip, rootQ);
    if (hi) for (const c of model.animations) {
      const h = trackOf(c, hipT);
      if (c === idleClip || !h) continue;
      const v = h.values, n = v.length, at = c.name === "enter" ? n - 3 : 0; // (the entrance by its last key, the rest by their first)
      const r = trackOf(c, rootQ);
      if (r && ri && c.name !== "enter") { const fix = new THREE.Quaternion().fromArray(ri.values, 0).multiply(new THREE.Quaternion().fromArray(r.values, 0).invert()), q = new THREE.Quaternion(); for (let i = 0; i < r.values.length; i += 4) q.fromArray(r.values, i).premultiply(fix).toArray(r.values, i); }
      for (let k = 0; k < 3; k++) { const dv = hi.values[k] - v[at + k]; for (let i = k; i < n; i += 3) v[i] += dv; }
    }
    this.mixer = new THREE.AnimationMixer(model.scene);
    this.act = {};
    for (const c of model.animations) {
      const a = this.mixer.clipAction(c);
      if (c.name !== "idle") { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } // (played through once, and held)
      a.play(); a.setEffectiveWeight(0); this.act[c.name] = a;
    }
    if (this.act.idle) { this.act.idle.setEffectiveWeight(1); this.act.idle.time = rand(0, 4); }
    // (a twin of each clip that can come again while it still plays, the lance's cast after the answer's: the twin starts
    // from its own moment while the first fades out under it, never a jump back in one clip)
    this.twin = {};
    for (const n of ["cast", "bigcast", "hurt", "stagger"]) { const a = this.act[n]; if (!a) continue; const c = a.getClip().clone(); c.name = n + "~"; const t = this.mixer.clipAction(c); t.setLoop(THREE.LoopOnce); t.clampWhenFinished = true; t.play(); t.setEffectiveWeight(0); this.twin[n] = t; }
    this.one = null; // the clip over the idle: { a, to, w, in, outDur, hold, out, name }
    this.going = []; // clips cut short, fading out under it: { a, w, dur }
    this.readyW = 0;
    // ---- the wand in its right hand, along the hand's line, its grip in the palm
    const P = model.parts, hand = P[J.handR || "R_Hand"], fore = P.R_Forearm;
    this.hand = hand || model.scene;
    this.headBone = P[J.head || "Head"] || null;
    this.tipNode = null;
    if (wand && hand) {
      const hp = hand.getWorldPosition(new THREE.Vector3()), fp = (fore || hand.parent).getWorldPosition(new THREE.Vector3());
      const inv = new THREE.Matrix4().copy(hand.matrixWorld).invert(), dir = hp.sub(fp).normalize().transformDirection(inv), hs = hand.getWorldScale(new THREE.Vector3()).x;
      const holder = new THREE.Group();
      holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      holder.position.copy(dir).multiplyScalar(0.075 / hs); // (into the palm)
      holder.scale.setScalar(1 / hs); // (the wand's own metres)
      const A = (wand.info && wand.info.anchors) || {}, grip = A.grip || [0, 0, -0.14];
      wand.scene.position.set(-grip[0], -grip[1], -grip[2]); // (its grip at the holder)
      wand.scene.rotation.z = 0.3;
      holder.add(wand.scene);
      hand.add(holder);
      this.holder = holder;
      this.wandMats = tuneModel(wand, { env: 1.6, glow: 2.2 });
      wand.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      this.tipNode = new THREE.Object3D(); this.tipNode.position.fromArray(A.tip || [0, 0, 0.21]); wand.scene.add(this.tipNode);
    }
    // its casts' key moments, found now (not at the first answer), and the held cast of a question read
    this.keys = { cast: this.sample("cast"), bigcast: this.sample("bigcast") };
    const castClip = model.animations.find((c) => c.name === "cast");
    if (castClip) { const rc = castClip.clone(); rc.name = "ready"; const a = (this.readyAct = this.mixer.clipAction(rc)); a.play(); a.paused = true; a.time = this.keys.cast.release; a.setEffectiveWeight(0); }
    // ---- its light, drawn: the tip's glow and star, runes round the hand, the rune circle of a cast, the ward, the sigil
    const tex = (this.tex = { runes: wizTex("fx-runes"), ward: wizTex("fx-ward"), star: wizTex("fx-star") });
    this.glow = glowSprite(neon(WIZ.BOLT, 2.2), 0.3, 1); this.glow.renderOrder = 9; this.glow.visible = false;
    this.star = wizSprite(tex.star, neon(WIZ.BOLT, 1.6), 0.5);
    this.circles = [0, 1].map(() => wizSprite(tex.runes, neon(WIZ.BOLT, 1.4), 0.6));
    this.runes = [0, 1, 2].map((i) => ({ sp: wizSprite(tex.runes, neon(WIZ.BOLT, 0.9), 0.14), ph: (i / 3) * Math.PI * 2 }));
    this.ward = wizWard(tex.ward);
    this.sigil = wizDisc(tex.runes, neon(WIZ.STAR, 1.6));
    this.flare = wizSprite(tex.star, neon(WIZ.STAR, 1.6), 3);
    this.sprites = [this.glow, this.star, ...this.circles, ...this.runes.map((r) => r.sp), this.ward, this.sigil, this.flare];
    for (const o of this.sprites) s.add(o);
    this.root.traverse((o) => o.layers.set(1)); // (drawn once, in the picture: never in the floor's mirror, where it would be off the picture and cost a second skinned draw)
    for (const o of this.sprites) if (o !== this.sigil) o.layers.set(1);
    this.fx = []; // what is fading: { o, t, dur, fn(o, k) }
    this.lance = null; // the stage's lance while it is drawn: its root kept at the wand's tip
    this.charge = 0; this.flare0 = 0; this.whip = 0; this.sink = 0; this.lost = false; this.won = false;
    this.spot = Object.assign({}, WIZ.SPOT); // (its own copy: a test can move it)
    this.life0(model);
    this.place();
  }
  // ---- its own life over its clips (the animation pass, 2026-11-23: it held its poses like a statue): the bones it
  // lives through, each turned about its own axes (Motion.Turns); its springs (a blow's give, a cast's lunge, its gaze,
  // a hop); its flinch as a layer over whatever it is doing (a blow mid-cast does not stop the cast); its wand's tip and
  // its cape's hem, each trailing on a spring
  life0(model) {
    const P = model.parts, B = (this.B = { waist: P.Waist, sp1: P.Spine01, sp2: P.Spine02, neck: P.NeckTwist01, head: this.headBone });
    model.scene.updateMatrixWorld(true);
    const T = (this.turns = new Motion.Turns(model.scene)), v = new THREE.Vector3(), v2 = new THREE.Vector3();
    Object.values(B).forEach((b) => T.add(b));
    this.clav = [];
    for (const sd of ["L", "R"]) {
      const c = P[sd + "_Clavicle"], up = P[sd + "_Upperarm"];
      if (!c || !up) continue;
      T.add(c);
      const x = model.scene.worldToLocal(up.getWorldPosition(v)).x - model.scene.worldToLocal(c.getWorldPosition(v2)).x;
      this.clav.push({ bone: c, side: x >= 0 ? 1 : -1 });
    }
    const Sp = Motion.Spring;
    this.S = { pitch: new Sp(2.2, 0.4), yaw: new Sp(2.0, 0.42), roll: new Sp(2.5, 0.4), head: new Sp(3.2, 0.34), lunge: new Sp(1.7, 0.45), lookY: new Sp(1.2, 0.92), lookX: new Sp(1.2, 0.92), hop: new Sp(2.4, 0.32) };
    // (its flinches: a blow to the body, to the gut, from the side; one of them each time, its own way; a second blow
    // takes over from the first)
    const fc = {};
    for (const n of ["hurt", "hurtG", "hurtS"]) if (this.act[n]) fc[n] = this.act[n].getClip();
    this.flinch = new Motion.Layers(this.mixer, fc, B.waist);
    this.seed = 4243; this.nCast = 0; this.nHit = 0; this.exert = 0; this.brace = 0; this.lostT = 0; this.lt = 0;
    this.invQ = new THREE.Quaternion(); this._t1 = new THREE.Vector3(); this._t2 = new THREE.Vector3(); this._t3 = new THREE.Vector3(); this._q2 = new THREE.Quaternion(); this._q3 = new THREE.Quaternion();
    // the wand's tip as the hand holds it (in the hand's frame): it trails the hand on a spring and whips past it when the
    // hand stops; the holder is turned to point at it (a flick of the wrist)
    if (this.holder && this.tipNode) { this.hand.updateWorldMatrix(true, true); this.tipRest = this.hand.worldToLocal(this.tipNode.getWorldPosition(v)).clone(); this.holderQ = this.holder.quaternion.clone(); this.tipF = new Motion.Follow(4.2, 0.3); }
    // the cape's hem as the chest carries it: a point below and behind the chest, in the chest's own frame; it trails on
    // a spring, and the cape swings by how far it trails, more toward its hem (the vertex shader: uFlutSwing)
    if (B.sp2 && this.mesh) {
      const h = (model.info && model.info.height) || 2, c = B.sp2.getWorldPosition(v), back = v2.set(0, 0, -1).applyQuaternion(model.scene.getWorldQuaternion(this._q2));
      this.hemRest = B.sp2.worldToLocal(c.clone().add(new THREE.Vector3(0, -0.42 * h, 0)).addScaledVector(back, 0.12 * h)).clone();
      this.hemF = new Motion.Follow(1.6, 0.28);
    }
  }
  get quiet() { return REDUCED_MOTION || GFX.calm; }
  // where its head is, in the world (the boss's gaze follows it)
  headAt(out) { const h = this.headBone || this.hand; return h.getWorldPosition(out); }
  // where its wand's tip is, in the world
  tip(out) { const o = out || new THREE.Vector3(); if (this.tipNode) this.tipNode.getWorldPosition(o); else this.hand.getWorldPosition(o); return o; }
  // a clip played through over the idle: from `from` to `to` (seconds into it), at `rate`; `in` its fade in (0: at
  // once), `out` its fade out; `hold` keeps its end
  play(name, o = {}) {
    let a = this.act[name];
    if (!a) return;
    const tw = this.twin && this.twin[name];
    if (tw && ((this.one && this.one.a === a) || this.going.some((q) => q.a === a))) a = tw; // (it still plays: its twin takes over)
    const old = this.one, clip = a.getClip(), fadeIn = o.in === undefined ? 0.12 : o.in;
    if (old && old.a !== a && old.w > 0) { this.going = this.going.filter((q) => q.a !== old.a); this.going.push({ a: old.a, w: old.w, dur: 0.18 }); }
    this.going = this.going.filter((q) => { if (q.a === a) { a.setEffectiveWeight(0); return false; } return true; });
    a.enabled = true; a.paused = false; a.time = clamp(o.from || 0, 0, clip.duration); a.setEffectiveTimeScale(o.rate || 1);
    this.one = { a, to: Math.min(o.to || clip.duration, clip.duration), w: old && old.a === a ? old.w : fadeIn > 0 ? 0 : 1, in: fadeIn, outDur: o.out || 0.3, hold: !!o.hold, out: 0, name };
  }
  // ---- what happens (the stage calls these) ----------------------------------------------------------------------
  // the fight starts: it drops in, in a column of cyan light, as the boss drops in (its jump at once: no idle first)
  enter() {
    const g = this.g;
    g.show.wait(0.12, () => {
      if (g.unmounted) return;
      this.root.visible = true;
      this.play("enter", { from: 1.55, rate: 1.25, in: 0, out: 0.45 });
      this.whip = 1; this.flare0 = 1;
      const p = this.root.position, kit = this.kit, quiet = this.quiet;
      for (let i = 0; i < (quiet ? 2 : 5); i++) {
        const q = this._v.set(p.x + rand(-0.3, 0.3), p.y + 0.6 + i * 0.32, p.z + rand(-0.2, 0.2));
        kit.sparks(q, WIZ.BOLT, { n: quiet ? 3 : 7, speed: 2.2, dir: this._w.set(0, 1, 0), spread: 1.4, life: 0.5, len: 0.18, w: 0.03, k: 1.7 });
      }
      kit.flash(this._v.set(p.x, p.y + 1.4, p.z), WIZ.BOLT, 0.3, 1.6, 0.25, 0.8, 1.6);
      this.ring(this._v.set(p.x, p.y + 1.25, p.z), WIZ.BOLT, 2.6, 0.55);
      wizSfx("wiz_appear", "whoosh", -0.5, { vol: 0.9 });
    });
  }
  // a question is up: it holds its wand out at the boss (animate), the tip gathering light, a low hum as it starts
  ready() {
    this.charge = 0;
    if (this.root.visible && !this.lost) wizSfx("wiz_charge", null, -0.4, { vol: 0.32, delay: 0.25 });
  }
  // the player answers: right or wrong, it casts (the bolts are the stage's volley, from this wand: bolt)
  cast(right) {
    const k = this.keys.cast, n = ++this.nCast, sd = this.seed;
    this.play("cast", { from: k.release - 0.04, to: k.release + 0.55, rate: 1.6 * Motion.vary(sd, n, 0.94, 1.1), in: 0.09, out: 0.35 }); // (its arm is out as the first bolt leaves, from about where the held cast has it: no snap back; each cast a little its own)
    this.S.lunge.hit(0.035 * Motion.vary(sd, n + 5, 0.8, 1.2)); this.S.yaw.hit(Motion.vary(sd, n + 7, -0.04, 0.04)); // (it throws itself into it)
    this.whip = Math.max(this.whip, 0.7); this.charge = 0;
    this.flare0 = Math.max(this.flare0, right ? 0.6 : 0.2);
    wizSfx("wiz_whoosh", null, -0.4, { vol: 0.75 });
  }
  // an ARC BOLT, the stage's volley (one of three for a right answer; a wrong one's single bolt, dim, will fizzle). The
  // first leaves with a rune circle at the tip, or (wrong) a sputter: the spell will not take
  bolt(from, to, sh, n, onHit) {
    const kit = this.kit, right = sh.right, dir = this._w.subVectors(to, from).normalize();
    kit.muzzle(from, dir, sh.col, right ? 0.22 : 0.13);
    kit.bolt(from, to, sh.col, { dur: right ? 0.08 : 0.1, width: right ? 0.17 : 0.12, len: 3.4, k: right ? 2.8 : 1.5, onHit }); // (the last of three has landed before the lance)
    this.flare0 = Math.max(this.flare0, right ? 0.8 : 0.25);
    wizSfx("wiz_bolt", "laser_fire", -0.4, { vol: right ? 0.8 : 0.55, rate: (right ? 1 : 0.85) + n * 0.06 });
    if (n > 0) return;
    if (right) this.ring(from, WIZ.BOLT, 0.55, 0.28);
    else {
      kit.sparks(from, WIZ.MISS, { n: this.quiet ? 3 : 7, speed: 2.4, life: 0.35, len: 0.12, w: 0.022, gravity: 6, k: 1.3, stretch: 0.02 });
      kit.smoke(from, { size: 0.32, life: 0.6, rise: 0.4, a: 0.4, dark: 0.1, cold: true });
      wizSfx("wiz_fizzle", null, -0.4, { vol: 0.8, delay: 0.06 });
    }
  }
  // the blow lands (the rule's frame): the NOVA LANCE leaves the wand (the stage draws it: `lance`, kept at the wand's
  // tip while it lasts); a heavy blow is a big cast. Its strike's sound: the wizard's for a blow, the stage's own big one
  // for a heavy blow (never both)
  nova(big, at, lance) {
    const p = this.tip(this._u), kit = this.kit, name = big ? "bigcast" : "cast", k = this.keys[name];
    this.play(name, { from: k.release - (big ? 0.12 : 0.08), to: k.release + (big ? 0.75 : 0.5), rate: big ? 1.3 : 1.5, out: 0.4 });
    this.whip = 1; this.flare0 = 1;
    this.S.lunge.hit(big ? 0.075 : 0.045); this.exert = Math.max(this.exert, big ? 1 : 0.5); // (its weight behind the lance; then it breathes hard)
    this.ring(p, WIZ.NOVA, big ? 1.5 : 0.9, big ? 0.5 : 0.32);
    kit.flash(p, WIZ.NOVA, 0.12, big ? 0.9 : 0.6, 0.12, 0.9, 1.8); // (drawn only: the kit's one blast light is the boss's, where the lance lands)
    if (lance && at) this.lance = { h: lance, to: at.clone(), t: 0 }; // (for its own life only: 0.15 s; the kit's beams are pooled)
    wizSfx("wiz_nova", null, -0.3, { vol: big ? 0.95 : 0.75 });
    if (!big) wizSfx("wiz_impact", null, 0, { vol: 0.9, delay: 0.04 });
    if (big && at && !this.quiet) for (let i = 1; i < 3; i++) this.g.show.wait(0.05 * i, () => { if (!this.g.unmounted) kit.sparks(at, i % 2 ? 0xffffff : WIZ.NOVA, { n: 8, speed: 9, life: 0.4, len: 0.6, w: 0.05, gravity: 4 }); });
  }
  // the boss's blow lands (the heart the rule took is seen to go): AEGIS WARD, a wall of hexagons across the foot of
  // the picture where it strikes, rippling out from the blow and breaking up; it reels
  shield(left) {
    const g = this.g, st = this.st, w = this.ward, u = w.material.uniforms, quiet = this.quiet, D = 4.2, tb = st.tb(), t = tb / ((g.band ? g.band.h : GFX.h) / GFX.h);
    const halfW = D * t * (GFX.w / GFX.h), halfB = D * tb, R = Math.min(1.15 * halfW, 1.5 * halfB), cy = -0.45, hitY = -0.9;
    st.lens(0, cy, D, w.position);
    w.quaternion.copy(g.camera.quaternion); w.scale.setScalar(2 * R);
    u.uHit.value.set(0.5, 0.5 + ((hitY - cy) * halfB) / (2 * R));
    w.visible = true;
    this.fade(w, 0.6, (o, k) => { u.uK.value = (k < 0.1 ? k / 0.1 : 1 - smoothstep(0.1, 1, k)) * (quiet ? 0.6 : 0.85); u.uRip.value = k; u.uBreak.value = smoothstep(0.25, 1, k) * (left <= 1 ? 1.15 : 1); });
    const hp = st.lens(0, hitY, D, this._v);
    this.kit.sparks(hp, WIZ.WARD, { n: quiet ? 5 : 14, speed: 3.2, dir: this._w.set(0, 1, 0.3).normalize(), spread: 1.4, life: 0.4, len: 0.16, w: 0.022, gravity: 3, k: 1.6, stretch: 0.02 });
    // it flinches: a layer over whatever it is doing (a blow mid-cast does not stop the cast), its spine giving back,
    // turned and tipped a little its own way each time, its head snapping back; on its last heart it staggers
    const n = ++this.nHit, sd = this.seed, side = Motion.vary(sd, n + 3, 0, 1) < 0.5 ? -1 : 1, k = left <= 1 ? 1.3 : Motion.vary(sd, n, 0.8, 1.15);
    const kinds = this.flinch.names();
    if (left <= 1 || !kinds.length) this.play(left <= 1 ? "stagger" : "hurt", { from: 0.12, rate: 1.4, out: 0.35 });
    else this.flinch.play(kinds[Math.floor(Motion.vary(sd, n + 21, 0, kinds.length - 1e-6))], { from: 0.08, rate: 1.35 * Motion.vary(sd, n + 9, 0.9, 1.12), in: 0.06, out: 0.3, k: 0.95 });
    this.S.pitch.hit(-0.09 * k); this.S.yaw.hit(0.08 * k * side); this.S.roll.hit(0.05 * k * side); this.S.head.hit(-0.13 * k);
    this.whip = 1; this.flare0 = Math.max(this.flare0, 0.5);
    wizSfx("wiz_ward", null, -0.2, { vol: 0.8 });
  }
  // the boss is finished: STARFALL, a golden sigil over it and a column of light down through it as it falls
  finisher() {
    const g = this.g, st = this.st, a = st.a, S = st.S, kit = this.kit, quiet = this.quiet;
    const k = this.keys.cast;
    this.play("cast", { from: k.release - 0.3, to: k.release + 0.02, rate: 0.9, in: 0.15, hold: true }); // (its wand held out at the boss as the light comes down; at the last blast it raises it: win)
    this.whip = 1; this.flare0 = 1;
    wizSfx("wiz_charge", null, -0.4, { vol: 0.6 });
    wizSfx("wiz_finisher", null, 0, { vol: 1, delay: 0.2 });
    const hips = a.at("hips", new THREE.Vector3()), top = new THREE.Vector3(hips.x, S * 1.55, hips.z + 0.3 * S);
    const sg = this.sigil;
    sg.position.copy(top); sg.rotation.set(-Math.PI / 2, 0, 0); sg.scale.setScalar(S * 0.7); sg.visible = true;
    this.fade(sg, 1.3, (o, q) => { o.material.uniforms.uK.value = q < 0.25 ? q / 0.25 : 1 - (q - 0.25) / 0.75; if (!quiet) o.rotation.z = q * 2.2; o.scale.setScalar(S * (0.7 + 0.3 * Math.min(1, q * 3))); });
    g.show.wait(0.28, () => {
      if (g.unmounted) return;
      kit.beam(top, hips, WIZ.STAR, { dur: 0.42, width: 0.9, grow: 0.06, k: 1.7 }); // the column of light
      kit.wave(hips, null, WIZ.STAR, { dur: 0.55, s0: 0.8, s1: 9, w: 0.05, k: 0.9 });
      kit.sparks(hips, 0xffffff, { n: quiet ? 8 : 20, speed: 14, life: 0.5, len: 1.2, w: 0.05, gravity: 5 });
      const f = this.flare;
      f.position.copy(hips); f.visible = true;
      this.fade(f, 0.5, (o, q) => { o.material.opacity = 1 - q; o.scale.setScalar(S * (0.5 + 0.6 * q)); o.material.rotation = q * 0.8; });
      GFX.pulse(1.6, 0); // (a lift of light, capped: the death's own blasts follow)
      g.shake(0.12);
    });
  }
  // the boss is down (its last blast): it raises its wand
  win() {
    if (this.won || this.lost) return;
    this.won = true;
    this.play("win", { from: 0.3, rate: 1.1, hold: true });
    this.flare0 = 1;
    this.S.hop.hit(0.07); // (a little jump of it)
    this.ring(this.tip(this._u), WIZ.STAR, 1.1, 0.7);
  }
  // out of hearts: it sinks, its wand's light dying
  lose() {
    this.lost = true;
    this.play("defeat", { from: 0.4, rate: 1.2, hold: true });
    wizSfx("wiz_defeat", null, -0.4, { vol: 0.85, delay: 0.2 });
  }
  // gone (something in it failed: the stage drops it and fights on without it)
  hide() { this.root.visible = false; for (const o of this.sprites) o.visible = false; this.fx.length = 0; this.lance = null; if (this.rowTop !== undefined && this.g.frontRow) this.g.frontRow.userData.top = this.rowTop; }
  // ---- helpers ---------------------------------------------------------------------------------------------------
  // a rune circle at a point, in a colour, turning as it grows and fades
  ring(p, color, size, dur) {
    const c = this.circles[(this.ci = ((this.ci || 0) + 1) % this.circles.length)], quiet = this.quiet;
    c.position.copy(p); c.material.color.copy(neon(color, 1.5)); c.visible = true;
    this.fade(c, dur, (o, k) => { o.material.opacity = (1 - k) * (k < 0.15 ? k / 0.15 : 1); o.scale.setScalar(size * (0.45 + 0.75 * Math.sqrt(k))); if (!quiet) o.material.rotation = k * 1.6; });
  }
  fade(o, dur, fn) {
    const old = this.fx.find((f) => f.o === o);
    if (old) { old.t = 0; old.dur = dur; old.fn = fn; return; }
    this.fx.push({ o, t: 0, dur, fn });
  }
  // a clip's key moment, sampled once as the fight is built: the instant the casting arm is furthest out toward where it faces
  sample(name) {
    const a = this.act[name], out = { release: 0.5 };
    if (!a || !this.hand) return out;
    const clip = a.getClip(), w0 = {}, t0 = a.time, inv = new THREE.Matrix4(), p = new THREE.Vector3();
    for (const n in this.act) { w0[n] = this.act[n].getEffectiveWeight(); this.act[n].setEffectiveWeight(n === name ? 1 : 0); }
    this.root.updateMatrixWorld(true);
    inv.copy(this.root.matrixWorld).invert();
    let best = -1e9;
    for (let t = 0; t <= clip.duration; t += clip.duration / 48) {
      a.time = t; this.mixer.update(0);
      this.model.scene.updateMatrixWorld(true);
      this.hand.getWorldPosition(p).applyMatrix4(inv);
      const reach = p.z + 0.35 * p.y; // (forward, and up: a cast is thrust out and a little high)
      if (reach > best) { best = reach; out.release = t; }
    }
    a.time = t0; a.paused = false;
    for (const n in this.act) this.act[n].setEffectiveWeight(w0[n]);
    this.mixer.update(0);
    return out;
  }
  // its place in the picture, from the steady lens (where it looks from and at, before its shake), low on the left,
  // facing the boss and turned a little toward the lens; it keeps its place as the lens moves. While the answers are up,
  // its hips at their top edge (the band's foot, at its distance from the lens: the lens's axis meets the screen at the
  // band's middle); when the whole screen is the picture, standing on the floor a little further off (but always nearer
  // the lens than the boss), or hips-up at the foot of the screen where standing would take it out of the picture. It
  // moves between them over half a second.
  place(d) {
    const g = this.g, cam = g.camera, sp = this.spot, t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), b = g.band;
    const Z = Math.max(4, g.camZ || g.camBase.z), whole = !b || g.state === "intro" || g.state === "over" ? 1 : 0;
    this.ground = wizEase(this.ground, whole, d, 3);
    // (its hips at the foot of the picture: the answers' top edge, or the foot of the screen when it is all picture)
    const D = lerp(GFX.w > GFX.h * 1.2 ? sp.distWide : sp.dist, Math.min(sp.distWhole, 0.5 * Z), this.ground), mid = b ? (b.top + b.bottom) / 2 : GFX.h / 2, footPx = lerp(b ? b.bottom : GFX.h, GFX.h, this.ground);
    this.foot = wizEase(this.foot, ((mid - footPx) * 2 * D * t) / GFX.h, d, 4);
    this._m.lookAt(g.camBase, g.lookAt, cam.up);
    this._q.setFromRotationMatrix(this._m);
    // (across: never left of the answers' own left edge, a little in: on a very wide screen they stand in a column,
    // and its legs would show beside them. Read twice a second.)
    if (!(this.ansT > 0)) { this.ansT = 0.5; const el = g.el && g.el.querySelector(".answers"), r = el && el.getBoundingClientRect(); this.ansL = r && r.width > 0 ? (r.left / GFX.w) * 2 - 1 : -1; }
    this.ansT -= d || 0;
    this.x = wizEase(this.x, Math.max(sp.x, (this.ansL === undefined ? -1 : this.ansL) + 0.12), d, 3);
    const p = this._v.set(this.x * D * t * (GFX.w / GFX.h), this.foot - sp.cut, -D).applyQuaternion(this._q).add(g.camBase);
    // standing on the floor when it is all picture, unless that would take its hips under the foot of the screen (a wide
    // screen, the lens high and looking up at the boss): there, no lower than that
    p.y = lerp(p.y, Math.max(0, p.y), this.ground) - this.sink;
    this.root.position.copy(p);
    this.root.rotation.y = Math.atan2(-p.x, -p.z) + sp.turn;
    // The crowd's front row (22-boss.js) stands 7.3 to 7.85 m in front of the boss, its heads just over the foot of the
    // picture: the arena's foreground. The wizard is the foreground now, and it stands among them as the lens comes in
    // (its wand hand a metre past it, as it holds the wand out): while it is there, the row sinks out of the picture. (Its
    // top, which the arena keeps at the band's foot, is moved; the row is look only. hide and dispose put it back.)
    const fr = g.frontRow;
    if (fr && fr.userData && fr.userData.top !== undefined) {
      if (this.rowTop === undefined) this.rowTop = fr.userData.top;
      this.rowSink = wizEase(this.rowSink, this.root.visible ? WIZ.ROW_SINK : 0, d, 3);
      fr.userData.top = this.rowTop + this.rowSink;
    }
  }
  // ---- every frame: its clips, before the stage's shots leave (so a bolt leaves from the pose it is drawn in) --------
  animate(d, f) {
    const o = this.one;
    if (o) {
      if (!o.out && o.a.time >= o.to - 1e-3) { if (o.hold) { o.a.time = o.to; o.a.paused = true; } else o.out = 0.001; }
      if (o.out) { o.out += d; o.w = Math.max(0, 1 - o.out / o.outDur); if (o.w <= 0) { o.a.setEffectiveWeight(0); this.one = null; } }
      else o.w = o.in > 0 ? Math.min(1, o.w + d / o.in) : 1;
      if (this.one) o.a.setEffectiveWeight(Motion.ease.smooth(o.w)); // (eased in and out: no clip cuts in or out)
    }
    let over = this.one ? Motion.ease.smooth(this.one.w) : 0;
    for (let i = this.going.length - 1; i >= 0; i--) { const q = this.going[i]; q.w -= d / q.dur; if (q.w <= 0) { q.a.setEffectiveWeight(0); this.going.splice(i, 1); } else { const e = Motion.ease.smooth(q.w); q.a.setEffectiveWeight(e); over += e; } }
    // while a question is read, its wand held out at the boss, higher as the attack bar fills (none once it has won or lost)
    const Rd = WIZ.READY, want = this.readyAct && this.g.state === "ask" && !this.lost && !this.won ? Rd[0] + (Rd[1] - Rd[0]) * smoothstep(0.1, 0.9, f) : 0;
    this.readyW = this.readyW === undefined ? want : Motion.dampTo(this.readyW, this.readyTo === undefined ? want : this.readyTo, want, want > this.readyW ? 3 : 6, d); this.readyTo = want; // (the bar fills every frame: followed alike at any rate)
    // its stance (the idle, and the wand held out while a question is read) gives way to the clips over it as a whole,
    // each part keeping its own share: a clip easing in takes its weight from all of the stance, not from the idle first
    // (a cast that came while the wand was held out took the idle's last tenth in two frames: the hand jumped 14 cm)
    const stance = 1 - Math.min(1, over), ready = this.readyAct ? this.readyW : 0;
    if (this.readyAct) this.readyAct.setEffectiveWeight(ready * stance);
    if (this.act.idle) this.act.idle.setEffectiveWeight(Math.max(0, 1 - ready) * stance);
    // its flinch, a layer over all of it
    if (this.flinch) this.flinch.update(d);
    this.mixer.update(d);
    this.live(d, f);
  }
  // ---- its life over its clips, every frame: its breath (quicker and deeper after a big spell, as the attack bar fills
  // and when it has lost), a little sway, its gaze on the boss, a blow's give, a cast's lunge, its slump when it has lost
  live(d, f) {
    if (!this.turns) return;
    const S = this.S, B = this.B, T = this.turns, sd = this.seed, lost = this.lost, a = this.st.a, busy = this.one ? Motion.ease.smooth(this.one.w) : 0;
    const t = (this.lt += d);
    this.model.scene.getWorldQuaternion(this.invQ).invert();
    if (lost) this.lostT += d;
    this.exert = Math.max(0, this.exert - d * 0.35);
    const braceTo = this.g.state === "ask" && !lost && !this.won ? smoothstep(0.35, 1, f) : 0;
    this.brace = Motion.dampTo(this.brace, this.braceTo === undefined ? braceTo : this.braceTo, braceTo, 3, d); this.braceTo = braceTo;
    const depth = 0.022 * (1 + 0.8 * this.exert + 0.3 * this.brace) * (lost ? 1.6 : 1);
    this.brPh = (this.brPh || 0) + d * Math.PI * 2 * 0.24 * (1 + 0.7 * this.exert + 0.5 * this.brace) * (lost ? 0.7 : 1); // (its own phase: a quicker breath goes on from where it is)
    const b = Math.sin(this.brPh);
    T.turn(B.sp2, -0.6 * depth * b, 0, 0); T.turn(B.sp1, -0.3 * depth * b, 0, 0);
    for (const c of this.clav) T.turn(c.bone, 0, 0, c.side * (depth * 0.8 * (b + 1) + 0.05 * this.brace)); // (braced, its shoulders up)
    const sa = 0.014 * (1 - 0.6 * busy) * (lost ? 0.3 : 1);
    T.turn(B.waist, 0, sa * Motion.noise(t * 0.17, sd), 0.6 * sa * Motion.noise(t * 0.13, sd + 1));
    // its gaze: on the boss's head (it looks up at it), less while a clip performs
    let yawT = 0, pitT = 0;
    if (B.head && a && a.root.visible && !lost) {
      const hp = B.head.getWorldPosition(this._t1), dir = a.at("head", this._t2).sub(hp).applyQuaternion(this.invQ);
      yawT = clamp(Math.atan2(dir.x, dir.z), -0.5, 0.5); pitT = clamp(Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -0.4, 0.6);
    }
    const amt = (this.won ? 0.3 : 0.5) * (1 - 0.5 * busy);
    const ly = S.lookY.step(d, yawT * amt), lp = S.lookX.step(d, -pitT * amt * 0.6);
    const sp = S.pitch.step(d, 0), sy = S.yaw.step(d, 0), sr = S.roll.step(d, 0), hd = S.head.step(d, 0), lu = S.lunge.step(d, 0);
    const slump = lost ? smoothstep(0, 2.5, this.lostT) : 0, br = 0.015 * this.brace;
    T.turn(B.waist, 0.3 * sp + 0.3 * lu, 0.3 * sy, 0.3 * sr);
    T.turn(B.sp1, 0.3 * sp + 0.35 * lu + 0.06 * slump - br, 0.3 * sy + 0.2 * ly, 0.3 * sr);
    T.turn(B.sp2, 0.4 * sp + 0.35 * lu + 0.06 * slump - br, 0.4 * sy + 0.2 * ly, 0.4 * sr);
    T.turn(B.neck, 0.4 * lp + 0.4 * hd, 0.3 * ly, 0);
    T.turn(B.head, 0.6 * lp + 0.6 * hd + 0.2 * slump, 0.3 * ly, 0);
    T.apply();
  }
  // ---- every frame, after the stage has framed its lens: where it stands, its cape, its light ---------------------
  update(d, f) {
    const g = this.g, quiet = this.quiet;
    this.place(d);
    if (this.S) this.root.position.y += this.S.hop.step(d, 0);
    // the wand's tip trails the hand and whips past it when the hand stops; the holder turned to point at it. (Both
    // springs are reckoned in its own frame: it is placed against the lens, and the lens's own moves must not swing them)
    const R = this.root;
    if ((this.tipF || this.hemF) && R.visible) R.updateWorldMatrix(true, false);
    if (this.tipF && R.visible) {
      const h = this.hand;
      h.updateWorldMatrix(true, false);
      const T = R.worldToLocal(h.localToWorld(this._t1.copy(this.tipRest))), lag = this.tipF.step(d, T, 0.09), grip = this.holder.position;
      const rd = this._t2.copy(this.tipRest).sub(grip).normalize(), fd = h.worldToLocal(R.localToWorld(this._t3.copy(T).add(lag))).sub(grip).normalize();
      this.holder.quaternion.setFromUnitVectors(rd, fd).multiply(this.holderQ);
    }
    // the cape's hem trails the chest: the cape swings by it (in the mesh's own units and axes)
    if (this.hemF && R.visible) {
      const c = this.B.sp2;
      c.updateWorldMatrix(true, false);
      const lag = this.hemF.step(d, R.worldToLocal(c.localToWorld(this._t1.copy(this.hemRest))), 0.35);
      this.mesh.getWorldQuaternion(this._q2).invert().multiply(R.getWorldQuaternion(this._q3));
      this.flut.swing.value.copy(lag).applyQuaternion(this._q2).multiplyScalar(this.flut.amp.value * (quiet ? 0.5 : 1));
    }
    // the cape: a breeze, more as it casts or is struck (none with reduced effects)
    this.whip = Math.max(0, this.whip - d * 1.4);
    this.flut.t.value += d * (1 + this.whip * 1.5);
    this.flut.k.value = quiet ? 0 : 0.28 + 0.72 * this.whip;
    // the wand's tip: gathers light while the question is read, flares as it casts; dies when it has lost
    this.charge = Motion.damp(this.charge, g.state === "ask" ? 0.25 + 0.75 * f : 0.2, 3, d);
    this.flare0 = Math.max(0, this.flare0 - d * 3.2);
    this.sink = this.lost ? Math.min(0.12, this.sink + d * 0.25) : 0;
    if (this.lost && (this.dim || 0) < 1) { this.dim = Math.min(1, (this.dim || 0) + d * 0.6); for (const m of this.mats) if (m.emissiveMap) m.emissiveIntensity = WIZ.GLOW * (1 - 0.75 * this.dim); this.rim.k.value = WIZ.RIM_K * (1 - 0.5 * this.dim); }
    const lit = this.root.visible ? (this.lost ? Math.max(0, 1 - this.sink / 0.08) : 1) : 0, tp = this.tip(this._u);
    const gk = (0.55 + 0.45 * this.charge + 1.3 * this.flare0) * lit, pulse = 1 + (quiet ? 0 : 0.08 * Math.sin(VFX.t * (4 + 8 * this.charge)));
    this.glow.visible = lit > 0.01;
    this.glow.position.copy(tp); this.glow.scale.setScalar(0.32 * gk * pulse);
    this.glow.material.opacity = Math.min(1, 0.7 * gk);
    this.star.visible = lit > 0.01 && (this.flare0 > 0.02 || this.charge > 0.55);
    if (this.star.visible) { this.star.position.copy(tp); this.star.scale.setScalar((0.22 + 0.5 * this.flare0 + 0.25 * Math.max(0, this.charge - 0.55)) * pulse); this.star.material.opacity = Math.min(1, 0.4 + this.flare0); if (!quiet) this.star.material.rotation += d * (0.6 + 3 * this.flare0); }
    // floating runes round its wand hand (not with reduced effects, nor below the tiers that keep extras)
    const runes = lit > 0.01 && !quiet && GFX.extras !== false;
    for (const r of this.runes) {
      r.sp.visible = runes;
      if (!runes) continue;
      const a = r.ph + VFX.t * 0.7, h = this.hand.getWorldPosition(this._w);
      r.sp.position.set(h.x + Math.cos(a) * 0.32, h.y + 0.12 + Math.sin(VFX.t * 1.3 + r.ph) * 0.1, h.z + Math.sin(a) * 0.32);
      r.sp.material.opacity = 0.35 + 0.25 * this.charge + 0.4 * this.flare0;
      r.sp.material.rotation += d * 0.8;
    }
    // the lance's root stays at the wand's tip while it is drawn (the wand moves under it on a big cast)
    if (this.lance) { if ((this.lance.t += d) < 0.2 && this.lance.h.live()) this.lance.h.set(tp, this.lance.to); else this.lance = null; }
    // what is fading
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const e = this.fx[i];
      e.t += d;
      const k = Math.min(1, e.t / e.dur);
      e.fn(e.o, k);
      if (k >= 1) { e.o.visible = false; this.fx.splice(i, 1); }
    }
    if (this.ward.visible) this.ward.quaternion.copy(g.camera.quaternion);
  }
  dispose() {
    for (const o of [this.glow, this.star, ...this.circles, ...this.runes.map((r) => r.sp), this.flare]) o.material.dispose();
    for (const o of [this.ward, this.sigil]) { o.geometry.dispose(); o.material.dispose(); }
    for (const t of Object.values(this.tex)) if (t) t.dispose();
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model.scene);
    if (this.mesh && this.mesh.skeleton && this.mesh.skeleton.dispose) this.mesh.skeleton.dispose(); // (its bones' texture on the graphics chip)
    if (this.rowTop !== undefined && this.g.frontRow) this.g.frontRow.userData.top = this.rowTop;
  }
}
