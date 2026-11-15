// Risk Blaster's sky when the page could fetch it (when it could not, 20f-blasterspace.js draws its own, as it always
// did): three panoramas of deep space, cross-faded as a wave travels from region to region; the lamps that light
// whatever flies in it; and what chrome mirrors there. Look only: nothing here reads or changes a rule.
//
// Only a window of about 30 by 27 degrees is ever seen (the band between the question and the answers), and a
// panorama has 11 pixels to the degree: true to scale, the band would show a blur 340 pixels across. So each dome is
// stretched along the way ahead (zoom): the band takes in two to three times the angle, a star is near its own size
// again, and a whole nebula stands behind the demon instead of one soft corner of it.
//
// A region: which panorama (sky), the point of it that stands dead ahead (at: across and down the picture, 0 to 1),
// its roll, how wide a piece the band shows (zoom), its gain and how far its brightest parts are lifted past white.
// lamps: the key (above and behind the lens, on the side the picture's own light comes from), two rims far ahead, one
// to each side, in the sky's own two colours, and a soft top light. Each is a real light and a card of light in what
// chrome mirrors (see envFor), so the same lamp is seen in a hull's reflection and felt on its plates.
// space: what this region changes in the world round it (fog, rocks, clouds, the hulls' light: see SPACE_REGIONS).
const BLASTER_SKIES = {
  nebula: { sky: "blaster-deep-1", at: [0.36, 0.42], roll: 0, zoom: 2.3, gain: 0.92, lift: 1.5,
    key: [0xdfe6ff, 1.0], rimA: [0xff3ad4, 1.5], rimB: [0x35efff, 1.5], top: [0xbfd0ff, 0.8], amb: [0x5a4aa0, 0.5],
    space: { fog: 0x05020f, amb: 0x6a5ac0, key: 0xe2e6ff, cloudA: 0x8a2ad0, cloudB: 0x35c8ff, clouds: 0.5, rockTint: 0x6a5a9a, rocks: 0.14, stars: 0.55, planet: [34, 6, 1700, 70] } },
  belt: { sky: "blaster-deep-4", at: [0.07, 0.52], roll: -0.12, zoom: 2.4, gain: 0.72, lift: 1.2, envGain: 0.9,
    key: [0xd8ecff, 1.0], rimA: [0xff4a2a, 1.5], rimB: [0x35d8ff, 1.3], top: [0xcfe0ff, 0.7], amb: [0x5a4a6a, 0.5],
    space: { fog: 0x0c0306, amb: 0x9a6a5c, key: 0xffe2c8, cloudA: 0x8a2a1e, cloudB: 0xff7a3a, clouds: 0.4, rockTint: 0x8a6a5a, rocks: 1, stars: 0.5, planet: [-34, 5, 1700, 80] } },
  orbit: { sky: "blaster-deep-1", at: [0.66, 0.30], roll: 0.1, zoom: 2.6, gain: 0.95, lift: 1.6,
    key: [0xe6ecff, 1.0], rimA: [0xa65fff, 1.4], rimB: [0x35efff, 1.6], top: [0xc8dcff, 0.8], amb: [0x4a5aa8, 0.5],
    space: { fog: 0x03040f, amb: 0x5a70c0, key: 0xdcecff, cloudA: 0x3a4ad0, cloudB: 0x35efff, clouds: 0.12, rockTint: 0x8aa0c0, rocks: 0.3, stars: 0.6, planet: [15.5, 12.5, 760, 190] } },
  station: { sky: "blaster-deep-1", at: [0.80, 0.40], roll: -0.08, zoom: 2.6, gain: 0.8, lift: 1.3,
    key: [0xfff0f4, 1.0], rimA: [0xff3ad4, 1.6], rimB: [0x5ad8ff, 1.4], top: [0xe0d0ff, 0.8], amb: [0x6a4aa0, 0.5],
    space: { fog: 0x08030f, amb: 0x7a64c0, key: 0xf0e8ff, cloudA: 0xa03ad8, cloudB: 0x35c8ff, clouds: 0.2, rockTint: 0x7a70a0, rocks: 0.05, stars: 0.5, planet: [-34, -8, 1800, 72] } },
  graveyard: { sky: "blaster-deep-4", at: [0.27, 0.37], roll: 0.2, zoom: 2.4, gain: 1.15, lift: 1.5,
    key: [0xd8e0ff, 0.9], rimA: [0x7a6aff, 1.5], rimB: [0xff5a3a, 1.3], top: [0xb8c8ff, 0.7], amb: [0x40486a, 0.5],
    space: { fog: 0x04050c, amb: 0x5a6a90, key: 0xd0dcff, cloudA: 0x3a3a8a, cloudB: 0x8a9aff, clouds: 0.35, rockTint: 0x5a6078, rocks: 0.45, stars: 0.5, planet: [-34, 4, 1900, 60] } },
  gate: { sky: "blaster-deep-5", at: [0.709, 0.5625], roll: 0, zoom: 2.3, gain: 0.85, lift: 1.4,
    key: [0xe6f4ff, 1.0], rimA: [0xff3ad4, 1.5], rimB: [0x2ad8ff, 1.7], top: [0xb0e8ff, 0.8], amb: [0x40609a, 0.5],
    space: { fog: 0x03060f, amb: 0x5a80c0, key: 0xe0f2ff, cloudA: 0x1a8ad0, cloudB: 0xff3ad4, clouds: 0.45, rockTint: 0x7090b0, rocks: 0.08, stars: 0.45, planet: [34, -7, 1700, 64] } },
};
// Where the lamps stand (toward each, from anything they light). The fighter is seen from behind and above and the
// demon from the front, so between them these put a highlight on both: the key on what faces the lens, the rims on
// the edges that turn away, the top light on the fighter's back and the demon's shoulders and horns.
const BLASTER_LAMPS = { key: [-0.5, 0.58, 0.64], rimA: [-0.9, 0.16, -0.4], rimB: [0.9, 0.2, -0.38], top: [0.3, 0.84, -0.45], kick: [0, 0.42, -0.9] };
// (kick: a cold backlight, behind the fight and a little above it. Every edge that turns away from the lens mirrors it:
// that thin line of cyan-white is what cuts the demon and the fighter out of a sky of their own colours.)
const BLASTER_KICK = [0xbfe8ff, 1.0];

class BlasterSky {
  // (built by the game before anything that mirrors it; first: the region the run starts in)
  constructor(game, skies, first) {
    const g = (this.g = game), s = g.scene;
    this.skies = skies;
    this.main = skies["blaster-deep-1"];
    this.root = new THREE.Group(); // (it keeps the camera's place: see follow)
    s.add(this.root);
    // two domes: the region the ship is in, and the one coming up over it (added on top as the first is turned down)
    this.layers = [0, 1].map((i) => {
      const stretch = new THREE.Group(), dome = makePanoSky(this.main, { radius: 300 });
      if (i) { dome.material.transparent = true; dome.material.blending = THREE.AdditiveBlending; dome.renderOrder = -19; dome.visible = false; }
      stretch.add(dome);
      this.root.add(stretch);
      return { stretch, dome, c: null };
    });
    // The picture is only ever seen through that narrow window, far from the one line where a panorama's two ends
    // meet, so it can be filtered through its smaller copies: no star sparkles as the view sways.
    for (const n in skies) { const m = skies[n] && skies[n].map; if (m) { m.minFilter = THREE.LinearMipmapLinearFilter; m.generateMipmaps = true; m.needsUpdate = true; } }
    // the lamps: the game's own ambient and key, re-aimed, and three more
    this.amb = s.children.find((o) => o.isAmbientLight) || null;
    this.key = g.keyLight || null;
    const lamp = (dir) => { const l = new THREE.DirectionalLight(0xffffff, 0); l.position.fromArray(dir).multiplyScalar(40); s.add(l); return l; };
    this.rimA = lamp(BLASTER_LAMPS.rimA); this.rimB = lamp(BLASTER_LAMPS.rimB); this.top = lamp(BLASTER_LAMPS.top); this.kick = lamp(BLASTER_LAMPS.kick);
    if (this.key) this.key.position.fromArray(BLASTER_LAMPS.key).multiplyScalar(40);
    this.envs = {}; // what chrome mirrors, one map to a region, made when the region is first entered
    this.users = []; // materials that mirror it (the fighter's, the demon's): see mirror
    this.envK = 1; this.age = 0; this.flashK = 0; this.aimY = 0.085; // (aimY: how far above the way ahead the demon rides, as a slope)
    this._c = new THREE.Color(); this._c2 = new THREE.Color();
    this.cur = this.conf(first);
    this.next = null; this.k = 0;
    this.show(this.layers[0], this.cur, 1);
    this.env = this.envFor(this.cur);
  }
  // a region's sky as numbers (its own panorama if it arrived, else the main one)
  conf(id) {
    const r = BLASTER_SKIES[id] || BLASTER_SKIES.nebula, sky = this.skies[r.sky] || this.main, D = Math.PI * 2;
    return { id, r, sky, yaw: (r.at[0] - 0.25) * D, pitch: (0.5 - r.at[1]) * Math.PI, roll: r.roll || 0, zoom: r.zoom || 2, gain: r.gain === undefined ? 1 : r.gain, lift: r.lift === undefined ? 1.4 : r.lift };
  }
  // one dome showing a region, at k of its strength
  show(L, c, k, sway = 0, zoomK = 1) {
    const u = L.dome.material.uniforms;
    L.dome.visible = k > 0.004;
    if (!L.dome.visible) return;
    if (u.tA.value !== c.sky.map) u.tA.value = u.tB.value = c.sky.map;
    u.uMix.value = 0;
    u.uGain.value = c.gain * k;
    u.uLift.value = c.lift;
    u.uRot.value = (c.yaw + Math.sin(sway * 0.05) * 0.03) / (Math.PI * 2);
    // (the point named in `at` stands behind the demon, which rides above the middle of the band: see BlasterDemon.fit)
    L.dome.rotation.set(-c.pitch + Math.atan(this.aimY * c.zoom * zoomK) - Math.sin(sway * 0.037 + 1) * 0.02, 0, c.roll);
    L.stretch.scale.set(1, 1, c.zoom * zoomK);
  }
  // What chrome mirrors in a region: the panorama itself, turned as the band shows it and brighter (a mirror the
  // size of a hull plate shows little of so dark a sky otherwise), and the lamps as cards of light.
  envFor(c) {
    if (this.envs[c.id] !== undefined) return this.envs[c.id];
    let tex = null;
    if (GFX.ok) {
      try {
        const r = c.r, sc = new THREE.Scene(), dome = makePanoSky(c.sky, { radius: 60, gain: r.envGain === undefined ? 1.5 : r.envGain, lift: 0.7, rot: c.yaw });
        dome.rotation.set(-c.pitch, 0, c.roll);
        sc.add(dome);
        // A lamp is a soft box: brightest at its middle, falling away to nothing at its edge, so a flat plate that
        // turns to face one takes a sheen that slides across it and never a slab of white. (The map is drawn without
        // a depth buffer or blending: each lamp is a nest of discs, dimmest and widest first, and `order` says what
        // lies over what.)
        const card = (dir, col, k, w, h, order = 0) => {
          [[1.0, 0.07], [0.82, 0.2], [0.64, 0.42], [0.46, 0.7], [0.28, 1.0]].forEach(([s, b], i) => {
            const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ color: neon(col, k * b), side: THREE.DoubleSide }));
            m.position.fromArray(dir).normalize().multiplyScalar(40 - i * 0.05);
            m.lookAt(0, 0, 0);
            m.scale.set(w * s, h * s, 1);
            m.renderOrder = order + i * 0.1;
            sc.add(m);
          });
        };
        card([0.3, 0.1, 1], r.top[0], 0.5, 150, 120, -5); // a wide, dim wall of light behind the lens: what faces the lens (the demon's chest, its face, the fighter's tail) mirrors that and not a void
        card([0, -1, 0.15], r.amb[0], 0.5, 100, 100, -5); // a floor of dim light, so a belly is never a hole
        card(BLASTER_LAMPS.key, r.key[0], 2.5 * r.key[1], 52, 36);
        card(BLASTER_LAMPS.rimA, r.rimA[0], 3.0 * r.rimA[1], 16, 64);
        card(BLASTER_LAMPS.rimB, r.rimB[0], 3.0 * r.rimB[1], 16, 64);
        card(BLASTER_LAMPS.top, r.top[0], 1.35 * r.top[1], 80, 46);
        card(BLASTER_LAMPS.kick, (r.kick || BLASTER_KICK)[0], 2.4 * (r.kick || BLASTER_KICK)[1], 150, 44); // the backlight: a wide band behind the fight
        const rt = GFX.pmrem().fromScene(sc, 0.02, 0.1, 100);
        disposeTree(sc);
        rt.texture.dispose = () => rt.dispose(); // (see makeEnvMap: the target owns the texture)
        tex = rt.texture;
        c.sky.map.minFilter = THREE.LinearMipmapLinearFilter; c.sky.map.generateMipmaps = true; c.sky.map.needsUpdate = true; // (makePanoSky took its smaller copies away again)
      } catch (e) { tex = null; }
    }
    return (this.envs[c.id] = tex);
  }
  // A material that should mirror the region's sky and lamps: its map is kept up to date as regions change.
  // k: how strongly it mirrors (its envMapIntensity at full).
  mirror(mat, k = 1) {
    this.users.push({ mat, k });
    mat.envMap = this.env;
    mat.envMapIntensity = k * this.envK;
    mat.needsUpdate = true;
    return mat;
  }
  // The world moves on to another region (BlasterSpace.setRegion calls this with the same time).
  go(id, dur) {
    if (this.next && this.next.id === id) return;
    if (!this.next && this.cur.id === id) return;
    if (this.next) { this.queued = { id, dur }; this.rate = Math.max(this.rate, 1 / 0.6); return; } // (a change on top of a change: the first is hurried home, then the second starts)
    this.next = this.conf(id);
    this.k = 0; this.rate = 1 / Math.max(0.01, dur); this.swapped = false;
    this.envFor(this.next);
  }
  // a blast lights the sky for a moment (the game's boom calls this through BlasterSpace.flash)
  flash(k) { this.flashK = Math.max(this.flashK, k); }
  update(dt, w) {
    const calm = GFX.calm || REDUCED_MOTION, g = this.g;
    this.age += dt;
    if (g.enemy && g.enemy.yK > 0) this.aimY += (g.enemy.yK - this.aimY) * Math.min(1, dt * 3);
    this.flashK = Math.max(0, this.flashK - dt * 2.6);
    let e = 0;
    if (this.next) {
      this.k = Math.min(1, this.k + dt * this.rate);
      e = this.k * this.k * (3 - 2 * this.k);
      if (!this.swapped && this.k >= 0.5) { // half way: chrome starts to mirror the new region (it is turned down while the change is made)
        this.swapped = true;
        this.env = this.envFor(this.next) || this.env;
        for (const u of this.users) u.mat.envMap = this.env;
      }
      if (this.k >= 1) {
        this.cur = this.next; this.next = null; e = 0; this.age = 0;
        if (this.queued) { const q = this.queued; this.queued = null; this.go(q.id, q.dur); }
      }
    }
    // the sky: flying into it, very slowly (and fast through the warp); a little sway, so it is never a still picture
    const fly = 1.05 - 0.1 * clamp(this.age / 90, 0, 1) - (calm ? 0 : 0.22 * w), t = calm ? 0 : g.t, lit = 1 + this.flashK * this.flashK * 0.35;
    this.show(this.layers[0], this.cur, (1 - e) * lit, t, fly);
    if (this.next) this.show(this.layers[1], this.next, e * lit, t, 1.12 - 0.07 * e - (calm ? 0 : 0.22 * w)); else this.layers[1].dome.visible = false;
    // the lamps, blended between the two regions
    const A = this.cur.r, B = this.next ? this.next.r : A;
    const set = (l, a, b, k = 1) => { if (!l) return; l.color.copy(this._c.set(a[0])).lerp(this._c2.set(b[0]), e); l.intensity = lerp(a[1], b[1], e) * k; };
    set(this.key, A.key, B.key);
    set(this.rimA, A.rimA, B.rimA);
    set(this.rimB, A.rimB, B.rimB);
    set(this.top, A.top, B.top, 0.22); // (as a lamp it is faint: a flat chrome back facing a hard light is a slab of white. Its soft card in the mirror map does the work.)
    set(this.amb, A.amb, B.amb);
    set(this.kick, A.kick || BLASTER_KICK, B.kick || BLASTER_KICK, 0.55);
    // what chrome mirrors is turned down through the change, so the new map never pops in
    this.envK = 1 - 0.6 * Math.sin(Math.PI * (this.next ? this.k : 0));
    for (const u of this.users) u.mat.envMapIntensity = u.k * this.envK;
  }
  follow(camera) { this.root.position.copy(camera.position); }
  dispose() {
    for (const id in this.envs) if (this.envs[id]) this.envs[id].dispose();
    this.envs = {};
    this.users.length = 0;
  }
}
