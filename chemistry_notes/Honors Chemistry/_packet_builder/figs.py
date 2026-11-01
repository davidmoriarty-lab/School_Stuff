"""Figures for the Unit 7 Gases packet (grayscale, print friendly)."""
import math, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle, FancyArrowPatch, Polygon, FancyBboxPatch

OUT = os.path.join(os.path.dirname(__file__), "img")
os.makedirs(OUT, exist_ok=True)
DPI = 220
INK = "#191919"


def _particles(ax, x0, y0, w, h, n, arrow_scale, seed, r=0.07, arrows=True):
    rng = np.random.default_rng(seed)
    pts = []
    tries = 0
    while len(pts) < n and tries < 5000:
        tries += 1
        x = rng.uniform(x0 + 0.18 * w, x0 + 0.82 * w)
        y = rng.uniform(y0 + 0.18 * h, y0 + 0.82 * h)
        if all(math.hypot(x - a, y - b) > 0.32 * min(w, h) for a, b in pts):
            pts.append((x, y))
    for (x, y) in pts:
        ang = rng.uniform(0, 2 * math.pi)
        ln = arrow_scale * rng.uniform(0.35, 1.0) * 0.30 * min(w, h)
        ax.add_patch(Circle((x, y), r * min(w, h) / 1.0, fc="white", ec=INK, lw=1.0, zorder=3))
        if arrows:
            ax.add_patch(FancyArrowPatch((x, y), (x + ln * math.cos(ang), y + ln * math.sin(ang)),
                                         arrowstyle="-|>", mutation_scale=7, color=INK, lw=0.9, zorder=2))


def particle_box(name, w=1.0, h=1.0, n=6, scale=1.0, seed=3, size=(1.9, 1.5)):
    fig = plt.figure(figsize=size, dpi=DPI)
    ax = fig.add_axes([0.02, 0.02, 0.96, 0.96])
    ax.set_xlim(0, size[0]); ax.set_ylim(0, size[1]); ax.axis("off")
    bw, bh = size[0] * 0.9 * w, size[1] * 0.9 * h
    x0 = (size[0] - bw) / 2; y0 = (size[1] - bh) / 2
    ax.add_patch(Rectangle((x0, y0), bw, bh, fc="white", ec=INK, lw=1.6))
    _particles(ax, x0, y0, bw, bh, n, scale, seed)
    p = os.path.join(OUT, name)
    fig.savefig(p, dpi=DPI); plt.close(fig)
    return p


def kmt_container():
    return particle_box("kmt_container.png", w=1.0, h=1.0, n=6, scale=1.0, seed=7, size=(2.0, 1.55))


def kmt_answers():
    return [
        particle_box("kmt_a1.png", 1.0, 1.0, 6, 2.0, 11, (1.9, 1.5)),     # higher T: longer arrows
        particle_box("kmt_a2.png", 1.0, 1.0, 3, 1.0, 5, (1.9, 1.5)),      # half the particles
        particle_box("kmt_a3.png", 0.62, 0.62, 6, 1.0, 21, (1.9, 1.5)),   # smaller volume
        particle_box("kmt_a4.png", 1.0, 1.0, 6, 1.0, 4, (2.6, 1.5)),      # larger volume (wider cell)
    ]


def molar_mass_fig(teacher):
    fig = plt.figure(figsize=(5.4, 1.75), dpi=DPI)
    ax = fig.add_axes([0.01, 0.01, 0.98, 0.98])
    ax.set_xlim(0, 5.4); ax.set_ylim(0, 1.75); ax.axis("off")
    # left: liquid
    ax.add_patch(Rectangle((0.3, 0.35), 1.5, 1.05, fc="white", ec=INK, lw=1.6))
    ax.add_patch(Rectangle((0.3, 0.35), 1.5, 0.38, fc="#CFCFCF", ec=INK, lw=0.8))
    ax.text(1.05, 0.54, "liquid", ha="center", va="center", fontsize=8, color=INK)
    ax.text(1.05, 0.12, "5 grams of Substance A", ha="center", va="center", fontsize=8.5, color=INK)
    ax.annotate("", xy=(3.0, 0.88), xytext=(2.1, 0.88),
                arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.4))
    ax.text(2.55, 1.02, "evaporates", ha="center", va="bottom", fontsize=8, color=INK, style="italic")
    # right: gas
    ax.add_patch(Rectangle((3.3, 0.35), 1.5, 1.05, fc="white", ec=INK, lw=1.6))
    _particles(ax, 3.3, 0.35, 1.5, 1.05, 5, 0.0, 9, r=0.07, arrows=False)
    lab = "5 grams of Substance A" if teacher else "_____ grams of Substance A"
    ax.text(4.05, 0.12, lab, ha="center", va="center", fontsize=8.5, color=INK)
    p = os.path.join(OUT, "molar_mass_%s.png" % ("t" if teacher else "s"))
    fig.savefig(p, dpi=DPI); plt.close(fig)
    return p


def apparatus(teacher):
    W, H = 4.8, 2.45
    fig = plt.figure(figsize=(W, H), dpi=DPI)
    ax = fig.add_axes([0.0, 0.0, 1.0, 1.0])
    ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis("off")
    # ring stand
    ax.add_patch(Rectangle((0.15, 0.08), 0.95, 0.07, fc="#8C8C8C", ec=INK, lw=0.8))
    ax.add_patch(Rectangle((0.28, 0.15), 0.06, 2.0, fc="#8C8C8C", ec=INK, lw=0.8))
    ax.add_patch(Rectangle((0.28, 1.72), 0.62, 0.05, fc="#8C8C8C", ec=INK, lw=0.8))
    # test tube
    ax.add_patch(FancyBboxPatch((0.82, 1.0), 0.2, 1.05, boxstyle="round,pad=0,rounding_size=0.09",
                                fc="white", ec=INK, lw=1.3))
    ax.add_patch(Rectangle((0.84, 1.03), 0.16, 0.22, fc="#BFBFBF", ec="none"))
    ax.add_patch(Rectangle((0.80, 1.92), 0.24, 0.12, fc="#6E6E6E", ec=INK, lw=0.8))
    # burner + flame
    ax.add_patch(Rectangle((0.84, 0.15), 0.16, 0.45, fc="#6E6E6E", ec=INK, lw=0.8))
    ax.add_patch(Polygon([[0.86, 0.6], [0.98, 0.6], [0.92, 0.93]], fc="#E3E3E3", ec=INK, lw=0.9))
    # delivery tube
    ax.plot([0.92, 0.92, 3.0, 3.0], [2.04, 2.30, 2.30, 1.0], color=INK, lw=1.5, solid_capstyle="round")
    # water trough
    ax.add_patch(Rectangle((2.35, 0.18), 1.9, 0.95, fc="white", ec=INK, lw=1.5))
    ax.add_patch(Rectangle((2.37, 0.2), 1.86, 0.62, fc="#E3E3E3", ec="none"))
    # inverted collection tube
    ax.add_patch(Rectangle((2.83, 0.55), 0.34, 1.35, fc="white", ec=INK, lw=1.3))
    ax.add_patch(Rectangle((2.85, 0.57), 0.30, 0.58, fc="#E3E3E3", ec="none"))
    for (x, y) in [(2.93, 1.3), (3.05, 1.5), (2.97, 1.68)]:
        ax.add_patch(Circle((x, y), 0.035, fc="white", ec=INK, lw=0.7))
    boxes = [((1.2, 1.3, 1.15, 0.62), (1.02, 1.5)), ((3.4, 1.45, 1.3, 0.62), (3.17, 1.7))]
    txt = ["Reaction occurs here:\nheated test tube\n2NaN$_3$ \u2192 2Na + 3N$_2$",
           "N$_2$ is collected here\n(gas pushes water out\nof the inverted tube)"]
    for i, ((bx, by, bw, bh), tip) in enumerate(boxes):
        ax.add_patch(Rectangle((bx, by), bw, bh, fc="#D9D9D9" if teacher else "white", ec=INK, lw=0.9, zorder=4))
        ax.plot([tip[0], bx if tip[0] < bx else bx], [tip[1], tip[1]], color=INK, lw=0.8, zorder=3)
        if teacher:
            ax.text(bx + bw / 2, by + bh / 2, txt[i], ha="center", va="center", fontsize=6.4, color=INK, zorder=5)
    p = os.path.join(OUT, "apparatus_%s.png" % ("t" if teacher else "s"))
    fig.savefig(p, dpi=DPI); plt.close(fig)
    return p


def blank_graph(teacher):
    fig = plt.figure(figsize=(3.4, 2.25), dpi=DPI)
    ax = fig.add_axes([0.17, 0.2, 0.78, 0.74])
    ax.set_xlim(0, 6); ax.set_ylim(0, 14)
    ax.set_xticks(range(0, 7)); ax.set_yticks(range(0, 15, 2))
    ax.grid(True, color="#8C8C8C", lw=0.5)
    ax.tick_params(labelsize=7, colors=INK)
    ax.set_xlabel("Pressure (atm)", fontsize=8, color=INK)
    ax.set_ylabel("Volume (L)", fontsize=8, color=INK)
    for s in ax.spines.values():
        s.set_color(INK)
    if teacher:
        P = [1.0, 2.0, 4.0, 5.0]; V = [12.0, 6.0, 3.0, 2.4]
        xs = np.linspace(0.85, 5.5, 100)
        ax.plot(xs, 12.0 / xs, color=INK, lw=1.0)
        ax.plot(P, V, "o", color=INK, ms=4.5)
    p = os.path.join(OUT, "graph_%s.png" % ("t" if teacher else "s"))
    fig.savefig(p, dpi=DPI); plt.close(fig)
    return p


if __name__ == "__main__":
    kmt_container(); kmt_answers(); molar_mass_fig(False); molar_mass_fig(True)
    apparatus(False); apparatus(True); blank_graph(False); blank_graph(True)
    print(sorted(os.listdir(OUT)))
