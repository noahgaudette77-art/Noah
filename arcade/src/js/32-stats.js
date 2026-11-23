// STATS (mastery per chapter, leaderboards) and SETUP (sound, CRT, pace…).
function boardHTML(game, fmt) {
  const list = (Store.state.scores[game] || []).slice(0, 5);
  if (!list.length) return `<div class="board"><div class="empty">NO SCORES YET</div></div>`;
  return `<div class="board">${list.map((r, i) => `<div><span>${i + 1}.</span><span>${esc(r.n)}</span><span>${fmt(r.s)}${r.c ? " · " + esc(r.c) : ""}</span></div>`).join("")}</div>`;
}

function showStats() {
  const st = Store.state.stats;
  const allIds = ALL_QIDS.concat(ALL_FIDS);
  const stars = Object.values(Store.state.boss).reduce((s, v) => s + v, 0);
  const xp = xpTotal(), rk = rankOf(xp);
  const el = UI.el(`<section class="screen" style="background:rgba(9,3,32,.95)">
    ${topbar("STATS & HIGH SCORES")}
    <div class="scroll"><div class="wrap">
      <div class="pcard" style="--c:${COLORS.yellow}">
        <div class="res-hero small" aria-hidden="true"><b>${rk.level}</b></div>
        <div class="pc-body">
          <div class="pc-k">YOUR RANK</div>
          <div class="pc-name">${esc(rk.name)}</div>
          <span class="meter" style="--c:${COLORS.yellow}"><i style="width:${(rk.frac * 100).toFixed(1)}%"></i></span>
          <div class="pc-xp">${xp} XP${rk.next ? ` · ${rk.next - xp} TO ${esc(RANKS[rk.i + 1][1])}` : " · TOP RANK"}</div>
        </div>
      </div>
      <div class="tiles">
        <div class="tile" style="--c:${COLORS.lime}"><span class="k">${tileIcon("MASTERY")}MASTERY</span><span class="v">${mpct(Store.masteryOf(allIds))}%</span></div>
        <div class="tile"><span class="k">${tileIcon("QUESTIONS MASTERED")}QUESTIONS MASTERED</span><span class="v">${Store.countMastered(ALL_QIDS)}/${ALL_QIDS.length}</span></div>
        <div class="tile"><span class="k">${tileIcon("CARDS BANKED")}CARDS BANKED</span><span class="v">${Store.countMastered(ALL_FIDS)}/${ALL_FIDS.length}</span></div>
        <div class="tile"${st.answered ? ` style="--c:${pct(st.correct, st.answered) >= 80 ? COLORS.lime : pct(st.correct, st.answered) >= 60 ? COLORS.yellow : COLORS.red}"` : ""}><span class="k">${tileIcon("ACCURACY")}ACCURACY</span><span class="v">${pct(st.correct, st.answered)}%</span></div>
        <div class="tile"><span class="k">${tileIcon("ANSWERED")}ANSWERED</span><span class="v">${st.answered}</span></div>
        <div class="tile"><span class="k">${tileIcon("BEST STREAK")}BEST STREAK</span><span class="v">${st.bestStreak}</span></div>
        <div class="tile" style="--c:${COLORS.yellow}"><span class="k">${tileIcon("BOSS STARS")}BOSS STARS</span><span class="v">${stars}/36</span></div>
        <div class="tile"${(st.bestExam || 0) >= 60 ? ` style="--c:${COLORS.lime}"` : ""}><span class="k">${tileIcon("BEST EXAM")}BEST EXAM</span><span class="v">${st.bestExam || 0}%</span></div>
      </div>
      <p class="label note">SEEN ${Store.countSeen(allIds)} OF ${allIds.length} ITEMS. AN ITEM IS MASTERED AFTER THREE SPACED RIGHT ANSWERS.</p>
      <h2 class="section-h">TROPHIES ${Trophies.count()}/${TROPHIES.length}</h2>
      ${Trophies.html()}
      <h2 class="section-h">MASTERY BY STAGE</h2>
      <div class="mastery-list">${CHAPTERS.map((c) => {
        const m = chapterMastery(c);
        return `<div class="mrow"><span>${c.n}. ${esc(c.title)} ${starsHTML(Store.state.boss[c.n] || 0)}</span><b>${mpct(m)}%</b>
          <span class="meter" style="--c:${c.color}"><i style="width:${(m * 100).toFixed(1)}%"></i></span></div>`;
      }).join("")}</div>
      <h2 class="section-h">HIGH SCORES</h2>
      <div class="boards">
        <div style="--c:${COLORS.cyan}"><h3>RISK BLASTER</h3>${boardHTML("blaster", fmtScore)}</div>
        <div style="--c:${COLORS.yellow}"><h3>NEST EGG RUN</h3>${boardHTML("racer", money)}</div>
        <div style="--c:${COLORS.magenta}"><h3>BOSS RUSH</h3>${boardHTML("boss", fmtScore)}</div>
        <div style="--c:${COLORS.violet}"><h3>FINAL EXAM</h3>${boardHTML("exam", (s) => s + "%")}</div>
      </div>
      <div class="actions"><button class="btn ghost" data-act="reset" style="--c:${COLORS.red}">RESET ALL PROGRESS</button></div>
    </div></div></section>`);
  UI.show({
    el,
    on: (a) => {
      if (a === "back") { Sound.sfx("back"); showHub(); }
      if (a === "reset") {
        UI.confirm({
          title: "RESET EVERYTHING?",
          text: "This wipes your mastery, boss stars and high scores. Settings stay. There is no undo.",
          yes: "RESET", no: "KEEP MY PROGRESS", color: COLORS.red,
          onYes: () => { Store.reset(); UI.toast("PROGRESS RESET"); showStats(); },
        });
      }
    },
    key: (e) => { if (e.key === "Escape") showHub(); },
  });
}

function showSettings() {
  const s = Store.settings;
  const seg = (key, opts) => `<div class="seg" role="group" style="--c:${COLORS.cyan}">${opts.map(([v, label]) => `<button data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${String(s[key]) === String(v)}">${label}</button>`).join("")}</div>`;
  // a sound layer's level: OFF (the layer's own switch) or LOW, MID, HIGH (see Sound.LEVELS)
  const vol = (key) => { const on = s[key] !== false, lv = s[key + "Vol"] || (key === "voice" ? "high" : "low"); return `<div class="seg" role="group" style="--c:${COLORS.cyan}">${[["off", "OFF"], ["low", "LOW"], ["mid", "MID"], ["high", "HIGH"]].map(([v, label]) => `<button data-act="vol" data-k="${key}" data-v="${v}" aria-pressed="${(on ? lv : "off") === v}">${label}</button>`).join("")}</div>`; };
  const row = (ic, label, sub, control) => `<div class="setting"><span class="si" aria-hidden="true">${icon(ic)}</span><div class="sl">${label}<small>${sub}</small></div>${control}</div>`;
  const synced = !!Store.remote;
  const el = UI.el(`<section class="screen" style="background:rgba(9,3,32,.95)">
    ${topbar("SETUP")}
    <div class="scroll"><div class="wrap">
      ${row("speaker", "Sound effects", "Blips, lasers, engines and explosions (LOW to begin with)", vol("sfx"))}
      ${row("note", "Music", "The soundtrack (LOW to begin with: quiet under study)", vol("music"))}
      ${row("mic", "Announcer", "A voice calls out streaks, waves and trophies", vol("voice"))}
      ${row("note", "Sound test", "Every sound in the game with a play button and a label, to say which one to change", `<div class="seg" role="group" style="--c:${COLORS.cyan}"><button data-act="soundtest">OPEN</button></div>`)}
      ${row("tube", "CRT glass", "Scanlines, bezel and glare (its bend: SCREEN CURVE, under Effects)", seg("crt", [[true, "ON"], [false, "OFF"]]))}
      ${row("moon", "Reduced effects", "Less shake, flash and motion, and fewer background events", seg("calm", [[true, "ON"], [false, "OFF"]]))}
      <div class="setting fxset"><div class="sl"><span class="si" aria-hidden="true">${icon("spark")}</span>Effects<small>Switch any of them off</small></div>
        <div class="seg wrap" role="group" style="--c:${COLORS.cyan}">${[["bloom", "BLOOM"], ["dof", "DEPTH OF FIELD"], ["ao", "AMBIENT SHADE"], ["scan", "SCANLINES"], ["ca", "COLOUR FRINGE"], ["vignette", "VIGNETTE"], ["blur", "MOTION BLUR"], ["grain", "FILM GRAIN"], ["beams", "LIGHT BEAMS"], ["wet", "REFLECTIONS"], ["shadows", "SHADOWS"], ["shimmer", "HEAT HAZE"], ["lens", "LENS STREAKS"], ["curve", "SCREEN CURVE"]]
          .map(([k, label]) => `<button data-act="fx" data-k="${k}" aria-pressed="${s.fx && s.fx[k] !== false}">${label}</button>`).join("")}</div></div>
      ${row("phone", "Tilt to look", "Tilt your phone to look around the 3D scenes", seg("tilt", [[true, "ON"], [false, "OFF"]]))}
      ${row("gauge", "Graphics", "AUTO picks MAC on a computer and PHONE on a phone, and puts a steady 60 first: when frames run late it draws a little smaller, then drops effects, then lights; it eases down gently if a long session heats the chip, sharpens again slowly, and goes to SAFE in Low Power Mode (30 fps). SAFE: for a weak or hot device", seg("quality", [["auto", "AUTO"], ["high", "MAC"], ["medium", "PHONE"], ["low", "SAFE"]]))}
      ${row("gauge", "FPS counter", "Frame rate and frame times (a graph of the last two seconds), hitches, the size the picture is drawn at, the graphics tier, the lights, and what AUTO is doing", seg("fps", [[true, "ON"], [false, "OFF"]]))}
      ${row("clock", "Question timer", "Time you get to read and answer", seg("pace", [["relaxed", "RELAXED"], ["normal", "NORMAL"], ["turbo", "TURBO"]]))}
      ${row("check", "After a right answer", "Wrong answers always wait for you", seg("explain", [["smart", "AUTO-NEXT"], ["always", "WAIT"]]))}
      <p class="label" style="margin-top:14px">${synced ? "PROGRESS SYNCS TO YOUR CLAUDE ACCOUNT" : "PROGRESS IS SAVED ON THIS DEVICE"}</p>
      <p class="label">VERSION: ${!Assets.on ? "OFFLINE FALLBACK (OPENED AS A FILE: BUILT-IN PICTURES AND SOUND ONLY)" : GFX.ok ? "SERVED (EVERY 3D MODEL, SKY AND SOUND)" : "SERVED · SIMPLE TITLE (NO 3D ON THIS DEVICE)"}</p>
      <h2 class="section-h">HOW IT WORKS</h2>
      <div class="howto">
        <p><b>Stages</b> are the book's 11 chapters, grouped into its 4 sections (worlds).</p>
        <p><b>Mastery.</b> Every question and flashcard has a level. A right answer moves it up; a wrong one sends it back to the start. Moving up needs time between answers (5 minutes, then 6 hours), so an item counts as mastered only after three spaced right answers.</p>
        <p><b>What you see next</b> is chosen for you: items you just missed come back first, then new ones, then ones due for review.</p>
        <p><b>Every miss</b> shows the explanation and the book page, and the results screen lists them all again.</p>
        <p><b>Keys:</b> 1–4 or A–D to answer, T/F for true/false, Enter for next, Esc to pause, arrows to steer and browse.</p>
        <p><b>Study plan:</b> read a stage in the Strategy Guide, bank its flashcards, play Blaster or Nest Egg Run until it is above 60%, beat its boss, then take the Final Exam.</p>
      </div>
    </div></div></section>`);
  UI.show({
    el,
    on: (a, t) => {
      if (a === "back") { Sound.sfx("back"); showHub(); return; }
      if (a === "soundtest") { Store.save(); location.href = "sound-test.html"; return; } // (a page of its own, beside the arcade)
      if (a === "fx") {
        const k = t.dataset.k, fx = Store.settings.fx || (Store.settings.fx = {});
        fx[k] = fx[k] === false;
        Store.save();
        t.setAttribute("aria-pressed", String(fx[k]));
        GFX.applySettings();
        Sound.sfx("blip");
        return;
      }
      if (a === "vol") { // a sound layer: OFF switches it off; LOW, MID and HIGH switch it on at that level
        const k = t.dataset.k, v = t.dataset.v, was = Store.settings[k] !== false;
        Store.settings[k] = v !== "off";
        if (v !== "off") Store.settings[k + "Vol"] = v;
        Store.save();
        el.querySelectorAll(`[data-act=vol][data-k=${k}]`).forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
        Sound.applyVolumes();
        if (k === "music" && was !== (v !== "off")) Sound.refreshMusic();
        if (k === "voice" && v !== "off") Sound.say("Announcer on");
        Sound.sfx("blip");
        return;
      }
      if (a === "set") {
        const k = t.dataset.k;
        let v = t.dataset.v;
        if (v === "true") v = true;
        else if (v === "false") v = false;
        Store.settings[k] = v;
        Store.save();
        $$(`[data-k=${k}]`, el).forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
        if (k === "calm") GFX.applySettings();
        if (k === "music") Sound.refreshMusic();
        if (k === "crt") { document.body.classList.toggle("crt-off", !v); GFX.setCRT(v); }
        if (k === "fps") $("#fps").hidden = !v;
        if (k === "quality") GFX.setQuality(v);
        if (k === "tilt" && v) Pointer.initTilt(true);
        if (k === "voice" && v) Sound.say("Announcer on");
        Sound.sfx("blip");
      }
    },
    key: (e) => { if (e.key === "Escape") showHub(); },
  });
}
