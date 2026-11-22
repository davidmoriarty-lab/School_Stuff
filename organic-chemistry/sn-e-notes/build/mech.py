"""Mechanism pictures (curved arrows) built from real molecule objects.

Every species drawn here is a skel.Mol with its atoms, bonds and formal charges, so verify_structures.py can convert it to an
RDKit molecule (which refuses impossible valences, for example a carbon with four bonds and a + charge) and check that the atoms
and charges balance across every arrow.  STEPS[name] lists the (reactants, products) of each step, using the same objects
that were drawn.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch
from skel import Mol, chain, draw_mol, INK, FONT

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "img")
RED = "#d00000"
GRAY = "#555"
TEAL = "#0c8599"
STEPS = {}


def P(name):
    return os.path.join(IMG, name + ".png")


def canvas(w, h, xlim, ylim):
    fig = plt.figure(figsize=(w, h))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.axis("off"); ax.set_aspect("equal")
    return fig, ax


def T(ax, x, y, s, size=12, color=INK, ha="center", va="center", **kw):
    ax.text(x, y, s, ha=ha, va=va, fontsize=size, color=color, family=FONT, **kw)


def curved(ax, p, q, rad=-0.35, lw=1.8):
    ax.add_patch(FancyArrowPatch(p, q, connectionstyle="arc3,rad=%s" % rad, arrowstyle="-|>", mutation_scale=14,
                                 color=RED, lw=lw, shrinkA=0, shrinkB=0, zorder=6))


def straight(ax, x0, x1, y, label=""):
    ax.annotate("", xy=(x1, y), xytext=(x0, y), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.5))
    if label:
        T(ax, (x0 + x1) / 2, y + 0.45, label, 11)


class At:
    """A molecule drawn at an offset; .p(i) is the position of atom i, .mid(i, j) the middle of a bond."""

    def __init__(self, ax, mol, ox, oy, size=14):
        self.m, self.ox, self.oy = mol, ox, oy
        draw_mol(ax, mol, ox=ox, oy=oy, size=size)

    def p(self, i, dx=0.0, dy=0.0):
        x, y, _ = self.m.atoms[i]
        return (x + self.ox + dx, y + self.oy + dy)

    def mid(self, i, j, dx=0.0, dy=0.0):
        a, b = self.p(i), self.p(j)
        return ((a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy)


# ------------------------------------------------------------------ the small species
def ion(label, charge):
    m = Mol()
    m.add(0, 0, label, charge)
    return m


def hydroxide():
    return ion("HO", -1)


def bromide():
    return ion("Br", -1)


def water():
    return ion("H₂O", 0)


def methyl_halide(x_label, x_dx):
    """C with three H and a substituent X, X on the side given by x_dx (+1 right, -1 left)."""
    m = Mol()
    c = m.add(0, 0, "C")
    for dx, dy in ((0.0, 0.95), (-0.62 * x_dx, -0.8), (0.62 * x_dx, -0.8)):
        h = m.add(dx, dy, "H")
        m.bond(c, h)
    x = m.add(1.5 * x_dx, 0, x_label)
    m.bond(c, x)
    return m


def ethanol(charge_o=0, o_left=False):
    """CH3-CH2-OH drawn as a zigzag.  O on the right by default, on the left with o_left.
    With charge_o=+1 it is the protonated ethanol, CH3CH2-OH2(+)."""
    end = 0 if o_left else 2
    lab = ("OH₂" if charge_o else "OH") if not o_left else ("H₂O" if False else ("OH₂" if charge_o else "HO"))
    m = chain(3, end_labels={end: lab})
    if charge_o:
        m.charge[end] = charge_o
    return m


def tbu(x_group=None, cation=False, extra=None):
    """tert-butyl skeleton: three CH3 on the central carbon, plus an optional group on the fourth position (X).
    cation=True leaves the fourth position empty and puts a + on the central carbon (three bonds only)."""
    if cation:
        m = chain(3, subs={1: [("", "plain")]})
        m.charge[1] = 1
        return m
    return chain(3, subs={1: [(x_group, "plain"), ("", "plain")]})


def oxonium(h=True):
    """(CH3)3C-O(+)(H)-CH2CH3, or the neutral ether (CH3)3C-O-CH2CH3 when h=False.  Returns (mol, index of O, index of H)."""
    m = Mol()
    c = m.add(0, 0)
    for x, y in ((-0.87, 0.5), (0.87, 0.5), (0.0, 1.0)):
        a = m.add(x, y)
        m.bond(c, a)
    o = m.add(0, -1.0, "O", 1 if h else 0)
    m.bond(c, o)
    hh = None
    if h:
        hh = m.add(0.75, -1.5, "H")
        m.bond(o, hh)
    e1 = m.add(-0.87, -1.5)
    m.bond(o, e1)
    e2 = m.add(-1.73, -1.0)
    m.bond(e1, e2)
    return m, o, hh


# ------------------------------------------------------------------ SN2
def sn2_mechanism(path=None, stage=2):
    fig, ax = canvas(9.9, 2.9, (0, 16.5), (-1.9, 2.0))
    hyd, mebr = hydroxide(), methyl_halide("Br", 1)
    meoh, brm = methyl_halide("HO", -1), bromide()
    a = At(ax, hyd, 1.2, 0.2)
    T(ax, 3.1, 0.2, "+", 17)
    b = At(ax, mebr, 5.2, 0.2)
    T(ax, 1.2, -0.95, "nucleophile", 11, GRAY); T(ax, 6.9, -0.95, "leaving group", 11, GRAY)
    if stage >= 1:
        curved(ax, (1.55, 0.78), (4.82, 0.5), rad=-0.32)
        curved(ax, (b.mid(0, 4)[0] + 0.1, b.mid(0, 4)[1] + 0.08), (b.p(4)[0] + 0.05, b.p(4)[1] + 0.5), rad=-0.8)
        T(ax, 5.2, -1.7, "attacks from the back side", 11, GRAY)
    if stage >= 2:
        straight(ax, 8.9, 10.5, 0.2, "SN2")
        At(ax, meoh, 12.9, 0.2)
        T(ax, 14.4, 0.2, "+", 17)
        At(ax, brm, 15.6, 0.2)
    fig.savefig(path or P("sn2_mech"), dpi=200, facecolor="white"); plt.close(fig)
    STEPS["sn2"] = [([hyd, mebr], [meoh, brm])]


# ------------------------------------------------------------------ E2
def e2_mechanism(path=None, stage=2):
    fig, ax = canvas(9.4, 3.3, (-4.2, 11.6), (-2.3, 2.7))
    sub = chain(3, subs={1: [("Br", "plain")]})
    h = sub.add(sub.atoms[0][0] - 0.5, sub.atoms[0][1] + 0.87, "H")
    sub.bond(0, h)
    hyd, prop, wat, brm = hydroxide(), chain(3, double=[(0, 1)]), water(), bromide()
    A = At(ax, sub, 0.0, 0.0)
    brx = [i for i, a in enumerate(sub.atoms) if a[2] == "Br"][0]
    H = At(ax, hyd, -3.2, 1.9)
    T(ax, -2.3, 0.6, "strong base", 11, GRAY)
    if stage >= 1:
        curved(ax, (-2.75, 2.35), (A.p(h)[0] - 0.12, A.p(h)[1] + 0.12), rad=-0.3)
        curved(ax, A.mid(0, h, 0.08, -0.08), A.mid(0, 1, -0.05, 0.12), rad=-0.55)
        curved(ax, (A.p(1)[0] + 0.12, (A.p(1)[1] + A.p(brx)[1]) / 2 + 0.05), (A.p(brx)[0] + 0.42, A.p(brx)[1] + 0.15), rad=0.55)
        T(ax, 0.9, -1.85, "H and Br must be anti-periplanar", 11, GRAY)
    if stage >= 2:
        straight(ax, 3.7, 5.5, 0.4, "E2")
        At(ax, prop, 6.2, 0.0)
        T(ax, 8.6, 0.4, "+", 15)
        At(ax, wat, 9.4, 0.4)
        T(ax, 10.4, 0.4, "+", 15)
        At(ax, brm, 11.2, 0.4)
    fig.savefig(path or P("e2_mech"), dpi=200, facecolor="white"); plt.close(fig)
    STEPS["e2"] = [([sub, hyd], [prop, wat, brm])]


# ------------------------------------------------------------------ SN1
def sn1_mechanism(path=None):
    fig, ax = canvas(9.5, 8.0, (0, 19), (-16.2, 0.4))
    # step 1
    T(ax, 0.2, -0.3, "Step 1  (slow): the leaving group leaves", 11, TEAL, ha="left", fontweight="bold")
    rbr, cat, brm = tbu("Br"), tbu(cation=True), bromide()
    a = At(ax, rbr, 1.2, -2.6)
    br_i = [i for i, x in enumerate(rbr.atoms) if x[2] == "Br"][0]
    curved(ax, (a.mid(1, br_i)[0] + 0.12, a.mid(1, br_i)[1] + 0.05), (a.p(br_i)[0] + 0.6, a.p(br_i)[1] + 0.3), rad=-0.7)
    straight(ax, 5.6, 8.2, -2.4)
    At(ax, cat, 9.6, -2.6)
    T(ax, 12.6, -2.4, "+", 16)
    At(ax, brm, 14.0, -2.4)
    T(ax, 10.8, -4.3, "carbocation intermediate", 10.5, GRAY)
    # step 2
    T(ax, 0.2, -5.3, "Step 2: the solvent (a weak nucleophile) attacks the carbocation", 11, TEAL, ha="left", fontweight="bold")
    cat2, eth = tbu(cation=True), ethanol(o_left=True)
    ox, o, hh = oxonium(True)
    c2 = At(ax, cat2, 1.2, -8.0)
    T(ax, 4.6, -7.8, "+", 16)
    e = At(ax, eth, 6.4, -8.2)
    curved(ax, (e.p(0)[0] - 0.3, e.p(0)[1] + 0.15), (c2.p(1)[0] + 0.5, c2.p(1)[1] + 0.2), rad=0.45)
    T(ax, 7.2, -9.3, "ethanol (the solvent)", 10.5, GRAY)
    straight(ax, 9.9, 12.2, -7.8)
    At(ax, ox, 14.6, -7.5)
    T(ax, 15.8, -9.5, "oxonium ion", 10.5, GRAY)
    # step 3
    T(ax, 0.2, -10.7, "Step 3: a second solvent molecule removes the proton from oxygen", 11, TEAL, ha="left", fontweight="bold")
    ox2, o2, h2 = oxonium(True)
    eth2 = ethanol(o_left=True)
    ether, _, _ = oxonium(False)
    peth = ethanol(+1)
    p1 = At(ax, ox2, 3.0, -12.4)
    T(ax, 5.6, -13.0, "+", 16)
    b = At(ax, eth2, 6.6, -13.2)
    curved(ax, (b.p(0)[0] - 0.28, b.p(0)[1] + 0.1), (p1.p(h2)[0] + 0.1, p1.p(h2)[1] + 0.12), rad=-0.5)
    straight(ax, 9.6, 11.2, -12.9)
    At(ax, ether, 13.4, -12.4)
    T(ax, 15.4, -12.9, "+", 16)
    At(ax, peth, 16.2, -13.2)
    T(ax, 3.3, -15.2, "(a base removes a β proton instead: E1, next section)", 10.5, GRAY, ha="left")
    fig.savefig(path or P("sn1_mech"), dpi=200, facecolor="white"); plt.close(fig)
    STEPS["sn1"] = [([rbr], [cat, brm]), ([cat2, eth], [ox]), ([ox2, eth2], [ether, peth])]


# ------------------------------------------------------------------ E1
def e1_mechanism(path=None):
    fig, ax = canvas(9.5, 5.6, (0, 19), (-10.4, 0.6))
    T(ax, 0.2, -0.2, "Step 1  (slow): same as SN1, the leaving group leaves", 11, TEAL, ha="left", fontweight="bold")
    sub = chain(4, subs={1: [("Br", "plain"), ("", "plain")]})
    cat = chain(4, subs={1: [("", "plain")]})
    cat.charge[1] = 1
    brm = bromide()
    a = At(ax, sub, 1.2, -2.7)
    br_i = [i for i, x in enumerate(sub.atoms) if x[2] == "Br"][0]
    curved(ax, (a.mid(1, br_i)[0] + 0.12, a.mid(1, br_i)[1] + 0.05), (a.p(br_i)[0] + 0.6, a.p(br_i)[1] + 0.3), rad=-0.7)
    straight(ax, 6.2, 8.6, -2.5)
    At(ax, cat, 10.0, -2.7)
    T(ax, 13.7, -2.5, "+", 16)
    At(ax, brm, 15.0, -2.5)
    T(ax, 10.9, -4.3, "carbocation", 10.5, GRAY)
    T(ax, 0.2, -5.4, "Step 2: a weak base (the solvent) removes a β proton; the C–H electrons become the π bond", 11, TEAL, ha="left", fontweight="bold")
    cat2 = chain(4, subs={1: [("", "plain")]})
    cat2.charge[1] = 1
    h = cat2.add(cat2.atoms[2][0], cat2.atoms[2][1] + 1.0, "H")
    cat2.bond(2, h)
    eth = ethanol(o_left=True)
    alk = chain(4, double=[(1, 2)], subs={1: [("", "plain")]})
    peth = ethanol(+1)
    c = At(ax, cat2, 1.2, -8.6)
    T(ax, 6.2, -8.3, "+", 16)
    e = At(ax, eth, 4.4, -7.0)
    curved(ax, (e.p(0)[0] - 0.3, e.p(0)[1] + 0.1), (c.p(h)[0] + 0.12, c.p(h)[1] + 0.12), rad=0.5)
    curved(ax, c.mid(2, h, 0.08, -0.05), c.mid(1, 2, 0.0, 0.18), rad=-0.8)
    straight(ax, 8.9, 10.6, -8.2)
    At(ax, alk, 12.0, -8.6)
    T(ax, 15.4, -8.2, "+", 16)
    At(ax, peth, 16.1, -8.6)
    T(ax, 13.2, -10.0, "2-methyl-2-butene (Zaitsev, major)", 10.5, GRAY)
    fig.savefig(path or P("e1_mech"), dpi=200, facecolor="white"); plt.close(fig)
    STEPS["e1"] = [([sub], [cat, brm]), ([cat2, eth], [alk, peth])]


# ------------------------------------------------------------------ hydride shift
def hydride_shift(path=None):
    fig, ax = canvas(9.0, 2.9, (0, 15), (-2.3, 1.9))
    sec = chain(4, subs={2: [("", "plain"), ("H", "plain")]})
    sec.charge[1] = 1
    ter = chain(4, subs={2: [("", "plain")]})
    ter.charge[2] = 1
    h2 = ter.add(ter.atoms[1][0], ter.atoms[1][1] - 1.0, "H")
    ter.bond(1, h2)
    a = At(ax, sec, 1.5, -0.2)
    hi = [i for i, x in enumerate(sec.atoms) if x[2] == "H"][0]
    curved(ax, a.mid(2, hi, 0.0, 0.05), (a.p(1)[0] + 0.12, a.p(1)[1] + 0.35), rad=0.75)
    T(ax, 2.5, -1.6, "secondary carbocation", 10.5, GRAY)
    T(ax, 4.0, 1.5, "", 10)
    straight(ax, 6.2, 8.4, -0.1, "1,2-hydride shift")
    At(ax, ter, 10.0, -0.2)
    T(ax, 11.0, -1.6, "tertiary carbocation (more stable)", 10.5, GRAY)
    fig.savefig(path or P("hydride_shift"), dpi=200, facecolor="white"); plt.close(fig)
    STEPS["hydride_shift"] = [([sec], [ter])]


def methyl_shift(path=None):
    fig, ax = canvas(9.0, 2.9, (0, 15), (-2.3, 1.9))
    sec = chain(4, subs={2: [("", "plain"), ("", "plain")]})
    sec.charge[1] = 1
    ter = chain(4, subs={1: [("", "plain")], 2: [("", "plain")]})
    ter.charge[2] = 1
    a = At(ax, sec, 1.5, -0.2)
    me = [i for i, x in enumerate(sec.atoms) if i > 3][-1]          # the methyl at 120 degrees (toward the cation)
    # choose the methyl closer to atom 1 (the cation carbon)
    cands = [i for i, x in enumerate(sec.atoms) if i > 3]
    me = min(cands, key=lambda i: abs(sec.atoms[i][0] - sec.atoms[1][0]))
    curved(ax, a.mid(2, me, 0.0, 0.05), (a.p(1)[0] + 0.1, a.p(1)[1] + 0.35), rad=0.75)
    T(ax, 2.5, -1.6, "secondary carbocation", 10.5, GRAY)
    straight(ax, 6.2, 8.4, -0.1, "1,2-methyl shift")
    At(ax, ter, 10.0, -0.2)
    T(ax, 11.0, -1.6, "tertiary carbocation (more stable)", 10.5, GRAY)
    fig.savefig(path or P("methyl_shift"), dpi=200, facecolor="white"); plt.close(fig)
    STEPS["methyl_shift"] = [([sec], [ter])]


def build_all():
    for st in (0, 1, 2):
        sn2_mechanism(P("sn2_mech_s%d" % st) if st < 2 else P("sn2_mech"), st)
        e2_mechanism(P("e2_mech_s%d" % st) if st < 2 else P("e2_mech"), st)
    sn1_mechanism()
    e1_mechanism()
    hydride_shift()
    methyl_shift()


if __name__ == "__main__":
    build_all()
    print("mechanism figures written")
