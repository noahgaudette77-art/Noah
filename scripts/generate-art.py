#!/usr/bin/env python3
"""
Generates the storefront's imagery as self-contained SVG files.

Every garment is drawn as a flat fashion illustration on a grained, vignetted
ground so the shop reads like a printed lookbook rather than a stock-photo grid.
No external assets, no network requests, no binary blobs in git.

    python3 scripts/generate-art.py
"""

import os
import math
import random

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "assets", "img")

W, H = 800, 1000

# Muted, sun-faded palettes. (ground, garment, shade, accent)
PALETTES = {
    "oxblood":  ("#EFE6DA", "#6B2737", "#54202C", "#B08D57"),
    "camel":    ("#F1EADD", "#B08D57", "#8E6F42", "#3F3A33"),
    "sage":     ("#EBE7DA", "#6F7B63", "#57614D", "#C9B896"),
    "ink":      ("#E9E4D9", "#2B2A2E", "#1C1B1F", "#B08D57"),
    "cream":    ("#E7E0D2", "#DCCFB6", "#C3B394", "#6B2737"),
    "denim":    ("#E8E5DB", "#4A5A6A", "#374654", "#C9B896"),
    "rust":     ("#F0E7D9", "#9C5A33", "#7C4526", "#3F3A33"),
    "plum":     ("#EAE3D9", "#4C3A4E", "#3A2B3C", "#C9B896"),
}


def defs(pid, pal, grain=0.62):
    ground, body, shade, accent = pal
    return f'''  <defs>
    <linearGradient id="g{pid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{ground}"/>
      <stop offset="100%" stop-color="{mix(ground, "#000000", 0.10)}"/>
    </linearGradient>
    <linearGradient id="b{pid}" x1="0.15" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="{mix(body, "#ffffff", 0.10)}"/>
      <stop offset="55%" stop-color="{body}"/>
      <stop offset="100%" stop-color="{shade}"/>
    </linearGradient>
    <radialGradient id="v{pid}" cx="0.5" cy="0.42" r="0.78">
      <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#2B2118" stop-opacity="0.30"/>
    </radialGradient>
    <filter id="n{pid}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" seed="{pid}" result="t"/>
      <feColorMatrix in="t" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="{grain}"/></feComponentTransfer>
    </filter>
    <filter id="s{pid}" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="10" dy="18" stdDeviation="18" flood-color="#3B2E22" flood-opacity="0.22"/>
    </filter>
  </defs>'''


def mix(a, b, t):
    a = a.lstrip("#"); b = b.lstrip("#")
    out = "#"
    for i in (0, 2, 4):
        ca, cb = int(a[i:i + 2], 16), int(b[i:i + 2], 16)
        out += "%02x" % round(ca + (cb - ca) * t)
    return out


def frame(pid, pal, inner, ratio=(W, H)):
    w, h = ratio
    ground, body, shade, accent = pal
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">
{defs(pid, pal)}
  <rect width="{w}" height="{h}" fill="url(#g{pid})"/>
  <rect x="26" y="26" width="{w - 52}" height="{h - 52}" fill="none" stroke="{mix(ground, shade, 0.22)}" stroke-width="1"/>
{inner}
  <rect width="{w}" height="{h}" fill="url(#v{pid})"/>
  <rect width="{w}" height="{h}" filter="url(#n{pid})" opacity="0.14" style="mix-blend-mode:multiply"/>
</svg>
'''


def seam(d, pal, o=0.35, wd=2):
    return f'  <path d="{d}" fill="none" stroke="{pal[2]}" stroke-width="{wd}" stroke-opacity="{o}" stroke-linecap="round"/>'


def stitch(d, pal, o=0.45):
    return (f'  <path d="{d}" fill="none" stroke="{pal[0]}" stroke-width="1.6" stroke-opacity="{o}" '
            f'stroke-dasharray="6 7" stroke-linecap="round"/>')


def buttons(pid, pal, xs, ys, r=7):
    out = []
    for x in xs:
        for y in ys:
            out.append(f'  <circle cx="{x}" cy="{y}" r="{r}" fill="{pal[3]}" fill-opacity="0.9"/>')
            out.append(f'  <circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{pal[2]}" stroke-opacity="0.4"/>')
    return "\n".join(out)


# ----------------------------------------------------------------------------
# Garment silhouettes. Each returns SVG markup drawn inside the 800x1000 frame.
# ----------------------------------------------------------------------------

def g_coat(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M258,236 C258,206 292,178 344,166 L400,214 L456,166 C508,178 542,206 542,236
           L576,846 C520,864 460,872 400,872 C340,872 280,864 224,846 Z" fill="url(#b{pid})"/>
  <path d="M258,240 L184,520 C182,540 196,556 218,558 L246,560 L282,272 Z" fill="url(#b{pid})"/>
  <path d="M542,240 L616,520 C618,540 604,556 582,558 L554,560 L518,272 Z" fill="url(#b{pid})"/>
  <path d="M344,166 L400,214 L400,470 L318,268 Z" fill="{pal[2]}" fill-opacity="0.55"/>
  <path d="M456,166 L400,214 L400,470 L482,268 Z" fill="{pal[2]}" fill-opacity="0.35"/>
  <path d="M400,214 L400,872" stroke="{pal[2]}" stroke-opacity="0.35" stroke-width="2" fill="none"/>
  <rect x="226" y="556" width="348" height="34" rx="4" fill="{pal[2]}" fill-opacity="0.85"/>
  <rect x="380" y="548" width="60" height="50" rx="5" fill="{pal[3]}" fill-opacity="0.92"/>'''
    p += "\n" + buttons(pid, pal, [346, 454], [300, 380, 460])
    p += "\n" + stitch("M232,830 C300,850 500,850 568,830", pal)
    p += "\n" + seam("M184,520 C210,528 236,530 262,528", pal)
    p += "\n" + seam("M616,520 C590,528 564,530 538,528", pal)
    p += "\n</g>"
    return p


def g_dress(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M312,196 L400,166 L488,196 L512,286 C514,300 502,310 488,306 L478,470
           C520,620 546,760 556,880 C500,898 452,906 400,906 C348,906 300,898 244,880
           C254,760 280,620 322,470 L312,306 C298,310 286,300 288,286 Z" fill="url(#b{pid})"/>
  <path d="M400,166 L400,906" stroke="{pal[2]}" stroke-opacity="0.22" stroke-width="2" fill="none"/>
  <path d="M340,182 C366,214 434,214 460,182 L448,196 C428,224 372,224 352,196 Z" fill="{pal[2]}" fill-opacity="0.5"/>
  <rect x="318" y="452" width="164" height="26" rx="6" fill="{pal[2]}" fill-opacity="0.75"/>'''
    for i in range(7):
        x = 268 + i * 44
        p += f'\n  <path d="M{x},486 C{x - 6},640 {x - 12},780 {x - 16},884" stroke="{pal[2]}" stroke-opacity="0.18" stroke-width="3" fill="none"/>'
    p += "\n" + stitch("M250,868 C320,890 480,890 550,868", pal)
    p += "\n</g>"
    return p


def g_blazer(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M266,244 C266,214 300,190 350,178 L400,224 L450,178 C500,190 534,214 534,244
           L560,724 C506,740 452,748 400,748 C348,748 294,740 240,724 Z" fill="url(#b{pid})"/>
  <path d="M266,248 L200,516 C198,536 212,550 234,552 L260,554 L292,278 Z" fill="url(#b{pid})"/>
  <path d="M534,248 L600,516 C602,536 588,550 566,552 L540,554 L508,278 Z" fill="url(#b{pid})"/>
  <path d="M350,178 L400,224 L392,520 L306,296 Z" fill="{pal[2]}" fill-opacity="0.5"/>
  <path d="M450,178 L400,224 L408,520 L494,296 Z" fill="{pal[2]}" fill-opacity="0.32"/>
  <rect x="272" y="560" width="88" height="12" rx="4" fill="{pal[2]}" fill-opacity="0.6"/>
  <rect x="440" y="560" width="88" height="12" rx="4" fill="{pal[2]}" fill-opacity="0.6"/>'''
    p += "\n" + buttons(pid, pal, [418], [520, 574], 8)
    p += "\n" + stitch("M248,712 C320,730 480,730 552,712", pal)
    p += "\n</g>"
    return p


def g_blouse(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M290,240 C290,214 322,192 366,182 L400,214 L434,182 C478,192 510,214 510,240
           L536,700 C490,714 446,720 400,720 C354,720 310,714 264,700 Z" fill="url(#b{pid})"/>
  <path d="M290,244 L226,470 C222,492 238,508 260,508 L292,506 L316,272 Z" fill="url(#b{pid})"/>
  <path d="M510,244 L574,470 C578,492 562,508 540,508 L508,506 L484,272 Z" fill="url(#b{pid})"/>
  <path d="M366,182 L400,214 L358,268 L336,206 Z" fill="{pal[2]}" fill-opacity="0.45"/>
  <path d="M434,182 L400,214 L442,268 L464,206 Z" fill="{pal[2]}" fill-opacity="0.3"/>
  <rect x="222" y="492" width="52" height="26" rx="10" fill="{pal[2]}" fill-opacity="0.6"/>
  <rect x="526" y="492" width="52" height="26" rx="10" fill="{pal[2]}" fill-opacity="0.6"/>'''
    p += "\n" + buttons(pid, pal, [400], [300, 372, 444, 516, 588], 6)
    p += "\n" + seam("M400,268 L400,700", pal, 0.28)
    for i in range(5):
        x = 320 + i * 40
        p += "\n" + seam(f"M{x},300 C{x + 4},420 {x + 2},560 {x},690", pal, 0.12)
    p += "\n</g>"
    return p


def g_knit(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M272,250 C272,220 314,196 400,196 C486,196 528,220 528,250
           L528,704 L272,704 Z" fill="url(#b{pid})"/>
  <path d="M272,254 L200,486 C194,510 210,528 234,528 L268,526 L296,286 Z" fill="url(#b{pid})"/>
  <path d="M528,254 L600,486 C606,510 590,528 566,528 L532,526 L504,286 Z" fill="url(#b{pid})"/>
  <path d="M340,196 C352,232 448,232 460,196 L460,214 C446,252 354,252 340,214 Z" fill="{pal[2]}" fill-opacity="0.55"/>
  <rect x="272" y="700" width="256" height="46" rx="6" fill="{pal[2]}" fill-opacity="0.72"/>'''
    for i in range(13):
        x = 284 + i * 19
        p += f'\n  <path d="M{x},262 L{x},700" stroke="{pal[2]}" stroke-opacity="0.14" stroke-width="4" fill="none"/>'
    for i in range(6):
        y = 708 + i * 7
        p += f'\n  <path d="M276,{y} L524,{y}" stroke="{pal[0]}" stroke-opacity="0.18" stroke-width="2" fill="none"/>'
    p += "\n</g>"
    return p


def g_trousers(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M286,236 L514,236 L520,300 L400,300 L280,300 Z" fill="url(#b{pid})"/>
  <path d="M282,300 L396,300 L392,880 L268,880 C258,700 264,470 282,300 Z" fill="url(#b{pid})"/>
  <path d="M518,300 L404,300 L408,880 L532,880 C542,700 536,470 518,300 Z" fill="url(#b{pid})"/>
  <rect x="284" y="228" width="232" height="40" rx="5" fill="{pal[2]}" fill-opacity="0.8"/>
  <path d="M400,300 L400,470" stroke="{pal[2]}" stroke-opacity="0.4" stroke-width="3" fill="none"/>
  <path d="M330,310 C324,520 322,700 326,872" stroke="{pal[0]}" stroke-opacity="0.22" stroke-width="3" fill="none"/>
  <path d="M470,310 C476,520 478,700 474,872" stroke="{pal[0]}" stroke-opacity="0.22" stroke-width="3" fill="none"/>'''
    p += "\n" + buttons(pid, pal, [400], [248], 7)
    p += "\n" + stitch("M270,862 L392,862", pal)
    p += "\n" + stitch("M408,862 L530,862", pal)
    p += "\n</g>"
    return p


def g_skirt(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M300,300 L500,300 C548,520 572,700 584,832 C500,856 400,864 400,864
           C400,864 300,856 216,832 C228,700 252,520 300,300 Z" fill="url(#b{pid})"/>
  <rect x="298" y="266" width="204" height="46" rx="5" fill="{pal[2]}" fill-opacity="0.8"/>'''
    for i in range(9):
        x0 = 312 + i * 22
        x1 = 236 + i * 41
        p += f'\n  <path d="M{x0},312 C{x0 - 4},520 {x1 - 6},700 {x1},840" stroke="{pal[2]}" stroke-opacity="0.2" stroke-width="4" fill="none"/>'
    p += "\n" + buttons(pid, pal, [470], [289], 7)
    p += "\n" + stitch("M224,824 C310,850 490,850 576,824", pal)
    p += "\n</g>"
    return p


def g_jacket(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M262,246 C262,216 298,190 348,180 L400,220 L452,180 C502,190 538,216 538,246
           L554,624 C500,640 450,646 400,646 C350,646 300,640 246,624 Z" fill="url(#b{pid})"/>
  <path d="M262,250 L196,504 C192,526 208,542 230,542 L258,540 L288,282 Z" fill="url(#b{pid})"/>
  <path d="M538,250 L604,504 C608,526 592,542 570,542 L542,540 L512,282 Z" fill="url(#b{pid})"/>
  <path d="M348,180 L400,220 L300,300 L286,232 Z" fill="{pal[2]}" fill-opacity="0.55"/>
  <path d="M452,180 L400,220 L500,300 L514,232 Z" fill="{pal[2]}" fill-opacity="0.35"/>
  <path d="M400,220 C420,340 428,480 430,632" stroke="{pal[3]}" stroke-opacity="0.85" stroke-width="6" fill="none" stroke-dasharray="3 6"/>
  <rect x="248" y="614" width="304" height="34" rx="5" fill="{pal[2]}" fill-opacity="0.85"/>
  <rect x="382" y="606" width="52" height="46" rx="4" fill="{pal[3]}" fill-opacity="0.9"/>
  <path d="M296,440 L358,470" stroke="{pal[3]}" stroke-opacity="0.7" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M504,440 L468,462" stroke="{pal[3]}" stroke-opacity="0.7" stroke-width="5" stroke-linecap="round" fill="none"/>'''
    p += "\n</g>"
    return p


def g_bag(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <path d="M300,330 C300,250 340,206 400,206 C460,206 500,250 500,330"
        fill="none" stroke="{pal[1]}" stroke-width="22" stroke-linecap="round"/>
  <rect x="222" y="322" width="356" height="330" rx="26" fill="url(#b{pid})"/>
  <path d="M222,398 L578,398" stroke="{pal[2]}" stroke-opacity="0.3" stroke-width="3" fill="none"/>
  <rect x="360" y="360" width="80" height="70" rx="8" fill="{pal[3]}" fill-opacity="0.92"/>
  <circle cx="400" cy="398" r="13" fill="{pal[2]}" fill-opacity="0.75"/>'''
    p += "\n" + stitch("M240,340 L240,634", pal, 0.5)
    p += "\n" + stitch("M560,340 L560,634", pal, 0.5)
    p += "\n" + stitch("M244,640 L556,640", pal, 0.5)
    p += "\n</g>"
    return p


def g_boots(pid, pal):
    def boot(x):
        return f'''
  <path d="M{x - 62},268 L{x + 62},268 L{x + 58},600 L{x + 118},640
           C{x + 140},650 {x + 140},700 {x + 112},702 L{x - 78},702
           C{x - 96},702 {x - 100},684 {x - 96},664 L{x - 58},600 Z" fill="url(#b{pid})"/>
  <path d="M{x - 96},664 L{x + 122},664" stroke="{pal[2]}" stroke-opacity="0.55" stroke-width="10" fill="none"/>
  <path d="M{x - 62},300 L{x + 62},300" stroke="{pal[2]}" stroke-opacity="0.35" stroke-width="4" fill="none"/>'''
    p = f'<g filter="url(#s{pid})">' + boot(268) + boot(516)
    for i in range(6):
        y = 340 + i * 42
        p += f'\n  <path d="M212,{y} L324,{y}" stroke="{pal[3]}" stroke-opacity="0.55" stroke-width="4" fill="none"/>'
        p += f'\n  <path d="M460,{y} L572,{y}" stroke="{pal[3]}" stroke-opacity="0.55" stroke-width="4" fill="none"/>'
    p += "\n</g>"
    return p


def g_hat(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'''
  <ellipse cx="400" cy="600" rx="290" ry="86" fill="url(#b{pid})"/>
  <ellipse cx="400" cy="586" rx="290" ry="86" fill="{mix(pal[1], "#ffffff", 0.06)}"/>
  <path d="M262,566 C262,360 300,266 400,266 C500,266 538,360 538,566
           C500,596 300,596 262,566 Z" fill="url(#b{pid})"/>
  <path d="M400,266 C356,300 344,380 348,430 C372,412 428,412 452,430 C456,380 444,300 400,266 Z"
        fill="{pal[2]}" fill-opacity="0.4"/>
  <rect x="258" y="486" width="284" height="52" fill="{pal[3]}" fill-opacity="0.9"/>
  <path d="M258,486 L542,486 M258,538 L542,538" stroke="{pal[2]}" stroke-opacity="0.4" stroke-width="3" fill="none"/>
  <path d="M520,486 L560,462 L556,538 L520,538 Z" fill="{pal[3]}" fill-opacity="0.8"/>'''
    p += "\n" + stitch("M170,608 C280,652 520,652 630,608", pal, 0.4)
    p += "\n</g>"
    return p


def g_scarf(pid, pal):
    p = f'<g filter="url(#s{pid})">'
    p += f'  <g transform="rotate(-12 400 500)">'
    p += f'\n    <rect x="180" y="280" width="440" height="440" rx="6" fill="url(#b{pid})"/>'
    p += f'\n    <rect x="212" y="312" width="376" height="376" fill="none" stroke="{pal[3]}" stroke-opacity="0.8" stroke-width="6"/>'
    p += f'\n    <rect x="244" y="344" width="312" height="312" fill="none" stroke="{pal[0]}" stroke-opacity="0.35" stroke-width="2"/>'
    for i in range(4):
        for j in range(4):
            cx, cy = 300 + i * 68, 400 + j * 68
            p += (f'\n    <path d="M{cx},{cy - 20} C{cx + 22},{cy - 22} {cx + 22},{cy + 14} {cx},{cy + 20} '
                  f'C{cx - 22},{cy + 14} {cx - 22},{cy - 22} {cx},{cy - 20} Z" fill="{pal[0]}" fill-opacity="0.28"/>')
            p += f'\n    <circle cx="{cx}" cy="{cy}" r="5" fill="{pal[3]}" fill-opacity="0.8"/>'
    p += "\n  </g>\n</g>"
    return p


GARMENTS = {
    "coat": g_coat, "dress": g_dress, "blazer": g_blazer, "blouse": g_blouse,
    "knit": g_knit, "trousers": g_trousers, "skirt": g_skirt, "jacket": g_jacket,
    "bag": g_bag, "boots": g_boots, "hat": g_hat, "scarf": g_scarf,
}


def swatch(pid, pal, motif):
    """Close-up of the cloth — the second image in every product gallery."""
    ground, body, shade, accent = pal
    rnd = random.Random(pid * 17)
    inner = f'  <rect x="26" y="26" width="{W - 52}" height="{H - 52}" fill="url(#b{pid})"/>\n'
    if motif == "herringbone":
        for row in range(26):
            y = 26 + row * 38
            for col in range(12):
                x = 26 + col * 64
                d = 1 if row % 2 == 0 else -1
                inner += (f'  <path d="M{x},{y + (0 if d > 0 else 34)} L{x + 32},{y + (34 if d > 0 else 0)} '
                          f'L{x + 64},{y + (0 if d > 0 else 34)}" fill="none" stroke="{shade}" '
                          f'stroke-opacity="0.35" stroke-width="7"/>\n')
    elif motif == "houndstooth":
        for row in range(13):
            for col in range(10):
                x, y = 26 + col * 75, 26 + row * 75
                inner += (f'  <path d="M{x},{y} h38 v38 h-38 Z M{x + 38},{y + 38} h37 v37 h-37 Z '
                          f'M{x + 38},{y} l37,19 v19 h-37 Z" fill="{shade}" fill-opacity="0.4"/>\n')
    elif motif == "check":
        for i in range(11):
            x = 26 + i * 70
            inner += f'  <rect x="{x}" y="26" width="26" height="{H - 52}" fill="{shade}" fill-opacity="0.28"/>\n'
        for j in range(14):
            y = 26 + j * 70
            inner += f'  <rect x="26" y="{y}" width="{W - 52}" height="26" fill="{shade}" fill-opacity="0.28"/>\n'
        inner += f'  <rect x="26" y="26" width="{W-52}" height="{H-52}" fill="none"/>\n'
    elif motif == "corduroy":
        for i in range(28):
            x = 30 + i * 27
            inner += (f'  <rect x="{x}" y="26" width="14" height="{H - 52}" fill="{shade}" fill-opacity="0.3"/>\n')
    elif motif == "silk":
        for i in range(9):
            y = 60 + i * 105
            inner += (f'  <path d="M26,{y} C220,{y - 60} 580,{y + 70} {W - 26},{y - 10}" fill="none" '
                      f'stroke="{ground}" stroke-opacity="0.16" stroke-width="26"/>\n')
    elif motif == "knit":
        for row in range(24):
            for col in range(16):
                x, y = 30 + col * 47, 30 + row * 40
                inner += (f'  <path d="M{x},{y + 34} C{x + 4},{y} {x + 39},{y} {x + 43},{y + 34}" fill="none" '
                          f'stroke="{shade}" stroke-opacity="0.3" stroke-width="6" stroke-linecap="round"/>\n')
    elif motif == "leather":
        for _ in range(150):
            cx, cy = rnd.randint(30, W - 30), rnd.randint(30, H - 30)
            r = rnd.randint(18, 56)
            inner += (f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{shade}" '
                      f'stroke-opacity="0.16" stroke-width="2"/>\n')
    else:  # linen / plain weave
        for i in range(80):
            y = 30 + i * 12
            inner += f'  <path d="M26,{y} L{W - 26},{y}" stroke="{shade}" stroke-opacity="0.12" stroke-width="4"/>\n'
        for i in range(64):
            x = 30 + i * 12
            inner += f'  <path d="M{x},26 L{x},{H - 26}" stroke="{ground}" stroke-opacity="0.10" stroke-width="4"/>\n'
    return inner


def label_card(pid, pal, name):
    """Third gallery image: the woven brand label stitched into the garment."""
    ground, body, shade, accent = pal
    inner = f'  <rect x="26" y="26" width="{W - 52}" height="{H - 52}" fill="url(#b{pid})"/>\n'
    for i in range(70):
        y = 30 + i * 14
        inner += f'  <path d="M26,{y} L{W - 26},{y}" stroke="{shade}" stroke-opacity="0.10" stroke-width="5"/>\n'
    inner += f'''  <g filter="url(#s{pid})">
    <rect x="150" y="382" width="500" height="236" rx="4" fill="{ground}"/>
    <rect x="168" y="400" width="464" height="200" fill="none" stroke="{shade}" stroke-opacity="0.5" stroke-width="2"/>
    <text x="400" y="474" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
          font-size="52" letter-spacing="10" fill="{shade}">HOLLIS</text>
    <text x="400" y="524" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
          font-size="26" letter-spacing="14" fill="{accent}">&amp; VANE</text>
    <text x="400" y="566" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
          font-size="17" letter-spacing="6" fill="{shade}" fill-opacity="0.75">{name.upper()}</text>
  </g>
'''
    inner += stitch(f"M150,368 L650,368", pal, 0.45) + "\n"
    inner += stitch(f"M150,632 L650,632", pal, 0.45) + "\n"
    return inner


# ----------------------------------------------------------------------------
# Wide editorial plates (hero, story, journal)
# ----------------------------------------------------------------------------

def editorial(pid, pal, kind, w=1600, h=1000):
    ground, body, shade, accent = pal
    inner = ""
    if kind == "hero":
        inner += f'  <rect x="0" y="{int(h*0.62)}" width="{w}" height="{h}" fill="{mix(ground, shade, 0.16)}"/>\n'
        inner += f'  <ellipse cx="{int(w*0.5)}" cy="{int(h*0.62)}" rx="{int(w*0.42)}" ry="70" fill="{mix(ground, shade, 0.28)}" opacity="0.5"/>\n'
        # three figures on a plinth
        for i, (cx, scale, pl) in enumerate([(int(w*0.28), 0.86, "camel"), (int(w*0.5), 1.0, "oxblood"), (int(w*0.72), 0.9, "ink")]):
            sp = PALETTES[pl]
            inner += f'  <g transform="translate({cx},{int(h*0.62)}) scale({scale}) translate(-400,-640)" opacity="0.97">\n'
            inner += f'    <ellipse cx="400" cy="646" rx="150" ry="22" fill="#3B2E22" opacity="0.2"/>\n'
            inner += f'''    <path d="M300,150 C300,120 336,96 400,96 C464,96 500,120 500,150 L524,600
                     C480,620 440,628 400,628 C360,628 320,620 276,600 Z" fill="{sp[1]}"/>
    <path d="M300,154 L238,404 C234,424 250,438 270,438 L296,436 L322,184 Z" fill="{sp[2]}"/>
    <path d="M500,154 L562,404 C566,424 550,438 530,438 L504,436 L478,184 Z" fill="{sp[2]}"/>
    <path d="M400,96 L400,628" stroke="{sp[2]}" stroke-opacity="0.5" stroke-width="3" fill="none"/>
    <rect x="278" y="386" width="244" height="26" fill="{sp[2]}" fill-opacity="0.8"/>
    <circle cx="400" cy="52" r="46" fill="{mix(sp[1], "#000000", 0.25)}"/>\n'''
            inner += "  </g>\n"
        inner += f'  <path d="M0,{int(h*0.62)} L{w},{int(h*0.62)}" stroke="{shade}" stroke-opacity="0.25" stroke-width="2" fill="none"/>\n'
    elif kind == "atelier":
        # a rail of hanging garments
        inner += f'  <rect x="{int(w*0.06)}" y="{int(h*0.2)}" width="{int(w*0.88)}" height="12" rx="6" fill="{shade}" opacity="0.7"/>\n'
        cols = ["oxblood", "camel", "sage", "ink", "cream", "denim", "rust", "plum"]
        n = 8
        for i in range(n):
            x = int(w * 0.1) + i * int(w * 0.8 / n)
            sp = PALETTES[cols[i % len(cols)]]
            top = int(h * 0.2)
            hh = int(h * (0.5 + 0.06 * math.sin(i * 1.3)))
            inner += f'''  <path d="M{x + 60},{top} l0,-26" stroke="{shade}" stroke-width="6" fill="none"/>
  <path d="M{x + 20},{top + 40} L{x + 60},{top + 6} L{x + 100},{top + 40}
           L{x + 116},{top + hh} L{x + 4},{top + hh} Z" fill="{sp[1]}"/>
  <path d="M{x + 60},{top + 6} L{x + 60},{top + hh}" stroke="{sp[2]}" stroke-opacity="0.45" stroke-width="3" fill="none"/>\n'''
    elif kind == "detail":
        # macro of a cuff and button
        inner += f'  <rect x="0" y="0" width="{w}" height="{h}" fill="url(#b{pid})"/>\n'
        for i in range(60):
            y = i * 18
            inner += f'  <path d="M0,{y} L{w},{y}" stroke="{shade}" stroke-opacity="0.10" stroke-width="7"/>\n'
        inner += f'  <path d="M{int(w*0.1)},{int(h*0.72)} C{int(w*0.35)},{int(h*0.5)} {int(w*0.65)},{int(h*0.92)} {w},{int(h*0.6)}" stroke="{ground}" stroke-opacity="0.35" stroke-width="42" fill="none"/>\n'
        for i, (cx, cy) in enumerate([(int(w*0.34), int(h*0.55)), (int(w*0.52), int(h*0.62)), (int(w*0.70), int(h*0.66))]):
            inner += f'  <circle cx="{cx}" cy="{cy}" r="54" fill="{accent}"/>\n'
            inner += f'  <circle cx="{cx}" cy="{cy}" r="54" fill="none" stroke="{shade}" stroke-opacity="0.45" stroke-width="4"/>\n'
            inner += f'  <circle cx="{cx}" cy="{cy}" r="30" fill="none" stroke="{shade}" stroke-opacity="0.3" stroke-width="3"/>\n'
            for dx, dy in [(-11, -11), (11, -11), (-11, 11), (11, 11)]:
                inner += f'  <circle cx="{cx + dx}" cy="{cy + dy}" r="5" fill="{shade}" fill-opacity="0.6"/>\n'
    return frame(pid, pal, inner, ratio=(w, h))


# ----------------------------------------------------------------------------

PRODUCTS = [
    # slug,            garment,   palette,   swatch motif
    ("belted-gabardine-trench",  "coat",     "camel",   "herringbone"),
    ("midnight-velvet-gown",     "dress",    "plum",    "silk"),
    ("oxblood-riding-jacket",    "jacket",   "oxblood", "leather"),
    ("ivory-silk-blouse",        "blouse",   "cream",   "silk"),
    ("shetland-cable-knit",      "knit",     "sage",    "knit"),
    ("high-waist-wool-trousers", "trousers", "ink",     "houndstooth"),
    ("pleated-tartan-skirt",     "skirt",    "rust",    "check"),
    ("prince-of-wales-blazer",   "blazer",   "ink",     "houndstooth"),
    ("saddle-leather-satchel",   "bag",      "rust",    "leather"),
    ("hand-lasted-riding-boots", "boots",    "oxblood", "leather"),
    ("sculpted-felt-fedora",     "hat",      "sage",    "linen"),
    ("hand-rolled-silk-square",  "scarf",    "cream",   "silk"),
    ("corduroy-field-coat",      "coat",     "rust",    "corduroy"),
    ("linen-summer-shift",       "dress",    "cream",   "linen"),
    ("indigo-selvedge-trousers", "trousers", "denim",   "linen"),
    ("camel-hair-overcoat",      "coat",     "camel",   "herringbone"),
]

TITLES = {
    "belted-gabardine-trench": "Gabardine Trench",
    "midnight-velvet-gown": "Velvet Gown",
    "oxblood-riding-jacket": "Riding Jacket",
    "ivory-silk-blouse": "Silk Blouse",
    "shetland-cable-knit": "Cable Knit",
    "high-waist-wool-trousers": "Wool Trousers",
    "pleated-tartan-skirt": "Tartan Skirt",
    "prince-of-wales-blazer": "P.O.W. Blazer",
    "saddle-leather-satchel": "Leather Satchel",
    "hand-lasted-riding-boots": "Riding Boots",
    "sculpted-felt-fedora": "Felt Fedora",
    "hand-rolled-silk-square": "Silk Square",
    "corduroy-field-coat": "Field Coat",
    "linen-summer-shift": "Linen Shift",
    "indigo-selvedge-trousers": "Selvedge Denim",
    "camel-hair-overcoat": "Camel Overcoat",
}


def write(path, data):
    with open(os.path.join(OUT, path), "w") as f:
        f.write(data)


def main():
    os.makedirs(OUT, exist_ok=True)
    pid = 1
    for slug, garment, palname, motif in PRODUCTS:
        pal = PALETTES[palname]
        write(f"{slug}-1.svg", frame(pid, pal, GARMENTS[garment](pid, pal)))
        write(f"{slug}-2.svg", frame(pid + 100, pal, swatch(pid + 100, pal, motif)))
        write(f"{slug}-3.svg", frame(pid + 200, pal, label_card(pid + 200, pal, TITLES[slug])))
        pid += 1

    write("hero.svg", editorial(90, PALETTES["cream"], "hero", 1600, 1000))
    write("atelier.svg", editorial(91, PALETTES["sage"], "atelier", 1600, 1100))
    write("detail.svg", editorial(92, PALETTES["camel"], "detail", 1600, 1100))
    write("journal-1.svg", editorial(93, PALETTES["oxblood"], "detail", 1200, 900))
    write("journal-2.svg", editorial(94, PALETTES["denim"], "atelier", 1200, 900))
    write("journal-3.svg", editorial(95, PALETTES["plum"], "hero", 1200, 900))

    print(f"wrote {len(os.listdir(OUT))} files to assets/img/")


if __name__ == "__main__":
    main()
