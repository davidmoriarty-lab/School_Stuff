"""Figures for the Substitution and Elimination notes: mechanisms with curved arrows, energy diagrams, a Newman projection,
and every practice / answer scheme.  All pictures are drawn with matplotlib (skel.py); run  python3 figs.py  to write img/*.png."""
import os, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Circle
from skel import Mol, chain, ring, draw_mol, scheme, INK, FONT

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
def sn2_mechanism(path=None, stage=2):
    """HO- + CH3-Br -> HO-CH3 + Br-  with curved arrows."""
    fig, ax = canvas(9.0, 2.7, (0, 15), (-1.7, 2.1))
    T(ax, 1.2, 0.2, "HO", 16); T(ax, 2.0, 0.65, "−", 13)
    T(ax, 3.3, 0.2, "+", 17)
    T(ax, 5.2, 0.2, "C", 16)
    for (x, y, s) in ((5.2, 1.25, "H"), (4.25, -0.7, "H"), (6.15, -0.7, "H")):
        T(ax, x, y, s, 13)
        ax.plot([5.2, 5.2 + (x - 5.2) * 0.62], [0.2, 0.2 + (y - 0.2) * 0.62], color=INK, lw=1.6)
    ax.plot([5.5, 6.9], [0.2, 0.2], color=INK, lw=1.6)
    T(ax, 7.45, 0.2, "Br", 16)
    T(ax, 1.4, -0.75, "nucleophile", 11, "#555"); T(ax, 7.5, -0.75, "leaving group", 11, "#555")
    if stage >= 1:
        curved(ax, (1.7, 0.85), (4.85, 0.55), rad=-0.32)
        curved(ax, (6.3, 0.3), (7.35, 0.85), rad=-0.7)
        T(ax, 5.2, -1.45, "attacks from the back side", 11, "#555")
    if stage >= 2:
        ax.annotate("", xy=(10.7, 0.2), xytext=(9.0, 0.2), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.5))
        T(ax, 9.85, 0.65, "SN2", 12)
        T(ax, 12.2, 0.2, "HO–CH3", 16)
        T(ax, 13.9, 0.2, "+", 17); T(ax, 14.6, 0.2, "Br−", 16)
    fig.savefig(path or P("sn2_mech"), dpi=200, facecolor="white"); plt.close(fig)


def e2_mechanism(path=None, stage=2):
    """HO- + (CH3)2CH-Br -> CH2=CH-CH3 + H2O + Br-"""
    fig, ax = canvas(9.0, 3.3, (-4.2, 11.0), (-2.3, 2.7))
    m = chain(3, subs={1: [("Br", "plain")]})
    h = m.add(m.atoms[0][0] - 0.5, m.atoms[0][1] + 0.87, "H")
    m.bond(0, h, "plain")
    draw_mol(ax, m, ox=0, oy=0, size=14)
    x0, y0 = m.atoms[0][0], m.atoms[0][1]
    x1, y1 = m.atoms[1][0], m.atoms[1][1]
    hx, hy = m.atoms[h][0], m.atoms[h][1]
    brx, bry = [(a[0], a[1]) for a in m.atoms if a[2] == "Br"][0]
    T(ax, -3.2, 1.9, "HO", 16); T(ax, -2.55, 2.3, "−", 13)
    T(ax, -2.2, 0.6, "strong base", 11, "#555")
    if stage >= 1:
        curved(ax, (-2.75, 2.1), (hx - 0.12, hy + 0.12), rad=-0.3)
        curved(ax, ((hx + x0) / 2 + 0.08, (hy + y0) / 2 - 0.08), ((x0 + x1) / 2 - 0.05, (y0 + y1) / 2 + 0.12), rad=-0.55)
        curved(ax, (x1 + 0.12, (y1 + bry) / 2 + 0.05), (brx + 0.42, bry + 0.15), rad=0.55)
        T(ax, 0.9, -1.85, "H and Br must be anti-periplanar", 11, "#555")
    if stage >= 2:
        ax.annotate("", xy=(5.9, 0.4), xytext=(3.9, 0.4), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.5))
        T(ax, 4.9, 0.85, "E2", 12)
        p = chain(3, double=[(0, 1)])
        draw_mol(ax, p, ox=6.6, oy=0.0, size=14)
        T(ax, 9.55, 0.35, "+  H2O  +  Br−", 13)
    fig.savefig(path or P("e2_mech"), dpi=200, facecolor="white"); plt.close(fig)


def sn1_mechanism(path=None):
    """t-BuBr in ethanol: three steps with curved arrows."""
    fig, ax = canvas(9.5, 8.0, (0, 19), (-16.2, 0.4))
    arrow_kw = dict(arrowstyle="-|>", color=INK, lw=1.5)
    # ---- step 1
    T(ax, 0.2, -0.3, "Step 1  (slow): the leaving group leaves", 11, "#0c8599", ha="left", fontweight="bold")
    m1 = chain(3, subs={1: [("Br", "plain"), ("", "plain")]})
    ox, oy = 1.2, -2.6
    draw_mol(ax, m1, ox=ox, oy=oy, size=14)
    cx, cy = m1.atoms[1][0] + ox, m1.atoms[1][1] + oy
    brx, bry = [(a[0] + ox, a[1] + oy) for a in m1.atoms if a[2] == "Br"][0]
    curved(ax, ((cx + brx) / 2 + 0.12, (cy + bry) / 2 + 0.02), (brx + 0.6, bry + 0.25), rad=-0.7)
    ax.annotate("", xy=(8.2, -2.4), xytext=(5.6, -2.4), arrowprops=arrow_kw)
    c = chain(3, subs={1: [("", "plain"), ("", "plain")]})
    draw_mol(ax, c, ox=9.6, oy=oy, size=14)
    T(ax, c.atoms[1][0] + 9.6 + 0.3, c.atoms[1][1] + oy + 0.55, "+", 15)
    T(ax, 12.6, -2.4, "+", 16); T(ax, 13.6, -2.4, "Br−", 15)
    T(ax, 10.8, -4.1, "carbocation intermediate", 10.5, "#555")
    # ---- step 2
    T(ax, 0.2, -5.3, "Step 2: the solvent (a weak nucleophile) attacks the carbocation", 11, "#0c8599", ha="left", fontweight="bold")
    c2 = chain(3, subs={1: [("", "plain"), ("", "plain")]})
    ox2, oy2 = 1.2, -8.0
    draw_mol(ax, c2, ox=ox2, oy=oy2, size=14)
    cxp, cyp = c2.atoms[1][0] + ox2, c2.atoms[1][1] + oy2
    T(ax, cxp + 0.3, cyp + 0.55, "+", 15)
    T(ax, 4.6, -7.8, "+", 16)
    T(ax, 7.1, -7.8, "H–O–CH2CH3", 15)
    curved(ax, (6.1, -7.35), (cxp + 0.5, cyp + 0.3), rad=0.45)
    T(ax, 7.1, -9.0, "ethanol (the solvent)", 10.5, "#555")
    ax.annotate("", xy=(13.2, -7.8), xytext=(10.7, -7.8), arrowprops=arrow_kw)
    ox3 = chain(3, subs={1: [("O⁺HEt", "plain"), ("", "plain")]})
    draw_mol(ax, ox3, ox=14.6, oy=oy2, size=14)
    T(ax, 17.6, -10.0, "oxonium ion", 10.5, "#555")
    # ---- step 3
    T(ax, 0.2, -10.7, "Step 3: a second solvent molecule removes a proton", 11, "#0c8599", ha="left", fontweight="bold")
    e1 = chain(3, subs={1: [("OEt", "plain"), ("", "plain")]})
    draw_mol(ax, e1, ox=2.2, oy=-13.6, size=14)
    T(ax, 3.1, -15.3, "from O–H: ether (SN1)", 10.5, "#555")
    T(ax, 6.2, -13.3, "+", 15); T(ax, 8.6, -13.3, "EtOH2⁺", 13)
    T(ax, 11.3, -13.3, "or", 14)
    al = chain(3, double=[(0, 1)], subs={1: [("", "plain")]})
    draw_mol(ax, al, ox=13.0, oy=-13.6, size=14)
    T(ax, 14.1, -15.3, "from a β C–H: alkene (E1)", 10.5, "#555")
    fig.savefig(path or P("sn1_mech"), dpi=200, facecolor="white"); plt.close(fig)


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
    sn2_mechanism(); sn2_ts(); e2_mechanism(); sn1_mechanism()
    for st in (0, 1):
        sn2_mechanism(P("sn2_mech_s%d" % st), st); e2_mechanism(P("e2_mech_s%d" % st), st)
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
    # ---- SN1 / E1: tert-butyl bromide in ethanol
    tb = chain(3, subs={1: [("Br", "plain"), ("", "plain")]})
    ether = chain(3, subs={1: [("OEt", "plain"), ("", "plain")]})
    iso = chain(3, double=[(0, 1)], subs={1: [("", "plain")]})
    scheme([tb, ("arrow", "EtOH", "heat"), "?"], P("q_sn1_a"))
    scheme([tb, ("arrow", "EtOH", "heat"), ether, "+", iso], P("a_sn1_a"))
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
