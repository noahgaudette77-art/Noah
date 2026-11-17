#!/usr/bin/env python3
"""Loudness of every recorded cue as the game plays it, to check the mix without ears.

    python3 arcade/tools/audio-levels.py [--all]
    python3 arcade/tools/audio-levels.py --mix [--json out.json]

For each cue in assets/audio/audio.json: the peak and the loudest 100 ms (RMS, dBFS) of each take, times the volume
the cue is played at. Prints one line per cue (the takes' spread), flags a take that sits more than 4 dB from its
cue's other takes and a cue that clips. For music: the level over the loop and the step across the loop point.
Needs ffmpeg. --all prints every take.

--mix: the three layers as the game mixes them, in EBU R128 loudness (ffmpeg's ebur128): each music track's integrated
loudness over its loop; each effect's and announcer line's loudest 400 ms (momentary maximum; a mono file is heard on
both speakers, +3 dB). Each is taken through the levels the game plays it at: the cue's own volume (audio.json), the
mix table in src/js/02-sound.js (Sound.MIX: per music track, per effects set, the announcer) and its bus (music 0.40
when calm to 0.52 at full streak, effects 0.55, announcer 0.95). Then the worst moment: the loudest blast, the loudest
announcer line and the loudest second of music landing together (with the music ducked as the game ducks it), summed
sample by sample at the limiter's input. At or under 0 dBFS there nothing can clip: the limiter's curve keeps any input
at or under full scale under full scale.
"""
import json, math, os, re, struct, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
SR = 22050

if "--mix" in sys.argv:
    SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "js", "02-sound.js")
    m = re.search(r"^\s*MIX: (\{.*\}),", open(SRC).read(), re.M)
    MIX = json.loads(m.group(1)) if m and not os.environ.get("MIX_FLAT") else {"music": {}, "sets": {}, "voice": 1}  # (MIX_FLAT=1: as built, before the mix table)
    BUS = {"music": (0.40 * 0.4, 0.52 * 0.4), "sfx": 0.55, "voice": 0.95, "master": 0.7}  # (music at the player's default level, LOW: Sound.LEVELS)
    man = json.load(open(os.path.join(ROOT, "audio", "audio.json")))
    dB = lambda g: 20 * math.log10(max(g, 1e-9))
    def ebur(path, start, dur, pad=False):
        af = ("apad=whole_dur=%.3f," % max(0.5, dur + 0.05) if pad else "") + "ebur128=framelog=info"
        err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", "%.4f" % start, "-t", "%.4f" % dur, "-i", path, "-af", af, "-f", "null", "-"], capture_output=True, text=True).stderr
        ms = [float(x) for x in re.findall(r"M:\s*(-?[\d.]+)", err)]
        it = re.findall(r"I:\s*(-?[\d.]+) LUFS", err)
        return (max(ms) if ms else -120.0), (float(it[-1]) if it else -120.0)
    chans = lambda p: int(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=channels", "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip() or 1)
    out = {"music": {}, "sets": {}, "voice": {}}
    print("music (integrated loudness over the loop, LUFS; at the mix: with the track's level, its mix gain and the music bus calm .. full streak)")
    for name, mu in man["music"].items():
        a, b = mu["loop"]
        _, I = ebur(os.path.join(ROOT, mu["file"]), a, b - a)
        g = mu.get("vol", 1) * MIX["music"].get(name, 1)
        lo, hi = I + dB(g * BUS["music"][0]), I + dB(g * BUS["music"][1])
        out["music"][name] = {"I": I, "gain": g, "mix": lo, "mix_full": hi}
        print("  %-10s I %6.1f   gain %.2f   at the mix %6.1f .. %6.1f" % (name, I, g, lo, hi))
    for name, sp in man["sprites"].items():
        path = os.path.join(ROOT, sp["file"])
        mono = 3.01 if chans(path) == 1 else 0.0
        voice = name == "voice"
        sg = MIX["voice"] if voice else MIX["sets"].get(name, 1)
        bus = BUS["voice"] if voice else BUS["sfx"]
        rows = []
        for cue, takes in sp["cues"].items():
            vals = []
            for t in takes:
                M, _ = ebur(path, t[0], t[1], pad=True)
                vals.append(M + mono + dB((t[2] if len(t) > 2 else 1) * sg * bus))
            vals.sort()
            rows.append((cue, vals[len(vals) // 2]))
        rows.sort(key=lambda r: r[1])
        med = rows[len(rows) // 2][1]
        out["voice" if voice else "sets"][name] = {"median": med, "min": rows[0][1], "max": rows[-1][1], "gain": sg, "cues": dict(rows)}
        print("%s %s: %d cues, loudest 400 ms at the mix: median %6.1f  (quietest %s %6.1f, loudest %s %6.1f), set gain %.2f" % ("announcer" if voice else "effects", name, len(rows), med, rows[0][0], rows[0][1], rows[-1][0], rows[-1][1], sg))
    # the worst moment: the loudest blast + the loudest announcer line + the loudest second of music, peaks together
    def pcm(path, start, dur):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.4f" % start, "-t", "%.4f" % dur, "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
        n = len(raw) // 2
        return [v / 32768 for v in struct.unpack("<%dh" % n, raw[: n * 2])]
    def loudest(sets, gain_of):
        best = None
        for name in sets:
            sp = man["sprites"][name]
            for cue, takes in sp["cues"].items():
                for t in takes:
                    s = pcm(os.path.join(ROOT, sp["file"]), t[0], t[1])
                    g = (t[2] if len(t) > 2 else 1) * gain_of(name)
                    pk = max(abs(v) for v in s) * g if s else 0
                    if not best or pk > best[0]:
                        best = (pk, name, cue, s, g, t[3] if len(t) > 3 else 0)
        return best
    # The limiter on the way out (Sound.init: WebAudio's DynamicsCompressor, threshold -9 dB, knee 10, ratio 8), as
    # Chromium computes its static curve, with the make-up gain it adds by itself: what comes out for a given peak in.
    TH, KN, RA = -9.0, 10.0, 8.0
    lin = lambda d: 10 ** (d / 20)
    lt = lin(TH)
    knee = lambda x, k: x if x < lt else lt + (1 - math.exp(-k * (x - lt))) / k
    def slope(x, k):
        if x < lt:
            return 1
        x2 = x * 1.001
        return (dB(knee(x2, k)) - dB(knee(x, k))) / (dB(x2) - dB(x))
    lo_k, hi_k, K = 0.1, 10000.0, 5.0
    for _ in range(15):
        if slope(lin(TH + KN), K) < 1 / RA: hi_k = K
        else: lo_k = K
        K = math.sqrt(lo_k * hi_k)
    kt = lin(TH + KN); ykt = dB(knee(kt, K))
    sat = lambda x: knee(x, K) if x < kt else lin(ykt + (dB(x) - (TH + KN)) / RA)
    makeup = (1 / sat(1.0)) ** 0.6
    limited = lambda x: sat(x) * makeup  # (a peak x in, at the limiter's input, comes out as this)
    # every screen's own set: its louder blast, the louder announcer line, its music ducked under the line; the three
    # peaks taken as landing on the same sample, in phase (the worst that can happen)
    js = open(os.path.join(os.path.dirname(SRC), "03a-files.js")).read()
    SETS = json.loads(js[js.index("{"): js.rindex("}") + 1])["sets"]
    peaks = {}
    def peak_of(kind, name):
        if (kind, name) not in peaks:
            if kind == "music":
                mu = man["music"][name]; a, b = mu["loop"]
                s = pcm(os.path.join(ROOT, mu["file"]), a, b - a)
                peaks[(kind, name)] = (max(abs(v) for v in s) * mu.get("vol", 1) * MIX["music"].get(name, 1) * BUS["music"][1], name)
            else:
                best = loudest([name], lambda n: (MIX["voice"] * BUS["voice"]) if n == "voice" else MIX["sets"].get(n, 1) * BUS["sfx"])
                peaks[(kind, name)] = (best[0], name + "/" + best[2])
        return peaks[(kind, name)]
    out["worst"] = {}
    print("worst moment on each screen (peaks in phase): at the limiter's input -> out of it")
    for scr, items in SETS.items():
        mus = [i.split(":")[1] for i in items if i.startswith("music:")]
        fxs = [i.split(":")[1] for i in items if i.startswith("sfx:") and i != "sfx:voice"]
        if not mus or not fxs:
            continue
        m = max((peak_of("music", n) for n in mus), key=lambda p: p[0])
        f = max((peak_of("sfx", n) for n in fxs), key=lambda p: p[0])
        v = peak_of("sfx", "voice") if "sfx:voice" in items else (0.0, "none")
        x = (f[0] + v[0] + m[0] * 0.4) * BUS["master"]  # (the announcer ducks the music to 0.4)
        y = limited(x)
        out["worst"][scr] = {"blast": f[1], "announcer": v[1], "music": m[1], "in": dB(x), "out": dB(y)}
        print("  %-9s %-28s + %-22s + %-9s: %5.1f dBFS -> %5.1f dBFS%s" % (scr, f[1], v[1], m[1], dB(x), dB(y), "" if y < 1 else "  <-- clips"))
    if "--json" in sys.argv:
        json.dump(out, open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=1)
    sys.exit(0)

def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    n = len(raw) // 2
    return struct.unpack("<%dh" % n, raw[: n * 2])

def db(x):
    return -120.0 if x <= 0 else 20 * math.log10(x)

def level(pcm, t0, dur):
    a, b = int(t0 * SR), min(len(pcm), int((t0 + dur) * SR))
    seg = pcm[a:b]
    if not seg:
        return -120.0, -120.0
    peak = max(abs(min(seg)), max(seg)) / 32768
    win, best = int(0.1 * SR), 0.0
    step = max(1, win // 4)
    for i in range(0, max(1, len(seg) - win + 1), step):
        w = seg[i : i + win]
        best = max(best, math.sqrt(sum(v * v for v in w) / len(w)) / 32768)
    return db(peak), db(best)

man = json.load(open(os.path.join(ROOT, "audio", "audio.json")))
show_all = "--all" in sys.argv
flags = []
for name, sp in man["sprites"].items():
    pcm = decode(os.path.join(ROOT, sp["file"]))
    print("\n== %s (%s, %.0f s)" % (name, sp["file"], len(pcm) / SR))
    for cue, takes in sp["cues"].items():
        rows = []
        for i, t in enumerate(takes):
            start, dur, vol = t[0], t[1], (t[2] if len(t) > 2 else 1)
            pk, rms = level(pcm, start, dur)
            rows.append((i, dur, vol, pk, rms, rms + db(vol)))
        eff = [r[5] for r in rows]
        med = sorted(eff)[len(eff) // 2]
        line = "%-22s takes %d  dur %.2f-%.2f s  vol %.2f  loud %6.1f dB (spread %.1f)  peak %5.1f" % (cue, len(rows), min(r[1] for r in rows), max(r[1] for r in rows), rows[0][2], med, max(eff) - min(eff), max(r[3] for r in rows))
        bad = [r for r in rows if abs(r[5] - med) > 4]
        if bad:
            line += "   <-- take(s) %s off by more than 4 dB" % ",".join(str(r[0]) for r in bad)
            flags.append((name, cue, "uneven takes"))
        if max(r[3] for r in rows) > -0.2:
            line += "   <-- at full scale"
            flags.append((name, cue, "full scale"))
        print(line)
        if show_all:
            for r in rows:
                print("      take %d  %.2f s  peak %5.1f  loud %6.1f" % (r[0], r[1], r[3], r[5]))
for name, m in man.get("music", {}).items():
    pcm = decode(os.path.join(ROOT, m["file"]))
    a, b = m.get("loop", [0, len(pcm) / SR])
    pk, rms = level(pcm, a, b - a)
    whole = math.sqrt(sum(v * v for v in pcm[int(a * SR) : int(b * SR)]) / max(1, int((b - a) * SR))) / 32768
    # the step in level across the loop point: the last 0.5 s against the first 0.5 s
    _, tail = level(pcm, b - 0.5, 0.5)
    _, head = level(pcm, a, 0.5)
    print("\n== music %s: loop %.2f-%.2f s  mean %5.1f dB  loudest 100 ms %5.1f  peak %5.1f  vol %.2f  tail/head step %.1f dB" % (name, a, b, db(whole), rms, pk, m.get("vol", 1), head - tail))
print("\n%d flag(s)" % len(flags))
for f in flags:
    print("  ", *f)
