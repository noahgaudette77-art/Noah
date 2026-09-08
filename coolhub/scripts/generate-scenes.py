#!/usr/bin/env python3
"""
Draws every scene image for the CoolHub mockup as a self-contained SVG.

The register is the architectural competition board, not the photograph: layered
silhouettes, atmospheric perspective, entourage figures for scale, volumetric
mist. Drawing rather than shooting buys one thing photography could not — the
three Refreshing Play scenes share a byte-identical camera, ground plane and
background, so the module-swap cross-fade proves "one platform, different
modules" instead of merely asserting it.

    python3 scripts/generate-scenes.py
"""

import math
import os
import random

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "assets", "img")


# --- colour ---------------------------------------------------------------
def mix(a, b, t):
    a, b = a.lstrip("#"), b.lstrip("#")
    return "#" + "".join(
        "%02x" % round(int(a[i:i + 2], 16) + (int(b[i:i + 2], 16) - int(a[i:i + 2], 16)) * t)
        for i in (0, 2, 4)
    )


INK = "#16191B"
TEAL = "#4A6D77"      # Health & Wellness accent
CLAY = "#B0653C"      # Refreshing Play accent

MOODS = {
    # sky_top, sky_bottom, far, mid, near, ground, accent
    "dusk":    ("#8FA9B4", "#E4E0D5", "#93A5AB", "#5F7178", "#33444A", "#CFC9BC", TEAL),
    "morning": ("#BCCFD4", "#F2EDE2", "#A9B7B7", "#77878A", "#41504F", "#DCD5C7", TEAL),
    "noon":    ("#A9C2CC", "#F4EFE4", "#AFBBB9", "#7E8A85", "#48524D", "#E0D8C8", CLAY),
    "golden":  ("#9FB6BE", "#F3E6D2", "#B0AFA2", "#847767", "#4A4034", "#DED2BC", CLAY),
}


# --- svg plumbing ---------------------------------------------------------
def wrap(w, h, defs, body, seed, grain=0.55, vignette=0.26):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" preserveAspectRatio="xMidYMid slice">
  <defs>
{defs}
    <radialGradient id="vig" cx="0.5" cy="0.45" r="0.78">
      <stop offset="52%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#0E1416" stop-opacity="{vignette}"/>
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="{seed}" result="t"/>
      <feColorMatrix in="t" type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="{grain}"/></feComponentTransfer>
    </filter>
  </defs>
{body}
  <rect width="{w}" height="{h}" fill="url(#vig)"/>
  <rect width="{w}" height="{h}" filter="url(#grain)" opacity="0.085" style="mix-blend-mode:multiply"/>
</svg>
'''


def gradients(mood, w, h, horizon):
    top, bot, far, mid, near, ground, accent = mood
    return f'''    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{top}"/>
      <stop offset="62%" stop-color="{mix(top, bot, 0.72)}"/>
      <stop offset="100%" stop-color="{bot}"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{mix(ground, bot, 0.55)}"/>
      <stop offset="34%" stop-color="{ground}"/>
      <stop offset="100%" stop-color="{mix(ground, near, 0.56)}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="{round(w * 0.012, 1)}"/>
    </filter>
    <filter id="softer" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="{round(w * 0.028, 1)}"/>
    </filter>
    <filter id="fine" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="{round(w * 0.0035, 1)}"/>
    </filter>'''


# --- landscape elements ---------------------------------------------------
def ridge(y, w, colour, rng, amp=26, step=90, op=1.0):
    """A soft, rolling silhouette band running off both edges."""
    pts = [f"M-40,{y + amp}"]
    x = -40
    while x < w + 40:
        nx = x + step
        pts.append(f"Q{x + step / 2:.0f},{y + rng.uniform(-amp, amp * 0.5):.0f} {nx:.0f},{y + rng.uniform(-amp * 0.4, amp * 0.6):.0f}")
        x = nx
    pts.append(f"L{w + 40},{y + 900} L-40,{y + 900} Z")
    return f'  <path d="{" ".join(pts)}" fill="{colour}" opacity="{op}"/>'


def tree(x, base, h, colour, rng, op=1.0):
    """A loose canopy on a slim trunk — mass, not botany."""
    tw = h * 0.10
    parts = [f'<rect x="{x - tw / 2:.1f}" y="{base - h * 0.62:.1f}" width="{tw:.1f}" height="{h * 0.62:.1f}" fill="{colour}"/>']
    cy, cr = base - h * 0.72, h * 0.30
    for i in range(6):
        a = rng.uniform(0, math.tau)
        d = rng.uniform(0, cr * 0.55)
        parts.append(f'<ellipse cx="{x + math.cos(a) * d:.1f}" cy="{cy + math.sin(a) * d * 0.7:.1f}" '
                     f'rx="{cr * rng.uniform(0.55, 0.9):.1f}" ry="{cr * rng.uniform(0.5, 0.8):.1f}" fill="{colour}"/>')
    return f'  <g opacity="{op}">{"".join(parts)}</g>'


def figure(x, base, h, colour, op=0.62, kind="stand"):
    """Entourage: abstract enough to stay quiet, proportioned enough to give scale."""
    s = h / 100.0
    if kind == "walk":
        legs = ('<path d="M-6,-50 L-1,-50 L2,-2 L-3.5,-2 Z"/>'
                '<path d="M1,-50 L6,-50 L11,-3 L6,-3 Z"/>')
        arms = '<path d="M-8,-80 L-11,-58 L-8.5,-57 L-5.5,-79 Z"/><path d="M8,-80 L12,-60 L9.5,-59 L5.5,-79 Z"/>'
    elif kind == "sit":
        legs = ('<path d="M-6,-34 L7,-34 L8,-28 L-6,-28 Z"/>'
                '<path d="M4,-34 L9,-34 L9.5,-2 L4.5,-2 Z"/>')
        arms = '<path d="M-8,-64 L-10,-44 L-7.5,-43 L-5,-63 Z"/>'
        return (f'  <g transform="translate({x:.1f},{base:.1f}) scale({s:.3f})" fill="{colour}" opacity="{op}">'
                f'<circle cx="0" cy="-76" r="7"/>'
                f'<path d="M-8,-68 q8,-3 16,0 l2,26 l-20,0 z"/>{legs}{arms}</g>')
    else:
        legs = ('<path d="M-6.5,-50 L-1,-50 L-1.5,0 L-6.5,0 Z"/>'
                '<path d="M1,-50 L6.5,-50 L6.5,0 L1.5,0 Z"/>')
        arms = '<path d="M-8,-80 L-10.5,-56 L-8,-55.5 L-5.5,-79 Z"/><path d="M8,-80 L10.5,-56 L8,-55.5 L5.5,-79 Z"/>'
    return (f'  <g transform="translate({x:.1f},{base:.1f}) scale({s:.3f})" fill="{colour}" opacity="{op}">'
            f'<circle cx="0" cy="-92" r="7"/>'
            f'<path d="M-8,-84 q8,-3 16,0 l2,32 l-20,0 z"/>{legs}{arms}</g>')


def mist(cx, cy, rx, ry, op=0.5, blur="soft"):
    return f'  <ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="#FFFFFF" opacity="{op}" filter="url(#{blur})"/>'


def droplets(cx, cy, rx, ry, n, rng, op=0.5, r=(1.4, 3.4)):
    out = []
    for _ in range(n):
        a, d = rng.uniform(0, math.tau), rng.uniform(0.25, 1.0) ** 0.5
        out.append(f'<circle cx="{cx + math.cos(a) * rx * d:.1f}" cy="{cy + math.sin(a) * ry * d:.1f}" '
                   f'r="{rng.uniform(*r):.1f}" fill="#FFFFFF" opacity="{rng.uniform(0.3, 1.0) * op:.2f}"/>')
    return f'  <g filter="url(#fine)">{"".join(out)}</g>'


def paving(w, h, horizon, colour, rng, vp=None):
    """Plaza joints: a few converging lines plus foreshortened courses."""
    vp = vp or w * 0.5
    out = []
    for i in range(-9, 10):
        x = vp + i * w * 0.135
        out.append(f'<line x1="{vp + i * w * 0.028:.0f}" y1="{horizon:.0f}" x2="{x:.0f}" y2="{h + 20}" '
                   f'stroke="{colour}" stroke-width="1.4" stroke-opacity="0.30"/>')
    t = 0.045
    while t < 1.35:
        y = horizon + (h - horizon) * (t ** 1.85)
        out.append(f'<line x1="0" y1="{y:.0f}" x2="{w}" y2="{y:.0f}" stroke="{colour}" '
                   f'stroke-width="1.4" stroke-opacity="{min(0.34, 0.06 + t * 0.22):.2f}"/>')
        t *= 1.42
    return f'  <g>{"".join(out)}</g>'


def shadow(cx, y, rx, colour, op=0.20):
    return f'  <ellipse cx="{cx:.0f}" cy="{y:.0f}" rx="{rx:.0f}" ry="{rx * 0.16:.0f}" fill="{colour}" opacity="{op}" filter="url(#soft)"/>'


# --- product forms --------------------------------------------------------
def aeris_column(x, base, h, dark, accent, rng, mist_scale=1.0):
    """Aeris: a slim mast under a thin disc canopy, releasing a fine cloud."""
    w = h * 0.055
    cap_r = h * 0.30
    top = base - h
    g = [
        shadow(x, base + 3, cap_r * 0.85, dark, 0.18),
        f'  <ellipse cx="{x}" cy="{top + cap_r * 0.10:.0f}" rx="{cap_r:.0f}" ry="{cap_r * 0.16:.0f}" fill="{dark}"/>',
        f'  <ellipse cx="{x}" cy="{top + cap_r * 0.02:.0f}" rx="{cap_r:.0f}" ry="{cap_r * 0.16:.0f}" fill="{mix(dark, "#FFFFFF", 0.30)}"/>',
        f'  <rect x="{x - w / 2:.1f}" y="{top:.0f}" width="{w:.1f}" height="{h:.0f}" fill="{dark}"/>',
        f'  <rect x="{x - w / 2:.1f}" y="{top:.0f}" width="{w * 0.34:.1f}" height="{h:.0f}" fill="{mix(dark, "#FFFFFF", 0.22)}"/>',
        f'  <rect x="{x - w * 0.62:.1f}" y="{base - h * 0.42:.0f}" width="{w * 1.24:.1f}" height="{h * 0.055:.0f}" fill="{accent}"/>',
        mist(x, top + h * 0.36 * mist_scale, cap_r * 0.86 * mist_scale, h * 0.28 * mist_scale, 0.32),
        mist(x, top + h * 0.22 * mist_scale, cap_r * 0.56 * mist_scale, h * 0.15 * mist_scale, 0.38),
    ]
    g.append(droplets(x, top + h * 0.33 * mist_scale, cap_r * 0.72 * mist_scale, h * 0.28 * mist_scale, 58, rng, 0.55))
    return "\n".join(g)


def abrio_canopy(x, base, h, dark, accent, rng):
    """Abrio: a shading canopy over a seating ring — the oasis, not the shower."""
    span = h * 1.05
    top = base - h
    w = h * 0.05
    g = [
        shadow(x, base + 4, span * 0.60, dark, 0.20),
        f'  <path d="M{x - span / 2:.0f},{top + h * 0.10:.0f} Q{x:.0f},{top - h * 0.09:.0f} {x + span / 2:.0f},{top + h * 0.10:.0f} '
        f'L{x + span / 2:.0f},{top + h * 0.16:.0f} Q{x:.0f},{top - h * 0.03:.0f} {x - span / 2:.0f},{top + h * 0.16:.0f} Z" fill="{dark}"/>',
        f'  <rect x="{x - w / 2:.1f}" y="{top + h * 0.02:.0f}" width="{w:.1f}" height="{h * 0.98:.0f}" fill="{dark}"/>',
        f'  <rect x="{x - w / 2:.1f}" y="{top + h * 0.02:.0f}" width="{w * 0.36:.1f}" height="{h * 0.98:.0f}" fill="{mix(dark, "#FFFFFF", 0.24)}"/>',
        # seating ring
        f'  <ellipse cx="{x}" cy="{base - h * 0.045:.0f}" rx="{span * 0.36:.0f}" ry="{span * 0.075:.0f}" fill="none" '
        f'stroke="{mix(dark, "#FFFFFF", 0.42)}" stroke-width="{h * 0.045:.1f}"/>',
        f'  <path d="M{x - span * 0.36:.0f},{base - h * 0.045:.0f} a{span * 0.36:.0f},{span * 0.075:.0f} 0 0,0 {span * 0.72:.0f},0" '
        f'fill="none" stroke="{accent}" stroke-width="{h * 0.013:.1f}" stroke-opacity="0.45"/>',
    ]
    for i in range(7):
        rx = x - span / 2 + span * (i + 0.5) / 7
        g.append(f'  <line x1="{rx:.0f}" y1="{top + h * 0.055:.0f}" x2="{rx:.0f}" y2="{top + h * 0.145:.0f}" '
                 f'stroke="{mix(dark, "#FFFFFF", 0.30)}" stroke-width="1.6" stroke-opacity="0.6"/>')
    g.append(mist(x, base - h * 0.30, span * 0.30, h * 0.14, 0.10, "softer"))
    return "\n".join(g)


def glomist_globe(x, base, h, dark, accent, rng):
    """Glomist: a luminous head on a slim stem inside its own cloud."""
    r = h * 0.16
    top = base - h
    g = [
        shadow(x, base + 3, h * 0.34, dark, 0.18),
        mist(x, top + r * 1.5, h * 0.38, h * 0.30, 0.30, "softer"),
        f'  <rect x="{x - h * 0.022:.1f}" y="{top + r:.0f}" width="{h * 0.044:.1f}" height="{h - r:.0f}" fill="{dark}"/>',
        f'  <circle cx="{x:.0f}" cy="{top + r * 1.35:.0f}" r="{r * 2.1:.0f}" fill="url(#glow)" opacity="0.42"/>',
        f'  <circle cx="{x:.0f}" cy="{top + r * 1.35:.0f}" r="{r:.0f}" fill="{mix(dark, "#FFFFFF", 0.18)}"/>',
        f'  <path d="M{x - r:.0f},{top + r * 1.35:.0f} a{r:.0f},{r:.0f} 0 0,1 {r * 2:.0f},0 Z" fill="{mix(accent, "#FFFFFF", 0.45)}"/>',
        f'  <rect x="{x - h * 0.030:.1f}" y="{base - h * 0.30:.0f}" width="{h * 0.060:.1f}" height="{h * 0.035:.0f}" fill="{accent}"/>',
        mist(x, top + r * 2.6, h * 0.28, h * 0.21, 0.27),
    ]
    g.append(droplets(x, top + r * 2.2, h * 0.32, h * 0.26, 54, rng, 0.52))
    return "\n".join(g)


# =========================================================================
# Scenes
# =========================================================================
def scene_hero():
    w, h, hz = 2400, 1350, 720
    m = MOODS["dusk"]
    top, bot, far, mid, near, ground, accent = m
    rng = random.Random(11)
    b = [f'  <rect width="{w}" height="{h}" fill="url(#sky)"/>']
    # a low sun-haze behind the skyline
    b.append(f'  <ellipse cx="{w * 0.62:.0f}" cy="{hz - 40}" rx="{w * 0.30:.0f}" ry="150" fill="#FFF6E8" opacity="0.16" filter="url(#softer)"/>')
    # far city
    sky_far = mix(far, bot, 0.55)
    for i in range(16):
        bw = rng.uniform(60, 190)
        bx = rng.uniform(-60, w)
        bh = rng.uniform(70, 330)
        b.append(f'  <rect x="{bx:.0f}" y="{hz - bh:.0f}" width="{bw:.0f}" height="{bh:.0f}" fill="{sky_far}" opacity="0.55"/>')
    b.append(ridge(hz - 30, w, mix(mid, bot, 0.45), rng, 34, 150, 0.85))
    for i in range(9):
        x = -60 + i * (w / 8) + rng.uniform(-50, 50)
        b.append(tree(x, hz + 6, rng.uniform(180, 275), mix(mid, bot, 0.30), rng, 0.88))
    # ground
    b.append(f'  <rect x="0" y="{hz}" width="{w}" height="{h - hz}" fill="url(#floor)"/>')
    b.append(paving(w, h, hz, mix(near, ground, 0.55), rng, w * 0.46))
    # a shallow reflecting channel catching the sky
    b.append(f'  <ellipse cx="{w * 0.5:.0f}" cy="{h - 120}" rx="{w * 0.40:.0f}" ry="70" fill="{mix(ground, top, 0.45)}" opacity="0.55" filter="url(#soft)"/>')
    # mid-ground planting
    for x, s in ((190, 210), (2210, 235)):
        b.append(tree(x, hz + 70, s, mix(near, mid, 0.35), rng, 0.92))
    # the family of products, staged across the plaza
    b.append(glomist_globe(560, hz + 130, 300, mix(near, INK, 0.30), accent, rng))
    b.append(aeris_column(1180, hz + 250, 470, mix(near, INK, 0.42), accent, rng, 1.05))
    b.append(abrio_canopy(1830, hz + 175, 350, mix(near, INK, 0.34), accent, rng))
    # entourage
    ent = mix(near, "#000000", 0.25)
    for x, base, ht, k in ((880, hz + 205, 128, "walk"), (960, hz + 212, 96, "stand"),
                           (1450, hz + 268, 150, "stand"), (1520, hz + 272, 108, "walk"),
                           (2050, hz + 150, 96, "sit"), (2110, hz + 152, 92, "sit"),
                           (420, hz + 118, 84, "stand"), (700, hz + 300, 168, "walk")):
        b.append(shadow(x, base + 2, ht * 0.22, near, 0.16))
        b.append(figure(x, base, ht, ent, 0.60, k))
    # atmosphere
    b.append(mist(w * 0.5, hz + 40, w * 0.55, 112, 0.19, "softer"))
    b.append(f'  <rect width="{w}" height="{h}" fill="{mix(top, "#FFFFFF", 0.4)}" opacity="0.04"/>')
    return wrap(w, h, gradients(m, w, h, hz), "\n".join(b), 7, vignette=0.32)


def scene_product(name, mood, drawer, seed, note_walls=False):
    w, h, hz = 1600, 1200, 610
    m = MOODS[mood]
    top, bot, far, mid, near, ground, accent = m
    rng = random.Random(seed)
    b = [f'  <rect width="{w}" height="{h}" fill="url(#sky)"/>']
    if note_walls:
        # a courtyard: low masonry walls frame the view, adult and residential
        wall = mix(ground, near, 0.28)
        b.append(f'  <rect x="0" y="{hz - 250}" width="{w}" height="270" fill="{mix(wall, bot, 0.35)}"/>')
        for i in range(11):
            bx = i * (w / 10)
            b.append(f'  <line x1="{bx:.0f}" y1="{hz - 250}" x2="{bx:.0f}" y2="{hz + 20}" stroke="{mix(wall, near, 0.30)}" stroke-width="2" stroke-opacity="0.35"/>')
        b.append(f'  <rect x="0" y="{hz - 262}" width="{w}" height="16" fill="{mix(wall, near, 0.22)}"/>')
    else:
        b.append(ridge(hz - 26, w, mix(mid, bot, 0.62), rng, 14, 210, 0.55))
    for i in range(6):
        x = -40 + i * (w / 5) + rng.uniform(-40, 40)
        b.append(tree(x, hz + 4, rng.uniform(150, 245), mix(mid, bot, 0.26), rng, 0.9))
    b.append(f'  <rect x="0" y="{hz}" width="{w}" height="{h - hz}" fill="url(#floor)"/>')
    b.append(paving(w, h, hz, mix(near, ground, 0.55), rng, w * 0.5))
    b.append(drawer(rng, m))
    b.append(mist(w * 0.5, hz + 30, w * 0.6, 80, 0.12, "softer"))
    return wrap(w, h, gradients(m, w, h, hz), "\n".join(b), seed, vignette=0.24)


def draw_aeris(rng, m):
    top, bot, far, mid, near, ground, accent = m
    hz = 610
    dark = mix(near, INK, 0.45)
    ent = mix(near, "#000000", 0.28)
    out = [aeris_column(800, hz + 300, 560, dark, accent, rng, 1.0)]
    for x, base, ht, k in ((470, hz + 190, 150, "stand"), (1160, hz + 235, 168, "walk"), (1265, hz + 240, 120, "stand")):
        out.append(shadow(x, base + 2, ht * 0.22, near, 0.16))
        out.append(figure(x, base, ht, ent, 0.58, k))
    # a bench, because this is a place to stop rather than a place to play
    out.append(f'  <rect x="270" y="{hz + 150}" width="230" height="16" rx="4" fill="{mix(near, "#FFFFFF", 0.42)}"/>')
    out.append(f'  <rect x="298" y="{hz + 166}" width="12" height="46" fill="{mix(near, "#FFFFFF", 0.30)}"/>')
    out.append(f'  <rect x="458" y="{hz + 166}" width="12" height="46" fill="{mix(near, "#FFFFFF", 0.30)}"/>')
    return "\n".join(out)


def draw_abrio(rng, m):
    top, bot, far, mid, near, ground, accent = m
    hz = 610
    dark = mix(near, INK, 0.38)
    ent = mix(near, "#000000", 0.26)
    out = [abrio_canopy(820, hz + 290, 470, dark, accent, rng)]
    for x, base, ht, k in ((690, hz + 262, 120, "sit"), (930, hz + 266, 126, "sit"),
                           (1290, hz + 300, 176, "walk"), (400, hz + 210, 148, "stand")):
        out.append(shadow(x, base + 2, ht * 0.20, near, 0.15))
        out.append(figure(x, base, ht, ent, 0.58, k))
    return "\n".join(out)


def draw_glomist(rng, m):
    top, bot, far, mid, near, ground, accent = m
    hz = 610
    dark = mix(near, INK, 0.40)
    ent = mix(near, "#000000", 0.28)
    out = []
    for x, s, base in ((640, 330, hz + 210), (830, 430, hz + 300), (1010, 360, hz + 240)):
        out.append(glomist_globe(x, base, s, dark, accent, rng))
    out.append(mist(830, hz - 20, 390, 165, 0.24, "softer"))
    for x, base, ht, k in ((430, hz + 235, 160, "stand"), (1230, hz + 285, 172, "walk"), (1320, hz + 288, 116, "stand")):
        out.append(shadow(x, base + 2, ht * 0.20, near, 0.15))
        out.append(figure(x, base, ht, ent, 0.58, k))
    return "\n".join(out)


# --- Refreshing Play: one framing, three modules --------------------------
RP_W, RP_H, RP_HZ = 1600, 1100, 560
RP_CX, RP_BASE = 800, 900          # centre and front edge of the standard surface
RP_RX, RP_RY = 430, 108            # the standard surface, in perspective


def rp_frame(module, seed):
    """Background, ground plane and entourage are identical in all three."""
    m = MOODS["noon"]
    top, bot, far, mid, near, ground, accent = m
    rng = random.Random(404)        # fixed: the surroundings must not move
    b = [f'  <rect width="{RP_W}" height="{RP_H}" fill="url(#sky)"/>']
    b.append(ridge(RP_HZ - 28, RP_W, mix(mid, bot, 0.62), rng, 14, 200, 0.55))
    for i in range(6):
        x = -30 + i * (RP_W / 5) + rng.uniform(-35, 35)
        b.append(tree(x, RP_HZ + 4, rng.uniform(160, 250), mix(mid, bot, 0.24), rng, 0.9))
    b.append(f'  <rect x="0" y="{RP_HZ}" width="{RP_W}" height="{RP_H - RP_HZ}" fill="url(#floor)"/>')
    b.append(paving(RP_W, RP_H, RP_HZ, mix(near, ground, 0.55), rng, RP_W * 0.5))

    # the standard surface — the constant the whole argument rests on
    surf = mix(ground, near, 0.30)
    b.append(f'  <ellipse cx="{RP_CX}" cy="{RP_BASE}" rx="{RP_RX + 14}" ry="{RP_RY + 4}" fill="{mix(surf, "#000000", 0.10)}" opacity="0.35"/>')
    b.append(f'  <ellipse cx="{RP_CX}" cy="{RP_BASE - 6}" rx="{RP_RX}" ry="{RP_RY}" fill="{surf}"/>')
    b.append(f'  <ellipse cx="{RP_CX}" cy="{RP_BASE - 6}" rx="{RP_RX}" ry="{RP_RY}" fill="none" stroke="{mix(surf, "#FFFFFF", 0.45)}" stroke-width="3"/>')
    b.append(f'  <ellipse cx="{RP_CX}" cy="{RP_BASE - 6}" rx="{RP_RX * 0.72:.0f}" ry="{RP_RY * 0.72:.0f}" fill="none" '
             f'stroke="{mix(surf, near, 0.35)}" stroke-width="2" stroke-opacity="0.55"/>')
    b.append(f'  <ellipse cx="{RP_CX}" cy="{RP_BASE - 6}" rx="{RP_RX * 0.40:.0f}" ry="{RP_RY * 0.40:.0f}" fill="none" '
             f'stroke="{mix(surf, near, 0.35)}" stroke-width="2" stroke-opacity="0.45"/>')

    b.append(module(rng, m))

    # entourage, fixed across all three so only the module reads as changing
    ent = mix(near, "#000000", 0.24)
    for x, base, ht, k in ((250, RP_HZ + 250, 168, "stand"), (330, RP_HZ + 256, 104, "walk"),
                           (1370, RP_HZ + 290, 178, "walk"), (1290, RP_HZ + 286, 96, "stand"),
                           (1460, RP_HZ + 190, 132, "sit")):
        b.append(shadow(x, base + 2, ht * 0.20, near, 0.15))
        b.append(figure(x, base, ht, ent, 0.55, k))
    b.append(mist(RP_CX, RP_HZ + 120, 600, 120, 0.11, "softer"))
    return wrap(RP_W, RP_H, gradients(MOODS["noon"], RP_W, RP_H, RP_HZ), "\n".join(b), seed, vignette=0.22)


def pad_pos(dx_frac, depth):
    """A point on the standard surface. depth runs -1 (back edge) to +1 (front)."""
    y = RP_BASE - 6 + RP_RY * depth
    half = RP_RX * math.sqrt(max(0.0, 1.0 - depth * depth))
    return RP_CX + dx_frac * half, y


def module_panels(rng, m):
    """Blades throwing flat sheets of water — a corridor to walk through."""
    top, bot, far, mid, near, ground, accent = m
    dark = mix(near, INK, 0.46)
    out = []
    ranks = ((-0.46, (-0.70, -0.24, 0.24, 0.70)), (0.34, (-0.54, 0.0, 0.54)))
    for depth, cols in ranks:
        for f in cols:
            x, y = pad_pos(f, depth)
            sc = 1.0 + depth * 0.20
            bw, bh = 30 * sc, 272 * sc
            out.append(shadow(x, y + 3, bw * 1.5, near, 0.16))
            out.append(f'  <rect x="{x - bw / 2:.1f}" y="{y - bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="{bw / 2:.1f}" fill="{dark}"/>')
            out.append(f'  <rect x="{x - bw / 2:.1f}" y="{y - bh:.1f}" width="{bw * 0.30:.1f}" height="{bh:.1f}" rx="{bw * 0.15:.1f}" fill="{mix(dark, "#FFFFFF", 0.28)}"/>')
            out.append(f'  <rect x="{x - bw * 0.66:.1f}" y="{y - bh - 11 * sc:.1f}" width="{bw * 1.32:.1f}" height="{11 * sc:.1f}" rx="{3 * sc:.1f}" fill="{accent}" opacity="0.85"/>')
            # the sheet of water falling from the head
            out.append(f'  <rect x="{x - bw * 0.95:.1f}" y="{y - bh * 0.94:.1f}" width="{bw * 1.9:.1f}" height="{bh * 0.88:.1f}" '
                       f'fill="#FFFFFF" opacity="0.27" filter="url(#soft)"/>')
            out.append(droplets(x, y - bh * 0.30, bw * 1.5, bh * 0.30, 22, rng, 0.42))
    out.append(mist(RP_CX, RP_BASE - 120, 340, 100, 0.19, "softer"))
    return "\n".join(out)


def module_spraypoint(rng, m):
    """One low dome throwing arcs to the rim — a single centre of gravity."""
    top, bot, far, mid, near, ground, accent = m
    dark = mix(near, INK, 0.44)
    cy = RP_BASE - 6
    dome_h = 96
    out = [shadow(RP_CX, cy + 12, 150, near, 0.20),
           f'  <ellipse cx="{RP_CX}" cy="{cy}" rx="132" ry="38" fill="{mix(dark, INK, 0.25)}"/>',
           f'  <path d="M{RP_CX - 132},{cy} a132,{dome_h} 0 0,1 264,0 Z" fill="{dark}"/>',
           f'  <path d="M{RP_CX - 132},{cy} a132,{dome_h} 0 0,1 96,-84 l0,84 Z" fill="{mix(dark, "#FFFFFF", 0.16)}"/>',
           f'  <ellipse cx="{RP_CX}" cy="{cy - dome_h + 4}" rx="38" ry="11" fill="{accent}" opacity="0.9"/>']
    ox, oy = RP_CX, cy - dome_h - 4
    for i in range(11):
        a = math.pi * (0.045 + 0.91 * i / 10)
        ex = RP_CX - math.cos(a) * RP_RX * 0.84
        ey = cy + math.sin(a) * RP_RY * 0.30 + 4
        peak = oy - 150 * (0.45 + 0.55 * math.sin(a))
        out.append(f'  <path d="M{ox},{oy} Q{(ox + ex) / 2:.0f},{peak:.0f} {ex:.0f},{ey:.0f}" fill="none" '
                   f'stroke="#FFFFFF" stroke-width="8" stroke-opacity="0.62" stroke-linecap="round"/>')
        out.append(f'  <path d="M{ox},{oy} Q{(ox + ex) / 2:.0f},{peak:.0f} {ex:.0f},{ey:.0f}" fill="none" '
                   f'stroke="#FFFFFF" stroke-width="17" stroke-opacity="0.16" stroke-linecap="round" filter="url(#fine)"/>')
        out.append(droplets(ex, ey - 16, 26, 18, 8, rng, 0.5))
    # ground jets around the rim
    for i in range(9):
        a = math.pi * (0.10 + 0.80 * i / 8)
        jx = RP_CX - math.cos(a) * RP_RX * 0.62
        jy = cy + math.sin(a) * RP_RY * 0.58
        out.append(f'  <path d="M{jx:.0f},{jy:.0f} l0,-{46 + rng.uniform(-12, 16):.0f}" stroke="#FFFFFF" '
                   f'stroke-width="6" stroke-opacity="0.42" stroke-linecap="round" filter="url(#fine)"/>')
    out.append(mist(RP_CX, cy - 150, 265, 98, 0.21, "soft"))
    return "\n".join(out)


def module_basins(rng, m):
    """Stacked basins spilling edge to edge — slower water, for smaller children."""
    top, bot, far, mid, near, ground, accent = m
    dark = mix(near, INK, 0.44)
    pale = mix(dark, "#FFFFFF", 0.34)
    water = mix("#7FA6B0", "#FFFFFF", 0.42)
    cy = RP_BASE - 6
    out = [shadow(RP_CX, cy + 12, 250, near, 0.20)]
    tiers = ((238, 62, cy - 18), (162, 43, cy - 112), (96, 26, cy - 190))
    for i, (rx, ry, ty) in enumerate(tiers):
        out.append(f'  <path d="M{RP_CX - rx},{ty} l0,26 a{rx},{ry} 0 0,0 {rx * 2},0 l0,-26 Z" fill="{mix(dark, INK, 0.18)}"/>')
        out.append(f'  <ellipse cx="{RP_CX}" cy="{ty}" rx="{rx}" ry="{ry}" fill="{pale}"/>')
        out.append(f'  <ellipse cx="{RP_CX}" cy="{ty + 5}" rx="{rx - 14}" ry="{ry - 10}" fill="{water}" opacity="0.9"/>')
        out.append(f'  <ellipse cx="{RP_CX}" cy="{ty}" rx="{rx}" ry="{ry}" fill="none" stroke="{mix(pale, "#FFFFFF", 0.5)}" stroke-width="2.5"/>')
        if i > 0:
            for sgn in (-1, 1):
                x0 = RP_CX + sgn * (rx - 8)
                out.append(f'  <path d="M{x0:.0f},{ty + 3} q{sgn * 20},30 {sgn * 12},{tiers[i - 1][2] - ty - 30}" fill="none" '
                           f'stroke="#FFFFFF" stroke-width="17" stroke-opacity="0.62" stroke-linecap="round" filter="url(#fine)"/>')
                out.append(droplets(x0 + sgn * 16, (ty + tiers[i - 1][2]) / 2, 16, 30, 10, rng, 0.45))
    out.append(f'  <rect x="{RP_CX - 9}" y="{cy - 236}" width="18" height="48" rx="9" fill="{dark}"/>')
    out.append(f'  <circle cx="{RP_CX}" cy="{cy - 242}" r="16" fill="{accent}" opacity="0.9"/>')
    out.append(mist(RP_CX, cy - 130, 225, 80, 0.17, "soft"))
    return "\n".join(out)


def scene_break():
    """A wide, quiet plate for the parallax section break — no product, just place."""
    w, h, hz = 2400, 1000, 560
    m = MOODS["golden"]
    top, bot, far, mid, near, ground, accent = m
    rng = random.Random(88)
    b = [f'  <rect width="{w}" height="{h}" fill="url(#sky)"/>',
         f'  <ellipse cx="{w * 0.30:.0f}" cy="{hz - 20}" rx="{w * 0.26:.0f}" ry="170" fill="#FFF1DC" opacity="0.55" filter="url(#softer)"/>']
    b.append(ridge(hz - 70, w, mix(far, bot, 0.62), rng, 30, 190, 0.7))
    b.append(ridge(hz - 20, w, mix(mid, bot, 0.42), rng, 26, 150, 0.85))
    for i in range(12):
        x = -50 + i * (w / 11) + rng.uniform(-45, 45)
        b.append(tree(x, hz + 6, rng.uniform(150, 260), mix(mid, near, 0.30), rng, 0.9))
    b.append(f'  <rect x="0" y="{hz}" width="{w}" height="{h - hz}" fill="url(#floor)"/>')
    b.append(paving(w, h, hz, mix(near, ground, 0.6), rng, w * 0.38))
    ent = mix(near, "#000000", 0.22)
    for x, base, ht, k in ((520, hz + 150, 118, "walk"), (600, hz + 154, 88, "walk"),
                           (1700, hz + 230, 160, "stand"), (1980, hz + 120, 96, "sit")):
        b.append(shadow(x, base + 2, ht * 0.20, near, 0.14))
        b.append(figure(x, base, ht, ent, 0.5, k))
    b.append(mist(w * 0.5, hz + 60, w * 0.6, 120, 0.26, "softer"))
    return wrap(w, h, gradients(m, w, h, hz), "\n".join(b), 31, vignette=0.30)


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {
        "hero-plaza.svg": scene_hero(),
        "aeris-canopy-mist.svg": scene_product("aeris", "morning", draw_aeris, 21, note_walls=True),
        "abrio-oasis.svg": scene_product("abrio", "golden", draw_abrio, 23),
        "glomist-cloud.svg": scene_product("glomist", "dusk", draw_glomist, 25),
        "rp-modular-panels.svg": rp_frame(module_panels, 41),
        "rp-circular-spraypoint.svg": rp_frame(module_spraypoint, 42),
        "rp-tiered-basins.svg": rp_frame(module_basins, 43),
        "break-park.svg": scene_break(),
    }
    for name, body in files.items():
        with open(os.path.join(OUT, name), "w") as fh:
            fh.write(body)
        print(f"  {name:32} {len(body) / 1024:6.1f} kB")
    print(f"{len(files)} scenes written to assets/img/")


if __name__ == "__main__":
    main()
