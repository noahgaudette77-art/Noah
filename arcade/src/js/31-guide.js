// STRATEGY GUIDE — condensed notes per chapter, plus search across every
// flashcard and note in the book.
function showGuide(chapterN) {
  Sound.play("calm");
  Sound.ambience(false);
  if (chapterN) return showGuideChapter(chapterN);
  // The archive (31b-library.js) shows through a window above the list; everything
  // that is read sits on a solid ground.
  const el = UI.el(`<section class="screen guide-lib">
    ${topbar("STRATEGY GUIDE")}
    <div class="scroll"><div class="wrap" style="display:grid;gap:12px">
      <input class="search" id="guide-search" type="search" placeholder="Search terms, rules, numbers…" aria-label="Search the notes and flashcards" autocomplete="off">
      <div class="lib-window" aria-hidden="true"><span>THE ARCHIVE</span></div>
      <div data-body></div>
    </div></div></section>`);
  const body = $("[data-body]", el);
  const index = () => SECTIONS.map((s) => `<h2 class="world" style="--c:${s.color}">WORLD ${s.n} · ${esc(s.title.toUpperCase())}</h2>
    <div class="stages">${s.chapters.map((n) => {
      const c = CH(n), mm = chapterMastery(c), m = (mm * 100).toFixed(1);
      return `<button class="stage" data-act="ch" data-n="${n}" style="--c:${c.color}">
        <span class="n">${n}</span><span class="t">${esc(c.title)}</span>
        <span class="meter" style="--c:${c.color}"><i style="width:${m}%"></i></span>
        <span class="meta"><span>${c.guide.length} NOTES · ${c.flashcards.length} CARDS</span><span>${mpct(mm)}%</span></span></button>`;
    }).join("")}</div>`).join("");
  const search = (q) => {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) { body.innerHTML = index(); return; }
    const hits = [];
    const has = (txt) => { const t = txt.toLowerCase(); return words.every((w) => t.includes(w)); };
    CHAPTERS.forEach((c) => {
      c.flashcards.forEach((f) => { if (has(f.front + " " + f.back + " " + f.topic)) hits.push({ t: f.front, b: f.back, r: `CARD · STAGE ${c.n} · P. ${f.page}`, n: c.n }); });
      c.guide.forEach((g) => g.points.forEach((p) => { if (has(g.heading + " " + p)) hits.push({ t: g.heading, b: p, r: `NOTES · STAGE ${c.n}${g.page ? " · P. " + g.page : ""}`, n: c.n }); }));
    });
    const mark = (s) => {
      let out = esc(s);
      words.forEach((w) => { out = out.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>"); });
      return out;
    };
    body.innerHTML = hits.length
      ? `<p class="label">${hits.length} RESULT${hits.length === 1 ? "" : "S"}${hits.length > 80 ? " · SHOWING 80" : ""}</p>
         <div class="ch-list selectable">${hits.slice(0, 80).map((h) => `<div class="hit"><div class="ht">${mark(h.t)}</div><div class="hb">${mark(h.b)}</div>
         <div class="hr">${esc(h.r)}</div></div>`).join("")}</div>`
      : `<p class="hub-desc">No notes or cards mention “${esc(q)}”.</p>`;
  };
  body.innerHTML = index();
  let st = 0;
  const input = $("#guide-search", el);
  input.addEventListener("input", () => { clearTimeout(st); st = setTimeout(() => search(input.value.trim()), 140); });
  const lib = libraryScene();
  lib.reading = false;
  UI.show({
    el,
    mounted: () => lib.setBand($(".lib-window", el)),
    on: (a, t) => {
      if (a === "back") { Sound.sfx("back"); showHub(); }
      if (a === "ch") { Sound.sfx("page"); showGuideChapter(+t.dataset.n); }
    },
    key: (e) => { if (e.key === "Escape") { if (input.value) { input.value = ""; search(""); } else showHub(); } },
  });
}

// The archive scene, shared by the guide's index and its chapters.
function libraryScene() {
  return Scenes.cur instanceof LibraryScene ? Scenes.cur : Scenes.set(new LibraryScene());
}

function showGuideChapter(n) {
  const c = CH(n);
  const lib = libraryScene();
  lib.reading = true; // a chapter is open: the archive behind it all but stops
  lib.setBand(null);
  if (!Store.state.read[n]) { Store.state.read[n] = 1; Store.save(); }
  const mm = chapterMastery(c), m = (mm * 100).toFixed(1);
  const errata = (DATA.errata || []).filter((x) => x.ch === n);
  const el = UI.el(`<section class="screen" style="background:rgba(9,3,32,.9)">
    ${topbar("STAGE " + n + " NOTES", { back: "GUIDE" })}
    <div class="scroll"><div class="wrap">
      <div class="ch-hero" style="--c:${c.color}">
        <div class="kick">WORLD ${c.section.n} · ${esc(c.section.title.toUpperCase())}</div>
        <h2>${esc(c.title)}</h2>
        <span class="meter" style="--c:${c.color}"><i style="width:${m}%"></i></span>
        <div class="label">${mpct(mm)}% MASTERED · ${Store.countMastered(c.qids)}/${c.qids.length} QUESTIONS · ${Store.countMastered(c.fids)}/${c.fids.length} CARDS</div>
        <div class="row">
          <button class="btn small" data-act="play" data-g="blaster" style="--c:${COLORS.cyan}">${icon("play")} BLASTER</button>
          <button class="btn small" data-act="play" data-g="memory" style="--c:${COLORS.lime}">FLASHCARDS</button>
          <button class="btn small" data-act="play" data-g="boss" style="--c:${COLORS.magenta}">BOSS: ${esc(BOSSES[n].name)}</button>
        </div>
      </div>
      ${client(n) ? `<div class="client-card" style="--c:${c.color}"><canvas aria-hidden="true"></canvas><div>
        <div class="who">CLIENT FILE · ${esc(client(n).name.toUpperCase())}${client(n).age ? ", " + client(n).age : ""}</div>
        <p class="selectable">${esc(client(n).lines[0] || "")}</p>
        <div class="row"><button class="btn small" data-act="brief" style="--c:${c.color}">${icon("play")} PLAY BRIEFING</button></div></div></div>` : ""}
      ${c.objectives.length ? `<div class="gsec" style="--c:${c.color}"><h3>LEARNING OBJECTIVES</h3><ol class="objectives selectable">${c.objectives.map((o) => `<li>${esc(o)}</li>`).join("")}</ol></div>` : ""}
      ${c.guide.map((g) => `<div class="gsec" style="--c:${c.color}"><h3>${esc(g.heading)}${g.page ? `<span>P. ${esc(g.page)}</span>` : ""}</h3>
        <ul class="selectable">${g.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>`).join("") || `<p class="hub-desc">Notes for this chapter are not loaded yet.</p>`}
      ${errata.length ? `<div class="tipbox selectable" style="border-color:${COLORS.red}"><div class="label" style="color:${COLORS.red}">WATCH OUT: THE BOOK DISAGREES WITH ITSELF HERE</div>${errata.map((x) => `<div>· ${esc(x.text)} <span class="label nowrap">P. ${esc(x.page)}</span></div>`).join("")}</div>` : ""}
      ${c.tips.length ? `<div class="tipbox selectable"><div class="label" style="color:${COLORS.yellow}">TIPS</div>${c.tips.map((t) => `<div>· ${esc(t)}</div>`).join("")}</div>` : ""}
      <div class="actions">
        ${n > 1 ? `<button class="btn ghost" data-act="ch" data-n="${n - 1}">${icon("left")} STAGE ${n - 1}</button>` : ""}
        ${n < 11 ? `<button class="btn ghost" data-act="ch" data-n="${n + 1}">STAGE ${n + 1} ${icon("right")}</button>` : ""}
      </div>
    </div></div></section>`);
  UI.show({
    el,
    on: (a, t) => {
      if (a === "back") { Sound.sfx("back"); showGuide(); }
      if (a === "ch") { Sound.sfx("page"); showGuideChapter(+t.dataset.n); }
      if (a === "play") { Sound.sfx("select"); UI.flash("crt-on"); startGame(t.dataset.g, makeSelection(String(n))); }
      if (a === "brief") briefing(n);
    },
    mounted: () => {
      const face = $(".client-card canvas", el);
      if (face && client(n)) drawPortrait(face, Object.assign({ age: client(n).age }, client(n).look));
    },
    key: (e) => {
      if (e.key === "Escape") showGuide();
      if (e.key === "ArrowLeft" && n > 1) showGuideChapter(n - 1);
      if (e.key === "ArrowRight" && n < 11) showGuideChapter(n + 1);
    },
  });
}
