#!/usr/bin/env python3
"""The share of a still's lit pixels in each family of hue, to check a screen against the art bible's colour pairs
(ART_BIBLE.md: each world's two neons lead its frames). Written for Phase 2's resumption (2026-11-24): Nest Egg Run's
cyan, the Final Exam's ice blue.

    python3 arcade/tools/hues.py <still.jpg> [x0 y0 x1 y1]

Lit is a value over 0.3; a pixel counts toward a family when its saturation is over 0.35 (so a lit grey counts toward
none). The box, if given, keeps the count to the 3D (the panels' colours are the interface's). Needs Pillow and numpy.
"""
import sys
import numpy as np
from PIL import Image

im = Image.open(sys.argv[1]).convert("RGB")
if len(sys.argv) > 5:
    im = im.crop(tuple(int(v) for v in sys.argv[2:6]))
hsv = np.asarray(im.convert("HSV")).astype(float) / 255.0
h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
lit = v > 0.3
col = lit & (s > 0.35)
families = {"cyan": (165, 205), "blue": (205, 250), "violet": (250, 290), "magenta": (290, 340), "red": (340, 360),
            "orange": (12, 48), "yellow": (48, 70), "green": (70, 165)}
n = max(1, int(lit.sum()))
out = []
for name, (a, b) in families.items():
    m = col & (h >= a) & (h < b)
    if name == "red":
        m = m | (col & (h < 12))
    out.append(f"{name} {100 * m.sum() / n:.1f}%")
print(sys.argv[1].split("/")[-1], "lit px", n, "|", " ".join(out))
