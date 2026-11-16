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
  loadModel(name) {
    const path = "models/" + name + ".glb";
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
          ms.forEach((m) => { for (const k of ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) if (m[k] && GFX.ok) m[k].anisotropy = Math.min(8, GFX.renderer.capabilities.getMaxAnisotropy()); });
        }
      });
      const m = { name, scene: gltf.scene, animations: gltf.animations || [], parts, info: inr || (gltf.asset && gltf.asset.extras) || {} };
      this.fresh["model:" + name] = m;
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
  // A model for a scene that is being built (null when it is not loaded: the caller builds what it always built).
  // Each one is handed out once; the next scene gets a new copy parsed from the same bytes.
  model(name) {
    const m = this.fresh["model:" + name];
    if (!m) return null;
    delete this.fresh["model:" + name];
    return m;
  },
  // ---- skies (equirectangular panoramas): the picture itself and its reflection in every glossy surface
  loadSky(name) {
    const path = this.files.files["sky/" + name + ".webp"] !== undefined ? "sky/" + name + ".webp" : "sky/" + name + ".jpg";
    if (!this.has(path) || !window.THREE) return Promise.resolve(null);
    if (this.kept["sky:" + name]) return Promise.resolve(this.kept["sky:" + name]);
    return this._once("sky:" + name, () => this.buffer(path).then((buf) => new Promise((res, rej) => {
      const url = URL.createObjectURL(new Blob([buf], { type: /webp$/.test(path) ? "image/webp" : "image/jpeg" })), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("cannot decode " + path)); };
      img.src = url;
    })).then((img) => {
      const map = new THREE.Texture(img);
      map.encoding = THREE.sRGBEncoding;
      map.mapping = THREE.EquirectangularReflectionMapping;
      map.wrapS = THREE.RepeatWrapping;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.generateMipmaps = true;
      map.needsUpdate = true;
      const sky = { name, map, env: null, w: img.width, h: img.height };
      if (GFX.ok) { try { sky.env = GFX.pmrem().fromEquirectangular(map).texture; } catch (e) { sky.env = null; } }
      this.kept["sky:" + name] = sky;
      return sky;
    }).catch((e) => { console.warn("sky " + name + " did not load: " + e.message); return null; }));
  },
  sky(name) { return this.kept["sky:" + name] || null; },
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
    })).then((img) => { this.kept["ui:" + name] = img; if (this.onImage) this.onImage(name, img); return img; })
      .catch((e) => { console.warn("picture " + name + " did not load: " + e.message); return null; }));
  },
  ui(name) { return this.kept["ui:" + name] || null; },
  // The files of a set fetched ahead (not parsed or decoded), so that when the set is asked for it is ready sooner:
  // the title asks for the hall's while it is up. Sound is fetched too, though it can only be decoded after a tap.
  prefetch(set) {
    if (!this.on) return;
    for (const n of this.files.sets[set] || []) {
      const [kind, name] = n.split(":");
      const path = kind === "model" ? "models/" + name + ".glb" : kind === "ui" ? "ui/" + name + ".webp" : kind === "sfx" ? (this.files.sprites[name] || {}).file : kind === "music" ? (this.files.music[name] || {}).file : kind === "sky" ? (this.has("sky/" + name + ".webp") ? "sky/" + name + ".webp" : "sky/" + name + ".jpg") : null;
      if (path && this.has(path)) this.buffer(path).catch(() => null);
    }
  },
  // ---- sets: what a screen needs. need(set) is null when there is nothing to wait for (assets off, or all of it
  // already in hand), otherwise a promise that settles when everything has loaded or failed. It never rejects.
  need(set, extra) {
    if (!this.on) return null;
    const want = (this.files.sets[set] || []).concat(extra || []).filter((n, i, a) => a.indexOf(n) === i);
    const jobs = [];
    for (const n of want) {
      const [kind, name] = n.split(":");
      if (kind === "model" && !this.fresh[n]) { if (this.has("models/" + name + ".glb")) jobs.push(() => this.loadModel(name)); }
      else if (kind === "sky" && !this.kept[n]) { if (this.has("sky/" + name + ".webp") || this.has("sky/" + name + ".jpg")) jobs.push(() => this.loadSky(name)); }
      else if (kind === "sfx" && !Sound.sprites[name]) { if (this.files.sprites[name]) jobs.push(() => Sound.loadSprite(name)); }
      else if (kind === "music" && !Sound.tracks[name]) { if (this.files.music[name]) Sound.loadTrack(name); } // (music is not waited for: it comes in when it has arrived)
      else if (kind === "ui" && !this.kept[n]) { if (this.has("ui/" + name + ".webp")) jobs.push(() => this.loadImage(name)); }
    }
    if (!jobs.length) return null;
    let done = 0;
    const tick = () => { done++; if (this.onProgress) this.onProgress(done, jobs.length); };
    const all = Promise.all(jobs.map((j) => Promise.resolve().then(j).catch(() => null).then(tick)));
    // a slow connection must not hold a game back for ever: after 40 s it starts with whatever has arrived
    return Promise.race([all, new Promise((r) => setTimeout(r, 40000))]).then(() => true);
  },
  // Run fn once the set is in hand: at once when there is nothing to wait for, else behind the loading line.
  with(set, extra, fn) {
    const p = this.need(set, extra);
    if (!p) return fn();
    UI.loading(true);
    this.onProgress = (d, n) => UI.loading(true, d / n);
    p.then(() => { this.onProgress = null; UI.loading(false); fn(); });
  },
};
