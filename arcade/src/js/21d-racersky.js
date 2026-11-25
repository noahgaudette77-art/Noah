// Nest Egg Run's sky when the page could fetch it (when it could not, the road keeps the sky it always had): five
// panoramas, one to each stretch of the career, cross-faded where the landscape changes behind its bank of fog:
//   downtown at 25      dawn: rose and teal, dark blue above
//   the coast           day: turquoise, hot-pink cirrus
//   the desert          golden hour: a great orange and pink lenticular cloud
//   the mountain pass   dusk: purple clouds rimmed in orange, painted ranges far off
//   downtown at 65      night: stars and a violet milky way over a cyan and magenta glow
// and in the tunnels none of it: the sky is turned down to the dark of the bore, and what lacquer mirrors there is
// the tunnel's own lamps. Look only: nothing here reads or changes a rule.
//
// Only the lowest 18 degrees of sky are ever seen (the band between the question and the answers, with the lens
// tipped at the road), so each dome is stretched along the way ahead (zoom): the band then takes in the first 30 to
// 40 degrees of the picture, a cloud is near its own shape again, and a panorama's sun stands small enough to sit
// behind the game's own golden egg, which stays. The horizon of the picture stays on the horizon of the road: its
// lower half is under the game's own ground.
//
// A sky: which panorama (sky), the point of it that stands dead ahead (at: across the picture, 0 to 1), how wide a
// piece the band shows (zoom), a little sink (pitch: the picture's own far shore goes under the road's horizon), its
// gain and how far its brightest parts are lifted past white. Then the light it gives:
//   key    the lamp above and behind the lens (what faces the lens is lit by it)      sun   the egg's own light, from dead ahead
//   amb    the fill on everything lit                                                  rimL, rimR, kick, fill   what the war rig's
//   skin takes: a rim from each side in the sky's two colours, a line of light along its upper edges, a fill of its own
//   lamps  how strongly the street's lamps show in what lacquer mirrors                haze  the far ground's haze is drawn toward this
//   wet    how much of the sky the wet road is given                                   exp, bloom, halo   the lens and the egg's halo under this sky
const RACER_SKIES = {
  dawn: { sky: "racer-dawn", at: 0.23, zoom: 2.6, pitch: 0.03, gain: 0.62, lift: 0, envGain: 1.25,
    key: [0xb4d8ea, 0.85], sun: [0xffb48a, 0.75], amb: [0x4a5a86, 0.62], rimL: [0xff5aa2, 0.9], rimR: [0x52d8ea, 0.9], kick: [0xffc2b0, 0.9], fill: [0x34466e, 1],
    lamps: 0.9, haze: [0x7a4a78, 0.34], wet: 0.8, exp: 0.97, bloom: 0.95, halo: 0.55, ground: 0x090d18, wall: 0x3a4f7c },
  day: { sky: "racer-day", at: 0.8, zoom: 2.6, pitch: 0.06, gain: 0.78, lift: 0, envGain: 1.2,
    key: [0xfff2e2, 1.0], sun: [0xffd27a, 0.6], amb: [0x5a8292, 0.7], rimL: [0xff5a9c, 0.8], rimR: [0x48d6e0, 0.9], kick: [0xfff0d8, 0.9], fill: [0x2c5c6c, 1],
    lamps: 0.45, haze: [0xd88a8a, 0.3], wet: 0.62, exp: 0.93, bloom: 0.9, halo: 0.4, ground: 0x0c1418, wall: 0x4a7886 },
  gold: { sky: "racer-sunset", at: 0.43, zoom: 3.0, pitch: 0.05, gain: 0.95, lift: 0.15, envGain: 1.45,
    key: [0xffc896, 0.95], sun: [0xffa23a, 0.9], amb: [0x5c4a66, 0.62], rimL: [0xff6a3a, 1.0], rimR: [0x3aa8d8, 0.8], kick: [0xffb060, 1.0], fill: [0x3a3058, 1],
    lamps: 0.7, haze: [0xb86a3a, 0.2], wet: 0.8, exp: 1, bloom: 1, halo: 0.7, ground: 0x100a0c, wall: 0x5a4470 },
  dusk: { sky: "racer-sunset-b", at: 0.518, zoom: 2.5, pitch: 0, gain: 0.9, lift: 0.2, envGain: 1.5,
    key: [0xd6a8ff, 0.8], sun: [0xff8a34, 0.9], amb: [0x4a3a7a, 0.6], rimL: [0xff3ab4, 1.0], rimR: [0xff8a3a, 0.9], kick: [0xffa060, 1.0], fill: [0x2c1e5c, 1],
    lamps: 0.9, haze: [0x7a2a80, 0.3], wet: 0.85, exp: 1, bloom: 1, halo: 0.7, ground: 0x0c0714, wall: 0x4a2c7c },
  night: { sky: "racer-night", at: 0.68, zoom: 2.6, pitch: 0.06, gain: 0.62, lift: 0.6, envGain: 1.5,
    key: [0x9cb8ff, 0.75], sun: [0xffc468, 0.6], amb: [0x34467c, 0.6], rimL: [0xff3ad4, 1.0], rimR: [0x35efff, 1.0], kick: [0xc8a8ff, 0.9], fill: [0x222c5e, 1],
    lamps: 1, haze: [0x6a2a78, 0.28], wet: 0.85, exp: 0.98, bloom: 1, halo: 0.75, ground: 0x07091a, wall: 0x2e3a78 },
  // (the tunnels: no panorama. The dome keeps the last one, turned down to the dark of the bore.)
  tunnel: { sky: null, zoom: 1.6, pitch: 0, gain: 0.035, lift: 0, envGain: 0, tint: 0xffc890,
    key: [0xffd9a0, 0.8], sun: [0xffd9a0, 0.12], amb: [0x4a3a2a, 0.6], rimL: [0x35efff, 0.8], rimR: [0xff3ad4, 0.8], kick: [0xffd9a0, 0.8], fill: [0x2a2018, 1],
    lamps: 0, haze: [0x1c1208, 0], wet: 1, exp: 1, bloom: 1, halo: 1, ground: 0x0a0806, wall: 0x2a2016 },
};
const RACER_PANOS = ["racer-dawn", "racer-day", "racer-sunset", "racer-sunset-b", "racer-night"];
// which sky a landscape is driven under (downtown is seen twice: at dawn, and again at night)
function racerSkyId(biome, year) {
  if (biome === "tunnel") return "tunnel";
  if (biome === "coast") return "day";
  if (biome === "desert") return "gold";
  if (biome === "mountain") return "dusk";
  return year < 20 ? "dawn" : "night";
}

class RacerSky {
  // (built by the game before anything that mirrors it)
  constructor(game, skies) {
    const g = (this.g = game), s = g.scene;
    this.skies = skies;
    this.main = skies["racer-dawn"] || skies[Object.keys(skies)[0]];
    this.root = new THREE.Group(); // (it keeps the camera's place: see follow)
    this.root.userData.sky = true; // (and the wet road's mirror puts it round its own lens: see Mirror)
    this.stretch = new THREE.Group();
    this.dome = makePanoSky(this.main, { radius: 400 });
    this.stretch.add(this.dome);
    this.root.add(this.stretch);
    this._c = new THREE.Color(); this._c2 = new THREE.Color();
    this.envs = {}; this.users = []; this.envK = 1; this.flash = 0;
    // what lacquer mirrors under each sky, made now, behind the screen's cover (a map made in the middle of a run
    // would drop a frame or two). Only the sky on show keeps its picture on the graphics chip afterwards.
    this.cur = this.conf(racerSkyId(racerBiomeAt(g.year), g.year), this.main);
    // (each panorama leaves the chip again as soon as its map is made: five of them are never held there at once)
    for (const id in RACER_SKIES) { this.envFor(id); const sk = RACER_SKIES[id].sky && skies[RACER_SKIES[id].sky]; if (sk && sk.map && sk.map !== this.cur.map) sk.map.dispose(); }
    for (const n in skies) if (skies[n] && skies[n].map && skies[n].map !== this.cur.map) skies[n].map.dispose();
    this.mips(this.cur.map);
    this.next = null; this.k = 0; this.dur = 0.6; this.swapped = false;
    this.env = this.envs[this.cur.id] || null;
    if (this.env) s.environment = this.env;
    // the light this sky gives, as it is now (eased from one sky's to the next's)
    const L = (this.L = {});
    for (const n of ["key", "sun", "amb", "rimL", "rimR", "kick", "fill", "haze", "tint"]) L[n] = new THREE.Color();
    this.N = { key: 0, sun: 0, amb: 0, rimL: 0, rimR: 0, kick: 0, fill: 0, haze: 0, wet: 1, exp: 1, bloom: 1, halo: 1, lamps: 1, zoom: 1, pitch: 0, gain: 1, lift: 0, dark: 0 };
    this.settle(this.cur.r, 1);
    this.show();
    s.add(this.root);
  }
  // a sky as numbers. map: the picture the dome shows under it (a tunnel keeps the one that was up)
  conf(id, keep) {
    const r = RACER_SKIES[id] || RACER_SKIES.dawn, sky = r.sky && this.skies[r.sky] ? this.skies[r.sky] : null;
    return { id, r, map: sky ? sky.map : keep, yaw: sky ? r.at - 0.25 : null };
  }
  // The picture is only ever seen through a narrow window dead ahead, far from the one line where a panorama's two
  // ends meet, so it can be filtered through its smaller copies: no star sparkles as the lens sways.
  mips(m) { if (m && m.minFilter !== THREE.LinearMipmapLinearFilter) { m.minFilter = THREE.LinearMipmapLinearFilter; m.generateMipmaps = true; m.needsUpdate = true; } }
  // What lacquer and chrome mirror under a sky: the panorama as the band shows it, the road's own dark ground under
  // it, the street's two rows of lamps as strips of light, the egg's glow dead ahead, a soft lamp above and behind
  // the lens, and a dim wall of light behind it (what faces the lens mirrors that, not a void).
  envFor(id) {
    if (this.envs[id] !== undefined) return this.envs[id];
    let tex = null;
    if (GFX.ok) {
      try {
        const r = RACER_SKIES[id], sky = r.sky && this.skies[r.sky], sc = new THREE.Scene();
        const basic = (geo, col, order) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.renderOrder = order; sc.add(m); return m; };
        if (sky) {
          const st = new THREE.Group(), dome = makePanoSky(sky, { radius: 60, gain: r.envGain, lift: 0.3, rot: (r.at - 0.25) * Math.PI * 2 });
          dome.rotation.x = -(r.pitch || 0);
          st.scale.z = r.zoom;
          st.add(dome); sc.add(st);
          // under the horizon the road: wet, so at a shallow angle it holds the sky upside down (two bands of it, the
          // lower one dimmer), and steeper than that it is dark. (Nothing can be blended into this map: its light is
          // stored with an exponent. Each piece is drawn whole.)
          [[0, 0.3, 0.5], [0.3, 0.75, 0.22]].forEach(([a0, a1, k]) => {
            const wet = makePanoSky(sky, { radius: 59, gain: r.envGain * k, lift: 0, rot: (r.at - 0.25) * Math.PI * 2 }), ws = new THREE.Group();
            wet.geometry.dispose();
            wet.geometry = new THREE.SphereGeometry(59, 32, 6, 0, Math.PI * 2, Math.PI / 2 - a1, a1 - a0);
            wet.renderOrder = -15;
            ws.scale.set(1, -1, r.zoom);
            ws.add(wet); sc.add(ws);
          });
        } else basic(new THREE.SphereGeometry(60, 24, 12), new THREE.Color(r.ground).multiplyScalar(1.6), -20);
        // (the map is drawn without a depth buffer: `order` says what lies over what)
        { const a = sky ? 0.75 : 0; basic(new THREE.SphereGeometry(58, 32, 8, 0, Math.PI * 2, Math.PI / 2 + a, Math.PI / 2 - a), r.ground, -10); } // the ground under it
        const card = (dir, col, k, w, h, order = 0) => { // a soft box: brightest at its middle, nothing at its edge
          [[1.0, 0.07], [0.82, 0.2], [0.64, 0.42], [0.46, 0.7], [0.28, 1.0]].forEach(([q, b], i) => {
            const m = basic(new THREE.CircleGeometry(0.5, 40), neon(col, k * b), order + i * 0.1);
            m.position.fromArray(dir).normalize().multiplyScalar(40 - i * 0.05);
            m.lookAt(0, 0, 0);
            m.scale.set(w * q, h * q, 1);
          });
        };
        const strip = (x, y, z, w, h, col, k) => { const m = basic(new THREE.PlaneGeometry(w, h), neon(col, k), 2); m.position.set(x, y, z); m.lookAt(0, 0, 0); };
        card([0, 0.3, 1], r.wall, 1.15, 150, 120, -5);
        card([-0.42, 0.74, 0.52], r.key[0], 2.0 * r.key[1], 50, 34);
        card([0, 0.085, -1], r.sun[0], 3.2 * r.sun[1], 15, 15); // the egg, low and dead ahead
        if (id === "tunnel") { // the bore's two lines of lamps overhead, the cyan and magenta lines along its walls
          for (const sd of [-1, 1]) { const m = basic(new THREE.PlaneGeometry(0.7, 110), neon(0xffd9a0, 3.2), 2); m.rotation.x = Math.PI / 2; m.position.set(sd * 6.2, 7.4, 0); }
          strip(-9.5, 1.5, 0, 110, 0.22, 0x35efff, 2.2); strip(9.5, 1.5, 0, 110, 0.22, 0xff3ad4, 2.2);
        } else if (r.lamps > 0) {
          const k = 0.6 + 2.6 * r.lamps;
          strip(-26, 5, -4, 40, 1.3, RACER_LAMP[0], k); strip(26, 5, -4, 40, 1.3, RACER_LAMP[1], k);
        }
        const rt = GFX.pmrem().fromScene(sc, 0.02, 0.1, 100);
        disposeTree(sc);
        tex = ownTarget(rt); // (the target owns the texture: see ownTarget)
      } catch (e) { tex = null; }
    }
    return (this.envs[id] = tex);
  }
  // A material that should mirror the sky: its map is kept up to date as the skies change. k: how strongly.
  mirror(mat, k = 1) {
    this.users.push({ mat, k });
    mat.envMap = this.env;
    mat.envMapIntensity = k * this.envK;
    mat.needsUpdate = true;
    return mat;
  }
  // The road runs on into another landscape (RacerWorld.setBiome calls this as the fog bank closes over the change).
  go(id) {
    if ((this.next || this.cur).id === id) return;
    if (this.next) this.finish();
    this.next = this.conf(id, this.cur.map);
    this.k = 0; this.swapped = false;
  }
  finish() {
    const old = this.cur;
    this.cur = this.next; this.next = null; this.k = 0;
    if (!this.swapped) this.swap();
    if (old.map && old.map !== this.cur.map) old.map.dispose(); // (its picture leaves the graphics chip: one sky is held there at a time)
  }
  // the change is made at once (through a tunnel's mouth: the sky is whole on the first frame of the open road)
  snap() { if (this.next) { this.mips(this.next.map); this.finish(); } this.settle(this.cur.r, 1); this.show(); }
  swap() {
    this.swapped = true;
    const to = this.next || this.cur;
    this.env = this.envs[to.id] || this.env;
    if (this.env) this.g.scene.environment = this.env;
    for (const u of this.users) u.mat.envMap = this.env;
  }
  // the lamps and numbers of a sky taken k of the way from where they stand (1: at once)
  settle(r, k) {
    const L = this.L, N = this.N, c = this._c;
    for (const n of ["key", "sun", "amb", "rimL", "rimR", "kick", "fill", "haze"]) { L[n].lerp(c.set(r[n][0]), k); N[n] += (r[n][1] - N[n]) * k; }
    L.tint.lerp(c.set(r.tint === undefined ? 0xffffff : r.tint), k);
    for (const n of ["wet", "exp", "bloom", "halo", "lamps", "zoom", "pitch", "gain", "lift"]) N[n] += (r[n] - N[n]) * k;
    N.dark += ((r.sky ? 0 : 1) - N.dark) * k;
  }
  // the dome as it stands: one picture, or one going over to the next
  show() {
    const u = this.dome.material.uniforms, A = this.cur, B = this.next, N = this.N, mix = B && B.map !== A.map;
    if (u.tA.value !== A.map) u.tA.value = A.map;
    const mb = mix ? B.map : A.map;
    if (u.tB.value !== mb) u.tB.value = mb;
    if (A.yaw === null) A.yaw = B && B.yaw !== null ? B.yaw : u.uRot.value; // (a tunnel keeps the turn of the sky that was up)
    u.uRot.value = A.yaw;
    u.uRotB.value = mix && B.yaw !== null ? B.yaw : A.yaw;
    const e = this.k * this.k * (3 - 2 * this.k);
    u.uMix.value = mix ? e : 0;
    u.uGain.value = N.gain * (1 + this.flash * 0.9);
    u.uLift.value = N.lift;
    u.uTint.value.copy(this.L.tint);
    this.dome.rotation.x = -N.pitch; // (the sky ahead sinks: its own shore goes under the road's horizon)
    this.stretch.scale.z = N.zoom;
  }
  // every frame, after the game and its world have laid out their own colours: the sky has the last word on the
  // light of what is lit, the far haze, the wet road's share of it, and the lens.
  update(dt) {
    const g = this.g, w = g.world;
    this.flash = w ? Math.min(1, w.skyFlash || 0) : 0; // (lightning lights the whole sky)
    if (this.next) {
      this.mips(this.next.map);
      this.k = Math.min(1, this.k + dt / this.dur);
      if (!this.swapped && this.k >= 0.5) this.swap(); // half way: lacquer starts to mirror the new sky (it is turned down while the change is made)
      if (this.k >= 1) this.finish();
    }
    this.settle((this.next || this.cur).r, Math.min(1, dt * (this.next ? 5 : 2.2)));
    this.show();
    this.envK = 1 - 0.55 * Math.sin(Math.PI * (this.next ? this.k : 0));
    for (const u of this.users) u.mat.envMapIntensity = u.k * this.envK;
    const L = this.L, N = this.N;
    // the lamps on what is lit
    g.keyLight.color.copy(L.key); g.keyLight.intensity = N.key;
    g.amb.color.copy(L.amb); g.amb.intensity = N.amb;
    g.sunLight.color.copy(L.sun); g.sunLight.intensity = N.sun * 0.6;
    // the far ground's haze leans toward the sky's own horizon
    if (g.scene.fog && N.haze > 0.002) g.scene.fog.color.lerp(L.haze, N.haze);
    // the wet road mirrors the sky itself now: a bright sky is given less of the road
    g.groundMat.uniforms.uReflect.value *= N.wet;
    // the lens, and the egg's halo (on a painted sky it is a glow round the egg, not a second sun)
    g.post.exposure *= N.exp; g.post.bloom *= N.bloom;
    // the egg at the end of the road is the scene's jewel under every sky: gold at its crown to magenta at its foot, lit
    // from inside, in a halo of its own colours, with one glint on its shoulder
    const su = g.sun.userData.disc.material.uniforms;
    su.uTop.value.setRGB(1.0, 0.74, 0.14); su.uBottom.value.setRGB(1.0, 0.1, 0.46); su.uTint.value.setRGB(1, 1, 1);
    su.uI.value = 0.74 * (1 + 0.05 * Math.sin(VFX.t * 1.1)); // (below white: its colours hold through the lens's bloom)
    g.sun.userData.glow.material.color.setRGB(1.0, 0.46, 0.32).multiplyScalar(1.25 * N.halo);
    if (!this.glint) {
      this.glint = [glowSprite(new THREE.Color(1.5, 1.2, 0.9), 24, 0.7), glowSprite(new THREE.Color(2.2, 2.0, 1.7), 7, 0.9)];
      this.glint.forEach((q, i) => { q.position.set(-16, 25, 1 + i * 0.2); q.layers.set(1); g.sun.add(q); });
    }
    this.glint[0].material.opacity = 0.55 + 0.15 * Math.sin(VFX.t * 0.9);
  }
  follow(camera) { this.root.position.copy(camera.position); }
  // what the traffic's paint needs to mirror the sky (see racerTrafficMaterial)
  feed(u) {
    const d = this.dome.material.uniforms;
    u.tSkyA.value = d.tA.value; u.tSkyB.value = d.tB.value;
    u.uSky.value.set(d.uRot.value, d.uRotB.value, d.uMix.value, d.uGain.value * (1 - this.N.dark));
    u.uSkyZoom.value = this.N.zoom;
    u.uSkyTint.value.copy(this.L.tint);
  }
  dispose() {
    for (const id in this.envs) if (this.envs[id]) this.envs[id].dispose();
    this.envs = {};
    this.users.length = 0;
    if (this.g.scene.environment) this.g.scene.environment = null;
    for (const n in this.skies) if (this.skies[n] && this.skies[n].map) this.skies[n].map.dispose(); // (the pictures stay in hand for the next run; only their copies on the graphics chip go)
    this.dome.material.dispose(); this.dome.geometry.dispose();
  }
}
