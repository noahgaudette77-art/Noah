"""Render the ledger monogram to PNG at the sizes Add-to-Home-Screen wants.

Pure standard library: shapes are sampled analytically and written out as a
minimal PNG, so the repo needs no image dependency. Re-run after editing
static/icons/icon.svg to keep the raster icons in step:

    python3 scripts/make_icons.py
"""

import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "icons")

NAVY = (0x16, 0x20, 0x2C)
GOLD = (0xAB, 0x87, 0x48)
SAMPLES = 3  # supersampling grid per axis


def blend(base, top, alpha):
    return tuple(round(b + (t - b) * alpha) for b, t in zip(base, top))


def coverage(x, y, size, ring_r, ring_w, diamond_a):
    """Fraction of the pixel covered by the gold mark."""
    hits = 0
    step = 1.0 / SAMPLES
    center = size / 2.0
    for sy in range(SAMPLES):
        for sx in range(SAMPLES):
            px = x + (sx + 0.5) * step - center
            py = y + (sy + 0.5) * step - center
            if abs((px * px + py * py) ** 0.5 - ring_r) <= ring_w / 2.0:
                hits += 1
            elif abs(px) + abs(py) <= diamond_a:
                hits += 1
    return hits / float(SAMPLES * SAMPLES)


def render(size):
    ring_r = size * 0.300
    ring_w = max(1.0, size * 0.024)
    diamond_a = size * 0.125
    rows = []
    for y in range(size):
        row = bytearray([0])  # PNG filter type 0
        for x in range(size):
            alpha = coverage(x, y, size, ring_r, ring_w, diamond_a)
            row += bytes(NAVY if alpha == 0 else blend(NAVY, GOLD, alpha))
        rows.append(bytes(row))
    return b"".join(rows)


def chunk(tag, payload):
    return (struct.pack(">I", len(payload)) + tag + payload +
            struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF))


def write_png(path, size):
    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit truecolour
    data = zlib.compress(render(size), 9)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) +
                 chunk(b"IDAT", data) + chunk(b"IEND", b""))
    print("wrote", os.path.relpath(path), size, "x", size)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for px in (180, 192, 512):
        write_png(os.path.join(OUT_DIR, "icon-%d.png" % px), px)
