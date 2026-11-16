"""Model figures for the Acid-Base and Buffer sample test answer key (Q21e titration curve, Q22a pressure curves)."""
import math, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.interpolate import PchipInterpolator

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img")
os.makedirs(OUT, exist_ok=True)
KA, KW = 6.46e-5, 1e-14
N_HA = 0.549 / 122.13          # mol benzoic acid (7(12.01) + 6(1.01) + 2(16.00))
V0 = 0.0250                    # L, the 25.0 mL sample used in part (b)


def ph_at(vb_ml):
    nb = 0.150 * vb_ml / 1000
    V = V0 + vb_ml / 1000
    cna, ct = nb / V, N_HA / V
    lo, hi = 1e-14, 1.0
    for _ in range(200):
        h = math.sqrt(lo * hi)
        f = cna + h - ct * KA / (KA + h) - KW / h
        if f > 0:
            hi = h
        else:
            lo = h
    return -math.log10(h)


def titration():
    v = np.concatenate([np.linspace(0, 29, 300), np.linspace(29, 31, 400), np.linspace(31, 45, 100)])
    ph = [ph_at(x) for x in v]
    fig, ax = plt.subplots(figsize=(5.6, 4.1), dpi=200)
    ax.plot(v, ph, color="#1f4e9c", lw=2.2)
    ax.set_xlim(0, 45); ax.set_ylim(0, 13)
    ax.set_xticks(range(0, 46, 5)); ax.set_yticks(range(0, 13, 2))
    ax.grid(True, ls="--", lw=0.6, color="#999999")
    ax.set_xlabel("Volume of NaOH added (mL)"); ax.set_ylabel("pH")
    pts = [(0, ph_at(0), "start: pH ≈ 2.5", (2, -0.9)), (15.0, 4.19, "half-equivalence\n15.0 mL, pH = pKₐ = 4.19", (3, -2.6)),
           (30.0, 8.55, "equivalence\n30.0 mL, pH ≈ 8.5", (3.5, -1.2))]
    for x, y, t, off in pts:
        ax.plot([x], [y], "o", color="#c0392b", ms=5)
        ax.annotate(t, (x, y), xytext=(x + off[0], y + off[1] + (1.6 if x == 0 else 0)), fontsize=7.5,
                    arrowprops=dict(arrowstyle="-", color="#c0392b", lw=0.8))
    ax.axvline(30.0, color="#c0392b", lw=0.8, ls=":")
    fig.tight_layout()
    p = os.path.join(OUT, "q21e.png")
    fig.savefig(p); plt.close(fig)
    return p


def pressure():
    t = np.array([0, 1, 2.5, 5, 7.5, 10, 12, 15, 20])
    p = np.array([0, 0.15, 0.35, 0.65, 0.85, 0.97, 1.01, 1.02, 1.02])
    f = PchipInterpolator(t, p)
    tt = np.linspace(0, 20, 400)
    fig, ax = plt.subplots(figsize=(5.2, 3.5), dpi=200)
    ax.plot(tt, f(tt), color="#1f4e9c", lw=2.2, label="0.20 M HClO (given data)")
    th = np.linspace(0, 20, 800)
    ph = 1.02 * (1 - np.exp(-th / 0.35))
    ax.plot(th, ph, color="#c0392b", lw=2.2, ls="--", label="0.20 M HCl (sketch)")
    ax.set_xlim(0, 20); ax.set_ylim(0, 1.25)
    ax.set_xticks([0, 5, 10, 15, 20]); ax.set_yticks([0, 0.25, 0.5, 0.75, 1.0, 1.25])
    ax.grid(True, color="#aaaaaa", lw=0.6)
    ax.set_xlabel("Time (min)"); ax.set_ylabel("Pressure (atm)")
    ax.legend(loc="lower right", fontsize=8)
    fig.tight_layout()
    q = os.path.join(OUT, "q22a.png")
    fig.savefig(q); plt.close(fig)
    return q


if __name__ == "__main__":
    print(titration()); print(pressure())
