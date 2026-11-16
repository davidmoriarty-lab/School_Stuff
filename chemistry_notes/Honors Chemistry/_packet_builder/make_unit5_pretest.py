"""Builds the Unit 5 (Moles and Molar Quantities) PRE-TEST: 10 multiple choice questions, one page, plus a teacher key.

Questions are modeled on the Unit 5 sample test (same kinds of questions, different numbers and substances) and are
spread across the unit's seven topics in packet order:
  5.1 the mole (Q1)   5.2 molar mass (Q2)   5.3 mole conversions (Q3, Q4)   5.4 gases at STP (Q5, Q6)
  5.5 percent composition (Q7)   5.6 empirical / molecular formulas (Q8, Q9)   5.7 hydrates (Q10)
Every number is computed from the atomic masses in build_moles.py (N_A = 6.022e23, 22.4 L/mol), and the asserts below
fail if a keyed answer is not the unique best choice.   Run:  python3 make_unit5_pretest.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from docx.enum.section import WD_SECTION
from make_unit5_test import (new_doc, footer, fmt, run, rich, rule, set_cols, shade, OxmlElement, qn, Inches,
                             NA, MASS, mm, mm_exact, sci, sf, V)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "Pre Tests")

# ---------------------------------------------------------------- computed values
n_atoms = 0.200 * NA                                   # Q1 molecules in 0.200 mol H2O
mm_al_no3 = mm("Al(NO3)3")                             # Q2
n_h2o = 45.0 / mm("H2O")                               # Q3
mol_ch4 = 8.00 / mm("CH4")                             # Q4
mol_ch4_n = mol_ch4 * NA
v_n2 = 7.00 / mm("N2") * V                             # Q5
pct_fe = 100 * 2 * MASS["Fe"] / mm_exact("Fe2O3")      # Q7
mol_al, mol_o = 52.9 / MASS["Al"], 47.1 / MASS["O"]    # Q8
ratio_al_o = mol_o / mol_al                            # 1.5 -> scale by 2 -> Al2O3
n_mf = 56.1 / mm("CH2")                                # Q9
wat = 6.50 - 4.94
pct_w = 100 * wat / 6.50                               # Q10

assert round(mm_al_no3, 2) == 213.01 and abs(n_h2o - 2.50) < 0.005 and abs(mol_ch4_n - 3.00e23) < 0.01e23
assert abs(v_n2 - 5.60) < 0.005 and round(pct_fe, 2) == 69.94 and abs(ratio_al_o - 1.5) < 0.01
assert abs(n_mf - 4.0) < 0.01 and abs(pct_w - 24.0) < 1e-9

# ---------------------------------------------------------------- the questions
# (topic, question, correct, [3 wrong], explanation, slot of correct answer 0-3)
MC = [
    ("5.1", "How many molecules are in 0.200 mol of H₂O?",
     sci(n_atoms, 3) + " molecules", [sci(0.200 / NA, 3) + " molecules", sci(3 * n_atoms, 3) + " molecules", "0.200 molecules"],
     "0.200 mol × 6.022 × 10²³ molecules/mol. (Counting atoms instead would triple it: 3 atoms per molecule.)", 1),
    ("5.2", "What is the molar mass of Al(NO₃)₃?",
     "%.2f g/mol" % mm_al_no3,
     ["%.2f g/mol" % (MASS["Al"] + MASS["N"] + 3 * MASS["O"]), "%.2f g/mol" % (MASS["Al"] + 3 * MASS["N"] + 3 * MASS["O"]),
      "%.2f g/mol" % (MASS["Al"] + 3 * MASS["N"] + 6 * MASS["O"])],
     "26.98 + 3(14.01) + 9(16.00): the 3 outside the parentheses multiplies the N and all three O atoms.", 3),
    ("5.3", "How many moles are in 45.0 g of H₂O?",
     sf(n_h2o, 3) + " mol", [sf(45.0 * mm("H2O"), 3) + " mol", sf(45.0 / V, 3) + " mol", sci(45.0 * NA / mm("H2O"), 3) + " mol"],
     "45.0 g ÷ 18.02 g/mol = 2.50 mol", 0),
    ("5.3", "How many molecules are in 8.00 g of CH₄?",
     sci(mol_ch4_n, 3) + " molecules", [sci(8.00 * NA, 3) + " molecules", sci(8.00 * mm("CH4") * NA, 3) + " molecules", sci(8.00 / NA, 3) + " molecules"],
     "Grams → moles → molecules: 8.00 g ÷ 16.05 g/mol = 0.498 mol; 0.498 mol × 6.022 × 10²³ = 3.00 × 10²³.", 2),
    ("5.4", "What volume does 7.00 g of N₂ gas occupy at STP?",
     sf(v_n2, 3) + " L", [sf(7.00 * V, 3) + " L", sf(7.00 / V, 3) + " L", sf(7.00 * mm("N2") / V, 3) + " L"],
     "7.00 g ÷ 28.02 g/mol = 0.250 mol; 0.250 mol × 22.4 L/mol = 5.60 L.", 3),
    ("5.4", "A 5.0 L sample of H₂ gas and a 5.0 L sample of CO₂ gas are both at STP. Which statement is true?",
     "They contain the same number of molecules, but the CO₂ has the greater mass.",
     ["They have the same mass, but the CO₂ contains more molecules.", "The H₂ contains more molecules because H₂ is lighter.",
      "They contain the same number of atoms."],
     "At STP equal volumes hold equal moles (22.4 L/mol). Each CO₂ molecule is heavier (44.01 vs 2.02 g/mol), and CO₂ has 3 atoms per molecule against 2 for H₂.", 1),
    ("5.5", "What is the percent by mass of iron in Fe₂O₃?",
     "%s%%" % sf(pct_fe, 4), ["%s%%" % sf(100 * MASS["Fe"] / mm_exact("Fe2O3"), 4), "%s%%" % sf(100 * 3 * MASS["O"] / mm_exact("Fe2O3"), 4),
                              "%s%%" % sf(100 * 2 * MASS["Fe"] / (2 * MASS["Fe"] + MASS["O"]), 4)],
     "Two Fe atoms: 111.70 g ÷ 159.70 g × 100 = 69.94%.", 0),
    ("5.6", "A compound is 52.9% Al and 47.1% O by mass. What is its empirical formula?",
     "Al₂O₃", ["AlO", "Al₃O₂", "AlO₂"],
     "52.9 g Al = %s mol, 47.1 g O = %s mol; Al : O = 1 : %s, which is 1 : 1.5. Scale up by 2 to get 2 : 3." % (sf(mol_al, 4), sf(mol_o, 4), sf(ratio_al_o, 3)), 2),
    ("5.6", "A compound has the empirical formula CH₂ and a molar mass of 56.1 g/mol. What is its molecular formula?",
     "C₄H₈", ["CH₂", "C₂H₄", "C₃H₆"],
     "Empirical mass = 14.03 g/mol; 56.1 ÷ 14.03 = 4, so multiply every subscript by 4.", 0),
    ("5.7", "A 6.50 g sample of a hydrate is heated until its mass is constant at 4.94 g. What is the percent water in the hydrate?",
     "%s%%" % sf(pct_w, 3), ["%s%%" % sf(100 * wat / 4.94, 3), "%s%%" % sf(100 * 4.94 / 6.50, 3), "1.56%"],
     "Water lost = 6.50 − 4.94 = 1.56 g; 1.56 ÷ 6.50 × 100 = 24.0%. (Divide by the mass of the hydrate, not the mass left.)", 1),
]
assert len(MC) == 10
for t, q, right, wrong, why, pos in MC:
    assert len(wrong) == 3 and right not in wrong and len(set(wrong)) == 3, q
assert [m[0] for m in MC] == ["5.1", "5.2", "5.3", "5.3", "5.4", "5.4", "5.5", "5.6", "5.6", "5.7"]
POS = [m[5] for m in MC]
assert all(POS.count(k) >= 2 for k in range(4)), POS


def choices(item):
    t, q, right, wrong, why, pos = item
    lst = list(wrong)
    lst.insert(pos, right)
    return lst


TOPIC = {"5.1": "The mole", "5.2": "Molar mass", "5.3": "Mole conversions", "5.4": "Gases at STP",
         "5.5": "Percent composition", "5.6": "Empirical and molecular formulas", "5.7": "Hydrates"}


def build_student():
    d = new_doc()
    footer(d, "Honors Chemistry  •  Unit 5 Pre-Test")
    p = fmt(d.add_paragraph(), after=2); run(p, "Moles and Molar Quantities Unit: Pre-Test", 17, bold=True)
    p = fmt(d.add_paragraph(), after=3); run(p, "Name: ______________________________      Pd: ______", 10.5)
    p = fmt(d.add_paragraph(), after=3)
    run(p, "Ten multiple choice questions. You have not been taught this unit yet, so do your best. "
           "Circle one answer for each question. Use a calculator and a periodic table.", 9, color="555555")
    rule(p)
    sec = d.add_section(WD_SECTION.CONTINUOUS)
    set_cols(sec, 2)
    for n, item in enumerate(MC, 1):
        p = fmt(d.add_paragraph(), before=7, after=2, left=0.25, hang=0.25, keep=True)
        run(p, "%d." % n, 10.5, bold=True); run(p, "\t" + item[1], 10.5, bold=True)
        for k, ch in enumerate(choices(item)):
            p = fmt(d.add_paragraph(), before=1, left=0.55, hang=0.25, keep=(k < 3))
            run(p, "%s.\t%s" % ("ABCD"[k], ch), 10.5)
    return d


def build_key():
    d = new_doc()
    footer(d, "Honors Chemistry  •  Unit 5 Pre-Test  •  TEACHER KEY")
    p = fmt(d.add_paragraph(), after=2); run(p, "Moles and Molar Quantities Unit: Pre-Test, TEACHER KEY", 16, bold=True)
    p = fmt(d.add_paragraph(), after=4)
    run(p, "One point each (10 total). Every value is computed in code from atomic masses to 0.01 g/mol, "
           "N", 9, color="555555")
    run(p, "A", 9, color="555555")
    run(p, " = 6.022 × 10²³ and 22.4 L/mol at STP. The Topic column shows which packet topic each question checks.", 9, color="555555")
    rule(p)
    tbl = d.add_table(rows=1, cols=5)
    tbl.style = "Table Grid"
    hdr = tbl.rows[0].cells
    for c, t in zip(hdr, ["#", "Topic", "Ans", "Correct choice", "Why"]):
        c.text = ""
        run(c.paragraphs[0], t, 9, bold=True)
        tcPr = c._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
        sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), "D9D9D9"); tcPr.append(sh)
    for n, item in enumerate(MC, 1):
        row = tbl.add_row().cells
        vals = [str(n), "%s %s" % (item[0], TOPIC[item[0]]), "ABCD"[item[5]], item[2], item[4]]
        for c, t in zip(row, vals):
            c.text = ""
            run(c.paragraphs[0], t, 8.5, bold=(c is row[2]))
    widths = [0.3, 1.1, 0.4, 1.8, 3.7]
    tbl.autofit = False
    for col, w in zip(tbl.columns, widths):
        col.width = Inches(w)
    for r in tbl.rows:
        for c, w in zip(r.cells, widths):
            c.width = Inches(w)
    p = fmt(d.add_paragraph(), before=6, after=0)
    run(p, "Answer pattern: " + " ".join("%d%s" % (i, "ABCD"[m[5]]) for i, m in enumerate(MC, 1)), 9, color="555555")
    return d


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    s = os.path.join(OUT, "Unit 5 - Moles and Molar Quantities - PRE-TEST.docx")
    k = os.path.join(OUT, "Unit 5 - Moles and Molar Quantities - PRE-TEST KEY.docx")
    build_student().save(s)
    build_key().save(k)
    print(s); print(k)
    print("answer pattern:", "".join("ABCD"[m[5]] for m in MC))
