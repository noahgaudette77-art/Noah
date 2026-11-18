// Boss Rush's sound, checked without ears: every call the game makes to Sound (an effect, a loop, the announcer, the
// music) is logged with the frame it was made on, beside what the stage shows on that frame, through the same moments
// the fight's strips show. Written as sound-cues.md in the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/boss-sound.js --out arcade/docs/combat-pass/boss --dpr 1
//
// Nothing is drawn (every frame is stepped on the virtual clock, 60 to the second). The scenario sets state in the
// page to reach a moment quickly, as boss-fight.js does: test only. Two fights are logged: PRODUCT PUSHER (boss 1)
// from its entrance to its death and to the player's defeat, and THE PROCTOR (all) for its entrance, its five kinds
// of strike and its death.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const page = (fn, arg) => cap.eval(fn, arg);
  // ---- before a game is built: a frame counter, and every Sound call noted with its frame
  await page(() => {
    const A = window.__arcade, S = A.Sound, log = (window.__log = []);
    window.__f = 0;
    const count = () => { window.__f++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    const heard = (text) => log.push([window.__f, "heard", text]);
    const wrap = (k, say) => { const f = S[k].bind(S); S[k] = (...a) => { const t = say(...a); if (t) heard(t); return f(...a); }; };
    wrap("sfx", (name, pan, o) => "`" + name + "`" + (o && o.delay ? " (sounds " + Math.round(o.delay * 60) + " frames on)" : ""));
    wrap("say", (text) => "announcer: \"" + text + "\"");
    wrap("loop", (id, name) => (S.loops[id] ? "" : "loop starts: `" + name + "`"));
    wrap("stopLoop", (id) => (S.loops[id] ? "loop stops: `" + S.loops[id].name + "`" : ""));
    wrap("hush", () => "whatever is still ringing is faded out");
    wrap("setIntensity", (n) => (Math.round(n) !== Math.round(S.intensity) ? "music intensity " + Math.round(n) : ""));
    wrap("play", (name) => (S.trackName === name ? "" : "music starts: `" + name + "`"));
    wrap("stopMusic", () => (S._now || S.timer ? "music stops" : ""));
  });
  const KIND = ["a volley of projectiles", "a ground slam", "a wave of energy", "a swept beam", "seekers"];
  // ---- a game is built: what the stage shows, noted with its frame
  const watch = () => page((KIND) => {
    const A = window.__arcade, s = A.Scenes.cur, st = s.stage, log = window.__log, seen = (text) => log.push([window.__f, "seen", text]);
    const SHOW = {
      landing: () => "its feet touch the floor: a ring of dust, wreckage, the floor shakes, lightning", powerUp: () => "it powers up: its lights come on (its roar and its name follow)",
      ask: () => "a question is up", marks: (t) => (t.mark.length ? "" : "the marker of its strike stands at the foot of the picture (" + KIND[t.kind] + ")"),
      fire: (slot, right) => (right ? "the player's burst begins, from the answer's side" : "the player's shot leaves (the answer is wrong)"), volley: () => "a bolt leaves (muzzle flash, spent cell)",
      shotLands: (sh) => (sh.right ? "a bolt sparks off its armour" : "the shot dies on its armour in a dull red fizzle"),
      bossHit: (dmg, o) => "the lance lands on its body (a white heart, sparks in the answer's colour, a thin ring, a hit-stop); it " + (o.dead ? "is finished" : "recoils"),
      wound: () => "a hole is burnt in its chest: it leaks sparks from now on", breakOff: (bone) => "its " + bone.replace("_", " ").toLowerCase() + " is torn off and thrown, turning, sparks trailing (a small blast where it tore, 3 frames on)",
      enrage: () => "it rages: a roar, a red ring, lightning", attack: (slow) => "the boss strikes (" + (slow ? "the bar has run out" : "the answer is wrong") + "): its blow begins",
      strikeNow: () => "the rule fires: the blow is at its end", release: (k) => "it lets the strike go (" + KIND[k.kind] + "): the markers close, a beat of slow motion",
      playerHit: () => "the strike lands on the player: the heart is seen to go (red flash, colours split, shake, the HUD cracks, the hearts blink)",
      setLow: (on) => (on === st.low ? "" : on === 1 ? "one heart left: the red frame beats" : on === 2 ? "no heart left: the red frame holds" : "low health ends"),
      critical: () => "done for: it sways, arms hanging, lights failing", chain: (i, tear) => (tear ? "a blast on its body as it falls" : "a small blast on its body"),
      death: () => "its death begins: slow motion, it goes over backward", lastBlast: () => "the last blast as it hits the floor: every part thrown clear, rings, wreckage",
      defeat: () => "the boss has the last word: it roars and gloats", pause: () => "the game is paused", resume: () => "the game goes on",
    };
    for (const k in SHOW) { const f = st[k].bind(st); st[k] = (...a) => { const t = SHOW[k](...a); if (t) seen(t); return f(...a); }; }
    const reward = A.HudFX.reward.bind(A.HudFX);
    A.HudFX.reward = (root, from, to, o) => { seen((o && o.kind === "coin" ? "coins" : "stars") + " leave for the score"); return reward(root, from, to, o); };
    const banner = A.UI.banner.bind(A.UI);
    A.UI.banner = (text, ...r) => { seen("banner: " + text); return banner(text, ...r); };
    const fb = s.quiz.feedback.bind(s.quiz);
    s.quiz.feedback = (o) => { seen("the explanation sheet comes up"); return fb(o); };
    const enter = st.a.enter.bind(st.a);
    st.a.enter = () => { seen("it appears above the picture and drops in"); return enter(); };
  }, KIND);
  const out = ["# Boss Rush: which sound is called on which frame", "",
    "Taken from the running game by `arcade/tools/scenarios/boss-sound.js`: every call to `Sound.sfx`, `Sound.loop`, `Sound.stopLoop`, `Sound.say`, `Sound.play`, `Sound.stopMusic`, `Sound.setIntensity` and `Sound.hush` is noted with the frame it was made on, beside what the stage shows on that frame. Frames are 1/60 s; each table counts from the moment named above it. A sound and its picture are fired from the same place in the code, so they share a frame; a sound marked \"sounds n frames on\" is asked for on that frame and starts n frames later. `charge`, `correct`, `gameover` and the banners' lines are the rules' own, left where they were.", ""];
  const mark = () => page(() => { window.__f0 = window.__f; window.__log.length = 0; });
  const dump = async (title, note) => {
    const r = await page(() => { const S = window.__arcade.Sound; return { f0: window.__f0, log: window.__log.splice(0), loops: Object.keys(S.loops).map((id) => S.loops[id].name) }; });
    const rows = new Map();
    for (const [f, kind, text] of r.log) { const k = f - r.f0; if (!rows.has(k)) rows.set(k, { seen: [], heard: [] }); const row = rows.get(k)[kind]; if (!row.includes(text)) row.push(text); }
    out.push("## " + title, "");
    if (note) out.push(note, "");
    out.push("| frame | seen | heard |", "|---:|---|---|");
    [...rows.keys()].sort((a, b) => a - b).forEach((k) => { const v = rows.get(k); out.push("| " + (k > 0 ? "+" + k : k) + " | " + v.seen.join("; ") + " | " + v.heard.join(" · ") + " |"); });
    out.push("", "Loops running at the end of it: " + (r.loops.length ? r.loops.map((n) => "`" + n + "`").join(", ") : "none") + ".", "");
  };
  const ready = async (wait = 30) => { await cap.next(); await cap.ask(2400); await cap.fast(wait); };
  const set = (o) => page((v) => { const s = window.__arcade.Scenes.cur; if (v.hp !== undefined) s.hp = Math.round(s.maxHp * v.hp); if (v.hearts !== undefined) { s.hearts = v.hearts; s.stage.debts.length = 0; s.stage.setLow(v.hearts === 1 ? 1 : 0); } if (v.kind !== undefined) s.stage.kindN = v.kind; s.hud(); }, o);
  const charge = (sec) => page((q) => { const s = window.__arcade.Scenes.cur; s.charge = s.T - q; }, sec);
  const start = async (key) => {
    await page(() => { window.__log.length = 0; });
    await cap.go("boss", key);
    await watch();
    await page(() => { const l = window.__log, i = l.findIndex((x) => x[2].startsWith("music starts")); window.__f0 = i >= 0 ? l[i][0] : 0; });
    await cap.ask(2400); await cap.fast(150);
    await page(() => { window.__log.unshift([window.__f0, "seen", "the game starts: the arena waits under the storm"]); });
  };

  // ================= PRODUCT PUSHER
  out.push("# PRODUCT PUSHER (boss 1)", "");
  await start("1");
  await dump("The entrance", "Frame 0: the game starts (the rule opens the boss's words 96 frames on; here they are closed at once, so the first question is up while it is still powering up).");

  await ready(); await mark(); await cap.answer("R"); await cap.fast(80);
  await dump("A right answer: the burst, the lance, the boss recoils", "Frame 0: the answer is picked. The rule lands the blow 18 frames on (0.3 s), as it always did; the frames after it are stretched by the rule's own hit-stop.");

  await ready(); await set({ hearts: 3 }); await charge(4); await mark(); await cap.fast(330);
  await dump("The bar runs out: the telegraph, the strike, the landing", "Frame 0: four seconds of the bar are left (its wind-up pose has followed the bar since it was 45% full). The bar runs out at frame 240: the rule takes the heart there and fires its hit 8 frames on.");

  await ready(); await set({ hearts: 3 }); await mark(); await cap.answer("W"); await cap.fast(120);
  await dump("A wrong answer before it has wound up", "Frame 0: the answer is picked. The shot dies on its armour, the blow is at its end on the rule's frame (8 frames on), and the strike has landed before the explanation sheet comes up.");

  await ready(); await set({ hearts: 2 }); await mark(); await cap.answer("W"); await cap.fast(170);
  await dump("The last heart", "Frame 0: a wrong answer is picked with two hearts left.");

  await mark(); await page(() => { window.__arcade.Scenes.cur.pause(); }); await cap.fast(30);
  await dump("A pause, with the alarm sounding", "Frame 0: the game is paused. The menu's own blip is the only thing left to sound.");
  await mark(); await page(() => { const A = window.__arcade; A.UI.closeModal(); A.Scenes.cur.resume(); }); await cap.fast(30);
  await dump("The pause ends", "Frame 0: the game goes on.");

  await ready(); await set({ hearts: 3, hp: 0.6 }); await mark(); await cap.answer("R"); await cap.fast(110);
  await dump("Damage: armour is torn off", "Frame 0: the answer is picked with 60% of its HP left (the blow takes it under 56%).");

  await ready(); await set({ hp: 0.38 }); await mark(); await cap.answer("R"); await cap.fast(150);
  await dump("Rage", "Frame 0: the answer is picked with 38% of its HP left (the blow takes it under 35%).");

  await ready(); await set({ hp: 0.04 }); await mark(); await cap.answer("R"); await cap.fast(200);
  await dump("The finishing blow: done for", "Frame 0: the answer is picked. While its explanation is up the boss stands there done for.");
  await mark(); await cap.next(); await cap.fast(230);
  await dump("Its death", "Frame 0: the explanation is closed (the rule shows the results 192 frames on, as it always did). The last blast, the banner, the reward and the jingle are all over before that.");

  await start("1");
  await page(() => { window.__log.length = 0; });
  await ready(60); await set({ hearts: 1 }); await mark(); await cap.answer("W"); await cap.fast(100);
  await dump("The last heart goes", "(A second fight.) Frame 0: a wrong answer is picked with one heart left.");
  await mark(); await cap.next(); await cap.fast(180);
  await dump("The player's defeat", "Frame 0: the explanation is closed with no heart left (the rule shows the results 168 frames on).");

  // ================= THE PROCTOR
  out.push("# THE PROCTOR (all chapters)", "");
  await start("all");
  await dump("The entrance", "Frame 0: the game starts.");
  for (let k = 0; k < 5; k++) {
    await ready(); await set({ hearts: 3, kind: k }); await page(() => { window.__arcade.Scenes.cur.stage.ask(); });
    await charge(1.6); await cap.fast(8); await mark(); await cap.fast(200);
    await dump("Its strike: " + KIND[k], "Frame 0: a second and a half of the bar is left.");
  }
  await ready(); await set({ hearts: 3, hp: 0.03 }); await cap.answer("R"); await cap.fast(120);
  await mark(); await cap.next(); await cap.fast(230);
  await dump("Its death", "Frame 0: the explanation of the finishing blow is closed.");

  fs.writeFileSync(path.join(cap.out, "sound-cues.md"), out.join("\n") + "\n");
  console.log("wrote sound-cues.md (" + out.length + " lines)");
};
