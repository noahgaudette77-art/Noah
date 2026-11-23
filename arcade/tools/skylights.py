#!/usr/bin/env python3
"""
The title hall's skylights, sharp (the owner, 2026-11-23: "fix stretched or low-resolution textures (the ceiling panels
and anything that looks soft)"). Each world's skylight showed 30% x 22% of its window picture (a 1024 x 512 copy of
the world's panorama): about 300 x 110 pixels stretched over a 8.6 x 9.2 m pane, three to ten times their size on a
screen. This crops the part a skylight can show (its span, the shift of its parallax, a margin) from the world's own
4096 x 2048 panorama, at 1024 x 512: about three times the detail, for 2.8 MB more on the graphics chip a world.

    python3 tools/skylights.py

Writes assets/ui/top-<world>.webp. The crop is the one 10d-titlehall.js reads back (topRect): keep the two the same.
"""
import os
from PIL import Image

ARCADE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
# each world: its panorama and its skylight's place in it [u, v] (HALL_WORLDS in 10d-titlehall.js: id, sky)
WORLDS = [
    ("blaster", "blaster-deep-1", 0.15, 0.65),
    ("racer", "racer-sunset", 0.80, 0.66),
    ("boss", "boss-storm", 0.66, 0.66),
    # (memory and guide: their panoramas are interiors, a vault and an archive, and a crop of them read as a smear
    # overhead: their skylights are night skies in each world's pair, made apart (the master overhaul, 2026-11-23:
    # Seedream 5.5, ASSETS.md); left out here so a run does not put the interiors back)
    ("exam", "exam-moon", 0.72, 0.64),
]


def rect(u, v):
    """[u0, v0, du, dv] in the panorama's texture space (v up): the span (0.3 x 0.22) and the parallax (0.031, 0.035)
    each way, a margin, and the vertical clamp of a skylight (0.3 to 0.84)."""
    u0, du = u - 0.19, 0.38
    v0, v1 = max(0.3, v - 0.155), min(0.84, v + 0.155)
    return u0, v0, du, v1 - v0


for wid, sky, u, v in WORLDS:
    src = Image.open(os.path.join(ARCADE, "assets", "sky", sky + ".webp")).convert("RGB")
    W, H = src.size
    u0, v0, du, dv = rect(u, v)
    # (the panorama wraps round: turned so the crop's left edge is at its own left)
    x0 = int(round((u0 % 1.0) * W))
    turned = Image.new("RGB", (W, H))
    turned.paste(src.crop((x0, 0, W, H)), (0, 0))
    if x0:
        turned.paste(src.crop((0, 0, x0, H)), (W - x0, 0))
    top, bottom = (1.0 - (v0 + dv)) * H, (1.0 - v0) * H  # (image rows run down; v runs up)
    crop = turned.crop((0, int(round(top)), int(round(du * W)), int(round(bottom))))
    out = crop.resize((1024, 512), Image.LANCZOS)
    path = os.path.join(ARCADE, "assets", "ui", "top-" + wid + ".webp")
    out.save(path, "WEBP", quality=88, method=6)
    print("%s: %s %dx%d of %dx%d -> 1024x512, %d KB, rect %s" % (wid, sky, crop.size[0], crop.size[1], W, H, os.path.getsize(path) // 1024, [round(x, 4) for x in (u0, v0, du, dv)]))
