// Asset files: the generated models, skies and sound live beside the page in arcade/assets/ and are fetched when
// a screen needs them. (INR_FILES, in 03a-files.js, is the list tools/manifest.js writes: every file and its size,
// and where each sound starts inside its sprite.)
//
// A page opened straight from disk (file://) cannot fetch anything, so there Assets.on is false and every game
// plays with what is built into the page, exactly as it did before these files existed. The same happens for any
// file that is missing or fails to load: nothing waits on it and nothing breaks.
const Assets = {
  files: typeof INR_FILES !== "undefined" ? INR_FILES : { files: {}, sprites: {}, music: {}, sets: {} },
  on: typeof location !== "undefined" && /^https?:$/.test(location.protocol) && typeof fetch === "function" && !/noassets/.test(location.hash),
  base: "assets/",
  bufs: {}, // path -> Promise<ArrayBuffer>
  fresh: {}, // "model:name" -> a parsed model nobody has used yet
  kept: {}, // "sky:name", "tex:path" -> things that can be shared between scenes
  bytes: 0, // downloaded so far (for the loading line)
  has(path) { return this.on && this.files.files[path] !== undefined; },
  // (the performance re-check) A file's bytes, once what is made of them is kept for the session (a sprite of sounds
  // decoded, a sky made a picture, a page picture decoded), are let go: a phone held both copies (17 MB of them by the
  // end of a round of every screen). A model's stay (each scene parses its own copy from them), and music's (only the
  // track playing is kept decoded: Sound.play decodes another's again from its file).
  gone: {}, // path -> true: let go after use (prefetch does not fetch it again)
  release(path) { if (this.bufs[path]) { delete this.bufs[path]; this.gone[path] = true; } },
  buffer(path) {
    if (!this.bufs[path]) {
      this.bufs[path] = fetch(this.base + path).then((r) => { if (!r.ok) throw new Error(path + ": HTTP " + r.status); return r.arrayBuffer(); }).then((b) => { this.bytes += b.byteLength; return b; });
      this.bufs[path].catch(() => { delete this.bufs[path]; });
    }
    return this.bufs[path];
  },
  // ---- models (.glb: meshopt-compressed geometry, WebP maps)
  _loader() {
    if (!this._gltf) {
      this._gltf = new THREE.GLTFLoader();
      if (typeof MeshoptDecoder !== "undefined") this._gltf.setMeshoptDecoder(MeshoptDecoder);
    }
    return this._gltf;
  },
  // (the Mac's richer tier, 2026-11-25: the owner raised the Mac's graphics memory budget from 900 MB to about 2 GB) A
  // model's sharper copy, <name>-hd (the same shape with larger pictures: tools/gen/mac-hd.mjs), is fetched in its place
  // on a computer drawing at the MAC tier; a phone, and a computer the governor or Setup holds lower, keep the model.
  file(name) {
    const hd = name + "-hd";
    return !this.phone && typeof GFX !== "undefined" && GFX.tier === 0 && this.files.files["models/" + hd + ".glb"] !== undefined ? hd : name;
  },
  loadModel(name) {
    const path = "models/" + this.file(name) + ".glb";
    if (!this.has(path) || !window.THREE || !THREE.GLTFLoader) return Promise.resolve(null);
    if (this.fresh["model:" + name]) return Promise.resolve(this.fresh["model:" + name]);
    return this._once("model:" + name, () => this.buffer(path).then((buf) => new Promise((res, rej) => this._loader().parse(buf.slice(0), "", res, rej))).then((gltf) => {
      const parts = {};
      let inr = gltf.scene.userData && gltf.scene.userData.inr; // (the processing tool's notes: parts, pivots, anchors. They ride the file's root node.)
      gltf.scene.traverse((o) => {
        if (o.name) parts[o.name] = o;
        if (!inr && o.userData && o.userData.inr) inr = o.userData.inr;
        if (o.isMesh) {
          o.frustumCulled = !o.isSkinnedMesh; // (a skinned mesh's bounds are those of its rest pose)
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          ms.forEach((m) => { for (const k of ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) if (m[k] && GFX.ok) { m[k].anisotropy = Math.min(this.phone ? 4 : 16, GFX.renderer.capabilities.getMaxAnisotropy()); this.capTexture(m[k]); } });
        }
      });
      const m = { name, scene: gltf.scene, animations: gltf.animations || [], parts, info: inr || (gltf.asset && gltf.asset.extras) || {} };
      this.fresh["model:" + name] = m;
      this.dropOther(path, "models/" + name + ".glb", "models/" + name + "-hd.glb");
      return m;
    }).catch((e) => { console.warn("model " + name + " did not load: " + e.message); return null; }));
  },
  // One load at a time per file: a second ask while the first is on its way shares it (the title asks for the
  // hall's set in the background, and the hall may ask again before it has arrived).
  _once(key, make) {
    const busy = this.busy || (this.busy = {});
    if (busy[key]) return busy[key];
    const p = (busy[key] = make());
    p.then(() => { delete busy[key]; });
    return p;
  },
  // (Phase 5) A phone holds less on its graphics chip: Risk Blaster alone held about 435 MB of pictures, which can end an
  // older phone's tab. On a phone (a coarse pointer and a small screen, or 4 GB of memory or less; #phone in the address
  // forces it, for tests) no model's or sky's picture larger than 2048 px goes to the chip: it is drawn down to 2048
  // first. Desktop, and a page opened from disk (which loads none of these), are unchanged.
  phone: typeof window !== "undefined" && (/phone/.test(location.hash) || (typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches && Math.min(screen.width || 9999, screen.height || 9999) < 700) || (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4)),
  CAP: 2048,
  capImage(img) {
    const w = img && img.width, h = img && img.height;
    if (!this.phone || !w || Math.max(w, h) <= this.CAP || typeof document === "undefined") return img;
    const k = this.CAP / Math.max(w, h), c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    if (img.close) img.close(); // (an ImageBitmap's own pixels go at once)
    return c;
  },
  capTexture(t) {
    const done = this._capped || (this._capped = new WeakSet()); // (r128's textures have no userData)
    if (!this.phone || !t || !t.image || done.has(t)) return;
    done.add(t);
    const img = this.capImage(t.image);
    if (img !== t.image) { t.image = img; t.needsUpdate = true; }
  },
  // A model for a scene that is being built (null when it is not loaded: the caller builds what it always built).
  // Each one is handed out once; the next scene gets a new copy parsed from the same bytes.
  model(name) {
    const m = this.fresh["model:" + name];
    if (!m) return null;
    delete this.fresh["model:" + name];
    return m;
  },
  // ---- skies (equirectangular panoramas): the picture itself and its reflection in every glossy surface
  // (the Mac's richer tier) a sky's sharper copy, <name>-hd.webp (Blockade's own 8192 x 4096 panorama, the one the game's
  // 4096 was drawn down from: tools/gen/sky-hd.js), on a computer drawing at the MAC tier; never on a phone
  skyFile(name) {
    const hd = "sky/" + name + "-hd.webp";
    if (!this.phone && typeof GFX !== "undefined" && GFX.tier === 0 && this.files.files[hd] !== undefined) return hd;
    return this.files.files["sky/" + name + ".webp"] !== undefined ? "sky/" + name + ".webp" : "sky/" + name + ".jpg";
  },
  loadSky(name) {
    const path = this.skyFile(name);
    if (!this.has(path) || !window.THREE) return Promise.resolve(null);
    if (this.kept["sky:" + name] && !this.stale(name)) return Promise.resolve(this.kept["sky:" + name]);
    return this._once("sky:" + name, () => this.buffer(path).then((buf) => new Promise((res, rej) => {
      const url = URL.createObjectURL(new Blob([buf], { type: /webp$/.test(path) ? "image/webp" : "image/jpeg" })), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("cannot decode " + path)); };
      img.src = url;
    })).then((pic) => new Promise((done) => GFX.whenGL(() => done(pic)))) // (its graphics part waits while the graphics context is lost: GFX.contextLost)
      .then((pic) => {
      // (the Mac's richer tier's review) A sharper sky that arrives after its screen opened without it (a slow
      // connection: Assets.need starts a screen after 40 s with what has come): that screen draws without it, and making
      // it ready now, an 8K picture sent to the graphics chip and its reflection made, would stall the play. Its file is
      // kept, and it is made ready the next time a screen asks for it, behind that screen's loading line.
      if (path === "sky/" + name + "-hd.webp" && this.gaveUp && this.gaveUp.delete("sky:" + name)) return null;
      const was = this.kept["sky:" + name];
      if (was) { delete this.kept["sky:" + name]; (this.retiredSkies || (this.retiredSkies = [])).push(was); } // (the other size's, which the tier asked for before: see stale)
      const img = this.capImage(pic), map = new THREE.Texture(img); // (on a phone: no larger than 2048 across)
      map.encoding = THREE.sRGBEncoding;
      map.mapping = THREE.EquirectangularReflectionMapping;
      map.wrapS = THREE.RepeatWrapping;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.generateMipmaps = true;
      map.needsUpdate = true;
      const sky = { name, map, env: null, w: img.width, h: img.height, hd: path === "sky/" + name + "-hd.webp" };
      if (GFX.ok) { try { sky.env = ownTarget(GFX.keepEnv(() => this.skyEnv(sky))); } catch (e) { sky.env = null; } } // (kept: drawn again after a lost graphics context; the target owns the texture, so a retired sky's goes whole: ownTarget, restSkies)
      this.kept["sky:" + name] = sky;
      this.release(path);
      this.dropOther(path, "sky/" + name + ".webp", "sky/" + name + "-hd.webp");
      return sky;
    }).catch((e) => { console.warn("sky " + name + " did not load: " + e.message); return null; }));
  },
  sky(name) { return this.kept["sky:" + name] || null; },
  // A sky's reflection: drawn from its picture with the picture's smaller copies (loadSky: as it comes; after a lost
  // graphics context, again, the picture sent once more, and a dome may since draw it without them: makePanoSky, so
  // they are asked for while it is drawn and its own way put back after).
  // (a sharper copy: its reflection is made, and the picture leaves the graphics chip until a screen draws it, which
  // sends it again behind the curtain (GFX.warm), with its smaller copies or without them as that screen draws it:
  // 171 MB there with them (Risk Blaster's and Nest Egg Run's narrow windows), 128 MB without (makePanoSky).
  // Held, each would keep the copies its reflection was made from. See restSkies.)
  skyEnv(sky) {
    const map = sky.map, f = map.minFilter, g = map.generateMipmaps, mip = f === THREE.LinearMipmapLinearFilter;
    if (!mip) { map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true; map.needsUpdate = true; }
    const rt = GFX.pmrem().fromEquirectangular(map);
    if (!mip) { map.minFilter = f; map.generateMipmaps = g; map.needsUpdate = true; }
    if (sky.hd) map.dispose();
    return rt;
  },
  // (the Mac's richer tier's review) A sky kept at the other size than the tier now asks for: the governor or Setup moved
  // the tier since it was loaded (a Mac held a step lower draws the game's own skies, as before). The next screen that
  // asks for it loads the right one; the old one leaves the graphics chip once that screen is up (restSkies).
  stale(name) { const k = this.kept["sky:" + name]; return !!k && !!k.hd !== (this.skyFile(name) === "sky/" + name + "-hd.webp"); },
  // the bytes of a file's other copy (the sharper or the game's own), fetched ahead while the tier was the other one
  dropOther(path, a, b) { const o = path === a ? b : path === b ? a : null; if (o && this.bufs[o]) delete this.bufs[o]; },
  // (the Mac's richer tier) The pictures a screen draws its skies from, or keeps in waiting to draw (Risk Blaster's
  // regions and Nest Egg Run's stretches of road: a game's gen.skies; a game's one: gen.sky).
  skiesFor(s) {
    const used = new Set(), g = s && s.gen;
    if (s && s.scene) s.scene.traverse((o) => { (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m) => { if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) used.add(v); } }); });
    if (g && g.skies) for (const k in g.skies) if (g.skies[k] && g.skies[k].map) used.add(g.skies[k].map);
    if (g && g.sky && g.sky.map) used.add(g.sky.map);
    return used;
  },
  // A sharper sky is on the graphics chip only while a screen draws it or keeps it in waiting (each 128 to 171 MB there;
  // a round of the games kept all ten, some 1.5 GB): at a change of screen, every one the new screen neither draws nor
  // keeps lets go of the chip. Its picture stays in memory: a screen that draws it again sends it again, behind the
  // curtain (GFX.warm). A sharper sky a screen asked for and does not draw is not sent. Skies at the game's own size
  // are kept as they always were. A sky replaced by its other size (stale) leaves here, its screen closed.
  restSkies(s) {
    if (this.retiredSkies) { for (const k of this.retiredSkies) { if (k.map) k.map.dispose(); if (k.env) k.env.dispose(); } this.retiredSkies = null; }
    if (!this.hdSkies()) return;
    const used = this.skiesFor(s);
    for (const k in this.kept) { const sky = this.kept[k]; if (k.startsWith("sky:") && sky && sky.hd && sky.map && !used.has(sky.map)) sky.map.dispose(); }
  },
  hdSkies() { for (const k in this.kept) if (this.kept[k] && this.kept[k].hd) return true; return false; },
  // ---- pictures for the page itself (assets/ui: icon and portrait strips drawn from the models). ui(name) is the
  // decoded image, or null: the page then draws what it always drew.
  loadImage(name) {
    const path = "ui/" + name + ".webp";
    if (!this.has(path)) return Promise.resolve(null);
    if (this.kept["ui:" + name]) return Promise.resolve(this.kept["ui:" + name]);
    return this._once("ui:" + name, () => this.buffer(path).then((buf) => new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error("cannot decode " + path));
      img.src = URL.createObjectURL(new Blob([buf], { type: "image/webp" })); // (kept: CSS draws from this address too)
    })).then((img) => { this.kept["ui:" + name] = img; this.release(path); if (this.onImage) this.onImage(name, img); return img; })
      .catch((e) => { console.warn("picture " + name + " did not load: " + e.message); return null; }));
  },
  ui(name) { return this.kept["ui:" + name] || null; },
  // The files of a set fetched ahead (not parsed or decoded), so that when the set is asked for it is ready sooner:
  // the title asks for the hall's while it is up. Sound is fetched too, though it can only be decoded after a tap.
  // (extra: more entries to fetch with it, as need takes them: the boss a Boss Rush stage fights)
  prefetch(set, extra) {
    if (!this.on) return;
    for (const n of this.wants(set, extra)) {
      const [kind, name] = n.split(":");
      const path = kind === "model" ? "models/" + this.file(name) + ".glb" : kind === "ui" ? "ui/" + name + ".webp" : kind === "sfx" ? (this.files.sprites[name] || {}).file : kind === "music" ? (this.files.music[name] || {}).file : kind === "sky" ? this.skyFile(name) : null;
      if (path && this.has(path) && !this.gone[path]) this.buffer(path).catch(() => null);
    }
  },
  // ---- sets: what a screen needs. need(set) is null when there is nothing to wait for (assets off, or all of it
  // already in hand), otherwise a promise that settles when everything has loaded or failed. It never rejects.
  // (a set's entries, each once: of a track's two recordings, only the one its screen's visit plays: see Sound.take)
  // (a model whose name ends in -md is a phone's lighter copy of another: only a phone fetches it)
  wants(set, extra) { return (this.files.sets[set] || []).concat(extra || []).map((n) => (n.startsWith("music:") ? "music:" + Sound.take(n.slice(6)) : n)).filter((n, i, a) => a.indexOf(n) === i && (this.phone || !/^model:.+-md$/.test(n))); },
  need(set, extra) {
    if (!this.on) return null;
    const want = this.wants(set, extra);
    const jobs = [];
    for (const n of want) {
      const [kind, name] = n.split(":");
      if (kind === "model" && !this.fresh[n]) { if (this.has("models/" + name + ".glb")) jobs.push(() => this.loadModel(name)); }
      else if (kind === "sky" && (!this.kept[n] || this.stale(name))) { if (this.has("sky/" + name + ".webp") || this.has("sky/" + name + ".jpg")) jobs.push(() => { if (this.gaveUp) this.gaveUp.delete(n); return this.loadSky(name); }); }
      else if (kind === "sfx" && !Sound.sprites[name]) { if (this.files.sprites[name]) jobs.push(() => Sound.loadSprite(name)); }
      else if (kind === "music" && !Sound.tracks[name]) { if (this.files.music[name]) Sound.loadTrack(name); } // (music is not waited for: it comes in when it has arrived)
      else if (kind === "ui" && !this.kept[n]) { if (this.has("ui/" + name + ".webp")) jobs.push(() => this.loadImage(name)); }
    }
    if (!jobs.length) return null;
    let done = 0;
    const tick = () => { done++; if (this.onProgress) this.onProgress(done, jobs.length); };
    const all = Promise.all(jobs.map((j) => Promise.resolve().then(j).catch(() => null).then(tick)));
    // a slow connection must not hold a game back for ever: after 40 s it starts with whatever has arrived (and a sharper
    // sky still on its way is not made ready when it comes: see loadSky)
    return Promise.race([all.then(() => false), new Promise((r) => setTimeout(() => r(true), 40000))]).then((late) => {
      if (late) for (const n of want) if (n.startsWith("sky:") && (!this.kept[n] || this.stale(n.slice(4)))) (this.gaveUp || (this.gaveUp = new Set())).add(n);
      return true;
    });
  },
  // Run fn once the set is in hand: at once when there is nothing to wait for, else behind the loading line.
  with(set, extra, fn) {
    this.cur = this.on ? this.wants(set, extra) : null; // (what the screen about to open brought: GFX.warm readies all of it)
    const p = this.need(set, extra);
    if (!p) return GFX.ok ? GFX.whenGL(fn) : fn();
    UI.loading(true);
    this.onProgress = (d, n) => UI.loading(true, d / n);
    p.then(() => { this.onProgress = null; UI.loading(false); GFX.ok ? GFX.whenGL(fn) : fn(); }); // (a screen is not built while the graphics context is lost: GFX.contextLost)
  },
};
