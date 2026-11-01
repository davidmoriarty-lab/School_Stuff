"""Unit 5, Moles and Molar Quantities: every answer in the key is computed here, then rounded to the sig figs of the data.

Conventions (the same as the Stoichiometry and Gases packets): atomic masses to 0.01 g/mol, N_A = 6.022 x 10^23,
22.4 L/mol at STP, unrounded values carry through a calculation and only the final answer is rounded.
"""
import re, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_gases import Packet, sf, OUTDIR

NA = 6.022e23
MOLAR_VOLUME = 22.4

MASS = {  # g/mol, 0.01 g/mol
    "H": 1.01, "He": 4.00, "Li": 6.94, "Be": 9.01, "C": 12.01, "N": 14.01, "O": 16.00, "F": 19.00,
    "Na": 22.99, "Mg": 24.31, "Al": 26.98, "P": 30.97, "S": 32.06, "Cl": 35.45, "K": 39.10, "Ca": 40.08,
    "Fe": 55.85, "Co": 58.93, "Ni": 58.69, "Cu": 63.55, "Br": 79.90, "Ag": 107.87, "I": 126.90,
    "Xe": 131.29, "Ba": 137.33, "Pb": 207.2, "Bi": 208.98,
}


def parse(formula):
    """'(NH4)3PO4' -> {'N': 3, 'H': 12, 'P': 1, 'O': 4}"""
    tokens = re.findall(r"[A-Z][a-z]?|\d+|\(|\)", formula)
    stack = [{}]
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == "(":
            stack.append({})
        elif t == ")":
            group = stack.pop()
            n = 1
            if i + 1 < len(tokens) and tokens[i + 1].isdigit():
                n = int(tokens[i + 1]); i += 1
            for el, c in group.items():
                stack[-1][el] = stack[-1].get(el, 0) + c * n
        elif t.isdigit():
            raise ValueError("unexpected number in " + formula)
        else:
            n = 1
            if i + 1 < len(tokens) and tokens[i + 1].isdigit():
                n = int(tokens[i + 1]); i += 1
            stack[-1][t] = stack[-1].get(t, 0) + n
        i += 1
    return stack[0]


def mm(formula):
    """Molar mass to 0.01 g/mol."""
    return round(sum(MASS[e] * n for e, n in parse(formula).items()), 2)


def mm_exact(formula):
    return sum(MASS[e] * n for e, n in parse(formula).items())


def sci(x, n, force=False):
    """x to n sig figs as '1.05 × 10²⁴' (plain digits when the exponent is small, unless force)."""
    if x == 0:
        return "0"
    e = int(math.floor(math.log10(abs(x))))
    m = x / 10 ** e
    ms = sf(m, n)
    if ms.startswith("10"):          # rounding pushed it to 10.0
        e += 1; ms = sf(m / 10, n)
    if -2 <= e <= 3 and not force:
        return sf(x, n)
    sup = str(e).replace("-", "⁻").translate(str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹"))
    return "%s × 10%s" % (ms, sup)


def pct(part, whole, d=2):
    from decimal import Decimal, ROUND_HALF_UP
    v = Decimal(repr(100.0 * part / whole)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
    return "%s%%" % v


# ---------------------------------------------------------------- 5.1 the mole and Avogadro's number
a1 = 1.75 * NA                      # atoms of Al in 1.75 mol
a2 = 3.25 * NA                      # molecules in 3.25 mol H2O
a3 = 3.4e26 / NA                    # mol CO2
a4 = 3.88e25 / NA                   # mol Ni
w_mg = 2.50 * NA                    # worked example: atoms in 2.50 mol Mg

# ---------------------------------------------------------------- 5.2 molar mass
MOLAR_LIST = [("Be", "Be"), ("N₂", "N2"), ("O₂", "O2"), ("F₂", "F2"), ("Mg", "Mg"), ("Ag", "Ag"),
              ("LiI", "LiI"), ("PbCO₃", "PbCO3"), ("Mg(OH)₂", "Mg(OH)2"), ("K₃PO₄", "K3PO4"),
              ("(NH₄)₃PO₄", "(NH4)3PO4"), ("C₆H₁₂O₆", "C6H12O6")]

# ---------------------------------------------------------------- 5.3 mole conversions
c1 = 2.5e24 / NA * mm_exact("CO2")                  # g CO2
c2 = 176 / mm_exact("CF4")                          # mol CF4
c3 = 360.0 / mm_exact("H2O")                        # mol H2O
c4 = 79.85 / mm_exact("Fe2O3")                      # mol Fe2O3
c5 = 52.5 / mm_exact("Cl2") * NA                    # molecules Cl2
c6 = 5.6 * 2 * NA                                   # Cu atoms in 5.6 mol Cu2O3
c7 = 2.5 * 6 * MASS["O"]                            # g O in 2.5 mol glucose
c8 = 15.0 / mm_exact("CaCl2") * 2 * MASS["Cl"]      # g Cl in 15.0 g CaCl2

# ---------------------------------------------------------------- 5.4 gas volume at STP
v1 = 3.20 * MOLAR_VOLUME
v2 = 1.75 * MOLAR_VOLUME
v3 = 37.8 * MOLAR_VOLUME
v4 = 5.05 / mm_exact("He") * MOLAR_VOLUME
v5 = 60.0 / mm_exact("Xe") * MOLAR_VOLUME
v6 = 75.3 / MOLAR_VOLUME * NA                       # molecules NH3
v7 = 575 / MOLAR_VOLUME * mm_exact("NH3")           # g NH3
v8 = 5.00 / mm_exact("O2") * MOLAR_VOLUME           # L
v9 = 5.00 / mm_exact("O2") * NA                     # molecules O2
v10n = 0.12 / MOLAR_VOLUME
v10m = v10n * NA                                    # molecules CO2
v10g = v10n * mm_exact("CO2")                       # g CO2

# ---------------------------------------------------------------- 5.5 percent composition
PCT = [("NaOH", "NaOH"), ("CuBr₂", "CuBr2"), ("N₂S₂", "N2S2"), ("(NH₄)₂S", "(NH4)2S"), ("(NH₄)₃PO₄", "(NH4)3PO4")]


def pct_rows(formula):
    f = parse(formula)
    tot = mm_exact(formula)
    return [(el, pct(MASS[el] * n, tot)) for el, n in f.items()]


# ---------------------------------------------------------------- 5.6 empirical and molecular formulas
def ratios(moles):
    low = min(moles)
    return [m / low for m in moles]


e1_mol = [87.3 / MASS["Na"], 121.5 / MASS["S"], 91.2 / MASS["O"]]
e1_r = ratios(e1_mol)                                # 1 : 1 : 1.5 -> Na2S2O3
e2_mol = [85.65 / MASS["Bi"], 6.56 / MASS["O"], 7.79 / MASS["F"]]
e2_r = ratios(e2_mol)                                # 1 : 1 : 1 -> BiOF
e3_n = 42.09 / (MASS["C"] + 2 * MASS["H"])           # 3.0 -> C3H6
e4_mol = [75.42 / MASS["C"], 6.63 / MASS["H"], 8.38 / MASS["N"], 9.57 / MASS["O"]]
e4_r = ratios(e4_mol)                                # 10.5 : 11 : 1 : 1 -> x2
e4_emp = mm_exact("C21H22N2O2")
e4_n = 334.0 / e4_emp
w_emp = [40.0 / MASS["C"], 6.7 / MASS["H"], 53.3 / MASS["O"]]    # worked example: CH2O, M = 180
w_emp_r = ratios(w_emp)
w_emp_n = 180.0 / (MASS["C"] + 2 * MASS["H"] + MASS["O"])

# ---------------------------------------------------------------- 5.7 hydrates
H2O = mm_exact("H2O")


def hydrate(total, anhydrous, salt):
    water = total - anhydrous
    n_w = water / H2O
    n_s = anhydrous / mm_exact(salt)
    return water, n_w, n_s, n_w / n_s


h1 = hydrate(13.52, 6.60, "MgSO4")
h2 = hydrate(3.97, 2.54, "CuSO4")
h3 = hydrate(8.85, 8.85 - 1.28, "Na2CO3")
h4 = hydrate(16.4, 13.0, "CaSO4")
h5_w = 45.43 / H2O
h5_s = 54.57 / mm_exact("CoCl2")
h5_x = h5_w / h5_s

# ---------------------------------------------------------------- extra practice
x_a = 8.50 / mm_exact("NH3") * NA                    # molecules NH3 in 8.50 g
x_b = pct(6 * MASS["C"], mm_exact("C6H12O6"))        # percent C in glucose
x_c_mol = [52.14 / MASS["C"], 13.13 / MASS["H"], 34.73 / MASS["O"]]
x_c_r = ratios(x_c_mol)                              # 2 : 6 : 1 -> C2H6O
x_c_n = 46.07 / mm_exact("C2H6O")
x_d = 5.00 / MOLAR_VOLUME * mm_exact("CO2")          # g CO2 in 5.00 L at STP
x_e_hyd = 21.67 - 18.42                              # lab data: BaCl2 hydrate
x_e_anh = 21.19 - 18.42
x_e_w = x_e_hyd - x_e_anh
x_e_x = (x_e_w / H2O) / (x_e_anh / mm_exact("BaCl2"))

# ---------------------------------------------------------------- self-check against values worked out by hand
def _check():
    hand = {"H2O": 18.02, "CO2": 44.01, "NH3": 17.04, "(NH4)3PO4": 149.12, "C6H12O6": 180.18, "Al2(SO4)3": 342.14,
            "Mg(OH)2": 58.33, "K3PO4": 212.27, "PbCO3": 267.21, "LiI": 133.84, "CF4": 88.01, "Fe2O3": 159.70,
            "CaCl2": 110.98, "MgSO4": 120.37, "CuSO4": 159.61, "CoCl2": 129.83, "Na2CO3": 105.99, "CaSO4": 136.14}
    for f, v in hand.items():
        assert abs(mm(f) - v) < 0.006, (f, mm(f), v)
    assert round(e1_r[2] / e1_r[0], 1) == 1.5 and round(e2_r[1]) == 1 and round(e3_n) == 3
    assert [round(r * 2) for r in e4_r] == [21, 22, 2, 2] and all(abs(r * 2 - round(r * 2)) < 0.1 for r in e4_r), e4_r
    assert [round(h[3]) for h in (h1, h2, h3, h4)] == [7, 5, 1, 2], [h[3] for h in (h1, h2, h3, h4)]
    assert round(h5_x) == 6 and round(e4_n) == 1 and round(x_e_x) == 2
    assert [round(r * 2) for r in x_c_r] == [4, 12, 2] or [round(r) for r in x_c_r] == [2, 6, 1], x_c_r


_check()


SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


def pretty(formula):
    """'Mg(OH)2' -> 'Mg(OH)₂'"""
    return re.sub(r"(?<=[A-Za-z\)])(\d+)", lambda m: m.group(1).translate(SUB), formula)


def work(formula):
    """'(NH4)3PO4' -> 'N 3(14.01) + H 12(1.01) + P 30.97 + O 4(16.00)'"""
    parts = []
    for el, n in parse(formula).items():
        parts.append("%s %s" % (el, ("%d(%.2f)" % (n, MASS[el])) if n > 1 else "%.2f" % MASS[el]))
    return " + ".join(parts)


class MolesPacket(Packet):
    def save(self, path, unit_label, title):
        sec = self.doc.sections[0]
        for r in sec.footer.paragraphs[0].runs:
            if "Unit 4" in r.text:
                r.text = "  Unit 5: "
            elif r.text.startswith("Reactions"):
                r.text = "Moles and Molar Quantities  •"
        if self.T:
            for r in sec.footer.paragraphs[0].runs:
                if r.text.strip() == "page":
                    r.text = "  TEACHER EDITION  •  page "
        self.doc.core_properties.title = title
        self.doc.save(path)


if __name__ == "__main__":
    print("self-check passed")
    for f in ("Be", "N2", "O2", "F2", "Mg", "Ag", "LiI", "PbCO3", "Mg(OH)2", "K3PO4", "(NH4)3PO4", "C6H12O6", "Al2(SO4)3"):
        print(f, mm(f))
    print("5.1:", sci(a1, 3), sci(a2, 3), sci(a3, 2), sci(a4, 3))
    print("5.3:", sci(c1, 2), sf(c2, 3), sf(c3, 4), sf(c4, 4), sci(c5, 3), sci(c6, 2), sf(c7, 2), sf(c8, 3))
    print("5.4:", sf(v1, 3), sf(v2, 3), sf(v3, 3), sf(v4, 3), sf(v5, 3), sci(v6, 3), sf(v7, 3), sf(v8, 3), sci(v9, 3), sci(v10m, 2), sf(v10g, 2))
    print("5.5:", {f: pct_rows(f) for _, f in PCT})
    print("5.6:", [round(x, 2) for x in e1_r], [round(x, 2) for x in e2_r], round(e3_n, 2), [round(x, 2) for x in e4_r], round(e4_n, 3), round(e4_emp, 2))
    print("5.7:", [[round(v, 4) for v in h] for h in (h1, h2, h3, h4)], round(h5_x, 3))
    print("extra:", sci(x_a, 3), x_b, [round(x, 2) for x in x_c_r], round(x_c_n, 3), sf(x_d, 3), round(x_e_hyd, 2), round(x_e_anh, 2), round(x_e_w, 2), round(x_e_x, 3))
