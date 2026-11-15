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
  // The one row that is lit: the stage to play next (the first boss not yet three-starred; otherwise the stage the
  // next mission names, or the one mastered least).
  const playable = CHAPTERS.filter((c) => (isMemory ? c.fids : c.qids).length);
  const mis = nextMission();
  const focal = isBoss ? playable.find((c) => (Store.state.boss[c.n] || 0) < 3)
    : playable.find((c) => c.n === mis.ch) || playable.slice().sort((a, b) => chapterMastery(a) - chapterMastery(b))[0];
  const tile = (c) => {
    const ids = isMemory ? c.fids : c.qids;
    const mm = chapterMastery(c), m = (mm * 100).toFixed(1);
    const meta = isBoss
      ? `${starsHTML(Store.state.boss[c.n] || 0)}<span>${esc(BOSSES[c.n].name)}</span>`
      : isMemory
        ? `<span>${ids.length} CARDS</span><span>${dueCount(ids)} DUE</span>`
        : `<span>${ids.length} Q</span><span>${mpct(mm)}% MASTERED</span>`;
    // the row's picture: the boss that holds this chapter, or the client whose file it is
    const pic = isBoss || !!client(c.n);
    return `<button class="stage${focal && focal.n === c.n ? " focal" : ""}" data-act="pick" data-sel="${c.n}" style="--c:${c.color}" ${ids.length ? "" : "disabled"}>
      <span class="n${pic ? " pic" : ""}">${pic ? `<canvas data-pt="${c.n}" aria-hidden="true"></canvas><b>${c.n}</b>` : c.n}</span><span class="t">${esc(c.title)}</span>
      <span class="meter" style="--c:${c.color}"><i style="width:${m}%"></i></span>
      <span class="meta">${meta}</span></button>`;
  };
  const el = UI.el(`<section class="screen scr-select${isBoss ? " is-boss" : ""}" style="background:rgba(9,3,32,.55)">
    ${topbar("SELECT STAGE", { right: `<span class="chip" style="color:${cab.color}">${esc(cab.name)}</span>` })}
    <div class="scroll"><div class="wrap">
      <div class="quick">
        <button class="stage wide" data-act="pick" data-sel="all" style="--c:${COLORS.yellow}">
          ${isBoss ? `<canvas class="wpic" data-pt="all" aria-hidden="true"></canvas>` : `<span class="wico">${icon("grid")}</span>`}
          <span class="t">${isBoss ? "FINAL BOSS" : "ALL STAGES"}</span>
          <span class="meta">${isBoss ? esc(BOSSES.all.name) + " · every chapter" : "Every chapter, mixed"}</span></button>
        ${isBoss ? `<button class="stage wide" data-act="pick" data-sel="rush" style="--c:${COLORS.red}">
          <span class="wico">${icon("play")}</span>
          <span class="t">NEXT BOSS</span><span class="meta"><span>The first boss you haven't <span style="white-space:nowrap">3-starred</span></span></span></button>`
        : `<button class="stage wide" data-act="pick" data-sel="weak" style="--c:${COLORS.red}" ${weakN ? "" : "disabled"}>
          <span class="wico">${icon(weakN ? "flag" : "lock")}</span>
          <span class="t">WEAK SPOTS</span><span class="meta">${weakN ? weakN + " items you keep missing" : "None yet — play a stage first"}</span></button>`}
      </div>
      ${SECTIONS.map((s) => `<h2 class="world wbar" style="--c:${s.color}"><i>${icon(["shield", "coin", "book", "heart"][s.n - 1] || "star")}</i><span>WORLD ${s.n} · ${esc(s.title.toUpperCase())}</span></h2>
        <div class="stages">${s.chapters.map((n) => tile(CH(n))).join("")}</div>`).join("")}
    </div></div>
  </section>`);
  $$("canvas[data-pt]", el).forEach((cv) => {
    const k = cv.dataset.pt, cl = client(k);
    if (isBoss) drawBossPortrait(cv, BOSSES[k].color, k === "all" ? "all" : +k);
    else if (cl) drawPortrait(cv, Object.assign({ age: cl.age }, cl.look));
  });
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
  const el = UI.el(`<section class="screen scr-examsetup" style="background:rgba(9,3,32,.7)">
    ${topbar("FINAL EXAM")}
    <div class="scroll"><div class="wrap">
      <div class="panel exam-brief" style="--c:${COLORS.violet}">
        <canvas class="eb-pic" aria-hidden="true"></canvas>
        <p class="hub-desc">A mock exam drawn from all 11 chapters in proportion to their size. No hints or explanations until you submit, like the real thing. You need <b style="color:${COLORS.yellow};font-weight:400">60%</b> to pass.</p>
      </div>
      <div><div class="label">NUMBER OF QUESTIONS</div>
        <div class="seg" style="--c:${COLORS.cyan};margin-top:8px" role="group" aria-label="Number of questions">
          ${[20, 50, 100].map((n) => `<button data-act="len" data-v="${n}" aria-pressed="${ExamPrefs.len === n}">${n}</button>`).join("")}
        </div></div>
      <div><div class="label">CLOCK</div>
        <div class="seg" style="--c:${COLORS.cyan};margin-top:8px" role="group" aria-label="Clock">
          <button data-act="timed" data-v="1" aria-pressed="${ExamPrefs.timed}">90 SEC / Q</button>
          <button data-act="timed" data-v="0" aria-pressed="${!ExamPrefs.timed}">UNTIMED</button>
        </div></div>
      <div class="tiles">
        <div class="tile" style="--c:${COLORS.yellow}"><span class="k">${tileIcon("BEST SCORE")}BEST SCORE</span><span class="v">${best}%</span></div>
        <div class="tile"><span class="k">${tileIcon("EXAMS TAKEN")}EXAMS TAKEN</span><span class="v">${Store.state.stats.exams || 0}</span></div>
        <div class="tile" style="--c:${COLORS.lime}"><span class="k">${tileIcon("QUESTION BANK")}QUESTION BANK</span><span class="v">${ALL_QIDS.length}</span></div>
      </div>
      <div class="passline" aria-hidden="true" style="--v:${Math.min(100, best)}">
        <span class="pl-k">YOUR BEST</span><span class="pl-bar"><i></i><b></b></span><span class="pl-v">PASS 60%</span></div>
      <div class="mixstrip" aria-hidden="true"><span class="pl-k">THE MIX</span>
        <span class="mx-bar">${CHAPTERS.map((c) => `<i style="flex:${c.qids.length};--c:${c.color}"><b>${c.n}</b></i>`).join("")}</span></div>
      ${recent.length ? `<div><div class="label" style="margin-bottom:8px">TOP RESULTS</div><div class="board">${recent.map((r, i) => `<div><span>${i + 1}.</span><span>${esc(r.n)}</span><span>${r.s}% · ${r.c || ""}</span></div>`).join("")}</div></div>` : ""}
      <div class="exam-wm" aria-hidden="true"><canvas></canvas></div>
    </div></div>
    <div class="actions pinned"><div class="wrap one">
      <button class="btn" data-act="go" style="--c:${COLORS.lime}">START EXAM ${icon("play")}</button>
    </div></div>
  </section>`);
  drawBossPortrait($(".eb-pic", el), BOSSES.all.color, "all");
  drawBossPortrait($(".exam-wm canvas", el), BOSSES.all.color, "all"); // the proctor again, large and dim, in whatever room is left above START
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
