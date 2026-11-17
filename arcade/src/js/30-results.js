// Results: score, accuracy, mastery gained, a review of every miss with its
// book page, and classic three-letter initials for the high-score table.
function showResults(o) {
  Store.state.stats.games++;
  Store.save();
  const had = Object.assign({}, Store.state.ach || {});
  Trophies.check(o);
  o.won = TROPHIES.filter((t) => (Store.state.ach || {})[t.id] && !had[t.id]).map((t) => t.id); // (the trophies this game earned: they arrive in the reward moment)
  const go = (rank) => renderResults(o, rank);
  if (o.score > 0 && o.game !== "memory" && Store.qualifies(o.game, o.score)) askInitials(o, go);
  else go(-1);
}

function askInitials(o, done) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const chars = (Store.settings.initials || "AAA").toUpperCase().padEnd(3, "A").slice(0, 3).split("");
  let slot = 0;
  Sound.sfx("levelup");
  const el = UI.el(`<div class="modal"><div class="dialog" style="--c:${COLORS.yellow}" role="dialog" aria-modal="true" aria-label="New high score">
    <h2>NEW HIGH SCORE!</h2><p>Enter your initials</p><div class="initials" data-slots></div>
    <button class="btn" data-act="ok" style="--c:${COLORS.yellow}">SAVE ${icon("check")}</button></div></div>`);
  const draw = () => {
    $("[data-slots]", el).innerHTML = chars.map((c, i) => `<div class="slot ${i === slot ? "on" : ""}">
      <button class="iconbtn" data-act="up" data-i="${i}" aria-label="Next letter">${icon("up")}</button>
      <div class="ch" data-act="slot" data-i="${i}">${esc(c)}</div>
      <button class="iconbtn" data-act="down" data-i="${i}" aria-label="Previous letter">${icon("down")}</button></div>`).join("");
  };
  const bump = (i, d) => { chars[i] = A[(A.indexOf(chars[i]) + d + A.length) % A.length]; slot = i; Sound.sfx("move"); draw(); };
  const save = () => {
    UI.closeModal();
    Store.settings.initials = chars.join("");
    const rank = Store.addScore(o.game, { n: chars.join(""), s: o.score, c: o.boardLabel || o.sel.label });
    done(rank);
  };
  draw();
  UI.openModal({
    el,
    on: (a, t) => {
      const i = +t.dataset.i;
      if (a === "up") bump(i, 1);
      if (a === "down") bump(i, -1);
      if (a === "slot") { slot = i; draw(); }
      if (a === "ok") save();
    },
    key: (e) => {
      if (e.key === "ArrowUp") { e.preventDefault(); bump(slot, 1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); bump(slot, -1); }
      else if (e.key === "ArrowLeft") { slot = Math.max(0, slot - 1); draw(); }
      else if (e.key === "ArrowRight") { slot = Math.min(2, slot + 1); draw(); }
      else if (e.key === "Enter") { e.preventDefault(); save(); }
      else if (e.key === "Backspace") { slot = Math.max(0, slot - 1); draw(); }
      else if (/^[a-z0-9]$/i.test(e.key)) { chars[slot] = e.key.toUpperCase(); slot = Math.min(2, slot + 1); Sound.sfx("move"); draw(); }
    },
    mounted: () => $("[data-act=ok]", el).focus(),
  });
}

function renderResults(o, rank) {
  const run = o.run;
  const acc = pct(run.correct, run.answered);
  const tiles = (o.hideRunTiles ? [] : [
    { k: "ACCURACY", v: acc + "%", c: acc >= 80 ? COLORS.lime : acc >= 60 ? COLORS.yellow : COLORS.red },
    { k: "ANSWERED", v: run.answered },
    { k: "BEST STREAK", v: run.bestStreak },
  ]).concat(o.tiles || []);
  if (rank >= 0) tiles.push({ k: "HIGH SCORE RANK", v: "#" + (rank + 1), c: COLORS.yellow });
  const xp1 = xpTotal();
  const xp0 = run.xp0 === undefined ? xp1 : run.xp0;
  const r0 = rankOf(xp0), r1 = rankOf(xp1);
  if (xp1 > xp0) tiles.push({ k: "XP EARNED", v: "+" + (xp1 - xp0), c: COLORS.yellow });
  const cl = o.debrief ? client(o.debrief) : null;
  const changes = o.sel.chapters
    .map((n) => ({ c: CH(n), before: (run.start && run.start[n]) || 0, now: chapterMastery(CH(n)) }))
    .filter((x) => x.c.qids.length && (o.sel.chapters.length <= 2 || mpct(x.now) !== mpct(x.before)));
  const review = o.review || run.missed.map((m) => {
    const q = Q_BY_ID.get(m.id);
    return { q: q.q, a: q.options[q.answer], x: m.picked, e: q.explain, r: `P. ${q.page} · STAGE ${q.ch} · ${q.topic}` };
  });
  const again = () => {
    UI.flash("crt-on");
    if (o.game === "exam") startGame("exam", o.sel);
    else startGame(o.game, o.sel);
  };
  // the picture over the headline: the boss that was fought, or the game's own emblem, on a medal with turning rays
  const heroBoss = o.game === "boss" ? (o.sel.chapters.length === 1 ? o.sel.chapters[0] : "all") : null;
  const heroIcon = { blaster: "t_wave5", racer: "t_million", memory: "t_cards50", exam: "t_exam60" }[o.game];
  const heroGen = genIconReady() ? genIcon({ blaster: "star", racer: "coin", memory: "coin", exam: "trophy" }[o.game] || "star", false, "hero") : ""; // (served: the game's emblem drawn from a model, like every other icon)
  const hero = heroBoss !== null ? `<canvas aria-hidden="true"></canvas>` : heroGen || icon(PIXELS[heroIcon] ? heroIcon : "star");
  // The reward moment (served, with the icons drawn from the models): after the stars, what this game earned arrives
  // one by one, each with its sound: a coin for every 40 XP (up to five), a medal for a run without a miss, a cup for a
  // new best score, and each trophy unlocked as it stands in the hall. Pictures only: the screen's words are as before.
  const rw = [];
  if (genIconReady()) {
    const coins = xp1 > xp0 ? clamp(Math.round((xp1 - xp0) / 40), 1, 5) : 0;
    for (let k = 0; k < coins; k++) rw.push({ kind: "coin", cls: "coin", sfx: "coin", gap: 0.09 });
    if (run.answered && !run.missed.length && o.game !== "memory") rw.push({ kind: "medal", sfx: "powerup", gap: 0.3 });
    if (rank === 0) rw.push({ kind: "trophy", cls: "big", sfx: "fanfare", gap: 0.35 });
    (o.won || []).forEach((id) => rw.push({ kind: trophyKind(id), cls: "big", sfx: "reward", gap: 0.35 }));
    let at = o.stars !== undefined ? 0.55 : 0.25;
    rw.forEach((r) => { r.at = at; at += r.gap; });
  }
  const el = UI.el(`<section class="screen scr-results" style="background:rgba(9,3,32,.86)">
    <div class="scroll"><div class="wrap">
      <div class="res-head" style="--c:${o.color || COLORS.yellow}">
        <div class="res-hero" aria-hidden="true">${hero}</div>
        <h1>${esc(o.title)}</h1>
        ${o.stars !== undefined ? `<div class="res-stars">${starsHTML(o.stars)}</div>` : ""}
        ${rw.length ? `<div class="res-rewards" aria-hidden="true">${rw.map((r) => `<span class="rw ${r.cls || ""}">${genIcon(r.kind)}</span>`).join("")}</div>` : ""}
        <div class="big">${esc(o.headline)}</div>
        ${o.sub ? `<p>${esc(o.sub)}</p>` : ""}
      </div>
      ${cl && cl.debrief ? `<div class="debrief"><canvas aria-hidden="true"></canvas><div><div class="who">${esc(cl.name.toUpperCase())} · YOUR CLIENT</div><p class="selectable">${esc(cl.debrief)}</p></div></div>` : ""}
      <div class="tiles">${tiles.map((t) => `<div class="tile"${t.c ? ` style="--c:${t.c}"` : ""}><span class="k">${tileIcon(t.k)}${esc(t.k)}</span><span class="v${String(t.v).length > 7 ? " long" : ""}">${esc(t.v)}</span></div>`).join("")}</div>
      <div class="res-rank"${xp1 > xp0 ? ` data-xp="+${xp1 - xp0} XP"` : ` data-xp="${xp1} XP"`}>${rankChip()}</div>
      ${o.extraHTML || ""}
      ${changes.length ? `<h2 class="section-h">MASTERY</h2><div class="mastery-list">${changes.map((x) => {
        return `<div class="mrow"><span>STAGE ${x.c.n} · ${esc(x.c.title)}</span><b>${mpct(x.before)}% &gt; ${mpct(x.now)}%</b>
          <span class="meter" style="--c:${x.c.color}"><i style="width:${(x.now * 100).toFixed(1)}%"></i></span></div>`;
      }).join("")}</div>` : ""}
      ${review.length ? `<h2 class="section-h">${esc(o.reviewTitle || "REVIEW YOUR MISSES")} (${review.length})</h2>
        <ol class="review selectable">${review.map((r) => `<li>
          <div class="rq">${esc(r.q)}</div>
          ${r.x ? `<div class="rx">YOU: ${esc(r.x)}</div>` : r.x === null ? `<div class="rx">YOU: no answer</div>` : ""}
          <div class="ra">${o.game === "memory" ? "" : "ANSWER: "}${esc(r.a)}</div>
          ${r.e ? `<div class="re">${esc(r.e)}</div>` : ""}
          <div class="rr">${esc(r.r)}</div></li>`).join("")}</ol>`
        : run.answered ? `<h2 class="section-h" style="color:${COLORS.lime}">NO MISSES. FLAWLESS.</h2>` : ""}
      ${o.game !== "memory" && o.sel.chapters.length === 1 ? `<div class="actions">
        <button class="btn ghost" data-act="guide" style="--c:${COLORS.orange}">${icon("book")} READ STAGE ${o.sel.chapters[0]} NOTES</button>
      </div>` : ""}
    </div></div>
    <div class="actions pinned"><div class="wrap">
      <button class="btn" data-act="again" style="--c:${COLORS.lime}">${icon("play")} PLAY AGAIN</button>
      <button class="btn ghost" data-act="stage">${o.game === "exam" ? "EXAM SETUP" : "CHANGE STAGE"}</button>
      <button class="btn ghost" data-act="hub">ARCADE</button>
    </div></div></section>`);
  UI.show({
    el,
    on: (a) => {
      Sound.sfx("select");
      if (a === "again") again();
      if (a === "stage") o.game === "exam" ? showExamSetup() : showSelect(o.game);
      if (a === "guide") showGuide(o.sel.chapters[0]);
      if (a === "hub") showHub();
    },
    key: (e) => {
      if (e.key === "Enter") { e.preventDefault(); again(); }
      if (e.key === "Escape") showHub();
    },
    mounted: () => {
      $("[data-act=again]", el).focus({ preventScroll: true });
      const face = $(".debrief canvas", el);
      if (face && cl) drawPortrait(face, Object.assign({ age: cl.age }, cl.look));
      const bust = $(".res-hero canvas", el);
      if (bust) drawBossPortrait(bust, BOSSES[heroBoss].color, heroBoss);
      if (genIconReady()) { // the reward moment's sounds, each on the beat its picture lands (see rw above), and the announcer
        for (let k = 0; k < (o.stars || 0); k++) setTimeout(() => { if (el.isConnected) Sound.sfx("reward", (k - 1) * 0.4); }, 120 + k * 140);
        const items = $$(".res-rewards .rw", el); // (each lands on its own beat: a timer, so it keeps the page's clock)
        rw.forEach((r, k) => setTimeout(() => { if (!el.isConnected) return; if (items[k]) items[k].classList.add("in"); Sound.sfx(r.sfx, ((k % 5) - 2) * 0.15, { vol: r.kind === "coin" ? 0.6 : 1 }); }, r.at * 1000));
        const line = o.game === "exam" ? (o.score >= 60 ? "EXAM PASSED" : "NOT YET") : o.game === "memory" ? "DECK CLEARED" : rank === 0 && o.game !== "blaster" ? "NEW HIGH SCORE" : "";
        if (line) setTimeout(() => { if (el.isConnected) Sound.say(line); }, 600);
      }
      if (r1.i > r0.i) {
        // (with a reward moment it waits until the last reward has landed, and stands on its own plate inside the screen's edges)
        const settle = rw.length ? (rw[rw.length - 1].at + 0.75) * 1000 : 500;
        setTimeout(() => {
          Sound.sfx("rankup");
          if (rw.length) { const sc = UI.root.appendChild(UI.el('<div class="rank-scrim"></div>')); setTimeout(() => sc.remove(), 2200); } // (Phase 6: the tiles go dark under its plate while it is up)
          UI.banner("RANK UP!", COLORS.yellow, "You are now " + r1.name, rw.length ? "plated" : "");
          GFX.pulse(6, 0.25);
        }, settle);
      }
    },
  });
}
