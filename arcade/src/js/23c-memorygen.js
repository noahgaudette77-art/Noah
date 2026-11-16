// Memory Bank's generated light and props, served (opened from disk the vault is exactly as it was):
//   every metal in the vault (the door's spun gold, the bars, the bolts, the dial, the coins) mirrors the inside of a
//   gold vault (vault-gold) instead of the few light strips it was given, and is lit by it;
//   the coins that fly up into the slot and lie in the piles are the gold token with the egg on its face (prop-coin);
//   the deck the cards are dealt from (prop-deck: a stack of study cards in a chrome holder) stands at the door's foot,
//   and gives a little lift and a glint as each card is dealt.
// The door itself and its mechanism stay: they move as the deck is banked, which a single model could not.
// Look only: nothing here knows a card, a grade or a box.
const MEMORY_GEN = { DECK: { s: 4.6, x: 0, z: 5.2, ry: 0.35 }, COIN: 1.1 };
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
  const sky = Assets.sky("vault-gold"), deck = Assets.model("prop-deck"), coin = Assets.model("prop-coin");
  const G = { env: sky && sky.env ? sky.env : null, deck: null, coin: null, dealK: 0 };
  if (!G.env && !deck && !coin) return null;
  if (coin) {
    tuneModel(coin, { env: 1.6, glow: 1 });
    const b = bakeModelGeometry(coin);
    if (b) { b.geo.translate(0, -0.5, 0); b.geo.scale(MEMORY_GEN.COIN, MEMORY_GEN.COIN, MEMORY_GEN.COIN); if (G.env) b.mat.envMap = G.env; G.coin = b; }
  }
  if (deck) {
    const D = MEMORY_GEN.DECK;
    tuneModel(deck, { env: 2, glow: 2 });
    deck.scene.traverse((o) => { if (o.isMesh && G.env) o.material.envMap = G.env; });
    deck.scene.scale.setScalar(D.s);
    deck.scene.position.set(D.x, 0, D.z);
    deck.scene.rotation.y = D.ry;
    game.scene.add(deck.scene);
    G.deck = deck;
    G.deckY = 0;
  }
  return G;
}
// each frame: a card dealt lifts the deck a hand's breadth and lets it fall back
function memoryGenUpdate(game, dt) {
  const G = game.gen;
  if (!G || !G.deck) return;
  G.dealK = Math.max(0, G.dealK - dt * 2.2);
  const k = G.dealK, lift = REDUCED_MOTION || GFX.calm ? 0.05 : 0.22;
  G.deck.scene.position.y = Math.sin(k * Math.PI) * lift;
  G.deck.scene.rotation.y = MEMORY_GEN.DECK.ry + Math.sin(k * Math.PI) * 0.06;
}
