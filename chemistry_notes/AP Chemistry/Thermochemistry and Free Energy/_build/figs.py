"""Figures for the Thermochemistry and Free Energy notes (black and gray so they print well)."""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle
from scipy.interpolate import PchipInterpolator

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img")
os.makedirs(OUT, exist_ok=True)
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 8})


def _profile(ax, e_r, e_p, e_ts, title):
    x = np.array([0, 1, 2, 3, 4, 5, 6])
    y = np.array([e_r, e_r, (e_r + e_ts) / 2 - 0.1, e_ts, (e_p + e_ts) / 2 - 0.1, e_p, e_p])
    xs = np.linspace(0, 6, 300)
    ax.plot(xs, PchipInterpolator(x, y)(xs), color="black", lw=1.8)
    ax.hlines(e_r, 0, 1.2, color="gray", ls=":", lw=0.9)
    ax.hlines(e_p, 4.8, 6, color="gray", ls=":", lw=0.9)
    # Ea arrow (reactants to top)
    ax.annotate("", xy=(3, e_ts), xytext=(3, e_r), arrowprops=dict(arrowstyle="<->", lw=1))
    ax.text(3.12, (e_r + e_ts) / 2, "E$_a$", va="center", fontsize=9)
    # delta H arrow (reactants to products)
    ax.annotate("", xy=(5.6, e_p), xytext=(5.6, e_r), arrowprops=dict(arrowstyle="<->", lw=1, color="gray"))
    ax.text(5.05, (e_r + e_p) / 2 + (0.0), "ΔH", va="center", ha="right", fontsize=9)
    ax.text(0.2, e_r + (0.3 if e_r > e_p else -0.9), "reactants", fontsize=8)
    ax.text(5.9, e_p + (0.3 if e_p > e_r else -0.9), "products", fontsize=8, ha="right")
    ax.set_title(title, fontsize=9, fontweight="bold")
    ax.set_xlabel("reaction progress"); ax.set_ylabel("energy")
    ax.set_xticks([]); ax.set_yticks([])
    ax.set_xlim(0, 6.2); ax.set_ylim(0, 10)


def profiles():
    fig, axs = plt.subplots(1, 2, figsize=(6.4, 2.2), dpi=200)
    _profile(axs[0], 6.0, 2.5, 8.7, "Exothermic: ΔH < 0")
    _profile(axs[1], 2.5, 6.0, 8.7, "Endothermic: ΔH > 0")
    fig.tight_layout()
    p = os.path.join(OUT, "profiles.png"); fig.savefig(p); plt.close(fig)
    return p


def blank_axes():
    fig, ax = plt.subplots(figsize=(2.8, 1.6), dpi=200)
    ax.set_xlabel("reaction progress"); ax.set_ylabel("energy")
    ax.set_xticks([]); ax.set_yticks([])
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    for sp in ("top", "right"):
        ax.spines[sp].set_visible(False)
    fig.tight_layout()
    p = os.path.join(OUT, "axes.png"); fig.savefig(p); plt.close(fig)
    return p


def heating_curve():
    fig, ax = plt.subplots(figsize=(4.4, 2.5), dpi=200)
    pts = {"A": (0.0, 1.0), "B": (2.0, 3.0), "C": (4.6, 3.0), "D": (7.4, 6.2), "E": (9.4, 6.2), "F": (11.0, 8.0)}
    xs = [pts[k][0] for k in "ABCDEF"]; ys = [pts[k][1] for k in "ABCDEF"]
    ax.plot(xs, ys, color="black", lw=2)
    for k, (x, y) in pts.items():
        ax.plot([x], [y], "o", color="black", ms=3.5)
        dx, dy = {"A": (-0.35, -0.2), "B": (-0.4, 0.2), "C": (0.1, -0.7), "D": (-0.4, 0.2), "E": (0.1, -0.7), "F": (0.0, 0.3)}[k]
        ax.text(x + dx, y + dy, k, fontsize=9, fontweight="bold")
    ax.text(0.75, 2.6, "solid", fontsize=7.5, rotation=0, ha="center")
    ax.text(3.3, 3.4, "solid + liquid", fontsize=7.5, ha="center")
    ax.text(5.5, 5.5, "liquid", fontsize=7.5, ha="center")
    ax.text(8.4, 6.5, "liquid + gas", fontsize=7.5, ha="center")
    ax.text(9.8, 8.1, "gas", fontsize=7.5, ha="center")
    ax.set_xlabel("energy added (time)"); ax.set_ylabel("temperature (°C)")
    ax.set_xticks([]); ax.set_yticks([])
    ax.set_xlim(-0.8, 11.6); ax.set_ylim(0, 9)
    for sp in ("top", "right"):
        ax.spines[sp].set_visible(False)
    fig.tight_layout()
    p = os.path.join(OUT, "heating.png"); fig.savefig(p); plt.close(fig)
    return p


def entropy_states():
    rng = np.random.default_rng(4)
    fig, axs = plt.subplots(1, 3, figsize=(5.2, 1.7), dpi=200)
    r = 0.09
    # solid: ordered grid at the bottom
    pos = [(0.22 + 0.19 * i, 0.12 + 0.19 * j) for j in range(2) for i in range(4)]
    axs[0].set_title("solid", fontsize=9)
    # liquid: loose, touching, lower half
    liq = []
    while len(liq) < 8:
        c = (rng.uniform(0.12, 0.88), rng.uniform(0.1, 0.5))
        if all((c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 > (1.9 * r) ** 2 for q in liq):
            liq.append(c)
    axs[1].set_title("liquid", fontsize=9)
    gas = []
    while len(gas) < 8:
        c = (rng.uniform(0.12, 0.88), rng.uniform(0.12, 0.88))
        if all((c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 > (2.6 * r) ** 2 for q in gas):
            gas.append(c)
    axs[2].set_title("gas", fontsize=9)
    for ax, ps in zip(axs, (pos, liq, gas)):
        ax.add_patch(Rectangle((0, 0), 1, 1, fill=False, lw=1.4, ec="black"))
        for c in ps:
            ax.add_patch(Circle(c, r, fc="#BBBBBB", ec="black", lw=0.8))
        ax.set_xlim(-0.05, 1.05); ax.set_ylim(-0.05, 1.05); ax.set_aspect("equal"); ax.axis("off")
    fig.text(0.5, 0.01, "greater entropy (more microstates)  →", ha="center", fontsize=8)
    fig.tight_layout(rect=(0, 0.07, 1, 1))
    p = os.path.join(OUT, "entropy.png"); fig.savefig(p); plt.close(fig)
    return p


def all_figs():
    return dict(profiles=profiles(), axes=blank_axes(), heating=heating_curve(), entropy=entropy_states())


if __name__ == "__main__":
    print(all_figs())
