// Nest Egg Run's impacts, staged (when the war rig's model arrived: with the built-in car the game shows what it
// always showed). The rules decide what happens and when (21-racer.js: pick, boost, arrive, after, gameOver); this
// file decides what is seen and heard of it, with the shared effects kit (CombatFX), on the show clock:
//   a right gate        the lane's light breaks over the rig in a clean burst of the answer's colour: a white heart,
//                       sparks, two thin rings, light on the road; coins fly round the question to the nest egg; the
//                       rig surges on both stacks and the egg swells with the deposit
//   a wrong lane        the lane's light is hard: a red pane that shatters over the nose (glass thrown back over the
//                       rig, red sparks, a dull reject cross and dark smoke, a small dark blast low down); the rig is
//                       knocked into a half-spin on locked wheels (tyre smoke, skid marks that burn and go dark), the
//                       lens lurches, the band's edge flashes red, the HUD cracks and a life breaks
//   no lane in time     the same blow, taken on the bollard between two lanes: metal, not glass
//   the policy pays     its own event: a shell of mint light round the rig takes the pane, an airbag of light swells
//                       in front of it, the rig only shimmies, and the policy is seen to leave the HUD
//   a near miss         something overtakes close by: a whoosh on that side, streaks of air, the rig rocks, the lens leans away
//   a boost             the roar, flames from both stacks (the rig's own), the lens falls back, light on the road
//   the last life       a red frame round the band that swells with the alarm, a stack that burns and trails smoke
//   forced retirement   the rig slews to a stop, its engine blows (a layered blast, a wheel thrown clear with a trail
//                       of sparks, a stack falling), and it burns where it stands
//   retirement at 65    a turn on the spot with both stacks alight, gold rings off the egg, coins and stars to the
//                       nest egg, fireworks, and away down the road toward the golden egg on the horizon
// Nothing here is read by a rule. Light has a shape: a blast is a small hot core, lobes of fire in its own colour,
// a ring, streaks and smoke; smoke and wreckage stay in the palette (violet-grey, magenta and cyan glints).
const RSTAGE = { SMOKE: 0x5c5678, WRECK: 0x241c38, MINT: 0x4dffa6, GLASS: 0x5a1026, REJECT: 0xff4a5e, GOLD: 0xffc93d };
class RacerStage {
  constructor(game) {
    const g = (this.g = game), s = g.scene;
    g.show = new TweenSet(); // show-only timing: nothing in it is a rule
    this.kit = g.kit = new CombatFX(g, { unit: 1, ground: 0, sparks: 360, chunks: 80, firePuffs: 96, smokePuffs: 120, lights: 3 });
    this.rig = g.rigKit;
    this.low = 0; this.lowK = 0; this.hitK = 0; this.alarmAt = 0; this.alarmGame = 0; this.lowT = 0; // (low: 1 on the last life, 2 when it has gone)
    this.jolt = 0; this.joltSd = 1; this.pull = 0; this.camX = 0; this.nearK = 0; this.nearCool = 0; this.gateFlare = 0; this.overK = 0;
    this.speedK = 1; this.speedGo = 1; this.speedRate = 1; this.skidT = 0; this.markT = 0; this.sparkT = 0; this.overT = -1; this.full = false;
    this.snap = 0; // frames left before a blow's colour split and zoom are let go (counted on the screen's own frames: a hit-stop does not stretch them)
    this.verdict = null; // which lane was right and which was taken, while the answer is shown on the road
    this.engine = false; this.alarm = false; this.flame = false; // (which of its running sounds are recordings that are playing)
    this.burn = null; this.fire = null;
    const H = Math.PI / 2;
    // thin rings that face the lens: the burst through a gate, the shield's ripple (hard-edged, clear inside, never brighter than their colour)
    const wg = new THREE.PlaneGeometry(2, 2);
    this.waves = Array.from({ length: 8 }, () => {
      const m = new THREE.Mesh(wg, new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uK: { value: 0 }, uW: { value: 0.05 } },
        transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, extensions: { derivatives: true },
        vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: `uniform vec3 uColor; uniform float uK; uniform float uW; varying vec2 vP;
          void main(){
            float r = length(vP), e = fwidth(r) * 1.5, band = smoothstep(1.0 - uW - e, 1.0 - uW, r) * (1.0 - smoothstep(1.0 - e, 1.0, r));
            if (band < 0.01) discard;
            gl_FragColor = vec4(uColor, band * uK);
          }`,
      }));
      m.visible = false; m.renderOrder = 6; m.frustumCulled = false;
      s.add(m);
      return { m, t: -1, dur: 1, at: new THREE.Vector3(), s0: 1, s1: 1, w: 0.055, live: false, ride: null };
    });
    // light on the road: a pool that flares where a blast or a burst is, and fades
    const pg = new THREE.PlaneGeometry(1, 1);
    this.glows = Array.from({ length: 4 }, () => {
      const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.rotation.x = -H; m.visible = false; m.renderOrder = 2; m.layers.set(1);
      s.add(m);
      return { m, t: 0, dur: 1, col: [1, 1, 1], k: 1 };
    });
    // skid marks: short strokes laid under the locked tyres. Each burns for a moment and is then a dark stroke that the road carries away
    { const N = (this.MN = 72), zero = new THREE.Matrix4().makeScale(0, 0, 0), mg = new THREE.PlaneGeometry(1, 1);
      mg.rotateX(-H);
      const mk = (mat, order) => { const m = new THREE.InstancedMesh(mg, mat, N); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.renderOrder = order; m.layers.set(1); for (let i = 0; i < N; i++) { m.setMatrixAt(i, zero); m.setColorAt(i, new THREE.Color(0, 0, 0)); } s.add(m); return m; };
      this.markDark = mk(new THREE.MeshBasicMaterial({ color: 0x020106, transparent: true, opacity: 0.72, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 1);
      this.markHot = mk(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 2);
      this.markHot.visible = false; // (rubber, not paint: the strokes are dark from the first frame)
      this.marks = Array.from({ length: N }, (_, i) => ({ i, on: false, x: 0, z: 0, a: 0, len: 1, age: 0 }));
      this.markI = 0; this._zero = zero; this.markAt = [null, null, null, null]; }
    // the wrong lane's light, hard: a red pane with a star of cracks, seen for a few frames as it breaks
    { const c = document.createElement("canvas");
      c.width = c.height = 256;
      const x = c.getContext("2d");
      const gr = x.createRadialGradient(128, 150, 20, 128, 150, 150); // (soft at its edge: a sheet of light, not a board)
      gr.addColorStop(0, "rgba(255,40,70,0.42)"); gr.addColorStop(0.7, "rgba(255,40,70,0.3)"); gr.addColorStop(1, "rgba(255,40,70,0)");
      x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = "rgba(255,230,236,1)"; x.lineJoin = "bevel";
      let sd = 11;
      const r = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
      for (let i = 0; i < 11; i++) { // cracks run out from where the nose struck, each with a kink and a branch
        const a = (i / 11) * 6.283 + r() * 0.4, l = 80 + r() * 90, kx = 128 + Math.cos(a) * l * 0.5 + (r() - 0.5) * 22, ky = 150 + Math.sin(a) * l * 0.5 + (r() - 0.5) * 22;
        x.lineWidth = 2.2 + r() * 2; x.beginPath(); x.moveTo(128, 150); x.lineTo(kx, ky); x.lineTo(128 + Math.cos(a + 0.15) * l, 150 + Math.sin(a + 0.15) * l); x.stroke();
        x.lineWidth = 1.5; x.beginPath(); x.moveTo(kx, ky); x.lineTo(kx + Math.cos(a - 0.9) * l * 0.35, ky + Math.sin(a - 0.9) * l * 0.35); x.stroke();
      }
      this.paneTex = new THREE.CanvasTexture(c);
      this.pane = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.5), new THREE.MeshBasicMaterial({ map: this.paneTex, color: new THREE.Color(1.0, 0.5, 0.62), transparent: true, opacity: 0, /* (Phase 6: a red-pink crack, not a white sheet: it bloomed the crash out) */ depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending }));
      this.pane.visible = false; this.pane.renderOrder = 7; this.paneT = 0;
      s.add(this.pane); }
    // the policy's shield: a shell of mint light round the rig, clear at its middle (see starShellMaterial, in 20j)
    this.shellMat = starShellMaterial();
    this.shellMat.uniforms.uColor.value.setRGB(0.25, 1.0, 0.62);
    this.shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), this.shellMat);
    this.shell.scale.set(2.3, 1.75, 3.4); this.shell.position.set(0, 1.0, 0); this.shell.renderOrder = 7; this.shell.visible = false;
    this.rig.rig.add(this.shell);
    this.shellT = 9; this.shellA = 0;
    // the band's edge: red when a life goes (once), and on the last life a frame that swells with each tone of the
    // alarm. It lies over the picture's edges only: the road, the rig and the lane badges stand inside it.
    this.frameU = { uK: { value: 0 } };
    this.frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.frameU, transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, // (premultiplied: it darkens what it lies over and adds its own red)
      vertexShader: "varying vec2 vP; void main(){ vP = (uv - 0.5) * 3.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uK; varying vec2 vP;
        void main(){
          vec2 d = abs(vP);
          float ex = smoothstep(0.76, 1.02, d.x), ey = smoothstep(0.7, 1.02, d.y), e = 1.0 - (1.0 - ex) * (1.0 - ey);
          e = e * e * (1.0 - smoothstep(1.0, 1.45, max(d.x, d.y)));
          gl_FragColor = vec4(vec3(0.9, 0.03, 0.07) * (e * uK * 0.7), e * uK * 0.5);
        }`,
    }));
    this.frame.renderOrder = 54; this.frame.frustumCulled = false; this.frame.visible = false;
    s.add(this.frame);
    // (Phase 6: on the last life, the frame is Boss Rush's, drawn over the finished picture and under the lane badges:
    // inside the picture it was faint. The flash as a life goes stays in the picture.)
    this.edge = new BandEdge();
    s.userData.edge = (r) => this.edge.draw(r, g.band);
    // Everything that used to throw a burst of soft round dots here throws shaped light instead while the run is
    // staged: steam is smoke in the palette, everything else sparks (darts with a point, a tail and a hot heart).
    g.bursts.burst = (pos, color, o = {}) => {
      const n = o.n || 60, size = o.size || 0.3, life = o.life || 1.1;
      if (size >= 0.6) { for (let i = 0; i < Math.min(3, n); i++) this.kit.smoke(this._w.set(rand(-0.3, 0.3), rand(0, 0.4), rand(-0.3, 0.3)).add(pos), { size: size * 1.5, life: life * 1.2, a: 0.34, cold: true, color: 0x6a6790, rise: (o.gravity || 3) * 0.35 }); return; }
      if (n <= 2) return this.kit.embers(pos, color, { n, radius: size, life, speed: (o.speed || 10) * 0.6 });
      this.kit.sparks(pos, color, { n: Math.min(40, Math.ceil(n * 0.5)), speed: (o.speed || 10) * 1.1, life: life * 0.7, len: size * 2.4, w: size * 0.3, gravity: o.gravity === undefined ? 2.5 : -o.gravity * 0.5, drag: 0.35 });
    };
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._u = new THREE.Vector3(); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._e = new THREE.Euler(); this._c = new THREE.Color();
  }
  // ---- small things ---------------------------------------------------------------------------------------------
  // a place in the world, as a place on the screen (pixels)
  screen(p) { const v = this._u.copy(p).project(this.g.camera); return { x: (v.x * 0.5 + 0.5) * GFX.w, y: (0.5 - v.y * 0.5) * GFX.h }; }
  pan(x) { return clamp(x / 5, -1, 1) * 0.6; }
  // a ring that opens where it is (ride: a function that says where that is now)
  wave(at, ride, dur, s0, s1, delay, col, w = 0.055, k = 0.95) {
    const r = this.waves.find((x) => !x.live) || this.waves[0];
    r.at.copy(at); r.ride = ride || null; r.dur = dur; r.t = -1e-4 - delay; r.s0 = s0; r.s1 = s1; r.w = w; r.live = true;
    r.m.material.uniforms.uColor.value.set(col).multiplyScalar(k);
  }
  // light on the road at a place: it flares and fades
  glow(at, col, size, dur, k = 1) {
    const q = this.glows.reduce((a, b) => (b.t < a.t ? b : a));
    q.m.position.set(at.x, 0.065, at.z); q.m.scale.set(size, size * 1.3, 1); q.t = q.dur = dur; q.col = fxRGB(col, 1); q.k = k; q.m.visible = true;
  }
  // a score popup, outlined in black so it reads on whatever is behind it
  outline(el) { if (el && el.classList.contains("floater")) el.style.textShadow = "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 0 #000, 0 0 7px #000"; }
  // (and it holds at full strength for most of its second, then goes: the stock floater fades from its first frame)
  hold(el) { if (!el || !el.animate) return; el.style.animation = "none"; el.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-16px)", opacity: 1, offset: 0.74 }, { transform: "translateY(-34px)", opacity: 0 }], { duration: 990, easing: "linear", fill: "forwards" }); }
  // (the kit's own smoke for a reject or a struck plate is heavy and dark, and the road carries it back over the rig,
  // which it blacks out: here those are thrown without it. The crash has its own thin violet-grey smoke, which leaves
  // to the side.)
  dry(fn) { const kit = this.kit; kit.smoke = () => {}; try { fn(); } finally { delete kit.smoke; } }
  // how fast the road runs, as a share of what the game asks for (a blow costs the rig its speed for a moment)
  speedTo(k, rate) { this.speedGo = k; this.speedRate = rate; }
  // (the game holds its boost until the next question: a rig that has taken a blow goes on at its cruising speed, not the boost's)
  cruise() { return this.g.boostRate ? 0.42 : 1; }

  // ---- sound that runs on: the engine, the stacks' flame, the alarm -------------------------------------------------
  start() {
    this.loops(true);
    this.rig.launch();
    if (this.rig.inT < 1) { Sound.sfx("boost", 0, { vol: 0.7 }); this.g.show.wait(0.9, () => { if (!this.g.unmounted) Sound.sfx("skid", 0, { vol: 0.35, rate: 1.25 }); }); } // it drives in on both stacks and brakes onto its mark
  }
  loops(on) {
    if (on) {
      this.engine = Sound.loop("racer-engine", "engine_car", { vol: 0.24, rate: 0.85, fade: 0.5 });
      if (!this.engine) Sound.engine(true); // (no recording: the synth's hum, as before)
      if (this.low === 1) this.alarmOn();
    } else {
      Sound.stopLoop("racer-engine", 0.2); Sound.stopLoop("racer-alarm", 0.1); Sound.stopLoop("racer-flame", 0.1);
      Sound.engine(false);
      this.engine = this.alarm = this.flame = false;
    }
  }
  alarmOn() { this.alarm = Sound.loop("racer-alarm", "alarm", { vol: 0.3 }); this.alarmAt = Sound.ctx ? Sound.ctx.currentTime : 0; this.alarmGame = 0; } // (the red frame swells with each of its tones, counted from here)
  pause() { this.loops(false); Sound.hush(); } // (nothing keeps sounding behind the menu: the loops, and whatever was still ringing)
  resume() { if (this.g.state !== "over") this.loops(true); }

  // ---- the player floors it (the rule: boost) -------------------------------------------------------------------------
  boost() {
    const g = this.g, rig = this.rig;
    Sound.sfx("boost", 0, { vol: 0.9 });
    GFX.pulse(0.9, 0); // (flooring it streaks the street; the colours part on a crash only)
    for (let i = 0; i < 2; i++) this.kit.flash(rig.stack(i, this._v), RIG.FLAME[0], 0.3, 1.5, 0.16, 0.8, 1.6);
  }
  // ---- the gate is reached (the rule: arrive). how: "right" | "insured" | "crash"; o: what the rule decided ------------
  arrive(how, o) {
    const g = this.g;
    this.verdict = { right: o.right, picked: o.picked, ok: how === "right", t: 0 };
    this.overK = 1;
    if (how === "right") this.right(o.right, o.gain); else if (how === "insured") this.insured(o.picked); else this.crash(o.picked);
    if (o.policy) g.show.wait(0.3, () => { if (!g.unmounted) this.policy(); }); // a fifth answer in a row: a policy is issued
    // the shared call-out of a quick answer, or of a streak lost, stands beside the rig (over the amount), outlined: not
    // across the gantry's boards as they go over the lens
    const at = this.screen(this.rig.centre(this._v)), room = at.x < GFX.w / 2 ? 1 : -1;
    UI.root.querySelectorAll(".floater:not(.big)").forEach((el) => {
      if (el.dataset.staged || !/LIGHTNING|QUICK DRAW|STREAK LOST/.test(el.textContent)) return;
      el.dataset.staged = "1";
      el.style.left = Math.round(clamp(at.x + (room > 0 ? 56 : -56 - 118), 8, Math.max(8, GFX.w - 126))) + "px";
      el.style.top = Math.round(at.y - 20) + "px";
      this.outline(el); this.hold(el);
    });
  }
  // a right gate: the lane's light breaks over the rig, clean and bright, and the deposit goes to the nest egg
  right(slot, gain) {
    const g = this.g, kit = this.kit, rig = this.rig, col = SLOT_COLORS[clamp(slot, 0, SLOT_COLORS.length - 1)], quiet = REDUCED_MOTION || GFX.calm;
    const p = rig.nose(new THREE.Vector3()).setY(1.25), e = rig.eggAt(new THREE.Vector3());
    kit.impact(p, col, { size: 1.05, ring: false, shake: false, dir: this._v.set(0, 0.3, 1) });
    this.wave(p, null, 0.34, 0.8, 6.4, 0, col, 0.06, 1);
    if (!quiet) this.wave(p, null, 0.44, 0.8, 9, 0.07, 0xffffff, 0.028, 0.85);
    kit.ring(this._w.set(p.x, 0.05, p.z + 1.4), col, { flat: true, size: 9, dur: 0.5 });
    this.glow(this._w.set(p.x, 0, p.z + 1.6), col, 8, 0.45, 0.8);
    kit.embers(e, RSTAGE.GOLD, { n: quiet ? 4 : 10, radius: 0.8, life: 0.8, rise: 2 }); // gold dust lifts off the egg as the deposit lands
    kit.light(e, col, 3, 0.25, 12);
    rig.surge();
    this.gateFlare = 1;
    UI.flash("good");
    GFX.pulse(0.45, 0);
    this.snap = 4;
    GFX.bloomPulse(0.3);
    g.shake(0.05);
    VFX.hitStop(2);
    Sound.sfx("gate_pass", this.pan(g.carX));
    Sound.sfx("impact_good", this.pan(g.carX), { vol: 0.6 });
    Sound.sfx("correct", 0, { vol: 0.8 });
    Sound.sfx("deposit", 0, { vol: 0.9 });
    Sound.sfx("boost", 0, { vol: 0.5, rate: 1.15, delay: 0.04 });
    // coins fly from the egg, round the question, to the nest egg's figure; the amount stands above the burst
    const from = this.screen(e);
    g.show.wait(0.06, () => {
      if (g.unmounted) return;
      HudFX.reward(g.el, from, "[data-egg]", { n: quiet ? 4 : 7, kind: "coin", color: COLORS.gold, clear: ".qpanel" });
      if (g.run.streak >= 3 && !quiet) HudFX.reward(g.el, from, "[data-egg]", { n: 3, kind: "star", color: COLORS.yellow, clear: ".qpanel" });
      Sound.sfx("reward", 0, { vol: 0.7 });
    });
    // the amount stands beside the rig, on the side with more room: clear of the burst over its nose and of the lane badges above it
    const at = this.screen(rig.centre(this._v)), room = at.x < GFX.w / 2 ? 1 : -1;
    UI.floater("+" + money(gain), clamp(at.x + (room > 0 ? 52 : -52 - 150), 8, Math.max(8, GFX.w - 158)), at.y + 4, COLORS.lime, true);
    this.outline(UI.root.lastElementChild); this.hold(UI.root.lastElementChild);
  }
  // a fifth right answer in a row: the policy is issued. A soft swell of the shield, and its light goes to the HUD
  policy() {
    const g = this.g;
    this.shellT = 0.5; this.shellA = 0.55;
    HudFX.reward(g.el, this.screen(this.rig.eggAt(this._v)), "[data-ins]", { n: 5, kind: "spark", color: COLORS.lime, clear: ".qpanel" });
    Sound.sfx("powerup", 0, { vol: 0.7 });
  }
  // the wrong lane's light breaks as a pane of glass (seen for a few frames, with its cracks)
  breakPane(p) {
    this.pane.position.set(p.x, 1.8, p.z - 0.15);
    this.pane.visible = true; this.paneT = 0.14;
  }
  // a wrong lane, or none: the blow. The rule has taken a life; here it is seen to go
  crash(picked) {
    const g = this.g, kit = this.kit, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm, glass = picked >= 0;
    const left = 3 - g.crashes, hard = clamp(g.crashes / 3, 0.34, 1), sd = g.carX > 0.4 ? -1 : g.carX < -0.4 ? 1 : Math.random() < 0.5 ? -1 : 1, pan = this.pan(g.carX);
    const p = rig.nose(new THREE.Vector3()).setY(1.15), back = this._v.set(-sd * 0.15, 0.5, 1).normalize().clone();
    this.capT = 0.55; // (Phase 6: the picture's glow is held down while it happens, so the glass, the sparks and the rubber read: see update)
    if (glass) { // the lane's light is hard: it shatters over the nose and the pieces go back over the rig
      this.breakPane(p);
      kit.debris(this._w.copy(p).setY(1.7), { n: quiet ? 3 : 7, size: 0.4, speed: 13, color: 0x1c1830, hot: 0xffdce8, dir: back, spread: 1.0, gravity: 14, life: 0.7, radius: 1.1 }); // (a few dark splinters that glint as they turn: glass, not confetti)
      kit.sparks(p, RSTAGE.REJECT, { n: quiet ? 8 : 16, speed: 13, dir: back, spread: 1.2, life: 0.45, len: 0.8, w: 0.07, gravity: 9, k: 1.5 });
      this.dry(() => kit.fizzle(this._w.copy(p).setY(2.0), { size: 1.25 }));
    } else { // no lane at all: it runs onto the bollard between two lanes (metal, not glass)
      this.dry(() => kit.hull(p, 0xff7a4a, { size: 1.7, dir: back }));
      kit.debris(p, { n: quiet ? 5 : 12, size: 0.66, speed: 11, color: RSTAGE.WRECK, hot: 0xff5a8a, dir: back, spread: 1.0, gravity: 13, life: 0.9, radius: 0.5 });
      this.dry(() => kit.fizzle(this._w.copy(p).setY(1.9), { size: 1.2 }));
    }
    // three frames on: a small dark blast low on its nose (fire, smoke, embers), and its light on the road
    g.show.wait(0.05, () => {
      if (g.unmounted) return;
      // (dark: lobes of deep red fire with no white heart, heavy smoke, embers. A reject is not a firework.)
      const q = rig.nose(this._w).setY(0.8).clone(), sz = 0.6 + 0.3 * hard;
      for (let i = 0; i < (quiet ? 2 : 4); i++) { const a = rand(6.283), v = new THREE.Vector3(Math.cos(a) * 1.6, rand(0.6, 1.8), Math.sin(a) * 0.8 + 1.2).multiplyScalar(sz); kit.fire(this._u.copy(q).addScaledVector(v, 0.15), { size: rand(0.6, 0.9) * sz, life: rand(0.3, 0.45), vel: v, rise: 0.4, color: 0xc02428, k: 0.8 }); }
      for (let i = 0; i < 2; i++) kit.smoke(this._u.set(rand(-0.5, 0.5) - sd * 0.9, rand(0.5, 1.1), rand(-0.6, 0.1)).add(q), { size: rand(0.6, 0.85) * sz, life: rand(0.55, 0.8), rise: 1.9, a: 0.26, color: RSTAGE.SMOKE, vel: this._v.set(-sd * rand(1.6, 3.0), 2.2, 2.6) }); // (violet-grey, lit from under by the blast, thin, and gone up and to the side: the rig is never under it)
      kit.embers(q, 0xff5a4a, { n: 8, radius: 0.6, life: 1.0 });
      kit.light(q, 0xff2a30, 2.2, 0.3, 12);
      this.glow(q, 0xd02024, 6.5, 0.45, 0.5);
      Sound.sfx("explosion_small", pan, { vol: 0.7, rate: 0.9 });
    });
    // the rig: knocked into a half-spin on locked wheels; the road slows under it
    rig.knock(sd, 0.82 + 0.18 * hard);
    this.skidT = quiet ? 0.2 : 0.66;
    this.speedTo(0.36, 4); g.show.wait(0.7, () => { if (g.state !== "over") this.speedTo(this.cruise(), 0.9); });
    // the lens: a lurch, a shake, the band's edge red, the colours split for three frames
    this.jolt = 1; this.joltSd = sd; this.hitK = 1;
    g.shake(0.1 + 0.1 * hard);
    GFX.glitch(0.2 + 0.25 * hard, 0.07);
    GFX.pulse(1.6 + 2 * hard, 0);
    this.snap = 3;
    VFX.hitStop(3);
    // the HUD: the life that went breaks, the bar flickers and cracks; the rig cannot be struck again for a moment
    HudFX.lifeLost(g.el);
    HudFX.hurt(g.el, hard);
    HudFX.blink(g.el, 800);
    // heard on the same frame: the dull thud of the reject, the crash, glass (or metal), then the tyres and the life
    Sound.sfx("impact_reject", pan, { vol: 0.9, rate: 0.8 });
    Sound.sfx("crash", pan);
    if (glass) Sound.sfx("crash_glass", pan, { delay: 0.03 }); else Sound.sfx("impact_metal", pan, { vol: 0.9 });
    Sound.sfx("player_hit", pan * 0.5, { vol: 0.8 });
    Sound.sfx("wrong", 0, { vol: 0.6 });
    Sound.sfx("skid", pan, { delay: 0.07, vol: 0.9 });
    Sound.sfx("heart_lost", 0, { delay: 0.13, vol: 0.9 });
    Sound.sfx("debris", pan, { delay: 0.32, vol: 0.7 });
    if (left === 1) g.show.wait(0.55, () => { if (!g.unmounted && g.state !== "over") Sound.say("WARNING"); });
    this.setLow(left <= 0 ? 2 : left === 1 ? 1 : 0);
  }
  // a wrong lane with a policy in hand: the policy takes the blow, and is seen to
  insured(picked) {
    const g = this.g, kit = this.kit, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm, pan = this.pan(g.carX);
    const sd = g.carX > 0.4 ? -1 : g.carX < -0.4 ? 1 : Math.random() < 0.5 ? -1 : 1, p = rig.nose(new THREE.Vector3()).setY(1.15), c = rig.centre(new THREE.Vector3());
    // the shell flares mint round the rig, brightest at its edge, its lattice showing where the pane struck
    const su = this.shellMat.uniforms;
    su.uHit.value = 1; su.uHitP.value.set(0, 0.25, -0.9).normalize();
    this.shellT = 0; this.shellA = 1;
    // the pane breaks on the shell: its pieces are turned aside, to both sides, and sparks run round the shell
    this.breakPane(p);
    for (const q of [-1, 1]) kit.debris(p, { n: quiet ? 3 : 7, size: 0.55, speed: 11, color: RSTAGE.GLASS, hot: RSTAGE.MINT, dir: this._v.set(q, 0.45, 0.35).normalize(), spread: 0.7, gravity: 12, life: 0.85, radius: 0.7 });
    kit.sparks(p, RSTAGE.MINT, { n: quiet ? 8 : 20, speed: 12, dir: this._v.set(0, 0.4, 0.6).normalize(), spread: 1.6, life: 0.45, len: 0.8, w: 0.06, gravity: 5 });
    kit.sparks(p, 0xffffff, { n: 6, speed: 16, life: 0.22, len: 1.0, w: 0.05, k: 1.9 });
    // an airbag of light: a soft swell of mint in front of it, two thin rings off the shell, a ring and a pool on the road
    kit.flash(p, RSTAGE.MINT, 0.9, 3.8, 0.26, 0.5, 1.25);
    this.wave(c, (v) => rig.centre(v), 0.32, 1.4, 5.6, 0, RSTAGE.MINT, 0.05, 0.95);
    if (!quiet) this.wave(c, (v) => rig.centre(v), 0.42, 1.4, 8.2, 0.08, RSTAGE.MINT, 0.03, 0.8);
    kit.ring(this._w.set(c.x, 0.05, c.z), RSTAGE.MINT, { flat: true, size: 10, dur: 0.55 });
    this.glow(c, RSTAGE.MINT, 8.5, 0.5, 0.7);
    kit.light(c, RSTAGE.MINT, 4, 0.3, 14);
    // the rig is jolted and shimmies; the lens answers lightly; no red anywhere but the pane
    rig.shimmy(sd);
    this.jolt = 0.4; this.joltSd = sd;
    g.shake(0.07);
    GFX.pulse(1.2, 0);
    this.snap = 3;
    VFX.hitStop(2);
    this.speedTo(0.7, 4); g.show.wait(0.5, () => { if (g.state !== "over") this.speedTo(this.cruise(), 1.2); });
    this.policyGone();
    Sound.sfx("impact_reject", pan, { vol: 0.55, rate: 0.9 });
    Sound.sfx("impact_shield", pan);
    Sound.sfx("crash_glass", pan, { delay: 0.03, vol: 0.6 });
    Sound.sfx("wrong", 0, { vol: 0.5 });
    Sound.sfx("skid", pan, { delay: 0.06, vol: 0.4, rate: 1.2 });
    Sound.sfx("shield_down", 0, { delay: 0.16, vol: 0.9 });
  }
  // the policy that paid leaves the HUD: where its badge stood, it breaks into mint shards
  policyGone() {
    const g = this.g, box = g.el && $("[data-ins]", g.el);
    if (!box || REDUCED_MOTION) return;
    const r = box.getBoundingClientRect(), cx = r.right + 9, cy = r.top + Math.max(8, r.height / 2);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rand(-0.3, 0.3), d = rand(16, 32);
      const s = UI.el(`<i class="life-shard" style="left:${cx}px;top:${cy}px;background:${COLORS.lime};box-shadow:0 0 6px ${COLORS.lime};--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d + 10).toFixed(1)}px;--r:${Math.round(rand(-220, 220))}deg"></i>`);
      UI.root.appendChild(s);
      setTimeout(() => s.remove(), 620);
    }
  }
  // something overtakes close by: a whoosh on its side, streaks of air between the two, the rig rocks away from it
  nearMiss(c) {
    const g = this.g, kit = this.kit, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm, x0 = g.carX + rig.off.x, side = c.x < x0 ? -1 : 1;
    this.nearCool = 1.2; this.nearK = 1; this.camX = -side * (quiet ? 0.06 : 0.24);
    Sound.sfx("near_miss", side * 0.7);
    if (quiet) return;
    for (let i = 0; i < 16; i++) { // speed lines: long thin streaks in the gap, torn backward
      const d = kit._dart();
      d.p.set(lerp(x0, c.x, rand(0.35, 0.95)), rand(0.35, 2.1), rand(-7, 1.5));
      d.v.set(0, 0, rand(34, 52)); d.life = d.t = rand(0.16, 0.26); d.w = rand(0.03, 0.055); d.len = rand(2.6, 4.6); d.stretch = 0; d.g = 0; d.drag = 1; d.fade = 1.6; d.col = fxRGB(0xbff6ff, 1.9); d.bolt = null;
    }
    rig.roll.v -= side * 1.0; rig.eggR.v -= side * 1.6; rig.heave.v += 0.25;
    g.shake(0.045);
  }

  // ---- the last life ---------------------------------------------------------------------------------------------
  // on: 0 no; 1 one life left: the red frame beats, the alarm sounds, a stack burns; 2 none left: the frame holds, it burns harder
  setLow(on) {
    const g = this.g, rig = this.rig;
    on = on || 0;
    if (on === this.low) return;
    this.low = on;
    GFX.setDanger(on === 2 ? 0.6 : on ? 0.55 : 0);
    HudFX.low(g.el, !!on);
    if (on === 1) { this.alarmOn(); this.lowT = 0; } else { Sound.stopLoop("racer-alarm", 0.3); this.alarm = false; }
    if (this.burn) { this.burn.on = false; this.burn = null; }
    // (from here its left stack burns: a tongue of fire, dark smoke streaming back, embers. The rig's own: see RacerRig.update)
  }

  // ---- the run ends (the rule: gameOver). full: the whole career was driven; rich: with a million ------------------
  over(full, rich) {
    const g = this.g, kit = this.kit, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm;
    this.overT = 0; this.full = full;
    if (full) { // retirement at 65: a turn on the spot with both stacks alight, then away toward the egg on the horizon
      this.setLow(0);
      rig.cheer();
      const e = rig.eggAt(new THREE.Vector3());
      for (let i = 0; i < (quiet ? 1 : 3); i++) this.wave(e, (v) => rig.eggAt(v), 0.5, 0.6, 5 + i * 2.2, i * 0.16, RSTAGE.GOLD, 0.05, 0.95);
      kit.embers(e, RSTAGE.GOLD, { n: quiet ? 6 : 16, radius: 1.0, life: 1.4, rise: 2.4 });
      kit.light(e, RSTAGE.GOLD, 5, 0.6, 14);
      GFX.bloomPulse(0.4);
      if (!quiet && g.world && g.world.director) g.world.director.force("fireworks", { n: 5 });
      const from = this.screen(e);
      HudFX.reward(g.el, from, "[data-egg]", { n: quiet ? 5 : 10, kind: "coin", color: COLORS.gold, clear: ".qpanel", dur: 520, gap: 26 });
      if (!quiet) HudFX.reward(g.el, from, "[data-egg]", { n: 6, kind: "star", color: COLORS.yellow, clear: ".qpanel", dur: 560, gap: 30 });
      Sound.sfx("boost", 0, { vol: 0.8 });
      Sound.sfx("reward", 0, { vol: 0.9, delay: 0.1 });
      if (rich) Sound.sfx("crowd_cheer", 0, { vol: 0.8, delay: 0.25 });
      g.show.wait(1.2, () => { if (!g.unmounted) Sound.sfx("boost", 0, { vol: 0.9, rate: 1.1 }); }); // it leaves
      g.show.wait(1.75, () => this.loops(false)); // (nothing rings on into the results)
    } else { // forced retirement: it slews to a stop, the engine blows, a wheel is thrown clear, it burns where it stands
      const sd = g.carX > 0.4 ? -1 : g.carX < -0.4 ? 1 : this.joltSd || 1, pan = this.pan(g.carX);
      this.setLow(2);
      Sound.stopLoop("racer-alarm", 0.2); this.alarm = false;
      rig.wreck(sd);
      this.speedTo(0.05, 3.2);
      this.skidT = quiet ? 0.2 : 0.7;
      Sound.sfx("skid", pan, { vol: 1 });
      if (this.engine) Sound.loopSet("racer-engine", { rate: 0.5, vol: 0.12 });
      g.show.wait(0.34, () => {
        if (g.unmounted) return;
        const h = rig.hoodAt(new THREE.Vector3());
        kit.explosion(h, { size: quiet ? 0.8 : 1.2, color: 0xff5a2a, smokeColor: RSTAGE.SMOKE, debrisColor: RSTAGE.WRECK });
        kit.sparks(h, 0xffffff, { n: quiet ? 6 : 12, speed: 22, life: 0.5, len: 1.6, w: 0.06, k: 1.8, gravity: 8 });
        this.glow(h, 0xff5a20, 13, 0.7, 1.1);
        // a front wheel is thrown clear, spinning, a trail of sparks behind it
        const wh = quiet ? null : rig.throwWheel(sd > 0 ? 1 : 0, this._v.set(-sd * 6.5, 6.2, -2.5));
        if (wh) { const tr = kit.trailer((v) => wh.getWorldPosition(v), { smoke: 0.25, fire: 0, sparks: 1, rate: 40, size: 0.5, life: 0.4, color: 0xffb060, a: 0.3 }); g.show.wait(1.1, () => { tr.on = false; }); }
        this.jolt = 0.8; this.hitK = 1;
        g.shake(0.2);
        GFX.pulse(2.4, 0);
        this.snap = 3;
        VFX.hitStop(3);
        Sound.stopLoop("racer-engine", 0.5); Sound.engine(false); this.engine = false;
        Sound.sfx("explosion_big", pan);
        Sound.sfx("crash_glass", pan, { delay: 0.05, vol: 0.7 });
        Sound.sfx("debris", pan, { delay: 0.3, vol: 0.8 });
        // it burns where it stands: fire over the hood, smoke going straight up now that the road has stopped
        rig.ablaze = true; rig.flare = 1; // (tongues of fire leap from the hood with the blast and stand there: see RacerRig.update)
      });
      g.show.wait(0.78, () => { // a tank goes, a moment after the engine
        if (g.unmounted) return;
        const q = rig.centre(new THREE.Vector3()).add(this._v.set(-sd * 0.9, -0.2, 0.9));
        kit.explosion(q, { size: 0.6, color: 0xff6a20, ring: false, smokeColor: RSTAGE.SMOKE });
        this.glow(q, 0xff5a20, 8, 0.5, 0.8);
        rig.flare = Math.max(rig.flare, 0.7);
        g.shake(0.1);
        Sound.sfx("explosion_small", pan, { rate: 0.9 });
      });
      g.show.wait(0.1, () => { if (!g.unmounted) Sound.sfx("gameover", 0, { vol: 0.85 }); }); // (with the skid, as the game always had it: it has rung out before the results and their trophy)
      g.show.wait(1.75, () => this.loops(false));
    }
  }

  // ---- the lens (the game calls these round its own camera) ------------------------------------------------------------
  // before it is placed: a blow lurches it toward the rig, a boost lets it fall back, a near miss leans it away
  camera() {
    const g = this.g, j = this.jolt * this.jolt, q = REDUCED_MOTION || GFX.calm ? 0.3 : 1;
    g.camBase.y = 3.5 - 0.24 * j * q;
    g.camBase.z = 8.5 - 0.9 * j * q + 0.6 * this.pull * q;
    g.camBase.x += this.camX;
    g.lookAt.x += this.camX * 0.4;
  }
  // after: a blow rolls it a little (the lane badges are drawn from the unrolled, unshaken lens: see the game's drawOver)
  lens() { const r = this.joltSd * 0.035 * this.jolt * this.jolt * (REDUCED_MOTION || GFX.calm ? 0 : 1); if (r) this.g.camera.rotateZ(r); return r; }

  update(dt, sp, step, sky) {
    const g = this.g, d = VFX.dt, t = VFX.t, kit = this.kit, rig = this.rig, quiet = REDUCED_MOTION || GFX.calm;
    kit.drift.set(0, 0, Math.min(sp * 0.3, 11)); // (what is thrown off falls behind, slowly enough that a blast is seen where it was struck)
    if (this.snap > 0 && --this.snap === 0) { GFX.ab = Math.min(GFX.ab, 0.6); GFX.punch = Math.min(GFX.punch, 0.002); } // (the colours split and the picture jumps for three frames, no longer: it is sharp while the blow is read)
    if (this.verdict) this.verdict.t += d;
    if (g.state === "ask") { this.verdict = null; if (this.speedGo < 1 && this.overT < 0) this.speedTo(1, 1.5); } // a new question: the road is the game's again
    if (g.state !== "ask" && g.state !== "over" && g.quiz && g.quiz.sheet && this.verdict && this.verdict.ok && this.speedGo === 1 && g.boostRate) this.speedTo(this.cruise(), 1.3); // (the explanation is up: the road settles to its cruise, and the lens's streak and its split colours with it)
    this.speedK += (this.speedGo - this.speedK) * Math.min(1, d * this.speedRate * 3);
    this.jolt = Math.max(0, this.jolt - d * 2.6);
    this.camX *= Math.pow(0.02, d);
    this.nearK = Math.max(0, this.nearK - d * 3);
    this.nearCool = Math.max(0, this.nearCool - d);
    this.gateFlare = Math.max(0, this.gateFlare - d * 3.2);
    this.overK = Math.max(0, this.overK - d * 1.1);
    g.gateConeMat.uniforms.uI.value = (1 + 2.4 * this.gateFlare) * (g.leaving ? 1 - clamp(g.leaving.position.z / 5, 0, 1) : 1); // (the lane's cone flares as a right gate is taken, and fades as the gantry goes over the lens)
    // ---- the lens follows the rig across the road without smearing it (the rig is what a lane change is read by: its
    // roll, its steered wheels), and a picture that a blow is shaking stays sharp
    { const post = g.post; if (this.mblur0 === undefined) this.mblur0 = post.mblur === undefined ? 1 : post.mblur; post.mblur = g.shakeAmt > 0.012 || this.jolt > 0.05 ? 0 : this.mblur0 * (1 - 0.85 * clamp(Math.abs(rig.pvx) / 5, 0, 1)); }
    // ---- a boost: the lens falls back while the stacks burn, the flame is heard for as long as it is seen
    const boosting = g.boostRate && g.state === "ask" ? 1 : 0;
    this.pull += (Math.max(boosting, rig.surgeT > 0.45 ? 0.7 : 0) - this.pull) * Math.min(1, d * 3.5);
    if (rig.flame > 0.25 && !this.flame && g.state !== "over") this.flame = Sound.loop("racer-flame", "boost_flame", { vol: 0.42, fade: 0.08 }) || "none";
    if (this.flame && (rig.flame <= 0.25 || (g.state === "over" && !this.full))) { Sound.stopLoop("racer-flame", 0.25); this.flame = false; }
    if (this.flame === true) Sound.loopSet("racer-flame", { vol: 0.2 + 0.3 * rig.flame, rate: 0.9 + 0.25 * rig.flame });
    // ---- near misses: something on the main road passes the rig close by
    if (g.world && g.state !== "over") {
      const rz = RACER_CAR_Z + rig.off.z, x0 = g.carX + rig.off.x;
      for (const c of g.world.cars) {
        if (!c.on || c.lane !== "M") { c._pz = undefined; continue; }
        if (c._pz !== undefined && (c._pz > rz) !== (c.z > rz) && Math.abs(c.x - x0) < 3.8 && this.nearCool <= 0 && rig.inT >= 1) this.nearMiss(c);
        c._pz = c.z;
      }
    }
    if (this.nearK > 0.01 && g.lines) { const lu = g.lines.material.uniforms; g.lines.visible = true; lu.uI.value = Math.max(lu.uI.value, this.nearK * 1.5); lu.uStretch.value = Math.max(lu.uStretch.value, 1 + this.nearK * 1.6); }
    // ---- locked wheels: tyre smoke off all four, sparks off the rims, marks laid under the rear pair
    if (this.skidT > 0 || (rig.cheerT >= 0 && rig.locked)) {
      this.skidT = Math.max(0, this.skidT - d);
      if ((this.markT -= d) <= 0 && d > 0) {
        this.markT = 0.04;
        for (const i of [0, 1, 2, 3]) this.mark(i, rig.contact(i, this._v));
        if (!quiet) {
          const i = Math.floor(Math.random() * 4), p = rig.contact(i, this._v);
          kit.smoke(p, { size: 0.6, life: 0.65, a: 0.34, cold: true, color: 0x6a6790, rise: 0.9, vel: this._w.set(rand(-1, 1), 0.4, 2.5) }); // (pale violet-grey: rubber smoke that is seen against a dark road)
          if (Math.random() < 0.6) kit.sparks(p, 0xffc890, { n: 2, speed: 6, dir: this._w.set(0, 0.5, 1), spread: 0.8, life: 0.3, len: 0.4, w: 0.045, gravity: 9, k: 1.7 });
        }
      }
    }
    // marks: dark strokes of rubber that the road carries back
    { let any = false;
      for (const at of this.markAt) if (at) { at.z += step; at.age += d; }
      for (const mk of this.marks) {
        if (!mk.on) continue;
        mk.z += step; mk.age += d;
        if (mk.z > 14 || mk.age > 2.4) { mk.on = false; this.markDark.setMatrixAt(mk.i, this._zero); continue; }
        any = true;
        this._m.compose(this._v.set(mk.x, 0.05, mk.z), this._q.setFromEuler(this._e.set(0, mk.a, 0)), this._s.set(0.24, 1, mk.len));
        this.markDark.setMatrixAt(mk.i, this._m);
      }
      this.markDark.visible = any || this.marksLive;
      this.marksLive = any;
      this.markDark.instanceMatrix.needsUpdate = true; }
    // ---- the crash: the glow held down while it happens (the game sets its bloom each frame, before this)
    if (this.capT > 0 && g.post) { this.capT = Math.max(0, this.capT - d); g.post.bloom *= 1 - 0.6 * smoothstep(0, 0.2, this.capT); }
    // ---- the pane, the shield's shell, the rings, the pools of light
    if (this.paneT > 0) { this.paneT -= d; const k = clamp(this.paneT / 0.14, 0, 1); this.pane.material.opacity = k * 0.66; this.pane.scale.setScalar(1 + (1 - k) * 0.16); this.pane.visible = this.paneT > 0; }
    { const su = this.shellMat.uniforms;
      this.shellT += d;
      const swell = this.shellT >= 0.75 ? 0 : quiet ? 0.6 * (1 - this.shellT / 0.75) : (0.5 - 0.5 * Math.cos((this.shellT / 0.25) * Math.PI * 2)) * (1 - 0.3 * Math.floor(this.shellT / 0.25)); // three swells, each fainter
      su.uTime.value = t; su.uK.value = swell * this.shellA; su.uHit.value = Math.max(0, su.uHit.value - d * 1.6);
      this.shell.visible = su.uK.value > 0.004 || su.uHit.value > 0.004; }
    for (const wv of this.waves) {
      if (!wv.live) continue;
      wv.t = wv.t < 0 ? Math.min(0, wv.t + d) : wv.t + d;
      if (wv.t < 0) { wv.m.visible = false; continue; }
      const u = Math.min(1, wv.t / wv.dur);
      wv.m.visible = u < 1;
      if (u >= 1) { wv.live = false; wv.t = -1; continue; }
      const sc = lerp(wv.s0, wv.s1, Math.pow(u, 0.8));
      if (wv.ride) wv.ride(wv.at);
      wv.m.position.copy(wv.at);
      wv.m.quaternion.copy(g.camera.quaternion);
      wv.m.scale.setScalar(sc);
      wv.m.material.uniforms.uW.value = clamp(wv.w / sc, 0.006, 0.4); // (as thick on the screen at every size: a line, not a band)
      wv.m.material.uniforms.uK.value = Math.min(1, u * 10) * (1 - smoothstep(0.7, 1, u));
    }
    for (const q of this.glows) {
      if (q.t <= 0) continue;
      q.t -= d;
      const k = Math.max(0, q.t) / q.dur;
      q.m.visible = q.t > 0;
      q.m.position.z += kit.drift.z * d;
      q.m.material.color.setRGB(q.col[0] * k * k * q.k, q.col[1] * k * k * q.k, q.col[2] * k * k * q.k);
    }
    // ---- the band's edge: a red flash as a life goes; on the last life a red frame that swells once with each tone
    // of the alarm (two to its loop of 2.25 s), counted on the alarm's own clock, or stands still with Reduced
    // effects; with no life left it holds.
    this.hitK = Math.max(0, this.hitK - d * 3.4);
    this.lowK += ((this.low && (g.state !== "over" || this.low === 2) ? 1 : 0) - this.lowK) * Math.min(1, d * 5);
    this.alarmGame += dt;
    const fk = this.hitK * this.hitK;
    if (this.lowK > 0.01 || fk > 0.01) {
      const cam = g.camera, b = g.bandSize(6);
      const at = this.alarm && Sound.ctx ? Sound.ctx.currentTime - this.alarmAt : this.alarmGame, ph = (Math.abs(at - this.alarmGame) < 0.2 ? at : this.alarmGame) / 1.125;
      const beat = quiet ? 0.7 : this.low === 2 ? 0.5 : 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
      this.frame.visible = true;
      this.frame.position.copy(cam.position).add(this._v.set(0, 0, -6).applyQuaternion(cam.quaternion));
      this.frame.quaternion.copy(cam.quaternion);
      this.frame.scale.set(b.w * 1.5, b.h * 1.5, 1);
      this.frameU.uK.value = fk;
      this.edge.set(this.lowK, beat);
    } else { this.frame.visible = false; this.edge.set(0, 0); }
    // ---- sound that follows the game: the engine with the road's speed and the stacks (it wavers on the last life);
    // without a recording, the alarm as a pip
    const rev = clamp(sp / 80, 0, 1.4), sput = this.low === 1 ? 0.93 + 0.05 * Math.sin(t * 9) * Math.sin(t * 2.3) : 1;
    if (this.engine && !(g.state === "over" && !this.full)) Sound.loopSet("racer-engine", { rate: (0.72 + 0.42 * rev + 0.14 * rig.flame) * sput, vol: 0.18 + 0.1 * rev + 0.08 * rig.flame });
    if (this.low === 1 && !this.alarm && g.state !== "over" && (this.lowT -= d) <= 0) { this.lowT = 1.125; Sound.sfx("alarm", 0, { vol: 0.6 }); }
  }
  // a stroke of rubber under tyre i: from where it last touched the road (carried back since) to where it touches now
  mark(i, p) {
    const was = this.markAt[i], x = p.x, z = p.z + 0.2;
    if (was && was.age < 0.12) {
      const dx = x - was.x, dz = z - was.z, mk = this.marks[this.markI++ % this.MN];
      mk.on = true; mk.x = (x + was.x) / 2; mk.z = (z + was.z) / 2; mk.a = Math.atan2(dx, dz); mk.len = Math.hypot(dx, dz) + 0.3; mk.age = 0;
    }
    this.markAt[i] = { x, z, age: 0 };
  }
  dispose() {
    this.loops(false);
    GFX.setDanger(0);
    HudFX.low(this.g.el, false);
    this.kit.dispose();
    this.waves.forEach((w) => { w.m.material.dispose(); });
    this.waves[0].m.geometry.dispose();
    this.glows.forEach((q) => q.m.material.dispose());
    this.glows[0].m.geometry.dispose();
    [this.markDark, this.markHot, this.pane, this.frame, this.shell].forEach((m) => { m.material.dispose(); m.geometry.dispose(); });
    this.paneTex.dispose();
    this.edge.dispose();
  }
}
