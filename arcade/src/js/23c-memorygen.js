// Memory Bank's generated light and props, served (opened from disk the vault is exactly as it was):
//   every metal in the vault (the door's spun gold, the bars, the bolts, the dial, the coins) mirrors the inside of a
//   gold vault (vault-gold) instead of the few light strips it was given, and is lit by it;
//   the coins that fly up into the slot and lie in the piles are the gold token with the egg on its face (prop-coin);
//   the deck the cards are dealt from (prop-deck: a stack of study cards in a chrome holder) stands at the door's foot,
//   and gives a little lift and a glint as each card is dealt;
//   with the decor (GFX.extras), the darker first deck (decor-deck: black cards edged in magenta) is the pile the
//   missed cards go back to: the two decks stand across the plinth from each other, the bright one at its left end, the
//   dark one at its right, and the bars banked rise between them. A missed card is seen flying onto the dark pile,
//   which takes its weight and glows once.
// The door itself and its mechanism stay: they move as the deck is banked, which a single model could not.
// Look only: nothing here knows a card, a grade or a box.
const MEMORY_GEN = { DECK: { s: 3.3, x: 0, z: 5.6, ry: 0.3 }, COIN: 1.1,
  DEAL: { s: 2.6, x: -7.7, z: 7.4, ry: 0.4 }, PILE: { s: 2.6, x: 7.7, z: 7.4, ry: -0.4 } }; // (the pair, either end of the plinth)
// A model's first mesh as plain geometry, its packed (quantised) attributes opened out and its node's transform
// applied, so it can be drawn as many times as the scene needs (instanced, or one mesh per flying coin).
function bakeModelGeometry(model) {
  let mesh = null;
  model.scene.updateMatrixWorld(true);
  model.scene.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
  if (!mesh) return null;
  const src = mesh.geometry, out = new THREE.BufferGeometry();
  const open = (a) => {
    const arr = a.isInterleavedBufferAttribute ? a.data.array : a.array;
    const k = !a.normalized ? 1 : arr instanceof Int16Array ? 1 / 32767 : arr instanceof Uint16Array ? 1 / 65535 : arr instanceof Int8Array ? 1 / 127 : arr instanceof Uint8Array ? 1 / 255 : 1;
    const n = a.itemSize, f = new Float32Array(a.count * n);
    for (let i = 0; i < a.count; i++) { f[i * n] = a.getX(i) * k; if (n > 1) f[i * n + 1] = a.getY(i) * k; if (n > 2) f[i * n + 2] = a.getZ(i) * k; }
    return new THREE.BufferAttribute(f, n);
  };
  for (const name of ["position", "normal", "uv"]) if (src.attributes[name]) out.setAttribute(name, open(src.attributes[name]));
  if (src.index) out.setIndex(new THREE.BufferAttribute(src.index.array.slice(0), 1));
  out.applyMatrix4(mesh.matrixWorld);
  if (out.attributes.normal) out.normalizeNormals();
  return { geo: out, mat: mesh.material };
}
function memoryGen(game) {
  if (!Assets.on || !game.has3D) return null;
  const sky = Assets.sky("vault-gold"), deck = Assets.model("prop-deck"), coin = Assets.model("prop-coin"), pile = Assets.model("decor-deck");
  const G = { env: sky && sky.env ? sky.env : null, deck: null, coin: null, dealK: 0, D: MEMORY_GEN.DECK, pile: null, pileK: 0 };
  if (pile && GFX.extras === false) disposeTree(pile.scene); // (the decor left out: the vault as it was)
  else if (pile) {
    const P = MEMORY_GEN.PILE;
    // (Phase 2, 2026-11-24: at the right end of the plinth, out of the deck lamp's reach, its black cards read as a dark
    // blob, (28, 5, 12): their backs now mirror the vault and their magenta edges glow at rest, the more on a landing)
    G.pileMats = tuneModel(pile, { env: 5, glow: 4.8 }).map((m) => ({ m, e: m.emissiveIntensity }));
    pile.scene.traverse((o) => { if (o.isMesh && G.env) o.material.envMap = G.env; });
    pile.scene.scale.setScalar(P.s);
    pile.scene.position.set(P.x, 0, P.z);
    pile.scene.rotation.y = P.ry;
    game.scene.add(pile.scene);
    G.pile = pile;
    G.D = MEMORY_GEN.DEAL; // (and the bright deck stands across from it)
  }
  if (!G.env && !deck && !coin && !G.pile) return null;
  if (coin) {
    tuneModel(coin, { env: 1.6, glow: 1 });
    const b = bakeModelGeometry(coin);
    if (b) { b.geo.translate(0, -0.5, 0); b.geo.scale(MEMORY_GEN.COIN, MEMORY_GEN.COIN, MEMORY_GEN.COIN); if (G.env) b.mat.envMap = G.env; G.coin = b; }
  }
  if (deck) {
    const D = G.D;
    tuneModel(deck, { env: 2, glow: 2 });
    deck.scene.traverse((o) => { if (o.isMesh && G.env) o.material.envMap = G.env; });
    deck.scene.scale.setScalar(D.s);
    deck.scene.position.set(D.x, 0, D.z);
    deck.scene.rotation.y = D.ry;
    game.scene.add(deck.scene);
    // (Phase 6: its chrome holder mirrored the dark floor and read as a black blob under the cards. One warm lamp in
    // front of it, short-reaching: the holder shows its panels and bright edges. One lamp only: each costs every lit
    // pixel of the room on a phone)
    const key = new THREE.PointLight(0xffdca0, 5, D.s * 4.5, 2);
    key.position.set(D.x - D.s * 0.2, D.s * 0.42, D.z + D.s * 2.1); // (on the lens's side, a little above the holder: its glossy faces catch it whole)
    game.scene.add(key);
    G.deck = deck;
    G.deckY = 0;
  }
  return G;
}
// The card's journey, seen: a banked card goes up into the vault's slot, a missed one back down onto the deck, and the
// next one is dealt off the deck into its place. These are pictures laid over the page and moved by the scene's own
// clock; the game has already moved on (the next card is in place under them), so they change nothing it decides.
function memoryGenFly(game, kind) {
  const G = game.gen;
  if (!G || !game.has3D || !game.el || REDUCED_MOTION || GFX.calm) return;
  if (kind === "deal") { (G.fly || (G.fly = [])).push({ pending: true }); return; } // (measured on the next frame, once the new card stands in its place)
  memoryGenMake(game, kind);
}
function memoryGenMake(game, kind) {
  const G = game.gen, card = $("[data-card]", game.el);
  if (!card) return;
  const r = card.getBoundingClientRect(), to = memoryGenScreen(game, kind === "deal" ? "deck" : kind === "again" ? (G.pile && G.pile.scene.visible ? "pile" : "deck") : "slot");
  if (!to || r.width < 10) return;
  const el = UI.el(`<div class="mem-fly ${kind}" aria-hidden="true">${kind === "deal" ? "<i></i>" : kind === "again" ? "<b>BACK IN THE DECK</b>" : "<b>BANKED</b>"}</div>`);
  el.style.width = r.width + "px"; el.style.height = r.height + "px";
  game.el.appendChild(el);
  const card0 = { x: r.left + r.width / 2, y: r.top + r.height / 2 }, small = 34 / r.width; // (a card in the vault's window is about a thumb across)
  (G.fly || (G.fly = [])).push(kind === "deal"
    ? { el, t: 0, dur: 0.5, from: to, to: card0, s0: small, s1: 1, w: r.width, h: r.height, fadeIn: true }
    : { el, t: 0, dur: kind === "again" ? 0.5 : 0.6, from: card0, to, s0: 0.92, s1: small * (kind === "again" ? 1 : 0.5), w: r.width, h: r.height, pile: kind === "again" });
}
// where the slot or the top of the deck is on the screen
function memoryGenScreen(game, what) {
  const v = (game._flyV || (game._flyV = new THREE.Vector3()));
  if (what === "slot" && game.slotWorld) v.copy(game.slotWorld);
  else if (what === "deck" && game.gen.deck) v.copy(game.gen.deck.scene.position).add(game._flyD || (game._flyD = new THREE.Vector3(0, game.gen.D.s * 0.85, 0)));
  else if (what === "pile" && game.gen.pile) v.copy(game.gen.pile.scene.position).add(game._flyP || (game._flyP = new THREE.Vector3(0, MEMORY_GEN.PILE.s * 0.85, 0)));
  else return null;
  game.camera.updateMatrixWorld();
  v.project(game.camera);
  return { x: (v.x * 0.5 + 0.5) * GFX.w, y: (0.5 - v.y * 0.5) * GFX.h };
}
// each frame: a card dealt lifts the deck a hand's breadth and lets it fall back; the cards in flight move on
function memoryGenUpdate(game, dt) {
  const G = game.gen;
  if (!G) return;
  if (G.deck) {
    G.dealK = Math.max(0, G.dealK - dt * 2.2);
    const k = G.dealK, lift = REDUCED_MOTION || GFX.calm ? 0.05 : 0.22;
    G.deck.scene.position.y = Math.sin(k * Math.PI) * lift;
    G.deck.scene.rotation.y = G.D.ry + Math.sin(k * Math.PI) * 0.06;
  }
  if (G.pile) { // a missed card landing: the pile gives under it a little, and its magenta edges glow once (show clock)
    G.pileK = Math.max(0, G.pileK - VFX.dt * 2.4);
    const k = Math.sin(G.pileK * Math.PI), P = MEMORY_GEN.PILE;
    G.pile.scene.visible = GFX.extras !== false;
    G.pile.scene.scale.set(P.s, P.s * (1 - k * (REDUCED_MOTION || GFX.calm ? 0.01 : 0.05)), P.s);
    for (const d of G.pileMats) d.m.emissiveIntensity = d.e * (1 + 1.3 * k);
  }
  if (G.fly && G.fly.length) {
    if (G.fly.some((f) => f.pending)) { G.fly = G.fly.filter((f) => !f.pending); memoryGenMake(game, "deal"); }
    G.fly = G.fly.filter((f) => {
      f.t += dt;
      const k = clamp(f.t / f.dur, 0, 1), e = k * k * (3 - 2 * k);
      const x = lerp(f.from.x, f.to.x, e), y = lerp(f.from.y, f.to.y, e) - Math.sin(k * Math.PI) * 40 * (f.fadeIn ? 0.5 : 1), s = lerp(f.s0, f.s1, f.fadeIn ? Math.sqrt(e) : e * e);
      f.el.style.transform = `translate(${(x - f.w / 2).toFixed(1)}px, ${(y - f.h / 2).toFixed(1)}px) scale(${s.toFixed(3)}) rotate(${((f.fadeIn ? 1 - e : e) * (f.fadeIn ? -8 : 10)).toFixed(1)}deg)`;
      f.el.style.opacity = (f.fadeIn ? (k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25) : k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2).toFixed(3);
      if (k >= 1) { f.el.remove(); if (f.pile && G.pile) G.pileK = 1; return false; }
      return true;
    });
  }
}
