// Results: score, accuracy, mastery gained, a review of every miss with its
// book page, and classic three-letter initials for the high-score table.
function showResults(o) {
  Store.state.stats.games++;
  Store.save();
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
  const el = UI.el(`<section class="screen" style="background:rgba(9,3,32,.86)">
    <div class="scroll"><div class="wrap">
      <div class="res-head" style="--c:${o.color || COLORS.yellow}">
        <h1>${esc(o.title)}</h1>
        ${o.stars !== undefined ? `<div>${starsHTML(o.stars)}</div>` : ""}
        <div class="big">${esc(o.headline)}</div>
        ${o.sub ? `<p>${esc(o.sub)}</p>` : ""}
      </div>
      <div class="tiles">${tiles.map((t) => `<div class="tile" style="--c:${t.c || COLORS.cyan}"><span class="k">${esc(t.k)}</span><span class="v">${esc(t.v)}</span></div>`).join("")}</div>
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
      <div class="actions">
        <button class="btn" data-act="again" style="--c:${COLORS.lime}">${icon("play")} PLAY AGAIN</button>
        <button class="btn ghost" data-act="stage">${o.game === "exam" ? "EXAM SETUP" : "CHANGE STAGE"}</button>
        ${o.game !== "memory" && o.sel.chapters.length === 1 ? `<button class="btn ghost" data-act="guide" style="--c:${COLORS.orange}">${icon("book")} READ STAGE ${o.sel.chapters[0]} NOTES</button>` : ""}
        <button class="btn ghost" data-act="hub">ARCADE</button>
      </div>
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
    mounted: () => $("[data-act=again]", el).focus({ preventScroll: true }),
  });
}
