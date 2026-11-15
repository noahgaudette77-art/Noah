// Risk Blaster's sound, checked without ears: every call the game makes to Sound (an effect, a loop, the announcer,
// the music) is logged with the frame it was made on, beside what the stage shows on that frame, through the same
// moments the combat strips show. Written as sound-cues.md in the --out folder.
//
//   node arcade/tools/capture.js arcade/tools/scenarios/blaster-sound.js --out arcade/docs/combat-pass/blaster --dpr 1
//
// Nothing is drawn (every frame is stepped on the virtual clock, 60 to the second). The scenario sets state in the
// page to reach a moment quickly, as blaster-combat.js does: test only.
const fs = require("fs"), path = require("path");
module.exports = async (cap) => {
  const page = (fn, arg) => cap.eval(fn, arg);
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
    wrap("loop", (id, name) => (S.loops[id] ? "" : "loop starts: `" + name + "`"));
    wrap("stopLoop", (id) => (S.loops[id] ? "loop stops: `" + S.loops[id].name + "`" : ""));
    wrap("hush", () => "whatever is still ringing is faded out");
    wrap("setIntensity", (n) => (Math.round(n) !== Math.round(S.intensity) ? "music intensity " + Math.round(n) : ""));
    wrap("play", (name) => (S.trackName === name ? "" : "music starts: `" + name + "`"));
    wrap("stopMusic", () => (S._now || S.timer ? "music stops" : ""));
  });
  await cap.go("blaster", process.env.STAGE || "3");
  // ---- the game is built: what the stage shows, noted with its frame
  await page(() => {
    const A = window.__arcade, s = A.Scenes.cur, st = s.stage, log = window.__log, seen = (text) => log.push([window.__f, "seen", text]);
    const SHOW = {
      fire: () => "the fighter turns toward the answer's drone", volley: () => "a volley leaves both cannons (bolts, muzzle flashes, recoil)", boltLands: () => "a pair of bolts lands on the drone",
      right: () => "the drone bursts and the lance goes through it into the demon's core", demonHit: () => "the blow lands on its core (flash, sparks, ring, hit-stop)",
      wrong: () => "the shot is rejected: the drone locks out", timeout: () => "time is up", demonAttack: (e, att) => "the demon starts to wind up (" + ["plasma volley", "claw swipe", "roared wave", "swept beam", "seekers"][att.kind] + "): its glow gathers, the marker appears on the fighter",
      strikeLands: () => "the strike reaches the fighter", playerHit: () => "the shield is seen to go (flash, colour split, shake, the HUD cracks)",
      setLow: (on) => (on === true || on === 1 ? "one shield left: the red frame and the engine fire start" : on === 2 ? "no shield left: the red frame holds" : s.stage.low ? "low health ends" : ""),
      demonWound: () => "a wound opens in its armour", demonShed: (e, p, name) => "its " + (name === "tail" ? "tail" : "wing") + " is shot away (the blast shows 5 frames on)", demonRoar: () => "it throws its wings wide and roars",
      demonRage: () => "its rage begins", demonDeath: () => "the wave is closed: the fighter's last burst leaves its cannons", demonChain: () => "a part of it comes away in a blast", demonBlast: () => "the last blast",
      over: () => "the fighter blows up", pause: () => "the game is paused", resume: () => "the game goes on",
    };
    for (const k in SHOW) { const f = st[k].bind(st); st[k] = (...a) => { const t = SHOW[k](...a); if (t) seen(t); return f(...a); }; }
    const reward = A.HudFX.reward.bind(A.HudFX);
    A.HudFX.reward = (root, from, to, o) => { seen((o && o.kind === "spark" ? "sparks" : o && o.kind === "coin" ? "coins" : "stars") + " leave for the score"); return reward(root, from, to, o); };
    const arrive = s.enemy.arrive.bind(s.enemy);
    s.enemy.arrive = () => { const was = s.enemy.alive; const r = arrive(); if (!was && s.enemy.alive) seen("the next demon starts to fly in"); return r; };
    // what has no call of its own: the strike let go, the warp (looked for as the stage's own frame ends)
    let released = null, warp = 0;
    const update = st.update.bind(st);
    st.update = (...a) => {
      const r = update(...a), k = st.atk;
      if (k && k.released && released !== k) { released = k; seen("it lets the strike go (the markers close, a beat of slow motion)"); }
      if (s.warp > 0 && !(warp > 0)) seen("the warp starts");
      warp = s.warp;
      return r;
    };
  });
  // ---- one moment: what was logged since `from`, as a table (frames counted from the moment's start)
  const out = ["# Risk Blaster: which sound is called on which frame", "",
    "Taken from the running game by `arcade/tools/scenarios/blaster-sound.js`: every call to `Sound.sfx`, `Sound.loop`, `Sound.stopLoop`, `Sound.say`, `Sound.play`, `Sound.stopMusic`, `Sound.setIntensity` and `Sound.hush` is noted with the frame it was made on, beside what the stage shows on that frame. Frames are 1/60 s; each table counts from the moment named in its heading (frame 0). A cue marked \"sounds N frames on\" was given a delay and is heard N frames after its row. The loops that follow the game every frame (`Sound.loopSet`: the engine's note, the charge's rise) are not listed. A sound and its picture are fired from the same place in the code, so they share a row.", ""];
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
  const ready = async (wait = 30) => { await cap.next(); await cap.ask(1500); await cap.fast(wait); };
  const set = (fn, arg) => page(fn, arg);

  // the start: frame 0 is the frame the music is asked for (the game's start)
  await page(() => { const l = window.__log, i = l.findIndex((x) => x[2].startsWith("music starts")); window.__f0 = i >= 0 ? l[i][0] : 0; });
  await cap.ask(1500); await cap.fast(150);
  await page(() => { window.__log.unshift([window.__f0, "seen", "the game starts: the fighter is launched and the demon begins its fly-in"]); });
  await dump("The start: both entrances", "Frame 0: the game starts.");

  await mark(); await cap.answer("R"); await cap.fast(70);
  await dump("Firing, and a right hit", "Frame 0: the answer is picked. The rule checks it 13 frames on (0.22 s), as it always did.");

  await ready(); await set(() => { window.__arcade.Scenes.cur.enemy.atkN = 0; });
  await mark(); await cap.answer("W"); await cap.fast(120);
  await dump("A wrong hit, the plasma volley, taking damage", "Frame 0: the answer is picked. The demon starts to wind up on the same frame; the shield is seen to go when its strike lands.");

  const NAMES = ["", "The claw swipe", "The roared wave", "The swept beam", "The seekers"];
  for (let k = 1; k < 5; k++) {
    await ready(); await set((n) => { const s = window.__arcade.Scenes.cur; s.shields = 3; s.hud(); s.stage.setLow(0); s.enemy.atkN = n; }, k);
    await mark(); await cap.answer("W"); await cap.fast(120);
    await dump(NAMES[k] + " (telegraph, release, landing)", "Frame 0: a wrong answer is picked.");
  }

  await ready(); await set(() => { const s = window.__arcade.Scenes.cur; s.shields = 2; s.hud(); s.stage.setLow(0); s.enemy.atkN = 0; });
  await mark(); await cap.answer("W"); await cap.fast(160);
  await dump("Low health: the second shield goes", "Frame 0: a wrong answer is picked with two shields left. The alarm is a loop of two tones (2.25 s); the red frame round the band swells once with each tone (every 67.5 frames), timed from the frame the loop starts.");

  await mark(); await set(() => { window.__arcade.Scenes.cur.pause(); }); await cap.fast(30);
  await dump("A pause, with the alarm sounding", "Frame 0: the game is paused. The menu's own blip is the only thing left to sound.");
  await mark(); await set(() => { const A = window.__arcade; A.UI.closeModal(); A.Scenes.cur.resume(); }); await cap.fast(30);
  await dump("The pause ends", "Frame 0: the game goes on.");

  await ready(); await set(() => { const s = window.__arcade.Scenes.cur; s.shields = 3; s.hud(); s.stage.setLow(0); s.inWave = 0; });
  for (let i = 0; i < 3; i++) { await cap.answer("R"); await cap.fast(60); await ready(10); await set(() => { window.__arcade.Scenes.cur.inWave = 0; }); }
  await mark(); await cap.answer("R"); await cap.fast(80);
  await dump("Armour breakage: the wave's fourth hit shoots its tail away", "Frame 0: the answer is picked.");

  await ready(); await set(() => { window.__arcade.Scenes.cur.inWave = 9; });
  await cap.answer("R"); await cap.until(() => !!window.__arcade.Scenes.cur.quiz.sheet, 200); await cap.fast(30);
  await mark(); await cap.next(); await cap.fast(330);
  await dump("The demon's death, the warp, the next demon", "Frame 0: the explanation of the wave's last question is closed (the rule closes the wave here; the next question comes up 90 frames on, as it always did). In a first run the wave that passes the best score is the demon's last stand, which this is: its last blast comes 12 frames later than in other waves.");

  await cap.ask(1500); await cap.fast(60);
  await set(() => { const s = window.__arcade.Scenes.cur; s.shields = 1; s.hud(); s.stage.setLow(1); });
  await cap.fast(20);
  await mark(); await set(() => { const s = window.__arcade.Scenes.cur; s.tLeft = 0.75; }); await cap.fast(150);
  await dump("Time runs out on the last shield", "Frame 0: 45 frames of the clock are left. The demon starts to wind up when 30 are left, and lets go as the clock runs out.");
  await mark(); await cap.next(); await cap.fast(150);
  await dump("Game over", "Frame 0: the explanation is closed with no shield left.");

  fs.writeFileSync(path.join(cap.out, "sound-cues.md"), out.join("\n") + "\n");
  console.log("wrote sound-cues.md (" + out.length + " lines)");
};
