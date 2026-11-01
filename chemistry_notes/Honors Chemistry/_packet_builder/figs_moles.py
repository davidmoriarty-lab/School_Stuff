"""Figures for the Unit 6 Moles and Molar Quantities packet (grayscale, print friendly)."""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch, Polygon, Ellipse

OUT = os.path.join(os.path.dirname(__file__), "img")
os.makedirs(OUT, exist_ok=True)
DPI = 220
INK = "#191919"


def _box(ax, x, y, w, h, title, sub=None, fc="#EDEDED"):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.06", fc=fc, ec=INK, lw=1.5))
    ax.text(x + w / 2, y + h / 2 + (0.1 if sub else 0), title, ha="center", va="center", fontsize=10, fontweight="bold", color=INK)
    if sub:
        ax.text(x + w / 2, y + h / 2 - 0.13, sub, ha="center", va="center", fontsize=7, color=INK)


def _arrow(ax, p, q, label, teacher, above=True, rot=0, fs=7.5):
    ax.annotate("", xy=q, xytext=p, arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.4, shrinkA=0, shrinkB=0))
    if label == "":
        return
    mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
    txt = label if teacher else "_________"
    dx, dy = (0, 0.1) if above else (0, -0.1)
    ax.text(mx + dx, my + dy, txt, ha="center", va="bottom" if above else "top", fontsize=fs, color=INK,
            rotation=rot, bbox=dict(fc="white", ec="none", pad=0.6))


def mole_map(teacher):
    """The mole map: particles <-> moles <-> grams, and moles <-> liters of gas at STP.
    Student copy has blank arrow labels; the teacher copy fills them in."""
    W, H = 6.6, 2.55
    fig = plt.figure(figsize=(W, H), dpi=DPI)
    ax = fig.add_axes([0.005, 0.005, 0.99, 0.99])
    ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
    _box(ax, 0.1, 0.95, 1.55, 0.85, "PARTICLES", "atoms, molecules,\nformula units")
    _box(ax, 2.55, 0.95, 1.5, 0.85, "MOLES", "the counting unit", fc="#D9D9D9")
    _box(ax, 4.95, 0.95, 1.55, 0.85, "GRAMS", "mass on a balance")
    _box(ax, 2.55, 0.06, 1.5, 0.58, "LITERS", "gas at STP")
    # particles <-> moles
    _arrow(ax, (1.7, 1.57), (2.5, 1.57), "÷ 6.022 × 10²³", teacher)
    _arrow(ax, (2.5, 1.17), (1.7, 1.17), "× 6.022 × 10²³", teacher, above=False)
    # moles <-> grams
    _arrow(ax, (4.1, 1.57), (4.9, 1.57), "× molar mass", teacher)
    _arrow(ax, (4.9, 1.17), (4.1, 1.17), "÷ molar mass", teacher, above=False)
    # moles <-> liters
    _arrow(ax, (3.0, 0.93), (3.0, 0.68), "", teacher)
    _arrow(ax, (3.6, 0.68), (3.6, 0.93), "", teacher)
    ax.text(2.9, 0.8, "× 22.4 L/mol" if teacher else "______", ha="right", va="center", fontsize=7.5, color=INK,
            bbox=dict(fc="white", ec="none", pad=0.6))
    ax.text(3.7, 0.8, "÷ 22.4 L/mol" if teacher else "______", ha="left", va="center", fontsize=7.5, color=INK,
            bbox=dict(fc="white", ec="none", pad=0.6))
    ax.text(W / 2, H - 0.1, "Every conversion goes through moles", ha="center", va="top", fontsize=9, style="italic",
            color=INK)
    p = os.path.join(OUT, "mole_map_%s.png" % ("t" if teacher else "s"))
    fig.savefig(p, dpi=DPI); plt.close(fig)
    return p


def hydrate_apparatus():
    """Heating a hydrate: Bunsen burner under a tripod, clay triangle, crucible with lid ajar (same picture in both editions)."""
    W, H = 3.6, 2.7
    fig = plt.figure(figsize=(W, H), dpi=DPI)
    ax = fig.add_axes([0.005, 0.005, 0.99, 0.99])
    ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
    kw = dict(fontsize=7.5, color=INK, va="center")
    # tripod: top ring and three legs (two seen)
    ax.add_patch(Rectangle((0.35, 1.5), 1.5, 0.06, fc="#BDBDBD", ec=INK, lw=1.2))
    ax.plot([0.45, 0.2], [1.5, 0.08], color=INK, lw=2.0)
    ax.plot([1.75, 2.0], [1.5, 0.08], color=INK, lw=2.0)
    # clay triangle: a bar on the tripod with two arms cradling the crucible
    ax.plot([0.7, 1.4], [1.6, 1.6], color=INK, lw=2.6)
    ax.plot([0.7, 0.86], [1.6, 1.8], color=INK, lw=2.0)
    ax.plot([1.4, 1.24], [1.6, 1.8], color=INK, lw=2.0)
    # crucible sitting in the triangle
    ax.add_patch(Polygon([[0.8, 2.12], [1.3, 2.12], [1.22, 1.66], [0.88, 1.66]], closed=True, fc="white", ec=INK, lw=1.6))
    for (x, y) in [(0.95, 1.7), (1.02, 1.72), (1.09, 1.7), (0.99, 1.77), (1.07, 1.78)]:
        ax.add_patch(Rectangle((x, y), 0.05, 0.04, fc="#9A9A9A", ec=INK, lw=0.5))
    # lid, ajar: resting on the rim, tipped up on one side
    ax.add_patch(Polygon([[0.8, 2.13], [1.36, 2.24], [1.35, 2.28], [0.79, 2.17]], closed=True, fc="#BDBDBD", ec=INK, lw=1.2))
    # Bunsen burner: barrel, collar, base, flame
    ax.add_patch(Rectangle((0.99, 0.35), 0.12, 0.62, fc="#E0E0E0", ec=INK, lw=1.2))
    ax.add_patch(Rectangle((0.95, 0.35), 0.2, 0.18, fc="#8C8C8C", ec=INK, lw=1.2))
    ax.add_patch(Rectangle((0.62, 0.08), 0.86, 0.07, fc="#8C8C8C", ec=INK, lw=1.2))
    ax.add_patch(Polygon([[1.05, 0.97], [0.95, 1.15], [1.0, 1.32], [1.05, 1.25], [1.1, 1.32], [1.15, 1.15]], closed=True,
                         fc="#E6E6E6", ec=INK, lw=1.0))
    # labels with leader lines
    ax.annotate("crucible with lid\n(slightly open)", xy=(1.35, 2.24), xytext=(2.15, 2.4), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("hydrate sample", xy=(1.14, 1.82), xytext=(2.15, 1.98), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("clay triangle", xy=(1.3, 1.62), xytext=(2.15, 1.7), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("tripod", xy=(1.85, 1.3), xytext=(2.3, 1.2), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("Bunsen burner", xy=(1.11, 0.65), xytext=(2.3, 0.6), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    p = os.path.join(OUT, "hydrate.png")
    fig.savefig(p, dpi=DPI); plt.close(fig)
    return p


if __name__ == "__main__":
    mole_map(False); mole_map(True); hydrate_apparatus()
    print(sorted(f for f in os.listdir(OUT) if f.startswith(("mole_map", "hydrate"))))
