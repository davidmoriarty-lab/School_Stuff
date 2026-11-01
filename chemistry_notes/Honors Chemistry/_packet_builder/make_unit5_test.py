"""Builds the Unit 5 (Moles and Molar Quantities) sample test: a student copy and a teacher key.

Format copied from the Reactions sample test: Name/Pd line, Part I = 20 multiple choice (1 pt each, two columns),
Part II = 4 free-response questions (46 pts), 4 pages at most. Every answer is computed here from the atomic masses in
build_moles.py (N_A = 6.022e23, 22.4 L/mol at STP); the asserts at the bottom fail if a keyed answer is not the unique
best choice. Run:  python3 make_unit5_test.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from build_moles import NA, MASS, mm, mm_exact, sci, sf, pct, parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Sample Tests")
V = 22.4
SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")


def F(s):
    """'H2O' style helper: digits after a letter or ')' become subscripts."""
    out, prev = "", ""
    for ch in s:
        out += ch.translate(SUB) if ch.isdigit() and (prev.isalpha() or prev == ")" or prev in "₀₁₂₃₄₅₆₇₈₉") else ch
        prev = ch
    return out


# ------------------------------------------------------------------ computed values
mm_ca_no3 = mm("Ca(NO3)2")
m_nacl = 2.50 * mm("NaCl")
n_co2 = 88.0 / mm("CO2")
n_gas = 33.6 / V
pct_o_h2o = 100 * MASS["O"] * 1 / mm_exact("H2O")
pct_h_h2o = 100 * 2 * MASS["H"] / mm_exact("H2O")
pct_n = 100 * 2 * MASS["N"] / mm_exact("NH4NO3")
mol_c, mol_h = 75.0 / MASS["C"], 25.0 / MASS["H"]
frac_water = (5.00 - 3.20) / 5.00 * 100
x_ratio = 0.0498 / 0.0100
vols = {n: g / mm(f) * V for n, g, f in [("H2", 10.0, "H2"), ("He", 10.0, "He"), ("N2", 10.0, "N2"), ("CO2", 10.0, "CO2")]}

# FR 1
fr1a = mm("(NH4)2CO3")
fr1b = 0.750 * mm("Mg(OH)2")
fr1c = 25.0 / mm("C6H12O6") * NA
fr1d = 0.400 * 12 * NA
fr1e = 3.011e23 / NA * mm("NH3")
# FR 2
fr2a = 14.2 / mm("Cl2") * V
fr2b = 5.60 / V * mm("NH3")
fr2c = 11.2 / V * NA
# FR 3
tot = mm_exact("Al2(SO4)3")
fr3_al, fr3_s, fr3_o = (100 * MASS["Al"] * 2 / tot, 100 * MASS["S"] * 3 / tot, 100 * MASS["O"] * 12 / tot)
e_c, e_h, e_o = 40.00 / MASS["C"], 6.71 / MASS["H"], 53.29 / MASS["O"]
e_ratio = (e_c / e_o, e_h / e_o, 1.0)
emp_mass = mm("CH2O")
n_mf = 180 / emp_mass
# FR 4
M_CRUC, M_WITH, M_AFTER = 18.42, 20.92, 20.02
hyd = M_WITH - M_CRUC
anh = M_AFTER - M_CRUC
wat = M_WITH - M_AFTER
n_w = wat / mm("H2O")
n_s = anh / mm("CuSO4")
x_val = n_w / n_s
pct_w = 100 * wat / hyd

assert round(mm_ca_no3, 2) == 164.10 and round(fr1a, 2) == 96.11
assert abs(n_co2 - 2.00) < 0.005 and abs(n_gas - 1.50) < 1e-9
assert max(vols, key=vols.get) == "H2"
assert round(x_val) == 5 and abs(x_val - 5) < 0.1 and abs(frac_water - 36.0) < 1e-9
assert abs(fr3_al + fr3_s + fr3_o - 100) < 1e-9
assert round(e_ratio[0], 2) == 1.0 and round(e_ratio[1], 1) == 2.0 and n_mf == 180 / 30.03 and round(n_mf) == 6
assert round(hyd, 2) == 2.50 and round(anh, 2) == 1.60 and round(wat, 2) == 0.90

# ------------------------------------------------------------------ Part I (answer is the choice named by `ans`)
# each item: (question, correct choice, [3 wrong choices], explanation).  pos = slot of the correct choice (A=0 ...)
MC = [
    ("Which statement about one mole is correct?",
     "One mole is 6.022 × 10²³ particles.",
     ["One mole of any element has a mass of 1.00 g.", "One mole of any substance occupies 22.4 L.",
      "One mole of any compound contains 6.022 × 10²³ atoms."],
     "The mole counts particles (atoms, molecules or formula units). A compound's molecules each hold several atoms, and 22.4 L is only for a gas at STP.", 1),
    ("How many zinc atoms are in 0.250 mol of Zn?",
     sci(0.250 * NA, 3) + " atoms", [sci(0.250 / NA, 3) + " atoms", sci(0.250 * 10 * NA, 3) + " atoms", sci(NA, 4) + " atoms"],
     "0.250 mol × 6.022 × 10²³ atoms/mol", 3),
    ("What is the molar mass of Ca(NO₃)₂?",
     "%.2f g/mol" % mm_ca_no3,
     ["%.2f g/mol" % (MASS["Ca"] + MASS["N"] + 3 * MASS["O"]),
      "%.2f g/mol" % (MASS["Ca"] + 2 * MASS["N"] + 3 * MASS["O"]), "%.2f g/mol" % (MASS["Ca"] + 2 * MASS["N"] + 5 * MASS["O"])],
     "40.08 + 2(14.01) + 6(16.00): the 2 outside the parentheses multiplies everything inside.", 0),
    ("How many moles are in 3.011 × 10²³ molecules of CO₂?",
     "0.5000 mol", ["2.000 mol", sci(3.011e23 / mm("CO2"), 3) + " mol", sci(3.011e23 * NA, 3) + " mol"],
     "3.011 × 10²³ ÷ 6.022 × 10²³ = 0.5000 mol", 2),
    ("What is the mass of 2.50 mol of NaCl?",
     "%s g" % sf(m_nacl, 3), ["%s g" % sf(2.50 / mm("NaCl"), 3), "%s g" % sf(2.50 + mm("NaCl"), 3), sci(2.50 * NA, 3) + " g"],
     "2.50 mol × 58.44 g/mol = 146 g", 1),
    ("How many moles are in 88.0 g of CO₂?",
     "2.00 mol", ["%s mol" % sf(88.0 * mm("CO2"), 3), "0.500 mol", "%s mol" % sf(88.0 / V, 3)],
     "88.0 g ÷ 44.01 g/mol = 2.00 mol", 0),
    ("Which sample contains the greatest number of atoms?",
     "1.0 mol of CH₄", ["1.0 mol of He", "1.0 mol of H₂", "1.0 mol of N₂"],
     "Every sample is 1.0 mol of particles, but a CH₄ molecule holds 5 atoms (H₂ and N₂ hold 2, He holds 1).", 3),
    ("A student wants to convert a mass of a compound in grams into a number of molecules. What is the first step?",
     "Divide by the molar mass.", ["Multiply by 6.022 × 10²³.", "Divide by 22.4 L/mol.", "Multiply by the molar mass."],
     "Grams and particles never convert directly: grams → moles (÷ molar mass) → particles (× 6.022 × 10²³).", 1),
    ("What volume does 0.500 mol of N₂ gas occupy at STP?",
     sf(0.500 * V, 3) + " L", [sf(V / 0.500, 3) + " L", sf(0.500 * V * mm("N2") / 1, 3) + " L", sf(0.500 / V, 3) + " L"],
     "0.500 mol × 22.4 L/mol = 11.2 L", 2),
    ("A gas sample occupies 33.6 L at STP. How many moles of gas is this?",
     sf(n_gas, 3) + " mol", [sf(1 / n_gas, 3) + " mol", sf(33.6 * V, 3) + " mol", sf(33.6 + V, 3) + " mol"],
     "33.6 L ÷ 22.4 L/mol = 1.50 mol", 3),
    ("Which 10.0 g gas sample has the greatest volume at STP?",
     "H₂", ["He", "N₂", "CO₂"],
     "Volume follows moles, and the lightest gas has the most moles in 10.0 g: H₂ %s mol, He %s, N₂ %s, CO₂ %s." % (
         sf(10.0 / mm("H2"), 3), sf(10.0 / mm("He"), 3), sf(10.0 / mm("N2"), 3), sf(10.0 / mm("CO2"), 3)), 0),
    ("What is the percent by mass of oxygen in H₂O?",
     "%s%%" % sf(pct_o_h2o, 4), ["%s%%" % sf(pct_h_h2o, 4), "50.00%", "%s%%" % sf(100 * 16.00 / 17.01, 4)],
     "16.00 g ÷ 18.02 g × 100 = 88.79%", 2),
    ("What is the percent by mass of nitrogen in NH₄NO₃?",
     "%s%%" % sf(pct_n, 4), ["%s%%" % sf(pct_n / 2, 3), "%s%%" % sf(100 * 3 * 16.00 / mm("NH4NO3"), 4), "%s%%" % sf(100 * 4 * 1.01 / mm("NH4NO3"), 3)],
     "Two N atoms: 28.02 g ÷ 80.06 g × 100 = 35.00%. The formula has two nitrogens (one in NH₄⁺, one in NO₃⁻).", 0),
    ("What is the empirical formula of C₆H₁₂O₆?",
     "CH₂O", ["C₆H₁₂O₆", "C₂H₄O₂", "CHO"],
     "Divide every subscript by 6 (the largest whole number that divides them all).", 1),
    ("A compound is 75.0% C and 25.0% H by mass. What is its empirical formula?",
     "CH₄", ["CH₃", "C₃H₁₂", "C₂H₆"],
     "75.0 g C = %s mol; 25.0 g H = %s mol; ratio C : H = 1 : %s, which is 1 : 4." % (sf(mol_c, 4), sf(mol_h, 4), sf(mol_h / mol_c, 3)), 2),
    ("A compound has the empirical formula CH₂O and a molar mass of 60.06 g/mol. What is its molecular formula?",
     "C₂H₄O₂", ["CH₂O", "C₃H₆O₃", "C₄H₈O₄"],
     "Empirical mass = 30.03 g/mol; 60.06 ÷ 30.03 = 2, so multiply every subscript by 2.", 3),
    ("What is the correct name for CuSO₄ · 5H₂O?",
     "copper(II) sulfate pentahydrate", ["copper(I) sulfate pentahydrate", "copper(II) sulfate pentoxide", "copper(II) sulfate hydrate five"],
     "Copper(II) because sulfate is 2−; the prefix penta- gives the 5 water molecules.", 0),
    ("A 5.00 g sample of a hydrate is heated until its mass is constant at 3.20 g. What is the percent water in the hydrate?",
     "%s%%" % sf(frac_water, 3), ["64.0%", "%s%%" % sf(1.80 / 3.20 * 100, 3), "1.80%"],
     "Water lost = 5.00 − 3.20 = 1.80 g; 1.80 ÷ 5.00 × 100 = 36.0%.", 1),
    ("A student heats CuSO₄ · xH₂O and finds 0.0100 mol CuSO₄ and 0.0498 mol H₂O. What is x?",
     "5", ["4", "6", "0.0498"],
     "0.0498 mol H₂O ÷ 0.0100 mol CuSO₄ = 4.98, which rounds to 5.", 2),
    ("1.00 mol of He and 1.00 mol of Ne contain the same number of atoms but have different masses. Why?",
     "Each Ne atom has a greater mass than each He atom.", ["A mole of Ne contains more atoms than a mole of He.",
      "The mole is defined by mass, not by number.", "Ne atoms are always larger than He molecules."],
     "A mole is a count (6.022 × 10²³). Ne is 20.18 g/mol and He is 4.00 g/mol because each Ne atom is heavier.", 3),
]

for i, (q, right, wrong, why, pos) in enumerate(MC):
    assert len(wrong) == 3 and right not in wrong
POS = [m[4] for m in MC]
assert sorted(POS.count(k) for k in range(4)) == [5, 5, 5, 5], POS


def choices(item):
    q, right, wrong, why, pos = item
    lst = list(wrong)
    lst.insert(pos, right)
    return lst


# ------------------------------------------------------------------ Part II
FR = [
    ("1) Calculate each quantity. Show your setup with units and give the answer with the correct sig figs. (12 pts)", [
        ("a.", "Find the molar mass of (NH₄)₂CO₃. (2 pts)", 0.55,
         "N: 2 × 14.01 = 28.02;  H: 8 × 1.01 = 8.08;  C: 12.01;  O: 3 × 16.00 = 48.00\nMolar mass = **%.2f g/mol**" % fr1a),
        ("b.", "How many grams are in 0.750 mol of Mg(OH)₂? (2 pts)", 0.75,
         "Mg(OH)₂ = 24.31 + 2(16.00) + 2(1.01) = 58.33 g/mol\n0.750 mol × 58.33 g/mol = **%s g**" % sf(fr1b, 3)),
        ("c.", "How many molecules are in 25.0 g of glucose, C₆H₁₂O₆? (3 pts)", 0.95,
         "C₆H₁₂O₆ = 180.18 g/mol\n25.0 g × (1 mol / 180.18 g) × (6.022 × 10²³ molecules / 1 mol) = **%s molecules**" % sci(fr1c, 3)),
        ("d.", "How many oxygen atoms are in 0.400 mol of Al₂(SO₄)₃? (3 pts)", 0.95,
         "Each formula unit has 12 O atoms (4 × 3).\n0.400 mol Al₂(SO₄)₃ × (12 mol O / 1 mol) × (6.022 × 10²³ atoms / 1 mol) = **%s O atoms**" % sci(fr1d, 3)),
        ("e.", "What is the mass of 3.011 × 10²³ molecules of NH₃? (2 pts)", 0.75,
         "3.011 × 10²³ ÷ 6.022 × 10²³ = 0.5000 mol;  NH₃ = 17.04 g/mol\n0.5000 mol × 17.04 g/mol = **%s g**" % sf(fr1e, 4)),
    ]),
    ("2) Gases at STP. Use 22.4 L/mol where it applies. (10 pts)", [
        ("a.", "What volume does 14.2 g of Cl₂ gas occupy at STP? (3 pts)", 0.8,
         "Cl₂ = 70.90 g/mol\n14.2 g × (1 mol / 70.90 g) × (22.4 L / 1 mol) = **%s L**" % sf(fr2a, 3)),
        ("b.", "What is the mass of 5.60 L of NH₃ gas at STP? (3 pts)", 0.8,
         "5.60 L × (1 mol / 22.4 L) × (17.04 g / 1 mol) = **%s g**" % sf(fr2b, 3)),
        ("c.", "How many molecules are in 11.2 L of N₂ gas at STP? (2 pts)", 0.65,
         "11.2 L × (1 mol / 22.4 L) × (6.022 × 10²³ molecules / 1 mol) = **%s molecules**" % sci(fr2c, 3)),
        ("d.", "A student uses 22.4 L/mol for a gas at 25 °C and 1 atm. Explain why the answer will be wrong. (2 pts)", 0.65,
         "22.4 L/mol is the molar volume only at STP (0 °C and 1 atm). At 25 °C the gas is warmer, so 1 mol takes up more than 22.4 L."),
    ]),
    ("3) Percent composition and formulas. (12 pts)", [
        ("a.", "Find the percent by mass of each element in Al₂(SO₄)₃. (4 pts)", 1.2,
         "Molar mass = 2(26.98) + 3(32.06) + 12(16.00) = %.2f g/mol\nAl: 53.96 ÷ 342.14 × 100 = **%s%%**;  S: 96.18 ÷ 342.14 × 100 = **%s%%**;  O: 192.00 ÷ 342.14 × 100 = **%s%%**\n(check: the percents add to 100%%)"
         % (tot, sf(fr3_al, 4), sf(fr3_s, 4), sf(fr3_o, 4))),
        ("b.", "A compound is 40.00% C, 6.71% H and 53.29% O by mass and has a molar mass of 180 g/mol. Find its empirical formula and its molecular formula. Show your work. (8 pts)", 2.2,
         "Assume 100 g: 40.00 g C, 6.71 g H, 53.29 g O (2 pts)\nMoles: C 40.00 ÷ 12.01 = %s;  H 6.71 ÷ 1.01 = %s;  O 53.29 ÷ 16.00 = %s (2 pts)\nDivide by the smallest (%s): C %s, H %s, O 1.000 → **empirical formula CH₂O** (2 pts)\nEmpirical mass = 12.01 + 2(1.01) + 16.00 = %.2f g/mol; 180 ÷ %.2f = %s, so n = 6 → **molecular formula C₆H₁₂O₆** (2 pts)"
         % (sf(e_c, 4), sf(e_h, 4), sf(e_o, 4), sf(e_o, 4), sf(e_ratio[0], 3), sf(e_ratio[1], 3), emp_mass, emp_mass, sf(n_mf, 3))),
    ]),
    ("4) Hydrates. A student heats a sample of blue copper(II) sulfate hydrate, CuSO₄ · xH₂O, in a crucible until the mass stops changing. (12 pts)", [
        ("", "Data:  mass of empty crucible = 18.42 g;  crucible + hydrate (before heating) = 20.92 g;  crucible + solid (after heating) = 20.02 g", 0.0, None),
        ("a.", "Find the mass of the hydrate, the mass of water lost and the mass of anhydrous CuSO₄. (2 pts)", 0.65,
         "Hydrate: 20.92 − 18.42 = **%.2f g**;  water lost: 20.92 − 20.02 = **%.2f g**;  anhydrous CuSO₄: 20.02 − 18.42 = **%.2f g**" % (hyd, wat, anh)),
        ("b.", "Calculate the moles of water lost and the moles of CuSO₄ left. (3 pts)", 1.0,
         "H₂O: %.2f g ÷ 18.02 g/mol = **%s mol**\nCuSO₄ (159.61 g/mol): %.2f g ÷ 159.61 g/mol = **%s mol**" % (wat, sf(n_w, 3), anh, sf(n_s, 3))),
        ("c.", "Find x. Then write the formula and the name of the hydrate. (3 pts)", 0.95,
         "x = %s ÷ %s = %s, which rounds to 5\n**CuSO₄ · 5H₂O**, named **copper(II) sulfate pentahydrate**" % (sf(n_w, 3), sf(n_s, 3), sf(x_val, 3))),
        ("d.", "Find the percent water by mass in this hydrate. (2 pts)", 0.65,
         "%.2f g ÷ %.2f g × 100 = **%s%%**" % (wat, hyd, sf(pct_w, 3))),
        ("e.", "The student stopped heating early, so some water stayed in the crucible. Will the calculated x be too high or too low? Explain. (2 pts)", 0.85,
         "Too low. The mass of water lost is too small, so moles of water and the ratio to CuSO₄ come out smaller than the true value."),
    ]),
]

# ------------------------------------------------------------------ docx helpers
FONT = "Calibri"


def set_cols(section, n, space=360):
    sp = section._sectPr
    for c in sp.findall(qn("w:cols")):
        sp.remove(c)
    cols = OxmlElement("w:cols")
    cols.set(qn("w:num"), str(n))
    cols.set(qn("w:space"), str(space))
    sp.append(cols)


def run(p, text, size=10, bold=False, italic=False, color=None):
    r = p.add_run(text)
    r.font.name = FONT
    r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    r.font.size = Pt(size)
    r.bold, r.italic = bold, italic
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    return r


def rich(p, text, size=10, color=None, bold_all=False):
    """**bold** segments."""
    parts = text.split("**")
    for i, seg in enumerate(parts):
        if seg:
            run(p, seg, size, bold=(i % 2 == 1) or bold_all, color=color)


def fmt(p, before=0, after=0, left=None, hang=None, keep=False, line=None):
    pf = p.paragraph_format
    pf.space_before, pf.space_after = Pt(before), Pt(after)
    if left is not None:
        pf.left_indent = Inches(left)
    if hang is not None:
        pf.first_line_indent = Inches(-hang)
    if keep:
        pf.keep_with_next = True
    if line:
        pf.line_spacing = line
    return p


def shade(p, fill):
    ppr = p._p.get_or_add_pPr()
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill)
    ppr.append(sh)


def rule(p):
    ppr = p._p.get_or_add_pPr()
    b = OxmlElement("w:pBdr")
    bt = OxmlElement("w:bottom")
    bt.set(qn("w:val"), "single"); bt.set(qn("w:sz"), "8"); bt.set(qn("w:space"), "1"); bt.set(qn("w:color"), "000000")
    b.append(bt); ppr.append(b)


def new_doc():
    d = Document()
    st = d.styles["Normal"]
    st.font.name = FONT
    st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    st.font.size = Pt(10)
    s = d.sections[0]
    s.page_width, s.page_height = Inches(8.5), Inches(11)
    s.left_margin = s.right_margin = Inches(0.6)
    s.top_margin = s.bottom_margin = Inches(0.5)
    return d


def footer(d, text):
    p = d.sections[0].footer.paragraphs[0]
    run(p, text + "  •  page ", 8, color="666666")
    for kind, txt in (("begin", None), (None, "PAGE"), ("end", None)):
        r = p.add_run()
        r.font.size = Pt(8)
        if kind:
            fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), kind); r._r.append(fc)
        else:
            it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = txt; r._r.append(it)


# ------------------------------------------------------------------ student / teacher builders
def build_student():
    d = new_doc()
    footer(d, "Honors Chemistry  •  Unit 5 Sample Test")
    p = fmt(d.add_paragraph(), after=2); run(p, "Moles and Molar Quantities Unit: Sample Test", 17, bold=True)
    p = fmt(d.add_paragraph(), after=3); run(p, "Name: ______________________________      Pd: ______", 10.5)
    p = fmt(d.add_paragraph(), after=3)
    run(p, "Bring your own periodic table and calculator. Show your setup with units for every calculation. "
           "Part I is worth 1 point per question (20 points). Part II is on the following pages (46 points).", 9, color="555555")
    rule(p)
    p = fmt(d.add_paragraph(), before=3, after=3, keep=True); run(p, "Part I: Multiple Choice", 12, bold=True)
    sec = d.add_section(WD_SECTION.CONTINUOUS)
    set_cols(sec, 2)
    for n, item in enumerate(MC, 1):
        p = fmt(d.add_paragraph(), before=4, after=1, left=0.25, hang=0.25, keep=True)
        run(p, "%d." % n, 10, bold=True); run(p, "\t" + item[0], 10, bold=True)
        for k, ch in enumerate(choices(item)):
            p = fmt(d.add_paragraph(), left=0.55, hang=0.25, keep=(k < 3))
            run(p, "%s.\t%s" % ("ABCD"[k], ch), 10)
    sec = d.add_section(WD_SECTION.CONTINUOUS)
    set_cols(sec, 1)
    first = True
    for title, parts in FR:
        p = fmt(d.add_paragraph(), before=(2 if first else 4), after=2, keep=True)
        if title.startswith("4)"):
            p.paragraph_format.page_break_before = True      # the hydrate question stays whole on the last page
        if first:
            run(p, "Part II: Free Response", 12, bold=True)
            p = fmt(d.add_paragraph(), before=2, after=2, keep=True)
            first = False
        run(p, title, 10.5, bold=True)
        for lab, text, h, ans in parts:
            p = fmt(d.add_paragraph(), before=3, after=0, left=0.3, hang=0.3, keep=(h > 0))
            run(p, lab + "\t" + text if lab else text, 10, italic=(lab == ""))
            if h > 0:
                p = fmt(d.add_paragraph(), after=0)
                p.paragraph_format.line_spacing = Pt(h * 72 - 12)
                run(p, " ", 4)
    return d


def build_key():
    d = new_doc()
    footer(d, "Honors Chemistry  •  Unit 5 Sample Test  •  TEACHER KEY")
    p = fmt(d.add_paragraph(), after=2); run(p, "Moles and Molar Quantities Unit: Sample Test, TEACHER KEY", 16, bold=True)
    p = fmt(d.add_paragraph(), after=4)
    run(p, "Every value is computed in code (atomic masses to 0.01 g/mol, N", 9, color="555555")
    run(p, "A", 9, color="555555"); run(p, " = 6.022 × 10²³, 22.4 L/mol at STP) and rounded to the sig figs of the data. "
        "Accept answers within one rounding digit if the work is correct. Points are listed in each part.", 9, color="555555")
    rule(p)
    p = fmt(d.add_paragraph(), before=3, after=3); run(p, "Part I: Multiple Choice (1 point each)", 12, bold=True)
    tbl = d.add_table(rows=1, cols=4)
    tbl.style = "Table Grid"
    hdr = tbl.rows[0].cells
    for c, t in zip(hdr, ["#", "Ans", "Correct choice", "Why"]):
        c.text = ""
        run(c.paragraphs[0], t, 9, bold=True)
    for c in hdr:
        tcPr = c._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
        sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), "D9D9D9"); tcPr.append(sh)
    for n, item in enumerate(MC, 1):
        row = tbl.add_row().cells
        vals = [str(n), "ABCD"[item[4]], item[1], item[3]]
        for c, t in zip(row, vals):
            c.text = ""
            run(c.paragraphs[0], t, 8.5, bold=(c is row[1]))
    tbl.autofit = False
    for col, w in zip(tbl.columns, [0.35, 0.4, 2.1, 4.45]):
        col.width = Inches(w)
    for r in tbl.rows:
        for c, w in zip(r.cells, [0.35, 0.4, 2.1, 4.45]):
            c.width = Inches(w)
    p = fmt(d.add_paragraph(), before=2, after=0)
    run(p, "Answer pattern: " + " ".join("%d%s" % (i, "ABCD"[m[4]]) for i, m in enumerate(MC, 1)), 8.5, color="555555")
    p = fmt(d.add_paragraph(), before=8, after=3, keep=True); run(p, "Part II: Free Response (46 points)", 12, bold=True)
    for title, parts in FR:
        p = fmt(d.add_paragraph(), before=5, after=2, keep=True); run(p, title, 10, bold=True)
        for lab, text, h, ans in parts:
            if ans is None:
                p = fmt(d.add_paragraph(), left=0.3, after=1); run(p, text, 9, italic=True)
                continue
            p = fmt(d.add_paragraph(), before=2, after=0, left=0.3, hang=0.3, keep=True)
            run(p, lab + "\t" + text, 9)
            for line in ans.split("\n"):
                p = fmt(d.add_paragraph(), left=0.3, after=0)
                shade(p, "F2F2F2")
                rich(p, line, 9)
    return d


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    s = os.path.join(OUT, "Unit 5 - Moles and Molar Quantities - SAMPLE TEST.docx")
    k = os.path.join(OUT, "Unit 5 - Moles and Molar Quantities - SAMPLE TEST KEY.docx")
    build_student().save(s)
    build_key().save(k)
    print(s); print(k)
    print("answer pattern:", "".join("ABCD"[m[4]] for m in MC))
