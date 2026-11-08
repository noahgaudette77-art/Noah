// MEMORY BANK — spaced-repetition flashcards. Flip, grade yourself, and every
// card you know is deposited into the vault. Missed cards come back this session.
const DECK_SIZE = 20;

class MemoryGame extends QuizGame {
  constructor(sel) {
    super(sel, "memory", { fov: 60, fog: [0x04140e, 12, 70], bg: 0x04140e });
    const ids = selectionFids(sel);
    const now = nowMin();
    this.queue = ids
      .map((id) => ({ id, p: Store.priority(id, now, null) }))
      .sort((a, b) => b.p - a.p)
      .slice(0, DECK_SIZE)
      .map((r) => r.id);
    this.total = this.queue.length;
    this.done = 0;
    this.deposits = 0;
    this.again = {};
    this.missed = [];
    this.reverse = false;
    this.flipped = false;
    this.coins = [];
    if (this.has3D) this.build3D();
    this.mountUI(`<section class="screen scr-game">
      <div class="hud">
        <div class="score"><small>${esc(sel.label)}</small><span data-pos>CARD 1/${this.total}</span></div>
        <div class="grow"></div>
        <span class="tag" style="--c:${COLORS.gold}" data-dep>BANKED 0</span>
        <button class="iconbtn" data-act="reverse" aria-pressed="false" title="Swap sides: show the definition first">SWAP</button>
        <button class="iconbtn" data-act="pause" aria-label="Pause">${icon("pause")}</button>
      </div>
      <span class="meter" style="--c:${COLORS.lime}"><i data-prog></i></span>
      <div class="card-stage"><div class="card3d" data-card data-act="flip" role="button" tabindex="0" aria-label="Flip card"></div></div>
      <div class="grade" data-grade></div>
    </section>`);
  }
  build3D() {
    const s = this.scene;
    addLights(s, { ambient: 0x7fb59a, ai: 0.8, ki: 0.9, dir: [2, 6, 8] });
    const floor = makeGrid({ size: 160, step: 4, color: 0x2bd97a, y: -4 });
    s.add(floor);
    this.floor = floor;
    const vault = new THREE.Group();
    const ring = neonSolid(new THREE.TorusGeometry(8, 0.6, 6, 28), COLORS.gold, { fill: 0x2a2208, glow: 0.2 });
    vault.add(ring);
    for (let i = 0; i < 8; i++) {
      const spoke = neonSolid(new THREE.BoxGeometry(0.3, 15, 0.3), COLORS.lime, { fill: 0x0b2a1a, glow: 0.2 });
      spoke.rotation.z = (i / 8) * Math.PI;
      vault.add(spoke);
    }
    const hub = neonSolid(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 8).rotateX(Math.PI / 2), COLORS.gold, { fill: 0x3a2a08, glow: 0.3 });
    vault.add(hub);
    vault.position.set(0, 1, -16);
    s.add(vault);
    this.vault = vault;
    s.add(makeStars(300, 120, { lowest: 0.1, color: 0xbfffd8 }));
    this.coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.12, 14).rotateX(Math.PI / 2);
    this.coinMat = new THREE.MeshPhongMaterial({ color: COLORS.gold, emissive: 0x553300, shininess: 80, flatShading: true });
    this.camBase.set(0, 0.5, 6);
    this.lookAt.set(0, 0.6, -10);
  }
  start() {
    Sound.play("calm");
    if (!this.total) {
      UI.toast("NO CARDS HERE YET");
      return this.quit();
    }
    this.state = "front";
    this.render();
    requestAnimationFrame(() => { if (!this.unmounted) this.setBand($(".card-stage", this.el)); });
  }
  get card() { return F_BY_ID.get(this.queue[0]); }
  render() {
    const f = this.card;
    if (!f) return this.finish();
    this.flipped = false;
    const card = $("[data-card]", this.el);
    // Snap back to the front without animating, or the next card's answer flashes by.
    card.style.transition = "none";
    card.classList.remove("flipped");
    void card.offsetWidth;
    card.style.transition = "";
    const front = this.reverse ? f.back : f.front;
    const back = this.reverse ? f.front : f.back;
    const box = Store.box(f.id);
    const status = ["NEW", "MISSED LAST TIME", "LEARNING", "REVIEW", "BANKED", "BANKED"][box];
    card.innerHTML = `<div class="face front" style="--c:${CH(f.ch).color}">
        <div class="ftop"><span>STAGE ${f.ch} · ${esc(f.topic)}</span><span>${status}</span></div>
        <div class="fmain selectable">${esc(front)}</div>
        <div class="fhint">TAP CARD OR PRESS SPACE TO FLIP</div>
      </div>
      <div class="face back">
        <div class="ftop"><span>${esc(this.reverse ? "TERM" : "ANSWER")}</span><span>BOOK P. ${esc(f.page)}</span></div>
        <div class="fmain selectable">${esc(back)}</div>
        <div class="fhint">HOW DID YOU DO?</div>
      </div>`;
    $("[data-grade]", this.el).innerHTML = `<button class="btn" data-act="flip" style="--c:${COLORS.cyan};grid-column:1/-1">FLIP CARD</button>`;
    $("[data-pos]", this.el).textContent = `CARD ${Math.min(this.done + 1, this.total)}/${this.total}`;
    $("[data-prog]", this.el).style.width = pct(this.done, this.total) + "%";
    $("[data-dep]", this.el).textContent = "BANKED " + this.deposits;
    this.state = "front";
  }
  flip() {
    if (this.state !== "front" || this.paused) return;
    this.flipped = true;
    Sound.sfx("flip");
    $("[data-card]", this.el).classList.add("flipped");
    $("[data-grade]", this.el).innerHTML = `
      <button class="btn" data-act="again" style="--c:${COLORS.red}">MISSED</button>
      <button class="btn" data-act="good" style="--c:${COLORS.cyan}">GOT IT</button>
      <button class="btn" data-act="easy" style="--c:${COLORS.lime}">EASY</button>`;
    this.state = "back";
  }
  grade(kind) {
    if (this.state !== "back" || this.paused) return;
    const id = this.queue.shift();
    if (kind === "again") {
      Store.record(id, false);
      Sound.sfx("wrong");
      if (!this.missed.includes(id)) this.missed.push(id);
      this.again[id] = (this.again[id] || 0) + 1;
      if (this.again[id] <= 2) this.queue.splice(Math.min(this.queue.length, 3), 0, id);
      else this.done++;
    } else {
      if (kind === "easy") Store.markEasy(id);
      else Store.record(id, true);
      this.deposits++;
      this.done++;
      Sound.sfx("deposit");
      this.spawnCoin();
    }
    Store.save();
    this.state = "next";
    const card = $("[data-card]", this.el);
    if (card.animate && !REDUCED_MOTION) {
      card.animate([{ transform: "rotateY(180deg) translateX(0)", opacity: 1 }, { transform: `rotateY(180deg) translateX(${kind === "again" ? "" : "-"}120%)`, opacity: 0 }], { duration: 260, easing: "ease-in" });
    }
    setTimeout(() => { if (!this.unmounted) this.render(); }, REDUCED_MOTION ? 0 : 240);
  }
  spawnCoin() {
    if (!this.has3D) return;
    const c = new THREE.Mesh(this.coinGeo, this.coinMat);
    c.position.set(rand(-1, 1), -2.5, 1);
    this.scene.add(c);
    const from = c.position.clone();
    const to = new THREE.Vector3(0, 1, -15.5);
    this.tw.add(1.1, (k) => {
      c.position.lerpVectors(from, to, k);
      c.position.y += Math.sin(k * Math.PI) * 3;
      c.rotation.y += 0.3;
    }, () => {
      this.scene.remove(c);
      this.bursts.burst(to, COLORS.gold, { n: 30, speed: 4, size: 0.25, life: 0.7 });
    }, Ease.inOutQuad);
  }
  on(a, t) {
    if (a === "pause") this.pause();
    else if (a === "flip") this.flip();
    else if (a === "again" || a === "good" || a === "easy") this.grade(a);
    else if (a === "reverse") {
      this.reverse = !this.reverse;
      t.setAttribute("aria-pressed", String(this.reverse));
      t.style.color = this.reverse ? COLORS.lime : "";
      UI.toast(this.reverse ? "DEFINITION FIRST" : "TERM FIRST");
      if (this.state === "front") this.render();
    }
  }
  key(e) {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") { e.preventDefault(); return this.pause(); }
    if (this.state === "front" && (e.key === " " || e.key === "Enter" || e.key === "f" || e.key === "F")) { e.preventDefault(); return this.flip(); }
    if (this.state === "back") {
      if (e.key === "1" || e.key === "ArrowLeft") return this.grade("again");
      if (e.key === "2" || e.key === " " || e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); return this.grade("good"); }
      if (e.key === "3" || e.key === "ArrowRight") return this.grade("easy");
    }
  }
  pause() {
    if (this.paused || this.state === "over" || this.unmounted) return;
    this.paused = true;
    Sound.sfx("blip");
    pauseMenu(this);
  }
  finish() {
    if (this.state === "over") return;
    this.state = "over";
    Sound.sfx("win");
    const ids = selectionFids(this.sel);
    const banked = Store.countMastered(ids);
    showResults({
      game: "memory", sel: this.sel, score: 0,
      run: { answered: this.done, correct: this.deposits, bestStreak: 0, missed: [], start: this.run.start, xp0: this.run.xp0 },
      title: "DECK CLEARED", color: COLORS.lime, headline: this.deposits + " CARDS BANKED",
      sub: `${banked} of ${ids.length} cards in ${this.sel.label} are fully banked`,
      tiles: [{ k: "REMEMBERED", v: pct(this.total - this.missed.length, this.total) + "%", c: COLORS.lime }, { k: "STILL DUE", v: dueCount(ids) }],
      hideRunTiles: true,
      reviewTitle: "CARDS YOU MISSED",
      review: this.missed.map((id) => { const f = F_BY_ID.get(id); return { q: f.front, a: f.back, r: `P. ${f.page} · STAGE ${f.ch} · ${f.topic}` }; }),
    });
  }
  update(dt) {
    super.update(dt);
    if (this.paused || !this.has3D) return;
    this.vault.rotation.z += dt * 0.25;
    this.vault.position.y = 1 + Math.sin(this.t * 0.8) * 0.2;
    scrollGrid(this.floor, this.t * 3);
    this.placeCamera();
  }
}
