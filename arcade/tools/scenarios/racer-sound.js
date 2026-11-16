// Nest Egg Run's sound, checked without ears: every call the game makes to Sound (an effect, a loop, the announcer,
// the music) is logged with the frame it was made on, beside what the stage shows on that frame, through the same
// moments the strips of racer-run.js show. Written as sound-cues.md in the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/racer-sound.js --out arcade/docs/combat-pass/racer --dpr 1
//
// Nothing is drawn (every frame is stepped on the virtual clock, 60 to the second). The scenario sets state in the
// page to reach a moment quickly, as racer-run.js does: test only.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const page = (fn, arg) => cap.eval(fn, arg);
  const STAGE = process.env.STAGE || "2";
  // ---- before the game is built: a frame counter, and every Sound call noted with its frame
  await page(() => {
    const A = window.__arcade, S = A.Sound, log = (window.__log = []);
    window.__f = 0;
    const count = () => { window.__f++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    const heard = (text) => log.push([window.__f, "heard", text]);
    const wrap = (k, say) => { const f = S[k].bind(S); S[k] = (...a) => { const t = say(...a); if (t) heard(t); return f(...a); }; };
    wrap("sfx", (name, pan, o) => "`" + name + "`" + (o && o.delay ? " (sounds " + Math.round(o.delay * 60) + " frames on)" : ""));
    wrap("say", (text) => "announcer: \"" + text + "\"");
    wrap("loop", (id, name) => (S.loops[id] || !S.bank[name] ? "" : "loop starts: `" + name + "`"));
    wrap("stopLoop", (id) => (S.loops[id] ? "loop stops: `" + S.loops[id].name + "`" : ""));
    wrap("hush", () => "whatever is still ringing is faded out");
    wrap("setIntensity", (n) => (Math.round(n) !== Math.round(S.intensity) ? "music intensity " + Math.round(n) : ""));
    wrap("play", (name) => (S.trackName === name ? "" : "music starts: `" + name + "`"));
    wrap("stopMusic", () => (S._now || S.timer ? "music stops" : ""));
    const seen = (text) => log.push([window.__f, "seen", text]);
    const banner = A.UI.banner.bind(A.UI);
    A.UI.banner = (text, ...r) => { seen("banner: \"" + text + "\""); return banner(text, ...r); };
    const reward = A.HudFX.reward.bind(A.HudFX);
    A.HudFX.reward = (root, from, to, o) => { seen((o && o.kind === "spark" ? "sparks of light" : o && o.kind === "coin" ? "coins" : "stars") + " leave for " + (to === "[data-ins]" ? "the policies in the HUD" : "the nest egg")); return reward(root, from, to, o); };
    const lost = A.HudFX.lifeLost.bind(A.HudFX);
    A.HudFX.lifeLost = (root) => { seen("the life that went breaks in the HUD; the HUD flickers and cracks"); return lost(root); };
  });
  // ---- a run is built: what the stage and the rig show, noted with its frame
  const hook = () => page(() => {
    const A = window.__arcade, s = A.Scenes.cur, st = s.stage, rig = s.rigKit, log = window.__log, seen = (text) => log.push([window.__f, "seen", text]);
    const SHOW = {
      boost: () => "the rig floors it: both stacks light (a flash at each mouth), it squats, the lens falls back, light on the road",
      right: () => "a right gate: the lane's light bursts over the nose in its colour (white heart, sparks, two thin rings, a ring and a pool on the road), the egg swells, hit-stop",
      crash: (picked) => (picked >= 0 ? "a wrong lane: the red pane breaks over the nose (glass thrown back, red sparks, the reject cross and dark smoke)" : "no lane: it runs onto the bollard (metal, sparks, the reject cross)") + "; the band's edge flashes red, the lens lurches, hit-stop",
      insured: () => "the policy pays: a shell of mint light round the rig takes the pane, an airbag of light swells in front of it, two mint rings, hit-stop",
      policy: () => "a policy is issued: a soft swell of the shell",
      policyGone: () => "the policy that paid breaks out of the HUD in mint shards",
      nearMiss: () => "a near miss: streaks of air on that side, the rig rocks away, the lens leans away",
      setLow: (on) => (on === 1 ? "the last life: the red frame starts to swell with the alarm, the left stack burns" : on === 2 ? "no life left: the red frame holds, it burns harder" : st.low ? "the red frame goes" : ""),
      over: (full) => (full ? "retirement at 65 begins: gold rings off the egg, fireworks" : "forced retirement begins: the road slows under it"),
      pause: () => "the game is paused", resume: () => "the game goes on",
    };
    for (const k in SHOW) { const f = st[k].bind(st); st[k] = (...a) => { const t = SHOW[k](...a); if (t) seen(t); return f(...a); }; }
    const RIG = {
      launch: () => "the rig drives in from behind the lens, stacks burning", surge: () => "the rig surges ahead on both stacks",
      knock: () => "the rig is knocked: its tail steps out into a half-spin on locked wheels (tyre smoke, skid marks)", shimmy: () => "the rig is jolted and shimmies",
      cheer: () => "the rig turns on the spot with both stacks alight, then drives away toward the egg on the horizon", wreck: () => "the rig slews to a stop",
      throwWheel: () => "a front wheel is thrown clear, spinning, sparks trailing from it; a stack falls",
    };
    for (const k in RIG) { const f = rig[k].bind(rig); rig[k] = (...a) => { const t = RIG[k](...a); if (t) seen(t); return f(...a); }; }
    const boom = st.kit.explosion.bind(st.kit);
    st.kit.explosion = (p, o) => { seen("a layered blast (hot core, lobes of fire, streaks, smoke, light on the road)"); return boom(p, o); };
    const arrive = s.arrive.bind(s);
    s.arrive = () => { seen("THE GATE IS REACHED (the rule)"); return arrive(); };
    const fb = s.quiz.feedback.bind(s.quiz);
    s.quiz.feedback = (o) => { seen("the explanation sheet comes up (the rule: 0.45 s of the game's clock after the gate)"); return fb(o); };
    const next = s.nextQuestion.bind(s);
    s.nextQuestion = () => { seen("the next question comes up"); return next(); };
    const res = s.gameOver.bind(s);
    s.gameOver = (full) => { seen("THE RUN ENDS (the rule: the results come up 1.9 s on)"); return res(full); };
    if (s.world) s.world.director.t = 1e9; // (nothing happens on the road that the scenario did not ask for)
  });
  // ---- one moment: what was logged since `from`, as a table (frames counted from the row that starts with `zero`)
  const out = ["# Nest Egg Run: which sound is called on which frame", "",
    "Taken from the running game by `arcade/tools/scenarios/racer-sound.js`: every call to `Sound.sfx`, `Sound.loop`, `Sound.stopLoop`, `Sound.say`, `Sound.play`, `Sound.stopMusic`, `Sound.setIntensity` and `Sound.hush` is noted with the frame it was made on, beside what the stage shows on that frame. Frames are 1/60 s; each table counts from the moment named in its heading (frame 0). A cue marked \"sounds N frames on\" was given a delay and is heard N frames after its row. The loops that follow the game every frame (`Sound.loopSet`: the engine's note with the road's speed, the flame's level) are not listed. A sound and its picture are fired from the same place in the code, so they share a row. The announcer speaks with each banner (`UI.banner` calls `Sound.say`).", ""];
  const mark = () => page(() => { window.__f0 = window.__f; window.__log.length = 0; });
  const dump = async (title, note, zero) => {
    const r = await page((z) => { const S = window.__arcade.Sound, log = window.__log.splice(0); let f0 = window.__f0; if (z) { const hit = log.find((x) => x[2].startsWith(z)); if (hit) f0 = hit[0]; } return { f0, log, loops: Object.keys(S.loops).map((id) => S.loops[id].name) }; }, zero || "");
    const rows = new Map();
    for (const [f, kind, text] of r.log) { const k = f - r.f0; if (!rows.has(k)) rows.set(k, { seen: [], heard: [] }); const row = rows.get(k)[kind]; if (!row.includes(text)) row.push(text); }
    out.push("## " + title, "");
    if (note) out.push(note, "");
    out.push("| frame | seen | heard |", "|---:|---|---|");
    [...rows.keys()].sort((a, b) => a - b).forEach((k) => { const v = rows.get(k); out.push("| " + (k > 0 ? "+" + k : k) + " | " + v.seen.join("; ") + " | " + v.heard.join(" · ") + " |"); });
    out.push("", "Loops running at the end of it: " + (r.loops.length ? r.loops.map((n) => "`" + n + "`").join(", ") : "none") + ".", "");
  };
  const ready = async (wait = 30) => { await cap.next(); await cap.ask(1500); await cap.fast(wait); await page(() => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, 0.3); }); };
  const set = (o) => page((v) => { const s = window.__arcade.Scenes.cur; Object.assign(s, v); s.hud(); if (s.stage) s.stage.setLow(s.crashes >= 3 ? 2 : s.crashes === 2 ? 1 : 0); }, o);
  const GATE = "THE GATE IS REACHED";

  // the start: frame 0 is the frame the music is asked for (the game's start)
  await cap.go("racer", STAGE);
  await hook();
  await page(() => { const l = window.__log, i = l.findIndex((x) => x[2].startsWith("music starts")); window.__f0 = i >= 0 ? l[i][0] : 0; l.push([window.__f0, "seen", "the game starts: the rig drives in from behind the lens, stacks burning, and brakes onto its mark"]); });
  await cap.ask(1500); await cap.fast(30);
  await dump("The start", "Frame 0: the game starts. The first question comes up 1.3 s on, as it always did.");

  await mark(); await cap.answer("R"); await cap.fast(75);
  await dump("A lane is taken, and the boost", "Frame 0: a lane is picked. With no second tap the rig floors it by itself a second later (the rule), and reaches the gate 0.7 s after that.");
  await cap.fast(60);
  await dump("A right gate", "Frame 0: the gate is reached in the right lane.", GATE);

  await ready(); await set({ crashes: 0, insurance: 0 });
  await mark(); await cap.answer("W"); await cap.fast(200);
  await dump("A wrong lane: the crash", "Frame 0: the gate is reached in a wrong lane. The game's own hit-stop slows its clock for 120 ms here, so the explanation sheet (0.45 s of the game's clock) comes up about 32 frames on: the blow has been seen and heard by then.", GATE);

  await ready(); await set({ crashes: 0, insurance: 0 });
  await mark(); await page(() => { const s = window.__arcade.Scenes.cur; s.gp = 0.97; }); await cap.fast(120);
  await dump("No lane chosen: the bollard", "Frame 0: the gate is reached with no lane taken.", GATE);

  await ready(); await set({ crashes: 0, insurance: 1 });
  await mark(); await cap.answer("W"); await cap.fast(200);
  await dump("An insured crash: the policy pays", "Frame 0: the gate is reached in a wrong lane with a policy in hand.", GATE);

  await ready(); await set({ crashes: 0, insurance: 0 }); await page(() => { window.__arcade.Scenes.cur.run.streak = 4; });
  await mark(); await cap.answer("R"); await cap.fast(200);
  await dump("A fifth right answer in a row: a policy is issued", "Frame 0: the gate is reached. The policy's own picture and sound follow 0.3 s on, clear of the gate's burst.", GATE);

  await ready(); await page(() => { const s = window.__arcade.Scenes.cur; s.egg = 99000; s.hud(); });
  await mark(); await cap.answer("R"); await cap.fast(200);
  await dump("A milestone: $100,000", "Frame 0: the gate is reached. The banner and the announcer come 0.4 s on (the rule).", GATE);

  await ready(); await cap.answer(1); await page(() => { window.__arcade.Scenes.cur.lockT = 9; }); await cap.fast(40);
  await mark(); await page(() => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, 0.25); s.world.director.force("near-miss"); }); await cap.fast(90);
  await dump("A near miss", "Frame 0: something sets off from behind the lens in the next lane. It passes the rig about 35 frames on.");
  await page(() => { window.__arcade.Scenes.cur.lockT = 0.01; }); await cap.fast(150);

  await ready(); await set({ crashes: 1, insurance: 0 });
  await mark(); await cap.answer("W"); await cap.fast(220);
  await dump("The second crash: the last life", "Frame 0: the gate is reached. The alarm is a loop of two tones (2.25 s); the red frame round the band swells once with each tone (every 67.5 frames), timed from the frame the loop starts.", GATE);

  await mark(); await page(() => { window.__arcade.Scenes.cur.pause(); }); await cap.fast(30);
  await dump("A pause, with the alarm sounding", "Frame 0: the game is paused. The menu's own blip is the only thing left to sound.");
  await mark(); await page(() => { const A = window.__arcade; A.UI.closeModal(); A.Scenes.cur.resume(); }); await cap.fast(30);
  await dump("The pause ends", "Frame 0: the game goes on.");

  await ready();
  await mark(); await cap.answer("W"); await cap.fast(220);
  await dump("The third crash", "Frame 0: the gate is reached with one life left.", GATE);
  await mark(); await cap.next(); await cap.fast(125);
  await dump("Forced retirement", "Frame 0: the explanation is closed with no life left. The results come up 114 frames on (1.9 s, the rule): the skid, the blast, the second blast and the jingle are all inside it, and every loop has stopped before it.", "THE RUN ENDS");

  // retirement at 65: a new run, taken to its last gate
  await cap.go("racer", STAGE);
  await hook();
  await cap.ask(1500); await cap.fast(30);
  await page(() => { const s = window.__arcade.Scenes.cur; s.year = 39; s.skyP = 39 / 40; s.egg = 1180000; s.peak = 1180000; s.nextMilestone = 9; s.hud(); });
  await cap.fast(260); await page(() => { const s = window.__arcade.Scenes.cur; s.gp = Math.min(s.gp, 0.3); });
  await cap.answer("R"); await cap.fast(200);
  await mark(); await cap.next(); await cap.fast(125);
  await dump("Retirement at 65", "Frame 0: the explanation of the career's last question is closed. The results come up 114 frames on (1.9 s, the rule).", "THE RUN ENDS");

  fs.writeFileSync(path.join(cap.out, "sound-cues.md"), out.join("\n") + "\n");
  console.log("wrote sound-cues.md (" + out.length + " lines)");
};
