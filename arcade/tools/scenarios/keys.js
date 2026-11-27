// Keys and hover on a Mac (Phase 7): the game walked with the keyboard alone, from the title through the hall, a
// stage, each game, its pause menu, a results screen, the guide, stats and Setup, every key the screen answers to
// pressed and what it did checked; then, with the mouse, everything that can be clicked on each screen hovered, and
// whether its look answers (its colour, background, border, shadow, filter or transform) and the pointer is a hand.
// The focus ring is checked as the keyboard moves it: it shows on what has focus.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/keys.js --size 1470x830 --dpr 1 --out <dir>
//
// PART=walk,games,menus,hover (any of them). Writes keys.json; prints a line a check and the faults at the end.
// The scenario reaches some screens directly (a results screen made up, as polish.js does): test only.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const part = (n) => !process.env.PART || process.env.PART.split(",").includes(n);
  const page = cap.page, checks = [], hovers = [];
  const waitReal = async (js, ms = 60000) => { for (let i = 0; i < ms / 100; i++) { if (await cap.eval(js)) return true; await page.waitForTimeout(100); } return false; };
  // where the game is: the screen, a modal over it, the hall's cabinet, the game's state, what has focus and its ring
  const where = () => cap.eval(() => {
    const s = document.querySelector("#ui > .screen"), M = window.__arcade.UI.modal, m = M && M.el, g = window.__arcade.Scenes.cur, ae = document.activeElement;
    const has = ae && ae !== document.body && ae !== document.documentElement;
    let ring = null;
    if (has) { const c = getComputedStyle(ae); ring = (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== "none"; }
    return {
      scr: s ? [...s.classList].filter((c) => c !== "screen").join(".") : null,
      modal: m ? ((m.querySelector("h2, .dlg-name") || m).textContent || "").trim().slice(0, 24) || "modal" : null, line: m && m.querySelector(".dlg-text") ? m.querySelector(".dlg-text").textContent.slice(0, 30) : null, typed: !!(m && m.querySelector(".dlg-foot .next") && m.querySelector(".dlg-foot .next").style.visibility === "visible"),
      cab: (document.querySelector(".hub-name") || {}).textContent || null,
      state: g && g.state || null, paused: !!(g && g.paused), sheet: !!(g && g.quiz && g.quiz.sheet), lane: g && g.lane !== undefined ? g.lane : null,
      qi: g && g.i !== undefined ? g.i : null, answered: g && g.answers ? g.answers.filter((a) => a >= 0).length : null, flags: g && g.flags ? g.flags.filter(Boolean).length : null,
      title: ((s && s.querySelector(".topbar h1")) || {}).textContent || null,
      focus: has ? (ae.dataset.act ? [ae.dataset.act, ae.dataset.sel, ae.dataset.k, ae.dataset.v, ae.dataset.i].filter((x) => x !== undefined && x !== "").join(":") : ae.tagName.toLowerCase() + (ae.className ? "." + String(ae.className).split(" ")[0] : "")) : null,
      fx: has ? Math.round(ae.getBoundingClientRect().left) : null, fy: has ? Math.round(ae.getBoundingClientRect().top) : null,
      lit: (document.querySelector(".stage.focal") || { dataset: {} }).dataset.sel || null,
      ring, input: document.documentElement.dataset.input || null, loading: !!document.getElementById("loading"),
    };
  });
  // a key pressed, frames run until what it should do is seen (or max frames), and the check kept
  // (real: what it opens waits on files arriving in real time, a game's models and sounds: frames and real time both)
  const press = async (what, key, ok, max = 240, real = false) => {
    const before = await where();
    await page.keyboard.press(key);
    let after = await where(), hit = ok(after, before);
    // (a game's files load in real time, slowly here when other browsers share the machine: a real wait goes on for as
    // long as the loading line is up, up to five minutes)
    const t0 = Date.now();
    for (let n = 0; !hit && (n < max || (real && after.loading && Date.now() - t0 < 300000)); n += 6) { await cap.fast(6); if (real) await page.waitForTimeout(100); after = await where(); hit = ok(after, before); }
    checks.push({ what, key, ok: !!hit, before, after });
    console.log((hit ? "ok   " : "FAIL ") + what + " [" + key + "]" + (hit ? "" : " " + JSON.stringify(after)));
    return hit;
  };
  // a modal the game put up on its own (a client's briefing, a trophy): skipped with Escape, as a player would
  const clearModals = async () => { for (let i = 0; i < 6; i++) { const w = await where(); if (!w.modal || w.modal === "PAUSED") return; await page.keyboard.press("Escape"); await cap.fast(30); } };
  const ringOK = (w) => !!(w.focus && w.ring);
  // Tab (Shift+Tab with back) until the button named has the focus
  const tabTo = async (act, max = 40, back = false) => { let w; for (let i = 0; i < max; i++) { w = await where(); if (w.focus === act) return w; await page.keyboard.press(back ? "Shift+Tab" : "Tab"); await cap.fast(2); } return where(); };

  if (part("walk")) {
    // ---- from the title, with keys alone (the first visit's dialogs are seen and skipped with their own keys)
    await waitReal(() => !!document.querySelector(".scr-title"));
    await cap.fast(60);
    await press("title: Enter starts", "Enter", (a) => a.scr === "scr-hub" || !!a.modal, 900, true);
    await clearModals();
    await cap.fast(60);
    await press("hall: ArrowRight walks to the next cabinet", "ArrowRight", (a, b) => a.cab && a.cab !== b.cab);
    await press("hall: ArrowLeft walks back", "ArrowLeft", (a, b) => a.cab && a.cab !== b.cab);
    await press("hall: Escape goes back to the title", "Escape", (a) => /scr-title/.test(a.scr || ""), 600);
    await cap.fast(30);
    await press("title: Space starts too", " ", (a) => a.scr === "scr-hub" || !!a.modal, 900);
    await clearModals();
    await cap.fast(60);
    await press("hall: Tab shows the focus ring", "Tab", ringOK);
    // Enter on a button the keyboard has moved to is that button's: STATS opens the stats, not the cabinet
    let t = await tabTo("stats");
    checks.push({ what: "hall: Tab reaches STATS", ok: t.focus === "stats", after: t });
    await press("hall: Enter on STATS opens the stats", "Enter", (a) => /STATS/.test(a.title || ""), 600, true);
    await press("stats: Escape back to the hall", "Escape", (a) => a.scr === "scr-hub", 600);
    await cap.fast(30);
    t = await tabTo("stats");
    await press("hall: an arrow turns the cabinets and lets go of STATS", "ArrowRight", (a, b) => a.cab !== b.cab && a.focus === null, 10);
    await press("hall: ArrowLeft, back to the first", "ArrowLeft", (a, b) => a.cab !== b.cab, 10);
    await press("hall: Enter plays the cabinet", "Enter", (a) => a.scr === "scr-select" || !!a.modal, 600, true);
    await clearModals();
    await cap.fast(60);
    // ---- stage select: Escape back; Tab through to a stage; Enter starts it
    let w = await where();
    if (w.scr !== "scr-select") checks.push({ what: "stage select reached", ok: false, after: w });
    await press("select: Escape goes back to the hall", "Escape", (a) => a.scr === "scr-hub", 600);
    await cap.fast(30);
    await press("hall: Enter again", "Enter", (a) => a.scr === "scr-select", 600);
    await cap.fast(60);
    // the arrows over the stages: the first to the lit one, then across a row and down a column
    await press("select: the first arrow goes to the lit stage", "ArrowDown", (a) => !!a.lit && a.focus === "pick:" + a.lit && a.ring, 10);
    await press("select: ArrowRight, the next card in its row", "ArrowRight", (a, b) => /^pick:/.test(a.focus || "") && a.focus !== b.focus && a.fx > b.fx && Math.abs(a.fy - b.fy) < 8, 10);
    await press("select: ArrowLeft, back", "ArrowLeft", (a, b) => /^pick:/.test(a.focus || "") && a.fx < b.fx && Math.abs(a.fy - b.fy) < 8, 10);
    await press("select: ArrowDown, the row below", "ArrowDown", (a, b) => /^pick:/.test(a.focus || "") && a.fy > b.fy + 20, 10);
    await press("select: ArrowUp, back up", "ArrowUp", (a, b) => /^pick:/.test(a.focus || "") && a.fy < b.fy - 20, 10);
    w = await where();
    await press("select: Enter starts the focused stage (its client's briefing first)", "Enter", (a) => /scr-game/.test(a.scr || "") || !!a.modal, 3600, true);
    // the client's briefing (a first visit): Enter shows the whole line, Enter again the next; Escape skips to the game
    w = await where();
    if (w.modal && w.modal !== "PAUSED") {
      await cap.fast(10);
      // (the stage the arrows moved to keeps the focus under the briefing: Enter is the briefing's, never that stage's
      // again: the review found it started the stage a second time, the briefing cut short and never shown again)
      await press("briefing: Enter finishes the line (the stage under it not started again)", "Enter", (a) => !!a.modal && a.typed && !a.loading && a.scr === "scr-select", 10);
      await press("briefing: Enter again, the next line", "Enter", (a, b) => !!a.modal && !a.loading && a.scr === "scr-select" && a.line !== b.line, 30);
      await press("briefing: Escape skips to the game", "Escape", (a) => !a.modal && /scr-game/.test(a.scr || ""), 3600, true);
      await clearModals();
    }
    const asking = await cap.until(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.state === "ask" && s.round && !(s.quiz && s.quiz.sheet)); }, 3000);
    if (!asking) checks.push({ what: "game: a question came up", ok: false, after: await where() });
    await press("game: 1 answers", "1", (a) => a.state && a.state !== "ask" || a.sheet, 60);
    await cap.until(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.quiz && s.quiz.sheet); }, 1500);
    await cap.fast(30);
    await press("game: Enter dismisses the explanation", "Enter", (a, b) => b.sheet && !a.sheet, 120);
    await press("game: Escape pauses", "Escape", (a) => a.modal === "PAUSED" && a.paused, 30);
    w = await where();
    checks.push({ what: "pause: RESUME has the focus and its ring", ok: w.focus === "resume" && w.ring, after: w });
    console.log((w.focus === "resume" && w.ring ? "ok   " : "FAIL ") + "pause: focus " + w.focus + " ring " + w.ring);
    await press("pause: Escape resumes", "Escape", (a, b) => b.modal === "PAUSED" && !a.modal && !a.paused, 30);
    await press("game: P pauses", "p", (a) => a.modal === "PAUSED", 30);
    await press("pause: P resumes", "p", (a, b) => b.modal === "PAUSED" && !a.modal && !a.paused, 30);
    await press("game: Escape pauses again", "Escape", (a) => a.modal === "PAUSED", 30);
    // Tab down the pause menu to QUIT TO ARCADE, Enter
    for (let i = 0; i < 8; i++) { w = await where(); if (w.focus === "quit") break; await page.keyboard.press("Tab"); await cap.fast(2); }
    checks.push({ what: "pause: Tab reaches QUIT TO ARCADE", ok: w.focus === "quit" && w.ring, after: w });
    await press("pause: Enter on QUIT goes to the hall", "Enter", (a) => a.scr === "scr-hub", 600);
  }

  if (part("games")) {
    // ---- each game's own keys, reached directly
    await cap.eval(() => { window.__cap.skipDialogs = true; });
    const pauseResume = async (g) => {
      await press(g + ": Escape pauses", "Escape", (a) => a.modal === "PAUSED", 30);
      if (g === "racer") { // (the pause menu's arrows, once)
        await press("pause: ArrowDown, RESTART", "ArrowDown", (a) => a.focus === "restart" && a.ring, 10);
        await press("pause: ArrowUp, RESUME", "ArrowUp", (a) => a.focus === "resume", 10);
      }
      await press(g + ": Escape resumes", "Escape", (a, b) => b.modal === "PAUSED" && !a.modal && !a.paused, 30);
    };
    let w;
    await cap.go("racer", "2"); await cap.next(); await cap.ask(1500);
    await press("racer: ArrowLeft takes a lane", "ArrowLeft", (a) => a.lane !== null && a.lane !== undefined, 30);
    await press("racer: ArrowRight moves a lane over", "ArrowRight", (a, b) => a.lane !== b.lane, 30);
    await press("racer: Enter boosts (or the lane is reached)", "Enter", (a, b) => true, 0);
    await pauseResume("racer");
    await cap.go("boss", "1"); await cap.next(); await cap.ask(1500);
    await press("boss: 2 answers", "2", (a) => a.state !== "ask" || a.sheet, 60);
    await cap.until(() => { const s = window.__arcade.Scenes.cur; return !!(s && s.quiz && s.quiz.sheet); }, 1500);
    await cap.fast(20);
    await press("boss: Space dismisses the explanation", " ", (a, b) => b.sheet && !a.sheet, 120);
    await pauseResume("boss");
    await cap.go("blaster", "3"); await cap.next(); await cap.ask(1500);
    await press("blaster: B answers (letters as numbers)", "b", (a) => a.state !== "ask" || a.sheet, 60);
    await pauseResume("blaster");
    await cap.go("memory", "3"); await cap.fast(220);
    await press("memory: Space turns the card", " ", (a) => a.state === "back", 60);
    await cap.fast(40);
    await press("memory: 2 grades it GOOD", "2", (a) => a.state !== "back", 60);
    await cap.fast(120);
    await press("memory: F turns the next", "f", (a) => a.state === "back", 120);
    await cap.fast(40);
    await press("memory: ArrowRight grades EASY", "ArrowRight", (a) => a.state !== "back", 60);
    await pauseResume("memory");
    await cap.fast(60);
    w = await tabTo("pause");
    checks.push({ what: "memory: Tab reaches the pause button", ok: w.focus === "pause", after: w });
    await press("memory: Enter on the pause button pauses (the card stays)", "Enter", (a, b) => a.modal === "PAUSED" && a.state === b.state, 30);
    await press("memory: Escape resumes", "Escape", (a) => !a.modal, 30);
    await cap.eval(() => { window.__arcade.show.examSetup(); });
    await cap.fast(30);
    await press("exam setup: Tab shows the ring", "Tab", ringOK);
    await press("exam setup: Escape goes to the hall", "Escape", (a) => a.scr === "scr-hub", 600);
    await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); });
    await cap.go("exam", "all"); await cap.fast(260);
    await press("exam: 1 answers", "1", (a, b) => a.answered > b.answered, 30);
    await press("exam: ArrowRight goes to the next question", "ArrowRight", (a, b) => a.qi === b.qi + 1, 30);
    await press("exam: ArrowLeft goes back", "ArrowLeft", (a, b) => a.qi === b.qi - 1, 30);
    await press("exam: Enter goes on", "Enter", (a, b) => a.qi === b.qi + 1, 30);
    await press("exam: Escape pauses", "Escape", (a) => a.modal === "PAUSED", 30);
    await press("exam: Escape resumes", "Escape", (a) => !a.modal, 30);
    await cap.eval(() => window.__arcade.Scenes.cur.palette()); await cap.fast(6);
    w = await where();
    checks.push({ what: "exam grid: the question you are on has the focus", ok: w.focus === "jump:" + w.qi, after: w });
    await press("exam grid: ArrowRight, the next number", "ArrowRight", (a, b) => /^jump:/.test(a.focus || "") && b.fx !== null && a.fx > b.fx, 10);
    await press("exam grid: ArrowDown, the row below", "ArrowDown", (a, b) => /^jump:/.test(a.focus || "") && a.fy > b.fy, 10);
    const target = +((await where()).focus || "jump:0").split(":")[1];
    await press("exam grid: Enter goes to that question", "Enter", (a) => !a.modal && a.qi === target, 30);
    w = await tabTo("flag");
    checks.push({ what: "exam: Tab reaches the flag", ok: w.focus === "flag", after: w });
    await press("exam: Enter on the flag flags the question", "Enter", (a, b) => a.flags === b.flags + 1 && a.qi === b.qi, 30);
    await press("exam: Space on it unflags", " ", (a, b) => a.flags === b.flags - 1 && a.qi === b.qi, 30);
  }

  if (part("menus")) {
    await cap.eval(() => { window.__cap.skipDialogs = true; });
    // ---- a results screen: Enter plays again, Escape goes to the hall
    const results = () => cap.eval(() => {
      const A = window.__arcade;
      A.show.results({ game: "boss", sel: A.makeSelection("4"), run: { correct: 6, answered: 6, bestStreak: 6, missed: [], xp0: -230, start: {} }, stars: 3, score: 18450,
        title: "STAGE CLEAR", headline: "18,450", sub: "The Fine Print falls", color: "#ff3ad4", won: [] }, 0);
    });
    await results(); await cap.fast(16 * 12 + 150);
    let w = await where();
    checks.push({ what: "results: PLAY AGAIN has the focus", ok: w.focus === "again", after: w });
    console.log((w.focus === "again" ? "ok   " : "FAIL ") + "results: focus " + w.focus);
    await press("results: Escape goes to the hall", "Escape", (a) => a.scr === "scr-hub", 600);
    await results(); await cap.fast(16 * 12 + 150);
    await press("results: ArrowRight, CHANGE STAGE", "ArrowRight", (a) => a.focus === "stage" && a.ring, 10);
    await press("results: ArrowRight, ARCADE", "ArrowRight", (a) => a.focus === "hub", 10);
    await press("results: ArrowLeft, back", "ArrowLeft", (a) => a.focus === "stage", 10);
    await press("results: Enter on it (the arrows moved there) opens stage select", "Enter", (a) => a.scr && /scr-select/.test(a.scr), 600, true);
    await cap.fast(30);
    await press("select: Enter with no stage chosen plays the lit one", "Enter", (a) => /scr-game/.test(a.scr || "") || !!a.modal, 3600, true);
    await results(); await cap.fast(16 * 12 + 150);
    w = await tabTo("stage");
    checks.push({ what: "results: Tab reaches CHANGE STAGE", ok: w.focus === "stage", after: w });
    await press("results: Enter on CHANGE STAGE opens stage select", "Enter", (a) => a.scr && /scr-select/.test(a.scr), 600, true);
    await results(); await cap.fast(16 * 12 + 150);
    await press("results: Enter plays again", "Enter", (a) => /scr-game/.test(a.scr || "") || !!a.modal, 3600, true);
    // ---- the guide: Tab, a chapter, the search box (typing goes into it), Escape clears it, Escape again to the hall
    await cap.eval(() => window.__arcade.go("guide"));
    await waitReal(() => !!document.querySelector(".guide-lib"));
    await cap.fast(60);
    await press("guide: the first arrow goes to a chapter", "ArrowDown", (a) => /^ch/.test(a.focus || "") && a.ring, 10);
    await press("guide: ArrowRight, the next chapter", "ArrowRight", (a, b) => /^ch/.test(a.focus || "") && a.fx > b.fx, 10);
    await press("guide: Tab shows the ring", "Tab", ringOK);
    await cap.eval(() => { const i = document.querySelector(".guide-lib input"); if (i) i.focus(); });
    await page.keyboard.type("risk"); await cap.fast(20);
    w = await where();
    const typed = await cap.eval(() => { const i = document.querySelector(".guide-lib input"); return i ? i.value : null; });
    checks.push({ what: "guide: typing goes into the search box", ok: typed === "risk", after: w, typed });
    console.log((typed === "risk" ? "ok   " : "FAIL ") + "guide: typed '" + typed + "'");
    await press("guide: Escape clears the search", "Escape", () => true, 0);
    const cleared = await cap.eval(() => { const i = document.querySelector(".guide-lib input"); return i ? i.value : null; });
    checks.push({ what: "guide: the search is cleared", ok: cleared === "", cleared });
    await press("guide: Escape again goes to the hall", "Escape", (a) => a.scr === "scr-hub", 600);
    // a chapter of the guide: Escape back to the library
    await cap.eval(() => window.__arcade.go("guide"));
    await waitReal(() => !!document.querySelector(".guide-lib"));
    await cap.fast(30);
    await cap.eval(() => { const b = document.querySelector("[data-act=ch]"); if (b) b.click(); });
    await cap.fast(60);
    await press("guide chapter: Escape goes back", "Escape", (a, b) => a.scr !== b.scr, 600);
    // ---- stats and Setup: Escape to the hall; Tab through Setup's switches
    await cap.eval(() => window.__arcade.show.stats()); await cap.fast(40);
    await press("stats: Tab shows the ring", "Tab", ringOK);
    await press("stats: Escape goes to the hall", "Escape", (a) => a.scr === "scr-hub", 600);
    await cap.eval(() => window.__arcade.show.setup()); await cap.fast(40);
    await press("setup: the first arrow goes to the first switch's setting", "ArrowDown", (a) => /^(set|vol):/.test(a.focus || "") && a.ring, 10);
    await press("setup: ArrowRight, the next choice", "ArrowRight", (a, b) => /^(set|vol):/.test(a.focus || "") && a.fx > b.fx, 10);
    await press("setup: ArrowDown, the next row", "ArrowDown", (a, b) => a.fy > b.fy, 10);
    const lv = await cap.eval(() => document.activeElement.getAttribute("aria-pressed"));
    await press("setup: Enter sets it", "Enter", () => true, 0);
    const lv2 = await cap.eval(() => document.activeElement.getAttribute("aria-pressed"));
    checks.push({ what: "setup: Enter on a choice the arrows moved to chooses it", ok: lv2 === "true", before: lv, after: lv2 });
    console.log((lv2 === "true" ? "ok   " : "FAIL ") + "setup: chosen " + lv + " -> " + lv2);
    // past the last switch, the arrow scrolls the page to what is under it (HOW IT WORKS)
    // (Up and Down go row by row in reading order, down one column and on down the next; a scroll the browser animates
    // is waited for in real time)
    const path = [];
    for (let i = 0; i < 30; i++) { const b4 = await where(); await page.keyboard.press("ArrowDown"); await cap.fast(2); await page.waitForTimeout(120); const af = await where(); path.push(af.focus); if (af.focus === b4.focus) break; }
    console.log("     setup's rows going down: " + path.join(" > "));
    const st0 = await cap.eval(() => { const s = document.querySelector("#ui > .screen .scroll"); return s ? s.scrollTop : 0; });
    await page.keyboard.press("ArrowDown"); await cap.fast(4); await page.waitForTimeout(600); await cap.fast(4);
    const st1 = await cap.eval(() => { const s = document.querySelector("#ui > .screen .scroll"); return s ? [s.scrollTop, s.scrollHeight - s.clientHeight] : [0, 0]; });
    checks.push({ what: "setup: past the last switch the arrow scrolls the page", ok: st1[0] > st0 || st1[0] >= st1[1] - 1, scrollTop: [st0, st1] });
    console.log((st1[0] > st0 || st1[0] >= st1[1] - 1 ? "ok   " : "FAIL ") + "setup: scroll " + st0 + " -> " + st1[0] + " of " + st1[1]);
    await press("setup: Tab shows the ring", "Tab", ringOK);
    await press("setup: Escape goes to the hall", "Escape", (a) => a.scr === "scr-hub", 600);
    // the exam's setup: Enter starts it
    await cap.eval(() => window.__arcade.show.examSetup()); await cap.fast(30);
    await press("exam setup: Enter starts the exam", "Enter", (a) => /scr-exam/.test(a.scr || ""), 3600, true);
    await cap.eval(() => window.__arcade.go("hub")); await cap.fast(30);
    // ---- a careful question (submitting an exam with questions blank): Escape is NO
    await cap.eval(() => { window.__arcade.show.examSetup(); const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); });
    await cap.go("exam", "all"); await cap.fast(200);
    await cap.eval(() => { const s = window.__arcade.Scenes.cur; s.i = s.rounds.length - 1; s.show(); });
    await cap.fast(20);
    await press("exam: Enter on the last question asks to submit", "Enter", (a) => !!a.modal, 30);
    w = await where();
    checks.push({ what: "confirm: the safe answer has the focus", ok: w.focus === "no", after: w });
    console.log((w.focus === "no" ? "ok   " : "FAIL ") + "confirm: focus " + w.focus);
    await page.keyboard.press("ArrowUp"); await cap.fast(2); w = await where();
    if (w.focus !== "yes") { await page.keyboard.press("ArrowLeft"); await cap.fast(2); w = await where(); }
    checks.push({ what: "confirm: an arrow goes to the other answer", ok: w.focus === "yes" && w.ring, after: w });
    console.log((w.focus === "yes" ? "ok   " : "FAIL ") + "confirm: arrow -> " + w.focus);
    await press("confirm: Escape answers no", "Escape", (a) => !a.modal && /scr-exam/.test(a.scr || ""), 30);
  }

  if (part("hover")) {
    // ---- the mouse: everything clickable on each screen hovered, its look compared before and on the hover
    await cap.eval(() => { window.__cap.skipDialogs = true; const s = document.createElement("style"); s.id = "__notrans"; s.textContent = "*, *::before, *::after { transition: none !important; }"; document.head.appendChild(s); });
    await page.mouse.move(2, 2);
    const look = (sel) => cap.eval((sel) => {
      const el = document.querySelector(sel); if (!el) return null;
      const read = (e) => { const c = getComputedStyle(e); return [c.color, c.backgroundColor, c.backgroundImage, c.borderTopColor, c.boxShadow, c.filter, c.transform, c.outlineStyle, c.textShadow, c.opacity].join("|"); };
      const kids = [el, ...el.querySelectorAll("*")].slice(0, 30);
      return { all: kids.map(read).join("#") + "#" + [...el.querySelectorAll("*")].slice(0, 6).map((k) => { const b = getComputedStyle(k, "::before"), a = getComputedStyle(k, "::after"); return b.opacity + b.boxShadow + a.opacity + a.boxShadow; }).join(""), cursor: getComputedStyle(el).cursor };
    }, sel);
    const hoverAll = async (screen) => {
      const items = await cap.eval(() => {
        const out = [], seen = new Set();
        document.querySelectorAll("[data-act], button, a[href], .seg button, input[type=range]").forEach((el, i) => {
          const r = el.getBoundingClientRect(), c = getComputedStyle(el);
          if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth || c.visibility === "hidden" || el.disabled) return;
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          if (!top || !(top === el || el.contains(top))) return; // (under something: not reachable by the mouse there)
          const id = "__h" + i; el.setAttribute("data-hv", id);
          const name = (el.dataset.act || el.tagName.toLowerCase()) + (el.dataset.sel ? ":" + el.dataset.sel : el.dataset.v ? ":" + el.dataset.v : el.dataset.i ? ":" + el.dataset.i : "");
          const kind = name.replace(/:.*/, "") + "|" + el.className;
          if (seen.has(kind)) return; seen.add(kind); // (one of each kind on the screen)
          out.push({ sel: "[data-hv='" + id + "']", name, cls: String(el.className).slice(0, 40), x: r.left + r.width / 2, y: r.top + r.height / 2 });
        });
        return out;
      });
      for (const it of items) {
        await page.mouse.move(2, 2); await cap.fast(2);
        const a = await look(it.sel);
        await page.mouse.move(it.x, it.y); await cap.fast(2);
        const b = await look(it.sel);
        const answers = !!(a && b && a.all !== b.all);
        hovers.push({ screen, name: it.name, cls: it.cls, answers, cursor: b ? b.cursor : null });
      }
      await page.mouse.move(2, 2);
      // (quiet: a hand but no change of look, or a change but no hand; inert: neither, a thing that does nothing now)
      const mine = hovers.filter((h) => h.screen === screen), quiet = mine.filter((h) => h.answers !== (h.cursor === "pointer")), inert = mine.filter((h) => !h.answers && h.cursor !== "pointer");
      console.log("hover " + screen + ": " + items.length + " kinds" + (quiet.length ? "; quiet: " + quiet.map((h) => h.name + (h.answers ? " (no hand: " + h.cursor + ")" : " (no change)")).join(", ") : "; all answer") + (inert.length ? "; inert: " + inert.map((h) => h.name).join(", ") : ""));
    };
    await cap.eval(() => window.__arcade.go("title")); await waitReal(() => !!document.querySelector(".scr-title")); await cap.fast(200);
    await hoverAll("title");
    await cap.eval(() => window.__arcade.go("hub")); await waitReal(() => !!document.querySelector(".scr-hub [data-act=play]")); await cap.fast(90); // (the hall's files first, in real time)
    await hoverAll("hub");
    await cap.eval(() => window.__arcade.show.select("blaster")); await cap.fast(60);
    await hoverAll("select");
    await cap.eval(() => window.__arcade.show.select("boss")); await cap.fast(60);
    await hoverAll("select-boss");
    await cap.go("blaster", "3"); await cap.next(); await cap.ask(1500); await cap.fast(30);
    await hoverAll("blaster");
    await cap.eval(() => window.__arcade.Scenes.cur.pause()); await cap.fast(10);
    await hoverAll("pause");
    await cap.eval(() => window.__arcade.UI.closeModal());
    await cap.go("racer", "2"); await cap.next(); await cap.ask(1500); await cap.fast(30);
    await hoverAll("racer");
    await cap.go("memory", "3"); await cap.fast(220);
    await hoverAll("memory-front");
    await cap.eval(() => window.__arcade.Scenes.cur.flip()); await cap.fast(60);
    await hoverAll("memory-back");
    await cap.eval(() => { window.__arcade.show.examSetup(); }); await cap.fast(30);
    await hoverAll("exam-setup");
    await cap.eval(() => { const b = document.querySelector("[data-act=len][data-v='20']"); if (b) b.click(); });
    await cap.go("exam", "all"); await cap.fast(200);
    await hoverAll("exam");
    await cap.eval(() => window.__arcade.Scenes.cur.palette && window.__arcade.Scenes.cur.palette()); await cap.fast(10);
    await hoverAll("exam-palette");
    await cap.eval(() => window.__arcade.UI.closeModal());
    await cap.eval(() => { const A = window.__arcade; A.show.results({ game: "boss", sel: A.makeSelection("4"), run: { correct: 4, answered: 6, bestStreak: 3, missed: [], xp0: -230, start: {} }, stars: 2, score: 9450, title: "STAGE CLEAR", headline: "9,450", sub: "", color: "#ff3ad4", won: [] }, 0); });
    await cap.fast(16 * 12 + 150);
    await hoverAll("results");
    await cap.eval(() => window.__arcade.go("guide")); await waitReal(() => !!document.querySelector(".guide-lib")); await cap.fast(60);
    await hoverAll("guide");
    await cap.eval(() => { const b = document.querySelector("[data-act=ch]"); if (b) b.click(); }); await cap.fast(60);
    await hoverAll("guide-chapter");
    await cap.eval(() => window.__arcade.show.stats()); await cap.fast(40);
    await hoverAll("stats");
    await cap.eval(() => window.__arcade.show.setup()); await cap.fast(40);
    await hoverAll("setup");
  }

  const fails = checks.filter((c) => !c.ok && !c.advisory), notes = checks.filter((c) => !c.ok && c.advisory);
  const quiet = hovers.filter((h) => h.answers !== (h.cursor === "pointer")), inert = hovers.filter((h) => !h.answers && h.cursor !== "pointer");
  fs.writeFileSync(path.join(cap.out, "keys.json"), JSON.stringify({ checks, hovers, fails: fails.length, quiet: quiet.length, inert: inert.length }, null, 1));
  console.log("\nkeys: " + checks.length + " checks, " + fails.length + " failed" + (fails.length ? ": " + fails.map((c) => c.what).join("; ") : "") + (notes.length ? "; notes: " + notes.map((c) => c.what).join("; ") : ""));
  console.log("hover: " + hovers.length + " kinds of clickable, " + quiet.length + " quiet (a hand and no change, or a change and no hand)" + (quiet.length ? ": " + quiet.map((h) => h.screen + " " + h.name).join(", ") : "") + (inert.length ? "; inert now: " + inert.map((h) => h.screen + " " + h.name).join(", ") : ""));
};
