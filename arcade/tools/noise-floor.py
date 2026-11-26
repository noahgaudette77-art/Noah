#!/usr/bin/env python3
"""Hiss finder: how much steady broadband noise (a "shhhh", like radio static) sits under a sound, without ears.

    python3 arcade/tools/noise-floor.py [files...]          every music track and every loop cue when no file is given
    python3 arcade/tools/noise-floor.py --pcm tap.f32 ...    raw 32-bit float mono PCM at 48 kHz (a live tap of the game)

For each sound, over 2048-sample frames: the quietest tenth of the frames is its floor (what is left when the music or
the sound has nothing to say). For that floor: its level (dBFS), its level above 4 kHz, and its spectral flatness
between 2 and 16 kHz (1 is white noise, a flat hiss; a tone or a chord is near 0). A sound whose floor is broadband
noise (flatness over 0.3 above 4 kHz at a level a listener hears, over -60 dBFS) is flagged as HISS. A loop is also
checked at its loop point: the step in level and the jump in the waveform where its end meets its start (a click).
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
N = 2048


def decode(path, sr=44100, start=None, dur=None):
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None: cmd += ["-ss", str(start)]
    if dur is not None: cmd += ["-t", str(dur)]
    cmd += ["-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, dtype=np.float32).copy()


def floor_stats(x, sr):
    if len(x) < N * 8: return None
    fr = np.lib.stride_tricks.sliding_window_view(x, N)[::N // 2]
    rms = np.sqrt(np.mean(fr ** 2, axis=1)) + 1e-12
    q = np.argsort(rms)[: max(4, len(rms) // 10)]  # the quietest tenth
    spec = np.abs(np.fft.rfft(fr[q] * np.hanning(N), axis=1)) ** 2 + 1e-20
    f = np.fft.rfftfreq(N, 1 / sr)
    band = (f >= 2000) & (f <= 16000)
    hf = f >= 4000
    flat = np.exp(np.mean(np.log(spec[:, band]), axis=1)) / np.mean(spec[:, band], axis=1)
    # level above 4 kHz, from the windowed spectrum (Hann window power 0.375)
    hf_rms = np.sqrt(np.sum(spec[:, hf], axis=1) * 2 / (N * N * 0.375))
    return {
        "floor_db": 20 * np.log10(np.median(rms[q])),
        "loud_db": 20 * np.log10(np.percentile(rms, 90)),
        "floor_hf_db": 20 * np.log10(np.median(hf_rms) + 1e-12),
        "flat": float(np.median(flat)),
    }


def loop_point(x, sr, a, b):
    # the seam as the game plays it: the last samples before the loop's end run straight into its first ones
    i0, i1 = int(round(a * sr)), int(round(b * sr))
    if i1 - i0 < sr * 0.2 or i1 > len(x): return None
    w = int(0.25 * sr)
    head, tail = x[i0:i0 + w], x[i1 - w:i1]
    step = 20 * np.log10((np.sqrt(np.mean(head ** 2)) + 1e-9) / (np.sqrt(np.mean(tail ** 2)) + 1e-9))
    seam = np.concatenate([x[i1 - 64:i1], x[i0:i0 + 64]])
    d = np.abs(np.diff(seam))
    # the jump at the seam against the largest step the signal itself takes either side of it: over 3 is a click
    jump = d[63]
    around = max(np.max(d[:62]), np.max(d[65:]), 1e-6)
    return {"step_db": float(step), "click": float(jump / around)}


def flag(s):
    return "HISS" if s and s["flat"] > 0.3 and s["floor_hf_db"] > -60 else ""


def main():
    args = sys.argv[1:]
    if args and args[0] == "--pcm":
        for p in args[1:]:
            x = np.fromfile(p, dtype=np.float32)
            s = floor_stats(x, int(__import__('os').environ.get('RATE', '48000')))
            if s: print(f"{os.path.basename(p):40} floor {s['floor_db']:6.1f}  above 4 kHz {s['floor_hf_db']:6.1f}  flatness {s['flat']:.2f}  loud {s['loud_db']:6.1f}  {flag(s)}")
        return
    man = json.load(open(os.path.join(ROOT, "audio", "audio.json")))
    rows = []
    if args:
        for p in args: rows.append((os.path.basename(p), decode(p), None))
    else:
        for name, m in sorted(man["music"].items()):
            x = decode(os.path.join(ROOT, m["file"]))
            rows.append(("music " + name, x, m.get("loop")))
        LOOPS = ("engine_ship", "engine_car", "alarm", "charge_hum", "boost_flame", "hub_hum")
        for set_name, sp in man["sprites"].items():
            x = None
            for cue, takes in sp["cues"].items():
                if cue not in LOOPS: continue
                if x is None: x = decode(os.path.join(ROOT, sp["file"]))
                for ti, t in enumerate(takes):
                    at, dur = t[0], t[1]  # (absolute in the file: the game adds only the decoder's own delay)
                    rows.append((f"loop {cue} #{ti + 1}", x, (at, at + dur)))
    print(f"{'sound':32} {'floor':>7} {'>4kHz':>7} {'flat':>5} {'loud':>7}  loop step / click")
    for name, x, loop in rows:
        part = x[int(loop[0] * 44100): int(loop[1] * 44100)] if loop and name.startswith("loop") else x
        s = floor_stats(part, 44100)
        if not s: print(f"{name:32} (too short)"); continue
        lp = ""
        if loop:
            # the click lies a quarter of a second in (see audio-build's writeSprite); the loop is measured from there
            r = loop_point(x, 44100, loop[0], loop[1])
            if r: lp = f"{r['step_db']:+5.1f} dB / {r['click']:.1f}" + (" CLICK" if r["click"] > 3 else "")
        print(f"{name:32} {s['floor_db']:7.1f} {s['floor_hf_db']:7.1f} {s['flat']:5.2f} {s['loud_db']:7.1f}  {lp:18} {flag(s)}")


main()
