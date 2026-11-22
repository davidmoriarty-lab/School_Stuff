"""Figures for the Substitution and Elimination notes: mechanisms with curved arrows, energy diagrams, a Newman projection,
and every practice / answer scheme.  All pictures are drawn with matplotlib (skel.py); run  python3 figs.py  to write img/*.png."""
import os, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Circle
from skel import Mol, chain, ring, draw_mol, scheme, INK, FONT
import mech

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "img")
os.makedirs(IMG, exist_ok=True)
RED = "#d00000"
TEAL = "#0c8599"


def P(name):
    return os.path.join(IMG, name + ".png")


def curved(ax, p, q, rad=-0.35, color=RED, lw=1.8):
    ax.add_patch(FancyArrowPatch(p, q, connectionstyle="arc3,rad=%s" % rad, arrowstyle="-|>", mutation_scale=14,
                                 color=color, lw=lw, shrinkA=0, shrinkB=0, zorder=5))


def canvas(w, h, xlim, ylim):
    fig = plt.figure(figsize=(w, h))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.axis("off"); ax.set_aspect("equal")
    return fig, ax


def T(ax, x, y, s, size=12, color=INK, ha="center", va="center", **kw):
    ax.text(x, y, s, ha=ha, va=va, fontsize=size, color=color, family=FONT, **kw)


# ------------------------------------------------------------------ mechanisms
def sn2_ts(path=None):
    """Transition state of HS- + CH3-Cl (the textbook's skillbuilder 7.2 pattern)."""
    fig, ax = canvas(4.6, 2.8, (-3.2, 3.0), (-1.7, 1.7))
    T(ax, -2.15, 0, "HS", 14); T(ax, 2.15, 0, "Cl", 14)
    T(ax, -2.15, 0.62, "δ−", 11); T(ax, 2.15, 0.62, "δ−", 11)
    ax.plot([-1.55, -0.28], [0, 0], color=INK, lw=1.6, ls=(0, (3, 2)))
    ax.plot([0.28, 1.6], [0, 0], color=INK, lw=1.6, ls=(0, (3, 2)))
    T(ax, 0, 0, "C", 14)
    ax.plot([0, 0], [0.3, 0.95], color=INK, lw=1.6); T(ax, 0, 1.15, "H", 12)
    ax.plot([-0.2, -0.65], [-0.25, -0.78], color=INK, lw=1.6); T(ax, -0.8, -0.98, "H", 12)
    ax.plot([0.2, 0.65], [-0.25, -0.78], color=INK, lw=1.6); T(ax, 0.8, -0.98, "H", 12)
    from matplotlib.patches import Rectangle
    ax.add_patch(Rectangle((-2.95, -1.5), 5.9, 3.0, fill=False, ec=INK, lw=1.2))
    T(ax, 2.75, 1.32, "‡", 14)
    fig.savefig(path or P("sn2_ts"), dpi=200, facecolor="white"); plt.close(fig)


# ------------------------------------------------------------------ energy diagrams
def _curve(xs, ys, n=300):
    from numpy import interp
    # smooth through points with a cosine-eased blend between consecutive extrema
    X, Y = [], []
    for i in range(len(xs) - 1):
        t = np.linspace(0, 1, n // (len(xs) - 1))
        e = (1 - np.cos(np.pi * t)) / 2
        X += list(xs[i] + (xs[i + 1] - xs[i]) * t)
        Y += list(ys[i] + (ys[i + 1] - ys[i]) * e)
    return np.array(X), np.array(Y)


def energy_one_step(path=None, title="SN2 or E2 (one step)"):
    fig, ax = plt.subplots(figsize=(3.7, 2.6))
    X, Y = _curve([0, 1.0, 2.0, 3.0, 4.0], [1.0, 1.0, 3.2, 0.4, 0.4])
    ax.plot(X, Y, color=INK, lw=2)
    ax.set_xlim(0, 4.0); ax.set_ylim(0, 4)
    ax.annotate("", xy=(1.35, 3.1), xytext=(1.35, 1.0), arrowprops=dict(arrowstyle="<->", color=RED, lw=1.5))
    ax.text(1.2, 2.0, "Ea", ha="right", va="center", fontsize=11, color=RED)
    ax.text(2.0, 3.45, "[ transition state ]‡", ha="center", fontsize=10)
    ax.text(0.5, 1.25, "reactants", ha="center", fontsize=9.5)
    ax.text(3.5, 0.65, "products", ha="center", fontsize=9.5)
    ax.set_xlabel("Reaction coordinate", fontsize=10); ax.set_ylabel("Potential energy", fontsize=10)
    ax.set_xticks([]); ax.set_yticks([]); ax.set_title(title, fontsize=10.5)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout(); fig.savefig(path or P("energy_one"), dpi=200, facecolor="white"); plt.close(fig)


def energy_two_step(path=None, title="SN1 or E1 (two steps)"):
    fig, ax = plt.subplots(figsize=(4.2, 2.6))
    X, Y = _curve([0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8], [1.0, 1.0, 3.5, 1.9, 2.5, 0.4, 0.4], n=420)
    ax.plot(X, Y, color=INK, lw=2)
    ax.set_xlim(0, 4.8); ax.set_ylim(0, 4.3)
    ax.text(1.6, 3.75, "‡ step 1 (slow)", ha="center", fontsize=9.5)
    ax.text(3.2, 2.85, "‡ step 2", ha="center", fontsize=9.5)
    ax.text(2.4, 1.0, "carbocation\nintermediate", ha="center", fontsize=9)
    ax.annotate("", xy=(1.0, 3.45), xytext=(1.0, 1.0), arrowprops=dict(arrowstyle="<->", color=RED, lw=1.5))
    ax.text(0.95, 2.4, "Ea\nstep 1", ha="right", va="center", fontsize=9, color=RED)
    ax.text(0.12, 0.55, "RX + solvent", ha="left", fontsize=9)
    ax.text(4.3, 0.7, "products", ha="center", fontsize=9)
    ax.set_xlabel("Reaction coordinate", fontsize=10); ax.set_ylabel("Potential energy", fontsize=10)
    ax.set_xticks([]); ax.set_yticks([]); ax.set_title(title, fontsize=10.5)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout(); fig.savefig(path or P("energy_two"), dpi=200, facecolor="white"); plt.close(fig)


def newman(path=None):
    """Newman projection down C2-C3 of 2-bromobutane: H (back) anti to Br (front)."""
    fig, ax = canvas(3.3, 3.3, (-2.4, 2.4), (-2.4, 2.4))
    ax.add_patch(Circle((0, 0), 0.95, fill=False, ec=INK, lw=2))
    R = 0.95
    # back carbon: bonds start at the circle edge
    for ang, lab in ((90, "H"), (210, "H"), (330, "CH3")):
        a = math.radians(ang)
        ax.plot([R * math.cos(a), 1.7 * math.cos(a)], [R * math.sin(a), 1.7 * math.sin(a)], color=INK, lw=2)
        T(ax, 2.05 * math.cos(a), 2.05 * math.sin(a), lab, 11)
    # front carbon: bonds start at the centre
    for ang, lab in ((270, "Br"), (30, "CH3"), (150, "H")):
        a = math.radians(ang)
        ax.plot([0, 1.7 * math.cos(a)], [0, 1.7 * math.sin(a)], color=INK, lw=2)
        T(ax, 2.05 * math.cos(a), 2.05 * math.sin(a), lab, 11, color=("#c92a2a" if lab == "Br" else INK))
    T(ax, 0.0, 1.38, "", 9)
    T(ax, 0, -2.4 + 0.1, "", 9)
    fig.savefig(path or P("newman"), dpi=200, facecolor="white"); plt.close(fig)


# ------------------------------------------------------------------ structures used in the practice problems
def cis_2_pentene():
    m = Mol()
    c2 = m.add(0, 0); c3 = m.add(1, 0)
    c1 = m.add(-0.5, 0.87); c4 = m.add(1.5, 0.87); c5 = m.add(2.37, 0.37)
    m.bond(c2, c3, "double"); m.bond(c2, c1); m.bond(c3, c4); m.bond(c4, c5)
    return m


def build_all():
    mech.build_all()
    sn2_ts()
    from PIL import Image
    im = Image.open(P("sn1_mech"))
    w, h = im.size
    import numpy as _np
    a_ = _np.array(im.convert("RGB")).astype(int)
    teal = ((abs(a_[:, :, 0] - 12) < 40) & (abs(a_[:, :, 1] - 133) < 40) & (abs(a_[:, :, 2] - 152) < 40)).any(axis=1)
    tops = []
    prev = False
    for y_, v in enumerate(teal):
        if v and not prev:
            tops.append(y_)
        prev = v
    assert len(tops) >= 3, tops
    cuts = [0, tops[1] - 14, tops[2] - 14, h]
    for k in range(3):
        im.crop((0, cuts[k], w, cuts[k + 1])).save(P("sn1_step%d" % (k + 1)))
    energy_one_step(); energy_two_step(); newman()
    S = {}
    # ---- SN2 practice (stereochemistry)
    s_br = chain(4, subs={1: [("Br", "wedge")]})
    s_cn = chain(4, subs={1: [("CN", "dash")]})
    scheme([s_br, ("arrow", "NaCN", "DMSO"), "?"], P("q_sn2_stereo"))
    scheme([s_br, ("arrow", "NaCN", "DMSO"), s_cn, "+", "NaBr"], P("a_sn2_stereo"))
    # ---- E2 regiochemistry: 2-bromo-2-methylbutane
    t_br = chain(4, subs={1: [("Br", "plain"), ("", "plain")]})
    zait = chain(4, double=[(1, 2)], subs={1: [("", "plain")]})
    hof = chain(4, double=[(0, 1)], subs={1: [("", "plain")]})
    scheme([t_br, ("arrow", "NaOEt", "EtOH, heat"), "?"], P("q_e2_a"))
    scheme([t_br, ("arrow", "NaOEt", "EtOH, heat"), zait, "+", hof], P("a_e2_a"))
    scheme([t_br, ("arrow", "t-BuOK", "t-BuOH, heat"), "?"], P("q_e2_b"))
    scheme([t_br, ("arrow", "t-BuOK", "t-BuOH, heat"), hof, "+", zait], P("a_e2_b"))
    # ---- E2: 2-bromopentane
    br5 = chain(5, subs={1: [("Br", "plain")]})
    trans2 = chain(5, double=[(1, 2)])
    cis2 = cis_2_pentene()
    one = chain(5, double=[(0, 1)])
    scheme([br5, ("arrow", "NaOEt", "EtOH, heat"), "?"], P("q_e2_c"))
    scheme([br5, ("arrow", "NaOEt", "EtOH, heat"), trans2, "+", cis2, "+", one], P("a_e2_c"), scale=0.5)
    ether5 = chain(4, subs={1: [("OEt", "plain"), ("", "plain")]})
    # ---- SN1 / E1: tert-butyl bromide in ethanol
    tb = chain(3, subs={1: [("Br", "plain"), ("", "plain")]})
    ether = chain(3, subs={1: [("OEt", "plain"), ("", "plain")]})
    iso = chain(3, double=[(0, 1)], subs={1: [("", "plain")]})
    scheme([tb, ("arrow", "EtOH", "heat"), "?"], P("q_sn1_a"))
    scheme([tb, ("arrow", "EtOH", "heat"), ether], P("a_sn1_a"))
    # ---- E1: same substrate, weak base; and alcohol dehydration
    scheme([t_br, ("arrow", "EtOH", "heat"), "?"], P("q_e1_a"))
    scheme([t_br, ("arrow", "EtOH", "heat"), ether5, "+", zait, "+", hof], P("a_e1_a"), scale=0.5)
    alc = chain(4, subs={1: [("OH", "plain"), ("", "plain")]})
    scheme([alc, ("arrow", "conc. H2SO4", "heat"), "?"], P("q_e1_b"))
    scheme([alc, ("arrow", "conc. H2SO4", "heat"), zait, "+", hof], P("a_e1_b"))
    # ---- rearrangement
    sec = chain(4, subs={1: [("Br", "plain")], 2: [("", "plain"), ("", "plain")]})
    eth2 = chain(4, subs={1: [("OEt", "plain"), ("", "plain")], 2: [("", "plain")]})
    tetra = chain(4, double=[(1, 2)], subs={1: [("", "plain")], 2: [("", "plain")]})
    mono = chain(4, double=[(0, 1)], subs={1: [("", "plain")], 2: [("", "plain")]})
    scheme([sec, ("arrow", "EtOH", "heat"), "?"], P("q_sn1_b"))
    scheme([eth2, "+", tetra, "+", mono], P("a_sn1_b"), scale=0.5)
    # ---- racemization
    r1 = chain(6, subs={2: [("Br", "wedge"), ("", "plain")]})
    p_w = chain(6, subs={2: [("OH", "wedge"), ("", "plain")]})
    p_d = chain(6, subs={2: [("OH", "dash"), ("", "plain")]})
    scheme([r1, ("arrow", "H2O", "heat"), "?"], P("q_sn1_c"), scale=0.5)
    scheme([p_w, "+", p_d], P("a_sn1_c"), scale=0.5)
    # ---- retrosynthesis targets
    mtbe = chain(3, subs={1: [("OCH3", "plain"), ("", "plain")]})
    scheme([mtbe], P("t_mtbe"))
    return S


if __name__ == "__main__":
    build_all()
    print("figures written to", IMG)
