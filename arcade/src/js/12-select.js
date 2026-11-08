// Stage select: pick a chapter (stage), every chapter mixed, or your weak spots.
function chapterMastery(c) { return Store.masteryOf(c.qids.concat(c.fids)); }

function dueCount(ids) {
  const now = nowMin();
  return ids.filter((id) => {
    const it = Store.item(id);
    return !it || it[0] <= 1 || now - it[3] >= GAP_MIN[it[0]];
  }).length;
}

function showSelect(gameId) {
  const cab = CAB(gameId);
  Sound.play("hub");
  const isMemory = gameId === "memory", isBoss = gameId === "boss";
  const weakN = isMemory ? weakIds(ALL_FIDS).length : weakIds(ALL_QIDS).length;
  const tile = (c) => {
    const ids = isMemory ? c.fids : c.qids;
    const mm = chapterMastery(c), m = (mm * 100).toFixed(1);
    const meta = isBoss
      ? `${starsHTML(Store.state.boss[c.n] || 0)}<span>${esc(BOSSES[c.n].name)}</span>`
      : isMemory
        ? `<span>${ids.length} CARDS</span><span>${dueCount(ids)} DUE</span>`
        : `<span>${ids.length} Q</span><span>${mpct(mm)}% MASTERED</span>`;
    return `<button class="stage" data-act="pick" data-sel="${c.n}" style="--c:${c.color}" ${ids.length ? "" : "disabled"}>
      <span class="n">${c.n}</span><span class="t">${esc(c.title)}</span>
      <span class="meter" style="--c:${c.color}"><i style="width:${m}%"></i></span>
      <span class="meta">${meta}</span></button>`;
  };
  const el = UI.el(`<section class="screen scr-select" style="background:rgba(9,3,32,.55)">
    ${topbar("SELECT STAGE", { right: `<span class="chip" style="color:${cab.color}">${esc(cab.name)}</span>` })}
    <div class="scroll"><div class="wrap">
      <div class="quick">
        <button class="stage wide" data-act="pick" data-sel="all" style="--c:${COLORS.yellow}">
          <span class="t">${isBoss ? "FINAL BOSS" : "ALL STAGES"}</span>
          <span class="meta">${isBoss ? esc(BOSSES.all.name) + " · every chapter" : "Every chapter, mixed"}</span></button>
        ${isBoss ? `<button class="stage wide" data-act="pick" data-sel="rush" style="--c:${COLORS.red}">
          <span class="t">NEXT BOSS</span><span class="meta">The first boss you haven't 3-starred</span></button>`
        : `<button class="stage wide" data-act="pick" data-sel="weak" style="--c:${COLORS.red}" ${weakN ? "" : "disabled"}>
          <span class="t">WEAK SPOTS</span><span class="meta">${weakN ? weakN + " items you keep missing" : "None yet — play a stage first"}</span></button>`}
      </div>
      ${SECTIONS.map((s) => `<h2 class="world" style="--c:${s.color}">WORLD ${s.n} · ${esc(s.title.toUpperCase())}</h2>
        <div class="stages">${s.chapters.map((n) => tile(CH(n))).join("")}</div>`).join("")}
    </div></div>
  </section>`);
  const start = (key) => {
    let k = key;
    if (k === "rush") {
      const next = CHAPTERS.find((c) => (Store.state.boss[c.n] || 0) < 3 && c.qids.length);
      k = next ? String(next.n) : "all";
    }
    Sound.sfx("select");
    UI.flash("crt-on");
    startGame(gameId, makeSelection(k));
  };
  UI.show({
    el,
    on: (a, t) => {
      if (a === "back") { Sound.sfx("back"); showHub(); }
      if (a === "pick") start(t.dataset.sel);
    },
    key: (e) => { if (e.key === "Escape") { Sound.sfx("back"); showHub(); } },
  });
}

const ExamPrefs = { len: 50, timed: true };
function showExamSetup() {
  Sound.play("calm");
  const best = Store.state.stats.bestExam || 0;
  const recent = (Store.state.scores.exam || []).slice(0, 5);
  const el = UI.el(`<section class="screen" style="background:rgba(9,3,32,.7)">
    ${topbar("FINAL EXAM")}
    <div class="scroll"><div class="wrap" style="display:grid;gap:14px">
      <div class="panel" style="--c:${COLORS.violet};border-color:${COLORS.violet}">
        <p class="hub-desc">A mock exam drawn from all 11 chapters in proportion to their size. No hints or explanations until you submit, like the real thing. You need <b style="color:${COLORS.yellow};font-weight:400">60%</b> to pass.</p>
      </div>
      <div><div class="label">NUMBER OF QUESTIONS</div>
        <div class="seg" style="--c:${COLORS.violet};margin-top:8px" role="group" aria-label="Number of questions">
          ${[20, 50, 100].map((n) => `<button data-act="len" data-v="${n}" aria-pressed="${ExamPrefs.len === n}">${n}</button>`).join("")}
        </div></div>
      <div><div class="label">CLOCK</div>
        <div class="seg" style="--c:${COLORS.violet};margin-top:8px" role="group" aria-label="Clock">
          <button data-act="timed" data-v="1" aria-pressed="${ExamPrefs.timed}">90 SEC / Q</button>
          <button data-act="timed" data-v="0" aria-pressed="${!ExamPrefs.timed}">UNTIMED</button>
        </div></div>
      <div class="tiles">
        <div class="tile" style="--c:${COLORS.yellow}"><span class="k">BEST SCORE</span><span class="v">${best}%</span></div>
        <div class="tile"><span class="k">EXAMS TAKEN</span><span class="v">${Store.state.stats.exams || 0}</span></div>
        <div class="tile" style="--c:${COLORS.lime}"><span class="k">QUESTION BANK</span><span class="v">${ALL_QIDS.length}</span></div>
      </div>
      ${recent.length ? `<div><div class="label" style="margin-bottom:8px">TOP RESULTS</div><div class="board">${recent.map((r, i) => `<div><span>${i + 1}.</span><span>${esc(r.n)}</span><span>${r.s}% · ${r.c || ""}</span></div>`).join("")}</div></div>` : ""}
      <button class="btn" data-act="go" style="--c:${COLORS.violet}">START EXAM ${icon("play")}</button>
    </div></div>
  </section>`);
  UI.show({
    el,
    on: (a, t) => {
      if (a === "back") { Sound.sfx("back"); showHub(); }
      if (a === "len" || a === "timed") {
        Sound.sfx("blip");
        if (a === "len") ExamPrefs.len = +t.dataset.v;
        else ExamPrefs.timed = t.dataset.v === "1";
        $$(`[data-act=${a}]`, el).forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
      }
      if (a === "go") { Sound.sfx("select"); UI.flash("crt-on"); startGame("exam", makeSelection("all")); }
    },
    key: (e) => { if (e.key === "Escape") showHub(); },
  });
}
