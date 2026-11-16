#!/usr/bin/env node
/**
 * Pack the generated sound into what the game loads.
 *
 *   GEN_OUT=<dir> node tools/gen/audio-build.js [--music name=take ...] [--voice harry]
 *
 * Effects and announcer lines: every take is trimmed of silence, faded at both ends and levelled, then the takes of
 * a set are laid end to end in one file (a sprite) with a list of where each lies. Loops are laid with a little of
 * themselves before and after, so the loop points sit inside continuous sound. Music is cut to a whole loop with
 * its tail folded over its head. Each file starts with a click a quarter of a second in: the page finds it after
 * decoding and so knows exactly where every cue starts, whatever the decoder does with the encoder's padding.
 *
 * Writes arcade/assets/audio/<set>.mp3 and arcade/assets/audio/audio.json (sprites, cues, music), which
 * tools/manifest.js folds into the page.
 */
const fs = require("fs"), path = require("path"), os = require("os");
const { execFileSync } = require("child_process");
const ARCADE = path.join(__dirname, "..", ".."), OUT = process.env.GEN_OUT || path.join(__dirname, "out");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf("--" + k); return i < 0 ? d : args[i + 1]; };
const VOICE = opt("voice", "harry"), SR = 44100;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "audio-"));
const ff = (a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a], { stdio: ["ignore", "pipe", "pipe"] });
// raw 32-bit float mono samples of a file, after a filter chain
const pcm = (file, filters, ch = 1) => { const f = path.join(tmp, "x.f32"); ff(["-i", file, ...(filters ? ["-af", filters] : []), "-ac", String(ch), "-ar", String(SR), "-f", "f32le", f]); const b = fs.readFileSync(f); return new Float32Array(b.buffer, b.byteOffset, b.length / 4).slice(); };
const peak = (a) => { let m = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > m) m = v; } return m; };
const rms = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, a.length)); };
const TRIM = "silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.004,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01,areverse";
function fade(a, inS = 0.003, outS = 0.03) { const ni = Math.min(a.length, Math.round(inS * SR)), no = Math.min(a.length, Math.round(outS * SR)); for (let i = 0; i < ni; i++) a[i] *= i / ni; for (let i = 0; i < no; i++) a[a.length - 1 - i] *= i / no; return a; }
function level(a, to = 0.89) { const p = peak(a); if (p > 1e-4) { const k = to / p; for (let i = 0; i < a.length; i++) a[i] *= k; } return a; }

// which set each effect belongs to, and how loud it sits in the mix (1 = full)
const SETS = {
  core: { impact_good: 0.9, impact_big: 1, impact_reject: 0.8, impact_hull: 0.9, impact_shield: 0.8, impact_metal: 0.7, explosion_small: 0.85, explosion_big: 1, explosion_huge: 1, debris: 0.6, charge_up: 0.6, charge_long: 0.65, warning: 0.6, lock_on: 0.5, slowmo_in: 0.7, player_hit: 0.9, heart_lost: 0.7, shield_down: 0.75, reward: 0.7, sting_correct: 0.6, sting_wrong: 0.6, ui_click: 0.4, ui_select: 0.5, ui_back: 0.45, coin_insert: 0.7, powerup: 0.6, fanfare: 0.7, gameover: 0.7, crowd_cheer: 0.55 },
  // weapons and bosses: Risk Blaster and Boss Rush both load this
  combat: { laser_fire: 0.7, laser_heavy: 0.85, plasma_fire: 0.75, shell: 0.3, beam_fire: 0.8, missile_fire: 0.7, missile_hit: 0.8, volley_fire: 0.75, wave_fire: 0.85, slam: 1, boss_roar: 0.95, boss_hurt: 0.8, boss_stagger: 0.8, boss_break: 0.8, boss_death: 1, warp: 0.7 },
  racer: { crash: 1, crash_glass: 0.8, skid: 0.7, near_miss: 0.6, boost: 0.85, gate_pass: 0.6 },
  // Boss Rush: each boss's own roar, and what a giant machine sounds like landing, moving and powering up
  bosses: { roar_1: 0.95, roar_2: 0.95, roar_3: 0.95, roar_4: 0.95, roar_5: 0.95, roar_6: 0.95, roar_7: 0.95, roar_8: 0.95, roar_9: 0.95, roar_10: 0.95, roar_11: 0.95, roar_all: 1, boss_land: 1, boss_servo: 0.45, boss_power: 0.7 },
};
const LOOP_SET = { alarm: "core", charge_hum: "core", engine_ship: "combat", engine_car: "racer", boost_flame: "racer", hub_hum: "hub" };
const LOOP_VOL = { alarm: 0.4, charge_hum: 0.4, engine_ship: 0.35, engine_car: 0.4, boost_flame: 0.6, hub_hum: 0.5 };
// big sounds duck the music; the game's old names are heard as the new recordings
const DUCK = { explosion_huge: 0.45, explosion_big: 0.6, boss_death: 0.5, boss_roar: 0.6, impact_big: 0.7 };
const ALSO = { boom: "explosion_small", bigboom: "explosion_big", laser: "laser_fire", shot: "plasma_fire", hit: "player_hit", correct: "sting_correct", wrong: "sting_wrong", coin: "coin_insert", blip: "ui_click", select: "ui_select", back: "ui_back", shield: "impact_shield", win: "fanfare", gameover: "gameover", demonroar: "boss_roar", demonhit: "boss_hurt", demonboom: "explosion_big", demonfinale: "explosion_huge", demonshed: "boss_break", demonbreak: "boss_break", demoncharge: "charge_up", bossroar: "boss_roar", bossblast: "explosion_huge", bosssmash: "slam", bosscharge: "charge_long", shatter: "heart_lost", powerup: "powerup", warp: "warp", clunk: "impact_metal" };
const MAX_TAKES = 4;

const idx = JSON.parse(fs.readFileSync(path.join(OUT, "audio", "index.json"), "utf8"));
const outDir = path.join(ARCADE, "assets", "audio");
fs.mkdirSync(outDir, { recursive: true });
const result = { sprites: {}, music: {}, built: {} };
const GAP = Math.round(0.07 * SR), LEAD = Math.round(0.25 * SR);

function writeSprite(name, parts, cues, stereo, kbps) {
  // parts: Float32Arrays (mono, or interleaved stereo); a click a quarter of a second in, then the sounds
  const chans = stereo ? 2 : 1;
  let total = (LEAD * 2) * chans; for (const p of parts) total += p.length + GAP * chans;
  const all = new Float32Array(total);
  for (let c = 0; c < chans; c++) { all[LEAD * chans + c] = 0.9; all[(LEAD + 1) * chans + c] = -0.9; }
  let o = LEAD * 2 * chans;
  for (const p of parts) { all.set(p, o); o += p.length + GAP * chans; }
  const raw = path.join(tmp, name + ".f32"), mp3 = path.join(outDir, name + ".mp3");
  fs.writeFileSync(raw, Buffer.from(all.buffer));
  ff(["-f", "f32le", "-ar", String(SR), "-ac", String(chans), "-i", raw, "-c:a", "libmp3lame", "-b:a", kbps + "k", "-ar", String(SR), mp3]);
  result.built[name] = { file: "audio/" + name + ".mp3", bytes: fs.statSync(mp3).size, seconds: +(total / chans / SR).toFixed(2) };
  return mp3;
}

// ---- effects and loops, set by set
const allSets = [...new Set([...Object.keys(SETS), ...Object.values(LOOP_SET)])];
for (const set of allSets) {
  const parts = [], cues = {};
  let at = LEAD * 2; // samples
  const put = (cue, a, vol, duck, pre = 0) => { parts.push(a); (cues[cue] = cues[cue] || []).push([+((at + pre) / SR).toFixed(4), +((a.length - pre * 2) / SR).toFixed(4), vol, duck || 0]); at += a.length + GAP; };
  for (const [cue, vol] of Object.entries(SETS[set] || {})) {
    const takes = Object.values(idx).filter((e) => e.kind === "sfx" && e.name === cue).sort((a, b) => a.take - b.take);
    let kept = 0;
    for (const t of takes) {
      if (kept >= MAX_TAKES) break;
      let a;
      try { a = pcm(path.join(OUT, t.file), TRIM); } catch (e) { continue; }
      if (a.length < 0.1 * SR || peak(a) < 0.05) continue; // a take that came back silent or cut short
      put(cue, level(fade(a)), vol, DUCK[cue]);
      kept++;
    }
    if (!kept) console.warn("no usable take of " + cue);
  }
  for (const [cue, s] of Object.entries(LOOP_SET)) {
    if (s !== set) continue;
    const takes = Object.values(idx).filter((e) => e.kind === "loop" && e.name === cue).sort((a, b) => a.take - b.take);
    for (const t of takes) {
      let a;
      try { a = pcm(path.join(OUT, t.file), null); } catch (e) { continue; }
      if (peak(a) < 0.03) continue;
      level(a, 0.8);
      // a little of its end before it and of its start after it, so both loop points lie inside continuous sound
      const pre = Math.round(0.12 * SR), b = new Float32Array(a.length + pre * 2);
      b.set(a.subarray(a.length - pre), 0); b.set(a, pre); b.set(a.subarray(0, pre), pre + a.length);
      put(cue, b, LOOP_VOL[cue] || 0.5, 0, pre);
      break; // one take of a loop is enough
    }
  }
  if (!parts.length) continue;
  for (const [old, cue] of Object.entries(ALSO)) if (cues[cue] && !cues[old]) cues[old] = cues[cue];
  writeSprite("sfx-" + set, parts, cues, false, 112);
  result.sprites[set] = { file: "audio/sfx-" + set + ".mp3", cues };
}

// ---- the announcer: a little slap of echo and a firm compressor, like a voice over a hall's speakers
{
  const parts = [], cues = {};
  let at = LEAD * 2;
  for (const e of Object.values(idx).filter((x) => x.kind === "voice" && x.voice === VOICE).sort((a, b) => a.name.localeCompare(b.name))) {
    let a;
    try { a = pcm(path.join(OUT, e.file), TRIM + ",acompressor=threshold=-18dB:ratio=4:attack=4:release=120:makeup=4,aecho=0.8:0.5:55|110:0.22|0.1,highpass=f=90"); } catch (err) { console.warn("voice line unusable: " + e.name); continue; }
    if (a.length < 0.15 * SR) continue;
    level(fade(a, 0.003, 0.06), 0.9);
    parts.push(a);
    cues["vo:" + e.name] = [[+(at / SR).toFixed(4), +(a.length / SR).toFixed(4), 1, 0]];
    at += a.length + GAP;
  }
  if (cues["vo:boss incoming"] && !cues["vo:stand by"]) cues["vo:stand by"] = cues["vo:boss incoming"]; // (Boss Rush's STAND BY banner is called as "Boss incoming!")
  if (parts.length) { writeSprite("voice", parts, cues, false, 96); result.sprites.voice = { file: "audio/voice.mp3", cues }; }
}

// ---- music: --music name=take picks the take; cut to a whole loop, the last beats folded over the first
for (const a of args.filter((x) => /^[a-z]+=\d+$/.test(x))) {
  const [name, take] = a.split("="), e = idx[`music/${name}#${take}`];
  if (!e) { console.warn("no such music take: " + a); continue; }
  const s = pcm(path.join(OUT, e.file), "silenceremove=start_periods=1:start_threshold=-50dB", 2); // interleaved stereo
  let n = s.length / 2;
  // drop a fading tail: the loop ends where the level last stood near the track's own
  const win = Math.round(0.4 * SR), whole = rms(s);
  while (n > win * 4) { const seg = s.subarray((n - win) * 2, n * 2); if (rms(seg) > whole * 0.5) break; n -= Math.round(win / 2); }
  const X = Math.round(1.6 * SR), L = n - X, out = new Float32Array(L * 2);
  for (let i = 0; i < L; i++) for (let c = 0; c < 2; c++) {
    let v = s[i * 2 + c];
    if (i < X) { const t = i / X, a0 = Math.sin(t * Math.PI / 2), a1 = Math.cos(t * Math.PI / 2); v = v * a0 + s[(L + i) * 2 + c] * a1; } // the tail fades out under the head fading in
    out[i * 2 + c] = v;
  }
  level(out, 0.84);
  const pre = Math.round(0.2 * SR), b = new Float32Array((L + pre * 2) * 2);
  b.set(out.subarray((L - pre) * 2), 0); b.set(out, pre * 2); b.set(out.subarray(0, pre * 2), (pre + L) * 2);
  writeSprite("music-" + name, [b], {}, true, 160);
  const at = (LEAD * 2 + pre) / SR;
  result.music[name] = { file: "audio/music-" + name + ".mp3", loop: [+at.toFixed(4), +(at + L / SR).toFixed(4)], vol: 1, take: +take };
}
// music built on an earlier run stays listed
const prevFile = path.join(outDir, "audio.json");
if (fs.existsSync(prevFile)) { const prev = JSON.parse(fs.readFileSync(prevFile, "utf8")); for (const k in prev.music || {}) if (!result.music[k] && fs.existsSync(path.join(ARCADE, "assets", prev.music[k].file))) result.music[k] = prev.music[k]; for (const k in prev.built || {}) if (!result.built[k] && fs.existsSync(path.join(ARCADE, "assets", prev.built[k].file))) result.built[k] = prev.built[k]; }
fs.writeFileSync(prevFile, JSON.stringify(result, null, 1));
for (const [k, v] of Object.entries(result.built)) console.log(`${k}: ${(v.bytes / 1024).toFixed(0)} KB, ${v.seconds}s`);
console.log("cues:", Object.values(result.sprites).reduce((n, s) => n + Object.keys(s.cues).length, 0), "music:", Object.keys(result.music).join(", ") || "none");
