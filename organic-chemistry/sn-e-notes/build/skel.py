"""Skeletal-structure and reaction-scheme drawing with matplotlib only (no RDKit).

A molecule is built from a zigzag chain and/or a ring; substituents are labelled atoms (Br, OH ...) or bare lines (methyl).
    chain(n, subs={atom: [(label, style, slot)]}, double=[(i, j)], up_first=True)
    ring(n, subs={atom: [(label, style)]}, double=[(i, j)])
style: 'plain' | 'wedge' | 'dash'.   label '' draws a bare line (a CH3 group); label 'Et'/'Me' etc. are drawn as text.
scheme(items, path) lays molecules, '+' signs, arrows with reagents and '?' side by side.
Everything is drawn from coordinates, so the pictures are exact for the structures given; the structures are checked by eye.
"""
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

INK = "#1b1f23"
FONT = "DejaVu Sans"
LABEL_PAD = 0.30            # bond shortened this much at a labelled atom


class Mol:
    def __init__(self):
        self.atoms = []         # (x, y, label)
        self.bonds = []         # (i, j, style)  style: plain, double, wedge, dash, triple
        self.caption = ""
        self.charge = {}        # atom index -> formal charge (drawn as a circled + or -)

    def add(self, x, y, label="", charge=0):
        self.atoms.append((x, y, label))
        if charge:
            self.charge[len(self.atoms) - 1] = charge
        return len(self.atoms) - 1

    def bond(self, i, j, style="plain"):
        self.bonds.append((i, j, style))

    def bbox(self):
        xs = [a[0] for a in self.atoms]
        ys = [a[1] for a in self.atoms]
        return min(xs) - 0.45, max(xs) + 0.45, min(ys) - 0.45, max(ys) + 0.45


def _polar(x, y, ang, r=1.0):
    return x + r * math.cos(math.radians(ang)), y + r * math.sin(math.radians(ang))


def _attach(m, idx, subs, free_angles):
    """subs: [(label, style)] placed in free angles (first free angle first)."""
    x, y, _ = m.atoms[idx]
    for k, s in enumerate(subs):
        label, style = s[0], (s[1] if len(s) > 1 else "plain")
        ang = s[2] if len(s) > 2 else free_angles[min(k, len(free_angles) - 1)]
        nx, ny = _polar(x, y, ang)
        j = m.add(nx, ny, label)
        m.bond(idx, j, style)


def chain(n, subs=None, double=(), triple=(), up_first=True, end_labels=None, caption=""):
    """A zigzag of n carbons.  subs: {i: [(label, style[, angle])]}.  end_labels: {i: 'OH'} replaces the carbon by a label."""
    subs = subs or {}
    end_labels = end_labels or {}
    m = Mol()
    m.caption = caption
    pts = []
    for i in range(n):
        up = (i % 2 == 0) == up_first
        x, y = i * math.cos(math.radians(30)), (0.5 if up else 0.0)
        pts.append((x, y, up))
        m.add(x, y, end_labels.get(i, ""))
    for i in range(n - 1):
        st = "double" if (i, i + 1) in double else ("triple" if (i, i + 1) in triple else "plain")
        m.bond(i, i + 1, st)
    for i, lst in subs.items():
        up = pts[i][2]
        # free directions point away from the zigzag
        free = [90, 50, 130] if up else [270, 310, 230]
        if len(lst) == 2 and all(len(s) < 3 for s in lst):
            free = [60, 120] if up else [300, 240]
        _attach(m, i, lst, free)
    return m


def ring(n, subs=None, double=(), caption="", start_angle=None, labels=None):
    subs = subs or {}
    m = Mol()
    m.caption = caption
    r = 1.0 / (2 * math.sin(math.pi / n))
    a0 = start_angle if start_angle is not None else (90 if n % 2 else 90)
    angs = [a0 + 360.0 * i / n for i in range(n)]
    for i, a in enumerate(angs):
        x, y = _polar(0, 0, a, r)
        m.add(x, y, (labels or {}).get(i, ""))
    for i in range(n):
        j = (i + 1) % n
        m.bond(i, j, "double" if ((i, j) in double or (j, i) in double) else "plain")
    for i, lst in subs.items():
        x, y, _ = m.atoms[i]
        out = angs[i]
        _attach(m, i, lst, [out] if len(lst) == 1 else [out - 28, out + 28])
    return m


def _shorten(p, q, lab_p, lab_q):
    (x1, y1), (x2, y2) = p, q
    d = math.hypot(x2 - x1, y2 - y1)
    ux, uy = (x2 - x1) / d, (y2 - y1) / d
    s = LABEL_PAD if lab_p else 0.0
    e = LABEL_PAD if lab_q else 0.0
    return (x1 + ux * s, y1 + uy * s), (x2 - ux * e, y2 - uy * e), (ux, uy)


def draw_mol(ax, m, ox=0.0, oy=0.0, size=11, lw=1.6):
    P = lambda i: (m.atoms[i][0] + ox, m.atoms[i][1] + oy)
    for i, j, st in m.bonds:
        a, b, (ux, uy) = _shorten(P(i), P(j), m.atoms[i][2], m.atoms[j][2])
        nx, ny = -uy, ux
        if st in ("plain",):
            ax.plot([a[0], b[0]], [a[1], b[1]], color=INK, lw=lw, solid_capstyle="round", zorder=2)
        elif st == "double":
            for s in (-0.07, 0.07):
                ax.plot([a[0] + nx * s, b[0] + nx * s], [a[1] + ny * s, b[1] + ny * s], color=INK, lw=lw, solid_capstyle="round", zorder=2)
        elif st == "triple":
            for s in (-0.1, 0, 0.1):
                ax.plot([a[0] + nx * s, b[0] + nx * s], [a[1] + ny * s, b[1] + ny * s], color=INK, lw=lw, solid_capstyle="round", zorder=2)
        elif st == "wedge":
            w = 0.11
            ax.add_patch(Polygon([a, (b[0] + nx * w, b[1] + ny * w), (b[0] - nx * w, b[1] - ny * w)], closed=True, fc=INK, ec=INK, lw=0.5, zorder=2))
        elif st == "dash":
            for k in range(1, 8):
                t = k / 8.0
                cx, cy = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                w = 0.015 + 0.10 * t
                ax.plot([cx - nx * w, cx + nx * w], [cy - ny * w, cy + ny * w], color=INK, lw=lw * 0.8, zorder=2)
    for i, (x, y, lab) in enumerate(m.atoms):
        if lab:
            ax.text(x + ox, y + oy, lab, ha="center", va="center", fontsize=size, color=INK, family=FONT, zorder=3)
    for i, q in getattr(m, "charge", {}).items():
        x, y, lab = m.atoms[i]
        # put the charge on the side away from the bonds
        vx = vy = 0.0
        for a, b, _ in m.bonds:
            if a == i or b == i:
                o = m.atoms[b if a == i else a]
                d = math.hypot(o[0] - x, o[1] - y) or 1.0
                vx += (o[0] - x) / d
                vy += (o[1] - y) / d
        n = math.hypot(vx, vy)
        if n > 0.3:
            ux, uy = -vx / n, -vy / n
        else:                                   # balanced bonds: use the middle of the largest angular gap
            angs = sorted(math.degrees(math.atan2(m.atoms[b if a == i else a][1] - y, m.atoms[b if a == i else a][0] - x)) % 360
                          for a, b, _ in m.bonds if a == i or b == i)
            if not angs:
                ux, uy = 0.0, 1.0
            else:
                gaps = [((angs[(k + 1) % len(angs)] - angs[k]) % 360 or 360, angs[k]) for k in range(len(angs))]
                g, start = max(gaps)
                mid = math.radians(start + g / 2)
                ux, uy = math.cos(mid), math.sin(mid)
        r = 0.42 if lab else 0.34
        cx, cy = x + ox + ux * r, y + oy + uy * r
        if lab and len(lab) > 1:
            cx += 0.12 * (1 if ux >= 0 else -1) * min(len(lab), 3) / 2
        ax.add_patch(plt.Circle((cx, cy), 0.13, fc="white", ec=INK, lw=1.0, zorder=4))
        ax.text(cx, cy - 0.005, "+" if q > 0 else "–", ha="center", va="center", fontsize=size - 3, color=INK, family=FONT, zorder=5)


def scheme(items, path, height=None, gap=0.55, size=11, dpi=200, scale=0.55):
    """items: Mol | str ('+', '?', 'text') | ('arrow', above, below) | ('gap', width) | ('lbl', text)
    Writes a PNG.  Returns the figure size (inches)."""
    # first pass: widths
    plan = []
    x = 0.0
    ymin, ymax = 0.0, 0.0
    for it in items:
        if isinstance(it, Mol):
            x0, x1, y0, y1 = it.bbox()
            w = x1 - x0
            plan.append(("mol", it, x - x0, w))
            ymin, ymax = min(ymin, y0), max(ymax, y1)
            x += w + gap
        elif isinstance(it, tuple) and it[0] == "arrow":
            above, below = it[1], it[2] if len(it) > 2 else ""
            longest = max([len(s) for s in (above + "\n" + below).split("\n")] + [3])
            w = max(1.6, 0.17 * longest)
            if len(it) > 3:
                w = it[3]
            plan.append(("arrow", it, x, w))
            x += w + gap
        elif isinstance(it, tuple) and it[0] == "gap":
            x += it[1]
        elif isinstance(it, tuple) and it[0] == "lbl":
            plan.append(("lbl", it[1], x, 0.7))
            x += 0.7 + gap * 0.3
        else:
            w = 0.5 if len(str(it)) <= 1 else 0.34 * len(str(it))
            plan.append(("txt", it, x, w))
            x += w + gap * 0.6
    total = x - gap
    # vertical range: allow arrow reagent text
    ymin = min(ymin, -0.6)
    ymax = max(ymax, 1.0)
    fig_w, fig_h = total * scale, (ymax - ymin) * scale
    fig = plt.figure(figsize=(fig_w, fig_h))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(-0.1, total + 0.1)
    ax.set_ylim(ymin, ymax)
    ax.axis("off")
    ax.set_aspect("equal")
    mid = 0.25
    for kind, it, x0, w in plan:
        if kind == "mol":
            draw_mol(ax, it, ox=x0, oy=0, size=size)
            if it.caption:
                bx0, bx1, by0, by1 = it.bbox()
                ax.text(x0 + (bx0 + bx1) / 2, by0 - 0.12, it.caption, ha="center", va="top", fontsize=size - 2, color="#555", family=FONT)
        elif kind == "arrow":
            _, above, below = it[0], it[1], (it[2] if len(it) > 2 else "")
            ax.annotate("", xy=(x0 + w, mid), xytext=(x0, mid), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.4, shrinkA=0, shrinkB=0))
            for k, line in enumerate(reversed(above.split("\n")) if above else []):
                ax.text(x0 + w / 2, mid + 0.14 + 0.32 * k, line, ha="center", va="bottom", fontsize=size - 1, color=INK, family=FONT)
            for k, line in enumerate(below.split("\n") if below else []):
                ax.text(x0 + w / 2, mid - 0.14 - 0.32 * k, line, ha="center", va="top", fontsize=size - 1, color=INK, family=FONT)
        elif kind == "lbl":
            ax.text(x0, mid, it, ha="left", va="center", fontsize=size + 1, color=INK, family=FONT, fontweight="bold")
        else:
            big = it == "?"
            ax.text(x0 + w / 2, mid if not big else mid, it, ha="center", va="center",
                    fontsize=size + (14 if big else 3), color="#0c8599" if big else INK, family=FONT, fontweight="bold" if big else "normal")
    fig.savefig(path, dpi=dpi, transparent=False, facecolor="white")
    plt.close(fig)
    return fig_w, fig_h
