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
    """A crucible with its lid ajar on a clay triangle, heated by a burner (same picture in both editions)."""
    W, H = 3.3, 2.5
    fig = plt.figure(figsize=(W, H), dpi=DPI)
    ax = fig.add_axes([0.005, 0.005, 0.99, 0.99])
    ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
    # stand rod and ring
    ax.add_patch(Rectangle((0.28, 0.12), 0.07, 2.1, fc="#8C8C8C", ec=INK, lw=1.0))
    ax.add_patch(Rectangle((0.2, 0.08), 0.9, 0.07, fc="#8C8C8C", ec=INK, lw=1.0))
    ax.plot([0.35, 1.45], [1.28, 1.28], color=INK, lw=2.0)
    ax.add_patch(Ellipse((1.55, 1.28), 0.9, 0.12, fc="none", ec=INK, lw=1.8))
    # clay triangle
    ax.add_patch(Polygon([[1.2, 1.29], [1.9, 1.29], [1.55, 0.78]], closed=True, fc="none", ec=INK, lw=2.2))
    # crucible
    ax.add_patch(Polygon([[1.28, 1.34], [1.82, 1.34], [1.74, 0.92], [1.36, 0.92]], closed=True, fc="white", ec=INK, lw=1.6))
    for (x, y) in [(1.46, 1.0), (1.54, 1.02), (1.62, 1.0), (1.5, 1.07), (1.6, 1.08)]:
        ax.add_patch(Rectangle((x, y), 0.05, 0.04, fc="#9A9A9A", ec=INK, lw=0.5))
    # lid, ajar
    ax.add_patch(Polygon([[1.3, 1.43], [1.86, 1.52], [1.84, 1.56], [1.28, 1.47]], closed=True, fc="#BDBDBD", ec=INK, lw=1.2))
    # burner and flame
    ax.add_patch(Rectangle((1.45, 0.12), 0.2, 0.5, fc="#8C8C8C", ec=INK, lw=1.2))
    ax.add_patch(Polygon([[1.55, 0.62], [1.46, 0.78], [1.5, 0.9], [1.55, 0.84], [1.6, 0.9], [1.64, 0.78]], closed=True,
                         fc="#E6E6E6", ec=INK, lw=1.0))
    ax.add_patch(Rectangle((1.3, 0.08), 0.5, 0.06, fc="#8C8C8C", ec=INK, lw=1.0))
    # labels
    kw = dict(fontsize=7.5, color=INK)
    ax.annotate("lid (slightly open)", xy=(1.85, 1.5), xytext=(2.15, 1.9), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("crucible", xy=(1.8, 1.18), xytext=(2.25, 1.45), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("hydrate sample", xy=(1.65, 1.04), xytext=(2.25, 0.95), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("clay triangle", xy=(1.78, 1.04), xytext=(2.25, 1.2), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    ax.annotate("burner", xy=(1.65, 0.4), xytext=(2.25, 0.4), arrowprops=dict(arrowstyle="-", color=INK, lw=0.8), **kw)
    p = os.path.join(OUT, "hydrate.png")
    fig.savefig(p, dpi=DPI); plt.close(fig)
    return p


if __name__ == "__main__":
    mole_map(False); mole_map(True); hydrate_apparatus()
    print(sorted(f for f in os.listdir(OUT) if f.startswith(("mole_map", "hydrate"))))
