"""Pictures for the five worksheets: every question scheme, every answer scheme and every mechanism answer.

Everything is built from skel.Mol objects (atoms, bonds, charges).  Reaction schemes register the SMILES they are supposed
to show in EXP; mechanisms register each step in mech.STEPS.  verify_structures.py checks both with RDKit.
Pictures are written to ../img/ws/.
"""
import os, math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from skel import Mol, chain, ring, scheme, draw_mol, INK, FONT
import mech
from mech import canvas, T, curved, At, ion, hydroxide, bromide, water, STEPS, GRAY, TEAL

HERE = os.path.dirname(os.path.abspath(__file__))
WS_IMG = os.path.join(HERE, "..", "img", "ws")
os.makedirs(WS_IMG, exist_ok=True)
EXP = {}           # scheme picture name -> [(expected smiles, expected CIP labels or None), ...] in drawing order


def P(name):
    return os.path.join(WS_IMG, name + ".png")


class MI:
    """A molecule item in a scheme: the drawing and what it is supposed to be."""

    def __init__(self, mol, smi, lab=None):
        self.mol, self.smi, self.lab = mol, smi, lab


def render(name, items, **kw):
    out, exp = [], []
    for it in items:
        if isinstance(it, MI):
            out.append(it.mol)
            exp.append((it.smi, it.lab))
        else:
            out.append(it)
    scheme(out, P(name), **kw)
    EXP[name] = exp


def ARR(above="", below="", w=None):
    return ("arrow", above, below) if w is None else ("arrow", above, below, w)


COUNT = {}                  # worksheet prefix ('w1' ...) -> number of numbered problems drawn so far
SCALE = 0.34                # drawing scale of the worksheet pictures (smaller than the notes)


def nextnum(key):
    ws = key[:2]
    COUNT[ws] = COUNT.get(ws, 0) + 1
    return COUNT[ws]


def LBL(n):
    return ("lbl", "%d." % n)


def qa(key, sm, rg, prods, ask="products", scale=None, pad=None):
    """Writes q_<key> (the question) and a_<key> (the answer), both starting with the problem number.
    ask='products': the question is the start and the reagents, with blank room to the right of the arrow for the products.
    ask='reagent': the question is the start and the product, with a long empty arrow for the reagents."""
    scale = scale or SCALE
    lab = [LBL(nextnum(key))]
    npr = sum(isinstance(p, MI) for p in prods)
    if ask == "products":
        padw = pad or (6.5 if npr <= 1 else 12.5)
        render("q_" + key, lab + list(sm) + [ARR(*rg), ("gap", padw)], scale=scale)
    else:
        render("q_" + key, lab + list(sm) + [ARR("", "", 5.5)] + list(prods), scale=scale)
    render("a_" + key, lab + list(sm) + [ARR(*rg)] + list(prods), scale=scale)


def prompt(key, sm, rg, prods, scale=None):
    """The reaction a mechanism question is about (start, reagents, product): the student draws the mechanism."""
    render("p_" + key, [LBL(nextnum(key))] + list(sm) + [ARR(*rg)] + list(prods), scale=scale or SCALE)


# ------------------------------------------------------------------ small constructors
def halide(n, x):
    """n carbons in a zigzag, then X on the end (for example halide(4, 'Br') is 1-bromobutane)."""
    return chain(n + 1, end_labels={n: x})


def M(label="", style="plain"):
    return (label, style)


def add_h(m, i, ang):
    x, y, _ = m.atoms[i]
    h = m.add(x + math.cos(math.radians(ang)), y + math.sin(math.radians(ang)), "H")
    m.bond(i, h)
    return h


def find(m, label, nth=0):
    return [i for i, a in enumerate(m.atoms) if a[2] == label][nth]


def methanol(o_right=False, charge=0):
    end = 1 if o_right else 0
    lab = "OH₂" if charge else ("OH" if o_right else "HO")
    m = chain(2, end_labels={end: lab})
    if charge:
        m.charge[end] = charge
    return m


def tbu_oh(label="OH", charge=0):
    m = chain(3, subs={1: [(label, "plain"), ("", "plain")]})
    if charge:
        m.charge[find(m, label)] = charge
    return m


def ethoxide():
    m = chain(3, end_labels={2: "O"})
    m.charge[2] = -1
    return m


def neopentyl_bromide():
    m = Mol()
    ch2 = m.add(0, 0.5)
    qc = m.add(0.87, 0.0)
    br = m.add(-0.87, 0.0, "Br")
    m.bond(br, ch2)
    m.bond(ch2, qc)
    for x, y in ((0.87, 1.0), (1.74, 0.5), (0.87, -1.0)):
        me = m.add(x, y)
        m.bond(qc, me)
    return m


def mirror(m):
    """The same molecule flipped left to right (so a leaving group on the right ends up on the left)."""
    n = Mol()
    for x, y, lab in m.atoms:
        n.add(-x, y, lab)
    for a, b, st in m.bonds:
        n.bond(a, b, st)
    n.charge = dict(m.charge)
    return n


def hbr():
    m = Mol()
    h = m.add(0, 0, "H")
    b = m.add(1.0, 0, "Br")
    m.bond(h, b)
    return m


# ------------------------------------------------------------------ a row-based layout for the mechanism answers
def layout_rows(rows, gap=0.7, x0=0.6):
    placed, maxw = [], 0
    for row in rows:
        x, cur = x0, []
        for it in row:
            if isinstance(it, Mol):
                bx0, bx1, by0, by1 = it.bbox()
                cur.append(("mol", it, x - bx0, bx1 - bx0))
                x += bx1 - bx0 + gap
            elif isinstance(it, tuple) and it[0] == "arrow":
                w = max(2.0, 0.22 * len(it[1]))
                cur.append(("arrow", it, x, w))
                x += w + gap
            elif isinstance(it, tuple) and it[0] == "gap":
                x += it[1]
            else:
                w = 0.8 if len(it) <= 2 else 0.2 * len(it)
                cur.append(("txt", it, x, w))
                x += w + gap * 0.5
        placed.append(cur)
        maxw = max(maxw, x - gap)
    return placed, maxw


def draw_rows(path, rows, headers=None, row_h=3.3, scale=0.5, arrows=None):
    placed, maxw = layout_rows(rows)
    R = len(rows)
    top_pad = 0.0
    fig_w, fig_h = (maxw + 0.4) * scale, R * row_h * scale
    fig, ax = canvas(fig_w, fig_h, (0, maxw + 0.4), (-R * row_h, 0))
    atmap = {}
    for r, cur in enumerate(placed):
        yc = -(r * row_h) - (row_h * 0.58 if headers else row_h * 0.5)
        if headers and headers[r]:
            T(ax, 0.2, -(r * row_h) - 0.35, headers[r], 11, TEAL, ha="left", fontweight="bold")
        for i, (kind, it, ox, w) in enumerate(cur):
            if kind == "mol":
                bx0, bx1, by0, by1 = it.bbox()
                atmap[(r, i)] = At(ax, it, ox, yc - (by0 + by1) / 2)
            elif kind == "arrow":
                ax.annotate("", xy=(ox + w, yc), xytext=(ox, yc), arrowprops=dict(arrowstyle="-|>", color=INK, lw=1.5))
                if it[1]:
                    T(ax, ox + w / 2, yc + 0.42, it[1], 11)
            else:
                T(ax, ox + w / 2, yc, it, 17 if len(it) <= 2 else 11, GRAY if len(it) > 2 else INK)
    if arrows:
        arrows(ax, atmap)
    fig.savefig(path, dpi=200, facecolor="white")
    plt.close(fig)


def _unit(a, b):
    d = math.hypot(b[0] - a[0], b[1] - a[1]) or 1.0
    return ((b[0] - a[0]) / d, (b[1] - a[1]) / d)


def lg_arrow(ax, S, a, lg, rad=-0.6):
    """Curved arrow from the C-LG bond to the leaving group (an atom of the At object S)."""
    c, l = S.p(a), S.p(lg)
    ux, uy = _unit(c, l)
    px, py = -uy, ux
    if py < 0:
        px, py = -px, -py
    mid = S.mid(a, lg)
    curved(ax, (mid[0] + 0.1 * px, mid[1] + 0.1 * py), (l[0] + 0.5 * px - 0.05 * ux, l[1] + 0.5 * py - 0.05 * uy), rad=rad)


# ------------------------------------------------------------------ generic SN2 and E2 mechanisms
def mech_sn2(key, sub, a, lg, nu_label, nu_charge, prod, lg_label, nu_tag="nucleophile", flip=False):
    nu, lgm = ion(nu_label, nu_charge), ion(lg_label, -1)
    if flip:                                   # leaving group on the left, nucleophile on the right
        sub = mirror(sub)
        row = [sub, "+", nu, ARR("SN2"), prod, "+", lgm]
    else:
        row = [nu, "+", sub, ARR("SN2"), prod, "+", lgm]

    def arrows(ax, at):
        N, S = (at[(0, 2)], at[(0, 0)]) if flip else (at[(0, 0)], at[(0, 2)])
        c, l = S.p(a), S.p(lg)
        vx, vy = _unit(l, c)                         # from the leaving group through the carbon: the back side
        n0 = N.p(0)
        if flip:
            curved(ax, (n0[0] - 0.5, n0[1] + 0.33), (c[0] + 0.55 * vx, c[1] + 0.55 * vy + 0.05), rad=0.35)
        else:
            curved(ax, (n0[0] + 0.5, n0[1] + 0.33), (c[0] + 0.55 * vx, c[1] + 0.55 * vy + 0.05), rad=-0.35)
        lg_arrow(ax, S, a, lg)
        T(ax, n0[0], n0[1] - 0.85, nu_tag, 10.5, GRAY)
        T(ax, l[0], l[1] - 0.85, "leaving group", 10.5, GRAY)

    draw_rows(P("m_" + key), [row], row_h=3.8, arrows=arrows)
    STEPS["ws_" + key] = [([nu, sub], [prod, lgm])]


def mech_e2(key, sub, h, beta, alpha, lg, base, base_o, alkene, conj, lg_label="Br"):
    lgm = bromide() if lg_label == "Br" else ion(lg_label, -1)
    row = [base, "+", sub, ARR("E2"), alkene, "+", conj, "+", lgm]

    def arrows(ax, at):
        B, S = at[(0, 0)], at[(0, 2)]
        o, hp = B.p(base_o), S.p(h)
        curved(ax, (o[0] + 0.5, o[1] + 0.35), (hp[0] - 0.12, hp[1] + 0.12), rad=-0.3)
        curved(ax, S.mid(beta, h, 0.08, -0.05), S.mid(beta, alpha, -0.02, 0.1), rad=-0.55)
        lg_arrow(ax, S, alpha, lg, rad=-0.6)

    draw_rows(P("m_" + key), [row], row_h=3.4, arrows=arrows)
    STEPS["ws_" + key] = [([sub, base], [alkene, conj, lgm])]


# ------------------------------------------------------------------ specific multi-step mechanisms
def oxonium_on(cat, idx, r_atoms, ang=90, charge=1, with_h=True):
    """A copy of a carbocation (charge removed) with an oxygen bonded at angle `ang` to atom idx.
    r_atoms: 1 for a methyl on oxygen, 2 for an ethyl.  with_h: O-H present (oxonium); otherwise the neutral ether."""
    m = Mol()
    for x, y, lab in cat.atoms:
        m.add(x, y, lab)
    for a, b, st in cat.bonds:
        m.bond(a, b, st)
    x, y, _ = cat.atoms[idx]
    o = m.add(x + math.cos(math.radians(ang)), y + math.sin(math.radians(ang)), "O", charge if with_h else 0)
    m.bond(idx, o)
    ox, oy, _ = m.atoms[o]
    if with_h:
        h = m.add(ox - 0.75, oy + 0.5, "H")
        m.bond(o, h)
    c1 = m.add(ox + 0.75, oy + 0.5)
    m.bond(o, c1)
    if r_atoms == 2:
        c2 = m.add(ox + 1.6, oy + 0.0)
        m.bond(c1, c2)
    return m, o


def mech_sn1_methanol(key="w3_sn1"):
    sub = chain(5, subs={1: [("Br", "plain"), ("", "plain")]})
    cat = chain(5, subs={1: [("", "plain")]})
    cat.charge[1] = 1
    brm = bromide()
    cat2 = chain(5, subs={1: [("", "plain")]})
    cat2.charge[1] = 1
    meoh = methanol()
    ox, o_idx = oxonium_on(cat, 1, 1, 90)
    ox_b, _ = oxonium_on(cat, 1, 1, 90)
    base = methanol(o_right=True)
    ether, _ = oxonium_on(cat, 1, 1, 90, with_h=False)
    pm = methanol(charge=+1)
    rows = [[sub, ARR("", ""), cat, "+", brm],
            [cat2, "+", meoh, ARR("", ""), ox],
            [base, "+", ox_b, ARR("", ""), ether, "+", pm]]
    heads = ["Step 1 (slow): the leaving group leaves", "Step 2: the solvent attacks the carbocation",
             "Step 3: a second solvent molecule removes the proton on oxygen"]

    def arrows(ax, at):
        S = at[(0, 0)]
        br = find(sub, "Br")
        lg_arrow(ax, S, 1, br, rad=-0.7)
        C, M = at[(1, 0)], at[(1, 2)]
        o = M.p(0)
        curved(ax, (o[0] - 0.3, o[1] + 0.15), (C.p(1)[0] + 0.5, C.p(1)[1] + 0.3), rad=0.5)
        B, X = at[(2, 0)], at[(2, 2)]
        h = find(ox_b, "H")
        bo = B.p(1)
        curved(ax, (bo[0] + 0.1, bo[1] + 0.4), (X.p(h)[0] - 0.05, X.p(h)[1] + 0.2), rad=-0.5)

    draw_rows(P("m_" + key), rows, headers=heads, row_h=3.6, arrows=arrows)
    STEPS["ws_" + key] = [([sub], [cat, brm]), ([cat2, meoh], [ox]), ([ox_b, base], [ether, pm])]


def mech_rearr_e1(key="w3_rearr"):
    sub = chain(4, subs={1: [("Br", "plain")], 2: [("", "plain"), ("H", "plain")]})
    sec = chain(4, subs={2: [("", "plain"), ("H", "plain")]})
    sec.charge[1] = 1
    sec2 = chain(4, subs={2: [("", "plain"), ("H", "plain")]})
    sec2.charge[1] = 1
    ter = chain(4, subs={2: [("", "plain")]})
    ter.charge[2] = 1
    add_h(ter, 1, 270)
    ter2 = chain(4, subs={2: [("", "plain")]})
    ter2.charge[2] = 1
    h2 = add_h(ter2, 1, 270)
    brm = bromide()
    eth = mech_ethanol_left()
    alk = chain(4, double=[(1, 2)], subs={2: [("", "plain")]})
    peth = mech.ethanol(+1)
    rows = [[sub, ARR(""), sec, "+", brm],
            [sec2, ARR("1,2-hydride shift"), ter],
            [eth, "+", ter2, ARR(""), alk, "+", peth]]
    heads = ["Step 1 (slow): ionization gives a secondary carbocation", "Step 2: a hydride shifts to give a tertiary carbocation",
             "Step 3: the solvent removes a β proton (E1)"]

    def arrows(ax, at):
        S = at[(0, 0)]
        lg_arrow(ax, S, 1, find(sub, "Br"), rad=-0.7)
        A = at[(1, 0)]
        hi = find(sec2, "H")
        mid = A.mid(2, hi, 0.0, 0.05)
        curved(ax, mid, (A.p(1)[0] + 0.1, A.p(1)[1] + 0.35), rad=0.75)
        B, C = at[(2, 0)], at[(2, 2)]
        o = B.p(0)
        curved(ax, (o[0] + 0.05, o[1] - 0.4), (C.p(h2)[0] - 0.2, C.p(h2)[1] - 0.02), rad=0.2)
        curved(ax, C.mid(1, h2, 0.08, 0.0), C.mid(1, 2, 0.0, 0.18), rad=-0.8)

    draw_rows(P("m_" + key), rows, headers=heads, row_h=3.6, arrows=arrows)
    STEPS["ws_" + key] = [([sub], [sec, brm]), ([sec2], [ter]), ([ter2, eth], [alk, peth])]


def mech_ethanol_left():
    return mech.ethanol(o_left=True)


def mech_alcohol_hbr_sn2(key="w4_sn2"):
    alc = chain(5, end_labels={4: "OH"})
    h_br = hbr()
    prot = chain(5, end_labels={4: "OH₂"})
    prot.charge[4] = 1
    prot2 = chain(5, end_labels={4: "OH₂"})
    prot2.charge[4] = 1
    br1, br2 = bromide(), bromide()
    rbr = halide(4, "Br")
    wat = water()
    prot2 = mirror(prot2)
    rows = [[alc, "+", h_br, ARR(""), prot, "+", br1],
            [prot2, "+", br2, ARR(""), rbr, "+", wat]]
    heads = ["Step 1: the alcohol oxygen is protonated (turns OH into a good leaving group)",
             "Step 2: bromide attacks the carbon from the back side (SN2); water leaves"]

    def arrows(ax, at):
        A, H = at[(0, 0)], at[(0, 2)]
        o = A.p(4)
        h = H.p(0)
        curved(ax, (o[0] + 0.45, o[1] + 0.3), (h[0] - 0.2, h[1] + 0.15), rad=-0.4)
        curved(ax, H.mid(0, 1, 0.0, 0.08), (H.p(1)[0] + 0.3, H.p(1)[1] + 0.45), rad=-0.7)
        S, B = at[(1, 0)], at[(1, 2)]
        c, ol = S.p(3), S.p(4)
        vx, vy = _unit(ol, c)
        bp = B.p(0)
        curved(ax, (bp[0] - 0.45, bp[1] + 0.25), (c[0] + 0.55 * vx, c[1] + 0.55 * vy), rad=0.4)
        lg_arrow(ax, S, 3, 4, rad=-0.6)

    draw_rows(P("m_" + key), rows, headers=heads, row_h=3.6, arrows=arrows)
    STEPS["ws_" + key] = [([alc, h_br], [prot, br1]), ([br2, prot2], [rbr, wat])]


def mech_alcohol_hbr_sn1(key="w4_sn1"):
    alc = chain(4, subs={1: [("OH", "plain"), ("", "plain")]})
    h_br = hbr()
    pro = chain(4, subs={1: [("OH₂", "plain"), ("", "plain")]})
    pro.charge[find(pro, "OH₂")] = 1
    pro2 = chain(4, subs={1: [("OH₂", "plain"), ("", "plain")]})
    pro2.charge[find(pro2, "OH₂")] = 1
    cat = chain(4, subs={1: [("", "plain")]})
    cat.charge[1] = 1
    cat2 = chain(4, subs={1: [("", "plain")]})
    cat2.charge[1] = 1
    prod = chain(4, subs={1: [("Br", "plain"), ("", "plain")]})
    b1, b2 = bromide(), bromide()
    wat = water()
    rows = [[alc, "+", h_br, ARR(""), pro, "+", b1],
            [pro2, ARR("slow"), cat, "+", wat],
            [cat2, "+", b2, ARR(""), prod]]
    heads = ["Step 1: the OH is protonated", "Step 2: water leaves, giving a tertiary carbocation",
             "Step 3: bromide attacks the carbocation"]

    def arrows(ax, at):
        A, H = at[(0, 0)], at[(0, 2)]
        o = A.p(find(alc, "OH"))
        h = H.p(0)
        curved(ax, (o[0] + 0.4, o[1] + 0.3), (h[0] - 0.2, h[1] + 0.15), rad=-0.4)
        curved(ax, H.mid(0, 1, 0.0, 0.08), (H.p(1)[0] + 0.3, H.p(1)[1] + 0.45), rad=-0.7)
        S = at[(1, 0)]
        lg_arrow(ax, S, 1, find(pro2, "OH₂"), rad=-0.7)
        C, B = at[(2, 0)], at[(2, 2)]
        bp = B.p(0)
        curved(ax, (bp[0] - 0.45, bp[1] + 0.25), (C.p(1)[0] + 0.55, C.p(1)[1] + 0.3), rad=0.45)

    draw_rows(P("m_" + key), rows, headers=heads, row_h=3.6, arrows=arrows)
    STEPS["ws_" + key] = [([alc, h_br], [pro, b1]), ([pro2], [cat, wat]), ([cat2, b2], [prod])]


# ------------------------------------------------------------------ Newman projections for the E2 worksheet
def newman_ws(path, back=None, front=None):
    from matplotlib.patches import Circle
    fig, ax = canvas(3.3, 3.3, (-2.4, 2.4), (-2.4, 2.4))
    ax.add_patch(Circle((0, 0), 0.95, fill=False, ec=INK, lw=2))
    if back:
        for ang, lab in back.items():
            a = math.radians(ang)
            ax.plot([0.95 * math.cos(a), 1.7 * math.cos(a)], [0.95 * math.sin(a), 1.7 * math.sin(a)], color=INK, lw=2)
            T(ax, 2.05 * math.cos(a), 2.05 * math.sin(a), lab, 11)
    if front:
        for ang, lab in front.items():
            a = math.radians(ang)
            ax.plot([0, 1.7 * math.cos(a)], [0, 1.7 * math.sin(a)], color=INK, lw=2)
            T(ax, 2.05 * math.cos(a), 2.05 * math.sin(a), lab, 11, color=("#c92a2a" if lab == "Br" else INK))
    fig.savefig(path, dpi=200, facecolor="white")
    plt.close(fig)


# ================================================================== the worksheets' content
def build_all():
    COUNT.clear()
    # ---------------------------------------------------------------- common structures
    t_br = lambda: chain(4, subs={1: [("Br", "plain"), ("", "plain")]})              # 2-bromo-2-methylbutane
    zait = lambda: chain(4, double=[(1, 2)], subs={1: [M()]})                        # 2-methylbut-2-ene
    hof = lambda: chain(4, double=[(0, 1)], subs={1: [M()]})                         # 2-methylbut-1-ene
    T_BR, ZAIT, HOF = "CCC(C)(C)Br", "CC=C(C)C", "C=C(C)CC"

    # ================= worksheet 1: SN2
    qa("w1a1", [MI(halide(4, "Br"), "CCCCBr")], ("NaCN", "DMSO"), [MI(halide(4, "CN"), "CCCCC#N")])
    qa("w1a2", [MI(halide(3, "Br"), "CCCBr")], ("NaOCH3", "CH3OH"), [MI(halide(3, "OCH3"), "CCCOC")])
    qa("w1a3", [MI(chain(5, subs={1: [("Br", "wedge")]}), "CCCC(C)Br", ["S"])], ("NaSH", "DMSO"),
       [MI(chain(5, subs={1: [("SH", "dash")]}), "CCCC(C)S", ["R"])])
    qa("w1a4", [MI(halide(4, "Cl"), "CCCCCl")], ("NaI", "acetone"), [MI(halide(4, "I"), "CCCCI")])
    qa("w1a5", [MI(halide(2, "Br"), "CCBr")], ("NaSCH3", "CH3OH"), [MI(halide(2, "SCH3"), "CCSC")])
    qa("w1b1", [MI(halide(4, "Br"), "CCCCBr")], ("NaSH", "ethanol"), [MI(halide(4, "SH"), "CCCCS")], ask="reagent")
    qa("w1b2", [MI(halide(1, "I"), "CI")], ("(CH3)3CONa", "(CH3)3COH"),
       [MI(chain(3, subs={1: [("OCH3", "plain"), M()]}), "COC(C)(C)C")], ask="reagent")
    qa("w1b3", [MI(chain(5, subs={1: [("Cl", "wedge")]}), "CCCC(C)Cl", ["S"])], ("NaI", "acetone"),
       [MI(chain(5, subs={1: [("I", "dash")]}), "CCCC(C)I", ["R"])], ask="reagent")
    qa("w1b4", [MI(halide(3, "Br"), "CCCBr")], ("NaOCH2CH3", "ethanol"), [MI(halide(3, "OEt"), "CCCOCC")], ask="reagent")
    # mechanisms
    sub1 = halide(3, "Br")
    prompt("w1m1", [MI(halide(3, "Br"), "CCCBr")], ("NaCN", "DMSO"), [MI(halide(3, "CN"), "CCCC#N")])
    mech_sn2("w1m1", sub1, 2, 3, "CN", -1, halide(3, "CN"), "Br")
    sub2 = chain(3, subs={1: [("Br", "plain")]})
    prompt("w1m2", [MI(chain(3, subs={1: [("Br", "plain")]}), "CC(C)Br")], ("NaSH", "ethanol"),
           [MI(chain(3, subs={1: [("SH", "plain")]}), "CC(C)S")])
    mech_sn2("w1m2", sub2, 1, find(sub2, "Br"), "HS", -1, chain(3, subs={1: [("SH", "plain")]}), "Br")
    render("w1d", [MI(neopentyl_bromide(), "CC(C)(C)CBr")], scale=0.36)

    # ================= worksheet 2: E2
    c_ = lambda: chain(4, subs={1: [("Br", "plain")], 2: [M()]})                      # 2-bromo-3-methylbutane
    z2 = lambda: chain(4, double=[(1, 2)], subs={2: [M()]})                           # 2-methylbut-2-ene
    h2 = lambda: chain(4, double=[(0, 1)], subs={2: [M()]})                           # 3-methylbut-1-ene
    qa("w2a1", [MI(c_(), "CC(Br)C(C)C")], ("NaOEt", "EtOH, heat"), [MI(z2(), "CC=C(C)C"), "+", MI(h2(), "C=CC(C)C")])
    qa("w2a2", [MI(c_(), "CC(Br)C(C)C")], ("t-BuOK", "t-BuOH, heat"), [MI(h2(), "C=CC(C)C"), "+", MI(z2(), "CC=C(C)C")])
    pbr = lambda: chain(5, subs={1: [("Br", "plain"), M()]})                          # 2-bromo-2-methylpentane
    pz = lambda: chain(5, double=[(1, 2)], subs={1: [M()]})                           # 2-methylpent-2-ene
    ph = lambda: chain(5, double=[(0, 1)], subs={1: [M()]})                           # 2-methylpent-1-ene
    qa("w2a3", [MI(pbr(), "CC(C)(Br)CCC")], ("NaOEt", "EtOH, heat"), [MI(pz(), "CC(C)=CCC"), "+", MI(ph(), "C=C(C)CCC")])
    cm = lambda: ring(6, subs={0: [("Br", "plain"), M()]})
    cz = lambda: ring(6, subs={0: [M()]}, double=[(0, 1)])
    ch = lambda: ring(6, subs={0: [("", "double")]})
    qa("w2a4", [MI(cm(), "CC1(Br)CCCCC1")], ("NaOEt", "EtOH, heat"), [MI(cz(), "CC1=CCCCC1"), "+", MI(ch(), "C=C1CCCCC1")])
    qa("w2b1", [MI(t_br(), T_BR)], ("t-BuOK", "t-BuOH"), [MI(hof(), HOF)], ask="reagent")
    qa("w2b2", [MI(t_br(), T_BR)], ("NaOEt", "EtOH, heat"), [MI(zait(), ZAIT)], ask="reagent")
    qa("w2b3", [MI(halide(4, "Br"), "CCCCBr")], ("t-BuOK", "t-BuOH"), [MI(chain(4, double=[(0, 1)]), "C=CCC")], ask="reagent")
    qa("w2b4", [MI(ring(6, subs={0: [("Br", "plain")]}), "BrC1CCCCC1")], ("NaOEt", "EtOH, heat"),
       [MI(ring(6, double=[(0, 1)]), "C1=CCCCC1")], ask="reagent")
    # mechanisms
    sub = chain(5, subs={1: [("Br", "plain"), ("", "plain")]})
    hh = add_h(sub, 2, 90)
    prompt("w2m1", [MI(pbr(), "CC(C)(Br)CCC")], ("NaOEt", "EtOH"), [MI(pz(), "CC(C)=CCC")])
    mech_e2("w2m1", sub, hh, 2, 1, find(sub, "Br"), ethoxide(), 2, pz(), mech.ethanol())
    sub = chain(5, subs={1: [("Br", "plain"), ("", "plain")]})
    me = [i for i, a in enumerate(sub.atoms) if i > 4 and a[2] == ""][0]
    hh = add_h(sub, me, 190)
    tbuo = chain(3, subs={1: [("O", "plain"), ("", "plain")]})
    tbuo.charge[find(tbuo, "O")] = -1
    prompt("w2m2", [MI(pbr(), "CC(C)(Br)CCC")], ("t-BuOK", "t-BuOH"), [MI(ph(), "C=C(C)CCC")])
    mech_e2("w2m2", sub, hh, me, 1, find(sub, "Br"), tbuo, find(tbuo, "O"), ph(), tbu_oh())
    # Newman projections: a blank template for the students and the two answers
    newman_ws(P("newman_blank"))
    newman_ws(P("newman_trans"), back={90: "H", 210: "CH3", 330: "H"}, front={270: "Br", 30: "CH3", 150: "H"})
    newman_ws(P("newman_cis"), back={90: "H", 210: "H", 330: "CH3"}, front={270: "Br", 30: "CH3", 150: "H"})
    render("w2d", [MI(neopentyl_bromide(), "CC(C)(C)CBr")], scale=0.36)

    # ================= worksheet 3: SN1 and E1
    qa("w3a1", [MI(pbr(), "CC(C)(Br)CCC")], ("CH3OH", "heat"),
       [MI(chain(5, subs={1: [("OCH3", "plain"), M()]}), "COC(C)(C)CCC"), "+", MI(pz(), "CC(C)=CCC"), "+", MI(ph(), "C=C(C)CCC")])
    qa("w3a2", [MI(cm(), "CC1(Br)CCCCC1")], ("EtOH", "heat"),
       [MI(ring(6, subs={0: [("OEt", "plain"), M()]}), "CCOC1(C)CCCCC1"), "+", MI(cz(), "CC1=CCCCC1"), "+", MI(ch(), "C=C1CCCCC1")])
    sec_br = lambda: chain(4, subs={1: [("Br", "plain")], 2: [M()]})
    qa("w3a3", [MI(sec_br(), "CC(Br)C(C)C")], ("EtOH", "heat"),
       [MI(chain(4, subs={1: [("OEt", "plain"), M()]}), "CCOC(C)(C)CC"), "+", MI(zait(), ZAIT), "+", MI(hof(), HOF)])
    r_br = lambda: chain(7, subs={2: [("Br", "wedge"), M()]})
    qa("w3a4", [MI(r_br(), "CCC(C)(Br)CCCC", ["?"])], ("CH3OH", ""),
       [MI(chain(7, subs={2: [("OCH3", "wedge"), M()]}), "CCC(C)(OC)CCCC", ["?"]), "+",
        MI(chain(7, subs={2: [("OCH3", "dash"), M()]}), "CCC(C)(OC)CCCC", ["?"])])
    qa("w3b1", [MI(tbu_oh("Cl"), "CC(C)(C)Cl")], ("CH3OH", "heat"), [MI(chain(3, subs={1: [("OCH3", "plain"), M()]}), "COC(C)(C)C")], ask="reagent")
    qa("w3b2", [MI(chain(4, subs={1: [("OH", "plain"), M()]}), "CCC(C)(C)O")], ("conc. H2SO4", "heat"),
       [MI(zait(), ZAIT)], ask="reagent")
    qa("w3b3", [MI(tbu_oh("Br"), "CC(C)(C)Br")], ("NaOEt", "EtOH"), [MI(chain(3, double=[(0, 1)], subs={1: [M()]}), "C=C(C)C")], ask="reagent")
    qa("w3b4", [MI(tbu_oh("OH"), "CC(C)(C)O")], ("HBr", ""), [MI(tbu_oh("Br"), "CC(C)(C)Br")], ask="reagent")
    prompt("w3m1", [MI(pbr(), "CC(C)(Br)CCC")], ("CH3OH", "heat"), [MI(chain(5, subs={1: [("OCH3", "plain"), M()]}), "COC(C)(C)CCC")])
    mech_sn1_methanol("w3m1")
    prompt("w3m2", [MI(sec_br(), "CC(Br)C(C)C")], ("EtOH", "heat"), [MI(zait(), ZAIT)])
    mech_rearr_e1("w3m2")

    # ================= worksheet 4: reagents
    qa("w4t1", [MI(halide(4, "Br"), "CCCCBr")], ("t-BuOK", "t-BuOH"), [MI(chain(4, double=[(0, 1)]), "C=CCC")], ask="reagent")
    qa("w4t2", [MI(halide(4, "Br"), "CCCCBr")], ("NaOCH3", "CH3OH"), [MI(halide(4, "OCH3"), "CCCCOC")], ask="reagent")
    qa("w4t3", [MI(t_br(), T_BR)], ("NaOEt", "EtOH, heat"), [MI(zait(), ZAIT)], ask="reagent")
    qa("w4t4", [MI(t_br(), T_BR)], ("CH3OH", "heat"), [MI(chain(4, subs={1: [("OCH3", "plain"), M()]}), "CCC(C)(C)OC")], ask="reagent")
    qa("w4t5", [MI(halide(4, "OH"), "CCCCO")], ("HBr", ""), [MI(halide(4, "Br"), "CCCCBr")], ask="reagent")
    qa("w4t6", [MI(chain(4, subs={1: [("OH", "plain"), M()]}), "CCC(C)(C)O")], ("conc. H2SO4", "heat"), [MI(zait(), ZAIT)], ask="reagent")
    qa("w4t7", [MI(chain(4, subs={1: [("OH", "plain"), M()]}), "CCC(C)(C)O")], ("HBr", ""), [MI(t_br(), T_BR)], ask="reagent")
    qa("w4t8", [MI(chain(4, subs={1: [("OH", "wedge")]}), "CCC(C)O", ["?"])], ("1) TsCl, pyridine", "2) NaBr"),
       [MI(chain(4, subs={1: [("Br", "dash")]}), "CCC(C)Br", ["?"])], ask="reagent")
    prompt("w4m1", [MI(halide(4, "OH"), "CCCCO")], ("HBr", ""), [MI(halide(4, "Br"), "CCCCBr")])
    mech_alcohol_hbr_sn2("w4m1")
    prompt("w4m2", [MI(chain(4, subs={1: [("OH", "plain"), M()]}), "CCC(C)(C)O")], ("HBr", ""), [MI(t_br(), T_BR)])
    mech_alcohol_hbr_sn1("w4m2")

    # ================= worksheet 5: mixed
    qa("w5a1", [MI(chain(3, subs={1: [("Br", "plain")]}), "CC(C)Br")], ("NaOCH3", "CH3OH"),
       [MI(chain(3, double=[(0, 1)]), "C=CC"), "+", MI(chain(3, subs={1: [("OCH3", "plain")]}), "CC(C)OC")])
    qa("w5a2", [MI(halide(4, "I"), "CCCCI")], ("NaSH", "DMSO"), [MI(halide(4, "SH"), "CCCCS")])
    d_br = lambda: chain(4, subs={1: [("Br", "plain"), M()], 2: [M()]})                # 2-bromo-2,3-dimethylbutane
    qa("w5a3", [MI(d_br(), "CC(C)(Br)C(C)C")], ("NaOEt", "EtOH, heat"),
       [MI(chain(4, double=[(1, 2)], subs={1: [M()], 2: [M()]}), "CC(C)=C(C)C"), "+",
        MI(chain(4, double=[(0, 1)], subs={1: [M()], 2: [M()]}), "C=C(C)C(C)C")])
    qa("w5a4", [MI(t_br(), T_BR)], ("H2O", "heat"),
       [MI(chain(4, subs={1: [("OH", "plain"), M()]}), "CCC(C)(C)O"), "+", MI(zait(), ZAIT), "+", MI(hof(), HOF)])
    qa("w5a5", [MI(ring(6, subs={0: [("Br", "plain")]}), "BrC1CCCCC1")], ("NaOEt", "EtOH, heat"), [MI(ring(6, double=[(0, 1)]), "C1=CCCCC1")])
    n6 = LBL(nextnum("w5a6"))
    render("q_w5a6", [n6, MI(chain(4, subs={1: [("Br", "plain")]}), "CCC(C)Br"), ARR("H2O", "heat"), ("gap", 6.5)], scale=SCALE)
    render("a_w5a6", [n6, MI(chain(4, subs={1: [("Br", "plain")]}), "CCC(C)Br"), ARR("H2O", "heat"), "no reaction"], scale=SCALE)
    qa("w5a7", [MI(halide(3, "Br"), "CCCBr")], ("t-BuOK", "t-BuOH"), [MI(chain(3, double=[(0, 1)]), "C=CC")])
    sub = chain(4, subs={1: [("Br", "plain"), ("", "plain")], 2: [("", "plain")]})
    hh = add_h(sub, 2, 150)
    zz = chain(4, double=[(1, 2)], subs={1: [M()], 2: [M()]})
    prompt("w5m1", [MI(d_br(), "CC(C)(Br)C(C)C")], ("NaOEt", "EtOH"), [MI(zz, "CC(C)=C(C)C")])
    mech_e2("w5m1", sub, hh, 2, 1, find(sub, "Br"), ethoxide(), 2, zz, mech.ethanol())
    sub = halide(4, "I")
    prompt("w5m2", [MI(halide(4, "I"), "CCCCI")], ("NaSH", "DMSO"), [MI(halide(4, "SH"), "CCCCS")])
    mech_sn2("w5m2", sub, 3, 4, "HS", -1, halide(4, "SH"), "I", flip=True)
    qa("w5c1", [MI(halide(3, "OH"), "CCCO")], ("?", ""), [MI(halide(3, "OEt"), "CCCOCC")], ask="reagent")
    qa("w5c2", [MI(chain(4, subs={1: [("OH", "plain"), M()]}), "CCC(C)(C)O")], ("?", ""), [MI(hof(), HOF)], ask="reagent")
    render("w5c3", [MI(chain(3, subs={1: [("OCH3", "plain")]}), "CC(C)OC")], scale=0.36)


if __name__ == "__main__":
    build_all()
    print("worksheet figures written to", WS_IMG)
