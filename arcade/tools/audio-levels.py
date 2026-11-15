#!/usr/bin/env python3
"""Loudness of every recorded cue as the game plays it, to check the mix without ears.

    python3 arcade/tools/audio-levels.py [--all]

For each cue in assets/audio/audio.json: the peak and the loudest 100 ms (RMS, dBFS) of each take, times the volume
the cue is played at. Prints one line per cue (the takes' spread), flags a take that sits more than 4 dB from its
cue's other takes and a cue that clips. For music: the level over the loop and the step across the loop point.
Needs ffmpeg. --all prints every take.
"""
import json, math, os, struct, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
SR = 22050

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
