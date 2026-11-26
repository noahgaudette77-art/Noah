#!/usr/bin/env python3
"""The look of each screen as numbers, for the cohesion pass: from the stills that tools/scenarios/cohesion-look.js
makes, the 3D picture of each screen (its crop, below) is measured for its black level (the 2nd percentile of
luminance), its middle (median), its brightest (98th percentile), how much of it is near white (clipped), and its
colour (mean saturation of the pixels that are not near black). The UI's own plates are left out where the crop can.

    python3 arcade/tools/look-stats.py <folder of stills> [<another folder> ...]
"""
import sys, os
import numpy as np
from PIL import Image

# the 3D picture of each still, as (x, y, w, h) in a 780 x 1688 still (dpr 2 on a 390 x 844 screen)
CROPS = {
    "01-blaster": (0, 300, 780, 470), "02-racer": (0, 380, 780, 420), "03-boss": (0, 360, 780, 470),
    "04-title": (0, 330, 780, 560), "05-hub": (0, 260, 780, 640), "08-memory": (60, 100, 660, 440),
    "09-exam": (40, 420, 700, 700), "10-guide": (30, 110, 720, 480),
}

def stats(path, box):
    im = Image.open(path).convert("RGB")
    if box:
        x, y, w, h = box
        im = im.crop((x, y, x + w, y + h))
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0)
    lit = lum > 0.06
    return {
        "black": float(np.percentile(lum, 2)), "median": float(np.median(lum)), "bright": float(np.percentile(lum, 98)),
        "clip%": float((mx > 0.97).mean() * 100), "sat": float(sat[lit].mean()) if lit.any() else 0.0,
    }

for folder in sys.argv[1:]:
    print(folder)
    print("  %-11s %6s %6s %6s %6s %6s" % ("screen", "black", "median", "bright", "clip%", "sat"))
    for name in sorted(CROPS):
        p = os.path.join(folder, name + ".jpg")
        if not os.path.exists(p):
            continue
        s = stats(p, CROPS[name])
        print("  %-11s %6.3f %6.3f %6.3f %6.2f %6.3f" % (name, s["black"], s["median"], s["bright"], s["clip%"], s["sat"]))
