"""Reusable animated scenes: reaction profiles, the combustion bond-breaking scene, particle boxes."""
import math, random
from core import *


# ------------------------------------------------------------------ energy profiles
def profile_points(px, py, pw, ph, e_r, e_p, e_pk, n=70):
    """Smooth reaction-profile curve; energies on a 0..10 scale mapped into the box (px, py, pw, ph) in inches."""
    Y = lambda e: py + ph * (1 - e / 10.0)
    ctrl = [(0, e_r), (0.14, e_r), (0.27, e_r + 0.35 * (e_pk - e_r)), (0.43, e_pk - 0.2), (0.5, e_pk), (0.57, e_pk - 0.2),
            (0.73, e_p + 0.35 * (e_pk - e_p)), (0.86, e_p), (1.0, e_p)]
    return smooth([(px + pw * a, Y(e)) for a, e in ctrl], n), Y


def path_offsets(points, k=36):
    """Relative EMU offsets along a dense polyline (k samples) for a motion-path effect."""
    step = max(1, len(points) // k)
    pts = points[::step]
    if pts[-1] != points[-1]:
        pts.append(points[-1])
    x0, y0 = pts[0]
    return [(E(x - x0), E(y - y0)) for x, y in pts]


def ball(slide, x, y, r=0.17, color=EMBER):
    return circle(slide, x, y, r, color, WHITE, 2.0)


# ------------------------------------------------------------------ the combustion bond scene (qualitative in section 1, numbers in section 5)
def combustion_scene(s, tl, quant, label_y=5.3):
    prod_pos = {"CO2": (10.1, 2.35), "H2O1": (9.0, 4.35), "H2O2": (11.6, 4.35)}
    # product bonds first so the atoms drawn later sit on top of them
    pb = []
    for name, key in (("CO2", "CO2"), ("H2O", "H2O1"), ("H2O", "H2O2")):
        a, b = MOLS[name]
        pm = Molecule(s, a, b, prod_pos[key][0], prod_pos[key][1], 0.9)
        pb += pm.bonds
        for sh in pm.atoms:                      # we only want the bond lines here; remove the atoms again
            sh._element.getparent().remove(sh._element)
    ch4 = mol(s, "CH4", 2.0, 3.5, 0.9)
    o2a = mol(s, "O2", 4.5, 2.5, 0.9)
    o2b = mol(s, "O2", 4.5, 4.4, 0.9)
    reactant_bonds = ch4.bonds + o2a.bonds + o2b.bonds
    # where each atom ends up
    s0 = 0.9
    h2o1, h2o2, co2 = prod_pos["H2O1"], prod_pos["H2O2"], prod_pos["CO2"]
    targets = [
        (ch4.atoms[0], (co2[0], co2[1])),
        (ch4.atoms[1], (h2o1[0] - 0.62 * s0, h2o1[1] + 0.5 * s0)),
        (ch4.atoms[2], (h2o1[0] + 0.62 * s0, h2o1[1] + 0.5 * s0)),
        (ch4.atoms[3], (h2o2[0] - 0.62 * s0, h2o2[1] + 0.5 * s0)),
        (ch4.atoms[4], (h2o2[0] + 0.62 * s0, h2o2[1] + 0.5 * s0)),
        (o2a.atoms[0], (co2[0] - 1.15 * s0, co2[1])),
        (o2a.atoms[1], (h2o1[0], h2o1[1])),
        (o2b.atoms[0], (co2[0] + 1.15 * s0, co2[1])),
        (o2b.atoms[1], (h2o2[0], h2o2[1])),
    ]
    # three result cards
    cw = 3.85
    c1 = card_text(s, 0.55, label_y, cw, 1.45, "**Break bonds**\nabsorbs energy (endothermic)" + ("\n4 C–H + 2 O=O = **+2648 kJ**" if quant else ""), 15, SOFT[ICE], INK, "l", "m", pad=0.22)
    c2 = card_text(s, 0.55 + cw + 0.25, label_y, cw, 1.45, "**Form bonds**\nreleases energy (exothermic)" + ("\n2 C=O + 4 O–H = **−3450 kJ**" if quant else ""), 15, SOFT[EMBER], INK, "l", "m", pad=0.22)
    c3 = card_text(s, 0.55 + 2 * (cw + 0.25), label_y, cw, 1.45,
                   ("**Net: more energy released**\nΔH = 2648 − 3450 = **−802 kJ/mol**" if quant else "**Net: more energy released than absorbed**\nso the reaction is exothermic (ΔH < 0)"), 15, SOFT[GOLD], INK, "l", "m", pad=0.22, line=GOLD)
    tl.click("Break the bonds in the reactants: this step absorbs energy")
    tl.out(*reactant_bonds, dur=900)
    tl.fade(c1)
    tl.click("The atoms rearrange into new molecules")
    for k, (a, tgt) in enumerate(targets):
        cur = (a.left / 914400 + a.width / 914400 / 2, a.top / 914400 + a.height / 914400 / 2)
        tl.move(a, [(0, 0), delta(cur, tgt)], 2600)
    tl.click("Form the new bonds: this step releases energy")
    tl.fade(*pb, dur=900)
    tl.fade(c2)
    tl.click("Compare: more energy out than in, so the reaction is exothermic")
    tl.fade(c3)
    tl.then(); tl.pulse(c3, scale=1.04, dur=500)
    return dict(reactant_bonds=reactant_bonds, product_bonds=pb)


# ------------------------------------------------------------------ particles
def scatter(n, x0, y0, x1, y1, min_d, seed):
    rnd = random.Random(seed)
    pts = []
    tries = 0
    while len(pts) < n and tries < 4000:
        tries += 1
        c = (rnd.uniform(x0, x1), rnd.uniform(y0, y1))
        if all(math.hypot(c[0] - q[0], c[1] - q[1]) >= min_d for q in pts):
            pts.append(c)
    return pts


def dots(slide, pts, r, fill, line_c="495057"):
    return [circle(slide, x, y, r, fill, line_c, 1.0) for x, y in pts]
