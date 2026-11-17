#!/usr/bin/env node
/**
 * Sound round (ElevenLabs): effects, loops, announcer lines and music.
 *
 *   GEN_OUT=<dir> node tools/gen/sounds.js [sfx|loops|voice|music] [name-prefix ...]
 *
 * Every effect is generated in several takes (the game plays them in turn); raw files land in OUT/audio/raw and
 * are indexed in OUT/audio/index.json with their prompt, settings and cost. tools/gen/audio-build.js then trims,
 * levels and packs the keepers into the sprites the game loads.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.js");

const STYLE = " Retro 1980s arcade game sound effect, clean, punchy, no music, no voice.";
// name: [seconds, takes, prompt]
const SFX = {
  coin_soft: [1.2, 3, "A soft, warm arcade coin dropping into a coin slot: a gentle muted metallic clink, then a quiet, warm rising two-note chime. Pleasant and calm, no harsh high frequencies, no noise."],
  // the player's weapons
  laser_fire: [0.7, 6, "A starfighter laser cannon shot: a tight bright 'pew' zap with a punchy low thump under it and a very short sizzling tail. Analog synth."],
  laser_heavy: [1.2, 4, "A heavy plasma cannon blast: a deep charged thump, then a bright searing energy bolt and a short reverberant tail. Powerful."],
  plasma_fire: [0.8, 6, "A plasma bolt fired: a fat rising 'thwoom' zap with an electric crackle. Short and punchy. Analog synth."],
  shell: [0.5, 4, "A tiny spent energy cell ejecting from a gun: a small metallic tick and a faint electric fizz. Very short, quiet, dry."],
  // hits
  impact_good: [0.8, 6, "A bright sci-fi energy impact on armour: a crisp crack, a sparkling burst of sparks and a satisfying punchy thump. Rewarding."],
  impact_big: [1.3, 4, "A massive critical energy impact: a huge cracking hit with glittering sparks and a deep sub-bass punch. Triumphant."],
  impact_reject: [0.6, 5, "A dull dud impact: a low dead thud with a short fizzle, like a shot bouncing off harmlessly. Dark, muted, dry."],
  impact_hull: [0.9, 5, "A metal spaceship hull struck hard: a heavy metallic clang, rattling debris and an electrical zap. Harsh."],
  impact_shield: [0.9, 4, "An energy shield absorbing a hit: an electric crackling buzz with a resonant glassy wobble that fades."],
  impact_metal: [0.5, 4, "A solid metal clank: an armour plate hit by a heavy object. Short and dry."],
  // blasts
  explosion_small: [1.2, 6, "A compact punchy explosion: a sharp crack and a short fiery boom with crackle. Tight."],
  explosion_big: [2.2, 4, "A big cinematic explosion: a deep booming blast, roaring fire and falling debris, a rumbling tail."],
  explosion_huge: [3.6, 3, "A colossal final explosion: an enormous sub-bass detonation, a tearing roar of fire, a shockwave, raining metal debris and a long rumbling tail. Epic."],
  debris: [1.5, 4, "Metal debris and shards clattering and scattering across a hard floor after an explosion."],
  // telegraphs
  charge_up: [0.7, 4, "A fast energy charge-up: an electric whine sweeping up in pitch to a tense peak, cut off at the top. Analog synth."],
  charge_long: [1.6, 4, "A menacing weapon charging: a deep hum rising slowly into a screaming electric whine, building tension, cut off at the peak."],
  warning: [0.6, 3, "A harsh warning signal: two quick urgent synth alarm tones."],
  lock_on: [0.5, 3, "A targeting lock-on confirmation: a rapid rising triple beep, electronic and crisp."],
  slowmo_in: [1.1, 3, "A time-slowing effect: a deep whoosh dropping in pitch into a low sub-bass throb. Cinematic."],
  // enemy attacks
  beam_fire: [1.6, 4, "A sustained energy beam firing: a harsh electric roar with a sizzling high whine that holds and then cuts off. Menacing."],
  missile_fire: [1.0, 4, "A homing missile launching: a sharp whoosh with a rising rocket hiss. Short."],
  missile_hit: [1.0, 4, "A small missile striking: a sharp bang with a metallic crack and a brief sizzle."],
  volley_fire: [1.0, 4, "A rapid volley of four energy projectiles fired in quick succession: four punchy synth zaps with an electric edge."],
  wave_fire: [1.5, 4, "A massive energy shockwave released: a deep bass whoomp expanding outward with a sweeping whoosh and an electric shimmer."],
  slam: [1.3, 4, "A giant metal fist slamming the ground: a colossal low impact boom with cracking stone and a rumbling shockwave. Heavy."],
  // the bosses
  boss_roar: [2.2, 6, "A giant robotic demon roaring: a deep monstrous growling scream with metallic distortion. Terrifying and powerful."],
  boss_hurt: [0.9, 5, "A huge robot monster grunting in pain: a short distorted metallic growl with a servo whine."],
  boss_stagger: [1.4, 4, "A giant machine staggering: groaning stressed metal, failing servos whirring down and a heavy stumbling thud."],
  boss_break: [1.0, 5, "Armour plating shattering off a robot: a sharp metallic crack, breaking plates and a burst of electrical short-circuit."],
  boss_death: [3.2, 3, "A giant robotic monster dying: a long distorted descending roar breaking up into glitches, its power failing into a deep dying drone."],
  // each boss's own voice (Boss Rush): what is heard when it lands, rages and wins
  roar_1: [2.4, 3, "A slick robot salesman: a smug synthetic chuckle that drops into a distorted metallic growl, servos whirring, one bright cash-register ding at the end."],
  roar_2: [2.4, 3, "A huge horned beast-machine roaring: a furious deep bellow with a furnace blast behind it and grinding metal."],
  roar_3: [2.4, 3, "A hollow ghostly wail echoing out of an empty steel vault: cold wind, a long eerie descending moan with metallic resonance."],
  roar_4: [2.4, 3, "A scribe machine shrieking: rapid chittering and scratching of steel pen nibs, rustling paper, rising to a shrill insect-like metallic screech."],
  roar_5: [2.4, 3, "A giant golem of steel cabinets groaning: a deep rumbling bellow with heavy metal drawers slamming shut one after another."],
  roar_6: [2.4, 3, "A boiler about to burst: pressure building fast into a screaming steam-whistle roar with hissing valves and rattling pipes."],
  roar_7: [2.4, 3, "An undead machine laughing: a dry rattling laugh of bones, then a deep hollow moan with sand hissing through glass."],
  roar_8: [2.4, 3, "A judge machine passing sentence: one thunderous gavel strike echoing in a great hall, then a stern deep metallic bellow."],
  roar_9: [2.4, 3, "A puppeteer machine: a few sweet music-box notes that warp and detune into a sly metallic cackle, strings creaking taut."],
  roar_10: [2.4, 3, "A toll booth war machine: a loud two-tone warning klaxon, a diesel engine revving hard and tank tracks clanking."],
  roar_11: [2.4, 3, "A two-voiced phantom roaring: a dry bony rasp and a deep metallic growl in unison, with a long blade scraping on stone."],
  roar_all: [2.8, 3, "The final boss, a colossal examiner machine, roaring: an enormous distorted bellow with a school bell clanging and a red-alert buzzer under it."],
  boss_land: [1.5, 4, "A giant robot dropping from a height onto a metal arena floor: a massive impact boom, rattling armour plates, a servo whine as it stands."],
  boss_servo: [0.7, 4, "A big robot limb moving: a short heavy hydraulic servo whirr with a metallic clack at the end."],
  boss_power: [1.8, 3, "A giant machine powering up: a rising electric hum, relays clacking on in sequence, ending in a bright energised surge."],
  // the player
  player_hit: [0.9, 4, "The player taking damage: a harsh distorted impact with a descending synth buzz and an electrical crackle."],
  heart_lost: [0.8, 3, "Losing a life: a short sad descending synth arpeggio ending in a glassy shatter."],
  shield_down: [1.0, 3, "A spaceship energy shield collapsing: a powering-down electric whine and a glassy crackle fading out."],
  // the road
  crash: [1.2, 5, "A heavy car crash: a crunching metal impact with a tyre screech cut short and a thud. Violent and punchy."],
  crash_glass: [0.9, 4, "Glass shattering, the pieces tinkling and scattering on asphalt after a car impact."],
  skid: [1.2, 4, "Car tyres skidding and screeching on wet asphalt. Short."],
  near_miss: [0.7, 4, "A fast vehicle whooshing past very close: a doppler whoosh with a brief engine roar."],
  boost: [1.5, 4, "A turbo boost kicking in: an explosive ignition whoomp, then a roaring jet-like surge of acceleration. Exciting."],
  gate_pass: [0.8, 4, "Passing through an energy gate at speed: a bright shimmering whoosh with a rising chime."],
  // rewards and the interface
  reward: [1.2, 4, "A shower of coins and sparkles: bright jackpot chimes and coin clinks. Joyful and short."],
  sting_correct: [0.8, 4, "A bright triumphant correct-answer jingle: a quick rising synth arpeggio with sparkle."],
  sting_wrong: [0.7, 4, "A wrong-answer buzzer: a low dissonant descending two-note synth blat."],
  ui_click: [0.5, 4, "A crisp menu blip: one short high synth tick."],
  ui_select: [0.5, 3, "A menu confirm: two quick rising synth notes."],
  ui_back: [0.5, 3, "A menu cancel: two quick falling synth notes."],
  coin_insert: [1.0, 3, "A coin dropping into an arcade machine slot: a metallic clunk and a bright credit chime."],
  powerup: [1.0, 3, "An arcade cabinet powering up: a rising synth sweep ending in a sparkle."],
  warp: [1.8, 3, "A starship jumping to warp speed: a rising whine into a thunderous whoosh."],
  crowd_cheer: [2.0, 4, "A large arena crowd cheering and roaring for a moment, then settling."],
  fanfare: [2.0, 3, "A short victory fanfare on bright 1980s synth brass: four triumphant rising notes and a held chord."],
  gameover: [2.2, 3, "A game-over jingle on 1980s synth: a slow sad descending melody of four notes ending low."],
};
// loops: [seconds, takes, prompt]
const LOOPS = {
  alarm: [2.0, 3, "A low-health alarm: a steady urgent pulsing two-tone synth siren. Seamless loop."],
  charge_hum: [3.0, 3, "A sustained ominous energy hum with a faint electric crackle, steady. Seamless loop."],
  engine_ship: [4.0, 3, "A starfighter engine: a steady deep thrumming plasma hum with a soft high whine. Seamless loop."],
  engine_car: [4.0, 3, "A powerful supercharged V8 muscle-car engine held at fast steady revs: a deep rumbling growl. Seamless loop."],
  boost_flame: [3.0, 3, "The roaring exhaust flames of a rocket-boosted engine: a steady intense jet roar with crackle. Seamless loop."],
  hub_hum: [8.0, 3, "The ambience of a busy retro video arcade hall: distant game sounds and electronic beeps, a soft crowd murmur, cabinet fans. Seamless loop."],
};
// the announcer. key: what the game asks for (lower case, punctuation as spaces); value: what is said
const VOICE = {
  "wave 1": "Wave one!", "wave 2": "Wave two!", "wave 3": "Wave three!", "wave 4": "Wave four!", "wave 5": "Wave five!", "wave 6": "Wave six!", "wave 7": "Wave seven!", "wave 8": "Wave eight!", "wave 9": "Wave nine!", "wave 10": "Wave ten!",
  "game over": "Game over!", "stage clear": "Stage clear!", "boss incoming": "Boss incoming!", "stand by": "Boss incoming!",
  "product pusher": "Product Pusher!", "perilmonger": "Perilmonger!", "solvency specter": "Solvency Specter!", "the fine print": "The Fine Print!", "group golem": "Group Golem!", "inflation titan": "Inflation Titan!",
  "longevity lich": "Longevity Lich!", "lord intestate": "Lord Intestate!", "undue influencer": "Undue Influencer!", "probate tollgate": "Probate Tollgate!", "patrimony phantom": "Patrimony Phantom!", "the proctor": "The Proctor!",
  "risk blaster": "Risk Blaster!", "nest egg run": "Nest Egg Run!", "boss rush": "Boss Rush!", "memory bank": "Memory Bank.", "final exam": "Final Exam!", "strategy guide": "Strategy Guide.",
  "welcome": "Welcome to the arcade!", "select your game": "Select your game!", "ready": "Ready?", "go": "Go!", "chapter complete": "Chapter complete!",
  "enraged": "Enraged!", "boss defeated": "Boss defeated!", "defeated": "Defeated.", "final boss": "Final boss!", "begin": "Begin!",
  "exam passed": "Exam passed!", "not yet": "Not yet.", "final boss destroyed": "Final boss, destroyed!", "rank up": "Rank up!",
  "compounding": "Compounding!", "bull run": "Bull run!", "blue chip": "Blue chip!", "trophy unlocked": "Trophy unlocked!", "announcer on": "Announcer on.",
  "age 25 go": "Age twenty-five. Go!", "millionaire": "Millionaire!", "$100 000": "One hundred thousand dollars!", "$250 000": "A quarter of a million!", "$500 000": "Half a million!", "$1 500 000": "One and a half million!",
  "retired a millionaire": "Retired, a millionaire!", "happy retirement": "Happy retirement!", "forced retirement": "Forced retirement.",
  "warning": "Warning!", "shield down": "Shield down!", "last shield": "Last shield!", "critical": "Critical!", "quick draw": "Quick draw!", "lightning": "Lightning!", "perfect": "Perfect!", "new high score": "New high score!", "final wave": "Final wave!", "insert coin": "Insert coin!", "deck cleared": "Deck cleared!", "passed": "Passed!",
};
const VOICES = { harry: "SOYHLrjzK2X1ezoPC6cr", adam: "pNInz6obpgDQGcFmaJgB", charlie: "IKne3meq5aSn9XLyUdCD", brian: "nPczCjzI2devNBz1zQrb" };
// one looping synthwave track per mode: [milliseconds, prompt]
const MUSIC = {
  // (2026-11-17) the title's containment hall: calm, atmospheric, under the soft light of the pods
  hall: [96000, "Instrumental dark ambient synth soundscape for the title screen of a retro arcade game: a vast quiet containment vault where defeated robot bosses sleep in glowing stasis pods. 66 BPM, D minor. Slow evolving warm analog pads, a soft deep drone, sparse gentle glassy bell notes that echo, a distant soft pulse like a heartbeat, no drums. Calm and mysterious but warm and inviting. Two sections: a sparse opening, then a slightly fuller second half where a soft, slow melody drifts in. Soft, warm mix that stays easy on the ears, no harsh or piercing high frequencies, no sudden loud hits, no hiss, no noise, no vinyl crackle."],
  // (2026-11-17: the owner found the first tracks annoying over a study session. Calmer, more varied second versions:
  // slower, softer timbres, two contrasting sections each, longer loops, so the same bars come round less often)
  title2: [96000, "Instrumental warm, nostalgic dreamwave title theme for a retro arcade, 92 BPM, A minor. Soft analog pads, a gentle lead melody on a mellow polysynth, a smooth rounded bassline, a soft brushed drum machine, light shimmering arpeggios. Two contrasting sections: a quiet, sparse A section and a fuller B section with new chords, then back. Relaxed and inviting, a neon city at dusk. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  hub2: [96000, "Instrumental relaxed chillwave lounge music for a retro arcade hall, 84 BPM, D dorian. Warm electric piano, a soft round bass, a gentle lo-fi drum machine, airy pads, occasional soft vibraphone-like synth phrases. An A section and a B section with different chords. Easygoing background music. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  blaster2: [96000, "Instrumental spacey synthwave for a calm space shooter, 100 BPM, A minor. A steady soft pulse bass, glassy arpeggios drifting in and out, warm wide pads, light electronic drums with soft kicks, a restrained melody that changes between two sections. A sense of floating through a nebula: focused, not frantic. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  racer2: [96000, "Instrumental laid-back dreamwave for a sunset highway drive, 104 BPM, E minor moving to G major. A smooth rolling bassline, soft chord stabs, gentle lead phrases that vary, a light drum machine with soft claps, wide pads. Two sections, the second brighter. Cruising and optimistic. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  exam2: [96000, "Instrumental calm, focused minimal synth music for taking an exam in a moonlit hall, 76 BPM, C minor. A soft steady pulse, sparse piano-like synth notes, slow-moving pads, very light ticking percussion, no melody that demands attention, slowly evolving over two sections. Quiet concentration, never tense or frantic. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  memory2: [96000, "Instrumental mellow lo-fi synthwave for studying flashcards, 80 BPM, F major. Warm electric piano chords, a soft round bass, a gentle dusty drum machine with rim clicks, glassy bell arpeggios that come and go, a soft melody only in the second section. Calm, warm and unobtrusive. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  boss2: [96000, "Instrumental dark but restrained synthwave for a boss duel, 108 BPM, E minor. A low pulsing analog bass, measured drums (never relentless double-time), ominous pads, sparse brass-like stabs, a slow building tension in two sections with a breathing space between them. Serious and dramatic without being harsh or exhausting. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  finalboss2: [96000, "Instrumental epic but measured dark synthwave final boss theme, 112 BPM, D minor. Deep pads, a steady pulsing bass, cinematic choir-like synths, a heroic melody that rises in the second section, restrained drums. Grand and dramatic, never abrasive. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  calm2: [96000, "Instrumental ambient synth music for reading study notes in a quiet library, 70 BPM, C major. Very soft warm pads, slow gentle arpeggios, a quiet round bass, almost no percussion, lots of space, a subtle melody that drifts in only in the second half. Peaceful and focused. Soft, warm mix that stays easy on the ears for long study sessions: no harsh or piercing high frequencies, no sudden loud hits, no lead that repeats insistently. Built as a seamless loop: the ending leads straight back into the beginning."],
  title: [64000, "Instrumental 1980s synthwave title theme for an arcade game, 100 BPM, A minor. Warm analog pads, a slow nostalgic lead melody on a bright polysynth, pulsing bass, gated reverb drums, shimmering arpeggios. Cinematic and inviting, neon city at dusk. Built as a seamless loop: the ending leads straight back into the beginning."],
  hub: [64000, "Instrumental laid-back 1980s synthwave for an arcade hall, 92 BPM, D minor. Mellow electric piano chords, a soft funky analog bass, light drum machine groove, gentle arpeggios, no big lead. Relaxed background music. Built as a seamless loop: the ending leads straight back into the beginning."],
  blaster: [64000, "Instrumental high-energy 1980s synthwave for a space shooter, 128 BPM, A minor. Driving sixteenth-note analog bass, fast arpeggios, punchy gated drums, heroic soaring lead synth, risers. Urgent and thrilling. Built as a seamless loop: the ending leads straight back into the beginning."],
  racer: [64000, "Instrumental outrun synthwave for a night highway racing game, 118 BPM, E minor. Rolling analog bassline, bright chord stabs, a catchy lead melody, steady four-on-the-floor drums with claps, wide pads. Forward motion and optimism. Built as a seamless loop: the ending leads straight back into the beginning."],
  exam: [64000, "Instrumental tense, solemn synthwave for a final examination in a moonlit hall, 96 BPM, C minor. A slow pulsing analog bass, a ticking clock-like arpeggio, cold choir-like pads, sparse deep drums, a restrained ominous lead melody. Focused and serious, never frantic. Built as a seamless loop: the ending leads straight back into the beginning."],
  memory: [64000, "Instrumental mellow synthwave for flipping study flashcards inside a gold bank vault, 84 BPM, F major. Warm electric piano chords, a soft round analog bass, a gentle drum machine with rim clicks, glassy bell arpeggios, no big lead. Calm, warm and steady. Built as a seamless loop: the ending leads straight back into the beginning."],
  finalboss: [64000, "Instrumental epic dark synthwave final boss theme, 150 BPM, D minor. Pounding double-time drums, a huge distorted bass riff, ominous choir-like synth pads, a soaring heroic-tragic lead, tension that never lets go. Colossal and desperate. Built as a seamless loop: the ending leads straight back into the beginning."],
  boss: [64000, "Instrumental dark aggressive 1980s synthwave for a boss fight, 140 BPM, E minor. Menacing distorted bass ostinato, heavy pounding drums, ominous brass-like synth stabs, tense arpeggios, no relief. Threatening and relentless. Built as a seamless loop: the ending leads straight back into the beginning."],
  calm: [64000, "Instrumental calm ambient synthwave for studying, 80 BPM, C major. Soft warm pads, slow gentle arpeggios, a quiet round bass, very light percussion, lots of space. Peaceful and focused. Built as a seamless loop: the ending leads straight back into the beginning."],
};

(async () => {
  const dir = path.join(L.OUT, "audio", "raw");
  fs.mkdirSync(dir, { recursive: true });
  const idxFile = path.join(L.OUT, "audio", "index.json");
  const load = () => (fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, "utf8")) : {});
  const save = (k, v) => { const i = load(); i[k] = v; fs.writeFileSync(idxFile, JSON.stringify(i, null, 1)); };
  const [what, ...only] = process.argv.slice(2);
  const want = (k) => !only.length || only.some((p) => k.startsWith(p));
  const jobs = [];
  if (!what || what === "sfx") for (const [name, [secs, takes, prompt]] of Object.entries(SFX)) for (let t = 0; t < takes; t++) {
    const key = `sfx/${name}#${t}`;
    if (!want(name) || load()[key]) continue;
    jobs.push(async () => { const f = path.join(dir, `${name}-${t}.mp3`); const r = await L.elevenSfx(prompt + STYLE, f, { duration: secs, influence: 0.45, name: key }); save(key, { kind: "sfx", name, take: t, file: path.relative(L.OUT, f), prompt: prompt + STYLE, seconds: secs, cost: r.cost }); });
  }
  if (!what || what === "loops") for (const [name, [secs, takes, prompt]] of Object.entries(LOOPS)) for (let t = 0; t < takes; t++) {
    const key = `loop/${name}#${t}`;
    if (!want(name) || load()[key]) continue;
    jobs.push(async () => { const f = path.join(dir, `loop-${name}-${t}.mp3`); const r = await L.elevenSfx(prompt + " No music, no voice.", f, { duration: secs, influence: 0.45, loop: true, name: key }); save(key, { kind: "loop", name, take: t, file: path.relative(L.OUT, f), prompt, seconds: secs, cost: r.cost }); });
  }
  if (!what || what === "voice") for (const [key0, text] of Object.entries(VOICE)) for (const [vn, vid] of Object.entries(VOICES)) {
    const key = `voice/${vn}/${key0}`;
    if (!want(key0) || load()[key]) continue;
    if (process.env.VOICE_ONLY && process.env.VOICE_ONLY !== vn) continue;
    jobs.push(async () => { const f = path.join(dir, `vo-${vn}-${key0.replace(/[^a-z0-9]+/g, "_")}.mp3`); const r = await L.elevenTts(vid, "[shouting, excited arcade announcer] " + text, f, { model: "eleven_v3", name: key }); save(key, { kind: "voice", name: key0, voice: vn, voice_id: vid, text, file: path.relative(L.OUT, f), cost: r.cost }); });
  }
  if (what === "music") for (const [name, [ms, prompt]] of Object.entries(MUSIC)) for (let t = 0; t < (+process.env.MUSIC_TAKES || 1); t++) {
    const key = `music/${name}#${t}`;
    if (!want(name) || load()[key]) continue;
    jobs.push(async () => { const f = path.join(dir, `music-${name}-${t}.mp3`); const r = await L.elevenMusic(prompt, ms, f, { model: "music_v2_5", name: key }); save(key, { kind: "music", name, take: t, file: path.relative(L.OUT, f), prompt, ms, cost: r.cost }); });
  }
  L.log(jobs.length, "to generate");
  const res = await L.pool(jobs, what === "music" ? 2 : 4);
  L.log("sounds:", res.filter((r) => r.ok).length, "ok,", res.filter((r) => !r.ok).length, "failed;", JSON.stringify(await L.elevenUsage()));
})().catch((e) => { console.error("FAILED", L.scrub(e.message)); process.exit(1); });
